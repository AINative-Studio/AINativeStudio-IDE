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
var EditorPart_1;
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { Part } from '../../part.js';
import { Dimension, $, EventHelper, addDisposableGenericMouseDownListener, getWindow, isAncestorOfActiveElement, getActiveElement, isHTMLElement } from '../../../../base/browser/dom.js';
import { Event, Emitter, Relay, PauseableEmitter } from '../../../../base/common/event.js';
import { contrastBorder, editorBackground } from '../../../../platform/theme/common/colorRegistry.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { orthogonal, SerializableGrid, Sizing, isGridBranchNode, createSerializedGrid } from '../../../../base/browser/ui/grid/grid.js';
import { EDITOR_GROUP_BORDER, EDITOR_PANE_BACKGROUND } from '../../../common/theme.js';
import { distinct, coalesce } from '../../../../base/common/arrays.js';
import { getEditorPartOptions, impactsEditorPartOptions } from './editor.js';
import { EditorGroupView } from './editorGroupView.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { dispose, toDisposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { isSerializedEditorGroupModel } from '../../../common/editor/editorGroupModel.js';
import { EditorDropTarget } from './editorDropTarget.js';
import { Color } from '../../../../base/common/color.js';
import { CenteredViewLayout } from '../../../../base/browser/ui/centered/centeredViewLayout.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { IWorkbenchLayoutService } from '../../../services/layout/browser/layoutService.js';
import { assertIsDefined, assertType } from '../../../../base/common/types.js';
import { CompositeDragAndDropObserver } from '../../dnd.js';
import { DeferredPromise, Promises } from '../../../../base/common/async.js';
import { findGroup } from '../../../services/editor/common/editorGroupFinder.js';
import { SIDE_GROUP } from '../../../services/editor/common/editorService.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { ServiceCollection } from '../../../../platform/instantiation/common/serviceCollection.js';
import { EditorPartMaximizedEditorGroupContext, EditorPartMultipleEditorGroupsContext, IsAuxiliaryEditorPartContext } from '../../../common/contextkeys.js';
import { mainWindow } from '../../../../base/browser/window.js';
class GridWidgetView {
    constructor() {
        this.element = $('.grid-view-container');
        this._onDidChange = new Relay();
        this.onDidChange = this._onDidChange.event;
    }
    get minimumWidth() { return this.gridWidget ? this.gridWidget.minimumWidth : 0; }
    get maximumWidth() { return this.gridWidget ? this.gridWidget.maximumWidth : Number.POSITIVE_INFINITY; }
    get minimumHeight() { return this.gridWidget ? this.gridWidget.minimumHeight : 0; }
    get maximumHeight() { return this.gridWidget ? this.gridWidget.maximumHeight : Number.POSITIVE_INFINITY; }
    get gridWidget() {
        return this._gridWidget;
    }
    set gridWidget(grid) {
        this.element.innerText = '';
        if (grid) {
            this.element.appendChild(grid.element);
            this._onDidChange.input = grid.onDidChange;
        }
        else {
            this._onDidChange.input = Event.None;
        }
        this._gridWidget = grid;
    }
    layout(width, height, top, left) {
        this.gridWidget?.layout(width, height, top, left);
    }
    dispose() {
        this._onDidChange.dispose();
    }
}
let EditorPart = class EditorPart extends Part {
    static { EditorPart_1 = this; }
    static { this.EDITOR_PART_UI_STATE_STORAGE_KEY = 'editorpart.state'; }
    static { this.EDITOR_PART_CENTERED_VIEW_STORAGE_KEY = 'editorpart.centeredview'; }
    constructor(editorPartsView, id, groupsLabel, windowId, instantiationService, themeService, configurationService, storageService, layoutService, hostService, contextKeyService) {
        super(id, { hasTitle: false }, themeService, storageService, layoutService);
        this.editorPartsView = editorPartsView;
        this.groupsLabel = groupsLabel;
        this.windowId = windowId;
        this.instantiationService = instantiationService;
        this.configurationService = configurationService;
        this.hostService = hostService;
        this.contextKeyService = contextKeyService;
        //#region Events
        this._onDidFocus = this._register(new Emitter());
        this.onDidFocus = this._onDidFocus.event;
        this._onDidLayout = this._register(new Emitter());
        this.onDidLayout = this._onDidLayout.event;
        this._onDidChangeActiveGroup = this._register(new Emitter());
        this.onDidChangeActiveGroup = this._onDidChangeActiveGroup.event;
        this._onDidChangeGroupIndex = this._register(new Emitter());
        this.onDidChangeGroupIndex = this._onDidChangeGroupIndex.event;
        this._onDidChangeGroupLabel = this._register(new Emitter());
        this.onDidChangeGroupLabel = this._onDidChangeGroupLabel.event;
        this._onDidChangeGroupLocked = this._register(new Emitter());
        this.onDidChangeGroupLocked = this._onDidChangeGroupLocked.event;
        this._onDidChangeGroupMaximized = this._register(new Emitter());
        this.onDidChangeGroupMaximized = this._onDidChangeGroupMaximized.event;
        this._onDidActivateGroup = this._register(new Emitter());
        this.onDidActivateGroup = this._onDidActivateGroup.event;
        this._onDidAddGroup = this._register(new PauseableEmitter());
        this.onDidAddGroup = this._onDidAddGroup.event;
        this._onDidRemoveGroup = this._register(new PauseableEmitter());
        this.onDidRemoveGroup = this._onDidRemoveGroup.event;
        this._onDidMoveGroup = this._register(new Emitter());
        this.onDidMoveGroup = this._onDidMoveGroup.event;
        this.onDidSetGridWidget = this._register(new Emitter());
        this._onDidChangeSizeConstraints = this._register(new Relay());
        this.onDidChangeSizeConstraints = Event.any(this.onDidSetGridWidget.event, this._onDidChangeSizeConstraints.event);
        this._onDidScroll = this._register(new Relay());
        this.onDidScroll = Event.any(this.onDidSetGridWidget.event, this._onDidScroll.event);
        this._onDidChangeEditorPartOptions = this._register(new Emitter());
        this.onDidChangeEditorPartOptions = this._onDidChangeEditorPartOptions.event;
        this._onWillDispose = this._register(new Emitter());
        this.onWillDispose = this._onWillDispose.event;
        //#endregion
        this.workspaceMemento = this.getMemento(1 /* StorageScope.WORKSPACE */, 0 /* StorageTarget.USER */);
        this.profileMemento = this.getMemento(0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        this.groupViews = new Map();
        this.mostRecentActiveGroups = [];
        this.gridWidgetDisposables = this._register(new DisposableStore());
        this.gridWidgetView = this._register(new GridWidgetView());
        this.enforcedPartOptions = [];
        this.top = 0;
        this.left = 0;
        this.sideGroup = {
            openEditor: (editor, options) => {
                const [group] = this.scopedInstantiationService.invokeFunction(accessor => findGroup(accessor, { editor, options }, SIDE_GROUP));
                return group.openEditor(editor, options);
            }
        };
        this._isReady = false;
        this.whenReadyPromise = new DeferredPromise();
        this.whenReady = this.whenReadyPromise.p;
        this.whenRestoredPromise = new DeferredPromise();
        this.whenRestored = this.whenRestoredPromise.p;
        this._willRestoreState = false;
        this.priority = 2 /* LayoutPriority.High */;
        this._partOptions = getEditorPartOptions(this.configurationService, this.themeService);
        this.registerListeners();
    }
    registerListeners() {
        this._register(this.configurationService.onDidChangeConfiguration(e => this.onConfigurationUpdated(e)));
        this._register(this.themeService.onDidFileIconThemeChange(() => this.handleChangedPartOptions()));
        this._register(this.onDidChangeMementoValue(1 /* StorageScope.WORKSPACE */, this._store)(e => this.onDidChangeMementoState(e)));
    }
    onConfigurationUpdated(event) {
        if (impactsEditorPartOptions(event)) {
            this.handleChangedPartOptions();
        }
    }
    handleChangedPartOptions() {
        const oldPartOptions = this._partOptions;
        const newPartOptions = getEditorPartOptions(this.configurationService, this.themeService);
        for (const enforcedPartOptions of this.enforcedPartOptions) {
            Object.assign(newPartOptions, enforcedPartOptions); // check for overrides
        }
        this._partOptions = newPartOptions;
        this._onDidChangeEditorPartOptions.fire({ oldPartOptions, newPartOptions });
    }
    get partOptions() { return this._partOptions; }
    enforcePartOptions(options) {
        this.enforcedPartOptions.push(options);
        this.handleChangedPartOptions();
        return toDisposable(() => {
            this.enforcedPartOptions.splice(this.enforcedPartOptions.indexOf(options), 1);
            this.handleChangedPartOptions();
        });
    }
    get contentDimension() { return this._contentDimension; }
    get activeGroup() {
        return this._activeGroup;
    }
    get groups() {
        return Array.from(this.groupViews.values());
    }
    get count() {
        return this.groupViews.size;
    }
    get orientation() {
        return (this.gridWidget && this.gridWidget.orientation === 0 /* Orientation.VERTICAL */) ? 1 /* GroupOrientation.VERTICAL */ : 0 /* GroupOrientation.HORIZONTAL */;
    }
    get isReady() { return this._isReady; }
    get hasRestorableState() {
        return !!this.workspaceMemento[EditorPart_1.EDITOR_PART_UI_STATE_STORAGE_KEY];
    }
    get willRestoreState() { return this._willRestoreState; }
    getGroups(order = 0 /* GroupsOrder.CREATION_TIME */) {
        switch (order) {
            case 0 /* GroupsOrder.CREATION_TIME */:
                return this.groups;
            case 1 /* GroupsOrder.MOST_RECENTLY_ACTIVE */: {
                const mostRecentActive = coalesce(this.mostRecentActiveGroups.map(groupId => this.getGroup(groupId)));
                // there can be groups that got never active, even though they exist. in this case
                // make sure to just append them at the end so that all groups are returned properly
                return distinct([...mostRecentActive, ...this.groups]);
            }
            case 2 /* GroupsOrder.GRID_APPEARANCE */: {
                const views = [];
                if (this.gridWidget) {
                    this.fillGridNodes(views, this.gridWidget.getViews());
                }
                return views;
            }
        }
    }
    fillGridNodes(target, node) {
        if (isGridBranchNode(node)) {
            node.children.forEach(child => this.fillGridNodes(target, child));
        }
        else {
            target.push(node.view);
        }
    }
    hasGroup(identifier) {
        return this.groupViews.has(identifier);
    }
    getGroup(identifier) {
        return this.groupViews.get(identifier);
    }
    findGroup(scope, source = this.activeGroup, wrap) {
        // by direction
        if (typeof scope.direction === 'number') {
            return this.doFindGroupByDirection(scope.direction, source, wrap);
        }
        // by location
        if (typeof scope.location === 'number') {
            return this.doFindGroupByLocation(scope.location, source, wrap);
        }
        throw new Error('invalid arguments');
    }
    doFindGroupByDirection(direction, source, wrap) {
        const sourceGroupView = this.assertGroupView(source);
        // Find neighbours and sort by our MRU list
        const neighbours = this.gridWidget.getNeighborViews(sourceGroupView, this.toGridViewDirection(direction), wrap);
        neighbours.sort(((n1, n2) => this.mostRecentActiveGroups.indexOf(n1.id) - this.mostRecentActiveGroups.indexOf(n2.id)));
        return neighbours[0];
    }
    doFindGroupByLocation(location, source, wrap) {
        const sourceGroupView = this.assertGroupView(source);
        const groups = this.getGroups(2 /* GroupsOrder.GRID_APPEARANCE */);
        const index = groups.indexOf(sourceGroupView);
        switch (location) {
            case 0 /* GroupLocation.FIRST */:
                return groups[0];
            case 1 /* GroupLocation.LAST */:
                return groups[groups.length - 1];
            case 2 /* GroupLocation.NEXT */: {
                let nextGroup = groups[index + 1];
                if (!nextGroup && wrap) {
                    nextGroup = this.doFindGroupByLocation(0 /* GroupLocation.FIRST */, source);
                }
                return nextGroup;
            }
            case 3 /* GroupLocation.PREVIOUS */: {
                let previousGroup = groups[index - 1];
                if (!previousGroup && wrap) {
                    previousGroup = this.doFindGroupByLocation(1 /* GroupLocation.LAST */, source);
                }
                return previousGroup;
            }
        }
    }
    activateGroup(group, preserveWindowOrder) {
        const groupView = this.assertGroupView(group);
        this.doSetGroupActive(groupView);
        // Ensure window on top unless disabled
        if (!preserveWindowOrder) {
            this.hostService.moveTop(getWindow(this.element));
        }
        return groupView;
    }
    restoreGroup(group) {
        const groupView = this.assertGroupView(group);
        this.doRestoreGroup(groupView);
        return groupView;
    }
    getSize(group) {
        const groupView = this.assertGroupView(group);
        return this.gridWidget.getViewSize(groupView);
    }
    setSize(group, size) {
        const groupView = this.assertGroupView(group);
        this.gridWidget.resizeView(groupView, size);
    }
    arrangeGroups(arrangement, target = this.activeGroup) {
        if (this.count < 2) {
            return; // require at least 2 groups to show
        }
        if (!this.gridWidget) {
            return; // we have not been created yet
        }
        const groupView = this.assertGroupView(target);
        switch (arrangement) {
            case 2 /* GroupsArrangement.EVEN */:
                this.gridWidget.distributeViewSizes();
                break;
            case 0 /* GroupsArrangement.MAXIMIZE */:
                if (this.groups.length < 2) {
                    return; // need at least 2 groups to be maximized
                }
                this.gridWidget.maximizeView(groupView);
                groupView.focus();
                break;
            case 1 /* GroupsArrangement.EXPAND */:
                this.gridWidget.expandView(groupView);
                break;
        }
    }
    toggleMaximizeGroup(target = this.activeGroup) {
        if (this.hasMaximizedGroup()) {
            this.unmaximizeGroup();
        }
        else {
            this.arrangeGroups(0 /* GroupsArrangement.MAXIMIZE */, target);
        }
    }
    toggleExpandGroup(target = this.activeGroup) {
        if (this.isGroupExpanded(this.activeGroup)) {
            this.arrangeGroups(2 /* GroupsArrangement.EVEN */);
        }
        else {
            this.arrangeGroups(1 /* GroupsArrangement.EXPAND */, target);
        }
    }
    unmaximizeGroup() {
        this.gridWidget.exitMaximizedView();
        this._activeGroup.focus(); // When making views visible the focus can be affected, so restore it
    }
    hasMaximizedGroup() {
        return this.gridWidget.hasMaximizedView();
    }
    isGroupMaximized(targetGroup) {
        return this.gridWidget.isViewMaximized(targetGroup);
    }
    isGroupExpanded(targetGroup) {
        return this.gridWidget.isViewExpanded(targetGroup);
    }
    setGroupOrientation(orientation) {
        if (!this.gridWidget) {
            return; // we have not been created yet
        }
        const newOrientation = (orientation === 0 /* GroupOrientation.HORIZONTAL */) ? 1 /* Orientation.HORIZONTAL */ : 0 /* Orientation.VERTICAL */;
        if (this.gridWidget.orientation !== newOrientation) {
            this.gridWidget.orientation = newOrientation;
        }
    }
    applyLayout(layout) {
        const restoreFocus = this.shouldRestoreFocus(this.container);
        // Determine how many groups we need overall
        let layoutGroupsCount = 0;
        function countGroups(groups) {
            for (const group of groups) {
                if (Array.isArray(group.groups)) {
                    countGroups(group.groups);
                }
                else {
                    layoutGroupsCount++;
                }
            }
        }
        countGroups(layout.groups);
        // If we currently have too many groups, merge them into the last one
        let currentGroupViews = this.getGroups(2 /* GroupsOrder.GRID_APPEARANCE */);
        if (layoutGroupsCount < currentGroupViews.length) {
            const lastGroupInLayout = currentGroupViews[layoutGroupsCount - 1];
            currentGroupViews.forEach((group, index) => {
                if (index >= layoutGroupsCount) {
                    this.mergeGroup(group, lastGroupInLayout);
                }
            });
            currentGroupViews = this.getGroups(2 /* GroupsOrder.GRID_APPEARANCE */);
        }
        const activeGroup = this.activeGroup;
        // Prepare grid descriptor to create new grid from
        const gridDescriptor = createSerializedGrid({
            orientation: this.toGridViewOrientation(layout.orientation, this.isTwoDimensionalGrid() ?
                this.gridWidget.orientation : // preserve original orientation for 2-dimensional grids
                orthogonal(this.gridWidget.orientation) // otherwise flip (fix https://github.com/microsoft/vscode/issues/52975)
            ),
            groups: layout.groups
        });
        // Recreate gridwidget with descriptor
        this.doApplyGridState(gridDescriptor, activeGroup.id, currentGroupViews);
        // Restore focus as needed
        if (restoreFocus) {
            this._activeGroup.focus();
        }
    }
    getLayout() {
        // Example return value:
        // { orientation: 0, groups: [ { groups: [ { size: 0.4 }, { size: 0.6 } ], size: 0.5 }, { groups: [ {}, {} ], size: 0.5 } ] }
        const serializedGrid = this.gridWidget.serialize();
        const orientation = serializedGrid.orientation === 1 /* Orientation.HORIZONTAL */ ? 0 /* GroupOrientation.HORIZONTAL */ : 1 /* GroupOrientation.VERTICAL */;
        const root = this.serializedNodeToGroupLayoutArgument(serializedGrid.root);
        return {
            orientation,
            groups: root.groups
        };
    }
    serializedNodeToGroupLayoutArgument(serializedNode) {
        if (serializedNode.type === 'branch') {
            return {
                size: serializedNode.size,
                groups: serializedNode.data.map(node => this.serializedNodeToGroupLayoutArgument(node))
            };
        }
        return { size: serializedNode.size };
    }
    shouldRestoreFocus(target) {
        if (!target) {
            return false;
        }
        const activeElement = getActiveElement();
        if (activeElement === target.ownerDocument.body) {
            return true; // always restore focus if nothing is focused currently
        }
        // otherwise check for the active element being an ancestor of the target
        return isAncestorOfActiveElement(target);
    }
    isTwoDimensionalGrid() {
        const views = this.gridWidget.getViews();
        if (isGridBranchNode(views)) {
            // the grid is 2-dimensional if any children
            // of the grid is a branch node
            return views.children.some(child => isGridBranchNode(child));
        }
        return false;
    }
    addGroup(location, direction, groupToCopy) {
        const locationView = this.assertGroupView(location);
        let newGroupView;
        // Same groups view: add to grid widget directly
        if (locationView.groupsView === this) {
            const restoreFocus = this.shouldRestoreFocus(locationView.element);
            const shouldExpand = this.groupViews.size > 1 && this.isGroupExpanded(locationView);
            newGroupView = this.doCreateGroupView(groupToCopy);
            // Add to grid widget
            this.gridWidget.addView(newGroupView, this.getSplitSizingStyle(), locationView, this.toGridViewDirection(direction));
            // Update container
            this.updateContainer();
            // Event
            this._onDidAddGroup.fire(newGroupView);
            // Notify group index change given a new group was added
            this.notifyGroupIndexChange();
            // Expand new group, if the reference view was previously expanded
            if (shouldExpand) {
                this.arrangeGroups(1 /* GroupsArrangement.EXPAND */, newGroupView);
            }
            // Restore focus if we had it previously after completing the grid
            // operation. That operation might cause reparenting of grid views
            // which moves focus to the <body> element otherwise.
            if (restoreFocus) {
                locationView.focus();
            }
        }
        // Different group view: add to grid widget of that group
        else {
            newGroupView = locationView.groupsView.addGroup(locationView, direction, groupToCopy);
        }
        return newGroupView;
    }
    getSplitSizingStyle() {
        switch (this._partOptions.splitSizing) {
            case 'distribute':
                return Sizing.Distribute;
            case 'split':
                return Sizing.Split;
            default:
                return Sizing.Auto;
        }
    }
    doCreateGroupView(from, options) {
        // Create group view
        let groupView;
        if (from instanceof EditorGroupView) {
            groupView = EditorGroupView.createCopy(from, this.editorPartsView, this, this.groupsLabel, this.count, this.scopedInstantiationService, options);
        }
        else if (isSerializedEditorGroupModel(from)) {
            groupView = EditorGroupView.createFromSerialized(from, this.editorPartsView, this, this.groupsLabel, this.count, this.scopedInstantiationService, options);
        }
        else {
            groupView = EditorGroupView.createNew(this.editorPartsView, this, this.groupsLabel, this.count, this.scopedInstantiationService, options);
        }
        // Keep in map
        this.groupViews.set(groupView.id, groupView);
        // Track focus
        const groupDisposables = new DisposableStore();
        groupDisposables.add(groupView.onDidFocus(() => {
            this.doSetGroupActive(groupView);
            this._onDidFocus.fire();
        }));
        // Track group changes
        groupDisposables.add(groupView.onDidModelChange(e => {
            switch (e.kind) {
                case 3 /* GroupModelChangeKind.GROUP_LOCKED */:
                    this._onDidChangeGroupLocked.fire(groupView);
                    break;
                case 1 /* GroupModelChangeKind.GROUP_INDEX */:
                    this._onDidChangeGroupIndex.fire(groupView);
                    break;
                case 2 /* GroupModelChangeKind.GROUP_LABEL */:
                    this._onDidChangeGroupLabel.fire(groupView);
                    break;
            }
        }));
        // Track active editor change after it occurred
        groupDisposables.add(groupView.onDidActiveEditorChange(() => {
            this.updateContainer();
        }));
        // Track dispose
        Event.once(groupView.onWillDispose)(() => {
            dispose(groupDisposables);
            this.groupViews.delete(groupView.id);
            this.doUpdateMostRecentActive(groupView);
        });
        return groupView;
    }
    doSetGroupActive(group) {
        if (this._activeGroup !== group) {
            const previousActiveGroup = this._activeGroup;
            this._activeGroup = group;
            // Update list of most recently active groups
            this.doUpdateMostRecentActive(group, true);
            // Mark previous one as inactive
            if (previousActiveGroup && !previousActiveGroup.disposed) {
                previousActiveGroup.setActive(false);
            }
            // Mark group as new active
            group.setActive(true);
            // Expand the group if it is currently minimized
            this.doRestoreGroup(group);
            // Event
            this._onDidChangeActiveGroup.fire(group);
        }
        // Always fire the event that a group has been activated
        // even if its the same group that is already active to
        // signal the intent even when nothing has changed.
        this._onDidActivateGroup.fire(group);
    }
    doRestoreGroup(group) {
        if (!this.gridWidget) {
            return; // method is called as part of state restore very early
        }
        try {
            if (this.hasMaximizedGroup() && !this.isGroupMaximized(group)) {
                this.unmaximizeGroup();
            }
            const viewSize = this.gridWidget.getViewSize(group);
            if (viewSize.width === group.minimumWidth || viewSize.height === group.minimumHeight) {
                this.arrangeGroups(1 /* GroupsArrangement.EXPAND */, group);
            }
        }
        catch (error) {
            // ignore: method might be called too early before view is known to grid
        }
    }
    doUpdateMostRecentActive(group, makeMostRecentlyActive) {
        const index = this.mostRecentActiveGroups.indexOf(group.id);
        // Remove from MRU list
        if (index !== -1) {
            this.mostRecentActiveGroups.splice(index, 1);
        }
        // Add to front as needed
        if (makeMostRecentlyActive) {
            this.mostRecentActiveGroups.unshift(group.id);
        }
    }
    toGridViewDirection(direction) {
        switch (direction) {
            case 0 /* GroupDirection.UP */: return 0 /* Direction.Up */;
            case 1 /* GroupDirection.DOWN */: return 1 /* Direction.Down */;
            case 2 /* GroupDirection.LEFT */: return 2 /* Direction.Left */;
            case 3 /* GroupDirection.RIGHT */: return 3 /* Direction.Right */;
        }
    }
    toGridViewOrientation(orientation, fallback) {
        if (typeof orientation === 'number') {
            return orientation === 0 /* GroupOrientation.HORIZONTAL */ ? 1 /* Orientation.HORIZONTAL */ : 0 /* Orientation.VERTICAL */;
        }
        return fallback;
    }
    removeGroup(group, preserveFocus) {
        const groupView = this.assertGroupView(group);
        if (this.count === 1) {
            return; // Cannot remove the last root group
        }
        // Remove empty group
        if (groupView.isEmpty) {
            this.doRemoveEmptyGroup(groupView, preserveFocus);
        }
        // Remove group with editors
        else {
            this.doRemoveGroupWithEditors(groupView);
        }
    }
    doRemoveGroupWithEditors(groupView) {
        const mostRecentlyActiveGroups = this.getGroups(1 /* GroupsOrder.MOST_RECENTLY_ACTIVE */);
        let lastActiveGroup;
        if (this._activeGroup === groupView) {
            lastActiveGroup = mostRecentlyActiveGroups[1];
        }
        else {
            lastActiveGroup = mostRecentlyActiveGroups[0];
        }
        // Removing a group with editors should merge these editors into the
        // last active group and then remove this group.
        this.mergeGroup(groupView, lastActiveGroup);
    }
    doRemoveEmptyGroup(groupView, preserveFocus) {
        const restoreFocus = !preserveFocus && this.shouldRestoreFocus(this.container);
        // Activate next group if the removed one was active
        if (this._activeGroup === groupView) {
            const mostRecentlyActiveGroups = this.getGroups(1 /* GroupsOrder.MOST_RECENTLY_ACTIVE */);
            const nextActiveGroup = mostRecentlyActiveGroups[1]; // [0] will be the current group we are about to dispose
            this.doSetGroupActive(nextActiveGroup);
        }
        // Remove from grid widget & dispose
        this.gridWidget.removeView(groupView, this.getSplitSizingStyle());
        groupView.dispose();
        // Restore focus if we had it previously after completing the grid
        // operation. That operation might cause reparenting of grid views
        // which moves focus to the <body> element otherwise.
        if (restoreFocus) {
            this._activeGroup.focus();
        }
        // Notify group index change given a group was removed
        this.notifyGroupIndexChange();
        // Update container
        this.updateContainer();
        // Event
        this._onDidRemoveGroup.fire(groupView);
    }
    moveGroup(group, location, direction) {
        const sourceView = this.assertGroupView(group);
        const targetView = this.assertGroupView(location);
        if (sourceView.id === targetView.id) {
            throw new Error('Cannot move group into its own');
        }
        const restoreFocus = this.shouldRestoreFocus(sourceView.element);
        let movedView;
        // Same groups view: move via grid widget API
        if (sourceView.groupsView === targetView.groupsView) {
            this.gridWidget.moveView(sourceView, this.getSplitSizingStyle(), targetView, this.toGridViewDirection(direction));
            movedView = sourceView;
        }
        // Different groups view: move via groups view API
        else {
            movedView = targetView.groupsView.addGroup(targetView, direction, sourceView);
            sourceView.closeAllEditors();
            this.removeGroup(sourceView, restoreFocus);
        }
        // Restore focus if we had it previously after completing the grid
        // operation. That operation might cause reparenting of grid views
        // which moves focus to the <body> element otherwise.
        if (restoreFocus) {
            movedView.focus();
        }
        // Event
        this._onDidMoveGroup.fire(movedView);
        // Notify group index change given a group was moved
        this.notifyGroupIndexChange();
        return movedView;
    }
    copyGroup(group, location, direction) {
        const groupView = this.assertGroupView(group);
        const locationView = this.assertGroupView(location);
        const restoreFocus = this.shouldRestoreFocus(groupView.element);
        // Copy the group view
        const copiedGroupView = this.addGroup(locationView, direction, groupView);
        // Restore focus if we had it
        if (restoreFocus) {
            copiedGroupView.focus();
        }
        return copiedGroupView;
    }
    mergeGroup(group, target, options) {
        const sourceView = this.assertGroupView(group);
        const targetView = this.assertGroupView(target);
        // Collect editors to move/copy
        const editors = [];
        let index = (options && typeof options.index === 'number') ? options.index : targetView.count;
        for (const editor of sourceView.editors) {
            const inactive = !sourceView.isActive(editor) || this._activeGroup !== sourceView;
            let actualIndex;
            if (targetView.contains(editor) &&
                (
                // Do not configure an `index` for editors that are sticky in
                // the target, otherwise there is a chance of losing that state
                // when the editor is moved.
                // See https://github.com/microsoft/vscode/issues/239549
                targetView.isSticky(editor) ||
                    // Do not configure an `index` when we are explicitly instructed
                    options?.preserveExistingIndex)) {
                // leave `index` as `undefined`
            }
            else {
                actualIndex = index;
                index++;
            }
            editors.push({
                editor,
                options: {
                    index: actualIndex,
                    inactive,
                    preserveFocus: inactive
                }
            });
        }
        // Move/Copy editors over into target
        let result = true;
        if (options?.mode === 0 /* MergeGroupMode.COPY_EDITORS */) {
            sourceView.copyEditors(editors, targetView);
        }
        else {
            result = sourceView.moveEditors(editors, targetView);
        }
        // Remove source if the view is now empty and not already removed
        if (sourceView.isEmpty && !sourceView.disposed /* could have been disposed already via workbench.editor.closeEmptyGroups setting */) {
            this.removeGroup(sourceView, true);
        }
        return result;
    }
    mergeAllGroups(target, options) {
        const targetView = this.assertGroupView(target);
        let result = true;
        for (const group of this.getGroups(1 /* GroupsOrder.MOST_RECENTLY_ACTIVE */)) {
            if (group === targetView) {
                continue; // keep target
            }
            const merged = this.mergeGroup(group, targetView, options);
            if (!merged) {
                result = false;
            }
        }
        return result;
    }
    assertGroupView(group) {
        let groupView;
        if (typeof group === 'number') {
            groupView = this.editorPartsView.getGroup(group);
        }
        else {
            groupView = group;
        }
        if (!groupView) {
            throw new Error('Invalid editor group provided!');
        }
        return groupView;
    }
    createEditorDropTarget(container, delegate) {
        assertType(isHTMLElement(container));
        return this.scopedInstantiationService.createInstance(EditorDropTarget, container, delegate);
    }
    //#region Part
    // TODO @sbatten @joao find something better to prevent editor taking over #79897
    get minimumWidth() { return Math.min(this.centeredLayoutWidget.minimumWidth, this.layoutService.getMaximumEditorDimensions(this.layoutService.getContainer(getWindow(this.container))).width); }
    get maximumWidth() { return this.centeredLayoutWidget.maximumWidth; }
    get minimumHeight() { return Math.min(this.centeredLayoutWidget.minimumHeight, this.layoutService.getMaximumEditorDimensions(this.layoutService.getContainer(getWindow(this.container))).height); }
    get maximumHeight() { return this.centeredLayoutWidget.maximumHeight; }
    get snap() { return this.layoutService.getPanelAlignment() === 'center'; }
    get onDidChange() { return Event.any(this.centeredLayoutWidget.onDidChange, this.onDidSetGridWidget.event); }
    get gridSeparatorBorder() {
        return this.theme.getColor(EDITOR_GROUP_BORDER) || this.theme.getColor(contrastBorder) || Color.transparent;
    }
    updateStyles() {
        const container = assertIsDefined(this.container);
        container.style.backgroundColor = this.getColor(editorBackground) || '';
        const separatorBorderStyle = { separatorBorder: this.gridSeparatorBorder, background: this.theme.getColor(EDITOR_PANE_BACKGROUND) || Color.transparent };
        this.gridWidget.style(separatorBorderStyle);
        this.centeredLayoutWidget.styles(separatorBorderStyle);
    }
    createContentArea(parent, options) {
        // Container
        this.element = parent;
        this.container = $('.content');
        if (this.windowId !== mainWindow.vscodeWindowId) {
            this.container.classList.add('auxiliary');
        }
        parent.appendChild(this.container);
        // Scoped instantiation service
        const scopedContextKeyService = this._register(this.contextKeyService.createScoped(this.container));
        this.scopedInstantiationService = this._register(this.instantiationService.createChild(new ServiceCollection([IContextKeyService, scopedContextKeyService])));
        // Grid control
        this._willRestoreState = !options || options.restorePreviousState;
        this.doCreateGridControl();
        // Centered layout widget
        this.centeredLayoutWidget = this._register(new CenteredViewLayout(this.container, this.gridWidgetView, this.profileMemento[EditorPart_1.EDITOR_PART_CENTERED_VIEW_STORAGE_KEY], this._partOptions.centeredLayoutFixedWidth));
        this._register(this.onDidChangeEditorPartOptions(e => this.centeredLayoutWidget.setFixedWidth(e.newPartOptions.centeredLayoutFixedWidth ?? false)));
        // Drag & Drop support
        this.setupDragAndDropSupport(parent, this.container);
        // Context keys
        this.handleContextKeys(scopedContextKeyService);
        // Signal ready
        this.whenReadyPromise.complete();
        this._isReady = true;
        // Signal restored
        Promises.settled(this.groups.map(group => group.whenRestored)).finally(() => {
            this.whenRestoredPromise.complete();
        });
        return this.container;
    }
    handleContextKeys(contextKeyService) {
        const isAuxiliaryEditorPartContext = IsAuxiliaryEditorPartContext.bindTo(contextKeyService);
        isAuxiliaryEditorPartContext.set(this.windowId !== mainWindow.vscodeWindowId);
        const multipleEditorGroupsContext = EditorPartMultipleEditorGroupsContext.bindTo(contextKeyService);
        const maximizedEditorGroupContext = EditorPartMaximizedEditorGroupContext.bindTo(contextKeyService);
        const updateContextKeys = () => {
            const groupCount = this.count;
            if (groupCount > 1) {
                multipleEditorGroupsContext.set(true);
            }
            else {
                multipleEditorGroupsContext.reset();
            }
            if (this.hasMaximizedGroup()) {
                maximizedEditorGroupContext.set(true);
            }
            else {
                maximizedEditorGroupContext.reset();
            }
        };
        updateContextKeys();
        this._register(this.onDidAddGroup(() => updateContextKeys()));
        this._register(this.onDidRemoveGroup(() => updateContextKeys()));
        this._register(this.onDidChangeGroupMaximized(() => updateContextKeys()));
    }
    setupDragAndDropSupport(parent, container) {
        // Editor drop target
        this._register(this.createEditorDropTarget(container, Object.create(null)));
        // No drop in the editor
        const overlay = $('.drop-block-overlay');
        parent.appendChild(overlay);
        // Hide the block if a mouse down event occurs #99065
        this._register(addDisposableGenericMouseDownListener(overlay, () => overlay.classList.remove('visible')));
        this._register(CompositeDragAndDropObserver.INSTANCE.registerTarget(this.element, {
            onDragStart: e => overlay.classList.add('visible'),
            onDragEnd: e => overlay.classList.remove('visible')
        }));
        let horizontalOpenerTimeout;
        let verticalOpenerTimeout;
        let lastOpenHorizontalPosition;
        let lastOpenVerticalPosition;
        const openPartAtPosition = (position) => {
            if (!this.layoutService.isVisible("workbench.parts.panel" /* Parts.PANEL_PART */) && position === this.layoutService.getPanelPosition()) {
                this.layoutService.setPartHidden(false, "workbench.parts.panel" /* Parts.PANEL_PART */);
            }
            else if (!this.layoutService.isVisible("workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */) && position === (this.layoutService.getSideBarPosition() === 1 /* Position.RIGHT */ ? 0 /* Position.LEFT */ : 1 /* Position.RIGHT */)) {
                this.layoutService.setPartHidden(false, "workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */);
            }
        };
        const clearAllTimeouts = () => {
            if (horizontalOpenerTimeout) {
                clearTimeout(horizontalOpenerTimeout);
                horizontalOpenerTimeout = undefined;
            }
            if (verticalOpenerTimeout) {
                clearTimeout(verticalOpenerTimeout);
                verticalOpenerTimeout = undefined;
            }
        };
        this._register(CompositeDragAndDropObserver.INSTANCE.registerTarget(overlay, {
            onDragOver: e => {
                EventHelper.stop(e.eventData, true);
                if (e.eventData.dataTransfer) {
                    e.eventData.dataTransfer.dropEffect = 'none';
                }
                const boundingRect = overlay.getBoundingClientRect();
                let openHorizontalPosition = undefined;
                let openVerticalPosition = undefined;
                const proximity = 100;
                if (e.eventData.clientX < boundingRect.left + proximity) {
                    openHorizontalPosition = 0 /* Position.LEFT */;
                }
                if (e.eventData.clientX > boundingRect.right - proximity) {
                    openHorizontalPosition = 1 /* Position.RIGHT */;
                }
                if (e.eventData.clientY > boundingRect.bottom - proximity) {
                    openVerticalPosition = 2 /* Position.BOTTOM */;
                }
                if (e.eventData.clientY < boundingRect.top + proximity) {
                    openVerticalPosition = 3 /* Position.TOP */;
                }
                if (horizontalOpenerTimeout && openHorizontalPosition !== lastOpenHorizontalPosition) {
                    clearTimeout(horizontalOpenerTimeout);
                    horizontalOpenerTimeout = undefined;
                }
                if (verticalOpenerTimeout && openVerticalPosition !== lastOpenVerticalPosition) {
                    clearTimeout(verticalOpenerTimeout);
                    verticalOpenerTimeout = undefined;
                }
                if (!horizontalOpenerTimeout && openHorizontalPosition !== undefined) {
                    lastOpenHorizontalPosition = openHorizontalPosition;
                    horizontalOpenerTimeout = setTimeout(() => openPartAtPosition(openHorizontalPosition), 200);
                }
                if (!verticalOpenerTimeout && openVerticalPosition !== undefined) {
                    lastOpenVerticalPosition = openVerticalPosition;
                    verticalOpenerTimeout = setTimeout(() => openPartAtPosition(openVerticalPosition), 200);
                }
            },
            onDragLeave: () => clearAllTimeouts(),
            onDragEnd: () => clearAllTimeouts(),
            onDrop: () => clearAllTimeouts()
        }));
    }
    centerLayout(active) {
        this.centeredLayoutWidget.activate(active);
    }
    isLayoutCentered() {
        if (this.centeredLayoutWidget) {
            return this.centeredLayoutWidget.isActive();
        }
        return false;
    }
    doCreateGridControl() {
        // Grid Widget (with previous UI state)
        let restoreError = false;
        if (this._willRestoreState) {
            restoreError = !this.doCreateGridControlWithPreviousState();
        }
        // Grid Widget (no previous UI state or failed to restore)
        if (!this.gridWidget || restoreError) {
            const initialGroup = this.doCreateGroupView();
            this.doSetGridWidget(new SerializableGrid(initialGroup));
            // Ensure a group is active
            this.doSetGroupActive(initialGroup);
        }
        // Update container
        this.updateContainer();
        // Notify group index change we created the entire grid
        this.notifyGroupIndexChange();
    }
    doCreateGridControlWithPreviousState() {
        const state = this.loadState();
        if (state?.serializedGrid) {
            try {
                // MRU
                this.mostRecentActiveGroups = state.mostRecentActiveGroups;
                // Grid Widget
                this.doCreateGridControlWithState(state.serializedGrid, state.activeGroup);
            }
            catch (error) {
                // Log error
                onUnexpectedError(new Error(`Error restoring editor grid widget: ${error} (with state: ${JSON.stringify(state)})`));
                // Clear any state we have from the failing restore
                this.disposeGroups();
                return false; // failure
            }
        }
        return true; // success
    }
    doCreateGridControlWithState(serializedGrid, activeGroupId, editorGroupViewsToReuse, options) {
        // Determine group views to reuse if any
        let reuseGroupViews;
        if (editorGroupViewsToReuse) {
            reuseGroupViews = editorGroupViewsToReuse.slice(0); // do not modify original array
        }
        else {
            reuseGroupViews = [];
        }
        // Create new
        const groupViews = [];
        const gridWidget = SerializableGrid.deserialize(serializedGrid, {
            fromJSON: (serializedEditorGroup) => {
                let groupView;
                if (reuseGroupViews.length > 0) {
                    groupView = reuseGroupViews.shift();
                }
                else {
                    groupView = this.doCreateGroupView(serializedEditorGroup, options);
                }
                groupViews.push(groupView);
                if (groupView.id === activeGroupId) {
                    this.doSetGroupActive(groupView);
                }
                return groupView;
            }
        }, { styles: { separatorBorder: this.gridSeparatorBorder } });
        // If the active group was not found when restoring the grid
        // make sure to make at least one group active. We always need
        // an active group.
        if (!this._activeGroup) {
            this.doSetGroupActive(groupViews[0]);
        }
        // Validate MRU group views matches grid widget state
        if (this.mostRecentActiveGroups.some(groupId => !this.getGroup(groupId))) {
            this.mostRecentActiveGroups = groupViews.map(group => group.id);
        }
        // Set it
        this.doSetGridWidget(gridWidget);
    }
    doSetGridWidget(gridWidget) {
        let boundarySashes = {};
        if (this.gridWidget) {
            boundarySashes = this.gridWidget.boundarySashes;
            this.gridWidget.dispose();
        }
        this.gridWidget = gridWidget;
        this.gridWidget.boundarySashes = boundarySashes;
        this.gridWidgetView.gridWidget = gridWidget;
        this._onDidChangeSizeConstraints.input = gridWidget.onDidChange;
        this._onDidScroll.input = gridWidget.onDidScroll;
        this.gridWidgetDisposables.clear();
        this.gridWidgetDisposables.add(gridWidget.onDidChangeViewMaximized(maximized => this._onDidChangeGroupMaximized.fire(maximized)));
        this.onDidSetGridWidget.fire(undefined);
    }
    updateContainer() {
        const container = assertIsDefined(this.container);
        container.classList.toggle('empty', this.isEmpty);
    }
    notifyGroupIndexChange() {
        this.getGroups(2 /* GroupsOrder.GRID_APPEARANCE */).forEach((group, index) => group.notifyIndexChanged(index));
    }
    notifyGroupsLabelChange(newLabel) {
        for (const group of this.groups) {
            group.notifyLabelChanged(newLabel);
        }
    }
    get isEmpty() {
        return this.count === 1 && this._activeGroup.isEmpty;
    }
    setBoundarySashes(sashes) {
        this.gridWidget.boundarySashes = sashes;
        this.centeredLayoutWidget.boundarySashes = sashes;
    }
    layout(width, height, top, left) {
        this.top = top;
        this.left = left;
        // Layout contents
        const contentAreaSize = super.layoutContents(width, height).contentSize;
        // Layout editor container
        this.doLayout(Dimension.lift(contentAreaSize), top, left);
    }
    doLayout(dimension, top = this.top, left = this.left) {
        this._contentDimension = dimension;
        // Layout Grid
        this.centeredLayoutWidget.layout(this._contentDimension.width, this._contentDimension.height, top, left);
        // Event
        this._onDidLayout.fire(dimension);
    }
    saveState() {
        // Persist grid UI state
        if (this.gridWidget) {
            if (this.isEmpty) {
                delete this.workspaceMemento[EditorPart_1.EDITOR_PART_UI_STATE_STORAGE_KEY];
            }
            else {
                this.workspaceMemento[EditorPart_1.EDITOR_PART_UI_STATE_STORAGE_KEY] = this.createState();
            }
        }
        // Persist centered view state
        if (this.centeredLayoutWidget) {
            const centeredLayoutState = this.centeredLayoutWidget.state;
            if (this.centeredLayoutWidget.isDefault(centeredLayoutState)) {
                delete this.profileMemento[EditorPart_1.EDITOR_PART_CENTERED_VIEW_STORAGE_KEY];
            }
            else {
                this.profileMemento[EditorPart_1.EDITOR_PART_CENTERED_VIEW_STORAGE_KEY] = centeredLayoutState;
            }
        }
        super.saveState();
    }
    loadState() {
        return this.workspaceMemento[EditorPart_1.EDITOR_PART_UI_STATE_STORAGE_KEY];
    }
    createState() {
        return {
            serializedGrid: this.gridWidget.serialize(),
            activeGroup: this._activeGroup.id,
            mostRecentActiveGroups: this.mostRecentActiveGroups
        };
    }
    applyState(state, options) {
        if (state === 'empty') {
            return this.doApplyEmptyState();
        }
        else {
            return this.doApplyState(state, options);
        }
    }
    async doApplyState(state, options) {
        const groups = await this.doPrepareApplyState();
        // Pause add/remove events for groups during the duration of applying the state
        // This ensures that we can do this transition atomically with the new state
        // being ready when the events are fired. This is important because usually there
        // is never the state where no groups are present, but for this transition we
        // need to temporarily dispose all groups to restore the new set.
        this._onDidAddGroup.pause();
        this._onDidRemoveGroup.pause();
        this.disposeGroups();
        // MRU
        this.mostRecentActiveGroups = state.mostRecentActiveGroups;
        // Grid Widget
        try {
            this.doApplyGridState(state.serializedGrid, state.activeGroup, undefined, options);
        }
        finally {
            // It is very important to keep this order: first resume the events for
            // removed groups and then for added groups. Many listeners may store
            // groups in sets by their identifier and groups can have the same
            // identifier before and after.
            this._onDidRemoveGroup.resume();
            this._onDidAddGroup.resume();
        }
        // Restore editors that were not closed before and are now opened now
        await this.activeGroup.openEditors(groups
            .flatMap(group => group.editors)
            .filter(editor => this.editorPartsView.groups.every(groupView => !groupView.contains(editor)))
            .map(editor => ({
            editor, options: { pinned: true, preserveFocus: true, inactive: true }
        })));
    }
    async doApplyEmptyState() {
        await this.doPrepareApplyState();
        this.mergeAllGroups(this.activeGroup);
    }
    async doPrepareApplyState() {
        // Before disposing groups, try to close as many editors as
        // possible, but skip over those that would trigger a dialog
        // (for example when being dirty). This is to be able to later
        // restore these editors after state has been applied.
        const groups = this.getGroups(1 /* GroupsOrder.MOST_RECENTLY_ACTIVE */);
        for (const group of groups) {
            await group.closeAllEditors({ excludeConfirming: true });
        }
        return groups;
    }
    doApplyGridState(gridState, activeGroupId, editorGroupViewsToReuse, options) {
        // Recreate grid widget from state
        this.doCreateGridControlWithState(gridState, activeGroupId, editorGroupViewsToReuse, options);
        // Layout
        this.doLayout(this._contentDimension);
        // Update container
        this.updateContainer();
        // Events for groups that got added
        for (const groupView of this.getGroups(2 /* GroupsOrder.GRID_APPEARANCE */)) {
            if (!editorGroupViewsToReuse?.includes(groupView)) {
                this._onDidAddGroup.fire(groupView);
            }
        }
        // Notify group index change given layout has changed
        this.notifyGroupIndexChange();
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
    toJSON() {
        return {
            type: "workbench.parts.editor" /* Parts.EDITOR_PART */
        };
    }
    disposeGroups() {
        for (const group of this.groups) {
            group.dispose();
            this._onDidRemoveGroup.fire(group);
        }
        this.groupViews.clear();
        this.mostRecentActiveGroups = [];
    }
    dispose() {
        // Event
        this._onWillDispose.fire();
        // Forward to all groups
        this.disposeGroups();
        // Grid widget
        this.gridWidget?.dispose();
        super.dispose();
    }
};
EditorPart = EditorPart_1 = __decorate([
    __param(4, IInstantiationService),
    __param(5, IThemeService),
    __param(6, IConfigurationService),
    __param(7, IStorageService),
    __param(8, IWorkbenchLayoutService),
    __param(9, IHostService),
    __param(10, IContextKeyService)
], EditorPart);
export { EditorPart };
let MainEditorPart = class MainEditorPart extends EditorPart {
    constructor(editorPartsView, instantiationService, themeService, configurationService, storageService, layoutService, hostService, contextKeyService) {
        super(editorPartsView, "workbench.parts.editor" /* Parts.EDITOR_PART */, '', mainWindow.vscodeWindowId, instantiationService, themeService, configurationService, storageService, layoutService, hostService, contextKeyService);
    }
};
MainEditorPart = __decorate([
    __param(1, IInstantiationService),
    __param(2, IThemeService),
    __param(3, IConfigurationService),
    __param(4, IStorageService),
    __param(5, IWorkbenchLayoutService),
    __param(6, IHostService),
    __param(7, IContextKeyService)
], MainEditorPart);
export { MainEditorPart };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yUGFydC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYnJvd3Nlci9wYXJ0cy9lZGl0b3IvZWRpdG9yUGFydC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFDckMsT0FBTyxFQUFFLFNBQVMsRUFBRSxDQUFDLEVBQUUsV0FBVyxFQUFFLHFDQUFxQyxFQUFFLFNBQVMsRUFBRSx5QkFBeUIsRUFBRSxnQkFBZ0IsRUFBRSxhQUFhLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUMxTCxPQUFPLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUMzRixPQUFPLEVBQUUsY0FBYyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFFdEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFTLFVBQVUsRUFBd0MsZ0JBQWdCLEVBQUUsTUFBTSxFQUFpRSxnQkFBZ0IsRUFBWSxvQkFBb0IsRUFBUSxNQUFNLDBDQUEwQyxDQUFDO0FBRXBRLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQ3ZGLE9BQU8sRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDdkUsT0FBTyxFQUFvQixvQkFBb0IsRUFBRSx3QkFBd0IsRUFBNEYsTUFBTSxhQUFhLENBQUM7QUFDekwsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNCQUFzQixD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