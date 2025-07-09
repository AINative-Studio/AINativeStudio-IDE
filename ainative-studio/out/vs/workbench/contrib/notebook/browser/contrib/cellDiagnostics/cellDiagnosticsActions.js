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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2VsbERpYWdub3N0aWNzQWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL2NvbnRyaWIvY2VsbERpYWdub3N0aWNzL2NlbGxEaWFnbm9zdGljc0FjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFJaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDZFQUE2RSxDQUFDO0FBQ25ILE9BQU8sRUFBRSxjQUFjLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw2REFBNkQsQ0FBQztBQUN0SCxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQy9ELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUN2RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sNERBQTRELENBQUM7QUFFNUYsT0FBTyxFQUE4QixrQkFBa0IsRUFBRSxvQkFBb0IsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3ZILE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxxQkFBcUIsRUFBRSxtQ0FBbUMsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ2xKLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBQzlGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNoRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFFckYsTUFBTSxDQUFDLE1BQU0sb0NBQW9DLEdBQUcsa0NBQWtDLENBQUM7QUFD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