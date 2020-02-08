import { TemplateDynamic } from "./component";

/**
 * @deprecated - This class should only be used if your app uses ViewEngine (i.e. `enableIvy: false` is set).
 * Otherwise, `LiComponent` should be used instead.
 * @see LiComponent
 */
// TODO - Make this an alias of `LiComponent` when only supporting Ivy
export abstract class AotAware extends TemplateDynamic() {

    public ngOnChanges() { }
    public ngOnInit() { }
    public ngOnDestroy() { }
    public ngDoCheck() { }
    public ngAfterContentInit() { }
    public ngAfterContentChecked() { }
    public ngAfterViewInit() { }
    public ngAfterViewChecked() { }
}
