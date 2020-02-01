import { Spec } from "detest-bdd";
import { AotAware } from "../src/aot";
import { LiComponent } from "../src/component";

const spec = Spec.create<{}>();

describe("Given an AotAware class", () => {

    spec.it("it should equal LiComponent", () => {
        expect(AotAware).toBe(LiComponent)
    });
});
