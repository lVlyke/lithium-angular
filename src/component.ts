/** @ClassDecoratorFactory */
export function Reactive(): ClassDecorator {
    console.warn("DEPRECATION NOTICE: The @Reactive() class decorator is no longer used and will be removed in a future version.");
    return function () {};
}