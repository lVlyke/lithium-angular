<!-- markdownlint-disable MD024 MD031 --> 

# Lithium for Angular (@lithiumjs/angular)

[![Build Status](https://travis-ci.org/lVlyke/lithium-angular.svg?branch=master)](https://travis-ci.org/lVlyke/lithium-angular) [![Coverage](./coverage/coverage.svg)](./coverage/coverage.svg)

Reactive components made easy. Lithium provides utilities that enable seamless reactive state and event interactions for Angular components.

## Features

* **Reactive component state**

    Lithium's `ComponentStateRef` service automatically exposes a component's state as a collection of subjects with full type safety:
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

    By tracking component state changes automatically, Lithium's [AutoPush](/docs/intro-guide.md#autopush) feature allows you to easily write more performant components using [OnPush](https://angular.io/api/core/ChangeDetectionStrategy).
* **Beyond `async`**

    Lithium automatically manages subscription lifetimes just like Angular's [async pipe](https://angular.io/api/common/AsyncPipe), without its syntax overhead (and [ugly workarounds](https://coryrylan.com/blog/angular-async-data-binding-with-ng-if-and-ng-else)).

Read through the [intro guide](/docs/intro-guide.md) to get to know Lithium's core features and view the [example app](https://github.com/lVlyke/lithium-angular-example-app) to see Lithium in action with real-world use-cases. Full [API](/docs/api-reference.md) documentation is also available.

If you are upgrading from Lithium 6.x or earlier, read through the [migration guide](/docs/lithium-7-migration-guide.md) to see how to updgrade your app to use the latest features from Lithium.

* [**Features**](#features)
* [**Installation**](#installation)
* [**Quick Start Guide**](/docs/intro-guide.md)
* [**API Reference**](/docs/api-reference.md)
* [**FAQ and Other Information**](#other-information)

## [Example app](https://github.com/lVlyke/lithium-angular-example-app) - [[Live demo]](https://lvlyke.github.io/lithium-angular-example-app)

## Installation

Lithium can be installed [via **npm**](https://www.npmjs.com/package/@lithiumjs/angular) using the following command:

```bash
npm install @lithiumjs/angular
```

## FAQ and Other information

### FAQ

#### Does Lithium support Ivy (the default rendering engine for Angular 9+)?

Lithium fully supports Ivy-based applications. **Note**: Please be aware that Lithium currently uses features from the not-yet finialized Ivy API, so some features of Lithium could stop working in later versions of Angular before Lithium is updated to support them.

#### Does Lithium support the ViewEngine (pre-Ivy) applications?

Lithium 5.x.x is the last major version that supports ViewEngine-based applications. Lithium 6.x.x and above only supports Ivy-based applications.

### Other information

* [Migration guide](/docs/lithium-7-migration-guide.md) for migrating from Lithium 6.x and below to newer versions of Lithium.
* [@lithiumjs/ngx-material-theming](https://github.com/lVlyke/lithium-ngx-material-theming) - A theming utility for Angular Material built with Lithium.
