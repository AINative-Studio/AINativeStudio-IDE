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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3JlYXRlUHJvbXB0Q29tbWFuZC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci90ZXN0L0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL3Byb21wdFN5bnRheC9jb250cmlidXRpb25zL2NyZWF0ZVByb21wdENvbW1hbmQvY3JlYXRlUHJvbXB0Q29tbWFuZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDdkQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDL0QsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ2pFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUN4RSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0saURBQWlELENBQUM7QUFDOUUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDakYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQ25GLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUNwRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDdkYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQUM1RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDL0YsT0FBTyxFQUFFLE1BQU0sRUFBRSxZQUFZLEVBQUUsTUFBTSx5REFBeUQsQ0FB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