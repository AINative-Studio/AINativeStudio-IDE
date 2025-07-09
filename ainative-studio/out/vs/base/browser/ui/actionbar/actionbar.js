/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as DOM from '../../dom.js';
import { StandardKeyboardEvent } from '../../keyboardEvent.js';
import { ActionViewItem, BaseActionViewItem } from './actionViewItems.js';
import { createInstantHoverDelegate } from '../hover/hoverDelegateFactory.js';
import { ActionRunner, Separator } from '../../../common/actions.js';
import { Emitter } from '../../../common/event.js';
import { Disposable, DisposableMap, DisposableStore, dispose } from '../../../common/lifecycle.js';
import * as types from '../../../common/types.js';
import './actionbar.css';
export var ActionsOrientation;
(function (ActionsOrientation) {
    ActionsOrientation[ActionsOrientation["HORIZONTAL"] = 0] = "HORIZONTAL";
    ActionsOrientation[ActionsOrientation["VERTICAL"] = 1] = "VERTICAL";
})(ActionsOrientation || (ActionsOrientation = {}));
export class ActionBar extends Disposable {
    constructor(container, options = {}) {
        super();
        this._actionRunnerDisposables = this._register(new DisposableStore());
        this.viewItemDisposables = this._register(new DisposableMap());
        // Trigger Key Tracking
        this.triggerKeyDown = false;
        this.focusable = true;
        this._onDidBlur = this._register(new Emitter());
        this.onDidBlur = this._onDidBlur.event;
        this._onDidCancel = this._register(new Emitter({ onWillAddFirstListener: () => this.cancelHasListener = true }));
        this.onDidCancel = this._onDidCancel.event;
        this.cancelHasListener = false;
        this._onDidRun = this._register(new Emitter());
        this.onDidRun = this._onDidRun.event;
        this._onWillRun = this._register(new Emitter());
        this.onWillRun = this._onWillRun.event;
        this.options = options;
        this._context = options.context ?? null;
        this._orientation = this.options.orientation ?? 0 /* ActionsOrientation.HORIZONTAL */;
        this._triggerKeys = {
            keyDown: this.options.triggerKeys?.keyDown ?? false,
            keys: this.options.triggerKeys?.keys ?? [3 /* KeyCode.Enter */, 10 /* KeyCode.Space */]
        };
        this._hoverDelegate = options.hoverDelegate ?? this._register(createInstantHoverDelegate());
        if (this.options.actionRunner) {
            this._actionRunner = this.options.actionRunner;
        }
        else {
            this._actionRunner = new ActionRunner();
            this._actionRunnerDisposables.add(this._actionRunner);
        }
        this._actionRunnerDisposables.add(this._actionRunner.onDidRun(e => this._onDidRun.fire(e)));
        this._actionRunnerDisposables.add(this._actionRunner.onWillRun(e => this._onWillRun.fire(e)));
        this.viewItems = [];
        this.focusedItem = undefined;
        this.domNode = document.createElement('div');
        this.domNode.className = 'monaco-action-bar';
        let previousKeys;
        let nextKeys;
        switch (this._orientation) {
            case 0 /* ActionsOrientation.HORIZONTAL */:
                previousKeys = [15 /* KeyCode.LeftArrow */];
                nextKeys = [17 /* KeyCode.RightArrow */];
                break;
            case 1 /* ActionsOrientation.VERTICAL */:
                previousKeys = [16 /* KeyCode.UpArrow */];
                nextKeys = [18 /* KeyCode.DownArrow */];
                this.domNode.className += ' vertical';
                break;
        }
        this._register(DOM.addDisposableListener(this.domNode, DOM.EventType.KEY_DOWN, e => {
            const event = new StandardKeyboardEvent(e);
            let eventHandled = true;
            const focusedItem = typeof this.focusedItem === 'number' ? this.viewItems[this.focusedItem] : undefined;
            if (previousKeys && (event.equals(previousKeys[0]) || event.equals(previousKeys[1]))) {
                eventHandled = this.focusPrevious();
            }
            else if (nextKeys && (event.equals(nextKeys[0]) || event.equals(nextKeys[1]))) {
                eventHandled = this.focusNext();
            }
            else if (event.equals(9 /* KeyCode.Escape */) && this.cancelHasListener) {
                this._onDidCancel.fire();
            }
            else if (event.equals(14 /* KeyCode.Home */)) {
                eventHandled = this.focusFirst();
            }
            else if (event.equals(13 /* KeyCode.End */)) {
                eventHandled = this.focusLast();
            }
            else if (event.equals(2 /* KeyCode.Tab */) && focusedItem instanceof BaseActionViewItem && focusedItem.trapsArrowNavigation) {
                // Tab, so forcibly focus next #219199
                eventHandled = this.focusNext(undefined, true);
            }
            else if (this.isTriggerKeyEvent(event)) {
                // Staying out of the else branch even if not triggered
                if (this._triggerKeys.keyDown) {
                    this.doTrigger(event);
                }
                else {
                    this.triggerKeyDown = true;
                }
            }
            else {
                eventHandled = false;
            }
            if (eventHandled) {
                event.preventDefault();
                event.stopPropagation();
            }
        }));
        this._register(DOM.addDisposableListener(this.domNode, DOM.EventType.KEY_UP, e => {
            const event = new StandardKeyboardEvent(e);
            // Run action on Enter/Space
            if (this.isTriggerKeyEvent(event)) {
                if (!this._triggerKeys.keyDown && this.triggerKeyDown) {
                    this.triggerKeyDown = false;
                    this.doTrigger(event);
                }
                event.preventDefault();
                event.stopPropagation();
            }
            // Recompute focused item
            else if (event.equals(2 /* KeyCode.Tab */) || event.equals(1024 /* KeyMod.Shift */ | 2 /* KeyCode.Tab */) || event.equals(16 /* KeyCode.UpArrow */) || event.equals(18 /* KeyCode.DownArrow */) || event.equals(15 /* KeyCode.LeftArrow */) || event.equals(17 /* KeyCode.RightArrow */)) {
                this.updateFocusedItem();
            }
        }));
        this.focusTracker = this._register(DOM.trackFocus(this.domNode));
        this._register(this.focusTracker.onDidBlur(() => {
            if (DOM.getActiveElement() === this.domNode || !DOM.isAncestor(DOM.getActiveElement(), this.domNode)) {
                this._onDidBlur.fire();
                this.previouslyFocusedItem = this.focusedItem;
                this.focusedItem = undefined;
                this.triggerKeyDown = false;
            }
        }));
        this._register(this.focusTracker.onDidFocus(() => this.updateFocusedItem()));
        this.actionsList = document.createElement('ul');
        this.actionsList.className = 'actions-container';
        if (this.options.highlightToggledItems) {
            this.actionsList.classList.add('highlight-toggled');
        }
        this.actionsList.setAttribute('role', this.options.ariaRole || 'toolbar');
        if (this.options.ariaLabel) {
            this.actionsList.setAttribute('aria-label', this.options.ariaLabel);
        }
        this.domNode.appendChild(this.actionsList);
        container.appendChild(this.domNode);
    }
    refreshRole() {
        if (this.length() >= 1) {
            this.actionsList.setAttribute('role', this.options.ariaRole || 'toolbar');
        }
        else {
            this.actionsList.setAttribute('role', 'presentation');
        }
    }
    setAriaLabel(label) {
        if (label) {
            this.actionsList.setAttribute('aria-label', label);
        }
        else {
            this.actionsList.removeAttribute('aria-label');
        }
    }
    // Some action bars should not be focusable at times
    // When an action bar is not focusable make sure to make all the elements inside it not focusable
    // When an action bar is focusable again, make sure the first item can be focused
    setFocusable(focusable) {
        this.focusable = focusable;
        if (this.focusable) {
            const firstEnabled = this.viewItems.find(vi => vi instanceof BaseActionViewItem && vi.isEnabled());
            if (firstEnabled instanceof BaseActionViewItem) {
                firstEnabled.setFocusable(true);
            }
        }
        else {
            this.viewItems.forEach(vi => {
                if (vi instanceof BaseActionViewItem) {
                    vi.setFocusable(false);
                }
            });
        }
    }
    isTriggerKeyEvent(event) {
        let ret = false;
        this._triggerKeys.keys.forEach(keyCode => {
            ret = ret || event.equals(keyCode);
        });
        return ret;
    }
    updateFocusedItem() {
        for (let i = 0; i < this.actionsList.children.length; i++) {
            const elem = this.actionsList.children[i];
            if (DOM.isAncestor(DOM.getActiveElement(), elem)) {
                this.focusedItem = i;
                this.viewItems[this.focusedItem]?.showHover?.();
                break;
            }
        }
    }
    get context() {
        return this._context;
    }
    set context(context) {
        this._context = context;
        this.viewItems.forEach(i => i.setActionContext(context));
    }
    get actionRunner() {
        return this._actionRunner;
    }
    set actionRunner(actionRunner) {
        this._actionRunner = actionRunner;
        // when setting a new `IActionRunner` make sure to dispose old listeners and
        // start to forward events from the new listener
        this._actionRunnerDisposables.clear();
        this._actionRunnerDisposables.add(this._actionRunner.onDidRun(e => this._onDidRun.fire(e)));
        this._actionRunnerDisposables.add(this._actionRunner.onWillRun(e => this._onWillRun.fire(e)));
        this.viewItems.forEach(item => item.actionRunner = actionRunner);
    }
    getContainer() {
        return this.domNode;
    }
    hasAction(action) {
        return this.viewItems.findIndex(candidate => candidate.action.id === action.id) !== -1;
    }
    getAction(indexOrElement) {
        // by index
        if (typeof indexOrElement === 'number') {
            return this.viewItems[indexOrElement]?.action;
        }
        // by element
        if (DOM.isHTMLElement(indexOrElement)) {
            while (indexOrElement.parentElement !== this.actionsList) {
                if (!indexOrElement.parentElement) {
                    return undefined;
                }
                indexOrElement = indexOrElement.parentElement;
            }
            for (let i = 0; i < this.actionsList.childNodes.length; i++) {
                if (this.actionsList.childNodes[i] === indexOrElement) {
                    return this.viewItems[i].action;
                }
            }
        }
        return undefined;
    }
    push(arg, options = {}) {
        const actions = Array.isArray(arg) ? arg : [arg];
        let index = types.isNumber(options.index) ? options.index : null;
        actions.forEach((action) => {
            const actionViewItemElement = document.createElement('li');
            actionViewItemElement.className = 'action-item';
            actionViewItemElement.setAttribute('role', 'presentation');
            let item;
            const viewItemOptions = { hoverDelegate: this._hoverDelegate, ...options, isTabList: this.options.ariaRole === 'tablist' };
            if (this.options.actionViewItemProvider) {
                item = this.options.actionViewItemProvider(action, viewItemOptions);
            }
            if (!item) {
                item = new ActionViewItem(this.context, action, viewItemOptions);
            }
            // Prevent native context menu on actions
            if (!this.options.allowContextMenu) {
                this.viewItemDisposables.set(item, DOM.addDisposableListener(actionViewItemElement, DOM.EventType.CONTEXT_MENU, (e) => {
                    DOM.EventHelper.stop(e, true);
                }));
            }
            item.actionRunner = this._actionRunner;
            item.setActionContext(this.context);
            item.render(actionViewItemElement);
            if (this.focusable && item instanceof BaseActionViewItem && this.viewItems.length === 0) {
                // We need to allow for the first enabled item to be focused on using tab navigation #106441
                item.setFocusable(true);
            }
            if (index === null || index < 0 || index >= this.actionsList.children.length) {
                this.actionsList.appendChild(actionViewItemElement);
                this.viewItems.push(item);
            }
            else {
                this.actionsList.insertBefore(actionViewItemElement, this.actionsList.children[index]);
                this.viewItems.splice(index, 0, item);
                index++;
            }
        });
        if (typeof this.focusedItem === 'number') {
            // After a clear actions might be re-added to simply toggle some actions. We should preserve focus #97128
            this.focus(this.focusedItem);
        }
        this.refreshRole();
    }
    getWidth(index) {
        if (index >= 0 && index < this.actionsList.children.length) {
            const item = this.actionsList.children.item(index);
            if (item) {
                return item.clientWidth;
            }
        }
        return 0;
    }
    getHeight(index) {
        if (index >= 0 && index < this.actionsList.children.length) {
            const item = this.actionsList.children.item(index);
            if (item) {
                return item.clientHeight;
            }
        }
        return 0;
    }
    pull(index) {
        if (index >= 0 && index < this.viewItems.length) {
            this.actionsList.childNodes[index].remove();
            this.viewItemDisposables.deleteAndDispose(this.viewItems[index]);
            dispose(this.viewItems.splice(index, 1));
            this.refreshRole();
        }
    }
    clear() {
        if (this.isEmpty()) {
            return;
        }
        this.viewItems = dispose(this.viewItems);
        this.viewItemDisposables.clearAndDisposeAll();
        DOM.clearNode(this.actionsList);
        this.refreshRole();
    }
    length() {
        return this.viewItems.length;
    }
    isEmpty() {
        return this.viewItems.length === 0;
    }
    focus(arg) {
        let selectFirst = false;
        let index = undefined;
        if (arg === undefined) {
            selectFirst = true;
        }
        else if (typeof arg === 'number') {
            index = arg;
        }
        else if (typeof arg === 'boolean') {
            selectFirst = arg;
        }
        if (selectFirst && typeof this.focusedItem === 'undefined') {
            const firstEnabled = this.viewItems.findIndex(item => item.isEnabled());
            // Focus the first enabled item
            this.focusedItem = firstEnabled === -1 ? undefined : firstEnabled;
            this.updateFocus(undefined, undefined, true);
        }
        else {
            if (index !== undefined) {
                this.focusedItem = index;
            }
            this.updateFocus(undefined, undefined, true);
        }
    }
    focusFirst() {
        this.focusedItem = this.length() - 1;
        return this.focusNext(true);
    }
    focusLast() {
        this.focusedItem = 0;
        return this.focusPrevious(true);
    }
    focusNext(forceLoop, forceFocus) {
        if (typeof this.focusedItem === 'undefined') {
            this.focusedItem = this.viewItems.length - 1;
        }
        else if (this.viewItems.length <= 1) {
            return false;
        }
        const startIndex = this.focusedItem;
        let item;
        do {
            if (!forceLoop && this.options.preventLoopNavigation && this.focusedItem + 1 >= this.viewItems.length) {
                this.focusedItem = startIndex;
                return false;
            }
            this.focusedItem = (this.focusedItem + 1) % this.viewItems.length;
            item = this.viewItems[this.focusedItem];
        } while (this.focusedItem !== startIndex && ((this.options.focusOnlyEnabledItems && !item.isEnabled()) || item.action.id === Separator.ID));
        this.updateFocus(undefined, undefined, forceFocus);
        return true;
    }
    focusPrevious(forceLoop) {
        if (typeof this.focusedItem === 'undefined') {
            this.focusedItem = 0;
        }
        else if (this.viewItems.length <= 1) {
            return false;
        }
        const startIndex = this.focusedItem;
        let item;
        do {
            this.focusedItem = this.focusedItem - 1;
            if (this.focusedItem < 0) {
                if (!forceLoop && this.options.preventLoopNavigation) {
                    this.focusedItem = startIndex;
                    return false;
                }
                this.focusedItem = this.viewItems.length - 1;
            }
            item = this.viewItems[this.focusedItem];
        } while (this.focusedItem !== startIndex && ((this.options.focusOnlyEnabledItems && !item.isEnabled()) || item.action.id === Separator.ID));
        this.updateFocus(true);
        return true;
    }
    updateFocus(fromRight, preventScroll, forceFocus = false) {
        if (typeof this.focusedItem === 'undefined') {
            this.actionsList.focus({ preventScroll });
        }
        if (this.previouslyFocusedItem !== undefined && this.previouslyFocusedItem !== this.focusedItem) {
            this.viewItems[this.previouslyFocusedItem]?.blur();
        }
        const actionViewItem = this.focusedItem !== undefined ? this.viewItems[this.focusedItem] : undefined;
        if (actionViewItem) {
            let focusItem = true;
            if (!types.isFunction(actionViewItem.focus)) {
                focusItem = false;
            }
            if (this.options.focusOnlyEnabledItems && types.isFunction(actionViewItem.isEnabled) && !actionViewItem.isEnabled()) {
                focusItem = false;
            }
            if (actionViewItem.action.id === Separator.ID) {
                focusItem = false;
            }
            if (!focusItem) {
                this.actionsList.focus({ preventScroll });
                this.previouslyFocusedItem = undefined;
            }
            else if (forceFocus || this.previouslyFocusedItem !== this.focusedItem) {
                actionViewItem.focus(fromRight);
                this.previouslyFocusedItem = this.focusedItem;
            }
            if (focusItem) {
                actionViewItem.showHover?.();
            }
        }
    }
    doTrigger(event) {
        if (typeof this.focusedItem === 'undefined') {
            return; //nothing to focus
        }
        // trigger action
        const actionViewItem = this.viewItems[this.focusedItem];
        if (actionViewItem instanceof BaseActionViewItem) {
            const context = (actionViewItem._context === null || actionViewItem._context === undefined) ? event : actionViewItem._context;
            this.run(actionViewItem._action, context);
        }
    }
    async run(action, context) {
        await this._actionRunner.run(action, context);
    }
    dispose() {
        this._context = undefined;
        this.viewItems = dispose(this.viewItems);
        this.getContainer().remove();
        super.dispose();
    }
}
export function prepareActions(actions) {
    if (!actions.length) {
        return actions;
    }
    // Clean up leading separators
    let firstIndexOfAction = -1;
    for (let i = 0; i < actions.length; i++) {
        if (actions[i].id === Separator.ID) {
            continue;
        }
        firstIndexOfAction = i;
        break;
    }
    if (firstIndexOfAction === -1) {
        return [];
    }
    actions = actions.slice(firstIndexOfAction);
    // Clean up trailing separators
    for (let h = actions.length - 1; h >= 0; h--) {
        const isSeparator = actions[h].id === Separator.ID;
        if (isSeparator) {
            actions.splice(h, 1);
        }
        else {
            break;
        }
    }
    // Clean up separator duplicates
    let foundAction = false;
    for (let k = actions.length - 1; k >= 0; k--) {
        const isSeparator = actions[k].id === Separator.ID;
        if (isSeparator && !foundAction) {
            actions.splice(k, 1);
        }
        else if (!isSeparator) {
            foundAction = true;
        }
        else if (isSeparator) {
            foundAction = false;
        }
    }
    return actions;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWN0aW9uYmFyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvYnJvd3Nlci91aS9hY3Rpb25iYXIvYWN0aW9uYmFyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sY0FBYyxDQUFDO0FBQ3BDLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQy9ELE9BQU8sRUFBRSxjQUFjLEVBQUUsa0JBQWtCLEVBQTBCLE1BQU0sc0JBQXNCLENBQUM7QUFDbEcsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFFOUUsT0FBTyxFQUFFLFlBQVksRUFBcUMsU0FBUyxFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDeEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBRW5ELE9BQU8sRUFBRSxVQUFVLEVBQUUsYUFBYSxFQUFFLGVBQWUsRUFBRSxPQUFPLEVBQWUsTUFBTSw4QkFBOEIsQ0FBQztBQUNoSCxPQUFPLEtBQUssS0FBSyxNQUFNLDBCQUEwQixDQUFDO0FBQ2xELE9BQU8saUJBQWlCLENBQUM7QUFpQnpCLE1BQU0sQ0FBTixJQUFrQixrQkFHakI7QUFIRCxXQUFrQixrQkFBa0I7SUFDbkMsdUVBQVUsQ0FBQTtJQUNWLG1FQUFRLENBQUE7QUFDVCxDQUFDLEVBSGlCLGtCQUFrQixLQUFsQixrQkFBa0IsUUFHbkM7QUErQkQsTUFBTSxPQUFPLFNBQVUsU0FBUSxVQUFVO0lBMkN4QyxZQUFZLFNBQXNCLEVBQUUsVUFBNkIsRUFBRTtRQUNsRSxLQUFLLEVBQUUsQ0FBQztRQXRDUSw2QkFBd0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksZUFBZSxFQUFFLENBQUMsQ0FBQztRQVVqRSx3QkFBbUIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksYUFBYSxFQUFtQixDQUFDLENBQUM7UUFLNUYsdUJBQXVCO1FBQ2YsbUJBQWMsR0FBWSxLQUFLLENBQUM7UUFFaEMsY0FBUyxHQUFZLElBQUksQ0FBQztRQU1qQixlQUFVLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBUSxDQUFDLENBQUM7UUFDekQsY0FBUyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDO1FBRTFCLGlCQUFZLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sQ0FBTyxFQUFFLHNCQUFzQixFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDMUgsZ0JBQVcsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQztRQUN2QyxzQkFBaUIsR0FBRyxLQUFLLENBQUM7UUFFakIsY0FBUyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQWEsQ0FBQyxDQUFDO1FBQzdELGFBQVEsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQztRQUV4QixlQUFVLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBYSxDQUFDLENBQUM7UUFDOUQsY0FBUyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDO1FBSzFDLElBQUksQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDO1FBQ3ZCLElBQUksQ0FBQyxRQUFRLEdBQUcsT0FBTyxDQUFDLE9BQU8sSUFBSSxJQUFJLENBQUM7UUFDeEMsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcseUNBQWlDLENBQUM7UUFDOUUsSUFBSSxDQUFDLFlBQVksR0FBRztZQUNuQixPQUFPLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUUsT0FBTyxJQUFJLEtBQUs7WUFDbkQsSUFBSSxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFLElBQUksSUFBSSwrQ0FBOEI7U0FDdEUsQ0FBQztRQUVGLElBQUksQ0FBQyxjQUFjLEdBQUcsT0FBTyxDQUFDLGFBQWEsSUFBSSxJQUFJLENBQUMsU0FBUyxDQUFDLDBCQUEwQixFQUFFLENBQUMsQ0FBQztRQUU1RixJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDL0IsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQztRQUNoRCxDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSxZQUFZLEVBQUUsQ0FBQztZQUN4QyxJQUFJLENBQUMsd0JBQXdCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUN2RCxDQUFDO1FBRUQsSUFBSSxDQUFDLHdCQUF3QixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM1RixJQUFJLENBQUMsd0JBQXdCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRTlGLElBQUksQ0FBQyxTQUFTLEdBQUcsRUFBRSxDQUFDO1FBQ3BCLElBQUksQ0FBQyxXQUFXLEdBQUcsU0FBUyxDQUFDO1FBRTdCLElBQUksQ0FBQyxPQUFPLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUM3QyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsR0FBRyxtQkFBbUIsQ0FBQztRQUU3QyxJQUFJLFlBQXVCLENBQUM7UUFDNUIsSUFBSSxRQUFtQixDQUFDO1FBRXhCLFFBQVEsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQzNCO2dCQUNDLFlBQVksR0FBRyw0QkFBbUIsQ0FBQztnQkFDbkMsUUFBUSxHQUFHLDZCQUFvQixDQUFDO2dCQUNoQyxNQUFNO1lBQ1A7Z0JBQ0MsWUFBWSxHQUFHLDBCQUFpQixDQUFDO2dCQUNqQyxRQUFRLEdBQUcsNEJBQW1CLENBQUM7Z0JBQy9CLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxJQUFJLFdBQVcsQ0FBQztnQkFDdEMsTUFBTTtRQUNSLENBQUM7UUFFRCxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxFQUFFO1lBQ2xGLE1BQU0sS0FBSyxHQUFHLElBQUkscUJBQXFCLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDM0MsSUFBSSxZQUFZLEdBQUcsSUFBSSxDQUFDO1lBQ3hCLE1BQU0sV0FBVyxHQUFHLE9BQU8sSUFBSSxDQUFDLFdBQVcsS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUM7WUFFeEcsSUFBSSxZQUFZLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO2dCQUN0RixZQUFZLEdBQUcsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO1lBQ3JDLENBQUM7aUJBQU0sSUFBSSxRQUFRLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO2dCQUNqRixZQUFZLEdBQUcsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ2pDLENBQUM7aUJBQU0sSUFBSSxLQUFLLENBQUMsTUFBTSx3QkFBZ0IsSUFBSSxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztnQkFDbkUsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUMxQixDQUFDO2lCQUFNLElBQUksS0FBSyxDQUFDLE1BQU0sdUJBQWMsRUFBRSxDQUFDO2dCQUN2QyxZQUFZLEdBQUcsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ2xDLENBQUM7aUJBQU0sSUFBSSxLQUFLLENBQUMsTUFBTSxzQkFBYSxFQUFFLENBQUM7Z0JBQ3RDLFlBQVksR0FBRyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDakMsQ0FBQztpQkFBTSxJQUFJLEtBQUssQ0FBQyxNQUFNLHFCQUFhLElBQUksV0FBVyxZQUFZLGtCQUFrQixJQUFJLFdBQVcsQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO2dCQUN2SCxzQ0FBc0M7Z0JBQ3RDLFlBQVksR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUNoRCxDQUFDO2lCQUFNLElBQUksSUFBSSxDQUFDLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQzFDLHVEQUF1RDtnQkFDdkQsSUFBSSxJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sRUFBRSxDQUFDO29CQUMvQixJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUN2QixDQUFDO3FCQUFNLENBQUM7b0JBQ1AsSUFBSSxDQUFDLGNBQWMsR0FBRyxJQUFJLENBQUM7Z0JBQzVCLENBQUM7WUFDRixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsWUFBWSxHQUFHLEtBQUssQ0FBQztZQUN0QixDQUFDO1lBRUQsSUFBSSxZQUFZLEVBQUUsQ0FBQztnQkFDbEIsS0FBSyxDQUFDLGNBQWMsRUFBRSxDQUFDO2dCQUN2QixLQUFLLENBQUMsZUFBZSxFQUFFLENBQUM7WUFDekIsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFSixJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxFQUFFO1lBQ2hGLE1BQU0sS0FBSyxHQUFHLElBQUkscUJBQXFCLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFFM0MsNEJBQTRCO1lBQzVCLElBQUksSUFBSSxDQUFDLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQ25DLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sSUFBSSxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7b0JBQ3ZELElBQUksQ0FBQyxjQUFjLEdBQUcsS0FBSyxDQUFDO29CQUM1QixJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUN2QixDQUFDO2dCQUVELEtBQUssQ0FBQyxjQUFjLEVBQUUsQ0FBQztnQkFDdkIsS0FBSyxDQUFDLGVBQWUsRUFBRSxDQUFDO1lBQ3pCLENBQUM7WUFFRCx5QkFBeUI7aUJBQ3BCLElBQUksS0FBSyxDQUFDLE1BQU0scUJBQWEsSUFBSSxLQUFLLENBQUMsTUFBTSxDQUFDLDZDQUEwQixDQUFDLElBQUksS0FBSyxDQUFDLE1BQU0sMEJBQWlCLElBQUksS0FBSyxDQUFDLE1BQU0sNEJBQW1CLElBQUksS0FBSyxDQUFDLE1BQU0sNEJBQW1CLElBQUksS0FBSyxDQUFDLE1BQU0sNkJBQW9CLEVBQUUsQ0FBQztnQkFDM04sSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7WUFDMUIsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFSixJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztRQUNqRSxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLEdBQUcsRUFBRTtZQUMvQyxJQUFJLEdBQUcsQ0FBQyxnQkFBZ0IsRUFBRSxLQUFLLElBQUksQ0FBQyxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsRUFBRSxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO2dCQUN0RyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUN2QixJQUFJLENBQUMscUJBQXFCLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQztnQkFDOUMsSUFBSSxDQUFDLFdBQVcsR0FBRyxTQUFTLENBQUM7Z0JBQzdCLElBQUksQ0FBQyxjQUFjLEdBQUcsS0FBSyxDQUFDO1lBQzdCLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRUosSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFN0UsSUFBSSxDQUFDLFdBQVcsR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2hELElBQUksQ0FBQyxXQUFXLENBQUMsU0FBUyxHQUFHLG1CQUFtQixDQUFDO1FBQ2pELElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxxQkFBcUIsRUFBRSxDQUFDO1lBQ3hDLElBQUksQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO1FBQ3JELENBQUM7UUFDRCxJQUFJLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLElBQUksU0FBUyxDQUFDLENBQUM7UUFFMUUsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQzVCLElBQUksQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ3JFLENBQUM7UUFFRCxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7UUFFM0MsU0FBUyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDckMsQ0FBQztJQUVPLFdBQVc7UUFDbEIsSUFBSSxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDeEIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxJQUFJLFNBQVMsQ0FBQyxDQUFDO1FBQzNFLENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBQ3ZELENBQUM7SUFDRixDQUFDO0lBRUQsWUFBWSxDQUFDLEtBQWE7UUFDekIsSUFBSSxLQUFLLEVBQUUsQ0FBQztZQUNYLElBQUksQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLFlBQVksRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNwRCxDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxXQUFXLENBQUMsZUFBZSxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQ2hELENBQUM7SUFDRixDQUFDO0lBRUQsb0RBQW9EO0lBQ3BELGlHQUFpRztJQUNqRyxpRkFBaUY7SUFDakYsWUFBWSxDQUFDLFNBQWtCO1FBQzlCLElBQUksQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDO1FBQzNCLElBQUksSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ3BCLE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxZQUFZLGtCQUFrQixJQUFJLEVBQUUsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDO1lBQ25HLElBQUksWUFBWSxZQUFZLGtCQUFrQixFQUFFLENBQUM7Z0JBQ2hELFlBQVksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDakMsQ0FBQztRQUNGLENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLEVBQUU7Z0JBQzNCLElBQUksRUFBRSxZQUFZLGtCQUFrQixFQUFFLENBQUM7b0JBQ3RDLEVBQUUsQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLENBQUM7Z0JBQ3hCLENBQUM7WUFDRixDQUFDLENBQUMsQ0FBQztRQUNKLENBQUM7SUFDRixDQUFDO0lBRU8saUJBQWlCLENBQUMsS0FBNEI7UUFDckQsSUFBSSxHQUFHLEdBQUcsS0FBSyxDQUFDO1FBQ2hCLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRTtZQUN4QyxHQUFHLEdBQUcsR0FBRyxJQUFJLEtBQUssQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDcEMsQ0FBQyxDQUFDLENBQUM7UUFFSCxPQUFPLEdBQUcsQ0FBQztJQUNaLENBQUM7SUFFTyxpQkFBaUI7UUFDeEIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQzNELE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzFDLElBQUksR0FBRyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLEVBQUUsRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDO2dCQUNsRCxJQUFJLENBQUMsV0FBVyxHQUFHLENBQUMsQ0FBQztnQkFDckIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLEVBQUUsU0FBUyxFQUFFLEVBQUUsQ0FBQztnQkFDaEQsTUFBTTtZQUNQLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVELElBQUksT0FBTztRQUNWLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQztJQUN0QixDQUFDO0lBRUQsSUFBSSxPQUFPLENBQUMsT0FBZ0I7UUFDM0IsSUFBSSxDQUFDLFFBQVEsR0FBRyxPQUFPLENBQUM7UUFDeEIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztJQUMxRCxDQUFDO0lBRUQsSUFBSSxZQUFZO1FBQ2YsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFDO0lBQzNCLENBQUM7SUFFRCxJQUFJLFlBQVksQ0FBQyxZQUEyQjtRQUMzQyxJQUFJLENBQUMsYUFBYSxHQUFHLFlBQVksQ0FBQztRQUVsQyw0RUFBNEU7UUFDNUUsZ0RBQWdEO1FBQ2hELElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUN0QyxJQUFJLENBQUMsd0JBQXdCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzVGLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDOUYsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsWUFBWSxHQUFHLFlBQVksQ0FBQyxDQUFDO0lBQ2xFLENBQUM7SUFFRCxZQUFZO1FBQ1gsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDO0lBQ3JCLENBQUM7SUFFRCxTQUFTLENBQUMsTUFBZTtRQUN4QixPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxFQUFFLEtBQUssTUFBTSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO0lBQ3hGLENBQUM7SUFFRCxTQUFTLENBQUMsY0FBb0M7UUFFN0MsV0FBVztRQUNYLElBQUksT0FBTyxjQUFjLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDeEMsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxFQUFFLE1BQU0sQ0FBQztRQUMvQyxDQUFDO1FBRUQsYUFBYTtRQUNiLElBQUksR0FBRyxDQUFDLGFBQWEsQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDO1lBQ3ZDLE9BQU8sY0FBYyxDQUFDLGFBQWEsS0FBSyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7Z0JBQzFELElBQUksQ0FBQyxjQUFjLENBQUMsYUFBYSxFQUFFLENBQUM7b0JBQ25DLE9BQU8sU0FBUyxDQUFDO2dCQUNsQixDQUFDO2dCQUNELGNBQWMsR0FBRyxjQUFjLENBQUMsYUFBYSxDQUFDO1lBQy9DLENBQUM7WUFDRCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQzdELElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEtBQUssY0FBYyxFQUFFLENBQUM7b0JBQ3ZELE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUM7Z0JBQ2pDLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUVELE9BQU8sU0FBUyxDQUFDO0lBQ2xCLENBQUM7SUFFRCxJQUFJLENBQUMsR0FBcUMsRUFBRSxVQUEwQixFQUFFO1FBQ3ZFLE1BQU0sT0FBTyxHQUEyQixLQUFLLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7UUFFekUsSUFBSSxLQUFLLEdBQUcsS0FBSyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztRQUVqRSxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsTUFBZSxFQUFFLEVBQUU7WUFDbkMsTUFBTSxxQkFBcUIsR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzNELHFCQUFxQixDQUFDLFNBQVMsR0FBRyxhQUFhLENBQUM7WUFDaEQscUJBQXFCLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxjQUFjLENBQUMsQ0FBQztZQUUzRCxJQUFJLElBQWlDLENBQUM7WUFFdEMsTUFBTSxlQUFlLEdBQTJCLEVBQUUsYUFBYSxFQUFFLElBQUksQ0FBQyxjQUFjLEVBQUUsR0FBRyxPQUFPLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQ25KLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxzQkFBc0IsRUFBRSxDQUFDO2dCQUN6QyxJQUFJLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxzQkFBc0IsQ0FBQyxNQUFNLEVBQUUsZUFBZSxDQUFDLENBQUM7WUFDckUsQ0FBQztZQUVELElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFDWCxJQUFJLEdBQUcsSUFBSSxjQUFjLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsZUFBZSxDQUFDLENBQUM7WUFDbEUsQ0FBQztZQUVELHlDQUF5QztZQUN6QyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO2dCQUNwQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMscUJBQXFCLENBQUMscUJBQXFCLEVBQUUsR0FBRyxDQUFDLFNBQVMsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFnQixFQUFFLEVBQUU7b0JBQ3BJLEdBQUcsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztnQkFDL0IsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNMLENBQUM7WUFFRCxJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUM7WUFDdkMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUNwQyxJQUFJLENBQUMsTUFBTSxDQUFDLHFCQUFxQixDQUFDLENBQUM7WUFFbkMsSUFBSSxJQUFJLENBQUMsU0FBUyxJQUFJLElBQUksWUFBWSxrQkFBa0IsSUFBSSxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDekYsNEZBQTRGO2dCQUM1RixJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3pCLENBQUM7WUFFRCxJQUFJLEtBQUssS0FBSyxJQUFJLElBQUksS0FBSyxHQUFHLENBQUMsSUFBSSxLQUFLLElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQzlFLElBQUksQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLHFCQUFxQixDQUFDLENBQUM7Z0JBQ3BELElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzNCLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxJQUFJLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxxQkFBcUIsRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO2dCQUN2RixJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO2dCQUN0QyxLQUFLLEVBQUUsQ0FBQztZQUNULENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQztRQUNILElBQUksT0FBTyxJQUFJLENBQUMsV0FBVyxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQzFDLHlHQUF5RztZQUN6RyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUM5QixDQUFDO1FBQ0QsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO0lBQ3BCLENBQUM7SUFFRCxRQUFRLENBQUMsS0FBYTtRQUNyQixJQUFJLEtBQUssSUFBSSxDQUFDLElBQUksS0FBSyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQzVELE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUNuRCxJQUFJLElBQUksRUFBRSxDQUFDO2dCQUNWLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQztZQUN6QixDQUFDO1FBQ0YsQ0FBQztRQUVELE9BQU8sQ0FBQyxDQUFDO0lBQ1YsQ0FBQztJQUVELFNBQVMsQ0FBQyxLQUFhO1FBQ3RCLElBQUksS0FBSyxJQUFJLENBQUMsSUFBSSxLQUFLLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDNUQsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ25ELElBQUksSUFBSSxFQUFFLENBQUM7Z0JBQ1YsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDO1lBQzFCLENBQUM7UUFDRixDQUFDO1FBRUQsT0FBTyxDQUFDLENBQUM7SUFDVixDQUFDO0lBRUQsSUFBSSxDQUFDLEtBQWE7UUFDakIsSUFBSSxLQUFLLElBQUksQ0FBQyxJQUFJLEtBQUssR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2pELElBQUksQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQzVDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7WUFDakUsT0FBTyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3pDLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUNwQixDQUFDO0lBQ0YsQ0FBQztJQUVELEtBQUs7UUFDSixJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDO1lBQ3BCLE9BQU87UUFDUixDQUFDO1FBRUQsSUFBSSxDQUFDLFNBQVMsR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ3pDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO1FBQzlDLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQ2hDLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztJQUNwQixDQUFDO0lBRUQsTUFBTTtRQUNMLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUM7SUFDOUIsQ0FBQztJQUVELE9BQU87UUFDTixPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQztJQUNwQyxDQUFDO0lBSUQsS0FBSyxDQUFDLEdBQXNCO1FBQzNCLElBQUksV0FBVyxHQUFZLEtBQUssQ0FBQztRQUNqQyxJQUFJLEtBQUssR0FBdUIsU0FBUyxDQUFDO1FBQzFDLElBQUksR0FBRyxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQ3ZCLFdBQVcsR0FBRyxJQUFJLENBQUM7UUFDcEIsQ0FBQzthQUFNLElBQUksT0FBTyxHQUFHLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDcEMsS0FBSyxHQUFHLEdBQUcsQ0FBQztRQUNiLENBQUM7YUFBTSxJQUFJLE9BQU8sR0FBRyxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQ3JDLFdBQVcsR0FBRyxHQUFHLENBQUM7UUFDbkIsQ0FBQztRQUVELElBQUksV0FBVyxJQUFJLE9BQU8sSUFBSSxDQUFDLFdBQVcsS0FBSyxXQUFXLEVBQUUsQ0FBQztZQUM1RCxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDO1lBQ3hFLCtCQUErQjtZQUMvQixJQUFJLENBQUMsV0FBVyxHQUFHLFlBQVksS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUM7WUFDbEUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxTQUFTLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzlDLENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxLQUFLLEtBQUssU0FBUyxFQUFFLENBQUM7Z0JBQ3pCLElBQUksQ0FBQyxXQUFXLEdBQUcsS0FBSyxDQUFDO1lBQzFCLENBQUM7WUFFRCxJQUFJLENBQUMsV0FBVyxDQUFDLFNBQVMsRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDOUMsQ0FBQztJQUNGLENBQUM7SUFFTyxVQUFVO1FBQ2pCLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQztRQUNyQyxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDN0IsQ0FBQztJQUVPLFNBQVM7UUFDaEIsSUFBSSxDQUFDLFdBQVcsR0FBRyxDQUFDLENBQUM7UUFDckIsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2pDLENBQUM7SUFFUyxTQUFTLENBQUMsU0FBbUIsRUFBRSxVQUFvQjtRQUM1RCxJQUFJLE9BQU8sSUFBSSxDQUFDLFdBQVcsS0FBSyxXQUFXLEVBQUUsQ0FBQztZQUM3QyxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztRQUM5QyxDQUFDO2FBQU0sSUFBSSxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUN2QyxPQUFPLEtBQUssQ0FBQztRQUNkLENBQUM7UUFFRCxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDO1FBQ3BDLElBQUksSUFBcUIsQ0FBQztRQUMxQixHQUFHLENBQUM7WUFFSCxJQUFJLENBQUMsU0FBUyxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMscUJBQXFCLElBQUksSUFBSSxDQUFDLFdBQVcsR0FBRyxDQUFDLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDdkcsSUFBSSxDQUFDLFdBQVcsR0FBRyxVQUFVLENBQUM7Z0JBQzlCLE9BQU8sS0FBSyxDQUFDO1lBQ2QsQ0FBQztZQUVELElBQUksQ0FBQyxXQUFXLEdBQUcsQ0FBQyxJQUFJLENBQUMsV0FBVyxHQUFHLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDO1lBQ2xFLElBQUksR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUN6QyxDQUFDLFFBQVEsSUFBSSxDQUFDLFdBQVcsS0FBSyxVQUFVLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMscUJBQXFCLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUMsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsS0FBSyxTQUFTLENBQUMsRUFBRSxDQUFDLEVBQUU7UUFFNUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxTQUFTLEVBQUUsU0FBUyxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBQ25ELE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztJQUVTLGFBQWEsQ0FBQyxTQUFtQjtRQUMxQyxJQUFJLE9BQU8sSUFBSSxDQUFDLFdBQVcsS0FBSyxXQUFXLEVBQUUsQ0FBQztZQUM3QyxJQUFJLENBQUMsV0FBVyxHQUFHLENBQUMsQ0FBQztRQUN0QixDQUFDO2FBQU0sSUFBSSxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUN2QyxPQUFPLEtBQUssQ0FBQztRQUNkLENBQUM7UUFFRCxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDO1FBQ3BDLElBQUksSUFBcUIsQ0FBQztRQUUxQixHQUFHLENBQUM7WUFDSCxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxXQUFXLEdBQUcsQ0FBQyxDQUFDO1lBQ3hDLElBQUksSUFBSSxDQUFDLFdBQVcsR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDMUIsSUFBSSxDQUFDLFNBQVMsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLHFCQUFxQixFQUFFLENBQUM7b0JBQ3RELElBQUksQ0FBQyxXQUFXLEdBQUcsVUFBVSxDQUFDO29CQUM5QixPQUFPLEtBQUssQ0FBQztnQkFDZCxDQUFDO2dCQUVELElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO1lBQzlDLENBQUM7WUFDRCxJQUFJLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDekMsQ0FBQyxRQUFRLElBQUksQ0FBQyxXQUFXLEtBQUssVUFBVSxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLHFCQUFxQixJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEtBQUssU0FBUyxDQUFDLEVBQUUsQ0FBQyxFQUFFO1FBRzVJLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDdkIsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0lBRVMsV0FBVyxDQUFDLFNBQW1CLEVBQUUsYUFBdUIsRUFBRSxhQUFzQixLQUFLO1FBQzlGLElBQUksT0FBTyxJQUFJLENBQUMsV0FBVyxLQUFLLFdBQVcsRUFBRSxDQUFDO1lBQzdDLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLEVBQUUsYUFBYSxFQUFFLENBQUMsQ0FBQztRQUMzQyxDQUFDO1FBRUQsSUFBSSxJQUFJLENBQUMscUJBQXFCLEtBQUssU0FBUyxJQUFJLElBQUksQ0FBQyxxQkFBcUIsS0FBSyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDakcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQztRQUNwRCxDQUFDO1FBQ0QsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLFdBQVcsS0FBSyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUM7UUFDckcsSUFBSSxjQUFjLEVBQUUsQ0FBQztZQUNwQixJQUFJLFNBQVMsR0FBRyxJQUFJLENBQUM7WUFFckIsSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQzdDLFNBQVMsR0FBRyxLQUFLLENBQUM7WUFDbkIsQ0FBQztZQUVELElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxxQkFBcUIsSUFBSSxLQUFLLENBQUMsVUFBVSxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDO2dCQUNySCxTQUFTLEdBQUcsS0FBSyxDQUFDO1lBQ25CLENBQUM7WUFFRCxJQUFJLGNBQWMsQ0FBQyxNQUFNLENBQUMsRUFBRSxLQUFLLFNBQVMsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDL0MsU0FBUyxHQUFHLEtBQUssQ0FBQztZQUNuQixDQUFDO1lBQ0QsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO2dCQUNoQixJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxFQUFFLGFBQWEsRUFBRSxDQUFDLENBQUM7Z0JBQzFDLElBQUksQ0FBQyxxQkFBcUIsR0FBRyxTQUFTLENBQUM7WUFDeEMsQ0FBQztpQkFBTSxJQUFJLFVBQVUsSUFBSSxJQUFJLENBQUMscUJBQXFCLEtBQUssSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO2dCQUMxRSxjQUFjLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDO2dCQUNoQyxJQUFJLENBQUMscUJBQXFCLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQztZQUMvQyxDQUFDO1lBQ0QsSUFBSSxTQUFTLEVBQUUsQ0FBQztnQkFDZixjQUFjLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQztZQUM5QixDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFTyxTQUFTLENBQUMsS0FBNEI7UUFDN0MsSUFBSSxPQUFPLElBQUksQ0FBQyxXQUFXLEtBQUssV0FBVyxFQUFFLENBQUM7WUFDN0MsT0FBTyxDQUFDLGtCQUFrQjtRQUMzQixDQUFDO1FBRUQsaUJBQWlCO1FBQ2pCLE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQ3hELElBQUksY0FBYyxZQUFZLGtCQUFrQixFQUFFLENBQUM7WUFDbEQsTUFBTSxPQUFPLEdBQUcsQ0FBQyxjQUFjLENBQUMsUUFBUSxLQUFLLElBQUksSUFBSSxjQUFjLENBQUMsUUFBUSxLQUFLLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUM7WUFDOUgsSUFBSSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQzNDLENBQUM7SUFDRixDQUFDO0lBRUQsS0FBSyxDQUFDLEdBQUcsQ0FBQyxNQUFlLEVBQUUsT0FBaUI7UUFDM0MsTUFBTSxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDL0MsQ0FBQztJQUVRLE9BQU87UUFDZixJQUFJLENBQUMsUUFBUSxHQUFHLFNBQVMsQ0FBQztRQUMxQixJQUFJLENBQUMsU0FBUyxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDekMsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQzdCLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUNqQixDQUFDO0NBQ0Q7QUFFRCxNQUFNLFVBQVUsY0FBYyxDQUFDLE9BQWtCO0lBQ2hELElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDckIsT0FBTyxPQUFPLENBQUM7SUFDaEIsQ0FBQztJQUVELDhCQUE4QjtJQUM5QixJQUFJLGtCQUFrQixHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQzVCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7UUFDekMsSUFBSSxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLFNBQVMsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNwQyxTQUFTO1FBQ1YsQ0FBQztRQUVELGtCQUFrQixHQUFHLENBQUMsQ0FBQztRQUN2QixNQUFNO0lBQ1AsQ0FBQztJQUVELElBQUksa0JBQWtCLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUMvQixPQUFPLEVBQUUsQ0FBQztJQUNYLENBQUM7SUFFRCxPQUFPLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO0lBRTVDLCtCQUErQjtJQUMvQixLQUFLLElBQUksQ0FBQyxHQUFHLE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztRQUM5QyxNQUFNLFdBQVcsR0FBRyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLFNBQVMsQ0FBQyxFQUFFLENBQUM7UUFDbkQsSUFBSSxXQUFXLEVBQUUsQ0FBQztZQUNqQixPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN0QixDQUFDO2FBQU0sQ0FBQztZQUNQLE1BQU07UUFDUCxDQUFDO0lBQ0YsQ0FBQztJQUVELGdDQUFnQztJQUNoQyxJQUFJLFdBQVcsR0FBRyxLQUFLLENBQUM7SUFDeEIsS0FBSyxJQUFJLENBQUMsR0FBRyxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7UUFDOUMsTUFBTSxXQUFXLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxTQUFTLENBQUMsRUFBRSxDQUFDO1FBQ25ELElBQUksV0FBVyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDakMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDdEIsQ0FBQzthQUFNLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUN6QixXQUFXLEdBQUcsSUFBSSxDQUFDO1FBQ3BCLENBQUM7YUFBTSxJQUFJLFdBQVcsRUFBRSxDQUFDO1lBQ3hCLFdBQVcsR0FBRyxLQUFLLENBQUM7UUFDckIsQ0FBQztJQUNGLENBQUM7SUFFRCxPQUFPLE9BQU8sQ0FBQztBQUNoQixDQUFDIn0=