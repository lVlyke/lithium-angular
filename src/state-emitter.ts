import { BehaviorSubject, Observable, Subject } from "rxjs";
import { EmitterMetadata, EmitterType } from "./emitter-metadata";
import { Subscribable } from "rxjs/Observable";
import { ObservableUtil } from "./observable-util";

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
        StateEmitter.CreateMetadata(target, params.propertyName, Object.assign({ propertyKey, observable: undefined }, params));
    }, { emitterType: params.propertyName });
}

export namespace StateEmitter {

    export interface DecoratorParams extends EmitterMetadata.SubjectInfo.CoreDetails {
        propertyName?: EmitterType;
    }

    export interface AliasDecoratorParams {
        path: string;
        propertyName?: EmitterType;
        subjectType?: EmitterMetadata.SubjectInfo.ProxyType;
    }

    export interface FromDecoratorParams {
        path: string;
        propertyName?: EmitterType;
        subjectType?: EmitterMetadata.SubjectInfo.ProxyType;
    }

    /** @PropertyDecoratorFactory */
    export function Alias(params: AliasDecoratorParams | string): PropertyDecorator {
        let $params = (params instanceof Object ? params : { path: params }) as AliasDecoratorParams;

        /** @PropertyDecorator */
        return function (target: any, propertyKey: string) {
            StateEmitter({
                propertyName: $params.propertyName,
                proxyMode: EmitterMetadata.ProxyMode.Alias,
                proxyPath: $params.path,
                proxyType: $params.subjectType
            })(target, propertyKey);
        };
    }

    /** @PropertyDecoratorFactory */
    export function From(params: FromDecoratorParams | string): PropertyDecorator {
        let $params = (params instanceof Object ? params : { path: params }) as FromDecoratorParams;

        /** @PropertyDecorator */
        return function (target: any, propertyKey: string) {
            StateEmitter({
                propertyName: $params.propertyName,
                proxyMode: EmitterMetadata.ProxyMode.From,
                proxyPath: $params.path,
                proxyType: $params.subjectType
            })(target, propertyKey);
        };
    }

    export namespace Facade {

        export function CreateSetter(type: EmitterType): (value: any) => void {
            return function (value: any) {
                let subjectInfo = EmitterMetadata.GetMetadataMap(this).get(type);

                // If this is a static subject...
                if (EmitterMetadata.SubjectInfo.IsStaticAlias(subjectInfo)) {
                    // Notify the subject of the new value
                    subjectInfo.observable.next(value);
                }
                else {
                    try {
                        // Update the dynamic proxy value
                        ObservableUtil.UpdateDynamicPropertyPathValue(this, subjectInfo.proxyPath, value, subjectInfo.proxyType);
                    }
                    catch (e) {
                        console.error(`Unable to set value for proxy dynamic StateEmitter "${this.constructor.name}.${type}" - Property path "${subjectInfo.proxyPath}" does not contain a Subject.`);
                    }
                }
            };
        }

        export function CreateGetter(type: EmitterType, initialValue?: any): () => any {
            let lastValue: any = initialValue;
            let subscription: any;

            return function (): any {
                // Create a subscription to subject changes if not subscribed
                if (!subscription) {
                    // Update when a new value is emitted
                    let subjectInfo: EmitterMetadata.SubjectInfo = EmitterMetadata.GetMetadataMap(this).get(type);
                    subscription = subjectInfo.observable.subscribe((value: any) => lastValue = value);
                }

                // Return the last value that was emitted
                return lastValue;
            };
        }
    }

    export function Bootstrap(targetInstance: any) {

        function DefineProxySubscribableGetter(subjectInfo: EmitterMetadata.SubjectInfo, alwaysResolvePath?: boolean, onResolve?: (proxySubscribable: Subscribable<any>) => Subscribable<any> | void) {
            let subscribable: Subscribable<any>;

            // Create a getter that resolves the observable from the target proxy path
            Object.defineProperty(subjectInfo, "observable", { get: (): Subscribable<any> => {
                if (alwaysResolvePath || !subscribable) {
                    // Get the proxy subscribable
                    subscribable = ObservableUtil.CreateFromPropertyPath(targetInstance, subjectInfo.proxyPath);

                    if (onResolve) {
                        subscribable = onResolve(subscribable) || subscribable;
                    }
                }

                return subscribable;
            }});
        }

        // Copy all emitter metadata from the constructor to the target instance
        let metadataMap = EmitterMetadata.CopyMetadata(EmitterMetadata.GetMetadataMap(targetInstance), EmitterMetadata.CopyInherittedMetadata(targetInstance.constructor), true);
    
        // Iterate over each of the target properties for each emitter type used in this class
        metadataMap.forEach((subjectInfo, emitterType) => {
            // Check the proxy mode for this subject
            switch (subjectInfo.proxyMode) {
                // Aliased emitters simply pass directly through to their source value
                case EmitterMetadata.ProxyMode.Alias: {
                    DefineProxySubscribableGetter(subjectInfo, true);
                    break;
                }

                // From emitters create a separate copy of the source value and subscribes to all emissions from the source
                case EmitterMetadata.ProxyMode.From: {
                    // Create a new copy subject
                    let subject = new BehaviorSubject<any>(subjectInfo.initialValue);
                    let subscription;

                    // Create a getter that returns the new subject
                    DefineProxySubscribableGetter(subjectInfo, false, (proxySubscribable: Subscribable<any>) => {
                        // Create a subscription that updates the new subject when the source value emits
                        subscription = proxySubscribable.subscribe(value => subject.next(value));

                        return subject;
                    });
                    break;
                }

                case EmitterMetadata.ProxyMode.None:
                default: {
                    // Create a new BehaviorSubject with the default value
                    subjectInfo.observable = new BehaviorSubject<any>(subjectInfo.initialValue);
                    break;
                }
            }

            // Assign the facade getter and setter to the target instance for this EmitterType
            Object.defineProperty(targetInstance, emitterType, {
                get: Facade.CreateGetter(emitterType, subjectInfo.initialValue),
                set: subjectInfo.readOnly ? undefined : Facade.CreateSetter(emitterType)
            });
    
            // Create a getter property on the targetInstance that lazily retreives the observable
            Object.defineProperty(targetInstance, subjectInfo.propertyKey, { get: () => subjectInfo.observable });
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