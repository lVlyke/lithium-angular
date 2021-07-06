import { Component, FactoryProvider, forwardRef, Injector, Type } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { Random, Spec } from "detest-bdd";
import { BehaviorSubject, combineLatest, Observable, Subject } from "rxjs";
import { first, isEmpty } from "rxjs/operators";
import { firstSync } from "./utils/first-sync";
import { ComponentState, ComponentStateRef, _initComponentState } from "../src/component-state";
import { DeclareState } from "../src/declare-state";
import { AsyncState } from "../src/async-state";
import { asyncStateKey } from "../src/metadata/component-state-metadata";
import { OnDestroy } from "../src/lifecycle";

interface ITestComponentState<T = any> {
    readonly asyncSourceA$: Subject<number>;
    readonly asyncSourceB$: Subject<number>;

    initializedNumberA: number;

    uninitializedNumberA?: number;
    uninitializedAndDeclaredNumberA?: number;

    readonly readonlyInitializedNumberA: number;
    readonly readonlyInitializedNumberB: number;

    readonly publicNamedStringA: string;
    publicNamedStringB: string;

    asyncSourceA: number;
    asyncSourceB: number;
    namedAsyncSource: number;

    readonly publicNamedGenericA: T;
    publicNamedGenericB: T;
}

interface ITestComponent<T = any> extends ITestComponentState<T> {
    readonly stateRef: ComponentStateRef<ITestComponent<T>>;

    ngOnDestroy(): void;
}

namespace ITestComponentState {

    export type Watchers<T = any> = Record<
        ComponentState.StateKey<ITestComponentState<T>>,
        Observable<ITestComponentState<T>[ComponentState.StateKey<ITestComponentState<T>>]>
    >;

    export type WritableKeys<T = any> = Array<keyof {
        [K in keyof ITestComponentState<T> as K extends ComponentState.WritableKey<ITestComponentState<T>, K> ? K : never]: never;
    }>;

    export type AsyncKey<T = any> = keyof {
        [K in keyof ITestComponent<T> as ITestComponent<T>[K] extends Subject<any> ? K : never]: never;
    };
}


describe("Given the ComponentState.create function", () => {
    interface SpecParams {
        $class: Type<ITestComponent>;
        expectedComponentState: ITestComponentState;
        expectedComponentStateKeys: Array<ComponentState.ReadableKey<ITestComponentState>>;
        expectedReadonlyComponentStateKeys: Array<ComponentState.ReadableKey<ITestComponentState>>;
        expectedWritableComponentStateKeys: ITestComponentState.WritableKeys;
        expectedNamedComponentStateKeys: Record<string, ComponentState.ReadableKey<ITestComponentState>>;
        expectedAsyncComponentStateKeys: Partial<Record<ComponentState.ReadableKey<ITestComponentState>, ITestComponentState.AsyncKey>>;
        componentAsyncSourceKeys: ReadonlyArray<ITestComponentState.AsyncKey>;
        createResult: FactoryProvider;
        componentInstance: ITestComponent;
        componentStateRef: ComponentStateRef<ITestComponent>;
        componentStateObservables: ITestComponentState.Watchers;
    }

    const spec = Spec.create<SpecParams>();

    spec.beforeEach((params) => {
        const initialAsyncSourceA = Random.number();
        const initialAsyncSourceB = Random.number();

        const baseComponentState = {
            initializedNumberA: Random.number(),
            readonlyInitializedNumberA: Random.number(),
            readonlyInitializedNumberB: Random.number(),
            publicNamedStringA: Random.string(),
            publicNamedStringB: Random.string(),
            asyncSourceA: initialAsyncSourceA,
            asyncSourceB: initialAsyncSourceB,
            namedAsyncSource: initialAsyncSourceA,
            uninitializedAndDeclaredNumberA: undefined as number,
            publicNamedGenericA: Random.string(),
            publicNamedGenericB: Random.string(),
        } as const;

        params.expectedComponentState = {
            asyncSourceA$: new BehaviorSubject(initialAsyncSourceA),
            asyncSourceB$: new BehaviorSubject(initialAsyncSourceB),
            ...baseComponentState
        };

        params.expectedComponentStateKeys = Object.keys(baseComponentState) as Array<ComponentState.ReadableKey<ITestComponentState>>;
        params.expectedReadonlyComponentStateKeys = [
            "readonlyInitializedNumberA",
            "readonlyInitializedNumberB",
            "publicNamedStringA"
        ];
        params.expectedNamedComponentStateKeys = {
            _namedStringA: "publicNamedStringA",
            _namedStringB: "publicNamedStringB"
        };
        params.expectedAsyncComponentStateKeys = {
            asyncSourceA: "asyncSourceA$",
            asyncSourceB: "asyncSourceB$",
            namedAsyncSource: "asyncSourceA$"
        };
        params.componentAsyncSourceKeys = [
            "asyncSourceA$",
            "asyncSourceB$",
        ];
        params.expectedWritableComponentStateKeys = params.expectedComponentStateKeys.filter(key => {
            return !params.expectedReadonlyComponentStateKeys.includes(key);
        }) as ITestComponentState.WritableKeys;
    });

    spec.afterEach(params => params.componentInstance?.ngOnDestroy?.());

    describe("when called with a component class", () => {

        spec.beforeEach((params) => {
            params.createResult = ComponentState.create(forwardRef(() => TestComponent));

            // TODO - Test inherited state from base class
            @Component({
                providers: [params.createResult],
                template: ""
            })
            class TestComponent<T> implements ITestComponent<T> {
                
                public readonly asyncSourceA$ = params.expectedComponentState.asyncSourceA$;
                public readonly asyncSourceB$ = params.expectedComponentState.asyncSourceB$;

                public readonly readonlyInitializedNumberB = params.expectedComponentState.readonlyInitializedNumberB;

                public initializedNumberA = params.expectedComponentState.initializedNumberA;

                public publicNamedStringB!: string;

                public publicNamedGenericB!: T;

                public uninitializedNumberA?: number;

                @AsyncState()
                public asyncSourceA!: number;

                @AsyncState()
                public asyncSourceB!: number;

                @AsyncState('asyncSourceA$')
                public namedAsyncSource!: number;

                @DeclareState()
                public uninitializedAndDeclaredNumberA?: number;

                @DeclareState('publicNamedStringA')
                private _namedStringA = params.expectedComponentState.publicNamedStringA;

                @DeclareState('publicNamedStringB')
                private _namedStringB = params.expectedComponentState.publicNamedStringB;

                @DeclareState('publicNamedGenericA')
                private _namedGenericA: T = params.expectedComponentState.publicNamedGenericA;

                @DeclareState('publicNamedGenericB')
                private  _namedGenericB: T = params.expectedComponentState.publicNamedGenericB;

                constructor (
                    public readonly stateRef: ComponentStateRef<TestComponent<T>>
                ) {}

                @DeclareState()
                public get readonlyInitializedNumberA(): number {
                    return params.expectedComponentState.readonlyInitializedNumberA;
                }

                public get publicNamedStringA(): string {
                    return this._namedStringA;
                }

                public get publicNamedGenericA(): T {
                    return this._namedGenericA;
                }

                /** @private */
                public get __namedStringB(): string {
                    return this._namedStringB;
                }

                /** @private */
                public get __namedGenericB(): T {
                    return this._namedGenericB;
                }

                ngOnDestroy!: () => void;
            }

            params.$class = TestComponent;
        });

        spec.it("should return the expected provider", (params) => {
            expect(params.createResult).toEqual(jasmine.objectContaining({
                provide: ComponentStateRef,
                useFactory: jasmine.any(Function),
                deps: jasmine.arrayWithExactContents([Injector])
            } as Record<string, unknown>));
        });

        describe("when the result is provided on an instatiated component", () => {
        
            spec.beforeEach((params) => {
                TestBed.configureTestingModule({ declarations: [params.$class] });

                params.componentInstance = TestBed.createComponent(params.$class).componentInstance;
                params.componentStateRef = params.componentInstance?.stateRef;
            });

            spec.it("should provide a ComponentStateRef instance linked to the created component instance", (params) => {
                expect(params.componentStateRef).toBeDefined();
            });

            describe("when the component's lifecycle events are completed", () => {

                spec.beforeEach((params) => {
                    // TODO - Test these separately
                    params.$class.prototype.ngOnInit.call(params.componentInstance);
                    params.$class.prototype.ngAfterContentInit.call(params.componentInstance);
                    params.$class.prototype.ngAfterViewInit.call(params.componentInstance);

                    params.componentStateObservables = params.expectedComponentStateKeys.reduce<ITestComponentState.Watchers>((result, expectedProp) => {
                        result[expectedProp] =  params.componentStateRef.get(expectedProp)
                        return result;
                    }, {} as any);
                });

                spec.it("should initialize the class instance with the expected values", (params) => {
                    veryComponentInstanceState(params);
                });

                spec.it("should initialize the ComponentState instance with the expected properties", async (params) => {
                    const componentState = await params.componentStateRef;

                    componentState.asyncSourceA$;
                    componentState.asyncSourceB$;
                    componentState.initializedNumberA$;
                    componentState.namedAsyncSource$;
                    componentState.publicNamedStringA$;
                    componentState.publicNamedStringB$;
                    componentState.readonlyInitializedNumberA$;
                    componentState.readonlyInitializedNumberB$;
                    componentState.uninitializedAndDeclaredNumberA$;
                    componentState.uninitializedNumberA$;

                    expect(componentState).toBeDefined();
                });

                spec.it("should initialize the ComponentState instance with the expected values", async (params) => {
                    const componentState = await params.componentStateRef;

                    params.expectedComponentStateKeys.forEach(expectedProp => {
                        if (!params.componentInstance[expectedProp] as any instanceof Observable) {
                            const propDescriptor = Object.getOwnPropertyDescriptor(params.componentInstance, expectedProp);
                            const isReadonlyProp = !!propDescriptor && !propDescriptor.writable && !propDescriptor.set;
                            const asyncProp = asyncStateKey<ITestComponent>(expectedProp) as ComponentState.ReactiveStateKey<ITestComponent, ComponentState.StateKey<ITestComponent>>;

                            expect(componentState[asyncProp] instanceof Observable).toBeTruthy();
                            expect(componentState[asyncProp] instanceof Subject).toBe(!isReadonlyProp);
                        }
                    });
                });

                spec.it("should initialize the ComponentStateRef instance with the expected values", async (params) => {
                    await verifyObservableState(params);
                });
    
                describe("when the component state changes", () => {
    
                    spec.beforeEach((params) => {
                        const expectedKeys = params.expectedWritableComponentStateKeys;
    
                        // Change each component instance property to match the new expected values
                        expectedKeys.forEach((expectedKey) => {
                            const valueType = typeof params.componentInstance[expectedKey] as 'string' | 'number';
                            const expectedValue = valueType === 'string' ? Random.string() : Random.number();

                            (params.componentInstance as any)[expectedKey] = expectedValue;
                            (params.expectedComponentState as any)[expectedKey] = expectedValue;
                        });
                    });
    
                    spec.it("should update all component state observables with the expected values", async (params) => {
                        await verifyObservableState(params);
                    });

                    spec.it("should sync all renamed component instance values with their declared state counterparts", (params) => {
                        const renamedKeys = Object.keys(params.expectedNamedComponentStateKeys);

                        renamedKeys.forEach((key) => {
                            expect(params.componentInstance[key as keyof ITestComponentState])
                                .toBe(params.componentInstance[params.expectedNamedComponentStateKeys[key]]);
                        });
                    });

                    spec.it("should sync all renamed component state values with their declared state counterparts", async (params) => {
                        const declaredKeys = Object.keys(params.expectedNamedComponentStateKeys);

                        await Promise.all(declaredKeys.map(async (declaredKey) => {
                            const declaredStateVal = await params.componentStateRef.get(declaredKey as ComponentState.StateKey<ITestComponentState>)
                                .pipe(first())
                                .toPromise();

                            const namedStateVal = await params.componentStateObservables[params.expectedNamedComponentStateKeys[declaredKey]]
                                .pipe(first())
                                .toPromise();

                            expect(declaredStateVal).toBe(namedStateVal);
                        }));
                    });
                });

                describe("when async state sources are updated", () => {

                    spec.beforeEach((params) => {
                        params.componentAsyncSourceKeys.forEach(asyncSourceKey => {
                            const expectedValue = Random.number();

                            params.componentInstance[asyncSourceKey].next(expectedValue);

                            params.expectedWritableComponentStateKeys.forEach(expectedProp => {
                                if (params.expectedAsyncComponentStateKeys[expectedProp] === asyncSourceKey) {
                                    (params.expectedComponentState as any)[expectedProp] = expectedValue;
                                }
                            });
                        });
                    });

                    spec.it("should update the associated async properties with the latest values", (params) => {
                        veryComponentInstanceState(params);
                    });

                    spec.it("should update all component state observables with the expected values", async (params) => {
                        await verifyObservableState(params);
                    });
                });
            });
        });
    });

    async function verifyObservableState(params: SpecParams) {
        await Promise.all(params.expectedComponentStateKeys.map(async (expectedProp) => {
            if (!params.componentInstance[expectedProp] as any instanceof Observable) {
                const currentStateVal = await params.componentStateObservables[expectedProp]
                    .pipe(first())
                    .toPromise();

                expect(currentStateVal).toEqual(params.expectedComponentState[expectedProp]);
            }
        }));
    }

    function veryComponentInstanceState(params: SpecParams) {
        params.expectedComponentStateKeys.forEach((expectedProp: keyof ITestComponentState) => {
            expect(params.componentInstance[expectedProp]).toEqual(params.expectedComponentState[expectedProp]);
        });
    }
});

describe("The ComponentStateRef class", () => {

    interface SpecParams {
        stateRef: ComponentStateRef<ITestComponent>;
        componentInstance: ITestComponent;
        expectedBaseComponentState: Partial<ITestComponentState>;
        expectedComponentState: ITestComponentState;
        expectedComponentStateProperty: keyof ITestComponentState & ComponentState.StateKey<ITestComponentState>;
        expectedComponentStateProperty2: keyof ITestComponentState & ComponentState.StateKey<ITestComponentState>;
        expectedComponentStateObject: ComponentState<ITestComponent>;
        expectedSetValue: any;
        expectedInitialSyncValue: any;
        expectedSyncWithSubject: Subject<any>;
        resolveStateRef: (state: ComponentState<ITestComponentState>) => void;
        rejectStateRef: (e: any) => void;
        subscribeToSource$: Subject<any>;
        getResponse$: Observable<any>;
        getAllResponse$: Observable<any>[];
        setResponse$: Observable<void>;
    }

    const spec = Spec.create<SpecParams>();

    spec.beforeEach((params) => {

        class FakeComponentInstance {

            @OnDestroy()
            public readonly onDestroy$: Observable<void>;
        }

        params.componentInstance = new FakeComponentInstance() as any;
        params.expectedBaseComponentState = generateBaseComponentState();
        params.expectedComponentState = generateComponentState(params.expectedBaseComponentState);
        params.expectedComponentStateObject = createComponentState(params, params.componentInstance);
        params.stateRef = new ComponentStateRef<ITestComponent>((resolve, reject) => {
            params.resolveStateRef = (v) => {
                params.stateRef._pendingState = v;
                resolve(v as any);
            };
            params.rejectStateRef = reject;
        });

        // TODO - Pick these randomly
        params.expectedComponentStateProperty = "initializedNumberA";
        params.expectedComponentStateProperty2 = "uninitializedNumberA";
    });

    describe("has a state method", () => {

        describe("when the component state has been resolved", () => {

            spec.beforeEach((params) => {
                params.resolveStateRef(params.expectedComponentStateObject);
            });

            spec.it("should resolve with the expected value", async (params) => {
                expect(
                    await params.stateRef.state().toPromise()
                ).toBe(params.expectedComponentStateObject);
            });
        });

        describe("when the component state has not been resolved", () => {

            spec.it("should not resolve", async (params) => {
                const empty = await params.stateRef.state()
                    .pipe(firstSync(false), isEmpty())
                    .toPromise();

                expect(empty).toBeTruthy();
            });
        });
    });

    describe("has a get method", () => {

        describe("when the component state has been resolved", () => {

            spec.beforeEach((params) => {
                params.resolveStateRef(params.expectedComponentStateObject);
            });

            describe("when called with a known component state property", () => {

                spec.beforeEach((params) => {
                    params.getResponse$ = params.stateRef.get(params.expectedComponentStateProperty);
                });

                spec.it("should resolve with the expected value", async (params) => {
                    const resolvedValue = await params.getResponse$
                        .pipe(first())
                        .toPromise();

                    expect(resolvedValue).toBe(params.expectedComponentState[params.expectedComponentStateProperty]);
                });
            });

            describe("when called with an unknown component state property", () => {

                spec.it("should throw an error", async (params) => {
                    try {
                        await params.stateRef.get(params.expectedComponentStateProperty + Random.string(10) as any)
                            .pipe(first())
                            .toPromise();
                    } catch(e) {
                        return;
                    }

                    throw new Error("get should throw");
                });
            });
        });

        describe("when the component state has NOT been resolved", () => {

            describe("when called with a known component state property", () => {

                spec.beforeEach((params) => {
                    params.getResponse$ = params.stateRef.get(params.expectedComponentStateProperty);
                });

                spec.it("should not resolve", async (params) => {
                    const empty = await params.getResponse$
                        .pipe(firstSync(false), isEmpty())
                        .toPromise();

                    expect(empty).toBeTruthy();
                });
            });

            describe("when called with an unknown component state property", () => {

                spec.beforeEach((params) => {
                    params.getResponse$ = params.stateRef.get(params.expectedComponentStateProperty + Random.string(10) as any);
                });

                spec.it("should not resolve", async (params) => {
                    const empty = await params.getResponse$
                        .pipe(firstSync(false), isEmpty())
                        .toPromise();

                    expect(empty).toBeTruthy();
                });
            });
        });
    });

    describe("has a getAll method", () => {

        describe("when the component state has been resolved", () => {

            spec.beforeEach((params) => {
                params.resolveStateRef(params.expectedComponentStateObject);
            });

            describe("when called with known component state properties", () => {

                spec.beforeEach((params) => {
                    params.getAllResponse$ = params.stateRef.getAll(...Object.keys(params.expectedBaseComponentState) as any[]);
                });

                spec.it("should resolve with the expected values", async (params) => {
                    const resolvedValues = await combineLatest(params.getAllResponse$)
                        .pipe(first())
                        .toPromise();

                    expect(resolvedValues).toEqual(jasmine.arrayWithExactContents(Object.values(params.expectedBaseComponentState)));
                });
            });

            describe("when called with unknown component state properties", () => {

                spec.it("should throw an error", async (params) => {
                    try {
                        await combineLatest(params.stateRef.getAll(params.expectedComponentStateProperty + Random.string(10) as any))
                            .pipe(first())
                            .toPromise();
                    } catch(e) {
                        return;
                    }

                    throw new Error("getAll should throw");
                });
            });
        });

        describe("when the component state has NOT been resolved", () => {

            describe("when called with known component state properties", () => {

                spec.beforeEach((params) => {
                    params.getAllResponse$ = params.stateRef.getAll(...Object.keys(params.expectedBaseComponentState) as any[]);
                });

                spec.it("should not resolve", async (params) => {
                    const empty = await combineLatest(params.getAllResponse$)
                        .pipe(firstSync(false), isEmpty())
                        .toPromise();

                    expect(empty).toBeTruthy();
                });
            });

            describe("when called with unknown component state properties", () => {

                spec.beforeEach((params) => {
                    params.getAllResponse$ = params.stateRef.getAll(params.expectedComponentStateProperty + Random.string(10) as any);
                });

                spec.it("should not resolve", async (params) => {
                    const empty = await combineLatest(params.getAllResponse$)
                        .pipe(firstSync(false), isEmpty())
                        .toPromise();

                    expect(empty).toBeTruthy();
                });
            });
        });
    });

    describe("has a set method", () => {

        describe("when the component state has been resolved", () => {

            spec.beforeEach((params) => {
                params.resolveStateRef(params.expectedComponentStateObject);
            });
            
            describe("when called with a known component state property", () => {

                spec.beforeEach((params) => {
                    params.expectedSetValue = Random.string(15);

                    params.setResponse$ = params.stateRef.set(params.expectedComponentStateProperty, params.expectedSetValue);
                });

                spec.it("should set the state to the expected value", async (params) => {
                    await params.setResponse$;

                    const stateValue = await params.stateRef.get(params.expectedComponentStateProperty)
                        .pipe(first())
                        .toPromise();

                    expect(stateValue).toBe(params.expectedSetValue);
                });

                spec.it("should resolve", async (params) => {
                    const empty = await params.setResponse$
                        .pipe(isEmpty())
                        .toPromise();

                    expect(empty).toBeFalsy();
                });
            });

            describe("when called with an unknown component state property", () => {

                spec.it("should throw an error", async (params) => {
                    try {
                        await params.stateRef.set(params.expectedComponentStateProperty + Random.string(10) as any, null)
                            .toPromise();
                    } catch(e) {
                        return;
                    }

                    throw new Error("set should throw");
                });
            });
        });

        describe("when the component state has NOT been resolved", () => {
            
            describe("when called with a known component state property", () => {

                spec.beforeEach((params) => {
                    params.expectedSetValue = Random.string(15);

                    params.setResponse$ = params.stateRef.set(params.expectedComponentStateProperty, params.expectedSetValue);
                });

                spec.it("should not resolve", async (params) => {
                    const empty = await params.setResponse$
                        .pipe(firstSync(false), isEmpty())
                        .toPromise();

                    expect(empty).toBeTruthy();
                });
            });

            describe("when called with an unknown component state property", () => {

                spec.beforeEach((params) => {
                    params.setResponse$ = params.stateRef.set(params.expectedComponentStateProperty + Random.string(10) as any, null);
                });

                spec.it("should not resolve", async (params) => {
                    const empty = await params.setResponse$
                        .pipe(firstSync(false), isEmpty())
                        .toPromise();

                    expect(empty).toBeTruthy();
                });
            });
        });
    });

    describe("has a subscribeTo method", () => {

        describe("when the component state has been resolved", () => {

            spec.beforeEach((params) => {
                params.resolveStateRef(params.expectedComponentStateObject);
            });

            describe("when called with a given source observable", () => {

                spec.beforeEach((params) => {
                    params.subscribeToSource$ = new BehaviorSubject(Random.string(10));
                    params.stateRef.subscribeTo(params.expectedComponentStateProperty, params.subscribeToSource$);
                });

                spec.it("should set the component state to the initial source value", async (params) => {
                    const expectedValue = await params.subscribeToSource$
                        .pipe(first())
                        .toPromise();

                    const stateValue = await params.stateRef.get(params.expectedComponentStateProperty)
                        .pipe(first())
                        .toPromise();

                    expect(stateValue).toBe(expectedValue);
                });

                describe("when the source observable emits a new value", () => {

                    spec.beforeEach((params) => {
                        params.subscribeToSource$.next(Random.string(15));
                    });

                    spec.it("should update the component state to the newly emitted value", async (params) => {
                        const expectedValue = await params.subscribeToSource$
                            .pipe(first())
                            .toPromise();
    
                        const stateValue = await params.stateRef.get(params.expectedComponentStateProperty)
                            .pipe(first())
                            .toPromise();
    
                        expect(stateValue).toBe(expectedValue);
                    });
                });
            });

            
        });

        describe("when the component state has not been resolved", () => {

            describe("when called with a given source observable", () => {

                spec.beforeEach((params) => {
                    params.subscribeToSource$ = new BehaviorSubject(Random.string(10));
                    params.stateRef.subscribeTo(params.expectedComponentStateProperty, params.subscribeToSource$);
                });

                spec.it("should NOT set the component state to the initial source value", async (params) => {
                    const expectedValue = await params.subscribeToSource$
                        .pipe(first())
                        .toPromise();
    
                    const stateValue = await params.stateRef.get(params.expectedComponentStateProperty)
                        .pipe(firstSync(false))
                        .toPromise();
    
                    expect(stateValue).not.toBe(expectedValue);
                });
            });
        });

        // TODO - Test managed behavior
    });

    describe("has a sync method", () => {

        describe("when the component state has been resolved", () => {

            spec.beforeEach((params) => {
                params.resolveStateRef(params.expectedComponentStateObject);
            });

            describe("when called with the given properties to sync", () => {

                spec.beforeEach(async (params) => {
                    params.expectedInitialSyncValue = await params.stateRef.get(params.expectedComponentStateProperty)
                        .pipe(first())
                        .toPromise();

                    params.stateRef.sync(
                        params.expectedComponentStateProperty,
                        params.expectedComponentStateProperty2
                    );
                });

                spec.it("should initialize both given properties to the value of the first specified property", async (params) => {
                    const currentValueA = await params.stateRef.get(params.expectedComponentStateProperty)
                        .pipe(first())
                        .toPromise();

                    const currentValueB = await params.stateRef.get(params.expectedComponentStateProperty2)
                        .pipe(first())
                        .toPromise();

                    expect(currentValueA).toBe(params.expectedInitialSyncValue);
                    expect(currentValueB).toBe(params.expectedInitialSyncValue);
                });

                describe("when the first property value is updated", () => {

                    spec.beforeEach(async (params) => {
                        params.stateRef.set(params.expectedComponentStateProperty, Random.string(10));
                    });

                    spec.it("should set both given properties to the new value", async (params) => {
                        const currentValueA = await params.stateRef.get(params.expectedComponentStateProperty)
                            .pipe(first())
                            .toPromise();
    
                        const currentValueB = await params.stateRef.get(params.expectedComponentStateProperty2)
                            .pipe(first())
                            .toPromise();
    
                        expect(currentValueB).toBe(currentValueA);
                    });
                });

                describe("when the second property value is updated", () => {

                    spec.beforeEach(async (params) => {
                        params.stateRef.set(params.expectedComponentStateProperty2, Random.string(10));
                    });

                    spec.it("should set both given properties to the new value", async (params) => {
                        const currentValueA = await params.stateRef.get(params.expectedComponentStateProperty)
                            .pipe(first())
                            .toPromise();
    
                        const currentValueB = await params.stateRef.get(params.expectedComponentStateProperty2)
                            .pipe(first())
                            .toPromise();
    
                        expect(currentValueA).toBe(currentValueB);
                    });
                });
            });
        });
    });

    describe("has a syncWith method", () => {

        describe("when the component state has been resolved", () => {

            spec.beforeEach((params) => {
                params.resolveStateRef(params.expectedComponentStateObject);
            });

            describe("when called with the given property and source Subject to sync", () => {

                spec.beforeEach(async (params) => {
                    params.expectedInitialSyncValue = Random.string(10);
                    params.expectedSyncWithSubject = new BehaviorSubject(params.expectedInitialSyncValue);

                    params.stateRef.syncWith(
                        params.expectedComponentStateProperty,
                        params.expectedSyncWithSubject
                    );
                });

                spec.it("should initialize the given property and the source Subject to the value of the source Subject", async (params) => {
                    const currentValueA = await params.stateRef.get(params.expectedComponentStateProperty)
                        .pipe(first())
                        .toPromise();

                    const currentValueB = await params.expectedSyncWithSubject
                        .pipe(first())
                        .toPromise();

                    expect(currentValueA).toBe(params.expectedInitialSyncValue);
                    expect(currentValueB).toBe(params.expectedInitialSyncValue);
                });

                describe("when the property value is updated", () => {

                    spec.beforeEach(async (params) => {
                        params.stateRef.set(params.expectedComponentStateProperty, Random.string(10));
                    });

                    spec.it("should set the given property and the source Subject to the new value", async (params) => {
                        const currentValueA = await params.stateRef.get(params.expectedComponentStateProperty)
                            .pipe(first())
                            .toPromise();
    
                        const currentValueB = await params.expectedSyncWithSubject
                            .pipe(first())
                            .toPromise();
    
                        expect(currentValueB).toBe(currentValueA);
                    });
                });

                describe("when the source Subject emits a new value", () => {

                    spec.beforeEach((params) => {
                        params.expectedSyncWithSubject.next(Random.string(15));
                    });

                    spec.it("should set the given property and the source Subject to the new value", async (params) => {
                        const currentValueA = await params.stateRef.get(params.expectedComponentStateProperty)
                            .pipe(first())
                            .toPromise();
    
                        const currentValueB = await params.expectedSyncWithSubject
                            .pipe(first())
                            .toPromise();
    
                        expect(currentValueA).toBe(currentValueB);
                    });
                });
            });
        });
    });

    function createComponentState(params: SpecParams, instance: ITestComponent): ComponentState<ITestComponent> {
        return Object.assign(_initComponentState(instance),  {
            initializedNumberA$: new BehaviorSubject(params.expectedComponentState.initializedNumberA),
            readonlyInitializedNumberA$: new BehaviorSubject(params.expectedComponentState.readonlyInitializedNumberA),
            readonlyInitializedNumberB$: new BehaviorSubject(params.expectedComponentState.readonlyInitializedNumberB),
            publicNamedStringA$: new BehaviorSubject(params.expectedComponentState.publicNamedStringA),
            publicNamedStringB$: new BehaviorSubject(params.expectedComponentState.publicNamedStringB),
            asyncSourceA$: params.expectedComponentState.asyncSourceA$,
            asyncSourceB$: params.expectedComponentState.asyncSourceB$,
            namedAsyncSource$:  params.expectedComponentState.asyncSourceA$,
            uninitializedAndDeclaredNumberA$: new BehaviorSubject(params.expectedComponentState.uninitializedAndDeclaredNumberA),
            publicNamedGenericA$: new BehaviorSubject(params.expectedComponentState.publicNamedGenericA),
            publicNamedGenericB$: new BehaviorSubject(params.expectedComponentState.publicNamedGenericB),
            uninitializedNumberA$: new BehaviorSubject(params.expectedComponentState.uninitializedNumberA),
            stateRef$: new BehaviorSubject(undefined),
            ngOnDestroy$: undefined
        });
    }
});

function generateBaseComponentState(): Partial<ITestComponentState> {
    const initialAsyncSourceA = Random.number();
    const initialAsyncSourceB = Random.number();

    return {
        initializedNumberA: Random.number(),
        readonlyInitializedNumberA: Random.number(),
        readonlyInitializedNumberB: Random.number(),
        publicNamedStringA: Random.string(),
        publicNamedStringB: Random.string(),
        asyncSourceA: initialAsyncSourceA,
        asyncSourceB: initialAsyncSourceB,
        namedAsyncSource: initialAsyncSourceA,
        uninitializedAndDeclaredNumberA: undefined as number,
        publicNamedGenericA: Random.string(),
        publicNamedGenericB: Random.string(),
    };
}

function generateComponentState(base: Partial<ITestComponentState>): ITestComponentState {
    return {
        asyncSourceA$: new BehaviorSubject(base.asyncSourceA),
        asyncSourceB$: new BehaviorSubject(base.asyncSourceB),
        ...base
    } as ITestComponentState;
}
