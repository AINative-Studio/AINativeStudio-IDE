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
import { CancellationToken } from '../../../base/common/cancellation.js';
import { getErrorMessage, isCancellationError } from '../../../base/common/errors.js';
import { Schemas } from '../../../base/common/network.js';
import { basename } from '../../../base/common/resources.js';
import { gt } from '../../../base/common/semver/semver.js';
import { URI } from '../../../base/common/uri.js';
import { localize } from '../../../nls.js';
import { EXTENSION_IDENTIFIER_REGEX, IExtensionGalleryService, IExtensionManagementService } from './extensionManagement.js';
import { areSameExtensions, getExtensionId, getGalleryExtensionId, getIdAndVersion } from './extensionManagementUtil.js';
import { EXTENSION_CATEGORIES } from '../../extensions/common/extensions.js';
const notFound = (id) => localize('notFound', "Extension '{0}' not found.", id);
const useId = localize('useId', "Make sure you use the full extension ID, including the publisher, e.g.: {0}", 'ms-dotnettools.csharp');
let ExtensionManagementCLI = class ExtensionManagementCLI {
    constructor(logger, extensionManagementService, extensionGalleryService) {
        this.logger = logger;
        this.extensionManagementService = extensionManagementService;
        this.extensionGalleryService = extensionGalleryService;
    }
    get location() {
        return undefined;
    }
    async listExtensions(showVersions, category, profileLocation) {
        let extensions = await this.extensionManagementService.getInstalled(1 /* ExtensionType.User */, profileLocation);
        const categories = EXTENSION_CATEGORIES.map(c => c.toLowerCase());
        if (category && category !== '') {
            if (categories.indexOf(category.toLowerCase()) < 0) {
                this.logger.info('Invalid category please enter a valid category. To list valid categories run --category without a category specified');
                return;
            }
            extensions = extensions.filter(e => {
                if (e.manifest.categories) {
                    const lowerCaseCategories = e.manifest.categories.map(c => c.toLowerCase());
                    return lowerCaseCategories.indexOf(category.toLowerCase()) > -1;
                }
                return false;
            });
        }
        else if (category === '') {
            this.logger.info('Possible Categories: ');
            categories.forEach(category => {
                this.logger.info(category);
            });
            return;
        }
        if (this.location) {
            this.logger.info(localize('listFromLocation', "Extensions installed on {0}:", this.location));
        }
        extensions = extensions.sort((e1, e2) => e1.identifier.id.localeCompare(e2.identifier.id));
        let lastId = undefined;
        for (const extension of extensions) {
            if (lastId !== extension.identifier.id) {
                lastId = extension.identifier.id;
                this.logger.info(showVersions ? `${lastId}@${extension.manifest.version}` : lastId);
            }
        }
    }
    async installExtensions(extensions, builtinExtensions, installOptions, force) {
        const failed = [];
        try {
            if (extensions.length) {
                this.logger.info(this.location ? localize('installingExtensionsOnLocation', "Installing extensions on {0}...", this.location) : localize('installingExtensions', "Installing extensions..."));
            }
            const installVSIXInfos = [];
            const installExtensionInfos = [];
            const addInstallExtensionInfo = (id, version, isBuiltin) => {
                installExtensionInfos.push({ id, version: version !== 'prerelease' ? version : undefined, installOptions: { ...installOptions, isBuiltin, installPreReleaseVersion: version === 'prerelease' || installOptions.installPreReleaseVersion } });
            };
            for (const extension of extensions) {
                if (extension instanceof URI) {
                    installVSIXInfos.push({ vsix: extension, installOptions });
                }
                else {
                    const [id, version] = getIdAndVersion(extension);
                    addInstallExtensionInfo(id, version, false);
                }
            }
            for (const extension of builtinExtensions) {
                if (extension instanceof URI) {
                    installVSIXInfos.push({ vsix: extension, installOptions: { ...installOptions, isBuiltin: true, donotIncludePackAndDependencies: true } });
                }
                else {
                    const [id, version] = getIdAndVersion(extension);
                    addInstallExtensionInfo(id, version, true);
                }
            }
            const installed = await this.extensionManagementService.getInstalled(undefined, installOptions.profileLocation);
            if (installVSIXInfos.length) {
                await Promise.all(installVSIXInfos.map(async ({ vsix, installOptions }) => {
                    try {
                        await this.installVSIX(vsix, installOptions, force, installed);
                    }
                    catch (err) {
                        this.logger.error(err);
                        failed.push(vsix.toString());
                    }
                }));
            }
            if (installExtensionInfos.length) {
                const failedGalleryExtensions = await this.installGalleryExtensions(installExtensionInfos, installed, force);
                failed.push(...failedGalleryExtensions);
            }
        }
        catch (error) {
            this.logger.error(localize('error while installing extensions', "Error while installing extensions: {0}", getErrorMessage(error)));
            throw error;
        }
        if (failed.length) {
            throw new Error(localize('installation failed', "Failed Installing Extensions: {0}", failed.join(', ')));
        }
    }
    async updateExtensions(profileLocation) {
        const installedExtensions = await this.extensionManagementService.getInstalled(1 /* ExtensionType.User */, profileLocation);
        const installedExtensionsQuery = [];
        for (const extension of installedExtensions) {
            if (!!extension.identifier.uuid) { // No need to check new version for an unpublished extension
                installedExtensionsQuery.push({ ...extension.identifier, preRelease: extension.preRelease });
            }
        }
        this.logger.trace(localize({ key: 'updateExtensionsQuery', comment: ['Placeholder is for the count of extensions'] }, "Fetching latest versions for {0} extensions", installedExtensionsQuery.length));
        const availableVersions = await this.extensionGalleryService.getExtensions(installedExtensionsQuery, { compatible: true }, CancellationToken.None);
        const extensionsToUpdate = [];
        for (const newVersion of availableVersions) {
            for (const oldVersion of installedExtensions) {
                if (areSameExtensions(oldVersion.identifier, newVersion.identifier) && gt(newVersion.version, oldVersion.manifest.version)) {
                    extensionsToUpdate.push({
                        extension: newVersion,
                        options: { operation: 3 /* InstallOperation.Update */, installPreReleaseVersion: oldVersion.preRelease, profileLocation, isApplicationScoped: oldVersion.isApplicationScoped }
                    });
                }
            }
        }
        if (!extensionsToUpdate.length) {
            this.logger.info(localize('updateExtensionsNoExtensions', "No extension to update"));
            return;
        }
        this.logger.info(localize('updateExtensionsNewVersionsAvailable', "Updating extensions: {0}", extensionsToUpdate.map(ext => ext.extension.identifier.id).join(', ')));
        const installationResult = await this.extensionManagementService.installGalleryExtensions(extensionsToUpdate);
        for (const extensionResult of installationResult) {
            if (extensionResult.error) {
                this.logger.error(localize('errorUpdatingExtension', "Error while updating extension {0}: {1}", extensionResult.identifier.id, getErrorMessage(extensionResult.error)));
            }
            else {
                this.logger.info(localize('successUpdate', "Extension '{0}' v{1} was successfully updated.", extensionResult.identifier.id, extensionResult.local?.manifest.version));
            }
        }
    }
    async installGalleryExtensions(installExtensionInfos, installed, force) {
        installExtensionInfos = installExtensionInfos.filter(installExtensionInfo => {
            const { id, version, installOptions } = installExtensionInfo;
            const installedExtension = installed.find(i => areSameExtensions(i.identifier, { id }));
            if (installedExtension) {
                if (!force && (!version || (version === 'prerelease' && installedExtension.preRelease))) {
                    this.logger.info(localize('alreadyInstalled-checkAndUpdate', "Extension '{0}' v{1} is already installed. Use '--force' option to update to latest version or provide '@<version>' to install a specific version, for example: '{2}@1.2.3'.", id, installedExtension.manifest.version, id));
                    return false;
                }
                if (version && installedExtension.manifest.version === version) {
                    this.logger.info(localize('alreadyInstalled', "Extension '{0}' is already installed.", `${id}@${version}`));
                    return false;
                }
                if (installedExtension.preRelease && version !== 'prerelease') {
                    installOptions.preRelease = false;
                }
            }
            return true;
        });
        if (!installExtensionInfos.length) {
            return [];
        }
        const failed = [];
        const extensionsToInstall = [];
        const galleryExtensions = await this.getGalleryExtensions(installExtensionInfos);
        await Promise.all(installExtensionInfos.map(async ({ id, version, installOptions }) => {
            const gallery = galleryExtensions.get(id.toLowerCase());
            if (!gallery) {
                this.logger.error(`${notFound(version ? `${id}@${version}` : id)}\n${useId}`);
                failed.push(id);
                return;
            }
            try {
                const manifest = await this.extensionGalleryService.getManifest(gallery, CancellationToken.None);
                if (manifest && !this.validateExtensionKind(manifest)) {
                    return;
                }
            }
            catch (err) {
                this.logger.error(err.message || err.stack || err);
                failed.push(id);
                return;
            }
            const installedExtension = installed.find(e => areSameExtensions(e.identifier, gallery.identifier));
            if (installedExtension) {
                if (gallery.version === installedExtension.manifest.version) {
                    this.logger.info(localize('alreadyInstalled', "Extension '{0}' is already installed.", version ? `${id}@${version}` : id));
                    return;
                }
                this.logger.info(localize('updateMessage', "Updating the extension '{0}' to the version {1}", id, gallery.version));
            }
            if (installOptions.isBuiltin) {
                this.logger.info(version ? localize('installing builtin with version', "Installing builtin extension '{0}' v{1}...", id, version) : localize('installing builtin ', "Installing builtin extension '{0}'...", id));
            }
            else {
                this.logger.info(version ? localize('installing with version', "Installing extension '{0}' v{1}...", id, version) : localize('installing', "Installing extension '{0}'...", id));
            }
            extensionsToInstall.push({
                extension: gallery,
                options: { ...installOptions, installGivenVersion: !!version, isApplicationScoped: installOptions.isApplicationScoped || installedExtension?.isApplicationScoped },
            });
        }));
        if (extensionsToInstall.length) {
            const installationResult = await this.extensionManagementService.installGalleryExtensions(extensionsToInstall);
            for (const extensionResult of installationResult) {
                if (extensionResult.error) {
                    this.logger.error(localize('errorInstallingExtension', "Error while installing extension {0}: {1}", extensionResult.identifier.id, getErrorMessage(extensionResult.error)));
                    failed.push(extensionResult.identifier.id);
                }
                else {
                    this.logger.info(localize('successInstall', "Extension '{0}' v{1} was successfully installed.", extensionResult.identifier.id, extensionResult.local?.manifest.version));
                }
            }
        }
        return failed;
    }
    async installVSIX(vsix, installOptions, force, installedExtensions) {
        const manifest = await this.extensionManagementService.getManifest(vsix);
        if (!manifest) {
            throw new Error('Invalid vsix');
        }
        const valid = await this.validateVSIX(manifest, force, installOptions.profileLocation, installedExtensions);
        if (valid) {
            try {
                await this.extensionManagementService.install(vsix, { ...installOptions, installGivenVersion: true });
                this.logger.info(localize('successVsixInstall', "Extension '{0}' was successfully installed.", basename(vsix)));
            }
            catch (error) {
                if (isCancellationError(error)) {
                    this.logger.info(localize('cancelVsixInstall', "Cancelled installing extension '{0}'.", basename(vsix)));
                }
                else {
                    throw error;
                }
            }
        }
    }
    async getGalleryExtensions(extensions) {
        const galleryExtensions = new Map();
        const preRelease = extensions.some(e => e.installOptions.installPreReleaseVersion);
        const targetPlatform = await this.extensionManagementService.getTargetPlatform();
        const extensionInfos = [];
        for (const extension of extensions) {
            if (EXTENSION_IDENTIFIER_REGEX.test(extension.id)) {
                extensionInfos.push({ ...extension, preRelease });
            }
        }
        if (extensionInfos.length) {
            const result = await this.extensionGalleryService.getExtensions(extensionInfos, { targetPlatform }, CancellationToken.None);
            for (const extension of result) {
                galleryExtensions.set(extension.identifier.id.toLowerCase(), extension);
            }
        }
        return galleryExtensions;
    }
    validateExtensionKind(_manifest) {
        return true;
    }
    async validateVSIX(manifest, force, profileLocation, installedExtensions) {
        if (!force) {
            const extensionIdentifier = { id: getGalleryExtensionId(manifest.publisher, manifest.name) };
            const newer = installedExtensions.find(local => areSameExtensions(extensionIdentifier, local.identifier) && gt(local.manifest.version, manifest.version));
            if (newer) {
                this.logger.info(localize('forceDowngrade', "A newer version of extension '{0}' v{1} is already installed. Use '--force' option to downgrade to older version.", newer.identifier.id, newer.manifest.version, manifest.version));
                return false;
            }
        }
        return this.validateExtensionKind(manifest);
    }
    async uninstallExtensions(extensions, force, profileLocation) {
        const getId = async (extensionDescription) => {
            if (extensionDescription instanceof URI) {
                const manifest = await this.extensionManagementService.getManifest(extensionDescription);
                return getExtensionId(manifest.publisher, manifest.name);
            }
            return extensionDescription;
        };
        const uninstalledExtensions = [];
        for (const extension of extensions) {
            const id = await getId(extension);
            const installed = await this.extensionManagementService.getInstalled(undefined, profileLocation);
            const extensionsToUninstall = installed.filter(e => areSameExtensions(e.identifier, { id }));
            if (!extensionsToUninstall.length) {
                throw new Error(`${this.notInstalled(id)}\n${useId}`);
            }
            if (extensionsToUninstall.some(e => e.type === 0 /* ExtensionType.System */)) {
                this.logger.info(localize('builtin', "Extension '{0}' is a Built-in extension and cannot be uninstalled", id));
                return;
            }
            if (!force && extensionsToUninstall.some(e => e.isBuiltin)) {
                this.logger.info(localize('forceUninstall', "Extension '{0}' is marked as a Built-in extension by user. Please use '--force' option to uninstall it.", id));
                return;
            }
            this.logger.info(localize('uninstalling', "Uninstalling {0}...", id));
            for (const extensionToUninstall of extensionsToUninstall) {
                await this.extensionManagementService.uninstall(extensionToUninstall, { profileLocation });
                uninstalledExtensions.push(extensionToUninstall);
            }
            if (this.location) {
                this.logger.info(localize('successUninstallFromLocation', "Extension '{0}' was successfully uninstalled from {1}!", id, this.location));
            }
            else {
                this.logger.info(localize('successUninstall', "Extension '{0}' was successfully uninstalled!", id));
            }
        }
    }
    async locateExtension(extensions) {
        const installed = await this.extensionManagementService.getInstalled();
        extensions.forEach(e => {
            installed.forEach(i => {
                if (i.identifier.id === e) {
                    if (i.location.scheme === Schemas.file) {
                        this.logger.info(i.location.fsPath);
                        return;
                    }
                }
            });
        });
    }
    notInstalled(id) {
        return this.location ? localize('notInstalleddOnLocation', "Extension '{0}' is not installed on {1}.", id, this.location) : localize('notInstalled', "Extension '{0}' is not installed.", id);
    }
};
ExtensionManagementCLI = __decorate([
    __param(1, IExtensionManagementService),
    __param(2, IExtensionGalleryService)
], ExtensionManagementCLI);
export { ExtensionManagementCLI };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uTWFuYWdlbWVudENMSS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9leHRlbnNpb25NYW5hZ2VtZW50L2NvbW1vbi9leHRlbnNpb25NYW5hZ2VtZW50Q0xJLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxlQUFlLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUN0RixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDMUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxFQUFFLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUMzRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDbEQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQzNDLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSx3QkFBd0IsRUFBa0IsMkJBQTJCLEVBQThGLE1BQU0sMEJBQTBCLENBQUM7QUFDek8sT0FBTyxFQUFFLGlCQUFpQixFQUFFLGNBQWMsRUFBRSxxQkFBcUIsRUFBRSxlQUFlLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUN6SCxPQUFPLEVBQWlCLG9CQUFvQixFQUFzQixNQUFNLHVDQUF1QyxDQUFDO0FBSWhILE1BQU0sUUFBUSxHQUFHLENBQUMsRUFBVSxFQUFFLEVBQUUsQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFLDRCQUE0QixFQUFFLEVBQUUsQ0FBQyxDQUFDO0FBQ3hGLE1BQU0sS0FBSyxHQUFHLFFBQVEsQ0FBQyxPQUFPLEVBQUUsNkVB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