/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { DiffChange } from './diffChange.js';
import { stringHash } from '../hash.js';
export class StringDiffSequence {
    constructor(source) {
        this.source = source;
    }
    getElements() {
        const source = this.source;
        const characters = new Int32Array(source.length);
        for (let i = 0, len = source.length; i < len; i++) {
            characters[i] = source.charCodeAt(i);
        }
        return characters;
    }
}
export function stringDiff(original, modified, pretty) {
    return new LcsDiff(new StringDiffSequence(original), new StringDiffSequence(modified)).ComputeDiff(pretty).changes;
}
//
// The code below has been ported from a C# implementation in VS
//
class Debug {
    static Assert(condition, message) {
        if (!condition) {
            throw new Error(message);
        }
    }
}
class MyArray {
    /**
     * Copies a range of elements from an Array starting at the specified source index and pastes
     * them to another Array starting at the specified destination index. The length and the indexes
     * are specified as 64-bit integers.
     * sourceArray:
     *		The Array that contains the data to copy.
     * sourceIndex:
     *		A 64-bit integer that represents the index in the sourceArray at which copying begins.
     * destinationArray:
     *		The Array that receives the data.
     * destinationIndex:
     *		A 64-bit integer that represents the index in the destinationArray at which storing begins.
     * length:
     *		A 64-bit integer that represents the number of elements to copy.
     */
    static Copy(sourceArray, sourceIndex, destinationArray, destinationIndex, length) {
        for (let i = 0; i < length; i++) {
            destinationArray[destinationIndex + i] = sourceArray[sourceIndex + i];
        }
    }
    static Copy2(sourceArray, sourceIndex, destinationArray, destinationIndex, length) {
        for (let i = 0; i < length; i++) {
            destinationArray[destinationIndex + i] = sourceArray[sourceIndex + i];
        }
    }
}
//*****************************************************************************
// LcsDiff.cs
//
// An implementation of the difference algorithm described in
// "An O(ND) Difference Algorithm and its variations" by Eugene W. Myers
//
// Copyright (C) 2008 Microsoft Corporation @minifier_do_not_preserve
//*****************************************************************************
// Our total memory usage for storing history is (worst-case):
// 2 * [(MaxDifferencesHistory + 1) * (MaxDifferencesHistory + 1) - 1] * sizeof(int)
// 2 * [1448*1448 - 1] * 4 = 16773624 = 16MB
var LocalConstants;
(function (LocalConstants) {
    LocalConstants[LocalConstants["MaxDifferencesHistory"] = 1447] = "MaxDifferencesHistory";
})(LocalConstants || (LocalConstants = {}));
/**
 * A utility class which helps to create the set of DiffChanges from
 * a difference operation. This class accepts original DiffElements and
 * modified DiffElements that are involved in a particular change. The
 * MarkNextChange() method can be called to mark the separation between
 * distinct changes. At the end, the Changes property can be called to retrieve
 * the constructed changes.
 */
class DiffChangeHelper {
    /**
     * Constructs a new DiffChangeHelper for the given DiffSequences.
     */
    constructor() {
        this.m_changes = [];
        this.m_originalStart = 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */;
        this.m_modifiedStart = 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */;
        this.m_originalCount = 0;
        this.m_modifiedCount = 0;
    }
    /**
     * Marks the beginning of the next change in the set of differences.
     */
    MarkNextChange() {
        // Only add to the list if there is something to add
        if (this.m_originalCount > 0 || this.m_modifiedCount > 0) {
            // Add the new change to our list
            this.m_changes.push(new DiffChange(this.m_originalStart, this.m_originalCount, this.m_modifiedStart, this.m_modifiedCount));
        }
        // Reset for the next change
        this.m_originalCount = 0;
        this.m_modifiedCount = 0;
        this.m_originalStart = 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */;
        this.m_modifiedStart = 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */;
    }
    /**
     * Adds the original element at the given position to the elements
     * affected by the current change. The modified index gives context
     * to the change position with respect to the original sequence.
     * @param originalIndex The index of the original element to add.
     * @param modifiedIndex The index of the modified element that provides corresponding position in the modified sequence.
     */
    AddOriginalElement(originalIndex, modifiedIndex) {
        // The 'true' start index is the smallest of the ones we've seen
        this.m_originalStart = Math.min(this.m_originalStart, originalIndex);
        this.m_modifiedStart = Math.min(this.m_modifiedStart, modifiedIndex);
        this.m_originalCount++;
    }
    /**
     * Adds the modified element at the given position to the elements
     * affected by the current change. The original index gives context
     * to the change position with respect to the modified sequence.
     * @param originalIndex The index of the original element that provides corresponding position in the original sequence.
     * @param modifiedIndex The index of the modified element to add.
     */
    AddModifiedElement(originalIndex, modifiedIndex) {
        // The 'true' start index is the smallest of the ones we've seen
        this.m_originalStart = Math.min(this.m_originalStart, originalIndex);
        this.m_modifiedStart = Math.min(this.m_modifiedStart, modifiedIndex);
        this.m_modifiedCount++;
    }
    /**
     * Retrieves all of the changes marked by the class.
     */
    getChanges() {
        if (this.m_originalCount > 0 || this.m_modifiedCount > 0) {
            // Finish up on whatever is left
            this.MarkNextChange();
        }
        return this.m_changes;
    }
    /**
     * Retrieves all of the changes marked by the class in the reverse order
     */
    getReverseChanges() {
        if (this.m_originalCount > 0 || this.m_modifiedCount > 0) {
            // Finish up on whatever is left
            this.MarkNextChange();
        }
        this.m_changes.reverse();
        return this.m_changes;
    }
}
/**
 * An implementation of the difference algorithm described in
 * "An O(ND) Difference Algorithm and its variations" by Eugene W. Myers
 */
export class LcsDiff {
    /**
     * Constructs the DiffFinder
     */
    constructor(originalSequence, modifiedSequence, continueProcessingPredicate = null) {
        this.ContinueProcessingPredicate = continueProcessingPredicate;
        this._originalSequence = originalSequence;
        this._modifiedSequence = modifiedSequence;
        const [originalStringElements, originalElementsOrHash, originalHasStrings] = LcsDiff._getElements(originalSequence);
        const [modifiedStringElements, modifiedElementsOrHash, modifiedHasStrings] = LcsDiff._getElements(modifiedSequence);
        this._hasStrings = (originalHasStrings && modifiedHasStrings);
        this._originalStringElements = originalStringElements;
        this._originalElementsOrHash = originalElementsOrHash;
        this._modifiedStringElements = modifiedStringElements;
        this._modifiedElementsOrHash = modifiedElementsOrHash;
        this.m_forwardHistory = [];
        this.m_reverseHistory = [];
    }
    static _isStringArray(arr) {
        return (arr.length > 0 && typeof arr[0] === 'string');
    }
    static _getElements(sequence) {
        const elements = sequence.getElements();
        if (LcsDiff._isStringArray(elements)) {
            const hashes = new Int32Array(elements.length);
            for (let i = 0, len = elements.length; i < len; i++) {
                hashes[i] = stringHash(elements[i], 0);
            }
            return [elements, hashes, true];
        }
        if (elements instanceof Int32Array) {
            return [[], elements, false];
        }
        return [[], new Int32Array(elements), false];
    }
    ElementsAreEqual(originalIndex, newIndex) {
        if (this._originalElementsOrHash[originalIndex] !== this._modifiedElementsOrHash[newIndex]) {
            return false;
        }
        return (this._hasStrings ? this._originalStringElements[originalIndex] === this._modifiedStringElements[newIndex] : true);
    }
    ElementsAreStrictEqual(originalIndex, newIndex) {
        if (!this.ElementsAreEqual(originalIndex, newIndex)) {
            return false;
        }
        const originalElement = LcsDiff._getStrictElement(this._originalSequence, originalIndex);
        const modifiedElement = LcsDiff._getStrictElement(this._modifiedSequence, newIndex);
        return (originalElement === modifiedElement);
    }
    static _getStrictElement(sequence, index) {
        if (typeof sequence.getStrictElement === 'function') {
            return sequence.getStrictElement(index);
        }
        return null;
    }
    OriginalElementsAreEqual(index1, index2) {
        if (this._originalElementsOrHash[index1] !== this._originalElementsOrHash[index2]) {
            return false;
        }
        return (this._hasStrings ? this._originalStringElements[index1] === this._originalStringElements[index2] : true);
    }
    ModifiedElementsAreEqual(index1, index2) {
        if (this._modifiedElementsOrHash[index1] !== this._modifiedElementsOrHash[index2]) {
            return false;
        }
        return (this._hasStrings ? this._modifiedStringElements[index1] === this._modifiedStringElements[index2] : true);
    }
    ComputeDiff(pretty) {
        return this._ComputeDiff(0, this._originalElementsOrHash.length - 1, 0, this._modifiedElementsOrHash.length - 1, pretty);
    }
    /**
     * Computes the differences between the original and modified input
     * sequences on the bounded range.
     * @returns An array of the differences between the two input sequences.
     */
    _ComputeDiff(originalStart, originalEnd, modifiedStart, modifiedEnd, pretty) {
        const quitEarlyArr = [false];
        let changes = this.ComputeDiffRecursive(originalStart, originalEnd, modifiedStart, modifiedEnd, quitEarlyArr);
        if (pretty) {
            // We have to clean up the computed diff to be more intuitive
            // but it turns out this cannot be done correctly until the entire set
            // of diffs have been computed
            changes = this.PrettifyChanges(changes);
        }
        return {
            quitEarly: quitEarlyArr[0],
            changes: changes
        };
    }
    /**
     * Private helper method which computes the differences on the bounded range
     * recursively.
     * @returns An array of the differences between the two input sequences.
     */
    ComputeDiffRecursive(originalStart, originalEnd, modifiedStart, modifiedEnd, quitEarlyArr) {
        quitEarlyArr[0] = false;
        // Find the start of the differences
        while (originalStart <= originalEnd && modifiedStart <= modifiedEnd && this.ElementsAreEqual(originalStart, modifiedStart)) {
            originalStart++;
            modifiedStart++;
        }
        // Find the end of the differences
        while (originalEnd >= originalStart && modifiedEnd >= modifiedStart && this.ElementsAreEqual(originalEnd, modifiedEnd)) {
            originalEnd--;
            modifiedEnd--;
        }
        // In the special case where we either have all insertions or all deletions or the sequences are identical
        if (originalStart > originalEnd || modifiedStart > modifiedEnd) {
            let changes;
            if (modifiedStart <= modifiedEnd) {
                Debug.Assert(originalStart === originalEnd + 1, 'originalStart should only be one more than originalEnd');
                // All insertions
                changes = [
                    new DiffChange(originalStart, 0, modifiedStart, modifiedEnd - modifiedStart + 1)
                ];
            }
            else if (originalStart <= originalEnd) {
                Debug.Assert(modifiedStart === modifiedEnd + 1, 'modifiedStart should only be one more than modifiedEnd');
                // All deletions
                changes = [
                    new DiffChange(originalStart, originalEnd - originalStart + 1, modifiedStart, 0)
                ];
            }
            else {
                Debug.Assert(originalStart === originalEnd + 1, 'originalStart should only be one more than originalEnd');
                Debug.Assert(modifiedStart === modifiedEnd + 1, 'modifiedStart should only be one more than modifiedEnd');
                // Identical sequences - No differences
                changes = [];
            }
            return changes;
        }
        // This problem can be solved using the Divide-And-Conquer technique.
        const midOriginalArr = [0];
        const midModifiedArr = [0];
        const result = this.ComputeRecursionPoint(originalStart, originalEnd, modifiedStart, modifiedEnd, midOriginalArr, midModifiedArr, quitEarlyArr);
        const midOriginal = midOriginalArr[0];
        const midModified = midModifiedArr[0];
        if (result !== null) {
            // Result is not-null when there was enough memory to compute the changes while
            // searching for the recursion point
            return result;
        }
        else if (!quitEarlyArr[0]) {
            // We can break the problem down recursively by finding the changes in the
            // First Half:   (originalStart, modifiedStart) to (midOriginal, midModified)
            // Second Half:  (midOriginal + 1, minModified + 1) to (originalEnd, modifiedEnd)
            // NOTE: ComputeDiff() is inclusive, therefore the second range starts on the next point
            const leftChanges = this.ComputeDiffRecursive(originalStart, midOriginal, modifiedStart, midModified, quitEarlyArr);
            let rightChanges = [];
            if (!quitEarlyArr[0]) {
                rightChanges = this.ComputeDiffRecursive(midOriginal + 1, originalEnd, midModified + 1, modifiedEnd, quitEarlyArr);
            }
            else {
                // We didn't have time to finish the first half, so we don't have time to compute this half.
                // Consider the entire rest of the sequence different.
                rightChanges = [
                    new DiffChange(midOriginal + 1, originalEnd - (midOriginal + 1) + 1, midModified + 1, modifiedEnd - (midModified + 1) + 1)
                ];
            }
            return this.ConcatenateChanges(leftChanges, rightChanges);
        }
        // If we hit here, we quit early, and so can't return anything meaningful
        return [
            new DiffChange(originalStart, originalEnd - originalStart + 1, modifiedStart, modifiedEnd - modifiedStart + 1)
        ];
    }
    WALKTRACE(diagonalForwardBase, diagonalForwardStart, diagonalForwardEnd, diagonalForwardOffset, diagonalReverseBase, diagonalReverseStart, diagonalReverseEnd, diagonalReverseOffset, forwardPoints, reversePoints, originalIndex, originalEnd, midOriginalArr, modifiedIndex, modifiedEnd, midModifiedArr, deltaIsEven, quitEarlyArr) {
        let forwardChanges = null;
        let reverseChanges = null;
        // First, walk backward through the forward diagonals history
        let changeHelper = new DiffChangeHelper();
        let diagonalMin = diagonalForwardStart;
        let diagonalMax = diagonalForwardEnd;
        let diagonalRelative = (midOriginalArr[0] - midModifiedArr[0]) - diagonalForwardOffset;
        let lastOriginalIndex = -1073741824 /* Constants.MIN_SAFE_SMALL_INTEGER */;
        let historyIndex = this.m_forwardHistory.length - 1;
        do {
            // Get the diagonal index from the relative diagonal number
            const diagonal = diagonalRelative + diagonalForwardBase;
            // Figure out where we came from
            if (diagonal === diagonalMin || (diagonal < diagonalMax && forwardPoints[diagonal - 1] < forwardPoints[diagonal + 1])) {
                // Vertical line (the element is an insert)
                originalIndex = forwardPoints[diagonal + 1];
                modifiedIndex = originalIndex - diagonalRelative - diagonalForwardOffset;
                if (originalIndex < lastOriginalIndex) {
                    changeHelper.MarkNextChange();
                }
                lastOriginalIndex = originalIndex;
                changeHelper.AddModifiedElement(originalIndex + 1, modifiedIndex);
                diagonalRelative = (diagonal + 1) - diagonalForwardBase; //Setup for the next iteration
            }
            else {
                // Horizontal line (the element is a deletion)
                originalIndex = forwardPoints[diagonal - 1] + 1;
                modifiedIndex = originalIndex - diagonalRelative - diagonalForwardOffset;
                if (originalIndex < lastOriginalIndex) {
                    changeHelper.MarkNextChange();
                }
                lastOriginalIndex = originalIndex - 1;
                changeHelper.AddOriginalElement(originalIndex, modifiedIndex + 1);
                diagonalRelative = (diagonal - 1) - diagonalForwardBase; //Setup for the next iteration
            }
            if (historyIndex >= 0) {
                forwardPoints = this.m_forwardHistory[historyIndex];
                diagonalForwardBase = forwardPoints[0]; //We stored this in the first spot
                diagonalMin = 1;
                diagonalMax = forwardPoints.length - 1;
            }
        } while (--historyIndex >= -1);
        // Ironically, we get the forward changes as the reverse of the
        // order we added them since we technically added them backwards
        forwardChanges = changeHelper.getReverseChanges();
        if (quitEarlyArr[0]) {
            // TODO: Calculate a partial from the reverse diagonals.
            //       For now, just assume everything after the midOriginal/midModified point is a diff
            let originalStartPoint = midOriginalArr[0] + 1;
            let modifiedStartPoint = midModifiedArr[0] + 1;
            if (forwardChanges !== null && forwardChanges.length > 0) {
                const lastForwardChange = forwardChanges[forwardChanges.length - 1];
                originalStartPoint = Math.max(originalStartPoint, lastForwardChange.getOriginalEnd());
                modifiedStartPoint = Math.max(modifiedStartPoint, lastForwardChange.getModifiedEnd());
            }
            reverseChanges = [
                new DiffChange(originalStartPoint, originalEnd - originalStartPoint + 1, modifiedStartPoint, modifiedEnd - modifiedStartPoint + 1)
            ];
        }
        else {
            // Now walk backward through the reverse diagonals history
            changeHelper = new DiffChangeHelper();
            diagonalMin = diagonalReverseStart;
            diagonalMax = diagonalReverseEnd;
            diagonalRelative = (midOriginalArr[0] - midModifiedArr[0]) - diagonalReverseOffset;
            lastOriginalIndex = 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */;
            historyIndex = (deltaIsEven) ? this.m_reverseHistory.length - 1 : this.m_reverseHistory.length - 2;
            do {
                // Get the diagonal index from the relative diagonal number
                const diagonal = diagonalRelative + diagonalReverseBase;
                // Figure out where we came from
                if (diagonal === diagonalMin || (diagonal < diagonalMax && reversePoints[diagonal - 1] >= reversePoints[diagonal + 1])) {
                    // Horizontal line (the element is a deletion))
                    originalIndex = reversePoints[diagonal + 1] - 1;
                    modifiedIndex = originalIndex - diagonalRelative - diagonalReverseOffset;
                    if (originalIndex > lastOriginalIndex) {
                        changeHelper.MarkNextChange();
                    }
                    lastOriginalIndex = originalIndex + 1;
                    changeHelper.AddOriginalElement(originalIndex + 1, modifiedIndex + 1);
                    diagonalRelative = (diagonal + 1) - diagonalReverseBase; //Setup for the next iteration
                }
                else {
                    // Vertical line (the element is an insertion)
                    originalIndex = reversePoints[diagonal - 1];
                    modifiedIndex = originalIndex - diagonalRelative - diagonalReverseOffset;
                    if (originalIndex > lastOriginalIndex) {
                        changeHelper.MarkNextChange();
                    }
                    lastOriginalIndex = originalIndex;
                    changeHelper.AddModifiedElement(originalIndex + 1, modifiedIndex + 1);
                    diagonalRelative = (diagonal - 1) - diagonalReverseBase; //Setup for the next iteration
                }
                if (historyIndex >= 0) {
                    reversePoints = this.m_reverseHistory[historyIndex];
                    diagonalReverseBase = reversePoints[0]; //We stored this in the first spot
                    diagonalMin = 1;
                    diagonalMax = reversePoints.length - 1;
                }
            } while (--historyIndex >= -1);
            // There are cases where the reverse history will find diffs that
            // are correct, but not intuitive, so we need shift them.
            reverseChanges = changeHelper.getChanges();
        }
        return this.ConcatenateChanges(forwardChanges, reverseChanges);
    }
    /**
     * Given the range to compute the diff on, this method finds the point:
     * (midOriginal, midModified)
     * that exists in the middle of the LCS of the two sequences and
     * is the point at which the LCS problem may be broken down recursively.
     * This method will try to keep the LCS trace in memory. If the LCS recursion
     * point is calculated and the full trace is available in memory, then this method
     * will return the change list.
     * @param originalStart The start bound of the original sequence range
     * @param originalEnd The end bound of the original sequence range
     * @param modifiedStart The start bound of the modified sequence range
     * @param modifiedEnd The end bound of the modified sequence range
     * @param midOriginal The middle point of the original sequence range
     * @param midModified The middle point of the modified sequence range
     * @returns The diff changes, if available, otherwise null
     */
    ComputeRecursionPoint(originalStart, originalEnd, modifiedStart, modifiedEnd, midOriginalArr, midModifiedArr, quitEarlyArr) {
        let originalIndex = 0, modifiedIndex = 0;
        let diagonalForwardStart = 0, diagonalForwardEnd = 0;
        let diagonalReverseStart = 0, diagonalReverseEnd = 0;
        // To traverse the edit graph and produce the proper LCS, our actual
        // start position is just outside the given boundary
        originalStart--;
        modifiedStart--;
        // We set these up to make the compiler happy, but they will
        // be replaced before we return with the actual recursion point
        midOriginalArr[0] = 0;
        midModifiedArr[0] = 0;
        // Clear out the history
        this.m_forwardHistory = [];
        this.m_reverseHistory = [];
        // Each cell in the two arrays corresponds to a diagonal in the edit graph.
        // The integer value in the cell represents the originalIndex of the furthest
        // reaching point found so far that ends in that diagonal.
        // The modifiedIndex can be computed mathematically from the originalIndex and the diagonal number.
        const maxDifferences = (originalEnd - originalStart) + (modifiedEnd - modifiedStart);
        const numDiagonals = maxDifferences + 1;
        const forwardPoints = new Int32Array(numDiagonals);
        const reversePoints = new Int32Array(numDiagonals);
        // diagonalForwardBase: Index into forwardPoints of the diagonal which passes through (originalStart, modifiedStart)
        // diagonalReverseBase: Index into reversePoints of the diagonal which passes through (originalEnd, modifiedEnd)
        const diagonalForwardBase = (modifiedEnd - modifiedStart);
        const diagonalReverseBase = (originalEnd - originalStart);
        // diagonalForwardOffset: Geometric offset which allows modifiedIndex to be computed from originalIndex and the
        //    diagonal number (relative to diagonalForwardBase)
        // diagonalReverseOffset: Geometric offset which allows modifiedIndex to be computed from originalIndex and the
        //    diagonal number (relative to diagonalReverseBase)
        const diagonalForwardOffset = (originalStart - modifiedStart);
        const diagonalReverseOffset = (originalEnd - modifiedEnd);
        // delta: The difference between the end diagonal and the start diagonal. This is used to relate diagonal numbers
        //   relative to the start diagonal with diagonal numbers relative to the end diagonal.
        // The Even/Oddn-ness of this delta is important for determining when we should check for overlap
        const delta = diagonalReverseBase - diagonalForwardBase;
        const deltaIsEven = (delta % 2 === 0);
        // Here we set up the start and end points as the furthest points found so far
        // in both the forward and reverse directions, respectively
        forwardPoints[diagonalForwardBase] = originalStart;
        reversePoints[diagonalReverseBase] = originalEnd;
        // Remember if we quit early, and thus need to do a best-effort result instead of a real result.
        quitEarlyArr[0] = false;
        // A couple of points:
        // --With this method, we iterate on the number of differences between the two sequences.
        //   The more differences there actually are, the longer this will take.
        // --Also, as the number of differences increases, we have to search on diagonals further
        //   away from the reference diagonal (which is diagonalForwardBase for forward, diagonalReverseBase for reverse).
        // --We extend on even diagonals (relative to the reference diagonal) only when numDifferences
        //   is even and odd diagonals only when numDifferences is odd.
        for (let numDifferences = 1; numDifferences <= (maxDifferences / 2) + 1; numDifferences++) {
            let furthestOriginalIndex = 0;
            let furthestModifiedIndex = 0;
            // Run the algorithm in the forward direction
            diagonalForwardStart = this.ClipDiagonalBound(diagonalForwardBase - numDifferences, numDifferences, diagonalForwardBase, numDiagonals);
            diagonalForwardEnd = this.ClipDiagonalBound(diagonalForwardBase + numDifferences, numDifferences, diagonalForwardBase, numDiagonals);
            for (let diagonal = diagonalForwardStart; diagonal <= diagonalForwardEnd; diagonal += 2) {
                // STEP 1: We extend the furthest reaching point in the present diagonal
                // by looking at the diagonals above and below and picking the one whose point
                // is further away from the start point (originalStart, modifiedStart)
                if (diagonal === diagonalForwardStart || (diagonal < diagonalForwardEnd && forwardPoints[diagonal - 1] < forwardPoints[diagonal + 1])) {
                    originalIndex = forwardPoints[diagonal + 1];
                }
                else {
                    originalIndex = forwardPoints[diagonal - 1] + 1;
                }
                modifiedIndex = originalIndex - (diagonal - diagonalForwardBase) - diagonalForwardOffset;
                // Save the current originalIndex so we can test for false overlap in step 3
                const tempOriginalIndex = originalIndex;
                // STEP 2: We can continue to extend the furthest reaching point in the present diagonal
                // so long as the elements are equal.
                while (originalIndex < originalEnd && modifiedIndex < modifiedEnd && this.ElementsAreEqual(originalIndex + 1, modifiedIndex + 1)) {
                    originalIndex++;
                    modifiedIndex++;
                }
                forwardPoints[diagonal] = originalIndex;
                if (originalIndex + modifiedIndex > furthestOriginalIndex + furthestModifiedIndex) {
                    furthestOriginalIndex = originalIndex;
                    furthestModifiedIndex = modifiedIndex;
                }
                // STEP 3: If delta is odd (overlap first happens on forward when delta is odd)
                // and diagonal is in the range of reverse diagonals computed for numDifferences-1
                // (the previous iteration; we haven't computed reverse diagonals for numDifferences yet)
                // then check for overlap.
                if (!deltaIsEven && Math.abs(diagonal - diagonalReverseBase) <= (numDifferences - 1)) {
                    if (originalIndex >= reversePoints[diagonal]) {
                        midOriginalArr[0] = originalIndex;
                        midModifiedArr[0] = modifiedIndex;
                        if (tempOriginalIndex <= reversePoints[diagonal] && 1447 /* LocalConstants.MaxDifferencesHistory */ > 0 && numDifferences <= (1447 /* LocalConstants.MaxDifferencesHistory */ + 1)) {
                            // BINGO! We overlapped, and we have the full trace in memory!
                            return this.WALKTRACE(diagonalForwardBase, diagonalForwardStart, diagonalForwardEnd, diagonalForwardOffset, diagonalReverseBase, diagonalReverseStart, diagonalReverseEnd, diagonalReverseOffset, forwardPoints, reversePoints, originalIndex, originalEnd, midOriginalArr, modifiedIndex, modifiedEnd, midModifiedArr, deltaIsEven, quitEarlyArr);
                        }
                        else {
                            // Either false overlap, or we didn't have enough memory for the full trace
                            // Just return the recursion point
                            return null;
                        }
                    }
                }
            }
            // Check to see if we should be quitting early, before moving on to the next iteration.
            const matchLengthOfLongest = ((furthestOriginalIndex - originalStart) + (furthestModifiedIndex - modifiedStart) - numDifferences) / 2;
            if (this.ContinueProcessingPredicate !== null && !this.ContinueProcessingPredicate(furthestOriginalIndex, matchLengthOfLongest)) {
                // We can't finish, so skip ahead to generating a result from what we have.
                quitEarlyArr[0] = true;
                // Use the furthest distance we got in the forward direction.
                midOriginalArr[0] = furthestOriginalIndex;
                midModifiedArr[0] = furthestModifiedIndex;
                if (matchLengthOfLongest > 0 && 1447 /* LocalConstants.MaxDifferencesHistory */ > 0 && numDifferences <= (1447 /* LocalConstants.MaxDifferencesHistory */ + 1)) {
                    // Enough of the history is in memory to walk it backwards
                    return this.WALKTRACE(diagonalForwardBase, diagonalForwardStart, diagonalForwardEnd, diagonalForwardOffset, diagonalReverseBase, diagonalReverseStart, diagonalReverseEnd, diagonalReverseOffset, forwardPoints, reversePoints, originalIndex, originalEnd, midOriginalArr, modifiedIndex, modifiedEnd, midModifiedArr, deltaIsEven, quitEarlyArr);
                }
                else {
                    // We didn't actually remember enough of the history.
                    //Since we are quitting the diff early, we need to shift back the originalStart and modified start
                    //back into the boundary limits since we decremented their value above beyond the boundary limit.
                    originalStart++;
                    modifiedStart++;
                    return [
                        new DiffChange(originalStart, originalEnd - originalStart + 1, modifiedStart, modifiedEnd - modifiedStart + 1)
                    ];
                }
            }
            // Run the algorithm in the reverse direction
            diagonalReverseStart = this.ClipDiagonalBound(diagonalReverseBase - numDifferences, numDifferences, diagonalReverseBase, numDiagonals);
            diagonalReverseEnd = this.ClipDiagonalBound(diagonalReverseBase + numDifferences, numDifferences, diagonalReverseBase, numDiagonals);
            for (let diagonal = diagonalReverseStart; diagonal <= diagonalReverseEnd; diagonal += 2) {
                // STEP 1: We extend the furthest reaching point in the present diagonal
                // by looking at the diagonals above and below and picking the one whose point
                // is further away from the start point (originalEnd, modifiedEnd)
                if (diagonal === diagonalReverseStart || (diagonal < diagonalReverseEnd && reversePoints[diagonal - 1] >= reversePoints[diagonal + 1])) {
                    originalIndex = reversePoints[diagonal + 1] - 1;
                }
                else {
                    originalIndex = reversePoints[diagonal - 1];
                }
                modifiedIndex = originalIndex - (diagonal - diagonalReverseBase) - diagonalReverseOffset;
                // Save the current originalIndex so we can test for false overlap
                const tempOriginalIndex = originalIndex;
                // STEP 2: We can continue to extend the furthest reaching point in the present diagonal
                // as long as the elements are equal.
                while (originalIndex > originalStart && modifiedIndex > modifiedStart && this.ElementsAreEqual(originalIndex, modifiedIndex)) {
                    originalIndex--;
                    modifiedIndex--;
                }
                reversePoints[diagonal] = originalIndex;
                // STEP 4: If delta is even (overlap first happens on reverse when delta is even)
                // and diagonal is in the range of forward diagonals computed for numDifferences
                // then check for overlap.
                if (deltaIsEven && Math.abs(diagonal - diagonalForwardBase) <= numDifferences) {
                    if (originalIndex <= forwardPoints[diagonal]) {
                        midOriginalArr[0] = originalIndex;
                        midModifiedArr[0] = modifiedIndex;
                        if (tempOriginalIndex >= forwardPoints[diagonal] && 1447 /* LocalConstants.MaxDifferencesHistory */ > 0 && numDifferences <= (1447 /* LocalConstants.MaxDifferencesHistory */ + 1)) {
                            // BINGO! We overlapped, and we have the full trace in memory!
                            return this.WALKTRACE(diagonalForwardBase, diagonalForwardStart, diagonalForwardEnd, diagonalForwardOffset, diagonalReverseBase, diagonalReverseStart, diagonalReverseEnd, diagonalReverseOffset, forwardPoints, reversePoints, originalIndex, originalEnd, midOriginalArr, modifiedIndex, modifiedEnd, midModifiedArr, deltaIsEven, quitEarlyArr);
                        }
                        else {
                            // Either false overlap, or we didn't have enough memory for the full trace
                            // Just return the recursion point
                            return null;
                        }
                    }
                }
            }
            // Save current vectors to history before the next iteration
            if (numDifferences <= 1447 /* LocalConstants.MaxDifferencesHistory */) {
                // We are allocating space for one extra int, which we fill with
                // the index of the diagonal base index
                let temp = new Int32Array(diagonalForwardEnd - diagonalForwardStart + 2);
                temp[0] = diagonalForwardBase - diagonalForwardStart + 1;
                MyArray.Copy2(forwardPoints, diagonalForwardStart, temp, 1, diagonalForwardEnd - diagonalForwardStart + 1);
                this.m_forwardHistory.push(temp);
                temp = new Int32Array(diagonalReverseEnd - diagonalReverseStart + 2);
                temp[0] = diagonalReverseBase - diagonalReverseStart + 1;
                MyArray.Copy2(reversePoints, diagonalReverseStart, temp, 1, diagonalReverseEnd - diagonalReverseStart + 1);
                this.m_reverseHistory.push(temp);
            }
        }
        // If we got here, then we have the full trace in history. We just have to convert it to a change list
        // NOTE: This part is a bit messy
        return this.WALKTRACE(diagonalForwardBase, diagonalForwardStart, diagonalForwardEnd, diagonalForwardOffset, diagonalReverseBase, diagonalReverseStart, diagonalReverseEnd, diagonalReverseOffset, forwardPoints, reversePoints, originalIndex, originalEnd, midOriginalArr, modifiedIndex, modifiedEnd, midModifiedArr, deltaIsEven, quitEarlyArr);
    }
    /**
     * Shifts the given changes to provide a more intuitive diff.
     * While the first element in a diff matches the first element after the diff,
     * we shift the diff down.
     *
     * @param changes The list of changes to shift
     * @returns The shifted changes
     */
    PrettifyChanges(changes) {
        // Shift all the changes down first
        for (let i = 0; i < changes.length; i++) {
            const change = changes[i];
            const originalStop = (i < changes.length - 1) ? changes[i + 1].originalStart : this._originalElementsOrHash.length;
            const modifiedStop = (i < changes.length - 1) ? changes[i + 1].modifiedStart : this._modifiedElementsOrHash.length;
            const checkOriginal = change.originalLength > 0;
            const checkModified = change.modifiedLength > 0;
            while (change.originalStart + change.originalLength < originalStop
                && change.modifiedStart + change.modifiedLength < modifiedStop
                && (!checkOriginal || this.OriginalElementsAreEqual(change.originalStart, change.originalStart + change.originalLength))
                && (!checkModified || this.ModifiedElementsAreEqual(change.modifiedStart, change.modifiedStart + change.modifiedLength))) {
                const startStrictEqual = this.ElementsAreStrictEqual(change.originalStart, change.modifiedStart);
                const endStrictEqual = this.ElementsAreStrictEqual(change.originalStart + change.originalLength, change.modifiedStart + change.modifiedLength);
                if (endStrictEqual && !startStrictEqual) {
                    // moving the change down would create an equal change, but the elements are not strict equal
                    break;
                }
                change.originalStart++;
                change.modifiedStart++;
            }
            const mergedChangeArr = [null];
            if (i < changes.length - 1 && this.ChangesOverlap(changes[i], changes[i + 1], mergedChangeArr)) {
                changes[i] = mergedChangeArr[0];
                changes.splice(i + 1, 1);
                i--;
                continue;
            }
        }
        // Shift changes back up until we hit empty or whitespace-only lines
        for (let i = changes.length - 1; i >= 0; i--) {
            const change = changes[i];
            let originalStop = 0;
            let modifiedStop = 0;
            if (i > 0) {
                const prevChange = changes[i - 1];
                originalStop = prevChange.originalStart + prevChange.originalLength;
                modifiedStop = prevChange.modifiedStart + prevChange.modifiedLength;
            }
            const checkOriginal = change.originalLength > 0;
            const checkModified = change.modifiedLength > 0;
            let bestDelta = 0;
            let bestScore = this._boundaryScore(change.originalStart, change.originalLength, change.modifiedStart, change.modifiedLength);
            for (let delta = 1;; delta++) {
                const originalStart = change.originalStart - delta;
                const modifiedStart = change.modifiedStart - delta;
                if (originalStart < originalStop || modifiedStart < modifiedStop) {
                    break;
                }
                if (checkOriginal && !this.OriginalElementsAreEqual(originalStart, originalStart + change.originalLength)) {
                    break;
                }
                if (checkModified && !this.ModifiedElementsAreEqual(modifiedStart, modifiedStart + change.modifiedLength)) {
                    break;
                }
                const touchingPreviousChange = (originalStart === originalStop && modifiedStart === modifiedStop);
                const score = ((touchingPreviousChange ? 5 : 0)
                    + this._boundaryScore(originalStart, change.originalLength, modifiedStart, change.modifiedLength));
                if (score > bestScore) {
                    bestScore = score;
                    bestDelta = delta;
                }
            }
            change.originalStart -= bestDelta;
            change.modifiedStart -= bestDelta;
            const mergedChangeArr = [null];
            if (i > 0 && this.ChangesOverlap(changes[i - 1], changes[i], mergedChangeArr)) {
                changes[i - 1] = mergedChangeArr[0];
                changes.splice(i, 1);
                i++;
                continue;
            }
        }
        // There could be multiple longest common substrings.
        // Give preference to the ones containing longer lines
        if (this._hasStrings) {
            for (let i = 1, len = changes.length; i < len; i++) {
                const aChange = changes[i - 1];
                const bChange = changes[i];
                const matchedLength = bChange.originalStart - aChange.originalStart - aChange.originalLength;
                const aOriginalStart = aChange.originalStart;
                const bOriginalEnd = bChange.originalStart + bChange.originalLength;
                const abOriginalLength = bOriginalEnd - aOriginalStart;
                const aModifiedStart = aChange.modifiedStart;
                const bModifiedEnd = bChange.modifiedStart + bChange.modifiedLength;
                const abModifiedLength = bModifiedEnd - aModifiedStart;
                // Avoid wasting a lot of time with these searches
                if (matchedLength < 5 && abOriginalLength < 20 && abModifiedLength < 20) {
                    const t = this._findBetterContiguousSequence(aOriginalStart, abOriginalLength, aModifiedStart, abModifiedLength, matchedLength);
                    if (t) {
                        const [originalMatchStart, modifiedMatchStart] = t;
                        if (originalMatchStart !== aChange.originalStart + aChange.originalLength || modifiedMatchStart !== aChange.modifiedStart + aChange.modifiedLength) {
                            // switch to another sequence that has a better score
                            aChange.originalLength = originalMatchStart - aChange.originalStart;
                            aChange.modifiedLength = modifiedMatchStart - aChange.modifiedStart;
                            bChange.originalStart = originalMatchStart + matchedLength;
                            bChange.modifiedStart = modifiedMatchStart + matchedLength;
                            bChange.originalLength = bOriginalEnd - bChange.originalStart;
                            bChange.modifiedLength = bModifiedEnd - bChange.modifiedStart;
                        }
                    }
                }
            }
        }
        return changes;
    }
    _findBetterContiguousSequence(originalStart, originalLength, modifiedStart, modifiedLength, desiredLength) {
        if (originalLength < desiredLength || modifiedLength < desiredLength) {
            return null;
        }
        const originalMax = originalStart + originalLength - desiredLength + 1;
        const modifiedMax = modifiedStart + modifiedLength - desiredLength + 1;
        let bestScore = 0;
        let bestOriginalStart = 0;
        let bestModifiedStart = 0;
        for (let i = originalStart; i < originalMax; i++) {
            for (let j = modifiedStart; j < modifiedMax; j++) {
                const score = this._contiguousSequenceScore(i, j, desiredLength);
                if (score > 0 && score > bestScore) {
                    bestScore = score;
                    bestOriginalStart = i;
                    bestModifiedStart = j;
                }
            }
        }
        if (bestScore > 0) {
            return [bestOriginalStart, bestModifiedStart];
        }
        return null;
    }
    _contiguousSequenceScore(originalStart, modifiedStart, length) {
        let score = 0;
        for (let l = 0; l < length; l++) {
            if (!this.ElementsAreEqual(originalStart + l, modifiedStart + l)) {
                return 0;
            }
            score += this._originalStringElements[originalStart + l].length;
        }
        return score;
    }
    _OriginalIsBoundary(index) {
        if (index <= 0 || index >= this._originalElementsOrHash.length - 1) {
            return true;
        }
        return (this._hasStrings && /^\s*$/.test(this._originalStringElements[index]));
    }
    _OriginalRegionIsBoundary(originalStart, originalLength) {
        if (this._OriginalIsBoundary(originalStart) || this._OriginalIsBoundary(originalStart - 1)) {
            return true;
        }
        if (originalLength > 0) {
            const originalEnd = originalStart + originalLength;
            if (this._OriginalIsBoundary(originalEnd - 1) || this._OriginalIsBoundary(originalEnd)) {
                return true;
            }
        }
        return false;
    }
    _ModifiedIsBoundary(index) {
        if (index <= 0 || index >= this._modifiedElementsOrHash.length - 1) {
            return true;
        }
        return (this._hasStrings && /^\s*$/.test(this._modifiedStringElements[index]));
    }
    _ModifiedRegionIsBoundary(modifiedStart, modifiedLength) {
        if (this._ModifiedIsBoundary(modifiedStart) || this._ModifiedIsBoundary(modifiedStart - 1)) {
            return true;
        }
        if (modifiedLength > 0) {
            const modifiedEnd = modifiedStart + modifiedLength;
            if (this._ModifiedIsBoundary(modifiedEnd - 1) || this._ModifiedIsBoundary(modifiedEnd)) {
                return true;
            }
        }
        return false;
    }
    _boundaryScore(originalStart, originalLength, modifiedStart, modifiedLength) {
        const originalScore = (this._OriginalRegionIsBoundary(originalStart, originalLength) ? 1 : 0);
        const modifiedScore = (this._ModifiedRegionIsBoundary(modifiedStart, modifiedLength) ? 1 : 0);
        return (originalScore + modifiedScore);
    }
    /**
     * Concatenates the two input DiffChange lists and returns the resulting
     * list.
     * @param The left changes
     * @param The right changes
     * @returns The concatenated list
     */
    ConcatenateChanges(left, right) {
        const mergedChangeArr = [];
        if (left.length === 0 || right.length === 0) {
            return (right.length > 0) ? right : left;
        }
        else if (this.ChangesOverlap(left[left.length - 1], right[0], mergedChangeArr)) {
            // Since we break the problem down recursively, it is possible that we
            // might recurse in the middle of a change thereby splitting it into
            // two changes. Here in the combining stage, we detect and fuse those
            // changes back together
            const result = new Array(left.length + right.length - 1);
            MyArray.Copy(left, 0, result, 0, left.length - 1);
            result[left.length - 1] = mergedChangeArr[0];
            MyArray.Copy(right, 1, result, left.length, right.length - 1);
            return result;
        }
        else {
            const result = new Array(left.length + right.length);
            MyArray.Copy(left, 0, result, 0, left.length);
            MyArray.Copy(right, 0, result, left.length, right.length);
            return result;
        }
    }
    /**
     * Returns true if the two changes overlap and can be merged into a single
     * change
     * @param left The left change
     * @param right The right change
     * @param mergedChange The merged change if the two overlap, null otherwise
     * @returns True if the two changes overlap
     */
    ChangesOverlap(left, right, mergedChangeArr) {
        Debug.Assert(left.originalStart <= right.originalStart, 'Left change is not less than or equal to right change');
        Debug.Assert(left.modifiedStart <= right.modifiedStart, 'Left change is not less than or equal to right change');
        if (left.originalStart + left.originalLength >= right.originalStart || left.modifiedStart + left.modifiedLength >= right.modifiedStart) {
            const originalStart = left.originalStart;
            let originalLength = left.originalLength;
            const modifiedStart = left.modifiedStart;
            let modifiedLength = left.modifiedLength;
            if (left.originalStart + left.originalLength >= right.originalStart) {
                originalLength = right.originalStart + right.originalLength - left.originalStart;
            }
            if (left.modifiedStart + left.modifiedLength >= right.modifiedStart) {
                modifiedLength = right.modifiedStart + right.modifiedLength - left.modifiedStart;
            }
            mergedChangeArr[0] = new DiffChange(originalStart, originalLength, modifiedStart, modifiedLength);
            return true;
        }
        else {
            mergedChangeArr[0] = null;
            return false;
        }
    }
    /**
     * Helper method used to clip a diagonal index to the range of valid
     * diagonals. This also decides whether or not the diagonal index,
     * if it exceeds the boundary, should be clipped to the boundary or clipped
     * one inside the boundary depending on the Even/Odd status of the boundary
     * and numDifferences.
     * @param diagonal The index of the diagonal to clip.
     * @param numDifferences The current number of differences being iterated upon.
     * @param diagonalBaseIndex The base reference diagonal.
     * @param numDiagonals The total number of diagonals.
     * @returns The clipped diagonal index.
     */
    ClipDiagonalBound(diagonal, numDifferences, diagonalBaseIndex, numDiagonals) {
        if (diagonal >= 0 && diagonal < numDiagonals) {
            // Nothing to clip, its in range
            return diagonal;
        }
        // diagonalsBelow: The number of diagonals below the reference diagonal
        // diagonalsAbove: The number of diagonals above the reference diagonal
        const diagonalsBelow = diagonalBaseIndex;
        const diagonalsAbove = numDiagonals - diagonalBaseIndex - 1;
        const diffEven = (numDifferences % 2 === 0);
        if (diagonal < 0) {
            const lowerBoundEven = (diagonalsBelow % 2 === 0);
            return (diffEven === lowerBoundEven) ? 0 : 1;
        }
        else {
            const upperBoundEven = (diagonalsAbove % 2 === 0);
            return (diffEven === upperBoundEven) ? numDiagonals - 1 : numDiagonals - 2;
        }
    }
}
/**
 * Precomputed equality array for character codes.
 */
const precomputedEqualityArray = new Uint32Array(0x10000);
/**
 * Computes the Levenshtein distance for strings of length <= 32.
 * @param firstString - The first string.
 * @param secondString - The second string.
 * @returns The Levenshtein distance.
 */
const computeLevenshteinDistanceForShortStrings = (firstString, secondString) => {
    const firstStringLength = firstString.length;
    const secondStringLength = secondString.length;
    const lastBitMask = 1 << (firstStringLength - 1);
    let positiveVector = -1;
    let negativeVector = 0;
    let distance = firstStringLength;
    let index = firstStringLength;
    // Initialize precomputedEqualityArray for firstString
    while (index--) {
        precomputedEqualityArray[firstString.charCodeAt(index)] |= 1 << index;
    }
    // Process each character of secondString
    for (index = 0; index < secondStringLength; index++) {
        let equalityMask = precomputedEqualityArray[secondString.charCodeAt(index)];
        const combinedVector = equalityMask | negativeVector;
        equalityMask |= ((equalityMask & positiveVector) + positiveVector) ^ positiveVector;
        negativeVector |= ~(equalityMask | positiveVector);
        positiveVector &= equalityMask;
        if (negativeVector & lastBitMask) {
            distance++;
        }
        if (positiveVector & lastBitMask) {
            distance--;
        }
        negativeVector = (negativeVector << 1) | 1;
        positiveVector = (positiveVector << 1) | ~(combinedVector | negativeVector);
        negativeVector &= combinedVector;
    }
    // Reset precomputedEqualityArray
    index = firstStringLength;
    while (index--) {
        precomputedEqualityArray[firstString.charCodeAt(index)] = 0;
    }
    return distance;
};
/**
 * Computes the Levenshtein distance for strings of length > 32.
 * @param firstString - The first string.
 * @param secondString - The second string.
 * @returns The Levenshtein distance.
 */
function computeLevenshteinDistanceForLongStrings(firstString, secondString) {
    const firstStringLength = firstString.length;
    const secondStringLength = secondString.length;
    const horizontalBitArray = [];
    const verticalBitArray = [];
    const horizontalSize = Math.ceil(firstStringLength / 32);
    const verticalSize = Math.ceil(secondStringLength / 32);
    // Initialize horizontal and vertical bit arrays
    for (let i = 0; i < horizontalSize; i++) {
        horizontalBitArray[i] = -1;
        verticalBitArray[i] = 0;
    }
    let verticalIndex = 0;
    for (; verticalIndex < verticalSize - 1; verticalIndex++) {
        let negativeVector = 0;
        let positiveVector = -1;
        const start = verticalIndex * 32;
        const verticalLength = Math.min(32, secondStringLength) + start;
        // Initialize precomputedEqualityArray for secondString
        for (let k = start; k < verticalLength; k++) {
            precomputedEqualityArray[secondString.charCodeAt(k)] |= 1 << k;
        }
        // Process each character of firstString
        for (let i = 0; i < firstStringLength; i++) {
            const equalityMask = precomputedEqualityArray[firstString.charCodeAt(i)];
            const previousBit = (horizontalBitArray[(i / 32) | 0] >>> i) & 1;
            const matchBit = (verticalBitArray[(i / 32) | 0] >>> i) & 1;
            const combinedVector = equalityMask | negativeVector;
            const combinedHorizontalVector = ((((equalityMask | matchBit) & positiveVector) + positiveVector) ^ positiveVector) | equalityMask | matchBit;
            let positiveHorizontalVector = negativeVector | ~(combinedHorizontalVector | positiveVector);
            let negativeHorizontalVector = positiveVector & combinedHorizontalVector;
            if ((positiveHorizontalVector >>> 31) ^ previousBit) {
                horizontalBitArray[(i / 32) | 0] ^= 1 << i;
            }
            if ((negativeHorizontalVector >>> 31) ^ matchBit) {
                verticalBitArray[(i / 32) | 0] ^= 1 << i;
            }
            positiveHorizontalVector = (positiveHorizontalVector << 1) | previousBit;
            negativeHorizontalVector = (negativeHorizontalVector << 1) | matchBit;
            positiveVector = negativeHorizontalVector | ~(combinedVector | positiveHorizontalVector);
            negativeVector = positiveHorizontalVector & combinedVector;
        }
        // Reset precomputedEqualityArray
        for (let k = start; k < verticalLength; k++) {
            precomputedEqualityArray[secondString.charCodeAt(k)] = 0;
        }
    }
    let negativeVector = 0;
    let positiveVector = -1;
    const start = verticalIndex * 32;
    const verticalLength = Math.min(32, secondStringLength - start) + start;
    // Initialize precomputedEqualityArray for secondString
    for (let k = start; k < verticalLength; k++) {
        precomputedEqualityArray[secondString.charCodeAt(k)] |= 1 << k;
    }
    let distance = secondStringLength;
    // Process each character of firstString
    for (let i = 0; i < firstStringLength; i++) {
        const equalityMask = precomputedEqualityArray[firstString.charCodeAt(i)];
        const previousBit = (horizontalBitArray[(i / 32) | 0] >>> i) & 1;
        const matchBit = (verticalBitArray[(i / 32) | 0] >>> i) & 1;
        const combinedVector = equalityMask | negativeVector;
        const combinedHorizontalVector = ((((equalityMask | matchBit) & positiveVector) + positiveVector) ^ positiveVector) | equalityMask | matchBit;
        let positiveHorizontalVector = negativeVector | ~(combinedHorizontalVector | positiveVector);
        let negativeHorizontalVector = positiveVector & combinedHorizontalVector;
        distance += (positiveHorizontalVector >>> (secondStringLength - 1)) & 1;
        distance -= (negativeHorizontalVector >>> (secondStringLength - 1)) & 1;
        if ((positiveHorizontalVector >>> 31) ^ previousBit) {
            horizontalBitArray[(i / 32) | 0] ^= 1 << i;
        }
        if ((negativeHorizontalVector >>> 31) ^ matchBit) {
            verticalBitArray[(i / 32) | 0] ^= 1 << i;
        }
        positiveHorizontalVector = (positiveHorizontalVector << 1) | previousBit;
        negativeHorizontalVector = (negativeHorizontalVector << 1) | matchBit;
        positiveVector = negativeHorizontalVector | ~(combinedVector | positiveHorizontalVector);
        negativeVector = positiveHorizontalVector & combinedVector;
    }
    // Reset precomputedEqualityArray
    for (let k = start; k < verticalLength; k++) {
        precomputedEqualityArray[secondString.charCodeAt(k)] = 0;
    }
    return distance;
}
/**
 * Computes the Levenshtein distance between two strings.
 * @param firstString - The first string.
 * @param secondString - The second string.
 * @returns The Levenshtein distance.
 */
export function computeLevenshteinDistance(firstString, secondString) {
    if (firstString.length < secondString.length) {
        const temp = secondString;
        secondString = firstString;
        firstString = temp;
    }
    if (secondString.length === 0) {
        return firstString.length;
    }
    if (firstString.length <= 32) {
        return computeLevenshteinDistanceForShortStrings(firstString, secondString);
    }
    return computeLevenshteinDistanceForLongStrings(firstString, secondString);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlmZi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2NvbW1vbi9kaWZmL2RpZmYudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQzdDLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxZQUFZLENBQUM7QUFHeEMsTUFBTSxPQUFPLGtCQUFrQjtJQUU5QixZQUFvQixNQUFjO1FBQWQsV0FBTSxHQUFOLE1BQU0sQ0FBUTtJQUFJLENBQUM7SUFFdkMsV0FBVztRQUNWLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUM7UUFDM0IsTUFBTSxVQUFVLEdBQUcsSUFBSSxVQUFVLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ2pELEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsR0FBRyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNuRCxVQUFVLENBQUMsQ0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN0QyxDQUFDO1FBQ0QsT0FBTyxVQUFVLENBQUM7SUFDbkIsQ0FBQztDQUNEO0FBRUQsTUFBTSxVQUFVLFVBQVUsQ0FBQyxRQUFnQixFQUFFLFFBQWdCLEVBQUUsTUFBZTtJQUM3RSxPQUFPLElBQUksT0FBTyxDQUFDLElBQUksa0JBQWtCLENBQUMsUUFBUSxDQUFDLEVBQUUsSUFBSSxrQkFBa0IsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxPQUFPLENBQUM7QUFDcEgsQ0FBQztBQTBDRCxFQUFFO0FBQ0YsZ0VBQWdFO0FBQ2hF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