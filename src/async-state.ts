import { ComponentStateMetadata } from "./metadata"

/** @PropertyDecoratorFactory */
export function AsyncState(): PropertyDecorator {

     /** @PropertyDecorator */
     return function (target: any, key: string) {
        ComponentStateMetadata.AddManagedProperty(target.constructor, { key, async: true });
     }
}
