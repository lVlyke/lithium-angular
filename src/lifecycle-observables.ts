import { EventTypeFacadeList, EventFacade, EventType, SubjectProxyDecoratorFactory } from "./subject-proxy";

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
export function AngularLifecycleDecoratorFactory(type: EventType): SubjectProxyDecoratorFactory {
    return SubjectProxyDecoratorFactory(type, AngularLifecycleFacade.list);
}

/** @PropertyDecorator */
export const OnChanges: SubjectProxyDecoratorFactory = AngularLifecycleDecoratorFactory(AngularLifecycleType.OnChanges);
/** @PropertyDecorator */
export const OnInit: SubjectProxyDecoratorFactory = AngularLifecycleDecoratorFactory(AngularLifecycleType.OnInit);
/** @PropertyDecorator */
export const OnDestroy: SubjectProxyDecoratorFactory = AngularLifecycleDecoratorFactory(AngularLifecycleType.OnDestroy);
/** @PropertyDecorator */
export const DoCheck: SubjectProxyDecoratorFactory = AngularLifecycleDecoratorFactory(AngularLifecycleType.DoCheck);
/** @PropertyDecorator */
export const AfterContentInit: SubjectProxyDecoratorFactory = AngularLifecycleDecoratorFactory(AngularLifecycleType.AfterContentInit);
/** @PropertyDecorator */
export const AfterContentChecked: SubjectProxyDecoratorFactory = AngularLifecycleDecoratorFactory(AngularLifecycleType.AfterContentChecked);
/** @PropertyDecorator */
export const AfterViewInit: SubjectProxyDecoratorFactory = AngularLifecycleDecoratorFactory(AngularLifecycleType.AfterViewInit);
/** @PropertyDecorator */
export const AfterViewChecked: SubjectProxyDecoratorFactory = AngularLifecycleDecoratorFactory(AngularLifecycleType.AfterViewChecked);