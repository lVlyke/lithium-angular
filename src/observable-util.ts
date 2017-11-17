import { Observable, Subject } from "rxjs";

export namespace ObservableUtil {

    /** @description
     *  Creates an observable from the given property.
     */
    export function CreateFromProperty<T>(property: T | Subject<T> | Observable<T>): Observable<T> {
        if (property instanceof Subject) {
            return property.asObservable();
        }
        else if (property instanceof Observable) {
            return property;
        }
        else {
            return Observable.of<T>(property);
        }
    }

    /** 
     *  @param target The target object.
     *  @param path The target property path.
     *  @description Creates an observable chain from the given property path.
     * 
     *  Note: Any property in the path that isn't an Observable or Subject will implicitly be converted to an Observable.
     */
    export function CreateFromPropertyPath(target: any, path: string): Observable<any> {
        let lastPropertyKey: string = "target";

        /** 
         * @param target The target object.
         * @param propertyKeys The list of property keys in the path.
         * @description
         * Creates an observable chain from the property path and returns the value of the last property in the path.
         **/
        return (function resolveProperty(target: any, propertyKeys: string[]): Observable<any> {
            if (!target) {
                throw new Error(`@StateEmitter - Failed to deduce dynamic path "${path}": ${lastPropertyKey} is undefined.`);
            }

            // Get the property key
            let curPropertyKey = lastPropertyKey = propertyKeys[0];
            
            // Create an observable from the properties value
            return CreateFromProperty(target[curPropertyKey]).flatMap((target) => {
                // If it's the last property in the path...
                if (propertyKeys.length === 1) {
                    // Return the value
                    return Observable.of(target);
                }
                else {
                    // Otherwise, return the next property in the path
                    return resolveProperty(target, propertyKeys.slice(1));
                }
            });
        })(target, path.split("."));
    }

    /**
     * @param target The target object.
     * @param path The target property path.
     * @description Checks if the given property path is dynamic.
     * A path is considered dynamic or non-static if:
     * 
     * - It contains any Observables, or Subjects that are not the terminal property in the path.
     * - It does not terminate with a Subject.
     */
    export function IsDynamicPropertyPath(target: any, path: string): boolean {
        // Get all property keys in the path
        let propertyKeys = path.split(".");

        return propertyKeys.some((propertyKey, index) => {
            // Get the property value
            target = target[propertyKey];

            // If this is the last property in the path...
            if (index === propertyKeys.length - 1) {
                // The property must be a Subject to be emittable
                return !(target instanceof Subject);
            }
            else {
                // The property must not contain any Observables or non-terminal Subjects to be emittable
                return target instanceof Observable || target instanceof Subject;
            }
        });
    }

    // NOTE: Static property paths will result in a Subject (two-way binding), while dynamic property paths will result in an Observable (one-way binding)
    export function ResolvePropertyPath(target: any, path: string): Observable<any> {
        // If the path is dynamic...
        if (IsDynamicPropertyPath(target, path)) {
            // Create an observable chain from the property path
            return CreateFromPropertyPath(target, path);
        }
        else {
            // Resolve the subject from the path
            return ResolveStaticPropertyPath(target, path);
        }
    }

    export function ResolveStaticPropertyPath<T>(target: any, path: string): Subject<T> {
        // Statically access each property and get the terminating subject
        return path.split(".").reduce((target, key) => target[key], target);
    }

    /**
     * @param target The target object.
     * @param path The target property path.
     * @param value The new value of the property.
     * @param mergeValue Whether or not the newly emitted value should be merged into the last emitted value.
     * @description Traverses the property path for a Subject, and appropriately wraps and emits the given value from the Subject.
     */
    export function UpdateDynamicPropertyPathValue<T>(target: any, path: string, value: T, mergeValue?: boolean) {
        // Get all property keys in the path
        let propertyKeys = path.split(".");
        let subject: Subject<any>;
        let subjectIndex: number;

        // Iterate over each property key to find a Subject
        propertyKeys.every((propertyKey, index) => {
            // If the current property is a Subject...
            if (target[propertyKey] instanceof Subject) {
                // Record this subject
                subject = target[propertyKey];
                subjectIndex = index;

                // Stop searching for a subject
                return false;
            }

            return true;
        });

        // If there is no Subject in the path, throw an error
        if (!subject) {
            throw new Error(`Failed to update value for dynamic property ${path} - Path does not contain a Subject.`);
        }

        // Resolve the subject value
        let updatedSubjectValue = propertyKeys
            // Ignore all static property keys that come before the target subject
            .slice(subjectIndex + 1)
            // Iterate over the property path in reverse and build up the subject value
            .reduceRight<any>((value, propertyKey) => ({ [propertyKey]: value }), value);
        
        if (mergeValue) {
            // Get the last value from the subject and emit the merged properties
            subject.take(1).subscribe(lastValue => subject.next(Object.assign(lastValue, updatedSubjectValue)));
        }
        else {
            // Emit the new value
            subject.next(updatedSubjectValue);
        }
    }
}