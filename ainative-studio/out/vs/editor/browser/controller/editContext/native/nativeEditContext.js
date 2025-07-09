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
import './nativeEditContext.css';
import { isFirefox } from '../../../../../base/browser/browser.js';
import { addDisposableListener, getActiveWindow, getWindow, getWindowId } from '../../../../../base/browser/dom.js';
import { FastDomNode } from '../../../../../base/browser/fastDomNode.js';
import { StandardKeyboardEvent } from '../../../../../base/browser/keyboardEvent.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ClipboardEventUtils, getDataToCopy, InMemoryClipboardMetadataManager } from '../clipboardUtils.js';
import { AbstractEditContext } from '../editContext.js';
import { editContextAddDisposableListener, FocusTracker } from './nativeEditContextUtils.js';
import { ScreenReaderSupport } from './screenReaderSupport.js';
import { Range } from '../../../../common/core/range.js';
import { Selection } from '../../../../common/core/selection.js';
import { Position } from '../../../../common/core/position.js';
import { PositionOffsetTransformer } from '../../../../common/core/positionToOffset.js';
import { MutableDisposable } from '../../../../../base/common/lifecycle.js';
import { EditContext } from './editContextFactory.js';
import { IAccessibilityService } from '../../../../../platform/accessibility/common/accessibility.js';
import { NativeEditContextRegistry } from './nativeEditContextRegistry.js';
// Corresponds to classes in nativeEditContext.css
var CompositionClassName;
(function (CompositionClassName) {
    CompositionClassName["NONE"] = "edit-context-composition-none";
    CompositionClassName["SECONDARY"] = "edit-context-composition-secondary";
    CompositionClassName["PRIMARY"] = "edit-context-composition-primary";
})(CompositionClassName || (CompositionClassName = {}));
let NativeEditContext = class NativeEditContext extends AbstractEditContext {
    constructor(ownerID, context, overflowGuardContainer, viewController, _visibleRangeProvider, instantiationService, _accessibilityService) {
        super(context);
        this._visibleRangeProvider = _visibleRangeProvider;
        this._accessibilityService = _accessibilityService;
        this._editContextPrimarySelection = new Selection(1, 1, 1, 1);
        this._decorations = [];
        this._primarySelection = new Selection(1, 1, 1, 1);
        this._targetWindowId = -1;
        this._scrollTop = 0;
        this._scrollLeft = 0;
        this.domNode = new FastDomNode(document.createElement('div'));
        this.domNode.setClassName(`native-edit-context`);
        this._textArea = new FastDomNode(document.createElement('textarea'));
        this._textArea.setClassName('native-edit-context-textarea');
        this._textArea.setAttribute('tabindex', '-1');
        this.domNode.setAttribute('autocorrect', 'off');
        this.domNode.setAttribute('autocapitalize', 'off');
        this.domNode.setAttribute('autocomplete', 'off');
        this.domNode.setAttribute('spellcheck', 'false');
        this._updateDomAttributes();
        overflowGuardContainer.appendChild(this.domNode);
        overflowGuardContainer.appendChild(this._textArea);
        this._parent = overflowGuardContainer.domNode;
        this._selectionChangeListener = this._register(new MutableDisposable());
        this._focusTracker = this._register(new FocusTracker(this.domNode.domNode, (newFocusValue) => {
            if (newFocusValue) {
                this._selectionChangeListener.value = this._setSelectionChangeListener(viewController);
                this._screenReaderSupport.setIgnoreSelectionChangeTime('onFocus');
            }
            else {
                this._selectionChangeListener.value = undefined;
            }
            this._context.viewModel.setHasFocus(newFocusValue);
        }));
        const window = getWindow(this.domNode.domNode);
        this._editContext = EditContext.create(window);
        this.setEditContextOnDomNode();
        this._screenReaderSupport = instantiationService.createInstance(ScreenReaderSupport, this.domNode, context);
        this._register(addDisposableListener(this.domNode.domNode, 'copy', (e) => this._ensureClipboardGetsEditorSelection(e)));
        this._register(addDisposableListener(this.domNode.domNode, 'cut', (e) => {
            // Pretend here we touched the text area, as the `cut` event will most likely
            // result in a `selectionchange` event which we want to ignore
            this._screenReaderSupport.setIgnoreSelectionChangeTime('onCut');
            this._ensureClipboardGetsEditorSelection(e);
            viewController.cut();
        }));
        this._register(addDisposableListener(this.domNode.domNode, 'keyup', (e) => viewController.emitKeyUp(new StandardKeyboardEvent(e))));
        this._register(addDisposableListener(this.domNode.domNode, 'keydown', async (e) => {
            const standardKeyboardEvent = new StandardKeyboardEvent(e);
            // When the IME is visible, the keys, like arrow-left and arrow-right, should be used to navigate in the IME, and should not be propagated further
            if (standardKeyboardEvent.keyCode === 114 /* KeyCode.KEY_IN_COMPOSITION */) {
                standardKeyboardEvent.stopPropagation();
            }
            viewController.emitKeyDown(standardKeyboardEvent);
        }));
        this._register(addDisposableListener(this.domNode.domNode, 'beforeinput', async (e) => {
            if (e.inputType === 'insertParagraph' || e.inputType === 'insertLineBreak') {
                this._onType(viewController, { text: '\n', replacePrevCharCnt: 0, replaceNextCharCnt: 0, positionDelta: 0 });
            }
        }));
        // Edit context events
        this._register(editContextAddDisposableListener(this._editContext, 'textformatupdate', (e) => this._handleTextFormatUpdate(e)));
        this._register(editContextAddDisposableListener(this._editContext, 'characterboundsupdate', (e) => this._updateCharacterBounds(e)));
        this._register(editContextAddDisposableListener(this._editContext, 'textupdate', (e) => {
            this._emitTypeEvent(viewController, e);
        }));
        this._register(editContextAddDisposableListener(this._editContext, 'compositionstart', (e) => {
            // Utlimately fires onDidCompositionStart() on the editor to notify for example suggest model of composition state
            // Updates the composition state of the cursor controller which determines behavior of typing with interceptors
            viewController.compositionStart();
            // Emits ViewCompositionStartEvent which can be depended on by ViewEventHandlers
            this._context.viewModel.onCompositionStart();
        }));
        this._register(editContextAddDisposableListener(this._editContext, 'compositionend', (e) => {
            // Utlimately fires compositionEnd() on the editor to notify for example suggest model of composition state
            // Updates the composition state of the cursor controller which determines behavior of typing with interceptors
            viewController.compositionEnd();
            // Emits ViewCompositionEndEvent which can be depended on by ViewEventHandlers
            this._context.viewModel.onCompositionEnd();
        }));
        this._register(addDisposableListener(this._textArea.domNode, 'paste', (e) => {
            // Pretend here we touched the text area, as the `paste` event will most likely
            // result in a `selectionchange` event which we want to ignore
            this._screenReaderSupport.setIgnoreSelectionChangeTime('onPaste');
            e.preventDefault();
            if (!e.clipboardData) {
                return;
            }
            let [text, metadata] = ClipboardEventUtils.getTextData(e.clipboardData);
            if (!text) {
                return;
            }
            metadata = metadata || InMemoryClipboardMetadataManager.INSTANCE.get(text);
            let pasteOnNewLine = false;
            let multicursorText = null;
            let mode = null;
            if (metadata) {
                const options = this._context.configuration.options;
                const emptySelectionClipboard = options.get(38 /* EditorOption.emptySelectionClipboard */);
                pasteOnNewLine = emptySelectionClipboard && !!metadata.isFromEmptySelection;
                multicursorText = typeof metadata.multicursorText !== 'undefined' ? metadata.multicursorText : null;
                mode = metadata.mode;
            }
            viewController.paste(text, pasteOnNewLine, multicursorText, mode);
        }));
        this._register(NativeEditContextRegistry.register(ownerID, this));
    }
    // --- Public methods ---
    dispose() {
        // Force blue the dom node so can write in pane with no native edit context after disposal
        this.domNode.domNode.blur();
        this.domNode.domNode.remove();
        this._textArea.domNode.remove();
        super.dispose();
    }
    setAriaOptions(options) {
        this._screenReaderSupport.setAriaOptions(options);
    }
    /* Last rendered data needed for correct hit-testing and determining the mouse position.
     * Without this, the selection will blink as incorrect mouse position is calculated */
    getLastRenderData() {
        return this._primarySelection.getPosition();
    }
    prepareRender(ctx) {
        this._screenReaderSupport.prepareRender(ctx);
        this._updateEditContext();
        this._updateSelectionAndControlBounds(ctx);
    }
    render(ctx) {
        this._screenReaderSupport.render(ctx);
    }
    onCursorStateChanged(e) {
        this._primarySelection = e.modelSelections[0] ?? new Selection(1, 1, 1, 1);
        this._screenReaderSupport.onCursorStateChanged(e);
        this._updateEditContext();
        return true;
    }
    onConfigurationChanged(e) {
        this._screenReaderSupport.onConfigurationChanged(e);
        this._updateDomAttributes();
        return true;
    }
    onDecorationsChanged(e) {
        // true for inline decorations that can end up relayouting text
        return true;
    }
    onFlushed(e) {
        return true;
    }
    onLinesChanged(e) {
        return true;
    }
    onLinesDeleted(e) {
        return true;
    }
    onLinesInserted(e) {
        return true;
    }
    onScrollChanged(e) {
        this._scrollLeft = e.scrollLeft;
        this._scrollTop = e.scrollTop;
        return true;
    }
    onZonesChanged(e) {
        return true;
    }
    executePaste() {
        this._onWillPaste();
        try {
            // pause focus tracking because we don't want to react to focus/blur
            // events while pasting since we move the focus to the textarea
            this._focusTracker.pause();
            // Since we can not call execCommand('paste') on a dom node with edit context set
            // we added a hidden text area that receives the paste execution
            this._textArea.focus();
            const result = this._textArea.domNode.ownerDocument.execCommand('paste');
            this._textArea.domNode.textContent = '';
            this.domNode.focus();
            return result;
        }
        finally {
            this._focusTracker.resume(); // resume focus tracking
        }
    }
    _onWillPaste() {
        this._screenReaderSupport.setIgnoreSelectionChangeTime('onWillPaste');
    }
    writeScreenReaderContent() {
        this._screenReaderSupport.writeScreenReaderContent();
    }
    isFocused() {
        return this._focusTracker.isFocused;
    }
    focus() {
        this._focusTracker.focus();
        // If the editor is off DOM, focus cannot be really set, so let's double check that we have managed to set the focus
        this.refreshFocusState();
    }
    refreshFocusState() {
        this._focusTracker.refreshFocusState();
    }
    // TODO: added as a workaround fix for https://github.com/microsoft/vscode/issues/229825
    // When this issue will be fixed the following should be removed.
    setEditContextOnDomNode() {
        const targetWindow = getWindow(this.domNode.domNode);
        const targetWindowId = getWindowId(targetWindow);
        if (this._targetWindowId !== targetWindowId) {
            this.domNode.domNode.editContext = this._editContext;
            this._targetWindowId = targetWindowId;
        }
    }
    // --- Private methods ---
    _updateDomAttributes() {
        const options = this._context.configuration.options;
        this.domNode.domNode.setAttribute('tabindex', String(options.get(129 /* EditorOption.tabIndex */)));
    }
    _updateEditContext() {
        const editContextState = this._getNewEditContextState();
        if (!editContextState) {
            return;
        }
        this._editContext.updateText(0, Number.MAX_SAFE_INTEGER, editContextState.text ?? ' ');
        this._editContext.updateSelection(editContextState.selectionStartOffset, editContextState.selectionEndOffset);
        this._editContextPrimarySelection = editContextState.editContextPrimarySelection;
    }
    _emitTypeEvent(viewController, e) {
        if (!this._editContext) {
            return;
        }
        if (!this._editContextPrimarySelection.equalsSelection(this._primarySelection)) {
            return;
        }
        const model = this._context.viewModel.model;
        const startPositionOfEditContext = this._editContextStartPosition();
        const offsetOfStartOfText = model.getOffsetAt(startPositionOfEditContext);
        const offsetOfSelectionEnd = model.getOffsetAt(this._primarySelection.getEndPosition());
        const offsetOfSelectionStart = model.getOffsetAt(this._primarySelection.getStartPosition());
        const selectionEndOffset = offsetOfSelectionEnd - offsetOfStartOfText;
        const selectionStartOffset = offsetOfSelectionStart - offsetOfStartOfText;
        let replaceNextCharCnt = 0;
        let replacePrevCharCnt = 0;
        if (e.updateRangeEnd > selectionEndOffset) {
            replaceNextCharCnt = e.updateRangeEnd - selectionEndOffset;
        }
        if (e.updateRangeStart < selectionStartOffset) {
            replacePrevCharCnt = selectionStartOffset - e.updateRangeStart;
        }
        let text = '';
        if (selectionStartOffset < e.updateRangeStart) {
            text += this._editContext.text.substring(selectionStartOffset, e.updateRangeStart);
        }
        text += e.text;
        if (selectionEndOffset > e.updateRangeEnd) {
            text += this._editContext.text.substring(e.updateRangeEnd, selectionEndOffset);
        }
        let positionDelta = 0;
        if (e.selectionStart === e.selectionEnd && selectionStartOffset === selectionEndOffset) {
            positionDelta = e.selectionStart - (e.updateRangeStart + e.text.length);
        }
        const typeInput = {
            text,
            replacePrevCharCnt,
            replaceNextCharCnt,
            positionDelta
        };
        this._onType(viewController, typeInput);
        // It could be that the typed letter does not produce a change in the editor text,
        // for example if an extension registers a custom typing command, and the typing operation does something else like scrolling
        // Need to update the edit context to reflect this
        this._updateEditContext();
    }
    _onType(viewController, typeInput) {
        if (typeInput.replacePrevCharCnt || typeInput.replaceNextCharCnt || typeInput.positionDelta) {
            viewController.compositionType(typeInput.text, typeInput.replacePrevCharCnt, typeInput.replaceNextCharCnt, typeInput.positionDelta);
        }
        else {
            viewController.type(typeInput.text);
        }
    }
    _getNewEditContextState() {
        const editContextPrimarySelection = this._primarySelection;
        const model = this._context.viewModel.model;
        if (!model.isValidRange(editContextPrimarySelection)) {
            return;
        }
        const primarySelectionStartLine = editContextPrimarySelection.startLineNumber;
        const primarySelectionEndLine = editContextPrimarySelection.endLineNumber;
        const endColumnOfEndLineNumber = model.getLineMaxColumn(primarySelectionEndLine);
        const rangeOfText = new Range(primarySelectionStartLine, 1, primarySelectionEndLine, endColumnOfEndLineNumber);
        const text = model.getValueInRange(rangeOfText, 0 /* EndOfLinePreference.TextDefined */);
        const selectionStartOffset = editContextPrimarySelection.startColumn - 1;
        const selectionEndOffset = text.length + editContextPrimarySelection.endColumn - endColumnOfEndLineNumber;
        return {
            text,
            selectionStartOffset,
            selectionEndOffset,
            editContextPrimarySelection
        };
    }
    _editContextStartPosition() {
        return new Position(this._editContextPrimarySelection.startLineNumber, 1);
    }
    _handleTextFormatUpdate(e) {
        if (!this._editContext) {
            return;
        }
        const formats = e.getTextFormats();
        const editContextStartPosition = this._editContextStartPosition();
        const decorations = [];
        formats.forEach(f => {
            const textModel = this._context.viewModel.model;
            const offsetOfEditContextText = textModel.getOffsetAt(editContextStartPosition);
            const startPositionOfDecoration = textModel.getPositionAt(offsetOfEditContextText + f.rangeStart);
            const endPositionOfDecoration = textModel.getPositionAt(offsetOfEditContextText + f.rangeEnd);
            const decorationRange = Range.fromPositions(startPositionOfDecoration, endPositionOfDecoration);
            const thickness = f.underlineThickness.toLowerCase();
            let decorationClassName = CompositionClassName.NONE;
            switch (thickness) {
                case 'thin':
                    decorationClassName = CompositionClassName.SECONDARY;
                    break;
                case 'thick':
                    decorationClassName = CompositionClassName.PRIMARY;
                    break;
            }
            decorations.push({
                range: decorationRange,
                options: {
                    description: 'textFormatDecoration',
                    inlineClassName: decorationClassName,
                }
            });
        });
        this._decorations = this._context.viewModel.model.deltaDecorations(this._decorations, decorations);
    }
    _updateSelectionAndControlBounds(ctx) {
        if (!this._parent) {
            return;
        }
        const options = this._context.configuration.options;
        const lineHeight = options.get(68 /* EditorOption.lineHeight */);
        const contentLeft = options.get(151 /* EditorOption.layoutInfo */).contentLeft;
        const parentBounds = this._parent.getBoundingClientRect();
        const modelStartPosition = this._primarySelection.getStartPosition();
        const viewStartPosition = this._context.viewModel.coordinatesConverter.convertModelPositionToViewPosition(modelStartPosition);
        const verticalOffsetStart = this._context.viewLayout.getVerticalOffsetForLineNumber(viewStartPosition.lineNumber);
        const top = parentBounds.top + verticalOffsetStart - this._scrollTop;
        const height = (this._primarySelection.endLineNumber - this._primarySelection.startLineNumber + 1) * lineHeight;
        let left = parentBounds.left + contentLeft - this._scrollLeft;
        let width;
        if (this._primarySelection.isEmpty()) {
            const linesVisibleRanges = ctx.visibleRangeForPosition(viewStartPosition);
            if (linesVisibleRanges) {
                left += linesVisibleRanges.left;
            }
            width = 0;
        }
        else {
            width = parentBounds.width - contentLeft;
        }
        const selectionBounds = new DOMRect(left, top, width, height);
        this._editContext.updateSelectionBounds(selectionBounds);
        this._editContext.updateControlBounds(selectionBounds);
    }
    _updateCharacterBounds(e) {
        if (!this._parent) {
            return;
        }
        const options = this._context.configuration.options;
        const typicalHalfWidthCharacterWidth = options.get(52 /* EditorOption.fontInfo */).typicalHalfwidthCharacterWidth;
        const lineHeight = options.get(68 /* EditorOption.lineHeight */);
        const contentLeft = options.get(151 /* EditorOption.layoutInfo */).contentLeft;
        const parentBounds = this._parent.getBoundingClientRect();
        const characterBounds = [];
        const offsetTransformer = new PositionOffsetTransformer(this._editContext.text);
        for (let offset = e.rangeStart; offset < e.rangeEnd; offset++) {
            const editContextStartPosition = offsetTransformer.getPosition(offset);
            const textStartLineOffsetWithinEditor = this._editContextPrimarySelection.startLineNumber - 1;
            const characterStartPosition = new Position(textStartLineOffsetWithinEditor + editContextStartPosition.lineNumber, editContextStartPosition.column);
            const characterEndPosition = characterStartPosition.delta(0, 1);
            const characterModelRange = Range.fromPositions(characterStartPosition, characterEndPosition);
            const characterViewRange = this._context.viewModel.coordinatesConverter.convertModelRangeToViewRange(characterModelRange);
            const characterLinesVisibleRanges = this._visibleRangeProvider.linesVisibleRangesForRange(characterViewRange, true) ?? [];
            const characterVerticalOffset = this._context.viewLayout.getVerticalOffsetForLineNumber(characterViewRange.startLineNumber);
            const top = parentBounds.top + characterVerticalOffset - this._scrollTop;
            let left = 0;
            let width = typicalHalfWidthCharacterWidth;
            if (characterLinesVisibleRanges.length > 0) {
                for (const visibleRange of characterLinesVisibleRanges[0].ranges) {
                    left = visibleRange.left;
                    width = visibleRange.width;
                    break;
                }
            }
            characterBounds.push(new DOMRect(parentBounds.left + contentLeft + left - this._scrollLeft, top, width, lineHeight));
        }
        this._editContext.updateCharacterBounds(e.rangeStart, characterBounds);
    }
    _ensureClipboardGetsEditorSelection(e) {
        const options = this._context.configuration.options;
        const emptySelectionClipboard = options.get(38 /* EditorOption.emptySelectionClipboard */);
        const copyWithSyntaxHighlighting = options.get(25 /* EditorOption.copyWithSyntaxHighlighting */);
        const selections = this._context.viewModel.getCursorStates().map(cursorState => cursorState.modelState.selection);
        const dataToCopy = getDataToCopy(this._context.viewModel, selections, emptySelectionClipboard, copyWithSyntaxHighlighting);
        const storedMetadata = {
            version: 1,
            isFromEmptySelection: dataToCopy.isFromEmptySelection,
            multicursorText: dataToCopy.multicursorText,
            mode: dataToCopy.mode
        };
        InMemoryClipboardMetadataManager.INSTANCE.set(
        // When writing "LINE\r\n" to the clipboard and then pasting,
        // Firefox pastes "LINE\n", so let's work around this quirk
        (isFirefox ? dataToCopy.text.replace(/\r\n/g, '\n') : dataToCopy.text), storedMetadata);
        e.preventDefault();
        if (e.clipboardData) {
            ClipboardEventUtils.setTextData(e.clipboardData, dataToCopy.text, dataToCopy.html, storedMetadata);
        }
    }
    _setSelectionChangeListener(viewController) {
        // See https://github.com/microsoft/vscode/issues/27216 and https://github.com/microsoft/vscode/issues/98256
        // When using a Braille display or NVDA for example, it is possible for users to reposition the
        // system caret. This is reflected in Chrome as a `selectionchange` event and needs to be reflected within the editor.
        // `selectionchange` events often come multiple times for a single logical change
        // so throttle multiple `selectionchange` events that burst in a short period of time.
        let previousSelectionChangeEventTime = 0;
        return addDisposableListener(this.domNode.domNode.ownerDocument, 'selectionchange', () => {
            const isScreenReaderOptimized = this._accessibilityService.isScreenReaderOptimized();
            if (!this.isFocused() || !isScreenReaderOptimized) {
                return;
            }
            const screenReaderContentState = this._screenReaderSupport.screenReaderContentState;
            if (!screenReaderContentState) {
                return;
            }
            const now = Date.now();
            const delta1 = now - previousSelectionChangeEventTime;
            previousSelectionChangeEventTime = now;
            if (delta1 < 5) {
                // received another `selectionchange` event within 5ms of the previous `selectionchange` event
                // => ignore it
                return;
            }
            const delta2 = now - this._screenReaderSupport.getIgnoreSelectionChangeTime();
            this._screenReaderSupport.resetSelectionChangeTime();
            if (delta2 < 100) {
                // received a `selectionchange` event within 100ms since we touched the textarea
                // => ignore it, since we caused it
                return;
            }
            const activeDocument = getActiveWindow().document;
            const activeDocumentSelection = activeDocument.getSelection();
            if (!activeDocumentSelection) {
                return;
            }
            const rangeCount = activeDocumentSelection.rangeCount;
            if (rangeCount === 0) {
                return;
            }
            const range = activeDocumentSelection.getRangeAt(0);
            const viewModel = this._context.viewModel;
            const model = viewModel.model;
            const coordinatesConverter = viewModel.coordinatesConverter;
            const modelScreenReaderContentStartPositionWithinEditor = coordinatesConverter.convertViewPositionToModelPosition(screenReaderContentState.startPositionWithinEditor);
            const offsetOfStartOfScreenReaderContent = model.getOffsetAt(modelScreenReaderContentStartPositionWithinEditor);
            let offsetOfSelectionStart = range.startOffset + offsetOfStartOfScreenReaderContent;
            let offsetOfSelectionEnd = range.endOffset + offsetOfStartOfScreenReaderContent;
            const modelUsesCRLF = model.getEndOfLineSequence() === 1 /* EndOfLineSequence.CRLF */;
            if (modelUsesCRLF) {
                const screenReaderContentText = screenReaderContentState.value;
                const offsetTransformer = new PositionOffsetTransformer(screenReaderContentText);
                const positionOfStartWithinText = offsetTransformer.getPosition(range.startOffset);
                const positionOfEndWithinText = offsetTransformer.getPosition(range.endOffset);
                offsetOfSelectionStart += positionOfStartWithinText.lineNumber - 1;
                offsetOfSelectionEnd += positionOfEndWithinText.lineNumber - 1;
            }
            const positionOfSelectionStart = model.getPositionAt(offsetOfSelectionStart);
            const positionOfSelectionEnd = model.getPositionAt(offsetOfSelectionEnd);
            const newSelection = Selection.fromPositions(positionOfSelectionStart, positionOfSelectionEnd);
            viewController.setSelection(newSelection);
        });
    }
};
NativeEditContext = __decorate([
    __param(5, IInstantiationService),
    __param(6, IAccessibilityService)
], NativeEditContext);
export { NativeEditContext };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmF0aXZlRWRpdENvbnRleHQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvY29udHJvbGxlci9lZGl0Q29udGV4dC9uYXRpdmUvbmF0aXZlRWRpdENvbnRleHQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyx5QkFBeUIsQ0FBQztBQUNqQyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDbkUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLGVBQWUsRUFBRSxTQUFTLEVBQUUsV0FBVyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDcEgsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBRXJGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBT3RHLE9BQU8sRUFBRSxtQkFBbUIsRUFBMkIsYUFBYSxFQUFFLGdDQUFnQyxFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFDckksT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFDeEQsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLFlBQVksRUFBYSxNQUFNLDZCQUE2QixDQUFDO0FBQ3hHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQy9ELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN6RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDakUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRS9ELE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFN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