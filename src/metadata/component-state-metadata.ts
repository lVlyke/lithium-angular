import { Metadata } from "./metadata";

export namespace ComponentStateMetadata {

    export const MANAGED_PROPERTY_LIST_KEY = "MANAGED_PROPERTY_LIST_KEY";

    export interface ManagedProperty<T, K extends keyof T = keyof T> {
        key: K;
        publicKey?: keyof T;
        async?: boolean;
    }

    export type ManagedPropertyList<T> = ManagedProperty<T>[];

    const ManagedPropertyListSymbol = Symbol("ManagedPropertyList");

    export function GetManagedPropertyList<T>(target: Object): ManagedPropertyList<T> {
        return Metadata.requireMetadata<ManagedPropertyList<T>>(ManagedPropertyListSymbol, target, []);
    }

    export function GetInheritedManagedPropertyList<T>(target: Object): ManagedPropertyList<T> {
        const targetMetadata = GetManagedPropertyList<T>(target);
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
        SetManagedPropertyList<T>(target, GetManagedPropertyList<T>(target).concat([property]));
    }
}
