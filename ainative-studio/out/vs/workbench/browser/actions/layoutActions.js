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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGF5b3V0QWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL2FjdGlvbnMvbGF5b3V0QWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQW9CLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUN4RSxPQUFPLEVBQUUsTUFBTSxFQUFFLFlBQVksRUFBRSxlQUFlLEVBQUUsT0FBTyxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDN0csT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQ2hHLE9BQU8sRUFBeUMsdUJBQXVCLEVBQW9ELGdCQUFnQixFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDcE0sT0FBTyxFQUFvQixxQkFBcUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQ2xILE9BQU8sRUFBbUIsUUFBUSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDN0UsT0FBTyxFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLFdBQVcsRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNwRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUN4RixPQUFPLEVBQUUsbUJBQW1CLEVBQW9CLE1BQU0sNERBQTRELENBQUM7QUFDbkgsT0FBTyxFQUFFLGNBQWMsRUFBd0Isa0JBQWtCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUM3SCxPQUFPLEVBQUUsc0JBQXNCLEVBQTBDLDZCQUE2QixFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDdEksT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDZD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