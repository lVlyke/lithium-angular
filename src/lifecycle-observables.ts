import { EventSourceDecorator, EventSource } from "./event-source";
import { EventType } from "./event-metadata";

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

    export type DecoratorFactory = () => EventSourceDecorator;

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

    /** @PropertyDecoratorMetaFactory */
    export function DecoratorFactory(type: EventType): DecoratorFactory {
        return function (): EventSourceDecorator {
            return EventSource(type);
        };
    }
}

/** @PropertyDecoratorFactory */
export const OnChanges = AngularLifecycleType.DecoratorFactory(AngularLifecycleType.OnChanges);
/** @PropertyDecoratorFactory */
export const OnInit = AngularLifecycleType.DecoratorFactory(AngularLifecycleType.OnInit);
/** @PropertyDecoratorFactory */
export const OnDestroy = AngularLifecycleType.DecoratorFactory(AngularLifecycleType.OnDestroy);
/** @PropertyDecoratorFactory */
export const DoCheck = AngularLifecycleType.DecoratorFactory(AngularLifecycleType.DoCheck);
/** @PropertyDecoratorFactory */
export const AfterContentInit = AngularLifecycleType.DecoratorFactory(AngularLifecycleType.DoCheck);
/** @PropertyDecoratorFactory */
export const AfterContentChecked = AngularLifecycleType.DecoratorFactory(AngularLifecycleType.DoCheck);
/** @PropertyDecoratorFactory */
export const AfterViewInit = AngularLifecycleType.DecoratorFactory(AngularLifecycleType.DoCheck);
/** @PropertyDecoratorFactory */
export const AfterViewChecked = AngularLifecycleType.DecoratorFactory(AngularLifecycleType.DoCheck);