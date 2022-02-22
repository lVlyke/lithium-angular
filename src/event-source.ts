
import { Type } from "@angular/core";
import { Observable, Subject } from "rxjs";
import { EventMetadata, EventType, Metadata, CommonMetadata } from "./metadata";
import { ManagedSubject } from "./managed-observable";
import { AngularLifecycleType } from "./lifecycle-event";

export function EventSource(): PropertyDecorator;
export function EventSource(...methodDecorators: MethodDecorator[]): PropertyDecorator;
export function EventSource(options: EventSource.DecoratorOptions, ...methodDecorators: MethodDecorator[]): PropertyDecorator;

/** @PropertyDecoratorFactory */
export function EventSource(...args: any[]): PropertyDecorator {
    let paramsArg: EventSource.DecoratorOptions | MethodDecorator | undefined;

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
        options ??= {};

        /** @PropertyDecorator */
        return function(target: any, propertyKey: string | symbol) {
            if (propertyKey !== CommonMetadata.MANAGED_ONDESTROY_KEY && !options!.unmanaged) {
                // Ensure that we create a ngOnDestroy EventSource on the target for managing subscriptions
                WithParams({ eventType: AngularLifecycleType.OnDestroy })(target, CommonMetadata.MANAGED_ONDESTROY_KEY);
            }
            
            // If an eventType wasn't specified...
            if (!options!.eventType) {
                // Try to deduce the eventType from the propertyKey
                if (typeof propertyKey === "string" && propertyKey.endsWith("$")) {
                    options!.eventType = propertyKey.substring(0, propertyKey.length - 1);
                }
                else {
                    throw new Error(`@EventSource error: eventType could not be deduced from propertyKey "${propertyKey as any}" (only keys ending with '$' can be auto-deduced).`);
                }
            }

            // Create the event source metadata for the decorated property
            createMetadata(options as EventMetadata.SubjectInfo, target, propertyKey);

            // Apply any method decorators to the facade function
            methodDecorators.forEach(methodDecorator => methodDecorator(target, options!.eventType!, Object.getOwnPropertyDescriptor(target, options!.eventType!)!));
        };
    }

    function bootstrapInstance(this: any, eventType: EventType, isLifecycleEvent?: boolean) {
        const targetInstance: any = this;
        
        if (!isLifecycleEvent) {
            // Assign the facade function for the given event type to the target instance
            Facade.CreateAndAssign(eventType, targetInstance);
        }

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
        propertySubjectMap?.forEach((subjectInfo, propertyKey) => {
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
            // (This is needed to allow EventSources to work with Angular event decorators like @HostListener)
            // Compose the function with the observable
            // TODO - Figure out a better way to do this with Ivy
            let propertyValue: Observable<any> & Function = Object.setPrototypeOf(Facade.Create(eventType), subjectInfo.subject);

            Object.defineProperty(targetInstance, propertyKey, {
                get: () => propertyValue
            });
        });

        EventMetadata.GetInstanceBootstrapMap(targetInstance).set(eventType, true);
    }

    namespace Facade {

        /** @description
         *  Creates an event facade function (the function that is invoked during an event) for the given event type.
         */
        export function Create(eventType: EventType): ((...value: any[]) => void) & { eventType: EventType } {
            return Object.assign(function (this: any, ...values: any[]) {
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
                subjectInfoList
                    .filter(subjectInfo => !!subjectInfo.subject)
                    .forEach(subjectInfo => subjectInfo.subject.next(valueToEmit));
            }, { eventType });
        }

        export function CreateAndAssign(eventType: EventType, instance: any): void {
            // Assign the facade function for the given event type to the appropriate target class method
            // This function gets called from the view template and triggers the associated Subject
            Object.defineProperty(instance, eventType, {
                enumerable: true,
                value: Create(eventType)
            });
        }
    }

    function createMetadata(options: EventMetadata.SubjectInfo, target: any, propertyKey: string | symbol) {
        const ContainsCustomMethod = ($class = target): boolean => {
            const methodDescriptor = Object.getOwnPropertyDescriptor($class, options.eventType);
            const method = methodDescriptor ? (methodDescriptor.value || methodDescriptor.get) : undefined; 
            const isCustomMethod = method && method.eventType !== options.eventType;
            return isCustomMethod || (!method && target.prototype && ContainsCustomMethod(target.prototype));
        };

        // Determine if this EventSource is handling an Angular lifecycle event
        const isLifecycleEvent = AngularLifecycleType.values.includes(options.eventType as AngularLifecycleType);

        if (!options.skipMethodCheck && ContainsCustomMethod()) {
            // Make sure the target class doesn't have a custom method already defined for this event type
            throw new Error(`@EventSource metadata creation failed. Class already has a custom ${options.eventType} method.`);
        }

        // Add ths EventSource definition to the class' metadata
        EventMetadata.GetOwnPropertySubjectMap(options.eventType, target.constructor).set(propertyKey, options);

        if (isLifecycleEvent) {
            registerLifecycleEventFacade(target.constructor, options.eventType);
        }

        // Initialize the propertyKey on the target to a self-bootstrapper that will initialize an instance's EventSource when called
        Object.defineProperty(target, propertyKey, {
            configurable: true,
            get: function () {
                // Ensure we only bootstrap once for this `eventType` if the intializer is re-invoked (Ivy)
                if (!isBootstrapped.call(this, options.eventType)) {
                    // Boostrap the event source for this instance
                    bootstrapInstance.bind(this)(options.eventType, isLifecycleEvent);
                }
                
                // Return the Observable for the event
                return this[propertyKey];
            }
        });

        // Only initialize a bootstrapper function for the eventType if this isn't a lifecycle event (otherwise Ivy will handle it)
        if (!isLifecycleEvent) {
            // Set the eventType on the target to a self-bootstrapper function that will initialize an instance's EventSource when called
            Object.defineProperty(target, options.eventType, {
                configurable: true,
                writable: true,
                value: Object.assign(function (this: any, ...args: any[]) {
                    // Ensure we only bootstrap once for this `eventType` if the intializer is re-invoked (Ivy)
                    if (!isBootstrapped.call(this, options.eventType)) {
                        // Boostrap the event source for this instance
                        bootstrapInstance.bind(this)(options.eventType);
                    }

                    // Invoke the facade function for the event
                    return this[options.eventType].call(this, ...args);
                }, { eventType: options.eventType })
            });
        }
    }

    function registerLifecycleEventFacade(targetClass: Type<any>, eventType: EventType) {
        const registrationMap = EventMetadata.GetLifecycleRegistrationMap(targetClass);
        
        // Register the facade function for this component lifecycle target if we haven't already
        if (!registrationMap.get(eventType)) {
            const ownRegistrationMap = EventMetadata.GetOwnLifecycleRegistrationMap(targetClass);

            registerLifecycleEvent(targetClass, eventType, Facade.Create(eventType));
            ownRegistrationMap.set(eventType, true);
        }
    }

    /**
     * @description Registers a lifecycle event handler for use with `registerPreOrderHooks`/`registerPostOrderHooks`
     */
    export function registerLifecycleEvent(targetClass: Type<any>, eventType: EventType, hookFn: (...args: any[]) => void) {
        EventMetadata.AddLifecycleCallback(targetClass, eventType, hookFn);

        // Ensure a valid prototype exists for this component
        if (!targetClass.prototype) {
            targetClass.prototype = Object.create({});
        }

        // Get the name of the hook for this lifecycle event
        const hookName = eventType as AngularLifecycleType;
        // Store a reference to the original hook function
        const prevLifecycleHook = targetClass.prototype[hookName];

        // Replace the default lifecycle hook with a modified one that ensures the given hook fns are invoked
        if (!prevLifecycleHook?.eventType) {
            targetClass.prototype[hookName] = Object.assign(function (this: any, ...args: any[]) {
                // Call the previous hook function on the component instance if there is one
                if (prevLifecycleHook) {
                    prevLifecycleHook.call(this, ...args);
                }

                // Invoke all of the hook functions associated with this lifeycle event for the current component instance
                const hookFns = EventMetadata.GetLifecycleCallbackList(this.constructor, eventType);
                hookFns.forEach(hookFn => hookFn.call(this, ...args));
            }, { eventType });
        }
    }

    export function unregisterLifecycleEvent(targetClass: Type<any>, eventType: EventType, hookFn: (...args: any[]) => void) {
        EventMetadata.RemoveLifecycleCallback(targetClass, eventType, hookFn);
    }

    function isBootstrapped(this: any, eventType: EventType): boolean {
        const map = EventMetadata.GetInstanceBootstrapMap(this);
        return map.has(eventType) ? map.get(eventType)! : false;
    }
}