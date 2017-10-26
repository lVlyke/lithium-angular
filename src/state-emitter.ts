import { Subject, Observable } from "rxjs";
import { EmitterMetadata, EmitterType } from "./emitter-metadata";

export type StateEmitterDecorator = ((target: any, propertyKey: string) => any) & { emitterType: EmitterType };

/** @PropertyDecoratorFactory */
export function StateEmitter(emitterType?: EmitterType, defaultValue?: any): StateEmitterDecorator {
    /** @PropertyDecorator */
    return Object.assign(function (target: any, propertyKey: string) {
        // If an emitterType wasn't specified...
        if (!emitterType) {
            // Try to deduce the emitterType from the propertyKey
            if (propertyKey.endsWith("$")) {
                emitterType = propertyKey.substring(0, propertyKey.length - 1);
            }
            else {
                throw new Error(`@StateEmitter error: emitterType could not be deduced from propertyKey "${propertyKey}" (only keys ending with '$' can be auto-deduced).`);
            }
        }

        // Create the event source metadata for the decorated property
        StateEmitter.CreateMetadata(emitterType, target, propertyKey, defaultValue);
    }, { emitterType });
}

export namespace StateEmitter {

    export namespace Facade {

        export function CreateSetter(type: EmitterType): (value: any) => void {
            return function (value: any) {
                // Notify the subject of the new value
                EmitterMetadata.GetMetadataMap(this.constructor).get(type).subject.next(value);
            };
        }

        export function CreateGetter(type: EmitterType, defaultValue?: any): () => any {
            let lastValue: any = defaultValue;
            let subscription: any;

            return function (): any {
                // Create a subscription to subject changes if not subscribed
                if (!subscription) {
                    // Update when a new value is emitted
                    let subjectInfo: EmitterMetadata.SubjectInfo = EmitterMetadata.GetMetadataMap(this.constructor).get(type);
                    subscription = subjectInfo.subject.subscribe((value: any) => lastValue = value);
                }

                // Return the last value that was emitted
                return lastValue;
            };
        }
    }

    export function CreateMetadata(type: EmitterType, target: any, propertyKey: string, defaultValue?: any): EmitterMetadata.SubjectInfo {
        if (target[type] && target[type].emitterType !== type) {
            // Make sure the target class doesn't have a custom method already defined for this event type
            throw new Error(`@StateEmitter bootstrap failed. Class already has a custom ${type} method.`);
        }
        else if (!target[type]) {
            // Assign the facade getter and setter to the target object
            Object.defineProperty(target, type, {
                get: Facade.CreateGetter(type),
                set: Facade.CreateSetter(type)
            });
        }

        // Create initial metadata
        let metadata: EmitterMetadata.SubjectInfo = {
            propertyKey: propertyKey,
            defaultValue: defaultValue,
            subject: undefined
        };

        // Add the propertyKey to the class' metadata
        EmitterMetadata.GetOwnMetadataMap(target.constructor).set(type, metadata);
        return metadata;
    }
}