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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGFuZGxlQnV0dG9uQ2xpY2suanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvdGVzdC9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9hY3Rpb25zL2NoYXRBdHRhY2hQcm9tcHRBY3Rpb24vZGlhbG9ncy9hc2tUb1NlbGVjdFByb21wdC91dGlscy9oYW5kbGVCdXR0b25DbGljay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDN0QsT0FBTyxFQUFFLGFBQWEsRUFBRSxXQUFXLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUM3RCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFLMUUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0saUVBQWlFLENBQUM7QUFhckc7O0dBRUc7QUFDSCxNQUFNLENBQUMsS0FBSyxVQUFVLGlCQUFpQixDQUN0QyxPQUFrQyxFQUNsQyxPQUFnRTtJQUVoRSxNQUFNLEVBQUUsU0FBUyxFQUFFLGFBQWEsRUFBRSxXQUFXLEVBQUUsYUFBYSxFQUFFLEdBQUcsT0FBTyxDQUFDO0lBQ3pFLE1BQU0sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLEdBQUcsT0FBTyxDQUFDO0lBQ2pDLE1BQU0sRUFBRSxLQUFLLEVBQUUsR0FBRyxJQUFJLENBQUM7SUFFdkIsNERBQTREO0lBQzVELElBQUksTUFBTSxLQUFLLFdBQVcsRUFBRSxDQUFDO1FBQzVCLE9BQU8sTUFBTSxhQUFhLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ3hDLENBQUM7SUFFRCxzREFBc0Q7SUFDdEQsSUFBSSxNQUFNLEtBQUssYUFBYSxFQUFFLENBQUM7UUFDOUIsMkNBQTJDO1FBQzNDLE1BQU0sQ0FDTCxD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