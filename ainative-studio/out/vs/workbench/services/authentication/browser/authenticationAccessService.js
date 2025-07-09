/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
export const IAuthenticationAccessService = createDecorator('IAuthenticationAccessService');
// TODO@TylerLeonhardt: Move this class to MainThreadAuthentication
let AuthenticationAccessService = class AuthenticationAccessService extends Disposable {
    constructor(_storageService, _productService) {
        super();
        this._storageService = _storageService;
        this._productService = _productService;
        this._onDidChangeExtensionSessionAccess = this._register(new Emitter());
        this.onDidChangeExtensionSessionAccess = this._onDidChangeExtensionSessionAccess.event;
    }
    isAccessAllowed(providerId, accountName, extensionId) {
        const trustedExtensionAuthAccess = this._productService.trustedExtensionAuthAccess;
        if (Array.isArray(trustedExtensionAuthAccess)) {
            if (trustedExtensionAuthAccess.includes(extensionId)) {
                return true;
            }
        }
        else if (trustedExtensionAuthAccess?.[providerId]?.includes(extensionId)) {
            return true;
        }
        const allowList = this.readAllowedExtensions(providerId, accountName);
        const extensionData = allowList.find(extension => extension.id === extensionId);
        if (!extensionData) {
            return undefined;
        }
        // This property didn't exist on this data previously, inclusion in the list at all indicates allowance
        return extensionData.allowed !== undefined
            ? extensionData.allowed
            : true;
    }
    readAllowedExtensions(providerId, accountName) {
        let trustedExtensions = [];
        try {
            const trustedExtensionSrc = this._storageService.get(`${providerId}-${accountName}`, -1 /* StorageScope.APPLICATION */);
            if (trustedExtensionSrc) {
                trustedExtensions = JSON.parse(trustedExtensionSrc);
            }
        }
        catch (err) { }
        return trustedExtensions;
    }
    updateAllowedExtensions(providerId, accountName, extensions) {
        const allowList = this.readAllowedExtensions(providerId, accountName);
        for (const extension of extensions) {
            const index = allowList.findIndex(e => e.id === extension.id);
            if (index === -1) {
                allowList.push(extension);
            }
            else {
                allowList[index].allowed = extension.allowed;
            }
        }
        this._storageService.store(`${providerId}-${accountName}`, JSON.stringify(allowList), -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
        this._onDidChangeExtensionSessionAccess.fire({ providerId, accountName });
    }
    removeAllowedExtensions(providerId, accountName) {
        this._storageService.remove(`${providerId}-${accountName}`, -1 /* StorageScope.APPLICATION */);
        this._onDidChangeExtensionSessionAccess.fire({ providerId, accountName });
    }
};
AuthenticationAccessService = __decorate([
    __param(0, IStorageService),
    __param(1, IProductService)
], AuthenticationAccessService);
export { AuthenticationAccessService };
registerSingleton(IAuthenticationAccessService, AuthenticationAccessService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0aGVudGljYXRpb25BY2Nlc3NTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9hdXRoZW50aWNhdGlvbi9icm93c2VyL2F1dGhlbnRpY2F0aW9uQWNjZXNzU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBcUIsaUJBQWlCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUMvRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDN0YsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQ3hGLE9BQU8sRUFBRSxlQUFlLEVBQStCLE1BQU0sZ0RBQWdELENBQUM7QUFHOUcsTUFBTSxDQUFDLE1BQU0sNEJBQTRCLEdBQUcsZUFBZSxDQUErQiw4QkFBOEIsQ0FBQyxDQUFDO0FBb0IxSCxtRUFBbUU7QUFDNUQsSUFBTSwyQkFBMkIsR0FBakMsTUFBTSwyQkFBNEIsU0FBUSxVQUFVO0lBTTFELFlBQ2tCLGVBQWlELEVBQ2pELGVBQWlEO1FBRWxFLEtBQUssRUFBRSxDQUFDO1FBSDBCLG9CQUFlLEdBQWYsZUFBZSxDQUFpQjtRQUNoQyxvQkFBZSxHQUFmLGVBQWUsQ0FBaUI7UUFMM0QsdUNBQWtDLEdBQXlELElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQStDLENBQUMsQ0FBQztRQUNySyxzQ0FBaUMsR0FBdUQsSUFBSSxDQUFDLGtDQUFrQyxDQUFDLEtBQUssQ0FBQztJQU8vSSxDQUFDO0lBRUQsZUFBZSxDQUFD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