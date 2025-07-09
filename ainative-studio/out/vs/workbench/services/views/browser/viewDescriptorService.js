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
var ViewDescriptorService_1;
import { IViewDescriptorService, Extensions as ViewExtensions, ViewVisibilityState, defaultViewIcon, ViewContainerLocationToString, VIEWS_LOG_ID, VIEWS_LOG_NAME } from '../../../common/views.js';
import { RawContextKey, IContextKeyService, ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IExtensionService } from '../../extensions/common/extensions.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { toDisposable, DisposableStore, Disposable, DisposableMap } from '../../../../base/common/lifecycle.js';
import { ViewPaneContainer, ViewPaneContainerAction, ViewsSubMenu } from '../../../browser/parts/views/viewPaneContainer.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { Event, Emitter } from '../../../../base/common/event.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { getViewsStateStorageId, ViewContainerModel } from '../common/viewContainerModel.js';
import { registerAction2, Action2, MenuId } from '../../../../platform/actions/common/actions.js';
import { localize, localize2 } from '../../../../nls.js';
import { ILoggerService } from '../../../../platform/log/common/log.js';
import { Lazy } from '../../../../base/common/lazy.js';
import { IViewsService } from '../common/viewsService.js';
import { windowLogGroup } from '../../log/common/logConstants.js';
function getViewContainerStorageId(viewContainerId) { return `${viewContainerId}.state`; }
let ViewDescriptorService = class ViewDescriptorService extends Disposable {
    static { ViewDescriptorService_1 = this; }
    static { this.VIEWS_CUSTOMIZATIONS = 'views.customizations'; }
    static { this.COMMON_CONTAINER_ID_PREFIX = 'workbench.views.service'; }
    get viewContainers() { return this.viewContainersRegistry.all; }
    constructor(instantiationService, contextKeyService, storageService, extensionService, telemetryService, loggerService) {
        super();
        this.instantiationService = instantiationService;
        this.contextKeyService = contextKeyService;
        this.storageService = storageService;
        this.extensionService = extensionService;
        this.telemetryService = telemetryService;
        this._onDidChangeContainer = this._register(new Emitter());
        this.onDidChangeContainer = this._onDidChangeContainer.event;
        this._onDidChangeLocation = this._register(new Emitter());
        this.onDidChangeLocation = this._onDidChangeLocation.event;
        this._onDidChangeContainerLocation = this._register(new Emitter());
        this.onDidChangeContainerLocation = this._onDidChangeContainerLocation.event;
        this.viewContainerModels = this._register(new DisposableMap());
        this.viewsVisibilityActionDisposables = this._register(new DisposableMap());
        this.canRegisterViewsVisibilityActions = false;
        this._onDidChangeViewContainers = this._register(new Emitter());
        this.onDidChangeViewContainers = this._onDidChangeViewContainers.event;
        this.logger = new Lazy(() => loggerService.createLogger(VIEWS_LOG_ID, { name: VIEWS_LOG_NAME, group: windowLogGroup }));
        this.activeViewContextKeys = new Map();
        this.movableViewContextKeys = new Map();
        this.defaultViewLocationContextKeys = new Map();
        this.defaultViewContainerLocationContextKeys = new Map();
        this.viewContainersRegistry = Registry.as(ViewExtensions.ViewContainersRegistry);
        this.viewsRegistry = Registry.as(ViewExtensions.ViewsRegistry);
        this.migrateToViewsCustomizationsStorage();
        this.viewContainersCustomLocations = new Map(Object.entries(this.viewCustomizations.viewContainerLocations));
        this.viewDescriptorsCustomLocations = new Map(Object.entries(this.viewCustomizations.viewLocations));
        this.viewContainerBadgeEnablementStates = new Map(Object.entries(this.viewCustomizations.viewContainerBadgeEnablementStates));
        // Register all containers that were registered before this ctor
        this.viewContainers.forEach(viewContainer => this.onDidRegisterViewContainer(viewContainer));
        this._register(this.viewsRegistry.onViewsRegistered(views => this.onDidRegisterViews(views)));
        this._register(this.viewsRegistry.onViewsDeregistered(({ views, viewContainer }) => this.onDidDeregisterViews(views, viewContainer)));
        this._register(this.viewsRegistry.onDidChangeContainer(({ views, from, to }) => this.onDidChangeDefaultContainer(views, from, to)));
        this._register(this.viewContainersRegistry.onDidRegister(({ viewContainer }) => {
            this.onDidRegisterViewContainer(viewContainer);
            this._onDidChangeViewContainers.fire({ added: [{ container: viewContainer, location: this.getViewContainerLocation(viewContainer) }], removed: [] });
        }));
        this._register(this.viewContainersRegistry.onDidDeregister(({ viewContainer, viewContainerLocation }) => {
            this.onDidDeregisterViewContainer(viewContainer);
            this._onDidChangeViewContainers.fire({ removed: [{ container: viewContainer, location: viewContainerLocation }], added: [] });
        }));
        this._register(this.storageService.onDidChangeValue(0 /* StorageScope.PROFILE */, ViewDescriptorService_1.VIEWS_CUSTOMIZATIONS, this._store)(() => this.onDidStorageChange()));
        this.extensionService.whenInstalledExtensionsRegistered().then(() => this.whenExtensionsRegistered());
    }
    migrateToViewsCustomizationsStorage() {
        if (this.storageService.get(ViewDescriptorService_1.VIEWS_CUSTOMIZATIONS, 0 /* StorageScope.PROFILE */)) {
            return;
        }
        const viewContainerLocationsValue = this.storageService.get('views.cachedViewContainerLocations', 0 /* StorageScope.PROFILE */);
        const viewDescriptorLocationsValue = this.storageService.get('views.cachedViewPositions', 0 /* StorageScope.PROFILE */);
        if (!viewContainerLocationsValue && !viewDescriptorLocationsValue) {
            return;
        }
        const viewContainerLocations = viewContainerLocationsValue ? JSON.parse(viewContainerLocationsValue) : [];
        const viewDescriptorLocations = viewDescriptorLocationsValue ? JSON.parse(viewDescriptorLocationsValue) : [];
        const viewsCustomizations = {
            viewContainerLocations: viewContainerLocations.reduce((result, [id, location]) => { result[id] = location; return result; }, {}),
            viewLocations: viewDescriptorLocations.reduce((result, [id, { containerId }]) => { result[id] = containerId; return result; }, {}),
            viewContainerBadgeEnablementStates: {}
        };
        this.storageService.store(ViewDescriptorService_1.VIEWS_CUSTOMIZATIONS, JSON.stringify(viewsCustomizations), 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
        this.storageService.remove('views.cachedViewContainerLocations', 0 /* StorageScope.PROFILE */);
        this.storageService.remove('views.cachedViewPositions', 0 /* StorageScope.PROFILE */);
    }
    registerGroupedViews(groupedViews) {
        for (const [containerId, views] of groupedViews.entries()) {
            const viewContainer = this.viewContainersRegistry.get(containerId);
            // The container has not been registered yet
            if (!viewContainer || !this.viewContainerModels.has(viewContainer)) {
                // Register if the container is a genarated container
                if (this.isGeneratedContainerId(containerId)) {
                    const viewContainerLocation = this.viewContainersCustomLocations.get(containerId);
                    if (viewContainerLocation !== undefined) {
                        this.registerGeneratedViewContainer(viewContainerLocation, containerId);
                    }
                }
                // Registration of the container handles registration of its views
                continue;
            }
            // Filter out views that have already been added to the view container model
            // This is needed when statically-registered views are moved to
            // other statically registered containers as they will both try to add on startup
            const viewsToAdd = views.filter(view => this.getViewContainerModel(viewContainer).allViewDescriptors.filter(vd => vd.id === view.id).length === 0);
            this.addViews(viewContainer, viewsToAdd);
        }
    }
    deregisterGroupedViews(groupedViews) {
        for (const [viewContainerId, views] of groupedViews.entries()) {
            const viewContainer = this.viewContainersRegistry.get(viewContainerId);
            // The container has not been registered yet
            if (!viewContainer || !this.viewContainerModels.has(viewContainer)) {
                continue;
            }
            this.removeViews(viewContainer, views);
        }
    }
    moveOrphanViewsToDefaultLocation() {
        for (const [viewId, containerId] of this.viewDescriptorsCustomLocations.entries()) {
            // check if the view container exists
            if (this.viewContainersRegistry.get(containerId)) {
                continue;
            }
            // check if view has been registered to default location
            const viewContainer = this.viewsRegistry.getViewContainer(viewId);
            const viewDescriptor = this.getViewDescriptorById(viewId);
            if (viewContainer && viewDescriptor) {
                this.addViews(viewContainer, [viewDescriptor]);
            }
        }
    }
    whenExtensionsRegistered() {
        // Handle those views whose custom parent view container does not exist anymore
        // May be the extension contributing this view container is no longer installed
        // Or the parent view container is generated and no longer available.
        this.moveOrphanViewsToDefaultLocation();
        // Clean up empty generated view containers
        for (const viewContainerId of [...this.viewContainersCustomLocations.keys()]) {
            this.cleanUpGeneratedViewContainer(viewContainerId);
        }
        // Save updated view customizations after cleanup
        this.saveViewCustomizations();
        // Register visibility actions for all views
        for (const [key, value] of this.viewContainerModels) {
            this.registerViewsVisibilityActions(key, value);
        }
        this.canRegisterViewsVisibilityActions = true;
    }
    onDidRegisterViews(views) {
        this.contextKeyService.bufferChangeEvents(() => {
            views.forEach(({ views, viewContainer }) => {
                // When views are registered, we need to regroup them based on the customizations
                const regroupedViews = this.regroupViews(viewContainer.id, views);
                // Once they are grouped, try registering them which occurs
                // if the container has already been registered within this service
                // or we can generate the container from the source view id
                this.registerGroupedViews(regroupedViews);
                views.forEach(viewDescriptor => this.getOrCreateMovableViewContextKey(viewDescriptor).set(!!viewDescriptor.canMoveView));
            });
        });
    }
    isGeneratedContainerId(id) {
        return id.startsWith(ViewDescriptorService_1.COMMON_CONTAINER_ID_PREFIX);
    }
    onDidDeregisterViews(views, viewContainer) {
        // When views are registered, we need to regroup them based on the customizations
        const regroupedViews = this.regroupViews(viewContainer.id, views);
        this.deregisterGroupedViews(regroupedViews);
        this.contextKeyService.bufferChangeEvents(() => {
            views.forEach(viewDescriptor => this.getOrCreateMovableViewContextKey(viewDescriptor).set(false));
        });
    }
    regroupViews(containerId, views) {
        const viewsByContainer = new Map();
        for (const viewDescriptor of views) {
            const correctContainerId = this.viewDescriptorsCustomLocations.get(viewDescriptor.id) ?? containerId;
            let containerViews = viewsByContainer.get(correctContainerId);
            if (!containerViews) {
                viewsByContainer.set(correctContainerId, containerViews = []);
            }
            containerViews.push(viewDescriptor);
        }
        return viewsByContainer;
    }
    getViewDescriptorById(viewId) {
        return this.viewsRegistry.getView(viewId);
    }
    getViewLocationById(viewId) {
        const container = this.getViewContainerByViewId(viewId);
        if (container === null) {
            return null;
        }
        return this.getViewContainerLocation(container);
    }
    getViewContainerByViewId(viewId) {
        const containerId = this.viewDescriptorsCustomLocations.get(viewId);
        return containerId ?
            this.viewContainersRegistry.get(containerId) ?? null :
            this.getDefaultContainerById(viewId);
    }
    getViewContainerLocation(viewContainer) {
        return this.viewContainersCustomLocations.get(viewContainer.id) ?? this.getDefaultViewContainerLocation(viewContainer);
    }
    getDefaultViewContainerLocation(viewContainer) {
        return this.viewContainersRegistry.getViewContainerLocation(viewContainer);
    }
    getDefaultContainerById(viewId) {
        return this.viewsRegistry.getViewContainer(viewId) ?? null;
    }
    getViewContainerModel(container) {
        return this.getOrRegisterViewContainerModel(container);
    }
    getViewContainerById(id) {
        return this.viewContainersRegistry.get(id) || null;
    }
    getViewContainersByLocation(location) {
        return this.viewContainers.filter(v => this.getViewContainerLocation(v) === location);
    }
    getDefaultViewContainer(location) {
        return this.viewContainersRegistry.getDefaultViewContainer(location);
    }
    moveViewContainerToLocation(viewContainer, location, requestedIndex, reason) {
        this.logger.value.info(`moveViewContainerToLocation: viewContainer:${viewContainer.id} location:${location} reason:${reason}`);
        this.moveViewContainerToLocationWithoutSaving(viewContainer, location, requestedIndex);
        this.saveViewCustomizations();
    }
    getViewContainerBadgeEnablementState(id) {
        return this.viewContainerBadgeEnablementStates.get(id) ?? true;
    }
    setViewContainerBadgeEnablementState(id, badgesEnabled) {
        this.viewContainerBadgeEnablementStates.set(id, badgesEnabled);
        this.saveViewCustomizations();
    }
    moveViewToLocation(view, location, reason) {
        this.logger.value.info(`moveViewToLocation: view:${view.id} location:${location} reason:${reason}`);
        const container = this.registerGeneratedViewContainer(location);
        this.moveViewsToContainer([view], container);
    }
    moveViewsToContainer(views, viewContainer, visibilityState, reason) {
        if (!views.length) {
            return;
        }
        this.logger.value.info(`moveViewsToContainer: views:${views.map(view => view.id).join(',')} viewContainer:${viewContainer.id} reason:${reason}`);
        const from = this.getViewContainerByViewId(views[0].id);
        const to = viewContainer;
        if (from && to && from !== to) {
            // Move views
            this.moveViewsWithoutSaving(views, from, to, visibilityState);
            this.cleanUpGeneratedViewContainer(from.id);
            // Save new locations
            this.saveViewCustomizations();
            // Log to telemetry
            this.reportMovedViews(views, from, to);
        }
    }
    reset() {
        for (const viewContainer of this.viewContainers) {
            const viewContainerModel = this.getViewContainerModel(viewContainer);
            for (const viewDescriptor of viewContainerModel.allViewDescriptors) {
                const defaultContainer = this.getDefaultContainerById(viewDescriptor.id);
                const currentContainer = this.getViewContainerByViewId(viewDescriptor.id);
                if (currentContainer && defaultContainer && currentContainer !== defaultContainer) {
                    this.moveViewsWithoutSaving([viewDescriptor], currentContainer, defaultContainer);
                }
            }
            const defaultContainerLocation = this.getDefaultViewContainerLocation(viewContainer);
            const currentContainerLocation = this.getViewContainerLocation(viewContainer);
            if (defaultContainerLocation !== null && currentContainerLocation !== defaultContainerLocation) {
                this.moveViewContainerToLocationWithoutSaving(viewContainer, defaultContainerLocation);
            }
            this.cleanUpGeneratedViewContainer(viewContainer.id);
        }
        this.viewContainersCustomLocations.clear();
        this.viewDescriptorsCustomLocations.clear();
        this.saveViewCustomizations();
    }
    isViewContainerRemovedPermanently(viewContainerId) {
        return this.isGeneratedContainerId(viewContainerId) && !this.viewContainersCustomLocations.has(viewContainerId);
    }
    onDidChangeDefaultContainer(views, from, to) {
        const viewsToMove = views.filter(view => !this.viewDescriptorsCustomLocations.has(view.id) // Move views which are not already moved
            || (!this.viewContainers.includes(from) && this.viewDescriptorsCustomLocations.get(view.id) === from.id) // Move views which are moved from a removed container
        );
        if (viewsToMove.length) {
            this.moveViewsWithoutSaving(viewsToMove, from, to);
        }
    }
    reportMovedViews(views, from, to) {
        const containerToString = (container) => {
            if (container.id.startsWith(ViewDescriptorService_1.COMMON_CONTAINER_ID_PREFIX)) {
                return 'custom';
            }
            if (!container.extensionId) {
                return container.id;
            }
            return 'extension';
        };
        const oldLocation = this.getViewContainerLocation(from);
        const newLocation = this.getViewContainerLocation(to);
        const viewCount = views.length;
        const fromContainer = containerToString(from);
        const toContainer = containerToString(to);
        const fromLocation = oldLocation === 1 /* ViewContainerLocation.Panel */ ? 'panel' : 'sidebar';
        const toLocation = newLocation === 1 /* ViewContainerLocation.Panel */ ? 'panel' : 'sidebar';
        this.telemetryService.publicLog2('viewDescriptorService.moveViews', { viewCount, fromContainer, toContainer, fromLocation, toLocation });
    }
    moveViewsWithoutSaving(views, from, to, visibilityState = ViewVisibilityState.Expand) {
        this.removeViews(from, views);
        this.addViews(to, views, visibilityState);
        const oldLocation = this.getViewContainerLocation(from);
        const newLocation = this.getViewContainerLocation(to);
        if (oldLocation !== newLocation) {
            this._onDidChangeLocation.fire({ views, from: oldLocation, to: newLocation });
        }
        this._onDidChangeContainer.fire({ views, from, to });
    }
    moveViewContainerToLocationWithoutSaving(viewContainer, location, requestedIndex) {
        const from = this.getViewContainerLocation(viewContainer);
        const to = location;
        if (from !== to) {
            const isGeneratedViewContainer = this.isGeneratedContainerId(viewContainer.id);
            const isDefaultViewContainerLocation = to === this.getDefaultViewContainerLocation(viewContainer);
            if (isGeneratedViewContainer || !isDefaultViewContainerLocation) {
                this.viewContainersCustomLocations.set(viewContainer.id, to);
            }
            else {
                this.viewContainersCustomLocations.delete(viewContainer.id);
            }
            this.getOrCreateDefaultViewContainerLocationContextKey(viewContainer).set(isGeneratedViewContainer || isDefaultViewContainerLocation);
            viewContainer.requestedIndex = requestedIndex;
            this._onDidChangeContainerLocation.fire({ viewContainer, from, to });
            const views = this.getViewsByContainer(viewContainer);
            this._onDidChangeLocation.fire({ views, from, to });
        }
    }
    cleanUpGeneratedViewContainer(viewContainerId) {
        // Skip if container is not generated
        if (!this.isGeneratedContainerId(viewContainerId)) {
            return;
        }
        // Skip if container has views registered
        const viewContainer = this.getViewContainerById(viewContainerId);
        if (viewContainer && this.getViewContainerModel(viewContainer)?.allViewDescriptors.length) {
            return;
        }
        // Skip if container has moved views
        if ([...this.viewDescriptorsCustomLocations.values()].includes(viewContainerId)) {
            return;
        }
        // Deregister the container
        if (viewContainer) {
            this.viewContainersRegistry.deregisterViewContainer(viewContainer);
        }
        this.viewContainersCustomLocations.delete(viewContainerId);
        this.viewContainerBadgeEnablementStates.delete(viewContainerId);
        // Clean up caches of container
        this.storageService.remove(getViewsStateStorageId(viewContainer?.storageId || getViewContainerStorageId(viewContainerId)), 0 /* StorageScope.PROFILE */);
    }
    registerGeneratedViewContainer(location, existingId) {
        const id = existingId || this.generateContainerId(location);
        const container = this.viewContainersRegistry.registerViewContainer({
            id,
            ctorDescriptor: new SyncDescriptor(ViewPaneContainer, [id, { mergeViewWithContainerWhenSingleView: true }]),
            title: { value: localize('user', "User View Container"), original: 'User View Container' }, // having a placeholder title - this should not be shown anywhere
            icon: location === 0 /* ViewContainerLocation.Sidebar */ ? defaultViewIcon : undefined,
            storageId: getViewContainerStorageId(id),
            hideIfEmpty: true
        }, location, { doNotRegisterOpenCommand: true });
        if (this.viewContainersCustomLocations.get(container.id) !== location) {
            this.viewContainersCustomLocations.set(container.id, location);
        }
        this.getOrCreateDefaultViewContainerLocationContextKey(container).set(true);
        return container;
    }
    onDidStorageChange() {
        if (JSON.stringify(this.viewCustomizations) !== this.getStoredViewCustomizationsValue() /* This checks if current window changed the value or not */) {
            this.onDidViewCustomizationsStorageChange();
        }
    }
    onDidViewCustomizationsStorageChange() {
        this._viewCustomizations = undefined;
        const newViewContainerCustomizations = new Map(Object.entries(this.viewCustomizations.viewContainerLocations));
        const newViewDescriptorCustomizations = new Map(Object.entries(this.viewCustomizations.viewLocations));
        const viewContainersToMove = [];
        const viewsToMove = [];
        for (const [containerId, location] of newViewContainerCustomizations.entries()) {
            const container = this.getViewContainerById(containerId);
            if (container) {
                if (location !== this.getViewContainerLocation(container)) {
                    viewContainersToMove.push([container, location]);
                }
            }
            // If the container is generated and not registered, we register it now
            else if (this.isGeneratedContainerId(containerId)) {
                this.registerGeneratedViewContainer(location, containerId);
            }
        }
        for (const viewContainer of this.viewContainers) {
            if (!newViewContainerCustomizations.has(viewContainer.id)) {
                const currentLocation = this.getViewContainerLocation(viewContainer);
                const defaultLocation = this.getDefaultViewContainerLocation(viewContainer);
                if (currentLocation !== defaultLocation) {
                    viewContainersToMove.push([viewContainer, defaultLocation]);
                }
            }
        }
        for (const [viewId, viewContainerId] of newViewDescriptorCustomizations.entries()) {
            const viewDescriptor = this.getViewDescriptorById(viewId);
            if (viewDescriptor) {
                const prevViewContainer = this.getViewContainerByViewId(viewId);
                const newViewContainer = this.viewContainersRegistry.get(viewContainerId);
                if (prevViewContainer && newViewContainer && newViewContainer !== prevViewContainer) {
                    viewsToMove.push({ views: [viewDescriptor], from: prevViewContainer, to: newViewContainer });
                }
            }
        }
        // If a value is not present in the cache, it must be reset to default
        for (const viewContainer of this.viewContainers) {
            const viewContainerModel = this.getViewContainerModel(viewContainer);
            for (const viewDescriptor of viewContainerModel.allViewDescriptors) {
                if (!newViewDescriptorCustomizations.has(viewDescriptor.id)) {
                    const currentContainer = this.getViewContainerByViewId(viewDescriptor.id);
                    const defaultContainer = this.getDefaultContainerById(viewDescriptor.id);
                    if (currentContainer && defaultContainer && currentContainer !== defaultContainer) {
                        viewsToMove.push({ views: [viewDescriptor], from: currentContainer, to: defaultContainer });
                    }
                }
            }
        }
        // Execute View Container Movements
        for (const [container, location] of viewContainersToMove) {
            this.moveViewContainerToLocationWithoutSaving(container, location);
        }
        // Execute View Movements
        for (const { views, from, to } of viewsToMove) {
            this.moveViewsWithoutSaving(views, from, to, ViewVisibilityState.Default);
        }
        this.viewContainersCustomLocations = newViewContainerCustomizations;
        this.viewDescriptorsCustomLocations = newViewDescriptorCustomizations;
    }
    // Generated Container Id Format
    // {Common Prefix}.{Location}.{Uniqueness Id}
    // Old Format (deprecated)
    // {Common Prefix}.{Uniqueness Id}.{Source View Id}
    generateContainerId(location) {
        return `${ViewDescriptorService_1.COMMON_CONTAINER_ID_PREFIX}.${ViewContainerLocationToString(location)}.${generateUuid()}`;
    }
    saveViewCustomizations() {
        const viewCustomizations = { viewContainerLocations: {}, viewLocations: {}, viewContainerBadgeEnablementStates: {} };
        for (const [containerId, location] of this.viewContainersCustomLocations) {
            const container = this.getViewContainerById(containerId);
            // Skip if the view container is not a generated container and in default location
            if (container && !this.isGeneratedContainerId(containerId) && location === this.getDefaultViewContainerLocation(container)) {
                continue;
            }
            viewCustomizations.viewContainerLocations[containerId] = location;
        }
        for (const [viewId, viewContainerId] of this.viewDescriptorsCustomLocations) {
            const viewContainer = this.getViewContainerById(viewContainerId);
            if (viewContainer) {
                const defaultContainer = this.getDefaultContainerById(viewId);
                // Skip if the view is at default location
                // https://github.com/microsoft/vscode/issues/90414
                if (defaultContainer?.id === viewContainer.id) {
                    continue;
                }
            }
            viewCustomizations.viewLocations[viewId] = viewContainerId;
        }
        // Loop through viewContainerBadgeEnablementStates and save only the ones that are disabled
        for (const [viewContainerId, badgeEnablementState] of this.viewContainerBadgeEnablementStates) {
            if (badgeEnablementState === false) {
                viewCustomizations.viewContainerBadgeEnablementStates[viewContainerId] = badgeEnablementState;
            }
        }
        this.viewCustomizations = viewCustomizations;
    }
    get viewCustomizations() {
        if (!this._viewCustomizations) {
            this._viewCustomizations = JSON.parse(this.getStoredViewCustomizationsValue());
            this._viewCustomizations.viewContainerLocations = this._viewCustomizations.viewContainerLocations ?? {};
            this._viewCustomizations.viewLocations = this._viewCustomizations.viewLocations ?? {};
            this._viewCustomizations.viewContainerBadgeEnablementStates = this._viewCustomizations.viewContainerBadgeEnablementStates ?? {};
        }
        return this._viewCustomizations;
    }
    set viewCustomizations(viewCustomizations) {
        const value = JSON.stringify(viewCustomizations);
        if (JSON.stringify(this.viewCustomizations) !== value) {
            this._viewCustomizations = viewCustomizations;
            this.setStoredViewCustomizationsValue(value);
        }
    }
    getStoredViewCustomizationsValue() {
        return this.storageService.get(ViewDescriptorService_1.VIEWS_CUSTOMIZATIONS, 0 /* StorageScope.PROFILE */, '{}');
    }
    setStoredViewCustomizationsValue(value) {
        this.storageService.store(ViewDescriptorService_1.VIEWS_CUSTOMIZATIONS, value, 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
    }
    getViewsByContainer(viewContainer) {
        const result = this.viewsRegistry.getViews(viewContainer).filter(viewDescriptor => {
            const viewDescriptorViewContainerId = this.viewDescriptorsCustomLocations.get(viewDescriptor.id) ?? viewContainer.id;
            return viewDescriptorViewContainerId === viewContainer.id;
        });
        for (const [viewId, viewContainerId] of this.viewDescriptorsCustomLocations.entries()) {
            if (viewContainerId !== viewContainer.id) {
                continue;
            }
            if (this.viewsRegistry.getViewContainer(viewId) === viewContainer) {
                continue;
            }
            const viewDescriptor = this.getViewDescriptorById(viewId);
            if (viewDescriptor) {
                result.push(viewDescriptor);
            }
        }
        return result;
    }
    onDidRegisterViewContainer(viewContainer) {
        const defaultLocation = this.isGeneratedContainerId(viewContainer.id) ? true : this.getViewContainerLocation(viewContainer) === this.getDefaultViewContainerLocation(viewContainer);
        this.getOrCreateDefaultViewContainerLocationContextKey(viewContainer).set(defaultLocation);
        this.getOrRegisterViewContainerModel(viewContainer);
    }
    getOrRegisterViewContainerModel(viewContainer) {
        let viewContainerModel = this.viewContainerModels.get(viewContainer)?.viewContainerModel;
        if (!viewContainerModel) {
            const disposables = new DisposableStore();
            viewContainerModel = disposables.add(this.instantiationService.createInstance(ViewContainerModel, viewContainer));
            this.onDidChangeActiveViews({ added: viewContainerModel.activeViewDescriptors, removed: [] });
            viewContainerModel.onDidChangeActiveViewDescriptors(changed => this.onDidChangeActiveViews(changed), this, disposables);
            this.onDidChangeVisibleViews({ added: [...viewContainerModel.visibleViewDescriptors], removed: [] });
            viewContainerModel.onDidAddVisibleViewDescriptors(added => this.onDidChangeVisibleViews({ added: added.map(({ viewDescriptor }) => viewDescriptor), removed: [] }), this, disposables);
            viewContainerModel.onDidRemoveVisibleViewDescriptors(removed => this.onDidChangeVisibleViews({ added: [], removed: removed.map(({ viewDescriptor }) => viewDescriptor) }), this, disposables);
            disposables.add(toDisposable(() => this.viewsVisibilityActionDisposables.deleteAndDispose(viewContainer)));
            disposables.add(this.registerResetViewContainerAction(viewContainer));
            const value = { viewContainerModel: viewContainerModel, disposables, dispose: () => disposables.dispose() };
            this.viewContainerModels.set(viewContainer, value);
            // Register all views that were statically registered to this container
            // Potentially, this is registering something that was handled by another container
            // addViews() handles this by filtering views that are already registered
            this.onDidRegisterViews([{ views: this.viewsRegistry.getViews(viewContainer), viewContainer }]);
            // Add views that were registered prior to this view container
            const viewsToRegister = this.getViewsByContainer(viewContainer).filter(view => this.getDefaultContainerById(view.id) !== viewContainer);
            if (viewsToRegister.length) {
                this.addViews(viewContainer, viewsToRegister);
                this.contextKeyService.bufferChangeEvents(() => {
                    viewsToRegister.forEach(viewDescriptor => this.getOrCreateMovableViewContextKey(viewDescriptor).set(!!viewDescriptor.canMoveView));
                });
            }
            if (this.canRegisterViewsVisibilityActions) {
                this.registerViewsVisibilityActions(viewContainer, value);
            }
        }
        return viewContainerModel;
    }
    onDidDeregisterViewContainer(viewContainer) {
        this.viewContainerModels.deleteAndDispose(viewContainer);
        this.viewsVisibilityActionDisposables.deleteAndDispose(viewContainer);
    }
    onDidChangeActiveViews({ added, removed }) {
        this.contextKeyService.bufferChangeEvents(() => {
            added.forEach(viewDescriptor => this.getOrCreateActiveViewContextKey(viewDescriptor).set(true));
            removed.forEach(viewDescriptor => this.getOrCreateActiveViewContextKey(viewDescriptor).set(false));
        });
    }
    onDidChangeVisibleViews({ added, removed }) {
        this.contextKeyService.bufferChangeEvents(() => {
            added.forEach(viewDescriptor => this.getOrCreateVisibleViewContextKey(viewDescriptor).set(true));
            removed.forEach(viewDescriptor => this.getOrCreateVisibleViewContextKey(viewDescriptor).set(false));
        });
    }
    registerViewsVisibilityActions(viewContainer, { viewContainerModel, disposables }) {
        this.viewsVisibilityActionDisposables.deleteAndDispose(viewContainer);
        this.viewsVisibilityActionDisposables.set(viewContainer, this.registerViewsVisibilityActionsForContainer(viewContainerModel));
        disposables.add(Event.any(viewContainerModel.onDidChangeActiveViewDescriptors, viewContainerModel.onDidAddVisibleViewDescriptors, viewContainerModel.onDidRemoveVisibleViewDescriptors, viewContainerModel.onDidMoveVisibleViewDescriptors)(e => {
            this.viewsVisibilityActionDisposables.deleteAndDispose(viewContainer);
            this.viewsVisibilityActionDisposables.set(viewContainer, this.registerViewsVisibilityActionsForContainer(viewContainerModel));
        }));
    }
    registerViewsVisibilityActionsForContainer(viewContainerModel) {
        const disposables = new DisposableStore();
        viewContainerModel.activeViewDescriptors.forEach((viewDescriptor, index) => {
            if (!viewDescriptor.remoteAuthority) {
                disposables.add(registerAction2(class extends ViewPaneContainerAction {
                    constructor() {
                        super({
                            id: `${viewDescriptor.id}.toggleVisibility`,
                            viewPaneContainerId: viewContainerModel.viewContainer.id,
                            precondition: viewDescriptor.canToggleVisibility && (!viewContainerModel.isVisible(viewDescriptor.id) || viewContainerModel.visibleViewDescriptors.length > 1) ? ContextKeyExpr.true() : ContextKeyExpr.false(),
                            toggled: ContextKeyExpr.has(`${viewDescriptor.id}.visible`),
                            title: viewDescriptor.name,
                            metadata: {
                                description: localize2('toggleVisibilityDescription', 'Toggles the visibility of the {0} view if the view container it is located in is visible', viewDescriptor.name.value)
                            },
                            menu: [{
                                    id: ViewsSubMenu,
                                    when: ContextKeyExpr.equals('viewContainer', viewContainerModel.viewContainer.id),
                                    order: index,
                                }, {
                                    id: MenuId.ViewContainerTitleContext,
                                    when: ContextKeyExpr.equals('viewContainer', viewContainerModel.viewContainer.id),
                                    order: index,
                                    group: '1_toggleVisibility'
                                }, {
                                    id: MenuId.ViewTitleContext,
                                    when: ContextKeyExpr.or(...viewContainerModel.visibleViewDescriptors.map(v => ContextKeyExpr.equals('view', v.id))),
                                    order: index,
                                    group: '2_toggleVisibility'
                                }]
                        });
                    }
                    async runInViewPaneContainer(serviceAccessor, viewPaneContainer) {
                        viewPaneContainer.toggleViewVisibility(viewDescriptor.id);
                    }
                }));
                disposables.add(registerAction2(class extends ViewPaneContainerAction {
                    constructor() {
                        super({
                            id: `${viewDescriptor.id}.removeView`,
                            viewPaneContainerId: viewContainerModel.viewContainer.id,
                            title: localize('hideView', "Hide '{0}'", viewDescriptor.name.value),
                            metadata: {
                                description: localize2('hideViewDescription', 'Hides the {0} view if it is visible and the view container it is located in is visible', viewDescriptor.name.value)
                            },
                            precondition: viewDescriptor.canToggleVisibility && (!viewContainerModel.isVisible(viewDescriptor.id) || viewContainerModel.visibleViewDescriptors.length > 1) ? ContextKeyExpr.true() : ContextKeyExpr.false(),
                            menu: [{
                                    id: MenuId.ViewTitleContext,
                                    when: ContextKeyExpr.and(ContextKeyExpr.equals('view', viewDescriptor.id), ContextKeyExpr.has(`${viewDescriptor.id}.visible`)),
                                    group: '1_hide',
                                    order: 1
                                }]
                        });
                    }
                    async runInViewPaneContainer(serviceAccessor, viewPaneContainer) {
                        if (viewPaneContainer.getView(viewDescriptor.id)?.isVisible()) {
                            viewPaneContainer.toggleViewVisibility(viewDescriptor.id);
                        }
                    }
                }));
            }
        });
        return disposables;
    }
    registerResetViewContainerAction(viewContainer) {
        const that = this;
        return registerAction2(class ResetViewLocationAction extends Action2 {
            constructor() {
                super({
                    id: `${viewContainer.id}.resetViewContainerLocation`,
                    title: localize2('resetViewLocation', "Reset Location"),
                    menu: [{
                            id: MenuId.ViewContainerTitleContext,
                            group: '1_viewActions',
                            when: ContextKeyExpr.or(ContextKeyExpr.and(ContextKeyExpr.equals('viewContainer', viewContainer.id), ContextKeyExpr.equals(`${viewContainer.id}.defaultViewContainerLocation`, false)))
                        }],
                });
            }
            run(accessor) {
                that.moveViewContainerToLocation(viewContainer, that.getDefaultViewContainerLocation(viewContainer), undefined, this.desc.id);
                accessor.get(IViewsService).openViewContainer(viewContainer.id, true);
            }
        });
    }
    addViews(container, views, visibilityState = ViewVisibilityState.Default) {
        this.contextKeyService.bufferChangeEvents(() => {
            views.forEach(view => {
                const isDefaultContainer = this.getDefaultContainerById(view.id) === container;
                this.getOrCreateDefaultViewLocationContextKey(view).set(isDefaultContainer);
                if (isDefaultContainer) {
                    this.viewDescriptorsCustomLocations.delete(view.id);
                }
                else {
                    this.viewDescriptorsCustomLocations.set(view.id, container.id);
                }
            });
        });
        this.getViewContainerModel(container).add(views.map(view => {
            return {
                viewDescriptor: view,
                collapsed: visibilityState === ViewVisibilityState.Default ? undefined : false,
                visible: visibilityState === ViewVisibilityState.Default ? undefined : true
            };
        }));
    }
    removeViews(container, views) {
        // Set view default location keys to false
        this.contextKeyService.bufferChangeEvents(() => {
            views.forEach(view => {
                if (this.viewDescriptorsCustomLocations.get(view.id) === container.id) {
                    this.viewDescriptorsCustomLocations.delete(view.id);
                }
                this.getOrCreateDefaultViewLocationContextKey(view).set(false);
            });
        });
        // Remove the views
        this.getViewContainerModel(container).remove(views);
    }
    getOrCreateActiveViewContextKey(viewDescriptor) {
        const activeContextKeyId = `${viewDescriptor.id}.active`;
        let contextKey = this.activeViewContextKeys.get(activeContextKeyId);
        if (!contextKey) {
            contextKey = new RawContextKey(activeContextKeyId, false).bindTo(this.contextKeyService);
            this.activeViewContextKeys.set(activeContextKeyId, contextKey);
        }
        return contextKey;
    }
    getOrCreateVisibleViewContextKey(viewDescriptor) {
        const activeContextKeyId = `${viewDescriptor.id}.visible`;
        let contextKey = this.activeViewContextKeys.get(activeContextKeyId);
        if (!contextKey) {
            contextKey = new RawContextKey(activeContextKeyId, false).bindTo(this.contextKeyService);
            this.activeViewContextKeys.set(activeContextKeyId, contextKey);
        }
        return contextKey;
    }
    getOrCreateMovableViewContextKey(viewDescriptor) {
        const movableViewContextKeyId = `${viewDescriptor.id}.canMove`;
        let contextKey = this.movableViewContextKeys.get(movableViewContextKeyId);
        if (!contextKey) {
            contextKey = new RawContextKey(movableViewContextKeyId, false).bindTo(this.contextKeyService);
            this.movableViewContextKeys.set(movableViewContextKeyId, contextKey);
        }
        return contextKey;
    }
    getOrCreateDefaultViewLocationContextKey(viewDescriptor) {
        const defaultViewLocationContextKeyId = `${viewDescriptor.id}.defaultViewLocation`;
        let contextKey = this.defaultViewLocationContextKeys.get(defaultViewLocationContextKeyId);
        if (!contextKey) {
            contextKey = new RawContextKey(defaultViewLocationContextKeyId, false).bindTo(this.contextKeyService);
            this.defaultViewLocationContextKeys.set(defaultViewLocationContextKeyId, contextKey);
        }
        return contextKey;
    }
    getOrCreateDefaultViewContainerLocationContextKey(viewContainer) {
        const defaultViewContainerLocationContextKeyId = `${viewContainer.id}.defaultViewContainerLocation`;
        let contextKey = this.defaultViewContainerLocationContextKeys.get(defaultViewContainerLocationContextKeyId);
        if (!contextKey) {
            contextKey = new RawContextKey(defaultViewContainerLocationContextKeyId, false).bindTo(this.contextKeyService);
            this.defaultViewContainerLocationContextKeys.set(defaultViewContainerLocationContextKeyId, contextKey);
        }
        return contextKey;
    }
};
ViewDescriptorService = ViewDescriptorService_1 = __decorate([
    __param(0, IInstantiationService),
    __param(1, IContextKeyService),
    __param(2, IStorageService),
    __param(3, IExtensionService),
    __param(4, ITelemetryService),
    __param(5, ILoggerService)
], ViewDescriptorService);
export { ViewDescriptorService };
registerSingleton(IViewDescriptorService, ViewDescriptorService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld0Rlc2NyaXB0b3JTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy92aWV3cy9icm93c2VyL3ZpZXdEZXNjcmlwdG9yU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUF5QixzQkFBc0IsRUFBMkUsVUFBVSxJQUFJLGNBQWMsRUFBRSxtQkFBbUIsRUFBRSxlQUFlLEVBQUUsNkJBQTZCLEVBQUUsWUFBWSxFQUFFLGNBQWMsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQ25TLE9BQU8sRUFBZSxhQUFhLEVBQUUsa0JBQWtCLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDdEksT0FBTyxFQUFFLGVBQWUsRUFBK0IsTUFBTSxnREFBZ0QsQ0FBQztBQUM5RyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDNUUsT0FBTyxFQUFFLFlBQVksRUFBRSxlQUFlLEVBQUUsVUFBVSxFQUFlLGFBQWEsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzdILE9BQU8sRUFBRSxpQkFBaUIsRUFBRSx1QkFBdUIsRUFBRSxZQUFZLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUM3SCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDMUYsT0FBTyxFQUFxQixpQkFBaUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQy9HLE9BQU8sRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDdkYs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