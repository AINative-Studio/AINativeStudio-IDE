/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable, DisposableStore, dispose } from '../../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../../base/common/network.js';
import { MultiDiffEditorItem } from '../../../multiDiffEditor/browser/multiDiffSourceResolverService.js';
import { DiffElementPlaceholderViewModel, NotebookDocumentMetadataViewModel, SideBySideDiffElementViewModel, SingleSideDiffElementViewModel } from './diffElementViewModel.js';
import { NOTEBOOK_DIFF_ITEM_DIFF_STATE, NOTEBOOK_DIFF_ITEM_KIND } from './notebookDiffEditorBrowser.js';
import { CellUri } from '../../common/notebookCommon.js';
import { raceCancellation } from '../../../../../base/common/async.js';
import { computeDiff } from '../../common/notebookDiff.js';
export class NotebookDiffViewModel extends Disposable {
    get items() {
        return this._items;
    }
    get value() {
        return this.diffEditorItems
            .filter(item => item.type !== 'placeholder')
            .filter(item => {
            if (this._includeUnchanged) {
                return true;
            }
            if (item instanceof NotebookMultiDiffEditorCellItem) {
                return item.type === 'unchanged' && item.containerType === 'unchanged' ? false : true;
            }
            if (item instanceof NotebookMultiDiffEditorMetadataItem) {
                return item.type === 'unchanged' && item.containerType === 'unchanged' ? false : true;
            }
            if (item instanceof NotebookMultiDiffEditorOutputItem) {
                return item.type === 'unchanged' && item.containerType === 'unchanged' ? false : true;
            }
            return true;
        })
            .filter(item => item instanceof NotebookMultiDiffEditorOutputItem ? !this.hideOutput : true)
            .filter(item => item instanceof NotebookMultiDiffEditorMetadataItem ? !this.ignoreMetadata : true);
    }
    get hasUnchangedCells() {
        return this._hasUnchangedCells === true;
    }
    get includeUnchanged() {
        return this._includeUnchanged === true;
    }
    set includeUnchanged(value) {
        this._includeUnchanged = value;
        this._onDidChange.fire();
    }
    constructor(model, notebookEditorWorkerService, configurationService, eventDispatcher, notebookService, diffEditorHeightCalculator, fontInfo, excludeUnchangedPlaceholder) {
        super();
        this.model = model;
        this.notebookEditorWorkerService = notebookEditorWorkerService;
        this.configurationService = configurationService;
        this.eventDispatcher = eventDispatcher;
        this.notebookService = notebookService;
        this.diffEditorHeightCalculator = diffEditorHeightCalculator;
        this.fontInfo = fontInfo;
        this.excludeUnchangedPlaceholder = excludeUnchangedPlaceholder;
        this.placeholderAndRelatedCells = new Map();
        this._items = [];
        this._onDidChangeItems = this._register(new Emitter());
        this.onDidChangeItems = this._onDidChangeItems.event;
        this.disposables = this._register(new DisposableStore());
        this._onDidChange = this._register(new Emitter());
        this.diffEditorItems = [];
        this.onDidChange = this._onDidChange.event;
        this.originalCellViewModels = [];
        this.hideOutput = this.model.modified.notebook.transientOptions.transientOutputs || this.configurationService.getValue('notebook.diff.ignoreOutputs');
        this.ignoreMetadata = this.configurationService.getValue('notebook.diff.ignoreMetadata');
        this._register(this.configurationService.onDidChangeConfiguration(e => {
            let triggerChange = false;
            let metadataChanged = false;
            if (e.affectsConfiguration('notebook.diff.ignoreMetadata')) {
                const newValue = this.configurationService.getValue('notebook.diff.ignoreMetadata');
                if (newValue !== undefined && this.ignoreMetadata !== newValue) {
                    this.ignoreMetadata = newValue;
                    triggerChange = true;
                    metadataChanged = true;
                }
            }
            if (e.affectsConfiguration('notebook.diff.ignoreOutputs')) {
                const newValue = this.configurationService.getValue('notebook.diff.ignoreOutputs');
                if (newValue !== undefined && this.hideOutput !== (newValue || this.model.modified.notebook.transientOptions.transientOutputs)) {
                    this.hideOutput = newValue || !!(this.model.modified.notebook.transientOptions.transientOutputs);
                    triggerChange = true;
                }
            }
            if (metadataChanged) {
                this.toggleNotebookMetadata();
            }
            if (triggerChange) {
                this._onDidChange.fire();
            }
        }));
    }
    dispose() {
        this.clear();
        super.dispose();
    }
    clear() {
        this.disposables.clear();
        dispose(Array.from(this.placeholderAndRelatedCells.keys()));
        this.placeholderAndRelatedCells.clear();
        dispose(this.originalCellViewModels);
        this.originalCellViewModels = [];
        dispose(this._items);
        this._items.splice(0, this._items.length);
    }
    async computeDiff(token) {
        const diffResult = await raceCancellation(this.notebookEditorWorkerService.computeDiff(this.model.original.resource, this.model.modified.resource), token);
        if (!diffResult || token.isCancellationRequested) {
            // after await the editor might be disposed.
            return;
        }
        prettyChanges(this.model.original.notebook, this.model.modified.notebook, diffResult.cellsDiff);
        const { cellDiffInfo, firstChangeIndex } = computeDiff(this.model.original.notebook, this.model.modified.notebook, diffResult);
        if (isEqual(cellDiffInfo, this.originalCellViewModels, this.model)) {
            return;
        }
        else {
            await raceCancellation(this.updateViewModels(cellDiffInfo, diffResult.metadataChanged, firstChangeIndex), token);
            if (token.isCancellationRequested) {
                return;
            }
            this.updateDiffEditorItems();
        }
    }
    toggleNotebookMetadata() {
        if (!this.notebookMetadataViewModel) {
            return;
        }
        if (this.ignoreMetadata) {
            if (this._items.length && this._items[0] === this.notebookMetadataViewModel) {
                this._items.splice(0, 1);
                this._onDidChangeItems.fire({ start: 0, deleteCount: 1, elements: [] });
            }
        }
        else {
            if (!this._items.length || this._items[0] !== this.notebookMetadataViewModel) {
                this._items.splice(0, 0, this.notebookMetadataViewModel);
                this._onDidChangeItems.fire({ start: 0, deleteCount: 0, elements: [this.notebookMetadataViewModel] });
            }
        }
    }
    updateDiffEditorItems() {
        this.diffEditorItems = [];
        const originalSourceUri = this.model.original.resource;
        const modifiedSourceUri = this.model.modified.resource;
        this._hasUnchangedCells = false;
        this.items.forEach(item => {
            switch (item.type) {
                case 'delete': {
                    this.diffEditorItems.push(new NotebookMultiDiffEditorCellItem(item.original.uri, undefined, item.type, item.type));
                    const originalMetadata = CellUri.generateCellPropertyUri(originalSourceUri, item.original.handle, Schemas.vscodeNotebookCellMetadata);
                    this.diffEditorItems.push(new NotebookMultiDiffEditorMetadataItem(originalMetadata, undefined, item.type, item.type));
                    const originalOutput = CellUri.generateCellPropertyUri(originalSourceUri, item.original.handle, Schemas.vscodeNotebookCellOutput);
                    this.diffEditorItems.push(new NotebookMultiDiffEditorOutputItem(originalOutput, undefined, item.type, item.type));
                    break;
                }
                case 'insert': {
                    this.diffEditorItems.push(new NotebookMultiDiffEditorCellItem(undefined, item.modified.uri, item.type, item.type));
                    const modifiedMetadata = CellUri.generateCellPropertyUri(modifiedSourceUri, item.modified.handle, Schemas.vscodeNotebookCellMetadata);
                    this.diffEditorItems.push(new NotebookMultiDiffEditorMetadataItem(undefined, modifiedMetadata, item.type, item.type));
                    const modifiedOutput = CellUri.generateCellPropertyUri(modifiedSourceUri, item.modified.handle, Schemas.vscodeNotebookCellOutput);
                    this.diffEditorItems.push(new NotebookMultiDiffEditorOutputItem(undefined, modifiedOutput, item.type, item.type));
                    break;
                }
                case 'modified': {
                    const cellType = item.checkIfInputModified() ? item.type : 'unchanged';
                    const containerChanged = (item.checkIfInputModified() || item.checkMetadataIfModified() || item.checkIfOutputsModified()) ? item.type : 'unchanged';
                    this.diffEditorItems.push(new NotebookMultiDiffEditorCellItem(item.original.uri, item.modified.uri, cellType, containerChanged));
                    const originalMetadata = CellUri.generateCellPropertyUri(originalSourceUri, item.original.handle, Schemas.vscodeNotebookCellMetadata);
                    const modifiedMetadata = CellUri.generateCellPropertyUri(modifiedSourceUri, item.modified.handle, Schemas.vscodeNotebookCellMetadata);
                    this.diffEditorItems.push(new NotebookMultiDiffEditorMetadataItem(originalMetadata, modifiedMetadata, item.checkMetadataIfModified() ? item.type : 'unchanged', containerChanged));
                    const originalOutput = CellUri.generateCellPropertyUri(originalSourceUri, item.original.handle, Schemas.vscodeNotebookCellOutput);
                    const modifiedOutput = CellUri.generateCellPropertyUri(modifiedSourceUri, item.modified.handle, Schemas.vscodeNotebookCellOutput);
                    this.diffEditorItems.push(new NotebookMultiDiffEditorOutputItem(originalOutput, modifiedOutput, item.checkIfOutputsModified() ? item.type : 'unchanged', containerChanged));
                    break;
                }
                case 'unchanged': {
                    this._hasUnchangedCells = true;
                    this.diffEditorItems.push(new NotebookMultiDiffEditorCellItem(item.original.uri, item.modified.uri, item.type, item.type));
                    const originalMetadata = CellUri.generateCellPropertyUri(originalSourceUri, item.original.handle, Schemas.vscodeNotebookCellMetadata);
                    const modifiedMetadata = CellUri.generateCellPropertyUri(modifiedSourceUri, item.modified.handle, Schemas.vscodeNotebookCellMetadata);
                    this.diffEditorItems.push(new NotebookMultiDiffEditorMetadataItem(originalMetadata, modifiedMetadata, item.type, item.type));
                    const originalOutput = CellUri.generateCellPropertyUri(originalSourceUri, item.original.handle, Schemas.vscodeNotebookCellOutput);
                    const modifiedOutput = CellUri.generateCellPropertyUri(modifiedSourceUri, item.modified.handle, Schemas.vscodeNotebookCellOutput);
                    this.diffEditorItems.push(new NotebookMultiDiffEditorOutputItem(originalOutput, modifiedOutput, item.type, item.type));
                    break;
                }
            }
        });
        this._onDidChange.fire();
    }
    async updateViewModels(cellDiffInfo, metadataChanged, firstChangeIndex) {
        const cellViewModels = await this.createDiffViewModels(cellDiffInfo, metadataChanged);
        const oldLength = this._items.length;
        this.clear();
        this._items.splice(0, oldLength);
        let placeholder = undefined;
        this.originalCellViewModels = cellViewModels;
        cellViewModels.forEach((vm, index) => {
            if (vm.type === 'unchanged' && !this.excludeUnchangedPlaceholder) {
                if (!placeholder) {
                    vm.displayIconToHideUnmodifiedCells = true;
                    placeholder = new DiffElementPlaceholderViewModel(vm.mainDocumentTextModel, vm.editorEventDispatcher, vm.initData);
                    this._items.push(placeholder);
                    const placeholderItem = placeholder;
                    this.disposables.add(placeholderItem.onUnfoldHiddenCells(() => {
                        const hiddenCellViewModels = this.placeholderAndRelatedCells.get(placeholderItem);
                        if (!Array.isArray(hiddenCellViewModels)) {
                            return;
                        }
                        const start = this._items.indexOf(placeholderItem);
                        this._items.splice(start, 1, ...hiddenCellViewModels);
                        this._onDidChangeItems.fire({ start, deleteCount: 1, elements: hiddenCellViewModels });
                    }));
                    this.disposables.add(vm.onHideUnchangedCells(() => {
                        const hiddenCellViewModels = this.placeholderAndRelatedCells.get(placeholderItem);
                        if (!Array.isArray(hiddenCellViewModels)) {
                            return;
                        }
                        const start = this._items.indexOf(vm);
                        this._items.splice(start, hiddenCellViewModels.length, placeholderItem);
                        this._onDidChangeItems.fire({ start, deleteCount: hiddenCellViewModels.length, elements: [placeholderItem] });
                    }));
                }
                const hiddenCellViewModels = this.placeholderAndRelatedCells.get(placeholder) || [];
                hiddenCellViewModels.push(vm);
                this.placeholderAndRelatedCells.set(placeholder, hiddenCellViewModels);
                placeholder.hiddenCells.push(vm);
            }
            else {
                placeholder = undefined;
                this._items.push(vm);
            }
        });
        // Note, ensure all of the height calculations are done before firing the event.
        // This is to ensure that the diff editor is not resized multiple times, thereby avoiding flickering.
        this._onDidChangeItems.fire({ start: 0, deleteCount: oldLength, elements: this._items, firstChangeIndex });
    }
    async createDiffViewModels(computedCellDiffs, metadataChanged) {
        const originalModel = this.model.original.notebook;
        const modifiedModel = this.model.modified.notebook;
        const initData = {
            metadataStatusHeight: this.configurationService.getValue('notebook.diff.ignoreMetadata') ? 0 : 25,
            outputStatusHeight: this.configurationService.getValue('notebook.diff.ignoreOutputs') || !!(modifiedModel.transientOptions.transientOutputs) ? 0 : 25,
            fontInfo: this.fontInfo
        };
        const viewModels = [];
        this.notebookMetadataViewModel = this._register(new NotebookDocumentMetadataViewModel(this.model.original.notebook, this.model.modified.notebook, metadataChanged ? 'modifiedMetadata' : 'unchangedMetadata', this.eventDispatcher, initData, this.notebookService, this.diffEditorHeightCalculator));
        if (!this.ignoreMetadata) {
            if (metadataChanged) {
                await this.notebookMetadataViewModel.computeHeights();
            }
            viewModels.push(this.notebookMetadataViewModel);
        }
        const cellViewModels = await Promise.all(computedCellDiffs.map(async (diff) => {
            switch (diff.type) {
                case 'delete': {
                    return new SingleSideDiffElementViewModel(originalModel, modifiedModel, originalModel.cells[diff.originalCellIndex], undefined, 'delete', this.eventDispatcher, initData, this.notebookService, this.configurationService, this.diffEditorHeightCalculator, diff.originalCellIndex);
                }
                case 'insert': {
                    return new SingleSideDiffElementViewModel(modifiedModel, originalModel, undefined, modifiedModel.cells[diff.modifiedCellIndex], 'insert', this.eventDispatcher, initData, this.notebookService, this.configurationService, this.diffEditorHeightCalculator, diff.modifiedCellIndex);
                }
                case 'modified': {
                    const viewModel = new SideBySideDiffElementViewModel(this.model.modified.notebook, this.model.original.notebook, originalModel.cells[diff.originalCellIndex], modifiedModel.cells[diff.modifiedCellIndex], 'modified', this.eventDispatcher, initData, this.notebookService, this.configurationService, diff.originalCellIndex, this.diffEditorHeightCalculator);
                    // Reduces flicker (compute this before setting the model)
                    // Else when the model is set, the height of the editor will be x, after diff is computed, then height will be y.
                    // & that results in flicker.
                    await viewModel.computeEditorHeights();
                    return viewModel;
                }
                case 'unchanged': {
                    return new SideBySideDiffElementViewModel(this.model.modified.notebook, this.model.original.notebook, originalModel.cells[diff.originalCellIndex], modifiedModel.cells[diff.modifiedCellIndex], 'unchanged', this.eventDispatcher, initData, this.notebookService, this.configurationService, diff.originalCellIndex, this.diffEditorHeightCalculator);
                }
            }
        }));
        cellViewModels.forEach(vm => viewModels.push(vm));
        return viewModels;
    }
}
/**
 * making sure that swapping cells are always translated to `insert+delete`.
 */
export function prettyChanges(original, modified, diffResult) {
    const changes = diffResult.changes;
    for (let i = 0; i < diffResult.changes.length - 1; i++) {
        // then we know there is another change after current one
        const curr = changes[i];
        const next = changes[i + 1];
        const x = curr.originalStart;
        const y = curr.modifiedStart;
        if (curr.originalLength === 1
            && curr.modifiedLength === 0
            && next.originalStart === x + 2
            && next.originalLength === 0
            && next.modifiedStart === y + 1
            && next.modifiedLength === 1
            && original.cells[x].getHashValue() === modified.cells[y + 1].getHashValue()
            && original.cells[x + 1].getHashValue() === modified.cells[y].getHashValue()) {
            // this is a swap
            curr.originalStart = x;
            curr.originalLength = 0;
            curr.modifiedStart = y;
            curr.modifiedLength = 1;
            next.originalStart = x + 1;
            next.originalLength = 1;
            next.modifiedStart = y + 2;
            next.modifiedLength = 0;
            i++;
        }
    }
}
function isEqual(cellDiffInfo, viewModels, model) {
    if (cellDiffInfo.length !== viewModels.length) {
        return false;
    }
    const originalModel = model.original.notebook;
    const modifiedModel = model.modified.notebook;
    for (let i = 0; i < viewModels.length; i++) {
        const a = cellDiffInfo[i];
        const b = viewModels[i];
        if (a.type !== b.type) {
            return false;
        }
        switch (a.type) {
            case 'delete': {
                if (originalModel.cells[a.originalCellIndex].handle !== b.original?.handle) {
                    return false;
                }
                continue;
            }
            case 'insert': {
                if (modifiedModel.cells[a.modifiedCellIndex].handle !== b.modified?.handle) {
                    return false;
                }
                continue;
            }
            default: {
                if (originalModel.cells[a.originalCellIndex].handle !== b.original?.handle) {
                    return false;
                }
                if (modifiedModel.cells[a.modifiedCellIndex].handle !== b.modified?.handle) {
                    return false;
                }
                continue;
            }
        }
    }
    return true;
}
export class NotebookMultiDiffEditorItem extends MultiDiffEditorItem {
    constructor(originalUri, modifiedUri, goToFileUri, type, containerType, kind, contextKeys) {
        super(originalUri, modifiedUri, goToFileUri, contextKeys);
        this.type = type;
        this.containerType = containerType;
        this.kind = kind;
    }
}
class NotebookMultiDiffEditorCellItem extends NotebookMultiDiffEditorItem {
    constructor(originalUri, modifiedUri, type, containerType) {
        super(originalUri, modifiedUri, modifiedUri || originalUri, type, containerType, 'Cell', {
            [NOTEBOOK_DIFF_ITEM_KIND.key]: 'Cell',
            [NOTEBOOK_DIFF_ITEM_DIFF_STATE.key]: type
        });
    }
}
class NotebookMultiDiffEditorMetadataItem extends NotebookMultiDiffEditorItem {
    constructor(originalUri, modifiedUri, type, containerType) {
        super(originalUri, modifiedUri, modifiedUri || originalUri, type, containerType, 'Metadata', {
            [NOTEBOOK_DIFF_ITEM_KIND.key]: 'Metadata',
            [NOTEBOOK_DIFF_ITEM_DIFF_STATE.key]: type
        });
    }
}
class NotebookMultiDiffEditorOutputItem extends NotebookMultiDiffEditorItem {
    constructor(originalUri, modifiedUri, type, containerType) {
        super(originalUri, modifiedUri, modifiedUri || originalUri, type, containerType, 'Output', {
            [NOTEBOOK_DIFF_ITEM_KIND.key]: 'Output',
            [NOTEBOOK_DIFF_ITEM_DIFF_STATE.key]: type
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tEaWZmVmlld01vZGVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL2RpZmYvbm90ZWJvb2tEaWZmVmlld01vZGVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBSWhHLE9BQU8sRUFBRSxPQUFPLEVBQThCLE1BQU0scUNBQXFDLENBQUM7QUFDMUYsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsT0FBTyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDL0YsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBS2hFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLG9FQUFvRSxDQUFDO0FBQ3pHLE9BQU8sRUFBZ0MsK0JBQStCLEVBQTZCLGlDQUFpQyxFQUFFLDhCQUE4QixFQUFFLDhCQUE4QixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFFeE8sT0FBTyxFQUE2RCw2QkFBNkIsRUFBRSx1QkFBdUIsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBRW5LLE9BQU8sRUFBRSxPQUFPLEVBQTRCLE1BQU0sZ0NBQWdDLENBQUM7QUFJbkYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDdkUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBRTNELE1BQU0sT0FBTyxxQkFBc0IsU0FBUSxVQUFVO0lBR3BELElBQUksS0FBSztRQUNSLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQztJQUNwQixDQUFDO0lBUUQsSUFBSSxLQUFLO1FBQ1IsT0FBTyxJQUFJLENBQUMsZUFBZTthQUN6QixNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxL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