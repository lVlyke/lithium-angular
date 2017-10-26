import { Subject } from "rxjs";
import { EventMetadata } from "./event-metadata";

/** @ClassDecorator
 *  @description Creates event proxy Subjects for all event proxy properties in the class.
 */
export function EventSourceBootstrap(constructor: any) {

    function mergeInherittedMetadata(constructor: any): EventMetadata.MetadataMap {
        let metadataMap: EventMetadata.MetadataMap = EventMetadata.GetMetadataMap(constructor);
        let prototype = Object.getPrototypeOf(constructor);

        // If this class extends from another class...
        if (prototype) {
            // Merge own and inheritted metadata into a single map
            let inherittedMetadataMap: EventMetadata.MetadataMap = mergeInherittedMetadata(prototype);

            // If there is inheritted class metadata...
            if (metadataMap !== inherittedMetadataMap && inherittedMetadataMap.size > 0) {
                // Iterate over all inherited metadata properties...
                inherittedMetadataMap.forEach((propertySubjectMap, eventType) => propertySubjectMap.forEach((value, propertyKey) => {
                    let ownPropertySubjectMap = EventMetadata.GetPropertySubjectMap(eventType, constructor);

                    // And add them to this class' metadata map if not already defined
                    if (!ownPropertySubjectMap.has(propertyKey)) {
                        ownPropertySubjectMap.set(propertyKey, Object.assign({}, value));
                    }
                }));
            }
        }

        return metadataMap;
    }

    // Merge own and inheritted metadata into a single map
    let metadataMap = mergeInherittedMetadata(constructor);

    // Iterate over each of the target properties for each proxied event type used in this class
    metadataMap.forEach((propertySubjectMap, eventType) => propertySubjectMap.forEach((subjectInfo, propertyKey) => {
        // If the event proxy subject hasn't been created for this property yet...
        if (!subjectInfo.subject) {
            // Create a new Subject
            subjectInfo.subject = new Subject<any>();

            // Define the observable
            if (subjectInfo.observable) {
                // If an existing observable is already defined, chain the subject after the observable
                subjectInfo.observable = subjectInfo.observable.flatMap(() => subjectInfo.subject);
            }
            else {
                // Set the observable to the subject
                subjectInfo.observable = subjectInfo.subject.asObservable();
            }
        }

        // Make the observable accessible on the class' prototype
        constructor.prototype[propertyKey] = subjectInfo.observable;
    }));
}