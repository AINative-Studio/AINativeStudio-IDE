/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../../../../nls.js';
import { createPromptFile } from './utils/createPromptFile.js';
import { CHAT_CATEGORY } from '../../../actions/chatActions.js';
import { askForPromptName } from './dialogs/askForPromptName.js';
import { ChatContextKeys } from '../../../../common/chatContextKeys.js';
import { ILogService } from '../../../../../../../platform/log/common/log.js';
import { askForPromptSourceFolder } from './dialogs/askForPromptSourceFolder.js';
import { IFileService } from '../../../../../../../platform/files/common/files.js';
import { ILabelService } from '../../../../../../../platform/label/common/label.js';
import { IOpenerService } from '../../../../../../../platform/opener/common/opener.js';
import { PromptsConfig } from '../../../../../../../platform/prompts/common/config.js';
import { ICommandService } from '../../../../../../../platform/commands/common/commands.js';
import { ContextKeyExpr } from '../../../../../../../platform/contextkey/common/contextkey.js';
import { MenuId, MenuRegistry } from '../../../../../../../platform/actions/common/actions.js';
import { IPromptsService } from '../../../../common/promptSyntax/service/types.js';
import { IQuickInputService } from '../../../../../../../platform/quickinput/common/quickInput.js';
import { IWorkspaceContextService } from '../../../../../../../platform/workspace/common/workspace.js';
import { CONFIGURE_SYNC_COMMAND_ID } from '../../../../../../services/userDataSync/common/userDataSync.js';
import { IUserDataSyncEnablementService } from '../../../../../../../platform/userDataSync/common/userDataSync.js';
import { KeybindingsRegistry } from '../../../../../../../platform/keybinding/common/keybindingsRegistry.js';
import { INotificationService, NeverShowAgainScope, Severity } from '../../../../../../../platform/notification/common/notification.js';
/**
 * Base command ID prefix.
 */
const BASE_COMMAND_ID = 'workbench.command.prompts.create';
/**
 * Command ID for creating a 'local' prompt.
 */
const LOCAL_COMMAND_ID = `${BASE_COMMAND_ID}.local`;
/**
 * Command ID for creating a 'user' prompt.
 */
const USER_COMMAND_ID = `${BASE_COMMAND_ID}.user`;
/**
 * Title of the 'create local prompt' command.
 */
const LOCAL_COMMAND_TITLE = localize('commands.prompts.create.title.local', "Create Prompt");
/**
 * Title of the 'create user prompt' command.
 */
const USER_COMMAND_TITLE = localize('commands.prompts.create.title.user', "Create User Prompt");
/**
 * The command implementation.
 */
const command = async (accessor, type) => {
    const logService = accessor.get(ILogService);
    const fileService = accessor.get(IFileService);
    const labelService = accessor.get(ILabelService);
    const openerService = accessor.get(IOpenerService);
    const promptsService = accessor.get(IPromptsService);
    const commandService = accessor.get(ICommandService);
    const quickInputService = accessor.get(IQuickInputService);
    const notificationService = accessor.get(INotificationService);
    const workspaceService = accessor.get(IWorkspaceContextService);
    const userDataSyncEnablementService = accessor.get(IUserDataSyncEnablementService);
    const fileName = await askForPromptName(type, quickInputService);
    if (!fileName) {
        return;
    }
    const selectedFolder = await askForPromptSourceFolder({
        type: type,
        labelService,
        openerService,
        promptsService,
        workspaceService,
        quickInputService,
    });
    if (!selectedFolder) {
        return;
    }
    const content = localize('workbench.command.prompts.create.initial-content', "Add prompt contents...");
    const promptUri = await createPromptFile({
        fileName,
        folder: selectedFolder,
        content,
        fileService,
        openerService,
    });
    await openerService.open(promptUri);
    if (type !== 'user') {
        return;
    }
    // due to PII concerns, synchronization of the 'user' reusable prompts
    // is disabled by default, but we want to make that fact clear to the user
    // hence after a 'user' prompt is create, we check if the synchronization
    // was explicitly configured before, and if it wasn't, we show a suggestion
    // to enable the synchronization logic in the Settings Sync configuration
    const isConfigured = userDataSyncEnablementService
        .isResourceEnablementConfigured("prompts" /* SyncResource.Prompts */);
    const isSettingsSyncEnabled = userDataSyncEnablementService.isEnabled();
    // if prompts synchronization has already been configured before or
    // if settings sync service is currently disabled, nothing to do
    if ((isConfigured === true) || (isSettingsSyncEnabled === false)) {
        return;
    }
    // show suggestion to enable synchronization of the user prompts to the user
    notificationService.prompt(Severity.Info, localize('workbench.command.prompts.create.user.enable-sync-notification', "User prompts are not currently synchronized. Do you want to enable synchronization of the user prompts?"), [
        {
            label: localize('enable.capitalized', "Enable"),
            run: () => {
                commandService.executeCommand(CONFIGURE_SYNC_COMMAND_ID)
                    .catch((error) => {
                    logService.error(`Failed to run '${CONFIGURE_SYNC_COMMAND_ID}' command: ${error}.`);
                });
            },
        }
    ], {
        neverShowAgain: {
            id: 'workbench.command.prompts.create.user.enable-sync-notification',
            scope: NeverShowAgainScope.PROFILE,
        },
    });
};
/**
 * Factory for creating the command handler with specific prompt `type`.
 */
const commandFactory = (type) => {
    return async (accessor) => {
        return command(accessor, type);
    };
};
/**
 * Register the "Create Prompt" command.
 */
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: LOCAL_COMMAND_ID,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    handler: commandFactory('local'),
    when: ContextKeyExpr.and(PromptsConfig.enabledCtx, ChatContextKeys.enabled),
});
/**
 * Register the "Create User Prompt" command.
 */
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: USER_COMMAND_ID,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    handler: commandFactory('user'),
    when: ContextKeyExpr.and(PromptsConfig.enabledCtx, ChatContextKeys.enabled),
});
/**
 * Register the "Create Prompt" command in the command palette.
 */
MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
    command: {
        id: LOCAL_COMMAND_ID,
        title: LOCAL_COMMAND_TITLE,
        category: CHAT_CATEGORY
    },
    when: ContextKeyExpr.and(PromptsConfig.enabledCtx, ChatContextKeys.enabled)
});
/**
 * Register the "Create User Prompt" command in the command palette.
 */
MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
    command: {
        id: USER_COMMAND_ID,
        title: USER_COMMAND_TITLE,
        category: CHAT_CATEGORY,
    },
    when: ContextKeyExpr.and(PromptsConfig.enabledCtx, ChatContextKeys.enabled)
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3JlYXRlUHJvbXB0Q29tbWFuZC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9wcm9tcHRTeW50YXgvY29udHJpYnV0aW9ucy9jcmVhdGVQcm9tcHRDb21tYW5kL2NyZWF0ZVByb21wdENvbW1hbmQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ3ZELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQy9ELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUNoRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUNqRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDeEUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQzlFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2pGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUNuRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0scURBQXFELENBQUM7QUFDcEYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUN2RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sMkRBQTJELENBQUM7QUFDNUYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQy9GLE9BQU8sRUFBRSxNQUFNLEVBQUUsWUFBWSxFQUFFLE1BQU0seURBQXlELENBQUM7QUFDL0YsT0FBTyxFQUFlLGVBQWUsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBRW5HLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDZEQUE2RCxDQUFDO0FBQ3ZHLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLGdFQUFnRSxDQUFDO0FBQzNHLE9BQU8sRUFBRSw4QkFBOEIsRUFBZ0IsTUFBTSxtRUFBbUUsQ0FBQztBQUNqSSxPQUFPLEVBQUUsbUJBQW1CLEVBQW9CLE1BQU0sd0VBQXdFLENBQUM7QUFDL0gsT0FBTyxFQUFFLG9CQUFvQixFQUFFLG1CQUFtQixFQUFFLFFBQVEsRUFBRSxNQUFNLG1FQUFtRSxDQUFDO0FBRXhJOztHQUVHO0FBQ0gsTUFBTSxlQUFlLEdBQUcsa0NBQWtDLENBQUM7QUFFM0Q7O0dBRUc7QUFDSCxNQUFNLGdCQUFnQixHQUFHLEdBQUcsZUFBZSxRQUFRLENBQUM7QUFFcEQ7O0dBRUc7QUFDSCxNQUFNLGVBQWUsR0FBRyxHQUFHLGVBQWUsT0FBTyxDQUFDO0FBRWxEOztHQUVHO0FBQ0gsTUFBTSxtQkFBbUIsR0FBRyxRQUFRLENBQUMscUNBQXFDLEVBQUUsZUFBZSxDQUFDLENBQUM7QUFFN0Y7O0dBRUc7QUFDSCxNQUFNLGtCQUFrQixHQUFHLFFBQVEsQ0FBQyxvQ0FBb0MsRUFBRSxvQkFBb0IsQ0FBQyxDQUFDO0FBRWhHOztHQUVHO0FBQ0gsTUFBTSxPQUFPLEdBQUcsS0FBSyxFQUNwQixRQUEwQixFQUMxQixJQUF5QixFQUNULEVBQUU7SUFDbEIsTUFBTSxVQUFVLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUM3QyxNQUFNLFdBQVcsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFDO0lBQy9DLE1BQU0sWUFBWSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUM7SUFDakQsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQztJQUNuRCxNQUFNLGNBQWMsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxDQUFDO0lBQ3JELE1BQU0sY0FBYyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLENBQUM7SUFDckQsTUFBTSxpQkFBaUIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLENBQUM7SUFDM0QsTUFBTSxtQkFBbUIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLENBQUM7SUFDL0QsTUFBTSxnQkFBZ0IsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLHdCQUF3QixDQUFDLENBQUM7SUFDaEUsTUFBTSw2QkFBNkIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLDhCQUE4QixDQUFDLENBQUM7SUFFbkYsTUFBTSxRQUFRLEdBQUcsTUFBTSxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztJQUNqRSxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDZixPQUFPO0lBQ1IsQ0FBQztJQUVELE1BQU0sY0FBYyxHQUFHLE1BQU0sd0JBQXdCLENBQUM7UUFDckQsSUFBSSxFQUFFLElBQUk7UUFDVixZQUFZO1FBQ1osYUFBYTtRQUNiLGNBQWM7UUFDZCxnQkFBZ0I7UUFDaEIsaUJBQWlCO0tBQ2pCLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztRQUNyQixPQUFPO0lBQ1IsQ0FBQztJQUVELE1BQU0sT0FBTyxHQUFHLFFBQVEsQ0FDdkIsa0RBQWtELEVBQ2xELHdCQUF3QixDQUN4QixDQUFDO0lBQ0YsTUFBTSxTQUFTLEdBQUcsTUFBTSxnQkFBZ0IsQ0FBQztRQUN4QyxRQUFRO1FBQ1IsTUFBTSxFQUFFLGNBQWM7UUFDdEIsT0FBTztRQUNQLFdBQVc7UUFDWCxhQUFhO0tBQ2IsQ0FBQyxDQUFDO0lBRUgsTUFBTSxhQUFhLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBRXBDLElBQUksSUFBSSxLQUFLLE1BQU0sRUFBRSxDQUFDO1FBQ3JCLE9BQU87SUFDUixDQUFDO0lBRUQsc0VBQXNFO0lBQ3RFLDBFQUEwRTtJQUMxRSx5RUFBeUU7SUFDekUsMkVBQTJFO0lBQzNFLHlFQUF5RTtJQUV6RSxNQUFNLFlBQVksR0FBRyw2QkFBNkI7U0FDaEQsOEJBQThCLHNDQUFzQixDQUFDO0lBQ3ZELE1BQU0scUJBQXFCLEdBQUcsNkJBQTZCLENBQUMsU0FBUyxFQUFFLENBQUM7SUFFeEUsbUVBQW1FO0lBQ25FLGdFQUFnRTtJQUNoRSxJQUFJLENBQUMsWUFBWSxLQUFLLElBQUksQ0FBQyxJQUFJLENBQUMscUJBQXFCLEtBQUssS0FBSyxDQUFDLEVBQUUsQ0FBQztRQUNsRSxPQUFPO0lBQ1IsQ0FBQztJQUVELDRFQUE0RTtJQUM1RSxtQkFBbUIsQ0FBQyxNQUFNLENBQ3pCLFFBQVEsQ0FBQyxJQUFJLEVBQ2IsUUFBUSxDQUNQLGdFQUFnRSxFQUNoRSx5R0FBeUcsQ0FDekcsRUFDRDtRQUNDO1lBQ0MsS0FBSyxFQUFFLFFBQVEsQ0FBQyxvQkFBb0IsRUFBRSxRQUFRLENBQUM7WUFDL0MsR0FBRyxFQUFFLEdBQUcsRUFBRTtnQkFDVCxjQUFjLENBQUMsY0FBYyxDQUFDLHlCQUF5QixDQUFDO3FCQUN0RCxLQUFLLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRTtvQkFDaEIsVUFBVSxDQUFDLEtBQUssQ0FBQyxrQkFBa0IseUJBQXlCLGNBQWMsS0FBSyxHQUFHLENBQUMsQ0FBQztnQkFDckYsQ0FBQyxDQUFDLENBQUM7WUFDTCxDQUFDO1NBQ0Q7S0FDRCxFQUNEO1FBQ0MsY0FBYyxFQUFFO1lBQ2YsRUFBRSxFQUFFLGdFQUFnRTtZQUNwRSxLQUFLLEVBQUUsbUJBQW1CLENBQUMsT0FBTztTQUNsQztLQUNELENBQ0QsQ0FBQztBQUNILENBQUMsQ0FBQztBQUVGOztHQUVHO0FBQ0gsTUFBTSxjQUFjLEdBQUcsQ0FBQyxJQUFzQixFQUFFLEVBQUU7SUFDakQsT0FBTyxLQUFLLEVBQUUsUUFBMEIsRUFBaUIsRUFBRTtRQUMxRCxPQUFPLE9BQU8sQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDaEMsQ0FBQyxDQUFDO0FBQ0gsQ0FBQyxDQUFDO0FBRUY7O0dBRUc7QUFDSCxtQkFBbUIsQ0FBQyxnQ0FBZ0MsQ0FBQztJQUNwRCxFQUFFLEVBQUUsZ0JBQWdCO0lBQ3BCLE1BQU0sNkNBQW1DO0lBQ3pDLE9BQU8sRUFBRSxjQUFjLENBQUMsT0FBTyxDQUFDO0lBQ2hDLElBQUksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxVQUFVLEVBQUUsZUFBZSxDQUFDLE9BQU8sQ0FBQztDQUMzRSxDQUFDLENBQUM7QUFFSDs7R0FFRztBQUNILG1CQUFtQixDQUFDLGdDQUFnQyxDQUFDO0lBQ3BELEVBQUUsRUFBRSxlQUFlO0lBQ25CLE1BQU0sNkNBQW1DO0lBQ3pDLE9BQU8sRUFBRSxjQUFjLENBQUMsTUFBTSxDQUFDO0lBQy9CLElBQUksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxVQUFVLEVBQUUsZUFBZSxDQUFDLE9BQU8sQ0FBQztDQUMzRSxDQUFDLENBQUM7QUFFSDs7R0FFRztBQUNILFlBQVksQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLGNBQWMsRUFBRTtJQUNsRCxPQUFPLEVBQUU7UUFDUixFQUFFLEVBQUUsZ0JBQWdCO1FBQ3BCLEtBQUssRUFBRSxtQkFBbUI7UUFDMUIsUUFBUSxFQUFFLGFBQWE7S0FDdkI7SUFDRCxJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsVUFBVSxFQUFFLGVBQWUsQ0FBQyxPQUFPLENBQUM7Q0FDM0UsQ0FBQyxDQUFDO0FBRUg7O0dBRUc7QUFDSCxZQUFZLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxjQUFjLEVBQUU7SUFDbEQsT0FBTyxFQUFFO1FBQ1IsRUFBRSxFQUFFLGVBQWU7UUFDbkIsS0FBSyxFQUFFLGtCQUFrQjtRQUN6QixRQUFRLEVBQUUsYUFBYTtLQUN2QjtJQUNELElBQUksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxVQUFVLEVBQUUsZUFBZSxDQUFDLE9BQU8sQ0FBQztDQUMzRSxDQUFDLENBQUMifQ==