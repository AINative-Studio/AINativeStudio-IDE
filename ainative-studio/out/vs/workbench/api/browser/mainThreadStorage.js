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
import { IStorageService } from '../../../platform/storage/common/storage.js';
import { MainContext, ExtHostContext } from '../common/extHost.protocol.js';
import { extHostNamedCustomer } from '../../services/extensions/common/extHostCustomers.js';
import { DisposableStore } from '../../../base/common/lifecycle.js';
import { isWeb } from '../../../base/common/platform.js';
import { IExtensionStorageService } from '../../../platform/extensionManagement/common/extensionStorage.js';
import { migrateExtensionStorage } from '../../services/extensions/common/extensionStorageMigration.js';
import { IInstantiationService } from '../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../platform/log/common/log.js';
let MainThreadStorage = class MainThreadStorage {
    constructor(extHostContext, _extensionStorageService, _storageService, _instantiationService, _logService) {
        this._extensionStorageService = _extensionStorageService;
        this._storageService = _storageService;
        this._instantiationService = _instantiationService;
        this._logService = _logService;
        this._storageListener = new DisposableStore();
        this._sharedStorageKeysToWatch = new Map();
        this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostStorage);
        this._storageListener.add(this._storageService.onDidChangeValue(0 /* StorageScope.PROFILE */, undefined, this._storageListener)(e => {
            if (this._sharedStorageKeysToWatch.has(e.key)) {
                const rawState = this._extensionStorageService.getExtensionStateRaw(e.key, true);
                if (typeof rawState === 'string') {
                    this._proxy.$acceptValue(true, e.key, rawState);
                }
            }
        }));
    }
    dispose() {
        this._storageListener.dispose();
    }
    async $initializeExtensionStorage(shared, extensionId) {
        await this.checkAndMigrateExtensionStorage(extensionId, shared);
        if (shared) {
            this._sharedStorageKeysToWatch.set(extensionId, true);
        }
        return this._extensionStorageService.getExtensionStateRaw(extensionId, shared);
    }
    async $setValue(shared, key, value) {
        this._extensionStorageService.setExtensionState(key, value, shared);
    }
    $registerExtensionStorageKeysToSync(extension, keys) {
        this._extensionStorageService.setKeysForSync(extension, keys);
    }
    async checkAndMigrateExtensionStorage(extensionId, shared) {
        try {
            let sourceExtensionId = this._extensionStorageService.getSourceExtensionToMigrate(extensionId);
            // TODO: @sandy081 - Remove it after 6 months
            // If current extension does not have any migration requested
            // Then check if the extension has to be migrated for using lower case in web
            // If so, migrate the extension state from lower case id to its normal id.
            if (!sourceExtensionId && isWeb && extensionId !== extensionId.toLowerCase()) {
                sourceExtensionId = extensionId.toLowerCase();
            }
            if (sourceExtensionId) {
                // TODO: @sandy081 - Remove it after 6 months
                // In Web, extension state was used to be stored in lower case extension id.
                // Hence check that if the lower cased source extension was not yet migrated in web
                // If not take the lower cased source extension id for migration
                if (isWeb && sourceExtensionId !== sourceExtensionId.toLowerCase() && this._extensionStorageService.getExtensionState(sourceExtensionId.toLowerCase(), shared) && !this._extensionStorageService.getExtensionState(sourceExtensionId, shared)) {
                    sourceExtensionId = sourceExtensionId.toLowerCase();
                }
                await migrateExtensionStorage(sourceExtensionId, extensionId, shared, this._instantiationService);
            }
        }
        catch (error) {
            this._logService.error(error);
        }
    }
};
MainThreadStorage = __decorate([
    extHostNamedCustomer(MainContext.MainThreadStorage),
    __param(1, IExtensionStorageService),
    __param(2, IStorageService),
    __param(3, IInstantiationService),
    __param(4, ILogService)
], MainThreadStorage);
export { MainThreadStorage };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZFN0b3JhZ2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9icm93c2VyL21haW5UaHJlYWRTdG9yYWdlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQWdCLE1BQU0sNkNBQTZDLENBQUM7QUFDNUYsT0FBTyxFQUEwQixXQUFXLEVBQXVCLGNBQWMsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3pILE9BQU8sRUFBRSxvQkFBb0IsRUFBbUIsTUFBTSxzREFBc0QsQ0FBQztBQUM3RyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDcEUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3pELE9BQU8sRUFBMkIsd0JBQXdCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQztBQUNySSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUN4RyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUNoRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFHM0QsSUFBTSxpQkFBaUIsR0FBdkIsTUFBTSxpQkFBaUI7SUFNN0IsWUFDQyxjQUErQixFQUNMLHdCQUFtRSxFQUM1RSxlQUFpRCxFQUMzQyxxQkFBNkQsRUFDdkUsV0FBeUM7UUFIWCw2QkFBd0IsR0FBeEIsd0JBQXdCLENBQTBCO1FBQzNELG9CQUFlLEdBQWYsZUFBZSxDQUFpQjtRQUMxQiwwQkFBcUIsR0FBckIscUJBQXFCLENBQXVCO1FBQ3RELGdCQUFXLEdBQVgsV0FBVyxDQUFhO1FBUnRDLHFCQUFnQixHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7UUFD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