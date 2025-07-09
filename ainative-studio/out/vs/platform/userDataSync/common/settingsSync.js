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
import { distinct } from '../../../base/common/arrays.js';
import { VSBuffer } from '../../../base/common/buffer.js';
import { Event } from '../../../base/common/event.js';
import { localize } from '../../../nls.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { ConfigurationModelParser } from '../../configuration/common/configurationModels.js';
import { IEnvironmentService } from '../../environment/common/environment.js';
import { IExtensionManagementService } from '../../extensionManagement/common/extensionManagement.js';
import { IFileService } from '../../files/common/files.js';
import { IStorageService } from '../../storage/common/storage.js';
import { ITelemetryService } from '../../telemetry/common/telemetry.js';
import { IUriIdentityService } from '../../uriIdentity/common/uriIdentity.js';
import { IUserDataProfilesService } from '../../userDataProfile/common/userDataProfile.js';
import { AbstractInitializer, AbstractJsonFileSynchroniser } from './abstractSynchronizer.js';
import { getIgnoredSettings, isEmpty, merge, updateIgnoredSettings } from './settingsMerge.js';
import { IUserDataSyncLocalStoreService, IUserDataSyncLogService, IUserDataSyncEnablementService, IUserDataSyncStoreService, IUserDataSyncUtilService, UserDataSyncError, USER_DATA_SYNC_CONFIGURATION_SCOPE, USER_DATA_SYNC_SCHEME, getIgnoredSettingsForExtension } from './userDataSync.js';
function isSettingsSyncContent(thing) {
    return thing
        && (thing.settings && typeof thing.settings === 'string')
        && Object.keys(thing).length === 1;
}
export function parseSettingsSyncContent(syncContent) {
    const parsed = JSON.parse(syncContent);
    return isSettingsSyncContent(parsed) ? parsed : /* migrate */ { settings: syncContent };
}
let SettingsSynchroniser = class SettingsSynchroniser extends AbstractJsonFileSynchroniser {
    constructor(profile, collection, fileService, environmentService, storageService, userDataSyncStoreService, userDataSyncLocalStoreService, logService, userDataSyncUtilService, configurationService, userDataSyncEnablementService, telemetryService, extensionManagementService, uriIdentityService) {
        super(profile.settingsResource, { syncResource: "settings" /* SyncResource.Settings */, profile }, collection, fileService, environmentService, storageService, userDataSyncStoreService, userDataSyncLocalStoreService, userDataSyncEnablementService, telemetryService, logService, userDataSyncUtilService, configurationService, uriIdentityService);
        this.profile = profile;
        this.extensionManagementService = extensionManagementService;
        /* Version 2: Change settings from `sync.${setting}` to `settingsSync.{setting}` */
        this.version = 2;
        this.previewResource = this.extUri.joinPath(this.syncPreviewFolder, 'settings.json');
        this.baseResource = this.previewResource.with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'base' });
        this.localResource = this.previewResource.with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'local' });
        this.remoteResource = this.previewResource.with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'remote' });
        this.acceptedResource = this.previewResource.with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'accepted' });
        this.coreIgnoredSettings = undefined;
        this.systemExtensionsIgnoredSettings = undefined;
        this.userExtensionsIgnoredSettings = undefined;
    }
    async getRemoteUserDataSyncConfiguration(manifest) {
        const lastSyncUserData = await this.getLastSyncUserData();
        const remoteUserData = await this.getLatestRemoteUserData(manifest, lastSyncUserData);
        const remoteSettingsSyncContent = this.getSettingsSyncContent(remoteUserData);
        const parser = new ConfigurationModelParser(USER_DATA_SYNC_CONFIGURATION_SCOPE, this.logService);
        if (remoteSettingsSyncContent?.settings) {
            parser.parse(remoteSettingsSyncContent.settings);
        }
        return parser.configurationModel.getValue(USER_DATA_SYNC_CONFIGURATION_SCOPE) || {};
    }
    async generateSyncPreview(remoteUserData, lastSyncUserData, isRemoteDataFromCurrentMachine) {
        const fileContent = await this.getLocalFileContent();
        const formattingOptions = await this.getFormattingOptions();
        const remoteSettingsSyncContent = this.getSettingsSyncContent(remoteUserData);
        // Use remote data as last sync data if last sync data does not exist and remote data is from same machine
        lastSyncUserData = lastSyncUserData === null && isRemoteDataFromCurrentMachine ? remoteUserData : lastSyncUserData;
        const lastSettingsSyncContent = lastSyncUserData ? this.getSettingsSyncContent(lastSyncUserData) : null;
        const ignoredSettings = await this.getIgnoredSettings();
        let mergedContent = null;
        let hasLocalChanged = false;
        let hasRemoteChanged = false;
        let hasConflicts = false;
        if (remoteSettingsSyncContent) {
            let localContent = fileContent ? fileContent.value.toString().trim() : '{}';
            localContent = localContent || '{}';
            this.validateContent(localContent);
            this.logService.trace(`${this.syncResourceLogLabel}: Merging remote settings with local settings...`);
            const result = merge(localContent, remoteSettingsSyncContent.settings, lastSettingsSyncContent ? lastSettingsSyncContent.settings : null, ignoredSettings, [], formattingOptions);
            mergedContent = result.localContent || result.remoteContent;
            hasLocalChanged = result.localContent !== null;
            hasRemoteChanged = result.remoteContent !== null;
            hasConflicts = result.hasConflicts;
        }
        // First time syncing to remote
        else if (fileContent) {
            this.logService.trace(`${this.syncResourceLogLabel}: Remote settings does not exist. Synchronizing settings for the first time.`);
            mergedContent = fileContent.value.toString().trim() || '{}';
            this.validateContent(mergedContent);
            hasRemoteChanged = true;
        }
        const localContent = fileContent ? fileContent.value.toString() : null;
        const baseContent = lastSettingsSyncContent?.settings ?? null;
        const previewResult = {
            content: hasConflicts ? baseContent : mergedContent,
            localChange: hasLocalChanged ? 2 /* Change.Modified */ : 0 /* Change.None */,
            remoteChange: hasRemoteChanged ? 2 /* Change.Modified */ : 0 /* Change.None */,
            hasConflicts
        };
        return [{
                fileContent,
                baseResource: this.baseResource,
                baseContent,
                localResource: this.localResource,
                localContent,
                localChange: previewResult.localChange,
                remoteResource: this.remoteResource,
                remoteContent: remoteSettingsSyncContent ? remoteSettingsSyncContent.settings : null,
                remoteChange: previewResult.remoteChange,
                previewResource: this.previewResource,
                previewResult,
                acceptedResource: this.acceptedResource,
            }];
    }
    async hasRemoteChanged(lastSyncUserData) {
        const lastSettingsSyncContent = this.getSettingsSyncContent(lastSyncUserData);
        if (lastSettingsSyncContent === null) {
            return true;
        }
        const fileContent = await this.getLocalFileContent();
        const localContent = fileContent ? fileContent.value.toString().trim() : '';
        const ignoredSettings = await this.getIgnoredSettings();
        const formattingOptions = await this.getFormattingOptions();
        const result = merge(localContent || '{}', lastSettingsSyncContent.settings, lastSettingsSyncContent.settings, ignoredSettings, [], formattingOptions);
        return result.remoteContent !== null;
    }
    async getMergeResult(resourcePreview, token) {
        const formatUtils = await this.getFormattingOptions();
        const ignoredSettings = await this.getIgnoredSettings();
        return {
            ...resourcePreview.previewResult,
            // remove ignored settings from the preview content
            content: resourcePreview.previewResult.content ? updateIgnoredSettings(resourcePreview.previewResult.content, '{}', ignoredSettings, formatUtils) : null
        };
    }
    async getAcceptResult(resourcePreview, resource, content, token) {
        const formattingOptions = await this.getFormattingOptions();
        const ignoredSettings = await this.getIgnoredSettings();
        /* Accept local resource */
        if (this.extUri.isEqual(resource, this.localResource)) {
            return {
                /* Remove ignored settings */
                content: resourcePreview.fileContent ? updateIgnoredSettings(resourcePreview.fileContent.value.toString(), '{}', ignoredSettings, formattingOptions) : null,
                localChange: 0 /* Change.None */,
                remoteChange: 2 /* Change.Modified */,
            };
        }
        /* Accept remote resource */
        if (this.extUri.isEqual(resource, this.remoteResource)) {
            return {
                /* Update ignored settings from local file content */
                content: resourcePreview.remoteContent !== null ? updateIgnoredSettings(resourcePreview.remoteContent, resourcePreview.fileContent ? resourcePreview.fileContent.value.toString() : '{}', ignoredSettings, formattingOptions) : null,
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
                    /* Add ignored settings from local file content */
                    content: content !== null ? updateIgnoredSettings(content, resourcePreview.fileContent ? resourcePreview.fileContent.value.toString() : '{}', ignoredSettings, formattingOptions) : null,
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
            this.logService.info(`${this.syncResourceLogLabel}: No changes found during synchronizing settings.`);
        }
        content = content ? content.trim() : '{}';
        content = content || '{}';
        this.validateContent(content);
        if (localChange !== 0 /* Change.None */) {
            this.logService.trace(`${this.syncResourceLogLabel}: Updating local settings...`);
            if (fileContent) {
                await this.backupLocal(JSON.stringify(this.toSettingsSyncContent(fileContent.value.toString())));
            }
            await this.updateLocalFileContent(content, fileContent, force);
            await this.configurationService.reloadConfiguration(3 /* ConfigurationTarget.USER_LOCAL */);
            this.logService.info(`${this.syncResourceLogLabel}: Updated local settings`);
        }
        if (remoteChange !== 0 /* Change.None */) {
            const formatUtils = await this.getFormattingOptions();
            // Update ignored settings from remote
            const remoteSettingsSyncContent = this.getSettingsSyncContent(remoteUserData);
            const ignoredSettings = await this.getIgnoredSettings(content);
            content = updateIgnoredSettings(content, remoteSettingsSyncContent ? remoteSettingsSyncContent.settings : '{}', ignoredSettings, formatUtils);
            this.logService.trace(`${this.syncResourceLogLabel}: Updating remote settings...`);
            remoteUserData = await this.updateRemoteUserData(JSON.stringify(this.toSettingsSyncContent(content)), force ? null : remoteUserData.ref);
            this.logService.info(`${this.syncResourceLogLabel}: Updated remote settings`);
        }
        // Delete the preview
        try {
            await this.fileService.del(this.previewResource);
        }
        catch (e) { /* ignore */ }
        if (lastSyncUserData?.ref !== remoteUserData.ref) {
            this.logService.trace(`${this.syncResourceLogLabel}: Updating last synchronized settings...`);
            await this.updateLastSyncUserData(remoteUserData);
            this.logService.info(`${this.syncResourceLogLabel}: Updated last synchronized settings`);
        }
    }
    async hasLocalData() {
        try {
            const localFileContent = await this.getLocalFileContent();
            if (localFileContent) {
                return !isEmpty(localFileContent.value.toString());
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
            || this.extUri.isEqual(this.localResource, uri)
            || this.extUri.isEqual(this.acceptedResource, uri)
            || this.extUri.isEqual(this.baseResource, uri)) {
            return this.resolvePreviewContent(uri);
        }
        return null;
    }
    async resolvePreviewContent(resource) {
        let content = await super.resolvePreviewContent(resource);
        if (content) {
            const formatUtils = await this.getFormattingOptions();
            // remove ignored settings from the preview content
            const ignoredSettings = await this.getIgnoredSettings();
            content = updateIgnoredSettings(content, '{}', ignoredSettings, formatUtils);
        }
        return content;
    }
    getSettingsSyncContent(remoteUserData) {
        return remoteUserData.syncData ? this.parseSettingsSyncContent(remoteUserData.syncData.content) : null;
    }
    parseSettingsSyncContent(syncContent) {
        try {
            return parseSettingsSyncContent(syncContent);
        }
        catch (e) {
            this.logService.error(e);
        }
        return null;
    }
    toSettingsSyncContent(settings) {
        return { settings };
    }
    async getIgnoredSettings(content) {
        if (!this.coreIgnoredSettings) {
            this.coreIgnoredSettings = this.userDataSyncUtilService.resolveDefaultCoreIgnoredSettings();
        }
        if (!this.systemExtensionsIgnoredSettings) {
            this.systemExtensionsIgnoredSettings = this.getIgnoredSettingForSystemExtensions();
        }
        if (!this.userExtensionsIgnoredSettings) {
            this.userExtensionsIgnoredSettings = this.getIgnoredSettingForUserExtensions();
            const disposable = this._register(Event.any(Event.filter(this.extensionManagementService.onDidInstallExtensions, (e => e.some(({ local }) => !!local))), Event.filter(this.extensionManagementService.onDidUninstallExtension, (e => !e.error)))(() => {
                disposable.dispose();
                this.userExtensionsIgnoredSettings = undefined;
            }));
        }
        const defaultIgnoredSettings = (await Promise.all([this.coreIgnoredSettings, this.systemExtensionsIgnoredSettings, this.userExtensionsIgnoredSettings])).flat();
        return getIgnoredSettings(defaultIgnoredSettings, this.configurationService, content);
    }
    async getIgnoredSettingForSystemExtensions() {
        const systemExtensions = await this.extensionManagementService.getInstalled(0 /* ExtensionType.System */);
        return distinct(systemExtensions.map(e => getIgnoredSettingsForExtension(e.manifest)).flat());
    }
    async getIgnoredSettingForUserExtensions() {
        const userExtensions = await this.extensionManagementService.getInstalled(1 /* ExtensionType.User */, this.profile.extensionsResource);
        return distinct(userExtensions.map(e => getIgnoredSettingsForExtension(e.manifest)).flat());
    }
    validateContent(content) {
        if (this.hasErrors(content, false)) {
            throw new UserDataSyncError(localize('errorInvalidSettings', "Unable to sync settings as there are errors/warning in settings file."), "LocalInvalidContent" /* UserDataSyncErrorCode.LocalInvalidContent */, this.resource);
        }
    }
};
SettingsSynchroniser = __decorate([
    __param(2, IFileService),
    __param(3, IEnvironmentService),
    __param(4, IStorageService),
    __param(5, IUserDataSyncStoreService),
    __param(6, IUserDataSyncLocalStoreService),
    __param(7, IUserDataSyncLogService),
    __param(8, IUserDataSyncUtilService),
    __param(9, IConfigurationService),
    __param(10, IUserDataSyncEnablementService),
    __param(11, ITelemetryService),
    __param(12, IExtensionManagementService),
    __param(13, IUriIdentityService)
], SettingsSynchroniser);
export { SettingsSynchroniser };
let SettingsInitializer = class SettingsInitializer extends AbstractInitializer {
    constructor(fileService, userDataProfilesService, environmentService, logService, storageService, uriIdentityService) {
        super("settings" /* SyncResource.Settings */, userDataProfilesService, environmentService, logService, fileService, storageService, uriIdentityService);
    }
    async doInitialize(remoteUserData) {
        const settingsSyncContent = remoteUserData.syncData ? this.parseSettingsSyncContent(remoteUserData.syncData.content) : null;
        if (!settingsSyncContent) {
            this.logService.info('Skipping initializing settings because remote settings does not exist.');
            return;
        }
        const isEmpty = await this.isEmpty();
        if (!isEmpty) {
            this.logService.info('Skipping initializing settings because local settings exist.');
            return;
        }
        await this.fileService.writeFile(this.userDataProfilesService.defaultProfile.settingsResource, VSBuffer.fromString(settingsSyncContent.settings));
        await this.updateLastSyncUserData(remoteUserData);
    }
    async isEmpty() {
        try {
            const fileContent = await this.fileService.readFile(this.userDataProfilesService.defaultProfile.settingsResource);
            return isEmpty(fileContent.value.toString().trim());
        }
        catch (error) {
            return error.fileOperationResult === 1 /* FileOperationResult.FILE_NOT_FOUND */;
        }
    }
    parseSettingsSyncContent(syncContent) {
        try {
            return parseSettingsSyncContent(syncContent);
        }
        catch (e) {
            this.logService.error(e);
        }
        return null;
    }
};
SettingsInitializer = __decorate([
    __param(0, IFileService),
    __param(1, IUserDataProfilesService),
    __param(2, IEnvironmentService),
    __param(3, IUserDataSyncLogService),
    __param(4, IStorageService),
    __param(5, IUriIdentityService)
], SettingsInitializer);
export { SettingsInitializer };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2V0dGluZ3NTeW5jLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3VzZXJEYXRhU3luYy9jb21tb24vc2V0dGluZ3NTeW5jLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUMxRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFFMUQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBRXRELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUMzQyxPQUFPLEVBQXVCLHFCQUFxQixFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDekcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDN0YsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDOUUsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFFdEcsT0FBTyxFQUEyQyxZQUFZLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUNwRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDbEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDeEUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDOUUsT0FBTyxFQUFvQix3QkFBd0IsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQzdHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSw0QkFBNEIsRUFBcUQsTUFBTSwyQkFBMkIsQ0FBQztBQUNqSixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsT0FBTyxFQUFFLEtB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