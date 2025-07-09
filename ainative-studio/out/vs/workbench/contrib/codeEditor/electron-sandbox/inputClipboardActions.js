/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { KeybindingsRegistry } from '../../../../platform/keybinding/common/keybindingsRegistry.js';
import * as platform from '../../../../base/common/platform.js';
import { getActiveWindow } from '../../../../base/browser/dom.js';
if (platform.isMacintosh) {
    // On the mac, cmd+x, cmd+c and cmd+v do not result in cut / copy / paste
    // We therefore add a basic keybinding rule that invokes document.execCommand
    // This is to cover <input>s...
    KeybindingsRegistry.registerCommandAndKeybindingRule({
        id: 'execCut',
        primary: 2048 /* KeyMod.CtrlCmd */ | 54 /* KeyCode.KeyX */,
        handler: bindExecuteCommand('cut'),
        weight: 0,
        when: undefined,
    });
    KeybindingsRegistry.registerCommandAndKeybindingRule({
        id: 'execCopy',
        primary: 2048 /* KeyMod.CtrlCmd */ | 33 /* KeyCode.KeyC */,
        handler: bindExecuteCommand('copy'),
        weight: 0,
        when: undefined,
    });
    KeybindingsRegistry.registerCommandAndKeybindingRule({
        id: 'execPaste',
        primary: 2048 /* KeyMod.CtrlCmd */ | 52 /* KeyCode.KeyV */,
        handler: bindExecuteCommand('paste'),
        weight: 0,
        when: undefined,
    });
    function bindExecuteCommand(command) {
        return () => {
            getActiveWindow().document.execCommand(command);
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5wdXRDbGlwYm9hcmRBY3Rpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NvZGVFZGl0b3IvZWxlY3Ryb24tc2FuZGJveC9pbnB1dENsaXBib2FyZEFjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDcEcsT0FBTyxLQUFLLFFBQVEsTUFBTSxxQ0FBcUMsQ0FBQztBQUVoRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFFbEUsSUFBSSxRQUFRLENBQUMsV0FBVyxFQUFFLENBQUM7SUFFMUIseUVBQXlFO0lBQ3pFLDZFQUE2RTtJQUM3RSwrQkFBK0I7SUFFL0IsbUJBQW1CLENBQUMsZ0NBQWdDLENBQUM7UUFDcEQsRUFBRSxFQUFFLFNBQVM7UUFDYixPQUFPLEVBQUUsaURBQTZCO1FBQ3RDLE9BQU8sRUFBRSxrQkFBa0IsQ0FBQyxLQUFLLENBQUM7UUFDbEMsTUFBTSxFQUFFLENBQUM7UUFDVCxJQUFJLEVBQUUsU0FBUztLQUNmLENBQUMsQ0FBQztJQUNILG1CQUFtQixDQUFDLGdDQUFnQyxDQUFDO1FBQ3BELEVBQUUsRUFBRSxVQUFVO1FBQ2QsT0FBTyxFQUFFLGlEQUE2QjtRQUN0QyxPQUFPLEVBQUUsa0JBQWtCLENBQUMsTUFBTSxDQUFDO1FBQ25DLE1BQU0sRUFBRSxDQUFDO1FBQ1QsSUFBSSxFQUFFLFNBQVM7S0FDZixDQUFDLENBQUM7SUFDSCxtQkFBbUIsQ0FBQyxnQ0FBZ0MsQ0FBQztRQUNwRCxFQUFFLEVBQUUsV0FBVztRQUNmLE9BQU8sRUFBRSxpREFBNkI7UUFDdEMsT0FBTyxFQUFFLGtCQUFrQixDQUFDLE9BQU8sQ0FBQztRQUNwQyxNQUFNLEVBQUUsQ0FBQztRQUNULElBQUksRUFBRSxTQUFTO0tBQ2YsQ0FBQyxDQUFDO0lBRUgsU0FBUyxrQkFBa0IsQ0FBQyxPQUFpQztRQUM1RCxPQUFPLEdBQUcsRUFBRTtZQUNYLGVBQWUsRUFBRSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDakQsQ0FBQyxDQUFDO0lBQ0gsQ0FBQztBQUNGLENBQUMifQ==