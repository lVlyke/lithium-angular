import { BehaviorSubject, Observable, Subject } from "rxjs";
import { EmitterMetadata, EmitterType } from "./emitter-metadata";
import { ObservableUtil } from "./observable-util";

export type StateEmitterDecorator = PropertyDecorator & { emitterType: EmitterType };

export function StateEmitter(): StateEmitterDecorator;
export function StateEmitter(...propertyDecorators: PropertyDecorator[]): StateEmitterDecorator;
export function StateEmitter(params: StateEmitter.DecoratorParams, ...propertyDecorators: PropertyDecorator[]): StateEmitterDecorator;

/** @PropertyDecoratorFactory */
export function StateEmitter(...args: any[]): StateEmitterDecorator {
    let paramsArg: StateEmitter.DecoratorParams | PropertyDecorator;

    if (args.length > 0) {
        paramsArg = args[0];
    }

    if (!paramsArg || paramsArg instanceof Function) {
        return StateEmitter.WithParams(undefined, ...args);
    }
    else {
        return StateEmitter.WithParams(paramsArg, ...args.slice(1));
    }
}

export namespace StateEmitter {

    export interface DecoratorParams extends EmitterMetadata.SubjectInfo.CoreDetails {
        propertyName?: EmitterType;
    }

    export interface ProxyDecoratorParams {
        path: string;
        propertyName?: EmitterType;
        mergeUpdates?: boolean;
    }

    /** @PropertyDecoratorFactory */
    export function WithParams(params?: StateEmitter.DecoratorParams, ...propertyDecorators: PropertyDecorator[]): StateEmitterDecorator {
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

            // Apply any property decorators to the property
            propertyDecorators.forEach(propertyDecorator => propertyDecorator(target, params.propertyName));

            // Create the event source metadata for the decorated property
            StateEmitter.CreateMetadata(target, params.propertyName, Object.assign({ propertyKey, observable: undefined }, params));
        }, { emitterType: params.propertyName });
    }

    //# Helper Decorators
    /////////////////////////////
    export function _ResolveProxyDecoratorParams(params: ProxyDecoratorParams | string): ProxyDecoratorParams {
        return typeof params === "string" ? { path: params } : params;
    }

    /** @PropertyDecoratorFactory */
    export function Alias(params: ProxyDecoratorParams | string, ...propertyDecorators: PropertyDecorator[]): PropertyDecorator {
        let $params = _ResolveProxyDecoratorParams(params);

        return WithParams({
            propertyName: $params.propertyName,
            proxyMode: EmitterMetadata.ProxyMode.Alias,
            proxyPath: $params.path,
            proxyMergeUpdates: $params.mergeUpdates
        }, ...propertyDecorators);
    }

    /** @PropertyDecoratorFactory */
    export function From(params: ProxyDecoratorParams | string, ...propertyDecorators: PropertyDecorator[]): PropertyDecorator {
        let $params = _ResolveProxyDecoratorParams(params);

        return WithParams({
            propertyName: $params.propertyName,
            proxyMode: EmitterMetadata.ProxyMode.From,
            proxyPath: $params.path,
            proxyMergeUpdates: $params.mergeUpdates
        }, ...propertyDecorators);
    }

    /** @PropertyDecoratorFactory */
    export function Merge(params: ProxyDecoratorParams | string, ...propertyDecorators: PropertyDecorator[]): PropertyDecorator {
        let $params = _ResolveProxyDecoratorParams(params);

        return WithParams({
            propertyName: $params.propertyName,
            proxyMode: EmitterMetadata.ProxyMode.Merge,
            proxyPath: $params.path,
            proxyMergeUpdates: $params.mergeUpdates
        }, ...propertyDecorators);
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
                        // If value merging wasn't explicitly enabled or disabled then only enable it if the incoming value is an Object
                        let mergeUpdates = subjectInfo.proxyMergeUpdates;
                        mergeUpdates = (mergeUpdates !== null && mergeUpdates !== undefined) ? mergeUpdates : value instanceof Object;

                        // Update the dynamic proxy value
                        ObservableUtil.UpdateDynamicPropertyPathValue(this, subjectInfo.proxyPath, value, mergeUpdates);
                    }
                    catch (e) {
                        console.error(`Unable to set value for proxy StateEmitter "${this.constructor.name}.${type}" with dynamic property path "${subjectInfo.proxyPath}" - Path does not contain a Subject.`);
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

        function DefineProxyObservableGetter(subjectInfo: EmitterMetadata.SubjectInfo, alwaysResolvePath?: boolean, onResolve?: (proxySubscribable: Observable<any>) => Observable<any> | void) {
            let observable: Observable<any>;

            // Create a getter that resolves the observable from the target proxy path
            Object.defineProperty(subjectInfo, "observable", { get: (): Observable<any> => {
                if (alwaysResolvePath || !observable) {
                    // Get the proxy observable
                    observable = ObservableUtil.ResolvePropertyPath(targetInstance, subjectInfo.proxyPath);

                    if (onResolve) {
                        observable = onResolve(observable) || observable;
                    }
                }

                return observable;
            }});
        }

        // Copy all emitter metadata from the constructor to the target instance
        let metadataMap = EmitterMetadata.CopyMetadata(EmitterMetadata.GetOwnMetadataMap(targetInstance), EmitterMetadata.CopyInherittedMetadata(targetInstance.constructor), true);
    
        // Iterate over each of the target properties for each emitter type used in this class
        metadataMap.forEach((subjectInfo, emitterType) => {
            // Check the proxy mode for this subject
            switch (subjectInfo.proxyMode) {
                // Aliased emitters simply pass directly through to their source value
                case EmitterMetadata.ProxyMode.Alias: {
                    DefineProxyObservableGetter(subjectInfo, true);
                    break;
                }

                // Merge emitters create a separate subject that subscribes to all emissions from the source
                // From emitters create a separate subject that sets the initial value from the source
                case EmitterMetadata.ProxyMode.Merge:
                case EmitterMetadata.ProxyMode.From: {
                    // Create a new copy subject
                    let subject = new BehaviorSubject<any>(subjectInfo.initialValue);

                    // Create a getter that returns the new subject
                    DefineProxyObservableGetter(subjectInfo, false, (proxyObservable: Observable<any>) => {
                        // Only take the first value if this is a From proxy
                        if (subjectInfo.proxyMode === EmitterMetadata.ProxyMode.From) {
                            proxyObservable = proxyObservable.take(1);
                        }

                        proxyObservable.subscribe(value => subject.next(value));

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