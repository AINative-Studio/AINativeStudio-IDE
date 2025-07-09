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
import { Emitter } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { isWeb } from '../../../base/common/platform.js';
import { IEnvironmentService } from '../../environment/common/environment.js';
import { IStorageService } from '../../storage/common/storage.js';
import { ALL_SYNC_RESOURCES, getEnablementKey, IUserDataSyncStoreManagementService } from './userDataSync.js';
const enablementKey = 'sync.enable';
let UserDataSyncEnablementService = class UserDataSyncEnablementService extends Disposable {
    constructor(storageService, environmentService, userDataSyncStoreManagementService) {
        super();
        this.storageService = storageService;
        this.environmentService = environmentService;
        this.userDataSyncStoreManagementService = userDataSyncStoreManagementService;
        this._onDidChangeEnablement = new Emitter();
        this.onDidChangeEnablement = this._onDidChangeEnablement.event;
        this._onDidChangeResourceEnablement = new Emitter();
        this.onDidChangeResourceEnablement = this._onDidChangeResourceEnablement.event;
        this._register(storageService.onDidChangeValue(-1 /* StorageScope.APPLICATION */, undefined, this._store)(e => this.onDidStorageChange(e)));
    }
    isEnabled() {
        switch (this.environmentService.sync) {
            case 'on':
                return true;
            case 'off':
                return false;
        }
        return this.storageService.getBoolean(enablementKey, -1 /* StorageScope.APPLICATION */, false);
    }
    canToggleEnablement() {
        return this.userDataSyncStoreManagementService.userDataSyncStore !== undefined && this.environmentService.sync === undefined;
    }
    setEnablement(enabled) {
        if (enabled && !this.canToggleEnablement()) {
            return;
        }
        this.storageService.store(enablementKey, enabled, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
    }
    isResourceEnabled(resource, defaultValue) {
        const storedValue = this.storageService.getBoolean(getEnablementKey(resource), -1 /* StorageScope.APPLICATION */);
        defaultValue = defaultValue ?? resource !== "prompts" /* SyncResource.Prompts */;
        return storedValue ?? defaultValue;
    }
    isResourceEnablementConfigured(resource) {
        const storedValue = this.storageService.getBoolean(getEnablementKey(resource), -1 /* StorageScope.APPLICATION */);
        return (storedValue !== undefined);
    }
    setResourceEnablement(resource, enabled) {
        if (this.isResourceEnabled(resource) !== enabled) {
            const resourceEnablementKey = getEnablementKey(resource);
            this.storeResourceEnablement(resourceEnablementKey, enabled);
        }
    }
    getResourceSyncStateVersion(resource) {
        return undefined;
    }
    storeResourceEnablement(resourceEnablementKey, enabled) {
        this.storageService.store(resourceEnablementKey, enabled, -1 /* StorageScope.APPLICATION */, isWeb ? 0 /* StorageTarget.USER */ : 1 /* StorageTarget.MACHINE */);
    }
    onDidStorageChange(storageChangeEvent) {
        if (enablementKey === storageChangeEvent.key) {
            this._onDidChangeEnablement.fire(this.isEnabled());
            return;
        }
        const resourceKey = ALL_SYNC_RESOURCES.filter(resourceKey => getEnablementKey(resourceKey) === storageChangeEvent.key)[0];
        if (resourceKey) {
            this._onDidChangeResourceEnablement.fire([resourceKey, this.isResourceEnabled(resourceKey)]);
            return;
        }
    }
};
UserDataSyncEnablementService = __decorate([
    __param(0, IStorageService),
    __param(1, IEnvironmentService),
    __param(2, IUserDataSyncStoreManagementService)
], UserDataSyncEnablementService);
export { UserDataSyncEnablementService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFTeW5jRW5hYmxlbWVudFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdXNlckRhdGFTeW5jL2NvbW1vbi91c2VyRGF0YVN5bmNFbmFibGVtZW50U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sK0JBQStCLENBQUM7QUFDL0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN6RCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUM5RSxPQUFPLEVBQXVDLGVBQWUsRUFBK0IsTUFBTSxpQ0FBaUMsQ0FBQztBQUNwSSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsZ0JBQWdCLEVBQWtDLG1DQUFtQyxFQUFnQixNQUFNLG1CQUFtQixDQUFDO0FBRTVKLE1BQU0sYUFBYSxHQUFHLGFBQWEsQ0FBQztBQUU3QixJQUFNLDZCQUE2QixHQUFuQyxNQUFNLDZCQUE4QixTQUFRLFVBQVU7SUFVNUQsWUFDa0IsY0FBZ0QsRUFDNUMsa0JBQTBELEVBQzFDLGtDQUF3RjtRQUU3SCxLQUFLLEVBQUUsQ0FBQztRQUowQixtQkFBYyxHQUFkLGNBQWMsQ0FBaUI7UUFDekIsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFxQjtRQUN6Qix1Q0FBa0MsR0FBbEMsa0NBQWtDLENBQXFDO1FBVHRILDJCQUFzQixHQUFHLElBQUksT0FBTyxFQUFXLENBQUM7UUFDL0MsMEJBQXFCLEdBQW1CLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxLQUFLLENBQUM7UUFFM0UsbUNBQThCLEdBQUcsSUFBSSxPQUFP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