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
import { Queue } from '../../../base/common/async.js';
import { VSBuffer } from '../../../base/common/buffer.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { Emitter } from '../../../base/common/event.js';
import { ResourceMap } from '../../../base/common/map.js';
import { URI } from '../../../base/common/uri.js';
import { isIExtensionIdentifier } from './extensionManagement.js';
import { areSameExtensions } from './extensionManagementUtil.js';
import { IFileService, toFileOperationResult } from '../../files/common/files.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
import { ILogService } from '../../log/common/log.js';
import { IUserDataProfilesService } from '../../userDataProfile/common/userDataProfile.js';
import { IUriIdentityService } from '../../uriIdentity/common/uriIdentity.js';
import { isObject, isString, isUndefined } from '../../../base/common/types.js';
import { getErrorMessage } from '../../../base/common/errors.js';
export var ExtensionsProfileScanningErrorCode;
(function (ExtensionsProfileScanningErrorCode) {
    /**
     * Error when trying to scan extensions from a profile that does not exist.
     */
    ExtensionsProfileScanningErrorCode["ERROR_PROFILE_NOT_FOUND"] = "ERROR_PROFILE_NOT_FOUND";
    /**
     * Error when profile file is invalid.
     */
    ExtensionsProfileScanningErrorCode["ERROR_INVALID_CONTENT"] = "ERROR_INVALID_CONTENT";
})(ExtensionsProfileScanningErrorCode || (ExtensionsProfileScanningErrorCode = {}));
export class ExtensionsProfileScanningError extends Error {
    constructor(message, code) {
        super(message);
        this.code = code;
    }
}
export const IExtensionsProfileScannerService = createDecorator('IExtensionsProfileScannerService');
let AbstractExtensionsProfileScannerService = class AbstractExtensionsProfileScannerService extends Disposable {
    constructor(extensionsLocation, fileService, userDataProfilesService, uriIdentityService, logService) {
        super();
        this.extensionsLocation = extensionsLocation;
        this.fileService = fileService;
        this.userDataProfilesService = userDataProfilesService;
        this.uriIdentityService = uriIdentityService;
        this.logService = logService;
        this._onAddExtensions = this._register(new Emitter());
        this.onAddExtensions = this._onAddExtensions.event;
        this._onDidAddExtensions = this._register(new Emitter());
        this.onDidAddExtensions = this._onDidAddExtensions.event;
        this._onRemoveExtensions = this._register(new Emitter());
        this.onRemoveExtensions = this._onRemoveExtensions.event;
        this._onDidRemoveExtensions = this._register(new Emitter());
        this.onDidRemoveExtensions = this._onDidRemoveExtensions.event;
        this.resourcesAccessQueueMap = new ResourceMap();
    }
    scanProfileExtensions(profileLocation, options) {
        return this.withProfileExtensions(profileLocation, undefined, options);
    }
    async addExtensionsToProfile(extensions, profileLocation, keepExistingVersions) {
        const extensionsToRemove = [];
        const extensionsToAdd = [];
        try {
            await this.withProfileExtensions(profileLocation, existingExtensions => {
                const result = [];
                if (keepExistingVersions) {
                    result.push(...existingExtensions);
                }
                else {
                    for (const existing of existingExtensions) {
                        if (extensions.some(([e]) => areSameExtensions(e.identifier, existing.identifier) && e.manifest.version !== existing.version)) {
                            // Remove the existing extension with different version
                            extensionsToRemove.push(existing);
                        }
                        else {
                            result.push(existing);
                        }
                    }
                }
                for (const [extension, metadata] of extensions) {
                    const index = result.findIndex(e => areSameExtensions(e.identifier, extension.identifier) && e.version === extension.manifest.version);
                    const extensionToAdd = { identifier: extension.identifier, version: extension.manifest.version, location: extension.location, metadata };
                    if (index === -1) {
                        extensionsToAdd.push(extensionToAdd);
                        result.push(extensionToAdd);
                    }
                    else {
                        result.splice(index, 1, extensionToAdd);
                    }
                }
                if (extensionsToAdd.length) {
                    this._onAddExtensions.fire({ extensions: extensionsToAdd, profileLocation });
                }
                if (extensionsToRemove.length) {
                    this._onRemoveExtensions.fire({ extensions: extensionsToRemove, profileLocation });
                }
                return result;
            });
            if (extensionsToAdd.length) {
                this._onDidAddExtensions.fire({ extensions: extensionsToAdd, profileLocation });
            }
            if (extensionsToRemove.length) {
                this._onDidRemoveExtensions.fire({ extensions: extensionsToRemove, profileLocation });
            }
            return extensionsToAdd;
        }
        catch (error) {
            if (extensionsToAdd.length) {
                this._onDidAddExtensions.fire({ extensions: extensionsToAdd, error, profileLocation });
            }
            if (extensionsToRemove.length) {
                this._onDidRemoveExtensions.fire({ extensions: extensionsToRemove, error, profileLocation });
            }
            throw error;
        }
    }
    async updateMetadata(extensions, profileLocation) {
        const updatedExtensions = [];
        await this.withProfileExtensions(profileLocation, profileExtensions => {
            const result = [];
            for (const profileExtension of profileExtensions) {
                const extension = extensions.find(([e]) => areSameExtensions(e.identifier, profileExtension.identifier) && e.manifest.version === profileExtension.version);
                if (extension) {
                    profileExtension.metadata = { ...profileExtension.metadata, ...extension[1] };
                    updatedExtensions.push(profileExtension);
                    result.push(profileExtension);
                }
                else {
                    result.push(profileExtension);
                }
            }
            return result;
        });
        return updatedExtensions;
    }
    async removeExtensionsFromProfile(extensions, profileLocation) {
        const extensionsToRemove = [];
        try {
            await this.withProfileExtensions(profileLocation, profileExtensions => {
                const result = [];
                for (const e of profileExtensions) {
                    if (extensions.some(extension => areSameExtensions(e.identifier, extension))) {
                        extensionsToRemove.push(e);
                    }
                    else {
                        result.push(e);
                    }
                }
                if (extensionsToRemove.length) {
                    this._onRemoveExtensions.fire({ extensions: extensionsToRemove, profileLocation });
                }
                return result;
            });
            if (extensionsToRemove.length) {
                this._onDidRemoveExtensions.fire({ extensions: extensionsToRemove, profileLocation });
            }
        }
        catch (error) {
            if (extensionsToRemove.length) {
                this._onDidRemoveExtensions.fire({ extensions: extensionsToRemove, error, profileLocation });
            }
            throw error;
        }
    }
    async withProfileExtensions(file, updateFn, options) {
        return this.getResourceAccessQueue(file).queue(async () => {
            let extensions = [];
            // Read
            let storedProfileExtensions;
            try {
                const content = await this.fileService.readFile(file);
                storedProfileExtensions = JSON.parse(content.value.toString().trim() || '[]');
            }
            catch (error) {
                if (toFileOperationResult(error) !== 1 /* FileOperationResult.FILE_NOT_FOUND */) {
                    throw error;
                }
                // migrate from old location, remove this after couple of releases
                if (this.uriIdentityService.extUri.isEqual(file, this.userDataProfilesService.defaultProfile.extensionsResource)) {
                    storedProfileExtensions = await this.migrateFromOldDefaultProfileExtensionsLocation();
                }
                if (!storedProfileExtensions && options?.bailOutWhenFileNotFound) {
                    throw new ExtensionsProfileScanningError(getErrorMessage(error), "ERROR_PROFILE_NOT_FOUND" /* ExtensionsProfileScanningErrorCode.ERROR_PROFILE_NOT_FOUND */);
                }
            }
            if (storedProfileExtensions) {
                if (!Array.isArray(storedProfileExtensions)) {
                    this.throwInvalidConentError(file);
                }
                // TODO @sandy081: Remove this migration after couple of releases
                let migrate = false;
                for (const e of storedProfileExtensions) {
                    if (!isStoredProfileExtension(e)) {
                        this.throwInvalidConentError(file);
                    }
                    let location;
                    if (isString(e.relativeLocation) && e.relativeLocation) {
                        // Extension in new format. No migration needed.
                        location = this.resolveExtensionLocation(e.relativeLocation);
                    }
                    else if (isString(e.location)) {
                        this.logService.warn(`Extensions profile: Ignoring extension with invalid location: ${e.location}`);
                        continue;
                    }
                    else {
                        location = URI.revive(e.location);
                        const relativePath = this.toRelativePath(location);
                        if (relativePath) {
                            // Extension in old format. Migrate to new format.
                            migrate = true;
                            e.relativeLocation = relativePath;
                        }
                    }
                    if (isUndefined(e.metadata?.hasPreReleaseVersion) && e.metadata?.preRelease) {
                        migrate = true;
                        e.metadata.hasPreReleaseVersion = true;
                    }
                    const uuid = e.metadata?.id ?? e.identifier.uuid;
                    extensions.push({
                        identifier: uuid ? { id: e.identifier.id, uuid } : { id: e.identifier.id },
                        location,
                        version: e.version,
                        metadata: e.metadata,
                    });
                }
                if (migrate) {
                    await this.fileService.writeFile(file, VSBuffer.fromString(JSON.stringify(storedProfileExtensions)));
                }
            }
            // Update
            if (updateFn) {
                extensions = updateFn(extensions);
                const storedProfileExtensions = extensions.map(e => ({
                    identifier: e.identifier,
                    version: e.version,
                    // retain old format so that old clients can read it
                    location: e.location.toJSON(),
                    relativeLocation: this.toRelativePath(e.location),
                    metadata: e.metadata
                }));
                await this.fileService.writeFile(file, VSBuffer.fromString(JSON.stringify(storedProfileExtensions)));
            }
            return extensions;
        });
    }
    throwInvalidConentError(file) {
        throw new ExtensionsProfileScanningError(`Invalid extensions content in ${file.toString()}`, "ERROR_INVALID_CONTENT" /* ExtensionsProfileScanningErrorCode.ERROR_INVALID_CONTENT */);
    }
    toRelativePath(extensionLocation) {
        return this.uriIdentityService.extUri.isEqual(this.uriIdentityService.extUri.dirname(extensionLocation), this.extensionsLocation)
            ? this.uriIdentityService.extUri.basename(extensionLocation)
            : undefined;
    }
    resolveExtensionLocation(path) {
        return this.uriIdentityService.extUri.joinPath(this.extensionsLocation, path);
    }
    async migrateFromOldDefaultProfileExtensionsLocation() {
        if (!this._migrationPromise) {
            this._migrationPromise = (async () => {
                const oldDefaultProfileExtensionsLocation = this.uriIdentityService.extUri.joinPath(this.userDataProfilesService.defaultProfile.location, 'extensions.json');
                const oldDefaultProfileExtensionsInitLocation = this.uriIdentityService.extUri.joinPath(this.extensionsLocation, '.init-default-profile-extensions');
                let content;
                try {
                    content = (await this.fileService.readFile(oldDefaultProfileExtensionsLocation)).value.toString();
                }
                catch (error) {
                    if (toFileOperationResult(error) === 1 /* FileOperationResult.FILE_NOT_FOUND */) {
                        return undefined;
                    }
                    throw error;
                }
                this.logService.info('Migrating extensions from old default profile location', oldDefaultProfileExtensionsLocation.toString());
                let storedProfileExtensions;
                try {
                    const parsedData = JSON.parse(content);
                    if (Array.isArray(parsedData) && parsedData.every(candidate => isStoredProfileExtension(candidate))) {
                        storedProfileExtensions = parsedData;
                    }
                    else {
                        this.logService.warn('Skipping migrating from old default profile locaiton: Found invalid data', parsedData);
                    }
                }
                catch (error) {
                    /* Ignore */
                    this.logService.error(error);
                }
                if (storedProfileExtensions) {
                    try {
                        await this.fileService.createFile(this.userDataProfilesService.defaultProfile.extensionsResource, VSBuffer.fromString(JSON.stringify(storedProfileExtensions)), { overwrite: false });
                        this.logService.info('Migrated extensions from old default profile location to new location', oldDefaultProfileExtensionsLocation.toString(), this.userDataProfilesService.defaultProfile.extensionsResource.toString());
                    }
                    catch (error) {
                        if (toFileOperationResult(error) === 3 /* FileOperationResult.FILE_MODIFIED_SINCE */) {
                            this.logService.info('Migration from old default profile location to new location is done by another window', oldDefaultProfileExtensionsLocation.toString(), this.userDataProfilesService.defaultProfile.extensionsResource.toString());
                        }
                        else {
                            throw error;
                        }
                    }
                }
                try {
                    await this.fileService.del(oldDefaultProfileExtensionsLocation);
                }
                catch (error) {
                    if (toFileOperationResult(error) !== 1 /* FileOperationResult.FILE_NOT_FOUND */) {
                        this.logService.error(error);
                    }
                }
                try {
                    await this.fileService.del(oldDefaultProfileExtensionsInitLocation);
                }
                catch (error) {
                    if (toFileOperationResult(error) !== 1 /* FileOperationResult.FILE_NOT_FOUND */) {
                        this.logService.error(error);
                    }
                }
                return storedProfileExtensions;
            })();
        }
        return this._migrationPromise;
    }
    getResourceAccessQueue(file) {
        let resourceQueue = this.resourcesAccessQueueMap.get(file);
        if (!resourceQueue) {
            resourceQueue = new Queue();
            this.resourcesAccessQueueMap.set(file, resourceQueue);
        }
        return resourceQueue;
    }
};
AbstractExtensionsProfileScannerService = __decorate([
    __param(1, IFileService),
    __param(2, IUserDataProfilesService),
    __param(3, IUriIdentityService),
    __param(4, ILogService)
], AbstractExtensionsProfileScannerService);
export { AbstractExtensionsProfileScannerService };
function isStoredProfileExtension(candidate) {
    return isObject(candidate)
        && isIExtensionIdentifier(candidate.identifier)
        && (isUriComponents(candidate.location) || (isString(candidate.location) && candidate.location))
        && (isUndefined(candidate.relativeLocation) || isString(candidate.relativeLocation))
        && candidate.version && isString(candidate.version);
}
function isUriComponents(thing) {
    if (!thing) {
        return false;
    }
    return isString(thing.path) &&
        isString(thing.scheme);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uc1Byb2ZpbGVTY2FubmVyU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9leHRlbnNpb25NYW5hZ2VtZW50L2NvbW1vbi9leHRlbnNpb25zUHJvZmlsZVNjYW5uZXJTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUN0RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDMUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSwrQkFBK0IsQ0FBQztBQUMvRCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDMUQsT0FBTyxFQUFFLEdBQUcsRUFBaUIsTUFBTSw2QkFBNkIsQ0FBQztBQUNqRSxPQUFPLEVBQVksc0JBQXNCLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUM1RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUVqRSxPQUFPLEVBQXVCLFlBQVksRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ3ZHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUM5RSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDdEQsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0saURBQWlELENBQUM7QUFDM0YsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDOUUsT0FBTyxFQUFXLFFBQVEsRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLE1B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