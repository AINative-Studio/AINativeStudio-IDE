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
import { isNonEmptyArray } from '../../../base/common/arrays.js';
import { VSBuffer } from '../../../base/common/buffer.js';
import { Event } from '../../../base/common/event.js';
import { parse } from '../../../base/common/json.js';
import { OS } from '../../../base/common/platform.js';
import { isUndefined } from '../../../base/common/types.js';
import { localize } from '../../../nls.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { IEnvironmentService } from '../../environment/common/environment.js';
import { IFileService } from '../../files/common/files.js';
import { IStorageService } from '../../storage/common/storage.js';
import { ITelemetryService } from '../../telemetry/common/telemetry.js';
import { IUriIdentityService } from '../../uriIdentity/common/uriIdentity.js';
import { IUserDataProfilesService } from '../../userDataProfile/common/userDataProfile.js';
import { AbstractInitializer, AbstractJsonFileSynchroniser } from './abstractSynchronizer.js';
import { merge } from './keybindingsMerge.js';
import { IUserDataSyncLocalStoreService, IUserDataSyncLogService, IUserDataSyncEnablementService, IUserDataSyncStoreService, IUserDataSyncUtilService, UserDataSyncError, USER_DATA_SYNC_SCHEME, CONFIG_SYNC_KEYBINDINGS_PER_PLATFORM } from './userDataSync.js';
export function getKeybindingsContentFromSyncContent(syncContent, platformSpecific, logService) {
    try {
        const parsed = JSON.parse(syncContent);
        if (!platformSpecific) {
            return isUndefined(parsed.all) ? null : parsed.all;
        }
        switch (OS) {
            case 2 /* OperatingSystem.Macintosh */:
                return isUndefined(parsed.mac) ? null : parsed.mac;
            case 3 /* OperatingSystem.Linux */:
                return isUndefined(parsed.linux) ? null : parsed.linux;
            case 1 /* OperatingSystem.Windows */:
                return isUndefined(parsed.windows) ? null : parsed.windows;
        }
    }
    catch (e) {
        logService.error(e);
        return null;
    }
}
let KeybindingsSynchroniser = class KeybindingsSynchroniser extends AbstractJsonFileSynchroniser {
    constructor(profile, collection, userDataSyncStoreService, userDataSyncLocalStoreService, logService, configurationService, userDataSyncEnablementService, fileService, environmentService, storageService, userDataSyncUtilService, telemetryService, uriIdentityService) {
        super(profile.keybindingsResource, { syncResource: "keybindings" /* SyncResource.Keybindings */, profile }, collection, fileService, environmentService, storageService, userDataSyncStoreService, userDataSyncLocalStoreService, userDataSyncEnablementService, telemetryService, logService, userDataSyncUtilService, configurationService, uriIdentityService);
        /* Version 2: Change settings from `sync.${setting}` to `settingsSync.{setting}` */
        this.version = 2;
        this.previewResource = this.extUri.joinPath(this.syncPreviewFolder, 'keybindings.json');
        this.baseResource = this.previewResource.with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'base' });
        this.localResource = this.previewResource.with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'local' });
        this.remoteResource = this.previewResource.with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'remote' });
        this.acceptedResource = this.previewResource.with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'accepted' });
        this._register(Event.filter(configurationService.onDidChangeConfiguration, e => e.affectsConfiguration('settingsSync.keybindingsPerPlatform'))(() => this.triggerLocalChange()));
    }
    async generateSyncPreview(remoteUserData, lastSyncUserData, isRemoteDataFromCurrentMachine, userDataSyncConfiguration) {
        const remoteContent = remoteUserData.syncData ? getKeybindingsContentFromSyncContent(remoteUserData.syncData.content, userDataSyncConfiguration.keybindingsPerPlatform ?? this.syncKeybindingsPerPlatform(), this.logService) : null;
        // Use remote data as last sync data if last sync data does not exist and remote data is from same machine
        lastSyncUserData = lastSyncUserData === null && isRemoteDataFromCurrentMachine ? remoteUserData : lastSyncUserData;
        const lastSyncContent = lastSyncUserData ? this.getKeybindingsContentFromLastSyncUserData(lastSyncUserData) : null;
        // Get file content last to get the latest
        const fileContent = await this.getLocalFileContent();
        const formattingOptions = await this.getFormattingOptions();
        let mergedContent = null;
        let hasLocalChanged = false;
        let hasRemoteChanged = false;
        let hasConflicts = false;
        if (remoteContent) {
            let localContent = fileContent ? fileContent.value.toString() : '[]';
            localContent = localContent || '[]';
            if (this.hasErrors(localContent, true)) {
                throw new UserDataSyncError(localize('errorInvalidSettings', "Unable to sync keybindings because the content in the file is not valid. Please open the file and correct it."), "LocalInvalidContent" /* UserDataSyncErrorCode.LocalInvalidContent */, this.resource);
            }
            if (!lastSyncContent // First time sync
                || lastSyncContent !== localContent // Local has forwarded
                || lastSyncContent !== remoteContent // Remote has forwarded
            ) {
                this.logService.trace(`${this.syncResourceLogLabel}: Merging remote keybindings with local keybindings...`);
                const result = await merge(localContent, remoteContent, lastSyncContent, formattingOptions, this.userDataSyncUtilService);
                // Sync only if there are changes
                if (result.hasChanges) {
                    mergedContent = result.mergeContent;
                    hasConflicts = result.hasConflicts;
                    hasLocalChanged = hasConflicts || result.mergeContent !== localContent;
                    hasRemoteChanged = hasConflicts || result.mergeContent !== remoteContent;
                }
            }
        }
        // First time syncing to remote
        else if (fileContent) {
            this.logService.trace(`${this.syncResourceLogLabel}: Remote keybindings does not exist. Synchronizing keybindings for the first time.`);
            mergedContent = fileContent.value.toString();
            hasRemoteChanged = true;
        }
        const previewResult = {
            content: hasConflicts ? lastSyncContent : mergedContent,
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
        const lastSyncContent = this.getKeybindingsContentFromLastSyncUserData(lastSyncUserData);
        if (lastSyncContent === null) {
            return true;
        }
        const fileContent = await this.getLocalFileContent();
        const localContent = fileContent ? fileContent.value.toString() : '';
        const formattingOptions = await this.getFormattingOptions();
        const result = await merge(localContent || '[]', lastSyncContent, lastSyncContent, formattingOptions, this.userDataSyncUtilService);
        return result.hasConflicts || result.mergeContent !== lastSyncContent;
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
        let { content, localChange, remoteChange } = resourcePreviews[0][1];
        if (localChange === 0 /* Change.None */ && remoteChange === 0 /* Change.None */) {
            this.logService.info(`${this.syncResourceLogLabel}: No changes found during synchronizing keybindings.`);
        }
        if (content !== null) {
            content = content.trim();
            content = content || '[]';
            if (this.hasErrors(content, true)) {
                throw new UserDataSyncError(localize('errorInvalidSettings', "Unable to sync keybindings because the content in the file is not valid. Please open the file and correct it."), "LocalInvalidContent" /* UserDataSyncErrorCode.LocalInvalidContent */, this.resource);
            }
        }
        if (localChange !== 0 /* Change.None */) {
            this.logService.trace(`${this.syncResourceLogLabel}: Updating local keybindings...`);
            if (fileContent) {
                await this.backupLocal(this.toSyncContent(fileContent.value.toString()));
            }
            await this.updateLocalFileContent(content || '[]', fileContent, force);
            this.logService.info(`${this.syncResourceLogLabel}: Updated local keybindings`);
        }
        if (remoteChange !== 0 /* Change.None */) {
            this.logService.trace(`${this.syncResourceLogLabel}: Updating remote keybindings...`);
            const remoteContents = this.toSyncContent(content || '[]', remoteUserData.syncData?.content);
            remoteUserData = await this.updateRemoteUserData(remoteContents, force ? null : remoteUserData.ref);
            this.logService.info(`${this.syncResourceLogLabel}: Updated remote keybindings`);
        }
        // Delete the preview
        try {
            await this.fileService.del(this.previewResource);
        }
        catch (e) { /* ignore */ }
        if (lastSyncUserData?.ref !== remoteUserData.ref) {
            this.logService.trace(`${this.syncResourceLogLabel}: Updating last synchronized keybindings...`);
            await this.updateLastSyncUserData(remoteUserData, { platformSpecific: this.syncKeybindingsPerPlatform() });
            this.logService.info(`${this.syncResourceLogLabel}: Updated last synchronized keybindings`);
        }
    }
    async hasLocalData() {
        try {
            const localFileContent = await this.getLocalFileContent();
            if (localFileContent) {
                const keybindings = parse(localFileContent.value.toString());
                if (isNonEmptyArray(keybindings)) {
                    return true;
                }
            }
        }
        catch (error) {
            if (error.fileOperationResult !== 1 /* FileOperationResult.FILE_NOT_FOUND */) {
                return true;
            }
        }
        return false;
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
    getKeybindingsContentFromLastSyncUserData(lastSyncUserData) {
        if (!lastSyncUserData.syncData) {
            return null;
        }
        // Return null if there is a change in platform specific property from last time sync.
        if (lastSyncUserData.platformSpecific !== undefined && lastSyncUserData.platformSpecific !== this.syncKeybindingsPerPlatform()) {
            return null;
        }
        return getKeybindingsContentFromSyncContent(lastSyncUserData.syncData.content, this.syncKeybindingsPerPlatform(), this.logService);
    }
    toSyncContent(keybindingsContent, syncContent) {
        let parsed = {};
        try {
            parsed = JSON.parse(syncContent || '{}');
        }
        catch (e) {
            this.logService.error(e);
        }
        if (this.syncKeybindingsPerPlatform()) {
            delete parsed.all;
        }
        else {
            parsed.all = keybindingsContent;
        }
        switch (OS) {
            case 2 /* OperatingSystem.Macintosh */:
                parsed.mac = keybindingsContent;
                break;
            case 3 /* OperatingSystem.Linux */:
                parsed.linux = keybindingsContent;
                break;
            case 1 /* OperatingSystem.Windows */:
                parsed.windows = keybindingsContent;
                break;
        }
        return JSON.stringify(parsed);
    }
    syncKeybindingsPerPlatform() {
        return !!this.configurationService.getValue(CONFIG_SYNC_KEYBINDINGS_PER_PLATFORM);
    }
};
KeybindingsSynchroniser = __decorate([
    __param(2, IUserDataSyncStoreService),
    __param(3, IUserDataSyncLocalStoreService),
    __param(4, IUserDataSyncLogService),
    __param(5, IConfigurationService),
    __param(6, IUserDataSyncEnablementService),
    __param(7, IFileService),
    __param(8, IEnvironmentService),
    __param(9, IStorageService),
    __param(10, IUserDataSyncUtilService),
    __param(11, ITelemetryService),
    __param(12, IUriIdentityService)
], KeybindingsSynchroniser);
export { KeybindingsSynchroniser };
let KeybindingsInitializer = class KeybindingsInitializer extends AbstractInitializer {
    constructor(fileService, userDataProfilesService, environmentService, logService, storageService, uriIdentityService) {
        super("keybindings" /* SyncResource.Keybindings */, userDataProfilesService, environmentService, logService, fileService, storageService, uriIdentityService);
    }
    async doInitialize(remoteUserData) {
        const keybindingsContent = remoteUserData.syncData ? this.getKeybindingsContentFromSyncContent(remoteUserData.syncData.content) : null;
        if (!keybindingsContent) {
            this.logService.info('Skipping initializing keybindings because remote keybindings does not exist.');
            return;
        }
        const isEmpty = await this.isEmpty();
        if (!isEmpty) {
            this.logService.info('Skipping initializing keybindings because local keybindings exist.');
            return;
        }
        await this.fileService.writeFile(this.userDataProfilesService.defaultProfile.keybindingsResource, VSBuffer.fromString(keybindingsContent));
        await this.updateLastSyncUserData(remoteUserData);
    }
    async isEmpty() {
        try {
            const fileContent = await this.fileService.readFile(this.userDataProfilesService.defaultProfile.settingsResource);
            const keybindings = parse(fileContent.value.toString());
            return !isNonEmptyArray(keybindings);
        }
        catch (error) {
            return error.fileOperationResult === 1 /* FileOperationResult.FILE_NOT_FOUND */;
        }
    }
    getKeybindingsContentFromSyncContent(syncContent) {
        try {
            return getKeybindingsContentFromSyncContent(syncContent, true, this.logService);
        }
        catch (e) {
            this.logService.error(e);
            return null;
        }
    }
};
KeybindingsInitializer = __decorate([
    __param(0, IFileService),
    __param(1, IUserDataProfilesService),
    __param(2, IEnvironmentService),
    __param(3, IUserDataSyncLogService),
    __param(4, IStorageService),
    __param(5, IUriIdentityService)
], KeybindingsInitializer);
export { KeybindingsInitializer };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5YmluZGluZ3NTeW5jLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3VzZXJEYXRhU3luYy9jb21tb24va2V5YmluZGluZ3NTeW5jLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFFMUQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3RELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUNyRCxPQUFPLEVBQW1CLEVBQUUsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUU1RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDM0MsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDcEYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDOUUsT0FBTyxFQUEyQyxZQUFZLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUVwRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDbEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDeEUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDOUUsT0FBTyxFQUFvQix3QkFBd0IsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQzdHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSw0QkFBNEIsRUFBcUQsTUFBTSwyQkFBMkIs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