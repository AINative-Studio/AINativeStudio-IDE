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
var ChatEditingModifiedDocumentEntry_1;
import { assert } from '../../../../../base/common/assert.js';
import { RunOnceScheduler } from '../../../../../base/common/async.js';
import { MutableDisposable, toDisposable } from '../../../../../base/common/lifecycle.js';
import { observableValue, autorun, transaction } from '../../../../../base/common/observable.js';
import { isEqual } from '../../../../../base/common/resources.js';
import { themeColorFromId } from '../../../../../base/common/themables.js';
import { assertType } from '../../../../../base/common/types.js';
import { getCodeEditor } from '../../../../../editor/browser/editorBrowser.js';
import { EditOperation } from '../../../../../editor/common/core/editOperation.js';
import { OffsetEdit } from '../../../../../editor/common/core/offsetEdit.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { nullDocumentDiff } from '../../../../../editor/common/diff/documentDiffProvider.js';
import { TextEdit } from '../../../../../editor/common/languages.js';
import { ILanguageService } from '../../../../../editor/common/languages/language.js';
import { OverviewRulerLane } from '../../../../../editor/common/model.js';
import { SingleModelEditStackElement } from '../../../../../editor/common/model/editStack.js';
import { ModelDecorationOptions, createTextBufferFactoryFromSnapshot } from '../../../../../editor/common/model/textModel.js';
import { OffsetEdits } from '../../../../../editor/common/model/textModelOffsetEdit.js';
import { IEditorWorkerService } from '../../../../../editor/common/services/editorWorker.js';
import { IModelService } from '../../../../../editor/common/services/model.js';
import { ITextModelService } from '../../../../../editor/common/services/resolverService.js';
import { localize } from '../../../../../nls.js';
import { AccessibilitySignal, IAccessibilitySignalService } from '../../../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IMarkerService } from '../../../../../platform/markers/common/markers.js';
import { observableConfigValue } from '../../../../../platform/observable/common/platformObservableUtils.js';
import { editorSelectionBackground } from '../../../../../platform/theme/common/colorRegistry.js';
import { IUndoRedoService } from '../../../../../platform/undoRedo/common/undoRedo.js';
import { IFilesConfigurationService } from '../../../../services/filesConfiguration/common/filesConfigurationService.js';
import { ITextFileService, stringToSnapshot } from '../../../../services/textfile/common/textfiles.js';
import { IChatService } from '../../common/chatService.js';
import { ChatEditingCodeEditorIntegration } from './chatEditingCodeEditorIntegration.js';
import { AbstractChatEditingModifiedFileEntry, pendingRewriteMinimap } from './chatEditingModifiedFileEntry.js';
import { ChatEditingSnapshotTextModelContentProvider, ChatEditingTextModelContentProvider } from './chatEditingTextModelContentProviders.js';
let ChatEditingModifiedDocumentEntry = class ChatEditingModifiedDocumentEntry extends AbstractChatEditingModifiedFileEntry {
    static { ChatEditingModifiedDocumentEntry_1 = this; }
    static { this._lastEditDecorationOptions = ModelDecorationOptions.register({
        isWholeLine: true,
        description: 'chat-last-edit',
        className: 'chat-editing-last-edit-line',
        marginClassName: 'chat-editing-last-edit',
        overviewRuler: {
            position: OverviewRulerLane.Full,
            color: themeColorFromId(editorSelectionBackground)
        },
    }); }
    static { this._pendingEditDecorationOptions = ModelDecorationOptions.register({
        isWholeLine: true,
        description: 'chat-pending-edit',
        className: 'chat-editing-pending-edit',
        minimap: {
            position: 1 /* MinimapPosition.Inline */,
            color: themeColorFromId(pendingRewriteMinimap)
        }
    }); }
    constructor(resourceRef, _multiDiffEntryDelegate, telemetryInfo, kind, initialContent, markerService, modelService, textModelService, languageService, configService, fileConfigService, chatService, _editorWorkerService, _textFileService, fileService, undoRedoService, instantiationService, _accessibilitySignalService) {
        super(resourceRef.object.textEditorModel.uri, telemetryInfo, kind, configService, fileConfigService, chatService, fileService, undoRedoService, instantiationService);
        this._multiDiffEntryDelegate = _multiDiffEntryDelegate;
        this._editorWorkerService = _editorWorkerService;
        this._textFileService = _textFileService;
        this._accessibilitySignalService = _accessibilitySignalService;
        this._edit = OffsetEdit.empty;
        this._isEditFromUs = false;
        this._allEditsAreFromUs = true;
        this._diffOperationIds = 0;
        this._diffInfo = observableValue(this, nullDocumentDiff);
        this.changesCount = this._diffInfo.map(diff => diff.changes.length);
        this._editDecorationClear = this._register(new RunOnceScheduler(() => { this._editDecorations = this.modifiedModel.deltaDecorations(this._editDecorations, []); }, 500));
        this._editDecorations = [];
        this.docFileEditorModel = this._register(resourceRef).object;
        this.modifiedModel = resourceRef.object.textEditorModel;
        this.originalURI = ChatEditingTextModelContentProvider.getFileURI(telemetryInfo.sessionId, this.entryId, this.modifiedURI.path);
        this.initialContent = initialContent ?? this.modifiedModel.getValue();
        const docSnapshot = this.originalModel = this._register(modelService.createModel(createTextBufferFactoryFromSnapshot(initialContent ? stringToSnapshot(initialContent) : this.modifiedModel.createSnapshot()), languageService.createById(this.modifiedModel.getLanguageId()), this.originalURI, false));
        // Create a reference to this model to avoid it being disposed from under our nose
        (async () => {
            const reference = await textModelService.createModelReference(docSnapshot.uri);
            if (this._store.isDisposed) {
                reference.dispose();
                return;
            }
            this._register(reference);
        })();
        this._register(this.modifiedModel.onDidChangeContent(e => this._mirrorEdits(e)));
        this._register(toDisposable(() => {
            this._clearCurrentEditLineDecoration();
        }));
        this._diffTrimWhitespace = observableConfigValue('diffEditor.ignoreTrimWhitespace', true, configService);
        this._register(autorun(r => {
            this._diffTrimWhitespace.read(r);
            this._updateDiffInfoSeq();
        }));
        const resourceFilter = this._register(new MutableDisposable());
        this._register(autorun(r => {
            const res = this.isCurrentlyBeingModifiedBy.read(r);
            if (res) {
                const req = res.session.getRequests().find(value => value.id === res.requestId);
                resourceFilter.value = markerService.installResourceFilter(this.modifiedURI, req?.message.text || localize('default', "Chat Edits"));
            }
            else {
                resourceFilter.clear();
            }
        }));
    }
    _clearCurrentEditLineDecoration() {
        this._editDecorations = this.modifiedModel.deltaDecorations(this._editDecorations, []);
    }
    equalsSnapshot(snapshot) {
        return !!snapshot &&
            this.modifiedURI.toString() === snapshot.resource.toString() &&
            this.modifiedModel.getLanguageId() === snapshot.languageId &&
            this.originalModel.getValue() === snapshot.original &&
            this.modifiedModel.getValue() === snapshot.current &&
            this._edit.equals(snapshot.originalToCurrentEdit) &&
            this.state.get() === snapshot.state;
    }
    createSnapshot(requestId, undoStop) {
        return {
            resource: this.modifiedURI,
            languageId: this.modifiedModel.getLanguageId(),
            snapshotUri: ChatEditingSnapshotTextModelContentProvider.getSnapshotFileURI(this._telemetryInfo.sessionId, requestId, undoStop, this.modifiedURI.path),
            original: this.originalModel.getValue(),
            current: this.modifiedModel.getValue(),
            originalToCurrentEdit: this._edit,
            state: this.state.get(),
            telemetryInfo: this._telemetryInfo
        };
    }
    restoreFromSnapshot(snapshot, restoreToDisk = true) {
        this._stateObs.set(snapshot.state, undefined);
        this.originalModel.setValue(snapshot.original);
        if (restoreToDisk) {
            this._setDocValue(snapshot.current);
        }
        this._edit = snapshot.originalToCurrentEdit;
        this._updateDiffInfoSeq();
    }
    resetToInitialContent() {
        this._setDocValue(this.initialContent);
    }
    async _areOriginalAndModifiedIdentical() {
        const diff = await this._diffOperation;
        return diff ? diff.identical : false;
    }
    _resetEditsState(tx) {
        super._resetEditsState(tx);
        this._clearCurrentEditLineDecoration();
    }
    _mirrorEdits(event) {
        const edit = OffsetEdits.fromContentChanges(event.changes);
        if (this._isEditFromUs) {
            const e_sum = this._edit;
            const e_ai = edit;
            this._edit = e_sum.compose(e_ai);
        }
        else {
            //           e_ai
            //   d0 ---------------> s0
            //   |                   |
            //   |                   |
            //   | e_user_r          | e_user
            //   |                   |
            //   |                   |
            //   v       e_ai_r      v
            ///  d1 ---------------> s1
            //
            // d0 - document snapshot
            // s0 - document
            // e_ai - ai edits
            // e_user - user edits
            //
            const e_ai = this._edit;
            const e_user = edit;
            const e_user_r = e_user.tryRebase(e_ai.inverse(this.originalModel.getValue()), true);
            if (e_user_r === undefined) {
                // user edits overlaps/conflicts with AI edits
                this._edit = e_ai.compose(e_user);
            }
            else {
                const edits = OffsetEdits.asEditOperations(e_user_r, this.originalModel);
                this.originalModel.applyEdits(edits);
                this._edit = e_ai.tryRebase(e_user_r);
            }
            this._allEditsAreFromUs = false;
            this._updateDiffInfoSeq();
            const didResetToOriginalContent = this.modifiedModel.getValue() === this.initialContent;
            const currentState = this._stateObs.get();
            switch (currentState) {
                case 0 /* WorkingSetEntryState.Modified */:
                    if (didResetToOriginalContent) {
                        this._stateObs.set(2 /* WorkingSetEntryState.Rejected */, undefined);
                        break;
                    }
            }
        }
    }
    _createUndoRedoElement(response) {
        const request = response.session.getRequests().find(req => req.id === response.requestId);
        const label = request?.message.text ? localize('chatEditing1', "Chat Edit: '{0}'", request.message.text) : localize('chatEditing2', "Chat Edit");
        return new SingleModelEditStackElement(label, 'chat.edit', this.modifiedModel, null);
    }
    async acceptAgentEdits(resource, textEdits, isLastEdits, responseModel) {
        assertType(textEdits.every(TextEdit.isTextEdit), 'INVALID args, can only handle text edits');
        assert(isEqual(resource, this.modifiedURI), ' INVALID args, can only edit THIS document');
        const ops = textEdits.map(TextEdit.asEditOperation);
        const undoEdits = this._applyEdits(ops);
        const maxLineNumber = undoEdits.reduce((max, op) => Math.max(max, op.range.startLineNumber), 0);
        const newDecorations = [
            // decorate pending edit (region)
            {
                options: ChatEditingModifiedDocumentEntry_1._pendingEditDecorationOptions,
                range: new Range(maxLineNumber + 1, 1, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER)
            }
        ];
        if (maxLineNumber > 0) {
            // decorate last edit
            newDecorations.push({
                options: ChatEditingModifiedDocumentEntry_1._lastEditDecorationOptions,
                range: new Range(maxLineNumber, 1, maxLineNumber, Number.MAX_SAFE_INTEGER)
            });
        }
        this._editDecorations = this.modifiedModel.deltaDecorations(this._editDecorations, newDecorations);
        transaction((tx) => {
            if (!isLastEdits) {
                this._stateObs.set(0 /* WorkingSetEntryState.Modified */, tx);
                this._isCurrentlyBeingModifiedByObs.set(responseModel, tx);
                const lineCount = this.modifiedModel.getLineCount();
                this._rewriteRatioObs.set(Math.min(1, maxLineNumber / lineCount), tx);
            }
            else {
                this._resetEditsState(tx);
                this._updateDiffInfoSeq();
                this._rewriteRatioObs.set(1, tx);
                this._editDecorationClear.schedule();
            }
        });
    }
    async _acceptHunk(change) {
        if (!this._diffInfo.get().changes.includes(change)) {
            // diffInfo should have model version ids and check them (instead of the caller doing that)
            return false;
        }
        const edits = [];
        for (const edit of change.innerChanges ?? []) {
            const newText = this.modifiedModel.getValueInRange(edit.modifiedRange);
            edits.push(EditOperation.replace(edit.originalRange, newText));
        }
        this.originalModel.pushEditOperations(null, edits, _ => null);
        await this._updateDiffInfoSeq();
        if (this._diffInfo.get().identical) {
            this._stateObs.set(1 /* WorkingSetEntryState.Accepted */, undefined);
        }
        this._accessibilitySignalService.playSignal(AccessibilitySignal.editsKept, { allowManyInParallel: true });
        return true;
    }
    async _rejectHunk(change) {
        if (!this._diffInfo.get().changes.includes(change)) {
            return false;
        }
        const edits = [];
        for (const edit of change.innerChanges ?? []) {
            const newText = this.originalModel.getValueInRange(edit.originalRange);
            edits.push(EditOperation.replace(edit.modifiedRange, newText));
        }
        this.modifiedModel.pushEditOperations(null, edits, _ => null);
        await this._updateDiffInfoSeq();
        if (this._diffInfo.get().identical) {
            this._stateObs.set(2 /* WorkingSetEntryState.Rejected */, undefined);
        }
        this._accessibilitySignalService.playSignal(AccessibilitySignal.editsUndone, { allowManyInParallel: true });
        return true;
    }
    _applyEdits(edits) {
        // make the actual edit
        this._isEditFromUs = true;
        try {
            let result = [];
            this.modifiedModel.pushEditOperations(null, edits, (undoEdits) => {
                result = undoEdits;
                return null;
            });
            return result;
        }
        finally {
            this._isEditFromUs = false;
        }
    }
    async _updateDiffInfoSeq() {
        const myDiffOperationId = ++this._diffOperationIds;
        await Promise.resolve(this._diffOperation);
        if (this._diffOperationIds === myDiffOperationId) {
            const thisDiffOperation = this._updateDiffInfo();
            this._diffOperation = thisDiffOperation;
            await thisDiffOperation;
        }
    }
    async _updateDiffInfo() {
        if (this.originalModel.isDisposed() || this.modifiedModel.isDisposed()) {
            return undefined;
        }
        const docVersionNow = this.modifiedModel.getVersionId();
        const snapshotVersionNow = this.originalModel.getVersionId();
        const ignoreTrimWhitespace = this._diffTrimWhitespace.get();
        const diff = await this._editorWorkerService.computeDiff(this.originalModel.uri, this.modifiedModel.uri, { ignoreTrimWhitespace, computeMoves: false, maxComputationTimeMs: 3000 }, 'advanced');
        if (this.originalModel.isDisposed() || this.modifiedModel.isDisposed()) {
            return undefined;
        }
        // only update the diff if the documents didn't change in the meantime
        if (this.modifiedModel.getVersionId() === docVersionNow && this.originalModel.getVersionId() === snapshotVersionNow) {
            const diff2 = diff ?? nullDocumentDiff;
            this._diffInfo.set(diff2, undefined);
            this._edit = OffsetEdits.fromLineRangeMapping(this.originalModel, this.modifiedModel, diff2.changes);
            return diff2;
        }
        return undefined;
    }
    async _doAccept(tx) {
        this.originalModel.setValue(this.modifiedModel.createSnapshot());
        this._diffInfo.set(nullDocumentDiff, tx);
        this._edit = OffsetEdit.empty;
        await this._collapse(tx);
        const config = this._fileConfigService.getAutoSaveConfiguration(this.modifiedURI);
        if (!config.autoSave || !this._textFileService.isDirty(this.modifiedURI)) {
            // SAVE after accept for manual-savers, for auto-savers
            // trigger explict save to get save participants going
            try {
                await this._textFileService.save(this.modifiedURI, {
                    reason: 1 /* SaveReason.EXPLICIT */,
                    force: true,
                    ignoreErrorHandler: true
                });
            }
            catch {
                // ignored
            }
        }
    }
    async _doReject(tx) {
        if (this.createdInRequestId === this._telemetryInfo.requestId) {
            await this.docFileEditorModel.revert({ soft: true });
            await this._fileService.del(this.modifiedURI);
            this._onDidDelete.fire();
        }
        else {
            this._setDocValue(this.originalModel.getValue());
            if (this._allEditsAreFromUs) {
                // save the file after discarding so that the dirty indicator goes away
                // and so that an intermediate saved state gets reverted
                await this.docFileEditorModel.save({ reason: 1 /* SaveReason.EXPLICIT */, skipSaveParticipants: true });
            }
            await this._collapse(tx);
        }
    }
    _setDocValue(value) {
        if (this.modifiedModel.getValue() !== value) {
            this.modifiedModel.pushStackElement();
            const edit = EditOperation.replace(this.modifiedModel.getFullModelRange(), value);
            this._applyEdits([edit]);
            this._updateDiffInfoSeq();
            this.modifiedModel.pushStackElement();
        }
    }
    async _collapse(transaction) {
        this._multiDiffEntryDelegate.collapse(transaction);
    }
    _createEditorIntegration(editor) {
        const codeEditor = getCodeEditor(editor.getControl());
        assertType(codeEditor);
        const diffInfo = this._diffInfo.map(value => {
            return {
                ...value,
                originalModel: this.originalModel,
                modifiedModel: this.modifiedModel,
                keep: changes => this._acceptHunk(changes),
                undo: changes => this._rejectHunk(changes)
            };
        });
        return this._instantiationService.createInstance(ChatEditingCodeEditorIntegration, this, codeEditor, diffInfo);
    }
};
ChatEditingModifiedDocumentEntry = ChatEditingModifiedDocumentEntry_1 = __decorate([
    __param(5, IMarkerService),
    __param(6, IModelService),
    __param(7, ITextModelService),
    __param(8, ILanguageService),
    __param(9, IConfigurationService),
    __param(10, IFilesConfigurationService),
    __param(11, IChatService),
    __param(12, IEditorWorkerService),
    __param(13, ITextFileService),
    __param(14, IFileService),
    __param(15, IUndoRedoService),
    __param(16, IInstantiationService),
    __param(17, IAccessibilitySignalService)
], ChatEditingModifiedDocumentEntry);
export { ChatEditingModifiedDocumentEntry };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEVkaXRpbmdNb2RpZmllZERvY3VtZW50RW50cnkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXRFZGl0aW5nL2NoYXRFZGl0aW5nTW9kaWZpZWREb2N1bWVudEVudHJ5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDOUQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDdkUsT0FBTyxFQUFjLGlCQUFpQixFQUFFLFlBQVksRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxlQUFlLEVBQTZCLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUM1SCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDbEUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDM0UsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRWpFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUMvRSxPQUFPLEVBQXdCLGFBQWEsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQ3pHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUM3RSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDbkUsT0FBTyxFQUFpQixnQkFBZ0IsRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBRTVHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUNyRSxPQUFPLEVBQUUsZ0JB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