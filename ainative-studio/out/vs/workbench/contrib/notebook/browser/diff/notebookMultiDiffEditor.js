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
var NotebookMultiTextDiffEditor_1;
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { IThemeService } from '../../../../../platform/theme/common/themeService.js';
import { CancellationTokenSource } from '../../../../../base/common/cancellation.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { INotebookEditorWorkerService } from '../../common/services/notebookWorkerService.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { BareFontInfo } from '../../../../../editor/common/config/fontInfo.js';
import { PixelRatio } from '../../../../../base/browser/pixelRatio.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { EditorPane } from '../../../../browser/parts/editor/editorPane.js';
import { CellUri, NOTEBOOK_MULTI_DIFF_EDITOR_ID } from '../../common/notebookCommon.js';
import { FontMeasurements } from '../../../../../editor/browser/config/fontMeasurements.js';
import { NotebookOptions } from '../notebookOptions.js';
import { INotebookService } from '../../common/notebookService.js';
import { NotebookMultiDiffEditorWidgetInput } from './notebookMultiDiffEditorInput.js';
import { MultiDiffEditorWidget } from '../../../../../editor/browser/widget/multiDiffEditor/multiDiffEditorWidget.js';
import { ResourceLabel } from '../../../../browser/labels.js';
import { INotebookDocumentService } from '../../../../services/notebook/common/notebookDocumentService.js';
import { localize } from '../../../../../nls.js';
import { Schemas } from '../../../../../base/common/network.js';
import { getIconClassesForLanguageId } from '../../../../../editor/common/services/getIconClasses.js';
import { NotebookDiffViewModel } from './notebookDiffViewModel.js';
import { NotebookDiffEditorEventDispatcher } from './eventDispatcher.js';
import { NOTEBOOK_DIFF_CELLS_COLLAPSED, NOTEBOOK_DIFF_HAS_UNCHANGED_CELLS, NOTEBOOK_DIFF_UNCHANGED_CELLS_HIDDEN } from './notebookDiffEditorBrowser.js';
import { autorun, transaction } from '../../../../../base/common/observable.js';
import { DiffEditorHeightCalculatorService } from './editorHeightCalculator.js';
let NotebookMultiTextDiffEditor = class NotebookMultiTextDiffEditor extends EditorPane {
    static { NotebookMultiTextDiffEditor_1 = this; }
    static { this.ID = NOTEBOOK_MULTI_DIFF_EDITOR_ID; }
    get textModel() {
        return this._model?.modified.notebook;
    }
    get notebookOptions() {
        return this._notebookOptions;
    }
    constructor(group, instantiationService, themeService, _parentContextKeyService, notebookEditorWorkerService, configurationService, telemetryService, storageService, notebookService) {
        super(NotebookMultiTextDiffEditor_1.ID, group, telemetryService, themeService, storageService);
        this.instantiationService = instantiationService;
        this._parentContextKeyService = _parentContextKeyService;
        this.notebookEditorWorkerService = notebookEditorWorkerService;
        this.configurationService = configurationService;
        this.notebookService = notebookService;
        this.modelSpecificResources = this._register(new DisposableStore());
        this.ctxAllCollapsed = this._parentContextKeyService.createKey(NOTEBOOK_DIFF_CELLS_COLLAPSED.key, false);
        this.ctxHasUnchangedCells = this._parentContextKeyService.createKey(NOTEBOOK_DIFF_HAS_UNCHANGED_CELLS.key, false);
        this.ctxHiddenUnchangedCells = this._parentContextKeyService.createKey(NOTEBOOK_DIFF_UNCHANGED_CELLS_HIDDEN.key, true);
        this._notebookOptions = instantiationService.createInstance(NotebookOptions, this.window, false, undefined);
        this._register(this._notebookOptions);
    }
    get fontInfo() {
        if (!this._fontInfo) {
            this._fontInfo = this.createFontInfo();
        }
        return this._fontInfo;
    }
    layout(dimension, position) {
        this._multiDiffEditorWidget.layout(dimension);
    }
    createFontInfo() {
        const editorOptions = this.configurationService.getValue('editor');
        return FontMeasurements.readFontInfo(this.window, BareFontInfo.createFromRawSettings(editorOptions, PixelRatio.getInstance(this.window).value));
    }
    createEditor(parent) {
        this._multiDiffEditorWidget = this._register(this.instantiationService.createInstance(MultiDiffEditorWidget, parent, this.instantiationService.createInstance(WorkbenchUIElementFactory)));
        this._register(this._multiDiffEditorWidget.onDidChangeActiveControl(() => {
            this._onDidChangeControl.fire();
        }));
    }
    async setInput(input, options, context, token) {
        super.setInput(input, options, context, token);
        const model = await input.resolve();
        if (this._model !== model) {
            this._detachModel();
            this._model = model;
        }
        const eventDispatcher = this.modelSpecificResources.add(new NotebookDiffEditorEventDispatcher());
        const diffEditorHeightCalculator = this.instantiationService.createInstance(DiffEditorHeightCalculatorService, this.fontInfo.lineHeight);
        this.viewModel = this.modelSpecificResources.add(new NotebookDiffViewModel(model, this.notebookEditorWorkerService, this.configurationService, eventDispatcher, this.notebookService, diffEditorHeightCalculator, undefined, true));
        await this.viewModel.computeDiff(this.modelSpecificResources.add(new CancellationTokenSource()).token);
        this.ctxHasUnchangedCells.set(this.viewModel.hasUnchangedCells);
        this.ctxHasUnchangedCells.set(this.viewModel.hasUnchangedCells);
        const widgetInput = this.modelSpecificResources.add(NotebookMultiDiffEditorWidgetInput.createInput(this.viewModel, this.instantiationService));
        this.widgetViewModel = this.modelSpecificResources.add(await widgetInput.getViewModel());
        const itemsWeHaveSeen = new WeakSet();
        this.modelSpecificResources.add(autorun(reader => {
            /** @description NotebookDiffEditor => Collapse unmodified items */
            if (!this.widgetViewModel || !this.viewModel) {
                return;
            }
            const items = this.widgetViewModel.items.read(reader);
            const diffItems = this.viewModel.value;
            if (items.length !== diffItems.length) {
                return;
            }
            // If cell has not changed, but metadata or output has changed, then collapse the cell & keep output/metadata expanded.
            // Similarly if the cell has changed, but the metadata or output has not, then expand the cell, but collapse output/metadata.
            transaction((tx) => {
                items.forEach(item => {
                    // We do not want to mess with UI state if users change it, hence no need to collapse again.
                    if (itemsWeHaveSeen.has(item)) {
                        return;
                    }
                    itemsWeHaveSeen.add(item);
                    const diffItem = diffItems.find(d => d.modifiedUri?.toString() === item.modifiedUri?.toString() && d.originalUri?.toString() === item.originalUri?.toString());
                    if (diffItem && diffItem.type === 'unchanged') {
                        item.collapsed.set(true, tx);
                    }
                });
            });
        }));
        this._multiDiffEditorWidget.setViewModel(this.widgetViewModel);
    }
    _detachModel() {
        this.viewModel = undefined;
        this.modelSpecificResources.clear();
    }
    _generateFontFamily() {
        return this.fontInfo.fontFamily ?? `"SF Mono", Monaco, Menlo, Consolas, "Ubuntu Mono", "Liberation Mono", "DejaVu Sans Mono", "Courier New", monospace`;
    }
    setOptions(options) {
        super.setOptions(options);
    }
    getControl() {
        return this._multiDiffEditorWidget.getActiveControl();
    }
    focus() {
        super.focus();
        this._multiDiffEditorWidget?.getActiveControl()?.focus();
    }
    hasFocus() {
        return this._multiDiffEditorWidget?.getActiveControl()?.hasTextFocus() || super.hasFocus();
    }
    clearInput() {
        super.clearInput();
        this._multiDiffEditorWidget.setViewModel(undefined);
        this.modelSpecificResources.clear();
        this.viewModel = undefined;
        this.widgetViewModel = undefined;
    }
    expandAll() {
        if (this.widgetViewModel) {
            this.widgetViewModel.expandAll();
            this.ctxAllCollapsed.set(false);
        }
    }
    collapseAll() {
        if (this.widgetViewModel) {
            this.widgetViewModel.collapseAll();
            this.ctxAllCollapsed.set(true);
        }
    }
    hideUnchanged() {
        if (this.viewModel) {
            this.viewModel.includeUnchanged = false;
            this.ctxHiddenUnchangedCells.set(true);
        }
    }
    showUnchanged() {
        if (this.viewModel) {
            this.viewModel.includeUnchanged = true;
            this.ctxHiddenUnchangedCells.set(false);
        }
    }
    getDiffElementViewModel(uri) {
        if (uri.scheme === Schemas.vscodeNotebookCellOutput || uri.scheme === Schemas.vscodeNotebookCellOutputDiff ||
            uri.scheme === Schemas.vscodeNotebookCellMetadata || uri.scheme === Schemas.vscodeNotebookCellMetadataDiff) {
            const data = CellUri.parseCellPropertyUri(uri, uri.scheme);
            if (data) {
                uri = CellUri.generate(data.notebook, data.handle);
            }
        }
        if (uri.scheme === Schemas.vscodeNotebookMetadata) {
            return this.viewModel?.items.find(item => item.type === 'modifiedMetadata' ||
                item.type === 'unchangedMetadata');
        }
        return this.viewModel?.items.find(c => {
            switch (c.type) {
                case 'delete':
                    return c.original?.uri.toString() === uri.toString();
                case 'insert':
                    return c.modified?.uri.toString() === uri.toString();
                case 'modified':
                case 'unchanged':
                    return c.modified?.uri.toString() === uri.toString() || c.original?.uri.toString() === uri.toString();
                default:
                    return;
            }
        });
    }
};
NotebookMultiTextDiffEditor = NotebookMultiTextDiffEditor_1 = __decorate([
    __param(1, IInstantiationService),
    __param(2, IThemeService),
    __param(3, IContextKeyService),
    __param(4, INotebookEditorWorkerService),
    __param(5, IConfigurationService),
    __param(6, ITelemetryService),
    __param(7, IStorageService),
    __param(8, INotebookService)
], NotebookMultiTextDiffEditor);
export { NotebookMultiTextDiffEditor };
let WorkbenchUIElementFactory = class WorkbenchUIElementFactory {
    constructor(_instantiationService, notebookDocumentService, notebookService) {
        this._instantiationService = _instantiationService;
        this.notebookDocumentService = notebookDocumentService;
        this.notebookService = notebookService;
    }
    createResourceLabel(element) {
        const label = this._instantiationService.createInstance(ResourceLabel, element, {});
        const that = this;
        return {
            setUri(uri, options = {}) {
                if (!uri) {
                    label.element.clear();
                }
                else {
                    let name = '';
                    let description = '';
                    let extraClasses = undefined;
                    if (uri.scheme === Schemas.vscodeNotebookCell) {
                        const notebookDocument = uri.scheme === Schemas.vscodeNotebookCell ? that.notebookDocumentService.getNotebook(uri) : undefined;
                        const cellIndex = Schemas.vscodeNotebookCell ? that.notebookDocumentService.getNotebook(uri)?.getCellIndex(uri) : undefined;
                        if (notebookDocument && cellIndex !== undefined) {
                            name = localize('notebookCellLabel', "Cell {0}", `${cellIndex + 1}`);
                            const nb = notebookDocument ? that.notebookService.getNotebookTextModel(notebookDocument?.uri) : undefined;
                            const cellLanguage = nb && cellIndex !== undefined ? nb.cells[cellIndex].language : undefined;
                            extraClasses = cellLanguage ? getIconClassesForLanguageId(cellLanguage) : undefined;
                        }
                    }
                    else if (uri.scheme === Schemas.vscodeNotebookCellMetadata || uri.scheme === Schemas.vscodeNotebookCellMetadataDiff) {
                        description = localize('notebookCellMetadataLabel', "Metadata");
                    }
                    else if (uri.scheme === Schemas.vscodeNotebookCellOutput || uri.scheme === Schemas.vscodeNotebookCellOutputDiff) {
                        description = localize('notebookCellOutputLabel', "Output");
                    }
                    label.element.setResource({ name, description }, { strikethrough: options.strikethrough, forceLabel: true, hideIcon: !extraClasses, extraClasses });
                }
            },
            dispose() {
                label.dispose();
            }
        };
    }
};
WorkbenchUIElementFactory = __decorate([
    __param(0, IInstantiationService),
    __param(1, INotebookDocumentService),
    __param(2, INotebookService)
], WorkbenchUIElementFactory);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tNdWx0aURpZmZFZGl0b3IuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci9kaWZmL25vdGVib29rTXVsdGlEaWZmRWRpdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUloRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDcEYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDMUYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBR3JGLE9BQU8sRUFBcUIsdUJBQXVCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUN4RyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUN0RyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUM3RixPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUM5RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUV0RyxPQUFPLEVBQUUsWUFBWSxFQUFZLE1BQU0saURBQWlELENBQUM7QUFDekYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDNUUsT0FBTyxFQUFFLE9BQU8sRUFBNEIsNkJBQTZCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNsSCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUM1RixPQUFP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