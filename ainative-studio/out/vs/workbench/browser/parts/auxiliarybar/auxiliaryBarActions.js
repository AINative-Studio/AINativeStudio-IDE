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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV4aWxpYXJ5QmFyQWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYnJvd3Nlci9wYXJ0cy9hdXhpbGlhcnliYXIvYXV4aWxpYXJ5QmFyQWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDOUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUN6RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxZQUFZLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDaEgsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUNqRixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sOERBQThELENBQUM7QUFDMUYsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDNUUsT0FBTyxFQUF5Qiw2QkFBNkIsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQ2hHLE9BQU8sRUFBdUIsdUJBQXVCLEVBQXlCLE1BQU0sbURBQW1ELENBQUM7QUFDeEksT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sMERBQTBELENBQUM7QUFJckcsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDdEUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBRXJELE1BQU0scUJBQXFCLEdBQUcsWUFBWSxDQUFDLGdDQUFnQyxFQUFFLE9BQU8sQ0FBQyxrQkFBa0IsRUFBRSxRQUFRLENBQUMsMEJBQTBCLEVBQUUsNkRB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