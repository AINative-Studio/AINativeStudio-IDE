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
import { timeout } from '../../../../base/common/async.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { TerminalGroup } from './terminalGroup.js';
import { getInstanceFromResource } from './terminalUri.js';
import { TERMINAL_VIEW_ID } from '../common/terminal.js';
import { TerminalContextKeys } from '../common/terminalContextKey.js';
import { asArray } from '../../../../base/common/arrays.js';
let TerminalGroupService = class TerminalGroupService extends Disposable {
    get instances() {
        return this.groups.reduce((p, c) => p.concat(c.terminalInstances), []);
    }
    constructor(_contextKeyService, _instantiationService, _viewsService, _viewDescriptorService, _quickInputService) {
        super();
        this._contextKeyService = _contextKeyService;
        this._instantiationService = _instantiationService;
        this._viewsService = _viewsService;
        this._viewDescriptorService = _viewDescriptorService;
        this._quickInputService = _quickInputService;
        this.groups = [];
        this.activeGroupIndex = -1;
        this.lastAccessedMenu = 'inline-tab';
        this._isQuickInputOpened = false;
        this._onDidChangeActiveGroup = this._register(new Emitter());
        this.onDidChangeActiveGroup = this._onDidChangeActiveGroup.event;
        this._onDidDisposeGroup = this._register(new Emitter());
        this.onDidDisposeGroup = this._onDidDisposeGroup.event;
        this._onDidChangeGroups = this._register(new Emitter());
        this.onDidChangeGroups = this._onDidChangeGroups.event;
        this._onDidShow = this._register(new Emitter());
        this.onDidShow = this._onDidShow.event;
        this._onDidDisposeInstance = this._register(new Emitter());
        this.onDidDisposeInstance = this._onDidDisposeInstance.event;
        this._onDidFocusInstance = this._register(new Emitter());
        this.onDidFocusInstance = this._onDidFocusInstance.event;
        this._onDidChangeActiveInstance = this._register(new Emitter());
        this.onDidChangeActiveInstance = this._onDidChangeActiveInstance.event;
        this._onDidChangeInstances = this._register(new Emitter());
        this.onDidChangeInstances = this._onDidChangeInstances.event;
        this._onDidChangeInstanceCapability = this._register(new Emitter());
        this.onDidChangeInstanceCapability = this._onDidChangeInstanceCapability.event;
        this._onDidChangePanelOrientation = this._register(new Emitter());
        this.onDidChangePanelOrientation = this._onDidChangePanelOrientation.event;
        this._getValidTerminalGroups = (sources) => {
            return new Set(sources
                .map(source => this.getGroupForInstance(source))
                .filter((group) => group !== undefined));
        };
        this._terminalGroupCountContextKey = TerminalContextKeys.groupCount.bindTo(this._contextKeyService);
        this._register(this.onDidDisposeGroup(group => this._removeGroup(group)));
        this._register(this.onDidChangeGroups(() => this._terminalGroupCountContextKey.set(this.groups.length)));
        this._register(Event.any(this.onDidChangeActiveGroup, this.onDidChangeInstances)(() => this.updateVisibility()));
        this._register(this._quickInputService.onShow(() => this._isQuickInputOpened = true));
        this._register(this._quickInputService.onHide(() => this._isQuickInputOpened = false));
    }
    hidePanel() {
        // Hide the panel if the terminal is in the panel and it has no sibling views
        const panel = this._viewDescriptorService.getViewContainerByViewId(TERMINAL_VIEW_ID);
        if (panel && this._viewDescriptorService.getViewContainerModel(panel).visibleViewDescriptors.length === 1) {
            this._viewsService.closeView(TERMINAL_VIEW_ID);
            TerminalContextKeys.tabsMouse.bindTo(this._contextKeyService).set(false);
        }
    }
    get activeGroup() {
        if (this.activeGroupIndex < 0 || this.activeGroupIndex >= this.groups.length) {
            return undefined;
        }
        return this.groups[this.activeGroupIndex];
    }
    set activeGroup(value) {
        if (value === undefined) {
            // Setting to undefined is not possible, this can only be done when removing the last group
            return;
        }
        const index = this.groups.findIndex(e => e === value);
        this.setActiveGroupByIndex(index);
    }
    get activeInstance() {
        return this.activeGroup?.activeInstance;
    }
    setActiveInstance(instance) {
        this.setActiveInstanceByIndex(this._getIndexFromId(instance.instanceId));
    }
    _getIndexFromId(terminalId) {
        const terminalIndex = this.instances.findIndex(e => e.instanceId === terminalId);
        if (terminalIndex === -1) {
            throw new Error(`Terminal with ID ${terminalId} does not exist (has it already been disposed?)`);
        }
        return terminalIndex;
    }
    setContainer(container) {
        this._container = container;
        this.groups.forEach(group => group.attachToElement(container));
    }
    async focusTabs() {
        if (this.instances.length === 0) {
            return;
        }
        await this.showPanel(true);
        const pane = this._viewsService.getActiveViewWithId(TERMINAL_VIEW_ID);
        pane?.terminalTabbedView?.focusTabs();
    }
    async focusHover() {
        if (this.instances.length === 0) {
            return;
        }
        const pane = this._viewsService.getActiveViewWithId(TERMINAL_VIEW_ID);
        pane?.terminalTabbedView?.focusHover();
    }
    async focusInstance(_) {
        return this.showPanel(true);
    }
    async focusActiveInstance() {
        return this.showPanel(true);
    }
    createGroup(slcOrInstance) {
        const group = this._instantiationService.createInstance(TerminalGroup, this._container, slcOrInstance);
        this.groups.push(group);
        group.addDisposable(Event.forward(group.onPanelOrientationChanged, this._onDidChangePanelOrientation));
        group.addDisposable(Event.forward(group.onDidDisposeInstance, this._onDidDisposeInstance));
        group.addDisposable(Event.forward(group.onDidFocusInstance, this._onDidFocusInstance));
        group.addDisposable(Event.forward(group.onDidChangeInstanceCapability, this._onDidChangeInstanceCapability));
        group.addDisposable(Event.forward(group.onInstancesChanged, this._onDidChangeInstances));
        group.addDisposable(Event.forward(group.onDisposed, this._onDidDisposeGroup));
        group.addDisposable(group.onDidChangeActiveInstance(e => {
            if (group === this.activeGroup) {
                this._onDidChangeActiveInstance.fire(e);
            }
        }));
        if (group.terminalInstances.length > 0) {
            this._onDidChangeInstances.fire();
        }
        if (this.instances.length === 1) {
            // It's the first instance so it should be made active automatically, this must fire
            // after onInstancesChanged so consumers can react to the instance being added first
            this.setActiveInstanceByIndex(0);
        }
        this._onDidChangeGroups.fire();
        return group;
    }
    async showPanel(focus) {
        const pane = this._viewsService.getActiveViewWithId(TERMINAL_VIEW_ID)
            ?? await this._viewsService.openView(TERMINAL_VIEW_ID, focus);
        pane?.setExpanded(true);
        if (focus) {
            // Do the focus call asynchronously as going through the
            // command palette will force editor focus
            await timeout(0);
            const instance = this.activeInstance;
            if (instance) {
                // HACK: Ensure the panel is still visible at this point as there may have been
                // a request since it was opened to show a different panel
                if (pane && !pane.isVisible()) {
                    await this._viewsService.openView(TERMINAL_VIEW_ID, focus);
                }
                await instance.focusWhenReady(true);
            }
        }
        this._onDidShow.fire();
    }
    getInstanceFromResource(resource) {
        return getInstanceFromResource(this.instances, resource);
    }
    _removeGroup(group) {
        // Get the index of the group and remove it from the list
        const activeGroup = this.activeGroup;
        const wasActiveGroup = group === activeGroup;
        const index = this.groups.indexOf(group);
        if (index !== -1) {
            this.groups.splice(index, 1);
            this._onDidChangeGroups.fire();
        }
        if (wasActiveGroup) {
            // Adjust focus if the group was active
            if (this.groups.length > 0 && !this._isQuickInputOpened) {
                const newIndex = index < this.groups.length ? index : this.groups.length - 1;
                this.setActiveGroupByIndex(newIndex, true);
                this.activeInstance?.focus(true);
            }
        }
        else {
            // Adjust the active group if the removed group was above the active group
            if (this.activeGroupIndex > index) {
                this.setActiveGroupByIndex(this.activeGroupIndex - 1);
            }
        }
        // Ensure the active group is still valid, this should set the activeGroupIndex to -1 if
        // there are no groups
        if (this.activeGroupIndex >= this.groups.length) {
            this.setActiveGroupByIndex(this.groups.length - 1);
        }
        this._onDidChangeInstances.fire();
        this._onDidChangeGroups.fire();
        if (wasActiveGroup) {
            this._onDidChangeActiveGroup.fire(this.activeGroup);
            this._onDidChangeActiveInstance.fire(this.activeInstance);
        }
    }
    /**
     * @param force Whether to force the group change, this should be used when the previous active
     * group has been removed.
     */
    setActiveGroupByIndex(index, force) {
        // Unset active group when the last group is removed
        if (index === -1 && this.groups.length === 0) {
            if (this.activeGroupIndex !== -1) {
                this.activeGroupIndex = -1;
                this._onDidChangeActiveGroup.fire(this.activeGroup);
                this._onDidChangeActiveInstance.fire(this.activeInstance);
            }
            return;
        }
        // Ensure index is valid
        if (index < 0 || index >= this.groups.length) {
            return;
        }
        // Fire group/instance change if needed
        const oldActiveGroup = this.activeGroup;
        this.activeGroupIndex = index;
        if (force || oldActiveGroup !== this.activeGroup) {
            this._onDidChangeActiveGroup.fire(this.activeGroup);
            this._onDidChangeActiveInstance.fire(this.activeInstance);
        }
    }
    _getInstanceLocation(index) {
        let currentGroupIndex = 0;
        while (index >= 0 && currentGroupIndex < this.groups.length) {
            const group = this.groups[currentGroupIndex];
            const count = group.terminalInstances.length;
            if (index < count) {
                return {
                    group,
                    groupIndex: currentGroupIndex,
                    instance: group.terminalInstances[index],
                    instanceIndex: index
                };
            }
            index -= count;
            currentGroupIndex++;
        }
        return undefined;
    }
    setActiveInstanceByIndex(index) {
        const activeInstance = this.activeInstance;
        const instanceLocation = this._getInstanceLocation(index);
        const newActiveInstance = instanceLocation?.group.terminalInstances[instanceLocation.instanceIndex];
        if (!instanceLocation || activeInstance === newActiveInstance) {
            return;
        }
        const activeInstanceIndex = instanceLocation.instanceIndex;
        this.activeGroupIndex = instanceLocation.groupIndex;
        this._onDidChangeActiveGroup.fire(this.activeGroup);
        instanceLocation.group.setActiveInstanceByIndex(activeInstanceIndex, true);
    }
    setActiveGroupToNext() {
        if (this.groups.length <= 1) {
            return;
        }
        let newIndex = this.activeGroupIndex + 1;
        if (newIndex >= this.groups.length) {
            newIndex = 0;
        }
        this.setActiveGroupByIndex(newIndex);
    }
    setActiveGroupToPrevious() {
        if (this.groups.length <= 1) {
            return;
        }
        let newIndex = this.activeGroupIndex - 1;
        if (newIndex < 0) {
            newIndex = this.groups.length - 1;
        }
        this.setActiveGroupByIndex(newIndex);
    }
    moveGroup(source, target) {
        source = asArray(source);
        const sourceGroups = this._getValidTerminalGroups(source);
        const targetGroup = this.getGroupForInstance(target);
        if (!targetGroup || sourceGroups.size === 0) {
            return;
        }
        // The groups are the same, rearrange within the group
        if (sourceGroups.size === 1 && sourceGroups.has(targetGroup)) {
            const targetIndex = targetGroup.terminalInstances.indexOf(target);
            const sortedSources = source.sort((a, b) => {
                return targetGroup.terminalInstances.indexOf(a) - targetGroup.terminalInstances.indexOf(b);
            });
            const firstTargetIndex = targetGroup.terminalInstances.indexOf(sortedSources[0]);
            const position = firstTargetIndex < targetIndex ? 'after' : 'before';
            targetGroup.moveInstance(sortedSources, targetIndex, position);
            this._onDidChangeInstances.fire();
            return;
        }
        // The groups differ, rearrange groups
        const targetGroupIndex = this.groups.indexOf(targetGroup);
        const sortedSourceGroups = Array.from(sourceGroups).sort((a, b) => {
            return this.groups.indexOf(a) - this.groups.indexOf(b);
        });
        const firstSourceGroupIndex = this.groups.indexOf(sortedSourceGroups[0]);
        const position = firstSourceGroupIndex < targetGroupIndex ? 'after' : 'before';
        const insertIndex = position === 'after' ? targetGroupIndex + 1 : targetGroupIndex;
        this.groups.splice(insertIndex, 0, ...sortedSourceGroups);
        for (const sourceGroup of sortedSourceGroups) {
            const originSourceGroupIndex = position === 'after' ? this.groups.indexOf(sourceGroup) : this.groups.lastIndexOf(sourceGroup);
            this.groups.splice(originSourceGroupIndex, 1);
        }
        this._onDidChangeInstances.fire();
    }
    moveGroupToEnd(source) {
        source = asArray(source);
        const sourceGroups = this._getValidTerminalGroups(source);
        if (sourceGroups.size === 0) {
            return;
        }
        const lastInstanceIndex = this.groups.length - 1;
        const sortedSourceGroups = Array.from(sourceGroups).sort((a, b) => {
            return this.groups.indexOf(a) - this.groups.indexOf(b);
        });
        this.groups.splice(lastInstanceIndex + 1, 0, ...sortedSourceGroups);
        for (const sourceGroup of sortedSourceGroups) {
            const sourceGroupIndex = this.groups.indexOf(sourceGroup);
            this.groups.splice(sourceGroupIndex, 1);
        }
        this._onDidChangeInstances.fire();
    }
    moveInstance(source, target, side) {
        const sourceGroup = this.getGroupForInstance(source);
        const targetGroup = this.getGroupForInstance(target);
        if (!sourceGroup || !targetGroup) {
            return;
        }
        // Move from the source group to the target group
        if (sourceGroup !== targetGroup) {
            // Move groups
            sourceGroup.removeInstance(source);
            targetGroup.addInstance(source);
        }
        // Rearrange within the target group
        const index = targetGroup.terminalInstances.indexOf(target) + (side === 'after' ? 1 : 0);
        targetGroup.moveInstance(source, index, side);
    }
    unsplitInstance(instance) {
        const oldGroup = this.getGroupForInstance(instance);
        if (!oldGroup || oldGroup.terminalInstances.length < 2) {
            return;
        }
        oldGroup.removeInstance(instance);
        this.createGroup(instance);
    }
    joinInstances(instances) {
        const group = this.getGroupForInstance(instances[0]);
        if (group) {
            let differentGroups = true;
            for (let i = 1; i < group.terminalInstances.length; i++) {
                if (group.terminalInstances.includes(instances[i])) {
                    differentGroups = false;
                    break;
                }
            }
            if (!differentGroups && group.terminalInstances.length === instances.length) {
                return;
            }
        }
        // Find the group of the first instance that is the only instance in the group, if one exists
        let candidateInstance = undefined;
        let candidateGroup = undefined;
        for (const instance of instances) {
            const group = this.getGroupForInstance(instance);
            if (group?.terminalInstances.length === 1) {
                candidateInstance = instance;
                candidateGroup = group;
                break;
            }
        }
        // Create a new group if needed
        if (!candidateGroup) {
            candidateGroup = this.createGroup();
        }
        const wasActiveGroup = this.activeGroup === candidateGroup;
        // Unsplit all other instances and add them to the new group
        for (const instance of instances) {
            if (instance === candidateInstance) {
                continue;
            }
            const oldGroup = this.getGroupForInstance(instance);
            if (!oldGroup) {
                // Something went wrong, don't join this one
                continue;
            }
            oldGroup.removeInstance(instance);
            candidateGroup.addInstance(instance);
        }
        // Set the active terminal
        this.setActiveInstance(instances[0]);
        // Fire events
        this._onDidChangeInstances.fire();
        if (!wasActiveGroup) {
            this._onDidChangeActiveGroup.fire(this.activeGroup);
        }
    }
    instanceIsSplit(instance) {
        const group = this.getGroupForInstance(instance);
        if (!group) {
            return false;
        }
        return group.terminalInstances.length > 1;
    }
    getGroupForInstance(instance) {
        return this.groups.find(group => group.terminalInstances.includes(instance));
    }
    getGroupLabels() {
        return this.groups.filter(group => group.terminalInstances.length > 0).map((group, index) => {
            return `${index + 1}: ${group.title ? group.title : ''}`;
        });
    }
    /**
     * Visibility should be updated in the following cases:
     * 1. Toggle `TERMINAL_VIEW_ID` visibility
     * 2. Change active group
     * 3. Change instances in active group
     */
    updateVisibility() {
        const visible = this._viewsService.isViewVisible(TERMINAL_VIEW_ID);
        this.groups.forEach((g, i) => g.setVisible(visible && i === this.activeGroupIndex));
    }
};
TerminalGroupService = __decorate([
    __param(0, IContextKeyService),
    __param(1, IInstantiationService),
    __param(2, IViewsService),
    __param(3, IViewDescriptorService),
    __param(4, IQuickInputService)
], TerminalGroupService);
export { TerminalGroupService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxHcm91cFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbC9icm93c2VyL3Rlcm1pbmFsR3JvdXBTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUMzRCxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUVsRSxPQUFPLEVBQWUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUN2RyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUVuRyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUNsRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFFL0UsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDMUYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQ25ELE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBRTNELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ3pELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUVyRCxJQUFNLG9CQUFvQixHQUExQixNQUFNLG9CQUFxQixTQUFRLFVBQVU7SUFLbkQsSUFBSSxTQUFTO1FBQ1osT0FB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