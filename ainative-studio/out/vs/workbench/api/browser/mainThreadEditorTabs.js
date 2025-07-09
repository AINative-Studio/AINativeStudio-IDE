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
import { Event } from '../../../base/common/event.js';
import { DisposableMap, DisposableStore } from '../../../base/common/lifecycle.js';
import { isEqual } from '../../../base/common/resources.js';
import { URI } from '../../../base/common/uri.js';
import { IConfigurationService } from '../../../platform/configuration/common/configuration.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { ExtHostContext, MainContext } from '../common/extHost.protocol.js';
import { EditorResourceAccessor, SideBySideEditor } from '../../common/editor.js';
import { DiffEditorInput } from '../../common/editor/diffEditorInput.js';
import { isGroupEditorMoveEvent } from '../../common/editor/editorGroupModel.js';
import { SideBySideEditorInput } from '../../common/editor/sideBySideEditorInput.js';
import { AbstractTextResourceEditorInput } from '../../common/editor/textResourceEditorInput.js';
import { ChatEditorInput } from '../../contrib/chat/browser/chatEditorInput.js';
import { CustomEditorInput } from '../../contrib/customEditor/browser/customEditorInput.js';
import { InteractiveEditorInput } from '../../contrib/interactive/browser/interactiveEditorInput.js';
import { MergeEditorInput } from '../../contrib/mergeEditor/browser/mergeEditorInput.js';
import { MultiDiffEditorInput } from '../../contrib/multiDiffEditor/browser/multiDiffEditorInput.js';
import { NotebookEditorInput } from '../../contrib/notebook/common/notebookEditorInput.js';
import { TerminalEditorInput } from '../../contrib/terminal/browser/terminalEditorInput.js';
import { WebviewInput } from '../../contrib/webviewPanel/browser/webviewEditorInput.js';
import { columnToEditorGroup, editorGroupToColumn } from '../../services/editor/common/editorGroupColumn.js';
import { IEditorGroupsService, preferredSideBySideGroupDirection } from '../../services/editor/common/editorGroupsService.js';
import { IEditorService, SIDE_GROUP } from '../../services/editor/common/editorService.js';
import { extHostNamedCustomer } from '../../services/extensions/common/extHostCustomers.js';
let MainThreadEditorTabs = class MainThreadEditorTabs {
    constructor(extHostContext, _editorGroupsService, _configurationService, _logService, editorService) {
        this._editorGroupsService = _editorGroupsService;
        this._configurationService = _configurationService;
        this._logService = _logService;
        this._dispoables = new DisposableStore();
        // List of all groups and their corresponding tabs, this is **the** model
        this._tabGroupModel = [];
        // Lookup table for finding group by id
        this._groupLookup = new Map();
        // Lookup table for finding tab by id
        this._tabInfoLookup = new Map();
        // Tracks the currently open MultiDiffEditorInputs to listen to resource changes
        this._multiDiffEditorInputListeners = new DisposableMap();
        this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostEditorTabs);
        // Main listener which responds to events from the editor service
        this._dispoables.add(editorService.onDidEditorsChange((event) => {
            try {
                this._updateTabsModel(event);
            }
            catch {
                this._logService.error('Failed to update model, rebuilding');
                this._createTabsModel();
            }
        }));
        this._dispoables.add(this._multiDiffEditorInputListeners);
        // Structural group changes (add, remove, move, etc) are difficult to patch.
        // Since they happen infrequently we just rebuild the entire model
        this._dispoables.add(this._editorGroupsService.onDidAddGroup(() => this._createTabsModel()));
        this._dispoables.add(this._editorGroupsService.onDidRemoveGroup(() => this._createTabsModel()));
        // Once everything is read go ahead and initialize the model
        this._editorGroupsService.whenReady.then(() => this._createTabsModel());
    }
    dispose() {
        this._groupLookup.clear();
        this._tabInfoLookup.clear();
        this._dispoables.dispose();
    }
    /**
     * Creates a tab object with the correct properties
     * @param editor The editor input represented by the tab
     * @param group The group the tab is in
     * @returns A tab object
     */
    _buildTabObject(group, editor, editorIndex) {
        const editorId = editor.editorId;
        const tab = {
            id: this._generateTabId(editor, group.id),
            label: editor.getName(),
            editorId,
            input: this._editorInputToDto(editor),
            isPinned: group.isSticky(editorIndex),
            isPreview: !group.isPinned(editorIndex),
            isActive: group.isActive(editor),
            isDirty: editor.isDirty()
        };
        return tab;
    }
    _editorInputToDto(editor) {
        if (editor instanceof MergeEditorInput) {
            return {
                kind: 3 /* TabInputKind.TextMergeInput */,
                base: editor.base,
                input1: editor.input1.uri,
                input2: editor.input2.uri,
                result: editor.resource
            };
        }
        if (editor instanceof AbstractTextResourceEditorInput) {
            return {
                kind: 1 /* TabInputKind.TextInput */,
                uri: editor.resource
            };
        }
        if (editor instanceof SideBySideEditorInput && !(editor instanceof DiffEditorInput)) {
            const primaryResource = editor.primary.resource;
            const secondaryResource = editor.secondary.resource;
            // If side by side editor with same resource on both sides treat it as a singular tab kind
            if (editor.primary instanceof AbstractTextResourceEditorInput
                && editor.secondary instanceof AbstractTextResourceEditorInput
                && isEqual(primaryResource, secondaryResource)
                && primaryResource
                && secondaryResource) {
                return {
                    kind: 1 /* TabInputKind.TextInput */,
                    uri: primaryResource
                };
            }
            return { kind: 0 /* TabInputKind.UnknownInput */ };
        }
        if (editor instanceof NotebookEditorInput) {
            return {
                kind: 4 /* TabInputKind.NotebookInput */,
                notebookType: editor.viewType,
                uri: editor.resource
            };
        }
        if (editor instanceof CustomEditorInput) {
            return {
                kind: 6 /* TabInputKind.CustomEditorInput */,
                viewType: editor.viewType,
                uri: editor.resource,
            };
        }
        if (editor instanceof WebviewInput) {
            return {
                kind: 7 /* TabInputKind.WebviewEditorInput */,
                viewType: editor.viewType
            };
        }
        if (editor instanceof TerminalEditorInput) {
            return {
                kind: 8 /* TabInputKind.TerminalEditorInput */
            };
        }
        if (editor instanceof DiffEditorInput) {
            if (editor.modified instanceof AbstractTextResourceEditorInput && editor.original instanceof AbstractTextResourceEditorInput) {
                return {
                    kind: 2 /* TabInputKind.TextDiffInput */,
                    modified: editor.modified.resource,
                    original: editor.original.resource
                };
            }
            if (editor.modified instanceof NotebookEditorInput && editor.original instanceof NotebookEditorInput) {
                return {
                    kind: 5 /* TabInputKind.NotebookDiffInput */,
                    notebookType: editor.original.viewType,
                    modified: editor.modified.resource,
                    original: editor.original.resource
                };
            }
        }
        if (editor instanceof InteractiveEditorInput) {
            return {
                kind: 9 /* TabInputKind.InteractiveEditorInput */,
                uri: editor.resource,
                inputBoxUri: editor.inputResource
            };
        }
        if (editor instanceof ChatEditorInput) {
            return {
                kind: 10 /* TabInputKind.ChatEditorInput */,
            };
        }
        if (editor instanceof MultiDiffEditorInput) {
            const diffEditors = [];
            for (const resource of (editor?.resources.get() ?? [])) {
                if (resource.originalUri && resource.modifiedUri) {
                    diffEditors.push({
                        kind: 2 /* TabInputKind.TextDiffInput */,
                        original: resource.originalUri,
                        modified: resource.modifiedUri
                    });
                }
            }
            return {
                kind: 11 /* TabInputKind.MultiDiffEditorInput */,
                diffEditors
            };
        }
        return { kind: 0 /* TabInputKind.UnknownInput */ };
    }
    /**
     * Generates a unique id for a tab
     * @param editor The editor input
     * @param groupId The group id
     * @returns A unique identifier for a specific tab
     */
    _generateTabId(editor, groupId) {
        let resourceString;
        // Properly get the resource and account for side by side editors
        const resource = EditorResourceAccessor.getCanonicalUri(editor, { supportSideBySide: SideBySideEditor.BOTH });
        if (resource instanceof URI) {
            resourceString = resource.toString();
        }
        else {
            resourceString = `${resource?.primary?.toString()}-${resource?.secondary?.toString()}`;
        }
        return `${groupId}~${editor.editorId}-${editor.typeId}-${resourceString} `;
    }
    /**
     * Called whenever a group activates, updates the model by marking the group as active an notifies the extension host
     */
    _onDidGroupActivate() {
        const activeGroupId = this._editorGroupsService.activeGroup.id;
        const activeGroup = this._groupLookup.get(activeGroupId);
        if (activeGroup) {
            // Ok not to loop as exthost accepts last active group
            activeGroup.isActive = true;
            this._proxy.$acceptTabGroupUpdate(activeGroup);
        }
    }
    /**
     * Called when the tab label changes
     * @param groupId The id of the group the tab exists in
     * @param editorInput The editor input represented by the tab
     */
    _onDidTabLabelChange(groupId, editorInput, editorIndex) {
        const tabId = this._generateTabId(editorInput, groupId);
        const tabInfo = this._tabInfoLookup.get(tabId);
        // If tab is found patch, else rebuild
        if (tabInfo) {
            tabInfo.tab.label = editorInput.getName();
            this._proxy.$acceptTabOperation({
                groupId,
                index: editorIndex,
                tabDto: tabInfo.tab,
                kind: 2 /* TabModelOperationKind.TAB_UPDATE */
            });
        }
        else {
            this._logService.error('Invalid model for label change, rebuilding');
            this._createTabsModel();
        }
    }
    /**
     * Called when a new tab is opened
     * @param groupId The id of the group the tab is being created in
     * @param editorInput The editor input being opened
     * @param editorIndex The index of the editor within that group
     */
    _onDidTabOpen(groupId, editorInput, editorIndex) {
        const group = this._editorGroupsService.getGroup(groupId);
        // Even if the editor service knows about the group the group might not exist yet in our model
        const groupInModel = this._groupLookup.get(groupId) !== undefined;
        // Means a new group was likely created so we rebuild the model
        if (!group || !groupInModel) {
            this._createTabsModel();
            return;
        }
        const tabs = this._groupLookup.get(groupId)?.tabs;
        if (!tabs) {
            return;
        }
        // Splice tab into group at index editorIndex
        const tabObject = this._buildTabObject(group, editorInput, editorIndex);
        tabs.splice(editorIndex, 0, tabObject);
        // Update lookup
        const tabId = this._generateTabId(editorInput, groupId);
        this._tabInfoLookup.set(tabId, { group, editorInput, tab: tabObject });
        if (editorInput instanceof MultiDiffEditorInput) {
            this._multiDiffEditorInputListeners.set(editorInput, Event.fromObservableLight(editorInput.resources)(() => {
                const tabInfo = this._tabInfoLookup.get(tabId);
                if (!tabInfo) {
                    return;
                }
                tabInfo.tab = this._buildTabObject(group, editorInput, editorIndex);
                this._proxy.$acceptTabOperation({
                    groupId,
                    index: editorIndex,
                    tabDto: tabInfo.tab,
                    kind: 2 /* TabModelOperationKind.TAB_UPDATE */
                });
            }));
        }
        this._proxy.$acceptTabOperation({
            groupId,
            index: editorIndex,
            tabDto: tabObject,
            kind: 0 /* TabModelOperationKind.TAB_OPEN */
        });
    }
    /**
     * Called when a tab is closed
     * @param groupId The id of the group the tab is being removed from
     * @param editorIndex The index of the editor within that group
     */
    _onDidTabClose(groupId, editorIndex) {
        const group = this._editorGroupsService.getGroup(groupId);
        const tabs = this._groupLookup.get(groupId)?.tabs;
        // Something is wrong with the model state so we rebuild
        if (!group || !tabs) {
            this._createTabsModel();
            return;
        }
        // Splice tab into group at index editorIndex
        const removedTab = tabs.splice(editorIndex, 1);
        // Index must no longer be valid so we return prematurely
        if (removedTab.length === 0) {
            return;
        }
        // Update lookup
        this._tabInfoLookup.delete(removedTab[0]?.id ?? '');
        if (removedTab[0]?.input instanceof MultiDiffEditorInput) {
            this._multiDiffEditorInputListeners.deleteAndDispose(removedTab[0]?.input);
        }
        this._proxy.$acceptTabOperation({
            groupId,
            index: editorIndex,
            tabDto: removedTab[0],
            kind: 1 /* TabModelOperationKind.TAB_CLOSE */
        });
    }
    /**
     * Called when the active tab changes
     * @param groupId The id of the group the tab is contained in
     * @param editorIndex The index of the tab
     */
    _onDidTabActiveChange(groupId, editorIndex) {
        // TODO @lramos15 use the tab lookup here if possible. Do we have an editor input?!
        const tabs = this._groupLookup.get(groupId)?.tabs;
        if (!tabs) {
            return;
        }
        const activeTab = tabs[editorIndex];
        // No need to loop over as the exthost uses the most recently marked active tab
        activeTab.isActive = true;
        // Send DTO update to the exthost
        this._proxy.$acceptTabOperation({
            groupId,
            index: editorIndex,
            tabDto: activeTab,
            kind: 2 /* TabModelOperationKind.TAB_UPDATE */
        });
    }
    /**
     * Called when the dirty indicator on the tab changes
     * @param groupId The id of the group the tab is in
     * @param editorIndex The index of the tab
     * @param editor The editor input represented by the tab
     */
    _onDidTabDirty(groupId, editorIndex, editor) {
        const tabId = this._generateTabId(editor, groupId);
        const tabInfo = this._tabInfoLookup.get(tabId);
        // Something wrong with the model state so we rebuild
        if (!tabInfo) {
            this._logService.error('Invalid model for dirty change, rebuilding');
            this._createTabsModel();
            return;
        }
        tabInfo.tab.isDirty = editor.isDirty();
        this._proxy.$acceptTabOperation({
            groupId,
            index: editorIndex,
            tabDto: tabInfo.tab,
            kind: 2 /* TabModelOperationKind.TAB_UPDATE */
        });
    }
    /**
     * Called when the tab is pinned/unpinned
     * @param groupId The id of the group the tab is in
     * @param editorIndex The index of the tab
     * @param editor The editor input represented by the tab
     */
    _onDidTabPinChange(groupId, editorIndex, editor) {
        const tabId = this._generateTabId(editor, groupId);
        const tabInfo = this._tabInfoLookup.get(tabId);
        const group = tabInfo?.group;
        const tab = tabInfo?.tab;
        // Something wrong with the model state so we rebuild
        if (!group || !tab) {
            this._logService.error('Invalid model for sticky change, rebuilding');
            this._createTabsModel();
            return;
        }
        // Whether or not the tab has the pin icon (internally it's called sticky)
        tab.isPinned = group.isSticky(editorIndex);
        this._proxy.$acceptTabOperation({
            groupId,
            index: editorIndex,
            tabDto: tab,
            kind: 2 /* TabModelOperationKind.TAB_UPDATE */
        });
    }
    /**
 * Called when the tab is preview / unpreviewed
 * @param groupId The id of the group the tab is in
 * @param editorIndex The index of the tab
 * @param editor The editor input represented by the tab
 */
    _onDidTabPreviewChange(groupId, editorIndex, editor) {
        const tabId = this._generateTabId(editor, groupId);
        const tabInfo = this._tabInfoLookup.get(tabId);
        const group = tabInfo?.group;
        const tab = tabInfo?.tab;
        // Something wrong with the model state so we rebuild
        if (!group || !tab) {
            this._logService.error('Invalid model for sticky change, rebuilding');
            this._createTabsModel();
            return;
        }
        // Whether or not the tab has the pin icon (internally it's called pinned)
        tab.isPreview = !group.isPinned(editorIndex);
        this._proxy.$acceptTabOperation({
            kind: 2 /* TabModelOperationKind.TAB_UPDATE */,
            groupId,
            tabDto: tab,
            index: editorIndex
        });
    }
    _onDidTabMove(groupId, editorIndex, oldEditorIndex, editor) {
        const tabs = this._groupLookup.get(groupId)?.tabs;
        // Something wrong with the model state so we rebuild
        if (!tabs) {
            this._logService.error('Invalid model for move change, rebuilding');
            this._createTabsModel();
            return;
        }
        // Move tab from old index to new index
        const removedTab = tabs.splice(oldEditorIndex, 1);
        if (removedTab.length === 0) {
            return;
        }
        tabs.splice(editorIndex, 0, removedTab[0]);
        // Notify exthost of move
        this._proxy.$acceptTabOperation({
            kind: 3 /* TabModelOperationKind.TAB_MOVE */,
            groupId,
            tabDto: removedTab[0],
            index: editorIndex,
            oldIndex: oldEditorIndex
        });
    }
    /**
     * Builds the model from scratch based on the current state of the editor service.
     */
    _createTabsModel() {
        if (this._editorGroupsService.groups.length === 0) {
            return; // skip this invalid state, it may happen when the entire editor area is transitioning to other state ("editor working sets")
        }
        this._tabGroupModel = [];
        this._groupLookup.clear();
        this._tabInfoLookup.clear();
        let tabs = [];
        for (const group of this._editorGroupsService.groups) {
            const currentTabGroupModel = {
                groupId: group.id,
                isActive: group.id === this._editorGroupsService.activeGroup.id,
                viewColumn: editorGroupToColumn(this._editorGroupsService, group),
                tabs: []
            };
            group.editors.forEach((editor, editorIndex) => {
                const tab = this._buildTabObject(group, editor, editorIndex);
                tabs.push(tab);
                // Add information about the tab to the lookup
                this._tabInfoLookup.set(this._generateTabId(editor, group.id), {
                    group,
                    tab,
                    editorInput: editor
                });
            });
            currentTabGroupModel.tabs = tabs;
            this._tabGroupModel.push(currentTabGroupModel);
            this._groupLookup.set(group.id, currentTabGroupModel);
            tabs = [];
        }
        // notify the ext host of the new model
        this._proxy.$acceptEditorTabModel(this._tabGroupModel);
    }
    // TODOD @lramos15 Remove this after done finishing the tab model code
    // private _eventToString(event: IEditorsChangeEvent | IEditorsMoveEvent): string {
    // 	let eventString = '';
    // 	switch (event.kind) {
    // 		case GroupModelChangeKind.GROUP_INDEX: eventString += 'GROUP_INDEX'; break;
    // 		case GroupModelChangeKind.EDITOR_ACTIVE: eventString += 'EDITOR_ACTIVE'; break;
    // 		case GroupModelChangeKind.EDITOR_PIN: eventString += 'EDITOR_PIN'; break;
    // 		case GroupModelChangeKind.EDITOR_OPEN: eventString += 'EDITOR_OPEN'; break;
    // 		case GroupModelChangeKind.EDITOR_CLOSE: eventString += 'EDITOR_CLOSE'; break;
    // 		case GroupModelChangeKind.EDITOR_MOVE: eventString += 'EDITOR_MOVE'; break;
    // 		case GroupModelChangeKind.EDITOR_LABEL: eventString += 'EDITOR_LABEL'; break;
    // 		case GroupModelChangeKind.GROUP_ACTIVE: eventString += 'GROUP_ACTIVE'; break;
    // 		case GroupModelChangeKind.GROUP_LOCKED: eventString += 'GROUP_LOCKED'; break;
    // 		case GroupModelChangeKind.EDITOR_DIRTY: eventString += 'EDITOR_DIRTY'; break;
    // 		case GroupModelChangeKind.EDITOR_STICKY: eventString += 'EDITOR_STICKY'; break;
    // 		default: eventString += `UNKNOWN: ${event.kind}`; break;
    // 	}
    // 	return eventString;
    // }
    /**
     * The main handler for the tab events
     * @param events The list of events to process
     */
    _updateTabsModel(changeEvent) {
        const event = changeEvent.event;
        const groupId = changeEvent.groupId;
        switch (event.kind) {
            case 0 /* GroupModelChangeKind.GROUP_ACTIVE */:
                if (groupId === this._editorGroupsService.activeGroup.id) {
                    this._onDidGroupActivate();
                    break;
                }
                else {
                    return;
                }
            case 9 /* GroupModelChangeKind.EDITOR_LABEL */:
                if (event.editor !== undefined && event.editorIndex !== undefined) {
                    this._onDidTabLabelChange(groupId, event.editor, event.editorIndex);
                    break;
                }
            case 5 /* GroupModelChangeKind.EDITOR_OPEN */:
                if (event.editor !== undefined && event.editorIndex !== undefined) {
                    this._onDidTabOpen(groupId, event.editor, event.editorIndex);
                    break;
                }
            case 6 /* GroupModelChangeKind.EDITOR_CLOSE */:
                if (event.editorIndex !== undefined) {
                    this._onDidTabClose(groupId, event.editorIndex);
                    break;
                }
            case 8 /* GroupModelChangeKind.EDITOR_ACTIVE */:
                if (event.editorIndex !== undefined) {
                    this._onDidTabActiveChange(groupId, event.editorIndex);
                    break;
                }
            case 14 /* GroupModelChangeKind.EDITOR_DIRTY */:
                if (event.editorIndex !== undefined && event.editor !== undefined) {
                    this._onDidTabDirty(groupId, event.editorIndex, event.editor);
                    break;
                }
            case 13 /* GroupModelChangeKind.EDITOR_STICKY */:
                if (event.editorIndex !== undefined && event.editor !== undefined) {
                    this._onDidTabPinChange(groupId, event.editorIndex, event.editor);
                    break;
                }
            case 11 /* GroupModelChangeKind.EDITOR_PIN */:
                if (event.editorIndex !== undefined && event.editor !== undefined) {
                    this._onDidTabPreviewChange(groupId, event.editorIndex, event.editor);
                    break;
                }
            case 12 /* GroupModelChangeKind.EDITOR_TRANSIENT */:
                // Currently not exposed in the API
                break;
            case 7 /* GroupModelChangeKind.EDITOR_MOVE */:
                if (isGroupEditorMoveEvent(event) && event.editor && event.editorIndex !== undefined && event.oldEditorIndex !== undefined) {
                    this._onDidTabMove(groupId, event.editorIndex, event.oldEditorIndex, event.editor);
                    break;
                }
            default:
                // If it's not an optimized case we rebuild the tabs model from scratch
                this._createTabsModel();
        }
    }
    //#region Messages received from Ext Host
    $moveTab(tabId, index, viewColumn, preserveFocus) {
        const groupId = columnToEditorGroup(this._editorGroupsService, this._configurationService, viewColumn);
        const tabInfo = this._tabInfoLookup.get(tabId);
        const tab = tabInfo?.tab;
        if (!tab) {
            throw new Error(`Attempted to close tab with id ${tabId} which does not exist`);
        }
        let targetGroup;
        const sourceGroup = this._editorGroupsService.getGroup(tabInfo.group.id);
        if (!sourceGroup) {
            return;
        }
        // If group index is out of bounds then we make a new one that's to the right of the last group
        if (this._groupLookup.get(groupId) === undefined) {
            let direction = 3 /* GroupDirection.RIGHT */;
            // Make sure we respect the user's preferred side direction
            if (viewColumn === SIDE_GROUP) {
                direction = preferredSideBySideGroupDirection(this._configurationService);
            }
            targetGroup = this._editorGroupsService.addGroup(this._editorGroupsService.groups[this._editorGroupsService.groups.length - 1], direction);
        }
        else {
            targetGroup = this._editorGroupsService.getGroup(groupId);
        }
        if (!targetGroup) {
            return;
        }
        // Similar logic to if index is out of bounds we place it at the end
        if (index < 0 || index > targetGroup.editors.length) {
            index = targetGroup.editors.length;
        }
        // Find the correct EditorInput using the tab info
        const editorInput = tabInfo?.editorInput;
        if (!editorInput) {
            return;
        }
        // Move the editor to the target group
        sourceGroup.moveEditor(editorInput, targetGroup, { index, preserveFocus });
        return;
    }
    async $closeTab(tabIds, preserveFocus) {
        const groups = new Map();
        for (const tabId of tabIds) {
            const tabInfo = this._tabInfoLookup.get(tabId);
            const tab = tabInfo?.tab;
            const group = tabInfo?.group;
            const editorTab = tabInfo?.editorInput;
            // If not found skip
            if (!group || !tab || !tabInfo || !editorTab) {
                continue;
            }
            const groupEditors = groups.get(group);
            if (!groupEditors) {
                groups.set(group, [editorTab]);
            }
            else {
                groupEditors.push(editorTab);
            }
        }
        // Loop over keys of the groups map and call closeEditors
        const results = [];
        for (const [group, editors] of groups) {
            results.push(await group.closeEditors(editors, { preserveFocus }));
        }
        // TODO @jrieken This isn't quite right how can we say true for some but not others?
        return results.every(result => result);
    }
    async $closeGroup(groupIds, preserveFocus) {
        const groupCloseResults = [];
        for (const groupId of groupIds) {
            const group = this._editorGroupsService.getGroup(groupId);
            if (group) {
                groupCloseResults.push(await group.closeAllEditors());
                // Make sure group is empty but still there before removing it
                if (group.count === 0 && this._editorGroupsService.getGroup(group.id)) {
                    this._editorGroupsService.removeGroup(group);
                }
            }
        }
        return groupCloseResults.every(result => result);
    }
};
MainThreadEditorTabs = __decorate([
    extHostNamedCustomer(MainContext.MainThreadEditorTabs),
    __param(1, IEditorGroupsService),
    __param(2, IConfigurationService),
    __param(3, ILogService),
    __param(4, IEditorService)
], MainThreadEditorTabs);
export { MainThreadEditorTabs };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZEVkaXRvclRhYnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9icm93c2VyL21haW5UaHJlYWRFZGl0b3JUYWJzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUN0RCxPQUFPLEVBQUUsYUFBYSxFQUFFLGVBQWUsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ25GLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM1RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDbEQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDaEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ2xFLE9BQU8sRUFBZSxjQUFjLEVBQThELFdBQVcsRUFBb0YsTUFBTSwrQkFBK0IsQ0FBQztBQUN2TyxPQUFPLEVBQUUsc0JBQXNCLEVBQXdCLGdCQUFnQixFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFDeEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBRWpGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQ3JGLE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ2pHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUNoRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUM1RixPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw2REFBNkQsQ0FBQztBQUNyRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUN6RixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUNyRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUMzRixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUM1RixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDeEYsT0FBTyxFQUFFLG1CQUFtQixFQUFxQixtQkFBbUIsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ2hJLE9BQU8sRUFBZ0Msb0JBQW9CLEVBQUUsaUNBQWlDLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUM1SixPQUFPLEVBQXVCLGNBQWMsRUFBRSxVQUFVLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUNoSCxPQUFPLEVBQUUsb0JBQW9CLEVBQW1CLE1BQU0sc0RBQXNELENBQUM7QUFRdEcsSUFBTSxvQkFBb0IsR0FBMUIsTUFBTSxvQkFBb0I7SUFhaEMsWUFDQyxjQUErQixFQUNULG9CQUEyRCxFQUMxRCxxQkFBNkQsRUFDdkUsV0FBeUMsRUFDdEMsYUFBNkI7UUFITix5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXNCO1FBQ3pDLDBCQUFxQixHQUFyQixxQkFBcUIsQ0FBdUI7UUFDdEQsZ0JBQVcsR0FBWCxXQUFXLENBQWE7UUFmdEMsZ0JBQVcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO1FBRXJELHlFQUF5RTtRQUNqRSxtQkFBYyxHQUF5QixFQUFFLENBQUM7UUFDbEQsdUNBQXVDO1FBQ3RCLGlCQUFZLEdBQW9DLElBQUksR0FBRyxFQUFFLENBQUM7UUFDM0UscUNBQXFDO1FBQ3BCLG1CQUFjLEdBQXlCLElBQUksR0FBRyxFQUFFLENBQUM7UUFDbEUsZ0ZBQWdGO1FBQy9ELG1DQUE4QixHQUF3QyxJQUFJLGFBQWEsRUFBRSxDQUFDO1FBVTFHLElBQUksQ0FBQyxNQUFNLEdBQUcsY0FBYyxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsaUJBQWlCLENBQUMsQ0FBQztRQUV4RSxpRUFBaUU7UUFDakUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLGtCQUFrQixDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUU7WUFDL0QsSUFBSSxDQUFDO2dCQUNKLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUM5QixDQUFDO1lBQUMsTUFBTSxDQUFDO2dCQUNSLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLG9DQUFvQyxDQUFDLENBQUM7Z0JBQzdELElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1lBQ3pCLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRUosSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLDhCQUE4QixDQUFDLENBQUM7UUFFMUQsNEVBQTRFO1FBQzVFLGtFQUFrRTtRQUNsRSxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsYUFBYSxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUM3RixJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRWhHLDREQUE0RDtRQUM1RCxJQUFJLENBQUMsb0JBQW9CLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxDQUFDO0lBQ3pFLENBQUM7SUFFRCxPQUFPO1FBQ04sSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUMxQixJQUFJLENBQUMsY0FBYyxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQzVCLElBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDNUIsQ0FBQztJQUVEOzs7OztPQUtHO0lBQ0ssZUFBZSxDQUFDLEtBQW1CLEVBQUUsTUFBbUIsRUFBRSxXQUFtQjtRQUNwRixNQUFNLFFBQVEsR0FBRyxNQUFNLENBQUMsUUFBUSxDQUFDO1FBQ2pDLE1BQU0sR0FBRyxHQUFrQjtZQUMxQixFQUFFLEVBQUUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUN6QyxLQUFLLEVBQUUsTUFBTSxDQUFDLE9BQU8sRUFBRTtZQUN2QixRQUFRO1lBQ1IsS0FBSyxFQUFFLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxNQUFNLENBQUM7WUFDckMsUUFBUSxFQUFFLEtBQUssQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDO1lBQ3JDLFNBQVMsRUFBRSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDO1lBQ3ZDLFFBQVEsRUFBRSxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQztZQUNoQyxPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU8sRUFBRTtTQUN6QixDQUFDO1FBQ0YsT0FBTyxHQUFHLENBQUM7SUFDWixDQUFDO0lBRU8saUJBQWlCLENBQUMsTUFBbUI7UUFFNUMsSUFBSSxNQUFNLFlBQVksZ0JBQWdCLEVBQUUsQ0FBQztZQUN4QyxPQUFPO2dCQUNOLElBQUkscUNBQTZCO2dCQUNqQyxJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUk7Z0JBQ2pCLE1BQU0sRUFBRSxNQUFNLENBQUMsTUFBTSxDQUFDLEdBQUc7Z0JBQ3pCLE1BQU0sRUFBRSxNQUFNLENBQUMsTUFBTSxDQUFDLEdBQUc7Z0JBQ3pCLE1BQU0sRUFBRSxNQUFNLENBQUMsUUFBUTthQUN2QixDQUFDO1FBQ0gsQ0FBQztRQUVELElBQUksTUFBTSxZQUFZLCtCQUErQixFQUFFLENBQUM7WUFDdkQsT0FBTztnQkFDTixJQUFJLGdDQUF3QjtnQkFDNUIsR0FBRyxFQUFFLE1BQU0sQ0FBQyxRQUFRO2FBQ3BCLENBQUM7UUFDSCxDQUFDO1FBRUQsSUFBSSxNQUFNLFlBQVkscUJBQXFCLElBQUksQ0FBQyxDQUFDLE1BQU0sWUFBWSxlQUFlLENBQUMsRUFBRSxDQUFDO1lBQ3JGLE1BQU0sZUFBZSxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDO1lBQ2hELE1BQU0saUJBQWlCLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUM7WUFDcEQsMEZBQTBGO1lBQzFGLElBQUksTUFBTSxDQUFDLE9BQU8sWUFBWSwrQkFBK0I7bUJBQ3pELE1BQU0sQ0FBQyxTQUFTLFlBQVksK0JBQStCO21CQUMzRCxPQUFPLENBQUMsZUFBZSxFQUFFLGlCQUFpQixDQUFDO21CQUMzQyxlQUFlO21CQUNmLGlCQUFpQixFQUNuQixDQUFDO2dCQUNGLE9BQU87b0JBQ04sSUFBSSxnQ0FBd0I7b0JBQzVCLEdBQUcsRUFBRSxlQUFlO2lCQUNwQixDQUFDO1lBQ0gsQ0FBQztZQUNELE9BQU8sRUFBRSxJQUFJLG1DQUEyQixFQUFFLENBQUM7UUFDNUMsQ0FBQztRQUVELElBQUksTUFBTSxZQUFZLG1CQUFtQixFQUFFLENBQUM7WUFDM0MsT0FBTztnQkFDTixJQUFJLG9DQUE0QjtnQkFDaEMsWUFBWSxFQUFFLE1BQU0sQ0FBQyxRQUFRO2dCQUM3QixHQUFHLEVBQUUsTUFBTSxDQUFDLFFBQVE7YUFDcEIsQ0FBQztRQUNILENBQUM7UUFFRCxJQUFJLE1BQU0sWUFBWSxpQkFBaUIsRUFBRSxDQUFDO1lBQ3pDLE9BQU87Z0JBQ04sSUFBSSx3Q0FBZ0M7Z0JBQ3BDLFFBQVEsRUFBRSxNQUFNLENBQUMsUUFBUTtnQkFDekIsR0FBRyxFQUFFLE1BQU0sQ0FBQyxRQUFRO2FBQ3BCLENBQUM7UUFDSCxDQUFDO1FBRUQsSUFBSSxNQUFNLFlBQVksWUFBWSxFQUFFLENBQUM7WUFDcEMsT0FBTztnQkFDTixJQUFJLHlDQUFpQztnQkFDckMsUUFBUSxFQUFFLE1BQU0sQ0FBQyxRQUFRO2FBQ3pCLENBQUM7UUFDSCxDQUFDO1FBRUQsSUFBSSxNQUFNLFlBQVksbUJBQW1CLEVBQUUsQ0FBQztZQUMzQyxPQUFPO2dCQUNOLElBQUksMENBQWtDO2FBQ3RDLENBQUM7UUFDSCxDQUFDO1FBRUQsSUFBSSxNQUFNLFlBQVksZUFBZSxFQUFFLENBQUM7WUFDdkMsSUFBSSxNQUFNLENBQUMsUUFBUSxZQUFZLCtCQUErQixJQUFJLE1BQU0sQ0FBQyxRQUFRLFlBQVksK0JBQStCLEVBQUUsQ0FBQztnQkFDOUgsT0FBTztvQkFDTixJQUFJLG9DQUE0QjtvQkFDaEMsUUFBUSxFQUFFLE1BQU0sQ0FBQyxRQUFRLENBQUMsUUFBUTtvQkFDbEMsUUFBUSxFQUFFLE1BQU0sQ0FBQyxRQUFRLENBQUMsUUFBUTtpQkFDbEMsQ0FBQztZQUNILENBQUM7WUFDRCxJQUFJLE1BQU0sQ0FBQyxRQUFRLFlBQVksbUJBQW1CLElBQUksTUFBTSxDQUFDLFFBQVEsWUFBWSxtQkFBbUIsRUFBRSxDQUFDO2dCQUN0RyxPQUFPO29CQUNOLElBQUksd0NBQWdDO29CQUNwQyxZQUFZLEVBQUUsTUFBTSxDQUFDLFFBQVEsQ0FBQyxRQUFRO29CQUN0QyxRQUFRLEVBQUUsTUFBTSxDQUFDLFFBQVEsQ0FBQyxRQUFRO29CQUNsQyxRQUFRLEVBQUUsTUFBTSxDQUFDLFFBQVEsQ0FBQyxRQUFRO2lCQUNsQyxDQUFDO1lBQ0gsQ0FBQztRQUNGLENBQUM7UUFFRCxJQUFJLE1BQU0sWUFBWSxzQkFBc0IsRUFBRSxDQUFDO1lBQzlDLE9BQU87Z0JBQ04sSUFBSSw2Q0FBcUM7Z0JBQ3pDLEdBQUcsRUFBRSxNQUFNLENBQUMsUUFBUTtnQkFDcEIsV0FBVyxFQUFFLE1BQU0sQ0FBQyxhQUFhO2FBQ2pDLENBQUM7UUFDSCxDQUFDO1FBRUQsSUFBSSxNQUFNLFlBQVksZUFBZSxFQUFFLENBQUM7WUFDdkMsT0FBTztnQkFDTixJQUFJLHVDQUE4QjthQUNsQyxDQUFDO1FBQ0gsQ0FBQztRQUVELElBQUksTUFBTSxZQUFZLG9CQUFvQixFQUFFLENBQUM7WUFDNUMsTUFBTSxXQUFXLEdBQXVCLEVBQUUsQ0FBQztZQUMzQyxLQUFLLE1BQU0sUUFBUSxJQUFJLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxHQUFHLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxDQUFDO2dCQUN4RCxJQUFJLFFBQVEsQ0FBQyxXQUFXLElBQUksUUFBUSxDQUFDLFdBQVcsRUFBRSxDQUFDO29CQUNsRCxXQUFXLENBQUMsSUFBSSxDQUFDO3dCQUNoQixJQUFJLG9DQUE0Qjt3QkFDaEMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxXQUFXO3dCQUM5QixRQUFRLEVBQUUsUUFBUSxDQUFDLFdBQVc7cUJBQzlCLENBQUMsQ0FBQztnQkFDSixDQUFDO1lBQ0YsQ0FBQztZQUVELE9BQU87Z0JBQ04sSUFBSSw0Q0FBbUM7Z0JBQ3ZDLFdBQVc7YUFDWCxDQUFDO1FBQ0gsQ0FBQztRQUVELE9BQU8sRUFBRSxJQUFJLG1DQUEyQixFQUFFLENBQUM7SUFDNUMsQ0FBQztJQUVEOzs7OztPQUtHO0lBQ0ssY0FBYyxDQUFDLE1BQW1CLEVBQUUsT0FBZTtRQUMxRCxJQUFJLGNBQWtDLENBQUM7UUFDdkMsaUVBQWlFO1FBQ2pFLE1BQU0sUUFBUSxHQUFHLHNCQUFzQixDQUFDLGVBQWUsQ0FBQyxNQUFNLEVBQUUsRUFBRSxpQkFBaUIsRUFBRSxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQzlHLElBQUksUUFBUSxZQUFZLEdBQUcsRUFBRSxDQUFDO1lBQzdCLGNBQWMsR0FBRyxRQUFRLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDdEMsQ0FBQzthQUFNLENBQUM7WUFDUCxjQUFjLEdBQUcsR0FBRyxRQUFRLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxJQUFJLFFBQVEsRUFBRSxTQUFTLEVBQUUsUUFBUSxFQUFFLEVBQUUsQ0FBQztRQUN4RixDQUFDO1FBQ0QsT0FBTyxHQUFHLE9BQU8sSUFBSSxNQUFNLENBQUMsUUFBUSxJQUFJLE1BQU0sQ0FBQyxNQUFNLElBQUksY0FBYyxHQUFHLENBQUM7SUFDNUUsQ0FBQztJQUVEOztPQUVHO0lBQ0ssbUJBQW1CO1FBQzFCLE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDO1FBQy9ELE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBQ3pELElBQUksV0FBVyxFQUFFLENBQUM7WUFDakIsc0RBQXNEO1lBQ3RELFdBQVcsQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDO1lBQzVCLElBQUksQ0FBQyxNQUFNLENBQUMscUJBQXFCLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDaEQsQ0FBQztJQUNGLENBQUM7SUFFRDs7OztPQUlHO0lBQ0ssb0JBQW9CLENBQUMsT0FBZSxFQUFFLFdBQXdCLEVBQUUsV0FBbUI7UUFDMUYsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxXQUFXLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDeEQsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDL0Msc0NBQXNDO1FBQ3RDLElBQUksT0FBTyxFQUFFLENBQUM7WUFDYixPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssR0FBRyxXQUFXLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDMUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQztnQkFDL0IsT0FBTztnQkFDUCxLQUFLLEVBQUUsV0FBVztnQkFDbEIsTUFBTSxFQUFFLE9BQU8sQ0FBQyxHQUFHO2dCQUNuQixJQUFJLDBDQUFrQzthQUN0QyxDQUFDLENBQUM7UUFDSixDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLDRDQUE0QyxDQUFDLENBQUM7WUFDckUsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7UUFDekIsQ0FBQztJQUNGLENBQUM7SUFFRDs7Ozs7T0FLRztJQUNLLGFBQWEsQ0FBQyxPQUFlLEVBQUUsV0FBd0IsRUFBRSxXQUFtQjtRQUNuRixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzFELDhGQUE4RjtRQUM5RixNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsS0FBSyxTQUFTLENBQUM7UUFDbEUsK0RBQStEO1FBQy9ELElBQUksQ0FBQyxLQUFLLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUM3QixJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztZQUN4QixPQUFPO1FBQ1IsQ0FBQztRQUNELE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxFQUFFLElBQUksQ0FBQztRQUNsRCxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDWCxPQUFPO1FBQ1IsQ0FBQztRQUNELDZDQUE2QztRQUM3QyxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssRUFBRSxXQUFXLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFDeEUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXLEVBQUUsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ3ZDLGdCQUFnQjtRQUNoQixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLFdBQVcsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUN4RCxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsRUFBRSxLQUFLLEVBQUUsV0FBVyxFQUFFLEdBQUcsRUFBRSxTQUFTLEVBQUUsQ0FBQyxDQUFDO1FBRXZFLElBQUksV0FBVyxZQUFZLG9CQUFvQixFQUFFLENBQUM7WUFDakQsSUFBSSxDQUFDLDhCQUE4QixDQUFDLEdBQUcsQ0FBQyxXQUFXLEVBQUUsS0FBSyxDQUFDLG1CQUFtQixDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxHQUFHLEVBQUU7Z0JBQzFHLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUMvQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7b0JBQ2QsT0FBTztnQkFDUixDQUFDO2dCQUNELE9BQU8sQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxLQUFLLEVBQUUsV0FBVyxFQUFFLFdBQVcsQ0FBQyxDQUFDO2dCQUNwRSxJQUFJLENBQUMsTUFBTSxDQUFDLG1CQUFtQixDQUFDO29CQUMvQixPQUFPO29CQUNQLEtBQUssRUFBRSxXQUFXO29CQUNsQixNQUFNLEVBQUUsT0FBTyxDQUFDLEdBQUc7b0JBQ25CLElBQUksMENBQWtDO2lCQUN0QyxDQUFDLENBQUM7WUFDSixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztRQUVELElBQUksQ0FBQyxNQUFNLENBQUMsbUJBQW1CLENBQUM7WUFDL0IsT0FBTztZQUNQLEtBQUssRUFBRSxXQUFXO1lBQ2xCLE1BQU0sRUFBRSxTQUFTO1lBQ2pCLElBQUksd0NBQWdDO1NBQ3BDLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRDs7OztPQUlHO0lBQ0ssY0FBYyxDQUFDLE9BQWUsRUFBRSxXQUFtQjtRQUMxRCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzFELE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxFQUFFLElBQUksQ0FBQztRQUNsRCx3REFBd0Q7UUFDeEQsSUFBSSxDQUFDLEtBQUssSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ3JCLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1lBQ3hCLE9BQU87UUFDUixDQUFDO1FBQ0QsNkNBQTZDO1FBQzdDLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRS9DLHlEQUF5RDtRQUN6RCxJQUFJLFVBQVUsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDN0IsT0FBTztRQUNSLENBQUM7UUFFRCxnQkFBZ0I7UUFDaEIsSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUVwRCxJQUFJLFVBQVUsQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLFlBQVksb0JBQW9CLEVBQUUsQ0FBQztZQUMxRCxJQUFJLENBQUMsOEJBQThCLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQzVFLENBQUM7UUFFRCxJQUFJLENBQUMsTUFBTSxDQUFDLG1CQUFtQixDQUFDO1lBQy9CLE9BQU87WUFDUCxLQUFLLEVBQUUsV0FBVztZQUNsQixNQUFNLEVBQUUsVUFBVSxDQUFDLENBQUMsQ0FBQztZQUNyQixJQUFJLHlDQUFpQztTQUNyQyxDQUFDLENBQUM7SUFDSixDQUFDO0lBRUQ7Ozs7T0FJRztJQUNLLHFCQUFxQixDQUFDLE9BQWUsRUFBRSxXQUFtQjtRQUNqRSxtRkFBbUY7UUFDbkYsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEVBQUUsSUFBSSxDQUFDO1FBQ2xELElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNYLE9BQU87UUFDUixDQUFDO1FBQ0QsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQ3BDLCtFQUErRTtRQUMvRSxTQUFTLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQztRQUMxQixpQ0FBaUM7UUFDakMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQztZQUMvQixPQUFPO1lBQ1AsS0FBSyxFQUFFLFdBQVc7WUFDbEIsTUFBTSxFQUFFLFNBQVM7WUFDakIsSUFBSSwwQ0FBa0M7U0FDdEMsQ0FBQyxDQUFDO0lBRUosQ0FBQztJQUVEOzs7OztPQUtHO0lBQ0ssY0FBYyxDQUFDLE9BQWUsRUFBRSxXQUFtQixFQUFFLE1BQW1CO1FBQy9FLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ25ELE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQy9DLHFEQUFxRDtRQUNyRCxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDZCxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyw0Q0FBNEMsQ0FBQyxDQUFDO1lBQ3JFLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1lBQ3hCLE9BQU87UUFDUixDQUFDO1FBQ0QsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ3ZDLElBQUksQ0FBQyxNQUFNLENBQUMsbUJBQW1CLENBQUM7WUFDL0IsT0FBTztZQUNQLEtBQUssRUFBRSxXQUFXO1lBQ2xCLE1BQU0sRUFBRSxPQUFPLENBQUMsR0FBRztZQUNuQixJQUFJLDBDQUFrQztTQUN0QyxDQUFDLENBQUM7SUFDSixDQUFDO0lBRUQ7Ozs7O09BS0c7SUFDSyxrQkFBa0IsQ0FBQyxPQUFlLEVBQUUsV0FBbUIsRUFBRSxNQUFtQjtRQUNuRixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQztRQUNuRCxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUMvQyxNQUFNLEtBQUssR0FBRyxPQUFPLEVBQUUsS0FBSyxDQUFDO1FBQzdCLE1BQU0sR0FBRyxHQUFHLE9BQU8sRUFBRSxHQUFHLENBQUM7UUFDekIscURBQXFEO1FBQ3JELElBQUksQ0FBQyxLQUFLLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztZQUNwQixJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyw2Q0FBNkMsQ0FBQyxDQUFDO1lBQ3RFLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1lBQ3hCLE9BQU87UUFDUixDQUFDO1FBQ0QsMEVBQTBFO1FBQzFFLEdBQUcsQ0FBQyxRQUFRLEdBQUcsS0FBSyxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUMzQyxJQUFJLENBQUMsTUFBTSxDQUFDLG1CQUFtQixDQUFDO1lBQy9CLE9BQU87WUFDUCxLQUFLLEVBQUUsV0FBVztZQUNsQixNQUFNLEVBQUUsR0FBRztZQUNYLElBQUksMENBQWtDO1NBQ3RDLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRDs7Ozs7R0FLRTtJQUNNLHNCQUFzQixDQUFDLE9BQWUsRUFBRSxXQUFtQixFQUFFLE1BQW1CO1FBQ3ZGLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ25ELE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQy9DLE1BQU0sS0FBSyxHQUFHLE9BQU8sRUFBRSxLQUFLLENBQUM7UUFDN0IsTUFBTSxHQUFHLEdBQUcsT0FBTyxFQUFFLEdBQUcsQ0FBQztRQUN6QixxREFBcUQ7UUFDckQsSUFBSSxDQUFDLEtBQUssSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO1lBQ3BCLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLDZDQUE2QyxDQUFDLENBQUM7WUFDdEUsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7WUFDeEIsT0FBTztRQUNSLENBQUM7UUFDRCwwRUFBMEU7UUFDMUUsR0FBRyxDQUFDLFNBQVMsR0FBRyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDN0MsSUFBSSxDQUFDLE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQztZQUMvQixJQUFJLDBDQUFrQztZQUN0QyxPQUFPO1lBQ1AsTUFBTSxFQUFFLEdBQUc7WUFDWCxLQUFLLEVBQUUsV0FBVztTQUNsQixDQUFDLENBQUM7SUFDSixDQUFDO0lBRU8sYUFBYSxDQUFDLE9BQWUsRUFBRSxXQUFtQixFQUFFLGNBQXNCLEVBQUUsTUFBbUI7UUFDdEcsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEVBQUUsSUFBSSxDQUFDO1FBQ2xELHFEQUFxRDtRQUNyRCxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDWCxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQywyQ0FBMkMsQ0FBQyxDQUFDO1lBQ3BFLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1lBQ3hCLE9BQU87UUFDUixDQUFDO1FBRUQsdUNBQXVDO1FBQ3ZDLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsY0FBYyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ2xELElBQUksVUFBVSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUM3QixPQUFPO1FBQ1IsQ0FBQztRQUNELElBQUksQ0FBQyxNQUFNLENBQUMsV0FBVyxFQUFFLENBQUMsRUFBRSxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUUzQyx5QkFBeUI7UUFDekIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQztZQUMvQixJQUFJLHdDQUFnQztZQUNwQyxPQUFPO1lBQ1AsTUFBTSxFQUFFLFVBQVUsQ0FBQyxDQUFDLENBQUM7WUFDckIsS0FBSyxFQUFFLFdBQVc7WUFDbEIsUUFBUSxFQUFFLGNBQWM7U0FDeEIsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVEOztPQUVHO0lBQ0ssZ0JBQWdCO1FBQ3ZCLElBQUksSUFBSSxDQUFDLG9CQUFvQixDQUFDLE1BQU0sQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDbkQsT0FBTyxDQUFDLDZIQUE2SDtRQUN0SSxDQUFDO1FBRUQsSUFBSSxDQUFDLGNBQWMsR0FBRyxFQUFFLENBQUM7UUFDekIsSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUMxQixJQUFJLENBQUMsY0FBYyxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQzVCLElBQUksSUFBSSxHQUFvQixFQUFFLENBQUM7UUFDL0IsS0FBSyxNQUFNLEtBQUssSUFBSSxJQUFJLENBQUMsb0JBQW9CLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDdEQsTUFBTSxvQkFBb0IsR0FBdUI7Z0JBQ2hELE9BQU8sRUFBRSxLQUFLLENBQUMsRUFBRTtnQkFDakIsUUFBUSxFQUFFLEtBQUssQ0FBQyxFQUFFLEtBQUssSUFBSSxDQUFDLG9CQUFvQixDQUFDLFdBQVcsQ0FBQyxFQUFFO2dCQUMvRCxVQUFVLEVBQUUsbUJBQW1CLENBQUMsSUFBSSxDQUFDLG9CQUFvQixFQUFFLEtBQUssQ0FBQztnQkFDakUsSUFBSSxFQUFFLEVBQUU7YUFDUixDQUFDO1lBQ0YsS0FBSyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxNQUFNLEVBQUUsV0FBVyxFQUFFLEVBQUU7Z0JBQzdDLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsS0FBSyxFQUFFLE1BQU0sRUFBRSxXQUFXLENBQUMsQ0FBQztnQkFDN0QsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDZiw4Q0FBOEM7Z0JBQzlDLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxFQUFFLENBQUMsRUFBRTtvQkFDOUQsS0FBSztvQkFDTCxHQUFHO29CQUNILFdBQVcsRUFBRSxNQUFNO2lCQUNuQixDQUFDLENBQUM7WUFDSixDQUFDLENBQUMsQ0FBQztZQUNILG9CQUFvQixDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7WUFDakMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsQ0FBQztZQUMvQyxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxFQUFFLG9CQUFvQixDQUFDLENBQUM7WUFDdEQsSUFBSSxHQUFHLEVBQUUsQ0FBQztRQUNYLENBQUM7UUFDRCx1Q0FBdUM7UUFDdkMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUM7SUFDeEQsQ0FBQztJQUVELHNFQUFzRTtJQUN0RSxtRkFBbUY7SUFDbkYseUJBQXlCO0lBQ3pCLHlCQUF5QjtJQUN6QixnRkFBZ0Y7SUFDaEYsb0ZBQW9GO0lBQ3BGLDhFQUE4RTtJQUM5RSxnRkFBZ0Y7SUFDaEYsa0ZBQWtGO0lBQ2xGLGdGQUFnRjtJQUNoRixrRkFBa0Y7SUFDbEYsa0ZBQWtGO0lBQ2xGLGtGQUFrRjtJQUNsRixrRkFBa0Y7SUFDbEYsb0ZBQW9GO0lBQ3BGLDZEQUE2RDtJQUM3RCxLQUFLO0lBQ0wsdUJBQXVCO0lBQ3ZCLElBQUk7SUFFSjs7O09BR0c7SUFDSyxnQkFBZ0IsQ0FBQyxXQUFnQztRQUN4RCxNQUFNLEtBQUssR0FBRyxXQUFXLENBQUMsS0FBSyxDQUFDO1FBQ2hDLE1BQU0sT0FBTyxHQUFHLFdBQVcsQ0FBQyxPQUFPLENBQUM7UUFDcEMsUUFBUSxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDcEI7Z0JBQ0MsSUFBSSxPQUFPLEtBQUssSUFBSSxDQUFDLG9CQUFvQixDQUFDLFdBQVcsQ0FBQyxFQUFFLEVBQUUsQ0FBQztvQkFDMUQsSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUM7b0JBQzNCLE1BQU07Z0JBQ1AsQ0FBQztxQkFBTSxDQUFDO29CQUNQLE9BQU87Z0JBQ1IsQ0FBQztZQUNGO2dCQUNDLElBQUksS0FBSyxDQUFDLE1BQU0sS0FBSyxTQUFTLElBQUksS0FBSyxDQUFDLFdBQVcsS0FBSyxTQUFTLEVBQUUsQ0FBQztvQkFDbkUsSUFBSSxDQUFDLG9CQUFvQixDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQztvQkFDcEUsTUFBTTtnQkFDUCxDQUFDO1lBQ0Y7Z0JBQ0MsSUFBSSxLQUFLLENBQUMsTUFBTSxLQUFLLFNBQVMsSUFBSSxLQUFLLENBQUMsV0FBVyxLQUFLLFNBQVMsRUFBRSxDQUFDO29CQUNuRSxJQUFJLENBQUMsYUFBYSxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQztvQkFDN0QsTUFBTTtnQkFDUCxDQUFDO1lBQ0Y7Z0JBQ0MsSUFBSSxLQUFLLENBQUMsV0FBVyxLQUFLLFNBQVMsRUFBRSxDQUFDO29CQUNyQyxJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUM7b0JBQ2hELE1BQU07Z0JBQ1AsQ0FBQztZQUNGO2dCQUNDLElBQUksS0FBSyxDQUFDLFdBQVcsS0FBSyxTQUFTLEVBQUUsQ0FBQztvQkFDckMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUM7b0JBQ3ZELE1BQU07Z0JBQ1AsQ0FBQztZQUNGO2dCQUNDLElBQUksS0FBSyxDQUFDLFdBQVcsS0FBSyxTQUFTLElBQUksS0FBSyxDQUFDLE1BQU0sS0FBSyxTQUFTLEVBQUUsQ0FBQztvQkFDbkUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLFdBQVcsRUFBRSxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUM7b0JBQzlELE1BQU07Z0JBQ1AsQ0FBQztZQUNGO2dCQUNDLElBQUksS0FBSyxDQUFDLFdBQVcsS0FBSyxTQUFTLElBQUksS0FBSyxDQUFDLE1BQU0sS0FBSyxTQUFTLEVBQUUsQ0FBQztvQkFDbkUsSUFBSSxDQUFDLGtCQUFrQixDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsV0FBVyxFQUFFLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQztvQkFDbEUsTUFBTTtnQkFDUCxDQUFDO1lBQ0Y7Z0JBQ0MsSUFBSSxLQUFLLENBQUMsV0FBVyxLQUFLLFNBQVMsSUFBSSxLQUFLLENBQUMsTUFBTSxLQUFLLFNBQVMsRUFBRSxDQUFDO29CQUNuRSxJQUFJLENBQUMsc0JBQXNCLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxXQUFXLEVBQUUsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDO29CQUN0RSxNQUFNO2dCQUNQLENBQUM7WUFDRjtnQkFDQyxtQ0FBbUM7Z0JBQ25DLE1BQU07WUFDUDtnQkFDQyxJQUFJLHNCQUFzQixDQUFDLEtBQUssQ0FBQyxJQUFJLEtBQUssQ0FBQyxNQUFNLElBQUksS0FBSyxDQUFDLFdBQVcsS0FBSyxTQUFTLElBQUksS0FBSyxDQUFDLGNBQWMsS0FBSyxTQUFTLEVBQUUsQ0FBQztvQkFDNUgsSUFBSSxDQUFDLGFBQWEsQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLFdBQVcsRUFBRSxLQUFLLENBQUMsY0FBYyxFQUFFLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQztvQkFDbkYsTUFBTTtnQkFDUCxDQUFDO1lBQ0Y7Z0JBQ0MsdUVBQXVFO2dCQUN2RSxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztRQUMxQixDQUFDO0lBQ0YsQ0FBQztJQUNELHlDQUF5QztJQUN6QyxRQUFRLENBQUMsS0FBYSxFQUFFLEtBQWEsRUFBRSxVQUE2QixFQUFFLGFBQXVCO1FBQzVGLE1BQU0sT0FBTyxHQUFHLG1CQUFtQixDQUFDLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxJQUFJLENBQUMscUJBQXFCLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDdkcsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDL0MsTUFBTSxHQUFHLEdBQUcsT0FBTyxFQUFFLEdBQUcsQ0FBQztRQUN6QixJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7WUFDVixNQUFNLElBQUksS0FBSyxDQUFDLGtDQUFrQyxLQUFLLHVCQUF1QixDQUFDLENBQUM7UUFDakYsQ0FBQztRQUNELElBQUksV0FBcUMsQ0FBQztRQUMxQyxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDekUsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ2xCLE9BQU87UUFDUixDQUFDO1FBQ0QsK0ZBQStGO1FBQy9GLElBQUksSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDbEQsSUFBSSxTQUFTLCtCQUF1QixDQUFDO1lBQ3JDLDJEQUEyRDtZQUMzRCxJQUFJLFVBQVUsS0FBSyxVQUFVLEVBQUUsQ0FBQztnQkFDL0IsU0FBUyxHQUFHLGlDQUFpQyxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO1lBQzNFLENBQUM7WUFDRCxXQUFXLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQzVJLENBQUM7YUFBTSxDQUFDO1lBQ1AsV0FBVyxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDM0QsQ0FBQztRQUNELElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUNsQixPQUFPO1FBQ1IsQ0FBQztRQUVELG9FQUFvRTtRQUNwRSxJQUFJLEtBQUssR0FBRyxDQUFDLElBQUksS0FBSyxHQUFHLFdBQVcsQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDckQsS0FBSyxHQUFHLFdBQVcsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDO1FBQ3BDLENBQUM7UUFDRCxrREFBa0Q7UUFDbEQsTUFBTSxXQUFXLEdBQUcsT0FBTyxFQUFFLFdBQVcsQ0FBQztRQUN6QyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDbEIsT0FBTztRQUNSLENBQUM7UUFDRCxzQ0FBc0M7UUFDdEMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxXQUFXLEVBQUUsV0FBVyxFQUFFLEVBQUUsS0FBSyxFQUFFLGFBQWEsRUFBRSxDQUFDLENBQUM7UUFDM0UsT0FBTztJQUNSLENBQUM7SUFFRCxLQUFLLENBQUMsU0FBUyxDQUFDLE1BQWdCLEVBQUUsYUFBdUI7UUFDeEQsTUFBTSxNQUFNLEdBQXFDLElBQUksR0FBRyxFQUFFLENBQUM7UUFDM0QsS0FBSyxNQUFNLEtBQUssSUFBSSxNQUFNLEVBQUUsQ0FBQztZQUM1QixNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUMvQyxNQUFNLEdBQUcsR0FBRyxPQUFPLEVBQUUsR0FBRyxDQUFDO1lBQ3pCLE1BQU0sS0FBSyxHQUFHLE9BQU8sRUFBRSxLQUFLLENBQUM7WUFDN0IsTUFBTSxTQUFTLEdBQUcsT0FBTyxFQUFFLFdBQVcsQ0FBQztZQUN2QyxvQkFBb0I7WUFDcEIsSUFBSSxDQUFDLEtBQUssSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLE9BQU8sSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO2dCQUM5QyxTQUFTO1lBQ1YsQ0FBQztZQUNELE1BQU0sWUFBWSxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDdkMsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO2dCQUNuQixNQUFNLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7WUFDaEMsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLFlBQVksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDOUIsQ0FBQztRQUNGLENBQUM7UUFDRCx5REFBeUQ7UUFDekQsTUFBTSxPQUFPLEdBQWMsRUFBRSxDQUFDO1FBQzlCLEtBQUssTUFBTSxDQUFDLEtBQUssRUFBRSxPQUFPLENBQUMsSUFBSSxNQUFNLEVBQUUsQ0FBQztZQUN2QyxPQUFPLENBQUMsSUFBSSxDQUFDLE1BQU0sS0FBSyxDQUFDLFlBQVksQ0FBQyxPQUFPLEVBQUUsRUFBRSxhQUFhLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDcEUsQ0FBQztRQUNELG9GQUFvRjtRQUNwRixPQUFPLE9BQU8sQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUN4QyxDQUFDO0lBRUQsS0FBSyxDQUFDLFdBQVcsQ0FBQyxRQUFrQixFQUFFLGFBQXVCO1FBQzVELE1BQU0saUJBQWlCLEdBQWMsRUFBRSxDQUFDO1FBQ3hDLEtBQUssTUFBTSxPQUFPLElBQUksUUFBUSxFQUFFLENBQUM7WUFDaEMsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUMxRCxJQUFJLEtBQUssRUFBRSxDQUFDO2dCQUNYLGlCQUFpQixDQUFDLElBQUksQ0FBQyxNQUFNLEtBQUssQ0FBQyxlQUFlLEVBQUUsQ0FBQyxDQUFDO2dCQUN0RCw4REFBOEQ7Z0JBQzlELElBQUksS0FBSyxDQUFDLEtBQUssS0FBSyxDQUFDLElBQUksSUFBSSxDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQztvQkFDdkUsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQztnQkFDOUMsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO1FBQ0QsT0FBTyxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUNsRCxDQUFDO0NBRUQsQ0FBQTtBQXZwQlksb0JBQW9CO0lBRGhDLG9CQUFvQixDQUFDLFdBQVcsQ0FBQyxvQkFBb0IsQ0FBQztJQWdCcEQsV0FBQSxvQkFBb0IsQ0FBQTtJQUNwQixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsV0FBVyxDQUFBO0lBQ1gsV0FBQSxjQUFjLENBQUE7R0FsQkosb0JBQW9CLENBdXBCaEMifQ==