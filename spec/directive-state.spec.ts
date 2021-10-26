import { Directive, FactoryProvider, forwardRef, InjectionToken, Injector, Type } from "@angular/core";
import { InputBuilder, Spec, Template } from "detest-bdd";
import { ComponentState } from "../src/component-state";
import { DirectiveState, createDirectiveState, DirectiveStateRef } from "../src/directive-state";

describe("Given the createDirectiveState function", () => {
    
    interface SpecParams {
        $class: any;
        createResult: FactoryProvider;
        expectedFactory: Function;
    }

    const spec = Spec.create<SpecParams>();

    type DirectiveClassTemplateInput = {
        forwardDecl: boolean;
        options?: DirectiveState.CreateOptions;
    };

    const directiveClassTemplateInput = InputBuilder
        .fragment<DirectiveClassTemplateInput>({ options: undefined })
        .fragmentList({ forwardDecl: [true, false]})
        .fragmentBuilder("options", InputBuilder
            .fragmentList<DirectiveState.CreateOptions>({ lazy: [true, false, undefined] })
        );

    const directiveClassTemplateKeys: (keyof DirectiveClassTemplateInput)[] = ["options"];

    describe("when called with a directive class", Template(directiveClassTemplateKeys, directiveClassTemplateInput, (
        forwardDecl: boolean,
        options?: DirectiveState.CreateOptions
    ) => {

        spec.beforeEach((params) => {
            params.expectedFactory = () => {};
            spyOn(ComponentState, "createFactory").and.returnValue(params.expectedFactory as any);

            if (forwardDecl) {
                params.$class = forwardRef(() => TestDirective);
                params.createResult = createDirectiveState(params.$class, options);

                @Directive({ providers: [params.createResult] })
                class TestDirective {}
            } else {
                @Directive({ providers: [params.createResult = createDirectiveState(TestDirective, options)] })
                class TestDirective {}
    
                params.$class = TestDirective;
            }
        });

        spec.it("should return the expected provider", (params) => {
            function isForwardRef($class: Type<any>): boolean {
                return !$class.name;
            }
            
            const useToken = isForwardRef(params.$class);
            
            expect(params.createResult).toEqual(jasmine.objectContaining({
                provide: useToken ? jasmine.any(InjectionToken) : DirectiveStateRef,
                useFactory: params.expectedFactory,
                deps: jasmine.arrayWithExactContents([Injector])
            } as Record<string, unknown>));
        });
    }));
});
