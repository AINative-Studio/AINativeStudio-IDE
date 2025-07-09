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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaHRtbEZpbGVTeXN0ZW1Qcm92aWRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9maWxlcy9icm93c2VyL2h0bWxGaWxlU3lzdGVtUHJvdmlkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQzNDLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUNsRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFFMUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUMvRCxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBZSxZQUFZLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUMzRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDMUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDNUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxNQUFNLEVBQUUsb0JBQW9CLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDM0YsT0FBTyxFQUFFLGtCQUFrQixFQUF3QixNQUFNLGdDQUFnQyxDQUFDO0FBQzFGLE9BQU8sRUFBRSw2QkFBNkIsRUFBcUcsdUJBQXVCLEVBQUUsMkJBQTJCLEVBQUUsUUFBUSxFQUF5SyxNQUFNLG9CQUFvQixDQUFDO0FBQzdZLE9BQU8sRUFBNEIsbUJBQW1CLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUVoSCxPQUFPLEVBQWUsUUFBUSxFQUFF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