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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXNrRm9yUHJvbXB0U291cmNlRm9sZGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9wcm9tcHRTeW50YXgvY29udHJpYnV0aW9ucy9jcmVhdGVQcm9tcHRDb21tYW5kL2RpYWxvZ3MvYXNrRm9yUHJvbXB0U291cmNlRm9sZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUMxRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFFakUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0saURBQWlELENBQUM7QUFDcEYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQXVCcEY7OztHQUdHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sd0JBQXdCLEdBQUcsS0FBSyxFQUM1QyxPQUE2QixFQUNGLEVBQUU7SUFDN0IsTUFBTSxFQUFFLElBQUksRUFBRSxjQUFjLEVBQUUsaUJBQWlCLEVBQUUsWUFBWSxFQUFFLGFBQWEsRUFBRSxnQkFBZ0IsRUFBRSxHQUFHLE9BQU8sQ0FBQztJQUUzRyxzREFBc0Q7SUFDdEQsTUFBTSxPQUFPLEdBQUcsY0FBYyxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxDQUFDO0lBRXRELHVEQUF1RDtJQUN2RCxrRkFBa0Y7SUFDbEYsbUVBQW1FO0lBQ25FLElBQUksT0FBTyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztRQUMxQixPQUFPLE1BQU0sbUJBQW1CLENBQUMsaUJBQWlCLEVBQUUsYUFBYSxDQUFDLENBQUM7SUFDcEUsQ0FBQztJQUVELDhDQUE4QztJQUM5QyxxRUFBcUU7SUFD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