import type { Constructable, IfEquals, IfReadonly, StringKey } from "./lang-utils";
import type { AsyncSourceKey } from "./metadata";
import { FactoryProvider, InjectFlags, Injector, resolveForwardRef, Type } from "@angular/core";
import { combineLatest, forkJoin, from, merge, Observable, of, ReplaySubject, Subject, Subscription, throwError } from "rxjs";
import { distinctUntilChanged, filter, map, mergeMap, skip, switchMap, tap } from "rxjs/operators";
import { AutoPush } from "./autopush";
import { ManagedBehaviorSubject, ManagedObservable, ManagedReplaySubject } from "./managed-observable";
import { EventSource } from "./event-source";
import { AngularLifecycleType } from "./lifecycle-event";
import { ComponentStateMetadata, CommonMetadata, asyncStateKey } from "./metadata";

const COMPONENT_STATE_IDENTITY = Symbol("COMPONENT_STATE_IDENTITY");

export type ComponentState<ComponentT> = ComponentState.Of<ComponentT>;

export class ComponentStateRef<ComponentT> extends Promise<ComponentState<ComponentT>> {

    public componentInstance!: ComponentT;

    public state(): Observable<ComponentState<ComponentT>> {
        return from(this);
    }

    public get<K extends StringKey<ComponentT>>(
        stateProp: ComponentState.ReadableKey<ComponentT, K>
    ): Observable<ComponentT[K]> {
        const stateKey = ComponentState.stateKey<ComponentT, K>(stateProp);
        const resolvedSource$ = this.resolvedState?.[stateKey];

        if (resolvedSource$) {
            return resolvedSource$ as unknown as Observable<ComponentT[K]>;
        } else {
            return this.state().pipe(
                mergeMap((state: ComponentState<ComponentT>) => {
                    if (!state[stateKey]) {
                        return throwError(
`[ComponentStateRef] Failed to get state for component property "${stateProp}". Ensure that this property is explicitly initialized (or declare it with @DeclareState()).`
                        );
                    }
    
                    return state[stateKey];
                })
            ) as Observable<ComponentT[K]>;
        }
    }

    public getAll<
        K extends Array<ComponentState.ReadableKey<ComponentT, StringKey<ComponentT>>>
    >(...stateProps: K): ComponentState.StateSelector<ComponentT, K> {
        return stateProps.map(stateProp => this.get(stateProp)) as ComponentState.StateSelector<ComponentT, K>;
    }

    public set<K extends StringKey<ComponentT>, V extends ComponentT[K]>(
        stateProp: ComponentState.WritableKey<ComponentT, K>,
        value: V
    ): Observable<void> {
        const stateKey = ComponentState.stateKey<ComponentT, K>(stateProp);
        const result$ = new ReplaySubject<void>(1);
        const resolvedSource$ = this.resolvedState?.[stateKey] as unknown as Subject<V>;

        if (resolvedSource$) {
            resolvedSource$.next(value);
            result$.next();
            result$.complete();
        } else {
            this.state().pipe(
                map((state) => {
                    const stateSubject$ = state[ComponentState.stateKey<ComponentT, K>(stateProp)] as any as Subject<V>;
    
                    if (!stateSubject$) {
                        throw new Error(
`[ComponentStateRef] Failed to set state for component property "${stateProp}". Ensure that this property is explicitly initialized (or declare it with @DeclareState()).`
                        );
                    }

                    return stateSubject$;
                })
            ).subscribe((stateSubject$) => {
                stateSubject$.next(value);
                result$.next();
                result$.complete();
            }, (e) => {
                result$.error(e);
                result$.complete();
            }, () => result$.complete());
        }

        return result$;
    }

    public subscribeTo<K extends StringKey<ComponentT>, V extends ComponentT[K]>(
        stateProp: ComponentState.WritableKey<ComponentT, K>,
        source$: Observable<V>,
        managed: boolean = true
    ): Subscription {
        let managedSource$: Observable<V>;
        if (managed) {
            managedSource$ = this.state().pipe(
                mergeMap(() => _createManagedSource<ComponentT, V, Observable<V>>(source$, this.componentInstance))
            );
        } else {
            managedSource$ = source$;
        }

        return managedSource$.pipe(
            tap(sourceValue => this.set<K, V>(stateProp, sourceValue))
        ).subscribe();
    }

    /**
     * @description Synchronizes the state of `statePropA` and `statePropB` such that any changes from `statePropA` will be propagated to `statePropB`
     * and vice versa. The initial state value of `statePropA` is used.
     * @param statePropA - A writable state property.
     * @param statePropB - A writable state property.
     */
    public sync<
        K1 extends StringKey<ComponentT>,
        K2 extends StringKey<ComponentT>,
        V extends IfEquals<ComponentT[K1], ComponentT[K2]> extends true ? ComponentT[K1] & ComponentT[K2] : never
    >(
        statePropA: V extends never ? never : ComponentState.WritableKey<ComponentT, K1>,
        statePropB: V extends never ? never : ComponentState.WritableKey<ComponentT, K2>
    ): void {
        let syncing = false;
        
        merge(this.get(statePropB), this.get(statePropA)).pipe(
            skip(1),
            distinctUntilChanged(),
            filter(() => !syncing),
            tap(() => syncing = true),
            mergeMap((value) => combineLatest([
                this.set<K1, V>(statePropA, value as V),
                this.set<K2, V>(statePropB, value as V)
            ])),
            tap(() => syncing = false)
        ).subscribe();
    }

    /**
     * @description Synchronizes the state of `stateProp` and `source$` such that any changes from `stateProp` will be propagated to `source$` and
     * vice versa. The initial state value of `source$` is used.
     * @param stateProp - A writable state property.
     * @param source$ - A Subject to synchronize with.
     */
    public syncWith<K extends StringKey<ComponentT>>(
        stateProp: ComponentState.WritableKey<ComponentT, K>,
        source$: Subject<ComponentT[K]>
    ): void;

    public syncWith<
        ComponentT2,
        K1 extends StringKey<ComponentT>,
        K2 extends StringKey<ComponentT2>,
        V extends IfEquals<ComponentT[K1], ComponentT2[K2]> extends true ? ComponentT[K1] & ComponentT2[K2] : never
    >(
        stateProp: V extends never ? never : ComponentState.WritableKey<ComponentT, K1>,
        sourceState: ComponentStateRef<ComponentT2>,
        sourceProp: V extends never ? never : ComponentState.WritableKey<ComponentT2, K2>
    ): void;
    
    public syncWith<
        ComponentT2,
        K1 extends StringKey<ComponentT>,
        K2 extends StringKey<ComponentT2>,
    >(
        stateProp: ComponentState.WritableKey<ComponentT, K1>,
        source: Subject<ComponentT[K1]> | ComponentStateRef<ComponentT2>,
        sourceProp?: ComponentState.WritableKey<ComponentT2, K2>
    ): void {
        let syncing = false;
        
        this.state().pipe(
            switchMap(() => merge(
                this.get(stateProp).pipe(skip(1)),
                source instanceof Subject
                    ? _createManagedSource(source, this.componentInstance)
                    : source.get(sourceProp!)
            )),
            distinctUntilChanged(),
            filter(() => !syncing),
            tap(() => syncing = true),
            mergeMap((value) => {
                return forkJoin([
                    source instanceof Subject
                        ? of(source!.next(value as ComponentT[K1]))
                        : source.set<K2, ComponentT2[K2]>(sourceProp!, value as ComponentT2[K2]),
                    this.set(stateProp, value as ComponentT[K1])
                ]);
            }),
            tap(() => syncing = false)
        ).subscribe();
    }

    private get resolvedState(): ComponentState<ComponentT> | undefined {
        return (this.componentInstance as any)?.[COMPONENT_STATE_IDENTITY];
    }
}

export namespace ComponentState {

    export interface CreateOptions {
        lazy?: boolean;
    }

    export type ReactiveStateKey<ComponentT, K extends keyof ComponentT = keyof ComponentT> =
        K extends string ? AsyncSourceKey<ComponentT, K> : never;

    type QualifiedStateKey<ComponentT, K extends keyof ComponentT = keyof ComponentT> =
        K extends `${infer _K}$` ? never : K;

    export type StateKey<ComponentT> = keyof {
        [K in keyof ComponentT as QualifiedStateKey<ComponentT, K>]: never
    };

    export type Of<ComponentT> = {
        readonly [K in keyof ComponentT as ReactiveStateKey<ComponentT, QualifiedStateKey<ComponentT, K>>]-?:
            IfReadonly<ComponentT, K> extends true ? Observable<ComponentT[K]> : Subject<ComponentT[K]>;
    };

    export type ReadableKey<ComponentT, K extends keyof ComponentT = keyof ComponentT> =
        K extends StateKey<ComponentT> ? K : never;

    export type WritableKey<ComponentT, K extends keyof ComponentT = keyof ComponentT> =
        IfReadonly<ComponentT, K> extends true ? never : ReadableKey<ComponentT, K>;

    export type StateSelector<ComponentT, K extends Array<ReadableKey<ComponentT>>> = 
        { [I in keyof K]: K[I] extends ReadableKey<ComponentT> ? Observable<ComponentT[K[I]]> : never };

    type StateRecord<ComponentT, K extends keyof ComponentT = keyof ComponentT> = Record<ReactiveStateKey<ComponentT, K>, Observable<ComponentT[K]>>;

    type ComponentClassProvider<ComponentT> = Type<ComponentT> | Type<unknown>;

    export function create<ComponentT>(
        $class: ComponentClassProvider<ComponentT>,
        options?: CreateOptions
    ): FactoryProvider {
        return {
            provide: ComponentStateRef,
            useFactory: createFactory<ComponentT>($class, options),
            deps: [Injector]
        };
    }

    export function createFactory<ComponentT>(
        $class: ComponentClassProvider<ComponentT>,
        options?: CreateOptions
    ): (injector: Injector) => ComponentStateRef<ComponentT> {
        options ??= {
            lazy: isForwardRef($class)
        };

        if (!options!.lazy) {
            if (isForwardRef($class)) {
                throw new Error("[ComponentState] A component state created with forwardRef must be created with the `lazy` flag.");
            }

            const resolvedClass = resolveClass<ComponentT>($class);

            // Generate initial component state on ngOnInit
            updateStateOnEvent(resolvedClass, AngularLifecycleType.OnInit);

            // Update the component state on afterViewInit and afterContentInit to capture dynamically initialized properties
            updateStateOnEvent(resolvedClass, AngularLifecycleType.AfterContentInit);
            updateStateOnEvent(resolvedClass, AngularLifecycleType.AfterViewInit);
        }
        
        return function (injector: Injector): ComponentStateRef<ComponentT> {
            const stateRef = new ComponentStateRef<ComponentT>((resolve) => {
                const resolvedClass = resolveClass<ComponentT>($class);
                const delayedInitializer = setTimeout(() => {
                    // If the stateRef has not been initialized by the end of the current execution frame (e.g. the service was 
                    // injected after component's lifecycle events were invoked), we need to resolve it now.

                    const instance: any = injector.get(resolvedClass);
                    stateRef.componentInstance = instance;

                    updateState(_requireComponentState(instance), instance);

                    // Resolve the component state
                    resolve(instance[COMPONENT_STATE_IDENTITY]);
                });

                if (options!.lazy) {                
                    // Generate initial component state on ngOnInit
                    updateStateOnEvent(resolvedClass, AngularLifecycleType.OnInit, injector, (instance) => {
                        clearTimeout(delayedInitializer);

                        stateRef.componentInstance = instance;
                    });

                    // Update the component state on afterViewInit and afterContentInit to capture dynamically initialized properties
                    updateStateOnEvent(resolvedClass, AngularLifecycleType.AfterContentInit, injector);
                    updateStateOnEvent(resolvedClass, AngularLifecycleType.AfterViewInit, injector, (instance) => {
                        clearTimeout(delayedInitializer);

                        // Resolve the component state
                        resolve(instance[COMPONENT_STATE_IDENTITY]);
                    });
                } else {
                    updateOnEvent(resolvedClass, AngularLifecycleType.OnInit, (instance: any) => {
                        clearTimeout(delayedInitializer);

                        stateRef.componentInstance = instance;
                    }, injector);

                    updateOnEvent(resolvedClass, AngularLifecycleType.AfterViewInit, (instance: any) => {
                        clearTimeout(delayedInitializer);

                        // Resolve the component state
                        resolve(instance[COMPONENT_STATE_IDENTITY]);
                    }, injector);
                }
            });

            return stateRef;
        }
    }

    export function tokenFor(provider: FactoryProvider): any {
        return provider.provide;
    }

    export function stateKey<ComponentT, K extends StringKey<ComponentT> = StringKey<ComponentT>>(
        key: K
    ): ReactiveStateKey<ComponentT, K> & keyof Of<ComponentT> {
        return asyncStateKey<ComponentT, K>(key) as any;
    }

    function updateStateOnEvent<ComponentT>(
        $class: Type<ComponentT>,
        event: AngularLifecycleType,
        injector?: Injector,
        onComplete?: (instance: any) => void
    ): void {
        updateOnEvent($class, event, (instance: any) => {
            updateState(_requireComponentState(instance), instance);

            if (onComplete) {
                onComplete(instance);
            }
        }, injector);
    }

    function updateOnEvent<ComponentT>(
        $class: Type<ComponentT>,
        event: AngularLifecycleType,
        onUpdate: (instance: any) => void,
        injector?: Injector
    ): void {
        onEvent($class, event, function onEventFn(this: ThisType<any>) {
            const instance: any = injector ? injector.get($class, null, InjectFlags.Self) : this;

            if (instance === this) {
                onUpdate(instance);

                // Only de-register instance-specific event handlers
                if (injector) {
                    offEvent($class, event, onEventFn);
                }
            }
        });
    }

    function onEvent<ComponentT>(
        $class: Type<ComponentT>,
        event: AngularLifecycleType,
        callback: () => void
    ): void {
        // Ensure that we create a OnDestroy EventSource on the target for managing subscriptions
        EventSource({ eventType: AngularLifecycleType.OnDestroy })($class.prototype, CommonMetadata.MANAGED_ONDESTROY_KEY);

        // Register a lifecycle event listener for the given event
        EventSource.registerLifecycleEvent($class, event, callback);
    }

    function offEvent<ComponentT>(
        $class: Type<ComponentT>,
        event: AngularLifecycleType,
        callback: () => void
    ): void {
        EventSource.unregisterLifecycleEvent($class, event, callback);
    }

    function updateState<ComponentT extends Constructable<any, any>>(
        componentState: Partial<StateRecord<ComponentT>>,
        instance: ComponentT
    ): Partial<StateRecord<ComponentT>> {
        const instanceProps = getAllAccessibleKeys<ComponentT>(instance);

        // Create a managed reactive state wrapper for each component property
        instanceProps.forEach((prop) => {
            // Only update an entry if it hasn't yet been defined
            if (!componentState[ComponentState.stateKey<ComponentT>(prop.key)]) {
                updateStateForProperty(
                    componentState,
                    instance,
                    prop
                );
            }
        });

        return componentState;
    }

    function updateStateForProperty<ComponentT extends Constructable<any, any>, K extends StringKey<ComponentT>>(
        componentState: Partial<StateRecord<ComponentT>>,
        instance: ComponentT,
        prop: ComponentStateMetadata.ManagedProperty<ComponentT, K>
    ): Partial<StateRecord<ComponentT>> {
        const propDescriptor = Object.getOwnPropertyDescriptor(instance, prop.key);
        const stateSubjectProp = stateKey<ComponentT, K>(prop.key);

        if (typeof prop.key === "string" && !prop.key.endsWith("$")) {

            if (!propDescriptor || propDescriptor.configurable) {
                let lastValue: ComponentT[K] = instance[prop.key];
                const propSubject$ = new ManagedBehaviorSubject<ComponentT[K]>(instance, lastValue);

                function manageProperty<_K extends StringKey<ComponentT>>(
                    instance: ComponentT,
                    property: _K,
                    enumerable: boolean
                ): PropertyDescriptor {
                    const stateProp = stateKey<ComponentT, _K>(property);
                    componentState[stateProp] = propSubject$;

                    // Override the instance property with a getter/setter that synchronizes with `propSubject$`
                    return Object.defineProperty(instance, property, {
                        configurable: true,
                        enumerable: enumerable,
                        get: () => lastValue,
                        set: isReadonlyProperty(instance, property) ? undefined : (newValue: ComponentT[K]): void => propSubject$.next(newValue)
                    });
                }

                // Monitor the property subject for value changes
                propSubject$.pipe(skip(1)).subscribe(value => {
                    // Update the cached value
                    lastValue = value;

                    // Notify the component of changes if AutoPush is enabled
                    AutoPush.notifyChanges(instance);
                });

                if (prop.asyncSource) {
                    const reactiveSource$ = instance[prop.asyncSource];

                    // If the property has a valid async source, create a managed subscription to it
                    if (reactiveSource$ && reactiveSource$ instanceof Observable) {
                        _createManagedSource(reactiveSource$, instance)
                            .subscribe((value: any) => propSubject$.next(value));
                    }
                }

                // Set up the property wrapper that exposes the backing subject
                try {
                    manageProperty(instance, prop.key, !propDescriptor || !!propDescriptor.enumerable);

                    // If a separate publicKey was defined, also map it to the backing subject
                    if (prop.publicKey && prop.publicKey !== prop.key) {
                        manageProperty(instance, prop.publicKey, true);
                    }
                } catch (e) {
                    console.error(`Failed to create state Subject for property ${instance.constructor.name}.${prop.key}`, e);
                }
            } else {
                if (!propDescriptor.configurable && !isReadonlyProperty(instance, prop.key)) {
                    console.warn(`[ComponentState] Property "${instance.constructor.name}.${prop.key}" is not configurable and will be treated as readonly.`);
                }

                // Property is readonly, so just use an Observable that emits the underlying state on subscription
                componentState[stateSubjectProp] = new ManagedObservable(instance, observer => {
                    observer.next(propDescriptor.get ? propDescriptor.get() : propDescriptor.value);
                });
            }
        }

        return componentState;
    }

    function isReadonlyProperty<T, K extends keyof T>(instance: T, key: K): boolean {
        const publicPropDescriptor = Object.getOwnPropertyDescriptor(instance, key);
        return !!publicPropDescriptor && !publicPropDescriptor.writable && !publicPropDescriptor.set;
    }

    function isForwardRef($class: Type<any>): boolean {
        return !$class.name;
    }

    function resolveClass<ComponentT>($class: Type<any>): Type<ComponentT> {
        return resolveForwardRef<Type<ComponentT>>($class);
    }

    function getAllAccessibleKeys<T extends Record<string, any> & Constructable<any, any>>(instance: T): ComponentStateMetadata.ManagedPropertyList<T> {
        // Ensure managed keys are processed first
        return getManagedKeys(instance).concat(getPublicKeys(instance));
    }

    function getPublicKeys<T>(instance: T): ComponentStateMetadata.ManagedPropertyList<T> {
        return (Object.keys(instance) as Array<StringKey<T>>).map(key => ({ key }));
    }

    function getManagedKeys<T extends Constructable<any, any>>(instance: T): ComponentStateMetadata.ManagedPropertyList<T> {
        return ComponentStateMetadata.GetInheritedManagedPropertyList<T>(instance.constructor);
    }
}

export function _requireComponentState<T extends { [COMPONENT_STATE_IDENTITY]?: Partial<ComponentState<T>> } & Record<any, any>>(
    instance: T,
    initValue: Partial<ComponentState<T>> = {}
): Partial<ComponentState<T>> {
    instance[COMPONENT_STATE_IDENTITY] ??= initValue;
    return instance[COMPONENT_STATE_IDENTITY]!;
}

function _createManagedSource<ComponentT, T, S$ extends Observable<T>>(source$: S$, instance: ComponentT): Subject<T> {
    const managedSource$ = new ManagedReplaySubject<T>(instance, 1);
    source$.subscribe(managedSource$);
    return managedSource$;
}
