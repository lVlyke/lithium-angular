import { BehaviorSubject, Observable } from "rxjs";
import { EmitterMetadata, EmitterType } from "./emitter-metadata";

export type StateEmitterDecorator = PropertyDecorator & { emitterType: EmitterType };

/** @PropertyDecoratorFactory */
export function StateEmitter(params?: StateEmitter.DecoratorParams): StateEmitterDecorator {
    params = params || {};

    /** @PropertyDecorator */
    return Object.assign(function (target: any, propertyKey: string) {
        // If an emitterType wasn't specified...
        if (!params.propertyName) {
            // Try to deduce the emitterType from the propertyKey
            if (propertyKey.endsWith("$")) {
                params.propertyName = propertyKey.substring(0, propertyKey.length - 1);
            }
            else {
                throw new Error(`@StateEmitter error: emitterType could not be deduced from propertyKey "${propertyKey}" (only keys ending with '$' can be auto-deduced).`);
            }
        }

        // Create the event source metadata for the decorated property
        StateEmitter.CreateMetadata(target, params.propertyName, {
            propertyKey: propertyKey,
            defaultValue: params.value,
            proxyPath: params.proxyPath,
            proxyMode: params.proxyMode,
            readOnly: params.readOnly,
            subject: undefined
        });
    }, { emitterType: params.propertyName });
}

export namespace StateEmitter {

    export interface DecoratorParams {
        propertyName?: EmitterType;
        value?: any;
        readOnly?: boolean;
        proxyPath?: string;
        proxyMode?: EmitterMetadata.ProxyMode
    }

    export interface AliasDecoratorParams {
        proxyPath: string;
        propertyName?: EmitterType;
    }

    export interface FromDecoratorParams {
        proxyPath: string;
        propertyName?: EmitterType;
    }

    /** @PropertyDecoratorFactory */
    export function Alias(params: AliasDecoratorParams | string): PropertyDecorator {
        let $params = (params instanceof Object ? params : { proxyPath: params }) as AliasDecoratorParams;

        return function (target: any, propertyKey: string) {
            StateEmitter({
                propertyName: $params.propertyName,
                proxyMode: EmitterMetadata.ProxyMode.Alias,
                proxyPath: $params.proxyPath
            })(target, propertyKey);
        };
    }

    /** @PropertyDecoratorFactory */
    export function From(params: FromDecoratorParams | string): PropertyDecorator {
        let $params = (params instanceof Object ? params : { proxyPath: params }) as FromDecoratorParams;

        return function (target: any, propertyKey: string) {
            StateEmitter({
                propertyName: $params.propertyName,
                proxyMode: EmitterMetadata.ProxyMode.From,
                proxyPath: $params.proxyPath
            })(target, propertyKey);
        };
    }

    export namespace Facade {

        export function CreateSetter(type: EmitterType): (value: any) => void {
            return function (value: any) {
                // Notify the subject of the new value
                EmitterMetadata.GetMetadataMap(this).get(type).subject.next(value);
            };
        }

        export function CreateGetter(type: EmitterType, defaultValue?: any): () => any {
            let lastValue: any = defaultValue;
            let subscription: any;

            return function (): any {
                // Create a subscription to subject changes if not subscribed
                if (!subscription) {
                    // Update when a new value is emitted
                    let subjectInfo: EmitterMetadata.SubjectInfo = EmitterMetadata.GetMetadataMap(this).get(type);
                    subscription = subjectInfo.subject.subscribe((value: any) => lastValue = value);
                }

                // Return the last value that was emitted
                return lastValue;
            };
        }
    }

    export function _DeducePath(target: any, path: string): any {
        return path.split(".").reduce((o, i) => o[i], target);
    }

    export function Bootstrap(targetInstance: any) {
        // Copy all emitter metadata from the constructor to the target instance
        let metadataMap = EmitterMetadata.CopyMetadata(EmitterMetadata.GetMetadataMap(targetInstance), EmitterMetadata.CopyInherittedMetadata(targetInstance.constructor), true);
    
        // Iterate over each of the target properties for each emitter type used in this class
        metadataMap.forEach((subjectInfo, emitterType) => {
            switch (subjectInfo.proxyMode) {
                case EmitterMetadata.ProxyMode.Alias: {
                    Object.defineProperty(subjectInfo, "subject", { get: () => _DeducePath(targetInstance, subjectInfo.proxyPath) });
                    break;
                }
                case EmitterMetadata.ProxyMode.From: {
                    let subject = new BehaviorSubject<any>(subjectInfo.defaultValue);
                    let subscription;

                    Object.defineProperty(subjectInfo, "subject", { get: () => {
                        if (!subscription) {
                            let fromObservable: Observable<any> = _DeducePath(targetInstance, subjectInfo.proxyPath);
                            fromObservable.subscribe(value => subject.next(value));
                        }
                        return subject;
                    }});
                    break;
                }
                case EmitterMetadata.ProxyMode.None:
                default: {
                    // Create a new BehaviorSubject with the default value
                    subjectInfo.subject = new BehaviorSubject<any>(subjectInfo.defaultValue);
                    break;
                }
            }

            // Assign the facade getter and setter to the target instance
            Object.defineProperty(targetInstance, emitterType, {
                get: Facade.CreateGetter(emitterType, subjectInfo.defaultValue),
                set: subjectInfo.readOnly ? undefined : Facade.CreateSetter(emitterType)
            });
    
            // Make the subject accessible to the target instance via a lazy loaded getter
            Object.defineProperty(targetInstance, subjectInfo.propertyKey, { get: () => subjectInfo.subject });
        });
    }

    export function CreateMetadata(target: any, type: EmitterType, metadata: EmitterMetadata.SubjectInfo) {
        if (target[type] && target[type].emitterType !== type) {
            // Make sure the target class doesn't have a custom method already defined for this event type
            throw new Error(`@StateEmitter metadata creation failed. Class already has a custom ${type} method.`);
        }

        // Add the propertyKey to the class' metadata
        EmitterMetadata.GetOwnMetadataMap(target.constructor).set(type, metadata);
    }
}