import { BehaviorSubject, Observable, Subject } from "rxjs";
import { EmitterMetadata, EmitterType } from "./emitter-metadata";
import { ObservableUtil } from "./observable-util";
import { AngularMetadata } from "./angular-metadata";
import { take } from "rxjs/operators";

export function StateEmitter(): PropertyDecorator;
export function StateEmitter(...propertyDecorators: PropertyDecorator[]): PropertyDecorator;
export function StateEmitter(params: StateEmitter.DecoratorParams, ...propertyDecorators: PropertyDecorator[]): PropertyDecorator;

/** @PropertyDecoratorFactory */
export function StateEmitter(...args: any[]): PropertyDecorator {
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
    export function WithParams(params?: StateEmitter.DecoratorParams, ...propertyDecorators: PropertyDecorator[]): PropertyDecorator {
        params = params || {};

        /** @PropertyDecorator */
        return function (target: any, propertyKey: string) {
            // If a propertyName wasn't specified...
            if (!params.propertyName) {
                // Try to deduce the propertyName from the propertyKey
                if (propertyKey.endsWith("$")) {
                    params.propertyName = propertyKey.substring(0, propertyKey.length - 1);
                }
                else {
                    throw new Error(`@StateEmitter error: propertyName could not be deduced from propertyKey "${propertyKey}" (only keys ending with '$' can be auto-deduced).`);
                }
            }

            // Apply any property decorators to the property
            propertyDecorators.forEach(propertyDecorator => propertyDecorator(target, params.propertyName));

            // Create the state emitter metadata for the decorated property
            StateEmitter.CreateMetadata(target, params.propertyName, Object.assign({ propertyKey, observable: undefined }, params));

            // Point any Angular metadata attached to the StateEmitter to the underlying facade property
            if (AngularMetadata.hasPropMetadataEntry(target.constructor, propertyKey)) {
                AngularMetadata.renamePropMetadataEntry(target.constructor, propertyKey, params.propertyName);
            }
        };
    }

    //# Helper Decorators
    /////////////////////////////
    export function _ResolveProxyDecoratorParams(params: ProxyDecoratorParams | string): ProxyDecoratorParams {
        return typeof params === "string" ? { path: params } : params;
    }

    /** @PropertyDecoratorFactory */
    export function Alias(params: ProxyDecoratorParams | string, ...propertyDecorators: PropertyDecorator[]): PropertyDecorator {
        let $params = _ResolveProxyDecoratorParams(params);

        return StateEmitter.WithParams({
            propertyName: $params.propertyName,
            proxyMode: EmitterMetadata.ProxyMode.Alias,
            proxyPath: $params.path,
            proxyMergeUpdates: $params.mergeUpdates
        }, ...propertyDecorators);
    }

    /** @PropertyDecoratorFactory */
    export function From(params: ProxyDecoratorParams | string, ...propertyDecorators: PropertyDecorator[]): PropertyDecorator {
        let $params = _ResolveProxyDecoratorParams(params);

        return StateEmitter.WithParams({
            propertyName: $params.propertyName,
            proxyMode: EmitterMetadata.ProxyMode.From,
            proxyPath: $params.path,
            proxyMergeUpdates: $params.mergeUpdates
        }, ...propertyDecorators);
    }

    /** @PropertyDecoratorFactory */
    export function Merge(params: ProxyDecoratorParams | string, ...propertyDecorators: PropertyDecorator[]): PropertyDecorator {
        let $params = _ResolveProxyDecoratorParams(params);

        return StateEmitter.WithParams({
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
                    catch (_e) {
                        console.error(`Unable to set value for proxy StateEmitter "${this.constructor.name}.${type}" with dynamic property path "${subjectInfo.proxyPath}" - Path does not contain a Subject.`);
                    }
                }
            };
        }

        export function CreateGetter(type: EmitterType, initialValue?: any): () => any {
            let lastValue: any = initialValue;
            let subscription: any;

            return function (): any {
                // Create a subscription to changes in the subject
                if (!subscription) {
                    // Update the lastValue when a new value is emitted from the subject
                    let subjectInfo: EmitterMetadata.SubjectInfo = EmitterMetadata.GetMetadataMap(this).get(type);
                    subscription = subjectInfo.observable.subscribe((value: any) => lastValue = value);
                }

                // Return the last value that was emitted
                return lastValue;
            };
        }
    }

    export function Bootstrap(targetInstance: any, returnType: EmitterType) {

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
        let returnValue: Observable<any> | Subject<any> = null;
    
        // Iterate over each of the target properties for each emitter type used in this class
        metadataMap.forEach((subjectInfo, emitterType) => {
            // Check the proxy mode for this subject
            switch (subjectInfo.proxyMode) {
                // Aliased emitters simply pass directly through to their source value
                case EmitterMetadata.ProxyMode.Alias: {
                    DefineProxyObservableGetter(subjectInfo, true);
                    break;
                }

                // Merge proxies create a new subject that receives all emissions from the source
                // From proxies create a new subject that takes only its initial value from the source
                case EmitterMetadata.ProxyMode.Merge:
                case EmitterMetadata.ProxyMode.From: {
                    // Create a new copy subject
                    let subject = new BehaviorSubject<any>(subjectInfo.initialValue);

                    // Create a getter that returns the new subject
                    DefineProxyObservableGetter(subjectInfo, false, (proxyObservable: Observable<any>) => {
                        // Only take the first value if this is a From proxy
                        if (subjectInfo.proxyMode === EmitterMetadata.ProxyMode.From) {
                            proxyObservable = proxyObservable.pipe(take(1));
                        }

                        proxyObservable.subscribe((value: any) => subject.next(value));

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

            let facadeSetter = subjectInfo.readOnly ? undefined : Facade.CreateSetter(emitterType);

            // Assign the facade getter and setter to the target instance for this EmitterType
            Object.defineProperty(targetInstance, emitterType, {
                enumerable: true,
                get: Facade.CreateGetter(emitterType, subjectInfo.initialValue),
                set: facadeSetter
            });
    
            // Define the StateEmitter reference
            Object.defineProperty(targetInstance, subjectInfo.propertyKey, {
                // Create a getter that lazily retreives the observable
                get: () => subjectInfo.observable,
                // Allow updates to the subject via the setter of the StateEmitter property
                // (This is needed to allow StateEmitters with attached Angular metadata decorators to work with AoT)
                set: facadeSetter
            });

            if (emitterType === returnType) {
                returnValue = subjectInfo.observable;
            }
        });

        return returnValue;
    }

    export function CreateMetadata(target: any, type: EmitterType, metadata: EmitterMetadata.SubjectInfo) {
        if (target[type]) {
            // Make sure the target class doesn't have a custom property already defined for this event type
            throw new Error(`@StateEmitter metadata creation failed. Class already has a custom ${type} property.`);
        }

        // Add the propertyKey to the class' metadata
        EmitterMetadata.GetOwnMetadataMap(target.constructor).set(type, metadata);

        // Initialize the target property to a self-bootstrapper that will initialize the instance's StateEmitters when called
        Object.defineProperty(target, metadata.propertyKey, {
            configurable: true,
            get: function () {
                return Bootstrap(this, type);
            }
        });

        // Initialize the facade property to a self-bootstrapper that will initialize the instance's StateEmitters when called
        Object.defineProperty(target, type, {
            configurable: true,
            get: function () {
                Bootstrap(this, type);
                return metadata.initialValue;
            }
        });
    }
}