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
import { AbstractExtensionsInitializer } from '../../../../platform/userDataSync/common/extensionsSync.js';
import { GlobalStateInitializer, UserDataSyncStoreTypeSynchronizer } from '../../../../platform/userDataSync/common/globalStateSync.js';
import { KeybindingsInitializer } from '../../../../platform/userDataSync/common/keybindingsSync.js';
import { SettingsInitializer } from '../../../../platform/userDataSync/common/settingsSync.js';
import { SnippetsInitializer } from '../../../../platform/userDataSync/common/snippetsSync.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { UserDataSyncStoreClient } from '../../../../platform/userDataSync/common/userDataSyncStoreService.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IRequestService } from '../../../../platform/request/common/request.js';
import { IUserDataSyncLogService, IUserDataSyncStoreManagementService } from '../../../../platform/userDataSync/common/userDataSync.js';
import { getCurrentAuthenticationSessionInfo } from '../../authentication/browser/authenticationService.js';
import { getSyncAreaLabel } from '../common/userDataSync.js';
import { isWeb } from '../../../../base/common/platform.js';
import { Barrier, Promises } from '../../../../base/common/async.js';
import { EXTENSION_INSTALL_SKIP_PUBLISHER_TRUST_CONTEXT, IExtensionGalleryService, IExtensionManagementService, IGlobalExtensionEnablementService } from '../../../../platform/extensionManagement/common/extensionManagement.js';
import { IEnvironmentService } from '../../../../platform/environment/common/environment.js';
import { IExtensionService, toExtensionDescription } from '../../extensions/common/extensions.js';
import { areSameExtensions } from '../../../../platform/extensionManagement/common/extensionManagementUtil.js';
import { IIgnoredExtensionsManagementService } from '../../../../platform/userDataSync/common/ignoredExtensions.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { isEqual } from '../../../../base/common/resources.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { IExtensionStorageService } from '../../../../platform/extensionManagement/common/extensionStorage.js';
import { TasksInitializer } from '../../../../platform/userDataSync/common/tasksSync.js';
import { IUserDataProfilesService } from '../../../../platform/userDataProfile/common/userDataProfile.js';
import { IBrowserWorkbenchEnvironmentService } from '../../environment/browser/environmentService.js';
import { ISecretStorageService } from '../../../../platform/secrets/common/secrets.js';
let UserDataSyncInitializer = class UserDataSyncInitializer {
    constructor(environmentService, secretStorageService, userDataSyncStoreManagementService, fileService, userDataProfilesService, storageService, productService, requestService, logService, uriIdentityService) {
        this.environmentService = environmentService;
        this.secretStorageService = secretStorageService;
        this.userDataSyncStoreManagementService = userDataSyncStoreManagementService;
        this.fileService = fileService;
        this.userDataProfilesService = userDataProfilesService;
        this.storageService = storageService;
        this.productService = productService;
        this.requestService = requestService;
        this.logService = logService;
        this.uriIdentityService = uriIdentityService;
        this.initialized = [];
        this.initializationFinished = new Barrier();
        this.globalStateUserData = null;
        this.createUserDataSyncStoreClient().then(userDataSyncStoreClient => {
            if (!userDataSyncStoreClient) {
                this.initializationFinished.open();
            }
        });
    }
    createUserDataSyncStoreClient() {
        if (!this._userDataSyncStoreClientPromise) {
            this._userDataSyncStoreClientPromise = (async () => {
                try {
                    if (!isWeb) {
                        this.logService.trace(`Skipping initializing user data in desktop`);
                        return;
                    }
                    if (!this.storageService.isNew(-1 /* StorageScope.APPLICATION */)) {
                        this.logService.trace(`Skipping initializing user data as application was opened before`);
                        return;
                    }
                    if (!this.storageService.isNew(1 /* StorageScope.WORKSPACE */)) {
                        this.logService.trace(`Skipping initializing user data as workspace was opened before`);
                        return;
                    }
                    if (this.environmentService.options?.settingsSyncOptions?.authenticationProvider && !this.environmentService.options.settingsSyncOptions.enabled) {
                        this.logService.trace(`Skipping initializing user data as settings sync is disabled`);
                        return;
                    }
                    let authenticationSession;
                    try {
                        authenticationSession = await getCurrentAuthenticationSessionInfo(this.secretStorageService, this.productService);
                    }
                    catch (error) {
                        this.logService.error(error);
                    }
                    if (!authenticationSession) {
                        this.logService.trace(`Skipping initializing user data as authentication session is not set`);
                        return;
                    }
                    await this.initializeUserDataSyncStore(authenticationSession);
                    const userDataSyncStore = this.userDataSyncStoreManagementService.userDataSyncStore;
                    if (!userDataSyncStore) {
                        this.logService.trace(`Skipping initializing user data as sync service is not provided`);
                        return;
                    }
                    const userDataSyncStoreClient = new UserDataSyncStoreClient(userDataSyncStore.url, this.productService, this.requestService, this.logService, this.environmentService, this.fileService, this.storageService);
                    userDataSyncStoreClient.setAuthToken(authenticationSession.accessToken, authenticationSession.providerId);
                    const manifest = await userDataSyncStoreClient.manifest(null);
                    if (manifest === null) {
                        userDataSyncStoreClient.dispose();
                        this.logService.trace(`Skipping initializing user data as there is no data`);
                        return;
                    }
                    this.logService.info(`Using settings sync service ${userDataSyncStore.url.toString()} for initialization`);
                    return userDataSyncStoreClient;
                }
                catch (error) {
                    this.logService.error(error);
                    return;
                }
            })();
        }
        return this._userDataSyncStoreClientPromise;
    }
    async initializeUserDataSyncStore(authenticationSession) {
        const userDataSyncStore = this.userDataSyncStoreManagementService.userDataSyncStore;
        if (!userDataSyncStore?.canSwitch) {
            return;
        }
        const disposables = new DisposableStore();
        try {
            const userDataSyncStoreClient = disposables.add(new UserDataSyncStoreClient(userDataSyncStore.url, this.productService, this.requestService, this.logService, this.environmentService, this.fileService, this.storageService));
            userDataSyncStoreClient.setAuthToken(authenticationSession.accessToken, authenticationSession.providerId);
            // Cache global state data for global state initialization
            this.globalStateUserData = await userDataSyncStoreClient.readResource("globalState" /* SyncResource.GlobalState */, null);
            if (this.globalStateUserData) {
                const userDataSyncStoreType = new UserDataSyncStoreTypeSynchronizer(userDataSyncStoreClient, this.storageService, this.environmentService, this.fileService, this.logService).getSyncStoreType(this.globalStateUserData);
                if (userDataSyncStoreType) {
                    await this.userDataSyncStoreManagementService.switch(userDataSyncStoreType);
                    // Unset cached global state data if urls are changed
                    if (!isEqual(userDataSyncStore.url, this.userDataSyncStoreManagementService.userDataSyncStore?.url)) {
                        this.logService.info('Switched settings sync store');
                        this.globalStateUserData = null;
                    }
                }
            }
        }
        finally {
            disposables.dispose();
        }
    }
    async whenInitializationFinished() {
        await this.initializationFinished.wait();
    }
    async requiresInitialization() {
        this.logService.trace(`UserDataInitializationService#requiresInitialization`);
        const userDataSyncStoreClient = await this.createUserDataSyncStoreClient();
        return !!userDataSyncStoreClient;
    }
    async initializeRequiredResources() {
        this.logService.trace(`UserDataInitializationService#initializeRequiredResources`);
        return this.initialize(["settings" /* SyncResource.Settings */, "globalState" /* SyncResource.GlobalState */]);
    }
    async initializeOtherResources(instantiationService) {
        try {
            this.logService.trace(`UserDataInitializationService#initializeOtherResources`);
            await Promise.allSettled([this.initialize(["keybindings" /* SyncResource.Keybindings */, "snippets" /* SyncResource.Snippets */, "tasks" /* SyncResource.Tasks */]), this.initializeExtensions(instantiationService)]);
        }
        finally {
            this.initializationFinished.open();
        }
    }
    async initializeExtensions(instantiationService) {
        try {
            await Promise.all([this.initializeInstalledExtensions(instantiationService), this.initializeNewExtensions(instantiationService)]);
        }
        finally {
            this.initialized.push("extensions" /* SyncResource.Extensions */);
        }
    }
    async initializeInstalledExtensions(instantiationService) {
        if (!this.initializeInstalledExtensionsPromise) {
            this.initializeInstalledExtensionsPromise = (async () => {
                this.logService.trace(`UserDataInitializationService#initializeInstalledExtensions`);
                const extensionsPreviewInitializer = await this.getExtensionsPreviewInitializer(instantiationService);
                if (extensionsPreviewInitializer) {
                    await instantiationService.createInstance(InstalledExtensionsInitializer, extensionsPreviewInitializer).initialize();
                }
            })();
        }
        return this.initializeInstalledExtensionsPromise;
    }
    async initializeNewExtensions(instantiationService) {
        if (!this.initializeNewExtensionsPromise) {
            this.initializeNewExtensionsPromise = (async () => {
                this.logService.trace(`UserDataInitializationService#initializeNewExtensions`);
                const extensionsPreviewInitializer = await this.getExtensionsPreviewInitializer(instantiationService);
                if (extensionsPreviewInitializer) {
                    await instantiationService.createInstance(NewExtensionsInitializer, extensionsPreviewInitializer).initialize();
                }
            })();
        }
        return this.initializeNewExtensionsPromise;
    }
    getExtensionsPreviewInitializer(instantiationService) {
        if (!this.extensionsPreviewInitializerPromise) {
            this.extensionsPreviewInitializerPromise = (async () => {
                const userDataSyncStoreClient = await this.createUserDataSyncStoreClient();
                if (!userDataSyncStoreClient) {
                    return null;
                }
                const userData = await userDataSyncStoreClient.readResource("extensions" /* SyncResource.Extensions */, null);
                return instantiationService.createInstance(ExtensionsPreviewInitializer, userData);
            })();
        }
        return this.extensionsPreviewInitializerPromise;
    }
    async initialize(syncResources) {
        const userDataSyncStoreClient = await this.createUserDataSyncStoreClient();
        if (!userDataSyncStoreClient) {
            return;
        }
        await Promises.settled(syncResources.map(async (syncResource) => {
            try {
                if (this.initialized.includes(syncResource)) {
                    this.logService.info(`${getSyncAreaLabel(syncResource)} initialized already.`);
                    return;
                }
                this.initialized.push(syncResource);
                this.logService.trace(`Initializing ${getSyncAreaLabel(syncResource)}`);
                const initializer = this.createSyncResourceInitializer(syncResource);
                const userData = await userDataSyncStoreClient.readResource(syncResource, syncResource === "globalState" /* SyncResource.GlobalState */ ? this.globalStateUserData : null);
                await initializer.initialize(userData);
                this.logService.info(`Initialized ${getSyncAreaLabel(syncResource)}`);
            }
            catch (error) {
                this.logService.info(`Error while initializing ${getSyncAreaLabel(syncResource)}`);
                this.logService.error(error);
            }
        }));
    }
    createSyncResourceInitializer(syncResource) {
        switch (syncResource) {
            case "settings" /* SyncResource.Settings */: return new SettingsInitializer(this.fileService, this.userDataProfilesService, this.environmentService, this.logService, this.storageService, this.uriIdentityService);
            case "keybindings" /* SyncResource.Keybindings */: return new KeybindingsInitializer(this.fileService, this.userDataProfilesService, this.environmentService, this.logService, this.storageService, this.uriIdentityService);
            case "tasks" /* SyncResource.Tasks */: return new TasksInitializer(this.fileService, this.userDataProfilesService, this.environmentService, this.logService, this.storageService, this.uriIdentityService);
            case "snippets" /* SyncResource.Snippets */: return new SnippetsInitializer(this.fileService, this.userDataProfilesService, this.environmentService, this.logService, this.storageService, this.uriIdentityService);
            case "globalState" /* SyncResource.GlobalState */: return new GlobalStateInitializer(this.storageService, this.fileService, this.userDataProfilesService, this.environmentService, this.logService, this.uriIdentityService);
        }
        throw new Error(`Cannot create initializer for ${syncResource}`);
    }
};
UserDataSyncInitializer = __decorate([
    __param(0, IBrowserWorkbenchEnvironmentService),
    __param(1, ISecretStorageService),
    __param(2, IUserDataSyncStoreManagementService),
    __param(3, IFileService),
    __param(4, IUserDataProfilesService),
    __param(5, IStorageService),
    __param(6, IProductService),
    __param(7, IRequestService),
    __param(8, ILogService),
    __param(9, IUriIdentityService)
], UserDataSyncInitializer);
export { UserDataSyncInitializer };
let ExtensionsPreviewInitializer = class ExtensionsPreviewInitializer extends AbstractExtensionsInitializer {
    constructor(extensionsData, extensionManagementService, ignoredExtensionsManagementService, fileService, userDataProfilesService, environmentService, logService, storageService, uriIdentityService) {
        super(extensionManagementService, ignoredExtensionsManagementService, fileService, userDataProfilesService, environmentService, logService, storageService, uriIdentityService);
        this.extensionsData = extensionsData;
        this.preview = null;
    }
    getPreview() {
        if (!this.previewPromise) {
            this.previewPromise = super.initialize(this.extensionsData).then(() => this.preview);
        }
        return this.previewPromise;
    }
    initialize() {
        throw new Error('should not be called directly');
    }
    async doInitialize(remoteUserData) {
        const remoteExtensions = await this.parseExtensions(remoteUserData);
        if (!remoteExtensions) {
            this.logService.info('Skipping initializing extensions because remote extensions does not exist.');
            return;
        }
        const installedExtensions = await this.extensionManagementService.getInstalled();
        this.preview = this.generatePreview(remoteExtensions, installedExtensions);
    }
};
ExtensionsPreviewInitializer = __decorate([
    __param(1, IExtensionManagementService),
    __param(2, IIgnoredExtensionsManagementService),
    __param(3, IFileService),
    __param(4, IUserDataProfilesService),
    __param(5, IEnvironmentService),
    __param(6, IUserDataSyncLogService),
    __param(7, IStorageService),
    __param(8, IUriIdentityService)
], ExtensionsPreviewInitializer);
let InstalledExtensionsInitializer = class InstalledExtensionsInitializer {
    constructor(extensionsPreviewInitializer, extensionEnablementService, extensionStorageService, logService) {
        this.extensionsPreviewInitializer = extensionsPreviewInitializer;
        this.extensionEnablementService = extensionEnablementService;
        this.extensionStorageService = extensionStorageService;
        this.logService = logService;
    }
    async initialize() {
        const preview = await this.extensionsPreviewInitializer.getPreview();
        if (!preview) {
            return;
        }
        // 1. Initialise already installed extensions state
        for (const installedExtension of preview.installedExtensions) {
            const syncExtension = preview.remoteExtensions.find(({ identifier }) => areSameExtensions(identifier, installedExtension.identifier));
            if (syncExtension?.state) {
                const extensionState = this.extensionStorageService.getExtensionState(installedExtension, true) || {};
                Object.keys(syncExtension.state).forEach(key => extensionState[key] = syncExtension.state[key]);
                this.extensionStorageService.setExtensionState(installedExtension, extensionState, true);
            }
        }
        // 2. Initialise extensions enablement
        if (preview.disabledExtensions.length) {
            for (const identifier of preview.disabledExtensions) {
                this.logService.trace(`Disabling extension...`, identifier.id);
                await this.extensionEnablementService.disableExtension(identifier);
                this.logService.info(`Disabling extension`, identifier.id);
            }
        }
    }
};
InstalledExtensionsInitializer = __decorate([
    __param(1, IGlobalExtensionEnablementService),
    __param(2, IExtensionStorageService),
    __param(3, IUserDataSyncLogService)
], InstalledExtensionsInitializer);
let NewExtensionsInitializer = class NewExtensionsInitializer {
    constructor(extensionsPreviewInitializer, extensionService, extensionStorageService, galleryService, extensionManagementService, logService) {
        this.extensionsPreviewInitializer = extensionsPreviewInitializer;
        this.extensionService = extensionService;
        this.extensionStorageService = extensionStorageService;
        this.galleryService = galleryService;
        this.extensionManagementService = extensionManagementService;
        this.logService = logService;
    }
    async initialize() {
        const preview = await this.extensionsPreviewInitializer.getPreview();
        if (!preview) {
            return;
        }
        const newlyEnabledExtensions = [];
        const targetPlatform = await this.extensionManagementService.getTargetPlatform();
        const galleryExtensions = await this.galleryService.getExtensions(preview.newExtensions, { targetPlatform, compatible: true }, CancellationToken.None);
        for (const galleryExtension of galleryExtensions) {
            try {
                const extensionToSync = preview.remoteExtensions.find(({ identifier }) => areSameExtensions(identifier, galleryExtension.identifier));
                if (!extensionToSync) {
                    continue;
                }
                if (extensionToSync.state) {
                    this.extensionStorageService.setExtensionState(galleryExtension, extensionToSync.state, true);
                }
                this.logService.trace(`Installing extension...`, galleryExtension.identifier.id);
                const local = await this.extensionManagementService.installFromGallery(galleryExtension, {
                    isMachineScoped: false, /* set isMachineScoped to prevent install and sync dialog in web */
                    donotIncludePackAndDependencies: true,
                    installGivenVersion: !!extensionToSync.version,
                    installPreReleaseVersion: extensionToSync.preRelease,
                    context: { [EXTENSION_INSTALL_SKIP_PUBLISHER_TRUST_CONTEXT]: true }
                });
                if (!preview.disabledExtensions.some(identifier => areSameExtensions(identifier, galleryExtension.identifier))) {
                    newlyEnabledExtensions.push(local);
                }
                this.logService.info(`Installed extension.`, galleryExtension.identifier.id);
            }
            catch (error) {
                this.logService.error(error);
            }
        }
        const canEnabledExtensions = newlyEnabledExtensions.filter(e => this.extensionService.canAddExtension(toExtensionDescription(e)));
        if (!(await this.areExtensionsRunning(canEnabledExtensions))) {
            await new Promise((c, e) => {
                const disposable = this.extensionService.onDidChangeExtensions(async () => {
                    try {
                        if (await this.areExtensionsRunning(canEnabledExtensions)) {
                            disposable.dispose();
                            c();
                        }
                    }
                    catch (error) {
                        e(error);
                    }
                });
            });
        }
    }
    async areExtensionsRunning(extensions) {
        await this.extensionService.whenInstalledExtensionsRegistered();
        const runningExtensions = this.extensionService.extensions;
        return extensions.every(e => runningExtensions.some(r => areSameExtensions({ id: r.identifier.value }, e.identifier)));
    }
};
NewExtensionsInitializer = __decorate([
    __param(1, IExtensionService),
    __param(2, IExtensionStorageService),
    __param(3, IExtensionGalleryService),
    __param(4, IExtensionManagementService),
    __param(5, IUserDataSyncLogService)
], NewExtensionsInitializer);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFTeW5jSW5pdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdXNlckRhdGFTeW5jL2Jyb3dzZXIvdXNlckRhdGFTeW5jSW5pdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFnQixNQUFNLGdEQUFnRCxDQUFDO0FBQy9GLE9BQU8sRUFBRSw2QkFBNkIsRUFBdUMsTUFBTSw0REFBNEQsQ0FBQztBQUNoSixPQUFPLEVBQUUsc0JBQXNCLEVBQUUsaUNBQWlDLEVBQUUsTUFBTSw2REFBNkQsQ0FBQztBQUN4SSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw2REFBNkQsQ0FBQztBQUNyRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUMvRixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUMvRixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFFMUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHNFQUFzRSxDQUFDO0FBQy9HLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUN4RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDakYsT0FBTyxFQUFnRSx1QkFBdUIsRUFBRSxtQ0FBbUMsRUFBZ0IsTUFBTSwwREFBMEQsQ0FBQztBQUNwTixPQUFPLEVBQTZCLG1DQUFtQyxFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDdkksT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDN0Qs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