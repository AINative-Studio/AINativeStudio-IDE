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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yUGFydHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYnJvd3Nlci9wYXJ0cy9lZGl0b3IvZWRpdG9yUGFydHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQXVMLG9CQUFvQixFQUFtSCxNQUFNLHdEQUF3RCxDQUFDO0FBQ3BZLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUMzRCxPQUFPLEVBQUUsYUFBYSxFQUFFLGVBQWUsRUFBZSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUVqSCxPQUFPLEVBQWtDLGNBQWMsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBRWpGLE9BQU8sRUFBcUIsaUJBQWlCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUMvRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDN0QsT0FBTyxFQUFFLG1CQUFtQixFQUFtQyxNQUFNLDBCQUEwQixDQUFDO0FBQ2hHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGVBQWUsQ0FBQztBQUNqRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDbkUsT0FBTyxFQUFFLGVBQWUsRUFBeUQsTUFBTSxnREFBZ0QsQ0FBQztBQUN4SSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDbEYsT0FBTyxFQUErQix1QkFBdUIsRUFBRSxNQUFNLHFFQUFxRSxDQUFDO0FBQzNJLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxpQ0FB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