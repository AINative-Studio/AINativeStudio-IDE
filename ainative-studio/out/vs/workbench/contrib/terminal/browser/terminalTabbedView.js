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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxUYWJiZWRWaWV3LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWwvYnJvd3Nlci90ZXJtaW5hbFRhYmJlZFZpZXcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUErQixNQUFNLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDcEgsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsT0FBTyxFQUFlLE1BQU0sc0NBQXNDLENBQUM7QUFDekcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLDZCQUE2QixFQUFFLHFCQUFxQixFQUFxQixnQkFBZ0IsRUFBMkIsTUFBTSxlQUFlLENBQUM7QUFDbkosT0FBTyxFQUF5QixlQUFlLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUMvRSxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFDO0FBQ3ZELE9BQU8sRUFBRSxNQUFNLEVBQVcsU0FBUyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDaEYsT0FBTyxFQUFTLFlBQVksRUFBRSxNQUFNLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUM3RixPQUFPLEVBQWUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUN2RyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUU5RixPQUFPLEVBQUUsZUFBZSxFQUErQixNQUFNLGdEQUFnRCxDQUFDO0FBQzlHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFFM0QsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDdEUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFDNUQsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBRTVFLE1BQU0sQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUM7QUFFaEIsSUFBVyxRQUVWO0FBRkQsV0FBVyxRQUFRO0lBQ2xCLGlEQUFxQyxDQUFBO0FBQ3RDLENBQUMsRUFGVSxRQUFRLEtBQVIsUUFBUSxRQUVsQjtBQUVELElBQVcsY0FHVjtBQUhELFdBQVcsY0FBYztJQUN4QixnRUFBZSxDQUFBO0lBQ2YsMEVBQW9CLENBQUE7QUFDckIsQ0FBQyxFQUhVLGNBQWMsS0FBZCxjQUFjLFFBR3hCO0FBRU0sSUFBTSxrQkFBa0IsR0FBeEIsTUFBTSxrQkFBbUIsU0FBUSxVQUFVO0lBOEJqRCxZQUNDLGFBQTBCLEVBQ1IsZ0JBQW1ELEVBQ3RDLDZCQUE2RSxFQUNyRixxQkFBNkQsRUFDN0QscUJBQTZELEVBQy9ELG1CQUF5RCxFQUN2RCxxQkFBNkQsRUFDdEUsV0FBeUIsRUFDdEIsZUFBaUQsRUFDOUMsaUJBQXFDLEVBQzFDLGFBQTZDO1FBRTVELEtBQUssRUFBRSxDQUFDO1FBWDJCLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBa0I7UUFDckIsa0NBQTZCLEdBQTdCLDZCQUE2QixDQUErQjtRQUNwRSwwQkFBcUIsR0FBckIscUJBQXFCLENBQXVCO1FBQzVDLDBCQUFxQixHQUFyQixxQkFBcUIsQ0FBdUI7UUFDOUMsd0JBQW1CLEdBQW5CLG1CQUFtQixDQUFxQjtRQUN0QywwQkFBcUIsR0FBckIscUJBQXFCLENBQXVCO1FBRWxELG9CQUFlLEdBQWYsZUFBZSxDQUFpQjtRQUVsQyxrQkFBYSxHQUFiLGFBQWEsQ0FBZTtRQXRCckQsdUJBQWtCLEdBQVksS0FBSyxDQUFDO1FBMEIzQyxJQUFJLENBQUMsYUFBYSxHQUFHLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1FBQzFDLE1BQU0sZ0JBQWdCLEdBQUcsQ0FBQyxDQUFDLHNCQUFzQixDQUFDLENBQUM7UUFDbkQsSUFBSSxDQUFDLGVBQWUsR0FBRyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDdkMsZ0JBQWdCLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQztRQUNuRCxJQUFJLENBQUMsYUFBYSxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1FBRWpELElBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyx1QkFBdUIsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDLENBQUM7UUFDL0csSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLGtCQUFrQixFQUFFLGlCQUFpQixDQUFDLENBQUMsQ0FBQztRQUMxRyxJQUFJLENBQUMsa0JBQWtCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQywyQkFBMkIsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDLENBQUM7UUFFeEgsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxjQUFjLENBQUMsZUFBZSxFQUFFLElBQUksQ0FBQyxlQUFlLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLGVBQWUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRXhKLE1BQU0sc0JBQXNCLEdBQUcsQ0FBQyxDQUFDLDJCQUEyQixDQUFDLENBQUM7UUFDOUQsSUFBSSxDQUFDLGtCQUFrQixHQUFHLENBQUMsQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDO1FBQzFELHNCQUFzQixDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQztRQUU1RCxJQUFJLENBQUMsZ0JBQWdCLENBQUMsYUFBYSxDQUFDLGFBQWEsRUFBRSxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQztRQUU1RSxJQUFJLENBQUMsK0JBQStCLEdBQUcsbUJBQW1CLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1FBQ2hHLElBQUksQ0FBQyw0QkFBNEIsR0FBRyxtQkFBbUIsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLGlCQUFpQixDQUFDLENBQUM7UUFDNUYsSUFBSSxDQUFDLDRCQUE0QixHQUFHLG1CQUFtQixDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsaUJBQWlCLENBQUMsQ0FBQztRQUU1RixJQUFJLENBQUMsYUFBYSxHQUFHLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsS0FBSyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2hHLElBQUksQ0FBQyx1QkFBdUIsR0FBRyxJQUFJLENBQUMsNkJBQTZCLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLEtBQUssTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUUxRyxJQUFJLENBQUMsU0FBUyxDQUFDLHFCQUFxQixDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQ2pFLElBQUksQ0FBQyxDQUFDLG9CQUFvQix3RUFBK0I7Z0JBQ3hELENBQUMsQ0FBQyxvQkFBb0Isb0ZBQXFDLEVBQUUsQ0FBQztnQkFDOUQsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7WUFDekIsQ0FBQztpQkFBTSxJQUFJLENBQUMsQ0FBQyxvQkFBb0IsMEVBQWdDLEVBQUUsQ0FBQztnQkFDbkUsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUMsNkJBQTZCLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLEtBQUssTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDaEcsSUFBSSxDQUFDLHVCQUF1QixHQUFHLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsS0FBSyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUMxRyxJQUFJLElBQUksQ0FBQyxlQUFlLEVBQUUsRUFBRSxDQUFDO29CQUM1QixJQUFJLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7b0JBQ2hDLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO29CQUMzQixJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztvQkFDeEIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQyxDQUFDO2dCQUMxRSxDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDSixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDL0YsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMsaUJBQWlCLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRTVGLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxhQUFhLEVBQUUsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUM7UUFFbkUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMsMkJBQTJCLENBQUMsQ0FBQyxXQUFXLEVBQUUsRUFBRTtZQUNyRixJQUFJLENBQUMsaUJBQWlCLEdBQUcsV0FBVyxDQUFDO1lBQ3JDLElBQUksSUFBSSxDQUFDLGlCQUFpQixpQ0FBeUIsRUFBRSxDQUFDO2dCQUNyRCxJQUFJLENBQUMsa0JBQWtCLENBQUMsU0FBUyxDQUFDLEdBQUcsb0RBQXlCLENBQUM7WUFDaEUsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxTQUFTLENBQUMsTUFBTSxvREFBeUIsQ0FBQztZQUNuRSxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVKLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxTQUFTLENBQUMsYUFBYSxFQUFFLEVBQUUsV0FBVyxnQ0FBd0IsRUFBRSxrQkFBa0IsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO1FBQ25ILElBQUksQ0FBQyxlQUFlLENBQUMsc0JBQXNCLENBQUMsQ0FBQztJQUM5QyxDQUFDO0lBRU8sZUFBZTtRQUN0QixNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsNkJBQTZCLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUM7UUFDdkUsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLDZCQUE2QixDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDO1FBQzFFLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNkLE9BQU8sS0FBSyxDQUFDO1FBQ2QsQ0FBQztRQUVELElBQUksSUFBSSxLQUFLLE9BQU8sRUFBRSxDQUFDO1lBQ3RCLE9BQU8sSUFBSSxDQUFDO1FBQ2IsQ0FBQztRQUVELElBQUksSUFBSSxLQUFLLGdCQUFnQixJQUFJLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ2xGLE9BQU8sSUFBSSxDQUFDO1FBQ2IsQ0FBQztRQUVELElBQUksSUFBSSxLQUFLLGFBQWEsSUFBSSxJQUFJLENBQUMscUJBQXFCLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUM1RSxPQUFPLElBQUksQ0FBQztRQUNiLENBQUM7UUFFRCxPQUFPLEtBQUssQ0FBQztJQUNkLENBQUM7SUFFTyxnQkFBZ0I7UUFDdkIsSUFBSSxJQUFJLENBQUMsZUFBZSxFQUFFLEVBQUUsQ0FBQztZQUM1QixJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO2dCQUNsQyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7Z0JBQ25CLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO2dCQUN4QixJQUFJLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDLENBQUM7Z0JBQ3pFLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUNyQixDQUFDO1FBQ0YsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDO2dCQUM5RSxJQUFJLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUM7Z0JBQy9DLElBQUksQ0FBQyxXQUFXLEVBQUUsTUFBTSxFQUFFLENBQUM7Z0JBQzNCLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO1lBQzVCLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVPLGlCQUFpQjtRQUN4QixNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsaUJBQWlCLGlDQUF5QixDQUFDLENBQUMsNEVBQTJDLENBQUMsK0VBQTRDLENBQUM7UUFDM0osTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsUUFBUSwrQkFBdUIsQ0FBQztRQUU3RSxJQUFJLENBQUMsV0FBVyxJQUFJLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUM7WUFDNUMsMEVBQTBFO1lBQzFFLHlFQUF5RTtZQUN6RSxPQUFPLElBQUksQ0FBQyxpQkFBaUIsaUNBQXlCLENBQUMsQ0FBQyxnREFBdUMsQ0FBQyw2Q0FBbUMsQ0FBQztRQUNySSxDQUFDO1FBQ0QsT0FBTyxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDOUIsQ0FBQztJQUVPLHFCQUFxQjtRQUM1Qix5RUFBeUU7UUFDekUsSUFBSSxVQUFVLHNEQUE2QyxDQUFDO1FBQzVELE1BQU0sZUFBZSxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDekQsZUFBZSxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUM7UUFDMUIsZUFBZSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7UUFDM0IsTUFBTSxHQUFHLEdBQUcsZUFBZSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM3QyxJQUFJLEdBQUcsRUFBRSxDQUFDO1lBQ1QsTUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDO1lBQ3pGLEdBQUcsQ0FBQyxJQUFJLEdBQUcsR0FBRyxLQUFLLENBQUMsU0FBUyxJQUFJLEtBQUssQ0FBQyxRQUFRLElBQUksS0FBSyxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ3RFLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7Z0JBQzdFLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDLFdBQVcsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUMxRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDTixVQUFVLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLGdCQUFnQixzREFBNkMsQ0FBQyxDQUFDO1FBQ2hHLENBQUM7UUFDRCxvREFBb0Q7UUFDcEQsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQztRQUNoRixJQUFJLFlBQVksS0FBSyxVQUFVLEVBQUUsQ0FBQztZQUNqQyxVQUFVLGlEQUF3QyxDQUFDO1FBQ3BELENBQUM7UUFDRCxJQUFJLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBQzNELElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUNuQyxDQUFDO0lBRU8sbUJBQW1CLENBQUMsUUFBMkI7UUFDdEQsa0dBQWtHO1FBQ2xHLE1BQU0sZUFBZSxHQUFHLEVBQUUsQ0FBQztRQUMzQixNQUFNLGVBQWUsR0FBRyxRQUFRLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsb0NBQTJCLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDaEcsTUFBTSxvQkFBb0IsR0FBRyxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxtQkFBbUIsQ0FBQyxRQUFRLENBQUMsRUFBRSxpQkFBaUIsQ0FBQyxNQUFNLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMseUNBQWdDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDaEssT0FBTyxlQUFlLEdBQUcsb0JBQW9CLEdBQUcsZUFBZSxDQUFDO0lBQ2pFLENBQUM7SUFFTyxzQkFBc0I7UUFDN0IsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBQ2xFLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxJQUFJLFNBQVMsSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUNwQyxPQUFPO1FBQ1IsQ0FBQztRQUNELElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUNsQyxDQUFDO0lBRU8sZ0JBQWdCLENBQUMsS0FBYTtRQUNyQyxJQUFJLEtBQUssbURBQTBDLElBQUksS0FBSyxrREFBeUMsRUFBRSxDQUFDO1lBQ3ZHLEtBQUssaURBQXdDLENBQUM7WUFDOUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUN2RCxDQUFDO2FBQU0sSUFBSSxLQUFLLG9EQUEyQyxJQUFJLEtBQUssc0RBQTZDLEVBQUUsQ0FBQztZQUNuSCxLQUFLLHNEQUE2QyxDQUFDO1lBQ25ELElBQUksQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDdkQsQ0FBQztRQUNELElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztRQUNwQixNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsaUJBQWlCLGlDQUF5QixDQUFDLENBQUMsNEVBQTJDLENBQUMsK0VBQTRDLENBQUM7UUFDM0osSUFBSSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLEtBQUssMkRBQTJDLENBQUM7SUFDdkYsQ0FBQztJQUVPLGVBQWUsQ0FBQyxzQkFBbUM7UUFDMUQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLGNBQWMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMscUJBQXFCLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDbkYsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLGVBQWUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsc0JBQXNCLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFckYsSUFBSSxJQUFJLENBQUMsZUFBZSxFQUFFLEVBQUUsQ0FBQztZQUM1QixJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7UUFDcEIsQ0FBQztRQUNELElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDO1lBQ3ZCLE9BQU8sRUFBRSxzQkFBc0I7WUFDL0IsTUFBTSxFQUFFLEtBQUssQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQyxDQUFDO1lBQ3ZHLFdBQVcsRUFBRSxHQUFHO1lBQ2hCLFdBQVcsRUFBRSxNQUFNLENBQUMsaUJBQWlCO1lBQ3JDLFdBQVcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxVQUFVLENBQUMsSUFBSTtZQUNsQyxRQUFRLDZCQUFxQjtTQUM3QixFQUFFLE1BQU0sQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLHVCQUF1QixDQUFDLENBQUM7UUFFcEQsSUFBSSxJQUFJLENBQUMsZUFBZSxFQUFFLEVBQUUsQ0FBQztZQUM1QixJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztRQUN6QixDQUFDO0lBQ0YsQ0FBQztJQUVPLFdBQVc7UUFDbEIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUM7WUFDdkIsT0FBTyxFQUFFLElBQUksQ0FBQyxhQUFhO1lBQzNCLE1BQU0sRUFBRSxLQUFLLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLElBQUksQ0FBQyxFQUFFLEtBQUssQ0FBQztZQUMvRCxXQUFXLGdEQUF1QztZQUNsRCxXQUFXLDhDQUFvQztZQUMvQyxXQUFXLEVBQUUsR0FBRyxFQUFFLENBQUMsVUFBVSxDQUFDLElBQUk7WUFDbEMsUUFBUSw0QkFBb0I7U0FDNUIsRUFBRSxNQUFNLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUMxQyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7SUFDckIsQ0FBQztJQUVELFlBQVk7UUFDWCxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7UUFDdEIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUN6QixDQUFDO0lBRU8sZ0JBQWdCO1FBQ3ZCLElBQUksUUFBcUIsQ0FBQztRQUMxQixJQUFJLENBQUMsZ0JBQWdCLEdBQUc7WUFDdkIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxFQUFFO2dCQUN4QyxRQUFRLEdBQUcsR0FBRyxDQUFDLHdCQUF3QixDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUU7b0JBQy9FLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztnQkFDckIsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQ1QsQ0FBQyxDQUFDO1lBQ0YsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFO2dCQUN0QyxRQUFRLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDcEIsQ0FBQyxDQUFDO1NBQ0YsQ0FBQztJQUNILENBQUM7SUFFTyxtQkFBbUI7UUFDMUIsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztZQUMzQixPQUFPLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUM7WUFDL0IsSUFBSSxDQUFDLGdCQUFnQixHQUFHLFNBQVMsQ0FBQztRQUNuQyxDQUFDO0lBQ0YsQ0FBQztJQUVPLGNBQWM7UUFDckIsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxXQUFXLG1EQUEwQyxDQUFDO1FBQzNGLElBQUksQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxVQUFVLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDekQsSUFBSSxDQUFDLCtCQUErQixDQUFDLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ3BELENBQUM7SUFFRCxNQUFNLENBQUMsS0FBYSxFQUFFLE1BQWM7UUFDbkMsSUFBSSxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUM7UUFDdEIsSUFBSSxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUM7UUFDcEIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDOUIsSUFBSSxJQUFJLENBQUMsZUFBZSxFQUFFLEVBQUUsQ0FBQztZQUM1QixJQUFJLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDLENBQUM7UUFDMUUsQ0FBQztRQUNELElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztJQUN2QixDQUFDO0lBRU8scUJBQXFCLENBQUMsZ0JBQTZCLEVBQUUsaUJBQThCO1FBQzFGLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUUsWUFBWSxFQUFFLEtBQUssRUFBRSxLQUFpQixFQUFFLEVBQUU7WUFDdEcsSUFBSSxDQUFDLDRCQUE0QixDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUM3QyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztZQUN4QixLQUFLLENBQUMsZUFBZSxFQUFFLENBQUM7UUFDekIsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNKLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUUsWUFBWSxFQUFFLEtBQUssRUFBRSxLQUFpQixFQUFFLEVBQUU7WUFDdEcsSUFBSSxDQUFDLDRCQUE0QixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUM1QyxLQUFLLENBQUMsZUFBZSxFQUFFLENBQUM7UUFDekIsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNKLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLGlCQUFpQixFQUFFLFdBQVcsRUFBRSxLQUFLLEVBQUUsS0FBaUIsRUFBRSxFQUFFO1lBQ3BHLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxjQUFjLENBQUM7WUFDM0QsSUFBSSxJQUFJLENBQUMscUJBQXFCLENBQUMsU0FBUyxDQUFDLE1BQU0sR0FBRyxDQUFDLElBQUksUUFBUSxFQUFFLENBQUM7Z0JBQ2pFLE1BQU0sTUFBTSxHQUFHLE1BQU0sUUFBUSxDQUFDLGdCQUFnQixDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUM7Z0JBQzFFLElBQUksT0FBTyxNQUFNLEtBQUssUUFBUSxJQUFJLE1BQU0sQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO29CQUM1RCxJQUFJLENBQUMsa0JBQWtCLEdBQUcsSUFBSSxDQUFDO2dCQUNoQyxDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDSixJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxpQkFBaUIsRUFBRSxhQUFhLEVBQUUsQ0FBQyxLQUFpQixFQUFFLEVBQUU7WUFDaEcsTUFBTSxrQkFBa0IsR0FBRyxJQUFJLENBQUMsNkJBQTZCLENBQUMsTUFBTSxDQUFDLGtCQUFrQixDQUFDO1lBQ3hGLElBQUksa0JBQWtCLEtBQUssU0FBUyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFDO2dCQUN6RCxJQUFJLENBQUMsa0JBQWtCLEdBQUcsSUFBSSxDQUFDO1lBQ2hDLENBQUM7WUFDRCxpQkFBaUIsQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUMxQixJQUFJLENBQUMsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUM7Z0JBQzlCLGVBQWUsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLGlCQUFpQixDQUFDLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxjQUFjLEVBQUUsSUFBSSxDQUFDLGFBQWEsRUFBRSxJQUFJLENBQUMsbUJBQW1CLENBQUMsQ0FBQztZQUNuSixDQUFDO1lBQ0QsS0FBSyxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQ3ZCLEtBQUssQ0FBQyx3QkFBd0IsRUFBRSxDQUFDO1lBQ2pDLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxLQUFLLENBQUM7UUFDakMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNKLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUUsYUFBYSxFQUFFLENBQUMsS0FBaUIsRUFBRSxFQUFFO1lBQ2pHLE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxDQUFDLDZCQUE2QixDQUFDLE1BQU0sQ0FBQyxrQkFBa0IsQ0FBQztZQUN4RixJQUFJLGtCQUFrQixLQUFLLFNBQVMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQztnQkFDekQsSUFBSSxDQUFDLGtCQUFrQixHQUFHLElBQUksQ0FBQztZQUNoQyxDQUFDO1lBQ0QsSUFBSSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO2dCQUM5QixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUM7Z0JBQ3hELElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztvQkFDaEIsSUFBSSxDQUFDLHFCQUFxQixDQUFDLGdCQUFnQixHQUFHLFVBQVUsQ0FBQztnQkFDMUQsQ0FBQztnQkFFRCwyRUFBMkU7Z0JBQzNFLE1BQU0saUJBQWlCLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO2dCQUM5RCxNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLGtCQUFrQixFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDaEUsSUFBSSxlQUFlLEVBQUUsQ0FBQztvQkFDckIsaUJBQWlCLENBQUMsTUFBTSxDQUFDLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxVQUFVLEtBQUssZUFBZSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO29CQUMzRyxpQkFBaUIsQ0FBQyxPQUFPLENBQUMsZUFBZSxDQUFDLENBQUM7Z0JBQzVDLENBQUM7Z0JBRUQsZUFBZSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxFQUFFLEtBQUssRUFBRSxpQkFBaUIsRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxJQUFJLENBQUMsbUJBQW1CLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQ2pOLENBQUM7WUFDRCxLQUFLLENBQUMsY0FBYyxFQUFFLENBQUM7WUFDdkIsS0FBSyxDQUFDLHdCQUF3QixFQUFFLENBQUM7WUFDakMsSUFBSSxDQUFDLGtCQUFrQixHQUFHLEtBQUssQ0FBQztRQUNqQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ0osSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsaUJBQWlCLENBQUMsYUFBYSxFQUFFLFNBQVMsRUFBRSxDQUFDLEtBQW9CLEVBQUUsRUFBRTtZQUM3RyxpQkFBaUIsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ2xFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDSixJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxpQkFBaUIsQ0FBQyxhQUFhLEVBQUUsT0FBTyxFQUFFLENBQUMsS0FBb0IsRUFBRSxFQUFFO1lBQzNHLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDbEUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNKLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLGdCQUFnQixFQUFFLE9BQU8sRUFBRSxDQUFDLEtBQW9CLEVBQUUsRUFBRTtZQUM1RixJQUFJLEtBQUssQ0FBQyxPQUFPLEtBQUssRUFBRSxFQUFFLENBQUM7Z0JBQzFCLCtCQUErQjtnQkFDL0IsS0FBSyxDQUFDLGVBQWUsRUFBRSxDQUFDO1lBQ3pCLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ0osSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxHQUFHLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUU7WUFDekYsSUFBSSxDQUFDLDRCQUE0QixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM3QyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ0osSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxHQUFHLENBQUMsU0FBUyxDQUFDLFNBQVMsRUFBRSxHQUFHLEVBQUU7WUFDMUYsSUFBSSxDQUFDLDRCQUE0QixDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUM5QyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVPLGNBQWM7UUFDckIsT0FBTztZQUNOLElBQUksU0FBUyxFQUFFO1lBQ2YsSUFBSSxDQUFDLHFCQUFxQixDQUFDLE9BQU8sMEVBQWdDLENBQUMsU0FBUyxLQUFLLE1BQU0sQ0FBQyxDQUFDO2dCQUN4RixJQUFJLE1BQU0sQ0FBQyxXQUFXLEVBQUUsUUFBUSxDQUFDLGVBQWUsRUFBRSxpQkFBaUIsQ0FBQyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsS0FBSyxJQUFJLEVBQUU7b0JBQ3RHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxXQUFXLDJFQUFpQyxPQUFPLENBQUMsQ0FBQztnQkFDakYsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDSixJQUFJLE1BQU0sQ0FBQyxVQUFVLEVBQUUsUUFBUSxDQUFDLGNBQWMsRUFBRSxnQkFBZ0IsQ0FBQyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsS0FBSyxJQUFJLEVBQUU7b0JBQ25HLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxXQUFXLDJFQUFpQyxNQUFNLENBQUMsQ0FBQztnQkFDaEYsQ0FBQyxDQUFDO1lBQ0gsSUFBSSxNQUFNLENBQUMsVUFBVSxFQUFFLFFBQVEsQ0FBQyxVQUFVLEVBQUUsV0FBVyxDQUFDLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxLQUFLLElBQUksRUFBRTtnQkFDMUYsSUFBSSxDQUFDLHFCQUFxQixDQUFDLFdBQVcseUVBQWdDLEtBQUssQ0FBQyxDQUFDO1lBQzlFLENBQUMsQ0FBQztTQUNGLENBQUM7SUFDSCxDQUFDO0lBRUQsV0FBVyxDQUFDLFNBQWtCO1FBQzdCLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNoQixJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQzFCLENBQUM7UUFDRCxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUM5QixDQUFDO0lBRUQsU0FBUztRQUNSLElBQUksQ0FBQyxJQUFJLENBQUMsZUFBZSxFQUFFLEVBQUUsQ0FBQztZQUM3QixPQUFPO1FBQ1IsQ0FBQztRQUNELElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDNUMsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxZQUFZLEVBQUUsQ0FBQztRQUM5QyxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQ3pCLElBQUksUUFBUSxFQUFFLENBQUM7WUFDZCxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNsQyxDQUFDO0lBQ0YsQ0FBQztJQUVELEtBQUs7UUFDSixJQUFJLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxlQUFlLDhDQUFzQyxFQUFFLENBQUM7WUFDakYsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2QsT0FBTztRQUNSLENBQUM7UUFFRCw4R0FBOEc7UUFDOUcsNERBQTREO1FBQzVELE1BQU0scUJBQXFCLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxhQUFhLENBQUMsYUFBYSxDQUFDO1FBQy9FLElBQUkscUJBQXFCLEVBQUUsQ0FBQztZQUMzQixvRkFBb0Y7WUFDcEYsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsMEJBQTBCLENBQUMsR0FBRyxFQUFFO2dCQUNwRSx3RkFBd0Y7Z0JBQ3hGLGFBQWE7Z0JBQ2IsSUFBSSxHQUFHLENBQUMsZUFBZSxDQUFDLHFCQUFxQixDQUFDLEVBQUUsQ0FBQztvQkFDaEQsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO2dCQUNmLENBQUM7WUFDRixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztJQUNGLENBQUM7SUFFRCxVQUFVO1FBQ1QsSUFBSSxJQUFJLENBQUMsZUFBZSxFQUFFLEVBQUUsQ0FBQztZQUM1QixJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQzNCLE9BQU87UUFDUixDQUFDO1FBQ0QsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLGNBQWMsQ0FBQztRQUMzRCxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDZixPQUFPO1FBQ1IsQ0FBQztRQUNELElBQUksQ0FBQyxhQUFhLENBQUMsZ0JBQWdCLENBQUM7WUFDbkMsR0FBRyxvQkFBb0IsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLGVBQWUsQ0FBQztZQUN2RCxNQUFNLEVBQUUsSUFBSSxDQUFDLGtCQUFrQjtZQUMvQixTQUFTLEVBQUUsSUFBSTtTQUNmLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDVixDQUFDO0lBRU8sTUFBTTtRQUNiLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxjQUFjLEVBQUUsY0FBYyxFQUFFLENBQUM7SUFDN0QsQ0FBQztDQUNELENBQUE7QUFsYlksa0JBQWtCO0lBZ0M1QixXQUFBLGdCQUFnQixDQUFBO0lBQ2hCLFdBQUEsNkJBQTZCLENBQUE7SUFDN0IsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsbUJBQW1CLENBQUE7SUFDbkIsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLFlBQVksQ0FBQTtJQUNaLFdBQUEsZUFBZSxDQUFBO0lBQ2YsV0FBQSxrQkFBa0IsQ0FBQTtJQUNsQixZQUFBLGFBQWEsQ0FBQTtHQXpDSCxrQkFBa0IsQ0FrYjlCIn0=