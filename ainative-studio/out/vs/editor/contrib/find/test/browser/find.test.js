/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { Position } from '../../../../common/core/position.js';
import { Range } from '../../../../common/core/range.js';
import { getSelectionSearchString } from '../../browser/findController.js';
import { withTestCodeEditor } from '../../../../test/browser/testCodeEditor.js';
suite('Find', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('search string at position', () => {
        withTestCodeEditor([
            'ABC DEF',
            '0123 456'
        ], {}, (editor) => {
            // The cursor is at the very top, of the file, at the first ABC
            const searchStringAtTop = getSelectionSearchString(editor);
            assert.strictEqual(searchStringAtTop, 'ABC');
            // Move cursor to the end of ABC
            editor.setPosition(new Position(1, 3));
            const searchStringAfterABC = getSelectionSearchString(editor);
            assert.strictEqual(searchStringAfterABC, 'ABC');
            // Move cursor to DEF
            editor.setPosition(new Position(1, 5));
            const searchStringInsideDEF = getSelectionSearchString(editor);
            assert.strictEqual(searchStringInsideDEF, 'DEF');
        });
    });
    test('search string with selection', () => {
        withTestCodeEditor([
            'ABC DEF',
            '0123 456'
        ], {}, (editor) => {
            // Select A of ABC
            editor.setSelection(new Range(1, 1, 1, 2));
            const searchStringSelectionA = getSelectionSearchString(editor);
            assert.strictEqual(searchStringSelectionA, 'A');
            // Select BC of ABC
            editor.setSelection(new Range(1, 2, 1, 4));
            const searchStringSelectionBC = getSelectionSearchString(editor);
            assert.strictEqual(searchStringSelectionBC, 'BC');
            // Select BC DE
            editor.setSelection(new Range(1, 2, 1, 7));
            const searchStringSelectionBCDE = getSelectionSearchString(editor);
            assert.strictEqual(searchStringSelectionBCDE, 'BC DE');
        });
    });
    test('search string with multiline selection', () => {
        withTestCodeEditor([
            'ABC DEF',
            '0123 456'
        ], {}, (editor) => {
            // Select first line and newline
            editor.setSelection(new Range(1, 1, 2, 1));
            const searchStringSelectionWholeLine = getSelectionSearchString(editor);
            assert.strictEqual(searchStringSelectionWholeLine, null);
            // Select first line and chunk of second
            editor.setSelection(new Range(1, 1, 2, 4));
            const searchStringSelectionTwoLines = getSelectionSearchString(editor);
            assert.strictEqual(searchStringSelectionTwoLines, null);
            // Select end of first line newline and chunk of second
            editor.setSelection(new Range(1, 7, 2, 4));
            const searchStringSelectionSpanLines = getSelectionSearchString(editor);
            assert.strictEqual(searchStringSelectionSpanLines, null);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmluZC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2ZpbmQvdGVzdC9icm93c2VyL2ZpbmQudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDbkcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN6RCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUMzRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUdoRixLQUFLLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRTtJQUVsQix1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLElBQUksQ0FBQywyQkFBMkIsRUFBRSxHQUFHLEVBQUU7UUFDdEMsa0JBQWtCLENBQUM7WUFDbEIsU0FBUztZQUNULFVBQVU7U0FDVixFQUFFLEVBQUUsRUFBRSxDQUFDLE1BQU0sRUFBRSxFQUFFO1lBRWpCLCtEQUErRDtZQUMvRCxNQUFNLGlCQUFpQixHQUFHLHdCQUF3QixDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQzNELE1BQU0sQ0FBQyxXQUFXLENBQUMsaUJBQWlCLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFFN0MsZ0NBQWdDO1lBQ2hDLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDdkMsTUFBTSxvQkFBb0IsR0FBRyx3QkFBd0IsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUM5RCxN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