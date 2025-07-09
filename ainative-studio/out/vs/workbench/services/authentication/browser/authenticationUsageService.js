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
import { Queue } from '../../../../base/common/async.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IAuthenticationService } from '../common/authentication.js';
export const IAuthenticationUsageService = createDecorator('IAuthenticationUsageService');
let AuthenticationUsageService = class AuthenticationUsageService extends Disposable {
    constructor(_storageService, _authenticationService, _logService, productService) {
        super();
        this._storageService = _storageService;
        this._authenticationService = _authenticationService;
        this._logService = _logService;
        this._queue = new Queue();
        this._extensionsUsingAuth = new Set();
        // If an extension is listed in `trustedExtensionAuthAccess` we should consider it as using auth
        const trustedExtensionAuthAccess = productService.trustedExtensionAuthAccess;
        if (Array.isArray(trustedExtensionAuthAccess)) {
            for (const extensionId of trustedExtensionAuthAccess) {
                this._extensionsUsingAuth.add(extensionId);
            }
        }
        else if (trustedExtensionAuthAccess) {
            for (const extensions of Object.values(trustedExtensionAuthAccess)) {
                for (const extensionId of extensions) {
                    this._extensionsUsingAuth.add(extensionId);
                }
            }
        }
        this._register(this._authenticationService.onDidRegisterAuthenticationProvider(provider => this._queue.queue(() => this._addExtensionsToCache(provider.id))));
    }
    async initializeExtensionUsageCache() {
        await this._queue.queue(() => Promise.all(this._authenticationService.getProviderIds().map(providerId => this._addExtensionsToCache(providerId))));
    }
    async extensionUsesAuth(extensionId) {
        await this._queue.whenIdle();
        return this._extensionsUsingAuth.has(extensionId);
    }
    readAccountUsages(providerId, accountName) {
        const accountKey = `${providerId}-${accountName}-usages`;
        const storedUsages = this._storageService.get(accountKey, -1 /* StorageScope.APPLICATION */);
        let usages = [];
        if (storedUsages) {
            try {
                usages = JSON.parse(storedUsages);
            }
            catch (e) {
                // ignore
            }
        }
        return usages;
    }
    removeAccountUsage(providerId, accountName) {
        const accountKey = `${providerId}-${accountName}-usages`;
        this._storageService.remove(accountKey, -1 /* StorageScope.APPLICATION */);
    }
    addAccountUsage(providerId, accountName, scopes, extensionId, extensionName) {
        const accountKey = `${providerId}-${accountName}-usages`;
        const usages = this.readAccountUsages(providerId, accountName);
        const existingUsageIndex = usages.findIndex(usage => usage.extensionId === extensionId);
        if (existingUsageIndex > -1) {
            usages.splice(existingUsageIndex, 1, {
                extensionId,
                extensionName,
                scopes,
                lastUsed: Date.now()
            });
        }
        else {
            usages.push({
                extensionId,
                extensionName,
                scopes,
                lastUsed: Date.now()
            });
        }
        this._storageService.store(accountKey, JSON.stringify(usages), -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        this._extensionsUsingAuth.add(extensionId);
    }
    async _addExtensionsToCache(providerId) {
        try {
            const accounts = await this._authenticationService.getAccounts(providerId);
            for (const account of accounts) {
                const usage = this.readAccountUsages(providerId, account.label);
                for (const u of usage) {
                    this._extensionsUsingAuth.add(u.extensionId);
                }
            }
        }
        catch (e) {
            this._logService.error(e);
        }
    }
};
AuthenticationUsageService = __decorate([
    __param(0, IStorageService),
    __param(1, IAuthenticationService),
    __param(2, ILogService),
    __param(3, IProductService)
], AuthenticationUsageService);
export { AuthenticationUsageService };
registerSingleton(IAuthenticationUsageService, AuthenticationUsageService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0aGVudGljYXRpb25Vc2FnZVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2F1dGhlbnRpY2F0aW9uL2Jyb3dzZXIvYXV0aGVudGljYXRpb25Vc2FnZVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3pELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQXFCLGlCQUFpQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDL0csT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNyRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDeEYsT0FBTyxFQUFFLGVBQWUsRUFBK0IsTUFBTSxnREFBZ0QsQ0FBQztBQUM5RyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQVNyRSxNQUFNLENBQUMsTUFBTSwyQkFBMkIsR0FBRyxlQUFlLENBQThCLDZCQUE2QixDQUFDLENBQUM7QUFrQ2hILElBQU0sMEJBQTBCLEdBQWhDLE1BQU0sMEJBQTJCLFNBQVEsVUFBVTtJQU16RCxZQUNrQixlQUFpRCxFQUMxQyxzQkFBK0QsRUFDMUUsV0FBeUMsRUFDckMsY0FBK0I7UUFFaEQsS0FBSyxFQUFFLENBQUM7UUFMMEIsb0JBQWUsR0FBZixlQUFlLENBQWlCO1FBQ3pCLDJCQUFzQixHQUF0QixzQkFBc0IsQ0FBd0I7UUFDekQsZ0JBQVcsR0FBWCxXQUFXLENBQWE7UUFOL0MsV0FBTSxH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