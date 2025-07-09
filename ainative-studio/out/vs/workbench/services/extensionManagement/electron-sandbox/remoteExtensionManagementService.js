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
import { IExtensionGalleryService, ExtensionManagementError, EXTENSION_INSTALL_CLIENT_TARGET_PLATFORM_CONTEXT, IAllowedExtensionsService } from '../../../../platform/extensionManagement/common/extensionManagement.js';
import { areSameExtensions } from '../../../../platform/extensionManagement/common/extensionManagementUtil.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { toErrorMessage } from '../../../../base/common/errorMessage.js';
import { isNonEmptyArray } from '../../../../base/common/arrays.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { localize } from '../../../../nls.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { Promises } from '../../../../base/common/async.js';
import { IExtensionManifestPropertiesService } from '../../extensions/common/extensionManifestPropertiesService.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { RemoteExtensionManagementService } from '../common/remoteExtensionManagementService.js';
import { IUserDataProfilesService } from '../../../../platform/userDataProfile/common/userDataProfile.js';
import { IUserDataProfileService } from '../../userDataProfile/common/userDataProfile.js';
import { IRemoteUserDataProfilesService } from '../../userDataProfile/common/remoteUserDataProfiles.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { areApiProposalsCompatible } from '../../../../platform/extensions/common/extensionValidator.js';
import { isBoolean, isUndefined } from '../../../../base/common/types.js';
let NativeRemoteExtensionManagementService = class NativeRemoteExtensionManagementService extends RemoteExtensionManagementService {
    constructor(channel, localExtensionManagementServer, productService, userDataProfileService, userDataProfilesService, remoteUserDataProfilesService, uriIdentityService, logService, galleryService, configurationService, allowedExtensionsService, fileService, extensionManifestPropertiesService) {
        super(channel, productService, allowedExtensionsService, userDataProfileService, userDataProfilesService, remoteUserDataProfilesService, uriIdentityService);
        this.localExtensionManagementServer = localExtensionManagementServer;
        this.logService = logService;
        this.galleryService = galleryService;
        this.configurationService = configurationService;
        this.fileService = fileService;
        this.extensionManifestPropertiesService = extensionManifestPropertiesService;
    }
    async install(vsix, options) {
        const local = await super.install(vsix, options);
        await this.installUIDependenciesAndPackedExtensions(local);
        return local;
    }
    async installFromGallery(extension, installOptions = {}) {
        if (isUndefined(installOptions.donotVerifySignature)) {
            const value = this.configurationService.getValue('extensions.verifySignature');
            installOptions.donotVerifySignature = isBoolean(value) ? !value : undefined;
        }
        const local = await this.doInstallFromGallery(extension, installOptions);
        await this.installUIDependenciesAndPackedExtensions(local);
        return local;
    }
    async doInstallFromGallery(extension, installOptions) {
        if (installOptions.downloadExtensionsLocally || this.configurationService.getValue('remote.downloadExtensionsLocally')) {
            return this.downloadAndInstall(extension, installOptions);
        }
        try {
            const clientTargetPlatform = await this.localExtensionManagementServer.extensionManagementService.getTargetPlatform();
            return await super.installFromGallery(extension, { ...installOptions, context: { ...installOptions?.context, [EXTENSION_INSTALL_CLIENT_TARGET_PLATFORM_CONTEXT]: clientTargetPlatform } });
        }
        catch (error) {
            switch (error.name) {
                case "Download" /* ExtensionManagementErrorCode.Download */:
                case "DownloadSignature" /* ExtensionManagementErrorCode.DownloadSignature */:
                case "Gallery" /* ExtensionManagementErrorCode.Gallery */:
                case "Internal" /* ExtensionManagementErrorCode.Internal */:
                case "Unknown" /* ExtensionManagementErrorCode.Unknown */:
                    try {
                        this.logService.error(`Error while installing '${extension.identifier.id}' extension in the remote server.`, toErrorMessage(error));
                        return await this.downloadAndInstall(extension, installOptions);
                    }
                    catch (e) {
                        this.logService.error(e);
                        throw e;
                    }
                default:
                    this.logService.debug('Remote Install Error Name', error.name);
                    throw error;
            }
        }
    }
    async downloadAndInstall(extension, installOptions) {
        this.logService.info(`Downloading the '${extension.identifier.id}' extension locally and install`);
        const compatible = await this.checkAndGetCompatible(extension, !!installOptions.installPreReleaseVersion);
        installOptions = { ...installOptions, donotIncludePackAndDependencies: true };
        const installed = await this.getInstalled(1 /* ExtensionType.User */, undefined, installOptions.productVersion);
        const workspaceExtensions = await this.getAllWorkspaceDependenciesAndPackedExtensions(compatible, CancellationToken.None);
        if (workspaceExtensions.length) {
            this.logService.info(`Downloading the workspace dependencies and packed extensions of '${compatible.identifier.id}' locally and install`);
            for (const workspaceExtension of workspaceExtensions) {
                await this.downloadCompatibleAndInstall(workspaceExtension, installed, installOptions);
            }
        }
        return await this.downloadCompatibleAndInstall(compatible, installed, installOptions);
    }
    async downloadCompatibleAndInstall(extension, installed, installOptions) {
        const compatible = await this.checkAndGetCompatible(extension, !!installOptions.installPreReleaseVersion);
        this.logService.trace('Downloading extension:', compatible.identifier.id);
        const location = await this.localExtensionManagementServer.extensionManagementService.download(compatible, installed.filter(i => areSameExtensions(i.identifier, compatible.identifier))[0] ? 3 /* InstallOperation.Update */ : 2 /* InstallOperation.Install */, !!installOptions.donotVerifySignature);
        this.logService.info('Downloaded extension:', compatible.identifier.id, location.path);
        try {
            const local = await super.install(location, { ...installOptions, keepExisting: true });
            this.logService.info(`Successfully installed '${compatible.identifier.id}' extension`);
            return local;
        }
        finally {
            try {
                await this.fileService.del(location);
            }
            catch (error) {
                this.logService.error(error);
            }
        }
    }
    async checkAndGetCompatible(extension, includePreRelease) {
        const targetPlatform = await this.getTargetPlatform();
        let compatibleExtension = null;
        if (extension.hasPreReleaseVersion && extension.properties.isPreReleaseVersion !== includePreRelease) {
            compatibleExtension = (await this.galleryService.getExtensions([{ ...extension.identifier, preRelease: includePreRelease }], { targetPlatform, compatible: true }, CancellationToken.None))[0] || null;
        }
        if (!compatibleExtension && await this.galleryService.isExtensionCompatible(extension, includePreRelease, targetPlatform)) {
            compatibleExtension = extension;
        }
        if (!compatibleExtension) {
            compatibleExtension = await this.galleryService.getCompatibleExtension(extension, includePreRelease, targetPlatform);
        }
        if (!compatibleExtension) {
            const incompatibleApiProposalsMessages = [];
            if (!areApiProposalsCompatible(extension.properties.enabledApiProposals ?? [], incompatibleApiProposalsMessages)) {
                throw new ExtensionManagementError(localize('incompatibleAPI', "Can't install '{0}' extension. {1}", extension.displayName ?? extension.identifier.id, incompatibleApiProposalsMessages[0]), "IncompatibleApi" /* ExtensionManagementErrorCode.IncompatibleApi */);
            }
            /** If no compatible release version is found, check if the extension has a release version or not and throw relevant error */
            if (!includePreRelease && extension.properties.isPreReleaseVersion && (await this.galleryService.getExtensions([extension.identifier], CancellationToken.None))[0]) {
                throw new ExtensionManagementError(localize('notFoundReleaseExtension', "Can't install release version of '{0}' extension because it has no release version.", extension.identifier.id), "ReleaseVersionNotFound" /* ExtensionManagementErrorCode.ReleaseVersionNotFound */);
            }
            throw new ExtensionManagementError(localize('notFoundCompatibleDependency', "Can't install '{0}' extension because it is not compatible with the current version of {1} (version {2}).", extension.identifier.id, this.productService.nameLong, this.productService.version), "Incompatible" /* ExtensionManagementErrorCode.Incompatible */);
        }
        return compatibleExtension;
    }
    async installUIDependenciesAndPackedExtensions(local) {
        const uiExtensions = await this.getAllUIDependenciesAndPackedExtensions(local.manifest, CancellationToken.None);
        const installed = await this.localExtensionManagementServer.extensionManagementService.getInstalled();
        const toInstall = uiExtensions.filter(e => installed.every(i => !areSameExtensions(i.identifier, e.identifier)));
        if (toInstall.length) {
            this.logService.info(`Installing UI dependencies and packed extensions of '${local.identifier.id}' locally`);
            await Promises.settled(toInstall.map(d => this.localExtensionManagementServer.extensionManagementService.installFromGallery(d)));
        }
    }
    async getAllUIDependenciesAndPackedExtensions(manifest, token) {
        const result = new Map();
        const extensions = [...(manifest.extensionPack || []), ...(manifest.extensionDependencies || [])];
        await this.getDependenciesAndPackedExtensionsRecursively(extensions, result, true, token);
        return [...result.values()];
    }
    async getAllWorkspaceDependenciesAndPackedExtensions(extension, token) {
        const result = new Map();
        result.set(extension.identifier.id.toLowerCase(), extension);
        const manifest = await this.galleryService.getManifest(extension, token);
        if (manifest) {
            const extensions = [...(manifest.extensionPack || []), ...(manifest.extensionDependencies || [])];
            await this.getDependenciesAndPackedExtensionsRecursively(extensions, result, false, token);
        }
        result.delete(extension.identifier.id);
        return [...result.values()];
    }
    async getDependenciesAndPackedExtensionsRecursively(toGet, result, uiExtension, token) {
        if (toGet.length === 0) {
            return Promise.resolve();
        }
        const extensions = await this.galleryService.getExtensions(toGet.map(id => ({ id })), token);
        const manifests = await Promise.all(extensions.map(e => this.galleryService.getManifest(e, token)));
        const extensionsManifests = [];
        for (let idx = 0; idx < extensions.length; idx++) {
            const extension = extensions[idx];
            const manifest = manifests[idx];
            if (manifest && this.extensionManifestPropertiesService.prefersExecuteOnUI(manifest) === uiExtension) {
                result.set(extension.identifier.id.toLowerCase(), extension);
                extensionsManifests.push(manifest);
            }
        }
        toGet = [];
        for (const extensionManifest of extensionsManifests) {
            if (isNonEmptyArray(extensionManifest.extensionDependencies)) {
                for (const id of extensionManifest.extensionDependencies) {
                    if (!result.has(id.toLowerCase())) {
                        toGet.push(id);
                    }
                }
            }
            if (isNonEmptyArray(extensionManifest.extensionPack)) {
                for (const id of extensionManifest.extensionPack) {
                    if (!result.has(id.toLowerCase())) {
                        toGet.push(id);
                    }
                }
            }
        }
        return this.getDependenciesAndPackedExtensionsRecursively(toGet, result, uiExtension, token);
    }
};
NativeRemoteExtensionManagementService = __decorate([
    __param(2, IProductService),
    __param(3, IUserDataProfileService),
    __param(4, IUserDataProfilesService),
    __param(5, IRemoteUserDataProfilesService),
    __param(6, IUriIdentityService),
    __param(7, ILogService),
    __param(8, IExtensionGalleryService),
    __param(9, IConfigurationService),
    __param(10, IAllowedExtensionsService),
    __param(11, IFileService),
    __param(12, IExtensionManifestPropertiesService)
], NativeRemoteExtensionManagementService);
export { NativeRemoteExtensionManagementService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlRXh0ZW5zaW9uTWFuYWdlbWVudFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2V4dGVuc2lvbk1hbmFnZW1lbnQvZWxlY3Ryb24tc2FuZGJveC9yZW1vdGVFeHRlbnNpb25NYW5hZ2VtZW50U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQXNDLHdCQUF3QixFQUFvQyx3QkFBd0IsRUFBZ0MsZ0RBQWdELEVBQUUseUJBQXlCLEVBQUUsTUFBTSx3RUFBd0UsQ0FBQztBQUc3VCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw0RUFBNEUsQ0FBQztBQUMvRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDckUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNwRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUM1RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQ3hGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBRW5HLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUM1RCxPQUFPLEVBQUUsbUNBQW1DLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUNwSCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDMUUsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0sK0NBQStDLENB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