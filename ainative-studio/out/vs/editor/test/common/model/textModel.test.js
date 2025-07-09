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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dE1vZGVsLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3Rlc3QvY29tbW9uL21vZGVsL3RleHRNb2RlbC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDdkUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDeEUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUN0RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUVuRixPQUFPLEVBQUUsU0FBUyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDakYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLGVBQWUsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBRzNFLFNBQVMsb0JBQW9CLENBQUMsbUJBQTRCLEVBQUUsY0FBc0IsRUFBRSxvQkFBNkIsRUFBRSxlQUF1QixFQUFFLElBQWMsRUFBRSxHQUFZO0lBQ3ZLLE1BQU0sQ0FBQyxHQUFHLGVBQWUsQ0FDeEIsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFDZixTQUFTLEVBQ1Q7UUFDQyxPQUFPLEVBQUUsY0FBYztRQUN2QixZQUFZLEVBQUUsbUJBQW1CO1FBQ2pDLGlCQUFpQixFQUFFLElBQUk7S0FDdkIsQ0FDRCxDQUFDO0lBQ0YsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLFVBQVUs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QUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ25GLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ25GLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRXBGLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ25GLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ25GLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ25GLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRXBGLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ25GLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ25GLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRXBGLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLElBQUksUUFBUSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRXJGLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM3RixNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRWpILE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLElBQUksUUFBUSxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDakgsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxRQUFRLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFM0YsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQ2IsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsb0RBQW9ELEVBQUUsR0FBRyxFQUFFO1FBRS9ELE1BQU0sQ0FBQyxHQUFHLGVBQWUsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUVsQyxNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNuRixNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNuRixNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVuRixNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNuRixNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNuRixNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNuRixNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNuRixNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNuRixNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVwRixNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNuRixNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNuRixNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNuRixNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVwRixNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDN0YsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxRQUFRLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVqSCxNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2pILE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLElBQUksUUFBUSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRTNGLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUNiLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLG9EQUFvRCxFQUFFLEdBQUcsRUFBRTtRQUUvRCxNQUFNLENBQUMsR0FBRyxlQUFlLENBQUMsUUFBUSxDQUFDLENBQUM7UUFFcEMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDbkYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDbkYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDbkYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDbkYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMs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QUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3RGLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdEYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN0RixNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRXRGLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdEYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN0RixNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3RGLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFdEYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN0RixNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3RGLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFdEYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN0RixNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRXRGLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFdEYsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQ2IsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsaURBQWlELEVBQUUsR0FBRyxFQUFFO1FBRTVELE1BQU0sQ0FBQyxHQUFHLGVBQWUsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUVwQyxNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3RGLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFdEYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN0RixNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3RGLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdEYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN0RixNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3RGLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdEYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUV0RixNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3RGLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdEYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN0RixNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3RGLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdEYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUV0RixNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3RGLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdEYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN0RixNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3RGLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFdEYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN0RixNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3RGLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdEYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUV0RixNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3RGLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdEYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUV0RixNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3RGLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFdEYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUV0RixDQUFDLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDYixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxHQUFHLEVBQUU7UUFFM0IsTUFBTSxDQUFDLEdBQUcsZUFBZSxDQUFDLG9CQUFvQixDQUFDLENBQUM7UUFDaEQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNwRixNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3BGLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFckYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNyRixNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3BGLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDcEYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNyRixNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3JGLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFckYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3RGLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNyRixNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDckYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3RGLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN0RixNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFdEYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNyRixNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRXRGLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNyRixNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdkYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3ZGLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUV0RixDQUFDLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDYixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyx3QkFBd0IsRUFBRSxHQUFHLEVBQUU7UUFDbkMsTUFBTSxLQUFLLEdBQUcsZUFBZSxDQUFDLEVBQUUsRUFDL0IsU0FBUyxFQUNUO1lBQ0MsWUFBWSxFQUFFLEtBQUs7U0FDbkIsQ0FDRCxDQUFDO1FBRUYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDM0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsb0JBQW9CLENBQUMsTUFBTSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDN0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsb0JBQW9CLENBQUMsS0FBSyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDN0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDM0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsb0JBQW9CLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDekQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsb0JBQW9CLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDdkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsb0JBQW9CLENBQUMsU0FBUyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDbEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsb0JBQW9CLENBQUMsUUFBUSxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDbEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsb0JBQW9CLENBQUMsT0FBTyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDaEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsb0JBQW9CLENBQUMsTUFBTSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDOUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsb0JBQW9CLENBQUMsS0FBSyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFFNUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsb0JBQW9CLENBQUMsS0FBSyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDN0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsb0JBQW9CLENBQUMsT0FBTyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDL0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsb0JBQW9CLENBQUMsTUFBTSxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDL0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsb0JBQW9CLENBQUMsS0FBSyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDN0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDM0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsb0JBQW9CLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDekQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsb0JBQW9CLENBQUMsVUFBVSxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDcEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsb0JBQW9CLENBQUMsU0FBUyxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDcEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsb0JBQW9CLENBQUMsUUFBUSxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDbEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsb0JBQW9CLENBQUMsT0FBTyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDaEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsb0JBQW9CLENBQUMsTUFBTSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFOUQsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQ2pCLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLHdCQUF3QixFQUFFLEdBQUcsRUFBRTtRQUNuQyxNQUFNLEtBQUssR0FBRyxlQUFlLENBQUMsRUFBRSxDQUFDLENBQUM7UUFFbEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsb0JBQW9CLENBQUMsS0FBSyxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDL0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsb0JBQW9CLENBQUMsT0FBTyxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDakUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsb0JBQW9CLENBQUMsTUFBTSxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDL0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsb0JBQW9CLENBQUMsS0FBSyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDN0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDM0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsb0JBQW9CLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDekQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsb0JBQW9CLENBQUMsVUFBVSxDQUFDLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFDeEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsb0JBQW9CLENBQUMsU0FBUyxDQUFDLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDdEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsb0JBQW9CLENBQUMsUUFBUSxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDcEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsb0JBQW9CLENBQUMsT0FBTyxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDbEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsb0JBQW9CLENBQUMsTUFBTSxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFFaEUsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQ2pCLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLGlDQUFpQyxFQUFFLEdBQUcsRUFBRTtRQUM1QyxNQUFNLEtBQUssR0FBRyxlQUFlLENBQUM7WUFDN0IsS0FBSztZQUNMLE1BQU07WUFDTixPQUFPO1lBQ1AsT0FBTztZQUNQLFNBQVM7WUFDVCxHQUFHO1lBQ0gsSUFBSTtZQUNKLElBQUk7WUFDSixNQUFNO1lBQ04sU0FBUztZQUNULEVBQUU7WUFDRixFQUFFO1NBQ0YsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUVkLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLCtCQUErQixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUNyRSxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQywrQkFBK0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDckUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsK0JBQStCLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ3JFLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLCtCQUErQixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUNyRSxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQywrQkFBK0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDckUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsK0JBQStCLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ3JFLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLCtCQUErQixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUNyRSxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQywrQkFBK0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDckUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsK0JBQStCLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ3JFLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLCtCQUErQixDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUN2RSxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQywrQkFBK0IsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDdkUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsK0JBQStCLENBQUMsRUFB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