import { ChangeDetectorRef } from "@angular/core";
import { Metadata } from "./metadata";

/**
 * @ClassDecoratorFactory
*/
export function AutoPush(_options?: AutoPush.CdRefOptions): ClassDecorator {

    /**
     * @deprecated
    */
    return function() {
        throw new Error(
`
The Lithium @AutoPush() class decorator has been removed and should be replaced with AutoPush.enable.
See here for more info: https://github.com/lVlyke/lithium-angular/docs/intro-guide.md#autopush
`)
    }
}

export namespace AutoPush {

    const CHANGE_DETECTOR_DATA = Symbol("cdRefData");

    type ChangeDetectorLike = Pick<ChangeDetectorRef, "detectChanges" | "markForCheck">;

    interface Metadata {
        changeDetector: ChangeDetectorProxy;
        options: Options;
    }

    export interface ChangeDetectorProxy {
        doCheck(): void;
    }

    export namespace ChangeDetectorProxy {

        export function fromRef(ref: ChangeDetectorLike, options: CdRefOptions): ChangeDetectorProxy {
            return {
                doCheck() {
                    if (options.forceDetectChanges) {
                        ref.detectChanges();
                    } else {
                        ref.markForCheck();
                    }
                }
            };
        }
    }

    export interface Options {}

    export interface CdRefOptions extends Options {
        forceDetectChanges?: boolean;
    }

    export function changeDetector(component: any): ChangeDetectorProxy | undefined {
        const metadata = changeDetectorMetadata(component);
        return metadata ? metadata.changeDetector : undefined;
    }

    export function enable(component: any, changeDetector: ChangeDetectorLike, options?: CdRefOptions): void;
    export function enable(component: any, changeDetector: ChangeDetectorProxy, options?: Options): void;

    export function enable(component: any, changeDetector: ChangeDetectorLike | ChangeDetectorProxy, options: Options = {}) {
        Metadata.setMetadata(CHANGE_DETECTOR_DATA, component, {
            options,
            changeDetector: isProxy(changeDetector) ? changeDetector : ChangeDetectorProxy.fromRef(changeDetector, options)
        });
    }

    export function notifyChanges(component: any) {
        // Check to see if AutoPush is enabled on this component
        const cdData = changeDetectorMetadata(component);

        if (cdData) {
            // Notify change detector that there were changes to a component value
            cdData.changeDetector.doCheck();
        }
    }

    export function isChangeDetectorLike(object: any): object is ChangeDetectorLike {
        return object && typeof object.detectChanges === "function";
    }

    function changeDetectorMetadata(component: any): Metadata {
        return Metadata.getMetadata(CHANGE_DETECTOR_DATA, component);
    }

    function isProxy(input: any): input is ChangeDetectorProxy {
        return input && typeof input.doCheck === "function";
    }
}