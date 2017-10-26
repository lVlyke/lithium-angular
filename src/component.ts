import { EventSource } from "./event-source";
import { StateEmitter } from "./state-emitter";

/** @ClassDecoratorFactory */
export function Reactive(): ClassDecorator {
    return function (constructor) {
        EventSource.Bootstrap()(constructor);
        StateEmitter.Bootstrap()(constructor);
    }
}