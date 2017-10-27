Angular RxJS Extensions
=======================
A set of extensions that enable easily writing stateless Angular components using RxJS.

## Installation
The project can be installed via **npm** using the following command:
```
$ npm install angular-rxjs-extensions
```

## Quick Intro Guide
### Bootstrapping
Bootstrapping is required on the target class to enable event sources and state emitters for each instance. This is done via the Reactive class decorator.

**Example**
```
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
EventSource is the main decorator used for responding to events from a component. EventSource creates a proxy method for intercepting events (such as UI events or component lifecycle events) executed via callback, and translates them into observables.

**Template**
```
<button (click)="onButtonPress()"></button>
```

**Component**
```
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
StateEmitter is the decorator used to automatically synchronize state of a component, allowing for reactive communication to and from the UI via subjects.

**Template**
```
<div>You clicked the button {{buttonPressCount}} times.</div>
<button (click)="onButtonPress()"></button>
```
**Component**
```
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

**Example**
```
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