import { Metadata } from "./metadata";

export namespace ComponentStateMetadata {

    export const ASYNC_PROPERTY_LIST_KEY = "ASYNC_PROPERTY_LIST_KEY";

    export type AsyncPropertyList = string[];

    const AsyncPropertyListSymbol = Symbol("AsyncPropertyList");

    export function GetAsyncPropertyList(target: Object): AsyncPropertyList {
        return Metadata.requireMetadata<AsyncPropertyList>(AsyncPropertyListSymbol, target, []);
    }

    export function SetAsyncPropertyList(target: Object, list: AsyncPropertyList) {
        Metadata.setMetadata(AsyncPropertyListSymbol, target, list);
    }

    export function AddAsyncProperty(target: Object, property: string) {
        SetAsyncPropertyList(target, GetAsyncPropertyList(target).concat([property]));
    }
}
