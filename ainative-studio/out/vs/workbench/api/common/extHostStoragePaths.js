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
import { createDecorator } from '../../../platform/instantiation/common/instantiation.js';
import { IExtHostInitDataService } from './extHostInitDataService.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { IExtHostConsumerFileSystem } from './extHostFileSystemConsumer.js';
import { URI } from '../../../base/common/uri.js';
export const IExtensionStoragePaths = createDecorator('IExtensionStoragePaths');
let ExtensionStoragePaths = class ExtensionStoragePaths {
    constructor(initData, _logService, _extHostFileSystem) {
        this._logService = _logService;
        this._extHostFileSystem = _extHostFileSystem;
        this._workspace = initData.workspace ?? undefined;
        this._environment = initData.environment;
        this.whenReady = this._getOrCreateWorkspaceStoragePath().then(value => this._value = value);
    }
    async _getWorkspaceStorageURI(storageName) {
        return URI.joinPath(this._environment.workspaceStorageHome, storageName);
    }
    async _getOrCreateWorkspaceStoragePath() {
        if (!this._workspace) {
            return Promise.resolve(undefined);
        }
        const storageName = this._workspace.id;
        const storageUri = await this._getWorkspaceStorageURI(storageName);
        try {
            await this._extHostFileSystem.value.stat(storageUri);
            this._logService.trace('[ExtHostStorage] storage dir already exists', storageUri);
            return storageUri;
        }
        catch {
            // doesn't exist, that's OK
        }
        try {
            this._logService.trace('[ExtHostStorage] creating dir and metadata-file', storageUri);
            await this._extHostFileSystem.value.createDirectory(storageUri);
            await this._extHostFileSystem.value.writeFile(URI.joinPath(storageUri, 'meta.json'), new TextEncoder().encode(JSON.stringify({
                id: this._workspace.id,
                configuration: URI.revive(this._workspace.configuration)?.toString(),
                name: this._workspace.name
            }, undefined, 2)));
            return storageUri;
        }
        catch (e) {
            this._logService.error('[ExtHostStorage]', e);
            return undefined;
        }
    }
    workspaceValue(extension) {
        if (this._value) {
            return URI.joinPath(this._value, extension.identifier.value);
        }
        return undefined;
    }
    globalValue(extension) {
        return URI.joinPath(this._environment.globalStorageHome, extension.identifier.value.toLowerCase());
    }
    onWillDeactivateAll() {
    }
};
ExtensionStoragePaths = __decorate([
    __param(0, IExtHostInitDataService),
    __param(1, ILogService),
    __param(2, IExtHostConsumerFileSystem)
], ExtensionStoragePaths);
export { ExtensionStoragePaths };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFN0b3JhZ2VQYXRocy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2NvbW1vbi9leHRIb3N0U3RvcmFnZVBhdGhzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUMxRixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUN0RSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFFbEUsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDNUUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBRWxELE1BQU0sQ0FBQyxNQUFNLHNCQUFzQixHQUFHLGVBQWUsQ0FBeUIsd0JBQXdCLENBQUMsQ0FBQztBQVVqRyxJQUFNLHFCQUFxQixHQUEzQixNQUFNLHFCQUFxQjtJQVVqQyxZQUMwQixRQUFpQyxFQUMxQixXQUF3QixFQUNYLGtCQUE4QztRQUQzRCxnQkFBVyxHQUFYLFdBQVcsQ0FBYTtRQUNYLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBNEI7UUFFM0YsSUFBSSxDQUFDLFVBQVUsR0FBRyxRQUFRLENBQUMsU0FBUyxJQUFJLFNBQVMsQ0FBQztRQUNsRCxJQUFJLENBQUMsWUFBWSxHQUFHLFFBQVEsQ0FBQyxXQUFXLENBQUM7UUFDekMsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsZ0NBQWdDLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQyxDQUFDO0lBQzdGLENBQUM7SUFFUyxLQUFLLENBQUMsdUJBQXVC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