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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlmZi50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvdGVzdC9jb21tb24vZGlmZi9kaWZmLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBZSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUN4RixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSxhQUFhLENBQUM7QUFFdEUsU0FBUyxXQUFXLENBQUksTUFBYyxFQUFFLEtBQVE7SUFDL0MsTUFBTSxDQUFDLEdBQVEsRUFBRSxDQUFDO0lBQ2xCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztRQUNqQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFDO0lBQ2QsQ0FBQztJQUNELE9BQU8sQ0FBQyxDQUFDO0FBQ1YsQ0FBQztBQUVELFNBQVMsa0JBQWtCLENBQUMsR0FBVyxFQUFFLElBQWU7SUFDdkQsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO0lBQ1gsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztRQUNyQyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQ2IsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDcEIsQ0FBQztJQUNGLENBQUM7SUFDRCxPQUFPLENBQUMsQ0FBQztBQUNWLENBQUM7QUFFRCxTQUFTLFlBQVksQ0FBQyxXQUFtQixFQUFFLFdBQW1CLEVBQUUsT0FBc0Is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