# Quick Guide to Lithium for Angular

This guide is designed to go over at a high level the core features of Lithium and examples of how to use them.

* [EventSource](#eventsource)
* [StateEmitter](#stateemitter)
* [Proxied StateEmitters](#proxied-stateemitters)
* [Lifecycle Event Decorators](#lifecycle-event-decorators)
* [AutoPush (Automatic OnPush detection)](#autopush)

(Also see the full [**API reference**](/docs/api-reference.md))

**NOTE:** If you are using Angular's AoT compiler, some additional considerations are required to write fully AoT-compliant components with Lithium. See the [Angular AoT Compiler](/docs/aot-guide.md) section for details.

## EventSource

```EventSource``` is the decorator used for reactive [event binding](https://angular.io/guide/template-syntax#event-binding). ```EventSource``` creates an ```Observable``` that can be used to react to component UI and lifecycle events. Subscriptions to EventSources are automatically cleaned up when the component is destroyed.

### Template

```html
<button (click)="onButtonPress()"> </button>
```

### Component

```ts
@Component({...})
class Component {

    @EventSource()
    private readonly onButtonPress$: Observable<any>;

    constructor () {
        this.onButtonPress$.subscribe(() =>  console.log("The button was pressed."));
    }
}
```

In the example above, an ```onButtonPress``` function is automatically created in the component's template that can be used to bind to events.

### Using EventSource with Angular lifecycle events

```EventSource``` can also be used to capture all Angular component lifecycles (i.e. ```OnInit```) as observables. Convenience decorators are provided for every lifecycle event. For more info, see the [full list](#lifecycle-event-decorators) of lifecycle event decorators.

### Forwarding method decorators with EventSource

Method decorators may be passed to ```EventSource``` and will be forwarded to the underlying facade function.

#### Example

```ts
@Component({...})
class Component {

    // Given "Throttle" is a method decorator factory:
    @EventSource(Throttle(1000))
    private readonly onButtonPress$: Observable<any>;

    constructor () {
        this.onButtonPress$.subscribe(() =>  console.log("The button was pressed."));
    }
}
```

Angular decorators may also be declared on the ```EventSource``` property itself. Lithium will automatically move the associated metadata to the facade function. This is useful for [staying compliant with Angular's AoT compiler](/docs/aot-guide.md).

#### Example

```ts
@Component({...})
class Component {

    @EventSource()
    @HostListener("click")
    private readonly onClick$: Observable<any>;

    constructor () {
        this.onClick$.subscribe(() =>  console.log("The component was clicked."));
    }
}
```

### EventSource and inheritance

```EventSource``` fully supports class and prototypical inheritance.

#### Example

```ts
abstract class ComponentBase {

    @OnInit()
    protected readonly onInit$: Observable<void>;

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

[**API reference**](/docs/api-reference.md#eventsource)

## StateEmitter

```StateEmitter``` is the decorator used for reactive [one-way in binding](https://angular.io/guide/template-syntax#one-way-in) and [two-way binding](https://angular.io/guide/template-syntax#two-way-binding---), allowing for state synchronization to and from the UI via a ```BehaviorSubject```. Subscriptions to StateEmitters are automatically cleaned up when the component is destroyed.

### Template

```html
<form>
    <input type="text" name="amount" [(ngModel)]="amount">
    <button (click)="resetAmount()"> </button>
</form>
```

### Component

```ts
@Component({...})
class Component {

    @EventSource()
    private readonly resetAmount$: Observable<void>;

    @StateEmitter({initialValue: 0}) private amount$: Subject<number>;

    constructor () {
        this.resetAmount$.subscribe(() => this.amount$.next(0));
    }
}
```

In the example above, an ```amount``` property is automatically created in the component's template that can be used to bind to properties.

### Forwarding property decorators with StateEmitter

Property decorators may be passed to ```StateEmitter``` and will be forwarded to the underlying property.

#### Example

```ts
@Component({
    selector: "component",
    ...
})
class Component {

    // Given "NonNull" is a property decorator:
    @StateEmitter(NonNull())
    private readonly name$: Subject<string>;

    constructor () {
        this.name$.subscribe(name =>  console.log(`Name: ${name}`));
    }
}
```

Angular decorators may also be declared on the ```StateEmitter``` property itself. Lithium will automatically move the associated metadata to the underlying facade property. This is useful for [staying compliant with Angular's AoT compiler](/docs/aot-guide.md).

#### Example

```html
<component [disabled]="true"> </component>
```

```ts
@Component({...})
class Component {

    @StateEmitter()
    @Input("disabled") // @Input values will automatically be forwarded to the underlying property.
    private readonly disabled$: Subject<boolean>;

    constructor () {
        this.disabled$.subscribe(disabled =>  console.log(`Disabled: ${disabled}`)); // Output: Disabled: true
    }
}
```

### Combining StateEmitter with other reactive decorators

```StateEmitter``` can be combined with other reactive decorators. The following example shows ```@StateEmitter``` being used with the ```@Select``` decorator from [NGXS](https://github.com/ngxs/store):

```ts
@Component({...})
class Component {

    @StateEmitter({ readOnly: true })
    @Select(AppState.getUsername)
    private readonly username$: Observable<boolean>;
}
```

```username$``` will now function as both a ```StateEmitter``` and an NGXS ```Selector```.

For more information, see [self-proxying StateEmitters](#self-proxying-stateemitters).

### StateEmitter and inheritance

```StateEmitter``` fully supports class and prototypical inheritance.

#### Example

```ts
abstract class ComponentBase {

    @StateEmitter({initialValue: "Default"})
    protected readonly username$: Subject<string>;

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

## Proxied StateEmitters

Angular components will often use information from services and other sources. Proxied ```StateEmitter```s can be used to represent extenal values from within a component, or even create aliases for existing values.

```StateEmitter``` proxies create reactive references to properties within the component class and allow them to be used like any other ```StateEmitter``` reference. Dot path notation may be used to reference nested properties.

### Example

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
    private readonly nestedProperty$: Observable<number>;

    constructor (public fooService: FooService) { }
}
```

### Static vs dynamic proxy property paths

Proxy paths are considered either dynamic or static depending on the type of the properties within it. If a proxy path is dynamic, the resulting reference to the property will be an ```Observable```. If a path is static, the reference will be a ```Subject```.

A proxy path is considered static only if all of the following conditions are met:

* The last property in the path is a ```Subject```.
* All other properties in the path are not of type ```Subject``` or ```Observable```.

#### Example

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
    private readonly settings$: Subject<Settings>;

    @StateEmitter.Alias("settings$.notificationsEnabled")
    private readonly notificationsEnabled$: Observable<boolean>;

    constructor (public settingsService: SettingsService) { }
}
```

In the above example, the proxy path ```settingsService.settings$``` is considered static, because the last property is a ```Subject``` and the rest of the path does not contain any ```Observable```s or ```Subject```s. The proxy path ```settings$.notificationsEnabled``` is not static, because the last property is not a ```Subject```, and the first property in the path is a ```Subject```.

### Updating Subjects in dynamic proxy property paths

If a dynamic property path contains a ```Subject```, it will automatically be notified of changes to the proxied property. The example below illustrates two-way binding of an aliased property with a dynamic property path containing a ```Subject```.

#### Example

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
    private readonly notificationsEnabled$: Observable<boolean> ;

    constructor (public settingsService: SettingsService) { }
}
```

When ```notificationsEnabled``` is updated via the form input, ```settingsService.settings$``` will automatically emit a merged ```Settings``` object with the new value of ```notificationsEnabled```. All other property values on the ```Settings``` object will also be preserved.

## Types of StateEmitter Proxies

* ```Alias```
* ```From```
* ```Merge```

### Alias

The ```Alias``` proxy type simply resolves the given property path and creates an observable that directly maps back to the property value.

#### Example

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

    @StateEmitter.Alias("sessionManager.session$")
    private readonly session$: Subject<Session>;

    constructor (public sessionManager: SessionManager) { }
}
```

```Alias``` can also be used with other ```StateEmitter``` references:

```html
<div> Welcome back, {{username}}</div>
```

```ts
@Component({...})
class Component {

    @StateEmitter.Alias("sessionManager.session$")
    private readonly session$: Subject<Session>;

    @StateEmitter.Alias("session$.username")
    private readonly username$: Observable<string>;

    constructor (public sessionManager: SessionManager) { }
}
```

### From

The ```From``` proxy type creates a new ```Subject``` that gets its initial value from the source.

#### Example

```html
<form>
    <input type="text" [(ngModel)]="username">
</form>
```

```ts
@Component({...})
class FormComponent {

    @StateEmitter.From("sessionManager.session$.username")
    private readonly username$: Subject<string>;

    constructor (private sessionManager: SessionManager) { }
}
```

In the above example, any form updates to ```username``` will only be reflected on ```FormComponent.username$```. ```sessionManager.session$``` will not receive any updates.

### Merge

The ```Merge``` proxy type creates a new ```Subject``` that subscribes to all updates from the source.

#### Example

```html
<form>
    <input type="date" [(ngModel)]="date">
</form>
```

```ts
@Component({...})
class FormComponent {

    @StateEmitter.Merge("fooService.date$")
    private readonly date$: Subject<Date>;

    constructor (private fooService: FooService) { }
}
```

In the above example, any form updates to ```date``` will only be reflected on ```FormComponent.date$```. ```fooService.date$``` will not receive any updates.

## Self-proxying StateEmitters

A self-proxying ```StateEmitter``` is simply a proxied ```StateEmitter``` with a proxy path to itself. This is useful for combining ```StateEmitter``` with other reactive decorators.

```ts
@Component({...})
class Component {

    @StateEmitter.Alias("username$")
    @Select(AppState.getUsername)
    private readonly username$: Observable<boolean>;
}
```

In the above example, the ```@Select()``` decorator creates an ```Observable``` instance on ```username$```. Using ```@StateEmitter.Alias("username$")``` will allow us to capture that ```Observable``` and then use it for binding in the view template. Lithium also provides several convenience decorators for creating self-proxying StateEmitters.

```ts
@Component({...})
class Component {

    @StateEmitter.AliasSelf() // Equivalent to `@StateEmitter.Alias("username$")`
    @Select(AppState.getUsername)
    private readonly username$: Observable<boolean>;
}
```

Lithium will automatically detect if a ```StateEmitter``` decorator is being used with another decorator. If another reactive decorator is being used, it will change to an aliasing self-proxied ```StateEmitter``` by default.

```ts
@Component({...})
class Component {

    @StateEmitter() // Equivalent to `@StateEmitter.AliasSelf()`
    @Select(AppState.getUsername)
    private readonly username$: Observable<boolean>;
}
```

For more information, see the [API reference](/docs/api-reference.md#stateemitteraliasself).

[**API reference**](/docs/api-reference.md#stateemitter)

## Lifecycle Event Decorators

Helper decorators are provided that proxy all of the Angular component lifecycle events. These are:

* OnChanges
* OnInit
* OnDestroy
* DoCheck
* AfterContentInit
* AfterContentChecked
* AfterViewInit
* AfterViewChecked

### Example

```ts
@Component({...})
class Component {

    @OnInit()
    private readonly onInit$: Observable<void>;

    constructor () {
        this.onInit$.subscribe(() =>  console.log("Component is initialized."));
    }
}
```

[**API reference**](/docs/api-reference.md#angular-lifecycle-eventsource-decorators)

## AutoPush

With AutoPush, Lithium will automatically invoke change detection on a component when the value of any ```StateEmitter``` changes. This allows for writing more performant components using [OnPush change detection](https://angular.io/api/core/ChangeDetectionStrategy) without the [traditional pitfalls](https://blog.angular-university.io/onpush-change-detection-how-it-works/) associated with OnPush change detection.

AutoPush is enabled on a component by using the ```AutoPush.enable``` function:

### Example

```ts
@Component({
    ...
    changeDetection: ChangeDetectionStrategy.OnPush // Enable OnPush change detection for this component
})
class Component extends AotAware {

    @StateEmitter()
    private readonly value$: Subject<number>;

    constructor(cdRef: ChangeDetectorRef) {
        AutoPush.enable(this, cdRef); // Enable AutoPush
    }
}
```

When using AutoPush, you should also set the component's ```changeDetection``` to ```ChangeDetectionStrategy.OnPush```. If a component's state is expressed entirely through ```StateEmitters```, change detection will no longer need to be manually invoked in the component.

[**API reference**](/docs/api-reference.md#autopush)