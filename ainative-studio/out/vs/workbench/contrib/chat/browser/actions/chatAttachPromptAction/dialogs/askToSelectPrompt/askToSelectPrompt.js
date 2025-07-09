/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { DOCS_OPTION } from './constants.js';
import { attachPrompts } from './utils/attachPrompts.js';
import { handleButtonClick } from './utils/handleButtonClick.js';
import { assert } from '../../../../../../../../base/common/assert.js';
import { createPromptPickItem } from './utils/createPromptPickItem.js';
import { createPlaceholderText } from './utils/createPlaceholderText.js';
import { extUri } from '../../../../../../../../base/common/resources.js';
import { DisposableStore } from '../../../../../../../../base/common/lifecycle.js';
/**
 * Shows the prompt selection dialog to the user that allows to select a prompt file(s).
 *
 * If {@link ISelectPromptOptions.resource resource} is provided, the dialog will have
 * the resource pre-selected in the prompts list.
 */
export const askToSelectPrompt = async (options) => {
    const { promptFiles, resource, quickInputService, labelService } = options;
    const fileOptions = promptFiles.map((promptFile) => {
        return createPromptPickItem(promptFile, labelService);
    });
    /**
     * Add a link to the documentation to the end of prompts list.
     */
    fileOptions.push(DOCS_OPTION);
    // if a resource is provided, create an `activeItem` for it to pre-select
    // it in the UI, and sort the list so the active item appears at the top
    let activeItem;
    if (resource) {
        activeItem = fileOptions.find((file) => {
            return extUri.isEqual(file.value, resource);
        });
        // if no item for the `resource` was found, it means that the resource is not
        // in the list of prompt files, so add a new item for it; this ensures that
        // the currently active prompt file is always available in the selection dialog,
        // even if it is not included in the prompts list otherwise(from location setting)
        if (!activeItem) {
            activeItem = createPromptPickItem({
                uri: resource,
                // "user" prompts are always registered in the prompts list, hence it
                // should be safe to assume that `resource` is not "user" prompt here
                type: 'local',
            }, labelService);
            fileOptions.push(activeItem);
        }
        fileOptions.sort((file1, file2) => {
            if (extUri.isEqual(file1.value, resource)) {
                return -1;
            }
            if (extUri.isEqual(file2.value, resource)) {
                return 1;
            }
            return 0;
        });
    }
    /**
     * If still no active item present, fall back to the first item in the list.
     * This can happen only if command was invoked not from a focused prompt file
     * (hence the `resource` is not provided in the options).
     *
     * Fixes the two main cases:
     *  - when no prompt files found it, pre-selects the documentation link
     *  - when there is only a single prompt file, pre-selects it
     */
    if (!activeItem) {
        activeItem = fileOptions[0];
    }
    // otherwise show the prompt file selection dialog
    const quickPick = quickInputService.createQuickPick();
    quickPick.activeItems = activeItem ? [activeItem] : [];
    quickPick.placeholder = createPlaceholderText(options);
    quickPick.canAcceptInBackground = true;
    quickPick.matchOnDescription = true;
    quickPick.items = fileOptions;
    const { openerService } = options;
    return await new Promise(resolve => {
        const disposables = new DisposableStore();
        let lastActiveWidget = options.widget;
        // then the dialog is hidden or disposed for other reason,
        // dispose everything and resolve the main promise
        disposables.add({
            dispose() {
                quickPick.dispose();
                resolve();
                // if something was attached (lastActiveWidget is set), focus on the target chat input
                lastActiveWidget?.focusInput();
            },
        });
        // handle the prompt `accept` event
        disposables.add(quickPick.onDidAccept(async (event) => {
            const { selectedItems } = quickPick;
            // sanity check to confirm our expectations
            assert(selectedItems.length === 1, `Only one item can be accepted, got '${selectedItems.length}'.`);
            const selectedOption = selectedItems[0];
            // whether user selected the docs link option
            const docsSelected = (selectedOption === DOCS_OPTION);
            // if documentation item was selected, open its link in a browser
            if (docsSelected) {
                // note that opening a file in editor also hides(disposes) the dialog
                await openerService.open(selectedOption.value);
                return;
            }
            // otherwise attach the selected prompt to a chat input
            lastActiveWidget = await attachPrompts(selectedItems, options, quickPick.keyMods);
            // if user submitted their selection, close the dialog
            if (!event.inBackground) {
                disposables.dispose();
            }
        }));
        // handle the `button click` event on a list item (edit, delete, etc.)
        disposables.add(quickPick.onDidTriggerItemButton(handleButtonClick.bind(null, { quickPick, ...options })));
        // when the dialog is hidden, dispose everything
        disposables.add(quickPick.onDidHide(disposables.dispose.bind(disposables)));
        // finally, reveal the dialog
        quickPick.show();
    });
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXNrVG9TZWxlY3RQcm9tcHQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2FjdGlvbnMvY2hhdEF0dGFjaFByb21wdEFjdGlvbi9kaWFsb2dzL2Fza1RvU2VsZWN0UHJvbXB0L2Fza1RvU2VsZWN0UHJvbXB0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQUU3QyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDekQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFHakUsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUcxRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUE0Q25GOzs7OztHQUtHO0FBQ0gsTUFBTSxDQUFDLE1BQU0saUJBQWlCLEdBQUcsS0FBSyxFQUNyQyxPQUE2QixFQUNiLEVBQUU7SUFDbEIsTUFBTSxFQUFFLFdBQVcsRUFBRSxRQUFRLEVBQUUsaUJBQWlCLEVBQUUsWUFBWSxFQUFFLEdBQUcsT0FBTyxDQUFDO0lBRTNFLE1BQU0sV0FBVyxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxVQUFVLEVBQUUsRUFBRTtRQUNsRCxPQUFPLG9CQUFvQixDQUFDLFVBQVUsRUFBRSxZQUFZLENBQUMsQ0FBQztJQUN2RCxD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