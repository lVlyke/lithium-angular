import { Spec } from "detest-bdd";
import { LiComponent } from "../src/component";

const spec = Spec.create<{}>();

describe("Given a LiComponent class", () => {

    spec.it("it should extend TemplateDynamic", () => {
        expect(Object.getPrototypeOf(LiComponent).name).toEqual("TemplateDynamic");
    });
});
