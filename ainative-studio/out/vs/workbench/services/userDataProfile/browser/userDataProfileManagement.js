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
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { CancellationError } from '../../../../base/common/errors.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { equals } from '../../../../base/common/objects.js';
import { localize } from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IRequestService, asJson } from '../../../../platform/request/common/request.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { IUserDataProfilesService } from '../../../../platform/userDataProfile/common/userDataProfile.js';
import { isEmptyWorkspaceIdentifier, IWorkspaceContextService, toWorkspaceIdentifier } from '../../../../platform/workspace/common/workspace.js';
import { CONFIG_NEW_WINDOW_PROFILE } from '../../../common/configuration.js';
import { IWorkbenchEnvironmentService } from '../../environment/common/environmentService.js';
import { IExtensionService } from '../../extensions/common/extensions.js';
import { IHostService } from '../../host/browser/host.js';
import { IUserDataProfileManagementService, IUserDataProfileService } from '../common/userDataProfile.js';
let UserDataProfileManagementService = class UserDataProfileManagementService extends Disposable {
    constructor(userDataProfilesService, userDataProfileService, hostService, dialogService, workspaceContextService, extensionService, environmentService, productService, requestService, configurationService, uriIdentityService, logService) {
        super();
        this.userDataProfilesService = userDataProfilesService;
        this.userDataProfileService = userDataProfileService;
        this.hostService = hostService;
        this.dialogService = dialogService;
        this.workspaceContextService = workspaceContextService;
        this.extensionService = extensionService;
        this.environmentService = environmentService;
        this.productService = productService;
        this.requestService = requestService;
        this.configurationService = configurationService;
        this.uriIdentityService = uriIdentityService;
        this.logService = logService;
        this._register(userDataProfileService.onDidChangeCurrentProfile(e => this.onDidChangeCurrentProfile(e)));
        this._register(userDataProfilesService.onDidChangeProfiles(e => {
            if (e.removed.some(profile => profile.id === this.userDataProfileService.currentProfile.id)) {
                const profileToUse = this.getProfileToUseForCurrentWorkspace();
                this.switchProfile(profileToUse);
                this.changeCurrentProfile(profileToUse, localize('reload message when removed', "The current profile has been removed. Please reload to switch back to default profile"));
                return;
            }
            const updatedCurrentProfile = e.updated.find(p => this.userDataProfileService.currentProfile.id === p.id);
            if (updatedCurrentProfile) {
                const profileToUse = this.getProfileToUseForCurrentWorkspace();
                if (profileToUse?.id !== updatedCurrentProfile.id) {
                    this.switchProfile(profileToUse);
                    this.changeCurrentProfile(profileToUse, localize('reload message when switched', "The current workspace has been removed from the current profile. Please reload to switch back to the updated profile"));
                }
                else {
                    this.changeCurrentProfile(updatedCurrentProfile, localize('reload message when updated', "The current profile has been updated. Please reload to switch back to the updated profile"));
                }
            }
        }));
    }
    async onDidChangeCurrentProfile(e) {
        if (e.previous.isTransient) {
            await this.userDataProfilesService.cleanUpTransientProfiles();
        }
    }
    getWorkspaceUri() {
        const workspace = this.workspaceContextService.getWorkspace();
        return workspace.configuration ?? workspace.folders[0]?.uri;
    }
    getProfileToUseForCurrentWorkspace() {
        const workspaceUri = this.getWorkspaceUri();
        if (workspaceUri) {
            const profileForWorkspace = this.userDataProfilesService.profiles.find(profile => profile.workspaces?.some(ws => this.uriIdentityService.extUri.isEqual(ws, workspaceUri)));
            if (profileForWorkspace) {
                return profileForWorkspace;
            }
        }
        else {
            // If no workspace is open, use the current profile
            const currentProfile = this.userDataProfilesService.profiles.find(profile => profile.id === this.userDataProfileService.currentProfile.id);
            if (currentProfile) {
                return currentProfile;
            }
        }
        return this.getDefaultProfileToUse();
    }
    getDefaultProfileToUse() {
        const newWindowProfileConfigValue = this.configurationService.getValue(CONFIG_NEW_WINDOW_PROFILE);
        if (newWindowProfileConfigValue) {
            const newWindowProfile = this.userDataProfilesService.profiles.find(profile => profile.name === newWindowProfileConfigValue);
            if (newWindowProfile) {
                return newWindowProfile;
            }
        }
        return this.userDataProfilesService.defaultProfile;
    }
    async createProfile(name, options) {
        return this.userDataProfilesService.createNamedProfile(name, options);
    }
    async createAndEnterProfile(name, options) {
        const profile = await this.userDataProfilesService.createNamedProfile(name, options, toWorkspaceIdentifier(this.workspaceContextService.getWorkspace()));
        await this.changeCurrentProfile(profile);
        return profile;
    }
    async createAndEnterTransientProfile() {
        const profile = await this.userDataProfilesService.createTransientProfile(toWorkspaceIdentifier(this.workspaceContextService.getWorkspace()));
        await this.changeCurrentProfile(profile);
        return profile;
    }
    async updateProfile(profile, updateOptions) {
        if (!this.userDataProfilesService.profiles.some(p => p.id === profile.id)) {
            throw new Error(`Profile ${profile.name} does not exist`);
        }
        if (profile.isDefault) {
            throw new Error(localize('cannotRenameDefaultProfile', "Cannot rename the default profile"));
        }
        const updatedProfile = await this.userDataProfilesService.updateProfile(profile, updateOptions);
        return updatedProfile;
    }
    async removeProfile(profile) {
        if (!this.userDataProfilesService.profiles.some(p => p.id === profile.id)) {
            throw new Error(`Profile ${profile.name} does not exist`);
        }
        if (profile.isDefault) {
            throw new Error(localize('cannotDeleteDefaultProfile', "Cannot delete the default profile"));
        }
        await this.userDataProfilesService.removeProfile(profile);
    }
    async switchProfile(profile) {
        if (!this.userDataProfilesService.profiles.some(p => p.id === profile.id)) {
            throw new Error(`Profile ${profile.name} does not exist`);
        }
        if (this.userDataProfileService.currentProfile.id === profile.id) {
            return;
        }
        const workspaceUri = this.getWorkspaceUri();
        if (workspaceUri && profile.workspaces?.some(ws => this.uriIdentityService.extUri.isEqual(ws, workspaceUri))) {
            return;
        }
        const workspaceIdentifier = toWorkspaceIdentifier(this.workspaceContextService.getWorkspace());
        await this.userDataProfilesService.setProfileForWorkspace(workspaceIdentifier, profile);
        if (isEmptyWorkspaceIdentifier(workspaceIdentifier)) {
            await this.changeCurrentProfile(profile);
        }
    }
    async getBuiltinProfileTemplates() {
        if (this.productService.profileTemplatesUrl) {
            try {
                const context = await this.requestService.request({ type: 'GET', url: this.productService.profileTemplatesUrl }, CancellationToken.None);
                if (context.res.statusCode === 200) {
                    return (await asJson(context)) || [];
                }
                else {
                    this.logService.error('Could not get profile templates.', context.res.statusCode);
                }
            }
            catch (error) {
                this.logService.error(error);
            }
        }
        return [];
    }
    async changeCurrentProfile(profile, reloadMessage) {
        const isRemoteWindow = !!this.environmentService.remoteAuthority;
        const shouldRestartExtensionHosts = this.userDataProfileService.currentProfile.id !== profile.id || !equals(this.userDataProfileService.currentProfile.useDefaultFlags, profile.useDefaultFlags);
        if (shouldRestartExtensionHosts) {
            if (!isRemoteWindow) {
                if (!(await this.extensionService.stopExtensionHosts(localize('switch profile', "Switching to a profile")))) {
                    // If extension host did not stop, do not switch profile
                    if (this.userDataProfilesService.profiles.some(p => p.id === this.userDataProfileService.currentProfile.id)) {
                        await this.userDataProfilesService.setProfileForWorkspace(toWorkspaceIdentifier(this.workspaceContextService.getWorkspace()), this.userDataProfileService.currentProfile);
                    }
                    throw new CancellationError();
                }
            }
        }
        // In a remote window update current profile before reloading so that data is preserved from current profile if asked to preserve
        await this.userDataProfileService.updateCurrentProfile(profile);
        if (shouldRestartExtensionHosts) {
            if (isRemoteWindow) {
                const { confirmed } = await this.dialogService.confirm({
                    message: reloadMessage ?? localize('reload message', "Switching a profile requires reloading VS Code."),
                    primaryButton: localize('reload button', "&&Reload"),
                });
                if (confirmed) {
                    await this.hostService.reload();
                }
            }
            else {
                await this.extensionService.startExtensionHosts();
            }
        }
    }
};
UserDataProfileManagementService = __decorate([
    __param(0, IUserDataProfilesService),
    __param(1, IUserDataProfileService),
    __param(2, IHostService),
    __param(3, IDialogService),
    __param(4, IWorkspaceContextService),
    __param(5, IExtensionService),
    __param(6, IWorkbenchEnvironmentService),
    __param(7, IProductService),
    __param(8, IRequestService),
    __param(9, IConfigurationService),
    __param(10, IUriIdentityService),
    __param(11, ILogService)
], UserDataProfileManagementService);
export { UserDataProfileManagementService };
registerSingleton(IUserDataProfileManagementService, UserDataProfileManagementService, 0 /* InstantiationType.Eager */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFQcm9maWxlTWFuYWdlbWVudC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdXNlckRhdGFQcm9maWxlL2Jyb3dzZXIvdXNlckRhdGFQcm9maWxlTWFuYWdlbWVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUM1RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN0RSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBRTVELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDaEYsT0FBTyxFQUFxQixpQkFBaUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQy9HLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNyRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDeEYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUN6RixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUM3RixPQUFPLEVBQTZDLHdCQUF3QixFQUFpQyxNQUFNLGdFQUFnRSxDQUFDO0FBQ3BMLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSx3QkFBd0IsRUFBRSxxQkFBcUIsRUFB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