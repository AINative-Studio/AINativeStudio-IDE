/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { Selection } from '../../../../common/core/selection.js';
import { ILanguageService } from '../../../../common/languages/language.js';
import { ILanguageConfigurationService } from '../../../../common/languages/languageConfigurationRegistry.js';
import { BlockCommentCommand } from '../../browser/blockCommentCommand.js';
import { testCommand } from '../../../../test/browser/testCommand.js';
function _testCommentCommand(lines, selection, commandFactory, expectedLines, expectedSelection) {
    const languageId = 'commentMode';
    const prepare = (accessor, disposables) => {
        const languageConfigurationService = accessor.get(ILanguageConfigurationService);
        const languageService = accessor.get(ILanguageService);
        disposables.add(languageService.registerLanguage({ id: languageId }));
        disposables.add(languageConfigurationService.register(languageId, {
            comments: { lineComment: '!@#', blockComment: ['<0', '0>'] }
        }));
    };
    testCommand(lines, languageId, selection, commandFactory, expectedLines, expectedSelection, undefined, prepare);
}
function testBlockCommentCommand(lines, selection, expectedLines, expectedSelection) {
    _testCommentCommand(lines, selection, (accessor, sel) => new BlockCommentCommand(sel, true, accessor.get(ILanguageConfigurationService)), expectedLines, expectedSelection);
}
suite('Editor Contrib - Block Comment Command', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('empty selection wraps itself', function () {
        testBlockCommentCommand([
            'first',
            '\tsecond line',
            'third line',
            'fourth line',
            'fifth'
        ], new Selection(1, 3, 1, 3), [
            'fi<0  0>rst',
            '\tsecond line',
            'third line',
            'fourth line',
            'fifth'
        ], new Selection(1, 6, 1, 6));
    });
    test('invisible selection ignored', function () {
        testBlockCommentCommand([
            'first',
            '\tsecond line',
            'third line',
            'fourth line',
            'fifth'
        ], new Selection(2, 1, 1, 1), [
            '<0 first',
            ' 0>\tsecond line',
            'third line',
            'fourth line',
            'fifth'
        ], new Selection(1, 4, 2, 1));
    });
    test('bug9511', () => {
        testBlockCommentCommand([
            'first',
            '\tsecond line',
            'third line',
            'fourth line',
            'fifth'
        ], new Selection(1, 6, 1, 1), [
            '<0 first 0>',
            '\tsecond line',
            'third line',
            'fourth line',
            'fifth'
        ], new Selection(1, 4, 1, 9));
        testBlockCommentCommand([
            '<0first0>',
            '\tsecond line',
            'third line',
            'fourth line',
            'fifth'
        ], new Selection(1, 8, 1, 3), [
            'first',
            '\tsecond line',
            'third line',
            'fourth line',
            'fifth'
        ], new Selection(1, 1, 1, 6));
    });
    test('one line selection', function () {
        testBlockCommentCommand([
            'first',
            '\tsecond line',
            'third line',
            'fourth line',
            'fifth'
        ], new Selection(1, 6, 1, 3), [
            'fi<0 rst 0>',
            '\tsecond line',
            'third line',
            'fourth line',
            'fifth'
        ], new Selection(1, 6, 1, 9));
    });
    test('one line selection toggle', function () {
        testBlockCommentCommand([
            'first',
            '\tsecond line',
            'third line',
            'fourth line',
            'fifth'
        ], new Selection(1, 6, 1, 3), [
            'fi<0 rst 0>',
            '\tsecond line',
            'third line',
            'fourth line',
            'fifth'
        ], new Selection(1, 6, 1, 9));
        testBlockCommentCommand([
            'fi<0rst0>',
            '\tsecond line',
            'third line',
            'fourth line',
            'fifth'
        ], new Selection(1, 8, 1, 5), [
            'first',
            '\tsecond line',
            'third line',
            'fourth line',
            'fifth'
        ], new Selection(1, 3, 1, 6));
        testBlockCommentCommand([
            '<0 first 0>',
            '\tsecond line',
            'third line',
            'fourth line',
            'fifth'
        ], new Selection(1, 10, 1, 1), [
            'first',
            '\tsecond line',
            'third line',
            'fourth line',
            'fifth'
        ], new Selection(1, 1, 1, 6));
        testBlockCommentCommand([
            '<0 first0>',
            '\tsecond line',
            'third line',
            'fourth line',
            'fifth'
        ], new Selection(1, 9, 1, 1), [
            'first',
            '\tsecond line',
            'third line',
            'fourth line',
            'fifth'
        ], new Selection(1, 1, 1, 6));
        testBlockCommentCommand([
            '<0first 0>',
            '\tsecond line',
            'third line',
            'fourth line',
            'fifth'
        ], new Selection(1, 9, 1, 1), [
            'first',
            '\tsecond line',
            'third line',
            'fourth line',
            'fifth'
        ], new Selection(1, 1, 1, 6));
        testBlockCommentCommand([
            'fi<0rst0>',
            '\tsecond line',
            'third line',
            'fourth line',
            'fifth'
        ], new Selection(1, 8, 1, 5), [
            'first',
            '\tsecond line',
            'third line',
            'fourth line',
            'fifth'
        ], new Selection(1, 3, 1, 6));
    });
    test('multi line selection', function () {
        testBlockCommentCommand([
            'first',
            '\tsecond line',
            'third line',
            'fourth line',
            'fifth'
        ], new Selection(2, 4, 1, 1), [
            '<0 first',
            '\tse 0>cond line',
            'third line',
            'fourth line',
            'fifth'
        ], new Selection(1, 4, 2, 4));
    });
    test('multi line selection toggle', function () {
        testBlockCommentCommand([
            'first',
            '\tsecond line',
            'third line',
            'fourth line',
            'fifth'
        ], new Selection(2, 4, 1, 1), [
            '<0 first',
            '\tse 0>cond line',
            'third line',
            'fourth line',
            'fifth'
        ], new Selection(1, 4, 2, 4));
        testBlockCommentCommand([
            '<0first',
            '\tse0>cond line',
            'third line',
            'fourth line',
            'fifth'
        ], new Selection(2, 4, 1, 3), [
            'first',
            '\tsecond line',
            'third line',
            'fourth line',
            'fifth'
        ], new Selection(1, 1, 2, 4));
        testBlockCommentCommand([
            '<0 first',
            '\tse0>cond line',
            'third line',
            'fourth line',
            'fifth'
        ], new Selection(2, 4, 1, 3), [
            'first',
            '\tsecond line',
            'third line',
            'fourth line',
            'fifth'
        ], new Selection(1, 1, 2, 4));
        testBlockCommentCommand([
            '<0first',
            '\tse 0>cond line',
            'third line',
            'fourth line',
            'fifth'
        ], new Selection(2, 4, 1, 3), [
            'first',
            '\tsecond line',
            'third line',
            'fourth line',
            'fifth'
        ], new Selection(1, 1, 2, 4));
        testBlockCommentCommand([
            '<0 first',
            '\tse 0>cond line',
            'third line',
            'fourth line',
            'fifth'
        ], new Selection(2, 4, 1, 3), [
            'first',
            '\tsecond line',
            'third line',
            'fourth line',
            'fifth'
        ], new Selection(1, 1, 2, 4));
    });
    test('fuzzy removes', function () {
        testBlockCommentCommand([
            'asd <0 qwe',
            'asd 0> qwe'
        ], new Selection(2, 5, 1, 7), [
            'asd qwe',
            'asd qwe'
        ], new Selection(1, 5, 2, 4));
        testBlockCommentCommand([
            'asd <0 qwe',
            'asd 0> qwe'
        ], new Selection(2, 5, 1, 6), [
            'asd qwe',
            'asd qwe'
        ], new Selection(1, 5, 2, 4));
        testBlockCommentCommand([
            'asd <0 qwe',
            'asd 0> qwe'
        ], new Selection(2, 5, 1, 5), [
            'asd qwe',
            'asd qwe'
        ], new Selection(1, 5, 2, 4));
        testBlockCommentCommand([
            'asd <0 qwe',
            'asd 0> qwe'
        ], new Selection(2, 5, 1, 11), [
            'asd qwe',
            'asd qwe'
        ], new Selection(1, 5, 2, 4));
        testBlockCommentCommand([
            'asd <0 qwe',
            'asd 0> qwe'
        ], new Selection(2, 1, 1, 11), [
            'asd qwe',
            'asd qwe'
        ], new Selection(1, 5, 2, 4));
        testBlockCommentCommand([
            'asd <0 qwe',
            'asd 0> qwe'
        ], new Selection(2, 7, 1, 11), [
            'asd qwe',
            'asd qwe'
        ], new Selection(1, 5, 2, 4));
    });
    test('bug #30358', function () {
        testBlockCommentCommand([
            '<0 start 0> middle end',
        ], new Selection(1, 20, 1, 23), [
            '<0 start 0> middle <0 end 0>'
        ], new Selection(1, 23, 1, 26));
        testBlockCommentCommand([
            '<0 start 0> middle <0 end 0>'
        ], new Selection(1, 13, 1, 19), [
            '<0 start 0> <0 middle 0> <0 end 0>'
        ], new Selection(1, 16, 1, 22));
    });
    test('issue #34618', function () {
        testBlockCommentCommand([
            '<0  0> middle end',
        ], new Selection(1, 4, 1, 4), [
            ' middle end'
        ], new Selection(1, 1, 1, 1));
    });
    test('insertSpace false', () => {
        function testLineCommentCommand(lines, selection, expectedLines, expectedSelection) {
            _testCommentCommand(lines, selection, (accessor, sel) => new BlockCommentCommand(sel, false, accessor.get(ILanguageConfigurationService)), expectedLines, expectedSelection);
        }
        testLineCommentCommand([
            'some text'
        ], new Selection(1, 1, 1, 5), [
            '<0some0> text'
        ], new Selection(1, 3, 1, 7));
    });
    test('insertSpace false does not remove space', () => {
        function testLineCommentCommand(lines, selection, expectedLines, expectedSelection) {
            _testCommentCommand(lines, selection, (accessor, sel) => new BlockCommentCommand(sel, false, accessor.get(ILanguageConfigurationService)), expectedLines, expectedSelection);
        }
        testLineCommentCommand([
            '<0 some 0> text'
        ], new Selection(1, 4, 1, 8), [
            ' some  text'
        ], new Selection(1, 1, 1, 7));
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmxvY2tDb21tZW50Q29tbWFuZC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2NvbW1lbnQvdGVzdC9icm93c2VyL2Jsb2NrQ29tbWVudENvbW1hbmQudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFakUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDNUUsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDOUcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDM0UsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBR3RFLFNBQVMsbUJBQW1CLENBQUMsS0FBZSxFQUFFLFNBQW9CLEVBQUUsY0FBOEUsRUFBRSxhQUF1QixFQUFFLGlCQUE0QjtJQUN4TSxNQUFNLFVBQVUsR0FBRyxhQUFhLENBQUM7SUFDakMsTUFBTSxPQUFPLEdBQUcsQ0FBQyxRQUEwQixFQUFFLFdBQTRCLEVBQUUsRUFBRTtRQUM1RSxNQUFNLDRCQUE0QixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsNkJBQTZCLENBQUMsQ0FBQztRQUNqRixNQUFNLGVBQWUsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLENBQUM7UUFDdkQsV0FBVyxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxFQUFFLEVBQUUsVUFBVSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3RFLFdBQVcsQ0FBQyxHQUFHLENB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