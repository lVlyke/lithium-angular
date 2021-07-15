export type StringKey<T> = (keyof T & string);

export type IfEquals<X, Y> =
    (<T>() => T extends X ? 1 : 2) extends
    (<T>() => T extends Y ? 1 : 2) ? true : false;

export type IfReadonly<T, K extends keyof T> =
    IfEquals<{ [P in K]: T[P] }, { readonly [P in K]: T[P] }>;

export type Publicize<T extends Record<string, any>, K extends string> =
    Omit<T, K> & Record<K, T[K]>;

export type Constructable<T, Ctor = (...args: any[]) => T> = { constructor: Ctor };

export type ImmutableMap<M extends Map<unknown, unknown>> = Omit<M, "set" | "clear" | "delete">;

export namespace _LangUtils {

    export function isNil(value: any): value is null | undefined {
        return value === null || value === undefined;
    }
}