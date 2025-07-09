/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import parcelWatcher from '@parcel/watcher';
import { promises } from 'fs';
import { tmpdir, homedir } from 'os';
import { URI } from '../../../../../base/common/uri.js';
import { DeferredPromise, RunOnceScheduler, RunOnceWorker, ThrottledWorker } from '../../../../../base/common/async.js';
import { CancellationTokenSource } from '../../../../../base/common/cancellation.js';
import { toErrorMessage } from '../../../../../base/common/errorMessage.js';
import { Emitter, Event } from '../../../../../base/common/event.js';
import { randomPath, isEqual, isEqualOrParent } from '../../../../../base/common/extpath.js';
import { GLOBSTAR, patternsEquals } from '../../../../../base/common/glob.js';
import { BaseWatcher } from '../baseWatcher.js';
import { TernarySearchTree } from '../../../../../base/common/ternarySearchTree.js';
import { normalizeNFC } from '../../../../../base/common/normalization.js';
import { normalize, join } from '../../../../../base/common/path.js';
import { isLinux, isMacintosh, isWindows } from '../../../../../base/common/platform.js';
import { realcase, realpath } from '../../../../../base/node/extpath.js';
import { coalesceEvents, parseWatcherPatterns, isFiltered } from '../../../common/watcher.js';
import { Disposable, DisposableStore, toDisposable } from '../../../../../base/common/lifecycle.js';
export class ParcelWatcherInstance extends Disposable {
    get failed() { return this.didFail; }
    get stopped() { return this.didStop; }
    constructor(
    /**
     * Signals when the watcher is ready to watch.
     */
    ready, request, 
    /**
     * How often this watcher has been restarted in case of an unexpected
     * shutdown.
     */
    restarts, 
    /**
     * The cancellation token associated with the lifecycle of the watcher.
     */
    token, 
    /**
     * An event aggregator to coalesce events and reduce duplicates.
     */
    worker, stopFn) {
        super();
        this.ready = ready;
        this.request = request;
        this.restarts = restarts;
        this.token = token;
        this.worker = worker;
        this.stopFn = stopFn;
        this._onDidStop = this._register(new Emitter());
        this.onDidStop = this._onDidStop.event;
        this._onDidFail = this._register(new Emitter());
        this.onDidFail = this._onDidFail.event;
        this.didFail = false;
        this.didStop = false;
        this.subscriptions = new Map();
        this.includes = this.request.includes ? parseWatcherPatterns(this.request.path, this.request.includes) : undefined;
        this.excludes = this.request.excludes ? parseWatcherPatterns(this.request.path, this.request.excludes) : undefined;
        this._register(toDisposable(() => this.subscriptions.clear()));
    }
    subscribe(path, callback) {
        path = URI.file(path).fsPath; // make sure to store the path in `fsPath` form to match it with events later
        let subscriptions = this.subscriptions.get(path);
        if (!subscriptions) {
            subscriptions = new Set();
            this.subscriptions.set(path, subscriptions);
        }
        subscriptions.add(callback);
        return toDisposable(() => {
            const subscriptions = this.subscriptions.get(path);
            if (subscriptions) {
                subscriptions.delete(callback);
                if (subscriptions.size === 0) {
                    this.subscriptions.delete(path);
                }
            }
        });
    }
    get subscriptionsCount() {
        return this.subscriptions.size;
    }
    notifyFileChange(path, change) {
        const subscriptions = this.subscriptions.get(path);
        if (subscriptions) {
            for (const subscription of subscriptions) {
                subscription(change);
            }
        }
    }
    notifyWatchFailed() {
        this.didFail = true;
        this._onDidFail.fire();
    }
    include(path) {
        if (!this.includes || this.includes.length === 0) {
            return true; // no specific includes defined, include all
        }
        return this.includes.some(include => include(path));
    }
    exclude(path) {
        return Boolean(this.excludes?.some(exclude => exclude(path)));
    }
    async stop(joinRestart) {
        this.didStop = true;
        try {
            await this.stopFn();
        }
        finally {
            this._onDidStop.fire({ joinRestart });
            this.dispose();
        }
    }
}
export class ParcelWatcher extends BaseWatcher {
    static { this.MAP_PARCEL_WATCHER_ACTION_TO_FILE_CHANGE = new Map([
        ['create', 1 /* FileChangeType.ADDED */],
        ['update', 0 /* FileChangeType.UPDATED */],
        ['delete', 2 /* FileChangeType.DELETED */]
    ]); }
    static { this.PREDEFINED_EXCLUDES = {
        'win32': [],
        'darwin': [
            join(homedir(), 'Library', 'Containers') // Triggers access dialog from macOS 14 (https://github.com/microsoft/vscode/issues/208105)
        ],
        'linux': []
    }; }
    static { this.PARCEL_WATCHER_BACKEND = isWindows ? 'windows' : isLinux ? 'inotify' : 'fs-events'; }
    get watchers() { return this._watchers.values(); }
    // A delay for collecting file changes from Parcel
    // before collecting them for coalescing and emitting.
    // Parcel internally uses 50ms as delay, so we use 75ms,
    // to schedule sufficiently after Parcel.
    //
    // Note: since Parcel 2.0.7, the very first event is
    // emitted without delay if no events occured over a
    // duration of 500ms. But we always want to aggregate
    // events to apply our coleasing logic.
    //
    static { this.FILE_CHANGES_HANDLER_DELAY = 75; }
    constructor() {
        super();
        this._onDidError = this._register(new Emitter());
        this.onDidError = this._onDidError.event;
        this._watchers = new Map();
        // Reduce likelyhood of spam from file events via throttling.
        // (https://github.com/microsoft/vscode/issues/124723)
        this.throttledFileChangesEmitter = this._register(new ThrottledWorker({
            maxWorkChunkSize: 500, // only process up to 500 changes at once before...
            throttleDelay: 200, // ...resting for 200ms until we process events again...
            maxBufferedWork: 30000 // ...but never buffering more than 30000 events in memory
        }, events => this._onDidChangeFile.fire(events)));
        this.enospcErrorLogged = false;
        this.registerListeners();
    }
    registerListeners() {
        const onUncaughtException = (error) => this.onUnexpectedError(error);
        const onUnhandledRejection = (error) => this.onUnexpectedError(error);
        process.on('uncaughtException', onUncaughtException);
        process.on('unhandledRejection', onUnhandledRejection);
        this._register(toDisposable(() => {
            process.off('uncaughtException', onUncaughtException);
            process.off('unhandledRejection', onUnhandledRejection);
        }));
    }
    async doWatch(requests) {
        // Figure out duplicates to remove from the requests
        requests = await this.removeDuplicateRequests(requests);
        // Figure out which watchers to start and which to stop
        const requestsToStart = [];
        const watchersToStop = new Set(Array.from(this.watchers));
        for (const request of requests) {
            const watcher = this._watchers.get(this.requestToWatcherKey(request));
            if (watcher && patternsEquals(watcher.request.excludes, request.excludes) && patternsEquals(watcher.request.includes, request.includes) && watcher.request.pollingInterval === request.pollingInterval) {
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
            await this.stopWatching(watcher);
        }
        // Start watching as instructed
        for (const request of requestsToStart) {
            if (request.pollingInterval) {
                await this.startPolling(request, request.pollingInterval);
            }
            else {
                await this.startWatching(request);
            }
        }
    }
    requestToWatcherKey(request) {
        return typeof request.correlationId === 'number' ? request.correlationId : this.pathToWatcherKey(request.path);
    }
    pathToWatcherKey(path) {
        return isLinux ? path : path.toLowerCase() /* ignore path casing */;
    }
    async startPolling(request, pollingInterval, restarts = 0) {
        const cts = new CancellationTokenSource();
        const instance = new DeferredPromise();
        const snapshotFile = randomPath(tmpdir(), 'vscode-watcher-snapshot');
        // Remember as watcher instance
        const watcher = new ParcelWatcherInstance(instance.p, request, restarts, cts.token, new RunOnceWorker(events => this.handleParcelEvents(events, watcher), ParcelWatcher.FILE_CHANGES_HANDLER_DELAY), async () => {
            cts.dispose(true);
            watcher.worker.flush();
            watcher.worker.dispose();
            pollingWatcher.dispose();
            await promises.unlink(snapshotFile);
        });
        this._watchers.set(this.requestToWatcherKey(request), watcher);
        // Path checks for symbolic links / wrong casing
        const { realPath, realPathDiffers, realPathLength } = await this.normalizePath(request);
        this.trace(`Started watching: '${realPath}' with polling interval '${pollingInterval}'`);
        let counter = 0;
        const pollingWatcher = new RunOnceScheduler(async () => {
            counter++;
            if (cts.token.isCancellationRequested) {
                return;
            }
            // We already ran before, check for events since
            const parcelWatcherLib = parcelWatcher;
            try {
                if (counter > 1) {
                    const parcelEvents = await parcelWatcherLib.getEventsSince(realPath, snapshotFile, { ignore: this.addPredefinedExcludes(request.excludes), backend: ParcelWatcher.PARCEL_WATCHER_BACKEND });
                    if (cts.token.isCancellationRequested) {
                        return;
                    }
                    // Handle & emit events
                    this.onParcelEvents(parcelEvents, watcher, realPathDiffers, realPathLength);
                }
                // Store a snapshot of files to the snapshot file
                await parcelWatcherLib.writeSnapshot(realPath, snapshotFile, { ignore: this.addPredefinedExcludes(request.excludes), backend: ParcelWatcher.PARCEL_WATCHER_BACKEND });
            }
            catch (error) {
                this.onUnexpectedError(error, request);
            }
            // Signal we are ready now when the first snapshot was written
            if (counter === 1) {
                instance.complete();
            }
            if (cts.token.isCancellationRequested) {
                return;
            }
            // Schedule again at the next interval
            pollingWatcher.schedule();
        }, pollingInterval);
        pollingWatcher.schedule(0);
    }
    async startWatching(request, restarts = 0) {
        const cts = new CancellationTokenSource();
        const instance = new DeferredPromise();
        // Remember as watcher instance
        const watcher = new ParcelWatcherInstance(instance.p, request, restarts, cts.token, new RunOnceWorker(events => this.handleParcelEvents(events, watcher), ParcelWatcher.FILE_CHANGES_HANDLER_DELAY), async () => {
            cts.dispose(true);
            watcher.worker.flush();
            watcher.worker.dispose();
            const watcherInstance = await instance.p;
            await watcherInstance?.unsubscribe();
        });
        this._watchers.set(this.requestToWatcherKey(request), watcher);
        // Path checks for symbolic links / wrong casing
        const { realPath, realPathDiffers, realPathLength } = await this.normalizePath(request);
        try {
            const parcelWatcherLib = parcelWatcher;
            const parcelWatcherInstance = await parcelWatcherLib.subscribe(realPath, (error, parcelEvents) => {
                if (watcher.token.isCancellationRequested) {
                    return; // return early when disposed
                }
                // In any case of an error, treat this like a unhandled exception
                // that might require the watcher to restart. We do not really know
                // the state of parcel at this point and as such will try to restart
                // up to our maximum of restarts.
                if (error) {
                    this.onUnexpectedError(error, request);
                }
                // Handle & emit events
                this.onParcelEvents(parcelEvents, watcher, realPathDiffers, realPathLength);
            }, {
                backend: ParcelWatcher.PARCEL_WATCHER_BACKEND,
                ignore: this.addPredefinedExcludes(watcher.request.excludes)
            });
            this.trace(`Started watching: '${realPath}' with backend '${ParcelWatcher.PARCEL_WATCHER_BACKEND}'`);
            instance.complete(parcelWatcherInstance);
        }
        catch (error) {
            this.onUnexpectedError(error, request);
            instance.complete(undefined);
            watcher.notifyWatchFailed();
            this._onDidWatchFail.fire(request);
        }
    }
    addPredefinedExcludes(initialExcludes) {
        const excludes = [...initialExcludes];
        const predefinedExcludes = ParcelWatcher.PREDEFINED_EXCLUDES[process.platform];
        if (Array.isArray(predefinedExcludes)) {
            for (const exclude of predefinedExcludes) {
                if (!excludes.includes(exclude)) {
                    excludes.push(exclude);
                }
            }
        }
        return excludes;
    }
    onParcelEvents(parcelEvents, watcher, realPathDiffers, realPathLength) {
        if (parcelEvents.length === 0) {
            return;
        }
        // Normalize events: handle NFC normalization and symlinks
        // It is important to do this before checking for includes
        // to check on the original path.
        this.normalizeEvents(parcelEvents, watcher.request, realPathDiffers, realPathLength);
        // Check for includes
        const includedEvents = this.handleIncludes(watcher, parcelEvents);
        // Add to event aggregator for later processing
        for (const includedEvent of includedEvents) {
            watcher.worker.work(includedEvent);
        }
    }
    handleIncludes(watcher, parcelEvents) {
        const events = [];
        for (const { path, type: parcelEventType } of parcelEvents) {
            const type = ParcelWatcher.MAP_PARCEL_WATCHER_ACTION_TO_FILE_CHANGE.get(parcelEventType);
            if (this.verboseLogging) {
                this.traceWithCorrelation(`${type === 1 /* FileChangeType.ADDED */ ? '[ADDED]' : type === 2 /* FileChangeType.DELETED */ ? '[DELETED]' : '[CHANGED]'} ${path}`, watcher.request);
            }
            // Apply include filter if any
            if (!watcher.include(path)) {
                if (this.verboseLogging) {
                    this.traceWithCorrelation(` >> ignored (not included) ${path}`, watcher.request);
                }
            }
            else {
                events.push({ type, resource: URI.file(path), cId: watcher.request.correlationId });
            }
        }
        return events;
    }
    handleParcelEvents(parcelEvents, watcher) {
        // Coalesce events: merge events of same kind
        const coalescedEvents = coalesceEvents(parcelEvents);
        // Filter events: check for specific events we want to exclude
        const { events: filteredEvents, rootDeleted } = this.filterEvents(coalescedEvents, watcher);
        // Broadcast to clients
        this.emitEvents(filteredEvents, watcher);
        // Handle root path deletes
        if (rootDeleted) {
            this.onWatchedPathDeleted(watcher);
        }
    }
    emitEvents(events, watcher) {
        if (events.length === 0) {
            return;
        }
        // Broadcast to clients via throttler
        const worked = this.throttledFileChangesEmitter.work(events);
        // Logging
        if (!worked) {
            this.warn(`started ignoring events due to too many file change events at once (incoming: ${events.length}, most recent change: ${events[0].resource.fsPath}). Use 'files.watcherExclude' setting to exclude folders with lots of changing files (e.g. compilation output).`);
        }
        else {
            if (this.throttledFileChangesEmitter.pending > 0) {
                this.trace(`started throttling events due to large amount of file change events at once (pending: ${this.throttledFileChangesEmitter.pending}, most recent change: ${events[0].resource.fsPath}). Use 'files.watcherExclude' setting to exclude folders with lots of changing files (e.g. compilation output).`, watcher);
            }
        }
    }
    async normalizePath(request) {
        let realPath = request.path;
        let realPathDiffers = false;
        let realPathLength = request.path.length;
        try {
            // First check for symbolic link
            realPath = await realpath(request.path);
            // Second check for casing difference
            // Note: this will be a no-op on Linux platforms
            if (request.path === realPath) {
                realPath = await realcase(request.path) ?? request.path;
            }
            // Correct watch path as needed
            if (request.path !== realPath) {
                realPathLength = realPath.length;
                realPathDiffers = true;
                this.trace(`correcting a path to watch that seems to be a symbolic link or wrong casing (original: ${request.path}, real: ${realPath})`);
            }
        }
        catch (error) {
            // ignore
        }
        return { realPath, realPathDiffers, realPathLength };
    }
    normalizeEvents(events, request, realPathDiffers, realPathLength) {
        for (const event of events) {
            // Mac uses NFD unicode form on disk, but we want NFC
            if (isMacintosh) {
                event.path = normalizeNFC(event.path);
            }
            // Workaround for https://github.com/parcel-bundler/watcher/issues/68
            // where watching root drive letter adds extra backslashes.
            if (isWindows) {
                if (request.path.length <= 3) { // for ex. c:, C:\
                    event.path = normalize(event.path);
                }
            }
            // Convert paths back to original form in case it differs
            if (realPathDiffers) {
                event.path = request.path + event.path.substr(realPathLength);
            }
        }
    }
    filterEvents(events, watcher) {
        const filteredEvents = [];
        let rootDeleted = false;
        const filter = this.isCorrelated(watcher.request) ? watcher.request.filter : undefined; // filtering is only enabled when correlating because watchers are otherwise potentially reused
        for (const event of events) {
            // Emit to instance subscriptions if any before filtering
            if (watcher.subscriptionsCount > 0) {
                watcher.notifyFileChange(event.resource.fsPath, event);
            }
            // Filtering
            rootDeleted = event.type === 2 /* FileChangeType.DELETED */ && isEqual(event.resource.fsPath, watcher.request.path, !isLinux);
            if (isFiltered(event, filter)) {
                if (this.verboseLogging) {
                    this.traceWithCorrelation(` >> ignored (filtered) ${event.resource.fsPath}`, watcher.request);
                }
                continue;
            }
            // Logging
            this.traceEvent(event, watcher.request);
            filteredEvents.push(event);
        }
        return { events: filteredEvents, rootDeleted };
    }
    onWatchedPathDeleted(watcher) {
        this.warn('Watcher shutdown because watched path got deleted', watcher);
        watcher.notifyWatchFailed();
        this._onDidWatchFail.fire(watcher.request);
    }
    onUnexpectedError(error, request) {
        const msg = toErrorMessage(error);
        // Specially handle ENOSPC errors that can happen when
        // the watcher consumes so many file descriptors that
        // we are running into a limit. We only want to warn
        // once in this case to avoid log spam.
        // See https://github.com/microsoft/vscode/issues/7950
        if (msg.indexOf('No space left on device') !== -1) {
            if (!this.enospcErrorLogged) {
                this.error('Inotify limit reached (ENOSPC)', request);
                this.enospcErrorLogged = true;
            }
        }
        // Version 2.5.1 introduces 3 new errors on macOS
        // via https://github.dev/parcel-bundler/watcher/pull/196
        else if (msg.indexOf('File system must be re-scanned') !== -1) {
            this.error(msg, request);
        }
        // Any other error is unexpected and we should try to
        // restart the watcher as a result to get into healthy
        // state again if possible and if not attempted too much
        else {
            this.error(`Unexpected error: ${msg} (EUNKNOWN)`, request);
            this._onDidError.fire({ request, error: msg });
        }
    }
    async stop() {
        await super.stop();
        for (const watcher of this.watchers) {
            await this.stopWatching(watcher);
        }
    }
    restartWatching(watcher, delay = 800) {
        // Restart watcher delayed to accomodate for
        // changes on disk that have triggered the
        // need for a restart in the first place.
        const scheduler = new RunOnceScheduler(async () => {
            if (watcher.token.isCancellationRequested) {
                return; // return early when disposed
            }
            const restartPromise = new DeferredPromise();
            try {
                // Await the watcher having stopped, as this is
                // needed to properly re-watch the same path
                await this.stopWatching(watcher, restartPromise.p);
                // Start watcher again counting the restarts
                if (watcher.request.pollingInterval) {
                    await this.startPolling(watcher.request, watcher.request.pollingInterval, watcher.restarts + 1);
                }
                else {
                    await this.startWatching(watcher.request, watcher.restarts + 1);
                }
            }
            finally {
                restartPromise.complete();
            }
        }, delay);
        scheduler.schedule();
        watcher.token.onCancellationRequested(() => scheduler.dispose());
    }
    async stopWatching(watcher, joinRestart) {
        this.trace(`stopping file watcher`, watcher);
        this._watchers.delete(this.requestToWatcherKey(watcher.request));
        try {
            await watcher.stop(joinRestart);
        }
        catch (error) {
            this.error(`Unexpected error stopping watcher: ${toErrorMessage(error)}`, watcher.request);
        }
    }
    async removeDuplicateRequests(requests, validatePaths = true) {
        // Sort requests by path length to have shortest first
        // to have a way to prevent children to be watched if
        // parents exist.
        requests.sort((requestA, requestB) => requestA.path.length - requestB.path.length);
        // Ignore requests for the same paths that have the same correlation
        const mapCorrelationtoRequests = new Map();
        for (const request of requests) {
            if (request.excludes.includes(GLOBSTAR)) {
                continue; // path is ignored entirely (via `**` glob exclude)
            }
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
        const normalizedRequests = [];
        for (const requestsForCorrelation of mapCorrelationtoRequests.values()) {
            // Only consider requests for watching that are not
            // a child of an existing request path to prevent
            // duplication. In addition, drop any request where
            // everything is excluded (via `**` glob).
            //
            // However, allow explicit requests to watch folders
            // that are symbolic links because the Parcel watcher
            // does not allow to recursively watch symbolic links.
            const requestTrie = TernarySearchTree.forPaths(!isLinux);
            for (const request of requestsForCorrelation.values()) {
                // Check for overlapping request paths (but preserve symbolic links)
                if (requestTrie.findSubstr(request.path)) {
                    if (requestTrie.has(request.path)) {
                        this.trace(`ignoring a request for watching who's path is already watched: ${this.requestToString(request)}`);
                    }
                    else {
                        try {
                            if (!(await promises.lstat(request.path)).isSymbolicLink()) {
                                this.trace(`ignoring a request for watching who's parent is already watched: ${this.requestToString(request)}`);
                                continue;
                            }
                        }
                        catch (error) {
                            this.trace(`ignoring a request for watching who's lstat failed to resolve: ${this.requestToString(request)} (error: ${error})`);
                            this._onDidWatchFail.fire(request);
                            continue;
                        }
                    }
                }
                // Check for invalid paths
                if (validatePaths && !(await this.isPathValid(request.path))) {
                    this._onDidWatchFail.fire(request);
                    continue;
                }
                requestTrie.set(request.path, request);
            }
            normalizedRequests.push(...Array.from(requestTrie).map(([, request]) => request));
        }
        return normalizedRequests;
    }
    async isPathValid(path) {
        try {
            const stat = await promises.stat(path);
            if (!stat.isDirectory()) {
                this.trace(`ignoring a path for watching that is a file and not a folder: ${path}`);
                return false;
            }
        }
        catch (error) {
            this.trace(`ignoring a path for watching who's stat info failed to resolve: ${path} (error: ${error})`);
            return false;
        }
        return true;
    }
    subscribe(path, callback) {
        for (const watcher of this.watchers) {
            if (watcher.failed) {
                continue; // watcher has already failed
            }
            if (!isEqualOrParent(path, watcher.request.path, !isLinux)) {
                continue; // watcher does not consider this path
            }
            if (watcher.exclude(path) ||
                !watcher.include(path)) {
                continue; // parcel instance does not consider this path
            }
            const disposables = new DisposableStore();
            disposables.add(Event.once(watcher.onDidStop)(async (e) => {
                await e.joinRestart; // if we are restarting, await that so that we can possibly reuse this watcher again
                if (disposables.isDisposed) {
                    return;
                }
                callback(true /* error */);
            }));
            disposables.add(Event.once(watcher.onDidFail)(() => callback(true /* error */)));
            disposables.add(watcher.subscribe(path, change => callback(null, change)));
            return disposables;
        }
        return undefined;
    }
    trace(message, watcher) {
        if (this.verboseLogging) {
            this._onDidLogMessage.fire({ type: 'trace', message: this.toMessage(message, watcher?.request) });
        }
    }
    warn(message, watcher) {
        this._onDidLogMessage.fire({ type: 'warn', message: this.toMessage(message, watcher?.request) });
    }
    error(message, request) {
        this._onDidLogMessage.fire({ type: 'error', message: this.toMessage(message, request) });
    }
    toMessage(message, request) {
        return request ? `[File Watcher] ${message} (path: ${request.path})` : `[File Watcher ('parcel')] ${message}`;
    }
    get recursiveWatcher() { return this; }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFyY2VsV2F0Y2hlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9maWxlcy9ub2RlL3dhdGNoZXIvcGFyY2VsL3BhcmNlbFdhdGNoZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxhQUFhLE1BQU0saUJBQWlCLENBQUM7QUFDNUMsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLElBQUksQ0FBQztBQUM5QixPQUFPLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxNQUFNLElBQUksQ0FBQztBQUNyQyxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDeEQsT0FBTyxFQUFFLGVBQWUsRUFBRSxnQkFBZ0IsRUFBRSxhQUFhLEVBQUUsZUFBZSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDeEgsT0FBTyxFQUFxQix1QkFBdUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3hHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUM1RSxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxVQUFVLEVBQUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQzdGLE9BQU8sRUFBRSxRQUFRLEVBQWlCLGNBQWMsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzdGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUNoRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUNwRixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDM0UsT0FBTyxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsTUFBTSxv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