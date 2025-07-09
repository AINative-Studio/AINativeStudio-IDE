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
import { Event } from '../../../base/common/event.js';
import { deepClone } from '../../../base/common/objects.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { IEnvironmentService } from '../../environment/common/environment.js';
import { FileOperationError, IFileService } from '../../files/common/files.js';
import { IStorageService } from '../../storage/common/storage.js';
import { ITelemetryService } from '../../telemetry/common/telemetry.js';
import { IUriIdentityService } from '../../uriIdentity/common/uriIdentity.js';
import { IUserDataProfilesService } from '../../userDataProfile/common/userDataProfile.js';
import { AbstractInitializer, AbstractSynchroniser } from './abstractSynchronizer.js';
import { areSame, merge } from './snippetsMerge.js';
import { IUserDataSyncLocalStoreService, IUserDataSyncLogService, IUserDataSyncEnablementService, IUserDataSyncStoreService, USER_DATA_SYNC_SCHEME } from './userDataSync.js';
export function parseSnippets(syncData) {
    return JSON.parse(syncData.content);
}
let SnippetsSynchroniser = class SnippetsSynchroniser extends AbstractSynchroniser {
    constructor(profile, collection, environmentService, fileService, storageService, userDataSyncStoreService, userDataSyncLocalStoreService, logService, configurationService, userDataSyncEnablementService, telemetryService, uriIdentityService) {
        super({ syncResource: "snippets" /* SyncResource.Snippets */, profile }, collection, fileService, environmentService, storageService, userDataSyncStoreService, userDataSyncLocalStoreService, userDataSyncEnablementService, telemetryService, logService, configurationService, uriIdentityService);
        this.version = 1;
        this.snippetsFolder = profile.snippetsHome;
        this._register(this.fileService.watch(environmentService.userRoamingDataHome));
        this._register(this.fileService.watch(this.snippetsFolder));
        this._register(Event.filter(this.fileService.onDidFilesChange, e => e.affects(this.snippetsFolder))(() => this.triggerLocalChange()));
    }
    async generateSyncPreview(remoteUserData, lastSyncUserData, isRemoteDataFromCurrentMachine) {
        const local = await this.getSnippetsFileContents();
        const localSnippets = this.toSnippetsContents(local);
        const remoteSnippets = remoteUserData.syncData ? this.parseSnippets(remoteUserData.syncData) : null;
        // Use remote data as last sync data if last sync data does not exist and remote data is from same machine
        lastSyncUserData = lastSyncUserData === null && isRemoteDataFromCurrentMachine ? remoteUserData : lastSyncUserData;
        const lastSyncSnippets = lastSyncUserData && lastSyncUserData.syncData ? this.parseSnippets(lastSyncUserData.syncData) : null;
        if (remoteSnippets) {
            this.logService.trace(`${this.syncResourceLogLabel}: Merging remote snippets with local snippets...`);
        }
        else {
            this.logService.trace(`${this.syncResourceLogLabel}: Remote snippets does not exist. Synchronizing snippets for the first time.`);
        }
        const mergeResult = merge(localSnippets, remoteSnippets, lastSyncSnippets);
        return this.getResourcePreviews(mergeResult, local, remoteSnippets || {}, lastSyncSnippets || {});
    }
    async hasRemoteChanged(lastSyncUserData) {
        const lastSyncSnippets = lastSyncUserData.syncData ? this.parseSnippets(lastSyncUserData.syncData) : null;
        if (lastSyncSnippets === null) {
            return true;
        }
        const local = await this.getSnippetsFileContents();
        const localSnippets = this.toSnippetsContents(local);
        const mergeResult = merge(localSnippets, lastSyncSnippets, lastSyncSnippets);
        return Object.keys(mergeResult.remote.added).length > 0 || Object.keys(mergeResult.remote.updated).length > 0 || mergeResult.remote.removed.length > 0 || mergeResult.conflicts.length > 0;
    }
    async getMergeResult(resourcePreview, token) {
        return resourcePreview.previewResult;
    }
    async getAcceptResult(resourcePreview, resource, content, token) {
        /* Accept local resource */
        if (this.extUri.isEqualOrParent(resource, this.syncPreviewFolder.with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'local' }))) {
            return {
                content: resourcePreview.fileContent ? resourcePreview.fileContent.value.toString() : null,
                localChange: 0 /* Change.None */,
                remoteChange: resourcePreview.fileContent
                    ? resourcePreview.remoteContent !== null ? 2 /* Change.Modified */ : 1 /* Change.Added */
                    : 3 /* Change.Deleted */
            };
        }
        /* Accept remote resource */
        if (this.extUri.isEqualOrParent(resource, this.syncPreviewFolder.with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'remote' }))) {
            return {
                content: resourcePreview.remoteContent,
                localChange: resourcePreview.remoteContent !== null
                    ? resourcePreview.fileContent ? 2 /* Change.Modified */ : 1 /* Change.Added */
                    : 3 /* Change.Deleted */,
                remoteChange: 0 /* Change.None */,
            };
        }
        /* Accept preview resource */
        if (this.extUri.isEqualOrParent(resource, this.syncPreviewFolder)) {
            if (content === undefined) {
                return {
                    content: resourcePreview.previewResult.content,
                    localChange: resourcePreview.previewResult.localChange,
                    remoteChange: resourcePreview.previewResult.remoteChange,
                };
            }
            else {
                return {
                    content,
                    localChange: content === null
                        ? resourcePreview.fileContent !== null ? 3 /* Change.Deleted */ : 0 /* Change.None */
                        : 2 /* Change.Modified */,
                    remoteChange: content === null
                        ? resourcePreview.remoteContent !== null ? 3 /* Change.Deleted */ : 0 /* Change.None */
                        : 2 /* Change.Modified */
                };
            }
        }
        throw new Error(`Invalid Resource: ${resource.toString()}`);
    }
    async applyResult(remoteUserData, lastSyncUserData, resourcePreviews, force) {
        const accptedResourcePreviews = resourcePreviews.map(([resourcePreview, acceptResult]) => ({ ...resourcePreview, acceptResult }));
        if (accptedResourcePreviews.every(({ localChange, remoteChange }) => localChange === 0 /* Change.None */ && remoteChange === 0 /* Change.None */)) {
            this.logService.info(`${this.syncResourceLogLabel}: No changes found during synchronizing snippets.`);
        }
        if (accptedResourcePreviews.some(({ localChange }) => localChange !== 0 /* Change.None */)) {
            // back up all snippets
            await this.updateLocalBackup(accptedResourcePreviews);
            await this.updateLocalSnippets(accptedResourcePreviews, force);
        }
        if (accptedResourcePreviews.some(({ remoteChange }) => remoteChange !== 0 /* Change.None */)) {
            remoteUserData = await this.updateRemoteSnippets(accptedResourcePreviews, remoteUserData, force);
        }
        if (lastSyncUserData?.ref !== remoteUserData.ref) {
            // update last sync
            this.logService.trace(`${this.syncResourceLogLabel}: Updating last synchronized snippets...`);
            await this.updateLastSyncUserData(remoteUserData);
            this.logService.info(`${this.syncResourceLogLabel}: Updated last synchronized snippets`);
        }
        for (const { previewResource } of accptedResourcePreviews) {
            // Delete the preview
            try {
                await this.fileService.del(previewResource);
            }
            catch (e) { /* ignore */ }
        }
    }
    getResourcePreviews(snippetsMergeResult, localFileContent, remoteSnippets, baseSnippets) {
        const resourcePreviews = new Map();
        /* Snippets added remotely -> add locally */
        for (const key of Object.keys(snippetsMergeResult.local.added)) {
            const previewResult = {
                content: snippetsMergeResult.local.added[key],
                hasConflicts: false,
                localChange: 1 /* Change.Added */,
                remoteChange: 0 /* Change.None */,
            };
            resourcePreviews.set(key, {
                baseResource: this.extUri.joinPath(this.syncPreviewFolder, key).with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'base' }),
                baseContent: null,
                fileContent: null,
                localResource: this.extUri.joinPath(this.syncPreviewFolder, key).with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'local' }),
                localContent: null,
                remoteResource: this.extUri.joinPath(this.syncPreviewFolder, key).with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'remote' }),
                remoteContent: remoteSnippets[key],
                previewResource: this.extUri.joinPath(this.syncPreviewFolder, key),
                previewResult,
                localChange: previewResult.localChange,
                remoteChange: previewResult.remoteChange,
                acceptedResource: this.extUri.joinPath(this.syncPreviewFolder, key).with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'accepted' })
            });
        }
        /* Snippets updated remotely -> update locally */
        for (const key of Object.keys(snippetsMergeResult.local.updated)) {
            const previewResult = {
                content: snippetsMergeResult.local.updated[key],
                hasConflicts: false,
                localChange: 2 /* Change.Modified */,
                remoteChange: 0 /* Change.None */,
            };
            const localContent = localFileContent[key] ? localFileContent[key].value.toString() : null;
            resourcePreviews.set(key, {
                baseResource: this.extUri.joinPath(this.syncPreviewFolder, key).with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'base' }),
                baseContent: baseSnippets[key] ?? null,
                localResource: this.extUri.joinPath(this.syncPreviewFolder, key).with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'local' }),
                fileContent: localFileContent[key],
                localContent,
                remoteResource: this.extUri.joinPath(this.syncPreviewFolder, key).with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'remote' }),
                remoteContent: remoteSnippets[key],
                previewResource: this.extUri.joinPath(this.syncPreviewFolder, key),
                previewResult,
                localChange: previewResult.localChange,
                remoteChange: previewResult.remoteChange,
                acceptedResource: this.extUri.joinPath(this.syncPreviewFolder, key).with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'accepted' })
            });
        }
        /* Snippets removed remotely -> remove locally */
        for (const key of snippetsMergeResult.local.removed) {
            const previewResult = {
                content: null,
                hasConflicts: false,
                localChange: 3 /* Change.Deleted */,
                remoteChange: 0 /* Change.None */,
            };
            const localContent = localFileContent[key] ? localFileContent[key].value.toString() : null;
            resourcePreviews.set(key, {
                baseResource: this.extUri.joinPath(this.syncPreviewFolder, key).with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'base' }),
                baseContent: baseSnippets[key] ?? null,
                localResource: this.extUri.joinPath(this.syncPreviewFolder, key).with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'local' }),
                fileContent: localFileContent[key],
                localContent,
                remoteResource: this.extUri.joinPath(this.syncPreviewFolder, key).with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'remote' }),
                remoteContent: null,
                previewResource: this.extUri.joinPath(this.syncPreviewFolder, key),
                previewResult,
                localChange: previewResult.localChange,
                remoteChange: previewResult.remoteChange,
                acceptedResource: this.extUri.joinPath(this.syncPreviewFolder, key).with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'accepted' })
            });
        }
        /* Snippets added locally -> add remotely */
        for (const key of Object.keys(snippetsMergeResult.remote.added)) {
            const previewResult = {
                content: snippetsMergeResult.remote.added[key],
                hasConflicts: false,
                localChange: 0 /* Change.None */,
                remoteChange: 1 /* Change.Added */,
            };
            const localContent = localFileContent[key] ? localFileContent[key].value.toString() : null;
            resourcePreviews.set(key, {
                baseResource: this.extUri.joinPath(this.syncPreviewFolder, key).with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'base' }),
                baseContent: baseSnippets[key] ?? null,
                localResource: this.extUri.joinPath(this.syncPreviewFolder, key).with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'local' }),
                fileContent: localFileContent[key],
                localContent,
                remoteResource: this.extUri.joinPath(this.syncPreviewFolder, key).with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'remote' }),
                remoteContent: null,
                previewResource: this.extUri.joinPath(this.syncPreviewFolder, key),
                previewResult,
                localChange: previewResult.localChange,
                remoteChange: previewResult.remoteChange,
                acceptedResource: this.extUri.joinPath(this.syncPreviewFolder, key).with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'accepted' })
            });
        }
        /* Snippets updated locally -> update remotely */
        for (const key of Object.keys(snippetsMergeResult.remote.updated)) {
            const previewResult = {
                content: snippetsMergeResult.remote.updated[key],
                hasConflicts: false,
                localChange: 0 /* Change.None */,
                remoteChange: 2 /* Change.Modified */,
            };
            const localContent = localFileContent[key] ? localFileContent[key].value.toString() : null;
            resourcePreviews.set(key, {
                baseResource: this.extUri.joinPath(this.syncPreviewFolder, key).with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'base' }),
                baseContent: baseSnippets[key] ?? null,
                localResource: this.extUri.joinPath(this.syncPreviewFolder, key).with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'local' }),
                fileContent: localFileContent[key],
                localContent,
                remoteResource: this.extUri.joinPath(this.syncPreviewFolder, key).with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'remote' }),
                remoteContent: remoteSnippets[key],
                previewResource: this.extUri.joinPath(this.syncPreviewFolder, key),
                previewResult,
                localChange: previewResult.localChange,
                remoteChange: previewResult.remoteChange,
                acceptedResource: this.extUri.joinPath(this.syncPreviewFolder, key).with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'accepted' })
            });
        }
        /* Snippets removed locally -> remove remotely */
        for (const key of snippetsMergeResult.remote.removed) {
            const previewResult = {
                content: null,
                hasConflicts: false,
                localChange: 0 /* Change.None */,
                remoteChange: 3 /* Change.Deleted */,
            };
            resourcePreviews.set(key, {
                baseResource: this.extUri.joinPath(this.syncPreviewFolder, key).with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'base' }),
                baseContent: baseSnippets[key] ?? null,
                localResource: this.extUri.joinPath(this.syncPreviewFolder, key).with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'local' }),
                fileContent: null,
                localContent: null,
                remoteResource: this.extUri.joinPath(this.syncPreviewFolder, key).with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'remote' }),
                remoteContent: remoteSnippets[key],
                previewResource: this.extUri.joinPath(this.syncPreviewFolder, key),
                previewResult,
                localChange: previewResult.localChange,
                remoteChange: previewResult.remoteChange,
                acceptedResource: this.extUri.joinPath(this.syncPreviewFolder, key).with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'accepted' })
            });
        }
        /* Snippets with conflicts */
        for (const key of snippetsMergeResult.conflicts) {
            const previewResult = {
                content: baseSnippets[key] ?? null,
                hasConflicts: true,
                localChange: localFileContent[key] ? 2 /* Change.Modified */ : 1 /* Change.Added */,
                remoteChange: remoteSnippets[key] ? 2 /* Change.Modified */ : 1 /* Change.Added */
            };
            const localContent = localFileContent[key] ? localFileContent[key].value.toString() : null;
            resourcePreviews.set(key, {
                baseResource: this.extUri.joinPath(this.syncPreviewFolder, key).with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'base' }),
                baseContent: baseSnippets[key] ?? null,
                localResource: this.extUri.joinPath(this.syncPreviewFolder, key).with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'local' }),
                fileContent: localFileContent[key] || null,
                localContent,
                remoteResource: this.extUri.joinPath(this.syncPreviewFolder, key).with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'remote' }),
                remoteContent: remoteSnippets[key] || null,
                previewResource: this.extUri.joinPath(this.syncPreviewFolder, key),
                previewResult,
                localChange: previewResult.localChange,
                remoteChange: previewResult.remoteChange,
                acceptedResource: this.extUri.joinPath(this.syncPreviewFolder, key).with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'accepted' })
            });
        }
        /* Unmodified Snippets */
        for (const key of Object.keys(localFileContent)) {
            if (!resourcePreviews.has(key)) {
                const previewResult = {
                    content: localFileContent[key] ? localFileContent[key].value.toString() : null,
                    hasConflicts: false,
                    localChange: 0 /* Change.None */,
                    remoteChange: 0 /* Change.None */
                };
                const localContent = localFileContent[key] ? localFileContent[key].value.toString() : null;
                resourcePreviews.set(key, {
                    baseResource: this.extUri.joinPath(this.syncPreviewFolder, key).with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'base' }),
                    baseContent: baseSnippets[key] ?? null,
                    localResource: this.extUri.joinPath(this.syncPreviewFolder, key).with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'local' }),
                    fileContent: localFileContent[key] || null,
                    localContent,
                    remoteResource: this.extUri.joinPath(this.syncPreviewFolder, key).with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'remote' }),
                    remoteContent: remoteSnippets[key] || null,
                    previewResource: this.extUri.joinPath(this.syncPreviewFolder, key),
                    previewResult,
                    localChange: previewResult.localChange,
                    remoteChange: previewResult.remoteChange,
                    acceptedResource: this.extUri.joinPath(this.syncPreviewFolder, key).with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'accepted' })
                });
            }
        }
        return [...resourcePreviews.values()];
    }
    async resolveContent(uri) {
        if (this.extUri.isEqualOrParent(uri, this.syncPreviewFolder.with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'remote' }))
            || this.extUri.isEqualOrParent(uri, this.syncPreviewFolder.with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'local' }))
            || this.extUri.isEqualOrParent(uri, this.syncPreviewFolder.with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'base' }))
            || this.extUri.isEqualOrParent(uri, this.syncPreviewFolder.with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'accepted' }))) {
            return this.resolvePreviewContent(uri);
        }
        return null;
    }
    async hasLocalData() {
        try {
            const localSnippets = await this.getSnippetsFileContents();
            if (Object.keys(localSnippets).length) {
                return true;
            }
        }
        catch (error) {
            /* ignore error */
        }
        return false;
    }
    async updateLocalBackup(resourcePreviews) {
        const local = {};
        for (const resourcePreview of resourcePreviews) {
            if (resourcePreview.fileContent) {
                local[this.extUri.basename(resourcePreview.localResource)] = resourcePreview.fileContent;
            }
        }
        await this.backupLocal(JSON.stringify(this.toSnippetsContents(local)));
    }
    async updateLocalSnippets(resourcePreviews, force) {
        for (const { fileContent, acceptResult, localResource, remoteResource, localChange } of resourcePreviews) {
            if (localChange !== 0 /* Change.None */) {
                const key = remoteResource ? this.extUri.basename(remoteResource) : this.extUri.basename(localResource);
                const resource = this.extUri.joinPath(this.snippetsFolder, key);
                // Removed
                if (localChange === 3 /* Change.Deleted */) {
                    this.logService.trace(`${this.syncResourceLogLabel}: Deleting snippet...`, this.extUri.basename(resource));
                    await this.fileService.del(resource);
                    this.logService.info(`${this.syncResourceLogLabel}: Deleted snippet`, this.extUri.basename(resource));
                }
                // Added
                else if (localChange === 1 /* Change.Added */) {
                    this.logService.trace(`${this.syncResourceLogLabel}: Creating snippet...`, this.extUri.basename(resource));
                    await this.fileService.createFile(resource, VSBuffer.fromString(acceptResult.content), { overwrite: force });
                    this.logService.info(`${this.syncResourceLogLabel}: Created snippet`, this.extUri.basename(resource));
                }
                // Updated
                else {
                    this.logService.trace(`${this.syncResourceLogLabel}: Updating snippet...`, this.extUri.basename(resource));
                    await this.fileService.writeFile(resource, VSBuffer.fromString(acceptResult.content), force ? undefined : fileContent);
                    this.logService.info(`${this.syncResourceLogLabel}: Updated snippet`, this.extUri.basename(resource));
                }
            }
        }
    }
    async updateRemoteSnippets(resourcePreviews, remoteUserData, forcePush) {
        const currentSnippets = remoteUserData.syncData ? this.parseSnippets(remoteUserData.syncData) : {};
        const newSnippets = deepClone(currentSnippets);
        for (const { acceptResult, localResource, remoteResource, remoteChange } of resourcePreviews) {
            if (remoteChange !== 0 /* Change.None */) {
                const key = localResource ? this.extUri.basename(localResource) : this.extUri.basename(remoteResource);
                if (remoteChange === 3 /* Change.Deleted */) {
                    delete newSnippets[key];
                }
                else {
                    newSnippets[key] = acceptResult.content;
                }
            }
        }
        if (!areSame(currentSnippets, newSnippets)) {
            // update remote
            this.logService.trace(`${this.syncResourceLogLabel}: Updating remote snippets...`);
            remoteUserData = await this.updateRemoteUserData(JSON.stringify(newSnippets), forcePush ? null : remoteUserData.ref);
            this.logService.info(`${this.syncResourceLogLabel}: Updated remote snippets`);
        }
        return remoteUserData;
    }
    parseSnippets(syncData) {
        return parseSnippets(syncData);
    }
    toSnippetsContents(snippetsFileContents) {
        const snippets = {};
        for (const key of Object.keys(snippetsFileContents)) {
            snippets[key] = snippetsFileContents[key].value.toString();
        }
        return snippets;
    }
    async getSnippetsFileContents() {
        const snippets = {};
        let stat;
        try {
            stat = await this.fileService.resolve(this.snippetsFolder);
        }
        catch (e) {
            // No snippets
            if (e instanceof FileOperationError && e.fileOperationResult === 1 /* FileOperationResult.FILE_NOT_FOUND */) {
                return snippets;
            }
            else {
                throw e;
            }
        }
        for (const entry of stat.children || []) {
            const resource = entry.resource;
            const extension = this.extUri.extname(resource);
            if (extension === '.json' || extension === '.code-snippets') {
                const key = this.extUri.relativePath(this.snippetsFolder, resource);
                const content = await this.fileService.readFile(resource);
                snippets[key] = content;
            }
        }
        return snippets;
    }
};
SnippetsSynchroniser = __decorate([
    __param(2, IEnvironmentService),
    __param(3, IFileService),
    __param(4, IStorageService),
    __param(5, IUserDataSyncStoreService),
    __param(6, IUserDataSyncLocalStoreService),
    __param(7, IUserDataSyncLogService),
    __param(8, IConfigurationService),
    __param(9, IUserDataSyncEnablementService),
    __param(10, ITelemetryService),
    __param(11, IUriIdentityService)
], SnippetsSynchroniser);
export { SnippetsSynchroniser };
let SnippetsInitializer = class SnippetsInitializer extends AbstractInitializer {
    constructor(fileService, userDataProfilesService, environmentService, logService, storageService, uriIdentityService) {
        super("snippets" /* SyncResource.Snippets */, userDataProfilesService, environmentService, logService, fileService, storageService, uriIdentityService);
    }
    async doInitialize(remoteUserData) {
        const remoteSnippets = remoteUserData.syncData ? JSON.parse(remoteUserData.syncData.content) : null;
        if (!remoteSnippets) {
            this.logService.info('Skipping initializing snippets because remote snippets does not exist.');
            return;
        }
        const isEmpty = await this.isEmpty();
        if (!isEmpty) {
            this.logService.info('Skipping initializing snippets because local snippets exist.');
            return;
        }
        for (const key of Object.keys(remoteSnippets)) {
            const content = remoteSnippets[key];
            if (content) {
                const resource = this.extUri.joinPath(this.userDataProfilesService.defaultProfile.snippetsHome, key);
                await this.fileService.createFile(resource, VSBuffer.fromString(content));
                this.logService.info('Created snippet', this.extUri.basename(resource));
            }
        }
        await this.updateLastSyncUserData(remoteUserData);
    }
    async isEmpty() {
        try {
            const stat = await this.fileService.resolve(this.userDataProfilesService.defaultProfile.snippetsHome);
            return !stat.children?.length;
        }
        catch (error) {
            return error.fileOperationResult === 1 /* FileOperationResult.FILE_NOT_FOUND */;
        }
    }
};
SnippetsInitializer = __decorate([
    __param(0, IFileService),
    __param(1, IUserDataProfilesService),
    __param(2, IEnvironmentService),
    __param(3, IUserDataSyncLogService),
    __param(4, IStorageService),
    __param(5, IUriIdentityService)
], SnippetsInitializer);
export { SnippetsInitializer };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic25pcHBldHNTeW5jLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3VzZXJEYXRhU3luYy9jb21tb24vc25pcHBldHNTeW5jLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUcxRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDdEQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBRTVELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxrQkFBa0IsRUFBcUMsWUFBWSxFQUFhLE1BQU0sNkJBQTZCLENBQUM7QUFDN0gsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzlFLE9BQU8sRUFBb0Isd0JBQXdCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUM3RyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsb0JBQW9CLEVBQXFELE1BQU0sMkJBQTJCLENBQUM7QUFDekksT0FBTyxFQUFFLE9BQU8sRUFBd0MsS0FBSyxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDMUYsT0FBTyxFQUFzQyw4QkFBOEIsRUFBeUIsdUJBQXVCLEVBQUUsOEJBQThCLEVBQUUseUJBQXlCLEVBQWdCLHFCQUFxQixFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFVdlAsTUFBTSxV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