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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBU2hHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQU83RixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQVM1RSxNQUFNLENBQUMsTUFBTSxrQkFBa0IsR0FBRyxlQUFlLENBQXFCLG1CQUFtQixDQUFDLENBQUM7QUFtQjNGLE1BQU0sQ0FBQyxLQUFLLFVBQVUsWUFBWSxDQUFDLFlBQTJCO0lBQzdELE9BQU8sQ0FBQyxNQUFNLFlBQVksQ0FBQyxRQUFRLENBQWUsVUFBVSxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUM7QUFDeEUsQ0FBQztBQUVELE1BQU0sQ0FBQyxLQUFLLFVBQVUsYUFBYSxDQUFDLFlBQTJCO0lBQzlELE9BQU8sQ0FBQyxNQUFNLFlBQVksQ0FBQyxRQUFRLENBQWUsV0FBVyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUM7QUFDekUsQ0FBQztBQUVELE1BQU0sVUFBVSxzQkFBc0IsQ0FBQyxZQUEyQjtJQUNqRSxJQUFJLFlBQVksQ0FBQyxjQUFjLEVBQUUsRUFBRSxFQUFFLEtBQUssVUFBVSxJQUFJLENBQUMsQ0FBQyxZQUFZLENBQUMsbUJBQW1CLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQztRQUN4RyxPQUFPLEtBQUssQ0FBQztJQUNkLENBQUM7SUFFRCxPQUFPLENBQUMsQ0FBQyxZQUFZLENBQUMsbUJBQW1CLENBQUMsV0FBVyxDQUFDLENBQUM7QUFDeEQsQ0FBQztBQUVELE1BQU0sVUFBVSxlQUFlLENBQUMsWUFBMkIsRUFBRSxhQUFzQztJQUVsRyxpQ0FBaUM7SUFDakMsSUFBSSxhQUFhLENBQUMsZUFBZSxLQUFLLGFBQWEsQ0FBQyxhQUFhLEVBQUUsQ0FBQztRQUNuRSxhQUFhLENBQUMsYUFBYSxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQ3JDLENBQUM7SUFFRCw0QkFBNEI7SUFDNUIsSUFBSSxzQkFBc0IsQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDO1FBQzFDLE9BQU8sYUFBYSxDQUFDLFlBQVksQ0FBQyxDQUFDO0lBQ3BDLENBQUM7U0FBTSxDQUFDO1FBQ1AsT0FBTyxZQUFZLENBQUMsWUFBWSxDQUFDLENBQUM7SUFDbkMsQ0FBQztBQUNGLENBQUM7QUFFRCxNQUFNLFVBQVUseUJBQXlCLENBQUMscUJBQTZDLEVBQUUsYUFBc0MsRUFBRSxZQUEyQjtJQUMzSixNQUFNLE1BQU0sR0FBRyxzQkFBc0IsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUM7SUFFL0UsTUFBTSxRQUFRLEdBQUcscUJBQXFCLENBQUMsbUJBQW1CLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDbkUsSUFBSSxRQUFRLHdDQUFnQyxFQUFFLENBQUM7UUFDOUMsT0FBTyxDQUFDLCtCQUErQjtJQUN4QyxDQUFDO0lBRUQsTUFBTSxRQUFRLEdBQUcsUUFBUSwwQ0FBa0MsQ0FBQyxDQUFDLG9EQUFvQixDQUFDLDZEQUF3QixDQUFDO0lBQzNHLE1BQU0sUUFBUSxHQUFHLGFBQWEsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7SUFFakQsSUFBSSxpQkFBcUMsQ0FBQztJQUMxQyxJQUFJLFFBQVEsQ0FBQyxLQUFLLEdBQUcsR0FBRyxJQUFJLGFBQWEsQ0FBQyxzQkFBc0IsQ0FBQyxLQUFLLEdBQUcsSUFBSSxFQUFFLENBQUM7UUFDL0UsaUJBQWlCLEdBQUcsR0FBRyxDQUFDLENBQUMsc0NBQXNDO0lBQ2hFLENBQUM7U0FBTSxJQUFJLFFBQVEsQ0FBQyxLQUFLLEdBQUcsR0FBRyxFQUFFLENBQUM7UUFDakMsaUJBQWlCLEdBQUcsR0FBRyxDQUFDLENBQUMsbUJBQW1CO0lBQzdDLENBQUM7SUFFRCxJQUFJLE9BQU8saUJBQWlCLEtBQUssUUFBUSxFQUFFLENBQUM7UUFDM0MsYUFBYSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsRUFBRSxLQUFLLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxFQUFFLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO0lBQ3hGLENBQUM7QUFDRixDQUFDO0FBRUQsTUFBTSxDQUFDLE1BQU0saUJBQWlCLEdBQUcsZUFBZSxDQUFvQixrQkFBa0IsQ0FBQyxDQUFDO0FBNEJ4RixNQUFNLENBQUMsTUFBTSx5QkFBeUIsR0FBRyxlQUFlLENBQTRCLDBCQUEwQixDQUFDLENBQUM7QUFvSWhILE1BQU0sQ0FBQyxNQUFNLG9DQUFvQyxHQUFHLGVBQWUsQ0FBdUMscUNBQXFDLENBQUMsQ0FBQztBQU9qSixNQUFNLENBQUMsTUFBTSxVQUFVLEdBQUcsNkJBQTZCLGdCQUFnQixFQUFFLENBQUM7QUFFMUUsTUFBTSxDQUFDLE1BQU0sV0FBVyxHQUFHLGlDQUFpQyxDQUFDIn0=