import { EventSource } from "../src/event-source";
import { Suite, Random, Template } from "bdd-test-helpers";

const spec = Suite.create<{
    targetObject: any;
}>();

describe("An EventSource decorator", () => {

    type ConstructionTemplateInput = {
        propertyKey: string;
        options?: EventSource.DecoratorOptions;
        methodDecorators?: MethodDecorator[];
    };

    const ConstructionTemplateInput: ConstructionTemplateInput[] = [
        {
            propertyKey: Random.string()
        },
        {
            propertyKey: Random.string() + "$"
        },
        {
            propertyKey: Random.string(),
            options: {
                eventType: Random.string()
            }
        },
        {
            propertyKey: Random.string() + "$",
            options: {
                eventType: Random.string()
            }
        }
    ];

    const ConstructionTemplateKeys: (keyof ConstructionTemplateInput)[] = ["propertyKey", "options", "methodDecorators"];

    describe("when constructed", Template(ConstructionTemplateKeys, (propertyKey: string, options?: EventSource.DecoratorOptions, methodDecorators?: MethodDecorator[]) => {
        methodDecorators = methodDecorators || [];
        const createEventSource = () => options ? EventSource(options, ...methodDecorators) : EventSource(...methodDecorators);

        spec.beforeEach((params) => {
            params.targetObject = {
                [propertyKey]: Random.string()
            };
        });

        if (propertyKey.endsWith("$")) {
            spec.beforeEach(((params) => {
                createEventSource()(params.targetObject, propertyKey);
            }));

            describe("when the property key ends with '$'", () => {

                if (options && options.eventType) {
                    describe("when an eventType is specified", () => {

                        spec.it("should create a facade function for the eventType", (params) => {
                            expect(params.targetObject[options.eventType]).toEqual(jasmine.any(Function));
                        });

                        spec.it("should NOT create a facade function for the property key", (params) => {
                            expect(params.targetObject[propertyKey.slice(0, -1)]).not.toBeDefined();
                        });
                    });
                }
                else {
                    describe("when an eventType is NOT specified", () => {

                        spec.it("should create a facade function for the property key", (params) => {
                            expect(params.targetObject[propertyKey.slice(0, -1)]).toEqual(jasmine.any(Function));
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
                            createEventSource()(params.targetObject, propertyKey);
                        }));

                        spec.it("should create a facade function for the eventType", (params) => {
                            expect(params.targetObject[options.eventType]).toEqual(jasmine.any(Function));
                        });
                    });
                }
                else {
                    describe("when an eventType is NOT specified", () => {

                        spec.it("should throw an error", (params) => {
                            expect(() => createEventSource()(params.targetObject, propertyKey)).toThrow();
                        });
                    });
                }
            });
        }

    }, ...ConstructionTemplateInput));
});