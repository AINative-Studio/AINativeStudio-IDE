/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { OffsetRange } from '../../../core/offsetRange.js';
import { SequenceDiff, InfiniteTimeout, DiffAlgorithmResult } from './diffAlgorithm.js';
import { Array2D } from '../utils.js';
/**
 * A O(MN) diffing algorithm that supports a score function.
 * The algorithm can be improved by processing the 2d array diagonally.
*/
export class DynamicProgrammingDiffing {
    compute(sequence1, sequence2, timeout = InfiniteTimeout.instance, equalityScore) {
        if (sequence1.length === 0 || sequence2.length === 0) {
            return DiffAlgorithmResult.trivial(sequence1, sequence2);
        }
        /**
         * lcsLengths.get(i, j): Length of the longest common subsequence of sequence1.substring(0, i + 1) and sequence2.substring(0, j + 1).
         */
        const lcsLengths = new Array2D(sequence1.length, sequence2.length);
        const directions = new Array2D(sequence1.length, sequence2.length);
        const lengths = new Array2D(sequence1.length, sequence2.length);
        // ==== Initializing lcsLengths ====
        for (let s1 = 0; s1 < sequence1.length; s1++) {
            for (let s2 = 0; s2 < sequence2.length; s2++) {
                if (!timeout.isValid()) {
                    return DiffAlgorithmResult.trivialTimedOut(sequence1, sequence2);
                }
                const horizontalLen = s1 === 0 ? 0 : lcsLengths.get(s1 - 1, s2);
                const verticalLen = s2 === 0 ? 0 : lcsLengths.get(s1, s2 - 1);
                let extendedSeqScore;
                if (sequence1.getElement(s1) === sequence2.getElement(s2)) {
                    if (s1 === 0 || s2 === 0) {
                        extendedSeqScore = 0;
                    }
                    else {
                        extendedSeqScore = lcsLengths.get(s1 - 1, s2 - 1);
                    }
                    if (s1 > 0 && s2 > 0 && directions.get(s1 - 1, s2 - 1) === 3) {
                        // Prefer consecutive diagonals
                        extendedSeqScore += lengths.get(s1 - 1, s2 - 1);
                    }
                    extendedSeqScore += (equalityScore ? equalityScore(s1, s2) : 1);
                }
                else {
                    extendedSeqScore = -1;
                }
                const newValue = Math.max(horizontalLen, verticalLen, extendedSeqScore);
                if (newValue === extendedSeqScore) {
                    // Prefer diagonals
                    const prevLen = s1 > 0 && s2 > 0 ? lengths.get(s1 - 1, s2 - 1) : 0;
                    lengths.set(s1, s2, prevLen + 1);
                    directions.set(s1, s2, 3);
                }
                else if (newValue === horizontalLen) {
                    lengths.set(s1, s2, 0);
                    directions.set(s1, s2, 1);
                }
                else if (newValue === verticalLen) {
                    lengths.set(s1, s2, 0);
                    directions.set(s1, s2, 2);
                }
                lcsLengths.set(s1, s2, newValue);
            }
        }
        // ==== Backtracking ====
        const result = [];
        let lastAligningPosS1 = sequence1.length;
        let lastAligningPosS2 = sequence2.length;
        function reportDecreasingAligningPositions(s1, s2) {
            if (s1 + 1 !== lastAligningPosS1 || s2 + 1 !== lastAligningPosS2) {
                result.push(new SequenceDiff(new OffsetRange(s1 + 1, lastAligningPosS1), new OffsetRange(s2 + 1, lastAligningPosS2)));
            }
            lastAligningPosS1 = s1;
            lastAligningPosS2 = s2;
        }
        let s1 = sequence1.length - 1;
        let s2 = sequence2.length - 1;
        while (s1 >= 0 && s2 >= 0) {
            if (directions.get(s1, s2) === 3) {
                reportDecreasingAligningPositions(s1, s2);
                s1--;
                s2--;
            }
            else {
                if (directions.get(s1, s2) === 1) {
                    s1--;
                }
                else {
                    s2--;
                }
            }
        }
        reportDecreasingAligningPositions(-1, -1);
        result.reverse();
        return new DiffAlgorithmResult(result, false);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZHluYW1pY1Byb2dyYW1taW5nRGlmZmluZy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL2RpZmYvZGVmYXVsdExpbmVzRGlmZkNvbXB1dGVyL2FsZ29yaXRobXMvZHluYW1pY1Byb2dyYW1taW5nRGlmZmluZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDM0QsT0FBTyxFQUFrQixZQUFZLEVBQXVCLGVBQWUsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzdILE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxhQUFhLENBQUM7QUFFdEM7OztFQUdFO0FBQ0YsTUFBTSxPQUFPLHlCQUF5QjtJQUNyQyxPQUFPLENBQUMsU0FBb0IsRUFBRSxTQUFvQixFQUFFLFVBQW9CLGVBQWUsQ0FBQyxRQUFRLEVBQUUsYUFBNEQ7UUFDN0osSUFBSSxTQUFTLENBQUMsTUFBTSxLQUFLLENBQUMsSUFBSSxTQUFTLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ3RELE9BQU8sbUJBQW1CLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUMxRCxDQUFDO1FBRUQ7O1dBRUc7UUFDSCxNQUFNLFVBQVUsR0FBRyxJQUFJLE9BQU8sQ0FBUyxTQUFTLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUMzRSxNQUFNLFVBQVUsR0FBRyxJQUFJLE9BQU8sQ0FBUyxTQUFTLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUMzRSxNQUFNLE9BQU8sR0FBRyxJQUFJLE9BQU8sQ0FBUyxTQUFTLENBQUMsTUFBTSxFQUFFLFNB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