/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as browser from '../../browser.js';
import * as DOM from '../../dom.js';
import { StandardKeyboardEvent } from '../../keyboardEvent.js';
import { StandardMouseEvent } from '../../mouseEvent.js';
import { EventType, Gesture } from '../../touch.js';
import { cleanMnemonic, HorizontalDirection, Menu, MENU_ESCAPED_MNEMONIC_REGEX, MENU_MNEMONIC_REGEX, VerticalDirection } from './menu.js';
import { ActionRunner, Separator, SubmenuAction } from '../../../common/actions.js';
import { asArray } from '../../../common/arrays.js';
import { RunOnceScheduler } from '../../../common/async.js';
import { Codicon } from '../../../common/codicons.js';
import { ThemeIcon } from '../../../common/themables.js';
import { Emitter } from '../../../common/event.js';
import { ScanCodeUtils } from '../../../common/keyCodes.js';
import { Disposable, DisposableStore, dispose } from '../../../common/lifecycle.js';
import { isMacintosh } from '../../../common/platform.js';
import * as strings from '../../../common/strings.js';
import './menubar.css';
import * as nls from '../../../../nls.js';
import { mainWindow } from '../../window.js';
const $ = DOM.$;
var MenubarState;
(function (MenubarState) {
    MenubarState[MenubarState["HIDDEN"] = 0] = "HIDDEN";
    MenubarState[MenubarState["VISIBLE"] = 1] = "VISIBLE";
    MenubarState[MenubarState["FOCUSED"] = 2] = "FOCUSED";
    MenubarState[MenubarState["OPEN"] = 3] = "OPEN";
})(MenubarState || (MenubarState = {}));
export class MenuBar extends Disposable {
    static { this.OVERFLOW_INDEX = -1; }
    constructor(container, options, menuStyle) {
        super();
        this.container = container;
        this.options = options;
        this.menuStyle = menuStyle;
        // Input-related
        this._mnemonicsInUse = false;
        this.openedViaKeyboard = false;
        this.awaitingAltRelease = false;
        this.ignoreNextMouseUp = false;
        this.updatePending = false;
        this.numMenusShown = 0;
        this.overflowLayoutScheduled = undefined;
        this.menuDisposables = this._register(new DisposableStore());
        this.container.setAttribute('role', 'menubar');
        if (this.isCompact) {
            this.container.classList.add('compact');
        }
        this.menus = [];
        this.mnemonics = new Map();
        this._focusState = MenubarState.VISIBLE;
        this._onVisibilityChange = this._register(new Emitter());
        this._onFocusStateChange = this._register(new Emitter());
        this.createOverflowMenu();
        this.menuUpdater = this._register(new RunOnceScheduler(() => this.update(), 200));
        this.actionRunner = this.options.actionRunner ?? this._register(new ActionRunner());
        this._register(this.actionRunner.onWillRun(() => {
            this.setUnfocusedState();
        }));
        this._register(DOM.ModifierKeyEmitter.getInstance().event(this.onModifierKeyToggled, this));
        this._register(DOM.addDisposableListener(this.container, DOM.EventType.KEY_DOWN, (e) => {
            const event = new StandardKeyboardEvent(e);
            let eventHandled = true;
            const key = !!e.key ? e.key.toLocaleLowerCase() : '';
            const tabNav = isMacintosh && !this.isCompact;
            if (event.equals(15 /* KeyCode.LeftArrow */) || (tabNav && event.equals(2 /* KeyCode.Tab */ | 1024 /* KeyMod.Shift */))) {
                this.focusPrevious();
            }
            else if (event.equals(17 /* KeyCode.RightArrow */) || (tabNav && event.equals(2 /* KeyCode.Tab */))) {
                this.focusNext();
            }
            else if (event.equals(9 /* KeyCode.Escape */) && this.isFocused && !this.isOpen) {
                this.setUnfocusedState();
            }
            else if (!this.isOpen && !event.ctrlKey && this.options.enableMnemonics && this.mnemonicsInUse && this.mnemonics.has(key)) {
                const menuIndex = this.mnemonics.get(key);
                this.onMenuTriggered(menuIndex, false);
            }
            else {
                eventHandled = false;
            }
            // Never allow default tab behavior when not compact
            if (!this.isCompact && (event.equals(2 /* KeyCode.Tab */ | 1024 /* KeyMod.Shift */) || event.equals(2 /* KeyCode.Tab */))) {
                event.preventDefault();
            }
            if (eventHandled) {
                event.preventDefault();
                event.stopPropagation();
            }
        }));
        const window = DOM.getWindow(this.container);
        this._register(DOM.addDisposableListener(window, DOM.EventType.MOUSE_DOWN, () => {
            // This mouse event is outside the menubar so it counts as a focus out
            if (this.isFocused) {
                this.setUnfocusedState();
            }
        }));
        this._register(DOM.addDisposableListener(this.container, DOM.EventType.FOCUS_IN, (e) => {
            const event = e;
            if (event.relatedTarget) {
                if (!this.container.contains(event.relatedTarget)) {
                    this.focusToReturn = event.relatedTarget;
                }
            }
        }));
        this._register(DOM.addDisposableListener(this.container, DOM.EventType.FOCUS_OUT, (e) => {
            const event = e;
            // We are losing focus and there is no related target, e.g. webview case
            if (!event.relatedTarget) {
                this.setUnfocusedState();
            }
            // We are losing focus and there is a target, reset focusToReturn value as not to redirect
            else if (event.relatedTarget && !this.container.contains(event.relatedTarget)) {
                this.focusToReturn = undefined;
                this.setUnfocusedState();
            }
        }));
        this._register(DOM.addDisposableListener(window, DOM.EventType.KEY_DOWN, (e) => {
            if (!this.options.enableMnemonics || !e.altKey || e.ctrlKey || e.defaultPrevented) {
                return;
            }
            const key = e.key.toLocaleLowerCase();
            if (!this.mnemonics.has(key)) {
                return;
            }
            this.mnemonicsInUse = true;
            this.updateMnemonicVisibility(true);
            const menuIndex = this.mnemonics.get(key);
            this.onMenuTriggered(menuIndex, false);
        }));
        this.setUnfocusedState();
    }
    push(arg) {
        const menus = asArray(arg);
        menus.forEach((menuBarMenu) => {
            const menuIndex = this.menus.length;
            const cleanMenuLabel = cleanMnemonic(menuBarMenu.label);
            const mnemonicMatches = MENU_MNEMONIC_REGEX.exec(menuBarMenu.label);
            // Register mnemonics
            if (mnemonicMatches) {
                const mnemonic = !!mnemonicMatches[1] ? mnemonicMatches[1] : mnemonicMatches[3];
                this.registerMnemonic(this.menus.length, mnemonic);
            }
            if (this.isCompact) {
                this.menus.push(menuBarMenu);
            }
            else {
                const buttonElement = $('div.menubar-menu-button', { 'role': 'menuitem', 'tabindex': -1, 'aria-label': cleanMenuLabel, 'aria-haspopup': true });
                const titleElement = $('div.menubar-menu-title', { 'role': 'none', 'aria-hidden': true });
                buttonElement.appendChild(titleElement);
                this.container.insertBefore(buttonElement, this.overflowMenu.buttonElement);
                this.updateLabels(titleElement, buttonElement, menuBarMenu.label);
                this._register(DOM.addDisposableListener(buttonElement, DOM.EventType.KEY_UP, (e) => {
                    const event = new StandardKeyboardEvent(e);
                    let eventHandled = true;
                    if ((event.equals(18 /* KeyCode.DownArrow */) || event.equals(3 /* KeyCode.Enter */)) && !this.isOpen) {
                        this.focusedMenu = { index: menuIndex };
                        this.openedViaKeyboard = true;
                        this.focusState = MenubarState.OPEN;
                    }
                    else {
                        eventHandled = false;
                    }
                    if (eventHandled) {
                        event.preventDefault();
                        event.stopPropagation();
                    }
                }));
                this._register(Gesture.addTarget(buttonElement));
                this._register(DOM.addDisposableListener(buttonElement, EventType.Tap, (e) => {
                    // Ignore this touch if the menu is touched
                    if (this.isOpen && this.focusedMenu && this.focusedMenu.holder && DOM.isAncestor(e.initialTarget, this.focusedMenu.holder)) {
                        return;
                    }
                    this.ignoreNextMouseUp = false;
                    this.onMenuTriggered(menuIndex, true);
                    e.preventDefault();
                    e.stopPropagation();
                }));
                this._register(DOM.addDisposableListener(buttonElement, DOM.EventType.MOUSE_DOWN, (e) => {
                    // Ignore non-left-click
                    const mouseEvent = new StandardMouseEvent(DOM.getWindow(buttonElement), e);
                    if (!mouseEvent.leftButton) {
                        e.preventDefault();
                        return;
                    }
                    if (!this.isOpen) {
                        // Open the menu with mouse down and ignore the following mouse up event
                        this.ignoreNextMouseUp = true;
                        this.onMenuTriggered(menuIndex, true);
                    }
                    else {
                        this.ignoreNextMouseUp = false;
                    }
                    e.preventDefault();
                    e.stopPropagation();
                }));
                this._register(DOM.addDisposableListener(buttonElement, DOM.EventType.MOUSE_UP, (e) => {
                    if (e.defaultPrevented) {
                        return;
                    }
                    if (!this.ignoreNextMouseUp) {
                        if (this.isFocused) {
                            this.onMenuTriggered(menuIndex, true);
                        }
                    }
                    else {
                        this.ignoreNextMouseUp = false;
                    }
                }));
                this._register(DOM.addDisposableListener(buttonElement, DOM.EventType.MOUSE_ENTER, () => {
                    if (this.isOpen && !this.isCurrentMenu(menuIndex)) {
                        buttonElement.focus();
                        this.cleanupCustomMenu();
                        this.showCustomMenu(menuIndex, false);
                    }
                    else if (this.isFocused && !this.isOpen) {
                        this.focusedMenu = { index: menuIndex };
                        buttonElement.focus();
                    }
                }));
                this.menus.push({
                    label: menuBarMenu.label,
                    actions: menuBarMenu.actions,
                    buttonElement: buttonElement,
                    titleElement: titleElement
                });
            }
        });
    }
    createOverflowMenu() {
        const label = this.isCompact ? nls.localize('mAppMenu', 'Application Menu') : nls.localize('mMore', 'More');
        const buttonElement = $('div.menubar-menu-button', { 'role': 'menuitem', 'tabindex': this.isCompact ? 0 : -1, 'aria-label': label, 'aria-haspopup': true });
        const titleElement = $('div.menubar-menu-title.toolbar-toggle-more' + ThemeIcon.asCSSSelector(Codicon.menuBarMore), { 'role': 'none', 'aria-hidden': true });
        buttonElement.appendChild(titleElement);
        this.container.appendChild(buttonElement);
        buttonElement.style.visibility = 'hidden';
        this._register(DOM.addDisposableListener(buttonElement, DOM.EventType.KEY_UP, (e) => {
            const event = new StandardKeyboardEvent(e);
            let eventHandled = true;
            const triggerKeys = [3 /* KeyCode.Enter */];
            if (!this.isCompact) {
                triggerKeys.push(18 /* KeyCode.DownArrow */);
            }
            else {
                triggerKeys.push(10 /* KeyCode.Space */);
                if (this.options.compactMode?.horizontal === HorizontalDirection.Right) {
                    triggerKeys.push(17 /* KeyCode.RightArrow */);
                }
                else if (this.options.compactMode?.horizontal === HorizontalDirection.Left) {
                    triggerKeys.push(15 /* KeyCode.LeftArrow */);
                }
            }
            if ((triggerKeys.some(k => event.equals(k)) && !this.isOpen)) {
                this.focusedMenu = { index: MenuBar.OVERFLOW_INDEX };
                this.openedViaKeyboard = true;
                this.focusState = MenubarState.OPEN;
            }
            else {
                eventHandled = false;
            }
            if (eventHandled) {
                event.preventDefault();
                event.stopPropagation();
            }
        }));
        this._register(Gesture.addTarget(buttonElement));
        this._register(DOM.addDisposableListener(buttonElement, EventType.Tap, (e) => {
            // Ignore this touch if the menu is touched
            if (this.isOpen && this.focusedMenu && this.focusedMenu.holder && DOM.isAncestor(e.initialTarget, this.focusedMenu.holder)) {
                return;
            }
            this.ignoreNextMouseUp = false;
            this.onMenuTriggered(MenuBar.OVERFLOW_INDEX, true);
            e.preventDefault();
            e.stopPropagation();
        }));
        this._register(DOM.addDisposableListener(buttonElement, DOM.EventType.MOUSE_DOWN, (e) => {
            // Ignore non-left-click
            const mouseEvent = new StandardMouseEvent(DOM.getWindow(buttonElement), e);
            if (!mouseEvent.leftButton) {
                e.preventDefault();
                return;
            }
            if (!this.isOpen) {
                // Open the menu with mouse down and ignore the following mouse up event
                this.ignoreNextMouseUp = true;
                this.onMenuTriggered(MenuBar.OVERFLOW_INDEX, true);
            }
            else {
                this.ignoreNextMouseUp = false;
            }
            e.preventDefault();
            e.stopPropagation();
        }));
        this._register(DOM.addDisposableListener(buttonElement, DOM.EventType.MOUSE_UP, (e) => {
            if (e.defaultPrevented) {
                return;
            }
            if (!this.ignoreNextMouseUp) {
                if (this.isFocused) {
                    this.onMenuTriggered(MenuBar.OVERFLOW_INDEX, true);
                }
            }
            else {
                this.ignoreNextMouseUp = false;
            }
        }));
        this._register(DOM.addDisposableListener(buttonElement, DOM.EventType.MOUSE_ENTER, () => {
            if (this.isOpen && !this.isCurrentMenu(MenuBar.OVERFLOW_INDEX)) {
                this.overflowMenu.buttonElement.focus();
                this.cleanupCustomMenu();
                this.showCustomMenu(MenuBar.OVERFLOW_INDEX, false);
            }
            else if (this.isFocused && !this.isOpen) {
                this.focusedMenu = { index: MenuBar.OVERFLOW_INDEX };
                buttonElement.focus();
            }
        }));
        this.overflowMenu = {
            buttonElement: buttonElement,
            titleElement: titleElement,
            label: 'More',
            actions: []
        };
    }
    updateMenu(menu) {
        const menuToUpdate = this.menus.filter(menuBarMenu => menuBarMenu.label === menu.label);
        if (menuToUpdate && menuToUpdate.length) {
            menuToUpdate[0].actions = menu.actions;
        }
    }
    dispose() {
        super.dispose();
        this.menus.forEach(menuBarMenu => {
            menuBarMenu.titleElement?.remove();
            menuBarMenu.buttonElement?.remove();
        });
        this.overflowMenu.titleElement.remove();
        this.overflowMenu.buttonElement.remove();
        dispose(this.overflowLayoutScheduled);
        this.overflowLayoutScheduled = undefined;
    }
    blur() {
        this.setUnfocusedState();
    }
    getWidth() {
        if (!this.isCompact && this.menus) {
            const left = this.menus[0].buttonElement.getBoundingClientRect().left;
            const right = this.hasOverflow ? this.overflowMenu.buttonElement.getBoundingClientRect().right : this.menus[this.menus.length - 1].buttonElement.getBoundingClientRect().right;
            return right - left;
        }
        return 0;
    }
    getHeight() {
        return this.container.clientHeight;
    }
    toggleFocus() {
        if (!this.isFocused && this.options.visibility !== 'hidden') {
            this.mnemonicsInUse = true;
            this.focusedMenu = { index: this.numMenusShown > 0 ? 0 : MenuBar.OVERFLOW_INDEX };
            this.focusState = MenubarState.FOCUSED;
        }
        else if (!this.isOpen) {
            this.setUnfocusedState();
        }
    }
    updateOverflowAction() {
        if (!this.menus || !this.menus.length) {
            return;
        }
        const overflowMenuOnlyClass = 'overflow-menu-only';
        // Remove overflow only restriction to allow the most space
        this.container.classList.toggle(overflowMenuOnlyClass, false);
        const sizeAvailable = this.container.offsetWidth;
        let currentSize = 0;
        let full = this.isCompact;
        const prevNumMenusShown = this.numMenusShown;
        this.numMenusShown = 0;
        const showableMenus = this.menus.filter(menu => menu.buttonElement !== undefined && menu.titleElement !== undefined);
        for (const menuBarMenu of showableMenus) {
            if (!full) {
                const size = menuBarMenu.buttonElement.offsetWidth;
                if (currentSize + size > sizeAvailable) {
                    full = true;
                }
                else {
                    currentSize += size;
                    this.numMenusShown++;
                    if (this.numMenusShown > prevNumMenusShown) {
                        menuBarMenu.buttonElement.style.visibility = 'visible';
                    }
                }
            }
            if (full) {
                menuBarMenu.buttonElement.style.visibility = 'hidden';
            }
        }
        // If below minimium menu threshold, show the overflow menu only as hamburger menu
        if (this.numMenusShown - 1 <= showableMenus.length / 4) {
            for (const menuBarMenu of showableMenus) {
                menuBarMenu.buttonElement.style.visibility = 'hidden';
            }
            full = true;
            this.numMenusShown = 0;
            currentSize = 0;
        }
        // Overflow
        if (this.isCompact) {
            this.overflowMenu.actions = [];
            for (let idx = this.numMenusShown; idx < this.menus.length; idx++) {
                this.overflowMenu.actions.push(new SubmenuAction(`menubar.submenu.${this.menus[idx].label}`, this.menus[idx].label, this.menus[idx].actions || []));
            }
            const compactMenuActions = this.options.getCompactMenuActions?.();
            if (compactMenuActions && compactMenuActions.length) {
                this.overflowMenu.actions.push(new Separator());
                this.overflowMenu.actions.push(...compactMenuActions);
            }
            this.overflowMenu.buttonElement.style.visibility = 'visible';
        }
        else if (full) {
            // Can't fit the more button, need to remove more menus
            while (currentSize + this.overflowMenu.buttonElement.offsetWidth > sizeAvailable && this.numMenusShown > 0) {
                this.numMenusShown--;
                const size = showableMenus[this.numMenusShown].buttonElement.offsetWidth;
                showableMenus[this.numMenusShown].buttonElement.style.visibility = 'hidden';
                currentSize -= size;
            }
            this.overflowMenu.actions = [];
            for (let idx = this.numMenusShown; idx < showableMenus.length; idx++) {
                this.overflowMenu.actions.push(new SubmenuAction(`menubar.submenu.${showableMenus[idx].label}`, showableMenus[idx].label, showableMenus[idx].actions || []));
            }
            if (this.overflowMenu.buttonElement.nextElementSibling !== showableMenus[this.numMenusShown].buttonElement) {
                this.overflowMenu.buttonElement.remove();
                this.container.insertBefore(this.overflowMenu.buttonElement, showableMenus[this.numMenusShown].buttonElement);
            }
            this.overflowMenu.buttonElement.style.visibility = 'visible';
        }
        else {
            this.overflowMenu.buttonElement.remove();
            this.container.appendChild(this.overflowMenu.buttonElement);
            this.overflowMenu.buttonElement.style.visibility = 'hidden';
        }
        // If we are only showing the overflow, add this class to avoid taking up space
        this.container.classList.toggle(overflowMenuOnlyClass, this.numMenusShown === 0);
    }
    updateLabels(titleElement, buttonElement, label) {
        const cleanMenuLabel = cleanMnemonic(label);
        // Update the button label to reflect mnemonics
        if (this.options.enableMnemonics) {
            const cleanLabel = strings.escape(label);
            // This is global so reset it
            MENU_ESCAPED_MNEMONIC_REGEX.lastIndex = 0;
            let escMatch = MENU_ESCAPED_MNEMONIC_REGEX.exec(cleanLabel);
            // We can't use negative lookbehind so we match our negative and skip
            while (escMatch && escMatch[1]) {
                escMatch = MENU_ESCAPED_MNEMONIC_REGEX.exec(cleanLabel);
            }
            const replaceDoubleEscapes = (str) => str.replace(/&amp;&amp;/g, '&amp;');
            if (escMatch) {
                titleElement.innerText = '';
                titleElement.append(strings.ltrim(replaceDoubleEscapes(cleanLabel.substr(0, escMatch.index)), ' '), $('mnemonic', { 'aria-hidden': 'true' }, escMatch[3]), strings.rtrim(replaceDoubleEscapes(cleanLabel.substr(escMatch.index + escMatch[0].length)), ' '));
            }
            else {
                titleElement.innerText = replaceDoubleEscapes(cleanLabel).trim();
            }
        }
        else {
            titleElement.innerText = cleanMenuLabel.replace(/&&/g, '&');
        }
        const mnemonicMatches = MENU_MNEMONIC_REGEX.exec(label);
        // Register mnemonics
        if (mnemonicMatches) {
            const mnemonic = !!mnemonicMatches[1] ? mnemonicMatches[1] : mnemonicMatches[3];
            if (this.options.enableMnemonics) {
                buttonElement.setAttribute('aria-keyshortcuts', 'Alt+' + mnemonic.toLocaleLowerCase());
            }
            else {
                buttonElement.removeAttribute('aria-keyshortcuts');
            }
        }
    }
    update(options) {
        if (options) {
            this.options = options;
        }
        // Don't update while using the menu
        if (this.isFocused) {
            this.updatePending = true;
            return;
        }
        this.menus.forEach(menuBarMenu => {
            if (!menuBarMenu.buttonElement || !menuBarMenu.titleElement) {
                return;
            }
            this.updateLabels(menuBarMenu.titleElement, menuBarMenu.buttonElement, menuBarMenu.label);
        });
        if (!this.overflowLayoutScheduled) {
            this.overflowLayoutScheduled = DOM.scheduleAtNextAnimationFrame(DOM.getWindow(this.container), () => {
                this.updateOverflowAction();
                this.overflowLayoutScheduled = undefined;
            });
        }
        this.setUnfocusedState();
    }
    registerMnemonic(menuIndex, mnemonic) {
        this.mnemonics.set(mnemonic.toLocaleLowerCase(), menuIndex);
    }
    hideMenubar() {
        if (this.container.style.display !== 'none') {
            this.container.style.display = 'none';
            this._onVisibilityChange.fire(false);
        }
    }
    showMenubar() {
        if (this.container.style.display !== 'flex') {
            this.container.style.display = 'flex';
            this._onVisibilityChange.fire(true);
            this.updateOverflowAction();
        }
    }
    get focusState() {
        return this._focusState;
    }
    set focusState(value) {
        if (this._focusState >= MenubarState.FOCUSED && value < MenubarState.FOCUSED) {
            // Losing focus, update the menu if needed
            if (this.updatePending) {
                this.menuUpdater.schedule();
                this.updatePending = false;
            }
        }
        if (value === this._focusState) {
            return;
        }
        const isVisible = this.isVisible;
        const isOpen = this.isOpen;
        const isFocused = this.isFocused;
        this._focusState = value;
        switch (value) {
            case MenubarState.HIDDEN:
                if (isVisible) {
                    this.hideMenubar();
                }
                if (isOpen) {
                    this.cleanupCustomMenu();
                }
                if (isFocused) {
                    this.focusedMenu = undefined;
                    if (this.focusToReturn) {
                        this.focusToReturn.focus();
                        this.focusToReturn = undefined;
                    }
                }
                break;
            case MenubarState.VISIBLE:
                if (!isVisible) {
                    this.showMenubar();
                }
                if (isOpen) {
                    this.cleanupCustomMenu();
                }
                if (isFocused) {
                    if (this.focusedMenu) {
                        if (this.focusedMenu.index === MenuBar.OVERFLOW_INDEX) {
                            this.overflowMenu.buttonElement.blur();
                        }
                        else {
                            this.menus[this.focusedMenu.index].buttonElement?.blur();
                        }
                    }
                    this.focusedMenu = undefined;
                    if (this.focusToReturn) {
                        this.focusToReturn.focus();
                        this.focusToReturn = undefined;
                    }
                }
                break;
            case MenubarState.FOCUSED:
                if (!isVisible) {
                    this.showMenubar();
                }
                if (isOpen) {
                    this.cleanupCustomMenu();
                }
                if (this.focusedMenu) {
                    // When the menu is toggled on, it may be in compact state and trying to
                    // focus the first menu. In this case we should focus the overflow instead.
                    if (this.focusedMenu.index === 0 && this.numMenusShown === 0) {
                        this.focusedMenu.index = MenuBar.OVERFLOW_INDEX;
                    }
                    if (this.focusedMenu.index === MenuBar.OVERFLOW_INDEX) {
                        this.overflowMenu.buttonElement.focus();
                    }
                    else {
                        this.menus[this.focusedMenu.index].buttonElement?.focus();
                    }
                }
                break;
            case MenubarState.OPEN:
                if (!isVisible) {
                    this.showMenubar();
                }
                if (this.focusedMenu) {
                    this.cleanupCustomMenu();
                    this.showCustomMenu(this.focusedMenu.index, this.openedViaKeyboard);
                }
                break;
        }
        this._focusState = value;
        this._onFocusStateChange.fire(this.focusState >= MenubarState.FOCUSED);
    }
    get isVisible() {
        return this.focusState >= MenubarState.VISIBLE;
    }
    get isFocused() {
        return this.focusState >= MenubarState.FOCUSED;
    }
    get isOpen() {
        return this.focusState >= MenubarState.OPEN;
    }
    get hasOverflow() {
        return this.isCompact || this.numMenusShown < this.menus.length;
    }
    get isCompact() {
        return this.options.compactMode !== undefined;
    }
    setUnfocusedState() {
        if (this.options.visibility === 'toggle' || this.options.visibility === 'hidden') {
            this.focusState = MenubarState.HIDDEN;
        }
        else if (this.options.visibility === 'classic' && browser.isFullscreen(mainWindow)) {
            this.focusState = MenubarState.HIDDEN;
        }
        else {
            this.focusState = MenubarState.VISIBLE;
        }
        this.ignoreNextMouseUp = false;
        this.mnemonicsInUse = false;
        this.updateMnemonicVisibility(false);
    }
    focusPrevious() {
        if (!this.focusedMenu || this.numMenusShown === 0) {
            return;
        }
        let newFocusedIndex = (this.focusedMenu.index - 1 + this.numMenusShown) % this.numMenusShown;
        if (this.focusedMenu.index === MenuBar.OVERFLOW_INDEX) {
            newFocusedIndex = this.numMenusShown - 1;
        }
        else if (this.focusedMenu.index === 0 && this.hasOverflow) {
            newFocusedIndex = MenuBar.OVERFLOW_INDEX;
        }
        if (newFocusedIndex === this.focusedMenu.index) {
            return;
        }
        if (this.isOpen) {
            this.cleanupCustomMenu();
            this.showCustomMenu(newFocusedIndex);
        }
        else if (this.isFocused) {
            this.focusedMenu.index = newFocusedIndex;
            if (newFocusedIndex === MenuBar.OVERFLOW_INDEX) {
                this.overflowMenu.buttonElement.focus();
            }
            else {
                this.menus[newFocusedIndex].buttonElement?.focus();
            }
        }
    }
    focusNext() {
        if (!this.focusedMenu || this.numMenusShown === 0) {
            return;
        }
        let newFocusedIndex = (this.focusedMenu.index + 1) % this.numMenusShown;
        if (this.focusedMenu.index === MenuBar.OVERFLOW_INDEX) {
            newFocusedIndex = 0;
        }
        else if (this.focusedMenu.index === this.numMenusShown - 1) {
            newFocusedIndex = MenuBar.OVERFLOW_INDEX;
        }
        if (newFocusedIndex === this.focusedMenu.index) {
            return;
        }
        if (this.isOpen) {
            this.cleanupCustomMenu();
            this.showCustomMenu(newFocusedIndex);
        }
        else if (this.isFocused) {
            this.focusedMenu.index = newFocusedIndex;
            if (newFocusedIndex === MenuBar.OVERFLOW_INDEX) {
                this.overflowMenu.buttonElement.focus();
            }
            else {
                this.menus[newFocusedIndex].buttonElement?.focus();
            }
        }
    }
    updateMnemonicVisibility(visible) {
        if (this.menus) {
            this.menus.forEach(menuBarMenu => {
                if (menuBarMenu.titleElement && menuBarMenu.titleElement.children.length) {
                    const child = menuBarMenu.titleElement.children.item(0);
                    if (child) {
                        child.style.textDecoration = (this.options.alwaysOnMnemonics || visible) ? 'underline' : '';
                    }
                }
            });
        }
    }
    get mnemonicsInUse() {
        return this._mnemonicsInUse;
    }
    set mnemonicsInUse(value) {
        this._mnemonicsInUse = value;
    }
    get shouldAltKeyFocus() {
        if (isMacintosh) {
            return false;
        }
        if (!this.options.disableAltFocus) {
            return true;
        }
        if (this.options.visibility === 'toggle') {
            return true;
        }
        return false;
    }
    get onVisibilityChange() {
        return this._onVisibilityChange.event;
    }
    get onFocusStateChange() {
        return this._onFocusStateChange.event;
    }
    onMenuTriggered(menuIndex, clicked) {
        if (this.isOpen) {
            if (this.isCurrentMenu(menuIndex)) {
                this.setUnfocusedState();
            }
            else {
                this.cleanupCustomMenu();
                this.showCustomMenu(menuIndex, this.openedViaKeyboard);
            }
        }
        else {
            this.focusedMenu = { index: menuIndex };
            this.openedViaKeyboard = !clicked;
            this.focusState = MenubarState.OPEN;
        }
    }
    onModifierKeyToggled(modifierKeyStatus) {
        const allModifiersReleased = !modifierKeyStatus.altKey && !modifierKeyStatus.ctrlKey && !modifierKeyStatus.shiftKey && !modifierKeyStatus.metaKey;
        if (this.options.visibility === 'hidden') {
            return;
        }
        // Prevent alt-key default if the menu is not hidden and we use alt to focus
        if (modifierKeyStatus.event && this.shouldAltKeyFocus) {
            if (ScanCodeUtils.toEnum(modifierKeyStatus.event.code) === 159 /* ScanCode.AltLeft */) {
                modifierKeyStatus.event.preventDefault();
            }
        }
        // Alt key pressed while menu is focused. This should return focus away from the menubar
        if (this.isFocused && modifierKeyStatus.lastKeyPressed === 'alt' && modifierKeyStatus.altKey) {
            this.setUnfocusedState();
            this.mnemonicsInUse = false;
            this.awaitingAltRelease = true;
        }
        // Clean alt key press and release
        if (allModifiersReleased && modifierKeyStatus.lastKeyPressed === 'alt' && modifierKeyStatus.lastKeyReleased === 'alt') {
            if (!this.awaitingAltRelease) {
                if (!this.isFocused && this.shouldAltKeyFocus) {
                    this.mnemonicsInUse = true;
                    this.focusedMenu = { index: this.numMenusShown > 0 ? 0 : MenuBar.OVERFLOW_INDEX };
                    this.focusState = MenubarState.FOCUSED;
                }
                else if (!this.isOpen) {
                    this.setUnfocusedState();
                }
            }
        }
        // Alt key released
        if (!modifierKeyStatus.altKey && modifierKeyStatus.lastKeyReleased === 'alt') {
            this.awaitingAltRelease = false;
        }
        if (this.options.enableMnemonics && this.menus && !this.isOpen) {
            this.updateMnemonicVisibility((!this.awaitingAltRelease && modifierKeyStatus.altKey) || this.mnemonicsInUse);
        }
    }
    isCurrentMenu(menuIndex) {
        if (!this.focusedMenu) {
            return false;
        }
        return this.focusedMenu.index === menuIndex;
    }
    cleanupCustomMenu() {
        if (this.focusedMenu) {
            // Remove focus from the menus first
            if (this.focusedMenu.index === MenuBar.OVERFLOW_INDEX) {
                this.overflowMenu.buttonElement.focus();
            }
            else {
                this.menus[this.focusedMenu.index].buttonElement?.focus();
            }
            if (this.focusedMenu.holder) {
                this.focusedMenu.holder.parentElement?.classList.remove('open');
                this.focusedMenu.holder.remove();
            }
            this.focusedMenu.widget?.dispose();
            this.focusedMenu = { index: this.focusedMenu.index };
        }
        this.menuDisposables.clear();
    }
    showCustomMenu(menuIndex, selectFirst = true) {
        const actualMenuIndex = menuIndex >= this.numMenusShown ? MenuBar.OVERFLOW_INDEX : menuIndex;
        const customMenu = actualMenuIndex === MenuBar.OVERFLOW_INDEX ? this.overflowMenu : this.menus[actualMenuIndex];
        if (!customMenu.actions || !customMenu.buttonElement || !customMenu.titleElement) {
            return;
        }
        const menuHolder = $('div.menubar-menu-items-holder', { 'title': '' });
        customMenu.buttonElement.classList.add('open');
        const titleBoundingRect = customMenu.titleElement.getBoundingClientRect();
        const titleBoundingRectZoom = DOM.getDomNodeZoomLevel(customMenu.titleElement);
        if (this.options.compactMode?.horizontal === HorizontalDirection.Right) {
            menuHolder.style.left = `${titleBoundingRect.left + this.container.clientWidth}px`;
        }
        else if (this.options.compactMode?.horizontal === HorizontalDirection.Left) {
            const windowWidth = DOM.getWindow(this.container).innerWidth;
            menuHolder.style.right = `${windowWidth - titleBoundingRect.left}px`;
            menuHolder.style.left = 'auto';
        }
        else {
            menuHolder.style.left = `${titleBoundingRect.left * titleBoundingRectZoom}px`;
        }
        if (this.options.compactMode?.vertical === VerticalDirection.Above) {
            // TODO@benibenj Do not hardcode the height of the menu holder
            menuHolder.style.top = `${titleBoundingRect.top - this.menus.length * 30 + this.container.clientHeight}px`;
        }
        else if (this.options.compactMode?.vertical === VerticalDirection.Below) {
            menuHolder.style.top = `${titleBoundingRect.top}px`;
        }
        else {
            menuHolder.style.top = `${titleBoundingRect.bottom * titleBoundingRectZoom}px`;
        }
        customMenu.buttonElement.appendChild(menuHolder);
        const menuOptions = {
            getKeyBinding: this.options.getKeybinding,
            actionRunner: this.actionRunner,
            enableMnemonics: this.options.alwaysOnMnemonics || (this.mnemonicsInUse && this.options.enableMnemonics),
            ariaLabel: customMenu.buttonElement.getAttribute('aria-label') ?? undefined,
            expandDirection: this.isCompact ? this.options.compactMode : { horizontal: HorizontalDirection.Right, vertical: VerticalDirection.Below },
            useEventAsContext: true
        };
        const menuWidget = this.menuDisposables.add(new Menu(menuHolder, customMenu.actions, menuOptions, this.menuStyle));
        this.menuDisposables.add(menuWidget.onDidCancel(() => {
            this.focusState = MenubarState.FOCUSED;
        }));
        if (actualMenuIndex !== menuIndex) {
            menuWidget.trigger(menuIndex - this.numMenusShown);
        }
        else {
            menuWidget.focus(selectFirst);
        }
        this.focusedMenu = {
            index: actualMenuIndex,
            holder: menuHolder,
            widget: menuWidget
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVudWJhci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2Jyb3dzZXIvdWkvbWVudS9tZW51YmFyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxPQUFPLE1BQU0sa0JBQWtCLENBQUM7QUFDNUMsT0FBTyxLQUFLLEdBQUcsTUFBTSxjQUFjLENBQUM7QUFDcEMsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFDL0QsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFDekQsT0FBTyxFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQWdCLE1BQU0sZ0JBQWdCLENBQUM7QUFDbEUsT0FBTyxFQUFFLGFBQWEsRUFBRSxtQkFBbUIsRUFBNkMsSUFBSSxFQUFFLDJCQUEyQixFQUFFLG1CQUFtQixFQUFFLGlCQUFpQixFQUFFLE1BQU0sV0FBVyxDQUFDO0FBQ3JMLE9BQU8sRUFBRSxZQUFZLEVBQTBCLFNBQVMsRUFBRSxhQUFhLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUM1RyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDcEQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDNUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ3RELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUN6RCxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sMEJBQTBCLENBQUM7QUFDMUQsT0FBTyxFQUE2QixhQUFhLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUV2RixPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxPQUFPLEVBQWUsTUFBTSw4QkFBOEIs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