/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import './media/sidebarpart.css';
import { localize2 } from '../../../../nls.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { IWorkbenchLayoutService } from '../../../services/layout/browser/layoutService.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { IPaneCompositePartService } from '../../../services/panecomposite/browser/panecomposite.js';
import { SideBarVisibleContext } from '../../../common/contextkeys.js';
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.closeSidebar',
            title: localize2('closeSidebar', 'Close Primary Side Bar'),
            category: Categories.View,
            f1: true,
            precondition: SideBarVisibleContext
        });
    }
    run(accessor) {
        accessor.get(IWorkbenchLayoutService).setPartHidden(true, "workbench.parts.sidebar" /* Parts.SIDEBAR_PART */);
    }
});
export class FocusSideBarAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.focusSideBar',
            title: localize2('focusSideBar', 'Focus into Primary Side Bar'),
            category: Categories.View,
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                when: null,
                primary: 2048 /* KeyMod.CtrlCmd */ | 21 /* KeyCode.Digit0 */
            }
        });
    }
    async run(accessor) {
        const layoutService = accessor.get(IWorkbenchLayoutService);
        const paneCompositeService = accessor.get(IPaneCompositePartService);
        // Show side bar
        if (!layoutService.isVisible("workbench.parts.sidebar" /* Parts.SIDEBAR_PART */)) {
            layoutService.setPartHidden(false, "workbench.parts.sidebar" /* Parts.SIDEBAR_PART */);
        }
        // Focus into active viewlet
        const viewlet = paneCompositeService.getActivePaneComposite(0 /* ViewContainerLocation.Sidebar */);
        viewlet?.focus();
    }
}
registerAction2(FocusSideBarAction);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2lkZWJhckFjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2Jyb3dzZXIvcGFydHMvc2lkZWJhci9zaWRlYmFyQWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLHlCQUF5QixDQUFDO0FBQ2pDLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUMvQyxPQUFPLEVBQUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSx1QkFBdUIsRUFBUyxNQUFNLG1EQUFtRCxDQUFDO0FBSW5HLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw4REFBOEQsQ0FBQztBQUMxRixPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUVyRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUV2RSxlQUFlLENBQUMsS0FBTSxTQUFRLE9BQU87SUFFcEM7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsK0JBQStCO1lBQ25DLEtBQUssRUFBRSxTQUFTLENBQUMsY0FBYyxFQUFFLHdCQUF3QixDQUFDO1lBQzFELFFBQVEsRUFBRSxVQUFVLENBQUMsSUFBSTtZQUN6QixFQUFFLEVBQUUsSUFBSTtZQUNSLFlBQVksRUFBRSxxQkFBcUI7U0FDbkMsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVELEdBQUcsQ0FBQyxRQUEwQjtRQUM3QixRQUFRLENBQUMsR0FBRyxDQUFDLHVCQUF1QixDQUFDLENBQUMsYUFBYSxDQUFDLElBQUkscURBQXFCLENBQUM7SUFDL0UsQ0FBQztDQUNELENBQUMsQ0FBQztBQUVILE1BQU0sT0FBTyxrQkFBbUIsU0FBUSxPQUFPO0lBRTlDO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLCtCQUErQjtZQUNuQyxLQUFLLEVBQUUsU0FBUyxDQUFDLGNBQWMsRUFBRSw2QkFBNkIsQ0FBQztZQUMvRCxRQUFRLEVBQUUsVUFBVSxDQUFDLElBQUk7WUFDekIsRUFBRSxFQUFFLElBQUk7WUFDUixVQUFVLEVBQUU7Z0JBQ1gsTUFBTSw2Q0FBbUM7Z0JBQ3pDLElBQUksRUFBRSxJQUFJO2dCQUNWLE9BQU8sRUFBRSxtREFBK0I7YUFDeEM7U0FDRCxDQUFDLENBQUM7SUFDSixDQUFDO0lBRUQsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUEwQjtRQUNuQyxNQUFNLGFBQWEsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLHVCQUF1QixDQUFDLENBQUM7UUFDNUQsTUFBTSxvQkFBb0IsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLHlCQUF5QixDQUFDLENBQUM7UUFFckUsZ0JBQWdCO1FBQ2hCLElBQUksQ0FBQyxhQUFhLENBQUMsU0FBUyxvREFBb0IsRUFBRSxDQUFDO1lBQ2xELGFBQWEsQ0FBQyxhQUFhLENBQUMsS0FBSyxxREFBcUIsQ0FBQztRQUN4RCxDQUFDO1FBRUQsNEJBQTRCO1FBQzVCLE1BQU0sT0FBTyxHQUFHLG9CQUFvQixDQUFDLHNCQUFzQix1Q0FBK0IsQ0FBQztRQUMzRixPQUFPLEVBQUUsS0FBSyxFQUFFLENBQUM7SUFDbEIsQ0FBQztDQUNEO0FBRUQsZUFBZSxDQUFDLGtCQUFrQixDQUFDLENBQUMifQ==