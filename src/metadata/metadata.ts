export namespace Metadata {

    type MetadataKey = string | symbol | number;

    const LI_METADATA_ROOT = Symbol('$LI_');

    export function requireMetadata<T>(symbol: MetadataKey, target: any, defaultValue?: T): T {
        if (!hasMetadata(symbol, target)) {
            setMetadata(symbol, target, defaultValue);
        }

        return getOwnMetadata(symbol, target) || getMetadata(symbol, target);
    }

    export function requireOwnMetadata<T>(symbol: MetadataKey, target: any, defaultValue?: T): T {
        if (!hasOwnMetadata(symbol, target)) {
            setMetadata(symbol, target, defaultValue);
        }

        return getOwnMetadata(symbol, target);
    }

    export function getMetadataMap(target: any): Map<MetadataKey, any> {
        return (getMetadataKeys(target) || [])
            .reduce((map, key) => map.set(key, getMetadata(key, target)), new Map());
    }

    export function setMetadata(symbol: MetadataKey, target: any, value: any) {
        Object.defineProperty(rootMetadata(target), symbol, {
            writable: true,
            enumerable: true,
            value
        });
    }

    export function hasMetadata(symbol: MetadataKey, target: any): boolean {
        return !!getMetadata(symbol, target); // TODO
    }

    export function hasOwnMetadata(symbol: MetadataKey, target: any): boolean {
        return !!getOwnMetadata(symbol, target);
    }

    export function getMetadata(symbol: MetadataKey, target: any): any {
        const metadata = getOwnMetadata(symbol, target);

        if (!metadata && target.prototype) {
            return getMetadata(symbol, target.prototype);
        }
        
        return metadata;
    }

    export function getOwnMetadata(symbol: MetadataKey | number, target: any): any {
        const descriptor = Object.getOwnPropertyDescriptor(rootMetadata(target), symbol);
        return descriptor ? descriptor.value : undefined;
    }

    export function getMetadataKeys(target: any): MetadataKey[] {
        return Object.keys(rootMetadata(target));
    }

    function ensureRootMetadataExists(target: any) {
        if (!Object.getOwnPropertyDescriptor(target, LI_METADATA_ROOT)) {
            Object.defineProperty(target, LI_METADATA_ROOT, {
                enumerable: false,
                writable: true,
                value: Object.create({})
            })
        }
    }

    function rootMetadata(target: any): any {
        ensureRootMetadataExists(target);

        return Object.getOwnPropertyDescriptor(target, LI_METADATA_ROOT).value;
    }
}

// Workaround for angular-cli 5.0.0 metadata gen bug
export interface Metadata {}