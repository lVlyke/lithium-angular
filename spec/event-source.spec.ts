import { ɵComponentType as ComponentType } from "@angular/core";
import { EventSource } from "../src/event-source";
import { Spec, Random, Template, InputBuilder } from "detest-bdd";
import { EventMetadata, CommonMetadata } from "../src/metadata";
import { Subject, Observable } from 'rxjs';
import { map, take, shareReplay } from "rxjs/operators";
import { AngularLifecycleType } from "../src/lifecycle-event";
import { ManagedSubject } from "../src/managed-observable";

const spec = Spec.create<{
    targetPrototype: any;
    targetClass: any;
    targetInstance: any;
    facadeData: string | string[];
    observable: Observable<string>;
    ngCompDef: ComponentType<any> | { ɵcmp: any };
    facadeFn: (...args: any[]) => void;
}>();

describe("An EventSource decorator", () => {

    type ConstructionTemplateInput = {
        propertyKey: string;
        options?: EventSource.DecoratorOptions;
        methodDecorators?: MethodDecorator[];
    };

    const constructionTemplateInput = [
        // General tests:
        InputBuilder
            .fragment<ConstructionTemplateInput>({ propertyKey: Random.string() })
            .fragment({ propertyKey: Random.string() + "$" }, input => !input.options || !input.options.eventType)
            .fragment({ propertyKey: CommonMetadata.MANAGED_ONDESTROY_KEY })
            .fragmentList({ methodDecorators: [undefined, [jasmine.createSpy("methodDecorator")]] })
            .fragment({ options: undefined })
            .fragmentBuilder<EventSource.DecoratorOptions>("options", InputBuilder
                .fragmentList<EventSource.DecoratorOptions>({ eventType: [undefined, Random.string()] })
                .fragmentList({ skipMethodCheck: [true, false, undefined] })
                .fragmentList({ unmanaged: [true, false, undefined] })
            ),
        
        // Lifecycle tests:
        InputBuilder
            .fragment<ConstructionTemplateInput>({ propertyKey: Random.string() })
            .fragment({ propertyKey: `${AngularLifecycleType.OnInit}$` }, options => !options.options.eventType)
            .fragmentBuilder<EventSource.DecoratorOptions>("options", InputBuilder
                .fragmentList<EventSource.DecoratorOptions>({ eventType: [...AngularLifecycleType.values, undefined] })
            )
    ];

    const constructionTemplateKeys: (keyof ConstructionTemplateInput)[] = ["propertyKey", "options", "methodDecorators"];

    describe("when constructed", Template(constructionTemplateKeys, constructionTemplateInput, (
        propertyKey: string,
        options?: EventSource.DecoratorOptions,
        methodDecorators?: MethodDecorator[]
    ) => {
        methodDecorators = methodDecorators || [];
        const is$ = propertyKey.endsWith("$");
        const eventType = (options && options.eventType) ? options.eventType : (is$ ? propertyKey.slice(0, -1) : undefined);
        const isValid = !!eventType;
        const isLifecycleEvent = AngularLifecycleType.values.includes(eventType as AngularLifecycleType);
        const createEventSource = () => options ? EventSource(options, ...methodDecorators) : EventSource(...methodDecorators);
        const getOptions = (): EventSource.DecoratorOptions => is$ ? Object.assign({ eventType }, options) : options;

        spec.beforeEach((params) => {
            params.targetClass = class TestTargetClass {}; // Make sure a fresh class is created each time
            params.targetPrototype = params.targetClass.prototype;
            params.ngCompDef = params.targetClass;
            params.ngCompDef.ɵcmp = {};
        });

        if (is$) {
            spec.beforeEach(((params) => {
                createEventSource()(params.targetPrototype, propertyKey);
            }));

            describe("when the property key ends with '$'", () => {

                if (options && options.eventType) {
                    describe("when an eventType is specified", () => {

                        spec.it("should create a facade function for the eventType", (params) => {
                            expect(params.targetPrototype[options.eventType]).toEqual(jasmine.any(Function));
                        });

                        spec.it("should NOT create a facade function for the property key", (params) => {
                            expect(params.targetPrototype[propertyKey.slice(0, -1)]).not.toBeDefined();
                        });
                    });
                }
                else {
                    describe("when an eventType is NOT specified", () => {

                        spec.it("should create a facade function for the property key", (params) => {
                            expect(params.targetPrototype[propertyKey.slice(0, -1)]).toEqual(jasmine.any(Function));
                        });
                    });
                }
            });
        }
        else {
            describe("when the property key does NOT end with '$'", () => {

                if (options && options.eventType) {
                    describe("when an eventType is specified", () => {

                        spec.beforeEach(((params) => {
                            createEventSource()(params.targetPrototype, propertyKey);
                        }));

                        spec.it("should create a facade function for the eventType", (params) => {
                            expect(params.targetPrototype[options.eventType]).toEqual(jasmine.any(Function));
                        });
                        
                    });
                }
                else {
                    describe("when an eventType is NOT specified", () => {

                        spec.it("should throw an error", (params) => {
                            expect(() => createEventSource()(params.targetPrototype, propertyKey)).toThrowError();
                        });
                    });
                }
            });
        }

        if (isValid) {
            describe("when there's a method collision", () => {

                spec.beforeEach((params) => {
                    params.targetPrototype[eventType] = function () {};
                });

                if (options && options.skipMethodCheck) {
                    spec.it("should NOT throw an error", (params) => {
                        expect(() => createEventSource()(params.targetPrototype, propertyKey)).not.toThrowError();
                    });
                }
                else {
                    spec.it("should throw an error", (params) => {
                        expect(() => createEventSource()(params.targetPrototype, propertyKey)).toThrowError();
                    });
                }
            });

            describe("when there's NOT a method collision", () => {

                spec.beforeEach(((params) => {
                    createEventSource()(params.targetPrototype, propertyKey);
                }));

                if (propertyKey === CommonMetadata.MANAGED_ONDESTROY_KEY || (options && options.unmanaged)) {
                    spec.it("should ensure an OnDestroy EventSource is NOT linked to the component's MANAGED_ONDESTROY_KEY property", (params) => {
                        expect(EventMetadata.GetPropertySubjectMap(
                            AngularLifecycleType.OnDestroy,
                            params.targetClass
                        ).has(CommonMetadata.MANAGED_ONDESTROY_KEY)).toBeFalsy();
                    });
                } else {
                    spec.it("should ensure an OnDestroy EventSource is linked to the component's MANAGED_ONDESTROY_KEY property", (params) => {
                        expect(EventMetadata.GetPropertySubjectMap(
                            AngularLifecycleType.OnDestroy,
                            params.targetClass
                        ).has(CommonMetadata.MANAGED_ONDESTROY_KEY)).toBeTruthy();
                    });
                }

                if (methodDecorators.length > 0) {
                    describe("when there are method decorators", () => {

                        spec.it("should apply all of the method decorators", (params) => {
                            methodDecorators.forEach(methodDecorator => expect(methodDecorator).toHaveBeenCalledWith(
                                params.targetPrototype,
                                eventType,
                                Object.getOwnPropertyDescriptor(params.targetPrototype, eventType)
                            ));
                        });
                    });
                }

                spec.it("should set the expected metadata for the class", (params) => {
                    const metadata: EventSource.DecoratorOptions = EventMetadata
                        .GetOwnPropertySubjectMap(eventType, params.targetClass)
                        .get(propertyKey);

                    expect(metadata).toEqual(getOptions());
                });

                describe("when a new instance is created", () => {

                    spec.beforeEach(((params) => {
                        params.targetInstance = new params.targetClass();

                        // Make sure the property is bootstrapped
                        params.targetInstance[propertyKey];
                    }));

                    // TODO - Test copying of inheritted metadata

                    if (isLifecycleEvent) {
                        spec.it("should register the lifecycle event with Ivy", (params) => {
                            const hookName = eventType as AngularLifecycleType;
                            expect(params.targetClass.prototype[hookName]).toEqual(jasmine.any(Function));
                        });
                    }

                    spec.it("should create the expected eventType facade function on the instance", (params) => {
                        expect(params.targetInstance[eventType]).toEqual(jasmine.any(Function));
                    });

                    spec.it("should create the expected propertyKey facade function on the instance for AoT", (params) => {
                        expect(params.targetInstance[propertyKey]).toEqual(jasmine.any(Function));
                    });

                    spec.it("should create the expected propertyKey Observable on the instance", (params) => {
                        let expectedClass;
                        if (propertyKey === CommonMetadata.MANAGED_ONDESTROY_KEY) {
                            expectedClass = Subject;
                        } else if (options && options.unmanaged) {
                            expectedClass = Subject;
                        } else {
                            expectedClass = ManagedSubject;
                        }

                        expect(params.targetInstance[propertyKey]).toEqual(jasmine.any(expectedClass));
                    });

                    spec.it("should set the expected metadata for the instance", (params) => {
                        const metadata: EventMetadata.SubjectInfo = EventMetadata
                            .GetOwnPropertySubjectMap(eventType, params.targetInstance)
                            .get(propertyKey);
    
                        expect(<any>metadata).toEqual(jasmine.objectContaining(Object.assign({}, getOptions(), {
                            subject: jasmine.any(Subject)
                        })));
                    });

                    describe("when the facade function is invoked", Template.withInputs(["facadeFnKey"], (facadeFnKey: string) => {

                        Template.create(["multiInput"], (multiInput: boolean) => {

                            describe(`when there is ${multiInput ? "more than one" : "one"} input to the function`, () => {

                                spec.beforeEach((params) => {
                                    params.observable = params.targetInstance[propertyKey].pipe(shareReplay());
        
                                    // Subscribe first to capture the facade fn event
                                    params.observable.subscribe();
        
                                    // Create the facade input data
                                    params.facadeData = multiInput ? [Random.string(), Random.string()] : [Random.string()];
        
                                    // Invoke the facade function with the input
                                    if (isLifecycleEvent) {
                                        const hookName = eventType as AngularLifecycleType;
                                        params.targetClass.prototype[hookName].call(params.targetInstance, ...params.facadeData);
                                    } else {
                                        params.targetInstance[facadeFnKey](...params.facadeData);
                                    }
                                });

                                if (isLifecycleEvent) {
                                    spec.it("should register the Ivy hook function with the correct eventType", (params) => {
                                        const hookName = eventType as AngularLifecycleType;
                                        expect(params.targetClass.prototype[hookName].eventType).toEqual(eventType);
                                    });
                                }
        
                                spec.it(`should update the Observable with the data passed to the function ('${facadeFnKey}')`, (params) => {
                                    return params.observable.pipe(
                                        map(data => { expect(data).toEqual(multiInput ? params.facadeData : params.facadeData[0]) }),
                                        take(1)
                                    ).toPromise();
                                });
                            });
                        }).run({ multiInput: false }, { multiInput: true });
                    }, { facadeFnKey: eventType }, { facadeFnKey: propertyKey }));
                });
            });
        }
    }));
});