import { ComponentStateMetadata } from "./metadata"

/** @PropertyDecoratorFactory */
export function DeclareState<Name extends string = undefined>(options?: DeclareState.Options<Record<string, any>, Name> | Name) {

     /** @PropertyDecorator */
     return function<ComponentT>(target: Name extends ((keyof ComponentT) | undefined) ? ComponentT : never, key: string) {
        const publicKey = typeof options === "string" ? options : options?.name;

        ComponentStateMetadata.AddManagedProperty(target.constructor, { key, publicKey, async: false });
     }
}

export namespace DeclareState {

   export interface Options<ComponentT, K extends keyof ComponentT = keyof ComponentT> {
      name: K;
   }
}
