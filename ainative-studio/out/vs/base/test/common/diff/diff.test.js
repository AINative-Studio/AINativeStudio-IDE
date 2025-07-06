/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { LcsDiff, StringDiffSequence } from '../../../common/diff/diff.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../utils.js';
function createArray(length, value) {
    const r = [];
    for (let i = 0; i < length; i++) {
        r[i] = value;
    }
    return r;
}
function maskBasedSubstring(str, mask) {
    let r = '';
    for (let i = 0; i < str.length; i++) {
        if (mask[i]) {
            r += str.charAt(i);
        }
    }
    return r;
}
function assertAnswer(originalStr, modifiedStr, changes, answerStr, onlyLength = false) {
    const originalMask = createArray(originalStr.length, true);
    const modifiedMask = createArray(modifiedStr.length, true);
    let i, j, change;
    for (i = 0; i < changes.length; i++) {
        change = changes[i];
        if (change.originalLength) {
            for (j = 0; j < change.originalLength; j++) {
                originalMask[change.originalStart + j] = false;
            }
        }
        if (change.modifiedLength) {
            for (j = 0; j < change.modifiedLength; j++) {
                modifiedMask[change.modifiedStart + j] = false;
            }
        }
    }
    const originalAnswer = maskBasedSubstring(originalStr, originalMask);
    const modifiedAnswer = maskBasedSubstring(modifiedStr, modifiedMask);
    if (onlyLength) {
        assert.strictEqual(originalAnswer.length, answerStr.length);
        assert.strictEqual(modifiedAnswer.length, answerStr.length);
    }
    else {
        assert.strictEqual(originalAnswer, answerStr);
        assert.strictEqual(modifiedAnswer, answerStr);
    }
}
function lcsInnerTest(originalStr, modifiedStr, answerStr, onlyLength = false) {
    const diff = new LcsDiff(new StringDiffSequence(originalStr), new StringDiffSequence(modifiedStr));
    const changes = diff.ComputeDiff(false).changes;
    assertAnswer(originalStr, modifiedStr, changes, answerStr, onlyLength);
}
function stringPower(str, power) {
    let r = str;
    for (let i = 0; i < power; i++) {
        r += r;
    }
    return r;
}
function lcsTest(originalStr, modifiedStr, answerStr) {
    lcsInnerTest(originalStr, modifiedStr, answerStr);
    for (let i = 2; i <= 5; i++) {
        lcsInnerTest(stringPower(originalStr, i), stringPower(modifiedStr, i), stringPower(answerStr, i), true);
    }
}
suite('Diff', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('LcsDiff - different strings tests', function () {
        this.timeout(10000);
        lcsTest('heLLo world', 'hello orlando', 'heo orld');
        lcsTest('abcde', 'acd', 'acd'); // simple
        lcsTest('abcdbce', 'bcede', 'bcde'); // skip
        lcsTest('abcdefgabcdefg', 'bcehafg', 'bceafg'); // long
        lcsTest('abcde', 'fgh', ''); // no match
        lcsTest('abcfabc', 'fabc', 'fabc');
        lcsTest('0azby0', '9axbzby9', 'azby');
        lcsTest('0abc00000', '9a1b2c399999', 'abc');
        lcsTest('fooBar', 'myfooBar', 'fooBar'); // all insertions
        lcsTest('fooBar', 'fooMyBar', 'fooBar'); // all insertions
        lcsTest('fooBar', 'fooBar', 'fooBar'); // identical sequences
    });
});
suite('Diff - Ported from VS', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('using continue processing predicate to quit early', function () {
        const left = 'abcdef';
        const right = 'abxxcyyydzzzzezzzzzzzzzzzzzzzzzzzzf';
        // We use a long non-matching portion at the end of the right-side string, so the backwards tracking logic
        // doesn't get there first.
        let predicateCallCount = 0;
        let diff = new LcsDiff(new StringDiffSequence(left), new StringDiffSequence(right), function (leftIndex, longestMatchSoFar) {
            assert.strictEqual(predicateCallCount, 0);
            predicateCallCount++;
            assert.strictEqual(leftIndex, 1);
            // cancel processing
            return false;
        });
        let changes = diff.ComputeDiff(true).changes;
        assert.strictEqual(predicateCallCount, 1);
        // Doesn't include 'c', 'd', or 'e', since we quit on the first request
        assertAnswer(left, right, changes, 'abf');
        // Cancel after the first match ('c')
        diff = new LcsDiff(new StringDiffSequence(left), new StringDiffSequence(right), function (leftIndex, longestMatchSoFar) {
            assert(longestMatchSoFar <= 1); // We never see a match of length > 1
            // Continue processing as long as there hasn't been a match made.
            return longestMatchSoFar < 1;
        });
        changes = diff.ComputeDiff(true).changes;
        assertAnswer(left, right, changes, 'abcf');
        // Cancel after the second match ('d')
        diff = new LcsDiff(new StringDiffSequence(left), new StringDiffSequence(right), function (leftIndex, longestMatchSoFar) {
            assert(longestMatchSoFar <= 2); // We never see a match of length > 2
            // Continue processing as long as there hasn't been a match made.
            return longestMatchSoFar < 2;
        });
        changes = diff.ComputeDiff(true).changes;
        assertAnswer(left, right, changes, 'abcdf');
        // Cancel *one iteration* after the second match ('d')
        let hitSecondMatch = false;
        diff = new LcsDiff(new StringDiffSequence(left), new StringDiffSequence(right), function (leftIndex, longestMatchSoFar) {
            assert(longestMatchSoFar <= 2); // We never see a match of length > 2
            const hitYet = hitSecondMatch;
            hitSecondMatch = longestMatchSoFar > 1;
            // Continue processing as long as there hasn't been a match made.
            return !hitYet;
        });
        changes = diff.ComputeDiff(true).changes;
        assertAnswer(left, right, changes, 'abcdf');
        // Cancel after the third and final match ('e')
        diff = new LcsDiff(new StringDiffSequence(left), new StringDiffSequence(right), function (leftIndex, longestMatchSoFar) {
            assert(longestMatchSoFar <= 3); // We never see a match of length > 3
            // Continue processing as long as there hasn't been a match made.
            return longestMatchSoFar < 3;
        });
        changes = diff.ComputeDiff(true).changes;
        assertAnswer(left, right, changes, 'abcdef');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlmZi50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3Rlc3QvY29tbW9uL2RpZmYvZGlmZi50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQWUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDeEYsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sYUFBYSxDQUFDO0FBRXRFLFNBQVMsV0FBVyxDQUFJLE1BQWMsRUFBRSxLQUFRO0lBQy9DLE1BQU0sQ0FBQyxHQUFRLEVBQUUsQ0FBQztJQUNsQixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7UUFDakMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBQztJQUNkLENBQUM7SUFDRCxPQUFPLENBQUMsQ0FBQztBQUNWLENBQUM7QUFFRCxTQUFTLGtCQUFrQixDQUFDLEdBQVcsRUFBRSxJQUFlO0lBQ3ZELElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztJQUNYLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxHQUFHLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7UUFDckMsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztZQUNiLENBQUMsSUFBSSxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3BCLENBQUM7SUFDRixDQUFDO0lBQ0QsT0FBTyxDQUFDLENBQUM7QUFDVixDQUFDO0FBRUQsU0FBUyxZQUFZLENBQUMsV0FBbUIsRUFBRSxXQUFtQixFQUFFLE9B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