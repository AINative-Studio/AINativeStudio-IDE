/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import './dialog.css';
import { localize } from '../../../../nls.js';
import { $, addDisposableListener, clearNode, EventHelper, EventType, getWindow, hide, isActiveElement, isAncestor, show } from '../../dom.js';
import { StandardKeyboardEvent } from '../../keyboardEvent.js';
import { ActionBar } from '../actionbar/actionbar.js';
import { ButtonBar, ButtonWithDescription, ButtonWithDropdown } from '../button/button.js';
import { Checkbox } from '../toggle/toggle.js';
import { InputBox } from '../inputbox/inputBox.js';
import { Action, toAction } from '../../../common/actions.js';
import { Codicon } from '../../../common/codicons.js';
import { ThemeIcon } from '../../../common/themables.js';
import { mnemonicButtonLabel } from '../../../common/labels.js';
import { Disposable, toDisposable } from '../../../common/lifecycle.js';
import { isLinux, isMacintosh, isWindows } from '../../../common/platform.js';
import { isActionProvider } from '../dropdown/dropdown.js';
export class Dialog extends Disposable {
    constructor(container, message, buttons, options) {
        super();
        this.container = container;
        this.message = message;
        this.options = options;
        this.modalElement = this.container.appendChild($(`.monaco-dialog-modal-block.dimmed`));
        this.shadowElement = this.modalElement.appendChild($('.dialog-shadow'));
        this.element = this.shadowElement.appendChild($('.monaco-dialog-box'));
        this.element.setAttribute('role', 'dialog');
        this.element.tabIndex = -1;
        hide(this.element);
        this.buttonStyles = options.buttonStyles;
        if (Array.isArray(buttons) && buttons.length > 0) {
            this.buttons = buttons;
        }
        else if (!this.options.disableDefaultAction) {
            this.buttons = [localize('ok', "OK")];
        }
        else {
            this.buttons = [];
        }
        const buttonsRowElement = this.element.appendChild($('.dialog-buttons-row'));
        this.buttonsContainer = buttonsRowElement.appendChild($('.dialog-buttons'));
        const messageRowElement = this.element.appendChild($('.dialog-message-row'));
        this.iconElement = messageRowElement.appendChild($('#monaco-dialog-icon.dialog-icon'));
        this.iconElement.setAttribute('aria-label', this.getIconAriaLabel());
        this.messageContainer = messageRowElement.appendChild($('.dialog-message-container'));
        if (this.options.detail || this.options.renderBody) {
            const messageElement = this.messageContainer.appendChild($('.dialog-message'));
            const messageTextElement = messageElement.appendChild($('#monaco-dialog-message-text.dialog-message-text'));
            messageTextElement.innerText = this.message;
        }
        this.messageDetailElement = this.messageContainer.appendChild($('#monaco-dialog-message-detail.dialog-message-detail'));
        if (this.options.detail || !this.options.renderBody) {
            this.messageDetailElement.innerText = this.options.detail ? this.options.detail : message;
        }
        else {
            this.messageDetailElement.style.display = 'none';
        }
        if (this.options.renderBody) {
            const customBody = this.messageContainer.appendChild($('#monaco-dialog-message-body.dialog-message-body'));
            this.options.renderBody(customBody);
            for (const el of this.messageContainer.querySelectorAll('a')) {
                el.tabIndex = 0;
            }
        }
        if (this.options.inputs) {
            this.inputs = this.options.inputs.map(input => {
                const inputRowElement = this.messageContainer.appendChild($('.dialog-message-input'));
                const inputBox = this._register(new InputBox(inputRowElement, undefined, {
                    placeholder: input.placeholder,
                    type: input.type ?? 'text',
                    inputBoxStyles: options.inputBoxStyles
                }));
                if (input.value) {
                    inputBox.value = input.value;
                }
                return inputBox;
            });
        }
        else {
            this.inputs = [];
        }
        if (this.options.checkboxLabel) {
            const checkboxRowElement = this.messageContainer.appendChild($('.dialog-checkbox-row'));
            const checkbox = this.checkbox = this._register(new Checkbox(this.options.checkboxLabel, !!this.options.checkboxChecked, options.checkboxStyles));
            checkboxRowElement.appendChild(checkbox.domNode);
            const checkboxMessageElement = checkboxRowElement.appendChild($('.dialog-checkbox-message'));
            checkboxMessageElement.innerText = this.options.checkboxLabel;
            this._register(addDisposableListener(checkboxMessageElement, EventType.CLICK, () => checkbox.checked = !checkbox.checked));
        }
        const toolbarRowElement = this.element.appendChild($('.dialog-toolbar-row'));
        this.toolbarContainer = toolbarRowElement.appendChild($('.dialog-toolbar'));
        this.applyStyles();
    }
    getIconAriaLabel() {
        let typeLabel = localize('dialogInfoMessage', 'Info');
        switch (this.options.type) {
            case 'error':
                typeLabel = localize('dialogErrorMessage', 'Error');
                break;
            case 'warning':
                typeLabel = localize('dialogWarningMessage', 'Warning');
                break;
            case 'pending':
                typeLabel = localize('dialogPendingMessage', 'In Progress');
                break;
            case 'none':
            case 'info':
            case 'question':
            default:
                break;
        }
        return typeLabel;
    }
    updateMessage(message) {
        this.messageDetailElement.innerText = message;
    }
    async show() {
        this.focusToReturn = this.container.ownerDocument.activeElement;
        return new Promise(resolve => {
            clearNode(this.buttonsContainer);
            const close = () => {
                resolve({
                    button: this.options.cancelId || 0,
                    checkboxChecked: this.checkbox ? this.checkbox.checked : undefined
                });
                return;
            };
            this._register(toDisposable(close));
            const buttonBar = this.buttonBar = this._register(new ButtonBar(this.buttonsContainer));
            const buttonMap = this.rearrangeButtons(this.buttons, this.options.cancelId);
            const onButtonClick = (index) => {
                resolve({
                    button: buttonMap[index].index,
                    checkboxChecked: this.checkbox ? this.checkbox.checked : undefined,
                    values: this.inputs.length > 0 ? this.inputs.map(input => input.value) : undefined
                });
            };
            // Handle button clicks
            buttonMap.forEach((_, index) => {
                const primary = buttonMap[index].index === 0;
                let button;
                if (primary && this.options?.primaryButtonDropdown) {
                    const actions = isActionProvider(this.options.primaryButtonDropdown.actions) ? this.options.primaryButtonDropdown.actions.getActions() : this.options.primaryButtonDropdown.actions;
                    button = this._register(buttonBar.addButtonWithDropdown({
                        ...this.options.primaryButtonDropdown,
                        ...this.buttonStyles,
                        dropdownLayer: 2600, // ensure the dropdown is above the dialog
                        actions: actions.map(action => toAction({
                            ...action,
                            run: async () => {
                                await action.run();
                                onButtonClick(index);
                            }
                        }))
                    }));
                }
                else if (this.options.buttonDetails) {
                    button = this._register(buttonBar.addButtonWithDescription({ secondary: !primary, ...this.buttonStyles }));
                }
                else {
                    button = this._register(buttonBar.addButton({ secondary: !primary, ...this.buttonStyles }));
                }
                button.label = mnemonicButtonLabel(buttonMap[index].label, true);
                if (button instanceof ButtonWithDescription) {
                    button.description = this.options.buttonDetails[buttonMap[index].index];
                }
                this._register(button.onDidClick(e => {
                    if (e) {
                        EventHelper.stop(e);
                    }
                    onButtonClick(index);
                }));
            });
            // Handle keyboard events globally: Tab, Arrow-Left/Right
            const window = getWindow(this.container);
            this._register(addDisposableListener(window, 'keydown', e => {
                const evt = new StandardKeyboardEvent(e);
                if (evt.equals(512 /* KeyMod.Alt */)) {
                    evt.preventDefault();
                }
                if (evt.equals(3 /* KeyCode.Enter */)) {
                    // Enter in input field should OK the dialog
                    if (this.inputs.some(input => input.hasFocus())) {
                        EventHelper.stop(e);
                        resolve({
                            button: buttonMap.find(button => button.index !== this.options.cancelId)?.index ?? 0,
                            checkboxChecked: this.checkbox ? this.checkbox.checked : undefined,
                            values: this.inputs.length > 0 ? this.inputs.map(input => input.value) : undefined
                        });
                    }
                    return; // leave default handling
                }
                // Cmd+D (trigger the "no"/"do not save"-button) (macOS only)
                if (isMacintosh && evt.equals(2048 /* KeyMod.CtrlCmd */ | 34 /* KeyCode.KeyD */)) {
                    EventHelper.stop(e);
                    const noButton = buttonMap.find(button => button.index === 1 && button.index !== this.options.cancelId);
                    if (noButton) {
                        resolve({
                            button: noButton.index,
                            checkboxChecked: this.checkbox ? this.checkbox.checked : undefined,
                            values: this.inputs.length > 0 ? this.inputs.map(input => input.value) : undefined
                        });
                    }
                    return; // leave default handling
                }
                if (evt.equals(10 /* KeyCode.Space */)) {
                    return; // leave default handling
                }
                let eventHandled = false;
                // Focus: Next / Previous
                if (evt.equals(2 /* KeyCode.Tab */) || evt.equals(17 /* KeyCode.RightArrow */) || evt.equals(1024 /* KeyMod.Shift */ | 2 /* KeyCode.Tab */) || evt.equals(15 /* KeyCode.LeftArrow */)) {
                    // Build a list of focusable elements in their visual order
                    const focusableElements = [];
                    let focusedIndex = -1;
                    if (this.messageContainer) {
                        const links = this.messageContainer.querySelectorAll('a');
                        for (const link of links) {
                            focusableElements.push(link);
                            if (isActiveElement(link)) {
                                focusedIndex = focusableElements.length - 1;
                            }
                        }
                    }
                    for (const input of this.inputs) {
                        focusableElements.push(input);
                        if (input.hasFocus()) {
                            focusedIndex = focusableElements.length - 1;
                        }
                    }
                    if (this.checkbox) {
                        focusableElements.push(this.checkbox);
                        if (this.checkbox.hasFocus()) {
                            focusedIndex = focusableElements.length - 1;
                        }
                    }
                    if (this.buttonBar) {
                        for (const button of this.buttonBar.buttons) {
                            if (button instanceof ButtonWithDropdown) {
                                focusableElements.push(button.primaryButton);
                                if (button.primaryButton.hasFocus()) {
                                    focusedIndex = focusableElements.length - 1;
                                }
                                focusableElements.push(button.dropdownButton);
                                if (button.dropdownButton.hasFocus()) {
                                    focusedIndex = focusableElements.length - 1;
                                }
                            }
                            else {
                                focusableElements.push(button);
                                if (button.hasFocus()) {
                                    focusedIndex = focusableElements.length - 1;
                                }
                            }
                        }
                    }
                    // Focus next element (with wrapping)
                    if (evt.equals(2 /* KeyCode.Tab */) || evt.equals(17 /* KeyCode.RightArrow */)) {
                        const newFocusedIndex = (focusedIndex + 1) % focusableElements.length;
                        focusableElements[newFocusedIndex].focus();
                    }
                    // Focus previous element (with wrapping)
                    else {
                        if (focusedIndex === -1) {
                            focusedIndex = focusableElements.length; // default to focus last element if none have focus
                        }
                        let newFocusedIndex = focusedIndex - 1;
                        if (newFocusedIndex === -1) {
                            newFocusedIndex = focusableElements.length - 1;
                        }
                        focusableElements[newFocusedIndex].focus();
                    }
                    eventHandled = true;
                }
                if (eventHandled) {
                    EventHelper.stop(e, true);
                }
                else if (this.options.keyEventProcessor) {
                    this.options.keyEventProcessor(evt);
                }
            }, true));
            this._register(addDisposableListener(window, 'keyup', e => {
                EventHelper.stop(e, true);
                const evt = new StandardKeyboardEvent(e);
                if (!this.options.disableCloseAction && evt.equals(9 /* KeyCode.Escape */)) {
                    close();
                }
            }, true));
            // Detect focus out
            this._register(addDisposableListener(this.element, 'focusout', e => {
                if (!!e.relatedTarget && !!this.element) {
                    if (!isAncestor(e.relatedTarget, this.element)) {
                        this.focusToReturn = e.relatedTarget;
                        if (e.target) {
                            e.target.focus();
                            EventHelper.stop(e, true);
                        }
                    }
                }
            }, false));
            const spinModifierClassName = 'codicon-modifier-spin';
            this.iconElement.classList.remove(...ThemeIcon.asClassNameArray(Codicon.dialogError), ...ThemeIcon.asClassNameArray(Codicon.dialogWarning), ...ThemeIcon.asClassNameArray(Codicon.dialogInfo), ...ThemeIcon.asClassNameArray(Codicon.loading), spinModifierClassName);
            if (this.options.icon) {
                this.iconElement.classList.add(...ThemeIcon.asClassNameArray(this.options.icon));
            }
            else {
                switch (this.options.type) {
                    case 'error':
                        this.iconElement.classList.add(...ThemeIcon.asClassNameArray(Codicon.dialogError));
                        break;
                    case 'warning':
                        this.iconElement.classList.add(...ThemeIcon.asClassNameArray(Codicon.dialogWarning));
                        break;
                    case 'pending':
                        this.iconElement.classList.add(...ThemeIcon.asClassNameArray(Codicon.loading), spinModifierClassName);
                        break;
                    case 'none':
                        this.iconElement.classList.add('no-codicon');
                        break;
                    case 'info':
                    case 'question':
                    default:
                        this.iconElement.classList.add(...ThemeIcon.asClassNameArray(Codicon.dialogInfo));
                        break;
                }
            }
            if (!this.options.disableCloseAction) {
                const actionBar = this._register(new ActionBar(this.toolbarContainer, {}));
                const action = this._register(new Action('dialog.close', localize('dialogClose', "Close Dialog"), ThemeIcon.asClassName(Codicon.dialogClose), true, async () => {
                    resolve({
                        button: this.options.cancelId || 0,
                        checkboxChecked: this.checkbox ? this.checkbox.checked : undefined
                    });
                }));
                actionBar.push(action, { icon: true, label: false });
            }
            this.applyStyles();
            this.element.setAttribute('aria-modal', 'true');
            this.element.setAttribute('aria-labelledby', 'monaco-dialog-icon monaco-dialog-message-text');
            this.element.setAttribute('aria-describedby', 'monaco-dialog-icon monaco-dialog-message-text monaco-dialog-message-detail monaco-dialog-message-body');
            show(this.element);
            // Focus first element (input or button)
            if (this.inputs.length > 0) {
                this.inputs[0].focus();
                this.inputs[0].select();
            }
            else {
                buttonMap.forEach((value, index) => {
                    if (value.index === 0) {
                        buttonBar.buttons[index].focus();
                    }
                });
            }
        });
    }
    applyStyles() {
        const style = this.options.dialogStyles;
        const fgColor = style.dialogForeground;
        const bgColor = style.dialogBackground;
        const shadowColor = style.dialogShadow ? `0 0px 8px ${style.dialogShadow}` : '';
        const border = style.dialogBorder ? `1px solid ${style.dialogBorder}` : '';
        const linkFgColor = style.textLinkForeground;
        this.shadowElement.style.boxShadow = shadowColor;
        this.element.style.color = fgColor ?? '';
        this.element.style.backgroundColor = bgColor ?? '';
        this.element.style.border = border;
        // TODO fix
        // if (fgColor && bgColor) {
        // 	const messageDetailColor = fgColor.transparent(.9);
        // 	this.messageDetailElement.style.mixBlendMode = messageDetailColor.makeOpaque(bgColor).toString();
        // }
        if (linkFgColor) {
            for (const el of this.messageContainer.getElementsByTagName('a')) {
                el.style.color = linkFgColor;
            }
        }
        let color;
        switch (this.options.type) {
            case 'none':
                break;
            case 'error':
                color = style.errorIconForeground;
                break;
            case 'warning':
                color = style.warningIconForeground;
                break;
            default:
                color = style.infoIconForeground;
                break;
        }
        if (color) {
            this.iconElement.style.color = color;
        }
    }
    dispose() {
        super.dispose();
        if (this.modalElement) {
            this.modalElement.remove();
            this.modalElement = undefined;
        }
        if (this.focusToReturn && isAncestor(this.focusToReturn, this.container.ownerDocument.body)) {
            this.focusToReturn.focus();
            this.focusToReturn = undefined;
        }
    }
    rearrangeButtons(buttons, cancelId) {
        // Maps each button to its current label and old index
        // so that when we move them around it's not a problem
        const buttonMap = buttons.map((label, index) => ({ label, index }));
        if (buttons.length < 2) {
            return buttonMap; // only need to rearrange if there are 2+ buttons
        }
        if (isMacintosh || isLinux) {
            // Linux: the GNOME HIG (https://developer.gnome.org/hig/patterns/feedback/dialogs.html?highlight=dialog)
            // recommend the following:
            // "Always ensure that the cancel button appears first, before the affirmative button. In left-to-right
            //  locales, this is on the left. This button order ensures that users become aware of, and are reminded
            //  of, the ability to cancel prior to encountering the affirmative button."
            // macOS: the HIG (https://developer.apple.com/design/human-interface-guidelines/components/presentation/alerts)
            // recommend the following:
            // "Place buttons where people expect. In general, place the button people are most likely to choose on the trailing side in a
            //  row of buttons or at the top in a stack of buttons. Always place the default button on the trailing side of a row or at the
            //  top of a stack. Cancel buttons are typically on the leading side of a row or at the bottom of a stack."
            if (typeof cancelId === 'number' && buttonMap[cancelId]) {
                const cancelButton = buttonMap.splice(cancelId, 1)[0];
                buttonMap.splice(1, 0, cancelButton);
            }
            buttonMap.reverse();
        }
        else if (isWindows) {
            // Windows: the HIG (https://learn.microsoft.com/en-us/windows/win32/uxguide/win-dialog-box)
            // recommend the following:
            // "One of the following sets of concise commands: Yes/No, Yes/No/Cancel, [Do it]/Cancel,
            //  [Do it]/[Don't do it], [Do it]/[Don't do it]/Cancel."
            if (typeof cancelId === 'number' && buttonMap[cancelId]) {
                const cancelButton = buttonMap.splice(cancelId, 1)[0];
                buttonMap.push(cancelButton);
            }
        }
        return buttonMap;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlhbG9nLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvYnJvd3Nlci91aS9kaWFsb2cvZGlhbG9nLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sY0FBYyxDQUFDO0FBQ3RCLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUsQ0FBQyxFQUFFLHFCQUFxQixFQUFFLFNBQVMsRUFBRSxXQUFXLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsZUFBZSxFQUFFLFVBQVUsRUFBRSxJQUFJLEVBQUUsTUFBTSxjQUFjLENBQUM7QUFDL0ksT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFDL0QsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQ3RELE9BQU8sRUFBRSxTQUFTLEVBQUUscUJBQXFCLEVBQUUsa0JBQWtCLEVBQXNELE1BQU0scUJBQXFCLENBQUM7QUFDL0ksT0FBTyxFQUFtQixRQUFRLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUNoRSxPQUFPLEVBQW1CLFFBQVEsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBQ3BFLE9BQU8sRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDOUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ3RELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUV6RCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUNoRSxPQUFPLEVBQUUsVUFBVSxFQUFFLFlBQVksRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQ3hFLE9BQU8sRUFBRSxPQUFPLEVB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