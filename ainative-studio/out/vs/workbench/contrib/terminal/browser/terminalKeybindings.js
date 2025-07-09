/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { KeybindingsRegistry } from '../../../../platform/keybinding/common/keybindingsRegistry.js';
import { TerminalContextKeys } from '../common/terminalContextKey.js';
import { terminalSendSequenceCommand } from './terminalActions.js';
export function registerSendSequenceKeybinding(text, rule) {
    KeybindingsRegistry.registerCommandAndKeybindingRule({
        id: "workbench.action.terminal.sendSequence" /* TerminalCommandId.SendSequence */,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        when: rule.when || TerminalContextKeys.focus,
        primary: rule.primary,
        mac: rule.mac,
        linux: rule.linux,
        win: rule.win,
        handler: terminalSendSequenceCommand,
        args: { text }
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxLZXliaW5kaW5ncy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbC9icm93c2VyL3Rlcm1pbmFsS2V5YmluZGluZ3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFrQyxtQkFBbUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBRXBJLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLHNCQUFzQixDQUFDO0FBRW5FLE1BQU0sVUFBVSw4QkFBOEIsQ0FBQyxJQUFZLEVBQUUsSUFBb0Q7SUFDaEgsbUJBQW1CLENBQUMsZ0NBQWdDLENBQUM7UUFDcEQsRUFBRSwrRUFBZ0M7UUFDbEMsTUFBTSw2Q0FBbUM7UUFDekMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLElBQUksbUJBQW1CLENBQUMsS0FBSztRQUM1QyxPQUFPLEVBQUUsSUFBSSxDQUFDLE9BQU87UUFDckIsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHO1FBQ2IsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLO1FBQ2pCLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRztRQUNiLE9BQU8sRUFBRSwyQkFBMkI7UUFDcEMsSUFBSSxFQUFFLEVBQUUsSUFBSSxFQUFFO0tBQ2QsQ0FBQyxDQUFDO0FBQ0osQ0FBQyJ9