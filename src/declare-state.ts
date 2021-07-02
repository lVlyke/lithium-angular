import type { IfEquals, Publicize, StringKey } from "./lang-utils";
import { ComponentStateMetadata } from "./metadata";

/** @description Ensures that `T[Name]` is the same type as `T[K]`.
 * `K` is not required to be a strict `keyof T` since it may be a private field.
 */
type ValidateName<T, K extends string, Name extends string> = 
   Name extends keyof T
      ? (IfEquals<T[Name], Publicize<T, K>[K]> extends never ? never : Name)
      : never

/** @PropertyDecoratorFactory
 * @description Explicitly declares the decorated property as a stateful property to be tracked by `ComponentStateRef`.
 * @param publicName (Optional) The public property that this state should be exposed through.
*/
export function DeclareState<Name extends string = undefined>(publicName?: Name) {

   /** @PropertyDecorator */
   return function<ComponentT, K extends string>(
      target: Name extends undefined ? ComponentT : (ValidateName<ComponentT, K, Name> extends never ? never : ComponentT),
      propKey: K
   ) {
      const key = propKey as any;
      const publicKey: StringKey<ComponentT> = publicName as ValidateName<ComponentT, K, Name>;

      ComponentStateMetadata.AddManagedProperty(target.constructor, { key, publicKey });
   }
}
