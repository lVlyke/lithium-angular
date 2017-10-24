import { Subject, Observable } from "rxjs";
import { Metadata } from "./metadata";

export type EventType = string;
export type EventTypeFacadeList = Map<EventType, Function>;
export type SubjectProxyDecorator = ((target: any, propertyKey: string) => any) & { eventType: EventType };
export type SubjectProxyDecoratorFactory = () => SubjectProxyDecorator;

export namespace SubjectProxyDecorator {

    export type Synchronizer<T> = (...observables: Observable<any>[]) => Observable<T>;
    export type DecoratorKeyResolver = (eventType: EventType, propertyKey: string) => string;

    export const COMPOSED_TARGET_TYPE = "$$ComposedTarget$$";
    export const COMPOSED_TARGET_TYPE_LIST = new Map([[COMPOSED_TARGET_TYPE, () => {}]]);

    /** @description Creates an observable that synchronizes on the given subject proxy decorators before emitting.
      * @param target The target object.
      * @param propertyKey The targeted property name of the object.
      * @param synchronizer The function to use to synchronize on the given decorators.
      * @param keyResolver The function to use to resolve the correct propertyKey for each decorator.
      * @param decorators The subject proxy decorators to synchronize on.
      */
    export function SynchronizeOn<T>(target: any, propertyKey: string, synchronizer: Synchronizer<T>, keyResolver: DecoratorKeyResolver, decorators: SubjectProxyDecorator[]): Observable<T> {
        // Instantiate all given decorators with the approriate keys
        decorators.forEach(decorator => decorator(target,  keyResolver(decorator.eventType, propertyKey)));

        // Synchronize on the decorators using the specified synchronizer function
        return new Observable(observer => synchronizer(...decorators.map((decorator: SubjectProxyDecorator) => {
            // Look up the SubjectInfo for each decorator and subscribe
            return EventMetadata.GetPropertySubjectMap(decorator.eventType, target.constructor).get(keyResolver(decorator.eventType, propertyKey)).observable;
        })).subscribe(observer));
    }

    /** @PropertyDecoratorFactory */
    export function Compose(...decorators: SubjectProxyDecorator[]): (target: any, propertyKey: string) => any {
        /** @PropertyDecorator */
        return function (target: any, propertyKey: string) {
            // Create the composed metadata on the target for the given propertyKey
            let subjectInfo = CreateSubjectProxyMetadata(COMPOSED_TARGET_TYPE, target, propertyKey, COMPOSED_TARGET_TYPE_LIST);

            // Create a proxy observable that waits for all composed event proxies to emit each time
            EventMetadata.SubjectInfo.AppendObservable(subjectInfo, SynchronizeOn(target, propertyKey, Observable.zip, ComposedEventPropertyKey, decorators));
            
            // Create a dummy completed subject
            subjectInfo.subject = new Subject<any>();
            subjectInfo.subject.complete();
        };
    }

    export function ComposedEventPropertyKey(eventType: EventType, propertyKey: string): string {
        return `$$${propertyKey}$$ComposedBy$$${eventType}`;
    }

    /** @PropertyDecoratorFactory */
    export function On(...decorators: SubjectProxyDecorator[]): (target: any, propertyKey: string) => any {
        /** @PropertyDecorator */
        return function (target: any, propertyKey: string) {
            // Create the composed metadata on the target for the given propertyKey
            let subjectInfo = CreateSubjectProxyMetadata(COMPOSED_TARGET_TYPE, target, propertyKey, COMPOSED_TARGET_TYPE_LIST);

            // Create a proxy observable that emits as soon as any source decorator emits
            EventMetadata.SubjectInfo.AppendObservable(subjectInfo, SynchronizeOn(target, propertyKey, Observable.merge, OnEventPropertyKey, decorators));

            // Create a dummy completed subject
            subjectInfo.subject = new Subject<any>();
            subjectInfo.subject.complete();
        };
    }

    export function OnEventPropertyKey(eventType: EventType, propertyKey: string): string {
        return `$$${propertyKey}$$On$$${eventType}`;
    }

    /** @PropertyDecoratorFactory */
    export function WaitFor(...decorators: SubjectProxyDecorator[]): (target: any, propertyKey: string) => any {
        /** @PropertyDecorator */
        return function (target: any, propertyKey: string) {
            // Get the property key name of the wait-for property that will be created
            let waitForEventPropertyKey = WaitForEventPropertyKey(propertyKey);

            // Compose all decorators to wait for on the wait-for property
            Compose(...decorators)(target, waitForEventPropertyKey);

            // Get the SubjectInfo for the composed wait-for property
            let waitForEventSubjectInfo = EventMetadata.GetPropertySubjectMap(COMPOSED_TARGET_TYPE, target.constructor).get(waitForEventPropertyKey);

            // Iterate over the metadata map to look for all metadata for the target property
            EventMetadata.GetMetadataMap(target.constructor).forEach((propertySubjectMap, eventType) => propertySubjectMap.forEach((subjectInfo, foundPropertyKey) => {
                // If this is metadata for the target property...
                if (foundPropertyKey === propertyKey) {
                    // Create a proxy observable that waits for all event proxies to emit once before completing
                    EventMetadata.SubjectInfo.PrependObservable(subjectInfo, new Observable(observer => waitForEventSubjectInfo.observable.subscribe(() => {
                        observer.next();
                        observer.complete();
                    })));
                }
            }));
        };
    }

    export function WaitForEventPropertyKey(propertyKey: string): string {
        return `$$${propertyKey}$$WaitingFor$$${COMPOSED_TARGET_TYPE}`;
    }
}

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

export namespace EventFacade {

    /** @description
     *  Creates an event facade function (the function that is invoked during an event) for the given event type.
     */
    export function Create(type: EventType): Function {
        return function (...args: any[]) {
            // Iterate over all class properties that have a proxy subject for this event type...
            EventMetadata.GetPropertySubjectMap(type, this.constructor)
                .forEach((subjectInfo: EventMetadata.SubjectInfo) => subjectInfo.subject.next(args.length > 0 ? args[0] : undefined)); // And notify each subscriber
        };
    }

    /** @description
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
 *  @description Creates event proxy Subjects for all event proxy properties in the class.
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