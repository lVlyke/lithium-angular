import { Spec, Template } from "detest-bdd";
import { AotAware } from "../src/aot";
import { AngularLifecycleType } from "../src/lifecycle-event";

const spec = Spec.create<{
    targetClass: AotAware
}>();

describe("Given an AotAware class", () => {

    spec.it("it should extend TemplateDynamic", () => {
        expect(Object.getPrototypeOf(AotAware).name).toEqual("TemplateDynamic");
    });

    Template.withInputs<{ methodName: AngularLifecycleType }>(["methodName"], (methodName: AngularLifecycleType) => {

        spec.beforeEach(params => { params.targetClass = new class extends AotAware {} });

        spec.it(`should define a ${methodName} method`, (params) => {
            const angularFn = params.targetClass[methodName];

            expect(() => angularFn()).not.toThrow();

            expect(params.targetClass[methodName]).toEqual(jasmine.any(Function));
        });
    }, ...AngularLifecycleType.values.map(methodName => ({ methodName })))();
});
