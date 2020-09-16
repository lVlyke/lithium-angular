# Quick Guide to Lithium for Angular

This guide is designed to go over the core features of Lithium and examples of how to use them.

* [Lithium vs `async`](#lithium-vs-asyncpipe)
* [EventSource](#eventsource)
* [StateEmitter](#stateemitter)
* [Proxied StateEmitters](#proxied-stateemitters)
* [Lifecycle Event Decorators](#lifecycle-event-decorators)
* [AutoPush (Automatic OnPush detection)](#autopush)
* [Limitations](/docs/limitations.md)
* [Further reading](#further-reading)

(Also see the full [**API reference**](/docs/api-reference.md))

## Lithium vs ```AsyncPipe```

Angular has a built-in [async pipe](https://angular.io/api/common/AsyncPipe) that offers many similar features to Lithium. Lithium includes all of the benefits of ```async``` with additional features:

* **No syntax overhead** - Lithium allows you to treat reactive variables just like normal variables inside templates. There's no pipes to use, and things like nested properties can be accessed easily without [ugly workarounds](https://coryrylan.com/blog/angular-async-data-binding-with-ng-if-and-ng-else).
* **Reactive two-way binding support** - Lithium natively supports two-way binding of Subjects using ```[(ngModel)]``` and by direct template assignments (i.e. ```(click)="foo = 'bar'"```).
* **Reactive event binding support** - Unlike ```async```, Lithium supports reactive event binding. Click events, [lifecycle events](#lifecycle-event-decorators), and more are Observables that can be subscribed to, instead of invoked as callback functions.
* **Works with Angular component decorators (```@Input```, ```@Output```, ```@HostListener``` and more)** - Lithium can be used to make reactive component inputs as Subjects and respond to host events through subscriptions to Observables with no syntax overhead.
* **Useful for components and directives** - Lithium's [AutoPush functionality](#autopush) can also be used for easily writing OnPush-friendly directives.

Like ```async```, Lithium also has the following benefits:

* **Automatic subscription management** - Lithium will automatically end subscriptions when components are destroyed.
* **Simplified OnPush change detection** - Using AutoPush, Lithium makes writing [OnPush](https://angular.io/api/core/ChangeDetectionStrategy)-capable components trivial.

## EventSource

```EventSource``` is the decorator used for reactive [event binding](https://angular.io/guide/template-syntax#event-binding). ```EventSource``` creates an ```Observable``` that can be used to react to component and lifecycle events. Subscriptions to EventSources are automatically cleaned up when the component is destroyed.

**Note**: A component using ```EventSource``` must extend the [Lithium base class](/docs/limitations.md). The examples below assume your app is using Ivy. If your app still uses ViewEngine (Ivy opt-out or Angular pre-9), you must extend the [AotAware](/docs/api-reference.md#aotaware-deprecated) class instead.

### Template

```html
<button (click)="onButtonPress()"> </button>
```

### Component

```ts
@Component({...})
class Component extends LiComponent {

    @EventSource()
    private readonly onButtonPress$: Observable<any>;

    constructor () {
        super();

        this.onButtonPress$.subscribe(() =>  console.log("The button was pressed."));
    }
}
```

In the example above, an ```onButtonPress``` function is automatically created in the component's template that can be used to bind to events.

### Using EventSource with Angular lifecycle events

```EventSource``` can also be used to capture all Angular component lifecycles (i.e. ```OnInit```) as observables. Convenience decorators are provided for every lifecycle event.

### Example

```ts
@Component({...})
class Component {

    @OnInit()
    private readonly onInit$: Observable<void>;

    constructor () {
        // onInit$ emits when the component's ngOnInit() lifecycle hook is invoked
        this.onInit$.subscribe(() =>  console.log("Component is initialized."));
    }
}
```

For more info, see the [full list](#lifecycle-event-decorators) of lifecycle event decorators.

### Forwarding method decorators with EventSource

Other method decorators may be passed to ```EventSource``` and will be forwarded to the underlying facade function.

#### Example

```ts
// Given "Throttle" is a method decorator factory:
@EventSource(Throttle(1000))
private readonly onButtonPress$: Observable<any>;
```

Angular decorators like `@HostListener` may also be used with `@EventSource`, however they **must** be applied to the ```EventSource``` property itself, as illustrated below:

#### Example

```ts
@Component({...})
class Component extends LiComponent {

    @HostListener("click") // Add @HostListener directly to `onClick$`
    @EventSource()
    private readonly onClick$: Observable<any>;

    constructor () {
        super();

        this.onClick$.subscribe(() =>  console.log("The component was clicked."));
    }
}
```

[Read here](/docs/limitations.md) for more info.

### EventSource and inheritance

```EventSource``` can be declared in a base class and be used by child classes.

#### Example

```ts
abstract class ComponentBase extends LiComponent {

    @OnInit()
    protected readonly onInit$: Observable<void>;

    constructor() {
        super();

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

**Note**: A component using ```StateEmitter``` must extend the [Lithium base class](/docs/limitations.md). The examples below assume your app is using Ivy. If your app still uses ViewEngine (Ivy opt-out or Angular pre-9), you must extend the [AotAware](/docs/api-reference.md#aotaware-deprecated) class instead.

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
class Component extends LiComponent {

    @EventSource()
    private readonly resetAmount$: Observable<void>;

    @StateEmitter({initialValue: 0})
    private amount$: Subject<number>;

    constructor () {
        super();

        this.resetAmount$.subscribe(() => this.amount$.next(0));
    }
}
```

In the example above, an ```amount``` property is automatically created in the component's template that can be used to bind to properties.

### Forwarding property decorators with StateEmitter

Property decorators may be passed to ```StateEmitter``` and will be forwarded to the underlying property.

#### Example

```ts
// Given "NonNull" is a property decorator:
@StateEmitter(NonNull())
private readonly name$: Subject<string>;
```

Angular decorators like `@Input` and `@ViewChild` may also be used with `@StateEmitter`, however they **must** be applied to the ```StateEmitter``` property itself, as illustrated below:

#### Example

```html
<component [disabled]="true"> </component>
```

```ts
@Component({...})
class Component extends LiComponent {

    @Input("disabled") // Add @Input directly to `disabled$`
    @StateEmitter()
    private readonly disabled$: Subject<boolean>;

    constructor () {
        super();

        // disabled$ will emit whenenver the `disabled` Input changes:
        this.disabled$.subscribe(disabled =>  console.log(`Disabled: ${disabled}`)); // Output: Disabled: true
    }
}
```

Names for `@Input` and `@Output` decorators must explicitly be declared when used with `@StateEmitter`, as shown above. See the [limitations section](/docs/limitations.md) for more info.

### Combining StateEmitter with other reactive decorators

```StateEmitter``` can be combined with other reactive decorators. The following example shows ```@StateEmitter``` being used with the ```@Select``` decorator from [NGXS](https://github.com/ngxs/store):

```ts
@Component({...})
class Component extends LiComponent {

    @StateEmitter({ readOnly: true })
    @Select(AppState.getUsername)
    private readonly username$: Observable<boolean>;
}
```

```username$``` will now function as both a ```StateEmitter``` and an NGXS ```Selector```.

For more information, see [self-proxying StateEmitters](#self-proxying-stateemitters).

### StateEmitter and inheritance

```StateEmitter``` can be declared in a base class and be used by child classes.

#### Example

```ts
abstract class ComponentBase extends LiComponent {

    @StateEmitter({initialValue: "Default"})
    protected readonly username$: Subject<string>;

    constructor() {
        super();

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

```StateEmitter``` proxies create reactive references to properties within the component class and allow them to be used like any other ```StateEmitter``` reference. Nested properties may be accessed using the property access operator (`.`) or the conditional access operator (`?.`). Bracket notation (i.e. `object['property']`) is not currently supported.

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
class Component extends LiComponent {

    @StateEmitter({
        proxyMode: EmitterMetadata.ProxyMode.Alias,
        proxyPath: "fooService.nestedProperty",
    })
    private readonly nestedProperty$: Observable<number>;

    constructor (public fooService: FooService) {
        super();
    }
}
```

### Static vs dynamic proxy property paths

Proxy paths are considered either dynamic or static depending on the type of the properties within it. If a proxy path is dynamic, the resulting reference to the property will be an ```Observable```. If a path is static, the reference will be of the type of the final property in the proxy path.

A proxy path is considered static only if all of the following conditions are met:
 
* The last property in the path is a ```Subject```.
* All other properties in the path are not of type ```Subject``` or ```Observable```.
* None of the properties are conditionally accessed (i.e. using the `?.` operator).

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
class FormComponent extends LiComponent {

    // Static proxy path:
    @StateEmitter.Alias("settingsService.settings$")
    private readonly settings$: Subject<Settings>;

    // Dynamic proxy path:
    @StateEmitter.Alias("settingsService?.settings$")
    private readonly settings$: Subject<Settings>;

    // Dynamic proxy path:
    @StateEmitter.Alias("settings$.notificationsEnabled")
    private readonly notificationsEnabled$: Observable<boolean>;

    constructor (public settingsService: SettingsService) {
        super();
    }
}
```

In the above example, the proxy path ```settingsService.settings$``` is considered static, because the last property is a ```Subject``` and the rest of the path does not contain any ```Observable```s or ```Subject```s, which meets all three criteria. However, if we add a conditional access to the proxy path it becomes dynamic. The proxy path ```settings$.notificationsEnabled``` is also not static, because the last property is not a ```Subject``` and the first property in the path is a ```Subject```, which fails the first two criteria of static paths.

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
class FormComponent extends LiComponent {

    // Dynamic proxy property path that contains a Subject
    @StateEmitter.Alias("settingsService.settings$.notificationsEnabled")
    private readonly notificationsEnabled$: Observable<boolean> ;

    constructor (public settingsService: SettingsService) {
        super();
    }
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
class Component extends LiComponent {

    @StateEmitter.Alias("sessionManager.session$")
    private readonly session$: Subject<Session>;

    constructor (public sessionManager: SessionManager) {
        super();
    }
}
```

```Alias``` can also be used with other ```StateEmitter``` references:

```html
<div> Welcome back, {{username}}</div>
```

```ts
@Component({...})
class Component extends LiComponent {

    @StateEmitter.Alias("sessionManager.session$")
    private readonly session$: Subject<Session>;

    @StateEmitter.Alias("session$.username")
    private readonly username$: Observable<string>;

    constructor (public sessionManager: SessionManager) {
        super();
    }
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
class FormComponent extends LiComponent {

    @StateEmitter.From("sessionManager.session$.username")
    private readonly username$: Subject<string>;

    constructor (private sessionManager: SessionManager) {
        super();
    }
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
class FormComponent extends LiComponent {

    @StateEmitter.Merge("fooService.date$")
    private readonly date$: Subject<Date>;

    constructor (private fooService: FooService) {
        super();
    }
}
```

In the above example, any form updates to ```date``` will only be reflected on ```FormComponent.date$```. ```fooService.date$``` will not receive any updates.

## Self-proxying StateEmitters

A self-proxying ```StateEmitter``` is simply a proxied ```StateEmitter``` with a proxy path to itself. This is useful for combining ```StateEmitter``` with other reactive decorators.

```ts
@Component({...})
class Component extends LiComponent {

    @StateEmitter.Alias("username$")
    @Select(AppState.getUsername)
    private readonly username$: Observable<boolean>;
}
```

In the above example, the ```@Select()``` decorator creates an ```Observable``` instance on ```username$```. Using ```@StateEmitter.Alias("username$")``` will allow us to capture that ```Observable``` and then use it for binding in the view template. Lithium also provides several convenience decorators for creating self-proxying StateEmitters.

```ts
@Component({...})
class Component extends LiComponent {

    @StateEmitter.AliasSelf() // Equivalent to `@StateEmitter.Alias("username$")`
    @Select(AppState.getUsername)
    private readonly username$: Observable<boolean>;
}
```

Lithium will automatically detect if a ```StateEmitter``` decorator is being used with another decorator. If another reactive decorator is being used, it will change to an aliasing self-proxied ```StateEmitter``` by default.

```ts
@Component({...})
class Component extends LiComponent {

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
class Component extends LiComponent {

    @StateEmitter()
    private readonly value$: Subject<number>;

    constructor(cdRef: ChangeDetectorRef) {
        super();

        AutoPush.enable(this, cdRef); // Enable AutoPush
    }
}
```

When using AutoPush, you should also set the component's ```changeDetection``` to ```ChangeDetectionStrategy.OnPush```. If a component's state is expressed entirely through ```StateEmitters```, change detection will no longer need to be manually invoked in the component.

[**API reference**](/docs/api-reference.md#autopush)

## Further Reading

* Take a look at the [example project](https://github.com/lVlyke/lithium-angular-example-app) to see Lithium used in a real app alongside libraries like NGXS and Angular Material.