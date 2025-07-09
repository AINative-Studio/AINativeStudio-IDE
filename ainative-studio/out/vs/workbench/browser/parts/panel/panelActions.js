/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import './media/panelpart.css';
import { localize, localize2 } from '../../../../nls.js';
import { MenuId, MenuRegistry, registerAction2, Action2 } from '../../../../platform/actions/common/actions.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { isHorizontal, IWorkbenchLayoutService, positionToString } from '../../../services/layout/browser/layoutService.js';
import { PanelAlignmentContext, PanelMaximizedContext, PanelPositionContext, PanelVisibleContext } from '../../../common/contextkeys.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { IPaneCompositePartService } from '../../../services/panecomposite/browser/panecomposite.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { SwitchCompositeViewAction } from '../compositeBarActions.js';
const maximizeIcon = registerIcon('panel-maximize', Codicon.chevronUp, localize('maximizeIcon', 'Icon to maximize a panel.'));
const restoreIcon = registerIcon('panel-restore', Codicon.chevronDown, localize('restoreIcon', 'Icon to restore a panel.'));
export const closeIcon = registerIcon('panel-close', Codicon.close, localize('closeIcon', 'Icon to close a panel.'));
const panelIcon = registerIcon('panel-layout-icon', Codicon.layoutPanel, localize('togglePanelOffIcon', 'Icon to toggle the panel off when it is on.'));
const panelOffIcon = registerIcon('panel-layout-icon-off', Codicon.layoutPanelOff, localize('togglePanelOnIcon', 'Icon to toggle the panel on when it is off.'));
export class TogglePanelAction extends Action2 {
    static { this.ID = 'workbench.action.togglePanel'; }
    static { this.LABEL = localize2('togglePanelVisibility', "Toggle Panel Visibility"); }
    constructor() {
        super({
            id: TogglePanelAction.ID,
            title: TogglePanelAction.LABEL,
            toggled: {
                condition: PanelVisibleContext,
                title: localize('closePanel', 'Hide Panel'),
                icon: closeIcon,
                mnemonicTitle: localize({ key: 'toggle panel mnemonic', comment: ['&& denotes a mnemonic'] }, "&&Panel"),
            },
            icon: closeIcon, // Ensures no flickering when using toggled.icon
            f1: true,
            category: Categories.View,
            metadata: {
                description: localize('openAndClosePanel', 'Open/Show and Close/Hide Panel'),
            },
            keybinding: { primary: 2048 /* KeyMod.CtrlCmd */ | 40 /* KeyCode.KeyJ */, weight: 200 /* KeybindingWeight.WorkbenchContrib */ },
            menu: [
                {
                    id: MenuId.MenubarAppearanceMenu,
                    group: '2_workbench_layout',
                    order: 5
                }, {
                    id: MenuId.LayoutControlMenuSubmenu,
                    group: '0_workbench_layout',
                    order: 4
                }, {
                    id: MenuId.PanelTitle,
                    group: 'navigation',
                    order: 2
                }
            ]
        });
    }
    async run(accessor) {
        const layoutService = accessor.get(IWorkbenchLayoutService);
        layoutService.setPartHidden(layoutService.isVisible("workbench.parts.panel" /* Parts.PANEL_PART */), "workbench.parts.panel" /* Parts.PANEL_PART */);
    }
}
registerAction2(TogglePanelAction);
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.closePanel',
            title: localize2('closePanel', 'Hide Panel'),
            category: Categories.View,
            precondition: PanelVisibleContext,
            f1: true,
        });
    }
    run(accessor) {
        accessor.get(IWorkbenchLayoutService).setPartHidden(true, "workbench.parts.panel" /* Parts.PANEL_PART */);
    }
});
registerAction2(class extends Action2 {
    static { this.ID = 'workbench.action.focusPanel'; }
    static { this.LABEL = localize('focusPanel', "Focus into Panel"); }
    constructor() {
        super({
            id: 'workbench.action.focusPanel',
            title: localize2('focusPanel', "Focus into Panel"),
            category: Categories.View,
            f1: true,
        });
    }
    async run(accessor) {
        const layoutService = accessor.get(IWorkbenchLayoutService);
        const paneCompositeService = accessor.get(IPaneCompositePartService);
        // Show panel
        if (!layoutService.isVisible("workbench.parts.panel" /* Parts.PANEL_PART */)) {
            layoutService.setPartHidden(false, "workbench.parts.panel" /* Parts.PANEL_PART */);
        }
        // Focus into active panel
        const panel = paneCompositeService.getActivePaneComposite(1 /* ViewContainerLocation.Panel */);
        panel?.focus();
    }
});
const PositionPanelActionId = {
    LEFT: 'workbench.action.positionPanelLeft',
    RIGHT: 'workbench.action.positionPanelRight',
    BOTTOM: 'workbench.action.positionPanelBottom',
    TOP: 'workbench.action.positionPanelTop'
};
const AlignPanelActionId = {
    LEFT: 'workbench.action.alignPanelLeft',
    RIGHT: 'workbench.action.alignPanelRight',
    CENTER: 'workbench.action.alignPanelCenter',
    JUSTIFY: 'workbench.action.alignPanelJustify',
};
function createPanelActionConfig(id, title, shortLabel, value, when) {
    return {
        id,
        title,
        shortLabel,
        value,
        when,
    };
}
function createPositionPanelActionConfig(id, title, shortLabel, position) {
    return createPanelActionConfig(id, title, shortLabel, position, PanelPositionContext.notEqualsTo(positionToString(position)));
}
function createAlignmentPanelActionConfig(id, title, shortLabel, alignment) {
    return createPanelActionConfig(id, title, shortLabel, alignment, PanelAlignmentContext.notEqualsTo(alignment));
}
const PositionPanelActionConfigs = [
    createPositionPanelActionConfig(PositionPanelActionId.TOP, localize2('positionPanelTop', "Move Panel To Top"), localize('positionPanelTopShort', "Top"), 3 /* Position.TOP */),
    createPositionPanelActionConfig(PositionPanelActionId.LEFT, localize2('positionPanelLeft', "Move Panel Left"), localize('positionPanelLeftShort', "Left"), 0 /* Position.LEFT */),
    createPositionPanelActionConfig(PositionPanelActionId.RIGHT, localize2('positionPanelRight', "Move Panel Right"), localize('positionPanelRightShort', "Right"), 1 /* Position.RIGHT */),
    createPositionPanelActionConfig(PositionPanelActionId.BOTTOM, localize2('positionPanelBottom', "Move Panel To Bottom"), localize('positionPanelBottomShort', "Bottom"), 2 /* Position.BOTTOM */),
];
const AlignPanelActionConfigs = [
    createAlignmentPanelActionConfig(AlignPanelActionId.LEFT, localize2('alignPanelLeft', "Set Panel Alignment to Left"), localize('alignPanelLeftShort', "Left"), 'left'),
    createAlignmentPanelActionConfig(AlignPanelActionId.RIGHT, localize2('alignPanelRight', "Set Panel Alignment to Right"), localize('alignPanelRightShort', "Right"), 'right'),
    createAlignmentPanelActionConfig(AlignPanelActionId.CENTER, localize2('alignPanelCenter', "Set Panel Alignment to Center"), localize('alignPanelCenterShort', "Center"), 'center'),
    createAlignmentPanelActionConfig(AlignPanelActionId.JUSTIFY, localize2('alignPanelJustify', "Set Panel Alignment to Justify"), localize('alignPanelJustifyShort', "Justify"), 'justify'),
];
MenuRegistry.appendMenuItem(MenuId.MenubarAppearanceMenu, {
    submenu: MenuId.PanelPositionMenu,
    title: localize('positionPanel', "Panel Position"),
    group: '3_workbench_layout_move',
    order: 4
});
PositionPanelActionConfigs.forEach((positionPanelAction, index) => {
    const { id, title, shortLabel, value, when } = positionPanelAction;
    registerAction2(class extends Action2 {
        constructor() {
            super({
                id,
                title,
                category: Categories.View,
                f1: true
            });
        }
        run(accessor) {
            const layoutService = accessor.get(IWorkbenchLayoutService);
            layoutService.setPanelPosition(value === undefined ? 2 /* Position.BOTTOM */ : value);
        }
    });
    MenuRegistry.appendMenuItem(MenuId.PanelPositionMenu, {
        command: {
            id,
            title: shortLabel,
            toggled: when.negate()
        },
        order: 5 + index
    });
});
MenuRegistry.appendMenuItem(MenuId.MenubarAppearanceMenu, {
    submenu: MenuId.PanelAlignmentMenu,
    title: localize('alignPanel', "Align Panel"),
    group: '3_workbench_layout_move',
    order: 5
});
AlignPanelActionConfigs.forEach(alignPanelAction => {
    const { id, title, shortLabel, value, when } = alignPanelAction;
    registerAction2(class extends Action2 {
        constructor() {
            super({
                id,
                title,
                category: Categories.View,
                toggled: when.negate(),
                f1: true
            });
        }
        run(accessor) {
            const layoutService = accessor.get(IWorkbenchLayoutService);
            layoutService.setPanelAlignment(value === undefined ? 'center' : value);
        }
    });
    MenuRegistry.appendMenuItem(MenuId.PanelAlignmentMenu, {
        command: {
            id,
            title: shortLabel,
            toggled: when.negate()
        },
        order: 5
    });
});
registerAction2(class extends SwitchCompositeViewAction {
    constructor() {
        super({
            id: 'workbench.action.previousPanelView',
            title: localize2('previousPanelView', "Previous Panel View"),
            category: Categories.View,
            f1: true
        }, 1 /* ViewContainerLocation.Panel */, -1);
    }
});
registerAction2(class extends SwitchCompositeViewAction {
    constructor() {
        super({
            id: 'workbench.action.nextPanelView',
            title: localize2('nextPanelView', "Next Panel View"),
            category: Categories.View,
            f1: true
        }, 1 /* ViewContainerLocation.Panel */, 1);
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.toggleMaximizedPanel',
            title: localize2('toggleMaximizedPanel', 'Toggle Maximized Panel'),
            tooltip: localize('maximizePanel', "Maximize Panel Size"),
            category: Categories.View,
            f1: true,
            icon: maximizeIcon, // This is being rotated in CSS depending on the panel position
            // the workbench grid currently prevents us from supporting panel maximization with non-center panel alignment
            precondition: ContextKeyExpr.or(PanelAlignmentContext.isEqualTo('center'), ContextKeyExpr.and(PanelPositionContext.notEqualsTo('bottom'), PanelPositionContext.notEqualsTo('top'))),
            toggled: { condition: PanelMaximizedContext, icon: restoreIcon, tooltip: localize('minimizePanel', "Restore Panel Size") },
            menu: [{
                    id: MenuId.PanelTitle,
                    group: 'navigation',
                    order: 1,
                    // the workbench grid currently prevents us from supporting panel maximization with non-center panel alignment
                    when: ContextKeyExpr.or(PanelAlignmentContext.isEqualTo('center'), ContextKeyExpr.and(PanelPositionContext.notEqualsTo('bottom'), PanelPositionContext.notEqualsTo('top')))
                }]
        });
    }
    run(accessor) {
        const layoutService = accessor.get(IWorkbenchLayoutService);
        const notificationService = accessor.get(INotificationService);
        if (layoutService.getPanelAlignment() !== 'center' && isHorizontal(layoutService.getPanelPosition())) {
            notificationService.warn(localize('panelMaxNotSupported', "Maximizing the panel is only supported when it is center aligned."));
            return;
        }
        if (!layoutService.isVisible("workbench.parts.panel" /* Parts.PANEL_PART */)) {
            layoutService.setPartHidden(false, "workbench.parts.panel" /* Parts.PANEL_PART */);
            // If the panel is not already maximized, maximize it
            if (!layoutService.isPanelMaximized()) {
                layoutService.toggleMaximizedPanel();
            }
        }
        else {
            layoutService.toggleMaximizedPanel();
        }
    }
});
MenuRegistry.appendMenuItems([
    {
        id: MenuId.LayoutControlMenu,
        item: {
            group: '2_pane_toggles',
            command: {
                id: TogglePanelAction.ID,
                title: localize('togglePanel', "Toggle Panel"),
                icon: panelOffIcon,
                toggled: { condition: PanelVisibleContext, icon: panelIcon }
            },
            when: ContextKeyExpr.or(ContextKeyExpr.equals('config.workbench.layoutControl.type', 'toggles'), ContextKeyExpr.equals('config.workbench.layoutControl.type', 'both')),
            order: 1
        }
    }
]);
class MoveViewsBetweenPanelsAction extends Action2 {
    constructor(source, destination, desc) {
        super(desc);
        this.source = source;
        this.destination = destination;
    }
    run(accessor, ...args) {
        const viewDescriptorService = accessor.get(IViewDescriptorService);
        const layoutService = accessor.get(IWorkbenchLayoutService);
        const viewsService = accessor.get(IViewsService);
        const srcContainers = viewDescriptorService.getViewContainersByLocation(this.source);
        const destContainers = viewDescriptorService.getViewContainersByLocation(this.destination);
        if (srcContainers.length) {
            const activeViewContainer = viewsService.getVisibleViewContainer(this.source);
            srcContainers.forEach(viewContainer => viewDescriptorService.moveViewContainerToLocation(viewContainer, this.destination, undefined, this.desc.id));
            layoutService.setPartHidden(false, this.destination === 1 /* ViewContainerLocation.Panel */ ? "workbench.parts.panel" /* Parts.PANEL_PART */ : "workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */);
            if (activeViewContainer && destContainers.length === 0) {
                viewsService.openViewContainer(activeViewContainer.id, true);
            }
        }
    }
}
// --- Move Panel Views To Void Side Bar
class MovePanelToSidePanelAction extends MoveViewsBetweenPanelsAction {
    static { this.ID = 'workbench.action.movePanelToSidePanel'; }
    constructor() {
        super(1 /* ViewContainerLocation.Panel */, 2 /* ViewContainerLocation.AuxiliaryBar */, {
            id: MovePanelToSidePanelAction.ID,
            title: localize2('movePanelToSecondarySideBar', "Move Panel Views To Void Side Bar"),
            category: Categories.View,
            f1: false
        });
    }
}
export class MovePanelToSecondarySideBarAction extends MoveViewsBetweenPanelsAction {
    static { this.ID = 'workbench.action.movePanelToSecondarySideBar'; }
    constructor() {
        super(1 /* ViewContainerLocation.Panel */, 2 /* ViewContainerLocation.AuxiliaryBar */, {
            id: MovePanelToSecondarySideBarAction.ID,
            title: localize2('movePanelToSecondarySideBar', "Move Panel Views To Void Side Bar"),
            category: Categories.View,
            f1: true
        });
    }
}
registerAction2(MovePanelToSidePanelAction);
registerAction2(MovePanelToSecondarySideBarAction);
// --- Move Void Side Bar Views To Panel
class MoveSidePanelToPanelAction extends MoveViewsBetweenPanelsAction {
    static { this.ID = 'workbench.action.moveSidePanelToPanel'; }
    constructor() {
        super(2 /* ViewContainerLocation.AuxiliaryBar */, 1 /* ViewContainerLocation.Panel */, {
            id: MoveSidePanelToPanelAction.ID,
            title: localize2('moveSidePanelToPanel', "Move Void Side Bar Views To Panel"),
            category: Categories.View,
            f1: false
        });
    }
}
export class MoveSecondarySideBarToPanelAction extends MoveViewsBetweenPanelsAction {
    static { this.ID = 'workbench.action.moveSecondarySideBarToPanel'; }
    constructor() {
        super(2 /* ViewContainerLocation.AuxiliaryBar */, 1 /* ViewContainerLocation.Panel */, {
            id: MoveSecondarySideBarToPanelAction.ID,
            title: localize2('moveSidePanelToPanel', "Move Void Side Bar Views To Panel"),
            category: Categories.View,
            f1: true
        });
    }
}
registerAction2(MoveSidePanelToPanelAction);
registerAction2(MoveSecondarySideBarToPanelAction);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFuZWxBY3Rpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL3BhcnRzL3BhbmVsL3BhbmVsQWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLHVCQUF1QixDQUFDO0FBQy9CLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFFekQsT0FBTyxFQUFFLE1BQU0sRUFBRSxZQUFZLEVBQUUsZUFBZSxFQUFFLE9BQU8sRUFBbUIsTUFBTSxnREFBZ0QsQ0FBQztBQUNqSSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sOERBQThELENBQUM7QUFDMUYsT0FBTyxFQUFFLFlBQVksRUFBRSx1QkFBdUIsRUFBbUMsZ0JBQWdCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUM3SixPQUFPLEVBQUUscUJBQXFCLEVBQUUscUJBQXFCLEVBQUUsb0JBQW9CLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUN6SSxPQUFPLEVBQUUsY0FBYyxFQUF3QixNQUFNLHNEQUFzRCxDQUFDO0FBQzVHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFFakYsT0FBTyxFQUF5QixzQkFBc0IsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQ3pGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUMvRSxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUNyRyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUdoRyxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFB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