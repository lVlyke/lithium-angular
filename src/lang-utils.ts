export type StringKey<T> = (keyof T & string);

export type IfEquals<X, Y> =
    (<T>() => T extends X ? 1 : 2) extends
    (<T>() => T extends Y ? 1 : 2) ? X : never;

export type IfReadonly<T, K extends keyof T> =
    IfEquals<{ [P in K]: T[P] }, { readonly [P in K]: T[P] }>;

export namespace _LangUtils {

    export function isNil(value: any): value is null | undefined {
        return value === null || value === undefined;
    }
}