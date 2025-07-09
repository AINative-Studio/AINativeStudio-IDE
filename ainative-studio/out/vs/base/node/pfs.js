/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as fs from 'fs';
import { tmpdir } from 'os';
import { promisify } from 'util';
import { ResourceQueue, timeout } from '../common/async.js';
import { isEqualOrParent, isRootOrDriveLetter, randomPath } from '../common/extpath.js';
import { normalizeNFC } from '../common/normalization.js';
import { join } from '../common/path.js';
import { isLinux, isMacintosh, isWindows } from '../common/platform.js';
import { extUriBiasedIgnorePathCase } from '../common/resources.js';
import { URI } from '../common/uri.js';
//#region rimraf
export var RimRafMode;
(function (RimRafMode) {
    /**
     * Slow version that unlinks each file and folder.
     */
    RimRafMode[RimRafMode["UNLINK"] = 0] = "UNLINK";
    /**
     * Fast version that first moves the file/folder
     * into a temp directory and then deletes that
     * without waiting for it.
     */
    RimRafMode[RimRafMode["MOVE"] = 1] = "MOVE";
})(RimRafMode || (RimRafMode = {}));
async function rimraf(path, mode = RimRafMode.UNLINK, moveToPath) {
    if (isRootOrDriveLetter(path)) {
        throw new Error('rimraf - will refuse to recursively delete root');
    }
    // delete: via rm
    if (mode === RimRafMode.UNLINK) {
        return rimrafUnlink(path);
    }
    // delete: via move
    return rimrafMove(path, moveToPath);
}
async function rimrafMove(path, moveToPath = randomPath(tmpdir())) {
    try {
        try {
            await fs.promises.rename(path, moveToPath);
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                return; // ignore - path to delete did not exist
            }
            return rimrafUnlink(path); // otherwise fallback to unlink
        }
        // Delete but do not return as promise
        rimrafUnlink(moveToPath).catch(error => { });
    }
    catch (error) {
        if (error.code !== 'ENOENT') {
            throw error;
        }
    }
}
async function rimrafUnlink(path) {
    return fs.promises.rm(path, { recursive: true, force: true, maxRetries: 3 });
}
export function rimrafSync(path) {
    if (isRootOrDriveLetter(path)) {
        throw new Error('rimraf - will refuse to recursively delete root');
    }
    fs.rmSync(path, { recursive: true, force: true, maxRetries: 3 });
}
async function readdir(path, options) {
    return handleDirectoryChildren(await (options ? safeReaddirWithFileTypes(path) : fs.promises.readdir(path)));
}
async function safeReaddirWithFileTypes(path) {
    try {
        return await fs.promises.readdir(path, { withFileTypes: true });
    }
    catch (error) {
        console.warn('[node.js fs] readdir with filetypes failed with error: ', error);
    }
    // Fallback to manually reading and resolving each
    // children of the folder in case we hit an error
    // previously.
    // This can only really happen on exotic file systems
    // such as explained in #115645 where we get entries
    // from `readdir` that we can later not `lstat`.
    const result = [];
    const children = await readdir(path);
    for (const child of children) {
        let isFile = false;
        let isDirectory = false;
        let isSymbolicLink = false;
        try {
            const lstat = await fs.promises.lstat(join(path, child));
            isFile = lstat.isFile();
            isDirectory = lstat.isDirectory();
            isSymbolicLink = lstat.isSymbolicLink();
        }
        catch (error) {
            console.warn('[node.js fs] unexpected error from lstat after readdir: ', error);
        }
        result.push({
            name: child,
            isFile: () => isFile,
            isDirectory: () => isDirectory,
            isSymbolicLink: () => isSymbolicLink
        });
    }
    return result;
}
/**
 * Drop-in replacement of `fs.readdirSync` with support
 * for converting from macOS NFD unicon form to NFC
 * (https://github.com/nodejs/node/issues/2165)
 */
export function readdirSync(path) {
    return handleDirectoryChildren(fs.readdirSync(path));
}
function handleDirectoryChildren(children) {
    return children.map(child => {
        // Mac: uses NFD unicode form on disk, but we want NFC
        // See also https://github.com/nodejs/node/issues/2165
        if (typeof child === 'string') {
            return isMacintosh ? normalizeNFC(child) : child;
        }
        child.name = isMacintosh ? normalizeNFC(child.name) : child.name;
        return child;
    });
}
/**
 * A convenience method to read all children of a path that
 * are directories.
 */
async function readDirsInDir(dirPath) {
    const children = await readdir(dirPath);
    const directories = [];
    for (const child of children) {
        if (await SymlinkSupport.existsDirectory(join(dirPath, child))) {
            directories.push(child);
        }
    }
    return directories;
}
//#endregion
//#region whenDeleted()
/**
 * A `Promise` that resolves when the provided `path`
 * is deleted from disk.
 */
export function whenDeleted(path, intervalMs = 1000) {
    return new Promise(resolve => {
        let running = false;
        const interval = setInterval(() => {
            if (!running) {
                running = true;
                fs.access(path, err => {
                    running = false;
                    if (err) {
                        clearInterval(interval);
                        resolve(undefined);
                    }
                });
            }
        }, intervalMs);
    });
}
//#endregion
//#region Methods with symbolic links support
export var SymlinkSupport;
(function (SymlinkSupport) {
    /**
     * Resolves the `fs.Stats` of the provided path. If the path is a
     * symbolic link, the `fs.Stats` will be from the target it points
     * to. If the target does not exist, `dangling: true` will be returned
     * as `symbolicLink` value.
     */
    async function stat(path) {
        // First stat the link
        let lstats;
        try {
            lstats = await fs.promises.lstat(path);
            // Return early if the stat is not a symbolic link at all
            if (!lstats.isSymbolicLink()) {
                return { stat: lstats };
            }
        }
        catch (error) {
            /* ignore - use stat() instead */
        }
        // If the stat is a symbolic link or failed to stat, use fs.stat()
        // which for symbolic links will stat the target they point to
        try {
            const stats = await fs.promises.stat(path);
            return { stat: stats, symbolicLink: lstats?.isSymbolicLink() ? { dangling: false } : undefined };
        }
        catch (error) {
            // If the link points to a nonexistent file we still want
            // to return it as result while setting dangling: true flag
            if (error.code === 'ENOENT' && lstats) {
                return { stat: lstats, symbolicLink: { dangling: true } };
            }
            // Windows: workaround a node.js bug where reparse points
            // are not supported (https://github.com/nodejs/node/issues/36790)
            if (isWindows && error.code === 'EACCES') {
                try {
                    const stats = await fs.promises.stat(await fs.promises.readlink(path));
                    return { stat: stats, symbolicLink: { dangling: false } };
                }
                catch (error) {
                    // If the link points to a nonexistent file we still want
                    // to return it as result while setting dangling: true flag
                    if (error.code === 'ENOENT' && lstats) {
                        return { stat: lstats, symbolicLink: { dangling: true } };
                    }
                    throw error;
                }
            }
            throw error;
        }
    }
    SymlinkSupport.stat = stat;
    /**
     * Figures out if the `path` exists and is a file with support
     * for symlinks.
     *
     * Note: this will return `false` for a symlink that exists on
     * disk but is dangling (pointing to a nonexistent path).
     *
     * Use `exists` if you only care about the path existing on disk
     * or not without support for symbolic links.
     */
    async function existsFile(path) {
        try {
            const { stat, symbolicLink } = await SymlinkSupport.stat(path);
            return stat.isFile() && symbolicLink?.dangling !== true;
        }
        catch (error) {
            // Ignore, path might not exist
        }
        return false;
    }
    SymlinkSupport.existsFile = existsFile;
    /**
     * Figures out if the `path` exists and is a directory with support for
     * symlinks.
     *
     * Note: this will return `false` for a symlink that exists on
     * disk but is dangling (pointing to a nonexistent path).
     *
     * Use `exists` if you only care about the path existing on disk
     * or not without support for symbolic links.
     */
    async function existsDirectory(path) {
        try {
            const { stat, symbolicLink } = await SymlinkSupport.stat(path);
            return stat.isDirectory() && symbolicLink?.dangling !== true;
        }
        catch (error) {
            // Ignore, path might not exist
        }
        return false;
    }
    SymlinkSupport.existsDirectory = existsDirectory;
})(SymlinkSupport || (SymlinkSupport = {}));
//#endregion
//#region Write File
// According to node.js docs (https://nodejs.org/docs/v14.16.0/api/fs.html#fs_fs_writefile_file_data_options_callback)
// it is not safe to call writeFile() on the same path multiple times without waiting for the callback to return.
// Therefor we use a Queue on the path that is given to us to sequentialize calls to the same path properly.
const writeQueues = new ResourceQueue();
function writeFile(path, data, options) {
    return writeQueues.queueFor(URI.file(path), () => {
        const ensuredOptions = ensureWriteOptions(options);
        return new Promise((resolve, reject) => doWriteFileAndFlush(path, data, ensuredOptions, error => error ? reject(error) : resolve()));
    }, extUriBiasedIgnorePathCase);
}
let canFlush = true;
export function configureFlushOnWrite(enabled) {
    canFlush = enabled;
}
// Calls fs.writeFile() followed by a fs.sync() call to flush the changes to disk
// We do this in cases where we want to make sure the data is really on disk and
// not in some cache.
//
// See https://github.com/nodejs/node/blob/v5.10.0/lib/fs.js#L1194
function doWriteFileAndFlush(path, data, options, callback) {
    if (!canFlush) {
        return fs.writeFile(path, data, { mode: options.mode, flag: options.flag }, callback);
    }
    // Open the file with same flags and mode as fs.writeFile()
    fs.open(path, options.flag, options.mode, (openError, fd) => {
        if (openError) {
            return callback(openError);
        }
        // It is valid to pass a fd handle to fs.writeFile() and this will keep the handle open!
        fs.writeFile(fd, data, writeError => {
            if (writeError) {
                return fs.close(fd, () => callback(writeError)); // still need to close the handle on error!
            }
            // Flush contents (not metadata) of the file to disk
            // https://github.com/microsoft/vscode/issues/9589
            fs.fdatasync(fd, (syncError) => {
                // In some exotic setups it is well possible that node fails to sync
                // In that case we disable flushing and warn to the console
                if (syncError) {
                    console.warn('[node.js fs] fdatasync is now disabled for this session because it failed: ', syncError);
                    configureFlushOnWrite(false);
                }
                return fs.close(fd, closeError => callback(closeError));
            });
        });
    });
}
/**
 * Same as `fs.writeFileSync` but with an additional call to
 * `fs.fdatasyncSync` after writing to ensure changes are
 * flushed to disk.
 */
export function writeFileSync(path, data, options) {
    const ensuredOptions = ensureWriteOptions(options);
    if (!canFlush) {
        return fs.writeFileSync(path, data, { mode: ensuredOptions.mode, flag: ensuredOptions.flag });
    }
    // Open the file with same flags and mode as fs.writeFile()
    const fd = fs.openSync(path, ensuredOptions.flag, ensuredOptions.mode);
    try {
        // It is valid to pass a fd handle to fs.writeFile() and this will keep the handle open!
        fs.writeFileSync(fd, data);
        // Flush contents (not metadata) of the file to disk
        try {
            fs.fdatasyncSync(fd); // https://github.com/microsoft/vscode/issues/9589
        }
        catch (syncError) {
            console.warn('[node.js fs] fdatasyncSync is now disabled for this session because it failed: ', syncError);
            configureFlushOnWrite(false);
        }
    }
    finally {
        fs.closeSync(fd);
    }
}
function ensureWriteOptions(options) {
    if (!options) {
        return { mode: 0o666 /* default node.js mode for files */, flag: 'w' };
    }
    return {
        mode: typeof options.mode === 'number' ? options.mode : 0o666 /* default node.js mode for files */,
        flag: typeof options.flag === 'string' ? options.flag : 'w'
    };
}
//#endregion
//#region Move / Copy
/**
 * A drop-in replacement for `fs.rename` that:
 * - allows to move across multiple disks
 * - attempts to retry the operation for certain error codes on Windows
 */
async function rename(source, target, windowsRetryTimeout = 60000) {
    if (source === target) {
        return; // simulate node.js behaviour here and do a no-op if paths match
    }
    try {
        if (isWindows && typeof windowsRetryTimeout === 'number') {
            // On Windows, a rename can fail when either source or target
            // is locked by AV software.
            await renameWithRetry(source, target, Date.now(), windowsRetryTimeout);
        }
        else {
            await fs.promises.rename(source, target);
        }
    }
    catch (error) {
        // In two cases we fallback to classic copy and delete:
        //
        // 1.) The EXDEV error indicates that source and target are on different devices
        // In this case, fallback to using a copy() operation as there is no way to
        // rename() between different devices.
        //
        // 2.) The user tries to rename a file/folder that ends with a dot. This is not
        // really possible to move then, at least on UNC devices.
        if (source.toLowerCase() !== target.toLowerCase() && error.code === 'EXDEV' || source.endsWith('.')) {
            await copy(source, target, { preserveSymlinks: false /* copying to another device */ });
            await rimraf(source, RimRafMode.MOVE);
        }
        else {
            throw error;
        }
    }
}
async function renameWithRetry(source, target, startTime, retryTimeout, attempt = 0) {
    try {
        return await fs.promises.rename(source, target);
    }
    catch (error) {
        if (error.code !== 'EACCES' && error.code !== 'EPERM' && error.code !== 'EBUSY') {
            throw error; // only for errors we think are temporary
        }
        if (Date.now() - startTime >= retryTimeout) {
            console.error(`[node.js fs] rename failed after ${attempt} retries with error: ${error}`);
            throw error; // give up after configurable timeout
        }
        if (attempt === 0) {
            let abortRetry = false;
            try {
                const { stat } = await SymlinkSupport.stat(target);
                if (!stat.isFile()) {
                    abortRetry = true; // if target is not a file, EPERM error may be raised and we should not attempt to retry
                }
            }
            catch (error) {
                // Ignore
            }
            if (abortRetry) {
                throw error;
            }
        }
        // Delay with incremental backoff up to 100ms
        await timeout(Math.min(100, attempt * 10));
        // Attempt again
        return renameWithRetry(source, target, startTime, retryTimeout, attempt + 1);
    }
}
/**
 * Recursively copies all of `source` to `target`.
 *
 * The options `preserveSymlinks` configures how symbolic
 * links should be handled when encountered. Set to
 * `false` to not preserve them and `true` otherwise.
 */
async function copy(source, target, options) {
    return doCopy(source, target, { root: { source, target }, options, handledSourcePaths: new Set() });
}
// When copying a file or folder, we want to preserve the mode
// it had and as such provide it when creating. However, modes
// can go beyond what we expect (see link below), so we mask it.
// (https://github.com/nodejs/node-v0.x-archive/issues/3045#issuecomment-4862588)
const COPY_MODE_MASK = 0o777;
async function doCopy(source, target, payload) {
    // Keep track of paths already copied to prevent
    // cycles from symbolic links to cause issues
    if (payload.handledSourcePaths.has(source)) {
        return;
    }
    else {
        payload.handledSourcePaths.add(source);
    }
    const { stat, symbolicLink } = await SymlinkSupport.stat(source);
    // Symlink
    if (symbolicLink) {
        // Try to re-create the symlink unless `preserveSymlinks: false`
        if (payload.options.preserveSymlinks) {
            try {
                return await doCopySymlink(source, target, payload);
            }
            catch (error) {
                // in any case of an error fallback to normal copy via dereferencing
            }
        }
        if (symbolicLink.dangling) {
            return; // skip dangling symbolic links from here on (https://github.com/microsoft/vscode/issues/111621)
        }
    }
    // Folder
    if (stat.isDirectory()) {
        return doCopyDirectory(source, target, stat.mode & COPY_MODE_MASK, payload);
    }
    // File or file-like
    else {
        return doCopyFile(source, target, stat.mode & COPY_MODE_MASK);
    }
}
async function doCopyDirectory(source, target, mode, payload) {
    // Create folder
    await fs.promises.mkdir(target, { recursive: true, mode });
    // Copy each file recursively
    const files = await readdir(source);
    for (const file of files) {
        await doCopy(join(source, file), join(target, file), payload);
    }
}
async function doCopyFile(source, target, mode) {
    // Copy file
    await fs.promises.copyFile(source, target);
    // restore mode (https://github.com/nodejs/node/issues/1104)
    await fs.promises.chmod(target, mode);
}
async function doCopySymlink(source, target, payload) {
    // Figure out link target
    let linkTarget = await fs.promises.readlink(source);
    // Special case: the symlink points to a target that is
    // actually within the path that is being copied. In that
    // case we want the symlink to point to the target and
    // not the source
    if (isEqualOrParent(linkTarget, payload.root.source, !isLinux)) {
        linkTarget = join(payload.root.target, linkTarget.substr(payload.root.source.length + 1));
    }
    // Create symlink
    await fs.promises.symlink(linkTarget, target);
}
//#endregion
//#region Promise based fs methods
/**
 * Some low level `fs` methods provided as `Promises` similar to
 * `fs.promises` but with notable differences, either implemented
 * by us or by restoring the original callback based behavior.
 *
 * At least `realpath` is implemented differently in the promise
 * based implementation compared to the callback based one. The
 * promise based implementation actually calls `fs.realpath.native`.
 * (https://github.com/microsoft/vscode/issues/118562)
 */
export const Promises = new class {
    //#region Implemented by node.js
    get read() {
        // Not using `promisify` here for a reason: the return
        // type is not an object as indicated by TypeScript but
        // just the bytes read, so we create our own wrapper.
        return (fd, buffer, offset, length, position) => {
            return new Promise((resolve, reject) => {
                fs.read(fd, buffer, offset, length, position, (err, bytesRead, buffer) => {
                    if (err) {
                        return reject(err);
                    }
                    return resolve({ bytesRead, buffer });
                });
            });
        };
    }
    get write() {
        // Not using `promisify` here for a reason: the return
        // type is not an object as indicated by TypeScript but
        // just the bytes written, so we create our own wrapper.
        return (fd, buffer, offset, length, position) => {
            return new Promise((resolve, reject) => {
                fs.write(fd, buffer, offset, length, position, (err, bytesWritten, buffer) => {
                    if (err) {
                        return reject(err);
                    }
                    return resolve({ bytesWritten, buffer });
                });
            });
        };
    }
    get fdatasync() { return promisify(fs.fdatasync); } // not exposed as API in 20.x yet
    get open() { return promisify(fs.open); } // changed to return `FileHandle` in promise API
    get close() { return promisify(fs.close); } // not exposed as API due to the `FileHandle` return type of `open`
    get realpath() { return promisify(fs.realpath); } // `fs.promises.realpath` will use `fs.realpath.native` which we do not want
    get ftruncate() { return promisify(fs.ftruncate); } // not exposed as API in 20.x yet
    //#endregion
    //#region Implemented by us
    async exists(path) {
        try {
            await fs.promises.access(path);
            return true;
        }
        catch {
            return false;
        }
    }
    get readdir() { return readdir; }
    get readDirsInDir() { return readDirsInDir; }
    get writeFile() { return writeFile; }
    get rm() { return rimraf; }
    get rename() { return rename; }
    get copy() { return copy; }
};
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGZzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2Uvbm9kZS9wZnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEVBQUUsTUFBTSxJQUFJLENBQUM7QUFDekIsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLElBQUksQ0FBQztBQUM1QixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sTUFBTSxDQUFDO0FBQ2pDLE9BQU8sRUFBRSxhQUFhLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDNUQsT0FBTyxFQUFFLGVBQWUsRUFBRSxtQkFBbUIsRUFBRSxVQUFVLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQztBQUN4RixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDMUQsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBQ3pDLE9BQU8sRUFBRSxPQUFPLEVBQUUsV0FBVyxFQUFFLFNBQVMsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ3hFLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQ3BFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUV2QyxnQkFBZ0I7QUFFaEIsTUFBTSxDQUFOLElBQVksVUFhWDtBQWJELFdBQVksVUFBVTtJQUVyQjs7T0FFRztJQUNILCtDQUFNLENBQUE7SUFFTjs7OztPQUlHO0lBQ0gsMkNBQUksQ0FBQTtBQUNMLENBQUMsRUFiVyxVQUFVLEtBQVYsVUFBVSxRQWFyQjtBQWNELEtBQUssVUFBVSxNQUFNLENBQUMsSUFBWSxFQUFFLElBQUksR0FBRyxVQUFVLENBQUMsTUFBTSxFQUFFLFVBQW1CO0lBQ2hGLElBQUksbUJBQW1CLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztRQUMvQixNQUFNLElBQUksS0FBSyxDQUFDLGlEQUFpRCxDQUFDLENBQUM7SUFDcEUsQ0FBQztJQUVELGlCQUFpQjtJQUNqQixJQUFJLElBQUksS0FBSyxVQUFVLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDaEMsT0FBTyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDM0IsQ0FBQztJQUVELG1CQUFtQjtJQUNuQixPQUFPLFVBQVUsQ0FBQyxJQUFJLEVBQUUsVUFBVSxDQUFDLENBQUM7QUFDckMsQ0FBQztBQUVELEtBQUssVUFBVSxVQUFVLENBQUMsSUFBWSxFQUFFLFVBQVUsR0FBRyxVQUFVLENBQUMsTUFBTSxFQUFFLENBQUM7SUFDeEUsSUFBSSxDQUFDO1FBQ0osSUFBSSxDQUFDO1lBQ0osTUFBTSxFQUFFLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDNUMsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDaEIsSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLFFBQVEsRUFBRSxDQUFDO2dCQUM3QixPQUFPLENBQUMsd0NBQXdDO1lBQ2pELENBQUM7WUFFRCxPQUFPLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLCtCQUErQjtRQUMzRCxDQUFDO1FBRUQsc0NBQXNDO1FBQ3RDLFlBQVksQ0FBQyxVQUFVLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEVBQUUsR0FBZSxDQUFDLENBQUMsQ0FBQztJQUMxRCxDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNoQixJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDN0IsTUFBTSxLQUFLLENBQUM7UUFDYixDQUFDO0lBQ0YsQ0FBQztBQUNGLENBQUM7QUFFRCxLQUFLLFVBQVUsWUFBWSxDQUFDLElBQVk7SUFDdkMsT0FBTyxFQUFFLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsVUFBVSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7QUFDOUUsQ0FBQztBQUVELE1BQU0sVUFBVSxVQUFVLENBQUMsSUFBWTtJQUN0QyxJQUFJLG1CQUFtQixDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7UUFDL0IsTUFBTSxJQUFJLEtBQUssQ0FBQyxpREFBaUQsQ0FBQyxDQUFDO0lBQ3BFLENBQUM7SUFFRCxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUNsRSxDQUFDO0FBcUJELEtBQUssVUFBVSxPQUFPLENBQUMsSUFBWSxFQUFFLE9BQWlDO0lBQ3JFLE9BQU8sdUJBQXVCLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsd0JBQXdCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM5RyxDQUFDO0FBRUQsS0FBSyxVQUFVLHdCQUF3QixDQUFDLElBQVk7SUFDbkQsSUFBSSxDQUFDO1FBQ0osT0FBTyxNQUFNLEVBQUUsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO0lBQ2pFLENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2hCLE9BQU8sQ0FBQyxJQUFJLENBQUMseURBQXlELEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDaEYsQ0FBQztJQUVELGtEQUFrRDtJQUNsRCxpREFBaUQ7SUFDakQsY0FBYztJQUNkLHFEQUFxRDtJQUNyRCxvREFBb0Q7SUFDcEQsZ0RBQWdEO0lBQ2hELE1BQU0sTUFBTSxHQUFjLEVBQUUsQ0FBQztJQUM3QixNQUFNLFFBQVEsR0FBRyxNQUFNLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNyQyxLQUFLLE1BQU0sS0FBSyxJQUFJLFFBQVEsRUFBRSxDQUFDO1FBQzlCLElBQUksTUFBTSxHQUFHLEtBQUssQ0FBQztRQUNuQixJQUFJLFdBQVcsR0FBRyxLQUFLLENBQUM7UUFDeEIsSUFBSSxjQUFjLEdBQUcsS0FBSyxDQUFDO1FBRTNCLElBQUksQ0FBQztZQUNKLE1BQU0sS0FBSyxHQUFHLE1BQU0sRUFBRSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDO1lBRXpELE1BQU0sR0FBRyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDeEIsV0FBVyxHQUFHLEtBQUssQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUNsQyxjQUFjLEdBQUcsS0FBSyxDQUFDLGNBQWMsRUFBRSxDQUFDO1FBQ3pDLENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2hCLE9BQU8sQ0FBQyxJQUFJLENBQUMsMERBQTBELEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDakYsQ0FBQztRQUVELE1BQU0sQ0FBQyxJQUFJLENBQUM7WUFDWCxJQUFJLEVBQUUsS0FBSztZQUNYLE1BQU0sRUFBRSxHQUFHLEVBQUUsQ0FBQyxNQUFNO1lBQ3BCLFdBQVcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxXQUFXO1lBQzlCLGNBQWMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxjQUFjO1NBQ3BDLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRCxPQUFPLE1BQU0sQ0FBQztBQUNmLENBQUM7QUFFRDs7OztHQUlHO0FBQ0gsTUFBTSxVQUFVLFdBQVcsQ0FBQyxJQUFZO0lBQ3ZDLE9BQU8sdUJBQXVCLENBQUMsRUFBRSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0FBQ3RELENBQUM7QUFLRCxTQUFTLHVCQUF1QixDQUFDLFFBQThCO0lBQzlELE9BQU8sUUFBUSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRTtRQUUzQixzREFBc0Q7UUFDdEQsc0RBQXNEO1FBRXRELElBQUksT0FBTyxLQUFLLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDL0IsT0FBTyxXQUFXLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO1FBQ2xELENBQUM7UUFFRCxLQUFLLENBQUMsSUFBSSxHQUFHLFdBQVcsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQztRQUVqRSxPQUFPLEtBQUssQ0FBQztJQUNkLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQUVEOzs7R0FHRztBQUNILEtBQUssVUFBVSxhQUFhLENBQUMsT0FBZTtJQUMzQyxNQUFNLFFBQVEsR0FBRyxNQUFNLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUN4QyxNQUFNLFdBQVcsR0FBYSxFQUFFLENBQUM7SUFFakMsS0FBSyxNQUFNLEtBQUssSUFBSSxRQUFRLEVBQUUsQ0FBQztRQUM5QixJQUFJLE1BQU0sY0FBYyxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQztZQUNoRSxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3pCLENBQUM7SUFDRixDQUFDO0lBRUQsT0FBTyxXQUFXLENBQUM7QUFDcEIsQ0FBQztBQUVELFlBQVk7QUFFWix1QkFBdUI7QUFFdkI7OztHQUdHO0FBQ0gsTUFBTSxVQUFVLFdBQVcsQ0FBQyxJQUFZLEVBQUUsVUFBVSxHQUFHLElBQUk7SUFDMUQsT0FBTyxJQUFJLE9BQU8sQ0FBTyxPQUFPLENBQUMsRUFBRTtRQUNsQyxJQUFJLE9BQU8sR0FBRyxLQUFLLENBQUM7UUFDcEIsTUFBTSxRQUFRLEdBQUcsV0FBVyxDQUFDLEdBQUcsRUFBRTtZQUNqQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQ2QsT0FBTyxHQUFHLElBQUksQ0FBQztnQkFDZixFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsRUFBRTtvQkFDckIsT0FBTyxHQUFHLEtBQUssQ0FBQztvQkFFaEIsSUFBSSxHQUFHLEVBQUUsQ0FBQzt3QkFDVCxhQUFhLENBQUMsUUFBUSxDQUFDLENBQUM7d0JBQ3hCLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQztvQkFDcEIsQ0FBQztnQkFDRixDQUFDLENBQUMsQ0FBQztZQUNKLENBQUM7UUFDRixDQUFDLEVBQUUsVUFBVSxDQUFDLENBQUM7SUFDaEIsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDO0FBRUQsWUFBWTtBQUVaLDZDQUE2QztBQUU3QyxNQUFNLEtBQVcsY0FBYyxDQXVIOUI7QUF2SEQsV0FBaUIsY0FBYztJQWtCOUI7Ozs7O09BS0c7SUFDSSxLQUFLLFVBQVUsSUFBSSxDQUFDLElBQVk7UUFFdEMsc0JBQXNCO1FBQ3RCLElBQUksTUFBNEIsQ0FBQztRQUNqQyxJQUFJLENBQUM7WUFDSixNQUFNLEdBQUcsTUFBTSxFQUFFLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUV2Qyx5REFBeUQ7WUFDekQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxjQUFjLEVBQUUsRUFBRSxDQUFDO2dCQUM5QixPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxDQUFDO1lBQ3pCLENBQUM7UUFDRixDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNoQixpQ0FBaUM7UUFDbEMsQ0FBQztRQUVELGtFQUFrRTtRQUNsRSw4REFBOEQ7UUFDOUQsSUFBSSxDQUFDO1lBQ0osTUFBTSxLQUFLLEdBQUcsTUFBTSxFQUFFLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUUzQyxPQUFPLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxZQUFZLEVBQUUsTUFBTSxFQUFFLGNBQWMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUFFLENBQUM7UUFDbEcsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFFaEIseURBQXlEO1lBQ3pELDJEQUEyRDtZQUMzRCxJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssUUFBUSxJQUFJLE1BQU0sRUFBRSxDQUFDO2dCQUN2QyxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxZQUFZLEVBQUUsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLEVBQUUsQ0FBQztZQUMzRCxDQUFDO1lBRUQseURBQXlEO1lBQ3pELGtFQUFrRTtZQUNsRSxJQUFJLFNBQVMsSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLFFBQVEsRUFBRSxDQUFDO2dCQUMxQyxJQUFJLENBQUM7b0JBQ0osTUFBTSxLQUFLLEdBQUcsTUFBTSxFQUFFLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7b0JBRXZFLE9BQU8sRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLFlBQVksRUFBRSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsRUFBRSxDQUFDO2dCQUMzRCxDQUFDO2dCQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7b0JBRWhCLHlEQUF5RDtvQkFDekQsMkRBQTJEO29CQUMzRCxJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssUUFBUSxJQUFJLE1BQU0sRUFBRSxDQUFDO3dCQUN2QyxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxZQUFZLEVBQUUsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLEVBQUUsQ0FBQztvQkFDM0QsQ0FBQztvQkFFRCxNQUFNLEtBQUssQ0FBQztnQkFDYixDQUFDO1lBQ0YsQ0FBQztZQUVELE1BQU0sS0FBSyxDQUFDO1FBQ2IsQ0FBQztJQUNGLENBQUM7SUFsRHFCLG1CQUFJLE9Ba0R6QixDQUFBO0lBRUQ7Ozs7Ozs7OztPQVNHO0lBQ0ksS0FBSyxVQUFVLFVBQVUsQ0FBQyxJQUFZO1FBQzVDLElBQUksQ0FBQztZQUNKLE1BQU0sRUFBRSxJQUFJLEVBQUUsWUFBWSxFQUFFLEdBQUcsTUFBTSxjQUFjLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBRS9ELE9BQU8sSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLFlBQVksRUFBRSxRQUFRLEtBQUssSUFBSSxDQUFDO1FBQ3pELENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2hCLCtCQUErQjtRQUNoQyxDQUFDO1FBRUQsT0FBTyxLQUFLLENBQUM7SUFDZCxDQUFDO0lBVnFCLHlCQUFVLGFBVS9CLENBQUE7SUFFRDs7Ozs7Ozs7O09BU0c7SUFDSSxLQUFLLFVBQVUsZUFBZSxDQUFDLElBQVk7UUFDakQsSUFBSSxDQUFDO1lBQ0osTUFBTSxFQUFFLElBQUksRUFBRSxZQUFZLEVBQUUsR0FBRyxNQUFNLGNBQWMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7WUFFL0QsT0FBTyxJQUFJLENBQUMsV0FBVyxFQUFFLElBQUksWUFBWSxFQUFFLFFBQVEsS0FBSyxJQUFJLENBQUM7UUFDOUQsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDaEIsK0JBQStCO1FBQ2hDLENBQUM7UUFFRCxPQUFPLEtBQUssQ0FBQztJQUNkLENBQUM7SUFWcUIsOEJBQWUsa0JBVXBDLENBQUE7QUFDRixDQUFDLEVBdkhnQixjQUFjLEtBQWQsY0FBYyxRQXVIOUI7QUFFRCxZQUFZO0FBRVosb0JBQW9CO0FBRXBCLHNIQUFzSDtBQUN0SCxpSEFBaUg7QUFDakgsNEdBQTRHO0FBQzVHLE1BQU0sV0FBVyxHQUFHLElBQUksYUFBYSxFQUFFLENBQUM7QUFheEMsU0FBUyxTQUFTLENBQUMsSUFBWSxFQUFFLElBQWtDLEVBQUUsT0FBMkI7SUFDL0YsT0FBTyxXQUFXLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsR0FBRyxFQUFFO1FBQ2hELE1BQU0sY0FBYyxHQUFHLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBRW5ELE9BQU8sSUFBSSxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLGNBQWMsRUFBRSxLQUFLLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDdEksQ0FBQyxFQUFFLDBCQUEwQixDQUFDLENBQUM7QUFDaEMsQ0FBQztBQVlELElBQUksUUFBUSxHQUFHLElBQUksQ0FBQztBQUNwQixNQUFNLFVBQVUscUJBQXFCLENBQUMsT0FBZ0I7SUFDckQsUUFBUSxHQUFHLE9BQU8sQ0FBQztBQUNwQixDQUFDO0FBRUQsaUZBQWlGO0FBQ2pGLGdGQUFnRjtBQUNoRixxQkFBcUI7QUFDckIsRUFBRTtBQUNGLGtFQUFrRTtBQUNsRSxTQUFTLG1CQUFtQixDQUFDLElBQVksRUFBRSxJQUFrQyxFQUFFLE9BQWlDLEVBQUUsUUFBdUM7SUFDeEosSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQ2YsT0FBTyxFQUFFLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsRUFBRSxJQUFJLEVBQUUsT0FBTyxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsT0FBTyxDQUFDLElBQUksRUFBRSxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBQ3ZGLENBQUM7SUFFRCwyREFBMkQ7SUFDM0QsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUMsU0FBUyxFQUFFLEVBQUUsRUFBRSxFQUFFO1FBQzNELElBQUksU0FBUyxFQUFFLENBQUM7WUFDZixPQUFPLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUM1QixDQUFDO1FBRUQsd0ZBQXdGO1FBQ3hGLEVBQUUsQ0FBQyxTQUFTLENBQUMsRUFBRSxFQUFFLElBQUksRUFBRSxVQUFVLENBQUMsRUFBRTtZQUNuQyxJQUFJLFVBQVUsRUFBRSxDQUFDO2dCQUNoQixPQUFPLEVBQUUsQ0FBQyxLQUFLLENBQUMsRUFBRSxFQUFFLEdBQUcsRUFBRSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsMkNBQTJDO1lBQzdGLENBQUM7WUFFRCxvREFBb0Q7WUFDcEQsa0RBQWtEO1lBQ2xELEVBQUUsQ0FBQyxTQUFTLENBQUMsRUFBRSxFQUFFLENBQUMsU0FBdUIsRUFBRSxFQUFFO2dCQUU1QyxvRUFBb0U7Z0JBQ3BFLDJEQUEyRDtnQkFDM0QsSUFBSSxTQUFTLEVBQUUsQ0FBQztvQkFDZixPQUFPLENBQUMsSUFBSSxDQUFDLDZFQUE2RSxFQUFFLFNBQVMsQ0FBQyxDQUFDO29CQUN2RyxxQkFBcUIsQ0FBQyxLQUFLLENBQUMsQ0FBQztnQkFDOUIsQ0FBQztnQkFFRCxPQUFPLEVBQUUsQ0FBQyxLQUFLLENBQUMsRUFBRSxFQUFFLFVBQVUsQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7WUFDekQsQ0FBQyxDQUFDLENBQUM7UUFDSixDQUFDLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQUVEOzs7O0dBSUc7QUFDSCxNQUFNLFVBQVUsYUFBYSxDQUFDLElBQVksRUFBRSxJQUFxQixFQUFFLE9BQTJCO0lBQzdGLE1BQU0sY0FBYyxHQUFHLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBRW5ELElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUNmLE9BQU8sRUFBRSxDQUFDLGFBQWEsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLEVBQUUsSUFBSSxFQUFFLGNBQWMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLGNBQWMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO0lBQy9GLENBQUM7SUFFRCwyREFBMkQ7SUFDM0QsTUFBTSxFQUFFLEdBQUcsRUFBRSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsY0FBYyxDQUFDLElBQUksRUFBRSxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUM7SUFFdkUsSUFBSSxDQUFDO1FBRUosd0ZBQXdGO1FBQ3hGLEVBQUUsQ0FBQyxhQUFhLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBRTNCLG9EQUFvRDtRQUNwRCxJQUFJLENBQUM7WUFDSixFQUFFLENBQUMsYUFBYSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsa0RBQWtEO1FBQ3pFLENBQUM7UUFBQyxPQUFPLFNBQVMsRUFBRSxDQUFDO1lBQ3BCLE9BQU8sQ0FBQyxJQUFJLENBQUMsaUZBQWlGLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFDM0cscUJBQXFCLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDOUIsQ0FBQztJQUNGLENBQUM7WUFBUyxDQUFDO1FBQ1YsRUFBRSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUNsQixDQUFDO0FBQ0YsQ0FBQztBQUVELFNBQVMsa0JBQWtCLENBQUMsT0FBMkI7SUFDdEQsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ2QsT0FBTyxFQUFFLElBQUksRUFBRSxLQUFLLENBQUMsb0NBQW9DLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxDQUFDO0lBQ3hFLENBQUM7SUFFRCxPQUFPO1FBQ04sSUFBSSxFQUFFLE9BQU8sT0FBTyxDQUFDLElBQUksS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxvQ0FBb0M7UUFDbEcsSUFBSSxFQUFFLE9BQU8sT0FBTyxDQUFDLElBQUksS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUc7S0FDM0QsQ0FBQztBQUNILENBQUM7QUFFRCxZQUFZO0FBRVoscUJBQXFCO0FBRXJCOzs7O0dBSUc7QUFDSCxLQUFLLFVBQVUsTUFBTSxDQUFDLE1BQWMsRUFBRSxNQUFjLEVBQUUsc0JBQXNDLEtBQUs7SUFDaEcsSUFBSSxNQUFNLEtBQUssTUFBTSxFQUFFLENBQUM7UUFDdkIsT0FBTyxDQUFFLGdFQUFnRTtJQUMxRSxDQUFDO0lBRUQsSUFBSSxDQUFDO1FBQ0osSUFBSSxTQUFTLElBQUksT0FBTyxtQkFBbUIsS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUMxRCw2REFBNkQ7WUFDN0QsNEJBQTRCO1lBQzVCLE1BQU0sZUFBZSxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxFQUFFLG1CQUFtQixDQUFDLENBQUM7UUFDeEUsQ0FBQzthQUFNLENBQUM7WUFDUCxNQUFNLEVBQUUsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQztRQUMxQyxDQUFDO0lBQ0YsQ0FBQztJQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7UUFDaEIsdURBQXVEO1FBQ3ZELEVBQUU7UUFDRixnRkFBZ0Y7UUFDaEYsMkVBQTJFO1FBQzNFLHNDQUFzQztRQUN0QyxFQUFFO1FBQ0YsK0VBQStFO1FBQy9FLHlEQUF5RDtRQUN6RCxJQUFJLE1BQU0sQ0FBQyxXQUFXLEVBQUUsS0FBSyxNQUFNLENBQUMsV0FBVyxFQUFFLElBQUksS0FBSyxDQUFDLElBQUksS0FBSyxPQUFPLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ3JHLE1BQU0sSUFBSSxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsRUFBRSxnQkFBZ0IsRUFBRSxLQUFLLENBQUMsK0JBQStCLEVBQUUsQ0FBQyxDQUFDO1lBQ3hGLE1BQU0sTUFBTSxDQUFDLE1BQU0sRUFBRSxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDdkMsQ0FBQzthQUFNLENBQUM7WUFDUCxNQUFNLEtBQUssQ0FBQztRQUNiLENBQUM7SUFDRixDQUFDO0FBQ0YsQ0FBQztBQUVELEtBQUssVUFBVSxlQUFlLENBQUMsTUFBYyxFQUFFLE1BQWMsRUFBRSxTQUFpQixFQUFFLFlBQW9CLEVBQUUsT0FBTyxHQUFHLENBQUM7SUFDbEgsSUFBSSxDQUFDO1FBQ0osT0FBTyxNQUFNLEVBQUUsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQztJQUNqRCxDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNoQixJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssUUFBUSxJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssT0FBTyxJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssT0FBTyxFQUFFLENBQUM7WUFDakYsTUFBTSxLQUFLLENBQUMsQ0FBQyx5Q0FBeUM7UUFDdkQsQ0FBQztRQUVELElBQUksSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLFNBQVMsSUFBSSxZQUFZLEVBQUUsQ0FBQztZQUM1QyxPQUFPLENBQUMsS0FBSyxDQUFDLG9DQUFvQyxPQUFPLHdCQUF3QixLQUFLLEVBQUUsQ0FBQyxDQUFDO1lBRTFGLE1BQU0sS0FBSyxDQUFDLENBQUMscUNBQXFDO1FBQ25ELENBQUM7UUFFRCxJQUFJLE9BQU8sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUNuQixJQUFJLFVBQVUsR0FBRyxLQUFLLENBQUM7WUFDdkIsSUFBSSxDQUFDO2dCQUNKLE1BQU0sRUFBRSxJQUFJLEVBQUUsR0FBRyxNQUFNLGNBQWMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQ25ELElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQztvQkFDcEIsVUFBVSxHQUFHLElBQUksQ0FBQyxDQUFDLHdGQUF3RjtnQkFDNUcsQ0FBQztZQUNGLENBQUM7WUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO2dCQUNoQixTQUFTO1lBQ1YsQ0FBQztZQUVELElBQUksVUFBVSxFQUFFLENBQUM7Z0JBQ2hCLE1BQU0sS0FBSyxDQUFDO1lBQ2IsQ0FBQztRQUNGLENBQUM7UUFFRCw2Q0FBNkM7UUFDN0MsTUFBTSxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsT0FBTyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFM0MsZ0JBQWdCO1FBQ2hCLE9BQU8sZUFBZSxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsU0FBUyxFQUFFLFlBQVksRUFBRSxPQUFPLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFDOUUsQ0FBQztBQUNGLENBQUM7QUFRRDs7Ozs7O0dBTUc7QUFDSCxLQUFLLFVBQVUsSUFBSSxDQUFDLE1BQWMsRUFBRSxNQUFjLEVBQUUsT0FBc0M7SUFDekYsT0FBTyxNQUFNLENBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxFQUFFLElBQUksRUFBRSxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsRUFBRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsSUFBSSxHQUFHLEVBQVUsRUFBRSxDQUFDLENBQUM7QUFDN0csQ0FBQztBQUVELDhEQUE4RDtBQUM5RCw4REFBOEQ7QUFDOUQsZ0VBQWdFO0FBQ2hFLGlGQUFpRjtBQUNqRixNQUFNLGNBQWMsR0FBRyxLQUFLLENBQUM7QUFFN0IsS0FBSyxVQUFVLE1BQU0sQ0FBQyxNQUFjLEVBQUUsTUFBYyxFQUFFLE9BQXFCO0lBRTFFLGdEQUFnRDtJQUNoRCw2Q0FBNkM7SUFDN0MsSUFBSSxPQUFPLENBQUMsa0JBQWtCLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7UUFDNUMsT0FBTztJQUNSLENBQUM7U0FBTSxDQUFDO1FBQ1AsT0FBTyxDQUFDLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUN4QyxDQUFDO0lBRUQsTUFBTSxFQUFFLElBQUksRUFBRSxZQUFZLEVBQUUsR0FBRyxNQUFNLGNBQWMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7SUFFakUsVUFBVTtJQUNWLElBQUksWUFBWSxFQUFFLENBQUM7UUFFbEIsZ0VBQWdFO1FBQ2hFLElBQUksT0FBTyxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1lBQ3RDLElBQUksQ0FBQztnQkFDSixPQUFPLE1BQU0sYUFBYSxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsT0FBTyxDQUFDLENBQUM7WUFDckQsQ0FBQztZQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7Z0JBQ2hCLG9FQUFvRTtZQUNyRSxDQUFDO1FBQ0YsQ0FBQztRQUVELElBQUksWUFBWSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQzNCLE9BQU8sQ0FBQyxnR0FBZ0c7UUFDekcsQ0FBQztJQUNGLENBQUM7SUFFRCxTQUFTO0lBQ1QsSUFBSSxJQUFJLENBQUMsV0FBVyxFQUFFLEVBQUUsQ0FBQztRQUN4QixPQUFPLGVBQWUsQ0FBQyxNQUFNLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxJQUFJLEdBQUcsY0FBYyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQzdFLENBQUM7SUFFRCxvQkFBb0I7U0FDZixDQUFDO1FBQ0wsT0FBTyxVQUFVLENBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsSUFBSSxHQUFHLGNBQWMsQ0FBQyxDQUFDO0lBQy9ELENBQUM7QUFDRixDQUFDO0FBRUQsS0FBSyxVQUFVLGVBQWUsQ0FBQyxNQUFjLEVBQUUsTUFBYyxFQUFFLElBQVksRUFBRSxPQUFxQjtJQUVqRyxnQkFBZ0I7SUFDaEIsTUFBTSxFQUFFLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7SUFFM0QsNkJBQTZCO0lBQzdCLE1BQU0sS0FBSyxHQUFHLE1BQU0sT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ3BDLEtBQUssTUFBTSxJQUFJLElBQUksS0FBSyxFQUFFLENBQUM7UUFDMUIsTUFBTSxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQy9ELENBQUM7QUFDRixDQUFDO0FBRUQsS0FBSyxVQUFVLFVBQVUsQ0FBQyxNQUFjLEVBQUUsTUFBYyxFQUFFLElBQVk7SUFFckUsWUFBWTtJQUNaLE1BQU0sRUFBRSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBRTNDLDREQUE0RDtJQUM1RCxNQUFNLEVBQUUsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQztBQUN2QyxDQUFDO0FBRUQsS0FBSyxVQUFVLGFBQWEsQ0FBQyxNQUFjLEVBQUUsTUFBYyxFQUFFLE9BQXFCO0lBRWpGLHlCQUF5QjtJQUN6QixJQUFJLFVBQVUsR0FBRyxNQUFNLEVBQUUsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBRXBELHVEQUF1RDtJQUN2RCx5REFBeUQ7SUFDekQsc0RBQXNEO0lBQ3RELGlCQUFpQjtJQUNqQixJQUFJLGVBQWUsQ0FBQyxVQUFVLEVBQUUsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1FBQ2hFLFVBQVUsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsVUFBVSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUMzRixDQUFDO0lBRUQsaUJBQWlCO0lBQ2pCLE1BQU0sRUFBRSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFLE1BQU0sQ0FBQyxDQUFDO0FBQy9DLENBQUM7QUFFRCxZQUFZO0FBRVosa0NBQWtDO0FBRWxDOzs7Ozs7Ozs7R0FTRztBQUNILE1BQU0sQ0FBQyxNQUFNLFFBQVEsR0FBRyxJQUFJO0lBRTNCLGdDQUFnQztJQUVoQyxJQUFJLElBQUk7UUFFUCxzREFBc0Q7UUFDdEQsdURBQXVEO1FBQ3ZELHFEQUFxRDtRQUVyRCxPQUFPLENBQUMsRUFBVSxFQUFFLE1BQWtCLEVBQUUsTUFBYyxFQUFFLE1BQWMsRUFBRSxRQUF1QixFQUFFLEVBQUU7WUFDbEcsT0FBTyxJQUFJLE9BQU8sQ0FBNEMsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLEVBQUU7Z0JBQ2pGLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxDQUFDLEdBQUcsRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLEVBQUU7b0JBQ3hFLElBQUksR0FBRyxFQUFFLENBQUM7d0JBQ1QsT0FBTyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7b0JBQ3BCLENBQUM7b0JBRUQsT0FBTyxPQUFPLENBQUMsRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQztnQkFDdkMsQ0FBQyxDQUFDLENBQUM7WUFDSixDQUFDLENBQUMsQ0FBQztRQUNKLENBQUMsQ0FBQztJQUNILENBQUM7SUFFRCxJQUFJLEtBQUs7UUFFUixzREFBc0Q7UUFDdEQsdURBQXVEO1FBQ3ZELHdEQUF3RDtRQUV4RCxPQUFPLENBQUMsRUFBVSxFQUFFLE1BQWtCLEVBQUUsTUFBaUMsRUFBRSxNQUFpQyxFQUFFLFFBQW1DLEVBQUUsRUFBRTtZQUNwSixPQUFPLElBQUksT0FBTyxDQUErQyxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsRUFBRTtnQkFDcEYsRUFBRSxDQUFDLEtBQUssQ0FBQyxFQUFFLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLENBQUMsR0FBRyxFQUFFLFlBQVksRUFBRSxNQUFNLEVBQUUsRUFBRTtvQkFDNUUsSUFBSSxHQUFHLEVBQUUsQ0FBQzt3QkFDVCxPQUFPLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztvQkFDcEIsQ0FBQztvQkFFRCxPQUFPLE9BQU8sQ0FBQyxFQUFFLFlBQVksRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDO2dCQUMxQyxDQUFDLENBQUMsQ0FBQztZQUNKLENBQUMsQ0FBQyxDQUFDO1FBQ0osQ0FBQyxDQUFDO0lBQ0gsQ0FBQztJQUVELElBQUksU0FBUyxLQUFLLE9BQU8sU0FBUyxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxpQ0FBaUM7SUFFckYsSUFBSSxJQUFJLEtBQUssT0FBTyxTQUFTLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFJLGdEQUFnRDtJQUM3RixJQUFJLEtBQUssS0FBSyxPQUFPLFNBQVMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUcsbUVBQW1FO0lBRWpILElBQUksUUFBUSxLQUFLLE9BQU8sU0FBUyxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyw0RUFBNEU7SUFFOUgsSUFBSSxTQUFTLEtBQUssT0FBTyxTQUFTLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGlDQUFpQztJQUVyRixZQUFZO0lBRVosMkJBQTJCO0lBRTNCLEtBQUssQ0FBQyxNQUFNLENBQUMsSUFBWTtRQUN4QixJQUFJLENBQUM7WUFDSixNQUFNLEVBQUUsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBRS9CLE9BQU8sSUFBSSxDQUFDO1FBQ2IsQ0FBQztRQUFDLE1BQU0sQ0FBQztZQUNSLE9BQU8sS0FBSyxDQUFDO1FBQ2QsQ0FBQztJQUNGLENBQUM7SUFFRCxJQUFJLE9BQU8sS0FBSyxPQUFPLE9BQU8sQ0FBQyxDQUFDLENBQUM7SUFDakMsSUFBSSxhQUFhLEtBQUssT0FBTyxhQUFhLENBQUMsQ0FBQyxDQUFDO0lBRTdDLElBQUksU0FBUyxLQUFLLE9BQU8sU0FBUyxDQUFDLENBQUMsQ0FBQztJQUVyQyxJQUFJLEVBQUUsS0FBSyxPQUFPLE1BQU0sQ0FBQyxDQUFDLENBQUM7SUFFM0IsSUFBSSxNQUFNLEtBQUssT0FBTyxNQUFNLENBQUMsQ0FBQyxDQUFDO0lBQy9CLElBQUksSUFBSSxLQUFLLE9BQU8sSUFBSSxDQUFDLENBQUMsQ0FBQztDQUczQixDQUFDO0FBRUYsWUFBWSJ9