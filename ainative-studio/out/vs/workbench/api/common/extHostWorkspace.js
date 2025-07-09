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
import { delta as arrayDelta, mapArrayOrNot } from '../../../base/common/arrays.js';
import { AsyncIterableObject, Barrier } from '../../../base/common/async.js';
import { CancellationToken } from '../../../base/common/cancellation.js';
import { AsyncEmitter, Emitter } from '../../../base/common/event.js';
import { DisposableStore, toDisposable } from '../../../base/common/lifecycle.js';
import { TernarySearchTree } from '../../../base/common/ternarySearchTree.js';
import { Schemas } from '../../../base/common/network.js';
import { Counter } from '../../../base/common/numbers.js';
import { basename, basenameOrAuthority, dirname, ExtUri, relativePath } from '../../../base/common/resources.js';
import { compare } from '../../../base/common/strings.js';
import { URI } from '../../../base/common/uri.js';
import { localize } from '../../../nls.js';
import { createDecorator } from '../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { Severity } from '../../../platform/notification/common/notification.js';
import { Workspace, WorkspaceFolder } from '../../../platform/workspace/common/workspace.js';
import { IExtHostFileSystemInfo } from './extHostFileSystemInfo.js';
import { IExtHostInitDataService } from './extHostInitDataService.js';
import { IExtHostRpcService } from './extHostRpcService.js';
import { GlobPattern } from './extHostTypeConverters.js';
import { Range } from './extHostTypes.js';
import { IURITransformerService } from './extHostUriTransformerService.js';
import { resultIsMatch } from '../../services/search/common/search.js';
import { MainContext } from './extHost.protocol.js';
import { revive } from '../../../base/common/marshalling.js';
import { ExcludeSettingOptions, TextSearchContext2, TextSearchMatch2 } from '../../services/search/common/searchExtTypes.js';
import { VSBuffer } from '../../../base/common/buffer.js';
function isFolderEqual(folderA, folderB, extHostFileSystemInfo) {
    return new ExtUri(uri => ignorePathCasing(uri, extHostFileSystemInfo)).isEqual(folderA, folderB);
}
function compareWorkspaceFolderByUri(a, b, extHostFileSystemInfo) {
    return isFolderEqual(a.uri, b.uri, extHostFileSystemInfo) ? 0 : compare(a.uri.toString(), b.uri.toString());
}
function compareWorkspaceFolderByUriAndNameAndIndex(a, b, extHostFileSystemInfo) {
    if (a.index !== b.index) {
        return a.index < b.index ? -1 : 1;
    }
    return isFolderEqual(a.uri, b.uri, extHostFileSystemInfo) ? compare(a.name, b.name) : compare(a.uri.toString(), b.uri.toString());
}
function delta(oldFolders, newFolders, compare, extHostFileSystemInfo) {
    const oldSortedFolders = oldFolders.slice(0).sort((a, b) => compare(a, b, extHostFileSystemInfo));
    const newSortedFolders = newFolders.slice(0).sort((a, b) => compare(a, b, extHostFileSystemInfo));
    return arrayDelta(oldSortedFolders, newSortedFolders, (a, b) => compare(a, b, extHostFileSystemInfo));
}
function ignorePathCasing(uri, extHostFileSystemInfo) {
    const capabilities = extHostFileSystemInfo.getCapabilities(uri.scheme);
    return !(capabilities && (capabilities & 1024 /* FileSystemProviderCapabilities.PathCaseSensitive */));
}
class ExtHostWorkspaceImpl extends Workspace {
    static toExtHostWorkspace(data, previousConfirmedWorkspace, previousUnconfirmedWorkspace, extHostFileSystemInfo) {
        if (!data) {
            return { workspace: null, added: [], removed: [] };
        }
        const { id, name, folders, configuration, transient, isUntitled } = data;
        const newWorkspaceFolders = [];
        // If we have an existing workspace, we try to find the folders that match our
        // data and update their properties. It could be that an extension stored them
        // for later use and we want to keep them "live" if they are still present.
        const oldWorkspace = previousConfirmedWorkspace;
        if (previousConfirmedWorkspace) {
            folders.forEach((folderData, index) => {
                const folderUri = URI.revive(folderData.uri);
                const existingFolder = ExtHostWorkspaceImpl._findFolder(previousUnconfirmedWorkspace || previousConfirmedWorkspace, folderUri, extHostFileSystemInfo);
                if (existingFolder) {
                    existingFolder.name = folderData.name;
                    existingFolder.index = folderData.index;
                    newWorkspaceFolders.push(existingFolder);
                }
                else {
                    newWorkspaceFolders.push({ uri: folderUri, name: folderData.name, index });
                }
            });
        }
        else {
            newWorkspaceFolders.push(...folders.map(({ uri, name, index }) => ({ uri: URI.revive(uri), name, index })));
        }
        // make sure to restore sort order based on index
        newWorkspaceFolders.sort((f1, f2) => f1.index < f2.index ? -1 : 1);
        const workspace = new ExtHostWorkspaceImpl(id, name, newWorkspaceFolders, !!transient, configuration ? URI.revive(configuration) : null, !!isUntitled, uri => ignorePathCasing(uri, extHostFileSystemInfo));
        const { added, removed } = delta(oldWorkspace ? oldWorkspace.workspaceFolders : [], workspace.workspaceFolders, compareWorkspaceFolderByUri, extHostFileSystemInfo);
        return { workspace, added, removed };
    }
    static _findFolder(workspace, folderUriToFind, extHostFileSystemInfo) {
        for (let i = 0; i < workspace.folders.length; i++) {
            const folder = workspace.workspaceFolders[i];
            if (isFolderEqual(folder.uri, folderUriToFind, extHostFileSystemInfo)) {
                return folder;
            }
        }
        return undefined;
    }
    constructor(id, _name, folders, transient, configuration, _isUntitled, ignorePathCasing) {
        super(id, folders.map(f => new WorkspaceFolder(f)), transient, configuration, ignorePathCasing);
        this._name = _name;
        this._isUntitled = _isUntitled;
        this._workspaceFolders = [];
        this._structure = TernarySearchTree.forUris(ignorePathCasing, () => true);
        // setup the workspace folder data structure
        folders.forEach(folder => {
            this._workspaceFolders.push(folder);
            this._structure.set(folder.uri, folder);
        });
    }
    get name() {
        return this._name;
    }
    get isUntitled() {
        return this._isUntitled;
    }
    get workspaceFolders() {
        return this._workspaceFolders.slice(0);
    }
    getWorkspaceFolder(uri, resolveParent) {
        if (resolveParent && this._structure.get(uri)) {
            // `uri` is a workspace folder so we check for its parent
            uri = dirname(uri);
        }
        return this._structure.findSubstr(uri);
    }
    resolveWorkspaceFolder(uri) {
        return this._structure.get(uri);
    }
}
let ExtHostWorkspace = class ExtHostWorkspace {
    constructor(extHostRpc, initData, extHostFileSystemInfo, logService, uriTransformerService) {
        this._onDidChangeWorkspace = new Emitter();
        this.onDidChangeWorkspace = this._onDidChangeWorkspace.event;
        this._onDidGrantWorkspaceTrust = new Emitter();
        this.onDidGrantWorkspaceTrust = this._onDidGrantWorkspaceTrust.event;
        this._activeSearchCallbacks = [];
        this._trusted = false;
        this._editSessionIdentityProviders = new Map();
        // --- edit sessions ---
        this._providerHandlePool = 0;
        this._onWillCreateEditSessionIdentityEvent = new AsyncEmitter();
        // --- canonical uri identity ---
        this._canonicalUriProviders = new Map();
        this._logService = logService;
        this._extHostFileSystemInfo = extHostFileSystemInfo;
        this._uriTransformerService = uriTransformerService;
        this._requestIdProvider = new Counter();
        this._barrier = new Barrier();
        this._proxy = extHostRpc.getProxy(MainContext.MainThreadWorkspace);
        this._messageService = extHostRpc.getProxy(MainContext.MainThreadMessageService);
        const data = initData.workspace;
        this._confirmedWorkspace = data ? new ExtHostWorkspaceImpl(data.id, data.name, [], !!data.transient, data.configuration ? URI.revive(data.configuration) : null, !!data.isUntitled, uri => ignorePathCasing(uri, extHostFileSystemInfo)) : undefined;
    }
    $initializeWorkspace(data, trusted) {
        this._trusted = trusted;
        this.$acceptWorkspaceData(data);
        this._barrier.open();
    }
    waitForInitializeCall() {
        return this._barrier.wait();
    }
    // --- workspace ---
    get workspace() {
        return this._actualWorkspace;
    }
    get name() {
        return this._actualWorkspace ? this._actualWorkspace.name : undefined;
    }
    get workspaceFile() {
        if (this._actualWorkspace) {
            if (this._actualWorkspace.configuration) {
                if (this._actualWorkspace.isUntitled) {
                    return URI.from({ scheme: Schemas.untitled, path: basename(dirname(this._actualWorkspace.configuration)) }); // Untitled Workspace: return untitled URI
                }
                return this._actualWorkspace.configuration; // Workspace: return the configuration location
            }
        }
        return undefined;
    }
    get _actualWorkspace() {
        return this._unconfirmedWorkspace || this._confirmedWorkspace;
    }
    getWorkspaceFolders() {
        if (!this._actualWorkspace) {
            return undefined;
        }
        return this._actualWorkspace.workspaceFolders.slice(0);
    }
    async getWorkspaceFolders2() {
        await this._barrier.wait();
        if (!this._actualWorkspace) {
            return undefined;
        }
        return this._actualWorkspace.workspaceFolders.slice(0);
    }
    updateWorkspaceFolders(extension, index, deleteCount, ...workspaceFoldersToAdd) {
        const validatedDistinctWorkspaceFoldersToAdd = [];
        if (Array.isArray(workspaceFoldersToAdd)) {
            workspaceFoldersToAdd.forEach(folderToAdd => {
                if (URI.isUri(folderToAdd.uri) && !validatedDistinctWorkspaceFoldersToAdd.some(f => isFolderEqual(f.uri, folderToAdd.uri, this._extHostFileSystemInfo))) {
                    validatedDistinctWorkspaceFoldersToAdd.push({ uri: folderToAdd.uri, name: folderToAdd.name || basenameOrAuthority(folderToAdd.uri) });
                }
            });
        }
        if (!!this._unconfirmedWorkspace) {
            return false; // prevent accumulated calls without a confirmed workspace
        }
        if ([index, deleteCount].some(i => typeof i !== 'number' || i < 0)) {
            return false; // validate numbers
        }
        if (deleteCount === 0 && validatedDistinctWorkspaceFoldersToAdd.length === 0) {
            return false; // nothing to delete or add
        }
        const currentWorkspaceFolders = this._actualWorkspace ? this._actualWorkspace.workspaceFolders : [];
        if (index + deleteCount > currentWorkspaceFolders.length) {
            return false; // cannot delete more than we have
        }
        // Simulate the updateWorkspaceFolders method on our data to do more validation
        const newWorkspaceFolders = currentWorkspaceFolders.slice(0);
        newWorkspaceFolders.splice(index, deleteCount, ...validatedDistinctWorkspaceFoldersToAdd.map(f => ({ uri: f.uri, name: f.name || basenameOrAuthority(f.uri), index: undefined /* fixed later */ })));
        for (let i = 0; i < newWorkspaceFolders.length; i++) {
            const folder = newWorkspaceFolders[i];
            if (newWorkspaceFolders.some((otherFolder, index) => index !== i && isFolderEqual(folder.uri, otherFolder.uri, this._extHostFileSystemInfo))) {
                return false; // cannot add the same folder multiple times
            }
        }
        newWorkspaceFolders.forEach((f, index) => f.index = index); // fix index
        const { added, removed } = delta(currentWorkspaceFolders, newWorkspaceFolders, compareWorkspaceFolderByUriAndNameAndIndex, this._extHostFileSystemInfo);
        if (added.length === 0 && removed.length === 0) {
            return false; // nothing actually changed
        }
        // Trigger on main side
        if (this._proxy) {
            const extName = extension.displayName || extension.name;
            this._proxy.$updateWorkspaceFolders(extName, index, deleteCount, validatedDistinctWorkspaceFoldersToAdd).then(undefined, error => {
                // in case of an error, make sure to clear out the unconfirmed workspace
                // because we cannot expect the acknowledgement from the main side for this
                this._unconfirmedWorkspace = undefined;
                // show error to user
                const options = { source: { identifier: extension.identifier, label: extension.displayName || extension.name } };
                this._messageService.$showMessage(Severity.Error, localize('updateerror', "Extension '{0}' failed to update workspace folders: {1}", extName, error.toString()), options, []);
            });
        }
        // Try to accept directly
        this.trySetWorkspaceFolders(newWorkspaceFolders);
        return true;
    }
    getWorkspaceFolder(uri, resolveParent) {
        if (!this._actualWorkspace) {
            return undefined;
        }
        return this._actualWorkspace.getWorkspaceFolder(uri, resolveParent);
    }
    async getWorkspaceFolder2(uri, resolveParent) {
        await this._barrier.wait();
        if (!this._actualWorkspace) {
            return undefined;
        }
        return this._actualWorkspace.getWorkspaceFolder(uri, resolveParent);
    }
    async resolveWorkspaceFolder(uri) {
        await this._barrier.wait();
        if (!this._actualWorkspace) {
            return undefined;
        }
        return this._actualWorkspace.resolveWorkspaceFolder(uri);
    }
    getPath() {
        // this is legacy from the days before having
        // multi-root and we keep it only alive if there
        // is just one workspace folder.
        if (!this._actualWorkspace) {
            return undefined;
        }
        const { folders } = this._actualWorkspace;
        if (folders.length === 0) {
            return undefined;
        }
        // #54483 @Joh Why are we still using fsPath?
        return folders[0].uri.fsPath;
    }
    getRelativePath(pathOrUri, includeWorkspace) {
        let resource;
        let path = '';
        if (typeof pathOrUri === 'string') {
            resource = URI.file(pathOrUri);
            path = pathOrUri;
        }
        else if (typeof pathOrUri !== 'undefined') {
            resource = pathOrUri;
            path = pathOrUri.fsPath;
        }
        if (!resource) {
            return path;
        }
        const folder = this.getWorkspaceFolder(resource, true);
        if (!folder) {
            return path;
        }
        if (typeof includeWorkspace === 'undefined' && this._actualWorkspace) {
            includeWorkspace = this._actualWorkspace.folders.length > 1;
        }
        let result = relativePath(folder.uri, resource);
        if (includeWorkspace && folder.name) {
            result = `${folder.name}/${result}`;
        }
        return result;
    }
    trySetWorkspaceFolders(folders) {
        // Update directly here. The workspace is unconfirmed as long as we did not get an
        // acknowledgement from the main side (via $acceptWorkspaceData)
        if (this._actualWorkspace) {
            this._unconfirmedWorkspace = ExtHostWorkspaceImpl.toExtHostWorkspace({
                id: this._actualWorkspace.id,
                name: this._actualWorkspace.name,
                configuration: this._actualWorkspace.configuration,
                folders,
                isUntitled: this._actualWorkspace.isUntitled
            }, this._actualWorkspace, undefined, this._extHostFileSystemInfo).workspace || undefined;
        }
    }
    $acceptWorkspaceData(data) {
        const { workspace, added, removed } = ExtHostWorkspaceImpl.toExtHostWorkspace(data, this._confirmedWorkspace, this._unconfirmedWorkspace, this._extHostFileSystemInfo);
        // Update our workspace object. We have a confirmed workspace, so we drop our
        // unconfirmed workspace.
        this._confirmedWorkspace = workspace || undefined;
        this._unconfirmedWorkspace = undefined;
        // Events
        this._onDidChangeWorkspace.fire(Object.freeze({
            added,
            removed,
        }));
    }
    // --- search ---
    /**
     * Note, null/undefined have different and important meanings for "exclude"
     */
    findFiles(include, exclude, maxResults, extensionId, token = CancellationToken.None) {
        this._logService.trace(`extHostWorkspace#findFiles: fileSearch, extension: ${extensionId.value}, entryPoint: findFiles`);
        let excludeString = '';
        let useFileExcludes = true;
        if (exclude === null) {
            useFileExcludes = false;
        }
        else if (exclude !== undefined) {
            if (typeof exclude === 'string') {
                excludeString = exclude;
            }
            else {
                excludeString = exclude.pattern;
            }
        }
        // todo: consider exclude baseURI if available
        return this._findFilesImpl({ type: 'include', value: include }, {
            exclude: [excludeString],
            maxResults,
            useExcludeSettings: useFileExcludes ? ExcludeSettingOptions.FilesExclude : ExcludeSettingOptions.None,
            useIgnoreFiles: {
                local: false
            }
        }, token);
    }
    findFiles2(filePatterns, options = {}, extensionId, token = CancellationToken.None) {
        this._logService.trace(`extHostWorkspace#findFiles2New: fileSearch, extension: ${extensionId.value}, entryPoint: findFiles2New`);
        return this._findFilesImpl({ type: 'filePatterns', value: filePatterns }, options, token);
    }
    async _findFilesImpl(
    // the old `findFiles` used `include` to query, but the new `findFiles2` uses `filePattern` to query.
    // `filePattern` is the proper way to handle this, since it takes less precedence than the ignore files.
    query, options, token) {
        if (token.isCancellationRequested) {
            return Promise.resolve([]);
        }
        const filePatternsToUse = query.type === 'include' ? [query.value] : query.value ?? [];
        if (!Array.isArray(filePatternsToUse)) {
            console.error('Invalid file pattern provided', filePatternsToUse);
            throw new Error(`Invalid file pattern provided ${JSON.stringify(filePatternsToUse)}`);
        }
        const queryOptions = filePatternsToUse.map(filePattern => {
            const excludePatterns = globsToISearchPatternBuilder(options.exclude);
            const fileQueries = {
                ignoreSymlinks: typeof options.followSymlinks === 'boolean' ? !options.followSymlinks : undefined,
                disregardIgnoreFiles: typeof options.useIgnoreFiles?.local === 'boolean' ? !options.useIgnoreFiles.local : undefined,
                disregardGlobalIgnoreFiles: typeof options.useIgnoreFiles?.global === 'boolean' ? !options.useIgnoreFiles.global : undefined,
                disregardParentIgnoreFiles: typeof options.useIgnoreFiles?.parent === 'boolean' ? !options.useIgnoreFiles.parent : undefined,
                disregardExcludeSettings: options.useExcludeSettings !== undefined && options.useExcludeSettings === ExcludeSettingOptions.None,
                disregardSearchExcludeSettings: options.useExcludeSettings !== undefined && (options.useExcludeSettings !== ExcludeSettingOptions.SearchAndFilesExclude),
                maxResults: options.maxResults,
                excludePattern: excludePatterns.length > 0 ? excludePatterns : undefined,
                _reason: 'startFileSearch',
                shouldGlobSearch: query.type === 'include' ? undefined : true,
            };
            const parseInclude = parseSearchExcludeInclude(GlobPattern.from(filePattern));
            const folderToUse = parseInclude?.folder;
            if (query.type === 'include') {
                fileQueries.includePattern = parseInclude?.pattern;
            }
            else {
                fileQueries.filePattern = parseInclude?.pattern;
            }
            return {
                folder: folderToUse,
                options: fileQueries
            };
        });
        return this._findFilesBase(queryOptions, token);
    }
    async _findFilesBase(queryOptions, token) {
        const result = await Promise.all(queryOptions?.map(option => this._proxy.$startFileSearch(option.folder ?? null, option.options, token).then(data => Array.isArray(data) ? data.map(d => URI.revive(d)) : [])) ?? []);
        return result.flat();
    }
    findTextInFiles2(query, options, extensionId, token = CancellationToken.None) {
        this._logService.trace(`extHostWorkspace#findTextInFiles2: textSearch, extension: ${extensionId.value}, entryPoint: findTextInFiles2`);
        const getOptions = (include) => {
            if (!options) {
                return {
                    folder: undefined,
                    options: {}
                };
            }
            const parsedInclude = include ? parseSearchExcludeInclude(GlobPattern.from(include)) : undefined;
            const excludePatterns = options.exclude ? globsToISearchPatternBuilder(options.exclude) : undefined;
            return {
                options: {
                    ignoreSymlinks: typeof options.followSymlinks === 'boolean' ? !options.followSymlinks : undefined,
                    disregardIgnoreFiles: typeof options.useIgnoreFiles === 'boolean' ? !options.useIgnoreFiles : undefined,
                    disregardGlobalIgnoreFiles: typeof options.useIgnoreFiles?.global === 'boolean' ? !options.useIgnoreFiles?.global : undefined,
                    disregardParentIgnoreFiles: typeof options.useIgnoreFiles?.parent === 'boolean' ? !options.useIgnoreFiles?.parent : undefined,
                    disregardExcludeSettings: options.useExcludeSettings !== undefined && options.useExcludeSettings === ExcludeSettingOptions.None,
                    disregardSearchExcludeSettings: options.useExcludeSettings !== undefined && (options.useExcludeSettings !== ExcludeSettingOptions.SearchAndFilesExclude),
                    fileEncoding: options.encoding,
                    maxResults: options.maxResults,
                    previewOptions: options.previewOptions ? {
                        matchLines: options.previewOptions?.numMatchLines ?? 100,
                        charsPerLine: options.previewOptions?.charsPerLine ?? 10000,
                    } : undefined,
                    surroundingContext: options.surroundingContext,
                    includePattern: parsedInclude?.pattern,
                    excludePattern: excludePatterns
                },
                folder: parsedInclude?.folder
            };
        };
        const queryOptionsRaw = ((options?.include?.map((include) => getOptions(include)))) ?? [getOptions(undefined)];
        const queryOptions = queryOptionsRaw.filter((queryOps) => !!queryOps);
        const disposables = new DisposableStore();
        const progressEmitter = disposables.add(new Emitter());
        const complete = this.findTextInFilesBase(query, queryOptions, (result, uri) => progressEmitter.fire({ result, uri }), token);
        const asyncIterable = new AsyncIterableObject(async (emitter) => {
            disposables.add(progressEmitter.event(e => {
                const result = e.result;
                const uri = e.uri;
                if (resultIsMatch(result)) {
                    emitter.emitOne(new TextSearchMatch2(uri, result.rangeLocations.map((range) => ({
                        previewRange: new Range(range.preview.startLineNumber, range.preview.startColumn, range.preview.endLineNumber, range.preview.endColumn),
                        sourceRange: new Range(range.source.startLineNumber, range.source.startColumn, range.source.endLineNumber, range.source.endColumn)
                    })), result.previewText));
                }
                else {
                    emitter.emitOne(new TextSearchContext2(uri, result.text, result.lineNumber));
                }
            }));
            await complete;
        });
        return {
            results: asyncIterable,
            complete: complete.then((e) => {
                disposables.dispose();
                return {
                    limitHit: e?.limitHit ?? false
                };
            }),
        };
    }
    async findTextInFilesBase(query, queryOptions, callback, token = CancellationToken.None) {
        const requestId = this._requestIdProvider.getNext();
        let isCanceled = false;
        token.onCancellationRequested(_ => {
            isCanceled = true;
        });
        this._activeSearchCallbacks[requestId] = p => {
            if (isCanceled) {
                return;
            }
            const uri = URI.revive(p.resource);
            p.results.forEach(rawResult => {
                const result = revive(rawResult);
                callback(result, uri);
            });
        };
        if (token.isCancellationRequested) {
            return {};
        }
        try {
            const result = await Promise.all(queryOptions?.map(option => this._proxy.$startTextSearch(query, option.folder ?? null, option.options, requestId, token) || {}) ?? []);
            delete this._activeSearchCallbacks[requestId];
            return result.reduce((acc, val) => {
                return {
                    limitHit: acc?.limitHit || (val?.limitHit ?? false),
                    message: [acc?.message ?? [], val?.message ?? []].flat(),
                };
            }, {}) ?? { limitHit: false };
        }
        catch (err) {
            delete this._activeSearchCallbacks[requestId];
            throw err;
        }
    }
    async findTextInFiles(query, options, callback, extensionId, token = CancellationToken.None) {
        this._logService.trace(`extHostWorkspace#findTextInFiles: textSearch, extension: ${extensionId.value}, entryPoint: findTextInFiles`);
        const previewOptions = typeof options.previewOptions === 'undefined' ?
            {
                matchLines: 100,
                charsPerLine: 10000
            } :
            options.previewOptions;
        const parsedInclude = parseSearchExcludeInclude(GlobPattern.from(options.include));
        const excludePattern = (typeof options.exclude === 'string') ? options.exclude :
            options.exclude ? options.exclude.pattern : undefined;
        const queryOptions = {
            ignoreSymlinks: typeof options.followSymlinks === 'boolean' ? !options.followSymlinks : undefined,
            disregardIgnoreFiles: typeof options.useIgnoreFiles === 'boolean' ? !options.useIgnoreFiles : undefined,
            disregardGlobalIgnoreFiles: typeof options.useGlobalIgnoreFiles === 'boolean' ? !options.useGlobalIgnoreFiles : undefined,
            disregardParentIgnoreFiles: typeof options.useParentIgnoreFiles === 'boolean' ? !options.useParentIgnoreFiles : undefined,
            disregardExcludeSettings: typeof options.useDefaultExcludes === 'boolean' ? !options.useDefaultExcludes : true,
            disregardSearchExcludeSettings: typeof options.useSearchExclude === 'boolean' ? !options.useSearchExclude : true,
            fileEncoding: options.encoding,
            maxResults: options.maxResults,
            previewOptions,
            surroundingContext: options.afterContext, // TODO: remove ability to have before/after context separately
            includePattern: parsedInclude?.pattern,
            excludePattern: excludePattern ? [{ pattern: excludePattern }] : undefined,
        };
        const progress = (result, uri) => {
            if (resultIsMatch(result)) {
                callback({
                    uri,
                    preview: {
                        text: result.previewText,
                        matches: mapArrayOrNot(result.rangeLocations, m => new Range(m.preview.startLineNumber, m.preview.startColumn, m.preview.endLineNumber, m.preview.endColumn))
                    },
                    ranges: mapArrayOrNot(result.rangeLocations, r => new Range(r.source.startLineNumber, r.source.startColumn, r.source.endLineNumber, r.source.endColumn))
                });
            }
            else {
                callback({
                    uri,
                    text: result.text,
                    lineNumber: result.lineNumber
                });
            }
        };
        return this.findTextInFilesBase(query, [{ options: queryOptions, folder: parsedInclude?.folder }], progress, token);
    }
    $handleTextSearchResult(result, requestId) {
        this._activeSearchCallbacks[requestId]?.(result);
    }
    async save(uri) {
        const result = await this._proxy.$save(uri, { saveAs: false });
        return URI.revive(result);
    }
    async saveAs(uri) {
        const result = await this._proxy.$save(uri, { saveAs: true });
        return URI.revive(result);
    }
    saveAll(includeUntitled) {
        return this._proxy.$saveAll(includeUntitled);
    }
    resolveProxy(url) {
        return this._proxy.$resolveProxy(url);
    }
    lookupAuthorization(authInfo) {
        return this._proxy.$lookupAuthorization(authInfo);
    }
    lookupKerberosAuthorization(url) {
        return this._proxy.$lookupKerberosAuthorization(url);
    }
    loadCertificates() {
        return this._proxy.$loadCertificates();
    }
    // --- trust ---
    get trusted() {
        return this._trusted;
    }
    requestWorkspaceTrust(options) {
        return this._proxy.$requestWorkspaceTrust(options);
    }
    $onDidGrantWorkspaceTrust() {
        if (!this._trusted) {
            this._trusted = true;
            this._onDidGrantWorkspaceTrust.fire();
        }
    }
    // called by ext host
    registerEditSessionIdentityProvider(scheme, provider) {
        if (this._editSessionIdentityProviders.has(scheme)) {
            throw new Error(`A provider has already been registered for scheme ${scheme}`);
        }
        this._editSessionIdentityProviders.set(scheme, provider);
        const outgoingScheme = this._uriTransformerService.transformOutgoingScheme(scheme);
        const handle = this._providerHandlePool++;
        this._proxy.$registerEditSessionIdentityProvider(handle, outgoingScheme);
        return toDisposable(() => {
            this._editSessionIdentityProviders.delete(scheme);
            this._proxy.$unregisterEditSessionIdentityProvider(handle);
        });
    }
    // called by main thread
    async $getEditSessionIdentifier(workspaceFolder, cancellationToken) {
        this._logService.info('Getting edit session identifier for workspaceFolder', workspaceFolder);
        const folder = await this.resolveWorkspaceFolder(URI.revive(workspaceFolder));
        if (!folder) {
            this._logService.warn('Unable to resolve workspace folder');
            return undefined;
        }
        this._logService.info('Invoking #provideEditSessionIdentity for workspaceFolder', folder);
        const provider = this._editSessionIdentityProviders.get(folder.uri.scheme);
        this._logService.info(`Provider for scheme ${folder.uri.scheme} is defined: `, !!provider);
        if (!provider) {
            return undefined;
        }
        const result = await provider.provideEditSessionIdentity(folder, cancellationToken);
        this._logService.info('Provider returned edit session identifier: ', result);
        if (!result) {
            return undefined;
        }
        return result;
    }
    async $provideEditSessionIdentityMatch(workspaceFolder, identity1, identity2, cancellationToken) {
        this._logService.info('Getting edit session identifier for workspaceFolder', workspaceFolder);
        const folder = await this.resolveWorkspaceFolder(URI.revive(workspaceFolder));
        if (!folder) {
            this._logService.warn('Unable to resolve workspace folder');
            return undefined;
        }
        this._logService.info('Invoking #provideEditSessionIdentity for workspaceFolder', folder);
        const provider = this._editSessionIdentityProviders.get(folder.uri.scheme);
        this._logService.info(`Provider for scheme ${folder.uri.scheme} is defined: `, !!provider);
        if (!provider) {
            return undefined;
        }
        const result = await provider.provideEditSessionIdentityMatch?.(identity1, identity2, cancellationToken);
        this._logService.info('Provider returned edit session identifier match result: ', result);
        if (!result) {
            return undefined;
        }
        return result;
    }
    getOnWillCreateEditSessionIdentityEvent(extension) {
        return (listener, thisArg, disposables) => {
            const wrappedListener = function wrapped(e) { listener.call(thisArg, e); };
            wrappedListener.extension = extension;
            return this._onWillCreateEditSessionIdentityEvent.event(wrappedListener, undefined, disposables);
        };
    }
    // main thread calls this to trigger participants
    async $onWillCreateEditSessionIdentity(workspaceFolder, token, timeout) {
        const folder = await this.resolveWorkspaceFolder(URI.revive(workspaceFolder));
        if (folder === undefined) {
            throw new Error('Unable to resolve workspace folder');
        }
        await this._onWillCreateEditSessionIdentityEvent.fireAsync({ workspaceFolder: folder }, token, async (thenable, listener) => {
            const now = Date.now();
            await Promise.resolve(thenable);
            if (Date.now() - now > timeout) {
                this._logService.warn('SLOW edit session create-participant', listener.extension.identifier);
            }
        });
        if (token.isCancellationRequested) {
            return undefined;
        }
    }
    // called by ext host
    registerCanonicalUriProvider(scheme, provider) {
        if (this._canonicalUriProviders.has(scheme)) {
            throw new Error(`A provider has already been registered for scheme ${scheme}`);
        }
        this._canonicalUriProviders.set(scheme, provider);
        const outgoingScheme = this._uriTransformerService.transformOutgoingScheme(scheme);
        const handle = this._providerHandlePool++;
        this._proxy.$registerCanonicalUriProvider(handle, outgoingScheme);
        return toDisposable(() => {
            this._canonicalUriProviders.delete(scheme);
            this._proxy.$unregisterCanonicalUriProvider(handle);
        });
    }
    async provideCanonicalUri(uri, options, cancellationToken) {
        const provider = this._canonicalUriProviders.get(uri.scheme);
        if (!provider) {
            return undefined;
        }
        const result = await provider.provideCanonicalUri?.(URI.revive(uri), options, cancellationToken);
        if (!result) {
            return undefined;
        }
        return result;
    }
    // called by main thread
    async $provideCanonicalUri(uri, targetScheme, cancellationToken) {
        return this.provideCanonicalUri(URI.revive(uri), { targetScheme }, cancellationToken);
    }
    // --- encodings ---
    decode(content, uri, options) {
        return this._proxy.$decode(VSBuffer.wrap(content), uri, options);
    }
    async encode(content, uri, options) {
        const buff = await this._proxy.$encode(content, uri, options);
        return buff.buffer;
    }
};
ExtHostWorkspace = __decorate([
    __param(0, IExtHostRpcService),
    __param(1, IExtHostInitDataService),
    __param(2, IExtHostFileSystemInfo),
    __param(3, ILogService),
    __param(4, IURITransformerService)
], ExtHostWorkspace);
export { ExtHostWorkspace };
export const IExtHostWorkspace = createDecorator('IExtHostWorkspace');
function parseSearchExcludeInclude(include) {
    let pattern;
    let includeFolder;
    if (include) {
        if (typeof include === 'string') {
            pattern = include;
        }
        else {
            pattern = include.pattern;
            includeFolder = URI.revive(include.baseUri);
        }
        return {
            pattern,
            folder: includeFolder
        };
    }
    return undefined;
}
function globsToISearchPatternBuilder(excludes) {
    return (excludes?.map((exclude) => {
        if (typeof exclude === 'string') {
            if (exclude === '') {
                return undefined;
            }
            return {
                pattern: exclude,
                uri: undefined
            };
        }
        else {
            const parsedExclude = parseSearchExcludeInclude(exclude);
            if (!parsedExclude) {
                return undefined;
            }
            return {
                pattern: parsedExclude.pattern,
                uri: parsedExclude.folder
            };
        }
    }) ?? []).filter((e) => !!e);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFdvcmtzcGFjZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2NvbW1vbi9leHRIb3N0V29ya3NwYWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxLQUFLLElBQUksVUFBVSxFQUFFLGFBQWEsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxPQUFPLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUM3RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUN6RSxPQUFPLEVBQUUsWUFBWSxFQUFFLE9BQU8sRUFBUyxNQUFNLCtCQUErQixDQUFDO0FBQzdFLE9BQU8sRUFBRSxlQUFlLEVBQUUsWUFBWSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDbEYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDOUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQzFELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUMxRCxPQUFPLEVBQUUsUUFBUSxFQUFFLG1CQUFtQixFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsWUFBWSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDakgsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQzFELE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sNkJBQTZCLENBQUM7QUFDakUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBRzNDLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUMxRixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDbEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBRWpGLE9BQU8sRUFBRSxTQUFTLEVBQUUsZUFBZSxFQUFFLE1BQU0saURBQWlELENBQUM7QUFDN0YsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDcEUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDdEUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFDNUQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQ3pELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUMxQyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUUzRSxPQUFPLEVBQXFDLGFBQWEsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBRTFHLE9BQU8sRUFBOEQsV0FBVyxFQUFxRixNQUFNLHVCQUF1QixDQUFDO0FBQ25NLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUU3RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsa0JBQWtCLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUM3SCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFZMUQsU0FBUyxhQUFhLENBQUMsT0FBWSxFQUFFLE9BQVksRUFBRSxxQkFBNkM7SUFDL0YsT0FBTyxJQUFJLE1BQU0sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsRUFBRSxxQkFBcUIsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQztBQUNsRyxDQUFDO0FBRUQsU0FBUywyQkFBMkIsQ0FBQyxDQUF5QixFQUFFLENBQXlCLEVBQUUscUJBQTZDO0lBQ3ZJLE9BQU8sYUFBYSxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLEdBQUcsRUFBRSxxQkFBcUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztBQUM3RyxDQUFDO0FBRUQsU0FBUywwQ0FBMEMsQ0FBQyxDQUF5QixFQUFFLENBQXlCLEVBQUUscUJBQTZDO0lBQ3RKLElBQUksQ0FBQyxDQUFDLEtBQUssS0FBSyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDekIsT0FBTyxDQUFDLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDbkMsQ0FBQztJQUVELE9BQU8sYUFBYSxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLEdBQUcsRUFBRSxxQkFBcUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztBQUNuSSxDQUFDO0FBRUQsU0FBUyxLQUFLLENBQUMsVUFBb0MsRUFBRSxVQUFvQyxFQUFFLE9BQXdILEVBQUUscUJBQTZDO0lBQ2pRLE1BQU0sZ0JBQWdCLEdBQUcsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxxQkFBcUIsQ0FBQyxDQUFDLENBQUM7SUFDbEcsTUFBTSxnQkFBZ0IsR0FBRyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLHFCQUFxQixDQUFDLENBQUMsQ0FBQztJQUVsRyxPQUFPLFVBQVUsQ0FBQyxnQkFBZ0IsRUFBRSxnQkFBZ0IsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLHFCQUFxQixDQUFDLENBQUMsQ0FBQztBQUN2RyxDQUFDO0FBRUQsU0FBUyxnQkFBZ0IsQ0FBQyxHQUFRLEVBQUUscUJBQTZDO0lBQ2hGLE1BQU0sWUFBWSxHQUFHLHFCQUFxQixDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDdkUsT0FBTyxDQUFDLENBQUMsWUFBWSxJQUFJLENBQUMsWUFBWSw4REFBbUQsQ0FBQyxDQUFDLENBQUM7QUFDN0YsQ0FBQztBQVlELE1BQU0sb0JBQXFCLFNBQVEsU0FBUztJQUUzQyxNQUFNLENBQUMsa0JBQWtCLENBQUMsSUFBMkIsRUFBRSwwQkFBNEQsRUFBRSw0QkFBOEQsRUFBRSxxQkFBNkM7UUFDak8sSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ1gsT0FBTyxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsRUFBRSxFQUFFLENBQUM7UUFDcEQsQ0FBQztRQUVELE1BQU0sRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxhQUFhLEVBQUUsU0FBUyxFQUFFLFVBQVUsRUFBRSxHQUFHLElBQUksQ0FBQztRQUN6RSxNQUFNLG1CQUFtQixHQUE2QixFQUFFLENBQUM7UUFFekQsOEVBQThFO1FBQzlFLDhFQUE4RTtRQUM5RSwyRUFBMkU7UUFDM0UsTUFBTSxZQUFZLEdBQUcsMEJBQTBCLENBQUM7UUFDaEQsSUFBSSwwQkFBMEIsRUFBRSxDQUFDO1lBQ2hDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxVQUFVLEVBQUUsS0FBSyxFQUFFLEVBQUU7Z0JBQ3JDLE1BQU0sU0FBUyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUM3QyxNQUFNLGNBQWMsR0FBRyxvQkFBb0IsQ0FBQyxXQUFXLENBQUMsNEJBQTRCLElBQUksMEJBQTBCLEVBQUUsU0FBUyxFQUFFLHFCQUFxQixDQUFDLENBQUM7Z0JBRXRKLElBQUksY0FBYyxFQUFFLENBQUM7b0JBQ3BCLGNBQWMsQ0FBQyxJQUFJLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FBQztvQkFDdEMsY0FBYyxDQUFDLEtBQUssR0FBRyxVQUFVLENBQUMsS0FBSyxDQUFDO29CQUV4QyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUM7Z0JBQzFDLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsRUFBRSxHQUFHLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxVQUFVLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7Z0JBQzVFLENBQUM7WUFDRixDQUFDLENBQUMsQ0FBQztRQUNKLENBQUM7YUFBTSxDQUFDO1lBQ1AsbUJBQW1CLENBQUMsSUFBSSxDQUFDLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM3RyxDQUFDO1FBRUQsaURBQWlEO1FBQ2pELG1CQUFtQixDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRW5FLE1BQU0sU0FBUyxHQUFHLElBQUksb0JBQW9CLENBQUMsRUFBRSxFQUFFLElBQUksRUFBRSxtQkFBbUIsRUFBRSxDQUFDLENBQUMsU0FBUyxFQUFFLGFBQWEsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxVQUFVLEVBQUUsR0FBRyxDQUFDLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLEVBQUUscUJBQXFCLENBQUMsQ0FBQyxDQUFDO1FBQzVNLE1BQU0sRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLEdBQUcsS0FBSyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsU0FBUyxDQUFDLGdCQUFnQixFQUFFLDJCQUEyQixFQUFFLHFCQUFxQixDQUFDLENBQUM7UUFFcEssT0FBTyxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLENBQUM7SUFDdEMsQ0FBQztJQUVPLE1BQU0sQ0FBQyxXQUFXLENBQUMsU0FBK0IsRUFBRSxlQUFvQixFQUFFLHFCQUE2QztRQUM5SCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsU0FBUyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNuRCxNQUFNLE1BQU0sR0FBRyxTQUFTLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDN0MsSUFBSSxhQUFhLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxlQUFlLEVBQUUscUJBQXFCLENBQUMsRUFBRSxDQUFDO2dCQUN2RSxPQUFPLE1BQU0sQ0FBQztZQUNmLENBQUM7UUFDRixDQUFDO1FBRUQsT0FBTyxTQUFTLENBQUM7SUFDbEIsQ0FBQztJQUtELFlBQVksRUFBVSxFQUFVLEtBQWEsRUFBRSxPQUFpQyxFQUFFLFNBQWtCLEVBQUUsYUFBeUIsRUFBVSxXQUFvQixFQUFFLGdCQUF1QztRQUNyTSxLQUFLLENBQUMsRUFBRSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLFNBQVMsRUFBRSxhQUFhLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztRQURqRSxVQUFLLEdBQUwsS0FBSyxDQUFRO1FBQTRGLGdCQUFXLEdBQVgsV0FBVyxDQUFTO1FBSDVJLHNCQUFpQixHQUE2QixFQUFFLENBQUM7UUFLakUsSUFBSSxDQUFDLFVBQVUsR0FBRyxpQkFBaUIsQ0FBQyxPQUFPLENBQXlCLGdCQUFnQixFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRWxHLDRDQUE0QztRQUM1QyxPQUFPLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFO1lBQ3hCLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDcEMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUN6QyxDQUFDLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRCxJQUFJLElBQUk7UUFDUCxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUM7SUFDbkIsQ0FBQztJQUVELElBQUksVUFBVTtRQUNiLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQztJQUN6QixDQUFDO0lBRUQsSUFBSSxnQkFBZ0I7UUFDbkIsT0FBTyxJQUFJLENBQUMsaUJBQWlCLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3hDLENBQUM7SUFFRCxrQkFBa0IsQ0FBQyxHQUFRLEVBQUUsYUFBdUI7UUFDbkQsSUFBSSxhQUFhLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUMvQyx5REFBeUQ7WUFDekQsR0FBRyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNwQixDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUN4QyxDQUFDO0lBRUQsc0JBQXNCLENBQUMsR0FBUTtRQUM5QixPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ2pDLENBQUM7Q0FDRDtBQUVNLElBQU0sZ0JBQWdCLEdBQXRCLE1BQU0sZ0JBQWdCO0lBNEI1QixZQUNxQixVQUE4QixFQUN6QixRQUFpQyxFQUNsQyxxQkFBNkMsRUFDeEQsVUFBdUIsRUFDWixxQkFBNkM7UUE3QnJELDBCQUFxQixHQUFHLElBQUksT0FBTyxFQUFzQyxDQUFDO1FBQ2xGLHlCQUFvQixHQUE4QyxJQUFJLENBQUMscUJBQXFCLENBQUMsS0FBSyxDQUFDO1FBRTNGLDhCQUF5QixHQUFHLElBQUksT0FBTyxFQUFRLENBQUM7UUFDeEQsNkJBQXdCLEdBQWdCLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxLQUFLLENBQUM7UUFjckUsMkJBQXNCLEdBQXVDLEVBQUUsQ0FBQztRQUV6RSxhQUFRLEdBQVksS0FBSyxDQUFDO1FBRWpCLGtDQUE2QixHQUFHLElBQUksR0FBRyxFQUE4QyxDQUFDO1FBbWxCdkcsd0JBQXdCO1FBRWhCLHdCQUFtQixHQUFHLENBQUMsQ0FBQztRQXNFZiwwQ0FBcUMsR0FBRyxJQUFJLFlBQVksRUFBNkMsQ0FBQztRQStCdkgsaUNBQWlDO1FBRWhCLDJCQUFzQixHQUFHLElBQUksR0FBRyxFQUF1QyxDQUFDO1FBbnJCeEYsSUFBSSxDQUFDLFdBQVcsR0FBRyxVQUFVLENBQUM7UUFDOUIsSUFBSSxDQUFDLHNCQUFzQixHQUFHLHFCQUFxQixDQUFDO1FBQ3BELElBQUksQ0FBQyxzQkFBc0IsR0FBRyxxQkFBcUIsQ0FBQztRQUNwRCxJQUFJLENBQUMsa0JBQWtCLEdBQUcsSUFBSSxPQUFPLEVBQUUsQ0FBQztRQUN4QyxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksT0FBTyxFQUFFLENBQUM7UUFFOUIsSUFBSSxDQUFDLE1BQU0sR0FBRyxVQUFVLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO1FBQ25FLElBQUksQ0FBQyxlQUFlLEdBQUcsVUFBVSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsd0JBQXdCLENBQUMsQ0FBQztRQUNqRixNQUFNLElBQUksR0FBRyxRQUFRLENBQUMsU0FBUyxDQUFDO1FBQ2hDLElBQUksQ0FBQyxtQkFBbUIsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksb0JBQW9CLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLEdBQUcsQ0FBQyxFQUFFLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxFQUFFLHFCQUFxQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDO0lBQ3RQLENBQUM7SUFFRCxvQkFBb0IsQ0FBQyxJQUEyQixFQUFFLE9BQWdCO1FBQ2pFLElBQUksQ0FBQyxRQUFRLEdBQUcsT0FBTyxDQUFDO1FBQ3hCLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNoQyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDO0lBQ3RCLENBQUM7SUFFRCxxQkFBcUI7UUFDcEIsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDO0lBQzdCLENBQUM7SUFFRCxvQkFBb0I7SUFFcEIsSUFBSSxTQUFTO1FBQ1osT0FBTyxJQUFJLENBQUMsZ0JBQWdCLENBQUM7SUFDOUIsQ0FBQztJQUVELElBQUksSUFBSTtRQUNQLE9BQU8sSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUM7SUFDdkUsQ0FBQztJQUVELElBQUksYUFBYTtRQUNoQixJQUFJLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1lBQzNCLElBQUksSUFBSSxDQUFDLGdCQUFnQixDQUFDLGFBQWEsRUFBRSxDQUFDO2dCQUN6QyxJQUFJLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLEVBQUUsQ0FBQztvQkFDdEMsT0FBTyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLE9BQU8sQ0FBQyxRQUFRLEVBQUUsSUFBSSxFQUFFLFFBQVEsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLGFBQWEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsMENBQTBDO2dCQUN4SixDQUFDO2dCQUVELE9BQU8sSUFBSSxDQUFDLGdCQUFnQixDQUFDLGFBQWEsQ0FBQyxDQUFDLCtDQUErQztZQUM1RixDQUFDO1FBQ0YsQ0FBQztRQUVELE9BQU8sU0FBUyxDQUFDO0lBQ2xCLENBQUM7SUFFRCxJQUFZLGdCQUFnQjtRQUMzQixPQUFPLElBQUksQ0FBQyxxQkFBcUIsSUFBSSxJQUFJLENBQUMsbUJBQW1CLENBQUM7SUFDL0QsQ0FBQztJQUVELG1CQUFtQjtRQUNsQixJQUFJLENBQUMsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7WUFDNUIsT0FBTyxTQUFTLENBQUM7UUFDbEIsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLGdCQUFnQixDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN4RCxDQUFDO0lBRUQsS0FBSyxDQUFDLG9CQUFvQjtRQUN6QixNQUFNLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDM0IsSUFBSSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1lBQzVCLE9BQU8sU0FBUyxDQUFDO1FBQ2xCLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDeEQsQ0FBQztJQUVELHNCQUFzQixDQUFDLFNBQWdDLEVBQUUsS0FBYSxFQUFFLFdBQW1CLEVBQUUsR0FBRyxxQkFBMkQ7UUFDMUosTUFBTSxzQ0FBc0MsR0FBeUMsRUFBRSxDQUFDO1FBQ3hGLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxxQkFBcUIsQ0FBQyxFQUFFLENBQUM7WUFDMUMscUJBQXFCLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxFQUFFO2dCQUMzQyxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsc0NBQXNDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsV0FBVyxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxFQUFFLENBQUM7b0JBQ3pKLHNDQUFzQyxDQUFDLElBQUksQ0FBQyxFQUFFLEdBQUcsRUFBRSxXQUFXLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxXQUFXLENBQUMsSUFBSSxJQUFJLG1CQUFtQixDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBQ3ZJLENBQUM7WUFDRixDQUFDLENBQUMsQ0FBQztRQUNKLENBQUM7UUFFRCxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMscUJBQXFCLEVBQUUsQ0FBQztZQUNsQyxPQUFPLEtBQUssQ0FBQyxDQUFDLDBEQUEwRDtRQUN6RSxDQUFDO1FBRUQsSUFBSSxDQUFDLEtBQUssRUFBRSxXQUFXLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsS0FBSyxRQUFRLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDcEUsT0FBTyxLQUFLLENBQUMsQ0FBQyxtQkFBbUI7UUFDbEMsQ0FBQztRQUVELElBQUksV0FBVyxLQUFLLENBQUMsSUFBSSxzQ0FBc0MsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDOUUsT0FBTyxLQUFLLENBQUMsQ0FBQywyQkFBMkI7UUFDMUMsQ0FBQztRQUVELE1BQU0sdUJBQXVCLEdBQTZCLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFDOUgsSUFBSSxLQUFLLEdBQUcsV0FBVyxHQUFHLHVCQUF1QixDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQzFELE9BQU8sS0FBSyxDQUFDLENBQUMsa0NBQWtDO1FBQ2pELENBQUM7UUFFRCwrRUFBK0U7UUFDL0UsTUFBTSxtQkFBbUIsR0FBRyx1QkFBdUIsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDN0QsbUJBQW1CLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxXQUFXLEVBQUUsR0FBRyxzQ0FBc0MsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQyxHQUFHLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxJQUFJLElBQUksbUJBQW1CLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLEtBQUssRUFBRSxTQUFVLENBQUMsaUJBQWlCLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUV0TSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsbUJBQW1CLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDckQsTUFBTSxNQUFNLEdBQUcsbUJBQW1CLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDdEMsSUFBSSxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxXQUFXLEVBQUUsS0FBSyxFQUFFLEVBQUUsQ0FBQyxLQUFLLEtBQUssQ0FBQyxJQUFJLGFBQWEsQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLFdBQVcsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLHNCQUFzQixDQUFDLENBQUMsRUFBRSxDQUFDO2dCQUM5SSxPQUFPLEtBQUssQ0FBQyxDQUFDLDRDQUE0QztZQUMzRCxDQUFDO1FBQ0YsQ0FBQztRQUVELG1CQUFtQixDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxZQUFZO1FBQ3hFLE1BQU0sRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLEdBQUcsS0FBSyxDQUFDLHVCQUF1QixFQUFFLG1CQUFtQixFQUFFLDBDQUEwQyxFQUFFLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO1FBQ3hKLElBQUksS0FBSyxDQUFDLE1BQU0sS0FBSyxDQUFDLElBQUksT0FBTyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUNoRCxPQUFPLEtBQUssQ0FBQyxDQUFDLDJCQUEyQjtRQUMxQyxDQUFDO1FBRUQsdUJBQXVCO1FBQ3ZCLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2pCLE1BQU0sT0FBTyxHQUFHLFNBQVMsQ0FBQyxXQUFXLElBQUksU0FBUyxDQUFDLElBQUksQ0FBQztZQUN4RCxJQUFJLENBQUMsTUFBTSxDQUFDLHVCQUF1QixDQUFDLE9BQU8sRUFBRSxLQUFLLEVBQUUsV0FBVyxFQUFFLHNDQUFzQyxDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxLQUFLLENBQUMsRUFBRTtnQkFFaEksd0VBQXdFO2dCQUN4RSwyRUFBMkU7Z0JBQzNFLElBQUksQ0FBQyxxQkFBcUIsR0FBRyxTQUFTLENBQUM7Z0JBRXZDLHFCQUFxQjtnQkFDckIsTUFBTSxPQUFPLEdBQTZCLEVBQUUsTUFBTSxFQUFFLEVBQUUsVUFBVSxFQUFFLFNBQVMsQ0FBQyxVQUFVLEVBQUUsS0FBSyxFQUFFLFNBQVMsQ0FBQyxXQUFXLElBQUksU0FBUyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUM7Z0JBQzNJLElBQUksQ0FBQyxlQUFlLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsUUFBUSxDQUFDLGFBQWEsRUFBRSx5REFBeUQsRUFBRSxPQUFPLEVBQUUsS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFDLEVBQUUsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQy9LLENBQUMsQ0FBQyxDQUFDO1FBQ0osQ0FBQztRQUVELHlCQUF5QjtRQUN6QixJQUFJLENBQUMsc0JBQXNCLENBQUMsbUJBQW1CLENBQUMsQ0FBQztRQUVqRCxPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7SUFFRCxrQkFBa0IsQ0FBQyxHQUFlLEVBQUUsYUFBdUI7UUFDMUQsSUFBSSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1lBQzVCLE9BQU8sU0FBUyxDQUFDO1FBQ2xCLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLEVBQUUsYUFBYSxDQUFDLENBQUM7SUFDckUsQ0FBQztJQUVELEtBQUssQ0FBQyxtQkFBbUIsQ0FBQyxHQUFlLEVBQUUsYUFBdUI7UUFDakUsTUFBTSxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDO1FBQzNCLElBQUksQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztZQUM1QixPQUFPLFNBQVMsQ0FBQztRQUNsQixDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsa0JBQWtCLENBQUMsR0FBRyxFQUFFLGFBQWEsQ0FBQyxDQUFDO0lBQ3JFLENBQUM7SUFFRCxLQUFLLENBQUMsc0JBQXNCLENBQUMsR0FBZTtRQUMzQyxNQUFNLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDM0IsSUFBSSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1lBQzVCLE9BQU8sU0FBUyxDQUFDO1FBQ2xCLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxzQkFBc0IsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUMxRCxDQUFDO0lBRUQsT0FBTztRQUVOLDZDQUE2QztRQUM3QyxnREFBZ0Q7UUFDaEQsZ0NBQWdDO1FBQ2hDLElBQUksQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztZQUM1QixPQUFPLFNBQVMsQ0FBQztRQUNsQixDQUFDO1FBRUQsTUFBTSxFQUFFLE9BQU8sRUFBRSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQztRQUMxQyxJQUFJLE9BQU8sQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDMUIsT0FBTyxTQUFTLENBQUM7UUFDbEIsQ0FBQztRQUNELDZDQUE2QztRQUM3QyxPQUFPLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDO0lBQzlCLENBQUM7SUFFRCxlQUFlLENBQUMsU0FBOEIsRUFBRSxnQkFBMEI7UUFFekUsSUFBSSxRQUF5QixDQUFDO1FBQzlCLElBQUksSUFBSSxHQUFXLEVBQUUsQ0FBQztRQUN0QixJQUFJLE9BQU8sU0FBUyxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQ25DLFFBQVEsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQy9CLElBQUksR0FBRyxTQUFTLENBQUM7UUFDbEIsQ0FBQzthQUFNLElBQUksT0FBTyxTQUFTLEtBQUssV0FBVyxFQUFFLENBQUM7WUFDN0MsUUFBUSxHQUFHLFNBQVMsQ0FBQztZQUNyQixJQUFJLEdBQUcsU0FBUyxDQUFDLE1BQU0sQ0FBQztRQUN6QixDQUFDO1FBRUQsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ2YsT0FBTyxJQUFJLENBQUM7UUFDYixDQUFDO1FBRUQsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUNyQyxRQUFRLEVBQ1IsSUFBSSxDQUNKLENBQUM7UUFFRixJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDYixPQUFPLElBQUksQ0FBQztRQUNiLENBQUM7UUFFRCxJQUFJLE9BQU8sZ0JBQWdCLEtBQUssV0FBVyxJQUFJLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1lBQ3RFLGdCQUFnQixHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztRQUM3RCxDQUFDO1FBRUQsSUFBSSxNQUFNLEdBQUcsWUFBWSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDaEQsSUFBSSxnQkFBZ0IsSUFBSSxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDckMsTUFBTSxHQUFHLEdBQUcsTUFBTSxDQUFDLElBQUksSUFBSSxNQUFNLEVBQUUsQ0FBQztRQUNyQyxDQUFDO1FBQ0QsT0FBTyxNQUFPLENBQUM7SUFDaEIsQ0FBQztJQUVPLHNCQUFzQixDQUFDLE9BQWlDO1FBRS9ELGtGQUFrRjtRQUNsRixnRUFBZ0U7UUFDaEUsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztZQUMzQixJQUFJLENBQUMscUJBQXFCLEdBQUcsb0JBQW9CLENBQUMsa0JBQWtCLENBQUM7Z0JBQ3BFLEVBQUUsRUFBRSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsRUFBRTtnQkFDNUIsSUFBSSxFQUFFLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJO2dCQUNoQyxhQUFhLEVBQUUsSUFBSSxDQUFDLGdCQUFnQixDQUFDLGFBQWE7Z0JBQ2xELE9BQU87Z0JBQ1AsVUFBVSxFQUFFLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVO2FBQzVDLEVBQUUsSUFBSSxDQUFDLGdCQUFnQixFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxTQUFTLElBQUksU0FBUyxDQUFDO1FBQzFGLENBQUM7SUFDRixDQUFDO0lBRUQsb0JBQW9CLENBQUMsSUFBMkI7UUFFL0MsTUFBTSxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLEdBQUcsb0JBQW9CLENBQUMsa0JBQWtCLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxJQUFJLENBQUMscUJBQXFCLEVBQUUsSUFBSSxDQUFDLHNCQUFzQixDQUFDLENBQUM7UUFFdkssNkVBQTZFO1FBQzdFLHlCQUF5QjtRQUN6QixJQUFJLENBQUMsbUJBQW1CLEdBQUcsU0FBUyxJQUFJLFNBQVMsQ0FBQztRQUNsRCxJQUFJLENBQUMscUJBQXFCLEdBQUcsU0FBUyxDQUFDO1FBRXZDLFNBQVM7UUFDVCxJQUFJLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUM7WUFDN0MsS0FBSztZQUNMLE9BQU87U0FDUCxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFRCxpQkFBaUI7SUFFakI7O09BRUc7SUFDSCxTQUFTLENBQUMsT0FBdUMsRUFBRSxPQUE4QyxFQUFFLFVBQThCLEVBQUUsV0FBZ0MsRUFBRSxRQUFrQyxpQkFBaUIsQ0FBQyxJQUFJO1FBQzVOLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLHNEQUFzRCxXQUFXLENBQUMsS0FBSyx5QkFBeUIsQ0FBQyxDQUFDO1FBRXpILElBQUksYUFBYSxHQUFXLEVBQUUsQ0FBQztRQUMvQixJQUFJLGVBQWUsR0FBRyxJQUFJLENBQUM7UUFDM0IsSUFBSSxPQUFPLEtBQUssSUFBSSxFQUFFLENBQUM7WUFDdEIsZUFBZSxHQUFHLEtBQUssQ0FBQztRQUN6QixDQUFDO2FBQU0sSUFBSSxPQUFPLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDbEMsSUFBSSxPQUFPLE9BQU8sS0FBSyxRQUFRLEVBQUUsQ0FBQztnQkFDakMsYUFBYSxHQUFHLE9BQU8sQ0FBQztZQUN6QixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsYUFBYSxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUM7WUFDakMsQ0FBQztRQUNGLENBQUM7UUFFRCw4Q0FBOEM7UUFDOUMsT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFDLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLEVBQUU7WUFDL0QsT0FBTyxFQUFFLENBQUMsYUFBYSxDQUFDO1lBQ3hCLFVBQVU7WUFDVixrQkFBa0IsRUFBRSxlQUFlLENBQUMsQ0FBQyxDQUFDLHFCQUFxQixDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMscUJBQXFCLENBQUMsSUFBSTtZQUNyRyxjQUFjLEVBQUU7Z0JBQ2YsS0FBSyxFQUFFLEtBQUs7YUFDWjtTQUNELEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDWCxDQUFDO0lBR0QsVUFBVSxDQUFDLFlBQTJDLEVBQ3JELFVBQW9DLEVBQUUsRUFDdEMsV0FBZ0MsRUFDaEMsUUFBa0MsaUJBQWlCLENBQUMsSUFBSTtRQUN4RCxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQywwREFBMEQsV0FBVyxDQUFDLEtBQUssNkJBQTZCLENBQUMsQ0FBQztRQUNqSSxPQUFPLElBQUksQ0FBQyxjQUFjLENBQUMsRUFBRSxJQUFJLEVBQUUsY0FBYyxFQUFFLEtBQUssRUFBRSxZQUFZLEVBQUUsRUFBRSxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDM0YsQ0FBQztJQUVPLEtBQUssQ0FBQyxjQUFjO0lBQzNCLHFHQUFxRztJQUNyRyx3R0FBd0c7SUFDeEcsS0FBc0ssRUFDdEssT0FBaUMsRUFDakMsS0FBK0I7UUFFL0IsSUFBSSxLQUFLLENBQUMsdUJBQXVCLEVBQUUsQ0FBQztZQUNuQyxPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDNUIsQ0FBQztRQUVELE1BQU0saUJBQWlCLEdBQUcsS0FBSyxDQUFDLElBQUksS0FBSyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxJQUFJLEVBQUUsQ0FBQztRQUN2RixJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLENBQUM7WUFDdkMsT0FBTyxDQUFDLEtBQUssQ0FBQywrQkFBK0IsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO1lBQ2xFLE1BQU0sSUFBSSxLQUFLLENBQUMsaUNBQWlDLElBQUksQ0FBQyxTQUFTLENBQUMsaUJBQWlCLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDdkYsQ0FBQztRQUVELE1BQU0sWUFBWSxHQUE2QyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLEVBQUU7WUFFbEcsTUFBTSxlQUFlLEdBQUcsNEJBQTRCLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBRXRFLE1BQU0sV0FBVyxHQUE2QjtnQkFDN0MsY0FBYyxFQUFFLE9BQU8sT0FBTyxDQUFDLGNBQWMsS0FBSyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsU0FBUztnQkFDakcsb0JBQW9CLEVBQUUsT0FBTyxPQUFPLENBQUMsY0FBYyxFQUFFLEtBQUssS0FBSyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLFNBQVM7Z0JBQ3BILDBCQUEwQixFQUFFLE9BQU8sT0FBTyxDQUFDLGNBQWMsRUFBRSxNQUFNLEtBQUssU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxTQUFTO2dCQUM1SCwwQkFBMEIsRUFBRSxPQUFPLE9BQU8sQ0FBQyxjQUFjLEVBQUUsTUFBTSxLQUFLLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsU0FBUztnQkFDNUgsd0JBQXdCLEVBQUUsT0FBTyxDQUFDLGtCQUFrQixLQUFLLFNBQVMsSUFBSSxPQUFPLENBQUMsa0JBQWtCLEtBQUsscUJBQXFCLENBQUMsSUFBSTtnQkFDL0gsOEJBQThCLEVBQUUsT0FBTyxDQUFDLGtCQUFrQixLQUFLLFNBQVMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsS0FBSyxxQkFBcUIsQ0FBQyxxQkFBcUIsQ0FBQztnQkFDeEosVUFBVSxFQUFFLE9BQU8sQ0FBQyxVQUFVO2dCQUM5QixjQUFjLEVBQUUsZUFBZSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsU0FBUztnQkFDeEUsT0FBTyxFQUFFLGlCQUFpQjtnQkFDMUIsZ0JBQWdCLEVBQUUsS0FBSyxDQUFDLElBQUksS0FBSyxTQUFTLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsSUFBSTthQUM3RCxDQUFDO1lBRUYsTUFBTSxZQUFZLEdBQUcseUJBQXlCLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO1lBQzlFLE1BQU0sV0FBVyxHQUFHLFlBQVksRUFBRSxNQUFNLENBQUM7WUFDekMsSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLFNBQVMsRUFBRSxDQUFDO2dCQUM5QixXQUFXLENBQUMsY0FBYyxHQUFHLFlBQVksRUFBRSxPQUFPLENBQUM7WUFDcEQsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLFdBQVcsQ0FBQyxXQUFXLEdBQUcsWUFBWSxFQUFFLE9BQU8sQ0FBQztZQUNqRCxDQUFDO1lBRUQsT0FBTztnQkFDTixNQUFNLEVBQUUsV0FBVztnQkFDbkIsT0FBTyxFQUFFLFdBQVc7YUFDcEIsQ0FBQztRQUNILENBQUMsQ0FBQyxDQUFDO1FBRUgsT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFDLFlBQVksRUFBRSxLQUFLLENBQUMsQ0FBQztJQUNqRCxDQUFDO0lBRU8sS0FBSyxDQUFDLGNBQWMsQ0FDM0IsWUFBa0UsRUFDbEUsS0FBd0I7UUFFeEIsTUFBTSxNQUFNLEdBQUcsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLFlBQVksRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLGdCQUFnQixDQUN4RixNQUFNLENBQUMsTUFBTSxJQUFJLElBQUksRUFDckIsTUFBTSxDQUFDLE9BQU8sRUFDZCxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FDNUUsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUVULE9BQU8sTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDO0lBQ3RCLENBQUM7SUFFRCxnQkFBZ0IsQ0FBQyxLQUE4QixFQUFFLE9BQW1ELEVBQUUsV0FBZ0MsRUFBRSxRQUFrQyxpQkFBaUIsQ0FBQyxJQUFJO1FBQy9MLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLDZEQUE2RCxXQUFXLENBQUMsS0FBSyxnQ0FBZ0MsQ0FBQyxDQUFDO1FBR3ZJLE1BQU0sVUFBVSxHQUFHLENBQUMsT0FBdUMsRUFBMEMsRUFBRTtZQUN0RyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQ2QsT0FBTztvQkFDTixNQUFNLEVBQUUsU0FBUztvQkFDakIsT0FBTyxFQUFFLEVBQUU7aUJBQ1gsQ0FBQztZQUNILENBQUM7WUFDRCxNQUFNLGFBQWEsR0FBRyxPQUFPLENBQUMsQ0FBQyxDQUFDLHlCQUF5QixDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDO1lBRWpHLE1BQU0sZUFBZSxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLDRCQUE0QixDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDO1lBRXBHLE9BQU87Z0JBQ04sT0FBTyxFQUFFO29CQUVSLGNBQWMsRUFBRSxPQUFPLE9BQU8sQ0FBQyxjQUFjLEtBQUssU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLFNBQVM7b0JBQ2pHLG9CQUFvQixFQUFFLE9BQU8sT0FBTyxDQUFDLGNBQWMsS0FBSyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsU0FBUztvQkFDdkcsMEJBQTBCLEVBQUUsT0FBTyxPQUFPLENBQUMsY0FBYyxFQUFFLE1BQU0sS0FBSyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLGNBQWMsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLFNBQVM7b0JBQzdILDBCQUEwQixFQUFFLE9BQU8sT0FBTyxDQUFDLGNBQWMsRUFBRSxNQUFNLEtBQUssU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxjQUFjLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxTQUFTO29CQUM3SCx3QkFBd0IsRUFBRSxPQUFPLENBQUMsa0JBQWtCLEtBQUssU0FBUyxJQUFJLE9BQU8sQ0FBQyxrQkFBa0IsS0FBSyxxQkFBcUIsQ0FBQyxJQUFJO29CQUMvSCw4QkFBOEIsRUFBRSxPQUFPLENBQUMsa0JBQWtCLEtBQUssU0FBUyxJQUFJLENBQUMsT0FBTyxDQUFDLGtCQUFrQixLQUFLLHFCQUFxQixDQUFDLHFCQUFxQixDQUFDO29CQUN4SixZQUFZLEVBQUUsT0FBTyxDQUFDLFFBQVE7b0JBQzlCLFVBQVUsRUFBRSxPQUFPLENBQUMsVUFBVTtvQkFDOUIsY0FBYyxFQUFFLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDO3dCQUN4QyxVQUFVLEVBQUUsT0FBTyxDQUFDLGNBQWMsRUFBRSxhQUFhLElBQUksR0FBRzt3QkFDeEQsWUFBWSxFQUFFLE9BQU8sQ0FBQyxjQUFjLEVBQUUsWUFBWSxJQUFJLEtBQUs7cUJBQzNELENBQUMsQ0FBQyxDQUFDLFNBQVM7b0JBQ2Isa0JBQWtCLEVBQUUsT0FBTyxDQUFDLGtCQUFrQjtvQkFFOUMsY0FBYyxFQUFFLGFBQWEsRUFBRSxPQUFPO29CQUN0QyxjQUFjLEVBQUUsZUFBZTtpQkFDSTtnQkFDcEMsTUFBTSxFQUFFLGFBQWEsRUFBRSxNQUFNO2FBQ29CLENBQUM7UUFDcEQsQ0FBQyxDQUFDO1FBRUYsTUFBTSxlQUFlLEdBQTJELENBQUMsQ0FBQyxPQUFPLEVBQUUsT0FBTyxFQUFFLEdBQUcsQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQ25ILFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1FBRW5ELE1BQU0sWUFBWSxHQUFHLGVBQWUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxRQUFRLEVBQXNELEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUM7UUFFMUgsTUFBTSxXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztRQUMxQyxNQUFNLGVBQWUsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksT0FBTyxFQUFnRCxDQUFDLENBQUM7UUFDckcsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUN4QyxLQUFLLEVBQ0wsWUFBWSxFQUNaLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRSxFQUFFLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUN0RCxLQUFLLENBQ0wsQ0FBQztRQUNGLE1BQU0sYUFBYSxHQUFHLElBQUksbUJBQW1CLENBQTJCLEtBQUssRUFBQyxPQUFPLEVBQUMsRUFBRTtZQUN2RixXQUFXLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUU7Z0JBQ3pDLE1BQU0sTUFBTSxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUM7Z0JBQ3hCLE1BQU0sR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUM7Z0JBQ2xCLElBQUksYUFBYSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7b0JBQzNCLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxnQkFBZ0IsQ0FDbkMsR0FBRyxFQUNILE1BQU0sQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO3dCQUNyQyxZQUFZLEVBQUUsSUFBSSxLQUFLLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxlQUFlLEVBQUUsS0FBSyxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUUsS0FBSyxDQUFDLE9BQU8sQ0FBQyxhQUFhLEVBQUUsS0FBSyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUM7d0JBQ3ZJLFdBQVcsRUFBRSxJQUFJLEtBQUssQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLGVBQWUsRUFBRSxLQUFLLENBQUMsTUFBTSxDQUFDLFdBQVcsRUFBRSxLQUFLLENBQUMsTUFBTSxDQUFDLGFBQWEsRUFBRSxLQUFLLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQztxQkFDbEksQ0FBQyxDQUFDLEVBQ0gsTUFBTSxDQUFDLFdBQVcsQ0FFbEIsQ0FBQyxDQUFDO2dCQUNKLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksa0JBQWtCLENBQ3JDLEdBQUcsRUFDSCxNQUFNLENBQUMsSUFBSSxFQUNYLE1BQU0sQ0FBQyxVQUFVLENBQ2pCLENBQUMsQ0FBQztnQkFFSixDQUFDO1lBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNKLE1BQU0sUUFBUSxDQUFDO1FBQ2hCLENBQUMsQ0FBQyxDQUFDO1FBRUgsT0FBTztZQUNOLE9BQU8sRUFBRSxhQUFhO1lBQ3RCLFFBQVEsRUFBRSxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7Z0JBQzdCLFdBQVcsQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDdEIsT0FBTztvQkFDTixRQUFRLEVBQUUsQ0FBQyxFQUFFLFFBQVEsSUFBSSxLQUFLO2lCQUM5QixDQUFDO1lBQ0gsQ0FBQyxDQUFDO1NBQ0YsQ0FBQztJQUNILENBQUM7SUFHRCxLQUFLLENBQUMsbUJBQW1CLENBQUMsS0FBNkIsRUFBRSxZQUFrRSxFQUFFLFFBQTRELEVBQUUsUUFBa0MsaUJBQWlCLENBQUMsSUFBSTtRQUNsUCxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsT0FBTyxFQUFFLENBQUM7UUFFcEQsSUFBSSxVQUFVLEdBQUcsS0FBSyxDQUFDO1FBQ3ZCLEtBQUssQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUNqQyxVQUFVLEdBQUcsSUFBSSxDQUFDO1FBQ25CLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLHNCQUFzQixDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFO1lBQzVDLElBQUksVUFBVSxFQUFFLENBQUM7Z0JBQ2hCLE9BQU87WUFDUixDQUFDO1lBRUQsTUFBTSxHQUFHLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDbkMsQ0FBQyxDQUFDLE9BQVEsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEVBQUU7Z0JBQzlCLE1BQU0sTUFBTSxHQUEyQixNQUFNLENBQUMsU0FBUyxDQUFDLENBQUM7Z0JBQ3pELFFBQVEsQ0FBQyxNQUFNLEVBQUUsR0FBRyxDQUFDLENBQUM7WUFDdkIsQ0FBQyxDQUFDLENBQUM7UUFDSixDQUFDLENBQUM7UUFFRixJQUFJLEtBQUssQ0FBQyx1QkFBdUIsRUFBRSxDQUFDO1lBQ25DLE9BQU8sRUFBRSxDQUFDO1FBQ1gsQ0FBQztRQUVELElBQUksQ0FBQztZQUNKLE1BQU0sTUFBTSxHQUFHLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxZQUFZLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FDeEYsS0FBSyxFQUNMLE1BQU0sQ0FBQyxNQUFNLElBQUksSUFBSSxFQUNyQixNQUFNLENBQUMsT0FBTyxFQUNkLFNBQVMsRUFDVCxLQUFLLENBQUMsSUFBSSxFQUFFLENBQ1osSUFBSSxFQUFFLENBQUMsQ0FBQztZQUNULE9BQU8sSUFBSSxDQUFDLHNCQUFzQixDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQzlDLE9BQU8sTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsRUFBRTtnQkFDakMsT0FBTztvQkFDTixRQUFRLEVBQUUsR0FBRyxFQUFFLFFBQVEsSUFBSSxDQUFDLEdBQUcsRUFBRSxRQUFRLElBQUksS0FBSyxDQUFDO29CQUNuRCxPQUFPLEVBQUUsQ0FBQyxHQUFHLEVBQUUsT0FBTyxJQUFJLEVBQUUsRUFBRSxHQUFHLEVBQUUsT0FBTyxJQUFJLEVBQUUsQ0FBQyxDQUFDLElBQUksRUFBRTtpQkFDeEQsQ0FBQztZQUNILENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsQ0FBQztRQUUvQixDQUFDO1FBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQztZQUNkLE9BQU8sSUFBSSxDQUFDLHNCQUFzQixDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQzlDLE1BQU0sR0FBRyxDQUFDO1FBQ1gsQ0FBQztJQUNGLENBQUM7SUFFRCxLQUFLLENBQUMsZUFBZSxDQUFDLEtBQTZCLEVBQUUsT0FBdUUsRUFBRSxRQUFtRCxFQUFFLFdBQWdDLEVBQUUsUUFBa0MsaUJBQWlCLENBQUMsSUFBSTtRQUM1USxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyw0REFBNEQsV0FBVyxDQUFDLEtBQUssK0JBQStCLENBQUMsQ0FBQztRQUVySSxNQUFNLGNBQWMsR0FBb0MsT0FBTyxPQUFPLENBQUMsY0FBYyxLQUFLLFdBQVcsQ0FBQyxDQUFDO1lBQ3RHO2dCQUNDLFVBQVUsRUFBRSxHQUFHO2dCQUNmLFlBQVksRUFBRSxLQUFLO2FBQ25CLENBQUMsQ0FBQztZQUNILE9BQU8sQ0FBQyxjQUFjLENBQUM7UUFFeEIsTUFBTSxhQUFhLEdBQUcseUJBQXlCLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztRQUVuRixNQUFNLGNBQWMsR0FBRyxDQUFDLE9BQU8sT0FBTyxDQUFDLE9BQU8sS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQy9FLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUM7UUFDdkQsTUFBTSxZQUFZLEdBQTZCO1lBQzlDLGNBQWMsRUFBRSxPQUFPLE9BQU8sQ0FBQyxjQUFjLEtBQUssU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLFNBQVM7WUFDakcsb0JBQW9CLEVBQUUsT0FBTyxPQUFPLENBQUMsY0FBYyxLQUFLLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxTQUFTO1lBQ3ZHLDBCQUEwQixFQUFFLE9BQU8sT0FBTyxDQUFDLG9CQUFvQixLQUFLLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLFNBQVM7WUFDekgsMEJBQTBCLEVBQUUsT0FBTyxPQUFPLENBQUMsb0JBQW9CLEtBQUssU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsU0FBUztZQUN6SCx3QkFBd0IsRUFBRSxPQUFPLE9BQU8sQ0FBQyxrQkFBa0IsS0FBSyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxJQUFJO1lBQzlHLDhCQUE4QixFQUFFLE9BQU8sT0FBTyxDQUFDLGdCQUFnQixLQUFLLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLElBQUk7WUFDaEgsWUFBWSxFQUFFLE9BQU8sQ0FBQyxRQUFRO1lBQzlCLFVBQVUsRUFBRSxPQUFPLENBQUMsVUFBVTtZQUM5QixjQUFjO1lBQ2Qsa0JBQWtCLEVBQUUsT0FBTyxDQUFDLFlBQVksRUFBRSwrREFBK0Q7WUFFekcsY0FBYyxFQUFFLGFBQWEsRUFBRSxPQUFPO1lBQ3RDLGNBQWMsRUFBRSxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxPQUFPLEVBQUUsY0FBYyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUztTQUMxRSxDQUFDO1FBRUYsTUFBTSxRQUFRLEdBQUcsQ0FBQyxNQUE4QixFQUFFLEdBQVEsRUFBRSxFQUFFO1lBQzdELElBQUksYUFBYSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7Z0JBQzNCLFFBQVEsQ0FBQztvQkFDUixHQUFHO29CQUNILE9BQU8sRUFBRTt3QkFDUixJQUFJLEVBQUUsTUFBTSxDQUFDLFdBQVc7d0JBQ3hCLE9BQU8sRUFBRSxhQUFhLENBQ3JCLE1BQU0sQ0FBQyxjQUFjLEVBQ3JCLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxlQUFlLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxhQUFhLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQztxQkFDaEg7b0JBQ0QsTUFBTSxFQUFFLGFBQWEsQ0FDcEIsTUFBTSxDQUFDLGNBQWMsRUFDckIsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLGVBQWUsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLGFBQWEsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDO2lCQUMzRSxDQUFDLENBQUM7WUFDckMsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLFFBQVEsQ0FBQztvQkFDUixHQUFHO29CQUNILElBQUksRUFBRSxNQUFNLENBQUMsSUFBSTtvQkFDakIsVUFBVSxFQUFFLE1BQU0sQ0FBQyxVQUFVO2lCQUNNLENBQUMsQ0FBQztZQUN2QyxDQUFDO1FBQ0YsQ0FBQyxDQUFDO1FBRUYsT0FBTyxJQUFJLENBQUMsbUJBQW1CLENBQUMsS0FBSyxFQUFFLENBQUMsRUFBRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sRUFBRSxhQUFhLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDckgsQ0FBQztJQUVELHVCQUF1QixDQUFDLE1BQXNCLEVBQUUsU0FBaUI7UUFDaEUsSUFBSSxDQUFDLHNCQUFzQixDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDbEQsQ0FBQztJQUVELEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBUTtRQUNsQixNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO1FBRS9ELE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUMzQixDQUFDO0lBRUQsS0FBSyxDQUFDLE1BQU0sQ0FBQyxHQUFRO1FBQ3BCLE1BQU0sTUFBTSxHQUFHLE1BQU0sSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7UUFFOUQsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQzNCLENBQUM7SUFFRCxPQUFPLENBQUMsZUFBeUI7UUFDaEMsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsQ0FBQztJQUM5QyxDQUFDO0lBRUQsWUFBWSxDQUFDLEdBQVc7UUFDdkIsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUN2QyxDQUFDO0lBRUQsbUJBQW1CLENBQUMsUUFBa0I7UUFDckMsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ25ELENBQUM7SUFFRCwyQkFBMkIsQ0FBQyxHQUFXO1FBQ3RDLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyw0QkFBNEIsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUN0RCxDQUFDO0lBRUQsZ0JBQWdCO1FBQ2YsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLGlCQUFpQixFQUFFLENBQUM7SUFDeEMsQ0FBQztJQUVELGdCQUFnQjtJQUVoQixJQUFJLE9BQU87UUFDVixPQUFPLElBQUksQ0FBQyxRQUFRLENBQUM7SUFDdEIsQ0FBQztJQUVELHFCQUFxQixDQUFDLE9BQTZDO1FBQ2xFLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxzQkFBc0IsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUNwRCxDQUFDO0lBRUQseUJBQXlCO1FBQ3hCLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDcEIsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUM7WUFDckIsSUFBSSxDQUFDLHlCQUF5QixDQUFDLElBQUksRUFBRSxDQUFDO1FBQ3ZDLENBQUM7SUFDRixDQUFDO0lBTUQscUJBQXFCO0lBQ3JCLG1DQUFtQyxDQUFDLE1BQWMsRUFBRSxRQUE0QztRQUMvRixJQUFJLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztZQUNwRCxNQUFNLElBQUksS0FBSyxDQUFDLHFEQUFxRCxNQUFNLEVBQUUsQ0FBQyxDQUFDO1FBQ2hGLENBQUM7UUFFRCxJQUFJLENBQUMsNkJBQTZCLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQztRQUN6RCxNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsc0JBQXNCLENBQUMsdUJBQXVCLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDbkYsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUM7UUFDMUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxvQ0FBb0MsQ0FBQyxNQUFNLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFFekUsT0FBTyxZQUFZLENBQUMsR0FBRyxFQUFFO1lBQ3hCLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDbEQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxzQ0FBc0MsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUM1RCxDQUFDLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRCx3QkFBd0I7SUFDeEIsS0FBSyxDQUFDLHlCQUF5QixDQUFDLGVBQThCLEVBQUUsaUJBQW9DO1FBQ25HLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLHFEQUFxRCxFQUFFLGVBQWUsQ0FBQyxDQUFDO1FBQzlGLE1BQU0sTUFBTSxHQUFHLE1BQU0sSUFBSSxDQUFDLHNCQUFzQixDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQztRQUM5RSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDYixJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxvQ0FBb0MsQ0FBQyxDQUFDO1lBQzVELE9BQU8sU0FBUyxDQUFDO1FBQ2xCLENBQUM7UUFFRCxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQywwREFBMEQsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUUxRixNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsNkJBQTZCLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDM0UsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsdUJBQXVCLE1BQU0sQ0FBQyxHQUFHLENBQUMsTUFBTSxlQUFlLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQzNGLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNmLE9BQU8sU0FBUyxDQUFDO1FBQ2xCLENBQUM7UUFFRCxNQUFNLE1BQU0sR0FBRyxNQUFNLFFBQVEsQ0FBQywwQkFBMEIsQ0FBQyxNQUFNLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztRQUNwRixJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyw2Q0FBNkMsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUM3RSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDYixPQUFPLFNBQVMsQ0FBQztRQUNsQixDQUFDO1FBRUQsT0FBTyxNQUFNLENBQUM7SUFDZixDQUFDO0lBRUQsS0FBSyxDQUFDLGdDQUFnQyxDQUFDLGVBQThCLEVBQUUsU0FBaUIsRUFBRSxTQUFpQixFQUFFLGlCQUFvQztRQUNoSixJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxxREFBcUQsRUFBRSxlQUFlLENBQUMsQ0FBQztRQUM5RixNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUM7UUFDOUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2IsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsb0NBQW9DLENBQUMsQ0FBQztZQUM1RCxPQUFPLFNBQVMsQ0FBQztRQUNsQixDQUFDO1FBRUQsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsMERBQTBELEVBQUUsTUFBTSxDQUFDLENBQUM7UUFFMUYsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLDZCQUE2QixDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQzNFLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLHVCQUF1QixNQUFNLENBQUMsR0FBRyxDQUFDLE1BQU0sZUFBZSxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUMzRixJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDZixPQUFPLFNBQVMsQ0FBQztRQUNsQixDQUFDO1FBRUQsTUFBTSxNQUFNLEdBQUcsTUFBTSxRQUFRLENBQUMsK0JBQStCLEVBQUUsQ0FBQyxTQUFTLEVBQUUsU0FBUyxFQUFFLGlCQUFpQixDQUFDLENBQUM7UUFDekcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsMERBQTBELEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDMUYsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2IsT0FBTyxTQUFTLENBQUM7UUFDbEIsQ0FBQztRQUVELE9BQU8sTUFBTSxDQUFDO0lBQ2YsQ0FBQztJQUlELHVDQUF1QyxDQUFDLFNBQWdDO1FBQ3ZFLE9BQU8sQ0FBQyxRQUFRLEVBQUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxFQUFFO1lBQ3pDLE1BQU0sZUFBZSxHQUFrRSxTQUFTLE9BQU8sQ0FBQyxDQUFDLElBQUksUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDMUksZUFBZSxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUM7WUFDdEMsT0FBTyxJQUFJLENBQUMscUNBQXFDLENBQUMsS0FBSyxDQUFDLGVBQWUsRUFBRSxTQUFTLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFDbEcsQ0FBQyxDQUFDO0lBQ0gsQ0FBQztJQUVELGlEQUFpRDtJQUNqRCxLQUFLLENBQUMsZ0NBQWdDLENBQUMsZUFBOEIsRUFBRSxLQUF3QixFQUFFLE9BQWU7UUFDL0csTUFBTSxNQUFNLEdBQUcsTUFBTSxJQUFJLENBQUMsc0JBQXNCLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDO1FBRTlFLElBQUksTUFBTSxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQzFCLE1BQU0sSUFBSSxLQUFLLENBQUMsb0NBQW9DLENBQUMsQ0FBQztRQUN2RCxDQUFDO1FBRUQsTUFBTSxJQUFJLENBQUMscUNBQXFDLENBQUMsU0FBUyxDQUFDLEVBQUUsZUFBZSxFQUFFLE1BQU0sRUFBRSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsUUFBMEIsRUFBRSxRQUFRLEVBQUUsRUFBRTtZQUM3SSxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7WUFDdkIsTUFBTSxPQUFPLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ2hDLElBQUksSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLEdBQUcsR0FBRyxPQUFPLEVBQUUsQ0FBQztnQkFDaEMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsc0NBQXNDLEVBQWtFLFFBQVMsQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDL0osQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxLQUFLLENBQUMsdUJBQXVCLEVBQUUsQ0FBQztZQUNuQyxPQUFPLFNBQVMsQ0FBQztRQUNsQixDQUFDO0lBQ0YsQ0FBQztJQU1ELHFCQUFxQjtJQUNyQiw0QkFBNEIsQ0FBQyxNQUFjLEVBQUUsUUFBcUM7UUFDakYsSUFBSSxJQUFJLENBQUMsc0JBQXNCLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7WUFDN0MsTUFBTSxJQUFJLEtBQUssQ0FBQyxxREFBcUQsTUFBTSxFQUFFLENBQUMsQ0FBQztRQUNoRixDQUFDO1FBRUQsSUFBSSxDQUFDLHNCQUFzQixDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDbEQsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLHNCQUFzQixDQUFDLHVCQUF1QixDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ25GLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO1FBQzFDLElBQUksQ0FBQyxNQUFNLENBQUMsNkJBQTZCLENBQUMsTUFBTSxFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBRWxFLE9BQU8sWUFBWSxDQUFDLEdBQUcsRUFBRTtZQUN4QixJQUFJLENBQUMsc0JBQXNCLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQzNDLElBQUksQ0FBQyxNQUFNLENBQUMsK0JBQStCLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDckQsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDO0lBRUQsS0FBSyxDQUFDLG1CQUFtQixDQUFDLEdBQVEsRUFBRSxPQUEwQyxFQUFFLGlCQUFvQztRQUNuSCxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsc0JBQXNCLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUM3RCxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDZixPQUFPLFNBQVMsQ0FBQztRQUNsQixDQUFDO1FBRUQsTUFBTSxNQUFNLEdBQUcsTUFBTSxRQUFRLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxFQUFFLE9BQU8sRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO1FBQ2pHLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNiLE9BQU8sU0FBUyxDQUFDO1FBQ2xCLENBQUM7UUFFRCxPQUFPLE1BQU0sQ0FBQztJQUNmLENBQUM7SUFFRCx3QkFBd0I7SUFDeEIsS0FBSyxDQUFDLG9CQUFvQixDQUFDLEdBQWtCLEVBQUUsWUFBb0IsRUFBRSxpQkFBb0M7UUFDeEcsT0FBTyxJQUFJLENBQUMsbUJBQW1CLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLFlBQVksRUFBRSxFQUFFLGlCQUFpQixDQUFDLENBQUM7SUFDdkYsQ0FBQztJQUVELG9CQUFvQjtJQUVwQixNQUFNLENBQUMsT0FBbUIsRUFBRSxHQUE4QixFQUFFLE9BQThCO1FBQ3pGLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxHQUFHLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDbEUsQ0FBQztJQUVELEtBQUssQ0FBQyxNQUFNLENBQUMsT0FBZSxFQUFFLEdBQThCLEVBQUUsT0FBOEI7UUFDM0YsTUFBTSxJQUFJLEdBQUcsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsR0FBRyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQzlELE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQztJQUNwQixDQUFDO0NBQ0QsQ0FBQTtBQXR3QlksZ0JBQWdCO0lBNkIxQixXQUFBLGtCQUFrQixDQUFBO0lBQ2xCLFdBQUEsdUJBQXVCLENBQUE7SUFDdkIsV0FBQSxzQkFBc0IsQ0FBQTtJQUN0QixXQUFBLFdBQVcsQ0FBQTtJQUNYLFdBQUEsc0JBQXNCLENBQUE7R0FqQ1osZ0JBQWdCLENBc3dCNUI7O0FBRUQsTUFBTSxDQUFDLE1BQU0saUJBQWlCLEdBQUcsZUFBZSxDQUFvQixtQkFBbUIsQ0FBQyxDQUFDO0FBR3pGLFNBQVMseUJBQXlCLENBQUMsT0FBd0Q7SUFDMUYsSUFBSSxPQUEyQixDQUFDO0lBQ2hDLElBQUksYUFBOEIsQ0FBQztJQUNuQyxJQUFJLE9BQU8sRUFBRSxDQUFDO1FBQ2IsSUFBSSxPQUFPLE9BQU8sS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUNqQyxPQUFPLEdBQUcsT0FBTyxDQUFDO1FBQ25CLENBQUM7YUFBTSxDQUFDO1lBQ1AsT0FBTyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUM7WUFDMUIsYUFBYSxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzdDLENBQUM7UUFFRCxPQUFPO1lBQ04sT0FBTztZQUNQLE1BQU0sRUFBRSxhQUFhO1NBQ3JCLENBQUM7SUFDSCxDQUFDO0lBQ0QsT0FBTyxTQUFTLENBQUM7QUFDbEIsQ0FBQztBQU9ELFNBQVMsNEJBQTRCLENBQUMsUUFBMEM7SUFDL0UsT0FBTyxDQUNOLFFBQVEsRUFBRSxHQUFHLENBQUMsQ0FBQyxPQUFPLEVBQTBDLEVBQUU7UUFDakUsSUFBSSxPQUFPLE9BQU8sS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUNqQyxJQUFJLE9BQU8sS0FBSyxFQUFFLEVBQUUsQ0FBQztnQkFDcEIsT0FBTyxTQUFTLENBQUM7WUFDbEIsQ0FBQztZQUNELE9BQU87Z0JBQ04sT0FBTyxFQUFFLE9BQU87Z0JBQ2hCLEdBQUcsRUFBRSxTQUFTO2FBQ3VCLENBQUM7UUFDeEMsQ0FBQzthQUFNLENBQUM7WUFDUCxNQUFNLGFBQWEsR0FBRyx5QkFBeUIsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUN6RCxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7Z0JBQ3BCLE9BQU8sU0FBUyxDQUFDO1lBQ2xCLENBQUM7WUFDRCxPQUFPO2dCQUNOLE9BQU8sRUFBRSxhQUFhLENBQUMsT0FBTztnQkFDOUIsR0FBRyxFQUFFLGFBQWEsQ0FBQyxNQUFNO2FBQ1ksQ0FBQztRQUN4QyxDQUFDO0lBQ0YsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUNSLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFtQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3ZELENBQUMifQ==