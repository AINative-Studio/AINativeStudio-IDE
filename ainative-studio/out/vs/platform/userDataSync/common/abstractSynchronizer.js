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
import { equals } from '../../../base/common/arrays.js';
import { createCancelablePromise, ThrottledDelayer } from '../../../base/common/async.js';
import { VSBuffer } from '../../../base/common/buffer.js';
import { CancellationToken } from '../../../base/common/cancellation.js';
import { Emitter } from '../../../base/common/event.js';
import { parse } from '../../../base/common/json.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { uppercaseFirstLetter } from '../../../base/common/strings.js';
import { isUndefined } from '../../../base/common/types.js';
import { localize } from '../../../nls.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { IEnvironmentService } from '../../environment/common/environment.js';
import { FileOperationError, IFileService, toFileOperationResult } from '../../files/common/files.js';
import { ILogService } from '../../log/common/log.js';
import { getServiceMachineId } from '../../externalServices/common/serviceMachineId.js';
import { IStorageService } from '../../storage/common/storage.js';
import { ITelemetryService } from '../../telemetry/common/telemetry.js';
import { IUriIdentityService } from '../../uriIdentity/common/uriIdentity.js';
import { getLastSyncResourceUri, IUserDataSyncLocalStoreService, IUserDataSyncLogService, IUserDataSyncEnablementService, IUserDataSyncStoreService, IUserDataSyncUtilService, PREVIEW_DIR_NAME, UserDataSyncError, USER_DATA_SYNC_CONFIGURATION_SCOPE, USER_DATA_SYNC_SCHEME, getPathSegments } from './userDataSync.js';
import { IUserDataProfilesService } from '../../userDataProfile/common/userDataProfile.js';
export function isRemoteUserData(thing) {
    if (thing
        && (thing.ref !== undefined && typeof thing.ref === 'string' && thing.ref !== '')
        && (thing.syncData !== undefined && (thing.syncData === null || isSyncData(thing.syncData)))) {
        return true;
    }
    return false;
}
export function isSyncData(thing) {
    if (thing
        && (thing.version !== undefined && typeof thing.version === 'number')
        && (thing.content !== undefined && typeof thing.content === 'string')) {
        // backward compatibility
        if (Object.keys(thing).length === 2) {
            return true;
        }
        if (Object.keys(thing).length === 3
            && (thing.machineId !== undefined && typeof thing.machineId === 'string')) {
            return true;
        }
    }
    return false;
}
export function getSyncResourceLogLabel(syncResource, profile) {
    return `${uppercaseFirstLetter(syncResource)}${profile.isDefault ? '' : ` (${profile.name})`}`;
}
export var SyncStrategy;
(function (SyncStrategy) {
    SyncStrategy["Preview"] = "preview";
    SyncStrategy["Merge"] = "merge";
    SyncStrategy["PullOrPush"] = "pull-push";
})(SyncStrategy || (SyncStrategy = {}));
let AbstractSynchroniser = class AbstractSynchroniser extends Disposable {
    get status() { return this._status; }
    get conflicts() { return { ...this.syncResource, conflicts: this._conflicts }; }
    constructor(syncResource, collection, fileService, environmentService, storageService, userDataSyncStoreService, userDataSyncLocalStoreService, userDataSyncEnablementService, telemetryService, logService, configurationService, uriIdentityService) {
        super();
        this.syncResource = syncResource;
        this.collection = collection;
        this.fileService = fileService;
        this.environmentService = environmentService;
        this.storageService = storageService;
        this.userDataSyncStoreService = userDataSyncStoreService;
        this.userDataSyncLocalStoreService = userDataSyncLocalStoreService;
        this.userDataSyncEnablementService = userDataSyncEnablementService;
        this.telemetryService = telemetryService;
        this.logService = logService;
        this.configurationService = configurationService;
        this.syncPreviewPromise = null;
        this._status = "idle" /* SyncStatus.Idle */;
        this._onDidChangStatus = this._register(new Emitter());
        this.onDidChangeStatus = this._onDidChangStatus.event;
        this._conflicts = [];
        this._onDidChangeConflicts = this._register(new Emitter());
        this.onDidChangeConflicts = this._onDidChangeConflicts.event;
        this.localChangeTriggerThrottler = this._register(new ThrottledDelayer(50));
        this._onDidChangeLocal = this._register(new Emitter());
        this.onDidChangeLocal = this._onDidChangeLocal.event;
        this.lastSyncUserDataStateKey = `${this.collection ? `${this.collection}.` : ''}${this.syncResource.syncResource}.lastSyncUserData`;
        this.hasSyncResourceStateVersionChanged = false;
        this.syncHeaders = {};
        this.resource = this.syncResource.syncResource;
        this.syncResourceLogLabel = getSyncResourceLogLabel(syncResource.syncResource, syncResource.profile);
        this.extUri = uriIdentityService.extUri;
        this.syncFolder = this.extUri.joinPath(environmentService.userDataSyncHome, ...getPathSegments(syncResource.profile.isDefault ? undefined : syncResource.profile.id, syncResource.syncResource));
        this.syncPreviewFolder = this.extUri.joinPath(this.syncFolder, PREVIEW_DIR_NAME);
        this.lastSyncResource = getLastSyncResourceUri(syncResource.profile.isDefault ? undefined : syncResource.profile.id, syncResource.syncResource, environmentService, this.extUri);
        this.currentMachineIdPromise = getServiceMachineId(environmentService, fileService, storageService);
    }
    triggerLocalChange() {
        this.localChangeTriggerThrottler.trigger(() => this.doTriggerLocalChange());
    }
    async doTriggerLocalChange() {
        // Sync again if current status is in conflicts
        if (this.status === "hasConflicts" /* SyncStatus.HasConflicts */) {
            this.logService.info(`${this.syncResourceLogLabel}: In conflicts state and local change detected. Syncing again...`);
            const preview = await this.syncPreviewPromise;
            this.syncPreviewPromise = null;
            const status = await this.performSync(preview.remoteUserData, preview.lastSyncUserData, "merge" /* SyncStrategy.Merge */, this.getUserDataSyncConfiguration());
            this.setStatus(status);
        }
        // Check if local change causes remote change
        else {
            this.logService.trace(`${this.syncResourceLogLabel}: Checking for local changes...`);
            const lastSyncUserData = await this.getLastSyncUserData();
            const hasRemoteChanged = lastSyncUserData ? await this.hasRemoteChanged(lastSyncUserData) : true;
            if (hasRemoteChanged) {
                this._onDidChangeLocal.fire();
            }
        }
    }
    setStatus(status) {
        if (this._status !== status) {
            this._status = status;
            this._onDidChangStatus.fire(status);
        }
    }
    async sync(manifest, preview = false, userDataSyncConfiguration = this.getUserDataSyncConfiguration(), headers = {}) {
        try {
            this.syncHeaders = { ...headers };
            if (this.status === "hasConflicts" /* SyncStatus.HasConflicts */) {
                this.logService.info(`${this.syncResourceLogLabel}: Skipped synchronizing ${this.resource.toLowerCase()} as there are conflicts.`);
                return this.syncPreviewPromise;
            }
            if (this.status === "syncing" /* SyncStatus.Syncing */) {
                this.logService.info(`${this.syncResourceLogLabel}: Skipped synchronizing ${this.resource.toLowerCase()} as it is running already.`);
                return this.syncPreviewPromise;
            }
            this.logService.trace(`${this.syncResourceLogLabel}: Started synchronizing ${this.resource.toLowerCase()}...`);
            this.setStatus("syncing" /* SyncStatus.Syncing */);
            let status = "idle" /* SyncStatus.Idle */;
            try {
                const lastSyncUserData = await this.getLastSyncUserData();
                const remoteUserData = await this.getLatestRemoteUserData(manifest, lastSyncUserData);
                status = await this.performSync(remoteUserData, lastSyncUserData, preview ? "preview" /* SyncStrategy.Preview */ : "merge" /* SyncStrategy.Merge */, userDataSyncConfiguration);
                if (status === "hasConflicts" /* SyncStatus.HasConflicts */) {
                    this.logService.info(`${this.syncResourceLogLabel}: Detected conflicts while synchronizing ${this.resource.toLowerCase()}.`);
                }
                else if (status === "idle" /* SyncStatus.Idle */) {
                    this.logService.trace(`${this.syncResourceLogLabel}: Finished synchronizing ${this.resource.toLowerCase()}.`);
                }
                return this.syncPreviewPromise || null;
            }
            finally {
                this.setStatus(status);
            }
        }
        finally {
            this.syncHeaders = {};
        }
    }
    async apply(force, headers = {}) {
        try {
            this.syncHeaders = { ...headers };
            const status = await this.doApply(force);
            this.setStatus(status);
            return this.syncPreviewPromise;
        }
        finally {
            this.syncHeaders = {};
        }
    }
    async replace(content) {
        const syncData = this.parseSyncData(content);
        if (!syncData) {
            return false;
        }
        await this.stop();
        try {
            this.logService.trace(`${this.syncResourceLogLabel}: Started resetting ${this.resource.toLowerCase()}...`);
            this.setStatus("syncing" /* SyncStatus.Syncing */);
            const lastSyncUserData = await this.getLastSyncUserData();
            const remoteUserData = await this.getLatestRemoteUserData(null, lastSyncUserData);
            const isRemoteDataFromCurrentMachine = await this.isRemoteDataFromCurrentMachine(remoteUserData);
            /* use replace sync data */
            const resourcePreviewResults = await this.generateSyncPreview({ ref: remoteUserData.ref, syncData }, lastSyncUserData, isRemoteDataFromCurrentMachine, this.getUserDataSyncConfiguration(), CancellationToken.None);
            const resourcePreviews = [];
            for (const resourcePreviewResult of resourcePreviewResults) {
                /* Accept remote resource */
                const acceptResult = await this.getAcceptResult(resourcePreviewResult, resourcePreviewResult.remoteResource, undefined, CancellationToken.None);
                /* compute remote change */
                const { remoteChange } = await this.getAcceptResult(resourcePreviewResult, resourcePreviewResult.previewResource, resourcePreviewResult.remoteContent, CancellationToken.None);
                resourcePreviews.push([resourcePreviewResult, { ...acceptResult, remoteChange: remoteChange !== 0 /* Change.None */ ? remoteChange : 2 /* Change.Modified */ }]);
            }
            await this.applyResult(remoteUserData, lastSyncUserData, resourcePreviews, false);
            this.logService.info(`${this.syncResourceLogLabel}: Finished resetting ${this.resource.toLowerCase()}.`);
        }
        finally {
            this.setStatus("idle" /* SyncStatus.Idle */);
        }
        return true;
    }
    async isRemoteDataFromCurrentMachine(remoteUserData) {
        const machineId = await this.currentMachineIdPromise;
        return !!remoteUserData.syncData?.machineId && remoteUserData.syncData.machineId === machineId;
    }
    async getLatestRemoteUserData(manifest, lastSyncUserData) {
        if (lastSyncUserData) {
            const latestRef = manifest ? manifest[this.resource] : undefined;
            // Last time synced resource and latest resource on server are same
            if (lastSyncUserData.ref === latestRef) {
                return lastSyncUserData;
            }
            // There is no resource on server and last time it was synced with no resource
            if (latestRef === undefined && lastSyncUserData.syncData === null) {
                return lastSyncUserData;
            }
        }
        return this.getRemoteUserData(lastSyncUserData);
    }
    async performSync(remoteUserData, lastSyncUserData, strategy, userDataSyncConfiguration) {
        if (remoteUserData.syncData && remoteUserData.syncData.version > this.version) {
            throw new UserDataSyncError(localize({ key: 'incompatible', comment: ['This is an error while syncing a resource that its local version is not compatible with its remote version.'] }, "Cannot sync {0} as its local version {1} is not compatible with its remote version {2}", this.resource, this.version, remoteUserData.syncData.version), "IncompatibleLocalContent" /* UserDataSyncErrorCode.IncompatibleLocalContent */, this.resource);
        }
        try {
            return await this.doSync(remoteUserData, lastSyncUserData, strategy, userDataSyncConfiguration);
        }
        catch (e) {
            if (e instanceof UserDataSyncError) {
                switch (e.code) {
                    case "LocalPreconditionFailed" /* UserDataSyncErrorCode.LocalPreconditionFailed */:
                        // Rejected as there is a new local version. Syncing again...
                        this.logService.info(`${this.syncResourceLogLabel}: Failed to synchronize ${this.syncResourceLogLabel} as there is a new local version available. Synchronizing again...`);
                        return this.performSync(remoteUserData, lastSyncUserData, strategy, userDataSyncConfiguration);
                    case "Conflict" /* UserDataSyncErrorCode.Conflict */:
                    case "PreconditionFailed" /* UserDataSyncErrorCode.PreconditionFailed */:
                        // Rejected as there is a new remote version. Syncing again...
                        this.logService.info(`${this.syncResourceLogLabel}: Failed to synchronize as there is a new remote version available. Synchronizing again...`);
                        // Avoid cache and get latest remote user data - https://github.com/microsoft/vscode/issues/90624
                        remoteUserData = await this.getRemoteUserData(null);
                        // Get the latest last sync user data. Because multiple parallel syncs (in Web) could share same last sync data
                        // and one of them successfully updated remote and last sync state.
                        lastSyncUserData = await this.getLastSyncUserData();
                        return this.performSync(remoteUserData, lastSyncUserData, "merge" /* SyncStrategy.Merge */, userDataSyncConfiguration);
                }
            }
            throw e;
        }
    }
    async doSync(remoteUserData, lastSyncUserData, strategy, userDataSyncConfiguration) {
        try {
            const isRemoteDataFromCurrentMachine = await this.isRemoteDataFromCurrentMachine(remoteUserData);
            const acceptRemote = !isRemoteDataFromCurrentMachine && lastSyncUserData === null && this.getStoredLastSyncUserDataStateContent() !== undefined;
            const merge = strategy === "preview" /* SyncStrategy.Preview */ || (strategy === "merge" /* SyncStrategy.Merge */ && !acceptRemote);
            const apply = strategy === "merge" /* SyncStrategy.Merge */ || strategy === "pull-push" /* SyncStrategy.PullOrPush */;
            // generate or use existing preview
            if (!this.syncPreviewPromise) {
                this.syncPreviewPromise = createCancelablePromise(token => this.doGenerateSyncResourcePreview(remoteUserData, lastSyncUserData, isRemoteDataFromCurrentMachine, merge, userDataSyncConfiguration, token));
            }
            let preview = await this.syncPreviewPromise;
            if (strategy === "merge" /* SyncStrategy.Merge */ && acceptRemote) {
                this.logService.info(`${this.syncResourceLogLabel}: Accepting remote because it was synced before and the last sync data is not available.`);
                for (const resourcePreview of preview.resourcePreviews) {
                    preview = (await this.accept(resourcePreview.remoteResource)) || preview;
                }
            }
            else if (strategy === "pull-push" /* SyncStrategy.PullOrPush */) {
                for (const resourcePreview of preview.resourcePreviews) {
                    if (resourcePreview.mergeState === "accepted" /* MergeState.Accepted */) {
                        continue;
                    }
                    if (remoteUserData.ref === lastSyncUserData?.ref || isRemoteDataFromCurrentMachine) {
                        preview = (await this.accept(resourcePreview.localResource)) ?? preview;
                    }
                    else {
                        preview = (await this.accept(resourcePreview.remoteResource)) ?? preview;
                    }
                }
            }
            this.updateConflicts(preview.resourcePreviews);
            if (preview.resourcePreviews.some(({ mergeState }) => mergeState === "conflict" /* MergeState.Conflict */)) {
                return "hasConflicts" /* SyncStatus.HasConflicts */;
            }
            if (apply) {
                return await this.doApply(false);
            }
            return "syncing" /* SyncStatus.Syncing */;
        }
        catch (error) {
            // reset preview on error
            this.syncPreviewPromise = null;
            throw error;
        }
    }
    async accept(resource, content) {
        await this.updateSyncResourcePreview(resource, async (resourcePreview) => {
            const acceptResult = await this.getAcceptResult(resourcePreview, resource, content, CancellationToken.None);
            resourcePreview.acceptResult = acceptResult;
            resourcePreview.mergeState = "accepted" /* MergeState.Accepted */;
            resourcePreview.localChange = acceptResult.localChange;
            resourcePreview.remoteChange = acceptResult.remoteChange;
            return resourcePreview;
        });
        return this.syncPreviewPromise;
    }
    async discard(resource) {
        await this.updateSyncResourcePreview(resource, async (resourcePreview) => {
            const mergeResult = await this.getMergeResult(resourcePreview, CancellationToken.None);
            await this.fileService.writeFile(resourcePreview.previewResource, VSBuffer.fromString(mergeResult.content || ''));
            resourcePreview.acceptResult = undefined;
            resourcePreview.mergeState = "preview" /* MergeState.Preview */;
            resourcePreview.localChange = mergeResult.localChange;
            resourcePreview.remoteChange = mergeResult.remoteChange;
            return resourcePreview;
        });
        return this.syncPreviewPromise;
    }
    async updateSyncResourcePreview(resource, updateResourcePreview) {
        if (!this.syncPreviewPromise) {
            return;
        }
        let preview = await this.syncPreviewPromise;
        const index = preview.resourcePreviews.findIndex(({ localResource, remoteResource, previewResource }) => this.extUri.isEqual(localResource, resource) || this.extUri.isEqual(remoteResource, resource) || this.extUri.isEqual(previewResource, resource));
        if (index === -1) {
            return;
        }
        this.syncPreviewPromise = createCancelablePromise(async (token) => {
            const resourcePreviews = [...preview.resourcePreviews];
            resourcePreviews[index] = await updateResourcePreview(resourcePreviews[index]);
            return {
                ...preview,
                resourcePreviews
            };
        });
        preview = await this.syncPreviewPromise;
        this.updateConflicts(preview.resourcePreviews);
        if (preview.resourcePreviews.some(({ mergeState }) => mergeState === "conflict" /* MergeState.Conflict */)) {
            this.setStatus("hasConflicts" /* SyncStatus.HasConflicts */);
        }
        else {
            this.setStatus("syncing" /* SyncStatus.Syncing */);
        }
    }
    async doApply(force) {
        if (!this.syncPreviewPromise) {
            return "idle" /* SyncStatus.Idle */;
        }
        const preview = await this.syncPreviewPromise;
        // check for conflicts
        if (preview.resourcePreviews.some(({ mergeState }) => mergeState === "conflict" /* MergeState.Conflict */)) {
            return "hasConflicts" /* SyncStatus.HasConflicts */;
        }
        // check if all are accepted
        if (preview.resourcePreviews.some(({ mergeState }) => mergeState !== "accepted" /* MergeState.Accepted */)) {
            return "syncing" /* SyncStatus.Syncing */;
        }
        // apply preview
        await this.applyResult(preview.remoteUserData, preview.lastSyncUserData, preview.resourcePreviews.map(resourcePreview => ([resourcePreview, resourcePreview.acceptResult])), force);
        // reset preview
        this.syncPreviewPromise = null;
        // reset preview folder
        await this.clearPreviewFolder();
        return "idle" /* SyncStatus.Idle */;
    }
    async clearPreviewFolder() {
        try {
            await this.fileService.del(this.syncPreviewFolder, { recursive: true });
        }
        catch (error) { /* Ignore */ }
    }
    updateConflicts(resourcePreviews) {
        const conflicts = resourcePreviews.filter(({ mergeState }) => mergeState === "conflict" /* MergeState.Conflict */);
        if (!equals(this._conflicts, conflicts, (a, b) => this.extUri.isEqual(a.previewResource, b.previewResource))) {
            this._conflicts = conflicts;
            this._onDidChangeConflicts.fire(this.conflicts);
        }
    }
    async hasPreviouslySynced() {
        const lastSyncData = await this.getLastSyncUserData();
        return !!lastSyncData && lastSyncData.syncData !== null /* `null` sync data implies resource is not synced */;
    }
    async resolvePreviewContent(uri) {
        const syncPreview = this.syncPreviewPromise ? await this.syncPreviewPromise : null;
        if (syncPreview) {
            for (const resourcePreview of syncPreview.resourcePreviews) {
                if (this.extUri.isEqual(resourcePreview.acceptedResource, uri)) {
                    return resourcePreview.acceptResult ? resourcePreview.acceptResult.content : null;
                }
                if (this.extUri.isEqual(resourcePreview.remoteResource, uri)) {
                    return resourcePreview.remoteContent;
                }
                if (this.extUri.isEqual(resourcePreview.localResource, uri)) {
                    return resourcePreview.localContent;
                }
                if (this.extUri.isEqual(resourcePreview.baseResource, uri)) {
                    return resourcePreview.baseContent;
                }
            }
        }
        return null;
    }
    async resetLocal() {
        this.storageService.remove(this.lastSyncUserDataStateKey, -1 /* StorageScope.APPLICATION */);
        try {
            await this.fileService.del(this.lastSyncResource);
        }
        catch (error) {
            if (toFileOperationResult(error) !== 1 /* FileOperationResult.FILE_NOT_FOUND */) {
                this.logService.error(error);
            }
        }
    }
    async doGenerateSyncResourcePreview(remoteUserData, lastSyncUserData, isRemoteDataFromCurrentMachine, merge, userDataSyncConfiguration, token) {
        const resourcePreviewResults = await this.generateSyncPreview(remoteUserData, lastSyncUserData, isRemoteDataFromCurrentMachine, userDataSyncConfiguration, token);
        const resourcePreviews = [];
        for (const resourcePreviewResult of resourcePreviewResults) {
            const acceptedResource = resourcePreviewResult.previewResource.with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'accepted' });
            /* No change -> Accept */
            if (resourcePreviewResult.localChange === 0 /* Change.None */ && resourcePreviewResult.remoteChange === 0 /* Change.None */) {
                resourcePreviews.push({
                    ...resourcePreviewResult,
                    acceptedResource,
                    acceptResult: { content: null, localChange: 0 /* Change.None */, remoteChange: 0 /* Change.None */ },
                    mergeState: "accepted" /* MergeState.Accepted */
                });
            }
            /* Changed -> Apply ? (Merge ? Conflict | Accept) : Preview */
            else {
                /* Merge */
                const mergeResult = merge ? await this.getMergeResult(resourcePreviewResult, token) : undefined;
                if (token.isCancellationRequested) {
                    break;
                }
                await this.fileService.writeFile(resourcePreviewResult.previewResource, VSBuffer.fromString(mergeResult?.content || ''));
                /* Conflict | Accept */
                const acceptResult = mergeResult && !mergeResult.hasConflicts
                    /* Accept if merged and there are no conflicts */
                    ? await this.getAcceptResult(resourcePreviewResult, resourcePreviewResult.previewResource, undefined, token)
                    : undefined;
                resourcePreviews.push({
                    ...resourcePreviewResult,
                    acceptResult,
                    mergeState: mergeResult?.hasConflicts ? "conflict" /* MergeState.Conflict */ : acceptResult ? "accepted" /* MergeState.Accepted */ : "preview" /* MergeState.Preview */,
                    localChange: acceptResult ? acceptResult.localChange : mergeResult ? mergeResult.localChange : resourcePreviewResult.localChange,
                    remoteChange: acceptResult ? acceptResult.remoteChange : mergeResult ? mergeResult.remoteChange : resourcePreviewResult.remoteChange
                });
            }
        }
        return { syncResource: this.resource, profile: this.syncResource.profile, remoteUserData, lastSyncUserData, resourcePreviews, isLastSyncFromCurrentMachine: isRemoteDataFromCurrentMachine };
    }
    async getLastSyncUserData() {
        const storedLastSyncUserDataStateContent = this.getStoredLastSyncUserDataStateContent();
        // Last Sync Data state does not exist
        if (!storedLastSyncUserDataStateContent) {
            this.logService.info(`${this.syncResourceLogLabel}: Last sync data state does not exist.`);
            return null;
        }
        const lastSyncUserDataState = JSON.parse(storedLastSyncUserDataStateContent);
        const resourceSyncStateVersion = this.userDataSyncEnablementService.getResourceSyncStateVersion(this.resource);
        this.hasSyncResourceStateVersionChanged = !!lastSyncUserDataState.version && !!resourceSyncStateVersion && lastSyncUserDataState.version !== resourceSyncStateVersion;
        if (this.hasSyncResourceStateVersionChanged) {
            this.logService.info(`${this.syncResourceLogLabel}: Reset last sync state because last sync state version ${lastSyncUserDataState.version} is not compatible with current sync state version ${resourceSyncStateVersion}.`);
            await this.resetLocal();
            return null;
        }
        let syncData = undefined;
        // Get Last Sync Data from Local
        let retrial = 1;
        while (syncData === undefined && retrial++ < 6 /* Retry 5 times */) {
            try {
                const lastSyncStoredRemoteUserData = await this.readLastSyncStoredRemoteUserData();
                if (lastSyncStoredRemoteUserData) {
                    if (lastSyncStoredRemoteUserData.ref === lastSyncUserDataState.ref) {
                        syncData = lastSyncStoredRemoteUserData.syncData;
                    }
                    else {
                        this.logService.info(`${this.syncResourceLogLabel}: Last sync data stored locally is not same as the last sync state.`);
                    }
                }
                break;
            }
            catch (error) {
                if (error instanceof FileOperationError && error.fileOperationResult === 1 /* FileOperationResult.FILE_NOT_FOUND */) {
                    this.logService.info(`${this.syncResourceLogLabel}: Last sync resource does not exist locally.`);
                    break;
                }
                else if (error instanceof UserDataSyncError) {
                    throw error;
                }
                else {
                    // log and retry
                    this.logService.error(error, retrial);
                }
            }
        }
        // Get Last Sync Data from Remote
        if (syncData === undefined) {
            try {
                const content = await this.userDataSyncStoreService.resolveResourceContent(this.resource, lastSyncUserDataState.ref, this.collection, this.syncHeaders);
                syncData = content === null ? null : this.parseSyncData(content);
                await this.writeLastSyncStoredRemoteUserData({ ref: lastSyncUserDataState.ref, syncData });
            }
            catch (error) {
                if (error instanceof UserDataSyncError && error.code === "NotFound" /* UserDataSyncErrorCode.NotFound */) {
                    this.logService.info(`${this.syncResourceLogLabel}: Last sync resource does not exist remotely.`);
                }
                else {
                    throw error;
                }
            }
        }
        // Last Sync Data Not Found
        if (syncData === undefined) {
            return null;
        }
        return {
            ...lastSyncUserDataState,
            syncData,
        };
    }
    async updateLastSyncUserData(lastSyncRemoteUserData, additionalProps = {}) {
        if (additionalProps['ref'] || additionalProps['version']) {
            throw new Error('Cannot have core properties as additional');
        }
        const version = this.userDataSyncEnablementService.getResourceSyncStateVersion(this.resource);
        const lastSyncUserDataState = {
            ref: lastSyncRemoteUserData.ref,
            version,
            ...additionalProps
        };
        this.storageService.store(this.lastSyncUserDataStateKey, JSON.stringify(lastSyncUserDataState), -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        await this.writeLastSyncStoredRemoteUserData(lastSyncRemoteUserData);
    }
    getStoredLastSyncUserDataStateContent() {
        return this.storageService.get(this.lastSyncUserDataStateKey, -1 /* StorageScope.APPLICATION */);
    }
    async readLastSyncStoredRemoteUserData() {
        const content = (await this.fileService.readFile(this.lastSyncResource)).value.toString();
        try {
            const lastSyncStoredRemoteUserData = content ? JSON.parse(content) : undefined;
            if (isRemoteUserData(lastSyncStoredRemoteUserData)) {
                return lastSyncStoredRemoteUserData;
            }
        }
        catch (e) {
            this.logService.error(e);
        }
        return undefined;
    }
    async writeLastSyncStoredRemoteUserData(lastSyncRemoteUserData) {
        await this.fileService.writeFile(this.lastSyncResource, VSBuffer.fromString(JSON.stringify(lastSyncRemoteUserData)));
    }
    async getRemoteUserData(lastSyncData) {
        const { ref, content } = await this.getUserData(lastSyncData);
        let syncData = null;
        if (content !== null) {
            syncData = this.parseSyncData(content);
        }
        return { ref, syncData };
    }
    parseSyncData(content) {
        try {
            const syncData = JSON.parse(content);
            if (isSyncData(syncData)) {
                return syncData;
            }
        }
        catch (error) {
            this.logService.error(error);
        }
        throw new UserDataSyncError(localize('incompatible sync data', "Cannot parse sync data as it is not compatible with the current version."), "IncompatibleRemoteContent" /* UserDataSyncErrorCode.IncompatibleRemoteContent */, this.resource);
    }
    async getUserData(lastSyncData) {
        const lastSyncUserData = lastSyncData ? { ref: lastSyncData.ref, content: lastSyncData.syncData ? JSON.stringify(lastSyncData.syncData) : null } : null;
        return this.userDataSyncStoreService.readResource(this.resource, lastSyncUserData, this.collection, this.syncHeaders);
    }
    async updateRemoteUserData(content, ref) {
        const machineId = await this.currentMachineIdPromise;
        const syncData = { version: this.version, machineId, content };
        try {
            ref = await this.userDataSyncStoreService.writeResource(this.resource, JSON.stringify(syncData), ref, this.collection, this.syncHeaders);
            return { ref, syncData };
        }
        catch (error) {
            if (error instanceof UserDataSyncError && error.code === "TooLarge" /* UserDataSyncErrorCode.TooLarge */) {
                error = new UserDataSyncError(error.message, error.code, this.resource);
            }
            throw error;
        }
    }
    async backupLocal(content) {
        const syncData = { version: this.version, content };
        return this.userDataSyncLocalStoreService.writeResource(this.resource, JSON.stringify(syncData), new Date(), this.syncResource.profile.isDefault ? undefined : this.syncResource.profile.id);
    }
    async stop() {
        if (this.status === "idle" /* SyncStatus.Idle */) {
            return;
        }
        this.logService.trace(`${this.syncResourceLogLabel}: Stopping synchronizing ${this.resource.toLowerCase()}.`);
        if (this.syncPreviewPromise) {
            this.syncPreviewPromise.cancel();
            this.syncPreviewPromise = null;
        }
        this.updateConflicts([]);
        await this.clearPreviewFolder();
        this.setStatus("idle" /* SyncStatus.Idle */);
        this.logService.info(`${this.syncResourceLogLabel}: Stopped synchronizing ${this.resource.toLowerCase()}.`);
    }
    getUserDataSyncConfiguration() {
        return this.configurationService.getValue(USER_DATA_SYNC_CONFIGURATION_SCOPE);
    }
};
AbstractSynchroniser = __decorate([
    __param(2, IFileService),
    __param(3, IEnvironmentService),
    __param(4, IStorageService),
    __param(5, IUserDataSyncStoreService),
    __param(6, IUserDataSyncLocalStoreService),
    __param(7, IUserDataSyncEnablementService),
    __param(8, ITelemetryService),
    __param(9, IUserDataSyncLogService),
    __param(10, IConfigurationService),
    __param(11, IUriIdentityService)
], AbstractSynchroniser);
export { AbstractSynchroniser };
let AbstractFileSynchroniser = class AbstractFileSynchroniser extends AbstractSynchroniser {
    constructor(file, syncResource, collection, fileService, environmentService, storageService, userDataSyncStoreService, userDataSyncLocalStoreService, userDataSyncEnablementService, telemetryService, logService, configurationService, uriIdentityService) {
        super(syncResource, collection, fileService, environmentService, storageService, userDataSyncStoreService, userDataSyncLocalStoreService, userDataSyncEnablementService, telemetryService, logService, configurationService, uriIdentityService);
        this.file = file;
        this._register(this.fileService.watch(this.extUri.dirname(file)));
        this._register(this.fileService.onDidFilesChange(e => this.onFileChanges(e)));
    }
    async getLocalFileContent() {
        try {
            return await this.fileService.readFile(this.file);
        }
        catch (error) {
            return null;
        }
    }
    async updateLocalFileContent(newContent, oldContent, force) {
        try {
            if (oldContent) {
                // file exists already
                await this.fileService.writeFile(this.file, VSBuffer.fromString(newContent), force ? undefined : oldContent);
            }
            else {
                // file does not exist
                await this.fileService.createFile(this.file, VSBuffer.fromString(newContent), { overwrite: force });
            }
        }
        catch (e) {
            if ((e instanceof FileOperationError && e.fileOperationResult === 1 /* FileOperationResult.FILE_NOT_FOUND */) ||
                (e instanceof FileOperationError && e.fileOperationResult === 3 /* FileOperationResult.FILE_MODIFIED_SINCE */)) {
                throw new UserDataSyncError(e.message, "LocalPreconditionFailed" /* UserDataSyncErrorCode.LocalPreconditionFailed */);
            }
            else {
                throw e;
            }
        }
    }
    async deleteLocalFile() {
        try {
            await this.fileService.del(this.file);
        }
        catch (e) {
            if (!(e instanceof FileOperationError && e.fileOperationResult === 1 /* FileOperationResult.FILE_NOT_FOUND */)) {
                throw e;
            }
        }
    }
    onFileChanges(e) {
        if (!e.contains(this.file)) {
            return;
        }
        this.triggerLocalChange();
    }
};
AbstractFileSynchroniser = __decorate([
    __param(3, IFileService),
    __param(4, IEnvironmentService),
    __param(5, IStorageService),
    __param(6, IUserDataSyncStoreService),
    __param(7, IUserDataSyncLocalStoreService),
    __param(8, IUserDataSyncEnablementService),
    __param(9, ITelemetryService),
    __param(10, IUserDataSyncLogService),
    __param(11, IConfigurationService),
    __param(12, IUriIdentityService)
], AbstractFileSynchroniser);
export { AbstractFileSynchroniser };
let AbstractJsonFileSynchroniser = class AbstractJsonFileSynchroniser extends AbstractFileSynchroniser {
    constructor(file, syncResource, collection, fileService, environmentService, storageService, userDataSyncStoreService, userDataSyncLocalStoreService, userDataSyncEnablementService, telemetryService, logService, userDataSyncUtilService, configurationService, uriIdentityService) {
        super(file, syncResource, collection, fileService, environmentService, storageService, userDataSyncStoreService, userDataSyncLocalStoreService, userDataSyncEnablementService, telemetryService, logService, configurationService, uriIdentityService);
        this.userDataSyncUtilService = userDataSyncUtilService;
        this._formattingOptions = undefined;
    }
    hasErrors(content, isArray) {
        const parseErrors = [];
        const result = parse(content, parseErrors, { allowEmptyContent: true, allowTrailingComma: true });
        return parseErrors.length > 0 || (!isUndefined(result) && isArray !== Array.isArray(result));
    }
    getFormattingOptions() {
        if (!this._formattingOptions) {
            this._formattingOptions = this.userDataSyncUtilService.resolveFormattingOptions(this.file);
        }
        return this._formattingOptions;
    }
};
AbstractJsonFileSynchroniser = __decorate([
    __param(3, IFileService),
    __param(4, IEnvironmentService),
    __param(5, IStorageService),
    __param(6, IUserDataSyncStoreService),
    __param(7, IUserDataSyncLocalStoreService),
    __param(8, IUserDataSyncEnablementService),
    __param(9, ITelemetryService),
    __param(10, IUserDataSyncLogService),
    __param(11, IUserDataSyncUtilService),
    __param(12, IConfigurationService),
    __param(13, IUriIdentityService)
], AbstractJsonFileSynchroniser);
export { AbstractJsonFileSynchroniser };
let AbstractInitializer = class AbstractInitializer {
    constructor(resource, userDataProfilesService, environmentService, logService, fileService, storageService, uriIdentityService) {
        this.resource = resource;
        this.userDataProfilesService = userDataProfilesService;
        this.environmentService = environmentService;
        this.logService = logService;
        this.fileService = fileService;
        this.storageService = storageService;
        this.extUri = uriIdentityService.extUri;
        this.lastSyncResource = getLastSyncResourceUri(undefined, this.resource, environmentService, this.extUri);
    }
    async initialize({ ref, content }) {
        if (!content) {
            this.logService.info('Remote content does not exist.', this.resource);
            return;
        }
        const syncData = this.parseSyncData(content);
        if (!syncData) {
            return;
        }
        try {
            await this.doInitialize({ ref, syncData });
        }
        catch (error) {
            this.logService.error(error);
        }
    }
    parseSyncData(content) {
        try {
            const syncData = JSON.parse(content);
            if (isSyncData(syncData)) {
                return syncData;
            }
        }
        catch (error) {
            this.logService.error(error);
        }
        this.logService.info('Cannot parse sync data as it is not compatible with the current version.', this.resource);
        return undefined;
    }
    async updateLastSyncUserData(lastSyncRemoteUserData, additionalProps = {}) {
        if (additionalProps['ref'] || additionalProps['version']) {
            throw new Error('Cannot have core properties as additional');
        }
        const lastSyncUserDataState = {
            ref: lastSyncRemoteUserData.ref,
            version: undefined,
            ...additionalProps
        };
        this.storageService.store(`${this.resource}.lastSyncUserData`, JSON.stringify(lastSyncUserDataState), -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        await this.fileService.writeFile(this.lastSyncResource, VSBuffer.fromString(JSON.stringify(lastSyncRemoteUserData)));
    }
};
AbstractInitializer = __decorate([
    __param(1, IUserDataProfilesService),
    __param(2, IEnvironmentService),
    __param(3, ILogService),
    __param(4, IFileService),
    __param(5, IStorageService),
    __param(6, IUriIdentityService)
], AbstractInitializer);
export { AbstractInitializer };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWJzdHJhY3RTeW5jaHJvbml6ZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS91c2VyRGF0YVN5bmMvY29tbW9uL2Fic3RyYWN0U3luY2hyb25pemVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUN4RCxPQUFPLEVBQXFCLHVCQUF1QixFQUFFLGdCQUFnQixFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDN0csT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQzFELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRXpFLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSwrQkFBK0IsQ0FBQztBQUMvRCxPQUFPLEVBQUUsS0FBSyxFQUFjLE1BQU0sOEJBQThCLENBQUM7QUFFakUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBRS9ELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUc1RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDM0MsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDcEYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDOUUsT0FBTyxFQUFvQixrQkFBa0IsRUFBcUMsWUFBWSxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDM0osT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBQ3RELE9B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