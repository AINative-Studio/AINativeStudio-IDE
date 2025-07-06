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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci90ZXN0L0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFTaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBTzdGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBUzVFLE1BQU0sQ0FBQyxNQUFNLGtCQUFrQixHQUFHLGVBQWUsQ0FBcUIsbUJBQW1CLENBQUMsQ0FBQztBQW1CM0YsTUFBTSxDQUFDLEtBQUssVUFBVSxZQUFZLENBQUMsWUFBMkI7SUFDN0QsT0FBTyxDQUFDLE1BQU0sWUFBWSxDQUFDLFFBQVEsQ0FBZSxVQUFVLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQztBQUN4RSxDQUFDO0FBRUQsTUFBTSxDQUFDLEtBQUssVUFBVSxhQUFhLENBQUMsWUFBMkI7SUFDOUQsT0FBTyxDQUFDLE1BQU0sWUFBWSxDQUFDLFFBQVEsQ0FBZSxXQUFXLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQztBQUN6RSxDQUFDO0FBRUQsTUFBTSxVQUFVLHNCQUFzQixDQUFDLFlBQTJCO0lBQ2pFLElBQUksWUFBWSxDQUFDLGNBQWMsRUFBRSxFQUFFLEVBQUUsS0FBSyxVQUFVLElBQUksQ0FBQyxDQUFDLFlBQVksQ0FBQyxtQkFBbUIsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDO1FBQ3hHLE9BQU8sS0FBSyxDQUFDO0lBQ2QsQ0FBQztJQUVELE9BQU8sQ0FBQyxDQUFDLFlBQVksQ0FBQyxtQkFBbUIsQ0FBQyxXQUFXLENBQUMsQ0FBQztBQUN4RCxDQUFDO0FBRUQsTUFBTSxVQUFVLGVBQWUsQ0FBQyxZQUEyQixFQUFFLGFBQXNDO0lBRWxHLGlDQUFpQztJQUNqQyxJQUFJLGFBQWEsQ0FBQyxlQUFlLEtBQUssYUFBYSxDQUFDLGFBQWEsRUFBRSxDQUFDO1FBQ25FLGFBQWEsQ0FBQyxhQUFhLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDckMsQ0FBQztJQUVELDRCQUE0QjtJQUM1QixJQUFJLHNCQUFzQixDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUM7UUFDMUMsT0FBTyxhQUFhLENBQUMsWUFBWSxDQUFDLENBQUM7SUFDcEMsQ0FBQztTQUFNLENBQUM7UUFDUCxPQUFPLFlBQVksQ0FBQyxZQUFZLENBQUMsQ0FBQztJQUNuQyxDQUFDO0FBQ0YsQ0FBQztBQUVELE1BQU0sVUFBVSx5QkFBeUIsQ0FBQyxxQkFBNkMsRUFBRSxhQUFzQyxFQUFFLFlBQTJCO0lBQzNKLE1BQU0sTUFBTSxHQUFHLHNCQUFzQixDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQztJQUUvRSxNQUFNLFFBQVEsR0FBRyxxQkFBcUIsQ0FBQyxtQkFBbUIsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUNuRSxJQUFJLFFBQVEsd0NBQWdDLEVBQUUsQ0FBQztRQUM5QyxPQUFPLENBQUMsK0JBQStCO0lBQ3hDLENBQUM7SUFFRCxNQUFNLFFBQVEsR0FBRyxRQUFRLDBDQUFrQyxDQUFDLENBQUMsb0RBQW9CLENBQUMsNkRBQXdCLENBQUM7SUFDM0csTUFBTSxRQUFRLEdBQUcsYUFBYSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUVqRCxJQUFJLGlCQUFxQyxDQUFDO0lBQzFDLElBQUksUUFBUSxDQUFDLEtBQUssR0FBRyxHQUFHLElBQUksYUFBYSxDQUFDLHNCQUFzQixDQUFDLEtBQUssR0FBRyxJQUFJLEVBQUUsQ0FBQztRQUMvRSxpQkFBaUIsR0FBRyxHQUFHLENBQUMsQ0FBQyxzQ0FBc0M7SUFDaEUsQ0FBQztTQUFNLElBQUksUUFBUSxDQUFDLEtBQUssR0FBRyxHQUFHLEVBQUUsQ0FBQztRQUNqQyxpQkFBaUIsR0FBRyxHQUFHLENBQUMsQ0FBQyxtQkFBbUI7SUFDN0MsQ0FBQztJQUVELElBQUksT0FBTyxpQkFBaUIsS0FBSyxRQUFRLEVBQUUsQ0FBQztRQUMzQyxhQUFhLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxFQUFFLEtBQUssRUFBRSxpQkFBaUIsRUFBRSxNQUFNLEVBQUUsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7SUFDeEYsQ0FBQztBQUNGLENBQUM7QUFFRCxNQUFNLENBQUMsTUFBTSxpQkFBaUIsR0FBRyxlQUFlLENBQW9CLGtCQUFrQixDQUFDLENBQUM7QUE0QnhGLE1BQU0sQ0FBQyxNQUFNLHlCQUF5QixHQUFHLGVBQWUsQ0FBNEIsMEJBQTBCLENBQUMsQ0FBQztBQW9JaEgsTUFBTSxDQUFDLE1BQU0sb0NBQW9DLEdBQUcsZUFBZSxDQUF1QyxxQ0FBcUMsQ0FBQyxDQUFDO0FBT2pKLE1BQU0sQ0FBQyxNQUFNLFVBQVUsR0FBRyw2QkFBNkIsZ0JBQWdCLEVBQUUsQ0FBQztBQUUxRSxNQUFNLENBQUMsTUFBTSxXQUFXLEdBQUcsaUNBQWlDLENBQUMifQ==