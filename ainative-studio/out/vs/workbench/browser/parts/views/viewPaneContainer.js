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
import { $, addDisposableListener, DragAndDropObserver, EventType, getWindow, isAncestor } from '../../../../base/browser/dom.js';
import { StandardMouseEvent } from '../../../../base/browser/mouseEvent.js';
import { EventType as TouchEventType, Gesture } from '../../../../base/browser/touch.js';
import { PaneView } from '../../../../base/browser/ui/splitview/paneview.js';
import { RunOnceScheduler } from '../../../../base/common/async.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { KeyChord } from '../../../../base/common/keyCodes.js';
import { combinedDisposable, DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { assertIsDefined } from '../../../../base/common/types.js';
import './media/paneviewlet.css';
import * as nls from '../../../../nls.js';
import { createActionViewItem } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { Action2, IMenuService, MenuId, MenuRegistry, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { activeContrastBorder, asCssVariable } from '../../../../platform/theme/common/colorRegistry.js';
import { IThemeService, Themable } from '../../../../platform/theme/common/themeService.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { CompositeMenuActions } from '../../actions.js';
import { CompositeDragAndDropObserver, toggleDropEffect } from '../../dnd.js';
import { Component } from '../../../common/component.js';
import { PANEL_SECTION_BORDER, PANEL_SECTION_DRAG_AND_DROP_BACKGROUND, PANEL_SECTION_HEADER_BACKGROUND, PANEL_SECTION_HEADER_BORDER, PANEL_SECTION_HEADER_FOREGROUND, SIDE_BAR_DRAG_AND_DROP_BACKGROUND, SIDE_BAR_SECTION_HEADER_BACKGROUND, SIDE_BAR_SECTION_HEADER_BORDER, SIDE_BAR_SECTION_HEADER_FOREGROUND } from '../../../common/theme.js';
import { IViewDescriptorService, ViewContainerLocationToString, ViewVisibilityState } from '../../../common/views.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { FocusedViewContext } from '../../../common/contextkeys.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { isHorizontal, IWorkbenchLayoutService } from '../../../services/layout/browser/layoutService.js';
import { ILogService } from '../../../../platform/log/common/log.js';
export const ViewsSubMenu = new MenuId('Views');
MenuRegistry.appendMenuItem(MenuId.ViewContainerTitle, {
    submenu: ViewsSubMenu,
    title: nls.localize('views', "Views"),
    order: 1,
});
var DropDirection;
(function (DropDirection) {
    DropDirection[DropDirection["UP"] = 0] = "UP";
    DropDirection[DropDirection["DOWN"] = 1] = "DOWN";
    DropDirection[DropDirection["LEFT"] = 2] = "LEFT";
    DropDirection[DropDirection["RIGHT"] = 3] = "RIGHT";
})(DropDirection || (DropDirection = {}));
class ViewPaneDropOverlay extends Themable {
    static { this.OVERLAY_ID = 'monaco-pane-drop-overlay'; }
    get currentDropOperation() {
        return this._currentDropOperation;
    }
    constructor(paneElement, orientation, bounds, location, themeService) {
        super(themeService);
        this.paneElement = paneElement;
        this.orientation = orientation;
        this.bounds = bounds;
        this.location = location;
        this.cleanupOverlayScheduler = this._register(new RunOnceScheduler(() => this.dispose(), 300));
        this.create();
    }
    get disposed() {
        return !!this._disposed;
    }
    create() {
        // Container
        this.container = $('div', { id: ViewPaneDropOverlay.OVERLAY_ID });
        this.container.style.top = '0px';
        // Parent
        this.paneElement.appendChild(this.container);
        this.paneElement.classList.add('dragged-over');
        this._register(toDisposable(() => {
            this.container.remove();
            this.paneElement.classList.remove('dragged-over');
        }));
        // Overlay
        this.overlay = $('.pane-overlay-indicator');
        this.container.appendChild(this.overlay);
        // Overlay Event Handling
        this.registerListeners();
        // Styles
        this.updateStyles();
    }
    updateStyles() {
        // Overlay drop background
        this.overlay.style.backgroundColor = this.getColor(this.location === 1 /* ViewContainerLocation.Panel */ ? PANEL_SECTION_DRAG_AND_DROP_BACKGROUND : SIDE_BAR_DRAG_AND_DROP_BACKGROUND) || '';
        // Overlay contrast border (if any)
        const activeContrastBorderColor = this.getColor(activeContrastBorder);
        this.overlay.style.outlineColor = activeContrastBorderColor || '';
        this.overlay.style.outlineOffset = activeContrastBorderColor ? '-2px' : '';
        this.overlay.style.outlineStyle = activeContrastBorderColor ? 'dashed' : '';
        this.overlay.style.outlineWidth = activeContrastBorderColor ? '2px' : '';
        this.overlay.style.borderColor = activeContrastBorderColor || '';
        this.overlay.style.borderStyle = 'solid';
        this.overlay.style.borderWidth = '0px';
    }
    registerListeners() {
        this._register(new DragAndDropObserver(this.container, {
            onDragOver: e => {
                // Position overlay
                this.positionOverlay(e.offsetX, e.offsetY);
                // Make sure to stop any running cleanup scheduler to remove the overlay
                if (this.cleanupOverlayScheduler.isScheduled()) {
                    this.cleanupOverlayScheduler.cancel();
                }
            },
            onDragLeave: e => this.dispose(),
            onDragEnd: e => this.dispose(),
            onDrop: e => {
                // Dispose overlay
                this.dispose();
            }
        }));
        this._register(addDisposableListener(this.container, EventType.MOUSE_OVER, () => {
            // Under some circumstances we have seen reports where the drop overlay is not being
            // cleaned up and as such the editor area remains under the overlay so that you cannot
            // type into the editor anymore. This seems related to using VMs and DND via host and
            // guest OS, though some users also saw it without VMs.
            // To protect against this issue we always destroy the overlay as soon as we detect a
            // mouse event over it. The delay is used to guarantee we are not interfering with the
            // actual DROP event that can also trigger a mouse over event.
            if (!this.cleanupOverlayScheduler.isScheduled()) {
                this.cleanupOverlayScheduler.schedule();
            }
        }));
    }
    positionOverlay(mousePosX, mousePosY) {
        const paneWidth = this.paneElement.clientWidth;
        const paneHeight = this.paneElement.clientHeight;
        const splitWidthThreshold = paneWidth / 2;
        const splitHeightThreshold = paneHeight / 2;
        let dropDirection;
        if (this.orientation === 0 /* Orientation.VERTICAL */) {
            if (mousePosY < splitHeightThreshold) {
                dropDirection = 0 /* DropDirection.UP */;
            }
            else if (mousePosY >= splitHeightThreshold) {
                dropDirection = 1 /* DropDirection.DOWN */;
            }
        }
        else if (this.orientation === 1 /* Orientation.HORIZONTAL */) {
            if (mousePosX < splitWidthThreshold) {
                dropDirection = 2 /* DropDirection.LEFT */;
            }
            else if (mousePosX >= splitWidthThreshold) {
                dropDirection = 3 /* DropDirection.RIGHT */;
            }
        }
        // Draw overlay based on split direction
        switch (dropDirection) {
            case 0 /* DropDirection.UP */:
                this.doPositionOverlay({ top: '0', left: '0', width: '100%', height: '50%' });
                break;
            case 1 /* DropDirection.DOWN */:
                this.doPositionOverlay({ bottom: '0', left: '0', width: '100%', height: '50%' });
                break;
            case 2 /* DropDirection.LEFT */:
                this.doPositionOverlay({ top: '0', left: '0', width: '50%', height: '100%' });
                break;
            case 3 /* DropDirection.RIGHT */:
                this.doPositionOverlay({ top: '0', right: '0', width: '50%', height: '100%' });
                break;
            default: {
                // const top = this.bounds?.top || 0;
                // const left = this.bounds?.bottom || 0;
                let top = '0';
                let left = '0';
                let width = '100%';
                let height = '100%';
                if (this.bounds) {
                    const boundingRect = this.container.getBoundingClientRect();
                    top = `${this.bounds.top - boundingRect.top}px`;
                    left = `${this.bounds.left - boundingRect.left}px`;
                    height = `${this.bounds.bottom - this.bounds.top}px`;
                    width = `${this.bounds.right - this.bounds.left}px`;
                }
                this.doPositionOverlay({ top, left, width, height });
            }
        }
        if ((this.orientation === 0 /* Orientation.VERTICAL */ && paneHeight <= 25) ||
            (this.orientation === 1 /* Orientation.HORIZONTAL */ && paneWidth <= 25)) {
            this.doUpdateOverlayBorder(dropDirection);
        }
        else {
            this.doUpdateOverlayBorder(undefined);
        }
        // Make sure the overlay is visible now
        this.overlay.style.opacity = '1';
        // Enable transition after a timeout to prevent initial animation
        setTimeout(() => this.overlay.classList.add('overlay-move-transition'), 0);
        // Remember as current split direction
        this._currentDropOperation = dropDirection;
    }
    doUpdateOverlayBorder(direction) {
        this.overlay.style.borderTopWidth = direction === 0 /* DropDirection.UP */ ? '2px' : '0px';
        this.overlay.style.borderLeftWidth = direction === 2 /* DropDirection.LEFT */ ? '2px' : '0px';
        this.overlay.style.borderBottomWidth = direction === 1 /* DropDirection.DOWN */ ? '2px' : '0px';
        this.overlay.style.borderRightWidth = direction === 3 /* DropDirection.RIGHT */ ? '2px' : '0px';
    }
    doPositionOverlay(options) {
        // Container
        this.container.style.height = '100%';
        // Overlay
        this.overlay.style.top = options.top || '';
        this.overlay.style.left = options.left || '';
        this.overlay.style.bottom = options.bottom || '';
        this.overlay.style.right = options.right || '';
        this.overlay.style.width = options.width;
        this.overlay.style.height = options.height;
    }
    contains(element) {
        return element === this.container || element === this.overlay;
    }
    dispose() {
        super.dispose();
        this._disposed = true;
    }
}
let ViewContainerMenuActions = class ViewContainerMenuActions extends CompositeMenuActions {
    constructor(element, viewContainer, viewDescriptorService, contextKeyService, menuService) {
        const scopedContextKeyService = contextKeyService.createScoped(element);
        scopedContextKeyService.createKey('viewContainer', viewContainer.id);
        const viewContainerLocationKey = scopedContextKeyService.createKey('viewContainerLocation', ViewContainerLocationToString(viewDescriptorService.getViewContainerLocation(viewContainer)));
        super(MenuId.ViewContainerTitle, MenuId.ViewContainerTitleContext, { shouldForwardArgs: true, renderShortTitle: true }, scopedContextKeyService, menuService);
        this._register(scopedContextKeyService);
        this._register(Event.filter(viewDescriptorService.onDidChangeContainerLocation, e => e.viewContainer === viewContainer)(() => viewContainerLocationKey.set(ViewContainerLocationToString(viewDescriptorService.getViewContainerLocation(viewContainer)))));
    }
};
ViewContainerMenuActions = __decorate([
    __param(2, IViewDescriptorService),
    __param(3, IContextKeyService),
    __param(4, IMenuService)
], ViewContainerMenuActions);
let ViewPaneContainer = class ViewPaneContainer extends Component {
    get onDidSashChange() {
        return assertIsDefined(this.paneview).onDidSashChange;
    }
    get panes() {
        return this.paneItems.map(i => i.pane);
    }
    get views() {
        return this.panes;
    }
    get length() {
        return this.paneItems.length;
    }
    get menuActions() {
        return this._menuActions;
    }
    constructor(id, options, instantiationService, configurationService, layoutService, contextMenuService, telemetryService, extensionService, themeService, storageService, contextService, viewDescriptorService, logService) {
        super(id, themeService, storageService);
        this.options = options;
        this.instantiationService = instantiationService;
        this.configurationService = configurationService;
        this.layoutService = layoutService;
        this.contextMenuService = contextMenuService;
        this.telemetryService = telemetryService;
        this.extensionService = extensionService;
        this.storageService = storageService;
        this.contextService = contextService;
        this.viewDescriptorService = viewDescriptorService;
        this.logService = logService;
        this.paneItems = [];
        this.visible = false;
        this.areExtensionsReady = false;
        this.didLayout = false;
        this._onTitleAreaUpdate = this._register(new Emitter());
        this.onTitleAreaUpdate = this._onTitleAreaUpdate.event;
        this._onDidChangeVisibility = this._register(new Emitter());
        this.onDidChangeVisibility = this._onDidChangeVisibility.event;
        this._onDidAddViews = this._register(new Emitter());
        this.onDidAddViews = this._onDidAddViews.event;
        this._onDidRemoveViews = this._register(new Emitter());
        this.onDidRemoveViews = this._onDidRemoveViews.event;
        this._onDidChangeViewVisibility = this._register(new Emitter());
        this.onDidChangeViewVisibility = this._onDidChangeViewVisibility.event;
        this._onDidFocusView = this._register(new Emitter());
        this.onDidFocusView = this._onDidFocusView.event;
        this._onDidBlurView = this._register(new Emitter());
        this.onDidBlurView = this._onDidBlurView.event;
        const container = this.viewDescriptorService.getViewContainerById(id);
        if (!container) {
            throw new Error('Could not find container');
        }
        this.viewContainer = container;
        this.visibleViewsStorageId = `${id}.numberOfVisibleViews`;
        this.visibleViewsCountFromCache = this.storageService.getNumber(this.visibleViewsStorageId, 1 /* StorageScope.WORKSPACE */, undefined);
        this.viewContainerModel = this.viewDescriptorService.getViewContainerModel(container);
    }
    create(parent) {
        const options = this.options;
        options.orientation = this.orientation;
        this.paneview = this._register(new PaneView(parent, this.options));
        if (this._boundarySashes) {
            this.paneview.setBoundarySashes(this._boundarySashes);
        }
        this._register(this.paneview.onDidDrop(({ from, to }) => this.movePane(from, to)));
        this._register(this.paneview.onDidScroll(_ => this.onDidScrollPane()));
        this._register(this.paneview.onDidSashReset((index) => this.onDidSashReset(index)));
        this._register(addDisposableListener(parent, EventType.CONTEXT_MENU, (e) => this.showContextMenu(new StandardMouseEvent(getWindow(parent), e))));
        this._register(Gesture.addTarget(parent));
        this._register(addDisposableListener(parent, TouchEventType.Contextmenu, (e) => this.showContextMenu(new StandardMouseEvent(getWindow(parent), e))));
        this._menuActions = this._register(this.instantiationService.createInstance(ViewContainerMenuActions, this.paneview.element, this.viewContainer));
        this._register(this._menuActions.onDidChange(() => this.updateTitleArea()));
        let overlay;
        const getOverlayBounds = () => {
            const fullSize = parent.getBoundingClientRect();
            const lastPane = this.panes[this.panes.length - 1].element.getBoundingClientRect();
            const top = this.orientation === 0 /* Orientation.VERTICAL */ ? lastPane.bottom : fullSize.top;
            const left = this.orientation === 1 /* Orientation.HORIZONTAL */ ? lastPane.right : fullSize.left;
            return {
                top,
                bottom: fullSize.bottom,
                left,
                right: fullSize.right,
            };
        };
        const inBounds = (bounds, pos) => {
            return pos.x >= bounds.left && pos.x <= bounds.right && pos.y >= bounds.top && pos.y <= bounds.bottom;
        };
        let bounds;
        this._register(CompositeDragAndDropObserver.INSTANCE.registerTarget(parent, {
            onDragEnter: (e) => {
                bounds = getOverlayBounds();
                if (overlay && overlay.disposed) {
                    overlay = undefined;
                }
                if (!overlay && inBounds(bounds, e.eventData)) {
                    const dropData = e.dragAndDropData.getData();
                    if (dropData.type === 'view') {
                        const oldViewContainer = this.viewDescriptorService.getViewContainerByViewId(dropData.id);
                        const viewDescriptor = this.viewDescriptorService.getViewDescriptorById(dropData.id);
                        if (oldViewContainer !== this.viewContainer && (!viewDescriptor || !viewDescriptor.canMoveView || this.viewContainer.rejectAddedViews)) {
                            return;
                        }
                        overlay = new ViewPaneDropOverlay(parent, undefined, bounds, this.viewDescriptorService.getViewContainerLocation(this.viewContainer), this.themeService);
                    }
                    if (dropData.type === 'composite' && dropData.id !== this.viewContainer.id) {
                        const container = this.viewDescriptorService.getViewContainerById(dropData.id);
                        const viewsToMove = this.viewDescriptorService.getViewContainerModel(container).allViewDescriptors;
                        if (!viewsToMove.some(v => !v.canMoveView) && viewsToMove.length > 0) {
                            overlay = new ViewPaneDropOverlay(parent, undefined, bounds, this.viewDescriptorService.getViewContainerLocation(this.viewContainer), this.themeService);
                        }
                    }
                }
            },
            onDragOver: (e) => {
                if (overlay && overlay.disposed) {
                    overlay = undefined;
                }
                if (overlay && !inBounds(bounds, e.eventData)) {
                    overlay.dispose();
                    overlay = undefined;
                }
                if (inBounds(bounds, e.eventData)) {
                    toggleDropEffect(e.eventData.dataTransfer, 'move', overlay !== undefined);
                }
            },
            onDragLeave: (e) => {
                overlay?.dispose();
                overlay = undefined;
            },
            onDrop: (e) => {
                if (overlay) {
                    const dropData = e.dragAndDropData.getData();
                    const viewsToMove = [];
                    if (dropData.type === 'composite' && dropData.id !== this.viewContainer.id) {
                        const container = this.viewDescriptorService.getViewContainerById(dropData.id);
                        const allViews = this.viewDescriptorService.getViewContainerModel(container).allViewDescriptors;
                        if (!allViews.some(v => !v.canMoveView)) {
                            viewsToMove.push(...allViews);
                        }
                    }
                    else if (dropData.type === 'view') {
                        const oldViewContainer = this.viewDescriptorService.getViewContainerByViewId(dropData.id);
                        const viewDescriptor = this.viewDescriptorService.getViewDescriptorById(dropData.id);
                        if (oldViewContainer !== this.viewContainer && viewDescriptor && viewDescriptor.canMoveView) {
                            this.viewDescriptorService.moveViewsToContainer([viewDescriptor], this.viewContainer, undefined, 'dnd');
                        }
                    }
                    const paneCount = this.panes.length;
                    if (viewsToMove.length > 0) {
                        this.viewDescriptorService.moveViewsToContainer(viewsToMove, this.viewContainer, undefined, 'dnd');
                    }
                    if (paneCount > 0) {
                        for (const view of viewsToMove) {
                            const paneToMove = this.panes.find(p => p.id === view.id);
                            if (paneToMove) {
                                this.movePane(paneToMove, this.panes[this.panes.length - 1]);
                            }
                        }
                    }
                }
                overlay?.dispose();
                overlay = undefined;
            }
        }));
        this._register(this.onDidSashChange(() => this.saveViewSizes()));
        this._register(this.viewContainerModel.onDidAddVisibleViewDescriptors(added => this.onDidAddViewDescriptors(added)));
        this._register(this.viewContainerModel.onDidRemoveVisibleViewDescriptors(removed => this.onDidRemoveViewDescriptors(removed)));
        const addedViews = this.viewContainerModel.visibleViewDescriptors.map((viewDescriptor, index) => {
            const size = this.viewContainerModel.getSize(viewDescriptor.id);
            const collapsed = this.viewContainerModel.isCollapsed(viewDescriptor.id);
            return ({ viewDescriptor, index, size, collapsed });
        });
        if (addedViews.length) {
            this.onDidAddViewDescriptors(addedViews);
        }
        // Update headers after and title contributed views after available, since we read from cache in the beginning to know if the viewlet has single view or not. Ref #29609
        this.extensionService.whenInstalledExtensionsRegistered().then(() => {
            this.areExtensionsReady = true;
            if (this.panes.length) {
                this.updateTitleArea();
                this.updateViewHeaders();
            }
            this._register(this.configurationService.onDidChangeConfiguration(e => {
                if (e.affectsConfiguration("workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */)) {
                    this.updateViewHeaders();
                }
            }));
        });
        this._register(this.viewContainerModel.onDidChangeActiveViewDescriptors(() => this._onTitleAreaUpdate.fire()));
    }
    getTitle() {
        const containerTitle = this.viewContainerModel.title;
        if (this.isViewMergedWithContainer()) {
            const singleViewPaneContainerTitle = this.paneItems[0].pane.singleViewPaneContainerTitle;
            if (singleViewPaneContainerTitle) {
                return singleViewPaneContainerTitle;
            }
            const paneItemTitle = this.paneItems[0].pane.title;
            if (containerTitle === paneItemTitle) {
                return paneItemTitle;
            }
            return paneItemTitle ? `${containerTitle}: ${paneItemTitle}` : containerTitle;
        }
        return containerTitle;
    }
    showContextMenu(event) {
        for (const paneItem of this.paneItems) {
            // Do not show context menu if target is coming from inside pane views
            if (isAncestor(event.target, paneItem.pane.element)) {
                return;
            }
        }
        event.stopPropagation();
        event.preventDefault();
        this.contextMenuService.showContextMenu({
            getAnchor: () => event,
            getActions: () => this.menuActions?.getContextMenuActions() ?? []
        });
    }
    getActionsContext() {
        if (this.isViewMergedWithContainer()) {
            return this.panes[0].getActionsContext();
        }
        return undefined;
    }
    getActionViewItem(action, options) {
        if (this.isViewMergedWithContainer()) {
            return this.paneItems[0].pane.createActionViewItem(action, options);
        }
        return createActionViewItem(this.instantiationService, action, options);
    }
    focus() {
        let paneToFocus = undefined;
        if (this.lastFocusedPane) {
            paneToFocus = this.lastFocusedPane;
        }
        else if (this.paneItems.length > 0) {
            for (const { pane } of this.paneItems) {
                if (pane.isExpanded()) {
                    paneToFocus = pane;
                    break;
                }
            }
        }
        if (paneToFocus) {
            paneToFocus.focus();
        }
    }
    get orientation() {
        switch (this.viewDescriptorService.getViewContainerLocation(this.viewContainer)) {
            case 0 /* ViewContainerLocation.Sidebar */:
            case 2 /* ViewContainerLocation.AuxiliaryBar */:
                return 0 /* Orientation.VERTICAL */;
            case 1 /* ViewContainerLocation.Panel */: {
                return isHorizontal(this.layoutService.getPanelPosition()) ? 1 /* Orientation.HORIZONTAL */ : 0 /* Orientation.VERTICAL */;
            }
        }
        return 0 /* Orientation.VERTICAL */;
    }
    layout(dimension) {
        if (this.paneview) {
            if (this.paneview.orientation !== this.orientation) {
                this.paneview.flipOrientation(dimension.height, dimension.width);
            }
            this.paneview.layout(dimension.height, dimension.width);
        }
        this.dimension = dimension;
        if (this.didLayout) {
            this.saveViewSizes();
        }
        else {
            this.didLayout = true;
            this.restoreViewSizes();
        }
    }
    setBoundarySashes(sashes) {
        this._boundarySashes = sashes;
        this.paneview?.setBoundarySashes(sashes);
    }
    getOptimalWidth() {
        const additionalMargin = 16;
        const optimalWidth = Math.max(...this.panes.map(view => view.getOptimalWidth() || 0));
        return optimalWidth + additionalMargin;
    }
    addPanes(panes) {
        const wasMerged = this.isViewMergedWithContainer();
        for (const { pane, size, index, disposable } of panes) {
            this.addPane(pane, size, disposable, index);
        }
        this.updateViewHeaders();
        if (this.isViewMergedWithContainer() !== wasMerged) {
            this.updateTitleArea();
        }
        this._onDidAddViews.fire(panes.map(({ pane }) => pane));
    }
    setVisible(visible) {
        if (this.visible !== !!visible) {
            this.visible = visible;
            this._onDidChangeVisibility.fire(visible);
        }
        this.panes.filter(view => view.isVisible() !== visible)
            .map((view) => view.setVisible(visible));
    }
    isVisible() {
        return this.visible;
    }
    updateTitleArea() {
        this._onTitleAreaUpdate.fire();
    }
    createView(viewDescriptor, options) {
        return this.instantiationService.createInstance(viewDescriptor.ctorDescriptor.ctor, ...(viewDescriptor.ctorDescriptor.staticArguments || []), options);
    }
    getView(id) {
        return this.panes.filter(view => view.id === id)[0];
    }
    saveViewSizes() {
        // Save size only when the layout has happened
        if (this.didLayout) {
            this.viewContainerModel.setSizes(this.panes.map(view => ({ id: view.id, size: this.getPaneSize(view) })));
        }
    }
    restoreViewSizes() {
        // Restore sizes only when the layout has happened
        if (this.didLayout) {
            let initialSizes;
            for (let i = 0; i < this.viewContainerModel.visibleViewDescriptors.length; i++) {
                const pane = this.panes[i];
                const viewDescriptor = this.viewContainerModel.visibleViewDescriptors[i];
                const size = this.viewContainerModel.getSize(viewDescriptor.id);
                if (typeof size === 'number') {
                    this.resizePane(pane, size);
                }
                else {
                    initialSizes = initialSizes ? initialSizes : this.computeInitialSizes();
                    this.resizePane(pane, initialSizes.get(pane.id) || 200);
                }
            }
        }
    }
    computeInitialSizes() {
        const sizes = new Map();
        if (this.dimension) {
            const totalWeight = this.viewContainerModel.visibleViewDescriptors.reduce((totalWeight, { weight }) => totalWeight + (weight || 20), 0);
            for (const viewDescriptor of this.viewContainerModel.visibleViewDescriptors) {
                if (this.orientation === 0 /* Orientation.VERTICAL */) {
                    sizes.set(viewDescriptor.id, this.dimension.height * (viewDescriptor.weight || 20) / totalWeight);
                }
                else {
                    sizes.set(viewDescriptor.id, this.dimension.width * (viewDescriptor.weight || 20) / totalWeight);
                }
            }
        }
        return sizes;
    }
    saveState() {
        this.panes.forEach((view) => view.saveState());
        this.storageService.store(this.visibleViewsStorageId, this.length, 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
    }
    onContextMenu(event, viewPane) {
        event.stopPropagation();
        event.preventDefault();
        const actions = viewPane.menuActions.getContextMenuActions();
        this.contextMenuService.showContextMenu({
            getAnchor: () => event,
            getActions: () => actions
        });
    }
    openView(id, focus) {
        let view = this.getView(id);
        if (!view) {
            this.toggleViewVisibility(id);
        }
        view = this.getView(id);
        if (view) {
            view.setExpanded(true);
            if (focus) {
                view.focus();
            }
        }
        return view;
    }
    onDidAddViewDescriptors(added) {
        const panesToAdd = [];
        for (const { viewDescriptor, collapsed, index, size } of added) {
            const pane = this.createView(viewDescriptor, {
                id: viewDescriptor.id,
                title: viewDescriptor.name.value,
                fromExtensionId: viewDescriptor.extensionId,
                expanded: !collapsed,
                singleViewPaneContainerTitle: viewDescriptor.singleViewPaneContainerTitle,
            });
            try {
                pane.render();
            }
            catch (error) {
                this.logService.error(`Fail to render view ${viewDescriptor.id}`, error);
                continue;
            }
            if (pane.draggableElement) {
                const contextMenuDisposable = addDisposableListener(pane.draggableElement, 'contextmenu', e => {
                    e.stopPropagation();
                    e.preventDefault();
                    this.onContextMenu(new StandardMouseEvent(getWindow(pane.draggableElement), e), pane);
                });
                const collapseDisposable = Event.latch(Event.map(pane.onDidChange, () => !pane.isExpanded()))(collapsed => {
                    this.viewContainerModel.setCollapsed(viewDescriptor.id, collapsed);
                });
                panesToAdd.push({ pane, size: size || pane.minimumSize, index, disposable: combinedDisposable(contextMenuDisposable, collapseDisposable) });
            }
        }
        this.addPanes(panesToAdd);
        this.restoreViewSizes();
        const panes = [];
        for (const { pane } of panesToAdd) {
            pane.setVisible(this.isVisible());
            panes.push(pane);
        }
        return panes;
    }
    onDidRemoveViewDescriptors(removed) {
        removed = removed.sort((a, b) => b.index - a.index);
        const panesToRemove = [];
        for (const { index } of removed) {
            const paneItem = this.paneItems[index];
            if (paneItem) {
                panesToRemove.push(this.paneItems[index].pane);
            }
        }
        if (panesToRemove.length) {
            this.removePanes(panesToRemove);
            for (const pane of panesToRemove) {
                pane.setVisible(false);
            }
        }
    }
    toggleViewVisibility(viewId) {
        // Check if view is active
        if (this.viewContainerModel.activeViewDescriptors.some(viewDescriptor => viewDescriptor.id === viewId)) {
            const visible = !this.viewContainerModel.isVisible(viewId);
            this.viewContainerModel.setVisible(viewId, visible);
        }
    }
    addPane(pane, size, disposable, index = this.paneItems.length - 1) {
        const onDidFocus = pane.onDidFocus(() => {
            this._onDidFocusView.fire(pane);
            this.lastFocusedPane = pane;
        });
        const onDidBlur = pane.onDidBlur(() => this._onDidBlurView.fire(pane));
        const onDidChangeTitleArea = pane.onDidChangeTitleArea(() => {
            if (this.isViewMergedWithContainer()) {
                this.updateTitleArea();
            }
        });
        const onDidChangeVisibility = pane.onDidChangeBodyVisibility(() => this._onDidChangeViewVisibility.fire(pane));
        const onDidChange = pane.onDidChange(() => {
            if (pane === this.lastFocusedPane && !pane.isExpanded()) {
                this.lastFocusedPane = undefined;
            }
        });
        const isPanel = this.viewDescriptorService.getViewContainerLocation(this.viewContainer) === 1 /* ViewContainerLocation.Panel */;
        pane.style({
            headerForeground: asCssVariable(isPanel ? PANEL_SECTION_HEADER_FOREGROUND : SIDE_BAR_SECTION_HEADER_FOREGROUND),
            headerBackground: asCssVariable(isPanel ? PANEL_SECTION_HEADER_BACKGROUND : SIDE_BAR_SECTION_HEADER_BACKGROUND),
            headerBorder: asCssVariable(isPanel ? PANEL_SECTION_HEADER_BORDER : SIDE_BAR_SECTION_HEADER_BORDER),
            dropBackground: asCssVariable(isPanel ? PANEL_SECTION_DRAG_AND_DROP_BACKGROUND : SIDE_BAR_DRAG_AND_DROP_BACKGROUND),
            leftBorder: isPanel ? asCssVariable(PANEL_SECTION_BORDER) : undefined
        });
        const store = new DisposableStore();
        store.add(disposable);
        store.add(combinedDisposable(pane, onDidFocus, onDidBlur, onDidChangeTitleArea, onDidChange, onDidChangeVisibility));
        const paneItem = { pane, disposable: store };
        this.paneItems.splice(index, 0, paneItem);
        assertIsDefined(this.paneview).addPane(pane, size, index);
        let overlay;
        if (pane.draggableElement) {
            store.add(CompositeDragAndDropObserver.INSTANCE.registerDraggable(pane.draggableElement, () => { return { type: 'view', id: pane.id }; }, {}));
        }
        store.add(CompositeDragAndDropObserver.INSTANCE.registerTarget(pane.dropTargetElement, {
            onDragEnter: (e) => {
                if (!overlay) {
                    const dropData = e.dragAndDropData.getData();
                    if (dropData.type === 'view' && dropData.id !== pane.id) {
                        const oldViewContainer = this.viewDescriptorService.getViewContainerByViewId(dropData.id);
                        const viewDescriptor = this.viewDescriptorService.getViewDescriptorById(dropData.id);
                        if (oldViewContainer !== this.viewContainer && (!viewDescriptor || !viewDescriptor.canMoveView || this.viewContainer.rejectAddedViews)) {
                            return;
                        }
                        overlay = new ViewPaneDropOverlay(pane.dropTargetElement, this.orientation ?? 0 /* Orientation.VERTICAL */, undefined, this.viewDescriptorService.getViewContainerLocation(this.viewContainer), this.themeService);
                    }
                    if (dropData.type === 'composite' && dropData.id !== this.viewContainer.id && !this.viewContainer.rejectAddedViews) {
                        const container = this.viewDescriptorService.getViewContainerById(dropData.id);
                        const viewsToMove = this.viewDescriptorService.getViewContainerModel(container).allViewDescriptors;
                        if (!viewsToMove.some(v => !v.canMoveView) && viewsToMove.length > 0) {
                            overlay = new ViewPaneDropOverlay(pane.dropTargetElement, this.orientation ?? 0 /* Orientation.VERTICAL */, undefined, this.viewDescriptorService.getViewContainerLocation(this.viewContainer), this.themeService);
                        }
                    }
                }
            },
            onDragOver: (e) => {
                toggleDropEffect(e.eventData.dataTransfer, 'move', overlay !== undefined);
            },
            onDragLeave: (e) => {
                overlay?.dispose();
                overlay = undefined;
            },
            onDrop: (e) => {
                if (overlay) {
                    const dropData = e.dragAndDropData.getData();
                    const viewsToMove = [];
                    let anchorView;
                    if (dropData.type === 'composite' && dropData.id !== this.viewContainer.id && !this.viewContainer.rejectAddedViews) {
                        const container = this.viewDescriptorService.getViewContainerById(dropData.id);
                        const allViews = this.viewDescriptorService.getViewContainerModel(container).allViewDescriptors;
                        if (allViews.length > 0 && !allViews.some(v => !v.canMoveView)) {
                            viewsToMove.push(...allViews);
                            anchorView = allViews[0];
                        }
                    }
                    else if (dropData.type === 'view') {
                        const oldViewContainer = this.viewDescriptorService.getViewContainerByViewId(dropData.id);
                        const viewDescriptor = this.viewDescriptorService.getViewDescriptorById(dropData.id);
                        if (oldViewContainer !== this.viewContainer && viewDescriptor && viewDescriptor.canMoveView && !this.viewContainer.rejectAddedViews) {
                            viewsToMove.push(viewDescriptor);
                        }
                        if (viewDescriptor) {
                            anchorView = viewDescriptor;
                        }
                    }
                    if (viewsToMove) {
                        this.viewDescriptorService.moveViewsToContainer(viewsToMove, this.viewContainer, undefined, 'dnd');
                    }
                    if (anchorView) {
                        if (overlay.currentDropOperation === 1 /* DropDirection.DOWN */ ||
                            overlay.currentDropOperation === 3 /* DropDirection.RIGHT */) {
                            const fromIndex = this.panes.findIndex(p => p.id === anchorView.id);
                            let toIndex = this.panes.findIndex(p => p.id === pane.id);
                            if (fromIndex >= 0 && toIndex >= 0) {
                                if (fromIndex > toIndex) {
                                    toIndex++;
                                }
                                if (toIndex < this.panes.length && toIndex !== fromIndex) {
                                    this.movePane(this.panes[fromIndex], this.panes[toIndex]);
                                }
                            }
                        }
                        if (overlay.currentDropOperation === 0 /* DropDirection.UP */ ||
                            overlay.currentDropOperation === 2 /* DropDirection.LEFT */) {
                            const fromIndex = this.panes.findIndex(p => p.id === anchorView.id);
                            let toIndex = this.panes.findIndex(p => p.id === pane.id);
                            if (fromIndex >= 0 && toIndex >= 0) {
                                if (fromIndex < toIndex) {
                                    toIndex--;
                                }
                                if (toIndex >= 0 && toIndex !== fromIndex) {
                                    this.movePane(this.panes[fromIndex], this.panes[toIndex]);
                                }
                            }
                        }
                        if (viewsToMove.length > 1) {
                            viewsToMove.slice(1).forEach(view => {
                                let toIndex = this.panes.findIndex(p => p.id === anchorView.id);
                                const fromIndex = this.panes.findIndex(p => p.id === view.id);
                                if (fromIndex >= 0 && toIndex >= 0) {
                                    if (fromIndex > toIndex) {
                                        toIndex++;
                                    }
                                    if (toIndex < this.panes.length && toIndex !== fromIndex) {
                                        this.movePane(this.panes[fromIndex], this.panes[toIndex]);
                                        anchorView = view;
                                    }
                                }
                            });
                        }
                    }
                }
                overlay?.dispose();
                overlay = undefined;
            }
        }));
    }
    removePanes(panes) {
        const wasMerged = this.isViewMergedWithContainer();
        panes.forEach(pane => this.removePane(pane));
        this.updateViewHeaders();
        if (wasMerged !== this.isViewMergedWithContainer()) {
            this.updateTitleArea();
        }
        this._onDidRemoveViews.fire(panes);
    }
    removePane(pane) {
        const index = this.paneItems.findIndex(i => i.pane === pane);
        if (index === -1) {
            return;
        }
        if (this.lastFocusedPane === pane) {
            this.lastFocusedPane = undefined;
        }
        assertIsDefined(this.paneview).removePane(pane);
        const [paneItem] = this.paneItems.splice(index, 1);
        paneItem.disposable.dispose();
    }
    movePane(from, to) {
        const fromIndex = this.paneItems.findIndex(item => item.pane === from);
        const toIndex = this.paneItems.findIndex(item => item.pane === to);
        const fromViewDescriptor = this.viewContainerModel.visibleViewDescriptors[fromIndex];
        const toViewDescriptor = this.viewContainerModel.visibleViewDescriptors[toIndex];
        if (fromIndex < 0 || fromIndex >= this.paneItems.length) {
            return;
        }
        if (toIndex < 0 || toIndex >= this.paneItems.length) {
            return;
        }
        const [paneItem] = this.paneItems.splice(fromIndex, 1);
        this.paneItems.splice(toIndex, 0, paneItem);
        assertIsDefined(this.paneview).movePane(from, to);
        this.viewContainerModel.move(fromViewDescriptor.id, toViewDescriptor.id);
        this.updateTitleArea();
    }
    resizePane(pane, size) {
        assertIsDefined(this.paneview).resizePane(pane, size);
    }
    getPaneSize(pane) {
        return assertIsDefined(this.paneview).getPaneSize(pane);
    }
    updateViewHeaders() {
        if (this.isViewMergedWithContainer()) {
            if (this.paneItems[0].pane.isExpanded()) {
                this.lastMergedCollapsedPane = undefined;
            }
            else {
                this.lastMergedCollapsedPane = this.paneItems[0].pane;
                this.paneItems[0].pane.setExpanded(true);
            }
            this.paneItems[0].pane.headerVisible = false;
            this.paneItems[0].pane.collapsible = true;
        }
        else {
            if (this.paneItems.length === 1) {
                this.paneItems[0].pane.headerVisible = true;
                if (this.paneItems[0].pane === this.lastMergedCollapsedPane) {
                    this.paneItems[0].pane.setExpanded(false);
                }
                this.paneItems[0].pane.collapsible = false;
            }
            else {
                this.paneItems.forEach(i => {
                    i.pane.headerVisible = true;
                    i.pane.collapsible = true;
                    if (i.pane === this.lastMergedCollapsedPane) {
                        i.pane.setExpanded(false);
                    }
                });
            }
            this.lastMergedCollapsedPane = undefined;
        }
    }
    isViewMergedWithContainer() {
        if (!(this.options.mergeViewWithContainerWhenSingleView && this.paneItems.length === 1)) {
            return false;
        }
        if (!this.areExtensionsReady) {
            if (this.visibleViewsCountFromCache === undefined) {
                return this.paneItems[0].pane.isExpanded();
            }
            // Check in cache so that view do not jump. See #29609
            return this.visibleViewsCountFromCache === 1;
        }
        return true;
    }
    onDidScrollPane() {
        for (const pane of this.panes) {
            pane.onDidScrollRoot();
        }
    }
    onDidSashReset(index) {
        let firstPane = undefined;
        let secondPane = undefined;
        // Deal with collapsed views: to be clever, we split the space taken by the nearest uncollapsed views
        for (let i = index; i >= 0; i--) {
            if (this.paneItems[i].pane?.isVisible() && this.paneItems[i]?.pane.isExpanded()) {
                firstPane = this.paneItems[i].pane;
                break;
            }
        }
        for (let i = index + 1; i < this.paneItems.length; i++) {
            if (this.paneItems[i].pane?.isVisible() && this.paneItems[i]?.pane.isExpanded()) {
                secondPane = this.paneItems[i].pane;
                break;
            }
        }
        if (firstPane && secondPane) {
            const firstPaneSize = this.getPaneSize(firstPane);
            const secondPaneSize = this.getPaneSize(secondPane);
            // Avoid rounding errors and be consistent when resizing
            // The first pane always get half rounded up and the second is half rounded down
            const newFirstPaneSize = Math.ceil((firstPaneSize + secondPaneSize) / 2);
            const newSecondPaneSize = Math.floor((firstPaneSize + secondPaneSize) / 2);
            // Shrink the larger pane first, then grow the smaller pane
            // This prevents interfering with other view sizes
            if (firstPaneSize > secondPaneSize) {
                this.resizePane(firstPane, newFirstPaneSize);
                this.resizePane(secondPane, newSecondPaneSize);
            }
            else {
                this.resizePane(secondPane, newSecondPaneSize);
                this.resizePane(firstPane, newFirstPaneSize);
            }
        }
    }
    dispose() {
        super.dispose();
        this.paneItems.forEach(i => i.disposable.dispose());
        if (this.paneview) {
            this.paneview.dispose();
        }
    }
};
ViewPaneContainer = __decorate([
    __param(2, IInstantiationService),
    __param(3, IConfigurationService),
    __param(4, IWorkbenchLayoutService),
    __param(5, IContextMenuService),
    __param(6, ITelemetryService),
    __param(7, IExtensionService),
    __param(8, IThemeService),
    __param(9, IStorageService),
    __param(10, IWorkspaceContextService),
    __param(11, IViewDescriptorService),
    __param(12, ILogService)
], ViewPaneContainer);
export { ViewPaneContainer };
export class ViewPaneContainerAction extends Action2 {
    constructor(desc) {
        super(desc);
        this.desc = desc;
    }
    run(accessor, ...args) {
        const viewPaneContainer = accessor.get(IViewsService).getActiveViewPaneContainerWithId(this.desc.viewPaneContainerId);
        if (viewPaneContainer) {
            return this.runInViewPaneContainer(accessor, viewPaneContainer, ...args);
        }
        return undefined;
    }
}
class MoveViewPosition extends Action2 {
    constructor(desc, offset) {
        super(desc);
        this.offset = offset;
    }
    async run(accessor) {
        const viewDescriptorService = accessor.get(IViewDescriptorService);
        const contextKeyService = accessor.get(IContextKeyService);
        const viewId = FocusedViewContext.getValue(contextKeyService);
        if (viewId === undefined) {
            return;
        }
        const viewContainer = viewDescriptorService.getViewContainerByViewId(viewId);
        const model = viewDescriptorService.getViewContainerModel(viewContainer);
        const viewDescriptor = model.visibleViewDescriptors.find(vd => vd.id === viewId);
        const currentIndex = model.visibleViewDescriptors.indexOf(viewDescriptor);
        if (currentIndex + this.offset < 0 || currentIndex + this.offset >= model.visibleViewDescriptors.length) {
            return;
        }
        const newPosition = model.visibleViewDescriptors[currentIndex + this.offset];
        model.move(viewDescriptor.id, newPosition.id);
    }
}
registerAction2(class MoveViewUp extends MoveViewPosition {
    constructor() {
        super({
            id: 'views.moveViewUp',
            title: nls.localize('viewMoveUp', "Move View Up"),
            keybinding: {
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ + 41 /* KeyCode.KeyK */, 16 /* KeyCode.UpArrow */),
                weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 1,
                when: FocusedViewContext.notEqualsTo('')
            }
        }, -1);
    }
});
registerAction2(class MoveViewLeft extends MoveViewPosition {
    constructor() {
        super({
            id: 'views.moveViewLeft',
            title: nls.localize('viewMoveLeft', "Move View Left"),
            keybinding: {
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ + 41 /* KeyCode.KeyK */, 15 /* KeyCode.LeftArrow */),
                weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 1,
                when: FocusedViewContext.notEqualsTo('')
            }
        }, -1);
    }
});
registerAction2(class MoveViewDown extends MoveViewPosition {
    constructor() {
        super({
            id: 'views.moveViewDown',
            title: nls.localize('viewMoveDown', "Move View Down"),
            keybinding: {
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ + 41 /* KeyCode.KeyK */, 18 /* KeyCode.DownArrow */),
                weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 1,
                when: FocusedViewContext.notEqualsTo('')
            }
        }, 1);
    }
});
registerAction2(class MoveViewRight extends MoveViewPosition {
    constructor() {
        super({
            id: 'views.moveViewRight',
            title: nls.localize('viewMoveRight', "Move View Right"),
            keybinding: {
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ + 41 /* KeyCode.KeyK */, 17 /* KeyCode.RightArrow */),
                weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 1,
                when: FocusedViewContext.notEqualsTo('')
            }
        }, 1);
    }
});
registerAction2(class MoveViews extends Action2 {
    constructor() {
        super({
            id: 'vscode.moveViews',
            title: nls.localize('viewsMove', "Move Views"),
        });
    }
    async run(accessor, options) {
        if (!Array.isArray(options?.viewIds) || typeof options?.destinationId !== 'string') {
            return Promise.reject('Invalid arguments');
        }
        const viewDescriptorService = accessor.get(IViewDescriptorService);
        const destination = viewDescriptorService.getViewContainerById(options.destinationId);
        if (!destination) {
            return;
        }
        // FYI, don't use `moveViewsToContainer` in 1 shot, because it expects all views to have the same current location
        for (const viewId of options.viewIds) {
            const viewDescriptor = viewDescriptorService.getViewDescriptorById(viewId);
            if (viewDescriptor?.canMoveView) {
                viewDescriptorService.moveViewsToContainer([viewDescriptor], destination, ViewVisibilityState.Default, this.desc.id);
            }
        }
        await accessor.get(IViewsService).openViewContainer(destination.id, true);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld1BhbmVDb250YWluZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2Jyb3dzZXIvcGFydHMvdmlld3Mvdmlld1BhbmVDb250YWluZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLENBQUMsRUFBRSxxQkFBcUIsRUFBYSxtQkFBbUIsRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLFVBQVUsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQzdJLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxTQUFTLElBQUksY0FBYyxFQUFFLE9BQU8sRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBR3pGLE9BQU8sRUFBb0IsUUFBUSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFFL0YsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDcEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsUUFBUSxFQUFtQixNQUFNLHFDQUFxQyxDQUFDO0FBQ2hGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxlQUFlLEVBQWUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDdEgsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ25FLE9BQU8seUJBQXlCLENBQUM7QUFDakMsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQztBQUMxQyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQztBQUN2RyxPQUFPLEVBQUUsT0FBTyxFQUFtQixZQUFZLEVBQWdCLE1BQU0sRUFBRSxZQUFZLEVBQUUs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