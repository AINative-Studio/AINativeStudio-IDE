/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../../nls.js';
export var TerminalHistoryCommandId;
(function (TerminalHistoryCommandId) {
    TerminalHistoryCommandId["ClearPreviousSessionHistory"] = "workbench.action.terminal.clearPreviousSessionHistory";
    TerminalHistoryCommandId["GoToRecentDirectory"] = "workbench.action.terminal.goToRecentDirectory";
    TerminalHistoryCommandId["RunRecentCommand"] = "workbench.action.terminal.runRecentCommand";
})(TerminalHistoryCommandId || (TerminalHistoryCommandId = {}));
export const defaultTerminalHistoryCommandsToSkipShell = [
    "workbench.action.terminal.goToRecentDirectory" /* TerminalHistoryCommandId.GoToRecentDirectory */,
    "workbench.action.terminal.runRecentCommand" /* TerminalHistoryCommandId.RunRecentCommand */
];
export var TerminalHistorySettingId;
(function (TerminalHistorySettingId) {
    TerminalHistorySettingId["ShellIntegrationCommandHistory"] = "terminal.integrated.shellIntegration.history";
})(TerminalHistorySettingId || (TerminalHistorySettingId = {}));
export const terminalHistoryConfiguration = {
    ["terminal.integrated.shellIntegration.history" /* TerminalHistorySettingId.ShellIntegrationCommandHistory */]: {
        restricted: true,
        markdownDescription: localize('terminal.integrated.shellIntegration.history', "Controls the number of recently used commands to keep in the terminal command history. Set to 0 to disable terminal command history."),
        type: 'number',
        default: 100
    },
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWwuaGlzdG9yeS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvaGlzdG9yeS9jb21tb24vdGVybWluYWwuaGlzdG9yeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFHakQsTUFBTSxDQUFOLElBQWtCLHdCQUlqQjtBQUpELFdBQWtCLHdCQUF3QjtJQUN6QyxpSEFBcUYsQ0FBQTtJQUNyRixpR0FBcUUsQ0FBQTtJQUNyRSwyRkFBK0QsQ0FBQTtBQUNoRSxDQUFDLEVBSmlCLHdCQUF3QixLQUF4Qix3QkFBd0IsUUFJekM7QUFFRCxNQUFNLENBQUMsTUFBTSx5Q0FBeUMsR0FBRzs7O0NBR3hELENBQUM7QUFFRixNQUFNLENBQU4sSUFBa0Isd0JBRWpCO0FBRkQsV0FBa0Isd0JBQXdCO0lBQ3pDLDJHQUErRSxDQUFBO0FBQ2hGLENBQUMsRUFGaUIsd0JBQXdCLEtBQXhCLHdCQUF3QixRQUV6QztBQUVELE1BQU0sQ0FBQyxNQUFNLDRCQUE0QixHQUFvRDtJQUM1Riw4R0FBeUQsRUFBRTtRQUMxRCxVQUFVLEVBQUUsSUFBSTtRQUNoQixtQkFBbUIsRUFBRSxRQUFRLENBQUMsOENBQThDLEVBQUUsc0lBQXNJLENBQUM7UUFDck4sSUFBSSxFQUFFLFFBQVE7UUFDZCxPQUFPLEVBQUUsR0FBRztLQUNaO0NBQ0QsQ0FBQyJ9