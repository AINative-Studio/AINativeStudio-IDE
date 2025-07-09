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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0QnJhY2tldFBhaXJzSW5SYW5nZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci90ZXN0L2NvbW1vbi9tb2RlbC9icmFja2V0UGFpckNvbG9yaXplci9nZXRCcmFja2V0UGFpcnNJblJhbmdlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBbUIsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDM0YsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDbkcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUV6RCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUN2RSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUM1RSxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUc5RyxPQUFPLEVBQUUsU0FBUyxFQUFFLGlCQUFpQixFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFDbkUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLG9CQUFvQixFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFFbkYsS0FBSyxDQUFDLGlEQUFpRCxFQUFFLEdBQUcsRUFBRTtJQUU3RCx1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLFNBQVMsd0NBQXdDLENBQUMsS0FBc0IsRUFBRSxJQUFZO1FBQ3JGLE1BQU0sVUFBVSxHQUFHLGNBQWMsQ0FBQztRQUNsQyxNQUFNLG9CQUFvQixHQUFHLG1CQUFtQixDQUFDLEtBQUssQ0FBQyxDQUFDO1FB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