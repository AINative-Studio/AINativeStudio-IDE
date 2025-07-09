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
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IEnvironmentService } from '../../../../platform/environment/common/environment.js';
import { EXTENSION_INSTALL_SKIP_PUBLISHER_TRUST_CONTEXT, IExtensionGalleryService, IExtensionManagementService } from '../../../../platform/extensionManagement/common/extensionManagement.js';
import { areSameExtensions } from '../../../../platform/extensionManagement/common/extensionManagementUtil.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ServiceCollection } from '../../../../platform/instantiation/common/serviceCollection.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { REMOTE_DEFAULT_IF_LOCAL_EXTENSIONS } from '../../../../platform/remote/common/remote.js';
import { IRemoteAuthorityResolverService } from '../../../../platform/remote/common/remoteAuthorityResolver.js';
import { IRemoteExtensionsScannerService } from '../../../../platform/remote/common/remoteExtensionsScanner.js';
import { IStorageService, IS_NEW_KEY } from '../../../../platform/storage/common/storage.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { IUserDataProfilesService } from '../../../../platform/userDataProfile/common/userDataProfile.js';
import { AbstractExtensionsInitializer } from '../../../../platform/userDataSync/common/extensionsSync.js';
import { IIgnoredExtensionsManagementService } from '../../../../platform/userDataSync/common/ignoredExtensions.js';
import { IUserDataSyncEnablementService, IUserDataSyncStoreManagementService } from '../../../../platform/userDataSync/common/userDataSync.js';
import { UserDataSyncStoreClient } from '../../../../platform/userDataSync/common/userDataSyncStoreService.js';
import { IAuthenticationService } from '../../../services/authentication/common/authentication.js';
import { IExtensionManagementServerService } from '../../../services/extensionManagement/common/extensionManagement.js';
import { IExtensionManifestPropertiesService } from '../../../services/extensions/common/extensionManifestPropertiesService.js';
import { IRemoteAgentService } from '../../../services/remote/common/remoteAgentService.js';
import { IExtensionsWorkbenchService } from '../common/extensions.js';
let InstallRemoteExtensionsContribution = class InstallRemoteExtensionsContribution {
    constructor(remoteAgentService, remoteExtensionsScannerService, extensionGalleryService, extensionManagementServerService, extensionsWorkbenchService, logService, configurationService) {
        this.remoteAgentService = remoteAgentService;
        this.remoteExtensionsScannerService = remoteExtensionsScannerService;
        this.extensionGalleryService = extensionGalleryService;
        this.extensionManagementServerService = extensionManagementServerService;
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.logService = logService;
        this.configurationService = configurationService;
        this.installExtensionsIfInstalledLocallyInRemote();
        this.installFailedRemoteExtensions();
    }
    async installExtensionsIfInstalledLocallyInRemote() {
        if (!this.remoteAgentService.getConnection()) {
            return;
        }
        if (!this.extensionManagementServerService.remoteExtensionManagementServer) {
            this.logService.error('No remote extension management server available');
            return;
        }
        if (!this.extensionManagementServerService.localExtensionManagementServer) {
            this.logService.error('No local extension management server available');
            return;
        }
        const settingValue = this.configurationService.getValue(REMOTE_DEFAULT_IF_LOCAL_EXTENSIONS);
        if (!settingValue?.length) {
            return;
        }
        const alreadyInstalledLocally = await this.extensionsWorkbenchService.queryLocal(this.extensionManagementServerService.localExtensionManagementServer);
        const alreadyInstalledRemotely = await this.extensionsWorkbenchService.queryLocal(this.extensionManagementServerService.remoteExtensionManagementServer);
        const extensionsToInstall = alreadyInstalledLocally
            .filter(ext => settingValue.some(id => areSameExtensions(ext.identifier, { id })))
            .filter(ext => !alreadyInstalledRemotely.some(e => areSameExtensions(e.identifier, ext.identifier)));
        if (!extensionsToInstall.length) {
            return;
        }
        await Promise.allSettled(extensionsToInstall.map(ext => {
            this.extensionsWorkbenchService.installInServer(ext, this.extensionManagementServerService.remoteExtensionManagementServer, { donotIncludePackAndDependencies: true });
        }));
    }
    async installFailedRemoteExtensions() {
        if (!this.remoteAgentService.getConnection()) {
            return;
        }
        const { failed } = await this.remoteExtensionsScannerService.whenExtensionsReady();
        if (failed.length === 0) {
            this.logService.trace('No extensions relayed from server');
            return;
        }
        if (!this.extensionManagementServerService.remoteExtensionManagementServer) {
            this.logService.error('No remote extension management server available');
            return;
        }
        this.logService.info(`Installing '${failed.length}' extensions relayed from server`);
        const galleryExtensions = await this.extensionGalleryService.getExtensions(failed.map(({ id }) => ({ id })), CancellationToken.None);
        const installExtensionInfo = [];
        for (const { id, installOptions } of failed) {
            const extension = galleryExtensions.find(e => areSameExtensions(e.identifier, { id }));
            if (extension) {
                installExtensionInfo.push({
                    extension, options: {
                        ...installOptions,
                        downloadExtensionsLocally: true,
                    }
                });
            }
            else {
                this.logService.warn(`Relayed failed extension '${id}' from server is not found in the gallery`);
            }
        }
        if (installExtensionInfo.length) {
            await Promise.allSettled(installExtensionInfo.map(e => this.extensionManagementServerService.remoteExtensionManagementServer.extensionManagementService.installFromGallery(e.extension, e.options)));
        }
    }
};
InstallRemoteExtensionsContribution = __decorate([
    __param(0, IRemoteAgentService),
    __param(1, IRemoteExtensionsScannerService),
    __param(2, IExtensionGalleryService),
    __param(3, IExtensionManagementServerService),
    __param(4, IExtensionsWorkbenchService),
    __param(5, ILogService),
    __param(6, IConfigurationService)
], InstallRemoteExtensionsContribution);
export { InstallRemoteExtensionsContribution };
let RemoteExtensionsInitializerContribution = class RemoteExtensionsInitializerContribution {
    constructor(extensionManagementServerService, storageService, remoteAgentService, userDataSyncStoreManagementService, instantiationService, logService, authenticationService, remoteAuthorityResolverService, userDataSyncEnablementService) {
        this.extensionManagementServerService = extensionManagementServerService;
        this.storageService = storageService;
        this.remoteAgentService = remoteAgentService;
        this.userDataSyncStoreManagementService = userDataSyncStoreManagementService;
        this.instantiationService = instantiationService;
        this.logService = logService;
        this.authenticationService = authenticationService;
        this.remoteAuthorityResolverService = remoteAuthorityResolverService;
        this.userDataSyncEnablementService = userDataSyncEnablementService;
        this.initializeRemoteExtensions();
    }
    async initializeRemoteExtensions() {
        const connection = this.remoteAgentService.getConnection();
        const localExtensionManagementServer = this.extensionManagementServerService.localExtensionManagementServer;
        const remoteExtensionManagementServer = this.extensionManagementServerService.remoteExtensionManagementServer;
        // Skip: Not a remote window
        if (!connection || !remoteExtensionManagementServer) {
            return;
        }
        // Skip: Not a native window
        if (!localExtensionManagementServer) {
            return;
        }
        // Skip: No UserdataSyncStore is configured
        if (!this.userDataSyncStoreManagementService.userDataSyncStore) {
            return;
        }
        const newRemoteConnectionKey = `${IS_NEW_KEY}.${connection.remoteAuthority}`;
        // Skip: Not a new remote connection
        if (!this.storageService.getBoolean(newRemoteConnectionKey, -1 /* StorageScope.APPLICATION */, true)) {
            this.logService.trace(`Skipping initializing remote extensions because the window with this remote authority was opened before.`);
            return;
        }
        this.storageService.store(newRemoteConnectionKey, false, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        // Skip: Not a new workspace
        if (!this.storageService.isNew(1 /* StorageScope.WORKSPACE */)) {
            this.logService.trace(`Skipping initializing remote extensions because this workspace was opened before.`);
            return;
        }
        // Skip: Settings Sync is disabled
        if (!this.userDataSyncEnablementService.isEnabled()) {
            return;
        }
        // Skip: No account is provided to initialize
        const resolvedAuthority = await this.remoteAuthorityResolverService.resolveAuthority(connection.remoteAuthority);
        if (!resolvedAuthority.options?.authenticationSession) {
            return;
        }
        const sessions = await this.authenticationService.getSessions(resolvedAuthority.options?.authenticationSession.providerId);
        const session = sessions.find(s => s.id === resolvedAuthority.options?.authenticationSession?.id);
        // Skip: Session is not found
        if (!session) {
            this.logService.info('Skipping initializing remote extensions because the account with given session id is not found', resolvedAuthority.options.authenticationSession.id);
            return;
        }
        const userDataSyncStoreClient = this.instantiationService.createInstance(UserDataSyncStoreClient, this.userDataSyncStoreManagementService.userDataSyncStore.url);
        userDataSyncStoreClient.setAuthToken(session.accessToken, resolvedAuthority.options.authenticationSession.providerId);
        const userData = await userDataSyncStoreClient.readResource("extensions" /* SyncResource.Extensions */, null);
        const serviceCollection = new ServiceCollection();
        serviceCollection.set(IExtensionManagementService, remoteExtensionManagementServer.extensionManagementService);
        const instantiationService = this.instantiationService.createChild(serviceCollection);
        const extensionsToInstallInitializer = instantiationService.createInstance(RemoteExtensionsInitializer);
        await extensionsToInstallInitializer.initialize(userData);
    }
};
RemoteExtensionsInitializerContribution = __decorate([
    __param(0, IExtensionManagementServerService),
    __param(1, IStorageService),
    __param(2, IRemoteAgentService),
    __param(3, IUserDataSyncStoreManagementService),
    __param(4, IInstantiationService),
    __param(5, ILogService),
    __param(6, IAuthenticationService),
    __param(7, IRemoteAuthorityResolverService),
    __param(8, IUserDataSyncEnablementService)
], RemoteExtensionsInitializerContribution);
export { RemoteExtensionsInitializerContribution };
let RemoteExtensionsInitializer = class RemoteExtensionsInitializer extends AbstractExtensionsInitializer {
    constructor(extensionManagementService, ignoredExtensionsManagementService, fileService, userDataProfilesService, environmentService, logService, uriIdentityService, extensionGalleryService, storageService, extensionManifestPropertiesService) {
        super(extensionManagementService, ignoredExtensionsManagementService, fileService, userDataProfilesService, environmentService, logService, storageService, uriIdentityService);
        this.extensionGalleryService = extensionGalleryService;
        this.extensionManifestPropertiesService = extensionManifestPropertiesService;
    }
    async doInitialize(remoteUserData) {
        const remoteExtensions = await this.parseExtensions(remoteUserData);
        if (!remoteExtensions) {
            this.logService.info('No synced extensions exist while initializing remote extensions.');
            return;
        }
        const installedExtensions = await this.extensionManagementService.getInstalled();
        const { newExtensions } = this.generatePreview(remoteExtensions, installedExtensions);
        if (!newExtensions.length) {
            this.logService.trace('No new remote extensions to install.');
            return;
        }
        const targetPlatform = await this.extensionManagementService.getTargetPlatform();
        const extensionsToInstall = await this.extensionGalleryService.getExtensions(newExtensions, { targetPlatform, compatible: true }, CancellationToken.None);
        if (extensionsToInstall.length) {
            await Promise.allSettled(extensionsToInstall.map(async (e) => {
                const manifest = await this.extensionGalleryService.getManifest(e, CancellationToken.None);
                if (manifest && this.extensionManifestPropertiesService.canExecuteOnWorkspace(manifest)) {
                    const syncedExtension = remoteExtensions.find(e => areSameExtensions(e.identifier, e.identifier));
                    await this.extensionManagementService.installFromGallery(e, { installPreReleaseVersion: syncedExtension?.preRelease, donotIncludePackAndDependencies: true, context: { [EXTENSION_INSTALL_SKIP_PUBLISHER_TRUST_CONTEXT]: true } });
                }
            }));
        }
    }
};
RemoteExtensionsInitializer = __decorate([
    __param(0, IExtensionManagementService),
    __param(1, IIgnoredExtensionsManagementService),
    __param(2, IFileService),
    __param(3, IUserDataProfilesService),
    __param(4, IEnvironmentService),
    __param(5, ILogService),
    __param(6, IUriIdentityService),
    __param(7, IExtensionGalleryService),
    __param(8, IStorageService),
    __param(9, IExtensionManifestPropertiesService)
], RemoteExtensionsInitializer);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlRXh0ZW5zaW9uc0luaXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZXh0ZW5zaW9ucy9lbGVjdHJvbi1zYW5kYm94L3JlbW90ZUV4dGVuc2lvbnNJbml0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBQzdGLE9BQU8sRUFBRSw4Q0FBOEMsRUFBRSx3QkFBd0IsRUFBRSwyQkFBMkIsRUFBd0IsTUFBTSx3RUFBd0UsQ0FBQztBQUNyTixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw0RUFBNEUsQ0FBQztBQUMvRyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDMUUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0VBQWdFLENBQUM7QUFDbkcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxrQ0FBa0MsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQ2xHLE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ2hILE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ2hILE9BQU8sRUFBRSxlQUFlLEVBQUUsVUFBVSxFQUErQixNQUFNLGdEQUFnRCxDQUFDO0FBQzFILE9BQU8sRUFBRSxtQkFBbUIsRUFB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