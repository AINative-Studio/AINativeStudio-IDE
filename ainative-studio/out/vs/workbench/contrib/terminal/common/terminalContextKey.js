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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxDb250ZXh0S2V5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbC9jb21tb24vdGVybWluYWxDb250ZXh0S2V5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUsY0FBYyxFQUFFLGFBQWEsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBRXJHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGVBQWUsQ0FBQztBQUVqRCxNQUFNLENBQU4sSUFBa0IseUJBK0JqQjtBQS9CRCxXQUFrQix5QkFBeUI7SUFDMUMsc0RBQXlCLENBQUE7SUFDekIsb0RBQXVCLENBQUE7SUFDdkIsOERBQWlDLENBQUE7SUFDakMsZ0VBQW1DLENBQUE7SUFDbkMsb0VBQXVDLENBQUE7SUFDdkMsMEVBQTZDLENBQUE7SUFDN0Msb0RBQXVCLENBQUE7SUFDdkIsOERBQWlDLENBQUE7SUFDakMsb0ZBQXVELENBQUE7SUFDdkQsOEZBQWlFLENBQUE7SUFDakUsZ0VBQW1DLENBQUE7SUFDbkMsNERBQStCLENBQUE7SUFDL0Isc0dBQXlFLENBQUE7SUFDekUsOEVBQWlELENBQUE7SUFDakQsMEVBQTZDLENBQUE7SUFDN0MsNERBQStCLENBQUE7SUFDL0Isd0VBQTJDLENBQUE7SUFDM0Msa0ZBQXFELENBQUE7SUFDckQsb0VBQXVDLENBQUE7SUFDdkMsZ0VBQW1DLENBQUE7SUFDbkMsa0VBQXFDLENBQUE7SUFDckMsb0ZBQXVELENBQUE7SUFDdkQsZ0VBQW1DLENBQUE7SUFDbkMsMEVBQTZDLENBQUE7SUFDN0MsZ0VBQW1DLENBQUE7SUFDbkMsb0ZBQXVELENBQUE7SUFDdkQs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