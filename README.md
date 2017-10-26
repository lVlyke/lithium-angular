Angular RxJS Extensions
=======================
A set of extensions that enable easily writing stateless Angular components using RxJS.

## Installation
The project can be installed via **npm** using the following command:
```
$ npm install angular-rxjs-extensions
```

## Quick Intro Guide
### EventSource
EventSource is the main decorator used for responding to events from a component. EventSource creates a proxy method for intercepting events (such as UI events or component lifecycle events) executed via callback, and translates them into observables.

**Template**
```
<button (click)="onButtonPress()"></button>
```

**Component**
```
class Component {

    @EventSource() private onButtonPress$;

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