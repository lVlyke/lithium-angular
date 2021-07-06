import { FactoryProvider, InjectionToken, Injector, Type } from "@angular/core";
import { ComponentState, ComponentStateRef } from "./component-state";

export type DirectiveState<DirectiveT> = ComponentState<DirectiveT>;
export type DirectiveStateRef<DirectiveT> = ComponentStateRef<DirectiveT>;

export namespace DirectiveState {

    export function create<DirectiveT>($class: Type<any>): FactoryProvider {
        return {
            provide: new InjectionToken<DirectiveT>($class.name),
            useFactory: ComponentState.createFactory<DirectiveT>($class),
            deps: [Injector]
        };
    }

    export function tokenFor(provider: FactoryProvider): any {
        return ComponentState.tokenFor(provider);
    }
}

export const stateTokenFor = DirectiveState.tokenFor;
