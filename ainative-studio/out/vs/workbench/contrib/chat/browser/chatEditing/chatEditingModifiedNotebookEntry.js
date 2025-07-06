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
var ChatEditingModifiedNotebookEntry_1;
import { streamToBuffer } from '../../../../../base/common/buffer.js';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { StringSHA1 } from '../../../../../base/common/hash.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ResourceMap, ResourceSet } from '../../../../../base/common/map.js';
import { Schemas } from '../../../../../base/common/network.js';
import { observableValue, autorun, transaction, ObservablePromise } from '../../../../../base/common/observable.js';
import { isEqual } from '../../../../../base/common/resources.js';
import { assertType } from '../../../../../base/common/types.js';
import { generateUuid } from '../../../../../base/common/uuid.js';
import { LineRange } from '../../../../../editor/common/core/lineRange.js';
import { OffsetEdit } from '../../../../../editor/common/core/offsetEdit.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { nullDocumentDiff } from '../../../../../editor/common/diff/documentDiffProvider.js';
import { DetailedLineRangeMapping, RangeMapping } from '../../../../../editor/common/diff/rangeMapping.js';
import { TextEdit } from '../../../../../editor/common/languages.js';
import { IModelService } from '../../../../../editor/common/services/model.js';
import { ITextModelService } from '../../../../../editor/common/services/resolverService.js';
import { localize } from '../../../../../nls.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IUndoRedoService } from '../../../../../platform/undoRedo/common/undoRedo.js';
import { IFilesConfigurationService } from '../../../../services/filesConfiguration/common/filesConfigurationService.js';
import { NotebookTextDiffEditor } from '../../../notebook/browser/diff/notebookDiffEditor.js';
import { getNotebookEditorFromEditorPane } from '../../../notebook/browser/notebookBrowser.js';
import { NotebookCellsChangeType, NotebookSetting } from '../../../notebook/common/notebookCommon.js';
import { computeDiff } from '../../../notebook/common/notebookDiff.js';
import { INotebookEditorModelResolverService } from '../../../notebook/common/notebookEditorModelResolverService.js';
import { INotebookLoggingService } from '../../../notebook/common/notebookLoggingService.js';
import { INotebookService } from '../../../notebook/common/notebookService.js';
import { INotebookEditorWorkerService } from '../../../notebook/common/services/notebookWorkerService.js';
import { IChatService } from '../../common/chatService.js';
import { AbstractChatEditingModifiedFileEntry } from './chatEditingModifiedFileEntry.js';
import { createSnapshot, deserializeSnapshot, getNotebookSnapshotFileURI, restoreSnapshot, SnapshotComparer } from './notebook/chatEditingModifiedNotebookSnapshot.js';
import { ChatEditingNewNotebookContentEdits } from './notebook/chatEditingNewNotebookContentEdits.js';
import { ChatEditingNotebookCellEntry } from './notebook/chatEditingNotebookCellEntry.js';
import { ChatEditingNotebookDiffEditorIntegration, ChatEditingNotebookEditorIntegration } from './notebook/chatEditingNotebookEditorIntegration.js';
import { ChatEditingNotebookFileSystemProvider } from './notebook/chatEditingNotebookFileSystemProvider.js';
import { adjustCellDiffAndOriginalModelBasedOnCellAddDelete, adjustCellDiffAndOriginalModelBasedOnCellMovements, adjustCellDiffForKeepingAnInsertedCell, adjustCellDiffForRevertingADeletedCell, adjustCellDiffForRevertingAnInsertedCell, calculateNotebookRewriteRatio, getCorrespondingOriginalCellIndex, isTransientIPyNbExtensionEvent } from './notebook/helpers.js';
import { countChanges, sortCellChanges } from './notebook/notebookCellChanges.js';
const SnapshotLanguageId = 'VSCodeChatNotebookSnapshotLanguage';
let ChatEditingModifiedNotebookEntry = class ChatEditingModifiedNotebookEntry extends AbstractChatEditingModifiedFileEntry {
    static { ChatEditingModifiedNotebookEntry_1 = this; }
    static { this.NewModelCounter = 0; }
    get isProcessingResponse() {
        return this._isProcessingResponse;
    }
    get cellsDiffInfo() {
        return this._cellsDiffInfo;
    }
    static async create(uri, _multiDiffEntryDelegate, telemetryInfo, chatKind, initialContent, instantiationService) {
        return instantiationService.invokeFunction(async (accessor) => {
            const notebookService = accessor.get(INotebookService);
            const resolver = accessor.get(INotebookEditorModelResolverService);
            const configurationServie = accessor.get(IConfigurationService);
            const resourceRef = await resolver.resolve(uri);
            const notebook = resourceRef.object.notebook;
            const originalUri = getNotebookSnapshotFileURI(telemetryInfo.sessionId, telemetryInfo.requestId, generateUuid(), notebook.uri.scheme === Schemas.untitled ? `/${notebook.uri.path}` : notebook.uri.path, notebook.viewType);
            const [options, buffer] = await Promise.all([
                notebookService.withNotebookDataProvider(resourceRef.object.notebook.notebookType),
                notebookService.createNotebookTextDocumentSnapshot(notebook.uri, 2 /* SnapshotContext.Backup */, CancellationToken.None).then(s => streamToBuffer(s))
            ]);
            const disposables = new DisposableStore();
            // Register so that we can load this from file system.
            disposables.add(ChatEditingNotebookFileSystemProvider.registerFile(originalUri, buffer));
            const originalRef = await resolver.resolve(originalUri, notebook.viewType);
            if (initialContent) {
                restoreSnapshot(originalRef.object.notebook, initialContent);
            }
            else {
                initialContent = createSnapshot(notebook, options.serializer.options, configurationServie);
                // Both models are the same, ensure the cell ids are the same, this way we get a perfect diffing.
                // No need to generate edits for this.
                // We want to ensure they are identitcal, possible original notebook was open and got modified.
                // Or something gets changed between serialization & deserialization of the snapshot into the original.
                // E.g. in jupyter notebooks the metadata contains transient data that gets updated after deserialization.
                restoreSnapshot(originalRef.object.notebook, initialContent);
                const edits = [];
                notebook.cells.forEach((cell, index) => {
                    const internalId = generateCellHash(cell.uri);
                    edits.push({ editType: 9 /* CellEditType.PartialInternalMetadata */, index, internalMetadata: { internalId } });
                });
                resourceRef.object.notebook.applyEdits(edits, true, undefined, () => undefined, undefined, false);
                originalRef.object.notebook.applyEdits(edits, true, undefined, () => undefined, undefined, false);
            }
            const instance = instantiationService.createInstance(ChatEditingModifiedNotebookEntry_1, resourceRef, originalRef, _multiDiffEntryDelegate, options.serializer.options, telemetryInfo, chatKind, initialContent);
            instance._register(disposables);
            return instance;
        });
    }
    static canHandleSnapshotContent(initialContent) {
        if (!initialContent) {
            return false;
        }
        try {
            deserializeSnapshot(initialContent);
            return true;
        }
        catch (ex) {
            // not a valid snapshot
            return false;
        }
    }
    static canHandleSnapshot(snapshot) {
        if (snapshot.languageId === SnapshotLanguageId && ChatEditingModifiedNotebookEntry_1.canHandleSnapshotContent(snapshot.current)) {
            return true;
        }
        return false;
    }
    constructor(modifiedResourceRef, originalResourceRef, _multiDiffEntryDelegate, transientOptions, telemetryInfo, kind, initialContent, configurationService, fileConfigService, chatService, fileService, instantiationService, textModelService, modelService, undoRedoService, notebookEditorWorkerService, loggingService, notebookResolver) {
        super(modifiedResourceRef.object.notebook.uri, telemetryInfo, kind, configurationService, fileConfigService, chatService, fileService, undoRedoService, instantiationService);
        this.modifiedResourceRef = modifiedResourceRef;
        this._multiDiffEntryDelegate = _multiDiffEntryDelegate;
        this.transientOptions = transientOptions;
        this.configurationService = configurationService;
        this.textModelService = textModelService;
        this.modelService = modelService;
        this.notebookEditorWorkerService = notebookEditorWorkerService;
        this.loggingService = loggingService;
        this.notebookResolver = notebookResolver;
        /**
         * Whether we're still generating diffs from a response.
         */
        this._isProcessingResponse = observableValue('isProcessingResponse', false);
        this._isEditFromUs = false;
        /**
         * Whether all edits are from us, e.g. is possible a user has made edits, then this will be false.
         */
        this._allEditsAreFromUs = true;
        this._changesCount = observableValue(this, 0);
        this.changesCount = this._changesCount;
        this.cellEntryMap = new ResourceMap();
        this.modifiedToOriginalCell = new ResourceMap();
        this._cellsDiffInfo = observableValue('diffInfo', []);
        /**
         * List of Cell URIs that are edited,
         * Will be cleared once all edits have been accepted.
         * I.e. this will only contain URIS while acceptAgentEdits is being called & before `isLastEdit` is sent.
         * I.e. this is populated only when edits are being streamed.
         */
        this.editedCells = new ResourceSet();
        this.computeRequestId = 0;
        this.cellTextModelMap = new ResourceMap();
        this.initialContentComparer = new SnapshotComparer(initialContent);
        this.modifiedModel = this._register(modifiedResourceRef).object.notebook;
        this.originalModel = this._register(originalResourceRef).object.notebook;
        this.originalURI = this.originalModel.uri;
        this.initialContent = initialContent;
        this.initializeModelsFromDiff();
        this._register(this.modifiedModel.onDidChangeContent(this.mirrorNotebookEdits, this));
    }
    initializeModelsFromDiffImpl(cellsDiffInfo) {
        this.cellEntryMap.forEach(entry => entry.dispose());
        this.cellEntryMap.clear();
        const diffs = cellsDiffInfo.map((cellDiff, i) => {
            switch (cellDiff.type) {
                case 'delete':
                    return this.createDeleteCellDiffInfo(cellDiff.originalCellIndex);
                case 'insert':
                    return this.createInsertedCellDiffInfo(cellDiff.modifiedCellIndex);
                default:
                    return this.createModifiedCellDiffInfo(cellDiff.modifiedCellIndex, cellDiff.originalCellIndex);
            }
        });
        this._cellsDiffInfo.set(diffs, undefined);
        this._changesCount.set(countChanges(diffs), undefined);
    }
    async initializeModelsFromDiff() {
        const id = ++this.computeRequestId;
        if (this._areOriginalAndModifiedIdenticalImpl()) {
            const cellsDiffInfo = this.modifiedModel.cells.map((_, index) => {
                return { type: 'unchanged', originalCellIndex: index, modifiedCellIndex: index };
            });
            this.initializeModelsFromDiffImpl(cellsDiffInfo);
            return;
        }
        const cellsDiffInfo = [];
        try {
            this._isProcessingResponse.set(true, undefined);
            const notebookDiff = await this.notebookEditorWorkerService.computeDiff(this.originalURI, this.modifiedURI);
            if (id !== this.computeRequestId) {
                return;
            }
            const result = computeDiff(this.originalModel, this.modifiedModel, notebookDiff);
            if (result.cellDiffInfo.length) {
                cellsDiffInfo.push(...result.cellDiffInfo);
            }
        }
        catch (ex) {
            this.loggingService.error('Notebook Chat', 'Error computing diff:\n' + ex);
        }
        finally {
            this._isProcessingResponse.set(false, undefined);
        }
        this.initializeModelsFromDiffImpl(cellsDiffInfo);
    }
    updateCellDiffInfo(cellsDiffInfo, transcation) {
        this._cellsDiffInfo.set(sortCellChanges(cellsDiffInfo), transcation);
        this._changesCount.set(countChanges(cellsDiffInfo), transcation);
    }
    mirrorNotebookEdits(e) {
        if (this._isEditFromUs || Array.from(this.cellEntryMap.values()).some(entry => entry.isEditFromUs)) {
            return;
        }
        // Possible user reverted the changes from SCM or the like.
        // Or user just reverted the changes made via edits (e.g. edit made a change in a cell and user undid that change either by typing over or other).
        // Computing snapshot is too slow, as this event gets triggered for every key stroke in a cell,
        // const didResetToOriginalContent = createSnapshot(this.modifiedModel, this.transientOptions, this.configurationService) === this.initialContent;
        let didResetToOriginalContent = this.initialContentComparer.isEqual(this.modifiedModel);
        const currentState = this._stateObs.get();
        if (currentState === 2 /* WorkingSetEntryState.Rejected */) {
            return;
        }
        if (currentState === 0 /* WorkingSetEntryState.Modified */ && didResetToOriginalContent) {
            this._stateObs.set(2 /* WorkingSetEntryState.Rejected */, undefined);
            this.updateCellDiffInfo([], undefined);
            this.initializeModelsFromDiff();
            return;
        }
        if (!e.rawEvents.length) {
            return;
        }
        if (isTransientIPyNbExtensionEvent(this.modifiedModel.notebookType, e)) {
            return;
        }
        this._allEditsAreFromUs = false;
        // Changes to cell text is sync'ed and handled separately.
        // See ChatEditingNotebookCellEntry._mirrorEdits
        for (const event of e.rawEvents.filter(event => event.kind !== NotebookCellsChangeType.ChangeCellContent)) {
            switch (event.kind) {
                case NotebookCellsChangeType.ChangeDocumentMetadata: {
                    const edit = {
                        editType: 5 /* CellEditType.DocumentMetadata */,
                        metadata: this.modifiedModel.metadata
                    };
                    this.originalModel.applyEdits([edit], true, undefined, () => undefined, undefined, false);
                    break;
                }
                case NotebookCellsChangeType.ModelChange: {
                    let cellDiffs = sortCellChanges(this._cellsDiffInfo.get());
                    // Ensure the new notebook cells have internalIds
                    this._applyEditsSync(() => {
                        event.changes.forEach(change => {
                            change[2].forEach((cell, i) => {
                                if (cell.internalMetadata.internalId) {
                                    return;
                                }
                                const index = change[0] + i;
                                const internalId = generateCellHash(cell.uri);
                                const edits = [{ editType: 9 /* CellEditType.PartialInternalMetadata */, index, internalMetadata: { internalId } }];
                                this.modifiedModel.applyEdits(edits, true, undefined, () => undefined, undefined, false);
                                cell.internalMetadata ??= {};
                                cell.internalMetadata.internalId = internalId;
                            });
                        });
                    });
                    event.changes.forEach(change => {
                        cellDiffs = adjustCellDiffAndOriginalModelBasedOnCellAddDelete(change, cellDiffs, this.modifiedModel.cells.length, this.originalModel.cells.length, this.originalModel.applyEdits.bind(this.originalModel), this.createModifiedCellDiffInfo.bind(this));
                    });
                    this.updateCellDiffInfo(cellDiffs, undefined);
                    this.disposeDeletedCellEntries();
                    break;
                }
                case NotebookCellsChangeType.ChangeCellLanguage: {
                    const index = getCorrespondingOriginalCellIndex(event.index, this._cellsDiffInfo.get());
                    if (typeof index === 'number') {
                        const edit = {
                            editType: 4 /* CellEditType.CellLanguage */,
                            index,
                            language: event.language
                        };
                        this.originalModel.applyEdits([edit], true, undefined, () => undefined, undefined, false);
                    }
                    break;
                }
                case NotebookCellsChangeType.ChangeCellMetadata: {
                    // ipynb and other extensions can alter metadata, ensure we update the original model in the corresponding cell.
                    const index = getCorrespondingOriginalCellIndex(event.index, this._cellsDiffInfo.get());
                    if (typeof index === 'number') {
                        const edit = {
                            editType: 3 /* CellEditType.Metadata */,
                            index,
                            metadata: event.metadata
                        };
                        this.originalModel.applyEdits([edit], true, undefined, () => undefined, undefined, false);
                    }
                    break;
                }
                case NotebookCellsChangeType.ChangeCellMime:
                    break;
                case NotebookCellsChangeType.ChangeCellInternalMetadata: {
                    const index = getCorrespondingOriginalCellIndex(event.index, this._cellsDiffInfo.get());
                    if (typeof index === 'number') {
                        const edit = {
                            editType: 9 /* CellEditType.PartialInternalMetadata */,
                            index,
                            internalMetadata: event.internalMetadata
                        };
                        this.originalModel.applyEdits([edit], true, undefined, () => undefined, undefined, false);
                    }
                    break;
                }
                case NotebookCellsChangeType.Output: {
                    // User can run cells.
                    const index = getCorrespondingOriginalCellIndex(event.index, this._cellsDiffInfo.get());
                    if (typeof index === 'number') {
                        const edit = {
                            editType: 2 /* CellEditType.Output */,
                            index,
                            append: event.append,
                            outputs: event.outputs
                        };
                        this.originalModel.applyEdits([edit], true, undefined, () => undefined, undefined, false);
                    }
                    break;
                }
                case NotebookCellsChangeType.OutputItem: {
                    const index = getCorrespondingOriginalCellIndex(event.index, this._cellsDiffInfo.get());
                    if (typeof index === 'number') {
                        const edit = {
                            editType: 7 /* CellEditType.OutputItems */,
                            outputId: event.outputId,
                            append: event.append,
                            items: event.outputItems
                        };
                        this.originalModel.applyEdits([edit], true, undefined, () => undefined, undefined, false);
                    }
                    break;
                }
                case NotebookCellsChangeType.Move: {
                    const result = adjustCellDiffAndOriginalModelBasedOnCellMovements(event, this._cellsDiffInfo.get().slice());
                    if (result) {
                        this.originalModel.applyEdits(result[1], true, undefined, () => undefined, undefined, false);
                        this._cellsDiffInfo.set(result[0], undefined);
                    }
                    break;
                }
                default: {
                    break;
                }
            }
        }
        didResetToOriginalContent = this.initialContentComparer.isEqual(this.modifiedModel);
        if (currentState === 0 /* WorkingSetEntryState.Modified */ && didResetToOriginalContent) {
            this._stateObs.set(2 /* WorkingSetEntryState.Rejected */, undefined);
            this.updateCellDiffInfo([], undefined);
            this.initializeModelsFromDiff();
            return;
        }
    }
    async _doAccept(tx) {
        this.updateCellDiffInfo([], tx);
        const snapshot = createSnapshot(this.modifiedModel, this.transientOptions, this.configurationService);
        restoreSnapshot(this.originalModel, snapshot);
        this.initializeModelsFromDiff();
        await this._collapse(tx);
        const config = this._fileConfigService.getAutoSaveConfiguration(this.modifiedURI);
        if (this.modifiedModel.uri.scheme !== Schemas.untitled && (!config.autoSave || !this.notebookResolver.isDirty(this.modifiedURI))) {
            // SAVE after accept for manual-savers, for auto-savers
            // trigger explict save to get save participants going
            await this._applyEdits(async () => {
                try {
                    await this.modifiedResourceRef.object.save({
                        reason: 1 /* SaveReason.EXPLICIT */,
                        force: true,
                    });
                }
                catch {
                    // ignored
                }
            });
        }
    }
    async _doReject(tx) {
        this.updateCellDiffInfo([], tx);
        if (this.createdInRequestId === this._telemetryInfo.requestId) {
            await this._applyEdits(async () => {
                await this.modifiedResourceRef.object.revert({ soft: true });
                await this._fileService.del(this.modifiedURI);
            });
            this._onDidDelete.fire();
        }
        else {
            await this._applyEdits(async () => {
                const snapshot = createSnapshot(this.originalModel, this.transientOptions, this.configurationService);
                this.restoreSnapshotInModifiedModel(snapshot);
                if (this._allEditsAreFromUs && Array.from(this.cellEntryMap.values()).every(entry => entry.allEditsAreFromUs)) {
                    // save the file after discarding so that the dirty indicator goes away
                    // and so that an intermediate saved state gets reverted
                    await this.modifiedResourceRef.object.save({ reason: 1 /* SaveReason.EXPLICIT */, skipSaveParticipants: true });
                }
            });
            this.initializeModelsFromDiff();
            await this._collapse(tx);
        }
    }
    async _collapse(transaction) {
        this._multiDiffEntryDelegate.collapse(transaction);
    }
    _createEditorIntegration(editor) {
        const notebookEditor = getNotebookEditorFromEditorPane(editor);
        if (!notebookEditor && editor.getId() === NotebookTextDiffEditor.ID) {
            const diffEditor = editor.getControl();
            return this._instantiationService.createInstance(ChatEditingNotebookDiffEditorIntegration, diffEditor, this._cellsDiffInfo);
        }
        assertType(notebookEditor);
        return this._instantiationService.createInstance(ChatEditingNotebookEditorIntegration, this, editor, this.modifiedModel, this.originalModel, this._cellsDiffInfo);
    }
    _resetEditsState(tx) {
        super._resetEditsState(tx);
        this.cellEntryMap.forEach(entry => !entry.disposed && entry.clearCurrentEditLineDecoration());
    }
    _createUndoRedoElement(response) {
        const request = response.session.getRequests().find(req => req.id === response.requestId);
        const label = request?.message.text ? localize('chatNotebookEdit1', "Chat Edit: '{0}'", request.message.text) : localize('chatNotebookEdit2', "Chat Edit");
        const transientOptions = this.transientOptions;
        const outputSizeLimit = this.configurationService.getValue(NotebookSetting.outputBackupSizeLimit) * 1024;
        // create a snapshot of the current state of the model, before the next set of edits
        let initial = createSnapshot(this.modifiedModel, transientOptions, outputSizeLimit);
        let last = '';
        return {
            type: 0 /* UndoRedoElementType.Resource */,
            resource: this.modifiedURI,
            label,
            code: 'chat.edit',
            confirmBeforeUndo: false,
            undo: async () => {
                last = createSnapshot(this.modifiedModel, transientOptions, outputSizeLimit);
                restoreSnapshot(this.modifiedModel, initial);
            },
            redo: async () => {
                initial = createSnapshot(this.modifiedModel, transientOptions, outputSizeLimit);
                restoreSnapshot(this.modifiedModel, last);
            }
        };
    }
    async _areOriginalAndModifiedIdentical() {
        return this._areOriginalAndModifiedIdenticalImpl();
    }
    _areOriginalAndModifiedIdenticalImpl() {
        const snapshot = createSnapshot(this.originalModel, this.transientOptions, this.configurationService);
        return new SnapshotComparer(snapshot).isEqual(this.modifiedModel);
    }
    async acceptAgentEdits(resource, edits, isLastEdits, responseModel) {
        const isCellUri = resource.scheme === Schemas.vscodeNotebookCell;
        const cell = isCellUri && this.modifiedModel.cells.find(cell => isEqual(cell.uri, resource));
        let cellEntry;
        if (cell) {
            const index = this.modifiedModel.cells.indexOf(cell);
            const entry = this._cellsDiffInfo.get().slice().find(entry => entry.modifiedCellIndex === index);
            if (!entry) {
                // Not possible.
                console.error('Original cell model not found');
                return;
            }
            cellEntry = this.getOrCreateModifiedTextFileEntryForCell(cell, await entry.modifiedModel.promise, await entry.originalModel.promise);
        }
        // For all cells that were edited, send the `isLastEdits` flag.
        const finishPreviousCells = () => {
            this.editedCells.forEach(uri => {
                const cell = this.modifiedModel.cells.find(cell => isEqual(cell.uri, uri));
                const cellEntry = cell && this.cellEntryMap.get(cell.uri);
                cellEntry?.acceptAgentEdits([], true, responseModel);
            });
            this.editedCells.clear();
        };
        this._applyEditsSync(async () => {
            edits.map(edit => {
                if (TextEdit.isTextEdit(edit)) {
                    // Possible we're getting the raw content for the notebook.
                    if (isEqual(resource, this.modifiedModel.uri)) {
                        this.newNotebookEditGenerator ??= this._instantiationService.createInstance(ChatEditingNewNotebookContentEdits, this.modifiedModel);
                        this.newNotebookEditGenerator.acceptTextEdits([edit]);
                    }
                    else {
                        // If we get cell edits, its impossible to get text edits for the notebook uri.
                        this.newNotebookEditGenerator = undefined;
                        if (!this.editedCells.has(resource)) {
                            finishPreviousCells();
                            this.editedCells.add(resource);
                        }
                        cellEntry?.acceptAgentEdits([edit], isLastEdits, responseModel);
                    }
                }
                else {
                    // If we notebook edits, its impossible to get text edits for the notebook uri.
                    this.newNotebookEditGenerator = undefined;
                    this.acceptNotebookEdit(edit);
                }
            });
        });
        // If the last edit for a cell was sent, then handle it
        if (isLastEdits) {
            finishPreviousCells();
        }
        // isLastEdits can be true for cell Uris, but when its true for Cells edits.
        // It cannot be true for the notebook itself.
        isLastEdits = !isCellUri && isLastEdits;
        // If this is the last edit and & we got regular text edits for generating new notebook content
        // Then generate notebook edits from those text edits & apply those notebook edits.
        if (isLastEdits && this.newNotebookEditGenerator) {
            const notebookEdits = await this.newNotebookEditGenerator.generateEdits();
            this.newNotebookEditGenerator = undefined;
            notebookEdits.forEach(edit => this.acceptNotebookEdit(edit));
        }
        transaction((tx) => {
            if (!isLastEdits) {
                this._stateObs.set(0 /* WorkingSetEntryState.Modified */, tx);
                this._isCurrentlyBeingModifiedByObs.set(responseModel, tx);
                const newRewriteRation = Math.max(this._rewriteRatioObs.get(), calculateNotebookRewriteRatio(this._cellsDiffInfo.get(), this.originalModel, this.modifiedModel));
                this._rewriteRatioObs.set(Math.min(1, newRewriteRation), tx);
            }
            else {
                finishPreviousCells();
                this.editedCells.clear();
                this._resetEditsState(tx);
                this._rewriteRatioObs.set(1, tx);
            }
        });
    }
    disposeDeletedCellEntries() {
        const cellsUris = new ResourceSet(this.modifiedModel.cells.map(cell => cell.uri));
        Array.from(this.cellEntryMap.keys()).forEach(uri => {
            if (cellsUris.has(uri)) {
                return;
            }
            this.cellEntryMap.get(uri)?.dispose();
            this.cellEntryMap.delete(uri);
        });
    }
    acceptNotebookEdit(edit) {
        // make the actual edit
        this.modifiedModel.applyEdits([edit], true, undefined, () => undefined, undefined, false);
        this.disposeDeletedCellEntries();
        if (edit.editType !== 1 /* CellEditType.Replace */) {
            return;
        }
        // Ensure cells have internal Ids.
        edit.cells.forEach((_, i) => {
            const index = edit.index + i;
            const cell = this.modifiedModel.cells[index];
            if (cell.internalMetadata.internalId) {
                return;
            }
            const internalId = generateCellHash(cell.uri);
            const edits = [{ editType: 9 /* CellEditType.PartialInternalMetadata */, index, internalMetadata: { internalId } }];
            this.modifiedModel.applyEdits(edits, true, undefined, () => undefined, undefined, false);
        });
        let diff = [];
        if (edit.count === 0) {
            // All existing indexes are shifted by number of cells added.
            diff = sortCellChanges(this._cellsDiffInfo.get());
            diff.forEach(d => {
                if (d.type !== 'delete' && d.modifiedCellIndex >= edit.index) {
                    d.modifiedCellIndex += edit.cells.length;
                }
            });
            const diffInsert = edit.cells.map((_, i) => this.createInsertedCellDiffInfo(edit.index + i));
            diff.splice(edit.index, 0, ...diffInsert);
        }
        else {
            // All existing indexes are shifted by number of cells removed.
            // And unchanged cells should be converted to deleted cells.
            diff = sortCellChanges(this._cellsDiffInfo.get()).map((d) => {
                if (d.type === 'unchanged' && d.modifiedCellIndex >= edit.index && d.modifiedCellIndex <= (edit.index + edit.count - 1)) {
                    return this.createDeleteCellDiffInfo(d.originalCellIndex);
                }
                if (d.type !== 'delete' && d.modifiedCellIndex >= (edit.index + edit.count)) {
                    d.modifiedCellIndex -= edit.count;
                    return d;
                }
                return d;
            });
        }
        this.updateCellDiffInfo(diff, undefined);
    }
    computeStateAfterAcceptingRejectingChanges(accepted) {
        const currentSnapshot = createSnapshot(this.modifiedModel, this.transientOptions, this.configurationService);
        if (new SnapshotComparer(currentSnapshot).isEqual(this.originalModel)) {
            const state = accepted ? 1 /* WorkingSetEntryState.Accepted */ : 2 /* WorkingSetEntryState.Rejected */;
            this._stateObs.set(state, undefined);
        }
    }
    createModifiedCellDiffInfo(modifiedCellIndex, originalCellIndex) {
        const modifiedCell = this.modifiedModel.cells[modifiedCellIndex];
        const originalCell = this.originalModel.cells[originalCellIndex];
        this.modifiedToOriginalCell.set(modifiedCell.uri, originalCell.uri);
        const modifiedCellModelPromise = this.resolveCellModel(modifiedCell.uri);
        const originalCellModelPromise = this.resolveCellModel(originalCell.uri);
        Promise.all([modifiedCellModelPromise, originalCellModelPromise]).then(([modifiedCellModel, originalCellModel]) => {
            this.getOrCreateModifiedTextFileEntryForCell(modifiedCell, modifiedCellModel, originalCellModel);
        });
        const diff = observableValue('diff', nullDocumentDiff);
        const unchangedCell = {
            type: 'unchanged',
            modifiedCellIndex,
            originalCellIndex,
            keep: async (changes) => {
                const [modifiedCellModel, originalCellModel] = await Promise.all([modifiedCellModelPromise, originalCellModelPromise]);
                const entry = this.getOrCreateModifiedTextFileEntryForCell(modifiedCell, modifiedCellModel, originalCellModel);
                return entry ? entry.keep(changes) : false;
            },
            undo: async (changes) => {
                const [modifiedCellModel, originalCellModel] = await Promise.all([modifiedCellModelPromise, originalCellModelPromise]);
                const entry = this.getOrCreateModifiedTextFileEntryForCell(modifiedCell, modifiedCellModel, originalCellModel);
                return entry ? entry.undo(changes) : false;
            },
            modifiedModel: new ObservablePromise(modifiedCellModelPromise),
            originalModel: new ObservablePromise(originalCellModelPromise),
            diff
        };
        return unchangedCell;
    }
    createInsertedCellDiffInfo(modifiedCellIndex) {
        const cell = this.modifiedModel.cells[modifiedCellIndex];
        const lines = cell.getValue().split(/\r?\n/);
        const originalRange = new Range(1, 0, 1, 0);
        const modifiedRange = new Range(1, 0, lines.length, lines[lines.length - 1].length);
        const innerChanges = new RangeMapping(originalRange, modifiedRange);
        const changes = [new DetailedLineRangeMapping(new LineRange(1, 1), new LineRange(1, lines.length), [innerChanges])];
        // When a new cell is inserted, we use the ChatEditingCodeEditorIntegration to handle the edits.
        // & to also display undo/redo and decorations.
        // However that needs a modified and original model.
        // For inserted cells there's no original model, so we create a new empty text model and pass that as the original.
        const originalModelUri = this.modifiedModel.uri.with({ query: (ChatEditingModifiedNotebookEntry_1.NewModelCounter++).toString(), scheme: 'emptyCell' });
        const originalModel = this.modelService.getModel(originalModelUri) || this._register(this.modelService.createModel('', null, originalModelUri));
        this.modifiedToOriginalCell.set(cell.uri, originalModelUri);
        const keep = async () => {
            this._applyEditsSync(() => this.keepPreviouslyInsertedCell(cell));
            this.computeStateAfterAcceptingRejectingChanges(true);
            return true;
        };
        const undo = async () => {
            this._applyEditsSync(() => this.undoPreviouslyInsertedCell(cell));
            this.computeStateAfterAcceptingRejectingChanges(false);
            return true;
        };
        this.resolveCellModel(cell.uri).then(modifiedModel => {
            // We want decorators for the cell just as we display decorators for modified cells.
            // This way we have the ability to accept/reject the entire cell.
            this.getOrCreateModifiedTextFileEntryForCell(cell, modifiedModel, originalModel);
        });
        return {
            type: 'insert',
            originalCellIndex: undefined,
            modifiedCellIndex: modifiedCellIndex,
            keep,
            undo,
            modifiedModel: new ObservablePromise(this.resolveCellModel(cell.uri)),
            originalModel: new ObservablePromise(Promise.resolve(originalModel)),
            diff: observableValue('deletedCellDiff', {
                changes,
                identical: false,
                moves: [],
                quitEarly: false,
            })
        };
    }
    createDeleteCellDiffInfo(originalCellIndex) {
        const originalCell = this.originalModel.cells[originalCellIndex];
        const lines = new Array(originalCell.textBuffer.getLineCount()).fill(0).map((_, i) => originalCell.textBuffer.getLineContent(i + 1));
        const originalRange = new Range(1, 0, lines.length, lines[lines.length - 1].length);
        const modifiedRange = new Range(1, 0, 1, 0);
        const innerChanges = new RangeMapping(modifiedRange, originalRange);
        const changes = [new DetailedLineRangeMapping(new LineRange(1, lines.length), new LineRange(1, 1), [innerChanges])];
        const modifiedModelUri = this.modifiedModel.uri.with({ query: (ChatEditingModifiedNotebookEntry_1.NewModelCounter++).toString(), scheme: 'emptyCell' });
        const modifiedModel = this.modelService.getModel(modifiedModelUri) || this._register(this.modelService.createModel('', null, modifiedModelUri));
        const keep = async () => {
            this._applyEditsSync(() => this.keepPreviouslyDeletedCell(this.originalModel.cells.indexOf(originalCell)));
            this.computeStateAfterAcceptingRejectingChanges(true);
            return true;
        };
        const undo = async () => {
            this._applyEditsSync(() => this.undoPreviouslyDeletedCell(this.originalModel.cells.indexOf(originalCell), originalCell));
            this.computeStateAfterAcceptingRejectingChanges(false);
            return true;
        };
        // This will be deleted.
        return {
            type: 'delete',
            modifiedCellIndex: undefined,
            originalCellIndex,
            originalModel: new ObservablePromise(this.resolveCellModel(originalCell.uri)),
            modifiedModel: new ObservablePromise(Promise.resolve(modifiedModel)),
            keep,
            undo,
            diff: observableValue('cellDiff', {
                changes,
                identical: false,
                moves: [],
                quitEarly: false,
            })
        };
    }
    undoPreviouslyInsertedCell(cell) {
        let diffs = [];
        this._applyEditsSync(() => {
            const index = this.modifiedModel.cells.indexOf(cell);
            diffs = adjustCellDiffForRevertingAnInsertedCell(index, this._cellsDiffInfo.get(), this.modifiedModel.applyEdits.bind(this.modifiedModel));
        });
        this.disposeDeletedCellEntries();
        this.updateCellDiffInfo(diffs, undefined);
    }
    keepPreviouslyInsertedCell(cell) {
        const modifiedCellIndex = this.modifiedModel.cells.indexOf(cell);
        if (modifiedCellIndex === -1) {
            // Not possible.
            return;
        }
        const cellToInsert = {
            cellKind: cell.cellKind,
            language: cell.language,
            metadata: cell.metadata,
            outputs: cell.outputs,
            source: cell.getValue(),
            mime: cell.mime,
            internalMetadata: {
                internalId: cell.internalMetadata.internalId
            }
        };
        this.cellEntryMap.get(cell.uri)?.dispose();
        this.cellEntryMap.delete(cell.uri);
        const cellDiffs = adjustCellDiffForKeepingAnInsertedCell(modifiedCellIndex, this._cellsDiffInfo.get().slice(), cellToInsert, this.originalModel.applyEdits.bind(this.originalModel), this.createModifiedCellDiffInfo.bind(this));
        this.updateCellDiffInfo(cellDiffs, undefined);
    }
    undoPreviouslyDeletedCell(deletedOriginalIndex, originalCell) {
        const cellToInsert = {
            cellKind: originalCell.cellKind,
            language: originalCell.language,
            metadata: originalCell.metadata,
            outputs: originalCell.outputs,
            source: originalCell.getValue(),
            mime: originalCell.mime,
            internalMetadata: {
                internalId: originalCell.internalMetadata.internalId
            }
        };
        let cellDiffs = [];
        this._applyEditsSync(() => {
            cellDiffs = adjustCellDiffForRevertingADeletedCell(deletedOriginalIndex, this._cellsDiffInfo.get(), cellToInsert, this.modifiedModel.applyEdits.bind(this.modifiedModel), this.createModifiedCellDiffInfo.bind(this));
        });
        this.updateCellDiffInfo(cellDiffs, undefined);
    }
    keepPreviouslyDeletedCell(deletedOriginalIndex) {
        // Delete this cell from original as well.
        const edit = { cells: [], count: 1, editType: 1 /* CellEditType.Replace */, index: deletedOriginalIndex, };
        this.originalModel.applyEdits([edit], true, undefined, () => undefined, undefined, false);
        const diffs = sortCellChanges(this._cellsDiffInfo.get())
            .filter(d => !(d.type === 'delete' && d.originalCellIndex === deletedOriginalIndex))
            .map(diff => {
            if (diff.type !== 'insert' && diff.originalCellIndex > deletedOriginalIndex) {
                return {
                    ...diff,
                    originalCellIndex: diff.originalCellIndex - 1,
                };
            }
            return diff;
        });
        this.updateCellDiffInfo(diffs, undefined);
    }
    async _applyEdits(operation) {
        // make the actual edit
        this._isEditFromUs = true;
        try {
            await operation();
        }
        finally {
            this._isEditFromUs = false;
        }
    }
    _applyEditsSync(operation) {
        // make the actual edit
        this._isEditFromUs = true;
        try {
            operation();
        }
        finally {
            this._isEditFromUs = false;
        }
    }
    createSnapshot(requestId, undoStop) {
        return {
            resource: this.modifiedURI,
            languageId: SnapshotLanguageId,
            snapshotUri: getNotebookSnapshotFileURI(this._telemetryInfo.sessionId, requestId, undoStop, this.modifiedURI.path, this.modifiedModel.viewType),
            original: createSnapshot(this.originalModel, this.transientOptions, this.configurationService),
            current: createSnapshot(this.modifiedModel, this.transientOptions, this.configurationService),
            originalToCurrentEdit: OffsetEdit.empty,
            state: this.state.get(),
            telemetryInfo: this.telemetryInfo,
        };
    }
    equalsSnapshot(snapshot) {
        return !!snapshot &&
            isEqual(this.modifiedURI, snapshot.resource) &&
            this.state.get() === snapshot.state &&
            new SnapshotComparer(snapshot.original).isEqual(this.originalModel) &&
            new SnapshotComparer(snapshot.current).isEqual(this.modifiedModel);
    }
    restoreFromSnapshot(snapshot, restoreToDisk = true) {
        this.updateCellDiffInfo([], undefined);
        this._stateObs.set(snapshot.state, undefined);
        restoreSnapshot(this.originalModel, snapshot.original);
        if (restoreToDisk) {
            this.restoreSnapshotInModifiedModel(snapshot.current);
        }
        this.initializeModelsFromDiff();
    }
    resetToInitialContent() {
        this.updateCellDiffInfo([], undefined);
        this.restoreSnapshotInModifiedModel(this.initialContent);
        this.initializeModelsFromDiff();
    }
    restoreSnapshotInModifiedModel(snapshot) {
        if (snapshot === createSnapshot(this.modifiedModel, this.transientOptions, this.configurationService)) {
            return;
        }
        this._applyEditsSync(() => {
            // See private _setDocValue in chatEditingModifiedDocumentEntry.ts
            this.modifiedModel.pushStackElement();
            restoreSnapshot(this.modifiedModel, snapshot);
            this.modifiedModel.pushStackElement();
        });
    }
    async resolveCellModel(cellURI) {
        const cell = this.originalModel.cells.concat(this.modifiedModel.cells).find(cell => isEqual(cell.uri, cellURI));
        if (!cell) {
            throw new Error('Cell not found');
        }
        const model = this.cellTextModelMap.get(cell.uri) || this._register(await this.textModelService.createModelReference(cell.uri)).object.textEditorModel;
        this.cellTextModelMap.set(cell.uri, model);
        return model;
    }
    getOrCreateModifiedTextFileEntryForCell(cell, modifiedCellModel, originalCellModel) {
        let cellEntry = this.cellEntryMap.get(cell.uri);
        if (cellEntry) {
            return cellEntry;
        }
        const disposables = new DisposableStore();
        cellEntry = this._register(this._instantiationService.createInstance(ChatEditingNotebookCellEntry, this.modifiedResourceRef.object.resource, cell, modifiedCellModel, originalCellModel, disposables));
        this.cellEntryMap.set(cell.uri, cellEntry);
        disposables.add(autorun(r => {
            if (this.modifiedModel.cells.indexOf(cell) === -1) {
                return;
            }
            const diffs = this.cellsDiffInfo.get().slice();
            const index = this.modifiedModel.cells.indexOf(cell);
            let entry = diffs.find(entry => entry.modifiedCellIndex === index);
            if (!entry) {
                // Not possible.
                return;
            }
            const entryIndex = diffs.indexOf(entry);
            entry.diff.set(cellEntry.diffInfo.read(r), undefined);
            if (cellEntry.diffInfo.get().identical && entry.type === 'modified') {
                entry = {
                    ...entry,
                    type: 'unchanged',
                };
            }
            if (!cellEntry.diffInfo.get().identical && entry.type === 'unchanged') {
                entry = {
                    ...entry,
                    type: 'modified',
                };
            }
            diffs.splice(entryIndex, 1, { ...entry });
            transaction(tx => {
                this.updateCellDiffInfo(diffs, tx);
            });
        }));
        disposables.add(autorun(r => {
            if (this.modifiedModel.cells.indexOf(cell) === -1) {
                return;
            }
            const cellState = cellEntry.state.read(r);
            if (cellState === 1 /* WorkingSetEntryState.Accepted */) {
                this.computeStateAfterAcceptingRejectingChanges(true);
            }
            else if (cellState === 2 /* WorkingSetEntryState.Rejected */) {
                this.computeStateAfterAcceptingRejectingChanges(false);
            }
        }));
        return cellEntry;
    }
};
ChatEditingModifiedNotebookEntry = ChatEditingModifiedNotebookEntry_1 = __decorate([
    __param(7, IConfigurationService),
    __param(8, IFilesConfigurationService),
    __param(9, IChatService),
    __param(10, IFileService),
    __param(11, IInstantiationService),
    __param(12, ITextModelService),
    __param(13, IModelService),
    __param(14, IUndoRedoService),
    __param(15, INotebookEditorWorkerService),
    __param(16, INotebookLoggingService),
    __param(17, INotebookEditorModelResolverService)
], ChatEditingModifiedNotebookEntry);
export { ChatEditingModifiedNotebookEntry };
function generateCellHash(cellUri) {
    const hash = new StringSHA1();
    hash.update(cellUri.toString());
    return hash.digest().substring(0, 8);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEVkaXRpbmdNb2RpZmllZE5vdGVib29rRW50cnkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY2hhdEVkaXRpbmcvY2hhdEVkaXRpbmdNb2RpZmllZE5vdGVib29rRW50cnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUN0RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUMvRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDaEUsT0FBTyxFQUFFLGVBQWUsRUFBYyxNQUFNLHlDQUF5QyxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxXQUFXLEVBQUUsV0FBVyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDN0UsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2hFLE9BQU8sRUFBNkIsZUFBZSxFQUFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUMvSSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDbEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRWpFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDM0UsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQzdFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUNuRSxPQUFPLEVBQUUs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