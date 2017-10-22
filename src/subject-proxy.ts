import { Subject } from "rxjs";
import { Metadata } from "./metadata";

export type EventType = string;
export type EventTypeFacadeList = Map<EventType, Function>;
export type SubjectProxyDecorator = (target: any, propertyKey: string) => any;

export namespace EventMetadata {

    export type PropertySubjectMap = Map<string, Subject<any>>;
    export type MetadataMap = Map<EventType, PropertySubjectMap>;

    export const EventMapSymbol = Symbol("EventMapSymbol");

    /** @Description Gets the metadata map object for the given target class (or its inheritted classes). */
    export function GetMetadataMap(target: Object): MetadataMap {
        return Metadata.GetMetadata<MetadataMap>(EventMapSymbol, target, new Map());
    }

    /** @Description Gets the metadata map object for the given target class. */
    export function GetOwnMetadataMap(target: Object): MetadataMap {
        return Metadata.GetOwnMetadata<MetadataMap>(EventMapSymbol, target, new Map());
    }

    /** @Description
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

    /** @Description
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

export namespace EventFacade {

    /** @Description
     *  Creates an event facade function (the function that is invoked during an event) for the given event type.
     */
    export function Create(type: EventType): Function {
        return function (...args: any[]) {
            // Iterate over all class properties that have a proxy subject for this event type...
            EventMetadata.GetPropertySubjectMap(type, this.constructor)
                .forEach((subject: Subject<any>) => subject.next(args.length > 0 ? args[0] : undefined)); // And notify each subscriber
        };
    }

    /** @Description
     *  Creates a list of event facade functions for each of the given event types.
     */
    export function list(values: EventType[]): EventTypeFacadeList {
        return values.reduce((map, type) => map.set(type, Create(type)), new Map<EventType, Function>());
    }
}

export function CreateSubjectProxyMetadata(type: EventType, target: any, propertyKey: string, facadeList: EventTypeFacadeList) {
    if (target[type] && target[type] !== facadeList.get(type)) {
        // Make sure the target class doesn't have a custom method already defined for this event type
        throw new Error(`@OnInit bootstrap failed. Class already has a ${type} method.`);
    }
    else if (!target[type]) {
        // Assign the facade function for the given event type to the appropriate target class method
        target[type] = facadeList.get(type);
    }

    // Add the propertyKey to the class' metadata
    EventMetadata.GetOwnPropertySubjectMap(type, target.constructor).set(propertyKey, undefined);
}

/** @PropertyDecoratorFactory */
export function SubjectProxyDecorator(type: EventType, list: EventTypeFacadeList): SubjectProxyDecorator {
    /** @PropertyDecorator */
    return function (target: any, propertyKey: string) {
        // Create the subject proxy metadata for the decorated property
        CreateSubjectProxyMetadata(type, target, propertyKey, list);
    };
}

/** @ClassDecorator
 *  @Description Creates event proxy Subjects for all event proxy properties in the class.
 */
export function Lifecycle(constructor: any) {

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
                        ownPropertySubjectMap.set(propertyKey, value);
                    }
                }));
            }
        }

        return metadataMap;
    }

    // Merge own and inheritted metadata into a single map
    let metadataMap = mergeInherittedMetadata(constructor);

    // Iterate over each of the target properties for each proxied event type used in this class
    metadataMap.forEach((propertySubjectMap, eventType) => propertySubjectMap.forEach((value, propertyKey) => {
        // If the event proxy Subject hasn't been created for this property yet...
        if (!value) {
            // Get the property's descriptor from the class' immediate prototype
            let propertyDescriptor = Object.getOwnPropertyDescriptor(constructor.prototype, propertyKey);

            // Define the Subject
            if (propertyDescriptor && propertyDescriptor.value) {
                // Use the existing property value (this allows for chaining of subject proxy decorators)
                value = propertyDescriptor.value;

                // Existing values must be a Subject
                if (!(value instanceof Subject)) {
                    throw new Error(`Existing property value for ${eventType} event proxy "${constructor.name}.${propertyKey}" is not a Subject (Did you mean to define a value for this property?).`);
                }
            }
            else {
                // Create a new Subject
                value = new Subject<any>();
            }
            
            // Add the Subject to the class' metadata
            propertySubjectMap.set(propertyKey, value);

            // Make the Subject accessible on the class' prototype
            constructor.prototype[propertyKey] = value;
        }
    }));
}