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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya3NwYWNlU3RhdGVTeW5jLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2VkaXRTZXNzaW9ucy9jb21tb24vd29ya3NwYWNlU3RhdGVTeW5jLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBcUIsdUJBQXVCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUVyRyxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUUxRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUM3RixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDMUUsT0FBTyxFQUFpQixlQUFlLEVBQStCLE1BQU0sZ0RBQWdELENBQUM7QUFDN0gsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDdkYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFFN0YsT0FBTyxFQUFFLG9CQUFvQixFQUF1RSxNQUFNLGtFQUFrRSxDQUFDO0FBRTdLLE9BQU8sRUFBZSwyQkFBMkIsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBQzdFLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLGlFQUFpRSxDQUFDO0FBRzVHLE1BQU0sc0JBQXNCO0lBRTNCLEtBQUssQ0FBQyxhQUFhO1FBQ2xCLE9BQU87SUFDUixDQUFDO0lBQ0QsS0FBSyxDQUFDLGtCQUFrQjtRQUN2QixPQUFPLEVBQUUsQ0FBQztJQUNY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