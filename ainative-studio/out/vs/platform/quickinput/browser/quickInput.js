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
import * as dom from '../../../base/browser/dom.js';
import { StandardKeyboardEvent } from '../../../base/browser/keyboardEvent.js';
import { Toggle } from '../../../base/browser/ui/toggle/toggle.js';
import { equals } from '../../../base/common/arrays.js';
import { TimeoutTimer } from '../../../base/common/async.js';
import { Codicon } from '../../../base/common/codicons.js';
import { Emitter, EventBufferer } from '../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../base/common/lifecycle.js';
import { isIOS } from '../../../base/common/platform.js';
import Severity from '../../../base/common/severity.js';
import { ThemeIcon } from '../../../base/common/themables.js';
import './media/quickInput.css';
import { localize } from '../../../nls.js';
import { ItemActivation, NO_KEY_MODS, QuickInputButtonLocation, QuickInputHideReason, QuickPickFocus } from '../common/quickInput.js';
import { quickInputButtonToAction, renderQuickInputDescription } from './quickInputUtils.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { IHoverService, WorkbenchHoverDelegate } from '../../hover/browser/hover.js';
import { ContextKeyExpr, RawContextKey } from '../../contextkey/common/contextkey.js';
export const inQuickInputContextKeyValue = 'inQuickInput';
export const InQuickInputContextKey = new RawContextKey(inQuickInputContextKeyValue, false, localize('inQuickInput', "Whether keyboard focus is inside the quick input control"));
export const inQuickInputContext = ContextKeyExpr.has(inQuickInputContextKeyValue);
export const quickInputAlignmentContextKeyValue = 'quickInputAlignment';
export const QuickInputAlignmentContextKey = new RawContextKey(quickInputAlignmentContextKeyValue, 'top', localize('quickInputAlignment', "The alignment of the quick input"));
export const quickInputTypeContextKeyValue = 'quickInputType';
export const QuickInputTypeContextKey = new RawContextKey(quickInputTypeContextKeyValue, undefined, localize('quickInputType', "The type of the currently visible quick input"));
export const endOfQuickInputBoxContextKeyValue = 'cursorAtEndOfQuickInputBox';
export const EndOfQuickInputBoxContextKey = new RawContextKey(endOfQuickInputBoxContextKeyValue, false, localize('cursorAtEndOfQuickInputBox', "Whether the cursor in the quick input is at the end of the input box"));
export const endOfQuickInputBoxContext = ContextKeyExpr.has(endOfQuickInputBoxContextKeyValue);
export const backButton = {
    iconClass: ThemeIcon.asClassName(Codicon.quickInputBack),
    tooltip: localize('quickInput.back', "Back"),
    handle: -1 // TODO
};
class QuickInput extends Disposable {
    static { this.noPromptMessage = localize('inputModeEntry', "Press 'Enter' to confirm your input or 'Escape' to cancel"); }
    constructor(ui) {
        super();
        this.ui = ui;
        this._widgetUpdated = false;
        this.visible = false;
        this._enabled = true;
        this._busy = false;
        this._ignoreFocusOut = false;
        this._leftButtons = [];
        this._rightButtons = [];
        this._inlineButtons = [];
        this.buttonsUpdated = false;
        this._toggles = [];
        this.togglesUpdated = false;
        this.noValidationMessage = QuickInput.noPromptMessage;
        this._severity = Severity.Ignore;
        this.onDidTriggerButtonEmitter = this._register(new Emitter());
        this.onDidHideEmitter = this._register(new Emitter());
        this.onWillHideEmitter = this._register(new Emitter());
        this.onDisposeEmitter = this._register(new Emitter());
        this.visibleDisposables = this._register(new DisposableStore());
        this.onDidTriggerButton = this.onDidTriggerButtonEmitter.event;
        this.onDidHide = this.onDidHideEmitter.event;
        this.onWillHide = this.onWillHideEmitter.event;
        this.onDispose = this.onDisposeEmitter.event;
    }
    get title() {
        return this._title;
    }
    set title(title) {
        this._title = title;
        this.update();
    }
    get description() {
        return this._description;
    }
    set description(description) {
        this._description = description;
        this.update();
    }
    get widget() {
        return this._widget;
    }
    set widget(widget) {
        if (!(dom.isHTMLElement(widget))) {
            return;
        }
        if (this._widget !== widget) {
            this._widget = widget;
            this._widgetUpdated = true;
            this.update();
        }
    }
    get step() {
        return this._steps;
    }
    set step(step) {
        this._steps = step;
        this.update();
    }
    get totalSteps() {
        return this._totalSteps;
    }
    set totalSteps(totalSteps) {
        this._totalSteps = totalSteps;
        this.update();
    }
    get enabled() {
        return this._enabled;
    }
    set enabled(enabled) {
        this._enabled = enabled;
        this.update();
    }
    get contextKey() {
        return this._contextKey;
    }
    set contextKey(contextKey) {
        this._contextKey = contextKey;
        this.update();
    }
    get busy() {
        return this._busy;
    }
    set busy(busy) {
        this._busy = busy;
        this.update();
    }
    get ignoreFocusOut() {
        return this._ignoreFocusOut;
    }
    set ignoreFocusOut(ignoreFocusOut) {
        const shouldUpdate = this._ignoreFocusOut !== ignoreFocusOut && !isIOS;
        this._ignoreFocusOut = ignoreFocusOut && !isIOS;
        if (shouldUpdate) {
            this.update();
        }
    }
    get titleButtons() {
        return this._leftButtons.length
            ? [...this._leftButtons, this._rightButtons]
            : this._rightButtons;
    }
    get buttons() {
        return [
            ...this._leftButtons,
            ...this._rightButtons,
            ...this._inlineButtons
        ];
    }
    set buttons(buttons) {
        this._leftButtons = buttons.filter(b => b === backButton);
        this._rightButtons = buttons.filter(b => b !== backButton && b.location !== QuickInputButtonLocation.Inline);
        this._inlineButtons = buttons.filter(b => b.location === QuickInputButtonLocation.Inline);
        this.buttonsUpdated = true;
        this.update();
    }
    get toggles() {
        return this._toggles;
    }
    set toggles(toggles) {
        this._toggles = toggles ?? [];
        this.togglesUpdated = true;
        this.update();
    }
    get validationMessage() {
        return this._validationMessage;
    }
    set validationMessage(validationMessage) {
        this._validationMessage = validationMessage;
        this.update();
    }
    get severity() {
        return this._severity;
    }
    set severity(severity) {
        this._severity = severity;
        this.update();
    }
    show() {
        if (this.visible) {
            return;
        }
        this.visibleDisposables.add(this.ui.onDidTriggerButton(button => {
            if (this.buttons.indexOf(button) !== -1) {
                this.onDidTriggerButtonEmitter.fire(button);
            }
        }));
        this.ui.show(this);
        // update properties in the controller that get reset in the ui.show() call
        this.visible = true;
        // This ensures the message/prompt gets rendered
        this._lastValidationMessage = undefined;
        // This ensures the input box has the right severity applied
        this._lastSeverity = undefined;
        if (this.buttons.length) {
            // if there are buttons, the ui.show() clears them out of the UI so we should
            // rerender them.
            this.buttonsUpdated = true;
        }
        if (this.toggles.length) {
            // if there are toggles, the ui.show() clears them out of the UI so we should
            // rerender them.
            this.togglesUpdated = true;
        }
        this.update();
    }
    hide() {
        if (!this.visible) {
            return;
        }
        this.ui.hide();
    }
    didHide(reason = QuickInputHideReason.Other) {
        this.visible = false;
        this.visibleDisposables.clear();
        this.onDidHideEmitter.fire({ reason });
    }
    willHide(reason = QuickInputHideReason.Other) {
        this.onWillHideEmitter.fire({ reason });
    }
    update() {
        if (!this.visible) {
            return;
        }
        const title = this.getTitle();
        if (title && this.ui.title.textContent !== title) {
            this.ui.title.textContent = title;
        }
        else if (!title && this.ui.title.innerHTML !== '&nbsp;') {
            this.ui.title.innerText = '\u00a0';
        }
        const description = this.getDescription();
        if (this.ui.description1.textContent !== description) {
            this.ui.description1.textContent = description;
        }
        if (this.ui.description2.textContent !== description) {
            this.ui.description2.textContent = description;
        }
        if (this._widgetUpdated) {
            this._widgetUpdated = false;
            if (this._widget) {
                dom.reset(this.ui.widget, this._widget);
            }
            else {
                dom.reset(this.ui.widget);
            }
        }
        if (this.busy && !this.busyDelay) {
            this.busyDelay = new TimeoutTimer();
            this.busyDelay.setIfNotSet(() => {
                if (this.visible) {
                    this.ui.progressBar.infinite();
                }
            }, 800);
        }
        if (!this.busy && this.busyDelay) {
            this.ui.progressBar.stop();
            this.busyDelay.cancel();
            this.busyDelay = undefined;
        }
        if (this.buttonsUpdated) {
            this.buttonsUpdated = false;
            this.ui.leftActionBar.clear();
            const leftButtons = this._leftButtons
                .map((button, index) => quickInputButtonToAction(button, `id-${index}`, async () => this.onDidTriggerButtonEmitter.fire(button)));
            this.ui.leftActionBar.push(leftButtons, { icon: true, label: false });
            this.ui.rightActionBar.clear();
            const rightButtons = this._rightButtons
                .map((button, index) => quickInputButtonToAction(button, `id-${index}`, async () => this.onDidTriggerButtonEmitter.fire(button)));
            this.ui.rightActionBar.push(rightButtons, { icon: true, label: false });
            this.ui.inlineActionBar.clear();
            const inlineButtons = this._inlineButtons
                .map((button, index) => quickInputButtonToAction(button, `id-${index}`, async () => this.onDidTriggerButtonEmitter.fire(button)));
            this.ui.inlineActionBar.push(inlineButtons, { icon: true, label: false });
        }
        if (this.togglesUpdated) {
            this.togglesUpdated = false;
            // HACK: Filter out toggles here that are not concrete Toggle objects. This is to workaround
            // a layering issue as quick input's interface is in common but Toggle is in browser and
            // it requires a HTMLElement on its interface
            const concreteToggles = this.toggles?.filter(opts => opts instanceof Toggle) ?? [];
            this.ui.inputBox.toggles = concreteToggles;
        }
        this.ui.ignoreFocusOut = this.ignoreFocusOut;
        this.ui.setEnabled(this.enabled);
        this.ui.setContextKey(this.contextKey);
        const validationMessage = this.validationMessage || this.noValidationMessage;
        if (this._lastValidationMessage !== validationMessage) {
            this._lastValidationMessage = validationMessage;
            dom.reset(this.ui.message);
            renderQuickInputDescription(validationMessage, this.ui.message, {
                callback: (content) => {
                    this.ui.linkOpenerDelegate(content);
                },
                disposables: this.visibleDisposables,
            });
        }
        if (this._lastSeverity !== this.severity) {
            this._lastSeverity = this.severity;
            this.showMessageDecoration(this.severity);
        }
    }
    getTitle() {
        if (this.title && this.step) {
            return `${this.title} (${this.getSteps()})`;
        }
        if (this.title) {
            return this.title;
        }
        if (this.step) {
            return this.getSteps();
        }
        return '';
    }
    getDescription() {
        return this.description || '';
    }
    getSteps() {
        if (this.step && this.totalSteps) {
            return localize('quickInput.steps', "{0}/{1}", this.step, this.totalSteps);
        }
        if (this.step) {
            return String(this.step);
        }
        return '';
    }
    showMessageDecoration(severity) {
        this.ui.inputBox.showDecoration(severity);
        if (severity !== Severity.Ignore) {
            const styles = this.ui.inputBox.stylesForType(severity);
            this.ui.message.style.color = styles.foreground ? `${styles.foreground}` : '';
            this.ui.message.style.backgroundColor = styles.background ? `${styles.background}` : '';
            this.ui.message.style.border = styles.border ? `1px solid ${styles.border}` : '';
            this.ui.message.style.marginBottom = '-2px';
        }
        else {
            this.ui.message.style.color = '';
            this.ui.message.style.backgroundColor = '';
            this.ui.message.style.border = '';
            this.ui.message.style.marginBottom = '';
        }
    }
    dispose() {
        this.hide();
        this.onDisposeEmitter.fire();
        super.dispose();
    }
}
export class QuickPick extends QuickInput {
    constructor() {
        super(...arguments);
        this._value = '';
        this.onDidChangeValueEmitter = this._register(new Emitter());
        this.onWillAcceptEmitter = this._register(new Emitter());
        this.onDidAcceptEmitter = this._register(new Emitter());
        this.onDidCustomEmitter = this._register(new Emitter());
        this._items = [];
        this.itemsUpdated = false;
        this._canSelectMany = false;
        this._canAcceptInBackground = false;
        this._matchOnDescription = false;
        this._matchOnDetail = false;
        this._matchOnLabel = true;
        this._matchOnLabelMode = 'fuzzy';
        this._sortByLabel = true;
        this._keepScrollPosition = false;
        this._itemActivation = ItemActivation.FIRST;
        this._activeItems = [];
        this.activeItemsUpdated = false;
        this.activeItemsToConfirm = [];
        this.onDidChangeActiveEmitter = this._register(new Emitter());
        this._selectedItems = [];
        this.selectedItemsUpdated = false;
        this.selectedItemsToConfirm = [];
        this.onDidChangeSelectionEmitter = this._register(new Emitter());
        this.onDidTriggerItemButtonEmitter = this._register(new Emitter());
        this.onDidTriggerSeparatorButtonEmitter = this._register(new Emitter());
        this.valueSelectionUpdated = true;
        this._ok = 'default';
        this._customButton = false;
        this._focusEventBufferer = new EventBufferer();
        this.type = "quickPick" /* QuickInputType.QuickPick */;
        this.filterValue = (value) => value;
        this.onDidChangeValue = this.onDidChangeValueEmitter.event;
        this.onWillAccept = this.onWillAcceptEmitter.event;
        this.onDidAccept = this.onDidAcceptEmitter.event;
        this.onDidCustom = this.onDidCustomEmitter.event;
        this.onDidChangeActive = this.onDidChangeActiveEmitter.event;
        this.onDidChangeSelection = this.onDidChangeSelectionEmitter.event;
        this.onDidTriggerItemButton = this.onDidTriggerItemButtonEmitter.event;
        this.onDidTriggerSeparatorButton = this.onDidTriggerSeparatorButtonEmitter.event;
    }
    static { this.DEFAULT_ARIA_LABEL = localize('quickInputBox.ariaLabel', "Type to narrow down results."); }
    get quickNavigate() {
        return this._quickNavigate;
    }
    set quickNavigate(quickNavigate) {
        this._quickNavigate = quickNavigate;
        this.update();
    }
    get value() {
        return this._value;
    }
    set value(value) {
        this.doSetValue(value);
    }
    doSetValue(value, skipUpdate) {
        if (this._value !== value) {
            this._value = value;
            if (!skipUpdate) {
                this.update();
            }
            if (this.visible) {
                const didFilter = this.ui.list.filter(this.filterValue(this._value));
                if (didFilter) {
                    this.trySelectFirst();
                }
            }
            this.onDidChangeValueEmitter.fire(this._value);
        }
    }
    set ariaLabel(ariaLabel) {
        this._ariaLabel = ariaLabel;
        this.update();
    }
    get ariaLabel() {
        return this._ariaLabel;
    }
    get placeholder() {
        return this._placeholder;
    }
    set placeholder(placeholder) {
        this._placeholder = placeholder;
        this.update();
    }
    get items() {
        return this._items;
    }
    get scrollTop() {
        return this.ui.list.scrollTop;
    }
    set scrollTop(scrollTop) {
        this.ui.list.scrollTop = scrollTop;
    }
    set items(items) {
        this._items = items;
        this.itemsUpdated = true;
        this.update();
    }
    get canSelectMany() {
        return this._canSelectMany;
    }
    set canSelectMany(canSelectMany) {
        this._canSelectMany = canSelectMany;
        this.update();
    }
    get canAcceptInBackground() {
        return this._canAcceptInBackground;
    }
    set canAcceptInBackground(canAcceptInBackground) {
        this._canAcceptInBackground = canAcceptInBackground;
    }
    get matchOnDescription() {
        return this._matchOnDescription;
    }
    set matchOnDescription(matchOnDescription) {
        this._matchOnDescription = matchOnDescription;
        this.update();
    }
    get matchOnDetail() {
        return this._matchOnDetail;
    }
    set matchOnDetail(matchOnDetail) {
        this._matchOnDetail = matchOnDetail;
        this.update();
    }
    get matchOnLabel() {
        return this._matchOnLabel;
    }
    set matchOnLabel(matchOnLabel) {
        this._matchOnLabel = matchOnLabel;
        this.update();
    }
    get matchOnLabelMode() {
        return this._matchOnLabelMode;
    }
    set matchOnLabelMode(matchOnLabelMode) {
        this._matchOnLabelMode = matchOnLabelMode;
        this.update();
    }
    get sortByLabel() {
        return this._sortByLabel;
    }
    set sortByLabel(sortByLabel) {
        this._sortByLabel = sortByLabel;
        this.update();
    }
    get keepScrollPosition() {
        return this._keepScrollPosition;
    }
    set keepScrollPosition(keepScrollPosition) {
        this._keepScrollPosition = keepScrollPosition;
    }
    get itemActivation() {
        return this._itemActivation;
    }
    set itemActivation(itemActivation) {
        this._itemActivation = itemActivation;
    }
    get activeItems() {
        return this._activeItems;
    }
    set activeItems(activeItems) {
        this._activeItems = activeItems;
        this.activeItemsUpdated = true;
        this.update();
    }
    get selectedItems() {
        return this._selectedItems;
    }
    set selectedItems(selectedItems) {
        this._selectedItems = selectedItems;
        this.selectedItemsUpdated = true;
        this.update();
    }
    get keyMods() {
        if (this._quickNavigate) {
            // Disable keyMods when quick navigate is enabled
            // because in this model the interaction is purely
            // keyboard driven and Ctrl/Alt are typically
            // pressed and hold during this interaction.
            return NO_KEY_MODS;
        }
        return this.ui.keyMods;
    }
    get valueSelection() {
        const selection = this.ui.inputBox.getSelection();
        if (!selection) {
            return undefined;
        }
        return [selection.start, selection.end];
    }
    set valueSelection(valueSelection) {
        this._valueSelection = valueSelection;
        this.valueSelectionUpdated = true;
        this.update();
    }
    get customButton() {
        return this._customButton;
    }
    set customButton(showCustomButton) {
        this._customButton = showCustomButton;
        this.update();
    }
    get customLabel() {
        return this._customButtonLabel;
    }
    set customLabel(label) {
        this._customButtonLabel = label;
        this.update();
    }
    get customHover() {
        return this._customButtonHover;
    }
    set customHover(hover) {
        this._customButtonHover = hover;
        this.update();
    }
    get ok() {
        return this._ok;
    }
    set ok(showOkButton) {
        this._ok = showOkButton;
        this.update();
    }
    get okLabel() {
        return this._okLabel ?? localize('ok', "OK");
    }
    set okLabel(okLabel) {
        this._okLabel = okLabel;
        this.update();
    }
    inputHasFocus() {
        return this.visible ? this.ui.inputBox.hasFocus() : false;
    }
    focusOnInput() {
        this.ui.inputBox.setFocus();
    }
    get hideInput() {
        return !!this._hideInput;
    }
    set hideInput(hideInput) {
        this._hideInput = hideInput;
        this.update();
    }
    get hideCountBadge() {
        return !!this._hideCountBadge;
    }
    set hideCountBadge(hideCountBadge) {
        this._hideCountBadge = hideCountBadge;
        this.update();
    }
    get hideCheckAll() {
        return !!this._hideCheckAll;
    }
    set hideCheckAll(hideCheckAll) {
        this._hideCheckAll = hideCheckAll;
        this.update();
    }
    trySelectFirst() {
        if (!this.canSelectMany) {
            this.ui.list.focus(QuickPickFocus.First);
        }
    }
    show() {
        if (!this.visible) {
            this.visibleDisposables.add(this.ui.inputBox.onDidChange(value => {
                this.doSetValue(value, true /* skip update since this originates from the UI */);
            }));
            this.visibleDisposables.add(this.ui.onDidAccept(() => {
                if (this.canSelectMany) {
                    // if there are no checked elements, it means that an onDidChangeSelection never fired to overwrite
                    // `_selectedItems`. In that case, we should emit one with an empty array to ensure that
                    // `.selectedItems` is up to date.
                    if (!this.ui.list.getCheckedElements().length) {
                        this._selectedItems = [];
                        this.onDidChangeSelectionEmitter.fire(this.selectedItems);
                    }
                }
                else if (this.activeItems[0]) {
                    // For single-select, we set `selectedItems` to the item that was accepted.
                    this._selectedItems = [this.activeItems[0]];
                    this.onDidChangeSelectionEmitter.fire(this.selectedItems);
                }
                this.handleAccept(false);
            }));
            this.visibleDisposables.add(this.ui.onDidCustom(() => {
                this.onDidCustomEmitter.fire();
            }));
            this.visibleDisposables.add(this._focusEventBufferer.wrapEvent(this.ui.list.onDidChangeFocus, 
            // Only fire the last event
            (_, e) => e)(focusedItems => {
                if (this.activeItemsUpdated) {
                    return; // Expect another event.
                }
                if (this.activeItemsToConfirm !== this._activeItems && equals(focusedItems, this._activeItems, (a, b) => a === b)) {
                    return;
                }
                this._activeItems = focusedItems;
                this.onDidChangeActiveEmitter.fire(focusedItems);
            }));
            this.visibleDisposables.add(this.ui.list.onDidChangeSelection(({ items: selectedItems, event }) => {
                if (this.canSelectMany && !selectedItems.some(i => i.pickable === false)) {
                    if (selectedItems.length) {
                        this.ui.list.setSelectedElements([]);
                    }
                    return;
                }
                if (this.selectedItemsToConfirm !== this._selectedItems && equals(selectedItems, this._selectedItems, (a, b) => a === b)) {
                    return;
                }
                this._selectedItems = selectedItems;
                this.onDidChangeSelectionEmitter.fire(selectedItems);
                if (selectedItems.length) {
                    this.handleAccept(dom.isMouseEvent(event) && event.button === 1 /* mouse middle click */);
                }
            }));
            this.visibleDisposables.add(this.ui.list.onChangedCheckedElements(checkedItems => {
                if (!this.canSelectMany || !this.visible) {
                    return;
                }
                if (this.selectedItemsToConfirm !== this._selectedItems && equals(checkedItems, this._selectedItems, (a, b) => a === b)) {
                    return;
                }
                this._selectedItems = checkedItems;
                this.onDidChangeSelectionEmitter.fire(checkedItems);
            }));
            this.visibleDisposables.add(this.ui.list.onButtonTriggered(event => this.onDidTriggerItemButtonEmitter.fire(event)));
            this.visibleDisposables.add(this.ui.list.onSeparatorButtonTriggered(event => this.onDidTriggerSeparatorButtonEmitter.fire(event)));
            this.visibleDisposables.add(this.registerQuickNavigation());
            this.valueSelectionUpdated = true;
        }
        super.show(); // TODO: Why have show() bubble up while update() trickles down?
    }
    handleAccept(inBackground) {
        // Figure out veto via `onWillAccept` event
        let veto = false;
        this.onWillAcceptEmitter.fire({ veto: () => veto = true });
        // Continue with `onDidAccept` if no veto
        if (!veto) {
            this.onDidAcceptEmitter.fire({ inBackground });
        }
    }
    registerQuickNavigation() {
        return dom.addDisposableListener(this.ui.container, dom.EventType.KEY_UP, e => {
            if (this.canSelectMany || !this._quickNavigate) {
                return;
            }
            const keyboardEvent = new StandardKeyboardEvent(e);
            const keyCode = keyboardEvent.keyCode;
            // Select element when keys are pressed that signal it
            const quickNavKeys = this._quickNavigate.keybindings;
            const wasTriggerKeyPressed = quickNavKeys.some(k => {
                const chords = k.getChords();
                if (chords.length > 1) {
                    return false;
                }
                if (chords[0].shiftKey && keyCode === 4 /* KeyCode.Shift */) {
                    if (keyboardEvent.ctrlKey || keyboardEvent.altKey || keyboardEvent.metaKey) {
                        return false; // this is an optimistic check for the shift key being used to navigate back in quick input
                    }
                    return true;
                }
                if (chords[0].altKey && keyCode === 6 /* KeyCode.Alt */) {
                    return true;
                }
                if (chords[0].ctrlKey && keyCode === 5 /* KeyCode.Ctrl */) {
                    return true;
                }
                if (chords[0].metaKey && keyCode === 57 /* KeyCode.Meta */) {
                    return true;
                }
                return false;
            });
            if (wasTriggerKeyPressed) {
                if (this.activeItems[0]) {
                    this._selectedItems = [this.activeItems[0]];
                    this.onDidChangeSelectionEmitter.fire(this.selectedItems);
                    this.handleAccept(false);
                }
                // Unset quick navigate after press. It is only valid once
                // and should not result in any behaviour change afterwards
                // if the picker remains open because there was no active item
                this._quickNavigate = undefined;
            }
        });
    }
    update() {
        if (!this.visible) {
            return;
        }
        // store the scrollTop before it is reset
        const scrollTopBefore = this.keepScrollPosition ? this.scrollTop : 0;
        const hasDescription = !!this.description;
        const visibilities = {
            title: !!this.title || !!this.step || !!this.titleButtons.length,
            description: hasDescription,
            checkAll: this.canSelectMany && !this._hideCheckAll,
            checkBox: this.canSelectMany,
            inputBox: !this._hideInput,
            progressBar: !this._hideInput || hasDescription,
            visibleCount: true,
            count: this.canSelectMany && !this._hideCountBadge,
            ok: this.ok === 'default' ? this.canSelectMany : this.ok,
            list: true,
            message: !!this.validationMessage,
            customButton: this.customButton
        };
        this.ui.setVisibilities(visibilities);
        super.update();
        if (this.ui.inputBox.value !== this.value) {
            this.ui.inputBox.value = this.value;
        }
        if (this.valueSelectionUpdated) {
            this.valueSelectionUpdated = false;
            this.ui.inputBox.select(this._valueSelection && { start: this._valueSelection[0], end: this._valueSelection[1] });
        }
        if (this.ui.inputBox.placeholder !== (this.placeholder || '')) {
            this.ui.inputBox.placeholder = (this.placeholder || '');
        }
        let ariaLabel = this.ariaLabel;
        // Only set aria label to the input box placeholder if we actually have an input box.
        if (!ariaLabel && visibilities.inputBox) {
            ariaLabel = this.placeholder || QuickPick.DEFAULT_ARIA_LABEL;
            // If we have a title, include it in the aria label.
            if (this.title) {
                ariaLabel += ` - ${this.title}`;
            }
        }
        if (this.ui.list.ariaLabel !== ariaLabel) {
            this.ui.list.ariaLabel = ariaLabel ?? null;
        }
        this.ui.list.matchOnDescription = this.matchOnDescription;
        this.ui.list.matchOnDetail = this.matchOnDetail;
        this.ui.list.matchOnLabel = this.matchOnLabel;
        this.ui.list.matchOnLabelMode = this.matchOnLabelMode;
        this.ui.list.sortByLabel = this.sortByLabel;
        if (this.itemsUpdated) {
            this.itemsUpdated = false;
            this._focusEventBufferer.bufferEvents(() => {
                this.ui.list.setElements(this.items);
                // We want focus to exist in the list if there are items so that space can be used to toggle
                this.ui.list.shouldLoop = !this.canSelectMany;
                this.ui.list.filter(this.filterValue(this.ui.inputBox.value));
                switch (this._itemActivation) {
                    case ItemActivation.NONE:
                        this._itemActivation = ItemActivation.FIRST; // only valid once, then unset
                        break;
                    case ItemActivation.SECOND:
                        this.ui.list.focus(QuickPickFocus.Second);
                        this._itemActivation = ItemActivation.FIRST; // only valid once, then unset
                        break;
                    case ItemActivation.LAST:
                        this.ui.list.focus(QuickPickFocus.Last);
                        this._itemActivation = ItemActivation.FIRST; // only valid once, then unset
                        break;
                    default:
                        this.trySelectFirst();
                        break;
                }
            });
        }
        if (this.ui.container.classList.contains('show-checkboxes') !== !!this.canSelectMany) {
            if (this.canSelectMany) {
                this.ui.list.clearFocus();
            }
            else {
                this.trySelectFirst();
            }
        }
        if (this.activeItemsUpdated) {
            this.activeItemsUpdated = false;
            this.activeItemsToConfirm = this._activeItems;
            this.ui.list.setFocusedElements(this.activeItems);
            if (this.activeItemsToConfirm === this._activeItems) {
                this.activeItemsToConfirm = null;
            }
        }
        if (this.selectedItemsUpdated) {
            this.selectedItemsUpdated = false;
            this.selectedItemsToConfirm = this._selectedItems;
            if (this.canSelectMany) {
                this.ui.list.setCheckedElements(this.selectedItems);
            }
            else {
                this.ui.list.setSelectedElements(this.selectedItems);
            }
            if (this.selectedItemsToConfirm === this._selectedItems) {
                this.selectedItemsToConfirm = null;
            }
        }
        this.ui.ok.label = this.okLabel || '';
        this.ui.customButton.label = this.customLabel || '';
        this.ui.customButton.element.title = this.customHover || '';
        if (!visibilities.inputBox) {
            // we need to move focus into the tree to detect keybindings
            // properly when the input box is not visible (quick nav)
            this.ui.list.domFocus();
            // Focus the first element in the list if multiselect is enabled
            if (this.canSelectMany) {
                this.ui.list.focus(QuickPickFocus.First);
            }
        }
        // Set the scroll position to what it was before updating the items
        if (this.keepScrollPosition) {
            this.scrollTop = scrollTopBefore;
        }
    }
    focus(focus) {
        this.ui.list.focus(focus);
        // To allow things like space to check/uncheck items
        if (this.canSelectMany) {
            this.ui.list.domFocus();
        }
    }
    accept(inBackground) {
        if (inBackground && !this._canAcceptInBackground) {
            return; // needs to be enabled
        }
        if (this.activeItems[0]) {
            this._selectedItems = [this.activeItems[0]];
            this.onDidChangeSelectionEmitter.fire(this.selectedItems);
            this.handleAccept(inBackground ?? false);
        }
    }
}
export class InputBox extends QuickInput {
    constructor() {
        super(...arguments);
        this._value = '';
        this.valueSelectionUpdated = true;
        this._password = false;
        this.onDidValueChangeEmitter = this._register(new Emitter());
        this.onDidAcceptEmitter = this._register(new Emitter());
        this.type = "inputBox" /* QuickInputType.InputBox */;
        this.onDidChangeValue = this.onDidValueChangeEmitter.event;
        this.onDidAccept = this.onDidAcceptEmitter.event;
    }
    get value() {
        return this._value;
    }
    set value(value) {
        this._value = value || '';
        this.update();
    }
    get valueSelection() {
        const selection = this.ui.inputBox.getSelection();
        if (!selection) {
            return undefined;
        }
        return [selection.start, selection.end];
    }
    set valueSelection(valueSelection) {
        this._valueSelection = valueSelection;
        this.valueSelectionUpdated = true;
        this.update();
    }
    get placeholder() {
        return this._placeholder;
    }
    set placeholder(placeholder) {
        this._placeholder = placeholder;
        this.update();
    }
    get password() {
        return this._password;
    }
    set password(password) {
        this._password = password;
        this.update();
    }
    get prompt() {
        return this._prompt;
    }
    set prompt(prompt) {
        this._prompt = prompt;
        this.noValidationMessage = prompt
            ? localize('inputModeEntryDescription', "{0} (Press 'Enter' to confirm or 'Escape' to cancel)", prompt)
            : QuickInput.noPromptMessage;
        this.update();
    }
    show() {
        if (!this.visible) {
            this.visibleDisposables.add(this.ui.inputBox.onDidChange(value => {
                if (value === this.value) {
                    return;
                }
                this._value = value;
                this.onDidValueChangeEmitter.fire(value);
            }));
            this.visibleDisposables.add(this.ui.onDidAccept(() => this.onDidAcceptEmitter.fire()));
            this.valueSelectionUpdated = true;
        }
        super.show();
    }
    update() {
        if (!this.visible) {
            return;
        }
        this.ui.container.classList.remove('hidden-input');
        const visibilities = {
            title: !!this.title || !!this.step || !!this.titleButtons.length,
            description: !!this.description || !!this.step,
            inputBox: true,
            message: true,
            progressBar: true
        };
        this.ui.setVisibilities(visibilities);
        super.update();
        if (this.ui.inputBox.value !== this.value) {
            this.ui.inputBox.value = this.value;
        }
        if (this.valueSelectionUpdated) {
            this.valueSelectionUpdated = false;
            this.ui.inputBox.select(this._valueSelection && { start: this._valueSelection[0], end: this._valueSelection[1] });
        }
        if (this.ui.inputBox.placeholder !== (this.placeholder || '')) {
            this.ui.inputBox.placeholder = (this.placeholder || '');
        }
        if (this.ui.inputBox.password !== this.password) {
            this.ui.inputBox.password = this.password;
        }
    }
}
export class QuickWidget extends QuickInput {
    constructor() {
        super(...arguments);
        this.type = "quickWidget" /* QuickInputType.QuickWidget */;
    }
    update() {
        if (!this.visible) {
            return;
        }
        const visibilities = {
            title: !!this.title || !!this.step || !!this.titleButtons.length,
            description: !!this.description || !!this.step
        };
        this.ui.setVisibilities(visibilities);
        super.update();
    }
}
let QuickInputHoverDelegate = class QuickInputHoverDelegate extends WorkbenchHoverDelegate {
    constructor(configurationService, hoverService) {
        super('element', undefined, (options) => this.getOverrideOptions(options), configurationService, hoverService);
    }
    getOverrideOptions(options) {
        // Only show the hover hint if the content is of a decent size
        const showHoverHint = (dom.isHTMLElement(options.content)
            ? options.content.textContent ?? ''
            : typeof options.content === 'string'
                ? options.content
                : options.content.value).includes('\n');
        return {
            persistence: {
                hideOnKeyDown: false,
            },
            appearance: {
                showHoverHint,
                skipFadeInAnimation: true,
            },
        };
    }
};
QuickInputHoverDelegate = __decorate([
    __param(0, IConfigurationService),
    __param(1, IHoverService)
], QuickInputHoverDelegate);
export { QuickInputHoverDelegate };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVpY2tJbnB1dC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9xdWlja2lucHV0L2Jyb3dzZXIvcXVpY2tJbnB1dC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLDhCQUE4QixDQUFDO0FBQ3BELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBUy9FLE9BQU8sRUFBaUIsTUFBTSxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDbEYsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3hELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUM3RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDM0QsT0FBTyxFQUFFLE9BQU8sRUFBUyxhQUFhLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUU5RSxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ2hGLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN6RCxPQUFPLFFBQVEsTUFBTSxrQ0FBa0MsQ0FBQztBQUN4RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDOUQsT0FBTyx3QkFBd0IsQ0FBQztBQUNoQyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDM0MsT0FBTyxFQUE0UyxjQUFjLEVBQUUsV0FBVyxFQUFFLHdCQUF3QixFQUFFLG9CQUFvQixFQUFrQixjQUFjLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUVoYyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsMkJBQTJCLEVBQUUsTUFB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