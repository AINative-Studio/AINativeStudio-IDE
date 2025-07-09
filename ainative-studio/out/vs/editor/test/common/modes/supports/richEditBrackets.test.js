/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { BracketsUtils } from '../../../../common/languages/supports/richEditBrackets.js';
suite('richEditBrackets', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    function findPrevBracketInRange(reversedBracketRegex, lineText, currentTokenStart, currentTokenEnd) {
        return BracketsUtils.findPrevBracketInRange(reversedBracketRegex, 1, lineText, currentTokenStart, currentTokenEnd);
    }
    function findNextBracketInRange(forwardBracketRegex, lineText, currentTokenStart, currentTokenEnd) {
        return BracketsUtils.findNextBracketInRange(forwardBracketRegex, 1, lineText, currentTokenStart, currentTokenEnd);
    }
    test('findPrevBracketInToken one char 1', () => {
        const result = findPrevBracketInRange(/(\{)|(\})/i, '{', 0, 1);
        assert.strictEqual(result.startColumn, 1);
        assert.strictEqual(result.endColumn, 2);
    });
    test('findPrevBracketInToken one char 2', () => {
        const result = findPrevBracketInRange(/(\{)|(\})/i, '{{', 0, 1);
        assert.strictEqual(result.startColumn, 1);
        assert.strictEqual(result.endColumn, 2);
    });
    test('findPrevBracketInToken one char 3', () => {
        const result = findPrevBracketInRange(/(\{)|(\})/i, '{hello world!', 0, 13);
        assert.strictEqual(result.startColumn, 1);
        assert.strictEqual(result.endColumn, 2);
    });
    test('findPrevBracketInToken more chars 1', () => {
        const result = findPrevBracketInRange(/(olleh)/i, 'hello world!', 0, 12);
        assert.strictEqual(result.startColumn, 1);
        assert.strictEqual(result.endColumn, 6);
    });
    test('findPrevBracketInToken more chars 2', () => {
        const result = findPrevBracketInRange(/(olleh)/i, 'hello world!', 0, 5);
        assert.strictEqual(result.startColumn, 1);
        assert.strictEqual(result.endColumn, 6);
    });
    test('findPrevBracketInToken more chars 3', () => {
        const result = findPrevBracketInRange(/(olleh)/i, ' hello world!', 0, 6);
        assert.strictEqual(result.startColumn, 2);
        assert.strictEqual(result.endColumn, 7);
    });
    test('findNextBracketInToken one char', () => {
        const result = findNextBracketInRange(/(\{)|(\})/i, '{', 0, 1);
        assert.strictEqual(result.startColumn, 1);
        assert.strictEqual(result.endColumn, 2);
    });
    test('findNextBracketInToken more chars', () => {
        const result = findNextBracketInRange(/(world)/i, 'hello world!', 0, 12);
        assert.strictEqual(result.startColumn, 7);
        assert.strictEqual(result.endColumn, 12);
    });
    test('findNextBracketInToken with emoty result', () => {
        const result = findNextBracketInRange(/(\{)|(\})/i, '', 0, 0);
        assert.strictEqual(result, null);
    });
    test('issue #3894: [Handlebars] Curly braces edit issues', () => {
        const result = findPrevBracketInRange(/(\-\-!<)|(>\-\-)|(\{\{)|(\}\})/i, '{{asd}}', 0, 2);
        assert.strictEqual(result.startColumn, 1);
        assert.strictEqual(result.endColumn, 3);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmljaEVkaXRCcmFja2V0cy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci90ZXN0L2NvbW1vbi9tb2Rlcy9zdXBwb3J0cy9yaWNoRWRpdEJyYWNrZXRzLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBRW5HLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQUUxRixLQUFLLENBQUMsa0JBQWtCLEVBQUUsR0FBRyxFQUFFO0lBRTlCLHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsU0FBUyxzQkFBc0IsQ0FBQyxvQkFBNEIsRUFBRSxRQUFnQixFQUFFLGlCQUF5QixFQUFFLGVBQXVCO1FBQ2pJLE9BQU8sYUFBYSxDQUFDLHNCQUFzQixDQUFDLG9CQUFvQixFQUFFLENBQUMsRUFBRSxRQUFRLEVBQUUsaUJBQWlCLEVBQUUsZUFBZSxDQUFDLENBQUM7SUFDcEgsQ0FBQztJQUVELFNBQVMsc0JBQXNCLENBQUMsbUJBQTJCLEVBQUUsUUFBZ0IsRUFBRSxpQkFBeUIsRUFBRSxlQUF1QjtRQUNoSSxPQUFPLGFBQWEsQ0FBQyxzQkFBc0IsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDLEVBQUUsUUFBUSxFQUFFLGlCQUFpQixFQUFFLGVBQWUsQ0FBQyxDQUFDO0lBQ25ILENBQUM7SUFFRCxJQUFJLENBQUMsbUNBQW1DLEVBQUUsR0FBRyxFQUFFO1FBQzlDLE1BQU0sTUFBTSxHQUFHLHNCQUFzQixDQUFDLFlBQVksRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQy9ELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTyxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMzQyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU8sQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDMUMsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsbUNBQW1DLEVBQUUsR0FBRyxFQUFFO1FBQzlDLE1BQU0sTUFBTSxHQUFHLHNCQUFzQixDQUFDLFlBQVksRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ2hFLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTyxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMzQyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU8sQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDMUMsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsbUNBQW1DLEVBQUUsR0FBRyxFQUFFO1FBQzlDLE1BQU0sTUFBTSxHQUFHLHNCQUFzQixDQUFDLFlBQVksRUFBRSxlQUFlLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQzVFLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTyxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMzQyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU8sQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDMUMsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMscUNBQXFDLEVBQUUsR0FBRyxFQUFFO1FBQ2hELE1BQU0sTUFBTSxHQUFHLHNCQUFzQixDQUFDLFVBQVUsRUFBRSxjQUFjLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ3pFLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTyxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMzQyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU8sQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDMUMsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMscUNBQXFDLEVBQUUsR0FBRyxFQUFFO1FBQ2hELE1BQU0sTUFBTSxHQUFHLHNCQUFzQixDQUFDLFVBQVUsRUFBRSxjQUFjLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3hFLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTyxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMzQyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU8sQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDMUMsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMscUNBQXFDLEVBQUUsR0FBRyxFQUFFO1FBQ2hELE1BQU0sTUFBTSxHQUFHLHNCQUFzQixDQUFDLFVBQVUsRUFBRSxlQUFlLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3pFLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTyxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMzQyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU8sQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDMUMsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsaUNBQWlDLEVBQUUsR0FBRyxFQUFFO1FBQzVDLE1BQU0sTUFBTSxHQUFHLHNCQUFzQixDQUFDLFlBQVksRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQy9ELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTyxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMzQyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU8sQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDMUMsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsbUNBQW1DLEVBQUUsR0FBRyxFQUFFO1FBQzlDLE1BQU0sTUFBTSxHQUFHLHNCQUFzQixDQUFDLFVBQVUsRUFBRSxjQUFjLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ3pFLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTyxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMzQyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU8sQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDM0MsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsMENBQTBDLEVBQUUsR0FBRyxFQUFFO1FBQ3JELE1BQU0sTUFBTSxHQUFHLHNCQUFzQixDQUFDLFlBQVksRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzlELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ2xDLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLG9EQUFvRCxFQUFFLEdBQUcsRUFBRTtRQUMvRCxNQUFNLE1BQU0sR0FBRyxzQkFBc0IsQ0FBQyxpQ0FBaUMsRUFBRSxTQUFTLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzFGLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTyxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMzQyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU8sQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDMUMsQ0FBQyxDQUFDLENBQUM7QUFFSixDQUFDLENBQUMsQ0FBQyJ9