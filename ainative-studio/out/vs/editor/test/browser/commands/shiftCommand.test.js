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
var DocBlockCommentMode_1;
import assert from 'assert';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { ShiftCommand } from '../../../common/commands/shiftCommand.js';
import { Range } from '../../../common/core/range.js';
import { Selection } from '../../../common/core/selection.js';
import { ILanguageService } from '../../../common/languages/language.js';
import { ILanguageConfigurationService } from '../../../common/languages/languageConfigurationRegistry.js';
import { getEditOperation, testCommand } from '../testCommand.js';
import { javascriptOnEnterRules } from '../../common/modes/supports/onEnterRules.js';
import { TestLanguageConfigurationService } from '../../common/modes/testLanguageConfigurationService.js';
import { withEditorModel } from '../../common/testTextModel.js';
/**
 * Create single edit operation
 */
function createSingleEditOp(text, positionLineNumber, positionColumn, selectionLineNumber = positionLineNumber, selectionColumn = positionColumn) {
    return {
        range: new Range(selectionLineNumber, selectionColumn, positionLineNumber, positionColumn),
        text: text,
        forceMoveMarkers: false
    };
}
let DocBlockCommentMode = class DocBlockCommentMode extends Disposable {
    static { DocBlockCommentMode_1 = this; }
    static { this.languageId = 'commentMode'; }
    constructor(languageService, languageConfigurationService) {
        super();
        this.languageId = DocBlockCommentMode_1.languageId;
        this._register(languageService.registerLanguage({ id: this.languageId }));
        this._register(languageConfigurationService.register(this.languageId, {
            brackets: [
                ['(', ')'],
                ['{', '}'],
                ['[', ']']
            ],
            onEnterRules: javascriptOnEnterRules
        }));
    }
};
DocBlockCommentMode = DocBlockCommentMode_1 = __decorate([
    __param(0, ILanguageService),
    __param(1, ILanguageConfigurationService)
], DocBlockCommentMode);
function testShiftCommand(lines, languageId, useTabStops, selection, expectedLines, expectedSelection, prepare) {
    testCommand(lines, languageId, selection, (accessor, sel) => new ShiftCommand(sel, {
        isUnshift: false,
        tabSize: 4,
        indentSize: 4,
        insertSpaces: false,
        useTabStops: useTabStops,
        autoIndent: 4 /* EditorAutoIndentStrategy.Full */,
    }, accessor.get(ILanguageConfigurationService)), expectedLines, expectedSelection, undefined, prepare);
}
function testUnshiftCommand(lines, languageId, useTabStops, selection, expectedLines, expectedSelection, prepare) {
    testCommand(lines, languageId, selection, (accessor, sel) => new ShiftCommand(sel, {
        isUnshift: true,
        tabSize: 4,
        indentSize: 4,
        insertSpaces: false,
        useTabStops: useTabStops,
        autoIndent: 4 /* EditorAutoIndentStrategy.Full */,
    }, accessor.get(ILanguageConfigurationService)), expectedLines, expectedSelection, undefined, prepare);
}
function prepareDocBlockCommentLanguage(accessor, disposables) {
    const languageConfigurationService = accessor.get(ILanguageConfigurationService);
    const languageService = accessor.get(ILanguageService);
    disposables.add(new DocBlockCommentMode(languageService, languageConfigurationService));
}
suite('Editor Commands - ShiftCommand', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    // --------- shift
    test('Bug 9503: Shifting without any selection', () => {
        testShiftCommand([
            'My First Line',
            '\t\tMy Second Line',
            '    Third Line',
            '',
            '123'
        ], null, true, new Selection(1, 1, 1, 1), [
            '\tMy First Line',
            '\t\tMy Second Line',
            '    Third Line',
            '',
            '123'
        ], new Selection(1, 2, 1, 2));
    });
    test('shift on single line selection 1', () => {
        testShiftCommand([
            'My First Line',
            '\t\tMy Second Line',
            '    Third Line',
            '',
            '123'
        ], null, true, new Selection(1, 3, 1, 1), [
            '\tMy First Line',
            '\t\tMy Second Line',
            '    Third Line',
            '',
            '123'
        ], new Selection(1, 4, 1, 1));
    });
    test('shift on single line selection 2', () => {
        testShiftCommand([
            'My First Line',
            '\t\tMy Second Line',
            '    Third Line',
            '',
            '123'
        ], null, true, new Selection(1, 1, 1, 3), [
            '\tMy First Line',
            '\t\tMy Second Line',
            '    Third Line',
            '',
            '123'
        ], new Selection(1, 1, 1, 4));
    });
    test('simple shift', () => {
        testShiftCommand([
            'My First Line',
            '\t\tMy Second Line',
            '    Third Line',
            '',
            '123'
        ], null, true, new Selection(1, 1, 2, 1), [
            '\tMy First Line',
            '\t\tMy Second Line',
            '    Third Line',
            '',
            '123'
        ], new Selection(1, 1, 2, 1));
    });
    test('shifting on two separate lines', () => {
        testShiftCommand([
            'My First Line',
            '\t\tMy Second Line',
            '    Third Line',
            '',
            '123'
        ], null, true, new Selection(1, 1, 2, 1), [
            '\tMy First Line',
            '\t\tMy Second Line',
            '    Third Line',
            '',
            '123'
        ], new Selection(1, 1, 2, 1));
        testShiftCommand([
            '\tMy First Line',
            '\t\tMy Second Line',
            '    Third Line',
            '',
            '123'
        ], null, true, new Selection(2, 1, 3, 1), [
            '\tMy First Line',
            '\t\t\tMy Second Line',
            '    Third Line',
            '',
            '123'
        ], new Selection(2, 1, 3, 1));
    });
    test('shifting on two lines', () => {
        testShiftCommand([
            'My First Line',
            '\t\tMy Second Line',
            '    Third Line',
            '',
            '123'
        ], null, true, new Selection(1, 2, 2, 2), [
            '\tMy First Line',
            '\t\t\tMy Second Line',
            '    Third Line',
            '',
            '123'
        ], new Selection(1, 3, 2, 2));
    });
    test('shifting on two lines again', () => {
        testShiftCommand([
            'My First Line',
            '\t\tMy Second Line',
            '    Third Line',
            '',
            '123'
        ], null, true, new Selection(2, 2, 1, 2), [
            '\tMy First Line',
            '\t\t\tMy Second Line',
            '    Third Line',
            '',
            '123'
        ], new Selection(2, 2, 1, 3));
    });
    test('shifting at end of file', () => {
        testShiftCommand([
            'My First Line',
            '\t\tMy Second Line',
            '    Third Line',
            '',
            '123'
        ], null, true, new Selection(4, 1, 5, 2), [
            'My First Line',
            '\t\tMy Second Line',
            '    Third Line',
            '',
            '\t123'
        ], new Selection(4, 1, 5, 3));
    });
    test('issue #1120 TAB should not indent empty lines in a multi-line selection', () => {
        testShiftCommand([
            'My First Line',
            '\t\tMy Second Line',
            '    Third Line',
            '',
            '123'
        ], null, true, new Selection(1, 1, 5, 2), [
            '\tMy First Line',
            '\t\t\tMy Second Line',
            '\t\tThird Line',
            '',
            '\t123'
        ], new Selection(1, 1, 5, 3));
        testShiftCommand([
            'My First Line',
            '\t\tMy Second Line',
            '    Third Line',
            '',
            '123'
        ], null, true, new Selection(4, 1, 5, 1), [
            'My First Line',
            '\t\tMy Second Line',
            '    Third Line',
            '\t',
            '123'
        ], new Selection(4, 1, 5, 1));
    });
    // --------- unshift
    test('unshift on single line selection 1', () => {
        testShiftCommand([
            'My First Line',
            '\t\tMy Second Line',
            '    Third Line',
            '',
            '123'
        ], null, true, new Selection(2, 3, 2, 1), [
            'My First Line',
            '\t\t\tMy Second Line',
            '    Third Line',
            '',
            '123'
        ], new Selection(2, 3, 2, 1));
    });
    test('unshift on single line selection 2', () => {
        testShiftCommand([
            'My First Line',
            '\t\tMy Second Line',
            '    Third Line',
            '',
            '123'
        ], null, true, new Selection(2, 1, 2, 3), [
            'My First Line',
            '\t\t\tMy Second Line',
            '    Third Line',
            '',
            '123'
        ], new Selection(2, 1, 2, 3));
    });
    test('simple unshift', () => {
        testUnshiftCommand([
            'My First Line',
            '\t\tMy Second Line',
            '    Third Line',
            '',
            '123'
        ], null, true, new Selection(1, 1, 2, 1), [
            'My First Line',
            '\t\tMy Second Line',
            '    Third Line',
            '',
            '123'
        ], new Selection(1, 1, 2, 1));
    });
    test('unshifting on two lines 1', () => {
        testUnshiftCommand([
            'My First Line',
            '\t\tMy Second Line',
            '    Third Line',
            '',
            '123'
        ], null, true, new Selection(1, 2, 2, 2), [
            'My First Line',
            '\tMy Second Line',
            '    Third Line',
            '',
            '123'
        ], new Selection(1, 2, 2, 2));
    });
    test('unshifting on two lines 2', () => {
        testUnshiftCommand([
            'My First Line',
            '\t\tMy Second Line',
            '    Third Line',
            '',
            '123'
        ], null, true, new Selection(2, 3, 2, 1), [
            'My First Line',
            '\tMy Second Line',
            '    Third Line',
            '',
            '123'
        ], new Selection(2, 2, 2, 1));
    });
    test('unshifting at the end of the file', () => {
        testUnshiftCommand([
            'My First Line',
            '\t\tMy Second Line',
            '    Third Line',
            '',
            '123'
        ], null, true, new Selection(4, 1, 5, 2), [
            'My First Line',
            '\t\tMy Second Line',
            '    Third Line',
            '',
            '123'
        ], new Selection(4, 1, 5, 2));
    });
    test('unshift many times + shift', () => {
        testUnshiftCommand([
            'My First Line',
            '\t\tMy Second Line',
            '    Third Line',
            '',
            '123'
        ], null, true, new Selection(1, 1, 5, 4), [
            'My First Line',
            '\tMy Second Line',
            'Third Line',
            '',
            '123'
        ], new Selection(1, 1, 5, 4));
        testUnshiftCommand([
            'My First Line',
            '\tMy Second Line',
            'Third Line',
            '',
            '123'
        ], null, true, new Selection(1, 1, 5, 4), [
            'My First Line',
            'My Second Line',
            'Third Line',
            '',
            '123'
        ], new Selection(1, 1, 5, 4));
        testShiftCommand([
            'My First Line',
            'My Second Line',
            'Third Line',
            '',
            '123'
        ], null, true, new Selection(1, 1, 5, 4), [
            '\tMy First Line',
            '\tMy Second Line',
            '\tThird Line',
            '',
            '\t123'
        ], new Selection(1, 1, 5, 5));
    });
    test('Bug 9119: Unshift from first column doesn\'t work', () => {
        testUnshiftCommand([
            'My First Line',
            '\t\tMy Second Line',
            '    Third Line',
            '',
            '123'
        ], null, true, new Selection(2, 1, 2, 1), [
            'My First Line',
            '\tMy Second Line',
            '    Third Line',
            '',
            '123'
        ], new Selection(2, 1, 2, 1));
    });
    test('issue #348: indenting around doc block comments', () => {
        testShiftCommand([
            '',
            '/**',
            ' * a doc comment',
            ' */',
            'function hello() {}'
        ], DocBlockCommentMode.languageId, true, new Selection(1, 1, 5, 20), [
            '',
            '\t/**',
            '\t * a doc comment',
            '\t */',
            '\tfunction hello() {}'
        ], new Selection(1, 1, 5, 21), prepareDocBlockCommentLanguage);
        testUnshiftCommand([
            '',
            '/**',
            ' * a doc comment',
            ' */',
            'function hello() {}'
        ], DocBlockCommentMode.languageId, true, new Selection(1, 1, 5, 20), [
            '',
            '/**',
            ' * a doc comment',
            ' */',
            'function hello() {}'
        ], new Selection(1, 1, 5, 20), prepareDocBlockCommentLanguage);
        testUnshiftCommand([
            '\t',
            '\t/**',
            '\t * a doc comment',
            '\t */',
            '\tfunction hello() {}'
        ], DocBlockCommentMode.languageId, true, new Selection(1, 1, 5, 21), [
            '',
            '/**',
            ' * a doc comment',
            ' */',
            'function hello() {}'
        ], new Selection(1, 1, 5, 20), prepareDocBlockCommentLanguage);
    });
    test('issue #1609: Wrong indentation of block comments', () => {
        testShiftCommand([
            '',
            '/**',
            ' * test',
            ' *',
            ' * @type {number}',
            ' */',
            'var foo = 0;'
        ], DocBlockCommentMode.languageId, true, new Selection(1, 1, 7, 13), [
            '',
            '\t/**',
            '\t * test',
            '\t *',
            '\t * @type {number}',
            '\t */',
            '\tvar foo = 0;'
        ], new Selection(1, 1, 7, 14), prepareDocBlockCommentLanguage);
    });
    test('issue #1620: a) Line indent doesn\'t handle leading whitespace properly', () => {
        testCommand([
            '   Written | Numeric',
            '       one | 1',
            '       two | 2',
            '     three | 3',
            '      four | 4',
            '      five | 5',
            '       six | 6',
            '     seven | 7',
            '     eight | 8',
            '      nine | 9',
            '       ten | 10',
            '    eleven | 11',
            '',
        ], null, new Selection(1, 1, 13, 1), (accessor, sel) => new ShiftCommand(sel, {
            isUnshift: false,
            tabSize: 4,
            indentSize: 4,
            insertSpaces: true,
            useTabStops: false,
            autoIndent: 4 /* EditorAutoIndentStrategy.Full */,
        }, accessor.get(ILanguageConfigurationService)), [
            '       Written | Numeric',
            '           one | 1',
            '           two | 2',
            '         three | 3',
            '          four | 4',
            '          five | 5',
            '           six | 6',
            '         seven | 7',
            '         eight | 8',
            '          nine | 9',
            '           ten | 10',
            '        eleven | 11',
            '',
        ], new Selection(1, 1, 13, 1));
    });
    test('issue #1620: b) Line indent doesn\'t handle leading whitespace properly', () => {
        testCommand([
            '       Written | Numeric',
            '           one | 1',
            '           two | 2',
            '         three | 3',
            '          four | 4',
            '          five | 5',
            '           six | 6',
            '         seven | 7',
            '         eight | 8',
            '          nine | 9',
            '           ten | 10',
            '        eleven | 11',
            '',
        ], null, new Selection(1, 1, 13, 1), (accessor, sel) => new ShiftCommand(sel, {
            isUnshift: true,
            tabSize: 4,
            indentSize: 4,
            insertSpaces: true,
            useTabStops: false,
            autoIndent: 4 /* EditorAutoIndentStrategy.Full */,
        }, accessor.get(ILanguageConfigurationService)), [
            '   Written | Numeric',
            '       one | 1',
            '       two | 2',
            '     three | 3',
            '      four | 4',
            '      five | 5',
            '       six | 6',
            '     seven | 7',
            '     eight | 8',
            '      nine | 9',
            '       ten | 10',
            '    eleven | 11',
            '',
        ], new Selection(1, 1, 13, 1));
    });
    test('issue #1620: c) Line indent doesn\'t handle leading whitespace properly', () => {
        testCommand([
            '       Written | Numeric',
            '           one | 1',
            '           two | 2',
            '         three | 3',
            '          four | 4',
            '          five | 5',
            '           six | 6',
            '         seven | 7',
            '         eight | 8',
            '          nine | 9',
            '           ten | 10',
            '        eleven | 11',
            '',
        ], null, new Selection(1, 1, 13, 1), (accessor, sel) => new ShiftCommand(sel, {
            isUnshift: true,
            tabSize: 4,
            indentSize: 4,
            insertSpaces: false,
            useTabStops: false,
            autoIndent: 4 /* EditorAutoIndentStrategy.Full */,
        }, accessor.get(ILanguageConfigurationService)), [
            '   Written | Numeric',
            '       one | 1',
            '       two | 2',
            '     three | 3',
            '      four | 4',
            '      five | 5',
            '       six | 6',
            '     seven | 7',
            '     eight | 8',
            '      nine | 9',
            '       ten | 10',
            '    eleven | 11',
            '',
        ], new Selection(1, 1, 13, 1));
    });
    test('issue #1620: d) Line indent doesn\'t handle leading whitespace properly', () => {
        testCommand([
            '\t   Written | Numeric',
            '\t       one | 1',
            '\t       two | 2',
            '\t     three | 3',
            '\t      four | 4',
            '\t      five | 5',
            '\t       six | 6',
            '\t     seven | 7',
            '\t     eight | 8',
            '\t      nine | 9',
            '\t       ten | 10',
            '\t    eleven | 11',
            '',
        ], null, new Selection(1, 1, 13, 1), (accessor, sel) => new ShiftCommand(sel, {
            isUnshift: true,
            tabSize: 4,
            indentSize: 4,
            insertSpaces: true,
            useTabStops: false,
            autoIndent: 4 /* EditorAutoIndentStrategy.Full */,
        }, accessor.get(ILanguageConfigurationService)), [
            '   Written | Numeric',
            '       one | 1',
            '       two | 2',
            '     three | 3',
            '      four | 4',
            '      five | 5',
            '       six | 6',
            '     seven | 7',
            '     eight | 8',
            '      nine | 9',
            '       ten | 10',
            '    eleven | 11',
            '',
        ], new Selection(1, 1, 13, 1));
    });
    test('issue microsoft/monaco-editor#443: Indentation of a single row deletes selected text in some cases', () => {
        testCommand([
            'Hello world!',
            'another line'
        ], null, new Selection(1, 1, 1, 13), (accessor, sel) => new ShiftCommand(sel, {
            isUnshift: false,
            tabSize: 4,
            indentSize: 4,
            insertSpaces: false,
            useTabStops: true,
            autoIndent: 4 /* EditorAutoIndentStrategy.Full */,
        }, accessor.get(ILanguageConfigurationService)), [
            '\tHello world!',
            'another line'
        ], new Selection(1, 1, 1, 14));
    });
    test('bug #16815:Shift+Tab doesn\'t go back to tabstop', () => {
        const repeatStr = (str, cnt) => {
            let r = '';
            for (let i = 0; i < cnt; i++) {
                r += str;
            }
            return r;
        };
        const testOutdent = (tabSize, indentSize, insertSpaces, lineText, expectedIndents) => {
            const oneIndent = insertSpaces ? repeatStr(' ', indentSize) : '\t';
            const expectedIndent = repeatStr(oneIndent, expectedIndents);
            if (lineText.length > 0) {
                _assertUnshiftCommand(tabSize, indentSize, insertSpaces, [lineText + 'aaa'], [createSingleEditOp(expectedIndent, 1, 1, 1, lineText.length + 1)]);
            }
            else {
                _assertUnshiftCommand(tabSize, indentSize, insertSpaces, [lineText + 'aaa'], []);
            }
        };
        const testIndent = (tabSize, indentSize, insertSpaces, lineText, expectedIndents) => {
            const oneIndent = insertSpaces ? repeatStr(' ', indentSize) : '\t';
            const expectedIndent = repeatStr(oneIndent, expectedIndents);
            _assertShiftCommand(tabSize, indentSize, insertSpaces, [lineText + 'aaa'], [createSingleEditOp(expectedIndent, 1, 1, 1, lineText.length + 1)]);
        };
        const testIndentation = (tabSize, indentSize, lineText, expectedOnOutdent, expectedOnIndent) => {
            testOutdent(tabSize, indentSize, true, lineText, expectedOnOutdent);
            testOutdent(tabSize, indentSize, false, lineText, expectedOnOutdent);
            testIndent(tabSize, indentSize, true, lineText, expectedOnIndent);
            testIndent(tabSize, indentSize, false, lineText, expectedOnIndent);
        };
        // insertSpaces: true
        // 0 => 0
        testIndentation(4, 4, '', 0, 1);
        // 1 => 0
        testIndentation(4, 4, '\t', 0, 2);
        testIndentation(4, 4, ' ', 0, 1);
        testIndentation(4, 4, ' \t', 0, 2);
        testIndentation(4, 4, '  ', 0, 1);
        testIndentation(4, 4, '  \t', 0, 2);
        testIndentation(4, 4, '   ', 0, 1);
        testIndentation(4, 4, '   \t', 0, 2);
        testIndentation(4, 4, '    ', 0, 2);
        // 2 => 1
        testIndentation(4, 4, '\t\t', 1, 3);
        testIndentation(4, 4, '\t ', 1, 2);
        testIndentation(4, 4, '\t \t', 1, 3);
        testIndentation(4, 4, '\t  ', 1, 2);
        testIndentation(4, 4, '\t  \t', 1, 3);
        testIndentation(4, 4, '\t   ', 1, 2);
        testIndentation(4, 4, '\t   \t', 1, 3);
        testIndentation(4, 4, '\t    ', 1, 3);
        testIndentation(4, 4, ' \t\t', 1, 3);
        testIndentation(4, 4, ' \t ', 1, 2);
        testIndentation(4, 4, ' \t \t', 1, 3);
        testIndentation(4, 4, ' \t  ', 1, 2);
        testIndentation(4, 4, ' \t  \t', 1, 3);
        testIndentation(4, 4, ' \t   ', 1, 2);
        testIndentation(4, 4, ' \t   \t', 1, 3);
        testIndentation(4, 4, ' \t    ', 1, 3);
        testIndentation(4, 4, '  \t\t', 1, 3);
        testIndentation(4, 4, '  \t ', 1, 2);
        testIndentation(4, 4, '  \t \t', 1, 3);
        testIndentation(4, 4, '  \t  ', 1, 2);
        testIndentation(4, 4, '  \t  \t', 1, 3);
        testIndentation(4, 4, '  \t   ', 1, 2);
        testIndentation(4, 4, '  \t   \t', 1, 3);
        testIndentation(4, 4, '  \t    ', 1, 3);
        testIndentation(4, 4, '   \t\t', 1, 3);
        testIndentation(4, 4, '   \t ', 1, 2);
        testIndentation(4, 4, '   \t \t', 1, 3);
        testIndentation(4, 4, '   \t  ', 1, 2);
        testIndentation(4, 4, '   \t  \t', 1, 3);
        testIndentation(4, 4, '   \t   ', 1, 2);
        testIndentation(4, 4, '   \t   \t', 1, 3);
        testIndentation(4, 4, '   \t    ', 1, 3);
        testIndentation(4, 4, '    \t', 1, 3);
        testIndentation(4, 4, '     ', 1, 2);
        testIndentation(4, 4, '     \t', 1, 3);
        testIndentation(4, 4, '      ', 1, 2);
        testIndentation(4, 4, '      \t', 1, 3);
        testIndentation(4, 4, '       ', 1, 2);
        testIndentation(4, 4, '       \t', 1, 3);
        testIndentation(4, 4, '        ', 1, 3);
        // 3 => 2
        testIndentation(4, 4, '         ', 2, 3);
        function _assertUnshiftCommand(tabSize, indentSize, insertSpaces, text, expected) {
            return withEditorModel(text, (model) => {
                const testLanguageConfigurationService = new TestLanguageConfigurationService();
                const op = new ShiftCommand(new Selection(1, 1, text.length + 1, 1), {
                    isUnshift: true,
                    tabSize: tabSize,
                    indentSize: indentSize,
                    insertSpaces: insertSpaces,
                    useTabStops: true,
                    autoIndent: 4 /* EditorAutoIndentStrategy.Full */,
                }, testLanguageConfigurationService);
                const actual = getEditOperation(model, op);
                assert.deepStrictEqual(actual, expected);
                testLanguageConfigurationService.dispose();
            });
        }
        function _assertShiftCommand(tabSize, indentSize, insertSpaces, text, expected) {
            return withEditorModel(text, (model) => {
                const testLanguageConfigurationService = new TestLanguageConfigurationService();
                const op = new ShiftCommand(new Selection(1, 1, text.length + 1, 1), {
                    isUnshift: false,
                    tabSize: tabSize,
                    indentSize: indentSize,
                    insertSpaces: insertSpaces,
                    useTabStops: true,
                    autoIndent: 4 /* EditorAutoIndentStrategy.Full */,
                }, testLanguageConfigurationService);
                const actual = getEditOperation(model, op);
                assert.deepStrictEqual(actual, expected);
                testLanguageConfigurationService.dispose();
            });
        }
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2hpZnRDb21tYW5kLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3Rlc3QvYnJvd3Nlci9jb21tYW5kcy9zaGlmdENvbW1hbmQudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxVQUFVLEVBQW1CLE1BQU0sc0NBQXNDLENBQUM7QUFDbkYsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDaEcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBR3hFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUN0RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDOUQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDekUsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDM0csT0FBTyxFQUFFLGdCQUFnQixFQUFFLFdBQVcsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBQ2xFLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ3JGLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBQzFHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUdoRTs7R0FFRztBQUNILFNBQVMsa0JBQWtCLENBQUMsSUFBWSxFQUFFLGtCQUEwQixFQUFFLGNBQXNCLEVBQUUsc0JBQThCLGtCQUFrQixFQUFFLGtCQUEwQixjQUFjO0lBQ3ZMLE9BQU87UUFDTixLQUFLLEVBQUUsSUFBSSxLQUFLLENB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QUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ25DLGVBQWUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDbEMsZUFBZSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNwQyxlQUFlLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ25DLGVBQWUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLE9BQU8sRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDckMsZUFBZSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUVwQyxTQUFTO1FBQ1QsZUFBZSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNwQyxlQUFlLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ25DLGVBQWUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLE9BQU8sRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDckMsZUFBZSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNwQyxlQUFlLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxRQUFRLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3RDLGVBQWUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLE9BQU8sRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDckMsZUFBZSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN2QyxlQUFlLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxRQUFRLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3RDLGVBQWUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLE9BQU8sRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDckMsZUFBZSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNwQyxlQUFlLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxRQUFRLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3RDLGVBQWUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLE9BQU8sRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDckMsZUFBZSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN2QyxlQUFlLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxRQUFRLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3RDLGVBQWUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLFVBQVUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDeEMsZUFBZSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN2QyxlQUFlLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxRQUFRLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3RDLGVBQWUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLE9BQU8sRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDckMsZUFBZSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN2QyxlQUFlLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxRQUFRLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3RDLGVBQWUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLFVBQVUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDeEMsZUFBZSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN2QyxlQUFlLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxXQUFXLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3pDLGVBQWUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLFVBQVUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDeEMsZUFBZSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN2QyxlQUFlLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxRQUFRLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3RDLGVBQWUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLFVBQVUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDeEMsZUFBZSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN2QyxlQUFlLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxXQUFXLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3pDLGVBQWUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLFVBQVUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDeEMsZUFBZSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsWUFBWSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMxQyxlQUFlLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxXQUFXLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3pD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