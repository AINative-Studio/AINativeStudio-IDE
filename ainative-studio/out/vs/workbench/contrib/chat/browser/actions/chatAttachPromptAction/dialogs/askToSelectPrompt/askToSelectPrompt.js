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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXNrVG9TZWxlY3RQcm9tcHQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvYWN0aW9ucy9jaGF0QXR0YWNoUHJvbXB0QWN0aW9uL2RpYWxvZ3MvYXNrVG9TZWxlY3RQcm9tcHQvYXNrVG9TZWxlY3RQcm9tcHQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGdCQUFnQixDQUFDO0FBRTdDLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUN6RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUdqRSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDdkUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDdkUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDekUsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBRzFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQTRDbkY7Ozs7O0dBS0c7QUFDSCxNQUFNLENBQUMsTUFBTSxpQkFBaUIsR0FBRyxLQUFLLEVBQ3JDLE9BQTZCLEVBQ2IsRUFBRTtJQUNsQixNQUFNLEVBQUUsV0FBVyxFQUFFLFFBQVEsRUFBRSxpQkFBaUIsRUFBRSxZQUFZLEVBQUUsR0FBRyxPQUFPLENBQUM7SUFFM0UsTUFBTSxXQUFXLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDLFVBQVUsRUFBRSxFQUFFO1FBQ2xELE9BQU8sb0JBQW9CLENBQUMsVUFBVSxFQUFFLFlBQVksQ0FBQyxDQUFDO0lBQ3ZELENBQUMsQ0FBQyxDQUFDO0lBRUg7O09BRUc7SUFDSCxXQUFXLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBRTlCLHlFQUF5RTtJQUN6RSx3RUFBd0U7SUFDeEUsSUFBSSxVQUFvRCxDQUFDO0lBQ3pELElBQUksUUFBUSxFQUFFLENBQUM7UUFDZCxVQUFVLEdBQUcsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFO1lBQ3RDLE9BQU8sTUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQzdDLENBQUMsQ0FBQyxDQUFDO1FBRUgsNkVBQTZFO1FBQzdFLDJFQUEyRTtRQUMzRSxnRkFBZ0Y7UUFDaEYsa0ZBQWtGO1FBQ2xGLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUNqQixVQUFVLEdBQUcsb0JBQW9CLENBQUM7Z0JBQ2pDLEdBQUcsRUFBRSxRQUFRO2dCQUNiLHFFQUFxRTtnQkFDckUscUVBQXFFO2dCQUNyRSxJQUFJLEVBQUUsT0FBTzthQUNiLEVBQUUsWUFBWSxDQUFDLENBQUM7WUFDakIsV0FBVyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUM5QixDQUFDO1FBRUQsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssRUFBRSxLQUFLLEVBQUUsRUFBRTtZQUNqQyxJQUFJLE1BQU0sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxRQUFRLENBQUMsRUFBRSxDQUFDO2dCQUMzQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1lBQ1gsQ0FBQztZQUVELElBQUksTUFBTSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxFQUFFLENBQUM7Z0JBQzNDLE9BQU8sQ0FBQyxDQUFDO1lBQ1YsQ0FBQztZQUVELE9BQU8sQ0FBQyxDQUFDO1FBQ1YsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDO0lBRUQ7Ozs7Ozs7O09BUUc7SUFDSCxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7UUFDakIsVUFBVSxHQUFHLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUM3QixDQUFDO0lBRUQsa0RBQWtEO0lBQ2xELE1BQU0sU0FBUyxHQUFHLGlCQUFpQixDQUFDLGVBQWUsRUFBZ0MsQ0FBQztJQUNwRixTQUFTLENBQUMsV0FBVyxHQUFHLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO0lBQ3ZELFNBQVMsQ0FBQyxXQUFXLEdBQUcscUJBQXFCLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDdkQsU0FBUyxDQUFDLHFCQUFxQixHQUFHLElBQUksQ0FBQztJQUN2QyxTQUFTLENBQUMsa0JBQWtCLEdBQUcsSUFBSSxDQUFDO0lBQ3BDLFNBQVMsQ0FBQyxLQUFLLEdBQUcsV0FBVyxDQUFDO0lBRTlCLE1BQU0sRUFBRSxhQUFhLEVBQUUsR0FBRyxPQUFPLENBQUM7SUFDbEMsT0FBTyxNQUFNLElBQUksT0FBTyxDQUFPLE9BQU8sQ0FBQyxFQUFFO1FBQ3hDLE1BQU0sV0FBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7UUFFMUMsSUFBSSxnQkFBZ0IsR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDO1FBRXRDLDBEQUEwRDtRQUMxRCxrREFBa0Q7UUFDbEQsV0FBVyxDQUFDLEdBQUcsQ0FBQztZQUNmLE9BQU87Z0JBQ04sU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUNwQixPQUFPLEVBQUUsQ0FBQztnQkFDVixzRkFBc0Y7Z0JBQ3RGLGdCQUFnQixFQUFFLFVBQVUsRUFBRSxDQUFDO1lBQ2hDLENBQUM7U0FDRCxDQUFDLENBQUM7UUFFSCxtQ0FBbUM7UUFDbkMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxLQUFLLEVBQUUsRUFBRTtZQUNyRCxNQUFNLEVBQUUsYUFBYSxFQUFFLEdBQUcsU0FBUyxDQUFDO1lBRXBDLDJDQUEyQztZQUMzQyxNQUFNLENBQ0wsYUFBYSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQzFCLHVDQUF1QyxhQUFhLENBQUMsTUFBTSxJQUFJLENBQy9ELENBQUM7WUFFRixNQUFNLGNBQWMsR0FBRyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFFeEMsNkNBQTZDO1lBQzdDLE1BQU0sWUFBWSxHQUFHLENBQUMsY0FBYyxLQUFLLFdBQVcsQ0FBQyxDQUFDO1lBRXRELGlFQUFpRTtZQUNqRSxJQUFJLFlBQVksRUFBRSxDQUFDO2dCQUNsQixxRUFBcUU7Z0JBQ3JFLE1BQU0sYUFBYSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLENBQUM7Z0JBQy9DLE9BQU87WUFDUixDQUFDO1lBRUQsdURBQXVEO1lBQ3ZELGdCQUFnQixHQUFHLE1BQU0sYUFBYSxDQUFDLGFBQWEsRUFBRSxPQUFPLEVBQUUsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBRWxGLHNEQUFzRDtZQUN0RCxJQUFJLENBQUMsS0FBSyxDQUFDLFlBQVksRUFBRSxDQUFDO2dCQUN6QixXQUFXLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDdkIsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFSixzRUFBc0U7UUFDdEUsV0FBVyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsc0JBQXNCLENBQy9DLGlCQUFpQixDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsRUFBRSxTQUFTLEVBQUUsR0FBRyxPQUFPLEVBQUUsQ0FBQyxDQUN2RCxDQUFDLENBQUM7UUFFSCxnREFBZ0Q7UUFDaEQsV0FBVyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUNsQyxXQUFXLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FDckMsQ0FBQyxDQUFDO1FBRUgsNkJBQTZCO1FBQzdCLFNBQVMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUNsQixDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyJ9