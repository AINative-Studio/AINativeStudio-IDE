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
import { IBuiltinExtensionsScannerService, parseEnabledApiProposalNames } from '../../../../platform/extensions/common/extensions.js';
import { IBrowserWorkbenchEnvironmentService } from '../../environment/browser/environmentService.js';
import { IWebExtensionsScannerService } from '../common/extensionManagement.js';
import { isWeb, Language } from '../../../../base/common/platform.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { joinPath } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { Queue } from '../../../../base/common/async.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { IExtensionGalleryService } from '../../../../platform/extensionManagement/common/extensionManagement.js';
import { areSameExtensions, getGalleryExtensionId, getExtensionId, isMalicious } from '../../../../platform/extensionManagement/common/extensionManagementUtil.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { localizeManifest } from '../../../../platform/extensionManagement/common/extensionNls.js';
import { localize, localize2 } from '../../../../nls.js';
import * as semver from '../../../../base/common/semver/semver.js';
import { isString, isUndefined } from '../../../../base/common/types.js';
import { getErrorMessage } from '../../../../base/common/errors.js';
import { ResourceMap } from '../../../../base/common/map.js';
import { IExtensionManifestPropertiesService } from '../../extensions/common/extensionManifestPropertiesService.js';
import { IExtensionResourceLoaderService, migratePlatformSpecificExtensionGalleryResourceURL } from '../../../../platform/extensionResourceLoader/common/extensionResourceLoader.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { IsWebContext } from '../../../../platform/contextkey/common/contextkeys.js';
import { IEditorService } from '../../editor/common/editorService.js';
import { basename } from '../../../../base/common/path.js';
import { IExtensionStorageService } from '../../../../platform/extensionManagement/common/extensionStorage.js';
import { isNonEmptyArray } from '../../../../base/common/arrays.js';
import { ILifecycleService } from '../../lifecycle/common/lifecycle.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { validateExtensionManifest } from '../../../../platform/extensions/common/extensionValidator.js';
import Severity from '../../../../base/common/severity.js';
import { IUserDataProfileService } from '../../userDataProfile/common/userDataProfile.js';
import { IUserDataProfilesService } from '../../../../platform/userDataProfile/common/userDataProfile.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
function isGalleryExtensionInfo(obj) {
    const galleryExtensionInfo = obj;
    return typeof galleryExtensionInfo?.id === 'string'
        && (galleryExtensionInfo.preRelease === undefined || typeof galleryExtensionInfo.preRelease === 'boolean')
        && (galleryExtensionInfo.migrateStorageFrom === undefined || typeof galleryExtensionInfo.migrateStorageFrom === 'string');
}
function isUriComponents(thing) {
    if (!thing) {
        return false;
    }
    return isString(thing.path) &&
        isString(thing.scheme);
}
let WebExtensionsScannerService = class WebExtensionsScannerService extends Disposable {
    constructor(environmentService, builtinExtensionsScannerService, fileService, logService, galleryService, extensionManifestPropertiesService, extensionResourceLoaderService, extensionStorageService, storageService, productService, userDataProfilesService, uriIdentityService, lifecycleService) {
        super();
        this.environmentService = environmentService;
        this.builtinExtensionsScannerService = builtinExtensionsScannerService;
        this.fileService = fileService;
        this.logService = logService;
        this.galleryService = galleryService;
        this.extensionManifestPropertiesService = extensionManifestPropertiesService;
        this.extensionResourceLoaderService = extensionResourceLoaderService;
        this.extensionStorageService = extensionStorageService;
        this.storageService = storageService;
        this.productService = productService;
        this.userDataProfilesService = userDataProfilesService;
        this.uriIdentityService = uriIdentityService;
        this.systemExtensionsCacheResource = undefined;
        this.customBuiltinExtensionsCacheResource = undefined;
        this.resourcesAccessQueueMap = new ResourceMap();
        if (isWeb) {
            this.systemExtensionsCacheResource = joinPath(environmentService.userRoamingDataHome, 'systemExtensionsCache.json');
            this.customBuiltinExtensionsCacheResource = joinPath(environmentService.userRoamingDataHome, 'customBuiltinExtensionsCache.json');
            // Eventually update caches
            lifecycleService.when(4 /* LifecyclePhase.Eventually */).then(() => this.updateCaches());
        }
        this.extensionsEnabledWithApiProposalVersion = productService.extensionsEnabledWithApiProposalVersion?.map(id => id.toLowerCase()) ?? [];
    }
    readCustomBuiltinExtensionsInfoFromEnv() {
        if (!this._customBuiltinExtensionsInfoPromise) {
            this._customBuiltinExtensionsInfoPromise = (async () => {
                let extensions = [];
                const extensionLocations = [];
                const extensionGalleryResources = [];
                const extensionsToMigrate = [];
                const customBuiltinExtensionsInfo = this.environmentService.options && Array.isArray(this.environmentService.options.additionalBuiltinExtensions)
                    ? this.environmentService.options.additionalBuiltinExtensions.map(additionalBuiltinExtension => isString(additionalBuiltinExtension) ? { id: additionalBuiltinExtension } : additionalBuiltinExtension)
                    : [];
                for (const e of customBuiltinExtensionsInfo) {
                    if (isGalleryExtensionInfo(e)) {
                        extensions.push({ id: e.id, preRelease: !!e.preRelease });
                        if (e.migrateStorageFrom) {
                            extensionsToMigrate.push([e.migrateStorageFrom, e.id]);
                        }
                    }
                    else if (isUriComponents(e)) {
                        const extensionLocation = URI.revive(e);
                        if (await this.extensionResourceLoaderService.isExtensionGalleryResource(extensionLocation)) {
                            extensionGalleryResources.push(extensionLocation);
                        }
                        else {
                            extensionLocations.push(extensionLocation);
                        }
                    }
                }
                if (extensions.length) {
                    extensions = await this.checkAdditionalBuiltinExtensions(extensions);
                }
                if (extensions.length) {
                    this.logService.info('Found additional builtin gallery extensions in env', extensions);
                }
                if (extensionLocations.length) {
                    this.logService.info('Found additional builtin location extensions in env', extensionLocations.map(e => e.toString()));
                }
                if (extensionGalleryResources.length) {
                    this.logService.info('Found additional builtin extension gallery resources in env', extensionGalleryResources.map(e => e.toString()));
                }
                return { extensions, extensionsToMigrate, extensionLocations, extensionGalleryResources };
            })();
        }
        return this._customBuiltinExtensionsInfoPromise;
    }
    async checkAdditionalBuiltinExtensions(extensions) {
        const extensionsControlManifest = await this.galleryService.getExtensionsControlManifest();
        const result = [];
        for (const extension of extensions) {
            if (isMalicious({ id: extension.id }, extensionsControlManifest.malicious)) {
                this.logService.info(`Checking additional builtin extensions: Ignoring '${extension.id}' because it is reported to be malicious.`);
                continue;
            }
            const deprecationInfo = extensionsControlManifest.deprecated[extension.id.toLowerCase()];
            if (deprecationInfo?.extension?.autoMigrate) {
                const preReleaseExtensionId = deprecationInfo.extension.id;
                this.logService.info(`Checking additional builtin extensions: '${extension.id}' is deprecated, instead using '${preReleaseExtensionId}'`);
                result.push({ id: preReleaseExtensionId, preRelease: !!extension.preRelease });
            }
            else {
                result.push(extension);
            }
        }
        return result;
    }
    /**
     * All system extensions bundled with the product
     */
    async readSystemExtensions() {
        const systemExtensions = await this.builtinExtensionsScannerService.scanBuiltinExtensions();
        const cachedSystemExtensions = await Promise.all((await this.readSystemExtensionsCache()).map(e => this.toScannedExtension(e, true, 0 /* ExtensionType.System */)));
        const result = new Map();
        for (const extension of [...systemExtensions, ...cachedSystemExtensions]) {
            const existing = result.get(extension.identifier.id.toLowerCase());
            if (existing) {
                // Incase there are duplicates always take the latest version
                if (semver.gt(existing.manifest.version, extension.manifest.version)) {
                    continue;
                }
            }
            result.set(extension.identifier.id.toLowerCase(), extension);
        }
        return [...result.values()];
    }
    /**
     * All extensions defined via `additionalBuiltinExtensions` API
     */
    async readCustomBuiltinExtensions(scanOptions) {
        const [customBuiltinExtensionsFromLocations, customBuiltinExtensionsFromGallery] = await Promise.all([
            this.getCustomBuiltinExtensionsFromLocations(scanOptions),
            this.getCustomBuiltinExtensionsFromGallery(scanOptions),
        ]);
        const customBuiltinExtensions = [...customBuiltinExtensionsFromLocations, ...customBuiltinExtensionsFromGallery];
        await this.migrateExtensionsStorage(customBuiltinExtensions);
        return customBuiltinExtensions;
    }
    async getCustomBuiltinExtensionsFromLocations(scanOptions) {
        const { extensionLocations } = await this.readCustomBuiltinExtensionsInfoFromEnv();
        if (!extensionLocations.length) {
            return [];
        }
        const result = [];
        await Promise.allSettled(extensionLocations.map(async (extensionLocation) => {
            try {
                const webExtension = await this.toWebExtension(extensionLocation);
                const extension = await this.toScannedExtension(webExtension, true);
                if (extension.isValid || !scanOptions?.skipInvalidExtensions) {
                    result.push(extension);
                }
                else {
                    this.logService.info(`Skipping invalid additional builtin extension ${webExtension.identifier.id}`);
                }
            }
            catch (error) {
                this.logService.info(`Error while fetching the additional builtin extension ${extensionLocation.toString()}.`, getErrorMessage(error));
            }
        }));
        return result;
    }
    async getCustomBuiltinExtensionsFromGallery(scanOptions) {
        if (!this.galleryService.isEnabled()) {
            this.logService.info('Ignoring fetching additional builtin extensions from gallery as it is disabled.');
            return [];
        }
        const result = [];
        const { extensions, extensionGalleryResources } = await this.readCustomBuiltinExtensionsInfoFromEnv();
        try {
            const cacheValue = JSON.stringify({
                extensions: extensions.sort((a, b) => a.id.localeCompare(b.id)),
                extensionGalleryResources: extensionGalleryResources.map(e => e.toString()).sort()
            });
            const useCache = this.storageService.get('additionalBuiltinExtensions', -1 /* StorageScope.APPLICATION */, '{}') === cacheValue;
            const webExtensions = await (useCache ? this.getCustomBuiltinExtensionsFromCache() : this.updateCustomBuiltinExtensionsCache());
            if (webExtensions.length) {
                await Promise.all(webExtensions.map(async (webExtension) => {
                    try {
                        const extension = await this.toScannedExtension(webExtension, true);
                        if (extension.isValid || !scanOptions?.skipInvalidExtensions) {
                            result.push(extension);
                        }
                        else {
                            this.logService.info(`Skipping invalid additional builtin gallery extension ${webExtension.identifier.id}`);
                        }
                    }
                    catch (error) {
                        this.logService.info(`Ignoring additional builtin extension ${webExtension.identifier.id} because there is an error while converting it into scanned extension`, getErrorMessage(error));
                    }
                }));
            }
            this.storageService.store('additionalBuiltinExtensions', cacheValue, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        }
        catch (error) {
            this.logService.info('Ignoring following additional builtin extensions as there is an error while fetching them from gallery', extensions.map(({ id }) => id), getErrorMessage(error));
        }
        return result;
    }
    async getCustomBuiltinExtensionsFromCache() {
        const cachedCustomBuiltinExtensions = await this.readCustomBuiltinExtensionsCache();
        const webExtensionsMap = new Map();
        for (const webExtension of cachedCustomBuiltinExtensions) {
            const existing = webExtensionsMap.get(webExtension.identifier.id.toLowerCase());
            if (existing) {
                // Incase there are duplicates always take the latest version
                if (semver.gt(existing.version, webExtension.version)) {
                    continue;
                }
            }
            /* Update preRelease flag in the cache - https://github.com/microsoft/vscode/issues/142831 */
            if (webExtension.metadata?.isPreReleaseVersion && !webExtension.metadata?.preRelease) {
                webExtension.metadata.preRelease = true;
            }
            webExtensionsMap.set(webExtension.identifier.id.toLowerCase(), webExtension);
        }
        return [...webExtensionsMap.values()];
    }
    async migrateExtensionsStorage(customBuiltinExtensions) {
        if (!this._migrateExtensionsStoragePromise) {
            this._migrateExtensionsStoragePromise = (async () => {
                const { extensionsToMigrate } = await this.readCustomBuiltinExtensionsInfoFromEnv();
                if (!extensionsToMigrate.length) {
                    return;
                }
                const fromExtensions = await this.galleryService.getExtensions(extensionsToMigrate.map(([id]) => ({ id })), CancellationToken.None);
                try {
                    await Promise.allSettled(extensionsToMigrate.map(async ([from, to]) => {
                        const toExtension = customBuiltinExtensions.find(extension => areSameExtensions(extension.identifier, { id: to }));
                        if (toExtension) {
                            const fromExtension = fromExtensions.find(extension => areSameExtensions(extension.identifier, { id: from }));
                            const fromExtensionManifest = fromExtension ? await this.galleryService.getManifest(fromExtension, CancellationToken.None) : null;
                            const fromExtensionId = fromExtensionManifest ? getExtensionId(fromExtensionManifest.publisher, fromExtensionManifest.name) : from;
                            const toExtensionId = getExtensionId(toExtension.manifest.publisher, toExtension.manifest.name);
                            this.extensionStorageService.addToMigrationList(fromExtensionId, toExtensionId);
                        }
                        else {
                            this.logService.info(`Skipped migrating extension storage from '${from}' to '${to}', because the '${to}' extension is not found.`);
                        }
                    }));
                }
                catch (error) {
                    this.logService.error(error);
                }
            })();
        }
        return this._migrateExtensionsStoragePromise;
    }
    async updateCaches() {
        await this.updateSystemExtensionsCache();
        await this.updateCustomBuiltinExtensionsCache();
    }
    async updateSystemExtensionsCache() {
        const systemExtensions = await this.builtinExtensionsScannerService.scanBuiltinExtensions();
        const cachedSystemExtensions = (await this.readSystemExtensionsCache())
            .filter(cached => {
            const systemExtension = systemExtensions.find(e => areSameExtensions(e.identifier, cached.identifier));
            return systemExtension && semver.gt(cached.version, systemExtension.manifest.version);
        });
        await this.writeSystemExtensionsCache(() => cachedSystemExtensions);
    }
    async updateCustomBuiltinExtensionsCache() {
        if (!this._updateCustomBuiltinExtensionsCachePromise) {
            this._updateCustomBuiltinExtensionsCachePromise = (async () => {
                this.logService.info('Updating additional builtin extensions cache');
                const { extensions, extensionGalleryResources } = await this.readCustomBuiltinExtensionsInfoFromEnv();
                const [galleryWebExtensions, extensionGalleryResourceWebExtensions] = await Promise.all([
                    this.resolveBuiltinGalleryExtensions(extensions),
                    this.resolveBuiltinExtensionGalleryResources(extensionGalleryResources)
                ]);
                const webExtensionsMap = new Map();
                for (const webExtension of [...galleryWebExtensions, ...extensionGalleryResourceWebExtensions]) {
                    webExtensionsMap.set(webExtension.identifier.id.toLowerCase(), webExtension);
                }
                await this.resolveDependenciesAndPackedExtensions(extensionGalleryResourceWebExtensions, webExtensionsMap);
                const webExtensions = [...webExtensionsMap.values()];
                await this.writeCustomBuiltinExtensionsCache(() => webExtensions);
                return webExtensions;
            })();
        }
        return this._updateCustomBuiltinExtensionsCachePromise;
    }
    async resolveBuiltinExtensionGalleryResources(extensionGalleryResources) {
        if (extensionGalleryResources.length === 0) {
            return [];
        }
        const result = new Map();
        const extensionInfos = [];
        await Promise.all(extensionGalleryResources.map(async (extensionGalleryResource) => {
            try {
                const webExtension = await this.toWebExtensionFromExtensionGalleryResource(extensionGalleryResource);
                result.set(webExtension.identifier.id.toLowerCase(), webExtension);
                extensionInfos.push({ id: webExtension.identifier.id, version: webExtension.version });
            }
            catch (error) {
                this.logService.info(`Ignoring additional builtin extension from gallery resource ${extensionGalleryResource.toString()} because there is an error while converting it into web extension`, getErrorMessage(error));
            }
        }));
        const galleryExtensions = await this.galleryService.getExtensions(extensionInfos, CancellationToken.None);
        for (const galleryExtension of galleryExtensions) {
            const webExtension = result.get(galleryExtension.identifier.id.toLowerCase());
            if (webExtension) {
                result.set(galleryExtension.identifier.id.toLowerCase(), {
                    ...webExtension,
                    identifier: { id: webExtension.identifier.id, uuid: galleryExtension.identifier.uuid },
                    readmeUri: galleryExtension.assets.readme ? URI.parse(galleryExtension.assets.readme.uri) : undefined,
                    changelogUri: galleryExtension.assets.changelog ? URI.parse(galleryExtension.assets.changelog.uri) : undefined,
                    metadata: { isPreReleaseVersion: galleryExtension.properties.isPreReleaseVersion, preRelease: galleryExtension.properties.isPreReleaseVersion, isBuiltin: true, pinned: true }
                });
            }
        }
        return [...result.values()];
    }
    async resolveBuiltinGalleryExtensions(extensions) {
        if (extensions.length === 0) {
            return [];
        }
        const webExtensions = [];
        const galleryExtensionsMap = await this.getExtensionsWithDependenciesAndPackedExtensions(extensions);
        const missingExtensions = extensions.filter(({ id }) => !galleryExtensionsMap.has(id.toLowerCase()));
        if (missingExtensions.length) {
            this.logService.info('Skipping the additional builtin extensions because their compatible versions are not found.', missingExtensions);
        }
        await Promise.all([...galleryExtensionsMap.values()].map(async (gallery) => {
            try {
                const webExtension = await this.toWebExtensionFromGallery(gallery, { isPreReleaseVersion: gallery.properties.isPreReleaseVersion, preRelease: gallery.properties.isPreReleaseVersion, isBuiltin: true });
                webExtensions.push(webExtension);
            }
            catch (error) {
                this.logService.info(`Ignoring additional builtin extension ${gallery.identifier.id} because there is an error while converting it into web extension`, getErrorMessage(error));
            }
        }));
        return webExtensions;
    }
    async resolveDependenciesAndPackedExtensions(webExtensions, result) {
        const extensionInfos = [];
        for (const webExtension of webExtensions) {
            for (const e of [...(webExtension.manifest?.extensionDependencies ?? []), ...(webExtension.manifest?.extensionPack ?? [])]) {
                if (!result.has(e.toLowerCase())) {
                    extensionInfos.push({ id: e, version: webExtension.version });
                }
            }
        }
        if (extensionInfos.length === 0) {
            return;
        }
        const galleryExtensions = await this.getExtensionsWithDependenciesAndPackedExtensions(extensionInfos, new Set([...result.keys()]));
        await Promise.all([...galleryExtensions.values()].map(async (gallery) => {
            try {
                const webExtension = await this.toWebExtensionFromGallery(gallery, { isPreReleaseVersion: gallery.properties.isPreReleaseVersion, preRelease: gallery.properties.isPreReleaseVersion, isBuiltin: true });
                result.set(webExtension.identifier.id.toLowerCase(), webExtension);
            }
            catch (error) {
                this.logService.info(`Ignoring additional builtin extension ${gallery.identifier.id} because there is an error while converting it into web extension`, getErrorMessage(error));
            }
        }));
    }
    async getExtensionsWithDependenciesAndPackedExtensions(toGet, seen = new Set(), result = new Map()) {
        if (toGet.length === 0) {
            return result;
        }
        const extensions = await this.galleryService.getExtensions(toGet, { compatible: true, targetPlatform: "web" /* TargetPlatform.WEB */ }, CancellationToken.None);
        const packsAndDependencies = new Map();
        for (const extension of extensions) {
            result.set(extension.identifier.id.toLowerCase(), extension);
            for (const id of [...(isNonEmptyArray(extension.properties.dependencies) ? extension.properties.dependencies : []), ...(isNonEmptyArray(extension.properties.extensionPack) ? extension.properties.extensionPack : [])]) {
                if (!result.has(id.toLowerCase()) && !packsAndDependencies.has(id.toLowerCase()) && !seen.has(id.toLowerCase())) {
                    const extensionInfo = toGet.find(e => areSameExtensions(e, extension.identifier));
                    packsAndDependencies.set(id.toLowerCase(), { id, preRelease: extensionInfo?.preRelease });
                }
            }
        }
        return this.getExtensionsWithDependenciesAndPackedExtensions([...packsAndDependencies.values()].filter(({ id }) => !result.has(id.toLowerCase())), seen, result);
    }
    async scanSystemExtensions() {
        return this.readSystemExtensions();
    }
    async scanUserExtensions(profileLocation, scanOptions) {
        const extensions = new Map();
        // Custom builtin extensions defined through `additionalBuiltinExtensions` API
        const customBuiltinExtensions = await this.readCustomBuiltinExtensions(scanOptions);
        for (const extension of customBuiltinExtensions) {
            extensions.set(extension.identifier.id.toLowerCase(), extension);
        }
        // User Installed extensions
        const installedExtensions = await this.scanInstalledExtensions(profileLocation, scanOptions);
        for (const extension of installedExtensions) {
            extensions.set(extension.identifier.id.toLowerCase(), extension);
        }
        return [...extensions.values()];
    }
    async scanExtensionsUnderDevelopment() {
        const devExtensions = this.environmentService.options?.developmentOptions?.extensions;
        const result = [];
        if (Array.isArray(devExtensions)) {
            await Promise.allSettled(devExtensions.map(async (devExtension) => {
                try {
                    const location = URI.revive(devExtension);
                    if (URI.isUri(location)) {
                        const webExtension = await this.toWebExtension(location);
                        result.push(await this.toScannedExtension(webExtension, false));
                    }
                    else {
                        this.logService.info(`Skipping the extension under development ${devExtension} as it is not URI type.`);
                    }
                }
                catch (error) {
                    this.logService.info(`Error while fetching the extension under development ${devExtension.toString()}.`, getErrorMessage(error));
                }
            }));
        }
        return result;
    }
    async scanExistingExtension(extensionLocation, extensionType, profileLocation) {
        if (extensionType === 0 /* ExtensionType.System */) {
            const systemExtensions = await this.scanSystemExtensions();
            return systemExtensions.find(e => e.location.toString() === extensionLocation.toString()) || null;
        }
        const userExtensions = await this.scanUserExtensions(profileLocation);
        return userExtensions.find(e => e.location.toString() === extensionLocation.toString()) || null;
    }
    async scanExtensionManifest(extensionLocation) {
        try {
            return await this.getExtensionManifest(extensionLocation);
        }
        catch (error) {
            this.logService.warn(`Error while fetching manifest from ${extensionLocation.toString()}`, getErrorMessage(error));
            return null;
        }
    }
    async addExtensionFromGallery(galleryExtension, metadata, profileLocation) {
        const webExtension = await this.toWebExtensionFromGallery(galleryExtension, metadata);
        return this.addWebExtension(webExtension, profileLocation);
    }
    async addExtension(location, metadata, profileLocation) {
        const webExtension = await this.toWebExtension(location, undefined, undefined, undefined, undefined, undefined, undefined, metadata);
        const extension = await this.toScannedExtension(webExtension, false);
        await this.addToInstalledExtensions([webExtension], profileLocation);
        return extension;
    }
    async removeExtension(extension, profileLocation) {
        await this.writeInstalledExtensions(profileLocation, installedExtensions => installedExtensions.filter(installedExtension => !areSameExtensions(installedExtension.identifier, extension.identifier)));
    }
    async updateMetadata(extension, metadata, profileLocation) {
        let updatedExtension = undefined;
        await this.writeInstalledExtensions(profileLocation, installedExtensions => {
            const result = [];
            for (const installedExtension of installedExtensions) {
                if (areSameExtensions(extension.identifier, installedExtension.identifier)) {
                    installedExtension.metadata = { ...installedExtension.metadata, ...metadata };
                    updatedExtension = installedExtension;
                    result.push(installedExtension);
                }
                else {
                    result.push(installedExtension);
                }
            }
            return result;
        });
        if (!updatedExtension) {
            throw new Error('Extension not found');
        }
        return this.toScannedExtension(updatedExtension, extension.isBuiltin);
    }
    async copyExtensions(fromProfileLocation, toProfileLocation, filter) {
        const extensionsToCopy = [];
        const fromWebExtensions = await this.readInstalledExtensions(fromProfileLocation);
        await Promise.all(fromWebExtensions.map(async (webExtension) => {
            const scannedExtension = await this.toScannedExtension(webExtension, false);
            if (filter(scannedExtension)) {
                extensionsToCopy.push(webExtension);
            }
        }));
        if (extensionsToCopy.length) {
            await this.addToInstalledExtensions(extensionsToCopy, toProfileLocation);
        }
    }
    async addWebExtension(webExtension, profileLocation) {
        const isSystem = !!(await this.scanSystemExtensions()).find(e => areSameExtensions(e.identifier, webExtension.identifier));
        const isBuiltin = !!webExtension.metadata?.isBuiltin;
        const extension = await this.toScannedExtension(webExtension, isBuiltin);
        if (isSystem) {
            await this.writeSystemExtensionsCache(systemExtensions => {
                // Remove the existing extension to avoid duplicates
                systemExtensions = systemExtensions.filter(extension => !areSameExtensions(extension.identifier, webExtension.identifier));
                systemExtensions.push(webExtension);
                return systemExtensions;
            });
            return extension;
        }
        // Update custom builtin extensions to custom builtin extensions cache
        if (isBuiltin) {
            await this.writeCustomBuiltinExtensionsCache(customBuiltinExtensions => {
                // Remove the existing extension to avoid duplicates
                customBuiltinExtensions = customBuiltinExtensions.filter(extension => !areSameExtensions(extension.identifier, webExtension.identifier));
                customBuiltinExtensions.push(webExtension);
                return customBuiltinExtensions;
            });
            const installedExtensions = await this.readInstalledExtensions(profileLocation);
            // Also add to installed extensions if it is installed to update its version
            if (installedExtensions.some(e => areSameExtensions(e.identifier, webExtension.identifier))) {
                await this.addToInstalledExtensions([webExtension], profileLocation);
            }
            return extension;
        }
        // Add to installed extensions
        await this.addToInstalledExtensions([webExtension], profileLocation);
        return extension;
    }
    async addToInstalledExtensions(webExtensions, profileLocation) {
        await this.writeInstalledExtensions(profileLocation, installedExtensions => {
            // Remove the existing extension to avoid duplicates
            installedExtensions = installedExtensions.filter(installedExtension => webExtensions.some(extension => !areSameExtensions(installedExtension.identifier, extension.identifier)));
            installedExtensions.push(...webExtensions);
            return installedExtensions;
        });
    }
    async scanInstalledExtensions(profileLocation, scanOptions) {
        let installedExtensions = await this.readInstalledExtensions(profileLocation);
        // If current profile is not a default profile, then add the application extensions to the list
        if (!this.uriIdentityService.extUri.isEqual(profileLocation, this.userDataProfilesService.defaultProfile.extensionsResource)) {
            // Remove application extensions from the non default profile
            installedExtensions = installedExtensions.filter(i => !i.metadata?.isApplicationScoped);
            // Add application extensions from the default profile to the list
            const defaultProfileExtensions = await this.readInstalledExtensions(this.userDataProfilesService.defaultProfile.extensionsResource);
            installedExtensions.push(...defaultProfileExtensions.filter(i => i.metadata?.isApplicationScoped));
        }
        installedExtensions.sort((a, b) => a.identifier.id < b.identifier.id ? -1 : a.identifier.id > b.identifier.id ? 1 : semver.rcompare(a.version, b.version));
        const result = new Map();
        for (const webExtension of installedExtensions) {
            const existing = result.get(webExtension.identifier.id.toLowerCase());
            if (existing && semver.gt(existing.manifest.version, webExtension.version)) {
                continue;
            }
            const extension = await this.toScannedExtension(webExtension, false);
            if (extension.isValid || !scanOptions?.skipInvalidExtensions) {
                result.set(extension.identifier.id.toLowerCase(), extension);
            }
            else {
                this.logService.info(`Skipping invalid installed extension ${webExtension.identifier.id}`);
            }
        }
        return [...result.values()];
    }
    async toWebExtensionFromGallery(galleryExtension, metadata) {
        const extensionLocation = await this.extensionResourceLoaderService.getExtensionGalleryResourceURL({
            publisher: galleryExtension.publisher,
            name: galleryExtension.name,
            version: galleryExtension.version,
            targetPlatform: galleryExtension.properties.targetPlatform === "web" /* TargetPlatform.WEB */ ? "web" /* TargetPlatform.WEB */ : undefined
        }, 'extension');
        if (!extensionLocation) {
            throw new Error('No extension gallery service configured.');
        }
        return this.toWebExtensionFromExtensionGalleryResource(extensionLocation, galleryExtension.identifier, galleryExtension.assets.readme ? URI.parse(galleryExtension.assets.readme.uri) : undefined, galleryExtension.assets.changelog ? URI.parse(galleryExtension.assets.changelog.uri) : undefined, metadata);
    }
    async toWebExtensionFromExtensionGalleryResource(extensionLocation, identifier, readmeUri, changelogUri, metadata) {
        const extensionResources = await this.listExtensionResources(extensionLocation);
        const packageNLSResources = this.getPackageNLSResourceMapFromResources(extensionResources);
        // The fallback, in English, will fill in any gaps missing in the localized file.
        const fallbackPackageNLSResource = extensionResources.find(e => basename(e) === 'package.nls.json');
        return this.toWebExtension(extensionLocation, identifier, undefined, packageNLSResources, fallbackPackageNLSResource ? URI.parse(fallbackPackageNLSResource) : null, readmeUri, changelogUri, metadata);
    }
    getPackageNLSResourceMapFromResources(extensionResources) {
        const packageNLSResources = new Map();
        extensionResources.forEach(e => {
            // Grab all package.nls.{language}.json files
            const regexResult = /package\.nls\.([\w-]+)\.json/.exec(basename(e));
            if (regexResult?.[1]) {
                packageNLSResources.set(regexResult[1], URI.parse(e));
            }
        });
        return packageNLSResources;
    }
    async toWebExtension(extensionLocation, identifier, manifest, packageNLSUris, fallbackPackageNLSUri, readmeUri, changelogUri, metadata) {
        if (!manifest) {
            try {
                manifest = await this.getExtensionManifest(extensionLocation);
            }
            catch (error) {
                throw new Error(`Error while fetching manifest from the location '${extensionLocation.toString()}'. ${getErrorMessage(error)}`);
            }
        }
        if (!this.extensionManifestPropertiesService.canExecuteOnWeb(manifest)) {
            throw new Error(localize('not a web extension', "Cannot add '{0}' because this extension is not a web extension.", manifest.displayName || manifest.name));
        }
        if (fallbackPackageNLSUri === undefined) {
            try {
                fallbackPackageNLSUri = joinPath(extensionLocation, 'package.nls.json');
                await this.extensionResourceLoaderService.readExtensionResource(fallbackPackageNLSUri);
            }
            catch (error) {
                fallbackPackageNLSUri = undefined;
            }
        }
        const defaultManifestTranslations = fallbackPackageNLSUri ? URI.isUri(fallbackPackageNLSUri) ? await this.getTranslations(fallbackPackageNLSUri) : fallbackPackageNLSUri : null;
        return {
            identifier: { id: getGalleryExtensionId(manifest.publisher, manifest.name), uuid: identifier?.uuid },
            version: manifest.version,
            location: extensionLocation,
            manifest,
            readmeUri,
            changelogUri,
            packageNLSUris,
            fallbackPackageNLSUri: URI.isUri(fallbackPackageNLSUri) ? fallbackPackageNLSUri : undefined,
            defaultManifestTranslations,
            metadata,
        };
    }
    async toScannedExtension(webExtension, isBuiltin, type = 1 /* ExtensionType.User */) {
        const validations = [];
        let manifest = webExtension.manifest;
        if (!manifest) {
            try {
                manifest = await this.getExtensionManifest(webExtension.location);
            }
            catch (error) {
                validations.push([Severity.Error, `Error while fetching manifest from the location '${webExtension.location}'. ${getErrorMessage(error)}`]);
            }
        }
        if (!manifest) {
            const [publisher, name] = webExtension.identifier.id.split('.');
            manifest = {
                name,
                publisher,
                version: webExtension.version,
                engines: { vscode: '*' },
            };
        }
        const packageNLSUri = webExtension.packageNLSUris?.get(Language.value().toLowerCase());
        const fallbackPackageNLS = webExtension.defaultManifestTranslations ?? webExtension.fallbackPackageNLSUri;
        if (packageNLSUri) {
            manifest = await this.translateManifest(manifest, packageNLSUri, fallbackPackageNLS);
        }
        else if (fallbackPackageNLS) {
            manifest = await this.translateManifest(manifest, fallbackPackageNLS);
        }
        const uuid = webExtension.metadata?.id;
        const validateApiVersion = this.extensionsEnabledWithApiProposalVersion.includes(webExtension.identifier.id.toLowerCase());
        validations.push(...validateExtensionManifest(this.productService.version, this.productService.date, webExtension.location, manifest, false, validateApiVersion));
        let isValid = true;
        for (const [severity, message] of validations) {
            if (severity === Severity.Error) {
                isValid = false;
                this.logService.error(message);
            }
        }
        if (manifest.enabledApiProposals && validateApiVersion) {
            manifest.enabledApiProposals = parseEnabledApiProposalNames([...manifest.enabledApiProposals]);
        }
        return {
            identifier: { id: webExtension.identifier.id, uuid: webExtension.identifier.uuid || uuid },
            location: webExtension.location,
            manifest,
            type,
            isBuiltin,
            readmeUrl: webExtension.readmeUri,
            changelogUrl: webExtension.changelogUri,
            metadata: webExtension.metadata,
            targetPlatform: "web" /* TargetPlatform.WEB */,
            validations,
            isValid,
            preRelease: !!webExtension.metadata?.preRelease,
        };
    }
    async listExtensionResources(extensionLocation) {
        try {
            const result = await this.extensionResourceLoaderService.readExtensionResource(extensionLocation);
            return JSON.parse(result);
        }
        catch (error) {
            this.logService.warn('Error while fetching extension resources list', getErrorMessage(error));
        }
        return [];
    }
    async translateManifest(manifest, nlsURL, fallbackNLS) {
        try {
            const translations = URI.isUri(nlsURL) ? await this.getTranslations(nlsURL) : nlsURL;
            const fallbackTranslations = URI.isUri(fallbackNLS) ? await this.getTranslations(fallbackNLS) : fallbackNLS;
            if (translations) {
                manifest = localizeManifest(this.logService, manifest, translations, fallbackTranslations);
            }
        }
        catch (error) { /* ignore */ }
        return manifest;
    }
    async getExtensionManifest(location) {
        const url = joinPath(location, 'package.json');
        const content = await this.extensionResourceLoaderService.readExtensionResource(url);
        return JSON.parse(content);
    }
    async getTranslations(nlsUrl) {
        try {
            const content = await this.extensionResourceLoaderService.readExtensionResource(nlsUrl);
            return JSON.parse(content);
        }
        catch (error) {
            this.logService.error(`Error while fetching translations of an extension`, nlsUrl.toString(), getErrorMessage(error));
        }
        return undefined;
    }
    async readInstalledExtensions(profileLocation) {
        return this.withWebExtensions(profileLocation);
    }
    writeInstalledExtensions(profileLocation, updateFn) {
        return this.withWebExtensions(profileLocation, updateFn);
    }
    readCustomBuiltinExtensionsCache() {
        return this.withWebExtensions(this.customBuiltinExtensionsCacheResource);
    }
    writeCustomBuiltinExtensionsCache(updateFn) {
        return this.withWebExtensions(this.customBuiltinExtensionsCacheResource, updateFn);
    }
    readSystemExtensionsCache() {
        return this.withWebExtensions(this.systemExtensionsCacheResource);
    }
    writeSystemExtensionsCache(updateFn) {
        return this.withWebExtensions(this.systemExtensionsCacheResource, updateFn);
    }
    async withWebExtensions(file, updateFn) {
        if (!file) {
            return [];
        }
        return this.getResourceAccessQueue(file).queue(async () => {
            let webExtensions = [];
            // Read
            try {
                const content = await this.fileService.readFile(file);
                const storedWebExtensions = JSON.parse(content.value.toString());
                for (const e of storedWebExtensions) {
                    if (!e.location || !e.identifier || !e.version) {
                        this.logService.info('Ignoring invalid extension while scanning', storedWebExtensions);
                        continue;
                    }
                    let packageNLSUris;
                    if (e.packageNLSUris) {
                        packageNLSUris = new Map();
                        Object.entries(e.packageNLSUris).forEach(([key, value]) => packageNLSUris.set(key, URI.revive(value)));
                    }
                    webExtensions.push({
                        identifier: e.identifier,
                        version: e.version,
                        location: URI.revive(e.location),
                        manifest: e.manifest,
                        readmeUri: URI.revive(e.readmeUri),
                        changelogUri: URI.revive(e.changelogUri),
                        packageNLSUris,
                        fallbackPackageNLSUri: URI.revive(e.fallbackPackageNLSUri),
                        defaultManifestTranslations: e.defaultManifestTranslations,
                        packageNLSUri: URI.revive(e.packageNLSUri),
                        metadata: e.metadata,
                    });
                }
                try {
                    webExtensions = await this.migrateWebExtensions(webExtensions, file);
                }
                catch (error) {
                    this.logService.error(`Error while migrating scanned extensions in ${file.toString()}`, getErrorMessage(error));
                }
            }
            catch (error) {
                /* Ignore */
                if (error.fileOperationResult !== 1 /* FileOperationResult.FILE_NOT_FOUND */) {
                    this.logService.error(error);
                }
            }
            // Update
            if (updateFn) {
                await this.storeWebExtensions(webExtensions = updateFn(webExtensions), file);
            }
            return webExtensions;
        });
    }
    async migrateWebExtensions(webExtensions, file) {
        let update = false;
        webExtensions = await Promise.all(webExtensions.map(async (webExtension) => {
            if (!webExtension.manifest) {
                try {
                    webExtension.manifest = await this.getExtensionManifest(webExtension.location);
                    update = true;
                }
                catch (error) {
                    this.logService.error(`Error while updating manifest of an extension in ${file.toString()}`, webExtension.identifier.id, getErrorMessage(error));
                }
            }
            if (isUndefined(webExtension.defaultManifestTranslations)) {
                if (webExtension.fallbackPackageNLSUri) {
                    try {
                        const content = await this.extensionResourceLoaderService.readExtensionResource(webExtension.fallbackPackageNLSUri);
                        webExtension.defaultManifestTranslations = JSON.parse(content);
                        update = true;
                    }
                    catch (error) {
                        this.logService.error(`Error while fetching default manifest translations of an extension`, webExtension.identifier.id, getErrorMessage(error));
                    }
                }
                else {
                    update = true;
                    webExtension.defaultManifestTranslations = null;
                }
            }
            const migratedLocation = migratePlatformSpecificExtensionGalleryResourceURL(webExtension.location, "web" /* TargetPlatform.WEB */);
            if (migratedLocation) {
                update = true;
                webExtension.location = migratedLocation;
            }
            if (isUndefined(webExtension.metadata?.hasPreReleaseVersion) && webExtension.metadata?.preRelease) {
                update = true;
                webExtension.metadata.hasPreReleaseVersion = true;
            }
            return webExtension;
        }));
        if (update) {
            await this.storeWebExtensions(webExtensions, file);
        }
        return webExtensions;
    }
    async storeWebExtensions(webExtensions, file) {
        function toStringDictionary(dictionary) {
            if (!dictionary) {
                return undefined;
            }
            const result = Object.create(null);
            dictionary.forEach((value, key) => result[key] = value.toJSON());
            return result;
        }
        const storedWebExtensions = webExtensions.map(e => ({
            identifier: e.identifier,
            version: e.version,
            manifest: e.manifest,
            location: e.location.toJSON(),
            readmeUri: e.readmeUri?.toJSON(),
            changelogUri: e.changelogUri?.toJSON(),
            packageNLSUris: toStringDictionary(e.packageNLSUris),
            defaultManifestTranslations: e.defaultManifestTranslations,
            fallbackPackageNLSUri: e.fallbackPackageNLSUri?.toJSON(),
            metadata: e.metadata
        }));
        await this.fileService.writeFile(file, VSBuffer.fromString(JSON.stringify(storedWebExtensions)));
    }
    getResourceAccessQueue(file) {
        let resourceQueue = this.resourcesAccessQueueMap.get(file);
        if (!resourceQueue) {
            this.resourcesAccessQueueMap.set(file, resourceQueue = new Queue());
        }
        return resourceQueue;
    }
};
WebExtensionsScannerService = __decorate([
    __param(0, IBrowserWorkbenchEnvironmentService),
    __param(1, IBuiltinExtensionsScannerService),
    __param(2, IFileService),
    __param(3, ILogService),
    __param(4, IExtensionGalleryService),
    __param(5, IExtensionManifestPropertiesService),
    __param(6, IExtensionResourceLoaderService),
    __param(7, IExtensionStorageService),
    __param(8, IStorageService),
    __param(9, IProductService),
    __param(10, IUserDataProfilesService),
    __param(11, IUriIdentityService),
    __param(12, ILifecycleService)
], WebExtensionsScannerService);
export { WebExtensionsScannerService };
if (isWeb) {
    registerAction2(class extends Action2 {
        constructor() {
            super({
                id: 'workbench.extensions.action.openInstalledWebExtensionsResource',
                title: localize2('openInstalledWebExtensionsResource', 'Open Installed Web Extensions Resource'),
                category: Categories.Developer,
                f1: true,
                precondition: IsWebContext
            });
        }
        run(serviceAccessor) {
            const editorService = serviceAccessor.get(IEditorService);
            const userDataProfileService = serviceAccessor.get(IUserDataProfileService);
            editorService.openEditor({ resource: userDataProfileService.currentProfile.extensionsResource });
        }
    });
}
registerSingleton(IWebExtensionsScannerService, WebExtensionsScannerService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2ViRXh0ZW5zaW9uc1NjYW5uZXJTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2V4dGVuc2lvbk1hbmFnZW1lbnQvYnJvd3Nlci93ZWJFeHRlbnNpb25zU2Nhbm5lclNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGdDQUFnQyxFQUFrSCw0QkFBNEIsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3RQLE9BQU8sRUFBRSxtQ0FBbUMsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQ3RHLE9BQU8sRUFBcUIsNEJBQTRCLEVBQWUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNoSCxPQUFPLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ3RFLE9BQU8sRUFBcUIsaUJBQWlCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUMvRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDaEUsT0FBTyxFQUFFLEdBQUcsRUFBaUIsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNwRSxPQUFPLEVBQTJDLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ25ILE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN6RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDN0QsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzVFLE9BQU8sRUFBRSx3QkFBd0IsRUFBaUUsTUFBTSx3RUFBd0UsQ0FBQztBQUNqTCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUs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