# Angular AoT Compiler

Lithium for Angular is compatible with Angular's AoT compiler. However, due to current limitations of the compiler there are a few rules that need to be adhered to in order to write fully AoT-compliant code with Lithium:

## **1. Components using Lithium must extend the ```AotAware``` class.**

Because Lithium's ```StateEmitter``` and ```EventSource``` decorators dynamically create and manage the properties that a component's view template will access, it is incompatible with how the current Angular AoT compiler handles template validation. To easily remedy this issue, your components can extend the provided [```AotAware```](/docs/api-reference.md#aotaware) base class to enable less strict validation and still retain full AoT compliance:

```ts
import { AotAware } from "@lithiumjs/angular";

// With AotAware:
@Component({...})
class Component extends AotAware {

    @StateEmitter()
    @Input("disabled")
    private readonly disabled$: Subject<boolean>;

    @OnInit()
    private readonly onInit$: Observable<void>;

    constructor () {
        this.onInit$.subscribe(() =>  console.log("Component is initialized."));

        this.disabled$.subscribe(disabled =>  console.log(`Disabled: ${disabled}`));
    }
}
```


However, if using ```AotAware``` is not possible or desired in your configuration, you **must** instead declare dummy properties, illustrated in the example below:

```ts
// Without AotAware:
@Component({...})
class Component {

    @StateEmitter()
    @Input("disabled")
    private readonly disabled$: Subject<boolean>;

    // EventSource proxy for ngOnInit
    // Disable EventSource method usage checks with "skipMethodCheck"
    @OnInit({ skipMethodCheck: true })
    private readonly onInit$: Observable<void>;

    // Dummy property must be declared for each StateEmitter in the component if not extending `AotAware`.
    public readonly disabled: boolean;

    // This stub declaration must be provided in the component to allow onInit$ to fire in AoT mode if not extending `AotAware`.
    // NOTE: Any stub method declarations will be overidden. Any code inside this declaration will not be executed.
    public ngOnInit() {}

    constructor () {
        this.onInit$.subscribe(() =>  console.log("Component is initialized."));

        this.disabled$.subscribe(disabled =>  console.log(`Disabled: ${disabled}`));
    }
}
```

## **2. When applying an Angular decorator to an ```EventSource```, the decorator should be applied to the property directly instead of being passed into ```EventSource```.**

In the following example, ```HostListener``` should be declared on the property directly. This will work correctly when compiled with AoT:

```ts
@Component({...})
class Component {

    @EventSource()
    @HostListener("click")
    private readonly onClick$: Observable<any>;

    constructor () {
        // This will emit as expected
        this.onClick$.subscribe(() =>  console.log("The component was clicked."));
    }
}
```

The following example click event will silently fail to fire when compiled with AoT:

```ts
@Component({...})
class Component {

    @EventSource(HostListener("click"))
    private readonly onClick$: Observable<any>;

    constructor () {
        // This will never emit when compiled with AoT
        this.onClick$.subscribe(() =>  console.log("The component was clicked."));
    }
}
```

## **3. When applying an Angular decorator to a ```StateEmitter```, the decorator should be applied to the property directly instead of being passed into ```StateEmitter```.**

In the following example, ```Input``` should be declared on the property directly. The following example will work correctly when compiled with AoT:

```ts
@Component({...})
class Component {

    // This will allow "disabled" to be bound in a template without generating a compiler error
    @StateEmitter()
    @Input("disabled")
    private readonly disabled$: Subject<boolean>;

    constructor () {
        this.disabled$.subscribe(disabled =>  console.log(`Disabled: ${disabled}`));
    }
}
```

The following example will fail to work with AoT:

```ts
@Component({...})
class Component {

    // This will generate a compiler error when "disabled" is bound to in a template.
    @StateEmitter(Input("disabled"))
    private readonly disabled$: Subject<boolean>;

    constructor () {
        this.disabled$.subscribe(disabled =>  console.log(`Disabled: ${disabled}`));
    }
}
```

## **4. A ```ChangeDetectorRef``` instance must be injected into a component using ```@AutoPush```.**

If the ```@AutoPush``` decorator is being used on a component, there must be a ```ChangeDetectorRef``` (or similar shaped object) injected into the component. If one isn't provided, an error will be thrown.

### AutoPush ChangeDetectorRef Example

```ts
@Component({...})
@AutoPush()
class Component extends AotAware {

    @StateEmitter()
    private readonly value$: Subject<number>;

    // A ChangeDetectorRef instance must be injected into the component, even if it's not used
    constructor (_cdRef: ChangeDetectorRef) {
        super();
    }
}
```

## **5. ```@HostBinding``` cannot be used directly with ```@StateEmitter```.**

Unlike the other Angular decorators, ```@HostBinding``` won't work when applied directly to a ```@StateEmitter``` property in AoT. It is still possible to use ```@HostBinding``` in conjunction with ```@StateEmitter```, but the host binding decorator must be applied to the underlying property reference instead of the StateEmitter.

The follwing example will work in AoT:

```ts
@Component({...})
class Component {

    @StateEmitter()
    private readonly disabled$: Subject<boolean>; // This will update the host binding below
    @HostBinding("class.disabled")
    public readonly disabled: boolean; // A dummy 'disabled' property must be declared to attach the host binding to
}
```

The following will NOT work in AoT:

```ts
@Component({...})
class Component {

    @StateEmitter()
    @HostBinding("class.disabled")
    private readonly disabled$: Subject<boolean>; // This will have NO effect on the host binding!
}
```