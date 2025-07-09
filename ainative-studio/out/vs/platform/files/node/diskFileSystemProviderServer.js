/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../base/common/event.js';
import { DiskFileSystemProvider } from './diskFileSystemProvider.js';
import { Disposable, dispose, toDisposable } from '../../../base/common/lifecycle.js';
import { VSBuffer } from '../../../base/common/buffer.js';
import { listenStream } from '../../../base/common/stream.js';
import { CancellationTokenSource } from '../../../base/common/cancellation.js';
/**
 * A server implementation for a IPC based file system provider client.
 */
export class AbstractDiskFileSystemProviderChannel extends Disposable {
    constructor(provider, logService) {
        super();
        this.provider = provider;
        this.logService = logService;
        //#endregion
        //#region File Watching
        this.sessionToWatcher = new Map();
        this.watchRequests = new Map();
    }
    call(ctx, command, arg) {
        const uriTransformer = this.getUriTransformer(ctx);
        switch (command) {
            case 'stat': return this.stat(uriTransformer, arg[0]);
            case 'readdir': return this.readdir(uriTransformer, arg[0]);
            case 'open': return this.open(uriTransformer, arg[0], arg[1]);
            case 'close': return this.close(arg[0]);
            case 'read': return this.read(arg[0], arg[1], arg[2]);
            case 'readFile': return this.readFile(uriTransformer, arg[0], arg[1]);
            case 'write': return this.write(arg[0], arg[1], arg[2], arg[3], arg[4]);
            case 'writeFile': return this.writeFile(uriTransformer, arg[0], arg[1], arg[2]);
            case 'rename': return this.rename(uriTransformer, arg[0], arg[1], arg[2]);
            case 'copy': return this.copy(uriTransformer, arg[0], arg[1], arg[2]);
            case 'cloneFile': return this.cloneFile(uriTransformer, arg[0], arg[1]);
            case 'mkdir': return this.mkdir(uriTransformer, arg[0]);
            case 'delete': return this.delete(uriTransformer, arg[0], arg[1]);
            case 'watch': return this.watch(uriTransformer, arg[0], arg[1], arg[2], arg[3]);
            case 'unwatch': return this.unwatch(arg[0], arg[1]);
        }
        throw new Error(`IPC Command ${command} not found`);
    }
    listen(ctx, event, arg) {
        const uriTransformer = this.getUriTransformer(ctx);
        switch (event) {
            case 'fileChange': return this.onFileChange(uriTransformer, arg[0]);
            case 'readFileStream': return this.onReadFileStream(uriTransformer, arg[0], arg[1]);
        }
        throw new Error(`Unknown event ${event}`);
    }
    //#region File Metadata Resolving
    stat(uriTransformer, _resource) {
        const resource = this.transformIncoming(uriTransformer, _resource, true);
        return this.provider.stat(resource);
    }
    readdir(uriTransformer, _resource) {
        const resource = this.transformIncoming(uriTransformer, _resource);
        return this.provider.readdir(resource);
    }
    //#endregion
    //#region File Reading/Writing
    async readFile(uriTransformer, _resource, opts) {
        const resource = this.transformIncoming(uriTransformer, _resource, true);
        const buffer = await this.provider.readFile(resource, opts);
        return VSBuffer.wrap(buffer);
    }
    onReadFileStream(uriTransformer, _resource, opts) {
        const resource = this.transformIncoming(uriTransformer, _resource, true);
        const cts = new CancellationTokenSource();
        const emitter = new Emitter({
            onDidRemoveLastListener: () => {
                // Ensure to cancel the read operation when there is no more
                // listener on the other side to prevent unneeded work.
                cts.cancel();
            }
        });
        const fileStream = this.provider.readFileStream(resource, opts, cts.token);
        listenStream(fileStream, {
            onData: chunk => emitter.fire(VSBuffer.wrap(chunk)),
            onError: error => emitter.fire(error),
            onEnd: () => {
                // Forward event
                emitter.fire('end');
                // Cleanup
                emitter.dispose();
                cts.dispose();
            }
        });
        return emitter.event;
    }
    writeFile(uriTransformer, _resource, content, opts) {
        const resource = this.transformIncoming(uriTransformer, _resource);
        return this.provider.writeFile(resource, content.buffer, opts);
    }
    open(uriTransformer, _resource, opts) {
        const resource = this.transformIncoming(uriTransformer, _resource, true);
        return this.provider.open(resource, opts);
    }
    close(fd) {
        return this.provider.close(fd);
    }
    async read(fd, pos, length) {
        const buffer = VSBuffer.alloc(length);
        const bufferOffset = 0; // offset is 0 because we create a buffer to read into for each call
        const bytesRead = await this.provider.read(fd, pos, buffer.buffer, bufferOffset, length);
        return [buffer, bytesRead];
    }
    write(fd, pos, data, offset, length) {
        return this.provider.write(fd, pos, data.buffer, offset, length);
    }
    //#endregion
    //#region Move/Copy/Delete/Create Folder
    mkdir(uriTransformer, _resource) {
        const resource = this.transformIncoming(uriTransformer, _resource);
        return this.provider.mkdir(resource);
    }
    delete(uriTransformer, _resource, opts) {
        const resource = this.transformIncoming(uriTransformer, _resource);
        return this.provider.delete(resource, opts);
    }
    rename(uriTransformer, _source, _target, opts) {
        const source = this.transformIncoming(uriTransformer, _source);
        const target = this.transformIncoming(uriTransformer, _target);
        return this.provider.rename(source, target, opts);
    }
    copy(uriTransformer, _source, _target, opts) {
        const source = this.transformIncoming(uriTransformer, _source);
        const target = this.transformIncoming(uriTransformer, _target);
        return this.provider.copy(source, target, opts);
    }
    //#endregion
    //#region Clone File
    cloneFile(uriTransformer, _source, _target) {
        const source = this.transformIncoming(uriTransformer, _source);
        const target = this.transformIncoming(uriTransformer, _target);
        return this.provider.cloneFile(source, target);
    }
    onFileChange(uriTransformer, sessionId) {
        // We want a specific emitter for the given session so that events
        // from the one session do not end up on the other session. As such
        // we create a `SessionFileWatcher` and a `Emitter` for that session.
        const emitter = new Emitter({
            onWillAddFirstListener: () => {
                this.sessionToWatcher.set(sessionId, this.createSessionFileWatcher(uriTransformer, emitter));
            },
            onDidRemoveLastListener: () => {
                dispose(this.sessionToWatcher.get(sessionId));
                this.sessionToWatcher.delete(sessionId);
            }
        });
        return emitter.event;
    }
    async watch(uriTransformer, sessionId, req, _resource, opts) {
        const watcher = this.sessionToWatcher.get(sessionId);
        if (watcher) {
            const resource = this.transformIncoming(uriTransformer, _resource);
            const disposable = watcher.watch(req, resource, opts);
            this.watchRequests.set(sessionId + req, disposable);
        }
    }
    async unwatch(sessionId, req) {
        const id = sessionId + req;
        const disposable = this.watchRequests.get(id);
        if (disposable) {
            dispose(disposable);
            this.watchRequests.delete(id);
        }
    }
    //#endregion
    dispose() {
        super.dispose();
        for (const [, disposable] of this.watchRequests) {
            disposable.dispose();
        }
        this.watchRequests.clear();
        for (const [, disposable] of this.sessionToWatcher) {
            disposable.dispose();
        }
        this.sessionToWatcher.clear();
    }
}
export class AbstractSessionFileWatcher extends Disposable {
    constructor(uriTransformer, sessionEmitter, logService, environmentService) {
        super();
        this.uriTransformer = uriTransformer;
        this.environmentService = environmentService;
        this.watcherRequests = new Map();
        this.fileWatcher = this._register(new DiskFileSystemProvider(logService));
        this.registerListeners(sessionEmitter);
    }
    registerListeners(sessionEmitter) {
        const localChangeEmitter = this._register(new Emitter());
        this._register(localChangeEmitter.event((events) => {
            sessionEmitter.fire(events.map(e => ({
                resource: this.uriTransformer.transformOutgoingURI(e.resource),
                type: e.type,
                cId: e.cId
            })));
        }));
        this._register(this.fileWatcher.onDidChangeFile(events => localChangeEmitter.fire(events)));
        this._register(this.fileWatcher.onDidWatchError(error => sessionEmitter.fire(error)));
    }
    getRecursiveWatcherOptions(environmentService) {
        return undefined; // subclasses can override
    }
    getExtraExcludes(environmentService) {
        return undefined; // subclasses can override
    }
    watch(req, resource, opts) {
        const extraExcludes = this.getExtraExcludes(this.environmentService);
        if (Array.isArray(extraExcludes)) {
            opts.excludes = [...opts.excludes, ...extraExcludes];
        }
        this.watcherRequests.set(req, this.fileWatcher.watch(resource, opts));
        return toDisposable(() => {
            dispose(this.watcherRequests.get(req));
            this.watcherRequests.delete(req);
        });
    }
    dispose() {
        for (const [, disposable] of this.watcherRequests) {
            disposable.dispose();
        }
        this.watcherRequests.clear();
        super.dispose();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlza0ZpbGVTeXN0ZW1Qcm92aWRlclNlcnZlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9maWxlcy9ub2RlL2Rpc2tGaWxlU3lzdGVtUHJvdmlkZXJTZXJ2ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLCtCQUErQixDQUFDO0FBRS9ELE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ3JFLE9BQU8sRUFBRSxVQUFVLEVBQUUsT0FBTyxFQUFlLFlBQVksRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBSW5HLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUMxRCxPQUFPLEVBQThCLFlBQVksRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBRTFGLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBUS9FOztHQUVHO0FBQ0gsTUFBTSxPQUFnQixxQ0FBeUMsU0FBUSxVQUFVO0lBRWhGLFlBQ29CLFFBQWdDLEVBQ2hDLFVBQXVCO1FBRTFDLEtBQUssRUFBRSxDQUFDO1FBSFcsYUFBUSxHQUFSLFFBQVEsQ0FBd0I7UUFDaEMsZUFBVSxHQUFWLFVBQVUsQ0FBYTtRQXlLM0MsWUFBWTtRQUVaLHVCQUF1QjtRQUVOLHFCQUFnQixHQUFHLElBQUksR0FBRyxFQUFnRCxDQUFDO1FBQzNFLGtCQUFhLEdBQUcsSUFBSSxHQUFHLEVBQXFELENBQUM7SUEzSzlGLENBQUM7SUFFRCxJQUFJLENBQUMsR0FBTSxFQUFFLE9BQWUsRUFBRSxHQUFTO1FBQ3RDLE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUVuRCxRQUFRLE9BQU8sRUFBRSxDQUFDO1lBQ2pCLEtBQUssTUFBTSxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN0RCxLQUFLLFNBQVMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxjQUFjLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDNUQsS0FBSyxNQUFNLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUM5RCxLQUFLLE9BQU8sQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN4QyxLQUFLLE1BQU0sQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3RELEtBQUssVUFBVSxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLGNBQWMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDdEUsS0FBSyxPQUFPLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3hFLEtBQUssV0FBVyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLGNBQWMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ2hGLEtBQUssUUFBUSxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLGNBQWMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzFFLEtBQUssTUFBTSxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3RFLEtBQUssV0FBVyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLGNBQWMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDeEUsS0FBSyxPQUFPLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsY0FBYyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3hELEtBQUssUUFBUSxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLGNBQWMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDbEUsS0FBSyxPQUFPLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsY0FBYyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ2hGLEtBQUssU0FBUyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFB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