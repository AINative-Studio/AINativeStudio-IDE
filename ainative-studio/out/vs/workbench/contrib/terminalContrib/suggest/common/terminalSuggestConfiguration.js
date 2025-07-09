/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../../nls.js';
export var TerminalSuggestSettingId;
(function (TerminalSuggestSettingId) {
    TerminalSuggestSettingId["Enabled"] = "terminal.integrated.suggest.enabled";
    TerminalSuggestSettingId["QuickSuggestions"] = "terminal.integrated.suggest.quickSuggestions";
    TerminalSuggestSettingId["SuggestOnTriggerCharacters"] = "terminal.integrated.suggest.suggestOnTriggerCharacters";
    TerminalSuggestSettingId["RunOnEnter"] = "terminal.integrated.suggest.runOnEnter";
    TerminalSuggestSettingId["WindowsExecutableExtensions"] = "terminal.integrated.suggest.windowsExecutableExtensions";
    TerminalSuggestSettingId["Providers"] = "terminal.integrated.suggest.providers";
    TerminalSuggestSettingId["ShowStatusBar"] = "terminal.integrated.suggest.showStatusBar";
    TerminalSuggestSettingId["CdPath"] = "terminal.integrated.suggest.cdPath";
    TerminalSuggestSettingId["InlineSuggestion"] = "terminal.integrated.suggest.inlineSuggestion";
    TerminalSuggestSettingId["UpArrowNavigatesHistory"] = "terminal.integrated.suggest.upArrowNavigatesHistory";
})(TerminalSuggestSettingId || (TerminalSuggestSettingId = {}));
export const windowsDefaultExecutableExtensions = [
    'exe', // Executable file
    'bat', // Batch file
    'cmd', // Command script
    'com', // Command file
    'msi', // Windows Installer package
    'ps1', // PowerShell script
    'vbs', // VBScript file
    'js', // JScript file
    'jar', // Java Archive (requires Java runtime)
    'py', // Python script (requires Python interpreter)
    'rb', // Ruby script (requires Ruby interpreter)
    'pl', // Perl script (requires Perl interpreter)
    'sh', // Shell script (via WSL or third-party tools)
];
export const terminalSuggestConfigSection = 'terminal.integrated.suggest';
export const terminalSuggestConfiguration = {
    ["terminal.integrated.suggest.enabled" /* TerminalSuggestSettingId.Enabled */]: {
        restricted: true,
        markdownDescription: localize('suggest.enabled', "Enables terminal intellisense suggestions (preview) for supported shells ({0}) when {1} is set to {2}.\n\nIf shell integration is installed manually, {3} needs to be set to {4} before calling the shell integration script.", 'PowerShell v7+, zsh, bash, fish', `\`#${"terminal.integrated.shellIntegration.enabled" /* TerminalSettingId.ShellIntegrationEnabled */}#\``, '`true`', '`VSCODE_SUGGEST`', '`1`'),
        type: 'boolean',
        default: false,
        tags: ['preview'],
    },
    ["terminal.integrated.suggest.providers" /* TerminalSuggestSettingId.Providers */]: {
        restricted: true,
        markdownDescription: localize('suggest.providers', "Providers are enabled by default. Omit them by setting the id of the provider to `false`."),
        type: 'object',
        properties: {},
        default: {
            'terminal-suggest': true,
            'pwsh-shell-integration': true,
        },
        tags: ['preview'],
    },
    ["terminal.integrated.suggest.quickSuggestions" /* TerminalSuggestSettingId.QuickSuggestions */]: {
        restricted: true,
        markdownDescription: localize('suggest.quickSuggestions', "Controls whether suggestions should automatically show up while typing. Also be aware of the {0}-setting which controls if suggestions are triggered by special characters.", `\`#${"terminal.integrated.suggest.suggestOnTriggerCharacters" /* TerminalSuggestSettingId.SuggestOnTriggerCharacters */}#\``),
        type: 'object',
        properties: {
            commands: {
                description: localize('suggest.quickSuggestions.commands', 'Enable quick suggestions for commands, the first word in a command line input.'),
                type: 'string',
                enum: ['off', 'on'],
            },
            arguments: {
                description: localize('suggest.quickSuggestions.arguments', 'Enable quick suggestions for arguments, anything after the first word in a command line input.'),
                type: 'string',
                enum: ['off', 'on'],
            },
            unknown: {
                description: localize('suggest.quickSuggestions.unknown', 'Enable quick suggestions when it\'s unclear what the best suggestion is, if this is on files and folders will be suggested as a fallback.'),
                type: 'string',
                enum: ['off', 'on'],
            },
        },
        default: {
            commands: 'on',
            arguments: 'on',
            unknown: 'off',
        },
        tags: ['preview']
    },
    ["terminal.integrated.suggest.suggestOnTriggerCharacters" /* TerminalSuggestSettingId.SuggestOnTriggerCharacters */]: {
        restricted: true,
        markdownDescription: localize('suggest.suggestOnTriggerCharacters', "Controls whether suggestions should automatically show up when typing trigger characters."),
        type: 'boolean',
        default: true,
        tags: ['preview']
    },
    ["terminal.integrated.suggest.runOnEnter" /* TerminalSuggestSettingId.RunOnEnter */]: {
        restricted: true,
        markdownDescription: localize('suggest.runOnEnter', "Controls whether suggestions should run immediately when `Enter` (not `Tab`) is used to accept the result."),
        enum: ['ignore', 'never', 'exactMatch', 'exactMatchIgnoreExtension', 'always'],
        markdownEnumDescriptions: [
            localize('runOnEnter.ignore', "Ignore suggestions and send the enter directly to the shell without completing. This is used as the default value so the suggest widget is as unobtrusive as possible."),
            localize('runOnEnter.never', "Never run on `Enter`."),
            localize('runOnEnter.exactMatch', "Run on `Enter` when the suggestion is typed in its entirety."),
            localize('runOnEnter.exactMatchIgnoreExtension', "Run on `Enter` when the suggestion is typed in its entirety or when a file is typed without its extension included."),
            localize('runOnEnter.always', "Always run on `Enter`.")
        ],
        default: 'ignore',
        tags: ['preview']
    },
    ["terminal.integrated.suggest.windowsExecutableExtensions" /* TerminalSuggestSettingId.WindowsExecutableExtensions */]: {
        restricted: true,
        markdownDescription: localize("terminalWindowsExecutableSuggestionSetting", "A set of windows command executable extensions that will be included as suggestions in the terminal.\n\nMany executables are included by default, listed below:\n\n{0}.\n\nTo exclude an extension, set it to `false`\n\n. To include one not in the list, add it and set it to `true`.", windowsDefaultExecutableExtensions.sort().map(extension => `- ${extension}`).join('\n')),
        type: 'object',
        default: {},
        tags: ['preview']
    },
    ["terminal.integrated.suggest.showStatusBar" /* TerminalSuggestSettingId.ShowStatusBar */]: {
        restricted: true,
        markdownDescription: localize('suggest.showStatusBar', "Controls whether the terminal suggestions status bar should be shown."),
        type: 'boolean',
        default: true,
        tags: ['preview']
    },
    ["terminal.integrated.suggest.cdPath" /* TerminalSuggestSettingId.CdPath */]: {
        restricted: true,
        markdownDescription: localize('suggest.cdPath', "Controls whether to enable $CDPATH support which exposes children of the folders in the $CDPATH variable regardless of the current working directory. $CDPATH is expected to be semi colon-separated on Windows and colon-separated on other platforms."),
        type: 'string',
        enum: ['off', 'relative', 'absolute'],
        markdownEnumDescriptions: [
            localize('suggest.cdPath.off', "Disable the feature."),
            localize('suggest.cdPath.relative', "Enable the feature and use relative paths."),
            localize('suggest.cdPath.absolute', "Enable the feature and use absolute paths. This is useful when the shell doesn't natively support `$CDPATH`."),
        ],
        default: 'absolute',
        tags: ['preview']
    },
    ["terminal.integrated.suggest.inlineSuggestion" /* TerminalSuggestSettingId.InlineSuggestion */]: {
        restricted: true,
        markdownDescription: localize('suggest.inlineSuggestion', "Controls whether the shell's inline suggestion should be detected and how it is scored."),
        type: 'string',
        enum: ['off', 'alwaysOnTopExceptExactMatch', 'alwaysOnTop'],
        markdownEnumDescriptions: [
            localize('suggest.inlineSuggestion.off', "Disable the feature."),
            localize('suggest.inlineSuggestion.alwaysOnTopExceptExactMatch', "Enable the feature and sort the inline suggestion without forcing it to be on top. This means that exact matches will be will be above the inline suggestion."),
            localize('suggest.inlineSuggestion.alwaysOnTop', "Enable the feature and always put the inline suggestion on top."),
        ],
        default: 'alwaysOnTop',
        tags: ['preview']
    },
    ["terminal.integrated.suggest.upArrowNavigatesHistory" /* TerminalSuggestSettingId.UpArrowNavigatesHistory */]: {
        restricted: true,
        markdownDescription: localize('suggest.upArrowNavigatesHistory', "Determines whether the up arrow key navigates the command history when focus is on the first suggestion and navigation has not yet occurred. When set to false, the up arrow will move focus to the last suggestion instead."),
        type: 'boolean',
        default: true,
        tags: ['preview']
    },
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxTdWdnZXN0Q29uZmlndXJhdGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvc3VnZ2VzdC9jb21tb24vdGVybWluYWxTdWdnZXN0Q29uZmlndXJhdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFJakQsTUFBTSxDQUFOLElBQWtCLHdCQVdqQjtBQVhELFdBQWtCLHdCQUF3QjtJQUN6QywyRUFBK0MsQ0FBQTtJQUMvQyw2RkFBaUUsQ0FBQTtJQUNqRSxpSEFBcUYsQ0FBQTtJQUNyRixpRkFBcUQsQ0FBQTtJQUNyRCxtSEFBdUYsQ0FBQTtJQUN2RiwrRUFBbUQsQ0FBQTtJQUNuRCx1RkFBMkQsQ0FBQTtJQUMzRCx5RUFBNkMsQ0FBQTtJQUM3Qyw2RkFBaUUsQ0FBQTtJQUNqRSwyR0FBK0UsQ0FBQTtBQUNoRixDQUFDLEVBWGlCLHdCQUF3QixLQUF4Qix3QkFBd0IsUUFXekM7QUFFRCxNQUFNLENBQUMsTUFBTSxrQ0FBa0MsR0FBYTtJQUMzRCxLQUFLLEVBQUksa0JBQWtCO0lBQzNCLEtBQUssRUFBSSxhQUFhO0lBQ3RCLEtBQUssRUFBSSxpQkFBaUI7SUFDMUIsS0FBSyxFQUFJLGVBQWU7SUFFeEIsS0FBSyxFQUFJLDRCQUE0QjtJQUVyQyxLQUFLLEVBQUksb0JBQW9CO0lBRTdCLEtBQUssRUFBSSxnQkFBZ0I7SUFDekIsSUFBSSxFQUFLLGVBQWU7SUFDeEIsS0FBSyxFQUFJLHVDQUF1QztJQUNoRCxJQUFJLEVBQUssOENBQThDO0lBQ3ZELElBQUksRUFBSywwQ0FBMEM7SUFDbkQsSUFBSSxFQUFLLDBDQUEwQztJQUNuRCxJQUFJLEVBQUss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