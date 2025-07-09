/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Throttler } from '../../../base/common/async.js';
import { VSBuffer } from '../../../base/common/buffer.js';
import { Emitter, Event } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { ExtUri } from '../../../base/common/resources.js';
import { isString } from '../../../base/common/types.js';
import { URI } from '../../../base/common/uri.js';
import { localize } from '../../../nls.js';
import { createFileSystemProviderError, FileSystemProviderErrorCode, FileType } from '../common/files.js';
import { BroadcastDataChannel } from '../../../base/browser/broadcast.js';
// Standard FS Errors (expected to be thrown in production when invalid FS operations are requested)
const ERR_FILE_NOT_FOUND = createFileSystemProviderError(localize('fileNotExists', "File does not exist"), FileSystemProviderErrorCode.FileNotFound);
const ERR_FILE_IS_DIR = createFileSystemProviderError(localize('fileIsDirectory', "File is Directory"), FileSystemProviderErrorCode.FileIsADirectory);
const ERR_FILE_NOT_DIR = createFileSystemProviderError(localize('fileNotDirectory', "File is not a directory"), FileSystemProviderErrorCode.FileNotADirectory);
const ERR_DIR_NOT_EMPTY = createFileSystemProviderError(localize('dirIsNotEmpty', "Directory is not empty"), FileSystemProviderErrorCode.Unknown);
const ERR_FILE_EXCEEDS_STORAGE_QUOTA = createFileSystemProviderError(localize('fileExceedsStorageQuota', "File exceeds available storage quota"), FileSystemProviderErrorCode.FileExceedsStorageQuota);
// Arbitrary Internal Errors
const ERR_UNKNOWN_INTERNAL = (message) => createFileSystemProviderError(localize('internal', "Internal error occurred in IndexedDB File System Provider. ({0})", message), FileSystemProviderErrorCode.Unknown);
class IndexedDBFileSystemNode {
    constructor(entry) {
        this.entry = entry;
        this.type = entry.type;
    }
    read(path) {
        return this.doRead(path.split('/').filter(p => p.length));
    }
    doRead(pathParts) {
        if (pathParts.length === 0) {
            return this.entry;
        }
        if (this.entry.type !== FileType.Directory) {
            throw ERR_UNKNOWN_INTERNAL('Internal error reading from IndexedDBFSNode -- expected directory at ' + this.entry.path);
        }
        const next = this.entry.children.get(pathParts[0]);
        if (!next) {
            return undefined;
        }
        return next.doRead(pathParts.slice(1));
    }
    delete(path) {
        const toDelete = path.split('/').filter(p => p.length);
        if (toDelete.length === 0) {
            if (this.entry.type !== FileType.Directory) {
                throw ERR_UNKNOWN_INTERNAL(`Internal error deleting from IndexedDBFSNode. Expected root entry to be directory`);
            }
            this.entry.children.clear();
        }
        else {
            return this.doDelete(toDelete, path);
        }
    }
    doDelete(pathParts, originalPath) {
        if (pathParts.length === 0) {
            throw ERR_UNKNOWN_INTERNAL(`Internal error deleting from IndexedDBFSNode -- got no deletion path parts (encountered while deleting ${originalPath})`);
        }
        else if (this.entry.type !== FileType.Directory) {
            throw ERR_UNKNOWN_INTERNAL('Internal error deleting from IndexedDBFSNode -- expected directory at ' + this.entry.path);
        }
        else if (pathParts.length === 1) {
            this.entry.children.delete(pathParts[0]);
        }
        else {
            const next = this.entry.children.get(pathParts[0]);
            if (!next) {
                throw ERR_UNKNOWN_INTERNAL('Internal error deleting from IndexedDBFSNode -- expected entry at ' + this.entry.path + '/' + next);
            }
            next.doDelete(pathParts.slice(1), originalPath);
        }
    }
    add(path, entry) {
        this.doAdd(path.split('/').filter(p => p.length), entry, path);
    }
    doAdd(pathParts, entry, originalPath) {
        if (pathParts.length === 0) {
            throw ERR_UNKNOWN_INTERNAL(`Internal error creating IndexedDBFSNode -- adding empty path (encountered while adding ${originalPath})`);
        }
        else if (this.entry.type !== FileType.Directory) {
            throw ERR_UNKNOWN_INTERNAL(`Internal error creating IndexedDBFSNode -- parent is not a directory (encountered while adding ${originalPath})`);
        }
        else if (pathParts.length === 1) {
            const next = pathParts[0];
            const existing = this.entry.children.get(next);
            if (entry.type === 'dir') {
                if (existing?.entry.type === FileType.File) {
                    throw ERR_UNKNOWN_INTERNAL(`Internal error creating IndexedDBFSNode -- overwriting file with directory: ${this.entry.path}/${next} (encountered while adding ${originalPath})`);
                }
                this.entry.children.set(next, existing ?? new IndexedDBFileSystemNode({
                    type: FileType.Directory,
                    path: this.entry.path + '/' + next,
                    children: new Map(),
                }));
            }
            else {
                if (existing?.entry.type === FileType.Directory) {
                    throw ERR_UNKNOWN_INTERNAL(`Internal error creating IndexedDBFSNode -- overwriting directory with file: ${this.entry.path}/${next} (encountered while adding ${originalPath})`);
                }
                this.entry.children.set(next, new IndexedDBFileSystemNode({
                    type: FileType.File,
                    path: this.entry.path + '/' + next,
                    size: entry.size,
                }));
            }
        }
        else if (pathParts.length > 1) {
            const next = pathParts[0];
            let childNode = this.entry.children.get(next);
            if (!childNode) {
                childNode = new IndexedDBFileSystemNode({
                    children: new Map(),
                    path: this.entry.path + '/' + next,
                    type: FileType.Directory
                });
                this.entry.children.set(next, childNode);
            }
            else if (childNode.type === FileType.File) {
                throw ERR_UNKNOWN_INTERNAL(`Internal error creating IndexedDBFSNode -- overwriting file entry with directory: ${this.entry.path}/${next} (encountered while adding ${originalPath})`);
            }
            childNode.doAdd(pathParts.slice(1), entry, originalPath);
        }
    }
    print(indentation = '') {
        console.log(indentation + this.entry.path);
        if (this.entry.type === FileType.Directory) {
            this.entry.children.forEach(child => child.print(indentation + ' '));
        }
    }
}
export class IndexedDBFileSystemProvider extends Disposable {
    constructor(scheme, indexedDB, store, watchCrossWindowChanges) {
        super();
        this.scheme = scheme;
        this.indexedDB = indexedDB;
        this.store = store;
        this.capabilities = 2 /* FileSystemProviderCapabilities.FileReadWrite */
            | 1024 /* FileSystemProviderCapabilities.PathCaseSensitive */;
        this.onDidChangeCapabilities = Event.None;
        this.extUri = new ExtUri(() => false) /* Case Sensitive */;
        this._onDidChangeFile = this._register(new Emitter());
        this.onDidChangeFile = this._onDidChangeFile.event;
        this.mtimes = new Map();
        this.fileWriteBatch = [];
        this.writeManyThrottler = new Throttler();
        if (watchCrossWindowChanges) {
            this.changesBroadcastChannel = this._register(new BroadcastDataChannel(`vscode.indexedDB.${scheme}.changes`));
            this._register(this.changesBroadcastChannel.onDidReceiveData(changes => {
                this._onDidChangeFile.fire(changes.map(c => ({ type: c.type, resource: URI.revive(c.resource) })));
            }));
        }
    }
    watch(resource, opts) {
        return Disposable.None;
    }
    async mkdir(resource) {
        try {
            const resourceStat = await this.stat(resource);
            if (resourceStat.type === FileType.File) {
                throw ERR_FILE_NOT_DIR;
            }
        }
        catch (error) { /* Ignore */ }
        (await this.getFiletree()).add(resource.path, { type: 'dir' });
    }
    async stat(resource) {
        const entry = (await this.getFiletree()).read(resource.path);
        if (entry?.type === FileType.File) {
            return {
                type: FileType.File,
                ctime: 0,
                mtime: this.mtimes.get(resource.toString()) || 0,
                size: entry.size ?? (await this.readFile(resource)).byteLength
            };
        }
        if (entry?.type === FileType.Directory) {
            return {
                type: FileType.Directory,
                ctime: 0,
                mtime: 0,
                size: 0
            };
        }
        throw ERR_FILE_NOT_FOUND;
    }
    async readdir(resource) {
        try {
            const entry = (await this.getFiletree()).read(resource.path);
            if (!entry) {
                // Dirs aren't saved to disk, so empty dirs will be lost on reload.
                // Thus we have two options for what happens when you try to read a dir and nothing is found:
                // - Throw FileSystemProviderErrorCode.FileNotFound
                // - Return []
                // We choose to return [] as creating a dir then reading it (even after reload) should not throw an error.
                return [];
            }
            if (entry.type !== FileType.Directory) {
                throw ERR_FILE_NOT_DIR;
            }
            else {
                return [...entry.children.entries()].map(([name, node]) => [name, node.type]);
            }
        }
        catch (error) {
            throw error;
        }
    }
    async readFile(resource) {
        try {
            const result = await this.indexedDB.runInTransaction(this.store, 'readonly', objectStore => objectStore.get(resource.path));
            if (result === undefined) {
                throw ERR_FILE_NOT_FOUND;
            }
            const buffer = result instanceof Uint8Array ? result : isString(result) ? VSBuffer.fromString(result).buffer : undefined;
            if (buffer === undefined) {
                throw ERR_UNKNOWN_INTERNAL(`IndexedDB entry at "${resource.path}" in unexpected format`);
            }
            // update cache
            const fileTree = await this.getFiletree();
            fileTree.add(resource.path, { type: 'file', size: buffer.byteLength });
            return buffer;
        }
        catch (error) {
            throw error;
        }
    }
    async writeFile(resource, content, opts) {
        try {
            const existing = await this.stat(resource).catch(() => undefined);
            if (existing?.type === FileType.Directory) {
                throw ERR_FILE_IS_DIR;
            }
            await this.bulkWrite([[resource, content]]);
        }
        catch (error) {
            throw error;
        }
    }
    async rename(from, to, opts) {
        const fileTree = await this.getFiletree();
        const fromEntry = fileTree.read(from.path);
        if (!fromEntry) {
            throw ERR_FILE_NOT_FOUND;
        }
        const toEntry = fileTree.read(to.path);
        if (toEntry) {
            if (!opts.overwrite) {
                throw createFileSystemProviderError('file exists already', FileSystemProviderErrorCode.FileExists);
            }
            if (toEntry.type !== fromEntry.type) {
                throw createFileSystemProviderError('Cannot rename files with different types', FileSystemProviderErrorCode.Unknown);
            }
            // delete the target file if exists
            await this.delete(to, { recursive: true, useTrash: false, atomic: false });
        }
        const toTargetResource = (path) => this.extUri.joinPath(to, this.extUri.relativePath(from, from.with({ path })) || '');
        const sourceEntries = await this.tree(from);
        const sourceFiles = [];
        for (const sourceEntry of sourceEntries) {
            if (sourceEntry[1] === FileType.File) {
                sourceFiles.push(sourceEntry);
            }
            else if (sourceEntry[1] === FileType.Directory) {
                // add directories to the tree
                fileTree.add(toTargetResource(sourceEntry[0]).path, { type: 'dir' });
            }
        }
        if (sourceFiles.length) {
            const targetFiles = [];
            const sourceFilesContents = await this.indexedDB.runInTransaction(this.store, 'readonly', objectStore => sourceFiles.map(([path]) => objectStore.get(path)));
            for (let index = 0; index < sourceFiles.length; index++) {
                const content = sourceFilesContents[index] instanceof Uint8Array ? sourceFilesContents[index] : isString(sourceFilesContents[index]) ? VSBuffer.fromString(sourceFilesContents[index]).buffer : undefined;
                if (content) {
                    targetFiles.push([toTargetResource(sourceFiles[index][0]), content]);
                }
            }
            await this.bulkWrite(targetFiles);
        }
        await this.delete(from, { recursive: true, useTrash: false, atomic: false });
    }
    async delete(resource, opts) {
        let stat;
        try {
            stat = await this.stat(resource);
        }
        catch (e) {
            if (e.code === FileSystemProviderErrorCode.FileNotFound) {
                return;
            }
            throw e;
        }
        let toDelete;
        if (opts.recursive) {
            const tree = await this.tree(resource);
            toDelete = tree.map(([path]) => path);
        }
        else {
            if (stat.type === FileType.Directory && (await this.readdir(resource)).length) {
                throw ERR_DIR_NOT_EMPTY;
            }
            toDelete = [resource.path];
        }
        await this.deleteKeys(toDelete);
        (await this.getFiletree()).delete(resource.path);
        toDelete.forEach(key => this.mtimes.delete(key));
        this.triggerChanges(toDelete.map(path => ({ resource: resource.with({ path }), type: 2 /* FileChangeType.DELETED */ })));
    }
    async tree(resource) {
        const stat = await this.stat(resource);
        const allEntries = [[resource.path, stat.type]];
        if (stat.type === FileType.Directory) {
            const dirEntries = await this.readdir(resource);
            for (const [key, type] of dirEntries) {
                const childResource = this.extUri.joinPath(resource, key);
                allEntries.push([childResource.path, type]);
                if (type === FileType.Directory) {
                    const childEntries = await this.tree(childResource);
                    allEntries.push(...childEntries);
                }
            }
        }
        return allEntries;
    }
    triggerChanges(changes) {
        if (changes.length) {
            this._onDidChangeFile.fire(changes);
            this.changesBroadcastChannel?.postData(changes);
        }
    }
    getFiletree() {
        if (!this.cachedFiletree) {
            this.cachedFiletree = (async () => {
                const rootNode = new IndexedDBFileSystemNode({
                    children: new Map(),
                    path: '',
                    type: FileType.Directory
                });
                const result = await this.indexedDB.runInTransaction(this.store, 'readonly', objectStore => objectStore.getAllKeys());
                const keys = result.map(key => key.toString());
                keys.forEach(key => rootNode.add(key, { type: 'file' }));
                return rootNode;
            })();
        }
        return this.cachedFiletree;
    }
    async bulkWrite(files) {
        files.forEach(([resource, content]) => this.fileWriteBatch.push({ content, resource }));
        await this.writeManyThrottler.queue(() => this.writeMany());
        const fileTree = await this.getFiletree();
        for (const [resource, content] of files) {
            fileTree.add(resource.path, { type: 'file', size: content.byteLength });
            this.mtimes.set(resource.toString(), Date.now());
        }
        this.triggerChanges(files.map(([resource]) => ({ resource, type: 0 /* FileChangeType.UPDATED */ })));
    }
    async writeMany() {
        if (this.fileWriteBatch.length) {
            const fileBatch = this.fileWriteBatch.splice(0, this.fileWriteBatch.length);
            try {
                await this.indexedDB.runInTransaction(this.store, 'readwrite', objectStore => fileBatch.map(entry => {
                    return objectStore.put(entry.content, entry.resource.path);
                }));
            }
            catch (ex) {
                if (ex instanceof DOMException && ex.name === 'QuotaExceededError') {
                    throw ERR_FILE_EXCEEDS_STORAGE_QUOTA;
                }
                throw ex;
            }
        }
    }
    async deleteKeys(keys) {
        if (keys.length) {
            await this.indexedDB.runInTransaction(this.store, 'readwrite', objectStore => keys.map(key => objectStore.delete(key)));
        }
    }
    async reset() {
        await this.indexedDB.runInTransaction(this.store, 'readwrite', objectStore => objectStore.clear());
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXhlZERCRmlsZVN5c3RlbVByb3ZpZGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2ZpbGVzL2Jyb3dzZXIvaW5kZXhlZERCRmlsZVN5c3RlbVByb3ZpZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUMxRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDMUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUMvRCxPQUFPLEVBQUUsVUFBVSxFQUFlLE1BQU0sbUNBQW1DLENBQUM7QUFDNUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUN6RCxPQUFPLEVBQUUsR0FBRyxFQUFVLE1BQU0sNkJBQTZCLENBQUM7QUFDMUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQzNDLE9BQU8sRUFBRSw2QkFBNkIsRUFBNkYsMkJBQTJCLEVBQUUsUUFBUSxFQUF3RyxNQUFNLG9CQUFvQixDQUFDO0FBRTNTLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBRTFFLG9HQUFvRztBQUNwRyxNQUFNLGtCQUFrQixHQUFHLDZCQUE2QixDQUFDLFFBQVEsQ0FBQyxlQUFlLEVBQUUscUJBQXFCLENBQUMsRUFBRSwyQkFBMkIsQ0FBQyxZQUFZLENBQUMsQ0FBQztBQUNySixNQUFNLGVBQWUsR0FBRyw2QkFBNkIsQ0FBQyxRQUFRLENBQUMsaUJBQWlCLEVBQUUsbUJBQW1CLENBQUMsRUFBRSwyQkFBMkIs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