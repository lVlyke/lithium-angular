import { Subject } from "rxjs";
import { Metadata } from "./metadata";

export type EventType = string;

export namespace EventMetadata {

    export const SUBJECT_TABLE_MERGED_KEY = "$$EVENTSOURCE_SUBJECT_TABLE_MERGED";
    export const BOOTSTRAPPED_KEY = "$$EVENTSOURCE_BOOTSTRAPPED";
    export const LIFECYCLE_REGISTRATION_KEY = "$$EVENTSOURCE_LIFECYCLE_REGISTRATION";

    export interface ConfigOptions {
        eventType: EventType;
        skipMethodCheck?: boolean;
        unmanaged?: boolean;
    }

    export interface SubjectInfo extends ConfigOptions {
        subject: Subject<any>;
    }

    export type PropertySubjectMap = Map<string, SubjectInfo>;
    export type EventSubjectTable = Map<EventType, PropertySubjectMap>;
    export type InstanceBootstrapMap = Map<EventType, boolean>;
    export type LifecycleRegistrationMap = Map<EventType, boolean>;

    const EventSubjectTableSymbol = Symbol("EventSubjectTableSymbol");
    const InstanceBootstrapMapSymbol = Symbol("InstanceBootstrapMapSymbol");
    const LifecycleRegistrationMapSymbol = Symbol("LifecycleRegistrationMapSymbol");

    /** @description Gets the metadata map object for the given target class (or its inheritted classes). */
    export function GetEventSubjectTable(target: Object): EventSubjectTable {
        return Metadata.requireMetadata<EventSubjectTable>(EventSubjectTableSymbol, target, new Map());
    }

    /** @description Gets the metadata map object for the given target class. */
    export function GetOwnEventSubjectTable(target: Object): EventSubjectTable {
        return Metadata.requireOwnMetadata<EventSubjectTable>(EventSubjectTableSymbol, target, new Map());
    }

    export function GetInstanceBootstrapMap(target: Object): InstanceBootstrapMap {
        return Metadata.requireMetadata<InstanceBootstrapMap>(InstanceBootstrapMapSymbol, target, new Map());
    }

    export function GetLifecycleRegistrationMap(target: Object): LifecycleRegistrationMap {
        return Metadata.requireMetadata<LifecycleRegistrationMap>(LifecycleRegistrationMapSymbol, target, new Map());
    }

    /** @description
     *  Gets the property subject map for the given event type from the metadata map for the given target class (or its inheritted classes).
     */
    export function GetPropertySubjectMap(type: EventType, target: Object): PropertySubjectMap {
        let table = GetEventSubjectTable(target);
        let subjectMap = table.get(type);

        if (!subjectMap) {
            subjectMap = new Map();
            table.set(type, subjectMap);
        }

        return subjectMap;
    }

    /** @description
     *  Gets the property subject map for the given event type from the metadata map for the given target class.
     */
    export function GetOwnPropertySubjectMap(type: EventType, target: Object): PropertySubjectMap {
        let table = GetOwnEventSubjectTable(target);
        let subjectMap = table.get(type);

        if (!subjectMap) {
            subjectMap = new Map();
            table.set(type, subjectMap);
        }

        return subjectMap;
    }

    export function HasOwnEventSubjectTable(target: Object): boolean {
        return Metadata.hasOwnMetadata(EventSubjectTableSymbol, target);
    }

    export function SetEventSubjectTable(target: Object, map: EventSubjectTable) {
        Metadata.setMetadata(EventSubjectTableSymbol, target, map);
    }

    /** @description Copy all metadata from the source map to the target map.
     * 
     *  Note: This mutates the target map.
     **/
    export function CopySubjectTable(target: EventSubjectTable, source: EventSubjectTable, overwrite?: boolean): EventSubjectTable {
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
     * 
     *  Note: This mutates the object's metadata.
     **/
    export function CopyInherittedSubjectTable(object: any): EventSubjectTable {
        if (object) {
            let subjectTable = GetEventSubjectTable(object);
            let inherittedTable = CopyInherittedSubjectTable(Object.getPrototypeOf(object));

            // Merge own and inheritted metadata into a single map (note: this mutates object's metadata)
            return CopySubjectTable(subjectTable, inherittedTable);
        }

        return new Map();
    }
}