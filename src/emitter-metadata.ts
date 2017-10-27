import { Subject, Observable } from "rxjs";
import { Metadata } from "./metadata";

export type EmitterType = string;

export namespace EmitterMetadata {

    export interface SubjectInfo {
        propertyKey: string;
        subject: Subject<any>;
        defaultValue?: any;
    }

    export type MetadataMap = Map<EmitterType, SubjectInfo>;

    export const EmitterMapSymbol = Symbol("EmitterMapSymbol");

    /** @description Gets the metadata map object for the given target class (or its inheritted classes). */
    export function GetMetadataMap(target: Object): MetadataMap {
        return Metadata.GetMetadata<MetadataMap>(EmitterMapSymbol, target, new Map());
    }

    /** @description Gets the metadata map object for the given target class. */
    export function GetOwnMetadataMap(target: Object): MetadataMap {
        return Metadata.GetOwnMetadata<MetadataMap>(EmitterMapSymbol, target, new Map());
    }

    export function HasOwnMetadataMap(target: Object): boolean {
        return Reflect.hasOwnMetadata(EmitterMapSymbol, target);
    }

    export function SetMetadataMap(target: Object, map: MetadataMap) {
        Metadata.SetMetadata<MetadataMap>(EmitterMapSymbol, target, map);
    }

    /** @description Copy all metadata from the source map to the target map.
     *  Note: This mutates the target map.
     **/
    export function CopyMetadata(target: MetadataMap, source: MetadataMap, overwrite?: boolean): MetadataMap {
        // Iterate over all source metadata properties...
        source.forEach((subjectInfo, eventType) => {
            // And add them to this class' metadata map if not already defined
            if (overwrite || !target.has(eventType)) {
                target.set(eventType, Object.assign({}, subjectInfo));
            }
        });

        return target;
    }

    /** @description Merge own and inheritted metadata into a single map.
     *  Note: This mutates the object's metadata.
     **/
    export function CopyInherittedMetadata(object: any): MetadataMap {
        if (object) {
            let metadataMap: MetadataMap = GetMetadataMap(object);
            let inherittedMap: MetadataMap = CopyInherittedMetadata(Object.getPrototypeOf(object));

            return CopyMetadata(metadataMap, inherittedMap);
        }

        return new Map();
    }
}