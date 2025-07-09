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
import { Promises } from '../../../base/common/async.js';
import { CancellationToken } from '../../../base/common/cancellation.js';
import { getErrorMessage } from '../../../base/common/errors.js';
import { Event } from '../../../base/common/event.js';
import { toFormattedString } from '../../../base/common/jsonFormatter.js';
import { DisposableStore } from '../../../base/common/lifecycle.js';
import { compare } from '../../../base/common/strings.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { IEnvironmentService } from '../../environment/common/environment.js';
import { GlobalExtensionEnablementService } from '../../extensionManagement/common/extensionEnablementService.js';
import { IExtensionGalleryService, IExtensionManagementService, ExtensionManagementError, DISABLED_EXTENSIONS_STORAGE_PATH, EXTENSION_INSTALL_SKIP_WALKTHROUGH_CONTEXT, EXTENSION_INSTALL_SOURCE_CONTEXT, EXTENSION_INSTALL_SKIP_PUBLISHER_TRUST_CONTEXT } from '../../extensionManagement/common/extensionManagement.js';
import { areSameExtensions } from '../../extensionManagement/common/extensionManagementUtil.js';
import { ExtensionStorageService, IExtensionStorageService } from '../../extensionManagement/common/extensionStorage.js';
import { isApplicationScopedExtension } from '../../extensions/common/extensions.js';
import { IFileService } from '../../files/common/files.js';
import { IInstantiationService } from '../../instantiation/common/instantiation.js';
import { ServiceCollection } from '../../instantiation/common/serviceCollection.js';
import { ILogService } from '../../log/common/log.js';
import { IStorageService } from '../../storage/common/storage.js';
import { ITelemetryService } from '../../telemetry/common/telemetry.js';
import { IUriIdentityService } from '../../uriIdentity/common/uriIdentity.js';
import { IUserDataProfilesService } from '../../userDataProfile/common/userDataProfile.js';
import { AbstractInitializer, AbstractSynchroniser, getSyncResourceLogLabel } from './abstractSynchronizer.js';
import { merge } from './extensionsMerge.js';
import { IIgnoredExtensionsManagementService } from './ignoredExtensions.js';
import { IUserDataSyncLocalStoreService, IUserDataSyncLogService, IUserDataSyncEnablementService, IUserDataSyncStoreService, USER_DATA_SYNC_SCHEME } from './userDataSync.js';
import { IUserDataProfileStorageService } from '../../userDataProfile/common/userDataProfileStorageService.js';
async function parseAndMigrateExtensions(syncData, extensionManagementService) {
    const extensions = JSON.parse(syncData.content);
    if (syncData.version === 1
        || syncData.version === 2) {
        const builtinExtensions = (await extensionManagementService.getInstalled(0 /* ExtensionType.System */)).filter(e => e.isBuiltin);
        for (const extension of extensions) {
            // #region Migration from v1 (enabled -> disabled)
            if (syncData.version === 1) {
                if (extension.enabled === false) {
                    extension.disabled = true;
                }
                delete extension.enabled;
            }
            // #endregion
            // #region Migration from v2 (set installed property on extension)
            if (syncData.version === 2) {
                if (builtinExtensions.every(installed => !areSameExtensions(installed.identifier, extension.identifier))) {
                    extension.installed = true;
                }
            }
            // #endregion
        }
    }
    return extensions;
}
export function parseExtensions(syncData) {
    return JSON.parse(syncData.content);
}
export function stringify(extensions, format) {
    extensions.sort((e1, e2) => {
        if (!e1.identifier.uuid && e2.identifier.uuid) {
            return -1;
        }
        if (e1.identifier.uuid && !e2.identifier.uuid) {
            return 1;
        }
        return compare(e1.identifier.id, e2.identifier.id);
    });
    return format ? toFormattedString(extensions, {}) : JSON.stringify(extensions);
}
let ExtensionsSynchroniser = class ExtensionsSynchroniser extends AbstractSynchroniser {
    constructor(
    // profileLocation changes for default profile
    profile, collection, environmentService, fileService, storageService, userDataSyncStoreService, userDataSyncLocalStoreService, extensionManagementService, ignoredExtensionsManagementService, logService, configurationService, userDataSyncEnablementService, telemetryService, extensionStorageService, uriIdentityService, userDataProfileStorageService, instantiationService) {
        super({ syncResource: "extensions" /* SyncResource.Extensions */, profile }, collection, fileService, environmentService, storageService, userDataSyncStoreService, userDataSyncLocalStoreService, userDataSyncEnablementService, telemetryService, logService, configurationService, uriIdentityService);
        this.extensionManagementService = extensionManagementService;
        this.ignoredExtensionsManagementService = ignoredExtensionsManagementService;
        this.instantiationService = instantiationService;
        /*
            Version 3 - Introduce installed property to skip installing built in extensions
            protected readonly version: number = 3;
        */
        /* Version 4: Change settings from `sync.${setting}` to `settingsSync.{setting}` */
        /* Version 5: Introduce extension state */
        /* Version 6: Added isApplicationScoped property */
        this.version = 6;
        this.previewResource = this.extUri.joinPath(this.syncPreviewFolder, 'extensions.json');
        this.baseResource = this.previewResource.with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'base' });
        this.localResource = this.previewResource.with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'local' });
        this.remoteResource = this.previewResource.with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'remote' });
        this.acceptedResource = this.previewResource.with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'accepted' });
        this.localExtensionsProvider = this.instantiationService.createInstance(LocalExtensionsProvider);
        this._register(Event.any(Event.filter(this.extensionManagementService.onDidInstallExtensions, (e => e.some(({ local }) => !!local))), Event.filter(this.extensionManagementService.onDidUninstallExtension, (e => !e.error)), Event.filter(userDataProfileStorageService.onDidChange, e => e.valueChanges.some(({ profile, changes }) => this.syncResource.profile.id === profile.id && changes.some(change => change.key === DISABLED_EXTENSIONS_STORAGE_PATH))), extensionStorageService.onDidChangeExtensionStorageToSync)(() => this.triggerLocalChange()));
    }
    async generateSyncPreview(remoteUserData, lastSyncUserData) {
        const remoteExtensions = remoteUserData.syncData ? await parseAndMigrateExtensions(remoteUserData.syncData, this.extensionManagementService) : null;
        const skippedExtensions = lastSyncUserData?.skippedExtensions ?? [];
        const builtinExtensions = lastSyncUserData?.builtinExtensions ?? null;
        const lastSyncExtensions = lastSyncUserData?.syncData ? await parseAndMigrateExtensions(lastSyncUserData.syncData, this.extensionManagementService) : null;
        const { localExtensions, ignoredExtensions } = await this.localExtensionsProvider.getLocalExtensions(this.syncResource.profile);
        if (remoteExtensions) {
            this.logService.trace(`${this.syncResourceLogLabel}: Merging remote extensions with local extensions...`);
        }
        else {
            this.logService.trace(`${this.syncResourceLogLabel}: Remote extensions does not exist. Synchronizing extensions for the first time.`);
        }
        const { local, remote } = merge(localExtensions, remoteExtensions, lastSyncExtensions, skippedExtensions, ignoredExtensions, builtinExtensions);
        const previewResult = {
            local, remote,
            content: this.getPreviewContent(localExtensions, local.added, local.updated, local.removed),
            localChange: local.added.length > 0 || local.removed.length > 0 || local.updated.length > 0 ? 2 /* Change.Modified */ : 0 /* Change.None */,
            remoteChange: remote !== null ? 2 /* Change.Modified */ : 0 /* Change.None */,
        };
        const localContent = this.stringify(localExtensions, false);
        return [{
                skippedExtensions,
                builtinExtensions,
                baseResource: this.baseResource,
                baseContent: lastSyncExtensions ? this.stringify(lastSyncExtensions, false) : localContent,
                localResource: this.localResource,
                localContent,
                localExtensions,
                remoteResource: this.remoteResource,
                remoteExtensions,
                remoteContent: remoteExtensions ? this.stringify(remoteExtensions, false) : null,
                previewResource: this.previewResource,
                previewResult,
                localChange: previewResult.localChange,
                remoteChange: previewResult.remoteChange,
                acceptedResource: this.acceptedResource,
            }];
    }
    async hasRemoteChanged(lastSyncUserData) {
        const lastSyncExtensions = lastSyncUserData.syncData ? await parseAndMigrateExtensions(lastSyncUserData.syncData, this.extensionManagementService) : null;
        const { localExtensions, ignoredExtensions } = await this.localExtensionsProvider.getLocalExtensions(this.syncResource.profile);
        const { remote } = merge(localExtensions, lastSyncExtensions, lastSyncExtensions, lastSyncUserData.skippedExtensions || [], ignoredExtensions, lastSyncUserData.builtinExtensions || []);
        return remote !== null;
    }
    getPreviewContent(localExtensions, added, updated, removed) {
        const preview = [...added, ...updated];
        const idsOrUUIDs = new Set();
        const addIdentifier = (identifier) => {
            idsOrUUIDs.add(identifier.id.toLowerCase());
            if (identifier.uuid) {
                idsOrUUIDs.add(identifier.uuid);
            }
        };
        preview.forEach(({ identifier }) => addIdentifier(identifier));
        removed.forEach(addIdentifier);
        for (const localExtension of localExtensions) {
            if (idsOrUUIDs.has(localExtension.identifier.id.toLowerCase()) || (localExtension.identifier.uuid && idsOrUUIDs.has(localExtension.identifier.uuid))) {
                // skip
                continue;
            }
            preview.push(localExtension);
        }
        return this.stringify(preview, false);
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
        const installedExtensions = await this.extensionManagementService.getInstalled(undefined, this.syncResource.profile.extensionsResource);
        const ignoredExtensions = this.ignoredExtensionsManagementService.getIgnoredExtensions(installedExtensions);
        const remoteExtensions = resourcePreview.remoteContent ? JSON.parse(resourcePreview.remoteContent) : null;
        const mergeResult = merge(resourcePreview.localExtensions, remoteExtensions, remoteExtensions, resourcePreview.skippedExtensions, ignoredExtensions, resourcePreview.builtinExtensions);
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
        const installedExtensions = await this.extensionManagementService.getInstalled(undefined, this.syncResource.profile.extensionsResource);
        const ignoredExtensions = this.ignoredExtensionsManagementService.getIgnoredExtensions(installedExtensions);
        const remoteExtensions = resourcePreview.remoteContent ? JSON.parse(resourcePreview.remoteContent) : null;
        if (remoteExtensions !== null) {
            const mergeResult = merge(resourcePreview.localExtensions, remoteExtensions, resourcePreview.localExtensions, [], ignoredExtensions, resourcePreview.builtinExtensions);
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
        let { skippedExtensions, builtinExtensions, localExtensions } = resourcePreviews[0][0];
        const { local, remote, localChange, remoteChange } = resourcePreviews[0][1];
        if (localChange === 0 /* Change.None */ && remoteChange === 0 /* Change.None */) {
            this.logService.info(`${this.syncResourceLogLabel}: No changes found during synchronizing extensions.`);
        }
        if (localChange !== 0 /* Change.None */) {
            await this.backupLocal(JSON.stringify(localExtensions));
            skippedExtensions = await this.localExtensionsProvider.updateLocalExtensions(local.added, local.removed, local.updated, skippedExtensions, this.syncResource.profile);
        }
        if (remote) {
            // update remote
            this.logService.trace(`${this.syncResourceLogLabel}: Updating remote extensions...`);
            const content = JSON.stringify(remote.all);
            remoteUserData = await this.updateRemoteUserData(content, force ? null : remoteUserData.ref);
            this.logService.info(`${this.syncResourceLogLabel}: Updated remote extensions.${remote.added.length ? ` Added: ${JSON.stringify(remote.added.map(e => e.identifier.id))}.` : ''}${remote.updated.length ? ` Updated: ${JSON.stringify(remote.updated.map(e => e.identifier.id))}.` : ''}${remote.removed.length ? ` Removed: ${JSON.stringify(remote.removed.map(e => e.identifier.id))}.` : ''}`);
        }
        if (lastSyncUserData?.ref !== remoteUserData.ref) {
            // update last sync
            this.logService.trace(`${this.syncResourceLogLabel}: Updating last synchronized extensions...`);
            builtinExtensions = this.computeBuiltinExtensions(localExtensions, builtinExtensions);
            await this.updateLastSyncUserData(remoteUserData, { skippedExtensions, builtinExtensions });
            this.logService.info(`${this.syncResourceLogLabel}: Updated last synchronized extensions.${skippedExtensions.length ? ` Skipped: ${JSON.stringify(skippedExtensions.map(e => e.identifier.id))}.` : ''}`);
        }
    }
    computeBuiltinExtensions(localExtensions, previousBuiltinExtensions) {
        const localExtensionsSet = new Set();
        const builtinExtensions = [];
        for (const localExtension of localExtensions) {
            localExtensionsSet.add(localExtension.identifier.id.toLowerCase());
            if (!localExtension.installed) {
                builtinExtensions.push(localExtension.identifier);
            }
        }
        if (previousBuiltinExtensions) {
            for (const builtinExtension of previousBuiltinExtensions) {
                // Add previous builtin extension if it does not exist in local extensions
                if (!localExtensionsSet.has(builtinExtension.id.toLowerCase())) {
                    builtinExtensions.push(builtinExtension);
                }
            }
        }
        return builtinExtensions;
    }
    async resolveContent(uri) {
        if (this.extUri.isEqual(this.remoteResource, uri)
            || this.extUri.isEqual(this.baseResource, uri)
            || this.extUri.isEqual(this.localResource, uri)
            || this.extUri.isEqual(this.acceptedResource, uri)) {
            const content = await this.resolvePreviewContent(uri);
            return content ? this.stringify(JSON.parse(content), true) : content;
        }
        return null;
    }
    stringify(extensions, format) {
        return stringify(extensions, format);
    }
    async hasLocalData() {
        try {
            const { localExtensions } = await this.localExtensionsProvider.getLocalExtensions(this.syncResource.profile);
            if (localExtensions.some(e => e.installed || e.disabled)) {
                return true;
            }
        }
        catch (error) {
            /* ignore error */
        }
        return false;
    }
};
ExtensionsSynchroniser = __decorate([
    __param(2, IEnvironmentService),
    __param(3, IFileService),
    __param(4, IStorageService),
    __param(5, IUserDataSyncStoreService),
    __param(6, IUserDataSyncLocalStoreService),
    __param(7, IExtensionManagementService),
    __param(8, IIgnoredExtensionsManagementService),
    __param(9, IUserDataSyncLogService),
    __param(10, IConfigurationService),
    __param(11, IUserDataSyncEnablementService),
    __param(12, ITelemetryService),
    __param(13, IExtensionStorageService),
    __param(14, IUriIdentityService),
    __param(15, IUserDataProfileStorageService),
    __param(16, IInstantiationService)
], ExtensionsSynchroniser);
export { ExtensionsSynchroniser };
let LocalExtensionsProvider = class LocalExtensionsProvider {
    constructor(extensionManagementService, userDataProfileStorageService, extensionGalleryService, ignoredExtensionsManagementService, instantiationService, logService) {
        this.extensionManagementService = extensionManagementService;
        this.userDataProfileStorageService = userDataProfileStorageService;
        this.extensionGalleryService = extensionGalleryService;
        this.ignoredExtensionsManagementService = ignoredExtensionsManagementService;
        this.instantiationService = instantiationService;
        this.logService = logService;
    }
    async getLocalExtensions(profile) {
        const installedExtensions = await this.extensionManagementService.getInstalled(undefined, profile.extensionsResource);
        const ignoredExtensions = this.ignoredExtensionsManagementService.getIgnoredExtensions(installedExtensions);
        const localExtensions = await this.withProfileScopedServices(profile, async (extensionEnablementService, extensionStorageService) => {
            const disabledExtensions = extensionEnablementService.getDisabledExtensions();
            return installedExtensions
                .map(extension => {
                const { identifier, isBuiltin, manifest, preRelease, pinned, isApplicationScoped } = extension;
                const syncExntesion = { identifier, preRelease, version: manifest.version, pinned: !!pinned };
                if (isApplicationScoped && !isApplicationScopedExtension(manifest)) {
                    syncExntesion.isApplicationScoped = isApplicationScoped;
                }
                if (disabledExtensions.some(disabledExtension => areSameExtensions(disabledExtension, identifier))) {
                    syncExntesion.disabled = true;
                }
                if (!isBuiltin) {
                    syncExntesion.installed = true;
                }
                try {
                    const keys = extensionStorageService.getKeysForSync({ id: identifier.id, version: manifest.version });
                    if (keys) {
                        const extensionStorageState = extensionStorageService.getExtensionState(extension, true) || {};
                        syncExntesion.state = Object.keys(extensionStorageState).reduce((state, key) => {
                            if (keys.includes(key)) {
                                state[key] = extensionStorageState[key];
                            }
                            return state;
                        }, {});
                    }
                }
                catch (error) {
                    this.logService.info(`${getSyncResourceLogLabel("extensions" /* SyncResource.Extensions */, profile)}: Error while parsing extension state`, getErrorMessage(error));
                }
                return syncExntesion;
            });
        });
        return { localExtensions, ignoredExtensions };
    }
    async updateLocalExtensions(added, removed, updated, skippedExtensions, profile) {
        const syncResourceLogLabel = getSyncResourceLogLabel("extensions" /* SyncResource.Extensions */, profile);
        const extensionsToInstall = [];
        const syncExtensionsToInstall = new Map();
        const removeFromSkipped = [];
        const addToSkipped = [];
        const installedExtensions = await this.extensionManagementService.getInstalled(undefined, profile.extensionsResource);
        // 1. Sync extensions state first so that the storage is flushed and updated in all opened windows
        if (added.length || updated.length) {
            await this.withProfileScopedServices(profile, async (extensionEnablementService, extensionStorageService) => {
                await Promises.settled([...added, ...updated].map(async (e) => {
                    const installedExtension = installedExtensions.find(installed => areSameExtensions(installed.identifier, e.identifier));
                    // Builtin Extension Sync: Enablement & State
                    if (installedExtension && installedExtension.isBuiltin) {
                        if (e.state && installedExtension.manifest.version === e.version) {
                            this.updateExtensionState(e.state, installedExtension, installedExtension.manifest.version, extensionStorageService);
                        }
                        const isDisabled = extensionEnablementService.getDisabledExtensions().some(disabledExtension => areSameExtensions(disabledExtension, e.identifier));
                        if (isDisabled !== !!e.disabled) {
                            if (e.disabled) {
                                this.logService.trace(`${syncResourceLogLabel}: Disabling extension...`, e.identifier.id);
                                await extensionEnablementService.disableExtension(e.identifier);
                                this.logService.info(`${syncResourceLogLabel}: Disabled extension`, e.identifier.id);
                            }
                            else {
                                this.logService.trace(`${syncResourceLogLabel}: Enabling extension...`, e.identifier.id);
                                await extensionEnablementService.enableExtension(e.identifier);
                                this.logService.info(`${syncResourceLogLabel}: Enabled extension`, e.identifier.id);
                            }
                        }
                        removeFromSkipped.push(e.identifier);
                        return;
                    }
                    // User Extension Sync: Install/Update, Enablement & State
                    const version = e.pinned ? e.version : undefined;
                    const extension = (await this.extensionGalleryService.getExtensions([{ ...e.identifier, version, preRelease: version ? undefined : e.preRelease }], CancellationToken.None))[0];
                    /* Update extension state only if
                     *	extension is installed and version is same as synced version or
                     *	extension is not installed and installable
                     */
                    if (e.state &&
                        (installedExtension ? installedExtension.manifest.version === e.version /* Installed and remote has same version */
                            : !!extension /* Installable */)) {
                        this.updateExtensionState(e.state, installedExtension || extension, installedExtension?.manifest.version, extensionStorageService);
                    }
                    if (extension) {
                        try {
                            const isDisabled = extensionEnablementService.getDisabledExtensions().some(disabledExtension => areSameExtensions(disabledExtension, e.identifier));
                            if (isDisabled !== !!e.disabled) {
                                if (e.disabled) {
                                    this.logService.trace(`${syncResourceLogLabel}: Disabling extension...`, e.identifier.id, extension.version);
                                    await extensionEnablementService.disableExtension(extension.identifier);
                                    this.logService.info(`${syncResourceLogLabel}: Disabled extension`, e.identifier.id, extension.version);
                                }
                                else {
                                    this.logService.trace(`${syncResourceLogLabel}: Enabling extension...`, e.identifier.id, extension.version);
                                    await extensionEnablementService.enableExtension(extension.identifier);
                                    this.logService.info(`${syncResourceLogLabel}: Enabled extension`, e.identifier.id, extension.version);
                                }
                            }
                            if (!installedExtension // Install if the extension does not exist
                                || installedExtension.preRelease !== e.preRelease // Install if the extension pre-release preference has changed
                                || installedExtension.pinned !== e.pinned // Install if the extension pinned preference has changed
                                || (version && installedExtension.manifest.version !== version) // Install if the extension version has changed
                            ) {
                                if (await this.extensionManagementService.canInstall(extension) === true) {
                                    extensionsToInstall.push({
                                        extension, options: {
                                            isMachineScoped: false /* set isMachineScoped value to prevent install and sync dialog in web */,
                                            donotIncludePackAndDependencies: true,
                                            installGivenVersion: e.pinned && !!e.version,
                                            pinned: e.pinned,
                                            installPreReleaseVersion: e.preRelease,
                                            preRelease: e.preRelease,
                                            profileLocation: profile.extensionsResource,
                                            isApplicationScoped: e.isApplicationScoped,
                                            context: { [EXTENSION_INSTALL_SKIP_WALKTHROUGH_CONTEXT]: true, [EXTENSION_INSTALL_SOURCE_CONTEXT]: "settingsSync" /* ExtensionInstallSource.SETTINGS_SYNC */, [EXTENSION_INSTALL_SKIP_PUBLISHER_TRUST_CONTEXT]: true }
                                        }
                                    });
                                    syncExtensionsToInstall.set(extension.identifier.id.toLowerCase(), e);
                                }
                                else {
                                    this.logService.info(`${syncResourceLogLabel}: Skipped synchronizing extension because it cannot be installed.`, extension.displayName || extension.identifier.id);
                                    addToSkipped.push(e);
                                }
                            }
                        }
                        catch (error) {
                            addToSkipped.push(e);
                            this.logService.error(error);
                            this.logService.info(`${syncResourceLogLabel}: Skipped synchronizing extension`, extension.displayName || extension.identifier.id);
                        }
                    }
                    else {
                        addToSkipped.push(e);
                        this.logService.info(`${syncResourceLogLabel}: Skipped synchronizing extension because the extension is not found.`, e.identifier.id);
                    }
                }));
            });
        }
        // 2. Next uninstall the removed extensions
        if (removed.length) {
            const extensionsToRemove = installedExtensions.filter(({ identifier, isBuiltin }) => !isBuiltin && removed.some(r => areSameExtensions(identifier, r)));
            await Promises.settled(extensionsToRemove.map(async (extensionToRemove) => {
                this.logService.trace(`${syncResourceLogLabel}: Uninstalling local extension...`, extensionToRemove.identifier.id);
                await this.extensionManagementService.uninstall(extensionToRemove, { donotIncludePack: true, donotCheckDependents: true, profileLocation: profile.extensionsResource });
                this.logService.info(`${syncResourceLogLabel}: Uninstalled local extension.`, extensionToRemove.identifier.id);
                removeFromSkipped.push(extensionToRemove.identifier);
            }));
        }
        // 3. Install extensions at the end
        const results = await this.extensionManagementService.installGalleryExtensions(extensionsToInstall);
        for (const { identifier, local, error, source } of results) {
            const gallery = source;
            if (local) {
                this.logService.info(`${syncResourceLogLabel}: Installed extension.`, identifier.id, gallery.version);
                removeFromSkipped.push(identifier);
            }
            else {
                const e = syncExtensionsToInstall.get(identifier.id.toLowerCase());
                if (e) {
                    addToSkipped.push(e);
                    this.logService.info(`${syncResourceLogLabel}: Skipped synchronizing extension`, gallery.displayName || gallery.identifier.id);
                }
                if (error instanceof ExtensionManagementError && ["Incompatible" /* ExtensionManagementErrorCode.Incompatible */, "IncompatibleApi" /* ExtensionManagementErrorCode.IncompatibleApi */, "IncompatibleTargetPlatform" /* ExtensionManagementErrorCode.IncompatibleTargetPlatform */].includes(error.code)) {
                    this.logService.info(`${syncResourceLogLabel}: Skipped synchronizing extension because the compatible extension is not found.`, gallery.displayName || gallery.identifier.id);
                }
                else if (error) {
                    this.logService.error(error);
                }
            }
        }
        const newSkippedExtensions = [];
        for (const skippedExtension of skippedExtensions) {
            if (!removeFromSkipped.some(e => areSameExtensions(e, skippedExtension.identifier))) {
                newSkippedExtensions.push(skippedExtension);
            }
        }
        for (const skippedExtension of addToSkipped) {
            if (!newSkippedExtensions.some(e => areSameExtensions(e.identifier, skippedExtension.identifier))) {
                newSkippedExtensions.push(skippedExtension);
            }
        }
        return newSkippedExtensions;
    }
    updateExtensionState(state, extension, version, extensionStorageService) {
        const extensionState = extensionStorageService.getExtensionState(extension, true) || {};
        const keys = version ? extensionStorageService.getKeysForSync({ id: extension.identifier.id, version }) : undefined;
        if (keys) {
            keys.forEach(key => { extensionState[key] = state[key]; });
        }
        else {
            Object.keys(state).forEach(key => extensionState[key] = state[key]);
        }
        extensionStorageService.setExtensionState(extension, extensionState, true);
    }
    async withProfileScopedServices(profile, fn) {
        return this.userDataProfileStorageService.withProfileScopedStorageService(profile, async (storageService) => {
            const disposables = new DisposableStore();
            const instantiationService = disposables.add(this.instantiationService.createChild(new ServiceCollection([IStorageService, storageService])));
            const extensionEnablementService = disposables.add(instantiationService.createInstance(GlobalExtensionEnablementService));
            const extensionStorageService = disposables.add(instantiationService.createInstance(ExtensionStorageService));
            try {
                return await fn(extensionEnablementService, extensionStorageService);
            }
            finally {
                disposables.dispose();
            }
        });
    }
};
LocalExtensionsProvider = __decorate([
    __param(0, IExtensionManagementService),
    __param(1, IUserDataProfileStorageService),
    __param(2, IExtensionGalleryService),
    __param(3, IIgnoredExtensionsManagementService),
    __param(4, IInstantiationService),
    __param(5, IUserDataSyncLogService)
], LocalExtensionsProvider);
export { LocalExtensionsProvider };
let AbstractExtensionsInitializer = class AbstractExtensionsInitializer extends AbstractInitializer {
    constructor(extensionManagementService, ignoredExtensionsManagementService, fileService, userDataProfilesService, environmentService, logService, storageService, uriIdentityService) {
        super("extensions" /* SyncResource.Extensions */, userDataProfilesService, environmentService, logService, fileService, storageService, uriIdentityService);
        this.extensionManagementService = extensionManagementService;
        this.ignoredExtensionsManagementService = ignoredExtensionsManagementService;
    }
    async parseExtensions(remoteUserData) {
        return remoteUserData.syncData ? await parseAndMigrateExtensions(remoteUserData.syncData, this.extensionManagementService) : null;
    }
    generatePreview(remoteExtensions, localExtensions) {
        const installedExtensions = [];
        const newExtensions = [];
        const disabledExtensions = [];
        for (const extension of remoteExtensions) {
            if (this.ignoredExtensionsManagementService.hasToNeverSyncExtension(extension.identifier.id)) {
                // Skip extension ignored to sync
                continue;
            }
            const installedExtension = localExtensions.find(i => areSameExtensions(i.identifier, extension.identifier));
            if (installedExtension) {
                installedExtensions.push(installedExtension);
                if (extension.disabled) {
                    disabledExtensions.push(extension.identifier);
                }
            }
            else if (extension.installed) {
                newExtensions.push({ ...extension.identifier, preRelease: !!extension.preRelease });
                if (extension.disabled) {
                    disabledExtensions.push(extension.identifier);
                }
            }
        }
        return { installedExtensions, newExtensions, disabledExtensions, remoteExtensions };
    }
};
AbstractExtensionsInitializer = __decorate([
    __param(0, IExtensionManagementService),
    __param(1, IIgnoredExtensionsManagementService),
    __param(2, IFileService),
    __param(3, IUserDataProfilesService),
    __param(4, IEnvironmentService),
    __param(5, ILogService),
    __param(6, IStorageService),
    __param(7, IUriIdentityService)
], AbstractExtensionsInitializer);
export { AbstractExtensionsInitializer };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uc1N5bmMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdXNlckRhdGFTeW5jL2NvbW1vbi9leHRlbnNpb25zU3luYy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDekQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFekUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUN0RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDcEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBRTFELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLGdFQUFnRSxDQUFDO0FBQ2xILE9BQU8sRUFBRSx3QkFBd0IsRUFBRSwyQkFBMkIsRUFBc0Qsd0JBQXdCLEVBQW1ELGdDQUFnQyxFQUFFLDBDQUEwQyxFQUFFLGdDQUFnQyxFQUFnRCw4Q0FBOEMsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQzdjLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDZEQUE2RCxDQUFDO0FBQ2hHLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3pILE9B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