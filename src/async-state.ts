import { AsyncStateMetadata } from "./metadata"

/** @PropertyDecoratorFactory */
export function AsyncState(): PropertyDecorator {

     /** @PropertyDecorator */
     return function (target: any, propertyKey: string) {
         AsyncStateMetadata.AddAsyncProperty(target.constructor, propertyKey);
     }
}
