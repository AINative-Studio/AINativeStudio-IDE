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
var ChatEditingNotebookCellEntry_1;
import { RunOnceScheduler } from '../../../../../../base/common/async.js';
import { toDisposable } from '../../../../../../base/common/lifecycle.js';
import { observableValue, autorun, transaction } from '../../../../../../base/common/observable.js';
import { ObservableDisposable } from '../../../../../../base/common/observableDisposable.js';
import { themeColorFromId } from '../../../../../../base/common/themables.js';
import { EditOperation } from '../../../../../../editor/common/core/editOperation.js';
import { OffsetEdit } from '../../../../../../editor/common/core/offsetEdit.js';
import { Range } from '../../../../../../editor/common/core/range.js';
import { nullDocumentDiff } from '../../../../../../editor/common/diff/documentDiffProvider.js';
import { TextEdit } from '../../../../../../editor/common/languages.js';
import { OverviewRulerLane } from '../../../../../../editor/common/model.js';
import { ModelDecorationOptions } from '../../../../../../editor/common/model/textModel.js';
import { OffsetEdits } from '../../../../../../editor/common/model/textModelOffsetEdit.js';
import { IEditorWorkerService } from '../../../../../../editor/common/services/editorWorker.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { observableConfigValue } from '../../../../../../platform/observable/common/platformObservableUtils.js';
import { editorSelectionBackground } from '../../../../../../platform/theme/common/colorRegistry.js';
import { CellEditState } from '../../../../notebook/browser/notebookBrowser.js';
import { INotebookEditorService } from '../../../../notebook/browser/services/notebookEditorService.js';
import { pendingRewriteMinimap } from '../chatEditingModifiedFileEntry.js';
/**
 * This is very closely similar to the ChatEditingModifiedDocumentEntry class.
 * Most of the code has been borrowed from there, as a cell is effectively a document.
 * Hence most of the same functionality applies.
 */
let ChatEditingNotebookCellEntry = class ChatEditingNotebookCellEntry extends ObservableDisposable {
    static { ChatEditingNotebookCellEntry_1 = this; }
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
    get isEditFromUs() {
        return this._isEditFromUs;
    }
    get allEditsAreFromUs() {
        return this._allEditsAreFromUs;
    }
    get diffInfo() {
        return this._diffInfo;
    }
    constructor(notebookUri, cell, modifiedModel, originalModel, disposables, configService, _editorWorkerService, notebookEditorService) {
        super();
        this.notebookUri = notebookUri;
        this.cell = cell;
        this.modifiedModel = modifiedModel;
        this.originalModel = originalModel;
        this._editorWorkerService = _editorWorkerService;
        this.notebookEditorService = notebookEditorService;
        this._edit = OffsetEdit.empty;
        this._isEditFromUs = false;
        this._allEditsAreFromUs = true;
        this._diffOperationIds = 0;
        this._diffInfo = observableValue(this, nullDocumentDiff);
        this._maxModifiedLineNumber = observableValue(this, 0);
        this.maxModifiedLineNumber = this._maxModifiedLineNumber;
        this._editDecorationClear = this._register(new RunOnceScheduler(() => { this._editDecorations = this.modifiedModel.deltaDecorations(this._editDecorations, []); }, 500));
        this._editDecorations = [];
        this._stateObs = observableValue(this, 0 /* WorkingSetEntryState.Modified */);
        this.state = this._stateObs;
        this._isCurrentlyBeingModifiedByObs = observableValue(this, undefined);
        this.isCurrentlyBeingModifiedBy = this._isCurrentlyBeingModifiedByObs;
        this.initialContent = this.originalModel.getValue();
        this._register(disposables);
        this._register(this.modifiedModel.onDidChangeContent(e => {
            this._mirrorEdits(e);
        }));
        this._register(toDisposable(() => {
            this.clearCurrentEditLineDecoration();
        }));
        this._diffTrimWhitespace = observableConfigValue('diffEditor.ignoreTrimWhitespace', true, configService);
        this._register(autorun(r => {
            this._diffTrimWhitespace.read(r);
            this._updateDiffInfoSeq();
        }));
    }
    clearCurrentEditLineDecoration() {
        if (this.modifiedModel.isDisposed()) {
            return;
        }
        this._editDecorations = this.modifiedModel.deltaDecorations(this._editDecorations, []);
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
    acceptAgentEdits(textEdits, isLastEdits, responseModel) {
        const notebookEditor = this.notebookEditorService.retrieveExistingWidgetFromURI(this.notebookUri)?.value;
        if (notebookEditor) {
            const vm = notebookEditor.getCellByHandle(this.cell.handle);
            vm?.updateEditState(CellEditState.Editing, 'chatEdit');
        }
        const ops = textEdits.map(TextEdit.asEditOperation);
        const undoEdits = this._applyEdits(ops);
        const maxLineNumber = undoEdits.reduce((max, op) => Math.max(max, op.range.startLineNumber), 0);
        const newDecorations = [
            // decorate pending edit (region)
            {
                options: ChatEditingNotebookCellEntry_1._pendingEditDecorationOptions,
                range: new Range(maxLineNumber + 1, 1, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER)
            }
        ];
        if (maxLineNumber > 0) {
            // decorate last edit
            newDecorations.push({
                options: ChatEditingNotebookCellEntry_1._lastEditDecorationOptions,
                range: new Range(maxLineNumber, 1, maxLineNumber, Number.MAX_SAFE_INTEGER)
            });
        }
        this._editDecorations = this.modifiedModel.deltaDecorations(this._editDecorations, newDecorations);
        transaction((tx) => {
            if (!isLastEdits) {
                this._stateObs.set(0 /* WorkingSetEntryState.Modified */, tx);
                this._isCurrentlyBeingModifiedByObs.set(responseModel, tx);
                this._maxModifiedLineNumber.set(maxLineNumber, tx);
            }
            else {
                this._resetEditsState(tx);
                this._updateDiffInfoSeq();
                this._maxModifiedLineNumber.set(0, tx);
                this._editDecorationClear.schedule();
            }
        });
    }
    scheduleEditDecorations() {
        this._editDecorationClear.schedule();
    }
    _resetEditsState(tx) {
        this._isCurrentlyBeingModifiedByObs.set(undefined, tx);
        this._maxModifiedLineNumber.set(0, tx);
    }
    async keep(change) {
        return this._acceptHunk(change);
    }
    async _acceptHunk(change) {
        this._isEditFromUs = true;
        try {
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
        }
        finally {
            this._isEditFromUs = false;
        }
        await this._updateDiffInfoSeq();
        if (this._diffInfo.get().identical) {
            this._stateObs.set(1 /* WorkingSetEntryState.Accepted */, undefined);
        }
        return true;
    }
    async undo(change) {
        return this._rejectHunk(change);
    }
    async _rejectHunk(change) {
        this._isEditFromUs = true;
        try {
            if (!this._diffInfo.get().changes.includes(change)) {
                return false;
            }
            const edits = [];
            for (const edit of change.innerChanges ?? []) {
                const newText = this.originalModel.getValueInRange(edit.originalRange);
                edits.push(EditOperation.replace(edit.modifiedRange, newText));
            }
            this.modifiedModel.pushEditOperations(null, edits, _ => null);
        }
        finally {
            this._isEditFromUs = false;
        }
        await this._updateDiffInfoSeq();
        if (this._diffInfo.get().identical) {
            this._stateObs.set(2 /* WorkingSetEntryState.Rejected */, undefined);
        }
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
            return;
        }
        const docVersionNow = this.modifiedModel.getVersionId();
        const snapshotVersionNow = this.originalModel.getVersionId();
        const ignoreTrimWhitespace = this._diffTrimWhitespace.get();
        const diff = await this._editorWorkerService.computeDiff(this.originalModel.uri, this.modifiedModel.uri, { ignoreTrimWhitespace, computeMoves: false, maxComputationTimeMs: 3000 }, 'advanced');
        if (this.originalModel.isDisposed() || this.modifiedModel.isDisposed()) {
            return;
        }
        // only update the diff if the documents didn't change in the meantime
        if (this.modifiedModel.getVersionId() === docVersionNow && this.originalModel.getVersionId() === snapshotVersionNow) {
            const diff2 = diff ?? nullDocumentDiff;
            this._diffInfo.set(diff2, undefined);
            this._edit = OffsetEdits.fromLineRangeMapping(this.originalModel, this.modifiedModel, diff2.changes);
        }
    }
};
ChatEditingNotebookCellEntry = ChatEditingNotebookCellEntry_1 = __decorate([
    __param(5, IConfigurationService),
    __param(6, IEditorWorkerService),
    __param(7, INotebookEditorService)
], ChatEditingNotebookCellEntry);
export { ChatEditingNotebookCellEntry };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEVkaXRpbmdOb3RlYm9va0NlbGxFbnRyeS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY2hhdEVkaXRpbmcvbm90ZWJvb2svY2hhdEVkaXRpbmdOb3RlYm9va0NlbGxFbnRyeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDMUUsT0FBTyxFQUFtQixZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUMzRixPQUFPLEVBQTZCLGVBQWUsRUFBRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDL0gsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDN0YsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFFOUUsT0FBTyxFQUFFLGFBQWEsRUFBd0IsTUFBTSx1REFBdUQsQ0FBQztBQUM1RyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDaEYsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQ3RFLE9BQU8sRUFBaUIsZ0JBQWdCLEVBQUUsTUFBTSw4REFBOEQsQ0FBQztBQUUvRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDeEUsT0FBTyxFQUFzRCxpQkFBaUIsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ2pJLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQzVGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSw4REFBOEQsQ0FBQztBQUMzRixPQUFPLEVBQUUsb0JBQW9C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