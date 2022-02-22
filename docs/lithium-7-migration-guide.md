# Lithium 7 Migration Guide

If you are upgrading an Angular application from Lithium 6.x or below, you application will continue to function as expected in Lithium 7.x. Lithium 7.0.0 introduces a new concept called [component states](/docs/intro-guide.md#componentstate), which are an alternative to Lithium's `@StateEmitter` decorator. While both component states and `@StateEmitter` are supported in Lithium 7, `@StateEmitter` will be deprecated in Lithium 8.0.0 and eventually removed from the library in future versions.

This migration guide will help transition your existing Lithium-based Angular app to use component states instead of `@StateEmitter`.

## Why component states?

The `ComponentState` type and corresponding `ComponentStateRef` service were introduced as an alternative to the `@StateEmitter` decorator used in previous versions of Lithium to handle reactive component state interactions. While both concepts aim to make reactive component state easier in Angular, both go about it very differently.

`@StateEmitter` is a property decorator that is used to automatically create a `BehaviorSubject` that is mapped to a corresponding synchronous property on the component that can be used inside the component's template as a normal value. All updates to this property are propagated back to the corresponding `BehaviorSubject`. While this works well, this solution has a few drawbacks:

* **Lacks type safety** - `@StateEmitter` creates a new class property corresponding to the property being decorated. Today's TypeScript compiler does not allow for compile-time code transformations, which means there is no way to define these dynamic properties to let the compiler know that they exist. To get around this, the `LiComponent` base class must be extended when using `@StateEmitter`, which effectively disables type checking for the entire component.
* **Learning curve** - While `@StateEmitter` is intuitive once you understand what it is doing internally, it can be hard to reason about if inexperienced with Lithium. This is especially true in codebases where new developers are often being brought on board.
* **Not compatible with template type checking** - Since the underlying state properties created by `@StateEmitter` are not known to the compiler, applications that use `@StateEmitter` are unable to use Angular compilation flags like [`fullTemplateTypeCheck` and `strictTemplates`](https://angular.io/guide/template-typecheck).

Component states on the other hand, are created by providing a special service called `ComponentStateRef` at the component level, This service is then injected into the component and used to observe and interactive with the component's state in a reactive manner. With component states, you define your component's state using regular synchronous values. A `BehaviorSubject` is automatically created for each component property and is retrieved via `ComponentStateRef`. This solution has a number of benefits over `@StateEmitter`:

* **Full type safety** - Since there are no dynamic properties being created, component states are fully typesafe and do not require extending a base class.
* **More intuitive** - A component's state is defined the same way it would be without Lithium, which results in less new syntax to learn and unique rules to follow.
* **Compatible with template type checking** - Angular compilation flags like [`fullTemplateTypeCheck` and `strictTemplates`](https://angular.io/guide/template-typecheck) can be used without issue.

## Differences between component states and @StateEmitter

Both component states and `@StateEmitter` aim to make reactive component state interactions easier in Angular. Both concepts, however, solve this problem in opposing ways:

* With component states, you **declare your state normally**. The state is declared through synchronous values, while the corresponding Subjects and Observables for each property are injected through the `ComponentStateRef` service.
* With `@StateEmitter`, you **declare your state reactively**. The state is declared through Subjects and Observables, while the corresponding synchronous properties are dynamically defined directly into the class instance.

For a more detailed look at how `ComponentState` and `ComponentStateRef` are used, read through the new [intro guide](/docs/intro-guide.md#componentstate) or take a look at the [API reference](/docs/api-reference.md#componentstate).

## Migrating from @StateEmitter to component states

Migrating from `@StateEmitter` to component states is relatively straightforward in most cases. However, there are a few edge cases that may be more difficult to migrate. These are the general steps for migrating from `@StateEmitter` to using component states:

* [Providing ComponentState](#providing-componentstate)
* [Removing @StateEmitter declarations](#removing-stateemitter-declarations)
* [Replacing @StateEmitter usage](#replacing-stateemitter-usage)
* [Replacing @StateEmitter proxy usage](#replacing-stateemitter-proxy-usage)
* [Removing LiComponent base class](#removing-licomponent-base-class)
* [Adjusting @EventSource usage](#adjusting-eventsource-usage)

### Providing ComponentState

You must first add the `ComponentState` provider into your component by calling the `ComponentState.create` function.

#### **Example - Providing ComponentState**

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

If you are using `@StateEmitter` within a directive, you should use [`DirectiveState`](/docs/api-reference.md#directivestate) instead of `ComponentState`. See the [intro guide](/docs/intro-guide.md#directivestate) for more information.

### Removing @StateEmitter declarations

Since we will now be declaring our component's state as regular synchronous values, we will have to convert all existing `@StateEmitter` declarations to regular property declarations.

#### **Example - Converting @StateEmitter declarations**

Before:

```ts
import { LiComponent, StateEmitter } from '@lithiumjs/angular';

@Component({
    ...
})
class TodoListComponent extends LiComponent {

    @StateEmitter({ initialValue: '' })
    @Input('name')
    public readonly name$: Subject<string>;
    
    @StateEmitter({ initial: () => [] })
    @Input('tasks')
    public readonly tasks$: Subject<string[]>;

    @StateEmitter({ initial: () => [] })
    private readonly removedTasks$: Subject<string[]>;

    @StateEmitter()
    private readonly createDate$: Subject<Date | undefined>;
}
```

After:

```ts
import { ComponentState, DeclareState } from '@lithiumjs/angular';

@Component({
    ...
    providers: [ComponentState.create(TodoListComponent)]
})
class TodoListComponent {

    @Input()
    public name = '';

    @Input()
    public tasks = [];

    public removedTasks = [];

    @DeclareState()
    public createDate?: Date;
}
```

For more information about `@DeclareState`, see the [intro guide](/docs/intro-guide.md#declarestate).

### Replacing @StateEmitter usage

There are no changes to how component properties are used in templates since both `@StateEmitter` and `ComponentState` result in the same underlying state properties being created.

`@StateEmitter` usage within a component class is usually replaced by using `ComponentStateRef.get` and `ComponentStateRef.getAll`.

#### **Example - Replacing @StateEmitter usage with ComponentStateRef.get**

Before:

```ts
import { LiComponent, StateEmitter } from '@lithiumjs/angular';

@Component({
    ...
})
class TodoListComponent extends LiComponent {

    @StateEmitter({ initialValue: '' })
    @Input('name')
    public readonly name$: Subject<string>;
    
    ...

    constructor() {
        ...
        this.name$.subscribe(name => console.log("name: ", name));
    }
}
```

After:

```ts
import { ComponentState, ComponentStateRef } from '@lithiumjs/angular';

@Component({
    ...
    providers: [ComponentState.create(TodoListComponent)]
})
class TodoListComponent {

    @Input()
    public name = '';

    ...

    constructor(stateRef: ComponentStateRef<TodoListComponent>) {
        ...
        stateRef.get('name').subscribe(name => console.log("name: ", name));
    }
}
```

#### **Example - Replacing @StateEmitter usage with ComponentStateRef.getAll**

Before:

```ts
import { LiComponent, StateEmitter } from '@lithiumjs/angular';
import { combineLatest } from 'rxjs';

@Component({
    ...
})
class TodoListComponent extends LiComponent {

    @StateEmitter({ initialValue: '' })
    @Input('name')
    public readonly name$: Subject<string>;

    @StateEmitter({ initial: () => [] })
    @Input('tasks')
    public readonly tasks$: Subject<string[]>;
    
    ...

    constructor() {
        ...

        combineLatest([this.name$, this.tasks$]).subscribe(([name, tasks]) => {
            console.log("name: ", name);
            console.log("tasks: ", tasks);
        });
    }
}
```

After:

```ts
import { ComponentState, ComponentStateRef } from '@lithiumjs/angular';
import { combineLatest } from 'rxjs';

@Component({
    ...
    providers: [ComponentState.create(TodoListComponent)]
})
class TodoListComponent {

    @Input()
    public name = '';

    @Input()
    public tasks = [];

    ...

    constructor(stateRef: ComponentStateRef<TodoListComponent>) {
        ...
        
        combineLatest(stateRef.getAll('name', 'tasks')).subscribe(([name, tasks]) => {
            console.log("name: ", name);
            console.log("tasks: ", tasks);
        });
    }
}
```

You can also use `ComponentStateRef.state` to resolve the underlying `Subject` for each property:

```ts
import { ComponentState, ComponentStateRef } from '@lithiumjs/angular';
import { combineLatest } from 'rxjs';
import { mergeMap } from 'rxjs/operators';

@Component({
    ...
    providers: [ComponentState.create(TodoListComponent)]
})
class TodoListComponent {

    @Input()
    public name = '';

    @Input()
    public tasks = [];

    ...

    constructor(stateRef: ComponentStateRef<TodoListComponent>) {
        ...
        
        stateRef.state().pipe(
            mergeMap(({ name$, tasks$ }) => combineLatest(([name$, tasks$]))
        ).subscribe(([name, tasks]) => {
            console.log("name: ", name);
            console.log("tasks: ", tasks);
        });
    }
}
```

### Replacing @StateEmitter proxy usage

Replacing `@StateEmitter` proxies can be done a number of ways, but these are the general methods of converting `Alias`, `From`, and `Merge` proxy StateEmitters:

#### Replacing @StateEmitter.Alias usage

`@StateEmitter.Alias` creates a property that is kept in sync with the source observable. All updates to the alias are propagated back to the original source (if the source is a Subject), and all updates to the source are propagated to the alias.

If the source is an Observable and not a Subject, we can use the `@AsyncState` decorator to create a property that receives all source emissions:

##### **Example - Replacing @StateEmitter.Alias with @AsyncState**

Before:

```ts
import { LiComponent, StateEmitter } from '@lithiumjs/angular';

@Component({
    ...
})
class TodoListComponent extends LiComponent {

    @StateEmitter.Alias('sessionManager.user$')
    public readonly user$: Observable<User>;

    ...

    constructor(public sessionManager: SessionManager) {
        ...
    }
}
```

After:

```ts
import { AsyncState, ComponentState } from '@lithiumjs/angular';

@Component({
    ...
    providers: [ComponentState.create(TodoListComponent)]
})
class TodoListComponent {

    public readonly user$ = this.sessionManager.user$;

    @AsyncState()
    public readonly user!: User;

    ...

    constructor(public sessionManager: SessionManager) {
        ...
    }
}
```

For more information about `@AsyncState`, see the [intro guide](/docs/intro-guide.md#asyncstate).

We could also use the `ComponentStateRef.subscribeTo` method if the source is not exposed as a property on the component:

```ts
import { ComponentState, ComponentStateRef, DeclareState } from '@lithiumjs/angular';

@Component({
    ...
    providers: [ComponentState.create(TodoListComponent)]
})
class TodoListComponent {

    @DeclareState()
    public readonly user!: User;

    ...

    constructor(
        stateRef: ComponentStateRef<TodoListComponent>,
        sessionManager: SessionManager
    ) {
        stateRef.subscribeTo('user', sessionManager.user$);
    }
}
```

If the source of the `Alias` is a Subject that should also receive value updates from our component, we can instead use the `ComponentStateRef.syncWith` method:

```ts
import { ComponentState, ComponentStateRef, DeclareState } from '@lithiumjs/angular';

@Component({
    ...
    providers: [ComponentState.create(TodoListComponent)]
})
class TodoListComponent {

    @DeclareState()
    public user!: User;

    ...

    constructor(
        stateRef: ComponentStateRef<TodoListComponent>,
        sessionManager: SessionManager
    ) {
        // Assumes sessionManager.user$ is a `Subject`
        stateRef.syncWith('user', sessionManager.user$);
    }
}
```

Now `sessionManager.user$` will emit whenever we update the `user` property in this component, and vice versa.

If the source of the `Alias` is another property from a `ComponentStateRef`, we can pass it into the `syncWith` method:

```ts
import { ComponentState, ComponentStateRef, DeclareState } from '@lithiumjs/angular';

@Component({
    ...
    providers: [ComponentState.create(TodoListComponent)]
})
class TodoListComponent {

    @DeclareState()
    public user!: User;

    ...

    constructor(
        @SkipSelf() parentComponent: ParentComponent,
        stateRef: ComponentStateRef<TodoListComponent>,
        sessionManager: SessionManager
    ) {
        // Assumes parentComponent.stateRef exists and componet has a `user` property
        stateRef.syncWith('user', parentComponent.stateRef, 'user');
    }
}
```

Now `parentComponent.user` will be updated whenever we update the `user` property in this component, and vice versa.

#### Replacing @StateEmitter.From usage

`@StateEmitter.From` receives its initial value from the first emission of the source observable. We can replace this with a simple subscription to the source observable and the `take(1)` operator:

##### **Example - Replacing @StateEmitter.From with source subscription**

Before:

```ts
import { LiComponent, StateEmitter } from '@lithiumjs/angular';

@Component({
    ...
})
class TodoListComponent extends LiComponent {

    @StateEmitter.From('sessionManager.user$')
    public readonly user$: Subject<User>;

    ...

    constructor(public sessionManager: SessionManager) {
        ...
    }
}
```

After:

```ts
import { ComponentState, DeclareState } from '@lithiumjs/angular';
import { take } from 'rxjs/operators';

@Component({
    ...
    providers: [ComponentState.create(TodoListComponent)]
})
class TodoListComponent {

    @DeclareState()
    public user!: User;

    ...

    constructor(public sessionManager: SessionManager) {
        sessionManager.user$.pipe(take(1)).subscribe(user => this.user = user);
    }
}
```

#### Replacing @StateEmitter.Merge usage

`@StateEmitter.Merge` receives all emissions of the source observable but allows for the value to be updated from the component without writing back to the source. This can be replaced with either the `@AsyncState` decorator or by using `ComponentStateRef.subscribeTo`.

##### **Example - Replacing @StateEmitter.Merge with @AsyncState**

Before:

```ts
import { LiComponent, StateEmitter } from '@lithiumjs/angular';

@Component({
    ...
})
class TodoListComponent extends LiComponent {

    @StateEmitter.Merge('sessionManager.user$')
    public readonly user$: Subject<User>;

    ...

    constructor(public sessionManager: SessionManager) {
        ...
    }
}
```

After:

```ts
import { AsyncState, ComponentState } from '@lithiumjs/angular';

@Component({
    ...
    providers: [ComponentState.create(TodoListComponent)]
})
class TodoListComponent {

    public readonly user$ = this.sessionManager.user$;

    @AsyncState()
    public user!: User;

    ...

    constructor(public sessionManager: SessionManager) {
        ...
    }
}
```

### Removing LiComponent base class

Once all `@StateEmitter` usage has been migrated, we can simply remove the `LiComponent` base class if it is being used.

### **Example - Removing LiComponent base class**

Before:

```ts
import { LiComponent } from '@lithiumjs/angular';

@Component({
    ...
})
class MyComponent extends LiComponent {
    ...
}
```

After:

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

### Adjusting @EventSource usage

`@EventSource` is primarily used to create observables for component events, like lifecycle events and host events via `@HostListener`. This functionality is not being replaced and will continue to be supported.

While `@EventSource` can also be used to create observables to respond to function invocations from component templates, it is no longer recommended to be used in this manner as it requires the use of the `LiComponent` base class. Moreover, it does not offer much benefit versus simply using a Subject within the template.

#### **Example - Replacing @EventSource template usage with Subject**

Before:

```ts
import { LiComponent, EventSource } from '@lithiumjs/angular';

@Component({
    ...
    template: `
        <button (click)="onButtonPress($event)">Click</button>
    `
})
class TodoListComponent extends LiComponent {

    @EventSource()
    public readonly onButtonPress$: Observable<MouseEvent>;

    ...

    constructor() {
        ...

        this.onButtonPress$.subscribe(console.log);
    }
}
```

After:

```ts
@Component({
    ...
    template: `
        <button (click)="onButtonPress$.next($event)">Click</button>
    `
})
class TodoListComponent {

    public readonly onButtonPress$ = new Subject<MouseEvent>();

    ...

    constructor() {
        ...

        this.onButtonPress$.subscribe(console.log);
    }
}
```
