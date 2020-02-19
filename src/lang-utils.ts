export namespace _LangUtils {

    export function isNil(value: any): value is null | undefined {
        return value === null || value === undefined;
    }
}