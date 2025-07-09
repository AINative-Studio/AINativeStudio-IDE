/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../nls.js';
import { ContextKeyExpr, RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { TERMINAL_VIEW_ID } from './terminal.js';
export var TerminalContextKeyStrings;
(function (TerminalContextKeyStrings) {
    TerminalContextKeyStrings["IsOpen"] = "terminalIsOpen";
    TerminalContextKeyStrings["Count"] = "terminalCount";
    TerminalContextKeyStrings["GroupCount"] = "terminalGroupCount";
    TerminalContextKeyStrings["TabsNarrow"] = "isTerminalTabsNarrow";
    TerminalContextKeyStrings["HasFixedWidth"] = "terminalHasFixedWidth";
    TerminalContextKeyStrings["ProcessSupported"] = "terminalProcessSupported";
    TerminalContextKeyStrings["Focus"] = "terminalFocus";
    TerminalContextKeyStrings["FocusInAny"] = "terminalFocusInAny";
    TerminalContextKeyStrings["AccessibleBufferFocus"] = "terminalAccessibleBufferFocus";
    TerminalContextKeyStrings["AccessibleBufferOnLastLine"] = "terminalAccessibleBufferOnLastLine";
    TerminalContextKeyStrings["EditorFocus"] = "terminalEditorFocus";
    TerminalContextKeyStrings["TabsFocus"] = "terminalTabsFocus";
    TerminalContextKeyStrings["WebExtensionContributedProfile"] = "terminalWebExtensionContributedProfile";
    TerminalContextKeyStrings["TerminalHasBeenCreated"] = "terminalHasBeenCreated";
    TerminalContextKeyStrings["TerminalEditorActive"] = "terminalEditorActive";
    TerminalContextKeyStrings["TabsMouse"] = "terminalTabsMouse";
    TerminalContextKeyStrings["AltBufferActive"] = "terminalAltBufferActive";
    TerminalContextKeyStrings["SuggestWidgetVisible"] = "terminalSuggestWidgetVisible";
    TerminalContextKeyStrings["A11yTreeFocus"] = "terminalA11yTreeFocus";
    TerminalContextKeyStrings["ViewShowing"] = "terminalViewShowing";
    TerminalContextKeyStrings["TextSelected"] = "terminalTextSelected";
    TerminalContextKeyStrings["TextSelectedInFocused"] = "terminalTextSelectedInFocused";
    TerminalContextKeyStrings["FindVisible"] = "terminalFindVisible";
    TerminalContextKeyStrings["FindInputFocused"] = "terminalFindInputFocused";
    TerminalContextKeyStrings["FindFocused"] = "terminalFindFocused";
    TerminalContextKeyStrings["TabsSingularSelection"] = "terminalTabsSingularSelection";
    TerminalContextKeyStrings["SplitTerminal"] = "terminalSplitTerminal";
    TerminalContextKeyStrings["ShellType"] = "terminalShellType";
    TerminalContextKeyStrings["InTerminalRunCommandPicker"] = "inTerminalRunCommandPicker";
    TerminalContextKeyStrings["TerminalShellIntegrationEnabled"] = "terminalShellIntegrationEnabled";
})(TerminalContextKeyStrings || (TerminalContextKeyStrings = {}));
export var TerminalContextKeys;
(function (TerminalContextKeys) {
    /** Whether there is at least one opened terminal. */
    TerminalContextKeys.isOpen = new RawContextKey("terminalIsOpen" /* TerminalContextKeyStrings.IsOpen */, false, true);
    /** Whether the terminal is focused. */
    TerminalContextKeys.focus = new RawContextKey("terminalFocus" /* TerminalContextKeyStrings.Focus */, false, localize('terminalFocusContextKey', "Whether the terminal is focused."));
    /** Whether any terminal is focused, including detached terminals used in other UI. */
    TerminalContextKeys.focusInAny = new RawContextKey("terminalFocusInAny" /* TerminalContextKeyStrings.FocusInAny */, false, localize('terminalFocusInAnyContextKey', "Whether any terminal is focused, including detached terminals used in other UI."));
    /** Whether a terminal in the editor area is focused. */
    TerminalContextKeys.editorFocus = new RawContextKey("terminalEditorFocus" /* TerminalContextKeyStrings.EditorFocus */, false, localize('terminalEditorFocusContextKey', "Whether a terminal in the editor area is focused."));
    /** The current number of terminals. */
    TerminalContextKeys.count = new RawContextKey("terminalCount" /* TerminalContextKeyStrings.Count */, 0, localize('terminalCountContextKey', "The current number of terminals."));
    /** The current number of terminal groups. */
    TerminalContextKeys.groupCount = new RawContextKey("terminalGroupCount" /* TerminalContextKeyStrings.GroupCount */, 0, true);
    /** Whether the terminal tabs view is narrow. */
    TerminalContextKeys.tabsNarrow = new RawContextKey("isTerminalTabsNarrow" /* TerminalContextKeyStrings.TabsNarrow */, false, true);
    /** Whether the terminal tabs view is narrow. */
    TerminalContextKeys.terminalHasFixedWidth = new RawContextKey("terminalHasFixedWidth" /* TerminalContextKeyStrings.HasFixedWidth */, false, true);
    /** Whether the terminal tabs widget is focused. */
    TerminalContextKeys.tabsFocus = new RawContextKey("terminalTabsFocus" /* TerminalContextKeyStrings.TabsFocus */, false, localize('terminalTabsFocusContextKey', "Whether the terminal tabs widget is focused."));
    /** Whether a web extension has contributed a profile */
    TerminalContextKeys.webExtensionContributedProfile = new RawContextKey("terminalWebExtensionContributedProfile" /* TerminalContextKeyStrings.WebExtensionContributedProfile */, false, true);
    /** Whether at least one terminal has been created */
    TerminalContextKeys.terminalHasBeenCreated = new RawContextKey("terminalHasBeenCreated" /* TerminalContextKeyStrings.TerminalHasBeenCreated */, false, true);
    /** Whether at least one terminal has been created */
    TerminalContextKeys.terminalEditorActive = new RawContextKey("terminalEditorActive" /* TerminalContextKeyStrings.TerminalEditorActive */, false, true);
    /** Whether the mouse is within the terminal tabs list. */
    TerminalContextKeys.tabsMouse = new RawContextKey("terminalTabsMouse" /* TerminalContextKeyStrings.TabsMouse */, false, true);
    /** The shell type of the active terminal, this is set if the type can be detected. */
    TerminalContextKeys.shellType = new RawContextKey("terminalShellType" /* TerminalContextKeyStrings.ShellType */, undefined, { type: 'string', description: localize('terminalShellTypeContextKey', "The shell type of the active terminal, this is set if the type can be detected.") });
    /** Whether the terminal's alt buffer is active. */
    TerminalContextKeys.altBufferActive = new RawContextKey("terminalAltBufferActive" /* TerminalContextKeyStrings.AltBufferActive */, false, localize('terminalAltBufferActive', "Whether the terminal's alt buffer is active."));
    /** Whether the terminal's suggest widget is visible. */
    TerminalContextKeys.suggestWidgetVisible = new RawContextKey("terminalSuggestWidgetVisible" /* TerminalContextKeyStrings.SuggestWidgetVisible */, false, localize('terminalSuggestWidgetVisible', "Whether the terminal's suggest widget is visible."));
    /** Whether the terminal is NOT focused. */
    TerminalContextKeys.notFocus = TerminalContextKeys.focus.toNegated();
    /** Whether the terminal view is showing. */
    TerminalContextKeys.viewShowing = new RawContextKey("terminalViewShowing" /* TerminalContextKeyStrings.ViewShowing */, false, localize('terminalViewShowing', "Whether the terminal view is showing"));
    /** Whether text is selected in the active terminal. */
    TerminalContextKeys.textSelected = new RawContextKey("terminalTextSelected" /* TerminalContextKeyStrings.TextSelected */, false, localize('terminalTextSelectedContextKey', "Whether text is selected in the active terminal."));
    /** Whether text is selected in a focused terminal. `textSelected` counts text selected in an active in a terminal view or an editor, where `textSelectedInFocused` simply counts text in an element with DOM focus. */
    TerminalContextKeys.textSelectedInFocused = new RawContextKey("terminalTextSelectedInFocused" /* TerminalContextKeyStrings.TextSelectedInFocused */, false, localize('terminalTextSelectedInFocusedContextKey', "Whether text is selected in a focused terminal."));
    /** Whether text is NOT selected in the active terminal. */
    TerminalContextKeys.notTextSelected = TerminalContextKeys.textSelected.toNegated();
    /** Whether the active terminal's find widget is visible. */
    TerminalContextKeys.findVisible = new RawContextKey("terminalFindVisible" /* TerminalContextKeyStrings.FindVisible */, false, true);
    /** Whether the active terminal's find widget is NOT visible. */
    TerminalContextKeys.notFindVisible = TerminalContextKeys.findVisible.toNegated();
    /** Whether the active terminal's find widget text input is focused. */
    TerminalContextKeys.findInputFocus = new RawContextKey("terminalFindInputFocused" /* TerminalContextKeyStrings.FindInputFocused */, false, true);
    /** Whether an element within the active terminal's find widget is focused. */
    TerminalContextKeys.findFocus = new RawContextKey("terminalFindFocused" /* TerminalContextKeyStrings.FindFocused */, false, true);
    /** Whether NO elements within the active terminal's find widget is focused. */
    TerminalContextKeys.notFindFocus = TerminalContextKeys.findInputFocus.toNegated();
    /** Whether terminal processes can be launched in the current workspace. */
    TerminalContextKeys.processSupported = new RawContextKey("terminalProcessSupported" /* TerminalContextKeyStrings.ProcessSupported */, false, localize('terminalProcessSupportedContextKey', "Whether terminal processes can be launched in the current workspace."));
    /** Whether one terminal is selected in the terminal tabs list. */
    TerminalContextKeys.tabsSingularSelection = new RawContextKey("terminalTabsSingularSelection" /* TerminalContextKeyStrings.TabsSingularSelection */, false, localize('terminalTabsSingularSelectedContextKey', "Whether one terminal is selected in the terminal tabs list."));
    /** Whether the focused tab's terminal is a split terminal. */
    TerminalContextKeys.splitTerminal = new RawContextKey("terminalSplitTerminal" /* TerminalContextKeyStrings.SplitTerminal */, false, localize('isSplitTerminalContextKey', "Whether the focused tab's terminal is a split terminal."));
    /** Whether the terminal run command picker is currently open. */
    TerminalContextKeys.inTerminalRunCommandPicker = new RawContextKey("inTerminalRunCommandPicker" /* TerminalContextKeyStrings.InTerminalRunCommandPicker */, false, localize('inTerminalRunCommandPickerContextKey', "Whether the terminal run command picker is currently open."));
    /** Whether shell integration is enabled in the active terminal. This only considers full VS Code shell integration. */
    TerminalContextKeys.terminalShellIntegrationEnabled = new RawContextKey("terminalShellIntegrationEnabled" /* TerminalContextKeyStrings.TerminalShellIntegrationEnabled */, false, localize('terminalShellIntegrationEnabled', "Whether shell integration is enabled in the active terminal"));
    TerminalContextKeys.shouldShowViewInlineActions = ContextKeyExpr.and(ContextKeyExpr.equals('view', TERMINAL_VIEW_ID), ContextKeyExpr.notEquals(`config.${"terminal.integrated.tabs.hideCondition" /* TerminalSettingId.TabsHideCondition */}`, 'never'), ContextKeyExpr.or(ContextKeyExpr.not(`config.${"terminal.integrated.tabs.enabled" /* TerminalSettingId.TabsEnabled */}`), ContextKeyExpr.and(ContextKeyExpr.equals(`config.${"terminal.integrated.tabs.showActions" /* TerminalSettingId.TabsShowActions */}`, 'singleTerminal'), ContextKeyExpr.equals("terminalGroupCount" /* TerminalContextKeyStrings.GroupCount */, 1)), ContextKeyExpr.and(ContextKeyExpr.equals(`config.${"terminal.integrated.tabs.showActions" /* TerminalSettingId.TabsShowActions */}`, 'singleTerminalOrNarrow'), ContextKeyExpr.or(ContextKeyExpr.equals("terminalGroupCount" /* TerminalContextKeyStrings.GroupCount */, 1), ContextKeyExpr.has("isTerminalTabsNarrow" /* TerminalContextKeyStrings.TabsNarrow */))), ContextKeyExpr.and(ContextKeyExpr.equals(`config.${"terminal.integrated.tabs.showActions" /* TerminalSettingId.TabsShowActions */}`, 'singleGroup'), ContextKeyExpr.equals("terminalGroupCount" /* TerminalContextKeyStrings.GroupCount */, 1)), ContextKeyExpr.equals(`config.${"terminal.integrated.tabs.showActions" /* TerminalSettingId.TabsShowActions */}`, 'always')));
})(TerminalContextKeys || (TerminalContextKeys = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxDb250ZXh0S2V5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsL2NvbW1vbi90ZXJtaW5hbENvbnRleHRLZXkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxjQUFjLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFFckcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sZUFBZSxDQUFDO0FBRWpELE1BQU0sQ0FBTixJQUFrQix5QkErQmpCO0FBL0JELFdBQWtCLHlCQUF5QjtJQUMxQyxzREFBeUIsQ0FBQTtJQUN6QixvREFBdUIsQ0FBQTtJQUN2Qiw4REFBaUMsQ0FBQTtJQUNqQyxnRUFBbUMsQ0FBQTtJQUNuQyxvRUFBdUMsQ0FBQTtJQUN2QywwRUFBNkMsQ0FBQTtJQUM3QyxvREFBdUIsQ0FBQTtJQUN2Qiw4REFBaUMsQ0FBQTtJQUNqQyxvRkFBdUQsQ0FBQTtJQUN2RCw4RkFBaUUsQ0FBQTtJQUNqRSxnRUFBbUMsQ0FBQTtJQUNuQyw0REFBK0IsQ0FBQTtJQUMvQixzR0FBeUUsQ0FBQTtJQUN6RSw4RUFBaUQsQ0FBQTtJQUNqRCwwRUFBNkMsQ0FBQTtJQUM3Qyw0REFBK0IsQ0FBQTtJQUMvQix3RUFBMkMsQ0FBQTtJQUMzQyxrRkFBcUQsQ0FBQTtJQUNyRCxvRUFBdUMsQ0FBQTtJQUN2QyxnRUFBbUMsQ0FBQTtJQUNuQyxrRUFBcUMsQ0FBQTtJQUNyQyxvRkFBdUQsQ0FBQTtJQUN2RCxnRUFBbUMsQ0FBQTtJQUNuQywwRUFBNkMsQ0FBQTtJQUM3QyxnRUFBbUMsQ0FBQTtJQUNuQyxvRkFBdUQsQ0FBQTtJQUN2RCxvRUFB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