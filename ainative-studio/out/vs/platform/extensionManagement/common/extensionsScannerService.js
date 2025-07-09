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
import { coalesce } from '../../../base/common/arrays.js';
import { ThrottledDelayer } from '../../../base/common/async.js';
import * as objects from '../../../base/common/objects.js';
import { VSBuffer } from '../../../base/common/buffer.js';
import { getErrorMessage } from '../../../base/common/errors.js';
import { getNodeType, parse } from '../../../base/common/json.js';
import { getParseErrorMessage } from '../../../base/common/jsonErrorMessages.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { FileAccess, Schemas } from '../../../base/common/network.js';
import * as path from '../../../base/common/path.js';
import * as platform from '../../../base/common/platform.js';
import { basename, isEqual, joinPath } from '../../../base/common/resources.js';
import * as semver from '../../../base/common/semver/semver.js';
import Severity from '../../../base/common/severity.js';
import { URI } from '../../../base/common/uri.js';
import { localize } from '../../../nls.js';
import { IEnvironmentService } from '../../environment/common/environment.js';
import { areSameExtensions, computeTargetPlatform, getExtensionId, getGalleryExtensionId } from './extensionManagementUtil.js';
import { ExtensionIdentifier, UNDEFINED_PUBLISHER, BUILTIN_MANIFEST_CACHE_FILE, USER_MANIFEST_CACHE_FILE, ExtensionIdentifierMap, parseEnabledApiProposalNames } from '../../extensions/common/extensions.js';
import { validateExtensionManifest } from '../../extensions/common/extensionValidator.js';
import { IFileService, toFileOperationResult } from '../../files/common/files.js';
import { createDecorator, IInstantiationService } from '../../instantiation/common/instantiation.js';
import { ILogService } from '../../log/common/log.js';
import { IProductService } from '../../product/common/productService.js';
import { Emitter } from '../../../base/common/event.js';
import { revive } from '../../../base/common/marshalling.js';
import { ExtensionsProfileScanningError, IExtensionsProfileScannerService } from './extensionsProfileScannerService.js';
import { IUserDataProfilesService } from '../../userDataProfile/common/userDataProfile.js';
import { IUriIdentityService } from '../../uriIdentity/common/uriIdentity.js';
import { localizeManifest } from './extensionNls.js';
export var Translations;
(function (Translations) {
    function equals(a, b) {
        if (a === b) {
            return true;
        }
        const aKeys = Object.keys(a);
        const bKeys = new Set();
        for (const key of Object.keys(b)) {
            bKeys.add(key);
        }
        if (aKeys.length !== bKeys.size) {
            return false;
        }
        for (const key of aKeys) {
            if (a[key] !== b[key]) {
                return false;
            }
            bKeys.delete(key);
        }
        return bKeys.size === 0;
    }
    Translations.equals = equals;
})(Translations || (Translations = {}));
export const IExtensionsScannerService = createDecorator('IExtensionsScannerService');
let AbstractExtensionsScannerService = class AbstractExtensionsScannerService extends Disposable {
    constructor(systemExtensionsLocation, userExtensionsLocation, extensionsControlLocation, currentProfile, userDataProfilesService, extensionsProfileScannerService, fileService, logService, environmentService, productService, uriIdentityService, instantiationService) {
        super();
        this.systemExtensionsLocation = systemExtensionsLocation;
        this.userExtensionsLocation = userExtensionsLocation;
        this.extensionsControlLocation = extensionsControlLocation;
        this.currentProfile = currentProfile;
        this.userDataProfilesService = userDataProfilesService;
        this.extensionsProfileScannerService = extensionsProfileScannerService;
        this.fileService = fileService;
        this.logService = logService;
        this.environmentService = environmentService;
        this.productService = productService;
        this.uriIdentityService = uriIdentityService;
        this.instantiationService = instantiationService;
        this._onDidChangeCache = this._register(new Emitter());
        this.onDidChangeCache = this._onDidChangeCache.event;
        this.systemExtensionsCachedScanner = this._register(this.instantiationService.createInstance(CachedExtensionsScanner, this.currentProfile));
        this.userExtensionsCachedScanner = this._register(this.instantiationService.createInstance(CachedExtensionsScanner, this.currentProfile));
        this.extensionsScanner = this._register(this.instantiationService.createInstance(ExtensionsScanner));
        this.initializeDefaultProfileExtensionsPromise = undefined;
        this._register(this.systemExtensionsCachedScanner.onDidChangeCache(() => this._onDidChangeCache.fire(0 /* ExtensionType.System */)));
        this._register(this.userExtensionsCachedScanner.onDidChangeCache(() => this._onDidChangeCache.fire(1 /* ExtensionType.User */)));
    }
    getTargetPlatform() {
        if (!this._targetPlatformPromise) {
            this._targetPlatformPromise = computeTargetPlatform(this.fileService, this.logService);
        }
        return this._targetPlatformPromise;
    }
    async scanAllExtensions(systemScanOptions, userScanOptions) {
        const [system, user] = await Promise.all([
            this.scanSystemExtensions(systemScanOptions),
            this.scanUserExtensions(userScanOptions),
        ]);
        return this.dedupExtensions(system, user, [], await this.getTargetPlatform(), true);
    }
    async scanSystemExtensions(scanOptions) {
        const promises = [];
        promises.push(this.scanDefaultSystemExtensions(scanOptions.language));
        promises.push(this.scanDevSystemExtensions(scanOptions.language, !!scanOptions.checkControlFile));
        const [defaultSystemExtensions, devSystemExtensions] = await Promise.all(promises);
        return this.applyScanOptions([...defaultSystemExtensions, ...devSystemExtensions], 0 /* ExtensionType.System */, { pickLatest: false });
    }
    async scanUserExtensions(scanOptions) {
        this.logService.trace('Started scanning user extensions', scanOptions.profileLocation);
        const profileScanOptions = this.uriIdentityService.extUri.isEqual(scanOptions.profileLocation, this.userDataProfilesService.defaultProfile.extensionsResource) ? { bailOutWhenFileNotFound: true } : undefined;
        const extensionsScannerInput = await this.createExtensionScannerInput(scanOptions.profileLocation, true, 1 /* ExtensionType.User */, scanOptions.language, true, profileScanOptions, scanOptions.productVersion ?? this.getProductVersion());
        const extensionsScanner = scanOptions.useCache && !extensionsScannerInput.devMode ? this.userExtensionsCachedScanner : this.extensionsScanner;
        let extensions;
        try {
            extensions = await extensionsScanner.scanExtensions(extensionsScannerInput);
        }
        catch (error) {
            if (error instanceof ExtensionsProfileScanningError && error.code === "ERROR_PROFILE_NOT_FOUND" /* ExtensionsProfileScanningErrorCode.ERROR_PROFILE_NOT_FOUND */) {
                await this.doInitializeDefaultProfileExtensions();
                extensions = await extensionsScanner.scanExtensions(extensionsScannerInput);
            }
            else {
                throw error;
            }
        }
        extensions = await this.applyScanOptions(extensions, 1 /* ExtensionType.User */, { includeInvalid: scanOptions.includeInvalid, pickLatest: true });
        this.logService.trace('Scanned user extensions:', extensions.length);
        return extensions;
    }
    async scanAllUserExtensions(scanOptions = { includeInvalid: true, includeAllVersions: true }) {
        const extensionsScannerInput = await this.createExtensionScannerInput(this.userExtensionsLocation, false, 1 /* ExtensionType.User */, undefined, true, undefined, this.getProductVersion());
        const extensions = await this.extensionsScanner.scanExtensions(extensionsScannerInput);
        return this.applyScanOptions(extensions, 1 /* ExtensionType.User */, { includeAllVersions: scanOptions.includeAllVersions, includeInvalid: scanOptions.includeInvalid });
    }
    async scanExtensionsUnderDevelopment(existingExtensions, scanOptions) {
        if (this.environmentService.isExtensionDevelopment && this.environmentService.extensionDevelopmentLocationURI) {
            const extensions = (await Promise.all(this.environmentService.extensionDevelopmentLocationURI.filter(extLoc => extLoc.scheme === Schemas.file)
                .map(async (extensionDevelopmentLocationURI) => {
                const input = await this.createExtensionScannerInput(extensionDevelopmentLocationURI, false, 1 /* ExtensionType.User */, scanOptions.language, false /* do not validate */, undefined, this.getProductVersion());
                const extensions = await this.extensionsScanner.scanOneOrMultipleExtensions(input);
                return extensions.map(extension => {
                    // Override the extension type from the existing extensions
                    extension.type = existingExtensions.find(e => areSameExtensions(e.identifier, extension.identifier))?.type ?? extension.type;
                    // Validate the extension
                    return this.extensionsScanner.validate(extension, input);
                });
            })))
                .flat();
            return this.applyScanOptions(extensions, 'development', { includeInvalid: scanOptions.includeInvalid, pickLatest: true });
        }
        return [];
    }
    async scanExistingExtension(extensionLocation, extensionType, scanOptions) {
        const extensionsScannerInput = await this.createExtensionScannerInput(extensionLocation, false, extensionType, scanOptions.language, true, undefined, this.getProductVersion());
        const extension = await this.extensionsScanner.scanExtension(extensionsScannerInput);
        if (!extension) {
            return null;
        }
        if (!scanOptions.includeInvalid && !extension.isValid) {
            return null;
        }
        return extension;
    }
    async scanOneOrMultipleExtensions(extensionLocation, extensionType, scanOptions) {
        const extensionsScannerInput = await this.createExtensionScannerInput(extensionLocation, false, extensionType, scanOptions.language, true, undefined, this.getProductVersion());
        const extensions = await this.extensionsScanner.scanOneOrMultipleExtensions(extensionsScannerInput);
        return this.applyScanOptions(extensions, extensionType, { includeInvalid: scanOptions.includeInvalid, pickLatest: true });
    }
    async scanMultipleExtensions(extensionLocations, extensionType, scanOptions) {
        const extensions = [];
        await Promise.all(extensionLocations.map(async (extensionLocation) => {
            const scannedExtensions = await this.scanOneOrMultipleExtensions(extensionLocation, extensionType, scanOptions);
            extensions.push(...scannedExtensions);
        }));
        return this.applyScanOptions(extensions, extensionType, { includeInvalid: scanOptions.includeInvalid, pickLatest: true });
    }
    async updateManifestMetadata(extensionLocation, metaData) {
        const manifestLocation = joinPath(extensionLocation, 'package.json');
        const content = (await this.fileService.readFile(manifestLocation)).value.toString();
        const manifest = JSON.parse(content);
        manifest.__metadata = { ...manifest.__metadata, ...metaData };
        await this.fileService.writeFile(joinPath(extensionLocation, 'package.json'), VSBuffer.fromString(JSON.stringify(manifest, null, '\t')));
    }
    async initializeDefaultProfileExtensions() {
        try {
            await this.extensionsProfileScannerService.scanProfileExtensions(this.userDataProfilesService.defaultProfile.extensionsResource, { bailOutWhenFileNotFound: true });
        }
        catch (error) {
            if (error instanceof ExtensionsProfileScanningError && error.code === "ERROR_PROFILE_NOT_FOUND" /* ExtensionsProfileScanningErrorCode.ERROR_PROFILE_NOT_FOUND */) {
                await this.doInitializeDefaultProfileExtensions();
            }
            else {
                throw error;
            }
        }
    }
    async doInitializeDefaultProfileExtensions() {
        if (!this.initializeDefaultProfileExtensionsPromise) {
            this.initializeDefaultProfileExtensionsPromise = (async () => {
                try {
                    this.logService.info('Started initializing default profile extensions in extensions installation folder.', this.userExtensionsLocation.toString());
                    const userExtensions = await this.scanAllUserExtensions({ includeInvalid: true });
                    if (userExtensions.length) {
                        await this.extensionsProfileScannerService.addExtensionsToProfile(userExtensions.map(e => [e, e.metadata]), this.userDataProfilesService.defaultProfile.extensionsResource);
                    }
                    else {
                        try {
                            await this.fileService.createFile(this.userDataProfilesService.defaultProfile.extensionsResource, VSBuffer.fromString(JSON.stringify([])));
                        }
                        catch (error) {
                            if (toFileOperationResult(error) !== 1 /* FileOperationResult.FILE_NOT_FOUND */) {
                                this.logService.warn('Failed to create default profile extensions manifest in extensions installation folder.', this.userExtensionsLocation.toString(), getErrorMessage(error));
                            }
                        }
                    }
                    this.logService.info('Completed initializing default profile extensions in extensions installation folder.', this.userExtensionsLocation.toString());
                }
                catch (error) {
                    this.logService.error(error);
                }
                finally {
                    this.initializeDefaultProfileExtensionsPromise = undefined;
                }
            })();
        }
        return this.initializeDefaultProfileExtensionsPromise;
    }
    async applyScanOptions(extensions, type, scanOptions = {}) {
        if (!scanOptions.includeAllVersions) {
            extensions = this.dedupExtensions(type === 0 /* ExtensionType.System */ ? extensions : undefined, type === 1 /* ExtensionType.User */ ? extensions : undefined, type === 'development' ? extensions : undefined, await this.getTargetPlatform(), !!scanOptions.pickLatest);
        }
        if (!scanOptions.includeInvalid) {
            extensions = extensions.filter(extension => extension.isValid);
        }
        return extensions.sort((a, b) => {
            const aLastSegment = path.basename(a.location.fsPath);
            const bLastSegment = path.basename(b.location.fsPath);
            if (aLastSegment < bLastSegment) {
                return -1;
            }
            if (aLastSegment > bLastSegment) {
                return 1;
            }
            return 0;
        });
    }
    dedupExtensions(system, user, development, targetPlatform, pickLatest) {
        const pick = (existing, extension, isDevelopment) => {
            if (existing.isValid && !extension.isValid) {
                return false;
            }
            if (existing.isValid === extension.isValid) {
                if (pickLatest && semver.gt(existing.manifest.version, extension.manifest.version)) {
                    this.logService.debug(`Skipping extension ${extension.location.path} with lower version ${extension.manifest.version} in favour of ${existing.location.path} with version ${existing.manifest.version}`);
                    return false;
                }
                if (semver.eq(existing.manifest.version, extension.manifest.version)) {
                    if (existing.type === 0 /* ExtensionType.System */) {
                        this.logService.debug(`Skipping extension ${extension.location.path} in favour of system extension ${existing.location.path} with same version`);
                        return false;
                    }
                    if (existing.targetPlatform === targetPlatform) {
                        this.logService.debug(`Skipping extension ${extension.location.path} from different target platform ${extension.targetPlatform}`);
                        return false;
                    }
                }
            }
            if (isDevelopment) {
                this.logService.warn(`Overwriting user extension ${existing.location.path} with ${extension.location.path}.`);
            }
            else {
                this.logService.debug(`Overwriting user extension ${existing.location.path} with ${extension.location.path}.`);
            }
            return true;
        };
        const result = new ExtensionIdentifierMap();
        system?.forEach((extension) => {
            const existing = result.get(extension.identifier.id);
            if (!existing || pick(existing, extension, false)) {
                result.set(extension.identifier.id, extension);
            }
        });
        user?.forEach((extension) => {
            const existing = result.get(extension.identifier.id);
            if (!existing && system && extension.type === 0 /* ExtensionType.System */) {
                this.logService.debug(`Skipping obsolete system extension ${extension.location.path}.`);
                return;
            }
            if (!existing || pick(existing, extension, false)) {
                result.set(extension.identifier.id, extension);
            }
        });
        development?.forEach(extension => {
            const existing = result.get(extension.identifier.id);
            if (!existing || pick(existing, extension, true)) {
                result.set(extension.identifier.id, extension);
            }
            result.set(extension.identifier.id, extension);
        });
        return [...result.values()];
    }
    async scanDefaultSystemExtensions(language) {
        this.logService.trace('Started scanning system extensions');
        const extensionsScannerInput = await this.createExtensionScannerInput(this.systemExtensionsLocation, false, 0 /* ExtensionType.System */, language, true, undefined, this.getProductVersion());
        const extensionsScanner = extensionsScannerInput.devMode ? this.extensionsScanner : this.systemExtensionsCachedScanner;
        const result = await extensionsScanner.scanExtensions(extensionsScannerInput);
        this.logService.trace('Scanned system extensions:', result.length);
        return result;
    }
    async scanDevSystemExtensions(language, checkControlFile) {
        const devSystemExtensionsList = this.environmentService.isBuilt ? [] : this.productService.builtInExtensions;
        if (!devSystemExtensionsList?.length) {
            return [];
        }
        this.logService.trace('Started scanning dev system extensions');
        const builtinExtensionControl = checkControlFile ? await this.getBuiltInExtensionControl() : {};
        const devSystemExtensionsLocations = [];
        const devSystemExtensionsLocation = URI.file(path.normalize(path.join(FileAccess.asFileUri('').fsPath, '..', '.build', 'builtInExtensions')));
        for (const extension of devSystemExtensionsList) {
            const controlState = builtinExtensionControl[extension.name] || 'marketplace';
            switch (controlState) {
                case 'disabled':
                    break;
                case 'marketplace':
                    devSystemExtensionsLocations.push(joinPath(devSystemExtensionsLocation, extension.name));
                    break;
                default:
                    devSystemExtensionsLocations.push(URI.file(controlState));
                    break;
            }
        }
        const result = await Promise.all(devSystemExtensionsLocations.map(async (location) => this.extensionsScanner.scanExtension((await this.createExtensionScannerInput(location, false, 0 /* ExtensionType.System */, language, true, undefined, this.getProductVersion())))));
        this.logService.trace('Scanned dev system extensions:', result.length);
        return coalesce(result);
    }
    async getBuiltInExtensionControl() {
        try {
            const content = await this.fileService.readFile(this.extensionsControlLocation);
            return JSON.parse(content.value.toString());
        }
        catch (error) {
            return {};
        }
    }
    async createExtensionScannerInput(location, profile, type, language, validate, profileScanOptions, productVersion) {
        const translations = await this.getTranslations(language ?? platform.language);
        const mtime = await this.getMtime(location);
        const applicationExtensionsLocation = profile && !this.uriIdentityService.extUri.isEqual(location, this.userDataProfilesService.defaultProfile.extensionsResource) ? this.userDataProfilesService.defaultProfile.extensionsResource : undefined;
        const applicationExtensionsLocationMtime = applicationExtensionsLocation ? await this.getMtime(applicationExtensionsLocation) : undefined;
        return new ExtensionScannerInput(location, mtime, applicationExtensionsLocation, applicationExtensionsLocationMtime, profile, profileScanOptions, type, validate, productVersion.version, productVersion.date, this.productService.commit, !this.environmentService.isBuilt, language, translations);
    }
    async getMtime(location) {
        try {
            const stat = await this.fileService.stat(location);
            if (typeof stat.mtime === 'number') {
                return stat.mtime;
            }
        }
        catch (err) {
            // That's ok...
        }
        return undefined;
    }
    getProductVersion() {
        return {
            version: this.productService.version,
            date: this.productService.date,
        };
    }
};
AbstractExtensionsScannerService = __decorate([
    __param(4, IUserDataProfilesService),
    __param(5, IExtensionsProfileScannerService),
    __param(6, IFileService),
    __param(7, ILogService),
    __param(8, IEnvironmentService),
    __param(9, IProductService),
    __param(10, IUriIdentityService),
    __param(11, IInstantiationService)
], AbstractExtensionsScannerService);
export { AbstractExtensionsScannerService };
export class ExtensionScannerInput {
    constructor(location, mtime, applicationExtensionslocation, applicationExtensionslocationMtime, profile, profileScanOptions, type, validate, productVersion, productDate, productCommit, devMode, language, translations) {
        this.location = location;
        this.mtime = mtime;
        this.applicationExtensionslocation = applicationExtensionslocation;
        this.applicationExtensionslocationMtime = applicationExtensionslocationMtime;
        this.profile = profile;
        this.profileScanOptions = profileScanOptions;
        this.type = type;
        this.validate = validate;
        this.productVersion = productVersion;
        this.productDate = productDate;
        this.productCommit = productCommit;
        this.devMode = devMode;
        this.language = language;
        this.translations = translations;
        // Keep empty!! (JSON.parse)
    }
    static createNlsConfiguration(input) {
        return {
            language: input.language,
            pseudo: input.language === 'pseudo',
            devMode: input.devMode,
            translations: input.translations
        };
    }
    static equals(a, b) {
        return (isEqual(a.location, b.location)
            && a.mtime === b.mtime
            && isEqual(a.applicationExtensionslocation, b.applicationExtensionslocation)
            && a.applicationExtensionslocationMtime === b.applicationExtensionslocationMtime
            && a.profile === b.profile
            && objects.equals(a.profileScanOptions, b.profileScanOptions)
            && a.type === b.type
            && a.validate === b.validate
            && a.productVersion === b.productVersion
            && a.productDate === b.productDate
            && a.productCommit === b.productCommit
            && a.devMode === b.devMode
            && a.language === b.language
            && Translations.equals(a.translations, b.translations));
    }
}
let ExtensionsScanner = class ExtensionsScanner extends Disposable {
    constructor(extensionsProfileScannerService, uriIdentityService, fileService, productService, environmentService, logService) {
        super();
        this.extensionsProfileScannerService = extensionsProfileScannerService;
        this.uriIdentityService = uriIdentityService;
        this.fileService = fileService;
        this.environmentService = environmentService;
        this.logService = logService;
        this.extensionsEnabledWithApiProposalVersion = productService.extensionsEnabledWithApiProposalVersion?.map(id => id.toLowerCase()) ?? [];
    }
    async scanExtensions(input) {
        return input.profile
            ? this.scanExtensionsFromProfile(input)
            : this.scanExtensionsFromLocation(input);
    }
    async scanExtensionsFromLocation(input) {
        const stat = await this.fileService.resolve(input.location);
        if (!stat.children?.length) {
            return [];
        }
        const extensions = await Promise.all(stat.children.map(async (c) => {
            if (!c.isDirectory) {
                return null;
            }
            // Do not consider user extension folder starting with `.`
            if (input.type === 1 /* ExtensionType.User */ && basename(c.resource).indexOf('.') === 0) {
                return null;
            }
            const extensionScannerInput = new ExtensionScannerInput(c.resource, input.mtime, input.applicationExtensionslocation, input.applicationExtensionslocationMtime, input.profile, input.profileScanOptions, input.type, input.validate, input.productVersion, input.productDate, input.productCommit, input.devMode, input.language, input.translations);
            return this.scanExtension(extensionScannerInput);
        }));
        return coalesce(extensions)
            // Sort: Make sure extensions are in the same order always. Helps cache invalidation even if the order changes.
            .sort((a, b) => a.location.path < b.location.path ? -1 : 1);
    }
    async scanExtensionsFromProfile(input) {
        let profileExtensions = await this.scanExtensionsFromProfileResource(input.location, () => true, input);
        if (input.applicationExtensionslocation && !this.uriIdentityService.extUri.isEqual(input.location, input.applicationExtensionslocation)) {
            profileExtensions = profileExtensions.filter(e => !e.metadata?.isApplicationScoped);
            const applicationExtensions = await this.scanExtensionsFromProfileResource(input.applicationExtensionslocation, (e) => !!e.metadata?.isBuiltin || !!e.metadata?.isApplicationScoped, input);
            profileExtensions.push(...applicationExtensions);
        }
        return profileExtensions;
    }
    async scanExtensionsFromProfileResource(profileResource, filter, input) {
        const scannedProfileExtensions = await this.extensionsProfileScannerService.scanProfileExtensions(profileResource, input.profileScanOptions);
        if (!scannedProfileExtensions.length) {
            return [];
        }
        const extensions = await Promise.all(scannedProfileExtensions.map(async (extensionInfo) => {
            if (filter(extensionInfo)) {
                const extensionScannerInput = new ExtensionScannerInput(extensionInfo.location, input.mtime, input.applicationExtensionslocation, input.applicationExtensionslocationMtime, input.profile, input.profileScanOptions, input.type, input.validate, input.productVersion, input.productDate, input.productCommit, input.devMode, input.language, input.translations);
                return this.scanExtension(extensionScannerInput, extensionInfo);
            }
            return null;
        }));
        return coalesce(extensions);
    }
    async scanOneOrMultipleExtensions(input) {
        try {
            if (await this.fileService.exists(joinPath(input.location, 'package.json'))) {
                const extension = await this.scanExtension(input);
                return extension ? [extension] : [];
            }
            else {
                return await this.scanExtensions(input);
            }
        }
        catch (error) {
            this.logService.error(`Error scanning extensions at ${input.location.path}:`, getErrorMessage(error));
            return [];
        }
    }
    async scanExtension(input, scannedProfileExtension) {
        const validations = [];
        let isValid = true;
        let manifest;
        try {
            manifest = await this.scanExtensionManifest(input.location);
        }
        catch (e) {
            if (scannedProfileExtension) {
                validations.push([Severity.Error, getErrorMessage(e)]);
                isValid = false;
                const [publisher, name] = scannedProfileExtension.identifier.id.split('.');
                manifest = {
                    name,
                    publisher,
                    version: scannedProfileExtension.version,
                    engines: { vscode: '' }
                };
            }
            else {
                if (input.type !== 0 /* ExtensionType.System */) {
                    this.logService.error(e);
                }
                return null;
            }
        }
        // allow publisher to be undefined to make the initial extension authoring experience smoother
        if (!manifest.publisher) {
            manifest.publisher = UNDEFINED_PUBLISHER;
        }
        let metadata;
        if (scannedProfileExtension) {
            metadata = {
                ...scannedProfileExtension.metadata,
                size: manifest.__metadata?.size,
            };
        }
        else if (manifest.__metadata) {
            metadata = {
                installedTimestamp: manifest.__metadata.installedTimestamp,
                size: manifest.__metadata.size,
                targetPlatform: manifest.__metadata.targetPlatform,
            };
        }
        delete manifest.__metadata;
        const id = getGalleryExtensionId(manifest.publisher, manifest.name);
        const identifier = metadata?.id ? { id, uuid: metadata.id } : { id };
        const type = metadata?.isSystem ? 0 /* ExtensionType.System */ : input.type;
        const isBuiltin = type === 0 /* ExtensionType.System */ || !!metadata?.isBuiltin;
        try {
            manifest = await this.translateManifest(input.location, manifest, ExtensionScannerInput.createNlsConfiguration(input));
        }
        catch (error) {
            this.logService.warn('Failed to translate manifest', getErrorMessage(error));
        }
        let extension = {
            type,
            identifier,
            manifest,
            location: input.location,
            isBuiltin,
            targetPlatform: metadata?.targetPlatform ?? "undefined" /* TargetPlatform.UNDEFINED */,
            publisherDisplayName: metadata?.publisherDisplayName,
            metadata,
            isValid,
            validations,
            preRelease: !!metadata?.preRelease,
        };
        if (input.validate) {
            extension = this.validate(extension, input);
        }
        if (manifest.enabledApiProposals && (!this.environmentService.isBuilt || this.extensionsEnabledWithApiProposalVersion.includes(id.toLowerCase()))) {
            manifest.originalEnabledApiProposals = manifest.enabledApiProposals;
            manifest.enabledApiProposals = parseEnabledApiProposalNames([...manifest.enabledApiProposals]);
        }
        return extension;
    }
    validate(extension, input) {
        let isValid = extension.isValid;
        const validateApiVersion = this.environmentService.isBuilt && this.extensionsEnabledWithApiProposalVersion.includes(extension.identifier.id.toLowerCase());
        const validations = validateExtensionManifest(input.productVersion, input.productDate, input.location, extension.manifest, extension.isBuiltin, validateApiVersion);
        for (const [severity, message] of validations) {
            if (severity === Severity.Error) {
                isValid = false;
                this.logService.error(this.formatMessage(input.location, message));
            }
        }
        extension.isValid = isValid;
        extension.validations = [...extension.validations, ...validations];
        return extension;
    }
    async scanExtensionManifest(extensionLocation) {
        const manifestLocation = joinPath(extensionLocation, 'package.json');
        let content;
        try {
            content = (await this.fileService.readFile(manifestLocation)).value.toString();
        }
        catch (error) {
            if (toFileOperationResult(error) !== 1 /* FileOperationResult.FILE_NOT_FOUND */) {
                this.logService.error(this.formatMessage(extensionLocation, localize('fileReadFail', "Cannot read file {0}: {1}.", manifestLocation.path, error.message)));
            }
            throw error;
        }
        let manifest;
        try {
            manifest = JSON.parse(content);
        }
        catch (err) {
            // invalid JSON, let's get good errors
            const errors = [];
            parse(content, errors);
            for (const e of errors) {
                this.logService.error(this.formatMessage(extensionLocation, localize('jsonParseFail', "Failed to parse {0}: [{1}, {2}] {3}.", manifestLocation.path, e.offset, e.length, getParseErrorMessage(e.error))));
            }
            throw err;
        }
        if (getNodeType(manifest) !== 'object') {
            const errorMessage = this.formatMessage(extensionLocation, localize('jsonParseInvalidType', "Invalid manifest file {0}: Not a JSON object.", manifestLocation.path));
            this.logService.error(errorMessage);
            throw new Error(errorMessage);
        }
        return manifest;
    }
    async translateManifest(extensionLocation, extensionManifest, nlsConfiguration) {
        const localizedMessages = await this.getLocalizedMessages(extensionLocation, extensionManifest, nlsConfiguration);
        if (localizedMessages) {
            try {
                const errors = [];
                // resolveOriginalMessageBundle returns null if localizedMessages.default === undefined;
                const defaults = await this.resolveOriginalMessageBundle(localizedMessages.default, errors);
                if (errors.length > 0) {
                    errors.forEach((error) => {
                        this.logService.error(this.formatMessage(extensionLocation, localize('jsonsParseReportErrors', "Failed to parse {0}: {1}.", localizedMessages.default?.path, getParseErrorMessage(error.error))));
                    });
                    return extensionManifest;
                }
                else if (getNodeType(localizedMessages) !== 'object') {
                    this.logService.error(this.formatMessage(extensionLocation, localize('jsonInvalidFormat', "Invalid format {0}: JSON object expected.", localizedMessages.default?.path)));
                    return extensionManifest;
                }
                const localized = localizedMessages.values || Object.create(null);
                return localizeManifest(this.logService, extensionManifest, localized, defaults);
            }
            catch (error) {
                /*Ignore Error*/
            }
        }
        return extensionManifest;
    }
    async getLocalizedMessages(extensionLocation, extensionManifest, nlsConfiguration) {
        const defaultPackageNLS = joinPath(extensionLocation, 'package.nls.json');
        const reportErrors = (localized, errors) => {
            errors.forEach((error) => {
                this.logService.error(this.formatMessage(extensionLocation, localize('jsonsParseReportErrors', "Failed to parse {0}: {1}.", localized?.path, getParseErrorMessage(error.error))));
            });
        };
        const reportInvalidFormat = (localized) => {
            this.logService.error(this.formatMessage(extensionLocation, localize('jsonInvalidFormat', "Invalid format {0}: JSON object expected.", localized?.path)));
        };
        const translationId = `${extensionManifest.publisher}.${extensionManifest.name}`;
        const translationPath = nlsConfiguration.translations[translationId];
        if (translationPath) {
            try {
                const translationResource = URI.file(translationPath);
                const content = (await this.fileService.readFile(translationResource)).value.toString();
                const errors = [];
                const translationBundle = parse(content, errors);
                if (errors.length > 0) {
                    reportErrors(translationResource, errors);
                    return { values: undefined, default: defaultPackageNLS };
                }
                else if (getNodeType(translationBundle) !== 'object') {
                    reportInvalidFormat(translationResource);
                    return { values: undefined, default: defaultPackageNLS };
                }
                else {
                    const values = translationBundle.contents ? translationBundle.contents.package : undefined;
                    return { values: values, default: defaultPackageNLS };
                }
            }
            catch (error) {
                return { values: undefined, default: defaultPackageNLS };
            }
        }
        else {
            const exists = await this.fileService.exists(defaultPackageNLS);
            if (!exists) {
                return undefined;
            }
            let messageBundle;
            try {
                messageBundle = await this.findMessageBundles(extensionLocation, nlsConfiguration);
            }
            catch (error) {
                return undefined;
            }
            if (!messageBundle.localized) {
                return { values: undefined, default: messageBundle.original };
            }
            try {
                const messageBundleContent = (await this.fileService.readFile(messageBundle.localized)).value.toString();
                const errors = [];
                const messages = parse(messageBundleContent, errors);
                if (errors.length > 0) {
                    reportErrors(messageBundle.localized, errors);
                    return { values: undefined, default: messageBundle.original };
                }
                else if (getNodeType(messages) !== 'object') {
                    reportInvalidFormat(messageBundle.localized);
                    return { values: undefined, default: messageBundle.original };
                }
                return { values: messages, default: messageBundle.original };
            }
            catch (error) {
                return { values: undefined, default: messageBundle.original };
            }
        }
    }
    /**
     * Parses original message bundle, returns null if the original message bundle is null.
     */
    async resolveOriginalMessageBundle(originalMessageBundle, errors) {
        if (originalMessageBundle) {
            try {
                const originalBundleContent = (await this.fileService.readFile(originalMessageBundle)).value.toString();
                return parse(originalBundleContent, errors);
            }
            catch (error) {
                /* Ignore Error */
            }
        }
        return;
    }
    /**
     * Finds localized message bundle and the original (unlocalized) one.
     * If the localized file is not present, returns null for the original and marks original as localized.
     */
    findMessageBundles(extensionLocation, nlsConfiguration) {
        return new Promise((c, e) => {
            const loop = (locale) => {
                const toCheck = joinPath(extensionLocation, `package.nls.${locale}.json`);
                this.fileService.exists(toCheck).then(exists => {
                    if (exists) {
                        c({ localized: toCheck, original: joinPath(extensionLocation, 'package.nls.json') });
                    }
                    const index = locale.lastIndexOf('-');
                    if (index === -1) {
                        c({ localized: joinPath(extensionLocation, 'package.nls.json'), original: null });
                    }
                    else {
                        locale = locale.substring(0, index);
                        loop(locale);
                    }
                });
            };
            if (nlsConfiguration.devMode || nlsConfiguration.pseudo || !nlsConfiguration.language) {
                return c({ localized: joinPath(extensionLocation, 'package.nls.json'), original: null });
            }
            loop(nlsConfiguration.language);
        });
    }
    formatMessage(extensionLocation, message) {
        return `[${extensionLocation.path}]: ${message}`;
    }
};
ExtensionsScanner = __decorate([
    __param(0, IExtensionsProfileScannerService),
    __param(1, IUriIdentityService),
    __param(2, IFileService),
    __param(3, IProductService),
    __param(4, IEnvironmentService),
    __param(5, ILogService)
], ExtensionsScanner);
let CachedExtensionsScanner = class CachedExtensionsScanner extends ExtensionsScanner {
    constructor(currentProfile, userDataProfilesService, extensionsProfileScannerService, uriIdentityService, fileService, productService, environmentService, logService) {
        super(extensionsProfileScannerService, uriIdentityService, fileService, productService, environmentService, logService);
        this.currentProfile = currentProfile;
        this.userDataProfilesService = userDataProfilesService;
        this.cacheValidatorThrottler = this._register(new ThrottledDelayer(3000));
        this._onDidChangeCache = this._register(new Emitter());
        this.onDidChangeCache = this._onDidChangeCache.event;
    }
    async scanExtensions(input) {
        const cacheFile = this.getCacheFile(input);
        const cacheContents = await this.readExtensionCache(cacheFile);
        this.input = input;
        if (cacheContents && cacheContents.input && ExtensionScannerInput.equals(cacheContents.input, this.input)) {
            this.logService.debug('Using cached extensions scan result', input.type === 0 /* ExtensionType.System */ ? 'system' : 'user', input.location.toString());
            this.cacheValidatorThrottler.trigger(() => this.validateCache());
            return cacheContents.result.map((extension) => {
                // revive URI object
                extension.location = URI.revive(extension.location);
                return extension;
            });
        }
        const result = await super.scanExtensions(input);
        await this.writeExtensionCache(cacheFile, { input, result });
        return result;
    }
    async readExtensionCache(cacheFile) {
        try {
            const cacheRawContents = await this.fileService.readFile(cacheFile);
            const extensionCacheData = JSON.parse(cacheRawContents.value.toString());
            return { result: extensionCacheData.result, input: revive(extensionCacheData.input) };
        }
        catch (error) {
            this.logService.debug('Error while reading the extension cache file:', cacheFile.path, getErrorMessage(error));
        }
        return null;
    }
    async writeExtensionCache(cacheFile, cacheContents) {
        try {
            await this.fileService.writeFile(cacheFile, VSBuffer.fromString(JSON.stringify(cacheContents)));
        }
        catch (error) {
            this.logService.debug('Error while writing the extension cache file:', cacheFile.path, getErrorMessage(error));
        }
    }
    async validateCache() {
        if (!this.input) {
            // Input has been unset by the time we get here, so skip validation
            return;
        }
        const cacheFile = this.getCacheFile(this.input);
        const cacheContents = await this.readExtensionCache(cacheFile);
        if (!cacheContents) {
            // Cache has been deleted by someone else, which is perfectly fine...
            return;
        }
        const actual = cacheContents.result;
        const expected = JSON.parse(JSON.stringify(await super.scanExtensions(this.input)));
        if (objects.equals(expected, actual)) {
            // Cache is valid and running with it is perfectly fine...
            return;
        }
        try {
            this.logService.info('Invalidating Cache', actual, expected);
            // Cache is invalid, delete it
            await this.fileService.del(cacheFile);
            this._onDidChangeCache.fire();
        }
        catch (error) {
            this.logService.error(error);
        }
    }
    getCacheFile(input) {
        const profile = this.getProfile(input);
        return this.uriIdentityService.extUri.joinPath(profile.cacheHome, input.type === 0 /* ExtensionType.System */ ? BUILTIN_MANIFEST_CACHE_FILE : USER_MANIFEST_CACHE_FILE);
    }
    getProfile(input) {
        if (input.type === 0 /* ExtensionType.System */) {
            return this.userDataProfilesService.defaultProfile;
        }
        if (!input.profile) {
            return this.userDataProfilesService.defaultProfile;
        }
        if (this.uriIdentityService.extUri.isEqual(input.location, this.currentProfile.extensionsResource)) {
            return this.currentProfile;
        }
        return this.userDataProfilesService.profiles.find(p => this.uriIdentityService.extUri.isEqual(input.location, p.extensionsResource)) ?? this.currentProfile;
    }
};
CachedExtensionsScanner = __decorate([
    __param(1, IUserDataProfilesService),
    __param(2, IExtensionsProfileScannerService),
    __param(3, IUriIdentityService),
    __param(4, IFileService),
    __param(5, IProductService),
    __param(6, IEnvironmentService),
    __param(7, ILogService)
], CachedExtensionsScanner);
export function toExtensionDescription(extension, isUnderDevelopment) {
    const id = getExtensionId(extension.manifest.publisher, extension.manifest.name);
    return {
        id,
        identifier: new ExtensionIdentifier(id),
        isBuiltin: extension.type === 0 /* ExtensionType.System */,
        isUserBuiltin: extension.type === 1 /* ExtensionType.User */ && extension.isBuiltin,
        isUnderDevelopment,
        extensionLocation: extension.location,
        uuid: extension.identifier.uuid,
        targetPlatform: extension.targetPlatform,
        publisherDisplayName: extension.publisherDisplayName,
        preRelease: extension.preRelease,
        ...extension.manifest,
    };
}
export class NativeExtensionsScannerService extends AbstractExtensionsScannerService {
    constructor(systemExtensionsLocation, userExtensionsLocation, userHome, currentProfile, userDataProfilesService, extensionsProfileScannerService, fileService, logService, environmentService, productService, uriIdentityService, instantiationService) {
        super(systemExtensionsLocation, userExtensionsLocation, joinPath(userHome, '.vscode-oss-dev', 'extensions', 'control.json'), currentProfile, userDataProfilesService, extensionsProfileScannerService, fileService, logService, environmentService, productService, uriIdentityService, instantiationService);
        this.translationsPromise = (async () => {
            if (platform.translationsConfigFile) {
                try {
                    const content = await this.fileService.readFile(URI.file(platform.translationsConfigFile));
                    return JSON.parse(content.value.toString());
                }
                catch (err) { /* Ignore Error */ }
            }
            return Object.create(null);
        })();
    }
    getTranslations(language) {
        return this.translationsPromise;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uc1NjYW5uZXJTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2V4dGVuc2lvbk1hbmFnZW1lbnQvY29tbW9uL2V4dGVuc2lvbnNTY2FubmVyU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDMUQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDakUsT0FBTyxLQUFLLE9BQU8sTUFBTSxpQ0FBaUMsQ0FBQztBQUMzRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDMUQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxXQUFXLEVBQUUsS0FBSyxFQUFjLE1BQU0sOEJBQThCLENBQUM7QUFDOUUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDakYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxVQUFVLEVBQUUsT0FBTyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDdEUsT0FBTyxLQUFLLElBQUksTUFBTSw4QkFBOEIsQ0FBQztBQUNyRCxPQUFPLEtBQUssUUFBUSxNQUFNLGtDQUFrQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ2hGLE9BQU8sS0FBSyxNQUFNLE1BQU0sdUNBQXVDLENBQUM7QUFDaEUsT0FBTyxRQUFRLE1BQU0sa0NBQWtDLENBQUM7QUFDeEQsT0FBTyxFQUFFLEdBQUcsRUFBRSxN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