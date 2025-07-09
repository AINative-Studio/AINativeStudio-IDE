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
var SelectionHelperContribution_1;
import { Disposable } from '../../../../base/common/lifecycle.js';
import { registerEditorContribution } from '../../../../editor/browser/editorExtensions.js';
import { Selection } from '../../../../editor/common/core/selection.js';
import { RunOnceScheduler } from '../../../../base/common/async.js';
import * as dom from '../../../../base/browser/dom.js';
import { mountVoidSelectionHelper } from './react/out/void-editor-widgets-tsx/index.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IVoidSettingsService } from '../common/voidSettingsService.js';
import { getLengthOfTextPx } from './editCodeService.js';
const minDistanceFromRightPx = 400;
const minLeftPx = 60;
let SelectionHelperContribution = class SelectionHelperContribution extends Disposable {
    static { SelectionHelperContribution_1 = this; }
    static { this.ID = 'editor.contrib.voidSelectionHelper'; }
    constructor(_editor, _instantiationService, _voidSettingsService) {
        super();
        this._editor = _editor;
        this._instantiationService = _instantiationService;
        this._voidSettingsService = _voidSettingsService;
        this._rerender = () => { };
        this._rerenderKey = 0;
        this._reactComponentDisposable = null;
        // internal
        this._isVisible = false;
        this._lastSelection = null;
        // Create the container element for React component
        const { root, content } = dom.h('div@root', [
            dom.h('div@content', [])
        ]);
        // Set styles for container
        root.style.position = 'absolute';
        root.style.display = 'none'; // Start hidden
        root.style.pointerEvents = 'none';
        root.style.marginLeft = '16px';
        // Initialize React component
        this._instantiationService.invokeFunction(accessor => {
            if (this._reactComponentDisposable) {
                this._reactComponentDisposable.dispose();
            }
            const res = mountVoidSelectionHelper(content, accessor);
            if (!res)
                return;
            this._reactComponentDisposable = res;
            this._rerender = res.rerender;
            this._register(this._reactComponentDisposable);
        });
        this._rootHTML = root;
        // Register as overlay widget
        this._editor.addOverlayWidget(this);
        // Use scheduler to debounce showing widget
        this._showScheduler = new RunOnceScheduler(() => {
            if (this._lastSelection) {
                this._showHelperForSelection(this._lastSelection);
            }
        }, 50);
        // Register event listeners
        this._register(this._editor.onDidChangeCursorSelection(e => this._onSelectionChange(e)));
        // Add a flag to track if mouse is over the widget
        let isMouseOverWidget = false;
        this._rootHTML.addEventListener('mouseenter', () => {
            isMouseOverWidget = true;
        });
        this._rootHTML.addEventListener('mouseleave', () => {
            isMouseOverWidget = false;
        });
        // Only hide helper when text editor loses focus and mouse is not over the widget
        this._register(this._editor.onDidBlurEditorText(() => {
            if (!isMouseOverWidget) {
                this._hideHelper();
            }
        }));
        this._register(this._editor.onDidScrollChange(() => this._updatePositionIfVisible()));
        this._register(this._editor.onDidLayoutChange(() => this._updatePositionIfVisible()));
    }
    // IOverlayWidget implementation
    getId() {
        return SelectionHelperContribution_1.ID;
    }
    getDomNode() {
        return this._rootHTML;
    }
    getPosition() {
        return null; // We position manually
    }
    _onSelectionChange(e) {
        if (!this._editor.hasModel()) {
            return;
        }
        if (this._editor.getModel().uri.scheme !== 'file') {
            return;
        }
        const selection = this._editor.getSelection();
        if (!selection || selection.isEmpty()) {
            this._hideHelper();
            return;
        }
        // Get selection text to check if it's worth showing the helper
        const text = this._editor.getModel().getValueInRange(selection);
        if (text.length < 3) {
            this._hideHelper();
            return;
        }
        // Store selection
        this._lastSelection = new Selection(selection.startLineNumber, selection.startColumn, selection.endLineNumber, selection.endColumn);
        this._showScheduler.schedule();
    }
    // Update the _showHelperForSelection method to work with the React component
    _showHelperForSelection(selection) {
        if (!this._editor.hasModel()) {
            return;
        }
        const model = this._editor.getModel();
        // get the longest length of the nearest neighbors of the target
        const { tabSize: numSpacesInTab } = model.getFormattingOptions();
        const spaceWidth = this._editor.getOption(52 /* EditorOption.fontInfo */).spaceWidth;
        const tabWidth = numSpacesInTab * spaceWidth;
        const numLinesModel = model.getLineCount();
        // Calculate right edge of visible editor area
        const editorWidthPx = this._editor.getLayoutInfo().width;
        const maxLeftPx = editorWidthPx - minDistanceFromRightPx;
        // returns the position where the box should go on the targetLine
        const getBoxPosition = (targetLine) => {
            const targetPosition = this._editor.getScrolledVisiblePosition({ lineNumber: targetLine, column: 1 }) ?? { left: 0, top: 0 };
            const { top: targetTop, left: targetLeft } = targetPosition;
            let targetWidth = 0;
            for (let i = targetLine; i <= targetLine + 1; i++) {
                // if not in range, continue
                if (!(i >= 1) || !(i <= numLinesModel))
                    continue;
                const content = model.getLineContent(i);
                const currWidth = getLengthOfTextPx({
                    tabWidth,
                    spaceWidth,
                    content
                });
                targetWidth = Math.max(targetWidth, currWidth);
            }
            return {
                top: targetTop,
                left: targetLeft + targetWidth,
            };
        };
        // Calculate the middle line of the selection
        const startLine = selection.startLineNumber;
        const endLine = selection.endLineNumber;
        // const middleLine = Math.floor(startLine + (endLine - startLine) / 2);
        const targetLine = endLine - startLine + 1 <= 2 ? startLine : startLine + 2;
        let boxPos = getBoxPosition(targetLine);
        // if the position of the box is too far to the right, keep searching for a good position
        const lineDeltasToTry = [-1, -2, -3, 1, 2, 3];
        if (boxPos.left > maxLeftPx) {
            for (const lineDelta of lineDeltasToTry) {
                boxPos = getBoxPosition(targetLine + lineDelta);
                if (boxPos.left <= maxLeftPx) {
                    break;
                }
            }
        }
        if (boxPos.left > maxLeftPx) { // if still not found, make it 2 lines before
            boxPos = getBoxPosition(targetLine - 2);
        }
        // Position the helper element at the end of the middle line but ensure it's visible
        const xPosition = Math.max(Math.min(boxPos.left, maxLeftPx), minLeftPx);
        const yPosition = boxPos.top;
        // Update the React component position
        this._rootHTML.style.left = `${xPosition}px`;
        this._rootHTML.style.top = `${yPosition}px`;
        this._rootHTML.style.display = 'flex'; // Show the container
        this._isVisible = true;
        // rerender
        const enabled = this._voidSettingsService.state.globalSettings.showInlineSuggestions
            && this._editor.hasTextFocus(); // needed since VS Code counts unfocused selections as selections, which causes this to rerender when it shouldnt (bad ux)
        if (enabled) {
            this._rerender({ rerenderKey: this._rerenderKey });
            this._rerenderKey = (this._rerenderKey + 1) % 2;
            // this._reactComponentRerender();
        }
    }
    _hideHelper() {
        this._rootHTML.style.display = 'none';
        this._isVisible = false;
        this._lastSelection = null;
    }
    _updatePositionIfVisible() {
        if (!this._isVisible || !this._lastSelection || !this._editor.hasModel()) {
            return;
        }
        this._showHelperForSelection(this._lastSelection);
    }
    dispose() {
        this._hideHelper();
        if (this._reactComponentDisposable) {
            this._reactComponentDisposable.dispose();
        }
        this._editor.removeOverlayWidget(this);
        this._showScheduler.dispose();
        super.dispose();
    }
};
SelectionHelperContribution = SelectionHelperContribution_1 = __decorate([
    __param(1, IInstantiationService),
    __param(2, IVoidSettingsService)
], SelectionHelperContribution);
export { SelectionHelperContribution };
// Register the contribution
registerEditorContribution(SelectionHelperContribution.ID, SelectionHelperContribution, 0 /* EditorContributionInstantiation.Eager */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidm9pZFNlbGVjdGlvbkhlbHBlcldpZGdldC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi92b2lkL2Jyb3dzZXIvdm9pZFNlbGVjdGlvbkhlbHBlcldpZGdldC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBZSxNQUFNLHNDQUFzQyxDQUFDO0FBRS9FLE9BQU8sRUFBbUMsMEJBQTBCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUc3SCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDeEUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDcEUsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQztBQUN2RCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUN4RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUV4RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQztBQUd6RCxNQUFNLHNCQUFzQixHQUFHLEdBQUcsQ0FBQztBQUNuQyxNQUFNLFNBQVMsR0FBRyxFQUFFLENBQUM7QUFRZCxJQUFNLDJCQUEyQixHQUFqQyxNQUFNLDJCQUE0QixTQUFRLFVBQVU7O2FBQ25DLE9BQUUsR0FBRyxvQ0FBb0MsQUFBdkMsQ0FBd0M7SUFZakUsWUFDa0IsT0FBb0IsRUFDZCxxQkFBNkQsRUFDOUQsb0JBQTJEO1FBRWpGLEtBQUssRUFBRSxDQUFDO1FBSlMsWUFBTyxHQUFQLE9BQU8sQ0FBYTtRQUNHLDBCQUFxQixHQUFy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