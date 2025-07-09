/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize, localize2 } from '../../../../nls.js';
import { Action2, MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { CoreNavigationCommands } from '../../../../editor/browser/coreCommands.js';
import { Position } from '../../../../editor/common/core/position.js';
import { Selection } from '../../../../editor/common/core/selection.js';
export class ToggleColumnSelectionAction extends Action2 {
    static { this.ID = 'editor.action.toggleColumnSelection'; }
    constructor() {
        super({
            id: ToggleColumnSelectionAction.ID,
            title: {
                ...localize2('toggleColumnSelection', "Toggle Column Selection Mode"),
                mnemonicTitle: localize({ key: 'miColumnSelection', comment: ['&& denotes a mnemonic'] }, "Column &&Selection Mode"),
            },
            f1: true,
            toggled: ContextKeyExpr.equals('config.editor.columnSelection', true),
            menu: {
                id: MenuId.MenubarSelectionMenu,
                group: '4_config',
                order: 2
            }
        });
    }
    async run(accessor) {
        const configurationService = accessor.get(IConfigurationService);
        const codeEditorService = accessor.get(ICodeEditorService);
        const oldValue = configurationService.getValue('editor.columnSelection');
        const codeEditor = this._getCodeEditor(codeEditorService);
        await configurationService.updateValue('editor.columnSelection', !oldValue);
        const newValue = configurationService.getValue('editor.columnSelection');
        if (!codeEditor || codeEditor !== this._getCodeEditor(codeEditorService) || oldValue === newValue || !codeEditor.hasModel() || typeof oldValue !== 'boolean' || typeof newValue !== 'boolean') {
            return;
        }
        const viewModel = codeEditor._getViewModel();
        if (codeEditor.getOption(22 /* EditorOption.columnSelection */)) {
            const selection = codeEditor.getSelection();
            const modelSelectionStart = new Position(selection.selectionStartLineNumber, selection.selectionStartColumn);
            const viewSelectionStart = viewModel.coordinatesConverter.convertModelPositionToViewPosition(modelSelectionStart);
            const modelPosition = new Position(selection.positionLineNumber, selection.positionColumn);
            const viewPosition = viewModel.coordinatesConverter.convertModelPositionToViewPosition(modelPosition);
            CoreNavigationCommands.MoveTo.runCoreEditorCommand(viewModel, {
                position: modelSelectionStart,
                viewPosition: viewSelectionStart
            });
            const visibleColumn = viewModel.cursorConfig.visibleColumnFromColumn(viewModel, viewPosition);
            CoreNavigationCommands.ColumnSelect.runCoreEditorCommand(viewModel, {
                position: modelPosition,
                viewPosition: viewPosition,
                doColumnSelect: true,
                mouseColumn: visibleColumn + 1
            });
        }
        else {
            const columnSelectData = viewModel.getCursorColumnSelectData();
            const fromViewColumn = viewModel.cursorConfig.columnFromVisibleColumn(viewModel, columnSelectData.fromViewLineNumber, columnSelectData.fromViewVisualColumn);
            const fromPosition = viewModel.coordinatesConverter.convertViewPositionToModelPosition(new Position(columnSelectData.fromViewLineNumber, fromViewColumn));
            const toViewColumn = viewModel.cursorConfig.columnFromVisibleColumn(viewModel, columnSelectData.toViewLineNumber, columnSelectData.toViewVisualColumn);
            const toPosition = viewModel.coordinatesConverter.convertViewPositionToModelPosition(new Position(columnSelectData.toViewLineNumber, toViewColumn));
            codeEditor.setSelection(new Selection(fromPosition.lineNumber, fromPosition.column, toPosition.lineNumber, toPosition.column));
        }
    }
    _getCodeEditor(codeEditorService) {
        const codeEditor = codeEditorService.getFocusedCodeEditor();
        if (codeEditor) {
            return codeEditor;
        }
        return codeEditorService.getActiveCodeEditor();
    }
}
registerAction2(ToggleColumnSelectionAction);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9nZ2xlQ29sdW1uU2VsZWN0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NvZGVFZGl0b3IvYnJvd3Nlci90b2dnbGVDb2x1bW5TZWxlY3Rpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUN6RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNsRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDdEYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sMERBQTBELENBQUM7QUFHOUYsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDcEYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUd4RSxNQUFNLE9BQU8sMkJBQTRCLFNBQVEsT0FBTzthQUV2QyxPQUFFLEdBQUcscUNBQXFDLENBQUM7SUFFM0Q7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsMkJBQTJCLENBQUMsRUFBRTtZQUNsQyxLQUFLLEVBQUU7Z0JBQ04sR0FBRyxTQUFTLENBQUMsdUJBQXVCLEVBQUUsOEJBQThCLENBQUM7Z0JBQ3JFLGFBQWEsRUFBRSxRQUFRLENBQUMsRUFBRSxHQUFHLEVBQUUsbUJBQW1CLEVBQUUsT0FBTyxFQUFFLENBQUMsdUJBQXVCLENBQUMsRUFBRSxFQUFFLHlCQUF5QixDQUFD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