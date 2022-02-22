import { Spec, Template, InputBuilder } from "detest-bdd";
import { Metadata } from "../src/metadata";
import { AutoPush } from "../src/autopush";
import { ChangeDetectorRef } from "@angular/core";

const DI_METADATA = "design:paramtypes";

const spec = Spec.create<{
    targetClass: any;
    cdRef: Pick<ChangeDetectorRef, "detectChanges" | "markForCheck">;
    cdProxy: AutoPush.ChangeDetectorProxy;
    bootstrappedInstance: TargetClassBase;
}>();

class TargetClassBase {
}

describe("Given a component that will use AutoPush functionality", () => {

    type DecoratorApplicationTemplateT = {
        existingChangeDetector: boolean;
        useProxy: boolean;
        forceDetectChanges: boolean;
    };

    const decoratorApplicationTemplateInput = InputBuilder
        .fragmentList<DecoratorApplicationTemplateT>({ useProxy: [true, false] })
        .fragment({ forceDetectChanges: true }, options => !options.useProxy)
        .fragmentList({ forceDetectChanges: [undefined!, false] });

    const DecoratorApplicationTemplateKeys: (keyof DecoratorApplicationTemplateT)[] = [
        "existingChangeDetector",
        "useProxy",
        "forceDetectChanges"
    ];

    describe("when applying AutoPush", Template(DecoratorApplicationTemplateKeys, decoratorApplicationTemplateInput, (
        existingChangeDetector: boolean,
        useProxy: boolean,
        forceDetectChanges: boolean
    ) => {

        spec.beforeEach((params) => {
            params.cdRef = jasmine.createSpyObj("ChangeDetectorRef", {
                detectChanges: function () {},
                markForCheck: function () {}
            });

            params.cdProxy = jasmine.createSpyObj("ChangeDetectorProxy", {
                doCheck: function () {}
            });

            params.targetClass = class TestTargetClass extends TargetClassBase {
                constructor() {
                    super();

                    if (useProxy) {
                        AutoPush.enable(this, params.cdProxy);
                    }
                    else {
                        AutoPush.enable(this, params.cdRef, { forceDetectChanges });
                    }
                }
            };

            if (existingChangeDetector) {
                Metadata.setMetadata(DI_METADATA, params.targetClass, [ChangeDetectorRef]);
            }
        });

        describe("when an instance of the component is created", () => {

            spec.beforeEach((params) => {
                params.bootstrappedInstance = new params.targetClass(params.cdRef);
            });

            describe("when the change detector proxy is invoked", () => {

                spec.beforeEach((params) => {
                    AutoPush.notifyChanges(params.bootstrappedInstance);
                });

                spec.it("should invoke the correct change detection function", (params) => {
                    if (useProxy) {
                        expect(params.cdProxy.doCheck).toHaveBeenCalled();
                    } else {
                        if (forceDetectChanges) {
                            expect(params.cdRef.detectChanges).toHaveBeenCalled();
                            expect(params.cdRef.markForCheck).not.toHaveBeenCalled();
                        } else {
                            expect(params.cdRef.markForCheck).toHaveBeenCalled();
                            expect(params.cdRef.detectChanges).not.toHaveBeenCalled();
                        }
                    }
                });
            });
        });
    }));
});