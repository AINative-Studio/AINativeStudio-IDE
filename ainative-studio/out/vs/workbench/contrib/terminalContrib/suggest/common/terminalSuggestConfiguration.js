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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxTdWdnZXN0Q29uZmlndXJhdGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi9zdWdnZXN0L2NvbW1vbi90ZXJtaW5hbFN1Z2dlc3RDb25maWd1cmF0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUlqRCxNQUFNLENBQU4sSUFBa0Isd0JBV2pCO0FBWEQsV0FBa0Isd0JBQXdCO0lBQ3pDLDJFQUErQyxDQUFBO0lBQy9DLDZGQUFpRSxDQUFBO0lBQ2pFLGlIQUFxRixDQUFBO0lBQ3JGLGlGQUFxRCxDQUFBO0lBQ3JELG1IQUF1RixDQUFBO0lBQ3ZGLCtFQUFtRCxDQUFBO0lBQ25ELHVGQUEyRCxDQUFBO0lBQzNELHlFQUE2QyxDQUFBO0lBQzdDLDZGQUFpRSxDQUFBO0lBQ2pFLDJHQUErRSxDQUFBO0FBQ2hGLENBQUMsRUFYaUIsd0JBQXdCLEtBQXhCLHdCQUF3QixRQVd6QztBQUVELE1BQU0sQ0FBQyxNQUFNLGtDQUFrQyxHQUFhO0lBQzNELEtBQUssRUFBSSxrQkFBa0I7SUFDM0IsS0FBSyxFQUFJLGFBQWE7SUFDdEIsS0FBSyxFQUFJLGlCQUFpQjtJQUMxQixLQUFLLEVBQUksZUFBZTtJQUV4QixLQUFLLEVBQUksNEJBQTRCO0lBRXJDLEtBQUssRUFBSSxvQkFBb0I7SUFFN0IsS0FBSyxFQUFJLGdCQUFnQjtJQUN6QixJQUFJLEVBQUssZUFBZTtJQUN4QixLQUFLLEVBQUksdUNBQXVDO0lBQ2hELElBQUksRUFBSyw4Q0FBOEM7SUFDdkQsSUFBSSxFQUFLLDBDQUEwQztJQUNuRCxJQUFJLEVBQUssMENBQTBDO0lBQ25ELElBQUksRUFBSyw4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