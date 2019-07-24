import { Metadata } from "./metadata";

export namespace CommonMetadata {

    export const MANAGED_ONDESTROY_KEY = "__LI__MANAGED__ONDESTROY__";
    export const MANAGED_INSTANCE_DESTROYED_KEY = "__LI__MANAGED__INSTANCE__DESTROYED__";

    export function instanceIsDestroyed(componentInstance: any): boolean {
        return Metadata.GetOwnMetadata(CommonMetadata.MANAGED_INSTANCE_DESTROYED_KEY, componentInstance, false);
    }
}