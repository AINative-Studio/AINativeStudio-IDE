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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvdGVzdC9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsL2NvbW1vbi90ZXJtaW5hbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUtoRyxPQUFPLEVBQXVCLE9BQU8sRUFBbUIsTUFBTSxxQ0FBcUMsQ0FBQztBQUlwRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFDO0FBQzFDLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQU83RixPQUFPLEVBQUUseUNBQXlDLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUV6RixNQUFNLENBQUMsTUFBTSxnQkFBZ0IsR0FBRyxVQUFVLENBQUM7QUFFM0MsTUFBTSxDQUFDLE1BQU0sMEJBQTBCLEdBQUcsQ0FBQywwQ0FBMEMsRUFBRSwrQkFBK0IsRUFBRSw4QkFBOEIsRUFBRSxpQ0FBaUMsQ0FBQyxDQUFDO0FBRTNMLE1BQU0sQ0FBQyxNQUFNLHVCQUF1QixHQUFHLHFCQUFxQixDQUFDO0FBRTdELE1BQU0sQ0FBQyxNQUFNLHNCQUFzQixHQUFHLENBQUMsQ0FBQztBQUN4QyxNQUFNLENBQUMsTUFBTSxzQkFBc0IsR0FBRyxDQUFDLENBQUMsQ0FBQztBQUN6QywrRkFBK0Y7QUFDL0YsaUdBQWlHO0FBQ2pHLE9BQU87QUFDUCxzREFBc0Q7QUFDdEQsb0RBQW9EO0FBQ3BELE1BQU0sQ0FBQyxNQUFNLG1CQUFtQixHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFFckQsTUFBTSxDQUFDLE1BQU0sbUJBQW1CLEdBQUcsQ0FBQyxDQUFDO0FBQ3JDLE1BQU0sQ0FBQyxNQUFNLG1CQUFtQixHQUFHLElBQUksQ0FBQztBQUN4QyxNQUFN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