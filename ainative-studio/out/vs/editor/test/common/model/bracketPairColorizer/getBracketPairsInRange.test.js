/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { disposeOnReturn } from '../../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { Position } from '../../../../common/core/position.js';
import { Range } from '../../../../common/core/range.js';
import { TokenizationRegistry } from '../../../../common/languages.js';
import { ILanguageService } from '../../../../common/languages/language.js';
import { ILanguageConfigurationService } from '../../../../common/languages/languageConfigurationRegistry.js';
import { TokenInfo, TokenizedDocument } from './tokenizer.test.js';
import { createModelServices, instantiateTextModel } from '../../testTextModel.js';
suite('Bracket Pair Colorizer - getBracketPairsInRange', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    function createTextModelWithColorizedBracketPairs(store, text) {
        const languageId = 'testLanguage';
        const instantiationService = createModelServices(store);
        const languageConfigurationService = instantiationService.get(ILanguageConfigurationService);
        const languageService = instantiationService.get(ILanguageService);
        store.add(languageService.registerLanguage({
            id: languageId,
        }));
        const encodedMode1 = languageService.languageIdCodec.encodeLanguageId(languageId);
        const document = new TokenizedDocument([
            new TokenInfo(text, encodedMode1, 0 /* StandardTokenType.Other */, true)
        ]);
        store.add(TokenizationRegistry.register(languageId, document.getTokenizationSupport()));
        store.add(languageConfigurationService.register(languageId, {
            brackets: [
                ['<', '>']
            ],
            colorizedBracketPairs: [
                ['{', '}'],
                ['[', ']'],
                ['(', ')'],
            ]
        }));
        const textModel = store.add(instantiateTextModel(instantiationService, text, languageId));
        return textModel;
    }
    test('Basic 1', () => {
        disposeOnReturn(store => {
            const doc = new AnnotatedDocument(`{ ( [] ¹ ) [ ² { } ] () } []`);
            const model = createTextModelWithColorizedBracketPairs(store, doc.text);
            model.tokenization.getLineTokens(1).getLanguageId(0);
            assert.deepStrictEqual(model.bracketPairs
                .getBracketPairsInRange(doc.range(1, 2))
                .map(bracketPairToJSON)
                .toArray(), [
                {
                    level: 0,
                    range: '[1,1 -> 1,2]',
                    openRange: '[1,1 -> 1,2]',
                    closeRange: '[1,23 -> 1,24]',
                },
                {
                    level: 1,
                    range: '[1,3 -> 1,4]',
                    openRange: '[1,3 -> 1,4]',
                    closeRange: '[1,9 -> 1,10]',
                },
                {
                    level: 1,
                    range: '[1,11 -> 1,12]',
                    openRange: '[1,11 -> 1,12]',
                    closeRange: '[1,18 -> 1,19]',
                },
            ]);
        });
    });
    test('Basic 2', () => {
        disposeOnReturn(store => {
            const doc = new AnnotatedDocument(`{ ( [] ¹ ²) [  { } ] () } []`);
            const model = createTextModelWithColorizedBracketPairs(store, doc.text);
            assert.deepStrictEqual(model.bracketPairs
                .getBracketPairsInRange(doc.range(1, 2))
                .map(bracketPairToJSON)
                .toArray(), [
                {
                    level: 0,
                    range: '[1,1 -> 1,2]',
                    openRange: '[1,1 -> 1,2]',
                    closeRange: '[1,23 -> 1,24]',
                },
                {
                    level: 1,
                    range: '[1,3 -> 1,4]',
                    openRange: '[1,3 -> 1,4]',
                    closeRange: '[1,9 -> 1,10]',
                },
            ]);
        });
    });
    test('Basic Empty', () => {
        disposeOnReturn(store => {
            const doc = new AnnotatedDocument(`¹ ² { ( [] ) [  { } ] () } []`);
            const model = createTextModelWithColorizedBracketPairs(store, doc.text);
            assert.deepStrictEqual(model.bracketPairs
                .getBracketPairsInRange(doc.range(1, 2))
                .map(bracketPairToJSON)
                .toArray(), []);
        });
    });
    test('Basic All', () => {
        disposeOnReturn(store => {
            const doc = new AnnotatedDocument(`¹ { ( [] ) [  { } ] () } [] ²`);
            const model = createTextModelWithColorizedBracketPairs(store, doc.text);
            assert.deepStrictEqual(model.bracketPairs
                .getBracketPairsInRange(doc.range(1, 2))
                .map(bracketPairToJSON)
                .toArray(), [
                {
                    level: 0,
                    range: '[1,2 -> 1,3]',
                    openRange: '[1,2 -> 1,3]',
                    closeRange: '[1,23 -> 1,24]',
                },
                {
                    level: 1,
                    range: '[1,4 -> 1,5]',
                    openRange: '[1,4 -> 1,5]',
                    closeRange: '[1,9 -> 1,10]',
                },
                {
                    level: 2,
                    range: '[1,6 -> 1,7]',
                    openRange: '[1,6 -> 1,7]',
                    closeRange: '[1,7 -> 1,8]',
                },
                {
                    level: 1,
                    range: '[1,11 -> 1,12]',
                    openRange: '[1,11 -> 1,12]',
                    closeRange: '[1,18 -> 1,19]',
                },
                {
                    level: 2,
                    range: '[1,14 -> 1,15]',
                    openRange: '[1,14 -> 1,15]',
                    closeRange: '[1,16 -> 1,17]',
                },
                {
                    level: 1,
                    range: '[1,20 -> 1,21]',
                    openRange: '[1,20 -> 1,21]',
                    closeRange: '[1,21 -> 1,22]',
                },
                {
                    level: 0,
                    range: '[1,25 -> 1,26]',
                    openRange: '[1,25 -> 1,26]',
                    closeRange: '[1,26 -> 1,27]',
                },
            ]);
        });
    });
    test('getBracketsInRange', () => {
        disposeOnReturn(store => {
            const doc = new AnnotatedDocument(`¹ { [ ( [ [ (  ) ] ] ) ] } { } ²`);
            const model = createTextModelWithColorizedBracketPairs(store, doc.text);
            assert.deepStrictEqual(model.bracketPairs
                .getBracketsInRange(doc.range(1, 2))
                .map(b => ({ level: b.nestingLevel, levelEqualBracketType: b.nestingLevelOfEqualBracketType, range: b.range.toString() }))
                .toArray(), [
                {
                    level: 0,
                    levelEqualBracketType: 0,
                    range: "[1,2 -> 1,3]"
                },
                {
                    level: 1,
                    levelEqualBracketType: 0,
                    range: "[1,4 -> 1,5]"
                },
                {
                    level: 2,
                    levelEqualBracketType: 0,
                    range: "[1,6 -> 1,7]"
                },
                {
                    level: 3,
                    levelEqualBracketType: 1,
                    range: "[1,8 -> 1,9]"
                },
                {
                    level: 4,
                    levelEqualBracketType: 2,
                    range: "[1,10 -> 1,11]"
                },
                {
                    level: 5,
                    levelEqualBracketType: 1,
                    range: "[1,12 -> 1,13]"
                },
                {
                    level: 5,
                    levelEqualBracketType: 1,
                    range: "[1,15 -> 1,16]"
                },
                {
                    level: 4,
                    levelEqualBracketType: 2,
                    range: "[1,17 -> 1,18]"
                },
                {
                    level: 3,
                    levelEqualBracketType: 1,
                    range: "[1,19 -> 1,20]"
                },
                {
                    level: 2,
                    levelEqualBracketType: 0,
                    range: "[1,21 -> 1,22]"
                },
                {
                    level: 1,
                    levelEqualBracketType: 0,
                    range: "[1,23 -> 1,24]"
                },
                {
                    level: 0,
                    levelEqualBracketType: 0,
                    range: "[1,25 -> 1,26]"
                },
                {
                    level: 0,
                    levelEqualBracketType: 0,
                    range: "[1,27 -> 1,28]"
                },
                {
                    level: 0,
                    levelEqualBracketType: 0,
                    range: "[1,29 -> 1,30]"
                },
            ]);
        });
    });
    test('Test Error Brackets', () => {
        disposeOnReturn(store => {
            const doc = new AnnotatedDocument(`¹ { () ] ² `);
            const model = createTextModelWithColorizedBracketPairs(store, doc.text);
            assert.deepStrictEqual(model.bracketPairs
                .getBracketsInRange(doc.range(1, 2))
                .map(b => ({ level: b.nestingLevel, range: b.range.toString(), isInvalid: b.isInvalid }))
                .toArray(), [
                {
                    level: 0,
                    isInvalid: true,
                    range: "[1,2 -> 1,3]",
                },
                {
                    level: 1,
                    isInvalid: false,
                    range: "[1,4 -> 1,5]",
                },
                {
                    level: 1,
                    isInvalid: false,
                    range: "[1,5 -> 1,6]",
                },
                {
                    level: 0,
                    isInvalid: true,
                    range: "[1,7 -> 1,8]"
                }
            ]);
        });
    });
    test('colorizedBracketsVSBrackets', () => {
        disposeOnReturn(store => {
            const doc = new AnnotatedDocument(`¹ {} [<()>] <{>} ²`);
            const model = createTextModelWithColorizedBracketPairs(store, doc.text);
            assert.deepStrictEqual(model.bracketPairs
                .getBracketsInRange(doc.range(1, 2), true)
                .map(b => ({ level: b.nestingLevel, levelEqualBracketType: b.nestingLevelOfEqualBracketType, range: b.range.toString() }))
                .toArray(), [
                {
                    level: 0,
                    levelEqualBracketType: 0,
                    range: "[1,2 -> 1,3]",
                },
                {
                    level: 0,
                    levelEqualBracketType: 0,
                    range: "[1,3 -> 1,4]",
                },
                {
                    level: 0,
                    levelEqualBracketType: 0,
                    range: "[1,5 -> 1,6]",
                },
                {
                    level: 1,
                    levelEqualBracketType: 0,
                    range: "[1,7 -> 1,8]",
                },
                {
                    level: 1,
                    levelEqualBracketType: 0,
                    range: "[1,8 -> 1,9]",
                },
                {
                    level: 0,
                    levelEqualBracketType: 0,
                    range: "[1,10 -> 1,11]",
                },
                {
                    level: 0,
                    levelEqualBracketType: 0,
                    range: "[1,13 -> 1,14]",
                },
                {
                    level: -1,
                    levelEqualBracketType: 0,
                    range: "[1,15 -> 1,16]",
                },
            ]);
            assert.deepStrictEqual(model.bracketPairs
                .getBracketsInRange(doc.range(1, 2), false)
                .map(b => ({ level: b.nestingLevel, levelEqualBracketType: b.nestingLevelOfEqualBracketType, range: b.range.toString() }))
                .toArray(), [
                {
                    level: 0,
                    levelEqualBracketType: 0,
                    range: "[1,2 -> 1,3]",
                },
                {
                    level: 0,
                    levelEqualBracketType: 0,
                    range: "[1,3 -> 1,4]",
                },
                {
                    level: 0,
                    levelEqualBracketType: 0,
                    range: "[1,5 -> 1,6]",
                },
                {
                    level: 1,
                    levelEqualBracketType: 0,
                    range: "[1,6 -> 1,7]",
                },
                {
                    level: 2,
                    levelEqualBracketType: 0,
                    range: "[1,7 -> 1,8]",
                },
                {
                    level: 2,
                    levelEqualBracketType: 0,
                    range: "[1,8 -> 1,9]",
                },
                {
                    level: 1,
                    levelEqualBracketType: 0,
                    range: "[1,9 -> 1,10]",
                },
                {
                    level: 0,
                    levelEqualBracketType: 0,
                    range: "[1,10 -> 1,11]",
                },
                {
                    level: 0,
                    levelEqualBracketType: 0,
                    range: "[1,12 -> 1,13]",
                },
                {
                    level: 1,
                    levelEqualBracketType: 0,
                    range: "[1,13 -> 1,14]",
                },
                {
                    level: 0,
                    levelEqualBracketType: 0,
                    range: "[1,14 -> 1,15]",
                },
                {
                    level: -1,
                    levelEqualBracketType: 0,
                    range: "[1,15 -> 1,16]",
                },
            ]);
        });
    });
});
function bracketPairToJSON(pair) {
    return {
        level: pair.nestingLevel,
        range: pair.openingBracketRange.toString(),
        openRange: pair.openingBracketRange.toString(),
        closeRange: pair.closingBracketRange?.toString() || null,
    };
}
class PositionOffsetTransformer {
    constructor(text) {
        this.lineStartOffsetByLineIdx = [];
        this.lineStartOffsetByLineIdx.push(0);
        for (let i = 0; i < text.length; i++) {
            if (text.charAt(i) === '\n') {
                this.lineStartOffsetByLineIdx.push(i + 1);
            }
        }
    }
    getOffset(position) {
        return this.lineStartOffsetByLineIdx[position.lineNumber - 1] + position.column - 1;
    }
    getPosition(offset) {
        const lineNumber = this.lineStartOffsetByLineIdx.findIndex(lineStartOffset => lineStartOffset <= offset);
        return new Position(lineNumber + 1, offset - this.lineStartOffsetByLineIdx[lineNumber] + 1);
    }
}
class AnnotatedDocument {
    constructor(src) {
        const numbers = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];
        let text = '';
        const offsetPositions = new Map();
        let offset = 0;
        for (let i = 0; i < src.length; i++) {
            const idx = numbers.indexOf(src[i]);
            if (idx >= 0) {
                offsetPositions.set(idx, offset);
            }
            else {
                text += src[i];
                offset++;
            }
        }
        this.text = text;
        const mapper = new PositionOffsetTransformer(this.text);
        const positions = new Map();
        for (const [idx, offset] of offsetPositions.entries()) {
            positions.set(idx, mapper.getPosition(offset));
        }
        this.positions = positions;
    }
    range(start, end) {
        return Range.fromPositions(this.positions.get(start), this.positions.get(end));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0QnJhY2tldFBhaXJzSW5SYW5nZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvdGVzdC9jb21tb24vbW9kZWwvYnJhY2tldFBhaXJDb2xvcml6ZXIvZ2V0QnJhY2tldFBhaXJzSW5SYW5nZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQW1CLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzNGLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ25HLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFFekQsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDdkUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDNUUsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFHOUcsT0FBTyxFQUFFLFNBQVMsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBQ25FLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBRW5GLEtBQUssQ0FBQyxpREFBaUQsRUFBRSxHQUFHLEVBQUU7SUFFN0QsdUNBQXVDLEVBQUUsQ0FBQztJQUUxQyxTQUFTLHdDQUF3QyxDQUFDLEtBQXNCLEVBQUUsSUFBWTtRQUNyRixNQUFNLFVBQVUsR0FBRyxjQUFjLENBQUM7UUFDbEMsTUFBTSxvQkFBb0IsR0FBRyxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsQ0FB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