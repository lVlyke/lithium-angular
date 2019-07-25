import { Spec, Template, InputBuilder } from "detest-bdd";
import { Metadata, AngularMetadata } from "../src/metadata";
import { AutoPush } from "../src/autopush";
import { ChangeDetectorRef } from "@angular/core";

const DI_METADATA = "design:paramtypes";
type ChangeDetectorLike = Pick<ChangeDetectorRef, "detectChanges">;

const spec = Spec.create<{
    targetClass: any;
    cdRef: ChangeDetectorLike;
    bootstrappedClass: any;
    bootstrappedInstance: TargetClassBase;
}>();

class TargetClassBase {
}

describe("Given a component that will use AutoPush functionality", () => {

    type DecoratorApplicationTemplateT = {
        instanceBootstrap: boolean;
        existingChangeDetector: boolean;
    };

    const decoratorApplicationTemplateInput = InputBuilder
        .fragmentList<DecoratorApplicationTemplateT>({ instanceBootstrap: [true, false] })
        .fragmentList({ existingChangeDetector: [true, false] }, options => !options.instanceBootstrap);

    const DecoratorApplicationTemplateKeys: (keyof DecoratorApplicationTemplateT)[] = [
        "instanceBootstrap",
        "existingChangeDetector"
    ];

    describe("when applying AutoPush", Template(DecoratorApplicationTemplateKeys, decoratorApplicationTemplateInput, (
        instanceBootstrap: boolean,
        existingChangeDetector: boolean
    ) => {

        spec.beforeEach((params) => {
            params.cdRef = jasmine.createSpyObj("ChangeDetectorRef", {
                detectChanges: function () {}
            });
            params.targetClass = class TestTargetClass extends TargetClassBase {
                constructor() {
                    super();

                    if (instanceBootstrap) {
                        AutoPush.enable(this, params.cdRef);
                    }
                }
            };
            
            // Add Angular metadata to the target classS
            Object.defineProperty(params.targetClass, AngularMetadata.PARAMETERS, { value: ["a", "b", "c"] });
            Object.defineProperty(params.targetClass, AngularMetadata.PROP_METADATA, { value: ["d", "e", "f"] });
            Object.defineProperty(params.targetClass, AngularMetadata.ANNOTATIONS, { value: ["g", "h", "i"] });

            if (existingChangeDetector) {
                Metadata.SetMetadata(DI_METADATA, params.targetClass, [ChangeDetectorRef]);
            }

            // Only use the decorator if not instance bootstrapping
            params.bootstrappedClass = instanceBootstrap ? params.targetClass : AutoPush()(params.targetClass);
        });

        if (!instanceBootstrap) {
            describe("when it is applied using the @AutoPush decorator", () => {

                spec.it("then it should create a wrapper class that extends the base class", (params) => {
                    expect(Object.getPrototypeOf(params.bootstrappedClass)).toBe(params.targetClass);
                });
    
                spec.it("then it should copy all reflection metadata from the target class to the wrapper class", (params) => {
                    expect(Object.keys(Metadata.GetAllMetadata(params.bootstrappedClass))).toEqual(Object.keys(Metadata.GetAllMetadata(params.targetClass)));
                });
    
                spec.it("then it should copy all Angular metadata from the target class to the wrapper class", (params) => {
                    expect(AngularMetadata.getAnnotationsMetadata(params.bootstrappedClass)).toEqual(AngularMetadata.getAnnotationsMetadata(params.targetClass));
                    expect(AngularMetadata.getParametersMetadata(params.bootstrappedClass)).toEqual(AngularMetadata.getParametersMetadata(params.targetClass));
                    expect(AngularMetadata.getPropMetadata(params.bootstrappedClass)).toEqual(AngularMetadata.getPropMetadata(params.targetClass));
                });
    
                if (existingChangeDetector) {
                    describe("when the target class has an existing Change Detector specified in it's DI metadata", () => {
    
                        spec.it("should NOT augment the wrapper DI metdata with a new Change Detector ref", (params) => {
                            const targetMetadata = Metadata.GetOwnMetadata<any[]>(DI_METADATA, params.targetClass);
                            const wrapperMetadata = Metadata.GetOwnMetadata<any[]>(DI_METADATA, params.bootstrappedClass);
    
                            expect(wrapperMetadata).toEqual(targetMetadata);
                        });
                    });
                } else {
                    describe("when the target class does NOT have an existing Change Detector specified in it's DI metadata", () => {
    
                        spec.it("should augment the wrapper DI metdata with a new Change Detector ref", (params) => {
                            const targetMetadata = Metadata.GetOwnMetadata<any[]>(DI_METADATA, params.targetClass);
                            const wrapperMetadata = Metadata.GetOwnMetadata<any[]>(DI_METADATA, params.bootstrappedClass);
    
                            expect(wrapperMetadata).toEqual(targetMetadata.concat([ChangeDetectorRef]));
                        });
                    });
                }

                describe("when an instance of the component is created", () => {
                    describe("when no Change Detector is specified as a dependency", () => {
    
                        spec.it("should throw an error", (params) => {
                            expect(() => new params.bootstrappedClass()).toThrowError();
                        });
                    });
                });
            });
        }

        describe("when an instance of the component is created", () => {

            spec.beforeEach((params) => {
                params.bootstrappedInstance = new params.bootstrappedClass(params.cdRef);
            });

            spec.it("should store the component's change detector for later use", (params) => {
                expect(AutoPush.changeDetector(params.bootstrappedInstance)).toEqual(params.cdRef);
            });
        });
    }));
});