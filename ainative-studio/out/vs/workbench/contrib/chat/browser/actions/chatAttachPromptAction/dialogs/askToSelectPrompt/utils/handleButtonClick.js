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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGFuZGxlQnV0dG9uQ2xpY2suanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2FjdGlvbnMvY2hhdEF0dGFjaFByb21wdEFjdGlvbi9kaWFsb2dzL2Fza1RvU2VsZWN0UHJvbXB0L3V0aWxzL2hhbmRsZUJ1dHRvbkNsaWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM3RCxPQUFPLEVBQUUsYUFBYSxFQUFFLFdBQVcsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQzdELE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUsxRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQztBQWFyRzs7R0FFRztBQUNILE1BQU0sQ0FBQyxLQUFLLFVBQVUsaUJBQWlCLENBQ3RDLE9BQWtDLEVBQ2xDLE9BQWdFO0lBRWhFLE1BQU0sRUFBRSxTQUFTLEVBQUUsYUFBYSxFQUFFLFdBQVcsRUFBRSxhQUFhLEVBQUUsR0FBRyxPQUFPLENBQUM7SUFDekUsTUFBTSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsR0FBRyxPQUFPLENBQUM7SUFDakMsTUFBTSxFQUFFLEtBQUssRUFBRSxHQUFHLElBQUksQ0FBQztJQUV2Qiw0REFBNEQ7SUFDNUQsSUFBSSxNQUFNLEtBQUssV0FBVyxFQUFFLENBQUM7UUFDNUIsT0FBTyxNQUFNLGFBQWEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDeEMsQ0FBQztJQUVELHNEQUFzRDtJQUN0RCxJQUFJLE1BQU0sS0FBSyxhQUFhLEVBQUUsQ0FBQztRQUM5QiwyQ0FBMkM7UUFDM0MsTUFBTSxDQUNMLENBQUMs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