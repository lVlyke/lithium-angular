<!-- markdownlint-disable MD024 MD031 -->

# Angular RxJS Extensions

A set of extensions that enable easily writing stateless Angular components using RxJS.

## Installation

The project can be installed via **npm** using the following command:

```bash
npm install angular-rxjs-extensions
```

## Quick Intro Guide

### Bootstrapping

Bootstrapping is required on the target class to enable event sources and state emitters for each instance. This is done via the ```Reactive``` class decorator.

#### Example

```ts
@Component({...})
@Reactive()
class Component {

    @OnInit() private onInit$: Observable<void>;

    constructor () {
        this.onInit$.subscribe(() => "Hello world.");
    }
}
```

### EventSource

```EventSource``` is the main decorator used for responding to events from a component. ```EventSource``` creates a proxy method for intercepting events (such as UI events or component lifecycle events) executed via callback, and translates them into observables.

#### Template

```html
<button (click)="onButtonPress()"></button>
```

#### Component

```ts
@Component({...})
@Reactive()
class Component {

    @EventSource() private onButtonPress$: Observable<any>;

    constructor () {
        this.onButtonPress$.subscribe(() => console.log("The button was pressed."));
    }
}
```

### StateEmitter

```StateEmitter``` is the decorator used to automatically synchronize state of a component, allowing for reactive communication to and from the UI via subjects.

#### Template

```html
<div>You clicked the button {{buttonPressCount}} times.</div>
<button (click)="onButtonPress()"></button>
```

#### Component

```ts
@Component({...})
@Reactive()
class Component {

    @EventSource() private onButtonPress$: Observable<any>;

    @StateEmitter({value: 0}) private buttonPressCount$: Subject<number>;

    constructor () {
        this.onButtonPress$
            .flatMap(() => this.buttonPressCount$.take(1))
            .subscribe(buttonPressCount => this.buttonPressCount$.next(buttonPressCount + 1));
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
@Component({...})
@Reactive()
class Component {

    @StateEmitter({
        proxyMode: EmitterMetadata.ProxyMode.Alias,
        proxyPath: "fooService.nestedProperty",
    })
    private nestedProperty$: Observable<number>;

    constructor (private fooService: FooService) { }
}
```

#### Static vs Dynamic Proxy Property Paths

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

    public settings$ = new BehaviorSubject<Settings>({
        notificationsEnabled: true,
        someOtherSetting: 1
    });
}
```

```ts
@Component({...})
@Reactive()
class FormComponent {

    @StateEmitter.Alias("settingsService.settings$")
    private settings$: Subject<Settings>;

    @StateEmitter.Alias("settings$.notificationsEnabled")
    private notificationsEnabled$: Observable<boolean>;

    constructor (private settingsService: SettingsService) { }
}
```

In the above example, the proxy path ```settingsService.settings$``` is considered static, because the last property is a ```Subject``` and the rest of the path does not contain any ```Observable```s or ```Subject```s. The proxy path ```settings$.notificationsEnabled``` is not static, because the last property is not a ```Subject```, and the first property in the path is a ```Subject```.

While a property that is proxied via a dynamic property path can only be observed, the value can still be updated if there is at least one ```Subject``` in the property path. The example below illustrates two-way binding with an ```Alias``` proxy ```StateEmitter``` with a dynamic property path.

##### Example

```html
<form>
    <input [(ngModel)]="notificationsEnabled" type="checkbox">
</form>
```

```ts
@Component({...})
@Reactive()
class FormComponent {

    // Dynamic proxy property path that contains a Subject
    @StateEmitter.Alias("settingsService.settings$.notificationsEnabled")
    private notificationsEnabled$: Observable<boolean>;

    constructor (private settingsService: SettingsService) { }
}
```

When ```notificationsEnabled``` is updated via the form input, ```settingsService.settings$``` will automatically emit a new ```Settings``` object with the new value of ```notificationsEnabled```. All other property values on the ```Settings``` object will also be preserved.

### Types of StateEmitter Proxies

There are currently two types of proxy emitters, ```Alias``` and ```From```.

#### Alias

The ```Alias``` proxy type simply resolves the given property path and creates an observable that directly maps back to the property value.

##### Example

```ts
class SessionManager {

    private _session$: Subject<Session>;

    public get session$(): Observable<Session> {
        return this._session$.asObservable();
    }
}
```

```html
<div>Welcome back, {{session.username}}</div>
```

```ts
@Component({...})
@Reactive()
class Component {

    @StateEmitter.Alias("sessionManager.session$") private session$: Subject<Session>;

    constructor (private sessionManager: SessionManager) { }
}
```

```Alias``` can also be used with other ```StateEmitter``` references:

```html
<div>Welcome back, {{username}}</div>
```

```ts
@Component({...})
@Reactive()
class Component {

    @StateEmitter.Alias("sessionManager.session$") private session$: Subject<Session>;
    @StateEmitter.Alias("session$.username") private username$: Observable<string>;

    constructor (private sessionManager: SessionManager) { }
}
```

#### From

The ```From``` proxy type creates a separate ```Subject``` that subscribes to all updates from the source property, but captures any updates without sharing them with the source.

##### Example

```html
<form>
    <input type="text" [(ngModel)]="username">
</form>
```

```ts
@Component({...})
@Reactive()
class FormComponent {

    @StateEmitter.From("sessionManager.session$.username") private username$: Observable<string>;

    constructor (private sessionManager: SessionManager) { }
}
```

In the above example, any form updates to ```username``` will only be reflected within ```FormComponent```, and ```sessionManager.session$``` will not receive any updates.

### Lifecycle Events

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
@Reactive()
class Component {

    @OnInit() private onInit$: Observable<void>;

    constructor () {
        this.onInit$.subscribe(() => "Component is initialized.");
    }
}
```

## Other information

* [Ionic extensions](https://github.com/lVlyke/angular-rxjs-extensions-ionic) for angular-rxjs-extensions.