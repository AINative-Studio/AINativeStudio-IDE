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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhbmRhbG9uZVN0cmluZ3MuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9zdGFuZGFsb25lU3RyaW5ncy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLGNBQWMsQ0FBQztBQUVwQyxNQUFNLEtBQVcsb0JBQW9CLENBc0NwQztBQXRDRCxXQUFpQixvQkFBb0I7SUFDdkIsMkNBQXNCLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQyx3QkFBd0IsRUFBRSxvQkFBb0IsQ0FBQyxDQUFDO0lBQ3RGLGdDQUFXLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQyxhQUFhLEVBQUUsK0NBQStDLENBQUMsQ0FBQztJQUMzRix1Q0FBa0IsR0FBRyxHQUFHLENBQUMsUUFBUSxDQUFDLG9CQUFvQixFQUFFLCtDQUErQyxDQUFDLENBQUM7SUFDekcsdUNBQWtCLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQyxvQkFBb0IsRUFBRSxxQ0FBcUMsQ0FBQyxDQUFDO0lBQy9GLG1DQUFjLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsRUFBRSxxQ0FBcUMsQ0FBQyxDQUFDO0lBQ3ZGLG1DQUFjLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsRUFBRSwyQkFBMkIsQ0FBQyxDQUFDO0lBQzdFLDBEQUFxQyxHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQUMsdUNBQXVDLEVBQUUsNktBQTZLLENBQUMsQ0FBQztJQUM3USwyREFBc0MsR0FBRyxHQUFHLENBQUMsUUFBUSxDQUFDLHdDQUF3QyxFQUFFLDBMQUEwTCxDQUFDLENBQUM7SUFDNVIsNEJBQU8sR0FBRyxHQUFHLENBQUMsUUFBUSxDQUFDLFNBQVMsRUFBRSwrSUFBK0ksQ0FBQyxDQUFDO0lBQ25MLHdD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