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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEVkaXRpbmdNb2RpZmllZE5vdGVib29rRW50cnkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXRFZGl0aW5nL2NoYXRFZGl0aW5nTW9kaWZpZWROb3RlYm9va0VudHJ5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDdEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDL0UsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxlQUFlLEVBQWMsTUFBTSx5Q0FBeUMsQ0FBQztBQUN0RixPQUFPLEVBQUUsV0FBVyxFQUFFLFdBQVcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzdFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNoRSxPQUFPLEVBQTZCLGVBQWUsRUFBRSxPQUFPLEVBQUUsV0FBVyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDL0ksT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUVqRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDbEUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQzNFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUM3RSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDbkUsT0FBTyxFQUFF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