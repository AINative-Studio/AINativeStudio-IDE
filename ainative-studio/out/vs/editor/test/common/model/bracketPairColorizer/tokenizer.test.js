/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { EncodedTokenizationResult, TokenizationRegistry } from '../../../../common/languages.js';
import { ILanguageService } from '../../../../common/languages/language.js';
import { ILanguageConfigurationService } from '../../../../common/languages/languageConfigurationRegistry.js';
import { LanguageAgnosticBracketTokens } from '../../../../common/model/bracketPairsTextModelPart/bracketPairsTree/brackets.js';
import { lengthAdd, lengthsToRange, lengthZero } from '../../../../common/model/bracketPairsTextModelPart/bracketPairsTree/length.js';
import { DenseKeyProvider } from '../../../../common/model/bracketPairsTextModelPart/bracketPairsTree/smallImmutableSet.js';
import { TextBufferTokenizer } from '../../../../common/model/bracketPairsTextModelPart/bracketPairsTree/tokenizer.js';
import { createModelServices, instantiateTextModel } from '../../testTextModel.js';
suite('Bracket Pair Colorizer - Tokenizer', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('Basic', () => {
        const mode1 = 'testMode1';
        const disposableStore = new DisposableStore();
        const instantiationService = createModelServices(disposableStore);
        const languageConfigurationService = instantiationService.get(ILanguageConfigurationService);
        const languageService = instantiationService.get(ILanguageService);
        disposableStore.add(languageService.registerLanguage({ id: mode1 }));
        const encodedMode1 = languageService.languageIdCodec.encodeLanguageId(mode1);
        const denseKeyProvider = new DenseKeyProvider();
        const tStandard = (text) => new TokenInfo(text, encodedMode1, 0 /* StandardTokenType.Other */, true);
        const tComment = (text) => new TokenInfo(text, encodedMode1, 1 /* StandardTokenType.Comment */, true);
        const document = new TokenizedDocument([
            tStandard(' { } '), tStandard('be'), tStandard('gin end'), tStandard('\n'),
            tStandard('hello'), tComment('{'), tStandard('}'),
        ]);
        disposableStore.add(TokenizationRegistry.register(mode1, document.getTokenizationSupport()));
        disposableStore.add(languageConfigurationService.register(mode1, {
            brackets: [['{', '}'], ['[', ']'], ['(', ')'], ['begin', 'end']],
        }));
        const model = disposableStore.add(instantiateTextModel(instantiationService, document.getText(), mode1));
        model.tokenization.forceTokenization(model.getLineCount());
        const brackets = new LanguageAgnosticBracketTokens(denseKeyProvider, l => languageConfigurationService.getLanguageConfiguration(l));
        const tokens = readAllTokens(new TextBufferTokenizer(model, brackets));
        assert.deepStrictEqual(toArr(tokens, model, denseKeyProvider), [
            { text: ' ', bracketId: null, bracketIds: [], kind: 'Text' },
            {
                text: '{',
                bracketId: 'testMode1:::{',
                bracketIds: ['testMode1:::{'],
                kind: 'OpeningBracket',
            },
            { text: ' ', bracketId: null, bracketIds: [], kind: 'Text' },
            {
                text: '}',
                bracketId: 'testMode1:::{',
                bracketIds: ['testMode1:::{'],
                kind: 'ClosingBracket',
            },
            { text: ' ', bracketId: null, bracketIds: [], kind: 'Text' },
            {
                text: 'begin',
                bracketId: 'testMode1:::begin',
                bracketIds: ['testMode1:::begin'],
                kind: 'OpeningBracket',
            },
            { text: ' ', bracketId: null, bracketIds: [], kind: 'Text' },
            {
                text: 'end',
                bracketId: 'testMode1:::begin',
                bracketIds: ['testMode1:::begin'],
                kind: 'ClosingBracket',
            },
            { text: '\nhello{', bracketId: null, bracketIds: [], kind: 'Text' },
            {
                text: '}',
                bracketId: 'testMode1:::{',
                bracketIds: ['testMode1:::{'],
                kind: 'ClosingBracket',
            },
        ]);
        disposableStore.dispose();
    });
});
function readAllTokens(tokenizer) {
    const tokens = new Array();
    while (true) {
        const token = tokenizer.read();
        if (!token) {
            break;
        }
        tokens.push(token);
    }
    return tokens;
}
function toArr(tokens, model, keyProvider) {
    const result = new Array();
    let offset = lengthZero;
    for (const token of tokens) {
        result.push(tokenToObj(token, offset, model, keyProvider));
        offset = lengthAdd(offset, token.length);
    }
    return result;
}
function tokenToObj(token, offset, model, keyProvider) {
    return {
        text: model.getValueInRange(lengthsToRange(offset, lengthAdd(offset, token.length))),
        bracketId: keyProvider.reverseLookup(token.bracketId) || null,
        bracketIds: keyProvider.reverseLookupSet(token.bracketIds),
        kind: {
            [2 /* TokenKind.ClosingBracket */]: 'ClosingBracket',
            [1 /* TokenKind.OpeningBracket */]: 'OpeningBracket',
            [0 /* TokenKind.Text */]: 'Text',
        }[token.kind]
    };
}
export class TokenizedDocument {
    constructor(tokens) {
        const tokensByLine = new Array();
        let curLine = new Array();
        for (const token of tokens) {
            const lines = token.text.split('\n');
            let first = true;
            while (lines.length > 0) {
                if (!first) {
                    tokensByLine.push(curLine);
                    curLine = new Array();
                }
                else {
                    first = false;
                }
                if (lines[0].length > 0) {
                    curLine.push(token.withText(lines[0]));
                }
                lines.pop();
            }
        }
        tokensByLine.push(curLine);
        this.tokensByLine = tokensByLine;
    }
    getText() {
        return this.tokensByLine.map(t => t.map(t => t.text).join('')).join('\n');
    }
    getTokenizationSupport() {
        class State {
            constructor(lineNumber) {
                this.lineNumber = lineNumber;
            }
            clone() {
                return new State(this.lineNumber);
            }
            equals(other) {
                return this.lineNumber === other.lineNumber;
            }
        }
        return {
            getInitialState: () => new State(0),
            tokenize: () => { throw new Error('Method not implemented.'); },
            tokenizeEncoded: (line, hasEOL, state) => {
                const state2 = state;
                const tokens = this.tokensByLine[state2.lineNumber];
                const arr = new Array();
                let offset = 0;
                for (const t of tokens) {
                    arr.push(offset, t.getMetadata());
                    offset += t.text.length;
                }
                return new EncodedTokenizationResult(new Uint32Array(arr), new State(state2.lineNumber + 1));
            }
        };
    }
}
export class TokenInfo {
    constructor(text, languageId, tokenType, hasBalancedBrackets) {
        this.text = text;
        this.languageId = languageId;
        this.tokenType = tokenType;
        this.hasBalancedBrackets = hasBalancedBrackets;
    }
    getMetadata() {
        return ((((this.languageId << 0 /* MetadataConsts.LANGUAGEID_OFFSET */) |
            (this.tokenType << 8 /* MetadataConsts.TOKEN_TYPE_OFFSET */)) >>>
            0) |
            (this.hasBalancedBrackets ? 1024 /* MetadataConsts.BALANCED_BRACKETS_MASK */ : 0));
    }
    withText(text) {
        return new TokenInfo(text, this.languageId, this.tokenType, this.hasBalancedBrackets);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9rZW5pemVyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3Rlc3QvY29tbW9uL21vZGVsL2JyYWNrZXRQYWlyQ29sb3JpemVyL3Rva2VuaXplci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDMUUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFFbkcsT0FBTyxFQUFFLHlCQUF5QixFQUFnQyxvQkFBb0IsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ2hJLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQzVFLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQzlHLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLGlGQUFpRixDQUFDO0FBQ2hJLE9BQU8sRUFBVSxTQUFTLEVBQUUsY0FBYyxFQUFFLFVBQVUsRUFBRSxNQUFNLCtFQUErRSxDQUFDO0FBQzlJLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDBGQUEwRixDQUFDO0FBQzVILE9BQU8sRUFBRSxtQkFBbUIsRUFBK0IsTUFBTSxrRkFBa0YsQ0FBQztBQUVwSixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUVuRixLQUFLLENBQUMsb0NBQW9DLEVBQUUsR0FBRyxFQUFFO0lBRWhELHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUU7UUFDbEIsTUFBTSxLQUFLLEdBQUcsV0FBVyxDQUFDO1FBQzFCLE1BQU0s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