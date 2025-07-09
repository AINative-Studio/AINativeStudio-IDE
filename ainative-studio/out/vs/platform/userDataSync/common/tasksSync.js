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
import { VSBuffer } from '../../../base/common/buffer.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { IEnvironmentService } from '../../environment/common/environment.js';
import { IFileService } from '../../files/common/files.js';
import { IStorageService } from '../../storage/common/storage.js';
import { ITelemetryService } from '../../telemetry/common/telemetry.js';
import { IUriIdentityService } from '../../uriIdentity/common/uriIdentity.js';
import { IUserDataProfilesService } from '../../userDataProfile/common/userDataProfile.js';
import { AbstractFileSynchroniser, AbstractInitializer } from './abstractSynchronizer.js';
import { IUserDataSyncLocalStoreService, IUserDataSyncLogService, IUserDataSyncEnablementService, IUserDataSyncStoreService, USER_DATA_SYNC_SCHEME } from './userDataSync.js';
export function getTasksContentFromSyncContent(syncContent, logService) {
    try {
        const parsed = JSON.parse(syncContent);
        return parsed.tasks ?? null;
    }
    catch (e) {
        logService.error(e);
        return null;
    }
}
let TasksSynchroniser = class TasksSynchroniser extends AbstractFileSynchroniser {
    constructor(profile, collection, userDataSyncStoreService, userDataSyncLocalStoreService, logService, configurationService, userDataSyncEnablementService, fileService, environmentService, storageService, telemetryService, uriIdentityService) {
        super(profile.tasksResource, { syncResource: "tasks" /* SyncResource.Tasks */, profile }, collection, fileService, environmentService, storageService, userDataSyncStoreService, userDataSyncLocalStoreService, userDataSyncEnablementService, telemetryService, logService, configurationService, uriIdentityService);
        this.version = 1;
        this.previewResource = this.extUri.joinPath(this.syncPreviewFolder, 'tasks.json');
        this.baseResource = this.previewResource.with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'base' });
        this.localResource = this.previewResource.with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'local' });
        this.remoteResource = this.previewResource.with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'remote' });
        this.acceptedResource = this.previewResource.with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'accepted' });
    }
    async generateSyncPreview(remoteUserData, lastSyncUserData, isRemoteDataFromCurrentMachine, userDataSyncConfiguration) {
        const remoteContent = remoteUserData.syncData ? getTasksContentFromSyncContent(remoteUserData.syncData.content, this.logService) : null;
        // Use remote data as last sync data if last sync data does not exist and remote data is from same machine
        lastSyncUserData = lastSyncUserData === null && isRemoteDataFromCurrentMachine ? remoteUserData : lastSyncUserData;
        const lastSyncContent = lastSyncUserData?.syncData ? getTasksContentFromSyncContent(lastSyncUserData.syncData.content, this.logService) : null;
        // Get file content last to get the latest
        const fileContent = await this.getLocalFileContent();
        let content = null;
        let hasLocalChanged = false;
        let hasRemoteChanged = false;
        let hasConflicts = false;
        if (remoteUserData.syncData) {
            const localContent = fileContent ? fileContent.value.toString() : null;
            if (!lastSyncContent // First time sync
                || lastSyncContent !== localContent // Local has forwarded
                || lastSyncContent !== remoteContent // Remote has forwarded
            ) {
                this.logService.trace(`${this.syncResourceLogLabel}: Merging remote tasks with local tasks...`);
                const result = merge(localContent, remoteContent, lastSyncContent);
                content = result.content;
                hasConflicts = result.hasConflicts;
                hasLocalChanged = result.hasLocalChanged;
                hasRemoteChanged = result.hasRemoteChanged;
            }
        }
        // First time syncing to remote
        else if (fileContent) {
            this.logService.trace(`${this.syncResourceLogLabel}: Remote tasks does not exist. Synchronizing tasks for the first time.`);
            content = fileContent.value.toString();
            hasRemoteChanged = true;
        }
        const previewResult = {
            content: hasConflicts ? lastSyncContent : content,
            localChange: hasLocalChanged ? fileContent ? 2 /* Change.Modified */ : 1 /* Change.Added */ : 0 /* Change.None */,
            remoteChange: hasRemoteChanged ? 2 /* Change.Modified */ : 0 /* Change.None */,
            hasConflicts
        };
        const localContent = fileContent ? fileContent.value.toString() : null;
        return [{
                fileContent,
                baseResource: this.baseResource,
                baseContent: lastSyncContent,
                localResource: this.localResource,
                localContent,
                localChange: previewResult.localChange,
                remoteResource: this.remoteResource,
                remoteContent,
                remoteChange: previewResult.remoteChange,
                previewResource: this.previewResource,
                previewResult,
                acceptedResource: this.acceptedResource,
            }];
    }
    async hasRemoteChanged(lastSyncUserData) {
        const lastSyncContent = lastSyncUserData?.syncData ? getTasksContentFromSyncContent(lastSyncUserData.syncData.content, this.logService) : null;
        if (lastSyncContent === null) {
            return true;
        }
        const fileContent = await this.getLocalFileContent();
        const localContent = fileContent ? fileContent.value.toString() : null;
        const result = merge(localContent, lastSyncContent, lastSyncContent);
        return result.hasLocalChanged || result.hasRemoteChanged;
    }
    async getMergeResult(resourcePreview, token) {
        return resourcePreview.previewResult;
    }
    async getAcceptResult(resourcePreview, resource, content, token) {
        /* Accept local resource */
        if (this.extUri.isEqual(resource, this.localResource)) {
            return {
                content: resourcePreview.fileContent ? resourcePreview.fileContent.value.toString() : null,
                localChange: 0 /* Change.None */,
                remoteChange: 2 /* Change.Modified */,
            };
        }
        /* Accept remote resource */
        if (this.extUri.isEqual(resource, this.remoteResource)) {
            return {
                content: resourcePreview.remoteContent,
                localChange: 2 /* Change.Modified */,
                remoteChange: 0 /* Change.None */,
            };
        }
        /* Accept preview resource */
        if (this.extUri.isEqual(resource, this.previewResource)) {
            if (content === undefined) {
                return {
                    content: resourcePreview.previewResult.content,
                    localChange: resourcePreview.previewResult.localChange,
                    remoteChange: resourcePreview.previewResult.remoteChange,
                };
            }
            else {
                return {
                    content,
                    localChange: 2 /* Change.Modified */,
                    remoteChange: 2 /* Change.Modified */,
                };
            }
        }
        throw new Error(`Invalid Resource: ${resource.toString()}`);
    }
    async applyResult(remoteUserData, lastSyncUserData, resourcePreviews, force) {
        const { fileContent } = resourcePreviews[0][0];
        const { content, localChange, remoteChange } = resourcePreviews[0][1];
        if (localChange === 0 /* Change.None */ && remoteChange === 0 /* Change.None */) {
            this.logService.info(`${this.syncResourceLogLabel}: No changes found during synchronizing tasks.`);
        }
        if (localChange !== 0 /* Change.None */) {
            this.logService.trace(`${this.syncResourceLogLabel}: Updating local tasks...`);
            if (fileContent) {
                await this.backupLocal(JSON.stringify(this.toTasksSyncContent(fileContent.value.toString())));
            }
            if (content) {
                await this.updateLocalFileContent(content, fileContent, force);
            }
            else {
                await this.deleteLocalFile();
            }
            this.logService.info(`${this.syncResourceLogLabel}: Updated local tasks`);
        }
        if (remoteChange !== 0 /* Change.None */) {
            this.logService.trace(`${this.syncResourceLogLabel}: Updating remote tasks...`);
            const remoteContents = JSON.stringify(this.toTasksSyncContent(content));
            remoteUserData = await this.updateRemoteUserData(remoteContents, force ? null : remoteUserData.ref);
            this.logService.info(`${this.syncResourceLogLabel}: Updated remote tasks`);
        }
        // Delete the preview
        try {
            await this.fileService.del(this.previewResource);
        }
        catch (e) { /* ignore */ }
        if (lastSyncUserData?.ref !== remoteUserData.ref) {
            this.logService.trace(`${this.syncResourceLogLabel}: Updating last synchronized tasks...`);
            await this.updateLastSyncUserData(remoteUserData);
            this.logService.info(`${this.syncResourceLogLabel}: Updated last synchronized tasks`);
        }
    }
    async hasLocalData() {
        return this.fileService.exists(this.file);
    }
    async resolveContent(uri) {
        if (this.extUri.isEqual(this.remoteResource, uri)
            || this.extUri.isEqual(this.baseResource, uri)
            || this.extUri.isEqual(this.localResource, uri)
            || this.extUri.isEqual(this.acceptedResource, uri)) {
            return this.resolvePreviewContent(uri);
        }
        return null;
    }
    toTasksSyncContent(tasks) {
        return tasks ? { tasks } : {};
    }
};
TasksSynchroniser = __decorate([
    __param(2, IUserDataSyncStoreService),
    __param(3, IUserDataSyncLocalStoreService),
    __param(4, IUserDataSyncLogService),
    __param(5, IConfigurationService),
    __param(6, IUserDataSyncEnablementService),
    __param(7, IFileService),
    __param(8, IEnvironmentService),
    __param(9, IStorageService),
    __param(10, ITelemetryService),
    __param(11, IUriIdentityService)
], TasksSynchroniser);
export { TasksSynchroniser };
let TasksInitializer = class TasksInitializer extends AbstractInitializer {
    constructor(fileService, userDataProfilesService, environmentService, logService, storageService, uriIdentityService) {
        super("tasks" /* SyncResource.Tasks */, userDataProfilesService, environmentService, logService, fileService, storageService, uriIdentityService);
        this.tasksResource = this.userDataProfilesService.defaultProfile.tasksResource;
    }
    async doInitialize(remoteUserData) {
        const tasksContent = remoteUserData.syncData ? getTasksContentFromSyncContent(remoteUserData.syncData.content, this.logService) : null;
        if (!tasksContent) {
            this.logService.info('Skipping initializing tasks because remote tasks does not exist.');
            return;
        }
        const isEmpty = await this.isEmpty();
        if (!isEmpty) {
            this.logService.info('Skipping initializing tasks because local tasks exist.');
            return;
        }
        await this.fileService.writeFile(this.tasksResource, VSBuffer.fromString(tasksContent));
        await this.updateLastSyncUserData(remoteUserData);
    }
    async isEmpty() {
        return this.fileService.exists(this.tasksResource);
    }
};
TasksInitializer = __decorate([
    __param(0, IFileService),
    __param(1, IUserDataProfilesService),
    __param(2, IEnvironmentService),
    __param(3, IUserDataSyncLogService),
    __param(4, IStorageService),
    __param(5, IUriIdentityService)
], TasksInitializer);
export { TasksInitializer };
function merge(originalLocalContent, originalRemoteContent, baseContent) {
    /* no changes */
    if (originalLocalContent === null && originalRemoteContent === null && baseContent === null) {
        return { content: null, hasLocalChanged: false, hasRemoteChanged: false, hasConflicts: false };
    }
    /* no changes */
    if (originalLocalContent === originalRemoteContent) {
        return { content: null, hasLocalChanged: false, hasRemoteChanged: false, hasConflicts: false };
    }
    const localForwarded = baseContent !== originalLocalContent;
    const remoteForwarded = baseContent !== originalRemoteContent;
    /* no changes */
    if (!localForwarded && !remoteForwarded) {
        return { content: null, hasLocalChanged: false, hasRemoteChanged: false, hasConflicts: false };
    }
    /* local has changed and remote has not */
    if (localForwarded && !remoteForwarded) {
        return { content: originalLocalContent, hasRemoteChanged: true, hasLocalChanged: false, hasConflicts: false };
    }
    /* remote has changed and local has not */
    if (remoteForwarded && !localForwarded) {
        return { content: originalRemoteContent, hasLocalChanged: true, hasRemoteChanged: false, hasConflicts: false };
    }
    return { content: originalLocalContent, hasLocalChanged: true, hasRemoteChanged: true, hasConflicts: true };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFza3NTeW5jLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3VzZXJEYXRhU3luYy9jb21tb24vdGFza3NTeW5jLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUcxRCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUNwRixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUM5RSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFFM0QsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzlFLE9BQU8sRUFBb0Isd0JBQXdCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUM3RyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsbUJBQW1CLEVBQXFELE1BQU0sMkJBQTJCLENBQUM7QUFDN0ksT0FBTyxFQUEyQiw4QkFBOEIsRUFBcUQsdUJBQXVCLEVBQUUsOEJBQThCLEVBQUUseUJBQXlCLEVBQWdCLHFCQUFxQixFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFVeFEsTUFBTSxVQUFVLDhCQUE4QixDQUFDLFdBQW1CLEVBQUUsVUFBdUI7SUFDMUYsSUFBSSxDQUFDO1FBQ0osTUFBTSxNQUFNLEdBQXNCLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDMUQsT0FBTyxNQUFNLENBQUMsS0FBSyxJQUFJLElBQUksQ0FBQztJQUM3QixDQUFDO0lB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