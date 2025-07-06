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
import { localize } from '../../../nls.js';
import { toAction } from '../../../base/common/actions.js';
import { IInstantiationService } from '../../../platform/instantiation/common/instantiation.js';
import { ActionBar } from '../../../base/browser/ui/actionbar/actionbar.js';
import { CompositeActionViewItem, CompositeOverflowActivityAction, CompositeOverflowActivityActionViewItem } from './compositeBarActions.js';
import { $, addDisposableListener, EventType, EventHelper, isAncestor, getWindow } from '../../../base/browser/dom.js';
import { StandardMouseEvent } from '../../../base/browser/mouseEvent.js';
import { IContextMenuService } from '../../../platform/contextview/browser/contextView.js';
import { Widget } from '../../../base/browser/ui/widget.js';
import { isUndefinedOrNull } from '../../../base/common/types.js';
import { Emitter } from '../../../base/common/event.js';
import { IViewDescriptorService } from '../../common/views.js';
import { CompositeDragAndDropObserver, toggleDropEffect } from '../dnd.js';
import { Gesture, EventType as TouchEventType } from '../../../base/browser/touch.js';
export class CompositeDragAndDrop {
    constructor(viewDescriptorService, targetContainerLocation, orientation, openComposite, moveComposite, getItems) {
        this.viewDescriptorService = viewDescriptorService;
        this.targetContainerLocation = targetContainerLocation;
        this.orientation = orientation;
        this.openComposite = openComposite;
        this.moveComposite = moveComposite;
        this.getItems = getItems;
    }
    drop(data, targetCompositeId, originalEvent, before) {
        const dragData = data.getData();
        if (dragData.type === 'composite') {
            const currentContainer = this.viewDescriptorService.getViewContainerById(dragData.id);
            const currentLocation = this.viewDescriptorService.getViewContainerLocation(currentContainer);
            let moved = false;
            // ... on the same composite bar
            if (currentLocation === this.targetContainerLocation) {
                if (targetCompositeId) {
                    this.moveComposite(dragData.id, targetCompositeId, before);
                    moved = true;
                }
            }
            // ... on a different composite bar
            else {
                this.viewDescriptorService.moveViewContainerToLocation(currentContainer, this.targetContainerLocation, this.getTargetIndex(targetCompositeId, before), 'dnd');
                moved = true;
            }
            if (moved) {
                this.openComposite(currentContainer.id, true);
            }
        }
        if (dragData.type === 'view') {
            const viewToMove = this.viewDescriptorService.getViewDescriptorById(dragData.id);
            if (viewToMove && viewToMove.canMoveView) {
                this.viewDescriptorService.moveViewToLocation(viewToMove, this.targetContainerLocation, 'dnd');
                const newContainer = this.viewDescriptorService.getViewContainerByViewId(viewToMove.id);
                if (targetCompositeId) {
                    this.moveComposite(newContainer.id, targetCompositeId, before);
                }
                this.openComposite(newContainer.id, true).then(composite => {
                    composite?.openView(viewToMove.id, true);
                });
            }
        }
    }
    onDragEnter(data, targetCompositeId, originalEvent) {
        return this.canDrop(data, targetCompositeId);
    }
    onDragOver(data, targetCompositeId, originalEvent) {
        return this.canDrop(data, targetCompositeId);
    }
    getTargetIndex(targetId, before2d) {
        if (!targetId) {
            return undefined;
        }
        const items = this.getItems();
        const before = this.orientation === 0 /* ActionsOrientation.HORIZONTAL */ ? before2d?.horizontallyBefore : before2d?.verticallyBefore;
        return items.filter(item => item.visible).findIndex(item => item.id === targetId) + (before ? 0 : 1);
    }
    canDrop(data, targetCompositeId) {
        const dragData = data.getData();
        if (dragData.type === 'composite') {
            // Dragging a composite
            const currentContainer = this.viewDescriptorService.getViewContainerById(dragData.id);
            const currentLocation = this.viewDescriptorService.getViewContainerLocation(currentContainer);
            // ... to the same composite location
            if (currentLocation === this.targetContainerLocation) {
                return dragData.id !== targetCompositeId;
            }
            return true;
        }
        else {
            // Dragging an individual view
            const viewDescriptor = this.viewDescriptorService.getViewDescriptorById(dragData.id);
            // ... that cannot move
            if (!viewDescriptor || !viewDescriptor.canMoveView) {
                return false;
            }
            // ... to create a view container
            return true;
        }
    }
}
class CompositeBarDndCallbacks {
    constructor(compositeBarContainer, actionBarContainer, compositeBarModel, dndHandler, orientation) {
        this.compositeBarContainer = compositeBarContainer;
        this.actionBarContainer = actionBarContainer;
        this.compositeBarModel = compositeBarModel;
        this.dndHandler = dndHandler;
        this.orientation = orientation;
        this.insertDropBefore = undefined;
    }
    onDragOver(e) {
        // don't add feedback if this is over the composite bar actions or there are no actions
        const visibleItems = this.compositeBarModel.visibleItems;
        if (!visibleItems.length || (e.eventData.target && isAncestor(e.eventData.target, this.actionBarContainer))) {
            this.insertDropBefore = this.updateFromDragging(this.compositeBarContainer, false, false, true);
            return;
        }
        const insertAtFront = this.insertAtFront(this.actionBarContainer, e.eventData);
        const target = insertAtFront ? visibleItems[0] : visibleItems[visibleItems.length - 1];
        const validDropTarget = this.dndHandler.onDragOver(e.dragAndDropData, target.id, e.eventData);
        toggleDropEffect(e.eventData.dataTransfer, 'move', validDropTarget);
        this.insertDropBefore = this.updateFromDragging(this.compositeBarContainer, validDropTarget, insertAtFront, true);
    }
    onDragLeave(e) {
        this.insertDropBefore = this.updateFromDragging(this.compositeBarContainer, false, false, false);
    }
    onDragEnd(e) {
        this.insertDropBefore = this.updateFromDragging(this.compositeBarContainer, false, false, false);
    }
    onDrop(e) {
        const visibleItems = this.compositeBarModel.visibleItems;
        let targetId = undefined;
        if (visibleItems.length) {
            targetId = this.insertAtFront(this.actionBarContainer, e.eventData) ? visibleItems[0].id : visibleItems[visibleItems.length - 1].id;
        }
        this.dndHandler.drop(e.dragAndDropData, targetId, e.eventData, this.insertDropBefore);
        this.insertDropBefore = this.updateFromDragging(this.compositeBarContainer, false, false, false);
    }
    insertAtFront(element, event) {
        const rect = element.getBoundingClientRect();
        const posX = event.clientX;
        const posY = event.clientY;
        switch (this.orientation) {
            case 0 /* ActionsOrientation.HORIZONTAL */:
                return posX < rect.left;
            case 1 /* ActionsOrientation.VERTICAL */:
                return posY < rect.top;
        }
    }
    updateFromDragging(element, showFeedback, front, isDragging) {
        element.classList.toggle('dragged-over', isDragging);
        element.classList.toggle('dragged-over-head', showFeedback && front);
        element.classList.toggle('dragged-over-tail', showFeedback && !front);
        if (!showFeedback) {
            return undefined;
        }
        return { verticallyBefore: front, horizontallyBefore: front };
    }
}
let CompositeBar = class CompositeBar extends Widget {
    constructor(items, options, instantiationService, contextMenuService, viewDescriptorService) {
        super();
        this.options = options;
        this.instantiationService = instantiationService;
        this.contextMenuService = contextMenuService;
        this.viewDescriptorService = viewDescriptorService;
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this.model = new CompositeBarModel(items, options);
        this.visibleComposites = [];
        this.compositeSizeInBar = new Map();
        this.computeSizes(this.model.visibleItems);
    }
    getCompositeBarItems() {
        return [...this.model.items];
    }
    setCompositeBarItems(items) {
        this.model.setItems(items);
        this.updateCompositeSwitcher(true);
    }
    getPinnedComposites() {
        return this.model.pinnedItems;
    }
    getPinnedCompositeIds() {
        return this.getPinnedComposites().map(c => c.id);
    }
    getVisibleComposites() {
        return this.model.visibleItems;
    }
    create(parent) {
        const actionBarDiv = parent.appendChild($('.composite-bar'));
        this.compositeSwitcherBar = this._register(new ActionBar(actionBarDiv, {
            actionViewItemProvider: (action, options) => {
                if (action instanceof CompositeOverflowActivityAction) {
                    return this.compositeOverflowActionViewItem;
                }
                const item = this.model.findItem(action.id);
                return item && this.instantiationService.createInstance(CompositeActionViewItem, { ...options, draggable: true, colors: this.options.colors, icon: this.options.icon, hoverOptions: this.options.activityHoverOptions, compact: this.options.compact }, action, item.pinnedAction, item.toggleBadgeAction, compositeId => this.options.getContextMenuActionsForComposite(compositeId), () => this.getContextMenuActions(), this.options.dndHandler, this);
            },
            orientation: this.options.orientation,
            ariaLabel: localize('activityBarAriaLabel', "Active View Switcher"),
            ariaRole: 'tablist',
            preventLoopNavigation: this.options.preventLoopNavigation,
            triggerKeys: { keyDown: true }
        }));
        // Contextmenu for composites
        this._register(addDisposableListener(parent, EventType.CONTEXT_MENU, e => this.showContextMenu(getWindow(parent), e)));
        this._register(Gesture.addTarget(parent));
        this._register(addDisposableListener(parent, TouchEventType.Contextmenu, e => this.showContextMenu(getWindow(parent), e)));
        // Register a drop target on the whole bar to prevent forbidden feedback
        const dndCallback = new CompositeBarDndCallbacks(parent, actionBarDiv, this.model, this.options.dndHandler, this.options.orientation);
        this._register(CompositeDragAndDropObserver.INSTANCE.registerTarget(parent, dndCallback));
        return actionBarDiv;
    }
    focus(index) {
        this.compositeSwitcherBar?.focus(index);
    }
    recomputeSizes() {
        this.computeSizes(this.model.visibleItems);
        this.updateCompositeSwitcher();
    }
    layout(dimension) {
        this.dimension = dimension;
        if (dimension.height === 0 || dimension.width === 0) {
            // Do not layout if not visible. Otherwise the size measurment would be computed wrongly
            return;
        }
        if (this.compositeSizeInBar.size === 0) {
            // Compute size of each composite by getting the size from the css renderer
            // Size is later used for overflow computation
            this.computeSizes(this.model.visibleItems);
        }
        this.updateCompositeSwitcher();
    }
    addComposite({ id, name, order, requestedIndex }) {
        if (this.model.add(id, name, order, requestedIndex)) {
            this.computeSizes([this.model.findItem(id)]);
            this.updateCompositeSwitcher();
        }
    }
    removeComposite(id) {
        // If it pinned, unpin it first
        if (this.isPinned(id)) {
            this.unpin(id);
        }
        // Remove from the model
        if (this.model.remove(id)) {
            this.updateCompositeSwitcher();
        }
    }
    hideComposite(id) {
        if (this.model.hide(id)) {
            this.resetActiveComposite(id);
            this.updateCompositeSwitcher();
        }
    }
    activateComposite(id) {
        const previousActiveItem = this.model.activeItem;
        if (this.model.activate(id)) {
            // Update if current composite is neither visible nor pinned
            // or previous active composite is not pinned
            if (this.visibleComposites.indexOf(id) === -1 || (!!this.model.activeItem && !this.model.activeItem.pinned) || (previousActiveItem && !previousActiveItem.pinned)) {
                this.updateCompositeSwitcher();
            }
        }
    }
    deactivateComposite(id) {
        const previousActiveItem = this.model.activeItem;
        if (this.model.deactivate()) {
            if (previousActiveItem && !previousActiveItem.pinned) {
                this.updateCompositeSwitcher();
            }
        }
    }
    async pin(compositeId, open) {
        if (this.model.setPinned(compositeId, true)) {
            this.updateCompositeSwitcher();
            if (open) {
                await this.options.openComposite(compositeId);
                this.activateComposite(compositeId); // Activate after opening
            }
        }
    }
    unpin(compositeId) {
        if (this.model.setPinned(compositeId, false)) {
            this.updateCompositeSwitcher();
            this.resetActiveComposite(compositeId);
        }
    }
    areBadgesEnabled(compositeId) {
        return this.viewDescriptorService.getViewContainerBadgeEnablementState(compositeId);
    }
    toggleBadgeEnablement(compositeId) {
        this.viewDescriptorService.setViewContainerBadgeEnablementState(compositeId, !this.areBadgesEnabled(compositeId));
        this.updateCompositeSwitcher();
        const item = this.model.findItem(compositeId);
        if (item) {
            // TODO @lramos15 how do we tell the activity to re-render the badge? This triggers an onDidChange but isn't the right way to do it.
            // I could add another specific function like `activity.updateBadgeEnablement` would then the activity store the sate?
            item.activityAction.activities = item.activityAction.activities;
        }
    }
    resetActiveComposite(compositeId) {
        const defaultCompositeId = this.options.getDefaultCompositeId();
        // Case: composite is not the active one or the active one is a different one
        // Solv: we do nothing
        if (!this.model.activeItem || this.model.activeItem.id !== compositeId) {
            return;
        }
        // Deactivate itself
        this.deactivateComposite(compositeId);
        // Case: composite is not the default composite and default composite is still showing
        // Solv: we open the default composite
        if (defaultCompositeId && defaultCompositeId !== compositeId && this.isPinned(defaultCompositeId)) {
            this.options.openComposite(defaultCompositeId, true);
        }
        // Case: we closed the default composite
        // Solv: we open the next visible composite from top
        else {
            const visibleComposite = this.visibleComposites.find(cid => cid !== compositeId);
            if (visibleComposite) {
                this.options.openComposite(visibleComposite);
            }
        }
    }
    isPinned(compositeId) {
        const item = this.model.findItem(compositeId);
        return item?.pinned;
    }
    move(compositeId, toCompositeId, before) {
        if (before !== undefined) {
            const fromIndex = this.model.items.findIndex(c => c.id === compositeId);
            let toIndex = this.model.items.findIndex(c => c.id === toCompositeId);
            if (fromIndex >= 0 && toIndex >= 0) {
                if (!before && fromIndex > toIndex) {
                    toIndex++;
                }
                if (before && fromIndex < toIndex) {
                    toIndex--;
                }
                if (toIndex < this.model.items.length && toIndex >= 0 && toIndex !== fromIndex) {
                    if (this.model.move(this.model.items[fromIndex].id, this.model.items[toIndex].id)) {
                        // timeout helps to prevent artifacts from showing up
                        setTimeout(() => this.updateCompositeSwitcher(), 0);
                    }
                }
            }
        }
        else {
            if (this.model.move(compositeId, toCompositeId)) {
                // timeout helps to prevent artifacts from showing up
                setTimeout(() => this.updateCompositeSwitcher(), 0);
            }
        }
    }
    getAction(compositeId) {
        const item = this.model.findItem(compositeId);
        return item?.activityAction;
    }
    computeSizes(items) {
        const size = this.options.compositeSize;
        if (size) {
            items.forEach(composite => this.compositeSizeInBar.set(composite.id, size));
        }
        else {
            const compositeSwitcherBar = this.compositeSwitcherBar;
            if (compositeSwitcherBar && this.dimension && this.dimension.height !== 0 && this.dimension.width !== 0) {
                // Compute sizes only if visible. Otherwise the size measurment would be computed wrongly.
                const currentItemsLength = compositeSwitcherBar.viewItems.length;
                compositeSwitcherBar.push(items.map(composite => composite.activityAction));
                items.map((composite, index) => this.compositeSizeInBar.set(composite.id, this.options.orientation === 1 /* ActionsOrientation.VERTICAL */
                    ? compositeSwitcherBar.getHeight(currentItemsLength + index)
                    : compositeSwitcherBar.getWidth(currentItemsLength + index)));
                items.forEach(() => compositeSwitcherBar.pull(compositeSwitcherBar.viewItems.length - 1));
            }
        }
    }
    updateCompositeSwitcher(donotTrigger) {
        const compositeSwitcherBar = this.compositeSwitcherBar;
        if (!compositeSwitcherBar || !this.dimension) {
            return; // We have not been rendered yet so there is nothing to update.
        }
        let compositesToShow = this.model.visibleItems.filter(item => item.pinned
            || (this.model.activeItem && this.model.activeItem.id === item.id) /* Show the active composite even if it is not pinned */).map(item => item.id);
        // Ensure we are not showing more composites than we have height for
        let maxVisible = compositesToShow.length;
        const totalComposites = compositesToShow.length;
        let size = 0;
        const limit = this.options.orientation === 1 /* ActionsOrientation.VERTICAL */ ? this.dimension.height : this.dimension.width;
        // Add composites while they fit
        for (let i = 0; i < compositesToShow.length; i++) {
            const compositeSize = this.compositeSizeInBar.get(compositesToShow[i]);
            // Adding this composite will overflow available size, so don't
            if (size + compositeSize > limit) {
                maxVisible = i;
                break;
            }
            size += compositeSize;
        }
        // Remove the tail of composites that did not fit
        if (totalComposites > maxVisible) {
            compositesToShow = compositesToShow.slice(0, maxVisible);
        }
        // We always try show the active composite, so re-add it if it was sliced out
        if (this.model.activeItem && compositesToShow.every(compositeId => !!this.model.activeItem && compositeId !== this.model.activeItem.id)) {
            size += this.compositeSizeInBar.get(this.model.activeItem.id);
            compositesToShow.push(this.model.activeItem.id);
        }
        // The active composite might have pushed us over the limit
        // Keep popping the composite before the active one until it fits
        // If even the active one doesn't fit, we will resort to overflow
        while (size > limit && compositesToShow.length) {
            const removedComposite = compositesToShow.length > 1 ? compositesToShow.splice(compositesToShow.length - 2, 1)[0] : compositesToShow.pop();
            size -= this.compositeSizeInBar.get(removedComposite);
        }
        // We are overflowing, add the overflow size
        if (totalComposites > compositesToShow.length) {
            size += this.options.overflowActionSize;
        }
        // Check if we need to make extra room for the overflow action
        while (size > limit && compositesToShow.length) {
            const removedComposite = compositesToShow.length > 1 && compositesToShow[compositesToShow.length - 1] === this.model.activeItem?.id ?
                compositesToShow.splice(compositesToShow.length - 2, 1)[0] : compositesToShow.pop();
            size -= this.compositeSizeInBar.get(removedComposite);
        }
        // Remove the overflow action if there are no overflows
        if (totalComposites === compositesToShow.length && this.compositeOverflowAction) {
            compositeSwitcherBar.pull(compositeSwitcherBar.length() - 1);
            this.compositeOverflowAction.dispose();
            this.compositeOverflowAction = undefined;
            this.compositeOverflowActionViewItem?.dispose();
            this.compositeOverflowActionViewItem = undefined;
        }
        // Pull out composites that overflow or got hidden
        const compositesToRemove = [];
        this.visibleComposites.forEach((compositeId, index) => {
            if (!compositesToShow.includes(compositeId)) {
                compositesToRemove.push(index);
            }
        });
        compositesToRemove.reverse().forEach(index => {
            compositeSwitcherBar.pull(index);
            this.visibleComposites.splice(index, 1);
        });
        // Update the positions of the composites
        compositesToShow.forEach((compositeId, newIndex) => {
            const currentIndex = this.visibleComposites.indexOf(compositeId);
            if (newIndex !== currentIndex) {
                if (currentIndex !== -1) {
                    compositeSwitcherBar.pull(currentIndex);
                    this.visibleComposites.splice(currentIndex, 1);
                }
                compositeSwitcherBar.push(this.model.findItem(compositeId).activityAction, { label: true, icon: this.options.icon, index: newIndex });
                this.visibleComposites.splice(newIndex, 0, compositeId);
            }
        });
        // Add overflow action as needed
        if (totalComposites > compositesToShow.length && !this.compositeOverflowAction) {
            this.compositeOverflowAction = this._register(this.instantiationService.createInstance(CompositeOverflowActivityAction, () => {
                this.compositeOverflowActionViewItem?.showMenu();
            }));
            this.compositeOverflowActionViewItem = this._register(this.instantiationService.createInstance(CompositeOverflowActivityActionViewItem, this.compositeOverflowAction, () => this.getOverflowingComposites(), () => this.model.activeItem ? this.model.activeItem.id : undefined, compositeId => {
                const item = this.model.findItem(compositeId);
                return item?.activity[0]?.badge;
            }, this.options.getOnCompositeClickAction, this.options.colors, this.options.activityHoverOptions));
            compositeSwitcherBar.push(this.compositeOverflowAction, { label: false, icon: true });
        }
        if (!donotTrigger) {
            this._onDidChange.fire();
        }
    }
    getOverflowingComposites() {
        let overflowingIds = this.model.visibleItems.filter(item => item.pinned).map(item => item.id);
        // Show the active composite even if it is not pinned
        if (this.model.activeItem && !this.model.activeItem.pinned) {
            overflowingIds.push(this.model.activeItem.id);
        }
        overflowingIds = overflowingIds.filter(compositeId => !this.visibleComposites.includes(compositeId));
        return this.model.visibleItems.filter(c => overflowingIds.includes(c.id)).map(item => { return { id: item.id, name: this.getAction(item.id)?.label || item.name }; });
    }
    showContextMenu(targetWindow, e) {
        EventHelper.stop(e, true);
        const event = new StandardMouseEvent(targetWindow, e);
        this.contextMenuService.showContextMenu({
            getAnchor: () => event,
            getActions: () => this.getContextMenuActions(e)
        });
    }
    getContextMenuActions(e) {
        const actions = this.model.visibleItems
            .map(({ id, name, activityAction }) => {
            const isPinned = this.isPinned(id);
            return toAction({
                id,
                label: this.getAction(id).label || name || id,
                checked: isPinned,
                enabled: activityAction.enabled && (!isPinned || this.getPinnedCompositeIds().length > 1),
                run: () => {
                    if (this.isPinned(id)) {
                        this.unpin(id);
                    }
                    else {
                        this.pin(id, true);
                    }
                }
            });
        });
        this.options.fillExtraContextMenuActions(actions, e);
        return actions;
    }
};
CompositeBar = __decorate([
    __param(2, IInstantiationService),
    __param(3, IContextMenuService),
    __param(4, IViewDescriptorService)
], CompositeBar);
export { CompositeBar };
class CompositeBarModel {
    get items() { return this._items; }
    constructor(items, options) {
        this._items = [];
        this.options = options;
        this.setItems(items);
    }
    setItems(items) {
        this._items = [];
        this._items = items
            .map(i => this.createCompositeBarItem(i.id, i.name, i.order, i.pinned, i.visible));
    }
    get visibleItems() {
        return this.items.filter(item => item.visible);
    }
    get pinnedItems() {
        return this.items.filter(item => item.visible && item.pinned);
    }
    createCompositeBarItem(id, name, order, pinned, visible) {
        const options = this.options;
        return {
            id, name, pinned, order, visible,
            activity: [],
            get activityAction() {
                return options.getActivityAction(id);
            },
            get pinnedAction() {
                return options.getCompositePinnedAction(id);
            },
            get toggleBadgeAction() {
                return options.getCompositeBadgeAction(id);
            }
        };
    }
    add(id, name, order, requestedIndex) {
        const item = this.findItem(id);
        if (item) {
            let changed = false;
            item.name = name;
            if (!isUndefinedOrNull(order)) {
                changed = item.order !== order;
                item.order = order;
            }
            if (!item.visible) {
                item.visible = true;
                changed = true;
            }
            return changed;
        }
        else {
            const item = this.createCompositeBarItem(id, name, order, true, true);
            if (!isUndefinedOrNull(requestedIndex)) {
                let index = 0;
                let rIndex = requestedIndex;
                while (rIndex > 0 && index < this.items.length) {
                    if (this.items[index++].visible) {
                        rIndex--;
                    }
                }
                this.items.splice(index, 0, item);
            }
            else if (isUndefinedOrNull(order)) {
                this.items.push(item);
            }
            else {
                let index = 0;
                while (index < this.items.length && typeof this.items[index].order === 'number' && this.items[index].order < order) {
                    index++;
                }
                this.items.splice(index, 0, item);
            }
            return true;
        }
    }
    remove(id) {
        for (let index = 0; index < this.items.length; index++) {
            if (this.items[index].id === id) {
                this.items.splice(index, 1);
                return true;
            }
        }
        return false;
    }
    hide(id) {
        for (const item of this.items) {
            if (item.id === id) {
                if (item.visible) {
                    item.visible = false;
                    return true;
                }
                return false;
            }
        }
        return false;
    }
    move(compositeId, toCompositeId) {
        const fromIndex = this.findIndex(compositeId);
        const toIndex = this.findIndex(toCompositeId);
        // Make sure both items are known to the model
        if (fromIndex === -1 || toIndex === -1) {
            return false;
        }
        const sourceItem = this.items.splice(fromIndex, 1)[0];
        this.items.splice(toIndex, 0, sourceItem);
        // Make sure a moved composite gets pinned
        sourceItem.pinned = true;
        return true;
    }
    setPinned(id, pinned) {
        for (const item of this.items) {
            if (item.id === id) {
                if (item.pinned !== pinned) {
                    item.pinned = pinned;
                    return true;
                }
                return false;
            }
        }
        return false;
    }
    activate(id) {
        if (!this.activeItem || this.activeItem.id !== id) {
            if (this.activeItem) {
                this.deactivate();
            }
            for (const item of this.items) {
                if (item.id === id) {
                    this.activeItem = item;
                    this.activeItem.activityAction.activate();
                    return true;
                }
            }
        }
        return false;
    }
    deactivate() {
        if (this.activeItem) {
            this.activeItem.activityAction.deactivate();
            this.activeItem = undefined;
            return true;
        }
        return false;
    }
    findItem(id) {
        return this.items.filter(item => item.id === id)[0];
    }
    findIndex(id) {
        for (let index = 0; index < this.items.length; index++) {
            if (this.items[index].id === id) {
                return index;
            }
        }
        return -1;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcG9zaXRlQmFyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2Jyb3dzZXIvcGFydHMvY29tcG9zaXRlQmFyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUMzQyxPQUFPLEVBQVcsUUFBUSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFFcEUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDaEcsT0FBTyxFQUFFLFNBQVMsRUFBc0IsTUFBTSxpREFBaUQsQ0FBQztBQUNoRyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsK0JBQStCLEVBQUUsdUNBQXVDLEVBQWlGLE1BQU0sMEJBQTBCLENBQUM7QUFDNU4sT0FBTyxFQUFhLENBQUMsRUFBRSxxQkFBcUIsRUFBRSxTQUFTLEVBQUUsV0FBVyxFQUFFLFVBQVUsRUFBRSxTQUFTLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUNsSSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUN6RSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUMzRixPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDNUQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFFbEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3hELE9BQU8sRUFBeUIsc0JBQXNCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUd0RixPQUFPLEVBQTRCLDRCQUE0QixFQUEwRCxnQkFBZ0IsRUFBMEMsTUFBTSxXQUFXLENBQUM7QUFDck0sT0FBTyxFQUFF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