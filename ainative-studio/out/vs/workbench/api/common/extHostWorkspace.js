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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFdvcmtzcGFjZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL2V4dEhvc3RXb3Jrc3BhY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLEtBQUssSUFBSSxVQUFVLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDcEYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQzdFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxZQUFZLEVBQUUsT0FBTyxFQUFTLE1BQU0sK0JBQStCLENBQUM7QUFDN0UsT0FBTyxFQUFFLGVBQWUsRUFBRSxZQUFZLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNsRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUM5RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDMUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQzFELE9BQU8sRUFBRSxRQUFRLEVBQUUsbUJBQW1CLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxZQUFZLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNqSCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDMUQsT0FBTyxFQUFFLEdBQUcsRUFBaUIsTUFBTSw2QkFBNkIsQ0FBQztBQUNqRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFHM0MsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxX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