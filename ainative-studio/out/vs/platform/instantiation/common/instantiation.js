/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
// ------ internal util
export var _util;
(function (_util) {
    _util.serviceIds = new Map();
    _util.DI_TARGET = '$di$target';
    _util.DI_DEPENDENCIES = '$di$dependencies';
    function getServiceDependencies(ctor) {
        return ctor[_util.DI_DEPENDENCIES] || [];
    }
    _util.getServiceDependencies = getServiceDependencies;
})(_util || (_util = {}));
export const IInstantiationService = createDecorator('instantiationService');
function storeServiceDependency(id, target, index) {
    if (target[_util.DI_TARGET] === target) {
        target[_util.DI_DEPENDENCIES].push({ id, index });
    }
    else {
        target[_util.DI_DEPENDENCIES] = [{ id, index }];
        target[_util.DI_TARGET] = target;
    }
}
/**
 * The *only* valid way to create a {{ServiceIdentifier}}.
 */
export function createDecorator(serviceId) {
    if (_util.serviceIds.has(serviceId)) {
        return _util.serviceIds.get(serviceId);
    }
    const id = function (target, key, index) {
        if (arguments.length !== 3) {
            throw new Error('@IServiceName-decorator can only be used to decorate a parameter');
        }
        storeServiceDependency(id, target, index);
    };
    id.toString = () => serviceId;
    _util.serviceIds.set(serviceId, id);
    return id;
}
export function refineServiceDecorator(serviceIdentifier) {
    return serviceIdentifier;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5zdGFudGlhdGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9pbnN0YW50aWF0aW9uL2NvbW1vbi9pbnN0YW50aWF0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBTWhHLHVCQUF1QjtBQUV2QixNQUFNLEtBQVcsS0FBSyxDQVVyQjtBQVZELFdBQWlCLEtBQUs7SUFFUixnQkFBVSxHQUFHLElBQUksR0FBRyxFQUFrQyxDQUFDO0lBRXZELGVBQVMsR0FBRyxZQUFZLENBQUM7SUFDekIscUJBQWUsR0FBRyxrQkFBa0IsQ0FBQztJQUVsRCxTQUFnQixzQkFBc0IsQ0FBQyxJQUFTO1FBQy9DLE9BQU8sSUFBSSxDQUFDLE1BQUEsZUFBZSxDQUFDLElBQUksRUFBRSxDQUFDO0lBQ3BDLENBQUM7SUFGZSw0QkFBc0IseUJBRXJDLENBQUE7QUFDRixDQUFDLEVBVmdCLEtBQUssS0FBTCxLQUFLLFFBVXJCO0FBY0QsTUFBTSxDQUFDLE1BQU0scUJBQXFCLEdBQUcsZUFBZSxDQUF3QixzQkFBc0IsQ0FBQyxDQUFDO0FBdURwRyxTQUFTLHNCQUFzQixDQUFDLEVBQVksRUFBRSxNQUFnQixFQUFFLEtBQWE7SUFDNUUsSUFBSyxNQUFjLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxLQUFLLE1BQU0sRUFBRSxDQUFDO1FBQ2hELE1BQWMsQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7SUFDNUQsQ0FBQztTQUFNLENBQUM7UUFDTixNQUFjLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztRQUN4RCxNQUFjLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxHQUFHLE1BQU0sQ0FBQztJQUMzQyxDQUFDO0FBQ0YsQ0FBQztBQUVEOztHQUVHO0FBQ0gsTUFBTSxVQUFVLGVBQWUsQ0FBSSxTQUFpQjtJQUVuRCxJQUFJLEtBQUssQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUM7UUFDckMsT0FBTyxLQUFLLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUUsQ0FBQztJQUN6QyxDQUFDO0lBRUQsTUFBTSxFQUFFLEdBQVEsVUFBVSxNQUFnQixFQUFFLEdBQVcsRUFBRSxLQUFhO1FBQ3JFLElBQUksU0FBUyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUM1QixNQUFNLElBQUksS0FBSyxDQUFDLGtFQUFrRSxDQUFDLENBQUM7UUFDckYsQ0FBQztRQUNELHNCQUFzQixDQUFDLEVBQUUsRUFBRSxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDM0MsQ0FBQyxDQUFDO0lBRUYsRUFBRSxDQUFDLFFBQVEsR0FBRyxHQUFHLEVBQUUsQ0FBQyxTQUFTLENBQUM7SUFFOUIsS0FBSyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQ3BDLE9BQU8sRUFBRSxDQUFDO0FBQ1gsQ0FBQztBQUVELE1BQU0sVUFBVSxzQkFBc0IsQ0FBbUIsaUJBQXdDO0lBQ2hHLE9BQTZCLGlCQUFpQixDQUFDO0FBQ2hELENBQUMifQ==