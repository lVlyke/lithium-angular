import { Subject, Observable } from "rxjs";
import { EventMetadata, EventType } from "./event-metadata";
import { EventSourceBootstrap } from "./event-source-bootstrap";

export type EventSourceDecorator = PropertyDecorator & { eventType: EventType };

/** @PropertyDecoratorFactory */
export function EventSource(eventType?: EventType): EventSourceDecorator {
    /** @PropertyDecorator */
    return Object.assign(function (target: any, propertyKey: string) {
        // If an eventType wasn't specified...
        if (!eventType) {
            // Try to deduce the eventType from the propertyKey
            if (propertyKey.endsWith("$")) {
                eventType = propertyKey.substring(0, propertyKey.length - 1);
            }
            else {
                throw new Error(`@EventSource error: eventType could not be deduced from propertyKey "${propertyKey}" (only keys ending with '$' can be auto-deduced).`);
            }
        }

        // Create the event source metadata for the decorated property
        EventSource.CreateMetadata(eventType, target, propertyKey);
    }, { eventType });
}

export namespace EventSource {

    /** @ClassDecoratorFactory */
    export function Bootstrap(): ClassDecorator {
        return EventSourceBootstrap;
    }
    export namespace Facade {

        /** @description
         *  Creates an event facade function (the function that is invoked during an event) for the given event type.
         */
        export function Create(type: EventType): Function {
            return function (value: any) {
                // Iterate over all class properties that have a proxy subject for this event type and notify each subscriber
                EventMetadata.GetPropertySubjectMap(type, this.constructor).forEach(subjectInfo => subjectInfo.subject.next(value));
            };
        }
    }

    export function CreateMetadata(type: EventType, target: any, propertyKey: string): EventMetadata.SubjectInfo {
        if (target[type] && target[type].eventType !== type) {
            // Make sure the target class doesn't have a custom method already defined for this event type
            throw new Error(`@EventSource bootstrap failed. Class already has a custom ${type} method.`);
        }
        else if (!target[type]) {
            // Assign the facade function for the given event type to the appropriate target class method
            target[type] = Facade.Create(type);
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

    export namespace Synchronizers {

        export type Synchronizer<T> = (...observables: Observable<any>[]) => Observable<T>;
        export type DecoratorKeyResolver = (eventType: EventType, propertyKey: string) => string;

        export const COMPOSED_TARGET_TYPE = "$$ComposedTarget$$";

        /** @description Creates an observable that synchronizes on the given subject proxy decorators before emitting.
         * @param target The target object.
         * @param propertyKey The targeted property name of the object.
         * @param synchronizer The function to use to synchronize on the given decorators.
         * @param keyResolver The function to use to resolve the correct propertyKey for each decorator.
         * @param decorators The subject proxy decorators to synchronize on.
        **/
        export function SynchronizeOn<T>(target: any, propertyKey: string, synchronizer: Synchronizer<T>, keyResolver: DecoratorKeyResolver, decorators: EventSourceDecorator[]): Observable<T> {
            // Instantiate all given decorators with the approriate keys
            decorators.forEach(decorator => decorator(target,  keyResolver(decorator.eventType, propertyKey)));

            // Synchronize on the decorators using the specified synchronizer function
            return new Observable(observer => synchronizer(...decorators.map((decorator: EventSourceDecorator) => {
                // Get the event proxy metadata
                let proxySubjectMap = EventMetadata.GetPropertySubjectMap(decorator.eventType, target.constructor);

                // Look up the SubjectInfo for each decorator and subscribe
                return proxySubjectMap.get(keyResolver(decorator.eventType, propertyKey)).observable;
            })).subscribe(observer));
        }

        export function IgnoreSubject(subjectInfo: EventMetadata.SubjectInfo) {
            // Create a dummy completed subject
            subjectInfo.subject = new Subject<any>();
            subjectInfo.subject.complete();
        }

        /** @PropertyDecoratorFactory */
        export function Compose(...decorators: EventSourceDecorator[]): PropertyDecorator {
            /** @PropertyDecorator */
            return function (target: any, propertyKey: string) {
                // Create the composed metadata on the target for the given propertyKey
                let subjectInfo = CreateMetadata(COMPOSED_TARGET_TYPE, target, propertyKey);

                // Create a proxy observable that waits for all composed event proxies to emit each time
                EventMetadata.SubjectInfo.AppendObservable(subjectInfo, SynchronizeOn(target, propertyKey, Observable.zip, ComposedEventPropertyKey, decorators));
                
                // Ignore the subject
                IgnoreSubject(subjectInfo);
            };
        }

        export function ComposedEventPropertyKey(eventType: EventType, propertyKey: string): string {
            return `$$${propertyKey}$$ComposedBy$$${eventType}`;
        }

        /** @PropertyDecoratorFactory */
        export function On(...decorators: EventSourceDecorator[]): PropertyDecorator {
            /** @PropertyDecorator */
            return function (target: any, propertyKey: string) {
                // Create the composed metadata on the target for the given propertyKey
                let subjectInfo = CreateMetadata(COMPOSED_TARGET_TYPE, target, propertyKey);

                // Create a proxy observable that emits as soon as any source decorator emits
                EventMetadata.SubjectInfo.AppendObservable(subjectInfo, SynchronizeOn(target, propertyKey, Observable.merge, OnEventPropertyKey, decorators));

                // Ignore the subject
                IgnoreSubject(subjectInfo);
            };
        }

        export function OnEventPropertyKey(eventType: EventType, propertyKey: string): string {
            return `$$${propertyKey}$$On$$${eventType}`;
        }

        /** @PropertyDecoratorFactory */
        export function WaitFor(...decorators: EventSourceDecorator[]): PropertyDecorator {
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
                        EventMetadata.SubjectInfo.PrependObservable(subjectInfo, waitForEventSubjectInfo.observable.take(1));
                    }
                }));
            };
        }

        export function WaitForEventPropertyKey(propertyKey: string): string {
            return `$$${propertyKey}$$WaitingFor$$${COMPOSED_TARGET_TYPE}`;
        }
    }
}