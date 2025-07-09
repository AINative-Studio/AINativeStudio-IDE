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
var EditorParts_1;
import { localize } from '../../../../nls.js';
import { IEditorGroupsService } from '../../../services/editor/common/editorGroupsService.js';
import { Emitter } from '../../../../base/common/event.js';
import { DisposableMap, DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { MainEditorPart } from './editorPart.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { distinct } from '../../../../base/common/arrays.js';
import { AuxiliaryEditorPart } from './auxiliaryEditorPart.js';
import { MultiWindowParts } from '../../part.js';
import { DeferredPromise } from '../../../../base/common/async.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IAuxiliaryWindowService } from '../../../services/auxiliaryWindow/browser/auxiliaryWindowService.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { isHTMLElement } from '../../../../base/browser/dom.js';
import { ServiceCollection } from '../../../../platform/instantiation/common/serviceCollection.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
let EditorParts = class EditorParts extends MultiWindowParts {
    static { EditorParts_1 = this; }
    constructor(instantiationService, storageService, themeService, auxiliaryWindowService, contextKeyService) {
        super('workbench.editorParts', themeService, storageService);
        this.instantiationService = instantiationService;
        this.storageService = storageService;
        this.auxiliaryWindowService = auxiliaryWindowService;
        this.contextKeyService = contextKeyService;
        //#region Scoped Instantiation Services
        this.mapPartToInstantiationService = new Map();
        //#endregion
        //#region Auxiliary Editor Parts
        this._onDidCreateAuxiliaryEditorPart = this._register(new Emitter());
        this.onDidCreateAuxiliaryEditorPart = this._onDidCreateAuxiliaryEditorPart.event;
        this.workspaceMemento = this.getMemento(1 /* StorageScope.WORKSPACE */, 0 /* StorageTarget.USER */);
        this._isReady = false;
        this.whenReadyPromise = new DeferredPromise();
        this.whenReady = this.whenReadyPromise.p;
        this.whenRestoredPromise = new DeferredPromise();
        this.whenRestored = this.whenRestoredPromise.p;
        this.editorWorkingSets = (() => {
            const workingSetsRaw = this.storageService.get(EditorParts_1.EDITOR_WORKING_SETS_STORAGE_KEY, 1 /* StorageScope.WORKSPACE */);
            if (workingSetsRaw) {
                return JSON.parse(workingSetsRaw);
            }
            return [];
        })();
        //#endregion
        //#region Events
        this._onDidActiveGroupChange = this._register(new Emitter());
        this.onDidChangeActiveGroup = this._onDidActiveGroupChange.event;
        this._onDidAddGroup = this._register(new Emitter());
        this.onDidAddGroup = this._onDidAddGroup.event;
        this._onDidRemoveGroup = this._register(new Emitter());
        this.onDidRemoveGroup = this._onDidRemoveGroup.event;
        this._onDidMoveGroup = this._register(new Emitter());
        this.onDidMoveGroup = this._onDidMoveGroup.event;
        this._onDidActivateGroup = this._register(new Emitter());
        this.onDidActivateGroup = this._onDidActivateGroup.event;
        this._onDidChangeGroupIndex = this._register(new Emitter());
        this.onDidChangeGroupIndex = this._onDidChangeGroupIndex.event;
        this._onDidChangeGroupLocked = this._register(new Emitter());
        this.onDidChangeGroupLocked = this._onDidChangeGroupLocked.event;
        this._onDidChangeGroupMaximized = this._register(new Emitter());
        this.onDidChangeGroupMaximized = this._onDidChangeGroupMaximized.event;
        //#endregion
        //#region Editor Group Context Key Handling
        this.globalContextKeys = new Map();
        this.scopedContextKeys = new Map();
        this.contextKeyProviders = new Map();
        this.registeredContextKeys = new Map();
        this.contextKeyProviderDisposables = this._register(new DisposableMap());
        this.mainPart = this._register(this.createMainEditorPart());
        this._register(this.registerPart(this.mainPart));
        this.mostRecentActiveParts = [this.mainPart];
        this.restoreParts();
        this.registerListeners();
    }
    registerListeners() {
        this._register(this.onDidChangeMementoValue(1 /* StorageScope.WORKSPACE */, this._store)(e => this.onDidChangeMementoState(e)));
        this.whenReady.then(() => this.registerGroupsContextKeyListeners());
    }
    createMainEditorPart() {
        return this.instantiationService.createInstance(MainEditorPart, this);
    }
    getScopedInstantiationService(part) {
        if (part === this.mainPart) {
            if (!this.mapPartToInstantiationService.has(part.windowId)) {
                this.instantiationService.invokeFunction(accessor => {
                    const editorService = accessor.get(IEditorService); // using `invokeFunction` to get hold of `IEditorService` lazily
                    this.mapPartToInstantiationService.set(part.windowId, this._register(this.instantiationService.createChild(new ServiceCollection([IEditorService, editorService.createScoped('main', this._store)]))));
                });
            }
        }
        return this.mapPartToInstantiationService.get(part.windowId) ?? this.instantiationService;
    }
    async createAuxiliaryEditorPart(options) {
        const { part, instantiationService, disposables } = await this.instantiationService.createInstance(AuxiliaryEditorPart, this).create(this.getGroupsLabel(this._parts.size), options);
        // Keep instantiation service
        this.mapPartToInstantiationService.set(part.windowId, instantiationService);
        disposables.add(toDisposable(() => this.mapPartToInstantiationService.delete(part.windowId)));
        // Events
        this._onDidAddGroup.fire(part.activeGroup);
        this._onDidCreateAuxiliaryEditorPart.fire(part);
        return part;
    }
    //#endregion
    //#region Registration
    registerPart(part) {
        const disposables = this._register(new DisposableStore());
        disposables.add(super.registerPart(part));
        this.registerEditorPartListeners(part, disposables);
        return disposables;
    }
    unregisterPart(part) {
        super.unregisterPart(part);
        // Notify all parts about a groups label change
        // given it is computed based on the index
        this.parts.forEach((part, index) => {
            if (part === this.mainPart) {
                return;
            }
            part.notifyGroupsLabelChange(this.getGroupsLabel(index));
        });
    }
    registerEditorPartListeners(part, disposables) {
        disposables.add(part.onDidFocus(() => {
            this.doUpdateMostRecentActive(part, true);
            if (this._parts.size > 1) {
                this._onDidActiveGroupChange.fire(this.activeGroup); // this can only happen when we have more than 1 editor part
            }
        }));
        disposables.add(toDisposable(() => this.doUpdateMostRecentActive(part)));
        disposables.add(part.onDidChangeActiveGroup(group => this._onDidActiveGroupChange.fire(group)));
        disposables.add(part.onDidAddGroup(group => this._onDidAddGroup.fire(group)));
        disposables.add(part.onDidRemoveGroup(group => this._onDidRemoveGroup.fire(group)));
        disposables.add(part.onDidMoveGroup(group => this._onDidMoveGroup.fire(group)));
        disposables.add(part.onDidActivateGroup(group => this._onDidActivateGroup.fire(group)));
        disposables.add(part.onDidChangeGroupMaximized(maximized => this._onDidChangeGroupMaximized.fire(maximized)));
        disposables.add(part.onDidChangeGroupIndex(group => this._onDidChangeGroupIndex.fire(group)));
        disposables.add(part.onDidChangeGroupLocked(group => this._onDidChangeGroupLocked.fire(group)));
    }
    doUpdateMostRecentActive(part, makeMostRecentlyActive) {
        const index = this.mostRecentActiveParts.indexOf(part);
        // Remove from MRU list
        if (index !== -1) {
            this.mostRecentActiveParts.splice(index, 1);
        }
        // Add to front as needed
        if (makeMostRecentlyActive) {
            this.mostRecentActiveParts.unshift(part);
        }
    }
    getGroupsLabel(index) {
        return localize('groupLabel', "Window {0}", index + 1);
    }
    getPart(groupOrElement) {
        if (this._parts.size > 1) {
            if (isHTMLElement(groupOrElement)) {
                const element = groupOrElement;
                return this.getPartByDocument(element.ownerDocument);
            }
            else {
                const group = groupOrElement;
                let id;
                if (typeof group === 'number') {
                    id = group;
                }
                else {
                    id = group.id;
                }
                for (const part of this._parts) {
                    if (part.hasGroup(id)) {
                        return part;
                    }
                }
            }
        }
        return this.mainPart;
    }
    //#endregion
    //#region Lifecycle / State
    static { this.EDITOR_PARTS_UI_STATE_STORAGE_KEY = 'editorparts.state'; }
    get isReady() { return this._isReady; }
    async restoreParts() {
        // Join on the main part being ready to pick
        // the right moment to begin restoring.
        // The main part is automatically being created
        // as part of the overall startup process.
        await this.mainPart.whenReady;
        // Only attempt to restore auxiliary editor parts
        // when the main part did restore. It is possible
        // that restoring was not attempted because specific
        // editors were opened.
        if (this.mainPart.willRestoreState) {
            const state = this.loadState();
            if (state) {
                await this.restoreState(state);
            }
        }
        const mostRecentActivePart = this.mostRecentActiveParts.at(0);
        mostRecentActivePart?.activeGroup.focus();
        this._isReady = true;
        this.whenReadyPromise.complete();
        // Await restored
        await Promise.allSettled(this.parts.map(part => part.whenRestored));
        this.whenRestoredPromise.complete();
    }
    loadState() {
        return this.workspaceMemento[EditorParts_1.EDITOR_PARTS_UI_STATE_STORAGE_KEY];
    }
    saveState() {
        const state = this.createState();
        if (state.auxiliary.length === 0) {
            delete this.workspaceMemento[EditorParts_1.EDITOR_PARTS_UI_STATE_STORAGE_KEY];
        }
        else {
            this.workspaceMemento[EditorParts_1.EDITOR_PARTS_UI_STATE_STORAGE_KEY] = state;
        }
    }
    createState() {
        return {
            auxiliary: this.parts.filter(part => part !== this.mainPart).map(part => {
                const auxiliaryWindow = this.auxiliaryWindowService.getWindow(part.windowId);
                return {
                    state: part.createState(),
                    ...auxiliaryWindow?.createState()
                };
            }),
            mru: this.mostRecentActiveParts.map(part => this.parts.indexOf(part))
        };
    }
    async restoreState(state) {
        if (state.auxiliary.length) {
            const auxiliaryEditorPartPromises = [];
            // Create auxiliary editor parts
            for (const auxiliaryEditorPartState of state.auxiliary) {
                auxiliaryEditorPartPromises.push(this.createAuxiliaryEditorPart(auxiliaryEditorPartState));
            }
            // Await creation
            await Promise.allSettled(auxiliaryEditorPartPromises);
            // Update MRU list
            if (state.mru.length === this.parts.length) {
                this.mostRecentActiveParts = state.mru.map(index => this.parts[index]);
            }
            else {
                this.mostRecentActiveParts = [...this.parts];
            }
            // Await ready
            await Promise.allSettled(this.parts.map(part => part.whenReady));
        }
    }
    get hasRestorableState() {
        return this.parts.some(part => part.hasRestorableState);
    }
    onDidChangeMementoState(e) {
        if (e.external && e.scope === 1 /* StorageScope.WORKSPACE */) {
            this.reloadMemento(e.scope);
            const state = this.loadState();
            if (state) {
                this.applyState(state);
            }
        }
    }
    async applyState(state) {
        // Before closing windows, try to close as many editors as
        // possible, but skip over those that would trigger a dialog
        // (for example when being dirty). This is to be able to have
        // them merge into the main part.
        for (const part of this.parts) {
            if (part === this.mainPart) {
                continue; // main part takes care on its own
            }
            for (const group of part.getGroups(1 /* GroupsOrder.MOST_RECENTLY_ACTIVE */)) {
                await group.closeAllEditors({ excludeConfirming: true });
            }
            const closed = part.close(); // will move remaining editors to main part
            if (!closed) {
                return false; // this indicates that closing was vetoed
            }
        }
        // Restore auxiliary state unless we are in an empty state
        if (state !== 'empty') {
            await this.restoreState(state);
        }
        return true;
    }
    //#endregion
    //#region Working Sets
    static { this.EDITOR_WORKING_SETS_STORAGE_KEY = 'editor.workingSets'; }
    saveWorkingSet(name) {
        const workingSet = {
            id: generateUuid(),
            name,
            main: this.mainPart.createState(),
            auxiliary: this.createState()
        };
        this.editorWorkingSets.push(workingSet);
        this.saveWorkingSets();
        return {
            id: workingSet.id,
            name: workingSet.name
        };
    }
    getWorkingSets() {
        return this.editorWorkingSets.map(workingSet => ({ id: workingSet.id, name: workingSet.name }));
    }
    deleteWorkingSet(workingSet) {
        const index = this.indexOfWorkingSet(workingSet);
        if (typeof index === 'number') {
            this.editorWorkingSets.splice(index, 1);
            this.saveWorkingSets();
        }
    }
    async applyWorkingSet(workingSet, options) {
        let workingSetState;
        if (workingSet === 'empty') {
            workingSetState = 'empty';
        }
        else {
            workingSetState = this.editorWorkingSets[this.indexOfWorkingSet(workingSet) ?? -1];
        }
        if (!workingSetState) {
            return false;
        }
        // Apply state: begin with auxiliary windows first because it helps to keep
        // editors around that need confirmation by moving them into the main part.
        // Also, in rare cases, the auxiliary part may not be able to apply the state
        // for certain editors that cannot move to the main part.
        const applied = await this.applyState(workingSetState === 'empty' ? workingSetState : workingSetState.auxiliary);
        if (!applied) {
            return false;
        }
        await this.mainPart.applyState(workingSetState === 'empty' ? workingSetState : workingSetState.main, options);
        // Restore Focus unless instructed otherwise
        if (!options?.preserveFocus) {
            const mostRecentActivePart = this.mostRecentActiveParts.at(0);
            if (mostRecentActivePart) {
                await mostRecentActivePart.whenReady;
                mostRecentActivePart.activeGroup.focus();
            }
        }
        return true;
    }
    indexOfWorkingSet(workingSet) {
        for (let i = 0; i < this.editorWorkingSets.length; i++) {
            if (this.editorWorkingSets[i].id === workingSet.id) {
                return i;
            }
        }
        return undefined;
    }
    saveWorkingSets() {
        this.storageService.store(EditorParts_1.EDITOR_WORKING_SETS_STORAGE_KEY, JSON.stringify(this.editorWorkingSets), 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
    }
    //#endregion
    //#region Group Management
    get activeGroup() {
        return this.activePart.activeGroup;
    }
    get sideGroup() {
        return this.activePart.sideGroup;
    }
    get groups() {
        return this.getGroups();
    }
    get count() {
        return this.groups.length;
    }
    getGroups(order = 0 /* GroupsOrder.CREATION_TIME */) {
        if (this._parts.size > 1) {
            let parts;
            switch (order) {
                case 2 /* GroupsOrder.GRID_APPEARANCE */: // we currently do not have a way to compute by appearance over multiple windows
                case 0 /* GroupsOrder.CREATION_TIME */:
                    parts = this.parts;
                    break;
                case 1 /* GroupsOrder.MOST_RECENTLY_ACTIVE */:
                    parts = distinct([...this.mostRecentActiveParts, ...this.parts]); // always ensure all parts are included
                    break;
            }
            return parts.map(part => part.getGroups(order)).flat();
        }
        return this.mainPart.getGroups(order);
    }
    getGroup(identifier) {
        if (this._parts.size > 1) {
            for (const part of this._parts) {
                const group = part.getGroup(identifier);
                if (group) {
                    return group;
                }
            }
        }
        return this.mainPart.getGroup(identifier);
    }
    assertGroupView(group) {
        let groupView;
        if (typeof group === 'number') {
            groupView = this.getGroup(group);
        }
        else {
            groupView = group;
        }
        if (!groupView) {
            throw new Error('Invalid editor group provided!');
        }
        return groupView;
    }
    activateGroup(group) {
        return this.getPart(group).activateGroup(group);
    }
    getSize(group) {
        return this.getPart(group).getSize(group);
    }
    setSize(group, size) {
        this.getPart(group).setSize(group, size);
    }
    arrangeGroups(arrangement, group = this.activePart.activeGroup) {
        this.getPart(group).arrangeGroups(arrangement, group);
    }
    toggleMaximizeGroup(group = this.activePart.activeGroup) {
        this.getPart(group).toggleMaximizeGroup(group);
    }
    toggleExpandGroup(group = this.activePart.activeGroup) {
        this.getPart(group).toggleExpandGroup(group);
    }
    restoreGroup(group) {
        return this.getPart(group).restoreGroup(group);
    }
    applyLayout(layout) {
        this.activePart.applyLayout(layout);
    }
    getLayout() {
        return this.activePart.getLayout();
    }
    get orientation() {
        return this.activePart.orientation;
    }
    setGroupOrientation(orientation) {
        this.activePart.setGroupOrientation(orientation);
    }
    findGroup(scope, source = this.activeGroup, wrap) {
        const sourcePart = this.getPart(source);
        if (this._parts.size > 1) {
            const groups = this.getGroups(2 /* GroupsOrder.GRID_APPEARANCE */);
            // Ensure that FIRST/LAST dispatches globally over all parts
            if (scope.location === 0 /* GroupLocation.FIRST */ || scope.location === 1 /* GroupLocation.LAST */) {
                return scope.location === 0 /* GroupLocation.FIRST */ ? groups[0] : groups[groups.length - 1];
            }
            // Try to find in target part first without wrapping
            const group = sourcePart.findGroup(scope, source, false);
            if (group) {
                return group;
            }
            // Ensure that NEXT/PREVIOUS dispatches globally over all parts
            if (scope.location === 2 /* GroupLocation.NEXT */ || scope.location === 3 /* GroupLocation.PREVIOUS */) {
                const sourceGroup = this.assertGroupView(source);
                const index = groups.indexOf(sourceGroup);
                if (scope.location === 2 /* GroupLocation.NEXT */) {
                    let nextGroup = groups[index + 1];
                    if (!nextGroup && wrap) {
                        nextGroup = groups[0];
                    }
                    return nextGroup;
                }
                else {
                    let previousGroup = groups[index - 1];
                    if (!previousGroup && wrap) {
                        previousGroup = groups[groups.length - 1];
                    }
                    return previousGroup;
                }
            }
        }
        return sourcePart.findGroup(scope, source, wrap);
    }
    addGroup(location, direction) {
        return this.getPart(location).addGroup(location, direction);
    }
    removeGroup(group) {
        this.getPart(group).removeGroup(group);
    }
    moveGroup(group, location, direction) {
        return this.getPart(group).moveGroup(group, location, direction);
    }
    mergeGroup(group, target, options) {
        return this.getPart(group).mergeGroup(group, target, options);
    }
    mergeAllGroups(target, options) {
        return this.activePart.mergeAllGroups(target, options);
    }
    copyGroup(group, location, direction) {
        return this.getPart(group).copyGroup(group, location, direction);
    }
    createEditorDropTarget(container, delegate) {
        return this.getPart(container).createEditorDropTarget(container, delegate);
    }
    registerGroupsContextKeyListeners() {
        this._register(this.onDidChangeActiveGroup(() => this.updateGlobalContextKeys()));
        this.groups.forEach(group => this.registerGroupContextKeyProvidersListeners(group));
        this._register(this.onDidAddGroup(group => this.registerGroupContextKeyProvidersListeners(group)));
        this._register(this.onDidRemoveGroup(group => {
            this.scopedContextKeys.delete(group.id);
            this.registeredContextKeys.delete(group.id);
            this.contextKeyProviderDisposables.deleteAndDispose(group.id);
        }));
    }
    updateGlobalContextKeys() {
        const activeGroupScopedContextKeys = this.scopedContextKeys.get(this.activeGroup.id);
        if (!activeGroupScopedContextKeys) {
            return;
        }
        for (const [key, globalContextKey] of this.globalContextKeys) {
            const scopedContextKey = activeGroupScopedContextKeys.get(key);
            if (scopedContextKey) {
                globalContextKey.set(scopedContextKey.get());
            }
            else {
                globalContextKey.reset();
            }
        }
    }
    bind(contextKey, group) {
        // Ensure we only bind to the same context key once globaly
        let globalContextKey = this.globalContextKeys.get(contextKey.key);
        if (!globalContextKey) {
            globalContextKey = contextKey.bindTo(this.contextKeyService);
            this.globalContextKeys.set(contextKey.key, globalContextKey);
        }
        // Ensure we only bind to the same context key once per group
        let groupScopedContextKeys = this.scopedContextKeys.get(group.id);
        if (!groupScopedContextKeys) {
            groupScopedContextKeys = new Map();
            this.scopedContextKeys.set(group.id, groupScopedContextKeys);
        }
        let scopedContextKey = groupScopedContextKeys.get(contextKey.key);
        if (!scopedContextKey) {
            scopedContextKey = contextKey.bindTo(group.scopedContextKeyService);
            groupScopedContextKeys.set(contextKey.key, scopedContextKey);
        }
        const that = this;
        return {
            get() {
                return scopedContextKey.get();
            },
            set(value) {
                if (that.activeGroup === group) {
                    globalContextKey.set(value);
                }
                scopedContextKey.set(value);
            },
            reset() {
                if (that.activeGroup === group) {
                    globalContextKey.reset();
                }
                scopedContextKey.reset();
            },
        };
    }
    registerContextKeyProvider(provider) {
        if (this.contextKeyProviders.has(provider.contextKey.key) || this.globalContextKeys.has(provider.contextKey.key)) {
            throw new Error(`A context key provider for key ${provider.contextKey.key} already exists.`);
        }
        this.contextKeyProviders.set(provider.contextKey.key, provider);
        const setContextKeyForGroups = () => {
            for (const group of this.groups) {
                this.updateRegisteredContextKey(group, provider);
            }
        };
        // Run initially and on change
        setContextKeyForGroups();
        const onDidChange = provider.onDidChange?.(() => setContextKeyForGroups());
        return toDisposable(() => {
            onDidChange?.dispose();
            this.globalContextKeys.delete(provider.contextKey.key);
            this.scopedContextKeys.forEach(scopedContextKeys => scopedContextKeys.delete(provider.contextKey.key));
            this.contextKeyProviders.delete(provider.contextKey.key);
            this.registeredContextKeys.forEach(registeredContextKeys => registeredContextKeys.delete(provider.contextKey.key));
        });
    }
    registerGroupContextKeyProvidersListeners(group) {
        // Update context keys from providers for the group when its active editor changes
        const disposable = group.onDidActiveEditorChange(() => {
            for (const contextKeyProvider of this.contextKeyProviders.values()) {
                this.updateRegisteredContextKey(group, contextKeyProvider);
            }
        });
        this.contextKeyProviderDisposables.set(group.id, disposable);
    }
    updateRegisteredContextKey(group, provider) {
        // Get the group scoped context keys for the provider
        // If the providers context key has not yet been bound
        // to the group, do so now.
        let groupRegisteredContextKeys = this.registeredContextKeys.get(group.id);
        if (!groupRegisteredContextKeys) {
            groupRegisteredContextKeys = new Map();
            this.registeredContextKeys.set(group.id, groupRegisteredContextKeys);
        }
        let scopedRegisteredContextKey = groupRegisteredContextKeys.get(provider.contextKey.key);
        if (!scopedRegisteredContextKey) {
            scopedRegisteredContextKey = this.bind(provider.contextKey, group);
            groupRegisteredContextKeys.set(provider.contextKey.key, scopedRegisteredContextKey);
        }
        // Set the context key value for the group context
        scopedRegisteredContextKey.set(provider.getGroupContextKeyValue(group));
    }
    //#endregion
    //#region Main Editor Part Only
    get partOptions() { return this.mainPart.partOptions; }
    get onDidChangeEditorPartOptions() { return this.mainPart.onDidChangeEditorPartOptions; }
};
EditorParts = EditorParts_1 = __decorate([
    __param(0, IInstantiationService),
    __param(1, IStorageService),
    __param(2, IThemeService),
    __param(3, IAuxiliaryWindowService),
    __param(4, IContextKeyService)
], EditorParts);
export { EditorParts };
registerSingleton(IEditorGroupsService, EditorParts, 0 /* InstantiationType.Eager */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yUGFydHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2Jyb3dzZXIvcGFydHMvZWRpdG9yL2VkaXRvclBhcnRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUF1TCxvQkFBb0IsRUFBbUgsTUFBTSx3REFBd0QsQ0FBQztBQUNwWSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDM0QsT0FBTyxFQUFFLGFBQWEsRUFBRSxlQUFlLEVBQWUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFakgsT0FBTyxFQUFrQyxjQUFjLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUVqRixPQUFPLEVBQXFCLGlCQUFpQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDL0csT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxtQkFBbUIsRUFBbUMsTUFBTSwwQkFBMEIsQ0FBQztBQUNoRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFDakQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxlQUFlLEVBQXlELE1BQU0sZ0RBQWdELENBQUM7QUFDeEksT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ2xGLE9BQU8sRUFBK0IsdUJBQXVCLEVBQUUsTUFBTSxxRUFBcUUsQ0FBQztBQUMzSSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0saUNB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