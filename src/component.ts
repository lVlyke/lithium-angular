// Enable dynamic templating for Ivy-compiled components:
export function TemplateDynamic(): new(...args: any[]) => { [K in keyof any]: any[K]; } {
    return class TemplateDynamic{};
}

export abstract class LiComponent extends TemplateDynamic() {}
