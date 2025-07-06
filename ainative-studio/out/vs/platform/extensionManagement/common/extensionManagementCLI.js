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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uTWFuYWdlbWVudENMSS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2V4dGVuc2lvbk1hbmFnZW1lbnQvY29tbW9uL2V4dGVuc2lvbk1hbmFnZW1lbnRDTEkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDekUsT0FBTyxFQUFFLGVBQWUsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUMxRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDN0QsT0FBTyxFQUFFLEVBQUUsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQzNELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUNsRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDM0MsT0FBTyxFQUFFLDBCQUEwQixFQUFFLHdCQUF3QixFQUFrQiwyQkFBMkIsRUFBOEYsTUFBTSwwQkFBMEIsQ0FBQztBQUN6TyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsY0FBYyxFQUFFLHFCQUFxQixFQUFFLGVBQWUsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQ3pILE9BQU8sRUFBaUIsb0JBQW9CLEVBQXNCLE1BQU0sdUNBQXVDLENBQUM7QUFJaEgsTUFBTSxRQUFRLEdBQUcsQ0FBQyxFQUFVLEVBQUUsRUFBRSxDQUFDLFFBQVEsQ0FBQyxVQUFVLEVBQUUsNEJBQTRCLEVBQUUsRUFBRSxDQUFDLENBQUM7QUFDeEYsTUFBTSxLQUFLLEdBQUcsUUFBUSxDQUFDLE9BQU8sRUFBRSw2RUFB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