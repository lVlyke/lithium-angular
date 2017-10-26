import { BehaviorSubject } from "rxjs";
import { EmitterMetadata } from "./emitter-metadata";

/** @ClassDecorator
 *  @description Creates state emitter proxy subjects for all state emitter properties in the class.
 */
export function StateEmitterBootstrap(constructor: any) {

    function mergeInherittedMetadata(constructor: any): EmitterMetadata.MetadataMap {
        let metadataMap: EmitterMetadata.MetadataMap = EmitterMetadata.GetMetadataMap(constructor);
        let prototype = Object.getPrototypeOf(constructor);

        // If this class extends from another class...
        if (prototype) {
            // Merge own and inheritted metadata into a single map
            let inherittedMetadataMap: EmitterMetadata.MetadataMap = mergeInherittedMetadata(prototype);

            // If there is inheritted class metadata...
            if (metadataMap !== inherittedMetadataMap && inherittedMetadataMap.size > 0) {
                // Iterate over all inherited metadata properties...
                inherittedMetadataMap.forEach((subjectInfo, emitterType) => {
                    let ownMetadataMap = EmitterMetadata.GetMetadataMap(constructor);

                    // And add them to this class' metadata map if not already defined
                    if (!ownMetadataMap.has(emitterType)) {
                        ownMetadataMap.set(emitterType, Object.assign({}, subjectInfo));
                    }
                });
            }
        }

        return metadataMap;
    }

    // Merge own and inheritted metadata into a single map
    let metadataMap = mergeInherittedMetadata(constructor);

    // Iterate over each of the target properties for each emitter type used in this class
    metadataMap.forEach((subjectInfo, emitterType) => {
        // If the subject hasn't been created for this property yet...
        if (!subjectInfo.subject) {
            // Create a new BehaviorSubject with the default value
            subjectInfo.subject = new BehaviorSubject<any>(subjectInfo.defaultValue);
        }

        // Make the subject accessible on the class' prototype
        constructor.prototype[subjectInfo.propertyKey] = subjectInfo.subject;
    });
}