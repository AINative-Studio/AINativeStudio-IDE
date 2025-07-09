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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoianNvbi50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvdGVzdC9jb21tb24vanNvbi50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsYUFBYSxFQUFRLEtBQUssRUFBNEMsU0FBUyxFQUF5QixNQUFNLHNCQUFzQixDQUFDO0FBQzlJLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLFlBQVksQ0FBQztBQUVyRSxTQUFTLFdBQVcsQ0FBQyxJQUFZLEVBQUUsR0FBRyxLQUFtQjtJQUN4RCxNQUFNLE9BQU8sR0FBRyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDcEMsSUFBSSxJQUFnQixDQUFDO0lBQ3JCLE9BQU8sQ0FBQyxJQUFJLEdBQUcsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDLDRCQUFtQixFQUFFLENBQUM7UUFDbkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUM7SUFDekMsQ0FBQztJQUNELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztBQUNyQyxDQUFDO0FBQ0QsU0FBUyxlQUFlLENBQUMsSUFBWSxFQUFFLFlBQXdCLEVBQUUsU0FBb0I7SUFDcEYsTUFBTSxPQUFPLEdBQUcsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3BDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUNmLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxFQUFFLFlBQVksQ0FBQyxDQUFDO0lB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QUFTLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQzNFLFVBQVUsQ0FBQyxPQUFPLEVBQUUsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztRQUM3RSxVQUFVLENBQUMsTUFBTSxFQUFFLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7UUFDeEUsVUFBVSxDQUFDLElBQUksRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ3RFLFVBQVUsQ0FBQyxXQUFXLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO1FBQ3BGLFVBQVUsQ0FBQyxTQUFTLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQztJQUNqRixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxjQUFjLEVBQUUsR0FBRyxFQUFFO1FBQ3pCLFVBQVUsQ0FBQyxJQUFJLEVBQUUsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUN4RSxVQUFVLENBQUMsT0FBTyxFQUFFLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsUUFBUSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDN0gsVUFBVSxDQUFDLFVBQVUsRUFBRTtZQUN0QixJQUFJLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxRQUFRLEVBQUU7Z0JBQzlDLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRTtnQkFDbEQsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFO2FBQ3BEO1NBQ0QsQ0FBQyxDQUFDO1FBQ0gsVUFBVSxDQUFDLE1BQU0sRUFBRTtZQUNsQixJQUFJLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxRQUFRLEVBQUU7Z0JBQzlDLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRTthQUNyRDtTQUNELENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLGVBQWUsRUFBRSxHQUFHLEVBQUU7UUFDMUIsVUFBVSxDQUFDLEtBQUssRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLFFBQVEsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQzFFLFVBQVUsQ0FBQyxjQUFjLEVBQUU7WUFDMUIsSUFBSSxFQUFFLFFBQVEsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxFQUFFLEVBQUUsUUFBUSxFQUFFO2dCQUNoRDtvQkFDQyxJQUFJLEVBQUUsVUFBVSxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxXQUFXLEVBQUUsQ0FBQyxFQUFFLFFBQVEsRUFBRTt3QkFDakUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFO3dCQUN0RCxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUU7cUJBQ2xEO2lCQUNEO2FBQ0Q7U0FDRCxDQUFDLENBQUM7UUFDSCxVQUFVLENBQUMsa0NBQWtDLEVBQzVDO1lBQ0MsSUFBSSxFQUFFLFFBQVEsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxFQUFFLEVBQUUsUUFBUSxFQUFFO2dCQUNoRDtvQkFDQyxJQUFJLEVBQUUsVUFBVSxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxXQUFXLEVBQUUsQ0FBQyxFQUFFLFFBQVEsRUFBRTt3QkFDakUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFO3dCQUNyRCxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUU7cUJBQ3BEO2lCQUNEO2dCQUNEO29CQUNDLElBQUksRUFBRSxVQUFVLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFFLFdBQVcsRUFBRSxFQUFFLEVBQUUsUUFBUSxFQUFFO3dCQUNwRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUU7d0JBQ3JEOzRCQUNDLElBQUksRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFFLFFBQVEsRUFBRTtnQ0FDaEQsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFO2dDQUNwRCxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUU7NkJBQ3BEO3lCQUNEO3FCQUNEO2lCQUNEO2FBQ0Q7U0FDRCxDQUNELENBQUM7UUFDRixVQUFVLENBQUMsNkJBQTZCLEVBQ3ZDO1lBQ0MsSUFBSSxFQUFFLFFBQVEsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxFQUFFLEVBQUUsUUFBUSxFQUFFO2dCQUNoRDtvQkFDQyxJQUFJLEVBQUUsVUFBVSxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRSxXQUFXLEVBQUUsQ0FBQyxFQUFFLFFBQVEsRUFBRTt3QkFDbEUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFO3dCQUNyRDs0QkFDQyxJQUFJLEVBQUUsUUFBUSxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRSxRQUFRLEVBQUU7Z0NBQ2hEO29DQUNDLElBQUksRUFBRSxVQUFVLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFFLFdBQVcsRUFBRSxFQUFFLEVBQUUsUUFBUSxFQUFFO3dDQUNwRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUU7d0NBQ3ZELEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRTtxQ0FDdkQ7aUNBQ0Q7NkJBQ0Q7eUJBQ0Q7cUJBQ0Q7aUJBQ0Q7YUFDRDtTQUNELEVBQ0MsbUZBQW1FLEVBQUUsRUFBRSxrQkFBa0IsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO0lBQ3hHLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMifQ==