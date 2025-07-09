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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFF1aWNrSW5wdXRBY3Rpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9hY3Rpb25zL2NoYXRRdWlja0lucHV0QWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFFakUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQzNFLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDNUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsZUFBZSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFHckcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBQ2pELE9BQU8sRUFBeUIsaUJBQWlCLEVBQUUsTUFBTSxZQUFZLENBQUM7QUFDdEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBRWxFLE1BQU0sQ0FBQyxNQUFNLDRCQUE0QixHQUFHLG1DQUFtQyxDQUFDO0FBQ2hGLE1BQU0sVUFBVSx3QkFBd0I7SUFDdkMsZUFBZSxDQUFDLHFCQUFxQixDQUFDLENBQUM7SUFDdkMsZUFBZSxDQUFDLGtCQUFrQixDQUFDLENBQUM7SUFFcEMsZUFBZSxDQUFDLE1BQU0sb0JBQXFCLFNBQVEsT0FBTztRQUN6RDtZQUNDLEtBQUssQ0FBQztnQkFDTCxFQUFFLEVBQUUsMkNBQTJDO2dCQUMvQyxLQUFLLEVBQUUsU0FBUyxDQUFDLDJCQUEyQixFQUFFLG1CQUFtQixDQUFDO2dCQUNsRSxFQUFFLEVBQUUsS0FBSztnQkFDVCxRQUFRLEVBQUUsYUFBYTtnQkFDdkIsSUFBSSxF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