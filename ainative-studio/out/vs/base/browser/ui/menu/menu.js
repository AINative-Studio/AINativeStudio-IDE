/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isFirefox } from '../../browser.js';
import { EventType as TouchEventType, Gesture } from '../../touch.js';
import { $, addDisposableListener, append, clearNode, Dimension, EventHelper, EventType, getActiveElement, getWindow, isAncestor, isInShadowDOM } from '../../dom.js';
import { createStyleSheet } from '../../domStylesheets.js';
import { StandardKeyboardEvent } from '../../keyboardEvent.js';
import { StandardMouseEvent } from '../../mouseEvent.js';
import { ActionBar } from '../actionbar/actionbar.js';
import { ActionViewItem, BaseActionViewItem } from '../actionbar/actionViewItems.js';
import { layout } from '../contextview/contextview.js';
import { DomScrollableElement } from '../scrollbar/scrollableElement.js';
import { EmptySubmenuAction, Separator, SubmenuAction } from '../../../common/actions.js';
import { RunOnceScheduler } from '../../../common/async.js';
import { Codicon } from '../../../common/codicons.js';
import { getCodiconFontCharacters } from '../../../common/codiconsUtil.js';
import { ThemeIcon } from '../../../common/themables.js';
import { stripIcons } from '../../../common/iconLabels.js';
import { DisposableStore } from '../../../common/lifecycle.js';
import { isLinux, isMacintosh } from '../../../common/platform.js';
import * as strings from '../../../common/strings.js';
export const MENU_MNEMONIC_REGEX = /\(&([^\s&])\)|(^|[^&])&([^\s&])/;
export const MENU_ESCAPED_MNEMONIC_REGEX = /(&amp;)?(&amp;)([^\s&])/g;
export var HorizontalDirection;
(function (HorizontalDirection) {
    HorizontalDirection[HorizontalDirection["Right"] = 0] = "Right";
    HorizontalDirection[HorizontalDirection["Left"] = 1] = "Left";
})(HorizontalDirection || (HorizontalDirection = {}));
export var VerticalDirection;
(function (VerticalDirection) {
    VerticalDirection[VerticalDirection["Above"] = 0] = "Above";
    VerticalDirection[VerticalDirection["Below"] = 1] = "Below";
})(VerticalDirection || (VerticalDirection = {}));
export const unthemedMenuStyles = {
    shadowColor: undefined,
    borderColor: undefined,
    foregroundColor: undefined,
    backgroundColor: undefined,
    selectionForegroundColor: undefined,
    selectionBackgroundColor: undefined,
    selectionBorderColor: undefined,
    separatorColor: undefined,
    scrollbarShadow: undefined,
    scrollbarSliderBackground: undefined,
    scrollbarSliderHoverBackground: undefined,
    scrollbarSliderActiveBackground: undefined
};
export class Menu extends ActionBar {
    constructor(container, actions, options, menuStyles) {
        container.classList.add('monaco-menu-container');
        container.setAttribute('role', 'presentation');
        const menuElement = document.createElement('div');
        menuElement.classList.add('monaco-menu');
        menuElement.setAttribute('role', 'presentation');
        super(menuElement, {
            orientation: 1 /* ActionsOrientation.VERTICAL */,
            actionViewItemProvider: action => this.doGetActionViewItem(action, options, parentData),
            context: options.context,
            actionRunner: options.actionRunner,
            ariaLabel: options.ariaLabel,
            ariaRole: 'menu',
            focusOnlyEnabledItems: true,
            triggerKeys: { keys: [3 /* KeyCode.Enter */, ...(isMacintosh || isLinux ? [10 /* KeyCode.Space */] : [])], keyDown: true }
        });
        this.menuStyles = menuStyles;
        this.menuElement = menuElement;
        this.actionsList.tabIndex = 0;
        this.initializeOrUpdateStyleSheet(container, menuStyles);
        this._register(Gesture.addTarget(menuElement));
        this._register(addDisposableListener(menuElement, EventType.KEY_DOWN, (e) => {
            const event = new StandardKeyboardEvent(e);
            // Stop tab navigation of menus
            if (event.equals(2 /* KeyCode.Tab */)) {
                e.preventDefault();
            }
        }));
        if (options.enableMnemonics) {
            this._register(addDisposableListener(menuElement, EventType.KEY_DOWN, (e) => {
                const key = e.key.toLocaleLowerCase();
                if (this.mnemonics.has(key)) {
                    EventHelper.stop(e, true);
                    const actions = this.mnemonics.get(key);
                    if (actions.length === 1) {
                        if (actions[0] instanceof SubmenuMenuActionViewItem && actions[0].container) {
                            this.focusItemByElement(actions[0].container);
                        }
                        actions[0].onClick(e);
                    }
                    if (actions.length > 1) {
                        const action = actions.shift();
                        if (action && action.container) {
                            this.focusItemByElement(action.container);
                            actions.push(action);
                        }
                        this.mnemonics.set(key, actions);
                    }
                }
            }));
        }
        if (isLinux) {
            this._register(addDisposableListener(menuElement, EventType.KEY_DOWN, e => {
                const event = new StandardKeyboardEvent(e);
                if (event.equals(14 /* KeyCode.Home */) || event.equals(11 /* KeyCode.PageUp */)) {
                    this.focusedItem = this.viewItems.length - 1;
                    this.focusNext();
                    EventHelper.stop(e, true);
                }
                else if (event.equals(13 /* KeyCode.End */) || event.equals(12 /* KeyCode.PageDown */)) {
                    this.focusedItem = 0;
                    this.focusPrevious();
                    EventHelper.stop(e, true);
                }
            }));
        }
        this._register(addDisposableListener(this.domNode, EventType.MOUSE_OUT, e => {
            const relatedTarget = e.relatedTarget;
            if (!isAncestor(relatedTarget, this.domNode)) {
                this.focusedItem = undefined;
                this.updateFocus();
                e.stopPropagation();
            }
        }));
        this._register(addDisposableListener(this.actionsList, EventType.MOUSE_OVER, e => {
            let target = e.target;
            if (!target || !isAncestor(target, this.actionsList) || target === this.actionsList) {
                return;
            }
            while (target.parentElement !== this.actionsList && target.parentElement !== null) {
                target = target.parentElement;
            }
            if (target.classList.contains('action-item')) {
                const lastFocusedItem = this.focusedItem;
                this.setFocusedItem(target);
                if (lastFocusedItem !== this.focusedItem) {
                    this.updateFocus();
                }
            }
        }));
        // Support touch on actions list to focus items (needed for submenus)
        this._register(Gesture.addTarget(this.actionsList));
        this._register(addDisposableListener(this.actionsList, TouchEventType.Tap, e => {
            let target = e.initialTarget;
            if (!target || !isAncestor(target, this.actionsList) || target === this.actionsList) {
                return;
            }
            while (target.parentElement !== this.actionsList && target.parentElement !== null) {
                target = target.parentElement;
            }
            if (target.classList.contains('action-item')) {
                const lastFocusedItem = this.focusedItem;
                this.setFocusedItem(target);
                if (lastFocusedItem !== this.focusedItem) {
                    this.updateFocus();
                }
            }
        }));
        const parentData = {
            parent: this
        };
        this.mnemonics = new Map();
        // Scroll Logic
        this.scrollableElement = this._register(new DomScrollableElement(menuElement, {
            alwaysConsumeMouseWheel: true,
            horizontal: 2 /* ScrollbarVisibility.Hidden */,
            vertical: 3 /* ScrollbarVisibility.Visible */,
            verticalScrollbarSize: 7,
            handleMouseWheel: true,
            useShadows: true
        }));
        const scrollElement = this.scrollableElement.getDomNode();
        scrollElement.style.position = '';
        this.styleScrollElement(scrollElement, menuStyles);
        // Support scroll on menu drag
        this._register(addDisposableListener(menuElement, TouchEventType.Change, e => {
            EventHelper.stop(e, true);
            const scrollTop = this.scrollableElement.getScrollPosition().scrollTop;
            this.scrollableElement.setScrollPosition({ scrollTop: scrollTop - e.translationY });
        }));
        this._register(addDisposableListener(scrollElement, EventType.MOUSE_UP, e => {
            // Absorb clicks in menu dead space https://github.com/microsoft/vscode/issues/63575
            // We do this on the scroll element so the scroll bar doesn't dismiss the menu either
            e.preventDefault();
        }));
        const window = getWindow(container);
        menuElement.style.maxHeight = `${Math.max(10, window.innerHeight - container.getBoundingClientRect().top - 35)}px`;
        actions = actions.filter((a, idx) => {
            if (options.submenuIds?.has(a.id)) {
                console.warn(`Found submenu cycle: ${a.id}`);
                return false;
            }
            // Filter out consecutive or useless separators
            if (a instanceof Separator) {
                if (idx === actions.length - 1 || idx === 0) {
                    return false;
                }
                const prevAction = actions[idx - 1];
                if (prevAction instanceof Separator) {
                    return false;
                }
            }
            return true;
        });
        this.push(actions, { icon: true, label: true, isMenu: true });
        container.appendChild(this.scrollableElement.getDomNode());
        this.scrollableElement.scanDomNode();
        this.viewItems.filter(item => !(item instanceof MenuSeparatorActionViewItem)).forEach((item, index, array) => {
            item.updatePositionInSet(index + 1, array.length);
        });
    }
    initializeOrUpdateStyleSheet(container, style) {
        if (!this.styleSheet) {
            if (isInShadowDOM(container)) {
                this.styleSheet = createStyleSheet(container);
            }
            else {
                if (!Menu.globalStyleSheet) {
                    Menu.globalStyleSheet = createStyleSheet();
                }
                this.styleSheet = Menu.globalStyleSheet;
            }
        }
        this.styleSheet.textContent = getMenuWidgetCSS(style, isInShadowDOM(container));
    }
    styleScrollElement(scrollElement, style) {
        const fgColor = style.foregroundColor ?? '';
        const bgColor = style.backgroundColor ?? '';
        const border = style.borderColor ? `1px solid ${style.borderColor}` : '';
        const borderRadius = '5px';
        const shadow = style.shadowColor ? `0 2px 8px ${style.shadowColor}` : '';
        scrollElement.style.outline = border;
        scrollElement.style.borderRadius = borderRadius;
        scrollElement.style.color = fgColor;
        scrollElement.style.backgroundColor = bgColor;
        scrollElement.style.boxShadow = shadow;
    }
    getContainer() {
        return this.scrollableElement.getDomNode();
    }
    get onScroll() {
        return this.scrollableElement.onScroll;
    }
    get scrollOffset() {
        return this.menuElement.scrollTop;
    }
    trigger(index) {
        if (index <= this.viewItems.length && index >= 0) {
            const item = this.viewItems[index];
            if (item instanceof SubmenuMenuActionViewItem) {
                super.focus(index);
                item.open(true);
            }
            else if (item instanceof BaseMenuActionViewItem) {
                super.run(item._action, item._context);
            }
            else {
                return;
            }
        }
    }
    focusItemByElement(element) {
        const lastFocusedItem = this.focusedItem;
        this.setFocusedItem(element);
        if (lastFocusedItem !== this.focusedItem) {
            this.updateFocus();
        }
    }
    setFocusedItem(element) {
        for (let i = 0; i < this.actionsList.children.length; i++) {
            const elem = this.actionsList.children[i];
            if (element === elem) {
                this.focusedItem = i;
                break;
            }
        }
    }
    updateFocus(fromRight) {
        super.updateFocus(fromRight, true, true);
        if (typeof this.focusedItem !== 'undefined') {
            // Workaround for #80047 caused by an issue in chromium
            // https://bugs.chromium.org/p/chromium/issues/detail?id=414283
            // When that's fixed, just call this.scrollableElement.scanDomNode()
            this.scrollableElement.setScrollPosition({
                scrollTop: Math.round(this.menuElement.scrollTop)
            });
        }
    }
    doGetActionViewItem(action, options, parentData) {
        if (action instanceof Separator) {
            return new MenuSeparatorActionViewItem(options.context, action, { icon: true }, this.menuStyles);
        }
        else if (action instanceof SubmenuAction) {
            const menuActionViewItem = new SubmenuMenuActionViewItem(action, action.actions, parentData, { ...options, submenuIds: new Set([...(options.submenuIds || []), action.id]) }, this.menuStyles);
            if (options.enableMnemonics) {
                const mnemonic = menuActionViewItem.getMnemonic();
                if (mnemonic && menuActionViewItem.isEnabled()) {
                    let actionViewItems = [];
                    if (this.mnemonics.has(mnemonic)) {
                        actionViewItems = this.mnemonics.get(mnemonic);
                    }
                    actionViewItems.push(menuActionViewItem);
                    this.mnemonics.set(mnemonic, actionViewItems);
                }
            }
            return menuActionViewItem;
        }
        else {
            const menuItemOptions = { enableMnemonics: options.enableMnemonics, useEventAsContext: options.useEventAsContext };
            if (options.getKeyBinding) {
                const keybinding = options.getKeyBinding(action);
                if (keybinding) {
                    const keybindingLabel = keybinding.getLabel();
                    if (keybindingLabel) {
                        menuItemOptions.keybinding = keybindingLabel;
                    }
                }
            }
            const menuActionViewItem = new BaseMenuActionViewItem(options.context, action, menuItemOptions, this.menuStyles);
            if (options.enableMnemonics) {
                const mnemonic = menuActionViewItem.getMnemonic();
                if (mnemonic && menuActionViewItem.isEnabled()) {
                    let actionViewItems = [];
                    if (this.mnemonics.has(mnemonic)) {
                        actionViewItems = this.mnemonics.get(mnemonic);
                    }
                    actionViewItems.push(menuActionViewItem);
                    this.mnemonics.set(mnemonic, actionViewItems);
                }
            }
            return menuActionViewItem;
        }
    }
}
class BaseMenuActionViewItem extends BaseActionViewItem {
    constructor(ctx, action, options, menuStyle) {
        options.isMenu = true;
        super(action, action, options);
        this.menuStyle = menuStyle;
        this.options = options;
        this.options.icon = options.icon !== undefined ? options.icon : false;
        this.options.label = options.label !== undefined ? options.label : true;
        this.cssClass = '';
        // Set mnemonic
        if (this.options.label && options.enableMnemonics) {
            const label = this.action.label;
            if (label) {
                const matches = MENU_MNEMONIC_REGEX.exec(label);
                if (matches) {
                    this.mnemonic = (!!matches[1] ? matches[1] : matches[3]).toLocaleLowerCase();
                }
            }
        }
        // Add mouse up listener later to avoid accidental clicks
        this.runOnceToEnableMouseUp = new RunOnceScheduler(() => {
            if (!this.element) {
                return;
            }
            this._register(addDisposableListener(this.element, EventType.MOUSE_UP, e => {
                // removed default prevention as it conflicts
                // with BaseActionViewItem #101537
                // add back if issues arise and link new issue
                EventHelper.stop(e, true);
                // See https://developer.mozilla.org/en-US/Add-ons/WebExtensions/Interact_with_the_clipboard
                // > Writing to the clipboard
                // > You can use the "cut" and "copy" commands without any special
                // permission if you are using them in a short-lived event handler
                // for a user action (for example, a click handler).
                // => to get the Copy and Paste context menu actions working on Firefox,
                // there should be no timeout here
                if (isFirefox) {
                    const mouseEvent = new StandardMouseEvent(getWindow(this.element), e);
                    // Allowing right click to trigger the event causes the issue described below,
                    // but since the solution below does not work in FF, we must disable right click
                    if (mouseEvent.rightButton) {
                        return;
                    }
                    this.onClick(e);
                }
                // In all other cases, set timeout to allow context menu cancellation to trigger
                // otherwise the action will destroy the menu and a second context menu
                // will still trigger for right click.
                else {
                    setTimeout(() => {
                        this.onClick(e);
                    }, 0);
                }
            }));
            this._register(addDisposableListener(this.element, EventType.CONTEXT_MENU, e => {
                EventHelper.stop(e, true);
            }));
        }, 100);
        this._register(this.runOnceToEnableMouseUp);
    }
    render(container) {
        super.render(container);
        if (!this.element) {
            return;
        }
        this.container = container;
        this.item = append(this.element, $('a.action-menu-item'));
        if (this._action.id === Separator.ID) {
            // A separator is a presentation item
            this.item.setAttribute('role', 'presentation');
        }
        else {
            this.item.setAttribute('role', 'menuitem');
            if (this.mnemonic) {
                this.item.setAttribute('aria-keyshortcuts', `${this.mnemonic}`);
            }
        }
        this.check = append(this.item, $('span.menu-item-check' + ThemeIcon.asCSSSelector(Codicon.menuSelection)));
        this.check.setAttribute('role', 'none');
        this.label = append(this.item, $('span.action-label'));
        if (this.options.label && this.options.keybinding) {
            append(this.item, $('span.keybinding')).textContent = this.options.keybinding;
        }
        // Adds mouse up listener to actually run the action
        this.runOnceToEnableMouseUp.schedule();
        this.updateClass();
        this.updateLabel();
        this.updateTooltip();
        this.updateEnabled();
        this.updateChecked();
        this.applyStyle();
    }
    blur() {
        super.blur();
        this.applyStyle();
    }
    focus() {
        super.focus();
        this.item?.focus();
        this.applyStyle();
    }
    updatePositionInSet(pos, setSize) {
        if (this.item) {
            this.item.setAttribute('aria-posinset', `${pos}`);
            this.item.setAttribute('aria-setsize', `${setSize}`);
        }
    }
    updateLabel() {
        if (!this.label) {
            return;
        }
        if (this.options.label) {
            clearNode(this.label);
            let label = stripIcons(this.action.label);
            if (label) {
                const cleanLabel = cleanMnemonic(label);
                if (!this.options.enableMnemonics) {
                    label = cleanLabel;
                }
                this.label.setAttribute('aria-label', cleanLabel.replace(/&&/g, '&'));
                const matches = MENU_MNEMONIC_REGEX.exec(label);
                if (matches) {
                    label = strings.escape(label);
                    // This is global, reset it
                    MENU_ESCAPED_MNEMONIC_REGEX.lastIndex = 0;
                    let escMatch = MENU_ESCAPED_MNEMONIC_REGEX.exec(label);
                    // We can't use negative lookbehind so if we match our negative and skip
                    while (escMatch && escMatch[1]) {
                        escMatch = MENU_ESCAPED_MNEMONIC_REGEX.exec(label);
                    }
                    const replaceDoubleEscapes = (str) => str.replace(/&amp;&amp;/g, '&amp;');
                    if (escMatch) {
                        this.label.append(strings.ltrim(replaceDoubleEscapes(label.substr(0, escMatch.index)), ' '), $('u', { 'aria-hidden': 'true' }, escMatch[3]), strings.rtrim(replaceDoubleEscapes(label.substr(escMatch.index + escMatch[0].length)), ' '));
                    }
                    else {
                        this.label.innerText = replaceDoubleEscapes(label).trim();
                    }
                    this.item?.setAttribute('aria-keyshortcuts', (!!matches[1] ? matches[1] : matches[3]).toLocaleLowerCase());
                }
                else {
                    this.label.innerText = label.replace(/&&/g, '&').trim();
                }
            }
        }
    }
    updateTooltip() {
        // menus should function like native menus and they do not have tooltips
    }
    updateClass() {
        if (this.cssClass && this.item) {
            this.item.classList.remove(...this.cssClass.split(' '));
        }
        if (this.options.icon && this.label) {
            this.cssClass = this.action.class || '';
            this.label.classList.add('icon');
            if (this.cssClass) {
                this.label.classList.add(...this.cssClass.split(' '));
            }
            this.updateEnabled();
        }
        else if (this.label) {
            this.label.classList.remove('icon');
        }
    }
    updateEnabled() {
        if (this.action.enabled) {
            if (this.element) {
                this.element.classList.remove('disabled');
                this.element.removeAttribute('aria-disabled');
            }
            if (this.item) {
                this.item.classList.remove('disabled');
                this.item.removeAttribute('aria-disabled');
                this.item.tabIndex = 0;
            }
        }
        else {
            if (this.element) {
                this.element.classList.add('disabled');
                this.element.setAttribute('aria-disabled', 'true');
            }
            if (this.item) {
                this.item.classList.add('disabled');
                this.item.setAttribute('aria-disabled', 'true');
            }
        }
    }
    updateChecked() {
        if (!this.item) {
            return;
        }
        const checked = this.action.checked;
        this.item.classList.toggle('checked', !!checked);
        if (checked !== undefined) {
            this.item.setAttribute('role', 'menuitemcheckbox');
            this.item.setAttribute('aria-checked', checked ? 'true' : 'false');
        }
        else {
            this.item.setAttribute('role', 'menuitem');
            this.item.setAttribute('aria-checked', '');
        }
    }
    getMnemonic() {
        return this.mnemonic;
    }
    applyStyle() {
        const isSelected = this.element && this.element.classList.contains('focused');
        const fgColor = isSelected && this.menuStyle.selectionForegroundColor ? this.menuStyle.selectionForegroundColor : this.menuStyle.foregroundColor;
        const bgColor = isSelected && this.menuStyle.selectionBackgroundColor ? this.menuStyle.selectionBackgroundColor : undefined;
        const outline = isSelected && this.menuStyle.selectionBorderColor ? `1px solid ${this.menuStyle.selectionBorderColor}` : '';
        const outlineOffset = isSelected && this.menuStyle.selectionBorderColor ? `-1px` : '';
        if (this.item) {
            this.item.style.color = fgColor ?? '';
            this.item.style.backgroundColor = bgColor ?? '';
            this.item.style.outline = outline;
            this.item.style.outlineOffset = outlineOffset;
        }
        if (this.check) {
            this.check.style.color = fgColor ?? '';
        }
    }
}
class SubmenuMenuActionViewItem extends BaseMenuActionViewItem {
    constructor(action, submenuActions, parentData, submenuOptions, menuStyles) {
        super(action, action, submenuOptions, menuStyles);
        this.submenuActions = submenuActions;
        this.parentData = parentData;
        this.submenuOptions = submenuOptions;
        this.mysubmenu = null;
        this.submenuDisposables = this._register(new DisposableStore());
        this.mouseOver = false;
        this.expandDirection = submenuOptions && submenuOptions.expandDirection !== undefined ? submenuOptions.expandDirection : { horizontal: HorizontalDirection.Right, vertical: VerticalDirection.Below };
        this.showScheduler = new RunOnceScheduler(() => {
            if (this.mouseOver) {
                this.cleanupExistingSubmenu(false);
                this.createSubmenu(false);
            }
        }, 250);
        this.hideScheduler = new RunOnceScheduler(() => {
            if (this.element && (!isAncestor(getActiveElement(), this.element) && this.parentData.submenu === this.mysubmenu)) {
                this.parentData.parent.focus(false);
                this.cleanupExistingSubmenu(true);
            }
        }, 750);
    }
    render(container) {
        super.render(container);
        if (!this.element) {
            return;
        }
        if (this.item) {
            this.item.classList.add('monaco-submenu-item');
            this.item.tabIndex = 0;
            this.item.setAttribute('aria-haspopup', 'true');
            this.updateAriaExpanded('false');
            this.submenuIndicator = append(this.item, $('span.submenu-indicator' + ThemeIcon.asCSSSelector(Codicon.menuSubmenu)));
            this.submenuIndicator.setAttribute('aria-hidden', 'true');
        }
        this._register(addDisposableListener(this.element, EventType.KEY_UP, e => {
            const event = new StandardKeyboardEvent(e);
            if (event.equals(17 /* KeyCode.RightArrow */) || event.equals(3 /* KeyCode.Enter */)) {
                EventHelper.stop(e, true);
                this.createSubmenu(true);
            }
        }));
        this._register(addDisposableListener(this.element, EventType.KEY_DOWN, e => {
            const event = new StandardKeyboardEvent(e);
            if (getActiveElement() === this.item) {
                if (event.equals(17 /* KeyCode.RightArrow */) || event.equals(3 /* KeyCode.Enter */)) {
                    EventHelper.stop(e, true);
                }
            }
        }));
        this._register(addDisposableListener(this.element, EventType.MOUSE_OVER, e => {
            if (!this.mouseOver) {
                this.mouseOver = true;
                this.showScheduler.schedule();
            }
        }));
        this._register(addDisposableListener(this.element, EventType.MOUSE_LEAVE, e => {
            this.mouseOver = false;
        }));
        this._register(addDisposableListener(this.element, EventType.FOCUS_OUT, e => {
            if (this.element && !isAncestor(getActiveElement(), this.element)) {
                this.hideScheduler.schedule();
            }
        }));
        this._register(this.parentData.parent.onScroll(() => {
            if (this.parentData.submenu === this.mysubmenu) {
                this.parentData.parent.focus(false);
                this.cleanupExistingSubmenu(true);
            }
        }));
    }
    updateEnabled() {
        // override on submenu entry
        // native menus do not observe enablement on sumbenus
        // we mimic that behavior
    }
    open(selectFirst) {
        this.cleanupExistingSubmenu(false);
        this.createSubmenu(selectFirst);
    }
    onClick(e) {
        // stop clicking from trying to run an action
        EventHelper.stop(e, true);
        this.cleanupExistingSubmenu(false);
        this.createSubmenu(true);
    }
    cleanupExistingSubmenu(force) {
        if (this.parentData.submenu && (force || (this.parentData.submenu !== this.mysubmenu))) {
            // disposal may throw if the submenu has already been removed
            try {
                this.parentData.submenu.dispose();
            }
            catch { }
            this.parentData.submenu = undefined;
            this.updateAriaExpanded('false');
            if (this.submenuContainer) {
                this.submenuDisposables.clear();
                this.submenuContainer = undefined;
            }
        }
    }
    calculateSubmenuMenuLayout(windowDimensions, submenu, entry, expandDirection) {
        const ret = { top: 0, left: 0 };
        // Start with horizontal
        ret.left = layout(windowDimensions.width, submenu.width, { position: expandDirection.horizontal === HorizontalDirection.Right ? 0 /* LayoutAnchorPosition.Before */ : 1 /* LayoutAnchorPosition.After */, offset: entry.left, size: entry.width });
        // We don't have enough room to layout the menu fully, so we are overlapping the menu
        if (ret.left >= entry.left && ret.left < entry.left + entry.width) {
            if (entry.left + 10 + submenu.width <= windowDimensions.width) {
                ret.left = entry.left + 10;
            }
            entry.top += 10;
            entry.height = 0;
        }
        // Now that we have a horizontal position, try layout vertically
        ret.top = layout(windowDimensions.height, submenu.height, { position: 0 /* LayoutAnchorPosition.Before */, offset: entry.top, size: 0 });
        // We didn't have enough room below, but we did above, so we shift down to align the menu
        if (ret.top + submenu.height === entry.top && ret.top + entry.height + submenu.height <= windowDimensions.height) {
            ret.top += entry.height;
        }
        return ret;
    }
    createSubmenu(selectFirstItem = true) {
        if (!this.element) {
            return;
        }
        if (!this.parentData.submenu) {
            this.updateAriaExpanded('true');
            this.submenuContainer = append(this.element, $('div.monaco-submenu'));
            this.submenuContainer.classList.add('menubar-menu-items-holder', 'context-view');
            // Set the top value of the menu container before construction
            // This allows the menu constructor to calculate the proper max height
            const computedStyles = getWindow(this.parentData.parent.domNode).getComputedStyle(this.parentData.parent.domNode);
            const paddingTop = parseFloat(computedStyles.paddingTop || '0') || 0;
            this.submenuContainer.style.position = 'fixed';
            this.submenuContainer.style.top = '0';
            this.submenuContainer.style.left = '0';
            this.parentData.submenu = new Menu(this.submenuContainer, this.submenuActions.length ? this.submenuActions : [new EmptySubmenuAction()], this.submenuOptions, this.menuStyle);
            // layout submenu
            const entryBox = this.element.getBoundingClientRect();
            const entryBoxUpdated = {
                top: entryBox.top - paddingTop,
                left: entryBox.left,
                height: entryBox.height + 2 * paddingTop,
                width: entryBox.width
            };
            const viewBox = this.submenuContainer.getBoundingClientRect();
            const window = getWindow(this.element);
            const { top, left } = this.calculateSubmenuMenuLayout(new Dimension(window.innerWidth, window.innerHeight), Dimension.lift(viewBox), entryBoxUpdated, this.expandDirection);
            // subtract offsets caused by transform parent
            this.submenuContainer.style.left = `${left - viewBox.left}px`;
            this.submenuContainer.style.top = `${top - viewBox.top}px`;
            this.submenuDisposables.add(addDisposableListener(this.submenuContainer, EventType.KEY_UP, e => {
                const event = new StandardKeyboardEvent(e);
                if (event.equals(15 /* KeyCode.LeftArrow */)) {
                    EventHelper.stop(e, true);
                    this.parentData.parent.focus();
                    this.cleanupExistingSubmenu(true);
                }
            }));
            this.submenuDisposables.add(addDisposableListener(this.submenuContainer, EventType.KEY_DOWN, e => {
                const event = new StandardKeyboardEvent(e);
                if (event.equals(15 /* KeyCode.LeftArrow */)) {
                    EventHelper.stop(e, true);
                }
            }));
            this.submenuDisposables.add(this.parentData.submenu.onDidCancel(() => {
                this.parentData.parent.focus();
                this.cleanupExistingSubmenu(true);
            }));
            this.parentData.submenu.focus(selectFirstItem);
            this.mysubmenu = this.parentData.submenu;
        }
        else {
            this.parentData.submenu.focus(false);
        }
    }
    updateAriaExpanded(value) {
        if (this.item) {
            this.item?.setAttribute('aria-expanded', value);
        }
    }
    applyStyle() {
        super.applyStyle();
        const isSelected = this.element && this.element.classList.contains('focused');
        const fgColor = isSelected && this.menuStyle.selectionForegroundColor ? this.menuStyle.selectionForegroundColor : this.menuStyle.foregroundColor;
        if (this.submenuIndicator) {
            this.submenuIndicator.style.color = fgColor ?? '';
        }
    }
    dispose() {
        super.dispose();
        this.hideScheduler.dispose();
        if (this.mysubmenu) {
            this.mysubmenu.dispose();
            this.mysubmenu = null;
        }
        if (this.submenuContainer) {
            this.submenuContainer = undefined;
        }
    }
}
class MenuSeparatorActionViewItem extends ActionViewItem {
    constructor(context, action, options, menuStyles) {
        super(context, action, options);
        this.menuStyles = menuStyles;
    }
    render(container) {
        super.render(container);
        if (this.label) {
            this.label.style.borderBottomColor = this.menuStyles.separatorColor ? `${this.menuStyles.separatorColor}` : '';
        }
    }
}
export function cleanMnemonic(label) {
    const regex = MENU_MNEMONIC_REGEX;
    const matches = regex.exec(label);
    if (!matches) {
        return label;
    }
    const mnemonicInText = !matches[1];
    return label.replace(regex, mnemonicInText ? '$2$3' : '').trim();
}
export function formatRule(c) {
    const fontCharacter = getCodiconFontCharacters()[c.id];
    return `.codicon-${c.id}:before { content: '\\${fontCharacter.toString(16)}'; }`;
}
function getMenuWidgetCSS(style, isForShadowDom) {
    let result = /* css */ `
.monaco-menu {
	font-size: 13px;
	border-radius: 5px;
	min-width: 160px;
}

${formatRule(Codicon.menuSelection)}
${formatRule(Codicon.menuSubmenu)}

.monaco-menu .monaco-action-bar {
	text-align: right;
	overflow: hidden;
	white-space: nowrap;
}

.monaco-menu .monaco-action-bar .actions-container {
	display: flex;
	margin: 0 auto;
	padding: 0;
	width: 100%;
	justify-content: flex-end;
}

.monaco-menu .monaco-action-bar.vertical .actions-container {
	display: inline-block;
}

.monaco-menu .monaco-action-bar.reverse .actions-container {
	flex-direction: row-reverse;
}

.monaco-menu .monaco-action-bar .action-item {
	cursor: pointer;
	display: inline-block;
	transition: transform 50ms ease;
	position: relative;  /* DO NOT REMOVE - this is the key to preventing the ghosting icon bug in Chrome 42 */
}

.monaco-menu .monaco-action-bar .action-item.disabled {
	cursor: default;
}

.monaco-menu .monaco-action-bar .action-item .icon,
.monaco-menu .monaco-action-bar .action-item .codicon {
	display: inline-block;
}

.monaco-menu .monaco-action-bar .action-item .codicon {
	display: flex;
	align-items: center;
}

.monaco-menu .monaco-action-bar .action-label {
	font-size: 11px;
	margin-right: 4px;
}

.monaco-menu .monaco-action-bar .action-item.disabled .action-label,
.monaco-menu .monaco-action-bar .action-item.disabled .action-label:hover {
	color: var(--vscode-disabledForeground);
}

/* Vertical actions */

.monaco-menu .monaco-action-bar.vertical {
	text-align: left;
}

.monaco-menu .monaco-action-bar.vertical .action-item {
	display: block;
}

.monaco-menu .monaco-action-bar.vertical .action-label.separator {
	display: block;
	border-bottom: 1px solid var(--vscode-menu-separatorBackground);
	padding-top: 1px;
	padding: 30px;
}

.monaco-menu .secondary-actions .monaco-action-bar .action-label {
	margin-left: 6px;
}

/* Action Items */
.monaco-menu .monaco-action-bar .action-item.select-container {
	overflow: hidden; /* somehow the dropdown overflows its container, we prevent it here to not push */
	flex: 1;
	max-width: 170px;
	min-width: 60px;
	display: flex;
	align-items: center;
	justify-content: center;
	margin-right: 10px;
}

.monaco-menu .monaco-action-bar.vertical {
	margin-left: 0;
	overflow: visible;
}

.monaco-menu .monaco-action-bar.vertical .actions-container {
	display: block;
}

.monaco-menu .monaco-action-bar.vertical .action-item {
	padding: 0;
	transform: none;
	display: flex;
}

.monaco-menu .monaco-action-bar.vertical .action-item.active {
	transform: none;
}

.monaco-menu .monaco-action-bar.vertical .action-menu-item {
	flex: 1 1 auto;
	display: flex;
	height: 2em;
	align-items: center;
	position: relative;
	margin: 0 4px;
	border-radius: 4px;
}

.monaco-menu .monaco-action-bar.vertical .action-menu-item:hover .keybinding,
.monaco-menu .monaco-action-bar.vertical .action-menu-item:focus .keybinding {
	opacity: unset;
}

.monaco-menu .monaco-action-bar.vertical .action-label {
	flex: 1 1 auto;
	text-decoration: none;
	padding: 0 1em;
	background: none;
	font-size: 12px;
	line-height: 1;
}

.monaco-menu .monaco-action-bar.vertical .keybinding,
.monaco-menu .monaco-action-bar.vertical .submenu-indicator {
	display: inline-block;
	flex: 2 1 auto;
	padding: 0 1em;
	text-align: right;
	font-size: 12px;
	line-height: 1;
	opacity: 0.7;
}

.monaco-menu .monaco-action-bar.vertical .submenu-indicator {
	height: 100%;
}

.monaco-menu .monaco-action-bar.vertical .submenu-indicator.codicon {
	font-size: 16px !important;
	display: flex;
	align-items: center;
}

.monaco-menu .monaco-action-bar.vertical .submenu-indicator.codicon::before {
	margin-left: auto;
	margin-right: -20px;
}

.monaco-menu .monaco-action-bar.vertical .action-item.disabled .keybinding,
.monaco-menu .monaco-action-bar.vertical .action-item.disabled .submenu-indicator {
	opacity: 0.4;
}

.monaco-menu .monaco-action-bar.vertical .action-label:not(.separator) {
	display: inline-block;
	box-sizing: border-box;
	margin: 0;
}

.monaco-menu .monaco-action-bar.vertical .action-item {
	position: static;
	overflow: visible;
}

.monaco-menu .monaco-action-bar.vertical .action-item .monaco-submenu {
	position: absolute;
}

.monaco-menu .monaco-action-bar.vertical .action-label.separator {
	width: 100%;
	height: 0px !important;
	opacity: 1;
}

.monaco-menu .monaco-action-bar.vertical .action-label.separator.text {
	padding: 0.7em 1em 0.1em 1em;
	font-weight: bold;
	opacity: 1;
}

.monaco-menu .monaco-action-bar.vertical .action-label:hover {
	color: inherit;
}

.monaco-menu .monaco-action-bar.vertical .menu-item-check {
	position: absolute;
	visibility: hidden;
	width: 1em;
	height: 100%;
}

.monaco-menu .monaco-action-bar.vertical .action-menu-item.checked .menu-item-check {
	visibility: visible;
	display: flex;
	align-items: center;
	justify-content: center;
}

/* Context Menu */

.context-view.monaco-menu-container {
	outline: 0;
	border: none;
	animation: fadeIn 0.083s linear;
	-webkit-app-region: no-drag;
}

.context-view.monaco-menu-container :focus,
.context-view.monaco-menu-container .monaco-action-bar.vertical:focus,
.context-view.monaco-menu-container .monaco-action-bar.vertical :focus {
	outline: 0;
}

.hc-black .context-view.monaco-menu-container,
.hc-light .context-view.monaco-menu-container,
:host-context(.hc-black) .context-view.monaco-menu-container,
:host-context(.hc-light) .context-view.monaco-menu-container {
	box-shadow: none;
}

.hc-black .monaco-menu .monaco-action-bar.vertical .action-item.focused,
.hc-light .monaco-menu .monaco-action-bar.vertical .action-item.focused,
:host-context(.hc-black) .monaco-menu .monaco-action-bar.vertical .action-item.focused,
:host-context(.hc-light) .monaco-menu .monaco-action-bar.vertical .action-item.focused {
	background: none;
}

/* Vertical Action Bar Styles */

.monaco-menu .monaco-action-bar.vertical {
	padding: 4px 0;
}

.monaco-menu .monaco-action-bar.vertical .action-menu-item {
	height: 2em;
}

.monaco-menu .monaco-action-bar.vertical .action-label:not(.separator),
.monaco-menu .monaco-action-bar.vertical .keybinding {
	font-size: inherit;
	padding: 0 2em;
	max-height: 100%;
}

.monaco-menu .monaco-action-bar.vertical .menu-item-check {
	font-size: inherit;
	width: 2em;
}

.monaco-menu .monaco-action-bar.vertical .action-label.separator {
	font-size: inherit;
	margin: 5px 0 !important;
	padding: 0;
	border-radius: 0;
}

.linux .monaco-menu .monaco-action-bar.vertical .action-label.separator,
:host-context(.linux) .monaco-menu .monaco-action-bar.vertical .action-label.separator {
	margin-left: 0;
	margin-right: 0;
}

.monaco-menu .monaco-action-bar.vertical .submenu-indicator {
	font-size: 60%;
	padding: 0 1.8em;
}

.linux .monaco-menu .monaco-action-bar.vertical .submenu-indicator,
:host-context(.linux) .monaco-menu .monaco-action-bar.vertical .submenu-indicator {
	height: 100%;
	mask-size: 10px 10px;
	-webkit-mask-size: 10px 10px;
}

.monaco-menu .action-item {
	cursor: default;
}`;
    if (isForShadowDom) {
        // Only define scrollbar styles when used inside shadow dom,
        // otherwise leave their styling to the global workbench styling.
        result += `
			/* Arrows */
			.monaco-scrollable-element > .scrollbar > .scra {
				cursor: pointer;
				font-size: 11px !important;
			}

			.monaco-scrollable-element > .visible {
				opacity: 1;

				/* Background rule added for IE9 - to allow clicks on dom node */
				background:rgba(0,0,0,0);

				transition: opacity 100ms linear;
			}
			.monaco-scrollable-element > .invisible {
				opacity: 0;
				pointer-events: none;
			}
			.monaco-scrollable-element > .invisible.fade {
				transition: opacity 800ms linear;
			}

			/* Scrollable Content Inset Shadow */
			.monaco-scrollable-element > .shadow {
				position: absolute;
				display: none;
			}
			.monaco-scrollable-element > .shadow.top {
				display: block;
				top: 0;
				left: 3px;
				height: 3px;
				width: 100%;
			}
			.monaco-scrollable-element > .shadow.left {
				display: block;
				top: 3px;
				left: 0;
				height: 100%;
				width: 3px;
			}
			.monaco-scrollable-element > .shadow.top-left-corner {
				display: block;
				top: 0;
				left: 0;
				height: 3px;
				width: 3px;
			}
			/* Fix for https://github.com/microsoft/vscode/issues/103170 */
			.monaco-menu .action-item .monaco-submenu {
				z-index: 1;
			}
		`;
        // Scrollbars
        const scrollbarShadowColor = style.scrollbarShadow;
        if (scrollbarShadowColor) {
            result += `
				.monaco-scrollable-element > .shadow.top {
					box-shadow: ${scrollbarShadowColor} 0 6px 6px -6px inset;
				}

				.monaco-scrollable-element > .shadow.left {
					box-shadow: ${scrollbarShadowColor} 6px 0 6px -6px inset;
				}

				.monaco-scrollable-element > .shadow.top.left {
					box-shadow: ${scrollbarShadowColor} 6px 6px 6px -6px inset;
				}
			`;
        }
        const scrollbarSliderBackgroundColor = style.scrollbarSliderBackground;
        if (scrollbarSliderBackgroundColor) {
            result += `
				.monaco-scrollable-element > .scrollbar > .slider {
					background: ${scrollbarSliderBackgroundColor};
				}
			`;
        }
        const scrollbarSliderHoverBackgroundColor = style.scrollbarSliderHoverBackground;
        if (scrollbarSliderHoverBackgroundColor) {
            result += `
				.monaco-scrollable-element > .scrollbar > .slider:hover {
					background: ${scrollbarSliderHoverBackgroundColor};
				}
			`;
        }
        const scrollbarSliderActiveBackgroundColor = style.scrollbarSliderActiveBackground;
        if (scrollbarSliderActiveBackgroundColor) {
            result += `
				.monaco-scrollable-element > .scrollbar > .slider.active {
					background: ${scrollbarSliderActiveBackgroundColor};
				}
			`;
        }
    }
    return result;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVudS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2Jyb3dzZXIvdWkvbWVudS9tZW51LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUM3QyxPQUFPLEVBQUUsU0FBUyxJQUFJLGNBQWMsRUFBRSxPQUFPLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQUN0RSxPQUFPLEVBQUUsQ0FBQyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLFdBQVcsRUFBYSxTQUFTLEVBQUUsZ0JBQWdCLEVBQUUsU0FBUyxFQUF3QixVQUFVLEVBQUUsYUFBYSxFQUFFLE1BQU0sY0FBYyxDQUFDO0FBQ3ZNLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBQzNELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQy9ELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBQ3pELE9BQU8sRUFBRSxTQUFTLEVBQStDLE1BQU0sMkJBQTJCLENBQUM7QUFDbkcsT0FBTyxFQUFFLGNBQWMsRUFBRSxrQkFBa0IsRUFBMEIsTUFBTSxpQ0FBaUMsQ0FBQztBQUM3RyxPQUFPLEVBQW1CLE1BQU0sRUFBd0IsTUFBTSwrQkFBK0IsQ0FBQztBQUM5RixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN6RSxPQUFPLEVBQUUsa0JBQWtCLEVBQTBCLFNBQVMsRUFBRSxhQUFhLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUNsSCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUM1RCxPQUFPLEVBQUUsT0FB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