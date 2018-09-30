export namespace Metadata {

    export function SetMetadata<T>(symbol: symbol | string, target: Object, value: T) {
        Reflect.defineMetadata(symbol, value, target);
    }

    export function GetMetadata<T>(symbol: symbol | string, target: Object, defaultValue?: T): T {
        if (!Reflect.hasMetadata(symbol, target)) {
            SetMetadata<T>(symbol, target, defaultValue);
        }

        return Reflect.getOwnMetadata(symbol, target) || Reflect.getMetadata(symbol, target);
    }

    export function GetOwnMetadata<T>(symbol: symbol | string, target: Object, defaultValue?: T): T {
        if (!Reflect.hasOwnMetadata(symbol, target)) {
            SetMetadata<T>(symbol, target, defaultValue);
        }

        return Reflect.getOwnMetadata(symbol, target);
    }
}

// Workaround for angular-cli 5.0.0 metadata gen bug
export interface Metadata {}