/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as dom from '../../dom.js';
import { CaseSensitiveToggle, RegexToggle, WholeWordsToggle } from './findInputToggles.js';
import { HistoryInputBox } from '../inputbox/inputBox.js';
import { Widget } from '../widget.js';
import { Emitter } from '../../../common/event.js';
import './findInput.css';
import * as nls from '../../../../nls.js';
import { DisposableStore, MutableDisposable } from '../../../common/lifecycle.js';
import { createInstantHoverDelegate } from '../hover/hoverDelegateFactory.js';
const NLS_DEFAULT_LABEL = nls.localize('defaultLabel', "input");
export class FindInput extends Widget {
    static { this.OPTION_CHANGE = 'optionChange'; }
    constructor(parent, contextViewProvider, options) {
        super();
        this.fixFocusOnOptionClickEnabled = true;
        this.imeSessionInProgress = false;
        this.additionalTogglesDisposables = this._register(new MutableDisposable());
        this.additionalToggles = [];
        this._onDidOptionChange = this._register(new Emitter());
        this.onDidOptionChange = this._onDidOptionChange.event;
        this._onKeyDown = this._register(new Emitter());
        this.onKeyDown = this._onKeyDown.event;
        this._onMouseDown = this._register(new Emitter());
        this.onMouseDown = this._onMouseDown.event;
        this._onInput = this._register(new Emitter());
        this.onInput = this._onInput.event;
        this._onKeyUp = this._register(new Emitter());
        this.onKeyUp = this._onKeyUp.event;
        this._onCaseSensitiveKeyDown = this._register(new Emitter());
        this.onCaseSensitiveKeyDown = this._onCaseSensitiveKeyDown.event;
        this._onRegexKeyDown = this._register(new Emitter());
        this.onRegexKeyDown = this._onRegexKeyDown.event;
        this._lastHighlightFindOptions = 0;
        this.placeholder = options.placeholder || '';
        this.validation = options.validation;
        this.label = options.label || NLS_DEFAULT_LABEL;
        this.showCommonFindToggles = !!options.showCommonFindToggles;
        const appendCaseSensitiveLabel = options.appendCaseSensitiveLabel || '';
        const appendWholeWordsLabel = options.appendWholeWordsLabel || '';
        const appendRegexLabel = options.appendRegexLabel || '';
        const flexibleHeight = !!options.flexibleHeight;
        const flexibleWidth = !!options.flexibleWidth;
        const flexibleMaxHeight = options.flexibleMaxHeight;
        this.domNode = document.createElement('div');
        this.domNode.classList.add('monaco-findInput');
        this.inputBox = this._register(new HistoryInputBox(this.domNode, contextViewProvider, {
            placeholder: this.placeholder || '',
            ariaLabel: this.label || '',
            validationOptions: {
                validation: this.validation
            },
            showHistoryHint: options.showHistoryHint,
            flexibleHeight,
            flexibleWidth,
            flexibleMaxHeight,
            inputBoxStyles: options.inputBoxStyles,
            history: options.history
        }));
        const hoverDelegate = this._register(createInstantHoverDelegate());
        if (this.showCommonFindToggles) {
            this.regex = this._register(new RegexToggle({
                appendTitle: appendRegexLabel,
                isChecked: false,
                hoverDelegate,
                ...options.toggleStyles
            }));
            this._register(this.regex.onChange(viaKeyboard => {
                this._onDidOptionChange.fire(viaKeyboard);
                if (!viaKeyboard && this.fixFocusOnOptionClickEnabled) {
                    this.inputBox.focus();
                }
                this.validate();
            }));
            this._register(this.regex.onKeyDown(e => {
                this._onRegexKeyDown.fire(e);
            }));
            this.wholeWords = this._register(new WholeWordsToggle({
                appendTitle: appendWholeWordsLabel,
                isChecked: false,
                hoverDelegate,
                ...options.toggleStyles
            }));
            this._register(this.wholeWords.onChange(viaKeyboard => {
                this._onDidOptionChange.fire(viaKeyboard);
                if (!viaKeyboard && this.fixFocusOnOptionClickEnabled) {
                    this.inputBox.focus();
                }
                this.validate();
            }));
            this.caseSensitive = this._register(new CaseSensitiveToggle({
                appendTitle: appendCaseSensitiveLabel,
                isChecked: false,
                hoverDelegate,
                ...options.toggleStyles
            }));
            this._register(this.caseSensitive.onChange(viaKeyboard => {
                this._onDidOptionChange.fire(viaKeyboard);
                if (!viaKeyboard && this.fixFocusOnOptionClickEnabled) {
                    this.inputBox.focus();
                }
                this.validate();
            }));
            this._register(this.caseSensitive.onKeyDown(e => {
                this._onCaseSensitiveKeyDown.fire(e);
            }));
            // Arrow-Key support to navigate between options
            const indexes = [this.caseSensitive.domNode, this.wholeWords.domNode, this.regex.domNode];
            this.onkeydown(this.domNode, (event) => {
                if (event.equals(15 /* KeyCode.LeftArrow */) || event.equals(17 /* KeyCode.RightArrow */) || event.equals(9 /* KeyCode.Escape */)) {
                    const index = indexes.indexOf(this.domNode.ownerDocument.activeElement);
                    if (index >= 0) {
                        let newIndex = -1;
                        if (event.equals(17 /* KeyCode.RightArrow */)) {
                            newIndex = (index + 1) % indexes.length;
                        }
                        else if (event.equals(15 /* KeyCode.LeftArrow */)) {
                            if (index === 0) {
                                newIndex = indexes.length - 1;
                            }
                            else {
                                newIndex = index - 1;
                            }
                        }
                        if (event.equals(9 /* KeyCode.Escape */)) {
                            indexes[index].blur();
                            this.inputBox.focus();
                        }
                        else if (newIndex >= 0) {
                            indexes[newIndex].focus();
                        }
                        dom.EventHelper.stop(event, true);
                    }
                }
            });
        }
        this.controls = document.createElement('div');
        this.controls.className = 'controls';
        this.controls.style.display = this.showCommonFindToggles ? '' : 'none';
        if (this.caseSensitive) {
            this.controls.append(this.caseSensitive.domNode);
        }
        if (this.wholeWords) {
            this.controls.appendChild(this.wholeWords.domNode);
        }
        if (this.regex) {
            this.controls.appendChild(this.regex.domNode);
        }
        this.setAdditionalToggles(options?.additionalToggles);
        if (this.controls) {
            this.domNode.appendChild(this.controls);
        }
        parent?.appendChild(this.domNode);
        this._register(dom.addDisposableListener(this.inputBox.inputElement, 'compositionstart', (e) => {
            this.imeSessionInProgress = true;
        }));
        this._register(dom.addDisposableListener(this.inputBox.inputElement, 'compositionend', (e) => {
            this.imeSessionInProgress = false;
            this._onInput.fire();
        }));
        this.onkeydown(this.inputBox.inputElement, (e) => this._onKeyDown.fire(e));
        this.onkeyup(this.inputBox.inputElement, (e) => this._onKeyUp.fire(e));
        this.oninput(this.inputBox.inputElement, (e) => this._onInput.fire());
        this.onmousedown(this.inputBox.inputElement, (e) => this._onMouseDown.fire(e));
    }
    get isImeSessionInProgress() {
        return this.imeSessionInProgress;
    }
    get onDidChange() {
        return this.inputBox.onDidChange;
    }
    layout(style) {
        this.inputBox.layout();
        this.updateInputBoxPadding(style.collapsedFindWidget);
    }
    enable() {
        this.domNode.classList.remove('disabled');
        this.inputBox.enable();
        this.regex?.enable();
        this.wholeWords?.enable();
        this.caseSensitive?.enable();
        for (const toggle of this.additionalToggles) {
            toggle.enable();
        }
    }
    disable() {
        this.domNode.classList.add('disabled');
        this.inputBox.disable();
        this.regex?.disable();
        this.wholeWords?.disable();
        this.caseSensitive?.disable();
        for (const toggle of this.additionalToggles) {
            toggle.disable();
        }
    }
    setFocusInputOnOptionClick(value) {
        this.fixFocusOnOptionClickEnabled = value;
    }
    setEnabled(enabled) {
        if (enabled) {
            this.enable();
        }
        else {
            this.disable();
        }
    }
    setAdditionalToggles(toggles) {
        for (const currentToggle of this.additionalToggles) {
            currentToggle.domNode.remove();
        }
        this.additionalToggles = [];
        this.additionalTogglesDisposables.value = new DisposableStore();
        for (const toggle of toggles ?? []) {
            this.additionalTogglesDisposables.value.add(toggle);
            this.controls.appendChild(toggle.domNode);
            this.additionalTogglesDisposables.value.add(toggle.onChange(viaKeyboard => {
                this._onDidOptionChange.fire(viaKeyboard);
                if (!viaKeyboard && this.fixFocusOnOptionClickEnabled) {
                    this.inputBox.focus();
                }
            }));
            this.additionalToggles.push(toggle);
        }
        if (this.additionalToggles.length > 0) {
            this.controls.style.display = '';
        }
        this.updateInputBoxPadding();
    }
    updateInputBoxPadding(controlsHidden = false) {
        if (controlsHidden) {
            this.inputBox.paddingRight = 0;
        }
        else {
            this.inputBox.paddingRight =
                ((this.caseSensitive?.width() ?? 0) + (this.wholeWords?.width() ?? 0) + (this.regex?.width() ?? 0))
                    + this.additionalToggles.reduce((r, t) => r + t.width(), 0);
        }
    }
    clear() {
        this.clearValidation();
        this.setValue('');
        this.focus();
    }
    getValue() {
        return this.inputBox.value;
    }
    setValue(value) {
        if (this.inputBox.value !== value) {
            this.inputBox.value = value;
        }
    }
    onSearchSubmit() {
        this.inputBox.addToHistory();
    }
    select() {
        this.inputBox.select();
    }
    focus() {
        this.inputBox.focus();
    }
    getCaseSensitive() {
        return this.caseSensitive?.checked ?? false;
    }
    setCaseSensitive(value) {
        if (this.caseSensitive) {
            this.caseSensitive.checked = value;
        }
    }
    getWholeWords() {
        return this.wholeWords?.checked ?? false;
    }
    setWholeWords(value) {
        if (this.wholeWords) {
            this.wholeWords.checked = value;
        }
    }
    getRegex() {
        return this.regex?.checked ?? false;
    }
    setRegex(value) {
        if (this.regex) {
            this.regex.checked = value;
            this.validate();
        }
    }
    focusOnCaseSensitive() {
        this.caseSensitive?.focus();
    }
    focusOnRegex() {
        this.regex?.focus();
    }
    highlightFindOptions() {
        this.domNode.classList.remove('highlight-' + (this._lastHighlightFindOptions));
        this._lastHighlightFindOptions = 1 - this._lastHighlightFindOptions;
        this.domNode.classList.add('highlight-' + (this._lastHighlightFindOptions));
    }
    validate() {
        this.inputBox.validate();
    }
    showMessage(message) {
        this.inputBox.showMessage(message);
    }
    clearMessage() {
        this.inputBox.hideMessage();
    }
    clearValidation() {
        this.inputBox.hideMessage();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmluZElucHV0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvYnJvd3Nlci91aS9maW5kaW5wdXQvZmluZElucHV0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sY0FBYyxDQUFDO0FBS3BDLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxXQUFXLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUMzRixPQUFPLEVBQUUsZUFBZSxFQUFpRSxNQUFNLHlCQUF5QixDQUFDO0FBQ3pILE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxjQUFjLENBQUM7QUFDdEMsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLDBCQUEwQixDQUFDO0FBRTFELE9BQU8saUJBQWlCLENBQUM7QUFDekIsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQztBQUMxQyxPQUFPLEVBQUUsZUFBZSxFQUFFLGlCQUFpQixFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDbEYsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUF3QjlFLE1BQU0saUJBQWlCLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQyxjQUFjLEVBQUUsT0FBTyxDQUFDLENBQUM7QUFFaEUsTUFBTSxPQUFPLFNBQVUsU0FBUSxNQUFNO2FBRXBCLGtCQUFhLEdBQVcsY0FBYyxBQUF6QixDQUEwQjtJQXVDdkQsWUFBWSxNQUEwQixFQUFFLG1CQUFxRCxFQUFFLE9BQTBCO1FBQ3hILEtBQUssRUFBRSxDQUFDO1FBbENELGlDQUE0QixHQUFHLElBQUksQ0FBQztRQUNwQyx5QkFBb0IsR0FBRyxLQUFLLENBQUM7UUFDcEIsaUNBQTRCLEdBQXVDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxpQkFB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