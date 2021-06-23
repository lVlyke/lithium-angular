import { ComponentStateMetadata } from "./metadata"

/** @PropertyDecoratorFactory */
export function DeclareState(): PropertyDecorator {

     /** @PropertyDecorator */
     return function (target: any, key: string) {
        ComponentStateMetadata.AddManagedProperty(target.constructor, { key, async: false });
     }
}
