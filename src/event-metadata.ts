import { Subject, Observable } from "rxjs";
import { Metadata } from "./metadata";

export type EventType = string;

export namespace EventMetadata {

    export interface SubjectInfo {
        subject: Subject<any>;
        observable: Observable<any>;
    }

    export namespace SubjectInfo {

        /** @description Appends a new observable to the end of the given SubjectInfo's observable chain.
         *               Note: This changes the SubjectInfo's observable reference.
        */
        export function AppendObservable(subjectInfo: SubjectInfo, observable: Observable<any>): SubjectInfo {
            if (subjectInfo.observable) {
                subjectInfo.observable = subjectInfo.observable.flatMap(() => observable);
            }
            else {
                subjectInfo.observable = observable;
            }

            return subjectInfo;
        }

        /** @description Appends a new observable to the beginning of the given SubjectInfo's observable chain.
         *               Note: This changes the SubjectInfo's observable reference.
        */
        export function PrependObservable(subjectInfo: SubjectInfo, observable: Observable<any>): SubjectInfo {
            if (subjectInfo.observable) {
                let nextObservable = subjectInfo.observable;
                subjectInfo.observable = observable.flatMap(() => nextObservable);
            }
            else {
                subjectInfo.observable = observable;
            }

            return subjectInfo;
        }
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
}