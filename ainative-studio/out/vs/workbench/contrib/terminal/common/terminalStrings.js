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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxTdHJpbmdzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbC9jb21tb24vdGVybWluYWxTdHJpbmdzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFFekQ7O0dBRUc7QUFDSCxNQUFNLENBQUMsTUFBTSxlQUFlLEdBQUc7SUFDOUIsUUFBUSxFQUFFLFFBQVEsQ0FBQyxVQUFVLEVBQUUsVUFBVSxDQUFDO0lBQzFDLEdBQUcsRUFBRSxRQUFRLENBQUMsY0FBYyxFQUFFLGNBQWMsQ0FBQztJQUM3QyxjQUFjLEVBQUUsUUFBUSxDQUFDLGdCQUFnQixFQUFFLG1CQUFtQixDQUFDO0lBQy9ELHNCQUFzQixFQUFFLFFBQVEsQ0FBQyx3QkFBd0IsRUFBRSxpQkFBaUIsQ0FBQztJQUM3RSx1QkFBdUIsRUFBRSxRQUFRLENBQUMseUJBQXlCLEVBQUUsa0JBQWtCLENBQUM7SUFDaEYsUUFBUSxFQUFFLFFBQVEsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDO0lBQ2xDLFNBQVMsRUFBRSxRQUFRLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQztJQUNyQyxjQUFjLEVBQUUsU0FBUyxDQUFDLGtCQUFrQixFQUFFLFVBQVUsQ0FBQztJQUN6RCxLQUFLLEVBQUUsU0FBUyxDQUFDLGlDQUFpQyxFQUFFLGdCQUFnQixDQUFDO0lBQ3JFLDRCQUE0QixFQUFFLFNBQVMsQ0FBQyx3REFBd0QsRUFBRSwyQ0FBMkMsQ0FBQztJQUM5SSxJQUFJLEVBQUU7UUFDTCxHQUFHLFNBQVMsQ0FBQyxjQUFjLEVBQUUsZUFBZSxDQUFDO1FBQzdDLEtBQUssRUFBRSxRQUFRLENBQUMsb0JBQW9CLEVBQUUsTUFBTSxDQUFDO0tBQzdDO0lBQ0QsWUFBWSxFQUFFLFNBQVMsQ0FBQyxjQUFjLEVBQUUsZ0NBQWdDLENBQUM7SUFDekUsaUJBQWlCLEVBQUUsU0FBUyxDQUFDLG1CQUFtQixFQUFFLCtCQUErQixDQUFDO0lBQ2xGLG1CQUFtQixFQUFFLFNBQVMsQ0FBQywrQ0FBK0MsRUFBRSwwQkFBMEIsQ0FBQztJQUMzRyxVQUFVLEVBQUUsU0FBUyxDQUFDLHNDQUFzQyxFQUFFLGdCQUFnQixDQUFDO0lBQy9FLFdBQVcsRUFBRSxTQUFTLENBQUMsdUNBQXVDLEVBQUUsaUJBQWlCLENBQUM7SUFDbEYsS0FBSyxFQUFFO1FBQ04sR0FBRyxTQUFTLENBQUMsZUFBZSxFQUFFLGdCQUFnQixDQUFDO1FBQy9DLEtBQUssRUFBRSxRQUFRLENBQUMscUJBQXFCLEVBQUUsT0FBTyxDQUFDO0tBQy9DO0lBQ0QsT0FBTyxFQUFFLFNBQVMsQ0FBQyxpQkFBaUIsRUFBRSxrQkFBa0IsQ0FBQztJQUN6RCxNQUFNLEVBQUUsU0FBUyxDQUFDLGtDQUFrQyxFQUFFLFdBQVcsQ0FBQztJQUNsRSx3QkFBd0IsRUFBRSxTQUFTLENBQUMsc0RBQXNELEVBQUUsOEJBQThCLENBQUM7SUFDM0gsVUFBVSxFQUFFLFNBQVMsQ0FBQyxzQ0FBc0MsRUFBRSxhQUFhLENBQUM7SUFDNUUsWUFBWSxFQUFFLFNBQVMsQ0FBQyx3Q0FBd0MsRUFBRSxrQ0FBa0MsQ0FBQztJQUNyRyxVQUFVLEVBQUUsU0FBUyxDQUFDLHNDQUFzQyxFQUFFLDREQUE0RCxDQUFDO0lBQzNILGNBQWMsRUFBRSxTQUFTLENBQUMseUNBQXlDLEVBQUUsc0NBQXNDLENBQUM7SUFDNUcsdUJBQXVCLEVBQUUsU0FBUyxDQUFDLG1EQUFtRCxFQUFFLDRCQUE0QixDQUFDO0lBQ3JILG1CQUFtQixFQUFFLFNBQVMsQ0FBQywrQ0FBK0MsRUFBRSx3QkFBd0IsQ0FBQztDQUN6RyxDQUFDIn0=