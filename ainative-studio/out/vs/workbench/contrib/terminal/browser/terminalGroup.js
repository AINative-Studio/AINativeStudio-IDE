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
import { TERMINAL_VIEW_ID } from '../common/terminal.js';
import { Event, Emitter } from '../../../../base/common/event.js';
import { Disposable, DisposableStore, dispose, toDisposable } from '../../../../base/common/lifecycle.js';
import { SplitView, Sizing } from '../../../../base/browser/ui/splitview/splitview.js';
import { isHorizontal, IWorkbenchLayoutService } from '../../../services/layout/browser/layoutService.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ITerminalInstanceService, ITerminalConfigurationService } from './terminal.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { TerminalLocation } from '../../../../platform/terminal/common/terminal.js';
import { getWindow } from '../../../../base/browser/dom.js';
import { getPartByLocation } from '../../../services/views/browser/viewsService.js';
import { asArray } from '../../../../base/common/arrays.js';
var Constants;
(function (Constants) {
    /**
     * The minimum size in pixels of a split pane.
     */
    Constants[Constants["SplitPaneMinSize"] = 80] = "SplitPaneMinSize";
    /**
     * The number of cells the terminal gets added or removed when asked to increase or decrease
     * the view size.
     */
    Constants[Constants["ResizePartCellCount"] = 4] = "ResizePartCellCount";
})(Constants || (Constants = {}));
class SplitPaneContainer extends Disposable {
    get onDidChange() { return this._onDidChange; }
    constructor(_container, orientation) {
        super();
        this._container = _container;
        this.orientation = orientation;
        this._splitViewDisposables = this._register(new DisposableStore());
        this._children = [];
        this._terminalToPane = new Map();
        this._onDidChange = Event.None;
        this._width = this._container.offsetWidth;
        this._height = this._container.offsetHeight;
        this._createSplitView();
        this._splitView.layout(this.orientation === 1 /* Orientation.HORIZONTAL */ ? this._width : this._height);
    }
    _createSplitView() {
        this._splitViewDisposables.clear();
        this._splitView = new SplitView(this._container, { orientation: this.orientation });
        this._splitViewDisposables.add(this._splitView);
        this._splitViewDisposables.add(this._splitView.onDidSashReset(() => this._splitView.distributeViewSizes()));
    }
    split(instance, index) {
        this._addChild(instance, index);
    }
    resizePane(index, direction, amount) {
        // Only resize when there is more than one pane
        if (this._children.length <= 1) {
            return;
        }
        // Get sizes
        const sizes = [];
        for (let i = 0; i < this._splitView.length; i++) {
            sizes.push(this._splitView.getViewSize(i));
        }
        // Remove size from right pane, unless index is the last pane in which case use left pane
        const isSizingEndPane = index !== this._children.length - 1;
        const indexToChange = isSizingEndPane ? index + 1 : index - 1;
        if (isSizingEndPane && direction === 0 /* Direction.Left */) {
            amount *= -1;
        }
        else if (!isSizingEndPane && direction === 1 /* Direction.Right */) {
            amount *= -1;
        }
        else if (isSizingEndPane && direction === 2 /* Direction.Up */) {
            amount *= -1;
        }
        else if (!isSizingEndPane && direction === 3 /* Direction.Down */) {
            amount *= -1;
        }
        // Ensure the size is not reduced beyond the minimum, otherwise weird things can happen
        if (sizes[index] + amount < 80 /* Constants.SplitPaneMinSize */) {
            amount = 80 /* Constants.SplitPaneMinSize */ - sizes[index];
        }
        else if (sizes[indexToChange] - amount < 80 /* Constants.SplitPaneMinSize */) {
            amount = sizes[indexToChange] - 80 /* Constants.SplitPaneMinSize */;
        }
        // Apply the size change
        sizes[index] += amount;
        sizes[indexToChange] -= amount;
        for (let i = 0; i < this._splitView.length - 1; i++) {
            this._splitView.resizeView(i, sizes[i]);
        }
    }
    resizePanes(relativeSizes) {
        if (this._children.length <= 1) {
            return;
        }
        // assign any extra size to last terminal
        relativeSizes[relativeSizes.length - 1] += 1 - relativeSizes.reduce((totalValue, currentValue) => totalValue + currentValue, 0);
        let totalSize = 0;
        for (let i = 0; i < this._splitView.length; i++) {
            totalSize += this._splitView.getViewSize(i);
        }
        for (let i = 0; i < this._splitView.length; i++) {
            this._splitView.resizeView(i, totalSize * relativeSizes[i]);
        }
    }
    getPaneSize(instance) {
        const paneForInstance = this._terminalToPane.get(instance);
        if (!paneForInstance) {
            return 0;
        }
        const index = this._children.indexOf(paneForInstance);
        return this._splitView.getViewSize(index);
    }
    _addChild(instance, index) {
        const child = new SplitPane(instance, this.orientation === 1 /* Orientation.HORIZONTAL */ ? this._height : this._width);
        child.orientation = this.orientation;
        if (typeof index === 'number') {
            this._children.splice(index, 0, child);
        }
        else {
            this._children.push(child);
        }
        this._terminalToPane.set(instance, this._children[this._children.indexOf(child)]);
        this._withDisabledLayout(() => this._splitView.addView(child, Sizing.Distribute, index));
        this.layout(this._width, this._height);
        this._onDidChange = Event.any(...this._children.map(c => c.onDidChange));
    }
    remove(instance) {
        let index = null;
        for (let i = 0; i < this._children.length; i++) {
            if (this._children[i].instance === instance) {
                index = i;
            }
        }
        if (index !== null) {
            this._children.splice(index, 1);
            this._terminalToPane.delete(instance);
            this._splitView.removeView(index, Sizing.Distribute);
            instance.detachFromElement();
        }
    }
    layout(width, height) {
        this._width = width;
        this._height = height;
        if (this.orientation === 1 /* Orientation.HORIZONTAL */) {
            this._children.forEach(c => c.orthogonalLayout(height));
            this._splitView.layout(width);
        }
        else {
            this._children.forEach(c => c.orthogonalLayout(width));
            this._splitView.layout(height);
        }
    }
    setOrientation(orientation) {
        if (this.orientation === orientation) {
            return;
        }
        this.orientation = orientation;
        // Remove old split view
        while (this._container.children.length > 0) {
            this._container.children[0].remove();
        }
        // Create new split view with updated orientation
        this._createSplitView();
        this._withDisabledLayout(() => {
            this._children.forEach(child => {
                child.orientation = orientation;
                this._splitView.addView(child, 1);
            });
        });
    }
    _withDisabledLayout(innerFunction) {
        // Whenever manipulating views that are going to be changed immediately, disabling
        // layout/resize events in the terminal prevent bad dimensions going to the pty.
        this._children.forEach(c => c.instance.disableLayout = true);
        innerFunction();
        this._children.forEach(c => c.instance.disableLayout = false);
    }
}
class SplitPane {
    get onDidChange() { return this._onDidChange; }
    constructor(instance, orthogonalSize) {
        this.instance = instance;
        this.orthogonalSize = orthogonalSize;
        this.minimumSize = 80 /* Constants.SplitPaneMinSize */;
        this.maximumSize = Number.MAX_VALUE;
        this._onDidChange = Event.None;
        this.element = document.createElement('div');
        this.element.className = 'terminal-split-pane';
        this.instance.attachToElement(this.element);
    }
    layout(size) {
        // Only layout when both sizes are known
        if (!size || !this.orthogonalSize) {
            return;
        }
        if (this.orientation === 0 /* Orientation.VERTICAL */) {
            this.instance.layout({ width: this.orthogonalSize, height: size });
        }
        else {
            this.instance.layout({ width: size, height: this.orthogonalSize });
        }
    }
    orthogonalLayout(size) {
        this.orthogonalSize = size;
    }
}
let TerminalGroup = class TerminalGroup extends Disposable {
    get terminalInstances() { return this._terminalInstances; }
    constructor(_container, shellLaunchConfigOrInstance, _terminalConfigurationService, _terminalInstanceService, _layoutService, _viewDescriptorService, _instantiationService) {
        super();
        this._container = _container;
        this._terminalConfigurationService = _terminalConfigurationService;
        this._terminalInstanceService = _terminalInstanceService;
        this._layoutService = _layoutService;
        this._viewDescriptorService = _viewDescriptorService;
        this._instantiationService = _instantiationService;
        this._terminalInstances = [];
        this._panelPosition = 2 /* Position.BOTTOM */;
        this._terminalLocation = 1 /* ViewContainerLocation.Panel */;
        this._instanceDisposables = new Map();
        this._activeInstanceIndex = -1;
        this._visible = false;
        this._onDidDisposeInstance = this._register(new Emitter());
        this.onDidDisposeInstance = this._onDidDisposeInstance.event;
        this._onDidFocusInstance = this._register(new Emitter());
        this.onDidFocusInstance = this._onDidFocusInstance.event;
        this._onDidChangeInstanceCapability = this._register(new Emitter());
        this.onDidChangeInstanceCapability = this._onDidChangeInstanceCapability.event;
        this._onDisposed = this._register(new Emitter());
        this.onDisposed = this._onDisposed.event;
        this._onInstancesChanged = this._register(new Emitter());
        this.onInstancesChanged = this._onInstancesChanged.event;
        this._onDidChangeActiveInstance = this._register(new Emitter());
        this.onDidChangeActiveInstance = this._onDidChangeActiveInstance.event;
        this._onPanelOrientationChanged = this._register(new Emitter());
        this.onPanelOrientationChanged = this._onPanelOrientationChanged.event;
        if (shellLaunchConfigOrInstance) {
            this.addInstance(shellLaunchConfigOrInstance);
        }
        if (this._container) {
            this.attachToElement(this._container);
        }
        this._onPanelOrientationChanged.fire(this._terminalLocation === 1 /* ViewContainerLocation.Panel */ && isHorizontal(this._panelPosition) ? 1 /* Orientation.HORIZONTAL */ : 0 /* Orientation.VERTICAL */);
        this._register(toDisposable(() => {
            if (this._container && this._groupElement) {
                this._groupElement.remove();
                this._groupElement = undefined;
            }
        }));
    }
    addInstance(shellLaunchConfigOrInstance, parentTerminalId) {
        let instance;
        // if a parent terminal is provided, find it
        // otherwise, parent is the active terminal
        const parentIndex = parentTerminalId ? this._terminalInstances.findIndex(t => t.instanceId === parentTerminalId) : this._activeInstanceIndex;
        if ('instanceId' in shellLaunchConfigOrInstance) {
            instance = shellLaunchConfigOrInstance;
        }
        else {
            instance = this._terminalInstanceService.createInstance(shellLaunchConfigOrInstance, TerminalLocation.Panel);
        }
        if (this._terminalInstances.length === 0) {
            this._terminalInstances.push(instance);
            this._activeInstanceIndex = 0;
        }
        else {
            this._terminalInstances.splice(parentIndex + 1, 0, instance);
        }
        this._initInstanceListeners(instance);
        if (this._splitPaneContainer) {
            this._splitPaneContainer.split(instance, parentIndex + 1);
        }
        this._onInstancesChanged.fire();
    }
    dispose() {
        this._terminalInstances = [];
        this._onInstancesChanged.fire();
        this._splitPaneContainer?.dispose();
        super.dispose();
    }
    get activeInstance() {
        if (this._terminalInstances.length === 0) {
            return undefined;
        }
        return this._terminalInstances[this._activeInstanceIndex];
    }
    getLayoutInfo(isActive) {
        const instances = this.terminalInstances.filter(instance => typeof instance.persistentProcessId === 'number' && instance.shouldPersist);
        const totalSize = instances.map(t => this._splitPaneContainer?.getPaneSize(t) || 0).reduce((total, size) => total += size, 0);
        return {
            isActive: isActive,
            activePersistentProcessId: this.activeInstance ? this.activeInstance.persistentProcessId : undefined,
            terminals: instances.map(t => {
                return {
                    relativeSize: totalSize > 0 ? this._splitPaneContainer.getPaneSize(t) / totalSize : 0,
                    terminal: t.persistentProcessId || 0
                };
            })
        };
    }
    _initInstanceListeners(instance) {
        this._instanceDisposables.set(instance.instanceId, [
            instance.onDisposed(instance => {
                this._onDidDisposeInstance.fire(instance);
                this._handleOnDidDisposeInstance(instance);
            }),
            instance.onDidFocus(instance => {
                this._setActiveInstance(instance);
                this._onDidFocusInstance.fire(instance);
            }),
            instance.capabilities.onDidAddCapabilityType(() => this._onDidChangeInstanceCapability.fire(instance)),
            instance.capabilities.onDidRemoveCapabilityType(() => this._onDidChangeInstanceCapability.fire(instance)),
        ]);
    }
    _handleOnDidDisposeInstance(instance) {
        this._removeInstance(instance);
    }
    removeInstance(instance) {
        this._removeInstance(instance);
    }
    _removeInstance(instance) {
        const index = this._terminalInstances.indexOf(instance);
        if (index === -1) {
            return;
        }
        const wasActiveInstance = instance === this.activeInstance;
        this._terminalInstances.splice(index, 1);
        // Adjust focus if the instance was active
        if (wasActiveInstance && this._terminalInstances.length > 0) {
            const newIndex = index < this._terminalInstances.length ? index : this._terminalInstances.length - 1;
            this.setActiveInstanceByIndex(newIndex);
            // TODO: Only focus the new instance if the group had focus?
            this.activeInstance?.focus(true);
        }
        else if (index < this._activeInstanceIndex) {
            // Adjust active instance index if needed
            this._activeInstanceIndex--;
        }
        this._splitPaneContainer?.remove(instance);
        // Fire events and dispose group if it was the last instance
        if (this._terminalInstances.length === 0) {
            this._onDisposed.fire(this);
            this.dispose();
        }
        else {
            this._onInstancesChanged.fire();
        }
        // Dispose instance event listeners
        const disposables = this._instanceDisposables.get(instance.instanceId);
        if (disposables) {
            dispose(disposables);
            this._instanceDisposables.delete(instance.instanceId);
        }
    }
    moveInstance(instances, index, position) {
        instances = asArray(instances);
        const hasInvalidInstance = instances.some(instance => !this.terminalInstances.includes(instance));
        if (hasInvalidInstance) {
            return;
        }
        const insertIndex = position === 'before' ? index : index + 1;
        this._terminalInstances.splice(insertIndex, 0, ...instances);
        for (const item of instances) {
            const originSourceGroupIndex = position === 'after' ? this._terminalInstances.indexOf(item) : this._terminalInstances.lastIndexOf(item);
            this._terminalInstances.splice(originSourceGroupIndex, 1);
        }
        if (this._splitPaneContainer) {
            for (let i = 0; i < instances.length; i++) {
                const item = instances[i];
                this._splitPaneContainer.remove(item);
                this._splitPaneContainer.split(item, index + (position === 'before' ? i : 0));
            }
        }
        this._onInstancesChanged.fire();
    }
    _setActiveInstance(instance) {
        this.setActiveInstanceByIndex(this._getIndexFromId(instance.instanceId));
    }
    _getIndexFromId(terminalId) {
        let terminalIndex = -1;
        this.terminalInstances.forEach((terminalInstance, i) => {
            if (terminalInstance.instanceId === terminalId) {
                terminalIndex = i;
            }
        });
        if (terminalIndex === -1) {
            throw new Error(`Terminal with ID ${terminalId} does not exist (has it already been disposed?)`);
        }
        return terminalIndex;
    }
    setActiveInstanceByIndex(index, force) {
        // Check for invalid value
        if (index < 0 || index >= this._terminalInstances.length) {
            return;
        }
        const oldActiveInstance = this.activeInstance;
        this._activeInstanceIndex = index;
        if (oldActiveInstance !== this.activeInstance || force) {
            this._onInstancesChanged.fire();
            this._onDidChangeActiveInstance.fire(this.activeInstance);
        }
    }
    attachToElement(element) {
        this._container = element;
        // If we already have a group element, we can reparent it
        if (!this._groupElement) {
            this._groupElement = document.createElement('div');
            this._groupElement.classList.add('terminal-group');
        }
        this._container.appendChild(this._groupElement);
        if (!this._splitPaneContainer) {
            this._panelPosition = this._layoutService.getPanelPosition();
            this._terminalLocation = this._viewDescriptorService.getViewLocationById(TERMINAL_VIEW_ID);
            const orientation = this._terminalLocation === 1 /* ViewContainerLocation.Panel */ && isHorizontal(this._panelPosition) ? 1 /* Orientation.HORIZONTAL */ : 0 /* Orientation.VERTICAL */;
            this._splitPaneContainer = this._instantiationService.createInstance(SplitPaneContainer, this._groupElement, orientation);
            this.terminalInstances.forEach(instance => this._splitPaneContainer.split(instance, this._activeInstanceIndex + 1));
        }
    }
    get title() {
        if (this._terminalInstances.length === 0) {
            // Normally consumers should not call into title at all after the group is disposed but
            // this is required when the group is used as part of a tree.
            return '';
        }
        let title = this.terminalInstances[0].title + this._getBellTitle(this.terminalInstances[0]);
        if (this.terminalInstances[0].description) {
            title += ` (${this.terminalInstances[0].description})`;
        }
        for (let i = 1; i < this.terminalInstances.length; i++) {
            const instance = this.terminalInstances[i];
            if (instance.title) {
                title += `, ${instance.title + this._getBellTitle(instance)}`;
                if (instance.description) {
                    title += ` (${instance.description})`;
                }
            }
        }
        return title;
    }
    _getBellTitle(instance) {
        if (this._terminalConfigurationService.config.enableBell && instance.statusList.statuses.some(e => e.id === "bell" /* TerminalStatus.Bell */)) {
            return '*';
        }
        return '';
    }
    setVisible(visible) {
        this._visible = visible;
        if (this._groupElement) {
            this._groupElement.style.display = visible ? '' : 'none';
        }
        this.terminalInstances.forEach(i => i.setVisible(visible));
    }
    split(shellLaunchConfig) {
        const instance = this._terminalInstanceService.createInstance(shellLaunchConfig, TerminalLocation.Panel);
        this.addInstance(instance, shellLaunchConfig.parentTerminalId);
        this._setActiveInstance(instance);
        return instance;
    }
    addDisposable(disposable) {
        this._register(disposable);
    }
    layout(width, height) {
        if (this._splitPaneContainer) {
            // Check if the panel position changed and rotate panes if so
            const newPanelPosition = this._layoutService.getPanelPosition();
            const newTerminalLocation = this._viewDescriptorService.getViewLocationById(TERMINAL_VIEW_ID);
            const terminalPositionChanged = newPanelPosition !== this._panelPosition || newTerminalLocation !== this._terminalLocation;
            if (terminalPositionChanged) {
                const newOrientation = newTerminalLocation === 1 /* ViewContainerLocation.Panel */ && isHorizontal(newPanelPosition) ? 1 /* Orientation.HORIZONTAL */ : 0 /* Orientation.VERTICAL */;
                this._splitPaneContainer.setOrientation(newOrientation);
                this._panelPosition = newPanelPosition;
                this._terminalLocation = newTerminalLocation;
                this._onPanelOrientationChanged.fire(this._splitPaneContainer.orientation);
            }
            this._splitPaneContainer.layout(width, height);
            if (this._initialRelativeSizes && this._visible) {
                this.resizePanes(this._initialRelativeSizes);
                this._initialRelativeSizes = undefined;
            }
        }
    }
    focusPreviousPane() {
        const newIndex = this._activeInstanceIndex === 0 ? this._terminalInstances.length - 1 : this._activeInstanceIndex - 1;
        this.setActiveInstanceByIndex(newIndex);
    }
    focusNextPane() {
        const newIndex = this._activeInstanceIndex === this._terminalInstances.length - 1 ? 0 : this._activeInstanceIndex + 1;
        this.setActiveInstanceByIndex(newIndex);
    }
    _getPosition() {
        switch (this._terminalLocation) {
            case 1 /* ViewContainerLocation.Panel */:
                return this._panelPosition;
            case 0 /* ViewContainerLocation.Sidebar */:
                return this._layoutService.getSideBarPosition();
            case 2 /* ViewContainerLocation.AuxiliaryBar */:
                return this._layoutService.getSideBarPosition() === 0 /* Position.LEFT */ ? 1 /* Position.RIGHT */ : 0 /* Position.LEFT */;
        }
    }
    _getOrientation() {
        return isHorizontal(this._getPosition()) ? 1 /* Orientation.HORIZONTAL */ : 0 /* Orientation.VERTICAL */;
    }
    resizePane(direction) {
        if (!this._splitPaneContainer) {
            return;
        }
        const isHorizontalResize = (direction === 0 /* Direction.Left */ || direction === 1 /* Direction.Right */);
        const groupOrientation = this._getOrientation();
        const shouldResizePart = (isHorizontalResize && groupOrientation === 0 /* Orientation.VERTICAL */) ||
            (!isHorizontalResize && groupOrientation === 1 /* Orientation.HORIZONTAL */);
        const font = this._terminalConfigurationService.getFont(getWindow(this._groupElement));
        // TODO: Support letter spacing and line height
        const charSize = (isHorizontalResize ? font.charWidth : font.charHeight);
        if (charSize) {
            let resizeAmount = charSize * 4 /* Constants.ResizePartCellCount */;
            if (shouldResizePart) {
                const position = this._getPosition();
                const shouldShrink = (position === 0 /* Position.LEFT */ && direction === 0 /* Direction.Left */) ||
                    (position === 1 /* Position.RIGHT */ && direction === 1 /* Direction.Right */) ||
                    (position === 2 /* Position.BOTTOM */ && direction === 3 /* Direction.Down */) ||
                    (position === 3 /* Position.TOP */ && direction === 2 /* Direction.Up */);
                if (shouldShrink) {
                    resizeAmount *= -1;
                }
                this._layoutService.resizePart(getPartByLocation(this._terminalLocation), resizeAmount, resizeAmount);
            }
            else {
                this._splitPaneContainer.resizePane(this._activeInstanceIndex, direction, resizeAmount);
            }
        }
    }
    resizePanes(relativeSizes) {
        if (!this._splitPaneContainer) {
            this._initialRelativeSizes = relativeSizes;
            return;
        }
        this._splitPaneContainer.resizePanes(relativeSizes);
    }
};
TerminalGroup = __decorate([
    __param(2, ITerminalConfigurationService),
    __param(3, ITerminalInstanceService),
    __param(4, IWorkbenchLayoutService),
    __param(5, IViewDescriptorService),
    __param(6, IInstantiationService)
], TerminalGroup);
export { TerminalGroup };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxHcm91cC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbC9icm93c2VyL3Rlcm1pbmFsR3JvdXAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDekQsT0FBTyxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNsRSxPQUFPLEVBQWUsVUFBVSxFQUFFLGVBQWUsRUFBRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDdkgsT0FBTyxFQUFFLFNBQVMsRUFBc0IsTUFBTSxFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDM0csT0FBTyxFQUFFLFlBQVksRUFBRSx1QkFBdUIsRUFBWSxNQUFNLG1EQUFtRCxDQUFDO0FBQ3BILE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBZ0Qsd0JBQXdCLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFDdEksT0FBTyxFQUF5QixzQkFBc0IsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQ3pGLE9BQU8sRUFBa0QsZ0JBQWdCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUVwSSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDNUQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0saURBQWlELENBQUM7QUFDcEYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBRTVELElBQVcsU0FVVjtBQVZELFdBQVcsU0FBUztJQUNuQjs7T0FFRztJQUNILGtFQUFxQixDQUFBO0lB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