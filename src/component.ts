// Enable dynamic templating for Ivy-compiled components:
/** @deprecated */
export function TemplateDynamic(): new(...args: any[]) => { [K in keyof any]: any[K]; } {
    return class TemplateDynamic{};
}

/** @deprecated */
export abstract class LiComponent extends TemplateDynamic() {}
