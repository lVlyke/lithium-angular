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

    export function GetAllMetadata(target: Object): Map<symbol | string, any> {
        return (Reflect.getMetadataKeys(target) || [])
            .reduce((map, key) => map.set(key, Reflect.getMetadata(key, target)), new Map());
    }

    export function IsOwnMetadata(symbol: symbol | string, target: Object): boolean {
        return Reflect.hasOwnMetadata(symbol, target);
    }

    export function GetMetadataMap<K, V>(symbol: symbol | string, target: Object): Map<K, V> {
        return GetMetadata<Map<K, V>>(symbol, target, new Map<K, V>());
    }

    export function GetOwnMetadataMap<K, V>(symbol: symbol | string, target: Object): Map<K, V> {
        return GetOwnMetadata<Map<K, V>>(symbol, target, new Map<K, V>());
    }
}