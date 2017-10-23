import { Subject, Observable } from "rxjs";
import { Metadata } from "./metadata";

export type EventType = string;
export type EventTypeFacadeList = Map<EventType, Function>;
export type SubjectProxyDecorator = ((target: any, propertyKey: string) => any) & { eventType: EventType };
export type SubjectProxyDecoratorFactory = () => SubjectProxyDecorator;

export namespace SubjectProxyDecorator {

    export const COMPOSED_TARGET_TYPE = "$$ComposedTarget$$";
    export const COMPOSED_TARGET_TYPE_LIST = new Map([[COMPOSED_TARGET_TYPE, () => {}]]);

    /** @PropertyDecoratorFactory */
    export function Compose(...decorators: SubjectProxyDecorator[]): (target: any, propertyKey: string) => any {
        /** @PropertyDecorator */
        return function (target: any, propertyKey: string) {
            // Instantiate all given decorators as composed decorators
            decorators.forEach(decorator => decorator(target, ComposedEventPropertyKey(decorator.eventType, propertyKey)));

            // Create the composed metadata on the target for the given propertyKey
            let subjectInfo = CreateSubjectProxyMetadata(COMPOSED_TARGET_TYPE, target, propertyKey, COMPOSED_TARGET_TYPE_LIST);
            
            // Create a proxy observable that waits for all composed event proxies to emit
            subjectInfo.observable = new Observable(observer => {
                // Look up the SubjectInfo for each composed decorator and subscribe
                Observable.zip(...decorators.map(decorator => EventMetadata.GetPropertySubjectMap(decorator.eventType, target.constructor).get(ComposedEventPropertyKey(decorator.eventType, propertyKey)).observable))
                    .subscribe(observer);
            });
        }
    }

    export function ComposedEventPropertyKey(eventType: EventType, propertyKey: string): string {
        return `$$${propertyKey}$$ComposedBy$$${eventType}`;
    }
}

export namespace EventMetadata {

    export interface SubjectInfo {
        subject: Subject<any>;
        observable: Observable<any>;
    }

    export type PropertySubjectMap = Map<string, SubjectInfo>;
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
                .forEach((subjectInfo: EventMetadata.SubjectInfo) => subjectInfo.subject.next(args.length > 0 ? args[0] : undefined)); // And notify each subscriber
        };
    }

    /** @Description
     *  Creates a list of event facade functions for each of the given event types.
     */
    export function list(values: EventType[]): EventTypeFacadeList {
        return values.reduce((map, type) => map.set(type, Create(type)), new Map<EventType, Function>());
    }
}

export function CreateSubjectProxyMetadata(type: EventType, target: any, propertyKey: string, facadeList: EventTypeFacadeList): EventMetadata.SubjectInfo {
    let facadeFn: Function = facadeList.get(type);

    if (target[type] && target[type] !== facadeFn) {
        // Make sure the target class doesn't have a custom method already defined for this event type
        throw new Error(`@OnInit bootstrap failed. Class already has a ${type} method.`);
    }
    else if (!target[type] && facadeFn) {
        // Assign the facade function for the given event type to the appropriate target class method
        target[type] = facadeFn;
    }
    else {
        console.warn(`Subject proxy facade function for event type "${type}" is undefined. Event will never be triggered.`);
    }

    // Create initial metadata
    let metadata: EventMetadata.SubjectInfo = {
        subject: undefined,
        observable: undefined
    };

    // Add the propertyKey to the class' metadata
    EventMetadata.GetOwnPropertySubjectMap(type, target.constructor).set(propertyKey, metadata);
    return metadata;
}

/** @PropertyDecoratorMetaFactory */
export function SubjectProxyDecoratorFactory(eventType: EventType, list: EventTypeFacadeList): SubjectProxyDecoratorFactory {
    /** @PropertyDecoratorFactory */
    return function (): SubjectProxyDecorator {
        /** @PropertyDecorator */
        return Object.assign(function (target: any, propertyKey: string) {
            // Create the subject proxy metadata for the decorated property
            CreateSubjectProxyMetadata(eventType, target, propertyKey, list);
        }, { eventType });
    };
}

/** @ClassDecorator
 *  @Description Creates event proxy Subjects for all event proxy properties in the class.
 */
export function LifecycleDecorator(constructor: any) {

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
        // If the event proxy hasn't been created for this property yet...
        if (!subjectInfo.observable) {
            // Get the property's descriptor from the class' immediate prototype
            let propertyDescriptor = Object.getOwnPropertyDescriptor(constructor.prototype, propertyKey);

            // Define the Subject
            if (propertyDescriptor && propertyDescriptor.value) {
                // Use the existing property value (this allows for chaining of subject proxy decorators)
                subjectInfo.subject = propertyDescriptor.value;
                
                // Existing values must be a Subject
                if (!(subjectInfo.subject instanceof Subject)) {
                    throw new Error(`Existing property value for ${eventType} event proxy "${constructor.name}.${propertyKey}" is not a Subject (Did you mean to define a value for this property?).`);
                }
            }
            else {
                // Create a new Subject
                subjectInfo.subject = new Subject<any>();
            }

            // Define the observable
            subjectInfo.observable = subjectInfo.subject.asObservable();
            
            // Add the Subject to the class' metadata
            propertySubjectMap.set(propertyKey, subjectInfo);
        }

        // Make the observable accessible on the class' prototype
        constructor.prototype[propertyKey] = subjectInfo.observable;
    }));
}

/** @ClassDecoratorFactory */
export function Lifecycle() {
    return LifecycleDecorator;
}