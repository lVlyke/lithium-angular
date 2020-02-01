import { Subject, Observable } from "rxjs";
import { Metadata } from "./metadata";

export type EmitterType = string;

export namespace EmitterMetadata {

    export const BOOTSTRAPPED_KEY = "$$STATEEMITTER_BOOTSTRAPPED";

    export type ProxyMode = keyof {
        None: any,
        From: any,
        Alias: any,
        Merge: any
    };

    export namespace ProxyMode {

        export const None: ProxyMode = "None";
        export const From: ProxyMode = "From";
        export const Alias: ProxyMode = "Alias";
        export const Merge: ProxyMode = "Merge";
    }

    export interface SubjectInfo extends SubjectInfo.CoreDetails {
        propertyKey: string;
        observable: Subject<any> | Observable<any>;
    }

    export namespace SubjectInfo {

        export interface CoreDetails {
            initialValue?: any;
            readOnly?: boolean;
            writeOnly?: boolean;
            proxyMode?: ProxyMode;
            proxyPath?: string;
            proxyMergeUpdates?: boolean;
            unmanaged?: boolean;
        }

        export interface WithDynamicAlias extends SubjectInfo {
            observable: Observable<any>;
        }

        export interface WithStaticAlias extends SubjectInfo {
            observable: Subject<any>;
        }

        export function IsDynamicAlias(subjectInfo: SubjectInfo): subjectInfo is SubjectInfo.WithDynamicAlias {
            return !IsStaticAlias(subjectInfo);
        }

        export function IsStaticAlias(subjectInfo: SubjectInfo): subjectInfo is SubjectInfo.WithStaticAlias {
            return (subjectInfo.observable instanceof Subject);
        }

        export function IsSelfProxy(subjectInfo: SubjectInfo): boolean {
            return subjectInfo.proxyPath === subjectInfo.propertyKey;
        }
    }

    export type MetadataMap = Map<EmitterType, SubjectInfo>;

    export const EmitterMapSymbol = Symbol("EmitterMapSymbol");

    /** @description Gets the metadata map object for the given target class (or its inheritted classes). */
    export function GetMetadataMap(target: Object): MetadataMap {
        return Metadata.requireMetadata<MetadataMap>(EmitterMapSymbol, target, new Map());
    }

    /** @description Gets the metadata map object for the given target class. */
    export function GetOwnMetadataMap(target: Object): MetadataMap {
        return Metadata.requireOwnMetadata<MetadataMap>(EmitterMapSymbol, target, new Map());
    }

    export function HasOwnMetadataMap(target: Object): boolean {
        return Metadata.hasOwnMetadata(EmitterMapSymbol, target);
    }

    export function SetMetadataMap(target: Object, map: MetadataMap) {
        Metadata.setMetadata(EmitterMapSymbol, target, map);
    }

    /** @description Copy all metadata from the source map to the target map.
     * 
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
     * 
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