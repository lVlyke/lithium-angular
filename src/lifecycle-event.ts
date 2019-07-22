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