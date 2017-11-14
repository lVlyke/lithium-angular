import { EventSource } from "./event-source";
import { StateEmitter } from "./state-emitter";
import { Metadata } from "./metadata";

/** @ClassDecoratorFactory */
export function Reactive(): ClassDecorator {
    return function (constructor) {
        // Create a proxy constructor for the target class that bootstraps all EventSource and StateEmitter properties per-instance
        let bootstrapConstructor = function $$ReactiveBootstrapped(...args: any[]) {
            // Perform bootstrap initialization
            EventSource.Bootstrap(this);
            StateEmitter.Bootstrap(this);

            // Apply the original constructor
            return constructor.apply(this, args);
        };

        // Assign the target ctor's prototype chain and data to the new constructor
        bootstrapConstructor.prototype = constructor.prototype;
        Object.setPrototypeOf(bootstrapConstructor, Object.getPrototypeOf(constructor));

        // Copy all existing metadata from the target class constructor to the new constructor
        Metadata.GetAllMetadata(constructor).forEach((value, key) => Metadata.SetMetadata(key, bootstrapConstructor, value));

        // Return the new constructor
        return bootstrapConstructor as any;
    };
}