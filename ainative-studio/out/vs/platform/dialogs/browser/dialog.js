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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlhbG9nLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2RpYWxvZ3MvYnJvd3Nlci9kaWFsb2cudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBTTNELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxxQkFBcUIsRUFBRSxxQkFBcUIsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRTlJLE1BQU0sOEJBQThCLEdBQUc7SUFDdEMsdUJBQXVCO0lBQ3ZCLCtCQUErQjtJQUMvQixNQUFNO0lBQ04sS0FBSztJQUNMLHlCQUF5QjtJQUN6QixtQ0FBbUM7SUFDbkMsa0NBQWtDO0lBQ2xDLG9DQUFvQztDQUNwQyxDQUFDO0FBRUYsTUFBTSxVQUFVLDRCQUE0QixDQUFDLE9BQWdDLEVBQUUsaUJBQXFDLEVBQUUsYUFBNkIsRUFBRSxpQkFBaUIsR0FBRyw4QkFBOEI7SUFDdE0sT0FBTztRQUNOLGlCQUFpQixFQUFFLENBQUMsS0FBNEIsRUFBRSxFQUFFO1lBQ25ELE1BQU0sUUFBUSxHQUFHLGlCQUFpQixDQUFDLFlBQVksQ0FBQyxLQUFLLEVBQUUsYUFBYSxDQUFDLGVBQWUsQ0FBQyxDQUFDO1lBQ3RGLElBQUksUUFBUSxDQUFDLElBQUksK0JBQXVCLElBQUksUUFBUSxDQUFDLFNBQVMsRUFBRSxDQUFDO2dCQUNoRSxJQUFJLENBQUMsaUJBQWlCLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDO29CQUNyRCxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQztnQkFDL0IsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO1FBQ0QsWUFBWSxFQUFFLG1CQUFtQjtRQUNqQyxjQUFjLEVBQUUscUJBQXFCO1FBQ3JDLGNBQWMsRUFBRSxxQkFBcUI7UUFDckMsWUFBWSxFQUFFLG1CQUFtQjtRQUNqQyxHQUFHLE9BQU87S0FDVixDQUFDO0FBQ0gsQ0FBQyJ9