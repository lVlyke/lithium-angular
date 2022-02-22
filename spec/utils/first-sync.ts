import { Observable, OperatorFunction, Subject } from "rxjs";
import { first, take } from "rxjs/operators";

export function firstSync<T>(throwIfEmpty = true): OperatorFunction<T, T> {
    return function (src$: Observable<T>) {
        const proxy$ = new Subject<T>();
        src$.subscribe(proxy$);

        setTimeout(() => proxy$.complete());
        return proxy$.pipe(throwIfEmpty ? first() : take(1));
    };
}
