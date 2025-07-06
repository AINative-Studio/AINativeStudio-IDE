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
import * as DOM from '../../../../../../base/browser/dom.js';
import { renderMarkdown } from '../../../../../../base/browser/markdownRenderer.js';
import { Action } from '../../../../../../base/common/actions.js';
import { Disposable, DisposableStore } from '../../../../../../base/common/lifecycle.js';
import * as nls from '../../../../../../nls.js';
import { getActionBarActions } from '../../../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { WorkbenchToolBar } from '../../../../../../platform/actions/browser/toolbar.js';
import { IMenuService, MenuId } from '../../../../../../platform/actions/common/actions.js';
import { IContextKeyService } from '../../../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { IOpenerService } from '../../../../../../platform/opener/common/opener.js';
import { IQuickInputService } from '../../../../../../platform/quickinput/common/quickInput.js';
import { ThemeIcon } from '../../../../../../base/common/themables.js';
import { IExtensionsWorkbenchService } from '../../../../extensions/common/extensions.js';
import { JUPYTER_EXTENSION_ID } from '../../notebookBrowser.js';
import { mimetypeIcon } from '../../notebookIcons.js';
import { CellContentPart } from '../cellPart.js';
import { CellUri, NotebookCellExecutionState, RENDERER_NOT_AVAILABLE, isTextStreamMime } from '../../../common/notebookCommon.js';
import { INotebookExecutionStateService } from '../../../common/notebookExecutionStateService.js';
import { INotebookService } from '../../../common/notebookService.js';
import { COPY_OUTPUT_COMMAND_ID } from '../../controller/cellOutputActions.js';
import { autorun, observableValue } from '../../../../../../base/common/observable.js';
import { NOTEBOOK_CELL_HAS_HIDDEN_OUTPUTS, NOTEBOOK_CELL_IS_FIRST_OUTPUT, NOTEBOOK_CELL_OUTPUT_MIMETYPE } from '../../../common/notebookContextKeys.js';
import { TEXT_BASED_MIMETYPES } from '../../viewModel/cellOutputTextHelper.js';
// DOM structure
//
//  #output
//  |
//  |  #output-inner-container
//  |                        |  #cell-output-toolbar
//  |                        |  #output-element
//  |                        |  #output-element
//  |                        |  #output-element
//  |  #output-inner-container
//  |                        |  #cell-output-toolbar
//  |                        |  #output-element
//  |  #output-inner-container
//  |                        |  #cell-output-toolbar
//  |                        |  #output-element
let CellOutputElement = class CellOutputElement extends Disposable {
    constructor(notebookEditor, viewCell, cellOutputContainer, outputContainer, output, notebookService, quickInputService, parentContextKeyService, menuService, extensionsWorkbenchService, instantiationService) {
        super();
        this.notebookEditor = notebookEditor;
        this.viewCell = viewCell;
        this.cellOutputContainer = cellOutputContainer;
        this.outputContainer = outputContainer;
        this.output = output;
        this.notebookService = notebookService;
        this.quickInputService = quickInputService;
        this.menuService = menuService;
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.instantiationService = instantiationService;
        this.toolbarDisposables = this._register(new DisposableStore());
        this.toolbarAttached = false;
        this._outputHeightTimer = null;
        this.contextKeyService = parentContextKeyService;
        this._register(this.output.model.onDidChangeData(() => {
            this.rerender();
        }));
        this._register(this.output.onDidResetRenderer(() => {
            this.rerender();
        }));
    }
    detach() {
        this.renderedOutputContainer?.remove();
        let count = 0;
        if (this.innerContainer) {
            for (let i = 0; i < this.innerContainer.childNodes.length; i++) {
                if (this.innerContainer.childNodes[i].className === 'rendered-output') {
                    count++;
                }
                if (count > 1) {
                    break;
                }
            }
            if (count === 0) {
                this.innerContainer.remove();
            }
        }
        this.notebookEditor.removeInset(this.output);
    }
    updateDOMTop(top) {
        if (this.innerContainer) {
            this.innerContainer.style.top = `${top}px`;
        }
    }
    rerender() {
        if (this.notebookEditor.hasModel() &&
            this.innerContainer &&
            this.renderResult &&
            this.renderResult.type === 1 /* RenderOutputType.Extension */) {
            // Output rendered by extension renderer got an update
            const [mimeTypes, pick] = this.output.resolveMimeTypes(this.notebookEditor.textModel, this.notebookEditor.activeKernel?.preloadProvides);
            const pickedMimeType = mimeTypes[pick];
            if (pickedMimeType.mimeType === this.renderResult.mimeType && pickedMimeType.rendererId === this.renderResult.renderer.id) {
                // Same mimetype, same renderer, call the extension renderer to update
                const index = this.viewCell.outputsViewModels.indexOf(this.output);
                this.notebookEditor.updateOutput(this.viewCell, this.renderResult, this.viewCell.getOutputOffset(index));
                return;
            }
        }
        if (!this.innerContainer) {
            // init rendering didn't happen
            const currOutputIndex = this.cellOutputContainer.renderedOutputEntries.findIndex(entry => entry.element === this);
            const previousSibling = currOutputIndex > 0 && !!(this.cellOutputContainer.renderedOutputEntries[currOutputIndex - 1].element.innerContainer?.parentElement)
                ? this.cellOutputContainer.renderedOutputEntries[currOutputIndex - 1].element.innerContainer
                : undefined;
            this.render(previousSibling);
        }
        else {
            // Another mimetype or renderer is picked, we need to clear the current output and re-render
            const nextElement = this.innerContainer.nextElementSibling;
            this.toolbarDisposables.clear();
            const element = this.innerContainer;
            if (element) {
                element.remove();
                this.notebookEditor.removeInset(this.output);
            }
            this.render(nextElement);
        }
        this._relayoutCell();
    }
    // insert after previousSibling
    _generateInnerOutputContainer(previousSibling, pickedMimeTypeRenderer) {
        this.innerContainer = DOM.$('.output-inner-container');
        if (previousSibling && previousSibling.nextElementSibling) {
            this.outputContainer.domNode.insertBefore(this.innerContainer, previousSibling.nextElementSibling);
        }
        else {
            this.outputContainer.domNode.appendChild(this.innerContainer);
        }
        this.innerContainer.setAttribute('output-mime-type', pickedMimeTypeRenderer.mimeType);
        return this.innerContainer;
    }
    render(previousSibling) {
        const index = this.viewCell.outputsViewModels.indexOf(this.output);
        if (this.viewCell.isOutputCollapsed || !this.notebookEditor.hasModel()) {
            this.cellOutputContainer.flagAsStale();
            return undefined;
        }
        const notebookUri = CellUri.parse(this.viewCell.uri)?.notebook;
        if (!notebookUri) {
            return undefined;
        }
        const notebookTextModel = this.notebookEditor.textModel;
        const [mimeTypes, pick] = this.output.resolveMimeTypes(notebookTextModel, this.notebookEditor.activeKernel?.preloadProvides);
        if (!mimeTypes.find(mimeType => mimeType.isTrusted) || mimeTypes.length === 0) {
            this.viewCell.updateOutputHeight(index, 0, 'CellOutputElement#noMimeType');
            return undefined;
        }
        const selectedPresentation = mimeTypes[pick];
        let renderer = this.notebookService.getRendererInfo(selectedPresentation.rendererId);
        if (!renderer && selectedPresentation.mimeType.indexOf('text/') > -1) {
            renderer = this.notebookService.getRendererInfo('vscode.builtin-renderer');
        }
        const innerContainer = this._generateInnerOutputContainer(previousSibling, selectedPresentation);
        if (index === 0 || this.output.visible.get()) {
            this._attachToolbar(innerContainer, notebookTextModel, this.notebookEditor.activeKernel, index, mimeTypes);
        }
        else {
            this._register(autorun((reader) => {
                const visible = reader.readObservable(this.output.visible);
                if (visible && !this.toolbarAttached) {
                    this._attachToolbar(innerContainer, notebookTextModel, this.notebookEditor.activeKernel, index, mimeTypes);
                }
                else if (!visible) {
                    this.toolbarDisposables.clear();
                }
                this.cellOutputContainer.checkForHiddenOutputs();
            }));
            this.cellOutputContainer.hasHiddenOutputs.set(true, undefined);
        }
        this.renderedOutputContainer = DOM.append(innerContainer, DOM.$('.rendered-output'));
        this.renderResult = renderer
            ? { type: 1 /* RenderOutputType.Extension */, renderer, source: this.output, mimeType: selectedPresentation.mimeType }
            : this._renderMissingRenderer(this.output, selectedPresentation.mimeType);
        this.output.pickedMimeType = selectedPresentation;
        if (!this.renderResult) {
            this.viewCell.updateOutputHeight(index, 0, 'CellOutputElement#renderResultUndefined');
            return undefined;
        }
        this.notebookEditor.createOutput(this.viewCell, this.renderResult, this.viewCell.getOutputOffset(index), false);
        innerContainer.classList.add('background');
        return { initRenderIsSynchronous: false };
    }
    _renderMissingRenderer(viewModel, preferredMimeType) {
        if (!viewModel.model.outputs.length) {
            return this._renderMessage(viewModel, nls.localize('empty', "Cell has no output"));
        }
        if (!preferredMimeType) {
            const mimeTypes = viewModel.model.outputs.map(op => op.mime);
            const mimeTypesMessage = mimeTypes.join(', ');
            return this._renderMessage(viewModel, nls.localize('noRenderer.2', "No renderer could be found for output. It has the following mimetypes: {0}", mimeTypesMessage));
        }
        return this._renderSearchForMimetype(viewModel, preferredMimeType);
    }
    _renderSearchForMimetype(viewModel, mimeType) {
        const query = `@tag:notebookRenderer ${mimeType}`;
        const p = DOM.$('p', undefined, `No renderer could be found for mimetype "${mimeType}", but one might be available on the Marketplace.`);
        const a = DOM.$('a', { href: `command:workbench.extensions.search?%22${query}%22`, class: 'monaco-button monaco-text-button', tabindex: 0, role: 'button', style: 'padding: 8px; text-decoration: none; color: rgb(255, 255, 255); background-color: rgb(14, 99, 156); max-width: 200px;' }, `Search Marketplace`);
        return {
            type: 0 /* RenderOutputType.Html */,
            source: viewModel,
            htmlContent: p.outerHTML + a.outerHTML
        };
    }
    _renderMessage(viewModel, message) {
        const el = DOM.$('p', undefined, message);
        return { type: 0 /* RenderOutputType.Html */, source: viewModel, htmlContent: el.outerHTML };
    }
    shouldEnableCopy(mimeTypes) {
        if (!mimeTypes.find(mimeType => TEXT_BASED_MIMETYPES.indexOf(mimeType.mimeType) || mimeType.mimeType.startsWith('image/'))) {
            return false;
        }
        if (isTextStreamMime(mimeTypes[0].mimeType)) {
            const cellViewModel = this.output.cellViewModel;
            const index = cellViewModel.outputsViewModels.indexOf(this.output);
            if (index > 0) {
                const previousOutput = cellViewModel.model.outputs[index - 1];
                // if the previous output was also a stream, the copy command will be in that output instead
                return !isTextStreamMime(previousOutput.outputs[0].mime);
            }
        }
        return true;
    }
    async _attachToolbar(outputItemDiv, notebookTextModel, kernel, index, mimeTypes) {
        const hasMultipleMimeTypes = mimeTypes.filter(mimeType => mimeType.isTrusted).length > 1;
        const isCopyEnabled = this.shouldEnableCopy(mimeTypes);
        if (index > 0 && !hasMultipleMimeTypes && !isCopyEnabled) {
            // nothing to put in the toolbar
            return;
        }
        if (!this.notebookEditor.hasModel()) {
            return;
        }
        outputItemDiv.style.position = 'relative';
        const mimeTypePicker = DOM.$('.cell-output-toolbar');
        outputItemDiv.appendChild(mimeTypePicker);
        const toolbar = this.toolbarDisposables.add(this.instantiationService.createInstance(WorkbenchToolBar, mimeTypePicker, {
            renderDropdownAsChildElement: false
        }));
        toolbar.context = {
            ui: true,
            cell: this.output.cellViewModel,
            outputViewModel: this.output,
            notebookEditor: this.notebookEditor,
            $mid: 13 /* MarshalledId.NotebookCellActionContext */
        };
        // TODO: This could probably be a real registered action, but it has to talk to this output element
        const pickAction = this.toolbarDisposables.add(new Action('notebook.output.pickMimetype', nls.localize('pickMimeType', "Change Presentation"), ThemeIcon.asClassName(mimetypeIcon), undefined, async (_context) => this._pickActiveMimeTypeRenderer(outputItemDiv, notebookTextModel, kernel, this.output)));
        const menuContextKeyService = this.toolbarDisposables.add(this.contextKeyService.createScoped(outputItemDiv));
        const hasHiddenOutputs = NOTEBOOK_CELL_HAS_HIDDEN_OUTPUTS.bindTo(menuContextKeyService);
        const isFirstCellOutput = NOTEBOOK_CELL_IS_FIRST_OUTPUT.bindTo(menuContextKeyService);
        const cellOutputMimetype = NOTEBOOK_CELL_OUTPUT_MIMETYPE.bindTo(menuContextKeyService);
        isFirstCellOutput.set(index === 0);
        if (mimeTypes[index]) {
            cellOutputMimetype.set(mimeTypes[index].mimeType);
        }
        this.toolbarDisposables.add(autorun((reader) => { hasHiddenOutputs.set(reader.readObservable(this.cellOutputContainer.hasHiddenOutputs)); }));
        const menu = this.toolbarDisposables.add(this.menuService.createMenu(MenuId.NotebookOutputToolbar, menuContextKeyService));
        const updateMenuToolbar = () => {
            let { secondary } = getActionBarActions(menu.getActions({ shouldForwardArgs: true }), () => false);
            if (!isCopyEnabled) {
                secondary = secondary.filter((action) => action.id !== COPY_OUTPUT_COMMAND_ID);
            }
            if (hasMultipleMimeTypes) {
                secondary = [pickAction, ...secondary];
            }
            toolbar.setActions([], secondary);
        };
        updateMenuToolbar();
        this.toolbarDisposables.add(menu.onDidChange(updateMenuToolbar));
    }
    async _pickActiveMimeTypeRenderer(outputItemDiv, notebookTextModel, kernel, viewModel) {
        const [mimeTypes, currIndex] = viewModel.resolveMimeTypes(notebookTextModel, kernel?.preloadProvides);
        const items = [];
        const unsupportedItems = [];
        mimeTypes.forEach((mimeType, index) => {
            if (mimeType.isTrusted) {
                const arr = mimeType.rendererId === RENDERER_NOT_AVAILABLE ?
                    unsupportedItems :
                    items;
                arr.push({
                    label: mimeType.mimeType,
                    id: mimeType.mimeType,
                    index: index,
                    picked: index === currIndex,
                    detail: this._generateRendererInfo(mimeType.rendererId),
                    description: index === currIndex ? nls.localize('curruentActiveMimeType', "Currently Active") : undefined
                });
            }
        });
        if (unsupportedItems.some(m => JUPYTER_RENDERER_MIMETYPES.includes(m.id))) {
            unsupportedItems.push({
                label: nls.localize('installJupyterPrompt', "Install additional renderers from the marketplace"),
                id: 'installRenderers',
                index: mimeTypes.length
            });
        }
        const disposables = new DisposableStore();
        const picker = disposables.add(this.quickInputService.createQuickPick({ useSeparators: true }));
        picker.items = [
            ...items,
            { type: 'separator' },
            ...unsupportedItems
        ];
        picker.activeItems = items.filter(item => !!item.picked);
        picker.placeholder = items.length !== mimeTypes.length
            ? nls.localize('promptChooseMimeTypeInSecure.placeHolder', "Select mimetype to render for current output")
            : nls.localize('promptChooseMimeType.placeHolder', "Select mimetype to render for current output");
        const pick = await new Promise(resolve => {
            disposables.add(picker.onDidAccept(() => {
                resolve(picker.selectedItems.length === 1 ? picker.selectedItems[0] : undefined);
                disposables.dispose();
            }));
            picker.show();
        });
        if (pick === undefined || pick.index === currIndex) {
            return;
        }
        if (pick.id === 'installRenderers') {
            this._showJupyterExtension();
            return;
        }
        // user chooses another mimetype
        const nextElement = outputItemDiv.nextElementSibling;
        this.toolbarDisposables.clear();
        const element = this.innerContainer;
        if (element) {
            element.remove();
            this.notebookEditor.removeInset(viewModel);
        }
        viewModel.pickedMimeType = mimeTypes[pick.index];
        this.viewCell.updateOutputMinHeight(this.viewCell.layoutInfo.outputTotalHeight);
        const { mimeType, rendererId } = mimeTypes[pick.index];
        this.notebookService.updateMimePreferredRenderer(notebookTextModel.viewType, mimeType, rendererId, mimeTypes.map(m => m.mimeType));
        this.render(nextElement);
        this._validateFinalOutputHeight(false);
        this._relayoutCell();
    }
    async _showJupyterExtension() {
        await this.extensionsWorkbenchService.openSearch(`@id:${JUPYTER_EXTENSION_ID}`);
    }
    _generateRendererInfo(renderId) {
        const renderInfo = this.notebookService.getRendererInfo(renderId);
        if (renderInfo) {
            const displayName = renderInfo.displayName !== '' ? renderInfo.displayName : renderInfo.id;
            return `${displayName} (${renderInfo.extensionId.value})`;
        }
        return nls.localize('unavailableRenderInfo', "renderer not available");
    }
    _validateFinalOutputHeight(synchronous) {
        if (this._outputHeightTimer !== null) {
            clearTimeout(this._outputHeightTimer);
        }
        if (synchronous) {
            this.viewCell.unlockOutputHeight();
        }
        else {
            this._outputHeightTimer = setTimeout(() => {
                this.viewCell.unlockOutputHeight();
            }, 1000);
        }
    }
    _relayoutCell() {
        this.notebookEditor.layoutNotebookCell(this.viewCell, this.viewCell.layoutInfo.totalHeight);
    }
    dispose() {
        if (this._outputHeightTimer) {
            this.viewCell.unlockOutputHeight();
            clearTimeout(this._outputHeightTimer);
        }
        super.dispose();
    }
};
CellOutputElement = __decorate([
    __param(5, INotebookService),
    __param(6, IQuickInputService),
    __param(7, IContextKeyService),
    __param(8, IMenuService),
    __param(9, IExtensionsWorkbenchService),
    __param(10, IInstantiationService)
], CellOutputElement);
class OutputEntryViewHandler {
    constructor(model, element) {
        this.model = model;
        this.element = element;
    }
}
var CellOutputUpdateContext;
(function (CellOutputUpdateContext) {
    CellOutputUpdateContext[CellOutputUpdateContext["Execution"] = 1] = "Execution";
    CellOutputUpdateContext[CellOutputUpdateContext["Other"] = 2] = "Other";
})(CellOutputUpdateContext || (CellOutputUpdateContext = {}));
let CellOutputContainer = class CellOutputContainer extends CellContentPart {
    checkForHiddenOutputs() {
        if (this._outputEntries.find(entry => { return entry.model.visible; })) {
            this.hasHiddenOutputs.set(true, undefined);
        }
        else {
            this.hasHiddenOutputs.set(false, undefined);
        }
    }
    get renderedOutputEntries() {
        return this._outputEntries;
    }
    constructor(notebookEditor, viewCell, templateData, options, openerService, _notebookExecutionStateService, instantiationService) {
        super();
        this.notebookEditor = notebookEditor;
        this.viewCell = viewCell;
        this.templateData = templateData;
        this.options = options;
        this.openerService = openerService;
        this._notebookExecutionStateService = _notebookExecutionStateService;
        this.instantiationService = instantiationService;
        this._outputEntries = [];
        this._hasStaleOutputs = false;
        this.hasHiddenOutputs = observableValue('hasHiddenOutputs', false);
        this._outputHeightTimer = null;
        this._register(viewCell.onDidStartExecution(() => {
            viewCell.updateOutputMinHeight(viewCell.layoutInfo.outputTotalHeight);
        }));
        this._register(viewCell.onDidStopExecution(() => {
            this._validateFinalOutputHeight(false);
        }));
        this._register(viewCell.onDidChangeOutputs(splice => {
            const executionState = this._notebookExecutionStateService.getCellExecution(viewCell.uri);
            const context = executionState ? 1 /* CellOutputUpdateContext.Execution */ : 2 /* CellOutputUpdateContext.Other */;
            this._updateOutputs(splice, context);
        }));
        this._register(viewCell.onDidChangeLayout(() => {
            this.updateInternalLayoutNow(viewCell);
        }));
    }
    updateInternalLayoutNow(viewCell) {
        this.templateData.outputContainer.setTop(viewCell.layoutInfo.outputContainerOffset);
        this.templateData.outputShowMoreContainer.setTop(viewCell.layoutInfo.outputShowMoreContainerOffset);
        this._outputEntries.forEach(entry => {
            const index = this.viewCell.outputsViewModels.indexOf(entry.model);
            if (index >= 0) {
                const top = this.viewCell.getOutputOffsetInContainer(index);
                entry.element.updateDOMTop(top);
            }
        });
    }
    render() {
        try {
            this._doRender();
        }
        finally {
            // TODO@rebornix, this is probably not necessary at all as cell layout change would send the update request.
            this._relayoutCell();
        }
    }
    /**
     * Notify that an output may have been swapped out without the model getting rendered.
     */
    flagAsStale() {
        this._hasStaleOutputs = true;
    }
    _doRender() {
        if (this.viewCell.outputsViewModels.length > 0) {
            if (this.viewCell.layoutInfo.outputTotalHeight !== 0) {
                this.viewCell.updateOutputMinHeight(this.viewCell.layoutInfo.outputTotalHeight);
            }
            DOM.show(this.templateData.outputContainer.domNode);
            for (let index = 0; index < Math.min(this.options.limit, this.viewCell.outputsViewModels.length); index++) {
                const currOutput = this.viewCell.outputsViewModels[index];
                const entry = this.instantiationService.createInstance(CellOutputElement, this.notebookEditor, this.viewCell, this, this.templateData.outputContainer, currOutput);
                this._outputEntries.push(new OutputEntryViewHandler(currOutput, entry));
                entry.render(undefined);
            }
            if (this.viewCell.outputsViewModels.length > this.options.limit) {
                DOM.show(this.templateData.outputShowMoreContainer.domNode);
                this.viewCell.updateOutputShowMoreContainerHeight(46);
            }
            this._validateFinalOutputHeight(false);
        }
        else {
            // noop
            DOM.hide(this.templateData.outputContainer.domNode);
        }
        this.templateData.outputShowMoreContainer.domNode.innerText = '';
        if (this.viewCell.outputsViewModels.length > this.options.limit) {
            this.templateData.outputShowMoreContainer.domNode.appendChild(this._generateShowMoreElement(this.templateData.templateDisposables));
        }
        else {
            DOM.hide(this.templateData.outputShowMoreContainer.domNode);
            this.viewCell.updateOutputShowMoreContainerHeight(0);
        }
    }
    viewUpdateShowOutputs(initRendering) {
        if (this._hasStaleOutputs) {
            this._hasStaleOutputs = false;
            this._outputEntries.forEach(entry => {
                entry.element.rerender();
            });
        }
        for (let index = 0; index < this._outputEntries.length; index++) {
            const viewHandler = this._outputEntries[index];
            const outputEntry = viewHandler.element;
            if (outputEntry.renderResult) {
                this.notebookEditor.createOutput(this.viewCell, outputEntry.renderResult, this.viewCell.getOutputOffset(index), false);
            }
            else {
                outputEntry.render(undefined);
            }
        }
        this._relayoutCell();
    }
    viewUpdateHideOuputs() {
        for (let index = 0; index < this._outputEntries.length; index++) {
            this.notebookEditor.hideInset(this._outputEntries[index].model);
        }
    }
    _validateFinalOutputHeight(synchronous) {
        if (this._outputHeightTimer !== null) {
            clearTimeout(this._outputHeightTimer);
        }
        const executionState = this._notebookExecutionStateService.getCellExecution(this.viewCell.uri);
        if (synchronous) {
            this.viewCell.unlockOutputHeight();
        }
        else if (executionState?.state !== NotebookCellExecutionState.Executing) {
            this._outputHeightTimer = setTimeout(() => {
                this.viewCell.unlockOutputHeight();
            }, 200);
        }
    }
    _updateOutputs(splice, context = 2 /* CellOutputUpdateContext.Other */) {
        const previousOutputHeight = this.viewCell.layoutInfo.outputTotalHeight;
        // for cell output update, we make sure the cell does not shrink before the new outputs are rendered.
        this.viewCell.updateOutputMinHeight(previousOutputHeight);
        if (this.viewCell.outputsViewModels.length) {
            DOM.show(this.templateData.outputContainer.domNode);
        }
        else {
            DOM.hide(this.templateData.outputContainer.domNode);
        }
        this.viewCell.spliceOutputHeights(splice.start, splice.deleteCount, splice.newOutputs.map(_ => 0));
        this._renderNow(splice, context);
    }
    _renderNow(splice, context) {
        if (splice.start >= this.options.limit) {
            // splice items out of limit
            return;
        }
        const firstGroupEntries = this._outputEntries.slice(0, splice.start);
        const deletedEntries = this._outputEntries.slice(splice.start, splice.start + splice.deleteCount);
        const secondGroupEntries = this._outputEntries.slice(splice.start + splice.deleteCount);
        let newlyInserted = this.viewCell.outputsViewModels.slice(splice.start, splice.start + splice.newOutputs.length);
        // [...firstGroup, ...deletedEntries, ...secondGroupEntries]  [...restInModel]
        // [...firstGroup, ...newlyInserted, ...secondGroupEntries, restInModel]
        if (firstGroupEntries.length + newlyInserted.length + secondGroupEntries.length > this.options.limit) {
            // exceeds limit again
            if (firstGroupEntries.length + newlyInserted.length > this.options.limit) {
                [...deletedEntries, ...secondGroupEntries].forEach(entry => {
                    entry.element.detach();
                    entry.element.dispose();
                });
                newlyInserted = newlyInserted.slice(0, this.options.limit - firstGroupEntries.length);
                const newlyInsertedEntries = newlyInserted.map(insert => {
                    return new OutputEntryViewHandler(insert, this.instantiationService.createInstance(CellOutputElement, this.notebookEditor, this.viewCell, this, this.templateData.outputContainer, insert));
                });
                this._outputEntries = [...firstGroupEntries, ...newlyInsertedEntries];
                // render newly inserted outputs
                for (let i = firstGroupEntries.length; i < this._outputEntries.length; i++) {
                    this._outputEntries[i].element.render(undefined);
                }
            }
            else {
                // part of secondGroupEntries are pushed out of view
                // now we have to be creative as secondGroupEntries might not use dedicated containers
                const elementsPushedOutOfView = secondGroupEntries.slice(this.options.limit - firstGroupEntries.length - newlyInserted.length);
                [...deletedEntries, ...elementsPushedOutOfView].forEach(entry => {
                    entry.element.detach();
                    entry.element.dispose();
                });
                // exclusive
                const reRenderRightBoundary = firstGroupEntries.length + newlyInserted.length;
                const newlyInsertedEntries = newlyInserted.map(insert => {
                    return new OutputEntryViewHandler(insert, this.instantiationService.createInstance(CellOutputElement, this.notebookEditor, this.viewCell, this, this.templateData.outputContainer, insert));
                });
                this._outputEntries = [...firstGroupEntries, ...newlyInsertedEntries, ...secondGroupEntries.slice(0, this.options.limit - firstGroupEntries.length - newlyInserted.length)];
                for (let i = firstGroupEntries.length; i < reRenderRightBoundary; i++) {
                    const previousSibling = i - 1 >= 0 && this._outputEntries[i - 1] && !!(this._outputEntries[i - 1].element.innerContainer?.parentElement) ? this._outputEntries[i - 1].element.innerContainer : undefined;
                    this._outputEntries[i].element.render(previousSibling);
                }
            }
        }
        else {
            // after splice, it doesn't exceed
            deletedEntries.forEach(entry => {
                entry.element.detach();
                entry.element.dispose();
            });
            const reRenderRightBoundary = firstGroupEntries.length + newlyInserted.length;
            const newlyInsertedEntries = newlyInserted.map(insert => {
                return new OutputEntryViewHandler(insert, this.instantiationService.createInstance(CellOutputElement, this.notebookEditor, this.viewCell, this, this.templateData.outputContainer, insert));
            });
            let outputsNewlyAvailable = [];
            if (firstGroupEntries.length + newlyInsertedEntries.length + secondGroupEntries.length < this.viewCell.outputsViewModels.length) {
                const last = Math.min(this.options.limit, this.viewCell.outputsViewModels.length);
                outputsNewlyAvailable = this.viewCell.outputsViewModels.slice(firstGroupEntries.length + newlyInsertedEntries.length + secondGroupEntries.length, last).map(output => {
                    return new OutputEntryViewHandler(output, this.instantiationService.createInstance(CellOutputElement, this.notebookEditor, this.viewCell, this, this.templateData.outputContainer, output));
                });
            }
            this._outputEntries = [...firstGroupEntries, ...newlyInsertedEntries, ...secondGroupEntries, ...outputsNewlyAvailable];
            for (let i = firstGroupEntries.length; i < reRenderRightBoundary; i++) {
                const previousSibling = i - 1 >= 0 && this._outputEntries[i - 1] && !!(this._outputEntries[i - 1].element.innerContainer?.parentElement) ? this._outputEntries[i - 1].element.innerContainer : undefined;
                this._outputEntries[i].element.render(previousSibling);
            }
            for (let i = 0; i < outputsNewlyAvailable.length; i++) {
                this._outputEntries[firstGroupEntries.length + newlyInserted.length + secondGroupEntries.length + i].element.render(undefined);
            }
        }
        if (this.viewCell.outputsViewModels.length > this.options.limit) {
            DOM.show(this.templateData.outputShowMoreContainer.domNode);
            if (!this.templateData.outputShowMoreContainer.domNode.hasChildNodes()) {
                this.templateData.outputShowMoreContainer.domNode.appendChild(this._generateShowMoreElement(this.templateData.templateDisposables));
            }
            this.viewCell.updateOutputShowMoreContainerHeight(46);
        }
        else {
            DOM.hide(this.templateData.outputShowMoreContainer.domNode);
        }
        this._relayoutCell();
        // if it's clearing all outputs, or outputs are all rendered synchronously
        // shrink immediately as the final output height will be zero.
        // if it's rerun, then the output clearing might be temporary, so we don't shrink immediately
        this._validateFinalOutputHeight(context === 2 /* CellOutputUpdateContext.Other */ && this.viewCell.outputsViewModels.length === 0);
    }
    _generateShowMoreElement(disposables) {
        const md = {
            value: `There are more than ${this.options.limit} outputs, [show more (open the raw output data in a text editor) ...](command:workbench.action.openLargeOutput)`,
            isTrusted: true,
            supportThemeIcons: true
        };
        const rendered = renderMarkdown(md, {
            actionHandler: {
                callback: (content) => {
                    if (content === 'command:workbench.action.openLargeOutput') {
                        this.openerService.open(CellUri.generateCellOutputUriWithId(this.notebookEditor.textModel.uri));
                    }
                    return;
                },
                disposables
            }
        });
        disposables.add(rendered);
        rendered.element.classList.add('output-show-more');
        return rendered.element;
    }
    _relayoutCell() {
        this.notebookEditor.layoutNotebookCell(this.viewCell, this.viewCell.layoutInfo.totalHeight);
    }
    dispose() {
        this.viewCell.updateOutputMinHeight(0);
        if (this._outputHeightTimer) {
            clearTimeout(this._outputHeightTimer);
        }
        this._outputEntries.forEach(entry => {
            entry.element.dispose();
        });
        super.dispose();
    }
};
CellOutputContainer = __decorate([
    __param(4, IOpenerService),
    __param(5, INotebookExecutionStateService),
    __param(6, IInstantiationService)
], CellOutputContainer);
export { CellOutputContainer };
const JUPYTER_RENDERER_MIMETYPES = [
    'application/geo+json',
    'application/vdom.v1+json',
    'application/vnd.dataresource+json',
    'application/vnd.plotly.v1+json',
    'application/vnd.vega.v2+json',
    'application/vnd.vega.v3+json',
    'application/vnd.vega.v4+json',
    'application/vnd.vega.v5+json',
    'application/vnd.vegalite.v1+json',
    'application/vnd.vegalite.v2+json',
    'application/vnd.vegalite.v3+json',
    'application/vnd.vegalite.v4+json',
    'application/x-nteract-model-debug+json',
    'image/svg+xml',
    'text/latex',
    'text/vnd.plotly.v1+html',
    'application/vnd.jupyter.widget-view+json',
    'application/vnd.code.notebook.error'
];
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2VsbE91dHB1dC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvdmlldy9jZWxsUGFydHMvY2VsbE91dHB1dC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLHVDQUF1QyxDQUFDO0FBRTdELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUNwRixPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFFbEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUV6RixPQUFPLEtBQUssR0FBRyxNQUFNLDBCQUEwQixDQUFDO0FBQ2hELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHVFQUF1RSxDQUFDO0FBQzVHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQ3pGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDNUYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDaEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0VBQWtFLENBQUM7QUFDekcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxrQkFBa0IsRUFBa0IsTUFBTSw0REFBNEQsQ0FBQztBQUNoSCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDdkUsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDMUYsT0FBTyxFQUFxRixvQkFBb0IsRUFBb0IsTUFB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