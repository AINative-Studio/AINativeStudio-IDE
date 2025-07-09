/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../../base/common/codicons.js';
import { isMacintosh, isWindows } from '../../../../base/common/platform.js';
import { localize } from '../../../../nls.js';
import { Extensions } from '../../../../platform/configuration/common/configurationRegistry.js';
import product from '../../../../platform/product/common/product.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { terminalColorSchema, terminalIconSchema } from '../../../../platform/terminal/common/terminalPlatformConfiguration.js';
import { Extensions as WorkbenchExtensions } from '../../../common/configuration.js';
import { terminalContribConfiguration } from '../terminalContribExports.js';
import { DEFAULT_COMMANDS_TO_SKIP_SHELL, DEFAULT_LETTER_SPACING, DEFAULT_LINE_HEIGHT, MAXIMUM_FONT_WEIGHT, MINIMUM_FONT_WEIGHT, SUGGESTIONS_FONT_WEIGHT } from './terminal.js';
const terminalDescriptors = '\n- ' + [
    '`\${cwd}`: ' + localize("cwd", "the terminal's current working directory."),
    '`\${cwdFolder}`: ' + localize('cwdFolder', "the terminal's current working directory, displayed for multi-root workspaces or in a single root workspace when the value differs from the initial working directory. On Windows, this will only be displayed when shell integration is enabled."),
    '`\${workspaceFolder}`: ' + localize('workspaceFolder', "the workspace in which the terminal was launched."),
    '`\${workspaceFolderName}`: ' + localize('workspaceFolderName', "the `name` of the workspace in which the terminal was launched."),
    '`\${local}`: ' + localize('local', "indicates a local terminal in a remote workspace."),
    '`\${process}`: ' + localize('process', "the name of the terminal process."),
    '`\${progress}`: ' + localize('progress', "the progress state as reported by the `OSC 9;4` sequence."),
    '`\${separator}`: ' + localize('separator', "a conditional separator {0} that only shows when it's surrounded by variables with values or static text.", '(` - `)'),
    '`\${sequence}`: ' + localize('sequence', "the name provided to the terminal by the process."),
    '`\${task}`: ' + localize('task', "indicates this terminal is associated with a task."),
    '`\${shellType}`: ' + localize('shellType', "the detected shell type."),
    '`\${shellCommand}`: ' + localize('shellCommand', "the command being executed according to shell integration. This also requires high confidence in the detected command line, which may not work in some prompt frameworks."),
    '`\${shellPromptInput}`: ' + localize('shellPromptInput', "the shell's full prompt input according to shell integration."),
].join('\n- '); // intentionally concatenated to not produce a string that is too long for translations
let terminalTitle = localize('terminalTitle', "Controls the terminal title. Variables are substituted based on the context:");
terminalTitle += terminalDescriptors;
let terminalDescription = localize('terminalDescription', "Controls the terminal description, which appears to the right of the title. Variables are substituted based on the context:");
terminalDescription += terminalDescriptors;
export const defaultTerminalFontSize = isMacintosh ? 12 : 14;
const terminalConfiguration = {
    id: 'terminal',
    order: 100,
    title: localize('terminalIntegratedConfigurationTitle', "Integrated Terminal"),
    type: 'object',
    properties: {
        ["terminal.integrated.sendKeybindingsToShell" /* TerminalSettingId.SendKeybindingsToShell */]: {
            markdownDescription: localize('terminal.integrated.sendKeybindingsToShell', "Dispatches most keybindings to the terminal instead of the workbench, overriding {0}, which can be used alternatively for fine tuning.", '`#terminal.integrated.commandsToSkipShell#`'),
            type: 'boolean',
            default: false
        },
        ["terminal.integrated.tabs.defaultColor" /* TerminalSettingId.TabsDefaultColor */]: {
            description: localize('terminal.integrated.tabs.defaultColor', "A theme color ID to associate with terminal icons by default."),
            ...terminalColorSchema,
            scope: 5 /* ConfigurationScope.RESOURCE */
        },
        ["terminal.integrated.tabs.defaultIcon" /* TerminalSettingId.TabsDefaultIcon */]: {
            description: localize('terminal.integrated.tabs.defaultIcon', "A codicon ID to associate with terminal icons by default."),
            ...terminalIconSchema,
            default: Codicon.terminal.id,
            scope: 5 /* ConfigurationScope.RESOURCE */
        },
        ["terminal.integrated.tabs.enabled" /* TerminalSettingId.TabsEnabled */]: {
            description: localize('terminal.integrated.tabs.enabled', 'Controls whether terminal tabs display as a list to the side of the terminal. When this is disabled a dropdown will display instead.'),
            type: 'boolean',
            default: true,
        },
        ["terminal.integrated.tabs.enableAnimation" /* TerminalSettingId.TabsEnableAnimation */]: {
            description: localize('terminal.integrated.tabs.enableAnimation', 'Controls whether terminal tab statuses support animation (eg. in progress tasks).'),
            type: 'boolean',
            default: true,
        },
        ["terminal.integrated.tabs.hideCondition" /* TerminalSettingId.TabsHideCondition */]: {
            description: localize('terminal.integrated.tabs.hideCondition', 'Controls whether the terminal tabs view will hide under certain conditions.'),
            type: 'string',
            enum: ['never', 'singleTerminal', 'singleGroup'],
            enumDescriptions: [
                localize('terminal.integrated.tabs.hideCondition.never', "Never hide the terminal tabs view"),
                localize('terminal.integrated.tabs.hideCondition.singleTerminal', "Hide the terminal tabs view when there is only a single terminal opened"),
                localize('terminal.integrated.tabs.hideCondition.singleGroup', "Hide the terminal tabs view when there is only a single terminal group opened"),
            ],
            default: 'singleTerminal',
        },
        ["terminal.integrated.tabs.showActiveTerminal" /* TerminalSettingId.TabsShowActiveTerminal */]: {
            description: localize('terminal.integrated.tabs.showActiveTerminal', 'Shows the active terminal information in the view. This is particularly useful when the title within the tabs aren\'t visible.'),
            type: 'string',
            enum: ['always', 'singleTerminal', 'singleTerminalOrNarrow', 'never'],
            enumDescriptions: [
                localize('terminal.integrated.tabs.showActiveTerminal.always', "Always show the active terminal"),
                localize('terminal.integrated.tabs.showActiveTerminal.singleTerminal', "Show the active terminal when it is the only terminal opened"),
                localize('terminal.integrated.tabs.showActiveTerminal.singleTerminalOrNarrow', "Show the active terminal when it is the only terminal opened or when the tabs view is in its narrow textless state"),
                localize('terminal.integrated.tabs.showActiveTerminal.never', "Never show the active terminal"),
            ],
            default: 'singleTerminalOrNarrow',
        },
        ["terminal.integrated.tabs.showActions" /* TerminalSettingId.TabsShowActions */]: {
            description: localize('terminal.integrated.tabs.showActions', 'Controls whether terminal split and kill buttons are displays next to the new terminal button.'),
            type: 'string',
            enum: ['always', 'singleTerminal', 'singleTerminalOrNarrow', 'never'],
            enumDescriptions: [
                localize('terminal.integrated.tabs.showActions.always', "Always show the actions"),
                localize('terminal.integrated.tabs.showActions.singleTerminal', "Show the actions when it is the only terminal opened"),
                localize('terminal.integrated.tabs.showActions.singleTerminalOrNarrow', "Show the actions when it is the only terminal opened or when the tabs view is in its narrow textless state"),
                localize('terminal.integrated.tabs.showActions.never', "Never show the actions"),
            ],
            default: 'singleTerminalOrNarrow',
        },
        ["terminal.integrated.tabs.location" /* TerminalSettingId.TabsLocation */]: {
            type: 'string',
            enum: ['left', 'right'],
            enumDescriptions: [
                localize('terminal.integrated.tabs.location.left', "Show the terminal tabs view to the left of the terminal"),
                localize('terminal.integrated.tabs.location.right', "Show the terminal tabs view to the right of the terminal")
            ],
            default: 'right',
            description: localize('terminal.integrated.tabs.location', "Controls the location of the terminal tabs, either to the left or right of the actual terminal(s).")
        },
        ["terminal.integrated.defaultLocation" /* TerminalSettingId.DefaultLocation */]: {
            type: 'string',
            enum: ["editor" /* TerminalLocationString.Editor */, "view" /* TerminalLocationString.TerminalView */],
            enumDescriptions: [
                localize('terminal.integrated.defaultLocation.editor', "Create terminals in the editor"),
                localize('terminal.integrated.defaultLocation.view', "Create terminals in the terminal view")
            ],
            default: 'view',
            description: localize('terminal.integrated.defaultLocation', "Controls where newly created terminals will appear.")
        },
        ["terminal.integrated.tabs.focusMode" /* TerminalSettingId.TabsFocusMode */]: {
            type: 'string',
            enum: ['singleClick', 'doubleClick'],
            enumDescriptions: [
                localize('terminal.integrated.tabs.focusMode.singleClick', "Focus the terminal when clicking a terminal tab"),
                localize('terminal.integrated.tabs.focusMode.doubleClick', "Focus the terminal when double-clicking a terminal tab")
            ],
            default: 'doubleClick',
            description: localize('terminal.integrated.tabs.focusMode', "Controls whether focusing the terminal of a tab happens on double or single click.")
        },
        ["terminal.integrated.macOptionIsMeta" /* TerminalSettingId.MacOptionIsMeta */]: {
            description: localize('terminal.integrated.macOptionIsMeta', "Controls whether to treat the option key as the meta key in the terminal on macOS."),
            type: 'boolean',
            default: false
        },
        ["terminal.integrated.macOptionClickForcesSelection" /* TerminalSettingId.MacOptionClickForcesSelection */]: {
            description: localize('terminal.integrated.macOptionClickForcesSelection', "Controls whether to force selection when using Option+click on macOS. This will force a regular (line) selection and disallow the use of column selection mode. This enables copying and pasting using the regular terminal selection, for example, when mouse mode is enabled in tmux."),
            type: 'boolean',
            default: false
        },
        ["terminal.integrated.altClickMovesCursor" /* TerminalSettingId.AltClickMovesCursor */]: {
            markdownDescription: localize('terminal.integrated.altClickMovesCursor', "If enabled, alt/option + click will reposition the prompt cursor to underneath the mouse when {0} is set to {1} (the default value). This may not work reliably depending on your shell.", '`#editor.multiCursorModifier#`', '`\'alt\'`'),
            type: 'boolean',
            default: true
        },
        ["terminal.integrated.copyOnSelection" /* TerminalSettingId.CopyOnSelection */]: {
            description: localize('terminal.integrated.copyOnSelection', "Controls whether text selected in the terminal will be copied to the clipboard."),
            type: 'boolean',
            default: false
        },
        ["terminal.integrated.enableMultiLinePasteWarning" /* TerminalSettingId.EnableMultiLinePasteWarning */]: {
            markdownDescription: localize('terminal.integrated.enableMultiLinePasteWarning', "Controls whether to show a warning dialog when pasting multiple lines into the terminal."),
            type: 'string',
            enum: ['auto', 'always', 'never'],
            markdownEnumDescriptions: [
                localize('terminal.integrated.enableMultiLinePasteWarning.auto', "Enable the warning but do not show it when:\n\n- Bracketed paste mode is enabled (the shell supports multi-line paste natively)\n- The paste is handled by the shell's readline (in the case of pwsh)"),
                localize('terminal.integrated.enableMultiLinePasteWarning.always', "Always show the warning if the text contains a new line."),
                localize('terminal.integrated.enableMultiLinePasteWarning.never', "Never show the warning.")
            ],
            default: 'auto'
        },
        ["terminal.integrated.drawBoldTextInBrightColors" /* TerminalSettingId.DrawBoldTextInBrightColors */]: {
            description: localize('terminal.integrated.drawBoldTextInBrightColors', "Controls whether bold text in the terminal will always use the \"bright\" ANSI color variant."),
            type: 'boolean',
            default: true
        },
        ["terminal.integrated.fontFamily" /* TerminalSettingId.FontFamily */]: {
            markdownDescription: localize('terminal.integrated.fontFamily', "Controls the font family of the terminal. Defaults to {0}'s value.", '`#editor.fontFamily#`'),
            type: 'string',
        },
        ["terminal.integrated.fontLigatures.enabled" /* TerminalSettingId.FontLigaturesEnabled */]: {
            markdownDescription: localize('terminal.integrated.fontLigatures.enabled', "Controls whether font ligatures are enabled in the terminal. Ligatures will only work if the configured {0} supports them.", `\`#${"terminal.integrated.fontFamily" /* TerminalSettingId.FontFamily */}#\``),
            type: 'boolean',
            default: false
        },
        ["terminal.integrated.fontLigatures.featureSettings" /* TerminalSettingId.FontLigaturesFeatureSettings */]: {
            markdownDescription: localize('terminal.integrated.fontLigatures.featureSettings', "Controls what font feature settings are used when ligatures are enabled, in the format of the `font-feature-settings` CSS property. Some examples which may be valid depending on the font:") + '\n\n- ' + [
                `\`"calt" off, "ss03"\``,
                `\`"liga" on\``,
                `\`"calt" off, "dlig" on\``
            ].join('\n- '),
            type: 'string',
            default: '"calt" on'
        },
        ["terminal.integrated.fontLigatures.fallbackLigatures" /* TerminalSettingId.FontLigaturesFallbackLigatures */]: {
            markdownDescription: localize('terminal.integrated.fontLigatures.fallbackLigatures', "When {0} is enabled and the particular {1} cannot be parsed, this is the set of character sequences that will always be drawn together. This allows the use of a fixed set of ligatures even when the font isn't supported.", `\`#${"terminal.integrated.gpuAcceleration" /* TerminalSettingId.GpuAcceleration */}#\``, `\`#${"terminal.integrated.fontFamily" /* TerminalSettingId.FontFamily */}#\``),
            type: 'array',
            items: [{ type: 'string' }],
            default: [
                '<--', '<---', '<<-', '<-', '->', '->>', '-->', '--->',
                '<==', '<===', '<<=', '<=', '=>', '=>>', '==>', '===>', '>=', '>>=',
                '<->', '<-->', '<--->', '<---->', '<=>', '<==>', '<===>', '<====>', '::', ':::',
                '<~~', '</', '</>', '/>', '~~>', '==', '!=', '/=', '~=', '<>', '===', '!==', '!===',
                '<:', ':=', '*=', '*+', '<*', '<*>', '*>', '<|', '<|>', '|>', '+*', '=*', '=:', ':>',
                '/*', '*/', '+++', '<!--', '<!---'
            ]
        },
        ["terminal.integrated.fontSize" /* TerminalSettingId.FontSize */]: {
            description: localize('terminal.integrated.fontSize', "Controls the font size in pixels of the terminal."),
            type: 'number',
            default: defaultTerminalFontSize,
            minimum: 6,
            maximum: 100
        },
        ["terminal.integrated.letterSpacing" /* TerminalSettingId.LetterSpacing */]: {
            description: localize('terminal.integrated.letterSpacing', "Controls the letter spacing of the terminal. This is an integer value which represents the number of additional pixels to add between characters."),
            type: 'number',
            default: DEFAULT_LETTER_SPACING
        },
        ["terminal.integrated.lineHeight" /* TerminalSettingId.LineHeight */]: {
            description: localize('terminal.integrated.lineHeight', "Controls the line height of the terminal. This number is multiplied by the terminal font size to get the actual line-height in pixels."),
            type: 'number',
            default: DEFAULT_LINE_HEIGHT
        },
        ["terminal.integrated.minimumContrastRatio" /* TerminalSettingId.MinimumContrastRatio */]: {
            markdownDescription: localize('terminal.integrated.minimumContrastRatio', "When set, the foreground color of each cell will change to try meet the contrast ratio specified. Note that this will not apply to `powerline` characters per #146406. Example values:\n\n- 1: Do nothing and use the standard theme colors.\n- 4.5: [WCAG AA compliance (minimum)](https://www.w3.org/TR/UNDERSTANDING-WCAG20/visual-audio-contrast-contrast.html) (default).\n- 7: [WCAG AAA compliance (enhanced)](https://www.w3.org/TR/UNDERSTANDING-WCAG20/visual-audio-contrast7.html).\n- 21: White on black or black on white."),
            type: 'number',
            default: 4.5,
            tags: ['accessibility']
        },
        ["terminal.integrated.tabStopWidth" /* TerminalSettingId.TabStopWidth */]: {
            markdownDescription: localize('terminal.integrated.tabStopWidth', "The number of cells in a tab stop."),
            type: 'number',
            minimum: 1,
            default: 8
        },
        ["terminal.integrated.fastScrollSensitivity" /* TerminalSettingId.FastScrollSensitivity */]: {
            markdownDescription: localize('terminal.integrated.fastScrollSensitivity', "Scrolling speed multiplier when pressing `Alt`."),
            type: 'number',
            default: 5
        },
        ["terminal.integrated.mouseWheelScrollSensitivity" /* TerminalSettingId.MouseWheelScrollSensitivity */]: {
            markdownDescription: localize('terminal.integrated.mouseWheelScrollSensitivity', "A multiplier to be used on the `deltaY` of mouse wheel scroll events."),
            type: 'number',
            default: 1
        },
        ["terminal.integrated.bellDuration" /* TerminalSettingId.BellDuration */]: {
            markdownDescription: localize('terminal.integrated.bellDuration', "The number of milliseconds to show the bell within a terminal tab when triggered."),
            type: 'number',
            default: 1000
        },
        ["terminal.integrated.fontWeight" /* TerminalSettingId.FontWeight */]: {
            'anyOf': [
                {
                    type: 'number',
                    minimum: MINIMUM_FONT_WEIGHT,
                    maximum: MAXIMUM_FONT_WEIGHT,
                    errorMessage: localize('terminal.integrated.fontWeightError', "Only \"normal\" and \"bold\" keywords or numbers between 1 and 1000 are allowed.")
                },
                {
                    type: 'string',
                    pattern: '^(normal|bold|1000|[1-9][0-9]{0,2})$'
                },
                {
                    enum: SUGGESTIONS_FONT_WEIGHT,
                }
            ],
            description: localize('terminal.integrated.fontWeight', "The font weight to use within the terminal for non-bold text. Accepts \"normal\" and \"bold\" keywords or numbers between 1 and 1000."),
            default: 'normal'
        },
        ["terminal.integrated.fontWeightBold" /* TerminalSettingId.FontWeightBold */]: {
            'anyOf': [
                {
                    type: 'number',
                    minimum: MINIMUM_FONT_WEIGHT,
                    maximum: MAXIMUM_FONT_WEIGHT,
                    errorMessage: localize('terminal.integrated.fontWeightError', "Only \"normal\" and \"bold\" keywords or numbers between 1 and 1000 are allowed.")
                },
                {
                    type: 'string',
                    pattern: '^(normal|bold|1000|[1-9][0-9]{0,2})$'
                },
                {
                    enum: SUGGESTIONS_FONT_WEIGHT,
                }
            ],
            description: localize('terminal.integrated.fontWeightBold', "The font weight to use within the terminal for bold text. Accepts \"normal\" and \"bold\" keywords or numbers between 1 and 1000."),
            default: 'bold'
        },
        ["terminal.integrated.cursorBlinking" /* TerminalSettingId.CursorBlinking */]: {
            description: localize('terminal.integrated.cursorBlinking', "Controls whether the terminal cursor blinks."),
            type: 'boolean',
            default: false
        },
        ["terminal.integrated.cursorStyle" /* TerminalSettingId.CursorStyle */]: {
            description: localize('terminal.integrated.cursorStyle', "Controls the style of terminal cursor when the terminal is focused."),
            enum: ['block', 'line', 'underline'],
            default: 'block'
        },
        ["terminal.integrated.cursorStyleInactive" /* TerminalSettingId.CursorStyleInactive */]: {
            description: localize('terminal.integrated.cursorStyleInactive', "Controls the style of terminal cursor when the terminal is not focused."),
            enum: ['outline', 'block', 'line', 'underline', 'none'],
            default: 'outline'
        },
        ["terminal.integrated.cursorWidth" /* TerminalSettingId.CursorWidth */]: {
            markdownDescription: localize('terminal.integrated.cursorWidth', "Controls the width of the cursor when {0} is set to {1}.", '`#terminal.integrated.cursorStyle#`', '`line`'),
            type: 'number',
            default: 1
        },
        ["terminal.integrated.scrollback" /* TerminalSettingId.Scrollback */]: {
            description: localize('terminal.integrated.scrollback', "Controls the maximum number of lines the terminal keeps in its buffer. We pre-allocate memory based on this value in order to ensure a smooth experience. As such, as the value increases, so will the amount of memory."),
            type: 'number',
            default: 1000
        },
        ["terminal.integrated.detectLocale" /* TerminalSettingId.DetectLocale */]: {
            markdownDescription: localize('terminal.integrated.detectLocale', "Controls whether to detect and set the `$LANG` environment variable to a UTF-8 compliant option since VS Code's terminal only supports UTF-8 encoded data coming from the shell."),
            type: 'string',
            enum: ['auto', 'off', 'on'],
            markdownEnumDescriptions: [
                localize('terminal.integrated.detectLocale.auto', "Set the `$LANG` environment variable if the existing variable does not exist or it does not end in `'.UTF-8'`."),
                localize('terminal.integrated.detectLocale.off', "Do not set the `$LANG` environment variable."),
                localize('terminal.integrated.detectLocale.on', "Always set the `$LANG` environment variable.")
            ],
            default: 'auto'
        },
        ["terminal.integrated.gpuAcceleration" /* TerminalSettingId.GpuAcceleration */]: {
            type: 'string',
            enum: ['auto', 'on', 'off'],
            markdownEnumDescriptions: [
                localize('terminal.integrated.gpuAcceleration.auto', "Let VS Code detect which renderer will give the best experience."),
                localize('terminal.integrated.gpuAcceleration.on', "Enable GPU acceleration within the terminal."),
                localize('terminal.integrated.gpuAcceleration.off', "Disable GPU acceleration within the terminal. The terminal will render much slower when GPU acceleration is off but it should reliably work on all systems."),
            ],
            default: 'auto',
            description: localize('terminal.integrated.gpuAcceleration', "Controls whether the terminal will leverage the GPU to do its rendering.")
        },
        ["terminal.integrated.tabs.separator" /* TerminalSettingId.TerminalTitleSeparator */]: {
            'type': 'string',
            'default': ' - ',
            'markdownDescription': localize("terminal.integrated.tabs.separator", "Separator used by {0} and {1}.", `\`#${"terminal.integrated.tabs.title" /* TerminalSettingId.TerminalTitle */}#\``, `\`#${"terminal.integrated.tabs.description" /* TerminalSettingId.TerminalDescription */}#\``)
        },
        ["terminal.integrated.tabs.title" /* TerminalSettingId.TerminalTitle */]: {
            'type': 'string',
            'default': '${process}',
            'markdownDescription': terminalTitle
        },
        ["terminal.integrated.tabs.description" /* TerminalSettingId.TerminalDescription */]: {
            'type': 'string',
            'default': '${task}${separator}${local}${separator}${cwdFolder}',
            'markdownDescription': terminalDescription
        },
        ["terminal.integrated.rightClickBehavior" /* TerminalSettingId.RightClickBehavior */]: {
            type: 'string',
            enum: ['default', 'copyPaste', 'paste', 'selectWord', 'nothing'],
            enumDescriptions: [
                localize('terminal.integrated.rightClickBehavior.default', "Show the context menu."),
                localize('terminal.integrated.rightClickBehavior.copyPaste', "Copy when there is a selection, otherwise paste."),
                localize('terminal.integrated.rightClickBehavior.paste', "Paste on right click."),
                localize('terminal.integrated.rightClickBehavior.selectWord', "Select the word under the cursor and show the context menu."),
                localize('terminal.integrated.rightClickBehavior.nothing', "Do nothing and pass event to terminal.")
            ],
            default: isMacintosh ? 'selectWord' : isWindows ? 'copyPaste' : 'default',
            description: localize('terminal.integrated.rightClickBehavior', "Controls how terminal reacts to right click.")
        },
        ["terminal.integrated.middleClickBehavior" /* TerminalSettingId.MiddleClickBehavior */]: {
            type: 'string',
            enum: ['default', 'paste'],
            enumDescriptions: [
                localize('terminal.integrated.middleClickBehavior.default', "The platform default to focus the terminal. On Linux this will also paste the selection."),
                localize('terminal.integrated.middleClickBehavior.paste', "Paste on middle click."),
            ],
            default: 'default',
            description: localize('terminal.integrated.middleClickBehavior', "Controls how terminal reacts to middle click.")
        },
        ["terminal.integrated.cwd" /* TerminalSettingId.Cwd */]: {
            restricted: true,
            description: localize('terminal.integrated.cwd', "An explicit start path where the terminal will be launched, this is used as the current working directory (cwd) for the shell process. This may be particularly useful in workspace settings if the root directory is not a convenient cwd."),
            type: 'string',
            default: undefined,
            scope: 5 /* ConfigurationScope.RESOURCE */
        },
        ["terminal.integrated.confirmOnExit" /* TerminalSettingId.ConfirmOnExit */]: {
            description: localize('terminal.integrated.confirmOnExit', "Controls whether to confirm when the window closes if there are active terminal sessions. Background terminals like those launched by some extensions will not trigger the confirmation."),
            type: 'string',
            enum: ['never', 'always', 'hasChildProcesses'],
            enumDescriptions: [
                localize('terminal.integrated.confirmOnExit.never', "Never confirm."),
                localize('terminal.integrated.confirmOnExit.always', "Always confirm if there are terminals."),
                localize('terminal.integrated.confirmOnExit.hasChildProcesses', "Confirm if there are any terminals that have child processes."),
            ],
            default: 'never'
        },
        ["terminal.integrated.confirmOnKill" /* TerminalSettingId.ConfirmOnKill */]: {
            description: localize('terminal.integrated.confirmOnKill', "Controls whether to confirm killing terminals when they have child processes. When set to editor, terminals in the editor area will be marked as changed when they have child processes. Note that child process detection may not work well for shells like Git Bash which don't run their processes as child processes of the shell. Background terminals like those launched by some extensions will not trigger the confirmation."),
            type: 'string',
            enum: ['never', 'editor', 'panel', 'always'],
            enumDescriptions: [
                localize('terminal.integrated.confirmOnKill.never', "Never confirm."),
                localize('terminal.integrated.confirmOnKill.editor', "Confirm if the terminal is in the editor."),
                localize('terminal.integrated.confirmOnKill.panel', "Confirm if the terminal is in the panel."),
                localize('terminal.integrated.confirmOnKill.always', "Confirm if the terminal is either in the editor or panel."),
            ],
            default: 'editor'
        },
        ["terminal.integrated.enableBell" /* TerminalSettingId.EnableBell */]: {
            markdownDeprecationMessage: localize('terminal.integrated.enableBell', "This is now deprecated. Instead use the `terminal.integrated.enableVisualBell` and `accessibility.signals.terminalBell` settings."),
            type: 'boolean',
            default: false
        },
        ["terminal.integrated.enableVisualBell" /* TerminalSettingId.EnableVisualBell */]: {
            description: localize('terminal.integrated.enableVisualBell', "Controls whether the visual terminal bell is enabled. This shows up next to the terminal's name."),
            type: 'boolean',
            default: false
        },
        ["terminal.integrated.commandsToSkipShell" /* TerminalSettingId.CommandsToSkipShell */]: {
            markdownDescription: localize('terminal.integrated.commandsToSkipShell', "A set of command IDs whose keybindings will not be sent to the shell but instead always be handled by VS Code. This allows keybindings that would normally be consumed by the shell to act instead the same as when the terminal is not focused, for example `Ctrl+P` to launch Quick Open.\n\n&nbsp;\n\nMany commands are skipped by default. To override a default and pass that command's keybinding to the shell instead, add the command prefixed with the `-` character. For example add `-workbench.action.quickOpen` to allow `Ctrl+P` to reach the shell.\n\n&nbsp;\n\nThe following list of default skipped commands is truncated when viewed in Settings Editor. To see the full list, {1} and search for the first command from the list below.\n\n&nbsp;\n\nDefault Skipped Commands:\n\n{0}", DEFAULT_COMMANDS_TO_SKIP_SHELL.sort().map(command => `- ${command}`).join('\n'), `[${localize('openDefaultSettingsJson', "open the default settings JSON")}](command:workbench.action.openRawDefaultSettings '${localize('openDefaultSettingsJson.capitalized', "Open Default Settings (JSON)")}')`),
            type: 'array',
            items: {
                type: 'string'
            },
            default: []
        },
        ["terminal.integrated.allowChords" /* TerminalSettingId.AllowChords */]: {
            markdownDescription: localize('terminal.integrated.allowChords', "Whether or not to allow chord keybindings in the terminal. Note that when this is true and the keystroke results in a chord it will bypass {0}, setting this to false is particularly useful when you want ctrl+k to go to your shell (not VS Code).", '`#terminal.integrated.commandsToSkipShell#`'),
            type: 'boolean',
            default: true
        },
        ["terminal.integrated.allowMnemonics" /* TerminalSettingId.AllowMnemonics */]: {
            markdownDescription: localize('terminal.integrated.allowMnemonics', "Whether to allow menubar mnemonics (for example Alt+F) to trigger the open of the menubar. Note that this will cause all alt keystrokes to skip the shell when true. This does nothing on macOS."),
            type: 'boolean',
            default: false
        },
        ["terminal.integrated.env.osx" /* TerminalSettingId.EnvMacOs */]: {
            restricted: true,
            markdownDescription: localize('terminal.integrated.env.osx', "Object with environment variables that will be added to the VS Code process to be used by the terminal on macOS. Set to `null` to delete the environment variable."),
            type: 'object',
            additionalProperties: {
                type: ['string', 'null']
            },
            default: {}
        },
        ["terminal.integrated.env.linux" /* TerminalSettingId.EnvLinux */]: {
            restricted: true,
            markdownDescription: localize('terminal.integrated.env.linux', "Object with environment variables that will be added to the VS Code process to be used by the terminal on Linux. Set to `null` to delete the environment variable."),
            type: 'object',
            additionalProperties: {
                type: ['string', 'null']
            },
            default: {}
        },
        ["terminal.integrated.env.windows" /* TerminalSettingId.EnvWindows */]: {
            restricted: true,
            markdownDescription: localize('terminal.integrated.env.windows', "Object with environment variables that will be added to the VS Code process to be used by the terminal on Windows. Set to `null` to delete the environment variable."),
            type: 'object',
            additionalProperties: {
                type: ['string', 'null']
            },
            default: {}
        },
        ["terminal.integrated.environmentChangesIndicator" /* TerminalSettingId.EnvironmentChangesIndicator */]: {
            markdownDescription: localize('terminal.integrated.environmentChangesIndicator', "Whether to display the environment changes indicator on each terminal which explains whether extensions have made, or want to make changes to the terminal's environment."),
            type: 'string',
            enum: ['off', 'on', 'warnonly'],
            enumDescriptions: [
                localize('terminal.integrated.environmentChangesIndicator.off', "Disable the indicator."),
                localize('terminal.integrated.environmentChangesIndicator.on', "Enable the indicator."),
                localize('terminal.integrated.environmentChangesIndicator.warnonly', "Only show the warning indicator when a terminal's environment is 'stale', not the information indicator that shows a terminal has had its environment modified by an extension."),
            ],
            default: 'warnonly'
        },
        ["terminal.integrated.environmentChangesRelaunch" /* TerminalSettingId.EnvironmentChangesRelaunch */]: {
            markdownDescription: localize('terminal.integrated.environmentChangesRelaunch', "Whether to relaunch terminals automatically if extensions want to contribute to their environment and have not been interacted with yet."),
            type: 'boolean',
            default: true
        },
        ["terminal.integrated.showExitAlert" /* TerminalSettingId.ShowExitAlert */]: {
            description: localize('terminal.integrated.showExitAlert', "Controls whether to show the alert \"The terminal process terminated with exit code\" when exit code is non-zero."),
            type: 'boolean',
            default: true
        },
        ["terminal.integrated.windowsUseConptyDll" /* TerminalSettingId.WindowsUseConptyDll */]: {
            markdownDescription: localize('terminal.integrated.windowsUseConptyDll', "Whether to use the experimental conpty.dll (v1.22.250204002) shipped with VS Code, instead of the one bundled with Windows."),
            type: 'boolean',
            tags: ['preview'],
            default: product.quality !== 'stable'
        },
        ["terminal.integrated.splitCwd" /* TerminalSettingId.SplitCwd */]: {
            description: localize('terminal.integrated.splitCwd', "Controls the working directory a split terminal starts with."),
            type: 'string',
            enum: ['workspaceRoot', 'initial', 'inherited'],
            enumDescriptions: [
                localize('terminal.integrated.splitCwd.workspaceRoot', "A new split terminal will use the workspace root as the working directory. In a multi-root workspace a choice for which root folder to use is offered."),
                localize('terminal.integrated.splitCwd.initial', "A new split terminal will use the working directory that the parent terminal started with."),
                localize('terminal.integrated.splitCwd.inherited', "On macOS and Linux, a new split terminal will use the working directory of the parent terminal. On Windows, this behaves the same as initial."),
            ],
            default: 'inherited'
        },
        ["terminal.integrated.windowsEnableConpty" /* TerminalSettingId.WindowsEnableConpty */]: {
            description: localize('terminal.integrated.windowsEnableConpty', "Whether to use ConPTY for Windows terminal process communication (requires Windows 10 build number 18309+). Winpty will be used if this is false."),
            type: 'boolean',
            default: true
        },
        ["terminal.integrated.wordSeparators" /* TerminalSettingId.WordSeparators */]: {
            markdownDescription: localize('terminal.integrated.wordSeparators', "A string containing all characters to be considered word separators when double-clicking to select word and in the fallback 'word' link detection. Since this is used for link detection, including characters such as `:` that are used when detecting links will cause the line and column part of links like `file:10:5` to be ignored."),
            type: 'string',
            // allow-any-unicode-next-line
            default: ' ()[]{}\',"`─‘’“”|'
        },
        ["terminal.integrated.enableFileLinks" /* TerminalSettingId.EnableFileLinks */]: {
            description: localize('terminal.integrated.enableFileLinks', "Whether to enable file links in terminals. Links can be slow when working on a network drive in particular because each file link is verified against the file system. Changing this will take effect only in new terminals."),
            type: 'string',
            enum: ['off', 'on', 'notRemote'],
            enumDescriptions: [
                localize('enableFileLinks.off', "Always off."),
                localize('enableFileLinks.on', "Always on."),
                localize('enableFileLinks.notRemote', "Enable only when not in a remote workspace.")
            ],
            default: 'on'
        },
        ["terminal.integrated.allowedLinkSchemes" /* TerminalSettingId.AllowedLinkSchemes */]: {
            description: localize('terminal.integrated.allowedLinkSchemes', "An array of strings containing the URI schemes that the terminal is allowed to open links for. By default, only a small subset of possible schemes are allowed for security reasons."),
            type: 'array',
            items: {
                type: 'string'
            },
            default: [
                'file',
                'http',
                'https',
                'mailto',
                'vscode',
                'vscode-insiders',
            ]
        },
        ["terminal.integrated.unicodeVersion" /* TerminalSettingId.UnicodeVersion */]: {
            type: 'string',
            enum: ['6', '11'],
            enumDescriptions: [
                localize('terminal.integrated.unicodeVersion.six', "Version 6 of Unicode. This is an older version which should work better on older systems."),
                localize('terminal.integrated.unicodeVersion.eleven', "Version 11 of Unicode. This version provides better support on modern systems that use modern versions of Unicode.")
            ],
            default: '11',
            description: localize('terminal.integrated.unicodeVersion', "Controls what version of Unicode to use when evaluating the width of characters in the terminal. If you experience emoji or other wide characters not taking up the right amount of space or backspace either deleting too much or too little then you may want to try tweaking this setting.")
        },
        ["terminal.integrated.enablePersistentSessions" /* TerminalSettingId.EnablePersistentSessions */]: {
            description: localize('terminal.integrated.enablePersistentSessions', "Persist terminal sessions/history for the workspace across window reloads."),
            type: 'boolean',
            default: true
        },
        ["terminal.integrated.persistentSessionReviveProcess" /* TerminalSettingId.PersistentSessionReviveProcess */]: {
            markdownDescription: localize('terminal.integrated.persistentSessionReviveProcess', "When the terminal process must be shut down (for example on window or application close), this determines when the previous terminal session contents/history should be restored and processes be recreated when the workspace is next opened.\n\nCaveats:\n\n- Restoring of the process current working directory depends on whether it is supported by the shell.\n- Time to persist the session during shutdown is limited, so it may be aborted when using high-latency remote connections."),
            type: 'string',
            enum: ['onExit', 'onExitAndWindowClose', 'never'],
            markdownEnumDescriptions: [
                localize('terminal.integrated.persistentSessionReviveProcess.onExit', "Revive the processes after the last window is closed on Windows/Linux or when the `workbench.action.quit` command is triggered (command palette, keybinding, menu)."),
                localize('terminal.integrated.persistentSessionReviveProcess.onExitAndWindowClose', "Revive the processes after the last window is closed on Windows/Linux or when the `workbench.action.quit` command is triggered (command palette, keybinding, menu), or when the window is closed."),
                localize('terminal.integrated.persistentSessionReviveProcess.never', "Never restore the terminal buffers or recreate the process.")
            ],
            default: 'onExit'
        },
        ["terminal.integrated.hideOnStartup" /* TerminalSettingId.HideOnStartup */]: {
            description: localize('terminal.integrated.hideOnStartup', "Whether to hide the terminal view on startup, avoiding creating a terminal when there are no persistent sessions."),
            type: 'string',
            enum: ['never', 'whenEmpty', 'always'],
            markdownEnumDescriptions: [
                localize('hideOnStartup.never', "Never hide the terminal view on startup."),
                localize('hideOnStartup.whenEmpty', "Only hide the terminal when there are no persistent sessions restored."),
                localize('hideOnStartup.always', "Always hide the terminal, even when there are persistent sessions restored.")
            ],
            default: 'never'
        },
        ["terminal.integrated.hideOnLastClosed" /* TerminalSettingId.HideOnLastClosed */]: {
            description: localize('terminal.integrated.hideOnLastClosed', "Whether to hide the terminal view when the last terminal is closed. This will only happen when the terminal is the only visible view in the view container."),
            type: 'boolean',
            default: true
        },
        ["terminal.integrated.customGlyphs" /* TerminalSettingId.CustomGlyphs */]: {
            markdownDescription: localize('terminal.integrated.customGlyphs', "Whether to draw custom glyphs for block element and box drawing characters instead of using the font, which typically yields better rendering with continuous lines. Note that this doesn't work when {0} is disabled.", `\`#${"terminal.integrated.gpuAcceleration" /* TerminalSettingId.GpuAcceleration */}#\``),
            type: 'boolean',
            default: true
        },
        ["terminal.integrated.rescaleOverlappingGlyphs" /* TerminalSettingId.RescaleOverlappingGlyphs */]: {
            markdownDescription: localize('terminal.integrated.rescaleOverlappingGlyphs', "Whether to rescale glyphs horizontally that are a single cell wide but have glyphs that would overlap following cell(s). This typically happens for ambiguous width characters (eg. the roman numeral characters U+2160+) which aren't featured in monospace fonts. Emoji glyphs are never rescaled."),
            type: 'boolean',
            default: true
        },
        ["terminal.integrated.shellIntegration.enabled" /* TerminalSettingId.ShellIntegrationEnabled */]: {
            restricted: true,
            markdownDescription: localize('terminal.integrated.shellIntegration.enabled', "Determines whether or not shell integration is auto-injected to support features like enhanced command tracking and current working directory detection. \n\nShell integration works by injecting the shell with a startup script. The script gives VS Code insight into what is happening within the terminal.\n\nSupported shells:\n\n- Linux/macOS: bash, fish, pwsh, zsh\n - Windows: pwsh, git bash\n\nThis setting applies only when terminals are created, so you will need to restart your terminals for it to take effect.\n\n Note that the script injection may not work if you have custom arguments defined in the terminal profile, have enabled {1}, have a [complex bash `PROMPT_COMMAND`](https://code.visualstudio.com/docs/editor/integrated-terminal#_complex-bash-promptcommand), or other unsupported setup. To disable decorations, see {0}", '`#terminal.integrated.shellIntegration.decorationsEnabled#`', '`#editor.accessibilitySupport#`'),
            type: 'boolean',
            default: true
        },
        ["terminal.integrated.shellIntegration.decorationsEnabled" /* TerminalSettingId.ShellIntegrationDecorationsEnabled */]: {
            restricted: true,
            markdownDescription: localize('terminal.integrated.shellIntegration.decorationsEnabled', "When shell integration is enabled, adds a decoration for each command."),
            type: 'string',
            enum: ['both', 'gutter', 'overviewRuler', 'never'],
            enumDescriptions: [
                localize('terminal.integrated.shellIntegration.decorationsEnabled.both', "Show decorations in the gutter (left) and overview ruler (right)"),
                localize('terminal.integrated.shellIntegration.decorationsEnabled.gutter', "Show gutter decorations to the left of the terminal"),
                localize('terminal.integrated.shellIntegration.decorationsEnabled.overviewRuler', "Show overview ruler decorations to the right of the terminal"),
                localize('terminal.integrated.shellIntegration.decorationsEnabled.never', "Do not show decorations"),
            ],
            default: 'both'
        },
        ["terminal.integrated.shellIntegration.environmentReporting" /* TerminalSettingId.ShellIntegrationEnvironmentReporting */]: {
            markdownDescription: localize('terminal.integrated.shellIntegration.environmentReporting', "Controls whether to report the shell environment, enabling its use in features such as {0}. This may cause a slowdown when printing your shell's prompt.", `\`#${"terminal.integrated.suggest.enabled" /* TerminalContribSettingId.SuggestEnabled */}#\``),
            type: 'boolean',
            default: product.quality !== 'stable'
        },
        ["terminal.integrated.smoothScrolling" /* TerminalSettingId.SmoothScrolling */]: {
            markdownDescription: localize('terminal.integrated.smoothScrolling', "Controls whether the terminal will scroll using an animation."),
            type: 'boolean',
            default: false
        },
        ["terminal.integrated.ignoreBracketedPasteMode" /* TerminalSettingId.IgnoreBracketedPasteMode */]: {
            markdownDescription: localize('terminal.integrated.ignoreBracketedPasteMode', "Controls whether the terminal will ignore bracketed paste mode even if the terminal was put into the mode, omitting the {0} and {1} sequences when pasting. This is useful when the shell is not respecting the mode which can happen in sub-shells for example.", '`\\x1b[200~`', '`\\x1b[201~`'),
            type: 'boolean',
            default: false
        },
        ["terminal.integrated.enableImages" /* TerminalSettingId.EnableImages */]: {
            restricted: true,
            markdownDescription: localize('terminal.integrated.enableImages', "Enables image support in the terminal, this will only work when {0} is enabled. Both sixel and iTerm's inline image protocol are supported on Linux and macOS. This will only work on Windows for versions of ConPTY >= v2 which is shipped with Windows itself, see also {1}. Images will currently not be restored between window reloads/reconnects.", `\`#${"terminal.integrated.gpuAcceleration" /* TerminalSettingId.GpuAcceleration */}#\``, `\`#${"terminal.integrated.windowsUseConptyDll" /* TerminalSettingId.WindowsUseConptyDll */}#\``),
            type: 'boolean',
            default: false
        },
        ["terminal.integrated.focusAfterRun" /* TerminalSettingId.FocusAfterRun */]: {
            markdownDescription: localize('terminal.integrated.focusAfterRun', "Controls whether the terminal, accessible buffer, or neither will be focused after `Terminal: Run Selected Text In Active Terminal` has been run."),
            enum: ['terminal', 'accessible-buffer', 'none'],
            default: 'none',
            tags: ['accessibility'],
            markdownEnumDescriptions: [
                localize('terminal.integrated.focusAfterRun.terminal', "Always focus the terminal."),
                localize('terminal.integrated.focusAfterRun.accessible-buffer', "Always focus the accessible buffer."),
                localize('terminal.integrated.focusAfterRun.none', "Do nothing."),
            ]
        },
        ...terminalContribConfiguration,
    }
};
export async function registerTerminalConfiguration(getFontSnippets) {
    const configurationRegistry = Registry.as(Extensions.Configuration);
    configurationRegistry.registerConfiguration(terminalConfiguration);
    const fontsSnippets = await getFontSnippets();
    if (terminalConfiguration.properties) {
        terminalConfiguration.properties["terminal.integrated.fontFamily" /* TerminalSettingId.FontFamily */].defaultSnippets = fontsSnippets;
    }
}
Registry.as(WorkbenchExtensions.ConfigurationMigration)
    .registerConfigurationMigrations([{
        key: "terminal.integrated.enableBell" /* TerminalSettingId.EnableBell */,
        migrateFn: (enableBell, accessor) => {
            const configurationKeyValuePairs = [];
            let announcement = accessor('accessibility.signals.terminalBell')?.announcement ?? accessor('accessibility.alert.terminalBell');
            if (announcement !== undefined && typeof announcement !== 'string') {
                announcement = announcement ? 'auto' : 'off';
            }
            configurationKeyValuePairs.push(['accessibility.signals.terminalBell', { value: { sound: enableBell ? 'on' : 'off', announcement } }]);
            configurationKeyValuePairs.push(["terminal.integrated.enableBell" /* TerminalSettingId.EnableBell */, { value: undefined }]);
            configurationKeyValuePairs.push(["terminal.integrated.enableVisualBell" /* TerminalSettingId.EnableVisualBell */, { value: enableBell }]);
            return configurationKeyValuePairs;
        }
    }]);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxDb25maWd1cmF0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsL2NvbW1vbi90ZXJtaW5hbENvbmZpZ3VyYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRTlELE9BQU8sRUFBRSxXQUFXLEVBQUUsU0FBUyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDN0UsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sRUFBc0IsVUFBVSxFQUE4QyxNQUFNLG9FQUFvRSxDQUFDO0FBQ2hLLE9BQU8sT0FBTyxNQUFNLGdEQUFnRCxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUU1RSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx1RUFBdUUsQ0FBQztBQUNoSSxPQUFPLEVBQStELFVBQVUsSUFBSSxtQkFBbUIsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xKLE9BQU8sRUFBRSw0QkFBNEIsRUFBNEIsTUFBTSw4QkFBOEIsQ0FBQztBQUN0RyxPQUFPLEVBQUUsOEJBQThCLEVBQUUsc0JBQXNCLEVBQUUsbUJBQW1CLEVBQUUsbUJBQW1CLEVBQUUsbUJBQW1CLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFFL0ssTUFBTSxtQkFBbUIsR0FBRyxNQUFNLEdBQUc7SUFDcEMsYUFBYSxHQUFHLFFBQVEsQ0FBQyxLQUFLLEVBQUUsMkNBQTJDLENBQUM7SUFDNUUsbUJBQW1CLEdBQUcsUUFBUSxDQUFDLFdBQVcsRUFBRSxtUEFBbVAsQ0FBQztJQUNoUyx5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