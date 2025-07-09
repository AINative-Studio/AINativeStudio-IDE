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
import * as nls from '../../../../nls.js';
import * as dom from '../../../../base/browser/dom.js';
import * as domStylesheetsJs from '../../../../base/browser/domStylesheets.js';
import * as cssJs from '../../../../base/browser/cssValue.js';
import { Action } from '../../../../base/common/actions.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextMenuService, IContextViewService } from '../../../../platform/contextview/browser/contextView.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IThemeService, Themable } from '../../../../platform/theme/common/themeService.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { switchTerminalActionViewItemSeparator, switchTerminalShowTabsTitle } from './terminalActions.js';
import { INotificationService, Severity } from '../../../../platform/notification/common/notification.js';
import { ITerminalConfigurationService, ITerminalGroupService, ITerminalService } from './terminal.js';
import { ViewPane } from '../../../browser/parts/views/viewPane.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IMenuService, MenuId, MenuItemAction } from '../../../../platform/actions/common/actions.js';
import { ITerminalProfileResolverService, ITerminalProfileService } from '../common/terminal.js';
import { TerminalLocation } from '../../../../platform/terminal/common/terminal.js';
import { ActionViewItem, SelectActionViewItem } from '../../../../base/browser/ui/actionbar/actionViewItems.js';
import { asCssVariable, selectBorder } from '../../../../platform/theme/common/colorRegistry.js';
import { TerminalTabbedView } from './terminalTabbedView.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { renderLabelWithIcons } from '../../../../base/browser/ui/iconLabel/iconLabels.js';
import { getColorForSeverity } from './terminalStatusList.js';
import { getFlatContextMenuActions, MenuEntryActionViewItem } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { DropdownWithPrimaryActionViewItem } from '../../../../platform/actions/browser/dropdownWithPrimaryActionViewItem.js';
import { DisposableMap, DisposableStore, dispose, MutableDisposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { URI } from '../../../../base/common/uri.js';
import { ColorScheme } from '../../../../platform/theme/common/theme.js';
import { getColorClass, getUriClasses } from './terminalIcon.js';
import { getTerminalActionBarArgs } from './terminalMenus.js';
import { TerminalContextKeys } from '../common/terminalContextKey.js';
import { getInstanceHoverInfo } from './terminalTooltip.js';
import { defaultSelectBoxStyles } from '../../../../platform/theme/browser/defaultStyles.js';
import { Event } from '../../../../base/common/event.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IAccessibilityService } from '../../../../platform/accessibility/common/accessibility.js';
import { InstanceContext, TerminalContextActionRunner } from './terminalContextMenu.js';
import { MicrotaskDelay } from '../../../../base/common/symbols.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
let TerminalViewPane = class TerminalViewPane extends ViewPane {
    get terminalTabbedView() { return this._terminalTabbedView; }
    constructor(options, keybindingService, _contextKeyService, viewDescriptorService, _configurationService, _contextMenuService, _instantiationService, _terminalService, _terminalConfigurationService, _terminalGroupService, themeService, hoverService, _notificationService, _keybindingService, openerService, _menuService, _terminalProfileService, _terminalProfileResolverService, _themeService, _accessibilityService) {
        super(options, keybindingService, _contextMenuService, _configurationService, _contextKeyService, viewDescriptorService, _instantiationService, openerService, themeService, hoverService);
        this._contextKeyService = _contextKeyService;
        this._configurationService = _configurationService;
        this._contextMenuService = _contextMenuService;
        this._instantiationService = _instantiationService;
        this._terminalService = _terminalService;
        this._terminalConfigurationService = _terminalConfigurationService;
        this._terminalGroupService = _terminalGroupService;
        this._notificationService = _notificationService;
        this._keybindingService = _keybindingService;
        this._menuService = _menuService;
        this._terminalProfileService = _terminalProfileService;
        this._terminalProfileResolverService = _terminalProfileResolverService;
        this._themeService = _themeService;
        this._accessibilityService = _accessibilityService;
        this._isInitialized = false;
        /**
         * Tracks an active promise of terminal creation requested by this component. This helps prevent
         * double creation for example when toggling a terminal's visibility and focusing it.
         */
        this._isTerminalBeingCreated = false;
        this._newDropdown = this._register(new MutableDisposable());
        this._disposableStore = this._register(new DisposableStore());
        this._actionDisposables = this._register(new DisposableMap());
        this._register(this._terminalService.onDidRegisterProcessSupport(() => {
            this._onDidChangeViewWelcomeState.fire();
        }));
        this._register(this._terminalService.onDidChangeInstances(() => {
            // If the first terminal is opened, hide the welcome view
            // and if the last one is closed, show it again
            if (this._hasWelcomeScreen() && this._terminalGroupService.instances.length <= 1) {
                this._onDidChangeViewWelcomeState.fire();
            }
            if (!this._parentDomElement) {
                return;
            }
            // If we do not have the tab view yet, create it now.
            if (!this._terminalTabbedView) {
                this._createTabsView();
            }
            // If we just opened our first terminal, layout
            if (this._terminalGroupService.instances.length === 1) {
                this.layoutBody(this._parentDomElement.offsetHeight, this._parentDomElement.offsetWidth);
            }
        }));
        this._dropdownMenu = this._register(this._menuService.createMenu(MenuId.TerminalNewDropdownContext, this._contextKeyService));
        this._singleTabMenu = this._register(this._menuService.createMenu(MenuId.TerminalTabContext, this._contextKeyService));
        this._register(this._terminalProfileService.onDidChangeAvailableProfiles(profiles => this._updateTabActionBar(profiles)));
        this._viewShowing = TerminalContextKeys.viewShowing.bindTo(this._contextKeyService);
        this._register(this.onDidChangeBodyVisibility(e => {
            if (e) {
                this._terminalTabbedView?.rerenderTabs();
            }
        }));
        this._register(this._configurationService.onDidChangeConfiguration(e => {
            if (this._parentDomElement && (e.affectsConfiguration("terminal.integrated.shellIntegration.decorationsEnabled" /* TerminalSettingId.ShellIntegrationDecorationsEnabled */) || e.affectsConfiguration("terminal.integrated.shellIntegration.enabled" /* TerminalSettingId.ShellIntegrationEnabled */))) {
                this._updateForShellIntegration(this._parentDomElement);
            }
        }));
        const shellIntegrationDisposable = this._register(new MutableDisposable());
        shellIntegrationDisposable.value = this._terminalService.onAnyInstanceAddedCapabilityType(c => {
            if (c === 2 /* TerminalCapability.CommandDetection */ && this._gutterDecorationsEnabled()) {
                this._parentDomElement?.classList.add('shell-integration');
                shellIntegrationDisposable.clear();
            }
        });
    }
    _updateForShellIntegration(container) {
        container.classList.toggle('shell-integration', this._gutterDecorationsEnabled());
    }
    _gutterDecorationsEnabled() {
        const decorationsEnabled = this._configurationService.getValue("terminal.integrated.shellIntegration.decorationsEnabled" /* TerminalSettingId.ShellIntegrationDecorationsEnabled */);
        return (decorationsEnabled === 'both' || decorationsEnabled === 'gutter') && this._configurationService.getValue("terminal.integrated.shellIntegration.enabled" /* TerminalSettingId.ShellIntegrationEnabled */);
    }
    _initializeTerminal(checkRestoredTerminals) {
        if (this.isBodyVisible() && this._terminalService.isProcessSupportRegistered && this._terminalService.connectionState === 1 /* TerminalConnectionState.Connected */) {
            const wasInitialized = this._isInitialized;
            this._isInitialized = true;
            let hideOnStartup = 'never';
            if (!wasInitialized) {
                hideOnStartup = this._configurationService.getValue("terminal.integrated.hideOnStartup" /* TerminalSettingId.HideOnStartup */);
                if (hideOnStartup === 'always') {
                    this._terminalGroupService.hidePanel();
                }
            }
            let shouldCreate = this._terminalGroupService.groups.length === 0;
            // When triggered just after reconnection, also check there are no groups that could be
            // getting restored currently
            if (checkRestoredTerminals) {
                shouldCreate &&= this._terminalService.restoredGroupCount === 0;
            }
            if (!shouldCreate) {
                return;
            }
            if (!wasInitialized) {
                switch (hideOnStartup) {
                    case 'never':
                        this._isTerminalBeingCreated = true;
                        this._terminalService.createTerminal({ location: TerminalLocation.Panel }).finally(() => this._isTerminalBeingCreated = false);
                        break;
                    case 'whenEmpty':
                        if (this._terminalService.restoredGroupCount === 0) {
                            this._terminalGroupService.hidePanel();
                        }
                        break;
                }
                return;
            }
            if (!this._isTerminalBeingCreated) {
                this._isTerminalBeingCreated = true;
                this._terminalService.createTerminal({ location: TerminalLocation.Panel }).finally(() => this._isTerminalBeingCreated = false);
            }
        }
    }
    // eslint-disable-next-line @typescript-eslint/naming-convention
    renderBody(container) {
        super.renderBody(container);
        if (!this._parentDomElement) {
            this._updateForShellIntegration(container);
        }
        this._parentDomElement = container;
        this._parentDomElement.classList.add('integrated-terminal');
        domStylesheetsJs.createStyleSheet(this._parentDomElement);
        this._instantiationService.createInstance(TerminalThemeIconStyle, this._parentDomElement);
        if (!this.shouldShowWelcome()) {
            this._createTabsView();
        }
        this._register(this.configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration("terminal.integrated.fontFamily" /* TerminalSettingId.FontFamily */) || e.affectsConfiguration('editor.fontFamily')) {
                if (!this._terminalConfigurationService.configFontIsMonospace()) {
                    const choices = [{
                            label: nls.localize('terminal.useMonospace', "Use 'monospace'"),
                            run: () => this.configurationService.updateValue("terminal.integrated.fontFamily" /* TerminalSettingId.FontFamily */, 'monospace'),
                        }];
                    this._notificationService.prompt(Severity.Warning, nls.localize('terminal.monospaceOnly', "The terminal only supports monospace fonts. Be sure to restart VS Code if this is a newly installed font."), choices);
                }
            }
        }));
        this._register(this.onDidChangeBodyVisibility(async (visible) => {
            this._viewShowing.set(visible);
            if (visible) {
                if (this._hasWelcomeScreen()) {
                    this._onDidChangeViewWelcomeState.fire();
                }
                this._initializeTerminal(false);
                // we don't know here whether or not it should be focused, so
                // defer focusing the panel to the focus() call
                // to prevent overriding preserveFocus for extensions
                this._terminalGroupService.showPanel(false);
            }
            else {
                for (const instance of this._terminalGroupService.instances) {
                    instance.resetFocusContextKey();
                }
            }
            this._terminalGroupService.updateVisibility();
        }));
        this._register(this._terminalService.onDidChangeConnectionState(() => this._initializeTerminal(true)));
        this.layoutBody(this._parentDomElement.offsetHeight, this._parentDomElement.offsetWidth);
    }
    _createTabsView() {
        if (!this._parentDomElement) {
            return;
        }
        this._terminalTabbedView = this._register(this.instantiationService.createInstance(TerminalTabbedView, this._parentDomElement));
    }
    // eslint-disable-next-line @typescript-eslint/naming-convention
    layoutBody(height, width) {
        super.layoutBody(height, width);
        this._terminalTabbedView?.layout(width, height);
    }
    createActionViewItem(action, options) {
        switch (action.id) {
            case "workbench.action.terminal.split" /* TerminalCommandId.Split */: {
                // Split needs to be special cased to force splitting within the panel, not the editor
                const that = this;
                const store = new DisposableStore();
                const panelOnlySplitAction = store.add(new class extends Action {
                    constructor() {
                        super(action.id, action.label, action.class, action.enabled);
                        this.checked = action.checked;
                        this.tooltip = action.tooltip;
                    }
                    async run() {
                        const instance = that._terminalGroupService.activeInstance;
                        if (instance) {
                            const newInstance = await that._terminalService.createTerminal({ location: { parentTerminal: instance } });
                            return newInstance?.focusWhenReady();
                        }
                        return;
                    }
                });
                const item = store.add(new ActionViewItem(action, panelOnlySplitAction, { ...options, icon: true, label: false, keybinding: this._getKeybindingLabel(action) }));
                this._actionDisposables.set(action.id, store);
                return item;
            }
            case "workbench.action.terminal.switchTerminal" /* TerminalCommandId.SwitchTerminal */: {
                const item = this._instantiationService.createInstance(SwitchTerminalActionViewItem, action);
                this._actionDisposables.set(action.id, item);
                return item;
            }
            case "workbench.action.terminal.focus" /* TerminalCommandId.Focus */: {
                if (action instanceof MenuItemAction) {
                    const actions = getFlatContextMenuActions(this._singleTabMenu.getActions({ shouldForwardArgs: true }));
                    const item = this._instantiationService.createInstance(SingleTerminalTabActionViewItem, action, actions);
                    this._actionDisposables.set(action.id, item);
                    return item;
                }
                break;
            }
            case "workbench.action.terminal.new" /* TerminalCommandId.New */: {
                if (action instanceof MenuItemAction) {
                    const actions = getTerminalActionBarArgs(TerminalLocation.Panel, this._terminalProfileService.availableProfiles, this._getDefaultProfileName(), this._terminalProfileService.contributedProfiles, this._terminalService, this._dropdownMenu, this._disposableStore);
                    this._newDropdown.value = new DropdownWithPrimaryActionViewItem(action, actions.dropdownAction, actions.dropdownMenuActions, actions.className, { hoverDelegate: options.hoverDelegate }, this._contextMenuService, this._keybindingService, this._notificationService, this._contextKeyService, this._themeService, this._accessibilityService);
                    this._newDropdown.value?.update(actions.dropdownAction, actions.dropdownMenuActions);
                    return this._newDropdown.value;
                }
            }
        }
        return super.createActionViewItem(action, options);
    }
    _getDefaultProfileName() {
        let defaultProfileName;
        try {
            defaultProfileName = this._terminalProfileService.getDefaultProfileName();
        }
        catch (e) {
            defaultProfileName = this._terminalProfileResolverService.defaultProfileName;
        }
        return defaultProfileName;
    }
    _getKeybindingLabel(action) {
        return this._keybindingService.lookupKeybinding(action.id)?.getLabel() ?? undefined;
    }
    _updateTabActionBar(profiles) {
        const actions = getTerminalActionBarArgs(TerminalLocation.Panel, profiles, this._getDefaultProfileName(), this._terminalProfileService.contributedProfiles, this._terminalService, this._dropdownMenu, this._disposableStore);
        this._newDropdown.value?.update(actions.dropdownAction, actions.dropdownMenuActions);
    }
    focus() {
        super.focus();
        if (this._terminalService.connectionState === 1 /* TerminalConnectionState.Connected */) {
            if (this._terminalGroupService.instances.length === 0 && !this._isTerminalBeingCreated) {
                this._isTerminalBeingCreated = true;
                this._terminalService.createTerminal({ location: TerminalLocation.Panel }).finally(() => this._isTerminalBeingCreated = false);
            }
            this._terminalGroupService.showPanel(true);
            return;
        }
        // If the terminal is waiting to reconnect to remote terminals, then there is no TerminalInstance yet that can
        // be focused. So wait for connection to finish, then focus.
        const previousActiveElement = this.element.ownerDocument.activeElement;
        if (previousActiveElement) {
            // TODO: Improve lifecycle management this event should be disposed after first fire
            this._register(this._terminalService.onDidChangeConnectionState(() => {
                // Only focus the terminal if the activeElement has not changed since focus() was called
                // TODO: Hack
                if (previousActiveElement && dom.isActiveElement(previousActiveElement)) {
                    this._terminalGroupService.showPanel(true);
                }
            }));
        }
    }
    _hasWelcomeScreen() {
        return !this._terminalService.isProcessSupportRegistered;
    }
    shouldShowWelcome() {
        return this._hasWelcomeScreen() && this._terminalService.instances.length === 0;
    }
};
TerminalViewPane = __decorate([
    __param(1, IKeybindingService),
    __param(2, IContextKeyService),
    __param(3, IViewDescriptorService),
    __param(4, IConfigurationService),
    __param(5, IContextMenuService),
    __param(6, IInstantiationService),
    __param(7, ITerminalService),
    __param(8, ITerminalConfigurationService),
    __param(9, ITerminalGroupService),
    __param(10, IThemeService),
    __param(11, IHoverService),
    __param(12, INotificationService),
    __param(13, IKeybindingService),
    __param(14, IOpenerService),
    __param(15, IMenuService),
    __param(16, ITerminalProfileService),
    __param(17, ITerminalProfileResolverService),
    __param(18, IThemeService),
    __param(19, IAccessibilityService)
], TerminalViewPane);
export { TerminalViewPane };
let SwitchTerminalActionViewItem = class SwitchTerminalActionViewItem extends SelectActionViewItem {
    constructor(action, _terminalService, _terminalGroupService, contextViewService, terminalProfileService) {
        super(null, action, getTerminalSelectOpenItems(_terminalService, _terminalGroupService), _terminalGroupService.activeGroupIndex, contextViewService, defaultSelectBoxStyles, { ariaLabel: nls.localize('terminals', 'Open Terminals.'), optionsAsChildren: true });
        this._terminalService = _terminalService;
        this._terminalGroupService = _terminalGroupService;
        this._register(_terminalService.onDidChangeInstances(() => this._updateItems(), this));
        this._register(_terminalService.onDidChangeActiveGroup(() => this._updateItems(), this));
        this._register(_terminalService.onDidChangeActiveInstance(() => this._updateItems(), this));
        this._register(_terminalService.onAnyInstanceTitleChange(() => this._updateItems(), this));
        this._register(_terminalGroupService.onDidChangeGroups(() => this._updateItems(), this));
        this._register(_terminalService.onDidChangeConnectionState(() => this._updateItems(), this));
        this._register(terminalProfileService.onDidChangeAvailableProfiles(() => this._updateItems(), this));
        this._register(_terminalService.onAnyInstancePrimaryStatusChange(() => this._updateItems(), this));
    }
    render(container) {
        super.render(container);
        container.classList.add('switch-terminal');
        container.style.borderColor = asCssVariable(selectBorder);
    }
    _updateItems() {
        const options = getTerminalSelectOpenItems(this._terminalService, this._terminalGroupService);
        this.setOptions(options, this._terminalGroupService.activeGroupIndex);
    }
};
SwitchTerminalActionViewItem = __decorate([
    __param(1, ITerminalService),
    __param(2, ITerminalGroupService),
    __param(3, IContextViewService),
    __param(4, ITerminalProfileService)
], SwitchTerminalActionViewItem);
function getTerminalSelectOpenItems(terminalService, terminalGroupService) {
    let items;
    if (terminalService.connectionState === 1 /* TerminalConnectionState.Connected */) {
        items = terminalGroupService.getGroupLabels().map(label => {
            return { text: label };
        });
    }
    else {
        items = [{ text: nls.localize('terminalConnectingLabel', "Starting...") }];
    }
    items.push({ text: switchTerminalActionViewItemSeparator, isDisabled: true });
    items.push({ text: switchTerminalShowTabsTitle });
    return items;
}
let SingleTerminalTabActionViewItem = class SingleTerminalTabActionViewItem extends MenuEntryActionViewItem {
    constructor(action, _actions, keybindingService, notificationService, contextKeyService, themeService, _terminalService, _terminaConfigurationService, _terminalGroupService, contextMenuService, _commandService, _instantiationService, _accessibilityService) {
        super(action, {
            draggable: true,
            hoverDelegate: _instantiationService.createInstance(SingleTabHoverDelegate)
        }, keybindingService, notificationService, contextKeyService, themeService, contextMenuService, _accessibilityService);
        this._actions = _actions;
        this._terminalService = _terminalService;
        this._terminaConfigurationService = _terminaConfigurationService;
        this._terminalGroupService = _terminalGroupService;
        this._commandService = _commandService;
        this._instantiationService = _instantiationService;
        this._elementDisposables = [];
        // Register listeners to update the tab
        this._register(Event.debounce(Event.any(this._terminalService.onAnyInstancePrimaryStatusChange, this._terminalGroupService.onDidChangeActiveInstance, Event.map(this._terminalService.onAnyInstanceIconChange, e => e.instance), this._terminalService.onAnyInstanceTitleChange, this._terminalService.onDidChangeInstanceCapability), (last, e) => {
            if (!last) {
                last = new Set();
            }
            if (e) {
                last.add(e);
            }
            return last;
        }, MicrotaskDelay)(merged => {
            for (const e of merged) {
                this.updateLabel(e);
            }
        }));
        // Clean up on dispose
        this._register(toDisposable(() => dispose(this._elementDisposables)));
    }
    async onClick(event) {
        this._terminalGroupService.lastAccessedMenu = 'inline-tab';
        if (event.altKey && this._menuItemAction.alt) {
            this._commandService.executeCommand(this._menuItemAction.alt.id, { location: TerminalLocation.Panel });
        }
        else {
            this._openContextMenu();
        }
    }
    // eslint-disable-next-line @typescript-eslint/naming-convention
    updateLabel(e) {
        // Only update if it's the active instance
        if (e && e !== this._terminalGroupService.activeInstance) {
            return;
        }
        if (this._elementDisposables.length === 0 && this.element && this.label) {
            // Right click opens context menu
            this._elementDisposables.push(dom.addDisposableListener(this.element, dom.EventType.CONTEXT_MENU, e => {
                if (e.button === 2) {
                    this._openContextMenu();
                    e.preventDefault();
                }
            }));
            // Middle click kills
            this._elementDisposables.push(dom.addDisposableListener(this.element, dom.EventType.AUXCLICK, e => {
                if (e.button === 1) {
                    const instance = this._terminalGroupService.activeInstance;
                    if (instance) {
                        this._terminalService.safeDisposeTerminal(instance);
                    }
                    e.preventDefault();
                }
            }));
            // Drag and drop
            this._elementDisposables.push(dom.addDisposableListener(this.element, dom.EventType.DRAG_START, e => {
                const instance = this._terminalGroupService.activeInstance;
                if (e.dataTransfer && instance) {
                    e.dataTransfer.setData("Terminals" /* TerminalDataTransfers.Terminals */, JSON.stringify([instance.resource.toString()]));
                }
            }));
        }
        if (this.label) {
            const label = this.label;
            const instance = this._terminalGroupService.activeInstance;
            if (!instance) {
                dom.reset(label, '');
                return;
            }
            label.classList.add('single-terminal-tab');
            let colorStyle = '';
            const primaryStatus = instance.statusList.primary;
            if (primaryStatus) {
                const colorKey = getColorForSeverity(primaryStatus.severity);
                this._themeService.getColorTheme();
                const foundColor = this._themeService.getColorTheme().getColor(colorKey);
                if (foundColor) {
                    colorStyle = foundColor.toString();
                }
            }
            label.style.color = colorStyle;
            dom.reset(label, ...renderLabelWithIcons(this._instantiationService.invokeFunction(getSingleTabLabel, instance, this._terminaConfigurationService.config.tabs.separator, ThemeIcon.isThemeIcon(this._commandAction.item.icon) ? this._commandAction.item.icon : undefined)));
            if (this._altCommand) {
                label.classList.remove(this._altCommand);
                this._altCommand = undefined;
            }
            if (this._color) {
                label.classList.remove(this._color);
                this._color = undefined;
            }
            if (this._class) {
                label.classList.remove(this._class);
                label.classList.remove('terminal-uri-icon');
                this._class = undefined;
            }
            const colorClass = getColorClass(instance);
            if (colorClass) {
                this._color = colorClass;
                label.classList.add(colorClass);
            }
            const uriClasses = getUriClasses(instance, this._themeService.getColorTheme().type);
            if (uriClasses) {
                this._class = uriClasses?.[0];
                label.classList.add(...uriClasses);
            }
            if (this._commandAction.item.icon) {
                this._altCommand = `alt-command`;
                label.classList.add(this._altCommand);
            }
            this.updateTooltip();
        }
    }
    _openContextMenu() {
        const actionRunner = new TerminalContextActionRunner();
        this._contextMenuService.showContextMenu({
            actionRunner,
            getAnchor: () => this.element,
            getActions: () => this._actions,
            // The context is always the active instance in the terminal view
            getActionsContext: () => {
                const instance = this._terminalGroupService.activeInstance;
                return instance ? [new InstanceContext(instance)] : [];
            },
            onHide: () => actionRunner.dispose()
        });
    }
};
SingleTerminalTabActionViewItem = __decorate([
    __param(2, IKeybindingService),
    __param(3, INotificationService),
    __param(4, IContextKeyService),
    __param(5, IThemeService),
    __param(6, ITerminalService),
    __param(7, ITerminalConfigurationService),
    __param(8, ITerminalGroupService),
    __param(9, IContextMenuService),
    __param(10, ICommandService),
    __param(11, IInstantiationService),
    __param(12, IAccessibilityService)
], SingleTerminalTabActionViewItem);
function getSingleTabLabel(accessor, instance, separator, icon) {
    // Don't even show the icon if there is no title as the icon would shift around when the title
    // is added
    if (!instance || !instance.title) {
        return '';
    }
    const iconId = ThemeIcon.isThemeIcon(instance.icon) ? instance.icon.id : accessor.get(ITerminalProfileResolverService).getDefaultIcon().id;
    const label = `$(${icon?.id || iconId}) ${getSingleTabTitle(instance, separator)}`;
    const primaryStatus = instance.statusList.primary;
    if (!primaryStatus?.icon) {
        return label;
    }
    return `${label} $(${primaryStatus.icon.id})`;
}
function getSingleTabTitle(instance, separator) {
    if (!instance) {
        return '';
    }
    return !instance.description ? instance.title : `${instance.title} ${separator} ${instance.description}`;
}
let TerminalThemeIconStyle = class TerminalThemeIconStyle extends Themable {
    constructor(container, _themeService, _terminalService, _terminalGroupService) {
        super(_themeService);
        this._themeService = _themeService;
        this._terminalService = _terminalService;
        this._terminalGroupService = _terminalGroupService;
        this._registerListeners();
        this._styleElement = domStylesheetsJs.createStyleSheet(container);
        this._register(toDisposable(() => this._styleElement.remove()));
        this.updateStyles();
    }
    _registerListeners() {
        this._register(this._terminalService.onAnyInstanceIconChange(() => this.updateStyles()));
        this._register(this._terminalService.onDidChangeInstances(() => this.updateStyles()));
        this._register(this._terminalGroupService.onDidChangeGroups(() => this.updateStyles()));
    }
    updateStyles() {
        super.updateStyles();
        const colorTheme = this._themeService.getColorTheme();
        // TODO: add a rule collector to avoid duplication
        let css = '';
        // Add icons
        for (const instance of this._terminalService.instances) {
            const icon = instance.icon;
            if (!icon) {
                continue;
            }
            let uri = undefined;
            if (icon instanceof URI) {
                uri = icon;
            }
            else if (icon instanceof Object && 'light' in icon && 'dark' in icon) {
                uri = colorTheme.type === ColorScheme.LIGHT ? icon.light : icon.dark;
            }
            const iconClasses = getUriClasses(instance, colorTheme.type);
            if (uri instanceof URI && iconClasses && iconClasses.length > 1) {
                css += (`.monaco-workbench .${iconClasses[0]} .monaco-highlighted-label .codicon, .monaco-action-bar .terminal-uri-icon.single-terminal-tab.action-label:not(.alt-command) .codicon` +
                    `{background-image: ${cssJs.asCSSUrl(uri)};}`);
            }
        }
        // Add colors
        for (const instance of this._terminalService.instances) {
            const colorClass = getColorClass(instance);
            if (!colorClass || !instance.color) {
                continue;
            }
            const color = colorTheme.getColor(instance.color);
            if (color) {
                // exclude status icons (file-icon) and inline action icons (trashcan, horizontalSplit, rerunTask)
                css += (`.monaco-workbench .${colorClass} .codicon:first-child:not(.codicon-split-horizontal):not(.codicon-trashcan):not(.file-icon):not(.codicon-rerun-task)` +
                    `{ color: ${color} !important; }`);
            }
        }
        this._styleElement.textContent = css;
    }
};
TerminalThemeIconStyle = __decorate([
    __param(1, IThemeService),
    __param(2, ITerminalService),
    __param(3, ITerminalGroupService)
], TerminalThemeIconStyle);
let SingleTabHoverDelegate = class SingleTabHoverDelegate {
    constructor(_configurationService, _hoverService, _storageService, _terminalGroupService) {
        this._configurationService = _configurationService;
        this._hoverService = _hoverService;
        this._storageService = _storageService;
        this._terminalGroupService = _terminalGroupService;
        this._lastHoverHideTime = 0;
        this.placement = 'element';
    }
    get delay() {
        return Date.now() - this._lastHoverHideTime < 200
            ? 0 // show instantly when a hover was recently shown
            : this._configurationService.getValue('workbench.hover.delay');
    }
    showHover(options, focus) {
        const instance = this._terminalGroupService.activeInstance;
        if (!instance) {
            return;
        }
        const hoverInfo = getInstanceHoverInfo(instance, this._storageService);
        return this._hoverService.showInstantHover({
            ...options,
            content: hoverInfo.content,
            actions: hoverInfo.actions
        }, focus);
    }
    onDidHideHover() {
        this._lastHoverHideTime = Date.now();
    }
};
SingleTabHoverDelegate = __decorate([
    __param(0, IConfigurationService),
    __param(1, IHoverService),
    __param(2, IStorageService),
    __param(3, ITerminalGroupService)
], SingleTabHoverDelegate);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxWaWV3LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsL2Jyb3dzZXIvdGVybWluYWxWaWV3LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUM7QUFDMUMsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQztBQUN2RCxPQUFPLEtBQUssZ0JBQWdCLE1BQU0sNENBQTRDLENBQUM7QUFDL0UsT0FBTyxLQUFLLEtBQUssTUFBTSxzQ0FBc0MsQ0FBQztBQUM5RCxPQUFPLEVBQUUsTUFBTSxFQUFXLE1BQU0sb0NBQW9DLENBQUM7QUFDckUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLG1CQUFtQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDbkgsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLGFBQWEsRUFBRSxRQUFRLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUM1RixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDakUsT0FBTyxFQUFFLHFDQUFxQyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFDMUcsT0FBTyxFQUFFLG9CQUFvQixFQUFpQixRQUFRLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUN6SCxPQUFPLEVBQTBCLDZCQUE2QixFQUFFLHFCQUFxQixFQUFxQixnQkFBZ0IsRUFBa0QsTUFBTSxlQUFlLENBQUM7QUFDbE0sT0FBTyxFQUFFLFFBQVEsRUFBb0IsTUFBTSwwQ0FBMEMsQ0FBQztBQUN0RixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUMxRixPQUFPLEVBQWUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUN2RyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUNsRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDOUUsT0FBTyxFQUFTLFlBQVksRUFBRSxNQUFNLEVBQUUsY0FBYyxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDN0csT0FBTyxFQUFFLCtCQUErQixFQUFFLHVCQUF1QixFQUFxQixNQUFNLHVCQUF1QixDQUFDO0FBQ3BILE9BQU8sRUFBdUMsZ0JBQWdCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUN6SCxPQUFPLEVBQUUsY0FBYyxFQUE4QixvQkFBb0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQzVJLE9BQU8sRUFBRSxhQUFhLEVBQUUsWUFBWSxFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFHakcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDN0QsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ25GLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQzNGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBQzlELE9BQU8sRUFBRSx5QkFBeUIsRUFBRSx1QkFBdUIsRUFBRSxNQUFNLGlFQUFpRSxDQUFDO0FBQ3JJLE9BQU8sRUFBRSxpQ0FBaUMsRUFBRSxNQUFNLDJFQUEyRSxDQUFDO0FBQzlILE9BQU8sRUFBRSxhQUFhLEVBQUUsZUFBZSxFQUFFLE9BQU8sRUFBZSxpQkFBaUIsRUFBRSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUM3SSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxhQUFhLEVBQUUsYUFBYSxFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFDakUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDdEUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFHNUQsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0scURBQXFELENBQUM7QUFDN0YsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBRXpELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUM1RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsZUFBZSxFQUFFLDJCQUEyQixFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDeEYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUUxRSxJQUFNLGdCQUFnQixHQUF0QixNQUFNLGdCQUFpQixTQUFRLFFBQVE7SUFHN0MsSUFBSSxrQkFBa0IsS0FBcUMsT0FBTyxJQUFJLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDO0lBYzdGLFlBQ0MsT0FBeUIsRUFDTCxpQkFBcUMsRUFDckMsa0JBQXVELEVBQ25ELHFCQUE2QyxFQUM5QyxxQkFBNkQsRUFDL0QsbUJBQXlELEVBQ3ZELHFCQUE2RCxFQUNsRSxnQkFBbUQsRUFDdEMsNkJBQTZFLEVBQ3JGLHFCQUE2RCxFQUNyRSxZQUEyQixFQUMzQixZQUEyQixFQUNwQixvQkFBMkQsRUFDN0Qsa0JBQXVELEVBQzNELGFBQTZCLEVBQy9CLFlBQTJDLEVBQ2hDLHVCQUFpRSxFQUN6RCwrQkFBaUYsRUFDbkcsYUFBNkMsRUFDckMscUJBQTZEO1FBRXBGLEtBQUssQ0FBQyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsbUJBQW1CLEVBQUUscUJBQXFCLEVBQUUsa0JBQWtCLEVBQUUscUJBQXFCLEVBQUUscUJBQXFCLEVBQUUsYUFBYSxFQUFFLFlBQVksRUFBRSxZQUFZLENBQUMsQ0FBQztRQW5CdEosdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFvQjtRQUVuQywwQkFBcUIsR0FBckIscUJBQXFCLENBQXVCO1FBQzlDLHdCQUFtQixHQUFuQixtQkFBbUIsQ0FBcUI7UUFDdEMsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF1QjtRQUNqRCxxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQWtCO1FBQ3JCLGtDQUE2QixHQUE3Qiw2QkFBNkIsQ0FBK0I7UUFDcEUsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF1QjtRQUc3Qyx5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXNCO1FBQzVDLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBb0I7UUFFNUMsaUJBQVksR0FBWixZQUFZLENBQWM7UUFDZiw0QkFBdUIsR0FBdkIsdUJBQXVCLENBQXlCO1FBQ3hDLG9DQUErQixHQUEvQiwrQkFBK0IsQ0FBaUM7UUFDbEYsa0JBQWEsR0FBYixhQUFhLENBQWU7UUFDcEIsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF1QjtRQWpDN0UsbUJBQWMsR0FBWSxLQUFLLENBQUM7UUFDeEM7OztXQUdHO1FBQ0ssNEJBQXVCLEdBQVksS0FBSyxDQUFDO1FBQ2hDLGlCQUFZLEdBQXlELElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxpQkFBaUIsRUFBRSxDQUFDLENBQUM7UUFJN0cscUJBQWdCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLGVBQWUsRUFBRSxDQUFDLENBQUM7UUFDekQsdUJBQWtCLEdBQXFDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxhQUFhLEVBQUUsQ0FBQyxDQUFDO1FBeUIzRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQywyQkFBMkIsQ0FBQyxHQUFHLEVBQUU7WUFDckUsSUFBSSxDQUFDLDRCQUE0QixDQUFDLElBQUksRUFBRSxDQUFDO1FBQzFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFSixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLEVBQUU7WUFDOUQseURBQXlEO1lBQ3pELCtDQUErQztZQUMvQyxJQUFJLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxJQUFJLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxTQUFTLENBQUMsTUFBTSxJQUFJLENBQUMsRUFBRSxDQUFDO2dCQUNsRixJQUFJLENBQUMsNEJBQTRCLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDMUMsQ0FBQztZQUNELElBQUksQ0FBQyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztnQkFBQyxPQUFPO1lBQUMsQ0FBQztZQUN4QyxxREFBcUQ7WUFDckQsSUFBSSxDQUFDLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO2dCQUMvQixJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7WUFDeEIsQ0FBQztZQUNELCtDQUErQztZQUMvQyxJQUFJLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxTQUFTLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO2dCQUN2RCxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQzFGLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ0osSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQywwQkFBMEIsRUFBRSxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDO1FBQzlILElBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsa0JBQWtCLEVBQUUsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQztRQUN2SCxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyw0QkFBNEIsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDMUgsSUFBSSxDQUFDLFlBQVksR0FBRyxtQkFBbUIsQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1FBQ3BGLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLHlCQUF5QixDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQ2pELElBQUksQ0FBQyxFQUFFLENBQUM7Z0JBQ1AsSUFBSSxDQUFDLG1CQUFtQixFQUFFLFlBQVksRUFBRSxDQUFDO1lBQzFDLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ0osSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDdEUsSUFBSSxJQUFJLENBQUMsaUJBQWlCLElBQUksQ0FBQyxDQUFDLENBQUMsb0JBQW9CLHNIQUFzRCxJQUFJLENBQUMsQ0FBQyxvQkFBb0IsZ0dBQTJDLENBQUMsRUFBRSxDQUFDO2dCQUNuTCxJQUFJLENBQUMsMEJBQTBCLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUM7WUFDekQsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDSixNQUFNLDBCQUEwQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxpQkFBaUIsRUFBRSxDQUFDLENBQUM7UUFDM0UsMEJBQTBCLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxnQ0FBZ0MsQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUM3RixJQUFJLENBQUMsZ0RBQXdDLElBQUksSUFBSSxDQUFDLHlCQUF5QixFQUFFLEVBQUUsQ0FBQztnQkFDbkYsSUFBSSxDQUFDLGlCQUFpQixFQUFFLFNBQVMsQ0FBQyxHQUFHLENBQUMsbUJBQW1CLENBQUMsQ0FBQztnQkFDM0QsMEJBQTBCLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDcEMsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVPLDBCQUEwQixDQUFDLFNBQXNCO1FBQ3hELFNBQVMsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLG1CQUFtQixFQUFFLElBQUksQ0FBQyx5QkFBeUIsRUFBRSxDQUFDLENBQUM7SUFDbkYsQ0FBQztJQUVPLHlCQUF5QjtRQUNoQyxNQUFNLGtCQUFrQixHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxRQUFRLHNIQUFzRCxDQUFDO1FBQ3JILE9BQU8sQ0FBQyxrQkFBa0IsS0FBSyxNQUFNLElBQUksa0JBQWtCLEtBQUssUUFBUSxDQUFDLElBQUksSUFBSSxDQUFDLHFCQUFxQixDQUFDLFFBQVEsZ0dBQTJDLENBQUM7SUFDN0osQ0FBQztJQUVPLG1CQUFtQixDQUFDLHNCQUErQjtRQUMxRCxJQUFJLElBQUksQ0FBQyxhQUFhLEVBQUUsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsMEJBQTBCLElBQUksSUFBSSxDQUFDLGdCQUFnQixDQUFDLGVBQWUsOENBQXNDLEVBQUUsQ0FBQztZQUM3SixNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDO1lBQzNDLElBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxDQUFDO1lBRTNCLElBQUksYUFBYSxHQUFxQyxPQUFPLENBQUM7WUFDOUQsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO2dCQUNyQixhQUFhLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLFFBQVEsMkVBQWlDLENBQUM7Z0JBQ3JGLElBQUksYUFBYSxLQUFLLFFBQVEsRUFBRSxDQUFDO29CQUNoQyxJQUFJLENBQUMscUJBQXFCLENBQUMsU0FBUyxFQUFFLENBQUM7Z0JBQ3hDLENBQUM7WUFDRixDQUFDO1lBRUQsSUFBSSxZQUFZLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLE1BQU0sQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDO1lBQ2xFLHVGQUF1RjtZQUN2Riw2QkFBNkI7WUFDN0IsSUFBSSxzQkFBc0IsRUFBRSxDQUFDO2dCQUM1QixZQUFZLEtBQUssSUFBSSxDQUFDLGdCQUFnQixDQUFDLGtCQUFrQixLQUFLLENBQUMsQ0FBQztZQUNqRSxDQUFDO1lBQ0QsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO2dCQUNuQixPQUFPO1lBQ1IsQ0FBQztZQUNELElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztnQkFDckIsUUFBUSxhQUFhLEVBQUUsQ0FBQztvQkFDdkIsS0FBSyxPQUFPO3dCQUNYLElBQUksQ0FBQyx1QkFBdUIsR0FBRyxJQUFJLENBQUM7d0JBQ3BDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxjQUFjLENBQUMsRUFBRSxRQUFRLEVBQUUsZ0JBQWdCLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLHVCQUF1QixHQUFHLEtBQUssQ0FBQyxDQUFDO3dCQUMvSCxNQUFNO29CQUNQLEtBQUssV0FBVzt3QkFDZixJQUFJLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxrQkFBa0IsS0FBSyxDQUFDLEVBQUUsQ0FBQzs0QkFDcEQsSUFBSSxDQUFDLHFCQUFxQixDQUFDLFNBQVMsRUFBRSxDQUFDO3dCQUN4QyxDQUFDO3dCQUNELE1BQU07Z0JBQ1IsQ0FBQztnQkFDRCxPQUFPO1lBQ1IsQ0FBQztZQUVELElBQUksQ0FBQyxJQUFJLENBQUMsdUJBQXVCLEVBQUUsQ0FBQztnQkFDbkMsSUFBSSxDQUFDLHVCQUF1QixHQUFHLElBQUksQ0FBQztnQkFDcEMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLGNBQWMsQ0FBQyxFQUFFLFFBQVEsRUFBRSxnQkFBZ0IsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsdUJBQXVCLEdBQUcsS0FBSyxDQUFDLENBQUM7WUFDaEksQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRUQsZ0VBQWdFO0lBQzdDLFVBQVUsQ0FBQyxTQUFzQjtRQUNuRCxLQUFLLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBRTVCLElBQUksQ0FBQyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztZQUM3QixJQUFJLENBQUMsMEJBQTBCLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDNUMsQ0FBQztRQUNELElBQUksQ0FBQyxpQkFBaUIsR0FBRyxTQUFTLENBQUM7UUFDbkMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsQ0FBQztRQUM1RCxnQkFBZ0IsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQztRQUMxRCxJQUFJLENBQUMscUJBQXFCLENBQUMsY0FBYyxDQUFDLHNCQUFzQixFQUFFLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1FBRTFGLElBQUksQ0FBQyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsRUFBRSxDQUFDO1lBQy9CLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztRQUN4QixDQUFDO1FBRUQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDckUsSUFBSSxDQUFDLENBQUMsb0JBQW9CLHFFQUE4QixJQUFJLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxtQkFBbUIsQ0FBQyxFQUFFLENBQUM7Z0JBQ3pHLElBQUksQ0FBQyxJQUFJLENBQUMsNkJBQTZCLENBQUMscUJBQXFCLEVBQUUsRUFBRSxDQUFDO29CQUNqRSxNQUFNLE9BQU8sR0FBb0IsQ0FBQzs0QkFDakMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsdUJBQXVCLEVBQUUsaUJBQWlCLENBQUM7NEJBQy9ELEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsV0FBVyxzRUFBK0IsV0FBVyxDQUFDO3lCQUMzRixDQUFDLENBQUM7b0JBQ0gsSUFBSSxDQUFDLG9CQUFvQixDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsd0JBQXdCLEVBQUUsMkdBQTJHLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQztnQkFDbE4sQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ0osSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMseUJBQXlCLENBQUMsS0FBSyxFQUFDLE9BQU8sRUFBQyxFQUFFO1lBQzdELElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQy9CLElBQUksT0FBTyxFQUFFLENBQUM7Z0JBQ2IsSUFBSSxJQUFJLENBQUMsaUJBQWlCLEVBQUUsRUFBRSxDQUFDO29CQUM5QixJQUFJLENBQUMsNEJBQTRCLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQzFDLENBQUM7Z0JBQ0QsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUNoQyw2REFBNkQ7Z0JBQzdELCtDQUErQztnQkFDL0MscURBQXFEO2dCQUNyRCxJQUFJLENBQUMscUJBQXFCLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQzdDLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxLQUFLLE1BQU0sUUFBUSxJQUFJLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxTQUFTLEVBQUUsQ0FBQztvQkFDN0QsUUFBUSxDQUFDLG9CQUFvQixFQUFFLENBQUM7Z0JBQ2pDLENBQUM7WUFDRixDQUFDO1lBQ0QsSUFBSSxDQUFDLHFCQUFxQixDQUFDLGdCQUFnQixFQUFFLENBQUM7UUFDL0MsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNKLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLDBCQUEwQixDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdkcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUMxRixDQUFDO0lBRU8sZUFBZTtRQUN0QixJQUFJLENBQUMsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7WUFDN0IsT0FBTztRQUNSLENBQUM7UUFDRCxJQUFJLENBQUMsbUJBQW1CLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLGtCQUFrQixFQUFFLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUM7SUFDakksQ0FBQztJQUVELGdFQUFnRTtJQUM3QyxVQUFVLENBQUMsTUFBYyxFQUFFLEtBQWE7UUFDMUQsS0FBSyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDaEMsSUFBSSxDQUFDLG1CQUFtQixFQUFFLE1BQU0sQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDakQsQ0FBQztJQUVRLG9CQUFvQixDQUFDLE1BQWMsRUFBRSxPQUFtQztRQUNoRixRQUFRLE1BQU0sQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNuQixvRUFBNEIsQ0FBQyxDQUFDLENBQUM7Z0JBQzlCLHNGQUFzRjtnQkFDdEYsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDO2dCQUNsQixNQUFNLEtBQUssR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO2dCQUNwQyxNQUFNLG9CQUFvQixHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxLQUFNLFNBQVEsTUFBTTtvQkFDOUQ7d0JBQ0MsS0FBSyxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsTUFBTSxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQzt3QkFDN0QsSUFBSSxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDO3dCQUM5QixJQUFJLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUM7b0JBQy9CLENBQUM7b0JBQ1EsS0FBSyxDQUFDLEdBQUc7d0JBQ2pCLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxjQUFjLENBQUM7d0JBQzNELElBQUksUUFBUSxFQUFFLENBQUM7NEJBQ2QsTUFBTSxXQUFXLEdBQUcsTUFBTSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsY0FBYyxDQUFDLEVBQUUsUUFBUSxFQUFFLEVBQUUsY0FBYyxFQUFFLFFBQVEsRUFBRSxFQUFFLENBQUMsQ0FBQzs0QkFDM0csT0FBTyxXQUFXLEVBQUUsY0FBYyxFQUFFLENBQUM7d0JBQ3RDLENBQUM7d0JBQ0QsT0FBTztvQkFDUixDQUFDO2lCQUNELENBQUMsQ0FBQztnQkFDSCxNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksY0FBYyxDQUFDLE1BQU0sRUFBRSxvQkFBb0IsRUFBRSxFQUFFLEdBQUcsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxVQUFVLEVBQUUsSUFBSSxDQUFDLG1CQUFtQixDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUNqSyxJQUFJLENBQUMsa0JBQWtCLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7Z0JBQzlDLE9BQU8sSUFBSSxDQUFDO1lBQ2IsQ0FBQztZQUNELHNGQUFxQyxDQUFDLENBQUMsQ0FBQztnQkFDdkMsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLGNBQWMsQ0FBQyw0QkFBNEIsRUFBRSxNQUFNLENBQUMsQ0FBQztnQkFDN0YsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDO2dCQUM3QyxPQUFPLElBQUksQ0FBQztZQUNiLENBQUM7WUFDRCxvRUFBNEIsQ0FBQyxDQUFDLENBQUM7Z0JBQzlCLElBQUksTUFBTSxZQUFZLGNBQWMsRUFBRSxDQUFDO29CQUN0QyxNQUFNLE9BQU8sR0FBRyx5QkFBeUIsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLFVBQVUsQ0FBQyxFQUFFLGlCQUFpQixFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztvQkFDdkcsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLGNBQWMsQ0FBQywrQkFBK0IsRUFBRSxNQUFNLEVBQUUsT0FBTyxDQUFDLENBQUM7b0JBQ3pHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQztvQkFDN0MsT0FBTyxJQUFJLENBQUM7Z0JBQ2IsQ0FBQztnQkFDRCxNQUFNO1lBQ1AsQ0FBQztZQUNELGdFQUEwQixDQUFDLENBQUMsQ0FBQztnQkFDNUIsSUFBSSxNQUFNLFlBQVksY0FBYyxFQUFFLENBQUM7b0JBQ3RDLE1BQU0sT0FBTyxHQUFHLHdCQUF3QixDQUFDLGdCQUFnQixDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsdUJBQXVCLENBQUMsaUJBQWlCLEVBQUUsSUFBSSxDQUFDLHNCQUFzQixFQUFFLEVBQUUsSUFBSSxDQUFDLHVCQUF1QixDQUFDLG1CQUFtQixFQUFFLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxJQUFJLENBQUMsYUFBYSxFQUFFLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO29CQUNwUSxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssR0FBRyxJQUFJLGlDQUFpQyxDQUFDLE1BQU0sRUFBRSxPQUFPLENBQUMsY0FBYyxFQUFFLE9BQU8sQ0FBQyxtQkFBbUIsRUFBRSxPQUFPLENBQUMsU0FBUyxFQUFFLEVBQUUsYUFBYSxFQUFFLE9BQU8sQ0FBQyxhQUFhLEVBQUUsRUFBRSxJQUFJLENBQUMsbUJBQW1CLEVBQUUsSUFBSSxDQUFDLGtCQUFrQixFQUFFLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxJQUFJLENBQUMsa0JBQWtCLEVBQUUsSUFBSSxDQUFDLGFBQWEsRUFBRSxJQUFJLENBQUMscUJBQXFCLENBQUMsQ0FBQztvQkFDalYsSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxjQUFjLEVBQUUsT0FBTyxDQUFDLG1CQUFtQixDQUFDLENBQUM7b0JBQ3JGLE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUM7Z0JBQ2hDLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUNELE9BQU8sS0FBSyxDQUFDLG9CQUFvQixDQUFDLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQztJQUNwRCxDQUFDO0lBRU8sc0JBQXNCO1FBQzdCLElBQUksa0JBQWtCLENBQUM7UUFDdkIsSUFBSSxDQUFDO1lBQ0osa0JBQWtCLEdBQUcsSUFBSSxDQUFDLHVCQUF1QixDQUFDLHFCQUFxQixFQUFFLENBQUM7UUFDM0UsQ0FBQztRQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDWixrQkFBa0IsR0FBRyxJQUFJLENBQUMsK0JBQStCLENBQUMsa0JBQWtCLENBQUM7UUFDOUUsQ0FBQztRQUNELE9BQU8sa0JBQW1CLENBQUM7SUFDNUIsQ0FBQztJQUVPLG1CQUFtQixDQUFDLE1BQWU7UUFDMUMsT0FBTyxJQUFJLENBQUMsa0JBQWtCLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxFQUFFLFFBQVEsRUFBRSxJQUFJLFNBQVMsQ0FBQztJQUNyRixDQUFDO0lBRU8sbUJBQW1CLENBQUMsUUFBNEI7UUFDdkQsTUFBTSxPQUFPLEdBQUcsd0JBQXdCLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxFQUFFLFFBQVEsRUFBRSxJQUFJLENBQUMsc0JBQXNCLEVBQUUsRUFBRSxJQUFJLENBQUMsdUJBQXVCLENBQUMsbUJBQW1CLEVBQUUsSUFBSSxDQUFDLGdCQUFnQixFQUFFLElBQUksQ0FBQyxhQUFhLEVBQUUsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUM7UUFDOU4sSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxjQUFjLEVBQUUsT0FBTyxDQUFDLG1CQUFtQixDQUFDLENBQUM7SUFDdEYsQ0FBQztJQUVRLEtBQUs7UUFDYixLQUFLLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDZCxJQUFJLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxlQUFlLDhDQUFzQyxFQUFFLENBQUM7WUFDakYsSUFBSSxJQUFJLENBQUMscUJBQXFCLENBQUMsU0FBUyxDQUFDLE1BQU0sS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsdUJBQXVCLEVBQUUsQ0FBQztnQkFDeEYsSUFBSSxDQUFDLHVCQUF1QixHQUFHLElBQUksQ0FBQztnQkFDcEMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLGNBQWMsQ0FBQyxFQUFFLFFBQVEsRUFBRSxnQkFBZ0IsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsdUJBQXVCLEdBQUcsS0FBSyxDQUFDLENBQUM7WUFDaEksQ0FBQztZQUNELElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDM0MsT0FBTztRQUNSLENBQUM7UUFFRCw4R0FBOEc7UUFDOUcsNERBQTREO1FBQzVELE1BQU0scUJBQXFCLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsYUFBYSxDQUFDO1FBQ3ZFLElBQUkscUJBQXFCLEVBQUUsQ0FBQztZQUMzQixvRkFBb0Y7WUFDcEYsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsMEJBQTBCLENBQUMsR0FBRyxFQUFFO2dCQUNwRSx3RkFBd0Y7Z0JBQ3hGLGFBQWE7Z0JBQ2IsSUFBSSxxQkFBcUIsSUFBSSxHQUFHLENBQUMsZUFBZSxDQUFDLHFCQUFxQixDQUFDLEVBQUUsQ0FBQztvQkFDekUsSUFBSSxDQUFDLHFCQUFxQixDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDNUMsQ0FBQztZQUNGLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDO0lBQ0YsQ0FBQztJQUVPLGlCQUFpQjtRQUN4QixPQUFPLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLDBCQUEwQixDQUFDO0lBQzFELENBQUM7SUFFUSxpQkFBaUI7UUFDekIsT0FBTyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUM7SUFDakYsQ0FBQztDQUNELENBQUE7QUE3U1ksZ0JBQWdCO0lBbUIxQixXQUFBLGtCQUFrQixDQUFBO0lBQ2xCLFdBQUEsa0JBQWtCLENBQUE7SUFDbEIsV0FBQSxzQkFBc0IsQ0FBQTtJQUN0QixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsbUJBQW1CLENBQUE7SUFDbkIsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLGdCQUFnQixDQUFBO0lBQ2hCLFdBQUEsNkJBQTZCLENBQUE7SUFDN0IsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixZQUFBLGFBQWEsQ0FBQTtJQUNiLFlBQUEsYUFBYSxDQUFBO0lBQ2IsWUFBQSxvQkFBb0IsQ0FBQTtJQUNwQixZQUFBLGtCQUFrQixDQUFBO0lBQ2xCLFlBQUEsY0FBYyxDQUFBO0lBQ2QsWUFBQSxZQUFZLENBQUE7SUFDWixZQUFBLHVCQUF1QixDQUFBO0lBQ3ZCLFlBQUEsK0JBQStCLENBQUE7SUFDL0IsWUFBQSxhQUFhLENBQUE7SUFDYixZQUFBLHFCQUFxQixDQUFBO0dBckNYLGdCQUFnQixDQTZTNUI7O0FBRUQsSUFBTSw0QkFBNEIsR0FBbEMsTUFBTSw0QkFBNkIsU0FBUSxvQkFBb0I7SUFDOUQsWUFDQyxNQUFlLEVBQ29CLGdCQUFrQyxFQUM3QixxQkFBNEMsRUFDL0Qsa0JBQXVDLEVBQ25DLHNCQUErQztRQUV4RSxLQUFLLENBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSwwQkFBMEIsQ0FBQyxnQkFBZ0IsRUFBRSxxQkFBcUIsQ0FBQyxFQUFFLHFCQUFxQixDQUFDLGdCQUFnQixFQUFFLGtCQUFrQixFQUFFLHNCQUFzQixFQUFFLEVBQUUsU0FBUyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsV0FBVyxFQUFFLGlCQUFpQixDQUFDLEVBQUUsaUJBQWlCLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUxoTyxxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQWtCO1FBQzdCLDBCQUFxQixHQUFyQixxQkFBcUIsQ0FBdUI7UUFLcEYsSUFBSSxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUN2RixJQUFJLENBQUMsU0FBUyxDQUFDLGdCQUFnQixDQUFDLHNCQUFzQixDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ3pGLElBQUksQ0FBQyxTQUFTLENBQUMsZ0JBQWdCLENBQUMseUJBQXlCLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDNUYsSUFBSSxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyx3QkFBd0IsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUMzRixJQUFJLENBQUMsU0FBUyxDQUFDLHFCQUFxQixDQUFDLGlCQUFpQixDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ3pGLElBQUksQ0FBQyxTQUFTLENBQUMsZ0JBQWdCLENBQUMsMEJBQTBCLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDN0YsSUFBSSxDQUFDLFNBQVMsQ0FBQyxzQkFBc0IsQ0FBQyw0QkFBNEIsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUNyRyxJQUFJLENBQUMsU0FBUyxDQUFDLGdCQUFnQixDQUFDLGdDQUFnQyxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQ3BHLENBQUM7SUFFUSxNQUFNLENBQUMsU0FBc0I7UUFDckMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUN4QixTQUFTLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1FBQzNDLFNBQVMsQ0FBQyxLQUFLLENBQUMsV0FBVyxHQUFHLGFBQWEsQ0FBQyxZQUFZLENBQUMsQ0FBQztJQUMzRCxDQUFDO0lBRU8sWUFBWTtRQUNuQixNQUFNLE9BQU8sR0FBRywwQkFBMEIsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsSUFBSSxDQUFDLHFCQUFxQixDQUFDLENBQUM7UUFDOUYsSUFBSSxDQUFDLFVBQVUsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLHFCQUFxQixDQUFDLGdCQUFnQixDQUFDLENBQUM7SUFDdkUsQ0FBQztDQUNELENBQUE7QUE3QkssNEJBQTRCO0lBRy9CLFdBQUEsZ0JBQWdCLENBQUE7SUFDaEIsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLG1CQUFtQixDQUFBO0lBQ25CLFdBQUEsdUJBQXVCLENBQUE7R0FOcEIsNEJBQTRCLENBNkJqQztBQUVELFNBQVMsMEJBQTBCLENBQUMsZUFBaUMsRUFBRSxvQkFBMkM7SUFDakgsSUFBSSxLQUEwQixDQUFDO0lBQy9CLElBQUksZUFBZSxDQUFDLGVBQWUsOENBQXNDLEVBQUUsQ0FBQztRQUMzRSxLQUFLLEdBQUcsb0JBQW9CLENBQUMsY0FBYyxFQUFFLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFO1lBQ3pELE9BQU8sRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLENBQUM7UUFDeEIsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDO1NBQU0sQ0FBQztRQUNQLEtBQUssR0FBRyxDQUFDLEVBQUUsSUFBSSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMseUJBQXlCLEVBQUUsYUFBYSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQzVFLENBQUM7SUFDRCxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxFQUFFLHFDQUFxQyxFQUFFLFVBQVUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO0lBQzlFLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLEVBQUUsMkJBQTJCLEVBQUUsQ0FBQyxDQUFDO0lBQ2xELE9BQU8sS0FBSyxDQUFDO0FBQ2QsQ0FBQztBQUVELElBQU0sK0JBQStCLEdBQXJDLE1BQU0sK0JBQWdDLFNBQVEsdUJBQXVCO0lBTXBFLFlBQ0MsTUFBc0IsRUFDTCxRQUFtQixFQUNoQixpQkFBcUMsRUFDbkMsbUJBQXlDLEVBQzNDLGlCQUFxQyxFQUMxQyxZQUEyQixFQUN4QixnQkFBbUQsRUFDdEMsNEJBQTRFLEVBQ3BGLHFCQUE2RCxFQUMvRCxrQkFBdUMsRUFDM0MsZUFBaUQsRUFDM0MscUJBQTZELEVBQzdELHFCQUE0QztRQUVuRSxLQUFLLENBQUMsTUFBTSxFQUFFO1lBQ2IsU0FBUyxFQUFFLElBQUk7WUFDZixhQUFhLEVBQUUscUJBQXFCLENBQUMsY0FBYyxDQUFDLHNCQUFzQixDQUFDO1NBQzNFLEVBQUUsaUJBQWlCLEVBQUUsbUJBQW1CLEVBQUUsaUJBQWlCLEVBQUUsWUFBWSxFQUFFLGtCQUFrQixFQUFFLHFCQUFxQixDQUFDLENBQUM7UUFoQnRHLGFBQVEsR0FBUixRQUFRLENBQVc7UUFLRCxxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQWtCO1FBQ3JCLGlDQUE0QixHQUE1Qiw0QkFBNEIsQ0FBK0I7UUFDbkUsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF1QjtRQUVsRCxvQkFBZSxHQUFmLGVBQWUsQ0FBaUI7UUFDMUIsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF1QjtRQWRwRSx3QkFBbUIsR0FBa0IsRUFBRSxDQUFDO1FBc0J4RCx1Q0FBdUM7UUFDdkMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUF3RCxLQUFLLENBQUMsR0FBRyxDQUM3RixJQUFJLENBQUMsZ0JBQWdCLENBQUMsZ0NBQWdDLEVBQ3RELElBQUksQ0FBQyxxQkFBcUIsQ0FBQyx5QkFBeUIsRUFDcEQsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsdUJBQXVCLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLEVBQ3pFLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyx3QkFBd0IsRUFDOUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLDZCQUE2QixDQUNuRCxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQ2QsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUNYLElBQUksR0FBRyxJQUFJLEdBQUcsRUFBRSxDQUFDO1lBQ2xCLENBQUM7WUFDRCxJQUFJLENBQUMsRUFBRSxDQUFDO2dCQUNQLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDYixDQUFDO1lBQ0QsT0FBTyxJQUFJLENBQUM7UUFDYixDQUFDLEVBQUUsY0FBYyxDQUFDLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFDM0IsS0FBSyxNQUFNLENBQUMsSUFBSSxNQUFNLEVBQUUsQ0FBQztnQkFDeEIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNyQixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVKLHNCQUFzQjtRQUN0QixJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3ZFLENBQUM7SUFFUSxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQWlCO1FBQ3ZDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxnQkFBZ0IsR0FBRyxZQUFZLENBQUM7UUFDM0QsSUFBSSxLQUFLLENBQUMsTUFBTSxJQUFJLElBQUksQ0FBQyxlQUFlLENBQUMsR0FBRyxFQUFFLENBQUM7WUFDOUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLEVBQUUsUUFBUSxFQUFFLGdCQUFnQixDQUFDLEtBQUssRUFBbUMsQ0FBQyxDQUFDO1FBQ3pJLENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7UUFDekIsQ0FBQztJQUNGLENBQUM7SUFFRCxnRUFBZ0U7SUFDN0MsV0FBVyxDQUFDLENBQXFCO1FBQ25ELDBDQUEwQztRQUMxQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssSUFBSSxDQUFDLHFCQUFxQixDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQzFELE9BQU87UUFDUixDQUFDO1FBRUQsSUFBSSxJQUFJLENBQUMsbUJBQW1CLENBQUMsTUFBTSxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUMsT0FBTyxJQUFJLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUN6RSxpQ0FBaUM7WUFDakMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsU0FBUyxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsRUFBRTtnQkFDckcsSUFBSSxDQUFDLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO29CQUNwQixJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztvQkFDeEIsQ0FBQyxDQUFDLGNBQWMsRUFBRSxDQUFDO2dCQUNwQixDQUFDO1lBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNKLHFCQUFxQjtZQUNyQixJQUFJLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxFQUFFO2dCQUNqRyxJQUFJLENBQUMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7b0JBQ3BCLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxjQUFjLENBQUM7b0JBQzNELElBQUksUUFBUSxFQUFFLENBQUM7d0JBQ2QsSUFBSSxDQUFDLGdCQUFnQixDQUFDLG1CQUFtQixDQUFDLFFBQVEsQ0FBQyxDQUFDO29CQUNyRCxDQUFDO29CQUNELENBQUMsQ0FBQyxjQUFjLEVBQUUsQ0FBQztnQkFDcEIsQ0FBQztZQUNGLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDSixnQkFBZ0I7WUFDaEIsSUFBSSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsU0FBUyxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMsRUFBRTtnQkFDbkcsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLGNBQWMsQ0FBQztnQkFDM0QsSUFBSSxDQUFDLENBQUMsWUFBWSxJQUFJLFFBQVEsRUFBRSxDQUFDO29CQUNoQyxDQUFDLENBQUMsWUFBWSxDQUFDLE9BQU8sb0RBQWtDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUN6RyxDQUFDO1lBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUM7UUFDRCxJQUFJLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNoQixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDO1lBQ3pCLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxjQUFjLENBQUM7WUFDM0QsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO2dCQUNmLEdBQUcsQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO2dCQUNyQixPQUFPO1lBQ1IsQ0FBQztZQUNELEtBQUssQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLENBQUM7WUFDM0MsSUFBSSxVQUFVLEdBQUcsRUFBRSxDQUFDO1lBQ3BCLE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDO1lBQ2xELElBQUksYUFBYSxFQUFFLENBQUM7Z0JBQ25CLE1BQU0sUUFBUSxHQUFHLG1CQUFtQixDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsQ0FBQztnQkFDN0QsSUFBSSxDQUFDLGFBQWEsQ0FBQyxhQUFhLEVBQUUsQ0FBQztnQkFDbkMsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxhQUFhLEVBQUUsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBQ3pFLElBQUksVUFBVSxFQUFFLENBQUM7b0JBQ2hCLFVBQVUsR0FBRyxVQUFVLENBQUMsUUFBUSxFQUFFLENBQUM7Z0JBQ3BDLENBQUM7WUFDRixDQUFDO1lBQ0QsS0FBSyxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsVUFBVSxDQUFDO1lBQy9CLEdBQUcsQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLEdBQUcsb0JBQW9CLENBQUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLGNBQWMsQ0FBQyxpQkFBaUIsRUFBRSxRQUFRLEVBQUUsSUFBSSxDQUFDLDRCQUE0QixDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBRTdRLElBQUksSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO2dCQUN0QixLQUFLLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7Z0JBQ3pDLElBQUksQ0FBQyxXQUFXLEdBQUcsU0FBUyxDQUFDO1lBQzlCLENBQUM7WUFDRCxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDakIsS0FBSyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUNwQyxJQUFJLENBQUMsTUFBTSxHQUFHLFNBQVMsQ0FBQztZQUN6QixDQUFDO1lBQ0QsSUFBSSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQ2pCLEtBQUssQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDcEMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsbUJBQW1CLENBQUMsQ0FBQztnQkFDNUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxTQUFTLENBQUM7WUFDekIsQ0FBQztZQUNELE1BQU0sVUFBVSxHQUFHLGFBQWEsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUMzQyxJQUFJLFVBQVUsRUFBRSxDQUFDO2dCQUNoQixJQUFJLENBQUMsTUFBTSxHQUFHLFVBQVUsQ0FBQztnQkFDekIsS0FBSyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDakMsQ0FBQztZQUNELE1BQU0sVUFBVSxHQUFHLGFBQWEsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxhQUFhLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNwRixJQUFJLFVBQVUsRUFBRSxDQUFDO2dCQUNoQixJQUFJLENBQUMsTUFBTSxHQUFHLFVBQVUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUM5QixLQUFLLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxHQUFHLFVBQVUsQ0FBQyxDQUFDO1lBQ3BDLENBQUM7WUFDRCxJQUFJLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUNuQyxJQUFJLENBQUMsV0FBVyxHQUFHLGFBQWEsQ0FBQztnQkFDakMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQ3ZDLENBQUM7WUFDRCxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7UUFDdEIsQ0FBQztJQUNGLENBQUM7SUFFTyxnQkFBZ0I7UUFDdkIsTUFBTSxZQUFZLEdBQUcsSUFBSSwyQkFBMkIsRUFBRSxDQUFDO1FBQ3ZELElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxlQUFlLENBQUM7WUFDeEMsWUFBWTtZQUNaLFNBQVMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsT0FBUTtZQUM5QixVQUFVLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLFFBQVE7WUFDL0IsaUVBQWlFO1lBQ2pFLGlCQUFpQixFQUFFLEdBQUcsRUFBRTtnQkFDdkIsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLGNBQWMsQ0FBQztnQkFDM0QsT0FBTyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxlQUFlLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQ3hELENBQUM7WUFDRCxNQUFNLEVBQUUsR0FBRyxFQUFFLENBQUMsWUFBWSxDQUFDLE9BQU8sRUFBRTtTQUNwQyxDQUFDLENBQUM7SUFDSixDQUFDO0NBQ0QsQ0FBQTtBQS9KSywrQkFBK0I7SUFTbEMsV0FBQSxrQkFBa0IsQ0FBQTtJQUNsQixXQUFBLG9CQUFvQixDQUFBO0lBQ3BCLFdBQUEsa0JBQWtCLENBQUE7SUFDbEIsV0FBQSxhQUFhLENBQUE7SUFDYixXQUFBLGdCQUFnQixDQUFBO0lBQ2hCLFdBQUEsNkJBQTZCLENBQUE7SUFDN0IsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLG1CQUFtQixDQUFBO0lBQ25CLFlBQUEsZUFBZSxDQUFBO0lBQ2YsWUFBQSxxQkFBcUIsQ0FBQTtJQUNyQixZQUFBLHFCQUFxQixDQUFBO0dBbkJsQiwrQkFBK0IsQ0ErSnBDO0FBRUQsU0FBUyxpQkFBaUIsQ0FBQyxRQUEwQixFQUFFLFFBQXVDLEVBQUUsU0FBaUIsRUFBRSxJQUFnQjtJQUNsSSw4RkFBOEY7SUFDOUYsV0FBVztJQUNYLElBQUksQ0FBQyxRQUFRLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDbEMsT0FBTyxFQUFFLENBQUM7SUFDWCxDQUFDO0lBQ0QsTUFBTSxNQUFNLEdBQUcsU0FBUyxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLCtCQUErQixDQUFDLENBQUMsY0FBYyxFQUFFLENBQUMsRUFBRSxDQUFDO0lBQzNJLE1BQU0sS0FBSyxHQUFHLEtBQUssSUFBSSxFQUFFLEVBQUUsSUFBSSxNQUFNLEtBQUssaUJBQWlCLENBQUMsUUFBUSxFQUFFLFNBQVMsQ0FBQyxFQUFFLENBQUM7SUFFbkYsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUM7SUFDbEQsSUFBSSxDQUFDLGFBQWEsRUFBRSxJQUFJLEVBQUUsQ0FBQztRQUMxQixPQUFPLEtBQUssQ0FBQztJQUNkLENBQUM7SUFDRCxPQUFPLEdBQUcsS0FBSyxNQUFNLGFBQWEsQ0FBQyxJQUFJLENBQUMsRUFBRSxHQUFHLENBQUM7QUFDL0MsQ0FBQztBQUVELFNBQVMsaUJBQWlCLENBQUMsUUFBdUMsRUFBRSxTQUFpQjtJQUNwRixJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDZixPQUFPLEVBQUUsQ0FBQztJQUNYLENBQUM7SUFDRCxPQUFPLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxRQUFRLENBQUMsS0FBSyxJQUFJLFNBQVMsSUFBSSxRQUFRLENBQUMsV0FBVyxFQUFFLENBQUM7QUFDMUcsQ0FBQztBQUVELElBQU0sc0JBQXNCLEdBQTVCLE1BQU0sc0JBQXVCLFNBQVEsUUFBUTtJQUU1QyxZQUNDLFNBQXNCLEVBQ1UsYUFBNEIsRUFDekIsZ0JBQWtDLEVBQzdCLHFCQUE0QztRQUVwRixLQUFLLENBQUMsYUFBYSxDQUFDLENBQUM7UUFKVyxrQkFBYSxHQUFiLGFBQWEsQ0FBZTtRQUN6QixxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQWtCO1FBQzdCLDBCQUFxQixHQUFyQixxQkFBcUIsQ0FBdUI7UUFHcEYsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUM7UUFDMUIsSUFBSSxDQUFDLGFBQWEsR0FBRyxnQkFBZ0IsQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNsRSxJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNoRSxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7SUFDckIsQ0FBQztJQUVPLGtCQUFrQjtRQUN6QixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyx1QkFBdUIsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3pGLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLG9CQUFvQixDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDdEYsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMsaUJBQWlCLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsQ0FBQztJQUN6RixDQUFDO0lBRVEsWUFBWTtRQUNwQixLQUFLLENBQUMsWUFBWSxFQUFFLENBQUM7UUFDckIsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxhQUFhLEVBQUUsQ0FBQztRQUV0RCxrREFBa0Q7UUFDbEQsSUFBSSxHQUFHLEdBQUcsRUFBRSxDQUFDO1FBRWIsWUFBWTtRQUNaLEtBQUssTUFBTSxRQUFRLElBQUksSUFBSSxDQUFDLGdCQUFnQixDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ3hELE1BQU0sSUFBSSxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUM7WUFDM0IsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUNYLFNBQVM7WUFDVixDQUFDO1lBQ0QsSUFBSSxHQUFHLEdBQUcsU0FBUyxDQUFDO1lBQ3BCLElBQUksSUFBSSxZQUFZLEdBQUcsRUFBRSxDQUFDO2dCQUN6QixHQUFHLEdBQUcsSUFBSSxDQUFDO1lBQ1osQ0FBQztpQkFBTSxJQUFJLElBQUksWUFBWSxNQUFNLElBQUksT0FBTyxJQUFJLElBQUksSUFBSSxNQUFNLElBQUksSUFBSSxFQUFFLENBQUM7Z0JBQ3hFLEdBQUcsR0FBRyxVQUFVLENBQUMsSUFBSSxLQUFLLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUM7WUFDdEUsQ0FBQztZQUNELE1BQU0sV0FBVyxHQUFHLGFBQWEsQ0FBQyxRQUFRLEVBQUUsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzdELElBQUksR0FBRyxZQUFZLEdBQUcsSUFBSSxXQUFXLElBQUksV0FBVyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDakUsR0FBRyxJQUFJLENBQ04sc0JBQXNCLFdBQVcsQ0FBQyxDQUFDLENBQUMsd0lBQXdJO29CQUM1SyxzQkFBc0IsS0FBSyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUM3QyxDQUFDO1lBQ0gsQ0FBQztRQUNGLENBQUM7UUFFRCxhQUFhO1FBQ2IsS0FBSyxNQUFNLFFBQVEsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDeEQsTUFBTSxVQUFVLEdBQUcsYUFBYSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQzNDLElBQUksQ0FBQyxVQUFVLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JBQ3BDLFNBQVM7WUFDVixDQUFDO1lBQ0QsTUFBTSxLQUFLLEdBQUcsVUFBVSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDbEQsSUFBSSxLQUFLLEVBQUUsQ0FBQztnQkFDWCxrR0FBa0c7Z0JBQ2xHLEdBQUcsSUFBSSxDQUNOLHNCQUFzQixVQUFVLHNIQUFzSDtvQkFDdEosWUFBWSxLQUFLLGdCQUFnQixDQUNqQyxDQUFDO1lBQ0gsQ0FBQztRQUNGLENBQUM7UUFFRCxJQUFJLENBQUMsYUFBYSxDQUFDLFdBQVcsR0FBRyxHQUFHLENBQUM7SUFDdEMsQ0FBQztDQUNELENBQUE7QUFuRUssc0JBQXNCO0lBSXpCLFdBQUEsYUFBYSxDQUFBO0lBQ2IsV0FBQSxnQkFBZ0IsQ0FBQTtJQUNoQixXQUFBLHFCQUFxQixDQUFBO0dBTmxCLHNCQUFzQixDQW1FM0I7QUFFRCxJQUFNLHNCQUFzQixHQUE1QixNQUFNLHNCQUFzQjtJQUszQixZQUN3QixxQkFBNkQsRUFDckUsYUFBNkMsRUFDM0MsZUFBaUQsRUFDM0MscUJBQTZEO1FBSDVDLDBCQUFxQixHQUFyQixxQkFBcUIsQ0FBdUI7UUFDcEQsa0JBQWEsR0FBYixhQUFhLENBQWU7UUFDMUIsb0JBQWUsR0FBZixlQUFlLENBQWlCO1FBQzFCLDBCQUFxQixHQUFyQixxQkFBcUIsQ0FBdUI7UUFSN0UsdUJBQWtCLEdBQVcsQ0FBQyxDQUFDO1FBRTlCLGNBQVMsR0FBRyxTQUFTLENBQUM7SUFRL0IsQ0FBQztJQUVELElBQUksS0FBSztRQUNSLE9BQU8sSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxHQUFHO1lBQ2hELENBQUMsQ0FBQyxDQUFDLENBQUUsaURBQWlEO1lBQ3RELENBQUMsQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMsUUFBUSxDQUFTLHVCQUF1QixDQUFDLENBQUM7SUFDekUsQ0FBQztJQUVELFNBQVMsQ0FBQyxPQUE4QixFQUFFLEtBQWU7UUFDeEQsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLGNBQWMsQ0FBQztRQUMzRCxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDZixPQUFPO1FBQ1IsQ0FBQztRQUNELE1BQU0sU0FBUyxHQUFHLG9CQUFvQixDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUM7UUFDdkUsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFDLGdCQUFnQixDQUFDO1lBQzFDLEdBQUcsT0FBTztZQUNWLE9BQU8sRUFBRSxTQUFTLENBQUMsT0FBTztZQUMxQixPQUFPLEVBQUUsU0FBUyxDQUFDLE9BQU87U0FDMUIsRUFBRSxLQUFLLENBQUMsQ0FBQztJQUNYLENBQUM7SUFFRCxjQUFjO1FBQ2IsSUFBSSxDQUFDLGtCQUFrQixHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztJQUN0QyxDQUFDO0NBQ0QsQ0FBQTtBQW5DSyxzQkFBc0I7SUFNekIsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLGFBQWEsQ0FBQTtJQUNiLFdBQUEsZUFBZSxDQUFBO0lBQ2YsV0FBQSxxQkFBcUIsQ0FBQTtHQVRsQixzQkFBc0IsQ0FtQzNCIn0=