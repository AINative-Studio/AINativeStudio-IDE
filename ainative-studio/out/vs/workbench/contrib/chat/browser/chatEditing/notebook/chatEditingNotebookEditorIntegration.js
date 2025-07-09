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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEVkaXRpbmdOb3RlYm9va0VkaXRvckludGVncmF0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0RWRpdGluZy9ub3RlYm9vay9jaGF0RWRpdGluZ05vdGVib29rRWRpdG9ySW50ZWdyYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBZSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUNuRyxPQUFPLEVBQUUsT0FBTyxFQUFvQyxtQkFBbUIsRUFBRSxlQUFlLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUM5SSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQUNoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDdEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUM5RSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDdEUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sOERBQThELENBQUM7QUFDaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQ3BELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSwyQkFBMkIsRUFBRSxNQUFNLHNGQUFzRixDQUFDO0FBQ3hKLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUM5RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQztBQUV6RyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sd0RB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