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
var ExtensionStorageService_1;
import { createDecorator } from '../../instantiation/common/instantiation.js';
import { Emitter } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { IStorageService } from '../../storage/common/storage.js';
import { adoptToGalleryExtensionId, areSameExtensions, getExtensionId } from './extensionManagementUtil.js';
import { IProductService } from '../../product/common/productService.js';
import { distinct } from '../../../base/common/arrays.js';
import { ILogService } from '../../log/common/log.js';
import { isString } from '../../../base/common/types.js';
export const IExtensionStorageService = createDecorator('IExtensionStorageService');
const EXTENSION_KEYS_ID_VERSION_REGEX = /^extensionKeys\/([^.]+\..+)@(\d+\.\d+\.\d+(-.*)?)$/;
let ExtensionStorageService = class ExtensionStorageService extends Disposable {
    static { ExtensionStorageService_1 = this; }
    static { this.LARGE_STATE_WARNING_THRESHOLD = 512 * 1024; }
    static toKey(extension) {
        return `extensionKeys/${adoptToGalleryExtensionId(extension.id)}@${extension.version}`;
    }
    static fromKey(key) {
        const matches = EXTENSION_KEYS_ID_VERSION_REGEX.exec(key);
        if (matches && matches[1]) {
            return { id: matches[1], version: matches[2] };
        }
        return undefined;
    }
    /* TODO @sandy081: This has to be done across all profiles */
    static async removeOutdatedExtensionVersions(extensionManagementService, storageService) {
        const extensions = await extensionManagementService.getInstalled();
        const extensionVersionsToRemove = [];
        for (const [id, versions] of ExtensionStorageService_1.readAllExtensionsWithKeysForSync(storageService)) {
            const extensionVersion = extensions.find(e => areSameExtensions(e.identifier, { id }))?.manifest.version;
            for (const version of versions) {
                if (extensionVersion !== version) {
                    extensionVersionsToRemove.push(ExtensionStorageService_1.toKey({ id, version }));
                }
            }
        }
        for (const key of extensionVersionsToRemove) {
            storageService.remove(key, 0 /* StorageScope.PROFILE */);
        }
    }
    static readAllExtensionsWithKeysForSync(storageService) {
        const extensionsWithKeysForSync = new Map();
        const keys = storageService.keys(0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        for (const key of keys) {
            const extensionIdWithVersion = ExtensionStorageService_1.fromKey(key);
            if (extensionIdWithVersion) {
                let versions = extensionsWithKeysForSync.get(extensionIdWithVersion.id.toLowerCase());
                if (!versions) {
                    extensionsWithKeysForSync.set(extensionIdWithVersion.id.toLowerCase(), versions = []);
                }
                versions.push(extensionIdWithVersion.version);
            }
        }
        return extensionsWithKeysForSync;
    }
    constructor(storageService, productService, logService) {
        super();
        this.storageService = storageService;
        this.productService = productService;
        this.logService = logService;
        this._onDidChangeExtensionStorageToSync = this._register(new Emitter());
        this.onDidChangeExtensionStorageToSync = this._onDidChangeExtensionStorageToSync.event;
        this.extensionsWithKeysForSync = ExtensionStorageService_1.readAllExtensionsWithKeysForSync(storageService);
        this._register(this.storageService.onDidChangeValue(0 /* StorageScope.PROFILE */, undefined, this._store)(e => this.onDidChangeStorageValue(e)));
    }
    onDidChangeStorageValue(e) {
        // State of extension with keys for sync has changed
        if (this.extensionsWithKeysForSync.has(e.key.toLowerCase())) {
            this._onDidChangeExtensionStorageToSync.fire();
            return;
        }
        // Keys for sync of an extension has changed
        const extensionIdWithVersion = ExtensionStorageService_1.fromKey(e.key);
        if (extensionIdWithVersion) {
            if (this.storageService.get(e.key, 0 /* StorageScope.PROFILE */) === undefined) {
                this.extensionsWithKeysForSync.delete(extensionIdWithVersion.id.toLowerCase());
            }
            else {
                let versions = this.extensionsWithKeysForSync.get(extensionIdWithVersion.id.toLowerCase());
                if (!versions) {
                    this.extensionsWithKeysForSync.set(extensionIdWithVersion.id.toLowerCase(), versions = []);
                }
                versions.push(extensionIdWithVersion.version);
                this._onDidChangeExtensionStorageToSync.fire();
            }
            return;
        }
    }
    getExtensionId(extension) {
        if (isString(extension)) {
            return extension;
        }
        const publisher = extension.manifest ? extension.manifest.publisher : extension.publisher;
        const name = extension.manifest ? extension.manifest.name : extension.name;
        return getExtensionId(publisher, name);
    }
    getExtensionState(extension, global) {
        const extensionId = this.getExtensionId(extension);
        const jsonValue = this.getExtensionStateRaw(extension, global);
        if (jsonValue) {
            try {
                return JSON.parse(jsonValue);
            }
            catch (error) {
                // Do not fail this call but log it for diagnostics
                // https://github.com/microsoft/vscode/issues/132777
                this.logService.error(`[mainThreadStorage] unexpected error parsing storage contents (extensionId: ${extensionId}, global: ${global}): ${error}`);
            }
        }
        return undefined;
    }
    getExtensionStateRaw(extension, global) {
        const extensionId = this.getExtensionId(extension);
        const rawState = this.storageService.get(extensionId, global ? 0 /* StorageScope.PROFILE */ : 1 /* StorageScope.WORKSPACE */);
        if (rawState && rawState?.length > ExtensionStorageService_1.LARGE_STATE_WARNING_THRESHOLD) {
            this.logService.warn(`[mainThreadStorage] large extension state detected (extensionId: ${extensionId}, global: ${global}): ${rawState.length / 1024}kb. Consider to use 'storageUri' or 'globalStorageUri' to store this data on disk instead.`);
        }
        return rawState;
    }
    setExtensionState(extension, state, global) {
        const extensionId = this.getExtensionId(extension);
        if (state === undefined) {
            this.storageService.remove(extensionId, global ? 0 /* StorageScope.PROFILE */ : 1 /* StorageScope.WORKSPACE */);
        }
        else {
            this.storageService.store(extensionId, JSON.stringify(state), global ? 0 /* StorageScope.PROFILE */ : 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        }
    }
    setKeysForSync(extensionIdWithVersion, keys) {
        this.storageService.store(ExtensionStorageService_1.toKey(extensionIdWithVersion), JSON.stringify(keys), 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
    }
    getKeysForSync(extensionIdWithVersion) {
        const extensionKeysForSyncFromProduct = this.productService.extensionSyncedKeys?.[extensionIdWithVersion.id.toLowerCase()];
        const extensionKeysForSyncFromStorageValue = this.storageService.get(ExtensionStorageService_1.toKey(extensionIdWithVersion), 0 /* StorageScope.PROFILE */);
        const extensionKeysForSyncFromStorage = extensionKeysForSyncFromStorageValue ? JSON.parse(extensionKeysForSyncFromStorageValue) : undefined;
        return extensionKeysForSyncFromStorage && extensionKeysForSyncFromProduct
            ? distinct([...extensionKeysForSyncFromStorage, ...extensionKeysForSyncFromProduct])
            : (extensionKeysForSyncFromStorage || extensionKeysForSyncFromProduct);
    }
    addToMigrationList(from, to) {
        if (from !== to) {
            // remove the duplicates
            const migrationList = this.migrationList.filter(entry => !entry.includes(from) && !entry.includes(to));
            migrationList.push([from, to]);
            this.migrationList = migrationList;
        }
    }
    getSourceExtensionToMigrate(toExtensionId) {
        const entry = this.migrationList.find(([, to]) => toExtensionId === to);
        return entry ? entry[0] : undefined;
    }
    get migrationList() {
        const value = this.storageService.get('extensionStorage.migrationList', -1 /* StorageScope.APPLICATION */, '[]');
        try {
            const migrationList = JSON.parse(value);
            if (Array.isArray(migrationList)) {
                return migrationList;
            }
        }
        catch (error) { /* ignore */ }
        return [];
    }
    set migrationList(migrationList) {
        if (migrationList.length) {
            this.storageService.store('extensionStorage.migrationList', JSON.stringify(migrationList), -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        }
        else {
            this.storageService.remove('extensionStorage.migrationList', -1 /* StorageScope.APPLICATION */);
        }
    }
};
ExtensionStorageService = ExtensionStorageService_1 = __decorate([
    __param(0, IStorageService),
    __param(1, IProductService),
    __param(2, ILogService)
], ExtensionStorageService);
export { ExtensionStorageService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uU3RvcmFnZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9leHRlbnNpb25NYW5hZ2VtZW50L2NvbW1vbi9leHRlbnNpb25TdG9yYWdlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDOUUsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLCtCQUErQixDQUFDO0FBQy9ELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUMvRCxPQUFPLEVBQW1DLGVBQWUsRUFBK0IsTUFBTSxpQ0FBaUMsQ0FBQztBQUNoSSxPQUFPLEVBQUUseUJBQXlCLEVBQUUsaUJBQWlCLEVBQUUsY0FBYyxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDNUcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUMxRCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFFdEQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBU3pELE1BQU0sQ0FBQyxNQUFNLHdCQUF3QixHQUFHLGVBQWUsQ0FBMkIsMEJBQTBCLENBQUMsQ0FBQztBQWlCOUcsTUFBTSwrQkFBK0IsR0FBRyxvREFBb0QsQ0FBQztBQUV0RixJQUFNLHVCQUF1QixHQUE3QixNQUFNLHVCQUF3QixTQUFRLFVBQVU7O2FBSXZDLGtDQUE2QixHQUFHLEdBQUcsR0FBRyxJQUFJLEFBQWIsQ0FBYztJQUVsRCxNQUFNLENBQUMsS0FBSyxDQUFDLFNBQWtDO1FBQ3RELE9BQU8saUJBQWlCLHlCQUF5QixD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