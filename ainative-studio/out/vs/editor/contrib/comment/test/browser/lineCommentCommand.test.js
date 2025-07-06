/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import assert from 'assert';
import { Disposable, DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { Selection } from '../../../../common/core/selection.js';
import { EncodedTokenizationResult, TokenizationRegistry } from '../../../../common/languages.js';
import { ILanguageService } from '../../../../common/languages/language.js';
import { ILanguageConfigurationService } from '../../../../common/languages/languageConfigurationRegistry.js';
import { NullState } from '../../../../common/languages/nullTokenize.js';
import { LineCommentCommand } from '../../browser/lineCommentCommand.js';
import { testCommand } from '../../../../test/browser/testCommand.js';
import { TestLanguageConfigurationService } from '../../../../test/common/modes/testLanguageConfigurationService.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
function createTestCommandHelper(commentsConfig, commandFactory) {
    return (lines, selection, expectedLines, expectedSelection) => {
        const languageId = 'commentMode';
        const prepare = (accessor, disposables) => {
            const languageConfigurationService = accessor.get(ILanguageConfigurationService);
            const languageService = accessor.get(ILanguageService);
            disposables.add(languageService.registerLanguage({ id: languageId }));
            disposables.add(languageConfigurationService.register(languageId, {
                comments: commentsConfig
            }));
        };
        testCommand(lines, languageId, selection, commandFactory, expectedLines, expectedSelection, false, prepare);
    };
}
suite('Editor Contrib - Line Comment Command', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    const testLineCommentCommand = createTestCommandHelper({ lineComment: '!@#', blockComment: ['<!@#', '#@!>'] }, (accessor, sel) => new LineCommentCommand(accessor.get(ILanguageConfigurationService), sel, 4, 0 /* Type.Toggle */, true, true));
    const testAddLineCommentCommand = createTestCommandHelper({ lineComment: '!@#', blockComment: ['<!@#', '#@!>'] }, (accessor, sel) => new LineCommentCommand(accessor.get(ILanguageConfigurationService), sel, 4, 1 /* Type.ForceAdd */, true, true));
    test('comment single line', function () {
        testLineCommentCommand([
            'some text',
            '\tsome more text'
        ], new Selection(1, 1, 1, 1), [
            '!@# some text',
            '\tsome more text'
        ], new Selection(1, 5, 1, 5));
    });
    test('case insensitive', function () {
        const testLineCommentCommand = createTestCommandHelper({ lineComment: 'rem' }, (accessor, sel) => new LineCommentCommand(accessor.get(ILanguageConfigurationService), sel, 4, 0 /* Type.Toggle */, true, true));
        testLineCommentCommand([
            'REM some text'
        ], new Selection(1, 1, 1, 1), [
            'some text'
        ], new Selection(1, 1, 1, 1));
    });
    function createSimpleModel(lines) {
        return {
            getLineContent: (lineNumber) => {
                return lines[lineNumber - 1];
            }
        };
    }
    function createBasicLinePreflightData(commentTokens) {
        return commentTokens.map((commentString) => {
            const r = {
                ignore: false,
                commentStr: commentString,
                commentStrOffset: 0,
                commentStrLength: commentString.length
            };
            return r;
        });
    }
    test('_analyzeLines', () => {
        const disposable = new DisposableStore();
        let r;
        r = LineCommentCommand._analyzeLines(0 /* Type.Toggle */, true, createSimpleModel([
            '\t\t',
            '    ',
            '    c',
            '\t\td'
        ]), createBasicLinePreflightData(['//', 'rem', '!@#', '!@#']), 1, true, false, disposable.add(new TestLanguageConfigurationService()));
        if (!r.supported) {
            throw new Error(`unexpected`);
        }
        assert.strictEqual(r.shouldRemoveComments, false);
        // Does not change `commentStr`
        assert.strictEqual(r.lines[0].commentStr, '//');
        assert.strictEqual(r.lines[1].commentStr, 'rem');
        assert.strictEqual(r.lines[2].commentStr, '!@#');
        assert.strictEqual(r.lines[3].commentStr, '!@#');
        // Fills in `isWhitespace`
        assert.strictEqual(r.lines[0].ignore, true);
        assert.strictEqual(r.lines[1].ignore, true);
        assert.strictEqual(r.lines[2].ignore, false);
        assert.strictEqual(r.lines[3].ignore, false);
        // Fills in `commentStrOffset`
        assert.strictEqual(r.lines[0].commentStrOffset, 2);
        assert.strictEqual(r.lines[1].commentStrOffset, 4);
        assert.strictEqual(r.lines[2].commentStrOffset, 4);
        assert.strictEqual(r.lines[3].commentStrOffset, 2);
        r = LineCommentCommand._analyzeLines(0 /* Type.Toggle */, true, createSimpleModel([
            '\t\t',
            '    rem ',
            '    !@# c',
            '\t\t!@#d'
        ]), createBasicLinePreflightData(['//', 'rem', '!@#', '!@#']), 1, true, false, disposable.add(new TestLanguageConfigurationService()));
        if (!r.supported) {
            throw new Error(`unexpected`);
        }
        assert.strictEqual(r.shouldRemoveComments, true);
        // Does not change `commentStr`
        assert.strictEqual(r.lines[0].commentStr, '//');
        assert.strictEqual(r.lines[1].commentStr, 'rem');
        assert.strictEqual(r.lines[2].commentStr, '!@#');
        assert.strictEqual(r.lines[3].commentStr, '!@#');
        // Fills in `isWhitespace`
        assert.strictEqual(r.lines[0].ignore, true);
        assert.strictEqual(r.lines[1].ignore, false);
        assert.strictEqual(r.lines[2].ignore, false);
        assert.strictEqual(r.lines[3].ignore, false);
        // Fills in `commentStrOffset`
        assert.strictEqual(r.lines[0].commentStrOffset, 2);
        assert.strictEqual(r.lines[1].commentStrOffset, 4);
        assert.strictEqual(r.lines[2].commentStrOffset, 4);
        assert.strictEqual(r.lines[3].commentStrOffset, 2);
        // Fills in `commentStrLength`
        assert.strictEqual(r.lines[0].commentStrLength, 2);
        assert.strictEqual(r.lines[1].commentStrLength, 4);
        assert.strictEqual(r.lines[2].commentStrLength, 4);
        assert.strictEqual(r.lines[3].commentStrLength, 3);
        disposable.dispose();
    });
    test('_normalizeInsertionPoint', () => {
        const runTest = (mixedArr, tabSize, expected, testName) => {
            const model = createSimpleModel(mixedArr.filter((item, idx) => idx % 2 === 0));
            const offsets = mixedArr.filter((item, idx) => idx % 2 === 1).map(offset => {
                return {
                    commentStrOffset: offset,
                    ignore: false
                };
            });
            LineCommentCommand._normalizeInsertionPoint(model, offsets, 1, tabSize);
            const actual = offsets.map(item => item.commentStrOffset);
            assert.deepStrictEqual(actual, expected, testName);
        };
        // Bug 16696:[comment] comments not aligned in this case
        runTest([
            '  XX', 2,
            '    YY', 4
        ], 4, [0, 0], 'Bug 16696');
        runTest([
            '\t\t\tXX', 3,
            '    \tYY', 5,
            '        ZZ', 8,
            '\t\tTT', 2
        ], 4, [2, 5, 8, 2], 'Test1');
        runTest([
            '\t\t\t   XX', 6,
            '    \t\t\t\tYY', 8,
            '        ZZ', 8,
            '\t\t    TT', 6
        ], 4, [2, 5, 8, 2], 'Test2');
        runTest([
            '\t\t', 2,
            '\t\t\t', 3,
            '\t\t\t\t', 4,
            '\t\t\t', 3
        ], 4, [2, 2, 2, 2], 'Test3');
        runTest([
            '\t\t', 2,
            '\t\t\t', 3,
            '\t\t\t\t', 4,
            '\t\t\t', 3,
            '    ', 4
        ], 2, [2, 2, 2, 2, 4], 'Test4');
        runTest([
            '\t\t', 2,
            '\t\t\t', 3,
            '\t\t\t\t', 4,
            '\t\t\t', 3,
            '    ', 4
        ], 4, [1, 1, 1, 1, 4], 'Test5');
        runTest([
            ' \t', 2,
            '  \t', 3,
            '   \t', 4,
            '    ', 4,
            '\t', 1
        ], 4, [2, 3, 4, 4, 1], 'Test6');
        runTest([
            ' \t\t', 3,
            '  \t\t', 4,
            '   \t\t', 5,
            '    \t', 5,
            '\t', 1
        ], 4, [2, 3, 4, 4, 1], 'Test7');
        runTest([
            '\t', 1,
            '    ', 4
        ], 4, [1, 4], 'Test8:4');
        runTest([
            '\t', 1,
            '   ', 3
        ], 4, [0, 0], 'Test8:3');
        runTest([
            '\t', 1,
            '  ', 2
        ], 4, [0, 0], 'Test8:2');
        runTest([
            '\t', 1,
            ' ', 1
        ], 4, [0, 0], 'Test8:1');
        runTest([
            '\t', 1,
            '', 0
        ], 4, [0, 0], 'Test8:0');
    });
    test('detects indentation', function () {
        testLineCommentCommand([
            '\tsome text',
            '\tsome more text'
        ], new Selection(2, 2, 1, 1), [
            '\t!@# some text',
            '\t!@# some more text'
        ], new Selection(2, 2, 1, 1));
    });
    test('detects mixed indentation', function () {
        testLineCommentCommand([
            '\tsome text',
            '    some more text'
        ], new Selection(2, 2, 1, 1), [
            '\t!@# some text',
            '    !@# some more text'
        ], new Selection(2, 2, 1, 1));
    });
    test('ignores whitespace lines', function () {
        testLineCommentCommand([
            '\tsome text',
            '\t   ',
            '',
            '\tsome more text'
        ], new Selection(4, 2, 1, 1), [
            '\t!@# some text',
            '\t   ',
            '',
            '\t!@# some more text'
        ], new Selection(4, 2, 1, 1));
    });
    test('removes its own', function () {
        testLineCommentCommand([
            '\t!@# some text',
            '\t   ',
            '\t\t!@# some more text'
        ], new Selection(3, 2, 1, 1), [
            '\tsome text',
            '\t   ',
            '\t\tsome more text'
        ], new Selection(3, 2, 1, 1));
    });
    test('works in only whitespace', function () {
        testLineCommentCommand([
            '\t    ',
            '\t',
            '\t\tsome more text'
        ], new Selection(3, 1, 1, 1), [
            '\t!@#     ',
            '\t!@# ',
            '\t\tsome more text'
        ], new Selection(3, 1, 1, 1));
    });
    test('bug 9697 - whitespace before comment token', function () {
        testLineCommentCommand([
            '\t !@#first',
            '\tsecond line'
        ], new Selection(1, 1, 1, 1), [
            '\t first',
            '\tsecond line'
        ], new Selection(1, 1, 1, 1));
    });
    test('bug 10162 - line comment before caret', function () {
        testLineCommentCommand([
            'first!@#',
            '\tsecond line'
        ], new Selection(1, 1, 1, 1), [
            '!@# first!@#',
            '\tsecond line'
        ], new Selection(1, 5, 1, 5));
    });
    test('comment single line - leading whitespace', function () {
        testLineCommentCommand([
            'first!@#',
            '\tsecond line'
        ], new Selection(2, 3, 2, 1), [
            'first!@#',
            '\t!@# second line'
        ], new Selection(2, 7, 2, 1));
    });
    test('ignores invisible selection', function () {
        testLineCommentCommand([
            'first',
            '\tsecond line',
            'third line',
            'fourth line',
            'fifth'
        ], new Selection(2, 1, 1, 1), [
            '!@# first',
            '\tsecond line',
            'third line',
            'fourth line',
            'fifth'
        ], new Selection(2, 1, 1, 5));
    });
    test('multiple lines', function () {
        testLineCommentCommand([
            'first',
            '\tsecond line',
            'third line',
            'fourth line',
            'fifth'
        ], new Selection(2, 4, 1, 1), [
            '!@# first',
            '!@# \tsecond line',
            'third line',
            'fourth line',
            'fifth'
        ], new Selection(2, 8, 1, 5));
    });
    test('multiple modes on multiple lines', function () {
        testLineCommentCommand([
            'first',
            '\tsecond line',
            'third line',
            'fourth line',
            'fifth'
        ], new Selection(4, 4, 3, 1), [
            'first',
            '\tsecond line',
            '!@# third line',
            '!@# fourth line',
            'fifth'
        ], new Selection(4, 8, 3, 5));
    });
    test('toggle single line', function () {
        testLineCommentCommand([
            'first',
            '\tsecond line',
            'third line',
            'fourth line',
            'fifth'
        ], new Selection(1, 1, 1, 1), [
            '!@# first',
            '\tsecond line',
            'third line',
            'fourth line',
            'fifth'
        ], new Selection(1, 5, 1, 5));
        testLineCommentCommand([
            '!@# first',
            '\tsecond line',
            'third line',
            'fourth line',
            'fifth'
        ], new Selection(1, 4, 1, 4), [
            'first',
            '\tsecond line',
            'third line',
            'fourth line',
            'fifth'
        ], new Selection(1, 1, 1, 1));
    });
    test('toggle multiple lines', function () {
        testLineCommentCommand([
            'first',
            '\tsecond line',
            'third line',
            'fourth line',
            'fifth'
        ], new Selection(2, 4, 1, 1), [
            '!@# first',
            '!@# \tsecond line',
            'third line',
            'fourth line',
            'fifth'
        ], new Selection(2, 8, 1, 5));
        testLineCommentCommand([
            '!@# first',
            '!@# \tsecond line',
            'third line',
            'fourth line',
            'fifth'
        ], new Selection(2, 7, 1, 4), [
            'first',
            '\tsecond line',
            'third line',
            'fourth line',
            'fifth'
        ], new Selection(2, 3, 1, 1));
    });
    test('issue #5964: Ctrl+/ to create comment when cursor is at the beginning of the line puts the cursor in a strange position', () => {
        testLineCommentCommand([
            'first',
            '\tsecond line',
            'third line',
            'fourth line',
            'fifth'
        ], new Selection(1, 1, 1, 1), [
            '!@# first',
            '\tsecond line',
            'third line',
            'fourth line',
            'fifth'
        ], new Selection(1, 5, 1, 5));
    });
    test('issue #35673: Comment hotkeys throws the cursor before the comment', () => {
        testLineCommentCommand([
            'first',
            '',
            '\tsecond line',
            'third line',
            'fourth line',
            'fifth'
        ], new Selection(2, 1, 2, 1), [
            'first',
            '!@# ',
            '\tsecond line',
            'third line',
            'fourth line',
            'fifth'
        ], new Selection(2, 5, 2, 5));
        testLineCommentCommand([
            'first',
            '\t',
            '\tsecond line',
            'third line',
            'fourth line',
            'fifth'
        ], new Selection(2, 2, 2, 2), [
            'first',
            '\t!@# ',
            '\tsecond line',
            'third line',
            'fourth line',
            'fifth'
        ], new Selection(2, 6, 2, 6));
    });
    test('issue #2837 "Add Line Comment" fault when blank lines involved', function () {
        testAddLineCommentCommand([
            '    if displayName == "":',
            '        displayName = groupName',
            '    description = getAttr(attributes, "description")',
            '    mailAddress = getAttr(attributes, "mail")',
            '',
            '    print "||Group name|%s|" % displayName',
            '    print "||Description|%s|" % description',
            '    print "||Email address|[mailto:%s]|" % mailAddress`',
        ], new Selection(1, 1, 8, 56), [
            '    !@# if displayName == "":',
            '    !@#     displayName = groupName',
            '    !@# description = getAttr(attributes, "description")',
            '    !@# mailAddress = getAttr(attributes, "mail")',
            '',
            '    !@# print "||Group name|%s|" % displayName',
            '    !@# print "||Description|%s|" % description',
            '    !@# print "||Email address|[mailto:%s]|" % mailAddress`',
        ], new Selection(1, 1, 8, 60));
    });
    test('issue #47004: Toggle comments shouldn\'t move cursor', () => {
        testAddLineCommentCommand([
            '    A line',
            '    Another line'
        ], new Selection(2, 7, 1, 1), [
            '    !@# A line',
            '    !@# Another line'
        ], new Selection(2, 11, 1, 1));
    });
    test('insertSpace false', () => {
        const testLineCommentCommand = createTestCommandHelper({ lineComment: '!@#' }, (accessor, sel) => new LineCommentCommand(accessor.get(ILanguageConfigurationService), sel, 4, 0 /* Type.Toggle */, false, true));
        testLineCommentCommand([
            'some text'
        ], new Selection(1, 1, 1, 1), [
            '!@#some text'
        ], new Selection(1, 4, 1, 4));
    });
    test('insertSpace false does not remove space', () => {
        const testLineCommentCommand = createTestCommandHelper({ lineComment: '!@#' }, (accessor, sel) => new LineCommentCommand(accessor.get(ILanguageConfigurationService), sel, 4, 0 /* Type.Toggle */, false, true));
        testLineCommentCommand([
            '!@#    some text'
        ], new Selection(1, 1, 1, 1), [
            '    some text'
        ], new Selection(1, 1, 1, 1));
    });
});
suite('ignoreEmptyLines false', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    const testLineCommentCommand = createTestCommandHelper({ lineComment: '!@#', blockComment: ['<!@#', '#@!>'] }, (accessor, sel) => new LineCommentCommand(accessor.get(ILanguageConfigurationService), sel, 4, 0 /* Type.Toggle */, true, false));
    test('does not ignore whitespace lines', () => {
        testLineCommentCommand([
            '\tsome text',
            '\t   ',
            '',
            '\tsome more text'
        ], new Selection(4, 2, 1, 1), [
            '!@# \tsome text',
            '!@# \t   ',
            '!@# ',
            '!@# \tsome more text'
        ], new Selection(4, 6, 1, 5));
    });
    test('removes its own', function () {
        testLineCommentCommand([
            '\t!@# some text',
            '\t   ',
            '\t\t!@# some more text'
        ], new Selection(3, 2, 1, 1), [
            '\tsome text',
            '\t   ',
            '\t\tsome more text'
        ], new Selection(3, 2, 1, 1));
    });
    test('works in only whitespace', function () {
        testLineCommentCommand([
            '\t    ',
            '\t',
            '\t\tsome more text'
        ], new Selection(3, 1, 1, 1), [
            '\t!@#     ',
            '\t!@# ',
            '\t\tsome more text'
        ], new Selection(3, 1, 1, 1));
    });
    test('comments single line', function () {
        testLineCommentCommand([
            'some text',
            '\tsome more text'
        ], new Selection(1, 1, 1, 1), [
            '!@# some text',
            '\tsome more text'
        ], new Selection(1, 5, 1, 5));
    });
    test('detects indentation', function () {
        testLineCommentCommand([
            '\tsome text',
            '\tsome more text'
        ], new Selection(2, 2, 1, 1), [
            '\t!@# some text',
            '\t!@# some more text'
        ], new Selection(2, 2, 1, 1));
    });
});
suite('Editor Contrib - Line Comment As Block Comment', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    const testLineCommentCommand = createTestCommandHelper({ lineComment: '', blockComment: ['(', ')'] }, (accessor, sel) => new LineCommentCommand(accessor.get(ILanguageConfigurationService), sel, 4, 0 /* Type.Toggle */, true, true));
    test('fall back to block comment command', function () {
        testLineCommentCommand([
            'first',
            '\tsecond line',
            'third line',
            'fourth line',
            'fifth'
        ], new Selection(1, 1, 1, 1), [
            '( first )',
            '\tsecond line',
            'third line',
            'fourth line',
            'fifth'
        ], new Selection(1, 3, 1, 3));
    });
    test('fall back to block comment command - toggle', function () {
        testLineCommentCommand([
            '(first)',
            '\tsecond line',
            'third line',
            'fourth line',
            'fifth'
        ], new Selection(1, 7, 1, 2), [
            'first',
            '\tsecond line',
            'third line',
            'fourth line',
            'fifth'
        ], new Selection(1, 6, 1, 1));
    });
    test('bug 9513 - expand single line to uncomment auto block', function () {
        testLineCommentCommand([
            'first',
            '\tsecond line',
            'third line',
            'fourth line',
            'fifth'
        ], new Selection(1, 1, 1, 1), [
            '( first )',
            '\tsecond line',
            'third line',
            'fourth line',
            'fifth'
        ], new Selection(1, 3, 1, 3));
    });
    test('bug 9691 - always expand selection to line boundaries', function () {
        testLineCommentCommand([
            'first',
            '\tsecond line',
            'third line',
            'fourth line',
            'fifth'
        ], new Selection(3, 2, 1, 3), [
            '( first',
            '\tsecond line',
            'third line )',
            'fourth line',
            'fifth'
        ], new Selection(3, 2, 1, 5));
        testLineCommentCommand([
            '(first',
            '\tsecond line',
            'third line)',
            'fourth line',
            'fifth'
        ], new Selection(3, 11, 1, 2), [
            'first',
            '\tsecond line',
            'third line',
            'fourth line',
            'fifth'
        ], new Selection(3, 11, 1, 1));
    });
});
suite('Editor Contrib - Line Comment As Block Comment 2', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    const testLineCommentCommand = createTestCommandHelper({ lineComment: null, blockComment: ['<!@#', '#@!>'] }, (accessor, sel) => new LineCommentCommand(accessor.get(ILanguageConfigurationService), sel, 4, 0 /* Type.Toggle */, true, true));
    test('no selection => uses indentation', function () {
        testLineCommentCommand([
            '\t\tfirst\t    ',
            '\t\tsecond line',
            '\tthird line',
            'fourth line',
            '\t\t<!@#fifth#@!>\t\t'
        ], new Selection(1, 1, 1, 1), [
            '\t\t<!@# first\t     #@!>',
            '\t\tsecond line',
            '\tthird line',
            'fourth line',
            '\t\t<!@#fifth#@!>\t\t'
        ], new Selection(1, 1, 1, 1));
        testLineCommentCommand([
            '\t\t<!@#first\t    #@!>',
            '\t\tsecond line',
            '\tthird line',
            'fourth line',
            '\t\t<!@#fifth#@!>\t\t'
        ], new Selection(1, 1, 1, 1), [
            '\t\tfirst\t   ',
            '\t\tsecond line',
            '\tthird line',
            'fourth line',
            '\t\t<!@#fifth#@!>\t\t'
        ], new Selection(1, 1, 1, 1));
    });
    test('can remove', function () {
        testLineCommentCommand([
            '\t\tfirst\t    ',
            '\t\tsecond line',
            '\tthird line',
            'fourth line',
            '\t\t<!@#fifth#@!>\t\t'
        ], new Selection(5, 1, 5, 1), [
            '\t\tfirst\t    ',
            '\t\tsecond line',
            '\tthird line',
            'fourth line',
            '\t\tfifth\t\t'
        ], new Selection(5, 1, 5, 1));
        testLineCommentCommand([
            '\t\tfirst\t    ',
            '\t\tsecond line',
            '\tthird line',
            'fourth line',
            '\t\t<!@#fifth#@!>\t\t'
        ], new Selection(5, 3, 5, 3), [
            '\t\tfirst\t    ',
            '\t\tsecond line',
            '\tthird line',
            'fourth line',
            '\t\tfifth\t\t'
        ], new Selection(5, 3, 5, 3));
        testLineCommentCommand([
            '\t\tfirst\t    ',
            '\t\tsecond line',
            '\tthird line',
            'fourth line',
            '\t\t<!@#fifth#@!>\t\t'
        ], new Selection(5, 4, 5, 4), [
            '\t\tfirst\t    ',
            '\t\tsecond line',
            '\tthird line',
            'fourth line',
            '\t\tfifth\t\t'
        ], new Selection(5, 3, 5, 3));
        testLineCommentCommand([
            '\t\tfirst\t    ',
            '\t\tsecond line',
            '\tthird line',
            'fourth line',
            '\t\t<!@#fifth#@!>\t\t'
        ], new Selection(5, 16, 5, 3), [
            '\t\tfirst\t    ',
            '\t\tsecond line',
            '\tthird line',
            'fourth line',
            '\t\tfifth\t\t'
        ], new Selection(5, 8, 5, 3));
        testLineCommentCommand([
            '\t\tfirst\t    ',
            '\t\tsecond line',
            '\tthird line',
            'fourth line',
            '\t\t<!@#fifth#@!>\t\t'
        ], new Selection(5, 12, 5, 7), [
            '\t\tfirst\t    ',
            '\t\tsecond line',
            '\tthird line',
            'fourth line',
            '\t\tfifth\t\t'
        ], new Selection(5, 8, 5, 3));
        testLineCommentCommand([
            '\t\tfirst\t    ',
            '\t\tsecond line',
            '\tthird line',
            'fourth line',
            '\t\t<!@#fifth#@!>\t\t'
        ], new Selection(5, 18, 5, 18), [
            '\t\tfirst\t    ',
            '\t\tsecond line',
            '\tthird line',
            'fourth line',
            '\t\tfifth\t\t'
        ], new Selection(5, 10, 5, 10));
    });
    test('issue #993: Remove comment does not work consistently in HTML', () => {
        testLineCommentCommand([
            '     asd qwe',
            '     asd qwe',
            ''
        ], new Selection(1, 1, 3, 1), [
            '     <!@# asd qwe',
            '     asd qwe #@!>',
            ''
        ], new Selection(1, 1, 3, 1));
        testLineCommentCommand([
            '     <!@#asd qwe',
            '     asd qwe#@!>',
            ''
        ], new Selection(1, 1, 3, 1), [
            '     asd qwe',
            '     asd qwe',
            ''
        ], new Selection(1, 1, 3, 1));
    });
});
suite('Editor Contrib - Line Comment in mixed modes', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    const OUTER_LANGUAGE_ID = 'outerMode';
    const INNER_LANGUAGE_ID = 'innerMode';
    let OuterMode = class OuterMode extends Disposable {
        constructor(commentsConfig, languageService, languageConfigurationService) {
            super();
            this.languageId = OUTER_LANGUAGE_ID;
            this._register(languageService.registerLanguage({ id: this.languageId }));
            this._register(languageConfigurationService.register(this.languageId, {
                comments: commentsConfig
            }));
            this._register(TokenizationRegistry.register(this.languageId, {
                getInitialState: () => NullState,
                tokenize: () => {
                    throw new Error('not implemented');
                },
                tokenizeEncoded: (line, hasEOL, state) => {
                    const languageId = (/^  /.test(line) ? INNER_LANGUAGE_ID : OUTER_LANGUAGE_ID);
                    const encodedLanguageId = languageService.languageIdCodec.encodeLanguageId(languageId);
                    const tokens = new Uint32Array(1 << 1);
                    tokens[(0 << 1)] = 0;
                    tokens[(0 << 1) + 1] = ((1 /* ColorId.DefaultForeground */ << 15 /* MetadataConsts.FOREGROUND_OFFSET */)
                        | (encodedLanguageId << 0 /* MetadataConsts.LANGUAGEID_OFFSET */));
                    return new EncodedTokenizationResult(tokens, state);
                }
            }));
        }
    };
    OuterMode = __decorate([
        __param(1, ILanguageService),
        __param(2, ILanguageConfigurationService)
    ], OuterMode);
    let InnerMode = class InnerMode extends Disposable {
        constructor(commentsConfig, languageService, languageConfigurationService) {
            super();
            this.languageId = INNER_LANGUAGE_ID;
            this._register(languageService.registerLanguage({ id: this.languageId }));
            this._register(languageConfigurationService.register(this.languageId, {
                comments: commentsConfig
            }));
        }
    };
    InnerMode = __decorate([
        __param(1, ILanguageService),
        __param(2, ILanguageConfigurationService)
    ], InnerMode);
    function testLineCommentCommand(lines, selection, expectedLines, expectedSelection) {
        const setup = (accessor, disposables) => {
            const instantiationService = accessor.get(IInstantiationService);
            disposables.add(instantiationService.createInstance(OuterMode, { lineComment: '//', blockComment: ['/*', '*/'] }));
            disposables.add(instantiationService.createInstance(InnerMode, { lineComment: null, blockComment: ['{/*', '*/}'] }));
        };
        testCommand(lines, OUTER_LANGUAGE_ID, selection, (accessor, sel) => new LineCommentCommand(accessor.get(ILanguageConfigurationService), sel, 4, 0 /* Type.Toggle */, true, true), expectedLines, expectedSelection, true, setup);
    }
    test('issue #24047 (part 1): Commenting code in JSX files', () => {
        testLineCommentCommand([
            'import React from \'react\';',
            'const Loader = () => (',
            '  <div>',
            '    Loading...',
            '  </div>',
            ');',
            'export default Loader;'
        ], new Selection(1, 1, 7, 22), [
            '// import React from \'react\';',
            '// const Loader = () => (',
            '//   <div>',
            '//     Loading...',
            '//   </div>',
            '// );',
            '// export default Loader;'
        ], new Selection(1, 4, 7, 25));
    });
    test('issue #24047 (part 2): Commenting code in JSX files', () => {
        testLineCommentCommand([
            'import React from \'react\';',
            'const Loader = () => (',
            '  <div>',
            '    Loading...',
            '  </div>',
            ');',
            'export default Loader;'
        ], new Selection(3, 4, 3, 4), [
            'import React from \'react\';',
            'const Loader = () => (',
            '  {/* <div> */}',
            '    Loading...',
            '  </div>',
            ');',
            'export default Loader;'
        ], new Selection(3, 8, 3, 8));
    });
    test('issue #36173: Commenting code in JSX tag body', () => {
        testLineCommentCommand([
            '<div>',
            '  {123}',
            '</div>',
        ], new Selection(2, 4, 2, 4), [
            '<div>',
            '  {/* {123} */}',
            '</div>',
        ], new Selection(2, 8, 2, 8));
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGluZUNvbW1lbnRDb21tYW5kLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9jb21tZW50L3Rlc3QvYnJvd3Nlci9saW5lQ29tbWVudENvbW1hbmQudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUN0RixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFHakUsT0FBTyxFQUFFLHlCQUF5QixFQUFVLG9CQUFvQixFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDMUcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFFNUUsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDOUcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQ3pFLE9BQU8sRUFBb0Qsa0JBQWtCLEVBQVEsTUFBTSxxQ0FBcUMsQ0FBQztBQUNqSSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDdEUsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0sbUVBQW1FLENBQUM7QUFDckgsT0FBTyxFQUFFLHFCQUFxQixFQUFvQixNQUFNLCtEQUErRCxDQUFDO0FBRXhILFNBQVMsdUJBQXVCLENBQUMsY0FBMkIsRUFBRSxjQUE4RTtJQUMzSSxPQUFPLENBQUMsS0FBZSxFQUFFLFNBQW9CLEVBQUUsYUFBdUIsRUFBRSxpQkFBNEIsRUFBRSxFQUFF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WCxNQUFNLEVBQUUsQ0FBQztTQUNULEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBRWhDLE9BQU8sQ0FBQztZQUNQLE1BQU0sRUFBRSxDQUFDO1lBQ1QsUUFBUSxFQUFFLENBQUM7WUFDWCxVQUFVLEVBQUUsQ0FBQztZQUNiLFFBQVEsRUFBRSxDQUFDO1lBQ1gsTUFBTSxFQUFFLENBQUM7U0FDVCxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUVoQyxPQUFPLENBQUM7WUFDUCxLQUFLLEVBQUUsQ0FBQztZQUNSLE1BQU0sRUFBRSxDQUFDO1lBQ1QsT0FBTyxFQUFFLENBQUM7WUFDVixNQUFNLEVBQUUsQ0FBQztZQUNULElBQUksRUFBRSxDQUFDO1NBQ1AsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFFaEMsT0FBTyxDQUFDO1lBQ1AsT0FBTyxFQUFFLENBQUM7WUFDVixRQUFRLEVBQUUsQ0FBQztZQUNYLFNBQVMsRUFBRSxDQUFDO1lBQ1osUUFBUSxFQUFFLENBQUM7WUFDWCxJQUFJLEVBQUUsQ0FBQztTQUNQLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBRWhDLE9BQU8sQ0FBQztZQUNQLElBQUksRUFBRSxDQUFDO1lBQ1AsTUFBTSxFQUFFLENBQUM7U0FDVCxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUN6QixPQUFPLENBQUM7WUFDUCxJQUFJLEVBQUUsQ0FBQztZQUNQLEtBQUssRUFBRSxDQUFDO1NBQ1IsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDekIsT0FBTyxDQUFDO1lBQ1AsSUFBSSxFQUFFLENBQUM7WUFDUCxJQUFJLEVBQUUsQ0FBQztTQUNQLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ3pCLE9BQU8sQ0FBQztZQUNQLElBQUksRUFBRSxDQUFDO1lBQ1AsR0FBRyxFQUFFLENBQUM7U0FDTixFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUN6QixPQUFPLENBQUM7WUFDUCxJQUFJLEVBQUUsQ0FBQztZQUNQLEVBQUUsRUFBRSxDQUFDO1NBQ0wsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUM7SUFDMUIsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMscUJBQXFCLEVBQUU7UUFDM0Isc0JBQXNCLENBQ3JCO1lBQ0MsYUFBYTtZQUNiLGtCQUFrQjtTQUNsQixFQUNELElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUN6QjtZQUNDLGlCQUFpQjtZQUNqQixzQkFBc0I7U0FDdEIsRUFDRCxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FDekIsQ0FBQztJQUNILENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLDJCQUEyQixFQUFFO1FBQ2pDLHNCQUFzQixDQUNyQjtZQUNDLGFBQWE7WUFDYixvQkFBb0I7U0FDcEIsRUFDRCxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDekI7WUFDQyxpQkFBaUI7WUFDakIsd0JBQXdCO1NBQ3hCLEVBQ0QsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQ3pCLENBQUM7SUFDSCxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQywwQkFBMEIsRUFBRTtRQUNoQyxzQkFBc0IsQ0FDckI7WUFDQyxhQUFhO1lBQ2IsT0FBTztZQUNQLEVBQUU7WUFDRixrQkFBa0I7U0FDbEIsRUFDRCxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDekI7WUFDQyxpQkFBaUI7WUFDakIsT0FBTztZQUNQLEVBQUU7WUFDRixzQkFBc0I7U0FDdEIsRUFDRCxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FDekIsQ0FBQztJQUNILENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLGlCQUFpQixFQUFFO1FBQ3ZCLHNCQUFzQixDQUNyQjtZQUNDLGlCQUFpQjtZQUNqQixPQUFPO1lBQ1Asd0JBQXdCO1NBQ3hCLEVBQ0QsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQ3pCO1lBQ0MsYUFBYTtZQUNiLE9BQU87WUFDUCxvQkFBb0I7U0FDcEIsRUFDRCxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FDekIsQ0FBQztJQUNILENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLDBCQUEwQixFQUFFO1FBQ2hDLHNCQUFzQixDQUNyQjtZQUNDLFFBQVE7WUFDUixJQUFJO1lBQ0osb0JBQW9CO1NBQ3BCLEVBQ0QsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQ3pCO1lBQ0MsWUFBWTtZQUNaLFFBQVE7WUFDUixvQkFBb0I7U0FDcEIsRUFDRCxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FDekIsQ0FBQztJQUNILENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLDRDQUE0QyxFQUFFO1FBQ2xELHNCQUFzQixDQUNyQjtZQUNDLGFBQWE7WUFDYixlQUFlO1NBQ2YsRUFDRCxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDekI7WUFDQyxVQUFVO1lBQ1YsZUFBZTtTQUNmLEVBQ0QsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQ3pCLENBQUM7SUFDSCxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyx1Q0FBdUMsRUFBRTtRQUM3QyxzQkFBc0IsQ0FDckI7WUFDQyxVQUFVO1lBQ1YsZUFBZTtTQUNmLEVBQ0QsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQ3pCO1lBQ0MsY0FBYztZQUNkLGVBQWU7U0FDZixFQUNELElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUN6QixDQUFDO0lBQ0gsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsMENBQTBDLEVBQUU7UUFDaEQsc0JBQXNCLENBQ3JCO1lBQ0MsVUFBVTtZQUNWLGVBQWU7U0FDZixFQUNELElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUN6QjtZQUNDLFVBQVU7WUFDVixtQkFBbUI7U0FDbkIsRUFDRCxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FDekIsQ0FBQztJQUNILENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLDZCQUE2QixFQUFFO1FBQ25DLHNCQUFzQixDQUNyQjtZQUNDLE9BQU87WUFDUCxlQUFlO1lBQ2YsWUFBWTtZQUNaLGFBQWE7WUFDYixPQUFPO1NBQ1AsRUFDRCxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDekI7WUFDQyxXQUFXO1lBQ1gsZUFBZTtZQUNmLFlBQVk7WUFDWixhQUFhO1lBQ2IsT0FBTztTQUNQLEVBQ0QsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQ3pCLENBQUM7SUFDSCxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxnQkFBZ0IsRUFBRTtRQUN0QixzQkFBc0IsQ0FDckI7WUFDQyxPQUFPO1lBQ1AsZUFBZTtZQUNmLFlBQVk7WUFDWixhQUFhO1lBQ2IsT0FBTztTQUNQLEVBQ0QsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQ3pCO1lBQ0MsV0FBVztZQUNYLG1CQUFtQjtZQUNuQixZQUFZO1lBQ1osYUFBYTtZQUNiLE9BQU87U0FDUCxFQUNELElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUN6QixDQUFDO0lBQ0gsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsa0NBQWtDLEVBQUU7UUFDeEMsc0JBQXNCLENBQ3JCO1lBQ0MsT0FBTztZQUNQLGVBQWU7WUFDZixZQUFZO1lBQ1osYUFBYTtZQUNiLE9BQU87U0FDUCxFQUNELElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUN6QjtZQUNDLE9BQU87WUFDUCxlQUFlO1lBQ2YsZ0JBQWdCO1lBQ2hCLGlCQUFpQjtZQUNqQixPQUFPO1NBQ1AsRUFDRCxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FDekIsQ0FBQztJQUNILENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLG9CQUFvQixFQUFFO1FBQzFCLHNCQUFzQixDQUNyQjtZQUNDLE9BQU87WUFDUCxlQUFlO1lBQ2YsWUFBWTtZQUNaLGFBQWE7WUFDYixPQUFPO1NBQ1AsRUFDRCxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDekI7WUFDQyxXQUFXO1lBQ1gsZUFBZTtZQUNmLFlBQVk7WUFDWixhQUFhO1lBQ2IsT0FBTztTQUNQLEVBQ0QsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQ3pCLENBQUM7UUFFRixzQkFBc0IsQ0FDckI7WUFDQyxXQUFXO1lBQ1gsZUFBZTtZQUNmLFlBQVk7WUFDWixhQUFhO1lBQ2IsT0FBTztTQUNQLEVBQ0QsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQ3pCO1lBQ0MsT0FBTztZQUNQLGVBQWU7WUFDZixZQUFZO1lBQ1osYUFBYTtZQUNiLE9BQU87U0FDUCxFQUNELElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUN6QixDQUFDO0lBQ0gsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsdUJBQXVCLEVBQUU7UUFDN0Isc0JBQXNCLENBQ3JCO1lBQ0MsT0FBTztZQUNQLGVBQWU7WUFDZixZQUFZO1lBQ1osYUFBYTtZQUNiLE9BQU87U0FDUCxFQUNELElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUN6QjtZQUNDLFdBQVc7WUFDWCxtQkFBbUI7WUFDbkIsWUFBWTtZQUNaLGFBQWE7WUFDYixPQUFPO1NBQ1AsRUFDRCxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FDekIsQ0FBQztRQUVGLHNCQUFzQixDQUNyQjtZQUNDLFdBQVc7WUFDWCxtQkFBbUI7WUFDbkIsWUFBWTtZQUNaLGFBQWE7WUFDYixPQUFPO1NBQ1AsRUFDRCxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDekI7WUFDQyxPQUFPO1lBQ1AsZUFBZTtZQUNmLFlBQVk7WUFDWixhQUFhO1lBQ2IsT0FBTztTQUNQLEVBQ0QsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQ3pCLENBQUM7SUFDSCxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyx5SEFBeUgsRUFBRSxHQUFHLEVBQUU7UUFDcEksc0JBQXNCLENBQ3JCO1lBQ0MsT0FBTztZQUNQLGVBQWU7WUFDZixZQUFZO1lBQ1osYUFBYTtZQUNiLE9BQU87U0FDUCxFQUNELElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUN6QjtZQUNDLFdBQVc7WUFDWCxlQUFlO1lBQ2YsWUFBWTtZQUNaLGFBQWE7WUFDYixPQUFPO1NBQ1AsRUFDRCxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FDekIsQ0FBQztJQUNILENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLG9FQUFvRSxFQUFFLEdBQUcsRUFBRTtRQUMvRSxzQkFBc0IsQ0FDckI7WUFDQyxPQUFPO1lBQ1AsRUFBRTtZQUNGLGVBQWU7WUFDZixZQUFZO1lBQ1osYUFBYTtZQUNiLE9BQU87U0FDUCxFQUNELElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUN6QjtZQUNDLE9BQU87WUFDUCxNQUFNO1lBQ04sZUFBZTtZQUNmLFlBQVk7WUFDWixhQUFhO1lBQ2IsT0FBTztTQUNQLEVBQ0QsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQ3pCLENBQUM7UUFFRixzQkFBc0IsQ0FDckI7WUFDQyxPQUFPO1lBQ1AsSUFBSTtZQUNKLGVBQWU7WUFDZixZQUFZO1lBQ1osYUFBYTtZQUNiLE9BQU87U0FDUCxFQUNELElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUN6QjtZQUNDLE9BQU87WUFDUCxRQUFRO1lBQ1IsZUFBZTtZQUNmLFlBQVk7WUFDWixhQUFhO1lBQ2IsT0FBTztTQUNQLEVBQ0QsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQ3pCLENBQUM7SUFDSCxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxnRUFBZ0UsRUFBRTtRQUN0RSx5QkFBeUIsQ0FDeEI7WUFDQywyQkFBMkI7WUFDM0IsaUNBQWlDO1lBQ2pDLHNEQUFzRDtZQUN0RCwrQ0FBK0M7WUFDL0MsRUFBRTtZQUNGLDRDQUE0QztZQUM1Qyw2Q0FBNkM7WUFDN0MseURBQXlEO1NBQ3pELEVBQ0QsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQzFCO1lBQ0MsK0JBQStCO1lBQy9CLHFDQUFxQztZQUNyQywwREFBMEQ7WUFDMUQsbURBQW1EO1lBQ25ELEVBQUU7WUFDRixnREFBZ0Q7WUFDaEQsaURBQWlEO1lBQ2pELDZEQUE2RDtTQUM3RCxFQUNELElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUMxQixDQUFDO0lBQ0gsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsc0RBQXNELEVBQUUsR0FBRyxFQUFFO1FBQ2pFLHlCQUF5QixDQUN4QjtZQUNDLFlBQVk7WUFDWixrQkFBa0I7U0FDbEIsRUFDRCxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDekI7WUFDQyxnQkFBZ0I7WUFDaEIsc0JBQXNCO1NBQ3RCLEVBQ0QsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQzFCLENBQUM7SUFDSCxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxtQkFBbUIsRUFBRSxHQUFHLEVBQUU7UUFDOUIsTUFBTSxzQkFBc0IsR0FBRyx1QkFBdUIsQ0FDckQsRUFBRSxXQUFXLEVBQUUsS0FBSyxFQUFFLEVBQ3RCLENBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRSxFQUFFLENBQUMsSUFBSSxrQkFBa0IsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLDZCQUE2QixDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsdUJBQWUsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUN4SCxDQUFDO1FBRUYsc0JBQXNCLENBQ3JCO1lBQ0MsV0FBVztTQUNYLEVBQ0QsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQ3pCO1lBQ0MsY0FBYztTQUNkLEVBQ0QsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQ3pCLENBQUM7SUFDSCxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyx5Q0FBeUMsRUFBRSxHQUFHLEVBQUU7UUFDcEQsTUFBTSxzQkFBc0IsR0FBRyx1QkFBdUIsQ0FDckQsRUFBRSxXQUFXLEVBQUUsS0FBSyxFQUFFLEVBQ3RCLENBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRSxFQUFFLENBQUMsSUFBSSxrQkFBa0IsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLDZCQUE2QixDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsdUJBQWUsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUN4SCxDQUFDO1FBRUYsc0JBQXNCLENBQ3JCO1lBQ0Msa0JBQWtCO1NBQ2xCLEVBQ0QsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQ3pCO1lBQ0MsZUFBZTtTQUNmLEVBQ0QsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQ3pCLENBQUM7SUFDSCxDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDO0FBRUgsS0FBSyxDQUFDLHdCQUF3QixFQUFFLEdBQUcsRUFBRTtJQUVwQyx1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLE1BQU0sc0JBQXNCLEdBQUcsdUJBQXVCLENBQ3JELEVBQUUsV0FBVyxFQUFFLEtBQUssRUFBRSxZQUFZLEVBQUUsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLEVBQUUsRUFDdEQsQ0FBQyxRQUFRLEVBQUUsR0FBRyxFQUFFLEVBQUUsQ0FBQyxJQUFJLGtCQUFrQixDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsNkJBQTZCLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyx1QkFBZSxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQ3hILENBQUM7SUFFRixJQUFJLENBQUMsa0NBQWtDLEVBQUUsR0FBRyxFQUFFO1FBQzdDLHNCQUFzQixDQUNyQjtZQUNDLGFBQWE7WUFDYixPQUFPO1lBQ1AsRUFBRTtZQUNGLGtCQUFrQjtTQUNsQixFQUNELElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUN6QjtZQUNDLGlCQUFpQjtZQUNqQixXQUFXO1lBQ1gsTUFBTTtZQUNOLHNCQUFzQjtTQUN0QixFQUNELElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUN6QixDQUFDO0lBQ0gsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsaUJBQWlCLEVBQUU7UUFDdkIsc0JBQXNCLENBQ3JCO1lBQ0MsaUJBQWlCO1lBQ2pCLE9BQU87WUFDUCx3QkFBd0I7U0FDeEIsRUFDRCxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDekI7WUFDQyxhQUFhO1lBQ2IsT0FBTztZQUNQLG9CQUFvQjtTQUNwQixFQUNELElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUN6QixDQUFDO0lBQ0gsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsMEJBQTBCLEVBQUU7UUFDaEMsc0JBQXNCLENBQ3JCO1lBQ0MsUUFBUTtZQUNSLElBQUk7WUFDSixvQkFBb0I7U0FDcEIsRUFDRCxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDekI7WUFDQyxZQUFZO1lBQ1osUUFBUTtZQUNSLG9CQUFvQjtTQUNwQixFQUNELElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUN6QixDQUFDO0lBQ0gsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsc0JBQXNCLEVBQUU7UUFDNUIsc0JBQXNCLENBQ3JCO1lBQ0MsV0FBVztZQUNYLGtCQUFrQjtTQUNsQixFQUNELElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUN6QjtZQUNDLGVBQWU7WUFDZixrQkFBa0I7U0FDbEIsRUFDRCxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FDekIsQ0FBQztJQUNILENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLHFCQUFxQixFQUFFO1FBQzNCLHNCQUFzQixDQUNyQjtZQUNDLGFBQWE7WUFDYixrQkFBa0I7U0FDbEIsRUFDRCxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDekI7WUFDQyxpQkFBaUI7WUFDakIsc0JBQXNCO1NBQ3RCLEVBQ0QsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQ3pCLENBQUM7SUFDSCxDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDO0FBRUgsS0FBSyxDQUFDLGdEQUFnRCxFQUFFLEdBQUcsRUFBRTtJQUU1RCx1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLE1BQU0sc0JBQXNCLEdBQUcsdUJBQXVCLENBQ3JELEVBQUUsV0FBVyxFQUFFLEVBQUUsRUFBRSxZQUFZLEVBQUUsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLEVBQUUsRUFDN0MsQ0FBQyxRQUFRLEVBQUUsR0FBRyxFQUFFLEVBQUUsQ0FBQyxJQUFJLGtCQUFrQixDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsNkJBQTZCLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyx1QkFBZSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQ3ZILENBQUM7SUFFRixJQUFJLENBQUMsb0NBQW9DLEVBQUU7UUFDMUMsc0JBQXNCLENBQ3JCO1lBQ0MsT0FBTztZQUNQLGVBQWU7WUFDZixZQUFZO1lBQ1osYUFBYTtZQUNiLE9BQU87U0FDUCxFQUNELElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUN6QjtZQUNDLFdBQVc7WUFDWCxlQUFlO1lBQ2YsWUFBWTtZQUNaLGFBQWE7WUFDYixPQUFPO1NBQ1AsRUFDRCxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FDekIsQ0FBQztJQUNILENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLDZDQUE2QyxFQUFFO1FBQ25ELHNCQUFzQixDQUNyQjtZQUNDLFNBQVM7WUFDVCxlQUFlO1lBQ2YsWUFBWTtZQUNaLGFBQWE7WUFDYixPQUFPO1NBQ1AsRUFDRCxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDekI7WUFDQyxPQUFPO1lBQ1AsZUFBZTtZQUNmLFlBQVk7WUFDWixhQUFhO1lBQ2IsT0FBTztTQUNQLEVBQ0QsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQ3pCLENBQUM7SUFDSCxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyx1REFBdUQsRUFBRTtRQUM3RCxzQkFBc0IsQ0FDckI7WUFDQyxPQUFPO1lBQ1AsZUFBZTtZQUNmLFlBQVk7WUFDWixhQUFhO1lBQ2IsT0FBTztTQUNQLEVBQ0QsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQ3pCO1lBQ0MsV0FBVztZQUNYLGVBQWU7WUFDZixZQUFZO1lBQ1osYUFBYTtZQUNiLE9BQU87U0FDUCxFQUNELElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUN6QixDQUFDO0lBQ0gsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsdURBQXVELEVBQUU7UUFDN0Qsc0JBQXNCLENBQ3JCO1lBQ0MsT0FBTztZQUNQLGVBQWU7WUFDZixZQUFZO1lBQ1osYUFBYTtZQUNiLE9BQU87U0FDUCxFQUNELElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUN6QjtZQUNDLFNBQVM7WUFDVCxlQUFlO1lBQ2YsY0FBYztZQUNkLGFBQWE7WUFDYixPQUFPO1NBQ1AsRUFDRCxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FDekIsQ0FBQztRQUVGLHNCQUFzQixDQUNyQjtZQUNDLFFBQVE7WUFDUixlQUFlO1lBQ2YsYUFBYTtZQUNiLGFBQWE7WUFDYixPQUFPO1NBQ1AsRUFDRCxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDMUI7WUFDQyxPQUFPO1lBQ1AsZUFBZTtZQUNmLFlBQVk7WUFDWixhQUFhO1lBQ2IsT0FBTztTQUNQLEVBQ0QsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQzFCLENBQUM7SUFDSCxDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDO0FBRUgsS0FBSyxDQUFDLGtEQUFrRCxFQUFFLEdBQUcsRUFBRTtJQUU5RCx1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLE1BQU0sc0JBQXNCLEdBQUcsdUJBQXVCLENBQ3JELEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxZQUFZLEVBQUUsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLEVBQUUsRUFDckQsQ0FBQyxRQUFRLEVBQUUsR0FBRyxFQUFFLEVBQUUsQ0FBQyxJQUFJLGtCQUFrQixDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsNkJBQTZCLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyx1QkFBZSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQ3ZILENBQUM7SUFFRixJQUFJLENBQUMsa0NBQWtDLEVBQUU7UUFDeEMsc0JBQXNCLENBQ3JCO1lBQ0MsaUJBQWlCO1lBQ2pCLGlCQUFpQjtZQUNqQixjQUFjO1lBQ2QsYUFBYTtZQUNiLHVCQUF1QjtTQUN2QixFQUNELElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUN6QjtZQUNDLDJCQUEyQjtZQUMzQixpQkFBaUI7WUFDakIsY0FBYztZQUNkLGFBQWE7WUFDYix1QkFBdUI7U0FDdkIsRUFDRCxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FDekIsQ0FBQztRQUVGLHNCQUFzQixDQUNyQjtZQUNDLHlCQUF5QjtZQUN6QixpQkFBaUI7WUFDakIsY0FBYztZQUNkLGFBQWE7WUFDYix1QkFBdUI7U0FDdkIsRUFDRCxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDekI7WUFDQyxnQkFBZ0I7WUFDaEIsaUJBQWlCO1lBQ2pCLGNBQWM7WUFDZCxhQUFhO1lBQ2IsdUJBQXVCO1NBQ3ZCLEVBQ0QsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQ3pCLENBQUM7SUFDSCxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxZQUFZLEVBQUU7UUFDbEIsc0JBQXNCLENBQ3JCO1lBQ0MsaUJBQWlCO1lBQ2pCLGlCQUFpQjtZQUNqQixjQUFjO1lBQ2QsYUFBYTtZQUNiLHVCQUF1QjtTQUN2QixFQUNELElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUN6QjtZQUNDLGlCQUFpQjtZQUNqQixpQkFBaUI7WUFDakIsY0FBYztZQUNkLGFBQWE7WUFDYixlQUFlO1NBQ2YsRUFDRCxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FDekIsQ0FBQztRQUVGLHNCQUFzQixDQUNyQjtZQUNDLGlCQUFpQjtZQUNqQixpQkFBaUI7WUFDakIsY0FBYztZQUNkLGFBQWE7WUFDYix1QkFBdUI7U0FDdkIsRUFDRCxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDekI7WUFDQyxpQkFBaUI7WUFDakIsaUJBQWlCO1lBQ2pCLGNBQWM7WUFDZCxhQUFhO1lBQ2IsZUFBZTtTQUNmLEVBQ0QsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQ3pCLENBQUM7UUFFRixzQkFBc0IsQ0FDckI7WUFDQyxpQkFBaUI7WUFDakIsaUJBQWlCO1lBQ2pCLGNBQWM7WUFDZCxhQUFhO1lBQ2IsdUJBQXVCO1NBQ3ZCLEVBQ0QsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQ3pCO1lBQ0MsaUJBQWlCO1lBQ2pCLGlCQUFpQjtZQUNqQixjQUFjO1lBQ2QsYUFBYTtZQUNiLGVBQWU7U0FDZixFQUNELElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUN6QixDQUFDO1FBRUYsc0JBQXNCLENBQ3JCO1lBQ0MsaUJBQWlCO1lBQ2pCLGlCQUFpQjtZQUNqQixjQUFjO1lBQ2QsYUFBYTtZQUNiLHVCQUF1QjtTQUN2QixFQUNELElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUMxQjtZQUNDLGlCQUFpQjtZQUNqQixpQkFBaUI7WUFDakIsY0FBYztZQUNkLGFBQWE7WUFDYixlQUFlO1NBQ2YsRUFDRCxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FDekIsQ0FBQztRQUVGLHNCQUFzQixDQUNyQjtZQUNDLGlCQUFpQjtZQUNqQixpQkFBaUI7WUFDakIsY0FBYztZQUNkLGFBQWE7WUFDYix1QkFBdUI7U0FDdkIsRUFDRCxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDMUI7WUFDQyxpQkFBaUI7WUFDakIsaUJBQWlCO1lBQ2pCLGNBQWM7WUFDZCxhQUFhO1lBQ2IsZUFBZTtTQUNmLEVBQ0QsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQ3pCLENBQUM7UUFFRixzQkFBc0IsQ0FDckI7WUFDQyxpQkFBaUI7WUFDakIsaUJBQWlCO1lBQ2pCLGNBQWM7WUFDZCxhQUFhO1lBQ2IsdUJBQXVCO1NBQ3ZCLEVBQ0QsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQzNCO1lBQ0MsaUJBQWlCO1lBQ2pCLGlCQUFpQjtZQUNqQixjQUFjO1lBQ2QsYUFBYTtZQUNiLGVBQWU7U0FDZixFQUNELElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUMzQixDQUFDO0lBQ0gsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsK0RBQStELEVBQUUsR0FBRyxFQUFFO1FBQzFFLHNCQUFzQixDQUNyQjtZQUNDLGNBQWM7WUFDZCxjQUFjO1lBQ2QsRUFBRTtTQUNGLEVBQ0QsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQ3pCO1lBQ0MsbUJBQW1CO1lBQ25CLG1CQUFtQjtZQUNuQixFQUFFO1NBQ0YsRUFDRCxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FDekIsQ0FBQztRQUVGLHNCQUFzQixDQUNyQjtZQUNDLGtCQUFrQjtZQUNsQixrQkFBa0I7WUFDbEIsRUFBRTtTQUNGLEVBQ0QsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQ3pCO1lBQ0MsY0FBYztZQUNkLGNBQWM7WUFDZCxFQUFFO1NBQ0YsRUFDRCxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FDekIsQ0FBQztJQUNILENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUM7QUFFSCxLQUFLLENBQUMsOENBQThDLEVBQUUsR0FBRyxFQUFFO0lBRTFELHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsTUFBTSxpQkFBaUIsR0FBRyxXQUFXLENBQUM7SUFDdEMsTUFBTSxpQkFBaUIsR0FBRyxXQUFXLENBQUM7SUFFdEMsSUFBTSxTQUFTLEdBQWYsTUFBTSxTQUFVLFNBQVEsVUFBVTtRQUVqQyxZQUNDLGNBQTJCLEVBQ1QsZUFBaUMsRUFDcEIsNEJBQTJEO1lBRTFGLEtBQUssRUFBRSxDQUFDO1lBTlEsZUFBVSxHQUFHLGlCQUFpQixDQUFDO1lBTy9DLElBQUksQ0FBQyxTQUFTLENBQUMsZUFBZSxDQUFDLGdCQUFnQixDQUFDLEVBQUUsRUFBRSxFQUFFLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDMUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyw0QkFBNEIsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRTtnQkFDckUsUUFBUSxFQUFFLGNBQWM7YUFDeEIsQ0FBQyxDQUFDLENBQUM7WUFFSixJQUFJLENBQUMsU0FBUyxDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFO2dCQUM3RCxlQUFlLEVBQUUsR0FBVyxFQUFFLENBQUMsU0FBUztnQkFDeEMsUUFBUSxFQUFFLEdBQUcsRUFBRTtvQkFDZCxNQUFNLElBQUksS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUM7Z0JBQ3BDLENBQUM7Z0JBQ0QsZUFBZSxFQUFFLENBQUMsSUFBWSxFQUFFLE1BQWUsRUFBRSxLQUFhLEVBQTZCLEVBQUU7b0JBQzVGLE1BQU0sVUFBVSxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLENBQUM7b0JBQzlFLE1BQU0saUJBQWlCLEdBQUcsZUFBZSxDQUFDLGVBQWUsQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsQ0FBQztvQkFFdkYsTUFBTSxNQUFNLEdBQUcsSUFBSSxXQUFXLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO29CQUN2QyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7b0JBQ3JCLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUN0QixDQUFDLDhFQUE2RCxDQUFDOzBCQUM3RCxDQUFDLGlCQUFpQiw0Q0FBb0MsQ0FBQyxDQUN6RCxDQUFDO29CQUNGLE9BQU8sSUFBSSx5QkFBeUIsQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUM7Z0JBQ3JELENBQUM7YUFDRCxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUM7S0FDRCxDQUFBO0lBaENLLFNBQVM7UUFJWixXQUFBLGdCQUFnQixDQUFBO1FBQ2hCLFdBQUEsNkJBQTZCLENBQUE7T0FMMUIsU0FBUyxDQWdDZDtJQUVELElBQU0sU0FBUyxHQUFmLE1BQU0sU0FBVSxTQUFRLFVBQVU7UUFFakMsWUFDQyxjQUEyQixFQUNULGVBQWlDLEVBQ3BCLDRCQUEyRDtZQUUxRixLQUFLLEVBQUUsQ0FBQztZQU5RLGVBQVUsR0FBRyxpQkFBaUIsQ0FBQztZQU8vQyxJQUFJLENBQUMsU0FBUyxDQUFDLGVBQWUsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLEVBQUUsRUFBRSxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQzFFLElBQUksQ0FBQyxTQUFTLENBQUMsNEJBQTRCLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUU7Z0JBQ3JFLFFBQVEsRUFBRSxjQUFjO2FBQ3hCLENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztLQUNELENBQUE7SUFiSyxTQUFTO1FBSVosV0FBQSxnQkFBZ0IsQ0FBQTtRQUNoQixXQUFBLDZCQUE2QixDQUFBO09BTDFCLFNBQVMsQ0FhZDtJQUVELFNBQVMsc0JBQXNCLENBQUMsS0FBZSxFQUFFLFNBQW9CLEVBQUUsYUFBdUIsRUFBRSxpQkFBNEI7UUFFM0gsTUFBTSxLQUFLLEdBQUcsQ0FBQyxRQUEwQixFQUFFLFdBQTRCLEVBQUUsRUFBRTtZQUMxRSxNQUFNLG9CQUFvQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsQ0FBQztZQUNqRSxXQUFXLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxTQUFTLEVBQUUsRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLFlBQVksRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUNuSCxXQUFXLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxTQUFTLEVBQUUsRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLFlBQVksRUFBRSxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN0SCxDQUFDLENBQUM7UUFFRixXQUFXLENBQ1YsS0FBSyxFQUNMLGlCQUFpQixFQUNqQixTQUFTLEVBQ1QsQ0FBQyxRQUFRLEVBQUUsR0FBRyxFQUFFLEVBQUUsQ0FBQyxJQUFJLGtCQUFrQixDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsNkJBQTZCLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyx1QkFBZSxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQ3ZILGFBQWEsRUFDYixpQkFBaUIsRUFDakIsSUFBSSxFQUNKLEtBQUssQ0FDTCxDQUFDO0lBQ0gsQ0FBQztJQUVELElBQUksQ0FBQyxxREFBcUQsRUFBRSxHQUFHLEVBQUU7UUFDaEUsc0JBQXNCLENBQ3JCO1lBQ0MsOEJBQThCO1lBQzlCLHdCQUF3QjtZQUN4QixTQUFTO1lBQ1QsZ0JBQWdCO1lBQ2hCLFVBQVU7WUFDVixJQUFJO1lBQ0osd0JBQXdCO1NBQ3hCLEVBQ0QsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQzFCO1lBQ0MsaUNBQWlDO1lBQ2pDLDJCQUEyQjtZQUMzQixZQUFZO1lBQ1osbUJBQW1CO1lBQ25CLGFBQWE7WUFDYixPQUFPO1lBQ1AsMkJBQTJCO1NBQzNCLEVBQ0QsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQzFCLENBQUM7SUFDSCxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxxREFBcUQsRUFBRSxHQUFHLEVBQUU7UUFDaEUsc0JBQXNCLENBQ3JCO1lBQ0MsOEJBQThCO1lBQzlCLHdCQUF3QjtZQUN4QixTQUFTO1lBQ1QsZ0JBQWdCO1lBQ2hCLFVBQVU7WUFDVixJQUFJO1lBQ0osd0JBQXdCO1NBQ3hCLEVBQ0QsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQ3pCO1lBQ0MsOEJBQThCO1lBQzlCLHdCQUF3QjtZQUN4QixpQkFBaUI7WUFDakIsZ0JBQWdCO1lBQ2hCLFVBQVU7WUFDVixJQUFJO1lBQ0osd0JBQXdCO1NBQ3hCLEVBQ0QsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQ3pCLENBQUM7SUFDSCxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQywrQ0FBK0MsRUFBRSxHQUFHLEVBQUU7UUFDMUQsc0JBQXNCLENBQ3JCO1lBQ0MsT0FBTztZQUNQLFNBQVM7WUFDVCxRQUFRO1NBQ1IsRUFDRCxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDekI7WUFDQyxPQUFPO1lBQ1AsaUJBQWlCO1lBQ2pCLFFBQVE7U0FDUixFQUNELElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUN6QixDQUFDO0lBQ0gsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyJ9