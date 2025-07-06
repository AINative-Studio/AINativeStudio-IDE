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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXNrRm9yUHJvbXB0U291cmNlRm9sZGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvcHJvbXB0U3ludGF4L2NvbnRyaWJ1dGlvbnMvY3JlYXRlUHJvbXB0Q29tbWFuZC9kaWFsb2dzL2Fza0ZvclByb21wdFNvdXJjZUZvbGRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDMUQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBRWpFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUF1QnBGOzs7R0FHRztBQUNILE1BQU0sQ0FBQyxNQUFNLHdCQUF3QixHQUFHLEtBQUssRUFDNUMsT0FBNkIsRUFDRixFQUFFO0lBQzdCLE1BQU0sRUFBRSxJQUFJLEVBQUUsY0FBYyxFQUFFLGlCQUFpQixFQUFFLFlBQVksRUFBRSxhQUFhLEVBQUUsZ0JBQWdCLEVBQUUsR0FBRyxPQUFPLENBQUM7SUFFM0csc0RBQXNEO0lBQ3RELE1BQU0sT0FBTyxHQUFHLGNBQWMsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUV0RCx1REFBdUQ7SUFDdkQsa0ZBQWtGO0lBQ2xGLG1FQUFtRTtJQUNuRSxJQUFJLE9BQU8sQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7UUFDMUIsT0FBTyxNQUFNLG1CQUFtQixDQUFDLGlCQUFpQixFQUFFLGFBQWEsQ0FBQyxDQUFDO0lBQ3BFLENBQUM7SUFFRCw4Q0FBOEM7SUFDOUMscUVBQXFF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