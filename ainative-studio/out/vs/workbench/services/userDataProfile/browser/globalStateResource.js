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
import { localize } from '../../../../nls.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { IUserDataProfileStorageService } from '../../../../platform/userDataProfile/common/userDataProfileStorageService.js';
import { API_OPEN_EDITOR_COMMAND_ID } from '../../../browser/parts/editor/editorCommands.js';
import { TreeItemCollapsibleState } from '../../../common/views.js';
let GlobalStateResourceInitializer = class GlobalStateResourceInitializer {
    constructor(storageService) {
        this.storageService = storageService;
    }
    async initialize(content) {
        const globalState = JSON.parse(content);
        const storageKeys = Object.keys(globalState.storage);
        if (storageKeys.length) {
            const storageEntries = [];
            for (const key of storageKeys) {
                storageEntries.push({ key, value: globalState.storage[key], scope: 0 /* StorageScope.PROFILE */, target: 0 /* StorageTarget.USER */ });
            }
            this.storageService.storeAll(storageEntries, true);
        }
    }
};
GlobalStateResourceInitializer = __decorate([
    __param(0, IStorageService)
], GlobalStateResourceInitializer);
export { GlobalStateResourceInitializer };
let GlobalStateResource = class GlobalStateResource {
    constructor(storageService, userDataProfileStorageService, logService) {
        this.storageService = storageService;
        this.userDataProfileStorageService = userDataProfileStorageService;
        this.logService = logService;
    }
    async getContent(profile) {
        const globalState = await this.getGlobalState(profile);
        return JSON.stringify(globalState);
    }
    async apply(content, profile) {
        const globalState = JSON.parse(content);
        await this.writeGlobalState(globalState, profile);
    }
    async getGlobalState(profile) {
        const storage = {};
        const storageData = await this.userDataProfileStorageService.readStorageData(profile);
        for (const [key, value] of storageData) {
            if (value.value !== undefined && value.target === 0 /* StorageTarget.USER */) {
                storage[key] = value.value;
            }
        }
        return { storage };
    }
    async writeGlobalState(globalState, profile) {
        const storageKeys = Object.keys(globalState.storage);
        if (storageKeys.length) {
            const updatedStorage = new Map();
            const nonProfileKeys = [
                // Do not include application scope user target keys because they also include default profile user target keys
                ...this.storageService.keys(-1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */),
                ...this.storageService.keys(1 /* StorageScope.WORKSPACE */, 0 /* StorageTarget.USER */),
                ...this.storageService.keys(1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */),
            ];
            for (const key of storageKeys) {
                if (nonProfileKeys.includes(key)) {
                    this.logService.info(`Importing Profile (${profile.name}): Ignoring global state key '${key}' because it is not a profile key.`);
                }
                else {
                    updatedStorage.set(key, globalState.storage[key]);
                }
            }
            await this.userDataProfileStorageService.updateStorageData(profile, updatedStorage, 0 /* StorageTarget.USER */);
        }
    }
};
GlobalStateResource = __decorate([
    __param(0, IStorageService),
    __param(1, IUserDataProfileStorageService),
    __param(2, ILogService)
], GlobalStateResource);
export { GlobalStateResource };
export class GlobalStateResourceTreeItem {
    constructor(resource, uriIdentityService) {
        this.resource = resource;
        this.uriIdentityService = uriIdentityService;
        this.type = "globalState" /* ProfileResourceType.GlobalState */;
        this.handle = "globalState" /* ProfileResourceType.GlobalState */;
        this.label = { label: localize('globalState', "UI State") };
        this.collapsibleState = TreeItemCollapsibleState.Collapsed;
    }
    async getChildren() {
        return [{
                handle: this.resource.toString(),
                resourceUri: this.resource,
                collapsibleState: TreeItemCollapsibleState.None,
                accessibilityInformation: {
                    label: this.uriIdentityService.extUri.basename(this.resource)
                },
                parent: this,
                command: {
                    id: API_OPEN_EDITOR_COMMAND_ID,
                    title: '',
                    arguments: [this.resource, undefined, undefined]
                }
            }];
    }
}
let GlobalStateResourceExportTreeItem = class GlobalStateResourceExportTreeItem extends GlobalStateResourceTreeItem {
    constructor(profile, resource, uriIdentityService, instantiationService) {
        super(resource, uriIdentityService);
        this.profile = profile;
        this.instantiationService = instantiationService;
    }
    async hasContent() {
        const globalState = await this.instantiationService.createInstance(GlobalStateResource).getGlobalState(this.profile);
        return Object.keys(globalState.storage).length > 0;
    }
    async getContent() {
        return this.instantiationService.createInstance(GlobalStateResource).getContent(this.profile);
    }
    isFromDefaultProfile() {
        return !this.profile.isDefault && !!this.profile.useDefaultFlags?.globalState;
    }
};
GlobalStateResourceExportTreeItem = __decorate([
    __param(2, IUriIdentityService),
    __param(3, IInstantiationService)
], GlobalStateResourceExportTreeItem);
export { GlobalStateResourceExportTreeItem };
let GlobalStateResourceImportTreeItem = class GlobalStateResourceImportTreeItem extends GlobalStateResourceTreeItem {
    constructor(content, resource, uriIdentityService) {
        super(resource, uriIdentityService);
        this.content = content;
    }
    async getContent() {
        return this.content;
    }
    isFromDefaultProfile() {
        return false;
    }
};
GlobalStateResourceImportTreeItem = __decorate([
    __param(2, IUriIdentityService)
], GlobalStateResourceImportTreeItem);
export { GlobalStateResourceImportTreeItem };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2xvYmFsU3RhdGVSZXNvdXJjZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdXNlckRhdGFQcm9maWxlL2Jyb3dzZXIvZ2xvYmFsU3RhdGVSZXNvdXJjZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUloRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3JFLE9BQU8sRUFBaUIsZUFBZSxFQUErQixNQUFNLGdEQUFnRCxDQUFDO0FBQzdILE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBRTdGLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLDhFQUE4RSxDQUFDO0FBQzlILE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQzdGLE9BQU8sRUFBMEIsd0JBQXdCLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQU9yRixJQUFNLDhCQUE4QixHQUFwQyxNQUFNLDhCQUE4QjtJQUUxQyxZQUE4QyxjQUErQjtRQUEvQixtQkFBYyxHQUFkLGNBQWMsQ0FBaUI7SUFDN0UsQ0FBQztJQUVELEtBQUssQ0FBQyxVQUFVLENBQUMsT0FBZTtRQUMvQixNQUFNLFdBQVcsR0FBaUIsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUN0RCxNQUFNLFdBQVcsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNyRCxJQUFJLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUN4QixN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