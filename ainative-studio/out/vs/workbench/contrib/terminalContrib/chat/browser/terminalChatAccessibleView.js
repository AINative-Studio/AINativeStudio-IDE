/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { AccessibleContentProvider } from '../../../../../platform/accessibility/browser/accessibleView.js';
import { ITerminalService } from '../../../terminal/browser/terminal.js';
import { TerminalChatController } from './terminalChatController.js';
import { IMenuService, MenuItemAction } from '../../../../../platform/actions/common/actions.js';
import { MENU_TERMINAL_CHAT_WIDGET_STATUS, TerminalChatContextKeys } from './terminalChat.js';
export class TerminalInlineChatAccessibleView {
    constructor() {
        this.priority = 105;
        this.name = 'terminalInlineChat';
        this.type = "view" /* AccessibleViewType.View */;
        this.when = TerminalChatContextKeys.focused;
    }
    getProvider(accessor) {
        const terminalService = accessor.get(ITerminalService);
        const menuService = accessor.get(IMenuService);
        const actions = [];
        const contextKeyService = TerminalChatController.activeChatController?.scopedContextKeyService;
        if (contextKeyService) {
            const menuActions = menuService.getMenuActions(MENU_TERMINAL_CHAT_WIDGET_STATUS, contextKeyService);
            for (const action of menuActions) {
                for (const a of action[1]) {
                    if (a instanceof MenuItemAction) {
                        actions.push(a);
                    }
                }
            }
        }
        const controller = terminalService.activeInstance?.getContribution(TerminalChatController.ID) ?? undefined;
        if (!controller?.lastResponseContent) {
            return;
        }
        const responseContent = controller.lastResponseContent;
        return new AccessibleContentProvider("terminal-chat" /* AccessibleViewProviderId.TerminalChat */, { type: "view" /* AccessibleViewType.View */ }, () => { return responseContent; }, () => {
            controller.focus();
        }, "accessibility.verbosity.inlineChat" /* AccessibilityVerbositySettingId.InlineChat */, undefined, actions);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxDaGF0QWNjZXNzaWJsZVZpZXcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL2NoYXQvYnJvd3Nlci90ZXJtaW5hbENoYXRBY2Nlc3NpYmxlVmlldy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQWdELHlCQUF5QixFQUFFLE1BQU0saUVBQWlFLENBQUM7QUFFMUosT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDekUsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFHckUsT0FBTyxFQUFFLFlBQVksRUFBRSxjQUFjLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUNqRyxPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUc5RixNQUFNLE9BQU8sZ0NBQWdDO0lBQTdDO1FBQ1UsYUFBUSxHQUFHLEdBQUcsQ0FBQztRQUNmLFNBQUksR0FBRyxvQkFBb0IsQ0FBQztRQUM1QixTQUFJLHdDQUEyQjtRQUMvQixTQUFJLEdBQUcsdUJBQXVCLENBQUMsT0FBTyxDQUFDO0lBbUNqRCxDQUFDO0lBakNBLFdBQVcsQ0FBQyxRQUEwQjtRQUNyQyxNQUFNLGVBQWUsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLENBQUM7UUFDdkQsTUFBTSxXQUFXLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUMvQyxNQUFNLE9BQU8sR0FBYyxFQUFFLENBQUM7UUFDOUIsTUFBTSxpQkFBaUIsR0FBRyxzQkFBc0IsQ0FBQyxvQkFBb0IsRUFBRSx1QkFBdUIsQ0FBQztRQUMvRixJQUFJLGlCQUFpQixFQUFFLENBQUM7WUFDdkIsTUFBTSxXQUFXLEdBQUcsV0FBVyxDQUFDLGNBQWMsQ0FBQyxnQ0FBZ0MsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO1lBQ3BHLEtBQUssTUFBTSxNQUFNLElBQUksV0FBVyxFQUFFLENBQUM7Z0JBQ2xDLEtBQUssTUFBTSxDQUFDLElBQUksTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7b0JBQzNCLElBQUksQ0FBQyxZQUFZLGNBQWMsRUFBRSxDQUFDO3dCQUNqQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUNqQixDQUFDO2dCQUNGLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUVELE1BQU0sVUFBVSxHQUF1QyxlQUFlLENBQUMsY0FBYyxFQUFFLGVBQWUsQ0FBQyxzQkFBc0IsQ0FBQyxFQUFFLENBQUMsSUFBSSxTQUFTLENBQUM7UUFDL0ksSUFBSSxDQUFDLFVBQVUsRUFBRSxtQkFBbUIsRUFBRSxDQUFDO1lBQ3RDLE9BQU87UUFDUixDQUFDO1FBQ0QsTUFBTSxlQUFlLEdBQUcsVUFBVSxDQUFDLG1CQUFtQixDQUFDO1FBQ3ZELE9BQU8sSUFBSSx5QkFBeUIsOERBRW5DLEVBQUUsSUFBSSxzQ0FBeUIsRUFBRSxFQUNqQyxHQUFHLEVBQUUsR0FBRyxPQUFPLGVBQWUsQ0FBQyxDQUFDLENBQUMsRUFDakMsR0FBRyxFQUFFO1lBQ0osVUFBVSxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ3BCLENBQUMseUZBRUQsU0FBUyxFQUNULE9BQU8sQ0FDUCxDQUFDO0lBQ0gsQ0FBQztDQUNEIn0=