/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../../../../../../nls.js';
import { DELETE_BUTTON, EDIT_BUTTON } from '../constants.js';
import { assert } from '../../../../../../../../../base/common/assert.js';
import { getCleanPromptName } from '../../../../../../../../../platform/prompts/common/constants.js';
/**
 * Handler for a button click event on a prompt file item in the prompt selection dialog.
 */
export async function handleButtonClick(options, context) {
    const { quickPick, openerService, fileService, dialogService } = options;
    const { item, button } = context;
    const { value } = item;
    // `edit` button was pressed, open the prompt file in editor
    if (button === EDIT_BUTTON) {
        return await openerService.open(value);
    }
    // `delete` button was pressed, delete the prompt file
    if (button === DELETE_BUTTON) {
        // sanity check to confirm our expectations
        assert((quickPick.activeItems.length < 2), `Expected maximum one active item, got '${quickPick.activeItems.length}'.`);
        const activeItem = quickPick.activeItems[0];
        // sanity checks - prompt file exists and is not a folder
        const info = await fileService.stat(value);
        assert(info.isDirectory === false, `'${value.fsPath}' points to a folder.`);
        // don't close the main prompt selection dialog by the confirmation dialog
        const previousIgnoreFocusOut = quickPick.ignoreFocusOut;
        quickPick.ignoreFocusOut = true;
        const filename = getCleanPromptName(value);
        const { confirmed } = await dialogService.confirm({
            message: localize('commands.prompts.use.select-dialog.delete-prompt.confirm.message', "Are you sure you want to delete '{0}'?", filename),
        });
        // restore the previous value of the `ignoreFocusOut` property
        quickPick.ignoreFocusOut = previousIgnoreFocusOut;
        // if prompt deletion was not confirmed, nothing to do
        if (!confirmed) {
            return;
        }
        // prompt deletion was confirmed so delete the prompt file
        await fileService.del(value);
        // remove the deleted prompt from the selection dialog list
        let removedIndex = -1;
        quickPick.items = quickPick.items.filter((option, index) => {
            if (option === item) {
                removedIndex = index;
                return false;
            }
            return true;
        });
        // if the deleted item was active item, find a new item to set as active
        if (activeItem && (activeItem === item)) {
            assert(removedIndex >= 0, 'Removed item index must be a valid index.');
            // we set the previous item as new active, or the next item
            // if removed prompt item was in the beginning of the list
            const newActiveItemIndex = Math.max(removedIndex - 1, 0);
            const newActiveItem = quickPick.items[newActiveItemIndex];
            quickPick.activeItems = newActiveItem ? [newActiveItem] : [];
        }
        return;
    }
    throw new Error(`Unknown button '${JSON.stringify(button)}'.`);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGFuZGxlQnV0dG9uQ2xpY2suanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvYWN0aW9ucy9jaGF0QXR0YWNoUHJvbXB0QWN0aW9uL2RpYWxvZ3MvYXNrVG9TZWxlY3RQcm9tcHQvdXRpbHMvaGFuZGxlQnV0dG9uQ2xpY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxhQUFhLEVBQUUsV0FBVyxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDN0QsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBSzFFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGlFQUFpRSxDQUFDO0FBYXJHOztHQUVHO0FBQ0gsTUFBTSxDQUFDLEtBQUssVUFBVSxpQkFBaUIsQ0FDdEMsT0FBa0MsRUFDbEMsT0FBZ0U7SUFFaEUsTUFBTSxFQUFFLFNBQVMsRUFBRSxhQUFhLEVBQUUsV0FBVyxFQUFFLGFBQWEsRUFBRSxHQUFHLE9BQU8sQ0FBQztJQUN6RSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxHQUFHLE9BQU8sQ0FBQztJQUNqQyxNQUFNLEVBQUUsS0FBSyxFQUFFLEdBQUcsSUFBSSxDQUFDO0lBRXZCLDREQUE0RDtJQUM1RCxJQUFJLE1BQU0sS0FBSyxXQUFXLEVBQUUsQ0FBQztRQUM1QixPQUFPLE1BQU0sYUFBYSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUN4QyxDQUFDO0lBRUQsc0RBQXNEO0lBQ3RELElBQUksTUFBTSxLQUFLLGFBQWEsRUFBRSxDQUFDO1FBQzlCLDJDQUEyQztRQUMzQyxNQUFNLENBQ0wsQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsRUFDbEMsMENBQTBDLFNBQVMsQ0FBQyxXQUFXLENBQUMsTUFBTSxJQUFJLENBQzFFLENBQUM7UUFFRixNQUFNLFVBQVUsR0FBNkMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUV0Rix5REFBeUQ7UUFDekQsTUFBTSxJQUFJLEdBQUcsTUFBTSxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzNDLE1BQU0sQ0FDTCxJQUFJLENBQUMsV0FBVyxLQUFLLEtBQUssRUFDMUIsSUFBSSxLQUFLLENBQUMsTUFBTSx1QkFBdUIsQ0FDdkMsQ0FBQztRQUVGLDBFQUEwRTtRQUMxRSxNQUFNLHNCQUFzQixHQUFHLFNBQVMsQ0FBQyxjQUFjLENBQUM7UUFDeEQsU0FBUyxDQUFDLGNBQWMsR0FBRyxJQUFJLENBQUM7UUFFaEMsTUFBTSxRQUFRLEdBQUcsa0JBQWtCLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDM0MsTUFBTSxFQUFFLFNBQVMsRUFBRSxHQUFHLE1BQU0sYUFBYSxDQUFDLE9BQU8sQ0FBQztZQUNqRCxPQUFPLEVBQUUsUUFBUSxDQUNoQixrRUFBa0UsRUFDbEUsd0NBQXdDLEVBQ3hDLFFBQVEsQ0FDUjtTQUNELENBQUMsQ0FBQztRQUVILDhEQUE4RDtRQUM5RCxTQUFTLENBQUMsY0FBYyxHQUFHLHNCQUFzQixDQUFDO1FBRWxELHNEQUFzRDtRQUN0RCxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDaEIsT0FBTztRQUNSLENBQUM7UUFFRCwwREFBMEQ7UUFDMUQsTUFBTSxXQUFXLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBRTdCLDJEQUEyRDtRQUMzRCxJQUFJLFlBQVksR0FBRyxDQUFDLENBQUMsQ0FBQztRQUN0QixTQUFTLENBQUMsS0FBSyxHQUFHLFNBQVMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxFQUFFO1lBQzFELElBQUksTUFBTSxLQUFLLElBQUksRUFBRSxDQUFDO2dCQUNyQixZQUFZLEdBQUcsS0FBSyxDQUFDO2dCQUVyQixPQUFPLEtBQUssQ0FBQztZQUNkLENBQUM7WUFFRCxPQUFPLElBQUksQ0FBQztRQUNiLENBQUMsQ0FBQyxDQUFDO1FBRUgsd0VBQXdFO1FBQ3hFLElBQUksVUFBVSxJQUFJLENBQUMsVUFBVSxLQUFLLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDekMsTUFBTSxDQUNMLFlBQVksSUFBSSxDQUFDLEVBQ2pCLDJDQUEyQyxDQUMzQyxDQUFDO1lBRUYsMkRBQTJEO1lBQzNELDBEQUEwRDtZQUMxRCxNQUFNLGtCQUFrQixHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsWUFBWSxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUN6RCxNQUFNLGFBQWEsR0FBNkMsU0FBUyxDQUFDLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1lBRXBHLFNBQVMsQ0FBQyxXQUFXLEdBQUcsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFDOUQsQ0FBQztRQUVELE9BQU87SUFDUixDQUFDO0lBRUQsTUFBTSxJQUFJLEtBQUssQ0FBQyxtQkFBbUIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDaEUsQ0FBQyJ9