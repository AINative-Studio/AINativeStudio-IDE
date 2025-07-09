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
import { toFormattedString } from '../../../base/common/jsonFormatter.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { IEnvironmentService } from '../../environment/common/environment.js';
import { IFileService } from '../../files/common/files.js';
import { IStorageService } from '../../storage/common/storage.js';
import { ITelemetryService } from '../../telemetry/common/telemetry.js';
import { IUriIdentityService } from '../../uriIdentity/common/uriIdentity.js';
import { IUserDataProfilesService } from '../../userDataProfile/common/userDataProfile.js';
import { AbstractSynchroniser } from './abstractSynchronizer.js';
import { merge } from './userDataProfilesManifestMerge.js';
import { IUserDataSyncLocalStoreService, IUserDataSyncLogService, IUserDataSyncEnablementService, IUserDataSyncStoreService, USER_DATA_SYNC_SCHEME, UserDataSyncError } from './userDataSync.js';
let UserDataProfilesManifestSynchroniser = class UserDataProfilesManifestSynchroniser extends AbstractSynchroniser {
    constructor(profile, collection, userDataProfilesService, fileService, environmentService, storageService, userDataSyncStoreService, userDataSyncLocalStoreService, logService, configurationService, userDataSyncEnablementService, telemetryService, uriIdentityService) {
        super({ syncResource: "profiles" /* SyncResource.Profiles */, profile }, collection, fileService, environmentService, storageService, userDataSyncStoreService, userDataSyncLocalStoreService, userDataSyncEnablementService, telemetryService, logService, configurationService, uriIdentityService);
        this.userDataProfilesService = userDataProfilesService;
        this.version = 2;
        this.previewResource = this.extUri.joinPath(this.syncPreviewFolder, 'profiles.json');
        this.baseResource = this.previewResource.with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'base' });
        this.localResource = this.previewResource.with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'local' });
        this.remoteResource = this.previewResource.with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'remote' });
        this.acceptedResource = this.previewResource.with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'accepted' });
        this._register(userDataProfilesService.onDidChangeProfiles(() => this.triggerLocalChange()));
    }
    async getLastSyncedProfiles() {
        const lastSyncUserData = await this.getLastSyncUserData();
        return lastSyncUserData?.syncData ? parseUserDataProfilesManifest(lastSyncUserData.syncData) : null;
    }
    async getRemoteSyncedProfiles(manifest) {
        const lastSyncUserData = await this.getLastSyncUserData();
        const remoteUserData = await this.getLatestRemoteUserData(manifest, lastSyncUserData);
        return remoteUserData?.syncData ? parseUserDataProfilesManifest(remoteUserData.syncData) : null;
    }
    async generateSyncPreview(remoteUserData, lastSyncUserData, isRemoteDataFromCurrentMachine) {
        const remoteProfiles = remoteUserData.syncData ? parseUserDataProfilesManifest(remoteUserData.syncData) : null;
        const lastSyncProfiles = lastSyncUserData?.syncData ? parseUserDataProfilesManifest(lastSyncUserData.syncData) : null;
        const localProfiles = this.getLocalUserDataProfiles();
        const { local, remote } = merge(localProfiles, remoteProfiles, lastSyncProfiles, []);
        const previewResult = {
            local, remote,
            content: lastSyncProfiles ? this.stringifyRemoteProfiles(lastSyncProfiles) : null,
            localChange: local.added.length > 0 || local.removed.length > 0 || local.updated.length > 0 ? 2 /* Change.Modified */ : 0 /* Change.None */,
            remoteChange: remote !== null ? 2 /* Change.Modified */ : 0 /* Change.None */,
        };
        const localContent = stringifyLocalProfiles(localProfiles, false);
        return [{
                baseResource: this.baseResource,
                baseContent: lastSyncProfiles ? this.stringifyRemoteProfiles(lastSyncProfiles) : null,
                localResource: this.localResource,
                localContent,
                remoteResource: this.remoteResource,
                remoteContent: remoteProfiles ? this.stringifyRemoteProfiles(remoteProfiles) : null,
                remoteProfiles,
                previewResource: this.previewResource,
                previewResult,
                localChange: previewResult.localChange,
                remoteChange: previewResult.remoteChange,
                acceptedResource: this.acceptedResource
            }];
    }
    async hasRemoteChanged(lastSyncUserData) {
        const lastSyncProfiles = lastSyncUserData?.syncData ? parseUserDataProfilesManifest(lastSyncUserData.syncData) : null;
        const localProfiles = this.getLocalUserDataProfiles();
        const { remote } = merge(localProfiles, lastSyncProfiles, lastSyncProfiles, []);
        return !!remote?.added.length || !!remote?.removed.length || !!remote?.updated.length;
    }
    async getMergeResult(resourcePreview, token) {
        return { ...resourcePreview.previewResult, hasConflicts: false };
    }
    async getAcceptResult(resourcePreview, resource, content, token) {
        /* Accept local resource */
        if (this.extUri.isEqual(resource, this.localResource)) {
            return this.acceptLocal(resourcePreview);
        }
        /* Accept remote resource */
        if (this.extUri.isEqual(resource, this.remoteResource)) {
            return this.acceptRemote(resourcePreview);
        }
        /* Accept preview resource */
        if (this.extUri.isEqual(resource, this.previewResource)) {
            return resourcePreview.previewResult;
        }
        throw new Error(`Invalid Resource: ${resource.toString()}`);
    }
    async acceptLocal(resourcePreview) {
        const localProfiles = this.getLocalUserDataProfiles();
        const mergeResult = merge(localProfiles, null, null, []);
        const { local, remote } = mergeResult;
        return {
            content: resourcePreview.localContent,
            local,
            remote,
            localChange: local.added.length > 0 || local.removed.length > 0 || local.updated.length > 0 ? 2 /* Change.Modified */ : 0 /* Change.None */,
            remoteChange: remote !== null ? 2 /* Change.Modified */ : 0 /* Change.None */,
        };
    }
    async acceptRemote(resourcePreview) {
        const remoteProfiles = resourcePreview.remoteContent ? JSON.parse(resourcePreview.remoteContent) : null;
        const lastSyncProfiles = [];
        const localProfiles = [];
        for (const profile of this.getLocalUserDataProfiles()) {
            const remoteProfile = remoteProfiles?.find(remoteProfile => remoteProfile.id === profile.id);
            if (remoteProfile) {
                lastSyncProfiles.push({ id: profile.id, name: profile.name, collection: remoteProfile.collection });
                localProfiles.push(profile);
            }
        }
        if (remoteProfiles !== null) {
            const mergeResult = merge(localProfiles, remoteProfiles, lastSyncProfiles, []);
            const { local, remote } = mergeResult;
            return {
                content: resourcePreview.remoteContent,
                local,
                remote,
                localChange: local.added.length > 0 || local.removed.length > 0 || local.updated.length > 0 ? 2 /* Change.Modified */ : 0 /* Change.None */,
                remoteChange: remote !== null ? 2 /* Change.Modified */ : 0 /* Change.None */,
            };
        }
        else {
            return {
                content: resourcePreview.remoteContent,
                local: { added: [], removed: [], updated: [] },
                remote: null,
                localChange: 0 /* Change.None */,
                remoteChange: 0 /* Change.None */,
            };
        }
    }
    async applyResult(remoteUserData, lastSyncUserData, resourcePreviews, force) {
        const { local, remote, localChange, remoteChange } = resourcePreviews[0][1];
        if (localChange === 0 /* Change.None */ && remoteChange === 0 /* Change.None */) {
            this.logService.info(`${this.syncResourceLogLabel}: No changes found during synchronizing profiles.`);
        }
        const remoteProfiles = resourcePreviews[0][0].remoteProfiles || [];
        if (remoteProfiles.length + (remote?.added.length ?? 0) - (remote?.removed.length ?? 0) > 20) {
            throw new UserDataSyncError('Too many profiles to sync. Please remove some profiles and try again.', "LocalTooManyProfiles" /* UserDataSyncErrorCode.LocalTooManyProfiles */);
        }
        if (localChange !== 0 /* Change.None */) {
            await this.backupLocal(stringifyLocalProfiles(this.getLocalUserDataProfiles(), false));
            await Promise.all(local.removed.map(async (profile) => {
                this.logService.trace(`${this.syncResourceLogLabel}: Removing '${profile.name}' profile...`);
                await this.userDataProfilesService.removeProfile(profile);
                this.logService.info(`${this.syncResourceLogLabel}: Removed profile '${profile.name}'.`);
            }));
            await Promise.all(local.added.map(async (profile) => {
                this.logService.trace(`${this.syncResourceLogLabel}: Creating '${profile.name}' profile...`);
                await this.userDataProfilesService.createProfile(profile.id, profile.name, { icon: profile.icon, useDefaultFlags: profile.useDefaultFlags });
                this.logService.info(`${this.syncResourceLogLabel}: Created profile '${profile.name}'.`);
            }));
            await Promise.all(local.updated.map(async (profile) => {
                const localProfile = this.userDataProfilesService.profiles.find(p => p.id === profile.id);
                if (localProfile) {
                    this.logService.trace(`${this.syncResourceLogLabel}: Updating '${profile.name}' profile...`);
                    await this.userDataProfilesService.updateProfile(localProfile, { name: profile.name, icon: profile.icon, useDefaultFlags: profile.useDefaultFlags });
                    this.logService.info(`${this.syncResourceLogLabel}: Updated profile '${profile.name}'.`);
                }
                else {
                    this.logService.info(`${this.syncResourceLogLabel}: Could not find profile with id '${profile.id}' to update.`);
                }
            }));
        }
        if (remoteChange !== 0 /* Change.None */) {
            this.logService.trace(`${this.syncResourceLogLabel}: Updating remote profiles...`);
            const addedCollections = [];
            const canAddRemoteProfiles = remoteProfiles.length + (remote?.added.length ?? 0) <= 20;
            if (canAddRemoteProfiles) {
                for (const profile of remote?.added || []) {
                    const collection = await this.userDataSyncStoreService.createCollection(this.syncHeaders);
                    addedCollections.push(collection);
                    remoteProfiles.push({ id: profile.id, name: profile.name, collection, icon: profile.icon, useDefaultFlags: profile.useDefaultFlags });
                }
            }
            else {
                this.logService.info(`${this.syncResourceLogLabel}: Could not create remote profiles as there are too many profiles.`);
            }
            for (const profile of remote?.removed || []) {
                remoteProfiles.splice(remoteProfiles.findIndex(({ id }) => profile.id === id), 1);
            }
            for (const profile of remote?.updated || []) {
                const profileToBeUpdated = remoteProfiles.find(({ id }) => profile.id === id);
                if (profileToBeUpdated) {
                    remoteProfiles.splice(remoteProfiles.indexOf(profileToBeUpdated), 1, { ...profileToBeUpdated, id: profile.id, name: profile.name, icon: profile.icon, useDefaultFlags: profile.useDefaultFlags });
                }
            }
            try {
                remoteUserData = await this.updateRemoteProfiles(remoteProfiles, force ? null : remoteUserData.ref);
                this.logService.info(`${this.syncResourceLogLabel}: Updated remote profiles.${canAddRemoteProfiles && remote?.added.length ? ` Added: ${JSON.stringify(remote.added.map(e => e.name))}.` : ''}${remote?.updated.length ? ` Updated: ${JSON.stringify(remote.updated.map(e => e.name))}.` : ''}${remote?.removed.length ? ` Removed: ${JSON.stringify(remote.removed.map(e => e.name))}.` : ''}`);
            }
            catch (error) {
                if (addedCollections.length) {
                    this.logService.info(`${this.syncResourceLogLabel}: Failed to update remote profiles. Cleaning up added collections...`);
                    for (const collection of addedCollections) {
                        await this.userDataSyncStoreService.deleteCollection(collection, this.syncHeaders);
                    }
                }
                throw error;
            }
            for (const profile of remote?.removed || []) {
                await this.userDataSyncStoreService.deleteCollection(profile.collection, this.syncHeaders);
            }
        }
        if (lastSyncUserData?.ref !== remoteUserData.ref) {
            // update last sync
            this.logService.trace(`${this.syncResourceLogLabel}: Updating last synchronized profiles...`);
            await this.updateLastSyncUserData(remoteUserData);
            this.logService.info(`${this.syncResourceLogLabel}: Updated last synchronized profiles.`);
        }
    }
    async updateRemoteProfiles(profiles, ref) {
        return this.updateRemoteUserData(this.stringifyRemoteProfiles(profiles), ref);
    }
    async hasLocalData() {
        return this.getLocalUserDataProfiles().length > 0;
    }
    async resolveContent(uri) {
        if (this.extUri.isEqual(this.remoteResource, uri)
            || this.extUri.isEqual(this.baseResource, uri)
            || this.extUri.isEqual(this.localResource, uri)
            || this.extUri.isEqual(this.acceptedResource, uri)) {
            const content = await this.resolvePreviewContent(uri);
            return content ? toFormattedString(JSON.parse(content), {}) : content;
        }
        return null;
    }
    getLocalUserDataProfiles() {
        return this.userDataProfilesService.profiles.filter(p => !p.isDefault && !p.isTransient);
    }
    stringifyRemoteProfiles(profiles) {
        return JSON.stringify([...profiles].sort((a, b) => a.name.localeCompare(b.name)));
    }
};
UserDataProfilesManifestSynchroniser = __decorate([
    __param(2, IUserDataProfilesService),
    __param(3, IFileService),
    __param(4, IEnvironmentService),
    __param(5, IStorageService),
    __param(6, IUserDataSyncStoreService),
    __param(7, IUserDataSyncLocalStoreService),
    __param(8, IUserDataSyncLogService),
    __param(9, IConfigurationService),
    __param(10, IUserDataSyncEnablementService),
    __param(11, ITelemetryService),
    __param(12, IUriIdentityService)
], UserDataProfilesManifestSynchroniser);
export { UserDataProfilesManifestSynchroniser };
export function stringifyLocalProfiles(profiles, format) {
    const result = [...profiles].sort((a, b) => a.name.localeCompare(b.name)).map(p => ({ id: p.id, name: p.name }));
    return format ? toFormattedString(result, {}) : JSON.stringify(result);
}
export function parseUserDataProfilesManifest(syncData) {
    return JSON.parse(syncData.content);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFQcm9maWxlc01hbmlmZXN0U3luYy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS91c2VyRGF0YVN5bmMvY29tbW9uL3VzZXJEYXRhUHJvZmlsZXNNYW5pZmVzdFN5bmMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFFMUUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDcEYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDOUUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQzNELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUNsRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUN4RSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUM5RSxPQUFPLEVBQW9CLHdCQUF3QixFQUFFLE1BQU0saURBQWlELENBQUM7QUFDN0csT0FBTyxFQUFFLG9CQUFvQixFQUFpRCxNQUFNLDJCQUEyQixDQUFDO0FBQ2hILE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUMzRCxPQUFPLEVBQTJCLDhCQUE4QixFQUF5Qix1QkFBdUIsRUFBRSw4QkFBOEIsRUFBRSx5QkFBeUIsRUFBZ0IscUJBQXFCLEVBQThELGlCQUFpQixFQUF5QixNQUFNLG1CQUFtQixDQUFDO0FBWTNVLElBQU0sb0NBQW9DLEdBQTFDLE1BQU0sb0NBQXFDLFNBQVEsb0JBQW9CO0lBUzdFLFlBQ0MsT0FBeUIsRUFDekIsVUFBOEIsRUFDSix1QkFB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