/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { LanguageAgnosticBracketTokens } from '../../../../common/model/bracketPairsTextModelPart/bracketPairsTree/brackets.js';
import { SmallImmutableSet, DenseKeyProvider } from '../../../../common/model/bracketPairsTextModelPart/bracketPairsTree/smallImmutableSet.js';
import { TestLanguageConfigurationService } from '../../modes/testLanguageConfigurationService.js';
suite('Bracket Pair Colorizer - Brackets', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('Basic', () => {
        const languageId = 'testMode1';
        const denseKeyProvider = new DenseKeyProvider();
        const getImmutableSet = (elements) => {
            let newSet = SmallImmutableSet.getEmpty();
            elements.forEach(x => newSet = newSet.add(`${languageId}:::${x}`, denseKeyProvider));
            return newSet;
        };
        const getKey = (value) => {
            return denseKeyProvider.getKey(`${languageId}:::${value}`);
        };
        const disposableStore = new DisposableStore();
        const languageConfigService = disposableStore.add(new TestLanguageConfigurationService());
        disposableStore.add(languageConfigService.register(languageId, {
            brackets: [
                ['{', '}'], ['[', ']'], ['(', ')'],
                ['begin', 'end'], ['case', 'endcase'], ['casez', 'endcase'], // Verilog
                ['\\left(', '\\right)'], ['\\left(', '\\right.'], ['\\left.', '\\right)'], // LaTeX Parentheses
                ['\\left[', '\\right]'], ['\\left[', '\\right.'], ['\\left.', '\\right]'] // LaTeX Brackets
            ]
        }));
        const brackets = new LanguageAgnosticBracketTokens(denseKeyProvider, l => languageConfigService.getLanguageConfiguration(l));
        const bracketsExpected = [
            { text: '{', length: 1, kind: 'OpeningBracket', bracketId: getKey('{'), bracketIds: getImmutableSet(['{']) },
            { text: '[', length: 1, kind: 'OpeningBracket', bracketId: getKey('['), bracketIds: getImmutableSet(['[']) },
            { text: '(', length: 1, kind: 'OpeningBracket', bracketId: getKey('('), bracketIds: getImmutableSet(['(']) },
            { text: 'begin', length: 5, kind: 'OpeningBracket', bracketId: getKey('begin'), bracketIds: getImmutableSet(['begin']) },
            { text: 'case', length: 4, kind: 'OpeningBracket', bracketId: getKey('case'), bracketIds: getImmutableSet(['case']) },
            { text: 'casez', length: 5, kind: 'OpeningBracket', bracketId: getKey('casez'), bracketIds: getImmutableSet(['casez']) },
            { text: '\\left(', length: 6, kind: 'OpeningBracket', bracketId: getKey('\\left('), bracketIds: getImmutableSet(['\\left(']) },
            { text: '\\left.', length: 6, kind: 'OpeningBracket', bracketId: getKey('\\left.'), bracketIds: getImmutableSet(['\\left.']) },
            { text: '\\left[', length: 6, kind: 'OpeningBracket', bracketId: getKey('\\left['), bracketIds: getImmutableSet(['\\left[']) },
            { text: '}', length: 1, kind: 'ClosingBracket', bracketId: getKey('{'), bracketIds: getImmutableSet(['{']) },
            { text: ']', length: 1, kind: 'ClosingBracket', bracketId: getKey('['), bracketIds: getImmutableSet(['[']) },
            { text: ')', length: 1, kind: 'ClosingBracket', bracketId: getKey('('), bracketIds: getImmutableSet(['(']) },
            { text: 'end', length: 3, kind: 'ClosingBracket', bracketId: getKey('begin'), bracketIds: getImmutableSet(['begin']) },
            { text: 'endcase', length: 7, kind: 'ClosingBracket', bracketId: getKey('case'), bracketIds: getImmutableSet(['case', 'casez']) },
            { text: '\\right)', length: 7, kind: 'ClosingBracket', bracketId: getKey('\\left('), bracketIds: getImmutableSet(['\\left(', '\\left.']) },
            { text: '\\right.', length: 7, kind: 'ClosingBracket', bracketId: getKey('\\left('), bracketIds: getImmutableSet(['\\left(', '\\left[']) },
            { text: '\\right]', length: 7, kind: 'ClosingBracket', bracketId: getKey('\\left['), bracketIds: getImmutableSet(['\\left[', '\\left.']) }
        ];
        const bracketsActual = bracketsExpected.map(x => tokenToObject(brackets.getToken(x.text, languageId), x.text));
        assert.deepStrictEqual(bracketsActual, bracketsExpected);
        disposableStore.dispose();
    });
});
function tokenToObject(token, text) {
    if (token === undefined) {
        return undefined;
    }
    return {
        text: text,
        length: token.length,
        bracketId: token.bracketId,
        bracketIds: token.bracketIds,
        kind: {
            [2 /* TokenKind.ClosingBracket */]: 'ClosingBracket',
            [1 /* TokenKind.OpeningBracket */]: 'OpeningBracket',
            [0 /* TokenKind.Text */]: 'Text',
        }[token.kind],
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJhY2tldHMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvdGVzdC9jb21tb24vbW9kZWwvYnJhY2tldFBhaXJDb2xvcml6ZXIvYnJhY2tldHMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ25HLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLGlGQUFpRixDQUFDO0FBQ2hJLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDBGQUEwRixDQUFDO0FBRS9JLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBRW5HLEtBQUssQ0FBQyxtQ0FBbUMsRUFBRSxHQUFHLEVBQUU7SUFDL0MsdUNBQXVDLEVBQUUsQ0FBQztJQUUxQyxJQUFJLENBQUMsT0FBTyxFQUFFLEdBQUcsRUFBRTtRQUNsQixNQUFNLFVBQVUsR0FBRyxXQUFXLENBQUM7UUFDL0IsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLGdCQUFnQixFQUFVLENBQUM7UUFDeEQsTUFBTSxlQUFlLEdBQUcsQ0FBQyxRQUFrQixFQUFFLEVBQUU7WUFDOUMsSUFBSSxNQUFNLEdBQUcsaUJBQWlCLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDMUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLEdBQUcsVUFBVSxNQUFNLENBQUMsRUFBRSxFQUFFLGdCQUFnQixDQUFDLENBQUMsQ0FBQztZQUNyRixPQUFPLE1BQU0sQ0FBQztRQUNmLENBQUMsQ0FBQztRQUNGLE1BQU0sTUFBTSxHQUFHLENBQUMsS0FBYSxFQUFFLEVBQUU7WUFDaEMsT0FBTyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsR0FBRyxVQUFVLE1BQU0sS0FBSyxFQUFFLENBQUMsQ0FBQztRQUM1RCxDQUFDLENBQUM7UUFFRixNQUFNLGVBQWUsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO1FBQzlDLE1BQU0scUJBQXFCLEdBQUcsZUFBZSxDQUFDLEdBQUcsQ0FBQyxJQUFJLGdDQUFnQyxFQUFFLENBQUMsQ0FBQztRQUMxRixlQUFlLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLFFBQVEsQ0FBQyxVQUFVLEVBQUU7WUFDOUQsUUFBUSxFQUFFO2dCQUNULENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQztnQkFDbEMsQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUUsU0FBUyxDQUFDLEVBQU0sVUFBVTtnQkFDM0UsQ0FBQyxTQUFTLEVBQUUsVUFBVSxDQUFDLEVBQUUsQ0FBQyxTQUFTLEVBQUUsVUFBVSxDQUFDLEVBQUUsQ0FBQyxTQUFTLEVBQUUsVUFBVSxDQUFDLEVBQUcsb0JBQW9CO2dCQUNoRyxDQUFDLFNBQVMsRUFBRSxVQUFVLENBQUMsRUFBRSxDQUFDLFNBQVMsRUFBRSxVQUFVLENBQUMsRUFBRSxDQUFDLFNBQVMsRUFBRSxVQUFVLENBQUMsQ0FBRSxpQkFBaUI7YUFDNUY7U0FDRCxDQUFDLENBQUMsQ0FBQztRQUVKLE1BQU0sUUFBUSxHQUFHLElBQUksNkJBQTZCLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzdILE1BQU0sZ0JBQWdCLEdBQUc7WUFDeEIsRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLGdCQUFnQixFQUFFLFNBQVMsRUFBRSxNQUFNLENBQUMsR0FBRyxDQUFDLEVBQUUsVUFBVSxFQUFFLGVBQWUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUU7WUFDNUcsRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLGdCQUFnQixFQUFFLFNBQVMsRUFBRSxNQUFNLENBQUMsR0FBRyxDQUFDLEVBQUUsVUFBVSxFQUFFLGVBQWUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUU7WUFDNUcsRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLGdCQUFnQixFQUFFLFNBQVMsRUFBRSxNQUFNLENBQUMsR0FBRyxDQUFDLEVBQUUsVUFBVSxFQUFFLGVBQWUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUU7WUFDNUcsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLGdCQUFnQixFQUFFLFNBQVMsRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLEVBQUUsVUFBVSxFQUFFLGVBQWUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUU7WUFDeEgsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLGdCQUFnQixFQUFFLFNBQVMsRUFBRSxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsVUFBVSxFQUFFLGVBQWUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUU7WUFDckgsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLGdCQUFnQixFQUFFLFNBQVMsRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLEVBQUUsVUFBVSxFQUFFLGVBQWUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUU7WUFDeEgsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLGdCQUFnQixFQUFFLFNBQVMsRUFBRSxNQUFNLENBQUMsU0FBUyxDQUFDLEVBQUUsVUFBVSxFQUFFLGVBQWUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUU7WUFDOUgsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLGdCQUFnQixFQUFFLFNBQVMsRUFBRSxNQUFNLENBQUMsU0FBUyxDQUFDLEVBQUUsVUFBVSxFQUFFLGVBQWUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUU7WUFDOUgsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLGdCQUFnQixFQUFFLFNBQVMsRUFBRSxNQUFNLENBQUMsU0FBUyxDQUFDLEVBQUUsVUFBVSxFQUFFLGVBQWUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUU7WUFFOUgsRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLGdCQUFnQixFQUFFLFNBQVMsRUFBRSxNQUFNLENBQUMsR0FBRyxDQUFDLEVBQUUsVUFBVSxFQUFFLGVBQWUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUU7WUFDNUcsRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLGdCQUFnQixFQUFFLFNBQVMsRUFBRSxNQUFNLENBQUMsR0FBRyxDQUFDLEVBQUUsVUFBVSxFQUFFLGVBQWUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUU7WUFDNUcsRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLGdCQUFnQixFQUFFLFNBQVMsRUFBRSxNQUFNLENBQUMsR0FBRyxDQUFDLEVBQUUsVUFBVSxFQUFF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