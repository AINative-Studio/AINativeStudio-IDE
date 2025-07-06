/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../nls.js';
import { VSBuffer } from '../../../base/common/buffer.js';
import { Emitter } from '../../../base/common/event.js';
import { DisposableStore, toDisposable } from '../../../base/common/lifecycle.js';
import { ResourceMap, ResourceSet } from '../../../base/common/map.js';
import { isFalsyOrWhitespace } from '../../../base/common/strings.js';
import { assertIsDefined } from '../../../base/common/types.js';
import { URI } from '../../../base/common/uri.js';
import * as files from '../../../platform/files/common/files.js';
import { Cache } from './cache.js';
import { MainContext } from './extHost.protocol.js';
import { ApiCommand, ApiCommandArgument, ApiCommandResult } from './extHostCommands.js';
import * as typeConverters from './extHostTypeConverters.js';
import * as extHostTypes from './extHostTypes.js';
import { SerializableObjectWithBuffers } from '../../services/extensions/common/proxyIdentifier.js';
import { ExtHostCell, ExtHostNotebookDocument } from './extHostNotebookDocument.js';
import { ExtHostNotebookEditor } from './extHostNotebookEditor.js';
import { filter } from '../../../base/common/objects.js';
import { Schemas } from '../../../base/common/network.js';
import { CellSearchModel } from '../../contrib/search/common/cellSearchModel.js';
import { genericCellMatchesToTextSearchMatches } from '../../contrib/search/common/searchNotebookHelpers.js';
import { globMatchesResource, RegisteredEditorPriority } from '../../services/editor/common/editorResolverService.js';
export class ExtHostNotebookController {
    static { this._notebookStatusBarItemProviderHandlePool = 0; }
    get activeNotebookEditor() {
        return this._activeNotebookEditor?.apiEditor;
    }
    get visibleNotebookEditors() {
        return this._visibleNotebookEditors.map(editor => editor.apiEditor);
    }
    constructor(mainContext, commands, _textDocumentsAndEditors, _textDocuments, _extHostFileSystem, _extHostSearch, _logService) {
        this._textDocumentsAndEditors = _textDocumentsAndEditors;
        this._textDocuments = _textDocuments;
        this._extHostFileSystem = _extHostFileSystem;
        this._extHostSearch = _extHostSearch;
        this._logService = _logService;
        this._notebookStatusBarItemProviders = new Map();
        this._documents = new ResourceMap();
        this._editors = new Map();
        this._onDidChangeActiveNotebookEditor = new Emitter();
        this.onDidChangeActiveNotebookEditor = this._onDidChangeActiveNotebookEditor.event;
        this._visibleNotebookEditors = [];
        this._onDidOpenNotebookDocument = new Emitter();
        this.onDidOpenNotebookDocument = this._onDidOpenNotebookDocument.event;
        this._onDidCloseNotebookDocument = new Emitter();
        this.onDidCloseNotebookDocument = this._onDidCloseNotebookDocument.event;
        this._onDidChangeVisibleNotebookEditors = new Emitter();
        this.onDidChangeVisibleNotebookEditors = this._onDidChangeVisibleNotebookEditors.event;
        this._statusBarCache = new Cache('NotebookCellStatusBarCache');
        // --- serialize/deserialize
        this._handlePool = 0;
        this._notebookSerializer = new Map();
        this._notebookProxy = mainContext.getProxy(MainContext.MainThreadNotebook);
        this._notebookDocumentsProxy = mainContext.getProxy(MainContext.MainThreadNotebookDocuments);
        this._notebookEditorsProxy = mainContext.getProxy(MainContext.MainThreadNotebookEditors);
        this._commandsConverter = commands.converter;
        commands.registerArgumentProcessor({
            // Serialized INotebookCellActionContext
            processArgument: (arg) => {
                if (arg && arg.$mid === 13 /* MarshalledId.NotebookCellActionContext */) {
                    const notebookUri = arg.notebookEditor?.notebookUri;
                    const cellHandle = arg.cell.handle;
                    const data = this._documents.get(notebookUri);
                    const cell = data?.getCell(cellHandle);
                    if (cell) {
                        return cell.apiCell;
                    }
                }
                if (arg && arg.$mid === 14 /* MarshalledId.NotebookActionContext */) {
                    const notebookUri = arg.uri;
                    const data = this._documents.get(notebookUri);
                    if (data) {
                        return data.apiNotebook;
                    }
                }
                return arg;
            }
        });
        ExtHostNotebookController._registerApiCommands(commands);
    }
    getEditorById(editorId) {
        const editor = this._editors.get(editorId);
        if (!editor) {
            throw new Error(`unknown text editor: ${editorId}. known editors: ${[...this._editors.keys()]} `);
        }
        return editor;
    }
    getIdByEditor(editor) {
        for (const [id, candidate] of this._editors) {
            if (candidate.apiEditor === editor) {
                return id;
            }
        }
        return undefined;
    }
    get notebookDocuments() {
        return [...this._documents.values()];
    }
    getNotebookDocument(uri, relaxed) {
        const result = this._documents.get(uri);
        if (!result && !relaxed) {
            throw new Error(`NO notebook document for '${uri}'`);
        }
        return result;
    }
    static _convertNotebookRegistrationData(extension, registration) {
        if (!registration) {
            return;
        }
        const viewOptionsFilenamePattern = registration.filenamePattern
            .map(pattern => typeConverters.NotebookExclusiveDocumentPattern.from(pattern))
            .filter(pattern => pattern !== undefined);
        if (registration.filenamePattern && !viewOptionsFilenamePattern) {
            console.warn(`Notebook content provider view options file name pattern is invalid ${registration.filenamePattern}`);
            return undefined;
        }
        return {
            extension: extension.identifier,
            providerDisplayName: extension.displayName || extension.name,
            displayName: registration.displayName,
            filenamePattern: viewOptionsFilenamePattern,
            priority: registration.exclusive ? RegisteredEditorPriority.exclusive : undefined
        };
    }
    registerNotebookCellStatusBarItemProvider(extension, notebookType, provider) {
        const handle = ExtHostNotebookController._notebookStatusBarItemProviderHandlePool++;
        const eventHandle = typeof provider.onDidChangeCellStatusBarItems === 'function' ? ExtHostNotebookController._notebookStatusBarItemProviderHandlePool++ : undefined;
        this._notebookStatusBarItemProviders.set(handle, provider);
        this._notebookProxy.$registerNotebookCellStatusBarItemProvider(handle, eventHandle, notebookType);
        let subscription;
        if (eventHandle !== undefined) {
            subscription = provider.onDidChangeCellStatusBarItems(_ => this._notebookProxy.$emitCellStatusBarEvent(eventHandle));
        }
        return new extHostTypes.Disposable(() => {
            this._notebookStatusBarItemProviders.delete(handle);
            this._notebookProxy.$unregisterNotebookCellStatusBarItemProvider(handle, eventHandle);
            subscription?.dispose();
        });
    }
    async createNotebookDocument(options) {
        const canonicalUri = await this._notebookDocumentsProxy.$tryCreateNotebook({
            viewType: options.viewType,
            content: options.content && typeConverters.NotebookData.from(options.content)
        });
        return URI.revive(canonicalUri);
    }
    async openNotebookDocument(uri) {
        const cached = this._documents.get(uri);
        if (cached) {
            return cached.apiNotebook;
        }
        const canonicalUri = await this._notebookDocumentsProxy.$tryOpenNotebook(uri);
        const document = this._documents.get(URI.revive(canonicalUri));
        return assertIsDefined(document?.apiNotebook);
    }
    async showNotebookDocument(notebook, options) {
        let resolvedOptions;
        if (typeof options === 'object') {
            resolvedOptions = {
                position: typeConverters.ViewColumn.from(options.viewColumn),
                preserveFocus: options.preserveFocus,
                selections: options.selections && options.selections.map(typeConverters.NotebookRange.from),
                pinned: typeof options.preview === 'boolean' ? !options.preview : undefined,
                label: typeof options.asRepl === 'string' ?
                    options.asRepl :
                    typeof options.asRepl === 'object' ?
                        options.asRepl.label :
                        undefined,
            };
        }
        else {
            resolvedOptions = {
                preserveFocus: false,
                pinned: true
            };
        }
        const viewType = !!options?.asRepl ? 'repl' : notebook.notebookType;
        const editorId = await this._notebookEditorsProxy.$tryShowNotebookDocument(notebook.uri, viewType, resolvedOptions);
        const editor = editorId && this._editors.get(editorId)?.apiEditor;
        if (editor) {
            return editor;
        }
        if (editorId) {
            throw new Error(`Could NOT open editor for "${notebook.uri.toString()}" because another editor opened in the meantime.`);
        }
        else {
            throw new Error(`Could NOT open editor for "${notebook.uri.toString()}".`);
        }
    }
    async $provideNotebookCellStatusBarItems(handle, uri, index, token) {
        const provider = this._notebookStatusBarItemProviders.get(handle);
        const revivedUri = URI.revive(uri);
        const document = this._documents.get(revivedUri);
        if (!document || !provider) {
            return;
        }
        const cell = document.getCellFromIndex(index);
        if (!cell) {
            return;
        }
        const result = await provider.provideCellStatusBarItems(cell.apiCell, token);
        if (!result) {
            return undefined;
        }
        const disposables = new DisposableStore();
        const cacheId = this._statusBarCache.add([disposables]);
        const resultArr = Array.isArray(result) ? result : [result];
        const items = resultArr.map(item => typeConverters.NotebookStatusBarItem.from(item, this._commandsConverter, disposables));
        return {
            cacheId,
            items
        };
    }
    $releaseNotebookCellStatusBarItems(cacheId) {
        this._statusBarCache.delete(cacheId);
    }
    registerNotebookSerializer(extension, viewType, serializer, options, registration) {
        if (isFalsyOrWhitespace(viewType)) {
            throw new Error(`viewType cannot be empty or just whitespace`);
        }
        const handle = this._handlePool++;
        this._notebookSerializer.set(handle, { viewType, serializer, options });
        this._notebookProxy.$registerNotebookSerializer(handle, { id: extension.identifier, location: extension.extensionLocation }, viewType, typeConverters.NotebookDocumentContentOptions.from(options), ExtHostNotebookController._convertNotebookRegistrationData(extension, registration));
        return toDisposable(() => {
            this._notebookProxy.$unregisterNotebookSerializer(handle);
        });
    }
    async $dataToNotebook(handle, bytes, token) {
        const serializer = this._notebookSerializer.get(handle);
        if (!serializer) {
            throw new Error('NO serializer found');
        }
        const data = await serializer.serializer.deserializeNotebook(bytes.buffer, token);
        return new SerializableObjectWithBuffers(typeConverters.NotebookData.from(data));
    }
    async $notebookToData(handle, data, token) {
        const serializer = this._notebookSerializer.get(handle);
        if (!serializer) {
            throw new Error('NO serializer found');
        }
        const bytes = await serializer.serializer.serializeNotebook(typeConverters.NotebookData.to(data.value), token);
        return VSBuffer.wrap(bytes);
    }
    async $saveNotebook(handle, uriComponents, versionId, options, token) {
        const uri = URI.revive(uriComponents);
        const serializer = this._notebookSerializer.get(handle);
        this.trace(`enter saveNotebook(versionId: ${versionId}, ${uri.toString()})`);
        if (!serializer) {
            throw new Error('NO serializer found');
        }
        const document = this._documents.get(uri);
        if (!document) {
            throw new Error('Document NOT found');
        }
        if (document.versionId !== versionId) {
            throw new Error('Document version mismatch');
        }
        if (!this._extHostFileSystem.value.isWritableFileSystem(uri.scheme)) {
            throw new files.FileOperationError(localize('err.readonly', "Unable to modify read-only file '{0}'", this._resourceForError(uri)), 6 /* files.FileOperationResult.FILE_PERMISSION_DENIED */);
        }
        const data = {
            metadata: filter(document.apiNotebook.metadata, key => !(serializer.options?.transientDocumentMetadata ?? {})[key]),
            cells: [],
        };
        // this data must be retrieved before any async calls to ensure the data is for the correct version
        for (const cell of document.apiNotebook.getCells()) {
            const cellData = new extHostTypes.NotebookCellData(cell.kind, cell.document.getText(), cell.document.languageId, cell.mime, !(serializer.options?.transientOutputs) ? [...cell.outputs] : [], cell.metadata, cell.executionSummary);
            cellData.metadata = filter(cell.metadata, key => !(serializer.options?.transientCellMetadata ?? {})[key]);
            data.cells.push(cellData);
        }
        // validate write
        await this._validateWriteFile(uri, options);
        if (token.isCancellationRequested) {
            throw new Error('canceled');
        }
        const bytes = await serializer.serializer.serializeNotebook(data, token);
        if (token.isCancellationRequested) {
            throw new Error('canceled');
        }
        // Don't accept any cancellation beyond this point, we need to report the result of the file write
        this.trace(`serialized versionId: ${versionId} ${uri.toString()}`);
        await this._extHostFileSystem.value.writeFile(uri, bytes);
        this.trace(`Finished write versionId: ${versionId} ${uri.toString()}`);
        const providerExtUri = this._extHostFileSystem.getFileSystemProviderExtUri(uri.scheme);
        const stat = await this._extHostFileSystem.value.stat(uri);
        const fileStats = {
            name: providerExtUri.basename(uri),
            isFile: (stat.type & files.FileType.File) !== 0,
            isDirectory: (stat.type & files.FileType.Directory) !== 0,
            isSymbolicLink: (stat.type & files.FileType.SymbolicLink) !== 0,
            mtime: stat.mtime,
            ctime: stat.ctime,
            size: stat.size,
            readonly: Boolean((stat.permissions ?? 0) & files.FilePermission.Readonly) || !this._extHostFileSystem.value.isWritableFileSystem(uri.scheme),
            locked: Boolean((stat.permissions ?? 0) & files.FilePermission.Locked),
            etag: files.etag({ mtime: stat.mtime, size: stat.size }),
            children: undefined
        };
        this.trace(`exit saveNotebook(versionId: ${versionId}, ${uri.toString()})`);
        return fileStats;
    }
    /**
     * Search for query in all notebooks that can be deserialized by the serializer fetched by `handle`.
     *
     * @param handle used to get notebook serializer
     * @param textQuery the text query to search using
     * @param viewTypeFileTargets the globs (and associated ranks) that are targetting for opening this type of notebook
     * @param otherViewTypeFileTargets ranked globs for other editors that we should consider when deciding whether it will open as this notebook
     * @param token cancellation token
     * @returns `IRawClosedNotebookFileMatch` for every file. Files without matches will just have a `IRawClosedNotebookFileMatch`
     * 	with no `cellResults`. This allows the caller to know what was searched in already, even if it did not yield results.
     */
    async $searchInNotebooks(handle, textQuery, viewTypeFileTargets, otherViewTypeFileTargets, token) {
        const serializer = this._notebookSerializer.get(handle)?.serializer;
        if (!serializer) {
            return {
                limitHit: false,
                results: []
            };
        }
        const finalMatchedTargets = new ResourceSet();
        const runFileQueries = async (includes, token, textQuery) => {
            await Promise.all(includes.map(async (include) => await Promise.all(include.filenamePatterns.map(filePattern => {
                const query = {
                    _reason: textQuery._reason,
                    folderQueries: textQuery.folderQueries,
                    includePattern: textQuery.includePattern,
                    excludePattern: textQuery.excludePattern,
                    maxResults: textQuery.maxResults,
                    type: 1 /* QueryType.File */,
                    filePattern
                };
                // use priority info to exclude info from other globs
                return this._extHostSearch.doInternalFileSearchWithCustomCallback(query, token, (data) => {
                    data.forEach(uri => {
                        if (finalMatchedTargets.has(uri)) {
                            return;
                        }
                        const hasOtherMatches = otherViewTypeFileTargets.some(target => {
                            // use the same strategy that the editor service uses to open editors
                            // https://github.com/microsoft/vscode/blob/ac1631528e67637da65ec994c6dc35d73f6e33cc/src/vs/workbench/services/editor/browser/editorResolverService.ts#L359-L366
                            if (include.isFromSettings && !target.isFromSettings) {
                                // if the include is from the settings and target isn't, even if it matches, it's still overridden.
                                return false;
                            }
                            else {
                                // longer filePatterns are considered more specifc, so they always have precedence the shorter patterns
                                return target.filenamePatterns.some(targetFilePattern => globMatchesResource(targetFilePattern, uri));
                            }
                        });
                        if (hasOtherMatches) {
                            return;
                        }
                        finalMatchedTargets.add(uri);
                    });
                }).catch(err => {
                    // temporary fix for https://github.com/microsoft/vscode/issues/205044: don't show notebook results for remotehub repos.
                    if (err.code === 'ENOENT') {
                        console.warn(`Could not find notebook search results, ignoring notebook results.`);
                        return {
                            limitHit: false,
                            messages: [],
                        };
                    }
                    else {
                        throw err;
                    }
                });
            }))));
            return;
        };
        await runFileQueries(viewTypeFileTargets, token, textQuery);
        const results = new ResourceMap();
        let limitHit = false;
        const promises = Array.from(finalMatchedTargets).map(async (uri) => {
            const cellMatches = [];
            try {
                if (token.isCancellationRequested) {
                    return;
                }
                if (textQuery.maxResults && [...results.values()].reduce((acc, value) => acc + value.cellResults.length, 0) > textQuery.maxResults) {
                    limitHit = true;
                    return;
                }
                const simpleCells = [];
                const notebook = this._documents.get(uri);
                if (notebook) {
                    const cells = notebook.apiNotebook.getCells();
                    cells.forEach(e => simpleCells.push({
                        input: e.document.getText(),
                        outputs: e.outputs.flatMap(value => value.items.map(output => output.data.toString()))
                    }));
                }
                else {
                    const fileContent = await this._extHostFileSystem.value.readFile(uri);
                    const bytes = VSBuffer.fromString(fileContent.toString());
                    const notebook = await serializer.deserializeNotebook(bytes.buffer, token);
                    if (token.isCancellationRequested) {
                        return;
                    }
                    const data = typeConverters.NotebookData.from(notebook);
                    data.cells.forEach(cell => simpleCells.push({
                        input: cell.source,
                        outputs: cell.outputs.flatMap(value => value.items.map(output => output.valueBytes.toString()))
                    }));
                }
                if (token.isCancellationRequested) {
                    return;
                }
                simpleCells.forEach((cell, index) => {
                    const target = textQuery.contentPattern.pattern;
                    const cellModel = new CellSearchModel(cell.input, undefined, cell.outputs);
                    const inputMatches = cellModel.findInInputs(target);
                    const outputMatches = cellModel.findInOutputs(target);
                    const webviewResults = outputMatches
                        .flatMap(outputMatch => genericCellMatchesToTextSearchMatches(outputMatch.matches, outputMatch.textBuffer))
                        .map((textMatch, index) => {
                        textMatch.webviewIndex = index;
                        return textMatch;
                    });
                    if (inputMatches.length > 0 || outputMatches.length > 0) {
                        const cellMatch = {
                            index: index,
                            contentResults: genericCellMatchesToTextSearchMatches(inputMatches, cellModel.inputTextBuffer),
                            webviewResults
                        };
                        cellMatches.push(cellMatch);
                    }
                });
                const fileMatch = {
                    resource: uri, cellResults: cellMatches
                };
                results.set(uri, fileMatch);
                return;
            }
            catch (e) {
                return;
            }
        });
        await Promise.all(promises);
        return {
            limitHit,
            results: [...results.values()]
        };
    }
    async _validateWriteFile(uri, options) {
        const stat = await this._extHostFileSystem.value.stat(uri);
        // Dirty write prevention
        if (typeof options?.mtime === 'number' && typeof options.etag === 'string' && options.etag !== files.ETAG_DISABLED &&
            typeof stat.mtime === 'number' && typeof stat.size === 'number' &&
            options.mtime < stat.mtime && options.etag !== files.etag({ mtime: options.mtime /* not using stat.mtime for a reason, see above */, size: stat.size })) {
            throw new files.FileOperationError(localize('fileModifiedError', "File Modified Since"), 3 /* files.FileOperationResult.FILE_MODIFIED_SINCE */, options);
        }
        return;
    }
    _resourceForError(uri) {
        return uri.scheme === Schemas.file ? uri.fsPath : uri.toString();
    }
    // --- open, save, saveAs, backup
    _createExtHostEditor(document, editorId, data) {
        if (this._editors.has(editorId)) {
            throw new Error(`editor with id ALREADY EXSIST: ${editorId}`);
        }
        const editor = new ExtHostNotebookEditor(editorId, this._notebookEditorsProxy, document, data.visibleRanges.map(typeConverters.NotebookRange.to), data.selections.map(typeConverters.NotebookRange.to), typeof data.viewColumn === 'number' ? typeConverters.ViewColumn.to(data.viewColumn) : undefined, data.viewType);
        this._editors.set(editorId, editor);
    }
    $acceptDocumentAndEditorsDelta(delta) {
        if (delta.value.removedDocuments) {
            for (const uri of delta.value.removedDocuments) {
                const revivedUri = URI.revive(uri);
                const document = this._documents.get(revivedUri);
                if (document) {
                    document.dispose();
                    this._documents.delete(revivedUri);
                    this._textDocumentsAndEditors.$acceptDocumentsAndEditorsDelta({ removedDocuments: document.apiNotebook.getCells().map(cell => cell.document.uri) });
                    this._onDidCloseNotebookDocument.fire(document.apiNotebook);
                }
                for (const editor of this._editors.values()) {
                    if (editor.notebookData.uri.toString() === revivedUri.toString()) {
                        this._editors.delete(editor.id);
                    }
                }
            }
        }
        if (delta.value.addedDocuments) {
            const addedCellDocuments = [];
            for (const modelData of delta.value.addedDocuments) {
                const uri = URI.revive(modelData.uri);
                if (this._documents.has(uri)) {
                    throw new Error(`adding EXISTING notebook ${uri} `);
                }
                const document = new ExtHostNotebookDocument(this._notebookDocumentsProxy, this._textDocumentsAndEditors, this._textDocuments, uri, modelData);
                // add cell document as vscode.TextDocument
                addedCellDocuments.push(...modelData.cells.map(cell => ExtHostCell.asModelAddData(cell)));
                this._documents.get(uri)?.dispose();
                this._documents.set(uri, document);
                this._textDocumentsAndEditors.$acceptDocumentsAndEditorsDelta({ addedDocuments: addedCellDocuments });
                this._onDidOpenNotebookDocument.fire(document.apiNotebook);
            }
        }
        if (delta.value.addedEditors) {
            for (const editorModelData of delta.value.addedEditors) {
                if (this._editors.has(editorModelData.id)) {
                    return;
                }
                const revivedUri = URI.revive(editorModelData.documentUri);
                const document = this._documents.get(revivedUri);
                if (document) {
                    this._createExtHostEditor(document, editorModelData.id, editorModelData);
                }
            }
        }
        const removedEditors = [];
        if (delta.value.removedEditors) {
            for (const editorid of delta.value.removedEditors) {
                const editor = this._editors.get(editorid);
                if (editor) {
                    this._editors.delete(editorid);
                    if (this._activeNotebookEditor?.id === editor.id) {
                        this._activeNotebookEditor = undefined;
                    }
                    removedEditors.push(editor);
                }
            }
        }
        if (delta.value.visibleEditors) {
            this._visibleNotebookEditors = delta.value.visibleEditors.map(id => this._editors.get(id)).filter(editor => !!editor);
            const visibleEditorsSet = new Set();
            this._visibleNotebookEditors.forEach(editor => visibleEditorsSet.add(editor.id));
            for (const editor of this._editors.values()) {
                const newValue = visibleEditorsSet.has(editor.id);
                editor._acceptVisibility(newValue);
            }
            this._visibleNotebookEditors = [...this._editors.values()].map(e => e).filter(e => e.visible);
            this._onDidChangeVisibleNotebookEditors.fire(this.visibleNotebookEditors);
        }
        if (delta.value.newActiveEditor === null) {
            // clear active notebook as current active editor is non-notebook editor
            this._activeNotebookEditor = undefined;
        }
        else if (delta.value.newActiveEditor) {
            const activeEditor = this._editors.get(delta.value.newActiveEditor);
            if (!activeEditor) {
                console.error(`FAILED to find active notebook editor ${delta.value.newActiveEditor}`);
            }
            this._activeNotebookEditor = this._editors.get(delta.value.newActiveEditor);
        }
        if (delta.value.newActiveEditor !== undefined) {
            this._onDidChangeActiveNotebookEditor.fire(this._activeNotebookEditor?.apiEditor);
        }
    }
    static _registerApiCommands(extHostCommands) {
        const notebookTypeArg = ApiCommandArgument.String.with('notebookType', 'A notebook type');
        const commandDataToNotebook = new ApiCommand('vscode.executeDataToNotebook', '_executeDataToNotebook', 'Invoke notebook serializer', [notebookTypeArg, new ApiCommandArgument('data', 'Bytes to convert to data', v => v instanceof Uint8Array, v => VSBuffer.wrap(v))], new ApiCommandResult('Notebook Data', data => typeConverters.NotebookData.to(data.value)));
        const commandNotebookToData = new ApiCommand('vscode.executeNotebookToData', '_executeNotebookToData', 'Invoke notebook serializer', [notebookTypeArg, new ApiCommandArgument('NotebookData', 'Notebook data to convert to bytes', v => true, v => new SerializableObjectWithBuffers(typeConverters.NotebookData.from(v)))], new ApiCommandResult('Bytes', dto => dto.buffer));
        extHostCommands.registerApiCommand(commandDataToNotebook);
        extHostCommands.registerApiCommand(commandNotebookToData);
    }
    trace(msg) {
        this._logService.trace(`[Extension Host Notebook] ${msg}`);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdE5vdGVib29rLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9jb21tb24vZXh0SG9zdE5vdGVib29rLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUMzQyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFFMUQsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLCtCQUErQixDQUFDO0FBRS9ELE9BQU8sRUFBRSxlQUFlLEVBQWUsWUFBWSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDL0YsT0FBTyxFQUFFLFdBQVcsRUFBRSxXQUFXLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUV2RSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUN0RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDaEUsT0FBTyxFQUFFLEdBQUcsRUFBaUIsTUFBTSw2QkFBNkIsQ0FBQztBQUVqRSxPQUFPLEtBQUssS0FBSyxNQUFNLHlDQUF5QyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxZQUFZLENBQUM7QUFDbkMsT0FBTyxFQUFzTixXQUFXLEVBQThHLE1BQU0sdUJBQXVCLENBQUM7QUFDcFgsT0FBTyxFQUFFLFVBQVUsRUFBRSxrQkFBa0IsRUFBRSxnQkFBZ0IsRUFBc0MsTUFBTSxzQkFBc0IsQ0FBQztBQUc1SCxPQUFPLEtBQUssY0FBYyxNQUFNLDRCQUE0QixDQUFDO0FBQzdELE9BQU8sS0FBSyxZQUFZLE1BQU0sbUJBQW1CLENBQUM7QUFFbEQsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0scURBQXFELENBQUM7QUFFcEcs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