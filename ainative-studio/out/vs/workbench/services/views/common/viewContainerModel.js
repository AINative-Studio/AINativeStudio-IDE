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
import { Extensions as ViewExtensions, defaultViewIcon, VIEWS_LOG_ID, VIEWS_LOG_NAME } from '../../../common/views.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Event, Emitter } from '../../../../base/common/event.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { URI } from '../../../../base/common/uri.js';
import { coalesce, move } from '../../../../base/common/arrays.js';
import { isUndefined, isUndefinedOrNull } from '../../../../base/common/types.js';
import { isEqual } from '../../../../base/common/resources.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { ILoggerService } from '../../../../platform/log/common/log.js';
import { CounterSet } from '../../../../base/common/map.js';
import { Lazy } from '../../../../base/common/lazy.js';
import { windowLogGroup } from '../../log/common/logConstants.js';
export function getViewsStateStorageId(viewContainerStorageId) { return `${viewContainerStorageId}.hidden`; }
let ViewDescriptorsState = class ViewDescriptorsState extends Disposable {
    constructor(viewContainerStorageId, viewContainerName, storageService, loggerService) {
        super();
        this.viewContainerName = viewContainerName;
        this.storageService = storageService;
        this._onDidChangeStoredState = this._register(new Emitter());
        this.onDidChangeStoredState = this._onDidChangeStoredState.event;
        this.logger = new Lazy(() => loggerService.createLogger(VIEWS_LOG_ID, { name: VIEWS_LOG_NAME, group: windowLogGroup }));
        this.globalViewsStateStorageId = getViewsStateStorageId(viewContainerStorageId);
        this.workspaceViewsStateStorageId = viewContainerStorageId;
        this._register(this.storageService.onDidChangeValue(0 /* StorageScope.PROFILE */, this.globalViewsStateStorageId, this._store)(() => this.onDidStorageChange()));
        this.state = this.initialize();
    }
    set(id, state) {
        this.state.set(id, state);
    }
    get(id) {
        return this.state.get(id);
    }
    updateState(viewDescriptors) {
        this.updateWorkspaceState(viewDescriptors);
        this.updateGlobalState(viewDescriptors);
    }
    updateWorkspaceState(viewDescriptors) {
        const storedViewsStates = this.getStoredWorkspaceState();
        for (const viewDescriptor of viewDescriptors) {
            const viewState = this.get(viewDescriptor.id);
            if (viewState) {
                storedViewsStates[viewDescriptor.id] = {
                    collapsed: !!viewState.collapsed,
                    isHidden: !viewState.visibleWorkspace,
                    size: viewState.size,
                    order: viewDescriptor.workspace && viewState ? viewState.order : undefined
                };
            }
        }
        if (Object.keys(storedViewsStates).length > 0) {
            this.storageService.store(this.workspaceViewsStateStorageId, JSON.stringify(storedViewsStates), 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        }
        else {
            this.storageService.remove(this.workspaceViewsStateStorageId, 1 /* StorageScope.WORKSPACE */);
        }
    }
    updateGlobalState(viewDescriptors) {
        const storedGlobalState = this.getStoredGlobalState();
        for (const viewDescriptor of viewDescriptors) {
            const state = this.get(viewDescriptor.id);
            storedGlobalState.set(viewDescriptor.id, {
                id: viewDescriptor.id,
                isHidden: state && viewDescriptor.canToggleVisibility ? !state.visibleGlobal : false,
                order: !viewDescriptor.workspace && state ? state.order : undefined
            });
        }
        this.setStoredGlobalState(storedGlobalState);
    }
    onDidStorageChange() {
        if (this.globalViewsStatesValue !== this.getStoredGlobalViewsStatesValue() /* This checks if current window changed the value or not */) {
            this._globalViewsStatesValue = undefined;
            const storedViewsVisibilityStates = this.getStoredGlobalState();
            const storedWorkspaceViewsStates = this.getStoredWorkspaceState();
            const changedStates = [];
            for (const [id, storedState] of storedViewsVisibilityStates) {
                const state = this.get(id);
                if (state) {
                    if (state.visibleGlobal !== !storedState.isHidden) {
                        if (!storedState.isHidden) {
                            this.logger.value.info(`View visibility state changed: ${id} is now visible`, this.viewContainerName);
                        }
                        changedStates.push({ id, visible: !storedState.isHidden });
                    }
                }
                else {
                    const workspaceViewState = storedWorkspaceViewsStates[id];
                    this.set(id, {
                        active: false,
                        visibleGlobal: !storedState.isHidden,
                        visibleWorkspace: isUndefined(workspaceViewState?.isHidden) ? undefined : !workspaceViewState?.isHidden,
                        collapsed: workspaceViewState?.collapsed,
                        order: workspaceViewState?.order,
                        size: workspaceViewState?.size,
                    });
                }
            }
            if (changedStates.length) {
                this._onDidChangeStoredState.fire(changedStates);
                // Update the in memory state after firing the event
                // so that the views can update their state accordingly
                for (const changedState of changedStates) {
                    const state = this.get(changedState.id);
                    if (state) {
                        state.visibleGlobal = changedState.visible;
                    }
                }
            }
        }
    }
    initialize() {
        const viewStates = new Map();
        const workspaceViewsStates = this.getStoredWorkspaceState();
        for (const id of Object.keys(workspaceViewsStates)) {
            const workspaceViewState = workspaceViewsStates[id];
            viewStates.set(id, {
                active: false,
                visibleGlobal: undefined,
                visibleWorkspace: isUndefined(workspaceViewState.isHidden) ? undefined : !workspaceViewState.isHidden,
                collapsed: workspaceViewState.collapsed,
                order: workspaceViewState.order,
                size: workspaceViewState.size,
            });
        }
        // Migrate to `viewletStateStorageId`
        const value = this.storageService.get(this.globalViewsStateStorageId, 1 /* StorageScope.WORKSPACE */, '[]');
        const { state: workspaceVisibilityStates } = this.parseStoredGlobalState(value);
        if (workspaceVisibilityStates.size > 0) {
            for (const { id, isHidden } of workspaceVisibilityStates.values()) {
                const viewState = viewStates.get(id);
                // Not migrated to `viewletStateStorageId`
                if (viewState) {
                    if (isUndefined(viewState.visibleWorkspace)) {
                        viewState.visibleWorkspace = !isHidden;
                    }
                }
                else {
                    viewStates.set(id, {
                        active: false,
                        collapsed: undefined,
                        visibleGlobal: undefined,
                        visibleWorkspace: !isHidden,
                    });
                }
            }
            this.storageService.remove(this.globalViewsStateStorageId, 1 /* StorageScope.WORKSPACE */);
        }
        const { state, hasDuplicates } = this.parseStoredGlobalState(this.globalViewsStatesValue);
        if (hasDuplicates) {
            this.setStoredGlobalState(state);
        }
        for (const { id, isHidden, order } of state.values()) {
            const viewState = viewStates.get(id);
            if (viewState) {
                viewState.visibleGlobal = !isHidden;
                if (!isUndefined(order)) {
                    viewState.order = order;
                }
            }
            else {
                viewStates.set(id, {
                    active: false,
                    visibleGlobal: !isHidden,
                    order,
                    collapsed: undefined,
                    visibleWorkspace: undefined,
                });
            }
        }
        return viewStates;
    }
    getStoredWorkspaceState() {
        return JSON.parse(this.storageService.get(this.workspaceViewsStateStorageId, 1 /* StorageScope.WORKSPACE */, '{}'));
    }
    getStoredGlobalState() {
        return this.parseStoredGlobalState(this.globalViewsStatesValue).state;
    }
    setStoredGlobalState(storedGlobalState) {
        this.globalViewsStatesValue = JSON.stringify([...storedGlobalState.values()]);
    }
    parseStoredGlobalState(value) {
        const storedValue = JSON.parse(value);
        let hasDuplicates = false;
        const state = storedValue.reduce((result, storedState) => {
            if (typeof storedState === 'string' /* migration */) {
                hasDuplicates = hasDuplicates || result.has(storedState);
                result.set(storedState, { id: storedState, isHidden: true });
            }
            else {
                hasDuplicates = hasDuplicates || result.has(storedState.id);
                result.set(storedState.id, storedState);
            }
            return result;
        }, new Map());
        return { state, hasDuplicates };
    }
    get globalViewsStatesValue() {
        if (!this._globalViewsStatesValue) {
            this._globalViewsStatesValue = this.getStoredGlobalViewsStatesValue();
        }
        return this._globalViewsStatesValue;
    }
    set globalViewsStatesValue(globalViewsStatesValue) {
        if (this.globalViewsStatesValue !== globalViewsStatesValue) {
            this._globalViewsStatesValue = globalViewsStatesValue;
            this.setStoredGlobalViewsStatesValue(globalViewsStatesValue);
        }
    }
    getStoredGlobalViewsStatesValue() {
        return this.storageService.get(this.globalViewsStateStorageId, 0 /* StorageScope.PROFILE */, '[]');
    }
    setStoredGlobalViewsStatesValue(value) {
        this.storageService.store(this.globalViewsStateStorageId, value, 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
    }
};
ViewDescriptorsState = __decorate([
    __param(2, IStorageService),
    __param(3, ILoggerService)
], ViewDescriptorsState);
let ViewContainerModel = class ViewContainerModel extends Disposable {
    get title() { return this._title; }
    get icon() { return this._icon; }
    get keybindingId() { return this._keybindingId; }
    // All View Descriptors
    get allViewDescriptors() { return this.viewDescriptorItems.map(item => item.viewDescriptor); }
    // Active View Descriptors
    get activeViewDescriptors() { return this.viewDescriptorItems.filter(item => item.state.active).map(item => item.viewDescriptor); }
    // Visible View Descriptors
    get visibleViewDescriptors() { return this.viewDescriptorItems.filter(item => this.isViewDescriptorVisible(item)).map(item => item.viewDescriptor); }
    constructor(viewContainer, instantiationService, contextKeyService, loggerService) {
        super();
        this.viewContainer = viewContainer;
        this.contextKeyService = contextKeyService;
        this.contextKeys = new CounterSet();
        this.viewDescriptorItems = [];
        this._onDidChangeContainerInfo = this._register(new Emitter());
        this.onDidChangeContainerInfo = this._onDidChangeContainerInfo.event;
        this._onDidChangeAllViewDescriptors = this._register(new Emitter());
        this.onDidChangeAllViewDescriptors = this._onDidChangeAllViewDescriptors.event;
        this._onDidChangeActiveViewDescriptors = this._register(new Emitter());
        this.onDidChangeActiveViewDescriptors = this._onDidChangeActiveViewDescriptors.event;
        this._onDidAddVisibleViewDescriptors = this._register(new Emitter());
        this.onDidAddVisibleViewDescriptors = this._onDidAddVisibleViewDescriptors.event;
        this._onDidRemoveVisibleViewDescriptors = this._register(new Emitter());
        this.onDidRemoveVisibleViewDescriptors = this._onDidRemoveVisibleViewDescriptors.event;
        this._onDidMoveVisibleViewDescriptors = this._register(new Emitter());
        this.onDidMoveVisibleViewDescriptors = this._onDidMoveVisibleViewDescriptors.event;
        this.logger = new Lazy(() => loggerService.createLogger(VIEWS_LOG_ID, { name: VIEWS_LOG_NAME, group: windowLogGroup }));
        this._register(Event.filter(contextKeyService.onDidChangeContext, e => e.affectsSome(this.contextKeys))(() => this.onDidChangeContext()));
        this.viewDescriptorsState = this._register(instantiationService.createInstance(ViewDescriptorsState, viewContainer.storageId || `${viewContainer.id}.state`, typeof viewContainer.title === 'string' ? viewContainer.title : viewContainer.title.original));
        this._register(this.viewDescriptorsState.onDidChangeStoredState(items => this.updateVisibility(items)));
        this.updateContainerInfo();
    }
    updateContainerInfo() {
        /* Use default container info if one of the visible view descriptors belongs to the current container by default */
        const useDefaultContainerInfo = this.viewContainer.alwaysUseContainerInfo || this.visibleViewDescriptors.length === 0 || this.visibleViewDescriptors.some(v => Registry.as(ViewExtensions.ViewsRegistry).getViewContainer(v.id) === this.viewContainer);
        const title = useDefaultContainerInfo ? (typeof this.viewContainer.title === 'string' ? this.viewContainer.title : this.viewContainer.title.value) : this.visibleViewDescriptors[0]?.containerTitle || this.visibleViewDescriptors[0]?.name?.value || '';
        let titleChanged = false;
        if (this._title !== title) {
            this._title = title;
            titleChanged = true;
        }
        const icon = useDefaultContainerInfo ? this.viewContainer.icon : this.visibleViewDescriptors[0]?.containerIcon || defaultViewIcon;
        let iconChanged = false;
        if (!this.isEqualIcon(icon)) {
            this._icon = icon;
            iconChanged = true;
        }
        const keybindingId = this.viewContainer.openCommandActionDescriptor?.id ?? this.activeViewDescriptors.find(v => v.openCommandActionDescriptor)?.openCommandActionDescriptor?.id;
        let keybindingIdChanged = false;
        if (this._keybindingId !== keybindingId) {
            this._keybindingId = keybindingId;
            keybindingIdChanged = true;
        }
        if (titleChanged || iconChanged || keybindingIdChanged) {
            this._onDidChangeContainerInfo.fire({ title: titleChanged, icon: iconChanged, keybindingId: keybindingIdChanged });
        }
    }
    isEqualIcon(icon) {
        if (URI.isUri(icon)) {
            return URI.isUri(this._icon) && isEqual(icon, this._icon);
        }
        else if (ThemeIcon.isThemeIcon(icon)) {
            return ThemeIcon.isThemeIcon(this._icon) && ThemeIcon.isEqual(icon, this._icon);
        }
        return icon === this._icon;
    }
    isVisible(id) {
        const viewDescriptorItem = this.viewDescriptorItems.find(v => v.viewDescriptor.id === id);
        if (!viewDescriptorItem) {
            throw new Error(`Unknown view ${id}`);
        }
        return this.isViewDescriptorVisible(viewDescriptorItem);
    }
    setVisible(id, visible) {
        this.updateVisibility([{ id, visible }]);
    }
    updateVisibility(viewDescriptors) {
        // First: Update and remove the view descriptors which are asked to be hidden
        const viewDescriptorItemsToHide = coalesce(viewDescriptors.filter(({ visible }) => !visible)
            .map(({ id }) => this.findAndIgnoreIfNotFound(id)));
        const removed = [];
        for (const { viewDescriptorItem, visibleIndex } of viewDescriptorItemsToHide) {
            if (this.updateViewDescriptorItemVisibility(viewDescriptorItem, false)) {
                removed.push({ viewDescriptor: viewDescriptorItem.viewDescriptor, index: visibleIndex });
            }
        }
        if (removed.length) {
            this.broadCastRemovedVisibleViewDescriptors(removed);
        }
        // Second: Update and add the view descriptors which are asked to be shown
        const added = [];
        for (const { id, visible } of viewDescriptors) {
            if (!visible) {
                continue;
            }
            const foundViewDescriptor = this.findAndIgnoreIfNotFound(id);
            if (!foundViewDescriptor) {
                continue;
            }
            const { viewDescriptorItem, visibleIndex } = foundViewDescriptor;
            if (this.updateViewDescriptorItemVisibility(viewDescriptorItem, true)) {
                added.push({ index: visibleIndex, viewDescriptor: viewDescriptorItem.viewDescriptor, size: viewDescriptorItem.state.size, collapsed: !!viewDescriptorItem.state.collapsed });
            }
        }
        if (added.length) {
            this.broadCastAddedVisibleViewDescriptors(added);
        }
    }
    updateViewDescriptorItemVisibility(viewDescriptorItem, visible) {
        if (!viewDescriptorItem.viewDescriptor.canToggleVisibility) {
            return false;
        }
        if (this.isViewDescriptorVisibleWhenActive(viewDescriptorItem) === visible) {
            return false;
        }
        // update visibility
        if (viewDescriptorItem.viewDescriptor.workspace) {
            viewDescriptorItem.state.visibleWorkspace = visible;
        }
        else {
            viewDescriptorItem.state.visibleGlobal = visible;
            if (visible) {
                this.logger.value.info(`Showing view ${viewDescriptorItem.viewDescriptor.id} in the container ${this.viewContainer.id}`);
            }
        }
        // return `true` only if visibility is changed
        return this.isViewDescriptorVisible(viewDescriptorItem) === visible;
    }
    isCollapsed(id) {
        return !!this.find(id).viewDescriptorItem.state.collapsed;
    }
    setCollapsed(id, collapsed) {
        const { viewDescriptorItem } = this.find(id);
        if (viewDescriptorItem.state.collapsed !== collapsed) {
            viewDescriptorItem.state.collapsed = collapsed;
        }
        this.viewDescriptorsState.updateState(this.allViewDescriptors);
    }
    getSize(id) {
        return this.find(id).viewDescriptorItem.state.size;
    }
    setSizes(newSizes) {
        for (const { id, size } of newSizes) {
            const { viewDescriptorItem } = this.find(id);
            if (viewDescriptorItem.state.size !== size) {
                viewDescriptorItem.state.size = size;
            }
        }
        this.viewDescriptorsState.updateState(this.allViewDescriptors);
    }
    move(from, to) {
        const fromIndex = this.viewDescriptorItems.findIndex(v => v.viewDescriptor.id === from);
        const toIndex = this.viewDescriptorItems.findIndex(v => v.viewDescriptor.id === to);
        const fromViewDescriptor = this.viewDescriptorItems[fromIndex];
        const toViewDescriptor = this.viewDescriptorItems[toIndex];
        move(this.viewDescriptorItems, fromIndex, toIndex);
        for (let index = 0; index < this.viewDescriptorItems.length; index++) {
            this.viewDescriptorItems[index].state.order = index;
        }
        this.broadCastMovedViewDescriptors({ index: fromIndex, viewDescriptor: fromViewDescriptor.viewDescriptor }, { index: toIndex, viewDescriptor: toViewDescriptor.viewDescriptor });
    }
    add(addedViewDescriptorStates) {
        const addedItems = [];
        for (const addedViewDescriptorState of addedViewDescriptorStates) {
            const viewDescriptor = addedViewDescriptorState.viewDescriptor;
            if (viewDescriptor.when) {
                for (const key of viewDescriptor.when.keys()) {
                    this.contextKeys.add(key);
                }
            }
            let state = this.viewDescriptorsState.get(viewDescriptor.id);
            if (state) {
                // set defaults if not set
                if (viewDescriptor.workspace) {
                    state.visibleWorkspace = isUndefinedOrNull(addedViewDescriptorState.visible) ? (isUndefinedOrNull(state.visibleWorkspace) ? !viewDescriptor.hideByDefault : state.visibleWorkspace) : addedViewDescriptorState.visible;
                }
                else {
                    const isVisible = state.visibleGlobal;
                    state.visibleGlobal = isUndefinedOrNull(addedViewDescriptorState.visible) ? (isUndefinedOrNull(state.visibleGlobal) ? !viewDescriptor.hideByDefault : state.visibleGlobal) : addedViewDescriptorState.visible;
                    if (state.visibleGlobal && !isVisible) {
                        this.logger.value.info(`Added view ${viewDescriptor.id} in the container ${this.viewContainer.id} and showing it.`, `${isVisible}`, `${viewDescriptor.hideByDefault}`, `${addedViewDescriptorState.visible}`);
                    }
                }
                state.collapsed = isUndefinedOrNull(addedViewDescriptorState.collapsed) ? (isUndefinedOrNull(state.collapsed) ? !!viewDescriptor.collapsed : state.collapsed) : addedViewDescriptorState.collapsed;
            }
            else {
                state = {
                    active: false,
                    visibleGlobal: isUndefinedOrNull(addedViewDescriptorState.visible) ? !viewDescriptor.hideByDefault : addedViewDescriptorState.visible,
                    visibleWorkspace: isUndefinedOrNull(addedViewDescriptorState.visible) ? !viewDescriptor.hideByDefault : addedViewDescriptorState.visible,
                    collapsed: isUndefinedOrNull(addedViewDescriptorState.collapsed) ? !!viewDescriptor.collapsed : addedViewDescriptorState.collapsed,
                };
            }
            this.viewDescriptorsState.set(viewDescriptor.id, state);
            state.active = this.contextKeyService.contextMatchesRules(viewDescriptor.when);
            addedItems.push({ viewDescriptor, state });
        }
        this.viewDescriptorItems.push(...addedItems);
        this.viewDescriptorItems.sort(this.compareViewDescriptors.bind(this));
        this._onDidChangeAllViewDescriptors.fire({ added: addedItems.map(({ viewDescriptor }) => viewDescriptor), removed: [] });
        const addedActiveItems = [];
        for (const viewDescriptorItem of addedItems) {
            if (viewDescriptorItem.state.active) {
                addedActiveItems.push({ viewDescriptorItem, visible: this.isViewDescriptorVisible(viewDescriptorItem) });
            }
        }
        if (addedActiveItems.length) {
            this._onDidChangeActiveViewDescriptors.fire(({ added: addedActiveItems.map(({ viewDescriptorItem }) => viewDescriptorItem.viewDescriptor), removed: [] }));
        }
        const addedVisibleDescriptors = [];
        for (const { viewDescriptorItem, visible } of addedActiveItems) {
            if (visible && this.isViewDescriptorVisible(viewDescriptorItem)) {
                const { visibleIndex } = this.find(viewDescriptorItem.viewDescriptor.id);
                addedVisibleDescriptors.push({ index: visibleIndex, viewDescriptor: viewDescriptorItem.viewDescriptor, size: viewDescriptorItem.state.size, collapsed: !!viewDescriptorItem.state.collapsed });
            }
        }
        this.broadCastAddedVisibleViewDescriptors(addedVisibleDescriptors);
    }
    remove(viewDescriptors) {
        const removed = [];
        const removedItems = [];
        const removedActiveDescriptors = [];
        const removedVisibleDescriptors = [];
        for (const viewDescriptor of viewDescriptors) {
            if (viewDescriptor.when) {
                for (const key of viewDescriptor.when.keys()) {
                    this.contextKeys.delete(key);
                }
            }
            const index = this.viewDescriptorItems.findIndex(i => i.viewDescriptor.id === viewDescriptor.id);
            if (index !== -1) {
                removed.push(viewDescriptor);
                const viewDescriptorItem = this.viewDescriptorItems[index];
                if (viewDescriptorItem.state.active) {
                    removedActiveDescriptors.push(viewDescriptorItem.viewDescriptor);
                }
                if (this.isViewDescriptorVisible(viewDescriptorItem)) {
                    const { visibleIndex } = this.find(viewDescriptorItem.viewDescriptor.id);
                    removedVisibleDescriptors.push({ index: visibleIndex, viewDescriptor: viewDescriptorItem.viewDescriptor });
                }
                removedItems.push(viewDescriptorItem);
            }
        }
        // update state
        removedItems.forEach(item => this.viewDescriptorItems.splice(this.viewDescriptorItems.indexOf(item), 1));
        this.broadCastRemovedVisibleViewDescriptors(removedVisibleDescriptors);
        if (removedActiveDescriptors.length) {
            this._onDidChangeActiveViewDescriptors.fire(({ added: [], removed: removedActiveDescriptors }));
        }
        if (removed.length) {
            this._onDidChangeAllViewDescriptors.fire({ added: [], removed });
        }
    }
    onDidChangeContext() {
        const addedActiveItems = [];
        const removedActiveItems = [];
        for (const item of this.viewDescriptorItems) {
            const wasActive = item.state.active;
            const isActive = this.contextKeyService.contextMatchesRules(item.viewDescriptor.when);
            if (wasActive !== isActive) {
                if (isActive) {
                    addedActiveItems.push({ item, visibleWhenActive: this.isViewDescriptorVisibleWhenActive(item) });
                }
                else {
                    removedActiveItems.push(item);
                }
            }
        }
        const removedVisibleDescriptors = [];
        for (const item of removedActiveItems) {
            if (this.isViewDescriptorVisible(item)) {
                const { visibleIndex } = this.find(item.viewDescriptor.id);
                removedVisibleDescriptors.push({ index: visibleIndex, viewDescriptor: item.viewDescriptor });
            }
        }
        // Update the State
        removedActiveItems.forEach(item => item.state.active = false);
        addedActiveItems.forEach(({ item }) => item.state.active = true);
        this.broadCastRemovedVisibleViewDescriptors(removedVisibleDescriptors);
        if (addedActiveItems.length || removedActiveItems.length) {
            this._onDidChangeActiveViewDescriptors.fire(({ added: addedActiveItems.map(({ item }) => item.viewDescriptor), removed: removedActiveItems.map(item => item.viewDescriptor) }));
        }
        const addedVisibleDescriptors = [];
        for (const { item, visibleWhenActive } of addedActiveItems) {
            if (visibleWhenActive && this.isViewDescriptorVisible(item)) {
                const { visibleIndex } = this.find(item.viewDescriptor.id);
                addedVisibleDescriptors.push({ index: visibleIndex, viewDescriptor: item.viewDescriptor, size: item.state.size, collapsed: !!item.state.collapsed });
            }
        }
        this.broadCastAddedVisibleViewDescriptors(addedVisibleDescriptors);
    }
    broadCastAddedVisibleViewDescriptors(added) {
        if (added.length) {
            this._onDidAddVisibleViewDescriptors.fire(added.sort((a, b) => a.index - b.index));
            this.updateState(`Added views:${added.map(v => v.viewDescriptor.id).join(',')} in ${this.viewContainer.id}`);
        }
    }
    broadCastRemovedVisibleViewDescriptors(removed) {
        if (removed.length) {
            this._onDidRemoveVisibleViewDescriptors.fire(removed.sort((a, b) => b.index - a.index));
            this.updateState(`Removed views:${removed.map(v => v.viewDescriptor.id).join(',')} from ${this.viewContainer.id}`);
        }
    }
    broadCastMovedViewDescriptors(from, to) {
        this._onDidMoveVisibleViewDescriptors.fire({ from, to });
        this.updateState(`Moved view ${from.viewDescriptor.id} to ${to.viewDescriptor.id} in ${this.viewContainer.id}`);
    }
    updateState(reason) {
        this.logger.value.info(reason);
        this.viewDescriptorsState.updateState(this.allViewDescriptors);
        this.updateContainerInfo();
    }
    isViewDescriptorVisible(viewDescriptorItem) {
        if (!viewDescriptorItem.state.active) {
            return false;
        }
        return this.isViewDescriptorVisibleWhenActive(viewDescriptorItem);
    }
    isViewDescriptorVisibleWhenActive(viewDescriptorItem) {
        if (viewDescriptorItem.viewDescriptor.workspace) {
            return !!viewDescriptorItem.state.visibleWorkspace;
        }
        return !!viewDescriptorItem.state.visibleGlobal;
    }
    find(id) {
        const result = this.findAndIgnoreIfNotFound(id);
        if (result) {
            return result;
        }
        throw new Error(`view descriptor ${id} not found`);
    }
    findAndIgnoreIfNotFound(id) {
        for (let i = 0, visibleIndex = 0; i < this.viewDescriptorItems.length; i++) {
            const viewDescriptorItem = this.viewDescriptorItems[i];
            if (viewDescriptorItem.viewDescriptor.id === id) {
                return { index: i, visibleIndex, viewDescriptorItem: viewDescriptorItem };
            }
            if (this.isViewDescriptorVisible(viewDescriptorItem)) {
                visibleIndex++;
            }
        }
        return undefined;
    }
    compareViewDescriptors(a, b) {
        if (a.viewDescriptor.id === b.viewDescriptor.id) {
            return 0;
        }
        return (this.getViewOrder(a) - this.getViewOrder(b)) || this.getGroupOrderResult(a.viewDescriptor, b.viewDescriptor);
    }
    getViewOrder(viewDescriptorItem) {
        const viewOrder = typeof viewDescriptorItem.state.order === 'number' ? viewDescriptorItem.state.order : viewDescriptorItem.viewDescriptor.order;
        return typeof viewOrder === 'number' ? viewOrder : Number.MAX_VALUE;
    }
    getGroupOrderResult(a, b) {
        if (!a.group || !b.group) {
            return 0;
        }
        if (a.group === b.group) {
            return 0;
        }
        return a.group < b.group ? -1 : 1;
    }
};
ViewContainerModel = __decorate([
    __param(1, IInstantiationService),
    __param(2, IContextKeyService),
    __param(3, ILoggerService)
], ViewContainerModel);
export { ViewContainerModel };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld0NvbnRhaW5lck1vZGVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy92aWV3cy9jb21tb24vdmlld0NvbnRhaW5lck1vZGVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBa0QsVUFBVSxJQUFJLGNBQWMsRUFBK0YsZUFBZSxFQUFFLFlBQVksRUFBRSxjQUFjLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUNwUSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUMxRixPQUFPLEVBQUUsZUFBZSxFQUErQixNQUFNLGdEQUFnRCxDQUFDO0FBQzlHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUM1RSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckQsT0FBTyxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNuRSxPQUFPLEVBQUUsV0FBVyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDbEYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUVqRSxPQUFPLEVBQVcsY0FBYyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDakYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUN2RCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFFbEUsTUFBTSxVQUFVLHNCQUFzQixDQUFDLHNCQUE4QixJQUFZLE9BQU8sR0FBRyxzQkFBc0IsU0FBUyxDQUFDLENBQUMsQ0FBQztBQXdCN0gsSUFBTSxvQkFBb0IsR0FBMUIsTUFBTSxvQkFBcUIsU0FBUSxVQUFVO0lBVzVDLFlBQ0Msc0JBQThCLEVBQ2IsaUJBQXlCLEVBQ3pCLGNBQWdELEVBQ2pELGFBQTZCO1FBRTdDLEtBQUssRUFBRSxDQUFDO1FBSlMsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFRO1FBQ1IsbUJBQWMsR0FBZCxjQUFjLENBQWlCO1FBUjFELDRCQUF1QixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQXNDLENBQUMsQ0FBQztRQUMzRiwyQkFBc0IsR0FBRyxJQUFJLENBQUMsdUJBQXVCLENBQUMsS0FBSyxDQUFDO1FBWXBFLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsYUFBYSxDQUFDLFlBQVksQ0FBQyxZQUFZLEVBQUUsRUFBRSxJQUFJLEVBQUUsY0FBYyxFQUFFLEtBQUssRUFBRSxjQUFjLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFeEgsSUFBSSxDQUFDLHlCQUF5QixHQUFHLHNCQUFzQixDQUFDLHNCQUFzQixDQUFDLENBQUM7UUFDaEYsSUFBSSxDQUFDLDRCQUE0QixHQUFHLHNCQUFzQixDQUFDO1FBQzNELElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsK0JBQXVCLElBQUksQ0FBQyx5QkFBeUIsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRXpKLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO0lBRWhDLENBQUM7SUFFRCxHQUFHLENBQUMsRUFBVSxFQUFFLEtBQTJCO1FBQzFDLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztJQUMzQixDQUFDO0lBRUQsR0FBRyxDQUFDLEVBQVU7UUFDYixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQzNCLENBQUM7SUFFRCxXQUFXLENBQUMsZUFBK0M7UUFDMUQsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGVBQWUsQ0FBQyxDQUFDO1FBQzNDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxlQUFlLENBQUMsQ0FBQztJQUN6QyxDQUFDO0lBRU8sb0JBQW9CLENBQUMsZUFBK0M7UUFDM0UsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLENBQUMsdUJBQXVCLEVBQUUsQ0FBQztRQUN6RCxLQUFLLE1BQU0sY0FBYyxJQUFJLGVBQWUsRUFBRSxDQUFDO1lBQzlDLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQzlDLElBQUksU0FBUyxFQUFFLENBQUM7Z0JBQ2YsaUJBQWlCLENBQUMsY0FBYyxDQUFDLEVBQUUsQ0FBQyxHQUFHO29CQUN0QyxTQUFTLEVBQUUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxTQUFTO29CQUNoQyxRQUFRLEVBQUUsQ0FBQyxTQUFTLENBQUMsZ0JBQWdCO29CQUNyQyxJQUFJLEVBQUUsU0FBUyxDQUFDLElBQUk7b0JBQ3BCLEtBQUssRUFBRSxjQUFjLENBQUMsU0FBUyxJQUFJLFNBQVMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsU0FBUztpQkFDMUUsQ0FBQztZQUNILENBQUM7UUFDRixDQUFDO1FBRUQsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQy9DLElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyw0QkFBNEIsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLGlCQUFpQixDQUFDLGdFQUFnRCxDQUFDO1FBQ2hKLENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLDRCQUE0QixpQ0FBeUIsQ0FBQztRQUN2RixDQUFDO0lBQ0YsQ0FBQztJQUVPLGlCQUFpQixDQUFDLGVBQStDO1FBQ3hFLE1BQU0saUJBQWlCLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUM7UUFDdEQsS0FBSyxNQUFNLGNBQWMsSUFBSSxlQUFlLEVBQUUsQ0FBQztZQUM5QyxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUMxQyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLEVBQUUsRUFBRTtnQkFDeEMsRUFBRSxFQUFFLGNBQWMsQ0FBQyxFQUFFO2dCQUNyQixRQUFRLEVBQUUsS0FBSyxJQUFJLGNBQWMsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxLQUFLO2dCQUNwRixLQUFLLEVBQUUsQ0FBQyxjQUFjLENBQUMsU0FBUyxJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsU0FBUzthQUNuRSxDQUFDLENBQUM7UUFDSixDQUFDO1FBQ0QsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGlCQUFpQixDQUFDLENBQUM7SUFDOUMsQ0FBQztJQUVPLGtCQUFrQjtRQUN6QixJQUFJLElBQUksQ0FBQyxzQkFBc0IsS0FBSyxJQUFJLENBQUMsK0JBQStCLEVBQUUsQ0FBQyw0REFBNEQsRUFBRSxDQUFDO1lBQ3pJLElBQUksQ0FBQyx1QkFBdUIsR0FBRyxTQUFTLENBQUM7WUFDekMsTUFBTSwyQkFBMkIsR0FBRyxJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztZQUNoRSxNQUFNLDBCQUEwQixHQUFHLElBQUksQ0FBQyx1QkFBdUIsRUFBRSxDQUFDO1lBQ2xFLE1BQU0sYUFBYSxHQUF1QyxFQUFFLENBQUM7WUFDN0QsS0FBSyxNQUFNLENBQUMsRUFBRSxFQUFFLFdBQVcsQ0FBQyxJQUFJLDJCQUEyQixFQUFFLENBQUM7Z0JBQzdELE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBQzNCLElBQUksS0FBSyxFQUFFLENBQUM7b0JBQ1gsSUFBSSxLQUFLLENBQUMsYUFBYSxLQUFLLENBQUMsV0FBVyxDQUFDLFFBQVEsRUFBRSxDQUFDO3dCQUNuRCxJQUFJLENBQUMsV0FBVyxDQUFDLFFBQVEsRUFBRSxDQUFDOzRCQUMzQixJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsa0NBQWtDLEVBQUUsaUJBQWlCLEVBQUUsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUM7d0JBQ3ZHLENBQUM7d0JBQ0QsYUFBYSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsQ0FBQyxXQUFXLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztvQkFDNUQsQ0FBQztnQkFDRixDQUFDO3FCQUFNLENBQUM7b0JBQ1AsTUFBTSxrQkFBa0IsR0FBMEMsMEJBQTBCLENBQUMsRUFBRSxDQUFDLENBQUM7b0JBQ2pHLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFO3dCQUNaLE1BQU0sRUFBRSxLQUFLO3dCQUNiLGFBQWEsRUFBRSxDQUFDLFdBQVcsQ0FBQyxRQUFRO3dCQUNwQyxnQkFBZ0IsRUFBRSxXQUFXLENBQUMsa0JBQWtCLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxrQkFBa0IsRUFBRSxRQUFRO3dCQUN2RyxTQUFTLEVBQUUsa0JBQWtCLEVBQUUsU0FBUzt3QkFDeEMsS0FBSyxFQUFFLGtCQUFrQixFQUFFLEtBQUs7d0JBQ2hDLElBQUksRUFBRSxrQkFBa0IsRUFBRSxJQUFJO3FCQUM5QixDQUFDLENBQUM7Z0JBQ0osQ0FBQztZQUNGLENBQUM7WUFDRCxJQUFJLGFBQWEsQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDMUIsSUFBSSxDQUFDLHVCQUF1QixDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQztnQkFDakQsb0RBQW9EO2dCQUNwRCx1REFBdUQ7Z0JBQ3ZELEtBQUssTUFBTSxZQUFZLElBQUksYUFBYSxFQUFFLENBQUM7b0JBQzFDLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQyxDQUFDO29CQUN4QyxJQUFJLEtBQUssRUFBRSxDQUFDO3dCQUNYLEtBQUssQ0FBQyxhQUFhLEdBQUcsWUFBWSxDQUFDLE9BQU8sQ0FBQztvQkFDNUMsQ0FBQztnQkFDRixDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRU8sVUFBVTtRQUNqQixNQUFNLFVBQVUsR0FBRyxJQUFJLEdBQUcsRUFBZ0MsQ0FBQztRQUMzRCxNQUFNLG9CQUFvQixHQUFHLElBQUksQ0FBQyx1QkFBdUIsRUFBRSxDQUFDO1FBQzVELEtBQUssTUFBTSxFQUFFLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxFQUFFLENBQUM7WUFDcEQsTUFBTSxrQkFBa0IsR0FBRyxvQkFBb0IsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUNwRCxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRTtnQkFDbEIsTUFBTSxFQUFFLEtBQUs7Z0JBQ2IsYUFBYSxFQUFFLFNBQVM7Z0JBQ3hCLGdCQUFnQixFQUFFLFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLGtCQUFrQixDQUFDLFFBQVE7Z0JBQ3JHLFNBQVMsRUFBRSxrQkFBa0IsQ0FBQyxTQUFTO2dCQUN2QyxLQUFLLEVBQUUsa0JBQWtCLENBQUMsS0FBSztnQkFDL0IsSUFBSSxFQUFFLGtCQUFrQixDQUFDLElBQUk7YUFDN0IsQ0FBQyxDQUFDO1FBQ0osQ0FBQztRQUVELHFDQUFxQztRQUNyQyxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMseUJBQXlCLGtDQUEwQixJQUFJLENBQUMsQ0FBQztRQUNwRyxNQUFNLEVBQUUsS0FBSyxFQUFFLHlCQUF5QixFQUFFLEdBQUcsSUFBSSxDQUFDLHNCQUFzQixDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ2hGLElBQUkseUJBQXlCLENBQUMsSUFBSSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ3hDLEtBQUssTUFBTSxFQUFFLEVBQUUsRUFBRSxRQUFRLEVBQUUsSUFBSSx5QkFBeUIsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDO2dCQUNuRSxNQUFNLFNBQVMsR0FBRyxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDO2dCQUNyQywwQ0FBMEM7Z0JBQzFDLElBQUksU0FBUyxFQUFFLENBQUM7b0JBQ2YsSUFBSSxXQUFXLENBQUMsU0FBUyxDQUFDLGdCQUFnQixDQUFDLEVBQUUsQ0FBQzt3QkFDN0MsU0FBUyxDQUFDLGdCQUFnQixHQUFHLENBQUMsUUFBUSxDQUFDO29CQUN4QyxDQUFDO2dCQUNGLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRTt3QkFDbEIsTUFBTSxFQUFFLEtBQUs7d0JBQ2IsU0FBUyxFQUFFLFNBQVM7d0JBQ3BCLGFBQWEsRUFBRSxTQUFTO3dCQUN4QixnQkFBZ0IsRUFBRSxDQUFDLFFBQVE7cUJBQzNCLENBQUMsQ0FBQztnQkFDSixDQUFDO1lBQ0YsQ0FBQztZQUNELElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyx5QkFBeUIsaUNBQXlCLENBQUM7UUFDcEYsQ0FBQztRQUVELE1BQU0sRUFBRSxLQUFLLEVBQUUsYUFBYSxFQUFFLEdBQUcsSUFBSSxDQUFDLHNCQUFzQixDQUFDLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO1FBQzFGLElBQUksYUFBYSxFQUFFLENBQUM7WUFDbkIsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ2xDLENBQUM7UUFDRCxLQUFLLE1BQU0sRUFBRSxFQUFFLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxJQUFJLEtBQUssQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDO1lBQ3RELE1BQU0sU0FBUyxHQUFHLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDckMsSUFBSSxTQUFTLEVBQUUsQ0FBQztnQkFDZixTQUFTLENBQUMsYUFBYSxHQUFHLENBQUMsUUFBUSxDQUFDO2dCQUNwQyxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7b0JBQ3pCLFNBQVMsQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDO2dCQUN6QixDQUFDO1lBQ0YsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFO29CQUNsQixNQUFNLEVBQUUsS0FBSztvQkFDYixhQUFhLEVBQUUsQ0FBQyxRQUFRO29CQUN4QixLQUFLO29CQUNMLFNBQVMsRUFBRSxTQUFTO29CQUNwQixnQkFBZ0IsRUFBRSxTQUFTO2lCQUMzQixDQUFDLENBQUM7WUFDSixDQUFDO1FBQ0YsQ0FBQztRQUNELE9BQU8sVUFBVSxDQUFDO0lBQ25CLENBQUM7SUFFTyx1QkFBdUI7UUFDOUIsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyw0QkFBNEIsa0NBQTBCLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDN0csQ0FBQztJQUVPLG9CQUFvQjtRQUMzQixPQUFPLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxJQUFJLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxLQUFLLENBQUM7SUFDdkUsQ0FBQztJQUVPLG9CQUFvQixDQUFDLGlCQUFzRDtRQUNsRixJQUFJLENBQUMsc0JBQXNCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEdBQUcsaUJBQWlCLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQy9FLENBQUM7SUFFTyxzQkFBc0IsQ0FBQyxLQUFhO1FBQzNDLE1BQU0sV0FBVyxHQUEyQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzlFLElBQUksYUFBYSxHQUFHLEtBQUssQ0FBQztRQUMxQixNQUFNLEtBQUssR0FBRyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUMsTUFBTSxFQUFFLFdBQVcsRUFBRSxFQUFFO1lBQ3hELElBQUksT0FBTyxXQUFXLEtBQUssUUFBUSxDQUFDLGVBQWUsRUFBRSxDQUFDO2dCQUNyRCxhQUFhLEdBQUcsYUFBYSxJQUFJLE1BQU0sQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUM7Z0JBQ3pELE1BQU0sQ0FBQyxHQUFHLENBQUMsV0FBVyxFQUFFLEVBQUUsRUFBRSxFQUFFLFdBQVcsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztZQUM5RCxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsYUFBYSxHQUFHLGFBQWEsSUFBSSxNQUFNLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFDNUQsTUFBTSxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsRUFBRSxFQUFFLFdBQVcsQ0FBQyxDQUFDO1lBQ3pDLENBQUM7WUFDRCxPQUFPLE1BQU0sQ0FBQztRQUNmLENBQUMsRUFBRSxJQUFJLEdBQUcsRUFBa0MsQ0FBQyxDQUFDO1FBQzlDLE9BQU8sRUFBRSxLQUFLLEVBQUUsYUFBYSxFQUFFLENBQUM7SUFDakMsQ0FBQztJQUdELElBQVksc0JBQXNCO1FBQ2pDLElBQUksQ0FBQyxJQUFJLENBQUMsdUJBQXVCLEVBQUUsQ0FBQztZQUNuQyxJQUFJLENBQUMsdUJBQXVCLEdBQUcsSUFBSSxDQUFDLCtCQUErQixFQUFFLENBQUM7UUFDdkUsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDLHVCQUF1QixDQUFDO0lBQ3JDLENBQUM7SUFFRCxJQUFZLHNCQUFzQixDQUFDLHNCQUE4QjtRQUNoRSxJQUFJLElBQUksQ0FBQyxzQkFBc0IsS0FBSyxzQkFBc0IsRUFBRSxDQUFDO1lBQzVELElBQUksQ0FBQyx1QkFBdUIsR0FBRyxzQkFBc0IsQ0FBQztZQUN0RCxJQUFJLENBQUMsK0JBQStCLENBQUMsc0JBQXNCLENBQUMsQ0FBQztRQUM5RCxDQUFDO0lBQ0YsQ0FBQztJQUVPLCtCQUErQjtRQUN0QyxPQUFPLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyx5QkFBeUIsZ0NBQXdCLElBQUksQ0FBQyxDQUFDO0lBQzVGLENBQUM7SUFFTywrQkFBK0IsQ0FBQyxLQUFhO1FBQ3BELElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyx5QkFBeUIsRUFBRSxLQUFLLDJEQUEyQyxDQUFDO0lBQzVHLENBQUM7Q0FFRCxDQUFBO0FBdk9LLG9CQUFvQjtJQWN2QixXQUFBLGVBQWUsQ0FBQTtJQUNmLFdBQUEsY0FBYyxDQUFBO0dBZlgsb0JBQW9CLENBdU96QjtBQU9NLElBQU0sa0JBQWtCLEdBQXhCLE1BQU0sa0JBQW1CLFNBQVEsVUFBVTtJQVFqRCxJQUFJLEtBQUssS0FBYSxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO0lBRzNDLElBQUksSUFBSSxLQUFrQyxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO0lBRzlELElBQUksWUFBWSxLQUF5QixPQUFPLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDO0lBS3JFLHVCQUF1QjtJQUN2QixJQUFJLGtCQUFrQixLQUFxQyxPQUFPLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBSTlILDBCQUEwQjtJQUMxQixJQUFJLHFCQUFxQixLQUFxQyxPQUFPLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFJbkssMkJBQTJCO0lBQzNCLElBQUksc0JBQXNCLEtBQXFDLE9BQU8sSUFBSSxDQUFDLG1CQUFtQixDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFhckwsWUFDVSxhQUE0QixFQUNkLG9CQUEyQyxFQUM5QyxpQkFBc0QsRUFDMUQsYUFBNkI7UUFFN0MsS0FBSyxFQUFFLENBQUM7UUFMQyxrQkFBYSxHQUFiLGFBQWEsQ0FBZTtRQUVBLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBb0I7UUE1QzFELGdCQUFXLEdBQUcsSUFBSSxVQUFVLEVBQVUsQ0FBQztRQUNoRCx3QkFBbUIsR0FBMEIsRUFBRSxDQUFDO1FBYWhELDhCQUF5QixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQStELENBQUMsQ0FBQztRQUN0SCw2QkFBd0IsR0FBRyxJQUFJLENBQUMseUJBQXlCLENBQUMsS0FBSyxDQUFDO1FBSWpFLG1DQUE4QixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQXNGLENBQUMsQ0FBQztRQUNsSixrQ0FBNkIsR0FBRyxJQUFJLENBQUMsOEJBQThCLENBQUMsS0FBSyxDQUFDO1FBSTNFLHNDQUFpQyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQXNGLENBQUMsQ0FBQztRQUNySixxQ0FBZ0MsR0FBRyxJQUFJLENBQUMsaUNBQWlDLENBQUMsS0FBSyxDQUFDO1FBS2pGLG9DQUErQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQTZCLENBQUMsQ0FBQztRQUMxRixtQ0FBOEIsR0FBcUMsSUFBSSxDQUFDLCtCQUErQixDQUFDLEtBQUssQ0FBQztRQUUvRyx1Q0FBa0MsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUF3QixDQUFDLENBQUM7UUFDeEYsc0NBQWlDLEdBQWdDLElBQUksQ0FBQyxrQ0FBa0MsQ0FBQyxLQUFLLENBQUM7UUFFaEgscUNBQWdDLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBd0QsQ0FBQyxDQUFDO1FBQ3RILG9DQUErQixHQUFnRSxJQUFJLENBQUMsZ0NBQWdDLENBQUMsS0FBSyxDQUFDO1FBWW5KLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsYUFBYSxDQUFDLFlBQVksQ0FBQyxZQUFZLEVBQUUsRUFBRSxJQUFJLEVBQUUsY0FBYyxFQUFFLEtBQUssRUFBRSxjQUFjLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFeEgsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLGlCQUFpQixDQUFDLGtCQUFrQixFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDMUksSUFBSSxDQUFDLG9CQUFvQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLG9CQUFvQixFQUFFLGFBQWEsQ0FBQyxTQUFTLElBQUksR0FBRyxhQUFhLENBQUMsRUFBRSxRQUFRLEVBQUUsT0FBTyxhQUFhLENBQUMsS0FBSyxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO1FBQzVQLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLHNCQUFzQixDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUV4RyxJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztJQUM1QixDQUFDO0lBRU8sbUJBQW1CO1FBQzFCLG1IQUFtSDtRQUNuSCxNQUFNLHVCQUF1QixHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsc0JBQXNCLElBQUksSUFBSSxDQUFDLHNCQUFzQixDQUFDLE1BQU0sS0FBSyxDQUFDLElBQUksSUFBSSxDQUFDLHNCQUFzQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQWlCLGNBQWMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBQ3hRLE1BQU0sS0FBSyxHQUFHLHVCQUF1QixDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxjQUFjLElBQUksSUFBSSxDQUFDLHNCQUFzQixDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxLQUFLLElBQUksRUFBRSxDQUFDO1FBQ3pQLElBQUksWUFBWSxHQUFZLEtBQUssQ0FBQztRQUNsQyxJQUFJLElBQUksQ0FBQyxNQUFNLEtBQUssS0FBSyxFQUFFLENBQUM7WUFDM0IsSUFBSSxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUM7WUFDcEIsWUFBWSxHQUFHLElBQUksQ0FBQztRQUNyQixDQUFDO1FBRUQsTUFBTSxJQUFJLEdBQUcsdUJBQXVCLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxDQUFDLEVBQUUsYUFBYSxJQUFJLGVBQWUsQ0FBQztRQUNsSSxJQUFJLFdBQVcsR0FBWSxLQUFLLENBQUM7UUFDakMsSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUM3QixJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQztZQUNsQixXQUFXLEdBQUcsSUFBSSxDQUFDO1FBQ3BCLENBQUM7UUFFRCxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLDJCQUEyQixFQUFFLEVBQUUsSUFBSSxJQUFJLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLDJCQUEyQixDQUFDLEVBQUUsMkJBQTJCLEVBQUUsRUFBRSxDQUFDO1FBQ2hMLElBQUksbUJBQW1CLEdBQVksS0FBSyxDQUFDO1FBQ3pDLElBQUksSUFBSSxDQUFDLGFBQWEsS0FBSyxZQUFZLEVBQUUsQ0FBQztZQUN6QyxJQUFJLENBQUMsYUFBYSxHQUFHLFlBQVksQ0FBQztZQUNsQyxtQkFBbUIsR0FBRyxJQUFJLENBQUM7UUFDNUIsQ0FBQztRQUVELElBQUksWUFBWSxJQUFJLFdBQVcsSUFBSSxtQkFBbUIsRUFBRSxDQUFDO1lBQ3hELElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLEVBQUUsWUFBWSxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsWUFBWSxFQUFFLG1CQUFtQixFQUFFLENBQUMsQ0FBQztRQUNwSCxDQUFDO0lBQ0YsQ0FBQztJQUVPLFdBQVcsQ0FBQyxJQUFpQztRQUNwRCxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUNyQixPQUFPLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLE9BQU8sQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzNELENBQUM7YUFBTSxJQUFJLFNBQVMsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUN4QyxPQUFPLFNBQVMsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLFNBQVMsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNqRixDQUFDO1FBQ0QsT0FBTyxJQUFJLEtBQUssSUFBSSxDQUFDLEtBQUssQ0FBQztJQUM1QixDQUFDO0lBRUQsU0FBUyxDQUFDLEVBQVU7UUFDbkIsTUFBTSxrQkFBa0IsR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7UUFDMUYsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUM7WUFDekIsTUFBTSxJQUFJLEtBQUssQ0FBQyxnQkFBZ0IsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUN2QyxDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUMsdUJBQXVCLENBQUMsa0JBQWtCLENBQUMsQ0FBQztJQUN6RCxDQUFDO0lBRUQsVUFBVSxDQUFDLEVBQVUsRUFBRSxPQUFnQjtRQUN0QyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDMUMsQ0FBQztJQUVPLGdCQUFnQixDQUFDLGVBQW1EO1FBQzNFLDZFQUE2RTtRQUM3RSxNQUFNLHlCQUF5QixHQUFHLFFBQVEsQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxPQUFPLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUM7YUFDMUYsR0FBRyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLHVCQUF1QixDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNyRCxNQUFNLE9BQU8sR0FBeUIsRUFBRSxDQUFDO1FBQ3pDLEtBQUssTUFBTSxFQUFFLGtCQUFrQixFQUFFLFlBQVksRUFBRSxJQUFJLHlCQUF5QixFQUFFLENBQUM7WUFDOUUsSUFBSSxJQUFJLENBQUMsa0NBQWtDLENBQUMsa0JBQWtCLEVBQUUsS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDeEUsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLGNBQWMsRUFBRSxrQkFBa0IsQ0FBQyxjQUFjLEVBQUUsS0FBSyxFQUFFLFlBQVksRUFBRSxDQUFDLENBQUM7WUFDMUYsQ0FBQztRQUNGLENBQUM7UUFDRCxJQUFJLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNwQixJQUFJLENBQUMsc0NBQXNDLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDdEQsQ0FBQztRQUVELDBFQUEwRTtRQUMxRSxNQUFNLEtBQUssR0FBOEIsRUFBRSxDQUFDO1FBQzVDLEtBQUssTUFBTSxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsSUFBSSxlQUFlLEVBQUUsQ0FBQztZQUMvQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQ2QsU0FBUztZQUNWLENBQUM7WUFDRCxNQUFNLG1CQUFtQixHQUFHLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUM3RCxJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztnQkFDMUIsU0FBUztZQUNWLENBQUM7WUFDRCxNQUFNLEVBQUUsa0JBQWtCLEVBQUUsWUFBWSxFQUFFLEdBQUcsbUJBQW1CLENBQUM7WUFDakUsSUFBSSxJQUFJLENBQUMsa0NBQWtDLENBQUMsa0JBQWtCLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQztnQkFDdkUsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssRUFBRSxZQUFZLEVBQUUsY0FBYyxFQUFFLGtCQUFrQixDQUFDLGNBQWMsRUFBRSxJQUFJLEVBQUUsa0JBQWtCLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxTQUFTLEVBQUUsQ0FBQyxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDO1lBQzlLLENBQUM7UUFDRixDQUFDO1FBQ0QsSUFBSSxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDbEIsSUFBSSxDQUFDLG9DQUFvQyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ2xELENBQUM7SUFDRixDQUFDO0lBRU8sa0NBQWtDLENBQUMsa0JBQXVDLEVBQUUsT0FBZ0I7UUFDbkcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLGNBQWMsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO1lBQzVELE9BQU8sS0FBSyxDQUFDO1FBQ2QsQ0FBQztRQUNELElBQUksSUFBSSxDQUFDLGlDQUFpQyxDQUFDLGtCQUFrQixDQUFDLEtBQUssT0FBTyxFQUFFLENBQUM7WUFDNUUsT0FBTyxLQUFLLENBQUM7UUFDZCxDQUFDO1FBRUQsb0JBQW9CO1FBQ3BCLElBQUksa0JBQWtCLENBQUMsY0FBYyxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ2pELGtCQUFrQixDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsR0FBRyxPQUFPLENBQUM7UUFDckQsQ0FBQzthQUFNLENBQUM7WUFDUCxrQkFBa0IsQ0FBQyxLQUFLLENBQUMsYUFBYSxHQUFHLE9BQU8sQ0FBQztZQUNqRCxJQUFJLE9BQU8sRUFBRSxDQUFDO2dCQUNiLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxnQkFBZ0Isa0JBQWtCLENBQUMsY0FBYyxDQUFDLEVBQUUscUJBQXFCLElBQUksQ0FBQyxhQUFhLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztZQUMxSCxDQUFDO1FBQ0YsQ0FBQztRQUVELDhDQUE4QztRQUM5QyxPQUFPLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLE9BQU8sQ0FBQztJQUNyRSxDQUFDO0lBRUQsV0FBVyxDQUFDLEVBQVU7UUFDckIsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDO0lBQzNELENBQUM7SUFFRCxZQUFZLENBQUMsRUFBVSxFQUFFLFNBQWtCO1FBQzFDLE1BQU0sRUFBRSxrQkFBa0IsRUFBRSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDN0MsSUFBSSxrQkFBa0IsQ0FBQyxLQUFLLENBQUMsU0FBUyxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQ3RELGtCQUFrQixDQUFDLEtBQUssQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDO1FBQ2hELENBQUM7UUFDRCxJQUFJLENBQUMsb0JBQW9CLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO0lBQ2hFLENBQUM7SUFFRCxPQUFPLENBQUMsRUFBVTtRQUNqQixPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQztJQUNwRCxDQUFDO0lBRUQsUUFBUSxDQUFDLFFBQWlEO1FBQ3pELEtBQUssTUFBTSxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxRQUFRLEVBQUUsQ0FBQztZQUNyQyxNQUFNLEVBQUUsa0JBQWtCLEVBQUUsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQzdDLElBQUksa0JBQWtCLENBQUMsS0FBSyxDQUFDLElBQUksS0FBSyxJQUFJLEVBQUUsQ0FBQztnQkFDNUMsa0JBQWtCLENBQUMsS0FBSyxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7WUFDdEMsQ0FBQztRQUNGLENBQUM7UUFDRCxJQUFJLENBQUMsb0JBQW9CLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO0lBQ2hFLENBQUM7SUFFRCxJQUFJLENBQUMsSUFBWSxFQUFFLEVBQVU7UUFDNUIsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsRUFBRSxLQUFLLElBQUksQ0FBQyxDQUFDO1FBQ3hGLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztRQUVwRixNQUFNLGtCQUFrQixHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUMvRCxNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUUzRCxJQUFJLENBQUMsSUFBSSxDQUFDLG1CQUFtQixFQUFFLFNBQVMsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUVuRCxLQUFLLElBQUksS0FBSyxHQUFHLENBQUMsRUFBRSxLQUFLLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsRUFBRSxDQUFDO1lBQ3RFLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztRQUNyRCxDQUFDO1FBRUQsSUFBSSxDQUFDLDZCQUE2QixDQUFDLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxjQUFjLEVBQUUsa0JBQWtCLENBQUMsY0FBYyxFQUFFLEVBQUUsRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLGNBQWMsRUFBRSxnQkFBZ0IsQ0FBQyxjQUFjLEVBQUUsQ0FBQyxDQUFDO0lBQ2xMLENBQUM7SUFFRCxHQUFHLENBQUMseUJBQXNEO1FBQ3pELE1BQU0sVUFBVSxHQUEwQixFQUFFLENBQUM7UUFDN0MsS0FBSyxNQUFNLHdCQUF3QixJQUFJLHlCQUF5QixFQUFFLENBQUM7WUFDbEUsTUFBTSxjQUFjLEdBQUcsd0JBQXdCLENBQUMsY0FBYyxDQUFDO1lBRS9ELElBQUksY0FBYyxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUN6QixLQUFLLE1BQU0sR0FBRyxJQUFJLGNBQWMsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQztvQkFDOUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQzNCLENBQUM7WUFDRixDQUFDO1lBRUQsSUFBSSxLQUFLLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDN0QsSUFBSSxLQUFLLEVBQUUsQ0FBQztnQkFDWCwwQkFBMEI7Z0JBQzFCLElBQUksY0FBYyxDQUFDLFNBQVMsRUFBRSxDQUFDO29CQUM5QixLQUFLLENBQUMsZ0JBQWdCLEdBQUcsaUJBQWlCLENBQUMsd0JBQXdCLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsaUJBQWlCLENBQUMsS0FBSyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFDLHdCQUF3QixDQUFDLE9BQU8sQ0FBQztnQkFDeE4sQ0FBQztxQkFBTSxDQUFDO29CQUNQLE1BQU0sU0FBUyxHQUFHLEtBQUssQ0FBQyxhQUFhLENBQUM7b0JBQ3RDLEtBQUssQ0FBQyxhQUFhLEdBQUcsaUJBQWlCLENBQUMsd0JBQXdCLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsaUJBQWlCLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsd0JBQXdCLENBQUMsT0FBTyxDQUFDO29CQUM5TSxJQUFJLEtBQUssQ0FBQyxhQUFhLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQzt3QkFDdkMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLGNBQWMsY0FBYyxDQUFDLEVBQUUscUJBQXFCLElBQUksQ0FBQyxhQUFhLENBQUMsRUFBRSxrQkFBa0IsRUFBRSxHQUFHLFNBQVMsRUFBRSxFQUFFLEdBQUcsY0FBYyxDQUFDLGFBQWEsRUFBRSxFQUFFLEdBQUcsd0JBQXdCLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQztvQkFDL00sQ0FBQztnQkFDRixDQUFDO2dCQUNELEtBQUssQ0FBQyxTQUFTLEdBQUcsaUJBQWlCLENBQUMsd0JBQXdCLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsaUJBQWlCLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyx3QkFBd0IsQ0FBQyxTQUFTLENBQUM7WUFDcE0sQ0FBQztpQkFBTSxDQUFDO2dCQUNQLEtBQUssR0FBRztvQkFDUCxNQUFNLEVBQUUsS0FBSztvQkFDYixhQUFhLEVBQUUsaUJBQWlCLENBQUMsd0JBQXdCLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsd0JBQXdCLENBQUMsT0FBTztvQkFDckksZ0JBQWdCLEVBQUUsaUJBQWlCLENBQUMsd0JBQXdCLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsd0JBQXdCLENBQUMsT0FBTztvQkFDeEksU0FBUyxFQUFFLGlCQUFpQixDQUFDLHdCQUF3QixDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsd0JBQXdCLENBQUMsU0FBUztpQkFDbEksQ0FBQztZQUNILENBQUM7WUFDRCxJQUFJLENBQUMsb0JBQW9CLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDeEQsS0FBSyxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsbUJBQW1CLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQy9FLFVBQVUsQ0FBQyxJQUFJLENBQUMsRUFBRSxjQUFjLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztRQUM1QyxDQUFDO1FBQ0QsSUFBSSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxHQUFHLFVBQVUsQ0FBQyxDQUFDO1FBQzdDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLHNCQUFzQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ3RFLElBQUksQ0FBQyw4QkFBOEIsQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLEVBQUUsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsY0FBYyxFQUFFLEVBQUUsRUFBRSxDQUFDLGNBQWMsQ0FBQyxFQUFFLE9BQU8sRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRXpILE1BQU0sZ0JBQWdCLEdBQW9FLEVBQUUsQ0FBQztRQUM3RixLQUFLLE1BQU0sa0JBQWtCLElBQUksVUFBVSxFQUFFLENBQUM7WUFDN0MsSUFBSSxrQkFBa0IsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQ3JDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxFQUFFLGtCQUFrQixFQUFFLE9BQU8sRUFBRSxJQUFJLENBQUMsdUJBQXVCLENBQUMsa0JBQWtCLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDMUcsQ0FBQztRQUNGLENBQUM7UUFDRCxJQUFJLGdCQUFnQixDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQzdCLElBQUksQ0FBQyxpQ0FBaUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLGtCQUFrQixFQUFFLEVBQUUsRUFBRSxDQUFDLGtCQUFrQixDQUFDLGNBQWMsQ0FBQyxFQUFFLE9BQU8sRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDNUosQ0FBQztRQUVELE1BQU0sdUJBQXVCLEdBQThCLEVBQUUsQ0FBQztRQUM5RCxLQUFLLE1BQU0sRUFBRSxrQkFBa0IsRUFBRSxPQUFPLEVBQUUsSUFBSSxnQkFBZ0IsRUFBRSxDQUFDO1lBQ2hFLElBQUksT0FBTyxJQUFJLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxrQkFBa0IsQ0FBQyxFQUFFLENBQUM7Z0JBQ2pFLE1BQU0sRUFBRSxZQUFZLEVBQUUsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFDekUsdUJBQXVCLENBQUMsSUFBSSxDQUFDLEVBQUUsS0FBSyxFQUFFLFlBQVksRUFBRSxjQUFjLEVBQUUsa0JBQWtCLENBQUMsY0FBYyxFQUFFLElBQUksRUFBRSxrQkFBa0IsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLFNBQVMsRUFBRSxDQUFDLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUM7WUFDaE0sQ0FBQztRQUNGLENBQUM7UUFDRCxJQUFJLENBQUMsb0NBQW9DLENBQUMsdUJBQXVCLENBQUMsQ0FBQztJQUNwRSxDQUFDO0lBRUQsTUFBTSxDQUFDLGVBQWtDO1FBQ3hDLE1BQU0sT0FBTyxHQUFzQixFQUFFLENBQUM7UUFDdEMsTUFBTSxZQUFZLEdBQTBCLEVBQUUsQ0FBQztRQUMvQyxNQUFNLHdCQUF3QixHQUFzQixFQUFFLENBQUM7UUFDdkQsTUFBTSx5QkFBeUIsR0FBeUIsRUFBRSxDQUFDO1FBRTNELEtBQUssTUFBTSxjQUFjLElBQUksZUFBZSxFQUFFLENBQUM7WUFDOUMsSUFBSSxjQUFjLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQ3pCLEtBQUssTUFBTSxHQUFHLElBQUksY0FBYyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDO29CQUM5QyxJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDOUIsQ0FBQztZQUNGLENBQUM7WUFDRCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxFQUFFLEtBQUssY0FBYyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ2pHLElBQUksS0FBSyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBQ2xCLE9BQU8sQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUM7Z0JBQzdCLE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUMzRCxJQUFJLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQztvQkFDckMsd0JBQXdCLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLGNBQWMsQ0FBQyxDQUFDO2dCQUNsRSxDQUFDO2dCQUNELElBQUksSUFBSSxDQUFDLHVCQUF1QixDQUFDLGtCQUFrQixDQUFDLEVBQUUsQ0FBQztvQkFDdEQsTUFBTSxFQUFFLFlBQVksRUFBRSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsY0FBYyxDQUFDLEVBQUUsQ0FBQyxDQUFDO29CQUN6RSx5QkFBeUIsQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLEVBQUUsWUFBWSxFQUFFLGNBQWMsRUFBRSxrQkFBa0IsQ0FBQyxjQUFjLEVBQUUsQ0FBQyxDQUFDO2dCQUM1RyxDQUFDO2dCQUNELFlBQVksQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQztZQUN2QyxDQUFDO1FBQ0YsQ0FBQztRQUVELGVBQWU7UUFDZixZQUFZLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFekcsSUFBSSxDQUFDLHNDQUFzQyxDQUFDLHlCQUF5QixDQUFDLENBQUM7UUFDdkUsSUFBSSx3QkFBd0IsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNyQyxJQUFJLENBQUMsaUNBQWlDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNqRyxDQUFDO1FBQ0QsSUFBSSxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDcEIsSUFBSSxDQUFDLDhCQUE4QixDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQztRQUNsRSxDQUFDO0lBQ0YsQ0FBQztJQUVPLGtCQUFrQjtRQUN6QixNQUFNLGdCQUFnQixHQUFnRSxFQUFFLENBQUM7UUFDekYsTUFBTSxrQkFBa0IsR0FBMEIsRUFBRSxDQUFDO1FBRXJELEtBQUssTUFBTSxJQUFJLElBQUksSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUM7WUFDN0MsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUM7WUFDcEMsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDdEYsSUFBSSxTQUFTLEtBQUssUUFBUSxFQUFFLENBQUM7Z0JBQzVCLElBQUksUUFBUSxFQUFFLENBQUM7b0JBQ2QsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxFQUFFLGlCQUFpQixFQUFFLElBQUksQ0FBQyxpQ0FBaUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBQ2xHLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQy9CLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUVELE1BQU0seUJBQXlCLEdBQXlCLEVBQUUsQ0FBQztRQUMzRCxLQUFLLE1BQU0sSUFBSSxJQUFJLGtCQUFrQixFQUFFLENBQUM7WUFDdkMsSUFBSSxJQUFJLENBQUMsdUJBQXVCLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztnQkFDeEMsTUFBTSxFQUFFLFlBQVksRUFBRSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFDM0QseUJBQXlCLENBQUMsSUFBSSxDQUFDLEVBQUUsS0FBSyxFQUFFLFlBQVksRUFBRSxjQUFjLEVBQUUsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDLENBQUM7WUFDOUYsQ0FBQztRQUNGLENBQUM7UUFFRCxtQkFBbUI7UUFDbkIsa0JBQWtCLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFDLENBQUM7UUFDOUQsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLENBQUM7UUFFakUsSUFBSSxDQUFDLHNDQUFzQyxDQUFDLHlCQUF5QixDQUFDLENBQUM7UUFFdkUsSUFBSSxnQkFBZ0IsQ0FBQyxNQUFNLElBQUksa0JBQWtCLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDMUQsSUFBSSxDQUFDLGlDQUFpQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsRUFBRSxPQUFPLEVBQUUsa0JBQWtCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ2pMLENBQUM7UUFFRCxNQUFNLHVCQUF1QixHQUE4QixFQUFFLENBQUM7UUFDOUQsS0FBSyxNQUFNLEVBQUUsSUFBSSxFQUFFLGlCQUFpQixFQUFFLElBQUksZ0JBQWdCLEVBQUUsQ0FBQztZQUM1RCxJQUFJLGlCQUFpQixJQUFJLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO2dCQUM3RCxNQUFNLEVBQUUsWUFBWSxFQUFFLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLEVBQUUsQ0FBQyxDQUFDO2dCQUMzRCx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLEVBQUUsWUFBWSxFQUFFLGNBQWMsRUFBRSxJQUFJLENBQUMsY0FBYyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxTQUFTLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQztZQUN0SixDQUFDO1FBQ0YsQ0FBQztRQUNELElBQUksQ0FBQyxvQ0FBb0MsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO0lBQ3BFLENBQUM7SUFFTyxvQ0FBb0MsQ0FBQyxLQUFnQztRQUM1RSxJQUFJLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNsQixJQUFJLENBQUMsK0JBQStCLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1lBQ25GLElBQUksQ0FBQyxXQUFXLENBQUMsZUFBZSxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQzlHLENBQUM7SUFDRixDQUFDO0lBRU8sc0NBQXNDLENBQUMsT0FBNkI7UUFDM0UsSUFBSSxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDcEIsSUFBSSxDQUFDLGtDQUFrQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztZQUN4RixJQUFJLENBQUMsV0FBVyxDQUFDLGlCQUFpQixPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ3BILENBQUM7SUFDRixDQUFDO0lBRU8sNkJBQTZCLENBQUMsSUFBd0IsRUFBRSxFQUFzQjtRQUNyRixJQUFJLENBQUMsZ0NBQWdDLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDekQsSUFBSSxDQUFDLFdBQVcsQ0FBQyxjQUFjLElBQUksQ0FBQyxjQUFjLENBQUMsRUFBRSxPQUFPLEVBQUUsQ0FBQyxjQUFjLENBQUMsRUFBRSxPQUFPLElBQUksQ0FBQyxhQUFhLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUNqSCxDQUFDO0lBRU8sV0FBVyxDQUFDLE1BQWM7UUFDakMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQy9CLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUM7UUFDL0QsSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUM7SUFDNUIsQ0FBQztJQUVPLHVCQUF1QixDQUFDLGtCQUF1QztRQUN0RSxJQUFJLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ3RDLE9BQU8sS0FBSyxDQUFDO1FBQ2QsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLGlDQUFpQyxDQUFDLGtCQUFrQixDQUFDLENBQUM7SUFDbkUsQ0FBQztJQUVPLGlDQUFpQyxDQUFDLGtCQUF1QztRQUNoRixJQUFJLGtCQUFrQixDQUFDLGNBQWMsQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNqRCxPQUFPLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLENBQUM7UUFDcEQsQ0FBQztRQUNELE9BQU8sQ0FBQyxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUM7SUFDakQsQ0FBQztJQUVPLElBQUksQ0FBQyxFQUFVO1FBQ3RCLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNoRCxJQUFJLE1BQU0sRUFBRSxDQUFDO1lBQ1osT0FBTyxNQUFNLENBQUM7UUFDZixDQUFDO1FBQ0QsTUFBTSxJQUFJLEtBQUssQ0FBQyxtQkFBbUIsRUFBRSxZQUFZLENBQUMsQ0FBQztJQUNwRCxDQUFDO0lBRU8sdUJBQXVCLENBQUMsRUFBVTtRQUN6QyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxZQUFZLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDNUUsTUFBTSxrQkFBa0IsR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDdkQsSUFBSSxrQkFBa0IsQ0FBQyxjQUFjLENBQUMsRUFBRSxLQUFLLEVBQUUsRUFBRSxDQUFDO2dCQUNqRCxPQUFPLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxZQUFZLEVBQUUsa0JBQWtCLEVBQUUsa0JBQWtCLEVBQUUsQ0FBQztZQUMzRSxDQUFDO1lBQ0QsSUFBSSxJQUFJLENBQUMsdUJBQXVCLENBQUMsa0JBQWtCLENBQUMsRUFBRSxDQUFDO2dCQUN0RCxZQUFZLEVBQUUsQ0FBQztZQUNoQixDQUFDO1FBQ0YsQ0FBQztRQUNELE9BQU8sU0FBUyxDQUFDO0lBQ2xCLENBQUM7SUFFTyxzQkFBc0IsQ0FBQyxDQUFzQixFQUFFLENBQXNCO1FBQzVFLElBQUksQ0FBQyxDQUFDLGNBQWMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDLGNBQWMsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNqRCxPQUFPLENBQUMsQ0FBQztRQUNWLENBQUM7UUFFRCxPQUFPLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxjQUFjLEVBQUUsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDO0lBQ3RILENBQUM7SUFFTyxZQUFZLENBQUMsa0JBQXVDO1FBQzNELE1BQU0sU0FBUyxHQUFHLE9BQU8sa0JBQWtCLENBQUMsS0FBSyxDQUFDLEtBQUssS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLGtCQUFrQixDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUM7UUFDaEosT0FBTyxPQUFPLFNBQVMsS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQztJQUNyRSxDQUFDO0lBRU8sbUJBQW1CLENBQUMsQ0FBa0IsRUFBRSxDQUFrQjtRQUNqRSxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUMxQixPQUFPLENBQUMsQ0FBQztRQUNWLENBQUM7UUFFRCxJQUFJLENBQUMsQ0FBQyxLQUFLLEtBQUssQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ3pCLE9BQU8sQ0FBQyxDQUFDO1FBQ1YsQ0FBQztRQUVELE9BQU8sQ0FBQyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ25DLENBQUM7Q0FDRCxDQUFBO0FBbmJZLGtCQUFrQjtJQTZDNUIsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLGtCQUFrQixDQUFBO0lBQ2xCLFdBQUEsY0FBYyxDQUFBO0dBL0NKLGtCQUFrQixDQW1iOUIifQ==