import { FactoryProvider, InjectionToken, Injector, Type } from "@angular/core";
import { ComponentState, ComponentStateRef, stateTokenFor } from "./component-state";

export type DirectiveState<DirectiveT> = ComponentState<DirectiveT>;
export type DirectiveStateRef<DirectiveT> = ComponentStateRef<DirectiveT>;

export const DirectiveStateRef = ComponentStateRef;

export namespace DirectiveState {

    export interface CreateOptions extends ComponentState.CreateOptions {
        uniqueToken?: boolean;
    }

    export function create<DirectiveT>(
        $class: Type<any>,
        options?: CreateOptions
    ): FactoryProvider {
        return createDirectiveState<DirectiveT>($class, options);
    }

    export function tokenFor(provider: FactoryProvider): any {
        return stateTokenFor(provider);
    }
}

export function createDirectiveState<DirectiveT>(
    $class: Type<any>,
    options?: DirectiveState.CreateOptions
): FactoryProvider {
    function isForwardRef($class: Type<any>): boolean {
        return !$class.name;
    }
    const useToken = options?.uniqueToken ?? isForwardRef($class);

    return {
        provide: useToken ? new InjectionToken<DirectiveT>($class.name) : DirectiveStateRef,
        useFactory: ComponentState.createFactory<DirectiveT>($class, options),
        deps: [Injector]
    };
}
