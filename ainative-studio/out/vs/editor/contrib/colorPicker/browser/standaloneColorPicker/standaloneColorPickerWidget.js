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
var StandaloneColorPickerWidget_1;
import '../colorPicker.css';
import { Disposable, MutableDisposable } from '../../../../../base/common/lifecycle.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { EditorHoverStatusBar } from '../../../hover/browser/contentHoverStatusBar.js';
import { IKeybindingService } from '../../../../../platform/keybinding/common/keybinding.js';
import { Emitter } from '../../../../../base/common/event.js';
import { ILanguageFeaturesService } from '../../../../common/services/languageFeatures.js';
import { DefaultDocumentColorProvider } from '../defaultDocumentColorProvider.js';
import { IEditorWorkerService } from '../../../../common/services/editorWorker.js';
import { StandaloneColorPickerParticipant } from './standaloneColorPickerParticipant.js';
import * as dom from '../../../../../base/browser/dom.js';
import { IHoverService } from '../../../../../platform/hover/browser/hover.js';
class StandaloneColorPickerResult {
    // The color picker result consists of: an array of color results and a boolean indicating if the color was found in the editor
    constructor(value, foundInEditor) {
        this.value = value;
        this.foundInEditor = foundInEditor;
    }
}
const PADDING = 8;
const CLOSE_BUTTON_WIDTH = 22;
let StandaloneColorPickerWidget = class StandaloneColorPickerWidget extends Disposable {
    static { StandaloneColorPickerWidget_1 = this; }
    static { this.ID = 'editor.contrib.standaloneColorPickerWidget'; }
    constructor(_editor, _standaloneColorPickerVisible, _standaloneColorPickerFocused, _instantiationService, _keybindingService, _languageFeaturesService, _editorWorkerService, _hoverService) {
        super();
        this._editor = _editor;
        this._standaloneColorPickerVisible = _standaloneColorPickerVisible;
        this._standaloneColorPickerFocused = _standaloneColorPickerFocused;
        this._keybindingService = _keybindingService;
        this._languageFeaturesService = _languageFeaturesService;
        this._editorWorkerService = _editorWorkerService;
        this._hoverService = _hoverService;
        this.allowEditorOverflow = true;
        this._position = undefined;
        this._body = document.createElement('div');
        this._colorHover = null;
        this._selectionSetInEditor = false;
        this._onResult = this._register(new Emitter());
        this.onResult = this._onResult.event;
        this._renderedHoverParts = this._register(new MutableDisposable());
        this._renderedStatusBar = this._register(new MutableDisposable());
        this._standaloneColorPickerVisible.set(true);
        this._standaloneColorPickerParticipant = _instantiationService.createInstance(StandaloneColorPickerParticipant, this._editor);
        this._position = this._editor._getViewModel()?.getPrimaryCursorState().modelState.position;
        const editorSelection = this._editor.getSelection();
        const selection = editorSelection ?
            {
                startLineNumber: editorSelection.startLineNumber,
                startColumn: editorSelection.startColumn,
                endLineNumber: editorSelection.endLineNumber,
                endColumn: editorSelection.endColumn
            } : { startLineNumber: 0, endLineNumber: 0, endColumn: 0, startColumn: 0 };
        const focusTracker = this._register(dom.trackFocus(this._body));
        this._register(focusTracker.onDidBlur(_ => {
            this.hide();
        }));
        this._register(focusTracker.onDidFocus(_ => {
            this.focus();
        }));
        // When the cursor position changes, hide the color picker
        this._register(this._editor.onDidChangeCursorPosition(() => {
            // Do not hide the color picker when the cursor changes position due to the keybindings
            if (!this._selectionSetInEditor) {
                this.hide();
            }
            else {
                this._selectionSetInEditor = false;
            }
        }));
        this._register(this._editor.onMouseMove((e) => {
            const classList = e.target.element?.classList;
            if (classList && classList.contains('colorpicker-color-decoration')) {
                this.hide();
            }
        }));
        this._register(this.onResult((result) => {
            this._render(result.value, result.foundInEditor);
        }));
        this._start(selection);
        this._body.style.zIndex = '50';
        this._editor.addContentWidget(this);
    }
    updateEditor() {
        if (this._colorHover) {
            this._standaloneColorPickerParticipant.updateEditorModel(this._colorHover);
        }
    }
    getId() {
        return StandaloneColorPickerWidget_1.ID;
    }
    getDomNode() {
        return this._body;
    }
    getPosition() {
        if (!this._position) {
            return null;
        }
        const positionPreference = this._editor.getOption(62 /* EditorOption.hover */).above;
        return {
            position: this._position,
            secondaryPosition: this._position,
            preference: positionPreference ? [1 /* ContentWidgetPositionPreference.ABOVE */, 2 /* ContentWidgetPositionPreference.BELOW */] : [2 /* ContentWidgetPositionPreference.BELOW */, 1 /* ContentWidgetPositionPreference.ABOVE */],
            positionAffinity: 2 /* PositionAffinity.None */
        };
    }
    hide() {
        this.dispose();
        this._standaloneColorPickerVisible.set(false);
        this._standaloneColorPickerFocused.set(false);
        this._editor.removeContentWidget(this);
        this._editor.focus();
    }
    focus() {
        this._standaloneColorPickerFocused.set(true);
        this._body.focus();
    }
    async _start(selection) {
        const computeAsyncResult = await this._computeAsync(selection);
        if (!computeAsyncResult) {
            return;
        }
        this._onResult.fire(new StandaloneColorPickerResult(computeAsyncResult.result, computeAsyncResult.foundInEditor));
    }
    async _computeAsync(range) {
        if (!this._editor.hasModel()) {
            return null;
        }
        const colorInfo = {
            range: range,
            color: { red: 0, green: 0, blue: 0, alpha: 1 }
        };
        const colorHoverResult = await this._standaloneColorPickerParticipant.createColorHover(colorInfo, new DefaultDocumentColorProvider(this._editorWorkerService), this._languageFeaturesService.colorProvider);
        if (!colorHoverResult) {
            return null;
        }
        return { result: colorHoverResult.colorHover, foundInEditor: colorHoverResult.foundInEditor };
    }
    _render(colorHover, foundInEditor) {
        const fragment = document.createDocumentFragment();
        this._renderedStatusBar.value = this._register(new EditorHoverStatusBar(this._keybindingService, this._hoverService));
        const context = {
            fragment,
            statusBar: this._renderedStatusBar.value,
            onContentsChanged: () => { },
            setMinimumDimensions: () => { },
            hide: () => this.hide(),
            focus: () => this.focus()
        };
        this._colorHover = colorHover;
        this._renderedHoverParts.value = this._standaloneColorPickerParticipant.renderHoverParts(context, [colorHover]);
        if (!this._renderedHoverParts.value) {
            this._renderedStatusBar.clear();
            this._renderedHoverParts.clear();
            return;
        }
        const colorPicker = this._renderedHoverParts.value.colorPicker;
        this._body.classList.add('standalone-colorpicker-body');
        this._body.style.maxHeight = Math.max(this._editor.getLayoutInfo().height / 4, 250) + 'px';
        this._body.style.maxWidth = Math.max(this._editor.getLayoutInfo().width * 0.66, 500) + 'px';
        this._body.tabIndex = 0;
        this._body.appendChild(fragment);
        colorPicker.layout();
        const colorPickerBody = colorPicker.body;
        const saturationBoxWidth = colorPickerBody.saturationBox.domNode.clientWidth;
        const widthOfOriginalColorBox = colorPickerBody.domNode.clientWidth - saturationBoxWidth - CLOSE_BUTTON_WIDTH - PADDING;
        const enterButton = colorPicker.body.enterButton;
        enterButton?.onClicked(() => {
            this.updateEditor();
            this.hide();
        });
        const colorPickerHeader = colorPicker.header;
        const pickedColorNode = colorPickerHeader.pickedColorNode;
        pickedColorNode.style.width = saturationBoxWidth + PADDING + 'px';
        const originalColorNode = colorPickerHeader.originalColorNode;
        originalColorNode.style.width = widthOfOriginalColorBox + 'px';
        const closeButton = colorPicker.header.closeButton;
        closeButton?.onClicked(() => {
            this.hide();
        });
        // When found in the editor, highlight the selection in the editor
        if (foundInEditor) {
            if (enterButton) {
                enterButton.button.textContent = 'Replace';
            }
            this._selectionSetInEditor = true;
            this._editor.setSelection(colorHover.range);
        }
        this._editor.layoutContentWidget(this);
    }
};
StandaloneColorPickerWidget = StandaloneColorPickerWidget_1 = __decorate([
    __param(3, IInstantiationService),
    __param(4, IKeybindingService),
    __param(5, ILanguageFeaturesService),
    __param(6, IEditorWorkerService),
    __param(7, IHoverService)
], StandaloneColorPickerWidget);
export { StandaloneColorPickerWidget };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhbmRhbG9uZUNvbG9yUGlja2VyV2lkZ2V0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2NvbG9yUGlja2VyL2Jyb3dzZXIvc3RhbmRhbG9uZUNvbG9yUGlja2VyL3N0YW5kYWxvbmVDb2xvclBpY2tlcldpZGdldC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxvQkFBb0IsQ0FBQztBQUM1QixPQUFPLEVBQUUsVUFBVSxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFLeEYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDdEcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0saURBQWlELENBQUM7QUFDdkYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDN0YsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRzlELE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBRzNGLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ25GLE9BQU8sRUFBOEIsZ0NBQWdDLEVBQXNDLE1BQU0sdUNBQXVDLENBQUM7QUFDekosT0FBTyxLQUFLLEdBQUcsTUFBTSxvQ0FBb0MsQ0FBQztBQUUxRCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFFL0UsTUFBTSwyQkFBMkI7SUFDaEMsK0hBQStIO0lBQy9ILFlBQ2lCLEtBQWlDLEVBQ2pDLGFBQXNCO1FBRHRCLFVBQUssR0FBTCxLQUFLLENBQTRCO1FBQ2pDLGtC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