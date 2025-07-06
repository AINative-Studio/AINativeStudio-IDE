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
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { Emitter } from '../../../../base/common/event.js';
import { parse, stringify } from '../../../../base/common/marshalling.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IEnvironmentService } from '../../../../platform/environment/common/environment.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { AbstractSynchroniser } from '../../../../platform/userDataSync/common/abstractSynchronizer.js';
import { IEditSessionsStorageService } from './editSessions.js';
import { IWorkspaceIdentityService } from '../../../services/workspaces/common/workspaceIdentityService.js';
class NullBackupStoreService {
    async writeResource() {
        return;
    }
    async getAllResourceRefs() {
        return [];
    }
    async resolveResourceContent() {
        return null;
    }
}
class NullEnablementService {
    constructor() {
        this._onDidChangeEnablement = new Emitter();
        this.onDidChangeEnablement = this._onDidChangeEnablement.event;
        this._onDidChangeResourceEnablement = new Emitter();
        this.onDidChangeResourceEnablement = this._onDidChangeResourceEnablement.event;
    }
    isEnabled() { return true; }
    canToggleEnablement() { return true; }
    setEnablement(_enabled) { }
    isResourceEnabled(_resource) { return true; }
    isResourceEnablementConfigured(_resource) { return false; }
    setResourceEnablement(_resource, _enabled) { }
    getResourceSyncStateVersion(_resource) { return undefined; }
}
let WorkspaceStateSynchroniser = class WorkspaceStateSynchroniser extends AbstractSynchroniser {
    constructor(profile, collection, userDataSyncStoreService, logService, fileService, environmentService, telemetryService, configurationService, storageService, uriIdentityService, workspaceIdentityService, editSessionsStorageService) {
        const userDataSyncLocalStoreService = new NullBackupStoreService();
        const userDataSyncEnablementService = new NullEnablementService();
        super({ syncResource: "workspaceState" /* SyncResource.WorkspaceState */, profile }, collection, fileService, environmentService, storageService, userDataSyncStoreService, userDataSyncLocalStoreService, userDataSyncEnablementService, telemetryService, logService, configurationService, uriIdentityService);
        this.workspaceIdentityService = workspaceIdentityService;
        this.editSessionsStorageService = editSessionsStorageService;
        this.version = 1;
    }
    async sync() {
        const cancellationTokenSource = new CancellationTokenSource();
        const folders = await this.workspaceIdentityService.getWorkspaceStateFolders(cancellationTokenSource.token);
        if (!folders.length) {
            return null;
        }
        // Ensure we have latest state by sending out onWillSaveState event
        await this.storageService.flush();
        const keys = this.storageService.keys(1 /* StorageScope.WORKSPACE */, 0 /* StorageTarget.USER */);
        if (!keys.length) {
            return null;
        }
        const contributedData = {};
        keys.forEach((key) => {
            const data = this.storageService.get(key, 1 /* StorageScope.WORKSPACE */);
            if (data) {
                contributedData[key] = data;
            }
        });
        const content = { folders, storage: contributedData, version: this.version };
        await this.editSessionsStorageService.write('workspaceState', stringify(content));
        return null;
    }
    async apply() {
        const payload = this.editSessionsStorageService.lastReadResources.get('editSessions')?.content;
        const workspaceStateId = payload ? JSON.parse(payload).workspaceStateId : undefined;
        const resource = await this.editSessionsStorageService.read('workspaceState', workspaceStateId);
        if (!resource) {
            return null;
        }
        const remoteWorkspaceState = parse(resource.content);
        if (!remoteWorkspaceState) {
            this.logService.info('Skipping initializing workspace state because remote workspace state does not exist.');
            return null;
        }
        // Evaluate whether storage is applicable for current workspace
        const cancellationTokenSource = new CancellationTokenSource();
        const replaceUris = await this.workspaceIdentityService.matches(remoteWorkspaceState.folders, cancellationTokenSource.token);
        if (!replaceUris) {
            this.logService.info('Skipping initializing workspace state because remote workspace state does not match current workspace.');
            return null;
        }
        const storage = {};
        for (const key of Object.keys(remoteWorkspaceState.storage)) {
            storage[key] = remoteWorkspaceState.storage[key];
        }
        if (Object.keys(storage).length) {
            // Initialize storage with remote storage
            const storageEntries = [];
            for (const key of Object.keys(storage)) {
                // Deserialize the stored state
                try {
                    const value = parse(storage[key]);
                    // Run URI conversion on the stored state
                    replaceUris(value);
                    storageEntries.push({ key, value, scope: 1 /* StorageScope.WORKSPACE */, target: 0 /* StorageTarget.USER */ });
                }
                catch {
                    storageEntries.push({ key, value: storage[key], scope: 1 /* StorageScope.WORKSPACE */, target: 0 /* StorageTarget.USER */ });
                }
            }
            this.storageService.storeAll(storageEntries, true);
        }
        this.editSessionsStorageService.delete('workspaceState', resource.ref);
        return null;
    }
    // TODO@joyceerhl implement AbstractSynchronizer in full
    applyResult(remoteUserData, lastSyncUserData, result, force) {
        throw new Error('Method not implemented.');
    }
    async generateSyncPreview(remoteUserData, lastSyncUserData, isRemoteDataFromCurrentMachine, userDataSyncConfiguration, token) {
        return [];
    }
    getMergeResult(resourcePreview, token) {
        throw new Error('Method not implemented.');
    }
    getAcceptResult(resourcePreview, resource, content, token) {
        throw new Error('Method not implemented.');
    }
    async hasRemoteChanged(lastSyncUserData) {
        return true;
    }
    async hasLocalData() {
        return false;
    }
    async resolveContent(uri) {
        return null;
    }
};
WorkspaceStateSynchroniser = __decorate([
    __param(4, IFileService),
    __param(5, IEnvironmentService),
    __param(6, ITelemetryService),
    __param(7, IConfigurationService),
    __param(8, IStorageService),
    __param(9, IUriIdentityService),
    __param(10, IWorkspaceIdentityService),
    __param(11, IEditSessionsStorageService)
], WorkspaceStateSynchroniser);
export { WorkspaceStateSynchroniser };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya3NwYWNlU3RhdGVTeW5jLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9lZGl0U2Vzc2lvbnMvY29tbW9uL3dvcmtzcGFjZVN0YXRlU3luYy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQXFCLHVCQUF1QixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFFckcsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFFMUUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDN0YsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQzFFLE9BQU8sRUFBaUIsZUFBZSxFQUErQixNQUFNLGdEQUFnRCxDQUFDO0FBQzdILE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBRTdGLE9BQU8sRUFBRSxvQkFBb0IsRUFBdUUsTUFBTSxrRUFBa0UsQ0FBQztBQUU3SyxPQUFPLEVBQWUsMkJBQTJCLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUM3RSxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQztBQUc1RyxNQUFNLHNCQUFzQjtJQUUzQixLQUFLLENBQUMsYUFBYTtRQUNsQixPQUFPO0lBQ1IsQ0FBQztJQUNELEtBQUssQ0FBQyxrQkFBa0I7UUFDdkIsT0FBTyxFQUFFLENBQUM7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