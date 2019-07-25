import { ChangeDetectorRef } from "@angular/core";
import { Metadata, AngularMetadata } from "./metadata";
import { Constructor } from "./managed-observable";

const DI_METADATA = "design:paramtypes";

/** @ClassDecoratorFactory */
export function AutoPush(): ClassDecorator {

    return function<T extends Constructor<any>>(constructor: T): T {
        // Get the dependency metadata for this component
        let diParams: any[] = Metadata.GetOwnMetadata(DI_METADATA, constructor, []);

        // Create the wrapper class to inject the ChangeDetector
        const wrapper = AutoPush.createInjectorWrapper<T>(constructor);

        // If there is no Change Detector being injected, augment the class with the Change Detector DI (JIT only)
        if (!diParams.some(type => type === ChangeDetectorRef)) {
            diParams = diParams.concat([ChangeDetectorRef]);
        }

        // Copy the DI metadata from the original class, augmented with the Change Detector, to the wrapper class (JIT only)
        Metadata.SetMetadata(
            DI_METADATA,
            wrapper,
            diParams
        );

        // Return the new wrapper class with the same name as the given class
        return { [constructor.name]: wrapper }[constructor.name];
    } as ClassDecorator;
}

export namespace AutoPush {

    const CHANGE_DETECTOR_REF = Symbol("cdRef");

    type ChangeDetectorLike = Pick<ChangeDetectorRef, "detectChanges">;

    export function createInjectorWrapper<T extends Constructor<any>>(constructor: T): T {
        // Create the wrapper class
        const result = class extends constructor {

            constructor(...args: any[]) {
                // Invoke the target class' constructor
                super(...args);
                
                // If the user hasn't explicitly set a change detector...
                if (!changeDetector(this)) {
                    // Find the injected change detector
                    const changeDetector = args.find(isChangeDetectorLike);

                    if (changeDetector) {
                        // Store the change detector for later use
                        enable(this, changeDetector);
                    } else {
                        throw new Error(`[${constructor.name}] A ChangeDetectorRef must be injected into a component with @AutoPush enabled.`);
                    }
                }
            }
        };

        // Ensure all metadata is preserved from the original class
        copyMetadata(result, constructor);
        return result;
    }

    export function changeDetector(component: any): ChangeDetectorLike {
        return Metadata.GetMetadata<ChangeDetectorRef>(CHANGE_DETECTOR_REF, component);
    }

    export function enable(component: any, changeDetector: ChangeDetectorLike) {
        Metadata.SetMetadata(CHANGE_DETECTOR_REF, component, changeDetector);
    }

    export function tryDetectChanges(component: any) {
        // Check to see if AutoPush is enabled on this component
        const cdRef: ChangeDetectorLike = changeDetector(component);

        if (cdRef) {
            // Notify Angular that there were changes to a component value
            cdRef.detectChanges();
        }
    }

    export function isChangeDetectorLike(object: any): object is ChangeDetectorLike {
        return object && typeof object.detectChanges === "function";
    }

    function copyAngularMetadata(dest: any, src: any) {
        // Copy all metadata used by Angular to the new constructor
        let annotationsMetadata = AngularMetadata.getAnnotationsMetadata(src);
        let parametersMetadata = AngularMetadata.getParametersMetadata(src);
        let propMetadata = AngularMetadata.getPropMetadata(src);

        if (annotationsMetadata) {
            Object.defineProperty(dest, AngularMetadata.ANNOTATIONS, { value: annotationsMetadata });
        }
        if (parametersMetadata) {
            Object.defineProperty(dest, AngularMetadata.PARAMETERS, { value: parametersMetadata });
        }
        if (propMetadata) {
            Object.defineProperty(dest, AngularMetadata.PROP_METADATA, { value: propMetadata });
        }
    }

    function copyClassMetadata(dest: any, src: any) {
        // Copy all existing metadata from the target class constructor to the new constructor
        Metadata.GetAllMetadata(src).forEach((value, key) => Metadata.SetMetadata(key, dest, value));
    }

    function copyMetadata(dest: any, src: any) {
        copyAngularMetadata(dest, src);
        copyClassMetadata(dest, src);
    }
}