/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { SyncDescriptor } from './descriptors.js';
const _registry = [];
export var InstantiationType;
(function (InstantiationType) {
    /**
     * Instantiate this service as soon as a consumer depends on it. _Note_ that this
     * is more costly as some upfront work is done that is likely not needed
     */
    InstantiationType[InstantiationType["Eager"] = 0] = "Eager";
    /**
     * Instantiate this service as soon as a consumer uses it. This is the _better_
     * way of registering a service.
     */
    InstantiationType[InstantiationType["Delayed"] = 1] = "Delayed";
})(InstantiationType || (InstantiationType = {}));
export function registerSingleton(id, ctorOrDescriptor, supportsDelayedInstantiation) {
    if (!(ctorOrDescriptor instanceof SyncDescriptor)) {
        ctorOrDescriptor = new SyncDescriptor(ctorOrDescriptor, [], Boolean(supportsDelayedInstantiation));
    }
    _registry.push([id, ctorOrDescriptor]);
}
export function getSingletonServiceDescriptors() {
    return _registry;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci90ZXN0L0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vaW5zdGFudGlhdGlvbi9jb21tb24vZXh0ZW5zaW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sa0JBQWtCLENBQUM7QUFHbEQsTUFBTSxTQUFTLEdBQW9ELEVBQUUsQ0FBQztBQUV0RSxNQUFNLENBQU4sSUFBa0IsaUJBWWpCO0FBWkQsV0FBa0IsaUJBQWlCO0lBQ2xDOzs7T0FHRztJQUNILDJEQUFTLENBQUE7SUFFVDs7O09BR0c7SUFDSCwrREFBVyxDQUFBO0FBQ1osQ0FBQyxFQVppQixpQkFBaUIsS0FBakIsaUJBQWlCLFFBWWxDO0FBSUQsTUFBTSxVQUFVLGlCQUFpQixDQUF1QyxFQUF3QixFQUFFLGdCQUF5RSxFQUFFLDRCQUEwRDtJQUN0TyxJQUFJLENBQUMsQ0FBQyxnQkFBZ0IsWUFBWSxjQUFjLENBQUMsRUFBRSxDQUFDO1FBQ25ELGdCQUFnQixHQUFHLElBQUksY0FBYyxDQUFJLGdCQUE2QyxFQUFFLEVBQUUsRUFBRSxPQUFPLENBQUMsNEJBQTRCLENBQUMsQ0FBQyxDQUFDO0lBQ3BJLENBQUM7SUFFRCxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLGdCQUFnQixDQUFDLENBQUMsQ0FBQztBQUN4QyxDQUFDO0FBRUQsTUFBTSxVQUFVLDhCQUE4QjtJQUM3QyxPQUFPLFNBQVMsQ0FBQztBQUNsQixDQUFDIn0=