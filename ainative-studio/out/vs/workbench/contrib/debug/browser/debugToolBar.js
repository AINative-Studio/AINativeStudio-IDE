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
import * as dom from '../../../../base/browser/dom.js';
import { StandardMouseEvent } from '../../../../base/browser/mouseEvent.js';
import { PixelRatio } from '../../../../base/browser/pixelRatio.js';
import { ActionBar } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { mainWindow } from '../../../../base/browser/window.js';
import { Action } from '../../../../base/common/actions.js';
import * as arrays from '../../../../base/common/arrays.js';
import { RunOnceScheduler } from '../../../../base/common/async.js';
import { Codicon } from '../../../../base/common/codicons.js';
import * as errors from '../../../../base/common/errors.js';
import { DisposableStore, dispose, markAsSingleton, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { platform } from '../../../../base/common/platform.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { localize } from '../../../../nls.js';
import { DropdownWithPrimaryActionViewItem } from '../../../../platform/actions/browser/dropdownWithPrimaryActionViewItem.js';
import { createActionViewItem, getFlatActionBarActions } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { IMenuService, MenuId, MenuRegistry } from '../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr, IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { widgetBorder, widgetShadow } from '../../../../platform/theme/common/colorRegistry.js';
import { IThemeService, Themable } from '../../../../platform/theme/common/themeService.js';
import { getWindowControlsStyle } from '../../../../platform/window/common/window.js';
import { IWorkbenchLayoutService } from '../../../services/layout/browser/layoutService.js';
import { CONTEXT_DEBUG_STATE, CONTEXT_FOCUSED_SESSION_IS_ATTACH, CONTEXT_FOCUSED_SESSION_IS_NO_DEBUG, CONTEXT_IN_DEBUG_MODE, CONTEXT_MULTI_SESSION_DEBUG, CONTEXT_STEP_BACK_SUPPORTED, CONTEXT_SUSPEND_DEBUGGEE_SUPPORTED, CONTEXT_TERMINATE_DEBUGGEE_SUPPORTED, IDebugService, VIEWLET_ID } from '../common/debug.js';
import { FocusSessionActionViewItem } from './debugActionViewItems.js';
import { debugToolBarBackground, debugToolBarBorder } from './debugColors.js';
import { CONTINUE_ID, CONTINUE_LABEL, DISCONNECT_AND_SUSPEND_ID, DISCONNECT_AND_SUSPEND_LABEL, DISCONNECT_ID, DISCONNECT_LABEL, FOCUS_SESSION_ID, FOCUS_SESSION_LABEL, PAUSE_ID, PAUSE_LABEL, RESTART_LABEL, RESTART_SESSION_ID, REVERSE_CONTINUE_ID, STEP_BACK_ID, STEP_INTO_ID, STEP_INTO_LABEL, STEP_OUT_ID, STEP_OUT_LABEL, STEP_OVER_ID, STEP_OVER_LABEL, STOP_ID, STOP_LABEL } from './debugCommands.js';
import * as icons from './debugIcons.js';
import './media/debugToolBar.css';
const DEBUG_TOOLBAR_POSITION_KEY = 'debug.actionswidgetposition';
const DEBUG_TOOLBAR_Y_KEY = 'debug.actionswidgety';
let DebugToolBar = class DebugToolBar extends Themable {
    constructor(notificationService, telemetryService, debugService, layoutService, storageService, configurationService, themeService, instantiationService, menuService, contextKeyService) {
        super(themeService);
        this.notificationService = notificationService;
        this.telemetryService = telemetryService;
        this.debugService = debugService;
        this.layoutService = layoutService;
        this.storageService = storageService;
        this.configurationService = configurationService;
        this.instantiationService = instantiationService;
        this.isVisible = false;
        this.isBuilt = false;
        this.stopActionViewItemDisposables = this._register(new DisposableStore());
        /** coordinate of the debug toolbar per aux window */
        this.auxWindowCoordinates = new WeakMap();
        this.trackPixelRatioListener = this._register(new MutableDisposable());
        this.$el = dom.$('div.debug-toolbar');
        // Note: changes to this setting require a restart, so no need to listen to it.
        const customWindowControls = getWindowControlsStyle(this.configurationService) === "custom" /* WindowControlsStyle.CUSTOM */;
        // Do not allow the widget to overflow or underflow window controls.
        // Use CSS calculations to avoid having to force layout with `.clientWidth`
        const controlsOnLeft = customWindowControls && platform === 1 /* Platform.Mac */;
        const controlsOnRight = customWindowControls && (platform === 3 /* Platform.Windows */ || platform === 2 /* Platform.Linux */);
        this.$el.style.transform = `translate(
			min(
				max(${controlsOnLeft ? '60px' : '0px'}, calc(-50% + (100vw * var(--x-position)))),
				calc(100vw - 100% - ${controlsOnRight ? '100px' : '0px'})
			),
			var(--y-position)
		)`;
        this.dragArea = dom.append(this.$el, dom.$('div.drag-area' + ThemeIcon.asCSSSelector(icons.debugGripper)));
        const actionBarContainer = dom.append(this.$el, dom.$('div.action-bar-container'));
        this.debugToolBarMenu = menuService.createMenu(MenuId.DebugToolBar, contextKeyService);
        this._register(this.debugToolBarMenu);
        this.activeActions = [];
        this.actionBar = this._register(new ActionBar(actionBarContainer, {
            orientation: 0 /* ActionsOrientation.HORIZONTAL */,
            actionViewItemProvider: (action, options) => {
                if (action.id === FOCUS_SESSION_ID) {
                    return this.instantiationService.createInstance(FocusSessionActionViewItem, action, undefined);
                }
                else if (action.id === STOP_ID || action.id === DISCONNECT_ID) {
                    this.stopActionViewItemDisposables.clear();
                    const item = this.instantiationService.invokeFunction(accessor => createDisconnectMenuItemAction(action, this.stopActionViewItemDisposables, accessor, { hoverDelegate: options.hoverDelegate }));
                    if (item) {
                        return item;
                    }
                }
                return createActionViewItem(this.instantiationService, action, options);
            }
        }));
        this.updateScheduler = this._register(new RunOnceScheduler(() => {
            const state = this.debugService.state;
            const toolBarLocation = this.configurationService.getValue('debug').toolBarLocation;
            if (state === 0 /* State.Inactive */ ||
                toolBarLocation !== 'floating' ||
                this.debugService.getModel().getSessions().every(s => s.suppressDebugToolbar) ||
                (state === 1 /* State.Initializing */ && this.debugService.initializingOptions?.suppressDebugToolbar)) {
                return this.hide();
            }
            const actions = getFlatActionBarActions(this.debugToolBarMenu.getActions({ shouldForwardArgs: true }));
            if (!arrays.equals(actions, this.activeActions, (first, second) => first.id === second.id && first.enabled === second.enabled)) {
                this.actionBar.clear();
                this.actionBar.push(actions, { icon: true, label: false });
                this.activeActions = actions;
            }
            this.show();
        }, 20));
        this.updateStyles();
        this.registerListeners();
        this.hide();
    }
    registerListeners() {
        this._register(this.debugService.onDidChangeState(() => this.updateScheduler.schedule()));
        this._register(this.configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('debug.toolBarLocation')) {
                this.updateScheduler.schedule();
            }
            if (e.affectsConfiguration("workbench.editor.showTabs" /* LayoutSettings.EDITOR_TABS_MODE */) || e.affectsConfiguration("window.commandCenter" /* LayoutSettings.COMMAND_CENTER */)) {
                this._yRange = undefined;
                this.setCoordinates();
            }
        }));
        this._register(this.debugToolBarMenu.onDidChange(() => this.updateScheduler.schedule()));
        this._register(this.actionBar.actionRunner.onDidRun((e) => {
            // check for error
            if (e.error && !errors.isCancellationError(e.error)) {
                this.notificationService.warn(e.error);
            }
            // log in telemetry
            this.telemetryService.publicLog2('workbenchActionExecuted', { id: e.action.id, from: 'debugActionsWidget' });
        }));
        this._register(dom.addDisposableGenericMouseUpListener(this.dragArea, (event) => {
            const mouseClickEvent = new StandardMouseEvent(dom.getWindow(this.dragArea), event);
            if (mouseClickEvent.detail === 2) {
                // double click on debug bar centers it again #8250
                this.setCoordinates(0.5, this.yDefault);
                this.storePosition();
            }
        }));
        this._register(dom.addDisposableGenericMouseDownListener(this.dragArea, (e) => {
            this.dragArea.classList.add('dragged');
            const activeWindow = dom.getWindow(this.layoutService.activeContainer);
            const originEvent = new StandardMouseEvent(activeWindow, e);
            const originX = this.computeCurrentXPercent();
            const originY = this.getCurrentYPosition();
            const mouseMoveListener = dom.addDisposableGenericMouseMoveListener(activeWindow, (e) => {
                const mouseMoveEvent = new StandardMouseEvent(activeWindow, e);
                // Prevent default to stop editor selecting text #8524
                mouseMoveEvent.preventDefault();
                this.setCoordinates(originX + (mouseMoveEvent.posx - originEvent.posx) / activeWindow.innerWidth, originY + mouseMoveEvent.posy - originEvent.posy);
            });
            const mouseUpListener = dom.addDisposableGenericMouseUpListener(activeWindow, (e) => {
                this.storePosition();
                this.dragArea.classList.remove('dragged');
                mouseMoveListener.dispose();
                mouseUpListener.dispose();
            });
        }));
        this._register(this.layoutService.onDidChangePartVisibility(() => this.setCoordinates()));
        this._register(this.layoutService.onDidChangeActiveContainer(async () => {
            this._yRange = undefined;
            // note: we intentionally don't keep the activeContainer before the
            // `await` clause to avoid any races due to quickly switching windows.
            await this.layoutService.whenContainerStylesLoaded(dom.getWindow(this.layoutService.activeContainer));
            if (this.isBuilt) {
                this.doShowInActiveContainer();
                this.setCoordinates();
            }
        }));
    }
    /**
     * Computes the x percent position at which the toolbar is currently displayed.
     */
    computeCurrentXPercent() {
        const { left, width } = this.$el.getBoundingClientRect();
        return (left + width / 2) / dom.getWindow(this.$el).innerWidth;
    }
    /**
     * Gets the x position set in the style of the toolbar. This may not be its
     * actual position on screen depending on toolbar locations.
     */
    getCurrentXPercent() {
        return Number(this.$el.style.getPropertyValue('--x-position'));
    }
    /** Gets the y position set in the style of the toolbar */
    getCurrentYPosition() {
        return parseInt(this.$el.style.getPropertyValue('--y-position'));
    }
    storePosition() {
        const activeWindow = dom.getWindow(this.layoutService.activeContainer);
        const isMainWindow = this.layoutService.activeContainer === this.layoutService.mainContainer;
        const x = this.getCurrentXPercent();
        const y = this.getCurrentYPosition();
        if (isMainWindow) {
            this.storageService.store(DEBUG_TOOLBAR_POSITION_KEY, x, 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
            this.storageService.store(DEBUG_TOOLBAR_Y_KEY, y, 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        }
        else {
            this.auxWindowCoordinates.set(activeWindow, { x, y });
        }
    }
    updateStyles() {
        super.updateStyles();
        if (this.$el) {
            this.$el.style.backgroundColor = this.getColor(debugToolBarBackground) || '';
            const widgetShadowColor = this.getColor(widgetShadow);
            this.$el.style.boxShadow = widgetShadowColor ? `0 0 8px 2px ${widgetShadowColor}` : '';
            const contrastBorderColor = this.getColor(widgetBorder);
            const borderColor = this.getColor(debugToolBarBorder);
            if (contrastBorderColor) {
                this.$el.style.border = `1px solid ${contrastBorderColor}`;
            }
            else {
                this.$el.style.border = borderColor ? `solid ${borderColor}` : 'none';
                this.$el.style.border = '1px 0';
            }
        }
    }
    /** Gets the stored X position of the middle of the toolbar based on the current window width */
    getStoredXPosition() {
        const currentWindow = dom.getWindow(this.layoutService.activeContainer);
        const isMainWindow = currentWindow === mainWindow;
        const storedPercentage = isMainWindow
            ? Number(this.storageService.get(DEBUG_TOOLBAR_POSITION_KEY, 0 /* StorageScope.PROFILE */))
            : this.auxWindowCoordinates.get(currentWindow)?.x;
        return storedPercentage !== undefined && !isNaN(storedPercentage) ? storedPercentage : 0.5;
    }
    getStoredYPosition() {
        const currentWindow = dom.getWindow(this.layoutService.activeContainer);
        const isMainWindow = currentWindow === mainWindow;
        const storedY = isMainWindow
            ? this.storageService.getNumber(DEBUG_TOOLBAR_Y_KEY, 0 /* StorageScope.PROFILE */)
            : this.auxWindowCoordinates.get(currentWindow)?.y;
        return storedY ?? this.yDefault;
    }
    setCoordinates(x, y) {
        if (!this.isVisible) {
            return;
        }
        x ??= this.getStoredXPosition();
        y ??= this.getStoredYPosition();
        const [yMin, yMax] = this.yRange;
        y = Math.max(yMin, Math.min(y, yMax));
        this.$el.style.setProperty('--x-position', `${x}`);
        this.$el.style.setProperty('--y-position', `${y}px`);
    }
    get yDefault() {
        return this.layoutService.mainContainerOffset.top;
    }
    get yRange() {
        if (!this._yRange) {
            const isTitleBarVisible = this.layoutService.isVisible("workbench.parts.titlebar" /* Parts.TITLEBAR_PART */, dom.getWindow(this.layoutService.activeContainer));
            const yMin = isTitleBarVisible ? 0 : this.layoutService.mainContainerOffset.top;
            let yMax = 0;
            if (isTitleBarVisible) {
                if (this.configurationService.getValue("window.commandCenter" /* LayoutSettings.COMMAND_CENTER */) === true) {
                    yMax += 35;
                }
                else {
                    yMax += 28;
                }
            }
            if (this.configurationService.getValue("workbench.editor.showTabs" /* LayoutSettings.EDITOR_TABS_MODE */) !== "none" /* EditorTabsMode.NONE */) {
                yMax += 35;
            }
            this._yRange = [yMin, yMax];
        }
        return this._yRange;
    }
    show() {
        if (this.isVisible) {
            this.setCoordinates();
            return;
        }
        if (!this.isBuilt) {
            this.isBuilt = true;
            this.doShowInActiveContainer();
        }
        this.isVisible = true;
        dom.show(this.$el);
        this.setCoordinates();
    }
    doShowInActiveContainer() {
        this.layoutService.activeContainer.appendChild(this.$el);
        this.trackPixelRatioListener.value = PixelRatio.getInstance(dom.getWindow(this.$el)).onDidChange(() => this.setCoordinates());
    }
    hide() {
        this.isVisible = false;
        dom.hide(this.$el);
    }
    dispose() {
        super.dispose();
        this.$el?.remove();
    }
};
DebugToolBar = __decorate([
    __param(0, INotificationService),
    __param(1, ITelemetryService),
    __param(2, IDebugService),
    __param(3, IWorkbenchLayoutService),
    __param(4, IStorageService),
    __param(5, IConfigurationService),
    __param(6, IThemeService),
    __param(7, IInstantiationService),
    __param(8, IMenuService),
    __param(9, IContextKeyService)
], DebugToolBar);
export { DebugToolBar };
export function createDisconnectMenuItemAction(action, disposables, accessor, options) {
    const menuService = accessor.get(IMenuService);
    const contextKeyService = accessor.get(IContextKeyService);
    const instantiationService = accessor.get(IInstantiationService);
    const menu = menuService.getMenuActions(MenuId.DebugToolBarStop, contextKeyService, { shouldForwardArgs: true });
    const secondary = getFlatActionBarActions(menu);
    if (!secondary.length) {
        return undefined;
    }
    const dropdownAction = disposables.add(new Action('notebook.moreRunActions', localize('notebook.moreRunActionsLabel', "More..."), 'codicon-chevron-down', true));
    const item = instantiationService.createInstance(DropdownWithPrimaryActionViewItem, action, dropdownAction, secondary, 'debug-stop-actions', options);
    return item;
}
// Debug toolbar
const debugViewTitleItems = [];
const registerDebugToolBarItem = (id, title, order, icon, when, precondition, alt) => {
    MenuRegistry.appendMenuItem(MenuId.DebugToolBar, {
        group: 'navigation',
        when,
        order,
        command: {
            id,
            title,
            icon,
            precondition
        },
        alt
    });
    // Register actions in debug viewlet when toolbar is docked
    debugViewTitleItems.push(MenuRegistry.appendMenuItem(MenuId.ViewContainerTitle, {
        group: 'navigation',
        when: ContextKeyExpr.and(when, ContextKeyExpr.equals('viewContainer', VIEWLET_ID), CONTEXT_DEBUG_STATE.notEqualsTo('inactive'), ContextKeyExpr.equals('config.debug.toolBarLocation', 'docked')),
        order,
        command: {
            id,
            title,
            icon,
            precondition
        }
    }));
};
markAsSingleton(MenuRegistry.onDidChangeMenu(e => {
    // In case the debug toolbar is docked we need to make sure that the docked toolbar has the up to date commands registered #115945
    if (e.has(MenuId.DebugToolBar)) {
        dispose(debugViewTitleItems);
        const items = MenuRegistry.getMenuItems(MenuId.DebugToolBar);
        for (const i of items) {
            debugViewTitleItems.push(MenuRegistry.appendMenuItem(MenuId.ViewContainerTitle, {
                ...i,
                when: ContextKeyExpr.and(i.when, ContextKeyExpr.equals('viewContainer', VIEWLET_ID), CONTEXT_DEBUG_STATE.notEqualsTo('inactive'), ContextKeyExpr.equals('config.debug.toolBarLocation', 'docked'))
            }));
        }
    }
}));
const CONTEXT_TOOLBAR_COMMAND_CENTER = ContextKeyExpr.equals('config.debug.toolBarLocation', 'commandCenter');
MenuRegistry.appendMenuItem(MenuId.CommandCenterCenter, {
    submenu: MenuId.DebugToolBar,
    title: 'Debug',
    icon: Codicon.debug,
    order: 1,
    when: ContextKeyExpr.and(CONTEXT_IN_DEBUG_MODE, CONTEXT_TOOLBAR_COMMAND_CENTER)
});
registerDebugToolBarItem(CONTINUE_ID, CONTINUE_LABEL, 10, icons.debugContinue, CONTEXT_DEBUG_STATE.isEqualTo('stopped'));
registerDebugToolBarItem(PAUSE_ID, PAUSE_LABEL, 10, icons.debugPause, CONTEXT_DEBUG_STATE.notEqualsTo('stopped'), ContextKeyExpr.and(CONTEXT_DEBUG_STATE.isEqualTo('running'), CONTEXT_FOCUSED_SESSION_IS_NO_DEBUG.toNegated()));
registerDebugToolBarItem(STOP_ID, STOP_LABEL, 70, icons.debugStop, CONTEXT_FOCUSED_SESSION_IS_ATTACH.toNegated(), undefined, { id: DISCONNECT_ID, title: DISCONNECT_LABEL, icon: icons.debugDisconnect, precondition: ContextKeyExpr.and(CONTEXT_FOCUSED_SESSION_IS_ATTACH.toNegated(), CONTEXT_TERMINATE_DEBUGGEE_SUPPORTED), });
registerDebugToolBarItem(DISCONNECT_ID, DISCONNECT_LABEL, 70, icons.debugDisconnect, CONTEXT_FOCUSED_SESSION_IS_ATTACH, undefined, { id: STOP_ID, title: STOP_LABEL, icon: icons.debugStop, precondition: ContextKeyExpr.and(CONTEXT_FOCUSED_SESSION_IS_ATTACH, CONTEXT_TERMINATE_DEBUGGEE_SUPPORTED), });
registerDebugToolBarItem(STEP_OVER_ID, STEP_OVER_LABEL, 20, icons.debugStepOver, undefined, CONTEXT_DEBUG_STATE.isEqualTo('stopped'));
registerDebugToolBarItem(STEP_INTO_ID, STEP_INTO_LABEL, 30, icons.debugStepInto, undefined, CONTEXT_DEBUG_STATE.isEqualTo('stopped'));
registerDebugToolBarItem(STEP_OUT_ID, STEP_OUT_LABEL, 40, icons.debugStepOut, undefined, CONTEXT_DEBUG_STATE.isEqualTo('stopped'));
registerDebugToolBarItem(RESTART_SESSION_ID, RESTART_LABEL, 60, icons.debugRestart);
registerDebugToolBarItem(STEP_BACK_ID, localize('stepBackDebug', "Step Back"), 50, icons.debugStepBack, CONTEXT_STEP_BACK_SUPPORTED, CONTEXT_DEBUG_STATE.isEqualTo('stopped'));
registerDebugToolBarItem(REVERSE_CONTINUE_ID, localize('reverseContinue', "Reverse"), 55, icons.debugReverseContinue, CONTEXT_STEP_BACK_SUPPORTED, CONTEXT_DEBUG_STATE.isEqualTo('stopped'));
registerDebugToolBarItem(FOCUS_SESSION_ID, FOCUS_SESSION_LABEL, 100, Codicon.listTree, ContextKeyExpr.and(CONTEXT_MULTI_SESSION_DEBUG, CONTEXT_TOOLBAR_COMMAND_CENTER.negate()));
MenuRegistry.appendMenuItem(MenuId.DebugToolBarStop, {
    group: 'navigation',
    when: ContextKeyExpr.and(CONTEXT_FOCUSED_SESSION_IS_ATTACH.toNegated(), CONTEXT_TERMINATE_DEBUGGEE_SUPPORTED),
    order: 0,
    command: {
        id: DISCONNECT_ID,
        title: DISCONNECT_LABEL,
        icon: icons.debugDisconnect
    }
});
MenuRegistry.appendMenuItem(MenuId.DebugToolBarStop, {
    group: 'navigation',
    when: ContextKeyExpr.and(CONTEXT_FOCUSED_SESSION_IS_ATTACH, CONTEXT_TERMINATE_DEBUGGEE_SUPPORTED),
    order: 0,
    command: {
        id: STOP_ID,
        title: STOP_LABEL,
        icon: icons.debugStop
    }
});
MenuRegistry.appendMenuItem(MenuId.DebugToolBarStop, {
    group: 'navigation',
    when: ContextKeyExpr.or(ContextKeyExpr.and(CONTEXT_FOCUSED_SESSION_IS_ATTACH.toNegated(), CONTEXT_SUSPEND_DEBUGGEE_SUPPORTED, CONTEXT_TERMINATE_DEBUGGEE_SUPPORTED), ContextKeyExpr.and(CONTEXT_FOCUSED_SESSION_IS_ATTACH, CONTEXT_SUSPEND_DEBUGGEE_SUPPORTED)),
    order: 0,
    command: {
        id: DISCONNECT_AND_SUSPEND_ID,
        title: DISCONNECT_AND_SUSPEND_LABEL,
        icon: icons.debugDisconnect
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdUb29sQmFyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZGVidWcvYnJvd3Nlci9kZWJ1Z1Rvb2xCYXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQztBQUN2RCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUM1RSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDcEUsT0FBTyxFQUFFLFNBQVMsRUFBdUMsTUFBTSxvREFBb0QsQ0FBQztBQUVwSCxPQUFPLEVBQWMsVUFBVSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDNUUsT0FBTyxFQUFFLE1BQU0sRUFBMkYsTUFBTSxvQ0FBb0MsQ0FBQztBQUNySixPQUFPLEtBQUssTUFBTSxNQUFNLG1DQUFtQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RCxPQUFPLEtBQUssTUFBTSxNQUFNLG1DQUFtQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxlQUFlLEVBQUUsT0FBTyxFQUFlLGVBQWUsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2pJLE9BQU8sRUFBWSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUN6RSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFHakUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBRTlDLE9BQU8sRUFBRSxpQ0FBaUMsRUFBNkMsTUFBTSwyRUFBMkUsQ0FBQztB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