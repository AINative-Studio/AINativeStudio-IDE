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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGluZUNvbW1lbnRDb21tYW5kLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvY29tbWVudC90ZXN0L2Jyb3dzZXIvbGluZUNvbW1lbnRDb21tYW5kLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDdEYsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDbkcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBR2pFLE9BQU8sRUFBRSx5QkFBeUIsRUFBVSxvQkFBb0IsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQzFHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBRTVFLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQzlHLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUN6RSxPQUFPLEVBQW9ELGtCQUFrQixFQUFRLE1BQU0scUNBQXFDLENBQUM7QUFDakksT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLG1FQUFtRSxDQUFDO0FBQ3JILE9BQU8sRUFBRSxxQkFBcUIsRUFBb0IsTUFBTSwrREFBK0QsQ0FBQztBQUV4SCxTQUFTLHVCQUF1QixDQUFDLGNBQTJCLEVBQUUsY0FBOEU7SUFDM0ksT0FBTyxDQUFDLEtBQWUsRUFBRSxTQUFvQixFQUFFLGFBQXVCLEVBQUUsaUJBQTRCLEVBQUUsRUFB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