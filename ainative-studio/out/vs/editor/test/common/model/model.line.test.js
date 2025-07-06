/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { Range } from '../../../common/core/range.js';
import { EncodedTokenizationResult, TokenizationRegistry } from '../../../common/languages.js';
import { computeIndentLevel } from '../../../common/model/utils.js';
import { ContiguousMultilineTokensBuilder } from '../../../common/tokens/contiguousMultilineTokensBuilder.js';
import { LineTokens } from '../../../common/tokens/lineTokens.js';
import { TestLineTokenFactory } from '../core/testLineToken.js';
import { createTextModel } from '../testTextModel.js';
function assertLineTokens(__actual, _expected) {
    const tmp = TestToken.toTokens(_expected);
    LineTokens.convertToEndOffset(tmp, __actual.getLineContent().length);
    const expected = TestLineTokenFactory.inflateArr(tmp);
    const _actual = __actual.inflate();
    const actual = [];
    for (let i = 0, len = _actual.getCount(); i < len; i++) {
        actual[i] = {
            endIndex: _actual.getEndOffset(i),
            type: _actual.getClassName(i)
        };
    }
    const decode = (token) => {
        return {
            endIndex: token.endIndex,
            type: token.getType()
        };
    };
    assert.deepStrictEqual(actual, expected.map(decode));
}
suite('ModelLine - getIndentLevel', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    function assertIndentLevel(text, expected, tabSize = 4) {
        const actual = computeIndentLevel(text, tabSize);
        assert.strictEqual(actual, expected, text);
    }
    test('getIndentLevel', () => {
        assertIndentLevel('', -1);
        assertIndentLevel(' ', -1);
        assertIndentLevel('   \t', -1);
        assertIndentLevel('Hello', 0);
        assertIndentLevel(' Hello', 1);
        assertIndentLevel('   Hello', 3);
        assertIndentLevel('\tHello', 4);
        assertIndentLevel(' \tHello', 4);
        assertIndentLevel('  \tHello', 4);
        assertIndentLevel('   \tHello', 4);
        assertIndentLevel('    \tHello', 8);
        assertIndentLevel('     \tHello', 8);
        assertIndentLevel('\t Hello', 5);
        assertIndentLevel('\t \tHello', 8);
    });
});
class TestToken {
    constructor(startOffset, color) {
        this.startOffset = startOffset;
        this.color = color;
    }
    static toTokens(tokens) {
        if (tokens === null) {
            return null;
        }
        const tokensLen = tokens.length;
        const result = new Uint32Array((tokensLen << 1));
        for (let i = 0; i < tokensLen; i++) {
            const token = tokens[i];
            result[(i << 1)] = token.startOffset;
            result[(i << 1) + 1] = (token.color << 15 /* MetadataConsts.FOREGROUND_OFFSET */) >>> 0;
        }
        return result;
    }
}
class ManualTokenizationSupport {
    constructor() {
        this.tokens = new Map();
        this.stores = new Set();
    }
    setLineTokens(lineNumber, tokens) {
        const b = new ContiguousMultilineTokensBuilder();
        b.add(lineNumber, tokens);
        for (const s of this.stores) {
            s.setTokens(b.finalize());
        }
    }
    getInitialState() {
        return new LineState(1);
    }
    tokenize(line, hasEOL, state) {
        throw new Error();
    }
    tokenizeEncoded(line, hasEOL, state) {
        const s = state;
        return new EncodedTokenizationResult(this.tokens.get(s.lineNumber), new LineState(s.lineNumber + 1));
    }
    /**
     * Can be/return undefined if default background tokenization should be used.
     */
    createBackgroundTokenizer(textModel, store) {
        this.stores.add(store);
        return {
            dispose: () => {
                this.stores.delete(store);
            },
            requestTokens(startLineNumber, endLineNumberExclusive) {
            },
        };
    }
}
class LineState {
    constructor(lineNumber) {
        this.lineNumber = lineNumber;
    }
    clone() {
        return this;
    }
    equals(other) {
        return other.lineNumber === this.lineNumber;
    }
}
suite('ModelLinesTokens', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    function testApplyEdits(initial, edits, expected) {
        const initialText = initial.map(el => el.text).join('\n');
        const s = new ManualTokenizationSupport();
        const d = TokenizationRegistry.register('test', s);
        const model = createTextModel(initialText, 'test');
        model.onBeforeAttached();
        for (let lineIndex = 0; lineIndex < initial.length; lineIndex++) {
            const lineTokens = initial[lineIndex].tokens;
            const lineTextLength = model.getLineMaxColumn(lineIndex + 1) - 1;
            const tokens = TestToken.toTokens(lineTokens);
            LineTokens.convertToEndOffset(tokens, lineTextLength);
            s.setLineTokens(lineIndex + 1, tokens);
        }
        model.applyEdits(edits.map((ed) => ({
            identifier: null,
            range: ed.range,
            text: ed.text,
            forceMoveMarkers: false
        })));
        for (let lineIndex = 0; lineIndex < expected.length; lineIndex++) {
            const actualLine = model.getLineContent(lineIndex + 1);
            const actualTokens = model.tokenization.getLineTokens(lineIndex + 1);
            assert.strictEqual(actualLine, expected[lineIndex].text);
            assertLineTokens(actualTokens, expected[lineIndex].tokens);
        }
        model.dispose();
        d.dispose();
    }
    test('single delete 1', () => {
        testApplyEdits([{
                text: 'hello world',
                tokens: [new TestToken(0, 1), new TestToken(5, 2), new TestToken(6, 3)]
            }], [{ range: new Range(1, 1, 1, 2), text: '' }], [{
                text: 'ello world',
                tokens: [new TestToken(0, 1), new TestToken(4, 2), new TestToken(5, 3)]
            }]);
    });
    test('single delete 2', () => {
        testApplyEdits([{
                text: 'helloworld',
                tokens: [new TestToken(0, 1), new TestToken(5, 2)]
            }], [{ range: new Range(1, 3, 1, 8), text: '' }], [{
                text: 'herld',
                tokens: [new TestToken(0, 1), new TestToken(2, 2)]
            }]);
    });
    test('single delete 3', () => {
        testApplyEdits([{
                text: 'hello world',
                tokens: [new TestToken(0, 1), new TestToken(5, 2), new TestToken(6, 3)]
            }], [{ range: new Range(1, 1, 1, 6), text: '' }], [{
                text: ' world',
                tokens: [new TestToken(0, 2), new TestToken(1, 3)]
            }]);
    });
    test('single delete 4', () => {
        testApplyEdits([{
                text: 'hello world',
                tokens: [new TestToken(0, 1), new TestToken(5, 2), new TestToken(6, 3)]
            }], [{ range: new Range(1, 2, 1, 7), text: '' }], [{
                text: 'hworld',
                tokens: [new TestToken(0, 1), new TestToken(1, 3)]
            }]);
    });
    test('single delete 5', () => {
        testApplyEdits([{
                text: 'hello world',
                tokens: [new TestToken(0, 1), new TestToken(5, 2), new TestToken(6, 3)]
            }], [{ range: new Range(1, 1, 1, 12), text: '' }], [{
                text: '',
                tokens: [new TestToken(0, 1)]
            }]);
    });
    test('multi delete 6', () => {
        testApplyEdits([{
                text: 'hello world',
                tokens: [new TestToken(0, 1), new TestToken(5, 2), new TestToken(6, 3)]
            }, {
                text: 'hello world',
                tokens: [new TestToken(0, 4), new TestToken(5, 5), new TestToken(6, 6)]
            }, {
                text: 'hello world',
                tokens: [new TestToken(0, 7), new TestToken(5, 8), new TestToken(6, 9)]
            }], [{ range: new Range(1, 6, 3, 6), text: '' }], [{
                text: 'hello world',
                tokens: [new TestToken(0, 1), new TestToken(5, 8), new TestToken(6, 9)]
            }]);
    });
    test('multi delete 7', () => {
        testApplyEdits([{
                text: 'hello world',
                tokens: [new TestToken(0, 1), new TestToken(5, 2), new TestToken(6, 3)]
            }, {
                text: 'hello world',
                tokens: [new TestToken(0, 4), new TestToken(5, 5), new TestToken(6, 6)]
            }, {
                text: 'hello world',
                tokens: [new TestToken(0, 7), new TestToken(5, 8), new TestToken(6, 9)]
            }], [{ range: new Range(1, 12, 3, 12), text: '' }], [{
                text: 'hello world',
                tokens: [new TestToken(0, 1), new TestToken(5, 2), new TestToken(6, 3)]
            }]);
    });
    test('multi delete 8', () => {
        testApplyEdits([{
                text: 'hello world',
                tokens: [new TestToken(0, 1), new TestToken(5, 2), new TestToken(6, 3)]
            }, {
                text: 'hello world',
                tokens: [new TestToken(0, 4), new TestToken(5, 5), new TestToken(6, 6)]
            }, {
                text: 'hello world',
                tokens: [new TestToken(0, 7), new TestToken(5, 8), new TestToken(6, 9)]
            }], [{ range: new Range(1, 1, 3, 1), text: '' }], [{
                text: 'hello world',
                tokens: [new TestToken(0, 7), new TestToken(5, 8), new TestToken(6, 9)]
            }]);
    });
    test('multi delete 9', () => {
        testApplyEdits([{
                text: 'hello world',
                tokens: [new TestToken(0, 1), new TestToken(5, 2), new TestToken(6, 3)]
            }, {
                text: 'hello world',
                tokens: [new TestToken(0, 4), new TestToken(5, 5), new TestToken(6, 6)]
            }, {
                text: 'hello world',
                tokens: [new TestToken(0, 7), new TestToken(5, 8), new TestToken(6, 9)]
            }], [{ range: new Range(1, 12, 3, 1), text: '' }], [{
                text: 'hello worldhello world',
                tokens: [new TestToken(0, 1), new TestToken(5, 2), new TestToken(6, 3), new TestToken(11, 7), new TestToken(16, 8), new TestToken(17, 9)]
            }]);
    });
    test('single insert 1', () => {
        testApplyEdits([{
                text: 'hello world',
                tokens: [new TestToken(0, 1), new TestToken(5, 2), new TestToken(6, 3)]
            }], [{ range: new Range(1, 1, 1, 1), text: 'xx' }], [{
                text: 'xxhello world',
                tokens: [new TestToken(0, 1), new TestToken(7, 2), new TestToken(8, 3)]
            }]);
    });
    test('single insert 2', () => {
        testApplyEdits([{
                text: 'hello world',
                tokens: [new TestToken(0, 1), new TestToken(5, 2), new TestToken(6, 3)]
            }], [{ range: new Range(1, 2, 1, 2), text: 'xx' }], [{
                text: 'hxxello world',
                tokens: [new TestToken(0, 1), new TestToken(7, 2), new TestToken(8, 3)]
            }]);
    });
    test('single insert 3', () => {
        testApplyEdits([{
                text: 'hello world',
                tokens: [new TestToken(0, 1), new TestToken(5, 2), new TestToken(6, 3)]
            }], [{ range: new Range(1, 6, 1, 6), text: 'xx' }], [{
                text: 'helloxx world',
                tokens: [new TestToken(0, 1), new TestToken(7, 2), new TestToken(8, 3)]
            }]);
    });
    test('single insert 4', () => {
        testApplyEdits([{
                text: 'hello world',
                tokens: [new TestToken(0, 1), new TestToken(5, 2), new TestToken(6, 3)]
            }], [{ range: new Range(1, 7, 1, 7), text: 'xx' }], [{
                text: 'hello xxworld',
                tokens: [new TestToken(0, 1), new TestToken(5, 2), new TestToken(8, 3)]
            }]);
    });
    test('single insert 5', () => {
        testApplyEdits([{
                text: 'hello world',
                tokens: [new TestToken(0, 1), new TestToken(5, 2), new TestToken(6, 3)]
            }], [{ range: new Range(1, 12, 1, 12), text: 'xx' }], [{
                text: 'hello worldxx',
                tokens: [new TestToken(0, 1), new TestToken(5, 2), new TestToken(6, 3)]
            }]);
    });
    test('multi insert 6', () => {
        testApplyEdits([{
                text: 'hello world',
                tokens: [new TestToken(0, 1), new TestToken(5, 2), new TestToken(6, 3)]
            }], [{ range: new Range(1, 1, 1, 1), text: '\n' }], [{
                text: '',
                tokens: [new TestToken(0, 1)]
            }, {
                text: 'hello world',
                tokens: [new TestToken(0, 1)]
            }]);
    });
    test('multi insert 7', () => {
        testApplyEdits([{
                text: 'hello world',
                tokens: [new TestToken(0, 1), new TestToken(5, 2), new TestToken(6, 3)]
            }], [{ range: new Range(1, 12, 1, 12), text: '\n' }], [{
                text: 'hello world',
                tokens: [new TestToken(0, 1), new TestToken(5, 2), new TestToken(6, 3)]
            }, {
                text: '',
                tokens: [new TestToken(0, 1)]
            }]);
    });
    test('multi insert 8', () => {
        testApplyEdits([{
                text: 'hello world',
                tokens: [new TestToken(0, 1), new TestToken(5, 2), new TestToken(6, 3)]
            }], [{ range: new Range(1, 7, 1, 7), text: '\n' }], [{
                text: 'hello ',
                tokens: [new TestToken(0, 1), new TestToken(5, 2)]
            }, {
                text: 'world',
                tokens: [new TestToken(0, 1)]
            }]);
    });
    test('multi insert 9', () => {
        testApplyEdits([{
                text: 'hello world',
                tokens: [new TestToken(0, 1), new TestToken(5, 2), new TestToken(6, 3)]
            }, {
                text: 'hello world',
                tokens: [new TestToken(0, 4), new TestToken(5, 5), new TestToken(6, 6)]
            }], [{ range: new Range(1, 7, 1, 7), text: 'xx\nyy' }], [{
                text: 'hello xx',
                tokens: [new TestToken(0, 1), new TestToken(5, 2)]
            }, {
                text: 'yyworld',
                tokens: [new TestToken(0, 1)]
            }, {
                text: 'hello world',
                tokens: [new TestToken(0, 4), new TestToken(5, 5), new TestToken(6, 6)]
            }]);
    });
    function testLineEditTokens(initialText, initialTokens, edits, expectedText, expectedTokens) {
        testApplyEdits([{
                text: initialText,
                tokens: initialTokens
            }], edits.map((ed) => ({
            range: new Range(1, ed.startColumn, 1, ed.endColumn),
            text: ed.text
        })), [{
                text: expectedText,
                tokens: expectedTokens
            }]);
    }
    test('insertion on empty line', () => {
        const s = new ManualTokenizationSupport();
        const d = TokenizationRegistry.register('test', s);
        const model = createTextModel('some text', 'test');
        const tokens = TestToken.toTokens([new TestToken(0, 1)]);
        LineTokens.convertToEndOffset(tokens, model.getLineMaxColumn(1) - 1);
        s.setLineTokens(1, tokens);
        model.applyEdits([{
                range: new Range(1, 1, 1, 10),
                text: ''
            }]);
        s.setLineTokens(1, new Uint32Array(0));
        model.applyEdits([{
                range: new Range(1, 1, 1, 1),
                text: 'a'
            }]);
        const actualTokens = model.tokenization.getLineTokens(1);
        assertLineTokens(actualTokens, [new TestToken(0, 1)]);
        model.dispose();
        d.dispose();
    });
    test('updates tokens on insertion 1', () => {
        testLineEditTokens('abcd efgh', [
            new TestToken(0, 1),
            new TestToken(4, 2),
            new TestToken(5, 3)
        ], [{
                startColumn: 1,
                endColumn: 1,
                text: 'a',
            }], 'aabcd efgh', [
            new TestToken(0, 1),
            new TestToken(5, 2),
            new TestToken(6, 3)
        ]);
    });
    test('updates tokens on insertion 2', () => {
        testLineEditTokens('aabcd efgh', [
            new TestToken(0, 1),
            new TestToken(5, 2),
            new TestToken(6, 3)
        ], [{
                startColumn: 2,
                endColumn: 2,
                text: 'x',
            }], 'axabcd efgh', [
            new TestToken(0, 1),
            new TestToken(6, 2),
            new TestToken(7, 3)
        ]);
    });
    test('updates tokens on insertion 3', () => {
        testLineEditTokens('axabcd efgh', [
            new TestToken(0, 1),
            new TestToken(6, 2),
            new TestToken(7, 3)
        ], [{
                startColumn: 3,
                endColumn: 3,
                text: 'stu',
            }], 'axstuabcd efgh', [
            new TestToken(0, 1),
            new TestToken(9, 2),
            new TestToken(10, 3)
        ]);
    });
    test('updates tokens on insertion 4', () => {
        testLineEditTokens('axstuabcd efgh', [
            new TestToken(0, 1),
            new TestToken(9, 2),
            new TestToken(10, 3)
        ], [{
                startColumn: 10,
                endColumn: 10,
                text: '\t',
            }], 'axstuabcd\t efgh', [
            new TestToken(0, 1),
            new TestToken(10, 2),
            new TestToken(11, 3)
        ]);
    });
    test('updates tokens on insertion 5', () => {
        testLineEditTokens('axstuabcd\t efgh', [
            new TestToken(0, 1),
            new TestToken(10, 2),
            new TestToken(11, 3)
        ], [{
                startColumn: 12,
                endColumn: 12,
                text: 'dd',
            }], 'axstuabcd\t ddefgh', [
            new TestToken(0, 1),
            new TestToken(10, 2),
            new TestToken(13, 3)
        ]);
    });
    test('updates tokens on insertion 6', () => {
        testLineEditTokens('axstuabcd\t ddefgh', [
            new TestToken(0, 1),
            new TestToken(10, 2),
            new TestToken(13, 3)
        ], [{
                startColumn: 18,
                endColumn: 18,
                text: 'xyz',
            }], 'axstuabcd\t ddefghxyz', [
            new TestToken(0, 1),
            new TestToken(10, 2),
            new TestToken(13, 3)
        ]);
    });
    test('updates tokens on insertion 7', () => {
        testLineEditTokens('axstuabcd\t ddefghxyz', [
            new TestToken(0, 1),
            new TestToken(10, 2),
            new TestToken(13, 3)
        ], [{
                startColumn: 1,
                endColumn: 1,
                text: 'x',
            }], 'xaxstuabcd\t ddefghxyz', [
            new TestToken(0, 1),
            new TestToken(11, 2),
            new TestToken(14, 3)
        ]);
    });
    test('updates tokens on insertion 8', () => {
        testLineEditTokens('xaxstuabcd\t ddefghxyz', [
            new TestToken(0, 1),
            new TestToken(11, 2),
            new TestToken(14, 3)
        ], [{
                startColumn: 22,
                endColumn: 22,
                text: 'x',
            }], 'xaxstuabcd\t ddefghxyzx', [
            new TestToken(0, 1),
            new TestToken(11, 2),
            new TestToken(14, 3)
        ]);
    });
    test('updates tokens on insertion 9', () => {
        testLineEditTokens('xaxstuabcd\t ddefghxyzx', [
            new TestToken(0, 1),
            new TestToken(11, 2),
            new TestToken(14, 3)
        ], [{
                startColumn: 2,
                endColumn: 2,
                text: '',
            }], 'xaxstuabcd\t ddefghxyzx', [
            new TestToken(0, 1),
            new TestToken(11, 2),
            new TestToken(14, 3)
        ]);
    });
    test('updates tokens on insertion 10', () => {
        testLineEditTokens('', [], [{
                startColumn: 1,
                endColumn: 1,
                text: 'a',
            }], 'a', [
            new TestToken(0, 1)
        ]);
    });
    test('delete second token 2', () => {
        testLineEditTokens('abcdefghij', [
            new TestToken(0, 1),
            new TestToken(3, 2),
            new TestToken(6, 3)
        ], [{
                startColumn: 4,
                endColumn: 7,
                text: '',
            }], 'abcghij', [
            new TestToken(0, 1),
            new TestToken(3, 3)
        ]);
    });
    test('insert right before second token', () => {
        testLineEditTokens('abcdefghij', [
            new TestToken(0, 1),
            new TestToken(3, 2),
            new TestToken(6, 3)
        ], [{
                startColumn: 4,
                endColumn: 4,
                text: 'hello',
            }], 'abchellodefghij', [
            new TestToken(0, 1),
            new TestToken(8, 2),
            new TestToken(11, 3)
        ]);
    });
    test('delete first char', () => {
        testLineEditTokens('abcd efgh', [
            new TestToken(0, 1),
            new TestToken(4, 2),
            new TestToken(5, 3)
        ], [{
                startColumn: 1,
                endColumn: 2,
                text: '',
            }], 'bcd efgh', [
            new TestToken(0, 1),
            new TestToken(3, 2),
            new TestToken(4, 3)
        ]);
    });
    test('delete 2nd and 3rd chars', () => {
        testLineEditTokens('abcd efgh', [
            new TestToken(0, 1),
            new TestToken(4, 2),
            new TestToken(5, 3)
        ], [{
                startColumn: 2,
                endColumn: 4,
                text: '',
            }], 'ad efgh', [
            new TestToken(0, 1),
            new TestToken(2, 2),
            new TestToken(3, 3)
        ]);
    });
    test('delete first token', () => {
        testLineEditTokens('abcd efgh', [
            new TestToken(0, 1),
            new TestToken(4, 2),
            new TestToken(5, 3)
        ], [{
                startColumn: 1,
                endColumn: 5,
                text: '',
            }], ' efgh', [
            new TestToken(0, 2),
            new TestToken(1, 3)
        ]);
    });
    test('delete second token', () => {
        testLineEditTokens('abcd efgh', [
            new TestToken(0, 1),
            new TestToken(4, 2),
            new TestToken(5, 3)
        ], [{
                startColumn: 5,
                endColumn: 6,
                text: '',
            }], 'abcdefgh', [
            new TestToken(0, 1),
            new TestToken(4, 3)
        ]);
    });
    test('delete second token + a bit of the third one', () => {
        testLineEditTokens('abcd efgh', [
            new TestToken(0, 1),
            new TestToken(4, 2),
            new TestToken(5, 3)
        ], [{
                startColumn: 5,
                endColumn: 7,
                text: '',
            }], 'abcdfgh', [
            new TestToken(0, 1),
            new TestToken(4, 3)
        ]);
    });
    test('delete second and third token', () => {
        testLineEditTokens('abcd efgh', [
            new TestToken(0, 1),
            new TestToken(4, 2),
            new TestToken(5, 3)
        ], [{
                startColumn: 5,
                endColumn: 10,
                text: '',
            }], 'abcd', [
            new TestToken(0, 1)
        ]);
    });
    test('delete everything', () => {
        testLineEditTokens('abcd efgh', [
            new TestToken(0, 1),
            new TestToken(4, 2),
            new TestToken(5, 3)
        ], [{
                startColumn: 1,
                endColumn: 10,
                text: '',
            }], '', [
            new TestToken(0, 1)
        ]);
    });
    test('noop', () => {
        testLineEditTokens('abcd efgh', [
            new TestToken(0, 1),
            new TestToken(4, 2),
            new TestToken(5, 3)
        ], [{
                startColumn: 1,
                endColumn: 1,
                text: '',
            }], 'abcd efgh', [
            new TestToken(0, 1),
            new TestToken(4, 2),
            new TestToken(5, 3)
        ]);
    });
    test('equivalent to deleting first two chars', () => {
        testLineEditTokens('abcd efgh', [
            new TestToken(0, 1),
            new TestToken(4, 2),
            new TestToken(5, 3)
        ], [{
                startColumn: 1,
                endColumn: 3,
                text: '',
            }], 'cd efgh', [
            new TestToken(0, 1),
            new TestToken(2, 2),
            new TestToken(3, 3)
        ]);
    });
    test('equivalent to deleting from 5 to the end', () => {
        testLineEditTokens('abcd efgh', [
            new TestToken(0, 1),
            new TestToken(4, 2),
            new TestToken(5, 3)
        ], [{
                startColumn: 5,
                endColumn: 10,
                text: '',
            }], 'abcd', [
            new TestToken(0, 1)
        ]);
    });
    test('updates tokens on replace 1', () => {
        testLineEditTokens('Hello world, ciao', [
            new TestToken(0, 1),
            new TestToken(5, 0),
            new TestToken(6, 2),
            new TestToken(11, 0),
            new TestToken(13, 0)
        ], [{
                startColumn: 1,
                endColumn: 6,
                text: 'Hi',
            }], 'Hi world, ciao', [
            new TestToken(0, 0),
            new TestToken(3, 2),
            new TestToken(8, 0),
            new TestToken(10, 0),
        ]);
    });
    test('updates tokens on replace 2', () => {
        testLineEditTokens('Hello world, ciao', [
            new TestToken(0, 1),
            new TestToken(5, 0),
            new TestToken(6, 2),
            new TestToken(11, 0),
            new TestToken(13, 0),
        ], [{
                startColumn: 1,
                endColumn: 6,
                text: 'Hi',
            }, {
                startColumn: 8,
                endColumn: 12,
                text: 'my friends',
            }], 'Hi wmy friends, ciao', [
            new TestToken(0, 0),
            new TestToken(3, 2),
            new TestToken(14, 0),
            new TestToken(16, 0),
        ]);
    });
    function testLineSplitTokens(initialText, initialTokens, splitColumn, expectedText1, expectedText2, expectedTokens) {
        testApplyEdits([{
                text: initialText,
                tokens: initialTokens
            }], [{
                range: new Range(1, splitColumn, 1, splitColumn),
                text: '\n'
            }], [{
                text: expectedText1,
                tokens: expectedTokens
            }, {
                text: expectedText2,
                tokens: [new TestToken(0, 1)]
            }]);
    }
    test('split at the beginning', () => {
        testLineSplitTokens('abcd efgh', [
            new TestToken(0, 1),
            new TestToken(4, 2),
            new TestToken(5, 3)
        ], 1, '', 'abcd efgh', [
            new TestToken(0, 1),
        ]);
    });
    test('split at the end', () => {
        testLineSplitTokens('abcd efgh', [
            new TestToken(0, 1),
            new TestToken(4, 2),
            new TestToken(5, 3)
        ], 10, 'abcd efgh', '', [
            new TestToken(0, 1),
            new TestToken(4, 2),
            new TestToken(5, 3)
        ]);
    });
    test('split inthe middle 1', () => {
        testLineSplitTokens('abcd efgh', [
            new TestToken(0, 1),
            new TestToken(4, 2),
            new TestToken(5, 3)
        ], 5, 'abcd', ' efgh', [
            new TestToken(0, 1)
        ]);
    });
    test('split inthe middle 2', () => {
        testLineSplitTokens('abcd efgh', [
            new TestToken(0, 1),
            new TestToken(4, 2),
            new TestToken(5, 3)
        ], 6, 'abcd ', 'efgh', [
            new TestToken(0, 1),
            new TestToken(4, 2)
        ]);
    });
    function testLineAppendTokens(aText, aTokens, bText, bTokens, expectedText, expectedTokens) {
        testApplyEdits([{
                text: aText,
                tokens: aTokens
            }, {
                text: bText,
                tokens: bTokens
            }], [{
                range: new Range(1, aText.length + 1, 2, 1),
                text: ''
            }], [{
                text: expectedText,
                tokens: expectedTokens
            }]);
    }
    test('append empty 1', () => {
        testLineAppendTokens('abcd efgh', [
            new TestToken(0, 1),
            new TestToken(4, 2),
            new TestToken(5, 3)
        ], '', [], 'abcd efgh', [
            new TestToken(0, 1),
            new TestToken(4, 2),
            new TestToken(5, 3)
        ]);
    });
    test('append empty 2', () => {
        testLineAppendTokens('', [], 'abcd efgh', [
            new TestToken(0, 1),
            new TestToken(4, 2),
            new TestToken(5, 3)
        ], 'abcd efgh', [
            new TestToken(0, 1),
            new TestToken(4, 2),
            new TestToken(5, 3)
        ]);
    });
    test('append 1', () => {
        testLineAppendTokens('abcd efgh', [
            new TestToken(0, 1),
            new TestToken(4, 2),
            new TestToken(5, 3)
        ], 'abcd efgh', [
            new TestToken(0, 4),
            new TestToken(4, 5),
            new TestToken(5, 6)
        ], 'abcd efghabcd efgh', [
            new TestToken(0, 1),
            new TestToken(4, 2),
            new TestToken(5, 3),
            new TestToken(9, 4),
            new TestToken(13, 5),
            new TestToken(14, 6)
        ]);
    });
    test('append 2', () => {
        testLineAppendTokens('abcd ', [
            new TestToken(0, 1),
            new TestToken(4, 2)
        ], 'efgh', [
            new TestToken(0, 3)
        ], 'abcd efgh', [
            new TestToken(0, 1),
            new TestToken(4, 2),
            new TestToken(5, 3)
        ]);
    });
    test('append 3', () => {
        testLineAppendTokens('abcd', [
            new TestToken(0, 1),
        ], ' efgh', [
            new TestToken(0, 2),
            new TestToken(1, 3)
        ], 'abcd efgh', [
            new TestToken(0, 1),
            new TestToken(4, 2),
            new TestToken(5, 3)
        ]);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kZWwubGluZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3Rlc3QvY29tbW9uL21vZGVsL21vZGVsLmxpbmUudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBRXRELE9BQU8sRUFBRSx5QkFBeUIsRUFBb0Ysb0JBQW9CLEVBQXNCLE1BQU0sOEJBQThCLENBQUM7QUFFck0sT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDcEUsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDOUcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBaUIsb0JBQW9CLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUMvRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFRdEQsU0FBUyxnQkFBZ0IsQ0FBQyxRQUFvQixFQUFFLFNBQXNCO0lBQ3JFLE1BQU0sR0FBRyxHQUFHLFNBQVMsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDMUMsVUFBVSxDQUFDLGtCQUFrQixDQUFDLEdBQUcsRUFBRSxRQUFRLENBQUMsY0FBYyxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDckUsTUFBTSxRQUFRLEdBQUcsb0JBQW9CLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ3RELE1BQU0sT0FBTyxHQUFHLFFBQVEsQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUtu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QyxDQUFDO2FBQ3ZFLENBQUMsRUFDRixDQUFDLEVBQUUsS0FBSyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUM5QyxDQUFDO2dCQUNBLElBQUksRUFBRSxRQUFRO2dCQUNkLE1BQU0sRUFBRSxDQUFDLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7YUFDbEQsRUFBRTtnQkFDRixJQUFJLEVBQUUsT0FBTztnQkFDYixNQUFNLEVBQUUsQ0FBQyxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7YUFDN0IsQ0FBQyxDQUNGLENBQUM7SUFDSCxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxHQUFHLEVBQUU7UUFDM0IsY0FBYyxDQUNiLENBQUM7Z0JBQ0EsSUFBSSxFQUFFLGFBQWE7Z0JBQ25CLE1BQU0sRUFBRSxDQUFDLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO2FBQ3ZFLEVBQUU7Z0JBQ0YsSUFBSSxFQUFFLGFBQWE7Z0JBQ25CLE1BQU0sRUFBRSxDQUFDLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO2FBQ3ZFLENBQUMsRUFDRixDQUFDLEVBQUUsS0FBSyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxRQUFR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