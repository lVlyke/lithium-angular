<!-- markdownlint-disable MD024 MD031 -->

# Lithium for Angular (@lithiumjs/angular)

[![Build Status](https://travis-ci.org/lVlyke/lithium-angular.svg?branch=master)](https://travis-ci.org/lVlyke/lithium-angular) [![Coverage](./coverage/coverage.svg)](./coverage/coverage.svg)

A decorator-based library for Angular that enables seamless reactive data binding using RxJS.

* [Installation](#installation)
* [Quick Intro Guide](#quick-intro-guide)
* [Angular AoT Compiler](#angular-aot-compiler)
* [API](#api)
* [Other Information](#other-information)

## [Example app](https://github.com/lVlyke/lithium-angular-example-app)

### [[Live demo]](https://lvlyke.github.io/lithium-angular-example-app)

## Installation

The project can be installed [via **npm**](https://www.npmjs.com/package/@lithiumjs/angular) using the following command:

```bash
npm install @lithiumjs/angular
```

## Quick Intro Guide

* [EventSource](#eventsource)
* [StateEmitter](#stateemitter)
* [Proxied StateEmitters](#proxied-stateemitters)
* [Lifecycle Event Decorators](#lifecycle-event-decorators)

(For more information, see the full [**API reference**](#api))

**NOTE:** If you are using Angular's AoT compiler, some additional considerations are required to write fully AoT-compliant components with Lithium. See the [Angular AoT Compiler](#angular-aot-compiler) section for details.

### EventSource

```EventSource``` is the decorator used for reactive [event binding](https://angular.io/guide/template-syntax#event-binding). ```EventSource``` creates an ```Observable``` that can be used to react to component UI and lifecycle events.

#### Template

```html
<button (click)="onButtonPress()"> </button>
```

#### Component

```ts
@Component({...})
class Component {

    @EventSource() private onButtonPress$: Observable<any>;

    constructor () {
        this.onButtonPress$.subscribe(() =>  console.log("The button was pressed."));
    }
}
```

As you can see in the example above, an ```onButtonPress``` function is automatically created in the component's template that can be used to bind to events.

#### Using EventSource with Angular lifecycle events

```EventSource``` can also be used to capture all Angular component lifecycles (i.e. ```OnInit```) as observables. Convenience decorators are provided for every lifecycle event. You can see the full list [here](#lifecycle-event-decorators).

#### Forwarding method decorators with EventSource

Method decorators may be passed to ```EventSource``` and will be forwarded to the underlying facade function.

##### Example

```ts
@Component({...})
class Component {

    // Given "Throttle" is a method decorator factory:
    @EventSource(Throttle(1000)) private onButtonPress$: Observable<any>;

    constructor () {
        this.onButtonPress$.subscribe(() =>  console.log("The button was pressed."));
    }
}
```

Angular decorators may also be declared on the ```EventSource``` property itself. Lithium will automatically move the associated metadata to the facade function. This is useful for [staying compliant with Angular's AoT compiler](#angular-aot-compiler).

##### Example

```ts
@Component({...})
class Component {

    @EventSource()
    @HostListener("click")
    private onClick$: Observable<any>;

    constructor () {
        this.onClick$.subscribe(() =>  console.log("The component was clicked."));
    }
}
```

#### EventSource and inheritance

```EventSource``` fully supports class and prototypical inheritance.

##### Example

```ts
abstract class ComponentBase {

    @OnInit()
    protected onInit$: Observable<void>;

    constructor() {
        this.onInit$.subscribe(() => console.log("OnInit event in parent."));
    }
}

@Component({...})
class Component extends ComponentBase {

    constructor() {
        super();

        this.onInit$.subscribe(() => console.log("OnInit event in child."));
    }
}

/*
Log output:
==============
> OnInit event in parent.
> OnInit event in child.
*/
```

[**API reference**](#eventsource-1)

### StateEmitter

```StateEmitter``` is the decorator used for reactive [one-way in binding](https://angular.io/guide/template-syntax#one-way-in) and [two-way binding](https://angular.io/guide/template-syntax#two-way-binding---), allowing for state synchronization to and from the UI via a ```BehaviorSubject```.

#### Template

```html
<form>
    <input type="text" name="amount" [(ngModel)]="amount">
    <button (click)="resetAmount()"> </button>
</form>
```

#### Component

```ts
@Component({...})
class Component {

    @EventSource() private resetAmount$: Observable<void>;

    @StateEmitter({initialValue: 0}) private amount$: Subject<number>;

    constructor () {
        this.resetAmount$.subscribe(() => this.amount$.next(0));
    }
}
```

As you can see in the example above, an ```amount``` property is automatically created in the component's template that can be used to bind to properties.

#### Forwarding property decorators with StateEmitter

Property decorators may be passed to ```StateEmitter``` and will be forwarded to the underlying property.

##### Example

```ts
@Component({
    selector: "component",
    ...
})
class Component {

    // Given "NonNull" is a property decorator:
    @StateEmitter(NonNull()) private name$: Subject<string>;

    constructor () {
        this.name$.subscribe(name =>  console.log(`Name: ${name}`));
    }
}
```

Angular decorators may also be declared on the ```StateEmitter``` property itself. Lithium will automatically move the associated metadata to the underlying facade property. This is useful for [staying compliant with Angular's AoT compiler](#angular-aot-compiler).

##### Example

```html
<component [disabled]="true"> </component>
```

```ts
@Component({...})
class Component {

    @StateEmitter()
    @Input("disabled") // Input metdata will be forwarded to the underlying property.
    private disabled$: Subject<boolean>;

    constructor () {
        this.disabled$.subscribe(disabled =>  console.log(`Disabled: ${disabled}`)); // Output: Disabled: true
    }
}
```

#### Combining StateEmitter with other reactive decorators

```StateEmitter``` can be combined with other reactive decorators. The following example shows ```StateEmitter``` being used with the ```Select``` decorator from [NGXS](https://github.com/ngxs/store):

```ts
@Component({...})
class Component {

    @StateEmitter({ readOnly: true })
    @Select(AppState.getUsername)
    private username$: Observable<boolean>;
}
```

For more information, see [self-proxying StateEmitters](#self-proxying-stateemitters).

```username$``` will now function as both a ```StateEmitter``` and an NGXS ```Selector```.

#### StateEmitter and inheritance

```StateEmitter``` fully supports class and prototypical inheritance.

##### Example

```ts
abstract class ComponentBase {

    @StateEmitter({initialValue: "Default"})
    protected username$: Subject<string>;

    constructor() {
        this.username$.subscribe(username => console.log(`Parent got ${username}.`));
    }
}

@Component({...})
class Component extends ComponentBase {

    constructor() {
        super();

        this.username$.next("Changed");

        this.username$.subscribe(username => console.log(`Child got ${username}.`));
    }
}

/*
Log output:
==============
> Parent got Default.
> Parent got Changed.
> Child got Changed.
*/
```

### Proxied StateEmitters

Angular components will often use information from services and other sources. Proxied ```StateEmitter```s can be used to represent extenal values from within a component, or even create aliases for existing values.

```StateEmitter``` proxies create reactive references to properties within the component class and allow them to be used like any other ```StateEmitter``` reference. Dot path notation may be used to reference nested properties.

#### Example

```ts
class FooService {

    public get nestedProperty(): number {
        return 42;
    }
}
```

```ts
@Component({...})
class Component {

    @StateEmitter({
        proxyMode: EmitterMetadata.ProxyMode.Alias,
        proxyPath: "fooService.nestedProperty",
    })
    private nestedProperty$: Observable<number>;

    constructor (private fooService: FooService) { }
}
```

#### Static vs dynamic proxy property paths

Proxy paths are considered either dynamic or static depending on the type of the properties within it. If a proxy path is dynamic, the resulting reference to the property will be an ```Observable```. If a path is static, the reference will be a ```Subject```.

A proxy path is considered static only if all of the following conditions are met:

* The last property in the path is a ```Subject```.
* All other properties in the path are not of type ```Subject``` or ```Observable```.

##### Example

```ts
interface Settings {

    notificationsEnabled: boolean;
    someOtherSetting: number;
}

class SettingsService {

    public settings$ = new BehaviorSubject<Settings> ({
        notificationsEnabled: true,
        someOtherSetting: 1
    });
}
```

```ts
@Component({...})
class FormComponent {

    @StateEmitter.Alias("settingsService.settings$")
    private settings$: Subject<Settings>;

    @StateEmitter.Alias("settings$.notificationsEnabled")
    private notificationsEnabled$: Observable<boolean>;

    constructor (private settingsService: SettingsService) { }
}
```

In the above example, the proxy path ```settingsService.settings$``` is considered static, because the last property is a ```Subject``` and the rest of the path does not contain any ```Observable```s or ```Subject```s. The proxy path ```settings$.notificationsEnabled``` is not static, because the last property is not a ```Subject```, and the first property in the path is a ```Subject```.

#### Updating Subjects in dynamic proxy property paths

If a dynamic property path contains a ```Subject```, it will automatically be notified of changes to the proxied property. The example below illustrates two-way binding of an aliased property with a dynamic property path containing a ```Subject```.

##### Example

```html
<form>
    <input [(ngModel)]="notificationsEnabled" type="checkbox">
</form>
```

```ts
@Component({...})
class FormComponent {

    // Dynamic proxy property path that contains a Subject
    @StateEmitter.Alias("settingsService.settings$.notificationsEnabled")
    private notificationsEnabled$: Observable<boolean> ;

    constructor (private settingsService: SettingsService) { }
}
```

When ```notificationsEnabled``` is updated via the form input, ```settingsService.settings$``` will automatically emit a merged ```Settings``` object with the new value of ```notificationsEnabled```. All other property values on the ```Settings``` object will also be preserved.

### Types of StateEmitter Proxies

* ```Alias```
* ```From```
* ```Merge```

#### Alias

The ```Alias``` proxy type simply resolves the given property path and creates an observable that directly maps back to the property value.

##### Example

```ts
class SessionManager {

    public session$: Subject<Session> ;
}
```

```html
<div> Welcome back, {{session.username}}</div>
```

```ts
@Component({...})
class Component {

    @StateEmitter.Alias("sessionManager.session$") private session$: Subject<Session>;

    constructor (private sessionManager: SessionManager) { }
}
```

```Alias``` can also be used with other ```StateEmitter``` references:

```html
<div> Welcome back, {{username}}</div>
```

```ts
@Component({...})
class Component {

    @StateEmitter.Alias("sessionManager.session$") private session$: Subject<Session>;
    @StateEmitter.Alias("session$.username") private username$: Observable<string>;

    constructor (private sessionManager: SessionManager) { }
}
```

#### From

The ```From``` proxy type creates a new ```Subject``` that gets its initial value from the source.

##### Example

```html
<form>
    <input type="text" [(ngModel)]="username">
</form>
```

```ts
@Component({...})
class FormComponent {

    @StateEmitter.From("sessionManager.session$.username") private username$: Subject<string>;

    constructor (private sessionManager: SessionManager) { }
}
```

In the above example, any form updates to ```username``` will only be reflected on ```FormComponent.username$```. ```sessionManager.session$``` will not receive any updates.

#### Merge

The ```Merge``` proxy type creates a new ```Subject``` that subscribes to all updates from the source.

##### Example

```html
<form>
    <input type="date" [(ngModel)]="date">
</form>
```

```ts
@Component({...})
class FormComponent {

    @StateEmitter.Merge("fooService.date$") private date$: Subject<Date>;

    constructor (private fooService: FooService) { }
}
```

In the above example, any form updates to ```date``` will only be reflected on ```FormComponent.date$```. ```fooService.date$``` will not receive any updates.

### Self-proxying StateEmitters

A self-proxying ```StateEmitter``` is simply a proxied ```StateEmitter``` with a proxy path to itself. This is useful for combining ```StateEmitter``` with other reactive decorators.

```ts
@Component({...})
class Component {

    @StateEmitter.Alias("username$")
    @Select(AppState.getUsername)
    private username$: Observable<boolean>;
}
```

In the above example, the ```@Select()``` decorator creates an ```Observable``` instance on ```username$```. Using ```@StateEmitter.Alias("username$")``` will allow us to capture that ```Observable``` and then use it for binding in the view template. Lithium also provides several convenience decorators for creating self-proxying StateEmitters.

```ts
@Component({...})
class Component {

    @StateEmitter.AliasSelf() // Equivalent to `@StateEmitter.Alias("username$")`
    @Select(AppState.getUsername)
    private username$: Observable<boolean>;
}
```

Lithium will automatically detect if a ```StateEmitter``` decorator is being used with another decorator. If another reactive decorator is being used, it will change to an aliasing self-proxied ```StateEmitter``` by default.

```ts
@Component({...})
class Component {

    @StateEmitter() // Equivalent to `@StateEmitter.AliasSelf()`
    @Select(AppState.getUsername)
    private username$: Observable<boolean>;
}
```

For more information, see the [API reference](#stateemitteraliasself).

[**API reference**](#stateemitter-1)

### Lifecycle Event Decorators

Helper decorators are provided that proxy all of the Angular component lifecycle events. These are:

* OnChanges
* OnInit
* OnDestroy
* DoCheck
* AfterContentInit
* AfterContentChecked
* AfterViewInit
* AfterViewChecked

#### Example

```ts
@Component({...})
class Component {

    @OnInit() private onInit$: Observable<void>;

    constructor () {
        this.onInit$.subscribe(() =>  console.log("Component is initialized."));
    }
}
```

[**API reference**](#angular-lifecycle-eventsource-decorators)

## Angular AoT Compiler

Lithium for Angular is compatible with Angular's AoT compiler. However, due to current limitations of the compiler there are a few rules that need to be adhered to in order to write fully AoT-compliant code with Lithium:

**1. Components using Lithium must extend the ```AotAware``` class.**

Because Lithium's ```StateEmitter``` and ```EventSource``` dynamically create and manage the properties that a component's view template will access, it is incompatible with how the current Angular AoT compiler handles template validation. To easily remedy this issue, your components can extend the [```AotAware```](#aotaware) base class to enable less strict validation and full AoT compliance:

```ts
import { AotAware } from "@lithiumjs/angular";

// With AotAware:
@Component({...})
class Component extends AotAware {

    @StateEmitter()
    @Input("disabled")
    private disabled$: Subject<boolean>;

    @OnInit() private onInit$: Observable<void>;

    constructor () {
        this.onInit$.subscribe(() =>  console.log("Component is initialized."));

        this.disabled$.subscribe(disabled =>  console.log(`Disabled: ${disabled}`));
    }
}
```


However, if using ```AotAware``` is not possible in your configuration, you **must** instead declare dummy properties, illustrated in the example below:

```ts
// Without AotAware:
@Component({...})
class Component {

    @StateEmitter()
    @Input("disabled")
    private disabled$: Subject<boolean>;

    // EventSource proxy for ngOnInit
    // Disable EventSource method usage checks with "skipMethodCheck"
    @OnInit({ skipMethodCheck: true }) private onInit$: Observable<void>;

    // Dummy property must be declared for each StateEmitter in the component if not extending `AotAware`.
    public disabled: boolean;

    // This stub declaration must be provided in the component to allow onInit$ to fire in AoT mode if not extending `AotAware`.
    // NOTE: Any stub method declarations will be overidden. Any code inside this declaration will not be executed.
    public ngOnInit() {}

    constructor () {
        this.onInit$.subscribe(() =>  console.log("Component is initialized."));

        this.disabled$.subscribe(disabled =>  console.log(`Disabled: ${disabled}`));
    }
}
```

**2. When applying an Angular decorator to an ```EventSource```, the decorator should be applied to the property directly instead of being passed into ```EventSource```.**

In the following example, ```HostListener``` should be declared on the property directly. This will work correctly when compiled with AoT:

```ts
@Component({...})
class Component {

    @EventSource()
    @HostListener("click")
    private onClick$: Observable<any>;

    constructor () {
        // This will emit as expected
        this.onClick$.subscribe(() =>  console.log("The component was clicked."));
    }
}
```

The following example will fail to work when compiled with AoT:

```ts
@Component({...})
class Component {

    @EventSource(HostListener("click"))
    private onClick$: Observable<any>;

    constructor () {
        // This will never emit when compiled with AoT
        this.onClick$.subscribe(() =>  console.log("The component was clicked."));
    }
}
```

**3. When applying an Angular decorator to a ```StateEmitter```, the decorator should be applied to the property directly instead of being passed into ```StateEmitter```.**

In the following example, ```Input``` should be declared on the property directly. The following example will work correctly when compiled with AoT:

```ts
@Component({...})
class Component {

    // This will allow "disabled" to be bound in a template without generating a compiler error
    @StateEmitter()
    @Input("disabled")
    private disabled$: Subject<boolean>;

    constructor () {
        this.disabled$.subscribe(disabled =>  console.log(`Disabled: ${disabled}`));
    }
}
```

The following example will fail to work when compiled with AoT:

```ts
@Component({...})
class Component {

    // This will generate a compiler error when "disabled" is bound to in a template.
    @StateEmitter(Input("disabled"))
    private disabled$: Subject<boolean>;

    constructor () {
        this.disabled$.subscribe(disabled =>  console.log(`Disabled: ${disabled}`));
    }
}
```

## API

### ```AotAware```

```ts
abstract class AotAware extends AotDynamic() {
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

An abstract class that an Angular component class can extend to automatically handle defining lifecycle event methods for the AoT compiler, as well as allowing dynamic template checking with AoT.

### ```EventSource```

```ts
function EventSource(): EventSourceDecorator
function EventSource(...methodDecorators: MethodDecorator[]): EventSourceDecorator
function EventSource(options: EventSource.DecoratorOptions, ...methodDecorators: MethodDecorator[]): EventSourceDecorator
```

Creates an event source, which is an ```Observable``` that automatically emits when the given function (```eventType```) is called.

**```options```** - The options to use for this event source. See [**```EventSource.DecoratorOptions```**](#eventsourcedecoratoroptions).

**```methodDecorators```** - A list of ```MethodDecorator```s that should be applied to the underlying event function.

Note: If the target property's name is of the format "```<eventType>$```", ```options.eventType``` can be omitted and automatically deduced from the property name.

#### ```EventSource.DecoratorOptions```

```ts
interface DecoratorOptions {
    eventType?: EventType;
    skipMethodCheck?: boolean;
}
```

**```eventType```** - (Optional) The name of the function that represents the event or action. If not specified, the name will try to be deduced from the name of the ```EventSource``` property.

**```skipMethodCheck```** - (Optional) Whether or not to ignore existing method declarations in the class when defining the ```EventSource```. If set to ```false```, an error will be thrown if a method is defined with the same name as the ```eventType```. Defaults to ```false```.

#### ```EventType```

```ts
type EventType = string;
```

```EventType``` represents the name of the function being proxied.

### ```StateEmitter```

```ts
function StateEmitter(): StateEmitterDecorator
function StateEmitter(...propertyDecorators: PropertyDecorator[]): StateEmitterDecorator
function StateEmitter(params: StateEmitter.DecoratorParams, ...propertyDecorators: PropertyDecorator[]): StateEmitterDecorator
```

Creates a state emitter, which is a ```Subject``` that automatically emits when the underlying property value is modified, and automatically updates the property value when the ```Subject``` emits.

**```params```** - The parameters to use for this state emitter. See [**```StateEmitter.DecoratorParams```**](#stateemitterdecoratorparams).

**```propertyDecorators```** - A list of ```PropertyDecorator```s that should be applied to the underlying property.

Note: If the target property's name is of the format "```<emitterType>$```", ```params.propertyName``` can be omitted and automatically deduced from the property name.

#### ```StateEmitter.DecoratorParams```

```ts
interface DecoratorParams {
    propertyName?: EmitterType;
    initialValue?: any;
    readOnly?: boolean;
    proxyMode?: ProxyMode;
    proxyPath?: string;
    proxyMergeUpdates?: boolean;
}
```

**```propertyName```** - (Optional) The name of the underlying property that should be created for use by the component's template. If not specified, the name will try to be deduced from the name of the ```StateEmitter``` property.

**```initialValue```** - (Optional) The initial value to be emitted. Defaults to ```undefined```.

**```readOnly```** - (Optional) Whether or not the underlying property being created should be read-only. Defaults to ```false```.

**```proxyMode```** - (Optional) The proxy mode to use for the ```StateEmitter```. Defaults to ```None```. For all possible values, see [**```StateEmitter.ProxyMode```**](#stateemitterproxymode).

**```proxyPath```** - (Conditional) The path of the property to be proxied. Required if ```proxyMode``` is not set to ```None```.

**```proxyMergeUpdates```** - (Optional) Whether or not newly emitted values via dynamic proxy property paths should be merged with the previously emitted value. Defaults to ```true``` if the emitted value is an instance of ```Object```, otherwise defaults to ```false```.

#### ```StateEmitter.EmitterType```

```ts
type EmitterType = string;
```

#### ```StateEmitter.ProxyMode```

```ts
type ProxyMode = keyof {
    None,
    From,
    Alias,
    Merge
}
```

#### ```StateEmitter.Alias```

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

#### ```StateEmitter.From```

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

#### ```StateEmitter.Merge```

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

#### ```StateEmitter.ProxyDecoratorParams```

```ts
interface ProxyDecoratorParams {
    path: string;
    propertyName?: EmitterType;
    mergeUpdates?: boolean;
    readOnly?: boolean;
}
```

**```path```** - See [**```StateEmitter.DecoratorParams.proxyPath```**](#stateemitterdecoratorparams).

**```propertyName```** - (Optional) See [**```StateEmitter.DecoratorParams.propertyName```**](#stateemitterdecoratorparams).

**```mergeUpdates```** - (Optional) See [**```StateEmitter.DecoratorParams.proxyMergeUpdates```**](#stateemitterdecoratorparams).

**```readOnly```** - (Optional) See [**```StateEmitter.DecoratorParams.readOnly```**](#stateemitterdecoratorparams).

#### ```StateEmitter.AliasSelf```

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

#### ```StateEmitter.FromSelf```

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

#### ```StateEmitter.MergeSelf```

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

#### ```StateEmitter.SelfProxyDecoratorParams```

```ts
interface SelfProxyDecoratorParams {
    propertyName?: EmitterType;
    readOnly?: boolean;
}
```

**```propertyName```** - (Optional) See [**```StateEmitter.DecoratorParams.propertyName```**](#stateemitterdecoratorparams).

**```readOnly```** - (Optional) See [**```StateEmitter.DecoratorParams.readOnly```**](#stateemitterdecoratorparams).

### Angular Lifecycle ```EventSource``` decorators

#### ```OnChanges```

```ts
function OnChanges(options?: EventSource.DecoratorOptions, ...methodDecorators: MethodDecorator[]): PropertyDecorator
```

See [**```EventSource```**](#eventsource-1).

#### ```OnInit```

```ts
function OnInit(options?: EventSource.DecoratorOptions, ...methodDecorators: MethodDecorator[]): PropertyDecorator
```

See [**```EventSource```**](#eventsource-1).

#### ```OnDestroy```

```ts
function OnDestroy(options?: EventSource.DecoratorOptions, ...methodDecorators: MethodDecorator[]): PropertyDecorator
```

See [**```EventSource```**](#eventsource-1).

#### ```DoCheck```

```ts
function DoCheck(options?: EventSource.DecoratorOptions, ...methodDecorators: MethodDecorator[]): PropertyDecorator
```

See [**```EventSource```**](#eventsource-1).

#### ```AfterContentInit```

```ts
function AfterContentInit(options?: EventSource.DecoratorOptions, ...methodDecorators: MethodDecorator[]): PropertyDecorator
```

See [**```EventSource```**](#eventsource-1).

#### ```AfterContentChecked```

```ts
function AfterContentChecked(options?: EventSource.DecoratorOptions, ...methodDecorators: MethodDecorator[]): PropertyDecorator
```

See [**```EventSource```**](#eventsource-1).

#### ```AfterViewInit```

```ts
function AfterViewInit(options?: EventSource.DecoratorOptions, ...methodDecorators: MethodDecorator[]): PropertyDecorator
```

See [**```EventSource```**](#eventsource-1).

#### ```AfterViewChecked```

```ts
function AfterViewChecked(options?: EventSource.DecoratorOptions, ...methodDecorators: MethodDecorator[]): PropertyDecorator
```

See [**```EventSource```**](#eventsource-1).

## Other information

* Lithium for [Ionic](https://github.com/lVlyke/lithium-ionic).