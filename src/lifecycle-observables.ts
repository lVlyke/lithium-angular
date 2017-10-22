import { EventTypeFacadeList, SubjectProxyDecorator, EventFacade, EventType } from "./subject-proxy";

export type AngularLifecycleType = keyof {
    ngOnChanges,
    ngOnInit,
    ngOnDestroy
    ngDoCheck,
    ngAfterContentInit,
    ngAfterContentChecked,
    ngAfterViewInit,
    ngAfterViewChecked
};

export namespace AngularLifecycleType {

    export const OnChanges: AngularLifecycleType = "ngOnChanges";
    export const OnInit: AngularLifecycleType = "ngOnInit";
    export const OnDestroy: AngularLifecycleType = "ngOnDestroy";
    export const DoCheck: AngularLifecycleType = "ngDoCheck";
    export const AfterContentInit: AngularLifecycleType = "ngAfterContentInit";
    export const AfterContentChecked: AngularLifecycleType = "ngAfterContentChecked";
    export const AfterViewInit: AngularLifecycleType = "ngAfterViewInit";
    export const AfterViewChecked: AngularLifecycleType = "ngAfterViewChecked";

    export const values: AngularLifecycleType[] = [
        OnChanges,
        OnInit,
        OnDestroy,
        DoCheck,
        AfterContentInit,
        AfterContentChecked,
        AfterViewInit,
        AfterViewChecked
    ];
}

export namespace AngularLifecycleFacade {

    export const list: EventTypeFacadeList = EventFacade.list(AngularLifecycleType.values);
}

/** @PropertyDecoratorFactory */
export function AngularLifecycleDecorator(type: EventType): SubjectProxyDecorator {
    return SubjectProxyDecorator(type, AngularLifecycleFacade.list);
}

/** @PropertyDecorator */
export const OnChanges: SubjectProxyDecorator = AngularLifecycleDecorator(AngularLifecycleType.OnChanges);
/** @PropertyDecorator */
export const OnInit: SubjectProxyDecorator = AngularLifecycleDecorator(AngularLifecycleType.OnInit);
/** @PropertyDecorator */
export const OnDestroy: SubjectProxyDecorator = AngularLifecycleDecorator(AngularLifecycleType.OnDestroy);
/** @PropertyDecorator */
export const DoCheck: SubjectProxyDecorator = AngularLifecycleDecorator(AngularLifecycleType.DoCheck);
/** @PropertyDecorator */
export const AfterContentInit: SubjectProxyDecorator = AngularLifecycleDecorator(AngularLifecycleType.AfterContentInit);
/** @PropertyDecorator */
export const AfterContentChecked: SubjectProxyDecorator = AngularLifecycleDecorator(AngularLifecycleType.AfterContentChecked);
/** @PropertyDecorator */
export const AfterViewInit: SubjectProxyDecorator = AngularLifecycleDecorator(AngularLifecycleType.AfterViewInit);
/** @PropertyDecorator */
export const AfterViewChecked: SubjectProxyDecorator = AngularLifecycleDecorator(AngularLifecycleType.AfterViewChecked);