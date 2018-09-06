import { Spec, Template, Random, InputBuilder } from "detest-bdd";
import { StateEmitter } from "../src/state-emitter";
import { EmitterMetadata } from "../src/emitter-metadata";
import { AngularMetadata } from "../src/angular-metadata";
import { BehaviorSubject } from "rxjs";
import { take, map, withLatestFrom, mergeMapTo } from "rxjs/operators";

const spec = Spec.create<{
    targetPrototype: any;
    targetClass: any;
    targetInstance: any;
    setterValue: string;
}>();

describe("Given a StateEmitter decorator", () => {

    type ConstructionTemplateInput = {
        propertyKey: string;
        options?: StateEmitter.DecoratorParams;
        propertyDecorators?: PropertyDecorator[];
        angularPropMetadata?: any[];
    };

    const STATIC_PROXY_PATH = "static.proxy.path$";
    const DYNAMIC_PROXY_PATH = "dynamic.proxy$.path";

    const ConstructionTemplateInput = InputBuilder
        .fragment<ConstructionTemplateInput>({ propertyKey: Random.string() })
        .fragment({ propertyKey: Random.string() + "$" }, input => !input.options || !input.options.propertyName)
        .fragmentList({ propertyDecorators: [undefined, [jasmine.createSpy("propertyDecorator")]] })
        .fragment({ options: undefined })
        .fragmentBuilder<StateEmitter.DecoratorParams>("options", InputBuilder
            .fragmentList<StateEmitter.DecoratorParams>({ propertyName: [undefined, Random.string()] })
            .fragmentList({ proxyMode: [undefined, EmitterMetadata.ProxyMode.Alias, EmitterMetadata.ProxyMode.From, EmitterMetadata.ProxyMode.Merge, EmitterMetadata.ProxyMode.None] })
            .fragmentList({ proxyPath: [STATIC_PROXY_PATH, DYNAMIC_PROXY_PATH] }, options => options.proxyMode && options.proxyMode !== EmitterMetadata.ProxyMode.None)
            .fragment({ proxyMergeUpdates: undefined })
            .fragmentList({ proxyMergeUpdates: [true, false] }, options => options.proxyPath === DYNAMIC_PROXY_PATH)
            .fragmentList({ readOnly: [undefined, true, false]})
            .fragment({ initialValue: Random.string() })
        )
        .fragmentList({ angularPropMetadata: [undefined, [1, 2, 3]] });

    const ConstructionTemplateKeys: (keyof ConstructionTemplateInput)[] = ["propertyKey", "options", "propertyDecorators", "angularPropMetadata"];    

    describe("when constructed", Template(ConstructionTemplateKeys, ConstructionTemplateInput, (
        propertyKey: string,
        options?: StateEmitter.DecoratorParams,
        propertyDecorators?: PropertyDecorator[],
        angularPropMetadata?: any[]
    ) => {
        propertyDecorators = propertyDecorators || [];
        const is$ = propertyKey.endsWith("$");
        const isStaticProxyPath = options && options.proxyPath === STATIC_PROXY_PATH;
        const propertyName = (options && options.propertyName) ? options.propertyName : (is$ ? propertyKey.slice(0, -1) : undefined);
        const isValid = !!propertyName;
        const createStateEmitter = () => options ? StateEmitter(options, ...propertyDecorators) : StateEmitter(...propertyDecorators);
        const mergedOptions = () => is$ ? Object.assign({ propertyName }, options) : options;

        function getMetadata(targetClass: any): EmitterMetadata.SubjectInfo {
            return EmitterMetadata.GetOwnMetadataMap(targetClass).get(propertyName);
        }

        function testFacadeSetterFunction(fn: (params: any, value: string) => void) {
            // TODO - Tests for when dynamic path doesn't contain a Subject throwing an error
    
            spec.beforeEach((params) => {
                fn(params, params.setterValue = Random.string(10));
            });
    
            spec.it("then it should update the subject with the new value", (params) => {
                return params.targetInstance[propertyKey].pipe(
                    take(1),
                    map((value: string) => expect(value).toEqual(params.setterValue))
                ).toPromise();
            });
    
            if (options && options.proxyMode === EmitterMetadata.ProxyMode.Alias) {
                describe("when the proxy mode is set to \"Alias\"", () => {
    
                    spec.it("then it should update the source subject", (params) => {
                        if (isStaticProxyPath) {
                            return params.targetInstance.static.proxy.path$.pipe(
                                take(1),
                                map((value: string) => expect(value).toEqual(params.setterValue))
                            ).toPromise();
                        }
                        else {
                            return params.targetInstance.dynamic.proxy$.pipe(
                                take(1),
                                map((value: { path: string }) => expect(value.path).toEqual(params.setterValue))
                            ).toPromise();
                        }
                    });
                });
            }
            else if (options && (options.proxyMode === EmitterMetadata.ProxyMode.From || options.proxyMode === EmitterMetadata.ProxyMode.Merge)) {
                describe("when the proxy mode is set to \"From\" or \"Merge\"", () => {
    
                    spec.it("then it should NOT update the source subject", (params) => {
                        if (isStaticProxyPath) {
                            return params.targetInstance.static.proxy.path$.pipe(
                                take(1),
                                map((value: string) => expect(value).not.toEqual(params.setterValue))
                            ).toPromise();
                        }
                        else {
                            return params.targetInstance.dynamic.proxy$.pipe(
                                take(1),
                                map((value: { path: string }) => expect(value.path).not.toEqual(params.setterValue))
                            ).toPromise();
                        }
                    });
                });
            }
        }

        spec.beforeEach((params) => {
            spyOn(StateEmitter, "WithParams").and.callThrough();

            // Make sure a fresh class is created each time
            params.targetClass = class TestTargetClass {
                public readonly static = {
                    proxy: {
                        path$: new BehaviorSubject(Random.string())
                    }
                };
    
                public readonly dynamic = {
                    proxy$: new BehaviorSubject({ path: Random.string() })
                };
            };
            params.targetPrototype = params.targetClass.prototype;

            if (angularPropMetadata) {
                Object.defineProperty(params.targetClass, AngularMetadata.PROP_METADATA, {
                    value: { [propertyKey]: angularPropMetadata }
                });
            }
        });

        if (!is$ && !(options && options.propertyName)) {
            describe("when the property key does NOT end with '$' and a propertyName is NOT specified", () => {

                spec.it("should throw an error", (params) => {
                    expect(() => createStateEmitter()(params.targetPrototype, propertyKey)).toThrowError();
                });
            });
        }

        if (isValid) {
            describe("when there's a property name collision", () => {

                spec.beforeEach((params) => {
                    params.targetPrototype[propertyName] = true;
                });

                spec.it("then it should throw an error", (params) => {
                    expect(() => createStateEmitter()(params.targetPrototype, propertyKey)).toThrowError();
                });
            });

            describe("when there's NOT a property name collision", () => {

                spec.beforeEach(((params) => {
                    createStateEmitter()(params.targetPrototype, propertyKey);
                }));

                if (propertyDecorators.length > 0) {
                    describe("when there are property decorators", () => {

                        spec.it("should apply all of the property decorators", (params) => {
                            propertyDecorators.forEach(propertyDecorator => expect(propertyDecorator).toHaveBeenCalledWith(
                                params.targetPrototype,
                                propertyName
                            ));
                        });
                    });
                }

                spec.it("should set the expected metadata for the class", (params) => {
                    const metadata: EmitterMetadata.SubjectInfo = getMetadata(params.targetClass);

                    expect(metadata).toEqual(jasmine.objectContaining(mergedOptions()));
                });

                if (angularPropMetadata) {
                    describe("when there's Angular metadata for this property", () => {

                        spec.it("then it should move the metadata from the StateEmitter property to the facade property", (params) => {
                            expect(AngularMetadata.hasPropMetadataEntry(params.targetClass, propertyKey)).toBeFalsy();
                            expect(AngularMetadata.getPropMetadata(params.targetClass)).toEqual({ [propertyName]: angularPropMetadata });
                        });
                    });
                }

                describe("when a new instance is created", () => {

                    spec.beforeEach(((params) => {
                        params.targetInstance = new params.targetClass();

                        // Make sure the property is bootstrapped
                        params.targetInstance[propertyKey];
                    }));

                    // TODO - Test copying of inheritted metadata

                    if (!options || !options.readOnly) {
                        spec.it("then it should create a facade setter function on the instance for the property name", (params) => {
                            const facadeProperty = Object.getOwnPropertyDescriptor(params.targetInstance, propertyName);

                            expect(facadeProperty.set).toEqual(jasmine.any(Function));
                        });

                        describe("when the facade setter is invoked", () => {
                            testFacadeSetterFunction((params, value) => params.targetInstance[propertyName] = value);
                        });
                    }
                    else {
                        spec.it("then it should NOT create a facade setter function on the instance for the property name", (params) => {
                            const facadeProperty = Object.getOwnPropertyDescriptor(params.targetInstance, propertyName);

                            expect(facadeProperty.set).not.toBeDefined();
                        });
                    }

                    spec.it("then it should create a facade getter function on the instance for the property name", (params) => {
                        const facadeProperty = Object.getOwnPropertyDescriptor(params.targetInstance, propertyName);

                        expect(facadeProperty.get).toEqual(jasmine.any(Function));
                    });

                    describe("when the facade getter is invoked", () => {

                        spec.it("then it should return the expected value", (params) => {
                            if (!options || !options.proxyMode || options.proxyMode === EmitterMetadata.ProxyMode.None) {
                                expect(params.targetInstance[propertyName]).toEqual(mergedOptions().initialValue);
                            }
                            else if (isStaticProxyPath) {
                                return params.targetInstance.static.proxy.path$.pipe(
                                    take(1),
                                    map((value: string) => expect(params.targetInstance[propertyName]).toEqual(value))
                                ).toPromise();
                            }
                            else {
                                return params.targetInstance.dynamic.proxy$.pipe(
                                    take(1),
                                    map((value: { path: string }) => expect(params.targetInstance[propertyName]).toEqual(value.path))
                                ).toPromise();
                            }
                        });
                    });

                    if (!options || !options.readOnly) {
                        spec.it("then it should create a facade setter on the instance for the property key to support AoT", (params) => {
                            const stateEmitterProperty = Object.getOwnPropertyDescriptor(params.targetInstance, propertyKey);

                            expect(stateEmitterProperty.set).toEqual(jasmine.any(Function));
                        });

                        describe("when the facade setter for AoT is invoked", () => {
                            testFacadeSetterFunction((params, value) => params.targetInstance[propertyKey] = value);
                        });
                    }

                    spec.it("then it should create a getter on the instance for the property key that returns an observable with the expected behavior", (params) => {
                        const stateEmitterProperty = Object.getOwnPropertyDescriptor(params.targetInstance, propertyKey);
                        const metadata: EmitterMetadata.SubjectInfo = getMetadata(params.targetInstance);

                        expect(stateEmitterProperty.get).toEqual(jasmine.any(Function));

                        if (!options || !options.proxyMode || options.proxyMode === EmitterMetadata.ProxyMode.None) {
                            expect(params.targetInstance[propertyKey]).toEqual(metadata.observable);
                        }
                        else if (options.proxyMode === EmitterMetadata.ProxyMode.Alias) {
                            if (isStaticProxyPath) {
                                expect(params.targetInstance[propertyKey]).toEqual(params.targetInstance.static.proxy.path$);
                            }
                            else {
                                return params.targetInstance[propertyKey].pipe(
                                    take(1),
                                    withLatestFrom(params.targetInstance.dynamic.proxy$),
                                    map((args: any[]) => expect(args[0]).toEqual(args[1].path))
                                ).toPromise();
                            }
                        }
                        else if (options.proxyMode === EmitterMetadata.ProxyMode.From) {
                            if (isStaticProxyPath) {
                                expect(params.targetInstance[propertyKey]).not.toBe(params.targetInstance.static.proxy.path$);

                                let firstEmission: string;

                                return params.targetInstance[propertyKey].pipe(
                                    take(1),
                                    withLatestFrom(params.targetInstance.static.proxy.path$),
                                    map((args: any[]) => expect(firstEmission = args[0]).toEqual(args[1])),
                                    map(() => params.targetInstance.static.proxy.path$.next(Random.string())),
                                    mergeMapTo(params.targetInstance[propertyKey]),
                                    take(1),
                                    map((latestValue: string) => expect(latestValue).toEqual(firstEmission)),
                                ).toPromise();
                            }
                            else {
                                let firstEmission: string;

                                return params.targetInstance[propertyKey].pipe(
                                    take(1),
                                    withLatestFrom(params.targetInstance.dynamic.proxy$),
                                    map((args: any[]) => expect(firstEmission = args[0]).toEqual(args[1].path)),
                                    map(() => params.targetInstance.dynamic.proxy$.next({ path: Random.string() })),
                                    mergeMapTo(params.targetInstance[propertyKey]),
                                    take(1),
                                    map((latestValue: string) => expect(latestValue).toEqual(firstEmission))
                                ).toPromise();
                            }
                        }
                        else if (options.proxyMode === EmitterMetadata.ProxyMode.Merge) {
                            if (isStaticProxyPath) {
                                expect(params.targetInstance[propertyKey]).not.toBe(params.targetInstance.static.proxy.path$);

                                let nextEmission: string;

                                return params.targetInstance[propertyKey].pipe(
                                    take(1),
                                    withLatestFrom(params.targetInstance.static.proxy.path$),
                                    map((args: any[]) => expect(args[0]).toEqual(args[1])),
                                    map(() => params.targetInstance.static.proxy.path$.next(nextEmission = Random.string())),
                                    mergeMapTo(params.targetInstance[propertyKey]),
                                    take(1),
                                    map((latestValue: string) => expect(latestValue).toEqual(nextEmission)),
                                ).toPromise();
                            }
                            else {
                                let nextEmission: { path: string };

                                return params.targetInstance[propertyKey].pipe(
                                    take(1),
                                    withLatestFrom(params.targetInstance.dynamic.proxy$),
                                    map((args: any[]) => expect(args[0]).toEqual(args[1].path)),
                                    map(() => params.targetInstance.dynamic.proxy$.next(nextEmission = { path: Random.string() })),
                                    mergeMapTo(params.targetInstance[propertyKey]),
                                    take(1),
                                    map((latestValue: string) => expect(latestValue).toEqual(nextEmission.path))
                                ).toPromise();
                            }
                        }
                    });
                });
            });
        }
    }));

    type HelperTemplateInput = {
        proxyMode: EmitterMetadata.ProxyMode,
        proxyPath?: string;
        options?: StateEmitter.ProxyDecoratorParams;
        propertyDecorators?: PropertyDecorator[];
    };

    const HelperTemplateInput = InputBuilder
        .fragmentList<HelperTemplateInput>({ proxyMode: [EmitterMetadata.ProxyMode.Alias, EmitterMetadata.ProxyMode.From, EmitterMetadata.ProxyMode.Merge] })
        .fragment({ proxyPath: undefined }, input => !!input.options)
        .fragment({ proxyPath: Random.string() })
        .fragment({ options: undefined }, input => !!input.proxyPath)
        .fragmentBuilder("options", InputBuilder
            .fragmentList({ propertyName: [undefined, Random.string()] })
        )
        .fragmentList({ propertyDecorators: [undefined, [jasmine.createSpy("propertyDecorator")]] });

    const HelperTemplateKeys: (keyof HelperTemplateInput)[] = ["proxyMode", "proxyPath", "options", "propertyDecorators"];

    Template(HelperTemplateKeys, HelperTemplateInput, (
        proxyMode: "Alias" | "From" | "Merge",
        proxyPath?: string,
        options?: StateEmitter.ProxyDecoratorParams,
        propertyDecorators?: PropertyDecorator[]
    ) => {
        propertyDecorators = propertyDecorators || [];
        const params = options || { path: proxyPath };

        describe(`when the ${proxyMode} helper decorator is called`, () => {

            spec.beforeEach(() => {
                spyOn(StateEmitter, "WithParams").and.callThrough();

                StateEmitter[proxyMode](options || proxyPath, ...propertyDecorators);
            });

            spec.it("should call StateEmitter.WithParams with the expected parameters", () => {
                expect(StateEmitter.WithParams).toHaveBeenCalledWith({
                    propertyName: params.propertyName,
                    proxyMode: proxyMode,
                    proxyPath: params.path,
                    proxyMergeUpdates: params.mergeUpdates
                }, ...propertyDecorators);
            });
        });
    })();
});