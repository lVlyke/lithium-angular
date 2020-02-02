import { Observable, Subject } from "rxjs";
import { EventMetadata, EventType, AngularMetadata, Metadata, CommonMetadata } from "./metadata";
import { AotAware } from "./aot";
import { ManagedSubject } from "./managed-observable";
import { AngularLifecycleType } from "./lifecycle-event";

export function EventSource(): PropertyDecorator;
export function EventSource(...methodDecorators: MethodDecorator[]): PropertyDecorator;
export function EventSource(options: EventSource.DecoratorOptions, ...methodDecorators: MethodDecorator[]): PropertyDecorator;

/** @PropertyDecoratorFactory */
export function EventSource(...args: any[]): PropertyDecorator {
    let paramsArg: EventSource.DecoratorOptions | MethodDecorator;

    if (args.length > 0) {
        paramsArg = args[0];
    }

    if (!paramsArg || paramsArg instanceof Function) {
        return EventSource.WithParams(undefined, ...args);
    }
    else {
        return EventSource.WithParams(paramsArg, ...args.slice(1));
    }
}

export namespace EventSource {

    export type DecoratorOptions = Partial<EventMetadata.ConfigOptions>;

    /** @PropertyDecoratorFactory */
    export function WithParams(options?: DecoratorOptions, ...methodDecorators: MethodDecorator[]): PropertyDecorator {
        options = options || {};

        /** @PropertyDecorator */
        return function(target: any, propertyKey: string) {
            if (propertyKey !== CommonMetadata.MANAGED_ONDESTROY_KEY && !options.unmanaged) {
                // Ensure that we create a ngOnDestroy EventSource on the target for managing subscriptions
                WithParams({ eventType: AngularLifecycleType.OnDestroy })(target, CommonMetadata.MANAGED_ONDESTROY_KEY);
            }
            
            // If an eventType wasn't specified...
            if (!options.eventType) {
                // Try to deduce the eventType from the propertyKey
                if (propertyKey.endsWith("$")) {
                    options.eventType = propertyKey.substring(0, propertyKey.length - 1);
                }
                else {
                    throw new Error(`@EventSource error: eventType could not be deduced from propertyKey "${propertyKey}" (only keys ending with '$' can be auto-deduced).`);
                }
            }

            // Create the event source metadata for the decorated property
            EventSource.CreateMetadata(options as EventMetadata.SubjectInfo, target, propertyKey);

            // Apply any method decorators to the facade function
            methodDecorators.forEach(methodDecorator => methodDecorator(target, options.eventType, Object.getOwnPropertyDescriptor(target, options.eventType)));

            // Point any Angular metadata attached to the EventSource to the underlying facade method
            if (AngularMetadata.hasPropMetadataEntry(target.constructor, propertyKey)) {
                AngularMetadata.renamePropMetadataEntry(target.constructor, propertyKey, options.eventType);
            }
        };
    }

    export function BootstrapInstance(eventType: EventType) {
        const targetInstance: any = this;
        // Assign the facade function for the given event type to the appropriate target class method
        Object.defineProperty(targetInstance, eventType, {
            enumerable: true,
            value: Facade.Create(eventType)
        });

        function classSubjectTableMerged(merged?: boolean): boolean | undefined {
            if (merged === undefined) {
                return !!Metadata.getMetadata(EventMetadata.SUBJECT_TABLE_MERGED_KEY, targetInstance);
            } else {
                Metadata.setMetadata(EventMetadata.SUBJECT_TABLE_MERGED_KEY, targetInstance, merged);
            }
            return undefined;
        }

        const subjectTable = EventMetadata.GetOwnEventSubjectTable(targetInstance);

        if (!classSubjectTableMerged()) {
            // Copy all event metadata from the class constructor to the target instance
            EventMetadata.CopySubjectTable(subjectTable, EventMetadata.CopyInherittedSubjectTable(targetInstance.constructor), true);
            classSubjectTableMerged(true);
        }

        const propertySubjectMap = subjectTable.get(eventType);

        // Iterate over each of the target properties for each proxied event type used in this class
        propertySubjectMap.forEach((subjectInfo, propertyKey) => {
            // If the event proxy subject hasn't been created for this property yet...
            if (!subjectInfo.subject) {
                // Create a new Subject
                if (subjectInfo.unmanaged || propertyKey === CommonMetadata.MANAGED_ONDESTROY_KEY) {
                    subjectInfo.subject = new Subject<any>();
                } else {
                    subjectInfo.subject = new ManagedSubject<any>(targetInstance);
                }
            }

            // Set the property key to a function that will invoke the facade method when called
            // (This is needed to allow EventSources with attached Angular metadata decorators to work with AoT)
            // Compose the function with the observable
            let propertyValue: Observable<any> & Function = Object.setPrototypeOf(Facade.Create(eventType), subjectInfo.subject);

            Object.defineProperty(targetInstance, propertyKey, {
                get: () => propertyValue
            });
        });

        EventMetadata.GetInstanceBootstrapMap(targetInstance).set(eventType, true);
    }

    export namespace Facade {

        /** @description
         *  Creates an event facade function (the function that is invoked during an event) for the given event type.
         */
        export function Create(eventType: EventType): Function & { eventType: EventType } {
            return Object.assign(function (...values: any[]) {
                // Get the list of subjects to notify for this `eventType`
                const subjectInfoList = Array.from(EventMetadata.GetPropertySubjectMap(eventType, this).values());
                // Use the first value from this event if only a single value was given, otherwise emit all given values as an array to the Subject
                const valueToEmit = (values.length > 1) ? values : (values.length > 0) ? values[0] : undefined;

                // Iterate in reverse order for ngOnDestroy eventTypes.
                // This ensures that all user-defined OnDestroy EventSources are fired before final cleanup of subscriptions.
                if (eventType === "ngOnDestroy") {
                    subjectInfoList.reverse();
                }
                
                // Emit the given event value to each interested subject
                subjectInfoList.forEach(subjectInfo => subjectInfo.subject.next(valueToEmit));
            }, { eventType });
        }
    }

    export function CreateMetadata(options: EventMetadata.SubjectInfo, target: any, propertyKey: string) {
        const ContainsCustomMethod = ($class = target): boolean => {
            const methodDescriptor = Object.getOwnPropertyDescriptor($class, options.eventType);
            const method = methodDescriptor ? (methodDescriptor.value || methodDescriptor.get) : undefined; 
            const isCustomMethod = method && method.eventType !== options.eventType;
            const isExcludedClass = $class.name === AotAware.name;
            return (isCustomMethod && !isExcludedClass) || (!method && target.prototype && ContainsCustomMethod(target.prototype));
        };

        if (!options.skipMethodCheck && ContainsCustomMethod()) {
            // Make sure the target class doesn't have a custom method already defined for this event type
            throw new Error(`@EventSource metadata creation failed. Class already has a custom ${options.eventType} method.`);
        }

        // Add the EventSource options to the class' metadata
        EventMetadata.GetOwnPropertySubjectMap(options.eventType, target.constructor).set(propertyKey, options);

        // Initialize the target property to a self-bootstrapper that will initialize the instance's EventSource when called
        Object.defineProperty(target, propertyKey, {
            configurable: true,
            get: function () {
                // Ensure we only bootstrap once for this `eventType` if the intializer is re-invoked
                if (!isBootstrapped.call(this, options.eventType)) {
                    BootstrapInstance.bind(this)(options.eventType);
                }

                return this[propertyKey];
            }
        });

        // Initialize the facade function to a self-bootstrapper that will initialize the instance's EventSource when called
        Object.defineProperty(target, options.eventType, {
            configurable: true,
            writable: true,
            value: Object.assign(function (...args: any[]) {
                // Ensure we only bootstrap once for this `eventType` if the intializer is re-invoked
                if (!isBootstrapped.call(this, options.eventType)) {
                    BootstrapInstance.bind(this)(options.eventType);
                }

                // Invoke the facade function for the event
                return this[options.eventType].call(this, ...args);
            }, { eventType: options.eventType })
        });
    }

    function isBootstrapped(eventType: EventType): boolean {
        const map = EventMetadata.GetInstanceBootstrapMap(this);
        return map.has(eventType) ? map.get(eventType) : false;
    }
}