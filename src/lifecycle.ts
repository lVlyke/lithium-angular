import { EventSource } from "./event-source";
import { AngularLifecycleType } from "./lifecycle-event";

export namespace AngularLifecycleDecorator {

    export type Factory = (options?: EventSource.DecoratorOptions, ...methodDecorators: MethodDecorator[]) => PropertyDecorator;

    /** @PropertyDecoratorMetaFactory */
    export function Factory(eventType: AngularLifecycleType): Factory {
        return function (options?: EventSource.DecoratorOptions, ...methodDecorators: MethodDecorator[]): PropertyDecorator {
            return EventSource(Object.assign({ eventType }, options), ...methodDecorators);
        };
    }
}

export function OnChanges(options?: EventSource.DecoratorOptions, ...methodDecorators: MethodDecorator[]): PropertyDecorator;
/** @PropertyDecoratorFactory */
export function OnChanges(...args: any[]): PropertyDecorator {
    return AngularLifecycleDecorator.Factory(AngularLifecycleType.OnChanges)(...args);
};

export function OnInit(options?: EventSource.DecoratorOptions, ...methodDecorators: MethodDecorator[]): PropertyDecorator;
/** @PropertyDecoratorFactory */
export function OnInit(...args: any[]): PropertyDecorator {
    return AngularLifecycleDecorator.Factory(AngularLifecycleType.OnInit)(...args);
};

export function OnDestroy(options?: EventSource.DecoratorOptions, ...methodDecorators: MethodDecorator[]): PropertyDecorator;
/** @PropertyDecoratorFactory */
export function OnDestroy(...args: any[]): PropertyDecorator {
    return AngularLifecycleDecorator.Factory(AngularLifecycleType.OnDestroy)(...args);
};

export function DoCheck(options?: EventSource.DecoratorOptions, ...methodDecorators: MethodDecorator[]): PropertyDecorator;
/** @PropertyDecoratorFactory */
export function DoCheck(...args: any[]): PropertyDecorator {
    return AngularLifecycleDecorator.Factory(AngularLifecycleType.DoCheck)(...args);
};

export function AfterContentInit(options?: EventSource.DecoratorOptions, ...methodDecorators: MethodDecorator[]): PropertyDecorator;
/** @PropertyDecoratorFactory */
export function AfterContentInit(...args: any[]): PropertyDecorator {
    return AngularLifecycleDecorator.Factory(AngularLifecycleType.AfterContentInit)(...args);
};

export function AfterContentChecked(options?: EventSource.DecoratorOptions, ...methodDecorators: MethodDecorator[]): PropertyDecorator;
/** @PropertyDecoratorFactory */
export function AfterContentChecked(...args: any[]): PropertyDecorator {
    return AngularLifecycleDecorator.Factory(AngularLifecycleType.AfterContentChecked)(...args);
};

export function AfterViewInit(options?: EventSource.DecoratorOptions, ...methodDecorators: MethodDecorator[]): PropertyDecorator;
/** @PropertyDecoratorFactory */
export function AfterViewInit(...args: any[]): PropertyDecorator {
    return AngularLifecycleDecorator.Factory(AngularLifecycleType.AfterViewInit)(...args);
};

export function AfterViewChecked(options?: EventSource.DecoratorOptions, ...methodDecorators: MethodDecorator[]): PropertyDecorator;
/** @PropertyDecoratorFactory */
export function AfterViewChecked(...args: any[]): PropertyDecorator {
    return AngularLifecycleDecorator.Factory(AngularLifecycleType.AfterViewChecked)(...args);
};