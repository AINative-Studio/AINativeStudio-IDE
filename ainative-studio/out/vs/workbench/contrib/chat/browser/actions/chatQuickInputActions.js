/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../../../base/common/codicons.js';
import { Selection } from '../../../../../editor/common/core/selection.js';
import { localize, localize2 } from '../../../../../nls.js';
import { Action2, MenuId, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { CHAT_CATEGORY } from './chatActions.js';
import { IQuickChatService } from '../chat.js';
import { ChatContextKeys } from '../../common/chatContextKeys.js';
export const ASK_QUICK_QUESTION_ACTION_ID = 'workbench.action.quickchat.toggle';
export function registerQuickChatActions() {
    registerAction2(QuickChatGlobalAction);
    registerAction2(AskQuickChatAction);
    registerAction2(class OpenInChatViewAction extends Action2 {
        constructor() {
            super({
                id: 'workbench.action.quickchat.openInChatView',
                title: localize2('chat.openInChatView.label', "Open in Chat View"),
                f1: false,
                category: CHAT_CATEGORY,
                icon: Codicon.commentDiscussion,
                menu: {
                    id: MenuId.ChatInputSide,
                    group: 'navigation',
                    order: 10
                }
            });
        }
        run(accessor) {
            const quickChatService = accessor.get(IQuickChatService);
            quickChatService.openInChatView();
        }
    });
    registerAction2(class CloseQuickChatAction extends Action2 {
        constructor() {
            super({
                id: 'workbench.action.quickchat.close',
                title: localize2('chat.closeQuickChat.label', "Close Quick Chat"),
                f1: false,
                category: CHAT_CATEGORY,
                icon: Codicon.close,
                menu: {
                    id: MenuId.ChatInputSide,
                    group: 'navigation',
                    order: 20
                }
            });
        }
        run(accessor) {
            const quickChatService = accessor.get(IQuickChatService);
            quickChatService.close();
        }
    });
}
class QuickChatGlobalAction extends Action2 {
    constructor() {
        super({
            id: ASK_QUICK_QUESTION_ACTION_ID,
            title: localize2('quickChat', 'Quick Chat'),
            precondition: ChatContextKeys.enabled,
            icon: Codicon.commentDiscussion,
            f1: false,
            category: CHAT_CATEGORY,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 42 /* KeyCode.KeyL */,
            },
            menu: {
                id: MenuId.ChatTitleBarMenu,
                group: 'a_open',
                order: 4
            },
            metadata: {
                description: localize('toggle.desc', 'Toggle the quick chat'),
                args: [{
                        name: 'args',
                        schema: {
                            anyOf: [
                                {
                                    type: 'object',
                                    required: ['query'],
                                    properties: {
                                        query: {
                                            description: localize('toggle.query', "The query to open the quick chat with"),
                                            type: 'string'
                                        },
                                        isPartialQuery: {
                                            description: localize('toggle.isPartialQuery', "Whether the query is partial; it will wait for more user input"),
                                            type: 'boolean'
                                        }
                                    },
                                },
                                {
                                    type: 'string',
                                    description: localize('toggle.query', "The query to open the quick chat with")
                                }
                            ]
                        }
                    }]
            },
        });
    }
    run(accessor, query) {
        const quickChatService = accessor.get(IQuickChatService);
        let options;
        switch (typeof query) {
            case 'string':
                options = { query };
                break;
            case 'object':
                options = query;
                break;
        }
        if (options?.query) {
            options.selection = new Selection(1, options.query.length + 1, 1, options.query.length + 1);
        }
        quickChatService.toggle(options);
    }
}
class AskQuickChatAction extends Action2 {
    constructor() {
        super({
            id: `workbench.action.openQuickChat`,
            category: CHAT_CATEGORY,
            title: localize2('interactiveSession.open', "Open Quick Chat"),
            precondition: ChatContextKeys.enabled,
            f1: true
        });
    }
    run(accessor, query) {
        const quickChatService = accessor.get(IQuickChatService);
        quickChatService.toggle(query ? {
            query,
            selection: new Selection(1, query.length + 1, 1, query.length + 1)
        } : undefined);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFF1aWNrSW5wdXRBY3Rpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2FjdGlvbnMvY2hhdFF1aWNrSW5wdXRBY3Rpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUVqRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDM0UsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUM1RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxlQUFlLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUdyRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sa0JBQWtCLENBQUM7QUFDakQsT0FBTyxFQUF5QixpQkFBaUIsRUFBRSxNQUFNLFlBQVksQ0FBQztBQUN0RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFFbEUsTUFBTSxDQUFDLE1BQU0sNEJBQTRCLEdBQUcsbUNBQW1DLENBQUM7QUFDaEYsTUFBTSxVQUFVLHdCQUF3QjtJQUN2QyxlQUFlLENBQUMscUJBQXFCLENBQUMsQ0FBQztJQUN2QyxlQUFlLENBQUMsa0JBQWtCLENBQUMsQ0FBQztJQUVwQyxlQUFlLENBQUMsTUFBTSxvQkFBcUIsU0FBUSxPQUFPO1FBQ3pEO1lBQ0MsS0FBSyxDQUFDO2dCQUNMLEVBQUUsRUFBRSwyQ0FBMkM7Z0JBQy9DLEtBQUssRUFBRSxTQUFTLENBQUMsMkJBQTJCLEVBQUUsbUJBQW1CLENBQUM7Z0JBQ2xFLEVBQUUsRUFBRSxLQUFLO2dCQUNULFFBQVEsRUFBRSxhQUFhO2dCQUN2QixJQUFJLEVB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