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
import { Sizing, SplitView } from '../../../../base/browser/ui/splitview/splitview.js';
import { Disposable, DisposableStore, dispose } from '../../../../base/common/lifecycle.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ITerminalConfigurationService, ITerminalGroupService, ITerminalService } from './terminal.js';
import { TerminalTabList } from './terminalTabsList.js';
import * as dom from '../../../../base/browser/dom.js';
import { Action, Separator } from '../../../../base/common/actions.js';
import { IMenuService, MenuId } from '../../../../platform/actions/common/actions.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { localize } from '../../../../nls.js';
import { openContextMenu } from './terminalContextMenu.js';
import { TerminalContextKeys } from '../common/terminalContextKey.js';
import { getInstanceHoverInfo } from './terminalTooltip.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
const $ = dom.$;
var CssClass;
(function (CssClass) {
    CssClass["ViewIsVertical"] = "terminal-side-view";
})(CssClass || (CssClass = {}));
var WidthConstants;
(function (WidthConstants) {
    WidthConstants[WidthConstants["StatusIcon"] = 30] = "StatusIcon";
    WidthConstants[WidthConstants["SplitAnnotation"] = 30] = "SplitAnnotation";
})(WidthConstants || (WidthConstants = {}));
let TerminalTabbedView = class TerminalTabbedView extends Disposable {
    constructor(parentElement, _terminalService, _terminalConfigurationService, _terminalGroupService, _instantiationService, _contextMenuService, _configurationService, menuService, _storageService, contextKeyService, _hoverService) {
        super();
        this._terminalService = _terminalService;
        this._terminalConfigurationService = _terminalConfigurationService;
        this._terminalGroupService = _terminalGroupService;
        this._instantiationService = _instantiationService;
        this._contextMenuService = _contextMenuService;
        this._configurationService = _configurationService;
        this._storageService = _storageService;
        this._hoverService = _hoverService;
        this._cancelContextMenu = false;
        this._tabContainer = $('.tabs-container');
        const tabListContainer = $('.tabs-list-container');
        this._tabListElement = $('.tabs-list');
        tabListContainer.appendChild(this._tabListElement);
        this._tabContainer.appendChild(tabListContainer);
        this._instanceMenu = this._register(menuService.createMenu(MenuId.TerminalInstanceContext, contextKeyService));
        this._tabsListMenu = this._register(menuService.createMenu(MenuId.TerminalTabContext, contextKeyService));
        this._tabsListEmptyMenu = this._register(menuService.createMenu(MenuId.TerminalTabEmptyAreaContext, contextKeyService));
        this._tabList = this._register(this._instantiationService.createInstance(TerminalTabList, this._tabListElement, this._register(new DisposableStore())));
        const terminalOuterContainer = $('.terminal-outer-container');
        this._terminalContainer = $('.terminal-groups-container');
        terminalOuterContainer.appendChild(this._terminalContainer);
        this._terminalService.setContainers(parentElement, this._terminalContainer);
        this._terminalIsTabsNarrowContextKey = TerminalContextKeys.tabsNarrow.bindTo(contextKeyService);
        this._terminalTabsFocusContextKey = TerminalContextKeys.tabsFocus.bindTo(contextKeyService);
        this._terminalTabsMouseContextKey = TerminalContextKeys.tabsMouse.bindTo(contextKeyService);
        this._tabTreeIndex = this._terminalConfigurationService.config.tabs.location === 'left' ? 0 : 1;
        this._terminalContainerIndex = this._terminalConfigurationService.config.tabs.location === 'left' ? 1 : 0;
        this._register(_configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration("terminal.integrated.tabs.enabled" /* TerminalSettingId.TabsEnabled */) ||
                e.affectsConfiguration("terminal.integrated.tabs.hideCondition" /* TerminalSettingId.TabsHideCondition */)) {
                this._refreshShowTabs();
            }
            else if (e.affectsConfiguration("terminal.integrated.tabs.location" /* TerminalSettingId.TabsLocation */)) {
                this._tabTreeIndex = this._terminalConfigurationService.config.tabs.location === 'left' ? 0 : 1;
                this._terminalContainerIndex = this._terminalConfigurationService.config.tabs.location === 'left' ? 1 : 0;
                if (this._shouldShowTabs()) {
                    this._splitView.swapViews(0, 1);
                    this._removeSashListener();
                    this._addSashListener();
                    this._splitView.resizeView(this._tabTreeIndex, this._getLastListWidth());
                }
            }
        }));
        this._register(this._terminalGroupService.onDidChangeInstances(() => this._refreshShowTabs()));
        this._register(this._terminalGroupService.onDidChangeGroups(() => this._refreshShowTabs()));
        this._attachEventListeners(parentElement, this._terminalContainer);
        this._register(this._terminalGroupService.onDidChangePanelOrientation((orientation) => {
            this._panelOrientation = orientation;
            if (this._panelOrientation === 0 /* Orientation.VERTICAL */) {
                this._terminalContainer.classList.add("terminal-side-view" /* CssClass.ViewIsVertical */);
            }
            else {
                this._terminalContainer.classList.remove("terminal-side-view" /* CssClass.ViewIsVertical */);
            }
        }));
        this._splitView = new SplitView(parentElement, { orientation: 1 /* Orientation.HORIZONTAL */, proportionalLayout: false });
        this._setupSplitView(terminalOuterContainer);
    }
    _shouldShowTabs() {
        const enabled = this._terminalConfigurationService.config.tabs.enabled;
        const hide = this._terminalConfigurationService.config.tabs.hideCondition;
        if (!enabled) {
            return false;
        }
        if (hide === 'never') {
            return true;
        }
        if (hide === 'singleTerminal' && this._terminalGroupService.instances.length > 1) {
            return true;
        }
        if (hide === 'singleGroup' && this._terminalGroupService.groups.length > 1) {
            return true;
        }
        return false;
    }
    _refreshShowTabs() {
        if (this._shouldShowTabs()) {
            if (this._splitView.length === 1) {
                this._addTabTree();
                this._addSashListener();
                this._splitView.resizeView(this._tabTreeIndex, this._getLastListWidth());
                this.rerenderTabs();
            }
        }
        else {
            if (this._splitView.length === 2 && !this._terminalTabsMouseContextKey.get()) {
                this._splitView.removeView(this._tabTreeIndex);
                this._plusButton?.remove();
                this._removeSashListener();
            }
        }
    }
    _getLastListWidth() {
        const widthKey = this._panelOrientation === 0 /* Orientation.VERTICAL */ ? "tabs-list-width-vertical" /* TerminalStorageKeys.TabsListWidthVertical */ : "tabs-list-width-horizontal" /* TerminalStorageKeys.TabsListWidthHorizontal */;
        const storedValue = this._storageService.get(widthKey, 0 /* StorageScope.PROFILE */);
        if (!storedValue || !parseInt(storedValue)) {
            // we want to use the min width by default for the vertical orientation bc
            // there is such a limited width for the terminal panel to begin w there.
            return this._panelOrientation === 0 /* Orientation.VERTICAL */ ? 46 /* TerminalTabsListSizes.NarrowViewWidth */ : 120 /* TerminalTabsListSizes.DefaultWidth */;
        }
        return parseInt(storedValue);
    }
    _handleOnDidSashReset() {
        // Calculate ideal size of list to display all text based on its contents
        let idealWidth = 80 /* TerminalTabsListSizes.WideViewMinimumWidth */;
        const offscreenCanvas = document.createElement('canvas');
        offscreenCanvas.width = 1;
        offscreenCanvas.height = 1;
        const ctx = offscreenCanvas.getContext('2d');
        if (ctx) {
            const style = dom.getWindow(this._tabListElement).getComputedStyle(this._tabListElement);
            ctx.font = `${style.fontStyle} ${style.fontSize} ${style.fontFamily}`;
            const maxInstanceWidth = this._terminalGroupService.instances.reduce((p, c) => {
                return Math.max(p, ctx.measureText(c.title + (c.description || '')).width + this._getAdditionalWidth(c));
            }, 0);
            idealWidth = Math.ceil(Math.max(maxInstanceWidth, 80 /* TerminalTabsListSizes.WideViewMinimumWidth */));
        }
        // If the size is already ideal, toggle to collapsed
        const currentWidth = Math.ceil(this._splitView.getViewSize(this._tabTreeIndex));
        if (currentWidth === idealWidth) {
            idealWidth = 46 /* TerminalTabsListSizes.NarrowViewWidth */;
        }
        this._splitView.resizeView(this._tabTreeIndex, idealWidth);
        this._updateListWidth(idealWidth);
    }
    _getAdditionalWidth(instance) {
        // Size to include padding, icon, status icon (if any), split annotation (if any), + a little more
        const additionalWidth = 40;
        const statusIconWidth = instance.statusList.statuses.length > 0 ? 30 /* WidthConstants.StatusIcon */ : 0;
        const splitAnnotationWidth = (this._terminalGroupService.getGroupForInstance(instance)?.terminalInstances.length || 0) > 1 ? 30 /* WidthConstants.SplitAnnotation */ : 0;
        return additionalWidth + splitAnnotationWidth + statusIconWidth;
    }
    _handleOnDidSashChange() {
        const listWidth = this._splitView.getViewSize(this._tabTreeIndex);
        if (!this._width || listWidth <= 0) {
            return;
        }
        this._updateListWidth(listWidth);
    }
    _updateListWidth(width) {
        if (width < 63 /* TerminalTabsListSizes.MidpointViewWidth */ && width >= 46 /* TerminalTabsListSizes.NarrowViewWidth */) {
            width = 46 /* TerminalTabsListSizes.NarrowViewWidth */;
            this._splitView.resizeView(this._tabTreeIndex, width);
        }
        else if (width >= 63 /* TerminalTabsListSizes.MidpointViewWidth */ && width < 80 /* TerminalTabsListSizes.WideViewMinimumWidth */) {
            width = 80 /* TerminalTabsListSizes.WideViewMinimumWidth */;
            this._splitView.resizeView(this._tabTreeIndex, width);
        }
        this.rerenderTabs();
        const widthKey = this._panelOrientation === 0 /* Orientation.VERTICAL */ ? "tabs-list-width-vertical" /* TerminalStorageKeys.TabsListWidthVertical */ : "tabs-list-width-horizontal" /* TerminalStorageKeys.TabsListWidthHorizontal */;
        this._storageService.store(widthKey, width, 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
    }
    _setupSplitView(terminalOuterContainer) {
        this._register(this._splitView.onDidSashReset(() => this._handleOnDidSashReset()));
        this._register(this._splitView.onDidSashChange(() => this._handleOnDidSashChange()));
        if (this._shouldShowTabs()) {
            this._addTabTree();
        }
        this._splitView.addView({
            element: terminalOuterContainer,
            layout: width => this._terminalGroupService.groups.forEach(tab => tab.layout(width, this._height || 0)),
            minimumSize: 120,
            maximumSize: Number.POSITIVE_INFINITY,
            onDidChange: () => Disposable.None,
            priority: 2 /* LayoutPriority.High */
        }, Sizing.Distribute, this._terminalContainerIndex);
        if (this._shouldShowTabs()) {
            this._addSashListener();
        }
    }
    _addTabTree() {
        this._splitView.addView({
            element: this._tabContainer,
            layout: width => this._tabList.layout(this._height || 0, width),
            minimumSize: 46 /* TerminalTabsListSizes.NarrowViewWidth */,
            maximumSize: 500 /* TerminalTabsListSizes.MaximumWidth */,
            onDidChange: () => Disposable.None,
            priority: 1 /* LayoutPriority.Low */
        }, Sizing.Distribute, this._tabTreeIndex);
        this.rerenderTabs();
    }
    rerenderTabs() {
        this._updateHasText();
        this._tabList.refresh();
    }
    _addSashListener() {
        let interval;
        this._sashDisposables = [
            this._splitView.sashes[0].onDidStart(e => {
                interval = dom.disposableWindowInterval(dom.getWindow(this._splitView.el), () => {
                    this.rerenderTabs();
                }, 100);
            }),
            this._splitView.sashes[0].onDidEnd(e => {
                interval.dispose();
            })
        ];
    }
    _removeSashListener() {
        if (this._sashDisposables) {
            dispose(this._sashDisposables);
            this._sashDisposables = undefined;
        }
    }
    _updateHasText() {
        const hasText = this._tabListElement.clientWidth > 63 /* TerminalTabsListSizes.MidpointViewWidth */;
        this._tabContainer.classList.toggle('has-text', hasText);
        this._terminalIsTabsNarrowContextKey.set(!hasText);
    }
    layout(width, height) {
        this._height = height;
        this._width = width;
        this._splitView.layout(width);
        if (this._shouldShowTabs()) {
            this._splitView.resizeView(this._tabTreeIndex, this._getLastListWidth());
        }
        this._updateHasText();
    }
    _attachEventListeners(parentDomElement, terminalContainer) {
        this._register(dom.addDisposableListener(this._tabContainer, 'mouseleave', async (event) => {
            this._terminalTabsMouseContextKey.set(false);
            this._refreshShowTabs();
            event.stopPropagation();
        }));
        this._register(dom.addDisposableListener(this._tabContainer, 'mouseenter', async (event) => {
            this._terminalTabsMouseContextKey.set(true);
            event.stopPropagation();
        }));
        this._register(dom.addDisposableListener(terminalContainer, 'mousedown', async (event) => {
            const terminal = this._terminalGroupService.activeInstance;
            if (this._terminalGroupService.instances.length > 0 && terminal) {
                const result = await terminal.handleMouseEvent(event, this._instanceMenu);
                if (typeof result === 'object' && result.cancelContextMenu) {
                    this._cancelContextMenu = true;
                }
            }
        }));
        this._register(dom.addDisposableListener(terminalContainer, 'contextmenu', (event) => {
            const rightClickBehavior = this._terminalConfigurationService.config.rightClickBehavior;
            if (rightClickBehavior === 'nothing' && !event.shiftKey) {
                this._cancelContextMenu = true;
            }
            terminalContainer.focus();
            if (!this._cancelContextMenu) {
                openContextMenu(dom.getWindow(terminalContainer), event, this._terminalGroupService.activeInstance, this._instanceMenu, this._contextMenuService);
            }
            event.preventDefault();
            event.stopImmediatePropagation();
            this._cancelContextMenu = false;
        }));
        this._register(dom.addDisposableListener(this._tabContainer, 'contextmenu', (event) => {
            const rightClickBehavior = this._terminalConfigurationService.config.rightClickBehavior;
            if (rightClickBehavior === 'nothing' && !event.shiftKey) {
                this._cancelContextMenu = true;
            }
            if (!this._cancelContextMenu) {
                const emptyList = this._tabList.getFocus().length === 0;
                if (!emptyList) {
                    this._terminalGroupService.lastAccessedMenu = 'tab-list';
                }
                // Put the focused item first as it's used as the first positional argument
                const selectedInstances = this._tabList.getSelectedElements();
                const focusedInstance = this._tabList.getFocusedElements()?.[0];
                if (focusedInstance) {
                    selectedInstances.splice(selectedInstances.findIndex(e => e.instanceId === focusedInstance.instanceId), 1);
                    selectedInstances.unshift(focusedInstance);
                }
                openContextMenu(dom.getWindow(this._tabContainer), event, selectedInstances, emptyList ? this._tabsListEmptyMenu : this._tabsListMenu, this._contextMenuService, emptyList ? this._getTabActions() : undefined);
            }
            event.preventDefault();
            event.stopImmediatePropagation();
            this._cancelContextMenu = false;
        }));
        this._register(dom.addDisposableListener(terminalContainer.ownerDocument, 'keydown', (event) => {
            terminalContainer.classList.toggle('alt-active', !!event.altKey);
        }));
        this._register(dom.addDisposableListener(terminalContainer.ownerDocument, 'keyup', (event) => {
            terminalContainer.classList.toggle('alt-active', !!event.altKey);
        }));
        this._register(dom.addDisposableListener(parentDomElement, 'keyup', (event) => {
            if (event.keyCode === 27) {
                // Keep terminal open on escape
                event.stopPropagation();
            }
        }));
        this._register(dom.addDisposableListener(this._tabContainer, dom.EventType.FOCUS_IN, () => {
            this._terminalTabsFocusContextKey.set(true);
        }));
        this._register(dom.addDisposableListener(this._tabContainer, dom.EventType.FOCUS_OUT, () => {
            this._terminalTabsFocusContextKey.set(false);
        }));
    }
    _getTabActions() {
        return [
            new Separator(),
            this._configurationService.inspect("terminal.integrated.tabs.location" /* TerminalSettingId.TabsLocation */).userValue === 'left' ?
                new Action('moveRight', localize('moveTabsRight', "Move Tabs Right"), undefined, undefined, async () => {
                    this._configurationService.updateValue("terminal.integrated.tabs.location" /* TerminalSettingId.TabsLocation */, 'right');
                }) :
                new Action('moveLeft', localize('moveTabsLeft', "Move Tabs Left"), undefined, undefined, async () => {
                    this._configurationService.updateValue("terminal.integrated.tabs.location" /* TerminalSettingId.TabsLocation */, 'left');
                }),
            new Action('hideTabs', localize('hideTabs', "Hide Tabs"), undefined, undefined, async () => {
                this._configurationService.updateValue("terminal.integrated.tabs.enabled" /* TerminalSettingId.TabsEnabled */, false);
            })
        ];
    }
    setEditable(isEditing) {
        if (!isEditing) {
            this._tabList.domFocus();
        }
        this._tabList.refresh(false);
    }
    focusTabs() {
        if (!this._shouldShowTabs()) {
            return;
        }
        this._terminalTabsFocusContextKey.set(true);
        const selected = this._tabList.getSelection();
        this._tabList.domFocus();
        if (selected) {
            this._tabList.setFocus(selected);
        }
    }
    focus() {
        if (this._terminalService.connectionState === 1 /* TerminalConnectionState.Connected */) {
            this._focus();
            return;
        }
        // If the terminal is waiting to reconnect to remote terminals, then there is no TerminalInstance yet that can
        // be focused. So wait for connection to finish, then focus.
        const previousActiveElement = this._tabListElement.ownerDocument.activeElement;
        if (previousActiveElement) {
            // TODO: Improve lifecycle management this event should be disposed after first fire
            this._register(this._terminalService.onDidChangeConnectionState(() => {
                // Only focus the terminal if the activeElement has not changed since focus() was called
                // TODO: Hack
                if (dom.isActiveElement(previousActiveElement)) {
                    this._focus();
                }
            }));
        }
    }
    focusHover() {
        if (this._shouldShowTabs()) {
            this._tabList.focusHover();
            return;
        }
        const instance = this._terminalGroupService.activeInstance;
        if (!instance) {
            return;
        }
        this._hoverService.showInstantHover({
            ...getInstanceHoverInfo(instance, this._storageService),
            target: this._terminalContainer,
            trapFocus: true
        }, true);
    }
    _focus() {
        this._terminalGroupService.activeInstance?.focusWhenReady();
    }
};
TerminalTabbedView = __decorate([
    __param(1, ITerminalService),
    __param(2, ITerminalConfigurationService),
    __param(3, ITerminalGroupService),
    __param(4, IInstantiationService),
    __param(5, IContextMenuService),
    __param(6, IConfigurationService),
    __param(7, IMenuService),
    __param(8, IStorageService),
    __param(9, IContextKeyService),
    __param(10, IHoverService)
], TerminalTabbedView);
export { TerminalTabbedView };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxUYWJiZWRWaWV3LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsL2Jyb3dzZXIvdGVybWluYWxUYWJiZWRWaWV3LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBK0IsTUFBTSxFQUFFLFNBQVMsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQ3BILE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE9BQU8sRUFBZSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3pHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxxQkFBcUIsRUFBcUIsZ0JBQWdCLEVBQTJCLE1BQU0sZUFBZSxDQUFDO0FBQ25KLE9BQU8sRUFBeUIsZUFBZSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDL0UsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQztBQUN2RCxPQUFPLEVBQUUsTUFBTSxFQUFXLFNBQVMsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ2hGLE9BQU8sRUFBUyxZQUFZLEVBQUUsTUFBTSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDN0YsT0FBTyxFQUFlLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDdkcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFFOUYsT0FBTyxFQUFFLGVBQWUsRUFBK0IsTUFBTSxnREFBZ0QsQ0FBQztBQUM5RyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFF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