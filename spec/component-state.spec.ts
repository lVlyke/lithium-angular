import { Component, FactoryProvider, forwardRef, Injector, Type } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { Random, Spec } from "detest-bdd";
import { BehaviorSubject, Observable, Subject } from "rxjs";
import { first } from "rxjs/operators";
import { ComponentState, ComponentStateRef } from "../src/component-state";
import { DeclareState } from "../src/declare-state";
import { AsyncState } from "../src/async-state";
import { asyncStateKey } from "../src/metadata/component-state-metadata";

interface ITestComponentState {
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
}

interface ITestComponent extends ITestComponentState {
    readonly stateRef: ComponentStateRef<ITestComponent>;
}

namespace ITestComponentState {

    export type Watchers = Record<
        ComponentState.StateKey<ITestComponentState>,
        Observable<ITestComponentState[ComponentState.StateKey<ITestComponentState>]>
    >;

    export type WritableKeys = Array<keyof {
        [K in keyof ITestComponentState as K extends ComponentState.WritableKey<ITestComponentState, K> ? K : never]: never;
    }>;

    export type AsyncKey = keyof {
        [K in keyof ITestComponent as ITestComponent[K] extends Subject<any> ? K : never]: never;
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
            uninitializedAndDeclaredNumberA: undefined as number
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

    describe("when called with a component class", () => {

        spec.beforeEach((params) => {
            params.createResult = ComponentState.create(forwardRef(() => TestComponent));

            @Component({
                providers: [params.createResult],
                template: ""
            })
            class TestComponent implements ITestComponent {
                
                public readonly asyncSourceA$ = params.expectedComponentState.asyncSourceA$;
                public readonly asyncSourceB$ = params.expectedComponentState.asyncSourceB$;

                public readonly readonlyInitializedNumberB = params.expectedComponentState.readonlyInitializedNumberB;

                public initializedNumberA = params.expectedComponentState.initializedNumberA;

                public publicNamedStringB!: string;

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

                constructor (
                    public readonly stateRef: ComponentStateRef<TestComponent>
                ) {}

                @DeclareState()
                public get readonlyInitializedNumberA(): number {
                    return params.expectedComponentState.readonlyInitializedNumberA;
                }

                public get publicNamedStringA(): string {
                    return this._namedStringA;
                }

                public get __namedStringB(): string {
                    return this._namedStringB;
                }
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

describe("Given the ComponentStateRef class", () => {

    // interface SpecParams {
    //     stateRef: ComponentStateRef<ITestComponent>;
    // }

    // const spec = Spec.create<SpecParams>();

    // TODO - ComponentStateRef methods
});
