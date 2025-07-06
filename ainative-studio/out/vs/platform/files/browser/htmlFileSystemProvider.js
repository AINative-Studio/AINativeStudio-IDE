/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../nls.js';
import { URI } from '../../../base/common/uri.js';
import { VSBuffer } from '../../../base/common/buffer.js';
import { Emitter, Event } from '../../../base/common/event.js';
import { Disposable, DisposableStore, toDisposable } from '../../../base/common/lifecycle.js';
import { Schemas } from '../../../base/common/network.js';
import { basename, extname, normalize } from '../../../base/common/path.js';
import { isLinux } from '../../../base/common/platform.js';
import { extUri, extUriIgnorePathCase, joinPath } from '../../../base/common/resources.js';
import { newWriteableStream } from '../../../base/common/stream.js';
import { createFileSystemProviderError, FileSystemProviderError, FileSystemProviderErrorCode, FileType } from '../common/files.js';
import { WebFileSystemAccess, WebFileSystemObserver } from './webFileSystemAccess.js';
import { LogLevel } from '../../log/common/log.js';
export class HTMLFileSystemProvider extends Disposable {
    get capabilities() {
        if (!this._capabilities) {
            this._capabilities =
                2 /* FileSystemProviderCapabilities.FileReadWrite */ |
                    16 /* FileSystemProviderCapabilities.FileReadStream */;
            if (isLinux) {
                this._capabilities |= 1024 /* FileSystemProviderCapabilities.PathCaseSensitive */;
            }
        }
        return this._capabilities;
    }
    //#endregion
    constructor(indexedDB, store, logService) {
        super();
        this.indexedDB = indexedDB;
        this.store = store;
        this.logService = logService;
        //#region Events (unsupported)
        this.onDidChangeCapabilities = Event.None;
        //#endregion
        //#region File Capabilities
        this.extUri = isLinux ? extUri : extUriIgnorePathCase;
        //#endregion
        //#region File Watching (unsupported)
        this._onDidChangeFileEmitter = this._register(new Emitter());
        this.onDidChangeFile = this._onDidChangeFileEmitter.event;
        //#endregion
        //#region File/Directoy Handle Registry
        this._files = new Map();
        this._directories = new Map();
    }
    //#region File Metadata Resolving
    async stat(resource) {
        try {
            const handle = await this.getHandle(resource);
            if (!handle) {
                throw this.createFileSystemProviderError(resource, 'No such file or directory, stat', FileSystemProviderErrorCode.FileNotFound);
            }
            if (WebFileSystemAccess.isFileSystemFileHandle(handle)) {
                const file = await handle.getFile();
                return {
                    type: FileType.File,
                    mtime: file.lastModified,
                    ctime: 0,
                    size: file.size
                };
            }
            return {
                type: FileType.Directory,
                mtime: 0,
                ctime: 0,
                size: 0
            };
        }
        catch (error) {
            throw this.toFileSystemProviderError(error);
        }
    }
    async readdir(resource) {
        try {
            const handle = await this.getDirectoryHandle(resource);
            if (!handle) {
                throw this.createFileSystemProviderError(resource, 'No such file or directory, readdir', FileSystemProviderErrorCode.FileNotFound);
            }
            const result = [];
            for await (const [name, child] of handle) {
                result.push([name, WebFileSystemAccess.isFileSystemFileHandle(child) ? FileType.File : FileType.Directory]);
            }
            return result;
        }
        catch (error) {
            throw this.toFileSystemProviderError(error);
        }
    }
    //#endregion
    //#region File Reading/Writing
    readFileStream(resource, opts, token) {
        const stream = newWriteableStream(data => VSBuffer.concat(data.map(data => VSBuffer.wrap(data))).buffer, {
            // Set a highWaterMark to prevent the stream
            // for file upload to produce large buffers
            // in-memory
            highWaterMark: 10
        });
        (async () => {
            try {
                const handle = await this.getFileHandle(resource);
                if (!handle) {
                    throw this.createFileSystemProviderError(resource, 'No such file or directory, readFile', FileSystemProviderErrorCode.FileNotFound);
                }
                const file = await handle.getFile();
                // Partial file: implemented simply via `readFile`
                if (typeof opts.length === 'number' || typeof opts.position === 'number') {
                    let buffer = new Uint8Array(await file.arrayBuffer());
                    if (typeof opts?.position === 'number') {
                        buffer = buffer.slice(opts.position);
                    }
                    if (typeof opts?.length === 'number') {
                        buffer = buffer.slice(0, opts.length);
                    }
                    stream.end(buffer);
                }
                // Entire file
                else {
                    const reader = file.stream().getReader();
                    let res = await reader.read();
                    while (!res.done) {
                        if (token.isCancellationRequested) {
                            break;
                        }
                        // Write buffer into stream but make sure to wait
                        // in case the `highWaterMark` is reached
                        await stream.write(res.value);
                        if (token.isCancellationRequested) {
                            break;
                        }
                        res = await reader.read();
                    }
                    stream.end(undefined);
                }
            }
            catch (error) {
                stream.error(this.toFileSystemProviderError(error));
                stream.end();
            }
        })();
        return stream;
    }
    async readFile(resource) {
        try {
            const handle = await this.getFileHandle(resource);
            if (!handle) {
                throw this.createFileSystemProviderError(resource, 'No such file or directory, readFile', FileSystemProviderErrorCode.FileNotFound);
            }
            const file = await handle.getFile();
            return new Uint8Array(await file.arrayBuffer());
        }
        catch (error) {
            throw this.toFileSystemProviderError(error);
        }
    }
    async writeFile(resource, content, opts) {
        try {
            let handle = await this.getFileHandle(resource);
            // Validate target unless { create: true, overwrite: true }
            if (!opts.create || !opts.overwrite) {
                if (handle) {
                    if (!opts.overwrite) {
                        throw this.createFileSystemProviderError(resource, 'File already exists, writeFile', FileSystemProviderErrorCode.FileExists);
                    }
                }
                else {
                    if (!opts.create) {
                        throw this.createFileSystemProviderError(resource, 'No such file, writeFile', FileSystemProviderErrorCode.FileNotFound);
                    }
                }
            }
            // Create target as needed
            if (!handle) {
                const parent = await this.getDirectoryHandle(this.extUri.dirname(resource));
                if (!parent) {
                    throw this.createFileSystemProviderError(resource, 'No such parent directory, writeFile', FileSystemProviderErrorCode.FileNotFound);
                }
                handle = await parent.getFileHandle(this.extUri.basename(resource), { create: true });
                if (!handle) {
                    throw this.createFileSystemProviderError(resource, 'Unable to create file , writeFile', FileSystemProviderErrorCode.Unknown);
                }
            }
            // Write to target overwriting any existing contents
            const writable = await handle.createWritable();
            await writable.write(content);
            await writable.close();
        }
        catch (error) {
            throw this.toFileSystemProviderError(error);
        }
    }
    //#endregion
    //#region Move/Copy/Delete/Create Folder
    async mkdir(resource) {
        try {
            const parent = await this.getDirectoryHandle(this.extUri.dirname(resource));
            if (!parent) {
                throw this.createFileSystemProviderError(resource, 'No such parent directory, mkdir', FileSystemProviderErrorCode.FileNotFound);
            }
            await parent.getDirectoryHandle(this.extUri.basename(resource), { create: true });
        }
        catch (error) {
            throw this.toFileSystemProviderError(error);
        }
    }
    async delete(resource, opts) {
        try {
            const parent = await this.getDirectoryHandle(this.extUri.dirname(resource));
            if (!parent) {
                throw this.createFileSystemProviderError(resource, 'No such parent directory, delete', FileSystemProviderErrorCode.FileNotFound);
            }
            return parent.removeEntry(this.extUri.basename(resource), { recursive: opts.recursive });
        }
        catch (error) {
            throw this.toFileSystemProviderError(error);
        }
    }
    async rename(from, to, opts) {
        try {
            if (this.extUri.isEqual(from, to)) {
                return; // no-op if the paths are the same
            }
            // Implement file rename by write + delete
            const fileHandle = await this.getFileHandle(from);
            if (fileHandle) {
                const file = await fileHandle.getFile();
                const contents = new Uint8Array(await file.arrayBuffer());
                await this.writeFile(to, contents, { create: true, overwrite: opts.overwrite, unlock: false, atomic: false });
                await this.delete(from, { recursive: false, useTrash: false, atomic: false });
            }
            // File API does not support any real rename otherwise
            else {
                throw this.createFileSystemProviderError(from, localize('fileSystemRenameError', "Rename is only supported for files."), FileSystemProviderErrorCode.Unavailable);
            }
        }
        catch (error) {
            throw this.toFileSystemProviderError(error);
        }
    }
    watch(resource, opts) {
        const disposables = new DisposableStore();
        this.doWatch(resource, opts, disposables).catch(error => this.logService.error(`[File Watcher ('FileSystemObserver')] Error: ${error} (${resource})`));
        return disposables;
    }
    async doWatch(resource, opts, disposables) {
        if (!WebFileSystemObserver.supported(globalThis)) {
            return;
        }
        const handle = await this.getHandle(resource);
        if (!handle || disposables.isDisposed) {
            return;
        }
        const observer = new globalThis.FileSystemObserver((records) => {
            if (disposables.isDisposed) {
                return;
            }
            const events = [];
            for (const record of records) {
                if (this.logService.getLevel() === LogLevel.Trace) {
                    this.logService.trace(`[File Watcher ('FileSystemObserver')] [${record.type}] ${joinPath(resource, ...record.relativePathComponents)}`);
                }
                switch (record.type) {
                    case 'appeared':
                        events.push({ resource: joinPath(resource, ...record.relativePathComponents), type: 1 /* FileChangeType.ADDED */ });
                        break;
                    case 'disappeared':
                        events.push({ resource: joinPath(resource, ...record.relativePathComponents), type: 2 /* FileChangeType.DELETED */ });
                        break;
                    case 'modified':
                        events.push({ resource: joinPath(resource, ...record.relativePathComponents), type: 0 /* FileChangeType.UPDATED */ });
                        break;
                    case 'errored':
                        this.logService.trace(`[File Watcher ('FileSystemObserver')] errored, disposing observer (${resource})`);
                        disposables.dispose();
                }
            }
            if (events.length) {
                this._onDidChangeFileEmitter.fire(events);
            }
        });
        try {
            await observer.observe(handle, opts.recursive ? { recursive: true } : undefined);
        }
        finally {
            if (disposables.isDisposed) {
                observer.disconnect();
            }
            else {
                disposables.add(toDisposable(() => observer.disconnect()));
            }
        }
    }
    registerFileHandle(handle) {
        return this.registerHandle(handle, this._files);
    }
    registerDirectoryHandle(handle) {
        return this.registerHandle(handle, this._directories);
    }
    get directories() {
        return this._directories.values();
    }
    async registerHandle(handle, map) {
        let handleId = `/${handle.name}`;
        // Compute a valid handle ID in case this exists already
        if (map.has(handleId) && !await map.get(handleId)?.isSameEntry(handle)) {
            const fileExt = extname(handle.name);
            const fileName = basename(handle.name, fileExt);
            let handleIdCounter = 1;
            do {
                handleId = `/${fileName}-${handleIdCounter++}${fileExt}`;
            } while (map.has(handleId) && !await map.get(handleId)?.isSameEntry(handle));
        }
        map.set(handleId, handle);
        // Remember in IndexDB for future lookup
        try {
            await this.indexedDB?.runInTransaction(this.store, 'readwrite', objectStore => objectStore.put(handle, handleId));
        }
        catch (error) {
            this.logService.error(error);
        }
        return URI.from({ scheme: Schemas.file, path: handleId });
    }
    async getHandle(resource) {
        // First: try to find a well known handle first
        let handle = await this.doGetHandle(resource);
        // Second: walk up parent directories and resolve handle if possible
        if (!handle) {
            const parent = await this.getDirectoryHandle(this.extUri.dirname(resource));
            if (parent) {
                const name = extUri.basename(resource);
                try {
                    handle = await parent.getFileHandle(name);
                }
                catch (error) {
                    try {
                        handle = await parent.getDirectoryHandle(name);
                    }
                    catch (error) {
                        // Ignore
                    }
                }
            }
        }
        return handle;
    }
    async getFileHandle(resource) {
        const handle = await this.doGetHandle(resource);
        if (handle instanceof FileSystemFileHandle) {
            return handle;
        }
        const parent = await this.getDirectoryHandle(this.extUri.dirname(resource));
        try {
            return await parent?.getFileHandle(extUri.basename(resource));
        }
        catch (error) {
            return undefined; // guard against possible DOMException
        }
    }
    async getDirectoryHandle(resource) {
        const handle = await this.doGetHandle(resource);
        if (handle instanceof FileSystemDirectoryHandle) {
            return handle;
        }
        const parentUri = this.extUri.dirname(resource);
        if (this.extUri.isEqual(parentUri, resource)) {
            return undefined; // return when root is reached to prevent infinite recursion
        }
        const parent = await this.getDirectoryHandle(parentUri);
        try {
            return await parent?.getDirectoryHandle(extUri.basename(resource));
        }
        catch (error) {
            return undefined; // guard against possible DOMException
        }
    }
    async doGetHandle(resource) {
        // We store file system handles with the `handle.name`
        // and as such require the resource to be on the root
        if (this.extUri.dirname(resource).path !== '/') {
            return undefined;
        }
        const handleId = resource.path.replace(/\/$/, ''); // remove potential slash from the end of the path
        // First: check if we have a known handle stored in memory
        const inMemoryHandle = this._files.get(handleId) ?? this._directories.get(handleId);
        if (inMemoryHandle) {
            return inMemoryHandle;
        }
        // Second: check if we have a persisted handle in IndexedDB
        const persistedHandle = await this.indexedDB?.runInTransaction(this.store, 'readonly', store => store.get(handleId));
        if (WebFileSystemAccess.isFileSystemHandle(persistedHandle)) {
            let hasPermissions = await persistedHandle.queryPermission() === 'granted';
            try {
                if (!hasPermissions) {
                    hasPermissions = await persistedHandle.requestPermission() === 'granted';
                }
            }
            catch (error) {
                this.logService.error(error); // this can fail with a DOMException
            }
            if (hasPermissions) {
                if (WebFileSystemAccess.isFileSystemFileHandle(persistedHandle)) {
                    this._files.set(handleId, persistedHandle);
                }
                else if (WebFileSystemAccess.isFileSystemDirectoryHandle(persistedHandle)) {
                    this._directories.set(handleId, persistedHandle);
                }
                return persistedHandle;
            }
        }
        // Third: fail with an error
        throw this.createFileSystemProviderError(resource, 'No file system handle registered', FileSystemProviderErrorCode.Unavailable);
    }
    //#endregion
    toFileSystemProviderError(error) {
        if (error instanceof FileSystemProviderError) {
            return error; // avoid double conversion
        }
        let code = FileSystemProviderErrorCode.Unknown;
        if (error.name === 'NotAllowedError') {
            error = new Error(localize('fileSystemNotAllowedError', "Insufficient permissions. Please retry and allow the operation."));
            code = FileSystemProviderErrorCode.Unavailable;
        }
        return createFileSystemProviderError(error, code);
    }
    createFileSystemProviderError(resource, msg, code) {
        return createFileSystemProviderError(new Error(`${msg} (${normalize(resource.path)})`), code);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaHRtbEZpbGVTeXN0ZW1Qcm92aWRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2ZpbGVzL2Jyb3dzZXIvaHRtbEZpbGVTeXN0ZW1Qcm92aWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDM0MsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ2xELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUUxRCxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQy9ELE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFlLFlBQVksRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzNHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUMxRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUM1RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDM0QsT0FBTyxFQUFFLE1BQU0sRUFBRSxvQkFBb0IsRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUMzRixPQUFPLEVBQUUsa0JBQWtCLEVBQXdCLE1BQU0sZ0NBQWdDLENBQUM7QUFDMUYsT0FBTyxFQUFFLDZCQUE2QixFQUFxRyx1QkFBdUIsRUFBRSwyQkFBMkIsRUFBRSxRQUFRLEVBQXlLLE1BQU0sb0JBQW9CLENBQUM7QUFDN1ksT0FBTyxFQUE0QixtQkFBbUIsRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBRWhILE9BQU8sRUFBZSxRQUFRLEVBQUUs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