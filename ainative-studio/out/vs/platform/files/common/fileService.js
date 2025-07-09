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
var FileService_1;
import { coalesce } from '../../../base/common/arrays.js';
import { Promises, ResourceQueue } from '../../../base/common/async.js';
import { bufferedStreamToBuffer, bufferToReadable, newWriteableBufferStream, readableToBuffer, streamToBuffer, VSBuffer } from '../../../base/common/buffer.js';
import { CancellationToken, CancellationTokenSource } from '../../../base/common/cancellation.js';
import { Emitter } from '../../../base/common/event.js';
import { hash } from '../../../base/common/hash.js';
import { Iterable } from '../../../base/common/iterator.js';
import { Disposable, DisposableStore, dispose, toDisposable } from '../../../base/common/lifecycle.js';
import { TernarySearchTree } from '../../../base/common/ternarySearchTree.js';
import { Schemas } from '../../../base/common/network.js';
import { mark } from '../../../base/common/performance.js';
import { extUri, extUriIgnorePathCase, isAbsolutePath } from '../../../base/common/resources.js';
import { consumeStream, isReadableBufferedStream, isReadableStream, listenStream, newWriteableStream, peekReadable, peekStream, transform } from '../../../base/common/stream.js';
import { localize } from '../../../nls.js';
import { ensureFileSystemProviderError, etag, ETAG_DISABLED, FileChangesEvent, FileOperationError, FileOperationEvent, FilePermission, FileSystemProviderErrorCode, FileType, hasFileAtomicReadCapability, hasFileFolderCopyCapability, hasFileReadStreamCapability, hasOpenReadWriteCloseCapability, hasReadWriteCapability, NotModifiedSinceFileOperationError, toFileOperationResult, toFileSystemProviderErrorCode, hasFileCloneCapability, TooLargeFileOperationError, hasFileAtomicDeleteCapability, hasFileAtomicWriteCapability } from './files.js';
import { readFileIntoStream } from './io.js';
import { ILogService } from '../../log/common/log.js';
import { ErrorNoTelemetry } from '../../../base/common/errors.js';
let FileService = class FileService extends Disposable {
    static { FileService_1 = this; }
    constructor(logService) {
        super();
        this.logService = logService;
        // Choose a buffer size that is a balance between memory needs and
        // manageable IPC overhead. The larger the buffer size, the less
        // roundtrips we have to do for reading/writing data.
        this.BUFFER_SIZE = 256 * 1024;
        //#region File System Provider
        this._onDidChangeFileSystemProviderRegistrations = this._register(new Emitter());
        this.onDidChangeFileSystemProviderRegistrations = this._onDidChangeFileSystemProviderRegistrations.event;
        this._onWillActivateFileSystemProvider = this._register(new Emitter());
        this.onWillActivateFileSystemProvider = this._onWillActivateFileSystemProvider.event;
        this._onDidChangeFileSystemProviderCapabilities = this._register(new Emitter());
        this.onDidChangeFileSystemProviderCapabilities = this._onDidChangeFileSystemProviderCapabilities.event;
        this.provider = new Map();
        //#endregion
        //#region Operation events
        this._onDidRunOperation = this._register(new Emitter());
        this.onDidRunOperation = this._onDidRunOperation.event;
        //#endregion
        //#region File Watching
        this.internalOnDidFilesChange = this._register(new Emitter());
        this._onDidUncorrelatedFilesChange = this._register(new Emitter());
        this.onDidFilesChange = this._onDidUncorrelatedFilesChange.event; // global `onDidFilesChange` skips correlated events
        this._onDidWatchError = this._register(new Emitter());
        this.onDidWatchError = this._onDidWatchError.event;
        this.activeWatchers = new Map();
        //#endregion
        //#region Helpers
        this.writeQueue = this._register(new ResourceQueue());
    }
    registerProvider(scheme, provider) {
        if (this.provider.has(scheme)) {
            throw new Error(`A filesystem provider for the scheme '${scheme}' is already registered.`);
        }
        mark(`code/registerFilesystem/${scheme}`);
        const providerDisposables = new DisposableStore();
        // Add provider with event
        this.provider.set(scheme, provider);
        this._onDidChangeFileSystemProviderRegistrations.fire({ added: true, scheme, provider });
        // Forward events from provider
        providerDisposables.add(provider.onDidChangeFile(changes => {
            const event = new FileChangesEvent(changes, !this.isPathCaseSensitive(provider));
            // Always emit any event internally
            this.internalOnDidFilesChange.fire(event);
            // Only emit uncorrelated events in the global `onDidFilesChange` event
            if (!event.hasCorrelation()) {
                this._onDidUncorrelatedFilesChange.fire(event);
            }
        }));
        if (typeof provider.onDidWatchError === 'function') {
            providerDisposables.add(provider.onDidWatchError(error => this._onDidWatchError.fire(new Error(error))));
        }
        providerDisposables.add(provider.onDidChangeCapabilities(() => this._onDidChangeFileSystemProviderCapabilities.fire({ provider, scheme })));
        return toDisposable(() => {
            this._onDidChangeFileSystemProviderRegistrations.fire({ added: false, scheme, provider });
            this.provider.delete(scheme);
            dispose(providerDisposables);
        });
    }
    getProvider(scheme) {
        return this.provider.get(scheme);
    }
    async activateProvider(scheme) {
        // Emit an event that we are about to activate a provider with the given scheme.
        // Listeners can participate in the activation by registering a provider for it.
        const joiners = [];
        this._onWillActivateFileSystemProvider.fire({
            scheme,
            join(promise) {
                joiners.push(promise);
            },
        });
        if (this.provider.has(scheme)) {
            return; // provider is already here so we can return directly
        }
        // If the provider is not yet there, make sure to join on the listeners assuming
        // that it takes a bit longer to register the file system provider.
        await Promises.settled(joiners);
    }
    async canHandleResource(resource) {
        // Await activation of potentially extension contributed providers
        await this.activateProvider(resource.scheme);
        return this.hasProvider(resource);
    }
    hasProvider(resource) {
        return this.provider.has(resource.scheme);
    }
    hasCapability(resource, capability) {
        const provider = this.provider.get(resource.scheme);
        return !!(provider && (provider.capabilities & capability));
    }
    listCapabilities() {
        return Iterable.map(this.provider, ([scheme, provider]) => ({ scheme, capabilities: provider.capabilities }));
    }
    async withProvider(resource) {
        // Assert path is absolute
        if (!isAbsolutePath(resource)) {
            throw new FileOperationError(localize('invalidPath', "Unable to resolve filesystem provider with relative file path '{0}'", this.resourceForError(resource)), 8 /* FileOperationResult.FILE_INVALID_PATH */);
        }
        // Activate provider
        await this.activateProvider(resource.scheme);
        // Assert provider
        const provider = this.provider.get(resource.scheme);
        if (!provider) {
            const error = new ErrorNoTelemetry();
            error.message = localize('noProviderFound', "ENOPRO: No file system provider found for resource '{0}'", resource.toString());
            throw error;
        }
        return provider;
    }
    async withReadProvider(resource) {
        const provider = await this.withProvider(resource);
        if (hasOpenReadWriteCloseCapability(provider) || hasReadWriteCapability(provider) || hasFileReadStreamCapability(provider)) {
            return provider;
        }
        throw new Error(`Filesystem provider for scheme '${resource.scheme}' neither has FileReadWrite, FileReadStream nor FileOpenReadWriteClose capability which is needed for the read operation.`);
    }
    async withWriteProvider(resource) {
        const provider = await this.withProvider(resource);
        if (hasOpenReadWriteCloseCapability(provider) || hasReadWriteCapability(provider)) {
            return provider;
        }
        throw new Error(`Filesystem provider for scheme '${resource.scheme}' neither has FileReadWrite nor FileOpenReadWriteClose capability which is needed for the write operation.`);
    }
    async resolve(resource, options) {
        try {
            return await this.doResolveFile(resource, options);
        }
        catch (error) {
            // Specially handle file not found case as file operation result
            if (toFileSystemProviderErrorCode(error) === FileSystemProviderErrorCode.FileNotFound) {
                throw new FileOperationError(localize('fileNotFoundError', "Unable to resolve nonexistent file '{0}'", this.resourceForError(resource)), 1 /* FileOperationResult.FILE_NOT_FOUND */);
            }
            // Bubble up any other error as is
            throw ensureFileSystemProviderError(error);
        }
    }
    async doResolveFile(resource, options) {
        const provider = await this.withProvider(resource);
        const isPathCaseSensitive = this.isPathCaseSensitive(provider);
        const resolveTo = options?.resolveTo;
        const resolveSingleChildDescendants = options?.resolveSingleChildDescendants;
        const resolveMetadata = options?.resolveMetadata;
        const stat = await provider.stat(resource);
        let trie;
        return this.toFileStat(provider, resource, stat, undefined, !!resolveMetadata, (stat, siblings) => {
            // lazy trie to check for recursive resolving
            if (!trie) {
                trie = TernarySearchTree.forUris(() => !isPathCaseSensitive);
                trie.set(resource, true);
                if (resolveTo) {
                    trie.fill(true, resolveTo);
                }
            }
            // check for recursive resolving
            if (trie.get(stat.resource) || trie.findSuperstr(stat.resource.with({ query: null, fragment: null } /* required for https://github.com/microsoft/vscode/issues/128151 */))) {
                return true;
            }
            // check for resolving single child folders
            if (stat.isDirectory && resolveSingleChildDescendants) {
                return siblings === 1;
            }
            return false;
        });
    }
    async toFileStat(provider, resource, stat, siblings, resolveMetadata, recurse) {
        const { providerExtUri } = this.getExtUri(provider);
        // convert to file stat
        const fileStat = {
            resource,
            name: providerExtUri.basename(resource),
            isFile: (stat.type & FileType.File) !== 0,
            isDirectory: (stat.type & FileType.Directory) !== 0,
            isSymbolicLink: (stat.type & FileType.SymbolicLink) !== 0,
            mtime: stat.mtime,
            ctime: stat.ctime,
            size: stat.size,
            readonly: Boolean((stat.permissions ?? 0) & FilePermission.Readonly) || Boolean(provider.capabilities & 2048 /* FileSystemProviderCapabilities.Readonly */),
            locked: Boolean((stat.permissions ?? 0) & FilePermission.Locked),
            etag: etag({ mtime: stat.mtime, size: stat.size }),
            children: undefined
        };
        // check to recurse for directories
        if (fileStat.isDirectory && recurse(fileStat, siblings)) {
            try {
                const entries = await provider.readdir(resource);
                const resolvedEntries = await Promises.settled(entries.map(async ([name, type]) => {
                    try {
                        const childResource = providerExtUri.joinPath(resource, name);
                        const childStat = resolveMetadata ? await provider.stat(childResource) : { type };
                        return await this.toFileStat(provider, childResource, childStat, entries.length, resolveMetadata, recurse);
                    }
                    catch (error) {
                        this.logService.trace(error);
                        return null; // can happen e.g. due to permission errors
                    }
                }));
                // make sure to get rid of null values that signal a failure to resolve a particular entry
                fileStat.children = coalesce(resolvedEntries);
            }
            catch (error) {
                this.logService.trace(error);
                fileStat.children = []; // gracefully handle errors, we may not have permissions to read
            }
            return fileStat;
        }
        return fileStat;
    }
    async resolveAll(toResolve) {
        return Promises.settled(toResolve.map(async (entry) => {
            try {
                return { stat: await this.doResolveFile(entry.resource, entry.options), success: true };
            }
            catch (error) {
                this.logService.trace(error);
                return { stat: undefined, success: false };
            }
        }));
    }
    async stat(resource) {
        const provider = await this.withProvider(resource);
        const stat = await provider.stat(resource);
        return this.toFileStat(provider, resource, stat, undefined, true, () => false /* Do not resolve any children */);
    }
    async exists(resource) {
        const provider = await this.withProvider(resource);
        try {
            const stat = await provider.stat(resource);
            return !!stat;
        }
        catch (error) {
            return false;
        }
    }
    //#endregion
    //#region File Reading/Writing
    async canCreateFile(resource, options) {
        try {
            await this.doValidateCreateFile(resource, options);
        }
        catch (error) {
            return error;
        }
        return true;
    }
    async doValidateCreateFile(resource, options) {
        // validate overwrite
        if (!options?.overwrite && await this.exists(resource)) {
            throw new FileOperationError(localize('fileExists', "Unable to create file '{0}' that already exists when overwrite flag is not set", this.resourceForError(resource)), 3 /* FileOperationResult.FILE_MODIFIED_SINCE */, options);
        }
    }
    async createFile(resource, bufferOrReadableOrStream = VSBuffer.fromString(''), options) {
        // validate
        await this.doValidateCreateFile(resource, options);
        // do write into file (this will create it too)
        const fileStat = await this.writeFile(resource, bufferOrReadableOrStream);
        // events
        this._onDidRunOperation.fire(new FileOperationEvent(resource, 0 /* FileOperation.CREATE */, fileStat));
        return fileStat;
    }
    async writeFile(resource, bufferOrReadableOrStream, options) {
        const provider = this.throwIfFileSystemIsReadonly(await this.withWriteProvider(resource), resource);
        const { providerExtUri } = this.getExtUri(provider);
        let writeFileOptions = options;
        if (hasFileAtomicWriteCapability(provider) && !writeFileOptions?.atomic) {
            const enforcedAtomicWrite = provider.enforceAtomicWriteFile?.(resource);
            if (enforcedAtomicWrite) {
                writeFileOptions = { ...options, atomic: enforcedAtomicWrite };
            }
        }
        try {
            // validate write (this may already return a peeked-at buffer)
            let { stat, buffer: bufferOrReadableOrStreamOrBufferedStream } = await this.validateWriteFile(provider, resource, bufferOrReadableOrStream, writeFileOptions);
            // mkdir recursively as needed
            if (!stat) {
                await this.mkdirp(provider, providerExtUri.dirname(resource));
            }
            // optimization: if the provider has unbuffered write capability and the data
            // to write is not a buffer, we consume up to 3 chunks and try to write the data
            // unbuffered to reduce the overhead. If the stream or readable has more data
            // to provide we continue to write buffered.
            if (!bufferOrReadableOrStreamOrBufferedStream) {
                bufferOrReadableOrStreamOrBufferedStream = await this.peekBufferForWriting(provider, bufferOrReadableOrStream);
            }
            // write file: unbuffered
            if (!hasOpenReadWriteCloseCapability(provider) || // buffered writing is unsupported
                (hasReadWriteCapability(provider) && bufferOrReadableOrStreamOrBufferedStream instanceof VSBuffer) || // data is a full buffer already
                (hasReadWriteCapability(provider) && hasFileAtomicWriteCapability(provider) && writeFileOptions?.atomic) // atomic write forces unbuffered write if the provider supports it
            ) {
                await this.doWriteUnbuffered(provider, resource, writeFileOptions, bufferOrReadableOrStreamOrBufferedStream);
            }
            // write file: buffered
            else {
                await this.doWriteBuffered(provider, resource, writeFileOptions, bufferOrReadableOrStreamOrBufferedStream instanceof VSBuffer ? bufferToReadable(bufferOrReadableOrStreamOrBufferedStream) : bufferOrReadableOrStreamOrBufferedStream);
            }
            // events
            this._onDidRunOperation.fire(new FileOperationEvent(resource, 4 /* FileOperation.WRITE */));
        }
        catch (error) {
            throw new FileOperationError(localize('err.write', "Unable to write file '{0}' ({1})", this.resourceForError(resource), ensureFileSystemProviderError(error).toString()), toFileOperationResult(error), writeFileOptions);
        }
        return this.resolve(resource, { resolveMetadata: true });
    }
    async peekBufferForWriting(provider, bufferOrReadableOrStream) {
        let peekResult;
        if (hasReadWriteCapability(provider) && !(bufferOrReadableOrStream instanceof VSBuffer)) {
            if (isReadableStream(bufferOrReadableOrStream)) {
                const bufferedStream = await peekStream(bufferOrReadableOrStream, 3);
                if (bufferedStream.ended) {
                    peekResult = VSBuffer.concat(bufferedStream.buffer);
                }
                else {
                    peekResult = bufferedStream;
                }
            }
            else {
                peekResult = peekReadable(bufferOrReadableOrStream, data => VSBuffer.concat(data), 3);
            }
        }
        else {
            peekResult = bufferOrReadableOrStream;
        }
        return peekResult;
    }
    async validateWriteFile(provider, resource, bufferOrReadableOrStream, options) {
        // Validate unlock support
        const unlock = !!options?.unlock;
        if (unlock && !(provider.capabilities & 8192 /* FileSystemProviderCapabilities.FileWriteUnlock */)) {
            throw new Error(localize('writeFailedUnlockUnsupported', "Unable to unlock file '{0}' because provider does not support it.", this.resourceForError(resource)));
        }
        // Validate atomic support
        const atomic = !!options?.atomic;
        if (atomic) {
            if (!(provider.capabilities & 32768 /* FileSystemProviderCapabilities.FileAtomicWrite */)) {
                throw new Error(localize('writeFailedAtomicUnsupported1', "Unable to atomically write file '{0}' because provider does not support it.", this.resourceForError(resource)));
            }
            if (!(provider.capabilities & 2 /* FileSystemProviderCapabilities.FileReadWrite */)) {
                throw new Error(localize('writeFailedAtomicUnsupported2', "Unable to atomically write file '{0}' because provider does not support unbuffered writes.", this.resourceForError(resource)));
            }
            if (unlock) {
                throw new Error(localize('writeFailedAtomicUnlock', "Unable to unlock file '{0}' because atomic write is enabled.", this.resourceForError(resource)));
            }
        }
        // Validate via file stat meta data
        let stat = undefined;
        try {
            stat = await provider.stat(resource);
        }
        catch (error) {
            return Object.create(null); // file might not exist
        }
        // File cannot be directory
        if ((stat.type & FileType.Directory) !== 0) {
            throw new FileOperationError(localize('fileIsDirectoryWriteError', "Unable to write file '{0}' that is actually a directory", this.resourceForError(resource)), 0 /* FileOperationResult.FILE_IS_DIRECTORY */, options);
        }
        // File cannot be readonly
        this.throwIfFileIsReadonly(resource, stat);
        // Dirty write prevention: if the file on disk has been changed and does not match our expected
        // mtime and etag, we bail out to prevent dirty writing.
        //
        // First, we check for a mtime that is in the future before we do more checks. The assumption is
        // that only the mtime is an indicator for a file that has changed on disk.
        //
        // Second, if the mtime has advanced, we compare the size of the file on disk with our previous
        // one using the etag() function. Relying only on the mtime check has prooven to produce false
        // positives due to file system weirdness (especially around remote file systems). As such, the
        // check for size is a weaker check because it can return a false negative if the file has changed
        // but to the same length. This is a compromise we take to avoid having to produce checksums of
        // the file content for comparison which would be much slower to compute.
        //
        // Third, if the etag() turns out to be different, we do one attempt to compare the buffer we
        // are about to write with the contents on disk to figure out if the contents are identical.
        // In that case we allow the writing as it would result in the same contents in the file.
        let buffer;
        if (typeof options?.mtime === 'number' && typeof options.etag === 'string' && options.etag !== ETAG_DISABLED &&
            typeof stat.mtime === 'number' && typeof stat.size === 'number' &&
            options.mtime < stat.mtime && options.etag !== etag({ mtime: options.mtime /* not using stat.mtime for a reason, see above */, size: stat.size })) {
            buffer = await this.peekBufferForWriting(provider, bufferOrReadableOrStream);
            if (buffer instanceof VSBuffer && buffer.byteLength === stat.size) {
                try {
                    const { value } = await this.readFile(resource, { limits: { size: stat.size } });
                    if (buffer.equals(value)) {
                        return { stat, buffer }; // allow writing since contents are identical
                    }
                }
                catch (error) {
                    // ignore, throw the FILE_MODIFIED_SINCE error
                }
            }
            throw new FileOperationError(localize('fileModifiedError', "File Modified Since"), 3 /* FileOperationResult.FILE_MODIFIED_SINCE */, options);
        }
        return { stat, buffer };
    }
    async readFile(resource, options, token) {
        const provider = await this.withReadProvider(resource);
        if (options?.atomic) {
            return this.doReadFileAtomic(provider, resource, options, token);
        }
        return this.doReadFile(provider, resource, options, token);
    }
    async doReadFileAtomic(provider, resource, options, token) {
        return new Promise((resolve, reject) => {
            this.writeQueue.queueFor(resource, async () => {
                try {
                    const content = await this.doReadFile(provider, resource, options, token);
                    resolve(content);
                }
                catch (error) {
                    reject(error);
                }
            }, this.getExtUri(provider).providerExtUri);
        });
    }
    async doReadFile(provider, resource, options, token) {
        const stream = await this.doReadFileStream(provider, resource, {
            ...options,
            // optimization: since we know that the caller does not
            // care about buffering, we indicate this to the reader.
            // this reduces all the overhead the buffered reading
            // has (open, read, close) if the provider supports
            // unbuffered reading.
            preferUnbuffered: true
        }, token);
        return {
            ...stream,
            value: await streamToBuffer(stream.value)
        };
    }
    async readFileStream(resource, options, token) {
        const provider = await this.withReadProvider(resource);
        return this.doReadFileStream(provider, resource, options, token);
    }
    async doReadFileStream(provider, resource, options, token) {
        // install a cancellation token that gets cancelled
        // when any error occurs. this allows us to resolve
        // the content of the file while resolving metadata
        // but still cancel the operation in certain cases.
        //
        // in addition, we pass the optional token in that
        // we got from the outside to even allow for external
        // cancellation of the read operation.
        const cancellableSource = new CancellationTokenSource(token);
        let readFileOptions = options;
        if (hasFileAtomicReadCapability(provider) && provider.enforceAtomicReadFile?.(resource)) {
            readFileOptions = { ...options, atomic: true };
        }
        // validate read operation
        const statPromise = this.validateReadFile(resource, readFileOptions).then(stat => stat, error => {
            cancellableSource.dispose(true);
            throw error;
        });
        let fileStream = undefined;
        try {
            // if the etag is provided, we await the result of the validation
            // due to the likelihood of hitting a NOT_MODIFIED_SINCE result.
            // otherwise, we let it run in parallel to the file reading for
            // optimal startup performance.
            if (typeof readFileOptions?.etag === 'string' && readFileOptions.etag !== ETAG_DISABLED) {
                await statPromise;
            }
            // read unbuffered
            if ((readFileOptions?.atomic && hasFileAtomicReadCapability(provider)) || // atomic reads are always unbuffered
                !(hasOpenReadWriteCloseCapability(provider) || hasFileReadStreamCapability(provider)) || // provider has no buffered capability
                (hasReadWriteCapability(provider) && readFileOptions?.preferUnbuffered) // unbuffered read is preferred
            ) {
                fileStream = this.readFileUnbuffered(provider, resource, readFileOptions);
            }
            // read streamed (always prefer over primitive buffered read)
            else if (hasFileReadStreamCapability(provider)) {
                fileStream = this.readFileStreamed(provider, resource, cancellableSource.token, readFileOptions);
            }
            // read buffered
            else {
                fileStream = this.readFileBuffered(provider, resource, cancellableSource.token, readFileOptions);
            }
            fileStream.on('end', () => cancellableSource.dispose());
            fileStream.on('error', () => cancellableSource.dispose());
            const fileStat = await statPromise;
            return {
                ...fileStat,
                value: fileStream
            };
        }
        catch (error) {
            // Await the stream to finish so that we exit this method
            // in a consistent state with file handles closed
            // (https://github.com/microsoft/vscode/issues/114024)
            if (fileStream) {
                await consumeStream(fileStream);
            }
            // Re-throw errors as file operation errors but preserve
            // specific errors (such as not modified since)
            throw this.restoreReadError(error, resource, readFileOptions);
        }
    }
    restoreReadError(error, resource, options) {
        const message = localize('err.read', "Unable to read file '{0}' ({1})", this.resourceForError(resource), ensureFileSystemProviderError(error).toString());
        if (error instanceof NotModifiedSinceFileOperationError) {
            return new NotModifiedSinceFileOperationError(message, error.stat, options);
        }
        if (error instanceof TooLargeFileOperationError) {
            return new TooLargeFileOperationError(message, error.fileOperationResult, error.size, error.options);
        }
        return new FileOperationError(message, toFileOperationResult(error), options);
    }
    readFileStreamed(provider, resource, token, options = Object.create(null)) {
        const fileStream = provider.readFileStream(resource, options, token);
        return transform(fileStream, {
            data: data => data instanceof VSBuffer ? data : VSBuffer.wrap(data),
            error: error => this.restoreReadError(error, resource, options)
        }, data => VSBuffer.concat(data));
    }
    readFileBuffered(provider, resource, token, options = Object.create(null)) {
        const stream = newWriteableBufferStream();
        readFileIntoStream(provider, resource, stream, data => data, {
            ...options,
            bufferSize: this.BUFFER_SIZE,
            errorTransformer: error => this.restoreReadError(error, resource, options)
        }, token);
        return stream;
    }
    readFileUnbuffered(provider, resource, options) {
        const stream = newWriteableStream(data => VSBuffer.concat(data));
        // Read the file into the stream async but do not wait for
        // this to complete because streams work via events
        (async () => {
            try {
                let buffer;
                if (options?.atomic && hasFileAtomicReadCapability(provider)) {
                    buffer = await provider.readFile(resource, { atomic: true });
                }
                else {
                    buffer = await provider.readFile(resource);
                }
                // respect position option
                if (typeof options?.position === 'number') {
                    buffer = buffer.slice(options.position);
                }
                // respect length option
                if (typeof options?.length === 'number') {
                    buffer = buffer.slice(0, options.length);
                }
                // Throw if file is too large to load
                this.validateReadFileLimits(resource, buffer.byteLength, options);
                // End stream with data
                stream.end(VSBuffer.wrap(buffer));
            }
            catch (err) {
                stream.error(err);
                stream.end();
            }
        })();
        return stream;
    }
    async validateReadFile(resource, options) {
        const stat = await this.resolve(resource, { resolveMetadata: true });
        // Throw if resource is a directory
        if (stat.isDirectory) {
            throw new FileOperationError(localize('fileIsDirectoryReadError', "Unable to read file '{0}' that is actually a directory", this.resourceForError(resource)), 0 /* FileOperationResult.FILE_IS_DIRECTORY */, options);
        }
        // Throw if file not modified since (unless disabled)
        if (typeof options?.etag === 'string' && options.etag !== ETAG_DISABLED && options.etag === stat.etag) {
            throw new NotModifiedSinceFileOperationError(localize('fileNotModifiedError', "File not modified since"), stat, options);
        }
        // Throw if file is too large to load
        this.validateReadFileLimits(resource, stat.size, options);
        return stat;
    }
    validateReadFileLimits(resource, size, options) {
        if (typeof options?.limits?.size === 'number' && size > options.limits.size) {
            throw new TooLargeFileOperationError(localize('fileTooLargeError', "Unable to read file '{0}' that is too large to open", this.resourceForError(resource)), 7 /* FileOperationResult.FILE_TOO_LARGE */, size, options);
        }
    }
    //#endregion
    //#region Move/Copy/Delete/Create Folder
    async canMove(source, target, overwrite) {
        return this.doCanMoveCopy(source, target, 'move', overwrite);
    }
    async canCopy(source, target, overwrite) {
        return this.doCanMoveCopy(source, target, 'copy', overwrite);
    }
    async doCanMoveCopy(source, target, mode, overwrite) {
        if (source.toString() !== target.toString()) {
            try {
                const sourceProvider = mode === 'move' ? this.throwIfFileSystemIsReadonly(await this.withWriteProvider(source), source) : await this.withReadProvider(source);
                const targetProvider = this.throwIfFileSystemIsReadonly(await this.withWriteProvider(target), target);
                await this.doValidateMoveCopy(sourceProvider, source, targetProvider, target, mode, overwrite);
            }
            catch (error) {
                return error;
            }
        }
        return true;
    }
    async move(source, target, overwrite) {
        const sourceProvider = this.throwIfFileSystemIsReadonly(await this.withWriteProvider(source), source);
        const targetProvider = this.throwIfFileSystemIsReadonly(await this.withWriteProvider(target), target);
        // move
        const mode = await this.doMoveCopy(sourceProvider, source, targetProvider, target, 'move', !!overwrite);
        // resolve and send events
        const fileStat = await this.resolve(target, { resolveMetadata: true });
        this._onDidRunOperation.fire(new FileOperationEvent(source, mode === 'move' ? 2 /* FileOperation.MOVE */ : 3 /* FileOperation.COPY */, fileStat));
        return fileStat;
    }
    async copy(source, target, overwrite) {
        const sourceProvider = await this.withReadProvider(source);
        const targetProvider = this.throwIfFileSystemIsReadonly(await this.withWriteProvider(target), target);
        // copy
        const mode = await this.doMoveCopy(sourceProvider, source, targetProvider, target, 'copy', !!overwrite);
        // resolve and send events
        const fileStat = await this.resolve(target, { resolveMetadata: true });
        this._onDidRunOperation.fire(new FileOperationEvent(source, mode === 'copy' ? 3 /* FileOperation.COPY */ : 2 /* FileOperation.MOVE */, fileStat));
        return fileStat;
    }
    async doMoveCopy(sourceProvider, source, targetProvider, target, mode, overwrite) {
        if (source.toString() === target.toString()) {
            return mode; // simulate node.js behaviour here and do a no-op if paths match
        }
        // validation
        const { exists, isSameResourceWithDifferentPathCase } = await this.doValidateMoveCopy(sourceProvider, source, targetProvider, target, mode, overwrite);
        // delete as needed (unless target is same resurce with different path case)
        if (exists && !isSameResourceWithDifferentPathCase && overwrite) {
            await this.del(target, { recursive: true });
        }
        // create parent folders
        await this.mkdirp(targetProvider, this.getExtUri(targetProvider).providerExtUri.dirname(target));
        // copy source => target
        if (mode === 'copy') {
            // same provider with fast copy: leverage copy() functionality
            if (sourceProvider === targetProvider && hasFileFolderCopyCapability(sourceProvider)) {
                await sourceProvider.copy(source, target, { overwrite });
            }
            // when copying via buffer/unbuffered, we have to manually
            // traverse the source if it is a folder and not a file
            else {
                const sourceFile = await this.resolve(source);
                if (sourceFile.isDirectory) {
                    await this.doCopyFolder(sourceProvider, sourceFile, targetProvider, target);
                }
                else {
                    await this.doCopyFile(sourceProvider, source, targetProvider, target);
                }
            }
            return mode;
        }
        // move source => target
        else {
            // same provider: leverage rename() functionality
            if (sourceProvider === targetProvider) {
                await sourceProvider.rename(source, target, { overwrite });
                return mode;
            }
            // across providers: copy to target & delete at source
            else {
                await this.doMoveCopy(sourceProvider, source, targetProvider, target, 'copy', overwrite);
                await this.del(source, { recursive: true });
                return 'copy';
            }
        }
    }
    async doCopyFile(sourceProvider, source, targetProvider, target) {
        // copy: source (buffered) => target (buffered)
        if (hasOpenReadWriteCloseCapability(sourceProvider) && hasOpenReadWriteCloseCapability(targetProvider)) {
            return this.doPipeBuffered(sourceProvider, source, targetProvider, target);
        }
        // copy: source (buffered) => target (unbuffered)
        if (hasOpenReadWriteCloseCapability(sourceProvider) && hasReadWriteCapability(targetProvider)) {
            return this.doPipeBufferedToUnbuffered(sourceProvider, source, targetProvider, target);
        }
        // copy: source (unbuffered) => target (buffered)
        if (hasReadWriteCapability(sourceProvider) && hasOpenReadWriteCloseCapability(targetProvider)) {
            return this.doPipeUnbufferedToBuffered(sourceProvider, source, targetProvider, target);
        }
        // copy: source (unbuffered) => target (unbuffered)
        if (hasReadWriteCapability(sourceProvider) && hasReadWriteCapability(targetProvider)) {
            return this.doPipeUnbuffered(sourceProvider, source, targetProvider, target);
        }
    }
    async doCopyFolder(sourceProvider, sourceFolder, targetProvider, targetFolder) {
        // create folder in target
        await targetProvider.mkdir(targetFolder);
        // create children in target
        if (Array.isArray(sourceFolder.children)) {
            await Promises.settled(sourceFolder.children.map(async (sourceChild) => {
                const targetChild = this.getExtUri(targetProvider).providerExtUri.joinPath(targetFolder, sourceChild.name);
                if (sourceChild.isDirectory) {
                    return this.doCopyFolder(sourceProvider, await this.resolve(sourceChild.resource), targetProvider, targetChild);
                }
                else {
                    return this.doCopyFile(sourceProvider, sourceChild.resource, targetProvider, targetChild);
                }
            }));
        }
    }
    async doValidateMoveCopy(sourceProvider, source, targetProvider, target, mode, overwrite) {
        let isSameResourceWithDifferentPathCase = false;
        // Check if source is equal or parent to target (requires providers to be the same)
        if (sourceProvider === targetProvider) {
            const { providerExtUri, isPathCaseSensitive } = this.getExtUri(sourceProvider);
            if (!isPathCaseSensitive) {
                isSameResourceWithDifferentPathCase = providerExtUri.isEqual(source, target);
            }
            if (isSameResourceWithDifferentPathCase && mode === 'copy') {
                throw new Error(localize('unableToMoveCopyError1', "Unable to copy when source '{0}' is same as target '{1}' with different path case on a case insensitive file system", this.resourceForError(source), this.resourceForError(target)));
            }
            if (!isSameResourceWithDifferentPathCase && providerExtUri.isEqualOrParent(target, source)) {
                throw new Error(localize('unableToMoveCopyError2', "Unable to move/copy when source '{0}' is parent of target '{1}'.", this.resourceForError(source), this.resourceForError(target)));
            }
        }
        // Extra checks if target exists and this is not a rename
        const exists = await this.exists(target);
        if (exists && !isSameResourceWithDifferentPathCase) {
            // Bail out if target exists and we are not about to overwrite
            if (!overwrite) {
                throw new FileOperationError(localize('unableToMoveCopyError3', "Unable to move/copy '{0}' because target '{1}' already exists at destination.", this.resourceForError(source), this.resourceForError(target)), 4 /* FileOperationResult.FILE_MOVE_CONFLICT */);
            }
            // Special case: if the target is a parent of the source, we cannot delete
            // it as it would delete the source as well. In this case we have to throw
            if (sourceProvider === targetProvider) {
                const { providerExtUri } = this.getExtUri(sourceProvider);
                if (providerExtUri.isEqualOrParent(source, target)) {
                    throw new Error(localize('unableToMoveCopyError4', "Unable to move/copy '{0}' into '{1}' since a file would replace the folder it is contained in.", this.resourceForError(source), this.resourceForError(target)));
                }
            }
        }
        return { exists, isSameResourceWithDifferentPathCase };
    }
    getExtUri(provider) {
        const isPathCaseSensitive = this.isPathCaseSensitive(provider);
        return {
            providerExtUri: isPathCaseSensitive ? extUri : extUriIgnorePathCase,
            isPathCaseSensitive
        };
    }
    isPathCaseSensitive(provider) {
        return !!(provider.capabilities & 1024 /* FileSystemProviderCapabilities.PathCaseSensitive */);
    }
    async createFolder(resource) {
        const provider = this.throwIfFileSystemIsReadonly(await this.withProvider(resource), resource);
        // mkdir recursively
        await this.mkdirp(provider, resource);
        // events
        const fileStat = await this.resolve(resource, { resolveMetadata: true });
        this._onDidRunOperation.fire(new FileOperationEvent(resource, 0 /* FileOperation.CREATE */, fileStat));
        return fileStat;
    }
    async mkdirp(provider, directory) {
        const directoriesToCreate = [];
        // mkdir until we reach root
        const { providerExtUri } = this.getExtUri(provider);
        while (!providerExtUri.isEqual(directory, providerExtUri.dirname(directory))) {
            try {
                const stat = await provider.stat(directory);
                if ((stat.type & FileType.Directory) === 0) {
                    throw new Error(localize('mkdirExistsError', "Unable to create folder '{0}' that already exists but is not a directory", this.resourceForError(directory)));
                }
                break; // we have hit a directory that exists -> good
            }
            catch (error) {
                // Bubble up any other error that is not file not found
                if (toFileSystemProviderErrorCode(error) !== FileSystemProviderErrorCode.FileNotFound) {
                    throw error;
                }
                // Upon error, remember directories that need to be created
                directoriesToCreate.push(providerExtUri.basename(directory));
                // Continue up
                directory = providerExtUri.dirname(directory);
            }
        }
        // Create directories as needed
        for (let i = directoriesToCreate.length - 1; i >= 0; i--) {
            directory = providerExtUri.joinPath(directory, directoriesToCreate[i]);
            try {
                await provider.mkdir(directory);
            }
            catch (error) {
                if (toFileSystemProviderErrorCode(error) !== FileSystemProviderErrorCode.FileExists) {
                    // For mkdirp() we tolerate that the mkdir() call fails
                    // in case the folder already exists. This follows node.js
                    // own implementation of fs.mkdir({ recursive: true }) and
                    // reduces the chances of race conditions leading to errors
                    // if multiple calls try to create the same folders
                    // As such, we only throw an error here if it is other than
                    // the fact that the file already exists.
                    // (see also https://github.com/microsoft/vscode/issues/89834)
                    throw error;
                }
            }
        }
    }
    async canDelete(resource, options) {
        try {
            await this.doValidateDelete(resource, options);
        }
        catch (error) {
            return error;
        }
        return true;
    }
    async doValidateDelete(resource, options) {
        const provider = this.throwIfFileSystemIsReadonly(await this.withProvider(resource), resource);
        // Validate trash support
        const useTrash = !!options?.useTrash;
        if (useTrash && !(provider.capabilities & 4096 /* FileSystemProviderCapabilities.Trash */)) {
            throw new Error(localize('deleteFailedTrashUnsupported', "Unable to delete file '{0}' via trash because provider does not support it.", this.resourceForError(resource)));
        }
        // Validate atomic support
        const atomic = options?.atomic;
        if (atomic && !(provider.capabilities & 65536 /* FileSystemProviderCapabilities.FileAtomicDelete */)) {
            throw new Error(localize('deleteFailedAtomicUnsupported', "Unable to delete file '{0}' atomically because provider does not support it.", this.resourceForError(resource)));
        }
        if (useTrash && atomic) {
            throw new Error(localize('deleteFailedTrashAndAtomicUnsupported', "Unable to atomically delete file '{0}' because using trash is enabled.", this.resourceForError(resource)));
        }
        // Validate delete
        let stat = undefined;
        try {
            stat = await provider.stat(resource);
        }
        catch (error) {
            // Handled later
        }
        if (stat) {
            this.throwIfFileIsReadonly(resource, stat);
        }
        else {
            throw new FileOperationError(localize('deleteFailedNotFound', "Unable to delete nonexistent file '{0}'", this.resourceForError(resource)), 1 /* FileOperationResult.FILE_NOT_FOUND */);
        }
        // Validate recursive
        const recursive = !!options?.recursive;
        if (!recursive) {
            const stat = await this.resolve(resource);
            if (stat.isDirectory && Array.isArray(stat.children) && stat.children.length > 0) {
                throw new Error(localize('deleteFailedNonEmptyFolder', "Unable to delete non-empty folder '{0}'.", this.resourceForError(resource)));
            }
        }
        return provider;
    }
    async del(resource, options) {
        const provider = await this.doValidateDelete(resource, options);
        let deleteFileOptions = options;
        if (hasFileAtomicDeleteCapability(provider) && !deleteFileOptions?.atomic) {
            const enforcedAtomicDelete = provider.enforceAtomicDelete?.(resource);
            if (enforcedAtomicDelete) {
                deleteFileOptions = { ...options, atomic: enforcedAtomicDelete };
            }
        }
        const useTrash = !!deleteFileOptions?.useTrash;
        const recursive = !!deleteFileOptions?.recursive;
        const atomic = deleteFileOptions?.atomic ?? false;
        // Delete through provider
        await provider.delete(resource, { recursive, useTrash, atomic });
        // Events
        this._onDidRunOperation.fire(new FileOperationEvent(resource, 1 /* FileOperation.DELETE */));
    }
    //#endregion
    //#region Clone File
    async cloneFile(source, target) {
        const sourceProvider = await this.withProvider(source);
        const targetProvider = this.throwIfFileSystemIsReadonly(await this.withWriteProvider(target), target);
        if (sourceProvider === targetProvider && this.getExtUri(sourceProvider).providerExtUri.isEqual(source, target)) {
            return; // return early if paths are equal
        }
        // same provider, use `cloneFile` when native support is provided
        if (sourceProvider === targetProvider && hasFileCloneCapability(sourceProvider)) {
            return sourceProvider.cloneFile(source, target);
        }
        // otherwise, either providers are different or there is no native
        // `cloneFile` support, then we fallback to emulate a clone as best
        // as we can with the other primitives
        // create parent folders
        await this.mkdirp(targetProvider, this.getExtUri(targetProvider).providerExtUri.dirname(target));
        // leverage `copy` method if provided and providers are identical
        // queue on the source to ensure atomic read
        if (sourceProvider === targetProvider && hasFileFolderCopyCapability(sourceProvider)) {
            return this.writeQueue.queueFor(source, () => sourceProvider.copy(source, target, { overwrite: true }), this.getExtUri(sourceProvider).providerExtUri);
        }
        // otherwise copy via buffer/unbuffered and use a write queue
        // on the source to ensure atomic operation as much as possible
        return this.writeQueue.queueFor(source, () => this.doCopyFile(sourceProvider, source, targetProvider, target), this.getExtUri(sourceProvider).providerExtUri);
    }
    static { this.WATCHER_CORRELATION_IDS = 0; }
    createWatcher(resource, options) {
        return this.watch(resource, {
            ...options,
            // Explicitly set a correlation id so that file events that originate
            // from requests from extensions are exclusively routed back to the
            // extension host and not into the workbench.
            correlationId: FileService_1.WATCHER_CORRELATION_IDS++
        });
    }
    watch(resource, options = { recursive: false, excludes: [] }) {
        const disposables = new DisposableStore();
        // Forward watch request to provider and wire in disposables
        let watchDisposed = false;
        let disposeWatch = () => { watchDisposed = true; };
        disposables.add(toDisposable(() => disposeWatch()));
        // Watch and wire in disposable which is async but
        // check if we got disposed meanwhile and forward
        (async () => {
            try {
                const disposable = await this.doWatch(resource, options);
                if (watchDisposed) {
                    dispose(disposable);
                }
                else {
                    disposeWatch = () => dispose(disposable);
                }
            }
            catch (error) {
                this.logService.error(error);
            }
        })();
        // When a correlation identifier is set, return a specific
        // watcher that only emits events matching that correalation.
        const correlationId = options.correlationId;
        if (typeof correlationId === 'number') {
            const fileChangeEmitter = disposables.add(new Emitter());
            disposables.add(this.internalOnDidFilesChange.event(e => {
                if (e.correlates(correlationId)) {
                    fileChangeEmitter.fire(e);
                }
            }));
            const watcher = {
                onDidChange: fileChangeEmitter.event,
                dispose: () => disposables.dispose()
            };
            return watcher;
        }
        return disposables;
    }
    async doWatch(resource, options) {
        const provider = await this.withProvider(resource);
        // Deduplicate identical watch requests
        const watchHash = hash([this.getExtUri(provider).providerExtUri.getComparisonKey(resource), options]);
        let watcher = this.activeWatchers.get(watchHash);
        if (!watcher) {
            watcher = {
                count: 0,
                disposable: provider.watch(resource, options)
            };
            this.activeWatchers.set(watchHash, watcher);
        }
        // Increment usage counter
        watcher.count += 1;
        return toDisposable(() => {
            if (watcher) {
                // Unref
                watcher.count--;
                // Dispose only when last user is reached
                if (watcher.count === 0) {
                    dispose(watcher.disposable);
                    this.activeWatchers.delete(watchHash);
                }
            }
        });
    }
    dispose() {
        super.dispose();
        for (const [, watcher] of this.activeWatchers) {
            dispose(watcher.disposable);
        }
        this.activeWatchers.clear();
    }
    async doWriteBuffered(provider, resource, options, readableOrStreamOrBufferedStream) {
        return this.writeQueue.queueFor(resource, async () => {
            // open handle
            const handle = await provider.open(resource, { create: true, unlock: options?.unlock ?? false });
            // write into handle until all bytes from buffer have been written
            try {
                if (isReadableStream(readableOrStreamOrBufferedStream) || isReadableBufferedStream(readableOrStreamOrBufferedStream)) {
                    await this.doWriteStreamBufferedQueued(provider, handle, readableOrStreamOrBufferedStream);
                }
                else {
                    await this.doWriteReadableBufferedQueued(provider, handle, readableOrStreamOrBufferedStream);
                }
            }
            catch (error) {
                throw ensureFileSystemProviderError(error);
            }
            finally {
                // close handle always
                await provider.close(handle);
            }
        }, this.getExtUri(provider).providerExtUri);
    }
    async doWriteStreamBufferedQueued(provider, handle, streamOrBufferedStream) {
        let posInFile = 0;
        let stream;
        // Buffered stream: consume the buffer first by writing
        // it to the target before reading from the stream.
        if (isReadableBufferedStream(streamOrBufferedStream)) {
            if (streamOrBufferedStream.buffer.length > 0) {
                const chunk = VSBuffer.concat(streamOrBufferedStream.buffer);
                await this.doWriteBuffer(provider, handle, chunk, chunk.byteLength, posInFile, 0);
                posInFile += chunk.byteLength;
            }
            // If the stream has been consumed, return early
            if (streamOrBufferedStream.ended) {
                return;
            }
            stream = streamOrBufferedStream.stream;
        }
        // Unbuffered stream - just take as is
        else {
            stream = streamOrBufferedStream;
        }
        return new Promise((resolve, reject) => {
            listenStream(stream, {
                onData: async (chunk) => {
                    // pause stream to perform async write operation
                    stream.pause();
                    try {
                        await this.doWriteBuffer(provider, handle, chunk, chunk.byteLength, posInFile, 0);
                    }
                    catch (error) {
                        return reject(error);
                    }
                    posInFile += chunk.byteLength;
                    // resume stream now that we have successfully written
                    // run this on the next tick to prevent increasing the
                    // execution stack because resume() may call the event
                    // handler again before finishing.
                    setTimeout(() => stream.resume());
                },
                onError: error => reject(error),
                onEnd: () => resolve()
            });
        });
    }
    async doWriteReadableBufferedQueued(provider, handle, readable) {
        let posInFile = 0;
        let chunk;
        while ((chunk = readable.read()) !== null) {
            await this.doWriteBuffer(provider, handle, chunk, chunk.byteLength, posInFile, 0);
            posInFile += chunk.byteLength;
        }
    }
    async doWriteBuffer(provider, handle, buffer, length, posInFile, posInBuffer) {
        let totalBytesWritten = 0;
        while (totalBytesWritten < length) {
            // Write through the provider
            const bytesWritten = await provider.write(handle, posInFile + totalBytesWritten, buffer.buffer, posInBuffer + totalBytesWritten, length - totalBytesWritten);
            totalBytesWritten += bytesWritten;
        }
    }
    async doWriteUnbuffered(provider, resource, options, bufferOrReadableOrStreamOrBufferedStream) {
        return this.writeQueue.queueFor(resource, () => this.doWriteUnbufferedQueued(provider, resource, options, bufferOrReadableOrStreamOrBufferedStream), this.getExtUri(provider).providerExtUri);
    }
    async doWriteUnbufferedQueued(provider, resource, options, bufferOrReadableOrStreamOrBufferedStream) {
        let buffer;
        if (bufferOrReadableOrStreamOrBufferedStream instanceof VSBuffer) {
            buffer = bufferOrReadableOrStreamOrBufferedStream;
        }
        else if (isReadableStream(bufferOrReadableOrStreamOrBufferedStream)) {
            buffer = await streamToBuffer(bufferOrReadableOrStreamOrBufferedStream);
        }
        else if (isReadableBufferedStream(bufferOrReadableOrStreamOrBufferedStream)) {
            buffer = await bufferedStreamToBuffer(bufferOrReadableOrStreamOrBufferedStream);
        }
        else {
            buffer = readableToBuffer(bufferOrReadableOrStreamOrBufferedStream);
        }
        // Write through the provider
        await provider.writeFile(resource, buffer.buffer, { create: true, overwrite: true, unlock: options?.unlock ?? false, atomic: options?.atomic ?? false });
    }
    async doPipeBuffered(sourceProvider, source, targetProvider, target) {
        return this.writeQueue.queueFor(target, () => this.doPipeBufferedQueued(sourceProvider, source, targetProvider, target), this.getExtUri(targetProvider).providerExtUri);
    }
    async doPipeBufferedQueued(sourceProvider, source, targetProvider, target) {
        let sourceHandle = undefined;
        let targetHandle = undefined;
        try {
            // Open handles
            sourceHandle = await sourceProvider.open(source, { create: false });
            targetHandle = await targetProvider.open(target, { create: true, unlock: false });
            const buffer = VSBuffer.alloc(this.BUFFER_SIZE);
            let posInFile = 0;
            let posInBuffer = 0;
            let bytesRead = 0;
            do {
                // read from source (sourceHandle) at current position (posInFile) into buffer (buffer) at
                // buffer position (posInBuffer) up to the size of the buffer (buffer.byteLength).
                bytesRead = await sourceProvider.read(sourceHandle, posInFile, buffer.buffer, posInBuffer, buffer.byteLength - posInBuffer);
                // write into target (targetHandle) at current position (posInFile) from buffer (buffer) at
                // buffer position (posInBuffer) all bytes we read (bytesRead).
                await this.doWriteBuffer(targetProvider, targetHandle, buffer, bytesRead, posInFile, posInBuffer);
                posInFile += bytesRead;
                posInBuffer += bytesRead;
                // when buffer full, fill it again from the beginning
                if (posInBuffer === buffer.byteLength) {
                    posInBuffer = 0;
                }
            } while (bytesRead > 0);
        }
        catch (error) {
            throw ensureFileSystemProviderError(error);
        }
        finally {
            await Promises.settled([
                typeof sourceHandle === 'number' ? sourceProvider.close(sourceHandle) : Promise.resolve(),
                typeof targetHandle === 'number' ? targetProvider.close(targetHandle) : Promise.resolve(),
            ]);
        }
    }
    async doPipeUnbuffered(sourceProvider, source, targetProvider, target) {
        return this.writeQueue.queueFor(target, () => this.doPipeUnbufferedQueued(sourceProvider, source, targetProvider, target), this.getExtUri(targetProvider).providerExtUri);
    }
    async doPipeUnbufferedQueued(sourceProvider, source, targetProvider, target) {
        return targetProvider.writeFile(target, await sourceProvider.readFile(source), { create: true, overwrite: true, unlock: false, atomic: false });
    }
    async doPipeUnbufferedToBuffered(sourceProvider, source, targetProvider, target) {
        return this.writeQueue.queueFor(target, () => this.doPipeUnbufferedToBufferedQueued(sourceProvider, source, targetProvider, target), this.getExtUri(targetProvider).providerExtUri);
    }
    async doPipeUnbufferedToBufferedQueued(sourceProvider, source, targetProvider, target) {
        // Open handle
        const targetHandle = await targetProvider.open(target, { create: true, unlock: false });
        // Read entire buffer from source and write buffered
        try {
            const buffer = await sourceProvider.readFile(source);
            await this.doWriteBuffer(targetProvider, targetHandle, VSBuffer.wrap(buffer), buffer.byteLength, 0, 0);
        }
        catch (error) {
            throw ensureFileSystemProviderError(error);
        }
        finally {
            await targetProvider.close(targetHandle);
        }
    }
    async doPipeBufferedToUnbuffered(sourceProvider, source, targetProvider, target) {
        // Read buffer via stream buffered
        const buffer = await streamToBuffer(this.readFileBuffered(sourceProvider, source, CancellationToken.None));
        // Write buffer into target at once
        await this.doWriteUnbuffered(targetProvider, target, undefined, buffer);
    }
    throwIfFileSystemIsReadonly(provider, resource) {
        if (provider.capabilities & 2048 /* FileSystemProviderCapabilities.Readonly */) {
            throw new FileOperationError(localize('err.readonly', "Unable to modify read-only file '{0}'", this.resourceForError(resource)), 6 /* FileOperationResult.FILE_PERMISSION_DENIED */);
        }
        return provider;
    }
    throwIfFileIsReadonly(resource, stat) {
        if ((stat.permissions ?? 0) & FilePermission.Readonly) {
            throw new FileOperationError(localize('err.readonly', "Unable to modify read-only file '{0}'", this.resourceForError(resource)), 6 /* FileOperationResult.FILE_PERMISSION_DENIED */);
        }
    }
    resourceForError(resource) {
        if (resource.scheme === Schemas.file) {
            return resource.fsPath;
        }
        return resource.toString(true);
    }
};
FileService = FileService_1 = __decorate([
    __param(0, ILogService)
], FileService);
export { FileService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vZmlsZXMvY29tbW9uL2ZpbGVTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDMUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxhQUFhLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUN4RSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsZ0JBQWdCLEVBQUUsd0JBQXdCLEVBQUUsZ0JBQWdCLEVBQUUsY0FBYyxFQUFFLFFBQVEsRUFBNEUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUMxTyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDeEQsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQ3BELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUM1RCxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxPQUFPLEVBQWUsWUFBWSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDcEgsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDOUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQzFELE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUMzRCxPQUFPLEVBQUUsTUFBTSxFQUFFLG9CQUFvQixFQUFXLGNBQWMsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzFHLE9BQU8sRUFBRSxhQUFhLEVBQUUsd0JB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