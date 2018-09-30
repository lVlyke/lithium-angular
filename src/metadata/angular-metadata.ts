export namespace AngularMetadata {

    export const PROP_METADATA = "__prop__metadata__";

    export function getMetadata<T>(constructor: any, propertyKey: string): T {
        let metadata = Object.getOwnPropertyDescriptor(constructor, propertyKey);
        return metadata ? metadata.value : undefined;
    }

    export function getPropMetadata(constructor: any): { [propName: string]: any[] } {
        return getMetadata(constructor, PROP_METADATA);
    }

    export function hasPropMetadataEntry(constructor: any, propName: string): boolean {
        let metadata = getPropMetadata(constructor);
        return !!metadata && !!metadata[propName];
    }

    export function renamePropMetadataEntry(constructor: any, propName: string, newPropName: string) {
        let metadata = getPropMetadata(constructor);
        
        if (!metadata || !metadata[propName]) {
            throw new Error(`PROP_METADATA entry "${propName}" does not exist in class "${constructor.name}".`);
        }

        metadata[newPropName] = metadata[propName];
        delete metadata[propName];
    }
}

// Workaround for angular-cli 5.0.0 metadata gen bug
export interface AngularMetadata {}