/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize, localize2 } from '../../../nls.js';
import { MenuId, MenuRegistry, registerAction2, Action2 } from '../../../platform/actions/common/actions.js';
import { Categories } from '../../../platform/action/common/actionCommonCategories.js';
import { IConfigurationService } from '../../../platform/configuration/common/configuration.js';
import { IWorkbenchLayoutService, positionToString } from '../../services/layout/browser/layoutService.js';
import { IInstantiationService } from '../../../platform/instantiation/common/instantiation.js';
import { KeyChord } from '../../../base/common/keyCodes.js';
import { isWindows, isLinux, isWeb, isMacintosh, isNative } from '../../../base/common/platform.js';
import { IsMacNativeContext } from '../../../platform/contextkey/common/contextkeys.js';
import { KeybindingsRegistry } from '../../../platform/keybinding/common/keybindingsRegistry.js';
import { ContextKeyExpr, IContextKeyService } from '../../../platform/contextkey/common/contextkey.js';
import { IViewDescriptorService, ViewContainerLocationToString } from '../../common/views.js';
import { IViewsService } from '../../services/views/common/viewsService.js';
import { IQuickInputService } from '../../../platform/quickinput/common/quickInput.js';
import { IDialogService } from '../../../platform/dialogs/common/dialogs.js';
import { IPaneCompositePartService } from '../../services/panecomposite/browser/panecomposite.js';
import { ToggleAuxiliaryBarAction } from '../parts/auxiliarybar/auxiliaryBarActions.js';
import { TogglePanelAction } from '../parts/panel/panelActions.js';
import { ICommandService } from '../../../platform/commands/common/commands.js';
import { AuxiliaryBarVisibleContext, PanelAlignmentContext, PanelVisibleContext, SideBarVisibleContext, FocusedViewContext, InEditorZenModeContext, IsMainEditorCenteredLayoutContext, MainEditorAreaVisibleContext, IsMainWindowFullscreenContext, PanelPositionContext, IsAuxiliaryWindowFocusedContext, TitleBarStyleContext } from '../../common/contextkeys.js';
import { Codicon } from '../../../base/common/codicons.js';
import { ThemeIcon } from '../../../base/common/themables.js';
import { DisposableStore } from '../../../base/common/lifecycle.js';
import { registerIcon } from '../../../platform/theme/common/iconRegistry.js';
import { mainWindow } from '../../../base/browser/window.js';
import { IKeybindingService } from '../../../platform/keybinding/common/keybinding.js';
import { IPreferencesService } from '../../services/preferences/common/preferences.js';
import { QuickInputAlignmentContextKey } from '../../../platform/quickinput/browser/quickInput.js';
import { IEditorGroupsService } from '../../services/editor/common/editorGroupsService.js';
// Register Icons
const menubarIcon = registerIcon('menuBar', Codicon.layoutMenubar, localize('menuBarIcon', "Represents the menu bar"));
const activityBarLeftIcon = registerIcon('activity-bar-left', Codicon.layoutActivitybarLeft, localize('activityBarLeft', "Represents the activity bar in the left position"));
const activityBarRightIcon = registerIcon('activity-bar-right', Codicon.layoutActivitybarRight, localize('activityBarRight', "Represents the activity bar in the right position"));
const panelLeftIcon = registerIcon('panel-left', Codicon.layoutSidebarLeft, localize('panelLeft', "Represents a side bar in the left position"));
const panelLeftOffIcon = registerIcon('panel-left-off', Codicon.layoutSidebarLeftOff, localize('panelLeftOff', "Represents a side bar in the left position toggled off"));
const panelRightIcon = registerIcon('panel-right', Codicon.layoutSidebarRight, localize('panelRight', "Represents side bar in the right position"));
const panelRightOffIcon = registerIcon('panel-right-off', Codicon.layoutSidebarRightOff, localize('panelRightOff', "Represents side bar in the right position toggled off"));
const panelIcon = registerIcon('panel-bottom', Codicon.layoutPanel, localize('panelBottom', "Represents the bottom panel"));
const statusBarIcon = registerIcon('statusBar', Codicon.layoutStatusbar, localize('statusBarIcon', "Represents the status bar"));
const panelAlignmentLeftIcon = registerIcon('panel-align-left', Codicon.layoutPanelLeft, localize('panelBottomLeft', "Represents the bottom panel alignment set to the left"));
const panelAlignmentRightIcon = registerIcon('panel-align-right', Codicon.layoutPanelRight, localize('panelBottomRight', "Represents the bottom panel alignment set to the right"));
const panelAlignmentCenterIcon = registerIcon('panel-align-center', Codicon.layoutPanelCenter, localize('panelBottomCenter', "Represents the bottom panel alignment set to the center"));
const panelAlignmentJustifyIcon = registerIcon('panel-align-justify', Codicon.layoutPanelJustify, localize('panelBottomJustify', "Represents the bottom panel alignment set to justified"));
const quickInputAlignmentTopIcon = registerIcon('quickInputAlignmentTop', Codicon.arrowUp, localize('quickInputAlignmentTop', "Represents quick input alignment set to the top"));
const quickInputAlignmentCenterIcon = registerIcon('quickInputAlignmentCenter', Codicon.circle, localize('quickInputAlignmentCenter', "Represents quick input alignment set to the center"));
const fullscreenIcon = registerIcon('fullscreen', Codicon.screenFull, localize('fullScreenIcon', "Represents full screen"));
const centerLayoutIcon = registerIcon('centerLayoutIcon', Codicon.layoutCentered, localize('centerLayoutIcon', "Represents centered layout mode"));
const zenModeIcon = registerIcon('zenMode', Codicon.target, localize('zenModeIcon', "Represents zen mode"));
export const ToggleActivityBarVisibilityActionId = 'workbench.action.toggleActivityBarVisibility';
// --- Toggle Centered Layout
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.toggleCenteredLayout',
            title: {
                ...localize2('toggleCenteredLayout', "Toggle Centered Layout"),
                mnemonicTitle: localize({ key: 'miToggleCenteredLayout', comment: ['&& denotes a mnemonic'] }, "&&Centered Layout"),
            },
            precondition: IsAuxiliaryWindowFocusedContext.toNegated(),
            category: Categories.View,
            f1: true,
            toggled: IsMainEditorCenteredLayoutContext,
            menu: [{
                    id: MenuId.MenubarAppearanceMenu,
                    group: '1_toggle_view',
                    order: 3
                }]
        });
    }
    run(accessor) {
        const layoutService = accessor.get(IWorkbenchLayoutService);
        const editorGroupService = accessor.get(IEditorGroupsService);
        layoutService.centerMainEditorLayout(!layoutService.isMainEditorLayoutCentered());
        editorGroupService.activeGroup.focus();
    }
});
// --- Set Sidebar Position
const sidebarPositionConfigurationKey = 'workbench.sideBar.location';
class MoveSidebarPositionAction extends Action2 {
    constructor(id, title, position) {
        super({
            id,
            title,
            f1: false
        });
        this.position = position;
    }
    async run(accessor) {
        const layoutService = accessor.get(IWorkbenchLayoutService);
        const configurationService = accessor.get(IConfigurationService);
        const position = layoutService.getSideBarPosition();
        if (position !== this.position) {
            return configurationService.updateValue(sidebarPositionConfigurationKey, positionToString(this.position));
        }
    }
}
class MoveSidebarRightAction extends MoveSidebarPositionAction {
    static { this.ID = 'workbench.action.moveSideBarRight'; }
    constructor() {
        super(MoveSidebarRightAction.ID, localize2('moveSidebarRight', "Move Primary Side Bar Right"), 1 /* Position.RIGHT */);
    }
}
class MoveSidebarLeftAction extends MoveSidebarPositionAction {
    static { this.ID = 'workbench.action.moveSideBarLeft'; }
    constructor() {
        super(MoveSidebarLeftAction.ID, localize2('moveSidebarLeft', "Move Primary Side Bar Left"), 0 /* Position.LEFT */);
    }
}
registerAction2(MoveSidebarRightAction);
registerAction2(MoveSidebarLeftAction);
// --- Toggle Sidebar Position
export class ToggleSidebarPositionAction extends Action2 {
    static { this.ID = 'workbench.action.toggleSidebarPosition'; }
    static { this.LABEL = localize('toggleSidebarPosition', "Toggle Primary Side Bar Position"); }
    static getLabel(layoutService) {
        return layoutService.getSideBarPosition() === 0 /* Position.LEFT */ ? localize('moveSidebarRight', "Move Primary Side Bar Right") : localize('moveSidebarLeft', "Move Primary Side Bar Left");
    }
    constructor() {
        super({
            id: ToggleSidebarPositionAction.ID,
            title: localize2('toggleSidebarPosition', "Toggle Primary Side Bar Position"),
            category: Categories.View,
            f1: true
        });
    }
    run(accessor) {
        const layoutService = accessor.get(IWorkbenchLayoutService);
        const configurationService = accessor.get(IConfigurationService);
        const position = layoutService.getSideBarPosition();
        const newPositionValue = (position === 0 /* Position.LEFT */) ? 'right' : 'left';
        return configurationService.updateValue(sidebarPositionConfigurationKey, newPositionValue);
    }
}
registerAction2(ToggleSidebarPositionAction);
const configureLayoutIcon = registerIcon('configure-layout-icon', Codicon.layout, localize('cofigureLayoutIcon', 'Icon represents workbench layout configuration.'));
MenuRegistry.appendMenuItem(MenuId.LayoutControlMenu, {
    submenu: MenuId.LayoutControlMenuSubmenu,
    title: localize('configureLayout', "Configure Layout"),
    icon: configureLayoutIcon,
    group: '1_workbench_layout',
    when: ContextKeyExpr.equals('config.workbench.layoutControl.type', 'menu')
});
MenuRegistry.appendMenuItems([{
        id: MenuId.ViewContainerTitleContext,
        item: {
            group: '3_workbench_layout_move',
            command: {
                id: ToggleSidebarPositionAction.ID,
                title: localize('move side bar right', "Move Primary Side Bar Right")
            },
            when: ContextKeyExpr.and(ContextKeyExpr.notEquals('config.workbench.sideBar.location', 'right'), ContextKeyExpr.equals('viewContainerLocation', ViewContainerLocationToString(0 /* ViewContainerLocation.Sidebar */))),
            order: 1
        }
    }, {
        id: MenuId.ViewContainerTitleContext,
        item: {
            group: '3_workbench_layout_move',
            command: {
                id: ToggleSidebarPositionAction.ID,
                title: localize('move sidebar left', "Move Primary Side Bar Left")
            },
            when: ContextKeyExpr.and(ContextKeyExpr.equals('config.workbench.sideBar.location', 'right'), ContextKeyExpr.equals('viewContainerLocation', ViewContainerLocationToString(0 /* ViewContainerLocation.Sidebar */))),
            order: 1
        }
    }, {
        id: MenuId.ViewContainerTitleContext,
        item: {
            group: '3_workbench_layout_move',
            command: {
                id: ToggleSidebarPositionAction.ID,
                title: localize('move second sidebar left', "Move Void Side Bar Left")
            },
            when: ContextKeyExpr.and(ContextKeyExpr.notEquals('config.workbench.sideBar.location', 'right'), ContextKeyExpr.equals('viewContainerLocation', ViewContainerLocationToString(2 /* ViewContainerLocation.AuxiliaryBar */))),
            order: 1
        }
    }, {
        id: MenuId.ViewContainerTitleContext,
        item: {
            group: '3_workbench_layout_move',
            command: {
                id: ToggleSidebarPositionAction.ID,
                title: localize('move second sidebar right', "Move Void Side Bar Right")
            },
            when: ContextKeyExpr.and(ContextKeyExpr.equals('config.workbench.sideBar.location', 'right'), ContextKeyExpr.equals('viewContainerLocation', ViewContainerLocationToString(2 /* ViewContainerLocation.AuxiliaryBar */))),
            order: 1
        }
    }]);
MenuRegistry.appendMenuItem(MenuId.MenubarAppearanceMenu, {
    group: '3_workbench_layout_move',
    command: {
        id: ToggleSidebarPositionAction.ID,
        title: localize({ key: 'miMoveSidebarRight', comment: ['&& denotes a mnemonic'] }, "&&Move Primary Side Bar Right")
    },
    when: ContextKeyExpr.notEquals('config.workbench.sideBar.location', 'right'),
    order: 2
});
MenuRegistry.appendMenuItem(MenuId.MenubarAppearanceMenu, {
    group: '3_workbench_layout_move',
    command: {
        id: ToggleSidebarPositionAction.ID,
        title: localize({ key: 'miMoveSidebarLeft', comment: ['&& denotes a mnemonic'] }, "&&Move Primary Side Bar Left")
    },
    when: ContextKeyExpr.equals('config.workbench.sideBar.location', 'right'),
    order: 2
});
// --- Toggle Editor Visibility
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.toggleEditorVisibility',
            title: {
                ...localize2('toggleEditor', "Toggle Editor Area Visibility"),
                mnemonicTitle: localize({ key: 'miShowEditorArea', comment: ['&& denotes a mnemonic'] }, "Show &&Editor Area"),
            },
            category: Categories.View,
            f1: true,
            toggled: MainEditorAreaVisibleContext,
            // the workbench grid currently prevents us from supporting panel maximization with non-center panel alignment
            precondition: ContextKeyExpr.and(IsAuxiliaryWindowFocusedContext.toNegated(), ContextKeyExpr.or(PanelAlignmentContext.isEqualTo('center'), PanelPositionContext.notEqualsTo('bottom')))
        });
    }
    run(accessor) {
        accessor.get(IWorkbenchLayoutService).toggleMaximizedPanel();
    }
});
MenuRegistry.appendMenuItem(MenuId.MenubarViewMenu, {
    group: '2_appearance',
    title: localize({ key: 'miAppearance', comment: ['&& denotes a mnemonic'] }, "&&Appearance"),
    submenu: MenuId.MenubarAppearanceMenu,
    order: 1
});
// Toggle Sidebar Visibility
export class ToggleSidebarVisibilityAction extends Action2 {
    static { this.ID = 'workbench.action.toggleSidebarVisibility'; }
    static { this.LABEL = localize('compositePart.hideSideBarLabel', "Hide Primary Side Bar"); }
    constructor() {
        super({
            id: ToggleSidebarVisibilityAction.ID,
            title: localize2('toggleSidebar', 'Toggle Primary Side Bar Visibility'),
            toggled: {
                condition: SideBarVisibleContext,
                title: localize('primary sidebar', "Primary Side Bar"),
                mnemonicTitle: localize({ key: 'primary sidebar mnemonic', comment: ['&& denotes a mnemonic'] }, "&&Primary Side Bar"),
            },
            metadata: {
                description: localize('openAndCloseSidebar', 'Open/Show and Close/Hide Sidebar'),
            },
            category: Categories.View,
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 32 /* KeyCode.KeyB */
            },
            menu: [
                {
                    id: MenuId.LayoutControlMenuSubmenu,
                    group: '0_workbench_layout',
                    order: 0
                },
                {
                    id: MenuId.MenubarAppearanceMenu,
                    group: '2_workbench_layout',
                    order: 1
                }
            ]
        });
    }
    run(accessor) {
        const layoutService = accessor.get(IWorkbenchLayoutService);
        layoutService.setPartHidden(layoutService.isVisible("workbench.parts.sidebar" /* Parts.SIDEBAR_PART */), "workbench.parts.sidebar" /* Parts.SIDEBAR_PART */);
    }
}
registerAction2(ToggleSidebarVisibilityAction);
MenuRegistry.appendMenuItems([
    {
        id: MenuId.ViewContainerTitleContext,
        item: {
            group: '3_workbench_layout_move',
            command: {
                id: ToggleSidebarVisibilityAction.ID,
                title: localize('compositePart.hideSideBarLabel', "Hide Primary Side Bar"),
            },
            when: ContextKeyExpr.and(SideBarVisibleContext, ContextKeyExpr.equals('viewContainerLocation', ViewContainerLocationToString(0 /* ViewContainerLocation.Sidebar */))),
            order: 2
        }
    }, {
        id: MenuId.LayoutControlMenu,
        item: {
            group: '2_pane_toggles',
            command: {
                id: ToggleSidebarVisibilityAction.ID,
                title: localize('toggleSideBar', "Toggle Primary Side Bar"),
                icon: panelLeftOffIcon,
                toggled: { condition: SideBarVisibleContext, icon: panelLeftIcon }
            },
            when: ContextKeyExpr.and(ContextKeyExpr.or(ContextKeyExpr.equals('config.workbench.layoutControl.type', 'toggles'), ContextKeyExpr.equals('config.workbench.layoutControl.type', 'both')), ContextKeyExpr.equals('config.workbench.sideBar.location', 'left')),
            order: 0
        }
    }, {
        id: MenuId.LayoutControlMenu,
        item: {
            group: '2_pane_toggles',
            command: {
                id: ToggleSidebarVisibilityAction.ID,
                title: localize('toggleSideBar', "Toggle Primary Side Bar"),
                icon: panelRightOffIcon,
                toggled: { condition: SideBarVisibleContext, icon: panelRightIcon }
            },
            when: ContextKeyExpr.and(ContextKeyExpr.or(ContextKeyExpr.equals('config.workbench.layoutControl.type', 'toggles'), ContextKeyExpr.equals('config.workbench.layoutControl.type', 'both')), ContextKeyExpr.equals('config.workbench.sideBar.location', 'right')),
            order: 2
        }
    }
]);
// --- Toggle Statusbar Visibility
export class ToggleStatusbarVisibilityAction extends Action2 {
    static { this.ID = 'workbench.action.toggleStatusbarVisibility'; }
    static { this.statusbarVisibleKey = 'workbench.statusBar.visible'; }
    constructor() {
        super({
            id: ToggleStatusbarVisibilityAction.ID,
            title: {
                ...localize2('toggleStatusbar', "Toggle Status Bar Visibility"),
                mnemonicTitle: localize({ key: 'miStatusbar', comment: ['&& denotes a mnemonic'] }, "S&&tatus Bar"),
            },
            category: Categories.View,
            f1: true,
            toggled: ContextKeyExpr.equals('config.workbench.statusBar.visible', true),
            menu: [{
                    id: MenuId.MenubarAppearanceMenu,
                    group: '2_workbench_layout',
                    order: 3
                }]
        });
    }
    run(accessor) {
        const layoutService = accessor.get(IWorkbenchLayoutService);
        const configurationService = accessor.get(IConfigurationService);
        const visibility = layoutService.isVisible("workbench.parts.statusbar" /* Parts.STATUSBAR_PART */, mainWindow);
        const newVisibilityValue = !visibility;
        return configurationService.updateValue(ToggleStatusbarVisibilityAction.statusbarVisibleKey, newVisibilityValue);
    }
}
registerAction2(ToggleStatusbarVisibilityAction);
// ------------------- Editor Tabs Layout --------------------------------
class AbstractSetShowTabsAction extends Action2 {
    constructor(settingName, value, title, id, precondition, description) {
        super({
            id,
            title,
            category: Categories.View,
            precondition,
            metadata: description ? { description } : undefined,
            f1: true
        });
        this.settingName = settingName;
        this.value = value;
    }
    run(accessor) {
        const configurationService = accessor.get(IConfigurationService);
        return configurationService.updateValue(this.settingName, this.value);
    }
}
// --- Hide Editor Tabs
export class HideEditorTabsAction extends AbstractSetShowTabsAction {
    static { this.ID = 'workbench.action.hideEditorTabs'; }
    constructor() {
        const precondition = ContextKeyExpr.and(ContextKeyExpr.equals(`config.${"workbench.editor.showTabs" /* LayoutSettings.EDITOR_TABS_MODE */}`, "none" /* EditorTabsMode.NONE */).negate(), InEditorZenModeContext.negate());
        const title = localize2('hideEditorTabs', 'Hide Editor Tabs');
        super("workbench.editor.showTabs" /* LayoutSettings.EDITOR_TABS_MODE */, "none" /* EditorTabsMode.NONE */, title, HideEditorTabsAction.ID, precondition, localize2('hideEditorTabsDescription', "Hide Tab Bar"));
    }
}
export class ZenHideEditorTabsAction extends AbstractSetShowTabsAction {
    static { this.ID = 'workbench.action.zenHideEditorTabs'; }
    constructor() {
        const precondition = ContextKeyExpr.and(ContextKeyExpr.equals(`config.${"zenMode.showTabs" /* ZenModeSettings.SHOW_TABS */}`, "none" /* EditorTabsMode.NONE */).negate(), InEditorZenModeContext);
        const title = localize2('hideEditorTabsZenMode', 'Hide Editor Tabs in Zen Mode');
        super("zenMode.showTabs" /* ZenModeSettings.SHOW_TABS */, "none" /* EditorTabsMode.NONE */, title, ZenHideEditorTabsAction.ID, precondition, localize2('hideEditorTabsZenModeDescription', "Hide Tab Bar in Zen Mode"));
    }
}
// --- Show Multiple Editor Tabs
export class ShowMultipleEditorTabsAction extends AbstractSetShowTabsAction {
    static { this.ID = 'workbench.action.showMultipleEditorTabs'; }
    constructor() {
        const precondition = ContextKeyExpr.and(ContextKeyExpr.equals(`config.${"workbench.editor.showTabs" /* LayoutSettings.EDITOR_TABS_MODE */}`, "multiple" /* EditorTabsMode.MULTIPLE */).negate(), InEditorZenModeContext.negate());
        const title = localize2('showMultipleEditorTabs', 'Show Multiple Editor Tabs');
        super("workbench.editor.showTabs" /* LayoutSettings.EDITOR_TABS_MODE */, "multiple" /* EditorTabsMode.MULTIPLE */, title, ShowMultipleEditorTabsAction.ID, precondition, localize2('showMultipleEditorTabsDescription', "Show Tab Bar with multiple tabs"));
    }
}
export class ZenShowMultipleEditorTabsAction extends AbstractSetShowTabsAction {
    static { this.ID = 'workbench.action.zenShowMultipleEditorTabs'; }
    constructor() {
        const precondition = ContextKeyExpr.and(ContextKeyExpr.equals(`config.${"zenMode.showTabs" /* ZenModeSettings.SHOW_TABS */}`, "multiple" /* EditorTabsMode.MULTIPLE */).negate(), InEditorZenModeContext);
        const title = localize2('showMultipleEditorTabsZenMode', 'Show Multiple Editor Tabs in Zen Mode');
        super("zenMode.showTabs" /* ZenModeSettings.SHOW_TABS */, "multiple" /* EditorTabsMode.MULTIPLE */, title, ZenShowMultipleEditorTabsAction.ID, precondition, localize2('showMultipleEditorTabsZenModeDescription', "Show Tab Bar in Zen Mode"));
    }
}
// --- Show Single Editor Tab
export class ShowSingleEditorTabAction extends AbstractSetShowTabsAction {
    static { this.ID = 'workbench.action.showEditorTab'; }
    constructor() {
        const precondition = ContextKeyExpr.and(ContextKeyExpr.equals(`config.${"workbench.editor.showTabs" /* LayoutSettings.EDITOR_TABS_MODE */}`, "single" /* EditorTabsMode.SINGLE */).negate(), InEditorZenModeContext.negate());
        const title = localize2('showSingleEditorTab', 'Show Single Editor Tab');
        super("workbench.editor.showTabs" /* LayoutSettings.EDITOR_TABS_MODE */, "single" /* EditorTabsMode.SINGLE */, title, ShowSingleEditorTabAction.ID, precondition, localize2('showSingleEditorTabDescription', "Show Tab Bar with one Tab"));
    }
}
export class ZenShowSingleEditorTabAction extends AbstractSetShowTabsAction {
    static { this.ID = 'workbench.action.zenShowEditorTab'; }
    constructor() {
        const precondition = ContextKeyExpr.and(ContextKeyExpr.equals(`config.${"zenMode.showTabs" /* ZenModeSettings.SHOW_TABS */}`, "single" /* EditorTabsMode.SINGLE */).negate(), InEditorZenModeContext);
        const title = localize2('showSingleEditorTabZenMode', 'Show Single Editor Tab in Zen Mode');
        super("zenMode.showTabs" /* ZenModeSettings.SHOW_TABS */, "single" /* EditorTabsMode.SINGLE */, title, ZenShowSingleEditorTabAction.ID, precondition, localize2('showSingleEditorTabZenModeDescription', "Show Tab Bar in Zen Mode with one Tab"));
    }
}
registerAction2(HideEditorTabsAction);
registerAction2(ZenHideEditorTabsAction);
registerAction2(ShowMultipleEditorTabsAction);
registerAction2(ZenShowMultipleEditorTabsAction);
registerAction2(ShowSingleEditorTabAction);
registerAction2(ZenShowSingleEditorTabAction);
// --- Tab Bar Submenu in View Appearance Menu
MenuRegistry.appendMenuItem(MenuId.MenubarAppearanceMenu, {
    submenu: MenuId.EditorTabsBarShowTabsSubmenu,
    title: localize('tabBar', "Tab Bar"),
    group: '3_workbench_layout_move',
    order: 10,
    when: InEditorZenModeContext.negate()
});
MenuRegistry.appendMenuItem(MenuId.MenubarAppearanceMenu, {
    submenu: MenuId.EditorTabsBarShowTabsZenModeSubmenu,
    title: localize('tabBar', "Tab Bar"),
    group: '3_workbench_layout_move',
    order: 10,
    when: InEditorZenModeContext
});
// --- Show Editor Actions in Title Bar
export class EditorActionsTitleBarAction extends Action2 {
    static { this.ID = 'workbench.action.editorActionsTitleBar'; }
    constructor() {
        super({
            id: EditorActionsTitleBarAction.ID,
            title: localize2('moveEditorActionsToTitleBar', "Move Editor Actions to Title Bar"),
            category: Categories.View,
            precondition: ContextKeyExpr.equals(`config.${"workbench.editor.editorActionsLocation" /* LayoutSettings.EDITOR_ACTIONS_LOCATION */}`, "titleBar" /* EditorActionsLocation.TITLEBAR */).negate(),
            metadata: { description: localize2('moveEditorActionsToTitleBarDescription', "Move Editor Actions from the tab bar to the title bar") },
            f1: true
        });
    }
    run(accessor) {
        const configurationService = accessor.get(IConfigurationService);
        return configurationService.updateValue("workbench.editor.editorActionsLocation" /* LayoutSettings.EDITOR_ACTIONS_LOCATION */, "titleBar" /* EditorActionsLocation.TITLEBAR */);
    }
}
registerAction2(EditorActionsTitleBarAction);
// --- Editor Actions Default Position
export class EditorActionsDefaultAction extends Action2 {
    static { this.ID = 'workbench.action.editorActionsDefault'; }
    constructor() {
        super({
            id: EditorActionsDefaultAction.ID,
            title: localize2('moveEditorActionsToTabBar', "Move Editor Actions to Tab Bar"),
            category: Categories.View,
            precondition: ContextKeyExpr.and(ContextKeyExpr.equals(`config.${"workbench.editor.editorActionsLocation" /* LayoutSettings.EDITOR_ACTIONS_LOCATION */}`, "default" /* EditorActionsLocation.DEFAULT */).negate(), ContextKeyExpr.equals(`config.${"workbench.editor.showTabs" /* LayoutSettings.EDITOR_TABS_MODE */}`, "none" /* EditorTabsMode.NONE */).negate()),
            metadata: { description: localize2('moveEditorActionsToTabBarDescription', "Move Editor Actions from the title bar to the tab bar") },
            f1: true
        });
    }
    run(accessor) {
        const configurationService = accessor.get(IConfigurationService);
        return configurationService.updateValue("workbench.editor.editorActionsLocation" /* LayoutSettings.EDITOR_ACTIONS_LOCATION */, "default" /* EditorActionsLocation.DEFAULT */);
    }
}
registerAction2(EditorActionsDefaultAction);
// --- Hide Editor Actions
export class HideEditorActionsAction extends Action2 {
    static { this.ID = 'workbench.action.hideEditorActions'; }
    constructor() {
        super({
            id: HideEditorActionsAction.ID,
            title: localize2('hideEditorActons', "Hide Editor Actions"),
            category: Categories.View,
            precondition: ContextKeyExpr.equals(`config.${"workbench.editor.editorActionsLocation" /* LayoutSettings.EDITOR_ACTIONS_LOCATION */}`, "hidden" /* EditorActionsLocation.HIDDEN */).negate(),
            metadata: { description: localize2('hideEditorActonsDescription', "Hide Editor Actions in the tab and title bar") },
            f1: true
        });
    }
    run(accessor) {
        const configurationService = accessor.get(IConfigurationService);
        return configurationService.updateValue("workbench.editor.editorActionsLocation" /* LayoutSettings.EDITOR_ACTIONS_LOCATION */, "hidden" /* EditorActionsLocation.HIDDEN */);
    }
}
registerAction2(HideEditorActionsAction);
// --- Hide Editor Actions
export class ShowEditorActionsAction extends Action2 {
    static { this.ID = 'workbench.action.showEditorActions'; }
    constructor() {
        super({
            id: ShowEditorActionsAction.ID,
            title: localize2('showEditorActons', "Show Editor Actions"),
            category: Categories.View,
            precondition: ContextKeyExpr.equals(`config.${"workbench.editor.editorActionsLocation" /* LayoutSettings.EDITOR_ACTIONS_LOCATION */}`, "hidden" /* EditorActionsLocation.HIDDEN */),
            metadata: { description: localize2('showEditorActonsDescription', "Make Editor Actions visible.") },
            f1: true
        });
    }
    run(accessor) {
        const configurationService = accessor.get(IConfigurationService);
        return configurationService.updateValue("workbench.editor.editorActionsLocation" /* LayoutSettings.EDITOR_ACTIONS_LOCATION */, "default" /* EditorActionsLocation.DEFAULT */);
    }
}
registerAction2(ShowEditorActionsAction);
// --- Editor Actions Position Submenu in View Appearance Menu
MenuRegistry.appendMenuItem(MenuId.MenubarAppearanceMenu, {
    submenu: MenuId.EditorActionsPositionSubmenu,
    title: localize('editorActionsPosition', "Editor Actions Position"),
    group: '3_workbench_layout_move',
    order: 11
});
// --- Configure Tabs Layout
export class ConfigureEditorTabsAction extends Action2 {
    static { this.ID = 'workbench.action.configureEditorTabs'; }
    constructor() {
        super({
            id: ConfigureEditorTabsAction.ID,
            title: localize2('configureTabs', "Configure Tabs"),
            category: Categories.View,
        });
    }
    run(accessor) {
        const preferencesService = accessor.get(IPreferencesService);
        preferencesService.openSettings({ jsonEditor: false, query: 'workbench.editor tab' });
    }
}
registerAction2(ConfigureEditorTabsAction);
// --- Configure Editor
export class ConfigureEditorAction extends Action2 {
    static { this.ID = 'workbench.action.configureEditor'; }
    constructor() {
        super({
            id: ConfigureEditorAction.ID,
            title: localize2('configureEditors', "Configure Editors"),
            category: Categories.View,
        });
    }
    run(accessor) {
        const preferencesService = accessor.get(IPreferencesService);
        preferencesService.openSettings({ jsonEditor: false, query: 'workbench.editor' });
    }
}
registerAction2(ConfigureEditorAction);
// --- Toggle Pinned Tabs On Separate Row
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.toggleSeparatePinnedEditorTabs',
            title: localize2('toggleSeparatePinnedEditorTabs', "Separate Pinned Editor Tabs"),
            category: Categories.View,
            precondition: ContextKeyExpr.equals(`config.${"workbench.editor.showTabs" /* LayoutSettings.EDITOR_TABS_MODE */}`, "multiple" /* EditorTabsMode.MULTIPLE */),
            metadata: { description: localize2('toggleSeparatePinnedEditorTabsDescription', "Toggle whether pinned editor tabs are shown on a separate row above unpinned tabs.") },
            f1: true
        });
    }
    run(accessor) {
        const configurationService = accessor.get(IConfigurationService);
        const oldettingValue = configurationService.getValue('workbench.editor.pinnedTabsOnSeparateRow');
        const newSettingValue = !oldettingValue;
        return configurationService.updateValue('workbench.editor.pinnedTabsOnSeparateRow', newSettingValue);
    }
});
// --- Toggle Zen Mode
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.toggleZenMode',
            title: {
                ...localize2('toggleZenMode', "Toggle Zen Mode"),
                mnemonicTitle: localize({ key: 'miToggleZenMode', comment: ['&& denotes a mnemonic'] }, "Zen Mode"),
            },
            precondition: IsAuxiliaryWindowFocusedContext.toNegated(),
            category: Categories.View,
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 56 /* KeyCode.KeyZ */)
            },
            toggled: InEditorZenModeContext,
            menu: [{
                    id: MenuId.MenubarAppearanceMenu,
                    group: '1_toggle_view',
                    order: 2
                }]
        });
    }
    run(accessor) {
        return accessor.get(IWorkbenchLayoutService).toggleZenMode();
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'workbench.action.exitZenMode',
    weight: 100 /* KeybindingWeight.EditorContrib */ - 1000,
    handler(accessor) {
        const layoutService = accessor.get(IWorkbenchLayoutService);
        const contextKeyService = accessor.get(IContextKeyService);
        if (InEditorZenModeContext.getValue(contextKeyService)) {
            layoutService.toggleZenMode();
        }
    },
    when: InEditorZenModeContext,
    primary: KeyChord(9 /* KeyCode.Escape */, 9 /* KeyCode.Escape */)
});
// --- Toggle Menu Bar
if (isWindows || isLinux || isWeb) {
    registerAction2(class ToggleMenubarAction extends Action2 {
        constructor() {
            super({
                id: 'workbench.action.toggleMenuBar',
                title: {
                    ...localize2('toggleMenuBar', "Toggle Menu Bar"),
                    mnemonicTitle: localize({ key: 'miMenuBar', comment: ['&& denotes a mnemonic'] }, "Menu &&Bar"),
                },
                category: Categories.View,
                f1: true,
                toggled: ContextKeyExpr.and(IsMacNativeContext.toNegated(), ContextKeyExpr.notEquals('config.window.menuBarVisibility', 'hidden'), ContextKeyExpr.notEquals('config.window.menuBarVisibility', 'toggle'), ContextKeyExpr.notEquals('config.window.menuBarVisibility', 'compact')),
                menu: [{
                        id: MenuId.MenubarAppearanceMenu,
                        group: '2_workbench_layout',
                        order: 0
                    }]
            });
        }
        run(accessor) {
            return accessor.get(IWorkbenchLayoutService).toggleMenuBar();
        }
    });
    // Add separately to title bar context menu so we can use a different title
    for (const menuId of [MenuId.TitleBarContext, MenuId.TitleBarTitleContext]) {
        MenuRegistry.appendMenuItem(menuId, {
            command: {
                id: 'workbench.action.toggleMenuBar',
                title: localize('miMenuBarNoMnemonic', "Menu Bar"),
                toggled: ContextKeyExpr.and(IsMacNativeContext.toNegated(), ContextKeyExpr.notEquals('config.window.menuBarVisibility', 'hidden'), ContextKeyExpr.notEquals('config.window.menuBarVisibility', 'toggle'), ContextKeyExpr.notEquals('config.window.menuBarVisibility', 'compact'))
            },
            when: ContextKeyExpr.and(IsAuxiliaryWindowFocusedContext.toNegated(), ContextKeyExpr.notEquals(TitleBarStyleContext.key, "native" /* TitlebarStyle.NATIVE */), IsMainWindowFullscreenContext.negate()),
            group: '2_config',
            order: 0
        });
    }
}
// --- Reset View Locations
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.resetViewLocations',
            title: localize2('resetViewLocations', "Reset View Locations"),
            category: Categories.View,
            f1: true
        });
    }
    run(accessor) {
        return accessor.get(IViewDescriptorService).reset();
    }
});
// --- Move View
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.moveView',
            title: localize2('moveView', "Move View"),
            category: Categories.View,
            f1: true
        });
    }
    async run(accessor) {
        const viewDescriptorService = accessor.get(IViewDescriptorService);
        const instantiationService = accessor.get(IInstantiationService);
        const quickInputService = accessor.get(IQuickInputService);
        const contextKeyService = accessor.get(IContextKeyService);
        const paneCompositePartService = accessor.get(IPaneCompositePartService);
        const focusedViewId = FocusedViewContext.getValue(contextKeyService);
        let viewId;
        if (focusedViewId && viewDescriptorService.getViewDescriptorById(focusedViewId)?.canMoveView) {
            viewId = focusedViewId;
        }
        try {
            viewId = await this.getView(quickInputService, viewDescriptorService, paneCompositePartService, viewId);
            if (!viewId) {
                return;
            }
            const moveFocusedViewAction = new MoveFocusedViewAction();
            instantiationService.invokeFunction(accessor => moveFocusedViewAction.run(accessor, viewId));
        }
        catch { }
    }
    getViewItems(viewDescriptorService, paneCompositePartService) {
        const results = [];
        const viewlets = paneCompositePartService.getVisiblePaneCompositeIds(0 /* ViewContainerLocation.Sidebar */);
        viewlets.forEach(viewletId => {
            const container = viewDescriptorService.getViewContainerById(viewletId);
            const containerModel = viewDescriptorService.getViewContainerModel(container);
            let hasAddedView = false;
            containerModel.visibleViewDescriptors.forEach(viewDescriptor => {
                if (viewDescriptor.canMoveView) {
                    if (!hasAddedView) {
                        results.push({
                            type: 'separator',
                            label: localize('sidebarContainer', "Side Bar / {0}", containerModel.title)
                        });
                        hasAddedView = true;
                    }
                    results.push({
                        id: viewDescriptor.id,
                        label: viewDescriptor.name.value
                    });
                }
            });
        });
        const panels = paneCompositePartService.getPinnedPaneCompositeIds(1 /* ViewContainerLocation.Panel */);
        panels.forEach(panel => {
            const container = viewDescriptorService.getViewContainerById(panel);
            const containerModel = viewDescriptorService.getViewContainerModel(container);
            let hasAddedView = false;
            containerModel.visibleViewDescriptors.forEach(viewDescriptor => {
                if (viewDescriptor.canMoveView) {
                    if (!hasAddedView) {
                        results.push({
                            type: 'separator',
                            label: localize('panelContainer', "Panel / {0}", containerModel.title)
                        });
                        hasAddedView = true;
                    }
                    results.push({
                        id: viewDescriptor.id,
                        label: viewDescriptor.name.value
                    });
                }
            });
        });
        const sidePanels = paneCompositePartService.getPinnedPaneCompositeIds(2 /* ViewContainerLocation.AuxiliaryBar */);
        sidePanels.forEach(panel => {
            const container = viewDescriptorService.getViewContainerById(panel);
            const containerModel = viewDescriptorService.getViewContainerModel(container);
            let hasAddedView = false;
            containerModel.visibleViewDescriptors.forEach(viewDescriptor => {
                if (viewDescriptor.canMoveView) {
                    if (!hasAddedView) {
                        results.push({
                            type: 'separator',
                            label: localize('secondarySideBarContainer', "Void Side Bar / {0}", containerModel.title)
                        });
                        hasAddedView = true;
                    }
                    results.push({
                        id: viewDescriptor.id,
                        label: viewDescriptor.name.value
                    });
                }
            });
        });
        return results;
    }
    async getView(quickInputService, viewDescriptorService, paneCompositePartService, viewId) {
        const disposables = new DisposableStore();
        const quickPick = disposables.add(quickInputService.createQuickPick({ useSeparators: true }));
        quickPick.placeholder = localize('moveFocusedView.selectView', "Select a View to Move");
        quickPick.items = this.getViewItems(viewDescriptorService, paneCompositePartService);
        quickPick.selectedItems = quickPick.items.filter(item => item.id === viewId);
        return new Promise((resolve, reject) => {
            disposables.add(quickPick.onDidAccept(() => {
                const viewId = quickPick.selectedItems[0];
                if (viewId.id) {
                    resolve(viewId.id);
                }
                else {
                    reject();
                }
                quickPick.hide();
            }));
            disposables.add(quickPick.onDidHide(() => {
                disposables.dispose();
                reject();
            }));
            quickPick.show();
        });
    }
});
// --- Move Focused View
class MoveFocusedViewAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.moveFocusedView',
            title: localize2('moveFocusedView', "Move Focused View"),
            category: Categories.View,
            precondition: FocusedViewContext.notEqualsTo(''),
            f1: true
        });
    }
    run(accessor, viewId) {
        const viewDescriptorService = accessor.get(IViewDescriptorService);
        const viewsService = accessor.get(IViewsService);
        const quickInputService = accessor.get(IQuickInputService);
        const contextKeyService = accessor.get(IContextKeyService);
        const dialogService = accessor.get(IDialogService);
        const paneCompositePartService = accessor.get(IPaneCompositePartService);
        const focusedViewId = viewId || FocusedViewContext.getValue(contextKeyService);
        if (focusedViewId === undefined || focusedViewId.trim() === '') {
            dialogService.error(localize('moveFocusedView.error.noFocusedView', "There is no view currently focused."));
            return;
        }
        const viewDescriptor = viewDescriptorService.getViewDescriptorById(focusedViewId);
        if (!viewDescriptor || !viewDescriptor.canMoveView) {
            dialogService.error(localize('moveFocusedView.error.nonMovableView', "The currently focused view is not movable."));
            return;
        }
        const disposables = new DisposableStore();
        const quickPick = disposables.add(quickInputService.createQuickPick({ useSeparators: true }));
        quickPick.placeholder = localize('moveFocusedView.selectDestination', "Select a Destination for the View");
        quickPick.title = localize({ key: 'moveFocusedView.title', comment: ['{0} indicates the title of the view the user has selected to move.'] }, "View: Move {0}", viewDescriptor.name.value);
        const items = [];
        const currentContainer = viewDescriptorService.getViewContainerByViewId(focusedViewId);
        const currentLocation = viewDescriptorService.getViewLocationById(focusedViewId);
        const isViewSolo = viewDescriptorService.getViewContainerModel(currentContainer).allViewDescriptors.length === 1;
        if (!(isViewSolo && currentLocation === 1 /* ViewContainerLocation.Panel */)) {
            items.push({
                id: '_.panel.newcontainer',
                label: localize({ key: 'moveFocusedView.newContainerInPanel', comment: ['Creates a new top-level tab in the panel.'] }, "New Panel Entry"),
            });
        }
        if (!(isViewSolo && currentLocation === 0 /* ViewContainerLocation.Sidebar */)) {
            items.push({
                id: '_.sidebar.newcontainer',
                label: localize('moveFocusedView.newContainerInSidebar', "New Side Bar Entry")
            });
        }
        if (!(isViewSolo && currentLocation === 2 /* ViewContainerLocation.AuxiliaryBar */)) {
            items.push({
                id: '_.auxiliarybar.newcontainer',
                label: localize('moveFocusedView.newContainerInSidePanel', "New Void Side Bar Entry")
            });
        }
        items.push({
            type: 'separator',
            label: localize('sidebar', "Side Bar")
        });
        const pinnedViewlets = paneCompositePartService.getVisiblePaneCompositeIds(0 /* ViewContainerLocation.Sidebar */);
        items.push(...pinnedViewlets
            .filter(viewletId => {
            if (viewletId === viewDescriptorService.getViewContainerByViewId(focusedViewId).id) {
                return false;
            }
            return !viewDescriptorService.getViewContainerById(viewletId).rejectAddedViews;
        })
            .map(viewletId => {
            return {
                id: viewletId,
                label: viewDescriptorService.getViewContainerModel(viewDescriptorService.getViewContainerById(viewletId)).title
            };
        }));
        items.push({
            type: 'separator',
            label: localize('panel', "Panel")
        });
        const pinnedPanels = paneCompositePartService.getPinnedPaneCompositeIds(1 /* ViewContainerLocation.Panel */);
        items.push(...pinnedPanels
            .filter(panel => {
            if (panel === viewDescriptorService.getViewContainerByViewId(focusedViewId).id) {
                return false;
            }
            return !viewDescriptorService.getViewContainerById(panel).rejectAddedViews;
        })
            .map(panel => {
            return {
                id: panel,
                label: viewDescriptorService.getViewContainerModel(viewDescriptorService.getViewContainerById(panel)).title
            };
        }));
        items.push({
            type: 'separator',
            label: localize('secondarySideBar', "Void Side Bar")
        });
        const pinnedAuxPanels = paneCompositePartService.getPinnedPaneCompositeIds(2 /* ViewContainerLocation.AuxiliaryBar */);
        items.push(...pinnedAuxPanels
            .filter(panel => {
            if (panel === viewDescriptorService.getViewContainerByViewId(focusedViewId).id) {
                return false;
            }
            return !viewDescriptorService.getViewContainerById(panel).rejectAddedViews;
        })
            .map(panel => {
            return {
                id: panel,
                label: viewDescriptorService.getViewContainerModel(viewDescriptorService.getViewContainerById(panel)).title
            };
        }));
        quickPick.items = items;
        disposables.add(quickPick.onDidAccept(() => {
            const destination = quickPick.selectedItems[0];
            if (destination.id === '_.panel.newcontainer') {
                viewDescriptorService.moveViewToLocation(viewDescriptor, 1 /* ViewContainerLocation.Panel */, this.desc.id);
                viewsService.openView(focusedViewId, true);
            }
            else if (destination.id === '_.sidebar.newcontainer') {
                viewDescriptorService.moveViewToLocation(viewDescriptor, 0 /* ViewContainerLocation.Sidebar */, this.desc.id);
                viewsService.openView(focusedViewId, true);
            }
            else if (destination.id === '_.auxiliarybar.newcontainer') {
                viewDescriptorService.moveViewToLocation(viewDescriptor, 2 /* ViewContainerLocation.AuxiliaryBar */, this.desc.id);
                viewsService.openView(focusedViewId, true);
            }
            else if (destination.id) {
                viewDescriptorService.moveViewsToContainer([viewDescriptor], viewDescriptorService.getViewContainerById(destination.id), undefined, this.desc.id);
                viewsService.openView(focusedViewId, true);
            }
            quickPick.hide();
        }));
        disposables.add(quickPick.onDidHide(() => disposables.dispose()));
        quickPick.show();
    }
}
registerAction2(MoveFocusedViewAction);
// --- Reset Focused View Location
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.resetFocusedViewLocation',
            title: localize2('resetFocusedViewLocation', "Reset Focused View Location"),
            category: Categories.View,
            f1: true,
            precondition: FocusedViewContext.notEqualsTo('')
        });
    }
    run(accessor) {
        const viewDescriptorService = accessor.get(IViewDescriptorService);
        const contextKeyService = accessor.get(IContextKeyService);
        const dialogService = accessor.get(IDialogService);
        const viewsService = accessor.get(IViewsService);
        const focusedViewId = FocusedViewContext.getValue(contextKeyService);
        let viewDescriptor = null;
        if (focusedViewId !== undefined && focusedViewId.trim() !== '') {
            viewDescriptor = viewDescriptorService.getViewDescriptorById(focusedViewId);
        }
        if (!viewDescriptor) {
            dialogService.error(localize('resetFocusedView.error.noFocusedView', "There is no view currently focused."));
            return;
        }
        const defaultContainer = viewDescriptorService.getDefaultContainerById(viewDescriptor.id);
        if (!defaultContainer || defaultContainer === viewDescriptorService.getViewContainerByViewId(viewDescriptor.id)) {
            return;
        }
        viewDescriptorService.moveViewsToContainer([viewDescriptor], defaultContainer, undefined, this.desc.id);
        viewsService.openView(viewDescriptor.id, true);
    }
});
// --- Resize View
class BaseResizeViewAction extends Action2 {
    static { this.RESIZE_INCREMENT = 60; } // This is a css pixel size
    resizePart(widthChange, heightChange, layoutService, partToResize) {
        let part;
        if (partToResize === undefined) {
            const isEditorFocus = layoutService.hasFocus("workbench.parts.editor" /* Parts.EDITOR_PART */);
            const isSidebarFocus = layoutService.hasFocus("workbench.parts.sidebar" /* Parts.SIDEBAR_PART */);
            const isPanelFocus = layoutService.hasFocus("workbench.parts.panel" /* Parts.PANEL_PART */);
            const isAuxiliaryBarFocus = layoutService.hasFocus("workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */);
            if (isSidebarFocus) {
                part = "workbench.parts.sidebar" /* Parts.SIDEBAR_PART */;
            }
            else if (isPanelFocus) {
                part = "workbench.parts.panel" /* Parts.PANEL_PART */;
            }
            else if (isEditorFocus) {
                part = "workbench.parts.editor" /* Parts.EDITOR_PART */;
            }
            else if (isAuxiliaryBarFocus) {
                part = "workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */;
            }
        }
        else {
            part = partToResize;
        }
        if (part) {
            layoutService.resizePart(part, widthChange, heightChange);
        }
    }
}
class IncreaseViewSizeAction extends BaseResizeViewAction {
    constructor() {
        super({
            id: 'workbench.action.increaseViewSize',
            title: localize2('increaseViewSize', 'Increase Current View Size'),
            f1: true,
            precondition: IsAuxiliaryWindowFocusedContext.toNegated()
        });
    }
    run(accessor) {
        this.resizePart(BaseResizeViewAction.RESIZE_INCREMENT, BaseResizeViewAction.RESIZE_INCREMENT, accessor.get(IWorkbenchLayoutService));
    }
}
class IncreaseViewWidthAction extends BaseResizeViewAction {
    constructor() {
        super({
            id: 'workbench.action.increaseViewWidth',
            title: localize2('increaseEditorWidth', 'Increase Editor Width'),
            f1: true,
            precondition: IsAuxiliaryWindowFocusedContext.toNegated()
        });
    }
    run(accessor) {
        this.resizePart(BaseResizeViewAction.RESIZE_INCREMENT, 0, accessor.get(IWorkbenchLayoutService), "workbench.parts.editor" /* Parts.EDITOR_PART */);
    }
}
class IncreaseViewHeightAction extends BaseResizeViewAction {
    constructor() {
        super({
            id: 'workbench.action.increaseViewHeight',
            title: localize2('increaseEditorHeight', 'Increase Editor Height'),
            f1: true,
            precondition: IsAuxiliaryWindowFocusedContext.toNegated()
        });
    }
    run(accessor) {
        this.resizePart(0, BaseResizeViewAction.RESIZE_INCREMENT, accessor.get(IWorkbenchLayoutService), "workbench.parts.editor" /* Parts.EDITOR_PART */);
    }
}
class DecreaseViewSizeAction extends BaseResizeViewAction {
    constructor() {
        super({
            id: 'workbench.action.decreaseViewSize',
            title: localize2('decreaseViewSize', 'Decrease Current View Size'),
            f1: true,
            precondition: IsAuxiliaryWindowFocusedContext.toNegated()
        });
    }
    run(accessor) {
        this.resizePart(-BaseResizeViewAction.RESIZE_INCREMENT, -BaseResizeViewAction.RESIZE_INCREMENT, accessor.get(IWorkbenchLayoutService));
    }
}
class DecreaseViewWidthAction extends BaseResizeViewAction {
    constructor() {
        super({
            id: 'workbench.action.decreaseViewWidth',
            title: localize2('decreaseEditorWidth', 'Decrease Editor Width'),
            f1: true,
            precondition: IsAuxiliaryWindowFocusedContext.toNegated()
        });
    }
    run(accessor) {
        this.resizePart(-BaseResizeViewAction.RESIZE_INCREMENT, 0, accessor.get(IWorkbenchLayoutService), "workbench.parts.editor" /* Parts.EDITOR_PART */);
    }
}
class DecreaseViewHeightAction extends BaseResizeViewAction {
    constructor() {
        super({
            id: 'workbench.action.decreaseViewHeight',
            title: localize2('decreaseEditorHeight', 'Decrease Editor Height'),
            f1: true,
            precondition: IsAuxiliaryWindowFocusedContext.toNegated()
        });
    }
    run(accessor) {
        this.resizePart(0, -BaseResizeViewAction.RESIZE_INCREMENT, accessor.get(IWorkbenchLayoutService), "workbench.parts.editor" /* Parts.EDITOR_PART */);
    }
}
registerAction2(IncreaseViewSizeAction);
registerAction2(IncreaseViewWidthAction);
registerAction2(IncreaseViewHeightAction);
registerAction2(DecreaseViewSizeAction);
registerAction2(DecreaseViewWidthAction);
registerAction2(DecreaseViewHeightAction);
//#region Quick Input Alignment Actions
registerAction2(class AlignQuickInputTopAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.alignQuickInputTop',
            title: localize2('alignQuickInputTop', 'Align Quick Input Top'),
            f1: false
        });
    }
    run(accessor) {
        const quickInputService = accessor.get(IQuickInputService);
        quickInputService.setAlignment('top');
    }
});
registerAction2(class AlignQuickInputCenterAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.alignQuickInputCenter',
            title: localize2('alignQuickInputCenter', 'Align Quick Input Center'),
            f1: false
        });
    }
    run(accessor) {
        const quickInputService = accessor.get(IQuickInputService);
        quickInputService.setAlignment('center');
    }
});
function isContextualLayoutVisualIcon(icon) {
    return icon.iconA !== undefined;
}
const CreateToggleLayoutItem = (id, active, label, visualIcon) => {
    return {
        id,
        active,
        label,
        visualIcon,
        activeIcon: Codicon.eye,
        inactiveIcon: Codicon.eyeClosed,
        activeAriaLabel: localize('selectToHide', "Select to Hide"),
        inactiveAriaLabel: localize('selectToShow', "Select to Show"),
        useButtons: true,
    };
};
const CreateOptionLayoutItem = (id, active, label, visualIcon) => {
    return {
        id,
        active,
        label,
        visualIcon,
        activeIcon: Codicon.check,
        activeAriaLabel: localize('active', "Active"),
        useButtons: false
    };
};
const MenuBarToggledContext = ContextKeyExpr.and(IsMacNativeContext.toNegated(), ContextKeyExpr.notEquals('config.window.menuBarVisibility', 'hidden'), ContextKeyExpr.notEquals('config.window.menuBarVisibility', 'toggle'), ContextKeyExpr.notEquals('config.window.menuBarVisibility', 'compact'));
const ToggleVisibilityActions = [];
if (!isMacintosh || !isNative) {
    ToggleVisibilityActions.push(CreateToggleLayoutItem('workbench.action.toggleMenuBar', MenuBarToggledContext, localize('menuBar', "Menu Bar"), menubarIcon));
}
ToggleVisibilityActions.push(...[
    CreateToggleLayoutItem(ToggleActivityBarVisibilityActionId, ContextKeyExpr.notEquals('config.workbench.activityBar.location', 'hidden'), localize('activityBar', "Activity Bar"), { whenA: ContextKeyExpr.equals('config.workbench.sideBar.location', 'left'), iconA: activityBarLeftIcon, iconB: activityBarRightIcon }),
    CreateToggleLayoutItem(ToggleSidebarVisibilityAction.ID, SideBarVisibleContext, localize('sideBar', "Primary Side Bar"), { whenA: ContextKeyExpr.equals('config.workbench.sideBar.location', 'left'), iconA: panelLeftIcon, iconB: panelRightIcon }),
    CreateToggleLayoutItem(ToggleAuxiliaryBarAction.ID, AuxiliaryBarVisibleContext, localize('secondarySideBar', "Void Side Bar"), { whenA: ContextKeyExpr.equals('config.workbench.sideBar.location', 'left'), iconA: panelRightIcon, iconB: panelLeftIcon }),
    CreateToggleLayoutItem(TogglePanelAction.ID, PanelVisibleContext, localize('panel', "Panel"), panelIcon),
    CreateToggleLayoutItem(ToggleStatusbarVisibilityAction.ID, ContextKeyExpr.equals('config.workbench.statusBar.visible', true), localize('statusBar', "Status Bar"), statusBarIcon),
]);
const MoveSideBarActions = [
    CreateOptionLayoutItem(MoveSidebarLeftAction.ID, ContextKeyExpr.equals('config.workbench.sideBar.location', 'left'), localize('leftSideBar', "Left"), panelLeftIcon),
    CreateOptionLayoutItem(MoveSidebarRightAction.ID, ContextKeyExpr.equals('config.workbench.sideBar.location', 'right'), localize('rightSideBar', "Right"), panelRightIcon),
];
const AlignPanelActions = [
    CreateOptionLayoutItem('workbench.action.alignPanelLeft', PanelAlignmentContext.isEqualTo('left'), localize('leftPanel', "Left"), panelAlignmentLeftIcon),
    CreateOptionLayoutItem('workbench.action.alignPanelRight', PanelAlignmentContext.isEqualTo('right'), localize('rightPanel', "Right"), panelAlignmentRightIcon),
    CreateOptionLayoutItem('workbench.action.alignPanelCenter', PanelAlignmentContext.isEqualTo('center'), localize('centerPanel', "Center"), panelAlignmentCenterIcon),
    CreateOptionLayoutItem('workbench.action.alignPanelJustify', PanelAlignmentContext.isEqualTo('justify'), localize('justifyPanel', "Justify"), panelAlignmentJustifyIcon),
];
const QuickInputActions = [
    CreateOptionLayoutItem('workbench.action.alignQuickInputTop', QuickInputAlignmentContextKey.isEqualTo('top'), localize('top', "Top"), quickInputAlignmentTopIcon),
    CreateOptionLayoutItem('workbench.action.alignQuickInputCenter', QuickInputAlignmentContextKey.isEqualTo('center'), localize('center', "Center"), quickInputAlignmentCenterIcon),
];
const MiscLayoutOptions = [
    CreateOptionLayoutItem('workbench.action.toggleFullScreen', IsMainWindowFullscreenContext, localize('fullscreen', "Full Screen"), fullscreenIcon),
    CreateOptionLayoutItem('workbench.action.toggleZenMode', InEditorZenModeContext, localize('zenMode', "Zen Mode"), zenModeIcon),
    CreateOptionLayoutItem('workbench.action.toggleCenteredLayout', IsMainEditorCenteredLayoutContext, localize('centeredLayout', "Centered Layout"), centerLayoutIcon),
];
const LayoutContextKeySet = new Set();
for (const { active } of [...ToggleVisibilityActions, ...MoveSideBarActions, ...AlignPanelActions, ...QuickInputActions, ...MiscLayoutOptions]) {
    for (const key of active.keys()) {
        LayoutContextKeySet.add(key);
    }
}
registerAction2(class CustomizeLayoutAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.customizeLayout',
            title: localize2('customizeLayout', "Customize Layout..."),
            f1: true,
            icon: configureLayoutIcon,
            menu: [
                {
                    id: MenuId.LayoutControlMenuSubmenu,
                    group: 'z_end',
                },
                {
                    id: MenuId.LayoutControlMenu,
                    when: ContextKeyExpr.equals('config.workbench.layoutControl.type', 'both'),
                    group: '1_layout'
                }
            ]
        });
    }
    getItems(contextKeyService, keybindingService) {
        const toQuickPickItem = (item) => {
            const toggled = item.active.evaluate(contextKeyService.getContext(null));
            let label = item.useButtons ?
                item.label :
                item.label + (toggled && item.activeIcon ? ` $(${item.activeIcon.id})` : (!toggled && item.inactiveIcon ? ` $(${item.inactiveIcon.id})` : ''));
            const ariaLabel = item.label + (toggled && item.activeAriaLabel ? ` (${item.activeAriaLabel})` : (!toggled && item.inactiveAriaLabel ? ` (${item.inactiveAriaLabel})` : ''));
            if (item.visualIcon) {
                let icon = item.visualIcon;
                if (isContextualLayoutVisualIcon(icon)) {
                    const useIconA = icon.whenA.evaluate(contextKeyService.getContext(null));
                    icon = useIconA ? icon.iconA : icon.iconB;
                }
                label = `$(${icon.id}) ${label}`;
            }
            const icon = toggled ? item.activeIcon : item.inactiveIcon;
            return {
                type: 'item',
                id: item.id,
                label,
                ariaLabel,
                keybinding: keybindingService.lookupKeybinding(item.id, contextKeyService),
                buttons: !item.useButtons ? undefined : [
                    {
                        alwaysVisible: false,
                        tooltip: ariaLabel,
                        iconClass: icon ? ThemeIcon.asClassName(icon) : undefined
                    }
                ]
            };
        };
        return [
            {
                type: 'separator',
                label: localize('toggleVisibility', "Visibility")
            },
            ...ToggleVisibilityActions.map(toQuickPickItem),
            {
                type: 'separator',
                label: localize('sideBarPosition', "Primary Side Bar Position")
            },
            ...MoveSideBarActions.map(toQuickPickItem),
            {
                type: 'separator',
                label: localize('panelAlignment', "Panel Alignment")
            },
            ...AlignPanelActions.map(toQuickPickItem),
            {
                type: 'separator',
                label: localize('quickOpen', "Quick Input Position")
            },
            ...QuickInputActions.map(toQuickPickItem),
            {
                type: 'separator',
                label: localize('layoutModes', "Modes"),
            },
            ...MiscLayoutOptions.map(toQuickPickItem),
        ];
    }
    run(accessor) {
        if (this._currentQuickPick) {
            this._currentQuickPick.hide();
            return;
        }
        const configurationService = accessor.get(IConfigurationService);
        const contextKeyService = accessor.get(IContextKeyService);
        const commandService = accessor.get(ICommandService);
        const quickInputService = accessor.get(IQuickInputService);
        const keybindingService = accessor.get(IKeybindingService);
        const disposables = new DisposableStore();
        const quickPick = disposables.add(quickInputService.createQuickPick({ useSeparators: true }));
        this._currentQuickPick = quickPick;
        quickPick.items = this.getItems(contextKeyService, keybindingService);
        quickPick.ignoreFocusOut = true;
        quickPick.hideInput = true;
        quickPick.title = localize('customizeLayoutQuickPickTitle', "Customize Layout");
        const closeButton = {
            alwaysVisible: true,
            iconClass: ThemeIcon.asClassName(Codicon.close),
            tooltip: localize('close', "Close")
        };
        const resetButton = {
            alwaysVisible: true,
            iconClass: ThemeIcon.asClassName(Codicon.discard),
            tooltip: localize('restore defaults', "Restore Defaults")
        };
        quickPick.buttons = [
            resetButton,
            closeButton
        ];
        let selectedItem = undefined;
        disposables.add(contextKeyService.onDidChangeContext(changeEvent => {
            if (changeEvent.affectsSome(LayoutContextKeySet)) {
                quickPick.items = this.getItems(contextKeyService, keybindingService);
                if (selectedItem) {
                    quickPick.activeItems = quickPick.items.filter(item => item.id === selectedItem?.id);
                }
                setTimeout(() => quickInputService.focus(), 0);
            }
        }));
        disposables.add(quickPick.onDidAccept(event => {
            if (quickPick.selectedItems.length) {
                selectedItem = quickPick.selectedItems[0];
                commandService.executeCommand(selectedItem.id);
            }
        }));
        disposables.add(quickPick.onDidTriggerItemButton(event => {
            if (event.item) {
                selectedItem = event.item;
                commandService.executeCommand(selectedItem.id);
            }
        }));
        disposables.add(quickPick.onDidTriggerButton((button) => {
            if (button === closeButton) {
                quickPick.hide();
            }
            else if (button === resetButton) {
                const resetSetting = (id) => {
                    const config = configurationService.inspect(id);
                    configurationService.updateValue(id, config.defaultValue);
                };
                // Reset all layout options
                resetSetting('workbench.activityBar.location');
                resetSetting('workbench.sideBar.location');
                resetSetting('workbench.statusBar.visible');
                resetSetting('workbench.panel.defaultLocation');
                if (!isMacintosh || !isNative) {
                    resetSetting('window.menuBarVisibility');
                }
                commandService.executeCommand('workbench.action.alignPanelCenter');
                commandService.executeCommand('workbench.action.alignQuickInputTop');
            }
        }));
        disposables.add(quickPick.onDidHide(() => {
            quickPick.dispose();
        }));
        disposables.add(quickPick.onDispose(() => {
            this._currentQuickPick = undefined;
            disposables.dispose();
        }));
        quickPick.show();
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGF5b3V0QWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYnJvd3Nlci9hY3Rpb25zL2xheW91dEFjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFvQixRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDeEUsT0FBTyxFQUFFLE1BQU0sRUFBRSxZQUFZLEVBQUUsZUFBZSxFQUFFLE9BQU8sRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQzdHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQUN2RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUNoRyxPQUFPLEVBQXlDLHVCQUF1QixFQUFvRCxnQkFBZ0IsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ3BNLE9BQU8sRUFBb0IscUJBQXFCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUNsSCxPQUFPLEVBQW1CLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzdFLE9BQU8sRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxXQUFXLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDcEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDeEYsT0FBTyxFQUFFLG1CQUFtQixFQUFvQixNQUFNLDREQUE0RCxDQUFDO0FBQ25ILE9BQU8sRUFBRSxjQUFjLEVBQXdCLGtCQUFrQixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDN0gsT0FBTyxFQUFFLHNCQUFzQixFQUEwQyw2QkFBNkIsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ3RJLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw2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