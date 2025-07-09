/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../../nls.js';
import { CommandsRegistry } from '../../../../../platform/commands/common/commands.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { Extensions as QuickAccessExtensions } from '../../../../../platform/quickinput/common/quickAccess.js';
import { IQuickInputService } from '../../../../../platform/quickinput/common/quickInput.js';
import { Registry } from '../../../../../platform/registry/common/platform.js';
import { getQuickNavigateHandler } from '../../../../browser/quickaccess.js';
import { registerTerminalAction } from '../../../terminal/browser/terminalActions.js';
import { TerminalContextKeys } from '../../../terminal/common/terminalContextKey.js';
import { TerminalQuickAccessProvider } from '../../../terminalContrib/quickAccess/browser/terminalQuickAccess.js';
var TerminalQuickAccessCommandId;
(function (TerminalQuickAccessCommandId) {
    TerminalQuickAccessCommandId["QuickOpenTerm"] = "workbench.action.quickOpenTerm";
})(TerminalQuickAccessCommandId || (TerminalQuickAccessCommandId = {}));
const quickAccessRegistry = (Registry.as(QuickAccessExtensions.Quickaccess));
const inTerminalsPicker = 'inTerminalPicker';
quickAccessRegistry.registerQuickAccessProvider({
    ctor: TerminalQuickAccessProvider,
    prefix: TerminalQuickAccessProvider.PREFIX,
    contextKey: inTerminalsPicker,
    placeholder: nls.localize('tasksQuickAccessPlaceholder', "Type the name of a terminal to open."),
    helpEntries: [{ description: nls.localize('tasksQuickAccessHelp', "Show All Opened Terminals"), commandId: "workbench.action.quickOpenTerm" /* TerminalQuickAccessCommandId.QuickOpenTerm */ }]
});
const quickAccessNavigateNextInTerminalPickerId = 'workbench.action.quickOpenNavigateNextInTerminalPicker';
CommandsRegistry.registerCommand({ id: quickAccessNavigateNextInTerminalPickerId, handler: getQuickNavigateHandler(quickAccessNavigateNextInTerminalPickerId, true) });
const quickAccessNavigatePreviousInTerminalPickerId = 'workbench.action.quickOpenNavigatePreviousInTerminalPicker';
CommandsRegistry.registerCommand({ id: quickAccessNavigatePreviousInTerminalPickerId, handler: getQuickNavigateHandler(quickAccessNavigatePreviousInTerminalPickerId, false) });
registerTerminalAction({
    id: "workbench.action.quickOpenTerm" /* TerminalQuickAccessCommandId.QuickOpenTerm */,
    title: nls.localize2('quickAccessTerminal', 'Switch Active Terminal'),
    precondition: ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.terminalHasBeenCreated),
    run: (c, accessor) => accessor.get(IQuickInputService).quickAccess.show(TerminalQuickAccessProvider.PREFIX)
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWwucXVpY2tBY2Nlc3MuY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi9xdWlja0FjY2Vzcy9icm93c2VyL3Rlcm1pbmFsLnF1aWNrQWNjZXNzLmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLHVCQUF1QixDQUFDO0FBQzdDLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUN6RixPQUFPLEVBQXdCLFVBQVUsSUFBSSxxQkFBcUIsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQ3JJLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUMvRSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM3RSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUN0RixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNyRixPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSxxRUFBcUUsQ0FBQztBQUVsSCxJQUFXLDRCQUVWO0FBRkQsV0FBVyw0QkFBNEI7SUFDdEMsZ0ZBQWdELENBQUE7QUFDakQsQ0FBQyxFQUZVLDRCQUE0QixLQUE1Qiw0QkFBNEIsUUFFdEM7QUFFRCxNQUFNLG1CQUFtQixHQUFHLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBdUIscUJBQXFCLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQztBQUNuRyxNQUFNLGlCQUFpQixHQUFHLGtCQUFrQixDQUFDO0FBQzdDLG1CQUFtQixDQUFDLDJCQUEyQixDQUFDO0lBQy9DLElBQUksRUFBRSwyQkFBMkI7SUFDakMsTUFBTSxFQUFFLDJCQUEyQixDQUFDLE1BQU07SUFDMUMsVUFBVSxFQUFFLGlCQUFpQjtJQUM3QixXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyw2QkFBNkIsRUFBRSxzQ0FBc0MsQ0FBQztJQUNoRyxXQUFXLEVBQUUsQ0FBQyxFQUFFLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLHNCQUFzQixFQUFFLDJCQUEyQixDQUFDLEVBQUUsU0FBUyxtRkFBNEMsRUFBRSxDQUFDO0NBQ3hKLENBQUMsQ0FBQztBQUNILE1BQU0seUNBQXlDLEdBQUcsd0RBQXdELENBQUM7QUFDM0csZ0JBQWdCLENBQUMsZUFBZSxDQUFDLEVBQUUsRUFBRSxFQUFFLHlDQUF5QyxFQUFFLE9BQU8sRUFBRSx1QkFBdUIsQ0FBQyx5Q0FBeUMsRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7QUFDdkssTUFBTSw2Q0FBNkMsR0FBRyw0REFBNEQsQ0FBQztBQUNuSCxnQkFBZ0IsQ0FBQyxlQUFlLENBQUMsRUFBRSxFQUFFLEVBQUUsNkNBQTZDLEVBQUUsT0FBTyxFQUFFLHVCQUF1QixDQUFDLDZDQUE2QyxFQUFFLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUVoTCxzQkFBc0IsQ0FBQztJQUN0QixFQUFFLG1GQUE0QztJQUM5QyxLQUFLLEVBQUUsR0FBRyxDQUFDLFNBQVMsQ0FBQyxxQkFBcUIsRUFBRSx3QkFBd0IsQ0FBQztJQUNyRSxZQUFZLEVBQUUsY0FBYyxDQUFDLEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQyxnQkFBZ0IsRUFBRSxtQkFBbUIsQ0FBQyxzQkFBc0IsQ0FBQztJQUNqSCxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUUsUUFBUSxFQUFFLEVBQUUsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxNQUFNLENBQUM7Q0FDM0csQ0FBQyxDQUFDIn0=