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
var ExtensionsDownloader_1;
import { Promises } from '../../../base/common/async.js';
import { getErrorMessage } from '../../../base/common/errors.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { Schemas } from '../../../base/common/network.js';
import { joinPath } from '../../../base/common/resources.js';
import * as semver from '../../../base/common/semver/semver.js';
import { generateUuid } from '../../../base/common/uuid.js';
import { Promises as FSPromises } from '../../../base/node/pfs.js';
import { buffer, CorruptZipMessage } from '../../../base/node/zip.js';
import { INativeEnvironmentService } from '../../environment/common/environment.js';
import { toExtensionManagementError } from '../common/abstractExtensionManagementService.js';
import { ExtensionManagementError, ExtensionSignatureVerificationCode, IExtensionGalleryService } from '../common/extensionManagement.js';
import { ExtensionKey, groupByExtension } from '../common/extensionManagementUtil.js';
import { fromExtractError } from './extensionManagementUtil.js';
import { IExtensionSignatureVerificationService } from './extensionSignatureVerificationService.js';
import { IFileService, toFileOperationResult } from '../../files/common/files.js';
import { ILogService } from '../../log/common/log.js';
import { ITelemetryService } from '../../telemetry/common/telemetry.js';
import { IUriIdentityService } from '../../uriIdentity/common/uriIdentity.js';
let ExtensionsDownloader = class ExtensionsDownloader extends Disposable {
    static { ExtensionsDownloader_1 = this; }
    static { this.SignatureArchiveExtension = '.sigzip'; }
    constructor(environmentService, fileService, extensionGalleryService, extensionSignatureVerificationService, telemetryService, uriIdentityService, logService) {
        super();
        this.fileService = fileService;
        this.extensionGalleryService = extensionGalleryService;
        this.extensionSignatureVerificationService = extensionSignatureVerificationService;
        this.telemetryService = telemetryService;
        this.uriIdentityService = uriIdentityService;
        this.logService = logService;
        this.extensionsDownloadDir = environmentService.extensionsDownloadLocation;
        this.extensionsTrashDir = uriIdentityService.extUri.joinPath(environmentService.extensionsDownloadLocation, `.trash`);
        this.cache = 20; // Cache 20 downloaded VSIX files
        this.cleanUpPromise = this.cleanUp();
    }
    async download(extension, operation, verifySignature, clientTargetPlatform) {
        await this.cleanUpPromise;
        const location = await this.downloadVSIX(extension, operation);
        if (!verifySignature) {
            return { location, verificationStatus: undefined };
        }
        if (!extension.isSigned) {
            return { location, verificationStatus: ExtensionSignatureVerificationCode.NotSigned };
        }
        let signatureArchiveLocation;
        try {
            signatureArchiveLocation = await this.downloadSignatureArchive(extension);
            const verificationStatus = (await this.extensionSignatureVerificationService.verify(extension.identifier.id, extension.version, location.fsPath, signatureArchiveLocation.fsPath, clientTargetPlatform))?.code;
            if (verificationStatus === ExtensionSignatureVerificationCode.PackageIsInvalidZip || verificationStatus === ExtensionSignatureVerificationCode.SignatureArchiveIsInvalidZip) {
                try {
                    // Delete the downloaded vsix if VSIX or signature archive is invalid
                    await this.delete(location);
                }
                catch (error) {
                    this.logService.error(error);
                }
                throw new ExtensionManagementError(CorruptZipMessage, "CorruptZip" /* ExtensionManagementErrorCode.CorruptZip */);
            }
            return { location, verificationStatus };
        }
        catch (error) {
            try {
                // Delete the downloaded VSIX if signature archive download fails
                await this.delete(location);
            }
            catch (error) {
                this.logService.error(error);
            }
            throw error;
        }
        finally {
            if (signatureArchiveLocation) {
                try {
                    // Delete signature archive always
                    await this.delete(signatureArchiveLocation);
                }
                catch (error) {
                    this.logService.error(error);
                }
            }
        }
    }
    async downloadVSIX(extension, operation) {
        try {
            const location = joinPath(this.extensionsDownloadDir, this.getName(extension));
            const attempts = await this.doDownload(extension, 'vsix', async () => {
                await this.downloadFile(extension, location, location => this.extensionGalleryService.download(extension, location, operation));
                try {
                    await this.validate(location.fsPath, 'extension/package.json');
                }
                catch (error) {
                    try {
                        await this.fileService.del(location);
                    }
                    catch (e) {
                        this.logService.warn(`Error while deleting: ${location.path}`, getErrorMessage(e));
                    }
                    throw error;
                }
            }, 2);
            if (attempts > 1) {
                this.telemetryService.publicLog2('extensiongallery:downloadvsix:retry', {
                    extensionId: extension.identifier.id,
                    attempts
                });
            }
            return location;
        }
        catch (e) {
            throw toExtensionManagementError(e, "Download" /* ExtensionManagementErrorCode.Download */);
        }
    }
    async downloadSignatureArchive(extension) {
        try {
            const location = joinPath(this.extensionsDownloadDir, `${this.getName(extension)}${ExtensionsDownloader_1.SignatureArchiveExtension}`);
            const attempts = await this.doDownload(extension, 'sigzip', async () => {
                await this.extensionGalleryService.downloadSignatureArchive(extension, location);
                try {
                    await this.validate(location.fsPath, '.signature.p7s');
                }
                catch (error) {
                    try {
                        await this.fileService.del(location);
                    }
                    catch (e) {
                        this.logService.warn(`Error while deleting: ${location.path}`, getErrorMessage(e));
                    }
                    throw error;
                }
            }, 2);
            if (attempts > 1) {
                this.telemetryService.publicLog2('extensiongallery:downloadsigzip:retry', {
                    extensionId: extension.identifier.id,
                    attempts
                });
            }
            return location;
        }
        catch (e) {
            throw toExtensionManagementError(e, "DownloadSignature" /* ExtensionManagementErrorCode.DownloadSignature */);
        }
    }
    async downloadFile(extension, location, downloadFn) {
        // Do not download if exists
        if (await this.fileService.exists(location)) {
            return;
        }
        // Download directly if locaiton is not file scheme
        if (location.scheme !== Schemas.file) {
            await downloadFn(location);
            return;
        }
        // Download to temporary location first only if file does not exist
        const tempLocation = joinPath(this.extensionsDownloadDir, `.${generateUuid()}`);
        try {
            await downloadFn(tempLocation);
        }
        catch (error) {
            try {
                await this.fileService.del(tempLocation);
            }
            catch (e) { /* ignore */ }
            throw error;
        }
        try {
            // Rename temp location to original
            await FSPromises.rename(tempLocation.fsPath, location.fsPath, 2 * 60 * 1000 /* Retry for 2 minutes */);
        }
        catch (error) {
            try {
                await this.fileService.del(tempLocation);
            }
            catch (e) { /* ignore */ }
            let exists = false;
            try {
                exists = await this.fileService.exists(location);
            }
            catch (e) { /* ignore */ }
            if (exists) {
                this.logService.info(`Rename failed because the file was downloaded by another source. So ignoring renaming.`, extension.identifier.id, location.path);
            }
            else {
                this.logService.info(`Rename failed because of ${getErrorMessage(error)}. Deleted the file from downloaded location`, tempLocation.path);
                throw error;
            }
        }
    }
    async doDownload(extension, name, downloadFn, retries) {
        let attempts = 1;
        while (true) {
            try {
                await downloadFn();
                return attempts;
            }
            catch (e) {
                if (attempts++ > retries) {
                    throw e;
                }
                this.logService.warn(`Failed downloading ${name}. ${getErrorMessage(e)}. Retry again...`, extension.identifier.id);
            }
        }
    }
    async validate(zipPath, filePath) {
        try {
            await buffer(zipPath, filePath);
        }
        catch (e) {
            throw fromExtractError(e);
        }
    }
    async delete(location) {
        await this.cleanUpPromise;
        const trashRelativePath = this.uriIdentityService.extUri.relativePath(this.extensionsDownloadDir, location);
        if (trashRelativePath) {
            await this.fileService.move(location, this.uriIdentityService.extUri.joinPath(this.extensionsTrashDir, trashRelativePath), true);
        }
        else {
            await this.fileService.del(location);
        }
    }
    async cleanUp() {
        try {
            if (!(await this.fileService.exists(this.extensionsDownloadDir))) {
                this.logService.trace('Extension VSIX downloads cache dir does not exist');
                return;
            }
            try {
                await this.fileService.del(this.extensionsTrashDir, { recursive: true });
            }
            catch (error) {
                if (toFileOperationResult(error) !== 1 /* FileOperationResult.FILE_NOT_FOUND */) {
                    this.logService.error(error);
                }
            }
            const folderStat = await this.fileService.resolve(this.extensionsDownloadDir, { resolveMetadata: true });
            if (folderStat.children) {
                const toDelete = [];
                const vsixs = [];
                const signatureArchives = [];
                for (const stat of folderStat.children) {
                    if (stat.name.endsWith(ExtensionsDownloader_1.SignatureArchiveExtension)) {
                        signatureArchives.push(stat.resource);
                    }
                    else {
                        const extension = ExtensionKey.parse(stat.name);
                        if (extension) {
                            vsixs.push([extension, stat]);
                        }
                    }
                }
                const byExtension = groupByExtension(vsixs, ([extension]) => extension);
                const distinct = [];
                for (const p of byExtension) {
                    p.sort((a, b) => semver.rcompare(a[0].version, b[0].version));
                    toDelete.push(...p.slice(1).map(e => e[1].resource)); // Delete outdated extensions
                    distinct.push(p[0][1]);
                }
                distinct.sort((a, b) => a.mtime - b.mtime); // sort by modified time
                toDelete.push(...distinct.slice(0, Math.max(0, distinct.length - this.cache)).map(s => s.resource)); // Retain minimum cacheSize and delete the rest
                toDelete.push(...signatureArchives); // Delete all signature archives
                await Promises.settled(toDelete.map(resource => {
                    this.logService.trace('Deleting from cache', resource.path);
                    return this.fileService.del(resource);
                }));
            }
        }
        catch (e) {
            this.logService.error(e);
        }
    }
    getName(extension) {
        return ExtensionKey.create(extension).toString().toLowerCase();
    }
};
ExtensionsDownloader = ExtensionsDownloader_1 = __decorate([
    __param(0, INativeEnvironmentService),
    __param(1, IFileService),
    __param(2, IExtensionGalleryService),
    __param(3, IExtensionSignatureVerificationService),
    __param(4, ITelemetryService),
    __param(5, IUriIdentityService),
    __param(6, ILogService)
], ExtensionsDownloader);
export { ExtensionsDownloader };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uRG93bmxvYWRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9leHRlbnNpb25NYW5hZ2VtZW50L25vZGUvZXh0ZW5zaW9uRG93bmxvYWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3pELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDL0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQzFELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM3RCxPQUFPLEtBQUssTUFBTSxNQUFNLHVDQUF1QyxDQUFDO0FBRWhFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUM1RCxPQUFPLEVBQUUsUUFBUSxJQUFJLFVBQVUsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQ25FLE9BQU8sRUFBRSxNQUFNLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUN0RSxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNwRixPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUM3RixPQUFPLEVBQUUsd0JBQXdCLEVBQWdDLGtDQUFrQyxFQUFFLHdCQUF3QixFQUF1QyxNQUFNLGtDQUFrQyxDQUFDO0FBQzdNLE9BQU8sRUFBRSxZQUFZLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUN0RixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw4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