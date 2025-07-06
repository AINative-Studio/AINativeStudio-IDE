/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { EventHelper } from '../../../base/browser/dom.js';
import { defaultButtonStyles, defaultCheckboxStyles, defaultInputBoxStyles, defaultDialogStyles } from '../../theme/browser/defaultStyles.js';
const defaultDialogAllowableCommands = [
    'workbench.action.quit',
    'workbench.action.reloadWindow',
    'copy',
    'cut',
    'editor.action.selectAll',
    'editor.action.clipboardCopyAction',
    'editor.action.clipboardCutAction',
    'editor.action.clipboardPasteAction'
];
export function createWorkbenchDialogOptions(options, keybindingService, layoutService, allowableCommands = defaultDialogAllowableCommands) {
    return {
        keyEventProcessor: (event) => {
            const resolved = keybindingService.softDispatch(event, layoutService.activeContainer);
            if (resolved.kind === 2 /* ResultKind.KbFound */ && resolved.commandId) {
                if (!allowableCommands.includes(resolved.commandId)) {
                    EventHelper.stop(event, true);
                }
            }
        },
        buttonStyles: defaultButtonStyles,
        checkboxStyles: defaultCheckboxStyles,
        inputBoxStyles: defaultInputBoxStyles,
        dialogStyles: defaultDialogStyles,
        ...options
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlhbG9nLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vZGlhbG9ncy9icm93c2VyL2RpYWxvZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFNM0QsT0FBTyxFQUFFLG1CQUFtQixFQUFFLHFCQUFxQixFQUFFLHFCQUFxQixFQUFFLG1CQUFtQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFOUksTUFBTSw4QkFBOEIsR0FBRztJQUN0Qyx1QkFBdUI7SUFDdkIsK0JBQStCO0lBQy9CLE1BQU07SUFDTixLQUFLO0lBQ0wseUJBQXlCO0lBQ3pCLG1DQUFtQztJQUNuQyxrQ0FBa0M7SUFDbEMsb0NBQW9DO0NBQ3BDLENBQUM7QUFFRixNQUFNLFVBQVUsNEJBQTRCLENBQUMsT0FBZ0MsRUFBRSxpQkFBcUMsRUFBRSxhQUE2QixFQUFFLGlCQUFpQixHQUFHLDhCQUE4QjtJQUN0TSxPQUFPO1FBQ04saUJBQWlCLEVBQUUsQ0FBQyxLQUE0QixFQUFFLEVBQUU7WUFDbkQsTUFBTSxRQUFRLEdBQUcsaUJBQWlCLENBQUMsWUFBWSxDQUFDLEtBQUssRUFBRSxhQUFhLENBQUMsZUFBZSxDQUFDLENBQUM7WUFDdEYsSUFBSSxRQUFRLENBQUMsSUFBSSwrQkFBdUIsSUFBSSxRQUFRLENBQUMsU0FBUyxFQUFFLENBQUM7Z0JBQ2hFLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUM7b0JBQ3JELFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDO2dCQUMvQixDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7UUFDRCxZQUFZLEVBQUUsbUJBQW1CO1FBQ2pDLGNBQWMsRUFBRSxxQkFBcUI7UUFDckMsY0FBYyxFQUFFLHFCQUFxQjtRQUNyQyxZQUFZLEVBQUUsbUJBQW1CO1FBQ2pDLEdBQUcsT0FBTztLQUNWLENBQUM7QUFDSCxDQUFDIn0=