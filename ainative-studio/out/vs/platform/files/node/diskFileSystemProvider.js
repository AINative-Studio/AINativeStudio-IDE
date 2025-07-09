/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { promises } from 'fs';
import { Barrier, retry } from '../../../base/common/async.js';
import { ResourceMap } from '../../../base/common/map.js';
import { VSBuffer } from '../../../base/common/buffer.js';
import { Event } from '../../../base/common/event.js';
import { isEqual } from '../../../base/common/extpath.js';
import { DisposableStore, toDisposable } from '../../../base/common/lifecycle.js';
import { basename, dirname, join } from '../../../base/common/path.js';
import { isLinux, isWindows } from '../../../base/common/platform.js';
import { extUriBiasedIgnorePathCase, joinPath, basename as resourcesBasename, dirname as resourcesDirname } from '../../../base/common/resources.js';
import { newWriteableStream } from '../../../base/common/stream.js';
import { Promises, RimRafMode, SymlinkSupport } from '../../../base/node/pfs.js';
import { localize } from '../../../nls.js';
import { createFileSystemProviderError, FileSystemProviderError, FileSystemProviderErrorCode, FileType, isFileOpenForWriteOptions, FilePermission } from '../common/files.js';
import { readFileIntoStream } from '../common/io.js';
import { AbstractDiskFileSystemProvider } from '../common/diskFileSystemProvider.js';
import { UniversalWatcherClient } from './watcher/watcherClient.js';
import { NodeJSWatcherClient } from './watcher/nodejs/nodejsClient.js';
export class DiskFileSystemProvider extends AbstractDiskFileSystemProvider {
    static { this.TRACE_LOG_RESOURCE_LOCKS = false; } // not enabled by default because very spammy
    constructor(logService, options) {
        super(logService, options);
        //#region File Capabilities
        this.onDidChangeCapabilities = Event.None;
        //#endregion
        //#region File Reading/Writing
        this.resourceLocks = new ResourceMap(resource => extUriBiasedIgnorePathCase.getComparisonKey(resource));
        this.mapHandleToPos = new Map();
        this.mapHandleToLock = new Map();
        this.writeHandles = new Map();
    }
    get capabilities() {
        if (!this._capabilities) {
            this._capabilities =
                2 /* FileSystemProviderCapabilities.FileReadWrite */ |
                    4 /* FileSystemProviderCapabilities.FileOpenReadWriteClose */ |
                    16 /* FileSystemProviderCapabilities.FileReadStream */ |
                    8 /* FileSystemProviderCapabilities.FileFolderCopy */ |
                    8192 /* FileSystemProviderCapabilities.FileWriteUnlock */ |
                    16384 /* FileSystemProviderCapabilities.FileAtomicRead */ |
                    32768 /* FileSystemProviderCapabilities.FileAtomicWrite */ |
                    65536 /* FileSystemProviderCapabilities.FileAtomicDelete */ |
                    131072 /* FileSystemProviderCapabilities.FileClone */;
            if (isLinux) {
                this._capabilities |= 1024 /* FileSystemProviderCapabilities.PathCaseSensitive */;
            }
        }
        return this._capabilities;
    }
    //#endregion
    //#region File Metadata Resolving
    async stat(resource) {
        try {
            const { stat, symbolicLink } = await SymlinkSupport.stat(this.toFilePath(resource)); // cannot use fs.stat() here to support links properly
            return {
                type: this.toType(stat, symbolicLink),
                ctime: stat.birthtime.getTime(), // intentionally not using ctime here, we want the creation time
                mtime: stat.mtime.getTime(),
                size: stat.size,
                permissions: (stat.mode & 0o200) === 0 ? FilePermission.Locked : undefined
            };
        }
        catch (error) {
            throw this.toFileSystemProviderError(error);
        }
    }
    async statIgnoreError(resource) {
        try {
            return await this.stat(resource);
        }
        catch (error) {
            return undefined;
        }
    }
    async readdir(resource) {
        try {
            const children = await Promises.readdir(this.toFilePath(resource), { withFileTypes: true });
            const result = [];
            await Promise.all(children.map(async (child) => {
                try {
                    let type;
                    if (child.isSymbolicLink()) {
                        type = (await this.stat(joinPath(resource, child.name))).type; // always resolve target the link points to if any
                    }
                    else {
                        type = this.toType(child);
                    }
                    result.push([child.name, type]);
                }
                catch (error) {
                    this.logService.trace(error); // ignore errors for individual entries that can arise from permission denied
                }
            }));
            return result;
        }
        catch (error) {
            throw this.toFileSystemProviderError(error);
        }
    }
    toType(entry, symbolicLink) {
        // Signal file type by checking for file / directory, except:
        // - symbolic links pointing to nonexistent files are FileType.Unknown
        // - files that are neither file nor directory are FileType.Unknown
        let type;
        if (symbolicLink?.dangling) {
            type = FileType.Unknown;
        }
        else if (entry.isFile()) {
            type = FileType.File;
        }
        else if (entry.isDirectory()) {
            type = FileType.Directory;
        }
        else {
            type = FileType.Unknown;
        }
        // Always signal symbolic link as file type additionally
        if (symbolicLink) {
            type |= FileType.SymbolicLink;
        }
        return type;
    }
    async createResourceLock(resource) {
        const filePath = this.toFilePath(resource);
        this.traceLock(`[Disk FileSystemProvider]: createResourceLock() - request to acquire resource lock (${filePath})`);
        // Await pending locks for resource. It is possible for a new lock being
        // added right after opening, so we have to loop over locks until no lock
        // remains.
        let existingLock = undefined;
        while (existingLock = this.resourceLocks.get(resource)) {
            this.traceLock(`[Disk FileSystemProvider]: createResourceLock() - waiting for resource lock to be released (${filePath})`);
            await existingLock.wait();
        }
        // Store new
        const newLock = new Barrier();
        this.resourceLocks.set(resource, newLock);
        this.traceLock(`[Disk FileSystemProvider]: createResourceLock() - new resource lock created (${filePath})`);
        return toDisposable(() => {
            this.traceLock(`[Disk FileSystemProvider]: createResourceLock() - resource lock dispose() (${filePath})`);
            // Delete lock if it is still ours
            if (this.resourceLocks.get(resource) === newLock) {
                this.traceLock(`[Disk FileSystemProvider]: createResourceLock() - resource lock removed from resource-lock map (${filePath})`);
                this.resourceLocks.delete(resource);
            }
            // Open lock
            this.traceLock(`[Disk FileSystemProvider]: createResourceLock() - resource lock barrier open() (${filePath})`);
            newLock.open();
        });
    }
    async readFile(resource, options) {
        let lock = undefined;
        try {
            if (options?.atomic) {
                this.traceLock(`[Disk FileSystemProvider]: atomic read operation started (${this.toFilePath(resource)})`);
                // When the read should be atomic, make sure
                // to await any pending locks for the resource
                // and lock for the duration of the read.
                lock = await this.createResourceLock(resource);
            }
            const filePath = this.toFilePath(resource);
            return await promises.readFile(filePath);
        }
        catch (error) {
            throw this.toFileSystemProviderError(error);
        }
        finally {
            lock?.dispose();
        }
    }
    traceLock(msg) {
        if (DiskFileSystemProvider.TRACE_LOG_RESOURCE_LOCKS) {
            this.logService.trace(msg);
        }
    }
    readFileStream(resource, opts, token) {
        const stream = newWriteableStream(data => VSBuffer.concat(data.map(data => VSBuffer.wrap(data))).buffer);
        readFileIntoStream(this, resource, stream, data => data.buffer, {
            ...opts,
            bufferSize: 256 * 1024 // read into chunks of 256kb each to reduce IPC overhead
        }, token);
        return stream;
    }
    async writeFile(resource, content, opts) {
        if (opts?.atomic !== false && opts?.atomic?.postfix && await this.canWriteFileAtomic(resource)) {
            return this.doWriteFileAtomic(resource, joinPath(resourcesDirname(resource), `${resourcesBasename(resource)}${opts.atomic.postfix}`), content, opts);
        }
        else {
            return this.doWriteFile(resource, content, opts);
        }
    }
    async canWriteFileAtomic(resource) {
        try {
            const filePath = this.toFilePath(resource);
            const { symbolicLink } = await SymlinkSupport.stat(filePath);
            if (symbolicLink) {
                // atomic writes are unsupported for symbolic links because
                // we need to ensure that the `rename` operation is atomic
                // and that only works if the link is on the same disk.
                // Since we do not know where the symbolic link points to
                // we refuse to write atomically.
                return false;
            }
        }
        catch (error) {
            // ignore stat errors here and just proceed trying to write
        }
        return true; // atomic writing supported
    }
    async doWriteFileAtomic(resource, tempResource, content, opts) {
        // Ensure to create locks for all resources involved
        // since atomic write involves mutiple disk operations
        // and resources.
        const locks = new DisposableStore();
        try {
            locks.add(await this.createResourceLock(resource));
            locks.add(await this.createResourceLock(tempResource));
            // Write to temp resource first
            await this.doWriteFile(tempResource, content, opts, true /* disable write lock */);
            try {
                // Rename over existing to ensure atomic replace
                await this.rename(tempResource, resource, { overwrite: true });
            }
            catch (error) {
                // Cleanup in case of rename error
                try {
                    await this.delete(tempResource, { recursive: false, useTrash: false, atomic: false });
                }
                catch (error) {
                    // ignore - we want the outer error to bubble up
                }
                throw error;
            }
        }
        finally {
            locks.dispose();
        }
    }
    async doWriteFile(resource, content, opts, disableWriteLock) {
        let handle = undefined;
        try {
            const filePath = this.toFilePath(resource);
            // Validate target unless { create: true, overwrite: true }
            if (!opts.create || !opts.overwrite) {
                const fileExists = await Promises.exists(filePath);
                if (fileExists) {
                    if (!opts.overwrite) {
                        throw createFileSystemProviderError(localize('fileExists', "File already exists"), FileSystemProviderErrorCode.FileExists);
                    }
                }
                else {
                    if (!opts.create) {
                        throw createFileSystemProviderError(localize('fileNotExists', "File does not exist"), FileSystemProviderErrorCode.FileNotFound);
                    }
                }
            }
            // Open
            handle = await this.open(resource, { create: true, unlock: opts.unlock }, disableWriteLock);
            // Write content at once
            await this.write(handle, 0, content, 0, content.byteLength);
        }
        catch (error) {
            throw await this.toFileSystemProviderWriteError(resource, error);
        }
        finally {
            if (typeof handle === 'number') {
                await this.close(handle);
            }
        }
    }
    static { this.canFlush = true; }
    static configureFlushOnWrite(enabled) {
        DiskFileSystemProvider.canFlush = enabled;
    }
    async open(resource, opts, disableWriteLock) {
        const filePath = this.toFilePath(resource);
        // Writes: guard multiple writes to the same resource
        // behind a single lock to prevent races when writing
        // from multiple places at the same time to the same file
        let lock = undefined;
        if (isFileOpenForWriteOptions(opts) && !disableWriteLock) {
            lock = await this.createResourceLock(resource);
        }
        let fd = undefined;
        try {
            // Determine whether to unlock the file (write only)
            if (isFileOpenForWriteOptions(opts) && opts.unlock) {
                try {
                    const { stat } = await SymlinkSupport.stat(filePath);
                    if (!(stat.mode & 0o200 /* File mode indicating writable by owner */)) {
                        await promises.chmod(filePath, stat.mode | 0o200);
                    }
                }
                catch (error) {
                    if (error.code !== 'ENOENT') {
                        this.logService.trace(error); // log errors but do not give up writing
                    }
                }
            }
            // Windows gets special treatment (write only)
            if (isWindows && isFileOpenForWriteOptions(opts)) {
                try {
                    // We try to use 'r+' for opening (which will fail if the file does not exist)
                    // to prevent issues when saving hidden files or preserving alternate data
                    // streams.
                    // Related issues:
                    // - https://github.com/microsoft/vscode/issues/931
                    // - https://github.com/microsoft/vscode/issues/6363
                    fd = await Promises.open(filePath, 'r+');
                    // The flag 'r+' will not truncate the file, so we have to do this manually
                    await Promises.ftruncate(fd, 0);
                }
                catch (error) {
                    if (error.code !== 'ENOENT') {
                        this.logService.trace(error); // log errors but do not give up writing
                    }
                    // Make sure to close the file handle if we have one
                    if (typeof fd === 'number') {
                        try {
                            await Promises.close(fd);
                        }
                        catch (error) {
                            this.logService.trace(error); // log errors but do not give up writing
                        }
                        // Reset `fd` to be able to try again with 'w'
                        fd = undefined;
                    }
                }
            }
            if (typeof fd !== 'number') {
                fd = await Promises.open(filePath, isFileOpenForWriteOptions(opts) ?
                    // We take `opts.create` as a hint that the file is opened for writing
                    // as such we use 'w' to truncate an existing or create the
                    // file otherwise. we do not allow reading.
                    'w' :
                    // Otherwise we assume the file is opened for reading
                    // as such we use 'r' to neither truncate, nor create
                    // the file.
                    'r');
            }
        }
        catch (error) {
            // Release lock because we have no valid handle
            // if we did open a lock during this operation
            lock?.dispose();
            // Rethrow as file system provider error
            if (isFileOpenForWriteOptions(opts)) {
                throw await this.toFileSystemProviderWriteError(resource, error);
            }
            else {
                throw this.toFileSystemProviderError(error);
            }
        }
        // Remember this handle to track file position of the handle
        // we init the position to 0 since the file descriptor was
        // just created and the position was not moved so far (see
        // also http://man7.org/linux/man-pages/man2/open.2.html -
        // "The file offset is set to the beginning of the file.")
        this.mapHandleToPos.set(fd, 0);
        // remember that this handle was used for writing
        if (isFileOpenForWriteOptions(opts)) {
            this.writeHandles.set(fd, resource);
        }
        if (lock) {
            const previousLock = this.mapHandleToLock.get(fd);
            // Remember that this handle has an associated lock
            this.traceLock(`[Disk FileSystemProvider]: open() - storing lock for handle ${fd} (${filePath})`);
            this.mapHandleToLock.set(fd, lock);
            // There is a slight chance that a resource lock for a
            // handle was not yet disposed when we acquire a new
            // lock, so we must ensure to dispose the previous lock
            // before storing a new one for the same handle, other
            // wise we end up in a deadlock situation
            // https://github.com/microsoft/vscode/issues/142462
            if (previousLock) {
                this.traceLock(`[Disk FileSystemProvider]: open() - disposing a previous lock that was still stored on same handle ${fd} (${filePath})`);
                previousLock.dispose();
            }
        }
        return fd;
    }
    async close(fd) {
        // It is very important that we keep any associated lock
        // for the file handle before attempting to call `fs.close(fd)`
        // because of a possible race condition: as soon as a file
        // handle is released, the OS may assign the same handle to
        // the next `fs.open` call and as such it is possible that our
        // lock is getting overwritten
        const lockForHandle = this.mapHandleToLock.get(fd);
        try {
            // Remove this handle from map of positions
            this.mapHandleToPos.delete(fd);
            // If a handle is closed that was used for writing, ensure
            // to flush the contents to disk if possible.
            if (this.writeHandles.delete(fd) && DiskFileSystemProvider.canFlush) {
                try {
                    await Promises.fdatasync(fd); // https://github.com/microsoft/vscode/issues/9589
                }
                catch (error) {
                    // In some exotic setups it is well possible that node fails to sync
                    // In that case we disable flushing and log the error to our logger
                    DiskFileSystemProvider.configureFlushOnWrite(false);
                    this.logService.error(error);
                }
            }
            return await Promises.close(fd);
        }
        catch (error) {
            throw this.toFileSystemProviderError(error);
        }
        finally {
            if (lockForHandle) {
                if (this.mapHandleToLock.get(fd) === lockForHandle) {
                    this.traceLock(`[Disk FileSystemProvider]: close() - resource lock removed from handle-lock map ${fd}`);
                    this.mapHandleToLock.delete(fd); // only delete from map if this is still our lock!
                }
                this.traceLock(`[Disk FileSystemProvider]: close() - disposing lock for handle ${fd}`);
                lockForHandle.dispose();
            }
        }
    }
    async read(fd, pos, data, offset, length) {
        const normalizedPos = this.normalizePos(fd, pos);
        let bytesRead = null;
        try {
            bytesRead = (await Promises.read(fd, data, offset, length, normalizedPos)).bytesRead;
        }
        catch (error) {
            throw this.toFileSystemProviderError(error);
        }
        finally {
            this.updatePos(fd, normalizedPos, bytesRead);
        }
        return bytesRead;
    }
    normalizePos(fd, pos) {
        // When calling fs.read/write we try to avoid passing in the "pos" argument and
        // rather prefer to pass in "null" because this avoids an extra seek(pos)
        // call that in some cases can even fail (e.g. when opening a file over FTP -
        // see https://github.com/microsoft/vscode/issues/73884).
        //
        // as such, we compare the passed in position argument with our last known
        // position for the file descriptor and use "null" if they match.
        if (pos === this.mapHandleToPos.get(fd)) {
            return null;
        }
        return pos;
    }
    updatePos(fd, pos, bytesLength) {
        const lastKnownPos = this.mapHandleToPos.get(fd);
        if (typeof lastKnownPos === 'number') {
            // pos !== null signals that previously a position was used that is
            // not null. node.js documentation explains, that in this case
            // the internal file pointer is not moving and as such we do not move
            // our position pointer.
            //
            // Docs: "If position is null, data will be read from the current file position,
            // and the file position will be updated. If position is an integer, the file position
            // will remain unchanged."
            if (typeof pos === 'number') {
                // do not modify the position
            }
            // bytesLength = number is a signal that the read/write operation was
            // successful and as such we need to advance the position in the Map
            //
            // Docs (http://man7.org/linux/man-pages/man2/read.2.html):
            // "On files that support seeking, the read operation commences at the
            // file offset, and the file offset is incremented by the number of
            // bytes read."
            //
            // Docs (http://man7.org/linux/man-pages/man2/write.2.html):
            // "For a seekable file (i.e., one to which lseek(2) may be applied, for
            // example, a regular file) writing takes place at the file offset, and
            // the file offset is incremented by the number of bytes actually
            // written."
            else if (typeof bytesLength === 'number') {
                this.mapHandleToPos.set(fd, lastKnownPos + bytesLength);
            }
            // bytesLength = null signals an error in the read/write operation
            // and as such we drop the handle from the Map because the position
            // is unspecificed at this point.
            else {
                this.mapHandleToPos.delete(fd);
            }
        }
    }
    async write(fd, pos, data, offset, length) {
        // We know at this point that the file to write to is truncated and thus empty
        // if the write now fails, the file remains empty. as such we really try hard
        // to ensure the write succeeds by retrying up to three times.
        return retry(() => this.doWrite(fd, pos, data, offset, length), 100 /* ms delay */, 3 /* retries */);
    }
    async doWrite(fd, pos, data, offset, length) {
        const normalizedPos = this.normalizePos(fd, pos);
        let bytesWritten = null;
        try {
            bytesWritten = (await Promises.write(fd, data, offset, length, normalizedPos)).bytesWritten;
        }
        catch (error) {
            throw await this.toFileSystemProviderWriteError(this.writeHandles.get(fd), error);
        }
        finally {
            this.updatePos(fd, normalizedPos, bytesWritten);
        }
        return bytesWritten;
    }
    //#endregion
    //#region Move/Copy/Delete/Create Folder
    async mkdir(resource) {
        try {
            await promises.mkdir(this.toFilePath(resource));
        }
        catch (error) {
            throw this.toFileSystemProviderError(error);
        }
    }
    async delete(resource, opts) {
        try {
            const filePath = this.toFilePath(resource);
            if (opts.recursive) {
                let rmMoveToPath = undefined;
                if (opts?.atomic !== false && opts.atomic.postfix) {
                    rmMoveToPath = join(dirname(filePath), `${basename(filePath)}${opts.atomic.postfix}`);
                }
                await Promises.rm(filePath, RimRafMode.MOVE, rmMoveToPath);
            }
            else {
                try {
                    await promises.unlink(filePath);
                }
                catch (unlinkError) {
                    // `fs.unlink` will throw when used on directories
                    // we try to detect this error and then see if the
                    // provided resource is actually a directory. in that
                    // case we use `fs.rmdir` to delete the directory.
                    if (unlinkError.code === 'EPERM' || unlinkError.code === 'EISDIR') {
                        let isDirectory = false;
                        try {
                            const { stat, symbolicLink } = await SymlinkSupport.stat(filePath);
                            isDirectory = stat.isDirectory() && !symbolicLink;
                        }
                        catch (statError) {
                            // ignore
                        }
                        if (isDirectory) {
                            await promises.rmdir(filePath);
                        }
                        else {
                            throw unlinkError;
                        }
                    }
                    else {
                        throw unlinkError;
                    }
                }
            }
        }
        catch (error) {
            throw this.toFileSystemProviderError(error);
        }
    }
    async rename(from, to, opts) {
        const fromFilePath = this.toFilePath(from);
        const toFilePath = this.toFilePath(to);
        if (fromFilePath === toFilePath) {
            return; // simulate node.js behaviour here and do a no-op if paths match
        }
        try {
            // Validate the move operation can perform
            await this.validateMoveCopy(from, to, 'move', opts.overwrite);
            // Rename
            await Promises.rename(fromFilePath, toFilePath);
        }
        catch (error) {
            // Rewrite some typical errors that can happen especially around symlinks
            // to something the user can better understand
            if (error.code === 'EINVAL' || error.code === 'EBUSY' || error.code === 'ENAMETOOLONG') {
                error = new Error(localize('moveError', "Unable to move '{0}' into '{1}' ({2}).", basename(fromFilePath), basename(dirname(toFilePath)), error.toString()));
            }
            throw this.toFileSystemProviderError(error);
        }
    }
    async copy(from, to, opts) {
        const fromFilePath = this.toFilePath(from);
        const toFilePath = this.toFilePath(to);
        if (fromFilePath === toFilePath) {
            return; // simulate node.js behaviour here and do a no-op if paths match
        }
        try {
            // Validate the copy operation can perform
            await this.validateMoveCopy(from, to, 'copy', opts.overwrite);
            // Copy
            await Promises.copy(fromFilePath, toFilePath, { preserveSymlinks: true });
        }
        catch (error) {
            // Rewrite some typical errors that can happen especially around symlinks
            // to something the user can better understand
            if (error.code === 'EINVAL' || error.code === 'EBUSY' || error.code === 'ENAMETOOLONG') {
                error = new Error(localize('copyError', "Unable to copy '{0}' into '{1}' ({2}).", basename(fromFilePath), basename(dirname(toFilePath)), error.toString()));
            }
            throw this.toFileSystemProviderError(error);
        }
    }
    async validateMoveCopy(from, to, mode, overwrite) {
        const fromFilePath = this.toFilePath(from);
        const toFilePath = this.toFilePath(to);
        let isSameResourceWithDifferentPathCase = false;
        const isPathCaseSensitive = !!(this.capabilities & 1024 /* FileSystemProviderCapabilities.PathCaseSensitive */);
        if (!isPathCaseSensitive) {
            isSameResourceWithDifferentPathCase = isEqual(fromFilePath, toFilePath, true /* ignore case */);
        }
        if (isSameResourceWithDifferentPathCase) {
            // You cannot copy the same file to the same location with different
            // path case unless you are on a case sensitive file system
            if (mode === 'copy') {
                throw createFileSystemProviderError(localize('fileCopyErrorPathCase', "File cannot be copied to same path with different path case"), FileSystemProviderErrorCode.FileExists);
            }
            // You can move the same file to the same location with different
            // path case on case insensitive file systems
            else if (mode === 'move') {
                return;
            }
        }
        // Here we have to see if the target to move/copy to exists or not.
        // We need to respect the `overwrite` option to throw in case the
        // target exists.
        const fromStat = await this.statIgnoreError(from);
        if (!fromStat) {
            throw createFileSystemProviderError(localize('fileMoveCopyErrorNotFound', "File to move/copy does not exist"), FileSystemProviderErrorCode.FileNotFound);
        }
        const toStat = await this.statIgnoreError(to);
        if (!toStat) {
            return; // target does not exist so we are good
        }
        if (!overwrite) {
            throw createFileSystemProviderError(localize('fileMoveCopyErrorExists', "File at target already exists and thus will not be moved/copied to unless overwrite is specified"), FileSystemProviderErrorCode.FileExists);
        }
        // Handle existing target for move/copy
        if ((fromStat.type & FileType.File) !== 0 && (toStat.type & FileType.File) !== 0) {
            return; // node.js can move/copy a file over an existing file without having to delete it first
        }
        else {
            await this.delete(to, { recursive: true, useTrash: false, atomic: false });
        }
    }
    //#endregion
    //#region Clone File
    async cloneFile(from, to) {
        return this.doCloneFile(from, to, false /* optimistically assume parent folders exist */);
    }
    async doCloneFile(from, to, mkdir) {
        const fromFilePath = this.toFilePath(from);
        const toFilePath = this.toFilePath(to);
        const isPathCaseSensitive = !!(this.capabilities & 1024 /* FileSystemProviderCapabilities.PathCaseSensitive */);
        if (isEqual(fromFilePath, toFilePath, !isPathCaseSensitive)) {
            return; // cloning is only supported `from` and `to` are different files
        }
        // Implement clone by using `fs.copyFile`, however setup locks
        // for both `from` and `to` because node.js does not ensure
        // this to be an atomic operation
        const locks = new DisposableStore();
        try {
            locks.add(await this.createResourceLock(from));
            locks.add(await this.createResourceLock(to));
            if (mkdir) {
                await promises.mkdir(dirname(toFilePath), { recursive: true });
            }
            await promises.copyFile(fromFilePath, toFilePath);
        }
        catch (error) {
            if (error.code === 'ENOENT' && !mkdir) {
                return this.doCloneFile(from, to, true);
            }
            throw this.toFileSystemProviderError(error);
        }
        finally {
            locks.dispose();
        }
    }
    //#endregion
    //#region File Watching
    createUniversalWatcher(onChange, onLogMessage, verboseLogging) {
        return new UniversalWatcherClient(changes => onChange(changes), msg => onLogMessage(msg), verboseLogging);
    }
    createNonRecursiveWatcher(onChange, onLogMessage, verboseLogging) {
        return new NodeJSWatcherClient(changes => onChange(changes), msg => onLogMessage(msg), verboseLogging);
    }
    //#endregion
    //#region Helpers
    toFileSystemProviderError(error) {
        if (error instanceof FileSystemProviderError) {
            return error; // avoid double conversion
        }
        let resultError = error;
        let code;
        switch (error.code) {
            case 'ENOENT':
                code = FileSystemProviderErrorCode.FileNotFound;
                break;
            case 'EISDIR':
                code = FileSystemProviderErrorCode.FileIsADirectory;
                break;
            case 'ENOTDIR':
                code = FileSystemProviderErrorCode.FileNotADirectory;
                break;
            case 'EEXIST':
                code = FileSystemProviderErrorCode.FileExists;
                break;
            case 'EPERM':
            case 'EACCES':
                code = FileSystemProviderErrorCode.NoPermissions;
                break;
            case 'ERR_UNC_HOST_NOT_ALLOWED':
                resultError = `${error.message}. Please update the 'security.allowedUNCHosts' setting if you want to allow this host.`;
                code = FileSystemProviderErrorCode.Unknown;
                break;
            default:
                code = FileSystemProviderErrorCode.Unknown;
        }
        return createFileSystemProviderError(resultError, code);
    }
    async toFileSystemProviderWriteError(resource, error) {
        let fileSystemProviderWriteError = this.toFileSystemProviderError(error);
        // If the write error signals permission issues, we try
        // to read the file's mode to see if the file is write
        // locked.
        if (resource && fileSystemProviderWriteError.code === FileSystemProviderErrorCode.NoPermissions) {
            try {
                const { stat } = await SymlinkSupport.stat(this.toFilePath(resource));
                if (!(stat.mode & 0o200 /* File mode indicating writable by owner */)) {
                    fileSystemProviderWriteError = createFileSystemProviderError(error, FileSystemProviderErrorCode.FileWriteLocked);
                }
            }
            catch (error) {
                this.logService.trace(error); // ignore - return original error
            }
        }
        return fileSystemProviderWriteError;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlza0ZpbGVTeXN0ZW1Qcm92aWRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9maWxlcy9ub2RlL2Rpc2tGaWxlU3lzdGVtUHJvdmlkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFTLFFBQVEsRUFBRSxNQUFNLElBQUksQ0FBQztBQUNyQyxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQy9ELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUMxRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFFMUQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3RELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUMxRCxPQUFPLEVBQUUsZUFBZSxFQUFlLFlBQVksRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQy9GLE9BQU8sRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDdEUsT0FBTyxFQUFFLDBCQUEwQixFQUFFLFFBQVEsRUFBRSxRQUFRLElBQUksaUJBQWlCLEVBQUUsT0FBTyxJQUFJLGdCQUFnQixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDckosT0FBTyxFQUFFLGtCQUFrQixFQUF3QixNQUFNLGdDQUFnQyxDQUFDO0FBRTFGLE9BQU8sRUFBVyxRQUFRLEVBQUUsVUFBVSxFQUFFLGNBQWMsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQzFGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFB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