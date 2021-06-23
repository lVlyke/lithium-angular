import { Provider, Type } from "@angular/core";
import { from, Observable, of, ReplaySubject, Subject, Subscription, throwError } from "rxjs";
import { mergeMap, skip, take, tap } from "rxjs/operators";
import { AutoPush } from "./autopush";
import { ManagedBehaviorSubject } from "./managed-observable";
import { EventSource } from "./event-source";
import { AngularLifecycleType } from "./lifecycle-event";
import { ComponentStateMetadata, CommonMetadata } from "./metadata";

const COMPONENT_IDENTITY = Symbol("COMPONENT_IDENTITY");

type ComponentStateWithIdentity<ComponentT> = ComponentState<ComponentT> & { [COMPONENT_IDENTITY]: ComponentT };

export type ComponentState<ComponentT> = ComponentState.Of<ComponentT>;

export class ComponentStateRef<ComponentT> extends Promise<ComponentStateWithIdentity<ComponentT>> {

    public _pendingState: Partial<ComponentState<ComponentT>> = {};

    public state(): Observable<ComponentState<ComponentT>> {
        return from(this);
    }

    public get<K extends keyof ComponentT>(stateProp: ComponentState.ReadableKey<ComponentT, K>): Observable<ComponentT[K]> {
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

    public getAll<K extends Array<ComponentState.ReadableKey<ComponentT>>>(...stateProps: K): ComponentState.StateSelector<ComponentT, K> {
        return stateProps.map(stateProp => this.get(stateProp)) as ComponentState.StateSelector<ComponentT, K>;
    }

    public set<K extends keyof ComponentT>(stateProp: ComponentState.WritableKey<ComponentT, K>, value: ComponentT[K]): Observable<void> {
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

    public subscribeTo<K extends keyof ComponentT>(
        stateProp: ComponentState.WritableKey<ComponentT, K>,
        source$: Observable<ComponentT[K]>,
        managed: boolean = true
    ): Subscription {
        let managedSource$: Observable<ComponentT[K]>;
        if (managed) {
            managedSource$ = from(this).pipe(
                mergeMap(state => {
                    const managedSource$ = new ManagedBehaviorSubject<ComponentT[K]>(state[COMPONENT_IDENTITY], undefined);
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
}

export namespace ComponentState {

    type IfEquals<X, Y, A, B> =
        (<T>() => T extends X ? 1 : 2) extends
        (<T>() => T extends Y ? 1 : 2) ? A : B;

    type IfReadonly<T, K extends keyof T, A, B> =
        IfEquals<{ [P in K]: T[P] }, { readonly [P in K]: T[P] }, A, B>;

    export type Of<ComponentT> = {
        readonly [K in keyof ComponentT as (K extends string ? (K extends `${infer _K}$` ? never : `${K}$`) : never)]-?:
            IfReadonly<ComponentT, K, Observable<ComponentT[K]>, Subject<ComponentT[K]>>;
    };

    export type ReadableKey<ComponentT, K extends keyof ComponentT = keyof ComponentT> =
        K extends `${infer _K}$` ? never : K;

    export type WritableKey<ComponentT, K extends keyof ComponentT = keyof ComponentT> =
        IfReadonly<ComponentT, K, never, ReadableKey<ComponentT, K>>;

    export type StateKey<ComponentT, K extends keyof ComponentT = keyof ComponentT> =
        K extends string ? `${K}$` & keyof Of<ComponentT> : never;

    export type StateSelector<ComponentT, K extends Array<ReadableKey<ComponentT>>> = 
        { [I in keyof K]: K[I] extends ReadableKey<ComponentT> ? Observable<ComponentT[K[I]]> : never };

    type StateRecord<ComponentT, K extends keyof ComponentT = keyof ComponentT> = Record<StateKey<ComponentT, K>, Observable<ComponentT[K]>>;

    interface PropertyUpdateOptions {
        asyncState?: boolean;
    }

    export function create<ComponentT>($class: Type<any>): Provider {
        return {
            provide: ComponentStateRef,
            useFactory: createFactory<ComponentT>($class),
            deps: []
        };
    }

    export function createFactory<ComponentT>($class: Type<any>): () => ComponentStateRef<ComponentT> {
        // Ensure that we create a OnDestroy EventSource on the target for managing subscriptions
        EventSource({ eventType: AngularLifecycleType.OnDestroy })($class.prototype, CommonMetadata.MANAGED_ONDESTROY_KEY);

        return function (): ComponentStateRef<ComponentT> {
            const stateRef = new ComponentStateRef<ComponentT>((resolve) => {
                const stateSelector = () => stateRef;

                // Generate initial component state on ngOnInit
                updateStateOnEvent($class, AngularLifecycleType.OnInit, stateSelector);

                // Update the component state on afterViewInit and afterContentInit to capture dynamically initialized properties
                updateStateOnEvent($class, AngularLifecycleType.AfterViewInit, stateSelector);
                updateStateOnEvent($class, AngularLifecycleType.AfterContentInit, stateSelector, (state) => {
                    // Resolve the finalized state
                    resolve(state);
                });
            });
            return stateRef;
        }
    }

    export function stateKey<ComponentT, K extends keyof ComponentT = keyof ComponentT>(key: K): StateKey<ComponentT, K> {
        return `${key}$` as any;
    }

    function updateStateOnEvent<ComponentT>(
        $class: Type<any>,
        event: AngularLifecycleType,
        stateRefSelector: () => ComponentStateRef<ComponentT>,
        onComplete?: (state: ComponentStateWithIdentity<ComponentT>) => void
    ): void {
        // Register a lifecycle event listener for the given event
        EventSource.registerLifecycleEvent($class, event, function onEvent() {
            const instance = this;
            const stateRef = stateRefSelector();
            const state: any = updateState(stateRef, stateRef._pendingState, instance, false);

            state[COMPONENT_IDENTITY] = instance;

            EventSource.unregisterLifecycleEvent($class, event, onEvent);

            if (onComplete) {
                onComplete(state);
            }
        });
    }

    function updateState<ComponentT>(
        componentStateRef: ComponentStateRef<ComponentT>,
        componentState: Partial<StateRecord<ComponentT>>,
        instance: ComponentT,
        overwriteExistingProperties: boolean
    ): Partial<StateRecord<ComponentT>> {
        const instanceProps = getAllAccessibleKeys(instance);
        const instanceAsyncStates = getOwnAsyncKeys(instance);

        // Create a managed reactive state wrapper for each component property
        instanceProps.forEach((classProp: keyof ComponentT) => {
            if (overwriteExistingProperties || !componentState[ComponentState.stateKey<ComponentT>(classProp)]) {
                updateStateForProperty(
                    componentStateRef,
                    componentState,
                    instance,
                    classProp,
                    { asyncState: instanceAsyncStates.includes(classProp) }
                );
            }
        });

        return componentState;
    }

    function updateStateForProperty<ComponentT, K extends keyof ComponentT>(
        componentStateRef: ComponentStateRef<ComponentT>,
        componentState: Partial<StateRecord<ComponentT, K>>,
        instance: ComponentT,
        classProp: K,
        options: PropertyUpdateOptions
    ): Partial<StateRecord<ComponentT, K>> {
        const propDescriptor = Object.getOwnPropertyDescriptor(instance, classProp);
        const stateSubjectProp = stateKey<ComponentT, K>(classProp);

        if (typeof classProp === "string" && !classProp.endsWith("$")) {
            let lastValue: ComponentT[K] = instance[classProp];

            if (!propDescriptor || (propDescriptor.configurable && (propDescriptor.writable || propDescriptor.set))) {
                const propSubject$ = componentState[stateSubjectProp] = new ManagedBehaviorSubject<ComponentT[K]>(instance, lastValue);

                // Monitor the property subject for value changes
                propSubject$.pipe(skip(1)).subscribe(value => {
                    // Update the cached value
                    lastValue = value;

                    // Notify the component of changes if AutoPush is enabled
                    AutoPush.notifyChanges(instance);
                });

                if (options.asyncState) {
                    const classReactiveStateProp = `${classProp}$` as keyof ComponentT;
                    const reactiveSource$ = instance[classReactiveStateProp];

                    // If `classProp` is an AsyncState and and there's an equivalent `${classProp}$` on the instance, subscribe to it
                    if (reactiveSource$ && reactiveSource$ instanceof Observable) {
                        componentStateRef.subscribeTo<K>(classProp as WritableKey<ComponentT, K>, reactiveSource$);
                        reactiveSource$.pipe(take(1)).subscribe(initialValue => propSubject$.next(initialValue));
                    }
                }

                try {
                    // Override the existing instance property with a getter/setter that synchronize with `propSubject$`
                    Object.defineProperty(instance, classProp, {
                        configurable: true,
                        enumerable: true,
                        get: () => lastValue,
                        set: (newValue: ComponentT[K]): void => propSubject$.next(newValue)
                    });
                } catch (e) {
                    console.error(`Failed to create state Subject for property ${instance.constructor.name}.${classProp}`, e);
                }
            } else {
                if (!propDescriptor.configurable && propDescriptor.writable) {
                    console.warn(`[ComponentState] Property "${instance.constructor.name}.${classProp}" is not configurable and will be treated as readonly.`);
                }

                // Property is readonly, so just use a static Observable that emits the initial state
                componentState[stateSubjectProp] = of(lastValue);
            }
        }

        return componentState;
    }

    function getAllAccessibleKeys<T extends Record<string, any>>(instance: T): Array<keyof T> {
        return getOwnPublicKeys<T>(instance)
            .concat(getOwnAsyncKeys<T>(instance));
    }

    function getOwnPublicKeys<T>(instance: T): Array<keyof T> {
        return Object.keys(instance) as Array<keyof T>;
    }

    function getOwnAsyncKeys<T>(instance: T): Array<keyof T> {
        return ComponentStateMetadata.GetAsyncPropertyList(instance.constructor) as Array<keyof T>;
    }
}
