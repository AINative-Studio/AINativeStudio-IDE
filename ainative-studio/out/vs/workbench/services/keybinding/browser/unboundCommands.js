/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { isNonEmptyArray } from '../../../../base/common/arrays.js';
import { EditorExtensionsRegistry } from '../../../../editor/browser/editorExtensions.js';
import { MenuRegistry, MenuId, isIMenuItem } from '../../../../platform/actions/common/actions.js';
export function getAllUnboundCommands(boundCommands) {
    const unboundCommands = [];
    const seenMap = new Map();
    const addCommand = (id, includeCommandWithArgs) => {
        if (seenMap.has(id)) {
            return;
        }
        seenMap.set(id, true);
        if (id[0] === '_' || id.indexOf('vscode.') === 0) { // private command
            return;
        }
        if (boundCommands.get(id) === true) {
            return;
        }
        if (!includeCommandWithArgs) {
            const command = CommandsRegistry.getCommand(id);
            if (command && typeof command.metadata === 'object'
                && isNonEmptyArray(command.metadata.args)) { // command with args
                return;
            }
        }
        unboundCommands.push(id);
    };
    // Add all commands from Command Palette
    for (const menuItem of MenuRegistry.getMenuItems(MenuId.CommandPalette)) {
        if (isIMenuItem(menuItem)) {
            addCommand(menuItem.command.id, true);
        }
    }
    // Add all editor actions
    for (const editorAction of EditorExtensionsRegistry.getEditorActions()) {
        addCommand(editorAction.id, true);
    }
    for (const id of CommandsRegistry.getCommands().keys()) {
        addCommand(id, false);
    }
    return unboundCommands;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidW5ib3VuZENvbW1hbmRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9rZXliaW5kaW5nL2Jyb3dzZXIvdW5ib3VuZENvbW1hbmRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBb0IsTUFBTSxrREFBa0QsQ0FBQztBQUN0RyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDcEUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDMUYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLEVBQUUsV0FBVyxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFFbkcsTUFBTSxVQUFVLHFCQUFxQixDQUFDLGFBQW1DO0lBQ3hFLE1BQU0sZUFBZSxHQUFhLEVBQUUsQ0FBQztJQUNyQyxNQUFNLE9BQU8sR0FBeUIsSUFBSSxHQUFHLEVBQW1CLENBQUM7SUFDakUsTUFBTSxVQUFVLEdBQUcsQ0FBQyxFQUFVLEVBQUUsc0JBQStCLEVBQUUsRUFBRTtRQUNsRSxJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQztZQUNyQixPQUFPO1FBQ1IsQ0FBQztRQUNELE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ3RCLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsSUFBSSxFQUFFLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsa0JBQWtCO1lBQ3JFLE9BQU87UUFDUixDQUFDO1FBQ0QsSUFBSSxhQUFhLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxLQUFLLElBQUksRUFBRSxDQUFDO1lBQ3BDLE9BQU87UUFDUixDQUFDO1FBQ0QsSUFBSSxDQUFDLHNCQUFzQixFQUFFLENBQUM7WUFDN0IsTUFBTSxPQUFPLEdBQUcsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ2hELElBQUksT0FBTyxJQUFJLE9BQU8sT0FBTyxDQUFDLFFBQVEsS0FBSyxRQUFRO21CQUMvQyxlQUFlLENBQW9CLE9BQU8sQ0FBQyxRQUFTLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLG9CQUFvQjtnQkFDckYsT0FBTztZQUNSLENBQUM7UUFDRixDQUFDO1FBQ0QsZUFBZSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUMxQixDQUFDLENBQUM7SUFFRix3Q0FBd0M7SUFDeEMsS0FBSyxNQUFNLFFBQVEsSUFBSSxZQUFZLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDO1FBQ3pFLElBQUksV0FBVyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7WUFDM0IsVUFBVSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ3ZDLENBQUM7SUFDRixDQUFDO0lBRUQseUJBQXlCO0lBQ3pCLEtBQUssTUFBTSxZQUFZLElBQUksd0JBQXdCLENBQUMsZ0JBQWdCLEVBQUUsRUFBRSxDQUFDO1FBQ3hFLFVBQVUsQ0FBQyxZQUFZLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ25DLENBQUM7SUFFRCxLQUFLLE1BQU0sRUFBRSxJQUFJLGdCQUFnQixDQUFDLFdBQVcsRUFBRSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUM7UUFDeEQsVUFBVSxDQUFDLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztJQUN2QixDQUFDO0lBRUQsT0FBTyxlQUFlLENBQUM7QUFDeEIsQ0FBQyJ9