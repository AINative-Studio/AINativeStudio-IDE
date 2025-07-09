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
var WorkspaceExtensionsManagementService_1;
import { Emitter, Event, EventMultiplexer } from '../../../../base/common/event.js';
import './media/extensionManagement.css';
import { IExtensionGalleryService, ExtensionManagementError, EXTENSION_INSTALL_SOURCE_CONTEXT, IAllowedExtensionsService, EXTENSION_INSTALL_SKIP_PUBLISHER_TRUST_CONTEXT, } from '../../../../platform/extensionManagement/common/extensionManagement.js';
import { IExtensionManagementServerService } from './extensionManagement.js';
import { isLanguagePackExtension, getWorkspaceSupportTypeMessage } from '../../../../platform/extensions/common/extensions.js';
import { URI } from '../../../../base/common/uri.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { areSameExtensions, computeTargetPlatform } from '../../../../platform/extensionManagement/common/extensionManagementUtil.js';
import { localize } from '../../../../nls.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { Schemas } from '../../../../base/common/network.js';
import { IDownloadService } from '../../../../platform/download/common/download.js';
import { coalesce, distinct, isNonEmptyArray } from '../../../../base/common/arrays.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import Severity from '../../../../base/common/severity.js';
import { IUserDataSyncEnablementService } from '../../../../platform/userDataSync/common/userDataSync.js';
import { Promises } from '../../../../base/common/async.js';
import { IWorkspaceTrustRequestService } from '../../../../platform/workspace/common/workspaceTrust.js';
import { IExtensionManifestPropertiesService } from '../../extensions/common/extensionManifestPropertiesService.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { isString, isUndefined } from '../../../../base/common/types.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { CancellationError, getErrorMessage } from '../../../../base/common/errors.js';
import { IUserDataProfileService } from '../../userDataProfile/common/userDataProfile.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IExtensionsScannerService } from '../../../../platform/extensionManagement/common/extensionsScannerService.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IUserDataProfilesService } from '../../../../platform/userDataProfile/common/userDataProfile.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { verifiedPublisherIcon } from './extensionsIcons.js';
import { Codicon } from '../../../../base/common/codicons.js';
const TrustedPublishersStorageKey = 'extensions.trustedPublishers';
function isGalleryExtension(extension) {
    return extension.type === 'gallery';
}
let ExtensionManagementService = class ExtensionManagementService extends Disposable {
    constructor(extensionManagementServerService, extensionGalleryService, userDataProfileService, userDataProfilesService, configurationService, productService, downloadService, userDataSyncEnablementService, dialogService, workspaceTrustRequestService, extensionManifestPropertiesService, fileService, logService, instantiationService, extensionsScannerService, allowedExtensionsService, storageService, telemetryService) {
        super();
        this.extensionManagementServerService = extensionManagementServerService;
        this.extensionGalleryService = extensionGalleryService;
        this.userDataProfileService = userDataProfileService;
        this.userDataProfilesService = userDataProfilesService;
        this.configurationService = configurationService;
        this.productService = productService;
        this.downloadService = downloadService;
        this.userDataSyncEnablementService = userDataSyncEnablementService;
        this.dialogService = dialogService;
        this.workspaceTrustRequestService = workspaceTrustRequestService;
        this.extensionManifestPropertiesService = extensionManifestPropertiesService;
        this.fileService = fileService;
        this.logService = logService;
        this.instantiationService = instantiationService;
        this.extensionsScannerService = extensionsScannerService;
        this.allowedExtensionsService = allowedExtensionsService;
        this.storageService = storageService;
        this.telemetryService = telemetryService;
        this._onInstallExtension = this._register(new Emitter());
        this._onDidInstallExtensions = this._register(new Emitter());
        this._onUninstallExtension = this._register(new Emitter());
        this._onDidUninstallExtension = this._register(new Emitter());
        this._onDidProfileAwareInstallExtensions = this._register(new Emitter());
        this._onDidProfileAwareUninstallExtension = this._register(new Emitter());
        this.servers = [];
        this.defaultTrustedPublishers = productService.trustedExtensionPublishers ?? [];
        this.workspaceExtensionManagementService = this._register(this.instantiationService.createInstance(WorkspaceExtensionsManagementService));
        this.onDidEnableExtensions = this.workspaceExtensionManagementService.onDidChangeInvalidExtensions;
        if (this.extensionManagementServerService.localExtensionManagementServer) {
            this.servers.push(this.extensionManagementServerService.localExtensionManagementServer);
        }
        if (this.extensionManagementServerService.remoteExtensionManagementServer) {
            this.servers.push(this.extensionManagementServerService.remoteExtensionManagementServer);
        }
        if (this.extensionManagementServerService.webExtensionManagementServer) {
            this.servers.push(this.extensionManagementServerService.webExtensionManagementServer);
        }
        const onInstallExtensionEventMultiplexer = this._register(new EventMultiplexer());
        this._register(onInstallExtensionEventMultiplexer.add(this._onInstallExtension.event));
        this.onInstallExtension = onInstallExtensionEventMultiplexer.event;
        const onDidInstallExtensionsEventMultiplexer = this._register(new EventMultiplexer());
        this._register(onDidInstallExtensionsEventMultiplexer.add(this._onDidInstallExtensions.event));
        this.onDidInstallExtensions = onDidInstallExtensionsEventMultiplexer.event;
        const onDidProfileAwareInstallExtensionsEventMultiplexer = this._register(new EventMultiplexer());
        this._register(onDidProfileAwareInstallExtensionsEventMultiplexer.add(this._onDidProfileAwareInstallExtensions.event));
        this.onProfileAwareDidInstallExtensions = onDidProfileAwareInstallExtensionsEventMultiplexer.event;
        const onUninstallExtensionEventMultiplexer = this._register(new EventMultiplexer());
        this._register(onUninstallExtensionEventMultiplexer.add(this._onUninstallExtension.event));
        this.onUninstallExtension = onUninstallExtensionEventMultiplexer.event;
        const onDidUninstallExtensionEventMultiplexer = this._register(new EventMultiplexer());
        this._register(onDidUninstallExtensionEventMultiplexer.add(this._onDidUninstallExtension.event));
        this.onDidUninstallExtension = onDidUninstallExtensionEventMultiplexer.event;
        const onDidProfileAwareUninstallExtensionEventMultiplexer = this._register(new EventMultiplexer());
        this._register(onDidProfileAwareUninstallExtensionEventMultiplexer.add(this._onDidProfileAwareUninstallExtension.event));
        this.onProfileAwareDidUninstallExtension = onDidProfileAwareUninstallExtensionEventMultiplexer.event;
        const onDidUpdateExtensionMetadaEventMultiplexer = this._register(new EventMultiplexer());
        this.onDidUpdateExtensionMetadata = onDidUpdateExtensionMetadaEventMultiplexer.event;
        const onDidProfileAwareUpdateExtensionMetadaEventMultiplexer = this._register(new EventMultiplexer());
        this.onProfileAwareDidUpdateExtensionMetadata = onDidProfileAwareUpdateExtensionMetadaEventMultiplexer.event;
        const onDidChangeProfileEventMultiplexer = this._register(new EventMultiplexer());
        this.onDidChangeProfile = onDidChangeProfileEventMultiplexer.event;
        for (const server of this.servers) {
            this._register(onInstallExtensionEventMultiplexer.add(Event.map(server.extensionManagementService.onInstallExtension, e => ({ ...e, server }))));
            this._register(onDidInstallExtensionsEventMultiplexer.add(server.extensionManagementService.onDidInstallExtensions));
            this._register(onDidProfileAwareInstallExtensionsEventMultiplexer.add(server.extensionManagementService.onProfileAwareDidInstallExtensions));
            this._register(onUninstallExtensionEventMultiplexer.add(Event.map(server.extensionManagementService.onUninstallExtension, e => ({ ...e, server }))));
            this._register(onDidUninstallExtensionEventMultiplexer.add(Event.map(server.extensionManagementService.onDidUninstallExtension, e => ({ ...e, server }))));
            this._register(onDidProfileAwareUninstallExtensionEventMultiplexer.add(Event.map(server.extensionManagementService.onProfileAwareDidUninstallExtension, e => ({ ...e, server }))));
            this._register(onDidUpdateExtensionMetadaEventMultiplexer.add(server.extensionManagementService.onDidUpdateExtensionMetadata));
            this._register(onDidProfileAwareUpdateExtensionMetadaEventMultiplexer.add(server.extensionManagementService.onProfileAwareDidUpdateExtensionMetadata));
            this._register(onDidChangeProfileEventMultiplexer.add(Event.map(server.extensionManagementService.onDidChangeProfile, e => ({ ...e, server }))));
        }
        this._register(this.onProfileAwareDidInstallExtensions(results => {
            const untrustedPublishers = new Map();
            for (const result of results) {
                if (result.local && result.source && !URI.isUri(result.source) && !this.isPublisherTrusted(result.source)) {
                    untrustedPublishers.set(result.source.publisher, { publisher: result.source.publisher, publisherDisplayName: result.source.publisherDisplayName });
                }
            }
            if (untrustedPublishers.size) {
                this.trustPublishers(...untrustedPublishers.values());
            }
        }));
    }
    async getInstalled(type, profileLocation, productVersion) {
        const result = [];
        await Promise.all(this.servers.map(async (server) => {
            const installed = await server.extensionManagementService.getInstalled(type, profileLocation, productVersion);
            if (server === this.getWorkspaceExtensionsServer()) {
                const workspaceExtensions = await this.getInstalledWorkspaceExtensions(true);
                installed.push(...workspaceExtensions);
            }
            result.push(...installed);
        }));
        return result;
    }
    uninstall(extension, options) {
        return this.uninstallExtensions([{ extension, options }]);
    }
    async uninstallExtensions(extensions) {
        const workspaceExtensions = [];
        const groupedExtensions = new Map();
        const addExtensionToServer = (server, extension, options) => {
            let extensions = groupedExtensions.get(server);
            if (!extensions) {
                groupedExtensions.set(server, extensions = []);
            }
            extensions.push({ extension, options });
        };
        for (const { extension, options } of extensions) {
            if (extension.isWorkspaceScoped) {
                workspaceExtensions.push(extension);
                continue;
            }
            const server = this.getServer(extension);
            if (!server) {
                throw new Error(`Invalid location ${extension.location.toString()}`);
            }
            addExtensionToServer(server, extension, options);
            if (this.servers.length > 1 && isLanguagePackExtension(extension.manifest)) {
                const otherServers = this.servers.filter(s => s !== server);
                for (const otherServer of otherServers) {
                    const installed = await otherServer.extensionManagementService.getInstalled();
                    const extensionInOtherServer = installed.find(i => !i.isBuiltin && areSameExtensions(i.identifier, extension.identifier));
                    if (extensionInOtherServer) {
                        addExtensionToServer(otherServer, extensionInOtherServer, options);
                    }
                }
            }
        }
        const promises = [];
        for (const workspaceExtension of workspaceExtensions) {
            promises.push(this.uninstallExtensionFromWorkspace(workspaceExtension));
        }
        for (const [server, extensions] of groupedExtensions.entries()) {
            promises.push(this.uninstallInServer(server, extensions));
        }
        const result = await Promise.allSettled(promises);
        const errors = result.filter(r => r.status === 'rejected').map(r => r.reason);
        if (errors.length) {
            throw new Error(errors.map(e => e.message).join('\n'));
        }
    }
    async uninstallInServer(server, extensions) {
        if (server === this.extensionManagementServerService.localExtensionManagementServer && this.extensionManagementServerService.remoteExtensionManagementServer) {
            for (const { extension } of extensions) {
                const installedExtensions = await this.extensionManagementServerService.remoteExtensionManagementServer.extensionManagementService.getInstalled(1 /* ExtensionType.User */);
                const dependentNonUIExtensions = installedExtensions.filter(i => !this.extensionManifestPropertiesService.prefersExecuteOnUI(i.manifest)
                    && i.manifest.extensionDependencies && i.manifest.extensionDependencies.some(id => areSameExtensions({ id }, extension.identifier)));
                if (dependentNonUIExtensions.length) {
                    throw (new Error(this.getDependentsErrorMessage(extension, dependentNonUIExtensions)));
                }
            }
        }
        return server.extensionManagementService.uninstallExtensions(extensions);
    }
    getDependentsErrorMessage(extension, dependents) {
        if (dependents.length === 1) {
            return localize('singleDependentError', "Cannot uninstall extension '{0}'. Extension '{1}' depends on this.", extension.manifest.displayName || extension.manifest.name, dependents[0].manifest.displayName || dependents[0].manifest.name);
        }
        if (dependents.length === 2) {
            return localize('twoDependentsError', "Cannot uninstall extension '{0}'. Extensions '{1}' and '{2}' depend on this.", extension.manifest.displayName || extension.manifest.name, dependents[0].manifest.displayName || dependents[0].manifest.name, dependents[1].manifest.displayName || dependents[1].manifest.name);
        }
        return localize('multipleDependentsError', "Cannot uninstall extension '{0}'. Extensions '{1}', '{2}' and others depend on this.", extension.manifest.displayName || extension.manifest.name, dependents[0].manifest.displayName || dependents[0].manifest.name, dependents[1].manifest.displayName || dependents[1].manifest.name);
    }
    updateMetadata(extension, metadata) {
        const server = this.getServer(extension);
        if (server) {
            const profile = extension.isApplicationScoped ? this.userDataProfilesService.defaultProfile : this.userDataProfileService.currentProfile;
            return server.extensionManagementService.updateMetadata(extension, metadata, profile.extensionsResource);
        }
        return Promise.reject(`Invalid location ${extension.location.toString()}`);
    }
    async resetPinnedStateForAllUserExtensions(pinned) {
        await Promise.allSettled(this.servers.map(server => server.extensionManagementService.resetPinnedStateForAllUserExtensions(pinned)));
    }
    zip(extension) {
        const server = this.getServer(extension);
        if (server) {
            return server.extensionManagementService.zip(extension);
        }
        return Promise.reject(`Invalid location ${extension.location.toString()}`);
    }
    download(extension, operation, donotVerifySignature) {
        if (this.extensionManagementServerService.localExtensionManagementServer) {
            return this.extensionManagementServerService.localExtensionManagementServer.extensionManagementService.download(extension, operation, donotVerifySignature);
        }
        throw new Error('Cannot download extension');
    }
    async install(vsix, options) {
        const manifest = await this.getManifest(vsix);
        return this.installVSIX(vsix, manifest, options);
    }
    async installVSIX(vsix, manifest, options) {
        const serversToInstall = this.getServersToInstall(manifest);
        if (serversToInstall?.length) {
            await this.checkForWorkspaceTrust(manifest, false);
            const [local] = await Promises.settled(serversToInstall.map(server => this.installVSIXInServer(vsix, server, options)));
            return local;
        }
        return Promise.reject('No Servers to Install');
    }
    getServersToInstall(manifest) {
        if (this.extensionManagementServerService.localExtensionManagementServer && this.extensionManagementServerService.remoteExtensionManagementServer) {
            if (isLanguagePackExtension(manifest)) {
                // Install on both servers
                return [this.extensionManagementServerService.localExtensionManagementServer, this.extensionManagementServerService.remoteExtensionManagementServer];
            }
            if (this.extensionManifestPropertiesService.prefersExecuteOnUI(manifest)) {
                // Install only on local server
                return [this.extensionManagementServerService.localExtensionManagementServer];
            }
            // Install only on remote server
            return [this.extensionManagementServerService.remoteExtensionManagementServer];
        }
        if (this.extensionManagementServerService.localExtensionManagementServer) {
            return [this.extensionManagementServerService.localExtensionManagementServer];
        }
        if (this.extensionManagementServerService.remoteExtensionManagementServer) {
            return [this.extensionManagementServerService.remoteExtensionManagementServer];
        }
        return undefined;
    }
    async installFromLocation(location) {
        if (location.scheme === Schemas.file) {
            if (this.extensionManagementServerService.localExtensionManagementServer) {
                return this.extensionManagementServerService.localExtensionManagementServer.extensionManagementService.installFromLocation(location, this.userDataProfileService.currentProfile.extensionsResource);
            }
            throw new Error('Local extension management server is not found');
        }
        if (location.scheme === Schemas.vscodeRemote) {
            if (this.extensionManagementServerService.remoteExtensionManagementServer) {
                return this.extensionManagementServerService.remoteExtensionManagementServer.extensionManagementService.installFromLocation(location, this.userDataProfileService.currentProfile.extensionsResource);
            }
            throw new Error('Remote extension management server is not found');
        }
        if (!this.extensionManagementServerService.webExtensionManagementServer) {
            throw new Error('Web extension management server is not found');
        }
        return this.extensionManagementServerService.webExtensionManagementServer.extensionManagementService.installFromLocation(location, this.userDataProfileService.currentProfile.extensionsResource);
    }
    installVSIXInServer(vsix, server, options) {
        return server.extensionManagementService.install(vsix, options);
    }
    getManifest(vsix) {
        if (vsix.scheme === Schemas.file && this.extensionManagementServerService.localExtensionManagementServer) {
            return this.extensionManagementServerService.localExtensionManagementServer.extensionManagementService.getManifest(vsix);
        }
        if (vsix.scheme === Schemas.file && this.extensionManagementServerService.remoteExtensionManagementServer) {
            return this.extensionManagementServerService.remoteExtensionManagementServer.extensionManagementService.getManifest(vsix);
        }
        if (vsix.scheme === Schemas.vscodeRemote && this.extensionManagementServerService.remoteExtensionManagementServer) {
            return this.extensionManagementServerService.remoteExtensionManagementServer.extensionManagementService.getManifest(vsix);
        }
        return Promise.reject('No Servers');
    }
    async canInstall(extension) {
        if (isGalleryExtension(extension)) {
            return this.canInstallGalleryExtension(extension);
        }
        return this.canInstallResourceExtension(extension);
    }
    async canInstallGalleryExtension(gallery) {
        if (this.extensionManagementServerService.localExtensionManagementServer
            && await this.extensionManagementServerService.localExtensionManagementServer.extensionManagementService.canInstall(gallery) === true) {
            return true;
        }
        const manifest = await this.extensionGalleryService.getManifest(gallery, CancellationToken.None);
        if (!manifest) {
            return new MarkdownString().appendText(localize('manifest is not found', "Manifest is not found"));
        }
        if (this.extensionManagementServerService.remoteExtensionManagementServer
            && await this.extensionManagementServerService.remoteExtensionManagementServer.extensionManagementService.canInstall(gallery) === true
            && this.extensionManifestPropertiesService.canExecuteOnWorkspace(manifest)) {
            return true;
        }
        if (this.extensionManagementServerService.webExtensionManagementServer
            && await this.extensionManagementServerService.webExtensionManagementServer.extensionManagementService.canInstall(gallery) === true
            && this.extensionManifestPropertiesService.canExecuteOnWeb(manifest)) {
            return true;
        }
        return new MarkdownString().appendText(localize('cannot be installed', "Cannot install the '{0}' extension because it is not available in this setup.", gallery.displayName || gallery.name));
    }
    async canInstallResourceExtension(extension) {
        if (this.extensionManagementServerService.localExtensionManagementServer) {
            return true;
        }
        if (this.extensionManagementServerService.remoteExtensionManagementServer && this.extensionManifestPropertiesService.canExecuteOnWorkspace(extension.manifest)) {
            return true;
        }
        if (this.extensionManagementServerService.webExtensionManagementServer && this.extensionManifestPropertiesService.canExecuteOnWeb(extension.manifest)) {
            return true;
        }
        return new MarkdownString().appendText(localize('cannot be installed', "Cannot install the '{0}' extension because it is not available in this setup.", extension.manifest.displayName ?? extension.identifier.id));
    }
    async updateFromGallery(gallery, extension, installOptions) {
        const server = this.getServer(extension);
        if (!server) {
            return Promise.reject(`Invalid location ${extension.location.toString()}`);
        }
        const servers = [];
        // Update Language pack on local and remote servers
        if (isLanguagePackExtension(extension.manifest)) {
            servers.push(...this.servers.filter(server => server !== this.extensionManagementServerService.webExtensionManagementServer));
        }
        else {
            servers.push(server);
        }
        installOptions = { ...(installOptions || {}), isApplicationScoped: extension.isApplicationScoped };
        return Promises.settled(servers.map(server => server.extensionManagementService.installFromGallery(gallery, installOptions))).then(([local]) => local);
    }
    async installGalleryExtensions(extensions) {
        const results = new Map();
        const extensionsByServer = new Map();
        const manifests = await Promise.all(extensions.map(async ({ extension }) => {
            const manifest = await this.extensionGalleryService.getManifest(extension, CancellationToken.None);
            if (!manifest) {
                throw new Error(localize('Manifest is not found', "Installing Extension {0} failed: Manifest is not found.", extension.displayName || extension.name));
            }
            return manifest;
        }));
        if (extensions.some(e => e.options?.context?.[EXTENSION_INSTALL_SKIP_PUBLISHER_TRUST_CONTEXT] !== true)) {
            await this.checkForTrustedPublishers(extensions.map((e, index) => ({ extension: e.extension, manifest: manifests[index], checkForPackAndDependencies: !e.options?.donotIncludePackAndDependencies })));
        }
        await Promise.all(extensions.map(async ({ extension, options }) => {
            try {
                const manifest = await this.extensionGalleryService.getManifest(extension, CancellationToken.None);
                if (!manifest) {
                    throw new Error(localize('Manifest is not found', "Installing Extension {0} failed: Manifest is not found.", extension.displayName || extension.name));
                }
                if (options?.context?.[EXTENSION_INSTALL_SOURCE_CONTEXT] !== "settingsSync" /* ExtensionInstallSource.SETTINGS_SYNC */) {
                    await this.checkForWorkspaceTrust(manifest, false);
                    if (!options?.donotIncludePackAndDependencies) {
                        await this.checkInstallingExtensionOnWeb(extension, manifest);
                    }
                }
                const servers = await this.getExtensionManagementServersToInstall(extension, manifest);
                if (!options.isMachineScoped && this.isExtensionsSyncEnabled()) {
                    if (this.extensionManagementServerService.localExtensionManagementServer
                        && !servers.includes(this.extensionManagementServerService.localExtensionManagementServer)
                        && await this.extensionManagementServerService.localExtensionManagementServer.extensionManagementService.canInstall(extension) === true) {
                        servers.push(this.extensionManagementServerService.localExtensionManagementServer);
                    }
                }
                for (const server of servers) {
                    let exensions = extensionsByServer.get(server);
                    if (!exensions) {
                        extensionsByServer.set(server, exensions = []);
                    }
                    exensions.push({ extension, options });
                }
            }
            catch (error) {
                results.set(extension.identifier.id.toLowerCase(), {
                    identifier: extension.identifier,
                    source: extension, error,
                    operation: 2 /* InstallOperation.Install */,
                    profileLocation: options.profileLocation ?? this.userDataProfileService.currentProfile.extensionsResource
                });
            }
        }));
        await Promise.all([...extensionsByServer.entries()].map(async ([server, extensions]) => {
            const serverResults = await server.extensionManagementService.installGalleryExtensions(extensions);
            for (const result of serverResults) {
                results.set(result.identifier.id.toLowerCase(), result);
            }
        }));
        return [...results.values()];
    }
    async installFromGallery(gallery, installOptions, servers) {
        const manifest = await this.extensionGalleryService.getManifest(gallery, CancellationToken.None);
        if (!manifest) {
            throw new Error(localize('Manifest is not found', "Installing Extension {0} failed: Manifest is not found.", gallery.displayName || gallery.name));
        }
        if (installOptions?.context?.[EXTENSION_INSTALL_SKIP_PUBLISHER_TRUST_CONTEXT] !== true) {
            await this.checkForTrustedPublishers([{ extension: gallery, manifest, checkForPackAndDependencies: !installOptions?.donotIncludePackAndDependencies }]);
        }
        if (installOptions?.context?.[EXTENSION_INSTALL_SOURCE_CONTEXT] !== "settingsSync" /* ExtensionInstallSource.SETTINGS_SYNC */) {
            await this.checkForWorkspaceTrust(manifest, false);
            if (!installOptions?.donotIncludePackAndDependencies) {
                await this.checkInstallingExtensionOnWeb(gallery, manifest);
            }
        }
        servers = servers?.length ? this.validServers(gallery, manifest, servers) : await this.getExtensionManagementServersToInstall(gallery, manifest);
        if (!installOptions || isUndefined(installOptions.isMachineScoped)) {
            const isMachineScoped = await this.hasToFlagExtensionsMachineScoped([gallery]);
            installOptions = { ...(installOptions || {}), isMachineScoped };
        }
        if (!installOptions.isMachineScoped && this.isExtensionsSyncEnabled()) {
            if (this.extensionManagementServerService.localExtensionManagementServer
                && !servers.includes(this.extensionManagementServerService.localExtensionManagementServer)
                && await this.extensionManagementServerService.localExtensionManagementServer.extensionManagementService.canInstall(gallery) === true) {
                servers.push(this.extensionManagementServerService.localExtensionManagementServer);
            }
        }
        return Promises.settled(servers.map(server => server.extensionManagementService.installFromGallery(gallery, installOptions))).then(([local]) => local);
    }
    async getExtensions(locations) {
        const scannedExtensions = await this.extensionsScannerService.scanMultipleExtensions(locations, 1 /* ExtensionType.User */, { includeInvalid: true });
        const result = [];
        await Promise.all(scannedExtensions.map(async (scannedExtension) => {
            const workspaceExtension = await this.workspaceExtensionManagementService.toLocalWorkspaceExtension(scannedExtension);
            if (workspaceExtension) {
                result.push({
                    type: 'resource',
                    identifier: workspaceExtension.identifier,
                    location: workspaceExtension.location,
                    manifest: workspaceExtension.manifest,
                    changelogUri: workspaceExtension.changelogUrl,
                    readmeUri: workspaceExtension.readmeUrl,
                });
            }
        }));
        return result;
    }
    getInstalledWorkspaceExtensionLocations() {
        return this.workspaceExtensionManagementService.getInstalledWorkspaceExtensionsLocations();
    }
    async getInstalledWorkspaceExtensions(includeInvalid) {
        return this.workspaceExtensionManagementService.getInstalled(includeInvalid);
    }
    async installResourceExtension(extension, installOptions) {
        if (!this.canInstallResourceExtension(extension)) {
            throw new Error('This extension cannot be installed in the current workspace.');
        }
        if (!installOptions.isWorkspaceScoped) {
            return this.installFromLocation(extension.location);
        }
        this.logService.info(`Installing the extension ${extension.identifier.id} from ${extension.location.toString()} in workspace`);
        const server = this.getWorkspaceExtensionsServer();
        this._onInstallExtension.fire({
            identifier: extension.identifier,
            source: extension.location,
            server,
            applicationScoped: false,
            profileLocation: this.userDataProfileService.currentProfile.extensionsResource,
            workspaceScoped: true
        });
        try {
            await this.checkForWorkspaceTrust(extension.manifest, true);
            const workspaceExtension = await this.workspaceExtensionManagementService.install(extension);
            this.logService.info(`Successfully installed the extension ${workspaceExtension.identifier.id} from ${extension.location.toString()} in the workspace`);
            this._onDidInstallExtensions.fire([{
                    identifier: workspaceExtension.identifier,
                    source: extension.location,
                    operation: 2 /* InstallOperation.Install */,
                    applicationScoped: false,
                    profileLocation: this.userDataProfileService.currentProfile.extensionsResource,
                    local: workspaceExtension,
                    workspaceScoped: true
                }]);
            return workspaceExtension;
        }
        catch (error) {
            this.logService.error(`Failed to install the extension ${extension.identifier.id} from ${extension.location.toString()} in the workspace`, getErrorMessage(error));
            this._onDidInstallExtensions.fire([{
                    identifier: extension.identifier,
                    source: extension.location,
                    operation: 2 /* InstallOperation.Install */,
                    applicationScoped: false,
                    profileLocation: this.userDataProfileService.currentProfile.extensionsResource,
                    error,
                    workspaceScoped: true
                }]);
            throw error;
        }
    }
    async getInstallableServers(gallery) {
        const manifest = await this.extensionGalleryService.getManifest(gallery, CancellationToken.None);
        if (!manifest) {
            return Promise.reject(localize('Manifest is not found', "Installing Extension {0} failed: Manifest is not found.", gallery.displayName || gallery.name));
        }
        return this.getInstallableExtensionManagementServers(manifest);
    }
    async uninstallExtensionFromWorkspace(extension) {
        if (!extension.isWorkspaceScoped) {
            throw new Error('The extension is not a workspace extension');
        }
        this.logService.info(`Uninstalling the workspace extension ${extension.identifier.id} from ${extension.location.toString()}`);
        const server = this.getWorkspaceExtensionsServer();
        this._onUninstallExtension.fire({
            identifier: extension.identifier,
            server,
            applicationScoped: false,
            workspaceScoped: true,
            profileLocation: this.userDataProfileService.currentProfile.extensionsResource
        });
        try {
            await this.workspaceExtensionManagementService.uninstall(extension);
            this.logService.info(`Successfully uninstalled the workspace extension ${extension.identifier.id} from ${extension.location.toString()}`);
            this.telemetryService.publicLog2('workspaceextension:uninstall');
            this._onDidUninstallExtension.fire({
                identifier: extension.identifier,
                server,
                applicationScoped: false,
                workspaceScoped: true,
                profileLocation: this.userDataProfileService.currentProfile.extensionsResource
            });
        }
        catch (error) {
            this.logService.error(`Failed to uninstall the workspace extension ${extension.identifier.id} from ${extension.location.toString()}`, getErrorMessage(error));
            this._onDidUninstallExtension.fire({
                identifier: extension.identifier,
                server,
                error,
                applicationScoped: false,
                workspaceScoped: true,
                profileLocation: this.userDataProfileService.currentProfile.extensionsResource
            });
            throw error;
        }
    }
    validServers(gallery, manifest, servers) {
        const installableServers = this.getInstallableExtensionManagementServers(manifest);
        for (const server of servers) {
            if (!installableServers.includes(server)) {
                const error = new Error(localize('cannot be installed in server', "Cannot install the '{0}' extension because it is not available in the '{1}' setup.", gallery.displayName || gallery.name, server.label));
                error.name = "Unsupported" /* ExtensionManagementErrorCode.Unsupported */;
                throw error;
            }
        }
        return servers;
    }
    async getExtensionManagementServersToInstall(gallery, manifest) {
        const servers = [];
        // Language packs should be installed on both local and remote servers
        if (isLanguagePackExtension(manifest)) {
            servers.push(...this.servers.filter(server => server !== this.extensionManagementServerService.webExtensionManagementServer));
        }
        else {
            const [server] = this.getInstallableExtensionManagementServers(manifest);
            if (server) {
                servers.push(server);
            }
        }
        if (!servers.length) {
            const error = new Error(localize('cannot be installed', "Cannot install the '{0}' extension because it is not available in this setup.", gallery.displayName || gallery.name));
            error.name = "Unsupported" /* ExtensionManagementErrorCode.Unsupported */;
            throw error;
        }
        return servers;
    }
    getInstallableExtensionManagementServers(manifest) {
        // Only local server
        if (this.servers.length === 1 && this.extensionManagementServerService.localExtensionManagementServer) {
            return [this.extensionManagementServerService.localExtensionManagementServer];
        }
        const servers = [];
        const extensionKind = this.extensionManifestPropertiesService.getExtensionKind(manifest);
        for (const kind of extensionKind) {
            if (kind === 'ui' && this.extensionManagementServerService.localExtensionManagementServer) {
                servers.push(this.extensionManagementServerService.localExtensionManagementServer);
            }
            if (kind === 'workspace' && this.extensionManagementServerService.remoteExtensionManagementServer) {
                servers.push(this.extensionManagementServerService.remoteExtensionManagementServer);
            }
            if (kind === 'web' && this.extensionManagementServerService.webExtensionManagementServer) {
                servers.push(this.extensionManagementServerService.webExtensionManagementServer);
            }
        }
        // Local server can accept any extension.
        if (this.extensionManagementServerService.localExtensionManagementServer && !servers.includes(this.extensionManagementServerService.localExtensionManagementServer)) {
            servers.push(this.extensionManagementServerService.localExtensionManagementServer);
        }
        return servers;
    }
    isExtensionsSyncEnabled() {
        return this.userDataSyncEnablementService.isEnabled() && this.userDataSyncEnablementService.isResourceEnabled("extensions" /* SyncResource.Extensions */);
    }
    async hasToFlagExtensionsMachineScoped(extensions) {
        if (this.isExtensionsSyncEnabled()) {
            const { result } = await this.dialogService.prompt({
                type: Severity.Info,
                message: extensions.length === 1 ? localize('install extension', "Install Extension") : localize('install extensions', "Install Extensions"),
                detail: extensions.length === 1
                    ? localize('install single extension', "Would you like to install and synchronize '{0}' extension across your devices?", extensions[0].displayName)
                    : localize('install multiple extensions', "Would you like to install and synchronize extensions across your devices?"),
                buttons: [
                    {
                        label: localize({ key: 'install', comment: ['&& denotes a mnemonic'] }, "&&Install"),
                        run: () => false
                    },
                    {
                        label: localize({ key: 'install and do no sync', comment: ['&& denotes a mnemonic'] }, "Install (Do &&not sync)"),
                        run: () => true
                    }
                ],
                cancelButton: {
                    run: () => {
                        throw new CancellationError();
                    }
                }
            });
            return result;
        }
        return false;
    }
    getExtensionsControlManifest() {
        if (this.extensionManagementServerService.localExtensionManagementServer) {
            return this.extensionManagementServerService.localExtensionManagementServer.extensionManagementService.getExtensionsControlManifest();
        }
        if (this.extensionManagementServerService.remoteExtensionManagementServer) {
            return this.extensionManagementServerService.remoteExtensionManagementServer.extensionManagementService.getExtensionsControlManifest();
        }
        if (this.extensionManagementServerService.webExtensionManagementServer) {
            return this.extensionManagementServerService.webExtensionManagementServer.extensionManagementService.getExtensionsControlManifest();
        }
        return this.extensionGalleryService.getExtensionsControlManifest();
    }
    getServer(extension) {
        if (extension.isWorkspaceScoped) {
            return this.getWorkspaceExtensionsServer();
        }
        return this.extensionManagementServerService.getExtensionManagementServer(extension);
    }
    getWorkspaceExtensionsServer() {
        if (this.extensionManagementServerService.remoteExtensionManagementServer) {
            return this.extensionManagementServerService.remoteExtensionManagementServer;
        }
        if (this.extensionManagementServerService.localExtensionManagementServer) {
            return this.extensionManagementServerService.localExtensionManagementServer;
        }
        if (this.extensionManagementServerService.webExtensionManagementServer) {
            return this.extensionManagementServerService.webExtensionManagementServer;
        }
        throw new Error('No extension server found');
    }
    async requestPublisherTrust(extensions) {
        const manifests = await Promise.all(extensions.map(async ({ extension }) => {
            const manifest = await this.extensionGalleryService.getManifest(extension, CancellationToken.None);
            if (!manifest) {
                throw new Error(localize('Manifest is not found', "Installing Extension {0} failed: Manifest is not found.", extension.displayName || extension.name));
            }
            return manifest;
        }));
        await this.checkForTrustedPublishers(extensions.map((e, index) => ({ extension: e.extension, manifest: manifests[index], checkForPackAndDependencies: !e.options?.donotIncludePackAndDependencies })));
    }
    async checkForTrustedPublishers(extensions) {
        const untrustedExtensions = [];
        const untrustedExtensionManifests = [];
        const manifestsToGetOtherUntrustedPublishers = [];
        for (const { extension, manifest, checkForPackAndDependencies } of extensions) {
            if (!extension.private && !this.isPublisherTrusted(extension)) {
                untrustedExtensions.push(extension);
                untrustedExtensionManifests.push(manifest);
                if (checkForPackAndDependencies) {
                    manifestsToGetOtherUntrustedPublishers.push(manifest);
                }
            }
        }
        if (!untrustedExtensions.length) {
            return;
        }
        const otherUntrustedPublishers = manifestsToGetOtherUntrustedPublishers.length ? await this.getOtherUntrustedPublishers(manifestsToGetOtherUntrustedPublishers) : [];
        const allPublishers = [...distinct(untrustedExtensions, e => e.publisher), ...otherUntrustedPublishers];
        const unverfiiedPublishers = allPublishers.filter(p => !p.publisherDomain?.verified);
        const verifiedPublishers = allPublishers.filter(p => p.publisherDomain?.verified);
        const installButton = {
            label: allPublishers.length > 1 ? localize({ key: 'trust publishers and install', comment: ['&& denotes a mnemonic'] }, "Trust Publishers & &&Install") : localize({ key: 'trust and install', comment: ['&& denotes a mnemonic'] }, "Trust Publisher & &&Install"),
            run: () => {
                this.telemetryService.publicLog2('extensions:trustPublisher', { action: 'trust', extensionId: untrustedExtensions.map(e => e.identifier.id).join(',') });
                this.trustPublishers(...allPublishers.map(p => ({ publisher: p.publisher, publisherDisplayName: p.publisherDisplayName })));
            }
        };
        const learnMoreButton = {
            label: localize({ key: 'learnMore', comment: ['&& denotes a mnemonic'] }, "&&Learn More"),
            run: () => {
                this.telemetryService.publicLog2('extensions:trustPublisher', { action: 'learn', extensionId: untrustedExtensions.map(e => e.identifier.id).join(',') });
                this.instantiationService.invokeFunction(accessor => accessor.get(ICommandService).executeCommand('vscode.open', URI.parse('https://aka.ms/vscode-extension-security')));
                throw new CancellationError();
            }
        };
        const getPublisherLink = ({ publisherDisplayName, publisherLink }) => {
            return publisherLink ? `[${publisherDisplayName}](${publisherLink})` : publisherDisplayName;
        };
        const unverifiedLink = 'https://aka.ms/vscode-verify-publisher';
        const title = allPublishers.length === 1
            ? localize('checkTrustedPublisherTitle', "Do you trust the publisher \"{0}\"?", allPublishers[0].publisherDisplayName)
            : allPublishers.length === 2
                ? localize('checkTwoTrustedPublishersTitle', "Do you trust publishers \"{0}\" and \"{1}\"?", allPublishers[0].publisherDisplayName, allPublishers[1].publisherDisplayName)
                : localize('checkAllTrustedPublishersTitle', "Do you trust the publisher \"{0}\" and {1} others?", allPublishers[0].publisherDisplayName, allPublishers.length - 1);
        const customMessage = new MarkdownString('', { supportThemeIcons: true, isTrusted: true });
        if (untrustedExtensions.length === 1) {
            const extension = untrustedExtensions[0];
            const manifest = untrustedExtensionManifests[0];
            if (otherUntrustedPublishers.length) {
                customMessage.appendMarkdown(localize('extension published by message', "The extension {0} is published by {1}.", `[${extension.displayName}](${extension.detailsLink})`, getPublisherLink(extension)));
                customMessage.appendMarkdown('&nbsp;');
                const commandUri = URI.parse(`command:extension.open?${encodeURIComponent(JSON.stringify([extension.identifier.id, manifest.extensionPack?.length ? 'extensionPack' : 'dependencies']))}`).toString();
                if (otherUntrustedPublishers.length === 1) {
                    customMessage.appendMarkdown(localize('singleUntrustedPublisher', "Installing this extension will also install [extensions]({0}) published by {1}.", commandUri, getPublisherLink(otherUntrustedPublishers[0])));
                }
                else {
                    customMessage.appendMarkdown(localize('message3', "Installing this extension will also install [extensions]({0}) published by {1} and {2}.", commandUri, otherUntrustedPublishers.slice(0, otherUntrustedPublishers.length - 1).map(p => getPublisherLink(p)).join(', '), getPublisherLink(otherUntrustedPublishers[otherUntrustedPublishers.length - 1])));
                }
                customMessage.appendMarkdown('&nbsp;');
                customMessage.appendMarkdown(localize('firstTimeInstallingMessage', "This is the first time you're installing extensions from these publishers."));
            }
            else {
                customMessage.appendMarkdown(localize('message1', "The extension {0} is published by {1}. This is the first extension you're installing from this publisher.", `[${extension.displayName}](${extension.detailsLink})`, getPublisherLink(extension)));
            }
        }
        else {
            customMessage.appendMarkdown(localize('multiInstallMessage', "This is the first time you're installing extensions from publishers {0} and {1}.", getPublisherLink(allPublishers[0]), getPublisherLink(allPublishers[allPublishers.length - 1])));
        }
        if (verifiedPublishers.length || unverfiiedPublishers.length === 1) {
            for (const publisher of verifiedPublishers) {
                customMessage.appendText('\n');
                const publisherVerifiedMessage = localize('verifiedPublisherWithName', "{0} has verified ownership of {1}.", getPublisherLink(publisher), `[$(link-external) ${URI.parse(publisher.publisherDomain.link).authority}](${publisher.publisherDomain.link})`);
                customMessage.appendMarkdown(`$(${verifiedPublisherIcon.id})&nbsp;${publisherVerifiedMessage}`);
            }
            if (unverfiiedPublishers.length) {
                customMessage.appendText('\n');
                if (unverfiiedPublishers.length === 1) {
                    customMessage.appendMarkdown(`$(${Codicon.unverified.id})&nbsp;${localize('unverifiedPublisherWithName', "{0} is [**not** verified]({1}).", getPublisherLink(unverfiiedPublishers[0]), unverifiedLink)}`);
                }
                else {
                    customMessage.appendMarkdown(`$(${Codicon.unverified.id})&nbsp;${localize('unverifiedPublishers', "{0} and {1} are [**not** verified]({2}).", unverfiiedPublishers.slice(0, unverfiiedPublishers.length - 1).map(p => getPublisherLink(p)).join(', '), getPublisherLink(unverfiiedPublishers[unverfiiedPublishers.length - 1]), unverifiedLink)}`);
                }
            }
        }
        else {
            customMessage.appendText('\n');
            customMessage.appendMarkdown(`$(${Codicon.unverified.id})&nbsp;${localize('allUnverifed', "All publishers are [**not** verified]({0}).", unverifiedLink)}`);
        }
        customMessage.appendText('\n');
        if (allPublishers.length > 1) {
            customMessage.appendMarkdown(localize('message4', "{0} has no control over the behavior of third-party extensions, including how they manage your personal data. Proceed only if you trust the publishers.", this.productService.nameLong));
        }
        else {
            customMessage.appendMarkdown(localize('message2', "{0} has no control over the behavior of third-party extensions, including how they manage your personal data. Proceed only if you trust the publisher.", this.productService.nameLong));
        }
        await this.dialogService.prompt({
            message: title,
            type: Severity.Warning,
            buttons: [installButton, learnMoreButton],
            cancelButton: {
                run: () => {
                    this.telemetryService.publicLog2('extensions:trustPublisher', { action: 'cancel', extensionId: untrustedExtensions.map(e => e.identifier.id).join(',') });
                    throw new CancellationError();
                }
            },
            custom: {
                markdownDetails: [{ markdown: customMessage, classes: ['extensions-management-publisher-trust-dialog'] }],
            }
        });
    }
    async getOtherUntrustedPublishers(manifests) {
        const extensionIds = new Set();
        for (const manifest of manifests) {
            for (const id of [...(manifest.extensionPack ?? []), ...(manifest.extensionDependencies ?? [])]) {
                const [publisherId] = id.split('.');
                if (publisherId.toLowerCase() === manifest.publisher.toLowerCase()) {
                    continue;
                }
                if (this.isPublisherUserTrusted(publisherId.toLowerCase())) {
                    continue;
                }
                extensionIds.add(id.toLowerCase());
            }
        }
        if (!extensionIds.size) {
            return [];
        }
        const extensions = new Map();
        await this.getDependenciesAndPackedExtensionsRecursively([...extensionIds], extensions, CancellationToken.None);
        const publishers = new Map();
        for (const [, extension] of extensions) {
            if (extension.private || this.isPublisherTrusted(extension)) {
                continue;
            }
            publishers.set(extension.publisherDisplayName, extension);
        }
        return [...publishers.values()];
    }
    async getDependenciesAndPackedExtensionsRecursively(toGet, result, token) {
        if (toGet.length === 0) {
            return;
        }
        const extensions = await this.extensionGalleryService.getExtensions(toGet.map(id => ({ id })), token);
        for (let idx = 0; idx < extensions.length; idx++) {
            const extension = extensions[idx];
            result.set(extension.identifier.id.toLowerCase(), extension);
        }
        toGet = [];
        for (const extension of extensions) {
            if (isNonEmptyArray(extension.properties.dependencies)) {
                for (const id of extension.properties.dependencies) {
                    if (!result.has(id.toLowerCase())) {
                        toGet.push(id);
                    }
                }
            }
            if (isNonEmptyArray(extension.properties.extensionPack)) {
                for (const id of extension.properties.extensionPack) {
                    if (!result.has(id.toLowerCase())) {
                        toGet.push(id);
                    }
                }
            }
        }
        return this.getDependenciesAndPackedExtensionsRecursively(toGet, result, token);
    }
    async checkForWorkspaceTrust(manifest, requireTrust) {
        if (requireTrust || this.extensionManifestPropertiesService.getExtensionUntrustedWorkspaceSupportType(manifest) === false) {
            const buttons = [];
            buttons.push({ label: localize('extensionInstallWorkspaceTrustButton', "Trust Workspace & Install"), type: 'ContinueWithTrust' });
            if (!requireTrust) {
                buttons.push({ label: localize('extensionInstallWorkspaceTrustContinueButton', "Install"), type: 'ContinueWithoutTrust' });
            }
            buttons.push({ label: localize('extensionInstallWorkspaceTrustManageButton', "Learn More"), type: 'Manage' });
            const trustState = await this.workspaceTrustRequestService.requestWorkspaceTrust({
                message: localize('extensionInstallWorkspaceTrustMessage', "Enabling this extension requires a trusted workspace."),
                buttons
            });
            if (trustState === undefined) {
                throw new CancellationError();
            }
        }
    }
    async checkInstallingExtensionOnWeb(extension, manifest) {
        if (this.servers.length !== 1 || this.servers[0] !== this.extensionManagementServerService.webExtensionManagementServer) {
            return;
        }
        const nonWebExtensions = [];
        if (manifest.extensionPack?.length) {
            const extensions = await this.extensionGalleryService.getExtensions(manifest.extensionPack.map(id => ({ id })), CancellationToken.None);
            for (const extension of extensions) {
                if (await this.servers[0].extensionManagementService.canInstall(extension) !== true) {
                    nonWebExtensions.push(extension);
                }
            }
            if (nonWebExtensions.length && nonWebExtensions.length === extensions.length) {
                throw new ExtensionManagementError('Not supported in Web', "Unsupported" /* ExtensionManagementErrorCode.Unsupported */);
            }
        }
        const productName = localize('VS Code for Web', "{0} for the Web", this.productService.nameLong);
        const virtualWorkspaceSupport = this.extensionManifestPropertiesService.getExtensionVirtualWorkspaceSupportType(manifest);
        const virtualWorkspaceSupportReason = getWorkspaceSupportTypeMessage(manifest.capabilities?.virtualWorkspaces);
        const hasLimitedSupport = virtualWorkspaceSupport === 'limited' || !!virtualWorkspaceSupportReason;
        if (!nonWebExtensions.length && !hasLimitedSupport) {
            return;
        }
        const limitedSupportMessage = localize('limited support', "'{0}' has limited functionality in {1}.", extension.displayName || extension.identifier.id, productName);
        let message;
        let buttons = [];
        let detail;
        const installAnywayButton = {
            label: localize({ key: 'install anyways', comment: ['&& denotes a mnemonic'] }, "&&Install Anyway"),
            run: () => { }
        };
        const showExtensionsButton = {
            label: localize({ key: 'showExtensions', comment: ['&& denotes a mnemonic'] }, "&&Show Extensions"),
            run: () => this.instantiationService.invokeFunction(accessor => accessor.get(ICommandService).executeCommand('extension.open', extension.identifier.id, 'extensionPack'))
        };
        if (nonWebExtensions.length && hasLimitedSupport) {
            message = limitedSupportMessage;
            detail = `${virtualWorkspaceSupportReason ? `${virtualWorkspaceSupportReason}\n` : ''}${localize('non web extensions detail', "Contains extensions which are not supported.")}`;
            buttons = [
                installAnywayButton,
                showExtensionsButton
            ];
        }
        else if (hasLimitedSupport) {
            message = limitedSupportMessage;
            detail = virtualWorkspaceSupportReason || undefined;
            buttons = [installAnywayButton];
        }
        else {
            message = localize('non web extensions', "'{0}' contains extensions which are not supported in {1}.", extension.displayName || extension.identifier.id, productName);
            buttons = [
                installAnywayButton,
                showExtensionsButton
            ];
        }
        await this.dialogService.prompt({
            type: Severity.Info,
            message,
            detail,
            buttons,
            cancelButton: {
                run: () => { throw new CancellationError(); }
            }
        });
    }
    getTargetPlatform() {
        if (!this._targetPlatformPromise) {
            this._targetPlatformPromise = computeTargetPlatform(this.fileService, this.logService);
        }
        return this._targetPlatformPromise;
    }
    async cleanUp() {
        await Promise.allSettled(this.servers.map(server => server.extensionManagementService.cleanUp()));
    }
    toggleAppliationScope(extension, fromProfileLocation) {
        const server = this.getServer(extension);
        if (server) {
            return server.extensionManagementService.toggleAppliationScope(extension, fromProfileLocation);
        }
        throw new Error('Not Supported');
    }
    copyExtensions(from, to) {
        if (this.extensionManagementServerService.remoteExtensionManagementServer) {
            throw new Error('Not Supported');
        }
        if (this.extensionManagementServerService.localExtensionManagementServer) {
            return this.extensionManagementServerService.localExtensionManagementServer.extensionManagementService.copyExtensions(from, to);
        }
        if (this.extensionManagementServerService.webExtensionManagementServer) {
            return this.extensionManagementServerService.webExtensionManagementServer.extensionManagementService.copyExtensions(from, to);
        }
        return Promise.resolve();
    }
    registerParticipant() { throw new Error('Not Supported'); }
    installExtensionsFromProfile(extensions, fromProfileLocation, toProfileLocation) { throw new Error('Not Supported'); }
    isPublisherTrusted(extension) {
        const publisher = extension.publisher.toLowerCase();
        if (this.defaultTrustedPublishers.includes(publisher) || this.defaultTrustedPublishers.includes(extension.publisherDisplayName.toLowerCase())) {
            return true;
        }
        // Check if the extension is allowed by publisher or extension id
        if (this.allowedExtensionsService.allowedExtensionsConfigValue && this.allowedExtensionsService.isAllowed(extension)) {
            return true;
        }
        return this.isPublisherUserTrusted(publisher);
    }
    isPublisherUserTrusted(publisher) {
        const trustedPublishers = this.getTrustedPublishersFromStorage();
        return !!trustedPublishers[publisher];
    }
    getTrustedPublishers() {
        const trustedPublishers = this.getTrustedPublishersFromStorage();
        return Object.keys(trustedPublishers).map(publisher => trustedPublishers[publisher]);
    }
    trustPublishers(...publishers) {
        const trustedPublishers = this.getTrustedPublishersFromStorage();
        for (const publisher of publishers) {
            trustedPublishers[publisher.publisher.toLowerCase()] = publisher;
        }
        this.storageService.store(TrustedPublishersStorageKey, JSON.stringify(trustedPublishers), -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
    }
    untrustPublishers(...publishers) {
        const trustedPublishers = this.getTrustedPublishersFromStorage();
        for (const publisher of publishers) {
            delete trustedPublishers[publisher.toLowerCase()];
        }
        this.storageService.store(TrustedPublishersStorageKey, JSON.stringify(trustedPublishers), -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
    }
    getTrustedPublishersFromStorage() {
        const trustedPublishers = this.storageService.getObject(TrustedPublishersStorageKey, -1 /* StorageScope.APPLICATION */, {});
        if (Array.isArray(trustedPublishers)) {
            this.storageService.remove(TrustedPublishersStorageKey, -1 /* StorageScope.APPLICATION */);
            return {};
        }
        return Object.keys(trustedPublishers).reduce((result, publisher) => {
            result[publisher.toLowerCase()] = trustedPublishers[publisher];
            return result;
        }, {});
    }
};
ExtensionManagementService = __decorate([
    __param(0, IExtensionManagementServerService),
    __param(1, IExtensionGalleryService),
    __param(2, IUserDataProfileService),
    __param(3, IUserDataProfilesService),
    __param(4, IConfigurationService),
    __param(5, IProductService),
    __param(6, IDownloadService),
    __param(7, IUserDataSyncEnablementService),
    __param(8, IDialogService),
    __param(9, IWorkspaceTrustRequestService),
    __param(10, IExtensionManifestPropertiesService),
    __param(11, IFileService),
    __param(12, ILogService),
    __param(13, IInstantiationService),
    __param(14, IExtensionsScannerService),
    __param(15, IAllowedExtensionsService),
    __param(16, IStorageService),
    __param(17, ITelemetryService)
], ExtensionManagementService);
export { ExtensionManagementService };
let WorkspaceExtensionsManagementService = class WorkspaceExtensionsManagementService extends Disposable {
    static { WorkspaceExtensionsManagementService_1 = this; }
    static { this.WORKSPACE_EXTENSIONS_KEY = 'workspaceExtensions.locations'; }
    constructor(fileService, logService, workspaceService, extensionsScannerService, storageService, uriIdentityService, telemetryService) {
        super();
        this.fileService = fileService;
        this.logService = logService;
        this.workspaceService = workspaceService;
        this.extensionsScannerService = extensionsScannerService;
        this.storageService = storageService;
        this.uriIdentityService = uriIdentityService;
        this.telemetryService = telemetryService;
        this._onDidChangeInvalidExtensions = this._register(new Emitter());
        this.onDidChangeInvalidExtensions = this._onDidChangeInvalidExtensions.event;
        this.extensions = [];
        this.invalidExtensionWatchers = this._register(new DisposableStore());
        this._register(Event.debounce(this.fileService.onDidFilesChange, (last, e) => {
            (last = last ?? []).push(e);
            return last;
        }, 1000)(events => {
            const changedInvalidExtensions = this.extensions.filter(extension => !extension.isValid && events.some(e => e.affects(extension.location)));
            if (changedInvalidExtensions.length) {
                this.checkExtensionsValidity(changedInvalidExtensions);
            }
        }));
        this.initializePromise = this.initialize();
    }
    async initialize() {
        const existingLocations = this.getInstalledWorkspaceExtensionsLocations();
        if (!existingLocations.length) {
            return;
        }
        await Promise.allSettled(existingLocations.map(async (location) => {
            if (!this.workspaceService.isInsideWorkspace(location)) {
                this.logService.info(`Removing the workspace extension ${location.toString()} as it is not inside the workspace`);
                return;
            }
            if (!(await this.fileService.exists(location))) {
                this.logService.info(`Removing the workspace extension ${location.toString()} as it does not exist`);
                return;
            }
            try {
                const extension = await this.scanWorkspaceExtension(location);
                if (extension) {
                    this.extensions.push(extension);
                }
                else {
                    this.logService.info(`Skipping workspace extension ${location.toString()} as it does not exist`);
                }
            }
            catch (error) {
                this.logService.error('Skipping the workspace extension', location.toString(), error);
            }
        }));
        this.saveWorkspaceExtensions();
    }
    watchInvalidExtensions() {
        this.invalidExtensionWatchers.clear();
        for (const extension of this.extensions) {
            if (!extension.isValid) {
                this.invalidExtensionWatchers.add(this.fileService.watch(extension.location));
            }
        }
    }
    async checkExtensionsValidity(extensions) {
        const validExtensions = [];
        await Promise.all(extensions.map(async (extension) => {
            const newExtension = await this.scanWorkspaceExtension(extension.location);
            if (newExtension?.isValid) {
                validExtensions.push(newExtension);
            }
        }));
        let changed = false;
        for (const extension of validExtensions) {
            const index = this.extensions.findIndex(e => this.uriIdentityService.extUri.isEqual(e.location, extension.location));
            if (index !== -1) {
                changed = true;
                this.extensions.splice(index, 1, extension);
            }
        }
        if (changed) {
            this.saveWorkspaceExtensions();
            this._onDidChangeInvalidExtensions.fire(validExtensions);
        }
    }
    async getInstalled(includeInvalid) {
        await this.initializePromise;
        return this.extensions.filter(e => includeInvalid || e.isValid);
    }
    async install(extension) {
        await this.initializePromise;
        const workspaceExtension = await this.scanWorkspaceExtension(extension.location);
        if (!workspaceExtension) {
            throw new Error('Cannot install the extension as it does not exist.');
        }
        const existingExtensionIndex = this.extensions.findIndex(e => areSameExtensions(e.identifier, extension.identifier));
        if (existingExtensionIndex === -1) {
            this.extensions.push(workspaceExtension);
        }
        else {
            this.extensions.splice(existingExtensionIndex, 1, workspaceExtension);
        }
        this.saveWorkspaceExtensions();
        this.telemetryService.publicLog2('workspaceextension:install');
        return workspaceExtension;
    }
    async uninstall(extension) {
        await this.initializePromise;
        const existingExtensionIndex = this.extensions.findIndex(e => areSameExtensions(e.identifier, extension.identifier));
        if (existingExtensionIndex !== -1) {
            this.extensions.splice(existingExtensionIndex, 1);
            this.saveWorkspaceExtensions();
        }
        this.telemetryService.publicLog2('workspaceextension:uninstall');
    }
    getInstalledWorkspaceExtensionsLocations() {
        const locations = [];
        try {
            const parsed = JSON.parse(this.storageService.get(WorkspaceExtensionsManagementService_1.WORKSPACE_EXTENSIONS_KEY, 1 /* StorageScope.WORKSPACE */, '[]'));
            if (Array.isArray(locations)) {
                for (const location of parsed) {
                    if (isString(location)) {
                        if (this.workspaceService.getWorkbenchState() === 2 /* WorkbenchState.FOLDER */) {
                            locations.push(this.workspaceService.getWorkspace().folders[0].toResource(location));
                        }
                        else {
                            this.logService.warn(`Invalid value for 'extensions' in workspace storage: ${location}`);
                        }
                    }
                    else {
                        locations.push(URI.revive(location));
                    }
                }
            }
            else {
                this.logService.warn(`Invalid value for 'extensions' in workspace storage: ${locations}`);
            }
        }
        catch (error) {
            this.logService.warn(`Error parsing workspace extensions locations: ${getErrorMessage(error)}`);
        }
        return locations;
    }
    saveWorkspaceExtensions() {
        const locations = this.extensions.map(extension => extension.location);
        if (this.workspaceService.getWorkbenchState() === 2 /* WorkbenchState.FOLDER */) {
            this.storageService.store(WorkspaceExtensionsManagementService_1.WORKSPACE_EXTENSIONS_KEY, JSON.stringify(coalesce(locations
                .map(location => this.uriIdentityService.extUri.relativePath(this.workspaceService.getWorkspace().folders[0].uri, location)))), 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        }
        else {
            this.storageService.store(WorkspaceExtensionsManagementService_1.WORKSPACE_EXTENSIONS_KEY, JSON.stringify(locations), 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        }
        this.watchInvalidExtensions();
    }
    async scanWorkspaceExtension(location) {
        const scannedExtension = await this.extensionsScannerService.scanExistingExtension(location, 1 /* ExtensionType.User */, { includeInvalid: true });
        return scannedExtension ? this.toLocalWorkspaceExtension(scannedExtension) : null;
    }
    async toLocalWorkspaceExtension(extension) {
        const stat = await this.fileService.resolve(extension.location);
        let readmeUrl;
        let changelogUrl;
        if (stat.children) {
            readmeUrl = stat.children.find(({ name }) => /^readme(\.txt|\.md|)$/i.test(name))?.resource;
            changelogUrl = stat.children.find(({ name }) => /^changelog(\.txt|\.md|)$/i.test(name))?.resource;
        }
        const validations = [...extension.validations];
        let isValid = extension.isValid;
        if (extension.manifest.main) {
            if (!(await this.fileService.exists(this.uriIdentityService.extUri.joinPath(extension.location, extension.manifest.main)))) {
                isValid = false;
                validations.push([Severity.Error, localize('main.notFound', "Cannot activate because {0} not found", extension.manifest.main)]);
            }
        }
        return {
            identifier: extension.identifier,
            type: extension.type,
            isBuiltin: extension.isBuiltin || !!extension.metadata?.isBuiltin,
            location: extension.location,
            manifest: extension.manifest,
            targetPlatform: extension.targetPlatform,
            validations,
            isValid,
            readmeUrl,
            changelogUrl,
            publisherDisplayName: extension.metadata?.publisherDisplayName,
            publisherId: extension.metadata?.publisherId || null,
            isApplicationScoped: !!extension.metadata?.isApplicationScoped,
            isMachineScoped: !!extension.metadata?.isMachineScoped,
            isPreReleaseVersion: !!extension.metadata?.isPreReleaseVersion,
            hasPreReleaseVersion: !!extension.metadata?.hasPreReleaseVersion,
            preRelease: !!extension.metadata?.preRelease,
            installedTimestamp: extension.metadata?.installedTimestamp,
            updated: !!extension.metadata?.updated,
            pinned: !!extension.metadata?.pinned,
            isWorkspaceScoped: true,
            private: false,
            source: 'resource',
            size: extension.metadata?.size ?? 0,
        };
    }
};
WorkspaceExtensionsManagementService = WorkspaceExtensionsManagementService_1 = __decorate([
    __param(0, IFileService),
    __param(1, ILogService),
    __param(2, IWorkspaceContextService),
    __param(3, IExtensionsScannerService),
    __param(4, IStorageService),
    __param(5, IUriIdentityService),
    __param(6, ITelemetryService)
], WorkspaceExtensionsManagementService);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uTWFuYWdlbWVudFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2V4dGVuc2lvbk1hbmFnZW1lbnQvY29tbW9uL2V4dGVuc2lvbk1hbmFnZW1lbnRTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3BGLE9BQU8saUNBQWlDLENBQUM7QUFDekMsT0FBTyxFQUNnRix3QkFBd0IsRUFBNEQsd0JBQXdCLEVBQTRELGdDQUFnQyxFQUs5Uix5QkFBeUIsRUFDekIsOENBQThDLEdBQzlDLE1BQU0sd0VBQXdFLENBQUM7QUFDaEYsT0FBTyxFQUFrRyxpQ0FBaUMsRUFBNEksTUFBTSwwQkFBMEIsQ0FBQztBQUN2VCxPQUFPLEVBQWlCLHVCQUF1QixFQUFzQiw4QkFBOEIsRUFBa0IsTUFBTSxzREFBc0QsQ0FBQztBQUNsTCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckQsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNuRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUM1RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0RUFBNEUsQ0FBQztBQUN0SSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQ3hG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