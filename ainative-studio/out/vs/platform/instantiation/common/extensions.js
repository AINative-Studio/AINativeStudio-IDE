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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9pbnN0YW50aWF0aW9uL2NvbW1vbi9leHRlbnNpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUdsRCxNQUFNLFNBQVMsR0FBb0QsRUFBRSxDQUFDO0FBRXRFLE1BQU0sQ0FBTixJQUFrQixpQkFZakI7QUFaRCxXQUFrQixpQkFBaUI7SUFDbEM7OztPQUdHO0lBQ0gsMkRBQVMsQ0FBQTtJQUVUOzs7T0FHRztJQUNILCtEQUFXLENBQUE7QUFDWixDQUFDLEVBWmlCLGlCQUFpQixLQUFqQixpQkFBaUIsUUFZbEM7QUFJRCxNQUFNLFVBQVUsaUJBQWlCLENBQXVDLEVBQXdCLEVBQUUsZ0JBQXlFLEVBQUUsNEJBQTBEO0lBQ3RPLElBQUksQ0FBQyxDQUFDLGdCQUFnQixZQUFZLGNBQWMsQ0FBQyxFQUFFLENBQUM7UUFDbkQsZ0JBQWdCLEdBQUcsSUFBSSxjQUFjLENBQUksZ0JBQTZDLEVBQUUsRUFBRSxFQUFFLE9BQU8sQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDLENBQUM7SUFDcEksQ0FBQztJQUVELFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDO0FBQ3hDLENBQUM7QUFFRCxNQUFNLFVBQVUsOEJBQThCO0lBQzdDLE9BQU8sU0FBUyxDQUFDO0FBQ2xCLENBQUMifQ==