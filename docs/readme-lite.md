# Lithium for Angular (@lithiumjs/angular)

Reactive components made easy! Lithium provides utilities that enable seamless reactive state and event interactions for Angular components.

Check out the [full README](https://github.com/lVlyke/lithium-angular/blob/master/README.md) for more information.

## Features

* **Reactive component state**

    Lithium's `ComponentStateRef` service exposes a type-safe representation of component state properties as Subjects, allowing for observation of the component's full state automatically:
```ts
import { ComponentState, ComponentStateRef } from '@lithiumjs/angular';

@Component({
    ...
    providers: [ComponentState.create(MyComponent)]
})
class MyComponent {

    public value = 0;

    constructor (stateRef: ComponentStateRef<MyComponent>) {
        stateRef.get('value').subscribe(value => console.log("value: ", value));

        this.value = 100;
    }

    // Output:
    // value: 0
    // value: 100
}
```

* **Reactive lifecycle decorators**

    Lithium adds support for reactive component events, including decorators for component lifecycle events:
```ts
import { OnInit } from '@lithiumjs/angular';

@Component({...})
class MyComponent {

    @OnInit() 
    private readonly onInit$: Observable<void>;

    constructor () {
        this.onInit$.subscribe(() => console.log("Reactive ngOnInit!"));
    }
}
```
* **Works with Angular component decorators**
    
    You can use Angular's built-in component decorators with Lithium. Use an `@Input` as a Subject and listen to a `@HostListener` event as an Observable!
* **OnPush components made easy**

    By tracking component state changes automatically, Lithium's **AutoPush** feature allows you to easily write more performant components using [OnPush](https://angular.io/api/core/ChangeDetectionStrategy).
* **Beyond `async`**

    Lithium automatically manages subscription lifetimes just like Angular's [async pipe](https://angular.io/api/common/AsyncPipe), without its syntax overhead (and [ugly workarounds](https://coryrylan.com/blog/angular-async-data-binding-with-ng-if-and-ng-else)).

## Installation

Lithium can be installed [via **npm**](https://www.npmjs.com/package/@lithiumjs/angular) using the following command:

```bash
npm install @lithiumjs/angular
```

## More information

Check out the [full README](https://github.com/lVlyke/lithium-angular/blob/master/README.md) for more information, including usage guides and API documentation.
