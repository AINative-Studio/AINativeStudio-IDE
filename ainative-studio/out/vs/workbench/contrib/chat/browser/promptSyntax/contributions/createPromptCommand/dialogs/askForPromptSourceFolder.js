/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../../../../../nls.js';
import { URI } from '../../../../../../../../base/common/uri.js';
import { DOCUMENTATION_URL } from '../../../../../common/promptSyntax/constants.js';
import { basename, extUri } from '../../../../../../../../base/common/resources.js';
/**
 * Asks the user for a specific prompt folder, if multiple folders provided.
 * Returns immediately if only one folder available.
 */
export const askForPromptSourceFolder = async (options) => {
    const { type, promptsService, quickInputService, labelService, openerService, workspaceService } = options;
    // get prompts source folders based on the prompt type
    const folders = promptsService.getSourceFolders(type);
    // if no source folders found, show 'learn more' dialog
    // note! this is a temporary solution and must be replaced with a dialog to select
    //       a custom folder path, or switch to a different prompt type
    if (folders.length === 0) {
        return await showNoFoldersDialog(quickInputService, openerService);
    }
    // if there is only one folder, no need to ask
    // note! when we add more actions to the dialog, this will have to go
    if (folders.length === 1) {
        return folders[0].uri;
    }
    const pickOptions = {
        placeHolder: localize('commands.prompts.create.ask-folder.placeholder', "Select a prompt source folder"),
        canPickMany: false,
        matchOnDescription: true,
    };
    // create list of source folder locations
    const foldersList = folders.map(({ uri }) => {
        const { folders } = workspaceService.getWorkspace();
        const isMultirootWorkspace = (folders.length > 1);
        const firstFolder = folders[0];
        // if multi-root or empty workspace, or source folder `uri` does not point to
        // the root folder of a single-root workspace, return the default label and description
        if (isMultirootWorkspace || !firstFolder || !extUri.isEqual(firstFolder.uri, uri)) {
            return {
                type: 'item',
                label: basename(uri),
                description: labelService.getUriLabel(uri, { relative: true }),
                tooltip: uri.fsPath,
                value: uri,
            };
        }
        // if source folder points to the root of this single-root workspace,
        // use appropriate label and description strings to prevent confusion
        return {
            type: 'item',
            label: localize('commands.prompts.create.source-folder.current-workspace', "Current Workspace"),
            // use absolute path as the description
            description: labelService.getUriLabel(uri, { relative: false }),
            tooltip: uri.fsPath,
            value: uri,
        };
    });
    const answer = await quickInputService.pick(foldersList, pickOptions);
    if (!answer) {
        return;
    }
    return answer.value;
};
/**
 * Shows a dialog to the user when no prompt source folders are found.
 *
 * Note! this is a temporary solution and must be replaced with a dialog to select
 *       a custom folder path, or switch to a different prompt type
 */
const showNoFoldersDialog = async (quickInputService, openerService) => {
    const docsQuickPick = {
        type: 'item',
        label: localize('commands.prompts.create.ask-folder.empty.docs-label', 'Learn how to configure reusable prompts'),
        description: DOCUMENTATION_URL,
        tooltip: DOCUMENTATION_URL,
        value: URI.parse(DOCUMENTATION_URL),
    };
    const result = await quickInputService.pick([docsQuickPick], {
        placeHolder: localize('commands.prompts.create.ask-folder.empty.placeholder', 'No prompt source folders found.'),
        canPickMany: false,
    });
    if (!result) {
        return;
    }
    await openerService.open(result.value);
    return;
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXNrRm9yUHJvbXB0U291cmNlRm9sZGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL3Byb21wdFN5bnRheC9jb250cmlidXRpb25zL2NyZWF0ZVByb21wdENvbW1hbmQvZGlhbG9ncy9hc2tGb3JQcm9tcHRTb3VyY2VGb2xkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQzFELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUVqRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUNwRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBdUJwRjs7O0dBR0c7QUFDSCxNQUFNLENBQUMsTUFBTSx3QkFBd0IsR0FBRyxLQUFLLEVBQzVDLE9BQTZCLEVBQ0YsRUFBRTtJQUM3QixNQUFNLEVBQUUsSUFBSSxFQUFFLGNBQWMsRUFBRSxpQkFBaUIsRUFBRSxZQUFZLEVBQUUsYUFBYSxFQUFFLGdCQUFnQixFQUFFLEdBQUcsT0FBTyxDQUFDO0lBRTNHLHNEQUFzRDtJQUN0RCxNQUFNLE9BQU8sR0FBRyxjQUFjLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLENBQUM7SUFFdEQsdURBQXVEO0lBQ3ZELGtGQUFrRjtJQUNsRixtRUFBbUU7SUFDbkUsSUFBSSxPQUFPLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1FBQzFCLE9BQU8sTUFBTSxtQkFBbUIsQ0FBQyxpQkFBaUIsRUFBRSxhQUFhLENBQUMsQ0FBQztJQUNwRSxDQUFDO0lBRUQsOENBQThDO0lBQzlDLHFFQUFxRTtJQUNy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