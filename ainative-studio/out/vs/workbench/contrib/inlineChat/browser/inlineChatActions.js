/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../../base/common/codicons.js';
import { isCodeEditor, isDiffEditor } from '../../../../editor/browser/editorBrowser.js';
import { EditorAction2 } from '../../../../editor/browser/editorExtensions.js';
import { EmbeddedDiffEditorWidget } from '../../../../editor/browser/widget/diffEditor/embeddedDiffEditorWidget.js';
import { EmbeddedCodeEditorWidget } from '../../../../editor/browser/widget/codeEditor/embeddedCodeEditorWidget.js';
import { EditorContextKeys } from '../../../../editor/common/editorContextKeys.js';
import { InlineChatController, InlineChatController1, InlineChatController2, InlineChatRunOptions } from './inlineChatController.js';
import { ACTION_ACCEPT_CHANGES, CTX_INLINE_CHAT_HAS_AGENT, CTX_INLINE_CHAT_HAS_STASHED_SESSION, CTX_INLINE_CHAT_FOCUSED, CTX_INLINE_CHAT_INNER_CURSOR_FIRST, CTX_INLINE_CHAT_INNER_CURSOR_LAST, CTX_INLINE_CHAT_VISIBLE, CTX_INLINE_CHAT_OUTER_CURSOR_POSITION, MENU_INLINE_CHAT_WIDGET_STATUS, CTX_INLINE_CHAT_REQUEST_IN_PROGRESS, CTX_INLINE_CHAT_RESPONSE_TYPE, ACTION_REGENERATE_RESPONSE, ACTION_VIEW_IN_CHAT, ACTION_TOGGLE_DIFF, CTX_INLINE_CHAT_CHANGE_HAS_DIFF, CTX_INLINE_CHAT_CHANGE_SHOWS_DIFF, MENU_INLINE_CHAT_ZONE, ACTION_DISCARD_CHANGES, CTX_INLINE_CHAT_POSSIBLE, ACTION_START, CTX_INLINE_CHAT_HAS_AGENT2, MENU_INLINE_CHAT_SIDE } from '../common/inlineChat.js';
import { ctxIsGlobalEditingSession, ctxRequestCount } from '../../chat/browser/chatEditing/chatEditingEditorContextKeys.js';
import { localize, localize2 } from '../../../../nls.js';
import { Action2, MenuId } from '../../../../platform/actions/common/actions.js';
import { ContextKeyExpr, IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { CONTEXT_ACCESSIBILITY_MODE_ENABLED } from '../../../../platform/accessibility/common/accessibility.js';
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { IPreferencesService } from '../../../services/preferences/common/preferences.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IChatService } from '../../chat/common/chatService.js';
import { ChatContextKeys } from '../../chat/common/chatContextKeys.js';
import { IChatWidgetService } from '../../chat/browser/chat.js';
import { IInlineChatSessionService } from './inlineChatSessionService.js';
CommandsRegistry.registerCommandAlias('interactiveEditor.start', 'inlineChat.start');
CommandsRegistry.registerCommandAlias('interactive.acceptChanges', ACTION_ACCEPT_CHANGES);
export const START_INLINE_CHAT = registerIcon('start-inline-chat', Codicon.sparkle, localize('startInlineChat', 'Icon which spawns the inline chat from the editor toolbar.'));
let _holdForSpeech = undefined;
export function setHoldForSpeech(holdForSpeech) {
    _holdForSpeech = holdForSpeech;
}
export class StartSessionAction extends Action2 {
    constructor() {
        super({
            id: ACTION_START,
            title: localize2('run', 'Editor Inline Chat'),
            category: AbstractInline1ChatAction.category,
            f1: true,
            precondition: ContextKeyExpr.and(ContextKeyExpr.or(CTX_INLINE_CHAT_HAS_AGENT, CTX_INLINE_CHAT_HAS_AGENT2), CTX_INLINE_CHAT_POSSIBLE, EditorContextKeys.writable, EditorContextKeys.editorSimpleInput.negate()),
            keybinding: {
                when: EditorContextKeys.focus,
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 39 /* KeyCode.KeyI */
            },
            icon: START_INLINE_CHAT,
            menu: {
                id: MenuId.ChatTitleBarMenu,
                group: 'a_open',
                order: 3,
            }
        });
    }
    run(accessor, ...args) {
        const codeEditorService = accessor.get(ICodeEditorService);
        const editor = codeEditorService.getActiveCodeEditor();
        if (!editor || editor.isSimpleWidget) {
            // well, at least we tried...
            return;
        }
        // precondition does hold
        return editor.invokeWithinContext((editorAccessor) => {
            const kbService = editorAccessor.get(IContextKeyService);
            const logService = editorAccessor.get(ILogService);
            const enabled = kbService.contextMatchesRules(this.desc.precondition ?? undefined);
            if (!enabled) {
                logService.debug(`[EditorAction2] NOT running command because its precondition is FALSE`, this.desc.id, this.desc.precondition?.serialize());
                return;
            }
            return this._runEditorCommand(editorAccessor, editor, ...args);
        });
    }
    _runEditorCommand(accessor, editor, ..._args) {
        const ctrl = InlineChatController.get(editor);
        if (!ctrl) {
            return;
        }
        if (_holdForSpeech) {
            accessor.get(IInstantiationService).invokeFunction(_holdForSpeech, ctrl, this);
        }
        let options;
        const arg = _args[0];
        if (arg && InlineChatRunOptions.isInlineChatRunOptions(arg)) {
            options = arg;
        }
        InlineChatController.get(editor)?.run({ ...options });
    }
}
export class FocusInlineChat extends EditorAction2 {
    constructor() {
        super({
            id: 'inlineChat.focus',
            title: localize2('focus', "Focus Input"),
            f1: true,
            category: AbstractInline1ChatAction.category,
            precondition: ContextKeyExpr.and(EditorContextKeys.editorTextFocus, CTX_INLINE_CHAT_VISIBLE, CTX_INLINE_CHAT_FOCUSED.negate(), CONTEXT_ACCESSIBILITY_MODE_ENABLED.negate()),
            keybinding: [{
                    weight: 0 /* KeybindingWeight.EditorCore */ + 10, // win against core_command
                    when: ContextKeyExpr.and(CTX_INLINE_CHAT_OUTER_CURSOR_POSITION.isEqualTo('above'), EditorContextKeys.isEmbeddedDiffEditor.negate()),
                    primary: 2048 /* KeyMod.CtrlCmd */ | 18 /* KeyCode.DownArrow */,
                }, {
                    weight: 0 /* KeybindingWeight.EditorCore */ + 10, // win against core_command
                    when: ContextKeyExpr.and(CTX_INLINE_CHAT_OUTER_CURSOR_POSITION.isEqualTo('below'), EditorContextKeys.isEmbeddedDiffEditor.negate()),
                    primary: 2048 /* KeyMod.CtrlCmd */ | 16 /* KeyCode.UpArrow */,
                }]
        });
    }
    runEditorCommand(_accessor, editor, ..._args) {
        InlineChatController.get(editor)?.focus();
    }
}
//#region --- VERSION 1
export class UnstashSessionAction extends EditorAction2 {
    constructor() {
        super({
            id: 'inlineChat.unstash',
            title: localize2('unstash', "Resume Last Dismissed Inline Chat"),
            category: AbstractInline1ChatAction.category,
            precondition: ContextKeyExpr.and(CTX_INLINE_CHAT_HAS_STASHED_SESSION, EditorContextKeys.writable),
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 56 /* KeyCode.KeyZ */,
            }
        });
    }
    async runEditorCommand(_accessor, editor, ..._args) {
        const ctrl = InlineChatController1.get(editor);
        if (ctrl) {
            const session = ctrl.unstashLastSession();
            if (session) {
                ctrl.run({
                    existingSession: session,
                });
            }
        }
    }
}
export class AbstractInline1ChatAction extends EditorAction2 {
    static { this.category = localize2('cat', "Inline Chat"); }
    constructor(desc) {
        super({
            ...desc,
            category: AbstractInline1ChatAction.category,
            precondition: ContextKeyExpr.and(CTX_INLINE_CHAT_HAS_AGENT, desc.precondition)
        });
    }
    runEditorCommand(accessor, editor, ..._args) {
        const editorService = accessor.get(IEditorService);
        const logService = accessor.get(ILogService);
        let ctrl = InlineChatController1.get(editor);
        if (!ctrl) {
            const { activeTextEditorControl } = editorService;
            if (isCodeEditor(activeTextEditorControl)) {
                editor = activeTextEditorControl;
            }
            else if (isDiffEditor(activeTextEditorControl)) {
                editor = activeTextEditorControl.getModifiedEditor();
            }
            ctrl = InlineChatController1.get(editor);
        }
        if (!ctrl) {
            logService.warn('[IE] NO controller found for action', this.desc.id, editor.getModel()?.uri);
            return;
        }
        if (editor instanceof EmbeddedCodeEditorWidget) {
            editor = editor.getParentEditor();
        }
        if (!ctrl) {
            for (const diffEditor of accessor.get(ICodeEditorService).listDiffEditors()) {
                if (diffEditor.getOriginalEditor() === editor || diffEditor.getModifiedEditor() === editor) {
                    if (diffEditor instanceof EmbeddedDiffEditorWidget) {
                        this.runEditorCommand(accessor, diffEditor.getParentEditor(), ..._args);
                    }
                }
            }
            return;
        }
        this.runInlineChatCommand(accessor, ctrl, editor, ..._args);
    }
}
export class ArrowOutUpAction extends AbstractInline1ChatAction {
    constructor() {
        super({
            id: 'inlineChat.arrowOutUp',
            title: localize('arrowUp', 'Cursor Up'),
            precondition: ContextKeyExpr.and(CTX_INLINE_CHAT_FOCUSED, CTX_INLINE_CHAT_INNER_CURSOR_FIRST, EditorContextKeys.isEmbeddedDiffEditor.negate(), CONTEXT_ACCESSIBILITY_MODE_ENABLED.negate()),
            keybinding: {
                weight: 0 /* KeybindingWeight.EditorCore */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 16 /* KeyCode.UpArrow */
            }
        });
    }
    runInlineChatCommand(_accessor, ctrl, _editor, ..._args) {
        ctrl.arrowOut(true);
    }
}
export class ArrowOutDownAction extends AbstractInline1ChatAction {
    constructor() {
        super({
            id: 'inlineChat.arrowOutDown',
            title: localize('arrowDown', 'Cursor Down'),
            precondition: ContextKeyExpr.and(CTX_INLINE_CHAT_FOCUSED, CTX_INLINE_CHAT_INNER_CURSOR_LAST, EditorContextKeys.isEmbeddedDiffEditor.negate(), CONTEXT_ACCESSIBILITY_MODE_ENABLED.negate()),
            keybinding: {
                weight: 0 /* KeybindingWeight.EditorCore */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 18 /* KeyCode.DownArrow */
            }
        });
    }
    runInlineChatCommand(_accessor, ctrl, _editor, ..._args) {
        ctrl.arrowOut(false);
    }
}
export class AcceptChanges extends AbstractInline1ChatAction {
    constructor() {
        super({
            id: ACTION_ACCEPT_CHANGES,
            title: localize2('apply1', "Accept Changes"),
            shortTitle: localize('apply2', 'Accept'),
            icon: Codicon.check,
            f1: true,
            precondition: ContextKeyExpr.and(CTX_INLINE_CHAT_VISIBLE),
            keybinding: [{
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 10,
                    primary: 2048 /* KeyMod.CtrlCmd */ | 3 /* KeyCode.Enter */,
                }],
            menu: [{
                    id: MENU_INLINE_CHAT_WIDGET_STATUS,
                    group: '0_main',
                    order: 1,
                    when: ContextKeyExpr.and(ChatContextKeys.inputHasText.toNegated(), CTX_INLINE_CHAT_REQUEST_IN_PROGRESS.toNegated(), CTX_INLINE_CHAT_RESPONSE_TYPE.isEqualTo("messagesAndEdits" /* InlineChatResponseType.MessagesAndEdits */)),
                }, {
                    id: MENU_INLINE_CHAT_ZONE,
                    group: 'navigation',
                    order: 1,
                }]
        });
    }
    async runInlineChatCommand(_accessor, ctrl, _editor, hunk) {
        ctrl.acceptHunk(hunk);
    }
}
export class DiscardHunkAction extends AbstractInline1ChatAction {
    constructor() {
        super({
            id: ACTION_DISCARD_CHANGES,
            title: localize('discard', 'Discard'),
            icon: Codicon.chromeClose,
            precondition: CTX_INLINE_CHAT_VISIBLE,
            menu: [{
                    id: MENU_INLINE_CHAT_ZONE,
                    group: 'navigation',
                    order: 2
                }],
            keybinding: {
                weight: 100 /* KeybindingWeight.EditorContrib */,
                primary: 9 /* KeyCode.Escape */,
                when: CTX_INLINE_CHAT_RESPONSE_TYPE.isEqualTo("messagesAndEdits" /* InlineChatResponseType.MessagesAndEdits */)
            }
        });
    }
    async runInlineChatCommand(_accessor, ctrl, _editor, hunk) {
        return ctrl.discardHunk(hunk);
    }
}
export class RerunAction extends AbstractInline1ChatAction {
    constructor() {
        super({
            id: ACTION_REGENERATE_RESPONSE,
            title: localize2('chat.rerun.label', "Rerun Request"),
            shortTitle: localize('rerun', 'Rerun'),
            f1: false,
            icon: Codicon.refresh,
            precondition: CTX_INLINE_CHAT_VISIBLE,
            menu: {
                id: MENU_INLINE_CHAT_WIDGET_STATUS,
                group: '0_main',
                order: 5,
                when: ContextKeyExpr.and(ChatContextKeys.inputHasText.toNegated(), CTX_INLINE_CHAT_REQUEST_IN_PROGRESS.negate(), CTX_INLINE_CHAT_RESPONSE_TYPE.notEqualsTo("none" /* InlineChatResponseType.None */))
            },
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 48 /* KeyCode.KeyR */
            }
        });
    }
    async runInlineChatCommand(accessor, ctrl, _editor, ..._args) {
        const chatService = accessor.get(IChatService);
        const chatWidgetService = accessor.get(IChatWidgetService);
        const model = ctrl.chatWidget.viewModel?.model;
        if (!model) {
            return;
        }
        const lastRequest = model.getRequests().at(-1);
        if (lastRequest) {
            const widget = chatWidgetService.getWidgetBySessionId(model.sessionId);
            await chatService.resendRequest(lastRequest, {
                noCommandDetection: false,
                attempt: lastRequest.attempt + 1,
                location: ctrl.chatWidget.location,
                userSelectedModelId: widget?.input.currentLanguageModel
            });
        }
    }
}
export class CloseAction extends AbstractInline1ChatAction {
    constructor() {
        super({
            id: 'inlineChat.close',
            title: localize('close', 'Close'),
            icon: Codicon.close,
            precondition: CTX_INLINE_CHAT_VISIBLE,
            keybinding: {
                weight: 100 /* KeybindingWeight.EditorContrib */ + 1,
                primary: 9 /* KeyCode.Escape */,
            },
            menu: [{
                    id: MENU_INLINE_CHAT_WIDGET_STATUS,
                    group: '0_main',
                    order: 1,
                    when: ContextKeyExpr.and(CTX_INLINE_CHAT_REQUEST_IN_PROGRESS.negate()),
                }]
        });
    }
    async runInlineChatCommand(_accessor, ctrl, _editor, ..._args) {
        ctrl.cancelSession();
    }
}
export class ConfigureInlineChatAction extends AbstractInline1ChatAction {
    constructor() {
        super({
            id: 'inlineChat.configure',
            title: localize2('configure', 'Configure Inline Chat'),
            icon: Codicon.settingsGear,
            precondition: CTX_INLINE_CHAT_VISIBLE,
            f1: true,
            menu: {
                id: MENU_INLINE_CHAT_WIDGET_STATUS,
                group: 'zzz',
                order: 5
            }
        });
    }
    async runInlineChatCommand(accessor, ctrl, _editor, ..._args) {
        accessor.get(IPreferencesService).openSettings({ query: 'inlineChat' });
    }
}
export class MoveToNextHunk extends AbstractInline1ChatAction {
    constructor() {
        super({
            id: 'inlineChat.moveToNextHunk',
            title: localize2('moveToNextHunk', 'Move to Next Change'),
            precondition: CTX_INLINE_CHAT_VISIBLE,
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 65 /* KeyCode.F7 */
            }
        });
    }
    runInlineChatCommand(accessor, ctrl, editor, ...args) {
        ctrl.moveHunk(true);
    }
}
export class MoveToPreviousHunk extends AbstractInline1ChatAction {
    constructor() {
        super({
            id: 'inlineChat.moveToPreviousHunk',
            title: localize2('moveToPreviousHunk', 'Move to Previous Change'),
            f1: true,
            precondition: CTX_INLINE_CHAT_VISIBLE,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 1024 /* KeyMod.Shift */ | 65 /* KeyCode.F7 */
            }
        });
    }
    runInlineChatCommand(accessor, ctrl, editor, ...args) {
        ctrl.moveHunk(false);
    }
}
export class ViewInChatAction extends AbstractInline1ChatAction {
    constructor() {
        super({
            id: ACTION_VIEW_IN_CHAT,
            title: localize('viewInChat', 'View in Chat'),
            icon: Codicon.commentDiscussion,
            precondition: CTX_INLINE_CHAT_VISIBLE,
            menu: [{
                    id: MENU_INLINE_CHAT_WIDGET_STATUS,
                    group: 'more',
                    order: 1,
                    when: CTX_INLINE_CHAT_RESPONSE_TYPE.notEqualsTo("messages" /* InlineChatResponseType.Messages */)
                }, {
                    id: MENU_INLINE_CHAT_WIDGET_STATUS,
                    group: '0_main',
                    order: 1,
                    when: ContextKeyExpr.and(ChatContextKeys.inputHasText.toNegated(), CTX_INLINE_CHAT_RESPONSE_TYPE.isEqualTo("messages" /* InlineChatResponseType.Messages */), CTX_INLINE_CHAT_REQUEST_IN_PROGRESS.negate())
                }],
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 18 /* KeyCode.DownArrow */,
                when: ChatContextKeys.inChatInput
            }
        });
    }
    runInlineChatCommand(_accessor, ctrl, _editor, ..._args) {
        return ctrl.viewInChat();
    }
}
export class ToggleDiffForChange extends AbstractInline1ChatAction {
    constructor() {
        super({
            id: ACTION_TOGGLE_DIFF,
            precondition: ContextKeyExpr.and(CTX_INLINE_CHAT_VISIBLE, CTX_INLINE_CHAT_CHANGE_HAS_DIFF),
            title: localize2('showChanges', 'Toggle Changes'),
            icon: Codicon.diffSingle,
            toggled: {
                condition: CTX_INLINE_CHAT_CHANGE_SHOWS_DIFF,
            },
            menu: [{
                    id: MENU_INLINE_CHAT_WIDGET_STATUS,
                    group: 'zzz',
                    order: 1,
                }, {
                    id: MENU_INLINE_CHAT_ZONE,
                    group: 'navigation',
                    when: CTX_INLINE_CHAT_CHANGE_HAS_DIFF,
                    order: 2
                }]
        });
    }
    runInlineChatCommand(_accessor, ctrl, _editor, hunkInfo) {
        ctrl.toggleDiff(hunkInfo);
    }
}
//#endregion
//#region --- VERSION 2
class AbstractInline2ChatAction extends EditorAction2 {
    static { this.category = localize2('cat', "Inline Chat"); }
    constructor(desc) {
        super({
            ...desc,
            category: AbstractInline2ChatAction.category,
            precondition: ContextKeyExpr.and(CTX_INLINE_CHAT_HAS_AGENT2, desc.precondition)
        });
    }
    runEditorCommand(accessor, editor, ..._args) {
        const editorService = accessor.get(IEditorService);
        const logService = accessor.get(ILogService);
        let ctrl = InlineChatController2.get(editor);
        if (!ctrl) {
            const { activeTextEditorControl } = editorService;
            if (isCodeEditor(activeTextEditorControl)) {
                editor = activeTextEditorControl;
            }
            else if (isDiffEditor(activeTextEditorControl)) {
                editor = activeTextEditorControl.getModifiedEditor();
            }
            ctrl = InlineChatController2.get(editor);
        }
        if (!ctrl) {
            logService.warn('[IE] NO controller found for action', this.desc.id, editor.getModel()?.uri);
            return;
        }
        if (editor instanceof EmbeddedCodeEditorWidget) {
            editor = editor.getParentEditor();
        }
        if (!ctrl) {
            for (const diffEditor of accessor.get(ICodeEditorService).listDiffEditors()) {
                if (diffEditor.getOriginalEditor() === editor || diffEditor.getModifiedEditor() === editor) {
                    if (diffEditor instanceof EmbeddedDiffEditorWidget) {
                        this.runEditorCommand(accessor, diffEditor.getParentEditor(), ..._args);
                    }
                }
            }
            return;
        }
        this.runInlineChatCommand(accessor, ctrl, editor, ..._args);
    }
}
export class StopSessionAction2 extends AbstractInline2ChatAction {
    constructor() {
        super({
            id: 'inlineChat2.stop',
            title: localize2('stop', "Undo & Close"),
            f1: true,
            icon: Codicon.close,
            precondition: CTX_INLINE_CHAT_VISIBLE,
            keybinding: [{
                    when: ctxRequestCount.isEqualTo(0),
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                    primary: 2048 /* KeyMod.CtrlCmd */ | 39 /* KeyCode.KeyI */,
                }, {
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                    primary: 9 /* KeyCode.Escape */,
                }],
            menu: {
                id: MENU_INLINE_CHAT_SIDE,
                group: 'navigation',
                when: CTX_INLINE_CHAT_HAS_AGENT2
            }
        });
    }
    runInlineChatCommand(accessor, _ctrl, editor, ...args) {
        const inlineChatSessions = accessor.get(IInlineChatSessionService);
        if (!editor.hasModel()) {
            return;
        }
        const textModel = editor.getModel();
        inlineChatSessions.getSession2(textModel.uri)?.dispose();
    }
}
export class RevealWidget extends AbstractInline2ChatAction {
    constructor() {
        super({
            id: 'inlineChat2.reveal',
            title: localize2('reveal', "Toggle Inline Chat"),
            f1: true,
            icon: Codicon.copilot,
            precondition: ContextKeyExpr.and(ctxIsGlobalEditingSession.negate(), ContextKeyExpr.greaterEquals(ctxRequestCount.key, 1)),
            toggled: CTX_INLINE_CHAT_VISIBLE,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 39 /* KeyCode.KeyI */
            },
            menu: {
                id: MenuId.ChatEditingEditorContent,
                when: ContextKeyExpr.and(ContextKeyExpr.greaterEquals(ctxRequestCount.key, 1), ctxIsGlobalEditingSession.negate()),
                group: 'navigate',
                order: 4,
            }
        });
    }
    runInlineChatCommand(_accessor, ctrl, _editor) {
        ctrl.toggleWidgetUntilNextRequest();
        ctrl.markActiveController();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lQ2hhdEFjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9pbmxpbmVDaGF0L2Jyb3dzZXIvaW5saW5lQ2hhdEFjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRTlELE9BQU8sRUFBZSxZQUFZLEVBQUUsWUFBWSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDdEcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQy9FLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDBFQUEwRSxDQUFDO0FBQ3BILE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDBFQUEwRSxDQUFDO0FBQ3BILE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ25GLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxxQkFBcUIsRUFBRSxxQkFBcUIsRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQ3JJLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSx5QkFBeUIsRUFBRSxtQ0FBbUMsRUFBRSx1QkFBdUIsRUFBRSxrQ0FBa0MsRUFBRSxpQ0FBaUMsRUFBRSx1QkFBdUIsRUFBRSxxQ0FBcUMsRUFBRSw4QkFBOEIsRUFBRSxtQ0FBbUMsRUFBRSw2QkFBNkIsRUFBMEIsMEJBQTBCLEVBQUUsbUJBQW1CLEVBQUUsa0JBQWtCLEVBQUUsK0JBQStCLEVBQUUsaUNBQWlDLEVBQUUscUJBQXFCLEVBQUUsc0JBQXNCLEVBQUUsd0JBQXdCLEVBQUUsWUFBWSxFQUFFLDBCQUEwQixFQUFFLHFCQUFxQixFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDL3FCLE9BQU8sRUFB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