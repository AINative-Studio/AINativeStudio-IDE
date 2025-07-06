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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXhlZERCRmlsZVN5c3RlbVByb3ZpZGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vZmlsZXMvYnJvd3Nlci9pbmRleGVkREJGaWxlU3lzdGVtUHJvdmlkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQzFELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUMxRCxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQy9ELE9BQU8sRUFBRSxVQUFVLEVBQWUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM1RSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDM0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3pELE9BQU8sRUFBRSxHQUFHLEVBQVUsTUFBTSw2QkFBNkIsQ0FBQztBQUMxRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDM0MsT0FBTyxFQUFFLDZCQUE2QixFQUE2RiwyQkFBMkIsRUFBRSxRQUFRLEVBQXdHLE1BQU0sb0JBQW9CLENBQUM7QUFFM1MsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFFMUUsb0dBQW9HO0FBQ3BHLE1BQU0sa0JBQWtCLEdBQUcsNkJBQTZCLENBQUMsUUFBUSxDQUFDLGVBQWUsRUFBRSxxQkFBcUIsQ0FBQyxFQUFFLDJCQUEyQixDQUFDLFlBQVksQ0FBQyxDQUFDO0FBQ3JKLE1BQU0sZUFBZSxHQUFHLDZCQUE2QixDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsRUFBRSxtQkFBbUIsQ0FBQyxFQUFFLDJCQUEyQixD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