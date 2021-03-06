<!-- markdownlint-disable MD024 MD031 --> 

# Lithium for Angular (@lithiumjs/angular)

[![Build Status](https://travis-ci.org/lVlyke/lithium-angular.svg?branch=master)](https://travis-ci.org/lVlyke/lithium-angular) [![Coverage](./coverage/coverage.svg)](./coverage/coverage.svg)

A decorator-based library that allows you to fully use RxJS with Angular. Use Observables as first-class citizens in your view templates! Listen to component lifecycle events with Observables! Lithium makes your components highly reactive.

* [**Introduction**](#introduction)
* [**Installation**](#installation)
* [**Quick Start Guide**](/docs/intro-guide.md)
* [**Ivy/AoT Guide**](/docs/limitations.md)
* [**API Reference**](/docs/api-reference.md)
* [**FAQ and Other Information**](#other-information)

## [Example app](https://github.com/lVlyke/lithium-angular-example-app) - [[Live demo]](https://lvlyke.github.io/lithium-angular-example-app)

## Introduction

* **Intuitive decorators**:

    Lithium is decorator-based and easy to use:
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
* **Full reactive template binding**:

    Lithium's `@StateEmitter` lets you pass Observables directly as inputs to any component and two-way bind Subjects directly to `ngModel`.
* **Works with Angular component decorators**:
    
    You can use Angular's built-in component decorators with Lithium. Use an `@Input` as a Subject and listen to a `@HostListener` event as an Observable!
* **OnPush components made easy**:

    With Lithium, writing more performant components using [OnPush](https://angular.io/api/core/ChangeDetectionStrategy) change detection is simple; just enable [AutoPush](/docs/intro-guide.md#autopush)!
* **Like `async`, but better**:

    Lithium automatically manages subscription lifetimes just like Angular's [async pipe](https://angular.io/api/common/AsyncPipe), without its syntax overhead (and [ugly workarounds](https://coryrylan.com/blog/angular-async-data-binding-with-ng-if-and-ng-else)).
* **Integrates with other reactive decorators**:

    Lithium can be used in conjunction with other reactive decorator-based libraries like [NGXS](https://github.com/ngxs/store).

Read through the [intro guide](/docs/intro-guide.md) to get to know Lithium's core features and view the [example app](https://github.com/lVlyke/lithium-angular-example-app) to see Lithium in action with real-world use-cases. Full [API](/docs/api-reference.md) documentation is also available.

Lithium supports Angular's new Ivy compiler. Read [here](/docs/limitations.md) for more info.

## Installation

Lithium can be installed [via **npm**](https://www.npmjs.com/package/@lithiumjs/angular) using the following command:

```bash
npm install @lithiumjs/angular
```

## FAQ and Other information

### FAQ

#### Does Lithium support Ivy (the default rendering engine for Angular 9+)?

Lithium fully supports Ivy-based applications. **Note**: Please be aware that Lithium currently uses features from the not-yet finialized Ivy API, so some features of Lithium could stop working in later versions of Angular before Lithium is updated to support them.

If you are upgrading a Lithium-enabled app to Ivy that currently uses ViewEngine, you should read the [Ivy upgrade guide](/docs/ivy-upgrade.md) for Lithium.

#### Does Lithium support the ViewEngine (pre-Ivy) applications?

Lithium 5.x.x is the last major version that supports ViewEngine-based applications. Lithium 6.x.x and above only supports Ivy-based applications.

#### Are there any known limitations with Lithium?

While Lithium integrates cleanly with Angular for the majority of cases, there are certain limitations that [are noted here](/docs/limitations.md).

### Other information

* [Ivy upgrade guide](/docs/ivy-upgrade.md) for Lithium.
* [@lithiumjs/ngx-material-theming](https://github.com/lVlyke/lithium-ngx-material-theming)
