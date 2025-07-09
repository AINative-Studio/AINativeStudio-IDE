/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { VSBuffer } from '../../../base/common/buffer.js';
import { toErrorMessage } from '../../../base/common/errorMessage.js';
import { canceled } from '../../../base/common/errors.js';
import { Emitter, Event } from '../../../base/common/event.js';
import { Disposable, DisposableStore, toDisposable } from '../../../base/common/lifecycle.js';
import { newWriteableStream } from '../../../base/common/stream.js';
import { generateUuid } from '../../../base/common/uuid.js';
import { createFileSystemProviderError, FileSystemProviderErrorCode } from './files.js';
import { reviveFileChanges } from './watcher.js';
export const LOCAL_FILE_SYSTEM_CHANNEL_NAME = 'localFilesystem';
/**
 * An implementation of a local disk file system provider
 * that is backed by a `IChannel` and thus implemented via
 * IPC on a different process.
 */
export class DiskFileSystemProviderClient extends Disposable {
    constructor(channel, extraCapabilities) {
        super();
        this.channel = channel;
        this.extraCapabilities = extraCapabilities;
        //#region File Capabilities
        this.onDidChangeCapabilities = Event.None;
        //#endregion
        //#region File Watching
        this._onDidChange = this._register(new Emitter());
        this.onDidChangeFile = this._onDidChange.event;
        this._onDidWatchError = this._register(new Emitter());
        this.onDidWatchError = this._onDidWatchError.event;
        // The contract for file watching via remote is to identify us
        // via a unique but readonly session ID. Since the remote is
        // managing potentially many watchers from different clients,
        // this helps the server to properly partition events to the right
        // clients.
        this.sessionId = generateUuid();
        this.registerFileChangeListeners();
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
            if (this.extraCapabilities.pathCaseSensitive) {
                this._capabilities |= 1024 /* FileSystemProviderCapabilities.PathCaseSensitive */;
            }
            if (this.extraCapabilities.trash) {
                this._capabilities |= 4096 /* FileSystemProviderCapabilities.Trash */;
            }
        }
        return this._capabilities;
    }
    //#endregion
    //#region File Metadata Resolving
    stat(resource) {
        return this.channel.call('stat', [resource]);
    }
    readdir(resource) {
        return this.channel.call('readdir', [resource]);
    }
    //#endregion
    //#region File Reading/Writing
    async readFile(resource, opts) {
        const { buffer } = await this.channel.call('readFile', [resource, opts]);
        return buffer;
    }
    readFileStream(resource, opts, token) {
        const stream = newWriteableStream(data => VSBuffer.concat(data.map(data => VSBuffer.wrap(data))).buffer);
        const disposables = new DisposableStore();
        // Reading as file stream goes through an event to the remote side
        disposables.add(this.channel.listen('readFileStream', [resource, opts])(dataOrErrorOrEnd => {
            // data
            if (dataOrErrorOrEnd instanceof VSBuffer) {
                stream.write(dataOrErrorOrEnd.buffer);
            }
            // end or error
            else {
                if (dataOrErrorOrEnd === 'end') {
                    stream.end();
                }
                else {
                    let error;
                    // Take Error as is if type matches
                    if (dataOrErrorOrEnd instanceof Error) {
                        error = dataOrErrorOrEnd;
                    }
                    // Otherwise, try to deserialize into an error.
                    // Since we communicate via IPC, we cannot be sure
                    // that Error objects are properly serialized.
                    else {
                        const errorCandidate = dataOrErrorOrEnd;
                        error = createFileSystemProviderError(errorCandidate.message ?? toErrorMessage(errorCandidate), errorCandidate.code ?? FileSystemProviderErrorCode.Unknown);
                    }
                    stream.error(error);
                    stream.end();
                }
                // Signal to the remote side that we no longer listen
                disposables.dispose();
            }
        }));
        // Support cancellation
        disposables.add(token.onCancellationRequested(() => {
            // Ensure to end the stream properly with an error
            // to indicate the cancellation.
            stream.error(canceled());
            stream.end();
            // Ensure to dispose the listener upon cancellation. This will
            // bubble through the remote side as event and allows to stop
            // reading the file.
            disposables.dispose();
        }));
        return stream;
    }
    writeFile(resource, content, opts) {
        return this.channel.call('writeFile', [resource, VSBuffer.wrap(content), opts]);
    }
    open(resource, opts) {
        return this.channel.call('open', [resource, opts]);
    }
    close(fd) {
        return this.channel.call('close', [fd]);
    }
    async read(fd, pos, data, offset, length) {
        const [bytes, bytesRead] = await this.channel.call('read', [fd, pos, length]);
        // copy back the data that was written into the buffer on the remote
        // side. we need to do this because buffers are not referenced by
        // pointer, but only by value and as such cannot be directly written
        // to from the other process.
        data.set(bytes.buffer.slice(0, bytesRead), offset);
        return bytesRead;
    }
    write(fd, pos, data, offset, length) {
        return this.channel.call('write', [fd, pos, VSBuffer.wrap(data), offset, length]);
    }
    //#endregion
    //#region Move/Copy/Delete/Create Folder
    mkdir(resource) {
        return this.channel.call('mkdir', [resource]);
    }
    delete(resource, opts) {
        return this.channel.call('delete', [resource, opts]);
    }
    rename(resource, target, opts) {
        return this.channel.call('rename', [resource, target, opts]);
    }
    copy(resource, target, opts) {
        return this.channel.call('copy', [resource, target, opts]);
    }
    //#endregion
    //#region Clone File
    cloneFile(resource, target) {
        return this.channel.call('cloneFile', [resource, target]);
    }
    registerFileChangeListeners() {
        // The contract for file changes is that there is one listener
        // for both events and errors from the watcher. So we need to
        // unwrap the event from the remote and emit through the proper
        // emitter.
        this._register(this.channel.listen('fileChange', [this.sessionId])(eventsOrError => {
            if (Array.isArray(eventsOrError)) {
                const events = eventsOrError;
                this._onDidChange.fire(reviveFileChanges(events));
            }
            else {
                const error = eventsOrError;
                this._onDidWatchError.fire(error);
            }
        }));
    }
    watch(resource, opts) {
        // Generate a request UUID to correlate the watcher
        // back to us when we ask to dispose the watcher later.
        const req = generateUuid();
        this.channel.call('watch', [this.sessionId, req, resource, opts]);
        return toDisposable(() => this.channel.call('unwatch', [this.sessionId, req]));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlza0ZpbGVTeXN0ZW1Qcm92aWRlckNsaWVudC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9maWxlcy9jb21tb24vZGlza0ZpbGVTeXN0ZW1Qcm92aWRlckNsaWVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFFMUQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUMxRCxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQy9ELE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFlLFlBQVksRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzNHLE9BQU8sRUFBRSxrQkFBa0IsRUFBb0QsTUFBTSxnQ0FBZ0MsQ0FBQztBQUV0SCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFFNUQsT0FBTyxFQUFFLDZCQUE2QixFQUErSSwyQkFBMkIsRUFBZ1ksTUFBTSxZQUFZLENBQUM7QUFDbm1CLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGNBQWMsQ0FBQztBQUVqRCxNQUFNLENBQUMsTUFBTSw4QkFBOEIsR0FBRyxpQkFBaUIsQ0FBQztBQUVoRTs7OztHQUlHO0FBQ0gsTUFBTSxPQUFPLDRCQUE2QixTQUFRLFVBQVU7SUFRM0QsWUFDa0IsT0FBaUIsRUFDakIsaUJBQW1FO1FBRXBGLEtBQUssRUFBRSxDQUFDO1FBSFMsWUFBTyxHQUFQLE9BQU8sQ0FBVTtRQUNqQixzQkFBaUIsR0FBakIsaUJBQWlCLENBQWtEO1FBT3JGLDJCQUEyQjtRQUVsQiw0QkFB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