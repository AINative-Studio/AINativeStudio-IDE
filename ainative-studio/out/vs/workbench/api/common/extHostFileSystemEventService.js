/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter, AsyncEmitter } from '../../../base/common/event.js';
import { GLOBSTAR, GLOB_SPLIT, parse } from '../../../base/common/glob.js';
import { URI } from '../../../base/common/uri.js';
import { MainContext } from './extHost.protocol.js';
import * as typeConverter from './extHostTypeConverters.js';
import { Disposable, WorkspaceEdit } from './extHostTypes.js';
import { Lazy } from '../../../base/common/lazy.js';
import { rtrim } from '../../../base/common/strings.js';
import { normalizeWatcherPattern } from '../../../platform/files/common/watcher.js';
class FileSystemWatcher {
    get ignoreCreateEvents() {
        return Boolean(this._config & 0b001);
    }
    get ignoreChangeEvents() {
        return Boolean(this._config & 0b010);
    }
    get ignoreDeleteEvents() {
        return Boolean(this._config & 0b100);
    }
    constructor(mainContext, configuration, workspace, extension, dispatcher, globPattern, options) {
        this.session = Math.random();
        this._onDidCreate = new Emitter();
        this._onDidChange = new Emitter();
        this._onDidDelete = new Emitter();
        this._config = 0;
        if (options.ignoreCreateEvents) {
            this._config += 0b001;
        }
        if (options.ignoreChangeEvents) {
            this._config += 0b010;
        }
        if (options.ignoreDeleteEvents) {
            this._config += 0b100;
        }
        const parsedPattern = parse(globPattern);
        // 1.64.x behaviour change: given the new support to watch any folder
        // we start to ignore events outside the workspace when only a string
        // pattern is provided to avoid sending events to extensions that are
        // unexpected.
        // https://github.com/microsoft/vscode/issues/3025
        const excludeOutOfWorkspaceEvents = typeof globPattern === 'string';
        // 1.84.x introduces new proposed API for a watcher to set exclude
        // rules. In these cases, we turn the file watcher into correlation
        // mode and ignore any event that does not match the correlation ID.
        //
        // Update (Feb 2025): proposal is discontinued, so the previous
        // `options.correlate` is always `false`.
        const excludeUncorrelatedEvents = false;
        const subscription = dispatcher(events => {
            if (typeof events.session === 'number' && events.session !== this.session) {
                return; // ignore events from other file watchers that are in correlation mode
            }
            if (excludeUncorrelatedEvents && typeof events.session === 'undefined') {
                return; // ignore events from other non-correlating file watcher when we are in correlation mode
            }
            if (!options.ignoreCreateEvents) {
                for (const created of events.created) {
                    const uri = URI.revive(created);
                    if (parsedPattern(uri.fsPath) && (!excludeOutOfWorkspaceEvents || workspace.getWorkspaceFolder(uri))) {
                        this._onDidCreate.fire(uri);
                    }
                }
            }
            if (!options.ignoreChangeEvents) {
                for (const changed of events.changed) {
                    const uri = URI.revive(changed);
                    if (parsedPattern(uri.fsPath) && (!excludeOutOfWorkspaceEvents || workspace.getWorkspaceFolder(uri))) {
                        this._onDidChange.fire(uri);
                    }
                }
            }
            if (!options.ignoreDeleteEvents) {
                for (const deleted of events.deleted) {
                    const uri = URI.revive(deleted);
                    if (parsedPattern(uri.fsPath) && (!excludeOutOfWorkspaceEvents || workspace.getWorkspaceFolder(uri))) {
                        this._onDidDelete.fire(uri);
                    }
                }
            }
        });
        this._disposable = Disposable.from(this.ensureWatching(mainContext, workspace, configuration, extension, globPattern, options, false), this._onDidCreate, this._onDidChange, this._onDidDelete, subscription);
    }
    ensureWatching(mainContext, workspace, configuration, extension, globPattern, options, correlate) {
        const disposable = Disposable.from();
        if (typeof globPattern === 'string') {
            return disposable; // workspace is already watched by default, no need to watch again!
        }
        if (options.ignoreChangeEvents && options.ignoreCreateEvents && options.ignoreDeleteEvents) {
            return disposable; // no need to watch if we ignore all events
        }
        const proxy = mainContext.getProxy(MainContext.MainThreadFileSystemEventService);
        let recursive = false;
        if (globPattern.pattern.includes(GLOBSTAR) || globPattern.pattern.includes(GLOB_SPLIT)) {
            recursive = true; // only watch recursively if pattern indicates the need for it
        }
        const excludes = [];
        let includes = undefined;
        let filter;
        // Correlated: adjust filter based on arguments
        if (correlate) {
            if (options.ignoreChangeEvents || options.ignoreCreateEvents || options.ignoreDeleteEvents) {
                filter = 2 /* FileChangeFilter.UPDATED */ | 4 /* FileChangeFilter.ADDED */ | 8 /* FileChangeFilter.DELETED */;
                if (options.ignoreChangeEvents) {
                    filter &= ~2 /* FileChangeFilter.UPDATED */;
                }
                if (options.ignoreCreateEvents) {
                    filter &= ~4 /* FileChangeFilter.ADDED */;
                }
                if (options.ignoreDeleteEvents) {
                    filter &= ~8 /* FileChangeFilter.DELETED */;
                }
            }
        }
        // Uncorrelated: adjust includes and excludes based on settings
        else {
            // Automatically add `files.watcherExclude` patterns when watching
            // recursively to give users a chance to configure exclude rules
            // for reducing the overhead of watching recursively
            if (recursive && excludes.length === 0) {
                const workspaceFolder = workspace.getWorkspaceFolder(URI.revive(globPattern.baseUri));
                const watcherExcludes = configuration.getConfiguration('files', workspaceFolder).get('watcherExclude');
                if (watcherExcludes) {
                    for (const key in watcherExcludes) {
                        if (key && watcherExcludes[key] === true) {
                            excludes.push(key);
                        }
                    }
                }
            }
            // Non-recursive watching inside the workspace will overlap with
            // our standard workspace watchers. To prevent duplicate events,
            // we only want to include events for files that are otherwise
            // excluded via `files.watcherExclude`. As such, we configure
            // to include each configured exclude pattern so that only those
            // events are reported that are otherwise excluded.
            // However, we cannot just use the pattern as is, because a pattern
            // such as `bar` for a exclude, will work to exclude any of
            // `<workspace path>/bar` but will not work as include for files within
            // `bar` unless a suffix of `/**` if added.
            // (https://github.com/microsoft/vscode/issues/148245)
            else if (!recursive) {
                const workspaceFolder = workspace.getWorkspaceFolder(URI.revive(globPattern.baseUri));
                if (workspaceFolder) {
                    const watcherExcludes = configuration.getConfiguration('files', workspaceFolder).get('watcherExclude');
                    if (watcherExcludes) {
                        for (const key in watcherExcludes) {
                            if (key && watcherExcludes[key] === true) {
                                const includePattern = `${rtrim(key, '/')}/${GLOBSTAR}`;
                                if (!includes) {
                                    includes = [];
                                }
                                includes.push(normalizeWatcherPattern(workspaceFolder.uri.fsPath, includePattern));
                            }
                        }
                    }
                    // Still ignore watch request if there are actually no configured
                    // exclude rules, because in that case our default recursive watcher
                    // should be able to take care of all events.
                    if (!includes || includes.length === 0) {
                        return disposable;
                    }
                }
            }
        }
        proxy.$watch(extension.identifier.value, this.session, globPattern.baseUri, { recursive, excludes, includes, filter }, Boolean(correlate));
        return Disposable.from({ dispose: () => proxy.$unwatch(this.session) });
    }
    dispose() {
        this._disposable.dispose();
    }
    get onDidCreate() {
        return this._onDidCreate.event;
    }
    get onDidChange() {
        return this._onDidChange.event;
    }
    get onDidDelete() {
        return this._onDidDelete.event;
    }
}
class LazyRevivedFileSystemEvents {
    get created() { return this._created.value; }
    get changed() { return this._changed.value; }
    get deleted() { return this._deleted.value; }
    constructor(_events) {
        this._events = _events;
        this._created = new Lazy(() => this._events.created.map(URI.revive));
        this._changed = new Lazy(() => this._events.changed.map(URI.revive));
        this._deleted = new Lazy(() => this._events.deleted.map(URI.revive));
        this.session = this._events.session;
    }
}
export class ExtHostFileSystemEventService {
    constructor(_mainContext, _logService, _extHostDocumentsAndEditors) {
        this._mainContext = _mainContext;
        this._logService = _logService;
        this._extHostDocumentsAndEditors = _extHostDocumentsAndEditors;
        this._onFileSystemEvent = new Emitter();
        this._onDidRenameFile = new Emitter();
        this._onDidCreateFile = new Emitter();
        this._onDidDeleteFile = new Emitter();
        this._onWillRenameFile = new AsyncEmitter();
        this._onWillCreateFile = new AsyncEmitter();
        this._onWillDeleteFile = new AsyncEmitter();
        this.onDidRenameFile = this._onDidRenameFile.event;
        this.onDidCreateFile = this._onDidCreateFile.event;
        this.onDidDeleteFile = this._onDidDeleteFile.event;
        //
    }
    //--- file events
    createFileSystemWatcher(workspace, configProvider, extension, globPattern, options) {
        return new FileSystemWatcher(this._mainContext, configProvider, workspace, extension, this._onFileSystemEvent.event, typeConverter.GlobPattern.from(globPattern), options);
    }
    $onFileEvent(events) {
        this._onFileSystemEvent.fire(new LazyRevivedFileSystemEvents(events));
    }
    //--- file operations
    $onDidRunFileOperation(operation, files) {
        switch (operation) {
            case 2 /* FileOperation.MOVE */:
                this._onDidRenameFile.fire(Object.freeze({ files: files.map(f => ({ oldUri: URI.revive(f.source), newUri: URI.revive(f.target) })) }));
                break;
            case 1 /* FileOperation.DELETE */:
                this._onDidDeleteFile.fire(Object.freeze({ files: files.map(f => URI.revive(f.target)) }));
                break;
            case 0 /* FileOperation.CREATE */:
            case 3 /* FileOperation.COPY */:
                this._onDidCreateFile.fire(Object.freeze({ files: files.map(f => URI.revive(f.target)) }));
                break;
            default:
            //ignore, dont send
        }
    }
    getOnWillRenameFileEvent(extension) {
        return this._createWillExecuteEvent(extension, this._onWillRenameFile);
    }
    getOnWillCreateFileEvent(extension) {
        return this._createWillExecuteEvent(extension, this._onWillCreateFile);
    }
    getOnWillDeleteFileEvent(extension) {
        return this._createWillExecuteEvent(extension, this._onWillDeleteFile);
    }
    _createWillExecuteEvent(extension, emitter) {
        return (listener, thisArg, disposables) => {
            const wrappedListener = function wrapped(e) { listener.call(thisArg, e); };
            wrappedListener.extension = extension;
            return emitter.event(wrappedListener, undefined, disposables);
        };
    }
    async $onWillRunFileOperation(operation, files, timeout, token) {
        switch (operation) {
            case 2 /* FileOperation.MOVE */:
                return await this._fireWillEvent(this._onWillRenameFile, { files: files.map(f => ({ oldUri: URI.revive(f.source), newUri: URI.revive(f.target) })) }, timeout, token);
            case 1 /* FileOperation.DELETE */:
                return await this._fireWillEvent(this._onWillDeleteFile, { files: files.map(f => URI.revive(f.target)) }, timeout, token);
            case 0 /* FileOperation.CREATE */:
            case 3 /* FileOperation.COPY */:
                return await this._fireWillEvent(this._onWillCreateFile, { files: files.map(f => URI.revive(f.target)) }, timeout, token);
        }
        return undefined;
    }
    async _fireWillEvent(emitter, data, timeout, token) {
        const extensionNames = new Set();
        const edits = [];
        await emitter.fireAsync(data, token, async (thenable, listener) => {
            // ignore all results except for WorkspaceEdits. Those are stored in an array.
            const now = Date.now();
            const result = await Promise.resolve(thenable);
            if (result instanceof WorkspaceEdit) {
                edits.push([listener.extension, result]);
                extensionNames.add(listener.extension.displayName ?? listener.extension.identifier.value);
            }
            if (Date.now() - now > timeout) {
                this._logService.warn('SLOW file-participant', listener.extension.identifier);
            }
        });
        if (token.isCancellationRequested) {
            return undefined;
        }
        if (edits.length === 0) {
            return undefined;
        }
        // concat all WorkspaceEdits collected via waitUntil-call and send them over to the renderer
        const dto = { edits: [] };
        for (const [, edit] of edits) {
            const { edits } = typeConverter.WorkspaceEdit.from(edit, {
                getTextDocumentVersion: uri => this._extHostDocumentsAndEditors.getDocument(uri)?.version,
                getNotebookDocumentVersion: () => undefined,
            });
            dto.edits = dto.edits.concat(edits);
        }
        return { edit: dto, extensionNames: Array.from(extensionNames) };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdEZpbGVTeXN0ZW1FdmVudFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9jb21tb24vZXh0SG9zdEZpbGVTeXN0ZW1FdmVudFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBUyxZQUFZLEVBQThCLE1BQU0sK0JBQStCLENBQUM7QUFDekcsT0FBTyxFQUFFLFFBQVEsRUFBRSxVQUFVLEVBQW9CLEtBQUssRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQzdGLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUdsRCxPQUFPLEVBQStJLFdBQVcsRUFBdUIsTUFBTSx1QkFBdUIsQ0FBQztBQUN0TixPQUFPLEtBQUssYUFBYSxNQUFNLDRCQUE0QixDQUFDO0FBQzVELE9BQU8sRUFBRSxVQUFVLEVBQUUsYUFBYSxFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFNOUQsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBRXBELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUN4RCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQVFwRixNQUFNLGlCQUFpQjtJQVd0QixJQUFJLGtCQUFrQjtRQUNyQixPQUFPLE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxHQUFHLEtBQUssQ0FBQyxDQUFDO0lBQ3RDLENBQUM7SUFFRCxJQUFJLGtCQUFrQjtRQUNyQixPQUFPLE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxHQUFHLEtBQUssQ0FBQyxDQUFDO0lBQ3RDLENBQUM7SUFFRCxJQUFJLGtCQUFrQjtRQUNyQixPQUFPLE9BQU8sQ0FBQyxJQUFJ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