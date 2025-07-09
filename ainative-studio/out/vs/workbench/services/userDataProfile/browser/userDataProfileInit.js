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
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { Barrier, Promises } from '../../../../base/common/async.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { IUserDataProfileService } from '../common/userDataProfile.js';
import { SettingsResourceInitializer } from './settingsResource.js';
import { GlobalStateResourceInitializer } from './globalStateResource.js';
import { KeybindingsResourceInitializer } from './keybindingsResource.js';
import { TasksResourceInitializer } from './tasksResource.js';
import { SnippetsResourceInitializer } from './snippetsResource.js';
import { ExtensionsResourceInitializer } from './extensionsResource.js';
import { IBrowserWorkbenchEnvironmentService } from '../../environment/browser/environmentService.js';
import { isString } from '../../../../base/common/types.js';
import { IRequestService, asJson } from '../../../../platform/request/common/request.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { URI } from '../../../../base/common/uri.js';
let UserDataProfileInitializer = class UserDataProfileInitializer {
    constructor(environmentService, fileService, userDataProfileService, storageService, logService, uriIdentityService, requestService) {
        this.environmentService = environmentService;
        this.fileService = fileService;
        this.userDataProfileService = userDataProfileService;
        this.storageService = storageService;
        this.logService = logService;
        this.uriIdentityService = uriIdentityService;
        this.requestService = requestService;
        this.initialized = [];
        this.initializationFinished = new Barrier();
    }
    async whenInitializationFinished() {
        await this.initializationFinished.wait();
    }
    async requiresInitialization() {
        if (!this.environmentService.options?.profile?.contents) {
            return false;
        }
        if (!this.storageService.isNew(0 /* StorageScope.PROFILE */)) {
            return false;
        }
        return true;
    }
    async initializeRequiredResources() {
        this.logService.trace(`UserDataProfileInitializer#initializeRequiredResources`);
        const promises = [];
        const profileTemplate = await this.getProfileTemplate();
        if (profileTemplate?.settings) {
            promises.push(this.initialize(new SettingsResourceInitializer(this.userDataProfileService, this.fileService, this.logService), profileTemplate.settings, "settings" /* ProfileResourceType.Settings */));
        }
        if (profileTemplate?.globalState) {
            promises.push(this.initialize(new GlobalStateResourceInitializer(this.storageService), profileTemplate.globalState, "globalState" /* ProfileResourceType.GlobalState */));
        }
        await Promise.all(promises);
    }
    async initializeOtherResources(instantiationService) {
        try {
            this.logService.trace(`UserDataProfileInitializer#initializeOtherResources`);
            const promises = [];
            const profileTemplate = await this.getProfileTemplate();
            if (profileTemplate?.keybindings) {
                promises.push(this.initialize(new KeybindingsResourceInitializer(this.userDataProfileService, this.fileService, this.logService), profileTemplate.keybindings, "keybindings" /* ProfileResourceType.Keybindings */));
            }
            if (profileTemplate?.tasks) {
                promises.push(this.initialize(new TasksResourceInitializer(this.userDataProfileService, this.fileService, this.logService), profileTemplate.tasks, "tasks" /* ProfileResourceType.Tasks */));
            }
            if (profileTemplate?.snippets) {
                promises.push(this.initialize(new SnippetsResourceInitializer(this.userDataProfileService, this.fileService, this.uriIdentityService), profileTemplate.snippets, "snippets" /* ProfileResourceType.Snippets */));
            }
            promises.push(this.initializeInstalledExtensions(instantiationService));
            await Promises.settled(promises);
        }
        finally {
            this.initializationFinished.open();
        }
    }
    async initializeInstalledExtensions(instantiationService) {
        if (!this.initializeInstalledExtensionsPromise) {
            const profileTemplate = await this.getProfileTemplate();
            if (profileTemplate?.extensions) {
                this.initializeInstalledExtensionsPromise = this.initialize(instantiationService.createInstance(ExtensionsResourceInitializer), profileTemplate.extensions, "extensions" /* ProfileResourceType.Extensions */);
            }
            else {
                this.initializeInstalledExtensionsPromise = Promise.resolve();
            }
        }
        return this.initializeInstalledExtensionsPromise;
    }
    getProfileTemplate() {
        if (!this.profileTemplatePromise) {
            this.profileTemplatePromise = this.doGetProfileTemplate();
        }
        return this.profileTemplatePromise;
    }
    async doGetProfileTemplate() {
        if (!this.environmentService.options?.profile?.contents) {
            return null;
        }
        if (isString(this.environmentService.options.profile.contents)) {
            try {
                return JSON.parse(this.environmentService.options.profile.contents);
            }
            catch (error) {
                this.logService.error(error);
                return null;
            }
        }
        try {
            const url = URI.revive(this.environmentService.options.profile.contents).toString(true);
            const context = await this.requestService.request({ type: 'GET', url }, CancellationToken.None);
            if (context.res.statusCode === 200) {
                return await asJson(context);
            }
            else {
                this.logService.warn(`UserDataProfileInitializer: Failed to get profile from URL: ${url}. Status code: ${context.res.statusCode}.`);
            }
        }
        catch (error) {
            this.logService.error(error);
        }
        return null;
    }
    async initialize(initializer, content, profileResource) {
        try {
            if (this.initialized.includes(profileResource)) {
                this.logService.info(`UserDataProfileInitializer: ${profileResource} initialized already.`);
                return;
            }
            this.initialized.push(profileResource);
            this.logService.trace(`UserDataProfileInitializer: Initializing ${profileResource}`);
            await initializer.initialize(content);
            this.logService.info(`UserDataProfileInitializer: Initialized ${profileResource}`);
        }
        catch (error) {
            this.logService.info(`UserDataProfileInitializer: Error while initializing ${profileResource}`);
            this.logService.error(error);
        }
    }
};
UserDataProfileInitializer = __decorate([
    __param(0, IBrowserWorkbenchEnvironmentService),
    __param(1, IFileService),
    __param(2, IUserDataProfileService),
    __param(3, IStorageService),
    __param(4, ILogService),
    __param(5, IUriIdentityService),
    __param(6, IRequestService)
], UserDataProfileInitializer);
export { UserDataProfileInitializer };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFQcm9maWxlSW5pdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdXNlckRhdGFQcm9maWxlL2Jyb3dzZXIvdXNlckRhdGFQcm9maWxlSW5pdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFnQixNQUFNLGdEQUFnRCxDQUFDO0FBQy9GLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUUxRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDckUsT0FBTyxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNyRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUU3RixPQUFPLEVBQStCLHVCQUF1QixFQUE0QixNQUFNLDhCQUE4QixDQUFDO0FBQzlILE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ3BFLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQzFFLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQzFFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlELE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ3BFLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBQ3hFLE9BQU8sRUFBRSxtQ0FBbUMsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUM1RCxPQUFPLEVB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