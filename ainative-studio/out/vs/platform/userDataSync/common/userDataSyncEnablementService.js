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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFTeW5jRW5hYmxlbWVudFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS91c2VyRGF0YVN5bmMvY29tbW9uL3VzZXJEYXRhU3luY0VuYWJsZW1lbnRTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSwrQkFBK0IsQ0FBQztBQUMvRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDL0QsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3pELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzlFLE9BQU8sRUFBdUMsZUFBZSxFQUErQixNQUFNLGlDQUFpQyxDQUFDO0FBQ3BJLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxnQkFBZ0IsRUFBa0MsbUNBQW1DLEVBQWdCLE1BQU0sbUJBQW1CLENBQUM7QUFFNUosTUFBTSxhQUFhLEdBQUcsYUFBYSxDQUFDO0FBRTdCLElBQU0sNkJBQTZCLEdBQW5DLE1BQU0sNkJBQThCLFNBQVEsVUFBVTtJQVU1RCxZQUNrQixjQUFnRCxFQUM1QyxrQkFBMEQsRUFDMUMsa0NBQXdGO1FBRTdILEtBQUssRUFBRSxDQUFDO1FBSjBCLG1CQUFjLEdBQWQsY0FBYyxDQUFpQjtRQUN6Qix1QkFBa0IsR0FBbEIsa0JBQWtCLENBQXFCO1FBQ3pCLHVDQUFrQyxHQUFsQyxrQ0FBa0MsQ0FBcUM7UUFUdEgsMkJBQXNCLEdBQUcsSUFBSSxPQUFPLEVBQVcsQ0FBQztRQUMvQywwQkFBcUIsR0FBbUIsSUFBSSxDQUFDLHNCQUFzQixDQUFDLEtBQUssQ0FBQztRQUUzRSxtQ0FBOEIsR0FBRyxJQUFJLE9BQU8s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