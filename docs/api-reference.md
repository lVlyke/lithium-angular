# Lithium for Angular API Reference

## ```EventSource```

Creates an event source, which is an ```Observable``` that automatically emits when the given function (```eventType```) is called.

```ts
function EventSource(): EventSourceDecorator
function EventSource(...methodDecorators: MethodDecorator[]): EventSourceDecorator
function EventSource(options: EventSource.DecoratorOptions, ...methodDecorators: MethodDecorator[]): EventSourceDecorator
```

**```options```** - The options to use for this event source. See [**```EventSource.DecoratorOptions```**](#eventsourcedecoratoroptions).

**```methodDecorators```** - A list of ```MethodDecorator```s that should be applied to the underlying event function.

Note: If the target property's name is of the format "```<eventType>$```", ```options.eventType``` can be omitted and automatically deduced from the property name.

### ```EventSource.DecoratorOptions```

```ts
interface DecoratorOptions {
    eventType?: EventType;
    skipMethodCheck?: boolean;
    unmanaged?: boolean;
}
```

**```eventType```** - (Optional) The name of the function that represents the event or action. If not specified, the name will try to be deduced from the name of the property being decorated instead.

**```skipMethodCheck```** - (Optional) Whether or not to ignore existing method declarations in the class when defining the ```EventSource```. If set to ```false```, an error will be thrown if a method is defined with the same name as the ```eventType```. Defaults to ```false```.

**```unmanaged```** - (Optional) Whether or not the EventSource should be excluded from automatic subscription cleanup when component is destroyed. Defaults to ```false```.

### ```EventType```

```EventType``` represents the name of the function being proxied.

```ts
type EventType = string;
```

## ```StateEmitter```

Creates a state emitter, which is a ```Subject``` that automatically emits when the underlying property value is modified, and automatically updates the property value when the ```Subject``` emits.

```ts
function StateEmitter(): StateEmitterDecorator
function StateEmitter(...propertyDecorators: PropertyDecorator[]): StateEmitterDecorator
function StateEmitter(params: StateEmitter.DecoratorParams, ...propertyDecorators: PropertyDecorator[]): StateEmitterDecorator
```

**```params```** - The parameters to use for this state emitter. See [**```StateEmitter.DecoratorParams```**](#stateemitterdecoratorparams).

**```propertyDecorators```** - A list of ```PropertyDecorator```s that should be applied to the underlying property.

Note: If the target property's name is of the format "```<emitterType>$```", ```params.propertyName``` can be omitted and automatically deduced from the property name.

### ```StateEmitter.DecoratorParams```

```ts
interface DecoratorParams {
    propertyName?: EmitterType;
    initialValue?: any;
    initial?: () => any;
    readOnly?: boolean;
    writeOnly?: boolean;
    unmanaged?: boolean;
    proxyMode?: ProxyMode;
    proxyPath?: string;
    proxyMergeUpdates?: boolean;
}
```

**```propertyName```** - (Optional) The name of the underlying property that should be created for use by the component's template. If not specified, the name will try to be deduced from the name of the property being decorated instead.

**```initialValue```** - (Optional) The initial value to be emitted. Defaults to ```undefined```.

**```initial```** - (Optional) A function that will be invoked on each component instance to resolve the initial value. Note: This cannot be used if ```initialValue``` is defined.

**```readOnly```** - (Optional) Whether or not the underlying property being created should be read-only. Defaults to ```false```.

**```writeOnly```** - (Optional) Whether or not the underlying property being created should be write-only. If set to ```true``` and the component/directive is using AutoPush, special care will be taken to ensure change detection is invoked even if the ```StateEmitter``` is never used in the template/binding (i.e. in a directive). Defaults to ```false```.

**```unmanaged```** - (Optional) Whether or not the StateEmitter should be excluded from automatic subscription cleanup when component is destroyed. Defaults to ```false```. **Note**: This property has no effect when ```proxyMode``` is set to ```Alias```.

**```proxyMode```** - (Optional) The proxy mode to use for the ```StateEmitter```. Defaults to ```None```. For all possible values, see [**```StateEmitter.ProxyMode```**](#stateemitterproxymode).

**```proxyPath```** - (Conditional) The path of the property to be proxied. Required if ```proxyMode``` is not set to ```None```.

**```proxyMergeUpdates```** - (Optional) Whether or not new values written to a dynamic proxy path alias should be merged with the current value. Defaults to ```true```. Note: This only has an effect if the given ```proxyPath``` is dynamic.

### ```StateEmitter.EmitterType```

```ts
type EmitterType = string;
```

### ```StateEmitter.ProxyMode```

```ts
type ProxyMode = keyof {
    None,
    From,
    Alias,
    Merge
}
```

### ```StateEmitter.Alias```

Helper decorator that creates a ```StateEmitter``` with ```proxyMode``` set to ```Alias```.

```ts
function Alias(params: ProxyDecoratorParams | string, ...propertyDecorators: PropertyDecorator[]): PropertyDecorator
```

**```params```** - The parameters to use for this state emitter, or a ```string``` that is shorthand for passing the ```path``` parameter. See [**```StateEmitter.ProxyDecoratorParams```**](#stateemitterproxydecoratorparams).

**```propertyDecorators```** - A list of ```PropertyDecorator```s that should be applied to the underlying property.

Note: This is functionally equivalent to:
```ts
StateEmitter({proxyMode: EmitterMetadata.ProxyMode.Alias});
```

### ```StateEmitter.From```

Helper decorator that creates a ```StateEmitter``` with ```proxyMode``` set to ```From```.

```ts
function From(params: ProxyDecoratorParams | string, ...propertyDecorators: PropertyDecorator[]): PropertyDecorator
```

**```params```** - The parameters to use for this state emitter, or a ```string``` that is shorthand for passing the ```path``` parameter. See [**```StateEmitter.ProxyDecoratorParams```**](#stateemitterproxydecoratorparams).

**```propertyDecorators```** - A list of ```PropertyDecorator```s that should be applied to the underlying property.

Note: This is functionally equivalent to:
```ts
StateEmitter({proxyMode: EmitterMetadata.ProxyMode.From});
```

### ```StateEmitter.Merge```

Helper decorator that creates a ```StateEmitter``` with ```proxyMode``` set to ```Merge```.

```ts
function Merge(params: ProxyDecoratorParams | string, ...propertyDecorators: PropertyDecorator[]): PropertyDecorator
```

**```params```** - The parameters to use for this state emitter, or a ```string``` that is shorthand for passing the ```path``` parameter. See [**```StateEmitter.ProxyDecoratorParams```**](#stateemitterproxydecoratorparams).

**```propertyDecorators```** - A list of ```PropertyDecorator```s that should be applied to the underlying property.

Note: This is functionally equivalent to:
```ts
StateEmitter({proxyMode: EmitterMetadata.ProxyMode.Merge});
```

### ```StateEmitter.ProxyDecoratorParams```

```ts
interface ProxyDecoratorParams {
    path: string;
    propertyName?: EmitterType;
    mergeUpdates?: boolean;
    readOnly?: boolean;
    writeOnly?: boolean;
    unmanaged?: boolean;
}
```

**```path```** - See [**```StateEmitter.DecoratorParams.proxyPath```**](#stateemitterdecoratorparams).

**```propertyName```** - (Optional) See [**```StateEmitter.DecoratorParams.propertyName```**](#stateemitterdecoratorparams).

**```mergeUpdates```** - (Optional) See [**```StateEmitter.DecoratorParams.proxyMergeUpdates```**](#stateemitterdecoratorparams).

**```readOnly```** - (Optional) See [**```StateEmitter.DecoratorParams.readOnly```**](#stateemitterdecoratorparams).

**```writeOnly```** - (Optional) See [**```StateEmitter.DecoratorParams.writeOnly```**](#stateemitterdecoratorparams).

**```unmanaged```** - (Optional) See [**```StateEmitter.DecoratorParams.unmanaged```**](#stateemitterdecoratorparams).

### ```StateEmitter.AliasSelf```

Helper decorator that creates a self-proxying ```StateEmitter``` with ```proxyMode``` set to ```Alias```.

```ts
function AliasSelf(params?: SelfProxyDecoratorParams, ...propertyDecorators: PropertyDecorator[]): PropertyDecorator
```

**```params```** - (Optional) The parameters to use for this state emitter. See [**```StateEmitter.SelfProxyDecoratorParams```**](#stateemitterselfproxydecoratorparams).

**```propertyDecorators```** - A list of ```PropertyDecorator```s that should be applied to the underlying property.

Note: This is functionally equivalent to:
```ts
StateEmitter({
    proxyMode: EmitterMetadata.ProxyMode.Alias,
    proxyPath: "foo$"
})
public foo$: Subject<any>;
```

### ```StateEmitter.FromSelf```

Helper decorator that creates a self-proxying ```StateEmitter``` with ```proxyMode``` set to ```From```.

```ts
function FromSelf(params?: SelfProxyDecoratorParams, ...propertyDecorators: PropertyDecorator[]): PropertyDecorator
```

**```params```** - (Optional) The parameters to use for this state emitter. See [**```StateEmitter.SelfProxyDecoratorParams```**](#stateemitterselfproxydecoratorparams).

**```propertyDecorators```** - A list of ```PropertyDecorator```s that should be applied to the underlying property.

Note: This is functionally equivalent to:
```ts
StateEmitter({
    proxyMode: EmitterMetadata.ProxyMode.From,
    proxyPath: "foo$"
})
public foo$: Subject<any>;
```

### ```StateEmitter.MergeSelf```

Helper decorator that creates a self-proxying ```StateEmitter``` with ```proxyMode``` set to ```Merge```.

```ts
function MergeSelf(params?: SelfProxyDecoratorParams, ...propertyDecorators: PropertyDecorator[]): PropertyDecorator
```

**```params```** - (Optional) The parameters to use for this state emitter. See [**```StateEmitter.SelfProxyDecoratorParams```**](#stateemitterselfproxydecoratorparams).

**```propertyDecorators```** - A list of ```PropertyDecorator```s that should be applied to the underlying property.

Note: This is functionally equivalent to:
```ts
StateEmitter({
    proxyMode: EmitterMetadata.ProxyMode.Merge,
    proxyPath: "foo$"
})
public foo$: Subject<any>;
```

### ```StateEmitter.SelfProxyDecoratorParams```

```ts
interface SelfProxyDecoratorParams {
    propertyName?: EmitterType;
    readOnly?: boolean;
    writeOnly?: boolean;
    unmanaged?: boolean;
}
```

**```propertyName```** - (Optional) See [**```StateEmitter.DecoratorParams.propertyName```**](#stateemitterdecoratorparams).

**```readOnly```** - (Optional) See [**```StateEmitter.DecoratorParams.readOnly```**](#stateemitterdecoratorparams).

**```writeOnly```** - (Optional) See [**```StateEmitter.DecoratorParams.writeOnly```**](#stateemitterdecoratorparams).

**```unmanaged```** - (Optional) See [**```StateEmitter.DecoratorParams.unmanaged```**](#stateemitterdecoratorparams).

## ```LiComponent```

An abstract class that an Angular component class can extend to automatically allow dynamic template checking to enable use with Ivy-compiled builds.

**Note**: If your app is not yet using Ivy (or is using an older version of Angular), you must instead extend the [```AotAware```](#aotaware) class.

```ts
abstract class LiComponent extends TemplateDynamic() {}
```

## ```AotAware``` (deprecated)

An abstract class that an Angular component class can extend to automatically handle defining lifecycle event methods for the pre-Ivy AoT compiler, as well as allowing dynamic template checking with AoT.

**Note**: If your app is using Ivy (the default renderer in Angular 9), you should now extend the [```LiComponent```](#licomponent) class.

```ts
abstract class AotAware extends TemplateDynamic() {
    public ngOnChanges();
    public ngOnInit();
    public ngOnDestroy();
    public ngDoCheck();
    public ngAfterContentInit();
    public ngAfterContentChecked();
    public ngAfterViewInit();
    public ngAfterViewChecked();
}
```

## AutoPush

AutoPush enables automatic change detection management of StateEmitters for performant [OnPush](https://angular.io/api/core/ChangeDetectionStrategy) components and directives. Any change to a  ```StateEmitter``` value will invoke detection on the component automatically, eliminating the need to ever manually invoke change detection in [special cases](https://blog.angular-university.io/onpush-change-detection-how-it-works/).

### ```AutoPush.enable```

```ts
function enable(component: any, changeDetector: ChangeDetectorLike, options?: CdRefOptions) {
    Metadata.SetMetadata(CHANGE_DETECTOR_REF, component, changeDetector);
}
```

```ts
function enable(component: any, changeDetector: ChangeDetectorProxy, options?: Options) {
    Metadata.SetMetadata(CHANGE_DETECTOR_REF, component, changeDetector);
}
```

Enables AutoPush for a specfic instance of a component or directive using the given change detector reference or proxy.

**```component```** - The component or directive instance to enable AutoPush for.

**```changeDetector```** - The [change detector reference](https://angular.io/api/core/ChangeDetectorRef) or [```ChangeDetectorProxy```](#autopushchangedetectorproxy) to use to invoke change detection.

**```options```** - The change detection options to use for this instance. See [**```AutoPush.CdRefOptions```**](#autopushcdrefoptions).

### ```AutoPush.Options```

```ts
interface Options {}
```

### ```AutoPush.CdRefOptions```

```ts
interface CdRefOptions extends Options {
    forceDetectChanges?: boolean;
}
```

**```forceDetectChanges```** - By default, [```ChangeDetectorRef.markforCheck```](https://angular.io/api/core/ChangeDetectorRef#markforcheck) will be called when ```StateEmitter``` properties are changed. When this is enabled, [```ChangeDetectorRef.detectChanges```](https://angular.io/api/core/ChangeDetectorRef#detectchanges) will be called instead.

### ```AutoPush.ChangeDetectorProxy```

```ts
interface ChangeDetectorProxy {
    doCheck(): void;
}
```

Interface that represents logic to be invoked as change detection.

**```doCheck```** - Function that will be invoked when a component's ```StateEmitter``` properties are changed.

## Angular Lifecycle ```EventSource``` decorators

### ```OnChanges```

```ts
function OnChanges(options?: EventSource.DecoratorOptions, ...methodDecorators: MethodDecorator[]): PropertyDecorator
```

See [**```EventSource```**](#eventsource).

### ```OnInit```

```ts
function OnInit(options?: EventSource.DecoratorOptions, ...methodDecorators: MethodDecorator[]): PropertyDecorator
```

See [**```EventSource```**](#eventsource).

### ```OnDestroy```

```ts
function OnDestroy(options?: EventSource.DecoratorOptions, ...methodDecorators: MethodDecorator[]): PropertyDecorator
```

See [**```EventSource```**](#eventsource).

### ```DoCheck```

```ts
function DoCheck(options?: EventSource.DecoratorOptions, ...methodDecorators: MethodDecorator[]): PropertyDecorator
```

See [**```EventSource```**](#eventsource).

### ```AfterContentInit```

```ts
function AfterContentInit(options?: EventSource.DecoratorOptions, ...methodDecorators: MethodDecorator[]): PropertyDecorator
```

See [**```EventSource```**](#eventsource).

### ```AfterContentChecked```

```ts
function AfterContentChecked(options?: EventSource.DecoratorOptions, ...methodDecorators: MethodDecorator[]): PropertyDecorator
```

See [**```EventSource```**](#eventsource).

### ```AfterViewInit```

```ts
function AfterViewInit(options?: EventSource.DecoratorOptions, ...methodDecorators: MethodDecorator[]): PropertyDecorator
```

See [**```EventSource```**](#eventsource).

### ```AfterViewChecked```

```ts
function AfterViewChecked(options?: EventSource.DecoratorOptions, ...methodDecorators: MethodDecorator[]): PropertyDecorator
```

See [**```EventSource```**](#eventsource).