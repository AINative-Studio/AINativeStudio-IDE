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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcG9zaXRlQmFyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL3BhcnRzL2NvbXBvc2l0ZUJhci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDM0MsT0FBTyxFQUFXLFFBQVEsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBRXBFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxTQUFTLEVBQXNCLE1BQU0saURBQWlELENBQUM7QUFDaEcsT0FBTyxFQUFFLHVCQUF1QixFQUFFLCtCQUErQixFQUFFLHVDQUF1QyxFQUFpRixNQUFNLDBCQUEwQixDQUFDO0FBQzVOLE9BQU8sRUFBYSxDQUFDLEVBQUUscUJBQXFCLEVBQUUsU0FBUyxFQUFFLFdBQVcsRUFBRSxVQUFVLEVBQUUsU0FBUyxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDbEksT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDekUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDM0YsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBRWxFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUN4RCxPQUFPLEVBQXlCLHNCQUFzQixFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFHdEYsT0FBTyxFQUE0Qiw0QkFBNEIsRUFBMEQsZ0JBQWdCLEVBQTBDLE1BQU0sV0FBVyxDQUFDO0FBQ3JNLE9BQU8sRUFB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