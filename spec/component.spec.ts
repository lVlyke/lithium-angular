import { Template, Spec } from "detest-bdd";
import { LiComponent } from "../src/component";
import { AngularLifecycleType } from "../src/lifecycle-event";

const spec = Spec.create<{
    targetClass: LiComponent
}>();

describe("Given a LiComponent class", () => {

    spec.it("it should extend TemplateDynamic", () => {
        expect(Object.getPrototypeOf(LiComponent).name).toEqual("TemplateDynamic");
    });

    Template.withInputs<{ methodName: AngularLifecycleType }>(["methodName"], (methodName: AngularLifecycleType) => {

        spec.beforeEach(params => { params.targetClass = new class extends LiComponent {} });

        spec.it(`should define a ${methodName} method`, (params) => {
            const angularFn = params.targetClass[methodName];

            expect(() => angularFn()).not.toThrow();

            expect(params.targetClass[methodName]).toEqual(jasmine.any(Function));
        });
    }, ...AngularLifecycleType.values.map(methodName => ({ methodName })))();
});