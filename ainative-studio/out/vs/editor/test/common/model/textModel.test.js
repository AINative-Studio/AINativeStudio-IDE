/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { UTF8_BOM_CHARACTER } from '../../../../base/common/strings.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { Position } from '../../../common/core/position.js';
import { Range } from '../../../common/core/range.js';
import { PLAINTEXT_LANGUAGE_ID } from '../../../common/languages/modesRegistry.js';
import { TextModel, createTextBuffer } from '../../../common/model/textModel.js';
import { createModelServices, createTextModel } from '../testTextModel.js';
function testGuessIndentation(defaultInsertSpaces, defaultTabSize, expectedInsertSpaces, expectedTabSize, text, msg) {
    const m = createTextModel(text.join('\n'), undefined, {
        tabSize: defaultTabSize,
        insertSpaces: defaultInsertSpaces,
        detectIndentation: true
    });
    const r = m.getOptions();
    m.dispose();
    assert.strictEqual(r.insertSpaces, expectedInsertSpaces, msg);
    assert.strictEqual(r.tabSize, expectedTabSize, msg);
}
function assertGuess(expectedInsertSpaces, expectedTabSize, text, msg) {
    if (typeof expectedInsertSpaces === 'undefined') {
        // cannot guess insertSpaces
        if (typeof expectedTabSize === 'undefined') {
            // cannot guess tabSize
            testGuessIndentation(true, 13370, true, 13370, text, msg);
            testGuessIndentation(false, 13371, false, 13371, text, msg);
        }
        else if (typeof expectedTabSize === 'number') {
            // can guess tabSize
            testGuessIndentation(true, 13370, true, expectedTabSize, text, msg);
            testGuessIndentation(false, 13371, false, expectedTabSize, text, msg);
        }
        else {
            // can only guess tabSize when insertSpaces is true
            testGuessIndentation(true, 13370, true, expectedTabSize[0], text, msg);
            testGuessIndentation(false, 13371, false, 13371, text, msg);
        }
    }
    else {
        // can guess insertSpaces
        if (typeof expectedTabSize === 'undefined') {
            // cannot guess tabSize
            testGuessIndentation(true, 13370, expectedInsertSpaces, 13370, text, msg);
            testGuessIndentation(false, 13371, expectedInsertSpaces, 13371, text, msg);
        }
        else if (typeof expectedTabSize === 'number') {
            // can guess tabSize
            testGuessIndentation(true, 13370, expectedInsertSpaces, expectedTabSize, text, msg);
            testGuessIndentation(false, 13371, expectedInsertSpaces, expectedTabSize, text, msg);
        }
        else {
            // can only guess tabSize when insertSpaces is true
            if (expectedInsertSpaces === true) {
                testGuessIndentation(true, 13370, expectedInsertSpaces, expectedTabSize[0], text, msg);
                testGuessIndentation(false, 13371, expectedInsertSpaces, expectedTabSize[0], text, msg);
            }
            else {
                testGuessIndentation(true, 13370, expectedInsertSpaces, 13370, text, msg);
                testGuessIndentation(false, 13371, expectedInsertSpaces, 13371, text, msg);
            }
        }
    }
}
suite('TextModelData.fromString', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    function testTextModelDataFromString(text, expected) {
        const { textBuffer, disposable } = createTextBuffer(text, TextModel.DEFAULT_CREATION_OPTIONS.defaultEOL);
        const actual = {
            EOL: textBuffer.getEOL(),
            lines: textBuffer.getLinesContent(),
            containsRTL: textBuffer.mightContainRTL(),
            isBasicASCII: !textBuffer.mightContainNonBasicASCII()
        };
        assert.deepStrictEqual(actual, expected);
        disposable.dispose();
    }
    test('one line text', () => {
        testTextModelDataFromString('Hello world!', {
            EOL: '\n',
            lines: [
                'Hello world!'
            ],
            containsRTL: false,
            isBasicASCII: true
        });
    });
    test('multiline text', () => {
        testTextModelDataFromString('Hello,\r\ndear friend\nHow\rare\r\nyou?', {
            EOL: '\r\n',
            lines: [
                'Hello,',
                'dear friend',
                'How',
                'are',
                'you?'
            ],
            containsRTL: false,
            isBasicASCII: true
        });
    });
    test('Non Basic ASCII 1', () => {
        testTextModelDataFromString('Hello,\nZürich', {
            EOL: '\n',
            lines: [
                'Hello,',
                'Zürich'
            ],
            containsRTL: false,
            isBasicASCII: false
        });
    });
    test('containsRTL 1', () => {
        testTextModelDataFromString('Hello,\nזוהי עובדה מבוססת שדעתו', {
            EOL: '\n',
            lines: [
                'Hello,',
                'זוהי עובדה מבוססת שדעתו'
            ],
            containsRTL: true,
            isBasicASCII: false
        });
    });
    test('containsRTL 2', () => {
        testTextModelDataFromString('Hello,\nهناك حقيقة مثبتة منذ زمن طويل', {
            EOL: '\n',
            lines: [
                'Hello,',
                'هناك حقيقة مثبتة منذ زمن طويل'
            ],
            containsRTL: true,
            isBasicASCII: false
        });
    });
});
suite('Editor Model - TextModel', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('TextModel does not use events internally', () => {
        // Make sure that all model parts receive text model events explicitly
        // to avoid that by any chance an outside listener receives events before
        // the parts and thus are able to access the text model in an inconsistent state.
        //
        // We simply check that there are no listeners attached to text model
        // after instantiation
        const disposables = new DisposableStore();
        const instantiationService = createModelServices(disposables);
        const textModel = disposables.add(instantiationService.createInstance(TextModel, '', PLAINTEXT_LANGUAGE_ID, TextModel.DEFAULT_CREATION_OPTIONS, null));
        assert.strictEqual(textModel._hasListeners(), false);
        disposables.dispose();
    });
    test('getValueLengthInRange', () => {
        let m = createTextModel('My First Line\r\nMy Second Line\r\nMy Third Line');
        assert.strictEqual(m.getValueLengthInRange(new Range(1, 1, 1, 1)), ''.length);
        assert.strictEqual(m.getValueLengthInRange(new Range(1, 1, 1, 2)), 'M'.length);
        assert.strictEqual(m.getValueLengthInRange(new Range(1, 2, 1, 3)), 'y'.length);
        assert.strictEqual(m.getValueLengthInRange(new Range(1, 1, 1, 14)), 'My First Line'.length);
        assert.strictEqual(m.getValueLengthInRange(new Range(1, 1, 2, 1)), 'My First Line\r\n'.length);
        assert.strictEqual(m.getValueLengthInRange(new Range(1, 2, 2, 1)), 'y First Line\r\n'.length);
        assert.strictEqual(m.getValueLengthInRange(new Range(1, 2, 2, 2)), 'y First Line\r\nM'.length);
        assert.strictEqual(m.getValueLengthInRange(new Range(1, 2, 2, 1000)), 'y First Line\r\nMy Second Line'.length);
        assert.strictEqual(m.getValueLengthInRange(new Range(1, 2, 3, 1)), 'y First Line\r\nMy Second Line\r\n'.length);
        assert.strictEqual(m.getValueLengthInRange(new Range(1, 2, 3, 1000)), 'y First Line\r\nMy Second Line\r\nMy Third Line'.length);
        assert.strictEqual(m.getValueLengthInRange(new Range(1, 1, 1000, 1000)), 'My First Line\r\nMy Second Line\r\nMy Third Line'.length);
        m.dispose();
        m = createTextModel('My First Line\nMy Second Line\nMy Third Line');
        assert.strictEqual(m.getValueLengthInRange(new Range(1, 1, 1, 1)), ''.length);
        assert.strictEqual(m.getValueLengthInRange(new Range(1, 1, 1, 2)), 'M'.length);
        assert.strictEqual(m.getValueLengthInRange(new Range(1, 2, 1, 3)), 'y'.length);
        assert.strictEqual(m.getValueLengthInRange(new Range(1, 1, 1, 14)), 'My First Line'.length);
        assert.strictEqual(m.getValueLengthInRange(new Range(1, 1, 2, 1)), 'My First Line\n'.length);
        assert.strictEqual(m.getValueLengthInRange(new Range(1, 2, 2, 1)), 'y First Line\n'.length);
        assert.strictEqual(m.getValueLengthInRange(new Range(1, 2, 2, 2)), 'y First Line\nM'.length);
        assert.strictEqual(m.getValueLengthInRange(new Range(1, 2, 2, 1000)), 'y First Line\nMy Second Line'.length);
        assert.strictEqual(m.getValueLengthInRange(new Range(1, 2, 3, 1)), 'y First Line\nMy Second Line\n'.length);
        assert.strictEqual(m.getValueLengthInRange(new Range(1, 2, 3, 1000)), 'y First Line\nMy Second Line\nMy Third Line'.length);
        assert.strictEqual(m.getValueLengthInRange(new Range(1, 1, 1000, 1000)), 'My First Line\nMy Second Line\nMy Third Line'.length);
        m.dispose();
    });
    test('getValueLengthInRange different EOL', () => {
        let m = createTextModel('My First Line\r\nMy Second Line\r\nMy Third Line');
        assert.strictEqual(m.getValueLengthInRange(new Range(1, 1, 2, 1), 0 /* EndOfLinePreference.TextDefined */), 'My First Line\r\n'.length);
        assert.strictEqual(m.getValueLengthInRange(new Range(1, 1, 2, 1), 2 /* EndOfLinePreference.CRLF */), 'My First Line\r\n'.length);
        assert.strictEqual(m.getValueLengthInRange(new Range(1, 1, 2, 1), 1 /* EndOfLinePreference.LF */), 'My First Line\n'.length);
        assert.strictEqual(m.getValueLengthInRange(new Range(1, 1, 1000, 1000), 0 /* EndOfLinePreference.TextDefined */), 'My First Line\r\nMy Second Line\r\nMy Third Line'.length);
        assert.strictEqual(m.getValueLengthInRange(new Range(1, 1, 1000, 1000), 2 /* EndOfLinePreference.CRLF */), 'My First Line\r\nMy Second Line\r\nMy Third Line'.length);
        assert.strictEqual(m.getValueLengthInRange(new Range(1, 1, 1000, 1000), 1 /* EndOfLinePreference.LF */), 'My First Line\nMy Second Line\nMy Third Line'.length);
        m.dispose();
        m = createTextModel('My First Line\nMy Second Line\nMy Third Line');
        assert.strictEqual(m.getValueLengthInRange(new Range(1, 1, 2, 1), 0 /* EndOfLinePreference.TextDefined */), 'My First Line\n'.length);
        assert.strictEqual(m.getValueLengthInRange(new Range(1, 1, 2, 1), 1 /* EndOfLinePreference.LF */), 'My First Line\n'.length);
        assert.strictEqual(m.getValueLengthInRange(new Range(1, 1, 2, 1), 2 /* EndOfLinePreference.CRLF */), 'My First Line\r\n'.length);
        assert.strictEqual(m.getValueLengthInRange(new Range(1, 1, 1000, 1000), 0 /* EndOfLinePreference.TextDefined */), 'My First Line\nMy Second Line\nMy Third Line'.length);
        assert.strictEqual(m.getValueLengthInRange(new Range(1, 1, 1000, 1000), 1 /* EndOfLinePreference.LF */), 'My First Line\nMy Second Line\nMy Third Line'.length);
        assert.strictEqual(m.getValueLengthInRange(new Range(1, 1, 1000, 1000), 2 /* EndOfLinePreference.CRLF */), 'My First Line\r\nMy Second Line\r\nMy Third Line'.length);
        m.dispose();
    });
    test('guess indentation 1', () => {
        assertGuess(undefined, undefined, [
            'x',
            'x',
            'x',
            'x',
            'x',
            'x',
            'x'
        ], 'no clues');
        assertGuess(false, undefined, [
            '\tx',
            'x',
            'x',
            'x',
            'x',
            'x',
            'x'
        ], 'no spaces, 1xTAB');
        assertGuess(true, 2, [
            '  x',
            'x',
            'x',
            'x',
            'x',
            'x',
            'x'
        ], '1x2');
        assertGuess(false, undefined, [
            '\tx',
            '\tx',
            '\tx',
            '\tx',
            '\tx',
            '\tx',
            '\tx'
        ], '7xTAB');
        assertGuess(undefined, [2], [
            '\tx',
            '  x',
            '\tx',
            '  x',
            '\tx',
            '  x',
            '\tx',
            '  x',
        ], '4x2, 4xTAB');
        assertGuess(false, undefined, [
            '\tx',
            ' x',
            '\tx',
            ' x',
            '\tx',
            ' x',
            '\tx',
            ' x'
        ], '4x1, 4xTAB');
        assertGuess(false, undefined, [
            '\tx',
            '\tx',
            '  x',
            '\tx',
            '  x',
            '\tx',
            '  x',
            '\tx',
            '  x',
        ], '4x2, 5xTAB');
        assertGuess(false, undefined, [
            '\tx',
            '\tx',
            'x',
            '\tx',
            'x',
            '\tx',
            'x',
            '\tx',
            '  x',
        ], '1x2, 5xTAB');
        assertGuess(false, undefined, [
            '\tx',
            '\tx',
            'x',
            '\tx',
            'x',
            '\tx',
            'x',
            '\tx',
            '    x',
        ], '1x4, 5xTAB');
        assertGuess(false, undefined, [
            '\tx',
            '\tx',
            'x',
            '\tx',
            'x',
            '\tx',
            '  x',
            '\tx',
            '    x',
        ], '1x2, 1x4, 5xTAB');
        assertGuess(undefined, undefined, [
            'x',
            ' x',
            ' x',
            ' x',
            ' x',
            ' x',
            ' x',
            ' x'
        ], '7x1 - 1 space is never guessed as an indentation');
        assertGuess(true, undefined, [
            'x',
            '          x',
            ' x',
            ' x',
            ' x',
            ' x',
            ' x',
            ' x'
        ], '1x10, 6x1');
        assertGuess(undefined, undefined, [
            '',
            '  ',
            '    ',
            '      ',
            '        ',
            '          ',
            '            ',
            '              ',
        ], 'whitespace lines don\'t count');
        assertGuess(true, 3, [
            'x',
            '   x',
            '   x',
            '    x',
            'x',
            '   x',
            '   x',
            '    x',
            'x',
            '   x',
            '   x',
            '    x',
        ], '6x3, 3x4');
        assertGuess(true, 5, [
            'x',
            '     x',
            '     x',
            '    x',
            'x',
            '     x',
            '     x',
            '    x',
            'x',
            '     x',
            '     x',
            '    x',
        ], '6x5, 3x4');
        assertGuess(true, 7, [
            'x',
            '       x',
            '       x',
            '     x',
            'x',
            '       x',
            '       x',
            '    x',
            'x',
            '       x',
            '       x',
            '    x',
        ], '6x7, 1x5, 2x4');
        assertGuess(true, 2, [
            'x',
            '  x',
            '  x',
            '  x',
            '  x',
            'x',
            '  x',
            '  x',
            '  x',
            '  x',
        ], '8x2');
        assertGuess(true, 2, [
            'x',
            '  x',
            '  x',
            'x',
            '  x',
            '  x',
            'x',
            '  x',
            '  x',
            'x',
            '  x',
            '  x',
        ], '8x2');
        assertGuess(true, 2, [
            'x',
            '  x',
            '    x',
            'x',
            '  x',
            '    x',
            'x',
            '  x',
            '    x',
            'x',
            '  x',
            '    x',
        ], '4x2, 4x4');
        assertGuess(true, 2, [
            'x',
            '  x',
            '  x',
            '    x',
            'x',
            '  x',
            '  x',
            '    x',
            'x',
            '  x',
            '  x',
            '    x',
        ], '6x2, 3x4');
        assertGuess(true, 2, [
            'x',
            '  x',
            '  x',
            '    x',
            '    x',
            'x',
            '  x',
            '  x',
            '    x',
            '    x',
        ], '4x2, 4x4');
        assertGuess(true, 2, [
            'x',
            '  x',
            '    x',
            '    x',
            'x',
            '  x',
            '    x',
            '    x',
        ], '2x2, 4x4');
        assertGuess(true, 4, [
            'x',
            '    x',
            '    x',
            'x',
            '    x',
            '    x',
            'x',
            '    x',
            '    x',
            'x',
            '    x',
            '    x',
        ], '8x4');
        assertGuess(true, 2, [
            'x',
            '  x',
            '    x',
            '    x',
            '      x',
            'x',
            '  x',
            '    x',
            '    x',
            '      x',
        ], '2x2, 4x4, 2x6');
        assertGuess(true, 2, [
            'x',
            '  x',
            '    x',
            '    x',
            '      x',
            '      x',
            '        x',
        ], '1x2, 2x4, 2x6, 1x8');
        assertGuess(true, 4, [
            'x',
            '    x',
            '    x',
            '    x',
            '     x',
            '        x',
            'x',
            '    x',
            '    x',
            '    x',
            '     x',
            '        x',
        ], '6x4, 2x5, 2x8');
        assertGuess(true, 4, [
            'x',
            '    x',
            '    x',
            '    x',
            '     x',
            '        x',
            '        x',
        ], '3x4, 1x5, 2x8');
        assertGuess(true, 4, [
            'x',
            'x',
            '    x',
            '    x',
            '     x',
            '        x',
            '        x',
            'x',
            'x',
            '    x',
            '    x',
            '     x',
            '        x',
            '        x',
        ], '6x4, 2x5, 4x8');
        assertGuess(true, 3, [
            'x',
            ' x',
            ' x',
            ' x',
            ' x',
            ' x',
            'x',
            '   x',
            '    x',
            '    x',
        ], '5x1, 2x0, 1x3, 2x4');
        assertGuess(false, undefined, [
            '\t x',
            ' \t x',
            '\tx'
        ], 'mixed whitespace 1');
        assertGuess(false, undefined, [
            '\tx',
            '\t    x'
        ], 'mixed whitespace 2');
    });
    test('issue #44991: Wrong indentation size auto-detection', () => {
        assertGuess(true, 4, [
            'a = 10             # 0 space indent',
            'b = 5              # 0 space indent',
            'if a > 10:         # 0 space indent',
            '    a += 1         # 4 space indent      delta 4 spaces',
            '    if b > 5:      # 4 space indent',
            '        b += 1     # 8 space indent      delta 4 spaces',
            '        b += 1     # 8 space indent',
            '        b += 1     # 8 space indent',
            '# comment line 1   # 0 space indent      delta 8 spaces',
            '# comment line 2   # 0 space indent',
            '# comment line 3   # 0 space indent',
            '        b += 1     # 8 space indent      delta 8 spaces',
            '        b += 1     # 8 space indent',
            '        b += 1     # 8 space indent',
        ]);
    });
    test('issue #55818: Broken indentation detection', () => {
        assertGuess(true, 2, [
            '',
            '/* REQUIRE */',
            '',
            'const foo = require ( \'foo\' ),',
            '      bar = require ( \'bar\' );',
            '',
            '/* MY FN */',
            '',
            'function myFn () {',
            '',
            '  const asd = 1,',
            '        dsa = 2;',
            '',
            '  return bar ( foo ( asd ) );',
            '',
            '}',
            '',
            '/* EXPORT */',
            '',
            'module.exports = myFn;',
            '',
        ]);
    });
    test('issue #70832: Broken indentation detection', () => {
        assertGuess(false, undefined, [
            'x',
            'x',
            'x',
            'x',
            '	x',
            '		x',
            '    x',
            '		x',
            '	x',
            '		x',
            '	x',
            '	x',
            '	x',
            '	x',
            'x',
        ]);
    });
    test('issue #62143: Broken indentation detection', () => {
        // works before the fix
        assertGuess(true, 2, [
            'x',
            'x',
            '  x',
            '  x'
        ]);
        // works before the fix
        assertGuess(true, 2, [
            'x',
            '  - item2',
            '  - item3'
        ]);
        // works before the fix
        testGuessIndentation(true, 2, true, 2, [
            'x x',
            '  x',
            '  x',
        ]);
        // fails before the fix
        // empty space inline breaks the indentation guess
        testGuessIndentation(true, 2, true, 2, [
            'x x',
            '  x',
            '  x',
            '    x'
        ]);
        testGuessIndentation(true, 2, true, 2, [
            '<!--test1.md -->',
            '- item1',
            '  - item2',
            '    - item3'
        ]);
    });
    test('issue #84217: Broken indentation detection', () => {
        assertGuess(true, 4, [
            'def main():',
            '    print(\'hello\')',
        ]);
        assertGuess(true, 4, [
            'def main():',
            '    with open(\'foo\') as fp:',
            '        print(fp.read())',
        ]);
    });
    test('validatePosition', () => {
        const m = createTextModel('line one\nline two');
        assert.deepStrictEqual(m.validatePosition(new Position(0, 0)), new Position(1, 1));
        assert.deepStrictEqual(m.validatePosition(new Position(0, 1)), new Position(1, 1));
        assert.deepStrictEqual(m.validatePosition(new Position(1, 1)), new Position(1, 1));
        assert.deepStrictEqual(m.validatePosition(new Position(1, 2)), new Position(1, 2));
        assert.deepStrictEqual(m.validatePosition(new Position(1, 30)), new Position(1, 9));
        assert.deepStrictEqual(m.validatePosition(new Position(2, 0)), new Position(2, 1));
        assert.deepStrictEqual(m.validatePosition(new Position(2, 1)), new Position(2, 1));
        assert.deepStrictEqual(m.validatePosition(new Position(2, 2)), new Position(2, 2));
        assert.deepStrictEqual(m.validatePosition(new Position(2, 30)), new Position(2, 9));
        assert.deepStrictEqual(m.validatePosition(new Position(3, 0)), new Position(2, 9));
        assert.deepStrictEqual(m.validatePosition(new Position(3, 1)), new Position(2, 9));
        assert.deepStrictEqual(m.validatePosition(new Position(3, 30)), new Position(2, 9));
        assert.deepStrictEqual(m.validatePosition(new Position(30, 30)), new Position(2, 9));
        assert.deepStrictEqual(m.validatePosition(new Position(-123.123, -0.5)), new Position(1, 1));
        assert.deepStrictEqual(m.validatePosition(new Position(Number.MIN_VALUE, Number.MIN_VALUE)), new Position(1, 1));
        assert.deepStrictEqual(m.validatePosition(new Position(Number.MAX_VALUE, Number.MAX_VALUE)), new Position(2, 9));
        assert.deepStrictEqual(m.validatePosition(new Position(123.23, 47.5)), new Position(2, 9));
        m.dispose();
    });
    test('validatePosition around high-low surrogate pairs 1', () => {
        const m = createTextModel('a📚b');
        assert.deepStrictEqual(m.validatePosition(new Position(0, 0)), new Position(1, 1));
        assert.deepStrictEqual(m.validatePosition(new Position(0, 1)), new Position(1, 1));
        assert.deepStrictEqual(m.validatePosition(new Position(0, 7)), new Position(1, 1));
        assert.deepStrictEqual(m.validatePosition(new Position(1, 1)), new Position(1, 1));
        assert.deepStrictEqual(m.validatePosition(new Position(1, 2)), new Position(1, 2));
        assert.deepStrictEqual(m.validatePosition(new Position(1, 3)), new Position(1, 2));
        assert.deepStrictEqual(m.validatePosition(new Position(1, 4)), new Position(1, 4));
        assert.deepStrictEqual(m.validatePosition(new Position(1, 5)), new Position(1, 5));
        assert.deepStrictEqual(m.validatePosition(new Position(1, 30)), new Position(1, 5));
        assert.deepStrictEqual(m.validatePosition(new Position(2, 0)), new Position(1, 5));
        assert.deepStrictEqual(m.validatePosition(new Position(2, 1)), new Position(1, 5));
        assert.deepStrictEqual(m.validatePosition(new Position(2, 2)), new Position(1, 5));
        assert.deepStrictEqual(m.validatePosition(new Position(2, 30)), new Position(1, 5));
        assert.deepStrictEqual(m.validatePosition(new Position(-123.123, -0.5)), new Position(1, 1));
        assert.deepStrictEqual(m.validatePosition(new Position(Number.MIN_VALUE, Number.MIN_VALUE)), new Position(1, 1));
        assert.deepStrictEqual(m.validatePosition(new Position(Number.MAX_VALUE, Number.MAX_VALUE)), new Position(1, 5));
        assert.deepStrictEqual(m.validatePosition(new Position(123.23, 47.5)), new Position(1, 5));
        m.dispose();
    });
    test('validatePosition around high-low surrogate pairs 2', () => {
        const m = createTextModel('a📚📚b');
        assert.deepStrictEqual(m.validatePosition(new Position(1, 1)), new Position(1, 1));
        assert.deepStrictEqual(m.validatePosition(new Position(1, 2)), new Position(1, 2));
        assert.deepStrictEqual(m.validatePosition(new Position(1, 3)), new Position(1, 2));
        assert.deepStrictEqual(m.validatePosition(new Position(1, 4)), new Position(1, 4));
        assert.deepStrictEqual(m.validatePosition(new Position(1, 5)), new Position(1, 4));
        assert.deepStrictEqual(m.validatePosition(new Position(1, 6)), new Position(1, 6));
        assert.deepStrictEqual(m.validatePosition(new Position(1, 7)), new Position(1, 7));
        m.dispose();
    });
    test('validatePosition handle NaN.', () => {
        const m = createTextModel('line one\nline two');
        assert.deepStrictEqual(m.validatePosition(new Position(NaN, 1)), new Position(1, 1));
        assert.deepStrictEqual(m.validatePosition(new Position(1, NaN)), new Position(1, 1));
        assert.deepStrictEqual(m.validatePosition(new Position(NaN, NaN)), new Position(1, 1));
        assert.deepStrictEqual(m.validatePosition(new Position(2, NaN)), new Position(2, 1));
        assert.deepStrictEqual(m.validatePosition(new Position(NaN, 3)), new Position(1, 3));
        m.dispose();
    });
    test('issue #71480: validatePosition handle floats', () => {
        const m = createTextModel('line one\nline two');
        assert.deepStrictEqual(m.validatePosition(new Position(0.2, 1)), new Position(1, 1), 'a');
        assert.deepStrictEqual(m.validatePosition(new Position(1.2, 1)), new Position(1, 1), 'b');
        assert.deepStrictEqual(m.validatePosition(new Position(1.5, 2)), new Position(1, 2), 'c');
        assert.deepStrictEqual(m.validatePosition(new Position(1.8, 3)), new Position(1, 3), 'd');
        assert.deepStrictEqual(m.validatePosition(new Position(1, 0.3)), new Position(1, 1), 'e');
        assert.deepStrictEqual(m.validatePosition(new Position(2, 0.8)), new Position(2, 1), 'f');
        assert.deepStrictEqual(m.validatePosition(new Position(1, 1.2)), new Position(1, 1), 'g');
        assert.deepStrictEqual(m.validatePosition(new Position(2, 1.5)), new Position(2, 1), 'h');
        m.dispose();
    });
    test('issue #71480: validateRange handle floats', () => {
        const m = createTextModel('line one\nline two');
        assert.deepStrictEqual(m.validateRange(new Range(0.2, 1.5, 0.8, 2.5)), new Range(1, 1, 1, 1));
        assert.deepStrictEqual(m.validateRange(new Range(1.2, 1.7, 1.8, 2.2)), new Range(1, 1, 1, 2));
        m.dispose();
    });
    test('validateRange around high-low surrogate pairs 1', () => {
        const m = createTextModel('a📚b');
        assert.deepStrictEqual(m.validateRange(new Range(0, 0, 0, 1)), new Range(1, 1, 1, 1));
        assert.deepStrictEqual(m.validateRange(new Range(0, 0, 0, 7)), new Range(1, 1, 1, 1));
        assert.deepStrictEqual(m.validateRange(new Range(1, 1, 1, 1)), new Range(1, 1, 1, 1));
        assert.deepStrictEqual(m.validateRange(new Range(1, 1, 1, 2)), new Range(1, 1, 1, 2));
        assert.deepStrictEqual(m.validateRange(new Range(1, 1, 1, 3)), new Range(1, 1, 1, 4));
        assert.deepStrictEqual(m.validateRange(new Range(1, 1, 1, 4)), new Range(1, 1, 1, 4));
        assert.deepStrictEqual(m.validateRange(new Range(1, 1, 1, 5)), new Range(1, 1, 1, 5));
        assert.deepStrictEqual(m.validateRange(new Range(1, 2, 1, 2)), new Range(1, 2, 1, 2));
        assert.deepStrictEqual(m.validateRange(new Range(1, 2, 1, 3)), new Range(1, 2, 1, 4));
        assert.deepStrictEqual(m.validateRange(new Range(1, 2, 1, 4)), new Range(1, 2, 1, 4));
        assert.deepStrictEqual(m.validateRange(new Range(1, 2, 1, 5)), new Range(1, 2, 1, 5));
        assert.deepStrictEqual(m.validateRange(new Range(1, 3, 1, 3)), new Range(1, 2, 1, 2));
        assert.deepStrictEqual(m.validateRange(new Range(1, 3, 1, 4)), new Range(1, 2, 1, 4));
        assert.deepStrictEqual(m.validateRange(new Range(1, 3, 1, 5)), new Range(1, 2, 1, 5));
        assert.deepStrictEqual(m.validateRange(new Range(1, 4, 1, 4)), new Range(1, 4, 1, 4));
        assert.deepStrictEqual(m.validateRange(new Range(1, 4, 1, 5)), new Range(1, 4, 1, 5));
        assert.deepStrictEqual(m.validateRange(new Range(1, 5, 1, 5)), new Range(1, 5, 1, 5));
        m.dispose();
    });
    test('validateRange around high-low surrogate pairs 2', () => {
        const m = createTextModel('a📚📚b');
        assert.deepStrictEqual(m.validateRange(new Range(0, 0, 0, 1)), new Range(1, 1, 1, 1));
        assert.deepStrictEqual(m.validateRange(new Range(0, 0, 0, 7)), new Range(1, 1, 1, 1));
        assert.deepStrictEqual(m.validateRange(new Range(1, 1, 1, 1)), new Range(1, 1, 1, 1));
        assert.deepStrictEqual(m.validateRange(new Range(1, 1, 1, 2)), new Range(1, 1, 1, 2));
        assert.deepStrictEqual(m.validateRange(new Range(1, 1, 1, 3)), new Range(1, 1, 1, 4));
        assert.deepStrictEqual(m.validateRange(new Range(1, 1, 1, 4)), new Range(1, 1, 1, 4));
        assert.deepStrictEqual(m.validateRange(new Range(1, 1, 1, 5)), new Range(1, 1, 1, 6));
        assert.deepStrictEqual(m.validateRange(new Range(1, 1, 1, 6)), new Range(1, 1, 1, 6));
        assert.deepStrictEqual(m.validateRange(new Range(1, 1, 1, 7)), new Range(1, 1, 1, 7));
        assert.deepStrictEqual(m.validateRange(new Range(1, 2, 1, 2)), new Range(1, 2, 1, 2));
        assert.deepStrictEqual(m.validateRange(new Range(1, 2, 1, 3)), new Range(1, 2, 1, 4));
        assert.deepStrictEqual(m.validateRange(new Range(1, 2, 1, 4)), new Range(1, 2, 1, 4));
        assert.deepStrictEqual(m.validateRange(new Range(1, 2, 1, 5)), new Range(1, 2, 1, 6));
        assert.deepStrictEqual(m.validateRange(new Range(1, 2, 1, 6)), new Range(1, 2, 1, 6));
        assert.deepStrictEqual(m.validateRange(new Range(1, 2, 1, 7)), new Range(1, 2, 1, 7));
        assert.deepStrictEqual(m.validateRange(new Range(1, 3, 1, 3)), new Range(1, 2, 1, 2));
        assert.deepStrictEqual(m.validateRange(new Range(1, 3, 1, 4)), new Range(1, 2, 1, 4));
        assert.deepStrictEqual(m.validateRange(new Range(1, 3, 1, 5)), new Range(1, 2, 1, 6));
        assert.deepStrictEqual(m.validateRange(new Range(1, 3, 1, 6)), new Range(1, 2, 1, 6));
        assert.deepStrictEqual(m.validateRange(new Range(1, 3, 1, 7)), new Range(1, 2, 1, 7));
        assert.deepStrictEqual(m.validateRange(new Range(1, 4, 1, 4)), new Range(1, 4, 1, 4));
        assert.deepStrictEqual(m.validateRange(new Range(1, 4, 1, 5)), new Range(1, 4, 1, 6));
        assert.deepStrictEqual(m.validateRange(new Range(1, 4, 1, 6)), new Range(1, 4, 1, 6));
        assert.deepStrictEqual(m.validateRange(new Range(1, 4, 1, 7)), new Range(1, 4, 1, 7));
        assert.deepStrictEqual(m.validateRange(new Range(1, 5, 1, 5)), new Range(1, 4, 1, 4));
        assert.deepStrictEqual(m.validateRange(new Range(1, 5, 1, 6)), new Range(1, 4, 1, 6));
        assert.deepStrictEqual(m.validateRange(new Range(1, 5, 1, 7)), new Range(1, 4, 1, 7));
        assert.deepStrictEqual(m.validateRange(new Range(1, 6, 1, 6)), new Range(1, 6, 1, 6));
        assert.deepStrictEqual(m.validateRange(new Range(1, 6, 1, 7)), new Range(1, 6, 1, 7));
        assert.deepStrictEqual(m.validateRange(new Range(1, 7, 1, 7)), new Range(1, 7, 1, 7));
        m.dispose();
    });
    test('modifyPosition', () => {
        const m = createTextModel('line one\nline two');
        assert.deepStrictEqual(m.modifyPosition(new Position(1, 1), 0), new Position(1, 1));
        assert.deepStrictEqual(m.modifyPosition(new Position(0, 0), 0), new Position(1, 1));
        assert.deepStrictEqual(m.modifyPosition(new Position(30, 1), 0), new Position(2, 9));
        assert.deepStrictEqual(m.modifyPosition(new Position(1, 1), 17), new Position(2, 9));
        assert.deepStrictEqual(m.modifyPosition(new Position(1, 1), 1), new Position(1, 2));
        assert.deepStrictEqual(m.modifyPosition(new Position(1, 1), 3), new Position(1, 4));
        assert.deepStrictEqual(m.modifyPosition(new Position(1, 2), 10), new Position(2, 3));
        assert.deepStrictEqual(m.modifyPosition(new Position(1, 5), 13), new Position(2, 9));
        assert.deepStrictEqual(m.modifyPosition(new Position(1, 2), 16), new Position(2, 9));
        assert.deepStrictEqual(m.modifyPosition(new Position(2, 9), -17), new Position(1, 1));
        assert.deepStrictEqual(m.modifyPosition(new Position(1, 2), -1), new Position(1, 1));
        assert.deepStrictEqual(m.modifyPosition(new Position(1, 4), -3), new Position(1, 1));
        assert.deepStrictEqual(m.modifyPosition(new Position(2, 3), -10), new Position(1, 2));
        assert.deepStrictEqual(m.modifyPosition(new Position(2, 9), -13), new Position(1, 5));
        assert.deepStrictEqual(m.modifyPosition(new Position(2, 9), -16), new Position(1, 2));
        assert.deepStrictEqual(m.modifyPosition(new Position(1, 2), 17), new Position(2, 9));
        assert.deepStrictEqual(m.modifyPosition(new Position(1, 2), 100), new Position(2, 9));
        assert.deepStrictEqual(m.modifyPosition(new Position(1, 2), -2), new Position(1, 1));
        assert.deepStrictEqual(m.modifyPosition(new Position(1, 2), -100), new Position(1, 1));
        assert.deepStrictEqual(m.modifyPosition(new Position(2, 2), -100), new Position(1, 1));
        assert.deepStrictEqual(m.modifyPosition(new Position(2, 9), -18), new Position(1, 1));
        m.dispose();
    });
    test('normalizeIndentation 1', () => {
        const model = createTextModel('', undefined, {
            insertSpaces: false
        });
        assert.strictEqual(model.normalizeIndentation('\t'), '\t');
        assert.strictEqual(model.normalizeIndentation('    '), '\t');
        assert.strictEqual(model.normalizeIndentation('   '), '   ');
        assert.strictEqual(model.normalizeIndentation('  '), '  ');
        assert.strictEqual(model.normalizeIndentation(' '), ' ');
        assert.strictEqual(model.normalizeIndentation(''), '');
        assert.strictEqual(model.normalizeIndentation(' \t    '), '\t\t');
        assert.strictEqual(model.normalizeIndentation(' \t   '), '\t   ');
        assert.strictEqual(model.normalizeIndentation(' \t  '), '\t  ');
        assert.strictEqual(model.normalizeIndentation(' \t '), '\t ');
        assert.strictEqual(model.normalizeIndentation(' \t'), '\t');
        assert.strictEqual(model.normalizeIndentation('\ta'), '\ta');
        assert.strictEqual(model.normalizeIndentation('    a'), '\ta');
        assert.strictEqual(model.normalizeIndentation('   a'), '   a');
        assert.strictEqual(model.normalizeIndentation('  a'), '  a');
        assert.strictEqual(model.normalizeIndentation(' a'), ' a');
        assert.strictEqual(model.normalizeIndentation('a'), 'a');
        assert.strictEqual(model.normalizeIndentation(' \t    a'), '\t\ta');
        assert.strictEqual(model.normalizeIndentation(' \t   a'), '\t   a');
        assert.strictEqual(model.normalizeIndentation(' \t  a'), '\t  a');
        assert.strictEqual(model.normalizeIndentation(' \t a'), '\t a');
        assert.strictEqual(model.normalizeIndentation(' \ta'), '\ta');
        model.dispose();
    });
    test('normalizeIndentation 2', () => {
        const model = createTextModel('');
        assert.strictEqual(model.normalizeIndentation('\ta'), '    a');
        assert.strictEqual(model.normalizeIndentation('    a'), '    a');
        assert.strictEqual(model.normalizeIndentation('   a'), '   a');
        assert.strictEqual(model.normalizeIndentation('  a'), '  a');
        assert.strictEqual(model.normalizeIndentation(' a'), ' a');
        assert.strictEqual(model.normalizeIndentation('a'), 'a');
        assert.strictEqual(model.normalizeIndentation(' \t    a'), '        a');
        assert.strictEqual(model.normalizeIndentation(' \t   a'), '       a');
        assert.strictEqual(model.normalizeIndentation(' \t  a'), '      a');
        assert.strictEqual(model.normalizeIndentation(' \t a'), '     a');
        assert.strictEqual(model.normalizeIndentation(' \ta'), '    a');
        model.dispose();
    });
    test('getLineFirstNonWhitespaceColumn', () => {
        const model = createTextModel([
            'asd',
            ' asd',
            '\tasd',
            '  asd',
            '\t\tasd',
            ' ',
            '  ',
            '\t',
            '\t\t',
            '  \tasd',
            '',
            ''
        ].join('\n'));
        assert.strictEqual(model.getLineFirstNonWhitespaceColumn(1), 1, '1');
        assert.strictEqual(model.getLineFirstNonWhitespaceColumn(2), 2, '2');
        assert.strictEqual(model.getLineFirstNonWhitespaceColumn(3), 2, '3');
        assert.strictEqual(model.getLineFirstNonWhitespaceColumn(4), 3, '4');
        assert.strictEqual(model.getLineFirstNonWhitespaceColumn(5), 3, '5');
        assert.strictEqual(model.getLineFirstNonWhitespaceColumn(6), 0, '6');
        assert.strictEqual(model.getLineFirstNonWhitespaceColumn(7), 0, '7');
        assert.strictEqual(model.getLineFirstNonWhitespaceColumn(8), 0, '8');
        assert.strictEqual(model.getLineFirstNonWhitespaceColumn(9), 0, '9');
        assert.strictEqual(model.getLineFirstNonWhitespaceColumn(10), 4, '10');
        assert.strictEqual(model.getLineFirstNonWhitespaceColumn(11), 0, '11');
        assert.strictEqual(model.getLineFirstNonWhitespaceColumn(12), 0, '12');
        model.dispose();
    });
    test('getLineLastNonWhitespaceColumn', () => {
        const model = createTextModel([
            'asd',
            'asd ',
            'asd\t',
            'asd  ',
            'asd\t\t',
            ' ',
            '  ',
            '\t',
            '\t\t',
            'asd  \t',
            '',
            ''
        ].join('\n'));
        assert.strictEqual(model.getLineLastNonWhitespaceColumn(1), 4, '1');
        assert.strictEqual(model.getLineLastNonWhitespaceColumn(2), 4, '2');
        assert.strictEqual(model.getLineLastNonWhitespaceColumn(3), 4, '3');
        assert.strictEqual(model.getLineLastNonWhitespaceColumn(4), 4, '4');
        assert.strictEqual(model.getLineLastNonWhitespaceColumn(5), 4, '5');
        assert.strictEqual(model.getLineLastNonWhitespaceColumn(6), 0, '6');
        assert.strictEqual(model.getLineLastNonWhitespaceColumn(7), 0, '7');
        assert.strictEqual(model.getLineLastNonWhitespaceColumn(8), 0, '8');
        assert.strictEqual(model.getLineLastNonWhitespaceColumn(9), 0, '9');
        assert.strictEqual(model.getLineLastNonWhitespaceColumn(10), 4, '10');
        assert.strictEqual(model.getLineLastNonWhitespaceColumn(11), 0, '11');
        assert.strictEqual(model.getLineLastNonWhitespaceColumn(12), 0, '12');
        model.dispose();
    });
    test('#50471. getValueInRange with invalid range', () => {
        const m = createTextModel('My First Line\r\nMy Second Line\r\nMy Third Line');
        assert.strictEqual(m.getValueInRange(new Range(1, NaN, 1, 3)), 'My');
        assert.strictEqual(m.getValueInRange(new Range(NaN, NaN, NaN, NaN)), '');
        m.dispose();
    });
    test('issue #168836: updating tabSize should also update indentSize when indentSize is set to "tabSize"', () => {
        const m = createTextModel('some text', null, {
            tabSize: 2,
            indentSize: 'tabSize'
        });
        assert.strictEqual(m.getOptions().tabSize, 2);
        assert.strictEqual(m.getOptions().indentSize, 2);
        assert.strictEqual(m.getOptions().originalIndentSize, 'tabSize');
        m.updateOptions({
            tabSize: 4
        });
        assert.strictEqual(m.getOptions().tabSize, 4);
        assert.strictEqual(m.getOptions().indentSize, 4);
        assert.strictEqual(m.getOptions().originalIndentSize, 'tabSize');
        m.dispose();
    });
});
suite('TextModel.mightContainRTL', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('nope', () => {
        const model = createTextModel('hello world!');
        assert.strictEqual(model.mightContainRTL(), false);
        model.dispose();
    });
    test('yes', () => {
        const model = createTextModel('Hello,\nזוהי עובדה מבוססת שדעתו');
        assert.strictEqual(model.mightContainRTL(), true);
        model.dispose();
    });
    test('setValue resets 1', () => {
        const model = createTextModel('hello world!');
        assert.strictEqual(model.mightContainRTL(), false);
        model.setValue('Hello,\nזוהי עובדה מבוססת שדעתו');
        assert.strictEqual(model.mightContainRTL(), true);
        model.dispose();
    });
    test('setValue resets 2', () => {
        const model = createTextModel('Hello,\nهناك حقيقة مثبتة منذ زمن طويل');
        assert.strictEqual(model.mightContainRTL(), true);
        model.setValue('hello world!');
        assert.strictEqual(model.mightContainRTL(), false);
        model.dispose();
    });
});
suite('TextModel.createSnapshot', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('empty file', () => {
        const model = createTextModel('');
        const snapshot = model.createSnapshot();
        assert.strictEqual(snapshot.read(), null);
        model.dispose();
    });
    test('file with BOM', () => {
        const model = createTextModel(UTF8_BOM_CHARACTER + 'Hello');
        assert.strictEqual(model.getLineContent(1), 'Hello');
        const snapshot = model.createSnapshot(true);
        assert.strictEqual(snapshot.read(), UTF8_BOM_CHARACTER + 'Hello');
        assert.strictEqual(snapshot.read(), null);
        model.dispose();
    });
    test('regular file', () => {
        const model = createTextModel('My First Line\n\t\tMy Second Line\n    Third Line\n\n1');
        const snapshot = model.createSnapshot();
        assert.strictEqual(snapshot.read(), 'My First Line\n\t\tMy Second Line\n    Third Line\n\n1');
        assert.strictEqual(snapshot.read(), null);
        model.dispose();
    });
    test('large file', () => {
        const lines = [];
        for (let i = 0; i < 1000; i++) {
            lines[i] = 'Just some text that is a bit long such that it can consume some memory';
        }
        const text = lines.join('\n');
        const model = createTextModel(text);
        const snapshot = model.createSnapshot();
        let actual = '';
        // 70999 length => at most 2 read calls are necessary
        const tmp1 = snapshot.read();
        assert.ok(tmp1);
        actual += tmp1;
        const tmp2 = snapshot.read();
        if (tmp2 === null) {
            // all good
        }
        else {
            actual += tmp2;
            assert.strictEqual(snapshot.read(), null);
        }
        assert.strictEqual(actual, text);
        model.dispose();
    });
    test('issue #119632: invalid range', () => {
        const model = createTextModel('hello world!');
        const actual = model._validateRangeRelaxedNoAllocations(new Range(undefined, 0, undefined, 1));
        assert.deepStrictEqual(actual, new Range(1, 1, 1, 1));
        model.dispose();
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dE1vZGVsLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvdGVzdC9jb21tb24vbW9kZWwvdGV4dE1vZGVsLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUN2RSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUN4RSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDNUQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3RELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBRW5GLE9BQU8sRUFBRSxTQUFTLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUNqRixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsZUFBZSxFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFHM0UsU0FBUyxvQkFBb0IsQ0FBQyxtQkFBNEIsRUFBRSxjQUFzQixFQUFFLG9CQUE2QixFQUFFLGVBQXVCLEVBQUUsSUFBYyxFQUFFLEdBQVk7SUFDdkssTUFBTSxDQUFDLEdBQUcsZUFBZSxDQUN4QixJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUNmLFNBQVMsRUFDVDtRQUNDLE9BQU8sRUFBRSxjQUFjO1FBQ3ZCLFlBQVksRUFBRSxtQkFBbUI7UUFDakMsaUJBQWlCLEVBQUUsSUFBSTtLQUN2QixDQUNELENBQUM7SUFDRixNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsVUFBVSxFQUFFLENBQUM7SUFDekIsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBRVosTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsWUFBWSxFQUFFLG9CQUFvQixFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBQzlELE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxlQUFlLEVBQUUsR0FBRyxDQUFDLENBQUM7QUFDckQsQ0FBQztBQUVELFNBQVMsV0FBVyxDQUFDLG9CQUF5QyxFQUFFLGVBQThDLEVBQUUsSUFBYyxFQUFFLEdBQVk7SUFDM0ksSUFBSSxPQUFPLG9CQUFvQixLQUFLLFdBQVcsRUFBRSxDQUFDO1FBQ2pELDRCQUE0QjtRQUM1QixJQUFJLE9BQU8sZUFBZSxLQUFLLFdBQVcsRUFBRSxDQUFDO1lBQzVDLHVCQUF1QjtZQUN2QixvQkFBb0IsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQzFELG9CQUFvQixDQUFDLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDN0QsQ0FBQzthQUFNLElBQUksT0FBTyxlQUFlLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDaEQsb0JBQW9CO1lBQ3BCLG9CQUFvQixDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLGVBQWUsRUFBRSxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUM7WUFDcEUsb0JBQW9CLENBQUMsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsZUFBZSxFQUFFLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQztRQUN2RSxDQUFDO2FBQU0sQ0FBQztZQUNQLG1EQUFtRDtZQUNuRCxvQkFBb0IsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxlQUFlLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQ3ZFLG9CQUFvQixDQUFDLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDN0QsQ0FBQztJQUNGLENBQUM7U0FBTSxDQUFDO1FBQ1AseUJBQXlCO1FBQ3pCLElBQUksT0FBTyxlQUFlLEtBQUssV0FBVyxFQUFFLENBQUM7WUFDNUMsdUJBQXVCO1lBQ3ZCLG9CQUFvQixDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsb0JBQW9CLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQztZQUMxRSxvQkFBb0IsQ0FBQyxLQUFLLEVBQUUsS0FBSyxFQUFFLG9CQUFvQixFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDNUUsQ0FBQzthQUFNLElBQUksT0FBTyxlQUFlLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDaEQsb0JBQW9CO1lBQ3BCLG9CQUFvQixDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsb0JBQW9CLEVBQUUsZUFBZSxFQUFFLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQztZQUNwRixvQkFBb0IsQ0FBQyxLQUFLLEVBQUUsS0FBSyxFQUFFLG9CQUFvQixFQUFFLGVBQWUsRUFBRSxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDdEYsQ0FBQzthQUFNLENBQUM7WUFDUCxtREFBbUQ7WUFDbkQsSUFBSSxvQkFBb0IsS0FBSyxJQUFJLEVBQUUsQ0FBQztnQkFDbkMsb0JBQW9CLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxvQkFBb0IsRUFBRSxlQUFlLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDO2dCQUN2RixvQkFBb0IsQ0FBQyxLQUFLLEVBQUUsS0FBSyxFQUFFLG9CQUFvQixFQUFFLGVBQWUsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUM7WUFDekYsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLG9CQUFvQixDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsb0JBQW9CLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQztnQkFDMUUsb0JBQW9CLENBQUMsS0FBSyxFQUFFLEtBQUssRUFBRSxvQkFBb0IsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQzVFLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztBQUNGLENBQUM7QUFFRCxLQUFLLENBQUMsMEJBQTBCLEVBQUUsR0FBRyxFQUFFO0lBRXRDLHVDQUF1QyxFQUFFLENBQUM7SUFTMUMsU0FBUywyQkFBMkIsQ0FBQyxJQUFZLEVBQUUsUUFBeUI7UUFDM0UsTUFBTSxFQUFFLFVBQVUsRUFBRSxVQUFVLEVBQUUsR0FBRyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLHdCQUF3QixDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ3pHLE1BQU0sTUFBTSxHQUFvQjtZQUMvQixHQUFHLEVBQUUsVUFBVSxDQUFDLE1BQU0sRUFBRTtZQUN4QixLQUFLLEVBQUUsVUFBVSxDQUFDLGVBQWUsRUFBRTtZQUNuQyxXQUFXLEVBQUUsVUFBVSxDQUFDLGVBQWUsRUFBRTtZQUN6QyxZQUFZLEVBQUUsQ0FBQyxVQUFVLENBQUMseUJBQXlCLEVBQUU7U0FDckQsQ0FBQztRQUNGLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQ3pDLFVBQVUsQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUN0QixDQUFDO0lBRUQsSUFBSSxDQUFDLGVBQWUsRUFBRSxHQUFHLEVBQUU7UUFDMUIsMkJBQTJCLENBQUMsY0FBYyxFQUN6QztZQUNDLEdBQUcsRUFBRSxJQUFJO1lBQ1QsS0FBSyxFQUFFO2dCQUNOLGNBQWM7YUFDZDtZQUNELFdBQVcsRUFBRSxLQUFLO1lBQ2xCLFlBQVksRUFBRSxJQUFJO1NBQ2xCLENBQ0QsQ0FBQztJQUNILENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLGdCQUFnQixFQUFFLEdBQUcsRUFBRTtRQUMzQiwyQkFBMkIsQ0FBQyx5Q0FBeUMsRUFDcEU7WUFDQyxHQUFHLEVBQUUsTUFBTTtZQUNYLEtBQUssRUFBRTtnQkFDTixRQUFRO2dCQUNSLGFBQWE7Z0JBQ2IsS0FBSztnQkFDTCxLQUFLO2dCQUNMLE1BQU07YUFDTjtZQUNELFdBQVcsRUFBRSxLQUFLO1lBQ2xCLFlBQVksRUFBRSxJQUFJO1NBQ2xCLENBQ0QsQ0FBQztJQUNILENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLG1CQUFtQixFQUFFLEdBQUcsRUFBRTtRQUM5QiwyQkFBMkIsQ0FBQyxnQkFBZ0IsRUFDM0M7WUFDQyxHQUFHLEVBQUUsSUFBSTtZQUNULEtBQUssRUFBRTtnQkFDTixRQUFRO2dCQUNSLFFBQVE7YUFDUjtZQUNELFdBQVcsRUFBRSxLQUFLO1lBQ2xCLFlBQVksRUFBRSxLQUFLO1NBQ25CLENBQ0QsQ0FBQztJQUNILENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLGVBQWUsRUFBRSxHQUFHLEVBQUU7UUFDMUIsMkJBQTJCLENBQUMsaUNBQWlDLEVBQzVEO1lBQ0MsR0FBRyxFQUFFLElBQUk7WUFDVCxLQUFLLEVBQUU7Z0JBQ04sUUFBUTtnQkFDUix5QkFBeUI7YUFDekI7WUFDRCxXQUFXLEVBQUUsSUFBSTtZQUNqQixZQUFZLEVBQUUsS0FBSztTQUNuQixDQUNELENBQUM7SUFDSCxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxlQUFlLEVBQUUsR0FBRyxFQUFFO1FBQzFCLDJCQUEyQixDQUFDLHVDQUF1QyxFQUNsRTtZQUNDLEdBQUcsRUFBRSxJQUFJO1lBQ1QsS0FBSyxFQUFFO2dCQUNOLFFBQVE7Z0JBQ1IsK0JBQStCO2FBQy9CO1lBQ0QsV0FBVyxFQUFFLElBQUk7WUFDakIsWUFBWSxFQUFFLEtBQUs7U0FDbkIsQ0FDRCxDQUFDO0lBQ0gsQ0FBQyxDQUFDLENBQUM7QUFFSixDQUFDLENBQUMsQ0FBQztBQUVILEtBQUssQ0FBQywwQkFBMEIsRUFBRSxHQUFHLEVBQUU7SUFFdEMsdUNBQXVDLEVBQUUsQ0FBQztJQUUxQyxJQUFJLENBQUMsMENBQTBDLEVBQUUsR0FBRyxFQUFFO1FBQ3JELHNFQUFzRTtRQUN0RSx5RUFBeUU7UUFDekUsaUZBQWlGO1FBQ2pGLEVBQUU7UUFDRixxRUFBcUU7UUFDckUsc0JBQXNCO1FBQ3RCLE1BQU0sV0FBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7UUFDMUMsTUFBTSxvQkFBb0IsR0FBMEIsbUJBQW1CLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDckYsTUFBTSxTQUFTLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsU0FBUyxFQUFFLEVBQUUsRUFBRSxxQkFBcUIsRUFBRSxTQUFTLENBQUMsd0JBQXdCLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUN2SixNQUFNLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxhQUFhLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNyRCxXQUFXLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDdkIsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsdUJBQXVCLEVBQUUsR0FBRyxFQUFFO1FBRWxDLElBQUksQ0FBQyxHQUFHLGVBQWUsQ0FBQyxrREFBa0QsQ0FBQyxDQUFDO1FBQzVFLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLHFCQUFxQixDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQzlFLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLHFCQUFxQixDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQy9FLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLHFCQUFxQixDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQy9FLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLHFCQUFxQixDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUUsZUFBZSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQzVGLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLHFCQUFxQixDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsbUJBQW1CLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDL0YsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMscUJBQXFCLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUM5RixNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLG1CQUFtQixDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQy9GLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLHFCQUFxQixDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsZ0NBQWdDLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDL0csTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMscUJBQXFCLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxvQ0FBb0MsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNoSCxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLGlEQUFpRCxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ2hJLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLHFCQUFxQixDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsa0RBQWtELENBQUMsTUFBTSxDQUFDLENBQUM7UUFDcEksQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBRVosQ0FBQyxHQUFHLGVBQWUsQ0FBQyw4Q0FBOEMsQ0FBQyxDQUFDO1FBQ3BFLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLHFCQUFxQixDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQzlFLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLHFCQUFxQixDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQy9FLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLHFCQUFxQixDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQy9FLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLHFCQUFxQixDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUUsZUFBZSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQzVGLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLHFCQUFxQixDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsaUJBQWlCLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDN0YsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMscUJBQXFCLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUM1RixNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQzdGLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLHFCQUFxQixDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsOEJBQThCLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDN0csTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMscUJBQXFCLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxnQ0FBZ0MsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUM1RyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLDZDQUE2QyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQzVILE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLHFCQUFxQixDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsOENBQThDLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDaEksQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQ2IsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMscUNBQXFDLEVBQUUsR0FBRyxFQUFFO1FBRWhELElBQUksQ0FBQyxHQUFHLGVBQWUsQ0FBQyxrREFBa0QsQ0FBQyxDQUFDO1FBQzVFLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLHFCQUFxQixDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQywwQ0FBa0MsRUFBRSxtQkFBbUIsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNoSSxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsbUNBQTJCLEVBQUUsbUJBQW1CLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDekgsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMscUJBQXFCLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLGlDQUF5QixFQUFFLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3JILE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLHFCQUFxQixDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQywwQ0FBa0MsRUFBRSxrREFBa0QsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNySyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsbUNBQTJCLEVBQUUsa0RBQWtELENBQUMsTUFBTSxDQUFDLENBQUM7UUFDOUosTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMscUJBQXFCLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLGlDQUF5QixFQUFFLDhDQUE4QyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3hKLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUVaLENBQUMsR0FBRyxlQUFlLENBQUMsOENBQThDLENBQUMsQ0FBQztRQUNwRSxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsMENBQWtDLEVBQUUsaUJBQWlCLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDOUgsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMscUJBQXFCLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLGlDQUF5QixFQUFFLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3JILE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLHFCQUFxQixDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxtQ0FBMkIsRUFBRSxtQkFBbUIsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUN6SCxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsMENBQWtDLEVBQUUsOENBQThDLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDakssTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMscUJBQXFCLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLGlDQUF5QixFQUFFLDhDQUE4QyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3hKLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLHFCQUFxQixDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxtQ0FBMkIsRUFBRSxrREFBa0QsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUM5SixDQUFDLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDYixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxxQkFBcUIsRUFBRSxHQUFHLEVBQUU7UUFFaEMsV0FBVyxDQUFDLFNBQVMsRUFBRSxTQUFTLEVBQUU7WUFDakMsR0FBRztZQUNILEdBQUc7WUFDSCxHQUFHO1lBQ0gsR0FBRztZQUNILEdBQUc7WUFDSCxHQUFHO1lBQ0gsR0FBRztTQUNILEVBQUUsVUFBVSxDQUFDLENBQUM7UUFFZixXQUFXLENBQUMsS0FBSyxFQUFFLFNBQVMsRUFBRTtZQUM3QixLQUFLO1lBQ0wsR0FBRztZQUNILEdBQUc7WUFDSCxHQUFHO1lBQ0gsR0FBRztZQUNILEdBQUc7WUFDSCxHQUFHO1NBQ0gsRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO1FBRXZCLFdBQVcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFO1lBQ3BCLEtBQUs7WUFDTCxHQUFHO1lBQ0gsR0FBRztZQUNILEdBQUc7WUFDSCxHQUFHO1lBQ0gsR0FBRztZQUNILEdBQUc7U0FDSCxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRVYsV0FBVyxDQUFDLEtBQUssRUFBRSxTQUFTLEVBQUU7WUFDN0IsS0FBSztZQUNMLEtBQUs7WUFDTCxLQUFLO1lBQ0wsS0FBSztZQUNMLEtBQUs7WUFDTCxLQUFLO1lBQ0wsS0FBSztTQUNMLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFFWixXQUFXLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDM0IsS0FBSztZQUNMLEtBQUs7WUFDTCxLQUFLO1lBQ0wsS0FBSztZQUNMLEtBQUs7WUFDTCxLQUFLO1lBQ0wsS0FBSztZQUNMLEtBQUs7U0FDTCxFQUFFLFlBQVksQ0FBQyxDQUFDO1FBQ2pCLFdBQVcsQ0FBQyxLQUFLLEVBQUUsU0FBUyxFQUFFO1lBQzdCLEtBQUs7WUFDTCxJQUFJO1lBQ0osS0FBSztZQUNMLElBQUk7WUFDSixLQUFLO1lBQ0wsSUFBSTtZQUNKLEtBQUs7WUFDTCxJQUFJO1NBQ0osRUFBRSxZQUFZLENBQUMsQ0FBQztRQUNqQixXQUFXLENBQUMsS0FBSyxFQUFFLFNBQVMsRUFBRTtZQUM3QixLQUFLO1lBQ0wsS0FBSztZQUNMLEtBQUs7WUFDTCxLQUFLO1lBQ0wsS0FBSztZQUNMLEtBQUs7WUFDTCxLQUFLO1lBQ0wsS0FBSztZQUNMLEtBQUs7U0FDTCxFQUFFLFlBQVksQ0FBQyxDQUFDO1FBQ2pCLFdBQVcsQ0FBQyxLQUFLLEVBQUUsU0FBUyxFQUFFO1lBQzdCLEtBQUs7WUFDTCxLQUFLO1lBQ0wsR0FBRztZQUNILEtBQUs7WUFDTCxHQUFHO1lBQ0gsS0FBSztZQUNMLEdBQUc7WUFDSCxLQUFLO1lBQ0wsS0FBSztTQUNMLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFDakIsV0FBVyxDQUFDLEtBQUssRUFBRSxTQUFTLEVBQUU7WUFDN0IsS0FBSztZQUNMLEtBQUs7WUFDTCxHQUFHO1lBQ0gsS0FBSztZQUNMLEdBQUc7WUFDSCxLQUFLO1lBQ0wsR0FBRztZQUNILEtBQUs7WUFDTCxPQUFPO1NBQ1AsRUFBRSxZQUFZLENBQUMsQ0FBQztRQUNqQixXQUFXLENBQUMsS0FBSyxFQUFFLFNBQVMsRUFBRTtZQUM3QixLQUFLO1lBQ0wsS0FBSztZQUNMLEdBQUc7WUFDSCxLQUFLO1lBQ0wsR0FBRztZQUNILEtBQUs7WUFDTCxLQUFLO1lBQ0wsS0FBSztZQUNMLE9BQU87U0FDUCxFQUFFLGlCQUFpQixDQUFDLENBQUM7UUFFdEIsV0FBVyxDQUFDLFNBQVMsRUFBRSxTQUFTLEVBQUU7WUFDakMsR0FBRztZQUNILElBQUk7WUFDSixJQUFJO1lBQ0osSUFBSTtZQUNKLElBQUk7WUFDSixJQUFJO1lBQ0osSUFBSTtZQUNKLElBQUk7U0FDSixFQUFFLGtEQUFrRCxDQUFDLENBQUM7UUFDdkQsV0FBVyxDQUFDLElBQUksRUFBRSxTQUFTLEVBQUU7WUFDNUIsR0FBRztZQUNILGFBQWE7WUFDYixJQUFJO1lBQ0osSUFBSTtZQUNKLElBQUk7WUFDSixJQUFJO1lBQ0osSUFBSTtZQUNKLElBQUk7U0FDSixFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBQ2hCLFdBQVcsQ0FBQyxTQUFTLEVBQUUsU0FBUyxFQUFFO1lBQ2pDLEVBQUU7WUFDRixJQUFJO1lBQ0osTUFBTTtZQUNOLFFBQVE7WUFDUixVQUFVO1lBQ1YsWUFBWTtZQUNaLGNBQWM7WUFDZCxnQkFBZ0I7U0FDaEIsRUFBRSwrQkFBK0IsQ0FBQyxDQUFDO1FBQ3BDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFO1lBQ3BCLEdBQUc7WUFDSCxNQUFNO1lBQ04sTUFBTTtZQUNOLE9BQU87WUFDUCxHQUFHO1lBQ0gsTUFBTTtZQUNOLE1BQU07WUFDTixPQUFPO1lBQ1AsR0FBRztZQUNILE1BQU07WUFDTixNQUFNO1lBQ04sT0FBTztTQUNQLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDZixXQUFXLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRTtZQUNwQixHQUFHO1lBQ0gsUUFBUTtZQUNSLFFBQVE7WUFDUixPQUFPO1lBQ1AsR0FBRztZQUNILFFBQVE7WUFDUixRQUFRO1lBQ1IsT0FBTztZQUNQLEdBQUc7WUFDSCxRQUFRO1lBQ1IsUUFBUTtZQUNSLE9BQU87U0FDUCxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBQ2YsV0FBVyxDQUFDLElBQUksRUFBRSxDQUFDLEVBQUU7WUFDcEIsR0FBRztZQUNILFVBQVU7WUFDVixVQUFVO1lBQ1YsUUFBUTtZQUNSLEdBQUc7WUFDSCxVQUFVO1lBQ1YsVUFBVTtZQUNWLE9BQU87WUFDUCxHQUFHO1lBQ0gsVUFBVTtZQUNWLFVBQVU7WUFDVixPQUFPO1NBQ1AsRUFBRSxlQUFlLENBQUMsQ0FBQztRQUNwQixXQUFXLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRTtZQUNwQixHQUFHO1lBQ0gsS0FBSztZQUNMLEtBQUs7WUFDTCxLQUFLO1lBQ0wsS0FBSztZQUNMLEdBQUc7WUFDSCxLQUFLO1lBQ0wsS0FBSztZQUNMLEtBQUs7WUFDTCxLQUFLO1NBQ0wsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUVWLFdBQVcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFO1lBQ3BCLEdBQUc7WUFDSCxLQUFLO1lBQ0wsS0FBSztZQUNMLEdBQUc7WUFDSCxLQUFLO1lBQ0wsS0FBSztZQUNMLEdBQUc7WUFDSCxLQUFLO1lBQ0wsS0FBSztZQUNMLEdBQUc7WUFDSCxLQUFLO1lBQ0wsS0FBSztTQUNMLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDVixXQUFXLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRTtZQUNwQixHQUFHO1lBQ0gsS0FBSztZQUNMLE9BQU87WUFDUCxHQUFHO1lBQ0gsS0FBSztZQUNMLE9BQU87WUFDUCxHQUFHO1lBQ0gsS0FBSztZQUNMLE9BQU87WUFDUCxHQUFHO1lBQ0gsS0FBSztZQUNMLE9BQU87U0FDUCxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBQ2YsV0FBVyxDQUFDLElBQUksRUFBRSxDQUFDLEVBQUU7WUFDcEIsR0FBRztZQUNILEtBQUs7WUFDTCxLQUFLO1lBQ0wsT0FBTztZQUNQLEdBQUc7WUFDSCxLQUFLO1lBQ0wsS0FBSztZQUNMLE9BQU87WUFDUCxHQUFHO1lBQ0gsS0FBSztZQUNMLEtBQUs7WUFDTCxPQUFPO1NBQ1AsRUFBRSxVQUFVLENBQUMsQ0FBQztRQUNmLFdBQVcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFO1lBQ3BCLEdBQUc7WUFDSCxLQUFLO1lBQ0wsS0FBSztZQUNMLE9BQU87WUFDUCxPQUFPO1lBQ1AsR0FBRztZQUNILEtBQUs7WUFDTCxLQUFLO1lBQ0wsT0FBTztZQUNQLE9BQU87U0FDUCxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBQ2YsV0FBVyxDQUFDLElBQUksRUFBRSxDQUFDLEVBQUU7WUFDcEIsR0FBRztZQUNILEtBQUs7WUFDTCxPQUFPO1lBQ1AsT0FBTztZQUNQLEdBQUc7WUFDSCxLQUFLO1lBQ0wsT0FBTztZQUNQLE9BQU87U0FDUCxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBQ2YsV0FBVyxDQUFDLElBQUksRUFBRSxDQUFDLEVBQUU7WUFDcEIsR0FBRztZQUNILE9BQU87WUFDUCxPQUFPO1lBQ1AsR0FBRztZQUNILE9BQU87WUFDUCxPQUFPO1lBQ1AsR0FBRztZQUNILE9BQU87WUFDUCxPQUFPO1lBQ1AsR0FBRztZQUNILE9BQU87WUFDUCxPQUFPO1NBQ1AsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNWLFdBQVcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFO1lBQ3BCLEdBQUc7WUFDSCxLQUFLO1lBQ0wsT0FBTztZQUNQLE9BQU87WUFDUCxTQUFTO1lBQ1QsR0FBRztZQUNILEtBQUs7WUFDTCxPQUFPO1lBQ1AsT0FBTztZQUNQLFNBQVM7U0FDVCxFQUFFLGVBQWUsQ0FBQyxDQUFDO1FBQ3BCLFdBQVcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFO1lBQ3BCLEdBQUc7WUFDSCxLQUFLO1lBQ0wsT0FBTztZQUNQLE9BQU87WUFDUCxTQUFTO1lBQ1QsU0FBUztZQUNULFdBQVc7U0FDWCxFQUFFLG9CQUFvQixDQUFDLENBQUM7UUFDekIsV0FBVyxDQUFDLElBQUksRUFBRSxDQUFDLEVBQUU7WUFDcEIsR0FBRztZQUNILE9BQU87WUFDUCxPQUFPO1lBQ1AsT0FBTztZQUNQLFFBQVE7WUFDUixXQUFXO1lBQ1gsR0FBRztZQUNILE9BQU87WUFDUCxPQUFPO1lBQ1AsT0FBTztZQUNQLFFBQVE7WUFDUixXQUFXO1NBQ1gsRUFBRSxlQUFlLENBQUMsQ0FBQztRQUNwQixXQUFXLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRTtZQUNwQixHQUFHO1lBQ0gsT0FBTztZQUNQLE9BQU87WUFDUCxPQUFPO1lBQ1AsUUFBUTtZQUNSLFdBQVc7WUFDWCxXQUFXO1NBQ1gsRUFBRSxlQUFlLENBQUMsQ0FBQztRQUNwQixXQUFXLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRTtZQUNwQixHQUFHO1lBQ0gsR0FBRztZQUNILE9BQU87WUFDUCxPQUFPO1lBQ1AsUUFBUTtZQUNSLFdBQVc7WUFDWCxXQUFXO1lBQ1gsR0FBRztZQUNILEdBQUc7WUFDSCxPQUFPO1lBQ1AsT0FBTztZQUNQLFFBQVE7WUFDUixXQUFXO1lBQ1gsV0FBVztTQUNYLEVBQUUsZUFBZSxDQUFDLENBQUM7UUFDcEIsV0FBVyxDQUFDLElBQUksRUFBRSxDQUFDLEVBQUU7WUFDcEIsR0FBRztZQUNILElBQUk7WUFDSixJQUFJO1lBQ0osSUFBSTtZQUNKLElBQUk7WUFDSixJQUFJO1lBQ0osR0FBRztZQUNILE1BQU07WUFDTixPQUFPO1lBQ1AsT0FBTztTQUNQLEVBQUUsb0JBQW9CLENBQUMsQ0FBQztRQUN6QixXQUFXLENBQUMsS0FBSyxFQUFFLFNBQVMsRUFBRTtZQUM3QixNQUFNO1lBQ04sT0FBTztZQUNQLEtBQUs7U0FDTCxFQUFFLG9CQUFvQixDQUFDLENBQUM7UUFDekIsV0FBVyxDQUFDLEtBQUssRUFBRSxTQUFTLEVBQUU7WUFDN0IsS0FBSztZQUNMLFNBQVM7U0FDVCxFQUFFLG9CQUFvQixDQUFDLENBQUM7SUFDMUIsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMscURBQXFELEVBQUUsR0FBRyxFQUFFO1FBQ2hFLFdBQVcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFO1lBQ3BCLHFDQUFxQztZQUNyQyxxQ0FBcUM7WUFDckMscUNBQXFDO1lBQ3JDLHlEQUF5RDtZQUN6RCxxQ0FBcUM7WUFDckMseURBQXlEO1lBQ3pELHFDQUFxQztZQUNyQyxxQ0FBcUM7WUFDckMseURBQXlEO1lBQ3pELHFDQUFxQztZQUNyQyxxQ0FBcUM7WUFDckMseURBQXlEO1lBQ3pELHFDQUFxQztZQUNyQyxxQ0FBcUM7U0FDckMsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsNENBQTRDLEVBQUUsR0FBRyxFQUFFO1FBQ3ZELFdBQVcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFO1lBQ3BCLEVBQUU7WUFDRixlQUFlO1lBQ2YsRUFBRTtZQUNGLGtDQUFrQztZQUNsQyxrQ0FBa0M7WUFDbEMsRUFBRTtZQUNGLGFBQWE7WUFDYixFQUFFO1lBQ0Ysb0JBQW9CO1lBQ3BCLEVBQUU7WUFDRixrQkFBa0I7WUFDbEIsa0JBQWtCO1lBQ2xCLEVBQUU7WUFDRiwrQkFBK0I7WUFDL0IsRUFBRTtZQUNGLEdBQUc7WUFDSCxFQUFFO1lBQ0YsY0FBYztZQUNkLEVBQUU7WUFDRix3QkFBd0I7WUFDeEIsRUFBRTtTQUNGLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLDRDQUE0QyxFQUFFLEdBQUcsRUFBRTtRQUN2RCxXQUFXLENBQUMsS0FBSyxFQUFFLFNBQVMsRUFBRTtZQUM3QixHQUFHO1lBQ0gsR0FBRztZQUNILEdBQUc7WUFDSCxHQUFHO1lBQ0gsSUFBSTtZQUNKLEtBQUs7WUFDTCxPQUFPO1lBQ1AsS0FBSztZQUNMLElBQUk7WUFDSixLQUFLO1lBQ0wsSUFBSTtZQUNKLElBQUk7WUFDSixJQUFJO1lBQ0osSUFBSTtZQUNKLEdBQUc7U0FDSCxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyw0Q0FBNEMsRUFBRSxHQUFHLEVBQUU7UUFDdkQsdUJBQXVCO1FBQ3ZCLFdBQVcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFO1lBQ3BCLEdBQUc7WUFDSCxHQUFHO1lBQ0gsS0FBSztZQUNMLEtBQUs7U0FDTCxDQUFDLENBQUM7UUFFSCx1QkFBdUI7UUFDdkIsV0FBVyxDQUFDLElBQUksRUFBRSxDQUFDLEVBQUU7WUFDcEIsR0FBRztZQUNILFdBQVc7WUFDWCxXQUFXO1NBQ1gsQ0FBQyxDQUFDO1FBRUgsdUJBQXVCO1FBQ3ZCLG9CQUFvQixDQUFDLElBQUksRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRTtZQUN0QyxLQUFLO1lBQ0wsS0FBSztZQUNMLEtBQUs7U0FDTCxDQUFDLENBQUM7UUFFSCx1QkFBdUI7UUFDdkIsa0RBQWtEO1FBQ2xELG9CQUFvQixDQUFDLElBQUksRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRTtZQUN0QyxLQUFLO1lBQ0wsS0FBSztZQUNMLEtBQUs7WUFDTCxPQUFPO1NBQ1AsQ0FBQyxDQUFDO1FBRUgsb0JBQW9CLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFO1lBQ3RDLGtCQUFrQjtZQUNsQixTQUFTO1lBQ1QsV0FBVztZQUNYLGFBQWE7U0FDYixDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyw0Q0FBNEMsRUFBRSxHQUFHLEVBQUU7UUFDdkQsV0FBVyxDQUFDLElBQUksRUFBRSxDQUFDLEVBQUU7WUFDcEIsYUFBYTtZQUNiLHNCQUFzQjtTQUN0QixDQUFDLENBQUM7UUFDSCxXQUFXLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRTtZQUNwQixhQUFhO1lBQ2IsK0JBQStCO1lBQy9CLDBCQUEwQjtTQUMxQixDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxrQkFBa0IsRUFBRSxHQUFHLEVBQUU7UUFFN0IsTUFBTSxDQUFDLEdBQUcsZUFBZSxDQUFDLG9CQUFvQixDQUFDLENBQUM7UUFFaEQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDbkYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFbkYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDbkYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDbkYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFcEYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDbkYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDbkYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDbkYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFcEYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDbkYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDbkYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFcEYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxRQUFRLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFckYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzdGLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLElBQUksUUFBUSxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFakgsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxRQUFRLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNqSCxNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUUzRixDQUFDLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDYixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxvREFBb0QsRUFBRSxHQUFHLEVBQUU7UUFFL0QsTUFBTSxDQUFDLEdBQUcsZUFBZSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBRWxDLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ25GLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ25GLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRW5GLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ25GLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ25GLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ25GLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ25GLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ25GLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRXBGLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ25GLE1BQU0sQ0FBQyxlQUFlLENBQUMs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QUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDOUYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLElBQUksS0FBSyxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUU5RixDQUFDLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDYixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxpREFBaUQsRUFBRSxHQUFHLEVBQUU7UUFFNUQsTUFBTSxDQUFDLEdBQUcsZUFBZSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBRWxDLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdEYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUV0RixNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3RGLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdEYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN0RixNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3RGLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFdEYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN0RixNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3RGLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdEYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUV0RixNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3RGLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdEYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUV0RixNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3RGLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFdEYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUV0RixDQUFDLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDYixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxpREFBaUQsRUFBRSxHQUFHLEVBQUU7UUFFNUQsTUFBTSxDQUFDLEdBQUcsZUFBZSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBRXBDLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdEYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUV0RixNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3RGLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdEYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN0RixNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3RGLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdEYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN0RixNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRXRGLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdEYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN0RixNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3RGLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdEYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN0RixNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRXRGLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdEYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN0RixNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3RGLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdEYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUV0RixNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3RGLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdEYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN0RixNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRXRGLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdEYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN0RixNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRXRGLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdEYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUV0RixNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRXRGLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUNiLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLGdCQUFnQixFQUFFLEdBQUcsRUFBRTtRQUUzQixNQUFNLENBQUMsR0FBRyxlQUFlLENBQUMsb0JBQW9CLENBQUMsQ0FBQztRQUNoRCxNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3BGLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDcEYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLElBQUksUUFBUSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVyRixNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3JGLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDcEYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNwRixNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3JGLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDckYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVyRixNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdEYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3JGLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNyRixNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdEYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3RGLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUV0RixNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3JGLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFdEYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3JGLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN2RixNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdkYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRXRGLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUNiLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLHdCQUF3QixFQUFFLEdBQUcsRUFBRTtRQUNuQyxNQUFNLEtBQUssR0FBRyxlQUFlLENBQUMsRUFBRSxFQUMvQixTQUFTLEVBQ1Q7WUFDQyxZQUFZLEVBQUUsS0FBSztTQUNuQixDQUNELENBQUM7UUFFRixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUMzRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUM3RCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxLQUFLLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUM3RCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUMzRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUN6RCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUN2RCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxTQUFTLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUNsRSxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUNsRSxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxPQUFPLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUNoRSxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxNQUFNLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUM5RCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxLQUFLLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUU1RCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxLQUFLLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUM3RCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxPQUFPLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUMvRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxNQUFNLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUMvRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxLQUFLLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUM3RCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUMzRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsRUFB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QUFDLCtCQUErQixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUNyRSxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQywrQkFBK0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDckUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsK0JBQStCLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ3JFLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLCtCQUErQixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUNyRSxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQywrQkFBK0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDckUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsK0JBQStCLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ3JFLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLCtCQUErQixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUNyRSxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQywrQkFBK0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDckUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsK0JBQStCLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ3ZFLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLCtCQUErQixDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUN2RSxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQywrQkFBK0IsQ0FBQyxFQUFF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