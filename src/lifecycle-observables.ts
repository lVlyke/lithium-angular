import { EventTypeFacadeList, SubjectProxyDecorator, EventFacade, EventType } from "./subject-proxy";

export type AngularLifecycleType = keyof {
    ngOnInit,
    ngOnDestroy
};

export namespace AngularLifecycleType {

    export const OnInit: AngularLifecycleType = "ngOnInit";
    export const OnDestroy: AngularLifecycleType = "ngOnDestroy";

    export const values: AngularLifecycleType[] = [OnInit, OnDestroy];
}

export namespace AngularLifecycleFacade {

    export const list: EventTypeFacadeList = EventFacade.list(AngularLifecycleType.values);
}

/** @PropertyDecoratorFactory */
export function AngularLifecycleDecorator(type: EventType): SubjectProxyDecorator {
    return SubjectProxyDecorator(type, AngularLifecycleFacade.list);
}

/** @PropertyDecorator */
export const OnInit: SubjectProxyDecorator = AngularLifecycleDecorator(AngularLifecycleType.OnInit);
/** @PropertyDecorator */
export const OnDestroy: SubjectProxyDecorator = AngularLifecycleDecorator(AngularLifecycleType.OnDestroy);