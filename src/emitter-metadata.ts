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
}