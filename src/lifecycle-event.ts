export enum AngularLifecycleType {
    OnChanges = "ngOnChanges",
    OnInit = "ngOnInit",
    OnDestroy = "ngOnDestroy",
    DoCheck = "ngDoCheck",
    AfterContentInit = "ngAfterContentInit",
    AfterContentChecked = "ngAfterContentChecked",
    AfterViewInit = "ngAfterViewInit",
    AfterViewChecked = "ngAfterViewChecked"
};

export namespace AngularLifecycleType {

    export type HookName = 
        "onChanges"
       | "onInit"
       | "onDestroy"
       | "doCheck"
       | "afterContentInit"
       | "afterContentChecked"
       | "afterViewInit"
       | "afterViewChecked";

    export const hookNames: Record<AngularLifecycleType, HookName> = {
        [AngularLifecycleType.OnChanges]: "onChanges",
        [AngularLifecycleType.OnInit]: "onInit",
        [AngularLifecycleType.OnDestroy]: "onDestroy",
        [AngularLifecycleType.DoCheck]: "doCheck",
        [AngularLifecycleType.AfterContentInit]: "afterContentInit",
        [AngularLifecycleType.AfterContentChecked]: "afterContentChecked",
        [AngularLifecycleType.AfterViewInit]: "afterViewInit",
        [AngularLifecycleType.AfterViewChecked]: "afterViewChecked"
    };

    export const values: AngularLifecycleType[] = [
        AngularLifecycleType.OnChanges,
        AngularLifecycleType.OnInit,
        AngularLifecycleType.OnDestroy,
        AngularLifecycleType.DoCheck,
        AngularLifecycleType.AfterContentInit,
        AngularLifecycleType.AfterContentChecked,
        AngularLifecycleType.AfterViewInit,
        AngularLifecycleType.AfterViewChecked
    ];
}