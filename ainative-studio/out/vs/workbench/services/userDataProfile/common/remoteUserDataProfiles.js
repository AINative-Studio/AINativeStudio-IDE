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
import { Disposable } from '../../../../base/common/lifecycle.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { IUserDataProfilesService } from '../../../../platform/userDataProfile/common/userDataProfile.js';
import { IRemoteAgentService } from '../../remote/common/remoteAgentService.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IUserDataProfileService } from './userDataProfile.js';
import { distinct } from '../../../../base/common/arrays.js';
import { IWorkbenchEnvironmentService } from '../../environment/common/environmentService.js';
import { UserDataProfilesService } from '../../../../platform/userDataProfile/common/userDataProfileIpc.js';
import { ErrorNoTelemetry } from '../../../../base/common/errors.js';
const associatedRemoteProfilesKey = 'associatedRemoteProfiles';
export const IRemoteUserDataProfilesService = createDecorator('IRemoteUserDataProfilesService');
let RemoteUserDataProfilesService = class RemoteUserDataProfilesService extends Disposable {
    constructor(environmentService, remoteAgentService, userDataProfilesService, userDataProfileService, storageService, logService) {
        super();
        this.environmentService = environmentService;
        this.remoteAgentService = remoteAgentService;
        this.userDataProfilesService = userDataProfilesService;
        this.userDataProfileService = userDataProfileService;
        this.storageService = storageService;
        this.logService = logService;
        this.initPromise = this.init();
    }
    async init() {
        const connection = this.remoteAgentService.getConnection();
        if (!connection) {
            return;
        }
        const environment = await this.remoteAgentService.getEnvironment();
        if (!environment) {
            return;
        }
        this.remoteUserDataProfilesService = new UserDataProfilesService(environment.profiles.all, environment.profiles.home, connection.getChannel('userDataProfiles'));
        this._register(this.userDataProfilesService.onDidChangeProfiles(e => this.onDidChangeLocalProfiles(e)));
        // Associate current local profile with remote profile
        const remoteProfile = await this.getAssociatedRemoteProfile(this.userDataProfileService.currentProfile, this.remoteUserDataProfilesService);
        if (!remoteProfile.isDefault) {
            this.setAssociatedRemoteProfiles([...this.getAssociatedRemoteProfiles(), remoteProfile.id]);
        }
        this.cleanUp();
    }
    async onDidChangeLocalProfiles(e) {
        for (const profile of e.removed) {
            const remoteProfile = this.remoteUserDataProfilesService?.profiles.find(p => p.id === profile.id);
            if (remoteProfile) {
                await this.remoteUserDataProfilesService?.removeProfile(remoteProfile);
            }
        }
    }
    async getRemoteProfiles() {
        await this.initPromise;
        if (!this.remoteUserDataProfilesService) {
            throw new ErrorNoTelemetry('Remote profiles service not available in the current window');
        }
        return this.remoteUserDataProfilesService.profiles;
    }
    async getRemoteProfile(localProfile) {
        await this.initPromise;
        if (!this.remoteUserDataProfilesService) {
            throw new ErrorNoTelemetry('Remote profiles service not available in the current window');
        }
        return this.getAssociatedRemoteProfile(localProfile, this.remoteUserDataProfilesService);
    }
    async getAssociatedRemoteProfile(localProfile, remoteUserDataProfilesService) {
        // If the local profile is the default profile, return the remote default profile
        if (localProfile.isDefault) {
            return remoteUserDataProfilesService.defaultProfile;
        }
        let profile = remoteUserDataProfilesService.profiles.find(p => p.id === localProfile.id);
        if (!profile) {
            profile = await remoteUserDataProfilesService.createProfile(localProfile.id, localProfile.name, {
                transient: localProfile.isTransient,
                useDefaultFlags: localProfile.useDefaultFlags,
            });
            this.setAssociatedRemoteProfiles([...this.getAssociatedRemoteProfiles(), this.userDataProfileService.currentProfile.id]);
        }
        return profile;
    }
    getAssociatedRemoteProfiles() {
        if (this.environmentService.remoteAuthority) {
            const remotes = this.parseAssociatedRemoteProfiles();
            return remotes[this.environmentService.remoteAuthority] ?? [];
        }
        return [];
    }
    setAssociatedRemoteProfiles(profiles) {
        if (this.environmentService.remoteAuthority) {
            const remotes = this.parseAssociatedRemoteProfiles();
            profiles = distinct(profiles);
            if (profiles.length) {
                remotes[this.environmentService.remoteAuthority] = profiles;
            }
            else {
                delete remotes[this.environmentService.remoteAuthority];
            }
            if (Object.keys(remotes).length) {
                this.storageService.store(associatedRemoteProfilesKey, JSON.stringify(remotes), -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
            }
            else {
                this.storageService.remove(associatedRemoteProfilesKey, -1 /* StorageScope.APPLICATION */);
            }
        }
    }
    parseAssociatedRemoteProfiles() {
        if (this.environmentService.remoteAuthority) {
            const value = this.storageService.get(associatedRemoteProfilesKey, -1 /* StorageScope.APPLICATION */);
            try {
                return value ? JSON.parse(value) : {};
            }
            catch (error) {
                this.logService.error(error);
            }
        }
        return {};
    }
    async cleanUp() {
        const associatedRemoteProfiles = [];
        for (const profileId of this.getAssociatedRemoteProfiles()) {
            const remoteProfile = this.remoteUserDataProfilesService?.profiles.find(p => p.id === profileId);
            if (!remoteProfile) {
                continue;
            }
            const localProfile = this.userDataProfilesService.profiles.find(p => p.id === profileId);
            if (localProfile) {
                if (localProfile.name !== remoteProfile.name) {
                    await this.remoteUserDataProfilesService?.updateProfile(remoteProfile, { name: localProfile.name });
                }
                associatedRemoteProfiles.push(profileId);
                continue;
            }
            if (remoteProfile) {
                // Cleanup remote profiles those are not available locally
                await this.remoteUserDataProfilesService?.removeProfile(remoteProfile);
            }
        }
        this.setAssociatedRemoteProfiles(associatedRemoteProfiles);
    }
};
RemoteUserDataProfilesService = __decorate([
    __param(0, IWorkbenchEnvironmentService),
    __param(1, IRemoteAgentService),
    __param(2, IUserDataProfilesService),
    __param(3, IUserDataProfileService),
    __param(4, IStorageService),
    __param(5, ILogService)
], RemoteUserDataProfilesService);
registerSingleton(IRemoteUserDataProfilesService, RemoteUserDataProfilesService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlVXNlckRhdGFQcm9maWxlcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdXNlckRhdGFQcm9maWxlL2NvbW1vbi9yZW1vdGVVc2VyRGF0YVByb2ZpbGVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQXFCLGlCQUFpQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDL0csT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQzdGLE9BQU8sRUFBNEMsd0JBQXdCLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQztBQUNwSixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUNoRixPQUFPLEVBQUUsZUFBZSxFQUErQixNQUFNLGdEQUFnRCxDQUFDO0FBRTlHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNyRSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQztBQUMvRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDN0QsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDOUYsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sbUVBQW1FLENBQUM7QUFDNUcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFFckUsTUFBTSwyQkFBMkIsR0FBRywwQkFBMEIsQ0FBQztBQUUvRCxNQUFNLENBQUMsTUFBTSw4QkFBOEIsR0FBRyxlQUFlLENBQWlDLGdDQUFnQyxDQUFDLENBQUM7QUFPaEksSUFBTSw2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