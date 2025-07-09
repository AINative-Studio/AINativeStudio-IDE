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
import { VSBuffer } from '../../../../base/common/buffer.js';
import { Extensions } from '../../../../platform/configuration/common/configurationRegistry.js';
import { FileOperationError, IFileService } from '../../../../platform/files/common/files.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { IUserDataProfileService } from '../common/userDataProfile.js';
import { updateIgnoredSettings } from '../../../../platform/userDataSync/common/settingsMerge.js';
import { IUserDataSyncUtilService } from '../../../../platform/userDataSync/common/userDataSync.js';
import { TreeItemCollapsibleState } from '../../../common/views.js';
import { API_OPEN_EDITOR_COMMAND_ID } from '../../../browser/parts/editor/editorCommands.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { localize } from '../../../../nls.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
let SettingsResourceInitializer = class SettingsResourceInitializer {
    constructor(userDataProfileService, fileService, logService) {
        this.userDataProfileService = userDataProfileService;
        this.fileService = fileService;
        this.logService = logService;
    }
    async initialize(content) {
        const settingsContent = JSON.parse(content);
        if (settingsContent.settings === null) {
            this.logService.info(`Initializing Profile: No settings to apply...`);
            return;
        }
        await this.fileService.writeFile(this.userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString(settingsContent.settings));
    }
};
SettingsResourceInitializer = __decorate([
    __param(0, IUserDataProfileService),
    __param(1, IFileService),
    __param(2, ILogService)
], SettingsResourceInitializer);
export { SettingsResourceInitializer };
let SettingsResource = class SettingsResource {
    constructor(fileService, userDataSyncUtilService, logService) {
        this.fileService = fileService;
        this.userDataSyncUtilService = userDataSyncUtilService;
        this.logService = logService;
    }
    async getContent(profile) {
        const settingsContent = await this.getSettingsContent(profile);
        return JSON.stringify(settingsContent);
    }
    async getSettingsContent(profile) {
        const localContent = await this.getLocalFileContent(profile);
        if (localContent === null) {
            return { settings: null };
        }
        else {
            const ignoredSettings = this.getIgnoredSettings();
            const formattingOptions = await this.userDataSyncUtilService.resolveFormattingOptions(profile.settingsResource);
            const settings = updateIgnoredSettings(localContent || '{}', '{}', ignoredSettings, formattingOptions);
            return { settings };
        }
    }
    async apply(content, profile) {
        const settingsContent = JSON.parse(content);
        if (settingsContent.settings === null) {
            this.logService.info(`Importing Profile (${profile.name}): No settings to apply...`);
            return;
        }
        const localSettingsContent = await this.getLocalFileContent(profile);
        const formattingOptions = await this.userDataSyncUtilService.resolveFormattingOptions(profile.settingsResource);
        const contentToUpdate = updateIgnoredSettings(settingsContent.settings, localSettingsContent || '{}', this.getIgnoredSettings(), formattingOptions);
        await this.fileService.writeFile(profile.settingsResource, VSBuffer.fromString(contentToUpdate));
    }
    getIgnoredSettings() {
        const allSettings = Registry.as(Extensions.Configuration).getConfigurationProperties();
        const ignoredSettings = Object.keys(allSettings).filter(key => allSettings[key]?.scope === 2 /* ConfigurationScope.MACHINE */ || allSettings[key]?.scope === 3 /* ConfigurationScope.APPLICATION_MACHINE */ || allSettings[key]?.scope === 7 /* ConfigurationScope.MACHINE_OVERRIDABLE */);
        return ignoredSettings;
    }
    async getLocalFileContent(profile) {
        try {
            const content = await this.fileService.readFile(profile.settingsResource);
            return content.value.toString();
        }
        catch (error) {
            // File not found
            if (error instanceof FileOperationError && error.fileOperationResult === 1 /* FileOperationResult.FILE_NOT_FOUND */) {
                return null;
            }
            else {
                throw error;
            }
        }
    }
};
SettingsResource = __decorate([
    __param(0, IFileService),
    __param(1, IUserDataSyncUtilService),
    __param(2, ILogService)
], SettingsResource);
export { SettingsResource };
let SettingsResourceTreeItem = class SettingsResourceTreeItem {
    constructor(profile, uriIdentityService, instantiationService) {
        this.profile = profile;
        this.uriIdentityService = uriIdentityService;
        this.instantiationService = instantiationService;
        this.type = "settings" /* ProfileResourceType.Settings */;
        this.handle = "settings" /* ProfileResourceType.Settings */;
        this.label = { label: localize('settings', "Settings") };
        this.collapsibleState = TreeItemCollapsibleState.Expanded;
    }
    async getChildren() {
        return [{
                handle: this.profile.settingsResource.toString(),
                resourceUri: this.profile.settingsResource,
                collapsibleState: TreeItemCollapsibleState.None,
                parent: this,
                accessibilityInformation: {
                    label: this.uriIdentityService.extUri.basename(this.profile.settingsResource)
                },
                command: {
                    id: API_OPEN_EDITOR_COMMAND_ID,
                    title: '',
                    arguments: [this.profile.settingsResource, undefined, undefined]
                }
            }];
    }
    async hasContent() {
        const settingsContent = await this.instantiationService.createInstance(SettingsResource).getSettingsContent(this.profile);
        return settingsContent.settings !== null;
    }
    async getContent() {
        return this.instantiationService.createInstance(SettingsResource).getContent(this.profile);
    }
    isFromDefaultProfile() {
        return !this.profile.isDefault && !!this.profile.useDefaultFlags?.settings;
    }
};
SettingsResourceTreeItem = __decorate([
    __param(1, IUriIdentityService),
    __param(2, IInstantiationService)
], SettingsResourceTreeItem);
export { SettingsResourceTreeItem };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2V0dGluZ3NSZXNvdXJjZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdXNlckRhdGFQcm9maWxlL2Jyb3dzZXIvc2V0dGluZ3NSZXNvdXJjZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDN0QsT0FBTyxFQUFzQixVQUFVLEVBQTBCLE1BQU0sb0VBQW9FLENBQUM7QUFDNUksT0FBTyxFQUFFLGtCQUFrQixFQUF1QixZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUNuSCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDckUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQzVFLE9BQU8sRUFBMEcsdUJBQXVCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUMvSyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQUNsRyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUNwRyxPQUFPLEVBQTBCLHdCQUF3QixFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFFNUYsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0saURBQWlELENBQUM7QUFDN0YsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBTXRGLElBQU0sMkJBQTJCLEdBQWpDLE1BQU0sMkJBQTJCO0lBRXZDLFlBQzJDLHNCQUErQyxFQUMxRCxX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