/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../nls.js';
import { MenuId } from '../../../../platform/actions/common/actions.js';
import { Extensions } from '../../../../platform/configuration/common/configurationRegistry.js';
import { RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { diffInserted, diffRemoved, editorWidgetBackground, editorWidgetBorder, editorWidgetForeground, focusBorder, inputBackground, inputPlaceholderForeground, registerColor, transparent, widgetShadow } from '../../../../platform/theme/common/colorRegistry.js';
// settings
export var InlineChatConfigKeys;
(function (InlineChatConfigKeys) {
    InlineChatConfigKeys["FinishOnType"] = "inlineChat.finishOnType";
    InlineChatConfigKeys["StartWithOverlayWidget"] = "inlineChat.startWithOverlayWidget";
    InlineChatConfigKeys["HoldToSpeech"] = "inlineChat.holdToSpeech";
    InlineChatConfigKeys["AccessibleDiffView"] = "inlineChat.accessibleDiffView";
    InlineChatConfigKeys["LineEmptyHint"] = "inlineChat.lineEmptyHint";
    InlineChatConfigKeys["LineNLHint"] = "inlineChat.lineNaturalLanguageHint";
})(InlineChatConfigKeys || (InlineChatConfigKeys = {}));
Registry.as(Extensions.Configuration).registerConfiguration({
    id: 'editor',
    properties: {
        ["inlineChat.finishOnType" /* InlineChatConfigKeys.FinishOnType */]: {
            description: localize('finishOnType', "Whether to finish an inline chat session when typing outside of changed regions."),
            default: false,
            type: 'boolean'
        },
        ["inlineChat.holdToSpeech" /* InlineChatConfigKeys.HoldToSpeech */]: {
            description: localize('holdToSpeech', "Whether holding the inline chat keybinding will automatically enable speech recognition."),
            default: true,
            type: 'boolean'
        },
        ["inlineChat.accessibleDiffView" /* InlineChatConfigKeys.AccessibleDiffView */]: {
            description: localize('accessibleDiffView', "Whether the inline chat also renders an accessible diff viewer for its changes."),
            default: 'auto',
            type: 'string',
            enum: ['auto', 'on', 'off'],
            markdownEnumDescriptions: [
                localize('accessibleDiffView.auto', "The accessible diff viewer is based on screen reader mode being enabled."),
                localize('accessibleDiffView.on', "The accessible diff viewer is always enabled."),
                localize('accessibleDiffView.off', "The accessible diff viewer is never enabled."),
            ],
        },
        ["inlineChat.lineEmptyHint" /* InlineChatConfigKeys.LineEmptyHint */]: {
            description: localize('emptyLineHint', "Whether empty lines show a hint to generate code with inline chat."),
            default: false,
            type: 'boolean',
            tags: ['experimental'],
        },
        ["inlineChat.lineNaturalLanguageHint" /* InlineChatConfigKeys.LineNLHint */]: {
            markdownDescription: localize('lineSuffixHint', "Whether lines that are dominated by natural language or pseudo code show a hint to continue with inline chat. For instance, `class Person with name and hobbies` would show a hint to continue with chat."),
            default: true,
            type: 'boolean',
            tags: ['experimental'],
        },
    }
});
export const INLINE_CHAT_ID = 'interactiveEditor';
export const INTERACTIVE_EDITOR_ACCESSIBILITY_HELP_ID = 'interactiveEditorAccessiblityHelp';
// --- CONTEXT
export var InlineChatResponseType;
(function (InlineChatResponseType) {
    InlineChatResponseType["None"] = "none";
    InlineChatResponseType["Messages"] = "messages";
    InlineChatResponseType["MessagesAndEdits"] = "messagesAndEdits";
})(InlineChatResponseType || (InlineChatResponseType = {}));
export const CTX_INLINE_CHAT_POSSIBLE = new RawContextKey('inlineChatPossible', false, localize('inlineChatHasPossible', "Whether a provider for inline chat exists and whether an editor for inline chat is open"));
export const CTX_INLINE_CHAT_HAS_AGENT = new RawContextKey('inlineChatHasProvider', false, localize('inlineChatHasProvider', "Whether a provider for interactive editors exists"));
export const CTX_INLINE_CHAT_HAS_AGENT2 = new RawContextKey('inlineChatHasEditsAgent', false, localize('inlineChatHasEditsAgent', "Whether an agent for inliine for interactive editors exists"));
export const CTX_INLINE_CHAT_VISIBLE = new RawContextKey('inlineChatVisible', false, localize('inlineChatVisible', "Whether the interactive editor input is visible"));
export const CTX_INLINE_CHAT_FOCUSED = new RawContextKey('inlineChatFocused', false, localize('inlineChatFocused', "Whether the interactive editor input is focused"));
export const CTX_INLINE_CHAT_EDITING = new RawContextKey('inlineChatEditing', true, localize('inlineChatEditing', "Whether the user is currently editing or generating code in the inline chat"));
export const CTX_INLINE_CHAT_RESPONSE_FOCUSED = new RawContextKey('inlineChatResponseFocused', false, localize('inlineChatResponseFocused', "Whether the interactive widget's response is focused"));
export const CTX_INLINE_CHAT_EMPTY = new RawContextKey('inlineChatEmpty', false, localize('inlineChatEmpty', "Whether the interactive editor input is empty"));
export const CTX_INLINE_CHAT_INNER_CURSOR_FIRST = new RawContextKey('inlineChatInnerCursorFirst', false, localize('inlineChatInnerCursorFirst', "Whether the cursor of the iteractive editor input is on the first line"));
export const CTX_INLINE_CHAT_INNER_CURSOR_LAST = new RawContextKey('inlineChatInnerCursorLast', false, localize('inlineChatInnerCursorLast', "Whether the cursor of the iteractive editor input is on the last line"));
export const CTX_INLINE_CHAT_OUTER_CURSOR_POSITION = new RawContextKey('inlineChatOuterCursorPosition', '', localize('inlineChatOuterCursorPosition', "Whether the cursor of the outer editor is above or below the interactive editor input"));
export const CTX_INLINE_CHAT_HAS_STASHED_SESSION = new RawContextKey('inlineChatHasStashedSession', false, localize('inlineChatHasStashedSession', "Whether interactive editor has kept a session for quick restore"));
export const CTX_INLINE_CHAT_CHANGE_HAS_DIFF = new RawContextKey('inlineChatChangeHasDiff', false, localize('inlineChatChangeHasDiff', "Whether the current change supports showing a diff"));
export const CTX_INLINE_CHAT_CHANGE_SHOWS_DIFF = new RawContextKey('inlineChatChangeShowsDiff', false, localize('inlineChatChangeShowsDiff', "Whether the current change showing a diff"));
export const CTX_INLINE_CHAT_REQUEST_IN_PROGRESS = new RawContextKey('inlineChatRequestInProgress', false, localize('inlineChatRequestInProgress', "Whether an inline chat request is currently in progress"));
export const CTX_INLINE_CHAT_RESPONSE_TYPE = new RawContextKey('inlineChatResponseType', "none" /* InlineChatResponseType.None */, localize('inlineChatResponseTypes', "What type was the responses have been receieved, nothing yet, just messages, or messaged and local edits"));
// --- (selected) action identifier
export const ACTION_START = 'inlineChat.start';
export const ACTION_ACCEPT_CHANGES = 'inlineChat.acceptChanges';
export const ACTION_DISCARD_CHANGES = 'inlineChat.discardHunkChange';
export const ACTION_REGENERATE_RESPONSE = 'inlineChat.regenerate';
export const ACTION_VIEW_IN_CHAT = 'inlineChat.viewInChat';
export const ACTION_TOGGLE_DIFF = 'inlineChat.toggleDiff';
export const ACTION_REPORT_ISSUE = 'inlineChat.reportIssue';
// --- menus
export const MENU_INLINE_CHAT_WIDGET_STATUS = MenuId.for('inlineChatWidget.status');
export const MENU_INLINE_CHAT_WIDGET_SECONDARY = MenuId.for('inlineChatWidget.secondary');
export const MENU_INLINE_CHAT_ZONE = MenuId.for('inlineChatWidget.changesZone');
export const MENU_INLINE_CHAT_SIDE = MenuId.for('inlineChatWidget.side');
// --- colors
export const inlineChatForeground = registerColor('inlineChat.foreground', editorWidgetForeground, localize('inlineChat.foreground', "Foreground color of the interactive editor widget"));
export const inlineChatBackground = registerColor('inlineChat.background', editorWidgetBackground, localize('inlineChat.background', "Background color of the interactive editor widget"));
export const inlineChatBorder = registerColor('inlineChat.border', editorWidgetBorder, localize('inlineChat.border', "Border color of the interactive editor widget"));
export const inlineChatShadow = registerColor('inlineChat.shadow', widgetShadow, localize('inlineChat.shadow', "Shadow color of the interactive editor widget"));
export const inlineChatInputBorder = registerColor('inlineChatInput.border', editorWidgetBorder, localize('inlineChatInput.border', "Border color of the interactive editor input"));
export const inlineChatInputFocusBorder = registerColor('inlineChatInput.focusBorder', focusBorder, localize('inlineChatInput.focusBorder', "Border color of the interactive editor input when focused"));
export const inlineChatInputPlaceholderForeground = registerColor('inlineChatInput.placeholderForeground', inputPlaceholderForeground, localize('inlineChatInput.placeholderForeground', "Foreground color of the interactive editor input placeholder"));
export const inlineChatInputBackground = registerColor('inlineChatInput.background', inputBackground, localize('inlineChatInput.background', "Background color of the interactive editor input"));
export const inlineChatDiffInserted = registerColor('inlineChatDiff.inserted', transparent(diffInserted, .5), localize('inlineChatDiff.inserted', "Background color of inserted text in the interactive editor input"));
export const overviewRulerInlineChatDiffInserted = registerColor('editorOverviewRuler.inlineChatInserted', { dark: transparent(diffInserted, 0.6), light: transparent(diffInserted, 0.8), hcDark: transparent(diffInserted, 0.6), hcLight: transparent(diffInserted, 0.8) }, localize('editorOverviewRuler.inlineChatInserted', 'Overview ruler marker color for inline chat inserted content.'));
export const minimapInlineChatDiffInserted = registerColor('editorMinimap.inlineChatInserted', { dark: transparent(diffInserted, 0.6), light: transparent(diffInserted, 0.8), hcDark: transparent(diffInserted, 0.6), hcLight: transparent(diffInserted, 0.8) }, localize('editorMinimap.inlineChatInserted', 'Minimap marker color for inline chat inserted content.'));
export const inlineChatDiffRemoved = registerColor('inlineChatDiff.removed', transparent(diffRemoved, .5), localize('inlineChatDiff.removed', "Background color of removed text in the interactive editor input"));
export const overviewRulerInlineChatDiffRemoved = registerColor('editorOverviewRuler.inlineChatRemoved', { dark: transparent(diffRemoved, 0.6), light: transparent(diffRemoved, 0.8), hcDark: transparent(diffRemoved, 0.6), hcLight: transparent(diffRemoved, 0.8) }, localize('editorOverviewRuler.inlineChatRemoved', 'Overview ruler marker color for inline chat removed content.'));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lQ2hhdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9pbmxpbmVDaGF0L2NvbW1vbi9pbmxpbmVDaGF0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDeEUsT0FBTyxFQUFFLFVBQVUsRUFBMEIsTUFBTSxvRUFBb0UsQ0FBQztBQUN4SCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDckYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQzVFLE9BQU8sRUFBRSxZQUFZLEVBQUUsV0FBVyxFQUFFLHNCQUFzQixFQUFFLGtCQUFrQixFQUFFLHNCQUFzQixFQUFFLFdBQVcsRUFBRSxlQUFlLEVBQUUsMEJBQTBCLEVBQUUsYUFBYSxFQUFFLFdBQVcsRUFBRSxZQUFZLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUV2USxXQUFXO0FBRVgsTUFBTSxDQUFOLElBQWtCLG9CQU9qQjtBQVBELFdBQWtCLG9CQUFvQjtJQUNyQyxnRUFBd0MsQ0FBQTtJQUN4QyxvRkFBNEQsQ0FBQTtJQUM1RCxnRUFBd0MsQ0FBQTtJQUN4Qyw0RUFBb0QsQ0FBQTtJQUNwRCxrRUFBMEMsQ0FBQTtJQUMxQyx5RUFBaUQsQ0FBQTtBQUNsRCxDQUFDLEVBUGlCLG9CQUFvQixLQUFwQixvQkFBb0IsUUFPckM7QUFFRCxRQUFRLENBQUMsRUFBRSxDQUF5QixVQUFVLENBQUMsYUFBYSxDQUFDLENBQUMscUJBQXFCLENBQUM7SUFDbkYsRUFBRSxFQUFFLFFBQVE7SUFDWixVQUFVLEVBQUU7UUFDWCxt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