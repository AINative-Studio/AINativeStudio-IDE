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
var AbstractPaneCompositePart_1;
import './media/paneCompositePart.css';
import { Event } from '../../../base/common/event.js';
import { IInstantiationService } from '../../../platform/instantiation/common/instantiation.js';
import { Extensions } from '../panecomposite.js';
import { IViewDescriptorService } from '../../common/views.js';
import { DisposableStore, MutableDisposable } from '../../../base/common/lifecycle.js';
import { IWorkbenchLayoutService } from '../../services/layout/browser/layoutService.js';
import { CompositePart } from './compositePart.js';
import { PaneCompositeBar } from './paneCompositeBar.js';
import { Dimension, EventHelper, trackFocus, $, addDisposableListener, EventType, prepend, getWindow } from '../../../base/browser/dom.js';
import { Registry } from '../../../platform/registry/common/platform.js';
import { INotificationService } from '../../../platform/notification/common/notification.js';
import { IStorageService } from '../../../platform/storage/common/storage.js';
import { IContextMenuService } from '../../../platform/contextview/browser/contextView.js';
import { IKeybindingService } from '../../../platform/keybinding/common/keybinding.js';
import { IThemeService } from '../../../platform/theme/common/themeService.js';
import { IContextKeyService } from '../../../platform/contextkey/common/contextkey.js';
import { IExtensionService } from '../../services/extensions/common/extensions.js';
import { localize } from '../../../nls.js';
import { CompositeDragAndDropObserver, toggleDropEffect } from '../dnd.js';
import { EDITOR_DRAG_AND_DROP_BACKGROUND } from '../../common/theme.js';
import { CompositeMenuActions } from '../actions.js';
import { IMenuService, MenuId } from '../../../platform/actions/common/actions.js';
import { prepareActions } from '../../../base/browser/ui/actionbar/actionbar.js';
import { Gesture, EventType as GestureEventType } from '../../../base/browser/touch.js';
import { StandardMouseEvent } from '../../../base/browser/mouseEvent.js';
import { SubmenuAction } from '../../../base/common/actions.js';
import { ViewsSubMenu } from './views/viewPaneContainer.js';
import { getActionBarActions } from '../../../platform/actions/browser/menuEntryActionViewItem.js';
import { IHoverService } from '../../../platform/hover/browser/hover.js';
import { WorkbenchToolBar } from '../../../platform/actions/browser/toolbar.js';
export var CompositeBarPosition;
(function (CompositeBarPosition) {
    CompositeBarPosition[CompositeBarPosition["TOP"] = 0] = "TOP";
    CompositeBarPosition[CompositeBarPosition["TITLE"] = 1] = "TITLE";
    CompositeBarPosition[CompositeBarPosition["BOTTOM"] = 2] = "BOTTOM";
})(CompositeBarPosition || (CompositeBarPosition = {}));
let AbstractPaneCompositePart = class AbstractPaneCompositePart extends CompositePart {
    static { AbstractPaneCompositePart_1 = this; }
    static { this.MIN_COMPOSITE_BAR_WIDTH = 50; }
    get snap() {
        // Always allow snapping closed
        // Only allow dragging open if the panel contains view containers
        return this.layoutService.isVisible(this.partId) || !!this.paneCompositeBar.value?.getVisiblePaneCompositeIds().length;
    }
    get onDidPaneCompositeOpen() { return Event.map(this.onDidCompositeOpen.event, compositeEvent => compositeEvent.composite); }
    constructor(partId, partOptions, activePaneCompositeSettingsKey, activePaneContextKey, paneFocusContextKey, nameForTelemetry, compositeCSSClass, titleForegroundColor, titleBorderColor, notificationService, storageService, contextMenuService, layoutService, keybindingService, hoverService, instantiationService, themeService, viewDescriptorService, contextKeyService, extensionService, menuService) {
        let location = 0 /* ViewContainerLocation.Sidebar */;
        let registryId = Extensions.Viewlets;
        let globalActionsMenuId = MenuId.SidebarTitle;
        if (partId === "workbench.parts.panel" /* Parts.PANEL_PART */) {
            location = 1 /* ViewContainerLocation.Panel */;
            registryId = Extensions.Panels;
            globalActionsMenuId = MenuId.PanelTitle;
        }
        else if (partId === "workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */) {
            location = 2 /* ViewContainerLocation.AuxiliaryBar */;
            registryId = Extensions.Auxiliary;
            globalActionsMenuId = MenuId.AuxiliaryBarTitle;
        }
        super(notificationService, storageService, contextMenuService, layoutService, keybindingService, hoverService, instantiationService, themeService, Registry.as(registryId), activePaneCompositeSettingsKey, viewDescriptorService.getDefaultViewContainer(location)?.id || '', nameForTelemetry, compositeCSSClass, titleForegroundColor, titleBorderColor, partId, partOptions);
        this.partId = partId;
        this.activePaneContextKey = activePaneContextKey;
        this.paneFocusContextKey = paneFocusContextKey;
        this.viewDescriptorService = viewDescriptorService;
        this.contextKeyService = contextKeyService;
        this.extensionService = extensionService;
        this.menuService = menuService;
        this.onDidPaneCompositeClose = this.onDidCompositeClose.event;
        this.headerFooterCompositeBarDispoables = this._register(new DisposableStore());
        this.paneCompositeBar = this._register(new MutableDisposable());
        this.compositeBarPosition = undefined;
        this.blockOpening = false;
        this.location = location;
        this.globalActions = this._register(this.instantiationService.createInstance(CompositeMenuActions, globalActionsMenuId, undefined, undefined));
        this.registerListeners();
    }
    registerListeners() {
        this._register(this.onDidPaneCompositeOpen(composite => this.onDidOpen(composite)));
        this._register(this.onDidPaneCompositeClose(this.onDidClose, this));
        this._register(this.globalActions.onDidChange(() => this.updateGlobalToolbarActions()));
        this._register(this.registry.onDidDeregister((viewletDescriptor) => {
            const activeContainers = this.viewDescriptorService.getViewContainersByLocation(this.location)
                .filter(container => this.viewDescriptorService.getViewContainerModel(container).activeViewDescriptors.length > 0);
            if (activeContainers.length) {
                if (this.getActiveComposite()?.getId() === viewletDescriptor.id) {
                    const defaultViewletId = this.viewDescriptorService.getDefaultViewContainer(this.location)?.id;
                    const containerToOpen = activeContainers.filter(c => c.id === defaultViewletId)[0] || activeContainers[0];
                    this.doOpenPaneComposite(containerToOpen.id);
                }
            }
            else {
                this.layoutService.setPartHidden(true, this.partId);
            }
            this.removeComposite(viewletDescriptor.id);
        }));
        this._register(this.extensionService.onDidRegisterExtensions(() => {
            this.layoutCompositeBar();
        }));
    }
    onDidOpen(composite) {
        this.activePaneContextKey.set(composite.getId());
    }
    onDidClose(composite) {
        const id = composite.getId();
        if (this.activePaneContextKey.get() === id) {
            this.activePaneContextKey.reset();
        }
    }
    showComposite(composite) {
        super.showComposite(composite);
        this.layoutCompositeBar();
        this.layoutEmptyMessage();
    }
    hideActiveComposite() {
        const composite = super.hideActiveComposite();
        this.layoutCompositeBar();
        this.layoutEmptyMessage();
        return composite;
    }
    create(parent) {
        this.element = parent;
        this.element.classList.add('pane-composite-part');
        super.create(parent);
        const contentArea = this.getContentArea();
        if (contentArea) {
            this.createEmptyPaneMessage(contentArea);
        }
        this.updateCompositeBar();
        const focusTracker = this._register(trackFocus(parent));
        this._register(focusTracker.onDidFocus(() => this.paneFocusContextKey.set(true)));
        this._register(focusTracker.onDidBlur(() => this.paneFocusContextKey.set(false)));
    }
    createEmptyPaneMessage(parent) {
        this.emptyPaneMessageElement = $('.empty-pane-message-area');
        const messageElement = $('.empty-pane-message');
        messageElement.innerText = localize('pane.emptyMessage', "Drag a view here to display.");
        this.emptyPaneMessageElement.appendChild(messageElement);
        parent.appendChild(this.emptyPaneMessageElement);
        const setDropBackgroundFeedback = (visible) => {
            const updateActivityBarBackground = !this.getActiveComposite() || !visible;
            const backgroundColor = visible ? this.theme.getColor(EDITOR_DRAG_AND_DROP_BACKGROUND)?.toString() || '' : '';
            if (this.titleContainer && updateActivityBarBackground) {
                this.titleContainer.style.backgroundColor = backgroundColor;
            }
            if (this.headerFooterCompositeBarContainer && updateActivityBarBackground) {
                this.headerFooterCompositeBarContainer.style.backgroundColor = backgroundColor;
            }
            this.emptyPaneMessageElement.style.backgroundColor = backgroundColor;
        };
        this._register(CompositeDragAndDropObserver.INSTANCE.registerTarget(this.element, {
            onDragOver: (e) => {
                EventHelper.stop(e.eventData, true);
                if (this.paneCompositeBar.value) {
                    const validDropTarget = this.paneCompositeBar.value.dndHandler.onDragEnter(e.dragAndDropData, undefined, e.eventData);
                    toggleDropEffect(e.eventData.dataTransfer, 'move', validDropTarget);
                }
            },
            onDragEnter: (e) => {
                EventHelper.stop(e.eventData, true);
                if (this.paneCompositeBar.value) {
                    const validDropTarget = this.paneCompositeBar.value.dndHandler.onDragEnter(e.dragAndDropData, undefined, e.eventData);
                    setDropBackgroundFeedback(validDropTarget);
                }
            },
            onDragLeave: (e) => {
                EventHelper.stop(e.eventData, true);
                setDropBackgroundFeedback(false);
            },
            onDragEnd: (e) => {
                EventHelper.stop(e.eventData, true);
                setDropBackgroundFeedback(false);
            },
            onDrop: (e) => {
                EventHelper.stop(e.eventData, true);
                setDropBackgroundFeedback(false);
                if (this.paneCompositeBar.value) {
                    this.paneCompositeBar.value.dndHandler.drop(e.dragAndDropData, undefined, e.eventData);
                }
                else {
                    // Allow opening views/composites if the composite bar is hidden
                    const dragData = e.dragAndDropData.getData();
                    if (dragData.type === 'composite') {
                        const currentContainer = this.viewDescriptorService.getViewContainerById(dragData.id);
                        this.viewDescriptorService.moveViewContainerToLocation(currentContainer, this.location, undefined, 'dnd');
                        this.openPaneComposite(currentContainer.id, true);
                    }
                    else if (dragData.type === 'view') {
                        const viewToMove = this.viewDescriptorService.getViewDescriptorById(dragData.id);
                        if (viewToMove && viewToMove.canMoveView) {
                            this.viewDescriptorService.moveViewToLocation(viewToMove, this.location, 'dnd');
                            const newContainer = this.viewDescriptorService.getViewContainerByViewId(viewToMove.id);
                            this.openPaneComposite(newContainer.id, true).then(composite => {
                                composite?.openView(viewToMove.id, true);
                            });
                        }
                    }
                }
            },
        }));
    }
    createTitleArea(parent) {
        const titleArea = super.createTitleArea(parent);
        this._register(addDisposableListener(titleArea, EventType.CONTEXT_MENU, e => {
            this.onTitleAreaContextMenu(new StandardMouseEvent(getWindow(titleArea), e));
        }));
        this._register(Gesture.addTarget(titleArea));
        this._register(addDisposableListener(titleArea, GestureEventType.Contextmenu, e => {
            this.onTitleAreaContextMenu(new StandardMouseEvent(getWindow(titleArea), e));
        }));
        const globalTitleActionsContainer = titleArea.appendChild($('.global-actions'));
        // Global Actions Toolbar
        this.globalToolBar = this._register(this.instantiationService.createInstance(WorkbenchToolBar, globalTitleActionsContainer, {
            actionViewItemProvider: (action, options) => this.actionViewItemProvider(action, options),
            orientation: 0 /* ActionsOrientation.HORIZONTAL */,
            getKeyBinding: action => this.keybindingService.lookupKeybinding(action.id),
            anchorAlignmentProvider: () => this.getTitleAreaDropDownAnchorAlignment(),
            toggleMenuTitle: localize('moreActions', "More Actions..."),
            hoverDelegate: this.toolbarHoverDelegate,
            hiddenItemStrategy: -1 /* HiddenItemStrategy.NoHide */
        }));
        this.updateGlobalToolbarActions();
        return titleArea;
    }
    createTitleLabel(parent) {
        this.titleContainer = parent;
        const titleLabel = super.createTitleLabel(parent);
        this.titleLabelElement.draggable = true;
        const draggedItemProvider = () => {
            const activeViewlet = this.getActivePaneComposite();
            return { type: 'composite', id: activeViewlet.getId() };
        };
        this._register(CompositeDragAndDropObserver.INSTANCE.registerDraggable(this.titleLabelElement, draggedItemProvider, {}));
        return titleLabel;
    }
    updateCompositeBar(updateCompositeBarOption = false) {
        const wasCompositeBarVisible = this.compositeBarPosition !== undefined;
        const isCompositeBarVisible = this.shouldShowCompositeBar();
        const previousPosition = this.compositeBarPosition;
        const newPosition = isCompositeBarVisible ? this.getCompositeBarPosition() : undefined;
        // Only update if the visibility or position has changed or if the composite bar options should be updated
        if (!updateCompositeBarOption && previousPosition === newPosition) {
            return;
        }
        // Remove old composite bar
        if (wasCompositeBarVisible) {
            const previousCompositeBarContainer = previousPosition === CompositeBarPosition.TITLE ? this.titleContainer : this.headerFooterCompositeBarContainer;
            if (!this.paneCompositeBarContainer || !this.paneCompositeBar.value || !previousCompositeBarContainer) {
                throw new Error('Composite bar containers should exist when removing the previous composite bar');
            }
            this.paneCompositeBarContainer.remove();
            this.paneCompositeBarContainer = undefined;
            this.paneCompositeBar.value = undefined;
            previousCompositeBarContainer.classList.remove('has-composite-bar');
            if (previousPosition === CompositeBarPosition.TOP) {
                this.removeFooterHeaderArea(true);
            }
            else if (previousPosition === CompositeBarPosition.BOTTOM) {
                this.removeFooterHeaderArea(false);
            }
        }
        // Create new composite bar
        let newCompositeBarContainer;
        switch (newPosition) {
            case CompositeBarPosition.TOP:
                newCompositeBarContainer = this.createHeaderArea();
                break;
            case CompositeBarPosition.TITLE:
                newCompositeBarContainer = this.titleContainer;
                break;
            case CompositeBarPosition.BOTTOM:
                newCompositeBarContainer = this.createFooterArea();
                break;
        }
        if (isCompositeBarVisible) {
            if (this.paneCompositeBarContainer || this.paneCompositeBar.value || !newCompositeBarContainer) {
                throw new Error('Invalid composite bar state when creating the new composite bar');
            }
            newCompositeBarContainer.classList.add('has-composite-bar');
            this.paneCompositeBarContainer = prepend(newCompositeBarContainer, $('.composite-bar-container'));
            this.paneCompositeBar.value = this.createCompositeBar();
            this.paneCompositeBar.value.create(this.paneCompositeBarContainer);
            if (newPosition === CompositeBarPosition.TOP) {
                this.setHeaderArea(newCompositeBarContainer);
            }
            else if (newPosition === CompositeBarPosition.BOTTOM) {
                this.setFooterArea(newCompositeBarContainer);
            }
        }
        this.compositeBarPosition = newPosition;
        if (updateCompositeBarOption) {
            this.layoutCompositeBar();
        }
    }
    createHeaderArea() {
        const headerArea = super.createHeaderArea();
        return this.createHeaderFooterCompositeBarArea(headerArea);
    }
    createFooterArea() {
        const footerArea = super.createFooterArea();
        return this.createHeaderFooterCompositeBarArea(footerArea);
    }
    createHeaderFooterCompositeBarArea(area) {
        if (this.headerFooterCompositeBarContainer) {
            // A pane composite part has either a header or a footer, but not both
            throw new Error('Header or Footer composite bar already exists');
        }
        this.headerFooterCompositeBarContainer = area;
        this.headerFooterCompositeBarDispoables.add(addDisposableListener(area, EventType.CONTEXT_MENU, e => {
            this.onCompositeBarAreaContextMenu(new StandardMouseEvent(getWindow(area), e));
        }));
        this.headerFooterCompositeBarDispoables.add(Gesture.addTarget(area));
        this.headerFooterCompositeBarDispoables.add(addDisposableListener(area, GestureEventType.Contextmenu, e => {
            this.onCompositeBarAreaContextMenu(new StandardMouseEvent(getWindow(area), e));
        }));
        return area;
    }
    removeFooterHeaderArea(header) {
        this.headerFooterCompositeBarContainer = undefined;
        this.headerFooterCompositeBarDispoables.clear();
        if (header) {
            this.removeHeaderArea();
        }
        else {
            this.removeFooterArea();
        }
    }
    createCompositeBar() {
        return this.instantiationService.createInstance(PaneCompositeBar, this.getCompositeBarOptions(), this.partId, this);
    }
    onTitleAreaUpdate(compositeId) {
        super.onTitleAreaUpdate(compositeId);
        // If title actions change, relayout the composite bar
        this.layoutCompositeBar();
    }
    async openPaneComposite(id, focus) {
        if (typeof id === 'string' && this.getPaneComposite(id)) {
            return this.doOpenPaneComposite(id, focus);
        }
        await this.extensionService.whenInstalledExtensionsRegistered();
        if (typeof id === 'string' && this.getPaneComposite(id)) {
            return this.doOpenPaneComposite(id, focus);
        }
        return undefined;
    }
    doOpenPaneComposite(id, focus) {
        if (this.blockOpening) {
            return undefined; // Workaround against a potential race condition
        }
        if (!this.layoutService.isVisible(this.partId)) {
            try {
                this.blockOpening = true;
                this.layoutService.setPartHidden(false, this.partId);
            }
            finally {
                this.blockOpening = false;
            }
        }
        return this.openComposite(id, focus);
    }
    getPaneComposite(id) {
        return this.registry.getPaneComposite(id);
    }
    getPaneComposites() {
        return this.registry.getPaneComposites()
            .sort((v1, v2) => {
            if (typeof v1.order !== 'number') {
                return 1;
            }
            if (typeof v2.order !== 'number') {
                return -1;
            }
            return v1.order - v2.order;
        });
    }
    getPinnedPaneCompositeIds() {
        return this.paneCompositeBar.value?.getPinnedPaneCompositeIds() ?? [];
    }
    getVisiblePaneCompositeIds() {
        return this.paneCompositeBar.value?.getVisiblePaneCompositeIds() ?? [];
    }
    getPaneCompositeIds() {
        return this.paneCompositeBar.value?.getPaneCompositeIds() ?? [];
    }
    getActivePaneComposite() {
        return this.getActiveComposite();
    }
    getLastActivePaneCompositeId() {
        return this.getLastActiveCompositeId();
    }
    hideActivePaneComposite() {
        if (this.layoutService.isVisible(this.partId)) {
            this.layoutService.setPartHidden(true, this.partId);
        }
        this.hideActiveComposite();
    }
    focusCompositeBar() {
        this.paneCompositeBar.value?.focus();
    }
    layout(width, height, top, left) {
        if (!this.layoutService.isVisible(this.partId)) {
            return;
        }
        this.contentDimension = new Dimension(width, height);
        // Layout contents
        super.layout(this.contentDimension.width, this.contentDimension.height, top, left);
        // Layout composite bar
        this.layoutCompositeBar();
        // Add empty pane message
        this.layoutEmptyMessage();
    }
    layoutCompositeBar() {
        if (this.contentDimension && this.dimension && this.paneCompositeBar.value) {
            const padding = this.compositeBarPosition === CompositeBarPosition.TITLE ? 16 : 8;
            const borderWidth = this.partId === "workbench.parts.panel" /* Parts.PANEL_PART */ ? 0 : 1;
            let availableWidth = this.contentDimension.width - padding - borderWidth;
            availableWidth = Math.max(AbstractPaneCompositePart_1.MIN_COMPOSITE_BAR_WIDTH, availableWidth - this.getToolbarWidth());
            this.paneCompositeBar.value.layout(availableWidth, this.dimension.height);
        }
    }
    layoutEmptyMessage() {
        const visible = !this.getActiveComposite();
        this.element.classList.toggle('empty', visible);
        if (visible) {
            this.titleLabel?.updateTitle('', '');
        }
    }
    updateGlobalToolbarActions() {
        const primaryActions = this.globalActions.getPrimaryActions();
        const secondaryActions = this.globalActions.getSecondaryActions();
        this.globalToolBar?.setActions(prepareActions(primaryActions), prepareActions(secondaryActions));
    }
    getToolbarWidth() {
        if (!this.toolBar || this.compositeBarPosition !== CompositeBarPosition.TITLE) {
            return 0;
        }
        const activePane = this.getActivePaneComposite();
        if (!activePane) {
            return 0;
        }
        // Each toolbar item has 4px margin
        const toolBarWidth = this.toolBar.getItemsWidth() + this.toolBar.getItemsLength() * 4;
        const globalToolBarWidth = this.globalToolBar ? this.globalToolBar.getItemsWidth() + this.globalToolBar.getItemsLength() * 4 : 0;
        return toolBarWidth + globalToolBarWidth + 5; // 5px padding left
    }
    onTitleAreaContextMenu(event) {
        if (this.shouldShowCompositeBar() && this.getCompositeBarPosition() === CompositeBarPosition.TITLE) {
            return this.onCompositeBarContextMenu(event);
        }
        else {
            const activePaneComposite = this.getActivePaneComposite();
            const activePaneCompositeActions = activePaneComposite ? activePaneComposite.getContextMenuActions() : [];
            if (activePaneCompositeActions.length) {
                this.contextMenuService.showContextMenu({
                    getAnchor: () => event,
                    getActions: () => activePaneCompositeActions,
                    getActionViewItem: (action, options) => this.actionViewItemProvider(action, options),
                    actionRunner: activePaneComposite.getActionRunner(),
                    skipTelemetry: true
                });
            }
        }
    }
    onCompositeBarAreaContextMenu(event) {
        return this.onCompositeBarContextMenu(event);
    }
    onCompositeBarContextMenu(event) {
        if (this.paneCompositeBar.value) {
            const actions = [...this.paneCompositeBar.value.getContextMenuActions()];
            if (actions.length) {
                this.contextMenuService.showContextMenu({
                    getAnchor: () => event,
                    getActions: () => actions,
                    skipTelemetry: true
                });
            }
        }
    }
    getViewsSubmenuAction() {
        const viewPaneContainer = this.getActivePaneComposite()?.getViewPaneContainer();
        if (viewPaneContainer) {
            const disposables = new DisposableStore();
            const scopedContextKeyService = disposables.add(this.contextKeyService.createScoped(this.element));
            scopedContextKeyService.createKey('viewContainer', viewPaneContainer.viewContainer.id);
            const menu = this.menuService.getMenuActions(ViewsSubMenu, scopedContextKeyService, { shouldForwardArgs: true, renderShortTitle: true });
            const viewsActions = getActionBarActions(menu, () => true).primary;
            disposables.dispose();
            return viewsActions.length > 1 && viewsActions.some(a => a.enabled) ? new SubmenuAction('views', localize('views', "Views"), viewsActions) : undefined;
        }
        return undefined;
    }
};
AbstractPaneCompositePart = AbstractPaneCompositePart_1 = __decorate([
    __param(9, INotificationService),
    __param(10, IStorageService),
    __param(11, IContextMenuService),
    __param(12, IWorkbenchLayoutService),
    __param(13, IKeybindingService),
    __param(14, IHoverService),
    __param(15, IInstantiationService),
    __param(16, IThemeService),
    __param(17, IViewDescriptorService),
    __param(18, IContextKeyService),
    __param(19, IExtensionService),
    __param(20, IMenuService)
], AbstractPaneCompositePart);
export { AbstractPaneCompositePart };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFuZUNvbXBvc2l0ZVBhcnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2Jyb3dzZXIvcGFydHMvcGFuZUNvbXBvc2l0ZVBhcnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sK0JBQStCLENBQUM7QUFDdkMsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3RELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQWlFLE1BQU0scUJBQXFCLENBQUM7QUFFaEgsT0FBTyxFQUFFLHNCQUFzQixFQUF5QixNQUFNLHVCQUF1QixDQUFDO0FBQ3RGLE9BQU8sRUFBRSxlQUFlLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUV2RixPQUFPLEVBQUUsdUJBQXVCLEVBQVMsTUFBTSxnREFBZ0QsQ0FBQztBQUNoRyxPQUFPLEVBQUUsYUFBYSxFQUF3QixNQUFNLG9CQUFvQixDQUFDO0FBQ3pFLE9BQU8sRUFBNEIsZ0JBQWdCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUNuRixPQUFPLEVBQUUsU0FBUyxFQUFFLFdBQVcsRUFBRSxVQUFVLEVBQUUsQ0FBQyxFQUFFLHFCQUFxQixFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDM0ksT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUM5RSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFB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