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
import { mountVoidSelectionHelper } from './react/out/ainative-editor-widgets-tsx/index.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IAINativeSettingsService } from '../common/ainativeSettingsService.js';
import { getLengthOfTextPx } from './editCodeService.js';
const minDistanceFromRightPx = 400;
const minLeftPx = 60;
let SelectionHelperContribution = class SelectionHelperContribution extends Disposable {
    static { SelectionHelperContribution_1 = this; }
    static { this.ID = 'editor.contrib.voidSelectionHelper'; }
    constructor(_editor, _instantiationService, _ainativeSettingsService) {
        super();
        this._editor = _editor;
        this._instantiationService = _instantiationService;
        this._ainativeSettingsService = _ainativeSettingsService;
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
            if (this._reactComponentDisposable) {
                this._register(this._reactComponentDisposable);
            }
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
        const enabled = this._ainativeSettingsService.state.globalSettings.showInlineSuggestions
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
    __param(2, IAINativeSettingsService)
], SelectionHelperContribution);
export { SelectionHelperContribution };
// Register the contribution
registerEditorContribution(SelectionHelperContribution.ID, SelectionHelperContribution, 0 /* EditorContributionInstantiation.Eager */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWluYXRpdmVTZWxlY3Rpb25IZWxwZXJXaWRnZXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9haWRldmVsb3Blci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2FpbmF0aXZlL2Jyb3dzZXIvYWluYXRpdmVTZWxlY3Rpb25IZWxwZXJXaWRnZXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQWUsTUFBTSxzQ0FBc0MsQ0FBQztBQUUvRSxPQUFPLEVBQW1DLDBCQUEwQixFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFHN0gsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3BFLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUM7QUFDdkQsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDNUYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFaEYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFHekQsTUFBTSxzQkFBc0IsR0FBRyxHQUFHLENBQUM7QUFDbkMsTUFBTSxTQUFTLEdBQUcsRUFBRSxDQUFDO0FBUWQsSUFBTSwyQkFBMkIsR0FBakMsTUFBTSwyQkFBNEIsU0FBUSxVQUFVOzthQUNuQyxPQUFFLEdBQUcsb0NBQW9DLEFBQXZDLENBQXdDO0lBWWpFLFlBQ2tCLE9BQW9CLEVBQ2QscUJBQTZELEVBQzFELHdCQUFtRTtRQUU3RixLQUFLLEVBQUUsQ0FBQztRQUpTLFlBQU8sR0FBUCxPQUFPLENBQWE7UUFD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