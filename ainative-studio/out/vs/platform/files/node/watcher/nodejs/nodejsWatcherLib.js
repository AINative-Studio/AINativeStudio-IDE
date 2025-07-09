/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { watch, promises } from 'fs';
import { RunOnceWorker, ThrottledWorker } from '../../../../../base/common/async.js';
import { CancellationTokenSource } from '../../../../../base/common/cancellation.js';
import { isEqual, isEqualOrParent } from '../../../../../base/common/extpath.js';
import { Disposable, DisposableStore, toDisposable } from '../../../../../base/common/lifecycle.js';
import { normalizeNFC } from '../../../../../base/common/normalization.js';
import { basename, dirname, join } from '../../../../../base/common/path.js';
import { isLinux, isMacintosh } from '../../../../../base/common/platform.js';
import { joinPath } from '../../../../../base/common/resources.js';
import { URI } from '../../../../../base/common/uri.js';
import { realpath } from '../../../../../base/node/extpath.js';
import { Promises } from '../../../../../base/node/pfs.js';
import { coalesceEvents, parseWatcherPatterns, isFiltered, isWatchRequestWithCorrelation } from '../../../common/watcher.js';
import { Lazy } from '../../../../../base/common/lazy.js';
export class NodeJSFileWatcherLibrary extends Disposable {
    // A delay in reacting to file deletes to support
    // atomic save operations where a tool may chose
    // to delete a file before creating it again for
    // an update.
    static { this.FILE_DELETE_HANDLER_DELAY = 100; }
    // A delay for collecting file changes from node.js
    // before collecting them for coalescing and emitting
    // Same delay as used for the recursive watcher.
    static { this.FILE_CHANGES_HANDLER_DELAY = 75; }
    get isReusingRecursiveWatcher() { return this._isReusingRecursiveWatcher; }
    get failed() { return this.didFail; }
    constructor(request, recursiveWatcher, onDidFilesChange, onDidWatchFail, onLogMessage, verboseLogging) {
        super();
        this.request = request;
        this.recursiveWatcher = recursiveWatcher;
        this.onDidFilesChange = onDidFilesChange;
        this.onDidWatchFail = onDidWatchFail;
        this.onLogMessage = onLogMessage;
        this.verboseLogging = verboseLogging;
        // Reduce likelyhood of spam from file events via throttling.
        // These numbers are a bit more aggressive compared to the
        // recursive watcher because we can have many individual
        // node.js watchers per request.
        // (https://github.com/microsoft/vscode/issues/124723)
        this.throttledFileChangesEmitter = this._register(new ThrottledWorker({
            maxWorkChunkSize: 100, // only process up to 100 changes at once before...
            throttleDelay: 200, // ...resting for 200ms until we process events again...
            maxBufferedWork: 10000 // ...but never buffering more than 10000 events in memory
        }, events => this.onDidFilesChange(events)));
        // Aggregate file changes over FILE_CHANGES_HANDLER_DELAY
        // to coalesce events and reduce spam.
        this.fileChangesAggregator = this._register(new RunOnceWorker(events => this.handleFileChanges(events), NodeJSFileWatcherLibrary.FILE_CHANGES_HANDLER_DELAY));
        this.cts = new CancellationTokenSource();
        this.realPath = new Lazy(async () => {
            // This property is intentionally `Lazy` and not using `realcase()` as the counterpart
            // in the recursive watcher because of the amount of paths this watcher is dealing with.
            // We try as much as possible to avoid even needing `realpath()` if we can because even
            // that method does an `lstat()` per segment of the path.
            let result = this.request.path;
            try {
                result = await realpath(this.request.path);
                if (this.request.path !== result) {
                    this.trace(`correcting a path to watch that seems to be a symbolic link (original: ${this.request.path}, real: ${result})`);
                }
            }
            catch (error) {
                // ignore
            }
            return result;
        });
        this._isReusingRecursiveWatcher = false;
        this.didFail = false;
        this.excludes = parseWatcherPatterns(this.request.path, this.request.excludes);
        this.includes = this.request.includes ? parseWatcherPatterns(this.request.path, this.request.includes) : undefined;
        this.filter = isWatchRequestWithCorrelation(this.request) ? this.request.filter : undefined; // filtering is only enabled when correlating because watchers are otherwise potentially reused
        this.ready = this.watch();
    }
    async watch() {
        try {
            const stat = await promises.stat(this.request.path);
            if (this.cts.token.isCancellationRequested) {
                return;
            }
            this._register(await this.doWatch(stat.isDirectory()));
        }
        catch (error) {
            if (error.code !== 'ENOENT') {
                this.error(error);
            }
            else {
                this.trace(`ignoring a path for watching who's stat info failed to resolve: ${this.request.path} (error: ${error})`);
            }
            this.notifyWatchFailed();
        }
    }
    notifyWatchFailed() {
        this.didFail = true;
        this.onDidWatchFail?.();
    }
    async doWatch(isDirectory) {
        const disposables = new DisposableStore();
        if (this.doWatchWithExistingWatcher(isDirectory, disposables)) {
            this.trace(`reusing an existing recursive watcher for ${this.request.path}`);
            this._isReusingRecursiveWatcher = true;
        }
        else {
            this._isReusingRecursiveWatcher = false;
            await this.doWatchWithNodeJS(isDirectory, disposables);
        }
        return disposables;
    }
    doWatchWithExistingWatcher(isDirectory, disposables) {
        if (isDirectory) {
            // Recursive watcher re-use is currently not enabled for when
            // folders are watched. this is because the dispatching in the
            // recursive watcher for non-recurive requests is optimized for
            // file changes  where we really only match on the exact path
            // and not child paths.
            return false;
        }
        const resource = URI.file(this.request.path);
        const subscription = this.recursiveWatcher?.subscribe(this.request.path, async (error, change) => {
            if (disposables.isDisposed) {
                return; // return early if already disposed
            }
            if (error) {
                const watchDisposable = await this.doWatch(isDirectory);
                if (!disposables.isDisposed) {
                    disposables.add(watchDisposable);
                }
                else {
                    watchDisposable.dispose();
                }
            }
            else if (change) {
                if (typeof change.cId === 'number' || typeof this.request.correlationId === 'number') {
                    // Re-emit this change with the correlation id of the request
                    // so that the client can correlate the event with the request
                    // properly. Without correlation, we do not have to do that
                    // because the event will appear on the global listener already.
                    this.onFileChange({ resource, type: change.type, cId: this.request.correlationId }, true /* skip excludes/includes (file is explicitly watched) */);
                }
            }
        });
        if (subscription) {
            disposables.add(subscription);
            return true;
        }
        return false;
    }
    async doWatchWithNodeJS(isDirectory, disposables) {
        const realPath = await this.realPath.value;
        // macOS: watching samba shares can crash VSCode so we do
        // a simple check for the file path pointing to /Volumes
        // (https://github.com/microsoft/vscode/issues/106879)
        // TODO@electron this needs a revisit when the crash is
        // fixed or mitigated upstream.
        if (isMacintosh && isEqualOrParent(realPath, '/Volumes/', true)) {
            this.error(`Refusing to watch ${realPath} for changes using fs.watch() for possibly being a network share where watching is unreliable and unstable.`);
            return;
        }
        const cts = new CancellationTokenSource(this.cts.token);
        disposables.add(toDisposable(() => cts.dispose(true)));
        const watcherDisposables = new DisposableStore(); // we need a separate disposable store because we re-create the watcher from within in some cases
        disposables.add(watcherDisposables);
        try {
            const requestResource = URI.file(this.request.path);
            const pathBasename = basename(realPath);
            // Creating watcher can fail with an exception
            const watcher = watch(realPath);
            watcherDisposables.add(toDisposable(() => {
                watcher.removeAllListeners();
                watcher.close();
            }));
            this.trace(`Started watching: '${realPath}'`);
            // Folder: resolve children to emit proper events
            const folderChildren = new Set();
            if (isDirectory) {
                try {
                    for (const child of await Promises.readdir(realPath)) {
                        folderChildren.add(child);
                    }
                }
                catch (error) {
                    this.error(error);
                }
            }
            if (cts.token.isCancellationRequested) {
                return;
            }
            const mapPathToStatDisposable = new Map();
            watcherDisposables.add(toDisposable(() => {
                for (const [, disposable] of mapPathToStatDisposable) {
                    disposable.dispose();
                }
                mapPathToStatDisposable.clear();
            }));
            watcher.on('error', (code, signal) => {
                if (cts.token.isCancellationRequested) {
                    return;
                }
                this.error(`Failed to watch ${realPath} for changes using fs.watch() (${code}, ${signal})`);
                this.notifyWatchFailed();
            });
            watcher.on('change', (type, raw) => {
                if (cts.token.isCancellationRequested) {
                    return; // ignore if already disposed
                }
                if (this.verboseLogging) {
                    this.traceWithCorrelation(`[raw] ["${type}"] ${raw}`);
                }
                // Normalize file name
                let changedFileName = '';
                if (raw) { // https://github.com/microsoft/vscode/issues/38191
                    changedFileName = raw.toString();
                    if (isMacintosh) {
                        // Mac: uses NFD unicode form on disk, but we want NFC
                        // See also https://github.com/nodejs/node/issues/2165
                        changedFileName = normalizeNFC(changedFileName);
                    }
                }
                if (!changedFileName || (type !== 'change' && type !== 'rename')) {
                    return; // ignore unexpected events
                }
                // Folder
                if (isDirectory) {
                    // Folder child added/deleted
                    if (type === 'rename') {
                        // Cancel any previous stats for this file if existing
                        mapPathToStatDisposable.get(changedFileName)?.dispose();
                        // Wait a bit and try see if the file still exists on disk
                        // to decide on the resulting event
                        const timeoutHandle = setTimeout(async () => {
                            mapPathToStatDisposable.delete(changedFileName);
                            // Depending on the OS the watcher runs on, there
                            // is different behaviour for when the watched
                            // folder path is being deleted:
                            //
                            // -   macOS: not reported but events continue to
                            //            work even when the folder is brought
                            //            back, though it seems every change
                            //            to a file is reported as "rename"
                            // -   Linux: "rename" event is reported with the
                            //            name of the folder and events stop
                            //            working
                            // - Windows: an EPERM error is thrown that we
                            //            handle from the `on('error')` event
                            //
                            // We do not re-attach the watcher after timeout
                            // though as we do for file watches because for
                            // file watching specifically we want to handle
                            // the atomic-write cases where the file is being
                            // deleted and recreated with different contents.
                            if (isEqual(changedFileName, pathBasename, !isLinux) && !await Promises.exists(realPath)) {
                                this.onWatchedPathDeleted(requestResource);
                                return;
                            }
                            if (cts.token.isCancellationRequested) {
                                return;
                            }
                            // In order to properly detect renames on a case-insensitive
                            // file system, we need to use `existsChildStrictCase` helper
                            // because otherwise we would wrongly assume a file exists
                            // when it was renamed to same name but different case.
                            const fileExists = await this.existsChildStrictCase(join(realPath, changedFileName));
                            if (cts.token.isCancellationRequested) {
                                return; // ignore if disposed by now
                            }
                            // Figure out the correct event type:
                            // File Exists: either 'added' or 'updated' if known before
                            // File Does not Exist: always 'deleted'
                            let type;
                            if (fileExists) {
                                if (folderChildren.has(changedFileName)) {
                                    type = 0 /* FileChangeType.UPDATED */;
                                }
                                else {
                                    type = 1 /* FileChangeType.ADDED */;
                                    folderChildren.add(changedFileName);
                                }
                            }
                            else {
                                folderChildren.delete(changedFileName);
                                type = 2 /* FileChangeType.DELETED */;
                            }
                            this.onFileChange({ resource: joinPath(requestResource, changedFileName), type, cId: this.request.correlationId });
                        }, NodeJSFileWatcherLibrary.FILE_DELETE_HANDLER_DELAY);
                        mapPathToStatDisposable.set(changedFileName, toDisposable(() => clearTimeout(timeoutHandle)));
                    }
                    // Folder child changed
                    else {
                        // Figure out the correct event type: if this is the
                        // first time we see this child, it can only be added
                        let type;
                        if (folderChildren.has(changedFileName)) {
                            type = 0 /* FileChangeType.UPDATED */;
                        }
                        else {
                            type = 1 /* FileChangeType.ADDED */;
                            folderChildren.add(changedFileName);
                        }
                        this.onFileChange({ resource: joinPath(requestResource, changedFileName), type, cId: this.request.correlationId });
                    }
                }
                // File
                else {
                    // File added/deleted
                    if (type === 'rename' || !isEqual(changedFileName, pathBasename, !isLinux)) {
                        // Depending on the OS the watcher runs on, there
                        // is different behaviour for when the watched
                        // file path is being deleted:
                        //
                        // -   macOS: "rename" event is reported and events
                        //            stop working
                        // -   Linux: "rename" event is reported and events
                        //            stop working
                        // - Windows: "rename" event is reported and events
                        //            continue to work when file is restored
                        //
                        // As opposed to folder watching, we re-attach the
                        // watcher after brief timeout to support "atomic save"
                        // operations where a tool may decide to delete a file
                        // and then create it with the updated contents.
                        //
                        // Different to folder watching, we emit a delete event
                        // though we never detect when the file is brought back
                        // because the watcher is disposed then.
                        const timeoutHandle = setTimeout(async () => {
                            const fileExists = await Promises.exists(realPath);
                            if (cts.token.isCancellationRequested) {
                                return; // ignore if disposed by now
                            }
                            // File still exists, so emit as change event and reapply the watcher
                            if (fileExists) {
                                this.onFileChange({ resource: requestResource, type: 0 /* FileChangeType.UPDATED */, cId: this.request.correlationId }, true /* skip excludes/includes (file is explicitly watched) */);
                                watcherDisposables.add(await this.doWatch(false));
                            }
                            // File seems to be really gone, so emit a deleted and failed event
                            else {
                                this.onWatchedPathDeleted(requestResource);
                            }
                        }, NodeJSFileWatcherLibrary.FILE_DELETE_HANDLER_DELAY);
                        // Very important to dispose the watcher which now points to a stale inode
                        // and wire in a new disposable that tracks our timeout that is installed
                        watcherDisposables.clear();
                        watcherDisposables.add(toDisposable(() => clearTimeout(timeoutHandle)));
                    }
                    // File changed
                    else {
                        this.onFileChange({ resource: requestResource, type: 0 /* FileChangeType.UPDATED */, cId: this.request.correlationId }, true /* skip excludes/includes (file is explicitly watched) */);
                    }
                }
            });
        }
        catch (error) {
            if (!cts.token.isCancellationRequested) {
                this.error(`Failed to watch ${realPath} for changes using fs.watch() (${error.toString()})`);
            }
            this.notifyWatchFailed();
        }
    }
    onWatchedPathDeleted(resource) {
        this.warn('Watcher shutdown because watched path got deleted');
        // Emit events and flush in case the watcher gets disposed
        this.onFileChange({ resource, type: 2 /* FileChangeType.DELETED */, cId: this.request.correlationId }, true /* skip excludes/includes (file is explicitly watched) */);
        this.fileChangesAggregator.flush();
        this.notifyWatchFailed();
    }
    onFileChange(event, skipIncludeExcludeChecks = false) {
        if (this.cts.token.isCancellationRequested) {
            return;
        }
        // Logging
        if (this.verboseLogging) {
            this.traceWithCorrelation(`${event.type === 1 /* FileChangeType.ADDED */ ? '[ADDED]' : event.type === 2 /* FileChangeType.DELETED */ ? '[DELETED]' : '[CHANGED]'} ${event.resource.fsPath}`);
        }
        // Add to aggregator unless excluded or not included (not if explicitly disabled)
        if (!skipIncludeExcludeChecks && this.excludes.some(exclude => exclude(event.resource.fsPath))) {
            if (this.verboseLogging) {
                this.traceWithCorrelation(` >> ignored (excluded) ${event.resource.fsPath}`);
            }
        }
        else if (!skipIncludeExcludeChecks && this.includes && this.includes.length > 0 && !this.includes.some(include => include(event.resource.fsPath))) {
            if (this.verboseLogging) {
                this.traceWithCorrelation(` >> ignored (not included) ${event.resource.fsPath}`);
            }
        }
        else {
            this.fileChangesAggregator.work(event);
        }
    }
    handleFileChanges(fileChanges) {
        // Coalesce events: merge events of same kind
        const coalescedFileChanges = coalesceEvents(fileChanges);
        // Filter events: based on request filter property
        const filteredEvents = [];
        for (const event of coalescedFileChanges) {
            if (isFiltered(event, this.filter)) {
                if (this.verboseLogging) {
                    this.traceWithCorrelation(` >> ignored (filtered) ${event.resource.fsPath}`);
                }
                continue;
            }
            filteredEvents.push(event);
        }
        if (filteredEvents.length === 0) {
            return;
        }
        // Logging
        if (this.verboseLogging) {
            for (const event of filteredEvents) {
                this.traceWithCorrelation(` >> normalized ${event.type === 1 /* FileChangeType.ADDED */ ? '[ADDED]' : event.type === 2 /* FileChangeType.DELETED */ ? '[DELETED]' : '[CHANGED]'} ${event.resource.fsPath}`);
            }
        }
        // Broadcast to clients via throttled emitter
        const worked = this.throttledFileChangesEmitter.work(filteredEvents);
        // Logging
        if (!worked) {
            this.warn(`started ignoring events due to too many file change events at once (incoming: ${filteredEvents.length}, most recent change: ${filteredEvents[0].resource.fsPath}). Use 'files.watcherExclude' setting to exclude folders with lots of changing files (e.g. compilation output).`);
        }
        else {
            if (this.throttledFileChangesEmitter.pending > 0) {
                this.trace(`started throttling events due to large amount of file change events at once (pending: ${this.throttledFileChangesEmitter.pending}, most recent change: ${filteredEvents[0].resource.fsPath}). Use 'files.watcherExclude' setting to exclude folders with lots of changing files (e.g. compilation output).`);
            }
        }
    }
    async existsChildStrictCase(path) {
        if (isLinux) {
            return Promises.exists(path);
        }
        try {
            const pathBasename = basename(path);
            const children = await Promises.readdir(dirname(path));
            return children.some(child => child === pathBasename);
        }
        catch (error) {
            this.trace(error);
            return false;
        }
    }
    setVerboseLogging(verboseLogging) {
        this.verboseLogging = verboseLogging;
    }
    error(error) {
        if (!this.cts.token.isCancellationRequested) {
            this.onLogMessage?.({ type: 'error', message: `[File Watcher (node.js)] ${error}` });
        }
    }
    warn(message) {
        if (!this.cts.token.isCancellationRequested) {
            this.onLogMessage?.({ type: 'warn', message: `[File Watcher (node.js)] ${message}` });
        }
    }
    trace(message) {
        if (!this.cts.token.isCancellationRequested && this.verboseLogging) {
            this.onLogMessage?.({ type: 'trace', message: `[File Watcher (node.js)] ${message}` });
        }
    }
    traceWithCorrelation(message) {
        if (!this.cts.token.isCancellationRequested && this.verboseLogging) {
            this.trace(`${message}${typeof this.request.correlationId === 'number' ? ` <${this.request.correlationId}> ` : ``}`);
        }
    }
    dispose() {
        this.cts.dispose(true);
        super.dispose();
    }
}
/**
 * Watch the provided `path` for changes and return
 * the data in chunks of `Uint8Array` for further use.
 */
export async function watchFileContents(path, onData, onReady, token, bufferSize = 512) {
    const handle = await Promises.open(path, 'r');
    const buffer = Buffer.allocUnsafe(bufferSize);
    const cts = new CancellationTokenSource(token);
    let error = undefined;
    let isReading = false;
    const request = { path, excludes: [], recursive: false };
    const watcher = new NodeJSFileWatcherLibrary(request, undefined, changes => {
        (async () => {
            for (const { type } of changes) {
                if (type === 0 /* FileChangeType.UPDATED */) {
                    if (isReading) {
                        return; // return early if we are already reading the output
                    }
                    isReading = true;
                    try {
                        // Consume the new contents of the file until finished
                        // everytime there is a change event signalling a change
                        while (!cts.token.isCancellationRequested) {
                            const { bytesRead } = await Promises.read(handle, buffer, 0, bufferSize, null);
                            if (!bytesRead || cts.token.isCancellationRequested) {
                                break;
                            }
                            onData(buffer.slice(0, bytesRead));
                        }
                    }
                    catch (err) {
                        error = new Error(err);
                        cts.dispose(true);
                    }
                    finally {
                        isReading = false;
                    }
                }
            }
        })();
    });
    await watcher.ready;
    onReady();
    return new Promise((resolve, reject) => {
        cts.token.onCancellationRequested(async () => {
            watcher.dispose();
            try {
                await Promises.close(handle);
            }
            catch (err) {
                error = new Error(err);
            }
            if (error) {
                reject(error);
            }
            else {
                resolve();
            }
        });
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZWpzV2F0Y2hlckxpYi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9maWxlcy9ub2RlL3dhdGNoZXIvbm9kZWpzL25vZGVqc1dhdGNoZXJMaWIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsTUFBTSxJQUFJLENBQUM7QUFDckMsT0FBTyxFQUFFLGFBQWEsRUFBRSxlQUFlLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNyRixPQUFPLEVBQXFCLHVCQUF1QixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDeEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNqRixPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBZSxZQUFZLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNqSCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDM0UsT0FBTyxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDN0UsT0FBTyxFQUFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUM5RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDbkUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3hELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFFM0QsT0FBTyxFQUFlLGNBQWMsRUFBNkIsb0JBQW9CLEVBQWtDLFVBQVUsRUFBRSw2QkFBNkIsRUFBRSxNQUFNLDRCQUE0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