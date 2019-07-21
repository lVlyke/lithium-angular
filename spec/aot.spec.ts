import { Template, Spec } from "detest-bdd";
import * as Lifecycle from "../src/lifecycle";
import { AotAware } from "../src/aot";

const spec = Spec.create<{
    targetClass: AotAware
}>();

describe("Given an AotAware class", () => {

    Template.withInputs<{ methodName: Lifecycle.AngularLifecycleType }>(["methodName"], (methodName: Lifecycle.AngularLifecycleType) => {

        spec.beforeEach(params => { params.targetClass = new class extends AotAware {} });

        spec.it(`should define a ${methodName} method`, (params) => {
            const angularFn = params.targetClass[methodName];

            expect(() => angularFn()).not.toThrow();

            expect(params.targetClass[methodName]).toEqual(jasmine.any(Function));
        });
    }, ...Lifecycle.AngularLifecycleDecorator.lifecycleValues.map(methodName => ({ methodName })))();
});