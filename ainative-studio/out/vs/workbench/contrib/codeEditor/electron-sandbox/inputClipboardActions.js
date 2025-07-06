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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5wdXRDbGlwYm9hcmRBY3Rpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jb2RlRWRpdG9yL2VsZWN0cm9uLXNhbmRib3gvaW5wdXRDbGlwYm9hcmRBY3Rpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3BHLE9BQU8sS0FBSyxRQUFRLE1BQU0scUNBQXFDLENBQUM7QUFFaEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBRWxFLElBQUksUUFBUSxDQUFDLFdBQVcsRUFBRSxDQUFDO0lBRTFCLHlFQUF5RTtJQUN6RSw2RUFBNkU7SUFDN0UsK0JBQStCO0lBRS9CLG1CQUFtQixDQUFDLGdDQUFnQyxDQUFDO1FBQ3BELEVBQUUsRUFBRSxTQUFTO1FBQ2IsT0FBTyxFQUFFLGlEQUE2QjtRQUN0QyxPQUFPLEVBQUUsa0JBQWtCLENBQUMsS0FBSyxDQUFDO1FBQ2xDLE1BQU0sRUFBRSxDQUFDO1FBQ1QsSUFBSSxFQUFFLFNBQVM7S0FDZixDQUFDLENBQUM7SUFDSCxtQkFBbUIsQ0FBQyxnQ0FBZ0MsQ0FBQztRQUNwRCxFQUFFLEVBQUUsVUFBVTtRQUNkLE9BQU8sRUFBRSxpREFBNkI7UUFDdEMsT0FBTyxFQUFFLGtCQUFrQixDQUFDLE1BQU0sQ0FBQztRQUNuQyxNQUFNLEVBQUUsQ0FBQztRQUNULElBQUksRUFBRSxTQUFTO0tBQ2YsQ0FBQyxDQUFDO0lBQ0gsbUJBQW1CLENBQUMsZ0NBQWdDLENBQUM7UUFDcEQsRUFBRSxFQUFFLFdBQVc7UUFDZixPQUFPLEVBQUUsaURBQTZCO1FBQ3RDLE9BQU8sRUFBRSxrQkFBa0IsQ0FBQyxPQUFPLENBQUM7UUFDcEMsTUFBTSxFQUFFLENBQUM7UUFDVCxJQUFJLEVBQUUsU0FBUztLQUNmLENBQUMsQ0FBQztJQUVILFNBQVMsa0JBQWtCLENBQUMsT0FBaUM7UUFDNUQsT0FBTyxHQUFHLEVBQUU7WUFDWCxlQUFlLEVBQUUsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ2pELENBQUMsQ0FBQztJQUNILENBQUM7QUFDRixDQUFDIn0=