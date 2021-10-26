import { FactoryProvider, InjectionToken, Injector, Type } from "@angular/core";
import { ComponentState, ComponentStateRef, stateTokenFor } from "./component-state";

export type DirectiveState<DirectiveT> = ComponentState<DirectiveT>;
export type DirectiveStateRef<DirectiveT> = ComponentStateRef<DirectiveT>;

export const DirectiveStateRef = ComponentStateRef;

export namespace DirectiveState {

    export type CreateOptions = ComponentState.CreateOptions;

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
    return {
        // If $class is a declaration and not a forwardRef, provide service as DirectiveStateRef (structural directives)
        // If $class is a forwardRef, provide service as a unique token (attribute directives)
        provide: $class.name ? DirectiveStateRef : new InjectionToken<DirectiveT>($class.name),
        useFactory: ComponentState.createFactory<DirectiveT>($class, options),
        deps: [Injector]
    };
}
