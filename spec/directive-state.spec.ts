import { Directive, FactoryProvider, forwardRef, Injector } from "@angular/core";
import { Spec } from "detest-bdd";
import { ComponentState } from "../src/component-state";
import { DirectiveState, stateTokenFor } from "../src/directive-state";

describe("Given the DirectiveState.create function", () => {
    
    interface SpecParams {
        $class: any;
        createResult: FactoryProvider;
        expectedFactory: Function;
    }

    const spec = Spec.create<SpecParams>();

    describe("when called with a directive class", () => {

        spec.beforeEach((params) => {
            params.expectedFactory = () => {};
            spyOn(ComponentState, "createFactory").and.returnValue(params.expectedFactory as any);

            params.createResult = DirectiveState.create(forwardRef(() => TestDirective));

            @Directive({ providers: [params.createResult] })
            class TestDirective {}

            params.$class = TestDirective;
        });

        spec.it("should return the expected provider", (params) => {
            expect(params.createResult).toEqual(jasmine.objectContaining({
                provide: params.createResult.provide,
                useFactory: params.expectedFactory,
                deps: jasmine.arrayWithExactContents([Injector])
            } as Record<string, unknown>));
        });
    });
});

describe("Given the DirectiveState.tokenFor function", () => {

    interface SpecParams {
        provider: FactoryProvider;
    }

    const spec = Spec.create<SpecParams>();

    spec.beforeEach((params) => {
        params.provider = {
            provide: {},
            useFactory: () => {}
        };
    });

    describe("when called with a given provider", () => {

        spec.it("should return the expected token", (params) => {
            expect(DirectiveState.tokenFor(params.provider)).toBe(params.provider.provide);
        });
    });
});

describe("Given the stateTokenFor function", () => {

    it("should be an alias of DirectiveState.tokenFor", () => {
        expect(stateTokenFor).toBe(DirectiveState.tokenFor);
    });
});
