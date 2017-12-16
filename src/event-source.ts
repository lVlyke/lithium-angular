import { Subject } from "rxjs";
import { EventMetadata, EventType } from "./event-metadata";
import { AngularMetadata } from "./angular-metadata";

export function EventSource(): PropertyDecorator;
export function EventSource(...methodDecorators: MethodDecorator[]): PropertyDecorator;
export function EventSource(eventType?: EventType, ...methodDecorators: MethodDecorator[]): PropertyDecorator;

/** @PropertyDecoratorFactory */
export function EventSource(...args: any[]): PropertyDecorator {
    let paramsArg: EventType | MethodDecorator;

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

    /** @PropertyDecoratorFactory */
    export function WithParams(eventType?: EventType, ...methodDecorators: MethodDecorator[]): PropertyDecorator {

        /** @PropertyDecorator */
        return function(target: any, propertyKey: string) {
            // If an eventType wasn't specified...
            if (!eventType) {
                // Try to deduce the eventType from the propertyKey
                if (propertyKey.endsWith("$")) {
                    eventType = propertyKey.substring(0, propertyKey.length - 1);
                }
                else {
                    throw new Error(`@EventSource error: eventType could not be deduced from propertyKey "${propertyKey}" (only keys ending with '$' can be auto-deduced).`);
                }
            }

            // Create the event source metadata for the decorated property
            EventSource.CreateMetadata(eventType, target, propertyKey);

            // Apply any method decorators to the facade function
            methodDecorators.forEach(methodDecorator => methodDecorator(target, eventType, Object.getOwnPropertyDescriptor(target, eventType)));

            // Point any Angular metadata attached to the EventSource to the underlying facade method
            if (AngularMetadata.hasPropMetadataEntry(target.constructor, propertyKey)) {
                AngularMetadata.renamePropMetadataEntry(target.constructor, propertyKey, eventType);
            }
        };
    }

    export function Bootstrap(targetInstance: any) {
        // Copy all event metadata from the constructor to the target instance
        let metadataMap = EventMetadata.CopyMetadata(EventMetadata.GetOwnMetadataMap(targetInstance), EventMetadata.CopyInherittedMetadata(targetInstance.constructor), true);
    
        // Iterate over each of the target properties for each proxied event type used in this class
        metadataMap.forEach((propertySubjectMap, eventType) => propertySubjectMap.forEach((subjectInfo, propertyKey) => {
            // If the event proxy subject hasn't been created for this property yet...
            if (!subjectInfo.subject) {
                // Create a new Subject
                subjectInfo.subject = new Subject<any>();
            }
    
            // Set the property key to a function that will invoke the facade method when called
            // (This is needed to allow EventSources with attached Angular metadata decorators to work with AoT)
            targetInstance[propertyKey] = targetInstance[eventType];
            
            // Compose the function with the observable
            Object.setPrototypeOf(targetInstance[propertyKey], subjectInfo.subject.asObservable());
        }));
    }

    export namespace Facade {

        /** @description
         *  Creates an event facade function (the function that is invoked during an event) for the given event type.
         */
        export function Create(eventType: EventType): Function & { eventType: EventType } {
            return Object.assign(function (value: any) {
                // Iterate over all class properties that have a proxy subject for this event type and notify each subscriber
                EventMetadata.GetPropertySubjectMap(eventType, this).forEach(subjectInfo => subjectInfo.subject.next(value));
            }, { eventType });
        }
    }

    export function CreateMetadata(type: EventType, target: any, propertyKey: string): EventMetadata.SubjectInfo {
        if (target[type] && target[type].eventType !== type) {
            // Make sure the target class doesn't have a custom method already defined for this event type
            throw new Error(`@EventSource metadata creation failed. Class already has a custom ${type} method.`);
        }
        else if (!target[type]) {
            // Assign the facade function for the given event type to the appropriate target class method
            target[type] = Facade.Create(type);
        }

        // Create initial metadata
        let metadata: EventMetadata.SubjectInfo = { subject: undefined };

        // Add the propertyKey to the class' metadata
        EventMetadata.GetOwnPropertySubjectMap(type, target.constructor).set(propertyKey, metadata);
        return metadata;
    }
}