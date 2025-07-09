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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxDb250cmliRXhwb3J0cy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbC90ZXJtaW5hbENvbnRyaWJFeHBvcnRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBa0MsK0NBQStDLEVBQUUsTUFBTSxtRUFBbUUsQ0FBQztBQUNwSyxPQUFPLEVBQUUsa0NBQWtDLEVBQUUsTUFBTSwrRUFBK0UsQ0FBQztBQUNuSSxPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSwyRUFBMkUsQ0FBQztBQUM3SCxPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSxvRUFBb0UsQ0FBQztBQUN0SCxPQUFPLEVBQUUsaUNBQWlDLEVBQUUsTUFBTSw2RUFBNkUsQ0FBQztBQUVoSSxPQUFPLEVBQUUscUNBQXFDLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUN4RyxPQUFPLEVBQUUseUNBQXlDLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUNoSixPQUFPLEVBQWlDLGlDQUFpQyxFQUFFLE1BQU0sNkVBQTZFLENBQUM7QUFDL0osT0FBTyxFQUFFLHlDQUF5QyxFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDbEgsT0FBTyxFQUE0Qiw0QkFBNEIsRUFBRSxNQUFNLG1FQUFtRSxDQUFDO0FBQzNJLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLHVFQUF1RSxDQUFDO0FBQ3ZILE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBRTVGLGlHQUFpRztBQUNqRywrRkFBK0Y7QUFDL0YsK0ZBQStGO0FBQy9GLE1BQU0sQ0FBTixJQUFrQix3QkFHakI7QUFIRCxXQUFrQix3QkFBd0I7SUFDekMseUdBQWdGLENBQUE7SUFDaEYsZ0dBQW1FLENBQUE7QUFDcEUsQ0FBQyxFQUhpQix3QkFBd0IsS0FBeEIsd0JBQXdCLFFBR3pDO0FBRUQsaUdBQWlHO0FBQ2pHLCtGQUErRjtBQUMvRiwrRkFBK0Y7QUFDL0YsTUFBTSxDQUFOLElBQWtCLHdCQUdqQjtBQUhELFdBQWtCLHdCQUF3QjtJQUN6QyxrRkFBaUQsQ0FBQTtJQUNqRCw0RkFBMkQsQ0FBQTtBQUM1RCxDQUFDLEVBSGlCLHdCQUF3QixLQUF4Qix3QkFBd0IsUUFHekM7QUFFRCxvR0FBb0c7QUFDcEcsNkVBQTZFO0FBQzdFLE1BQU0sQ0FBQyxNQUFNLDRCQUE0QixHQUFxQztJQUM3RSxHQUFHLGtDQUFrQztJQUNyQyxHQUFHLGdDQUFnQztJQUNuQyxHQUFHLGdDQUFnQztJQUNuQyxHQUFHLGlDQUFpQztJQUNwQyxHQUFHLDRCQUE0QjtJQUMvQixHQUFHLGlDQUFpQztJQUNwQyxHQUFHLDRCQUE0QjtJQUMvQixHQUFHLDhCQUE4QjtJQUNqQyxHQUFHLHlCQUF5QjtDQUM1QixDQUFDO0FBRUYsK0ZBQStGO0FBQy9GLHdEQUF3RDtBQUN4RCxNQUFNLENBQUMsTUFBTSx5Q0FBeUMsR0FBRztJQUN4RCxHQUFHLCtDQUErQztJQUNsRCxHQUFHLHFDQUFxQztJQUN4QyxHQUFHLHlDQUF5QztJQUM1QyxHQUFHLHlDQUF5QztDQUM1QyxDQUFDIn0=