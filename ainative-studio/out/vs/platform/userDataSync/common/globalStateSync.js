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
import { VSBuffer } from '../../../base/common/buffer.js';
import { getErrorMessage } from '../../../base/common/errors.js';
import { Event } from '../../../base/common/event.js';
import { parse } from '../../../base/common/json.js';
import { toFormattedString } from '../../../base/common/jsonFormatter.js';
import { isWeb } from '../../../base/common/platform.js';
import { generateUuid } from '../../../base/common/uuid.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { IEnvironmentService } from '../../environment/common/environment.js';
import { IFileService } from '../../files/common/files.js';
import { ILogService } from '../../log/common/log.js';
import { getServiceMachineId } from '../../externalServices/common/serviceMachineId.js';
import { IStorageService } from '../../storage/common/storage.js';
import { ITelemetryService } from '../../telemetry/common/telemetry.js';
import { IUriIdentityService } from '../../uriIdentity/common/uriIdentity.js';
import { AbstractInitializer, AbstractSynchroniser, getSyncResourceLogLabel, isSyncData } from './abstractSynchronizer.js';
import { edit } from './content.js';
import { merge } from './globalStateMerge.js';
import { ALL_SYNC_RESOURCES, createSyncHeaders, getEnablementKey, IUserDataSyncLocalStoreService, IUserDataSyncLogService, IUserDataSyncEnablementService, IUserDataSyncStoreService, SYNC_SERVICE_URL_TYPE, UserDataSyncError, USER_DATA_SYNC_SCHEME } from './userDataSync.js';
import { IUserDataProfilesService } from '../../userDataProfile/common/userDataProfile.js';
import { IUserDataProfileStorageService } from '../../userDataProfile/common/userDataProfileStorageService.js';
import { IInstantiationService } from '../../instantiation/common/instantiation.js';
const argvStoragePrefx = 'globalState.argv.';
const argvProperties = ['locale'];
export function stringify(globalState, format) {
    const storageKeys = globalState.storage ? Object.keys(globalState.storage).sort() : [];
    const storage = {};
    storageKeys.forEach(key => storage[key] = globalState.storage[key]);
    globalState.storage = storage;
    return format ? toFormattedString(globalState, {}) : JSON.stringify(globalState);
}
const GLOBAL_STATE_DATA_VERSION = 1;
/**
 * Synchronises global state that includes
 * 	- Global storage with user scope
 * 	- Locale from argv properties
 *
 * Global storage is synced without checking version just like other resources (settings, keybindings).
 * If there is a change in format of the value of a storage key which requires migration then
 * 		Owner of that key should remove that key from user scope and replace that with new user scoped key.
 */
let GlobalStateSynchroniser = class GlobalStateSynchroniser extends AbstractSynchroniser {
    constructor(profile, collection, userDataProfileStorageService, fileService, userDataSyncStoreService, userDataSyncLocalStoreService, logService, environmentService, userDataSyncEnablementService, telemetryService, configurationService, storageService, uriIdentityService, instantiationService) {
        super({ syncResource: "globalState" /* SyncResource.GlobalState */, profile }, collection, fileService, environmentService, storageService, userDataSyncStoreService, userDataSyncLocalStoreService, userDataSyncEnablementService, telemetryService, logService, configurationService, uriIdentityService);
        this.userDataProfileStorageService = userDataProfileStorageService;
        this.version = GLOBAL_STATE_DATA_VERSION;
        this.previewResource = this.extUri.joinPath(this.syncPreviewFolder, 'globalState.json');
        this.baseResource = this.previewResource.with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'base' });
        this.localResource = this.previewResource.with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'local' });
        this.remoteResource = this.previewResource.with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'remote' });
        this.acceptedResource = this.previewResource.with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'accepted' });
        this.localGlobalStateProvider = instantiationService.createInstance(LocalGlobalStateProvider);
        this._register(fileService.watch(this.extUri.dirname(this.environmentService.argvResource)));
        this._register(Event.any(
        /* Locale change */
        Event.filter(fileService.onDidFilesChange, e => e.contains(this.environmentService.argvResource)), Event.filter(userDataProfileStorageService.onDidChange, e => {
            /* StorageTarget has changed in profile storage */
            if (e.targetChanges.some(profile => this.syncResource.profile.id === profile.id)) {
                return true;
            }
            /* User storage data has changed in profile storage */
            if (e.valueChanges.some(({ profile, changes }) => this.syncResource.profile.id === profile.id && changes.some(change => change.target === 0 /* StorageTarget.USER */))) {
                return true;
            }
            return false;
        }))((() => this.triggerLocalChange())));
    }
    async generateSyncPreview(remoteUserData, lastSyncUserData, isRemoteDataFromCurrentMachine) {
        const remoteGlobalState = remoteUserData.syncData ? JSON.parse(remoteUserData.syncData.content) : null;
        // Use remote data as last sync data if last sync data does not exist and remote data is from same machine
        lastSyncUserData = lastSyncUserData === null && isRemoteDataFromCurrentMachine ? remoteUserData : lastSyncUserData;
        const lastSyncGlobalState = lastSyncUserData && lastSyncUserData.syncData ? JSON.parse(lastSyncUserData.syncData.content) : null;
        const localGlobalState = await this.localGlobalStateProvider.getLocalGlobalState(this.syncResource.profile);
        if (remoteGlobalState) {
            this.logService.trace(`${this.syncResourceLogLabel}: Merging remote ui state with local ui state...`);
        }
        else {
            this.logService.trace(`${this.syncResourceLogLabel}: Remote ui state does not exist. Synchronizing ui state for the first time.`);
        }
        const storageKeys = await this.getStorageKeys(lastSyncGlobalState);
        const { local, remote } = merge(localGlobalState.storage, remoteGlobalState ? remoteGlobalState.storage : null, lastSyncGlobalState ? lastSyncGlobalState.storage : null, storageKeys, this.logService);
        const previewResult = {
            content: null,
            local,
            remote,
            localChange: Object.keys(local.added).length > 0 || Object.keys(local.updated).length > 0 || local.removed.length > 0 ? 2 /* Change.Modified */ : 0 /* Change.None */,
            remoteChange: remote.all !== null ? 2 /* Change.Modified */ : 0 /* Change.None */,
        };
        const localContent = stringify(localGlobalState, false);
        return [{
                baseResource: this.baseResource,
                baseContent: lastSyncGlobalState ? stringify(lastSyncGlobalState, false) : localContent,
                localResource: this.localResource,
                localContent,
                localUserData: localGlobalState,
                remoteResource: this.remoteResource,
                remoteContent: remoteGlobalState ? stringify(remoteGlobalState, false) : null,
                previewResource: this.previewResource,
                previewResult,
                localChange: previewResult.localChange,
                remoteChange: previewResult.remoteChange,
                acceptedResource: this.acceptedResource,
                storageKeys
            }];
    }
    async hasRemoteChanged(lastSyncUserData) {
        const lastSyncGlobalState = lastSyncUserData.syncData ? JSON.parse(lastSyncUserData.syncData.content) : null;
        if (lastSyncGlobalState === null) {
            return true;
        }
        const localGlobalState = await this.localGlobalStateProvider.getLocalGlobalState(this.syncResource.profile);
        const storageKeys = await this.getStorageKeys(lastSyncGlobalState);
        const { remote } = merge(localGlobalState.storage, lastSyncGlobalState.storage, lastSyncGlobalState.storage, storageKeys, this.logService);
        return remote.all !== null;
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
        if (resourcePreview.remoteContent !== null) {
            const remoteGlobalState = JSON.parse(resourcePreview.remoteContent);
            const { local, remote } = merge(resourcePreview.localUserData.storage, remoteGlobalState.storage, remoteGlobalState.storage, resourcePreview.storageKeys, this.logService);
            return {
                content: resourcePreview.remoteContent,
                local,
                remote,
                localChange: 0 /* Change.None */,
                remoteChange: remote.all !== null ? 2 /* Change.Modified */ : 0 /* Change.None */,
            };
        }
        else {
            return {
                content: resourcePreview.localContent,
                local: { added: {}, removed: [], updated: {} },
                remote: { added: Object.keys(resourcePreview.localUserData.storage), removed: [], updated: [], all: resourcePreview.localUserData.storage },
                localChange: 0 /* Change.None */,
                remoteChange: 2 /* Change.Modified */,
            };
        }
    }
    async acceptRemote(resourcePreview) {
        if (resourcePreview.remoteContent !== null) {
            const remoteGlobalState = JSON.parse(resourcePreview.remoteContent);
            const { local, remote } = merge(resourcePreview.localUserData.storage, remoteGlobalState.storage, resourcePreview.localUserData.storage, resourcePreview.storageKeys, this.logService);
            return {
                content: resourcePreview.remoteContent,
                local,
                remote,
                localChange: Object.keys(local.added).length > 0 || Object.keys(local.updated).length > 0 || local.removed.length > 0 ? 2 /* Change.Modified */ : 0 /* Change.None */,
                remoteChange: 0 /* Change.None */,
            };
        }
        else {
            return {
                content: resourcePreview.remoteContent,
                local: { added: {}, removed: [], updated: {} },
                remote: { added: [], removed: [], updated: [], all: null },
                localChange: 0 /* Change.None */,
                remoteChange: 0 /* Change.None */,
            };
        }
    }
    async applyResult(remoteUserData, lastSyncUserData, resourcePreviews, force) {
        const { localUserData } = resourcePreviews[0][0];
        const { local, remote, localChange, remoteChange } = resourcePreviews[0][1];
        if (localChange === 0 /* Change.None */ && remoteChange === 0 /* Change.None */) {
            this.logService.info(`${this.syncResourceLogLabel}: No changes found during synchronizing ui state.`);
        }
        if (localChange !== 0 /* Change.None */) {
            // update local
            this.logService.trace(`${this.syncResourceLogLabel}: Updating local ui state...`);
            await this.backupLocal(JSON.stringify(localUserData));
            await this.localGlobalStateProvider.writeLocalGlobalState(local, this.syncResource.profile);
            this.logService.info(`${this.syncResourceLogLabel}: Updated local ui state`);
        }
        if (remoteChange !== 0 /* Change.None */) {
            // update remote
            this.logService.trace(`${this.syncResourceLogLabel}: Updating remote ui state...`);
            const content = JSON.stringify({ storage: remote.all });
            remoteUserData = await this.updateRemoteUserData(content, force ? null : remoteUserData.ref);
            this.logService.info(`${this.syncResourceLogLabel}: Updated remote ui state.${remote.added.length ? ` Added: ${remote.added}.` : ''}${remote.updated.length ? ` Updated: ${remote.updated}.` : ''}${remote.removed.length ? ` Removed: ${remote.removed}.` : ''}`);
        }
        if (lastSyncUserData?.ref !== remoteUserData.ref) {
            // update last sync
            this.logService.trace(`${this.syncResourceLogLabel}: Updating last synchronized ui state...`);
            await this.updateLastSyncUserData(remoteUserData);
            this.logService.info(`${this.syncResourceLogLabel}: Updated last synchronized ui state`);
        }
    }
    async resolveContent(uri) {
        if (this.extUri.isEqual(this.remoteResource, uri)
            || this.extUri.isEqual(this.baseResource, uri)
            || this.extUri.isEqual(this.localResource, uri)
            || this.extUri.isEqual(this.acceptedResource, uri)) {
            const content = await this.resolvePreviewContent(uri);
            return content ? stringify(JSON.parse(content), true) : content;
        }
        return null;
    }
    async hasLocalData() {
        try {
            const { storage } = await this.localGlobalStateProvider.getLocalGlobalState(this.syncResource.profile);
            if (Object.keys(storage).length > 1 || storage[`${argvStoragePrefx}.locale`]?.value !== 'en') {
                return true;
            }
        }
        catch (error) {
            /* ignore error */
        }
        return false;
    }
    async getStorageKeys(lastSyncGlobalState) {
        const storageData = await this.userDataProfileStorageService.readStorageData(this.syncResource.profile);
        const user = [], machine = [];
        for (const [key, value] of storageData) {
            if (value.target === 0 /* StorageTarget.USER */) {
                user.push(key);
            }
            else if (value.target === 1 /* StorageTarget.MACHINE */) {
                machine.push(key);
            }
        }
        const registered = [...user, ...machine];
        const unregistered = lastSyncGlobalState?.storage ? Object.keys(lastSyncGlobalState.storage).filter(key => !key.startsWith(argvStoragePrefx) && !registered.includes(key) && storageData.get(key) !== undefined) : [];
        if (!isWeb) {
            // Following keys are synced only in web. Do not sync these keys in other platforms
            const keysSyncedOnlyInWeb = [...ALL_SYNC_RESOURCES.map(resource => getEnablementKey(resource)), SYNC_SERVICE_URL_TYPE];
            unregistered.push(...keysSyncedOnlyInWeb);
            machine.push(...keysSyncedOnlyInWeb);
        }
        return { user, machine, unregistered };
    }
};
GlobalStateSynchroniser = __decorate([
    __param(2, IUserDataProfileStorageService),
    __param(3, IFileService),
    __param(4, IUserDataSyncStoreService),
    __param(5, IUserDataSyncLocalStoreService),
    __param(6, IUserDataSyncLogService),
    __param(7, IEnvironmentService),
    __param(8, IUserDataSyncEnablementService),
    __param(9, ITelemetryService),
    __param(10, IConfigurationService),
    __param(11, IStorageService),
    __param(12, IUriIdentityService),
    __param(13, IInstantiationService)
], GlobalStateSynchroniser);
export { GlobalStateSynchroniser };
let LocalGlobalStateProvider = class LocalGlobalStateProvider {
    constructor(fileService, environmentService, userDataProfileStorageService, logService) {
        this.fileService = fileService;
        this.environmentService = environmentService;
        this.userDataProfileStorageService = userDataProfileStorageService;
        this.logService = logService;
    }
    async getLocalGlobalState(profile) {
        const storage = {};
        if (profile.isDefault) {
            const argvContent = await this.getLocalArgvContent();
            const argvValue = parse(argvContent);
            for (const argvProperty of argvProperties) {
                if (argvValue[argvProperty] !== undefined) {
                    storage[`${argvStoragePrefx}${argvProperty}`] = { version: 1, value: argvValue[argvProperty] };
                }
            }
        }
        const storageData = await this.userDataProfileStorageService.readStorageData(profile);
        for (const [key, value] of storageData) {
            if (value.value && value.target === 0 /* StorageTarget.USER */) {
                storage[key] = { version: 1, value: value.value };
            }
        }
        return { storage };
    }
    async getLocalArgvContent() {
        try {
            this.logService.debug('GlobalStateSync#getLocalArgvContent', this.environmentService.argvResource);
            const content = await this.fileService.readFile(this.environmentService.argvResource);
            this.logService.debug('GlobalStateSync#getLocalArgvContent - Resolved', this.environmentService.argvResource);
            return content.value.toString();
        }
        catch (error) {
            this.logService.debug(getErrorMessage(error));
        }
        return '{}';
    }
    async writeLocalGlobalState({ added, removed, updated }, profile) {
        const syncResourceLogLabel = getSyncResourceLogLabel("globalState" /* SyncResource.GlobalState */, profile);
        const argv = {};
        const updatedStorage = new Map();
        const storageData = await this.userDataProfileStorageService.readStorageData(profile);
        const handleUpdatedStorage = (keys, storage) => {
            for (const key of keys) {
                if (key.startsWith(argvStoragePrefx)) {
                    argv[key.substring(argvStoragePrefx.length)] = storage ? storage[key].value : undefined;
                    continue;
                }
                if (storage) {
                    const storageValue = storage[key];
                    if (storageValue.value !== storageData.get(key)?.value) {
                        updatedStorage.set(key, storageValue.value);
                    }
                }
                else {
                    if (storageData.get(key) !== undefined) {
                        updatedStorage.set(key, undefined);
                    }
                }
            }
        };
        handleUpdatedStorage(Object.keys(added), added);
        handleUpdatedStorage(Object.keys(updated), updated);
        handleUpdatedStorage(removed);
        if (Object.keys(argv).length) {
            this.logService.trace(`${syncResourceLogLabel}: Updating locale...`);
            const argvContent = await this.getLocalArgvContent();
            let content = argvContent;
            for (const argvProperty of Object.keys(argv)) {
                content = edit(content, [argvProperty], argv[argvProperty], {});
            }
            if (argvContent !== content) {
                this.logService.trace(`${syncResourceLogLabel}: Updating locale...`);
                await this.fileService.writeFile(this.environmentService.argvResource, VSBuffer.fromString(content));
                this.logService.info(`${syncResourceLogLabel}: Updated locale.`);
            }
            this.logService.info(`${syncResourceLogLabel}: Updated locale`);
        }
        if (updatedStorage.size) {
            this.logService.trace(`${syncResourceLogLabel}: Updating global state...`);
            await this.userDataProfileStorageService.updateStorageData(profile, updatedStorage, 0 /* StorageTarget.USER */);
            this.logService.info(`${syncResourceLogLabel}: Updated global state`, [...updatedStorage.keys()]);
        }
    }
};
LocalGlobalStateProvider = __decorate([
    __param(0, IFileService),
    __param(1, IEnvironmentService),
    __param(2, IUserDataProfileStorageService),
    __param(3, IUserDataSyncLogService)
], LocalGlobalStateProvider);
export { LocalGlobalStateProvider };
let GlobalStateInitializer = class GlobalStateInitializer extends AbstractInitializer {
    constructor(storageService, fileService, userDataProfilesService, environmentService, logService, uriIdentityService) {
        super("globalState" /* SyncResource.GlobalState */, userDataProfilesService, environmentService, logService, fileService, storageService, uriIdentityService);
    }
    async doInitialize(remoteUserData) {
        const remoteGlobalState = remoteUserData.syncData ? JSON.parse(remoteUserData.syncData.content) : null;
        if (!remoteGlobalState) {
            this.logService.info('Skipping initializing global state because remote global state does not exist.');
            return;
        }
        const argv = {};
        const storage = {};
        for (const key of Object.keys(remoteGlobalState.storage)) {
            if (key.startsWith(argvStoragePrefx)) {
                argv[key.substring(argvStoragePrefx.length)] = remoteGlobalState.storage[key].value;
            }
            else {
                if (this.storageService.get(key, 0 /* StorageScope.PROFILE */) === undefined) {
                    storage[key] = remoteGlobalState.storage[key].value;
                }
            }
        }
        if (Object.keys(argv).length) {
            let content = '{}';
            try {
                const fileContent = await this.fileService.readFile(this.environmentService.argvResource);
                content = fileContent.value.toString();
            }
            catch (error) { }
            for (const argvProperty of Object.keys(argv)) {
                content = edit(content, [argvProperty], argv[argvProperty], {});
            }
            await this.fileService.writeFile(this.environmentService.argvResource, VSBuffer.fromString(content));
        }
        if (Object.keys(storage).length) {
            const storageEntries = [];
            for (const key of Object.keys(storage)) {
                storageEntries.push({ key, value: storage[key], scope: 0 /* StorageScope.PROFILE */, target: 0 /* StorageTarget.USER */ });
            }
            this.storageService.storeAll(storageEntries, true);
        }
    }
};
GlobalStateInitializer = __decorate([
    __param(0, IStorageService),
    __param(1, IFileService),
    __param(2, IUserDataProfilesService),
    __param(3, IEnvironmentService),
    __param(4, IUserDataSyncLogService),
    __param(5, IUriIdentityService)
], GlobalStateInitializer);
export { GlobalStateInitializer };
let UserDataSyncStoreTypeSynchronizer = class UserDataSyncStoreTypeSynchronizer {
    constructor(userDataSyncStoreClient, storageService, environmentService, fileService, logService) {
        this.userDataSyncStoreClient = userDataSyncStoreClient;
        this.storageService = storageService;
        this.environmentService = environmentService;
        this.fileService = fileService;
        this.logService = logService;
    }
    getSyncStoreType(userData) {
        const remoteGlobalState = this.parseGlobalState(userData);
        return remoteGlobalState?.storage[SYNC_SERVICE_URL_TYPE]?.value;
    }
    async sync(userDataSyncStoreType) {
        const syncHeaders = createSyncHeaders(generateUuid());
        try {
            return await this.doSync(userDataSyncStoreType, syncHeaders);
        }
        catch (e) {
            if (e instanceof UserDataSyncError) {
                switch (e.code) {
                    case "PreconditionFailed" /* UserDataSyncErrorCode.PreconditionFailed */:
                        this.logService.info(`Failed to synchronize UserDataSyncStoreType as there is a new remote version available. Synchronizing again...`);
                        return this.doSync(userDataSyncStoreType, syncHeaders);
                }
            }
            throw e;
        }
    }
    async doSync(userDataSyncStoreType, syncHeaders) {
        // Read the global state from remote
        const globalStateUserData = await this.userDataSyncStoreClient.readResource("globalState" /* SyncResource.GlobalState */, null, undefined, syncHeaders);
        const remoteGlobalState = this.parseGlobalState(globalStateUserData) || { storage: {} };
        // Update the sync store type
        remoteGlobalState.storage[SYNC_SERVICE_URL_TYPE] = { value: userDataSyncStoreType, version: GLOBAL_STATE_DATA_VERSION };
        // Write the global state to remote
        const machineId = await getServiceMachineId(this.environmentService, this.fileService, this.storageService);
        const syncDataToUpdate = { version: GLOBAL_STATE_DATA_VERSION, machineId, content: stringify(remoteGlobalState, false) };
        await this.userDataSyncStoreClient.writeResource("globalState" /* SyncResource.GlobalState */, JSON.stringify(syncDataToUpdate), globalStateUserData.ref, undefined, syncHeaders);
    }
    parseGlobalState({ content }) {
        if (!content) {
            return null;
        }
        const syncData = JSON.parse(content);
        if (isSyncData(syncData)) {
            return syncData ? JSON.parse(syncData.content) : null;
        }
        throw new Error('Invalid remote data');
    }
};
UserDataSyncStoreTypeSynchronizer = __decorate([
    __param(1, IStorageService),
    __param(2, IEnvironmentService),
    __param(3, IFileService),
    __param(4, ILogService)
], UserDataSyncStoreTypeSynchronizer);
export { UserDataSyncStoreTypeSynchronizer };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2xvYmFsU3RhdGVTeW5jLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3VzZXJEYXRhU3luYy9jb21tb24vZ2xvYmFsU3RhdGVTeW5jLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUcxRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDakUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3RELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUNyRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFFekQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBRTVELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUMzRCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDdEQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDeEYsT0FBTyxFQUFpQixlQUFlLEVBQStCLE1BQU0saUNBQWlDLENBQUM7QUFDOUcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDeEUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDOUUsT0FB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