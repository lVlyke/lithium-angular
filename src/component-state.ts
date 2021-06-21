import { Provider, Type } from "@angular/core";
import { from, Observable, of, Subject, Subscription } from "rxjs";
import { mergeMap, skip, tap } from "rxjs/operators";
import { AutoPush } from "./autopush";
import { ManagedBehaviorSubject } from "./managed-observable";
import { EventSource } from "./event-source";
import { AngularLifecycleType } from "./lifecycle-event";
import { CommonMetadata } from "./metadata";

const COMPONENT_IDENTITY = Symbol("COMPONENT_IDENTITY");

type ComponentStateWithIdentity<ComponentT> = ComponentState<ComponentT> & { [COMPONENT_IDENTITY]: ComponentT };

export type ComponentState<ComponentT> = ComponentState.Of<ComponentT>;

export class ComponentStateRef<ComponentT> extends Promise<ComponentStateWithIdentity<ComponentT>> {

    public state(): Observable<ComponentState<ComponentT>> {
        return from(this);
    }

    public get<K extends keyof ComponentT>(stateProp: ComponentState.ReadableKey<ComponentT, K>): Observable<ComponentT[K]> {
        return from(this).pipe(
            mergeMap((state: ComponentState<ComponentT>) => state[ComponentState.stateKey<ComponentT, K>(stateProp)])
        ) as Observable<ComponentT[K]>;
    }

    public getAll<K extends keyof ComponentT>(...stateProps: ComponentState.ReadableKey<ComponentT, K>[]): Observable<ComponentT[K]>[] {
        return stateProps.map(stateProp => this.get(stateProp));
    }

    public set<K extends keyof ComponentT>(stateProp: ComponentState.WritableKey<ComponentT, K>, value: ComponentT[K]): void {
        from(this).subscribe((state: ComponentState<ComponentT>) => {
            const stateSubject$ = state[ComponentState.stateKey<ComponentT, K>(stateProp)] as any as Subject<ComponentT[K]>;
            stateSubject$.next(value);
        });
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

    export type ReadableKey<ComponentT, K extends keyof ComponentT> = K extends `${infer _K}$` ? never : K;
    export type WritableKey<ComponentT, K extends keyof ComponentT> = IfReadonly<ComponentT, K, never, ReadableKey<ComponentT, K>>;
    export type StateKey<ComponentT, K extends keyof ComponentT> = K extends string ? `${K}$` & keyof Of<ComponentT> : never;

    type StateRecord<ComponentT, K extends keyof ComponentT = keyof ComponentT> = Record<StateKey<ComponentT, K>, Observable<ComponentT[K]>>;

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
                EventSource.registerLifecycleEvent($class, AngularLifecycleType.OnInit, function() {
                    const instance = this;
                    const instanceProps = Object.keys(instance) as Array<keyof ComponentT>;
                    const state = instanceProps.reduce<any>((componentState, classProp) => {
                        return updateStateForProperty(componentState, instance, classProp);
                    }, {});

                    state[COMPONENT_IDENTITY] = instance;
                    resolve(state);
                });
            });
            return stateRef;
        }
    }

    export function stateKey<ComponentT, K extends keyof ComponentT>(key: K): StateKey<ComponentT, K> {
        return `${key}$` as any;
    }

    function updateStateForProperty<ComponentT, K extends keyof ComponentT>(
        componentState: StateRecord<ComponentT, K>,
        instance: ComponentT,
        classProp: K
    ): StateRecord<ComponentT, K> {
        const propDescriptor = Object.getOwnPropertyDescriptor(instance, classProp);
        const stateSubjectProp = stateKey<ComponentT, K>(classProp);

        if (typeof classProp === "string" && !classProp.endsWith("$") && propDescriptor.configurable) {
            let lastValue: ComponentT[K] = instance[classProp];

            if (propDescriptor.writable) {
                const propSubject$ = componentState[stateSubjectProp] = new ManagedBehaviorSubject<ComponentT[K]>(instance, lastValue);

                // Monitor the property subject for value changes
                propSubject$.pipe(skip(1)).subscribe(value => {
                    // Update the cached value
                    lastValue = value;

                    // Notify the component of changes if AutoPush is enabled
                    AutoPush.notifyChanges(instance);
                });

                try {
                    // Override the existing instance property with a getter/setter that synchronize with `propSubject$`
                    Object.defineProperty(instance, classProp, {
                        configurable: false,
                        enumerable: true,
                        get: () => lastValue,
                        set: (newValue: ComponentT[K]): void => propSubject$.next(newValue)
                    });
                } catch (e) {
                    console.error(`Failed to create state Subject for property ${instance.constructor.name}.${classProp}`, e);
                }
            } else {
                componentState[stateSubjectProp] = of(lastValue);
            }
        }

        return componentState;
    }
}
