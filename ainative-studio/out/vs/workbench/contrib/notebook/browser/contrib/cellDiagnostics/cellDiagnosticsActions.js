/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Range } from '../../../../../../editor/common/core/range.js';
import { CodeActionController } from '../../../../../../editor/contrib/codeAction/browser/codeActionController.js';
import { CodeActionKind, CodeActionTriggerSource } from '../../../../../../editor/contrib/codeAction/common/types.js';
import { localize, localize2 } from '../../../../../../nls.js';
import { registerAction2 } from '../../../../../../platform/actions/common/actions.js';
import { ContextKeyExpr } from '../../../../../../platform/contextkey/common/contextkey.js';
import { NotebookCellAction, findTargetCellEditor } from '../../controller/coreActions.js';
import { CodeCellViewModel } from '../../viewModel/codeCellViewModel.js';
import { NOTEBOOK_CELL_EDITOR_FOCUSED, NOTEBOOK_CELL_FOCUSED, NOTEBOOK_CELL_HAS_ERROR_DIAGNOSTICS } from '../../../common/notebookContextKeys.js';
import { InlineChatController } from '../../../../inlineChat/browser/inlineChatController.js';
import { showChatView } from '../../../../chat/browser/chat.js';
import { IViewsService } from '../../../../../services/views/common/viewsService.js';
export const OPEN_CELL_FAILURE_ACTIONS_COMMAND_ID = 'notebook.cell.openFailureActions';
export const FIX_CELL_ERROR_COMMAND_ID = 'notebook.cell.chat.fixError';
export const EXPLAIN_CELL_ERROR_COMMAND_ID = 'notebook.cell.chat.explainError';
registerAction2(class extends NotebookCellAction {
    constructor() {
        super({
            id: OPEN_CELL_FAILURE_ACTIONS_COMMAND_ID,
            title: localize2('notebookActions.cellFailureActions', "Show Cell Failure Actions"),
            precondition: ContextKeyExpr.and(NOTEBOOK_CELL_FOCUSED, NOTEBOOK_CELL_HAS_ERROR_DIAGNOSTICS, NOTEBOOK_CELL_EDITOR_FOCUSED.toNegated()),
            f1: true,
            keybinding: {
                when: ContextKeyExpr.and(NOTEBOOK_CELL_FOCUSED, NOTEBOOK_CELL_HAS_ERROR_DIAGNOSTICS, NOTEBOOK_CELL_EDITOR_FOCUSED.toNegated()),
                primary: 2048 /* KeyMod.CtrlCmd */ | 89 /* KeyCode.Period */,
                weight: 200 /* KeybindingWeight.WorkbenchContrib */
            }
        });
    }
    async runWithContext(accessor, context) {
        if (context.cell instanceof CodeCellViewModel) {
            const error = context.cell.executionErrorDiagnostic.get();
            if (error?.location) {
                const location = Range.lift({
                    startLineNumber: error.location.startLineNumber + 1,
                    startColumn: error.location.startColumn + 1,
                    endLineNumber: error.location.endLineNumber + 1,
                    endColumn: error.location.endColumn + 1
                });
                context.notebookEditor.setCellEditorSelection(context.cell, Range.lift(location));
                const editor = findTargetCellEditor(context, context.cell);
                if (editor) {
                    const controller = CodeActionController.get(editor);
                    controller?.manualTriggerAtCurrentPosition(localize('cellCommands.quickFix.noneMessage', "No code actions available"), CodeActionTriggerSource.Default, { include: CodeActionKind.QuickFix });
                }
            }
        }
    }
});
registerAction2(class extends NotebookCellAction {
    constructor() {
        super({
            id: FIX_CELL_ERROR_COMMAND_ID,
            title: localize2('notebookActions.chatFixCellError', "Fix Cell Error"),
            precondition: ContextKeyExpr.and(NOTEBOOK_CELL_FOCUSED, NOTEBOOK_CELL_HAS_ERROR_DIAGNOSTICS, NOTEBOOK_CELL_EDITOR_FOCUSED.toNegated()),
            f1: true
        });
    }
    async runWithContext(accessor, context) {
        if (context.cell instanceof CodeCellViewModel) {
            const error = context.cell.executionErrorDiagnostic.get();
            if (error?.location) {
                const location = Range.lift({
                    startLineNumber: error.location.startLineNumber + 1,
                    startColumn: error.location.startColumn + 1,
                    endLineNumber: error.location.endLineNumber + 1,
                    endColumn: error.location.endColumn + 1
                });
                context.notebookEditor.setCellEditorSelection(context.cell, Range.lift(location));
                const editor = findTargetCellEditor(context, context.cell);
                if (editor) {
                    const controller = InlineChatController.get(editor);
                    const message = error.name ? `${error.name}: ${error.message}` : error.message;
                    if (controller) {
                        await controller.run({ message: '/fix ' + message, initialRange: location, autoSend: true });
                    }
                }
            }
        }
    }
});
registerAction2(class extends NotebookCellAction {
    constructor() {
        super({
            id: EXPLAIN_CELL_ERROR_COMMAND_ID,
            title: localize2('notebookActions.chatExplainCellError', "Explain Cell Error"),
            precondition: ContextKeyExpr.and(NOTEBOOK_CELL_FOCUSED, NOTEBOOK_CELL_HAS_ERROR_DIAGNOSTICS, NOTEBOOK_CELL_EDITOR_FOCUSED.toNegated()),
            f1: true
        });
    }
    async runWithContext(accessor, context) {
        if (context.cell instanceof CodeCellViewModel) {
            const error = context.cell.executionErrorDiagnostic.get();
            if (error?.message) {
                const viewsService = accessor.get(IViewsService);
                const chatWidget = await showChatView(viewsService);
                const message = error.name ? `${error.name}: ${error.message}` : error.message;
                // TODO: can we add special prompt instructions? e.g. use "%pip install"
                chatWidget?.acceptInput('@workspace /explain ' + message);
            }
        }
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2VsbERpYWdub3N0aWNzQWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvY29udHJpYi9jZWxsRGlhZ25vc3RpY3MvY2VsbERpYWdub3N0aWNzQWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUloRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDdEUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sNkVBQTZFLENBQUM7QUFDbkgsT0FBTyxFQUFFLGNBQWMsRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDZEQUE2RCxDQUFDO0FBQ3RILE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDL0QsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUU1RixPQUFPLEVBQThCLGtCQUFrQixFQUFFLG9CQUFvQixFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDdkgsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDekUsT0FBTyxFQUFFLDRCQUE0QixFQUFFLHFCQUFxQixFQUFFLG1DQUFtQyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDbEosT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDOUYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUVyRixNQUFNLENBQUMsTUFBTSxvQ0FBb0MsR0FBRyxrQ0FBa0MsQ0FBQztBQUN2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