/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isLinux } from '../../../../base/common/platform.js';
import * as nls from '../../../../nls.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { defaultTerminalContribCommandsToSkipShell } from '../terminalContribExports.js';
export const TERMINAL_VIEW_ID = 'terminal';
export const TERMINAL_CREATION_COMMANDS = ['workbench.action.terminal.toggleTerminal', 'workbench.action.terminal.new', 'workbench.action.togglePanel', 'workbench.action.terminal.focus'];
export const TERMINAL_CONFIG_SECTION = 'terminal.integrated';
export const DEFAULT_LETTER_SPACING = 0;
export const MINIMUM_LETTER_SPACING = -5;
// HACK: On Linux it's common for fonts to include an underline that is rendered lower than the
// bottom of the cell which causes it to be cut off due to `overflow:hidden` in the DOM renderer.
// See:
// - https://github.com/microsoft/vscode/issues/211933
// - https://github.com/xtermjs/xterm.js/issues/4067
export const DEFAULT_LINE_HEIGHT = isLinux ? 1.1 : 1;
export const MINIMUM_FONT_WEIGHT = 1;
export const MAXIMUM_FONT_WEIGHT = 1000;
export const DEFAULT_FONT_WEIGHT = 'normal';
export const DEFAULT_BOLD_FONT_WEIGHT = 'bold';
export const SUGGESTIONS_FONT_WEIGHT = ['normal', 'bold', '100', '200', '300', '400', '500', '600', '700', '800', '900'];
export const ITerminalProfileResolverService = createDecorator('terminalProfileResolverService');
/*
 * When there were shell integration args injected
 * and createProcess returns an error, this exit code will be used.
 */
export const ShellIntegrationExitCode = 633;
export const ITerminalProfileService = createDecorator('terminalProfileService');
export const isTerminalProcessManager = (t) => typeof t.write === 'function';
export var ProcessState;
(function (ProcessState) {
    // The process has not been initialized yet.
    ProcessState[ProcessState["Uninitialized"] = 1] = "Uninitialized";
    // The process is currently launching, the process is marked as launching
    // for a short duration after being created and is helpful to indicate
    // whether the process died as a result of bad shell and args.
    ProcessState[ProcessState["Launching"] = 2] = "Launching";
    // The process is running normally.
    ProcessState[ProcessState["Running"] = 3] = "Running";
    // The process was killed during launch, likely as a result of bad shell and
    // args.
    ProcessState[ProcessState["KilledDuringLaunch"] = 4] = "KilledDuringLaunch";
    // The process was killed by the user (the event originated from VS Code).
    ProcessState[ProcessState["KilledByUser"] = 5] = "KilledByUser";
    // The process was killed by itself, for example the shell crashed or `exit`
    // was run.
    ProcessState[ProcessState["KilledByProcess"] = 6] = "KilledByProcess";
})(ProcessState || (ProcessState = {}));
export const QUICK_LAUNCH_PROFILE_CHOICE = 'workbench.action.terminal.profile.choice';
export var TerminalCommandId;
(function (TerminalCommandId) {
    TerminalCommandId["Toggle"] = "workbench.action.terminal.toggleTerminal";
    TerminalCommandId["Kill"] = "workbench.action.terminal.kill";
    TerminalCommandId["KillViewOrEditor"] = "workbench.action.terminal.killViewOrEditor";
    TerminalCommandId["KillEditor"] = "workbench.action.terminal.killEditor";
    TerminalCommandId["KillActiveTab"] = "workbench.action.terminal.killActiveTab";
    TerminalCommandId["KillAll"] = "workbench.action.terminal.killAll";
    TerminalCommandId["QuickKill"] = "workbench.action.terminal.quickKill";
    TerminalCommandId["ConfigureTerminalSettings"] = "workbench.action.terminal.openSettings";
    TerminalCommandId["ShellIntegrationLearnMore"] = "workbench.action.terminal.learnMore";
    TerminalCommandId["CopyLastCommand"] = "workbench.action.terminal.copyLastCommand";
    TerminalCommandId["CopyLastCommandOutput"] = "workbench.action.terminal.copyLastCommandOutput";
    TerminalCommandId["CopyLastCommandAndLastCommandOutput"] = "workbench.action.terminal.copyLastCommandAndLastCommandOutput";
    TerminalCommandId["CopyAndClearSelection"] = "workbench.action.terminal.copyAndClearSelection";
    TerminalCommandId["CopySelection"] = "workbench.action.terminal.copySelection";
    TerminalCommandId["CopySelectionAsHtml"] = "workbench.action.terminal.copySelectionAsHtml";
    TerminalCommandId["SelectAll"] = "workbench.action.terminal.selectAll";
    TerminalCommandId["DeleteWordLeft"] = "workbench.action.terminal.deleteWordLeft";
    TerminalCommandId["DeleteWordRight"] = "workbench.action.terminal.deleteWordRight";
    TerminalCommandId["DeleteToLineStart"] = "workbench.action.terminal.deleteToLineStart";
    TerminalCommandId["MoveToLineStart"] = "workbench.action.terminal.moveToLineStart";
    TerminalCommandId["MoveToLineEnd"] = "workbench.action.terminal.moveToLineEnd";
    TerminalCommandId["New"] = "workbench.action.terminal.new";
    TerminalCommandId["NewWithCwd"] = "workbench.action.terminal.newWithCwd";
    TerminalCommandId["NewLocal"] = "workbench.action.terminal.newLocal";
    TerminalCommandId["NewInActiveWorkspace"] = "workbench.action.terminal.newInActiveWorkspace";
    TerminalCommandId["NewWithProfile"] = "workbench.action.terminal.newWithProfile";
    TerminalCommandId["Split"] = "workbench.action.terminal.split";
    TerminalCommandId["SplitActiveTab"] = "workbench.action.terminal.splitActiveTab";
    TerminalCommandId["SplitInActiveWorkspace"] = "workbench.action.terminal.splitInActiveWorkspace";
    TerminalCommandId["Unsplit"] = "workbench.action.terminal.unsplit";
    TerminalCommandId["JoinActiveTab"] = "workbench.action.terminal.joinActiveTab";
    TerminalCommandId["Join"] = "workbench.action.terminal.join";
    TerminalCommandId["Relaunch"] = "workbench.action.terminal.relaunch";
    TerminalCommandId["FocusPreviousPane"] = "workbench.action.terminal.focusPreviousPane";
    TerminalCommandId["CreateTerminalEditor"] = "workbench.action.createTerminalEditor";
    TerminalCommandId["CreateTerminalEditorSameGroup"] = "workbench.action.createTerminalEditorSameGroup";
    TerminalCommandId["CreateTerminalEditorSide"] = "workbench.action.createTerminalEditorSide";
    TerminalCommandId["FocusTabs"] = "workbench.action.terminal.focusTabs";
    TerminalCommandId["FocusNextPane"] = "workbench.action.terminal.focusNextPane";
    TerminalCommandId["ResizePaneLeft"] = "workbench.action.terminal.resizePaneLeft";
    TerminalCommandId["ResizePaneRight"] = "workbench.action.terminal.resizePaneRight";
    TerminalCommandId["ResizePaneUp"] = "workbench.action.terminal.resizePaneUp";
    TerminalCommandId["SizeToContentWidth"] = "workbench.action.terminal.sizeToContentWidth";
    TerminalCommandId["SizeToContentWidthActiveTab"] = "workbench.action.terminal.sizeToContentWidthActiveTab";
    TerminalCommandId["ResizePaneDown"] = "workbench.action.terminal.resizePaneDown";
    TerminalCommandId["Focus"] = "workbench.action.terminal.focus";
    TerminalCommandId["FocusNext"] = "workbench.action.terminal.focusNext";
    TerminalCommandId["FocusPrevious"] = "workbench.action.terminal.focusPrevious";
    TerminalCommandId["Paste"] = "workbench.action.terminal.paste";
    TerminalCommandId["PasteSelection"] = "workbench.action.terminal.pasteSelection";
    TerminalCommandId["SelectDefaultProfile"] = "workbench.action.terminal.selectDefaultShell";
    TerminalCommandId["RunSelectedText"] = "workbench.action.terminal.runSelectedText";
    TerminalCommandId["RunActiveFile"] = "workbench.action.terminal.runActiveFile";
    TerminalCommandId["SwitchTerminal"] = "workbench.action.terminal.switchTerminal";
    TerminalCommandId["ScrollDownLine"] = "workbench.action.terminal.scrollDown";
    TerminalCommandId["ScrollDownPage"] = "workbench.action.terminal.scrollDownPage";
    TerminalCommandId["ScrollToBottom"] = "workbench.action.terminal.scrollToBottom";
    TerminalCommandId["ScrollUpLine"] = "workbench.action.terminal.scrollUp";
    TerminalCommandId["ScrollUpPage"] = "workbench.action.terminal.scrollUpPage";
    TerminalCommandId["ScrollToTop"] = "workbench.action.terminal.scrollToTop";
    TerminalCommandId["Clear"] = "workbench.action.terminal.clear";
    TerminalCommandId["ClearSelection"] = "workbench.action.terminal.clearSelection";
    TerminalCommandId["ChangeIcon"] = "workbench.action.terminal.changeIcon";
    TerminalCommandId["ChangeIconActiveTab"] = "workbench.action.terminal.changeIconActiveTab";
    TerminalCommandId["ChangeColor"] = "workbench.action.terminal.changeColor";
    TerminalCommandId["ChangeColorActiveTab"] = "workbench.action.terminal.changeColorActiveTab";
    TerminalCommandId["Rename"] = "workbench.action.terminal.rename";
    TerminalCommandId["RenameActiveTab"] = "workbench.action.terminal.renameActiveTab";
    TerminalCommandId["RenameWithArgs"] = "workbench.action.terminal.renameWithArg";
    TerminalCommandId["ScrollToPreviousCommand"] = "workbench.action.terminal.scrollToPreviousCommand";
    TerminalCommandId["ScrollToNextCommand"] = "workbench.action.terminal.scrollToNextCommand";
    TerminalCommandId["SelectToPreviousCommand"] = "workbench.action.terminal.selectToPreviousCommand";
    TerminalCommandId["SelectToNextCommand"] = "workbench.action.terminal.selectToNextCommand";
    TerminalCommandId["SelectToPreviousLine"] = "workbench.action.terminal.selectToPreviousLine";
    TerminalCommandId["SelectToNextLine"] = "workbench.action.terminal.selectToNextLine";
    TerminalCommandId["SendSequence"] = "workbench.action.terminal.sendSequence";
    TerminalCommandId["AttachToSession"] = "workbench.action.terminal.attachToSession";
    TerminalCommandId["DetachSession"] = "workbench.action.terminal.detachSession";
    TerminalCommandId["MoveToEditor"] = "workbench.action.terminal.moveToEditor";
    TerminalCommandId["MoveToTerminalPanel"] = "workbench.action.terminal.moveToTerminalPanel";
    TerminalCommandId["MoveIntoNewWindow"] = "workbench.action.terminal.moveIntoNewWindow";
    TerminalCommandId["SetDimensions"] = "workbench.action.terminal.setDimensions";
    TerminalCommandId["FocusHover"] = "workbench.action.terminal.focusHover";
    TerminalCommandId["ShowEnvironmentContributions"] = "workbench.action.terminal.showEnvironmentContributions";
    TerminalCommandId["StartVoice"] = "workbench.action.terminal.startVoice";
    TerminalCommandId["StopVoice"] = "workbench.action.terminal.stopVoice";
})(TerminalCommandId || (TerminalCommandId = {}));
export const DEFAULT_COMMANDS_TO_SKIP_SHELL = [
    "workbench.action.terminal.clearSelection" /* TerminalCommandId.ClearSelection */,
    "workbench.action.terminal.clear" /* TerminalCommandId.Clear */,
    "workbench.action.terminal.copyAndClearSelection" /* TerminalCommandId.CopyAndClearSelection */,
    "workbench.action.terminal.copySelection" /* TerminalCommandId.CopySelection */,
    "workbench.action.terminal.copySelectionAsHtml" /* TerminalCommandId.CopySelectionAsHtml */,
    "workbench.action.terminal.copyLastCommand" /* TerminalCommandId.CopyLastCommand */,
    "workbench.action.terminal.copyLastCommandOutput" /* TerminalCommandId.CopyLastCommandOutput */,
    "workbench.action.terminal.copyLastCommandAndLastCommandOutput" /* TerminalCommandId.CopyLastCommandAndLastCommandOutput */,
    "workbench.action.terminal.deleteToLineStart" /* TerminalCommandId.DeleteToLineStart */,
    "workbench.action.terminal.deleteWordLeft" /* TerminalCommandId.DeleteWordLeft */,
    "workbench.action.terminal.deleteWordRight" /* TerminalCommandId.DeleteWordRight */,
    "workbench.action.terminal.focusNextPane" /* TerminalCommandId.FocusNextPane */,
    "workbench.action.terminal.focusNext" /* TerminalCommandId.FocusNext */,
    "workbench.action.terminal.focusPreviousPane" /* TerminalCommandId.FocusPreviousPane */,
    "workbench.action.terminal.focusPrevious" /* TerminalCommandId.FocusPrevious */,
    "workbench.action.terminal.focus" /* TerminalCommandId.Focus */,
    "workbench.action.terminal.sizeToContentWidth" /* TerminalCommandId.SizeToContentWidth */,
    "workbench.action.terminal.kill" /* TerminalCommandId.Kill */,
    "workbench.action.terminal.killEditor" /* TerminalCommandId.KillEditor */,
    "workbench.action.terminal.moveToEditor" /* TerminalCommandId.MoveToEditor */,
    "workbench.action.terminal.moveToLineEnd" /* TerminalCommandId.MoveToLineEnd */,
    "workbench.action.terminal.moveToLineStart" /* TerminalCommandId.MoveToLineStart */,
    "workbench.action.terminal.moveToTerminalPanel" /* TerminalCommandId.MoveToTerminalPanel */,
    "workbench.action.terminal.newInActiveWorkspace" /* TerminalCommandId.NewInActiveWorkspace */,
    "workbench.action.terminal.new" /* TerminalCommandId.New */,
    "workbench.action.terminal.paste" /* TerminalCommandId.Paste */,
    "workbench.action.terminal.pasteSelection" /* TerminalCommandId.PasteSelection */,
    "workbench.action.terminal.resizePaneDown" /* TerminalCommandId.ResizePaneDown */,
    "workbench.action.terminal.resizePaneLeft" /* TerminalCommandId.ResizePaneLeft */,
    "workbench.action.terminal.resizePaneRight" /* TerminalCommandId.ResizePaneRight */,
    "workbench.action.terminal.resizePaneUp" /* TerminalCommandId.ResizePaneUp */,
    "workbench.action.terminal.runActiveFile" /* TerminalCommandId.RunActiveFile */,
    "workbench.action.terminal.runSelectedText" /* TerminalCommandId.RunSelectedText */,
    "workbench.action.terminal.scrollDown" /* TerminalCommandId.ScrollDownLine */,
    "workbench.action.terminal.scrollDownPage" /* TerminalCommandId.ScrollDownPage */,
    "workbench.action.terminal.scrollToBottom" /* TerminalCommandId.ScrollToBottom */,
    "workbench.action.terminal.scrollToNextCommand" /* TerminalCommandId.ScrollToNextCommand */,
    "workbench.action.terminal.scrollToPreviousCommand" /* TerminalCommandId.ScrollToPreviousCommand */,
    "workbench.action.terminal.scrollToTop" /* TerminalCommandId.ScrollToTop */,
    "workbench.action.terminal.scrollUp" /* TerminalCommandId.ScrollUpLine */,
    "workbench.action.terminal.scrollUpPage" /* TerminalCommandId.ScrollUpPage */,
    "workbench.action.terminal.sendSequence" /* TerminalCommandId.SendSequence */,
    "workbench.action.terminal.selectAll" /* TerminalCommandId.SelectAll */,
    "workbench.action.terminal.selectToNextCommand" /* TerminalCommandId.SelectToNextCommand */,
    "workbench.action.terminal.selectToNextLine" /* TerminalCommandId.SelectToNextLine */,
    "workbench.action.terminal.selectToPreviousCommand" /* TerminalCommandId.SelectToPreviousCommand */,
    "workbench.action.terminal.selectToPreviousLine" /* TerminalCommandId.SelectToPreviousLine */,
    "workbench.action.terminal.splitInActiveWorkspace" /* TerminalCommandId.SplitInActiveWorkspace */,
    "workbench.action.terminal.split" /* TerminalCommandId.Split */,
    "workbench.action.terminal.toggleTerminal" /* TerminalCommandId.Toggle */,
    "workbench.action.terminal.focusHover" /* TerminalCommandId.FocusHover */,
    "editor.action.accessibilityHelp" /* AccessibilityCommandId.OpenAccessibilityHelp */,
    'workbench.action.tasks.rerunForActiveTerminal',
    'editor.action.toggleTabFocusMode',
    'notifications.hideList',
    'notifications.hideToasts',
    'workbench.action.closeQuickOpen',
    'workbench.action.quickOpen',
    'workbench.action.quickOpenPreviousEditor',
    'workbench.action.showCommands',
    'workbench.action.tasks.build',
    'workbench.action.tasks.restartTask',
    'workbench.action.tasks.runTask',
    'workbench.action.tasks.reRunTask',
    'workbench.action.tasks.showLog',
    'workbench.action.tasks.showTasks',
    'workbench.action.tasks.terminate',
    'workbench.action.tasks.test',
    'workbench.action.toggleFullScreen',
    'workbench.action.terminal.focusAtIndex1',
    'workbench.action.terminal.focusAtIndex2',
    'workbench.action.terminal.focusAtIndex3',
    'workbench.action.terminal.focusAtIndex4',
    'workbench.action.terminal.focusAtIndex5',
    'workbench.action.terminal.focusAtIndex6',
    'workbench.action.terminal.focusAtIndex7',
    'workbench.action.terminal.focusAtIndex8',
    'workbench.action.terminal.focusAtIndex9',
    'workbench.action.focusSecondEditorGroup',
    'workbench.action.focusThirdEditorGroup',
    'workbench.action.focusFourthEditorGroup',
    'workbench.action.focusFifthEditorGroup',
    'workbench.action.focusSixthEditorGroup',
    'workbench.action.focusSeventhEditorGroup',
    'workbench.action.focusEighthEditorGroup',
    'workbench.action.focusNextPart',
    'workbench.action.focusPreviousPart',
    'workbench.action.nextPanelView',
    'workbench.action.previousPanelView',
    'workbench.action.nextSideBarView',
    'workbench.action.previousSideBarView',
    'workbench.action.debug.disconnect',
    'workbench.action.debug.start',
    'workbench.action.debug.stop',
    'workbench.action.debug.run',
    'workbench.action.debug.restart',
    'workbench.action.debug.continue',
    'workbench.action.debug.pause',
    'workbench.action.debug.stepInto',
    'workbench.action.debug.stepOut',
    'workbench.action.debug.stepOver',
    'workbench.action.nextEditor',
    'workbench.action.previousEditor',
    'workbench.action.nextEditorInGroup',
    'workbench.action.previousEditorInGroup',
    'workbench.action.openNextRecentlyUsedEditor',
    'workbench.action.openPreviousRecentlyUsedEditor',
    'workbench.action.openNextRecentlyUsedEditorInGroup',
    'workbench.action.openPreviousRecentlyUsedEditorInGroup',
    'workbench.action.quickOpenPreviousRecentlyUsedEditor',
    'workbench.action.quickOpenLeastRecentlyUsedEditor',
    'workbench.action.quickOpenPreviousRecentlyUsedEditorInGroup',
    'workbench.action.quickOpenLeastRecentlyUsedEditorInGroup',
    'workbench.action.focusActiveEditorGroup',
    'workbench.action.focusFirstEditorGroup',
    'workbench.action.focusLastEditorGroup',
    'workbench.action.firstEditorInGroup',
    'workbench.action.lastEditorInGroup',
    'workbench.action.navigateUp',
    'workbench.action.navigateDown',
    'workbench.action.navigateRight',
    'workbench.action.navigateLeft',
    'workbench.action.togglePanel',
    'workbench.action.quickOpenView',
    'workbench.action.toggleMaximizedPanel',
    'notification.acceptPrimaryAction',
    'runCommands',
    'workbench.action.terminal.chat.start',
    'workbench.action.terminal.chat.close',
    'workbench.action.terminal.chat.discard',
    'workbench.action.terminal.chat.makeRequest',
    'workbench.action.terminal.chat.cancel',
    'workbench.action.terminal.chat.feedbackHelpful',
    'workbench.action.terminal.chat.feedbackUnhelpful',
    'workbench.action.terminal.chat.feedbackReportIssue',
    'workbench.action.terminal.chat.runCommand',
    'workbench.action.terminal.chat.insertCommand',
    'workbench.action.terminal.chat.viewInChat',
    ...defaultTerminalContribCommandsToSkipShell,
];
export const terminalContributionsDescriptor = {
    extensionPoint: 'terminal',
    defaultExtensionKind: ['workspace'],
    activationEventsGenerator: (contribs, result) => {
        for (const contrib of contribs) {
            for (const profileContrib of (contrib.profiles ?? [])) {
                result.push(`onTerminalProfile:${profileContrib.id}`);
            }
        }
    },
    jsonSchema: {
        description: nls.localize('vscode.extension.contributes.terminal', 'Contributes terminal functionality.'),
        type: 'object',
        properties: {
            profiles: {
                type: 'array',
                description: nls.localize('vscode.extension.contributes.terminal.profiles', "Defines additional terminal profiles that the user can create."),
                items: {
                    type: 'object',
                    required: ['id', 'title'],
                    defaultSnippets: [{
                            body: {
                                id: '$1',
                                title: '$2'
                            }
                        }],
                    properties: {
                        id: {
                            description: nls.localize('vscode.extension.contributes.terminal.profiles.id', "The ID of the terminal profile provider."),
                            type: 'string',
                        },
                        title: {
                            description: nls.localize('vscode.extension.contributes.terminal.profiles.title', "Title for this terminal profile."),
                            type: 'string',
                        },
                        icon: {
                            description: nls.localize('vscode.extension.contributes.terminal.types.icon', "A codicon, URI, or light and dark URIs to associate with this terminal type."),
                            anyOf: [{
                                    type: 'string',
                                },
                                {
                                    type: 'object',
                                    properties: {
                                        light: {
                                            description: nls.localize('vscode.extension.contributes.terminal.types.icon.light', 'Icon path when a light theme is used'),
                                            type: 'string'
                                        },
                                        dark: {
                                            description: nls.localize('vscode.extension.contributes.terminal.types.icon.dark', 'Icon path when a dark theme is used'),
                                            type: 'string'
                                        }
                                    }
                                }]
                        },
                    },
                },
            },
        },
    },
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWwvY29tbW9uL3Rlcm1pbmFsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBS2hHLE9BQU8sRUFBdUIsT0FBTyxFQUFtQixNQUFNLHFDQUFxQyxDQUFDO0FBSXBHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUM7QUFDMUMsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBTzdGLE9BQU8sRUFBRSx5Q0FBeUMsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBRXpGLE1BQU0sQ0FBQyxNQUFNLGdCQUFnQixHQUFHLFVBQVUsQ0FBQztBQUUzQyxNQUFNLENBQUMsTUFBTSwwQkFBMEIsR0FBRyxDQUFDLDBDQUEwQyxFQUFFLCtCQUErQixFQUFFLDhCQUE4QixFQUFFLGlDQUFpQyxDQUFDLENBQUM7QUFFM0wsTUFBTSxDQUFDLE1BQU0sdUJBQXVCLEdBQUcscUJBQXFCLENBQUM7QUFFN0QsTUFBTSxDQUFDLE1BQU0sc0JBQXNCLEdBQUcsQ0FBQyxDQUFDO0FBQ3hDLE1BQU0sQ0FBQyxNQUFNLHNCQUFzQixHQUFHLENBQUMsQ0FBQyxDQUFDO0FBQ3pDLCtGQUErRjtBQUMvRixpR0FBaUc7QUFDakcsT0FBTztBQUNQLHNEQUFzRDtBQUN0RCxvREFBb0Q7QUFDcEQsTUFBTSxDQUFDLE1BQU0sbUJBQW1CLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUVyRCxNQUFNLENBQUMsTUFBTSxtQkFBbUIsR0FBRyxDQUFDLENBQUM7QUFDckMsTUFBTSxDQUFDLE1BQU0sbUJBQW1CLEdBQUcsSUFBSSxDQUFDO0FBQ3hDLE1BQU0sQ0FBQyxNQUFNLG1CQUFtQixHQUFHLFFBQVEsQ0FBQztBQUM1QyxNQUFNLENBQUMsTUFBTSx3QkFBd0IsR0FBRyxNQUFNLENBQUM7QUFDL0MsTUFBTSxDQUFDLE1BQU0sdUJBQXVCLEdBQUcsQ0FBQyxRQUFRLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUM7QUFFekgsTUFBTSxDQUFDLE1BQU0sK0JBQStCLEdBQUcsZUFBZSxDQUFrQyxnQ0FBZ0MsQ0FBQyxDQUFDO0FBa0JsSTs7O0dBR0c7QUFDSCxNQUFNLENBQUMsTUFBTSx3QkFBd0IsR0FBRyxHQUFHLENBQUM7QUFNNUMsTUFBTSxDQUFDLE1BQU0sdUJBQXVCLEdBQUcsZUFBZSxDQUEwQix3QkFBd0IsQ0FBQyxDQUFDO0FBNk0xRyxNQUFNLENBQUMsTUFBTSx3QkFBd0IsR0FBRyxDQUFDLENBQWlELEVBQWdDLEVBQUUsQ0FBQyxPQUFRLENBQTZCLENBQUMsS0FBSyxLQUFLLFVBQVUsQ0FBQztBQW9DeEwsTUFBTSxDQUFOLElBQWtCLFlBaUJqQjtBQWpCRCxXQUFrQixZQUFZO0lBQzdCLDRDQUE0QztJQUM1QyxpRUFBaUIsQ0FBQTtJQUNqQix5RUFBeUU7SUFDekUsc0VBQXNFO0lBQ3RFLDhEQUE4RDtJQUM5RCx5REFBYSxDQUFBO0lBQ2IsbUNBQW1DO0lBQ25DLHFEQUFXLENBQUE7SUFDWCw0RUFBNEU7SUFDNUUsUUFBUTtJQUNSLDJFQUFzQixDQUFBO0lBQ3RCLDBFQUEwRTtJQUMxRSwrREFBZ0IsQ0FBQTtJQUNoQiw0RUFBNEU7SUFDNUUsV0FBVztJQUNYLHFFQUFtQixDQUFBO0FBQ3BCLENBQUMsRUFqQmlCLFlBQVksS0FBWixZQUFZLFFBaUI3QjtBQW1FRCxNQUFNLENBQUMsTUFBTSwyQkFBMkIsR0FBRywwQ0FBMEMsQ0FBQztBQUV0RixNQUFNLENBQU4sSUFBa0IsaUJBdUZqQjtBQXZGRCxXQUFrQixpQkFBaUI7SUFDbEMsd0VBQW1ELENBQUE7SUFDbkQsNERBQXVDLENBQUE7SUFDdkMsb0ZBQStELENBQUE7SUFDL0Qsd0VBQW1ELENBQUE7SUFDbkQsOEVBQXlELENBQUE7SUFDekQsa0VBQTZDLENBQUE7SUFDN0Msc0VBQWlELENBQUE7SUFDakQseUZBQW9FLENBQUE7SUFDcEUsc0ZBQWlFLENBQUE7SUFDakUsa0ZBQTZELENBQUE7SUFDN0QsOEZBQXlFLENBQUE7SUFDekUsMEhBQXFHLENBQUE7SUFDckcsOEZBQXlFLENBQUE7SUFDekUsOEVBQXlELENBQUE7SUFDekQsMEZBQXFFLENBQUE7SUFDckUsc0VBQWlELENBQUE7SUFDakQsZ0ZBQTJELENBQUE7SUFDM0Qsa0ZBQTZELENBQUE7SUFDN0Qsc0ZBQWlFLENBQUE7SUFDakUsa0ZBQTZELENBQUE7SUFDN0QsOEVBQXlELENBQUE7SUFDekQsMERBQXFDLENBQUE7SUFDckMsd0VBQW1ELENBQUE7SUFDbkQsb0VBQStDLENBQUE7SUFDL0MsNEZBQXVFLENBQUE7SUFDdkUsZ0ZBQTJELENBQUE7SUFDM0QsOERBQXlDLENBQUE7SUFDekMsZ0ZBQTJELENBQUE7SUFDM0QsZ0dBQTJFLENBQUE7SUFDM0Usa0VBQTZDLENBQUE7SUFDN0MsOEVBQXlELENBQUE7SUFDekQsNERBQXVDLENBQUE7SUFDdkMsb0VBQStDLENBQUE7SUFDL0Msc0ZBQWlFLENBQUE7SUFDakUsbUZBQThELENBQUE7SUFDOUQscUdBQWdGLENBQUE7SUFDaEYsMkZBQXNFLENBQUE7SUFDdEUsc0VBQWlELENBQUE7SUFDakQsOEVBQXlELENBQUE7SUFDekQsZ0ZBQTJELENBQUE7SUFDM0Qsa0ZBQTZELENBQUE7SUFDN0QsNEVBQXVELENBQUE7SUFDdkQsd0ZBQW1FLENBQUE7SUFDbkUsMEdBQXFGLENBQUE7SUFDckYsZ0ZBQTJELENBQUE7SUFDM0QsOERBQXlDLENBQUE7SUFDekMsc0VBQWlELENBQUE7SUFDakQsOEVBQXlELENBQUE7SUFDekQsOERBQXlDLENBQUE7SUFDekMsZ0ZB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