import { Spec } from "detest-bdd";
import { AotAware } from "../src/aot";

const spec = Spec.create<{}>();

describe("Given an AotAware class", () => {

    spec.it("should extend AotDynamic", () => {
        expect(Object.getPrototypeOf(AotAware).name).toEqual("AotDynamic");
    });
});