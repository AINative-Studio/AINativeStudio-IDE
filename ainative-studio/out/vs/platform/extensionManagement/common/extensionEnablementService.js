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
import { isUndefinedOrNull } from '../../../base/common/types.js';
import { DISABLED_EXTENSIONS_STORAGE_PATH, IExtensionManagementService } from './extensionManagement.js';
import { areSameExtensions } from './extensionManagementUtil.js';
import { IStorageService } from '../../storage/common/storage.js';
let GlobalExtensionEnablementService = class GlobalExtensionEnablementService extends Disposable {
    constructor(storageService, extensionManagementService) {
        super();
        this._onDidChangeEnablement = new Emitter();
        this.onDidChangeEnablement = this._onDidChangeEnablement.event;
        this.storageManager = this._register(new StorageManager(storageService));
        this._register(this.storageManager.onDidChange(extensions => this._onDidChangeEnablement.fire({ extensions, source: 'storage' })));
        this._register(extensionManagementService.onDidInstallExtensions(e => e.forEach(({ local, operation }) => {
            if (local && operation === 4 /* InstallOperation.Migrate */) {
                this._removeFromDisabledExtensions(local.identifier); /* Reset migrated extensions */
            }
        })));
    }
    async enableExtension(extension, source) {
        if (this._removeFromDisabledExtensions(extension)) {
            this._onDidChangeEnablement.fire({ extensions: [extension], source });
            return true;
        }
        return false;
    }
    async disableExtension(extension, source) {
        if (this._addToDisabledExtensions(extension)) {
            this._onDidChangeEnablement.fire({ extensions: [extension], source });
            return true;
        }
        return false;
    }
    getDisabledExtensions() {
        return this._getExtensions(DISABLED_EXTENSIONS_STORAGE_PATH);
    }
    async getDisabledExtensionsAsync() {
        return this.getDisabledExtensions();
    }
    _addToDisabledExtensions(identifier) {
        const disabledExtensions = this.getDisabledExtensions();
        if (disabledExtensions.every(e => !areSameExtensions(e, identifier))) {
            disabledExtensions.push(identifier);
            this._setDisabledExtensions(disabledExtensions);
            return true;
        }
        return false;
    }
    _removeFromDisabledExtensions(identifier) {
        const disabledExtensions = this.getDisabledExtensions();
        for (let index = 0; index < disabledExtensions.length; index++) {
            const disabledExtension = disabledExtensions[index];
            if (areSameExtensions(disabledExtension, identifier)) {
                disabledExtensions.splice(index, 1);
                this._setDisabledExtensions(disabledExtensions);
                return true;
            }
        }
        return false;
    }
    _setDisabledExtensions(disabledExtensions) {
        this._setExtensions(DISABLED_EXTENSIONS_STORAGE_PATH, disabledExtensions);
    }
    _getExtensions(storageId) {
        return this.storageManager.get(storageId, 0 /* StorageScope.PROFILE */);
    }
    _setExtensions(storageId, extensions) {
        this.storageManager.set(storageId, extensions, 0 /* StorageScope.PROFILE */);
    }
};
GlobalExtensionEnablementService = __decorate([
    __param(0, IStorageService),
    __param(1, IExtensionManagementService)
], GlobalExtensionEnablementService);
export { GlobalExtensionEnablementService };
export class StorageManager extends Disposable {
    constructor(storageService) {
        super();
        this.storageService = storageService;
        this.storage = Object.create(null);
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this._register(storageService.onDidChangeValue(0 /* StorageScope.PROFILE */, undefined, this._store)(e => this.onDidStorageChange(e)));
    }
    get(key, scope) {
        let value;
        if (scope === 0 /* StorageScope.PROFILE */) {
            if (isUndefinedOrNull(this.storage[key])) {
                this.storage[key] = this._get(key, scope);
            }
            value = this.storage[key];
        }
        else {
            value = this._get(key, scope);
        }
        return JSON.parse(value);
    }
    set(key, value, scope) {
        const newValue = JSON.stringify(value.map(({ id, uuid }) => ({ id, uuid })));
        const oldValue = this._get(key, scope);
        if (oldValue !== newValue) {
            if (scope === 0 /* StorageScope.PROFILE */) {
                if (value.length) {
                    this.storage[key] = newValue;
                }
                else {
                    delete this.storage[key];
                }
            }
            this._set(key, value.length ? newValue : undefined, scope);
        }
    }
    onDidStorageChange(storageChangeEvent) {
        if (!isUndefinedOrNull(this.storage[storageChangeEvent.key])) {
            const newValue = this._get(storageChangeEvent.key, storageChangeEvent.scope);
            if (newValue !== this.storage[storageChangeEvent.key]) {
                const oldValues = this.get(storageChangeEvent.key, storageChangeEvent.scope);
                delete this.storage[storageChangeEvent.key];
                const newValues = this.get(storageChangeEvent.key, storageChangeEvent.scope);
                const added = oldValues.filter(oldValue => !newValues.some(newValue => areSameExtensions(oldValue, newValue)));
                const removed = newValues.filter(newValue => !oldValues.some(oldValue => areSameExtensions(oldValue, newValue)));
                if (added.length || removed.length) {
                    this._onDidChange.fire([...added, ...removed]);
                }
            }
        }
    }
    _get(key, scope) {
        return this.storageService.get(key, scope, '[]');
    }
    _set(key, value, scope) {
        if (value) {
            // Enablement state is synced separately through extensions
            this.storageService.store(key, value, scope, 1 /* StorageTarget.MACHINE */);
        }
        else {
            this.storageService.remove(key, scope);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uRW5hYmxlbWVudFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9leHRlbnNpb25NYW5hZ2VtZW50L2NvbW1vbi9leHRlbnNpb25FbmFibGVtZW50U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sK0JBQStCLENBQUM7QUFDL0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ2xFLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBd0IsMkJBQTJCLEVBQXVELE1BQU0sMEJBQTBCLENBQUM7QUFDcEwsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDakUsT0FBTyxFQUFtQyxlQUFlLEVBQStCLE1BQU0saUNBQWlDLENBQUM7QUFFekgsSUFBTSxnQ0FBZ0MsR0FBdEMsTUFBTSxnQ0FBaUMsU0FBUSxVQUFVO0lBUS9ELFlBQ2tCLGNBQStCLEVBQ25CLDBCQUF1RDtRQUVwRixLQUFLLEVBQUUsQ0FBQztRQVJELDJCQUFzQixHQUFHLElBQUksT0FBTyxFQUE2RSxDQUFDO1FBQ2pILDBCQUFxQixHQUFxRixJQUFJLENBQUMsc0JBQXNCLENBQUMsS0FBSyxDQUFDO1FBUXBKLElBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLGNBQWMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDO1FBQ3pFLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsc0JBQXNC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