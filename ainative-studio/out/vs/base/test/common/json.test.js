/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { createScanner, parse, parseTree } from '../../common/json.js';
import { getParseErrorMessage } from '../../common/jsonErrorMessages.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from './utils.js';
function assertKinds(text, ...kinds) {
    const scanner = createScanner(text);
    let kind;
    while ((kind = scanner.scan()) !== 17 /* SyntaxKind.EOF */) {
        assert.strictEqual(kind, kinds.shift());
    }
    assert.strictEqual(kinds.length, 0);
}
function assertScanError(text, expectedKind, scanError) {
    const scanner = createScanner(text);
    scanner.scan();
    assert.strictEqual(scanner.getToken(), expectedKind);
    assert.strictEqual(scanner.getTokenError(), scanError);
}
function assertValidParse(input, expected, options) {
    const errors = [];
    const actual = parse(input, errors, options);
    if (errors.length !== 0) {
        assert(false, getParseErrorMessage(errors[0].error));
    }
    assert.deepStrictEqual(actual, expected);
}
function assertInvalidParse(input, expected, options) {
    const errors = [];
    const actual = parse(input, errors, options);
    assert(errors.length > 0);
    assert.deepStrictEqual(actual, expected);
}
function assertTree(input, expected, expectedErrors = [], options) {
    const errors = [];
    const actual = parseTree(input, errors, options);
    assert.deepStrictEqual(errors.map(e => e.error, expected), expectedErrors);
    const checkParent = (node) => {
        if (node.children) {
            for (const child of node.children) {
                assert.strictEqual(node, child.parent);
                delete child.parent; // delete to avoid recursion in deep equal
                checkParent(child);
            }
        }
    };
    checkParent(actual);
    assert.deepStrictEqual(actual, expected);
}
suite('JSON', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('tokens', () => {
        assertKinds('{', 1 /* SyntaxKind.OpenBraceToken */);
        assertKinds('}', 2 /* SyntaxKind.CloseBraceToken */);
        assertKinds('[', 3 /* SyntaxKind.OpenBracketToken */);
        assertKinds(']', 4 /* SyntaxKind.CloseBracketToken */);
        assertKinds(':', 6 /* SyntaxKind.ColonToken */);
        assertKinds(',', 5 /* SyntaxKind.CommaToken */);
    });
    test('comments', () => {
        assertKinds('// this is a comment', 12 /* SyntaxKind.LineCommentTrivia */);
        assertKinds('// this is a comment\n', 12 /* SyntaxKind.LineCommentTrivia */, 14 /* SyntaxKind.LineBreakTrivia */);
        assertKinds('/* this is a comment*/', 13 /* SyntaxKind.BlockCommentTrivia */);
        assertKinds('/* this is a \r\ncomment*/', 13 /* SyntaxKind.BlockCommentTrivia */);
        assertKinds('/* this is a \ncomment*/', 13 /* SyntaxKind.BlockCommentTrivia */);
        // unexpected end
        assertKinds('/* this is a', 13 /* SyntaxKind.BlockCommentTrivia */);
        assertKinds('/* this is a \ncomment', 13 /* SyntaxKind.BlockCommentTrivia */);
        // broken comment
        assertKinds('/ ttt', 16 /* SyntaxKind.Unknown */, 15 /* SyntaxKind.Trivia */, 16 /* SyntaxKind.Unknown */);
    });
    test('strings', () => {
        assertKinds('"test"', 10 /* SyntaxKind.StringLiteral */);
        assertKinds('"\\""', 10 /* SyntaxKind.StringLiteral */);
        assertKinds('"\\/"', 10 /* SyntaxKind.StringLiteral */);
        assertKinds('"\\b"', 10 /* SyntaxKind.StringLiteral */);
        assertKinds('"\\f"', 10 /* SyntaxKind.StringLiteral */);
        assertKinds('"\\n"', 10 /* SyntaxKind.StringLiteral */);
        assertKinds('"\\r"', 10 /* SyntaxKind.StringLiteral */);
        assertKinds('"\\t"', 10 /* SyntaxKind.StringLiteral */);
        assertKinds('"\\v"', 10 /* SyntaxKind.StringLiteral */);
        assertKinds('"\u88ff"', 10 /* SyntaxKind.StringLiteral */);
        assertKinds('"​\u2028"', 10 /* SyntaxKind.StringLiteral */);
        // unexpected end
        assertKinds('"test', 10 /* SyntaxKind.StringLiteral */);
        assertKinds('"test\n"', 10 /* SyntaxKind.StringLiteral */, 14 /* SyntaxKind.LineBreakTrivia */, 10 /* SyntaxKind.StringLiteral */);
        // invalid characters
        assertScanError('"\t"', 10 /* SyntaxKind.StringLiteral */, 6 /* ScanError.InvalidCharacter */);
        assertScanError('"\t "', 10 /* SyntaxKind.StringLiteral */, 6 /* ScanError.InvalidCharacter */);
    });
    test('numbers', () => {
        assertKinds('0', 11 /* SyntaxKind.NumericLiteral */);
        assertKinds('0.1', 11 /* SyntaxKind.NumericLiteral */);
        assertKinds('-0.1', 11 /* SyntaxKind.NumericLiteral */);
        assertKinds('-1', 11 /* SyntaxKind.NumericLiteral */);
        assertKinds('1', 11 /* SyntaxKind.NumericLiteral */);
        assertKinds('123456789', 11 /* SyntaxKind.NumericLiteral */);
        assertKinds('10', 11 /* SyntaxKind.NumericLiteral */);
        assertKinds('90', 11 /* SyntaxKind.NumericLiteral */);
        assertKinds('90E+123', 11 /* SyntaxKind.NumericLiteral */);
        assertKinds('90e+123', 11 /* SyntaxKind.NumericLiteral */);
        assertKinds('90e-123', 11 /* SyntaxKind.NumericLiteral */);
        assertKinds('90E-123', 11 /* SyntaxKind.NumericLiteral */);
        assertKinds('90E123', 11 /* SyntaxKind.NumericLiteral */);
        assertKinds('90e123', 11 /* SyntaxKind.NumericLiteral */);
        // zero handling
        assertKinds('01', 11 /* SyntaxKind.NumericLiteral */, 11 /* SyntaxKind.NumericLiteral */);
        assertKinds('-01', 11 /* SyntaxKind.NumericLiteral */, 11 /* SyntaxKind.NumericLiteral */);
        // unexpected end
        assertKinds('-', 16 /* SyntaxKind.Unknown */);
        assertKinds('.0', 16 /* SyntaxKind.Unknown */);
    });
    test('keywords: true, false, null', () => {
        assertKinds('true', 8 /* SyntaxKind.TrueKeyword */);
        assertKinds('false', 9 /* SyntaxKind.FalseKeyword */);
        assertKinds('null', 7 /* SyntaxKind.NullKeyword */);
        assertKinds('true false null', 8 /* SyntaxKind.TrueKeyword */, 15 /* SyntaxKind.Trivia */, 9 /* SyntaxKind.FalseKeyword */, 15 /* SyntaxKind.Trivia */, 7 /* SyntaxKind.NullKeyword */);
        // invalid words
        assertKinds('nulllll', 16 /* SyntaxKind.Unknown */);
        assertKinds('True', 16 /* SyntaxKind.Unknown */);
        assertKinds('foo-bar', 16 /* SyntaxKind.Unknown */);
        assertKinds('foo bar', 16 /* SyntaxKind.Unknown */, 15 /* SyntaxKind.Trivia */, 16 /* SyntaxKind.Unknown */);
    });
    test('trivia', () => {
        assertKinds(' ', 15 /* SyntaxKind.Trivia */);
        assertKinds('  \t  ', 15 /* SyntaxKind.Trivia */);
        assertKinds('  \t  \n  \t  ', 15 /* SyntaxKind.Trivia */, 14 /* SyntaxKind.LineBreakTrivia */, 15 /* SyntaxKind.Trivia */);
        assertKinds('\r\n', 14 /* SyntaxKind.LineBreakTrivia */);
        assertKinds('\r', 14 /* SyntaxKind.LineBreakTrivia */);
        assertKinds('\n', 14 /* SyntaxKind.LineBreakTrivia */);
        assertKinds('\n\r', 14 /* SyntaxKind.LineBreakTrivia */, 14 /* SyntaxKind.LineBreakTrivia */);
        assertKinds('\n   \n', 14 /* SyntaxKind.LineBreakTrivia */, 15 /* SyntaxKind.Trivia */, 14 /* SyntaxKind.LineBreakTrivia */);
    });
    test('parse: literals', () => {
        assertValidParse('true', true);
        assertValidParse('false', false);
        assertValidParse('null', null);
        assertValidParse('"foo"', 'foo');
        assertValidParse('"\\"-\\\\-\\/-\\b-\\f-\\n-\\r-\\t"', '"-\\-/-\b-\f-\n-\r-\t');
        assertValidParse('"\\u00DC"', 'Ü');
        assertValidParse('9', 9);
        assertValidParse('-9', -9);
        assertValidParse('0.129', 0.129);
        assertValidParse('23e3', 23e3);
        assertValidParse('1.2E+3', 1.2E+3);
        assertValidParse('1.2E-3', 1.2E-3);
        assertValidParse('1.2E-3 // comment', 1.2E-3);
    });
    test('parse: objects', () => {
        assertValidParse('{}', {});
        assertValidParse('{ "foo": true }', { foo: true });
        assertValidParse('{ "bar": 8, "xoo": "foo" }', { bar: 8, xoo: 'foo' });
        assertValidParse('{ "hello": [], "world": {} }', { hello: [], world: {} });
        assertValidParse('{ "a": false, "b": true, "c": [ 7.4 ] }', { a: false, b: true, c: [7.4] });
        assertValidParse('{ "lineComment": "//", "blockComment": ["/*", "*/"], "brackets": [ ["{", "}"], ["[", "]"], ["(", ")"] ] }', { lineComment: '//', blockComment: ['/*', '*/'], brackets: [['{', '}'], ['[', ']'], ['(', ')']] });
        assertValidParse('{ "hello": [], "world": {} }', { hello: [], world: {} });
        assertValidParse('{ "hello": { "again": { "inside": 5 }, "world": 1 }}', { hello: { again: { inside: 5 }, world: 1 } });
        assertValidParse('{ "foo": /*hello*/true }', { foo: true });
    });
    test('parse: arrays', () => {
        assertValidParse('[]', []);
        assertValidParse('[ [],  [ [] ]]', [[], [[]]]);
        assertValidParse('[ 1, 2, 3 ]', [1, 2, 3]);
        assertValidParse('[ { "a": null } ]', [{ a: null }]);
    });
    test('parse: objects with errors', () => {
        assertInvalidParse('{,}', {});
        assertInvalidParse('{ "foo": true, }', { foo: true }, { allowTrailingComma: false });
        assertInvalidParse('{ "bar": 8 "xoo": "foo" }', { bar: 8, xoo: 'foo' });
        assertInvalidParse('{ ,"bar": 8 }', { bar: 8 });
        assertInvalidParse('{ ,"bar": 8, "foo" }', { bar: 8 });
        assertInvalidParse('{ "bar": 8, "foo": }', { bar: 8 });
        assertInvalidParse('{ 8, "foo": 9 }', { foo: 9 });
    });
    test('parse: array with errors', () => {
        assertInvalidParse('[,]', []);
        assertInvalidParse('[ 1, 2, ]', [1, 2], { allowTrailingComma: false });
        assertInvalidParse('[ 1 2, 3 ]', [1, 2, 3]);
        assertInvalidParse('[ ,1, 2, 3 ]', [1, 2, 3]);
        assertInvalidParse('[ ,1, 2, 3, ]', [1, 2, 3], { allowTrailingComma: false });
    });
    test('parse: disallow commments', () => {
        const options = { disallowComments: true };
        assertValidParse('[ 1, 2, null, "foo" ]', [1, 2, null, 'foo'], options);
        assertValidParse('{ "hello": [], "world": {} }', { hello: [], world: {} }, options);
        assertInvalidParse('{ "foo": /*comment*/ true }', { foo: true }, options);
    });
    test('parse: trailing comma', () => {
        // default is allow
        assertValidParse('{ "hello": [], }', { hello: [] });
        let options = { allowTrailingComma: true };
        assertValidParse('{ "hello": [], }', { hello: [] }, options);
        assertValidParse('{ "hello": [] }', { hello: [] }, options);
        assertValidParse('{ "hello": [], "world": {}, }', { hello: [], world: {} }, options);
        assertValidParse('{ "hello": [], "world": {} }', { hello: [], world: {} }, options);
        assertValidParse('{ "hello": [1,] }', { hello: [1] }, options);
        options = { allowTrailingComma: false };
        assertInvalidParse('{ "hello": [], }', { hello: [] }, options);
        assertInvalidParse('{ "hello": [], "world": {}, }', { hello: [], world: {} }, options);
    });
    test('tree: literals', () => {
        assertTree('true', { type: 'boolean', offset: 0, length: 4, value: true });
        assertTree('false', { type: 'boolean', offset: 0, length: 5, value: false });
        assertTree('null', { type: 'null', offset: 0, length: 4, value: null });
        assertTree('23', { type: 'number', offset: 0, length: 2, value: 23 });
        assertTree('-1.93e-19', { type: 'number', offset: 0, length: 9, value: -1.93e-19 });
        assertTree('"hello"', { type: 'string', offset: 0, length: 7, value: 'hello' });
    });
    test('tree: arrays', () => {
        assertTree('[]', { type: 'array', offset: 0, length: 2, children: [] });
        assertTree('[ 1 ]', { type: 'array', offset: 0, length: 5, children: [{ type: 'number', offset: 2, length: 1, value: 1 }] });
        assertTree('[ 1,"x"]', {
            type: 'array', offset: 0, length: 8, children: [
                { type: 'number', offset: 2, length: 1, value: 1 },
                { type: 'string', offset: 4, length: 3, value: 'x' }
            ]
        });
        assertTree('[[]]', {
            type: 'array', offset: 0, length: 4, children: [
                { type: 'array', offset: 1, length: 2, children: [] }
            ]
        });
    });
    test('tree: objects', () => {
        assertTree('{ }', { type: 'object', offset: 0, length: 3, children: [] });
        assertTree('{ "val": 1 }', {
            type: 'object', offset: 0, length: 12, children: [
                {
                    type: 'property', offset: 2, length: 8, colonOffset: 7, children: [
                        { type: 'string', offset: 2, length: 5, value: 'val' },
                        { type: 'number', offset: 9, length: 1, value: 1 }
                    ]
                }
            ]
        });
        assertTree('{"id": "$", "v": [ null, null] }', {
            type: 'object', offset: 0, length: 32, children: [
                {
                    type: 'property', offset: 1, length: 9, colonOffset: 5, children: [
                        { type: 'string', offset: 1, length: 4, value: 'id' },
                        { type: 'string', offset: 7, length: 3, value: '$' }
                    ]
                },
                {
                    type: 'property', offset: 12, length: 18, colonOffset: 15, children: [
                        { type: 'string', offset: 12, length: 3, value: 'v' },
                        {
                            type: 'array', offset: 17, length: 13, children: [
                                { type: 'null', offset: 19, length: 4, value: null },
                                { type: 'null', offset: 25, length: 4, value: null }
                            ]
                        }
                    ]
                }
            ]
        });
        assertTree('{  "id": { "foo": { } } , }', {
            type: 'object', offset: 0, length: 27, children: [
                {
                    type: 'property', offset: 3, length: 20, colonOffset: 7, children: [
                        { type: 'string', offset: 3, length: 4, value: 'id' },
                        {
                            type: 'object', offset: 9, length: 14, children: [
                                {
                                    type: 'property', offset: 11, length: 10, colonOffset: 16, children: [
                                        { type: 'string', offset: 11, length: 5, value: 'foo' },
                                        { type: 'object', offset: 18, length: 3, children: [] }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ]
        }, [3 /* ParseErrorCode.PropertyNameExpected */, 4 /* ParseErrorCode.ValueExpected */], { allowTrailingComma: false });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoianNvbi50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS90ZXN0L2NvbW1vbi9qc29uLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxhQUFhLEVBQVEsS0FBSyxFQUE0QyxTQUFTLEVBQXlCLE1BQU0sc0JBQXNCLENBQUM7QUFDOUksT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDekUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sWUFBWSxDQUFDO0FBRXJFLFNBQVMsV0FBVyxDQUFDLElBQVksRUFBRSxHQUFHLEtBQW1CO0lBQ3hELE1BQU0sT0FBTyxHQUFHLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNwQyxJQUFJLElBQWdCLENBQUM7SUFDckIsT0FBTyxDQUFDLElBQUksR0FBRyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUMsNEJBQW1CLEVBQUUsQ0FBQztRQUNuRCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQztJQUN6QyxDQUFDO0lBQ0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQ3JDLENBQUM7QUFDRCxTQUFTLGVBQWUsQ0FBQyxJQUFZLEVBQUUsWUFBd0IsRUFBRSxTQUFvQjtJQUNwRixNQUFNLE9BQU8sR0FBRyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDcEMsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDO0lBQ2YsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLEVBQUUsWUFBWSxDQUFDLENBQUM7SUFD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LEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxRQUFRLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUM3SCxVQUFVLENBQUMsVUFBVSxFQUFFO1lBQ3RCLElBQUksRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLFFBQVEsRUFBRTtnQkFDOUMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFO2dCQUNsRCxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUU7YUFDcEQ7U0FDRCxDQUFDLENBQUM7UUFDSCxVQUFVLENBQUMsTUFBTSxFQUFFO1lBQ2xCLElBQUksRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLFFBQVEsRUFBRTtnQkFDOUMsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUFFO2FBQ3JEO1NBQ0QsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsZUFBZSxFQUFFLEdBQUcsRUFBRTtRQUMxQixVQUFVLENBQUMsS0FBSyxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDMUUsVUFBVSxDQUFDLGNBQWMsRUFBRTtZ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