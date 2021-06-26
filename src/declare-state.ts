import type { StringKey } from "./lang-utils";
import { ComponentStateMetadata } from "./metadata"

type ValidateName<T, K extends keyof T, Name extends string> = 
   Name extends keyof T ? (T[Name] extends T[K] ? Name : never) : never;

/** @PropertyDecoratorFactory */
export function DeclareState<Name extends string = undefined>(publicName?: Name) {

   /** @PropertyDecorator */
   return function <ComponentT, K extends StringKey<ComponentT>>(
      target: Name extends undefined ? ComponentT : (ValidateName<ComponentT, K, Name> extends never ? never : ComponentT),
      propKey: Name extends undefined ? K : string
   ) {
      const key = propKey as K;
      const publicKey: StringKey<ComponentT> = publicName as ValidateName<ComponentT, K, Name>;

      ComponentStateMetadata.AddManagedProperty(target.constructor, { key, publicKey });
   }
}
