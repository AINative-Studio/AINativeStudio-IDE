/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { Selection } from '../../../../common/core/selection.js';
import { SortLinesCommand } from '../../browser/sortLinesCommand.js';
import { testCommand } from '../../../../test/browser/testCommand.js';
function testSortLinesAscendingCommand(lines, selection, expectedLines, expectedSelection) {
    testCommand(lines, null, selection, (accessor, sel) => new SortLinesCommand(sel, false), expectedLines, expectedSelection);
}
function testSortLinesDescendingCommand(lines, selection, expectedLines, expectedSelection) {
    testCommand(lines, null, selection, (accessor, sel) => new SortLinesCommand(sel, true), expectedLines, expectedSelection);
}
suite('Editor Contrib - Sort Lines Command', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('no op unless at least two lines selected 1', function () {
        testSortLinesAscendingCommand([
            'first',
            'second line',
            'third line',
            'fourth line',
            'fifth'
        ], new Selection(1, 3, 1, 1), [
            'first',
            'second line',
            'third line',
            'fourth line',
            'fifth'
        ], new Selection(1, 3, 1, 1));
    });
    test('no op unless at least two lines selected 2', function () {
        testSortLinesAscendingCommand([
            'first',
            'second line',
            'third line',
            'fourth line',
            'fifth'
        ], new Selection(1, 3, 2, 1), [
            'first',
            'second line',
            'third line',
            'fourth line',
            'fifth'
        ], new Selection(1, 3, 2, 1));
    });
    test('sorting two lines ascending', function () {
        testSortLinesAscendingCommand([
            'first',
            'second line',
            'third line',
            'fourth line',
            'fifth'
        ], new Selection(3, 3, 4, 2), [
            'first',
            'second line',
            'fourth line',
            'third line',
            'fifth'
        ], new Selection(3, 3, 4, 1));
    });
    test('sorting first 4 lines ascending', function () {
        testSortLinesAscendingCommand([
            'first',
            'second line',
            'third line',
            'fourth line',
            'fifth'
        ], new Selection(1, 1, 5, 1), [
            'first',
            'fourth line',
            'second line',
            'third line',
            'fifth'
        ], new Selection(1, 1, 5, 1));
    });
    test('sorting all lines ascending', function () {
        testSortLinesAscendingCommand([
            'first',
            'second line',
            'third line',
            'fourth line',
            'fifth'
        ], new Selection(1, 1, 5, 6), [
            'fifth',
            'first',
            'fourth line',
            'second line',
            'third line',
        ], new Selection(1, 1, 5, 11));
    });
    test('sorting first 4 lines descending', function () {
        testSortLinesDescendingCommand([
            'first',
            'second line',
            'third line',
            'fourth line',
            'fifth'
        ], new Selection(1, 1, 5, 1), [
            'third line',
            'second line',
            'fourth line',
            'first',
            'fifth'
        ], new Selection(1, 1, 5, 1));
    });
    test('sorting all lines descending', function () {
        testSortLinesDescendingCommand([
            'first',
            'second line',
            'third line',
            'fourth line',
            'fifth'
        ], new Selection(1, 1, 5, 6), [
            'third line',
            'second line',
            'fourth line',
            'first',
            'fifth',
        ], new Selection(1, 1, 5, 6));
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic29ydExpbmVzQ29tbWFuZC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2xpbmVzT3BlcmF0aW9ucy90ZXN0L2Jyb3dzZXIvc29ydExpbmVzQ29tbWFuZC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ25HLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNyRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFFdEUsU0FBUyw2QkFBNkIsQ0FBQyxLQUFlLEVBQUUsU0FBb0IsRUFBRSxhQUF1QixFQUFFLGlCQUE0QjtJQUNsSSxXQUFXLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsQ0FBQyxRQUFRLEVBQUUsR0FBRyxFQUFFLEVBQUUsQ0FBQyxJQUFJLGdCQUFnQixDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsRUFBRSxhQUFhLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztBQUM1SCxDQUFDO0FBRUQsU0FBUyw4QkFBOEIsQ0FBQyxLQUFlLEVBQUUsU0FBb0IsRUFBRSxhQUF1QixFQUFFLGlCQUE0QjtJQUNuSSxXQUFXLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsQ0FBQyxRQUFRLEVBQUUsR0FBRyxFQUFFLEVBQUUsQ0FBQyxJQUFJLGdCQUFnQixDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsRUFBRSxhQUFhLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztBQUMzSCxDQUFDO0FBRUQsS0FBSyxDQUFDLHFDQUFxQyxFQUFFLEdB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