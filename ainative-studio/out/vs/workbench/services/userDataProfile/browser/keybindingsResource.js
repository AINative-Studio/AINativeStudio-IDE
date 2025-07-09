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
import { FileOperationError, IFileService } from '../../../../platform/files/common/files.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IUserDataProfileService } from '../common/userDataProfile.js';
import { platform } from '../../../../base/common/platform.js';
import { TreeItemCollapsibleState } from '../../../common/views.js';
import { API_OPEN_EDITOR_COMMAND_ID } from '../../../browser/parts/editor/editorCommands.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { localize } from '../../../../nls.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
let KeybindingsResourceInitializer = class KeybindingsResourceInitializer {
    constructor(userDataProfileService, fileService, logService) {
        this.userDataProfileService = userDataProfileService;
        this.fileService = fileService;
        this.logService = logService;
    }
    async initialize(content) {
        const keybindingsContent = JSON.parse(content);
        if (keybindingsContent.keybindings === null) {
            this.logService.info(`Initializing Profile: No keybindings to apply...`);
            return;
        }
        await this.fileService.writeFile(this.userDataProfileService.currentProfile.keybindingsResource, VSBuffer.fromString(keybindingsContent.keybindings));
    }
};
KeybindingsResourceInitializer = __decorate([
    __param(0, IUserDataProfileService),
    __param(1, IFileService),
    __param(2, ILogService)
], KeybindingsResourceInitializer);
export { KeybindingsResourceInitializer };
let KeybindingsResource = class KeybindingsResource {
    constructor(fileService, logService) {
        this.fileService = fileService;
        this.logService = logService;
    }
    async getContent(profile) {
        const keybindingsContent = await this.getKeybindingsResourceContent(profile);
        return JSON.stringify(keybindingsContent);
    }
    async getKeybindingsResourceContent(profile) {
        const keybindings = await this.getKeybindingsContent(profile);
        return { keybindings, platform };
    }
    async apply(content, profile) {
        const keybindingsContent = JSON.parse(content);
        if (keybindingsContent.keybindings === null) {
            this.logService.info(`Importing Profile (${profile.name}): No keybindings to apply...`);
            return;
        }
        await this.fileService.writeFile(profile.keybindingsResource, VSBuffer.fromString(keybindingsContent.keybindings));
    }
    async getKeybindingsContent(profile) {
        try {
            const content = await this.fileService.readFile(profile.keybindingsResource);
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
KeybindingsResource = __decorate([
    __param(0, IFileService),
    __param(1, ILogService)
], KeybindingsResource);
export { KeybindingsResource };
let KeybindingsResourceTreeItem = class KeybindingsResourceTreeItem {
    constructor(profile, uriIdentityService, instantiationService) {
        this.profile = profile;
        this.uriIdentityService = uriIdentityService;
        this.instantiationService = instantiationService;
        this.type = "keybindings" /* ProfileResourceType.Keybindings */;
        this.handle = "keybindings" /* ProfileResourceType.Keybindings */;
        this.label = { label: localize('keybindings', "Keyboard Shortcuts") };
        this.collapsibleState = TreeItemCollapsibleState.Expanded;
    }
    isFromDefaultProfile() {
        return !this.profile.isDefault && !!this.profile.useDefaultFlags?.keybindings;
    }
    async getChildren() {
        return [{
                handle: this.profile.keybindingsResource.toString(),
                resourceUri: this.profile.keybindingsResource,
                collapsibleState: TreeItemCollapsibleState.None,
                parent: this,
                accessibilityInformation: {
                    label: this.uriIdentityService.extUri.basename(this.profile.settingsResource)
                },
                command: {
                    id: API_OPEN_EDITOR_COMMAND_ID,
                    title: '',
                    arguments: [this.profile.keybindingsResource, undefined, undefined]
                }
            }];
    }
    async hasContent() {
        const keybindingsContent = await this.instantiationService.createInstance(KeybindingsResource).getKeybindingsResourceContent(this.profile);
        return keybindingsContent.keybindings !== null;
    }
    async getContent() {
        return this.instantiationService.createInstance(KeybindingsResource).getContent(this.profile);
    }
};
KeybindingsResourceTreeItem = __decorate([
    __param(1, IUriIdentityService),
    __param(2, IInstantiationService)
], KeybindingsResourceTreeItem);
export { KeybindingsResourceTreeItem };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5YmluZGluZ3NSZXNvdXJjZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdXNlckRhdGFQcm9maWxlL2Jyb3dzZXIva2V5YmluZGluZ3NSZXNvdXJjZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDN0QsT0FBTyxFQUFFLGtCQUFrQixFQUF1QixZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUNuSCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDckUsT0FBTyxFQUEwRyx1QkFBdUIsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQy9LLE9BQU8sRUFBRSxRQUFRLEVBQVksTUFBTSxxQ0FBcUMsQ0FBQztBQUN6RSxPQUFPLEVBQTBCLHdCQUF3QixFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFFNUYsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0saURBQWlELENBQUM7QUFDN0YsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBT3RGLElBQU0sOEJBQThCLEdBQXBDLE1BQU0sOEJBQThCO0lBRTFDLFlBQzJDLHNCQUErQyxFQUMxRCxXQUF5QixFQUMxQixVQUF1QjtRQUZYLDJCQUFzQixHQUF0QixzQkFBc0IsQ0FBeUI7UUFDMUQsZ0JBQVcsR0FBWCxXQUFXLENBQWM7UUFDMUIsZUFBVSxHQUFWLFVBQVUsQ0FBYTtJQUV0RCxDQUFDO0lBRUQsS0FBSyxDQUFDLFVB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