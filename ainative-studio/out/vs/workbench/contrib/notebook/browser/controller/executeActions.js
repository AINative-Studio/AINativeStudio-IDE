/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Iterable } from '../../../../../base/common/iterator.js';
import { isEqual } from '../../../../../base/common/resources.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { ILanguageService } from '../../../../../editor/common/languages/language.js';
import { localize, localize2 } from '../../../../../nls.js';
import { MenuId, MenuRegistry, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { IDebugService } from '../../../debug/common/debug.js';
import { CTX_INLINE_CHAT_FOCUSED } from '../../../inlineChat/common/inlineChat.js';
import { insertCell } from './cellOperations.js';
import { NotebookChatController } from './chat/notebookChatController.js';
import { CELL_TITLE_CELL_GROUP_ID, NOTEBOOK_EDITOR_WIDGET_ACTION_WEIGHT, NotebookAction, NotebookCellAction, NotebookMultiCellAction, cellExecutionArgs, getContextFromActiveEditor, getContextFromUri, parseMultiCellExecutionArgs } from './coreActions.js';
import { CellEditState, CellFocusMode, EXECUTE_CELL_COMMAND_ID, ScrollToRevealBehavior } from '../notebookBrowser.js';
import * as icons from '../notebookIcons.js';
import { CellKind, CellUri, NotebookSetting } from '../../common/notebookCommon.js';
import { NOTEBOOK_CELL_EXECUTING, NOTEBOOK_CELL_EXECUTION_STATE, NOTEBOOK_CELL_LIST_FOCUSED, NOTEBOOK_CELL_TYPE, NOTEBOOK_HAS_RUNNING_CELL, NOTEBOOK_HAS_SOMETHING_RUNNING, NOTEBOOK_INTERRUPTIBLE_KERNEL, NOTEBOOK_IS_ACTIVE_EDITOR, NOTEBOOK_KERNEL_COUNT, NOTEBOOK_KERNEL_SOURCE_COUNT, NOTEBOOK_LAST_CELL_FAILED, NOTEBOOK_MISSING_KERNEL_EXTENSION } from '../../common/notebookContextKeys.js';
import { NotebookEditorInput } from '../../common/notebookEditorInput.js';
import { INotebookExecutionStateService } from '../../common/notebookExecutionStateService.js';
import { IEditorGroupsService } from '../../../../services/editor/common/editorGroupsService.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
const EXECUTE_NOTEBOOK_COMMAND_ID = 'notebook.execute';
const CANCEL_NOTEBOOK_COMMAND_ID = 'notebook.cancelExecution';
const INTERRUPT_NOTEBOOK_COMMAND_ID = 'notebook.interruptExecution';
const CANCEL_CELL_COMMAND_ID = 'notebook.cell.cancelExecution';
const EXECUTE_CELL_FOCUS_CONTAINER_COMMAND_ID = 'notebook.cell.executeAndFocusContainer';
const EXECUTE_CELL_SELECT_BELOW = 'notebook.cell.executeAndSelectBelow';
const EXECUTE_CELL_INSERT_BELOW = 'notebook.cell.executeAndInsertBelow';
const EXECUTE_CELL_AND_BELOW = 'notebook.cell.executeCellAndBelow';
const EXECUTE_CELLS_ABOVE = 'notebook.cell.executeCellsAbove';
const RENDER_ALL_MARKDOWN_CELLS = 'notebook.renderAllMarkdownCells';
const REVEAL_RUNNING_CELL = 'notebook.revealRunningCell';
const REVEAL_LAST_FAILED_CELL = 'notebook.revealLastFailedCell';
// If this changes, update getCodeCellExecutionContextKeyService to match
export const executeCondition = ContextKeyExpr.and(NOTEBOOK_CELL_TYPE.isEqualTo('code'), ContextKeyExpr.or(ContextKeyExpr.greater(NOTEBOOK_KERNEL_COUNT.key, 0), ContextKeyExpr.greater(NOTEBOOK_KERNEL_SOURCE_COUNT.key, 0), NOTEBOOK_MISSING_KERNEL_EXTENSION));
export const executeThisCellCondition = ContextKeyExpr.and(executeCondition, NOTEBOOK_CELL_EXECUTING.toNegated());
export const executeSectionCondition = ContextKeyExpr.and(NOTEBOOK_CELL_TYPE.isEqualTo('markup'));
function renderAllMarkdownCells(context) {
    for (let i = 0; i < context.notebookEditor.getLength(); i++) {
        const cell = context.notebookEditor.cellAt(i);
        if (cell.cellKind === CellKind.Markup) {
            cell.updateEditState(CellEditState.Preview, 'renderAllMarkdownCells');
        }
    }
}
async function runCell(editorGroupsService, context) {
    const group = editorGroupsService.activeGroup;
    if (group) {
        if (group.activeEditor) {
            group.pinEditor(group.activeEditor);
        }
    }
    if (context.ui && context.cell) {
        await context.notebookEditor.executeNotebookCells(Iterable.single(context.cell));
        if (context.autoReveal) {
            const cellIndex = context.notebookEditor.getCellIndex(context.cell);
            context.notebookEditor.revealCellRangeInView({ start: cellIndex, end: cellIndex + 1 });
        }
    }
    else if (context.selectedCells?.length || context.cell) {
        const selectedCells = context.selectedCells?.length ? context.selectedCells : [context.cell];
        await context.notebookEditor.executeNotebookCells(selectedCells);
        const firstCell = selectedCells[0];
        if (firstCell && context.autoReveal) {
            const cellIndex = context.notebookEditor.getCellIndex(firstCell);
            context.notebookEditor.revealCellRangeInView({ start: cellIndex, end: cellIndex + 1 });
        }
    }
    let foundEditor = undefined;
    for (const [, codeEditor] of context.notebookEditor.codeEditors) {
        if (isEqual(codeEditor.getModel()?.uri, (context.cell ?? context.selectedCells?.[0])?.uri)) {
            foundEditor = codeEditor;
            break;
        }
    }
    if (!foundEditor) {
        return;
    }
}
registerAction2(class RenderAllMarkdownCellsAction extends NotebookAction {
    constructor() {
        super({
            id: RENDER_ALL_MARKDOWN_CELLS,
            title: localize('notebookActions.renderMarkdown', "Render All Markdown Cells"),
        });
    }
    async runWithContext(accessor, context) {
        renderAllMarkdownCells(context);
    }
});
registerAction2(class ExecuteNotebookAction extends NotebookAction {
    constructor() {
        super({
            id: EXECUTE_NOTEBOOK_COMMAND_ID,
            title: localize('notebookActions.executeNotebook', "Run All"),
            icon: icons.executeAllIcon,
            metadata: {
                description: localize('notebookActions.executeNotebook', "Run All"),
                args: [
                    {
                        name: 'uri',
                        description: 'The document uri'
                    }
                ]
            },
            menu: [
                {
                    id: MenuId.EditorTitle,
                    order: -1,
                    group: 'navigation',
                    when: ContextKeyExpr.and(NOTEBOOK_IS_ACTIVE_EDITOR, ContextKeyExpr.or(NOTEBOOK_INTERRUPTIBLE_KERNEL.toNegated(), NOTEBOOK_HAS_SOMETHING_RUNNING.toNegated()), ContextKeyExpr.notEquals('config.notebook.globalToolbar', true))
                },
                {
                    id: MenuId.NotebookToolbar,
                    order: -1,
                    group: 'navigation/execute',
                    when: ContextKeyExpr.and(ContextKeyExpr.or(NOTEBOOK_INTERRUPTIBLE_KERNEL.toNegated(), NOTEBOOK_HAS_SOMETHING_RUNNING.toNegated()), ContextKeyExpr.and(NOTEBOOK_HAS_SOMETHING_RUNNING, NOTEBOOK_INTERRUPTIBLE_KERNEL.toNegated())?.negate(), ContextKeyExpr.equals('config.notebook.globalToolbar', true))
                }
            ]
        });
    }
    getEditorContextFromArgsOrActive(accessor, context) {
        return getContextFromUri(accessor, context) ?? getContextFromActiveEditor(accessor.get(IEditorService));
    }
    async runWithContext(accessor, context) {
        renderAllMarkdownCells(context);
        const editorService = accessor.get(IEditorService);
        const editor = editorService.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */).find(editor => editor.editor instanceof NotebookEditorInput && editor.editor.viewType === context.notebookEditor.textModel.viewType && editor.editor.resource.toString() === context.notebookEditor.textModel.uri.toString());
        const editorGroupService = accessor.get(IEditorGroupsService);
        if (editor) {
            const group = editorGroupService.getGroup(editor.groupId);
            group?.pinEditor(editor.editor);
        }
        return context.notebookEditor.executeNotebookCells();
    }
});
registerAction2(class ExecuteCell extends NotebookMultiCellAction {
    constructor() {
        super({
            id: EXECUTE_CELL_COMMAND_ID,
            precondition: executeThisCellCondition,
            title: localize('notebookActions.execute', "Execute Cell"),
            keybinding: {
                when: NOTEBOOK_CELL_LIST_FOCUSED,
                primary: 256 /* KeyMod.WinCtrl */ | 3 /* KeyCode.Enter */,
                win: {
                    primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 3 /* KeyCode.Enter */
                },
                weight: NOTEBOOK_EDITOR_WIDGET_ACTION_WEIGHT
            },
            menu: {
                id: MenuId.NotebookCellExecutePrimary,
                when: executeThisCellCondition,
                group: 'inline'
            },
            metadata: {
                description: localize('notebookActions.execute', "Execute Cell"),
                args: cellExecutionArgs
            },
            icon: icons.executeIcon
        });
    }
    parseArgs(accessor, ...args) {
        return parseMultiCellExecutionArgs(accessor, ...args);
    }
    async runWithContext(accessor, context) {
        const editorGroupsService = accessor.get(IEditorGroupsService);
        if (context.ui) {
            await context.notebookEditor.focusNotebookCell(context.cell, 'container', { skipReveal: true });
        }
        const chatController = NotebookChatController.get(context.notebookEditor);
        const editingCell = chatController?.getEditingCell();
        if (chatController?.hasFocus() && editingCell) {
            const group = editorGroupsService.activeGroup;
            if (group) {
                if (group.activeEditor) {
                    group.pinEditor(group.activeEditor);
                }
            }
            await context.notebookEditor.executeNotebookCells([editingCell]);
            return;
        }
        await runCell(editorGroupsService, context);
    }
});
registerAction2(class ExecuteAboveCells extends NotebookMultiCellAction {
    constructor() {
        super({
            id: EXECUTE_CELLS_ABOVE,
            precondition: executeCondition,
            title: localize('notebookActions.executeAbove', "Execute Above Cells"),
            menu: [
                {
                    id: MenuId.NotebookCellExecute,
                    when: ContextKeyExpr.and(executeCondition, ContextKeyExpr.equals(`config.${NotebookSetting.consolidatedRunButton}`, true))
                },
                {
                    id: MenuId.NotebookCellTitle,
                    order: 2 /* CellToolbarOrder.ExecuteAboveCells */,
                    group: CELL_TITLE_CELL_GROUP_ID,
                    when: ContextKeyExpr.and(executeCondition, ContextKeyExpr.equals(`config.${NotebookSetting.consolidatedRunButton}`, false))
                }
            ],
            icon: icons.executeAboveIcon
        });
    }
    parseArgs(accessor, ...args) {
        return parseMultiCellExecutionArgs(accessor, ...args);
    }
    async runWithContext(accessor, context) {
        let endCellIdx = undefined;
        if (context.ui) {
            endCellIdx = context.notebookEditor.getCellIndex(context.cell);
            await context.notebookEditor.focusNotebookCell(context.cell, 'container', { skipReveal: true });
        }
        else {
            endCellIdx = Math.min(...context.selectedCells.map(cell => context.notebookEditor.getCellIndex(cell)));
        }
        if (typeof endCellIdx === 'number') {
            const range = { start: 0, end: endCellIdx };
            const cells = context.notebookEditor.getCellsInRange(range);
            context.notebookEditor.executeNotebookCells(cells);
        }
    }
});
registerAction2(class ExecuteCellAndBelow extends NotebookMultiCellAction {
    constructor() {
        super({
            id: EXECUTE_CELL_AND_BELOW,
            precondition: executeCondition,
            title: localize('notebookActions.executeBelow', "Execute Cell and Below"),
            menu: [
                {
                    id: MenuId.NotebookCellExecute,
                    when: ContextKeyExpr.and(executeCondition, ContextKeyExpr.equals(`config.${NotebookSetting.consolidatedRunButton}`, true))
                },
                {
                    id: MenuId.NotebookCellTitle,
                    order: 3 /* CellToolbarOrder.ExecuteCellAndBelow */,
                    group: CELL_TITLE_CELL_GROUP_ID,
                    when: ContextKeyExpr.and(executeCondition, ContextKeyExpr.equals(`config.${NotebookSetting.consolidatedRunButton}`, false))
                }
            ],
            icon: icons.executeBelowIcon
        });
    }
    parseArgs(accessor, ...args) {
        return parseMultiCellExecutionArgs(accessor, ...args);
    }
    async runWithContext(accessor, context) {
        let startCellIdx = undefined;
        if (context.ui) {
            startCellIdx = context.notebookEditor.getCellIndex(context.cell);
            await context.notebookEditor.focusNotebookCell(context.cell, 'container', { skipReveal: true });
        }
        else {
            startCellIdx = Math.min(...context.selectedCells.map(cell => context.notebookEditor.getCellIndex(cell)));
        }
        if (typeof startCellIdx === 'number') {
            const range = { start: startCellIdx, end: context.notebookEditor.getLength() };
            const cells = context.notebookEditor.getCellsInRange(range);
            context.notebookEditor.executeNotebookCells(cells);
        }
    }
});
registerAction2(class ExecuteCellFocusContainer extends NotebookMultiCellAction {
    constructor() {
        super({
            id: EXECUTE_CELL_FOCUS_CONTAINER_COMMAND_ID,
            precondition: executeThisCellCondition,
            title: localize('notebookActions.executeAndFocusContainer', "Execute Cell and Focus Container"),
            metadata: {
                description: localize('notebookActions.executeAndFocusContainer', "Execute Cell and Focus Container"),
                args: cellExecutionArgs
            },
            icon: icons.executeIcon
        });
    }
    parseArgs(accessor, ...args) {
        return parseMultiCellExecutionArgs(accessor, ...args);
    }
    async runWithContext(accessor, context) {
        const editorGroupsService = accessor.get(IEditorGroupsService);
        if (context.ui) {
            await context.notebookEditor.focusNotebookCell(context.cell, 'container', { skipReveal: true });
        }
        else {
            const firstCell = context.selectedCells[0];
            if (firstCell) {
                await context.notebookEditor.focusNotebookCell(firstCell, 'container', { skipReveal: true });
            }
        }
        await runCell(editorGroupsService, context);
    }
});
const cellCancelCondition = ContextKeyExpr.or(ContextKeyExpr.equals(NOTEBOOK_CELL_EXECUTION_STATE.key, 'executing'), ContextKeyExpr.equals(NOTEBOOK_CELL_EXECUTION_STATE.key, 'pending'));
registerAction2(class CancelExecuteCell extends NotebookMultiCellAction {
    constructor() {
        super({
            id: CANCEL_CELL_COMMAND_ID,
            precondition: cellCancelCondition,
            title: localize('notebookActions.cancel', "Stop Cell Execution"),
            icon: icons.stopIcon,
            menu: {
                id: MenuId.NotebookCellExecutePrimary,
                when: cellCancelCondition,
                group: 'inline'
            },
            metadata: {
                description: localize('notebookActions.cancel', "Stop Cell Execution"),
                args: [
                    {
                        name: 'options',
                        description: 'The cell range options',
                        schema: {
                            'type': 'object',
                            'required': ['ranges'],
                            'properties': {
                                'ranges': {
                                    'type': 'array',
                                    items: [
                                        {
                                            'type': 'object',
                                            'required': ['start', 'end'],
                                            'properties': {
                                                'start': {
                                                    'type': 'number'
                                                },
                                                'end': {
                                                    'type': 'number'
                                                }
                                            }
                                        }
                                    ]
                                },
                                'document': {
                                    'type': 'object',
                                    'description': 'The document uri',
                                }
                            }
                        }
                    }
                ]
            },
        });
    }
    parseArgs(accessor, ...args) {
        return parseMultiCellExecutionArgs(accessor, ...args);
    }
    async runWithContext(accessor, context) {
        if (context.ui) {
            await context.notebookEditor.focusNotebookCell(context.cell, 'container', { skipReveal: true });
            return context.notebookEditor.cancelNotebookCells(Iterable.single(context.cell));
        }
        else {
            return context.notebookEditor.cancelNotebookCells(context.selectedCells);
        }
    }
});
registerAction2(class ExecuteCellSelectBelow extends NotebookCellAction {
    constructor() {
        super({
            id: EXECUTE_CELL_SELECT_BELOW,
            precondition: ContextKeyExpr.or(executeThisCellCondition, NOTEBOOK_CELL_TYPE.isEqualTo('markup')),
            title: localize('notebookActions.executeAndSelectBelow', "Execute Notebook Cell and Select Below"),
            keybinding: {
                when: ContextKeyExpr.and(NOTEBOOK_CELL_LIST_FOCUSED, CTX_INLINE_CHAT_FOCUSED.negate()),
                primary: 1024 /* KeyMod.Shift */ | 3 /* KeyCode.Enter */,
                weight: NOTEBOOK_EDITOR_WIDGET_ACTION_WEIGHT
            },
        });
    }
    async runWithContext(accessor, context) {
        const editorGroupsService = accessor.get(IEditorGroupsService);
        const idx = context.notebookEditor.getCellIndex(context.cell);
        if (typeof idx !== 'number') {
            return;
        }
        const languageService = accessor.get(ILanguageService);
        const config = accessor.get(IConfigurationService);
        const scrollBehavior = config.getValue(NotebookSetting.scrollToRevealCell);
        let focusOptions;
        if (scrollBehavior === 'none') {
            focusOptions = { skipReveal: true };
        }
        else {
            focusOptions = {
                revealBehavior: scrollBehavior === 'fullCell' ? ScrollToRevealBehavior.fullCell : ScrollToRevealBehavior.firstLine
            };
        }
        if (context.cell.cellKind === CellKind.Markup) {
            const nextCell = context.notebookEditor.cellAt(idx + 1);
            context.cell.updateEditState(CellEditState.Preview, EXECUTE_CELL_SELECT_BELOW);
            if (nextCell) {
                await context.notebookEditor.focusNotebookCell(nextCell, 'container', focusOptions);
            }
            else {
                const newCell = insertCell(languageService, context.notebookEditor, idx, CellKind.Markup, 'below');
                if (newCell) {
                    await context.notebookEditor.focusNotebookCell(newCell, 'editor', focusOptions);
                }
            }
            return;
        }
        else {
            const nextCell = context.notebookEditor.cellAt(idx + 1);
            if (nextCell) {
                await context.notebookEditor.focusNotebookCell(nextCell, 'container', focusOptions);
            }
            else {
                const newCell = insertCell(languageService, context.notebookEditor, idx, CellKind.Code, 'below');
                if (newCell) {
                    await context.notebookEditor.focusNotebookCell(newCell, 'editor', focusOptions);
                }
            }
            return runCell(editorGroupsService, context);
        }
    }
});
registerAction2(class ExecuteCellInsertBelow extends NotebookCellAction {
    constructor() {
        super({
            id: EXECUTE_CELL_INSERT_BELOW,
            precondition: ContextKeyExpr.or(executeThisCellCondition, NOTEBOOK_CELL_TYPE.isEqualTo('markup')),
            title: localize('notebookActions.executeAndInsertBelow', "Execute Notebook Cell and Insert Below"),
            keybinding: {
                when: NOTEBOOK_CELL_LIST_FOCUSED,
                primary: 512 /* KeyMod.Alt */ | 3 /* KeyCode.Enter */,
                weight: NOTEBOOK_EDITOR_WIDGET_ACTION_WEIGHT
            },
        });
    }
    async runWithContext(accessor, context) {
        const editorGroupsService = accessor.get(IEditorGroupsService);
        const idx = context.notebookEditor.getCellIndex(context.cell);
        const languageService = accessor.get(ILanguageService);
        const newFocusMode = context.cell.focusMode === CellFocusMode.Editor ? 'editor' : 'container';
        const newCell = insertCell(languageService, context.notebookEditor, idx, context.cell.cellKind, 'below');
        if (newCell) {
            await context.notebookEditor.focusNotebookCell(newCell, newFocusMode);
        }
        if (context.cell.cellKind === CellKind.Markup) {
            context.cell.updateEditState(CellEditState.Preview, EXECUTE_CELL_INSERT_BELOW);
        }
        else {
            runCell(editorGroupsService, context);
        }
    }
});
class CancelNotebook extends NotebookAction {
    getEditorContextFromArgsOrActive(accessor, context) {
        return getContextFromUri(accessor, context) ?? getContextFromActiveEditor(accessor.get(IEditorService));
    }
    async runWithContext(accessor, context) {
        return context.notebookEditor.cancelNotebookCells();
    }
}
registerAction2(class CancelAllNotebook extends CancelNotebook {
    constructor() {
        super({
            id: CANCEL_NOTEBOOK_COMMAND_ID,
            title: localize2('notebookActions.cancelNotebook', "Stop Execution"),
            icon: icons.stopIcon,
            menu: [
                {
                    id: MenuId.EditorTitle,
                    order: -1,
                    group: 'navigation',
                    when: ContextKeyExpr.and(NOTEBOOK_IS_ACTIVE_EDITOR, NOTEBOOK_HAS_SOMETHING_RUNNING, NOTEBOOK_INTERRUPTIBLE_KERNEL.toNegated(), ContextKeyExpr.notEquals('config.notebook.globalToolbar', true))
                },
                {
                    id: MenuId.NotebookToolbar,
                    order: -1,
                    group: 'navigation/execute',
                    when: ContextKeyExpr.and(NOTEBOOK_HAS_SOMETHING_RUNNING, NOTEBOOK_INTERRUPTIBLE_KERNEL.toNegated(), ContextKeyExpr.equals('config.notebook.globalToolbar', true))
                }
            ]
        });
    }
});
registerAction2(class InterruptNotebook extends CancelNotebook {
    constructor() {
        super({
            id: INTERRUPT_NOTEBOOK_COMMAND_ID,
            title: localize2('notebookActions.interruptNotebook', "Interrupt"),
            precondition: ContextKeyExpr.and(NOTEBOOK_HAS_SOMETHING_RUNNING, NOTEBOOK_INTERRUPTIBLE_KERNEL),
            icon: icons.stopIcon,
            menu: [
                {
                    id: MenuId.EditorTitle,
                    order: -1,
                    group: 'navigation',
                    when: ContextKeyExpr.and(NOTEBOOK_IS_ACTIVE_EDITOR, NOTEBOOK_HAS_SOMETHING_RUNNING, NOTEBOOK_INTERRUPTIBLE_KERNEL, ContextKeyExpr.notEquals('config.notebook.globalToolbar', true))
                },
                {
                    id: MenuId.NotebookToolbar,
                    order: -1,
                    group: 'navigation/execute',
                    when: ContextKeyExpr.and(NOTEBOOK_HAS_SOMETHING_RUNNING, NOTEBOOK_INTERRUPTIBLE_KERNEL, ContextKeyExpr.equals('config.notebook.globalToolbar', true))
                },
                {
                    id: MenuId.InteractiveToolbar,
                    group: 'navigation/execute'
                }
            ]
        });
    }
});
MenuRegistry.appendMenuItem(MenuId.NotebookToolbar, {
    title: localize('revealRunningCellShort', "Go To"),
    submenu: MenuId.NotebookCellExecuteGoTo,
    group: 'navigation/execute',
    order: 20,
    icon: ThemeIcon.modify(icons.executingStateIcon, 'spin')
});
registerAction2(class RevealRunningCellAction extends NotebookAction {
    constructor() {
        super({
            id: REVEAL_RUNNING_CELL,
            title: localize('revealRunningCell', "Go to Running Cell"),
            tooltip: localize('revealRunningCell', "Go to Running Cell"),
            shortTitle: localize('revealRunningCell', "Go to Running Cell"),
            precondition: NOTEBOOK_HAS_RUNNING_CELL,
            menu: [
                {
                    id: MenuId.EditorTitle,
                    when: ContextKeyExpr.and(NOTEBOOK_IS_ACTIVE_EDITOR, NOTEBOOK_HAS_RUNNING_CELL, ContextKeyExpr.notEquals('config.notebook.globalToolbar', true)),
                    group: 'navigation',
                    order: 0
                },
                {
                    id: MenuId.NotebookCellExecuteGoTo,
                    when: ContextKeyExpr.and(NOTEBOOK_IS_ACTIVE_EDITOR, NOTEBOOK_HAS_RUNNING_CELL, ContextKeyExpr.equals('config.notebook.globalToolbar', true)),
                    group: 'navigation/execute',
                    order: 20
                },
                {
                    id: MenuId.InteractiveToolbar,
                    when: ContextKeyExpr.and(NOTEBOOK_HAS_RUNNING_CELL, ContextKeyExpr.equals('activeEditor', 'workbench.editor.interactive')),
                    group: 'navigation',
                    order: 10
                }
            ],
            icon: ThemeIcon.modify(icons.executingStateIcon, 'spin')
        });
    }
    async runWithContext(accessor, context) {
        const notebookExecutionStateService = accessor.get(INotebookExecutionStateService);
        const notebook = context.notebookEditor.textModel.uri;
        const executingCells = notebookExecutionStateService.getCellExecutionsForNotebook(notebook);
        if (executingCells[0]) {
            const topStackFrameCell = this.findCellAtTopFrame(accessor, notebook);
            const focusHandle = topStackFrameCell ?? executingCells[0].cellHandle;
            const cell = context.notebookEditor.getCellByHandle(focusHandle);
            if (cell) {
                context.notebookEditor.focusNotebookCell(cell, 'container');
            }
        }
    }
    findCellAtTopFrame(accessor, notebook) {
        const debugService = accessor.get(IDebugService);
        for (const session of debugService.getModel().getSessions()) {
            for (const thread of session.getAllThreads()) {
                const sf = thread.getTopStackFrame();
                if (sf) {
                    const parsed = CellUri.parse(sf.source.uri);
                    if (parsed && parsed.notebook.toString() === notebook.toString()) {
                        return parsed.handle;
                    }
                }
            }
        }
        return undefined;
    }
});
registerAction2(class RevealLastFailedCellAction extends NotebookAction {
    constructor() {
        super({
            id: REVEAL_LAST_FAILED_CELL,
            title: localize('revealLastFailedCell', "Go to Most Recently Failed Cell"),
            tooltip: localize('revealLastFailedCell', "Go to Most Recently Failed Cell"),
            shortTitle: localize('revealLastFailedCellShort', "Go to Most Recently Failed Cell"),
            precondition: NOTEBOOK_LAST_CELL_FAILED,
            menu: [
                {
                    id: MenuId.EditorTitle,
                    when: ContextKeyExpr.and(NOTEBOOK_IS_ACTIVE_EDITOR, NOTEBOOK_LAST_CELL_FAILED, NOTEBOOK_HAS_RUNNING_CELL.toNegated(), ContextKeyExpr.notEquals('config.notebook.globalToolbar', true)),
                    group: 'navigation',
                    order: 0
                },
                {
                    id: MenuId.NotebookCellExecuteGoTo,
                    when: ContextKeyExpr.and(NOTEBOOK_IS_ACTIVE_EDITOR, NOTEBOOK_LAST_CELL_FAILED, NOTEBOOK_HAS_RUNNING_CELL.toNegated(), ContextKeyExpr.equals('config.notebook.globalToolbar', true)),
                    group: 'navigation/execute',
                    order: 20
                },
            ],
            icon: icons.errorStateIcon,
        });
    }
    async runWithContext(accessor, context) {
        const notebookExecutionStateService = accessor.get(INotebookExecutionStateService);
        const notebook = context.notebookEditor.textModel.uri;
        const lastFailedCellHandle = notebookExecutionStateService.getLastFailedCellForNotebook(notebook);
        if (lastFailedCellHandle !== undefined) {
            const lastFailedCell = context.notebookEditor.getCellByHandle(lastFailedCellHandle);
            if (lastFailedCell) {
                context.notebookEditor.focusNotebookCell(lastFailedCell, 'container');
            }
        }
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhlY3V0ZUFjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci9jb250cm9sbGVyL2V4ZWN1dGVBY3Rpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUVsRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDbEUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBR3BFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDNUQsT0FBTyxFQUFFLE1BQU0sRUFBRSxZQUFZLEVBQUUsZUFBZSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDMUcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDdEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBR3pGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUMvRCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFDakQsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDMUUsT0FBTyxFQUFFLHdCQUF3QixFQUFvSSxvQ0FBb0MsRUFBRSxjQUFjLEVBQUUsa0JBQWtCLEVBQUUsdUJBQXVCLEVBQUUsaUJBQWlCLEVBQUUsMEJBQTBCLEVBQUUsaUJBQWlCLEVB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