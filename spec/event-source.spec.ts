import { EventSource } from "../src/event-source";
import { Spec, Random, Template, InputBuilder } from "detest-bdd";
import { EventMetadata, AngularMetadata, CommonMetadata } from "../src/metadata";
import { Subject, Observable } from 'rxjs';
import { map, take, shareReplay } from "rxjs/operators";
import { AngularLifecycleType } from "../src/lifecycle-event";
import { ManagedSubject } from "../src/managed-observable";

const spec = Spec.create<{
    targetPrototype: any;
    targetClass: any;
    targetInstance: any;
    facadeData: string;
    observable: Observable<string>;
}>();

describe("An EventSource decorator", () => {

    type ConstructionTemplateInput = {
        propertyKey: string;
        options?: EventSource.DecoratorOptions;
        methodDecorators?: MethodDecorator[];
        angularPropMetadata?: any[];
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
            )
            .fragmentList({ angularPropMetadata: [undefined, [1, 2, 3]] }),
        
        // ngOnDestroy tests:
        InputBuilder
            .fragment<ConstructionTemplateInput>({ propertyKey: Random.string() })
            .fragmentBuilder<EventSource.DecoratorOptions>("options", InputBuilder
                .fragment<EventSource.DecoratorOptions>({ eventType: "ngOnDestroy" })
            )
    ];

    const constructionTemplateKeys: (keyof ConstructionTemplateInput)[] = ["propertyKey", "options", "methodDecorators", "angularPropMetadata"];

    describe("when constructed", Template(constructionTemplateKeys, constructionTemplateInput, (
        propertyKey: string,
        options?: EventSource.DecoratorOptions,
        methodDecorators?: MethodDecorator[],
        angularPropMetadata?: any[]
    ) => {
        methodDecorators = methodDecorators || [];
        const is$ = propertyKey.endsWith("$");
        const eventType = (options && options.eventType) ? options.eventType : (is$ ? propertyKey.slice(0, -1) : undefined);
        const isValid = !!eventType;
        const createEventSource = () => options ? EventSource(options, ...methodDecorators) : EventSource(...methodDecorators);
        const getOptions = (): EventSource.DecoratorOptions => is$ ? Object.assign({ eventType }, options) : options;
        
        spec.beforeEach((params) => {
            params.targetClass = class TestTargetClass {}; // Make sure a fresh class is created each time
            params.targetPrototype = params.targetClass.prototype;

            if (angularPropMetadata) {
                Object.defineProperty(params.targetClass, AngularMetadata.PROP_METADATA, {
                    value: { [propertyKey]: angularPropMetadata }
                });
            }
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

                if (angularPropMetadata) {
                    describe("when there's Angular metadata for this property", () => {

                        spec.it("then it should move the metadata from the EventSource property to the facade function property", (params) => {
                            expect(AngularMetadata.hasPropMetadataEntry(params.targetClass, propertyKey)).toBeFalsy();
                            expect(AngularMetadata.getPropMetadata(params.targetClass)).toEqual({ [eventType]: angularPropMetadata });
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

                        spec.beforeEach((params) => {
                            params.observable = params.targetInstance[propertyKey].pipe(shareReplay());

                            // Subscribe first to capture the facade fn event
                            params.observable.subscribe();

                            // Invoke the facade function
                            params.facadeData = Random.string();
                            params.targetInstance[facadeFnKey](params.facadeData);
                        });

                        spec.it("should update the Observable with the data passed to the function", (params) => {
                            return params.observable.pipe(
                                map(data => { expect(data).toEqual(params.facadeData) }),
                                take(1)
                            ).toPromise();
                        });
                    }, { facadeFnKey: eventType }, { facadeFnKey: propertyKey }));
                });
            });
        }
    }));
});