/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize, localize2 } from '../../../../nls.js';
/**
 * An object holding strings shared by multiple parts of the terminal
 */
export const terminalStrings = {
    terminal: localize('terminal', "Terminal"),
    new: localize('terminal.new', "New Terminal"),
    doNotShowAgain: localize('doNotShowAgain', 'Do Not Show Again'),
    currentSessionCategory: localize('currentSessionCategory', 'current session'),
    previousSessionCategory: localize('previousSessionCategory', 'previous session'),
    typeTask: localize('task', "Task"),
    typeLocal: localize('local', "Local"),
    actionCategory: localize2('terminalCategory', "Terminal"),
    focus: localize2('workbench.action.terminal.focus', "Focus Terminal"),
    focusAndHideAccessibleBuffer: localize2('workbench.action.terminal.focusAndHideAccessibleBuffer', "Focus Terminal and Hide Accessible Buffer"),
    kill: {
        ...localize2('killTerminal', "Kill Terminal"),
        short: localize('killTerminal.short', "Kill"),
    },
    moveToEditor: localize2('moveToEditor', "Move Terminal into Editor Area"),
    moveIntoNewWindow: localize2('moveIntoNewWindow', "Move Terminal into New Window"),
    moveToTerminalPanel: localize2('workbench.action.terminal.moveToTerminalPanel', "Move Terminal into Panel"),
    changeIcon: localize2('workbench.action.terminal.changeIcon', "Change Icon..."),
    changeColor: localize2('workbench.action.terminal.changeColor', "Change Color..."),
    split: {
        ...localize2('splitTerminal', "Split Terminal"),
        short: localize('splitTerminal.short', "Split"),
    },
    unsplit: localize2('unsplitTerminal', "Unsplit Terminal"),
    rename: localize2('workbench.action.terminal.rename', "Rename..."),
    toggleSizeToContentWidth: localize2('workbench.action.terminal.sizeToContentWidthInstance', "Toggle Size to Content Width"),
    focusHover: localize2('workbench.action.terminal.focusHover', "Focus Hover"),
    sendSequence: localize2('workbench.action.terminal.sendSequence', "Send Custom Sequence to Terminal"),
    newWithCwd: localize2('workbench.action.terminal.newWithCwd', "Create New Terminal Starting in a Custom Working Directory"),
    renameWithArgs: localize2('workbench.action.terminal.renameWithArg', "Rename the Currently Active Terminal"),
    scrollToPreviousCommand: localize2('workbench.action.terminal.scrollToPreviousCommand', "Scroll to Previous Command"),
    scrollToNextCommand: localize2('workbench.action.terminal.scrollToNextCommand', "Scroll to Next Command")
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxTdHJpbmdzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsL2NvbW1vbi90ZXJtaW5hbFN0cmluZ3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUV6RDs7R0FFRztBQUNILE1BQU0sQ0FBQyxNQUFNLGVBQWUsR0FBRztJQUM5QixRQUFRLEVBQUUsUUFBUSxDQUFDLFVBQVUsRUFBRSxVQUFVLENBQUM7SUFDMUMsR0FBRyxFQUFFLFFBQVEsQ0FBQyxjQUFjLEVBQUUsY0FBYyxDQUFDO0lBQzdDLGNBQWMsRUFBRSxRQUFRLENBQUMsZ0JBQWdCLEVBQUUsbUJBQW1CLENBQUM7SUFDL0Qsc0JBQXNCLEVBQUUsUUFBUSxDQUFDLHdCQUF3QixFQUFFLGlCQUFpQixDQUFDO0lBQzdFLHVCQUF1QixFQUFFLFFBQVEsQ0FBQyx5QkFBeUIsRUFBRSxrQkFBa0IsQ0FBQztJQUNoRixRQUFRLEVBQUUsUUFBUSxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUM7SUFDbEMsU0FBUyxFQUFFLFFBQVEsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDO0lBQ3JDLGNBQWMsRUFBRSxTQUFTLENBQUMsa0JBQWtCLEVBQUUsVUFBVSxDQUFDO0lBQ3pELEtBQUssRUFBRSxTQUFTLENBQUMsaUNBQWlDLEVBQUUsZ0JBQWdCLENBQUM7SUFDckUsNEJBQTRCLEVBQUUsU0FBUyxDQUFDLHdEQUF3RCxFQUFFLDJDQUEyQyxDQUFDO0lBQzlJLElBQUksRUFBRTtRQUNMLEdBQUcsU0FBUyxDQUFDLGNBQWMsRUFBRSxlQUFlLENBQUM7UUFDN0MsS0FBSyxFQUFFLFFBQVEsQ0FBQyxvQkFBb0IsRUFBRSxNQUFNLENBQUM7S0FDN0M7SUFDRCxZQUFZLEVBQUUsU0FBUyxDQUFDLGNBQWMsRUFBRSxnQ0FBZ0MsQ0FBQztJQUN6RSxpQkFBaUIsRUFBRSxTQUFTLENBQUMsbUJBQW1CLEVBQUUsK0JBQStCLENBQUM7SUFDbEYsbUJBQW1CLEVBQUUsU0FBUyxDQUFDLCtDQUErQyxFQUFFLDBCQUEwQixDQUFDO0lBQzNHLFVBQVUsRUFBRSxTQUFTLENBQUMsc0NBQXNDLEVBQUUsZ0JBQWdCLENBQUM7SUFDL0UsV0FBVyxFQUFFLFNBQVMsQ0FBQyx1Q0FBdUMsRUFBRSxpQkFBaUIsQ0FBQztJQUNsRixLQUFLLEVBQUU7UUFDTixHQUFHLFNBQVMsQ0FBQyxlQUFlLEVBQUUsZ0JBQWdCLENBQUM7UUFDL0MsS0FBSyxFQUFFLFFBQVEsQ0FBQyxxQkFBcUIsRUFBRSxPQUFPLENBQUM7S0FDL0M7SUFDRCxPQUFPLEVBQUUsU0FBUyxDQUFDLGlCQUFpQixFQUFFLGtCQUFrQixDQUFDO0lBQ3pELE1BQU0sRUFBRSxTQUFTLENBQUMsa0NBQWtDLEVBQUUsV0FBVyxDQUFDO0lBQ2xFLHdCQUF3QixFQUFFLFNBQVMsQ0FBQyxzREFBc0QsRUFBRSw4QkFBOEIsQ0FBQztJQUMzSCxVQUFVLEVBQUUsU0FBUyxDQUFDLHNDQUFzQyxFQUFFLGFBQWEsQ0FBQztJQUM1RSxZQUFZLEVBQUUsU0FBUyxDQUFDLHdDQUF3QyxFQUFFLGtDQUFrQyxDQUFDO0lBQ3JHLFVBQVUsRUFBRSxTQUFTLENBQUMsc0NBQXNDLEVBQUUsNERBQTRELENBQUM7SUFDM0gsY0FBYyxFQUFFLFNBQVMsQ0FBQyx5Q0FBeUMsRUFBRSxzQ0FBc0MsQ0FBQztJQUM1Ryx1QkFBdUIsRUFBRSxTQUFTLENBQUMsbURBQW1ELEVBQUUsNEJBQTRCLENBQUM7SUFDckgsbUJBQW1CLEVBQUUsU0FBUyxDQUFDLCtDQUErQyxFQUFFLHdCQUF3QixDQUFDO0NBQ3pHLENBQUMifQ==