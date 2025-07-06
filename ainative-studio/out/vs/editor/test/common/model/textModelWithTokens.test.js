/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { Position } from '../../../common/core/position.js';
import { Range } from '../../../common/core/range.js';
import { TokenizationRegistry, EncodedTokenizationResult } from '../../../common/languages.js';
import { ILanguageConfigurationService } from '../../../common/languages/languageConfigurationRegistry.js';
import { NullState } from '../../../common/languages/nullTokenize.js';
import { ILanguageService } from '../../../common/languages/language.js';
import { TestLineToken } from '../core/testLineToken.js';
import { createModelServices, createTextModel, instantiateTextModel } from '../testTextModel.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
function createTextModelWithBrackets(disposables, text, brackets) {
    const languageId = 'bracketMode2';
    const instantiationService = createModelServices(disposables);
    const languageConfigurationService = instantiationService.get(ILanguageConfigurationService);
    const languageService = instantiationService.get(ILanguageService);
    disposables.add(languageService.registerLanguage({ id: languageId }));
    disposables.add(languageConfigurationService.register(languageId, { brackets }));
    return disposables.add(instantiateTextModel(instantiationService, text, languageId));
}
suite('TextModelWithTokens', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    function testBrackets(contents, brackets) {
        const languageId = 'testMode';
        const disposables = new DisposableStore();
        const instantiationService = createModelServices(disposables);
        const languageConfigurationService = instantiationService.get(ILanguageConfigurationService);
        const languageService = instantiationService.get(ILanguageService);
        disposables.add(languageService.registerLanguage({ id: languageId }));
        disposables.add(languageConfigurationService.register(languageId, {
            brackets: brackets
        }));
        function toRelaxedFoundBracket(a) {
            if (!a) {
                return null;
            }
            return {
                range: a.range.toString(),
                info: a.bracketInfo,
            };
        }
        const charIsBracket = {};
        const charIsOpenBracket = {};
        const openForChar = {};
        const closeForChar = {};
        brackets.forEach((b) => {
            charIsBracket[b[0]] = true;
            charIsBracket[b[1]] = true;
            charIsOpenBracket[b[0]] = true;
            charIsOpenBracket[b[1]] = false;
            openForChar[b[0]] = b[0];
            closeForChar[b[0]] = b[1];
            openForChar[b[1]] = b[0];
            closeForChar[b[1]] = b[1];
        });
        const expectedBrackets = [];
        for (let lineIndex = 0; lineIndex < contents.length; lineIndex++) {
            const lineText = contents[lineIndex];
            for (let charIndex = 0; charIndex < lineText.length; charIndex++) {
                const ch = lineText.charAt(charIndex);
                if (charIsBracket[ch]) {
                    expectedBrackets.push({
                        bracketInfo: languageConfigurationService.getLanguageConfiguration(languageId).bracketsNew.getBracketInfo(ch),
                        range: new Range(lineIndex + 1, charIndex + 1, lineIndex + 1, charIndex + 2)
                    });
                }
            }
        }
        const model = disposables.add(instantiateTextModel(instantiationService, contents.join('\n'), languageId));
        // findPrevBracket
        {
            let expectedBracketIndex = expectedBrackets.length - 1;
            let currentExpectedBracket = expectedBracketIndex >= 0 ? expectedBrackets[expectedBracketIndex] : null;
            for (let lineNumber = contents.length; lineNumber >= 1; lineNumber--) {
                const lineText = contents[lineNumber - 1];
                for (let column = lineText.length + 1; column >= 1; column--) {
                    if (currentExpectedBracket) {
                        if (lineNumber === currentExpectedBracket.range.startLineNumber && column < currentExpectedBracket.range.endColumn) {
                            expectedBracketIndex--;
                            currentExpectedBracket = expectedBracketIndex >= 0 ? expectedBrackets[expectedBracketIndex] : null;
                        }
                    }
                    const actual = model.bracketPairs.findPrevBracket({
                        lineNumber: lineNumber,
                        column: column
                    });
                    assert.deepStrictEqual(toRelaxedFoundBracket(actual), toRelaxedFoundBracket(currentExpectedBracket), 'findPrevBracket of ' + lineNumber + ', ' + column);
                }
            }
        }
        // findNextBracket
        {
            let expectedBracketIndex = 0;
            let currentExpectedBracket = expectedBracketIndex < expectedBrackets.length ? expectedBrackets[expectedBracketIndex] : null;
            for (let lineNumber = 1; lineNumber <= contents.length; lineNumber++) {
                const lineText = contents[lineNumber - 1];
                for (let column = 1; column <= lineText.length + 1; column++) {
                    if (currentExpectedBracket) {
                        if (lineNumber === currentExpectedBracket.range.startLineNumber && column > currentExpectedBracket.range.startColumn) {
                            expectedBracketIndex++;
                            currentExpectedBracket = expectedBracketIndex < expectedBrackets.length ? expectedBrackets[expectedBracketIndex] : null;
                        }
                    }
                    const actual = model.bracketPairs.findNextBracket({
                        lineNumber: lineNumber,
                        column: column
                    });
                    assert.deepStrictEqual(toRelaxedFoundBracket(actual), toRelaxedFoundBracket(currentExpectedBracket), 'findNextBracket of ' + lineNumber + ', ' + column);
                }
            }
        }
        disposables.dispose();
    }
    test('brackets1', () => {
        testBrackets([
            'if (a == 3) { return (7 * (a + 5)); }'
        ], [
            ['{', '}'],
            ['[', ']'],
            ['(', ')']
        ]);
    });
});
function assertIsNotBracket(model, lineNumber, column) {
    const match = model.bracketPairs.matchBracket(new Position(lineNumber, column));
    assert.strictEqual(match, null, 'is not matching brackets at ' + lineNumber + ', ' + column);
}
function assertIsBracket(model, testPosition, expected) {
    expected.sort(Range.compareRangesUsingStarts);
    const actual = model.bracketPairs.matchBracket(testPosition);
    actual?.sort(Range.compareRangesUsingStarts);
    assert.deepStrictEqual(actual, expected, 'matches brackets at ' + testPosition);
}
suite('TextModelWithTokens - bracket matching', () => {
    const languageId = 'bracketMode1';
    let disposables;
    let instantiationService;
    let languageConfigurationService;
    let languageService;
    setup(() => {
        disposables = new DisposableStore();
        instantiationService = createModelServices(disposables);
        languageConfigurationService = instantiationService.get(ILanguageConfigurationService);
        languageService = instantiationService.get(ILanguageService);
        disposables.add(languageService.registerLanguage({ id: languageId }));
        disposables.add(languageConfigurationService.register(languageId, {
            brackets: [
                ['{', '}'],
                ['[', ']'],
                ['(', ')'],
            ]
        }));
    });
    teardown(() => {
        disposables.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('bracket matching 1', () => {
        const text = ')]}{[(' + '\n' +
            ')]}{[(';
        const model = disposables.add(instantiateTextModel(instantiationService, text, languageId));
        assertIsNotBracket(model, 1, 1);
        assertIsNotBracket(model, 1, 2);
        assertIsNotBracket(model, 1, 3);
        assertIsBracket(model, new Position(1, 4), [new Range(1, 4, 1, 5), new Range(2, 3, 2, 4)]);
        assertIsBracket(model, new Position(1, 5), [new Range(1, 5, 1, 6), new Range(2, 2, 2, 3)]);
        assertIsBracket(model, new Position(1, 6), [new Range(1, 6, 1, 7), new Range(2, 1, 2, 2)]);
        assertIsBracket(model, new Position(1, 7), [new Range(1, 6, 1, 7), new Range(2, 1, 2, 2)]);
        assertIsBracket(model, new Position(2, 1), [new Range(2, 1, 2, 2), new Range(1, 6, 1, 7)]);
        assertIsBracket(model, new Position(2, 2), [new Range(2, 2, 2, 3), new Range(1, 5, 1, 6)]);
        assertIsBracket(model, new Position(2, 3), [new Range(2, 3, 2, 4), new Range(1, 4, 1, 5)]);
        assertIsBracket(model, new Position(2, 4), [new Range(2, 3, 2, 4), new Range(1, 4, 1, 5)]);
        assertIsNotBracket(model, 2, 5);
        assertIsNotBracket(model, 2, 6);
        assertIsNotBracket(model, 2, 7);
    });
    test('bracket matching 2', () => {
        const text = 'var bar = {' + '\n' +
            'foo: {' + '\n' +
            '}, bar: {hallo: [{' + '\n' +
            '}, {' + '\n' +
            '}]}}';
        const model = disposables.add(instantiateTextModel(instantiationService, text, languageId));
        const brackets = [
            [new Position(1, 11), new Range(1, 11, 1, 12), new Range(5, 4, 5, 5)],
            [new Position(1, 12), new Range(1, 11, 1, 12), new Range(5, 4, 5, 5)],
            [new Position(2, 6), new Range(2, 6, 2, 7), new Range(3, 1, 3, 2)],
            [new Position(2, 7), new Range(2, 6, 2, 7), new Range(3, 1, 3, 2)],
            [new Position(3, 1), new Range(3, 1, 3, 2), new Range(2, 6, 2, 7)],
            [new Position(3, 2), new Range(3, 1, 3, 2), new Range(2, 6, 2, 7)],
            [new Position(3, 9), new Range(3, 9, 3, 10), new Range(5, 3, 5, 4)],
            [new Position(3, 10), new Range(3, 9, 3, 10), new Range(5, 3, 5, 4)],
            [new Position(3, 17), new Range(3, 17, 3, 18), new Range(5, 2, 5, 3)],
            [new Position(3, 18), new Range(3, 18, 3, 19), new Range(4, 1, 4, 2)],
            [new Position(3, 19), new Range(3, 18, 3, 19), new Range(4, 1, 4, 2)],
            [new Position(4, 1), new Range(4, 1, 4, 2), new Range(3, 18, 3, 19)],
            [new Position(4, 2), new Range(4, 1, 4, 2), new Range(3, 18, 3, 19)],
            [new Position(4, 4), new Range(4, 4, 4, 5), new Range(5, 1, 5, 2)],
            [new Position(4, 5), new Range(4, 4, 4, 5), new Range(5, 1, 5, 2)],
            [new Position(5, 1), new Range(5, 1, 5, 2), new Range(4, 4, 4, 5)],
            [new Position(5, 2), new Range(5, 2, 5, 3), new Range(3, 17, 3, 18)],
            [new Position(5, 3), new Range(5, 3, 5, 4), new Range(3, 9, 3, 10)],
            [new Position(5, 4), new Range(5, 4, 5, 5), new Range(1, 11, 1, 12)],
            [new Position(5, 5), new Range(5, 4, 5, 5), new Range(1, 11, 1, 12)],
        ];
        const isABracket = { 1: {}, 2: {}, 3: {}, 4: {}, 5: {} };
        for (let i = 0, len = brackets.length; i < len; i++) {
            const [testPos, b1, b2] = brackets[i];
            assertIsBracket(model, testPos, [b1, b2]);
            isABracket[testPos.lineNumber][testPos.column] = true;
        }
        for (let i = 1, len = model.getLineCount(); i <= len; i++) {
            const line = model.getLineContent(i);
            for (let j = 1, lenJ = line.length + 1; j <= lenJ; j++) {
                if (!isABracket[i].hasOwnProperty(j)) {
                    assertIsNotBracket(model, i, j);
                }
            }
        }
    });
});
suite('TextModelWithTokens 2', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('bracket matching 3', () => {
        const text = [
            'begin',
            '    loop',
            '        if then',
            '        end if;',
            '    end loop;',
            'end;',
            '',
            'begin',
            '    loop',
            '        if then',
            '        end ifa;',
            '    end loop;',
            'end;',
        ].join('\n');
        const disposables = new DisposableStore();
        const model = createTextModelWithBrackets(disposables, text, [
            ['if', 'end if'],
            ['loop', 'end loop'],
            ['begin', 'end']
        ]);
        // <if> ... <end ifa> is not matched
        assertIsNotBracket(model, 10, 9);
        // <if> ... <end if> is matched
        assertIsBracket(model, new Position(3, 9), [new Range(3, 9, 3, 11), new Range(4, 9, 4, 15)]);
        assertIsBracket(model, new Position(4, 9), [new Range(4, 9, 4, 15), new Range(3, 9, 3, 11)]);
        // <loop> ... <end loop> is matched
        assertIsBracket(model, new Position(2, 5), [new Range(2, 5, 2, 9), new Range(5, 5, 5, 13)]);
        assertIsBracket(model, new Position(5, 5), [new Range(5, 5, 5, 13), new Range(2, 5, 2, 9)]);
        // <begin> ... <end> is matched
        assertIsBracket(model, new Position(1, 1), [new Range(1, 1, 1, 6), new Range(6, 1, 6, 4)]);
        assertIsBracket(model, new Position(6, 1), [new Range(6, 1, 6, 4), new Range(1, 1, 1, 6)]);
        disposables.dispose();
    });
    test('bracket matching 4', () => {
        const text = [
            'recordbegin',
            '  simplerecordbegin',
            '  endrecord',
            'endrecord',
        ].join('\n');
        const disposables = new DisposableStore();
        const model = createTextModelWithBrackets(disposables, text, [
            ['recordbegin', 'endrecord'],
            ['simplerecordbegin', 'endrecord'],
        ]);
        // <recordbegin> ... <endrecord> is matched
        assertIsBracket(model, new Position(1, 1), [new Range(1, 1, 1, 12), new Range(4, 1, 4, 10)]);
        assertIsBracket(model, new Position(4, 1), [new Range(4, 1, 4, 10), new Range(1, 1, 1, 12)]);
        // <simplerecordbegin> ... <endrecord> is matched
        assertIsBracket(model, new Position(2, 3), [new Range(2, 3, 2, 20), new Range(3, 3, 3, 12)]);
        assertIsBracket(model, new Position(3, 3), [new Range(3, 3, 3, 12), new Range(2, 3, 2, 20)]);
        disposables.dispose();
    });
    test('issue #95843: Highlighting of closing braces is indicating wrong brace when cursor is behind opening brace', () => {
        const disposables = new DisposableStore();
        const instantiationService = createModelServices(disposables);
        const languageConfigurationService = instantiationService.get(ILanguageConfigurationService);
        const languageService = instantiationService.get(ILanguageService);
        const mode1 = 'testMode1';
        const mode2 = 'testMode2';
        const languageIdCodec = languageService.languageIdCodec;
        disposables.add(languageService.registerLanguage({ id: mode1 }));
        disposables.add(languageService.registerLanguage({ id: mode2 }));
        const encodedMode1 = languageIdCodec.encodeLanguageId(mode1);
        const encodedMode2 = languageIdCodec.encodeLanguageId(mode2);
        const otherMetadata1 = ((encodedMode1 << 0 /* MetadataConsts.LANGUAGEID_OFFSET */)
            | (0 /* StandardTokenType.Other */ << 8 /* MetadataConsts.TOKEN_TYPE_OFFSET */)
            | (1024 /* MetadataConsts.BALANCED_BRACKETS_MASK */)) >>> 0;
        const otherMetadata2 = ((encodedMode2 << 0 /* MetadataConsts.LANGUAGEID_OFFSET */)
            | (0 /* StandardTokenType.Other */ << 8 /* MetadataConsts.TOKEN_TYPE_OFFSET */)
            | (1024 /* MetadataConsts.BALANCED_BRACKETS_MASK */)) >>> 0;
        const tokenizationSupport = {
            getInitialState: () => NullState,
            tokenize: undefined,
            tokenizeEncoded: (line, hasEOL, state) => {
                switch (line) {
                    case 'function f() {': {
                        const tokens = new Uint32Array([
                            0, otherMetadata1,
                            8, otherMetadata1,
                            9, otherMetadata1,
                            10, otherMetadata1,
                            11, otherMetadata1,
                            12, otherMetadata1,
                            13, otherMetadata1,
                        ]);
                        return new EncodedTokenizationResult(tokens, state);
                    }
                    case '  return <p>{true}</p>;': {
                        const tokens = new Uint32Array([
                            0, otherMetadata1,
                            2, otherMetadata1,
                            8, otherMetadata1,
                            9, otherMetadata2,
                            10, otherMetadata2,
                            11, otherMetadata2,
                            12, otherMetadata2,
                            13, otherMetadata1,
                            17, otherMetadata2,
                            18, otherMetadata2,
                            20, otherMetadata2,
                            21, otherMetadata2,
                            22, otherMetadata2,
                        ]);
                        return new EncodedTokenizationResult(tokens, state);
                    }
                    case '}': {
                        const tokens = new Uint32Array([
                            0, otherMetadata1
                        ]);
                        return new EncodedTokenizationResult(tokens, state);
                    }
                }
                throw new Error(`Unexpected`);
            }
        };
        disposables.add(TokenizationRegistry.register(mode1, tokenizationSupport));
        disposables.add(languageConfigurationService.register(mode1, {
            brackets: [
                ['{', '}'],
                ['[', ']'],
                ['(', ')']
            ],
        }));
        disposables.add(languageConfigurationService.register(mode2, {
            brackets: [
                ['{', '}'],
                ['[', ']'],
                ['(', ')']
            ],
        }));
        const model = disposables.add(instantiateTextModel(instantiationService, [
            'function f() {',
            '  return <p>{true}</p>;',
            '}',
        ].join('\n'), mode1));
        model.tokenization.forceTokenization(1);
        model.tokenization.forceTokenization(2);
        model.tokenization.forceTokenization(3);
        assert.deepStrictEqual(model.bracketPairs.matchBracket(new Position(2, 14)), [new Range(2, 13, 2, 14), new Range(2, 18, 2, 19)]);
        disposables.dispose();
    });
    test('issue #88075: TypeScript brace matching is incorrect in `${}` strings', () => {
        const disposables = new DisposableStore();
        const instantiationService = createModelServices(disposables);
        const languageConfigurationService = instantiationService.get(ILanguageConfigurationService);
        const mode = 'testMode';
        const languageIdCodec = instantiationService.get(ILanguageService).languageIdCodec;
        const encodedMode = languageIdCodec.encodeLanguageId(mode);
        const otherMetadata = ((encodedMode << 0 /* MetadataConsts.LANGUAGEID_OFFSET */)
            | (0 /* StandardTokenType.Other */ << 8 /* MetadataConsts.TOKEN_TYPE_OFFSET */)) >>> 0;
        const stringMetadata = ((encodedMode << 0 /* MetadataConsts.LANGUAGEID_OFFSET */)
            | (2 /* StandardTokenType.String */ << 8 /* MetadataConsts.TOKEN_TYPE_OFFSET */)) >>> 0;
        const tokenizationSupport = {
            getInitialState: () => NullState,
            tokenize: undefined,
            tokenizeEncoded: (line, hasEOL, state) => {
                switch (line) {
                    case 'function hello() {': {
                        const tokens = new Uint32Array([
                            0, otherMetadata
                        ]);
                        return new EncodedTokenizationResult(tokens, state);
                    }
                    case '    console.log(`${100}`);': {
                        const tokens = new Uint32Array([
                            0, otherMetadata,
                            16, stringMetadata,
                            19, otherMetadata,
                            22, stringMetadata,
                            24, otherMetadata,
                        ]);
                        return new EncodedTokenizationResult(tokens, state);
                    }
                    case '}': {
                        const tokens = new Uint32Array([
                            0, otherMetadata
                        ]);
                        return new EncodedTokenizationResult(tokens, state);
                    }
                }
                throw new Error(`Unexpected`);
            }
        };
        disposables.add(TokenizationRegistry.register(mode, tokenizationSupport));
        disposables.add(languageConfigurationService.register(mode, {
            brackets: [
                ['{', '}'],
                ['[', ']'],
                ['(', ')']
            ],
        }));
        const model = disposables.add(instantiateTextModel(instantiationService, [
            'function hello() {',
            '    console.log(`${100}`);',
            '}'
        ].join('\n'), mode));
        model.tokenization.forceTokenization(1);
        model.tokenization.forceTokenization(2);
        model.tokenization.forceTokenization(3);
        assert.deepStrictEqual(model.bracketPairs.matchBracket(new Position(2, 23)), null);
        assert.deepStrictEqual(model.bracketPairs.matchBracket(new Position(2, 20)), null);
        disposables.dispose();
    });
});
suite('TextModelWithTokens regression tests', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('microsoft/monaco-editor#122: Unhandled Exception: TypeError: Unable to get property \'replace\' of undefined or null reference', () => {
        function assertViewLineTokens(model, lineNumber, forceTokenization, expected) {
            if (forceTokenization) {
                model.tokenization.forceTokenization(lineNumber);
            }
            const _actual = model.tokenization.getLineTokens(lineNumber).inflate();
            const actual = [];
            for (let i = 0, len = _actual.getCount(); i < len; i++) {
                actual[i] = {
                    endIndex: _actual.getEndOffset(i),
                    foreground: _actual.getForeground(i)
                };
            }
            const decode = (token) => {
                return {
                    endIndex: token.endIndex,
                    foreground: token.getForeground()
                };
            };
            assert.deepStrictEqual(actual, expected.map(decode));
        }
        let _tokenId = 10;
        const LANG_ID1 = 'indicisiveMode1';
        const LANG_ID2 = 'indicisiveMode2';
        const tokenizationSupport = {
            getInitialState: () => NullState,
            tokenize: undefined,
            tokenizeEncoded: (line, hasEOL, state) => {
                const myId = ++_tokenId;
                const tokens = new Uint32Array(2);
                tokens[0] = 0;
                tokens[1] = (myId << 15 /* MetadataConsts.FOREGROUND_OFFSET */) >>> 0;
                return new EncodedTokenizationResult(tokens, state);
            }
        };
        const registration1 = TokenizationRegistry.register(LANG_ID1, tokenizationSupport);
        const registration2 = TokenizationRegistry.register(LANG_ID2, tokenizationSupport);
        const model = createTextModel('A model with\ntwo lines');
        assertViewLineTokens(model, 1, true, [createViewLineToken(12, 1)]);
        assertViewLineTokens(model, 2, true, [createViewLineToken(9, 1)]);
        model.setLanguage(LANG_ID1);
        assertViewLineTokens(model, 1, true, [createViewLineToken(12, 11)]);
        assertViewLineTokens(model, 2, true, [createViewLineToken(9, 12)]);
        model.setLanguage(LANG_ID2);
        assertViewLineTokens(model, 1, false, [createViewLineToken(12, 1)]);
        assertViewLineTokens(model, 2, false, [createViewLineToken(9, 1)]);
        model.dispose();
        registration1.dispose();
        registration2.dispose();
        function createViewLineToken(endIndex, foreground) {
            const metadata = ((foreground << 15 /* MetadataConsts.FOREGROUND_OFFSET */)) >>> 0;
            return new TestLineToken(endIndex, metadata);
        }
    });
    test('microsoft/monaco-editor#133: Error: Cannot read property \'modeId\' of undefined', () => {
        const disposables = new DisposableStore();
        const model = createTextModelWithBrackets(disposables, [
            'Imports System',
            'Imports System.Collections.Generic',
            '',
            'Module m1',
            '',
            '\tSub Main()',
            '\tEnd Sub',
            '',
            'End Module',
        ].join('\n'), [
            ['module', 'end module'],
            ['sub', 'end sub']
        ]);
        const actual = model.bracketPairs.matchBracket(new Position(4, 1));
        assert.deepStrictEqual(actual, [new Range(4, 1, 4, 7), new Range(9, 1, 9, 11)]);
        disposables.dispose();
    });
    test('issue #11856: Bracket matching does not work as expected if the opening brace symbol is contained in the closing brace symbol', () => {
        const disposables = new DisposableStore();
        const model = createTextModelWithBrackets(disposables, [
            'sequence "outer"',
            '     sequence "inner"',
            '     endsequence',
            'endsequence',
        ].join('\n'), [
            ['sequence', 'endsequence'],
            ['feature', 'endfeature']
        ]);
        const actual = model.bracketPairs.matchBracket(new Position(3, 9));
        assert.deepStrictEqual(actual, [new Range(2, 6, 2, 14), new Range(3, 6, 3, 17)]);
        disposables.dispose();
    });
    test('issue #63822: Wrong embedded language detected for empty lines', () => {
        const disposables = new DisposableStore();
        const instantiationService = createModelServices(disposables);
        const languageService = instantiationService.get(ILanguageService);
        const outerMode = 'outerMode';
        const innerMode = 'innerMode';
        disposables.add(languageService.registerLanguage({ id: outerMode }));
        disposables.add(languageService.registerLanguage({ id: innerMode }));
        const languageIdCodec = instantiationService.get(ILanguageService).languageIdCodec;
        const encodedInnerMode = languageIdCodec.encodeLanguageId(innerMode);
        const tokenizationSupport = {
            getInitialState: () => NullState,
            tokenize: undefined,
            tokenizeEncoded: (line, hasEOL, state) => {
                const tokens = new Uint32Array(2);
                tokens[0] = 0;
                tokens[1] = (encodedInnerMode << 0 /* MetadataConsts.LANGUAGEID_OFFSET */) >>> 0;
                return new EncodedTokenizationResult(tokens, state);
            }
        };
        disposables.add(TokenizationRegistry.register(outerMode, tokenizationSupport));
        const model = disposables.add(instantiateTextModel(instantiationService, 'A model with one line', outerMode));
        model.tokenization.forceTokenization(1);
        assert.strictEqual(model.getLanguageIdAtPosition(1, 1), innerMode);
        disposables.dispose();
    });
});
suite('TextModel.getLineIndentGuide', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    function assertIndentGuides(lines, indentSize) {
        const languageId = 'testLang';
        const disposables = new DisposableStore();
        const instantiationService = createModelServices(disposables);
        const languageService = instantiationService.get(ILanguageService);
        disposables.add(languageService.registerLanguage({ id: languageId }));
        const text = lines.map(l => l[4]).join('\n');
        const model = disposables.add(instantiateTextModel(instantiationService, text, languageId));
        model.updateOptions({ indentSize: indentSize });
        const actualIndents = model.guides.getLinesIndentGuides(1, model.getLineCount());
        const actual = [];
        for (let line = 1; line <= model.getLineCount(); line++) {
            const activeIndentGuide = model.guides.getActiveIndentGuide(line, 1, model.getLineCount());
            actual[line - 1] = [actualIndents[line - 1], activeIndentGuide.startLineNumber, activeIndentGuide.endLineNumber, activeIndentGuide.indent, model.getLineContent(line)];
        }
        assert.deepStrictEqual(actual, lines);
        disposables.dispose();
    }
    test('getLineIndentGuide one level 2', () => {
        assertIndentGuides([
            [0, 2, 4, 1, 'A'],
            [1, 2, 4, 1, '  A'],
            [1, 2, 4, 1, '  A'],
            [1, 2, 4, 1, '  A'],
        ], 2);
    });
    test('getLineIndentGuide two levels', () => {
        assertIndentGuides([
            [0, 2, 5, 1, 'A'],
            [1, 2, 5, 1, '  A'],
            [1, 4, 5, 2, '  A'],
            [2, 4, 5, 2, '    A'],
            [2, 4, 5, 2, '    A'],
        ], 2);
    });
    test('getLineIndentGuide three levels', () => {
        assertIndentGuides([
            [0, 2, 4, 1, 'A'],
            [1, 3, 4, 2, '  A'],
            [2, 4, 4, 3, '    A'],
            [3, 4, 4, 3, '      A'],
            [0, 5, 5, 0, 'A'],
        ], 2);
    });
    test('getLineIndentGuide decreasing indent', () => {
        assertIndentGuides([
            [2, 1, 1, 2, '    A'],
            [1, 1, 1, 2, '  A'],
            [0, 1, 2, 1, 'A'],
        ], 2);
    });
    test('getLineIndentGuide Java', () => {
        assertIndentGuides([
            /* 1*/ [0, 2, 9, 1, 'class A {'],
            /* 2*/ [1, 3, 4, 2, '  void foo() {'],
            /* 3*/ [2, 3, 4, 2, '    console.log(1);'],
            /* 4*/ [2, 3, 4, 2, '    console.log(2);'],
            /* 5*/ [1, 3, 4, 2, '  }'],
            /* 6*/ [1, 2, 9, 1, ''],
            /* 7*/ [1, 8, 8, 2, '  void bar() {'],
            /* 8*/ [2, 8, 8, 2, '    console.log(3);'],
            /* 9*/ [1, 8, 8, 2, '  }'],
            /*10*/ [0, 2, 9, 1, '}'],
            /*11*/ [0, 12, 12, 1, 'interface B {'],
            /*12*/ [1, 12, 12, 1, '  void bar();'],
            /*13*/ [0, 12, 12, 1, '}'],
        ], 2);
    });
    test('getLineIndentGuide Javadoc', () => {
        assertIndentGuides([
            [0, 2, 3, 1, '/**'],
            [1, 2, 3, 1, ' * Comment'],
            [1, 2, 3, 1, ' */'],
            [0, 5, 6, 1, 'class A {'],
            [1, 5, 6, 1, '  void foo() {'],
            [1, 5, 6, 1, '  }'],
            [0, 5, 6, 1, '}'],
        ], 2);
    });
    test('getLineIndentGuide Whitespace', () => {
        assertIndentGuides([
            [0, 2, 7, 1, 'class A {'],
            [1, 2, 7, 1, ''],
            [1, 4, 5, 2, '  void foo() {'],
            [2, 4, 5, 2, '    '],
            [2, 4, 5, 2, '    return 1;'],
            [1, 4, 5, 2, '  }'],
            [1, 2, 7, 1, '      '],
            [0, 2, 7, 1, '}']
        ], 2);
    });
    test('getLineIndentGuide Tabs', () => {
        assertIndentGuides([
            [0, 2, 7, 1, 'class A {'],
            [1, 2, 7, 1, '\t\t'],
            [1, 4, 5, 2, '\tvoid foo() {'],
            [2, 4, 5, 2, '\t \t//hello'],
            [2, 4, 5, 2, '\t    return 2;'],
            [1, 4, 5, 2, '  \t}'],
            [1, 2, 7, 1, '      '],
            [0, 2, 7, 1, '}']
        ], 4);
    });
    test('getLineIndentGuide checker.ts', () => {
        assertIndentGuides([
            /* 1*/ [0, 1, 1, 0, '/// <reference path="binder.ts"/>'],
            /* 2*/ [0, 2, 2, 0, ''],
            /* 3*/ [0, 3, 3, 0, '/* @internal */'],
            /* 4*/ [0, 5, 16, 1, 'namespace ts {'],
            /* 5*/ [1, 5, 16, 1, '    let nextSymbolId = 1;'],
            /* 6*/ [1, 5, 16, 1, '    let nextNodeId = 1;'],
            /* 7*/ [1, 5, 16, 1, '    let nextMergeId = 1;'],
            /* 8*/ [1, 5, 16, 1, '    let nextFlowId = 1;'],
            /* 9*/ [1, 5, 16, 1, ''],
            /*10*/ [1, 11, 15, 2, '    export function getNodeId(node: Node): number {'],
            /*11*/ [2, 12, 13, 3, '        if (!node.id) {'],
            /*12*/ [3, 12, 13, 3, '            node.id = nextNodeId;'],
            /*13*/ [3, 12, 13, 3, '            nextNodeId++;'],
            /*14*/ [2, 12, 13, 3, '        }'],
            /*15*/ [2, 11, 15, 2, '        return node.id;'],
            /*16*/ [1, 11, 15, 2, '    }'],
            /*17*/ [0, 5, 16, 1, '}']
        ], 4);
    });
    test('issue #8425 - Missing indentation lines for first level indentation', () => {
        assertIndentGuides([
            [1, 2, 3, 2, '\tindent1'],
            [2, 2, 3, 2, '\t\tindent2'],
            [2, 2, 3, 2, '\t\tindent2'],
            [1, 2, 3, 2, '\tindent1']
        ], 4);
    });
    test('issue #8952 - Indentation guide lines going through text on .yml file', () => {
        assertIndentGuides([
            [0, 2, 5, 1, 'properties:'],
            [1, 3, 5, 2, '    emailAddress:'],
            [2, 3, 5, 2, '        - bla'],
            [2, 5, 5, 3, '        - length:'],
            [3, 5, 5, 3, '            max: 255'],
            [0, 6, 6, 0, 'getters:']
        ], 4);
    });
    test('issue #11892 - Indent guides look funny', () => {
        assertIndentGuides([
            [0, 2, 7, 1, 'function test(base) {'],
            [1, 3, 6, 2, '\tswitch (base) {'],
            [2, 4, 4, 3, '\t\tcase 1:'],
            [3, 4, 4, 3, '\t\t\treturn 1;'],
            [2, 6, 6, 3, '\t\tcase 2:'],
            [3, 6, 6, 3, '\t\t\treturn 2;'],
            [1, 2, 7, 1, '\t}'],
            [0, 2, 7, 1, '}']
        ], 4);
    });
    test('issue #12398 - Problem in indent guidelines', () => {
        assertIndentGuides([
            [2, 2, 2, 3, '\t\t.bla'],
            [3, 2, 2, 3, '\t\t\tlabel(for)'],
            [0, 3, 3, 0, 'include script']
        ], 4);
    });
    test('issue #49173', () => {
        const model = createTextModel([
            'class A {',
            '	public m1(): void {',
            '	}',
            '	public m2(): void {',
            '	}',
            '	public m3(): void {',
            '	}',
            '	public m4(): void {',
            '	}',
            '	public m5(): void {',
            '	}',
            '}',
        ].join('\n'));
        const actual = model.guides.getActiveIndentGuide(2, 4, 9);
        assert.deepStrictEqual(actual, { startLineNumber: 2, endLineNumber: 9, indent: 1 });
        model.dispose();
    });
    test('tweaks - no active', () => {
        assertIndentGuides([
            [0, 1, 1, 0, 'A'],
            [0, 2, 2, 0, 'A']
        ], 2);
    });
    test('tweaks - inside scope', () => {
        assertIndentGuides([
            [0, 2, 2, 1, 'A'],
            [1, 2, 2, 1, '  A']
        ], 2);
    });
    test('tweaks - scope start', () => {
        assertIndentGuides([
            [0, 2, 2, 1, 'A'],
            [1, 2, 2, 1, '  A'],
            [0, 2, 2, 1, 'A']
        ], 2);
    });
    test('tweaks - empty line', () => {
        assertIndentGuides([
            [0, 2, 4, 1, 'A'],
            [1, 2, 4, 1, '  A'],
            [1, 2, 4, 1, ''],
            [1, 2, 4, 1, '  A'],
            [0, 2, 4, 1, 'A']
        ], 2);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dE1vZGVsV2l0aFRva2Vucy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3Rlc3QvY29tbW9uL21vZGVsL3RleHRNb2RlbFdpdGhUb2tlbnMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUM1RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFHdEQsT0FBTyxFQUF3QixvQkFBb0IsRUFBRSx5QkFBeUIsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBR3JILE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQzNHLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUN0RSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUN6RSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDekQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLGVBQWUsRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBRWpHLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBRWhHLFNBQVMsMkJBQTJCLENBQUMsV0FBNEIsRUFBRSxJQUFZLEVBQUUsUUFBeUI7SUFDekcsTUFBTSxVQUFVLEdBQUcsY0FBYyxDQUFDO0lBQ2xDLE1BQU0sb0JBQW9CLEdBQUcsbUJBQW1CLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDOUQsTUFBTSw0QkFBNEIsR0FBRyxvQkFB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QUFDLENBQUMsQ0FBQztRQUNoQyxrQkFBa0IsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ2hDLGtCQUFrQixDQUFDLEtBQUssRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDaEMsZUFBZSxDQUFDLEtBQUssRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDM0YsZUFBZSxDQUFDLEtBQUssRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDM0YsZUFBZSxDQUFDLEtBQUssRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDM0YsZUFBZSxDQUFDLEtBQUssRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFM0YsZUFBZSxDQUFDLEtBQUssRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDM0YsZUFBZSxDQUFDLEtBQUssRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDM0YsZUFBZSxDQUFDLEtBQUssRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDM0YsZUFBZSxDQUFDLEtBQUssRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDM0Ysa0JBQWtCLENBQUMsS0FBSyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNoQyxrQkFBa0IsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ2hDLGtCQUFrQixDQUFDLEtBQUssRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDakMsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsb0JBQW9CLEVBQUUsR0FBRyxFQUFFO1FBQy9CLE1BQU0sSUFBSSxHQUNULGFBQWEsR0FBRyxJQUFJO1lBQ3BCLFFBQVEsR0FBRyxJQUFJO1lBQ2Ysb0JBQW9CLEdBQUcsSUFBSTtZQUMzQixNQUFNLEdBQUcsSUFBSTtZQUNiLE1BQU0sQ0FBQztRQUNSLE1BQU0sS0FBSyxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsb0JBQW9CLEVBQUUsSUFBSSxFQUFFLFVBQVUsQ0FBQyxDQUFDLENBQUM7UUFFNUYsTUFBTSxRQUFRLEdBQStCO1lBQzVDLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ3JFLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBRXJFLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ2xFLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBRWxFLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ2xFLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ2xFLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ25FLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ3BFLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ3JFLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ3JFLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBRXJFLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQ3BFLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQ3BFLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ2xFLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBRWxFLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ2xFLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQ3BFLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQ25FLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUs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Q0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDN0YsZUFBZSxDQUFDLEtBQUssRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFN0YsbUNBQW1DO1FBQ25DLGVBQWUsQ0FBQyxLQUFLLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzVGLGVBQWUsQ0FBQyxLQUFLLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRTVGLCtCQUErQjtRQUMvQixlQUFlLENBQUMsS0FBSyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUks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