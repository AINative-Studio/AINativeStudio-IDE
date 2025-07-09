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
var EditorsObserver_1;
import { EditorExtensions } from '../../../common/editor.js';
import { SideBySideEditorInput } from '../../../common/editor/sideBySideEditorInput.js';
import { dispose, Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Event, Emitter } from '../../../../base/common/event.js';
import { IEditorGroupsService } from '../../../services/editor/common/editorGroupsService.js';
import { coalesce } from '../../../../base/common/arrays.js';
import { LinkedMap, ResourceMap } from '../../../../base/common/map.js';
import { equals } from '../../../../base/common/objects.js';
/**
 * A observer of opened editors across all editor groups by most recently used.
 * Rules:
 * - the last editor in the list is the one most recently activated
 * - the first editor in the list is the one that was activated the longest time ago
 * - an editor that opens inactive will be placed behind the currently active editor
 *
 * The observer may start to close editors based on the workbench.editor.limit setting.
 */
let EditorsObserver = class EditorsObserver extends Disposable {
    static { EditorsObserver_1 = this; }
    static { this.STORAGE_KEY = 'editors.mru'; }
    get count() {
        return this.mostRecentEditorsMap.size;
    }
    get editors() {
        return [...this.mostRecentEditorsMap.values()];
    }
    hasEditor(editor) {
        const editors = this.editorsPerResourceCounter.get(editor.resource);
        return editors?.has(this.toIdentifier(editor)) ?? false;
    }
    hasEditors(resource) {
        return this.editorsPerResourceCounter.has(resource);
    }
    toIdentifier(arg1, editorId) {
        if (typeof arg1 !== 'string') {
            return this.toIdentifier(arg1.typeId, arg1.editorId);
        }
        if (editorId) {
            return `${arg1}/${editorId}`;
        }
        return arg1;
    }
    constructor(editorGroupsContainer, editorGroupService, storageService) {
        super();
        this.editorGroupService = editorGroupService;
        this.storageService = storageService;
        this.keyMap = new Map();
        this.mostRecentEditorsMap = new LinkedMap();
        this.editorsPerResourceCounter = new ResourceMap();
        this._onDidMostRecentlyActiveEditorsChange = this._register(new Emitter());
        this.onDidMostRecentlyActiveEditorsChange = this._onDidMostRecentlyActiveEditorsChange.event;
        this.editorGroupsContainer = editorGroupsContainer ?? editorGroupService;
        this.isScoped = !!editorGroupsContainer;
        this.registerListeners();
        this.loadState();
    }
    registerListeners() {
        this._register(this.editorGroupsContainer.onDidAddGroup(group => this.onGroupAdded(group)));
        this._register(this.editorGroupService.onDidChangeEditorPartOptions(e => this.onDidChangeEditorPartOptions(e)));
        this._register(this.storageService.onWillSaveState(() => this.saveState()));
    }
    onGroupAdded(group) {
        // Make sure to add any already existing editor
        // of the new group into our list in LRU order
        const groupEditorsMru = group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */);
        for (let i = groupEditorsMru.length - 1; i >= 0; i--) {
            this.addMostRecentEditor(group, groupEditorsMru[i], false /* is not active */, true /* is new */);
        }
        // Make sure that active editor is put as first if group is active
        if (this.editorGroupsContainer.activeGroup === group && group.activeEditor) {
            this.addMostRecentEditor(group, group.activeEditor, true /* is active */, false /* already added before */);
        }
        // Group Listeners
        this.registerGroupListeners(group);
    }
    registerGroupListeners(group) {
        const groupDisposables = new DisposableStore();
        groupDisposables.add(group.onDidModelChange(e => {
            switch (e.kind) {
                // Group gets active: put active editor as most recent
                case 0 /* GroupModelChangeKind.GROUP_ACTIVE */: {
                    if (this.editorGroupsContainer.activeGroup === group && group.activeEditor) {
                        this.addMostRecentEditor(group, group.activeEditor, true /* is active */, false /* editor already opened */);
                    }
                    break;
                }
                // Editor opens: put it as second most recent
                //
                // Also check for maximum allowed number of editors and
                // start to close oldest ones if needed.
                case 5 /* GroupModelChangeKind.EDITOR_OPEN */: {
                    if (e.editor) {
                        this.addMostRecentEditor(group, e.editor, false /* is not active */, true /* is new */);
                        this.ensureOpenedEditorsLimit({ groupId: group.id, editor: e.editor }, group.id);
                    }
                    break;
                }
            }
        }));
        // Editor closes: remove from recently opened
        groupDisposables.add(group.onDidCloseEditor(e => {
            this.removeMostRecentEditor(group, e.editor);
        }));
        // Editor gets active: put active editor as most recent
        // if group is active, otherwise second most recent
        groupDisposables.add(group.onDidActiveEditorChange(e => {
            if (e.editor) {
                this.addMostRecentEditor(group, e.editor, this.editorGroupsContainer.activeGroup === group, false /* editor already opened */);
            }
        }));
        // Make sure to cleanup on dispose
        Event.once(group.onWillDispose)(() => dispose(groupDisposables));
    }
    onDidChangeEditorPartOptions(event) {
        if (!equals(event.newPartOptions.limit, event.oldPartOptions.limit)) {
            const activeGroup = this.editorGroupsContainer.activeGroup;
            let exclude = undefined;
            if (activeGroup.activeEditor) {
                exclude = { editor: activeGroup.activeEditor, groupId: activeGroup.id };
            }
            this.ensureOpenedEditorsLimit(exclude);
        }
    }
    addMostRecentEditor(group, editor, isActive, isNew) {
        const key = this.ensureKey(group, editor);
        const mostRecentEditor = this.mostRecentEditorsMap.first;
        // Active or first entry: add to end of map
        if (isActive || !mostRecentEditor) {
            this.mostRecentEditorsMap.set(key, key, mostRecentEditor ? 1 /* Touch.AsOld */ : undefined);
        }
        // Otherwise: insert before most recent
        else {
            // we have most recent editors. as such we
            // put this newly opened editor right before
            // the current most recent one because it cannot
            // be the most recently active one unless
            // it becomes active. but it is still more
            // active then any other editor in the list.
            this.mostRecentEditorsMap.set(key, key, 1 /* Touch.AsOld */);
            this.mostRecentEditorsMap.set(mostRecentEditor, mostRecentEditor, 1 /* Touch.AsOld */);
        }
        // Update in resource map if this is a new editor
        if (isNew) {
            this.updateEditorResourcesMap(editor, true);
        }
        // Event
        this._onDidMostRecentlyActiveEditorsChange.fire();
    }
    updateEditorResourcesMap(editor, add) {
        // Distill the editor resource and type id with support
        // for side by side editor's primary side too.
        let resource = undefined;
        let typeId = undefined;
        let editorId = undefined;
        if (editor instanceof SideBySideEditorInput) {
            resource = editor.primary.resource;
            typeId = editor.primary.typeId;
            editorId = editor.primary.editorId;
        }
        else {
            resource = editor.resource;
            typeId = editor.typeId;
            editorId = editor.editorId;
        }
        if (!resource) {
            return; // require a resource
        }
        const identifier = this.toIdentifier(typeId, editorId);
        // Add entry
        if (add) {
            let editorsPerResource = this.editorsPerResourceCounter.get(resource);
            if (!editorsPerResource) {
                editorsPerResource = new Map();
                this.editorsPerResourceCounter.set(resource, editorsPerResource);
            }
            editorsPerResource.set(identifier, (editorsPerResource.get(identifier) ?? 0) + 1);
        }
        // Remove entry
        else {
            const editorsPerResource = this.editorsPerResourceCounter.get(resource);
            if (editorsPerResource) {
                const counter = editorsPerResource.get(identifier) ?? 0;
                if (counter > 1) {
                    editorsPerResource.set(identifier, counter - 1);
                }
                else {
                    editorsPerResource.delete(identifier);
                    if (editorsPerResource.size === 0) {
                        this.editorsPerResourceCounter.delete(resource);
                    }
                }
            }
        }
    }
    removeMostRecentEditor(group, editor) {
        // Update in resource map
        this.updateEditorResourcesMap(editor, false);
        // Update in MRU list
        const key = this.findKey(group, editor);
        if (key) {
            // Remove from most recent editors
            this.mostRecentEditorsMap.delete(key);
            // Remove from key map
            const map = this.keyMap.get(group.id);
            if (map && map.delete(key.editor) && map.size === 0) {
                this.keyMap.delete(group.id);
            }
            // Event
            this._onDidMostRecentlyActiveEditorsChange.fire();
        }
    }
    findKey(group, editor) {
        const groupMap = this.keyMap.get(group.id);
        if (!groupMap) {
            return undefined;
        }
        return groupMap.get(editor);
    }
    ensureKey(group, editor) {
        let groupMap = this.keyMap.get(group.id);
        if (!groupMap) {
            groupMap = new Map();
            this.keyMap.set(group.id, groupMap);
        }
        let key = groupMap.get(editor);
        if (!key) {
            key = { groupId: group.id, editor };
            groupMap.set(editor, key);
        }
        return key;
    }
    async ensureOpenedEditorsLimit(exclude, groupId) {
        if (!this.editorGroupService.partOptions.limit?.enabled ||
            typeof this.editorGroupService.partOptions.limit.value !== 'number' ||
            this.editorGroupService.partOptions.limit.value <= 0) {
            return; // return early if not enabled or invalid
        }
        const limit = this.editorGroupService.partOptions.limit.value;
        // In editor group
        if (this.editorGroupService.partOptions.limit?.perEditorGroup) {
            // For specific editor groups
            if (typeof groupId === 'number') {
                const group = this.editorGroupsContainer.getGroup(groupId);
                if (group) {
                    await this.doEnsureOpenedEditorsLimit(limit, group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */).map(editor => ({ editor, groupId })), exclude);
                }
            }
            // For all editor groups
            else {
                for (const group of this.editorGroupsContainer.groups) {
                    await this.ensureOpenedEditorsLimit(exclude, group.id);
                }
            }
        }
        // Across all editor groups
        else {
            await this.doEnsureOpenedEditorsLimit(limit, [...this.mostRecentEditorsMap.values()], exclude);
        }
    }
    async doEnsureOpenedEditorsLimit(limit, mostRecentEditors, exclude) {
        // Check for `excludeDirty` setting and apply it by excluding
        // any recent editor that is dirty from the opened editors limit
        let mostRecentEditorsCountingForLimit;
        if (this.editorGroupService.partOptions.limit?.excludeDirty) {
            mostRecentEditorsCountingForLimit = mostRecentEditors.filter(({ editor }) => {
                if ((editor.isDirty() && !editor.isSaving()) || editor.hasCapability(512 /* EditorInputCapabilities.Scratchpad */)) {
                    return false; // not dirty editors (unless in the process of saving) or scratchpads
                }
                return true;
            });
        }
        else {
            mostRecentEditorsCountingForLimit = mostRecentEditors;
        }
        if (limit >= mostRecentEditorsCountingForLimit.length) {
            return; // only if opened editors exceed setting and is valid and enabled
        }
        // Extract least recently used editors that can be closed
        const leastRecentlyClosableEditors = mostRecentEditorsCountingForLimit.reverse().filter(({ editor, groupId }) => {
            if ((editor.isDirty() && !editor.isSaving()) || editor.hasCapability(512 /* EditorInputCapabilities.Scratchpad */)) {
                return false; // not dirty editors (unless in the process of saving) or scratchpads
            }
            if (exclude && editor === exclude.editor && groupId === exclude.groupId) {
                return false; // never the editor that should be excluded
            }
            if (this.editorGroupsContainer.getGroup(groupId)?.isSticky(editor)) {
                return false; // never sticky editors
            }
            return true;
        });
        // Close editors until we reached the limit again
        let editorsToCloseCount = mostRecentEditorsCountingForLimit.length - limit;
        const mapGroupToEditorsToClose = new Map();
        for (const { groupId, editor } of leastRecentlyClosableEditors) {
            let editorsInGroupToClose = mapGroupToEditorsToClose.get(groupId);
            if (!editorsInGroupToClose) {
                editorsInGroupToClose = [];
                mapGroupToEditorsToClose.set(groupId, editorsInGroupToClose);
            }
            editorsInGroupToClose.push(editor);
            editorsToCloseCount--;
            if (editorsToCloseCount === 0) {
                break; // limit reached
            }
        }
        for (const [groupId, editors] of mapGroupToEditorsToClose) {
            const group = this.editorGroupsContainer.getGroup(groupId);
            if (group) {
                await group.closeEditors(editors, { preserveFocus: true });
            }
        }
    }
    saveState() {
        if (this.isScoped) {
            return; // do not persist state when scoped
        }
        if (this.mostRecentEditorsMap.isEmpty()) {
            this.storageService.remove(EditorsObserver_1.STORAGE_KEY, 1 /* StorageScope.WORKSPACE */);
        }
        else {
            this.storageService.store(EditorsObserver_1.STORAGE_KEY, JSON.stringify(this.serialize()), 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        }
    }
    serialize() {
        const registry = Registry.as(EditorExtensions.EditorFactory);
        const entries = [...this.mostRecentEditorsMap.values()];
        const mapGroupToSerializableEditorsOfGroup = new Map();
        return {
            entries: coalesce(entries.map(({ editor, groupId }) => {
                // Find group for entry
                const group = this.editorGroupsContainer.getGroup(groupId);
                if (!group) {
                    return undefined;
                }
                // Find serializable editors of group
                let serializableEditorsOfGroup = mapGroupToSerializableEditorsOfGroup.get(group);
                if (!serializableEditorsOfGroup) {
                    serializableEditorsOfGroup = group.getEditors(1 /* EditorsOrder.SEQUENTIAL */).filter(editor => {
                        const editorSerializer = registry.getEditorSerializer(editor);
                        return editorSerializer?.canSerialize(editor);
                    });
                    mapGroupToSerializableEditorsOfGroup.set(group, serializableEditorsOfGroup);
                }
                // Only store the index of the editor of that group
                // which can be undefined if the editor is not serializable
                const index = serializableEditorsOfGroup.indexOf(editor);
                if (index === -1) {
                    return undefined;
                }
                return { groupId, index };
            }))
        };
    }
    async loadState() {
        if (this.editorGroupsContainer === this.editorGroupService.mainPart || this.editorGroupsContainer === this.editorGroupService) {
            await this.editorGroupService.whenReady;
        }
        // Previous state: Load editors map from persisted state
        // unless we are running in scoped mode
        let hasRestorableState = false;
        if (!this.isScoped) {
            const serialized = this.storageService.get(EditorsObserver_1.STORAGE_KEY, 1 /* StorageScope.WORKSPACE */);
            if (serialized) {
                hasRestorableState = true;
                this.deserialize(JSON.parse(serialized));
            }
        }
        // No previous state: best we can do is add each editor
        // from oldest to most recently used editor group
        if (!hasRestorableState) {
            const groups = this.editorGroupsContainer.getGroups(1 /* GroupsOrder.MOST_RECENTLY_ACTIVE */);
            for (let i = groups.length - 1; i >= 0; i--) {
                const group = groups[i];
                const groupEditorsMru = group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */);
                for (let i = groupEditorsMru.length - 1; i >= 0; i--) {
                    this.addMostRecentEditor(group, groupEditorsMru[i], true /* enforce as active to preserve order */, true /* is new */);
                }
            }
        }
        // Ensure we listen on group changes for those that exist on startup
        for (const group of this.editorGroupsContainer.groups) {
            this.registerGroupListeners(group);
        }
    }
    deserialize(serialized) {
        const mapValues = [];
        for (const { groupId, index } of serialized.entries) {
            // Find group for entry
            const group = this.editorGroupsContainer.getGroup(groupId);
            if (!group) {
                continue;
            }
            // Find editor for entry
            const editor = group.getEditorByIndex(index);
            if (!editor) {
                continue;
            }
            // Make sure key is registered as well
            const editorIdentifier = this.ensureKey(group, editor);
            mapValues.push([editorIdentifier, editorIdentifier]);
            // Update in resource map
            this.updateEditorResourcesMap(editor, true);
        }
        // Fill map with deserialized values
        this.mostRecentEditorsMap.fromJSON(mapValues);
    }
};
EditorsObserver = EditorsObserver_1 = __decorate([
    __param(1, IEditorGroupsService),
    __param(2, IStorageService)
], EditorsObserver);
export { EditorsObserver };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yc09ic2VydmVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL3BhcnRzL2VkaXRvci9lZGl0b3JzT2JzZXJ2ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBOEQsZ0JBQWdCLEVBQThGLE1BQU0sMkJBQTJCLENBQUM7QUFFck4sT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0saURBQWlELENBQUM7QUFDeEYsT0FBTyxFQUFFLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDNUYsT0FBTyxFQUFFLGVBQWUsRUFBK0IsTUFBTSxnREFBZ0QsQ0FBQztBQUM5RyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDNUUsT0FBTyxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsb0JBQW9CLEVBQXFELE1BQU0sd0RBQXdELENBQUM7QUFDakosT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxTQUFTLEVBQVMsV0FBVyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDL0UsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBYTVEOzs7Ozs7OztHQVFHO0FBQ0ksSUFBTSxlQUFlLEdBQXJCLE1BQU0sZUFBZ0IsU0FBUSxVQUFVOzthQUV0QixnQkFBVyxHQUFHLGFBQWEsQUFBaEIsQ0FBaUI7SUFTcEQsSUFBSSxLQUFLO1FBQ1IsT0FBTyxJQUFJLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDO0lBQ3ZDLENBQUM7SUFFRCxJQUFJLE9BQU87UUFDVixP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