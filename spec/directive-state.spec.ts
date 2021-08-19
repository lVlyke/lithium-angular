import { Directive, FactoryProvider, forwardRef, Injector } from "@angular/core";
import { InputBuilder, Spec, Template } from "detest-bdd";
import { ComponentState } from "../src/component-state";
import { DirectiveState, createDirectiveState } from "../src/directive-state";

describe("Given the createDirectiveState function", () => {
    
    interface SpecParams {
        $class: any;
        createResult: FactoryProvider;
        expectedFactory: Function;
    }

    const spec = Spec.create<SpecParams>();

    type DirectiveClassTemplateInput = {
        options?: DirectiveState.CreateOptions;
    };

    const directiveClassTemplateInput = InputBuilder
        .fragment<DirectiveClassTemplateInput>({ options: undefined })
        .fragmentBuilder("options", InputBuilder
            .fragmentList<DirectiveState.CreateOptions>({ lazy: [true, false, undefined] })
        );

    const directiveClassTemplateKeys: (keyof DirectiveClassTemplateInput)[] = ["options"];

    describe("when called with a directive class", Template(directiveClassTemplateKeys, directiveClassTemplateInput, (
        options?: ComponentState.CreateOptions
    ) => {

        spec.beforeEach((params) => {
            params.expectedFactory = () => {};
            spyOn(ComponentState, "createFactory").and.returnValue(params.expectedFactory as any);

            params.createResult = createDirectiveState(forwardRef(() => TestDirective), options);

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
    }));
});
