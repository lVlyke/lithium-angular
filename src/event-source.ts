import { Subject } from "rxjs";
import { EventMetadata, EventType } from "./event-metadata";

export type EventSourceDecorator = PropertyDecorator & { eventType: EventType };

/** @PropertyDecoratorFactory */
export function EventSource(eventType?: EventType): EventSourceDecorator {
    /** @PropertyDecorator */
    return Object.assign(function (target: any, propertyKey: string) {
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
    }, { eventType });
}

export namespace EventSource {

    export function Bootstrap(targetInstance: any) {
        // Copy all event metadata from the constructor to the target instance
        let metadataMap = EventMetadata.CopyMetadata(EventMetadata.GetMetadataMap(targetInstance), EventMetadata.CopyInherittedMetadata(targetInstance.constructor), true);
    
        // Iterate over each of the target properties for each proxied event type used in this class
        metadataMap.forEach((propertySubjectMap, eventType) => propertySubjectMap.forEach((subjectInfo, propertyKey) => {
            // If the event proxy subject hasn't been created for this property yet...
            if (!subjectInfo.subject) {
                // Create a new Subject
                subjectInfo.subject = new Subject<any>();
            }
    
            // Make the observable accessible to the target instance
            targetInstance[propertyKey] = subjectInfo.subject.asObservable();
        }));
    }

    export namespace Facade {

        /** @description
         *  Creates an event facade function (the function that is invoked during an event) for the given event type.
         */
        export function Create(type: EventType): Function {
            return function (value: any) {
                // Iterate over all class properties that have a proxy subject for this event type and notify each subscriber
                EventMetadata.GetPropertySubjectMap(type, this).forEach(subjectInfo => subjectInfo.subject.next(value));
            };
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