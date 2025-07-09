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
import './media/menubarControl.css';
import { localize, localize2 } from '../../../../nls.js';
import { IMenuService, MenuId, SubmenuItemAction, registerAction2, Action2, MenuItemAction, MenuRegistry } from '../../../../platform/actions/common/actions.js';
import { getMenuBarVisibility, hasNativeTitlebar } from '../../../../platform/window/common/window.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { Action, SubmenuAction, Separator, ActionRunner, toAction } from '../../../../base/common/actions.js';
import { addDisposableListener, Dimension, EventType } from '../../../../base/browser/dom.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { isMacintosh, isWeb, isIOS, isNative } from '../../../../base/common/platform.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { isRecentFolder, isRecentWorkspace, IWorkspacesService } from '../../../../platform/workspaces/common/workspaces.js';
import { RunOnceScheduler } from '../../../../base/common/async.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { IUpdateService } from '../../../../platform/update/common/update.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { INotificationService, Severity } from '../../../../platform/notification/common/notification.js';
import { IPreferencesService } from '../../../services/preferences/common/preferences.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { MenuBar } from '../../../../base/browser/ui/menu/menubar.js';
import { HorizontalDirection, VerticalDirection } from '../../../../base/browser/ui/menu/menu.js';
import { mnemonicMenuLabel, unmnemonicLabel } from '../../../../base/common/labels.js';
import { IAccessibilityService } from '../../../../platform/accessibility/common/accessibility.js';
import { isFullscreen, onDidChangeFullscreen } from '../../../../base/browser/browser.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { BrowserFeatures } from '../../../../base/browser/canIUse.js';
import { IsMacNativeContext, IsWebContext } from '../../../../platform/contextkey/common/contextkeys.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { OpenRecentAction } from '../../actions/windowActions.js';
import { isICommandActionToggleInfo } from '../../../../platform/action/common/action.js';
import { getFlatContextMenuActions } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { defaultMenuStyles } from '../../../../platform/theme/browser/defaultStyles.js';
import { mainWindow } from '../../../../base/browser/window.js';
MenuRegistry.appendMenuItem(MenuId.MenubarMainMenu, {
    submenu: MenuId.MenubarFileMenu,
    title: {
        value: 'File',
        original: 'File',
        mnemonicTitle: localize({ key: 'mFile', comment: ['&& denotes a mnemonic'] }, "&&File"),
    },
    order: 1
});
MenuRegistry.appendMenuItem(MenuId.MenubarMainMenu, {
    submenu: MenuId.MenubarEditMenu,
    title: {
        value: 'Edit',
        original: 'Edit',
        mnemonicTitle: localize({ key: 'mEdit', comment: ['&& denotes a mnemonic'] }, "&&Edit")
    },
    order: 2
});
MenuRegistry.appendMenuItem(MenuId.MenubarMainMenu, {
    submenu: MenuId.MenubarSelectionMenu,
    title: {
        value: 'Selection',
        original: 'Selection',
        mnemonicTitle: localize({ key: 'mSelection', comment: ['&& denotes a mnemonic'] }, "&&Selection")
    },
    order: 3
});
MenuRegistry.appendMenuItem(MenuId.MenubarMainMenu, {
    submenu: MenuId.MenubarViewMenu,
    title: {
        value: 'View',
        original: 'View',
        mnemonicTitle: localize({ key: 'mView', comment: ['&& denotes a mnemonic'] }, "&&View")
    },
    order: 4
});
MenuRegistry.appendMenuItem(MenuId.MenubarMainMenu, {
    submenu: MenuId.MenubarGoMenu,
    title: {
        value: 'Go',
        original: 'Go',
        mnemonicTitle: localize({ key: 'mGoto', comment: ['&& denotes a mnemonic'] }, "&&Go")
    },
    order: 5
});
MenuRegistry.appendMenuItem(MenuId.MenubarMainMenu, {
    submenu: MenuId.MenubarTerminalMenu,
    title: {
        value: 'Terminal',
        original: 'Terminal',
        mnemonicTitle: localize({ key: 'mTerminal', comment: ['&& denotes a mnemonic'] }, "&&Terminal")
    },
    order: 7
});
MenuRegistry.appendMenuItem(MenuId.MenubarMainMenu, {
    submenu: MenuId.MenubarHelpMenu,
    title: {
        value: 'Help',
        original: 'Help',
        mnemonicTitle: localize({ key: 'mHelp', comment: ['&& denotes a mnemonic'] }, "&&Help")
    },
    order: 8
});
MenuRegistry.appendMenuItem(MenuId.MenubarMainMenu, {
    submenu: MenuId.MenubarPreferencesMenu,
    title: {
        value: 'Preferences',
        original: 'Preferences',
        mnemonicTitle: localize({ key: 'mPreferences', comment: ['&& denotes a mnemonic'] }, "Preferences")
    },
    when: IsMacNativeContext,
    order: 9
});
export class MenubarControl extends Disposable {
    static { this.MAX_MENU_RECENT_ENTRIES = 10; }
    constructor(menuService, workspacesService, contextKeyService, keybindingService, configurationService, labelService, updateService, storageService, notificationService, preferencesService, environmentService, accessibilityService, hostService, commandService) {
        super();
        this.menuService = menuService;
        this.workspacesService = workspacesService;
        this.contextKeyService = contextKeyService;
        this.keybindingService = keybindingService;
        this.configurationService = configurationService;
        this.labelService = labelService;
        this.updateService = updateService;
        this.storageService = storageService;
        this.notificationService = notificationService;
        this.preferencesService = preferencesService;
        this.environmentService = environmentService;
        this.accessibilityService = accessibilityService;
        this.hostService = hostService;
        this.commandService = commandService;
        this.keys = [
            'window.menuBarVisibility',
            'window.enableMenuBarMnemonics',
            'window.customMenuBarAltFocus',
            'workbench.sideBar.location',
            'window.nativeTabs'
        ];
        this.menus = {};
        this.topLevelTitles = {};
        this.recentlyOpened = { files: [], workspaces: [] };
        this.mainMenu = this._register(this.menuService.createMenu(MenuId.MenubarMainMenu, this.contextKeyService));
        this.mainMenuDisposables = this._register(new DisposableStore());
        this.setupMainMenu();
        this.menuUpdater = this._register(new RunOnceScheduler(() => this.doUpdateMenubar(false), 200));
        this.notifyUserOfCustomMenubarAccessibility();
    }
    registerListeners() {
        // Listen for window focus changes
        this._register(this.hostService.onDidChangeFocus(e => this.onDidChangeWindowFocus(e)));
        // Update when config changes
        this._register(this.configurationService.onDidChangeConfiguration(e => this.onConfigurationUpdated(e)));
        // Listen to update service
        this._register(this.updateService.onStateChange(() => this.onUpdateStateChange()));
        // Listen for changes in recently opened menu
        this._register(this.workspacesService.onDidChangeRecentlyOpened(() => { this.onDidChangeRecentlyOpened(); }));
        // Listen to keybindings change
        this._register(this.keybindingService.onDidUpdateKeybindings(() => this.updateMenubar()));
        // Update recent menu items on formatter registration
        this._register(this.labelService.onDidChangeFormatters(() => { this.onDidChangeRecentlyOpened(); }));
        // Listen for changes on the main menu
        this._register(this.mainMenu.onDidChange(() => { this.setupMainMenu(); this.doUpdateMenubar(true); }));
    }
    setupMainMenu() {
        this.mainMenuDisposables.clear();
        this.menus = {};
        this.topLevelTitles = {};
        const [, mainMenuActions] = this.mainMenu.getActions()[0];
        for (const mainMenuAction of mainMenuActions) {
            if (mainMenuAction instanceof SubmenuItemAction && typeof mainMenuAction.item.title !== 'string') {
                this.menus[mainMenuAction.item.title.original] = this.mainMenuDisposables.add(this.menuService.createMenu(mainMenuAction.item.submenu, this.contextKeyService, { emitEventsForSubmenuChanges: true }));
                this.topLevelTitles[mainMenuAction.item.title.original] = mainMenuAction.item.title.mnemonicTitle ?? mainMenuAction.item.title.value;
            }
        }
    }
    updateMenubar() {
        this.menuUpdater.schedule();
    }
    calculateActionLabel(action) {
        const label = action.label;
        switch (action.id) {
            default:
                break;
        }
        return label;
    }
    onUpdateStateChange() {
        this.updateMenubar();
    }
    onUpdateKeybindings() {
        this.updateMenubar();
    }
    getOpenRecentActions() {
        if (!this.recentlyOpened) {
            return [];
        }
        const { workspaces, files } = this.recentlyOpened;
        const result = [];
        if (workspaces.length > 0) {
            for (let i = 0; i < MenubarControl.MAX_MENU_RECENT_ENTRIES && i < workspaces.length; i++) {
                result.push(this.createOpenRecentMenuAction(workspaces[i]));
            }
            result.push(new Separator());
        }
        if (files.length > 0) {
            for (let i = 0; i < MenubarControl.MAX_MENU_RECENT_ENTRIES && i < files.length; i++) {
                result.push(this.createOpenRecentMenuAction(files[i]));
            }
            result.push(new Separator());
        }
        return result;
    }
    onDidChangeWindowFocus(hasFocus) {
        // When we regain focus, update the recent menu items
        if (hasFocus) {
            this.onDidChangeRecentlyOpened();
        }
    }
    onConfigurationUpdated(event) {
        if (this.keys.some(key => event.affectsConfiguration(key))) {
            this.updateMenubar();
        }
        if (event.affectsConfiguration('editor.accessibilitySupport')) {
            this.notifyUserOfCustomMenubarAccessibility();
        }
        // Since we try not update when hidden, we should
        // try to update the recently opened list on visibility changes
        if (event.affectsConfiguration('window.menuBarVisibility')) {
            this.onDidChangeRecentlyOpened();
        }
    }
    get menubarHidden() {
        return isMacintosh && isNative ? false : getMenuBarVisibility(this.configurationService) === 'hidden';
    }
    onDidChangeRecentlyOpened() {
        // Do not update recently opened when the menubar is hidden #108712
        if (!this.menubarHidden) {
            this.workspacesService.getRecentlyOpened().then(recentlyOpened => {
                this.recentlyOpened = recentlyOpened;
                this.updateMenubar();
            });
        }
    }
    createOpenRecentMenuAction(recent) {
        let label;
        let uri;
        let commandId;
        let openable;
        const remoteAuthority = recent.remoteAuthority;
        if (isRecentFolder(recent)) {
            uri = recent.folderUri;
            label = recent.label || this.labelService.getWorkspaceLabel(uri, { verbose: 2 /* Verbosity.LONG */ });
            commandId = 'openRecentFolder';
            openable = { folderUri: uri };
        }
        else if (isRecentWorkspace(recent)) {
            uri = recent.workspace.configPath;
            label = recent.label || this.labelService.getWorkspaceLabel(recent.workspace, { verbose: 2 /* Verbosity.LONG */ });
            commandId = 'openRecentWorkspace';
            openable = { workspaceUri: uri };
        }
        else {
            uri = recent.fileUri;
            label = recent.label || this.labelService.getUriLabel(uri, { appendWorkspaceSuffix: true });
            commandId = 'openRecentFile';
            openable = { fileUri: uri };
        }
        const ret = toAction({
            id: commandId, label: unmnemonicLabel(label), run: (browserEvent) => {
                const openInNewWindow = browserEvent && ((!isMacintosh && (browserEvent.ctrlKey || browserEvent.shiftKey)) || (isMacintosh && (browserEvent.metaKey || browserEvent.altKey)));
                return this.hostService.openWindow([openable], {
                    forceNewWindow: !!openInNewWindow,
                    remoteAuthority: remoteAuthority || null // local window if remoteAuthority is not set or can not be deducted from the openable
                });
            }
        });
        return Object.assign(ret, { uri, remoteAuthority });
    }
    notifyUserOfCustomMenubarAccessibility() {
        if (isWeb || isMacintosh) {
            return;
        }
        const hasBeenNotified = this.storageService.getBoolean('menubar/accessibleMenubarNotified', -1 /* StorageScope.APPLICATION */, false);
        const usingCustomMenubar = !hasNativeTitlebar(this.configurationService);
        if (hasBeenNotified || usingCustomMenubar || !this.accessibilityService.isScreenReaderOptimized()) {
            return;
        }
        const message = localize('menubar.customTitlebarAccessibilityNotification', "Accessibility support is enabled for you. For the most accessible experience, we recommend the custom title bar style.");
        this.notificationService.prompt(Severity.Info, message, [
            {
                label: localize('goToSetting', "Open Settings"),
                run: () => {
                    return this.preferencesService.openUserSettings({ query: "window.titleBarStyle" /* TitleBarSetting.TITLE_BAR_STYLE */ });
                }
            }
        ]);
        this.storageService.store('menubar/accessibleMenubarNotified', true, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
    }
}
// This is a bit complex due to the issue https://github.com/microsoft/vscode/issues/205836
let focusMenuBarEmitter = undefined;
function enableFocusMenuBarAction() {
    if (!focusMenuBarEmitter) {
        focusMenuBarEmitter = new Emitter();
        registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: `workbench.actions.menubar.focus`,
                    title: localize2('focusMenu', 'Focus Application Menu'),
                    keybinding: {
                        primary: 512 /* KeyMod.Alt */ | 68 /* KeyCode.F10 */,
                        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                        when: IsWebContext
                    },
                    f1: true
                });
            }
            async run() {
                focusMenuBarEmitter?.fire();
            }
        });
    }
    return focusMenuBarEmitter;
}
let CustomMenubarControl = class CustomMenubarControl extends MenubarControl {
    constructor(menuService, workspacesService, contextKeyService, keybindingService, configurationService, labelService, updateService, storageService, notificationService, preferencesService, environmentService, accessibilityService, telemetryService, hostService, commandService) {
        super(menuService, workspacesService, contextKeyService, keybindingService, configurationService, labelService, updateService, storageService, notificationService, preferencesService, environmentService, accessibilityService, hostService, commandService);
        this.telemetryService = telemetryService;
        this.alwaysOnMnemonics = false;
        this.focusInsideMenubar = false;
        this.pendingFirstTimeUpdate = false;
        this.visible = true;
        this.webNavigationMenu = this._register(this.menuService.createMenu(MenuId.MenubarHomeMenu, this.contextKeyService));
        this.reinstallDisposables = this._register(new DisposableStore());
        this.updateActionsDisposables = this._register(new DisposableStore());
        this._onVisibilityChange = this._register(new Emitter());
        this._onFocusStateChange = this._register(new Emitter());
        this.actionRunner = this._register(new ActionRunner());
        this.actionRunner.onDidRun(e => {
            this.telemetryService.publicLog2('workbenchActionExecuted', { id: e.action.id, from: 'menu' });
        });
        this.workspacesService.getRecentlyOpened().then((recentlyOpened) => {
            this.recentlyOpened = recentlyOpened;
        });
        this.registerListeners();
    }
    doUpdateMenubar(firstTime) {
        if (!this.focusInsideMenubar) {
            this.setupCustomMenubar(firstTime);
        }
        if (firstTime) {
            this.pendingFirstTimeUpdate = true;
        }
    }
    getUpdateAction() {
        const state = this.updateService.state;
        switch (state.type) {
            case "idle" /* StateType.Idle */:
                return new Action('update.check', localize({ key: 'checkForUpdates', comment: ['&& denotes a mnemonic'] }, "Check for &&Updates..."), undefined, true, () => this.updateService.checkForUpdates(true));
            case "checking for updates" /* StateType.CheckingForUpdates */:
                return new Action('update.checking', localize('checkingForUpdates', "Checking for Updates..."), undefined, false);
            case "available for download" /* StateType.AvailableForDownload */:
                return new Action('update.downloadNow', localize({ key: 'download now', comment: ['&& denotes a mnemonic'] }, "D&&ownload Update"), undefined, true, () => this.updateService.downloadUpdate());
            case "downloading" /* StateType.Downloading */:
                return new Action('update.downloading', localize('DownloadingUpdate', "Downloading Update..."), undefined, false);
            case "downloaded" /* StateType.Downloaded */:
                return isMacintosh ? null : new Action('update.install', localize({ key: 'installUpdate...', comment: ['&& denotes a mnemonic'] }, "Install &&Update..."), undefined, true, () => this.updateService.applyUpdate());
            case "updating" /* StateType.Updating */:
                return new Action('update.updating', localize('installingUpdate', "Installing Update..."), undefined, false);
            case "ready" /* StateType.Ready */:
                return new Action('update.restart', localize({ key: 'restartToUpdate', comment: ['&& denotes a mnemonic'] }, "Restart to &&Update"), undefined, true, () => this.updateService.quitAndInstall());
            default:
                return null;
        }
    }
    get currentMenubarVisibility() {
        return getMenuBarVisibility(this.configurationService);
    }
    get currentDisableMenuBarAltFocus() {
        const settingValue = this.configurationService.getValue('window.customMenuBarAltFocus');
        let disableMenuBarAltBehavior = false;
        if (typeof settingValue === 'boolean') {
            disableMenuBarAltBehavior = !settingValue;
        }
        return disableMenuBarAltBehavior;
    }
    insertActionsBefore(nextAction, target) {
        switch (nextAction.id) {
            case OpenRecentAction.ID:
                target.push(...this.getOpenRecentActions());
                break;
            case 'workbench.action.showAboutDialog':
                if (!isMacintosh && !isWeb) {
                    const updateAction = this.getUpdateAction();
                    if (updateAction) {
                        updateAction.label = mnemonicMenuLabel(updateAction.label);
                        target.push(updateAction);
                        target.push(new Separator());
                    }
                }
                break;
            default:
                break;
        }
    }
    get currentEnableMenuBarMnemonics() {
        let enableMenuBarMnemonics = this.configurationService.getValue('window.enableMenuBarMnemonics');
        if (typeof enableMenuBarMnemonics !== 'boolean') {
            enableMenuBarMnemonics = true;
        }
        return enableMenuBarMnemonics && (!isWeb || isFullscreen(mainWindow));
    }
    get currentCompactMenuMode() {
        if (this.currentMenubarVisibility !== 'compact') {
            return undefined;
        }
        // Menu bar lives in activity bar and should flow based on its location
        const currentSidebarLocation = this.configurationService.getValue('workbench.sideBar.location');
        const horizontalDirection = currentSidebarLocation === 'right' ? HorizontalDirection.Left : HorizontalDirection.Right;
        const activityBarLocation = this.configurationService.getValue('workbench.activityBar.location');
        const verticalDirection = activityBarLocation === "bottom" /* ActivityBarPosition.BOTTOM */ ? VerticalDirection.Above : VerticalDirection.Below;
        return { horizontal: horizontalDirection, vertical: verticalDirection };
    }
    onDidVisibilityChange(visible) {
        this.visible = visible;
        this.onDidChangeRecentlyOpened();
        this._onVisibilityChange.fire(visible);
    }
    toActionsArray(menu) {
        return getFlatContextMenuActions(menu.getActions({ shouldForwardArgs: true }));
    }
    setupCustomMenubar(firstTime) {
        // If there is no container, we cannot setup the menubar
        if (!this.container) {
            return;
        }
        if (firstTime) {
            // Reset and create new menubar
            if (this.menubar) {
                this.reinstallDisposables.clear();
            }
            this.menubar = this.reinstallDisposables.add(new MenuBar(this.container, this.getMenuBarOptions(), defaultMenuStyles));
            this.accessibilityService.alwaysUnderlineAccessKeys().then(val => {
                this.alwaysOnMnemonics = val;
                this.menubar?.update(this.getMenuBarOptions());
            });
            this.reinstallDisposables.add(this.menubar.onFocusStateChange(focused => {
                this._onFocusStateChange.fire(focused);
                // When the menubar loses focus, update it to clear any pending updates
                if (!focused) {
                    if (this.pendingFirstTimeUpdate) {
                        this.setupCustomMenubar(true);
                        this.pendingFirstTimeUpdate = false;
                    }
                    else {
                        this.updateMenubar();
                    }
                    this.focusInsideMenubar = false;
                }
            }));
            this.reinstallDisposables.add(this.menubar.onVisibilityChange(e => this.onDidVisibilityChange(e)));
            // Before we focus the menubar, stop updates to it so that focus-related context keys will work
            this.reinstallDisposables.add(addDisposableListener(this.container, EventType.FOCUS_IN, () => {
                this.focusInsideMenubar = true;
            }));
            this.reinstallDisposables.add(addDisposableListener(this.container, EventType.FOCUS_OUT, () => {
                this.focusInsideMenubar = false;
            }));
            // Fire visibility change for the first install if menu is shown
            if (this.menubar.isVisible) {
                this.onDidVisibilityChange(true);
            }
        }
        else {
            this.menubar?.update(this.getMenuBarOptions());
        }
        // Update the menu actions
        const updateActions = (menuActions, target, topLevelTitle, store) => {
            target.splice(0);
            for (const menuItem of menuActions) {
                this.insertActionsBefore(menuItem, target);
                if (menuItem instanceof Separator) {
                    target.push(menuItem);
                }
                else if (menuItem instanceof SubmenuItemAction || menuItem instanceof MenuItemAction) {
                    // use mnemonicTitle whenever possible
                    let title = typeof menuItem.item.title === 'string'
                        ? menuItem.item.title
                        : menuItem.item.title.mnemonicTitle ?? menuItem.item.title.value;
                    if (menuItem instanceof SubmenuItemAction) {
                        const submenuActions = [];
                        updateActions(menuItem.actions, submenuActions, topLevelTitle, store);
                        if (submenuActions.length > 0) {
                            target.push(new SubmenuAction(menuItem.id, mnemonicMenuLabel(title), submenuActions));
                        }
                    }
                    else {
                        if (isICommandActionToggleInfo(menuItem.item.toggled)) {
                            title = menuItem.item.toggled.mnemonicTitle ?? menuItem.item.toggled.title ?? title;
                        }
                        const newAction = store.add(new Action(menuItem.id, mnemonicMenuLabel(title), menuItem.class, menuItem.enabled, () => this.commandService.executeCommand(menuItem.id)));
                        newAction.tooltip = menuItem.tooltip;
                        newAction.checked = menuItem.checked;
                        target.push(newAction);
                    }
                }
            }
            // Append web navigation menu items to the file menu when not compact
            if (topLevelTitle === 'File' && this.currentCompactMenuMode === undefined) {
                const webActions = this.getWebNavigationActions();
                if (webActions.length) {
                    target.push(...webActions);
                }
            }
        };
        for (const title of Object.keys(this.topLevelTitles)) {
            const menu = this.menus[title];
            if (firstTime && menu) {
                const menuChangedDisposable = this.reinstallDisposables.add(new DisposableStore());
                this.reinstallDisposables.add(menu.onDidChange(() => {
                    if (!this.focusInsideMenubar) {
                        const actions = [];
                        menuChangedDisposable.clear();
                        updateActions(this.toActionsArray(menu), actions, title, menuChangedDisposable);
                        this.menubar?.updateMenu({ actions, label: mnemonicMenuLabel(this.topLevelTitles[title]) });
                    }
                }));
                // For the file menu, we need to update if the web nav menu updates as well
                if (menu === this.menus.File) {
                    const webMenuChangedDisposable = this.reinstallDisposables.add(new DisposableStore());
                    this.reinstallDisposables.add(this.webNavigationMenu.onDidChange(() => {
                        if (!this.focusInsideMenubar) {
                            const actions = [];
                            webMenuChangedDisposable.clear();
                            updateActions(this.toActionsArray(menu), actions, title, webMenuChangedDisposable);
                            this.menubar?.updateMenu({ actions, label: mnemonicMenuLabel(this.topLevelTitles[title]) });
                        }
                    }));
                }
            }
            const actions = [];
            if (menu) {
                this.updateActionsDisposables.clear();
                updateActions(this.toActionsArray(menu), actions, title, this.updateActionsDisposables);
            }
            if (this.menubar) {
                if (!firstTime) {
                    this.menubar.updateMenu({ actions, label: mnemonicMenuLabel(this.topLevelTitles[title]) });
                }
                else {
                    this.menubar.push({ actions, label: mnemonicMenuLabel(this.topLevelTitles[title]) });
                }
            }
        }
    }
    getWebNavigationActions() {
        if (!isWeb) {
            return []; // only for web
        }
        const webNavigationActions = [];
        for (const groups of this.webNavigationMenu.getActions()) {
            const [, actions] = groups;
            for (const action of actions) {
                if (action instanceof MenuItemAction) {
                    const title = typeof action.item.title === 'string'
                        ? action.item.title
                        : action.item.title.mnemonicTitle ?? action.item.title.value;
                    webNavigationActions.push(new Action(action.id, mnemonicMenuLabel(title), action.class, action.enabled, async (event) => {
                        this.commandService.executeCommand(action.id, event);
                    }));
                }
            }
            webNavigationActions.push(new Separator());
        }
        if (webNavigationActions.length) {
            webNavigationActions.pop();
        }
        return webNavigationActions;
    }
    getMenuBarOptions() {
        return {
            enableMnemonics: this.currentEnableMenuBarMnemonics,
            disableAltFocus: this.currentDisableMenuBarAltFocus,
            visibility: this.currentMenubarVisibility,
            actionRunner: this.actionRunner,
            getKeybinding: (action) => this.keybindingService.lookupKeybinding(action.id),
            alwaysOnMnemonics: this.alwaysOnMnemonics,
            compactMode: this.currentCompactMenuMode,
            getCompactMenuActions: () => {
                if (!isWeb) {
                    return []; // only for web
                }
                return this.getWebNavigationActions();
            }
        };
    }
    onDidChangeWindowFocus(hasFocus) {
        if (!this.visible) {
            return;
        }
        super.onDidChangeWindowFocus(hasFocus);
        if (this.container) {
            if (hasFocus) {
                this.container.classList.remove('inactive');
            }
            else {
                this.container.classList.add('inactive');
                this.menubar?.blur();
            }
        }
    }
    onUpdateStateChange() {
        if (!this.visible) {
            return;
        }
        super.onUpdateStateChange();
    }
    onDidChangeRecentlyOpened() {
        if (!this.visible) {
            return;
        }
        super.onDidChangeRecentlyOpened();
    }
    onUpdateKeybindings() {
        if (!this.visible) {
            return;
        }
        super.onUpdateKeybindings();
    }
    registerListeners() {
        super.registerListeners();
        this._register(addDisposableListener(mainWindow, EventType.RESIZE, () => {
            if (this.menubar && !(isIOS && BrowserFeatures.pointerEvents)) {
                this.menubar.blur();
            }
        }));
        // Mnemonics require fullscreen in web
        if (isWeb) {
            this._register(onDidChangeFullscreen(windowId => {
                if (windowId === mainWindow.vscodeWindowId) {
                    this.updateMenubar();
                }
            }));
            this._register(this.webNavigationMenu.onDidChange(() => this.updateMenubar()));
            this._register(enableFocusMenuBarAction().event(() => this.menubar?.toggleFocus()));
        }
    }
    get onVisibilityChange() {
        return this._onVisibilityChange.event;
    }
    get onFocusStateChange() {
        return this._onFocusStateChange.event;
    }
    getMenubarItemsDimensions() {
        if (this.menubar) {
            return new Dimension(this.menubar.getWidth(), this.menubar.getHeight());
        }
        return new Dimension(0, 0);
    }
    create(parent) {
        this.container = parent;
        // Build the menubar
        if (this.container) {
            this.doUpdateMenubar(true);
        }
        return this.container;
    }
    layout(dimension) {
        this.menubar?.update(this.getMenuBarOptions());
    }
    toggleFocus() {
        this.menubar?.toggleFocus();
    }
};
CustomMenubarControl = __decorate([
    __param(0, IMenuService),
    __param(1, IWorkspacesService),
    __param(2, IContextKeyService),
    __param(3, IKeybindingService),
    __param(4, IConfigurationService),
    __param(5, ILabelService),
    __param(6, IUpdateService),
    __param(7, IStorageService),
    __param(8, INotificationService),
    __param(9, IPreferencesService),
    __param(10, IWorkbenchEnvironmentService),
    __param(11, IAccessibilityService),
    __param(12, ITelemetryService),
    __param(13, IHostService),
    __param(14, ICommandService)
], CustomMenubarControl);
export { CustomMenubarControl };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVudWJhckNvbnRyb2wuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2Jyb3dzZXIvcGFydHMvdGl0bGViYXIvbWVudWJhckNvbnRyb2wudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyw0QkFBNEIsQ0FBQztBQUNwQyxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQ3pELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxFQUFTLGlCQUFpQixFQUFFLGVBQWUsRUFBRSxPQUFPLEVBQUUsY0FBYyxFQUFFLFlBQVksRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ3hLLE9BQU8sRUFBc0Msb0JBQW9CLEVBQUUsaUJBQWlCLEVBQW1CLE1BQU0sOENBQThDLENBQUM7QUFDNUosT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDMUYsT0FBTyxFQUFXLE1BQU0sRUFBRSxhQUFhLEVBQUUsU0FBUyxFQUFpQixZQUFZLEVBQXVFLFFBQVEsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzNNLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDOUYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDMUYsT0FBTyxFQUFFLFdBQVcsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzFGLE9BQU8sRUFBRSxxQkFBcUIsRUFBNkIsTUFBTSw0REFBNEQsQ0FBQztBQUM5SCxPQUFPLEVBQVMsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFFLFVBQVUsRUFB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