/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize2 } from '../../../nls.js';
import { IEditorGroupsService } from '../../services/editor/common/editorGroupsService.js';
import { IWorkbenchLayoutService } from '../../services/layout/browser/layoutService.js';
import { Action2, registerAction2 } from '../../../platform/actions/common/actions.js';
import { Categories } from '../../../platform/action/common/actionCommonCategories.js';
import { IEditorService } from '../../services/editor/common/editorService.js';
import { IPaneCompositePartService } from '../../services/panecomposite/browser/panecomposite.js';
import { getActiveWindow } from '../../../base/browser/dom.js';
import { isAuxiliaryWindow } from '../../../base/browser/window.js';
class BaseNavigationAction extends Action2 {
    constructor(options, direction) {
        super(options);
        this.direction = direction;
    }
    run(accessor) {
        const layoutService = accessor.get(IWorkbenchLayoutService);
        const editorGroupService = accessor.get(IEditorGroupsService);
        const paneCompositeService = accessor.get(IPaneCompositePartService);
        const isEditorFocus = layoutService.hasFocus("workbench.parts.editor" /* Parts.EDITOR_PART */);
        const isPanelFocus = layoutService.hasFocus("workbench.parts.panel" /* Parts.PANEL_PART */);
        const isSidebarFocus = layoutService.hasFocus("workbench.parts.sidebar" /* Parts.SIDEBAR_PART */);
        const isAuxiliaryBarFocus = layoutService.hasFocus("workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */);
        let neighborPart;
        if (isEditorFocus) {
            const didNavigate = this.navigateAcrossEditorGroup(this.toGroupDirection(this.direction), editorGroupService);
            if (didNavigate) {
                return;
            }
            neighborPart = layoutService.getVisibleNeighborPart("workbench.parts.editor" /* Parts.EDITOR_PART */, this.direction);
        }
        if (isPanelFocus) {
            neighborPart = layoutService.getVisibleNeighborPart("workbench.parts.panel" /* Parts.PANEL_PART */, this.direction);
        }
        if (isSidebarFocus) {
            neighborPart = layoutService.getVisibleNeighborPart("workbench.parts.sidebar" /* Parts.SIDEBAR_PART */, this.direction);
        }
        if (isAuxiliaryBarFocus) {
            neighborPart = neighborPart = layoutService.getVisibleNeighborPart("workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */, this.direction);
        }
        if (neighborPart === "workbench.parts.editor" /* Parts.EDITOR_PART */) {
            if (!this.navigateBackToEditorGroup(this.toGroupDirection(this.direction), editorGroupService)) {
                this.navigateToEditorGroup(this.direction === 3 /* Direction.Right */ ? 0 /* GroupLocation.FIRST */ : 1 /* GroupLocation.LAST */, editorGroupService);
            }
        }
        else if (neighborPart === "workbench.parts.sidebar" /* Parts.SIDEBAR_PART */) {
            this.navigateToSidebar(layoutService, paneCompositeService);
        }
        else if (neighborPart === "workbench.parts.panel" /* Parts.PANEL_PART */) {
            this.navigateToPanel(layoutService, paneCompositeService);
        }
        else if (neighborPart === "workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */) {
            this.navigateToAuxiliaryBar(layoutService, paneCompositeService);
        }
    }
    async navigateToPanel(layoutService, paneCompositeService) {
        if (!layoutService.isVisible("workbench.parts.panel" /* Parts.PANEL_PART */)) {
            return false;
        }
        const activePanel = paneCompositeService.getActivePaneComposite(1 /* ViewContainerLocation.Panel */);
        if (!activePanel) {
            return false;
        }
        const activePanelId = activePanel.getId();
        const res = await paneCompositeService.openPaneComposite(activePanelId, 1 /* ViewContainerLocation.Panel */, true);
        if (!res) {
            return false;
        }
        return res;
    }
    async navigateToSidebar(layoutService, paneCompositeService) {
        if (!layoutService.isVisible("workbench.parts.sidebar" /* Parts.SIDEBAR_PART */)) {
            return false;
        }
        const activeViewlet = paneCompositeService.getActivePaneComposite(0 /* ViewContainerLocation.Sidebar */);
        if (!activeViewlet) {
            return false;
        }
        const activeViewletId = activeViewlet.getId();
        const viewlet = await paneCompositeService.openPaneComposite(activeViewletId, 0 /* ViewContainerLocation.Sidebar */, true);
        return !!viewlet;
    }
    async navigateToAuxiliaryBar(layoutService, paneCompositeService) {
        if (!layoutService.isVisible("workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */)) {
            return false;
        }
        const activePanel = paneCompositeService.getActivePaneComposite(2 /* ViewContainerLocation.AuxiliaryBar */);
        if (!activePanel) {
            return false;
        }
        const activePanelId = activePanel.getId();
        const res = await paneCompositeService.openPaneComposite(activePanelId, 2 /* ViewContainerLocation.AuxiliaryBar */, true);
        if (!res) {
            return false;
        }
        return res;
    }
    navigateAcrossEditorGroup(direction, editorGroupService) {
        return this.doNavigateToEditorGroup({ direction }, editorGroupService);
    }
    navigateToEditorGroup(location, editorGroupService) {
        return this.doNavigateToEditorGroup({ location }, editorGroupService);
    }
    navigateBackToEditorGroup(direction, editorGroupService) {
        if (!editorGroupService.activeGroup) {
            return false;
        }
        const oppositeDirection = this.toOppositeDirection(direction);
        // Check to see if there is a group in between the last
        // active group and the direction of movement
        const groupInBetween = editorGroupService.findGroup({ direction: oppositeDirection }, editorGroupService.activeGroup);
        if (!groupInBetween) {
            // No group in between means we can return
            // focus to the last active editor group
            editorGroupService.activeGroup.focus();
            return true;
        }
        return false;
    }
    toGroupDirection(direction) {
        switch (direction) {
            case 1 /* Direction.Down */: return 1 /* GroupDirection.DOWN */;
            case 2 /* Direction.Left */: return 2 /* GroupDirection.LEFT */;
            case 3 /* Direction.Right */: return 3 /* GroupDirection.RIGHT */;
            case 0 /* Direction.Up */: return 0 /* GroupDirection.UP */;
        }
    }
    toOppositeDirection(direction) {
        switch (direction) {
            case 0 /* GroupDirection.UP */: return 1 /* GroupDirection.DOWN */;
            case 3 /* GroupDirection.RIGHT */: return 2 /* GroupDirection.LEFT */;
            case 2 /* GroupDirection.LEFT */: return 3 /* GroupDirection.RIGHT */;
            case 1 /* GroupDirection.DOWN */: return 0 /* GroupDirection.UP */;
        }
    }
    doNavigateToEditorGroup(scope, editorGroupService) {
        const targetGroup = editorGroupService.findGroup(scope, editorGroupService.activeGroup);
        if (targetGroup) {
            targetGroup.focus();
            return true;
        }
        return false;
    }
}
registerAction2(class extends BaseNavigationAction {
    constructor() {
        super({
            id: 'workbench.action.navigateLeft',
            title: localize2('navigateLeft', 'Navigate to the View on the Left'),
            category: Categories.View,
            f1: true
        }, 2 /* Direction.Left */);
    }
});
registerAction2(class extends BaseNavigationAction {
    constructor() {
        super({
            id: 'workbench.action.navigateRight',
            title: localize2('navigateRight', 'Navigate to the View on the Right'),
            category: Categories.View,
            f1: true
        }, 3 /* Direction.Right */);
    }
});
registerAction2(class extends BaseNavigationAction {
    constructor() {
        super({
            id: 'workbench.action.navigateUp',
            title: localize2('navigateUp', 'Navigate to the View Above'),
            category: Categories.View,
            f1: true
        }, 0 /* Direction.Up */);
    }
});
registerAction2(class extends BaseNavigationAction {
    constructor() {
        super({
            id: 'workbench.action.navigateDown',
            title: localize2('navigateDown', 'Navigate to the View Below'),
            category: Categories.View,
            f1: true
        }, 1 /* Direction.Down */);
    }
});
class BaseFocusAction extends Action2 {
    constructor(options, focusNext) {
        super(options);
        this.focusNext = focusNext;
    }
    run(accessor) {
        const layoutService = accessor.get(IWorkbenchLayoutService);
        const editorService = accessor.get(IEditorService);
        this.focusNextOrPreviousPart(layoutService, editorService, this.focusNext);
    }
    findVisibleNeighbour(layoutService, part, next) {
        const activeWindow = getActiveWindow();
        const windowIsAuxiliary = isAuxiliaryWindow(activeWindow);
        let neighbour;
        if (windowIsAuxiliary) {
            switch (part) {
                case "workbench.parts.editor" /* Parts.EDITOR_PART */:
                    neighbour = "workbench.parts.statusbar" /* Parts.STATUSBAR_PART */;
                    break;
                default:
                    neighbour = "workbench.parts.editor" /* Parts.EDITOR_PART */;
            }
        }
        else {
            switch (part) {
                case "workbench.parts.editor" /* Parts.EDITOR_PART */:
                    neighbour = next ? "workbench.parts.panel" /* Parts.PANEL_PART */ : "workbench.parts.sidebar" /* Parts.SIDEBAR_PART */;
                    break;
                case "workbench.parts.panel" /* Parts.PANEL_PART */:
                    neighbour = next ? "workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */ : "workbench.parts.editor" /* Parts.EDITOR_PART */;
                    break;
                case "workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */:
                    neighbour = next ? "workbench.parts.statusbar" /* Parts.STATUSBAR_PART */ : "workbench.parts.panel" /* Parts.PANEL_PART */;
                    break;
                case "workbench.parts.statusbar" /* Parts.STATUSBAR_PART */:
                    neighbour = next ? "workbench.parts.activitybar" /* Parts.ACTIVITYBAR_PART */ : "workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */;
                    break;
                case "workbench.parts.activitybar" /* Parts.ACTIVITYBAR_PART */:
                    neighbour = next ? "workbench.parts.sidebar" /* Parts.SIDEBAR_PART */ : "workbench.parts.statusbar" /* Parts.STATUSBAR_PART */;
                    break;
                case "workbench.parts.sidebar" /* Parts.SIDEBAR_PART */:
                    neighbour = next ? "workbench.parts.editor" /* Parts.EDITOR_PART */ : "workbench.parts.activitybar" /* Parts.ACTIVITYBAR_PART */;
                    break;
                default:
                    neighbour = "workbench.parts.editor" /* Parts.EDITOR_PART */;
            }
        }
        if (layoutService.isVisible(neighbour, activeWindow) || neighbour === "workbench.parts.editor" /* Parts.EDITOR_PART */) {
            return neighbour;
        }
        return this.findVisibleNeighbour(layoutService, neighbour, next);
    }
    focusNextOrPreviousPart(layoutService, editorService, next) {
        let currentlyFocusedPart;
        if (editorService.activeEditorPane?.hasFocus() || layoutService.hasFocus("workbench.parts.editor" /* Parts.EDITOR_PART */)) {
            currentlyFocusedPart = "workbench.parts.editor" /* Parts.EDITOR_PART */;
        }
        else if (layoutService.hasFocus("workbench.parts.activitybar" /* Parts.ACTIVITYBAR_PART */)) {
            currentlyFocusedPart = "workbench.parts.activitybar" /* Parts.ACTIVITYBAR_PART */;
        }
        else if (layoutService.hasFocus("workbench.parts.statusbar" /* Parts.STATUSBAR_PART */)) {
            currentlyFocusedPart = "workbench.parts.statusbar" /* Parts.STATUSBAR_PART */;
        }
        else if (layoutService.hasFocus("workbench.parts.sidebar" /* Parts.SIDEBAR_PART */)) {
            currentlyFocusedPart = "workbench.parts.sidebar" /* Parts.SIDEBAR_PART */;
        }
        else if (layoutService.hasFocus("workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */)) {
            currentlyFocusedPart = "workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */;
        }
        else if (layoutService.hasFocus("workbench.parts.panel" /* Parts.PANEL_PART */)) {
            currentlyFocusedPart = "workbench.parts.panel" /* Parts.PANEL_PART */;
        }
        layoutService.focusPart(currentlyFocusedPart ? this.findVisibleNeighbour(layoutService, currentlyFocusedPart, next) : "workbench.parts.editor" /* Parts.EDITOR_PART */, getActiveWindow());
    }
}
registerAction2(class extends BaseFocusAction {
    constructor() {
        super({
            id: 'workbench.action.focusNextPart',
            title: localize2('focusNextPart', 'Focus Next Part'),
            category: Categories.View,
            f1: true,
            keybinding: {
                primary: 64 /* KeyCode.F6 */,
                weight: 200 /* KeybindingWeight.WorkbenchContrib */
            }
        }, true);
    }
});
registerAction2(class extends BaseFocusAction {
    constructor() {
        super({
            id: 'workbench.action.focusPreviousPart',
            title: localize2('focusPreviousPart', 'Focus Previous Part'),
            category: Categories.View,
            f1: true,
            keybinding: {
                primary: 1024 /* KeyMod.Shift */ | 64 /* KeyCode.F6 */,
                weight: 200 /* KeybindingWeight.WorkbenchContrib */
            }
        }, false);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmF2aWdhdGlvbkFjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2Jyb3dzZXIvYWN0aW9ucy9uYXZpZ2F0aW9uQWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDNUMsT0FBTyxFQUFFLG9CQUFvQixFQUFrRCxNQUFNLHFEQUFxRCxDQUFDO0FBQzNJLE9BQU8sRUFBRSx1QkFBdUIsRUFBUyxNQUFNLGdEQUFnRCxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxPQUFPLEVBQW1CLGVBQWUsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ3hHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQUd2RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFHL0UsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFJbEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQy9ELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBRXBFLE1BQWUsb0JBQXFCLFNBQVEsT0FBTztJQUVsRCxZQUNDLE9BQXdCLEVBQ2QsU0FBb0I7UUFFOUIsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBRkwsY0FBUyxHQUFULFNBQVMsQ0FBVztJQUcvQixDQUFDO0lBRUQsR0FBRyxDQUFDLFFBQTBCO1FBQzdCLE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsdUJBQXVCLENBQUMsQ0FBQztRQUM1RCxNQUFNLGtCQUFrQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsQ0FBQztRQUM5RCxNQUFNLG9CQUFvQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMseUJBQXlCLENBQUMsQ0FBQztRQUVyRSxNQUFNLGFBQWEsR0FBRyxhQUFhLENBQUMsUUFBUSxrREFBbUIsQ0FBQztRQUNoRSxNQUFNLFlBQVksR0FBRyxhQUFhLENBQUMsUUFBUSxnREFBa0IsQ0FBQztRQUM5RCxNQUFNLGNBQWMsR0FBRyxhQUFhLENBQUMsUUFBUSxvREFBb0IsQ0FBQztRQUNsRSxNQUFNLG1CQUFtQixHQUFHLGFBQWEsQ0FBQyxRQUFRLDhEQUF5QixDQUFDO1FBRTVFLElBQUksWUFBK0IsQ0FBQztRQUNwQyxJQUFJLGFBQWEsRUFBRSxDQUFDO1lBQ25CLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLGtCQUFrQixDQUFDLENBQUM7WUFDOUcsSUFBSSxXQUFXLEVBQUUsQ0FBQztnQkFDakIsT0FBTztZQUNSLENBQUM7WUFFRCxZQUFZLEdBQUcsYUFBYSxDQUFDLHNCQUFzQixtREFBb0IsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ3hGLENBQUM7UUFFRCxJQUFJLFlBQVksRUFBRSxDQUFDO1lBQ2xCLFlBQVksR0FBRyxhQUFhLENBQUMsc0JBQXNCLGlEQUFtQixJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDdkYsQ0FBQztRQUVELElBQUksY0FBYyxFQUFFLENBQUM7WUFDcEIsWUFBWSxHQUFHLGFBQWEsQ0FBQyxzQkFBc0IscURBQXFCLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUN6RixDQUFDO1FBRUQsSUFBSSxtQkFBbUIsRUFBRSxDQUFDO1lBQ3pCLFlBQVksR0FBRyxZQUFZLEdBQUcsYUFBYSxDQUFDLHNCQUFzQiwrREFBMEIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQzdHLENBQUM7UUFFRCxJQUFJLFlBQVkscURBQXNCLEVBQUUsQ0FBQztZQUN4QyxJQUFJLENBQUMsSUFBSSxDQUFDLHlCQUF5QixDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsa0JBQWtCLENBQUMsRUFBRSxDQUFDO2dCQUNoRyxJQUFJLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLFNBQVMsNEJBQW9CLENBQUMsQ0FBQyw2QkFBcUIsQ0FBQywyQkFBbUIsRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO1lBQy9ILENBQUM7UUFDRixDQUFDO2FBQU0sSUFBSSxZQUFZLHVEQUF1QixFQUFFLENBQUM7WUFDaEQsSUFBSSxDQUFDLGlCQUFpQixDQUFDLGFBQWEsRUFBRSxvQkFBb0IsQ0FBQyxDQUFDO1FBQzdELENBQUM7YUFBTSxJQUFJLFlBQVksbURBQXFCLEVBQUUsQ0FBQztZQUM5QyxJQUFJLENBQUMsZUFBZSxDQUFDLGFBQWEsRUFBRSxvQkFBb0IsQ0FBQyxDQUFDO1FBQzNELENBQUM7YUFBTSxJQUFJLFlBQVksaUVBQTRCLEVBQUUsQ0FBQztZQUNyRCxJQUFJLENBQUMsc0JBQXNCLENBQUMsYUFBYSxFQUFFLG9CQUFvQixDQUFDLENBQUM7UUFDbEUsQ0FBQztJQUNGLENBQUM7SUFFTyxLQUFLLENBQUMsZUFBZSxDQUFDLGFBQXNDLEVBQUUsb0JBQStDO1FBQ3BILElBQUksQ0FBQyxhQUFhLENBQUMsU0FBUyxnREFBa0IsRUFBRSxDQUFDO1lBQ2hELE9BQU8sS0FBSyxDQUFDO1FBQ2QsQ0FBQztRQUVELE1BQU0sV0FBVyxHQUFHLG9CQUFvQixDQUFDLHNCQUFzQixxQ0FBNkIsQ0FBQztRQUM3RixJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDbEIsT0FBTyxLQUFLLENBQUM7UUFDZCxDQUFDO1FBRUQsTUFBTSxhQUFhLEdBQUcsV0FBVyxDQUFDLEtBQUssRUFBRSxDQUFDO1FBRTFDLE1BQU0sR0FBRyxHQUFHLE1BQU0sb0JBQW9CLENBQUMsaUJBQWlCLENBQUMsYUFBYSx1Q0FBK0IsSUFBSSxDQUFDLENBQUM7UUFDM0csSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO1lBQ1YsT0FBTyxLQUFLLENBQUM7UUFDZCxDQUFDO1FBRUQsT0FBTyxHQUFHLENBQUM7SUFDWixDQUFDO0lBRU8sS0FBSyxDQUFDLGlCQUFpQixDQUFDLGFBQXNDLEVBQUUsb0JBQStDO1FBQ3RILElBQUksQ0FBQyxhQUFhLENBQUMsU0FBUyxvREFBb0IsRUFBRSxDQUFDO1lBQ2xELE9BQU8sS0FBSyxDQUFDO1FBQ2QsQ0FBQztRQUVELE1BQU0sYUFBYSxHQUFHLG9CQUFvQixDQUFDLHNCQUFzQix1Q0FBK0IsQ0FBQztRQUNqRyxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDcEIsT0FBTyxLQUFLLENBQUM7UUFDZCxDQUFDO1FBQ0QsTUFBTSxlQUFlLEdBQUcsYUFBYSxDQUFDLEtBQUssRUFBRSxDQUFDO1FBRTlDLE1BQU0sT0FBTyxHQUFHLE1BQU0sb0JBQW9CLENBQUMsaUJBQWlCLENBQUMsZUFBZSx5Q0FBaUMsSUFBSSxDQUFDLENBQUM7UUFDbkgsT0FBTyxDQUFDLENBQUMsT0FBTyxDQUFDO0lBQ2xCLENBQUM7SUFFTyxLQUFLLENBQUMsc0JBQXNCLENBQUMsYUFBc0MsRUFBRSxvQkFBK0M7UUFDM0gsSUFBSSxDQUFDLGFBQWEsQ0FBQyxTQUFTLDhEQUF5QixFQUFFLENBQUM7WUFDdkQsT0FBTyxLQUFLLENBQUM7UUFDZCxDQUFDO1FBRUQsTUFBTSxXQUFXLEdBQUcsb0JBQW9CLENBQUMsc0JBQXNCLDRDQUFvQyxDQUFDO1FBQ3BHLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUNsQixPQUFPLEtBQUssQ0FBQztRQUNkLENBQUM7UUFFRCxNQUFNLGFBQWEsR0FBRyxXQUFXLENBQUMsS0FBSyxFQUFFLENBQUM7UUFFMUMsTUFBTSxHQUFHLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQyxpQkFBaUIsQ0FBQyxhQUFhLDhDQUFzQyxJQUFJLENBQUMsQ0FBQztRQUNsSCxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7WUFDVixPQUFPLEtBQUssQ0FBQztRQUNkLENBQUM7UUFFRCxPQUFPLEdBQUcsQ0FBQztJQUNaLENBQUM7SUFFTyx5QkFBeUIsQ0FBQyxTQUF5QixFQUFFLGtCQUF3QztRQUNwRyxPQUFPLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLFNBQVMsRUFBRSxFQUFFLGtCQUFrQixDQUFDLENBQUM7SUFDeEUsQ0FBQztJQUVPLHFCQUFxQixDQUFDLFFBQXVCLEVBQUUsa0JBQXdDO1FBQzlGLE9BQU8sSUFBSSxDQUFDLHVCQUF1QixDQUFDLEVBQUUsUUFBUSxFQUFFLEVBQUUsa0JBQWtCLENBQUMsQ0FBQztJQUN2RSxDQUFDO0lBRU8seUJBQXlCLENBQUMsU0FBeUIsRUFBRSxrQkFBd0M7UUFDcEcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ3JDLE9BQU8sS0FBSyxDQUFDO1FBQ2QsQ0FBQztRQUVELE1BQU0saUJBQWlCLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBRTlELHVEQUF1RDtRQUN2RCw2Q0FBNkM7UUFFN0MsTUFBTSxjQUFjLEdBQUcsa0JBQWtCLENBQUMsU0FBUyxDQUFDLEVBQUUsU0FBUyxFQUFFLGlCQUFpQixFQUFFLEVBQUUsa0JBQWtCLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDdEgsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBRXJCLDBDQUEwQztZQUMxQyx3Q0FBd0M7WUFFeEMsa0JBQWtCLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ3ZDLE9BQU8sSUFBSSxDQUFDO1FBQ2IsQ0FBQztRQUVELE9BQU8sS0FBSyxDQUFDO0lBQ2QsQ0FBQztJQUVPLGdCQUFnQixDQUFDLFNBQW9CO1FBQzVDLFFBQVEsU0FBUyxFQUFFLENBQUM7WUFDbkIsMkJBQW1CLENBQUMsQ0FBQyxtQ0FBMkI7WUFDaEQsMkJBQW1CLENBQUMsQ0FBQyxtQ0FBMkI7WUFDaEQsNEJBQW9CLENBQUMsQ0FBQyxvQ0FBNEI7WUFDbEQseUJBQWlCLENBQUMsQ0FBQyxpQ0FBeUI7UUFDN0MsQ0FBQztJQUNGLENBQUM7SUFFTyxtQkFBbUIsQ0FBQyxTQUF5QjtRQUNwRCxRQUFRLFNBQVMsRUFBRSxDQUFDO1lBQ25CLDhCQUFzQixDQUFDLENBQUMsbUNBQTJCO1lBQ25ELGlDQUF5QixDQUFDLENBQUMsbUNBQTJCO1lBQ3RELGdDQUF3QixDQUFDLENBQUMsb0NBQTRCO1lBQ3RELGdDQUF3QixDQUFDLENBQUMsaUNBQXlCO1FBQ3BELENBQUM7SUFDRixDQUFDO0lBRU8sdUJBQXVCLENBQUMsS0FBc0IsRUFBRSxrQkFBd0M7UUFDL0YsTUFBTSxXQUFXLEdBQUcsa0JBQWtCLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxrQkFBa0IsQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUN4RixJQUFJLFdBQVcsRUFBRSxDQUFDO1lBQ2pCLFdBQVcsQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUVwQixPQUFPLElBQUksQ0FBQztRQUNiLENBQUM7UUFFRCxPQUFPLEtBQUssQ0FBQztJQUNkLENBQUM7Q0FDRDtBQUVELGVBQWUsQ0FBQyxLQUFNLFNBQVEsb0JBQW9CO0lBRWpEO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLCtCQUErQjtZQUNuQyxLQUFLLEVBQUUsU0FBUyxDQUFDLGNBQWMsRUFBRSxrQ0FBa0MsQ0FBQztZQUNwRSxRQUFRLEVBQUUsVUFBVSxDQUFDLElBQUk7WUFDekIsRUFBRSxFQUFFLElBQUk7U0FDUix5QkFBaUIsQ0FBQztJQUNwQixDQUFDO0NBQ0QsQ0FBQyxDQUFDO0FBRUgsZUFBZSxDQUFDLEtBQU0sU0FBUSxvQkFBb0I7SUFFakQ7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsZ0NBQWdDO1lBQ3BDLEtBQUssRUFBRSxTQUFTLENBQUMsZUFBZSxFQUFFLG1DQUFtQyxDQUFDO1lBQ3RFLFFBQVEsRUFBRSxVQUFVLENBQUMsSUFBSTtZQUN6QixFQUFFLEVBQUUsSUFBSTtTQUNSLDBCQUFrQixDQUFDO0lBQ3JCLENBQUM7Q0FDRCxDQUFDLENBQUM7QUFFSCxlQUFlLENBQUMsS0FBTSxTQUFRLG9CQUFvQjtJQUVqRDtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSw2QkFBNkI7WUFDakMsS0FBSyxFQUFFLFNBQVMsQ0FBQyxZQUFZLEVBQUUsNEJBQTRCLENBQUM7WUFDNUQsUUFBUSxFQUFFLFVBQVUsQ0FBQyxJQUFJO1lBQ3pCLEVBQUUsRUFBRSxJQUFJO1NBQ1IsdUJBQWUsQ0FBQztJQUNsQixDQUFDO0NBQ0QsQ0FBQyxDQUFDO0FBRUgsZUFBZSxDQUFDLEtBQU0sU0FBUSxvQkFBb0I7SUFFakQ7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsK0JBQStCO1lBQ25DLEtBQUssRUFBRSxTQUFTLENBQUMsY0FBYyxFQUFFLDRCQUE0QixDQUFDO1lBQzlELFFBQVEsRUFBRSxVQUFVLENBQUMsSUFBSTtZQUN6QixFQUFFLEVBQUUsSUFBSTtTQUNSLHlCQUFpQixDQUFDO0lBQ3BCLENBQUM7Q0FDRCxDQUFDLENBQUM7QUFFSCxNQUFlLGVBQWdCLFNBQVEsT0FBTztJQUU3QyxZQUNDLE9BQXdCLEVBQ1AsU0FBa0I7UUFFbkMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBRkUsY0FBUyxHQUFULFNBQVMsQ0FBUztJQUdwQyxDQUFDO0lBRUQsR0FBRyxDQUFDLFFBQTBCO1FBQzdCLE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsdUJBQXVCLENBQUMsQ0FBQztRQUM1RCxNQUFNLGFBQWEsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBRW5ELElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxhQUFhLEVBQUUsYUFBYSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUM1RSxDQUFDO0lBRU8sb0JBQW9CLENBQUMsYUFBc0MsRUFBRSxJQUFXLEVBQUUsSUFBYTtRQUM5RixNQUFNLFlBQVksR0FBRyxlQUFlLEVBQUUsQ0FBQztRQUN2QyxNQUFNLGlCQUFpQixHQUFHLGlCQUFpQixDQUFDLFlBQVksQ0FBQyxDQUFDO1FBRTFELElBQUksU0FBZ0IsQ0FBQztRQUNyQixJQUFJLGlCQUFpQixFQUFFLENBQUM7WUFDdkIsUUFBUSxJQUFJLEVBQUUsQ0FBQztnQkFDZDtvQkFDQyxTQUFTLHlEQUF1QixDQUFDO29CQUNqQyxNQUFNO2dCQUNQO29CQUNDLFNBQVMsbURBQW9CLENBQUM7WUFDaEMsQ0FBQztRQUNGLENBQUM7YUFBTSxDQUFDO1lBQ1AsUUFBUSxJQUFJLEVBQUUsQ0FBQztnQkFDZDtvQkFDQyxTQUFTLEdBQUcsSUFBSSxDQUFDLENBQUMsZ0RBQWtCLENBQUMsbURBQW1CLENBQUM7b0JBQ3pELE1BQU07Z0JBQ1A7b0JBQ0MsU0FBUyxHQUFHLElBQUksQ0FBQyxDQUFDLDhEQUF5QixDQUFDLGlEQUFrQixDQUFDO29CQUMvRCxNQUFNO2dCQUNQO29CQUNDLFNBQVMsR0FBRyxJQUFJLENBQUMsQ0FBQyx3REFBc0IsQ0FBQywrQ0FBaUIsQ0FBQztvQkFDM0QsTUFBTTtnQkFDUDtvQkFDQyxTQUFTLEdBQUcsSUFBSSxDQUFDLENBQUMsNERBQXdCLENBQUMsNkRBQXdCLENBQUM7b0JBQ3BFLE1BQU07Z0JBQ1A7b0JBQ0MsU0FBUyxHQUFHLElBQUksQ0FBQyxDQUFDLG9EQUFvQixDQUFDLHVEQUFxQixDQUFDO29CQUM3RCxNQUFNO2dCQUNQO29CQUNDLFNBQVMsR0FBRyxJQUFJLENBQUMsQ0FBQyxrREFBbUIsQ0FBQywyREFBdUIsQ0FBQztvQkFDOUQsTUFBTTtnQkFDUDtvQkFDQyxTQUFTLG1EQUFvQixDQUFDO1lBQ2hDLENBQUM7UUFDRixDQUFDO1FBRUQsSUFBSSxhQUFhLENBQUMsU0FBUyxDQUFDLFNBQVMsRUFBRSxZQUFZLENBQUMsSUFBSSxTQUFTLHFEQUFzQixFQUFFLENBQUM7WUFDekYsT0FBTyxTQUFTLENBQUM7UUFDbEIsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDLG9CQUFvQixDQUFDLGFBQWEsRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDbEUsQ0FBQztJQUVPLHVCQUF1QixDQUFDLGFBQXNDLEVBQUUsYUFBNkIsRUFBRSxJQUFhO1FBQ25ILElBQUksb0JBQXVDLENBQUM7UUFDNUMsSUFBSSxhQUFhLENBQUMsZ0JBQWdCLEVBQUUsUUFBUSxFQUFFLElBQUksYUFBYSxDQUFDLFFBQVEsa0RBQW1CLEVBQUUsQ0FBQztZQUM3RixvQkFBb0IsbURBQW9CLENBQUM7UUFDMUMsQ0FBQzthQUFNLElBQUksYUFBYSxDQUFDLFFBQVEsNERBQXdCLEVBQUUsQ0FBQztZQUMzRCxvQkFBb0IsNkRBQXlCLENBQUM7UUFDL0MsQ0FBQzthQUFNLElBQUksYUFBYSxDQUFDLFFBQVEsd0RBQXNCLEVBQUUsQ0FBQztZQUN6RCxvQkFBb0IseURBQXVCLENBQUM7UUFDN0MsQ0FBQzthQUFNLElBQUksYUFBYSxDQUFDLFFBQVEsb0RBQW9CLEVBQUUsQ0FBQztZQUN2RCxvQkFBb0IscURBQXFCLENBQUM7UUFDM0MsQ0FBQzthQUFNLElBQUksYUFBYSxDQUFDLFFBQVEsOERBQXlCLEVBQUUsQ0FBQztZQUM1RCxvQkFBb0IsK0RBQTBCLENBQUM7UUFDaEQsQ0FBQzthQUFNLElBQUksYUFBYSxDQUFDLFFBQVEsZ0RBQWtCLEVBQUUsQ0FBQztZQUNyRCxvQkFBb0IsaURBQW1CLENBQUM7UUFDekMsQ0FBQztRQUVELGFBQWEsQ0FBQyxTQUFTLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxhQUFhLEVBQUUsb0JBQW9CLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxpREFBa0IsRUFBRSxlQUFlLEVBQUUsQ0FBQyxDQUFDO0lBQzdKLENBQUM7Q0FDRDtBQUVELGVBQWUsQ0FBQyxLQUFNLFNBQVEsZUFBZTtJQUU1QztRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSxnQ0FBZ0M7WUFDcEMsS0FBSyxFQUFFLFNBQVMsQ0FBQyxlQUFlLEVBQUUsaUJBQWlCLENBQUM7WUFDcEQsUUFBUSxFQUFFLFVBQVUsQ0FBQyxJQUFJO1lBQ3pCLEVBQUUsRUFBRSxJQUFJO1lBQ1IsVUFBVSxFQUFFO2dCQUNYLE9BQU8scUJBQVk7Z0JBQ25CLE1BQU0sNkNBQW1DO2FBQ3pDO1NBQ0QsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUNWLENBQUM7Q0FDRCxDQUFDLENBQUM7QUFFSCxlQUFlLENBQUMsS0FBTSxTQUFRLGVBQWU7SUFFNUM7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsb0NBQW9DO1lBQ3hDLEtBQUssRUFBRSxTQUFTLENBQUMsbUJBQW1CLEVBQUUscUJBQXFCLENBQUM7WUFDNUQsUUFBUSxFQUFFLFVBQVUsQ0FBQyxJQUFJO1lBQ3pCLEVBQUUsRUFBRSxJQUFJO1lBQ1IsVUFBVSxFQUFFO2dCQUNYLE9BQU8sRUFBRSw2Q0FBeUI7Z0JBQ2xDLE1BQU0sNkNBQW1DO2FBQ3pDO1NBQ0QsRUFBRSxLQUFLLENBQUMsQ0FBQztJQUNYLENBQUM7Q0FDRCxDQUFDLENBQUMifQ==