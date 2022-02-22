import type { StringKey } from "../lang-utils";
import { Metadata } from "./metadata";

export type AsyncSourceKey<T, K extends StringKey<T> = StringKey<T>> = `${K}$`;

export type ValidAsyncSourceKey<T, K extends StringKey<T> = StringKey<T>> = AsyncSourceKey<T, K> & StringKey<T>;
export namespace ComponentStateMetadata {
    export interface ManagedProperty<T, K extends StringKey<T> = StringKey<T>> {
        key: K;
        publicKey?: StringKey<T>;
        asyncSource?: ValidAsyncSourceKey<T>;
    }

    export type ManagedPropertyList<T> = ManagedProperty<T>[];

    export const MANAGED_PROPERTY_LIST_KEY = "MANAGED_PROPERTY_LIST_KEY";

    const ManagedPropertyListSymbol = Symbol("ManagedPropertyList");

    export function GetOwnManagedPropertyList<T>(target: Object): ManagedPropertyList<T> {
        return Metadata.requireOwnMetadata<ManagedPropertyList<T>>(ManagedPropertyListSymbol, target, []);
    }

    export function GetInheritedManagedPropertyList<T>(target: Object): ManagedPropertyList<T> {
        const targetMetadata = GetOwnManagedPropertyList<T>(target).slice(0);
        const targetPrototype = Object.getPrototypeOf(target);

        if (targetPrototype) {
            targetMetadata.push(...GetInheritedManagedPropertyList(targetPrototype));
        }

        return targetMetadata;
    }

    export function SetManagedPropertyList<T>(target: Object, list: ManagedPropertyList<T>) {
        Metadata.setMetadata(ManagedPropertyListSymbol, target, list);
    }

    export function AddManagedProperty<T>(target: Object, property: ManagedProperty<T>) {
        SetManagedPropertyList<T>(target, GetOwnManagedPropertyList<T>(target).concat([property]));
    }
}

export function asyncStateKey<ComponentT, K extends StringKey<ComponentT> = StringKey<ComponentT>>(
    key: K
): AsyncSourceKey<ComponentT, K> {
    return `${key}$` as any;
}
