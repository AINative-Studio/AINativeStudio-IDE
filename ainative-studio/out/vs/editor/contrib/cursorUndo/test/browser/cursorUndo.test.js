/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { CoreEditingCommands, CoreNavigationCommands } from '../../../../browser/coreCommands.js';
import { Selection } from '../../../../common/core/selection.js';
import { CursorUndo, CursorUndoRedoController } from '../../browser/cursorUndo.js';
import { withTestCodeEditor } from '../../../../test/browser/testCodeEditor.js';
suite('FindController', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    const cursorUndoAction = new CursorUndo();
    test('issue #82535: Edge case with cursorUndo', () => {
        withTestCodeEditor('', {}, (editor) => {
            editor.registerAndInstantiateContribution(CursorUndoRedoController.ID, CursorUndoRedoController);
            // type hello
            editor.trigger('test', "type" /* Handler.Type */, { text: 'hello' });
            // press left
            CoreNavigationCommands.CursorLeft.runEditorCommand(null, editor, {});
            // press Delete
            CoreEditingCommands.DeleteRight.runEditorCommand(null, editor, {});
            assert.deepStrictEqual(editor.getValue(), 'hell');
            assert.deepStrictEqual(editor.getSelections(), [new Selection(1, 5, 1, 5)]);
            // press left
            CoreNavigationCommands.CursorLeft.runEditorCommand(null, editor, {});
            assert.deepStrictEqual(editor.getSelections(), [new Selection(1, 4, 1, 4)]);
            // press Ctrl+U
            cursorUndoAction.run(null, editor, {});
            assert.deepStrictEqual(editor.getSelections(), [new Selection(1, 5, 1, 5)]);
        });
    });
    test('issue #82535: Edge case with cursorUndo (reverse)', () => {
        withTestCodeEditor('', {}, (editor) => {
            editor.registerAndInstantiateContribution(CursorUndoRedoController.ID, CursorUndoRedoController);
            // type hello
            editor.trigger('test', "type" /* Handler.Type */, { text: 'hell' });
            editor.trigger('test', "type" /* Handler.Type */, { text: 'o' });
            assert.deepStrictEqual(editor.getValue(), 'hello');
            assert.deepStrictEqual(editor.getSelections(), [new Selection(1, 6, 1, 6)]);
            // press Ctrl+U
            cursorUndoAction.run(null, editor, {});
            assert.deepStrictEqual(editor.getSelections(), [new Selection(1, 6, 1, 6)]);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3Vyc29yVW5kby50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2N1cnNvclVuZG8vdGVzdC9icm93c2VyL2N1cnNvclVuZG8udGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDbkcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLHNCQUFzQixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDbEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRWpFLE9BQU8sRUFBRSxVQUFVLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUNuRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUVoRixLQUFLLENBQUMsZ0JBQWdCLEVBQUUsR0FBRyxFQUFFO0lBRTVCLHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLFVBQVUsRUFBRSxDQUFDO0lBRTFDLElBQUksQ0FBQyx5Q0FBeUMsRUFBRSxHQUFHLEVBQUU7UUFDcEQsa0JBQWtCLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLE1BQU0sRUFBRSxFQUFFO1lBRXJDLE1BQU0sQ0FBQyxrQ0FBa0MsQ0FBQyx3QkFBd0IsQ0FBQyxFQUFFLEVBQUUsd0JBQXdCLENBQUMsQ0FBQztZQUVqRyxhQUFhO1lBQ2IsTUFBTSxDQUFDLE9BQU8sQ0FBQyxNQUFNLDZCQUFnQixFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFDO1lBRXhELGFBQWE7WUFDYixzQkFBc0IsQ0FBQyxVQUFVLENBQUMsZ0JB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