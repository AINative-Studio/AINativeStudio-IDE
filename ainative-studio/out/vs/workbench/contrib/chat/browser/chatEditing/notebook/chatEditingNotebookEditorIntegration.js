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
import { Disposable, toDisposable } from '../../../../../../base/common/lifecycle.js';
import { autorun, observableFromEvent, observableValue } from '../../../../../../base/common/observable.js';
import { debouncedObservable } from '../../../../../../base/common/observableInternal/utils.js';
import { basename } from '../../../../../../base/common/resources.js';
import { assertType } from '../../../../../../base/common/types.js';
import { LineRange } from '../../../../../../editor/common/core/lineRange.js';
import { Range } from '../../../../../../editor/common/core/range.js';
import { nullDocumentDiff } from '../../../../../../editor/common/diff/documentDiffProvider.js';
import { localize } from '../../../../../../nls.js';
import { AccessibilitySignal, IAccessibilitySignalService } from '../../../../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
import { MenuId } from '../../../../../../platform/actions/common/actions.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { IEditorService } from '../../../../../services/editor/common/editorService.js';
import { NotebookDeletedCellDecorator } from '../../../../notebook/browser/diff/inlineDiff/notebookDeletedCellDecorator.js';
import { NotebookInsertedCellDecorator } from '../../../../notebook/browser/diff/inlineDiff/notebookInsertedCellDecorator.js';
import { NotebookModifiedCellDecorator } from '../../../../notebook/browser/diff/inlineDiff/notebookModifiedCellDecorator.js';
import { getNotebookEditorFromEditorPane } from '../../../../notebook/browser/notebookBrowser.js';
import { INotebookEditorService } from '../../../../notebook/browser/services/notebookEditorService.js';
import { CellKind } from '../../../../notebook/common/notebookCommon.js';
import { IChatAgentService } from '../../../common/chatAgents.js';
import { ChatAgentLocation } from '../../../common/constants.js';
import { ChatEditingCodeEditorIntegration } from '../chatEditingCodeEditorIntegration.js';
import { countChanges, sortCellChanges } from './notebookCellChanges.js';
let ChatEditingNotebookEditorIntegration = class ChatEditingNotebookEditorIntegration extends Disposable {
    constructor(_entry, editor, notebookModel, originalModel, cellChanges, instantiationService) {
        super();
        this.instantiationService = instantiationService;
        const notebookEditor = getNotebookEditorFromEditorPane(editor);
        assertType(notebookEditor);
        this.notebookEditor = notebookEditor;
        this.integration = this.instantiationService.createInstance(ChatEditingNotebookEditorWidgetIntegration, _entry, notebookEditor, notebookModel, originalModel, cellChanges);
        this._register(editor.onDidChangeControl(() => {
            const notebookEditor = getNotebookEditorFromEditorPane(editor);
            if (notebookEditor && notebookEditor !== this.notebookEditor) {
                this.notebookEditor = notebookEditor;
                this.integration.dispose();
                this.integration = this.instantiationService.createInstance(ChatEditingNotebookEditorWidgetIntegration, _entry, notebookEditor, notebookModel, originalModel, cellChanges);
            }
        }));
    }
    get currentIndex() {
        return this.integration.currentIndex;
    }
    reveal(firstOrLast) {
        return this.integration.reveal(firstOrLast);
    }
    next(wrap) {
        return this.integration.next(wrap);
    }
    previous(wrap) {
        return this.integration.previous(wrap);
    }
    enableAccessibleDiffView() {
        this.integration.enableAccessibleDiffView();
    }
    acceptNearestChange(change) {
        this.integration.acceptNearestChange(change);
    }
    rejectNearestChange(change) {
        this.integration.rejectNearestChange(change);
    }
    toggleDiff(change) {
        return this.integration.toggleDiff(change);
    }
    dispose() {
        this.integration.dispose();
        super.dispose();
    }
};
ChatEditingNotebookEditorIntegration = __decorate([
    __param(5, IInstantiationService)
], ChatEditingNotebookEditorIntegration);
export { ChatEditingNotebookEditorIntegration };
let ChatEditingNotebookEditorWidgetIntegration = class ChatEditingNotebookEditorWidgetIntegration extends Disposable {
    constructor(_entry, notebookEditor, notebookModel, originalModel, cellChanges, instantiationService, _editorService, _chatAgentService, notebookEditorService, accessibilitySignalService) {
        super();
        this._entry = _entry;
        this.notebookEditor = notebookEditor;
        this.notebookModel = notebookModel;
        this.cellChanges = cellChanges;
        this.instantiationService = instantiationService;
        this._editorService = _editorService;
        this._chatAgentService = _chatAgentService;
        this.accessibilitySignalService = accessibilitySignalService;
        this._currentIndex = observableValue(this, -1);
        this.currentIndex = this._currentIndex;
        this._currentChange = observableValue(this, undefined);
        this.currentChange = this._currentChange;
        this.cellEditorIntegrations = new Map();
        this.mdCellEditorAttached = observableValue(this, -1);
        this.markupCellListeners = new Map();
        const onDidChangeVisibleRanges = debouncedObservable(observableFromEvent(notebookEditor.onDidChangeVisibleRanges, () => notebookEditor.visibleRanges), 50);
        this._register(toDisposable(() => {
            this.markupCellListeners.forEach((v) => v.dispose());
        }));
        let originalReadonly = undefined;
        const shouldBeReadonly = _entry.isCurrentlyBeingModifiedBy.map(value => !!value);
        this._register(autorun(r => {
            const isReadOnly = shouldBeReadonly.read(r);
            const notebookEditor = notebookEditorService.retrieveExistingWidgetFromURI(_entry.modifiedURI)?.value;
            if (!notebookEditor) {
                return;
            }
            originalReadonly ??= notebookEditor.isReadOnly;
            if (isReadOnly) {
                notebookEditor.setOptions({ isReadOnly: true });
            }
            else if (originalReadonly === false) {
                notebookEditor.setOptions({ isReadOnly: false });
                // Ensure all cells area editable.
                // We make use of chatEditingCodeEditorIntegration to handle cell diffing and navigation.
                // However that also makes the cell read-only. We need to ensure that the cell is editable.
                // E.g. first we make notebook readonly (in here), then cells end up being readonly because notebook is readonly.
                // Then chatEditingCodeEditorIntegration makes cells readonly and keeps track of the original readonly state.
                // However the cell is already readonly because the notebook is readonly.
                // So when we restore the notebook to editable (in here), the cell is made editable again.
                // But when chatEditingCodeEditorIntegration attempts to restore, it will restore the original readonly state.
                // & from the perpspective of chatEditingCodeEditorIntegration, the cell was readonly & should continue to be readonly.
                // To get around this, we wait for a few ms before restoring the original readonly state for each cell.
                const timeout = setTimeout(() => {
                    notebookEditor.setOptions({ isReadOnly: true });
                    notebookEditor.setOptions({ isReadOnly: false });
                    disposable.dispose();
                }, 100);
                const disposable = toDisposable(() => clearTimeout(timeout));
                this._register(disposable);
            }
        }));
        // INIT when not streaming nor diffing the response anymore, once per request, and when having changes
        let lastModifyingRequestId;
        this._store.add(autorun(r => {
            if (!_entry.isCurrentlyBeingModifiedBy.read(r)
                && !_entry.isProcessingResponse.read(r)
                && lastModifyingRequestId !== _entry.lastModifyingRequestId
                && cellChanges.read(r).some(c => c.type !== 'unchanged' && !c.diff.read(r).identical)) {
                lastModifyingRequestId = _entry.lastModifyingRequestId;
                this.reveal(true);
            }
        }));
        // Build cell integrations (responsible for navigating changes within a cell and decorating cell text changes)
        this._register(autorun(r => {
            if (this.notebookEditor.textModel !== this.notebookModel) {
                return;
            }
            const sortedCellChanges = sortCellChanges(cellChanges.read(r));
            const changes = sortedCellChanges.filter(c => c.type !== 'delete');
            onDidChangeVisibleRanges.read(r);
            if (!changes.length) {
                this.cellEditorIntegrations.forEach(({ diff }) => {
                    diff.set({ ...diff.get(), ...nullDocumentDiff }, undefined);
                });
                return;
            }
            this.mdCellEditorAttached.read(r);
            const validCells = new Set();
            changes.forEach((change) => {
                if (change.modifiedCellIndex === undefined || change.modifiedCellIndex >= notebookModel.cells.length) {
                    return;
                }
                const cell = notebookModel.cells[change.modifiedCellIndex];
                const editor = notebookEditor.codeEditors.find(([vm,]) => vm.handle === notebookModel.cells[change.modifiedCellIndex].handle)?.[1];
                const modifiedModel = change.modifiedModel.promiseResult.read(r)?.data;
                const originalModel = change.originalModel.promiseResult.read(r)?.data;
                if (!cell || !originalModel || !modifiedModel) {
                    return;
                }
                if (!editor) {
                    if (!this.markupCellListeners.has(cell.handle) && cell.cellKind === CellKind.Markup) {
                        const cellModel = this.notebookEditor.getViewModel()?.viewCells.find(c => c.handle === cell.handle);
                        if (cellModel) {
                            const listener = cellModel.onDidChangeEditorAttachState(() => {
                                if (cellModel.editorAttached) {
                                    this.mdCellEditorAttached.set(cell.handle, undefined);
                                    listener.dispose();
                                    this.markupCellListeners.delete(cell.handle);
                                }
                            });
                            this.markupCellListeners.set(cell.handle, listener);
                        }
                    }
                    return;
                }
                const diff = {
                    ...change.diff.read(r),
                    modifiedModel,
                    originalModel,
                    keep: change.keep,
                    undo: change.undo
                };
                validCells.add(cell);
                const currentDiff = this.cellEditorIntegrations.get(cell);
                if (currentDiff) {
                    // Do not unnecessarily trigger a change event
                    if (!areDocumentDiff2Equal(currentDiff.diff.get(), diff)) {
                        currentDiff.diff.set(diff, undefined);
                    }
                }
                else {
                    const diff2 = observableValue(`diff${cell.handle}`, diff);
                    const integration = this.instantiationService.createInstance(ChatEditingCodeEditorIntegration, _entry, editor, diff2);
                    this.cellEditorIntegrations.set(cell, { integration, diff: diff2 });
                    this._register(integration);
                    this._register(editor.onDidDispose(() => {
                        this.cellEditorIntegrations.get(cell)?.integration.dispose();
                        this.cellEditorIntegrations.delete(cell);
                    }));
                    this._register(editor.onDidChangeModel(() => {
                        if (editor.getModel() !== cell.textModel) {
                            this.cellEditorIntegrations.get(cell)?.integration.dispose();
                            this.cellEditorIntegrations.delete(cell);
                        }
                    }));
                }
            });
            // Dispose old integrations as the editors are no longer valid.
            this.cellEditorIntegrations.forEach((v, cell) => {
                if (!validCells.has(cell)) {
                    v.integration.dispose();
                    this.cellEditorIntegrations.delete(cell);
                }
            });
        }));
        this._register(autorun(r => {
            const currentChange = this.currentChange.read(r);
            if (!currentChange) {
                this._currentIndex.set(-1, undefined);
                return;
            }
            let index = 0;
            const sortedCellChanges = sortCellChanges(cellChanges.read(r));
            for (const change of sortedCellChanges) {
                if (currentChange && currentChange.change === change) {
                    if (change.type === 'modified') {
                        index += currentChange.index;
                    }
                    break;
                }
                if (change.type === 'insert' || change.type === 'delete') {
                    index++;
                }
                else if (change.type === 'modified') {
                    index += change.diff.read(r).changes.length;
                }
            }
            this._currentIndex.set(index, undefined);
        }));
        const cellsAreVisible = onDidChangeVisibleRanges.map(v => v.length > 0);
        const debouncedChanges = debouncedObservable(cellChanges, 10);
        this._register(autorun(r => {
            if (this.notebookEditor.textModel !== this.notebookModel || !cellsAreVisible.read(r) || !this.notebookEditor.getViewModel()) {
                return;
            }
            // We can have inserted cells that have been accepted, in those cases we do not want any decorators on them.
            const changes = debouncedChanges.read(r).filter(c => c.type === 'insert' ? !c.diff.read(r).identical : true);
            const modifiedChanges = changes.filter(c => c.type === 'modified');
            this.createDecorators();
            this.insertedCellDecorator?.apply(changes);
            this.modifiedCellDecorator?.apply(modifiedChanges);
            this.deletedCellDecorator?.apply(changes, originalModel);
        }));
    }
    createDecorators() {
        const cellChanges = this.cellChanges.get();
        const accessibilitySignalService = this.accessibilitySignalService;
        this.insertedCellDecorator ??= this._register(this.instantiationService.createInstance(NotebookInsertedCellDecorator, this.notebookEditor));
        this.modifiedCellDecorator ??= this._register(this.instantiationService.createInstance(NotebookModifiedCellDecorator, this.notebookEditor));
        if (this.deletedCellDecorator) {
            this._store.delete(this.deletedCellDecorator);
            this.deletedCellDecorator.dispose();
        }
        this.deletedCellDecorator = this._register(this.instantiationService.createInstance(NotebookDeletedCellDecorator, this.notebookEditor, {
            className: 'chat-diff-change-content-widget',
            telemetrySource: 'chatEditingNotebookHunk',
            menuId: MenuId.ChatEditingEditorHunk,
            argFactory: (deletedCellIndex) => {
                return {
                    accept() {
                        const entry = cellChanges.find(c => c.type === 'delete' && c.originalCellIndex === deletedCellIndex);
                        if (entry) {
                            return entry.keep(entry.diff.get().changes[0]);
                        }
                        accessibilitySignalService.playSignal(AccessibilitySignal.editsKept, { allowManyInParallel: true });
                        return Promise.resolve(true);
                    },
                    reject() {
                        const entry = cellChanges.find(c => c.type === 'delete' && c.originalCellIndex === deletedCellIndex);
                        if (entry) {
                            return entry.undo(entry.diff.get().changes[0]);
                        }
                        accessibilitySignalService.playSignal(AccessibilitySignal.editsUndone, { allowManyInParallel: true });
                        return Promise.resolve(true);
                    },
                };
            }
        }));
    }
    getCell(modifiedCellIndex) {
        const cell = this.notebookModel.cells[modifiedCellIndex];
        const integration = this.cellEditorIntegrations.get(cell)?.integration;
        return integration;
    }
    reveal(firstOrLast) {
        const changes = sortCellChanges(this.cellChanges.get().filter(c => c.type !== 'unchanged'));
        if (!changes.length) {
            return undefined;
        }
        const change = firstOrLast ? changes[0] : changes[changes.length - 1];
        this._revealFirstOrLast(change, firstOrLast);
    }
    _revealFirstOrLast(change, firstOrLast = true) {
        switch (change.type) {
            case 'insert':
            case 'modified':
                {
                    const index = firstOrLast || change.type === 'insert' ? 0 : change.diff.get().changes.length - 1;
                    const cellIntegration = this.getCell(change.modifiedCellIndex);
                    if (cellIntegration) {
                        cellIntegration.reveal(firstOrLast);
                        this._currentChange.set({ change: change, index }, undefined);
                        return true;
                    }
                    else {
                        return this._revealChange(change, index);
                    }
                }
            case 'delete':
                // reveal the deleted cell decorator
                this.deletedCellDecorator?.reveal(change.originalCellIndex);
                this._currentChange.set({ change: change, index: 0 }, undefined);
                return true;
            default:
                break;
        }
        return false;
    }
    _revealChange(change, indexInCell) {
        switch (change.type) {
            case 'insert':
            case 'modified':
                {
                    const textChange = change.diff.get().changes[indexInCell];
                    const cellViewModel = this.getCellViewModel(change);
                    if (cellViewModel) {
                        this.revealChangeInView(cellViewModel, textChange?.modified);
                        this._currentChange.set({ change: change, index: indexInCell }, undefined);
                    }
                    return true;
                }
            case 'delete':
                // reveal the deleted cell decorator
                this.deletedCellDecorator?.reveal(change.originalCellIndex);
                this._currentChange.set({ change: change, index: 0 }, undefined);
                return true;
            default:
                break;
        }
        return false;
    }
    getCellViewModel(change) {
        if (change.type === 'delete' || change.modifiedCellIndex === undefined) {
            return undefined;
        }
        const cell = this.notebookModel.cells[change.modifiedCellIndex];
        const cellViewModel = this.notebookEditor.getViewModel()?.viewCells.find(c => c.handle === cell.handle);
        return cellViewModel;
    }
    async revealChangeInView(cell, lines) {
        const targetLines = lines ?? new LineRange(0, 0);
        await this.notebookEditor.focusNotebookCell(cell, 'container', { focusEditorLine: targetLines.startLineNumber });
        await this.notebookEditor.revealRangeInCenterAsync(cell, new Range(targetLines.startLineNumber, 0, targetLines.endLineNumberExclusive, 0));
    }
    next(wrap) {
        const changes = sortCellChanges(this.cellChanges.get().filter(c => c.type !== 'unchanged'));
        const currentChange = this.currentChange.get();
        if (!currentChange) {
            const firstChange = changes[0];
            if (firstChange) {
                return this._revealFirstOrLast(firstChange);
            }
            return false;
        }
        // go to next
        // first check if we are at the end of the current change
        switch (currentChange.change.type) {
            case 'modified':
                {
                    const cellIntegration = this.getCell(currentChange.change.modifiedCellIndex);
                    if (cellIntegration) {
                        if (cellIntegration.next(false)) {
                            this._currentChange.set({ change: currentChange.change, index: cellIntegration.currentIndex.get() }, undefined);
                            return true;
                        }
                    }
                    const isLastChangeInCell = currentChange.index === lastChangeIndex(currentChange.change);
                    const index = isLastChangeInCell ? 0 : currentChange.index + 1;
                    const change = isLastChangeInCell ? changes[changes.indexOf(currentChange.change) + 1] : currentChange.change;
                    if (change) {
                        return this._revealChange(change, index);
                    }
                }
                break;
            case 'insert':
            case 'delete':
                {
                    // go to next change directly
                    const nextChange = changes[changes.indexOf(currentChange.change) + 1];
                    if (nextChange) {
                        return this._revealFirstOrLast(nextChange, true);
                    }
                }
                break;
            default:
                break;
        }
        if (wrap) {
            return this.next(false);
        }
        return false;
    }
    previous(wrap) {
        const changes = sortCellChanges(this.cellChanges.get().filter(c => c.type !== 'unchanged'));
        const currentChange = this.currentChange.get();
        if (!currentChange) {
            const lastChange = changes[changes.length - 1];
            if (lastChange) {
                return this._revealFirstOrLast(lastChange, false);
            }
            return false;
        }
        // go to previous
        // first check if we are at the start of the current change
        switch (currentChange.change.type) {
            case 'modified':
                {
                    const cellIntegration = this.getCell(currentChange.change.modifiedCellIndex);
                    if (cellIntegration) {
                        if (cellIntegration.previous(false)) {
                            this._currentChange.set({ change: currentChange.change, index: cellIntegration.currentIndex.get() }, undefined);
                            return true;
                        }
                    }
                    const isFirstChangeInCell = currentChange.index === 0;
                    const change = isFirstChangeInCell ? changes[changes.indexOf(currentChange.change) - 1] : currentChange.change;
                    if (change) {
                        const index = isFirstChangeInCell ? lastChangeIndex(change) : currentChange.index - 1;
                        return this._revealChange(change, index);
                    }
                }
                break;
            case 'insert':
            case 'delete':
                {
                    // go to previous change directly
                    const prevChange = changes[changes.indexOf(currentChange.change) - 1];
                    if (prevChange) {
                        return this._revealFirstOrLast(prevChange, false);
                    }
                }
                break;
            default:
                break;
        }
        if (wrap) {
            const lastChange = changes[changes.length - 1];
            if (lastChange) {
                return this._revealFirstOrLast(lastChange, false);
            }
        }
        return false;
    }
    enableAccessibleDiffView() {
        const cell = this.notebookEditor.getActiveCell()?.model;
        if (cell) {
            const integration = this.cellEditorIntegrations.get(cell)?.integration;
            integration?.enableAccessibleDiffView();
        }
    }
    acceptNearestChange(change) {
        change.accept();
        this.next(true);
    }
    rejectNearestChange(change) {
        change.reject();
        this.next(true);
    }
    async toggleDiff(_change) {
        const defaultAgentName = this._chatAgentService.getDefaultAgent(ChatAgentLocation.EditingSession)?.fullName;
        const diffInput = {
            original: { resource: this._entry.originalURI, options: { selection: undefined } },
            modified: { resource: this._entry.modifiedURI, options: { selection: undefined } },
            label: defaultAgentName
                ? localize('diff.agent', '{0} (changes from {1})', basename(this._entry.modifiedURI), defaultAgentName)
                : localize('diff.generic', '{0} (changes from chat)', basename(this._entry.modifiedURI))
        };
        await this._editorService.openEditor(diffInput);
    }
};
ChatEditingNotebookEditorWidgetIntegration = __decorate([
    __param(5, IInstantiationService),
    __param(6, IEditorService),
    __param(7, IChatAgentService),
    __param(8, INotebookEditorService),
    __param(9, IAccessibilitySignalService)
], ChatEditingNotebookEditorWidgetIntegration);
export class ChatEditingNotebookDiffEditorIntegration extends Disposable {
    constructor(notebookDiffEditor, cellChanges) {
        super();
        this.notebookDiffEditor = notebookDiffEditor;
        this.cellChanges = cellChanges;
        this._currentIndex = observableValue(this, -1);
        this.currentIndex = this._currentIndex;
        this._store.add(autorun(r => {
            const index = notebookDiffEditor.currentChangedIndex.read(r);
            const numberOfCellChanges = cellChanges.read(r).filter(c => !c.diff.read(r).identical);
            if (numberOfCellChanges.length && index >= 0 && index < numberOfCellChanges.length) {
                // Notebook Diff editor only supports navigating through changes to cells.
                // However in chat we take changes to lines in the cells into account.
                // So if we're on the second cell and first cell has 3 changes, then we're on the 4th change.
                const changesSoFar = countChanges(numberOfCellChanges.slice(0, index + 1));
                this._currentIndex.set(changesSoFar - 1, undefined);
            }
            else {
                this._currentIndex.set(-1, undefined);
            }
        }));
    }
    reveal(firstOrLast) {
        const changes = sortCellChanges(this.cellChanges.get().filter(c => c.type !== 'unchanged'));
        if (!changes.length) {
            return undefined;
        }
        if (firstOrLast) {
            this.notebookDiffEditor.firstChange();
        }
        else {
            this.notebookDiffEditor.lastChange();
        }
    }
    next(_wrap) {
        const changes = this.cellChanges.get().filter(c => !c.diff.get().identical).length;
        if (this.notebookDiffEditor.currentChangedIndex.get() === changes - 1) {
            return false;
        }
        this.notebookDiffEditor.nextChange();
        return true;
    }
    previous(_wrap) {
        const changes = this.cellChanges.get().filter(c => !c.diff.get().identical).length;
        if (this.notebookDiffEditor.currentChangedIndex.get() === changes - 1) {
            return false;
        }
        this.notebookDiffEditor.nextChange();
        return true;
    }
    enableAccessibleDiffView() {
        //
    }
    acceptNearestChange(change) {
        change.accept();
        this.next(true);
    }
    rejectNearestChange(change) {
        change.reject();
        this.next(true);
    }
    async toggleDiff(_change) {
        //
    }
}
function areDocumentDiff2Equal(diff1, diff2) {
    if (diff1.changes !== diff2.changes) {
        return false;
    }
    if (diff1.identical !== diff2.identical) {
        return false;
    }
    if (diff1.moves !== diff2.moves) {
        return false;
    }
    if (diff1.originalModel !== diff2.originalModel) {
        return false;
    }
    if (diff1.modifiedModel !== diff2.modifiedModel) {
        return false;
    }
    if (diff1.keep !== diff2.keep) {
        return false;
    }
    if (diff1.undo !== diff2.undo) {
        return false;
    }
    if (diff1.quitEarly !== diff2.quitEarly) {
        return false;
    }
    return true;
}
function lastChangeIndex(change) {
    if (change.type === 'modified') {
        return change.diff.get().changes.length - 1;
    }
    return 0;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEVkaXRpbmdOb3RlYm9va0VkaXRvckludGVncmF0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXRFZGl0aW5nL25vdGVib29rL2NoYXRFZGl0aW5nTm90ZWJvb2tFZGl0b3JJbnRlZ3JhdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFlLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ25HLE9BQU8sRUFBRSxPQUFPLEVBQW9DLG1CQUFtQixFQUFFLGVBQWUsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQzlJLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUN0RSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDcEUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQzlFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUN0RSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw4REFBOEQsQ0FBQztBQUNoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDcEQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLDJCQUEyQixFQUFFLE1BQU0sc0ZBQXNGLENBQUM7QUFDeEosT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQzlFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGtFQUFrRSxDQUFDO0FBRXpHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx3REFB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