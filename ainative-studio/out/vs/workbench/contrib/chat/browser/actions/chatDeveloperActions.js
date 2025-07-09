/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../../../base/common/codicons.js';
import { localize2 } from '../../../../../nls.js';
import { Categories } from '../../../../../platform/action/common/actionCommonCategories.js';
import { Action2, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { ChatContextKeys } from '../../common/chatContextKeys.js';
import { IChatService } from '../../common/chatService.js';
import { IChatWidgetService } from '../chat.js';
export function registerChatDeveloperActions() {
    registerAction2(LogChatInputHistoryAction);
    registerAction2(LogChatIndexAction);
}
class LogChatInputHistoryAction extends Action2 {
    static { this.ID = 'workbench.action.chat.logInputHistory'; }
    constructor() {
        super({
            id: LogChatInputHistoryAction.ID,
            title: localize2('workbench.action.chat.logInputHistory.label', "Log Chat Input History"),
            icon: Codicon.attach,
            category: Categories.Developer,
            f1: true,
            precondition: ChatContextKeys.enabled
        });
    }
    async run(accessor, ...args) {
        const chatWidgetService = accessor.get(IChatWidgetService);
        chatWidgetService.lastFocusedWidget?.logInputHistory();
    }
}
class LogChatIndexAction extends Action2 {
    static { this.ID = 'workbench.action.chat.logChatIndex'; }
    constructor() {
        super({
            id: LogChatIndexAction.ID,
            title: localize2('workbench.action.chat.logChatIndex.label', "Log Chat Index"),
            icon: Codicon.attach,
            category: Categories.Developer,
            f1: true
        });
    }
    async run(accessor, ...args) {
        const chatService = accessor.get(IChatService);
        chatService.logChatIndex();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdERldmVsb3BlckFjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2FjdGlvbnMvY2hhdERldmVsb3BlckFjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBRWpFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUNsRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0saUVBQWlFLENBQUM7QUFDN0YsT0FBTyxFQUFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUM3RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDbEUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQzNELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLFlBQVksQ0FBQztBQUVoRCxNQUFNLFVBQVUsNEJBQTRCO0lBQzNDLGVBQWUsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO0lBQzNDLGVBQWUsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO0FBQ3JDLENBQUM7QUFFRCxNQUFNLHlCQUEwQixTQUFRLE9BQU87YUFDOUIsT0FBRSxHQUFHLHVDQUF1QyxDQUFDO0lBRTdEO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLHlCQUF5QixDQUFDLEVBQUU7WUFDaEMsS0FBSyxFQUFFLFNBQVMsQ0FBQyw2Q0FBNkMsRUFBRSx3QkFBd0IsQ0FBQztZQUN6RixJQUFJLEVBQUUsT0FBTyxDQUFDLE1BQU07WUFDcEIsUUFBUSxFQUFFLFVBQVUsQ0FBQyxTQUFTO1lBQzlCLEVBQUUsRUFBRSxJQUFJO1lBQ1IsWUFBWSxFQUFFLGVBQWUsQ0FBQyxPQUFPO1NBQ3JDLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFUSxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQTBCLEVBQUUsR0FBRyxJQUFXO1FBQzVELE1BQU0saUJBQWlCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1FBQzNELGlCQUFpQixDQUFDLGlCQUFpQixFQUFFLGVBQWUsRUFBRSxDQUFDO0lBQ3hELENBQUM7O0FBR0YsTUFBTSxrQkFBbUIsU0FBUSxPQUFPO2FBQ3ZCLE9BQUUsR0FBRyxvQ0FBb0MsQ0FBQztJQUUxRDtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSxrQkFBa0IsQ0FBQyxFQUFFO1lBQ3pCLEtBQUssRUFBRSxTQUFTLENBQUMsMENBQTBDLEVBQUUsZ0JBQWdCLENBQUM7WUFDOUUsSUFBSSxFQUFFLE9BQU8sQ0FBQyxNQUFNO1lBQ3BCLFFBQVEsRUFBRSxVQUFVLENBQUMsU0FBUztZQUM5QixFQUFFLEVBQUUsSUFBSTtTQUNSLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFUSxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQTBCLEVBQUUsR0FBRyxJQUFXO1FBQzVELE1BQU0sV0FBVyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDL0MsV0FBVyxDQUFDLFlBQVksRUFBRSxDQUFDO0lBQzVCLENBQUMifQ==