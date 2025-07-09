/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { StandardAutoClosingPairConditional } from '../../../../common/languages/languageConfiguration.js';
import { CharacterPairSupport } from '../../../../common/languages/supports/characterPair.js';
import { createFakeScopedLineTokens } from '../../modesTestUtils.js';
suite('CharacterPairSupport', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('only autoClosingPairs', () => {
        const characaterPairSupport = new CharacterPairSupport({ autoClosingPairs: [{ open: 'a', close: 'b' }] });
        assert.deepStrictEqual(characaterPairSupport.getAutoClosingPairs(), [new StandardAutoClosingPairConditional({ open: 'a', close: 'b' })]);
        assert.deepStrictEqual(characaterPairSupport.getSurroundingPairs(), [new StandardAutoClosingPairConditional({ open: 'a', close: 'b' })]);
    });
    test('only empty autoClosingPairs', () => {
        const characaterPairSupport = new CharacterPairSupport({ autoClosingPairs: [] });
        assert.deepStrictEqual(characaterPairSupport.getAutoClosingPairs(), []);
        assert.deepStrictEqual(characaterPairSupport.getSurroundingPairs(), []);
    });
    test('only brackets', () => {
        const characaterPairSupport = new CharacterPairSupport({ brackets: [['a', 'b']] });
        assert.deepStrictEqual(characaterPairSupport.getAutoClosingPairs(), [new StandardAutoClosingPairConditional({ open: 'a', close: 'b' })]);
        assert.deepStrictEqual(characaterPairSupport.getSurroundingPairs(), [new StandardAutoClosingPairConditional({ open: 'a', close: 'b' })]);
    });
    test('only empty brackets', () => {
        const characaterPairSupport = new CharacterPairSupport({ brackets: [] });
        assert.deepStrictEqual(characaterPairSupport.getAutoClosingPairs(), []);
        assert.deepStrictEqual(characaterPairSupport.getSurroundingPairs(), []);
    });
    test('only surroundingPairs', () => {
        const characaterPairSupport = new CharacterPairSupport({ surroundingPairs: [{ open: 'a', close: 'b' }] });
        assert.deepStrictEqual(characaterPairSupport.getAutoClosingPairs(), []);
        assert.deepStrictEqual(characaterPairSupport.getSurroundingPairs(), [{ open: 'a', close: 'b' }]);
    });
    test('only empty surroundingPairs', () => {
        const characaterPairSupport = new CharacterPairSupport({ surroundingPairs: [] });
        assert.deepStrictEqual(characaterPairSupport.getAutoClosingPairs(), []);
        assert.deepStrictEqual(characaterPairSupport.getSurroundingPairs(), []);
    });
    test('brackets is ignored when having autoClosingPairs', () => {
        const characaterPairSupport = new CharacterPairSupport({ autoClosingPairs: [], brackets: [['a', 'b']] });
        assert.deepStrictEqual(characaterPairSupport.getAutoClosingPairs(), []);
        assert.deepStrictEqual(characaterPairSupport.getSurroundingPairs(), []);
    });
    function testShouldAutoClose(characterPairSupport, line, column) {
        const autoClosingPair = characterPairSupport.getAutoClosingPairs()[0];
        return autoClosingPair.shouldAutoClose(createFakeScopedLineTokens(line), column);
    }
    test('shouldAutoClosePair in empty line', () => {
        const sup = new CharacterPairSupport({ autoClosingPairs: [{ open: '{', close: '}', notIn: ['string', 'comment'] }] });
        const tokenText = [];
        assert.strictEqual(testShouldAutoClose(sup, tokenText, 1), true);
    });
    test('shouldAutoClosePair in not interesting line 1', () => {
        const sup = new CharacterPairSupport({ autoClosingPairs: [{ open: '{', close: '}', notIn: ['string', 'comment'] }] });
        const tokenText = [
            { text: 'do', type: 0 /* StandardTokenType.Other */ }
        ];
        assert.strictEqual(testShouldAutoClose(sup, tokenText, 3), true);
    });
    test('shouldAutoClosePair in not interesting line 2', () => {
        const sup = new CharacterPairSupport({ autoClosingPairs: [{ open: '{', close: '}' }] });
        const tokenText = [
            { text: 'do', type: 2 /* StandardTokenType.String */ }
        ];
        assert.strictEqual(testShouldAutoClose(sup, tokenText, 3), true);
    });
    test('shouldAutoClosePair in interesting line 1', () => {
        const sup = new CharacterPairSupport({ autoClosingPairs: [{ open: '{', close: '}', notIn: ['string', 'comment'] }] });
        const tokenText = [
            { text: '"a"', type: 2 /* StandardTokenType.String */ }
        ];
        assert.strictEqual(testShouldAutoClose(sup, tokenText, 1), false);
        assert.strictEqual(testShouldAutoClose(sup, tokenText, 2), false);
        assert.strictEqual(testShouldAutoClose(sup, tokenText, 3), false);
        assert.strictEqual(testShouldAutoClose(sup, tokenText, 4), false);
    });
    test('shouldAutoClosePair in interesting line 2', () => {
        const sup = new CharacterPairSupport({ autoClosingPairs: [{ open: '{', close: '}', notIn: ['string', 'comment'] }] });
        const tokenText = [
            { text: 'x=', type: 0 /* StandardTokenType.Other */ },
            { text: '"a"', type: 2 /* StandardTokenType.String */ },
            { text: ';', type: 0 /* StandardTokenType.Other */ }
        ];
        assert.strictEqual(testShouldAutoClose(sup, tokenText, 1), true);
        assert.strictEqual(testShouldAutoClose(sup, tokenText, 2), true);
        assert.strictEqual(testShouldAutoClose(sup, tokenText, 3), true);
        assert.strictEqual(testShouldAutoClose(sup, tokenText, 4), false);
        assert.strictEqual(testShouldAutoClose(sup, tokenText, 5), false);
        assert.strictEqual(testShouldAutoClose(sup, tokenText, 6), false);
        assert.strictEqual(testShouldAutoClose(sup, tokenText, 7), true);
    });
    test('shouldAutoClosePair in interesting line 3', () => {
        const sup = new CharacterPairSupport({ autoClosingPairs: [{ open: '{', close: '}', notIn: ['string', 'comment'] }] });
        const tokenText = [
            { text: ' ', type: 0 /* StandardTokenType.Other */ },
            { text: '//a', type: 1 /* StandardTokenType.Comment */ }
        ];
        assert.strictEqual(testShouldAutoClose(sup, tokenText, 1), true);
        assert.strictEqual(testShouldAutoClose(sup, tokenText, 2), true);
        assert.strictEqual(testShouldAutoClose(sup, tokenText, 3), false);
        assert.strictEqual(testShouldAutoClose(sup, tokenText, 4), false);
        assert.strictEqual(testShouldAutoClose(sup, tokenText, 5), false);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhcmFjdGVyUGFpci50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci90ZXN0L2NvbW1vbi9tb2Rlcy9zdXBwb3J0cy9jaGFyYWN0ZXJQYWlyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBRW5HLE9BQU8sRUFBRSxrQ0FBa0MsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQzNHLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBQzlGLE9BQU8sRUFBYSwwQkFBMEIsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBRWhGLEtBQUssQ0FBQyxzQkFBc0IsRUFBRSxHQUFHLEVBQUU7SUFFbEMsdUNBQXVDLEVBQUUsQ0FBQztJQUUxQyxJQUFJLENBQUMsdUJBQXVCLEVBQUUsR0FBRyxFQUFFO1FBQ2xDLE1BQU0scUJBQXFCLEdBQUcsSUFBSSxvQkFBb0IsQ0FBQyxFQUFFLGdCQUFnQixFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUMxRyxNQUFNLENBQUMsZUFBZSxDQUFDLHFCQUFxQixDQUFDLG1CQUFtQixFQUFFLEVBQUUsQ0FBQyxJQUFJLGtDQUFrQyxDQUFDLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDekksTUFBTSxDQUFDLGVBQWUsQ0FBQyxxQkFBcUIsQ0FBQyxtQkFBbUIsRUFBRSxFQUFFLENBQUMsSUFBSSxrQ0FBa0MsQ0FBQyxFQUFFLElBQUks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