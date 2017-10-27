import { Subject, Observable } from "rxjs";
import { Metadata } from "./metadata";

export type EventType = string;

export namespace EventMetadata {

    export interface SubjectInfo {
        subject: Subject<any>;
    }

    export type PropertySubjectMap = Map<string, SubjectInfo>;
    export type MetadataMap = Map<EventType, PropertySubjectMap>;

    export const EventMapSymbol = Symbol("EventMapSymbol");

    /** @description Gets the metadata map object for the given target class (or its inheritted classes). */
    export function GetMetadataMap(target: Object): MetadataMap {
        return Metadata.GetMetadata<MetadataMap>(EventMapSymbol, target, new Map());
    }

    /** @description Gets the metadata map object for the given target class. */
    export function GetOwnMetadataMap(target: Object): MetadataMap {
        return Metadata.GetOwnMetadata<MetadataMap>(EventMapSymbol, target, new Map());
    }

    /** @description
     *  Gets the property subject map for the given event type from the metadata map for the given target class (or its inheritted classes).
     */
    export function GetPropertySubjectMap(type: EventType, target: Object): PropertySubjectMap {
        let map = GetMetadataMap(target);
        let subjectMap = map.get(type);

        if (!subjectMap) {
            subjectMap = new Map();
            map.set(type, subjectMap);
        }

        return subjectMap;
    }

    /** @description
     *  Gets the property subject map for the given event type from the metadata map for the given target class.
     */
    export function GetOwnPropertySubjectMap(type: EventType, target: Object): PropertySubjectMap {
        let map = GetOwnMetadataMap(target);
        let subjectMap = map.get(type);

        if (!subjectMap) {
            subjectMap = new Map();
            map.set(type, subjectMap);
        }

        return subjectMap;
    }

    export function HasOwnMetadataMap(target: Object): boolean {
        return Reflect.hasOwnMetadata(EventMapSymbol, target);
    }

    export function SetMetadataMap(target: Object, map: MetadataMap) {
        Metadata.SetMetadata<MetadataMap>(EventMapSymbol, target, map);
    }

    /** @description Copy all metadata from the source map to the target map.
     *  Note: This mutates the target map.
     **/
    export function CopyMetadata(target: MetadataMap, source: MetadataMap, overwrite?: boolean): MetadataMap {
        // Iterate over all source metadata properties...
        source.forEach((propertySubjectMap, eventType) => propertySubjectMap.forEach((value, propertyKey) => {
            let targetPropertySubjectMap: PropertySubjectMap;

            // Get the property subject map (or create it if it doesn't exist for this eventType)
            if (target.has(eventType)) {
                targetPropertySubjectMap = target.get(eventType);
            }
            else {
                targetPropertySubjectMap = new Map();
                target.set(eventType, targetPropertySubjectMap);
            }

            // And add them to this class' metadata map if not already defined
            if (overwrite || !targetPropertySubjectMap.has(propertyKey)) {
                targetPropertySubjectMap.set(propertyKey, Object.assign({}, value));
            }
        }));

        return target;
    }

    /** @description Merge own and inheritted metadata into a single map.
     *  Note: This mutates the object's metadata.
     **/
    export function CopyInherittedMetadata(object: any): MetadataMap {
        if (object) {
            let metadataMap: MetadataMap = GetMetadataMap(object);
            let inherittedMap: MetadataMap = CopyInherittedMetadata(Object.getPrototypeOf(object));

            // Merge own and inheritted metadata into a single map (note: this mutates object's metadata)
            return CopyMetadata(metadataMap, inherittedMap);
        }

        return new Map();
    }
}