import { Subscription, Observable, Subject, BehaviorSubject, Subscriber, TeardownLogic, EMPTY, ReplaySubject, SchedulerLike } from "rxjs";
import { CommonMetadata, Metadata } from "./metadata";

export type Constructor<T> = new (...args: any[]) => T;
export type GenericConstructor<BaseT> = new<T extends BaseT> (...args: any[]) => T;
export type BaseObservable = Observable<{}>;

// TODO fix generics when TypeScript mixin issue is fixed: https://github.com/Microsoft/TypeScript/issues/24122
export function ManagedObservableWrapper/*<T, BaseObservable extends Observable<T>>*/($class: Constructor<BaseObservable>): GenericConstructor<BaseObservable> {

    class _Managed extends $class {

        protected subscriptions?: Subscription = new Subscription();

        constructor(private componentInstance: any, ...args: any[]) {
            super(...args);

            // Automatically handle unsubscribing on component's ngOnDestroy event
            this.subscriptions!.add(componentInstance[CommonMetadata.MANAGED_ONDESTROY_KEY].subscribe(() => {
                // Mark the component instance as destroyed
                Metadata.setMetadata(CommonMetadata.MANAGED_INSTANCE_DESTROYED_KEY, this.componentInstance, true);

                this.subscriptions?.unsubscribe();
                this.subscriptions = undefined;
                this.componentInstance = undefined;

                if (this instanceof Subject) {
                    this.complete();
                }
            }));
        }

        public subscribe(...args: any[]): Subscription {
            if (this.componentInstance && !CommonMetadata.instanceIsDestroyed(this.componentInstance)) {
                const subscription = super.subscribe(...args);

                // Manage new subscription
                this.subscriptions!.add(subscription);
                return subscription;
            } else {
                return EMPTY.subscribe();
            }
        }
    };

    return _Managed as GenericConstructor<BaseObservable>;
}

export class ManagedObservable<T> extends ManagedObservableWrapper(Observable)<Observable<T>> {

    constructor(componentInstance: any, subscribe?: (this: Observable<T>, subscriber: Subscriber<T>) => TeardownLogic) {
        super(componentInstance, subscribe);
    }
}

export class ManagedSubject<T> extends ManagedObservableWrapper(Subject)<Subject<T>> {

    constructor(componentInstance: any) {
        super(componentInstance);
    }
}

export class ManagedBehaviorSubject<T> extends ManagedObservableWrapper(BehaviorSubject)<BehaviorSubject<T>> {

    constructor(componentInstance: any, initialValue: T) {
        super(componentInstance, initialValue);
    }
}

export class ManagedReplaySubject<T> extends ManagedObservableWrapper(ReplaySubject)<ReplaySubject<T>> {

    constructor(componentInstance: any, bufferSize?: number, windowTime?: number, scheduler?: SchedulerLike) {
        super(componentInstance, bufferSize, windowTime, scheduler);
    }
}
