import { Spec } from "detest-bdd";
import { Reactive } from "../src/component";
import { StateEmitter } from "../src/state-emitter";
import { EventSource } from "../src/event-source";
import { Observable } from "rxjs/Observable";
import { Subject } from "rxjs/Subject";
import { Metadata } from "../src/metadata";
import { AngularMetadata } from "../src/angular-metadata";

const spec = Spec.create<{
    targetClass: any;
    bootstrappedClass: any;
    bootstrappedInstance: TargetClassBase;
    bootstrappedInstance2: TargetClassBase;
}>();

class TargetClassBase {

    @StateEmitter() public testEmitter$: Subject<any>;
    @EventSource() public testEventSource$: Observable<any>;
}

describe("Given a Reactive class decorator", () => {

    describe("when it is applied", () => {

        spec.beforeEach((params) => {
            params.targetClass = class TestTargetClass extends TargetClassBase {};
            params.bootstrappedClass = Reactive()(params.targetClass);
        });

        spec.it("then it should preserve the class' prototype chain on the bootstrapped class", (params) => {
            expect(params.bootstrappedClass.prototype).toEqual(params.targetClass.prototype);
        });

        spec.it("then it should set the target class as the bootstrapped class' prototype", (params) => {
            expect(Object.getPrototypeOf(params.bootstrappedClass)).toEqual(params.targetClass);
        });

        spec.it("then it should copy all reflection metadata from the target class to the bootstrapped class", (params) => {
            expect(Metadata.GetAllMetadata(params.bootstrappedClass)).toEqual(Metadata.GetAllMetadata(params.targetClass));
        });

        spec.it("then it should copy all Angular metadata from the target class to the bootstrapped class", (params) => {
            expect(AngularMetadata.getAnnotationsMetadata(params.bootstrappedClass)).toEqual(AngularMetadata.getAnnotationsMetadata(params.targetClass));
            expect(AngularMetadata.getParametersMetadata(params.bootstrappedClass)).toEqual(AngularMetadata.getParametersMetadata(params.targetClass));
            expect(AngularMetadata.getPropMetadata(params.bootstrappedClass)).toEqual(AngularMetadata.getPropMetadata(params.targetClass));
        });

        describe("when the bootstrapped class is instantiated", () => {

            spec.beforeEach((params) => {
                params.bootstrappedInstance = new params.bootstrappedClass();
                params.bootstrappedInstance2 = new params.bootstrappedClass();
            });

            spec.it("then it should bootstrap all StateEmitters in the class", (params) => {
                expect(params.bootstrappedInstance.testEmitter$).toEqual(jasmine.any(Subject));
            });

            spec.it("then it should create unique StateEmitters for each class instance", (params) => {
                expect(params.bootstrappedInstance.testEmitter$).not.toBe(params.bootstrappedInstance2.testEmitter$);
            });

            spec.it("then it should bootstrap all EventSources in the class", (params) => {
                expect(params.bootstrappedInstance.testEventSource$).toEqual(jasmine.any(Observable));
            });

            spec.it("then it should create unique EventSources for each class instance", (params) => {
                expect(params.bootstrappedInstance.testEventSource$).not.toBe(params.bootstrappedInstance2.testEventSource$);
            });
        });
    });
});