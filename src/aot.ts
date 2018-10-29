// Enable dynamic templating in AoT compiled components
export function AotDynamic(): new(...args: any[]) => { [K in keyof any]: any[K]; } {
    return class {};
}

export class AotAware extends AotDynamic() {
    public ngOnChanges() { }
    public ngOnInit() { }
    public ngOnDestroy() { }
    public ngDoCheck() { }
    public ngAfterContentInit() { }
    public ngAfterContentChecked() { }
    public ngAfterViewInit() { }
    public ngAfterViewChecked() { }
}