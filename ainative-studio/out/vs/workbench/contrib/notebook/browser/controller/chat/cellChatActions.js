/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../../../../base/common/codicons.js';
import { KeyChord } from '../../../../../../base/common/keyCodes.js';
import { EditorContextKeys } from '../../../../../../editor/common/editorContextKeys.js';
import { localize, localize2 } from '../../../../../../nls.js';
import { CONTEXT_ACCESSIBILITY_MODE_ENABLED } from '../../../../../../platform/accessibility/common/accessibility.js';
import { MenuId, MenuRegistry, registerAction2 } from '../../../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr } from '../../../../../../platform/contextkey/common/contextkey.js';
import { InputFocusedContextKey } from '../../../../../../platform/contextkey/common/contextkeys.js';
import { CTX_INLINE_CHAT_FOCUSED, CTX_INLINE_CHAT_INNER_CURSOR_FIRST, CTX_INLINE_CHAT_INNER_CURSOR_LAST, CTX_INLINE_CHAT_REQUEST_IN_PROGRESS, CTX_INLINE_CHAT_RESPONSE_TYPE, CTX_INLINE_CHAT_VISIBLE, MENU_INLINE_CHAT_WIDGET_STATUS } from '../../../../inlineChat/common/inlineChat.js';
import { CTX_NOTEBOOK_CELL_CHAT_FOCUSED, CTX_NOTEBOOK_CHAT_HAS_ACTIVE_REQUEST, CTX_NOTEBOOK_CHAT_HAS_AGENT, CTX_NOTEBOOK_CHAT_OUTER_FOCUS_POSITION, CTX_NOTEBOOK_CHAT_USER_DID_EDIT, MENU_CELL_CHAT_INPUT, MENU_CELL_CHAT_WIDGET, MENU_CELL_CHAT_WIDGET_STATUS } from './notebookChatContext.js';
import { NotebookChatController } from './notebookChatController.js';
import { CELL_TITLE_CELL_GROUP_ID, NotebookAction, NotebookCellAction, getContextFromActiveEditor, getEditorFromArgsOrActivePane } from '../coreActions.js';
import { insertNewCell } from '../insertCellActions.js';
import { CellEditState } from '../../notebookBrowser.js';
import { CellKind, NOTEBOOK_EDITOR_CURSOR_BOUNDARY, NotebookSetting } from '../../../common/notebookCommon.js';
import { IS_COMPOSITE_NOTEBOOK, NOTEBOOK_CELL_EDITOR_FOCUSED, NOTEBOOK_CELL_GENERATED_BY_CHAT, NOTEBOOK_EDITOR_EDITABLE, NOTEBOOK_EDITOR_FOCUSED } from '../../../common/notebookContextKeys.js';
import { Iterable } from '../../../../../../base/common/iterator.js';
import { IEditorService } from '../../../../../services/editor/common/editorService.js';
import { ChatContextKeys } from '../../../../chat/common/chatContextKeys.js';
import { InlineChatController } from '../../../../inlineChat/browser/inlineChatController.js';
import { EditorAction2 } from '../../../../../../editor/browser/editorExtensions.js';
registerAction2(class extends NotebookAction {
    constructor() {
        super({
            id: 'notebook.cell.chat.accept',
            title: localize2('notebook.cell.chat.accept', "Make Request"),
            icon: Codicon.send,
            keybinding: {
                when: ContextKeyExpr.and(CTX_NOTEBOOK_CELL_CHAT_FOCUSED, CTX_INLINE_CHAT_FOCUSED, NOTEBOOK_CELL_EDITOR_FOCUSED.negate()),
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 3 /* KeyCode.Enter */
            },
            menu: {
                id: MENU_CELL_CHAT_INPUT,
                group: 'navigation',
                order: 1,
                when: CTX_NOTEBOOK_CHAT_HAS_ACTIVE_REQUEST.negate()
            },
            f1: false
        });
    }
    async runWithContext(accessor, context) {
        NotebookChatController.get(context.notebookEditor)?.acceptInput();
    }
});
registerAction2(class extends NotebookCellAction {
    constructor() {
        super({
            id: 'notebook.cell.chat.arrowOutUp',
            title: localize('arrowUp', 'Cursor Up'),
            keybinding: {
                when: ContextKeyExpr.and(CTX_NOTEBOOK_CELL_CHAT_FOCUSED, CTX_INLINE_CHAT_FOCUSED, CTX_INLINE_CHAT_INNER_CURSOR_FIRST, NOTEBOOK_CELL_EDITOR_FOCUSED.negate(), CONTEXT_ACCESSIBILITY_MODE_ENABLED.negate()),
                weight: 0 /* KeybindingWeight.EditorCore */ + 7,
                primary: 2048 /* KeyMod.CtrlCmd */ | 16 /* KeyCode.UpArrow */
            },
            f1: false
        });
    }
    async runWithContext(accessor, context) {
        const editor = context.notebookEditor;
        const activeCell = context.cell;
        const idx = editor.getCellIndex(activeCell);
        if (typeof idx !== 'number') {
            return;
        }
        if (idx < 1 || editor.getLength() === 0) {
            // we don't do loop
            return;
        }
        const newCell = editor.cellAt(idx - 1);
        const newFocusMode = newCell.cellKind === CellKind.Markup && newCell.getEditState() === CellEditState.Preview ? 'container' : 'editor';
        const focusEditorLine = newCell.textBuffer.getLineCount();
        await editor.focusNotebookCell(newCell, newFocusMode, { focusEditorLine: focusEditorLine });
    }
});
registerAction2(class extends NotebookAction {
    constructor() {
        super({
            id: 'notebook.cell.chat.arrowOutDown',
            title: localize('arrowDown', 'Cursor Down'),
            keybinding: {
                when: ContextKeyExpr.and(CTX_NOTEBOOK_CELL_CHAT_FOCUSED, CTX_INLINE_CHAT_FOCUSED, CTX_INLINE_CHAT_INNER_CURSOR_LAST, NOTEBOOK_CELL_EDITOR_FOCUSED.negate(), CONTEXT_ACCESSIBILITY_MODE_ENABLED.negate()),
                weight: 0 /* KeybindingWeight.EditorCore */ + 7,
                primary: 2048 /* KeyMod.CtrlCmd */ | 18 /* KeyCode.DownArrow */
            },
            f1: false
        });
    }
    async runWithContext(accessor, context) {
        await NotebookChatController.get(context.notebookEditor)?.focusNext();
    }
});
registerAction2(class extends NotebookCellAction {
    constructor() {
        super({
            id: 'notebook.cell.focusChatWidget',
            title: localize('focusChatWidget', 'Focus Chat Widget'),
            keybinding: {
                when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, CONTEXT_ACCESSIBILITY_MODE_ENABLED.negate(), ContextKeyExpr.and(ContextKeyExpr.has(InputFocusedContextKey), EditorContextKeys.editorTextFocus, NOTEBOOK_EDITOR_CURSOR_BOUNDARY.notEqualsTo('bottom'), NOTEBOOK_EDITOR_CURSOR_BOUNDARY.notEqualsTo('none')), EditorContextKeys.isEmbeddedDiffEditor.negate()),
                weight: 0 /* KeybindingWeight.EditorCore */ + 7,
                primary: 2048 /* KeyMod.CtrlCmd */ | 16 /* KeyCode.UpArrow */
            },
            f1: false
        });
    }
    async runWithContext(accessor, context) {
        const index = context.notebookEditor.getCellIndex(context.cell);
        await NotebookChatController.get(context.notebookEditor)?.focusNearestWidget(index, 'above');
    }
});
registerAction2(class extends NotebookCellAction {
    constructor() {
        super({
            id: 'notebook.cell.focusNextChatWidget',
            title: localize('focusNextChatWidget', 'Focus Next Cell Chat Widget'),
            keybinding: {
                when: ContextKeyExpr.and(CONTEXT_ACCESSIBILITY_MODE_ENABLED.negate(), ContextKeyExpr.and(ContextKeyExpr.has(InputFocusedContextKey), EditorContextKeys.editorTextFocus, NOTEBOOK_EDITOR_CURSOR_BOUNDARY.notEqualsTo('top'), NOTEBOOK_EDITOR_CURSOR_BOUNDARY.notEqualsTo('none')), EditorContextKeys.isEmbeddedDiffEditor.negate()),
                weight: 0 /* KeybindingWeight.EditorCore */ + 7,
                primary: 2048 /* KeyMod.CtrlCmd */ | 18 /* KeyCode.DownArrow */
            },
            f1: false,
            precondition: ContextKeyExpr.or(ContextKeyExpr.and(IS_COMPOSITE_NOTEBOOK.negate(), NOTEBOOK_CELL_EDITOR_FOCUSED), ContextKeyExpr.and(IS_COMPOSITE_NOTEBOOK, NOTEBOOK_CELL_EDITOR_FOCUSED.negate()))
        });
    }
    async runWithContext(accessor, context) {
        const index = context.notebookEditor.getCellIndex(context.cell);
        await NotebookChatController.get(context.notebookEditor)?.focusNearestWidget(index, 'below');
    }
});
registerAction2(class extends NotebookAction {
    constructor() {
        super({
            id: 'notebook.cell.chat.stop',
            title: localize2('notebook.cell.chat.stop', "Stop Request"),
            icon: Codicon.debugStop,
            menu: {
                id: MENU_CELL_CHAT_INPUT,
                group: 'navigation',
                order: 1,
                when: CTX_NOTEBOOK_CHAT_HAS_ACTIVE_REQUEST
            },
            f1: false
        });
    }
    async runWithContext(accessor, context) {
        NotebookChatController.get(context.notebookEditor)?.cancelCurrentRequest(false);
    }
});
registerAction2(class extends NotebookAction {
    constructor() {
        super({
            id: 'notebook.cell.chat.close',
            title: localize2('notebook.cell.chat.close', "Close Chat"),
            icon: Codicon.close,
            menu: {
                id: MENU_CELL_CHAT_WIDGET,
                group: 'navigation',
                order: 2
            },
            f1: false
        });
    }
    async runWithContext(accessor, context) {
        NotebookChatController.get(context.notebookEditor)?.dismiss(false);
    }
});
registerAction2(class extends NotebookAction {
    constructor() {
        super({
            id: 'notebook.cell.chat.acceptChanges',
            title: localize2('apply1', "Accept Changes"),
            shortTitle: localize('apply2', 'Accept'),
            icon: Codicon.check,
            tooltip: localize('apply3', 'Accept Changes'),
            keybinding: [
                {
                    when: ContextKeyExpr.and(CTX_NOTEBOOK_CELL_CHAT_FOCUSED, CTX_INLINE_CHAT_FOCUSED, NOTEBOOK_CELL_EDITOR_FOCUSED.negate()),
                    weight: 100 /* KeybindingWeight.EditorContrib */ + 10,
                    primary: 2048 /* KeyMod.CtrlCmd */ | 3 /* KeyCode.Enter */,
                },
                {
                    when: ContextKeyExpr.and(CTX_NOTEBOOK_CELL_CHAT_FOCUSED, CTX_INLINE_CHAT_FOCUSED, CTX_NOTEBOOK_CHAT_USER_DID_EDIT, NOTEBOOK_CELL_EDITOR_FOCUSED.negate()),
                    weight: 0 /* KeybindingWeight.EditorCore */ + 10,
                    primary: 9 /* KeyCode.Escape */
                },
                {
                    when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, ContextKeyExpr.not(InputFocusedContextKey), NOTEBOOK_CELL_EDITOR_FOCUSED.negate(), CTX_NOTEBOOK_CHAT_OUTER_FOCUS_POSITION.isEqualTo('below')),
                    primary: 2048 /* KeyMod.CtrlCmd */ | 3 /* KeyCode.Enter */,
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */
                }
            ],
            menu: [
                {
                    id: MENU_CELL_CHAT_WIDGET_STATUS,
                    group: '0_main',
                    order: 0,
                    when: CTX_INLINE_CHAT_RESPONSE_TYPE.notEqualsTo("messages" /* InlineChatResponseType.Messages */),
                }
            ],
            f1: false
        });
    }
    async runWithContext(accessor, context) {
        NotebookChatController.get(context.notebookEditor)?.acceptSession();
    }
});
registerAction2(class extends NotebookAction {
    constructor() {
        super({
            id: 'notebook.cell.chat.discard',
            title: localize('discard', 'Discard'),
            icon: Codicon.discard,
            keybinding: {
                when: ContextKeyExpr.and(CTX_NOTEBOOK_CELL_CHAT_FOCUSED, CTX_INLINE_CHAT_FOCUSED, CTX_NOTEBOOK_CHAT_USER_DID_EDIT.negate(), NOTEBOOK_CELL_EDITOR_FOCUSED.negate()),
                weight: 100 /* KeybindingWeight.EditorContrib */,
                primary: 9 /* KeyCode.Escape */
            },
            menu: {
                id: MENU_CELL_CHAT_WIDGET_STATUS,
                group: '0_main',
                order: 1
            },
            f1: false
        });
    }
    async runWithContext(accessor, context) {
        NotebookChatController.get(context.notebookEditor)?.discard();
    }
});
async function startChat(accessor, context, index, input, autoSend, source) {
    const configurationService = accessor.get(IConfigurationService);
    const commandService = accessor.get(ICommandService);
    if (configurationService.getValue(NotebookSetting.cellGenerate) || configurationService.getValue(NotebookSetting.cellChat)) {
        const activeCell = context.notebookEditor.getActiveCell();
        const targetCell = activeCell?.getTextLength() === 0 && source !== 'insertToolbar' ? activeCell : (await insertNewCell(accessor, context, CellKind.Code, 'below', true));
        if (targetCell) {
            targetCell.enableAutoLanguageDetection();
            await context.notebookEditor.revealFirstLineIfOutsideViewport(targetCell);
            const codeEditor = context.notebookEditor.codeEditors.find(ce => ce[0] === targetCell)?.[1];
            if (codeEditor) {
                codeEditor.focus();
                commandService.executeCommand('inlineChat.start');
            }
        }
    }
}
registerAction2(class extends NotebookAction {
    constructor() {
        super({
            id: 'notebook.cell.chat.start',
            title: {
                value: '$(sparkle) ' + localize('notebookActions.menu.insertCodeCellWithChat', "Generate"),
                original: '$(sparkle) Generate',
            },
            tooltip: localize('notebookActions.menu.insertCodeCellWithChat.tooltip', "Start Chat to Generate Code"),
            metadata: {
                description: localize('notebookActions.menu.insertCodeCellWithChat.tooltip', "Start Chat to Generate Code"),
                args: [
                    {
                        name: 'args',
                        schema: {
                            type: 'object',
                            required: ['index'],
                            properties: {
                                'index': {
                                    type: 'number'
                                },
                                'input': {
                                    type: 'string'
                                },
                                'autoSend': {
                                    type: 'boolean'
                                }
                            }
                        }
                    }
                ]
            },
            f1: false,
            keybinding: {
                when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, NOTEBOOK_EDITOR_EDITABLE.isEqualTo(true), ContextKeyExpr.not(InputFocusedContextKey), CTX_NOTEBOOK_CHAT_HAS_AGENT, ContextKeyExpr.or(ContextKeyExpr.equals(`config.${NotebookSetting.cellChat}`, true), ContextKeyExpr.equals(`config.${NotebookSetting.cellGenerate}`, true))),
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 39 /* KeyCode.KeyI */,
                secondary: [KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 39 /* KeyCode.KeyI */)],
            },
            menu: [
                {
                    id: MenuId.NotebookCellBetween,
                    group: 'inline',
                    order: -1,
                    when: ContextKeyExpr.and(NOTEBOOK_EDITOR_EDITABLE.isEqualTo(true), CTX_NOTEBOOK_CHAT_HAS_AGENT, ContextKeyExpr.or(ContextKeyExpr.equals(`config.${NotebookSetting.cellChat}`, true), ContextKeyExpr.equals(`config.${NotebookSetting.cellGenerate}`, true)))
                }
            ]
        });
    }
    getEditorContextFromArgsOrActive(accessor, ...args) {
        const [firstArg] = args;
        if (!firstArg) {
            const notebookEditor = getEditorFromArgsOrActivePane(accessor);
            if (!notebookEditor) {
                return undefined;
            }
            const activeCell = notebookEditor.getActiveCell();
            if (!activeCell) {
                return undefined;
            }
            return {
                cell: activeCell,
                notebookEditor,
                input: undefined,
                autoSend: undefined
            };
        }
        if (typeof firstArg !== 'object' || typeof firstArg.index !== 'number') {
            return undefined;
        }
        const notebookEditor = getEditorFromArgsOrActivePane(accessor);
        if (!notebookEditor) {
            return undefined;
        }
        const cell = firstArg.index <= 0 ? undefined : notebookEditor.cellAt(firstArg.index - 1);
        return {
            cell,
            notebookEditor,
            input: firstArg.input,
            autoSend: firstArg.autoSend
        };
    }
    async runWithContext(accessor, context) {
        const index = Math.max(0, context.cell ? context.notebookEditor.getCellIndex(context.cell) + 1 : 0);
        await startChat(accessor, context, index, context.input, context.autoSend, context.source);
    }
});
registerAction2(class extends NotebookAction {
    constructor() {
        super({
            id: 'notebook.cell.chat.startAtTop',
            title: {
                value: '$(sparkle) ' + localize('notebookActions.menu.insertCodeCellWithChat', "Generate"),
                original: '$(sparkle) Generate',
            },
            tooltip: localize('notebookActions.menu.insertCodeCellWithChat.tooltip', "Start Chat to Generate Code"),
            f1: false,
            menu: [
                {
                    id: MenuId.NotebookCellListTop,
                    group: 'inline',
                    order: -1,
                    when: ContextKeyExpr.and(NOTEBOOK_EDITOR_EDITABLE.isEqualTo(true), CTX_NOTEBOOK_CHAT_HAS_AGENT, ContextKeyExpr.or(ContextKeyExpr.equals(`config.${NotebookSetting.cellChat}`, true), ContextKeyExpr.equals(`config.${NotebookSetting.cellGenerate}`, true)))
                },
            ]
        });
    }
    async runWithContext(accessor, context) {
        await startChat(accessor, context, 0, '', false);
    }
});
MenuRegistry.appendMenuItem(MenuId.NotebookToolbar, {
    command: {
        id: 'notebook.cell.chat.start',
        icon: Codicon.sparkle,
        title: localize('notebookActions.menu.insertCode.ontoolbar', "Generate"),
        tooltip: localize('notebookActions.menu.insertCode.tooltip', "Start Chat to Generate Code")
    },
    order: -10,
    group: 'navigation/add',
    when: ContextKeyExpr.and(NOTEBOOK_EDITOR_EDITABLE.isEqualTo(true), ContextKeyExpr.notEquals('config.notebook.insertToolbarLocation', 'betweenCells'), ContextKeyExpr.notEquals('config.notebook.insertToolbarLocation', 'hidden'), CTX_NOTEBOOK_CHAT_HAS_AGENT, ContextKeyExpr.or(ContextKeyExpr.equals(`config.${NotebookSetting.cellChat}`, true), ContextKeyExpr.equals(`config.${NotebookSetting.cellGenerate}`, true)))
});
registerAction2(class extends NotebookAction {
    constructor() {
        super({
            id: 'notebook.cell.chat.focus',
            title: localize('focusNotebookChat', 'Focus Chat'),
            keybinding: [
                {
                    when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, ContextKeyExpr.not(InputFocusedContextKey), CTX_NOTEBOOK_CHAT_OUTER_FOCUS_POSITION.isEqualTo('above')),
                    primary: 2048 /* KeyMod.CtrlCmd */ | 18 /* KeyCode.DownArrow */,
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */
                },
                {
                    when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, ContextKeyExpr.not(InputFocusedContextKey), CTX_NOTEBOOK_CHAT_OUTER_FOCUS_POSITION.isEqualTo('below')),
                    primary: 2048 /* KeyMod.CtrlCmd */ | 16 /* KeyCode.UpArrow */,
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */
                }
            ],
            f1: false
        });
    }
    async runWithContext(accessor, context) {
        NotebookChatController.get(context.notebookEditor)?.focus();
    }
});
registerAction2(class extends NotebookAction {
    constructor() {
        super({
            id: 'notebook.cell.chat.focusNextCell',
            title: localize('focusNextCell', 'Focus Next Cell'),
            keybinding: [
                {
                    when: ContextKeyExpr.and(CTX_NOTEBOOK_CELL_CHAT_FOCUSED, CTX_INLINE_CHAT_FOCUSED),
                    primary: 2048 /* KeyMod.CtrlCmd */ | 18 /* KeyCode.DownArrow */,
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */
                }
            ],
            f1: false
        });
    }
    async runWithContext(accessor, context) {
        NotebookChatController.get(context.notebookEditor)?.focusNext();
    }
});
registerAction2(class extends NotebookAction {
    constructor() {
        super({
            id: 'notebook.cell.chat.focusPreviousCell',
            title: localize('focusPreviousCell', 'Focus Previous Cell'),
            keybinding: [
                {
                    when: ContextKeyExpr.and(CTX_NOTEBOOK_CELL_CHAT_FOCUSED, CTX_INLINE_CHAT_FOCUSED),
                    primary: 2048 /* KeyMod.CtrlCmd */ | 16 /* KeyCode.UpArrow */,
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */
                }
            ],
            f1: false
        });
    }
    async runWithContext(accessor, context) {
        NotebookChatController.get(context.notebookEditor)?.focusAbove();
    }
});
registerAction2(class extends NotebookAction {
    constructor() {
        super({
            id: 'notebook.cell.chat.previousFromHistory',
            title: localize2('notebook.cell.chat.previousFromHistory', "Previous From History"),
            precondition: ContextKeyExpr.and(CTX_NOTEBOOK_CELL_CHAT_FOCUSED, CTX_INLINE_CHAT_FOCUSED),
            keybinding: {
                when: ContextKeyExpr.and(CTX_NOTEBOOK_CELL_CHAT_FOCUSED, CTX_INLINE_CHAT_FOCUSED),
                weight: 0 /* KeybindingWeight.EditorCore */ + 10,
                primary: 16 /* KeyCode.UpArrow */,
            },
            f1: false
        });
    }
    async runWithContext(accessor, context) {
        NotebookChatController.get(context.notebookEditor)?.populateHistory(true);
    }
});
registerAction2(class extends NotebookAction {
    constructor() {
        super({
            id: 'notebook.cell.chat.nextFromHistory',
            title: localize2('notebook.cell.chat.nextFromHistory', "Next From History"),
            precondition: ContextKeyExpr.and(CTX_NOTEBOOK_CELL_CHAT_FOCUSED, CTX_INLINE_CHAT_FOCUSED),
            keybinding: {
                when: ContextKeyExpr.and(CTX_NOTEBOOK_CELL_CHAT_FOCUSED, CTX_INLINE_CHAT_FOCUSED),
                weight: 0 /* KeybindingWeight.EditorCore */ + 10,
                primary: 18 /* KeyCode.DownArrow */
            },
            f1: false
        });
    }
    async runWithContext(accessor, context) {
        NotebookChatController.get(context.notebookEditor)?.populateHistory(false);
    }
});
registerAction2(class extends NotebookCellAction {
    constructor() {
        super({
            id: 'notebook.cell.chat.restore',
            title: localize2('notebookActions.restoreCellprompt', "Generate"),
            icon: Codicon.sparkle,
            menu: {
                id: MenuId.NotebookCellTitle,
                group: CELL_TITLE_CELL_GROUP_ID,
                order: 0,
                when: ContextKeyExpr.and(NOTEBOOK_EDITOR_EDITABLE.isEqualTo(true), CTX_NOTEBOOK_CHAT_HAS_AGENT, NOTEBOOK_CELL_GENERATED_BY_CHAT, ContextKeyExpr.equals(`config.${NotebookSetting.cellChat}`, true))
            },
            f1: false
        });
    }
    async runWithContext(accessor, context) {
        const cell = context.cell;
        if (!cell) {
            return;
        }
        const notebookEditor = context.notebookEditor;
        const controller = NotebookChatController.get(notebookEditor);
        if (!controller) {
            return;
        }
        const prompt = controller.getPromptFromCache(cell);
        if (prompt) {
            controller.restore(cell, prompt);
        }
    }
});
export class AcceptChangesAndRun extends EditorAction2 {
    constructor() {
        super({
            id: 'notebook.inlineChat.acceptChangesAndRun',
            title: localize2('notebook.apply1', "Accept and Run"),
            shortTitle: localize('notebook.apply2', 'Accept & Run'),
            tooltip: localize('notebook.apply3', 'Accept the changes and run the cell'),
            icon: Codicon.check,
            f1: true,
            precondition: ContextKeyExpr.and(NOTEBOOK_EDITOR_EDITABLE.isEqualTo(true), CTX_INLINE_CHAT_VISIBLE),
            keybinding: undefined,
            menu: [{
                    id: MENU_INLINE_CHAT_WIDGET_STATUS,
                    group: '0_main',
                    order: 2,
                    when: ContextKeyExpr.and(NOTEBOOK_EDITOR_EDITABLE.isEqualTo(true), ChatContextKeys.inputHasText.toNegated(), CTX_INLINE_CHAT_REQUEST_IN_PROGRESS.toNegated(), CTX_INLINE_CHAT_RESPONSE_TYPE.isEqualTo("messagesAndEdits" /* InlineChatResponseType.MessagesAndEdits */))
                }]
        });
    }
    runEditorCommand(accessor, codeEditor) {
        const editor = getContextFromActiveEditor(accessor.get(IEditorService));
        const ctrl = InlineChatController.get(codeEditor);
        if (!editor || !ctrl) {
            return;
        }
        const matchedCell = editor.notebookEditor.codeEditors.find(e => e[1] === codeEditor);
        const cell = matchedCell?.[0];
        if (!cell) {
            return;
        }
        ctrl.acceptSession();
        return editor.notebookEditor.executeNotebookCells(Iterable.single(cell));
    }
}
registerAction2(AcceptChangesAndRun);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2VsbENoYXRBY3Rpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvY29udHJvbGxlci9jaGF0L2NlbGxDaGF0QWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDcEUsT0FBTyxFQUFFLFFBQVEsRUFBbUIsTUFBTSwyQ0FBMkMsQ0FBQztBQUN0RixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUN6RixPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQy9ELE9BQU8sRUFBRSxrQ0FBa0MsRUFBRSxNQUFNLGtFQUFrRSxDQUFDO0FBQ3RILE9BQU8sRUFBRSxNQUFNLEVBQUUsWUFBWSxFQUFFLGVBQWUsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQzdHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUN6RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQztBQUN6RyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDNUYsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sNkRBQTZELENBQUM7QUFHckcsT0FBTyxFQUFFLHVCQUF1QixFQUFFLGtDQUFrQyxFQUFFLGlDQUFpQyxFQUFFLG1DQUFtQyxFQUFFLDZCQUE2QixFQUFFLHVCQUF1QixFQUEwQiw4QkFBOEIsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ2xULE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxvQ0FBb0MsRUFBRSwyQkFBMkIsRUFBRSxzQ0FBc0MsRUFBRSwrQkFB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