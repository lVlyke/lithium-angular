import { ComponentStateMetadata } from "./metadata"

/** @PropertyDecoratorFactory */
export function AsyncState(): PropertyDecorator {

     /** @PropertyDecorator */
     return function (target: any, propertyKey: string) {
        ComponentStateMetadata.AddAsyncProperty(target.constructor, propertyKey);
     }
}
