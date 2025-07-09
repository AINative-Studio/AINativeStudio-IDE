/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { CHAT_PROVIDER_ID } from '../common/chatParticipantContribTypes.js';
export const IChatWidgetService = createDecorator('chatWidgetService');
export async function showChatView(viewsService) {
    return (await viewsService.openView(ChatViewId))?.widget;
}
export async function showEditsView(viewsService) {
    return (await viewsService.openView(EditsViewId))?.widget;
}
export function preferCopilotEditsView(viewsService) {
    if (viewsService.getFocusedView()?.id === ChatViewId || !!viewsService.getActiveViewWithId(ChatViewId)) {
        return false;
    }
    return !!viewsService.getActiveViewWithId(EditsViewId);
}
export function showCopilotView(viewsService, layoutService) {
    // Ensure main window is in front
    if (layoutService.activeContainer !== layoutService.mainContainer) {
        layoutService.mainContainer.focus();
    }
    // Bring up the correct view
    if (preferCopilotEditsView(viewsService)) {
        return showEditsView(viewsService);
    }
    else {
        return showChatView(viewsService);
    }
}
export function ensureSideBarChatViewSize(viewDescriptorService, layoutService, viewsService) {
    const viewId = preferCopilotEditsView(viewsService) ? EditsViewId : ChatViewId;
    const location = viewDescriptorService.getViewLocationById(viewId);
    if (location === 1 /* ViewContainerLocation.Panel */) {
        return; // panel is typically very wide
    }
    const viewPart = location === 0 /* ViewContainerLocation.Sidebar */ ? "workbench.parts.sidebar" /* Parts.SIDEBAR_PART */ : "workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */;
    const partSize = layoutService.getSize(viewPart);
    let adjustedChatWidth;
    if (partSize.width < 400 && layoutService.mainContainerDimension.width > 1200) {
        adjustedChatWidth = 400; // up to 400px if window bounds permit
    }
    else if (partSize.width < 300) {
        adjustedChatWidth = 300; // at minimum 300px
    }
    if (typeof adjustedChatWidth === 'number') {
        layoutService.setSize(viewPart, { width: adjustedChatWidth, height: partSize.height });
    }
}
export const IQuickChatService = createDecorator('quickChatService');
export const IChatAccessibilityService = createDecorator('chatAccessibilityService');
export const IChatCodeBlockContextProviderService = createDecorator('chatCodeBlockContextProviderService');
export const ChatViewId = `workbench.panel.chat.view.${CHAT_PROVIDER_ID}`;
export const EditsViewId = 'workbench.panel.chat.view.edits';
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY2hhdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQVNoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUM7QUFPN0YsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFTNUUsTUFBTSxDQUFDLE1BQU0sa0JBQWtCLEdBQUcsZUFBZSxDQUFxQixtQkFBbUIsQ0FBQyxDQUFDO0FBbUIzRixNQUFNLENBQUMsS0FBSyxVQUFVLFlBQVksQ0FBQyxZQUEyQjtJQUM3RCxPQUFPLENBQUMsTUFBTSxZQUFZLENBQUMsUUFBUSxDQUFlLFVBQVUsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDO0FBQ3hFLENBQUM7QUFFRCxNQUFNLENBQUMsS0FBSyxVQUFVLGFBQWEsQ0FBQyxZQUEyQjtJQUM5RCxPQUFPLENBQUMsTUFBTSxZQUFZLENBQUMsUUFBUSxDQUFlLFdBQVcsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDO0FBQ3pFLENBQUM7QUFFRCxNQUFNLFVBQVUsc0JBQXNCLENBQUMsWUFBMkI7SUFDakUsSUFBSSxZQUFZLENBQUMsY0FBYyxFQUFFLEVBQUUsRUFBRSxLQUFLLFVBQVUsSUFBSSxDQUFDLENBQUMsWUFBWSxDQUFDLG1CQUFtQixDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUM7UUFDeEcsT0FBTyxLQUFLLENBQUM7SUFDZCxDQUFDO0lBRUQsT0FBTyxDQUFDLENBQUMsWUFBWSxDQUFDLG1CQUFtQixDQUFDLFdBQVcsQ0FBQyxDQUFDO0FBQ3hELENBQUM7QUFFRCxNQUFNLFVBQVUsZUFBZSxDQUFDLFlBQTJCLEVBQUUsYUFBc0M7SUFFbEcsaUNBQWlDO0lBQ2pDLElBQUksYUFBYSxDQUFDLGVBQWUsS0FBSyxhQUFhLENBQUMsYUFBYSxFQUFFLENBQUM7UUFDbkUsYUFBYSxDQUFDLGFBQWEsQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUNyQyxDQUFDO0lBRUQsNEJBQTRCO0lBQzVCLElBQUksc0JBQXNCLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQztRQUMxQyxPQUFPLGFBQWEsQ0FBQyxZQUFZLENBQUMsQ0FBQztJQUNwQyxDQUFDO1NBQU0sQ0FBQztRQUNQLE9BQU8sWUFBWSxDQUFDLFlBQVksQ0FBQyxDQUFDO0lBQ25DLENBQUM7QUFDRixDQUFDO0FBRUQsTUFBTSxVQUFVLHlCQUF5QixDQUFDLHFCQUE2QyxFQUFFLGFBQXNDLEVBQUUsWUFBMkI7SUFDM0osTUFBTSxNQUFNLEdBQUcsc0JBQXNCLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDO0lBRS9FLE1BQU0sUUFBUSxHQUFHLHFCQUFxQixDQUFDLG1CQUFtQixDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ25FLElBQUksUUFBUSx3Q0FBZ0MsRUFBRSxDQUFDO1FBQzlDLE9BQU8sQ0FBQywrQkFBK0I7SUFDeEMsQ0FBQztJQUVELE1BQU0sUUFBUSxHQUFHLFFBQVEsMENBQWtDLENBQUMsQ0FBQyxvREFBb0IsQ0FBQyw2REFBd0IsQ0FBQztJQUMzRyxNQUFNLFFBQVEsR0FBRyxhQUFhLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBRWpELElBQUksaUJBQXFDLENBQUM7SUFDMUMsSUFBSSxRQUFRLENBQUMsS0FBSyxHQUFHLEdBQUcsSUFBSSxhQUFhLENBQUMsc0JBQXNCLENBQUMsS0FBSyxHQUFHLElBQUksRUFBRSxDQUFDO1FBQy9FLGlCQUFpQixHQUFHLEdBQUcsQ0FBQyxDQUFDLHNDQUFzQztJQUNoRSxDQUFDO1NBQU0sSUFBSSxRQUFRLENBQUMsS0FBSyxHQUFHLEdBQUcsRUFBRSxDQUFDO1FBQ2pDLGlCQUFpQixHQUFHLEdBQUcsQ0FBQyxDQUFDLG1CQUFtQjtJQUM3QyxDQUFDO0lBRUQsSUFBSSxPQUFPLGlCQUFpQixLQUFLLFFBQVEsRUFBRSxDQUFDO1FBQzNDLGFBQWEsQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLEVBQUUsS0FBSyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sRUFBRSxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQztJQUN4RixDQUFDO0FBQ0YsQ0FBQztBQUVELE1BQU0sQ0FBQyxNQUFNLGlCQUFpQixHQUFHLGVBQWUsQ0FBb0Isa0JBQWtCLENBQUMsQ0FBQztBQTRCeEYsTUFBTSxDQUFDLE1BQU0seUJBQXlCLEdBQUcsZUFBZSxDQUE0QiwwQkFBMEIsQ0FBQyxDQUFDO0FBb0loSCxNQUFNLENBQUMsTUFBTSxvQ0FBb0MsR0FBRyxlQUFlLENBQXVDLHFDQUFxQyxDQUFDLENBQUM7QUFPakosTUFBTSxDQUFDLE1BQU0sVUFBVSxHQUFHLDZCQUE2QixnQkFBZ0IsRUFBRSxDQUFDO0FBRTFFLE1BQU0sQ0FBQyxNQUFNLFdBQVcsR0FBRyxpQ0FBaUMsQ0FBQyJ9