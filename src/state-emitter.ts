import { Observable, BehaviorSubject, Subscription } from "rxjs";
import { EmitterMetadata, EmitterType, Metadata, CommonMetadata } from "./metadata";
import { ObservableUtil } from "./observable-util";
import { take, tap, filter } from "rxjs/operators";
import { ManagedBehaviorSubject } from "./managed-observable";
import { EventSource } from "./event-source";
import { AutoPush } from "./autopush";
import { AngularLifecycleType } from "./lifecycle-event";
import { _LangUtils as LangUtils } from "./lang-utils";

/** @deprecated */
export function StateEmitter(): PropertyDecorator;
/** @deprecated */
export function StateEmitter(...propertyDecorators: PropertyDecorator[]): PropertyDecorator;
/** @deprecated */
export function StateEmitter(params: StateEmitter.DecoratorParams, ...propertyDecorators: PropertyDecorator[]): PropertyDecorator;

/** @deprecated */
/** @PropertyDecoratorFactory */
export function StateEmitter(...args: any[]): PropertyDecorator {
    let paramsArg: StateEmitter.DecoratorParams | PropertyDecorator | undefined;

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

/** @deprecated */
export namespace StateEmitter {

    export interface DecoratorParams extends EmitterMetadata.SubjectInfo.CoreDetails {
        propertyName?: EmitterType;
    }

    export interface ProxyDecoratorParams {
        path: string;
        propertyName?: EmitterType;
        mergeUpdates?: boolean;
        readOnly?: boolean;
        writeOnly?: boolean;
        unmanaged?: boolean;
    }

    export interface SelfProxyDecoratorParams {
        propertyName?: EmitterType;
        readOnly?: boolean;
        writeOnly?: boolean;
        unmanaged?: boolean;
    }

    /** @PropertyDecoratorFactory */
    export function WithParams(params?: StateEmitter.DecoratorParams, ...propertyDecorators: PropertyDecorator[]): PropertyDecorator {
        params ??= {};

        /** @PropertyDecorator */
        return function (target: any, propertyKey: string | symbol) {
            if (!params!.unmanaged) {
                // Ensure that we create a OnDestroy EventSource on the target for managing subscriptions
                EventSource({ eventType: AngularLifecycleType.OnDestroy })(target, CommonMetadata.MANAGED_ONDESTROY_KEY);
            }

            // If a propertyName wasn't specified...
            if (!params!.propertyName) {
                // Try to deduce the propertyName from the propertyKey
                if (typeof propertyKey === "string" && propertyKey.endsWith("$")) {
                    params!.propertyName = propertyKey.substring(0, propertyKey.length - 1);
                }
                else {
                    throw new Error(`@StateEmitter error: propertyName could not be deduced from propertyKey "${propertyKey as any}" (only keys ending with '$' can be auto-deduced).`);
                }
            }
            
            // If a proxy mode was set but an empty proxy path was set, default to a self proxy
            if (params!.proxyMode && typeof params!.proxyPath === "string" && params!.proxyPath.length === 0) {
                params!.proxyPath = propertyKey as string;
            }

            // Default merging of updated values in proxy aliases to true
            if (LangUtils.isNil(params!.proxyMergeUpdates)) {
                params!.proxyMergeUpdates = true;
            }

            // Apply any property decorators to the property
            propertyDecorators.forEach(propertyDecorator => propertyDecorator(target, params!.propertyName!));

            // Create the state emitter metadata for the decorated property
            createMetadata(target, params!.propertyName, Object.assign({ propertyKey, observable: undefined! }, params));
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
            proxyMergeUpdates: $params.mergeUpdates,
            readOnly: $params.readOnly,
            writeOnly: $params.writeOnly,
            unmanaged: $params.unmanaged
        }, ...propertyDecorators);
    }

    /** @PropertyDecoratorFactory */
    export function From(params: ProxyDecoratorParams | string, ...propertyDecorators: PropertyDecorator[]): PropertyDecorator {
        let $params = _ResolveProxyDecoratorParams(params);

        return StateEmitter.WithParams({
            propertyName: $params.propertyName,
            proxyMode: EmitterMetadata.ProxyMode.From,
            proxyPath: $params.path,
            proxyMergeUpdates: $params.mergeUpdates,
            readOnly: $params.readOnly,
            writeOnly: $params.writeOnly,
            unmanaged: $params.unmanaged
        }, ...propertyDecorators);
    }

    /** @PropertyDecoratorFactory */
    export function Merge(params: ProxyDecoratorParams | string, ...propertyDecorators: PropertyDecorator[]): PropertyDecorator {
        let $params = _ResolveProxyDecoratorParams(params);

        return StateEmitter.WithParams({
            propertyName: $params.propertyName,
            proxyMode: EmitterMetadata.ProxyMode.Merge,
            proxyPath: $params.path,
            proxyMergeUpdates: $params.mergeUpdates,
            readOnly: $params.readOnly,
            writeOnly: $params.writeOnly,
            unmanaged: $params.unmanaged
        }, ...propertyDecorators);
    }

    /** @PropertyDecoratorFactory */
    export function AliasSelf(params?: SelfProxyDecoratorParams, ...propertyDecorators: PropertyDecorator[]): PropertyDecorator {
        const $params = Object.assign(params || {}, { path: "" });

        return StateEmitter.Alias($params, ...propertyDecorators);
    }

    /** @PropertyDecoratorFactory */
    export function FromSelf(params?: SelfProxyDecoratorParams, ...propertyDecorators: PropertyDecorator[]): PropertyDecorator {
        const $params = Object.assign(params || {}, { path: "" });

        return StateEmitter.From($params, ...propertyDecorators);
    }

    /** @PropertyDecoratorFactory */
    export function MergeSelf(params?: SelfProxyDecoratorParams, ...propertyDecorators: PropertyDecorator[]): PropertyDecorator {
        const $params = Object.assign(params || {}, { path: "" });

        return StateEmitter.Merge($params, ...propertyDecorators);
    }

    namespace Facade {

        export function CreateSetter(type: EmitterType, getter: () => any): (value: any) => void {
            let firstInvocation = true;

            return function (this: any, value: any) {
                let subjectInfo = EmitterMetadata.GetMetadataMap(this).get(type)!;

                // Invoke the getter to make sure change detection has been started
                if (firstInvocation && !subjectInfo.writeOnly) {
                    firstInvocation = false;
                    getter.call(this);
                }

                // If this is a static subject...
                if (EmitterMetadata.SubjectInfo.IsStaticAlias(subjectInfo)) {
                    // Notify the subject of the new value
                    subjectInfo.observable.next(value);
                }
                else {
                    try {
                        // Update the dynamic proxy value
                        ObservableUtil.UpdateDynamicPropertyPathValue(this, subjectInfo.proxyPath!, value, subjectInfo.proxyMergeUpdates);
                    }
                    catch (_e) {
                        console.error(`Unable to set value for proxy StateEmitter "${this.constructor.name}.${type}" with dynamic property path "${subjectInfo.proxyPath}" - Path does not contain a Subject.`);
                    }
                }

                // Let the getter caching mechanism detect changes for us
            };
        }

        export function CreateGetter(type: EmitterType, initialValue?: any): () => any {
            let lastValue: any = initialValue;
            let subscription: Subscription;
            let lastObservable: Observable<any>;

            return function (this: any): any {
                let subjectInfo = EmitterMetadata.GetMetadataMap(this).get(type)!;
                let curObservable = subjectInfo.observable;

                // If the resolved observable has changed since last time the getter was called (or this is the first getter call)...
                if (lastObservable !== curObservable) {

                    // Remove the previos subscription
                    if (subscription) {
                        subscription.unsubscribe();
                    }

                    // When a new value is emitted from the StateEmitter...
                    subscription = curObservable.pipe(
                        // Look for unique changes
                        filter(value => value !== lastValue),
                        // Update the cached value
                        tap((value: any) => lastValue = value)
                    ).subscribe(() => {
                        // If the getter wasn't just called (in case of a Behavior/Replay subject)...
                        if (lastObservable === curObservable && !CommonMetadata.instanceIsDestroyed(this)) {
                            // Notify the component of changes if AutoPush is enabled
                            AutoPush.notifyChanges(this);
                        }
                    });

                    lastObservable = curObservable;
                }

                if (curObservable instanceof BehaviorSubject) {
                    lastValue = curObservable.value;
                }

                // Return the last value that was emitted
                return lastValue;
            };
        }
    }

    function bootstrapInstance(this: any, initialPropertyDescriptor: PropertyDescriptor | undefined, emitterType: EmitterType) {
        const targetInstance: any = this;

        function classMetadataMerged(merged?: boolean): boolean | undefined {
            if (merged === undefined) {
                return !!Metadata.getMetadata(EmitterMetadata.BOOTSTRAPPED_KEY, targetInstance);
            } else {
                Metadata.setMetadata(EmitterMetadata.BOOTSTRAPPED_KEY, targetInstance, merged);
            }
            return undefined;
        }

        function defineProxyObservableGetter(subjectInfo: EmitterMetadata.SubjectInfo, alwaysResolvePath?: boolean, onResolve?: (proxySubscribable: Observable<any>) => Observable<any> | void) {
            let observable: Observable<any>;

            // Create a getter that resolves the observable from the target proxy path
            Object.defineProperty(subjectInfo, "observable", { get: (): Observable<any> => {
                if (alwaysResolvePath || !observable) {
                    // Get the proxy observable
                    if (EmitterMetadata.SubjectInfo.IsSelfProxy(subjectInfo)) {
                        observable = initialPropertyValue;
                    } else {
                        observable = ObservableUtil.ResolvePropertyPath(targetInstance, subjectInfo.proxyPath!);
                    }

                    if (onResolve) {
                        observable = onResolve(observable) || observable;
                    }
                }

                return observable;
            }});
        }

        function makeEmitterSubject(): BehaviorSubject<any> {
            return subjectInfo.unmanaged
                ? new BehaviorSubject<any>(initialValue)
                : new ManagedBehaviorSubject<any>(targetInstance, initialValue);
        }

        const metadataMap = EmitterMetadata.GetOwnMetadataMap(targetInstance);

        if (!classMetadataMerged()) {
            // Copy all emitter metadata from the class constructor to the target instance
            EmitterMetadata.CopyMetadata(metadataMap, EmitterMetadata.CopyInherittedMetadata(targetInstance.constructor), true);
            classMetadataMerged(true);
        }

        const subjectInfo = metadataMap.get(emitterType)!;
        const initialValue = resolveInitialValue.call(targetInstance, subjectInfo);
        // Get the initial value of the property being decorated
        const initialPropertyValue: any = initialPropertyDescriptor ? (initialPropertyDescriptor.value || initialPropertyDescriptor.get?.()) : undefined;

        // Check if there's a value set for the property and it's an Observable
        if (initialPropertyValue && initialPropertyValue instanceof Observable) {
            // Only allow no proxying or explicit self-proxying with initial values
            // If no explictit self-proxy mode is set, default the StateEmitter to a self-proxying alias by default
            if (!subjectInfo.proxyMode || subjectInfo.proxyMode === EmitterMetadata.ProxyMode.None) {
                // Setup a self-proxying alias that will reference the initial value
                subjectInfo.proxyMode = EmitterMetadata.ProxyMode.Alias;
                subjectInfo.proxyPath = subjectInfo.propertyKey as string;
            } else if (!EmitterMetadata.SubjectInfo.IsSelfProxy(subjectInfo)) {
                throw new Error(`[${targetInstance.constructor.name}]: Unable to create a StateEmitter on property "${subjectInfo.propertyKey as any}": property cannot have a pre-defined observable when declaring a proxying StateEmitter.`);
            }
        } else if (EmitterMetadata.SubjectInfo.IsSelfProxy(subjectInfo)) {
            throw new Error(`[${targetInstance.constructor.name}]: Unable to create a StateEmitter on property "${subjectInfo.propertyKey as any}": StateEmitter is self-proxying, but lacks a valid target.`);
        } else if (initialPropertyValue) {
            console.warn(`Warning: Definition of StateEmitter for ${targetInstance.constructor.name}.${subjectInfo.propertyKey as any} is overriding previous value for '${subjectInfo.propertyKey as any}'.`);
        }
        
        // Check the proxy mode for targetInstance subject
        switch (subjectInfo.proxyMode) {
            // Aliased emitters simply pass directly through to their source value
            case EmitterMetadata.ProxyMode.Alias: {
                defineProxyObservableGetter(subjectInfo, true);
                break;
            }

            // Merge proxies create a new subject that receives all emissions from the source
            // From proxies create a new subject that takes only its initial value from the source
            case EmitterMetadata.ProxyMode.Merge:
            case EmitterMetadata.ProxyMode.From: {
                // Create a new subject to proxy the source
                const subject = makeEmitterSubject();

                // Create a getter that returns the new subject
                defineProxyObservableGetter(subjectInfo, false, (proxyObservable: Observable<any>) => {
                    // Only take the first value if targetInstance is a From proxy
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
                subjectInfo.observable = makeEmitterSubject();
                break;
            }
        }

        const facadeGetter = Facade.CreateGetter(emitterType, initialValue);
        const facadeSetter = subjectInfo.readOnly ? undefined : Facade.CreateSetter(emitterType, facadeGetter);
        // Assign the facade getter and setter to the target instance for targetInstance EmitterType
        Object.defineProperty(targetInstance, emitterType, {
            enumerable: true,
            get: subjectInfo.writeOnly ? undefined : facadeGetter,
            set: facadeSetter
        });

        // Define the StateEmitter reference
        Object.defineProperty(targetInstance, subjectInfo.propertyKey, {
            // Create a getter that lazily retreives the observable
            get: () => {
                // Invoke the getter to start change detection of the value if this is a write-only property
                // Note: This is called each time in case a dynamic proxy path is changed
                if (subjectInfo.writeOnly) {
                    facadeGetter.call(targetInstance);
                }

                return subjectInfo.observable;
            },
            // Allow updates to the subject via the setter of the StateEmitter property itself
            // (This is needed to allow StateEmitters to work with Angular property decorators like @ViewChild)
            // TODO - Figure out a better way to do this with Ivy
            set: facadeSetter
        });
    }

    function createMetadata(target: any, type: EmitterType, metadata: EmitterMetadata.SubjectInfo) {
        const initialPropertyDescriptor = Object.getOwnPropertyDescriptor(target, metadata.propertyKey);

        if (target[type]) {
            // Make sure the target class doesn't have a custom property already defined for this event type
            throw new Error(`@StateEmitter metadata creation failed. Class already has a custom '${type}' property.`);
        }

        // Add the propertyKey to the class' metadata
        EmitterMetadata.GetOwnMetadataMap(target.constructor).set(type, metadata);

        // Initialize the target property to a self-bootstrapper that will initialize the instance's StateEmitter when called
        Object.defineProperty(target, metadata.propertyKey, {
            configurable: true,
            get: function () {
                bootstrapInstance.bind(this)(initialPropertyDescriptor, type);
                return this[metadata.propertyKey];
            },
            // Allow updates to the subject via the setter of the StateEmitter property itself
            // (This is needed to allow StateEmitters to work with Angular property decorators like @ViewChild)
            // TODO - Figure out a better way to do this with Ivy
            set: function(value: any) {
                bootstrapInstance.bind(this)(initialPropertyDescriptor, type);
                this[type] = value;
            }
        });

        // Initialize the facade property to a self-bootstrapper that will initialize the instance's StateEmitter when called
        Object.defineProperty(target, type, {
            configurable: true,
            get: function () {
                bootstrapInstance.bind(this)(initialPropertyDescriptor, type);
                return this[type];
            },
            set: function(value: any) {
                bootstrapInstance.bind(this)(initialPropertyDescriptor, type);
                this[type] = value;
            }
        });
    }

    function resolveInitialValue(this: any, subjectInfo: EmitterMetadata.SubjectInfo): any {
        if (subjectInfo.initialValue !== undefined && !LangUtils.isNil(subjectInfo.initial)) {
            throw new Error("[StateEmitter]: Both initialValue and initial cannot be defined on the same property.");
        } else if (subjectInfo.initial) {
            return subjectInfo.initial.call(this);
        } else {
            return subjectInfo.initialValue;
        }
    }
}