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
import * as browser from '../../../../../base/browser/browser.js';
import * as dom from '../../../../../base/browser/dom.js';
import { DomEmitter } from '../../../../../base/browser/event.js';
import { StandardKeyboardEvent } from '../../../../../base/browser/keyboardEvent.js';
import { inputLatency } from '../../../../../base/browser/performance.js';
import { RunOnceScheduler } from '../../../../../base/common/async.js';
import { Emitter, Event } from '../../../../../base/common/event.js';
import { Disposable, MutableDisposable } from '../../../../../base/common/lifecycle.js';
import * as strings from '../../../../../base/common/strings.js';
import { Selection } from '../../../../common/core/selection.js';
import { IAccessibilityService } from '../../../../../platform/accessibility/common/accessibility.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { ClipboardEventUtils, InMemoryClipboardMetadataManager } from '../clipboardUtils.js';
import { _debugComposition, TextAreaState } from './textAreaEditContextState.js';
export var TextAreaSyntethicEvents;
(function (TextAreaSyntethicEvents) {
    TextAreaSyntethicEvents.Tap = '-monaco-textarea-synthetic-tap';
})(TextAreaSyntethicEvents || (TextAreaSyntethicEvents = {}));
class CompositionContext {
    constructor() {
        this._lastTypeTextLength = 0;
    }
    handleCompositionUpdate(text) {
        text = text || '';
        const typeInput = {
            text: text,
            replacePrevCharCnt: this._lastTypeTextLength,
            replaceNextCharCnt: 0,
            positionDelta: 0
        };
        this._lastTypeTextLength = text.length;
        return typeInput;
    }
}
/**
 * Writes screen reader content to the textarea and is able to analyze its input events to generate:
 *  - onCut
 *  - onPaste
 *  - onType
 *
 * Composition events are generated for presentation purposes (composition input is reflected in onType).
 */
let TextAreaInput = class TextAreaInput extends Disposable {
    get textAreaState() {
        return this._textAreaState;
    }
    constructor(_host, _textArea, _OS, _browser, _accessibilityService, _logService) {
        super();
        this._host = _host;
        this._textArea = _textArea;
        this._OS = _OS;
        this._browser = _browser;
        this._accessibilityService = _accessibilityService;
        this._logService = _logService;
        this._onFocus = this._register(new Emitter());
        this.onFocus = this._onFocus.event;
        this._onBlur = this._register(new Emitter());
        this.onBlur = this._onBlur.event;
        this._onKeyDown = this._register(new Emitter());
        this.onKeyDown = this._onKeyDown.event;
        this._onKeyUp = this._register(new Emitter());
        this.onKeyUp = this._onKeyUp.event;
        this._onCut = this._register(new Emitter());
        this.onCut = this._onCut.event;
        this._onPaste = this._register(new Emitter());
        this.onPaste = this._onPaste.event;
        this._onType = this._register(new Emitter());
        this.onType = this._onType.event;
        this._onCompositionStart = this._register(new Emitter());
        this.onCompositionStart = this._onCompositionStart.event;
        this._onCompositionUpdate = this._register(new Emitter());
        this.onCompositionUpdate = this._onCompositionUpdate.event;
        this._onCompositionEnd = this._register(new Emitter());
        this.onCompositionEnd = this._onCompositionEnd.event;
        this._onSelectionChangeRequest = this._register(new Emitter());
        this.onSelectionChangeRequest = this._onSelectionChangeRequest.event;
        this._asyncFocusGainWriteScreenReaderContent = this._register(new MutableDisposable());
        this._asyncTriggerCut = this._register(new RunOnceScheduler(() => this._onCut.fire(), 0));
        this._textAreaState = TextAreaState.EMPTY;
        this._selectionChangeListener = null;
        if (this._accessibilityService.isScreenReaderOptimized()) {
            this.writeNativeTextAreaContent('ctor');
        }
        this._register(Event.runAndSubscribe(this._accessibilityService.onDidChangeScreenReaderOptimized, () => {
            if (this._accessibilityService.isScreenReaderOptimized() && !this._asyncFocusGainWriteScreenReaderContent.value) {
                this._asyncFocusGainWriteScreenReaderContent.value = this._register(new RunOnceScheduler(() => this.writeNativeTextAreaContent('asyncFocusGain'), 0));
            }
            else {
                this._asyncFocusGainWriteScreenReaderContent.clear();
            }
        }));
        this._hasFocus = false;
        this._currentComposition = null;
        let lastKeyDown = null;
        this._register(this._textArea.onKeyDown((_e) => {
            const e = new StandardKeyboardEvent(_e);
            if (e.keyCode === 114 /* KeyCode.KEY_IN_COMPOSITION */
                || (this._currentComposition && e.keyCode === 1 /* KeyCode.Backspace */)) {
                // Stop propagation for keyDown events if the IME is processing key input
                e.stopPropagation();
            }
            if (e.equals(9 /* KeyCode.Escape */)) {
                // Prevent default always for `Esc`, otherwise it will generate a keypress
                // See https://msdn.microsoft.com/en-us/library/ie/ms536939(v=vs.85).aspx
                e.preventDefault();
            }
            lastKeyDown = e;
            this._onKeyDown.fire(e);
        }));
        this._register(this._textArea.onKeyUp((_e) => {
            const e = new StandardKeyboardEvent(_e);
            this._onKeyUp.fire(e);
        }));
        this._register(this._textArea.onCompositionStart((e) => {
            if (_debugComposition) {
                console.log(`[compositionstart]`, e);
            }
            const currentComposition = new CompositionContext();
            if (this._currentComposition) {
                // simply reset the composition context
                this._currentComposition = currentComposition;
                return;
            }
            this._currentComposition = currentComposition;
            if (this._OS === 2 /* OperatingSystem.Macintosh */
                && lastKeyDown
                && lastKeyDown.equals(114 /* KeyCode.KEY_IN_COMPOSITION */)
                && this._textAreaState.selectionStart === this._textAreaState.selectionEnd
                && this._textAreaState.selectionStart > 0
                && this._textAreaState.value.substr(this._textAreaState.selectionStart - 1, 1) === e.data
                && (lastKeyDown.code === 'ArrowRight' || lastKeyDown.code === 'ArrowLeft')) {
                // Handling long press case on Chromium/Safari macOS + arrow key => pretend the character was selected
                if (_debugComposition) {
                    console.log(`[compositionstart] Handling long press case on macOS + arrow key`, e);
                }
                // Pretend the previous character was composed (in order to get it removed by subsequent compositionupdate events)
                currentComposition.handleCompositionUpdate('x');
                this._onCompositionStart.fire({ data: e.data });
                return;
            }
            if (this._browser.isAndroid) {
                // when tapping on the editor, Android enters composition mode to edit the current word
                // so we cannot clear the textarea on Android and we must pretend the current word was selected
                this._onCompositionStart.fire({ data: e.data });
                return;
            }
            this._onCompositionStart.fire({ data: e.data });
        }));
        this._register(this._textArea.onCompositionUpdate((e) => {
            if (_debugComposition) {
                console.log(`[compositionupdate]`, e);
            }
            const currentComposition = this._currentComposition;
            if (!currentComposition) {
                // should not be possible to receive a 'compositionupdate' without a 'compositionstart'
                return;
            }
            if (this._browser.isAndroid) {
                // On Android, the data sent with the composition update event is unusable.
                // For example, if the cursor is in the middle of a word like Mic|osoft
                // and Microsoft is chosen from the keyboard's suggestions, the e.data will contain "Microsoft".
                // This is not really usable because it doesn't tell us where the edit began and where it ended.
                const newState = TextAreaState.readFromTextArea(this._textArea, this._textAreaState);
                const typeInput = TextAreaState.deduceAndroidCompositionInput(this._textAreaState, newState);
                this._textAreaState = newState;
                this._onType.fire(typeInput);
                this._onCompositionUpdate.fire(e);
                return;
            }
            const typeInput = currentComposition.handleCompositionUpdate(e.data);
            this._textAreaState = TextAreaState.readFromTextArea(this._textArea, this._textAreaState);
            this._onType.fire(typeInput);
            this._onCompositionUpdate.fire(e);
        }));
        this._register(this._textArea.onCompositionEnd((e) => {
            if (_debugComposition) {
                console.log(`[compositionend]`, e);
            }
            const currentComposition = this._currentComposition;
            if (!currentComposition) {
                // https://github.com/microsoft/monaco-editor/issues/1663
                // On iOS 13.2, Chinese system IME randomly trigger an additional compositionend event with empty data
                return;
            }
            this._currentComposition = null;
            if (this._browser.isAndroid) {
                // On Android, the data sent with the composition update event is unusable.
                // For example, if the cursor is in the middle of a word like Mic|osoft
                // and Microsoft is chosen from the keyboard's suggestions, the e.data will contain "Microsoft".
                // This is not really usable because it doesn't tell us where the edit began and where it ended.
                const newState = TextAreaState.readFromTextArea(this._textArea, this._textAreaState);
                const typeInput = TextAreaState.deduceAndroidCompositionInput(this._textAreaState, newState);
                this._textAreaState = newState;
                this._onType.fire(typeInput);
                this._onCompositionEnd.fire();
                return;
            }
            const typeInput = currentComposition.handleCompositionUpdate(e.data);
            this._textAreaState = TextAreaState.readFromTextArea(this._textArea, this._textAreaState);
            this._onType.fire(typeInput);
            this._onCompositionEnd.fire();
        }));
        this._register(this._textArea.onInput((e) => {
            if (_debugComposition) {
                console.log(`[input]`, e);
            }
            // Pretend here we touched the text area, as the `input` event will most likely
            // result in a `selectionchange` event which we want to ignore
            this._textArea.setIgnoreSelectionChangeTime('received input event');
            if (this._currentComposition) {
                return;
            }
            const newState = TextAreaState.readFromTextArea(this._textArea, this._textAreaState);
            const typeInput = TextAreaState.deduceInput(this._textAreaState, newState, /*couldBeEmojiInput*/ this._OS === 2 /* OperatingSystem.Macintosh */);
            if (typeInput.replacePrevCharCnt === 0 && typeInput.text.length === 1) {
                // one character was typed
                if (strings.isHighSurrogate(typeInput.text.charCodeAt(0))
                    || typeInput.text.charCodeAt(0) === 0x7f /* Delete */) {
                    // Ignore invalid input but keep it around for next time
                    return;
                }
            }
            this._textAreaState = newState;
            if (typeInput.text !== ''
                || typeInput.replacePrevCharCnt !== 0
                || typeInput.replaceNextCharCnt !== 0
                || typeInput.positionDelta !== 0) {
                this._onType.fire(typeInput);
            }
        }));
        // --- Clipboard operations
        this._register(this._textArea.onCut((e) => {
            // Pretend here we touched the text area, as the `cut` event will most likely
            // result in a `selectionchange` event which we want to ignore
            this._textArea.setIgnoreSelectionChangeTime('received cut event');
            this._ensureClipboardGetsEditorSelection(e);
            this._asyncTriggerCut.schedule();
        }));
        this._register(this._textArea.onCopy((e) => {
            this._ensureClipboardGetsEditorSelection(e);
        }));
        this._register(this._textArea.onPaste((e) => {
            // Pretend here we touched the text area, as the `paste` event will most likely
            // result in a `selectionchange` event which we want to ignore
            this._textArea.setIgnoreSelectionChangeTime('received paste event');
            e.preventDefault();
            if (!e.clipboardData) {
                return;
            }
            let [text, metadata] = ClipboardEventUtils.getTextData(e.clipboardData);
            if (!text) {
                return;
            }
            // try the in-memory store
            metadata = metadata || InMemoryClipboardMetadataManager.INSTANCE.get(text);
            this._onPaste.fire({
                text: text,
                metadata: metadata
            });
        }));
        this._register(this._textArea.onFocus(() => {
            const hadFocus = this._hasFocus;
            this._setHasFocus(true);
            if (this._accessibilityService.isScreenReaderOptimized() && this._browser.isSafari && !hadFocus && this._hasFocus) {
                // When "tabbing into" the textarea, immediately after dispatching the 'focus' event,
                // Safari will always move the selection at offset 0 in the textarea
                if (!this._asyncFocusGainWriteScreenReaderContent.value) {
                    this._asyncFocusGainWriteScreenReaderContent.value = new RunOnceScheduler(() => this.writeNativeTextAreaContent('asyncFocusGain'), 0);
                }
                this._asyncFocusGainWriteScreenReaderContent.value.schedule();
            }
        }));
        this._register(this._textArea.onBlur(() => {
            if (this._currentComposition) {
                // See https://github.com/microsoft/vscode/issues/112621
                // where compositionend is not triggered when the editor
                // is taken off-dom during a composition
                // Clear the flag to be able to write to the textarea
                this._currentComposition = null;
                // Clear the textarea to avoid an unwanted cursor type
                this.writeNativeTextAreaContent('blurWithoutCompositionEnd');
                // Fire artificial composition end
                this._onCompositionEnd.fire();
            }
            this._setHasFocus(false);
        }));
        this._register(this._textArea.onSyntheticTap(() => {
            if (this._browser.isAndroid && this._currentComposition) {
                // on Android, tapping does not cancel the current composition, so the
                // textarea is stuck showing the old composition
                // Clear the flag to be able to write to the textarea
                this._currentComposition = null;
                // Clear the textarea to avoid an unwanted cursor type
                this.writeNativeTextAreaContent('tapWithoutCompositionEnd');
                // Fire artificial composition end
                this._onCompositionEnd.fire();
            }
        }));
    }
    _initializeFromTest() {
        this._hasFocus = true;
        this._textAreaState = TextAreaState.readFromTextArea(this._textArea, null);
    }
    _installSelectionChangeListener() {
        // See https://github.com/microsoft/vscode/issues/27216 and https://github.com/microsoft/vscode/issues/98256
        // When using a Braille display, it is possible for users to reposition the
        // system caret. This is reflected in Chrome as a `selectionchange` event.
        //
        // The `selectionchange` event appears to be emitted under numerous other circumstances,
        // so it is quite a challenge to distinguish a `selectionchange` coming in from a user
        // using a Braille display from all the other cases.
        //
        // The problems with the `selectionchange` event are:
        //  * the event is emitted when the textarea is focused programmatically -- textarea.focus()
        //  * the event is emitted when the selection is changed in the textarea programmatically -- textarea.setSelectionRange(...)
        //  * the event is emitted when the value of the textarea is changed programmatically -- textarea.value = '...'
        //  * the event is emitted when tabbing into the textarea
        //  * the event is emitted asynchronously (sometimes with a delay as high as a few tens of ms)
        //  * the event sometimes comes in bursts for a single logical textarea operation
        // `selectionchange` events often come multiple times for a single logical change
        // so throttle multiple `selectionchange` events that burst in a short period of time.
        let previousSelectionChangeEventTime = 0;
        return dom.addDisposableListener(this._textArea.ownerDocument, 'selectionchange', (e) => {
            inputLatency.onSelectionChange();
            if (!this._hasFocus) {
                return;
            }
            if (this._currentComposition) {
                return;
            }
            if (!this._browser.isChrome) {
                // Support only for Chrome until testing happens on other browsers
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
            const delta2 = now - this._textArea.getIgnoreSelectionChangeTime();
            this._textArea.resetSelectionChangeTime();
            if (delta2 < 100) {
                // received a `selectionchange` event within 100ms since we touched the textarea
                // => ignore it, since we caused it
                return;
            }
            if (!this._textAreaState.selection) {
                // Cannot correlate a position in the textarea with a position in the editor...
                return;
            }
            const newValue = this._textArea.getValue();
            if (this._textAreaState.value !== newValue) {
                // Cannot correlate a position in the textarea with a position in the editor...
                return;
            }
            const newSelectionStart = this._textArea.getSelectionStart();
            const newSelectionEnd = this._textArea.getSelectionEnd();
            if (this._textAreaState.selectionStart === newSelectionStart && this._textAreaState.selectionEnd === newSelectionEnd) {
                // Nothing to do...
                return;
            }
            const _newSelectionStartPosition = this._textAreaState.deduceEditorPosition(newSelectionStart);
            const newSelectionStartPosition = this._host.deduceModelPosition(_newSelectionStartPosition[0], _newSelectionStartPosition[1], _newSelectionStartPosition[2]);
            const _newSelectionEndPosition = this._textAreaState.deduceEditorPosition(newSelectionEnd);
            const newSelectionEndPosition = this._host.deduceModelPosition(_newSelectionEndPosition[0], _newSelectionEndPosition[1], _newSelectionEndPosition[2]);
            const newSelection = new Selection(newSelectionStartPosition.lineNumber, newSelectionStartPosition.column, newSelectionEndPosition.lineNumber, newSelectionEndPosition.column);
            this._onSelectionChangeRequest.fire(newSelection);
        });
    }
    dispose() {
        super.dispose();
        if (this._selectionChangeListener) {
            this._selectionChangeListener.dispose();
            this._selectionChangeListener = null;
        }
    }
    focusTextArea() {
        // Setting this._hasFocus and writing the screen reader content
        // will result in a focus() and setSelectionRange() in the textarea
        this._setHasFocus(true);
        // If the editor is off DOM, focus cannot be really set, so let's double check that we have managed to set the focus
        this.refreshFocusState();
    }
    isFocused() {
        return this._hasFocus;
    }
    refreshFocusState() {
        this._setHasFocus(this._textArea.hasFocus());
    }
    _setHasFocus(newHasFocus) {
        if (this._hasFocus === newHasFocus) {
            // no change
            return;
        }
        this._hasFocus = newHasFocus;
        if (this._selectionChangeListener) {
            this._selectionChangeListener.dispose();
            this._selectionChangeListener = null;
        }
        if (this._hasFocus) {
            this._selectionChangeListener = this._installSelectionChangeListener();
        }
        if (this._hasFocus) {
            this.writeNativeTextAreaContent('focusgain');
        }
        if (this._hasFocus) {
            this._onFocus.fire();
        }
        else {
            this._onBlur.fire();
        }
    }
    _setAndWriteTextAreaState(reason, textAreaState) {
        if (!this._hasFocus) {
            textAreaState = textAreaState.collapseSelection();
        }
        if (!textAreaState.isWrittenToTextArea(this._textArea, this._hasFocus)) {
            this._logService.trace(`writeTextAreaState(reason: ${reason})`);
        }
        textAreaState.writeToTextArea(reason, this._textArea, this._hasFocus);
        this._textAreaState = textAreaState;
    }
    writeNativeTextAreaContent(reason) {
        if ((!this._accessibilityService.isScreenReaderOptimized() && reason === 'render') || this._currentComposition) {
            // Do not write to the text on render unless a screen reader is being used #192278
            // Do not write to the text area when doing composition
            return;
        }
        this._setAndWriteTextAreaState(reason, this._host.getScreenReaderContent());
    }
    _ensureClipboardGetsEditorSelection(e) {
        const dataToCopy = this._host.getDataToCopy();
        const storedMetadata = {
            version: 1,
            isFromEmptySelection: dataToCopy.isFromEmptySelection,
            multicursorText: dataToCopy.multicursorText,
            mode: dataToCopy.mode
        };
        InMemoryClipboardMetadataManager.INSTANCE.set(
        // When writing "LINE\r\n" to the clipboard and then pasting,
        // Firefox pastes "LINE\n", so let's work around this quirk
        (this._browser.isFirefox ? dataToCopy.text.replace(/\r\n/g, '\n') : dataToCopy.text), storedMetadata);
        e.preventDefault();
        if (e.clipboardData) {
            ClipboardEventUtils.setTextData(e.clipboardData, dataToCopy.text, dataToCopy.html, storedMetadata);
        }
    }
};
TextAreaInput = __decorate([
    __param(4, IAccessibilityService),
    __param(5, ILogService)
], TextAreaInput);
export { TextAreaInput };
export class TextAreaWrapper extends Disposable {
    get ownerDocument() {
        return this._actual.ownerDocument;
    }
    constructor(_actual) {
        super();
        this._actual = _actual;
        this.onKeyDown = this._register(new DomEmitter(this._actual, 'keydown')).event;
        this.onKeyPress = this._register(new DomEmitter(this._actual, 'keypress')).event;
        this.onKeyUp = this._register(new DomEmitter(this._actual, 'keyup')).event;
        this.onCompositionStart = this._register(new DomEmitter(this._actual, 'compositionstart')).event;
        this.onCompositionUpdate = this._register(new DomEmitter(this._actual, 'compositionupdate')).event;
        this.onCompositionEnd = this._register(new DomEmitter(this._actual, 'compositionend')).event;
        this.onBeforeInput = this._register(new DomEmitter(this._actual, 'beforeinput')).event;
        this.onInput = this._register(new DomEmitter(this._actual, 'input')).event;
        this.onCut = this._register(new DomEmitter(this._actual, 'cut')).event;
        this.onCopy = this._register(new DomEmitter(this._actual, 'copy')).event;
        this.onPaste = this._register(new DomEmitter(this._actual, 'paste')).event;
        this.onFocus = this._register(new DomEmitter(this._actual, 'focus')).event;
        this.onBlur = this._register(new DomEmitter(this._actual, 'blur')).event;
        this._onSyntheticTap = this._register(new Emitter());
        this.onSyntheticTap = this._onSyntheticTap.event;
        this._ignoreSelectionChangeTime = 0;
        this._register(this.onKeyDown(() => inputLatency.onKeyDown()));
        this._register(this.onBeforeInput(() => inputLatency.onBeforeInput()));
        this._register(this.onInput(() => inputLatency.onInput()));
        this._register(this.onKeyUp(() => inputLatency.onKeyUp()));
        this._register(dom.addDisposableListener(this._actual, TextAreaSyntethicEvents.Tap, () => this._onSyntheticTap.fire()));
    }
    hasFocus() {
        const shadowRoot = dom.getShadowRoot(this._actual);
        if (shadowRoot) {
            return shadowRoot.activeElement === this._actual;
        }
        else if (this._actual.isConnected) {
            return dom.getActiveElement() === this._actual;
        }
        else {
            return false;
        }
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
    getValue() {
        // console.log('current value: ' + this._textArea.value);
        return this._actual.value;
    }
    setValue(reason, value) {
        const textArea = this._actual;
        if (textArea.value === value) {
            // No change
            return;
        }
        // console.log('reason: ' + reason + ', current value: ' + textArea.value + ' => new value: ' + value);
        this.setIgnoreSelectionChangeTime('setValue');
        textArea.value = value;
    }
    getSelectionStart() {
        return this._actual.selectionDirection === 'backward' ? this._actual.selectionEnd : this._actual.selectionStart;
    }
    getSelectionEnd() {
        return this._actual.selectionDirection === 'backward' ? this._actual.selectionStart : this._actual.selectionEnd;
    }
    setSelectionRange(reason, selectionStart, selectionEnd) {
        const textArea = this._actual;
        let activeElement = null;
        const shadowRoot = dom.getShadowRoot(textArea);
        if (shadowRoot) {
            activeElement = shadowRoot.activeElement;
        }
        else {
            activeElement = dom.getActiveElement();
        }
        const activeWindow = dom.getWindow(activeElement);
        const currentIsFocused = (activeElement === textArea);
        const currentSelectionStart = textArea.selectionStart;
        const currentSelectionEnd = textArea.selectionEnd;
        if (currentIsFocused && currentSelectionStart === selectionStart && currentSelectionEnd === selectionEnd) {
            // No change
            // Firefox iframe bug https://github.com/microsoft/monaco-editor/issues/643#issuecomment-367871377
            if (browser.isFirefox && activeWindow.parent !== activeWindow) {
                textArea.focus();
            }
            return;
        }
        // console.log('reason: ' + reason + ', setSelectionRange: ' + selectionStart + ' -> ' + selectionEnd);
        if (currentIsFocused) {
            // No need to focus, only need to change the selection range
            this.setIgnoreSelectionChangeTime('setSelectionRange');
            textArea.setSelectionRange(selectionStart, selectionEnd);
            if (browser.isFirefox && activeWindow.parent !== activeWindow) {
                textArea.focus();
            }
            return;
        }
        // If the focus is outside the textarea, browsers will try really hard to reveal the textarea.
        // Here, we try to undo the browser's desperate reveal.
        try {
            const scrollState = dom.saveParentsScrollTop(textArea);
            this.setIgnoreSelectionChangeTime('setSelectionRange');
            textArea.focus();
            textArea.setSelectionRange(selectionStart, selectionEnd);
            dom.restoreParentsScrollTop(textArea, scrollState);
        }
        catch (e) {
            // Sometimes IE throws when setting selection (e.g. textarea is off-DOM)
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dEFyZWFFZGl0Q29udGV4dElucHV0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL2NvbnRyb2xsZXIvZWRpdENvbnRleHQvdGV4dEFyZWEvdGV4dEFyZWFFZGl0Q29udGV4dElucHV0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxPQUFPLE1BQU0sd0NBQXdDLENBQUM7QUFDbEUsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQ0FBb0MsQ0FBQztBQUMxRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxFQUFrQixxQkFBcUIsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQ3JHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUN2RSxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRXJFLE9BQU8sRUFBRSxVQUFVLEVBQWUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUVyRyxPQUFPLEtBQUssT0FBTyxNQUFNLHVDQUF1QyxDQUFDO0FBRWpFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUN0RyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDeEUsT0FBTyxFQUF1QixtQkFBbUIsRUFBMkIsZ0NBQWdDLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQztBQUMzSSxPQUFPLEVBQUUsaUJBQWlCLEVBQStCLGFBQWEsRUFBRSxNQUFN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