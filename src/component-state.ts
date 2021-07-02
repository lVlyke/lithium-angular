import type { IfEquals, IfReadonly, StringKey } from "./lang-utils";
import type { AsyncSourceKey } from "./metadata";
import { FactoryProvider, InjectFlags, Injector, resolveForwardRef, Type } from "@angular/core";
import { from, Observable, ReplaySubject, Subject, Subscription, throwError } from "rxjs";
import { distinctUntilChanged, mergeMap, skip, take, tap } from "rxjs/operators";
import { AutoPush } from "./autopush";
import { ManagedBehaviorSubject, ManagedObservable } from "./managed-observable";
import { EventSource } from "./event-source";
import { AngularLifecycleType } from "./lifecycle-event";
import { ComponentStateMetadata, CommonMetadata, asyncStateKey } from "./metadata";

const COMPONENT_IDENTITY = Symbol("COMPONENT_IDENTITY");

type ComponentStateWithIdentity<ComponentT> = ComponentState<ComponentT> & { [COMPONENT_IDENTITY]: ComponentT };

export type ComponentState<ComponentT> = ComponentState.Of<ComponentT>;

export class ComponentStateRef<ComponentT> extends Promise<ComponentStateWithIdentity<ComponentT>> {

    public _pendingState: Partial<ComponentState<ComponentT>> = {};

    public state(): Observable<ComponentState<ComponentT>> {
        return from(this);
    }

    public get<K extends StringKey<ComponentT>>(
        stateProp: ComponentState.ReadableKey<ComponentT, K>
    ): Observable<ComponentT[K]> {
        const stateKey = ComponentState.stateKey<ComponentT, K>(stateProp);
        const pendingSource$ = this._pendingState[stateKey] as unknown as Observable<ComponentT[K]>;

        if (pendingSource$) {
            return pendingSource$;
        }
        
        return from(this).pipe(
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

    public getAll<
        K extends Array<ComponentState.ReadableKey<ComponentT, StringKey<ComponentT>>>
    >(...stateProps: K): ComponentState.StateSelector<ComponentT, K> {
        return stateProps.map(stateProp => this.get(stateProp)) as ComponentState.StateSelector<ComponentT, K>;
    }

    public set<K extends StringKey<ComponentT>>(
        stateProp: ComponentState.WritableKey<ComponentT, K>,
        value: ComponentT[K]
    ): Observable<void> {
        const stateKey = ComponentState.stateKey<ComponentT, K>(stateProp);
        const result$ = new ReplaySubject<void>(1);
        const pendingSource$ = this._pendingState[stateKey] as unknown as Subject<ComponentT[K]>;

        if (pendingSource$) {
            pendingSource$.next(value);
            result$.next();
            result$.complete();
        } else {
            from(this).subscribe((state: ComponentState<ComponentT>) => {
                const stateSubject$ = state[ComponentState.stateKey<ComponentT, K>(stateProp)] as any as Subject<ComponentT[K]>;
    
                if (!stateSubject$) {
                    throw new Error(
    `[ComponentStateRef] Failed to set state for component property "${stateProp}". Ensure that this property is explicitly initialized (or declare it with @DeclareState()).`
                    );
                }
    
                stateSubject$.next(value);
                result$.next();
                result$.complete();
            });
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
            managedSource$ = from(this).pipe(
                mergeMap(state => {
                    const managedSource$ = new ManagedBehaviorSubject<V>(state[COMPONENT_IDENTITY], undefined);
                    source$.subscribe(managedSource$);
                    return managedSource$;
                })
            );
        } else {
            managedSource$ = source$;
        }

        return managedSource$.pipe(
            tap(sourceValue => this.set<K>(stateProp, sourceValue))
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
        this.subscribeTo<K2, V>(statePropB, this.get<K1>(statePropA).pipe(distinctUntilChanged()) as Observable<V>, false);
        this.subscribeTo<K1, V>(statePropA, this.get<K2>(statePropB).pipe(distinctUntilChanged()) as Observable<V>, false);
    }
}

export namespace ComponentState {

    export type ReactiveStateKey<ComponentT, K extends keyof ComponentT = keyof ComponentT> =
        K extends string ? AsyncSourceKey<ComponentT, K> : never;

    type QualifiedStateKey<ComponentT, K extends keyof ComponentT = keyof ComponentT> =
        K extends `${infer _K}$` ? (ComponentT[K] extends Observable<unknown> ? never : K) : K;

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

    export function create<ComponentT>($class: ComponentClassProvider<ComponentT>): FactoryProvider {
        return {
            provide: ComponentStateRef,
            useFactory: createFactory<ComponentT>($class),
            deps: [Injector]
        };
    }

    export function createFactory<ComponentT>($class: ComponentClassProvider<ComponentT>): (injector: Injector) => ComponentStateRef<ComponentT> {
        return function (injector: Injector): ComponentStateRef<ComponentT> {
            const resolvedClass = resolveClass<ComponentT>($class);

            // Ensure that we create a OnDestroy EventSource on the target for managing subscriptions
            EventSource({ eventType: AngularLifecycleType.OnDestroy })(resolvedClass.prototype, CommonMetadata.MANAGED_ONDESTROY_KEY);

            const stateRef = new ComponentStateRef<ComponentT>((resolve) => {
                const stateSelector = () => stateRef;
                
                // Generate initial component state on ngOnInit
                updateStateOnEvent(resolvedClass, injector, AngularLifecycleType.OnInit, stateSelector);

                // Update the component state on afterViewInit and afterContentInit to capture dynamically initialized properties
                updateStateOnEvent(resolvedClass, injector, AngularLifecycleType.AfterContentInit, stateSelector);
                updateStateOnEvent(resolvedClass, injector, AngularLifecycleType.AfterViewInit, stateSelector, (state) => {
                    // Resolve the finalized state
                    resolve(state);
                });
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
        injector: Injector,
        event: AngularLifecycleType,
        stateRefSelector: () => ComponentStateRef<ComponentT>,
        onComplete?: (state: ComponentStateWithIdentity<ComponentT>) => void
    ): void {
        // Register a lifecycle event listener for the given event
        EventSource.registerLifecycleEvent($class, event, function onEvent() {
            const instance: any = injector.get($class, null, InjectFlags.Self);

            if (instance === this) {
                const stateRef = stateRefSelector();
                const state: any = updateState(stateRef, stateRef._pendingState, instance);

                state[COMPONENT_IDENTITY] = instance;

                EventSource.unregisterLifecycleEvent($class, event, onEvent);

                if (onComplete) {
                    onComplete(state);
                }
            }
        });
    }

    function updateState<ComponentT>(
        componentStateRef: ComponentStateRef<ComponentT>,
        componentState: Partial<StateRecord<ComponentT>>,
        instance: ComponentT
    ): Partial<StateRecord<ComponentT>> {
        const instanceProps = getAllAccessibleKeys<ComponentT>(instance);

        // Create a managed reactive state wrapper for each component property
        instanceProps.forEach((prop) => {
            // Only update an entry if it hasn't yet been defined
            if (!componentState[ComponentState.stateKey<ComponentT>(prop.key)]) {
                updateStateForProperty(
                    componentStateRef,
                    componentState,
                    instance,
                    prop
                );
            }
        });

        return componentState;
    }

    function updateStateForProperty<ComponentT, K extends StringKey<ComponentT>>(
        componentStateRef: ComponentStateRef<ComponentT>,
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

                    // If the property has a valid async source, subscribe to it
                    if (reactiveSource$ && reactiveSource$ instanceof Observable) {
                        componentStateRef.subscribeTo(prop.key as WritableKey<ComponentT, K>, reactiveSource$);
                        reactiveSource$.pipe(take(1)).subscribe(initialValue => propSubject$.next(initialValue));
                    }
                }

                // Set up the property wrapper that exposes the backing subject
                try {
                    manageProperty(instance, prop.key, !propDescriptor || propDescriptor.enumerable);

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
        return publicPropDescriptor && !publicPropDescriptor.writable && !publicPropDescriptor.set;
    }

    function resolveClass<ComponentT>($class: Type<any>): Type<ComponentT> {
        return resolveForwardRef<Type<ComponentT>>($class);
    }

    function getAllAccessibleKeys<T extends Record<string, any>>(instance: T): ComponentStateMetadata.ManagedPropertyList<T> {
        // Ensure managed keys are processed first
        return getManagedKeys(instance).concat(getPublicKeys(instance));
    }

    function getPublicKeys<T>(instance: T): ComponentStateMetadata.ManagedPropertyList<T> {
        return (Object.keys(instance) as Array<StringKey<T>>).map(key => ({ key }));
    }

    function getManagedKeys<T>(instance: T): ComponentStateMetadata.ManagedPropertyList<T> {
        return ComponentStateMetadata.GetInheritedManagedPropertyList<T>(instance.constructor);
    }
}

export function _initComponentState<T>(instance: T): { [COMPONENT_IDENTITY]: T } {
    return {
        [COMPONENT_IDENTITY]: instance
    };
}
