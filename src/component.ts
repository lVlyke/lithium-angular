/** @ClassDecoratorFactory */
export function Reactive(): ClassDecorator {
    console.info("DEPRECATION NOTICE: The @Reactive() class decorator is no longer used and will be removed in a future version of @lithiumjs/angular.");
    return function () {};
}