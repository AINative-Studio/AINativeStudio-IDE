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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tEaWZmVmlld01vZGVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvZGlmZi9ub3RlYm9va0RpZmZWaWV3TW9kZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFJaEcsT0FBTyxFQUFFLE9BQU8sRUFBOEIsTUFBTSxxQ0FBcUMsQ0FBQztBQUMxRixPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxPQUFPLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUMvRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFLaEUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sb0VBQW9FLENBQUM7QUFDekcsT0FBTyxFQUFnQywrQkFBK0IsRUFBNkIsaUNBQWlDLEVBQUUsOEJBQThCLEVBQUUsOEJBQThCLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUV4TyxPQUFPLEVBQTZELDZCQUE2QixFQUFFLHVCQUF1QixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFFbkssT0FBTyxFQUFFLE9BQU8sRUFBNEIsTUFBTSxnQ0FBZ0MsQ0FBQztBQUluRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUN2RSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFFM0QsTUFBTSxPQUFPLHFCQUFzQixTQUFRLFVBQVU7SUFHcEQsSUFBSSxLQUFLO1FBQ1IsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDO0lBQ3BCLENBQUM7SUFRRCxJQUFJLEtBQUs7UUFDUixPQUFPLElBQUksQ0FBQyxlQUFlO2FBQ3pCLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLEtBQUss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