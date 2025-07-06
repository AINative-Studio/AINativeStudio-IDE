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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXNrVG9TZWxlY3RQcm9tcHQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvdGVzdC9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9hY3Rpb25zL2NoYXRBdHRhY2hQcm9tcHRBY3Rpb24vZGlhbG9ncy9hc2tUb1NlbGVjdFByb21wdC9hc2tUb1NlbGVjdFByb21wdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFFN0MsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQ3pELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBR2pFLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUN2RSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUN2RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN6RSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFHMUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBNENuRjs7Ozs7R0FLRztBQUNILE1BQU0sQ0FBQyxNQUFNLGlCQUFpQixHQUFHLEtBQUssRUFDckMsT0FBNkIsRUFDYixFQUFFO0lBQ2xCLE1BQU0sRUFBRSxXQUFXLEVBQUUsUUFBUSxFQUFFLGlCQUFpQixFQUFFLFlBQVksRUFBRSxHQUFHLE9BQU8sQ0FBQztJQUUzRSxNQUFNLFdBQVcsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUMsVUFBVSxFQUFFLEVBQUU7UUFDbEQsT0FBTyxvQkFBb0IsQ0FBQyxVQUFVLEVBQUUsWUFBWSxDQUFDLENBQUM7SUFD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