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
import { Separator } from '../../../../base/common/actions.js';
import { IMenuService, SubmenuItemAction, MenuItemAction } from '../../../../platform/actions/common/actions.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IWorkspacesService } from '../../../../platform/workspaces/common/workspaces.js';
import { isMacintosh } from '../../../../base/common/platform.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { INativeWorkbenchEnvironmentService } from '../../../services/environment/electron-sandbox/environmentService.js';
import { IAccessibilityService } from '../../../../platform/accessibility/common/accessibility.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { IUpdateService } from '../../../../platform/update/common/update.js';
import { MenubarControl } from '../../../browser/parts/titlebar/menubarControl.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IMenubarService } from '../../../../platform/menubar/electron-sandbox/menubar.js';
import { INativeHostService } from '../../../../platform/native/common/native.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { IPreferencesService } from '../../../services/preferences/common/preferences.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { OpenRecentAction } from '../../../browser/actions/windowActions.js';
import { isICommandActionToggleInfo } from '../../../../platform/action/common/action.js';
import { getFlatContextMenuActions } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
let NativeMenubarControl = class NativeMenubarControl extends MenubarControl {
    constructor(menuService, workspacesService, contextKeyService, keybindingService, configurationService, labelService, updateService, storageService, notificationService, preferencesService, environmentService, accessibilityService, menubarService, hostService, nativeHostService, commandService) {
        super(menuService, workspacesService, contextKeyService, keybindingService, configurationService, labelService, updateService, storageService, notificationService, preferencesService, environmentService, accessibilityService, hostService, commandService);
        this.menubarService = menubarService;
        this.nativeHostService = nativeHostService;
        (async () => {
            this.recentlyOpened = await this.workspacesService.getRecentlyOpened();
            this.doUpdateMenubar();
        })();
        this.registerListeners();
    }
    setupMainMenu() {
        super.setupMainMenu();
        for (const topLevelMenuName of Object.keys(this.topLevelTitles)) {
            const menu = this.menus[topLevelMenuName];
            if (menu) {
                this.mainMenuDisposables.add(menu.onDidChange(() => this.updateMenubar()));
            }
        }
    }
    doUpdateMenubar() {
        // Since the native menubar is shared between windows (main process)
        // only allow the focused window to update the menubar
        if (!this.hostService.hasFocus) {
            return;
        }
        // Send menus to main process to be rendered by Electron
        const menubarData = { menus: {}, keybindings: {} };
        if (this.getMenubarMenus(menubarData)) {
            this.menubarService.updateMenubar(this.nativeHostService.windowId, menubarData);
        }
    }
    getMenubarMenus(menubarData) {
        if (!menubarData) {
            return false;
        }
        menubarData.keybindings = this.getAdditionalKeybindings();
        for (const topLevelMenuName of Object.keys(this.topLevelTitles)) {
            const menu = this.menus[topLevelMenuName];
            if (menu) {
                const menubarMenu = { items: [] };
                const menuActions = getFlatContextMenuActions(menu.getActions({ shouldForwardArgs: true }));
                this.populateMenuItems(menuActions, menubarMenu, menubarData.keybindings);
                if (menubarMenu.items.length === 0) {
                    return false; // Menus are incomplete
                }
                menubarData.menus[topLevelMenuName] = menubarMenu;
            }
        }
        return true;
    }
    populateMenuItems(menuActions, menuToPopulate, keybindings) {
        for (const menuItem of menuActions) {
            if (menuItem instanceof Separator) {
                menuToPopulate.items.push({ id: 'vscode.menubar.separator' });
            }
            else if (menuItem instanceof MenuItemAction || menuItem instanceof SubmenuItemAction) {
                // use mnemonicTitle whenever possible
                const title = typeof menuItem.item.title === 'string'
                    ? menuItem.item.title
                    : menuItem.item.title.mnemonicTitle ?? menuItem.item.title.value;
                if (menuItem instanceof SubmenuItemAction) {
                    const submenu = { items: [] };
                    this.populateMenuItems(menuItem.actions, submenu, keybindings);
                    if (submenu.items.length > 0) {
                        const menubarSubmenuItem = {
                            id: menuItem.id,
                            label: title,
                            submenu
                        };
                        menuToPopulate.items.push(menubarSubmenuItem);
                    }
                }
                else {
                    if (menuItem.id === OpenRecentAction.ID) {
                        const actions = this.getOpenRecentActions().map(this.transformOpenRecentAction);
                        menuToPopulate.items.push(...actions);
                    }
                    const menubarMenuItem = {
                        id: menuItem.id,
                        label: title
                    };
                    if (isICommandActionToggleInfo(menuItem.item.toggled)) {
                        menubarMenuItem.label = menuItem.item.toggled.mnemonicTitle ?? menuItem.item.toggled.title ?? title;
                    }
                    if (menuItem.checked) {
                        menubarMenuItem.checked = true;
                    }
                    if (!menuItem.enabled) {
                        menubarMenuItem.enabled = false;
                    }
                    keybindings[menuItem.id] = this.getMenubarKeybinding(menuItem.id);
                    menuToPopulate.items.push(menubarMenuItem);
                }
            }
        }
    }
    transformOpenRecentAction(action) {
        if (action instanceof Separator) {
            return { id: 'vscode.menubar.separator' };
        }
        return {
            id: action.id,
            uri: action.uri,
            remoteAuthority: action.remoteAuthority,
            enabled: action.enabled,
            label: action.label
        };
    }
    getAdditionalKeybindings() {
        const keybindings = {};
        if (isMacintosh) {
            const keybinding = this.getMenubarKeybinding('workbench.action.quit');
            if (keybinding) {
                keybindings['workbench.action.quit'] = keybinding;
            }
        }
        return keybindings;
    }
    getMenubarKeybinding(id) {
        const binding = this.keybindingService.lookupKeybinding(id);
        if (!binding) {
            return undefined;
        }
        // first try to resolve a native accelerator
        const electronAccelerator = binding.getElectronAccelerator();
        if (electronAccelerator) {
            return { label: electronAccelerator, userSettingsLabel: binding.getUserSettingsLabel() ?? undefined };
        }
        // we need this fallback to support keybindings that cannot show in electron menus (e.g. chords)
        const acceleratorLabel = binding.getLabel();
        if (acceleratorLabel) {
            return { label: acceleratorLabel, isNative: false, userSettingsLabel: binding.getUserSettingsLabel() ?? undefined };
        }
        return undefined;
    }
};
NativeMenubarControl = __decorate([
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
    __param(10, INativeWorkbenchEnvironmentService),
    __param(11, IAccessibilityService),
    __param(12, IMenubarService),
    __param(13, IHostService),
    __param(14, INativeHostService),
    __param(15, ICommandService)
], NativeMenubarControl);
export { NativeMenubarControl };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVudWJhckNvbnRyb2wuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2VsZWN0cm9uLXNhbmRib3gvcGFydHMvdGl0bGViYXIvbWVudWJhckNvbnRyb2wudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFXLFNBQVMsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxZQUFZLEVBQUUsaUJBQWlCLEVBQUUsY0FBYyxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDakgsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDMUYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDMUYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxrQ0FBa0MsRUFBRSxNQUFNLHNFQUFzRSxDQUFDO0FBQzFILE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUMzRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDOUUsT0FBTyxFQUFxQixjQUFjLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUN0RyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFFakYsT0FBTyxFQUFFLGVB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