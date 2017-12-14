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

        // Copy all metadata from the original class
        Reactive.CopyMetadata(bootstrapConstructor, constructor);

        // Return the new constructor
        return bootstrapConstructor as any;
    };
}

export namespace Reactive {

    export namespace AngularMetadata {
        export const ANNOTATIONS = "__annotations__";
        export const PARAMETERS = "__paramaters__";
        export const PROP_METADATA = "__prop__metadata__";
    }

    export function CopyAngularMetadata(dest: any, src: any) {
        // Copy all metadata used by Angular to the new constructor
        let annotationsMetadata = Object.getOwnPropertyDescriptor(src, AngularMetadata.ANNOTATIONS);
        let parametersMetadata = Object.getOwnPropertyDescriptor(src, AngularMetadata.PARAMETERS);
        let propMetadata = Object.getOwnPropertyDescriptor(src, AngularMetadata.PROP_METADATA);

        if (annotationsMetadata) {
            Object.defineProperty(dest, AngularMetadata.ANNOTATIONS, { value: annotationsMetadata.value });
        }
        if (parametersMetadata) {
            Object.defineProperty(dest, AngularMetadata.PARAMETERS, { value: parametersMetadata.value });
        }
        if (propMetadata) {
            Object.defineProperty(dest, AngularMetadata.PROP_METADATA, { value: propMetadata.value });
        }
    }

    export function CopyClassMetadata(dest: any, src: any) {
        // Copy all existing metadata from the target class constructor to the new constructor
        Metadata.GetAllMetadata(src).forEach((value, key) => Metadata.SetMetadata(key, dest, value));
    }

    export function CopyMetadata(dest: any, src: any) {
        CopyAngularMetadata(dest, src);
        CopyClassMetadata(dest, src);
    }
}