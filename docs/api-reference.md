# Lithium for Angular API Reference

- [**`ComponentState`**](#componentstate)
- [**`ComponentStateRef`**](#componentstateref)
- [**`DeclareState`**](#declarestate)
- [**`AsyncState`**](#asyncstate)
- [**`DirectiveState`**](#directivestate)
- [**`DirectiveStateRef`**](#directivestateref)
- [**`AutoPush`**](#autopush)
- [**`EventSource`**](#eventsource)
- [**Lifecycle decorators**](#lifecycle-decorators)
- [**`StateEmitter`**](#stateemitter)
- [**`LiComponent`**](#licomponent)

## `ComponentState`

`ComponentState` is a type that represents the reactive state of a given component type. All writable properties are assigned a `Subject`, while readonly properties are assigned an `Observable`.

```ts
type ComponentState<ComponentT> = {
    readonly [K in keyof ComponentT as ReactiveStateKey<ComponentT, QualifiedStateKey<ComponentT, K>>]-?:
        IfReadonly<ComponentT, K> extends true ? Observable<ComponentT[K]> : Subject<ComponentT[K]>;
};
```

### `ComponentState.CreateOptions`

Represents the options that can be used to control creation of a component state.

```ts
interface CreateOptions {
    lazy?: boolean;
}
```

**`lazy`** - (Optional) Whether or not the `ComponentState` should be lazily resolved. If set to `true`, the component's component state will only be resolved when the `ComponentStateRef` provider is injected by the component. If set to `false`, the component's component state will be resolved regardless of if the `ComponentStateRef` provider is injected.

Defaults to `true` if the `ComponentState` is created using [`forwardRef`](https://angular.io/api/core/forwardRef), otherwise defaults to `false`.

> **Note:** A `ComponentState` created with a component class via `forwardRef` must be lazy-instantiated. If `lazy` is set to `false` in this scenario, an error will be thrown.

### `ComponentState.create`

Creates a new `FactoryProvider` that provides a [`ComponentStateRef`](#componentstateref) service for the given component class, which allows for reactive component state interactions.

```ts
function create<ComponentT>(
    $class: ComponentClassProvider<ComponentT>,
    options?: CreateOptions
): FactoryProvider;
```

**`$class`** - The component class to create the `FactoryProvider` for. The component class may be passed via [`forwardRef`](https://angular.io/api/core/forwardRef).

**`options`** - (Optional) The [`CreateOptions`](#componentstatecreateoptions) for the component state.

Returns a `FactoryProvider` instance to be provided on the given component class.

## `ComponentStateRef`

An injected service that contains a [`ComponentState`](#componentstate) instance used to reactively interact with a component's state.

`ComponentStateRef` extends `Promise`, which allows for resolving the underlying `ComponentState` directly from the class.

```ts
class ComponentStateRef<ComponentT> extends Promise<ComponentState<ComponentT>> {

    public state(): Observable<ComponentState<ComponentT>>;

    public get<K extends StringKey<ComponentT>>(
        stateProp: ComponentState.ReadableKey<ComponentT, K>
    ): Observable<ComponentT[K]>;

    public getAll<
        K extends Array<ComponentState.ReadableKey<ComponentT, StringKey<ComponentT>>>
    >(...stateProps: K): ComponentState.StateSelector<ComponentT, K>;

    public set<K extends StringKey<ComponentT>, V extends ComponentT[K]>(
        stateProp: ComponentState.WritableKey<ComponentT, K>,
        value: V
    ): Observable<void>;

    public subscribeTo<K extends StringKey<ComponentT>, V extends ComponentT[K]>(
        stateProp: ComponentState.WritableKey<ComponentT, K>,
        source$: Observable<V>,
        managed: boolean = true
    ): Subscription;

    public sync<
        K1 extends StringKey<ComponentT>,
        K2 extends StringKey<ComponentT>,
        V extends IfEquals<ComponentT[K1], ComponentT[K2]> extends true ? ComponentT[K1] & ComponentT[K2] : never
    >(
        statePropA: V extends never ? never : ComponentState.WritableKey<ComponentT, K1>,
        statePropB: V extends never ? never : ComponentState.WritableKey<ComponentT, K2>
    ): void;

    public syncWith<K extends StringKey<ComponentT>>(
        stateProp: ComponentState.WritableKey<ComponentT, K>,
        source$: Subject<ComponentT[K]>
    ): void;

    public syncWith<
        ComponentT2,
        K1 extends StringKey<ComponentT>,
        K2 extends StringKey<ComponentT2>,
        V extends IfEquals<ComponentT[K1], ComponentT2[K2]> extends true ? ComponentT[K1] & ComponentT2[K2] : never
    >(
        stateProp: V extends never ? never : ComponentState.WritableKey<ComponentT, K1>,
        sourceState: ComponentStateRef<ComponentT2>,
        sourceProp: V extends never ? never : ComponentState.WritableKey<ComponentT2, K2>
    ): void;
}
```

### `ComponentStateRef.state`

Resolves the `ComponentState` instance for this reference. Equivalent to resolving the `ComponentStateRef` promise using RxJS `from`.

```ts
    function state(): Observable<ComponentState<ComponentT>>;
```

### `ComponentStateRef.get`

Returns an `Observable` that represents the current value of the given state property and emits whenever the value of the given state property is changed. 

```ts
function get<K extends StringKey<ComponentT>>(
    stateProp: ComponentState.ReadableKey<ComponentT, K>
): Observable<ComponentT[K]>;
```

**`stateProp`** - The state property to observe.

### `ComponentStateRef.getAll`

Returns an array of `Observable`s that represents the current value for each given state property. Each `Observable` emits whenever a value of the corresponding given state property is changed.

```ts
function getAll<
    K extends Array<ComponentState.ReadableKey<ComponentT, StringKey<ComponentT>>>
>(...stateProps: K): ComponentState.StateSelector<ComponentT, K>;
```

**`stateProps`** - The state properties to observe.

### `ComponentStateRef.emitter`

Returns an `EventEmitter` that emits whenever the value of the given state property is changed.

```ts
function emitter<K extends StringKey<ComponentT>>(
    stateProp: ComponentState.ReadableKey<ComponentT, K>
): EventEmitter<ComponentT[K]>;
```

**`stateProp`** - The state property to observe.

### `ComponentStateRef.set`

Updates the value of the given state property with the given value. Equivalent to assigning to the component state property directly.

```ts
function set<K extends StringKey<ComponentT>, V extends ComponentT[K]>(
    stateProp: ComponentState.WritableKey<ComponentT, K>,
    value: V
): Observable<void>;
```

**`stateProp`** - The state property to update. This property must not be readonly.

**`value`** - The new value to update to.

Returns an `Observable` that emits and completes when the value has been updated.

### `ComponentStateRef.subscribeTo`

Subscribes the given state property to the given source `Observable`. If `managed` is set to true, the lifetime of the subscription will be managed and cleaned up when the component is destroyed.

```ts
function subscribeTo<K extends StringKey<ComponentT>, V extends ComponentT[K]>(
    stateProp: ComponentState.WritableKey<ComponentT, K>,
    source$: Observable<V>,
    managed: boolean = true
): Subscription;
```

**`stateProp`** - The state property to receive source updates. This property must not be readonly.

**`source$`** - The source `Observable` to subscribe to.

**`managed`** - (Optional) Whether or not the subscription lifetime should be managed. Defaults to `true`.

Returns a `Subscription` representing the subscription to the source.

### `ComponentStateRef.sync`

Synchronizes the values of the given state properties such that any changes from one state property will be propagated to the other state property. The initial value of the first given state property is used.

```ts
function sync<
    K1 extends StringKey<ComponentT>,
    K2 extends StringKey<ComponentT>,
    V extends IfEquals<ComponentT[K1], ComponentT[K2]> extends true ? ComponentT[K1] & ComponentT[K2] : never
>(
    statePropA: V extends never ? never : ComponentState.WritableKey<ComponentT, K1>,
    statePropB: V extends never ? never : ComponentState.WritableKey<ComponentT, K2>
): void;
```

**`statePropA`** - The first state property to synchronize. This property must not be readonly.

**`statePropB`** - The second state property to synchronize. This property must not be readonly.

### `ComponentStateRef.syncWith`

```ts
function syncWith<K extends StringKey<ComponentT>>(
    stateProp: ComponentState.WritableKey<ComponentT, K>,
    source$: Subject<ComponentT[K]>
): void;
```

Synchronizes the values of the given state property and source `Subject` such that any changes from the state property will be propagated to the source `Subject` and vice versa. The initial value of the source `Subject` is used.

**`stateProp`** - The state property to synchronize. This property must not be readonly.

**`source$`** - The source `Subject` to synchronize with.

```ts
function syncWith<
    ComponentT2,
    K1 extends StringKey<ComponentT>,
    K2 extends StringKey<ComponentT2>,
    V extends IfEquals<ComponentT[K1], ComponentT2[K2]> extends true ? ComponentT[K1] & ComponentT2[K2] : never
>(
    stateProp: V extends never ? never : ComponentState.WritableKey<ComponentT, K1>,
    sourceState: ComponentStateRef<ComponentT2>,
    sourceProp: V extends never ? never : ComponentState.WritableKey<ComponentT2, K2>
): void;
```

Synchronizes the state of `stateProp` and `sourceProp`, a property from another `ComponentStateRef`, such that any changes from `stateProp` will be propagated to `sourceProp` and vice versa. The initial state value of `sourceProp` is used.

**`stateProp`** - The state property to synchronize. This property must not be readonly.

**`sourceState`** - The source `ComponentStateRef` instance.

**`sourceProp`** - The source state property from `sourceState` to synchronize with. This property must not be readonly.

## `DeclareState`

Decorator used to explicitly declare a specific property as part of the component state.

`DeclareState` can also be used to associate private component state properties to public properties.

```ts
function DeclareState<Name extends string = undefined>(publicName?: Name);
```

**`publicName`** - (Optional) The name of the public property to associate this property to. If given, both this property and the named property will be bound to the same value. This property must be a public class member and must be of the same type as the property being decorated.

## `AsyncState`

Decorator used to subscribe a component state property to a source `Observable`. The property's value will be updated whenever the source `Observable` emits.

```ts
function AsyncState<Source extends string = undefined>(asyncSource?: Source);
```

**`asyncSource`** - (Optional) The property name of the source `Observable`. If not defined, it will automatically use the current property name with a `$` postfix as the source property name. This property must be a public class member and must be an `Observable` of the same type as the property being decorated.

## `DirectiveState`

Alias of [`ComponentState`](#componentstate).

```ts
type DirectiveState<DirectiveT> = ComponentState<DirectiveT>;
```

See [`ComponentState`](#componentstate).

### `DirectiveState.CreateOptions`

Represents the options that can be used to control creation of a directive state. Includes all of the options from [`ComponentState.CreateOptions`](#componentstatecreateoptions).

```ts
interface CreateOptions extends ComponentState.CreateOptions {
    uniqueToken?: boolean;
}
```

**`uniqueToken`** - (Optional) Whether or not the provider definition for the `DirectiveState` should use a unique `InjectionToken` instead of the `DirectiveStateRef` class. If set to `true`, the provider definition will create a unique `InjectionToken` so that the resulting `DirectiveStateRef` service can only be injected by that specific `InjectionToken`. This is useful for preventing DI conflicts when injecting `DirectiveStateRef` instances with multiple attribute directives being applied to the same host. If set to `false`, the provider definition will use the `DirectiveStateRef` class, allowing for it to be injected without an `InjectionToken`, much like `ComponentStateRef`.

Defaults to `true` if the `DirectiveState` is created using [`forwardRef`](https://angular.io/api/core/forwardRef), otherwise defaults to `false`.

**`lazy`** - See [`ComponentState.CreateOptions`](#componentstatecreateoptions).

### `DirectiveStateRef.create`

Creates a new `FactoryProvider` that provides a `DirectiveStateRef` service for the given directive class, which allows for reactive directive state interactions.

```ts
function create<DirectiveT>(
    $class: Type<any>,
    options?: CreateOptions
): FactoryProvider;
```

**`$class`** - The directive class to create the `FactoryProvider` for. The  directive class may be passed via [`forwardRef`](https://angular.io/api/core/forwardRef).

**`options`** - (Optional) The [`CreateOptions`](#directivestatecreateoptions) for the directive state.

Returns a `FactoryProvider` instance to be provided on the given directive class.

### `DirectiveStateRef.tokenFor`

Resolves the injection token from the given `DirectiveState` provider that can be used to inject the `DirectiveStateRef` service for the directive instance.

```ts
function tokenFor(provider: FactoryProvider): any;
```

**`provider`** - The `FactoryProvider` to resolve the token from.

Returns the injection token for the given `DirectiveState` provider that can be used to inject the `DirectiveStateRef` service for the directive instance.

### `stateTokenFor`

Alias of [`DirectiveStateRef.tokenFor`](#directivestatereftokenfor).

```ts
const stateTokenFor = DirectiveState.tokenFor;
```

See [`DirectiveStateRef.tokenFor`](#directivestatereftokenfor).

## `DirectiveStateRef`

Alias of [`ComponentStateRef`](#componentstateref).

```ts
type DirectiveStateRef<DirectiveT> = ComponentStateRef<DirectiveT>;
```

See [`ComponentStateRef`](#componentstateref).

## AutoPush

`AutoPush` enables automatic change detection management of component state for simplified [OnPush](https://angular.io/api/core/ChangeDetectionStrategy) components. Any change to a component state value will automatically mark the component for change detection, eliminating the need for manually handling change detection in [special cases](https://blog.angular-university.io/onpush-change-detection-how-it-works/).

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

Enables `AutoPush` for a specfic instance of a component or directive using the given change detector reference or proxy.

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

Interface that represents logic to be invoked as change detection.

```ts
interface ChangeDetectorProxy {
    doCheck(): void;
}
```

**```doCheck```** - Function that will be invoked when a component's state is changed.

## ```EventSource```

Decorator used to create an event source, which is an ```Observable``` that automatically emits when the given function (```eventType```) is called.

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

## Angular Lifecycle `EventSource` decorators <a name="lifecycle-decorators"></a>

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

## ```StateEmitter```

> **NOTE**: Use of `StateEmitter` is no longer recommended and has been replaced with [`ComponentState`](#componentstate). `StateEmitter` will be deprecated and removed in future versions of Lithium. See the [migration guide](/docs/lithium-7-migration-guide.md) for more information.

Decorator used to create a state emitter, which is a ```Subject``` that automatically emits when the underlying property value is modified, and automatically updates the property value when the ```Subject``` emits.

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

## `LiComponent` _(deprecated)_ <a name="licomponent"></a>

> **NOTE**: Use of `LiComponent` is no longer recommended and will be removed in future versions of Lithium. See the [migration guide](/docs/lithium-7-migration-guide.md) for more information.

An abstract class that any Angular component class can extend to automatically allow `StateEmitter`s and `EventSource`s to be deduced for use in templates without explicit corresponding property declarations.

```ts
abstract class LiComponent extends TemplateDynamic() {}
```
