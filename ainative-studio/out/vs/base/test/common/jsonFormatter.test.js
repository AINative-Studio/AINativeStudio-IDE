/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import * as Formatter from '../../common/jsonFormatter.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from './utils.js';
suite('JSON - formatter', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    function format(content, expected, insertSpaces = true) {
        let range = undefined;
        const rangeStart = content.indexOf('|');
        const rangeEnd = content.lastIndexOf('|');
        if (rangeStart !== -1 && rangeEnd !== -1) {
            content = content.substring(0, rangeStart) + content.substring(rangeStart + 1, rangeEnd) + content.substring(rangeEnd + 1);
            range = { offset: rangeStart, length: rangeEnd - rangeStart };
        }
        const edits = Formatter.format(content, range, { tabSize: 2, insertSpaces: insertSpaces, eol: '\n' });
        let lastEditOffset = content.length;
        for (let i = edits.length - 1; i >= 0; i--) {
            const edit = edits[i];
            assert(edit.offset >= 0 && edit.length >= 0 && edit.offset + edit.length <= content.length);
            assert(typeof edit.content === 'string');
            assert(lastEditOffset >= edit.offset + edit.length); // make sure all edits are ordered
            lastEditOffset = edit.offset;
            content = content.substring(0, edit.offset) + edit.content + content.substring(edit.offset + edit.length);
        }
        assert.strictEqual(content, expected);
    }
    test('object - single property', () => {
        const content = [
            '{"x" : 1}'
        ].join('\n');
        const expected = [
            '{',
            '  "x": 1',
            '}'
        ].join('\n');
        format(content, expected);
    });
    test('object - multiple properties', () => {
        const content = [
            '{"x" : 1,  "y" : "foo", "z"  : true}'
        ].join('\n');
        const expected = [
            '{',
            '  "x": 1,',
            '  "y": "foo",',
            '  "z": true',
            '}'
        ].join('\n');
        format(content, expected);
    });
    test('object - no properties ', () => {
        const content = [
            '{"x" : {    },  "y" : {}}'
        ].join('\n');
        const expected = [
            '{',
            '  "x": {},',
            '  "y": {}',
            '}'
        ].join('\n');
        format(content, expected);
    });
    test('object - nesting', () => {
        const content = [
            '{"x" : {  "y" : { "z"  : { }}, "a": true}}'
        ].join('\n');
        const expected = [
            '{',
            '  "x": {',
            '    "y": {',
            '      "z": {}',
            '    },',
            '    "a": true',
            '  }',
            '}'
        ].join('\n');
        format(content, expected);
    });
    test('array - single items', () => {
        const content = [
            '["[]"]'
        ].join('\n');
        const expected = [
            '[',
            '  "[]"',
            ']'
        ].join('\n');
        format(content, expected);
    });
    test('array - multiple items', () => {
        const content = [
            '[true,null,1.2]'
        ].join('\n');
        const expected = [
            '[',
            '  true,',
            '  null,',
            '  1.2',
            ']'
        ].join('\n');
        format(content, expected);
    });
    test('array - no items', () => {
        const content = [
            '[      ]'
        ].join('\n');
        const expected = [
            '[]'
        ].join('\n');
        format(content, expected);
    });
    test('array - nesting', () => {
        const content = [
            '[ [], [ [ {} ], "a" ]  ]'
        ].join('\n');
        const expected = [
            '[',
            '  [],',
            '  [',
            '    [',
            '      {}',
            '    ],',
            '    "a"',
            '  ]',
            ']',
        ].join('\n');
        format(content, expected);
    });
    test('syntax errors', () => {
        const content = [
            '[ null 1.2 ]'
        ].join('\n');
        const expected = [
            '[',
            '  null 1.2',
            ']',
        ].join('\n');
        format(content, expected);
    });
    test('empty lines', () => {
        const content = [
            '{',
            '"a": true,',
            '',
            '"b": true',
            '}',
        ].join('\n');
        const expected = [
            '{',
            '\t"a": true,',
            '\t"b": true',
            '}',
        ].join('\n');
        format(content, expected, false);
    });
    test('single line comment', () => {
        const content = [
            '[ ',
            '//comment',
            '"foo", "bar"',
            '] '
        ].join('\n');
        const expected = [
            '[',
            '  //comment',
            '  "foo",',
            '  "bar"',
            ']',
        ].join('\n');
        format(content, expected);
    });
    test('block line comment', () => {
        const content = [
            '[{',
            '        /*comment*/     ',
            '"foo" : true',
            '}] '
        ].join('\n');
        const expected = [
            '[',
            '  {',
            '    /*comment*/',
            '    "foo": true',
            '  }',
            ']',
        ].join('\n');
        format(content, expected);
    });
    test('single line comment on same line', () => {
        const content = [
            ' {  ',
            '        "a": {}// comment    ',
            ' } '
        ].join('\n');
        const expected = [
            '{',
            '  "a": {} // comment    ',
            '}',
        ].join('\n');
        format(content, expected);
    });
    test('single line comment on same line 2', () => {
        const content = [
            '{ //comment',
            '}'
        ].join('\n');
        const expected = [
            '{ //comment',
            '}'
        ].join('\n');
        format(content, expected);
    });
    test('block comment on same line', () => {
        const content = [
            '{      "a": {}, /*comment*/    ',
            '        /*comment*/ "b": {},    ',
            '        "c": {/*comment*/}    } ',
        ].join('\n');
        const expected = [
            '{',
            '  "a": {}, /*comment*/',
            '  /*comment*/ "b": {},',
            '  "c": { /*comment*/}',
            '}',
        ].join('\n');
        format(content, expected);
    });
    test('block comment on same line advanced', () => {
        const content = [
            ' {       "d": [',
            '             null',
            '        ] /*comment*/',
            '        ,"e": /*comment*/ [null] }',
        ].join('\n');
        const expected = [
            '{',
            '  "d": [',
            '    null',
            '  ] /*comment*/,',
            '  "e": /*comment*/ [',
            '    null',
            '  ]',
            '}',
        ].join('\n');
        format(content, expected);
    });
    test('multiple block comments on same line', () => {
        const content = [
            '{      "a": {} /*comment*/, /*comment*/   ',
            '        /*comment*/ "b": {}  /*comment*/  } '
        ].join('\n');
        const expected = [
            '{',
            '  "a": {} /*comment*/, /*comment*/',
            '  /*comment*/ "b": {} /*comment*/',
            '}',
        ].join('\n');
        format(content, expected);
    });
    test('multiple mixed comments on same line', () => {
        const content = [
            '[ /*comment*/  /*comment*/   // comment ',
            ']'
        ].join('\n');
        const expected = [
            '[ /*comment*/ /*comment*/ // comment ',
            ']'
        ].join('\n');
        format(content, expected);
    });
    test('range', () => {
        const content = [
            '{ "a": {},',
            '|"b": [null, null]|',
            '} '
        ].join('\n');
        const expected = [
            '{ "a": {},',
            '"b": [',
            '  null,',
            '  null',
            ']',
            '} ',
        ].join('\n');
        format(content, expected);
    });
    test('range with existing indent', () => {
        const content = [
            '{ "a": {},',
            '   |"b": [null],',
            '"c": {}',
            '}|'
        ].join('\n');
        const expected = [
            '{ "a": {},',
            '   "b": [',
            '    null',
            '  ],',
            '  "c": {}',
            '}',
        ].join('\n');
        format(content, expected);
    });
    test('range with existing indent - tabs', () => {
        const content = [
            '{ "a": {},',
            '|  "b": [null],   ',
            '"c": {}',
            '} |    '
        ].join('\n');
        const expected = [
            '{ "a": {},',
            '\t"b": [',
            '\t\tnull',
            '\t],',
            '\t"c": {}',
            '}',
        ].join('\n');
        format(content, expected, false);
    });
    test('block comment none-line breaking symbols', () => {
        const content = [
            '{ "a": [ 1',
            '/* comment */',
            ', 2',
            '/* comment */',
            ']',
            '/* comment */',
            ',',
            ' "b": true',
            '/* comment */',
            '}'
        ].join('\n');
        const expected = [
            '{',
            '  "a": [',
            '    1',
            '    /* comment */',
            '    ,',
            '    2',
            '    /* comment */',
            '  ]',
            '  /* comment */',
            '  ,',
            '  "b": true',
            '  /* comment */',
            '}',
        ].join('\n');
        format(content, expected);
    });
    test('line comment after none-line breaking symbols', () => {
        const content = [
            '{ "a":',
            '// comment',
            'null,',
            ' "b"',
            '// comment',
            ': null',
            '// comment',
            '}'
        ].join('\n');
        const expected = [
            '{',
            '  "a":',
            '  // comment',
            '  null,',
            '  "b"',
            '  // comment',
            '  : null',
            '  // comment',
            '}',
        ].join('\n');
        format(content, expected);
    });
    test('toFormattedString', () => {
        const obj = {
            a: { b: 1, d: ['hello'] }
        };
        const getExpected = (tab, eol) => {
            return [
                `{`,
                `${tab}"a": {`,
                `${tab}${tab}"b": 1,`,
                `${tab}${tab}"d": [`,
                `${tab}${tab}${tab}"hello"`,
                `${tab}${tab}]`,
                `${tab}}`,
                '}'
            ].join(eol);
        };
        let actual = Formatter.toFormattedString(obj, { insertSpaces: true, tabSize: 2, eol: '\n' });
        assert.strictEqual(actual, getExpected('  ', '\n'));
        actual = Formatter.toFormattedString(obj, { insertSpaces: true, tabSize: 2, eol: '\r\n' });
        assert.strictEqual(actual, getExpected('  ', '\r\n'));
        actual = Formatter.toFormattedString(obj, { insertSpaces: false, eol: '\r\n' });
        assert.strictEqual(actual, getExpected('\t', '\r\n'));
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoianNvbkZvcm1hdHRlci50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3Rlc3QvY29tbW9uL2pzb25Gb3JtYXR0ZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxLQUFLLFNBQVMsTUFBTSwrQkFBK0IsQ0FBQztBQUMzRCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSxZQUFZLENBQUM7QUFFckUsS0FBSyxDQUFDLGtCQUFrQixFQUFFLEdBQUcsRUFBRTtJQUU5Qix1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLFNBQVMsTUFBTSxDQUFDLE9BQWUsRUFBRSxRQUFnQixFQUFFLFlBQVksR0FBRyxJQUFJO1FBQ3JFLElBQUksS0FBSyxHQUFnQyxTQUFTLENBQUM7UUFDbkQsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUN4QyxNQUFNLFFBQVEsR0FBRyxPQUFPLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQzFDLElBQUksVUFBVSxLQUFLLENBQUMsQ0FBQyxJQUFJLFFBQVEsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQzFDLE9BQU8sR0FBRyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxVQUFVLENBQUMsR0FBRyxPQUFPLENBQUMsU0FBUyxDQUFDLFVBQVUsR0FBRyxDQUFDLEVBQUUsUUFBUSxDQUFDLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDM0gsS0FBSyxHQUFHLEVBQUUsTUFBTSxFQUFFLFVBQVUsRUFBRSxNQUFNLEVBQUUsUUFBUSxHQUFHLFVBQVUsRUFBRSxDQUFDO1FB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