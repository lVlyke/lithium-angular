import { Template, Spec } from "detest-bdd";
import { ManagedBehaviorSubject, ManagedObservable, ManagedSubject, Constructor } from "../src/managed-observable";
import { CommonMetadata } from "../src/metadata";
import { Subject, Subscription } from "rxjs";

class ComponentFixture {
    [CommonMetadata.MANAGED_ONDESTROY_KEY] = new Subject<void>();
}

const spec = Spec.create<{
    component: ComponentFixture;
    observable: ManagedObservable<void>;
    subscriptions: Subscription[];
    called: Function;
    neverCalled: Function;
}>();

describe("Given a ManagedObservableWrapper mixin", () => {

    type ManagedWrapper = Constructor<ManagedObservable<void>>;

    Template.withInputs<{ ManagedWrapper: ManagedWrapper }>(["ManagedWrapper"], (ManagedWrapper: ManagedWrapper) => {

        spec.beforeEach(params => {
            params.component = new ComponentFixture();
            params.observable = new ManagedWrapper(params.component);
            params.subscriptions = [];
        });

        describe(`when an instance of type ${ManagedWrapper.name} is constructed`, () => {

            describe("when there are subscribers to it", () => {

                spec.beforeEach((params) => {
                    params.called = jasmine.createSpy("called");

                    for (let i = 0; i < 30; ++i) {
                        params.subscriptions.push(params.observable.subscribe(params.called as any));
                    }
                });

                if (ManagedWrapper === ManagedBehaviorSubject) { // TODO
                    spec.it("should invoke the onNext callback",  (params) => {
                        expect(params.called).toHaveBeenCalledTimes(30);
                    });
                }

                spec.it("should not mark the component as destroyed", (params) => {
                    expect(CommonMetadata.instanceIsDestroyed(params.component)).toBeFalsy();
                });

                spec.it("should not unsubscribe any subscribers", (params) => {
                    params.subscriptions.forEach(subscription => {
                        expect(subscription.closed).toBeFalsy();
                    });
                });

                describe("when the component is destroyed", () => {

                    spec.beforeEach((params) => {
                        params.component[CommonMetadata.MANAGED_ONDESTROY_KEY].next();
                    });

                    spec.it("should mark the component as destroyed", (params) => {
                        expect(CommonMetadata.instanceIsDestroyed(params.component)).toBeTruthy();
                    });

                    spec.it("should unsubscribe all subscribers", (params) => {
                        params.subscriptions.forEach(subscription => {
                            expect(subscription.closed).toBeTruthy();
                        });
                    });

                    describe("when there are new subscriptions", () => {

                        spec.beforeEach((params) => {
                            params.neverCalled = jasmine.createSpy("neverCalled");
                            params.observable.subscribe(params.neverCalled as any);
                        });

                        if (ManagedWrapper === ManagedBehaviorSubject) { // TODO
                            spec.it("should not invoke the onNext callback",  (params) => {
                                expect(params.neverCalled).not.toHaveBeenCalled();
                            });
                        }
                    });
                });
            });
        });
    },
    { ManagedWrapper: ManagedObservable },
    { ManagedWrapper: ManagedSubject },
    { ManagedWrapper: ManagedBehaviorSubject }
    )();
});