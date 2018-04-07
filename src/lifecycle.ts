import { EventSource } from "./event-source";

export type AngularLifecycleType = keyof {
    ngOnChanges: any,
    ngOnInit: any,
    ngOnDestroy: any
    ngDoCheck: any,
    ngAfterContentInit: any,
    ngAfterContentChecked: any,
    ngAfterViewInit: any,
    ngAfterViewChecked: any
};

export namespace AngularLifecycleType {

    export type DecoratorFactory = (options?: EventSource.DecoratorOptions, ...methodDecorators: MethodDecorator[]) => PropertyDecorator;

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
    export function DecoratorFactory(eventType: AngularLifecycleType): DecoratorFactory {
        return function (options?: EventSource.DecoratorOptions, ...methodDecorators: MethodDecorator[]): PropertyDecorator {
            return EventSource(Object.assign({ eventType }, options), ...methodDecorators);
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
export const AfterContentInit = AngularLifecycleType.DecoratorFactory(AngularLifecycleType.AfterContentInit);
/** @PropertyDecoratorFactory */
export const AfterContentChecked = AngularLifecycleType.DecoratorFactory(AngularLifecycleType.AfterContentChecked);
/** @PropertyDecoratorFactory */
export const AfterViewInit = AngularLifecycleType.DecoratorFactory(AngularLifecycleType.AfterViewInit);
/** @PropertyDecoratorFactory */
export const AfterViewChecked = AngularLifecycleType.DecoratorFactory(AngularLifecycleType.AfterViewChecked);