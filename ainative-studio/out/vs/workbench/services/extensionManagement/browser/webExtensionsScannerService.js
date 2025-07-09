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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2ViRXh0ZW5zaW9uc1NjYW5uZXJTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9leHRlbnNpb25NYW5hZ2VtZW50L2Jyb3dzZXIvd2ViRXh0ZW5zaW9uc1NjYW5uZXJTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBa0gsNEJBQTRCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUN0UCxPQUFPLEVBQUUsbUNBQW1DLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUN0RyxPQUFPLEVBQXFCLDRCQUE0QixFQUFlLE1BQU0sa0NBQWtDLENBQUM7QUFDaEgsT0FBTyxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUN0RSxPQUFPLEVBQXFCLGlCQUFpQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDL0csT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sZ0NBQWdDLENBQUM7QUFDcEUsT0FBTyxFQUEyQyxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUNuSCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDekQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNyRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUM1RSxPQUFPLEVBQUUsd0JBQXdCLEVBQWlFLE1BQU0sd0VBQXdFLENBQUM7QUFDakwsT0FBTyxFQUFFLGlCQUFpQixFQUFF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