import { Observable } from "rxjs";

export namespace TestUtils {

    export interface Spec<T> {
        beforeEach(callback: Spec.Callback<T>): void;
        afterEach(callback: Spec.Callback<T>): void;
        it(description: string, callback: Spec.Callback<T>): void;
    }

    export namespace Spec {

        export type Callback<T> = (params: T) => Observable<void> | void;

        // Creates a helper object that provides type-safe wrappers of Jasmine BDD functions for a test suite
        export function create<T>(): Spec<T> {
            return {
                beforeEach: (callback: Callback<T>) => beforeEach(inject<T>(callback)),
                afterEach: (callback: Callback<T>) => afterEach(inject<T>(callback)),
                it: (description: string, callback: Callback<T>) => it(description, inject<T>(callback)),
            };
        }

        // Creates a wrapper around Jasmine BDD functions that allows injection of type-safe properties for the test suite
        export function inject<T>(callback: Callback<T>): (doneFn: DoneFn) => void {
            return function(doneFn: DoneFn) {
                let async = callback(this);

                if (async) {
                    async.subscribe(undefined, undefined, doneFn);
                }
                else {
                    doneFn();
                }
            };
        }
    }

    export function Template<T extends object>(paramNames: Template.Params<T>["paramNames"], callback: Template.CallbackFn, ...paramsList: T[]) {
        const template = Template.create<T>(paramNames, callback);

        return () => template.run(...paramsList);
    }

    export interface Template<T extends object> {
        paramNames: string[];
        invoke: Template.InvokeFn<T>;
        run: Template.RunFn<T>;
    };

    export namespace Template {

        export interface Params<T> {
            paramNames: (keyof T)[];
        }

        export type CallbackFn = (...paramList: any[]) => void;
        export type InvokeFn<T extends object> = (params: T) => void;
        export type RunFn<T extends object> = (...paramsList: T[]) => void;

        export function create<T extends object>(paramNames: Params<T>["paramNames"], callback: CallbackFn): Template<T> {
            const invoke = (params: T) => callback(...paramNames.map(paramName => params[paramName]));
            const run = (...paramsList: T[]) => paramsList.forEach(params => describe("should behave such that", () => invoke(params)));

            return { paramNames, invoke, run };
        }
    }

    export namespace Random {

        export function number(min: number = 0, max: number = Number.MAX_VALUE): number {
            return Math.random() * (max - min) + min;
        }

        export function integer(min: number = 0, max: number = Number.MAX_SAFE_INTEGER): number {
            return Math.round(number(min, max));
        }

        export function boolean(): boolean {
            return !!integer(0, 1);
        }

        export function string(minLength: number = 0, maxLength: number = 20, options: {
            alpha?: boolean,
            numeric?: boolean
        } = { alpha: true, numeric: true }): string {
            let str = "";
            let length = integer(minLength, maxLength);

            for (let i = 0; i < length; ++i) {
                let alphaCode = boolean() ? integer(65, 90) : integer(97, 122);
                let numericCode = integer(48, 57);
                let code = ((options.alpha && boolean()) || !options.numeric) ? alphaCode : numericCode;
                str += String.fromCharCode(code);
            }

            return str;
        }
    }
}