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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoianNvbkZvcm1hdHRlci50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvdGVzdC9jb21tb24vanNvbkZvcm1hdHRlci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEtBQUssU0FBUyxNQUFNLCtCQUErQixDQUFDO0FBQzNELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLFlBQVksQ0FBQztBQUVyRSxLQUFLLENBQUMsa0JBQWtCLEVBQUUsR0FBRyxFQUFFO0lBRTlCLHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsU0FBUyxNQUFNLENBQUMsT0FBZSxFQUFFLFFBQWdCLEVBQUUsWUFBWSxHQUFHLElBQUk7UUFDckUsSUFBSSxLQUFLLEdBQWdDLFNBQVMsQ0FBQztRQUNuRCxNQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3hDLE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDMUMsSUFBSSxVQUFVLEtBQUssQ0FBQyxDQUFDLElBQUksUUFBUSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDMUMsT0FBTyxHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLFVBQVUsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUMsVUFBVSxHQUFHLENBQUMsRUFBRSxRQUFRLENBQUMsR0FBRyxPQUFPLENBQUMsU0FBUyxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUMzSCxLQUFLLEdBQUcsRUFBRSxNQUFNLEVBQUUsVUFBVSxFQUFFLE1BQU0sRUFBRSxRQUFRLEdBQUcsVUFBVSxFQUFFLENBQUM7UUFDL0Qs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