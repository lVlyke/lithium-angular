import { Spec, Template, Random, InputBuilder } from "detest-bdd";
import { StateEmitter } from "../src/state-emitter";
import { Reactive } from "../src/component";
import { EmitterMetadata } from "../src/emitter-metadata";

const spec = Spec.create<{
    targetPrototype: any;
    targetClass: any;
    bootstrappedClass: any;
    targetInstance: any;
}>();

describe("Given a StateEmitter decorator", () => {

    type ConstructionTemplateInput = {
        propertyKey: string;
        options?: StateEmitter.DecoratorParams;
        propertyDecorators?: PropertyDecorator[];
    };

    const ConstructionTemplateInput = InputBuilder
        .fragmentList<ConstructionTemplateInput>({ propertyKey: [Random.string(), Random.string() + "$"] })
        .fragmentList({ propertyDecorators: [undefined, [jasmine.createSpy("propertyDecorator")]] })
        .fragment({ options: undefined })
        .fragmentBuilder<StateEmitter.DecoratorParams>("options", InputBuilder
            .fragmentList<StateEmitter.DecoratorParams>({ propertyName: [undefined, Random.string()] })
        );

    const ConstructionTemplateKeys: (keyof ConstructionTemplateInput)[] = ["propertyKey", "options", "propertyDecorators"];

    describe("when constructed", Template(ConstructionTemplateKeys, ConstructionTemplateInput, (propertyKey: string, options?: StateEmitter.DecoratorParams, propertyDecorators?: PropertyDecorator[]) => {
        propertyDecorators = propertyDecorators || [];
        const is$ = propertyKey.endsWith("$");
        const propertyName = (options && options.propertyName) ? options.propertyName : (is$ ? propertyKey.slice(0, -1) : undefined);
        const isValid = !!propertyName;
        const createStateEmitter = () => options ? StateEmitter(options, ...propertyDecorators) : StateEmitter(...propertyDecorators);
        const getOptions = (): StateEmitter.DecoratorParams => is$ ? Object.assign({ propertyName }, options) : options;

        spec.beforeEach((params) => {
            params.targetClass = class TestTargetClass {}; // Make sure a fresh class is created each time
            params.targetPrototype = params.targetClass.prototype;

            // Bootstrap the class
            params.bootstrappedClass = Reactive()(params.targetClass);
        });

        if (!is$ && !(options && options.propertyName)) {
            describe("when the property key does NOT end with '$' and a propertyName is NOT specified", () => {

                spec.it("should throw an error", (params) => {
                    expect(() => createStateEmitter()(params.targetPrototype, propertyKey)).toThrowError();
                });
            });
        }

        if (isValid) {
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
                const metadata: EmitterMetadata.SubjectInfo = EmitterMetadata
                    .GetOwnMetadataMap(params.targetClass)
                    .get(propertyName);

                expect(metadata).toEqual(jasmine.objectContaining(getOptions()));
            });

            // TODO Verify Angular property metadata rename

            describe("when a new instance is created", () => {

                spec.beforeEach(((params) => {
                    params.targetInstance = new params.bootstrappedClass();
                }));
            });
        }
    }));
});