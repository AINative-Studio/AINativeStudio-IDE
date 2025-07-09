/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { insert } from '../../../base/common/arrays.js';
import { ThrottledDelayer } from '../../../base/common/async.js';
import { onUnexpectedError } from '../../../base/common/errors.js';
import { Emitter } from '../../../base/common/event.js';
import { removeTrailingPathSeparator } from '../../../base/common/extpath.js';
import { Disposable, toDisposable } from '../../../base/common/lifecycle.js';
import { normalize } from '../../../base/common/path.js';
import { isRecursiveWatchRequest, reviveFileChanges } from './watcher.js';
import { LogLevel } from '../../log/common/log.js';
export class AbstractDiskFileSystemProvider extends Disposable {
    constructor(logService, options) {
        super();
        this.logService = logService;
        this.options = options;
        this._onDidChangeFile = this._register(new Emitter());
        this.onDidChangeFile = this._onDidChangeFile.event;
        this._onDidWatchError = this._register(new Emitter());
        this.onDidWatchError = this._onDidWatchError.event;
        this.universalWatchRequests = [];
        this.universalWatchRequestDelayer = this._register(new ThrottledDelayer(0));
        this.nonRecursiveWatchRequests = [];
        this.nonRecursiveWatchRequestDelayer = this._register(new ThrottledDelayer(0));
    }
    watch(resource, opts) {
        if (opts.recursive || this.options?.watcher?.forceUniversal) {
            return this.watchUniversal(resource, opts);
        }
        return this.watchNonRecursive(resource, opts);
    }
    watchUniversal(resource, opts) {
        const request = this.toWatchRequest(resource, opts);
        const remove = insert(this.universalWatchRequests, request);
        // Trigger update
        this.refreshUniversalWatchers();
        return toDisposable(() => {
            // Remove from list of paths to watch universally
            remove();
            // Trigger update
            this.refreshUniversalWatchers();
        });
    }
    toWatchRequest(resource, opts) {
        const request = {
            path: this.toWatchPath(resource),
            excludes: opts.excludes,
            includes: opts.includes,
            recursive: opts.recursive,
            filter: opts.filter,
            correlationId: opts.correlationId
        };
        if (isRecursiveWatchRequest(request)) {
            // Adjust for polling
            const usePolling = this.options?.watcher?.recursive?.usePolling;
            if (usePolling === true) {
                request.pollingInterval = this.options?.watcher?.recursive?.pollingInterval ?? 5000;
            }
            else if (Array.isArray(usePolling)) {
                if (usePolling.includes(request.path)) {
                    request.pollingInterval = this.options?.watcher?.recursive?.pollingInterval ?? 5000;
                }
            }
        }
        return request;
    }
    refreshUniversalWatchers() {
        // Buffer requests for universal watching to decide on right watcher
        // that supports potentially watching more than one path at once
        this.universalWatchRequestDelayer.trigger(() => {
            return this.doRefreshUniversalWatchers();
        }).catch(error => onUnexpectedError(error));
    }
    doRefreshUniversalWatchers() {
        // Create watcher if this is the first time
        if (!this.universalWatcher) {
            this.universalWatcher = this._register(this.createUniversalWatcher(changes => this._onDidChangeFile.fire(reviveFileChanges(changes)), msg => this.onWatcherLogMessage(msg), this.logService.getLevel() === LogLevel.Trace));
            // Apply log levels dynamically
            this._register(this.logService.onDidChangeLogLevel(() => {
                this.universalWatcher?.setVerboseLogging(this.logService.getLevel() === LogLevel.Trace);
            }));
        }
        // Ask to watch the provided paths
        return this.universalWatcher.watch(this.universalWatchRequests);
    }
    watchNonRecursive(resource, opts) {
        // Add to list of paths to watch non-recursively
        const request = {
            path: this.toWatchPath(resource),
            excludes: opts.excludes,
            includes: opts.includes,
            recursive: false,
            filter: opts.filter,
            correlationId: opts.correlationId
        };
        const remove = insert(this.nonRecursiveWatchRequests, request);
        // Trigger update
        this.refreshNonRecursiveWatchers();
        return toDisposable(() => {
            // Remove from list of paths to watch non-recursively
            remove();
            // Trigger update
            this.refreshNonRecursiveWatchers();
        });
    }
    refreshNonRecursiveWatchers() {
        // Buffer requests for nonrecursive watching to decide on right watcher
        // that supports potentially watching more than one path at once
        this.nonRecursiveWatchRequestDelayer.trigger(() => {
            return this.doRefreshNonRecursiveWatchers();
        }).catch(error => onUnexpectedError(error));
    }
    doRefreshNonRecursiveWatchers() {
        // Create watcher if this is the first time
        if (!this.nonRecursiveWatcher) {
            this.nonRecursiveWatcher = this._register(this.createNonRecursiveWatcher(changes => this._onDidChangeFile.fire(reviveFileChanges(changes)), msg => this.onWatcherLogMessage(msg), this.logService.getLevel() === LogLevel.Trace));
            // Apply log levels dynamically
            this._register(this.logService.onDidChangeLogLevel(() => {
                this.nonRecursiveWatcher?.setVerboseLogging(this.logService.getLevel() === LogLevel.Trace);
            }));
        }
        // Ask to watch the provided paths
        return this.nonRecursiveWatcher.watch(this.nonRecursiveWatchRequests);
    }
    //#endregion
    onWatcherLogMessage(msg) {
        if (msg.type === 'error') {
            this._onDidWatchError.fire(msg.message);
        }
        this.logWatcherMessage(msg);
    }
    logWatcherMessage(msg) {
        this.logService[msg.type](msg.message);
    }
    toFilePath(resource) {
        return normalize(resource.fsPath);
    }
    toWatchPath(resource) {
        const filePath = this.toFilePath(resource);
        // Ensure to have any trailing path separators removed, otherwise
        // we may believe the path is not "real" and will convert every
        // event back to this form, which is not warranted.
        // See also https://github.com/microsoft/vscode/issues/210517
        return removeTrailingPathSeparator(filePath);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlza0ZpbGVTeXN0ZW1Qcm92aWRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9maWxlcy9jb21tb24vZGlza0ZpbGVTeXN0ZW1Qcm92aWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDeEQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDakUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDbkUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3hELE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxVQUFVLEVBQWUsWUFBWSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDMUYsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBR3pELE9BQU8sRUFBdUksdUJBQXVCLEVBQTBCLGlCQUFpQixFQUFFLE1BQU0sY0FBYyxDQUFDO0FBQ3ZPLE9BQU8sRUFBZSxRQUFRLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQXdCaEUsTUFBTSxPQUFnQiw4QkFBK0IsU0FBUSxVQUFVO0lBS3RFLFlBQ29CLFVBQXVCLEVBQ3pCLE9BQXdDO1FBRXpELEtBQUssRUFBRSxDQUFDO1FBSFcsZUFBVSxHQUFWLFVBQVUsQ0FBYTtRQUN6QixZQUFPLEdBQVAsT0FBTyxDQUFpQztRQUt2QyxxQkFBZ0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUEwQixDQUFDLENBQUM7UUFDbkYsb0JBQWUsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDO1FB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