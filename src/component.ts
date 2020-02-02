// Enable dynamic templating for Ivy-compiled components:
export function TemplateDynamic(): new(...args: any[]) => { [K in keyof any]: any[K]; } {
    return class TemplateDynamic{};
}

export abstract class LiComponent extends TemplateDynamic() {
    public ngOnChanges() { }
    public ngOnInit() { }
    public ngOnDestroy() { }
    public ngDoCheck() { }
    public ngAfterContentInit() { }
    public ngAfterContentChecked() { }
    public ngAfterViewInit() { }
    public ngAfterViewChecked() { }
}

/** @ClassDecoratorFactory */
export function Reactive(): ClassDecorator {
    console.info("DEPRECATION NOTICE: The @Reactive() class decorator is no longer used and can be removed from your code. It will be removed in a future version of @lithiumjs/angular.");
    return function () {};
}