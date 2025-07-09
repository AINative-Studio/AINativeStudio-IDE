/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { watchFile, unwatchFile } from 'fs';
import { Disposable, DisposableMap, DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { isWatchRequestWithCorrelation, requestFilterToString } from '../../common/watcher.js';
import { Emitter } from '../../../../base/common/event.js';
import { URI } from '../../../../base/common/uri.js';
import { DeferredPromise, ThrottledDelayer } from '../../../../base/common/async.js';
import { hash } from '../../../../base/common/hash.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
export class BaseWatcher extends Disposable {
    constructor() {
        super();
        this._onDidChangeFile = this._register(new Emitter());
        this.onDidChangeFile = this._onDidChangeFile.event;
        this._onDidLogMessage = this._register(new Emitter());
        this.onDidLogMessage = this._onDidLogMessage.event;
        this._onDidWatchFail = this._register(new Emitter());
        this.onDidWatchFail = this._onDidWatchFail.event;
        this.correlatedWatchRequests = new Map();
        this.nonCorrelatedWatchRequests = new Map();
        this.suspendedWatchRequests = this._register(new DisposableMap());
        this.suspendedWatchRequestsWithPolling = new Set();
        this.updateWatchersDelayer = this._register(new ThrottledDelayer(this.getUpdateWatchersDelay()));
        this.suspendedWatchRequestPollingInterval = 5007; // node.js default
        this.joinWatch = new DeferredPromise();
        this.verboseLogging = false;
        this._register(this.onDidWatchFail(request => this.suspendWatchRequest({
            id: this.computeId(request),
            correlationId: this.isCorrelated(request) ? request.correlationId : undefined,
            path: request.path
        })));
    }
    isCorrelated(request) {
        return isWatchRequestWithCorrelation(request);
    }
    computeId(request) {
        if (this.isCorrelated(request)) {
            return request.correlationId;
        }
        else {
            // Requests without correlation do not carry any unique identifier, so we have to
            // come up with one based on the options of the request. This matches what the
            // file service does (vs/platform/files/common/fileService.ts#L1178).
            return hash(request);
        }
    }
    async watch(requests) {
        if (!this.joinWatch.isSettled) {
            this.joinWatch.complete();
        }
        this.joinWatch = new DeferredPromise();
        try {
            this.correlatedWatchRequests.clear();
            this.nonCorrelatedWatchRequests.clear();
            // Figure out correlated vs. non-correlated requests
            for (const request of requests) {
                if (this.isCorrelated(request)) {
                    this.correlatedWatchRequests.set(request.correlationId, request);
                }
                else {
                    this.nonCorrelatedWatchRequests.set(this.computeId(request), request);
                }
            }
            // Remove all suspended watch requests that are no longer watched
            for (const [id] of this.suspendedWatchRequests) {
                if (!this.nonCorrelatedWatchRequests.has(id) && !this.correlatedWatchRequests.has(id)) {
                    this.suspendedWatchRequests.deleteAndDispose(id);
                    this.suspendedWatchRequestsWithPolling.delete(id);
                }
            }
            return await this.updateWatchers(false /* not delayed */);
        }
        finally {
            this.joinWatch.complete();
        }
    }
    updateWatchers(delayed) {
        const nonSuspendedRequests = [];
        for (const [id, request] of [...this.nonCorrelatedWatchRequests, ...this.correlatedWatchRequests]) {
            if (!this.suspendedWatchRequests.has(id)) {
                nonSuspendedRequests.push(request);
            }
        }
        return this.updateWatchersDelayer.trigger(() => this.doWatch(nonSuspendedRequests), delayed ? this.getUpdateWatchersDelay() : 0).catch(error => onUnexpectedError(error));
    }
    getUpdateWatchersDelay() {
        return 800;
    }
    isSuspended(request) {
        const id = this.computeId(request);
        return this.suspendedWatchRequestsWithPolling.has(id) ? 'polling' : this.suspendedWatchRequests.has(id);
    }
    async suspendWatchRequest(request) {
        if (this.suspendedWatchRequests.has(request.id)) {
            return; // already suspended
        }
        const disposables = new DisposableStore();
        this.suspendedWatchRequests.set(request.id, disposables);
        // It is possible that a watch request fails right during watch()
        // phase while other requests succeed. To increase the chance of
        // reusing another watcher for suspend/resume tracking, we await
        // all watch requests having processed.
        await this.joinWatch.p;
        if (disposables.isDisposed) {
            return;
        }
        this.monitorSuspendedWatchRequest(request, disposables);
        this.updateWatchers(true /* delay this call as we might accumulate many failing watch requests on startup */);
    }
    resumeWatchRequest(request) {
        this.suspendedWatchRequests.deleteAndDispose(request.id);
        this.suspendedWatchRequestsWithPolling.delete(request.id);
        this.updateWatchers(false);
    }
    monitorSuspendedWatchRequest(request, disposables) {
        if (this.doMonitorWithExistingWatcher(request, disposables)) {
            this.trace(`reusing an existing recursive watcher to monitor ${request.path}`);
            this.suspendedWatchRequestsWithPolling.delete(request.id);
        }
        else {
            this.doMonitorWithNodeJS(request, disposables);
            this.suspendedWatchRequestsWithPolling.add(request.id);
        }
    }
    doMonitorWithExistingWatcher(request, disposables) {
        const subscription = this.recursiveWatcher?.subscribe(request.path, (error, change) => {
            if (disposables.isDisposed) {
                return; // return early if already disposed
            }
            if (error) {
                this.monitorSuspendedWatchRequest(request, disposables);
            }
            else if (change?.type === 1 /* FileChangeType.ADDED */) {
                this.onMonitoredPathAdded(request);
            }
        });
        if (subscription) {
            disposables.add(subscription);
            return true;
        }
        return false;
    }
    doMonitorWithNodeJS(request, disposables) {
        let pathNotFound = false;
        const watchFileCallback = (curr, prev) => {
            if (disposables.isDisposed) {
                return; // return early if already disposed
            }
            const currentPathNotFound = this.isPathNotFound(curr);
            const previousPathNotFound = this.isPathNotFound(prev);
            const oldPathNotFound = pathNotFound;
            pathNotFound = currentPathNotFound;
            // Watch path created: resume watching request
            if (!currentPathNotFound && (previousPathNotFound || oldPathNotFound)) {
                this.onMonitoredPathAdded(request);
            }
        };
        this.trace(`starting fs.watchFile() on ${request.path} (correlationId: ${request.correlationId})`);
        try {
            watchFile(request.path, { persistent: false, interval: this.suspendedWatchRequestPollingInterval }, watchFileCallback);
        }
        catch (error) {
            this.warn(`fs.watchFile() failed with error ${error} on path ${request.path} (correlationId: ${request.correlationId})`);
        }
        disposables.add(toDisposable(() => {
            this.trace(`stopping fs.watchFile() on ${request.path} (correlationId: ${request.correlationId})`);
            try {
                unwatchFile(request.path, watchFileCallback);
            }
            catch (error) {
                this.warn(`fs.unwatchFile() failed with error ${error} on path ${request.path} (correlationId: ${request.correlationId})`);
            }
        }));
    }
    onMonitoredPathAdded(request) {
        this.trace(`detected ${request.path} exists again, resuming watcher (correlationId: ${request.correlationId})`);
        // Emit as event
        const event = { resource: URI.file(request.path), type: 1 /* FileChangeType.ADDED */, cId: request.correlationId };
        this._onDidChangeFile.fire([event]);
        this.traceEvent(event, request);
        // Resume watching
        this.resumeWatchRequest(request);
    }
    isPathNotFound(stats) {
        return stats.ctimeMs === 0 && stats.ino === 0;
    }
    async stop() {
        this.suspendedWatchRequests.clearAndDisposeAll();
        this.suspendedWatchRequestsWithPolling.clear();
    }
    traceEvent(event, request) {
        if (this.verboseLogging) {
            const traceMsg = ` >> normalized ${event.type === 1 /* FileChangeType.ADDED */ ? '[ADDED]' : event.type === 2 /* FileChangeType.DELETED */ ? '[DELETED]' : '[CHANGED]'} ${event.resource.fsPath}`;
            this.traceWithCorrelation(traceMsg, request);
        }
    }
    traceWithCorrelation(message, request) {
        if (this.verboseLogging) {
            this.trace(`${message}${typeof request.correlationId === 'number' ? ` <${request.correlationId}> ` : ``}`);
        }
    }
    requestToString(request) {
        return `${request.path} (excludes: ${request.excludes.length > 0 ? request.excludes : '<none>'}, includes: ${request.includes && request.includes.length > 0 ? JSON.stringify(request.includes) : '<all>'}, filter: ${requestFilterToString(request.filter)}, correlationId: ${typeof request.correlationId === 'number' ? request.correlationId : '<none>'})`;
    }
    async setVerboseLogging(enabled) {
        this.verboseLogging = enabled;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFzZVdhdGNoZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vZmlsZXMvbm9kZS93YXRjaGVyL2Jhc2VXYXRjaGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxTQUFTLEVBQUUsV0FBVyxFQUFTLE1BQU0sSUFBSSxDQUFDO0FBQ25ELE9BQU8sRUFBRSxVQUFVLEVBQUUsYUFBYSxFQUFFLGVBQWUsRUFBRSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNoSCxPQUFPLEVBQW1JLDZCQUE2QixFQUFFLHFCQUFxQixFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDaE8sT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFDO0FBRWxFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRCxPQUFPLEVBQUUsZUFBZSxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDckYsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3ZELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBUXRFLE1BQU0sT0FBZ0IsV0FBWSxTQUFRLFVBQVU7SUF1Qm5EO1FBQ0MsS0FBSyxFQUFFLENBQUM7UUF0QlUscUJBQWdCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBaUIsQ0FBQyxDQUFDO1FBQzFFLG9CQUFlLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQztRQUVwQyxxQkFBZ0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFlLENBQUMsQ0FBQztRQUN4RSxvQkFBZSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxL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