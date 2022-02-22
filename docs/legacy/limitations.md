# Limitations

While Lithium transparently integrates with Angular for the majority of cases, there are some limitations in certain cases that must be noted:

## **1. Components that use Lithium must either extend the Lithium base class, or declare placeholder properties.**

> _Note_: If your application only uses lifecycle event sources from Lithium (i.e. `@OnInit`) and Ivy, the following section does not apply.

Lithium's ```StateEmitter``` and ```EventSource``` decorators dynamically create and manage the properties that a component's view template will access, it is incompatible with how the current Angular compiler handles template validation. To easily remedy this issue, your components can extend the provided base class [```LiComponent```](/docs/api-reference.md#licomponent) to enable less strict validation and still retain full compiler compliance:

```ts
import { LiComponent } from "@lithiumjs/angular";

// Lithium with LiComponent:
@Component({...})
class Component extends LiComponent {

    @Input("disabled")
    @StateEmitter()
    private readonly disabled$: Subject<boolean>;

    @EventSource()
    private readonly onItemClicked$: Observable<void>;

    constructor () {
        super();

        this.onItemClicked$.subscribe((item) =>  console.log(`Item clicked: ${item.name}`));

        this.disabled$.subscribe(disabled =>  console.log(`Disabled: ${disabled}`));
    }
}
```

However, if extending the base class is not possible or desired in your configuration, you **must** instead declare dummy properties, as illustrated in the example below:

```ts
// Lithium without LiComponent:
@Component({...})
class Component {

    @StateEmitter()
    @Input("disabled")
    private readonly disabled$: Subject<boolean>;

    // Must disable EventSource method usage checks with "skipMethodCheck: true"
    @EventSource({ skipMethodCheck: true })
    private readonly onItemClicked$: Observable<Item>;

    // Dummy property must be declared for each StateEmitter in the component.
    public readonly disabled: boolean;

    // This stub declaration must be provided in the component to allow onItemClicked$ to emit when called
    // NOTE: Any stub method declarations will be overidden. Any code inside this stub declaration will not be executed.
    public onItemClicked(_item: Item) {}

    constructor () {
        this.onItemClicked$.subscribe((item) =>  console.log(`Item clicked: ${item.name}`));

        this.disabled$.subscribe(disabled =>  console.log(`Disabled: ${disabled}`));
    }
}
```

## **2. When applying an Angular decorator to an ```EventSource```, the decorator should be applied to the property directly instead of being passed into ```EventSource```.**

In the following example, ```@HostListener``` decorator should be declared on the property directly:

```diff
+ This will work correctly:
```

```ts
@Component({...})
class Component extends LiComponent {

    @HostListener("click")
    @EventSource()
    private readonly onClick$: Observable<any>;

    constructor () {
        super();

        // This will emit as expected
        this.onClick$.subscribe(() =>  console.log("The component was clicked."));
    }
}
```

```diff
- The following example click event will silently fail to fire:
```

```ts
@Component({...})
class Component extends LiComponent {

    @EventSource(HostListener("click"))
    private readonly onClick$: Observable<any>;

    constructor () {
        super();

        // This will never emit
        this.onClick$.subscribe(() =>  console.log("The component was clicked."));
    }
}
```

## **3. When applying an Angular decorator to a ```StateEmitter```, the decorator should be applied to the property directly instead of being passed into ```StateEmitter```.**

In the following example, ```@Input``` decorator should be declared on the property directly:

```diff
+ The following example will work correctly:
```

```ts
@Component({...})
class Component extends LiComponent {

    @Input("disabled")
    @StateEmitter()
    private readonly disabled$: Subject<boolean>;

    constructor () {
        super();

        this.disabled$.subscribe(disabled =>  console.log(`Disabled: ${disabled}`));
    }
}
```

```diff
- The following example will fail to work:
```

```ts
@Component({...})
class Component extends LiComponent {

    // This will generate a compiler error when "disabled" is bound to in a template.
    @StateEmitter(Input("disabled"))
    private readonly disabled$: Subject<boolean>;

    constructor () {
        super();

        this.disabled$.subscribe(disabled =>  console.log(`Disabled: ${disabled}`));
    }
}
```

### **3-1: Names for `@Input` and `@Output` decorators must explicitly be declared when used with `@StateEmitter`.**

As shown in the previous example, a name must be given to an `@Input` or `@Output` that's used with `@StateEmitter`:

```diff
+ The following example will work correctly:
```

```ts
@Component({...})
class Component extends LiComponent {

    @Input("disabled")
    @StateEmitter()
    private readonly disabled$: Subject<boolean>;

    constructor () {
        super();

        this.disabled$.subscribe(disabled =>  console.log(`Disabled: ${disabled}`));
    }
}
```

```diff
- The following example will fail to work:
```

```ts
@Component({...})
class Component extends LiComponent {

    @Input()
    @StateEmitter()
    private readonly disabled$: Subject<boolean>;

    constructor () {
        super();

        this.disabled$.subscribe(disabled =>  console.log(`Disabled: ${disabled}`));
    }
}
```

## **4. ```@HostBinding``` cannot be used directly with ```@StateEmitter```.**

Unlike the other Angular decorators, ```@HostBinding``` won't work when applied directly to a ```@StateEmitter``` property. It is instead recommended to use [```host``` metadata](https://angular.io/guide/styleguide#style-06-03) binding, as binding through host metadata definitions works natively with Lithium. It is still possible to use ```@HostBinding``` in conjunction with ```@StateEmitter```, but the host binding decorator must instead be applied to the underlying property reference, rather than the StateEmitter itself, as is usually the case.

```diff
+ The follwing example will work:
```

```ts
@Component({
    ...
    host: {
        '[class.disabled]': 'disabled' // This works as expected
    }
})
class Component extends LiComponent {

    @StateEmitter()
    private readonly disabled$: Subject<boolean>; // This will update the host metadata above
}
```

```diff
+ The follwing example will also work
```

```ts
@Component({...})
class Component extends LiComponent {

    @StateEmitter()
    private readonly disabled$: Subject<boolean>; // This will update the host binding below
    @HostBinding("class.disabled")
    public readonly disabled: boolean; // A dummy 'disabled' property must be declared to attach the host binding to
}
```

```diff
- The following will NOT work:
```

```ts
@Component({...})
class Component extends LiComponent {

    @StateEmitter()
    @HostBinding("class.disabled")
    private readonly disabled$: Subject<boolean>; // This will have NO effect on the host binding!
}
```