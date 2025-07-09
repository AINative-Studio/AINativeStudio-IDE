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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdE5vdGVib29rLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL2V4dEhvc3ROb3RlYm9vay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDM0MsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBRTFELE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSwrQkFBK0IsQ0FBQztBQUUvRCxPQUFPLEVBQUUsZUFBZSxFQUFlLFlBQVksRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQy9GLE9BQU8sRUFBRSxXQUFXLEVBQUUsV0FBVyxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFFdkUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDdEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ2hFLE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sNkJBQTZCLENBQUM7QUFFakUsT0FBTyxLQUFLLEtBQUssTUFBTSx5Q0FBeUMsQ0FBQztBQUNqRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sWUFBWSxDQUFDO0FBQ25DLE9BQU8sRUFBc04sV0FBVyxFQUE4RyxNQUFNLHVCQUF1QixDQUFDO0FBQ3BYLE9BQU8sRUFBRSxVQUFVLEVBQUUsa0JBQWtCLEVBQUUsZ0JBQWdCLEVBQXNDLE1BQU0sc0JBQXNCLENBQUM7QUFHNUgsT0FBTyxLQUFLLGNBQWMsTUFBTSw0QkFBNEIsQ0FBQztBQUM3RCxPQUFPLEtBQUssWUFBWSxNQUFNLG1CQUFtQixDQUFDO0FBRWxELE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBRXBHLE9BQU8sRUFBRSxXQUFXLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUNwRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUVuRSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDekQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBRzFELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNqRixPQUFPLEVBQXFGLHFDQUFxQyxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFFaE0sT0FBTyxFQUFFLG1CQUFtQixFQUFFLHdCQUF3QixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFHdEgsTUFBTSxPQUFPLHlCQUF5QjthQUN0Qiw2Q0FBd0MsR0FBVyxDQUFDLEFBQVosQ0FBYTtJQWVwRSxJQUFJLG9CQUFvQjtRQUN2QixPQUFPLElBQUksQ0FBQyxxQkFBcUIsRUFBRSxTQUFTLENBQUM7SUFDOUMsQ0FBQztJQUVELElBQUksc0JBQXNCO1FBQ3pCLE9BQU8sSUFBSSxDQUFDLHVCQUF1QixDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUNyRSxDQUFDO0lBWUQsWUFDQyxXQUF5QixFQUN6QixRQUF5QixFQUNqQix3QkFBb0QsRUFDcEQsY0FBZ0MsRUFDaEMsa0JBQThDLEVBQzlDLGNBQThCLEVBQzlCLFdBQXdCO1FBSnhCLDZCQUF3QixHQUF4Qix3QkFBd0IsQ0FBNEI7UUFDcEQsbUJBQWMsR0FBZCxjQUFjLENBQWtCO1FBQ2hDLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBNEI7UUFDOUMsbUJBQWMsR0FBZCxjQUFjLENBQWdCO1FBQzlCLGdCQUFXLEdBQVgsV0FBVyxDQUFhO1FBbENoQixvQ0FBK0IsR0FBRyxJQUFJLEdBQUcsRUFBb0QsQ0FBQztRQUM5RixlQUFVLEdBQUcsSUFBSSxXQUFXLEVBQTJCLENBQUM7UUFDeEQsYUFBUSxHQUFHLElBQUksR0FBRyxFQUFpQyxDQUFDO1FBR3BELHFDQUFnQyxHQUFHLElBQUksT0FBTyxFQUFxQyxDQUFDO1FBQzVGLG9DQUErQixHQUFHLElBQUksQ0FBQyxnQ0FBZ0MsQ0FBQyxLQUFLLENBQUM7UUFNL0UsNEJBQXVCLEdBQTRCLEVBQUUsQ0FBQztRQUt0RCwrQkFBMEIsR0FBRyxJQUFJLE9BQU8sRUFBMkIsQ0FBQztRQUM1RSw4QkFBeUIsR0FBbUMsSUFBSSxDQUFDLDBCQUEwQixDQUFDLEtBQUssQ0FBQztRQUMxRixnQ0FBMkIsR0FBRyxJQUFJLE9BQU8sRUFBMkIsQ0FBQztRQUM3RSwrQkFBMEIsR0FBbUMsSUFBSSxDQUFDLDJCQUEyQixDQUFDLEtBQUssQ0FBQztRQUU1Rix1Q0FBa0MsR0FBRyxJQUFJLE9BQU8sRUFBMkIsQ0FBQztRQUNwRixzQ0FBaUMsR0FBRyxJQUFJLENBQUMsa0NBQWtDLENBQUMsS0FBSyxDQUFDO1FBRTFFLG9CQUFlLEdBQUcsSUFBSSxLQUFLLENBQWMsNEJBQTRCLENBQUMsQ0FBQztRQXdNL0UsNEJBQTRCO1FBRXBCLGdCQUFXLEdBQUcsQ0FBQyxDQUFDO1FBQ1Asd0JBQW1CLEdBQUcsSUFBSSxHQUFHLEVBQW1JLENBQUM7UUFoTWpMLElBQUksQ0FBQyxjQUFjLEdBQUcsV0FBVyxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsa0JBQWtCLENBQUMsQ0FBQztRQUMzRSxJQUFJLENBQUMsdUJBQXVCLEdBQUcsV0FBVyxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsMkJBQTJCLENBQUMsQ0FBQztRQUM3RixJQUFJLENBQUMscUJBQXFCLEdBQUcsV0FBVyxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMseUJBQXlCLENBQUMsQ0FBQztRQUN6RixJQUFJLENBQUMsa0JBQWtCLEdBQUcsUUFBUSxDQUFDLFNBQVMsQ0FBQztRQUU3QyxRQUFRLENBQUMseUJBQXlCLENBQUM7WUFDbEMsd0NBQXdDO1lBQ3hDLGVBQWUsRUFBRSxDQUFDLEdBQUcsRUFBRSxFQUFFO2dCQUN4QixJQUFJLEdBQUcsSUFBSSxHQUFHLENBQUMsSUFBSSxvREFBMkMsRUFBRSxDQUFDO29CQUNoRSxNQUFNLFdBQVcsR0FBRyxHQUFHLENBQUMsY0FBYyxFQUFFLFdBQVcsQ0FBQztvQkFDcEQsTUFBTSxVQUFVLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUM7b0JBRW5DLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDO29CQUM5QyxNQUFNLElBQUksR0FBRyxJQUFJLEVBQUUsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO29CQUN2QyxJQUFJLElBQUksRUFBRSxDQUFDO3dCQUNWLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQztvQkFDckIsQ0FBQztnQkFDRixDQUFDO2dCQUNELElBQUksR0FBRyxJQUFJLEdBQUcsQ0FBQyxJQUFJLGdEQUF1QyxFQUFFLENBQUM7b0JBQzVELE1BQU0sV0FBVyxHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUM7b0JBQzVCLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDO29CQUM5QyxJQUFJLElBQUksRUFBRSxDQUFDO3dCQUNWLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQztvQkFDekIsQ0FBQztnQkFDRixDQUFDO2dCQUNELE9BQU8sR0FBRyxDQUFDO1lBQ1osQ0FBQztTQUNELENBQUMsQ0FBQztRQUVILHlCQUF5QixDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQzFELENBQUM7SUFFRCxhQUFhLENBQUMsUUFBZ0I7UUFDN0IsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDM0MsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2IsTUFBTSxJQUFJLEtBQUssQ0FBQyx3QkFBd0IsUUFBUSxvQkFBb0IsQ0FBQyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDbkcsQ0FBQztRQUNELE9BQU8sTUFBTSxDQUFDO0lBQ2YsQ0FBQztJQUVELGFBQWEsQ0FBQyxNQUE2QjtRQUMxQyxLQUFLLE1BQU0sQ0FBQyxFQUFFLEVBQUUsU0FBUyxDQUFDLElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQzdDLElBQUksU0FBUyxDQUFDLFNBQVMsS0FBSyxNQUFNLEVBQUUsQ0FBQztnQkFDcEMsT0FBTyxFQUFFLENBQUM7WUFDWCxDQUFDO1FBQ0YsQ0FBQztRQUNELE9BQU8sU0FBUyxDQUFDO0lBQ2xCLENBQUM7SUFFRCxJQUFJLGlCQUFpQjtRQUNwQixPQUFPLENBQUMsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7SUFDdEMsQ0FBQztJQUlELG1CQUFtQixDQUFDLEdBQVEsRUFBRSxPQUFjO1FBQzNDLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3hDLElBQUksQ0FBQyxNQUFNLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUN6QixNQUFNLElBQUksS0FBSyxDQUFDLDZCQUE2QixHQUFHLEdBQUcsQ0FBQyxDQUFDO1FBQ3RELENBQUM7UUFDRCxPQUFPLE1BQU0sQ0FBQztJQUNmLENBQUM7SUFFTyxNQUFNLENBQUMsZ0NBQWdDLENBQUMsU0FBZ0MsRUFBRSxZQUF5RDtRQUMxSSxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDbkIsT0FBTztRQUNSLENBQUM7UUFDRCxNQUFNLDBCQUEwQixHQUFHLFlBQVksQ0FBQyxlQUFlO2FBQzdELEdBQUcsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLGNBQWMsQ0FBQyxnQ0FBZ0MsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7YUFDN0UsTUFBTSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsT0FBTyxLQUFLLFNBQVMsQ0FBcUUsQ0FBQztRQUMvRyxJQUFJLFlBQVksQ0FBQyxlQUFlLElBQUksQ0FBQywwQkFBMEIsRUFBRSxDQUFDO1lBQ2pFLE9BQU8sQ0FBQyxJQUFJLENBQUMsdUVBQXVFLFlBQVksQ0FBQyxlQUFlLEVBQUUsQ0FBQyxDQUFDO1lBQ3BILE9BQU8sU0FBUyxDQUFDO1FBQ2xCLENBQUM7UUFDRCxPQUFPO1lBQ04sU0FBUyxFQUFFLFNBQVMsQ0FBQyxVQUFVO1lBQy9CLG1CQUFtQixFQUFFLFNBQVMsQ0FBQyxXQUFXLElBQUksU0FBUyxDQUFDLElBQUk7WUFDNUQsV0FBVyxFQUFFLFlBQVksQ0FBQyxXQUFXO1lBQ3JDLGVBQWUsRUFBRSwwQkFBMEI7WUFDM0MsUUFBUSxFQUFFLFlBQVksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLHdCQUF3QixDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsU0FBUztTQUNqRixDQUFDO0lBQ0gsQ0FBQztJQUVELHlDQUF5QyxDQUFDLFNBQWdDLEVBQUUsWUFBb0IsRUFBRSxRQUFrRDtRQUVuSixNQUFNLE1BQU0sR0FBRyx5QkFBeUIsQ0FBQyx3Q0FBd0MsRUFBRSxDQUFDO1FBQ3BGLE1BQU0sV0FBVyxHQUFHLE9BQU8sUUFBUSxDQUFDLDZCQUE2QixLQUFLLFVBQVUsQ0FBQyxDQUFDLENBQUMseUJBQXlCLENBQUMsd0NBQXdDLEVBQUUsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDO1FBRXBLLElBQUksQ0FBQywrQkFBK0IsQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQzNELElBQUksQ0FBQyxjQUFjLENBQUMsMENBQTBDLENBQUMsTUFBTSxFQUFFLFdBQVcsRUFBRSxZQUFZLENBQUMsQ0FBQztRQUVsRyxJQUFJLFlBQTJDLENBQUM7UUFDaEQsSUFBSSxXQUFXLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDL0IsWUFBWSxHQUFHLFFBQVEsQ0FBQyw2QkFBOEIsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsdUJBQXVCLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQztRQUN2SCxDQUFDO1FBRUQsT0FBTyxJQUFJLFlBQVksQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFFO1lBQ3ZDLElBQUksQ0FBQywrQkFBK0IsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDcEQsSUFBSSxDQUFDLGNBQWMsQ0FBQyw0Q0FBNEMsQ0FBQyxNQUFNLEVBQUUsV0FBVyxDQUFDLENBQUM7WUFDdEYsWUFBWSxFQUFFLE9BQU8sRUFBRSxDQUFDO1FBQ3pCLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVELEtBQUssQ0FBQyxzQkFBc0IsQ0FBQyxPQUE0RDtRQUN4RixNQUFNLFlBQVksR0FBRyxNQUFNLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxrQkFBa0IsQ0FBQztZQUMxRSxRQUFRLEVBQUUsT0FBTyxDQUFDLFFBQVE7WUFDMUIsT0FBTyxFQUFFLE9BQU8sQ0FBQyxPQUFPLElBQUksY0FBYyxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQztTQUM3RSxDQUFDLENBQUM7UUFDSCxPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUM7SUFDakMsQ0FBQztJQUVELEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxHQUFRO1FBQ2xDLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3hDLElBQUksTUFBTSxFQUFFLENBQUM7WUFDWixPQUFPLE1BQU0sQ0FBQyxXQUFXLENBQUM7UUFDM0IsQ0FBQztRQUNELE1BQU0sWUFBWSxHQUFHLE1BQU0sSUFBSSxDQUFDLHVCQUF1QixDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQzlFLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQztRQUMvRCxPQUFPLGVBQWUsQ0FBQyxRQUFRLEVBQUUsV0FBVyxDQUFDLENBQUM7SUFDL0MsQ0FBQztJQUVELEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxRQUFpQyxFQUFFLE9BQTRDO1FBQ3pHLElBQUksZUFBNkMsQ0FBQztRQUNsRCxJQUFJLE9BQU8sT0FBTyxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQ2pDLGVBQWUsR0FBRztnQkFDakIsUUFBUSxFQUFFLGNBQWMsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUM7Z0JBQzVELGFBQWEsRUFBRSxPQUFPLENBQUMsYUFBYTtnQkFDcEMsVUFBVSxFQUFFLE9BQU8sQ0FBQyxVQUFVLElBQUksT0FBTyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUM7Z0JBQzNGLE1BQU0sRUFBRSxPQUFPLE9BQU8sQ0FBQyxPQUFPLEtBQUssU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLFNBQVM7Z0JBQzNFLEtBQUssRUFBRSxPQUFPLE9BQU8sQ0FBQyxNQUFNLEtBQUssUUFBUSxDQUFDLENBQUM7b0JBQzFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztvQkFDaEIsT0FBTyxPQUFPLENBQUMsTUFBTSxLQUFLLFFBQVEsQ0FBQyxDQUFDO3dCQUNuQyxPQUFPLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO3dCQUN0QixTQUFTO2FBQ1gsQ0FBQztRQUNILENBQUM7YUFBTSxDQUFDO1lBQ1AsZUFBZSxHQUFHO2dCQUNqQixhQUFhLEVBQUUsS0FBSztnQkFDcEIsTUFBTSxFQUFFLElBQUk7YUFDWixDQUFDO1FBQ0gsQ0FBQztRQUVELE1BQU0sUUFBUSxHQUFHLENBQUMsQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUM7UUFDcEUsTUFBTSxRQUFRLEdBQUcsTUFBTSxJQUFJLENBQUMscUJBQXFCLENBQUMsd0JBQXdCLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRSxRQUFRLEVBQUUsZUFBZSxDQUFDLENBQUM7UUFDcEgsTUFBTSxNQUFNLEdBQUcsUUFBUSxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFLFNBQVMsQ0FBQztRQUVsRSxJQUFJLE1BQU0sRUFBRSxDQUFDO1lBQ1osT0FBTyxNQUFNLENBQUM7UUFDZixDQUFDO1FBRUQsSUFBSSxRQUFRLEVBQUUsQ0FBQztZQUNkLE1BQU0sSUFBSSxLQUFLLENBQUMsOEJBQThCLFFBQVEsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLGtEQUFrRCxDQUFDLENBQUM7UUFDMUgsQ0FBQzthQUFNLENBQUM7WUFDUCxNQUFNLElBQUksS0FBSyxDQUFDLDhCQUE4QixRQUFRLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUM1RSxDQUFDO0lBQ0YsQ0FBQztJQUVELEtBQUssQ0FBQyxrQ0FBa0MsQ0FBQyxNQUFjLEVBQUUsR0FBa0IsRUFBRSxLQUFhLEVBQUUsS0FBd0I7UUFDbkgsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLCtCQUErQixDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNsRSxNQUFNLFVBQVUsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ25DLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ2pELElBQUksQ0FBQyxRQUFRLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUM1QixPQUFPO1FBQ1IsQ0FBQztRQUVELE1BQU0sSUFBSSxHQUFHLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUM5QyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDWCxPQUFPO1FBQ1IsQ0FBQztRQUVELE1BQU0sTUFBTSxHQUFHLE1BQU0sUUFBUSxDQUFDLHlCQUF5QixDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDN0UsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2IsT0FBTyxTQUFTLENBQUM7UUFDbEIsQ0FBQztRQUVELE1BQU0sV0FBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7UUFDMUMsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO1FBQ3hELE1BQU0sU0FBUyxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUM1RCxNQUFNLEtBQUssR0FBRyxTQUFTLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsY0FBYyxDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLGtCQUFrQixFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUM7UUFDM0gsT0FBTztZQUNOLE9BQU87WUFDUCxLQUFLO1NBQ0wsQ0FBQztJQUNILENBQUM7SUFFRCxrQ0FBa0MsQ0FBQyxPQUFlO1FBQ2pELElBQUksQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ3RDLENBQUM7SUFPRCwwQkFBMEIsQ0FBQyxTQUFnQyxFQUFFLFFBQWdCLEVBQUUsVUFBcUMsRUFBRSxPQUErQyxFQUFFLFlBQThDO1FBQ3BOLElBQUksbUJBQW1CLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztZQUNuQyxNQUFNLElBQUksS0FBSyxDQUFDLDZDQUE2QyxDQUFDLENBQUM7UUFDaEUsQ0FBQztRQUNELE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUNsQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxFQUFFLFFBQVEsRUFBRSxVQUFVLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQztRQUN4RSxJQUFJLENBQUMsY0FBYyxDQUFDLDJCQUEyQixDQUM5QyxNQUFNLEVBQ04sRUFBRSxFQUFFLEVBQUUsU0FBUyxDQUFDLFVBQVUsRUFBRSxRQUFRLEVBQUUsU0FBUyxDQUFDLGlCQUFpQixFQUFFLEVBQ25FLFFBQVEsRUFDUixjQUFjLENBQUMsOEJBQThCLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUMzRCx5QkFBeUIsQ0FBQyxnQ0FBZ0MsQ0FBQyxTQUFTLEVBQUUsWUFBWSxDQUFDLENBQ25GLENBQUM7UUFDRixPQUFPLFlBQVksQ0FBQyxHQUFHLEVBQUU7WUFDeEIsSUFBSSxDQUFDLGNBQWMsQ0FBQyw2QkFBNkIsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUMzRCxDQUFDLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRCxLQUFLLENBQUMsZUFBZSxDQUFDLE1BQWMsRUFBRSxLQUFlLEVBQUUsS0FBd0I7UUFDOUUsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUN4RCxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDakIsTUFBTSxJQUFJLEtBQUssQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO1FBQ3hDLENBQUM7UUFDRCxNQUFNLElBQUksR0FBRyxNQUFNLFVBQVUsQ0FBQyxVQUFVLENBQUMsbUJBQW1CLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNsRixPQUFPLElBQUksNkJBQTZCLENBQUMsY0FBYyxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUNsRixDQUFDO0lBRUQsS0FBSyxDQUFDLGVBQWUsQ0FBQyxNQUFjLEVBQUUsSUFBb0QsRUFBRSxLQUF3QjtRQUNuSCxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3hELElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUNqQixNQUFNLElBQUksS0FBSyxDQUFDLHFCQUFxQixDQUFDLENBQUM7UUFDeEMsQ0FBQztRQUNELE1BQU0sS0FBSyxHQUFHLE1BQU0sVUFBVSxDQUFDLFVBQVUsQ0FBQyxpQkFBaUIsQ0FBQyxjQUFjLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDL0csT0FBTyxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQzdCLENBQUM7SUFFRCxLQUFLLENBQUMsYUFBYSxDQUFDLE1BQWMsRUFBRSxhQUE0QixFQUFFLFNBQWlCLEVBQUUsT0FBZ0MsRUFBRSxLQUF3QjtRQUM5SSxNQUFNLEdBQUcsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBQ3RDLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDeEQsSUFBSSxDQUFDLEtBQUssQ0FBQyxpQ0FBaUMsU0FBUyxLQUFLLEdBQUcsQ0FBQyxRQUFRLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFFN0UsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ2pCLE1BQU0sSUFBSSxLQUFLLENBQUMscUJBQXFCLENBQUMsQ0FBQztRQUN4QyxDQUFDO1FBRUQsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDMUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ2YsTUFBTSxJQUFJLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO1FBQ3ZDLENBQUM7UUFFRCxJQUFJLFFBQVEsQ0FBQyxTQUFTLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDdEMsTUFBTSxJQUFJLEtBQUssQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO1FBQzlDLENBQUM7UUFFRCxJQUFJLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztZQUNyRSxNQUFNLElBQUksS0FBSyxDQUFDLGtCQUFrQixDQUFDLFFBQVEsQ0FBQyxjQUFjLEVBQUUsdUNBQXVDLEVBQUUsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxDQUFDLDJEQUFtRCxDQUFDO1FBQ3RMLENBQUM7UUFFRCxNQUFNLElBQUksR0FBd0I7WUFDakMsUUFBUSxFQUFFLE1BQU0sQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLFFBQVEsRUFBRSxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFFLHlCQUF5QixJQUFJLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ25ILEtBQUssRUFBRSxFQUFFO1NBQ1QsQ0FBQztRQUVGLG1HQUFtRztRQUNuRyxLQUFLLE1BQU0sSUFBSSxJQUFJLFFBQVEsQ0FBQyxXQUFXLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQztZQUNwRCxNQUFNLFFBQVEsR0FBRyxJQUFJLFlBQVksQ0FBQyxnQkFBZ0IsQ0FDakQsSUFBSSxDQUFDLElBQUksRUFDVCxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRSxFQUN2QixJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsRUFDeEIsSUFBSSxDQUFDLElBQUksRUFDVCxDQUFDLENBQUMsVUFBVSxDQUFDLE9BQU8sRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQ2hFLElBQUksQ0FBQyxRQUFRLEVBQ2IsSUFBSSxDQUFDLGdCQUFnQixDQUNyQixDQUFDO1lBRUYsUUFBUSxDQUFDLFFBQVEsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFFLHFCQUFxQixJQUFJLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDMUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDM0IsQ0FBQztRQUVELGlCQUFpQjtRQUNqQixNQUFNLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFFNUMsSUFBSSxLQUFLLENBQUMsdUJBQXVCLEVBQUUsQ0FBQztZQUNuQyxNQUFNLElBQUksS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQzdCLENBQUM7UUFDRCxNQUFNLEtBQUssR0FBRyxNQUFNLFVBQVUsQ0FBQyxVQUFVLENBQUMsaUJBQWlCLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ3pFLElBQUksS0FBSyxDQUFDLHVCQUF1QixFQUFFLENBQUM7WUFDbkMsTUFBTSxJQUFJLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUM3QixDQUFDO1FBRUQsa0dBQWtHO1FBQ2xHLElBQUksQ0FBQyxLQUFLLENBQUMseUJBQXlCLFNBQVMsSUFBSSxHQUFHLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ25FLE1BQU0sSUFBSSxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQzFELElBQUksQ0FBQyxLQUFLLENBQUMsNkJBQTZCLFNBQVMsSUFBSSxHQUFHLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ3ZFLE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQywyQkFBMkIsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDdkYsTUFBTSxJQUFJLEdBQUcsTUFBTSxJQUFJLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUUzRCxNQUFNLFNBQVMsR0FBRztZQUNqQixJQUFJLEVBQUUsY0FBYyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUM7WUFDbEMsTUFBTSxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksR0FBRyxLQUFLLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUM7WUFDL0MsV0FBVyxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksR0FBRyxLQUFLLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUM7WUFDekQsY0FBYyxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksR0FBRyxLQUFLLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUM7WUFDL0QsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLO1lBQ2pCLEtBQUssRUFBRSxJQUFJLENBQUMsS0FBSztZQUNqQixJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7WUFDZixRQUFRLEVBQUUsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLFdBQVcsSUFBSSxDQUFDLENBQUMsR0FBRyxLQUFLLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDO1lBQzdJLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsV0FBVyxJQUFJLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDO1lBQ3RFLElBQUksRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUN4RCxRQUFRLEVBQUUsU0FBUztTQUNuQixDQUFDO1FBRUYsSUFBSSxDQUFDLEtBQUssQ0FBQyxnQ0FBZ0MsU0FBUyxLQUFLLEdBQUcsQ0FBQyxRQUFRLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDNUUsT0FBTyxTQUFTLENBQUM7SUFDbEIsQ0FBQztJQUVEOzs7Ozs7Ozs7O09BVUc7SUFDSCxLQUFLLENBQUMsa0JBQWtCLENBQUMsTUFBYyxFQUFFLFNBQXFCLEVBQUUsbUJBQTJDLEVBQUUsd0JBQWdELEVBQUUsS0FBd0I7UUFDdEwsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxVQUFVLENBQUM7UUFDcEUsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ2pCLE9BQU87Z0JBQ04sUUFBUSxFQUFFLEtBQUs7Z0JBQ2YsT0FBTyxFQUFFLEVBQUU7YUFDWCxDQUFDO1FBQ0gsQ0FBQztRQUVELE1BQU0sbUJBQW1CLEdBQUcsSUFBSSxXQUFXLEVBQUUsQ0FBQztRQUU5QyxNQUFNLGNBQWMsR0FBRyxLQUFLLEVBQUUsUUFBZ0MsRUFBRSxLQUF3QixFQUFFLFNBQXFCLEVBQWlCLEVBQUU7WUFDakksTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFDLE9BQU8sRUFBQyxFQUFFLENBQzlDLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxFQUFFO2dCQUM1RCxNQUFNLEtBQUssR0FBZTtvQkFDekIsT0FBTyxFQUFFLFNBQVMsQ0FBQyxPQUFPO29CQUMxQixhQUFhLEVBQUUsU0FBUyxDQUFDLGFBQWE7b0JBQ3RDLGNBQWMsRUFBRSxTQUFTLENBQUMsY0FBYztvQkFDeEMsY0FBYyxFQUFFLFNBQVMsQ0FBQyxjQUFjO29CQUN4QyxVQUFVLEVBQUUsU0FBUyxDQUFDLFVBQVU7b0JBQ2hDLElBQUksd0JBQWdCO29CQUNwQixXQUFXO2lCQUNYLENBQUM7Z0JBRUYscURBQXFEO2dCQUNyRCxPQUFPLElBQUksQ0FBQyxjQUFjLENBQUMsc0NBQXNDLENBQUMsS0FBSyxFQUFFLEtBQUssRUFBRSxDQUFDLElBQUksRUFBRSxFQUFFO29CQUN4RixJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFO3dCQUNsQixJQUFJLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDOzRCQUNsQyxPQUFPO3dCQUNSLENBQUM7d0JBQ0QsTUFBTSxlQUFlLEdBQUcsd0JBQXdCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFOzRCQUM5RCxxRUFBcUU7NEJBQ3JFLGdLQUFnSzs0QkFDaEssSUFBSSxPQUFPLENBQUMsY0FBYyxJQUFJLENBQUMsTUFBTSxDQUFDLGNBQWMsRUFBRSxDQUFDO2dDQUN0RCxtR0FBbUc7Z0NBQ25HLE9BQU8sS0FBSyxDQUFDOzRCQUNkLENBQUM7aUNBQU0sQ0FBQztnQ0FDUCx1R0FBdUc7Z0NBQ3ZHLE9BQU8sTUFBTSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLENBQUMsbUJBQW1CLENBQUMsaUJBQWlCLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQzs0QkFDdkcsQ0FBQzt3QkFDRixDQUFDLENBQUMsQ0FBQzt3QkFFSCxJQUFJLGVBQWUsRUFBRSxDQUFDOzRCQUNyQixPQUFPO3dCQUNSLENBQUM7d0JBQ0QsbUJBQW1CLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO29CQUM5QixDQUFDLENBQUMsQ0FBQztnQkFDSixDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEVBQUU7b0JBQ2Qsd0hBQXdIO29CQUN4SCxJQUFJLEdBQUcsQ0FBQyxJQUFJLEtBQUssUUFBUSxFQUFFLENBQUM7d0JBQzNCLE9BQU8sQ0FBQyxJQUFJLENBQUMsb0VBQW9FLENBQUMsQ0FBQzt3QkFDbkYsT0FBTzs0QkFDTixRQUFRLEVBQUUsS0FBSzs0QkFDZixRQUFRLEVBQUUsRUFBRTt5QkFDWixDQUFDO29CQUNILENBQUM7eUJBQU0sQ0FBQzt3QkFDUCxNQUFNLEdBQUcsQ0FBQztvQkFDWCxDQUFDO2dCQUNGLENBQUMsQ0FBQyxDQUFDO1lBQ0osQ0FBQyxDQUFDLENBQUMsQ0FDSCxDQUFDLENBQUM7WUFDSCxPQUFPO1FBQ1IsQ0FBQyxDQUFDO1FBRUYsTUFBTSxjQUFjLENBQUMsbUJBQW1CLEVBQUUsS0FBSyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBRTVELE1BQU0sT0FBTyxHQUFHLElBQUksV0FBVyxFQUE2QixDQUFDO1FBQzdELElBQUksUUFBUSxHQUFHLEtBQUssQ0FBQztRQUNyQixNQUFNLFFBQVEsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxHQUFHLEVBQUUsRUFBRTtZQUNsRSxNQUFNLFdBQVcsR0FBZ0MsRUFBRSxDQUFDO1lBRXBELElBQUksQ0FBQztnQkFDSixJQUFJLEtBQUssQ0FBQyx1QkFBdUIsRUFBRSxDQUFDO29CQUNuQyxPQUFPO2dCQUNSLENBQUM7Z0JBQ0QsSUFBSSxTQUFTLENBQUMsVUFBVSxJQUFJLENBQUMsR0FBRyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLEVBQUUsS0FBSyxFQUFFLEVBQUUsQ0FBQyxHQUFHLEdBQUcsS0FBSyxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLEdBQUcsU0FBUyxDQUFDLFVBQVUsRUFBRSxDQUFDO29CQUNwSSxRQUFRLEdBQUcsSUFBSSxDQUFDO29CQUNoQixPQUFPO2dCQUNSLENBQUM7Z0JBRUQsTUFBTSxXQUFXLEdBQWdELEVBQUUsQ0FBQztnQkFDcEUsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQzFDLElBQUksUUFBUSxFQUFFLENBQUM7b0JBQ2QsTUFBTSxLQUFLLEdBQUcsUUFBUSxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUUsQ0FBQztvQkFDOUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQ2xDO3dCQUNDLEtBQUssRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRTt3QkFDM0IsT0FBTyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7cUJBQ3RGLENBQ0QsQ0FBQyxDQUFDO2dCQUNKLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxNQUFNLFdBQVcsR0FBRyxNQUFNLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDO29CQUN0RSxNQUFNLEtBQUssR0FBRyxRQUFRLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO29CQUMxRCxNQUFNLFFBQVEsR0FBRyxNQUFNLFVBQVUsQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFDO29CQUMzRSxJQUFJLEtBQUssQ0FBQyx1QkFBdUIsRUFBRSxDQUFDO3dCQUNuQyxPQUFPO29CQUNSLENBQUM7b0JBQ0QsTUFBTSxJQUFJLEdBQUcsY0FBYyxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7b0JBRXhELElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsV0FBVyxDQUFDLElBQUksQ0FDMUM7d0JBQ0MsS0FBSyxFQUFFLElBQUksQ0FBQyxNQUFNO3dCQUNsQixPQUFPLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztxQkFDL0YsQ0FDRCxDQUFDLENBQUM7Z0JBQ0osQ0FBQztnQkFHRCxJQUFJLEtBQUssQ0FBQyx1QkFBdUIsRUFBRSxDQUFDO29CQUNuQyxPQUFPO2dCQUNSLENBQUM7Z0JBRUQsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsRUFBRTtvQkFDbkMsTUFBTSxNQUFNLEdBQUcsU0FBUyxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUM7b0JBQ2hELE1BQU0sU0FBUyxHQUFHLElBQUksZUFBZSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztvQkFFM0UsTUFBTSxZQUFZLEdBQUcsU0FBUyxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQztvQkFDcEQsTUFBTSxhQUFhLEdBQUcsU0FBUyxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQztvQkFDdEQsTUFBTSxjQUFjLEdBQUcsYUFBYTt5QkFDbEMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQ3RCLHFDQUFxQyxDQUFDLFdBQVcsQ0FBQyxPQUFPLEVBQUUsV0FBVyxDQUFDLFVBQVUsQ0FBQyxDQUFDO3lCQUNuRixHQUFHLENBQUMsQ0FBQyxTQUFTLEVBQUUsS0FBSyxFQUFFLEVBQUU7d0JBQ3pCLFNBQVMsQ0FBQyxZQUFZLEdBQUcsS0FBSyxDQUFDO3dCQUMvQixPQUFPLFNBQVMsQ0FBQztvQkFDbEIsQ0FBQyxDQUFDLENBQUM7b0JBRUosSUFBSSxZQUFZLENBQUMsTUFBTSxHQUFHLENBQUMsSUFBSSxhQUFhLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO3dCQUN6RCxNQUFNLFNBQVMsR0FBOEI7NEJBQzVDLEtBQUssRUFBRSxLQUFLOzRCQUNaLGNBQWMsRUFBRSxxQ0FBcUMsQ0FBQyxZQUFZLEVBQUUsU0FBUyxDQUFDLGVBQWUsQ0FBQzs0QkFDOUYsY0FBYzt5QkFDZCxDQUFDO3dCQUNGLFdBQVcsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7b0JBQzdCLENBQUM7Z0JBQ0YsQ0FBQyxDQUFDLENBQUM7Z0JBRUgsTUFBTSxTQUFTLEdBQUc7b0JBQ2pCLFFBQVEsRUFBRSxHQUFHLEVBQUUsV0FBVyxFQUFFLFdBQVc7aUJBQ3ZDLENBQUM7Z0JBQ0YsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsU0FBUyxDQUFDLENBQUM7Z0JBQzVCLE9BQU87WUFFUixDQUFDO1lBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztnQkFDWixPQUFPO1lBQ1IsQ0FBQztRQUVGLENBQUMsQ0FBQyxDQUFDO1FBRUgsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQzVCLE9BQU87WUFDTixRQUFRO1lBQ1IsT0FBTyxFQUFFLENBQUMsR0FBRyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUM7U0FDOUIsQ0FBQztJQUNILENBQUM7SUFJTyxLQUFLLENBQUMsa0JBQWtCLENBQUMsR0FBUSxFQUFFLE9BQWdDO1FBQzFFLE1BQU0sSUFBSSxHQUFHLE1BQU0sSUFBSSxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDM0QseUJBQXlCO1FBQ3pCLElBQ0MsT0FBTyxPQUFPLEVBQUUsS0FBSyxLQUFLLFFBQVEsSUFBSSxPQUFPLE9BQU8sQ0FBQyxJQUFJLEtBQUssUUFBUSxJQUFJLE9BQU8sQ0FBQyxJQUFJLEtBQUssS0FBSyxDQUFDLGFBQWE7WUFDOUcsT0FBTyxJQUFJLENBQUMsS0FBSyxLQUFLLFFBQVEsSUFBSSxPQUFPLElBQUksQ0FBQyxJQUFJLEtBQUssUUFBUTtZQUMvRCxPQUFPLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLElBQUksT0FBTyxDQUFDLElBQUksS0FBSyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsS0FBSyxFQUFFLE9BQU8sQ0FBQyxLQUFLLENBQUMsa0RBQWtELEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUN0SixDQUFDO1lBQ0YsTUFBTSxJQUFJLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxRQUFRLENBQUMsbUJBQW1CLEVBQUUscUJBQXFCLENBQUMseURBQWlELE9BQU8sQ0FBQyxDQUFDO1FBQ2xKLENBQUM7UUFFRCxPQUFPO0lBQ1IsQ0FBQztJQUVPLGlCQUFpQixDQUFDLEdBQVE7UUFDakMsT0FBTyxHQUFHLENBQUMsTUFBTSxLQUFLLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FBQztJQUNsRSxDQUFDO0lBRUQsaUNBQWlDO0lBR3pCLG9CQUFvQixDQUFDLFFBQWlDLEVBQUUsUUFBZ0IsRUFBRSxJQUE0QjtRQUU3RyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7WUFDakMsTUFBTSxJQUFJLEtBQUssQ0FBQyxrQ0FBa0MsUUFBUSxFQUFFLENBQUMsQ0FBQztRQUMvRCxDQUFDO1FBRUQsTUFBTSxNQUFNLEdBQUcsSUFBSSxxQkFBcUIsQ0FDdkMsUUFBUSxFQUNSLElBQUksQ0FBQyxxQkFBcUIsRUFDMUIsUUFBUSxFQUNSLElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxhQUFhLENBQUMsRUFBRSxDQUFDLEVBQ3ZELElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxhQUFhLENBQUMsRUFBRSxDQUFDLEVBQ3BELE9BQU8sSUFBSSxDQUFDLFVBQVUsS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUMvRixJQUFJLENBQUMsUUFBUSxDQUNiLENBQUM7UUFFRixJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDckMsQ0FBQztJQUVELDhCQUE4QixDQUFDLEtBQXVFO1FBRXJHLElBQUksS0FBSyxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1lBQ2xDLEtBQUssTUFBTSxHQUFHLElBQUksS0FBSyxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO2dCQUNoRCxNQUFNLFVBQVUsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUNuQyxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQztnQkFFakQsSUFBSSxRQUFRLEVBQUUsQ0FBQztvQkFDZCxRQUFRLENBQUMsT0FBTyxFQUFFLENBQUM7b0JBQ25CLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDO29CQUNuQyxJQUFJLENBQUMsd0JBQXdCLENBQUMsK0JBQStCLENBQUMsRUFBRSxnQkFBZ0IsRUFBRSxRQUFRLENBQUMsV0FBVyxDQUFDLFFBQVEsRUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDO29CQUNwSixJQUFJLENBQUMsMkJBQTJCLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQztnQkFDN0QsQ0FBQztnQkFFRCxLQUFLLE1BQU0sTUFBTSxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQztvQkFDN0MsSUFBSSxNQUFNLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsS0FBSyxVQUFVLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQzt3QkFDbEUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDO29CQUNqQyxDQUFDO2dCQUNGLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUVELElBQUksS0FBSyxDQUFDLEtBQUssQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUVoQyxNQUFNLGtCQUFrQixHQUFzQixFQUFFLENBQUM7WUFFakQsS0FBSyxNQUFNLFNBQVMsSUFBSSxLQUFLLENBQUMsS0FBSyxDQUFDLGNBQWMsRUFBRSxDQUFDO2dCQUNwRCxNQUFNLEdBQUcsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFFdEMsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO29CQUM5QixNQUFNLElBQUksS0FBSyxDQUFDLDRCQUE0QixHQUFHLEdBQUcsQ0FBQyxDQUFDO2dCQUNyRCxDQUFDO2dCQUVELE1BQU0sUUFBUSxHQUFHLElBQUksdUJBQXVCLENBQzNDLElBQUksQ0FBQyx1QkFBdUIsRUFDNUIsSUFBSSxDQUFDLHdCQUF3QixFQUM3QixJQUFJLENBQUMsY0FBYyxFQUNuQixHQUFHLEVBQ0gsU0FBUyxDQUNULENBQUM7Z0JBRUYsMkNBQTJDO2dCQUMzQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsR0FBRyxTQUFTLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLFdBQVcsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUUxRixJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxPQUFPLEVBQUUsQ0FBQztnQkFDcEMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLFFBQVEsQ0FBQyxDQUFDO2dCQUNuQyxJQUFJLENBQUMsd0JBQXdCLENBQUMsK0JBQStCLENBQUMsRUFBRSxjQUFjLEVBQUUsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDO2dCQUV0RyxJQUFJLENBQUMsMEJBQTBCLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUM1RCxDQUFDO1FBQ0YsQ0FBQztRQUVELElBQUksS0FBSyxDQUFDLEtBQUssQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUM5QixLQUFLLE1BQU0sZUFBZSxJQUFJLEtBQUssQ0FBQyxLQUFLLENBQUMsWUFBWSxFQUFFLENBQUM7Z0JBQ3hELElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUM7b0JBQzNDLE9BQU87Z0JBQ1IsQ0FBQztnQkFFRCxNQUFNLFVBQVUsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxXQUFXLENBQUMsQ0FBQztnQkFDM0QsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUM7Z0JBRWpELElBQUksUUFBUSxFQUFFLENBQUM7b0JBQ2QsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFFBQVEsRUFBRSxlQUFlLENBQUMsRUFBRSxFQUFFLGVBQWUsQ0FBQyxDQUFDO2dCQUMxRSxDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7UUFFRCxNQUFNLGNBQWMsR0FBNEIsRUFBRSxDQUFDO1FBRW5ELElBQUksS0FBSyxDQUFDLEtBQUssQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUNoQyxLQUFLLE1BQU0sUUFBUSxJQUFJLEtBQUssQ0FBQyxLQUFLLENBQUMsY0FBYyxFQUFFLENBQUM7Z0JBQ25ELE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO2dCQUUzQyxJQUFJLE1BQU0sRUFBRSxDQUFDO29CQUNaLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDO29CQUUvQixJQUFJLElBQUksQ0FBQyxxQkFBcUIsRUFBRSxFQUFFLEtBQUssTUFBTSxDQUFDLEVBQUUsRUFBRSxDQUFDO3dCQUNsRCxJQUFJLENBQUMscUJBQXFCLEdBQUcsU0FBUyxDQUFDO29CQUN4QyxDQUFDO29CQUVELGNBQWMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQzdCLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUVELElBQUksS0FBSyxDQUFDLEtBQUssQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUNoQyxJQUFJLENBQUMsdUJBQXVCLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUE0QixDQUFDO1lBQ2xKLE1BQU0saUJBQWlCLEdBQUcsSUFBSSxHQUFHLEVBQVUsQ0FBQztZQUM1QyxJQUFJLENBQUMsdUJBQXVCLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsaUJBQWlCLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBRWpGLEtBQUssTUFBTSxNQUFNLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDO2dCQUM3QyxNQUFNLFFBQVEsR0FBRyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDO2dCQUNsRCxNQUFNLENBQUMsaUJBQWlCLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDcEMsQ0FBQztZQUVELElBQUksQ0FBQyx1QkFBdUIsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUM5RixJQUFJLENBQUMsa0NBQWtDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO1FBQzNFLENBQUM7UUFFRCxJQUFJLEtBQUssQ0FBQyxLQUFLLENBQUMsZUFBZSxLQUFLLElBQUksRUFBRSxDQUFDO1lBQzFDLHdFQUF3RTtZQUN4RSxJQUFJLENBQUMscUJBQXFCLEdBQUcsU0FBUyxDQUFDO1FBQ3hDLENBQUM7YUFBTSxJQUFJLEtBQUssQ0FBQyxLQUFLLENBQUMsZUFBZSxFQUFFLENBQUM7WUFDeEMsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsQ0FBQztZQUNwRSxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7Z0JBQ25CLE9BQU8sQ0FBQyxLQUFLLENBQUMseUNBQXlDLEtBQUssQ0FBQyxLQUFLLENBQUMsZUFBZSxFQUFFLENBQUMsQ0FBQztZQUN2RixDQUFDO1lBQ0QsSUFBSSxDQUFDLHFCQUFxQixHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLENBQUM7UUFDN0UsQ0FBQztRQUNELElBQUksS0FBSyxDQUFDLEtBQUssQ0FBQyxlQUFlLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDL0MsSUFBSSxDQUFDLGdDQUFnQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMscUJBQXFCLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDbkYsQ0FBQztJQUNGLENBQUM7SUFFTyxNQUFNLENBQUMsb0JBQW9CLENBQUMsZUFBZ0M7UUFFbkUsTUFBTSxlQUFlLEdBQUcsa0JBQWtCLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztRQUUxRixNQUFNLHFCQUFxQixHQUFHLElBQUksVUFBVSxDQUMzQyw4QkFBOEIsRUFBRSx3QkFBd0IsRUFBRSw0QkFBNEIsRUFDdEYsQ0FBQyxlQUFlLEVBQUUsSUFBSSxrQkFBa0IsQ0FBdUIsTUFBTSxFQUFFLDBCQUEwQixFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxZQUFZLFVBQVUsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUN4SixJQUFJLGdCQUFnQixDQUFzRSxlQUFlLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxjQUFjLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FDOUosQ0FBQztRQUVGLE1BQU0scUJBQXFCLEdBQUcsSUFBSSxVQUFVLENBQzNDLDhCQUE4QixFQUFFLHdCQUF3QixFQUFFLDRCQUE0QixFQUN0RixDQUFDLGVBQWUsRUFBRSxJQUFJLGtCQUFrQixDQUFzRSxjQUFjLEVBQUUsbUNBQW1DLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLDZCQUE2QixDQUFDLGNBQWMsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUMzUCxJQUFJLGdCQUFnQixDQUF1QixPQUFPLEVBQUUsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQ3RFLENBQUM7UUFFRixlQUFlLENBQUMsa0JBQWtCLENBQUMscUJBQXFCLENBQUMsQ0FBQztRQUMxRCxlQUFlLENBQUMsa0JBQWtCLENBQUMscUJBQXFCLENBQUMsQ0FBQztJQUMzRCxDQUFDO0lBRU8sS0FBSyxDQUFDLEdBQVc7UUFDeEIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsNkJBQTZCLEdBQUcsRUFBRSxDQUFDLENBQUM7SUFDNUQsQ0FBQyJ9