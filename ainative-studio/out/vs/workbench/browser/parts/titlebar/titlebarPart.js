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
var AuxiliaryBrowserTitlebarPart_1;
import './media/titlebarpart.css';
import { localize, localize2 } from '../../../../nls.js';
import { MultiWindowParts, Part } from '../../part.js';
import { getWCOTitlebarAreaRect, getZoomFactor, isWCOEnabled } from '../../../../base/browser/browser.js';
import { getTitleBarStyle, getMenuBarVisibility, hasCustomTitlebar, hasNativeTitlebar, DEFAULT_CUSTOM_TITLEBAR_HEIGHT, getWindowControlsStyle } from '../../../../platform/window/common/window.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { StandardMouseEvent } from '../../../../base/browser/mouseEvent.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { IBrowserWorkbenchEnvironmentService } from '../../../services/environment/browser/environmentService.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { TITLE_BAR_ACTIVE_BACKGROUND, TITLE_BAR_ACTIVE_FOREGROUND, TITLE_BAR_INACTIVE_FOREGROUND, TITLE_BAR_INACTIVE_BACKGROUND, TITLE_BAR_BORDER, WORKBENCH_BACKGROUND } from '../../../common/theme.js';
import { isMacintosh, isWindows, isLinux, isWeb, isNative, platformLocale } from '../../../../base/common/platform.js';
import { Color } from '../../../../base/common/color.js';
import { EventType, EventHelper, Dimension, append, $, addDisposableListener, prepend, reset, getWindow, getWindowId, isAncestor, getActiveDocument, isHTMLElement } from '../../../../base/browser/dom.js';
import { CustomMenubarControl } from './menubarControl.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IWorkbenchLayoutService } from '../../../services/layout/browser/layoutService.js';
import { createActionViewItem, fillInActionBarActions as fillInActionBarActions } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { Action2, IMenuService, MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { WindowTitle } from './windowTitle.js';
import { CommandCenterControl } from './commandCenterControl.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { WorkbenchToolBar } from '../../../../platform/actions/browser/toolbar.js';
import { ACCOUNTS_ACTIVITY_ID, GLOBAL_ACTIVITY_ID } from '../../../common/activity.js';
import { AccountsActivityActionViewItem, isAccountsActionVisible, SimpleAccountActivityActionViewItem, SimpleGlobalActivityActionViewItem } from '../globalCompositeBar.js';
import { IEditorGroupsService } from '../../../services/editor/common/editorGroupsService.js';
import { ActionRunner } from '../../../../base/common/actions.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { prepareActions } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { EDITOR_CORE_NAVIGATION_COMMANDS } from '../editor/editorCommands.js';
import { EditorPane } from '../editor/editorPane.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { EditorCommandsContextActionRunner } from '../editor/editorTabsControl.js';
import { mainWindow } from '../../../../base/browser/window.js';
import { ACCOUNTS_ACTIVITY_TILE_ACTION, GLOBAL_ACTIVITY_TITLE_ACTION } from './titlebarActions.js';
import { createInstantHoverDelegate } from '../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { safeIntl } from '../../../../base/common/date.js';
import { TitleBarVisibleContext } from '../../../common/contextkeys.js';
let BrowserTitleService = class BrowserTitleService extends MultiWindowParts {
    constructor(instantiationService, storageService, themeService) {
        super('workbench.titleService', themeService, storageService);
        this.instantiationService = instantiationService;
        this.properties = undefined;
        this.variables = new Map();
        this.mainPart = this._register(this.createMainTitlebarPart());
        this.onMenubarVisibilityChange = this.mainPart.onMenubarVisibilityChange;
        this._register(this.registerPart(this.mainPart));
        this.registerActions();
        this.registerAPICommands();
    }
    createMainTitlebarPart() {
        return this.instantiationService.createInstance(MainBrowserTitlebarPart);
    }
    registerActions() {
        // Focus action
        const that = this;
        this._register(registerAction2(class FocusTitleBar extends Action2 {
            constructor() {
                super({
                    id: `workbench.action.focusTitleBar`,
                    title: localize2('focusTitleBar', 'Focus Title Bar'),
                    category: Categories.View,
                    f1: true,
                    precondition: TitleBarVisibleContext
                });
            }
            run() {
                that.getPartByDocument(getActiveDocument())?.focus();
            }
        }));
    }
    registerAPICommands() {
        this._register(CommandsRegistry.registerCommand({
            id: 'registerWindowTitleVariable',
            handler: (accessor, name, contextKey) => {
                this.registerVariables([{ name, contextKey }]);
            },
            metadata: {
                description: 'Registers a new title variable',
                args: [
                    { name: 'name', schema: { type: 'string' }, description: 'The name of the variable to register' },
                    { name: 'contextKey', schema: { type: 'string' }, description: 'The context key to use for the value of the variable' }
                ]
            }
        }));
    }
    //#region Auxiliary Titlebar Parts
    createAuxiliaryTitlebarPart(container, editorGroupsContainer) {
        const titlebarPartContainer = $('.part.titlebar', { role: 'none' });
        titlebarPartContainer.style.position = 'relative';
        container.insertBefore(titlebarPartContainer, container.firstChild); // ensure we are first element
        const disposables = new DisposableStore();
        const titlebarPart = this.doCreateAuxiliaryTitlebarPart(titlebarPartContainer, editorGroupsContainer);
        disposables.add(this.registerPart(titlebarPart));
        disposables.add(Event.runAndSubscribe(titlebarPart.onDidChange, () => titlebarPartContainer.style.height = `${titlebarPart.height}px`));
        titlebarPart.create(titlebarPartContainer);
        if (this.properties) {
            titlebarPart.updateProperties(this.properties);
        }
        if (this.variables.size) {
            titlebarPart.registerVariables(Array.from(this.variables.values()));
        }
        Event.once(titlebarPart.onWillDispose)(() => disposables.dispose());
        return titlebarPart;
    }
    doCreateAuxiliaryTitlebarPart(container, editorGroupsContainer) {
        return this.instantiationService.createInstance(AuxiliaryBrowserTitlebarPart, container, editorGroupsContainer, this.mainPart);
    }
    updateProperties(properties) {
        this.properties = properties;
        for (const part of this.parts) {
            part.updateProperties(properties);
        }
    }
    registerVariables(variables) {
        const newVariables = [];
        for (const variable of variables) {
            if (!this.variables.has(variable.name)) {
                this.variables.set(variable.name, variable);
                newVariables.push(variable);
            }
        }
        for (const part of this.parts) {
            part.registerVariables(newVariables);
        }
    }
};
BrowserTitleService = __decorate([
    __param(0, IInstantiationService),
    __param(1, IStorageService),
    __param(2, IThemeService)
], BrowserTitleService);
export { BrowserTitleService };
let BrowserTitlebarPart = class BrowserTitlebarPart extends Part {
    get minimumHeight() {
        const wcoEnabled = isWeb && isWCOEnabled();
        let value = this.isCommandCenterVisible || wcoEnabled ? DEFAULT_CUSTOM_TITLEBAR_HEIGHT : 30;
        if (wcoEnabled) {
            value = Math.max(value, getWCOTitlebarAreaRect(getWindow(this.element))?.height ?? 0);
        }
        return value / (this.preventZoom ? getZoomFactor(getWindow(this.element)) : 1);
    }
    get maximumHeight() { return this.minimumHeight; }
    constructor(id, targetWindow, editorGroupsContainer, contextMenuService, configurationService, environmentService, instantiationService, themeService, storageService, layoutService, contextKeyService, hostService, editorGroupService, editorService, menuService, keybindingService) {
        super(id, { hasTitle: false }, themeService, storageService, layoutService);
        this.contextMenuService = contextMenuService;
        this.configurationService = configurationService;
        this.environmentService = environmentService;
        this.instantiationService = instantiationService;
        this.storageService = storageService;
        this.contextKeyService = contextKeyService;
        this.hostService = hostService;
        this.editorGroupService = editorGroupService;
        this.menuService = menuService;
        this.keybindingService = keybindingService;
        //#region IView
        this.minimumWidth = 0;
        this.maximumWidth = Number.POSITIVE_INFINITY;
        //#endregion
        //#region Events
        this._onMenubarVisibilityChange = this._register(new Emitter());
        this.onMenubarVisibilityChange = this._onMenubarVisibilityChange.event;
        this._onWillDispose = this._register(new Emitter());
        this.onWillDispose = this._onWillDispose.event;
        this.actionToolBarDisposable = this._register(new DisposableStore());
        this.editorActionsChangeDisposable = this._register(new DisposableStore());
        this.hasGlobalToolbarEntries = false;
        this.globalToolbarMenuDisposables = this._register(new DisposableStore());
        this.editorToolbarMenuDisposables = this._register(new DisposableStore());
        this.layoutToolbarMenuDisposables = this._register(new DisposableStore());
        this.activityToolbarDisposables = this._register(new DisposableStore());
        this.titleDisposables = this._register(new DisposableStore());
        this.isInactive = false;
        this.titleBarStyle = getTitleBarStyle(this.configurationService);
        this.globalToolbarMenu = this._register(this.menuService.createMenu(MenuId.TitleBar, this.contextKeyService));
        this.isAuxiliary = editorGroupsContainer !== 'main';
        this.editorService = editorService.createScoped(editorGroupsContainer, this._store);
        this.editorGroupsContainer = editorGroupsContainer === 'main' ? editorGroupService.mainPart : editorGroupsContainer;
        this.windowTitle = this._register(instantiationService.createInstance(WindowTitle, targetWindow, editorGroupsContainer));
        this.hoverDelegate = this._register(createInstantHoverDelegate());
        this.registerListeners(getWindowId(targetWindow));
    }
    registerListeners(targetWindowId) {
        this._register(this.hostService.onDidChangeFocus(focused => focused ? this.onFocus() : this.onBlur()));
        this._register(this.hostService.onDidChangeActiveWindow(windowId => windowId === targetWindowId ? this.onFocus() : this.onBlur()));
        this._register(this.configurationService.onDidChangeConfiguration(e => this.onConfigurationChanged(e)));
        this._register(this.editorGroupService.onDidChangeEditorPartOptions(e => this.onEditorPartConfigurationChange(e)));
    }
    onBlur() {
        this.isInactive = true;
        this.updateStyles();
    }
    onFocus() {
        this.isInactive = false;
        this.updateStyles();
    }
    onEditorPartConfigurationChange({ oldPartOptions, newPartOptions }) {
        if (oldPartOptions.editorActionsLocation !== newPartOptions.editorActionsLocation ||
            oldPartOptions.showTabs !== newPartOptions.showTabs) {
            if (hasCustomTitlebar(this.configurationService, this.titleBarStyle) && this.actionToolBar) {
                this.createActionToolBar();
                this.createActionToolBarMenus({ editorActions: true });
                this._onDidChange.fire(undefined);
            }
        }
    }
    onConfigurationChanged(event) {
        // Custom menu bar (disabled if auxiliary)
        if (!this.isAuxiliary && !hasNativeTitlebar(this.configurationService, this.titleBarStyle) && (!isMacintosh || isWeb)) {
            if (event.affectsConfiguration('window.menuBarVisibility')) {
                if (this.currentMenubarVisibility === 'compact') {
                    this.uninstallMenubar();
                }
                else {
                    this.installMenubar();
                }
            }
        }
        // Actions
        if (hasCustomTitlebar(this.configurationService, this.titleBarStyle) && this.actionToolBar) {
            const affectsLayoutControl = event.affectsConfiguration("workbench.layoutControl.enabled" /* LayoutSettings.LAYOUT_ACTIONS */);
            const affectsActivityControl = event.affectsConfiguration("workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */);
            if (affectsLayoutControl || affectsActivityControl) {
                this.createActionToolBarMenus({ layoutActions: affectsLayoutControl, activityActions: affectsActivityControl });
                this._onDidChange.fire(undefined);
            }
        }
        // Command Center
        if (event.affectsConfiguration("window.commandCenter" /* LayoutSettings.COMMAND_CENTER */)) {
            this.createTitle();
            this._onDidChange.fire(undefined);
        }
    }
    installMenubar() {
        if (this.menubar) {
            return; // If the menubar is already installed, skip
        }
        this.customMenubar = this._register(this.instantiationService.createInstance(CustomMenubarControl));
        this.menubar = append(this.leftContent, $('div.menubar'));
        this.menubar.setAttribute('role', 'menubar');
        this._register(this.customMenubar.onVisibilityChange(e => this.onMenubarVisibilityChanged(e)));
        this.customMenubar.create(this.menubar);
    }
    uninstallMenubar() {
        this.customMenubar?.dispose();
        this.customMenubar = undefined;
        this.menubar?.remove();
        this.menubar = undefined;
        this.onMenubarVisibilityChanged(false);
    }
    onMenubarVisibilityChanged(visible) {
        if (isWeb || isWindows || isLinux) {
            if (this.lastLayoutDimensions) {
                this.layout(this.lastLayoutDimensions.width, this.lastLayoutDimensions.height);
            }
            this._onMenubarVisibilityChange.fire(visible);
        }
    }
    updateProperties(properties) {
        this.windowTitle.updateProperties(properties);
    }
    registerVariables(variables) {
        this.windowTitle.registerVariables(variables);
    }
    createContentArea(parent) {
        this.element = parent;
        this.rootContainer = append(parent, $('.titlebar-container'));
        this.leftContent = append(this.rootContainer, $('.titlebar-left'));
        this.centerContent = append(this.rootContainer, $('.titlebar-center'));
        this.rightContent = append(this.rootContainer, $('.titlebar-right'));
        // App Icon (Windows, Linux)
        if ((isWindows || isLinux) && !hasNativeTitlebar(this.configurationService, this.titleBarStyle)) {
            this.appIcon = prepend(this.leftContent, $('a.window-appicon'));
        }
        // Draggable region that we can manipulate for #52522
        this.dragRegion = prepend(this.rootContainer, $('div.titlebar-drag-region'));
        // Menubar: install a custom menu bar depending on configuration
        if (!this.isAuxiliary &&
            !hasNativeTitlebar(this.configurationService, this.titleBarStyle) &&
            (!isMacintosh || isWeb) &&
            this.currentMenubarVisibility !== 'compact') {
            this.installMenubar();
        }
        // Title
        this.title = append(this.centerContent, $('div.window-title'));
        this.createTitle();
        // Create Toolbar Actions
        if (hasCustomTitlebar(this.configurationService, this.titleBarStyle)) {
            this.actionToolBarElement = append(this.rightContent, $('div.action-toolbar-container'));
            this.createActionToolBar();
            this.createActionToolBarMenus();
        }
        // Window Controls Container
        if (!hasNativeTitlebar(this.configurationService, this.titleBarStyle)) {
            let primaryWindowControlsLocation = isMacintosh ? 'left' : 'right';
            if (isMacintosh && isNative) {
                // Check if the locale is RTL, macOS will move traffic lights in RTL locales
                // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/Locale/textInfo
                const localeInfo = safeIntl.Locale(platformLocale);
                if (localeInfo?.textInfo?.direction === 'rtl') {
                    primaryWindowControlsLocation = 'right';
                }
            }
            if (isMacintosh && isNative && primaryWindowControlsLocation === 'left') {
                // macOS native: controls are on the left and the container is not needed to make room
                // for something, except for web where a custom menu being supported). not putting the
                // container helps with allowing to move the window when clicking very close to the
                // window control buttons.
            }
            else if (getWindowControlsStyle(this.configurationService) === "hidden" /* WindowControlsStyle.HIDDEN */) {
                // Linux/Windows: controls are explicitly disabled
            }
            else {
                this.windowControlsContainer = append(primaryWindowControlsLocation === 'left' ? this.leftContent : this.rightContent, $('div.window-controls-container'));
                if (isWeb) {
                    // Web: its possible to have control overlays on both sides, for example on macOS
                    // with window controls on the left and PWA controls on the right.
                    append(primaryWindowControlsLocation === 'left' ? this.rightContent : this.leftContent, $('div.window-controls-container'));
                }
                if (isWCOEnabled()) {
                    this.windowControlsContainer.classList.add('wco-enabled');
                }
            }
        }
        // Context menu over title bar: depending on the OS and the location of the click this will either be
        // the overall context menu for the entire title bar or a specific title context menu.
        // Windows / Linux: we only support the overall context menu on the title bar
        // macOS: we support both the overall context menu and the title context menu.
        //        in addition, we allow Cmd+click to bring up the title context menu.
        {
            this._register(addDisposableListener(this.rootContainer, EventType.CONTEXT_MENU, e => {
                EventHelper.stop(e);
                let targetMenu;
                if (isMacintosh && isHTMLElement(e.target) && isAncestor(e.target, this.title)) {
                    targetMenu = MenuId.TitleBarTitleContext;
                }
                else {
                    targetMenu = MenuId.TitleBarContext;
                }
                this.onContextMenu(e, targetMenu);
            }));
            if (isMacintosh) {
                this._register(addDisposableListener(this.title, EventType.MOUSE_DOWN, e => {
                    if (e.metaKey) {
                        EventHelper.stop(e, true /* stop bubbling to prevent command center from opening */);
                        this.onContextMenu(e, MenuId.TitleBarTitleContext);
                    }
                }, true /* capture phase to prevent command center from opening */));
            }
        }
        this.updateStyles();
        return this.element;
    }
    createTitle() {
        this.titleDisposables.clear();
        // Text Title
        if (!this.isCommandCenterVisible) {
            this.title.innerText = this.windowTitle.value;
            this.titleDisposables.add(this.windowTitle.onDidChange(() => {
                this.title.innerText = this.windowTitle.value;
                // layout menubar and other renderings in the titlebar
                if (this.lastLayoutDimensions) {
                    this.updateLayout(this.lastLayoutDimensions);
                }
            }));
        }
        // Menu Title
        else {
            const commandCenter = this.instantiationService.createInstance(CommandCenterControl, this.windowTitle, this.hoverDelegate);
            reset(this.title, commandCenter.element);
            this.titleDisposables.add(commandCenter);
        }
    }
    actionViewItemProvider(action, options) {
        // --- Activity Actions
        if (!this.isAuxiliary) {
            if (action.id === GLOBAL_ACTIVITY_ID) {
                return this.instantiationService.createInstance(SimpleGlobalActivityActionViewItem, { position: () => 2 /* HoverPosition.BELOW */ }, options);
            }
            if (action.id === ACCOUNTS_ACTIVITY_ID) {
                return this.instantiationService.createInstance(SimpleAccountActivityActionViewItem, { position: () => 2 /* HoverPosition.BELOW */ }, options);
            }
        }
        // --- Editor Actions
        const activeEditorPane = this.editorGroupsContainer.activeGroup?.activeEditorPane;
        if (activeEditorPane && activeEditorPane instanceof EditorPane) {
            const result = activeEditorPane.getActionViewItem(action, options);
            if (result) {
                return result;
            }
        }
        // Check extensions
        return createActionViewItem(this.instantiationService, action, { ...options, menuAsChild: false });
    }
    getKeybinding(action) {
        const editorPaneAwareContextKeyService = this.editorGroupsContainer.activeGroup?.activeEditorPane?.scopedContextKeyService ?? this.contextKeyService;
        return this.keybindingService.lookupKeybinding(action.id, editorPaneAwareContextKeyService);
    }
    createActionToolBar() {
        // Creates the action tool bar. Depends on the configuration of the title bar menus
        // Requires to be recreated whenever editor actions enablement changes
        this.actionToolBarDisposable.clear();
        this.actionToolBar = this.actionToolBarDisposable.add(this.instantiationService.createInstance(WorkbenchToolBar, this.actionToolBarElement, {
            contextMenu: MenuId.TitleBarContext,
            orientation: 0 /* ActionsOrientation.HORIZONTAL */,
            ariaLabel: localize('ariaLabelTitleActions', "Title actions"),
            getKeyBinding: action => this.getKeybinding(action),
            overflowBehavior: { maxItems: 9, exempted: [ACCOUNTS_ACTIVITY_ID, GLOBAL_ACTIVITY_ID, ...EDITOR_CORE_NAVIGATION_COMMANDS] },
            anchorAlignmentProvider: () => 1 /* AnchorAlignment.RIGHT */,
            telemetrySource: 'titlePart',
            highlightToggledItems: this.editorActionsEnabled, // Only show toggled state for editor actions (Layout actions are not shown as toggled)
            actionViewItemProvider: (action, options) => this.actionViewItemProvider(action, options),
            hoverDelegate: this.hoverDelegate
        }));
        if (this.editorActionsEnabled) {
            this.actionToolBarDisposable.add(this.editorGroupsContainer.onDidChangeActiveGroup(() => this.createActionToolBarMenus({ editorActions: true })));
        }
    }
    createActionToolBarMenus(update = true) {
        if (update === true) {
            update = { editorActions: true, layoutActions: true, activityActions: true };
        }
        const updateToolBarActions = () => {
            const actions = { primary: [], secondary: [] };
            // --- Editor Actions
            if (this.editorActionsEnabled) {
                this.editorActionsChangeDisposable.clear();
                const activeGroup = this.editorGroupsContainer.activeGroup;
                if (activeGroup) {
                    const editorActions = activeGroup.createEditorActions(this.editorActionsChangeDisposable);
                    actions.primary.push(...editorActions.actions.primary);
                    actions.secondary.push(...editorActions.actions.secondary);
                    this.editorActionsChangeDisposable.add(editorActions.onDidChange(() => updateToolBarActions()));
                }
            }
            // --- Global Actions
            const globalToolbarActions = this.globalToolbarMenu.getActions();
            this.hasGlobalToolbarEntries = globalToolbarActions.length > 0;
            fillInActionBarActions(globalToolbarActions, actions);
            // --- Layout Actions
            if (this.layoutToolbarMenu) {
                fillInActionBarActions(this.layoutToolbarMenu.getActions(), actions, () => !this.editorActionsEnabled // Layout Actions in overflow menu when editor actions enabled in title bar
                );
            }
            // --- Activity Actions (always at the end)
            if (this.activityActionsEnabled) {
                if (isAccountsActionVisible(this.storageService)) {
                    actions.primary.push(ACCOUNTS_ACTIVITY_TILE_ACTION);
                }
                actions.primary.push(GLOBAL_ACTIVITY_TITLE_ACTION);
            }
            this.actionToolBar.setActions(prepareActions(actions.primary), prepareActions(actions.secondary));
        };
        // Create/Update the menus which should be in the title tool bar
        if (update.editorActions) {
            this.editorToolbarMenuDisposables.clear();
            // The editor toolbar menu is handled by the editor group so we do not need to manage it here.
            // However, depending on the active editor, we need to update the context and action runner of the toolbar menu.
            if (this.editorActionsEnabled && this.editorService.activeEditor !== undefined) {
                const context = { groupId: this.editorGroupsContainer.activeGroup.id };
                this.actionToolBar.actionRunner = this.editorToolbarMenuDisposables.add(new EditorCommandsContextActionRunner(context));
                this.actionToolBar.context = context;
            }
            else {
                this.actionToolBar.actionRunner = this.editorToolbarMenuDisposables.add(new ActionRunner());
                this.actionToolBar.context = undefined;
            }
        }
        if (update.layoutActions) {
            this.layoutToolbarMenuDisposables.clear();
            if (this.layoutControlEnabled) {
                this.layoutToolbarMenu = this.menuService.createMenu(MenuId.LayoutControlMenu, this.contextKeyService);
                this.layoutToolbarMenuDisposables.add(this.layoutToolbarMenu);
                this.layoutToolbarMenuDisposables.add(this.layoutToolbarMenu.onDidChange(() => updateToolBarActions()));
            }
            else {
                this.layoutToolbarMenu = undefined;
            }
        }
        this.globalToolbarMenuDisposables.clear();
        this.globalToolbarMenuDisposables.add(this.globalToolbarMenu.onDidChange(() => updateToolBarActions()));
        if (update.activityActions) {
            this.activityToolbarDisposables.clear();
            if (this.activityActionsEnabled) {
                this.activityToolbarDisposables.add(this.storageService.onDidChangeValue(0 /* StorageScope.PROFILE */, AccountsActivityActionViewItem.ACCOUNTS_VISIBILITY_PREFERENCE_KEY, this._store)(() => updateToolBarActions()));
            }
        }
        updateToolBarActions();
    }
    updateStyles() {
        super.updateStyles();
        // Part container
        if (this.element) {
            if (this.isInactive) {
                this.element.classList.add('inactive');
            }
            else {
                this.element.classList.remove('inactive');
            }
            const titleBackground = this.getColor(this.isInactive ? TITLE_BAR_INACTIVE_BACKGROUND : TITLE_BAR_ACTIVE_BACKGROUND, (color, theme) => {
                // LCD Rendering Support: the title bar part is a defining its own GPU layer.
                // To benefit from LCD font rendering, we must ensure that we always set an
                // opaque background color. As such, we compute an opaque color given we know
                // the background color is the workbench background.
                return color.isOpaque() ? color : color.makeOpaque(WORKBENCH_BACKGROUND(theme));
            }) || '';
            this.element.style.backgroundColor = titleBackground;
            if (this.appIconBadge) {
                this.appIconBadge.style.backgroundColor = titleBackground;
            }
            if (titleBackground && Color.fromHex(titleBackground).isLighter()) {
                this.element.classList.add('light');
            }
            else {
                this.element.classList.remove('light');
            }
            const titleForeground = this.getColor(this.isInactive ? TITLE_BAR_INACTIVE_FOREGROUND : TITLE_BAR_ACTIVE_FOREGROUND);
            this.element.style.color = titleForeground || '';
            const titleBorder = this.getColor(TITLE_BAR_BORDER);
            this.element.style.borderBottom = titleBorder ? `1px solid ${titleBorder}` : '';
        }
    }
    onContextMenu(e, menuId) {
        const event = new StandardMouseEvent(getWindow(this.element), e);
        // Show it
        this.contextMenuService.showContextMenu({
            getAnchor: () => event,
            menuId,
            contextKeyService: this.contextKeyService,
            domForShadowRoot: isMacintosh && isNative ? event.target : undefined
        });
    }
    get currentMenubarVisibility() {
        if (this.isAuxiliary) {
            return 'hidden';
        }
        return getMenuBarVisibility(this.configurationService);
    }
    get layoutControlEnabled() {
        return !this.isAuxiliary && this.configurationService.getValue("workbench.layoutControl.enabled" /* LayoutSettings.LAYOUT_ACTIONS */) !== false;
    }
    get isCommandCenterVisible() {
        return this.configurationService.getValue("window.commandCenter" /* LayoutSettings.COMMAND_CENTER */) !== false;
    }
    get editorActionsEnabled() {
        return this.editorGroupService.partOptions.editorActionsLocation === "titleBar" /* EditorActionsLocation.TITLEBAR */ ||
            (this.editorGroupService.partOptions.editorActionsLocation === "default" /* EditorActionsLocation.DEFAULT */ &&
                this.editorGroupService.partOptions.showTabs === "none" /* EditorTabsMode.NONE */);
    }
    get activityActionsEnabled() {
        const activityBarPosition = this.configurationService.getValue("workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */);
        return !this.isAuxiliary && (activityBarPosition === "top" /* ActivityBarPosition.TOP */ || activityBarPosition === "bottom" /* ActivityBarPosition.BOTTOM */);
    }
    get hasZoomableElements() {
        const hasMenubar = !(this.currentMenubarVisibility === 'hidden' || this.currentMenubarVisibility === 'compact' || (!isWeb && isMacintosh));
        const hasCommandCenter = this.isCommandCenterVisible;
        const hasToolBarActions = this.hasGlobalToolbarEntries || this.layoutControlEnabled || this.editorActionsEnabled || this.activityActionsEnabled;
        return hasMenubar || hasCommandCenter || hasToolBarActions;
    }
    get preventZoom() {
        // Prevent zooming behavior if any of the following conditions are met:
        // 1. Shrinking below the window control size (zoom < 1)
        // 2. No custom items are present in the title bar
        return getZoomFactor(getWindow(this.element)) < 1 || !this.hasZoomableElements;
    }
    layout(width, height) {
        this.updateLayout(new Dimension(width, height));
        super.layoutContents(width, height);
    }
    updateLayout(dimension) {
        this.lastLayoutDimensions = dimension;
        if (hasCustomTitlebar(this.configurationService, this.titleBarStyle)) {
            const zoomFactor = getZoomFactor(getWindow(this.element));
            this.element.style.setProperty('--zoom-factor', zoomFactor.toString());
            this.rootContainer.classList.toggle('counter-zoom', this.preventZoom);
            if (this.customMenubar) {
                const menubarDimension = new Dimension(0, dimension.height);
                this.customMenubar.layout(menubarDimension);
            }
        }
    }
    focus() {
        if (this.customMenubar) {
            this.customMenubar.toggleFocus();
        }
        else {
            this.element.querySelector('[tabindex]:not([tabindex="-1"])')?.focus();
        }
    }
    toJSON() {
        return {
            type: "workbench.parts.titlebar" /* Parts.TITLEBAR_PART */
        };
    }
    dispose() {
        this._onWillDispose.fire();
        super.dispose();
    }
};
BrowserTitlebarPart = __decorate([
    __param(3, IContextMenuService),
    __param(4, IConfigurationService),
    __param(5, IBrowserWorkbenchEnvironmentService),
    __param(6, IInstantiationService),
    __param(7, IThemeService),
    __param(8, IStorageService),
    __param(9, IWorkbenchLayoutService),
    __param(10, IContextKeyService),
    __param(11, IHostService),
    __param(12, IEditorGroupsService),
    __param(13, IEditorService),
    __param(14, IMenuService),
    __param(15, IKeybindingService)
], BrowserTitlebarPart);
export { BrowserTitlebarPart };
let MainBrowserTitlebarPart = class MainBrowserTitlebarPart extends BrowserTitlebarPart {
    constructor(contextMenuService, configurationService, environmentService, instantiationService, themeService, storageService, layoutService, contextKeyService, hostService, editorGroupService, editorService, menuService, keybindingService) {
        super("workbench.parts.titlebar" /* Parts.TITLEBAR_PART */, mainWindow, 'main', contextMenuService, configurationService, environmentService, instantiationService, themeService, storageService, layoutService, contextKeyService, hostService, editorGroupService, editorService, menuService, keybindingService);
    }
};
MainBrowserTitlebarPart = __decorate([
    __param(0, IContextMenuService),
    __param(1, IConfigurationService),
    __param(2, IBrowserWorkbenchEnvironmentService),
    __param(3, IInstantiationService),
    __param(4, IThemeService),
    __param(5, IStorageService),
    __param(6, IWorkbenchLayoutService),
    __param(7, IContextKeyService),
    __param(8, IHostService),
    __param(9, IEditorGroupsService),
    __param(10, IEditorService),
    __param(11, IMenuService),
    __param(12, IKeybindingService)
], MainBrowserTitlebarPart);
export { MainBrowserTitlebarPart };
let AuxiliaryBrowserTitlebarPart = class AuxiliaryBrowserTitlebarPart extends BrowserTitlebarPart {
    static { AuxiliaryBrowserTitlebarPart_1 = this; }
    static { this.COUNTER = 1; }
    get height() { return this.minimumHeight; }
    constructor(container, editorGroupsContainer, mainTitlebar, contextMenuService, configurationService, environmentService, instantiationService, themeService, storageService, layoutService, contextKeyService, hostService, editorGroupService, editorService, menuService, keybindingService) {
        const id = AuxiliaryBrowserTitlebarPart_1.COUNTER++;
        super(`workbench.parts.auxiliaryTitle.${id}`, getWindow(container), editorGroupsContainer, contextMenuService, configurationService, environmentService, instantiationService, themeService, storageService, layoutService, contextKeyService, hostService, editorGroupService, editorService, menuService, keybindingService);
        this.container = container;
        this.mainTitlebar = mainTitlebar;
    }
    get preventZoom() {
        // Prevent zooming behavior if any of the following conditions are met:
        // 1. Shrinking below the window control size (zoom < 1)
        // 2. No custom items are present in the main title bar
        // The auxiliary title bar never contains any zoomable items itself,
        // but we want to match the behavior of the main title bar.
        return getZoomFactor(getWindow(this.element)) < 1 || !this.mainTitlebar.hasZoomableElements;
    }
};
AuxiliaryBrowserTitlebarPart = AuxiliaryBrowserTitlebarPart_1 = __decorate([
    __param(3, IContextMenuService),
    __param(4, IConfigurationService),
    __param(5, IBrowserWorkbenchEnvironmentService),
    __param(6, IInstantiationService),
    __param(7, IThemeService),
    __param(8, IStorageService),
    __param(9, IWorkbenchLayoutService),
    __param(10, IContextKeyService),
    __param(11, IHostService),
    __param(12, IEditorGroupsService),
    __param(13, IEditorService),
    __param(14, IMenuService),
    __param(15, IKeybindingService)
], AuxiliaryBrowserTitlebarPart);
export { AuxiliaryBrowserTitlebarPart };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGl0bGViYXJQYXJ0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL3BhcnRzL3RpdGxlYmFyL3RpdGxlYmFyUGFydC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTywwQkFBMEIsQ0FBQztBQUNsQyxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQ3pELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxJQUFJLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFFdkQsT0FBTyxFQUFFLHNCQUFzQixFQUFFLGFBQWEsRUFBRSxZQUFZLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUMxRyxPQUFPLEVBQXFCLGdCQUFnQixFQUFFLG9CQUFvQixFQUFFLGlCQUFpQixFQUFFLGlCQUFpQixFQUFFLDhCQUE4QixFQUFFLHNCQUFzQixFQUFzQyxNQUFNLDhDQUE4QyxDQUFDO0FBQzNQLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQzlGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxxQkFBcUIsRUFBNkIsTUFBTSw0REFBNEQsQ0FBQztBQUM5SCxPQUFPLEVBQUUsZUFBZSxFQUFlLE1BQU0sc0NBQXNDLENBQUM7QUFDcEYsT0FBTyxFQUFFLG1DQUFtQyxFQUFFLE1BQU0sNkRBQTZELENBQUM7QUFDbEgsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ2xGLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSwyQkFBMkIsRUFBRSw2QkFBNkIsRUFBRSw2QkFBNkIsRUFBRSxnQkFBZ0IsRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQzFNLE9BQU8sRUFBRSxXQUFXLEVBQUUsU0FBUyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLGNBQWMsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ3ZILE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN6RCxPQUFPLEVBQUUsU0FBUyxFQUFFLFdBQVcsRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxxQkFBcUIsRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxXQUFXLEVBQUUsVUFBVSxFQUFFLGlCQUFpQixFQUFFLGFBQWEsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQzVNLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBQzNELE9BQU8sRUFBRSxxQkFBcUIsRUFBb0IsTUFBTSw0REFBNEQsQ0FBQztBQUNySCxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxlQUFlLEVBQWdCLE1BQU0sZ0RBQWdELENBQUM7QUFDL0YsT0FBTyxFQUFTLHVCQUF1QixFQUE4RSxNQUFNLG1EQUFtRCxDQUFDO0FBQy9LLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxzQkFBc0IsSUFBSSxzQkFBc0IsRUFBRSxNQUFNLGlFQUFpRSxDQUFDO0FBQ3pKLE9BQU8sRUFBRSxPQUFPLEVBQVMsWUFBWSxFQUFFLE1BQU0sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUN2SCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUMxRixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDdEUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBQy9DLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQ2pFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw4REFBOEQsQ0FBQztBQUMxRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUNuRixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUN2RixPQUFPLEVBQUUsOEJBQThCLEVBQUUsdUJBQXVCLEVBQUUsbUNBQW1DLEVBQUUsa0NBQWtDLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUU1SyxPQUFPLEVBQTBCLG9CQUFvQixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDdEgsT0FBTyxFQUFFLFlBQVksRUFBVyxNQUFNLG9DQUFvQyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUNsRixPQUFPLEVBQXVDLGNBQWMsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQ3pILE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBRTlFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUNyRCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUUxRixPQUFPLEVBQUUsaUNBQWlDLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUVuRixPQUFPLEVBQWMsVUFBVSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDNUUsT0FBTyxFQUFFLDZCQUE2QixFQUFFLDRCQUE0QixFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFFbkcsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sMkRBQTJELENBQUM7QUFHdkcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDcEYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBK0JqRSxJQUFNLG1CQUFtQixHQUF6QixNQUFNLG1CQUFvQixTQUFRLGdCQUFxQztJQU03RSxZQUN3QixvQkFBOEQsRUFDcEUsY0FBK0IsRUFDakMsWUFBMkI7UUFFMUMsS0FBSyxDQUFDLHdCQUF3QixFQUFFLFlBQVksRUFBRSxjQUFjLENBQUMsQ0FBQztRQUpwQix5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO1FBK0Y5RSxlQUFVLEdBQWlDLFNBQVMsQ0FBQztRQVU1QyxjQUFTLEdBQUcsSUFBSSxHQUFHLEVBQTBCLENBQUM7UUFuRzlELElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsc0JBQXNCLEVBQUUsQ0FBQyxDQUFDO1FBQzlELElBQUksQ0FBQyx5QkFBeUIsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLHlCQUF5QixDQUFDO1FBQ3pFLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztRQUVqRCxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7UUFDdkIsSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUM7SUFDNUIsQ0FBQztJQUVTLHNCQUFzQjtRQUMvQixPQUFPLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsdUJBQXVCLENBQUMsQ0FBQztJQUMxRSxDQUFDO0lBRU8sZUFBZTtRQUV0QixlQUFlO1FBQ2YsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDO1FBQ2xCLElBQUksQ0FBQyxTQUFTLENBQUMsZUFBZSxDQUFDLE1BQU0sYUFBYyxTQUFRLE9BQU87WUFFakU7Z0JBQ0MsS0FBSyxDQUFDO29CQUNMLEVBQUUsRUFBRSxnQ0FBZ0M7b0JBQ3BDLEtBQUssRUFBRSxTQUFTLENBQUMsZUFBZSxFQUFFLGlCQUFpQixDQUFDO29CQUNwRCxRQUFRLEVBQUUsVUFBVSxDQUFDLElBQUk7b0JBQ3pCLEVBQUUsRUFBRSxJQUFJO29CQUNSLFlBQVksRUFBRSxzQkFBc0I7aUJBQ3BDLENBQUMsQ0FBQztZQUNKLENBQUM7WUFFRCxHQUFHO2dCQUNGLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUM7WUFDdEQsQ0FBQztTQUNELENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVPLG1CQUFtQjtRQUMxQixJQUFJLENBQUMsU0FBUyxDQUFDLGdCQUFnQixDQUFDLGVBQWUsQ0FBQztZQUMvQyxFQUFFLEVBQUUsNkJBQTZCO1lBQ2pDLE9BQU8sRUFBRSxDQUFDLFFBQTBCLEVBQUUsSUFBWSxFQUFFLFVBQWtCLEVBQUUsRUFBRTtnQkFDekUsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsVUFBVSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ2hELENBQUM7WUFDRCxRQUFRLEVBQUU7Z0JBQ1QsV0FBVyxFQUFFLGdDQUFnQztnQkFDN0MsSUFBSSxFQUFFO29CQUNMLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEVBQUUsV0FBVyxFQUFFLHNDQUFzQyxFQUFFO29CQUNqRyxFQUFFLElBQUksRUFBRSxZQUFZLEVBQUUsTUFBTSxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxFQUFFLFdBQVcsRUFBRSxzREFBc0QsRUFBRTtpQkFDdkg7YUFDRDtTQUNELENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVELGtDQUFrQztJQUVsQywyQkFBMkIsQ0FBQyxTQUFzQixFQUFFLHFCQUE2QztRQUNoRyxNQUFNLHFCQUFxQixHQUFHLENBQUMsQ0FBQyxnQkFBZ0IsRUFBRSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDO1FBQ3BFLHFCQUFxQixDQUFDLEtBQUssQ0FBQyxRQUFRLEdBQUcsVUFBVSxDQUFDO1FBQ2xELFNBQVMsQ0FBQyxZQUFZLENBQUMscUJBQXFCLEVBQUUsU0FBUyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsOEJBQThCO1FBRW5HLE1BQU0sV0FBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7UUFFMUMsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLDZCQUE2QixDQUFDLHFCQUFxQixFQUFFLHFCQUFxQixDQUFDLENBQUM7UUFDdEcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7UUFFakQsV0FBVyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLFlBQVksQ0FBQyxXQUFXLEVBQUUsR0FBRyxFQUFFLENBQUMscUJBQXFCLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxHQUFHLFlBQVksQ0FBQyxNQUFNLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDeEksWUFBWSxDQUFDLE1BQU0sQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO1FBRTNDLElBQUksSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ3JCLFlBQVksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDaEQsQ0FBQztRQUVELElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUN6QixZQUFZLENBQUMsaUJBQWlCLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNyRSxDQUFDO1FBRUQsS0FBSyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsYUFBYSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUM7UUFFcEUsT0FBTyxZQUFZLENBQUM7SUFDckIsQ0FBQztJQUVTLDZCQUE2QixDQUFDLFNBQXNCLEVBQUUscUJBQTZDO1FBQzVHLE9BQU8sSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyw0QkFBNEIsRUFBRSxTQUFTLEVBQUUscUJBQXFCLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ2hJLENBQUM7SUFXRCxnQkFBZ0IsQ0FBQyxVQUE0QjtRQUM1QyxJQUFJLENBQUMsVUFBVSxHQUFHLFVBQVUsQ0FBQztRQUU3QixLQUFLLE1BQU0sSUFBSSxJQUFJLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUMvQixJQUFJLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDbkMsQ0FBQztJQUNGLENBQUM7SUFJRCxpQkFBaUIsQ0FBQyxTQUEyQjtRQUM1QyxNQUFNLFlBQVksR0FBcUIsRUFBRSxDQUFDO1FBRTFDLEtBQUssTUFBTSxRQUFRLElBQUksU0FBUyxFQUFFLENBQUM7WUFDbEMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO2dCQUN4QyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxDQUFDO2dCQUM1QyxZQUFZLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQzdCLENBQUM7UUFDRixDQUFDO1FBRUQsS0FBSyxNQUFNLElBQUksSUFBSSxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDL0IsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQ3RDLENBQUM7SUFDRixDQUFDO0NBR0QsQ0FBQTtBQWxJWSxtQkFBbUI7SUFPN0IsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLGVBQWUsQ0FBQTtJQUNmLFdBQUEsYUFBYSxDQUFBO0dBVEgsbUJBQW1CLENBa0kvQjs7QUFFTSxJQUFNLG1CQUFtQixHQUF6QixNQUFNLG1CQUFvQixTQUFRLElBQUk7SUFPNUMsSUFBSSxhQUFhO1FBQ2hCLE1BQU0sVUFBVSxHQUFHLEtBQUssSUFBSSxZQUFZLEVBQUUsQ0FBQztRQUMzQyxJQUFJLEtBQUssR0FBRyxJQUFJLENBQUMsc0JBQXNCLElBQUksVUFBVSxDQUFDLENBQUMsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO1FBQzVGLElBQUksVUFBVSxFQUFFLENBQUM7WUFDaEIsS0FBSyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLHNCQUFzQixDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBRSxNQUFNLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDdkYsQ0FBQztRQUVELE9BQU8sS0FBSyxHQUFHLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDaEYsQ0FBQztJQUVELElBQUksYUFBYSxLQUFhLE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUM7SUF5RDFELFlBQ0MsRUFBVSxFQUNWLFlBQXdCLEVBQ3hCLHFCQUFzRCxFQUNqQyxrQkFBd0QsRUFDdEQsb0JBQThELEVBQ2hELGtCQUEwRSxFQUN4RixvQkFBOEQsRUFDdEUsWUFBMkIsRUFDekIsY0FBZ0QsRUFDeEMsYUFBc0MsRUFDM0MsaUJBQXNELEVBQzVELFdBQTBDLEVBQ2xDLGtCQUF5RCxFQUMvRCxhQUE2QixFQUMvQixXQUEwQyxFQUNwQyxpQkFBc0Q7UUFFMUUsS0FBSyxDQUFDLEVBQUUsRUFBRSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsRUFBRSxZQUFZLEVBQUUsY0FBYyxFQUFFLGFBQWEsQ0FBQyxDQUFDO1FBZHRDLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBcUI7UUFDbkMseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtRQUM3Qix1QkFBa0IsR0FBbEIsa0JBQWtCLENBQXFDO1FBQ3JFLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFFbkQsbUJBQWMsR0FBZCxjQUFjLENBQWlCO1FBRTVCLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBb0I7UUFDM0MsZ0JBQVcsR0FBWCxXQUFXLENBQWM7UUFDakIsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFzQjtRQUVoRCxnQkFBVyxHQUFYLFdBQVcsQ0FBYztRQUNuQixzQkFBaUIsR0FBakIsaUJBQWlCLENBQW9CO1FBeEYzRSxlQUFlO1FBRU4saUJBQVksR0FBVyxDQUFDLENBQUM7UUFDekIsaUJBQVksR0FBVyxNQUFNLENBQUMsaUJBQWlCLENBQUM7UUFjekQsWUFBWTtRQUVaLGdCQUFnQjtRQUVSLCtCQUEwQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVcsQ0FBQyxDQUFDO1FBQ25FLDhCQUF5QixHQUFHLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxLQUFLLENBQUM7UUFFMUQsbUJBQWMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFRLENBQUMsQ0FBQztRQUM3RCxrQkFBYSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDO1FBcUJsQyw0QkFBdUIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksZUFBZSxFQUFFLENBQUMsQ0FBQztRQUNoRSxrQ0FBNkIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksZUFBZSxFQUFFLENBQUMsQ0FBQztRQUkvRSw0QkFBdUIsR0FBRyxLQUFLLENBQUM7UUFHdkIsaUNBQTRCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLGVBQWUsRUFBRSxDQUFDLENBQUM7UUFDckUsaUNBQTRCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLGVBQWUsRUFBRSxDQUFDLENBQUM7UUFDckUsaUNBQTRCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLGVBQWUsRUFBRSxDQUFDLENBQUM7UUFDckUsK0JBQTBCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLGVBQWUsRUFBRSxDQUFDLENBQUM7UUFJbkUscUJBQWdCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLGVBQWUsRUFBRSxDQUFDLENBQUM7UUFHbEUsZUFBVSxHQUFZLEtBQUssQ0FBQztRQTRCbkMsSUFBSSxDQUFDLGFBQWEsR0FBRyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsQ0FBQztRQUNqRSxJQUFJLENBQUMsaUJBQWlCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUM7UUFFOUcsSUFBSSxDQUFDLFdBQVcsR0FBRyxxQkFBcUIsS0FBSyxNQUFNLENBQUM7UUFDcEQsSUFBSSxDQUFDLGFBQWEsR0FBRyxhQUFhLENBQUMsWUFBWSxDQUFDLHFCQUFxQixFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNwRixJQUFJLENBQUMscUJBQXFCLEdBQUcscUJBQXFCLEtBQUssTUFBTSxDQUFDLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLHFCQUFxQixDQUFDO1FBRXBILElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsV0FBVyxFQUFFLFlBQVksRUFBRSxxQkFBcUIsQ0FBQyxDQUFDLENBQUM7UUFFekgsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLDBCQUEwQixFQUFFLENBQUMsQ0FBQztRQUVsRSxJQUFJLENBQUMsaUJBQWlCLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7SUFDbkQsQ0FBQztJQUVPLGlCQUFpQixDQUFDLGNBQXNCO1FBQy9DLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3ZHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyx1QkFBdUIsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLFFBQVEsS0FBSyxjQUFjLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNuSSxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDeEcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsNEJBQTRCLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsK0JBQStCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BILENBQUM7SUFFTyxNQUFNO1FBQ2IsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUM7UUFFdkIsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO0lBQ3JCLENBQUM7SUFFTyxPQUFPO1FBQ2QsSUFBSSxDQUFDLFVBQVUsR0FBRyxLQUFLLENBQUM7UUFFeEIsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO0lBQ3JCLENBQUM7SUFFTywrQkFBK0IsQ0FBQyxFQUFFLGNBQWMsRUFBRSxjQUFjLEVBQWlDO1FBQ3hHLElBQ0MsY0FBYyxDQUFDLHFCQUFxQixLQUFLLGNBQWMsQ0FBQyxxQkFBcUI7WUFDN0UsY0FBYyxDQUFDLFFBQVEsS0FBSyxjQUFjLENBQUMsUUFBUSxFQUNsRCxDQUFDO1lBQ0YsSUFBSSxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztnQkFDNUYsSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUM7Z0JBQzNCLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO2dCQUN2RCxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUNuQyxDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFUyxzQkFBc0IsQ0FBQyxLQUFnQztRQUVoRSwwQ0FBMEM7UUFDMUMsSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxXQUFXLElBQUksS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUN2SCxJQUFJLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQywwQkFBMEIsQ0FBQyxFQUFFLENBQUM7Z0JBQzVELElBQUksSUFBSSxDQUFDLHdCQUF3QixLQUFLLFNBQVMsRUFBRSxDQUFDO29CQUNqRCxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztnQkFDekIsQ0FBQztxQkFBTSxDQUFDO29CQUNQLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztnQkFDdkIsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO1FBRUQsVUFBVTtRQUNWLElBQUksaUJBQWlCLENBQUMsSUFBSSxDQUFDLG9CQUFvQixFQUFFLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDNUYsTUFBTSxvQkFBb0IsR0FBRyxLQUFLLENBQUMsb0JBQW9CLHVFQUErQixDQUFDO1lBQ3ZGLE1BQU0sc0JBQXNCLEdBQUcsS0FBSyxDQUFDLG9CQUFvQiw2RUFBc0MsQ0FBQztZQUVoRyxJQUFJLG9CQUFvQixJQUFJLHNCQUFzQixFQUFFLENBQUM7Z0JBQ3BELElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxFQUFFLGFBQWEsRUFBRSxvQkFBb0IsRUFBRSxlQUFlLEVBQUUsc0JBQXNCLEVBQUUsQ0FBQyxDQUFDO2dCQUVoSCxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUNuQyxDQUFDO1FBQ0YsQ0FBQztRQUVELGlCQUFpQjtRQUNqQixJQUFJLEtBQUssQ0FBQyxvQkFBb0IsNERBQStCLEVBQUUsQ0FBQztZQUMvRCxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7WUFFbkIsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDbkMsQ0FBQztJQUNGLENBQUM7SUFFUyxjQUFjO1FBQ3ZCLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2xCLE9BQU8sQ0FBQyw0Q0FBNEM7UUFDckQsQ0FBQztRQUVELElBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQztRQUVwRyxJQUFJLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDO1FBQzFELElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQztRQUU3QyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsMEJBQTBCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRS9GLElBQUksQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUN6QyxDQUFDO0lBRU8sZ0JBQWdCO1FBQ3ZCLElBQUksQ0FBQyxhQUFhLEVBQUUsT0FBTyxFQUFFLENBQUM7UUFDOUIsSUFBSSxDQUFDLGFBQWEsR0FBRyxTQUFTLENBQUM7UUFFL0IsSUFBSSxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsQ0FBQztRQUN2QixJQUFJLENBQUMsT0FBTyxHQUFHLFNBQVMsQ0FBQztRQUV6QixJQUFJLENBQUMsMEJBQTBCLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDeEMsQ0FBQztJQUVTLDBCQUEwQixDQUFDLE9BQWdCO1FBQ3BELElBQUksS0FBSyxJQUFJLFNBQVMsSUFBSSxPQUFPLEVBQUUsQ0FBQztZQUNuQyxJQUFJLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO2dCQUMvQixJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLG9CQUFvQixDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ2hGLENBQUM7WUFFRCxJQUFJLENBQUMsMEJBQTBCLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQy9DLENBQUM7SUFDRixDQUFDO0lBRUQsZ0JBQWdCLENBQUMsVUFBNEI7UUFDNUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUMvQyxDQUFDO0lBRUQsaUJBQWlCLENBQUMsU0FBMkI7UUFDNUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUMvQyxDQUFDO0lBRWtCLGlCQUFpQixDQUFDLE1BQW1CO1FBQ3ZELElBQUksQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFDO1FBQ3RCLElBQUksQ0FBQyxhQUFhLEdBQUcsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUFDO1FBRTlELElBQUksQ0FBQyxXQUFXLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQztRQUNuRSxJQUFJLENBQUMsYUFBYSxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUM7UUFDdkUsSUFBSSxDQUFDLFlBQVksR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDO1FBRXJFLDRCQUE0QjtRQUM1QixJQUFJLENBQUMsU0FBUyxJQUFJLE9BQU8sQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLG9CQUFvQixFQUFFLElBQUksQ0FBQyxhQUFhLENBQUMsRUFBRSxDQUFDO1lBQ2pHLElBQUksQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQztRQUNqRSxDQUFDO1FBRUQscURBQXFEO1FBQ3JELElBQUksQ0FBQyxVQUFVLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQyxDQUFDLDBCQUEwQixDQUFDLENBQUMsQ0FBQztRQUU3RSxnRUFBZ0U7UUFDaEUsSUFDQyxDQUFDLElBQUksQ0FBQyxXQUFXO1lBQ2pCLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLG9CQUFvQixFQUFFLElBQUksQ0FBQyxhQUFhLENBQUM7WUFDakUsQ0FBQyxDQUFDLFdBQVcsSUFBSSxLQUFLLENBQUM7WUFDdkIsSUFBSSxDQUFDLHdCQUF3QixLQUFLLFNBQVMsRUFDMUMsQ0FBQztZQUNGLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztRQUN2QixDQUFDO1FBRUQsUUFBUTtRQUNSLElBQUksQ0FBQyxLQUFLLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQyxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQztRQUMvRCxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7UUFFbkIseUJBQXlCO1FBQ3pCLElBQUksaUJBQWlCLENBQUMsSUFBSSxDQUFDLG9CQUFvQixFQUFFLElBQUksQ0FBQyxhQUFhLENBQUMsRUFBRSxDQUFDO1lBQ3RFLElBQUksQ0FBQyxvQkFBb0IsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsOEJBQThCLENBQUMsQ0FBQyxDQUFDO1lBQ3pGLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO1lBQzNCLElBQUksQ0FBQyx3QkFBd0IsRUFBRSxDQUFDO1FBQ2pDLENBQUM7UUFFRCw0QkFBNEI7UUFDNUIsSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLEVBQUUsQ0FBQztZQUN2RSxJQUFJLDZCQUE2QixHQUFHLFdBQVcsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUM7WUFDbkUsSUFBSSxXQUFXLElBQUksUUFBUSxFQUFFLENBQUM7Z0JBRTdCLDRFQUE0RTtnQkFDNUUsd0dBQXdHO2dCQUV4RyxNQUFNLFVBQVUsR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBUSxDQUFDO2dCQUMxRCxJQUFJLFVBQVUsRUFBRSxRQUFRLEVBQUUsU0FBUyxLQUFLLEtBQUssRUFBRSxDQUFDO29CQUMvQyw2QkFBNkIsR0FBRyxPQUFPLENBQUM7Z0JBQ3pDLENBQUM7WUFDRixDQUFDO1lBRUQsSUFBSSxXQUFXLElBQUksUUFBUSxJQUFJLDZCQUE2QixLQUFLLE1BQU0sRUFBRSxDQUFDO2dCQUN6RSxzRkFBc0Y7Z0JBQ3RGLHNGQUFzRjtnQkFDdEYsbUZBQW1GO2dCQUNuRiwwQkFBMEI7WUFDM0IsQ0FBQztpQkFBTSxJQUFJLHNCQUFzQixDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyw4Q0FBK0IsRUFBRSxDQUFDO2dCQUM3RixrREFBa0Q7WUFDbkQsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLElBQUksQ0FBQyx1QkFBdUIsR0FBRyxNQUFNLENBQUMsNkJBQTZCLEtBQUssTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQywrQkFBK0IsQ0FBQyxDQUFDLENBQUM7Z0JBQzNKLElBQUksS0FBSyxFQUFFLENBQUM7b0JBQ1gsaUZBQWlGO29CQUNqRixrRUFBa0U7b0JBQ2xFLE1BQU0sQ0FBQyw2QkFBNkIsS0FBSyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLCtCQUErQixDQUFDLENBQUMsQ0FBQztnQkFDN0gsQ0FBQztnQkFFRCxJQUFJLFlBQVksRUFBRSxFQUFFLENBQUM7b0JBQ3BCLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFDO2dCQUMzRCxDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7UUFFRCxxR0FBcUc7UUFDckcsc0ZBQXNGO1FBQ3RGLDZFQUE2RTtRQUM3RSw4RUFBOEU7UUFDOUUsNkVBQTZFO1FBQzdFLENBQUM7WUFDQSxJQUFJLENBQUMsU0FBUyxDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUUsU0FBUyxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsRUFBRTtnQkFDcEYsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFFcEIsSUFBSSxVQUFrQixDQUFDO2dCQUN2QixJQUFJLFdBQVcsSUFBSSxhQUFhLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLFVBQVUsQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO29CQUNoRixVQUFVLEdBQUcsTUFBTSxDQUFDLG9CQUFvQixDQUFDO2dCQUMxQyxDQUFDO3FCQUFNLENBQUM7b0JBQ1AsVUFBVSxHQUFHLE1BQU0sQ0FBQyxlQUFlLENBQUM7Z0JBQ3JDLENBQUM7Z0JBRUQsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLEVBQUUsVUFBVSxDQUFDLENBQUM7WUFDbkMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUVKLElBQUksV0FBVyxFQUFFLENBQUM7Z0JBQ2pCLElBQUksQ0FBQyxTQUFTLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxTQUFTLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQyxFQUFFO29CQUMxRSxJQUFJLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQzt3QkFDZixXQUFXLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsMERBQTBELENBQUMsQ0FBQzt3QkFFckYsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLG9CQUFvQixDQUFDLENBQUM7b0JBQ3BELENBQUM7Z0JBQ0YsQ0FBQyxFQUFFLElBQUksQ0FBQywwREFBMEQsQ0FBQyxDQUFDLENBQUM7WUFDdEUsQ0FBQztRQUNGLENBQUM7UUFFRCxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7UUFFcEIsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDO0lBQ3JCLENBQUM7SUFFTyxXQUFXO1FBQ2xCLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUU5QixhQUFhO1FBQ2IsSUFBSSxDQUFDLElBQUksQ0FBQyxzQkFBc0IsRUFBRSxDQUFDO1lBQ2xDLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDO1lBQzlDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFFO2dCQUMzRCxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQztnQkFDOUMsc0RBQXNEO2dCQUN0RCxJQUFJLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO29CQUMvQixJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO2dCQUM5QyxDQUFDO1lBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUM7UUFFRCxhQUFhO2FBQ1IsQ0FBQztZQUNMLE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsb0JBQW9CLEVBQUUsSUFBSSxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUM7WUFDM0gsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ3pDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUM7UUFDMUMsQ0FBQztJQUNGLENBQUM7SUFFTyxzQkFBc0IsQ0FBQyxNQUFlLEVBQUUsT0FBbUM7UUFFbEYsdUJBQXVCO1FBQ3ZCLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDdkIsSUFBSSxNQUFNLENBQUMsRUFBRSxLQUFLLGtCQUFrQixFQUFFLENBQUM7Z0JBQ3RDLE9BQU8sSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxrQ0FBa0MsRUFBRSxFQUFFLFFBQVEsRUFBRSxHQUFHLEVBQUUsNEJBQW9CLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQztZQUN2SSxDQUFDO1lBQ0QsSUFBSSxNQUFNLENBQUMsRUFBRSxLQUFLLG9CQUFvQixFQUFFLENBQUM7Z0JBQ3hDLE9BQU8sSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxtQ0FBbUMsRUFBRSxFQUFFLFFBQVEsRUFBRSxHQUFHLEVBQUUsNEJBQW9CLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQztZQUN4SSxDQUFDO1FBQ0YsQ0FBQztRQUVELHFCQUFxQjtRQUNyQixNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxXQUFXLEVBQUUsZ0JBQWdCLENBQUM7UUFDbEYsSUFBSSxnQkFBZ0IsSUFBSSxnQkFBZ0IsWUFBWSxVQUFVLEVBQUUsQ0FBQztZQUNoRSxNQUFNLE1BQU0sR0FBRyxnQkFBZ0IsQ0FBQyxpQkFBaUIsQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLENBQUM7WUFFbkUsSUFBSSxNQUFNLEVBQUUsQ0FBQztnQkFDWixPQUFPLE1BQU0sQ0FBQztZQUNmLENBQUM7UUFDRixDQUFDO1FBRUQsbUJBQW1CO1FBQ25CLE9BQU8sb0JBQW9CLENBQUMsSUFBSSxDQUFDLG9CQUFvQixFQUFFLE1BQU0sRUFBRSxFQUFFLEdBQUcsT0FBTyxFQUFFLFdBQVcsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO0lBQ3BHLENBQUM7SUFFTyxhQUFhLENBQUMsTUFBZTtRQUNwQyxNQUFNLGdDQUFnQyxHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxXQUFXLEVBQUUsZ0JBQWdCLEVBQUUsdUJBQXVCLElBQUksSUFBSSxDQUFDLGlCQUFpQixDQUFDO1FBRXJKLE9BQU8sSUFBSSxDQUFDLGlCQUFpQixDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsZ0NBQWdDLENBQUMsQ0FBQztJQUM3RixDQUFDO0lBRU8sbUJBQW1CO1FBRTFCLG1GQUFtRjtRQUNuRixzRUFBc0U7UUFFdEUsSUFBSSxDQUFDLHVCQUF1QixDQUFDLEtBQUssRUFBRSxDQUFDO1FBRXJDLElBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFDLHVCQUF1QixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLGdCQUFnQixFQUFFLElBQUksQ0FBQyxvQkFBb0IsRUFBRTtZQUMzSSxXQUFXLEVBQUUsTUFBTSxDQUFDLGVBQWU7WUFDbkMsV0FBVyx1Q0FBK0I7WUFDMUMsU0FBUyxFQUFFLFFBQVEsQ0FBQyx1QkFBdUIsRUFBRSxlQUFlLENBQUM7WUFDN0QsYUFBYSxFQUFFLE1BQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUM7WUFDbkQsZ0JBQWdCLEVBQUUsRUFBRSxRQUFRLEVBQUUsQ0FBQyxFQUFFLFFBQVEsRUFBRSxDQUFDLG9CQUFvQixFQUFFLGtCQUFrQixFQUFFLEdBQUcsK0JBQStCLENBQUMsRUFBRTtZQUMzSCx1QkFBdUIsRUFBRSxHQUFHLEVBQUUsOEJBQXNCO1lBQ3BELGVBQWUsRUFBRSxXQUFXO1lBQzVCLHFCQUFxQixFQUFFLElBQUksQ0FBQyxvQkFBb0IsRUFBRSx1RkFBdUY7WUFDekksc0JBQXNCLEVBQUUsQ0FBQyxNQUFNLEVBQUUsT0FBTyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsc0JBQXNCLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQztZQUN6RixhQUFhLEVBQUUsSUFBSSxDQUFDLGFBQWE7U0FDakMsQ0FBQyxDQUFDLENBQUM7UUFFSixJQUFJLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO1lBQy9CLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLHNCQUFzQixDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNuSixDQUFDO0lBQ0YsQ0FBQztJQUVPLHdCQUF3QixDQUFDLFNBQWlHLElBQUk7UUFDckksSUFBSSxNQUFNLEtBQUssSUFBSSxFQUFFLENBQUM7WUFDckIsTUFBTSxHQUFHLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLGVBQWUsRUFBRSxJQUFJLEVBQUUsQ0FBQztRQUM5RSxDQUFDO1FBRUQsTUFBTSxvQkFBb0IsR0FBRyxHQUFHLEVBQUU7WUFDakMsTUFBTSxPQUFPLEdBQW9CLEVBQUUsT0FBTyxFQUFFLEVBQUUsRUFBRSxTQUFTLEVBQUUsRUFBRSxFQUFFLENBQUM7WUFFaEUscUJBQXFCO1lBQ3JCLElBQUksSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUM7Z0JBQy9CLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFFM0MsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLFdBQVcsQ0FBQztnQkFDM0QsSUFBSSxXQUFXLEVBQUUsQ0FBQztvQkFDakIsTUFBTSxhQUFhLEdBQUcsV0FBVyxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO29CQUUxRixPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLGFBQWEsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7b0JBQ3ZELE9BQU8sQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLEdBQUcsYUFBYSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQztvQkFFM0QsSUFBSSxDQUFDLDZCQUE2QixDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFBRSxDQUFDLG9CQUFvQixFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUNqRyxDQUFDO1lBQ0YsQ0FBQztZQUVELHFCQUFxQjtZQUNyQixNQUFNLG9CQUFvQixHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUNqRSxJQUFJLENBQUMsdUJBQXVCLEdBQUcsb0JBQW9CLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztZQUMvRCxzQkFBc0IsQ0FDckIsb0JBQW9CLEVBQ3BCLE9BQU8sQ0FDUCxDQUFDO1lBRUYscUJBQXFCO1lBQ3JCLElBQUksSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7Z0JBQzVCLHNCQUFzQixDQUNyQixJQUFJLENBQUMsaUJBQWlCLENBQUMsVUFBVSxFQUFFLEVBQ25DLE9BQU8sRUFDUCxHQUFHLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQywyRUFBMkU7aUJBQzVHLENBQUM7WUFDSCxDQUFDO1lBRUQsMkNBQTJDO1lBQzNDLElBQUksSUFBSSxDQUFDLHNCQUFzQixFQUFFLENBQUM7Z0JBQ2pDLElBQUksdUJBQXVCLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUM7b0JBQ2xELE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLDZCQUE2QixDQUFDLENBQUM7Z0JBQ3JELENBQUM7Z0JBRUQsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsNEJBQTRCLENBQUMsQ0FBQztZQUNwRCxDQUFDO1lBRUQsSUFBSSxDQUFDLGFBQWEsQ0FBQyxVQUFVLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRSxjQUFjLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7UUFDbkcsQ0FBQyxDQUFDO1FBRUYsZ0VBQWdFO1FBRWhFLElBQUksTUFBTSxDQUFDLGFBQWEsRUFBRSxDQUFDO1lBQzFCLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUUxQyw4RkFBOEY7WUFDOUYsZ0hBQWdIO1lBQ2hILElBQUksSUFBSSxDQUFDLG9CQUFvQixJQUFJLElBQUksQ0FBQyxhQUFhLENBQUMsWUFBWSxLQUFLLFNBQVMsRUFBRSxDQUFDO2dCQUNoRixNQUFNLE9BQU8sR0FBMkIsRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLHFCQUFxQixDQUFDLFdBQVcsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFFL0YsSUFBSSxDQUFDLGFBQWEsQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDLDRCQUE0QixDQUFDLEdBQUcsQ0FBQyxJQUFJLGlDQUFpQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7Z0JBQ3hILElBQUksQ0FBQyxhQUFhLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQztZQUN0QyxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsSUFBSSxDQUFDLGFBQWEsQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDLDRCQUE0QixDQUFDLEdBQUcsQ0FBQyxJQUFJLFlBQVksRUFBRSxDQUFDLENBQUM7Z0JBQzVGLElBQUksQ0FBQyxhQUFhLENBQUMsT0FBTyxHQUFHLFNBQVMsQ0FBQztZQUN4QyxDQUFDO1FBQ0YsQ0FBQztRQUVELElBQUksTUFBTSxDQUFDLGFBQWEsRUFBRSxDQUFDO1lBQzFCLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUUxQyxJQUFJLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO2dCQUMvQixJQUFJLENBQUMsaUJBQWlCLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLGlCQUFpQixFQUFFLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO2dCQUV2RyxJQUFJLENBQUMsNEJBQTRCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO2dCQUM5RCxJQUFJLENBQUMsNEJBQTRCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFFLENBQUMsb0JBQW9CLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDekcsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxTQUFTLENBQUM7WUFDcEMsQ0FBQztRQUNGLENBQUM7UUFFRCxJQUFJLENBQUMsNEJBQTRCLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDMUMsSUFBSSxDQUFDLDRCQUE0QixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFBRSxDQUFDLG9CQUFvQixFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRXhHLElBQUksTUFBTSxDQUFDLGVBQWUsRUFBRSxDQUFDO1lBQzVCLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUN4QyxJQUFJLElBQUksQ0FBQyxzQkFBc0IsRUFBRSxDQUFDO2dCQUNqQyxJQUFJLENBQUMsMEJBQTBCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLCtCQUF1Qiw4QkFBOEIsQ0FBQyxrQ0FBa0MsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsb0JBQW9CLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDL00sQ0FBQztRQUNGLENBQUM7UUFFRCxvQkFBb0IsRUFBRSxDQUFDO0lBQ3hCLENBQUM7SUFFUSxZQUFZO1FBQ3BCLEtBQUssQ0FBQyxZQUFZLEVBQUUsQ0FBQztRQUVyQixpQkFBaUI7UUFDakIsSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDbEIsSUFBSSxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7Z0JBQ3JCLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUN4QyxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQzNDLENBQUM7WUFFRCxNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLDZCQUE2QixDQUFDLENBQUMsQ0FBQywyQkFBMkIsRUFBRSxDQUFDLEtBQUssRUFBRSxLQUFLLEVBQUUsRUFBRTtnQkFDckksNkVBQTZFO2dCQUM3RSwyRUFBMkU7Z0JBQzNFLDZFQUE2RTtnQkFDN0Usb0RBQW9EO2dCQUNwRCxPQUFPLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLG9CQUFvQixDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7WUFDakYsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ1QsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsZUFBZSxHQUFHLGVBQWUsQ0FBQztZQUVyRCxJQUFJLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztnQkFDdkIsSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsZUFBZSxHQUFHLGVBQWUsQ0FBQztZQUMzRCxDQUFDO1lBRUQsSUFBSSxlQUFlLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDO2dCQUNuRSxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDckMsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUN4QyxDQUFDO1lBRUQsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDLENBQUMsMkJBQTJCLENBQUMsQ0FBQztZQUNySCxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsZUFBZSxJQUFJLEVBQUUsQ0FBQztZQUVqRCxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLGdCQUFnQixDQUFDLENBQUM7WUFDcEQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsWUFBWSxHQUFHLFdBQVcsQ0FBQyxDQUFDLENBQUMsYUFBYSxXQUFXLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO1FBQ2pGLENBQUM7SUFDRixDQUFDO0lBRVMsYUFBYSxDQUFDLENBQWEsRUFBRSxNQUFjO1FBQ3BELE1BQU0sS0FBSyxHQUFHLElBQUksa0JBQWtCLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUVqRSxVQUFVO1FBQ1YsSUFBSSxDQUFDLGtCQUFrQixDQUFDLGVBQWUsQ0FBQztZQUN2QyxTQUFTLEVBQUUsR0FBRyxFQUFFLENBQUMsS0FBSztZQUN0QixNQUFNO1lBQ04saUJBQWlCLEVBQUUsSUFBSSxDQUFDLGlCQUFpQjtZQUN6QyxnQkFBZ0IsRUFBRSxXQUFXLElBQUksUUFBUSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxTQUFTO1NBQ3BFLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRCxJQUFjLHdCQUF3QjtRQUNyQyxJQUFJLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUN0QixPQUFPLFFBQVEsQ0FBQztRQUNqQixDQUFDO1FBRUQsT0FBTyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsQ0FBQztJQUN4RCxDQUFDO0lBRUQsSUFBWSxvQkFBb0I7UUFDL0IsT0FBTyxDQUFDLElBQUksQ0FBQyxXQUFXLElBQUksSUFBSSxDQUFDLG9CQUFvQixDQUFDLFFBQVEsdUVBQXdDLEtBQUssS0FBSyxDQUFDO0lBQ2xILENBQUM7SUFFRCxJQUFjLHNCQUFzQjtRQUNuQyxPQUFPLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLDREQUF3QyxLQUFLLEtBQUssQ0FBQztJQUM3RixDQUFDO0lBRUQsSUFBWSxvQkFBb0I7UUFDL0IsT0FBTyxJQUFJLENBQUMsa0JBQWtCLENBQUMsV0FBVyxDQUFDLHFCQUFxQixvREFBbUM7WUFDbEcsQ0FDQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsV0FBVyxDQUFDLHFCQUFxQixrREFBa0M7Z0JBQzNGLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxXQUFXLENBQUMsUUFBUSxxQ0FBd0IsQ0FDcEUsQ0FBQztJQUNKLENBQUM7SUFFRCxJQUFZLHNCQUFzQjtRQUNqQyxNQUFNLG1CQUFtQixHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLDZFQUEyRCxDQUFDO1FBQzFILE9BQU8sQ0FBQyxJQUFJLENBQUMsV0FBVyxJQUFJLENBQUMsbUJBQW1CLHdDQUE0QixJQUFJLG1CQUFtQiw4Q0FBK0IsQ0FBQyxDQUFDO0lBQ3JJLENBQUM7SUFFRCxJQUFJLG1CQUFtQjtRQUN0QixNQUFNLFVBQVUsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLHdCQUF3QixLQUFLLFFBQVEsSUFBSSxJQUFJLENBQUMsd0JBQXdCLEtBQUssU0FBUyxJQUFJLENBQUMsQ0FBQyxLQUFLLElBQUksV0FBVyxDQUFDLENBQUMsQ0FBQztRQUMzSSxNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxzQkFBc0IsQ0FBQztRQUNyRCxNQUFNLGlCQUFpQixHQUFHLElBQUksQ0FBQyx1QkFBdUIsSUFBSSxJQUFJLENBQUMsb0JBQW9CLElBQUksSUFBSSxDQUFDLG9CQUFvQixJQUFJLElBQUksQ0FBQyxzQkFBc0IsQ0FBQztRQUNoSixPQUFPLFVBQVUsSUFBSSxnQkFBZ0IsSUFBSSxpQkFBaUIsQ0FBQztJQUM1RCxDQUFDO0lBRUQsSUFBSSxXQUFXO1FBQ2QsdUVBQXVFO1FBQ3ZFLHdEQUF3RDtRQUN4RCxrREFBa0Q7UUFFbEQsT0FBTyxhQUFhLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQztJQUNoRixDQUFDO0lBRVEsTUFBTSxDQUFDLEtBQWEsRUFBRSxNQUFjO1FBQzVDLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxTQUFTLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFFaEQsS0FBSyxDQUFDLGNBQWMsQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDckMsQ0FBQztJQUVPLFlBQVksQ0FBQyxTQUFvQjtRQUN4QyxJQUFJLENBQUMsb0JBQW9CLEdBQUcsU0FBUyxDQUFDO1FBRXRDLElBQUksaUJBQWlCLENBQUMsSUFBSSxDQUFDLG9CQUFvQixFQUFFLElBQUksQ0FBQyxhQUFhLENBQUMsRUFBRSxDQUFDO1lBQ3RFLE1BQU0sVUFBVSxHQUFHLGFBQWEsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7WUFFMUQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLGVBQWUsRUFBRSxVQUFVLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztZQUN2RSxJQUFJLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsY0FBYyxFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUV0RSxJQUFJLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztnQkFDeEIsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUM1RCxJQUFJLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1lBQzdDLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVELEtBQUs7UUFDSixJQUFJLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUN4QixJQUFJLENBQUMsYUFBYSxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQ2xDLENBQUM7YUFBTSxDQUFDO1lBQ04sSUFBSSxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsaUNBQWlDLENBQXdCLEVBQUUsS0FBSyxFQUFFLENBQUM7UUFDaEcsQ0FBQztJQUNGLENBQUM7SUFFRCxNQUFNO1FBQ0wsT0FBTztZQUNOLElBQUksc0RBQXFCO1NBQ3pCLENBQUM7SUFDSCxDQUFDO0lBRVEsT0FBTztRQUNmLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLENBQUM7UUFFM0IsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQ2pCLENBQUM7Q0FDRCxDQUFBO0FBMW5CWSxtQkFBbUI7SUE4RTdCLFdBQUEsbUJBQW1CLENBQUE7SUFDbkIsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLG1DQUFtQyxDQUFBO0lBQ25DLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSxhQUFhLENBQUE7SUFDYixXQUFBLGVBQWUsQ0FBQTtJQUNmLFdBQUEsdUJBQXVCLENBQUE7SUFDdkIsWUFBQSxrQkFBa0IsQ0FBQTtJQUNsQixZQUFBLFlBQVksQ0FBQTtJQUNaLFlBQUEsb0JBQW9CLENBQUE7SUFDcEIsWUFBQSxjQUFjLENBQUE7SUFDZCxZQUFBLFlBQVksQ0FBQTtJQUNaLFlBQUEsa0JBQWtCLENBQUE7R0ExRlIsbUJBQW1CLENBMG5CL0I7O0FBRU0sSUFBTSx1QkFBdUIsR0FBN0IsTUFBTSx1QkFBd0IsU0FBUSxtQkFBbUI7SUFFL0QsWUFDc0Isa0JBQXVDLEVBQ3JDLG9CQUEyQyxFQUM3QixrQkFBdUQsRUFDckUsb0JBQTJDLEVBQ25ELFlBQTJCLEVBQ3pCLGNBQStCLEVBQ3ZCLGFBQXNDLEVBQzNDLGlCQUFxQyxFQUMzQyxXQUF5QixFQUNqQixrQkFBd0MsRUFDOUMsYUFBNkIsRUFDL0IsV0FBeUIsRUFDbkIsaUJBQXFDO1FBRXpELEtBQUssdURBQXNCLFVBQVUsRUFBRSxNQUFNLEVBQUUsa0JBQWtCLEVBQUUsb0JBQW9CLEVBQUUsa0JBQWtCLEVBQUUsb0JBQW9CLEVBQUUsWUFBWSxFQUFFLGNBQWMsRUFBRSxhQUFhLEVBQUUsaUJBQWlCLEVBQUUsV0FBVyxFQUFFLGtCQUFrQixFQUFFLGFBQWEsRUFBRSxXQUFXLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztJQUNwUixDQUFDO0NBQ0QsQ0FBQTtBQW5CWSx1QkFBdUI7SUFHakMsV0FBQSxtQkFBbUIsQ0FBQTtJQUNuQixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsbUNBQW1DLENBQUE7SUFDbkMsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLGFBQWEsQ0FBQTtJQUNiLFdBQUEsZUFBZSxDQUFBO0lBQ2YsV0FBQSx1QkFBdUIsQ0FBQTtJQUN2QixXQUFBLGtCQUFrQixDQUFBO0lBQ2xCLFdBQUEsWUFBWSxDQUFBO0lBQ1osV0FBQSxvQkFBb0IsQ0FBQTtJQUNwQixZQUFBLGNBQWMsQ0FBQTtJQUNkLFlBQUEsWUFBWSxDQUFBO0lBQ1osWUFBQSxrQkFBa0IsQ0FBQTtHQWZSLHVCQUF1QixDQW1CbkM7O0FBT00sSUFBTSw0QkFBNEIsR0FBbEMsTUFBTSw0QkFBNkIsU0FBUSxtQkFBbUI7O2FBRXJELFlBQU8sR0FBRyxDQUFDLEFBQUosQ0FBSztJQUUzQixJQUFJLE1BQU0sS0FBSyxPQUFPLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDO0lBRTNDLFlBQ1UsU0FBc0IsRUFDL0IscUJBQTZDLEVBQzVCLFlBQWlDLEVBQzdCLGtCQUF1QyxFQUNyQyxvQkFBMkMsRUFDN0Isa0JBQXVELEVBQ3JFLG9CQUEyQyxFQUNuRCxZQUEyQixFQUN6QixjQUErQixFQUN2QixhQUFzQyxFQUMzQyxpQkFBcUMsRUFDM0MsV0FBeUIsRUFDakIsa0JBQXdDLEVBQzlDLGFBQTZCLEVBQy9CLFdBQXlCLEVBQ25CLGlCQUFxQztRQUV6RCxNQUFNLEVBQUUsR0FBRyw4QkFBNEIsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNsRCxLQUFLLENBQUMsa0NBQWtDLEVBQUUsRUFBRSxFQUFFLFNBQVMsQ0FBQyxTQUFTLENBQUMsRUFBRSxxQkFBcUIsRUFBRSxrQkFBa0IsRUFBRSxvQkFBb0IsRUFBRSxrQkFBa0IsRUFBRSxvQkFBb0IsRUFBRSxZQUFZLEVBQUUsY0FBYyxFQUFFLGFBQWEsRUFBRSxpQkFBaUIsRUFBRSxXQUFXLEVBQUUsa0JBQWtCLEVBQUUsYUFBYSxFQUFFLFdBQVcsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO1FBbEJ0VCxjQUFTLEdBQVQsU0FBUyxDQUFhO1FBRWQsaUJBQVksR0FBWixZQUFZLENBQXFCO0lBaUJuRCxDQUFDO0lBRUQsSUFBYSxXQUFXO1FBRXZCLHVFQUF1RTtRQUN2RSx3REFBd0Q7UUFDeEQsdURBQXVEO1FBQ3ZELG9FQUFvRTtRQUNwRSwyREFBMkQ7UUFFM0QsT0FBTyxhQUFhLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsbUJBQW1CLENBQUM7SUFDN0YsQ0FBQzs7QUFyQ1csNEJBQTRCO0lBVXRDLFdBQUEsbUJBQW1CLENBQUE7SUFDbkIsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLG1DQUFtQyxDQUFBO0lBQ25DLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSxhQUFhLENBQUE7SUFDYixXQUFBLGVBQWUsQ0FBQTtJQUNmLFdBQUEsdUJBQXVCLENBQUE7SUFDdkIsWUFBQSxrQkFBa0IsQ0FBQTtJQUNsQixZQUFBLFlBQVksQ0FBQTtJQUNaLFlBQUEsb0JBQW9CLENBQUE7SUFDcEIsWUFBQSxjQUFjLENBQUE7SUFDZCxZQUFBLFlBQVksQ0FBQTtJQUNaLFlBQUEsa0JBQWtCLENBQUE7R0F0QlIsNEJBQTRCLENBc0N4QyJ9