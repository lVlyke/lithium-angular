// Enable dynamic templating in AoT compiled components
export function AotDynamic(): new(...args: any[]) => { [K in keyof any]: any[K]; } {
    return class AotDynamic{};
}

export class AotAware extends AotDynamic() {}
