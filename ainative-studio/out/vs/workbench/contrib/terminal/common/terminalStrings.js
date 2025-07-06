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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxTdHJpbmdzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWwvY29tbW9uL3Rlcm1pbmFsU3RyaW5ncy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBRXpEOztHQUVHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sZUFBZSxHQUFHO0lBQzlCLFFBQVEsRUFBRSxRQUFRLENBQUMsVUFBVSxFQUFFLFVBQVUsQ0FBQztJQUMxQyxHQUFHLEVBQUUsUUFBUSxDQUFDLGNBQWMsRUFBRSxjQUFjLENBQUM7SUFDN0MsY0FBYyxFQUFFLFFBQVEsQ0FBQyxnQkFBZ0IsRUFBRSxtQkFBbUIsQ0FBQztJQUMvRCxzQkFBc0IsRUFBRSxRQUFRLENBQUMsd0JBQXdCLEVBQUUsaUJBQWlCLENBQUM7SUFDN0UsdUJBQXVCLEVBQUUsUUFBUSxDQUFDLHlCQUF5QixFQUFFLGtCQUFrQixDQUFDO0lBQ2hGLFFBQVEsRUFBRSxRQUFRLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQztJQUNsQyxTQUFTLEVBQUUsUUFBUSxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUM7SUFDckMsY0FBYyxFQUFFLFNBQVMsQ0FBQyxrQkFBa0IsRUFBRSxVQUFVLENBQUM7SUFDekQsS0FBSyxFQUFFLFNBQVMsQ0FBQyxpQ0FBaUMsRUFBRSxnQkFBZ0IsQ0FBQztJQUNyRSw0QkFBNEIsRUFBRSxTQUFTLENBQUMsd0RBQXdELEVBQUUsMkNBQTJDLENBQUM7SUFDOUksSUFBSSxFQUFFO1FBQ0wsR0FBRyxTQUFTLENBQUMsY0FBYyxFQUFFLGVBQWUsQ0FBQztRQUM3QyxLQUFLLEVBQUUsUUFBUSxDQUFDLG9CQUFvQixFQUFFLE1BQU0sQ0FBQztLQUM3QztJQUNELFlBQVksRUFBRSxTQUFTLENBQUMsY0FBYyxFQUFFLGdDQUFnQyxDQUFDO0lBQ3pFLGlCQUFpQixFQUFFLFNBQVMsQ0FBQyxtQkFBbUIsRUFBRSwrQkFBK0IsQ0FBQztJQUNsRixtQkFBbUIsRUFBRSxTQUFTLENBQUMsK0NBQStDLEVBQUUsMEJBQTBCLENBQUM7SUFDM0csVUFBVSxFQUFFLFNBQVMsQ0FBQyxzQ0FBc0MsRUFBRSxnQkFBZ0IsQ0FBQztJQUMvRSxXQUFXLEVBQUUsU0FBUyxDQUFDLHVDQUF1QyxFQUFFLGlCQUFpQixDQUFDO0lBQ2xGLEtBQUssRUFBRTtRQUNOLEdBQUcsU0FBUyxDQUFDLGVBQWUsRUFBRSxnQkFBZ0IsQ0FBQztRQUMvQyxLQUFLLEVBQUUsUUFBUSxDQUFDLHFCQUFxQixFQUFFLE9BQU8sQ0FBQztLQUMvQztJQUNELE9BQU8sRUFBRSxTQUFTLENBQUMsaUJBQWlCLEVBQUUsa0JBQWtCLENBQUM7SUFDekQsTUFBTSxFQUFFLFNBQVMsQ0FBQyxrQ0FBa0MsRUFBRSxXQUFXLENBQUM7SUFDbEUsd0JBQXdCLEVBQUUsU0FBUyxDQUFDLHNEQUFzRCxFQUFFLDhCQUE4QixDQUFDO0lBQzNILFVBQVUsRUFBRSxTQUFTLENBQUMsc0NBQXNDLEVBQUUsYUFBYSxDQUFDO0lBQzVFLFlBQVksRUFBRSxTQUFTLENBQUMsd0NBQXdDLEVBQUUsa0NBQWtDLENBQUM7SUFDckcsVUFBVSxFQUFFLFNBQVMsQ0FBQyxzQ0FBc0MsRUFBRSw0REFBNEQsQ0FBQztJQUMzSCxjQUFjLEVBQUUsU0FBUyxDQUFDLHlDQUF5QyxFQUFFLHNDQUFzQyxDQUFDO0lBQzVHLHVCQUF1QixFQUFFLFNBQVMsQ0FBQyxtREFBbUQsRUFBRSw0QkFBNEIsQ0FBQztJQUNySCxtQkFBbUIsRUFBRSxTQUFTLENBQUMsK0NBQStDLEVBQUUsd0JBQXdCLENBQUM7Q0FDekcsQ0FBQyJ9