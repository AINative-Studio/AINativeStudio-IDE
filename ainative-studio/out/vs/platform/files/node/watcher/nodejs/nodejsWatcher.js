/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Event } from '../../../../../base/common/event.js';
import { patternsEquals } from '../../../../../base/common/glob.js';
import { BaseWatcher } from '../baseWatcher.js';
import { isLinux } from '../../../../../base/common/platform.js';
import { NodeJSFileWatcherLibrary } from './nodejsWatcherLib.js';
export class NodeJSWatcher extends BaseWatcher {
    get watchers() { return this._watchers.values(); }
    constructor(recursiveWatcher) {
        super();
        this.recursiveWatcher = recursiveWatcher;
        this.onDidError = Event.None;
        this._watchers = new Map();
    }
    async doWatch(requests) {
        // Figure out duplicates to remove from the requests
        requests = this.removeDuplicateRequests(requests);
        // Figure out which watchers to start and which to stop
        const requestsToStart = [];
        const watchersToStop = new Set(Array.from(this.watchers));
        for (const request of requests) {
            const watcher = this._watchers.get(this.requestToWatcherKey(request));
            if (watcher && patternsEquals(watcher.request.excludes, request.excludes) && patternsEquals(watcher.request.includes, request.includes)) {
                watchersToStop.delete(watcher); // keep watcher
            }
            else {
                requestsToStart.push(request); // start watching
            }
        }
        // Logging
        if (requestsToStart.length) {
            this.trace(`Request to start watching: ${requestsToStart.map(request => this.requestToString(request)).join(',')}`);
        }
        if (watchersToStop.size) {
            this.trace(`Request to stop watching: ${Array.from(watchersToStop).map(watcher => this.requestToString(watcher.request)).join(',')}`);
        }
        // Stop watching as instructed
        for (const watcher of watchersToStop) {
            this.stopWatching(watcher);
        }
        // Start watching as instructed
        for (const request of requestsToStart) {
            this.startWatching(request);
        }
    }
    requestToWatcherKey(request) {
        return typeof request.correlationId === 'number' ? request.correlationId : this.pathToWatcherKey(request.path);
    }
    pathToWatcherKey(path) {
        return isLinux ? path : path.toLowerCase() /* ignore path casing */;
    }
    startWatching(request) {
        // Start via node.js lib
        const instance = new NodeJSFileWatcherLibrary(request, this.recursiveWatcher, changes => this._onDidChangeFile.fire(changes), () => this._onDidWatchFail.fire(request), msg => this._onDidLogMessage.fire(msg), this.verboseLogging);
        // Remember as watcher instance
        const watcher = { request, instance };
        this._watchers.set(this.requestToWatcherKey(request), watcher);
    }
    async stop() {
        await super.stop();
        for (const watcher of this.watchers) {
            this.stopWatching(watcher);
        }
    }
    stopWatching(watcher) {
        this.trace(`stopping file watcher`, watcher);
        this._watchers.delete(this.requestToWatcherKey(watcher.request));
        watcher.instance.dispose();
    }
    removeDuplicateRequests(requests) {
        const mapCorrelationtoRequests = new Map();
        // Ignore requests for the same paths that have the same correlation
        for (const request of requests) {
            let requestsForCorrelation = mapCorrelationtoRequests.get(request.correlationId);
            if (!requestsForCorrelation) {
                requestsForCorrelation = new Map();
                mapCorrelationtoRequests.set(request.correlationId, requestsForCorrelation);
            }
            const path = this.pathToWatcherKey(request.path);
            if (requestsForCorrelation.has(path)) {
                this.trace(`ignoring a request for watching who's path is already watched: ${this.requestToString(request)}`);
            }
            requestsForCorrelation.set(path, request);
        }
        return Array.from(mapCorrelationtoRequests.values()).map(requests => Array.from(requests.values())).flat();
    }
    async setVerboseLogging(enabled) {
        super.setVerboseLogging(enabled);
        for (const watcher of this.watchers) {
            watcher.instance.setVerboseLogging(enabled);
        }
    }
    trace(message, watcher) {
        if (this.verboseLogging) {
            this._onDidLogMessage.fire({ type: 'trace', message: this.toMessage(message, watcher) });
        }
    }
    warn(message) {
        this._onDidLogMessage.fire({ type: 'warn', message: this.toMessage(message) });
    }
    toMessage(message, watcher) {
        return watcher ? `[File Watcher (node.js)] ${message} (${this.requestToString(watcher.request)})` : `[File Watcher (node.js)] ${message}`;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZWpzV2F0Y2hlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9maWxlcy9ub2RlL3dhdGNoZXIvbm9kZWpzL25vZGVqc1dhdGNoZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUNwRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFDaEQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBRWpFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBZWpFLE1BQU0sT0FBTyxhQUFjLFNBQVEsV0FBVztJQUs3QyxJQUFJLFFBQVEsS0FBSyxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBRWxELFlBQStCLGdCQUE0RDtRQUMxRixLQUFLLEVBQUUsQ0FBQztRQURzQixxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQTRDO1FBTGxGLGVBQVUsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDO1FBRWhCLGNBQVMsR0FBRyxJQUFJLEdBQUcsRUFBMkUsQ0FBQztJQUtoSCxDQUFDO0lBRWtCLEtBQUssQ0FBQyxPQUFPLENBQUMsUUFBcUM7UUFFckUsb0RBQW9EO1FBQ3BELFFBQVEsR0FBRyxJQUFJLENBQUMsdUJBQXVCLENBQUMsUUFBUSxDQUFDLENBQUM7UUFFbEQsdURBQXVEO1FBQ3ZELE1BQU0sZUFBZSxHQUFnQyxFQUFFLENBQUM7UUFDeEQsTUFBTSxjQUFjLEdBQUcsSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJ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