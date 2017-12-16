<!-- markdownlint-disable MD024 MD031 --> 

# Lithium for Angular

A set of extensions for Angular that enable writing highly reactive components using RxJS.

## Installation

The project can be installed via **npm** using the following command:

```bash
npm install @lithiumjs/angular
```

## Quick Intro Guide

* [Bootstrapping](#bootstrapping)
* [EventSource](#eventsource)
* [StateEmitter](#stateemitter)
* [Proxied StateEmitters](#proxied-stateemitters)
* [Lifecycle Event Decorators](#lifecycle-event-decorators)
* [Angular AoT Compiler](#angular-aot-compiler)

(For more information, see the full [**API reference**](#api))

### Bootstrapping

Bootstrapping is required on the target class to enable event sources and state emitters for each instance. This is done via the ```Reactive``` class decorator.

#### Example

```ts
@Reactive()
@Component({...})
class Component {

    @OnInit() private onInit$: Observable<void>;

    constructor () {
        this.onInit$.subscribe(() =>  console.log("Hello world."));
    }
}
```

[**API reference**](#reactive)

### EventSource

```EventSource``` is the main decorator used for responding to events from a component. ```EventSource``` creates a proxy method for intercepting events (such as UI events or component lifecycle events) executed via callback, and translates them into observables.

#### Template

```html
<button (click)="onButtonPress()"> </button>
```

#### Component

```ts
@Reactive()
@Component({...})
class Component {

    @EventSource() private onButtonPress$: Observable<any>;

    constructor () {
        this.onButtonPress$.subscribe(() =>  console.log("The button was pressed."));
    }
}
```

#### EventSource method decorators

Method decorators may be passed to ```EventSource``` and will be applied to the underlying facade method.

##### Example

```ts
@Reactive()
@Component({...})
class Component {

    // Given "Throttle" is a method decorator factory:
    @EventSource(Throttle(1000)) private onButtonPress$: Observable<any>;

    constructor () {
        this.onButtonPress$.subscribe(() =>  console.log("The button was pressed."));
    }
}
```

Angular decorators may also be declared on the ```EventSource``` property itself. Lithium will automatically move the associated metadata to the underlying facade method. This is useful for staying compliant with Angular's AoT compiler.

##### Example

```ts
@Reactive()
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

[**API reference**](#eventsource-1)

### StateEmitter

```StateEmitter``` is the decorator used to automatically synchronize state of a component, allowing for reactive communication to and from the UI via subjects.

#### Template

```html
<div> You clicked the button {{buttonPressCount}} times.</div>
<button (click)="onButtonPress()"> </button>
```

#### Component

```ts
@Reactive()
@Component({...})
class Component {

    @EventSource() private onButtonPress$: Observable<any>;

    @StateEmitter({initialValue: 0}) private buttonPressCount$: Subject<number>;

    constructor () {
        this.onButtonPress$
            .flatMap(() =>  this.buttonPressCount$.take(1))
            .subscribe(buttonPressCount =>  this.buttonPressCount$.next(buttonPressCount + 1));
    }
}
```

#### StateEmitter property decorators

Property decorators may be passed to ```StateEmitter``` and will be applied to the underlying property.

##### Example

```ts
@Reactive()
@Component({
    selector: "component",
    ...
})
class Component {

    // Given "NonNull" is a property decorator factory:
    @StateEmitter(NonNull()) private name$: Subject<string>;

    constructor () {
        this.name$.subscribe(name =>  console.log(`Name: ${name}`));
    }
}
```

Angular decorators may also be declared on the ```StateEmitter``` property itself. Lithium will automatically move the associated metadata to the underlying facade property. This is useful for staying compliant with Angular's AoT compiler.

##### Example

```html
<component [disabled]="true"> </component>
```

```ts
@Reactive()
@Component({...})
class Component {

    @StateEmitter()
    @Input("disabled")
    private disabled$: Subject<boolean>;

    constructor () {
        this.disabled$.subscribe(disabled =>  console.log(`Disabled: ${disabled}`)); // Output: Disabled: true
    }
}
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
@Reactive()
@Component({...})
class Component {

    @StateEmitter({
        proxyMode: EmitterMetadata.ProxyMode.Alias,
        proxyPath: "fooService.nestedProperty",
    })
    private nestedProperty$: Observable<number> ;

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
@Reactive()
@Component({...})
class FormComponent {

    @StateEmitter.Alias("settingsService.settings$")
    private settings$: Subject<Settings> ;

    @StateEmitter.Alias("settings$.notificationsEnabled")
    private notificationsEnabled$: Observable<boolean> ;

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
@Reactive()
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
@Reactive()
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
@Reactive()
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
@Reactive()
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
@Reactive()
@Component({...})
class FormComponent {

    @StateEmitter.Merge("fooService.date$") private date$: Subject<Date>;

    constructor (private fooService: FooService) { }
}
```

In the above example, any form updates to ```date``` will only be reflected on ```FormComponent.date$```. ```fooService.date$``` will not receive any updates.

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
@Reactive()
@Component({...})
class Component {

    @OnInit() private onInit$: Observable<void>;

    constructor () {
        this.onInit$.subscribe(() =>  "Component is initialized.");
    }
}
```

[**API reference**](#angular-lifecycle-eventsource-decorators)

### Angular AoT Compiler

Lithium for Angular is fully compliant with Angular's AoT compiler. There are a couple things to keep in mind when using Lithium with AoT:

**When applying an Angular decorator to an ```EventSource```, the decorator should be applied to the property directly instead of being passed into ```EventSource```.**

The following example will fail to work when compiled with AoT:

```ts
@Reactive()
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

In the above example, ```HostListener``` should be declared on the property instead. The following example will work correctly when compiled with AoT:

```ts
@Reactive()
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

**When applying an Angular decorator to a ```StateEmitter```, the decorator should be applied to the property directly instead of being passed into ```StateEmitter```.**

The following example will fail to work when compiled with AoT:

```ts
@Reactive()
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

In the above example, ```Input``` should be declared on the property instead. The following example will work correctly when compiled with AoT:

```ts
@Reactive()
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

## API

### ```Reactive```

```ts
function Reactive(): ClassDecorator
```

A decorator that bootstraps the target class, which wires up all own and inherited ```EventSource```s and ```StateEmitter```s to each class instance.

### ```EventSource```

```ts
function EventSource(): EventSourceDecorator
function EventSource(...methodDecorators: MethodDecorator[]): EventSourceDecorator
function EventSource(eventType?: EventType, ...methodDecorators: MethodDecorator[]): EventSourceDecorator
```

Creates an event source, which is an ```Observable``` that automatically emits when the given function (```eventType```) is called.

**```eventType```** - The name of the function that represents the event or action.

**```methodDecorators```** - A list of ```MethodDecorator```s that should be applied to the underlying event function.

Note: If the target property's name is of the format "```<eventType> $```", ```eventType``` can be omitted and automatically deduced from the property name.

### ```StateEmitter```

```ts
function StateEmitter(): StateEmitterDecorator
function StateEmitter(...propertyDecorators: PropertyDecorator[]): StateEmitterDecorator
function StateEmitter(params: StateEmitter.DecoratorParams, ...propertyDecorators: PropertyDecorator[]): StateEmitterDecorator
```

Creates a state emitter, which is a ```Subject``` that automatically emits when the underlying property value is modified, and automatically updates the property value when the ```Subject``` emits.

**```params```** - The parameters to use for this state emitter. See [**```StateEmitter.DecoratorParams```**](#stateemitterdecoratorparams).

**```propertyDecorators```** - A list of ```PropertyDecorator```s that should be applied to the underlying property.

Note: If the target property's name is of the format "```<emitterType> $```", ```params.propertyName``` can be omitted and automatically deduced from the property name.

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

#### ```StateEmitter.ProxyDecoratorParams```

```ts
interface ProxyDecoratorParams {
    path: string;
    propertyName?: EmitterType;
    mergeUpdates?: boolean;
}
```

**```path```** - See [**```StateEmitter.DecoratorParams.proxyPath```**](#stateemitterdecoratorparams).

**```propertyName```** - (Optional) See [**```StateEmitter.DecoratorParams.propertyName```**](#stateemitterdecoratorparams).

**```mergeUpdates```** - (Optional) See [**```StateEmitter.DecoratorParams.proxyMergeUpdates```**](#stateemitterdecoratorparams).

#### ```StateEmitter.EventType```

```ts
type EventType = string;
```

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

### Angular Lifecycle ```EventSource``` decorators

#### ```OnChanges```

```ts
function OnChanges(): EventSourceDecorator
```

#### ```OnInit```

```ts
function OnInit(): EventSourceDecorator
```

#### ```OnDestroy```

```ts
function OnDestroy(): EventSourceDecorator
```

#### ```DoCheck```

```ts
function DoCheck(): EventSourceDecorator
```

#### ```AfterContentInit```

```ts
function AfterContentInit(): EventSourceDecorator
```

#### ```AfterContentChecked```

```ts
function AfterContentChecked(): EventSourceDecorator
```

#### ```AfterViewInit```

```ts
function AfterViewInit(): EventSourceDecorator
```

#### ```AfterViewChecked```

```ts
function AfterViewChecked(): EventSourceDecorator
```

## Other information

* Lithium for [Ionic](https://github.com/lVlyke/lithium-ionic).