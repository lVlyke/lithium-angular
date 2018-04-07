import { Spec, InputBuilder, Template } from "detest-bdd";
import { EventSource } from "../src/event-source";
import * as Lifecycle from "../src/lifecycle";

const spec = Spec.create<{
    targetClass: any
}>();

describe("Given Angular lifecycle event EventSource decorators", () => {

    type LifecycleTemplateInput = {
        lifecycleEvent: Lifecycle.AngularLifecycleType;
        options?: EventSource.DecoratorOptions;
        methodDecorators?: MethodDecorator[];
    };

    const LifecycleTemplateInput = InputBuilder
        .fragmentList<LifecycleTemplateInput>({ lifecycleEvent: Lifecycle.AngularLifecycleType.values })
        .fragmentList({ methodDecorators: [undefined, [jasmine.createSpy("methodDecorator")]] })
        .fragment({ options: undefined })
        .fragmentBuilder("options", InputBuilder
            .fragmentList<EventSource.DecoratorOptions>({ skipMethodCheck: [true, false, undefined] })
        );

    const LifecycleTemplateInputKeys: (keyof LifecycleTemplateInput)[] = ["lifecycleEvent", "options", "methodDecorators"];

    Template(LifecycleTemplateInputKeys, LifecycleTemplateInput, (
        lifecycleEvent: Lifecycle.AngularLifecycleType,
        options?: EventSource.DecoratorOptions,
        methodDecorators?: MethodDecorator[]
    ) => {
        methodDecorators = methodDecorators || [];
        const lifecycleDecoratorName: string = lifecycleEvent.replace(/^ng/, "");

        describe(`when the ${lifecycleDecoratorName} EventSource decorator is applied`, () => {

            spec.beforeEach((params) => {
                spyOn(EventSource, "WithParams").and.callThrough();

                const lifecycleDecorator: Lifecycle.AngularLifecycleType.DecoratorFactory = (<any>Lifecycle)[lifecycleDecoratorName];

                params.targetClass = class {};

                // Apply the lifecycle decorator
                lifecycleDecorator(options, ...methodDecorators)(params.targetClass.prototype, lifecycleDecoratorName);
            });

            spec.it("should call StateEmitter.WithParams with the expected values", () => {
                expect(EventSource.WithParams).toHaveBeenCalledWith(Object.assign({ eventType: lifecycleEvent }, options), ...methodDecorators);
            });
        });
    })();
});