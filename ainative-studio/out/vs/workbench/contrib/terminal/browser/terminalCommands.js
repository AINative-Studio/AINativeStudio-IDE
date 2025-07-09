/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { KeybindingsRegistry } from '../../../../platform/keybinding/common/keybindingsRegistry.js';
import { ITerminalGroupService } from './terminal.js';
export function setupTerminalCommands() {
    registerOpenTerminalAtIndexCommands();
}
function registerOpenTerminalAtIndexCommands() {
    for (let i = 0; i < 9; i++) {
        const terminalIndex = i;
        const visibleIndex = i + 1;
        KeybindingsRegistry.registerCommandAndKeybindingRule({
            id: `workbench.action.terminal.focusAtIndex${visibleIndex}`,
            weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            when: undefined,
            primary: 0,
            handler: accessor => {
                accessor.get(ITerminalGroupService).setActiveInstanceByIndex(terminalIndex);
                return accessor.get(ITerminalGroupService).showPanel(true);
            }
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxDb21tYW5kcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbC9icm93c2VyL3Rlcm1pbmFsQ29tbWFuZHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLG1CQUFtQixFQUFvQixNQUFNLCtEQUErRCxDQUFDO0FBQ3RILE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGVBQWUsQ0FBQztBQUV0RCxNQUFNLFVBQVUscUJBQXFCO0lBQ3BDLG1DQUFtQyxFQUFFLENBQUM7QUFDdkMsQ0FBQztBQUVELFNBQVMsbUNBQW1DO0lBQzNDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztRQUM1QixNQUFNLGFBQWEsR0FBRyxDQUFDLENBQUM7UUFDeEIsTUFBTSxZQUFZLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUUzQixtQkFBbUIsQ0FBQyxnQ0FBZ0MsQ0FBQztZQUNwRCxFQUFFLEVBQUUseUNBQXlDLFlBQVksRUFBRTtZQUMzRCxNQUFNLDZDQUFtQztZQUN6QyxJQUFJLEVBQUUsU0FBUztZQUNmLE9BQU8sRUFBRSxDQUFDO1lBQ1YsT0FBTyxFQUFFLFFBQVEsQ0FBQyxFQUFFO2dCQUNuQixRQUFRLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLENBQUMsd0JBQXdCLENBQUMsYUFBYSxDQUFDLENBQUM7Z0JBQzVFLE9BQU8sUUFBUSxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUM1RCxDQUFDO1NBQ0QsQ0FBQyxDQUFDO0lBQ0osQ0FBQztBQUNGLENBQUMifQ==