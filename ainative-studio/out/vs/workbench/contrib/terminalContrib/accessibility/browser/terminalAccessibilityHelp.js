/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { localize } from '../../../../../nls.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { ContextKeyExpr, IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { accessibleViewIsShown, accessibleViewCurrentProviderId } from '../../../accessibility/browser/accessibilityConfiguration.js';
export var ClassName;
(function (ClassName) {
    ClassName["Active"] = "active";
    ClassName["EditorTextArea"] = "textarea";
})(ClassName || (ClassName = {}));
let TerminalAccessibilityHelpProvider = class TerminalAccessibilityHelpProvider extends Disposable {
    onClose() {
        const expr = ContextKeyExpr.and(accessibleViewIsShown, ContextKeyExpr.equals(accessibleViewCurrentProviderId.key, "terminal-help" /* AccessibleViewProviderId.TerminalHelp */));
        if (expr?.evaluate(this._contextKeyService.getContext(null))) {
            this._commandService.executeCommand("workbench.action.terminal.focusAccessibleBuffer" /* TerminalAccessibilityCommandId.FocusAccessibleBuffer */);
        }
        else {
            this._instance.focus();
        }
        this.dispose();
    }
    constructor(_instance, _xterm, _commandService, _configurationService, _contextKeyService) {
        super();
        this._instance = _instance;
        this._commandService = _commandService;
        this._configurationService = _configurationService;
        this._contextKeyService = _contextKeyService;
        this.id = "terminal-help" /* AccessibleViewProviderId.TerminalHelp */;
        this._hasShellIntegration = false;
        this.options = {
            type: "help" /* AccessibleViewType.Help */,
            readMoreUrl: 'https://code.visualstudio.com/docs/editor/accessibility#_terminal-accessibility'
        };
        this.verbositySettingKey = "accessibility.verbosity.terminal" /* AccessibilityVerbositySettingId.Terminal */;
        this._hasShellIntegration = _xterm.shellIntegration.status === 2 /* ShellIntegrationStatus.VSCode */;
    }
    provideContent() {
        const content = [
            localize('focusAccessibleTerminalView', 'The Focus Accessible Terminal View command<keybinding:{0}> enables screen readers to read terminal contents.', "workbench.action.terminal.focusAccessibleBuffer" /* TerminalAccessibilityCommandId.FocusAccessibleBuffer */),
            localize('preserveCursor', 'Customize the behavior of the cursor when toggling between the terminal and accessible view with `terminal.integrated.accessibleViewPreserveCursorPosition.`'),
            localize('openDetectedLink', 'The Open Detected Link command<keybinding:{0}> enables screen readers to easily open links found in the terminal.', "workbench.action.terminal.openDetectedLink" /* TerminalLinksCommandId.OpenDetectedLink */),
            localize('newWithProfile', 'The Create New Terminal (With Profile) command<keybinding:{0}> allows for easy terminal creation using a specific profile.', "workbench.action.terminal.newWithProfile" /* TerminalCommandId.NewWithProfile */),
            localize('focusAfterRun', 'Configure what gets focused after running selected text in the terminal with `{0}`.', "terminal.integrated.focusAfterRun" /* TerminalSettingId.FocusAfterRun */),
        ];
        if (!this._configurationService.getValue("terminal.integrated.accessibleViewFocusOnCommandExecution" /* TerminalAccessibilitySettingId.AccessibleViewFocusOnCommandExecution */)) {
            content.push(localize('focusViewOnExecution', 'Enable `terminal.integrated.accessibleViewFocusOnCommandExecution` to automatically focus the terminal accessible view when a command is executed in the terminal.'));
        }
        if (this._configurationService.getValue("terminal.integrated.suggest.enabled" /* TerminalSuggestSettingId.Enabled */)) {
            content.push(localize('suggestTrigger', 'The terminal request completions command can be invoked manually<keybinding:{0}>, but also appears while typing.', "workbench.action.terminal.requestCompletions" /* TerminalSuggestCommandId.RequestCompletions */));
            content.push(localize('suggestCommands', 'When the terminal suggest widget is focused, accept the suggestion<keybinding:{0}> and configure suggest settings<keybinding:{1}>.', "workbench.action.terminal.acceptSelectedSuggestion" /* TerminalSuggestCommandId.AcceptSelectedSuggestion */, "workbench.action.terminal.configureSuggestSettings" /* TerminalSuggestCommandId.ConfigureSettings */));
            content.push(localize('suggestCommandsMore', 'Also, when the suggest widget is focused, toggle between the widget and terminal<keybinding:{0}> and toggle details focus<keybinding:{1}> to learn more about the suggestion.', "workbench.action.terminal.suggestToggleDetails" /* TerminalSuggestCommandId.ToggleDetails */, "workbench.action.terminal.suggestToggleDetailsFocus" /* TerminalSuggestCommandId.ToggleDetailsFocus */));
        }
        if (this._instance.shellType === "cmd" /* WindowsShellType.CommandPrompt */) {
            content.push(localize('commandPromptMigration', "Consider using powershell instead of command prompt for an improved experience"));
        }
        if (this._hasShellIntegration) {
            content.push(localize('shellIntegration', "The terminal has a feature called shell integration that offers an enhanced experience and provides useful commands for screen readers such as:"));
            content.push('- ' + localize('goToNextCommand', 'Go to Next Command<keybinding:{0}> in the accessible view', "workbench.action.terminal.accessibleBufferGoToNextCommand" /* TerminalAccessibilityCommandId.AccessibleBufferGoToNextCommand */));
            content.push('- ' + localize('goToPreviousCommand', 'Go to Previous Command<keybinding:{0}> in the accessible view', "workbench.action.terminal.accessibleBufferGoToPreviousCommand" /* TerminalAccessibilityCommandId.AccessibleBufferGoToPreviousCommand */));
            content.push('- ' + localize('goToSymbol', 'Go to Symbol<keybinding:{0}>', "editor.action.accessibleViewGoToSymbol" /* AccessibilityCommandId.GoToSymbol */));
            content.push('- ' + localize('runRecentCommand', 'Run Recent Command<keybinding:{0}>', "workbench.action.terminal.runRecentCommand" /* TerminalHistoryCommandId.RunRecentCommand */));
            content.push('- ' + localize('goToRecentDirectory', 'Go to Recent Directory<keybinding:{0}>', "workbench.action.terminal.goToRecentDirectory" /* TerminalHistoryCommandId.GoToRecentDirectory */));
        }
        else {
            content.push(localize('noShellIntegration', 'Shell integration is not enabled. Some accessibility features may not be available.'));
        }
        return content.join('\n');
    }
};
TerminalAccessibilityHelpProvider = __decorate([
    __param(2, ICommandService),
    __param(3, IConfigurationService),
    __param(4, IContextKeyService)
], TerminalAccessibilityHelpProvider);
export { TerminalAccessibilityHelpProvider };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxBY2Nlc3NpYmlsaXR5SGVscC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvYWNjZXNzaWJpbGl0eS9icm93c2VyL3Rlcm1pbmFsQWNjZXNzaWJpbGl0eUhlbHAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUNqRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0scURBQXFELENBQUM7QUFDdEYsT0FBTyxFQUFFLGNBQWMsRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBTTdHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBS3RHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSwrQkFBK0IsRUFBbUMsTUFBTSw4REFBOEQsQ0FBQztBQUt2SyxNQUFNLENBQU4sSUFBa0IsU0FHakI7QUFIRCxXQUFrQixTQUFTO0lBQzFCLDhCQUFpQixDQUFBO0lBQ2pCLHdDQUEyQixDQUFBO0FBQzVCLENBQUMsRUFIaUIsU0FBUyxLQUFULFNBQVMsUUFHMUI7QUFFTSxJQUFNLGlDQUFpQyxHQUF2QyxNQUFNLGlDQUFrQyxTQUFRLFVBQVU7SUFHaEUsT0FBTztRQUNOLE1BQU0sSUFBSSxHQUFHLGNBQWMsQ0FBQyxHQUFHLENBQUMscUJBQXFCLEVBQUUsY0FBYyxDQUFDLE1BQU0sQ0FBQywrQkFBK0IsQ0FBQyxHQUFHLDhEQUF3QyxDQUFDLENBQUM7UUFDMUosSUFBSSxJQUFJLEVBQUUsUUFBUSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxV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