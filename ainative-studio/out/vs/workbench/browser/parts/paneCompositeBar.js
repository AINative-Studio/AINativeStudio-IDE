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
var ViewContainerActivityAction_1;
import { localize } from '../../../nls.js';
import { IActivityService } from '../../services/activity/common/activity.js';
import { IWorkbenchLayoutService } from '../../services/layout/browser/layoutService.js';
import { IInstantiationService } from '../../../platform/instantiation/common/instantiation.js';
import { DisposableStore, Disposable, DisposableMap } from '../../../base/common/lifecycle.js';
import { CompositeBar, CompositeDragAndDrop } from './compositeBar.js';
import { Dimension, isMouseEvent } from '../../../base/browser/dom.js';
import { createCSSRule } from '../../../base/browser/domStylesheets.js';
import { asCSSUrl } from '../../../base/browser/cssValue.js';
import { IStorageService } from '../../../platform/storage/common/storage.js';
import { IExtensionService } from '../../services/extensions/common/extensions.js';
import { URI } from '../../../base/common/uri.js';
import { ToggleCompositePinnedAction, ToggleCompositeBadgeAction, CompositeBarAction } from './compositeBarActions.js';
import { IViewDescriptorService } from '../../common/views.js';
import { IContextKeyService, ContextKeyExpr } from '../../../platform/contextkey/common/contextkey.js';
import { isString } from '../../../base/common/types.js';
import { IWorkbenchEnvironmentService } from '../../services/environment/common/environmentService.js';
import { isNative } from '../../../base/common/platform.js';
import { ThemeIcon } from '../../../base/common/themables.js';
import { Separator, SubmenuAction, toAction } from '../../../base/common/actions.js';
import { StringSHA1 } from '../../../base/common/hash.js';
import { IConfigurationService } from '../../../platform/configuration/common/configuration.js';
import { IViewsService } from '../../services/views/common/viewsService.js';
let PaneCompositeBar = class PaneCompositeBar extends Disposable {
    constructor(options, part, paneCompositePart, instantiationService, storageService, extensionService, viewDescriptorService, viewService, contextKeyService, environmentService, layoutService) {
        super();
        this.options = options;
        this.part = part;
        this.paneCompositePart = paneCompositePart;
        this.instantiationService = instantiationService;
        this.storageService = storageService;
        this.extensionService = extensionService;
        this.viewDescriptorService = viewDescriptorService;
        this.viewService = viewService;
        this.contextKeyService = contextKeyService;
        this.environmentService = environmentService;
        this.layoutService = layoutService;
        this.viewContainerDisposables = this._register(new DisposableMap());
        this.compositeActions = new Map();
        this.hasExtensionsRegistered = false;
        this._cachedViewContainers = undefined;
        this.location = paneCompositePart.partId === "workbench.parts.panel" /* Parts.PANEL_PART */
            ? 1 /* ViewContainerLocation.Panel */ : paneCompositePart.partId === "workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */
            ? 2 /* ViewContainerLocation.AuxiliaryBar */ : 0 /* ViewContainerLocation.Sidebar */;
        this.dndHandler = new CompositeDragAndDrop(this.viewDescriptorService, this.location, this.options.orientation, async (id, focus) => { return await this.paneCompositePart.openPaneComposite(id, focus) ?? null; }, (from, to, before) => this.compositeBar.move(from, to, this.options.orientation === 1 /* ActionsOrientation.VERTICAL */ ? before?.verticallyBefore : before?.horizontallyBefore), () => this.compositeBar.getCompositeBarItems());
        const cachedItems = this.cachedViewContainers
            .map(container => ({
            id: container.id,
            name: container.name,
            visible: !this.shouldBeHidden(container.id, container),
            order: container.order,
            pinned: container.pinned,
        }));
        this.compositeBar = this.createCompositeBar(cachedItems);
        this.onDidRegisterViewContainers(this.getViewContainers());
        this.registerListeners();
    }
    createCompositeBar(cachedItems) {
        return this._register(this.instantiationService.createInstance(CompositeBar, cachedItems, {
            icon: this.options.icon,
            compact: this.options.compact,
            orientation: this.options.orientation,
            activityHoverOptions: this.options.activityHoverOptions,
            preventLoopNavigation: this.options.preventLoopNavigation,
            openComposite: async (compositeId, preserveFocus) => {
                return (await this.paneCompositePart.openPaneComposite(compositeId, !preserveFocus)) ?? null;
            },
            getActivityAction: compositeId => this.getCompositeActions(compositeId).activityAction,
            getCompositePinnedAction: compositeId => this.getCompositeActions(compositeId).pinnedAction,
            getCompositeBadgeAction: compositeId => this.getCompositeActions(compositeId).badgeAction,
            getOnCompositeClickAction: compositeId => this.getCompositeActions(compositeId).activityAction,
            fillExtraContextMenuActions: (actions, e) => this.options.fillExtraContextMenuActions(actions, e),
            getContextMenuActionsForComposite: compositeId => this.getContextMenuActionsForComposite(compositeId),
            getDefaultCompositeId: () => this.viewDescriptorService.getDefaultViewContainer(this.location)?.id,
            dndHandler: this.dndHandler,
            compositeSize: this.options.compositeSize,
            overflowActionSize: this.options.overflowActionSize,
            colors: theme => this.options.colors(theme),
        }));
    }
    getContextMenuActionsForComposite(compositeId) {
        const actions = [new Separator()];
        const viewContainer = this.viewDescriptorService.getViewContainerById(compositeId);
        const defaultLocation = this.viewDescriptorService.getDefaultViewContainerLocation(viewContainer);
        const currentLocation = this.viewDescriptorService.getViewContainerLocation(viewContainer);
        // Move View Container
        const moveActions = [];
        for (const location of [0 /* ViewContainerLocation.Sidebar */, 2 /* ViewContainerLocation.AuxiliaryBar */, 1 /* ViewContainerLocation.Panel */]) {
            if (currentLocation !== location) {
                moveActions.push(this.createMoveAction(viewContainer, location, defaultLocation));
            }
        }
        actions.push(new SubmenuAction('moveToMenu', localize('moveToMenu', "Move To"), moveActions));
        // Reset Location
        if (defaultLocation !== currentLocation) {
            actions.push(toAction({
                id: 'resetLocationAction', label: localize('resetLocation', "Reset Location"), run: () => {
                    this.viewDescriptorService.moveViewContainerToLocation(viewContainer, defaultLocation, undefined, 'resetLocationAction');
                    this.viewService.openViewContainer(viewContainer.id, true);
                }
            }));
        }
        else {
            const viewContainerModel = this.viewDescriptorService.getViewContainerModel(viewContainer);
            if (viewContainerModel.allViewDescriptors.length === 1) {
                const viewToReset = viewContainerModel.allViewDescriptors[0];
                const defaultContainer = this.viewDescriptorService.getDefaultContainerById(viewToReset.id);
                if (defaultContainer !== viewContainer) {
                    actions.push(toAction({
                        id: 'resetLocationAction', label: localize('resetLocation', "Reset Location"), run: () => {
                            this.viewDescriptorService.moveViewsToContainer([viewToReset], defaultContainer, undefined, 'resetLocationAction');
                            this.viewService.openViewContainer(viewContainer.id, true);
                        }
                    }));
                }
            }
        }
        return actions;
    }
    createMoveAction(viewContainer, newLocation, defaultLocation) {
        return toAction({
            id: `moveViewContainerTo${newLocation}`,
            label: newLocation === 1 /* ViewContainerLocation.Panel */ ? localize('panel', "Panel") : newLocation === 0 /* ViewContainerLocation.Sidebar */ ? localize('sidebar', "Primary Side Bar") : localize('auxiliarybar', "Void Side Bar"),
            run: () => {
                let index;
                if (newLocation !== defaultLocation) {
                    index = this.viewDescriptorService.getViewContainersByLocation(newLocation).length; // move to the end of the location
                }
                else {
                    index = undefined; // restore default location
                }
                this.viewDescriptorService.moveViewContainerToLocation(viewContainer, newLocation, index);
                this.viewService.openViewContainer(viewContainer.id, true);
            }
        });
    }
    registerListeners() {
        // View Container Changes
        this._register(this.viewDescriptorService.onDidChangeViewContainers(({ added, removed }) => this.onDidChangeViewContainers(added, removed)));
        this._register(this.viewDescriptorService.onDidChangeContainerLocation(({ viewContainer, from, to }) => this.onDidChangeViewContainerLocation(viewContainer, from, to)));
        // View Container Visibility Changes
        this._register(this.paneCompositePart.onDidPaneCompositeOpen(e => this.onDidChangeViewContainerVisibility(e.getId(), true)));
        this._register(this.paneCompositePart.onDidPaneCompositeClose(e => this.onDidChangeViewContainerVisibility(e.getId(), false)));
        // Extension registration
        this.extensionService.whenInstalledExtensionsRegistered().then(() => {
            if (this._store.isDisposed) {
                return;
            }
            this.onDidRegisterExtensions();
            this._register(this.compositeBar.onDidChange(() => {
                this.updateCompositeBarItemsFromStorage(true);
                this.saveCachedViewContainers();
            }));
            this._register(this.storageService.onDidChangeValue(0 /* StorageScope.PROFILE */, this.options.pinnedViewContainersKey, this._store)(() => this.updateCompositeBarItemsFromStorage(false)));
        });
    }
    onDidChangeViewContainers(added, removed) {
        removed.filter(({ location }) => location === this.location).forEach(({ container }) => this.onDidDeregisterViewContainer(container));
        this.onDidRegisterViewContainers(added.filter(({ location }) => location === this.location).map(({ container }) => container));
    }
    onDidChangeViewContainerLocation(container, from, to) {
        if (from === this.location) {
            this.onDidDeregisterViewContainer(container);
        }
        if (to === this.location) {
            this.onDidRegisterViewContainers([container]);
        }
    }
    onDidChangeViewContainerVisibility(id, visible) {
        if (visible) {
            // Activate view container action on opening of a view container
            this.onDidViewContainerVisible(id);
        }
        else {
            // Deactivate view container action on close
            this.compositeBar.deactivateComposite(id);
        }
    }
    onDidRegisterExtensions() {
        this.hasExtensionsRegistered = true;
        // show/hide/remove composites
        for (const { id } of this.cachedViewContainers) {
            const viewContainer = this.getViewContainer(id);
            if (viewContainer) {
                this.showOrHideViewContainer(viewContainer);
            }
            else {
                if (this.viewDescriptorService.isViewContainerRemovedPermanently(id)) {
                    this.removeComposite(id);
                }
                else {
                    this.hideComposite(id);
                }
            }
        }
        this.saveCachedViewContainers();
    }
    onDidViewContainerVisible(id) {
        const viewContainer = this.getViewContainer(id);
        if (viewContainer) {
            // Update the composite bar by adding
            this.addComposite(viewContainer);
            this.compositeBar.activateComposite(viewContainer.id);
            if (this.shouldBeHidden(viewContainer)) {
                const viewContainerModel = this.viewDescriptorService.getViewContainerModel(viewContainer);
                if (viewContainerModel.activeViewDescriptors.length === 0) {
                    // Update the composite bar by hiding
                    this.hideComposite(viewContainer.id);
                }
            }
        }
    }
    create(parent) {
        return this.compositeBar.create(parent);
    }
    getCompositeActions(compositeId) {
        let compositeActions = this.compositeActions.get(compositeId);
        if (!compositeActions) {
            const viewContainer = this.getViewContainer(compositeId);
            if (viewContainer) {
                const viewContainerModel = this.viewDescriptorService.getViewContainerModel(viewContainer);
                compositeActions = {
                    activityAction: this._register(this.instantiationService.createInstance(ViewContainerActivityAction, this.toCompositeBarActionItemFrom(viewContainerModel), this.part, this.paneCompositePart)),
                    pinnedAction: this._register(new ToggleCompositePinnedAction(this.toCompositeBarActionItemFrom(viewContainerModel), this.compositeBar)),
                    badgeAction: this._register(new ToggleCompositeBadgeAction(this.toCompositeBarActionItemFrom(viewContainerModel), this.compositeBar))
                };
            }
            else {
                const cachedComposite = this.cachedViewContainers.filter(c => c.id === compositeId)[0];
                compositeActions = {
                    activityAction: this._register(this.instantiationService.createInstance(PlaceHolderViewContainerActivityAction, this.toCompositeBarActionItem(compositeId, cachedComposite?.name ?? compositeId, cachedComposite?.icon, undefined), this.part, this.paneCompositePart)),
                    pinnedAction: this._register(new PlaceHolderToggleCompositePinnedAction(compositeId, this.compositeBar)),
                    badgeAction: this._register(new PlaceHolderToggleCompositeBadgeAction(compositeId, this.compositeBar))
                };
            }
            this.compositeActions.set(compositeId, compositeActions);
        }
        return compositeActions;
    }
    onDidRegisterViewContainers(viewContainers) {
        for (const viewContainer of viewContainers) {
            this.addComposite(viewContainer);
            // Pin it by default if it is new
            const cachedViewContainer = this.cachedViewContainers.filter(({ id }) => id === viewContainer.id)[0];
            if (!cachedViewContainer) {
                this.compositeBar.pin(viewContainer.id);
            }
            // Active
            const visibleViewContainer = this.paneCompositePart.getActivePaneComposite();
            if (visibleViewContainer?.getId() === viewContainer.id) {
                this.compositeBar.activateComposite(viewContainer.id);
            }
            const viewContainerModel = this.viewDescriptorService.getViewContainerModel(viewContainer);
            this.updateCompositeBarActionItem(viewContainer, viewContainerModel);
            this.showOrHideViewContainer(viewContainer);
            const disposables = new DisposableStore();
            disposables.add(viewContainerModel.onDidChangeContainerInfo(() => this.updateCompositeBarActionItem(viewContainer, viewContainerModel)));
            disposables.add(viewContainerModel.onDidChangeActiveViewDescriptors(() => this.showOrHideViewContainer(viewContainer)));
            this.viewContainerDisposables.set(viewContainer.id, disposables);
        }
    }
    onDidDeregisterViewContainer(viewContainer) {
        this.viewContainerDisposables.deleteAndDispose(viewContainer.id);
        this.removeComposite(viewContainer.id);
    }
    updateCompositeBarActionItem(viewContainer, viewContainerModel) {
        const compositeBarActionItem = this.toCompositeBarActionItemFrom(viewContainerModel);
        const { activityAction, pinnedAction } = this.getCompositeActions(viewContainer.id);
        activityAction.updateCompositeBarActionItem(compositeBarActionItem);
        if (pinnedAction instanceof PlaceHolderToggleCompositePinnedAction) {
            pinnedAction.setActivity(compositeBarActionItem);
        }
        if (this.options.recomputeSizes) {
            this.compositeBar.recomputeSizes();
        }
        this.saveCachedViewContainers();
    }
    toCompositeBarActionItemFrom(viewContainerModel) {
        return this.toCompositeBarActionItem(viewContainerModel.viewContainer.id, viewContainerModel.title, viewContainerModel.icon, viewContainerModel.keybindingId);
    }
    toCompositeBarActionItem(id, name, icon, keybindingId) {
        let classNames = undefined;
        let iconUrl = undefined;
        if (this.options.icon) {
            if (URI.isUri(icon)) {
                iconUrl = icon;
                const cssUrl = asCSSUrl(icon);
                const hash = new StringSHA1();
                hash.update(cssUrl);
                const iconId = `activity-${id.replace(/\./g, '-')}-${hash.digest()}`;
                const iconClass = `.monaco-workbench .${this.options.partContainerClass} .monaco-action-bar .action-label.${iconId}`;
                classNames = [iconId, 'uri-icon'];
                createCSSRule(iconClass, `
				mask: ${cssUrl} no-repeat 50% 50%;
				mask-size: ${this.options.iconSize}px;
				-webkit-mask: ${cssUrl} no-repeat 50% 50%;
				-webkit-mask-size: ${this.options.iconSize}px;
				mask-origin: padding;
				-webkit-mask-origin: padding;
			`);
            }
            else if (ThemeIcon.isThemeIcon(icon)) {
                classNames = ThemeIcon.asClassNameArray(icon);
            }
        }
        return { id, name, classNames, iconUrl, keybindingId };
    }
    showOrHideViewContainer(viewContainer) {
        if (this.shouldBeHidden(viewContainer)) {
            this.hideComposite(viewContainer.id);
        }
        else {
            this.addComposite(viewContainer);
            // Activate if this is the active pane composite
            const activePaneComposite = this.paneCompositePart.getActivePaneComposite();
            if (activePaneComposite?.getId() === viewContainer.id) {
                this.compositeBar.activateComposite(viewContainer.id);
            }
        }
    }
    shouldBeHidden(viewContainerOrId, cachedViewContainer) {
        const viewContainer = isString(viewContainerOrId) ? this.getViewContainer(viewContainerOrId) : viewContainerOrId;
        const viewContainerId = isString(viewContainerOrId) ? viewContainerOrId : viewContainerOrId.id;
        if (viewContainer) {
            if (viewContainer.hideIfEmpty) {
                if (this.viewService.isViewContainerActive(viewContainerId)) {
                    return false;
                }
            }
            else {
                return false;
            }
        }
        // Check cache only if extensions are not yet registered and current window is not native (desktop) remote connection window
        if (!this.hasExtensionsRegistered && !(this.part === "workbench.parts.sidebar" /* Parts.SIDEBAR_PART */ && this.environmentService.remoteAuthority && isNative)) {
            cachedViewContainer = cachedViewContainer || this.cachedViewContainers.find(({ id }) => id === viewContainerId);
            // Show builtin ViewContainer if not registered yet
            if (!viewContainer && cachedViewContainer?.isBuiltin && cachedViewContainer?.visible) {
                return false;
            }
            if (cachedViewContainer?.views?.length) {
                return cachedViewContainer.views.every(({ when }) => !!when && !this.contextKeyService.contextMatchesRules(ContextKeyExpr.deserialize(when)));
            }
        }
        return true;
    }
    addComposite(viewContainer) {
        this.compositeBar.addComposite({ id: viewContainer.id, name: typeof viewContainer.title === 'string' ? viewContainer.title : viewContainer.title.value, order: viewContainer.order, requestedIndex: viewContainer.requestedIndex });
    }
    hideComposite(compositeId) {
        this.compositeBar.hideComposite(compositeId);
        const compositeActions = this.compositeActions.get(compositeId);
        if (compositeActions) {
            compositeActions.activityAction.dispose();
            compositeActions.pinnedAction.dispose();
            this.compositeActions.delete(compositeId);
        }
    }
    removeComposite(compositeId) {
        this.compositeBar.removeComposite(compositeId);
        const compositeActions = this.compositeActions.get(compositeId);
        if (compositeActions) {
            compositeActions.activityAction.dispose();
            compositeActions.pinnedAction.dispose();
            this.compositeActions.delete(compositeId);
        }
    }
    getPinnedPaneCompositeIds() {
        const pinnedCompositeIds = this.compositeBar.getPinnedComposites().map(v => v.id);
        return this.getViewContainers()
            .filter(v => this.compositeBar.isPinned(v.id))
            .sort((v1, v2) => pinnedCompositeIds.indexOf(v1.id) - pinnedCompositeIds.indexOf(v2.id))
            .map(v => v.id);
    }
    getVisiblePaneCompositeIds() {
        return this.compositeBar.getVisibleComposites()
            .filter(v => this.paneCompositePart.getActivePaneComposite()?.getId() === v.id || this.compositeBar.isPinned(v.id))
            .map(v => v.id);
    }
    getPaneCompositeIds() {
        return this.compositeBar.getVisibleComposites()
            .map(v => v.id);
    }
    getContextMenuActions() {
        return this.compositeBar.getContextMenuActions();
    }
    focus(index) {
        this.compositeBar.focus(index);
    }
    layout(width, height) {
        this.compositeBar.layout(new Dimension(width, height));
    }
    getViewContainer(id) {
        const viewContainer = this.viewDescriptorService.getViewContainerById(id);
        return viewContainer && this.viewDescriptorService.getViewContainerLocation(viewContainer) === this.location ? viewContainer : undefined;
    }
    getViewContainers() {
        return this.viewDescriptorService.getViewContainersByLocation(this.location);
    }
    updateCompositeBarItemsFromStorage(retainExisting) {
        if (this.pinnedViewContainersValue === this.getStoredPinnedViewContainersValue()) {
            return;
        }
        this._placeholderViewContainersValue = undefined;
        this._pinnedViewContainersValue = undefined;
        this._cachedViewContainers = undefined;
        const newCompositeItems = [];
        const compositeItems = this.compositeBar.getCompositeBarItems();
        for (const cachedViewContainer of this.cachedViewContainers) {
            newCompositeItems.push({
                id: cachedViewContainer.id,
                name: cachedViewContainer.name,
                order: cachedViewContainer.order,
                pinned: cachedViewContainer.pinned,
                visible: cachedViewContainer.visible && !!this.getViewContainer(cachedViewContainer.id),
            });
        }
        for (const viewContainer of this.getViewContainers()) {
            // Add missing view containers
            if (!newCompositeItems.some(({ id }) => id === viewContainer.id)) {
                const index = compositeItems.findIndex(({ id }) => id === viewContainer.id);
                if (index !== -1) {
                    const compositeItem = compositeItems[index];
                    newCompositeItems.splice(index, 0, {
                        id: viewContainer.id,
                        name: typeof viewContainer.title === 'string' ? viewContainer.title : viewContainer.title.value,
                        order: compositeItem.order,
                        pinned: compositeItem.pinned,
                        visible: compositeItem.visible,
                    });
                }
                else {
                    newCompositeItems.push({
                        id: viewContainer.id,
                        name: typeof viewContainer.title === 'string' ? viewContainer.title : viewContainer.title.value,
                        order: viewContainer.order,
                        pinned: true,
                        visible: !this.shouldBeHidden(viewContainer),
                    });
                }
            }
        }
        if (retainExisting) {
            for (const compositeItem of compositeItems) {
                const newCompositeItem = newCompositeItems.find(({ id }) => id === compositeItem.id);
                if (!newCompositeItem) {
                    newCompositeItems.push(compositeItem);
                }
            }
        }
        this.compositeBar.setCompositeBarItems(newCompositeItems);
    }
    saveCachedViewContainers() {
        const state = [];
        const compositeItems = this.compositeBar.getCompositeBarItems();
        for (const compositeItem of compositeItems) {
            const viewContainer = this.getViewContainer(compositeItem.id);
            if (viewContainer) {
                const viewContainerModel = this.viewDescriptorService.getViewContainerModel(viewContainer);
                const views = [];
                for (const { when } of viewContainerModel.allViewDescriptors) {
                    views.push({ when: when ? when.serialize() : undefined });
                }
                state.push({
                    id: compositeItem.id,
                    name: viewContainerModel.title,
                    icon: URI.isUri(viewContainerModel.icon) && this.environmentService.remoteAuthority ? undefined : viewContainerModel.icon, // Do not cache uri icons with remote connection
                    views,
                    pinned: compositeItem.pinned,
                    order: compositeItem.order,
                    visible: compositeItem.visible,
                    isBuiltin: !viewContainer.extensionId
                });
            }
            else {
                state.push({ id: compositeItem.id, name: compositeItem.name, pinned: compositeItem.pinned, order: compositeItem.order, visible: false, isBuiltin: false });
            }
        }
        this.storeCachedViewContainersState(state);
    }
    get cachedViewContainers() {
        if (this._cachedViewContainers === undefined) {
            this._cachedViewContainers = this.getPinnedViewContainers();
            for (const placeholderViewContainer of this.getPlaceholderViewContainers()) {
                const cachedViewContainer = this._cachedViewContainers.find(cached => cached.id === placeholderViewContainer.id);
                if (cachedViewContainer) {
                    cachedViewContainer.visible = placeholderViewContainer.visible ?? cachedViewContainer.visible;
                    cachedViewContainer.name = placeholderViewContainer.name;
                    cachedViewContainer.icon = placeholderViewContainer.themeIcon ? placeholderViewContainer.themeIcon :
                        placeholderViewContainer.iconUrl ? URI.revive(placeholderViewContainer.iconUrl) : undefined;
                    if (URI.isUri(cachedViewContainer.icon) && this.environmentService.remoteAuthority) {
                        cachedViewContainer.icon = undefined; // Do not cache uri icons with remote connection
                    }
                    cachedViewContainer.views = placeholderViewContainer.views;
                    cachedViewContainer.isBuiltin = placeholderViewContainer.isBuiltin;
                }
            }
            for (const viewContainerWorkspaceState of this.getViewContainersWorkspaceState()) {
                const cachedViewContainer = this._cachedViewContainers.find(cached => cached.id === viewContainerWorkspaceState.id);
                if (cachedViewContainer) {
                    cachedViewContainer.visible = viewContainerWorkspaceState.visible ?? cachedViewContainer.visible;
                }
            }
        }
        return this._cachedViewContainers;
    }
    storeCachedViewContainersState(cachedViewContainers) {
        const pinnedViewContainers = this.getPinnedViewContainers();
        this.setPinnedViewContainers(cachedViewContainers.map(({ id, pinned, order }) => ({
            id,
            pinned,
            visible: Boolean(pinnedViewContainers.find(({ id: pinnedId }) => pinnedId === id)?.visible),
            order
        })));
        this.setPlaceholderViewContainers(cachedViewContainers.map(({ id, icon, name, views, isBuiltin }) => ({
            id,
            iconUrl: URI.isUri(icon) ? icon : undefined,
            themeIcon: ThemeIcon.isThemeIcon(icon) ? icon : undefined,
            name,
            isBuiltin,
            views
        })));
        this.setViewContainersWorkspaceState(cachedViewContainers.map(({ id, visible }) => ({
            id,
            visible,
        })));
    }
    getPinnedViewContainers() {
        return JSON.parse(this.pinnedViewContainersValue);
    }
    setPinnedViewContainers(pinnedViewContainers) {
        this.pinnedViewContainersValue = JSON.stringify(pinnedViewContainers);
    }
    get pinnedViewContainersValue() {
        if (!this._pinnedViewContainersValue) {
            this._pinnedViewContainersValue = this.getStoredPinnedViewContainersValue();
        }
        return this._pinnedViewContainersValue;
    }
    set pinnedViewContainersValue(pinnedViewContainersValue) {
        if (this.pinnedViewContainersValue !== pinnedViewContainersValue) {
            this._pinnedViewContainersValue = pinnedViewContainersValue;
            this.setStoredPinnedViewContainersValue(pinnedViewContainersValue);
        }
    }
    getStoredPinnedViewContainersValue() {
        return this.storageService.get(this.options.pinnedViewContainersKey, 0 /* StorageScope.PROFILE */, '[]');
    }
    setStoredPinnedViewContainersValue(value) {
        this.storageService.store(this.options.pinnedViewContainersKey, value, 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
    }
    getPlaceholderViewContainers() {
        return JSON.parse(this.placeholderViewContainersValue);
    }
    setPlaceholderViewContainers(placeholderViewContainers) {
        this.placeholderViewContainersValue = JSON.stringify(placeholderViewContainers);
    }
    get placeholderViewContainersValue() {
        if (!this._placeholderViewContainersValue) {
            this._placeholderViewContainersValue = this.getStoredPlaceholderViewContainersValue();
        }
        return this._placeholderViewContainersValue;
    }
    set placeholderViewContainersValue(placeholderViewContainesValue) {
        if (this.placeholderViewContainersValue !== placeholderViewContainesValue) {
            this._placeholderViewContainersValue = placeholderViewContainesValue;
            this.setStoredPlaceholderViewContainersValue(placeholderViewContainesValue);
        }
    }
    getStoredPlaceholderViewContainersValue() {
        return this.storageService.get(this.options.placeholderViewContainersKey, 0 /* StorageScope.PROFILE */, '[]');
    }
    setStoredPlaceholderViewContainersValue(value) {
        this.storageService.store(this.options.placeholderViewContainersKey, value, 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
    }
    getViewContainersWorkspaceState() {
        return JSON.parse(this.viewContainersWorkspaceStateValue);
    }
    setViewContainersWorkspaceState(viewContainersWorkspaceState) {
        this.viewContainersWorkspaceStateValue = JSON.stringify(viewContainersWorkspaceState);
    }
    get viewContainersWorkspaceStateValue() {
        if (!this._viewContainersWorkspaceStateValue) {
            this._viewContainersWorkspaceStateValue = this.getStoredViewContainersWorkspaceStateValue();
        }
        return this._viewContainersWorkspaceStateValue;
    }
    set viewContainersWorkspaceStateValue(viewContainersWorkspaceStateValue) {
        if (this.viewContainersWorkspaceStateValue !== viewContainersWorkspaceStateValue) {
            this._viewContainersWorkspaceStateValue = viewContainersWorkspaceStateValue;
            this.setStoredViewContainersWorkspaceStateValue(viewContainersWorkspaceStateValue);
        }
    }
    getStoredViewContainersWorkspaceStateValue() {
        return this.storageService.get(this.options.viewContainersWorkspaceStateKey, 1 /* StorageScope.WORKSPACE */, '[]');
    }
    setStoredViewContainersWorkspaceStateValue(value) {
        this.storageService.store(this.options.viewContainersWorkspaceStateKey, value, 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
    }
};
PaneCompositeBar = __decorate([
    __param(3, IInstantiationService),
    __param(4, IStorageService),
    __param(5, IExtensionService),
    __param(6, IViewDescriptorService),
    __param(7, IViewsService),
    __param(8, IContextKeyService),
    __param(9, IWorkbenchEnvironmentService),
    __param(10, IWorkbenchLayoutService)
], PaneCompositeBar);
export { PaneCompositeBar };
let ViewContainerActivityAction = class ViewContainerActivityAction extends CompositeBarAction {
    static { ViewContainerActivityAction_1 = this; }
    static { this.preventDoubleClickDelay = 300; }
    constructor(compositeBarActionItem, part, paneCompositePart, layoutService, configurationService, activityService) {
        super(compositeBarActionItem);
        this.part = part;
        this.paneCompositePart = paneCompositePart;
        this.layoutService = layoutService;
        this.configurationService = configurationService;
        this.activityService = activityService;
        this.lastRun = 0;
        this.updateActivity();
        this._register(this.activityService.onDidChangeActivity(viewContainerOrAction => {
            if (!isString(viewContainerOrAction) && viewContainerOrAction.id === this.compositeBarActionItem.id) {
                this.updateActivity();
            }
        }));
    }
    updateCompositeBarActionItem(compositeBarActionItem) {
        this.compositeBarActionItem = compositeBarActionItem;
    }
    updateActivity() {
        this.activities = this.activityService.getViewContainerActivities(this.compositeBarActionItem.id);
    }
    async run(event) {
        if (isMouseEvent(event) && event.button === 2) {
            return; // do not run on right click
        }
        // prevent accident trigger on a doubleclick (to help nervous people)
        const now = Date.now();
        if (now > this.lastRun /* https://github.com/microsoft/vscode/issues/25830 */ && now - this.lastRun < ViewContainerActivityAction_1.preventDoubleClickDelay) {
            return;
        }
        this.lastRun = now;
        const focus = (event && 'preserveFocus' in event) ? !event.preserveFocus : true;
        if (this.part === "workbench.parts.activitybar" /* Parts.ACTIVITYBAR_PART */) {
            const sideBarVisible = this.layoutService.isVisible("workbench.parts.sidebar" /* Parts.SIDEBAR_PART */);
            const activeViewlet = this.paneCompositePart.getActivePaneComposite();
            const focusBehavior = this.configurationService.getValue('workbench.activityBar.iconClickBehavior');
            if (sideBarVisible && activeViewlet?.getId() === this.compositeBarActionItem.id) {
                switch (focusBehavior) {
                    case 'focus':
                        this.paneCompositePart.openPaneComposite(this.compositeBarActionItem.id, focus);
                        break;
                    case 'toggle':
                    default:
                        // Hide sidebar if selected viewlet already visible
                        this.layoutService.setPartHidden(true, "workbench.parts.sidebar" /* Parts.SIDEBAR_PART */);
                        break;
                }
                return;
            }
        }
        await this.paneCompositePart.openPaneComposite(this.compositeBarActionItem.id, focus);
        return this.activate();
    }
};
ViewContainerActivityAction = ViewContainerActivityAction_1 = __decorate([
    __param(3, IWorkbenchLayoutService),
    __param(4, IConfigurationService),
    __param(5, IActivityService)
], ViewContainerActivityAction);
class PlaceHolderViewContainerActivityAction extends ViewContainerActivityAction {
}
class PlaceHolderToggleCompositePinnedAction extends ToggleCompositePinnedAction {
    constructor(id, compositeBar) {
        super({ id, name: id, classNames: undefined }, compositeBar);
    }
    setActivity(activity) {
        this.label = activity.name;
    }
}
class PlaceHolderToggleCompositeBadgeAction extends ToggleCompositeBadgeAction {
    constructor(id, compositeBar) {
        super({ id, name: id, classNames: undefined }, compositeBar);
    }
    setCompositeBarActionItem(actionItem) {
        this.label = actionItem.name;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFuZUNvbXBvc2l0ZUJhci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL3BhcnRzL3BhbmVDb21wb3NpdGVCYXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUUzQyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUM5RSxPQUFPLEVBQUUsdUJBQXVCLEVBQVMsTUFBTSxnREFBZ0QsQ0FBQztBQUNoRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUNoRyxPQUFPLEVBQWUsZUFBZSxFQUFFLFVBQVUsRUFBRSxhQUFhLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUU1RyxPQUFPLEVBQUUsWUFBWSxFQUFxQixvQkFBb0IsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBQzFGLE9BQU8sRUFBRSxTQUFTLEVBQUUsWUFBWSxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDdkUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM3RCxPQUFPLEVBQUUsZUFBZSxFQUErQixNQUFNLDZDQUE2QyxDQUFDO0FBQzNHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ25GLE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sNkJBQTZCLENBQUM7QUFDakUsT0FBTyxFQUFFLDJCQUEyQixFQUE4QywwQkFBMEIsRUFBRSxrQkFBa0IsRUFBMEMsTUFBTSwwQkFBMEIsQ0FBQztBQUMzTSxPQUFPLEVBQUUsc0JBQXNCLEVBQTZELE1B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