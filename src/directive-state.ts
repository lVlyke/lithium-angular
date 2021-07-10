import { FactoryProvider, InjectionToken, Injector, Type } from "@angular/core";
import { ComponentState, ComponentStateRef } from "./component-state";

export type DirectiveState<DirectiveT> = ComponentState<DirectiveT>;
export type DirectiveStateRef<DirectiveT> = ComponentStateRef<DirectiveT>;

export namespace DirectiveState {

    export type CreateOptions = ComponentState.CreateOptions;

    export function create<DirectiveT>(
        $class: Type<any>,
        options?: CreateOptions
    ): FactoryProvider {
        return {
            provide: new InjectionToken<DirectiveT>($class.name),
            useFactory: ComponentState.createFactory<DirectiveT>($class, options),
            deps: [Injector]
        };
    }

    export function tokenFor(provider: FactoryProvider): any {
        return ComponentState.tokenFor(provider);
    }
}

export const stateTokenFor = DirectiveState.tokenFor;
