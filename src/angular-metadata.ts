export namespace AngularMetadata {

    export const ANNOTATIONS = "__annotations__";
    export const PARAMETERS = "__paramaters__";
    export const PROP_METADATA = "__prop__metadata__";

    export function getAnnotationsMetadata(constructor: any): any[] {
        return getMetadata(constructor, ANNOTATIONS);
    }

    export function getMetadata<T>(constructor: any, propertyKey: string): T {
        let metadata = Object.getOwnPropertyDescriptor(constructor, propertyKey);
        return metadata ? metadata.value : undefined;
    }

    export function getParametersMetadata(constructor: any): any[] {
        return getMetadata(constructor, PARAMETERS);
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