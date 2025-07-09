/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export function extHostNamedCustomer(id) {
    return function (ctor) {
        ExtHostCustomersRegistryImpl.INSTANCE.registerNamedCustomer(id, ctor);
    };
}
export function extHostCustomer(ctor) {
    ExtHostCustomersRegistryImpl.INSTANCE.registerCustomer(ctor);
}
export var ExtHostCustomersRegistry;
(function (ExtHostCustomersRegistry) {
    function getNamedCustomers() {
        return ExtHostCustomersRegistryImpl.INSTANCE.getNamedCustomers();
    }
    ExtHostCustomersRegistry.getNamedCustomers = getNamedCustomers;
    function getCustomers() {
        return ExtHostCustomersRegistryImpl.INSTANCE.getCustomers();
    }
    ExtHostCustomersRegistry.getCustomers = getCustomers;
})(ExtHostCustomersRegistry || (ExtHostCustomersRegistry = {}));
class ExtHostCustomersRegistryImpl {
    static { this.INSTANCE = new ExtHostCustomersRegistryImpl(); }
    constructor() {
        this._namedCustomers = [];
        this._customers = [];
    }
    registerNamedCustomer(id, ctor) {
        const entry = [id, ctor];
        this._namedCustomers.push(entry);
    }
    getNamedCustomers() {
        return this._namedCustomers;
    }
    registerCustomer(ctor) {
        this._customers.push(ctor);
    }
    getCustomers() {
        return this._customers;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdEN1c3RvbWVycy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvZXh0ZW5zaW9ucy9jb21tb24vZXh0SG9zdEN1c3RvbWVycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQXdCaEcsTUFBTSxVQUFVLG9CQUFvQixDQUF3QixFQUFzQjtJQUNqRixPQUFPLFVBQTZDLElBQWlFO1FBQ3BILDRCQUE0QixDQUFDLFFBQVEsQ0FBQyxxQkFBcUIsQ0FBQyxFQUFFLEVBQUUsSUFBK0IsQ0FBQyxDQUFDO0lBQ2xHLENBQUMsQ0FBQztBQUNILENBQUM7QUFFRCxNQUFNLFVBQVUsZUFBZSxDQUEyRCxJQUFpRTtJQUMxSiw0QkFBNEIsQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsSUFBK0IsQ0FBQyxDQUFDO0FBQ3pGLENBQUM7QUFFRCxNQUFNLEtBQVcsd0JBQXdCLENBU3hDO0FBVEQsV0FBaUIsd0JBQXdCO0lBRXhDLFNBQWdCLGlCQUFpQjtRQUNoQyxPQUFPLDRCQUE0QixDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO0lBQ2xFLENBQUM7SUFGZSwwQ0FBaUIsb0JBRWhDLENBQUE7SUFFRCxTQUFnQixZQUFZO1FBQzNCLE9BQU8sNEJBQTRCLENBQUMsUUFBUSxDQUFDLFlBQVksRUFBRSxDQUFDO0lBQzdELENBQUM7SUFGZSxxQ0FBWSxlQUUzQixDQUFBO0FBQ0YsQ0FBQyxFQVRnQix3QkFBd0IsS0FBeEIsd0JBQXdCLFFBU3hDO0FBRUQsTUFBTSw0QkFBNEI7YUFFVixhQUFRLEdBQUcsSUFBSSw0QkFBNEIsRUFBRSxDQUFDO0lBS3JFO1FBQ0MsSUFBSSxDQUFDLGVBQWUsR0FBRyxFQUFFLENBQUM7UUFDMUIsSUFBSSxDQUFDLFVBQVUsR0FBRyxFQUFFLENBQUM7SUFDdEIsQ0FBQztJQUVNLHFCQUFxQixDQUF3QixFQUFzQixFQUFFLElBQTZCO1FBQ3hHLE1BQU0sS0FBSyxHQUE2QixDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNuRCxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUNsQyxDQUFDO0lBQ00saUJBQWlCO1FBQ3ZCLE9BQU8sSUFBSSxDQUFDLGVBQWUsQ0FBQztJQUM3QixDQUFDO0lBRU0sZ0JBQWdCLENBQXdCLElBQTZCO1FBQzNFLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQzVCLENBQUM7SUFDTSxZQUFZO1FBQ2xCLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQztJQUN4QixDQUFDIn0=