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
import { getActiveWindow } from '../../../../../base/browser/dom.js';
import { localize } from '../../../../../nls.js';
import { IAccessibilityService } from '../../../../../platform/accessibility/common/accessibility.js';
import { IKeybindingService } from '../../../../../platform/keybinding/common/keybinding.js';
import { Selection } from '../../../../common/core/selection.js';
import { applyFontInfo } from '../../../config/domFontInfo.js';
import { ariaLabelForScreenReaderContent, PagedScreenReaderStrategy } from '../screenReaderUtils.js';
let ScreenReaderSupport = class ScreenReaderSupport {
    constructor(_domNode, _context, _keybindingService, _accessibilityService) {
        this._domNode = _domNode;
        this._context = _context;
        this._keybindingService = _keybindingService;
        this._accessibilityService = _accessibilityService;
        // Configuration values
        this._contentLeft = 1;
        this._contentWidth = 1;
        this._contentHeight = 1;
        this._divWidth = 1;
        this._lineHeight = 1;
        this._accessibilityPageSize = 1;
        this._ignoreSelectionChangeTime = 0;
        this._primarySelection = new Selection(1, 1, 1, 1);
        this._primaryCursorVisibleRange = null;
        this._updateConfigurationSettings();
        this._updateDomAttributes();
    }
    setIgnoreSelectionChangeTime(reason) {
        this._ignoreSelectionChangeTime = Date.now();
    }
    getIgnoreSelectionChangeTime() {
        return this._ignoreSelectionChangeTime;
    }
    resetSelectionChangeTime() {
        this._ignoreSelectionChangeTime = 0;
    }
    onConfigurationChanged(e) {
        this._updateConfigurationSettings();
        this._updateDomAttributes();
        if (e.hasChanged(2 /* EditorOption.accessibilitySupport */)) {
            this.writeScreenReaderContent();
        }
    }
    _updateConfigurationSettings() {
        const options = this._context.configuration.options;
        const layoutInfo = options.get(151 /* EditorOption.layoutInfo */);
        const wrappingColumn = layoutInfo.wrappingColumn;
        this._contentLeft = layoutInfo.contentLeft;
        this._contentWidth = layoutInfo.contentWidth;
        this._contentHeight = layoutInfo.height;
        this._fontInfo = options.get(52 /* EditorOption.fontInfo */);
        this._lineHeight = options.get(68 /* EditorOption.lineHeight */);
        this._accessibilityPageSize = options.get(3 /* EditorOption.accessibilityPageSize */);
        this._divWidth = Math.round(wrappingColumn * this._fontInfo.typicalHalfwidthCharacterWidth);
    }
    _updateDomAttributes() {
        const options = this._context.configuration.options;
        this._domNode.domNode.setAttribute('role', 'textbox');
        this._domNode.domNode.setAttribute('aria-required', options.get(5 /* EditorOption.ariaRequired */) ? 'true' : 'false');
        this._domNode.domNode.setAttribute('aria-multiline', 'true');
        this._domNode.domNode.setAttribute('aria-autocomplete', options.get(96 /* EditorOption.readOnly */) ? 'none' : 'both');
        this._domNode.domNode.setAttribute('aria-roledescription', localize('editor', "editor"));
        this._domNode.domNode.setAttribute('aria-label', ariaLabelForScreenReaderContent(options, this._keybindingService));
        const tabSize = this._context.viewModel.model.getOptions().tabSize;
        const spaceWidth = options.get(52 /* EditorOption.fontInfo */).spaceWidth;
        this._domNode.domNode.style.tabSize = `${tabSize * spaceWidth}px`;
        const wordWrapOverride2 = options.get(142 /* EditorOption.wordWrapOverride2 */);
        const wordWrapValue = wordWrapOverride2 !== 'inherit' ? wordWrapOverride2 : options.get(137 /* EditorOption.wordWrap */);
        this._domNode.domNode.style.textWrap = wordWrapValue === 'off' ? 'nowrap' : 'wrap';
    }
    onCursorStateChanged(e) {
        this._primarySelection = e.selections[0] ?? new Selection(1, 1, 1, 1);
    }
    prepareRender(ctx) {
        this.writeScreenReaderContent();
        this._primaryCursorVisibleRange = ctx.visibleRangeForPosition(this._primarySelection.getPosition());
    }
    render(ctx) {
        if (!this._screenReaderContentState) {
            return;
        }
        if (!this._primaryCursorVisibleRange) {
            // The primary cursor is outside the viewport => place textarea to the top left
            this._renderAtTopLeft();
            return;
        }
        const editorScrollLeft = this._context.viewLayout.getCurrentScrollLeft();
        const left = this._contentLeft + this._primaryCursorVisibleRange.left - editorScrollLeft;
        if (left < this._contentLeft || left > this._contentLeft + this._contentWidth) {
            // cursor is outside the viewport
            this._renderAtTopLeft();
            return;
        }
        const editorScrollTop = this._context.viewLayout.getCurrentScrollTop();
        const positionLineNumber = this._primarySelection.positionLineNumber;
        const top = this._context.viewLayout.getVerticalOffsetForLineNumber(positionLineNumber) - editorScrollTop;
        if (top < 0 || top > this._contentHeight) {
            // cursor is outside the viewport
            this._renderAtTopLeft();
            return;
        }
        const offsetForStartPositionWithinEditor = this._context.viewLayout.getVerticalOffsetForLineNumber(this._screenReaderContentState.startPositionWithinEditor.lineNumber);
        const offsetForPositionLineNumber = this._context.viewLayout.getVerticalOffsetForLineNumber(positionLineNumber);
        const scrollTop = offsetForPositionLineNumber - offsetForStartPositionWithinEditor;
        this._doRender(scrollTop, top, this._contentLeft, this._divWidth, this._lineHeight);
    }
    _renderAtTopLeft() {
        this._doRender(0, 0, 0, this._contentWidth, 1);
    }
    _doRender(scrollTop, top, left, width, height) {
        // For correct alignment of the screen reader content, we need to apply the correct font
        applyFontInfo(this._domNode, this._fontInfo);
        this._domNode.setTop(top);
        this._domNode.setLeft(left);
        this._domNode.setWidth(width);
        this._domNode.setHeight(height);
        this._domNode.domNode.scrollTop = scrollTop;
    }
    setAriaOptions(options) {
        if (options.activeDescendant) {
            this._domNode.setAttribute('aria-haspopup', 'true');
            this._domNode.setAttribute('aria-autocomplete', 'list');
            this._domNode.setAttribute('aria-activedescendant', options.activeDescendant);
        }
        else {
            this._domNode.setAttribute('aria-haspopup', 'false');
            this._domNode.setAttribute('aria-autocomplete', 'both');
            this._domNode.removeAttribute('aria-activedescendant');
        }
        if (options.role) {
            this._domNode.setAttribute('role', options.role);
        }
    }
    writeScreenReaderContent() {
        const focusedElement = getActiveWindow().document.activeElement;
        if (!focusedElement || focusedElement !== this._domNode.domNode) {
            return;
        }
        const isScreenReaderOptimized = this._accessibilityService.isScreenReaderOptimized();
        if (isScreenReaderOptimized) {
            this._screenReaderContentState = this._getScreenReaderContentState();
            if (this._domNode.domNode.textContent !== this._screenReaderContentState.value) {
                this.setIgnoreSelectionChangeTime('setValue');
                this._domNode.domNode.textContent = this._screenReaderContentState.value;
            }
            this._setSelectionOfScreenReaderContent(this._screenReaderContentState.selectionStart, this._screenReaderContentState.selectionEnd);
        }
        else {
            this._screenReaderContentState = undefined;
            this.setIgnoreSelectionChangeTime('setValue');
            this._domNode.domNode.textContent = '';
        }
    }
    get screenReaderContentState() {
        return this._screenReaderContentState;
    }
    _getScreenReaderContentState() {
        const simpleModel = {
            getLineCount: () => {
                return this._context.viewModel.getLineCount();
            },
            getLineMaxColumn: (lineNumber) => {
                return this._context.viewModel.getLineMaxColumn(lineNumber);
            },
            getValueInRange: (range, eol) => {
                return this._context.viewModel.getValueInRange(range, eol);
            },
            getValueLengthInRange: (range, eol) => {
                return this._context.viewModel.getValueLengthInRange(range, eol);
            },
            modifyPosition: (position, offset) => {
                return this._context.viewModel.modifyPosition(position, offset);
            }
        };
        return PagedScreenReaderStrategy.fromEditorSelection(simpleModel, this._primarySelection, this._accessibilityPageSize, this._accessibilityService.getAccessibilitySupport() === 0 /* AccessibilitySupport.Unknown */);
    }
    _setSelectionOfScreenReaderContent(selectionOffsetStart, selectionOffsetEnd) {
        const activeDocument = getActiveWindow().document;
        const activeDocumentSelection = activeDocument.getSelection();
        if (!activeDocumentSelection) {
            return;
        }
        const textContent = this._domNode.domNode.firstChild;
        if (!textContent) {
            return;
        }
        const range = new globalThis.Range();
        range.setStart(textContent, selectionOffsetStart);
        range.setEnd(textContent, selectionOffsetEnd);
        this.setIgnoreSelectionChangeTime('setRange');
        activeDocumentSelection.removeAllRanges();
        activeDocumentSelection.addRange(range);
    }
};
ScreenReaderSupport = __decorate([
    __param(2, IKeybindingService),
    __param(3, IAccessibilityService)
], ScreenReaderSupport);
export { ScreenReaderSupport };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NyZWVuUmVhZGVyU3VwcG9ydC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci9jb250cm9sbGVyL2VkaXRDb250ZXh0L25hdGl2ZS9zY3JlZW5SZWFkZXJTdXBwb3J0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUVyRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDakQsT0FBTyxFQUF3QixxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQzVILE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBSzdGLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUlqRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFHL0QsT0FBTyxFQUFFLCtCQUErQixFQUFnQix5QkFBeUIsRUFBNEIsTUFBTSx5QkFBeUIsQ0FBQztBQUV0SSxJQUFNLG1CQUFtQixHQUF6QixNQUFNLG1CQUFtQjtJQWdCL0IsWUFDa0IsUUFBa0MsRUFDbEMsUUFBcUIsRUFDbEIsa0JBQXVELEVBQ3BELHFCQUE2RDtRQUhuRSxhQUFRLEdBQVIsUUFBUSxDQUEwQjtRQUNsQyxhQUFRLEdBQVIsUUFBUSxDQUFhO1FBQ0QsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFvQjtRQUNuQywwQkFBcUIsR0FBckIscUJBQXFCLENBQXVCO1FBbEJyRix1QkFBdUI7UUFDZixpQkFBWSxHQUFXLENBQUMsQ0FBQztRQUN6QixrQkFBYSxHQUFXLENBQUMsQ0FBQztRQUMxQixtQkFBYyxHQUFXLENBQUMsQ0FBQztRQUMzQixjQUFTLEdBQVcsQ0FB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