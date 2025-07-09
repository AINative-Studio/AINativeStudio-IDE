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
import { localize } from '../../../../nls.js';
import { Extensions } from '../../../../platform/configuration/common/configurationRegistry.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { workbenchConfigurationNodeBase, Extensions as WorkbenchExtensions } from '../../../common/configuration.js';
import { AccessibilitySignal } from '../../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
import { AccessibilityVoiceSettingId, ISpeechService, SPEECH_LANGUAGES } from '../../speech/common/speechService.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Event } from '../../../../base/common/event.js';
import { isDefined } from '../../../../base/common/types.js';
export const accessibilityHelpIsShown = new RawContextKey('accessibilityHelpIsShown', false, true);
export const accessibleViewIsShown = new RawContextKey('accessibleViewIsShown', false, true);
export const accessibleViewSupportsNavigation = new RawContextKey('accessibleViewSupportsNavigation', false, true);
export const accessibleViewVerbosityEnabled = new RawContextKey('accessibleViewVerbosityEnabled', false, true);
export const accessibleViewGoToSymbolSupported = new RawContextKey('accessibleViewGoToSymbolSupported', false, true);
export const accessibleViewOnLastLine = new RawContextKey('accessibleViewOnLastLine', false, true);
export const accessibleViewCurrentProviderId = new RawContextKey('accessibleViewCurrentProviderId', undefined, undefined);
export const accessibleViewInCodeBlock = new RawContextKey('accessibleViewInCodeBlock', undefined, undefined);
export const accessibleViewContainsCodeBlocks = new RawContextKey('accessibleViewContainsCodeBlocks', undefined, undefined);
export const accessibleViewHasUnassignedKeybindings = new RawContextKey('accessibleViewHasUnassignedKeybindings', undefined, undefined);
export const accessibleViewHasAssignedKeybindings = new RawContextKey('accessibleViewHasAssignedKeybindings', undefined, undefined);
/**
 * Miscellaneous settings tagged with accessibility and implemented in the accessibility contrib but
 * were better to live under workbench for discoverability.
 */
export var AccessibilityWorkbenchSettingId;
(function (AccessibilityWorkbenchSettingId) {
    AccessibilityWorkbenchSettingId["DimUnfocusedEnabled"] = "accessibility.dimUnfocused.enabled";
    AccessibilityWorkbenchSettingId["DimUnfocusedOpacity"] = "accessibility.dimUnfocused.opacity";
    AccessibilityWorkbenchSettingId["HideAccessibleView"] = "accessibility.hideAccessibleView";
    AccessibilityWorkbenchSettingId["AccessibleViewCloseOnKeyPress"] = "accessibility.accessibleView.closeOnKeyPress";
})(AccessibilityWorkbenchSettingId || (AccessibilityWorkbenchSettingId = {}));
export var ViewDimUnfocusedOpacityProperties;
(function (ViewDimUnfocusedOpacityProperties) {
    ViewDimUnfocusedOpacityProperties[ViewDimUnfocusedOpacityProperties["Default"] = 0.75] = "Default";
    ViewDimUnfocusedOpacityProperties[ViewDimUnfocusedOpacityProperties["Minimum"] = 0.2] = "Minimum";
    ViewDimUnfocusedOpacityProperties[ViewDimUnfocusedOpacityProperties["Maximum"] = 1] = "Maximum";
})(ViewDimUnfocusedOpacityProperties || (ViewDimUnfocusedOpacityProperties = {}));
export var AccessibilityVerbositySettingId;
(function (AccessibilityVerbositySettingId) {
    AccessibilityVerbositySettingId["Terminal"] = "accessibility.verbosity.terminal";
    AccessibilityVerbositySettingId["DiffEditor"] = "accessibility.verbosity.diffEditor";
    AccessibilityVerbositySettingId["MergeEditor"] = "accessibility.verbosity.mergeEditor";
    AccessibilityVerbositySettingId["Chat"] = "accessibility.verbosity.panelChat";
    AccessibilityVerbositySettingId["InlineChat"] = "accessibility.verbosity.inlineChat";
    AccessibilityVerbositySettingId["TerminalChat"] = "accessibility.verbosity.terminalChat";
    AccessibilityVerbositySettingId["InlineCompletions"] = "accessibility.verbosity.inlineCompletions";
    AccessibilityVerbositySettingId["KeybindingsEditor"] = "accessibility.verbosity.keybindingsEditor";
    AccessibilityVerbositySettingId["Notebook"] = "accessibility.verbosity.notebook";
    AccessibilityVerbositySettingId["Editor"] = "accessibility.verbosity.editor";
    AccessibilityVerbositySettingId["Hover"] = "accessibility.verbosity.hover";
    AccessibilityVerbositySettingId["Notification"] = "accessibility.verbosity.notification";
    AccessibilityVerbositySettingId["EmptyEditorHint"] = "accessibility.verbosity.emptyEditorHint";
    AccessibilityVerbositySettingId["ReplEditor"] = "accessibility.verbosity.replEditor";
    AccessibilityVerbositySettingId["Comments"] = "accessibility.verbosity.comments";
    AccessibilityVerbositySettingId["DiffEditorActive"] = "accessibility.verbosity.diffEditorActive";
    AccessibilityVerbositySettingId["Debug"] = "accessibility.verbosity.debug";
    AccessibilityVerbositySettingId["Walkthrough"] = "accessibility.verbosity.walkthrough";
    AccessibilityVerbositySettingId["SourceControl"] = "accessibility.verbosity.sourceControl";
})(AccessibilityVerbositySettingId || (AccessibilityVerbositySettingId = {}));
const baseVerbosityProperty = {
    type: 'boolean',
    default: true,
    tags: ['accessibility']
};
export const accessibilityConfigurationNodeBase = Object.freeze({
    id: 'accessibility',
    title: localize('accessibilityConfigurationTitle', "Accessibility"),
    type: 'object'
});
export const soundFeatureBase = {
    'type': 'string',
    'enum': ['auto', 'on', 'off'],
    'default': 'auto',
    'enumDescriptions': [
        localize('sound.enabled.auto', "Enable sound when a screen reader is attached."),
        localize('sound.enabled.on', "Enable sound."),
        localize('sound.enabled.off', "Disable sound.")
    ],
    tags: ['accessibility'],
};
const signalFeatureBase = {
    'type': 'object',
    'tags': ['accessibility'],
    additionalProperties: false,
    default: {
        sound: 'auto',
        announcement: 'auto'
    }
};
export const announcementFeatureBase = {
    'type': 'string',
    'enum': ['auto', 'off'],
    'default': 'auto',
    'enumDescriptions': [
        localize('announcement.enabled.auto', "Enable announcement, will only play when in screen reader optimized mode."),
        localize('announcement.enabled.off', "Disable announcement.")
    ],
    tags: ['accessibility'],
};
const defaultNoAnnouncement = {
    'type': 'object',
    'tags': ['accessibility'],
    additionalProperties: false,
    'default': {
        'sound': 'auto',
    }
};
const configuration = {
    ...accessibilityConfigurationNodeBase,
    scope: 5 /* ConfigurationScope.RESOURCE */,
    properties: {
        ["accessibility.verbosity.terminal" /* AccessibilityVerbositySettingId.Terminal */]: {
            description: localize('verbosity.terminal.description', 'Provide information about how to access the terminal accessibility help menu when the terminal is focused.'),
            ...baseVerbosityProperty
        },
        ["accessibility.verbosity.diffEditor" /* AccessibilityVerbositySettingId.DiffEditor */]: {
            description: localize('verbosity.diffEditor.description', 'Provide information about how to navigate changes in the diff editor when it is focused.'),
            ...baseVerbosityProperty
        },
        ["accessibility.verbosity.panelChat" /* AccessibilityVerbositySettingId.Chat */]: {
            description: localize('verbosity.chat.description', 'Provide information about how to access the chat help menu when the chat input is focused.'),
            ...baseVerbosityProperty
        },
        ["accessibility.verbosity.inlineChat" /* AccessibilityVerbositySettingId.InlineChat */]: {
            description: localize('verbosity.interactiveEditor.description', 'Provide information about how to access the inline editor chat accessibility help menu and alert with hints that describe how to use the feature when the input is focused.'),
            ...baseVerbosityProperty
        },
        ["accessibility.verbosity.inlineCompletions" /* AccessibilityVerbositySettingId.InlineCompletions */]: {
            description: localize('verbosity.inlineCompletions.description', 'Provide information about how to access the inline completions hover and Accessible View.'),
            ...baseVerbosityProperty
        },
        ["accessibility.verbosity.keybindingsEditor" /* AccessibilityVerbositySettingId.KeybindingsEditor */]: {
            description: localize('verbosity.keybindingsEditor.description', 'Provide information about how to change a keybinding in the keybindings editor when a row is focused.'),
            ...baseVerbosityProperty
        },
        ["accessibility.verbosity.notebook" /* AccessibilityVerbositySettingId.Notebook */]: {
            description: localize('verbosity.notebook', 'Provide information about how to focus the cell container or inner editor when a notebook cell is focused.'),
            ...baseVerbosityProperty
        },
        ["accessibility.verbosity.hover" /* AccessibilityVerbositySettingId.Hover */]: {
            description: localize('verbosity.hover', 'Provide information about how to open the hover in an Accessible View.'),
            ...baseVerbosityProperty
        },
        ["accessibility.verbosity.notification" /* AccessibilityVerbositySettingId.Notification */]: {
            description: localize('verbosity.notification', 'Provide information about how to open the notification in an Accessible View.'),
            ...baseVerbosityProperty
        },
        ["accessibility.verbosity.emptyEditorHint" /* AccessibilityVerbositySettingId.EmptyEditorHint */]: {
            description: localize('verbosity.emptyEditorHint', 'Provide information about relevant actions in an empty text editor.'),
            ...baseVerbosityProperty
        },
        ["accessibility.verbosity.replEditor" /* AccessibilityVerbositySettingId.ReplEditor */]: {
            description: localize('verbosity.replEditor.description', 'Provide information about how to access the REPL editor accessibility help menu when the REPL editor is focused.'),
            ...baseVerbosityProperty
        },
        ["accessibility.verbosity.comments" /* AccessibilityVerbositySettingId.Comments */]: {
            description: localize('verbosity.comments', 'Provide information about actions that can be taken in the comment widget or in a file which contains comments.'),
            ...baseVerbosityProperty
        },
        ["accessibility.verbosity.diffEditorActive" /* AccessibilityVerbositySettingId.DiffEditorActive */]: {
            description: localize('verbosity.diffEditorActive', 'Indicate when a diff editor becomes the active editor.'),
            ...baseVerbosityProperty
        },
        ["accessibility.verbosity.debug" /* AccessibilityVerbositySettingId.Debug */]: {
            description: localize('verbosity.debug', 'Provide information about how to access the debug console accessibility help dialog when the debug console or run and debug viewlet is focused. Note that a reload of the window is required for this to take effect.'),
            ...baseVerbosityProperty
        },
        ["accessibility.verbosity.walkthrough" /* AccessibilityVerbositySettingId.Walkthrough */]: {
            description: localize('verbosity.walkthrough', 'Provide information about how to open the walkthrough in an Accessible View.'),
            ...baseVerbosityProperty
        },
        ["accessibility.accessibleView.closeOnKeyPress" /* AccessibilityWorkbenchSettingId.AccessibleViewCloseOnKeyPress */]: {
            markdownDescription: localize('terminal.integrated.accessibleView.closeOnKeyPress', "On keypress, close the Accessible View and focus the element from which it was invoked."),
            type: 'boolean',
            default: true
        },
        ["accessibility.verbosity.sourceControl" /* AccessibilityVerbositySettingId.SourceControl */]: {
            description: localize('verbosity.scm', 'Provide information about how to access the source control accessibility help menu when the input is focused.'),
            ...baseVerbosityProperty
        },
        'accessibility.signalOptions.volume': {
            'description': localize('accessibility.signalOptions.volume', "The volume of the sounds in percent (0-100)."),
            'type': 'number',
            'minimum': 0,
            'maximum': 100,
            'default': 70,
            'tags': ['accessibility']
        },
        'accessibility.signalOptions.debouncePositionChanges': {
            'description': localize('accessibility.signalOptions.debouncePositionChanges', "Whether or not position changes should be debounced"),
            'type': 'boolean',
            'default': false,
            'tags': ['accessibility']
        },
        'accessibility.signalOptions.experimental.delays.general': {
            'type': 'object',
            'description': 'Delays for all signals besides error and warning at position',
            'additionalProperties': false,
            'properties': {
                'announcement': {
                    'description': localize('accessibility.signalOptions.delays.general.announcement', "The delay in milliseconds before an announcement is made."),
                    'type': 'number',
                    'minimum': 0,
                    'default': 3000
                },
                'sound': {
                    'description': localize('accessibility.signalOptions.delays.general.sound', "The delay in milliseconds before a sound is played."),
                    'type': 'number',
                    'minimum': 0,
                    'default': 400
                }
            },
            'tags': ['accessibility']
        },
        'accessibility.signalOptions.experimental.delays.warningAtPosition': {
            'type': 'object',
            'additionalProperties': false,
            'properties': {
                'announcement': {
                    'description': localize('accessibility.signalOptions.delays.warningAtPosition.announcement', "The delay in milliseconds before an announcement is made when there's a warning at the position."),
                    'type': 'number',
                    'minimum': 0,
                    'default': 3000
                },
                'sound': {
                    'description': localize('accessibility.signalOptions.delays.warningAtPosition.sound', "The delay in milliseconds before a sound is played when there's a warning at the position."),
                    'type': 'number',
                    'minimum': 0,
                    'default': 1000
                }
            },
            'tags': ['accessibility']
        },
        'accessibility.signalOptions.experimental.delays.errorAtPosition': {
            'type': 'object',
            'additionalProperties': false,
            'properties': {
                'announcement': {
                    'description': localize('accessibility.signalOptions.delays.errorAtPosition.announcement', "The delay in milliseconds before an announcement is made when there's an error at the position."),
                    'type': 'number',
                    'minimum': 0,
                    'default': 3000
                },
                'sound': {
                    'description': localize('accessibility.signalOptions.delays.errorAtPosition.sound', "The delay in milliseconds before a sound is played when there's an error at the position."),
                    'type': 'number',
                    'minimum': 0,
                    'default': 1000
                }
            },
            'tags': ['accessibility']
        },
        'accessibility.signals.lineHasBreakpoint': {
            ...signalFeatureBase,
            'description': localize('accessibility.signals.lineHasBreakpoint', "Plays a signal - sound (audio cue) and/or announcement (alert) - when the active line has a breakpoint."),
            'properties': {
                'sound': {
                    'description': localize('accessibility.signals.lineHasBreakpoint.sound', "Plays a sound when the active line has a breakpoint."),
                    ...soundFeatureBase
                },
                'announcement': {
                    'description': localize('accessibility.signals.lineHasBreakpoint.announcement', "Announces when the active line has a breakpoint."),
                    ...announcementFeatureBase
                },
            },
        },
        'accessibility.signals.lineHasInlineSuggestion': {
            ...defaultNoAnnouncement,
            'description': localize('accessibility.signals.lineHasInlineSuggestion', "Plays a sound / audio cue when the active line has an inline suggestion."),
            'properties': {
                'sound': {
                    'description': localize('accessibility.signals.lineHasInlineSuggestion.sound', "Plays a sound when the active line has an inline suggestion."),
                    ...soundFeatureBase,
                    'default': 'off'
                }
            }
        },
        'accessibility.signals.lineHasError': {
            ...signalFeatureBase,
            'description': localize('accessibility.signals.lineHasError', "Plays a signal - sound (audio cue) and/or announcement (alert) - when the active line has an error."),
            'properties': {
                'sound': {
                    'description': localize('accessibility.signals.lineHasError.sound', "Plays a sound when the active line has an error."),
                    ...soundFeatureBase
                },
                'announcement': {
                    'description': localize('accessibility.signals.lineHasError.announcement', "Announces when the active line has an error."),
                    ...announcementFeatureBase,
                    default: 'off'
                },
            },
        },
        'accessibility.signals.lineHasFoldedArea': {
            ...signalFeatureBase,
            'description': localize('accessibility.signals.lineHasFoldedArea', "Plays a signal - sound (audio cue) and/or announcement (alert) - the active line has a folded area that can be unfolded."),
            'properties': {
                'sound': {
                    'description': localize('accessibility.signals.lineHasFoldedArea.sound', "Plays a sound when the active line has a folded area that can be unfolded."),
                    ...soundFeatureBase,
                    default: 'off'
                },
                'announcement': {
                    'description': localize('accessibility.signals.lineHasFoldedArea.announcement', "Announces when the active line has a folded area that can be unfolded."),
                    ...announcementFeatureBase
                },
            }
        },
        'accessibility.signals.lineHasWarning': {
            ...signalFeatureBase,
            'description': localize('accessibility.signals.lineHasWarning', "Plays a signal - sound (audio cue) and/or announcement (alert) - when the active line has a warning."),
            'properties': {
                'sound': {
                    'description': localize('accessibility.signals.lineHasWarning.sound', "Plays a sound when the active line has a warning."),
                    ...soundFeatureBase
                },
                'announcement': {
                    'description': localize('accessibility.signals.lineHasWarning.announcement', "Announces when the active line has a warning."),
                    ...announcementFeatureBase,
                    default: 'off'
                },
            },
        },
        'accessibility.signals.positionHasError': {
            ...signalFeatureBase,
            'description': localize('accessibility.signals.positionHasError', "Plays a signal - sound (audio cue) and/or announcement (alert) - when the active line has a warning."),
            'properties': {
                'sound': {
                    'description': localize('accessibility.signals.positionHasError.sound', "Plays a sound when the active line has a warning."),
                    ...soundFeatureBase
                },
                'announcement': {
                    'description': localize('accessibility.signals.positionHasError.announcement', "Announces when the active line has a warning."),
                    ...announcementFeatureBase,
                    default: 'on'
                },
            },
        },
        'accessibility.signals.positionHasWarning': {
            ...signalFeatureBase,
            'description': localize('accessibility.signals.positionHasWarning', "Plays a signal - sound (audio cue) and/or announcement (alert) - when the active line has a warning."),
            'properties': {
                'sound': {
                    'description': localize('accessibility.signals.positionHasWarning.sound', "Plays a sound when the active line has a warning."),
                    ...soundFeatureBase
                },
                'announcement': {
                    'description': localize('accessibility.signals.positionHasWarning.announcement', "Announces when the active line has a warning."),
                    ...announcementFeatureBase,
                    default: 'on'
                },
            },
        },
        'accessibility.signals.onDebugBreak': {
            ...signalFeatureBase,
            'description': localize('accessibility.signals.onDebugBreak', "Plays a signal - sound (audio cue) and/or announcement (alert) - when the debugger stopped on a breakpoint."),
            'properties': {
                'sound': {
                    'description': localize('accessibility.signals.onDebugBreak.sound', "Plays a sound when the debugger stopped on a breakpoint."),
                    ...soundFeatureBase
                },
                'announcement': {
                    'description': localize('accessibility.signals.onDebugBreak.announcement', "Announces when the debugger stopped on a breakpoint."),
                    ...announcementFeatureBase
                },
            }
        },
        'accessibility.signals.noInlayHints': {
            ...signalFeatureBase,
            'description': localize('accessibility.signals.noInlayHints', "Plays a signal - sound (audio cue) and/or announcement (alert) - when trying to read a line with inlay hints that has no inlay hints."),
            'properties': {
                'sound': {
                    'description': localize('accessibility.signals.noInlayHints.sound', "Plays a sound when trying to read a line with inlay hints that has no inlay hints."),
                    ...soundFeatureBase
                },
                'announcement': {
                    'description': localize('accessibility.signals.noInlayHints.announcement', "Announces when trying to read a line with inlay hints that has no inlay hints."),
                    ...announcementFeatureBase
                },
            }
        },
        'accessibility.signals.taskCompleted': {
            ...signalFeatureBase,
            'description': localize('accessibility.signals.taskCompleted', "Plays a signal - sound (audio cue) and/or announcement (alert) - when a task is completed."),
            'properties': {
                'sound': {
                    'description': localize('accessibility.signals.taskCompleted.sound', "Plays a sound when a task is completed."),
                    ...soundFeatureBase
                },
                'announcement': {
                    'description': localize('accessibility.signals.taskCompleted.announcement', "Announces when a task is completed."),
                    ...announcementFeatureBase
                },
            }
        },
        'accessibility.signals.taskFailed': {
            ...signalFeatureBase,
            'description': localize('accessibility.signals.taskFailed', "Plays a signal - sound (audio cue) and/or announcement (alert) - when a task fails (non-zero exit code)."),
            'properties': {
                'sound': {
                    'description': localize('accessibility.signals.taskFailed.sound', "Plays a sound when a task fails (non-zero exit code)."),
                    ...soundFeatureBase
                },
                'announcement': {
                    'description': localize('accessibility.signals.taskFailed.announcement', "Announces when a task fails (non-zero exit code)."),
                    ...announcementFeatureBase
                },
            }
        },
        'accessibility.signals.terminalCommandFailed': {
            ...signalFeatureBase,
            'description': localize('accessibility.signals.terminalCommandFailed', "Plays a signal - sound (audio cue) and/or announcement (alert) - when a terminal command fails (non-zero exit code) or when a command with such an exit code is navigated to in the accessible view."),
            'properties': {
                'sound': {
                    'description': localize('accessibility.signals.terminalCommandFailed.sound', "Plays a sound when a terminal command fails (non-zero exit code) or when a command with such an exit code is navigated to in the accessible view."),
                    ...soundFeatureBase
                },
                'announcement': {
                    'description': localize('accessibility.signals.terminalCommandFailed.announcement', "Announces when a terminal command fails (non-zero exit code) or when a command with such an exit code is navigated to in the accessible view."),
                    ...announcementFeatureBase
                },
            }
        },
        'accessibility.signals.terminalCommandSucceeded': {
            ...signalFeatureBase,
            'description': localize('accessibility.signals.terminalCommandSucceeded', "Plays a signal - sound (audio cue) and/or announcement (alert) - when a terminal command succeeds (zero exit code) or when a command with such an exit code is navigated to in the accessible view."),
            'properties': {
                'sound': {
                    'description': localize('accessibility.signals.terminalCommandSucceeded.sound', "Plays a sound when a terminal command succeeds (zero exit code) or when a command with such an exit code is navigated to in the accessible view."),
                    ...soundFeatureBase
                },
                'announcement': {
                    'description': localize('accessibility.signals.terminalCommandSucceeded.announcement', "Announces when a terminal command succeeds (zero exit code) or when a command with such an exit code is navigated to in the accessible view."),
                    ...announcementFeatureBase
                },
            }
        },
        'accessibility.signals.terminalQuickFix': {
            ...signalFeatureBase,
            'description': localize('accessibility.signals.terminalQuickFix', "Plays a signal - sound (audio cue) and/or announcement (alert) - when terminal Quick Fixes are available."),
            'properties': {
                'sound': {
                    'description': localize('accessibility.signals.terminalQuickFix.sound', "Plays a sound when terminal Quick Fixes are available."),
                    ...soundFeatureBase
                },
                'announcement': {
                    'description': localize('accessibility.signals.terminalQuickFix.announcement', "Announces when terminal Quick Fixes are available."),
                    ...announcementFeatureBase
                },
            }
        },
        'accessibility.signals.terminalBell': {
            ...signalFeatureBase,
            'description': localize('accessibility.signals.terminalBell', "Plays a signal - sound (audio cue) and/or announcement (alert) - when the terminal bell is ringing."),
            'properties': {
                'sound': {
                    'description': localize('accessibility.signals.terminalBell.sound', "Plays a sound when the terminal bell is ringing."),
                    ...soundFeatureBase
                },
                'announcement': {
                    'description': localize('accessibility.signals.terminalBell.announcement', "Announces when the terminal bell is ringing."),
                    ...announcementFeatureBase
                },
            }
        },
        'accessibility.signals.diffLineInserted': {
            ...defaultNoAnnouncement,
            'description': localize('accessibility.signals.diffLineInserted', "Plays a sound / audio cue when the focus moves to an inserted line in Accessible Diff Viewer mode or to the next/previous change."),
            'properties': {
                'sound': {
                    'description': localize('accessibility.signals.sound', "Plays a sound when the focus moves to an inserted line in Accessible Diff Viewer mode or to the next/previous change."),
                    ...soundFeatureBase
                }
            }
        },
        'accessibility.signals.diffLineModified': {
            ...defaultNoAnnouncement,
            'description': localize('accessibility.signals.diffLineModified', "Plays a sound / audio cue when the focus moves to an modified line in Accessible Diff Viewer mode or to the next/previous change."),
            'properties': {
                'sound': {
                    'description': localize('accessibility.signals.diffLineModified.sound', "Plays a sound when the focus moves to a modified line in Accessible Diff Viewer mode or to the next/previous change."),
                    ...soundFeatureBase
                }
            }
        },
        'accessibility.signals.diffLineDeleted': {
            ...defaultNoAnnouncement,
            'description': localize('accessibility.signals.diffLineDeleted', "Plays a sound / audio cue when the focus moves to an deleted line in Accessible Diff Viewer mode or to the next/previous change."),
            'properties': {
                'sound': {
                    'description': localize('accessibility.signals.diffLineDeleted.sound', "Plays a sound when the focus moves to an deleted line in Accessible Diff Viewer mode or to the next/previous change."),
                    ...soundFeatureBase
                }
            }
        },
        'accessibility.signals.chatEditModifiedFile': {
            ...defaultNoAnnouncement,
            'description': localize('accessibility.signals.chatEditModifiedFile', "Plays a sound / audio cue when revealing a file with changes from chat edits"),
            'properties': {
                'sound': {
                    'description': localize('accessibility.signals.chatEditModifiedFile.sound', "Plays a sound when revealing a file with changes from chat edits"),
                    ...soundFeatureBase
                }
            }
        },
        'accessibility.signals.notebookCellCompleted': {
            ...signalFeatureBase,
            'description': localize('accessibility.signals.notebookCellCompleted', "Plays a signal - sound (audio cue) and/or announcement (alert) - when a notebook cell execution is successfully completed."),
            'properties': {
                'sound': {
                    'description': localize('accessibility.signals.notebookCellCompleted.sound', "Plays a sound when a notebook cell execution is successfully completed."),
                    ...soundFeatureBase
                },
                'announcement': {
                    'description': localize('accessibility.signals.notebookCellCompleted.announcement', "Announces when a notebook cell execution is successfully completed."),
                    ...announcementFeatureBase
                },
            }
        },
        'accessibility.signals.notebookCellFailed': {
            ...signalFeatureBase,
            'description': localize('accessibility.signals.notebookCellFailed', "Plays a signal - sound (audio cue) and/or announcement (alert) - when a notebook cell execution fails."),
            'properties': {
                'sound': {
                    'description': localize('accessibility.signals.notebookCellFailed.sound', "Plays a sound when a notebook cell execution fails."),
                    ...soundFeatureBase
                },
                'announcement': {
                    'description': localize('accessibility.signals.notebookCellFailed.announcement', "Announces when a notebook cell execution fails."),
                    ...announcementFeatureBase
                },
            }
        },
        'accessibility.signals.progress': {
            ...signalFeatureBase,
            'description': localize('accessibility.signals.progress', "Plays a signal - sound (audio cue) and/or announcement (alert) - on loop while progress is occurring."),
            'properties': {
                'sound': {
                    'description': localize('accessibility.signals.progress.sound', "Plays a sound on loop while progress is occurring."),
                    ...soundFeatureBase
                },
                'announcement': {
                    'description': localize('accessibility.signals.progress.announcement', "Alerts on loop while progress is occurring."),
                    ...announcementFeatureBase
                },
            },
        },
        'accessibility.signals.chatRequestSent': {
            ...signalFeatureBase,
            'description': localize('accessibility.signals.chatRequestSent', "Plays a signal - sound (audio cue) and/or announcement (alert) - when a chat request is made."),
            'properties': {
                'sound': {
                    'description': localize('accessibility.signals.chatRequestSent.sound', "Plays a sound when a chat request is made."),
                    ...soundFeatureBase
                },
                'announcement': {
                    'description': localize('accessibility.signals.chatRequestSent.announcement', "Announces when a chat request is made."),
                    ...announcementFeatureBase
                },
            }
        },
        'accessibility.signals.chatResponseReceived': {
            ...defaultNoAnnouncement,
            'description': localize('accessibility.signals.chatResponseReceived', "Plays a sound / audio cue when the response has been received."),
            'properties': {
                'sound': {
                    'description': localize('accessibility.signals.chatResponseReceived.sound', "Plays a sound on when the response has been received."),
                    ...soundFeatureBase
                },
            }
        },
        'accessibility.signals.codeActionTriggered': {
            ...defaultNoAnnouncement,
            'description': localize('accessibility.signals.codeActionTriggered', "Plays a sound / audio cue - when a code action has been triggered."),
            'properties': {
                'sound': {
                    'description': localize('accessibility.signals.codeActionTriggered.sound', "Plays a sound when a code action has been triggered."),
                    ...soundFeatureBase
                }
            }
        },
        'accessibility.signals.codeActionApplied': {
            ...defaultNoAnnouncement,
            'description': localize('accessibility.signals.codeActionApplied', "Plays a sound / audio cue when the code action has been applied."),
            'properties': {
                'sound': {
                    'description': localize('accessibility.signals.codeActionApplied.sound', "Plays a sound when the code action has been applied."),
                    ...soundFeatureBase
                },
            }
        },
        'accessibility.signals.voiceRecordingStarted': {
            ...defaultNoAnnouncement,
            'description': localize('accessibility.signals.voiceRecordingStarted', "Plays a sound / audio cue when the voice recording has started."),
            'properties': {
                'sound': {
                    'description': localize('accessibility.signals.voiceRecordingStarted.sound', "Plays a sound when the voice recording has started."),
                    ...soundFeatureBase,
                },
            },
            'default': {
                'sound': 'on'
            }
        },
        'accessibility.signals.voiceRecordingStopped': {
            ...defaultNoAnnouncement,
            'description': localize('accessibility.signals.voiceRecordingStopped', "Plays a sound / audio cue when the voice recording has stopped."),
            'properties': {
                'sound': {
                    'description': localize('accessibility.signals.voiceRecordingStopped.sound', "Plays a sound when the voice recording has stopped."),
                    ...soundFeatureBase,
                    default: 'off'
                },
            }
        },
        'accessibility.signals.clear': {
            ...signalFeatureBase,
            'description': localize('accessibility.signals.clear', "Plays a signal - sound (audio cue) and/or announcement (alert) - when a feature is cleared (for example, the terminal, Debug Console, or Output channel)."),
            'properties': {
                'sound': {
                    'description': localize('accessibility.signals.clear.sound', "Plays a sound when a feature is cleared."),
                    ...soundFeatureBase
                },
                'announcement': {
                    'description': localize('accessibility.signals.clear.announcement', "Announces when a feature is cleared."),
                    ...announcementFeatureBase
                },
            },
        },
        'accessibility.signals.editsUndone': {
            ...signalFeatureBase,
            'description': localize('accessibility.signals.editsUndone', "Plays a signal - sound (audio cue) and/or announcement (alert) - when edits have been undone."),
            'properties': {
                'sound': {
                    'description': localize('accessibility.signals.editsUndone.sound', "Plays a sound when edits have been undone."),
                    ...soundFeatureBase
                },
                'announcement': {
                    'description': localize('accessibility.signals.editsUndone.announcement', "Announces when edits have been undone."),
                    ...announcementFeatureBase
                },
            },
        },
        'accessibility.signals.editsKept': {
            ...signalFeatureBase,
            'description': localize('accessibility.signals.editsKept', "Plays a signal - sound (audio cue) and/or announcement (alert) - when edits are kept."),
            'properties': {
                'sound': {
                    'description': localize('accessibility.signals.editsKept.sound', "Plays a sound when edits are kept."),
                    ...soundFeatureBase
                },
                'announcement': {
                    'description': localize('accessibility.signals.editsKept.announcement', "Announces when edits are kept."),
                    ...announcementFeatureBase
                },
            },
        },
        'accessibility.signals.save': {
            'type': 'object',
            'tags': ['accessibility'],
            additionalProperties: false,
            'markdownDescription': localize('accessibility.signals.save', "Plays a signal - sound (audio cue) and/or announcement (alert) - when a file is saved."),
            'properties': {
                'sound': {
                    'description': localize('accessibility.signals.save.sound', "Plays a sound when a file is saved."),
                    'type': 'string',
                    'enum': ['userGesture', 'always', 'never'],
                    'default': 'never',
                    'enumDescriptions': [
                        localize('accessibility.signals.save.sound.userGesture', "Plays the sound when a user explicitly saves a file."),
                        localize('accessibility.signals.save.sound.always', "Plays the sound whenever a file is saved, including auto save."),
                        localize('accessibility.signals.save.sound.never', "Never plays the sound.")
                    ],
                },
                'announcement': {
                    'description': localize('accessibility.signals.save.announcement', "Announces when a file is saved."),
                    'type': 'string',
                    'enum': ['userGesture', 'always', 'never'],
                    'default': 'never',
                    'enumDescriptions': [
                        localize('accessibility.signals.save.announcement.userGesture', "Announces when a user explicitly saves a file."),
                        localize('accessibility.signals.save.announcement.always', "Announces whenever a file is saved, including auto save."),
                        localize('accessibility.signals.save.announcement.never', "Never plays the announcement.")
                    ],
                },
            },
            default: {
                'sound': 'never',
                'announcement': 'never'
            }
        },
        'accessibility.signals.format': {
            'type': 'object',
            'tags': ['accessibility'],
            additionalProperties: false,
            'markdownDescription': localize('accessibility.signals.format', "Plays a signal - sound (audio cue) and/or announcement (alert) - when a file or notebook is formatted."),
            'properties': {
                'sound': {
                    'description': localize('accessibility.signals.format.sound', "Plays a sound when a file or notebook is formatted."),
                    'type': 'string',
                    'enum': ['userGesture', 'always', 'never'],
                    'default': 'never',
                    'enumDescriptions': [
                        localize('accessibility.signals.format.userGesture', "Plays the sound when a user explicitly formats a file."),
                        localize('accessibility.signals.format.always', "Plays the sound whenever a file is formatted, including if it is set to format on save, type, or, paste, or run of a cell."),
                        localize('accessibility.signals.format.never', "Never plays the sound.")
                    ],
                },
                'announcement': {
                    'description': localize('accessibility.signals.format.announcement', "Announces when a file or notebook is formatted."),
                    'type': 'string',
                    'enum': ['userGesture', 'always', 'never'],
                    'default': 'never',
                    'enumDescriptions': [
                        localize('accessibility.signals.format.announcement.userGesture', "Announces when a user explicitly formats a file."),
                        localize('accessibility.signals.format.announcement.always', "Announces whenever a file is formatted, including if it is set to format on save, type, or, paste, or run of a cell."),
                        localize('accessibility.signals.format.announcement.never', "Never announces.")
                    ],
                },
            },
            default: {
                'sound': 'never',
                'announcement': 'never'
            }
        },
        'accessibility.underlineLinks': {
            'type': 'boolean',
            'description': localize('accessibility.underlineLinks', "Controls whether links should be underlined in the workbench."),
            'default': false,
        },
        'accessibility.debugWatchVariableAnnouncements': {
            'type': 'boolean',
            'description': localize('accessibility.debugWatchVariableAnnouncements', "Controls whether variable changes should be announced in the debug watch view."),
            'default': true,
        },
        'accessibility.replEditor.readLastExecutionOutput': {
            'type': 'boolean',
            'description': localize('accessibility.replEditor.readLastExecutedOutput', "Controls whether the output from an execution in the native REPL will be announced."),
            'default': true,
        },
        'accessibility.replEditor.autoFocusReplExecution': {
            type: 'string',
            enum: ['none', 'input', 'lastExecution'],
            default: 'input',
            description: localize('replEditor.autoFocusAppendedCell', "Control whether focus should automatically be sent to the REPL when code is executed."),
        },
        'accessibility.windowTitleOptimized': {
            'type': 'boolean',
            'default': true,
            'markdownDescription': localize('accessibility.windowTitleOptimized', "Controls whether the {0} should be optimized for screen readers when in screen reader mode. When enabled, the window title will have {1} appended to the end.", '`#window.title#`', '`activeEditorState`')
        },
    }
};
export function registerAccessibilityConfiguration() {
    const registry = Registry.as(Extensions.Configuration);
    registry.registerConfiguration(configuration);
    registry.registerConfiguration({
        ...workbenchConfigurationNodeBase,
        properties: {
            ["accessibility.dimUnfocused.enabled" /* AccessibilityWorkbenchSettingId.DimUnfocusedEnabled */]: {
                description: localize('dimUnfocusedEnabled', 'Whether to dim unfocused editors and terminals, which makes it more clear where typed input will go to. This works with the majority of editors with the notable exceptions of those that utilize iframes like notebooks and extension webview editors.'),
                type: 'boolean',
                default: false,
                tags: ['accessibility'],
                scope: 1 /* ConfigurationScope.APPLICATION */,
            },
            ["accessibility.dimUnfocused.opacity" /* AccessibilityWorkbenchSettingId.DimUnfocusedOpacity */]: {
                markdownDescription: localize('dimUnfocusedOpacity', 'The opacity fraction (0.2 to 1.0) to use for unfocused editors and terminals. This will only take effect when {0} is enabled.', `\`#${"accessibility.dimUnfocused.enabled" /* AccessibilityWorkbenchSettingId.DimUnfocusedEnabled */}#\``),
                type: 'number',
                minimum: 0.2 /* ViewDimUnfocusedOpacityProperties.Minimum */,
                maximum: 1 /* ViewDimUnfocusedOpacityProperties.Maximum */,
                default: 0.75 /* ViewDimUnfocusedOpacityProperties.Default */,
                tags: ['accessibility'],
                scope: 1 /* ConfigurationScope.APPLICATION */,
            },
            ["accessibility.hideAccessibleView" /* AccessibilityWorkbenchSettingId.HideAccessibleView */]: {
                description: localize('accessibility.hideAccessibleView', "Controls whether the Accessible View is hidden."),
                type: 'boolean',
                default: false,
                tags: ['accessibility']
            }
        }
    });
}
export { AccessibilityVoiceSettingId };
export const SpeechTimeoutDefault = 1200;
let DynamicSpeechAccessibilityConfiguration = class DynamicSpeechAccessibilityConfiguration extends Disposable {
    static { this.ID = 'workbench.contrib.dynamicSpeechAccessibilityConfiguration'; }
    constructor(speechService) {
        super();
        this.speechService = speechService;
        this._register(Event.runAndSubscribe(speechService.onDidChangeHasSpeechProvider, () => this.updateConfiguration()));
    }
    updateConfiguration() {
        if (!this.speechService.hasSpeechProvider) {
            return; // these settings require a speech provider
        }
        const languages = this.getLanguages();
        const languagesSorted = Object.keys(languages).sort((langA, langB) => {
            return languages[langA].name.localeCompare(languages[langB].name);
        });
        const registry = Registry.as(Extensions.Configuration);
        registry.registerConfiguration({
            ...accessibilityConfigurationNodeBase,
            properties: {
                ["accessibility.voice.speechTimeout" /* AccessibilityVoiceSettingId.SpeechTimeout */]: {
                    'markdownDescription': localize('voice.speechTimeout', "The duration in milliseconds that voice speech recognition remains active after you stop speaking. For example in a chat session, the transcribed text is submitted automatically after the timeout is met. Set to `0` to disable this feature."),
                    'type': 'number',
                    'default': SpeechTimeoutDefault,
                    'minimum': 0,
                    'tags': ['accessibility']
                },
                ["accessibility.voice.ignoreCodeBlocks" /* AccessibilityVoiceSettingId.IgnoreCodeBlocks */]: {
                    'markdownDescription': localize('voice.ignoreCodeBlocks', "Whether to ignore code snippets in text-to-speech synthesis."),
                    'type': 'boolean',
                    'default': false,
                    'tags': ['accessibility']
                },
                ["accessibility.voice.speechLanguage" /* AccessibilityVoiceSettingId.SpeechLanguage */]: {
                    'markdownDescription': localize('voice.speechLanguage', "The language that text-to-speech and speech-to-text should use. Select `auto` to use the configured display language if possible. Note that not all display languages maybe supported by speech recognition and synthesizers."),
                    'type': 'string',
                    'enum': languagesSorted,
                    'default': 'auto',
                    'tags': ['accessibility'],
                    'enumDescriptions': languagesSorted.map(key => languages[key].name),
                    'enumItemLabels': languagesSorted.map(key => languages[key].name)
                },
                ["accessibility.voice.autoSynthesize" /* AccessibilityVoiceSettingId.AutoSynthesize */]: {
                    'type': 'string',
                    'enum': ['on', 'off'],
                    'enumDescriptions': [
                        localize('accessibility.voice.autoSynthesize.on', "Enable the feature. When a screen reader is enabled, note that this will disable aria updates."),
                        localize('accessibility.voice.autoSynthesize.off', "Disable the feature."),
                    ],
                    'markdownDescription': localize('autoSynthesize', "Whether a textual response should automatically be read out aloud when speech was used as input. For example in a chat session, a response is automatically synthesized when voice was used as chat request."),
                    'default': 'off',
                    'tags': ['accessibility']
                }
            }
        });
    }
    getLanguages() {
        return {
            ['auto']: {
                name: localize('speechLanguage.auto', "Auto (Use Display Language)")
            },
            ...SPEECH_LANGUAGES
        };
    }
};
DynamicSpeechAccessibilityConfiguration = __decorate([
    __param(0, ISpeechService)
], DynamicSpeechAccessibilityConfiguration);
export { DynamicSpeechAccessibilityConfiguration };
Registry.as(WorkbenchExtensions.ConfigurationMigration)
    .registerConfigurationMigrations([{
        key: 'audioCues.volume',
        migrateFn: (value, accessor) => {
            return [
                ['accessibility.signalOptions.volume', { value }],
                ['audioCues.volume', { value: undefined }]
            ];
        }
    }]);
Registry.as(WorkbenchExtensions.ConfigurationMigration)
    .registerConfigurationMigrations([{
        key: 'audioCues.debouncePositionChanges',
        migrateFn: (value) => {
            return [
                ['accessibility.signalOptions.debouncePositionChanges', { value }],
                ['audioCues.debouncePositionChanges', { value: undefined }]
            ];
        }
    }]);
Registry.as(WorkbenchExtensions.ConfigurationMigration)
    .registerConfigurationMigrations([{
        key: 'accessibility.signalOptions',
        migrateFn: (value, accessor) => {
            const delayGeneral = getDelaysFromConfig(accessor, 'general');
            const delayError = getDelaysFromConfig(accessor, 'errorAtPosition');
            const delayWarning = getDelaysFromConfig(accessor, 'warningAtPosition');
            const volume = getVolumeFromConfig(accessor);
            const debouncePositionChanges = getDebouncePositionChangesFromConfig(accessor);
            const result = [];
            if (!!volume) {
                result.push(['accessibility.signalOptions.volume', { value: volume }]);
            }
            if (!!delayGeneral) {
                result.push(['accessibility.signalOptions.experimental.delays.general', { value: delayGeneral }]);
            }
            if (!!delayError) {
                result.push(['accessibility.signalOptions.experimental.delays.errorAtPosition', { value: delayError }]);
            }
            if (!!delayWarning) {
                result.push(['accessibility.signalOptions.experimental.delays.warningAtPosition', { value: delayWarning }]);
            }
            if (!!debouncePositionChanges) {
                result.push(['accessibility.signalOptions.debouncePositionChanges', { value: debouncePositionChanges }]);
            }
            result.push(['accessibility.signalOptions', { value: undefined }]);
            return result;
        }
    }]);
Registry.as(WorkbenchExtensions.ConfigurationMigration)
    .registerConfigurationMigrations([{
        key: 'accessibility.signals.sounds.volume',
        migrateFn: (value) => {
            return [
                ['accessibility.signalOptions.volume', { value }],
                ['accessibility.signals.sounds.volume', { value: undefined }]
            ];
        }
    }]);
Registry.as(WorkbenchExtensions.ConfigurationMigration)
    .registerConfigurationMigrations([{
        key: 'accessibility.signals.debouncePositionChanges',
        migrateFn: (value) => {
            return [
                ['accessibility.signalOptions.debouncePositionChanges', { value }],
                ['accessibility.signals.debouncePositionChanges', { value: undefined }]
            ];
        }
    }]);
function getDelaysFromConfig(accessor, type) {
    return accessor(`accessibility.signalOptions.experimental.delays.${type}`) || accessor('accessibility.signalOptions')?.['experimental.delays']?.[`${type}`] || accessor('accessibility.signalOptions')?.['delays']?.[`${type}`];
}
function getVolumeFromConfig(accessor) {
    return accessor('accessibility.signalOptions.volume') || accessor('accessibility.signalOptions')?.volume || accessor('accessibility.signals.sounds.volume') || accessor('audioCues.volume');
}
function getDebouncePositionChangesFromConfig(accessor) {
    return accessor('accessibility.signalOptions.debouncePositionChanges') || accessor('accessibility.signalOptions')?.debouncePositionChanges || accessor('accessibility.signals.debouncePositionChanges') || accessor('audioCues.debouncePositionChanges');
}
Registry.as(WorkbenchExtensions.ConfigurationMigration)
    .registerConfigurationMigrations([{
        key: "accessibility.voice.autoSynthesize" /* AccessibilityVoiceSettingId.AutoSynthesize */,
        migrateFn: (value) => {
            let newValue;
            if (value === true) {
                newValue = 'on';
            }
            else if (value === false) {
                newValue = 'off';
            }
            else {
                return [];
            }
            return [
                ["accessibility.voice.autoSynthesize" /* AccessibilityVoiceSettingId.AutoSynthesize */, { value: newValue }],
            ];
        }
    }]);
Registry.as(WorkbenchExtensions.ConfigurationMigration)
    .registerConfigurationMigrations([{
        key: 'accessibility.signals.chatResponsePending',
        migrateFn: (value, accessor) => {
            return [
                ['accessibility.signals.progress', { value }],
                ['accessibility.signals.chatResponsePending', { value: undefined }],
            ];
        }
    }]);
Registry.as(WorkbenchExtensions.ConfigurationMigration)
    .registerConfigurationMigrations(AccessibilitySignal.allAccessibilitySignals.map(item => item.legacySoundSettingsKey ? ({
    key: item.legacySoundSettingsKey,
    migrateFn: (sound, accessor) => {
        const configurationKeyValuePairs = [];
        const legacyAnnouncementSettingsKey = item.legacyAnnouncementSettingsKey;
        let announcement;
        if (legacyAnnouncementSettingsKey) {
            announcement = accessor(legacyAnnouncementSettingsKey) ?? undefined;
            if (announcement !== undefined && typeof announcement !== 'string') {
                announcement = announcement ? 'auto' : 'off';
            }
        }
        configurationKeyValuePairs.push([`${item.legacySoundSettingsKey}`, { value: undefined }]);
        configurationKeyValuePairs.push([`${item.settingsKey}`, { value: announcement !== undefined ? { announcement, sound } : { sound } }]);
        return configurationKeyValuePairs;
    }
}) : undefined).filter(isDefined));
Registry.as(WorkbenchExtensions.ConfigurationMigration)
    .registerConfigurationMigrations(AccessibilitySignal.allAccessibilitySignals.filter(i => !!i.legacyAnnouncementSettingsKey && !!i.legacySoundSettingsKey).map(item => ({
    key: item.legacyAnnouncementSettingsKey,
    migrateFn: (announcement, accessor) => {
        const configurationKeyValuePairs = [];
        const sound = accessor(item.settingsKey)?.sound || accessor(item.legacySoundSettingsKey);
        if (announcement !== undefined && typeof announcement !== 'string') {
            announcement = announcement ? 'auto' : 'off';
        }
        configurationKeyValuePairs.push([`${item.settingsKey}`, { value: announcement !== undefined ? { announcement, sound } : { sound } }]);
        configurationKeyValuePairs.push([`${item.legacyAnnouncementSettingsKey}`, { value: undefined }]);
        configurationKeyValuePairs.push([`${item.legacySoundSettingsKey}`, { value: undefined }]);
        return configurationKeyValuePairs;
    }
})));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWNjZXNzaWJpbGl0eUNvbmZpZ3VyYXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvYWNjZXNzaWJpbGl0eS9icm93c2VyL2FjY2Vzc2liaWxpdHlDb25maWd1cmF0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQXNCLFVBQVUsRUFBNEUsTUFBTSxvRUFBb0UsQ0FBQztBQUM5TCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDNUUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3JGLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxVQUFVLElBQUksbUJBQW1CLEVBQXVGLE1BQU0sa0NBQWtDLENBQUM7QUFDMU0sT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sZ0ZBQWdGLENBQUM7QUFDckgsT0FBTyxFQUFFLDJCQUEyQixFQUFFLGNBQWMsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3JILE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUVsRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDekQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBRTdELE1BQU0sQ0FBQyxNQUFNLHdCQUF3QixHQUFHLElBQUksYUFBYSxDQUFVLDBCQUEwQixFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQztBQUM1RyxNQUFNLENBQUMsTUFBTSxxQkFBcUIsR0FBRyxJQUFJLGFBQWEsQ0FBVSx1QkFBdUIsRUFBRSxLQUFLLEVB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