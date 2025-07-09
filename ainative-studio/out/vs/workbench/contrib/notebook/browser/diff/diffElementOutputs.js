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
import * as DOM from '../../../../../base/browser/dom.js';
import * as nls from '../../../../../nls.js';
import { Disposable, DisposableStore } from '../../../../../base/common/lifecycle.js';
import { SideBySideDiffElementViewModel } from './diffElementViewModel.js';
import { DiffSide } from './notebookDiffEditorBrowser.js';
import { INotebookService } from '../../common/notebookService.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { mimetypeIcon } from '../notebookIcons.js';
import { StandardKeyboardEvent } from '../../../../../base/browser/keyboardEvent.js';
import { IQuickInputService } from '../../../../../platform/quickinput/common/quickInput.js';
export class OutputElement extends Disposable {
    constructor(_notebookEditor, _notebookTextModel, _notebookService, _quickInputService, _diffElementViewModel, _diffSide, _nestedCell, _outputContainer, output) {
        super();
        this._notebookEditor = _notebookEditor;
        this._notebookTextModel = _notebookTextModel;
        this._notebookService = _notebookService;
        this._quickInputService = _quickInputService;
        this._diffElementViewModel = _diffElementViewModel;
        this._diffSide = _diffSide;
        this._nestedCell = _nestedCell;
        this._outputContainer = _outputContainer;
        this.output = output;
        this.resizeListener = this._register(new DisposableStore());
    }
    render(index, beforeElement) {
        const outputItemDiv = document.createElement('div');
        let result = undefined;
        const [mimeTypes, pick] = this.output.resolveMimeTypes(this._notebookTextModel, undefined);
        const pickedMimeTypeRenderer = this.output.pickedMimeType || mimeTypes[pick];
        if (mimeTypes.length > 1) {
            outputItemDiv.style.position = 'relative';
            const mimeTypePicker = DOM.$('.multi-mimetype-output');
            mimeTypePicker.classList.add(...ThemeIcon.asClassNameArray(mimetypeIcon));
            mimeTypePicker.tabIndex = 0;
            mimeTypePicker.title = nls.localize('mimeTypePicker', "Choose a different output mimetype, available mimetypes: {0}", mimeTypes.map(mimeType => mimeType.mimeType).join(', '));
            outputItemDiv.appendChild(mimeTypePicker);
            this.resizeListener.add(DOM.addStandardDisposableListener(mimeTypePicker, 'mousedown', async (e) => {
                if (e.leftButton) {
                    e.preventDefault();
                    e.stopPropagation();
                    await this.pickActiveMimeTypeRenderer(this._notebookTextModel, this.output);
                }
            }));
            this.resizeListener.add((DOM.addDisposableListener(mimeTypePicker, DOM.EventType.KEY_DOWN, async (e) => {
                const event = new StandardKeyboardEvent(e);
                if ((event.equals(3 /* KeyCode.Enter */) || event.equals(10 /* KeyCode.Space */))) {
                    e.preventDefault();
                    e.stopPropagation();
                    await this.pickActiveMimeTypeRenderer(this._notebookTextModel, this.output);
                }
            })));
        }
        const innerContainer = DOM.$('.output-inner-container');
        DOM.append(outputItemDiv, innerContainer);
        if (mimeTypes.length !== 0) {
            const renderer = this._notebookService.getRendererInfo(pickedMimeTypeRenderer.rendererId);
            result = renderer
                ? { type: 1 /* RenderOutputType.Extension */, renderer, source: this.output, mimeType: pickedMimeTypeRenderer.mimeType }
                : this._renderMissingRenderer(this.output, pickedMimeTypeRenderer.mimeType);
            this.output.pickedMimeType = pickedMimeTypeRenderer;
        }
        this.domNode = outputItemDiv;
        this.renderResult = result;
        if (!result) {
            // this.viewCell.updateOutputHeight(index, 0);
            return;
        }
        if (beforeElement) {
            this._outputContainer.insertBefore(outputItemDiv, beforeElement);
        }
        else {
            this._outputContainer.appendChild(outputItemDiv);
        }
        this._notebookEditor.createOutput(this._diffElementViewModel, this._nestedCell, result, () => this.getOutputOffsetInCell(index), this._diffElementViewModel instanceof SideBySideDiffElementViewModel
            ? this._diffSide
            : this._diffElementViewModel.type === 'insert' ? DiffSide.Modified : DiffSide.Original);
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
            htmlContent: p.outerHTML + a.outerHTML,
        };
    }
    _renderMessage(viewModel, message) {
        const el = DOM.$('p', undefined, message);
        return { type: 0 /* RenderOutputType.Html */, source: viewModel, htmlContent: el.outerHTML };
    }
    async pickActiveMimeTypeRenderer(notebookTextModel, viewModel) {
        const [mimeTypes, currIndex] = viewModel.resolveMimeTypes(notebookTextModel, undefined);
        const items = mimeTypes.filter(mimeType => mimeType.isTrusted).map((mimeType, index) => ({
            label: mimeType.mimeType,
            id: mimeType.mimeType,
            index: index,
            picked: index === currIndex,
            detail: this.generateRendererInfo(mimeType.rendererId),
            description: index === currIndex ? nls.localize('curruentActiveMimeType', "Currently Active") : undefined
        }));
        const disposables = new DisposableStore();
        const picker = disposables.add(this._quickInputService.createQuickPick());
        picker.items = items;
        picker.activeItems = items.filter(item => !!item.picked);
        picker.placeholder = items.length !== mimeTypes.length
            ? nls.localize('promptChooseMimeTypeInSecure.placeHolder', "Select mimetype to render for current output. Rich mimetypes are available only when the notebook is trusted")
            : nls.localize('promptChooseMimeType.placeHolder', "Select mimetype to render for current output");
        const pick = await new Promise(resolve => {
            disposables.add(picker.onDidAccept(() => {
                resolve(picker.selectedItems.length === 1 ? picker.selectedItems[0].index : undefined);
                disposables.dispose();
            }));
            picker.show();
        });
        if (pick === undefined) {
            return;
        }
        if (pick !== currIndex) {
            // user chooses another mimetype
            const index = this._nestedCell.outputsViewModels.indexOf(viewModel);
            const nextElement = this.domNode.nextElementSibling;
            this.resizeListener.clear();
            const element = this.domNode;
            if (element) {
                element.remove();
                this._notebookEditor.removeInset(this._diffElementViewModel, this._nestedCell, viewModel, this._diffSide);
            }
            viewModel.pickedMimeType = mimeTypes[pick];
            this.render(index, nextElement);
        }
    }
    generateRendererInfo(renderId) {
        const renderInfo = this._notebookService.getRendererInfo(renderId);
        if (renderInfo) {
            const displayName = renderInfo.displayName !== '' ? renderInfo.displayName : renderInfo.id;
            return `${displayName} (${renderInfo.extensionId.value})`;
        }
        return nls.localize('builtinRenderInfo', "built-in");
    }
    getCellOutputCurrentIndex() {
        return this._diffElementViewModel.getNestedCellViewModel(this._diffSide).outputs.indexOf(this.output.model);
    }
    updateHeight(index, height) {
        this._diffElementViewModel.updateOutputHeight(this._diffSide, index, height);
    }
    getOutputOffsetInContainer(index) {
        return this._diffElementViewModel.getOutputOffsetInContainer(this._diffSide, index);
    }
    getOutputOffsetInCell(index) {
        return this._diffElementViewModel.getOutputOffsetInCell(this._diffSide, index);
    }
}
let OutputContainer = class OutputContainer extends Disposable {
    constructor(_editor, _notebookTextModel, _diffElementViewModel, _nestedCellViewModel, _diffSide, _outputContainer, _notebookService, _quickInputService) {
        super();
        this._editor = _editor;
        this._notebookTextModel = _notebookTextModel;
        this._diffElementViewModel = _diffElementViewModel;
        this._nestedCellViewModel = _nestedCellViewModel;
        this._diffSide = _diffSide;
        this._outputContainer = _outputContainer;
        this._notebookService = _notebookService;
        this._quickInputService = _quickInputService;
        this._outputEntries = new Map();
        this._register(this._diffElementViewModel.onDidLayoutChange(() => {
            this._outputEntries.forEach((value, key) => {
                const index = _nestedCellViewModel.outputs.indexOf(key.model);
                if (index >= 0) {
                    const top = this._diffElementViewModel.getOutputOffsetInContainer(this._diffSide, index);
                    value.domNode.style.top = `${top}px`;
                }
            });
        }));
        this._register(this._nestedCellViewModel.textModel.onDidChangeOutputs(splice => {
            this._updateOutputs(splice);
        }));
    }
    _updateOutputs(splice) {
        const removedKeys = [];
        this._outputEntries.forEach((value, key) => {
            if (this._nestedCellViewModel.outputsViewModels.indexOf(key) < 0) {
                // already removed
                removedKeys.push(key);
                // remove element from DOM
                value.domNode.remove();
                this._editor.removeInset(this._diffElementViewModel, this._nestedCellViewModel, key, this._diffSide);
            }
        });
        removedKeys.forEach(key => {
            this._outputEntries.get(key)?.dispose();
            this._outputEntries.delete(key);
        });
        let prevElement = undefined;
        const outputsToRender = this._nestedCellViewModel.outputsViewModels;
        outputsToRender.reverse().forEach(output => {
            if (this._outputEntries.has(output)) {
                // already exist
                prevElement = this._outputEntries.get(output).domNode;
                return;
            }
            // newly added element
            const currIndex = this._nestedCellViewModel.outputsViewModels.indexOf(output);
            this._renderOutput(output, currIndex, prevElement);
            prevElement = this._outputEntries.get(output)?.domNode;
        });
    }
    render() {
        // TODO, outputs to render (should have a limit)
        for (let index = 0; index < this._nestedCellViewModel.outputsViewModels.length; index++) {
            const currOutput = this._nestedCellViewModel.outputsViewModels[index];
            // always add to the end
            this._renderOutput(currOutput, index, undefined);
        }
    }
    showOutputs() {
        for (let index = 0; index < this._nestedCellViewModel.outputsViewModels.length; index++) {
            const currOutput = this._nestedCellViewModel.outputsViewModels[index];
            // always add to the end
            this._editor.showInset(this._diffElementViewModel, currOutput.cellViewModel, currOutput, this._diffSide);
        }
    }
    hideOutputs() {
        this._outputEntries.forEach((outputElement, cellOutputViewModel) => {
            this._editor.hideInset(this._diffElementViewModel, this._nestedCellViewModel, cellOutputViewModel);
        });
    }
    _renderOutput(currOutput, index, beforeElement) {
        if (!this._outputEntries.has(currOutput)) {
            this._outputEntries.set(currOutput, new OutputElement(this._editor, this._notebookTextModel, this._notebookService, this._quickInputService, this._diffElementViewModel, this._diffSide, this._nestedCellViewModel, this._outputContainer, currOutput));
        }
        const renderElement = this._outputEntries.get(currOutput);
        renderElement.render(index, beforeElement);
    }
};
OutputContainer = __decorate([
    __param(6, INotebookService),
    __param(7, IQuickInputService)
], OutputContainer);
export { OutputContainer };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlmZkVsZW1lbnRPdXRwdXRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvZGlmZi9kaWZmRWxlbWVudE91dHB1dHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQ0FBb0MsQ0FBQztBQUMxRCxPQUFPLEtBQUssR0FBRyxNQUFNLHVCQUF1QixDQUFDO0FBQzdDLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDdEYsT0FBTyxFQUFnQyw4QkFBOEIsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQ3pHLE9BQU8sRUFBRSxRQUFRLEVBQTJCLE1BQU0sZ0NBQWdDLENBQUM7QUFJbkYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFFbkUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUNuRCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUVyRixPQUFPLEVBQUUsa0JBQWtCLEVBQWtCLE1BQU0seURBQXlELENBQUM7QUFNN0csTUFBTSxPQUFPLGFBQWMsU0FBUSxVQUFVO0lBSzVDLFlBQ1MsZUFBd0MsRUFDeEMsa0JBQXFDLEVBQ3JDLGdCQUFrQyxFQUNsQyxrQkFBc0MsRUFDdEMscUJBQW1ELEVBQ25ELFNBQW1CLEVBQ25CLFdBQW9DLEVBQ3BDLGdCQUE2QixFQUM1QixNQUE0QjtRQUVyQyxLQUFLLEVBQUUsQ0FBQztRQVZBLG9CQUFlLEdBQWYsZUFBZSxDQUF5QjtRQUN4Qyx1QkFBa0Is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