# Intro Guide to Lithium for Angular

This guide is designed to go over the core features of Lithium and examples of how to use them.

If you are upgrading from Lithium 6.x or earlier, read through the [migration guide](/docs/lithium-7-migration-guide.md) to see how to upgrade your app to use the latest features from Lithium.

The legacy intro guide for older versions of Lithium can be found [here](/docs/legacy/intro-guide.md).

* [Lithium vs `async` pipe](#lithium-vs-asyncpipe)
* [ComponentState and ComponentStateRef](#componentstate)
  - [@DeclareState](#declarestate)
  - [@AsyncState](#asyncstate)
* [DirectiveState and DirectiveStateRef](#directivestate)
* [@EventSource](#eventsource)
  - [Component lifecycle decorators](#lifecycle-decorators)
* [AutoPush (Automatic OnPush change detection)](#autopush)
* [Further reading](#further-reading)

(Also see the full [**API reference**](/docs/api-reference.md))

## Lithium vs `AsyncPipe`

Angular has a built-in [async pipe](https://angular.io/api/common/AsyncPipe) that is used to automatically subscribe to observables within a template. While this works well in many cases, there are limitations. Since values resolved with `async` are read-only, binding is limited to [one-way in binding](https://angular.io/guide/template-syntax#one-way-in). Child properties also cannot be accessed easily without [ugly workarounds](https://coryrylan.com/blog/angular-async-data-binding-with-ng-if-and-ng-else).

Lithium works by providing a service that can be injected into your components, called [`ComponentStateRef`](#componentstate). `ComponentStateRef` manages an RxJS `BehaviorSubject` for each public state property of a component instance, and automatically synchronizes its emissions with the corresponding property value. This provides several benefits:

* **No template overhead** - As Lithium allows you to continue to define your component state as synchronous values, you can use these values freely in component templates without the need for pipes or any other additional syntax overhead.
* **Two-way binding and template assignment support** - All component state mutations are synchronized in Lithium, so properties can be use in two-way binding (i.e. `[(ngModel)]`) or assigned to directly.
* **Useful for components and directives** - Lithium also provides an equivalent `DirectiveStateRef` service for directives. This service can be publically declared on a directive to allow for external reactive observation and interaction of the directive's state.

Like `async` pipe, Lithium also has the following benefits:

* **Automatic subscription management** - Lithium will automatically end subscriptions when components are destroyed.
* **Simplified OnPush change detection** - Using [AutoPush](#autopush), Lithium makes writing [OnPush](https://angular.io/api/core/ChangeDetectionStrategy)-enabled components trivial.
* **Support for external reactive state** - Component properties can be automatically subscribed to external observables using the `@AsyncState` decorator.

Lithium also adds support for reactive component event binding through the [@EventSource](#eventsource) decorator. `@HostListener` events, component lifecycle events, and more can be used as Observables instead of callback functions.

## ComponentState

[**API reference**](/docs/api-reference.md#componentstate)

In Lithium, the `ComponentState` type and corresponding `ComponentStateRef` service are used to observe and interact with properties of a component in a reactive manner. To create a `ComponentState` for a component, `ComponentState.create` must be called and declared in a component's `providers` list.

### Example - Creating a ComponentState provider

```ts
import { ComponentState } from '@lithiumjs/angular';

@Component({
    ...
    providers: [ComponentState.create(MyComponent)]
})
class MyComponent {
    ...
}
```

The `ComponentState` type represents a collection of Subjects and Observables that correspond to the public state of a component. All properties in `ComponentState` are postfixed with a `$` to denote that they are observables. As an example, suppose our component has the following properties:

```ts
import { ComponentState } from '@lithiumjs/angular';

@Component({
    ...
    providers: [ComponentState.create(MyComponent)]
})
class MyComponent {

    public readonly fooConstant = 'CONSTANT';
    public foo = 'hello world';
    public bar = 42;
}
```

In the above example, the type `ComponentState<Component>` would expand out to the following:

```ts
type ComponentState<MyComponent> = {
    readonly fooConstant$: Observable<string>;
    readonly foo$: Subject<string>;
    readonly bar$: Subject<number>;
}
```

To retrieve a component's `ComponentState`, we must inject the `ComponentStateRef` service. `ComponentStateRef` contains a number of methods for easily interacting with our `ComponentState`.

### Example - Using ComponentStateRef to observe component state changes

```ts
import { ComponentState, ComponentStateRef } from '@lithiumjs/angular';
import { combineLatest } from 'rxjs';

@Component({
    ...
    providers: [ComponentState.create(MyComponent)]
})
class MyComponent {

    public readonly fooConstant = 'CONSTANT';
    public foo = 'hello world';
    public bar = 42;

    constructor(stateRef: ComponentStateRef<MyComponent>) {
        stateRef.get('bar').subscribe(bar => console.log("bar: ", bar));
        
        combineLatest(stateRef.getAll('fooConstant', 'foo')).subscribe(([fooConstant, foo]) => {
            console.log('fooConstant', fooConstant);
            console.log('foo', foo);
        });
    }

    // Output:
    // bar: 42
    // fooConstant: 'CONSTANT'
    // foo: 'hello world'
}
```

`ComponentState` and `ComponentStateRef` are fully typesafe. If a given property does not exist, a compiler error will be thrown.

You can also retrieve the `ComponentState` directly by using `ComponentStateRef.state`:

```ts
import { ComponentState, ComponentStateRef } from '@lithiumjs/angular';
import { combineLatest } from 'rxjs';

@Component({
    ...
    providers: [ComponentState.create(MyComponent)]
})
class MyComponent {

    public readonly fooConstant = 'CONSTANT';
    public foo = 'hello world';
    public bar = 42;

    constructor(stateRef: ComponentStateRef<MyComponent>) {
        stateRef.state().subscribe(({ bar$, fooConstant$, foo$ }: ComponentState<MyComponent>) => {

            bar$.subscribe(bar => console.log("bar: ", bar));

            combineLatest([fooConstant$, foo$]).subscribe(([fooConstant, foo]) => {
                console.log('fooConstant', fooConstant);
                console.log('foo', foo);
            });
        });
    }

    // Output:
    // bar: 42
    // fooConstant: 'CONSTANT'
    // foo: 'hello world'
}
```

`ComponentStateRef` extends `Promise`, which resolves to the `ComponentState` directly:

```ts
import { ComponentState, ComponentStateRef } from '@lithiumjs/angular';
import { from } from 'rxjs';

@Component({
    ...
    providers: [ComponentState.create(MyComponent)]
})
class MyComponent {

    public readonly fooConstant = 'CONSTANT';
    public foo = 'hello world';
    public bar = 42;

    constructor(stateRef: ComponentStateRef<MyComponent>) {
        from(stateRef).subscribe(({ bar$, fooConstant$, foo$ }: ComponentState<MyComponent>) => {
            ...
        });
    }
}
```

`ComponentState` is fully compatible with component state property decorators like `@Input` and `@HostBinding`.

See the [**`ComponentStateRef` API reference**](/docs/api-reference.md#componentstateref) for more information.

### Declaring uninitialized and private properties with `@DeclareState` <a name="declarestate"></a>

In order for a component state property to be automatically managed in `ComponentState`, it must be declared `public` and explicitly initialized. For example, if our component contains an optional property, it will not be included in the `ComponentState` by default.

#### Example - Not using @DeclareState with uninitialized properties (Wrong way)

```ts
import { ComponentState, ComponentStateRef } from '@lithiumjs/angular';

@Component({
    ...
    providers: [ComponentState.create(MyComponent)]
})
class MyComponent {

    public optional?: number;

    constructor(stateRef: ComponentStateRef<MyComponent>) {
        // This will throw an error at runtime:
        stateRef.get('optional').subscribe(optional => console.log(optional));
    }
}
```

We can use the `@DeclareState` decorator to make sure this property is managed by `ComponentState`:

#### Example - Using @DeclareState with uninitialized properties (Right way)

```ts
import { ComponentState, ComponentStateRef, DeclareState } from '@lithiumjs/angular';

@Component({
    ...
    providers: [ComponentState.create(MyComponent)]
})
class MyComponent {

    @DeclareState()
    public optional?: number;

    constructor(stateRef: ComponentStateRef<MyComponent>) {
        stateRef.get('optional').subscribe(optional => console.log(optional));
    }
}
```

`@DeclareState` can also be used to manage private component state. If we pass in the name of a public property of the same type into `@DeclareState`, Lithium will automatically synchronize the state of the public property to that of the private property.

#### Example - Exposing private component state

```ts
import { ComponentState, ComponentStateRef, DeclareState } from '@lithiumjs/angular';

@Component({
    ...
    providers: [ComponentState.create(MyComponent)]
})
class MyComponent {

    @DeclareState('value')
    private _value = 0;

    constructor(stateRef: ComponentStateRef<MyComponent>) {
        // This will emit each time `_value` is updated:
        stateRef.get('value').subscribe(value => console.log(value));
    }

    public get value(): number {
        return this._value;
    }
}
```

`@DeclareState` is fully typesafe, so if the given property name does not exist or is not of the same type as the initial property, a compiler error will be thrown.

See the [**`@DeclareState` API reference**](/docs/api-reference.md#declarestate) for more information.

### Subscribing to external reactive state with `@AsyncState` <a name="asyncstate"></a>

Often times we will want to use reactive values from an external source in our component. This can be done easily using the `@AsyncState` decorator. The following example illustrates how `@AsyncState` can be used with the `@Select` decorator from [NGXS](https://github.com/ngxs/store):

```ts
import { AsyncState, ComponentState } from '@lithiumjs/angular';
import { Select } from '@ngxs/store';

@Component({
    ...
    providers: [ComponentState.create(MyComponent)]
})
class MyComponent {

    @Select(AppState.getUser)
    public readonly user$!: Observable<User>;

    @AsyncState()
    public user!: User;
}
```

Now `user` will automatically be updated whenever `user$` emits a new value.

By default, `AsyncState` will look for an Observable-derived property of the same property name with a postfixed `$` character. `@AsyncState` is fully typesafe, so if no suitable property is found, a compiler error will be thrown.

A specific async property name can be explicitly passed into `@AsyncState`:

```ts
import { AsyncState, ComponentState } from '@lithiumjs/angular';
import { Select } from '@ngxs/store';

@Component({
    ...
    providers: [ComponentState.create(MyComponent)]
})
class MyComponent {

    @Select(AppState.getUser)
    public readonly user$!: Observable<User>;

    @AsyncState('user$')
    public currentUser!: User;
}
```

A compiler error will be thrown if the given property name does not exist or does not contain an Observable-dervied value of the same type.

See the [**`@AsyncState` API reference**](/docs/api-reference.md#asyncstate) for more information.

## DirectiveState

[**API reference**](/docs/api-reference.md#directivestate)

`DirectiveState` is a specialization of `ComponentState` for use with directives. The API is the same as `ComponentState`, with the only difference being how `DirectiveStateRef`, the equivalent of `ComponentStateRef`, is provided to the directive.

### Example - Using DirectiveState

```ts
import { forwardRef, Inject } from '@angular/core';
import { DirectiveState, DirectiveStateRef, stateTokenFor } from '@lithiumjs/angular';

const STATE_PROVIDER = DirectiveState.create(forwardRef(() => MyDirective));

@Directive({
    ...
    providers: [STATE_PROVIDER]
})
class MyDirective {

    public bar = 42;

    constructor(
        @Inject(stateTokenFor(STATE_PROVIDER)) stateRef: DirectiveStateRef<MyDirective>
    ) {
        stateRef.get('bar').subscribe(bar => console.log("bar: ", bar));
    }

    // Output:
    // bar: 42
}
```

As directives can be attached to other components, the `DirectiveStateRef` service is provided using the token returned from `DirectiveState.create` to ensure that the correct state provider is injected.

## EventSource

[**API reference**](/docs/api-reference.md#eventsource)

`@EventSource` is the decorator used for reactively binding to component events. `@EventSource` creates an `Observable` that can be used to react to component events such as `ngOnInit` or `@HostListener`. Subscriptions to `@EventSource` observables are automatically cleaned up when the component is destroyed.

### Using EventSource with Angular component lifecycle events <a name="lifecycle-decorators"></a>

`@EventSource` can abe used to capture all Angular component lifecycle events (i.e. `ngOnInit`) as observables instead of callback functions. Convenience decorators are provided for every lifecycle event. These are:

* `@OnChanges`
* `@OnInit`
* `@OnDestroy`
* `@DoCheck`
* `@AfterContentInit`
* `@AfterContentChecked`
* `@AfterViewInit`
* `@AfterViewChecked`

#### Example - Reactive ngOnInit

```ts
import { OnInit } from '@lithiumjs/angular';

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

For more info, see the lifecycle decorators [**API reference**](/docs/api-reference.md#angular-lifecycle-eventsource-decorators).

### Using EventSource with Angular event decorators

`@EventSource` can also be used to make Angular event decorators like `@HostListener` reactive.

#### Example - Reactive @HostListener

```ts
import { EventSource } from '@lithiumjs/angular';

@Component({...})
class Component {

    @HostListener("click", ["$event"])
    @EventSource()
    private readonly onClick$: Observable<MouseEvent>;

    constructor () {
        super();

        this.onClick$.subscribe((event) =>  console.log("The component was clicked: ", event));
    }
}
```

### EventSource and inheritance

`@EventSource` decorators can be declared in a base class and be used by child classes.

#### Example - EventSource inheritance

```ts
import { OnInit } from '@lithiumjs/angular';

abstract class ComponentBase {

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

## AutoPush

[**API reference**](/docs/api-reference.md#autopush)

With AutoPush, Lithium will automatically invoke change detection on a component when a state value is changed. This allows for writing more performant components using [OnPush change detection](https://angular.io/api/core/ChangeDetectionStrategy) without [manual change detection management](https://blog.angular-university.io/onpush-change-detection-how-it-works/) that is typically necessary for OnPush change detection.

AutoPush is enabled on a component by using the ```AutoPush.enable``` function:

### Example

```ts
import { AutoPush, ComponentState } from '@lithiumjs/angular';

@Component({
    ...
    providers: [ComponentState.create(MyComponent)],
    changeDetection: ChangeDetectionStrategy.OnPush // Enable OnPush change detection for this component
})
class MyComponent {

    public value = 0;

    constructor(cdRef: ChangeDetectorRef) {
        AutoPush.enable(this, cdRef); // Enable AutoPush
    }
}
```

When using AutoPush, you should also set the component's `changeDetection` strategy to `ChangeDetectionStrategy.OnPush`. When used in conjunction with `ComponentState`, change detection will no longer need to be manually invoked on component state changes.

## Further Reading

* Take a look at the [example project](https://github.com/lVlyke/lithium-angular-example-app) to see Lithium used in a real app alongside libraries like NGXS and Angular Material.