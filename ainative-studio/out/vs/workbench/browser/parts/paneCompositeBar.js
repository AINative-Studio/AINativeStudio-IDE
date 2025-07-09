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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFuZUNvbXBvc2l0ZUJhci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYnJvd3Nlci9wYXJ0cy9wYW5lQ29tcG9zaXRlQmFyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFFM0MsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDOUUsT0FBTyxFQUFFLHVCQUF1QixFQUFTLE1BQU0sZ0RBQWdELENBQUM7QUFDaEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDaEcsT0FBTyxFQUFlLGVBQWUsRUFBRSxVQUFVLEVBQUUsYUFBYSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFFNUcsT0FBTyxFQUFFLFlBQVksRUFBcUIsb0JBQW9CLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUMxRixPQUFPLEVBQUUsU0FBUyxFQUFFLFlBQVksRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUN4RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDN0QsT0FBTyxFQUFFLGVBQWUsRUFBK0IsTUFBTSw2Q0FBNkMsQ0FBQztBQUMzRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNuRixPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLDZCQUE2QixDQUFDO0FBQ2pFLE9BQU8sRUFBRSwyQkFBMkIsRUFBOEMsMEJBQTBCLEVBQUUsa0JBQWtCLEVBQTBDLE1BQU0sMEJBQTBCLENBQUM7QUFDM00sT0FBTyxFQUFFLHNCQUFzQixFQUE2RCxN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