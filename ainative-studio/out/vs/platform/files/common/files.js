/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { TernarySearchTree } from '../../../base/common/ternarySearchTree.js';
import { sep } from '../../../base/common/path.js';
import { startsWithIgnoreCase } from '../../../base/common/strings.js';
import { isNumber } from '../../../base/common/types.js';
import { URI } from '../../../base/common/uri.js';
import { localize } from '../../../nls.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
import { isWeb } from '../../../base/common/platform.js';
import { Schemas } from '../../../base/common/network.js';
import { Lazy } from '../../../base/common/lazy.js';
//#region file service & providers
export const IFileService = createDecorator('fileService');
export function isFileOpenForWriteOptions(options) {
    return options.create === true;
}
export var FileType;
(function (FileType) {
    /**
     * File is unknown (neither file, directory nor symbolic link).
     */
    FileType[FileType["Unknown"] = 0] = "Unknown";
    /**
     * File is a normal file.
     */
    FileType[FileType["File"] = 1] = "File";
    /**
     * File is a directory.
     */
    FileType[FileType["Directory"] = 2] = "Directory";
    /**
     * File is a symbolic link.
     *
     * Note: even when the file is a symbolic link, you can test for
     * `FileType.File` and `FileType.Directory` to know the type of
     * the target the link points to.
     */
    FileType[FileType["SymbolicLink"] = 64] = "SymbolicLink";
})(FileType || (FileType = {}));
export var FilePermission;
(function (FilePermission) {
    /**
     * File is readonly. Components like editors should not
     * offer to edit the contents.
     */
    FilePermission[FilePermission["Readonly"] = 1] = "Readonly";
    /**
     * File is locked. Components like editors should offer
     * to edit the contents and ask the user upon saving to
     * remove the lock.
     */
    FilePermission[FilePermission["Locked"] = 2] = "Locked";
})(FilePermission || (FilePermission = {}));
export var FileChangeFilter;
(function (FileChangeFilter) {
    FileChangeFilter[FileChangeFilter["UPDATED"] = 2] = "UPDATED";
    FileChangeFilter[FileChangeFilter["ADDED"] = 4] = "ADDED";
    FileChangeFilter[FileChangeFilter["DELETED"] = 8] = "DELETED";
})(FileChangeFilter || (FileChangeFilter = {}));
export function isFileSystemWatcher(thing) {
    const candidate = thing;
    return !!candidate && typeof candidate.onDidChange === 'function';
}
export var FileSystemProviderCapabilities;
(function (FileSystemProviderCapabilities) {
    /**
     * No capabilities.
     */
    FileSystemProviderCapabilities[FileSystemProviderCapabilities["None"] = 0] = "None";
    /**
     * Provider supports unbuffered read/write.
     */
    FileSystemProviderCapabilities[FileSystemProviderCapabilities["FileReadWrite"] = 2] = "FileReadWrite";
    /**
     * Provider supports open/read/write/close low level file operations.
     */
    FileSystemProviderCapabilities[FileSystemProviderCapabilities["FileOpenReadWriteClose"] = 4] = "FileOpenReadWriteClose";
    /**
     * Provider supports stream based reading.
     */
    FileSystemProviderCapabilities[FileSystemProviderCapabilities["FileReadStream"] = 16] = "FileReadStream";
    /**
     * Provider supports copy operation.
     */
    FileSystemProviderCapabilities[FileSystemProviderCapabilities["FileFolderCopy"] = 8] = "FileFolderCopy";
    /**
     * Provider is path case sensitive.
     */
    FileSystemProviderCapabilities[FileSystemProviderCapabilities["PathCaseSensitive"] = 1024] = "PathCaseSensitive";
    /**
     * All files of the provider are readonly.
     */
    FileSystemProviderCapabilities[FileSystemProviderCapabilities["Readonly"] = 2048] = "Readonly";
    /**
     * Provider supports to delete via trash.
     */
    FileSystemProviderCapabilities[FileSystemProviderCapabilities["Trash"] = 4096] = "Trash";
    /**
     * Provider support to unlock files for writing.
     */
    FileSystemProviderCapabilities[FileSystemProviderCapabilities["FileWriteUnlock"] = 8192] = "FileWriteUnlock";
    /**
     * Provider support to read files atomically. This implies the
     * provider provides the `FileReadWrite` capability too.
     */
    FileSystemProviderCapabilities[FileSystemProviderCapabilities["FileAtomicRead"] = 16384] = "FileAtomicRead";
    /**
     * Provider support to write files atomically. This implies the
     * provider provides the `FileReadWrite` capability too.
     */
    FileSystemProviderCapabilities[FileSystemProviderCapabilities["FileAtomicWrite"] = 32768] = "FileAtomicWrite";
    /**
     * Provider support to delete atomically.
     */
    FileSystemProviderCapabilities[FileSystemProviderCapabilities["FileAtomicDelete"] = 65536] = "FileAtomicDelete";
    /**
     * Provider support to clone files atomically.
     */
    FileSystemProviderCapabilities[FileSystemProviderCapabilities["FileClone"] = 131072] = "FileClone";
})(FileSystemProviderCapabilities || (FileSystemProviderCapabilities = {}));
export function hasReadWriteCapability(provider) {
    return !!(provider.capabilities & 2 /* FileSystemProviderCapabilities.FileReadWrite */);
}
export function hasFileFolderCopyCapability(provider) {
    return !!(provider.capabilities & 8 /* FileSystemProviderCapabilities.FileFolderCopy */);
}
export function hasFileCloneCapability(provider) {
    return !!(provider.capabilities & 131072 /* FileSystemProviderCapabilities.FileClone */);
}
export function hasOpenReadWriteCloseCapability(provider) {
    return !!(provider.capabilities & 4 /* FileSystemProviderCapabilities.FileOpenReadWriteClose */);
}
export function hasFileReadStreamCapability(provider) {
    return !!(provider.capabilities & 16 /* FileSystemProviderCapabilities.FileReadStream */);
}
export function hasFileAtomicReadCapability(provider) {
    if (!hasReadWriteCapability(provider)) {
        return false; // we require the `FileReadWrite` capability too
    }
    return !!(provider.capabilities & 16384 /* FileSystemProviderCapabilities.FileAtomicRead */);
}
export function hasFileAtomicWriteCapability(provider) {
    if (!hasReadWriteCapability(provider)) {
        return false; // we require the `FileReadWrite` capability too
    }
    return !!(provider.capabilities & 32768 /* FileSystemProviderCapabilities.FileAtomicWrite */);
}
export function hasFileAtomicDeleteCapability(provider) {
    return !!(provider.capabilities & 65536 /* FileSystemProviderCapabilities.FileAtomicDelete */);
}
export function hasReadonlyCapability(provider) {
    return !!(provider.capabilities & 2048 /* FileSystemProviderCapabilities.Readonly */);
}
export var FileSystemProviderErrorCode;
(function (FileSystemProviderErrorCode) {
    FileSystemProviderErrorCode["FileExists"] = "EntryExists";
    FileSystemProviderErrorCode["FileNotFound"] = "EntryNotFound";
    FileSystemProviderErrorCode["FileNotADirectory"] = "EntryNotADirectory";
    FileSystemProviderErrorCode["FileIsADirectory"] = "EntryIsADirectory";
    FileSystemProviderErrorCode["FileExceedsStorageQuota"] = "EntryExceedsStorageQuota";
    FileSystemProviderErrorCode["FileTooLarge"] = "EntryTooLarge";
    FileSystemProviderErrorCode["FileWriteLocked"] = "EntryWriteLocked";
    FileSystemProviderErrorCode["NoPermissions"] = "NoPermissions";
    FileSystemProviderErrorCode["Unavailable"] = "Unavailable";
    FileSystemProviderErrorCode["Unknown"] = "Unknown";
})(FileSystemProviderErrorCode || (FileSystemProviderErrorCode = {}));
export class FileSystemProviderError extends Error {
    static create(error, code) {
        const providerError = new FileSystemProviderError(error.toString(), code);
        markAsFileSystemProviderError(providerError, code);
        return providerError;
    }
    constructor(message, code) {
        super(message);
        this.code = code;
    }
}
export function createFileSystemProviderError(error, code) {
    return FileSystemProviderError.create(error, code);
}
export function ensureFileSystemProviderError(error) {
    if (!error) {
        return createFileSystemProviderError(localize('unknownError', "Unknown Error"), FileSystemProviderErrorCode.Unknown); // https://github.com/microsoft/vscode/issues/72798
    }
    return error;
}
export function markAsFileSystemProviderError(error, code) {
    error.name = code ? `${code} (FileSystemError)` : `FileSystemError`;
    return error;
}
export function toFileSystemProviderErrorCode(error) {
    // Guard against abuse
    if (!error) {
        return FileSystemProviderErrorCode.Unknown;
    }
    // FileSystemProviderError comes with the code
    if (error instanceof FileSystemProviderError) {
        return error.code;
    }
    // Any other error, check for name match by assuming that the error
    // went through the markAsFileSystemProviderError() method
    const match = /^(.+) \(FileSystemError\)$/.exec(error.name);
    if (!match) {
        return FileSystemProviderErrorCode.Unknown;
    }
    switch (match[1]) {
        case FileSystemProviderErrorCode.FileExists: return FileSystemProviderErrorCode.FileExists;
        case FileSystemProviderErrorCode.FileIsADirectory: return FileSystemProviderErrorCode.FileIsADirectory;
        case FileSystemProviderErrorCode.FileNotADirectory: return FileSystemProviderErrorCode.FileNotADirectory;
        case FileSystemProviderErrorCode.FileNotFound: return FileSystemProviderErrorCode.FileNotFound;
        case FileSystemProviderErrorCode.FileTooLarge: return FileSystemProviderErrorCode.FileTooLarge;
        case FileSystemProviderErrorCode.FileWriteLocked: return FileSystemProviderErrorCode.FileWriteLocked;
        case FileSystemProviderErrorCode.NoPermissions: return FileSystemProviderErrorCode.NoPermissions;
        case FileSystemProviderErrorCode.Unavailable: return FileSystemProviderErrorCode.Unavailable;
    }
    return FileSystemProviderErrorCode.Unknown;
}
export function toFileOperationResult(error) {
    // FileSystemProviderError comes with the result already
    if (error instanceof FileOperationError) {
        return error.fileOperationResult;
    }
    // Otherwise try to find from code
    switch (toFileSystemProviderErrorCode(error)) {
        case FileSystemProviderErrorCode.FileNotFound:
            return 1 /* FileOperationResult.FILE_NOT_FOUND */;
        case FileSystemProviderErrorCode.FileIsADirectory:
            return 0 /* FileOperationResult.FILE_IS_DIRECTORY */;
        case FileSystemProviderErrorCode.FileNotADirectory:
            return 9 /* FileOperationResult.FILE_NOT_DIRECTORY */;
        case FileSystemProviderErrorCode.FileWriteLocked:
            return 5 /* FileOperationResult.FILE_WRITE_LOCKED */;
        case FileSystemProviderErrorCode.NoPermissions:
            return 6 /* FileOperationResult.FILE_PERMISSION_DENIED */;
        case FileSystemProviderErrorCode.FileExists:
            return 4 /* FileOperationResult.FILE_MOVE_CONFLICT */;
        case FileSystemProviderErrorCode.FileTooLarge:
            return 7 /* FileOperationResult.FILE_TOO_LARGE */;
        default:
            return 10 /* FileOperationResult.FILE_OTHER_ERROR */;
    }
}
export var FileOperation;
(function (FileOperation) {
    FileOperation[FileOperation["CREATE"] = 0] = "CREATE";
    FileOperation[FileOperation["DELETE"] = 1] = "DELETE";
    FileOperation[FileOperation["MOVE"] = 2] = "MOVE";
    FileOperation[FileOperation["COPY"] = 3] = "COPY";
    FileOperation[FileOperation["WRITE"] = 4] = "WRITE";
})(FileOperation || (FileOperation = {}));
export class FileOperationEvent {
    constructor(resource, operation, target) {
        this.resource = resource;
        this.operation = operation;
        this.target = target;
    }
    isOperation(operation) {
        return this.operation === operation;
    }
}
/**
 * Possible changes that can occur to a file.
 */
export var FileChangeType;
(function (FileChangeType) {
    FileChangeType[FileChangeType["UPDATED"] = 0] = "UPDATED";
    FileChangeType[FileChangeType["ADDED"] = 1] = "ADDED";
    FileChangeType[FileChangeType["DELETED"] = 2] = "DELETED";
})(FileChangeType || (FileChangeType = {}));
export class FileChangesEvent {
    static { this.MIXED_CORRELATION = null; }
    constructor(changes, ignorePathCasing) {
        this.ignorePathCasing = ignorePathCasing;
        this.correlationId = undefined;
        this.added = new Lazy(() => {
            const added = TernarySearchTree.forUris(() => this.ignorePathCasing);
            added.fill(this.rawAdded.map(resource => [resource, true]));
            return added;
        });
        this.updated = new Lazy(() => {
            const updated = TernarySearchTree.forUris(() => this.ignorePathCasing);
            updated.fill(this.rawUpdated.map(resource => [resource, true]));
            return updated;
        });
        this.deleted = new Lazy(() => {
            const deleted = TernarySearchTree.forUris(() => this.ignorePathCasing);
            deleted.fill(this.rawDeleted.map(resource => [resource, true]));
            return deleted;
        });
        /**
         * @deprecated use the `contains` or `affects` method to efficiently find
         * out if the event relates to a given resource. these methods ensure:
         * - that there is no expensive lookup needed (by using a `TernarySearchTree`)
         * - correctly handles `FileChangeType.DELETED` events
         */
        this.rawAdded = [];
        /**
        * @deprecated use the `contains` or `affects` method to efficiently find
        * out if the event relates to a given resource. these methods ensure:
        * - that there is no expensive lookup needed (by using a `TernarySearchTree`)
        * - correctly handles `FileChangeType.DELETED` events
        */
        this.rawUpdated = [];
        /**
        * @deprecated use the `contains` or `affects` method to efficiently find
        * out if the event relates to a given resource. these methods ensure:
        * - that there is no expensive lookup needed (by using a `TernarySearchTree`)
        * - correctly handles `FileChangeType.DELETED` events
        */
        this.rawDeleted = [];
        for (const change of changes) {
            // Split by type
            switch (change.type) {
                case 1 /* FileChangeType.ADDED */:
                    this.rawAdded.push(change.resource);
                    break;
                case 0 /* FileChangeType.UPDATED */:
                    this.rawUpdated.push(change.resource);
                    break;
                case 2 /* FileChangeType.DELETED */:
                    this.rawDeleted.push(change.resource);
                    break;
            }
            // Figure out events correlation
            if (this.correlationId !== FileChangesEvent.MIXED_CORRELATION) {
                if (typeof change.cId === 'number') {
                    if (this.correlationId === undefined) {
                        this.correlationId = change.cId; // correlation not yet set, just take it
                    }
                    else if (this.correlationId !== change.cId) {
                        this.correlationId = FileChangesEvent.MIXED_CORRELATION; // correlation mismatch, we have mixed correlation
                    }
                }
                else {
                    if (this.correlationId !== undefined) {
                        this.correlationId = FileChangesEvent.MIXED_CORRELATION; // correlation mismatch, we have mixed correlation
                    }
                }
            }
        }
    }
    /**
     * Find out if the file change events match the provided resource.
     *
     * Note: when passing `FileChangeType.DELETED`, we consider a match
     * also when the parent of the resource got deleted.
     */
    contains(resource, ...types) {
        return this.doContains(resource, { includeChildren: false }, ...types);
    }
    /**
     * Find out if the file change events either match the provided
     * resource, or contain a child of this resource.
     */
    affects(resource, ...types) {
        return this.doContains(resource, { includeChildren: true }, ...types);
    }
    doContains(resource, options, ...types) {
        if (!resource) {
            return false;
        }
        const hasTypesFilter = types.length > 0;
        // Added
        if (!hasTypesFilter || types.includes(1 /* FileChangeType.ADDED */)) {
            if (this.added.value.get(resource)) {
                return true;
            }
            if (options.includeChildren && this.added.value.findSuperstr(resource)) {
                return true;
            }
        }
        // Updated
        if (!hasTypesFilter || types.includes(0 /* FileChangeType.UPDATED */)) {
            if (this.updated.value.get(resource)) {
                return true;
            }
            if (options.includeChildren && this.updated.value.findSuperstr(resource)) {
                return true;
            }
        }
        // Deleted
        if (!hasTypesFilter || types.includes(2 /* FileChangeType.DELETED */)) {
            if (this.deleted.value.findSubstr(resource) /* deleted also considers parent folders */) {
                return true;
            }
            if (options.includeChildren && this.deleted.value.findSuperstr(resource)) {
                return true;
            }
        }
        return false;
    }
    /**
     * Returns if this event contains added files.
     */
    gotAdded() {
        return this.rawAdded.length > 0;
    }
    /**
     * Returns if this event contains deleted files.
     */
    gotDeleted() {
        return this.rawDeleted.length > 0;
    }
    /**
     * Returns if this event contains updated files.
     */
    gotUpdated() {
        return this.rawUpdated.length > 0;
    }
    /**
     * Returns if this event contains changes that correlate to the
     * provided `correlationId`.
     *
     * File change event correlation is an advanced watch feature that
     * allows to  identify from which watch request the events originate
     * from. This correlation allows to route events specifically
     * only to the requestor and not emit them to all listeners.
     */
    correlates(correlationId) {
        return this.correlationId === correlationId;
    }
    /**
     * Figure out if the event contains changes that correlate to one
     * correlation identifier.
     *
     * File change event correlation is an advanced watch feature that
     * allows to  identify from which watch request the events originate
     * from. This correlation allows to route events specifically
     * only to the requestor and not emit them to all listeners.
     */
    hasCorrelation() {
        return typeof this.correlationId === 'number';
    }
}
export function isParent(path, candidate, ignoreCase) {
    if (!path || !candidate || path === candidate) {
        return false;
    }
    if (candidate.length > path.length) {
        return false;
    }
    if (candidate.charAt(candidate.length - 1) !== sep) {
        candidate += sep;
    }
    if (ignoreCase) {
        return startsWithIgnoreCase(path, candidate);
    }
    return path.indexOf(candidate) === 0;
}
export class FileOperationError extends Error {
    constructor(message, fileOperationResult, options) {
        super(message);
        this.fileOperationResult = fileOperationResult;
        this.options = options;
    }
}
export class TooLargeFileOperationError extends FileOperationError {
    constructor(message, fileOperationResult, size, options) {
        super(message, fileOperationResult, options);
        this.fileOperationResult = fileOperationResult;
        this.size = size;
    }
}
export class NotModifiedSinceFileOperationError extends FileOperationError {
    constructor(message, stat, options) {
        super(message, 2 /* FileOperationResult.FILE_NOT_MODIFIED_SINCE */, options);
        this.stat = stat;
    }
}
export var FileOperationResult;
(function (FileOperationResult) {
    FileOperationResult[FileOperationResult["FILE_IS_DIRECTORY"] = 0] = "FILE_IS_DIRECTORY";
    FileOperationResult[FileOperationResult["FILE_NOT_FOUND"] = 1] = "FILE_NOT_FOUND";
    FileOperationResult[FileOperationResult["FILE_NOT_MODIFIED_SINCE"] = 2] = "FILE_NOT_MODIFIED_SINCE";
    FileOperationResult[FileOperationResult["FILE_MODIFIED_SINCE"] = 3] = "FILE_MODIFIED_SINCE";
    FileOperationResult[FileOperationResult["FILE_MOVE_CONFLICT"] = 4] = "FILE_MOVE_CONFLICT";
    FileOperationResult[FileOperationResult["FILE_WRITE_LOCKED"] = 5] = "FILE_WRITE_LOCKED";
    FileOperationResult[FileOperationResult["FILE_PERMISSION_DENIED"] = 6] = "FILE_PERMISSION_DENIED";
    FileOperationResult[FileOperationResult["FILE_TOO_LARGE"] = 7] = "FILE_TOO_LARGE";
    FileOperationResult[FileOperationResult["FILE_INVALID_PATH"] = 8] = "FILE_INVALID_PATH";
    FileOperationResult[FileOperationResult["FILE_NOT_DIRECTORY"] = 9] = "FILE_NOT_DIRECTORY";
    FileOperationResult[FileOperationResult["FILE_OTHER_ERROR"] = 10] = "FILE_OTHER_ERROR";
})(FileOperationResult || (FileOperationResult = {}));
//#endregion
//#region Settings
export const AutoSaveConfiguration = {
    OFF: 'off',
    AFTER_DELAY: 'afterDelay',
    ON_FOCUS_CHANGE: 'onFocusChange',
    ON_WINDOW_CHANGE: 'onWindowChange'
};
export const HotExitConfiguration = {
    OFF: 'off',
    ON_EXIT: 'onExit',
    ON_EXIT_AND_WINDOW_CLOSE: 'onExitAndWindowClose'
};
export const FILES_ASSOCIATIONS_CONFIG = 'files.associations';
export const FILES_EXCLUDE_CONFIG = 'files.exclude';
export const FILES_READONLY_INCLUDE_CONFIG = 'files.readonlyInclude';
export const FILES_READONLY_EXCLUDE_CONFIG = 'files.readonlyExclude';
export const FILES_READONLY_FROM_PERMISSIONS_CONFIG = 'files.readonlyFromPermissions';
//#endregion
//#region Utilities
export var FileKind;
(function (FileKind) {
    FileKind[FileKind["FILE"] = 0] = "FILE";
    FileKind[FileKind["FOLDER"] = 1] = "FOLDER";
    FileKind[FileKind["ROOT_FOLDER"] = 2] = "ROOT_FOLDER";
})(FileKind || (FileKind = {}));
/**
 * A hint to disable etag checking for reading/writing.
 */
export const ETAG_DISABLED = '';
export function etag(stat) {
    if (typeof stat.size !== 'number' || typeof stat.mtime !== 'number') {
        return undefined;
    }
    return stat.mtime.toString(29) + stat.size.toString(31);
}
export async function whenProviderRegistered(file, fileService) {
    if (fileService.hasProvider(URI.from({ scheme: file.scheme }))) {
        return;
    }
    return new Promise(resolve => {
        const disposable = fileService.onDidChangeFileSystemProviderRegistrations(e => {
            if (e.scheme === file.scheme && e.added) {
                disposable.dispose();
                resolve();
            }
        });
    });
}
/**
 * Helper to format a raw byte size into a human readable label.
 */
export class ByteSize {
    static { this.KB = 1024; }
    static { this.MB = ByteSize.KB * ByteSize.KB; }
    static { this.GB = ByteSize.MB * ByteSize.KB; }
    static { this.TB = ByteSize.GB * ByteSize.KB; }
    static formatSize(size) {
        if (!isNumber(size)) {
            size = 0;
        }
        if (size < ByteSize.KB) {
            return localize('sizeB', "{0}B", size.toFixed(0));
        }
        if (size < ByteSize.MB) {
            return localize('sizeKB', "{0}KB", (size / ByteSize.KB).toFixed(2));
        }
        if (size < ByteSize.GB) {
            return localize('sizeMB', "{0}MB", (size / ByteSize.MB).toFixed(2));
        }
        if (size < ByteSize.TB) {
            return localize('sizeGB', "{0}GB", (size / ByteSize.GB).toFixed(2));
        }
        return localize('sizeTB', "{0}TB", (size / ByteSize.TB).toFixed(2));
    }
}
export function getLargeFileConfirmationLimit(arg) {
    const isRemote = typeof arg === 'string' || arg?.scheme === Schemas.vscodeRemote;
    const isLocal = typeof arg !== 'string' && arg?.scheme === Schemas.file;
    if (isLocal) {
        // Local almost has no limit in file size
        return 1024 * ByteSize.MB;
    }
    if (isRemote) {
        // With a remote, pick a low limit to avoid
        // potentially costly file transfers
        return 10 * ByteSize.MB;
    }
    if (isWeb) {
        // Web: we cannot know for sure if a cost
        // is associated with the file transfer
        // so we pick a reasonably small limit
        return 50 * ByteSize.MB;
    }
    // Local desktop: almost no limit in file size
    return 1024 * ByteSize.MB;
}
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vZmlsZXMvY29tbW9uL2ZpbGVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBT2hHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUVuRCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUN2RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDekQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ2xELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUMzQyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDOUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3pELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUUxRCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFFcEQsa0NBQWtDO0FBRWxDLE1BQU0sQ0FBQyxNQUFNLFlBQVksR0FBRyxlQUFlLENBQWUsYUFBYSxDQUFDLENBQUM7QUFrV3pFLE1BQU0sVUFBVSx5QkFBeUIsQ0FBQyxPQUF5QjtJQUNsRSxPQUFPLE9BQU8sQ0FBQyxNQUFNLEtBQUssSUFBSSxDQUFDO0FBQ2hDLENBQUM7QUE4Q0QsTUFBTSxDQUFOLElBQVksUUF5Qlg7QUF6QkQsV0FBWSxRQUFRO0lBRW5COztPQUVHO0lBQ0gsNkNBQVcsQ0FBQTtJQUVYOztPQUVHO0lBQ0gsdUNBQVEsQ0FBQTtJQUVSOztPQUVHO0lBQ0gs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