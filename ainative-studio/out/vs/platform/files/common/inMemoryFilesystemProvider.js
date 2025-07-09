/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { VSBuffer } from '../../../base/common/buffer.js';
import { Emitter } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import * as resources from '../../../base/common/resources.js';
import { newWriteableStream } from '../../../base/common/stream.js';
import { FileSystemProviderErrorCode, FileType, createFileSystemProviderError } from './files.js';
class File {
    constructor(name) {
        this.type = FileType.File;
        this.ctime = Date.now();
        this.mtime = Date.now();
        this.size = 0;
        this.name = name;
    }
}
class Directory {
    constructor(name) {
        this.type = FileType.Directory;
        this.ctime = Date.now();
        this.mtime = Date.now();
        this.size = 0;
        this.name = name;
        this.entries = new Map();
    }
}
export class InMemoryFileSystemProvider extends Disposable {
    constructor() {
        super(...arguments);
        this.memoryFdCounter = 0;
        this.fdMemory = new Map();
        this._onDidChangeCapabilities = this._register(new Emitter());
        this.onDidChangeCapabilities = this._onDidChangeCapabilities.event;
        this._capabilities = 2 /* FileSystemProviderCapabilities.FileReadWrite */ | 1024 /* FileSystemProviderCapabilities.PathCaseSensitive */;
        this.root = new Directory('');
        // --- manage file events
        this._onDidChangeFile = this._register(new Emitter());
        this.onDidChangeFile = this._onDidChangeFile.event;
        this._bufferedChanges = [];
    }
    get capabilities() { return this._capabilities; }
    setReadOnly(readonly) {
        const isReadonly = !!(this._capabilities & 2048 /* FileSystemProviderCapabilities.Readonly */);
        if (readonly !== isReadonly) {
            this._capabilities = readonly ? 2048 /* FileSystemProviderCapabilities.Readonly */ | 1024 /* FileSystemProviderCapabilities.PathCaseSensitive */ | 2 /* FileSystemProviderCapabilities.FileReadWrite */
                : 2 /* FileSystemProviderCapabilities.FileReadWrite */ | 1024 /* FileSystemProviderCapabilities.PathCaseSensitive */;
            this._onDidChangeCapabilities.fire();
        }
    }
    // --- manage file metadata
    async stat(resource) {
        return this._lookup(resource, false);
    }
    async readdir(resource) {
        const entry = this._lookupAsDirectory(resource, false);
        const result = [];
        entry.entries.forEach((child, name) => result.push([name, child.type]));
        return result;
    }
    // --- manage file contents
    async readFile(resource) {
        const data = this._lookupAsFile(resource, false).data;
        if (data) {
            return data;
        }
        throw createFileSystemProviderError('file not found', FileSystemProviderErrorCode.FileNotFound);
    }
    readFileStream(resource) {
        const data = this._lookupAsFile(resource, false).data;
        const stream = newWriteableStream(data => VSBuffer.concat(data.map(data => VSBuffer.wrap(data))).buffer);
        stream.end(data);
        return stream;
    }
    async writeFile(resource, content, opts) {
        const basename = resources.basename(resource);
        const parent = this._lookupParentDirectory(resource);
        let entry = parent.entries.get(basename);
        if (entry instanceof Directory) {
            throw createFileSystemProviderError('file is directory', FileSystemProviderErrorCode.FileIsADirectory);
        }
        if (!entry && !opts.create) {
            throw createFileSystemProviderError('file not found', FileSystemProviderErrorCode.FileNotFound);
        }
        if (entry && opts.create && !opts.overwrite) {
            throw createFileSystemProviderError('file exists already', FileSystemProviderErrorCode.FileExists);
        }
        if (!entry) {
            entry = new File(basename);
            parent.entries.set(basename, entry);
            this._fireSoon({ type: 1 /* FileChangeType.ADDED */, resource });
        }
        entry.mtime = Date.now();
        entry.size = content.byteLength;
        entry.data = content;
        this._fireSoon({ type: 0 /* FileChangeType.UPDATED */, resource });
    }
    // file open/read/write/close
    open(resource, opts) {
        const data = this._lookupAsFile(resource, false).data;
        if (data) {
            const fd = this.memoryFdCounter++;
            this.fdMemory.set(fd, data);
            return Promise.resolve(fd);
        }
        throw createFileSystemProviderError('file not found', FileSystemProviderErrorCode.FileNotFound);
    }
    close(fd) {
        this.fdMemory.delete(fd);
        return Promise.resolve();
    }
    read(fd, pos, data, offset, length) {
        const memory = this.fdMemory.get(fd);
        if (!memory) {
            throw createFileSystemProviderError(`No file with that descriptor open`, FileSystemProviderErrorCode.Unavailable);
        }
        const toWrite = VSBuffer.wrap(memory).slice(pos, pos + length);
        data.set(toWrite.buffer, offset);
        return Promise.resolve(toWrite.byteLength);
    }
    write(fd, pos, data, offset, length) {
        const memory = this.fdMemory.get(fd);
        if (!memory) {
            throw createFileSystemProviderError(`No file with that descriptor open`, FileSystemProviderErrorCode.Unavailable);
        }
        const toWrite = VSBuffer.wrap(data).slice(offset, offset + length);
        memory.set(toWrite.buffer, pos);
        return Promise.resolve(toWrite.byteLength);
    }
    // --- manage files/folders
    async rename(from, to, opts) {
        if (!opts.overwrite && this._lookup(to, true)) {
            throw createFileSystemProviderError('file exists already', FileSystemProviderErrorCode.FileExists);
        }
        const entry = this._lookup(from, false);
        const oldParent = this._lookupParentDirectory(from);
        const newParent = this._lookupParentDirectory(to);
        const newName = resources.basename(to);
        oldParent.entries.delete(entry.name);
        entry.name = newName;
        newParent.entries.set(newName, entry);
        this._fireSoon({ type: 2 /* FileChangeType.DELETED */, resource: from }, { type: 1 /* FileChangeType.ADDED */, resource: to });
    }
    async delete(resource, opts) {
        const dirname = resources.dirname(resource);
        const basename = resources.basename(resource);
        const parent = this._lookupAsDirectory(dirname, false);
        if (parent.entries.has(basename)) {
            parent.entries.delete(basename);
            parent.mtime = Date.now();
            parent.size -= 1;
            this._fireSoon({ type: 0 /* FileChangeType.UPDATED */, resource: dirname }, { resource, type: 2 /* FileChangeType.DELETED */ });
        }
    }
    async mkdir(resource) {
        if (this._lookup(resource, true)) {
            throw createFileSystemProviderError('file exists already', FileSystemProviderErrorCode.FileExists);
        }
        const basename = resources.basename(resource);
        const dirname = resources.dirname(resource);
        const parent = this._lookupAsDirectory(dirname, false);
        const entry = new Directory(basename);
        parent.entries.set(entry.name, entry);
        parent.mtime = Date.now();
        parent.size += 1;
        this._fireSoon({ type: 0 /* FileChangeType.UPDATED */, resource: dirname }, { type: 1 /* FileChangeType.ADDED */, resource });
    }
    _lookup(uri, silent) {
        const parts = uri.path.split('/');
        let entry = this.root;
        for (const part of parts) {
            if (!part) {
                continue;
            }
            let child;
            if (entry instanceof Directory) {
                child = entry.entries.get(part);
            }
            if (!child) {
                if (!silent) {
                    throw createFileSystemProviderError('file not found', FileSystemProviderErrorCode.FileNotFound);
                }
                else {
                    return undefined;
                }
            }
            entry = child;
        }
        return entry;
    }
    _lookupAsDirectory(uri, silent) {
        const entry = this._lookup(uri, silent);
        if (entry instanceof Directory) {
            return entry;
        }
        throw createFileSystemProviderError('file not a directory', FileSystemProviderErrorCode.FileNotADirectory);
    }
    _lookupAsFile(uri, silent) {
        const entry = this._lookup(uri, silent);
        if (entry instanceof File) {
            return entry;
        }
        throw createFileSystemProviderError('file is a directory', FileSystemProviderErrorCode.FileIsADirectory);
    }
    _lookupParentDirectory(uri) {
        const dirname = resources.dirname(uri);
        return this._lookupAsDirectory(dirname, false);
    }
    watch(resource, opts) {
        // ignore, fires for all changes...
        return Disposable.None;
    }
    _fireSoon(...changes) {
        this._bufferedChanges.push(...changes);
        if (this._fireSoonHandle) {
            clearTimeout(this._fireSoonHandle);
        }
        this._fireSoonHandle = setTimeout(() => {
            this._onDidChangeFile.fire(this._bufferedChanges);
            this._bufferedChanges.length = 0;
        }, 5);
    }
    dispose() {
        super.dispose();
        this.fdMemory.clear();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5NZW1vcnlGaWxlc3lzdGVtUHJvdmlkZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vZmlsZXMvY29tbW9uL2luTWVtb3J5RmlsZXN5c3RlbVByb3ZpZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUMxRCxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sK0JBQStCLENBQUM7QUFDL0QsT0FBTyxFQUFFLFVBQVUsRUFBZSxNQUFNLG1DQUFtQyxDQUFDO0FBQzVFLE9BQU8sS0FBSyxTQUFTLE1BQU0sbUNBQW1DLENBQUM7QUFDL0QsT0FBTyxFQUF3QixrQkFBa0IsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBRTFGLE9BQU8sRUFBNkYsMkJBQTJCLEVBQUUsUUFBUSxFQUF3Ryw2QkFBNkIsRUFBZ1IsTUFBTSxZQUFZLENBQUM7QUFFampCLE1BQU0sSUFBSTtJQVVULFlBQVksSUFBWTtRQUN2QixJQUFJLENBQUMsSUFBSSxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUM7UUFDMUIsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDeEIsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDeEIsSUFBSSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUM7UUFDZCxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztJQUNsQixDQUFDO0NBQ0Q7QUFFRCxNQUFNLFNBQVM7SUFVZCxZQUFZLElBQVk7UUFDdkIsSUFBSSxDQUFDLElBQUksR0FBRyxRQUFRLENBQUMsU0FBUyxDQUFDO1FBQy9CLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLEdB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