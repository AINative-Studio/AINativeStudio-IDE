/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { defaultTerminalAccessibilityCommandsToSkipShell } from '../terminalContrib/accessibility/common/terminal.accessibility.js';
import { terminalAccessibilityConfiguration } from '../terminalContrib/accessibility/common/terminalAccessibilityConfiguration.js';
import { terminalAutoRepliesConfiguration } from '../terminalContrib/autoReplies/common/terminalAutoRepliesConfiguration.js';
import { terminalInitialHintConfiguration } from '../terminalContrib/chat/common/terminalInitialHintConfiguration.js';
import { terminalCommandGuideConfiguration } from '../terminalContrib/commandGuide/common/terminalCommandGuideConfiguration.js';
import { defaultTerminalFindCommandToSkipShell } from '../terminalContrib/find/common/terminal.find.js';
import { defaultTerminalHistoryCommandsToSkipShell, terminalHistoryConfiguration } from '../terminalContrib/history/common/terminal.history.js';
import { terminalStickyScrollConfiguration } from '../terminalContrib/stickyScroll/common/terminalStickyScrollConfiguration.js';
import { defaultTerminalSuggestCommandsToSkipShell } from '../terminalContrib/suggest/common/terminal.suggest.js';
import { terminalSuggestConfiguration } from '../terminalContrib/suggest/common/terminalSuggestConfiguration.js';
import { terminalTypeAheadConfiguration } from '../terminalContrib/typeAhead/common/terminalTypeAheadConfiguration.js';
import { terminalZoomConfiguration } from '../terminalContrib/zoom/common/terminal.zoom.js';
// HACK: Export some commands from `terminalContrib/` that are depended upon elsewhere. These are
// soft layer breakers between `terminal/` and `terminalContrib/` but there are difficulties in
// removing the dependency. These are explicitly defined here to avoid an eslint line override.
export var TerminalContribCommandId;
(function (TerminalContribCommandId) {
    TerminalContribCommandId["A11yFocusAccessibleBuffer"] = "workbench.action.terminal.focusAccessibleBuffer";
    TerminalContribCommandId["DeveloperRestartPtyHost"] = "workbench.action.terminal.restartPtyHost";
})(TerminalContribCommandId || (TerminalContribCommandId = {}));
// HACK: Export some settings from `terminalContrib/` that are depended upon elsewhere. These are
// soft layer breakers between `terminal/` and `terminalContrib/` but there are difficulties in
// removing the dependency. These are explicitly defined here to avoid an eslint line override.
export var TerminalContribSettingId;
(function (TerminalContribSettingId) {
    TerminalContribSettingId["SuggestEnabled"] = "terminal.integrated.suggest.enabled";
    TerminalContribSettingId["StickyScrollEnabled"] = "terminal.integrated.stickyScroll.enabled";
})(TerminalContribSettingId || (TerminalContribSettingId = {}));
// Export configuration schemes from terminalContrib - this is an exception to the eslint rule since
// they need to be declared at part of the rest of the terminal configuration
export const terminalContribConfiguration = {
    ...terminalAccessibilityConfiguration,
    ...terminalAutoRepliesConfiguration,
    ...terminalInitialHintConfiguration,
    ...terminalCommandGuideConfiguration,
    ...terminalHistoryConfiguration,
    ...terminalStickyScrollConfiguration,
    ...terminalSuggestConfiguration,
    ...terminalTypeAheadConfiguration,
    ...terminalZoomConfiguration,
};
// Export commands to skip shell from terminalContrib - this is an exception to the eslint rule
// since they need to be included in the terminal module
export const defaultTerminalContribCommandsToSkipShell = [
    ...defaultTerminalAccessibilityCommandsToSkipShell,
    ...defaultTerminalFindCommandToSkipShell,
    ...defaultTerminalHistoryCommandsToSkipShell,
    ...defaultTerminalSuggestCommandsToSkipShell,
];
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxDb250cmliRXhwb3J0cy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsL3Rlcm1pbmFsQ29udHJpYkV4cG9ydHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFrQywrQ0FBK0MsRUFBRSxNQUFNLG1FQUFtRSxDQUFDO0FBQ3BLLE9BQU8sRUFBRSxrQ0FBa0MsRUFBRSxNQUFNLCtFQUErRSxDQUFDO0FBQ25JLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLDJFQUEyRSxDQUFDO0FBQzdILE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLG9FQUFvRSxDQUFDO0FBQ3RILE9BQU8sRUFBRSxpQ0FBaUMsRUFBRSxNQUFNLDZFQUE2RSxDQUFDO0FBRWhJLE9BQU8sRUFBRSxxQ0FBcUMsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQ3hHLE9BQU8sRUFBRSx5Q0FBeUMsRUFBRSw0QkFBNEIsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQ2hKLE9BQU8sRUFBaUMsaUNBQWlDLEVBQUUsTUFBTSw2RUFBNkUsQ0FBQztBQUMvSixPQUFPLEVBQUUseUNBQXlDLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUNsSCxPQUFPLEVBQTRCLDRCQUE0QixFQUFFLE1BQU0sbUVBQW1FLENBQUM7QUFDM0ksT0FBTyxFQUFFLDhCQUE4QixFQUFFLE1BQU0sdUVBQXVFLENBQUM7QUFDdkgsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0saURBQWlELENBQUM7QUFFNUYsaUdBQWlHO0FBQ2pHLCtGQUErRjtBQUMvRiwrRkFBK0Y7QUFDL0YsTUFBTSxDQUFOLElBQWtCLHdCQUdqQjtBQUhELFdBQWtCLHdCQUF3QjtJQUN6Qyx5R0FBZ0YsQ0FBQTtJQUNoRixnR0FBbUUsQ0FBQTtBQUNwRSxDQUFDLEVBSGlCLHdCQUF3QixLQUF4Qix3QkFBd0IsUUFHekM7QUFFRCxpR0FBaUc7QUFDakcsK0ZBQStGO0FBQy9GLCtGQUErRjtBQUMvRixNQUFNLENBQU4sSUFBa0Isd0JBR2pCO0FBSEQsV0FBa0Isd0JBQXdCO0lBQ3pDLGtGQUFpRCxDQUFBO0lBQ2pELDRGQUEyRCxDQUFBO0FBQzVELENBQUMsRUFIaUIsd0JBQXdCLEtBQXhCLHdCQUF3QixRQUd6QztBQUVELG9HQUFvRztBQUNwRyw2RUFBNkU7QUFDN0UsTUFBTSxDQUFDLE1BQU0sNEJBQTRCLEdBQXFDO0lBQzdFLEdBQUcsa0NBQWtDO0lBQ3JDLEdBQUcsZ0NBQWdDO0lBQ25DLEdBQUcsZ0NBQWdDO0lBQ25DLEdBQUcsaUNBQWlDO0lBQ3BDLEdBQUcsNEJBQTRCO0lBQy9CLEdBQUcsaUNBQWlDO0lBQ3BDLEdBQUcsNEJBQTRCO0lBQy9CLEdBQUcsOEJBQThCO0lBQ2pDLEdBQUcseUJBQXlCO0NBQzVCLENBQUM7QUFFRiwrRkFBK0Y7QUFDL0Ysd0RBQXdEO0FBQ3hELE1BQU0sQ0FBQyxNQUFNLHlDQUF5QyxHQUFHO0lBQ3hELEdBQUcsK0NBQStDO0lBQ2xELEdBQUcscUNBQXFDO0lBQ3hDLEdBQUcseUNBQXlDO0lBQzVDLEdBQUcseUNBQXlDO0NBQzVDLENBQUMifQ==