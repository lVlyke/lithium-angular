import type { Observable } from "rxjs";
import type { Constructable, StringKey } from "./lang-utils";
import type { AsyncSourceKey, ValidAsyncSourceKey } from "./metadata";
import { ComponentStateMetadata, asyncStateKey } from "./metadata"

type ValidateAsyncSource<
    T,
    K extends StringKey<T>,
    Source extends string | undefined = AsyncSourceKey<T, K>
> = Source extends StringKey<T>
    ? (T[Source] extends Observable<T[K]> ? T[Source] : never)
    : never;

/** @PropertyDecoratorFactory */
export function AsyncState<Source extends string | undefined = undefined>(asyncSource?: Source) {

    /** @PropertyDecorator */
    return function<ComponentT extends Constructable<any, any>, K extends StringKey<ComponentT>>(
        target: Source extends undefined ? ComponentT : (ValidateAsyncSource<ComponentT, K, Source> extends never ? never : ComponentT),
        key: Source extends undefined ? (ValidateAsyncSource<ComponentT, K> extends never ? never : K) : K
    ) {
        const asyncKey = (asyncSource ?? asyncStateKey<ComponentT, K>(key)) as ValidAsyncSourceKey<ComponentT>;

        ComponentStateMetadata.AddManagedProperty<ComponentT>(target.constructor, { key, asyncSource: asyncKey });
    }
}
