/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as dom from '../../dom.js';
import * as cssJs from '../../cssValue.js';
import { DomEmitter } from '../../event.js';
import { renderFormattedText, renderText } from '../../formattedTextRenderer.js';
import { ActionBar } from '../actionbar/actionbar.js';
import * as aria from '../aria/aria.js';
import { getBaseLayerHoverDelegate } from '../hover/hoverDelegate2.js';
import { ScrollableElement } from '../scrollbar/scrollableElement.js';
import { Widget } from '../widget.js';
import { Emitter, Event } from '../../../common/event.js';
import { HistoryNavigator } from '../../../common/history.js';
import { equals } from '../../../common/objects.js';
import './inputBox.css';
import * as nls from '../../../../nls.js';
import { MutableDisposable } from '../../../common/lifecycle.js';
const $ = dom.$;
export var MessageType;
(function (MessageType) {
    MessageType[MessageType["INFO"] = 1] = "INFO";
    MessageType[MessageType["WARNING"] = 2] = "WARNING";
    MessageType[MessageType["ERROR"] = 3] = "ERROR";
})(MessageType || (MessageType = {}));
export const unthemedInboxStyles = {
    inputBackground: '#3C3C3C',
    inputForeground: '#CCCCCC',
    inputValidationInfoBorder: '#55AAFF',
    inputValidationInfoBackground: '#063B49',
    inputValidationWarningBorder: '#B89500',
    inputValidationWarningBackground: '#352A05',
    inputValidationErrorBorder: '#BE1100',
    inputValidationErrorBackground: '#5A1D1D',
    inputBorder: undefined,
    inputValidationErrorForeground: undefined,
    inputValidationInfoForeground: undefined,
    inputValidationWarningForeground: undefined
};
export class InputBox extends Widget {
    constructor(container, contextViewProvider, options) {
        super();
        this.state = 'idle';
        this.maxHeight = Number.POSITIVE_INFINITY;
        this.hover = this._register(new MutableDisposable());
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this._onDidHeightChange = this._register(new Emitter());
        this.onDidHeightChange = this._onDidHeightChange.event;
        this.contextViewProvider = contextViewProvider;
        this.options = options;
        this.message = null;
        this.placeholder = this.options.placeholder || '';
        this.tooltip = this.options.tooltip ?? (this.placeholder || '');
        this.ariaLabel = this.options.ariaLabel || '';
        if (this.options.validationOptions) {
            this.validation = this.options.validationOptions.validation;
        }
        this.element = dom.append(container, $('.monaco-inputbox.idle'));
        const tagName = this.options.flexibleHeight ? 'textarea' : 'input';
        const wrapper = dom.append(this.element, $('.ibwrapper'));
        this.input = dom.append(wrapper, $(tagName + '.input.empty'));
        this.input.setAttribute('autocorrect', 'off');
        this.input.setAttribute('autocapitalize', 'off');
        this.input.setAttribute('spellcheck', 'false');
        this.onfocus(this.input, () => this.element.classList.add('synthetic-focus'));
        this.onblur(this.input, () => this.element.classList.remove('synthetic-focus'));
        if (this.options.flexibleHeight) {
            this.maxHeight = typeof this.options.flexibleMaxHeight === 'number' ? this.options.flexibleMaxHeight : Number.POSITIVE_INFINITY;
            this.mirror = dom.append(wrapper, $('div.mirror'));
            this.mirror.innerText = '\u00a0';
            this.scrollableElement = new ScrollableElement(this.element, { vertical: 1 /* ScrollbarVisibility.Auto */ });
            if (this.options.flexibleWidth) {
                this.input.setAttribute('wrap', 'off');
                this.mirror.style.whiteSpace = 'pre';
                this.mirror.style.wordWrap = 'initial';
            }
            dom.append(container, this.scrollableElement.getDomNode());
            this._register(this.scrollableElement);
            // from ScrollableElement to DOM
            this._register(this.scrollableElement.onScroll(e => this.input.scrollTop = e.scrollTop));
            const onSelectionChange = this._register(new DomEmitter(container.ownerDocument, 'selectionchange'));
            const onAnchoredSelectionChange = Event.filter(onSelectionChange.event, () => {
                const selection = container.ownerDocument.getSelection();
                return selection?.anchorNode === wrapper;
            });
            // from DOM to ScrollableElement
            this._register(onAnchoredSelectionChange(this.updateScrollDimensions, this));
            this._register(this.onDidHeightChange(this.updateScrollDimensions, this));
        }
        else {
            this.input.type = this.options.type || 'text';
            this.input.setAttribute('wrap', 'off');
        }
        if (this.ariaLabel) {
            this.input.setAttribute('aria-label', this.ariaLabel);
        }
        if (this.placeholder && !this.options.showPlaceholderOnFocus) {
            this.setPlaceHolder(this.placeholder);
        }
        if (this.tooltip) {
            this.setTooltip(this.tooltip);
        }
        this.oninput(this.input, () => this.onValueChange());
        this.onblur(this.input, () => this.onBlur());
        this.onfocus(this.input, () => this.onFocus());
        this._register(this.ignoreGesture(this.input));
        setTimeout(() => this.updateMirror(), 0);
        // Support actions
        if (this.options.actions) {
            this.actionbar = this._register(new ActionBar(this.element));
            this.actionbar.push(this.options.actions, { icon: true, label: false });
        }
        this.applyStyles();
    }
    onBlur() {
        this._hideMessage();
        if (this.options.showPlaceholderOnFocus) {
            this.input.setAttribute('placeholder', '');
        }
    }
    onFocus() {
        this._showMessage();
        if (this.options.showPlaceholderOnFocus) {
            this.input.setAttribute('placeholder', this.placeholder || '');
        }
    }
    setPlaceHolder(placeHolder) {
        this.placeholder = placeHolder;
        this.input.setAttribute('placeholder', placeHolder);
    }
    setTooltip(tooltip) {
        this.tooltip = tooltip;
        if (!this.hover.value) {
            this.hover.value = this._register(getBaseLayerHoverDelegate().setupDelayedHoverAtMouse(this.input, () => ({
                content: this.tooltip,
                appearance: {
                    compact: true,
                }
            })));
        }
    }
    setAriaLabel(label) {
        this.ariaLabel = label;
        if (label) {
            this.input.setAttribute('aria-label', this.ariaLabel);
        }
        else {
            this.input.removeAttribute('aria-label');
        }
    }
    getAriaLabel() {
        return this.ariaLabel;
    }
    get mirrorElement() {
        return this.mirror;
    }
    get inputElement() {
        return this.input;
    }
    get value() {
        return this.input.value;
    }
    set value(newValue) {
        if (this.input.value !== newValue) {
            this.input.value = newValue;
            this.onValueChange();
        }
    }
    get step() {
        return this.input.step;
    }
    set step(newValue) {
        this.input.step = newValue;
    }
    get height() {
        return typeof this.cachedHeight === 'number' ? this.cachedHeight : dom.getTotalHeight(this.element);
    }
    focus() {
        this.input.focus();
    }
    blur() {
        this.input.blur();
    }
    hasFocus() {
        return dom.isActiveElement(this.input);
    }
    select(range = null) {
        this.input.select();
        if (range) {
            this.input.setSelectionRange(range.start, range.end);
            if (range.end === this.input.value.length) {
                this.input.scrollLeft = this.input.scrollWidth;
            }
        }
    }
    isSelectionAtEnd() {
        return this.input.selectionEnd === this.input.value.length && this.input.selectionStart === this.input.selectionEnd;
    }
    getSelection() {
        const selectionStart = this.input.selectionStart;
        if (selectionStart === null) {
            return null;
        }
        const selectionEnd = this.input.selectionEnd ?? selectionStart;
        return {
            start: selectionStart,
            end: selectionEnd,
        };
    }
    enable() {
        this.input.removeAttribute('disabled');
    }
    disable() {
        this.blur();
        this.input.disabled = true;
        this._hideMessage();
    }
    setEnabled(enabled) {
        if (enabled) {
            this.enable();
        }
        else {
            this.disable();
        }
    }
    get width() {
        return dom.getTotalWidth(this.input);
    }
    set width(width) {
        if (this.options.flexibleHeight && this.options.flexibleWidth) {
            // textarea with horizontal scrolling
            let horizontalPadding = 0;
            if (this.mirror) {
                const paddingLeft = parseFloat(this.mirror.style.paddingLeft || '') || 0;
                const paddingRight = parseFloat(this.mirror.style.paddingRight || '') || 0;
                horizontalPadding = paddingLeft + paddingRight;
            }
            this.input.style.width = (width - horizontalPadding) + 'px';
        }
        else {
            this.input.style.width = width + 'px';
        }
        if (this.mirror) {
            this.mirror.style.width = width + 'px';
        }
    }
    set paddingRight(paddingRight) {
        // Set width to avoid hint text overlapping buttons
        this.input.style.width = `calc(100% - ${paddingRight}px)`;
        if (this.mirror) {
            this.mirror.style.paddingRight = paddingRight + 'px';
        }
    }
    updateScrollDimensions() {
        if (typeof this.cachedContentHeight !== 'number' || typeof this.cachedHeight !== 'number' || !this.scrollableElement) {
            return;
        }
        const scrollHeight = this.cachedContentHeight;
        const height = this.cachedHeight;
        const scrollTop = this.input.scrollTop;
        this.scrollableElement.setScrollDimensions({ scrollHeight, height });
        this.scrollableElement.setScrollPosition({ scrollTop });
    }
    showMessage(message, force) {
        if (this.state === 'open' && equals(this.message, message)) {
            // Already showing
            return;
        }
        this.message = message;
        this.element.classList.remove('idle');
        this.element.classList.remove('info');
        this.element.classList.remove('warning');
        this.element.classList.remove('error');
        this.element.classList.add(this.classForType(message.type));
        const styles = this.stylesForType(this.message.type);
        this.element.style.border = `1px solid ${cssJs.asCssValueWithDefault(styles.border, 'transparent')}`;
        if (this.message.content && (this.hasFocus() || force)) {
            this._showMessage();
        }
    }
    hideMessage() {
        this.message = null;
        this.element.classList.remove('info');
        this.element.classList.remove('warning');
        this.element.classList.remove('error');
        this.element.classList.add('idle');
        this._hideMessage();
        this.applyStyles();
    }
    isInputValid() {
        return !!this.validation && !this.validation(this.value);
    }
    validate() {
        let errorMsg = null;
        if (this.validation) {
            errorMsg = this.validation(this.value);
            if (errorMsg) {
                this.inputElement.setAttribute('aria-invalid', 'true');
                this.showMessage(errorMsg);
            }
            else if (this.inputElement.hasAttribute('aria-invalid')) {
                this.inputElement.removeAttribute('aria-invalid');
                this.hideMessage();
            }
        }
        return errorMsg?.type;
    }
    stylesForType(type) {
        const styles = this.options.inputBoxStyles;
        switch (type) {
            case 1 /* MessageType.INFO */: return { border: styles.inputValidationInfoBorder, background: styles.inputValidationInfoBackground, foreground: styles.inputValidationInfoForeground };
            case 2 /* MessageType.WARNING */: return { border: styles.inputValidationWarningBorder, background: styles.inputValidationWarningBackground, foreground: styles.inputValidationWarningForeground };
            default: return { border: styles.inputValidationErrorBorder, background: styles.inputValidationErrorBackground, foreground: styles.inputValidationErrorForeground };
        }
    }
    classForType(type) {
        switch (type) {
            case 1 /* MessageType.INFO */: return 'info';
            case 2 /* MessageType.WARNING */: return 'warning';
            default: return 'error';
        }
    }
    _showMessage() {
        if (!this.contextViewProvider || !this.message) {
            return;
        }
        let div;
        const layout = () => div.style.width = dom.getTotalWidth(this.element) + 'px';
        this.contextViewProvider.showContextView({
            getAnchor: () => this.element,
            anchorAlignment: 1 /* AnchorAlignment.RIGHT */,
            render: (container) => {
                if (!this.message) {
                    return null;
                }
                div = dom.append(container, $('.monaco-inputbox-container'));
                layout();
                const renderOptions = {
                    inline: true,
                    className: 'monaco-inputbox-message'
                };
                const spanElement = (this.message.formatContent
                    ? renderFormattedText(this.message.content, renderOptions)
                    : renderText(this.message.content, renderOptions));
                spanElement.classList.add(this.classForType(this.message.type));
                const styles = this.stylesForType(this.message.type);
                spanElement.style.backgroundColor = styles.background ?? '';
                spanElement.style.color = styles.foreground ?? '';
                spanElement.style.border = styles.border ? `1px solid ${styles.border}` : '';
                dom.append(div, spanElement);
                return null;
            },
            onHide: () => {
                this.state = 'closed';
            },
            layout: layout
        });
        // ARIA Support
        let alertText;
        if (this.message.type === 3 /* MessageType.ERROR */) {
            alertText = nls.localize('alertErrorMessage', "Error: {0}", this.message.content);
        }
        else if (this.message.type === 2 /* MessageType.WARNING */) {
            alertText = nls.localize('alertWarningMessage', "Warning: {0}", this.message.content);
        }
        else {
            alertText = nls.localize('alertInfoMessage', "Info: {0}", this.message.content);
        }
        aria.alert(alertText);
        this.state = 'open';
    }
    _hideMessage() {
        if (!this.contextViewProvider) {
            return;
        }
        if (this.state === 'open') {
            this.contextViewProvider.hideContextView();
        }
        this.state = 'idle';
    }
    onValueChange() {
        this._onDidChange.fire(this.value);
        this.validate();
        this.updateMirror();
        this.input.classList.toggle('empty', !this.value);
        if (this.state === 'open' && this.contextViewProvider) {
            this.contextViewProvider.layout();
        }
    }
    updateMirror() {
        if (!this.mirror) {
            return;
        }
        const value = this.value;
        const lastCharCode = value.charCodeAt(value.length - 1);
        const suffix = lastCharCode === 10 ? ' ' : '';
        const mirrorTextContent = (value + suffix)
            .replace(/\u000c/g, ''); // Don't measure with the form feed character, which messes up sizing
        if (mirrorTextContent) {
            this.mirror.textContent = value + suffix;
        }
        else {
            this.mirror.innerText = '\u00a0';
        }
        this.layout();
    }
    applyStyles() {
        const styles = this.options.inputBoxStyles;
        const background = styles.inputBackground ?? '';
        const foreground = styles.inputForeground ?? '';
        const border = styles.inputBorder ?? '';
        this.element.style.backgroundColor = background;
        this.element.style.color = foreground;
        this.input.style.backgroundColor = 'inherit';
        this.input.style.color = foreground;
        // there's always a border, even if the color is not set.
        this.element.style.border = `1px solid ${cssJs.asCssValueWithDefault(border, 'transparent')}`;
    }
    layout() {
        if (!this.mirror) {
            return;
        }
        const previousHeight = this.cachedContentHeight;
        this.cachedContentHeight = dom.getTotalHeight(this.mirror);
        if (previousHeight !== this.cachedContentHeight) {
            this.cachedHeight = Math.min(this.cachedContentHeight, this.maxHeight);
            this.input.style.height = this.cachedHeight + 'px';
            this._onDidHeightChange.fire(this.cachedContentHeight);
        }
    }
    insertAtCursor(text) {
        const inputElement = this.inputElement;
        const start = inputElement.selectionStart;
        const end = inputElement.selectionEnd;
        const content = inputElement.value;
        if (start !== null && end !== null) {
            this.value = content.substr(0, start) + text + content.substr(end);
            inputElement.setSelectionRange(start + 1, start + 1);
            this.layout();
        }
    }
    dispose() {
        this._hideMessage();
        this.message = null;
        this.actionbar?.dispose();
        super.dispose();
    }
}
export class HistoryInputBox extends InputBox {
    constructor(container, contextViewProvider, options) {
        const NLS_PLACEHOLDER_HISTORY_HINT_SUFFIX_NO_PARENS = nls.localize({
            key: 'history.inputbox.hint.suffix.noparens',
            comment: ['Text is the suffix of an input field placeholder coming after the action the input field performs, this will be used when the input field ends in a closing parenthesis ")", for example "Filter (e.g. text, !exclude)". The character inserted into the final string is \u21C5 to represent the up and down arrow keys.']
        }, ' or {0} for history', `\u21C5`);
        const NLS_PLACEHOLDER_HISTORY_HINT_SUFFIX_IN_PARENS = nls.localize({
            key: 'history.inputbox.hint.suffix.inparens',
            comment: ['Text is the suffix of an input field placeholder coming after the action the input field performs, this will be used when the input field does NOT end in a closing parenthesis (eg. "Find"). The character inserted into the final string is \u21C5 to represent the up and down arrow keys.']
        }, ' ({0} for history)', `\u21C5`);
        super(container, contextViewProvider, options);
        this._onDidFocus = this._register(new Emitter());
        this.onDidFocus = this._onDidFocus.event;
        this._onDidBlur = this._register(new Emitter());
        this.onDidBlur = this._onDidBlur.event;
        this.history = this._register(new HistoryNavigator(options.history, 100));
        // Function to append the history suffix to the placeholder if necessary
        const addSuffix = () => {
            if (options.showHistoryHint && options.showHistoryHint() && !this.placeholder.endsWith(NLS_PLACEHOLDER_HISTORY_HINT_SUFFIX_NO_PARENS) && !this.placeholder.endsWith(NLS_PLACEHOLDER_HISTORY_HINT_SUFFIX_IN_PARENS) && this.history.getHistory().length) {
                const suffix = this.placeholder.endsWith(')') ? NLS_PLACEHOLDER_HISTORY_HINT_SUFFIX_NO_PARENS : NLS_PLACEHOLDER_HISTORY_HINT_SUFFIX_IN_PARENS;
                const suffixedPlaceholder = this.placeholder + suffix;
                if (options.showPlaceholderOnFocus && !dom.isActiveElement(this.input)) {
                    this.placeholder = suffixedPlaceholder;
                }
                else {
                    this.setPlaceHolder(suffixedPlaceholder);
                }
            }
        };
        // Spot the change to the textarea class attribute which occurs when it changes between non-empty and empty,
        // and add the history suffix to the placeholder if not yet present
        this.observer = new MutationObserver((mutationList, observer) => {
            mutationList.forEach((mutation) => {
                if (!mutation.target.textContent) {
                    addSuffix();
                }
            });
        });
        this.observer.observe(this.input, { attributeFilter: ['class'] });
        this.onfocus(this.input, () => addSuffix());
        this.onblur(this.input, () => {
            const resetPlaceholder = (historyHint) => {
                if (!this.placeholder.endsWith(historyHint)) {
                    return false;
                }
                else {
                    const revertedPlaceholder = this.placeholder.slice(0, this.placeholder.length - historyHint.length);
                    if (options.showPlaceholderOnFocus) {
                        this.placeholder = revertedPlaceholder;
                    }
                    else {
                        this.setPlaceHolder(revertedPlaceholder);
                    }
                    return true;
                }
            };
            if (!resetPlaceholder(NLS_PLACEHOLDER_HISTORY_HINT_SUFFIX_IN_PARENS)) {
                resetPlaceholder(NLS_PLACEHOLDER_HISTORY_HINT_SUFFIX_NO_PARENS);
            }
        });
    }
    dispose() {
        super.dispose();
        if (this.observer) {
            this.observer.disconnect();
            this.observer = undefined;
        }
    }
    addToHistory(always) {
        if (this.value && (always || this.value !== this.getCurrentValue())) {
            this.history.add(this.value);
        }
    }
    prependHistory(restoredHistory) {
        const newHistory = this.getHistory();
        this.clearHistory();
        restoredHistory.forEach((item) => {
            this.history.add(item);
        });
        newHistory.forEach(item => {
            this.history.add(item);
        });
    }
    getHistory() {
        return this.history.getHistory();
    }
    isAtFirstInHistory() {
        return this.history.isFirst();
    }
    isAtLastInHistory() {
        return this.history.isLast();
    }
    isNowhereInHistory() {
        return this.history.isNowhere();
    }
    showNextValue() {
        if (!this.history.has(this.value)) {
            this.addToHistory();
        }
        let next = this.getNextValue();
        if (next) {
            next = next === this.value ? this.getNextValue() : next;
        }
        this.value = next ?? '';
        aria.status(this.value ? this.value : nls.localize('clearedInput', "Cleared Input"));
    }
    showPreviousValue() {
        if (!this.history.has(this.value)) {
            this.addToHistory();
        }
        let previous = this.getPreviousValue();
        if (previous) {
            previous = previous === this.value ? this.getPreviousValue() : previous;
        }
        if (previous) {
            this.value = previous;
            aria.status(this.value);
        }
    }
    clearHistory() {
        this.history.clear();
    }
    setPlaceHolder(placeHolder) {
        super.setPlaceHolder(placeHolder);
        this.setTooltip(placeHolder);
    }
    onBlur() {
        super.onBlur();
        this._onDidBlur.fire();
    }
    onFocus() {
        super.onFocus();
        this._onDidFocus.fire();
    }
    getCurrentValue() {
        let currentValue = this.history.current();
        if (!currentValue) {
            currentValue = this.history.last();
            this.history.next();
        }
        return currentValue;
    }
    getPreviousValue() {
        return this.history.previous() || this.history.first();
    }
    getNextValue() {
        return this.history.next();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5wdXRCb3guanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9icm93c2VyL3VpL2lucHV0Ym94L2lucHV0Qm94LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sY0FBYyxDQUFDO0FBQ3BDLE9BQU8sS0FBSyxLQUFLLE1BQU0sbUJBQW1CLENBQUM7QUFDM0MsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGdCQUFnQixDQUFDO0FBQzVDLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxVQUFVLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUdqRixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDdEQsT0FBTyxLQUFLLElBQUksTUFBTSxpQkFBaUIsQ0FBQztBQUV4QyxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUN2RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN0RSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sY0FBYyxDQUFDO0FBRXRDLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDMUQsT0FBTyxFQUFFLGdCQUFnQixFQUFZLE1BQU0sNEJBQTRCLENBQUM7QUFDeEUsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBRXBELE9BQU8sZ0JBQWdCLENBQUM7QUFDeEIsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQztBQUMxQyxPQUFPLEVBQUUsaUJBQWlCLEVBQW9CLE1BQU0sOEJBQThCLENBQUM7QUFHbkYsTUFBTSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQztBQThDaEIsTUFBTSxDQUFOLElBQWtC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