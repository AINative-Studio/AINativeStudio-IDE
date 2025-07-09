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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3JlYXRlUHJvbXB0Q29tbWFuZC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvcHJvbXB0U3ludGF4L2NvbnRyaWJ1dGlvbnMvY3JlYXRlUHJvbXB0Q29tbWFuZC9jcmVhdGVQcm9tcHRDb21tYW5kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUN2RCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUMvRCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDaEUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDakUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUM5RSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNqRixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0scURBQXFELENBQUM7QUFDbkYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUN2RixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDdkYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBQzVGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUMvRixPQUFPLEVBQUUsTUFBTSxFQUFFLFlBQVksRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FB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