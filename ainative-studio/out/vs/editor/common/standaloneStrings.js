/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../nls.js';
export var AccessibilityHelpNLS;
(function (AccessibilityHelpNLS) {
    AccessibilityHelpNLS.accessibilityHelpTitle = nls.localize('accessibilityHelpTitle', "Accessibility Help");
    AccessibilityHelpNLS.openingDocs = nls.localize("openingDocs", "Opening the Accessibility documentation page.");
    AccessibilityHelpNLS.readonlyDiffEditor = nls.localize("readonlyDiffEditor", "You are in a read-only pane of a diff editor.");
    AccessibilityHelpNLS.editableDiffEditor = nls.localize("editableDiffEditor", "You are in a pane of a diff editor.");
    AccessibilityHelpNLS.readonlyEditor = nls.localize("readonlyEditor", "You are in a read-only code editor.");
    AccessibilityHelpNLS.editableEditor = nls.localize("editableEditor", "You are in a code editor.");
    AccessibilityHelpNLS.defaultWindowTitleIncludesEditorState = nls.localize("defaultWindowTitleIncludesEditorState", "activeEditorState - such as modified, problems, and more, is included as a part of the window.title setting by default. Disable it with accessibility.windowTitleOptimized.");
    AccessibilityHelpNLS.defaultWindowTitleExcludingEditorState = nls.localize("defaultWindowTitleExcludingEditorState", "activeEditorState - such as modified, problems, and more, is currently not included as a part of the window.title setting by default. Enable it with accessibility.windowTitleOptimized.");
    AccessibilityHelpNLS.toolbar = nls.localize("toolbar", "Around the workbench, when the screen reader announces you've landed in a toolbar, use narrow keys to navigate between the toolbar's actions.");
    AccessibilityHelpNLS.changeConfigToOnMac = nls.localize("changeConfigToOnMac", "Configure the application to be optimized for usage with a Screen Reader (Command+E).");
    AccessibilityHelpNLS.changeConfigToOnWinLinux = nls.localize("changeConfigToOnWinLinux", "Configure the application to be optimized for usage with a Screen Reader (Control+E).");
    AccessibilityHelpNLS.auto_on = nls.localize("auto_on", "The application is configured to be optimized for usage with a Screen Reader.");
    AccessibilityHelpNLS.auto_off = nls.localize("auto_off", "The application is configured to never be optimized for usage with a Screen Reader.");
    AccessibilityHelpNLS.screenReaderModeEnabled = nls.localize("screenReaderModeEnabled", "Screen Reader Optimized Mode enabled.");
    AccessibilityHelpNLS.screenReaderModeDisabled = nls.localize("screenReaderModeDisabled", "Screen Reader Optimized Mode disabled.");
    AccessibilityHelpNLS.tabFocusModeOnMsg = nls.localize("tabFocusModeOnMsg", "Pressing Tab in the current editor will move focus to the next focusable element. Toggle this behavior{0}.", '<keybinding:editor.action.toggleTabFocusMode>');
    AccessibilityHelpNLS.tabFocusModeOffMsg = nls.localize("tabFocusModeOffMsg", "Pressing Tab in the current editor will insert the tab character. Toggle this behavior{0}.", '<keybinding:editor.action.toggleTabFocusMode>');
    AccessibilityHelpNLS.stickScroll = nls.localize("stickScrollKb", "Focus Sticky Scroll{0} to focus the currently nested scopes.", '<keybinding:editor.action.focusStickyDebugConsole>');
    AccessibilityHelpNLS.suggestActions = nls.localize("suggestActionsKb", "Trigger the suggest widget{0} to show possible code completions.", '<keybinding:editor.action.triggerSuggest>');
    AccessibilityHelpNLS.acceptSuggestAction = nls.localize("acceptSuggestAction", "Accept suggestion{0} to accept the currently selected suggestion.", '<keybinding:acceptSelectedSuggestion>');
    AccessibilityHelpNLS.toggleSuggestionFocus = nls.localize("toggleSuggestionFocus", "Toggle focus between the suggest widget and the editor{0} and toggle details focus with{1} to learn more about the suggestion.", '<keybinding:focusSuggestion>', '<keybinding:toggleSuggestionFocus>');
    AccessibilityHelpNLS.codeFolding = nls.localize("codeFolding", "Use code folding to collapse blocks of code and focus on the code you're interested in via the Toggle Folding Command{0}.", '<keybinding:editor.toggleFold>');
    AccessibilityHelpNLS.intellisense = nls.localize("intellisense", "Use Intellisense to improve coding efficiency and reduce errors. Trigger suggestions{0}.", '<keybinding:editor.action.triggerSuggest>');
    AccessibilityHelpNLS.showOrFocusHover = nls.localize("showOrFocusHover", "Show or focus the hover{0} to read information about the current symbol.", '<keybinding:editor.action.showHover>');
    AccessibilityHelpNLS.goToSymbol = nls.localize("goToSymbol", "Go to Symbol{0} to quickly navigate between symbols in the current file.", '<keybinding:workbench.action.gotoSymbol>');
    AccessibilityHelpNLS.showAccessibilityHelpAction = nls.localize("showAccessibilityHelpAction", "Show Accessibility Help");
    AccessibilityHelpNLS.listSignalSounds = nls.localize("listSignalSoundsCommand", "Run the command: List Signal Sounds for an overview of all sounds and their current status.");
    AccessibilityHelpNLS.listAlerts = nls.localize("listAnnouncementsCommand", "Run the command: List Signal Announcements for an overview of announcements and their current status.");
    AccessibilityHelpNLS.quickChat = nls.localize("quickChatCommand", "Toggle quick chat{0} to open or close a chat session.", '<keybinding:workbench.action.quickchat.toggle>');
    AccessibilityHelpNLS.startInlineChat = nls.localize("startInlineChatCommand", "Start inline chat{0} to create an in editor chat session.", '<keybinding:inlineChat.start>');
    AccessibilityHelpNLS.startDebugging = nls.localize('debug.startDebugging', "The Debug: Start Debugging command{0} will start a debug session.", '<keybinding:workbench.action.debug.start>');
    AccessibilityHelpNLS.setBreakpoint = nls.localize('debugConsole.setBreakpoint', "The Debug: Inline Breakpoint command{0} will set or unset a breakpoint at the current cursor position in the active editor.", '<keybinding:editor.debug.action.toggleInlineBreakpoint>');
    AccessibilityHelpNLS.addToWatch = nls.localize('debugConsole.addToWatch', "The Debug: Add to Watch command{0} will add the selected text to the watch view.", '<keybinding:editor.debug.action.selectionToWatch>');
    AccessibilityHelpNLS.debugExecuteSelection = nls.localize('debugConsole.executeSelection', "The Debug: Execute Selection command{0} will execute the selected text in the debug console.", '<keybinding:editor.debug.action.selectionToRepl>');
    AccessibilityHelpNLS.chatEditorModification = nls.localize('chatEditorModification', "The editor contains pending modifications that have been made by chat.");
    AccessibilityHelpNLS.chatEditorRequestInProgress = nls.localize('chatEditorRequestInProgress', "The editor is currently waiting for modifications to be made by chat.");
    AccessibilityHelpNLS.chatEditActions = nls.localize('chatEditing.navigation', 'Navigate between edits in the editor with navigate previous{0} and next{1} and accept{2}, reject{3} or view the diff{4} for the current change.', '<keybinding:chatEditor.action.navigatePrevious>', '<keybinding:chatEditor.action.navigateNext>', '<keybinding:chatEditor.action.acceptHunk>', '<keybinding:chatEditor.action.undoHunk>', '<keybinding:chatEditor.action.toggleDiff>');
})(AccessibilityHelpNLS || (AccessibilityHelpNLS = {}));
export var InspectTokensNLS;
(function (InspectTokensNLS) {
    InspectTokensNLS.inspectTokensAction = nls.localize('inspectTokens', "Developer: Inspect Tokens");
})(InspectTokensNLS || (InspectTokensNLS = {}));
export var GoToLineNLS;
(function (GoToLineNLS) {
    GoToLineNLS.gotoLineActionLabel = nls.localize('gotoLineActionLabel', "Go to Line/Column...");
})(GoToLineNLS || (GoToLineNLS = {}));
export var QuickHelpNLS;
(function (QuickHelpNLS) {
    QuickHelpNLS.helpQuickAccessActionLabel = nls.localize('helpQuickAccess', "Show all Quick Access Providers");
})(QuickHelpNLS || (QuickHelpNLS = {}));
export var QuickCommandNLS;
(function (QuickCommandNLS) {
    QuickCommandNLS.quickCommandActionLabel = nls.localize('quickCommandActionLabel', "Command Palette");
    QuickCommandNLS.quickCommandHelp = nls.localize('quickCommandActionHelp', "Show And Run Commands");
})(QuickCommandNLS || (QuickCommandNLS = {}));
export var QuickOutlineNLS;
(function (QuickOutlineNLS) {
    QuickOutlineNLS.quickOutlineActionLabel = nls.localize('quickOutlineActionLabel', "Go to Symbol...");
    QuickOutlineNLS.quickOutlineByCategoryActionLabel = nls.localize('quickOutlineByCategoryActionLabel', "Go to Symbol by Category...");
})(QuickOutlineNLS || (QuickOutlineNLS = {}));
export var StandaloneCodeEditorNLS;
(function (StandaloneCodeEditorNLS) {
    StandaloneCodeEditorNLS.editorViewAccessibleLabel = nls.localize('editorViewAccessibleLabel', "Editor content");
})(StandaloneCodeEditorNLS || (StandaloneCodeEditorNLS = {}));
export var ToggleHighContrastNLS;
(function (ToggleHighContrastNLS) {
    ToggleHighContrastNLS.toggleHighContrast = nls.localize('toggleHighContrast', "Toggle High Contrast Theme");
})(ToggleHighContrastNLS || (ToggleHighContrastNLS = {}));
export var StandaloneServicesNLS;
(function (StandaloneServicesNLS) {
    StandaloneServicesNLS.bulkEditServiceSummary = nls.localize('bulkEditServiceSummary', "Made {0} edits in {1} files");
})(StandaloneServicesNLS || (StandaloneServicesNLS = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhbmRhbG9uZVN0cmluZ3MuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL3N0YW5kYWxvbmVTdHJpbmdzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sY0FBYyxDQUFDO0FBRXBDLE1BQU0sS0FBVyxvQkFBb0IsQ0FzQ3BDO0FBdENELFdBQWlCLG9CQUFvQjtJQUN2QiwyQ0FBc0IsR0FBRyxHQUFHLENBQUMsUUFBUSxDQUFDLHdCQUF3QixFQUFFLG9CQUFvQixDQUFDLENBQUM7SUFDdEYsZ0NBQVcsR0FBRyxHQUFHLENBQUMsUUFBUSxDQUFDLGFBQWEsRUFBRSwrQ0FBK0MsQ0FBQyxDQUFDO0lBQzNGLHVDQUFrQixHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQUMsb0JBQW9CLEVBQUUsK0NBQStDLENBQUMsQ0FBQztJQUN6Ryx1Q0FBa0IsR0FBRyxHQUFHLENBQUMsUUFBUSxDQUFDLG9CQUFvQixFQUFFLHFDQUFxQyxDQUFDLENBQUM7SUFDL0YsbUNBQWMsR0FBRyxHQUFHLENBQUMsUUFBUSxDQUFDLGdCQUFnQixFQUFFLHFDQUFxQyxDQUFDLENBQUM7SUFDdkYsbUNBQWMsR0FBRyxHQUFHLENBQUMsUUFBUSxDQUFDLGdCQUFnQixFQUFFLDJCQUEyQixDQUFDLENBQUM7SUFDN0UsMERBQXFDLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQyx1Q0FBdUMsRUFBRSw2S0FBNkssQ0FBQyxDQUFDO0lBQzdRLDJEQUFzQyxHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQUMsd0NBQXdDLEVBQUUsMExBQTBMLENBQUMsQ0FBQztJQUM1Uiw0QkFBTyxHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQUMsU0FBUyxFQUFFLCtJQUErSSxDQUFDLENBQUM7SUFDbkwsd0NB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