/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../../base/common/codicons.js';
import { localize, localize2 } from '../../../../nls.js';
import { Action2, MenuId, MenuRegistry, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { AuxiliaryBarVisibleContext } from '../../../common/contextkeys.js';
import { ViewContainerLocationToString } from '../../../common/views.js';
import { IWorkbenchLayoutService } from '../../../services/layout/browser/layoutService.js';
import { IPaneCompositePartService } from '../../../services/panecomposite/browser/panecomposite.js';
import { SwitchCompositeViewAction } from '../compositeBarActions.js';
import { closeIcon } from '../panel/panelActions.js';
const auxiliaryBarRightIcon = registerIcon('auxiliarybar-right-layout-icon', Codicon.layoutSidebarRight, localize('toggleAuxiliaryIconRight', 'Icon to toggle the auxiliary bar off in its right position.'));
const auxiliaryBarRightOffIcon = registerIcon('auxiliarybar-right-off-layout-icon', Codicon.layoutSidebarRightOff, localize('toggleAuxiliaryIconRightOn', 'Icon to toggle the auxiliary bar on in its right position.'));
const auxiliaryBarLeftIcon = registerIcon('auxiliarybar-left-layout-icon', Codicon.layoutSidebarLeft, localize('toggleAuxiliaryIconLeft', 'Icon to toggle the auxiliary bar in its left position.'));
const auxiliaryBarLeftOffIcon = registerIcon('auxiliarybar-left-off-layout-icon', Codicon.layoutSidebarLeftOff, localize('toggleAuxiliaryIconLeftOn', 'Icon to toggle the auxiliary bar on in its left position.'));
export class ToggleAuxiliaryBarAction extends Action2 {
    static { this.ID = 'workbench.action.toggleAuxiliaryBar'; }
    static { this.LABEL = localize2('toggleAuxiliaryBar', "Toggle Void Side Bar Visibility"); }
    constructor() {
        super({
            id: ToggleAuxiliaryBarAction.ID,
            title: ToggleAuxiliaryBarAction.LABEL,
            toggled: {
                condition: AuxiliaryBarVisibleContext,
                title: localize('closeSecondarySideBar', 'Hide Void Side Bar'),
                icon: closeIcon,
                mnemonicTitle: localize({ key: 'secondary sidebar mnemonic', comment: ['&& denotes a mnemonic'] }, "Secondary Si&&de Bar"),
            },
            icon: closeIcon, // Ensures no flickering when using toggled.icon
            category: Categories.View,
            metadata: {
                description: localize('openAndCloseAuxiliaryBar', 'Open/Show and Close/Hide Void Side Bar'),
            },
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 32 /* KeyCode.KeyB */
            },
            menu: [
                {
                    id: MenuId.LayoutControlMenuSubmenu,
                    group: '0_workbench_layout',
                    order: 1
                },
                {
                    id: MenuId.MenubarAppearanceMenu,
                    group: '2_workbench_layout',
                    order: 2
                }, {
                    id: MenuId.AuxiliaryBarTitle,
                    group: 'navigation',
                    order: 2,
                    when: ContextKeyExpr.equals(`config.${"workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */}`, "default" /* ActivityBarPosition.DEFAULT */)
                }
            ]
        });
    }
    async run(accessor) {
        const layoutService = accessor.get(IWorkbenchLayoutService);
        layoutService.setPartHidden(layoutService.isVisible("workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */), "workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */);
    }
}
registerAction2(ToggleAuxiliaryBarAction);
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.closeAuxiliaryBar',
            title: localize2('closeSecondarySideBar', 'Hide Void Side Bar'),
            category: Categories.View,
            precondition: AuxiliaryBarVisibleContext,
            f1: true,
        });
    }
    run(accessor) {
        accessor.get(IWorkbenchLayoutService).setPartHidden(true, "workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */);
    }
});
registerAction2(class FocusAuxiliaryBarAction extends Action2 {
    static { this.ID = 'workbench.action.focusAuxiliaryBar'; }
    static { this.LABEL = localize2('focusAuxiliaryBar', "Focus into Void Side Bar"); }
    constructor() {
        super({
            id: FocusAuxiliaryBarAction.ID,
            title: FocusAuxiliaryBarAction.LABEL,
            category: Categories.View,
            f1: true,
        });
    }
    async run(accessor) {
        const paneCompositeService = accessor.get(IPaneCompositePartService);
        const layoutService = accessor.get(IWorkbenchLayoutService);
        // Show auxiliary bar
        if (!layoutService.isVisible("workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */)) {
            layoutService.setPartHidden(false, "workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */);
        }
        // Focus into active composite
        const composite = paneCompositeService.getActivePaneComposite(2 /* ViewContainerLocation.AuxiliaryBar */);
        composite?.focus();
    }
});
MenuRegistry.appendMenuItems([
    {
        id: MenuId.LayoutControlMenu,
        item: {
            group: '2_pane_toggles',
            command: {
                id: ToggleAuxiliaryBarAction.ID,
                title: localize('toggleSecondarySideBar', "Toggle Void Side Bar"),
                toggled: { condition: AuxiliaryBarVisibleContext, icon: auxiliaryBarLeftIcon },
                icon: auxiliaryBarLeftOffIcon,
            },
            when: ContextKeyExpr.and(ContextKeyExpr.or(ContextKeyExpr.equals('config.workbench.layoutControl.type', 'toggles'), ContextKeyExpr.equals('config.workbench.layoutControl.type', 'both')), ContextKeyExpr.equals('config.workbench.sideBar.location', 'right')),
            order: 0
        }
    }, {
        id: MenuId.LayoutControlMenu,
        item: {
            group: '2_pane_toggles',
            command: {
                id: ToggleAuxiliaryBarAction.ID,
                title: localize('toggleSecondarySideBar', "Toggle Void Side Bar"),
                toggled: { condition: AuxiliaryBarVisibleContext, icon: auxiliaryBarRightIcon },
                icon: auxiliaryBarRightOffIcon,
            },
            when: ContextKeyExpr.and(ContextKeyExpr.or(ContextKeyExpr.equals('config.workbench.layoutControl.type', 'toggles'), ContextKeyExpr.equals('config.workbench.layoutControl.type', 'both')), ContextKeyExpr.equals('config.workbench.sideBar.location', 'left')),
            order: 2
        }
    }, {
        id: MenuId.ViewContainerTitleContext,
        item: {
            group: '3_workbench_layout_move',
            command: {
                id: ToggleAuxiliaryBarAction.ID,
                title: localize2('hideAuxiliaryBar', 'Hide Void Side Bar'),
            },
            when: ContextKeyExpr.and(AuxiliaryBarVisibleContext, ContextKeyExpr.equals('viewContainerLocation', ViewContainerLocationToString(2 /* ViewContainerLocation.AuxiliaryBar */))),
            order: 2
        }
    }
]);
registerAction2(class extends SwitchCompositeViewAction {
    constructor() {
        super({
            id: 'workbench.action.previousAuxiliaryBarView',
            title: localize2('previousAuxiliaryBarView', 'Previous Void Side Bar View'),
            category: Categories.View,
            f1: true
        }, 2 /* ViewContainerLocation.AuxiliaryBar */, -1);
    }
});
registerAction2(class extends SwitchCompositeViewAction {
    constructor() {
        super({
            id: 'workbench.action.nextAuxiliaryBarView',
            title: localize2('nextAuxiliaryBarView', 'Next Void Side Bar View'),
            category: Categories.View,
            f1: true
        }, 2 /* ViewContainerLocation.AuxiliaryBar */, 1);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV4aWxpYXJ5QmFyQWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL3BhcnRzL2F1eGlsaWFyeWJhci9hdXhpbGlhcnlCYXJBY3Rpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RCxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQ3pELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLFlBQVksRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNoSCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDdEYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ2pGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw4REFBOEQsQ0FBQztBQUMxRixPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUM1RSxPQUFPLEVBQXlCLDZCQUE2QixFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDaEcsT0FBTyxFQUF1Qix1QkFBdUIsRUFBeUIsTUFBTSxtREFBbUQsQ0FBQztBQUN4SSxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUlyRyxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUN0RSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFFckQsTUFBTSxxQkFBcUIsR0FBRyxZQUFZLENBQUMsZ0NBQWdDLEVBQUUsT0FBTyxDQUFDLGtCQUFrQixFQUFFLFFBQVEsQ0FBQywwQkFBMEIsRUFBRSw2REFB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