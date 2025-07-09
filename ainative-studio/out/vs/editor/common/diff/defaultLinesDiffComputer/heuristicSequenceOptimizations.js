/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { forEachWithNeighbors } from '../../../../base/common/arrays.js';
import { OffsetRange } from '../../core/offsetRange.js';
import { OffsetPair, SequenceDiff } from './algorithms/diffAlgorithm.js';
export function optimizeSequenceDiffs(sequence1, sequence2, sequenceDiffs) {
    let result = sequenceDiffs;
    result = joinSequenceDiffsByShifting(sequence1, sequence2, result);
    // Sometimes, calling this function twice improves the result.
    // Uncomment the second invocation and run the tests to see the difference.
    result = joinSequenceDiffsByShifting(sequence1, sequence2, result);
    result = shiftSequenceDiffs(sequence1, sequence2, result);
    return result;
}
/**
 * This function fixes issues like this:
 * ```
 * import { Baz, Bar } from "foo";
 * ```
 * <->
 * ```
 * import { Baz, Bar, Foo } from "foo";
 * ```
 * Computed diff: [ {Add "," after Bar}, {Add "Foo " after space} }
 * Improved diff: [{Add ", Foo" after Bar}]
 */
function joinSequenceDiffsByShifting(sequence1, sequence2, sequenceDiffs) {
    if (sequenceDiffs.length === 0) {
        return sequenceDiffs;
    }
    const result = [];
    result.push(sequenceDiffs[0]);
    // First move them all to the left as much as possible and join them if possible
    for (let i = 1; i < sequenceDiffs.length; i++) {
        const prevResult = result[result.length - 1];
        let cur = sequenceDiffs[i];
        if (cur.seq1Range.isEmpty || cur.seq2Range.isEmpty) {
            const length = cur.seq1Range.start - prevResult.seq1Range.endExclusive;
            let d;
            for (d = 1; d <= length; d++) {
                if (sequence1.getElement(cur.seq1Range.start - d) !== sequence1.getElement(cur.seq1Range.endExclusive - d) ||
                    sequence2.getElement(cur.seq2Range.start - d) !== sequence2.getElement(cur.seq2Range.endExclusive - d)) {
                    break;
                }
            }
            d--;
            if (d === length) {
                // Merge previous and current diff
                result[result.length - 1] = new SequenceDiff(new OffsetRange(prevResult.seq1Range.start, cur.seq1Range.endExclusive - length), new OffsetRange(prevResult.seq2Range.start, cur.seq2Range.endExclusive - length));
                continue;
            }
            cur = cur.delta(-d);
        }
        result.push(cur);
    }
    const result2 = [];
    // Then move them all to the right and join them again if possible
    for (let i = 0; i < result.length - 1; i++) {
        const nextResult = result[i + 1];
        let cur = result[i];
        if (cur.seq1Range.isEmpty || cur.seq2Range.isEmpty) {
            const length = nextResult.seq1Range.start - cur.seq1Range.endExclusive;
            let d;
            for (d = 0; d < length; d++) {
                if (!sequence1.isStronglyEqual(cur.seq1Range.start + d, cur.seq1Range.endExclusive + d) ||
                    !sequence2.isStronglyEqual(cur.seq2Range.start + d, cur.seq2Range.endExclusive + d)) {
                    break;
                }
            }
            if (d === length) {
                // Merge previous and current diff, write to result!
                result[i + 1] = new SequenceDiff(new OffsetRange(cur.seq1Range.start + length, nextResult.seq1Range.endExclusive), new OffsetRange(cur.seq2Range.start + length, nextResult.seq2Range.endExclusive));
                continue;
            }
            if (d > 0) {
                cur = cur.delta(d);
            }
        }
        result2.push(cur);
    }
    if (result.length > 0) {
        result2.push(result[result.length - 1]);
    }
    return result2;
}
// align character level diffs at whitespace characters
// import { IBar } from "foo";
// import { I[Arr, I]Bar } from "foo";
// ->
// import { [IArr, ]IBar } from "foo";
// import { ITransaction, observableValue, transaction } from 'vs/base/common/observable';
// import { ITransaction, observable[FromEvent, observable]Value, transaction } from 'vs/base/common/observable';
// ->
// import { ITransaction, [observableFromEvent, ]observableValue, transaction } from 'vs/base/common/observable';
// collectBrackets(level + 1, levelPerBracketType);
// collectBrackets(level + 1, levelPerBracket[ + 1, levelPerBracket]Type);
// ->
// collectBrackets(level + 1, [levelPerBracket + 1, ]levelPerBracketType);
function shiftSequenceDiffs(sequence1, sequence2, sequenceDiffs) {
    if (!sequence1.getBoundaryScore || !sequence2.getBoundaryScore) {
        return sequenceDiffs;
    }
    for (let i = 0; i < sequenceDiffs.length; i++) {
        const prevDiff = (i > 0 ? sequenceDiffs[i - 1] : undefined);
        const diff = sequenceDiffs[i];
        const nextDiff = (i + 1 < sequenceDiffs.length ? sequenceDiffs[i + 1] : undefined);
        const seq1ValidRange = new OffsetRange(prevDiff ? prevDiff.seq1Range.endExclusive + 1 : 0, nextDiff ? nextDiff.seq1Range.start - 1 : sequence1.length);
        const seq2ValidRange = new OffsetRange(prevDiff ? prevDiff.seq2Range.endExclusive + 1 : 0, nextDiff ? nextDiff.seq2Range.start - 1 : sequence2.length);
        if (diff.seq1Range.isEmpty) {
            sequenceDiffs[i] = shiftDiffToBetterPosition(diff, sequence1, sequence2, seq1ValidRange, seq2ValidRange);
        }
        else if (diff.seq2Range.isEmpty) {
            sequenceDiffs[i] = shiftDiffToBetterPosition(diff.swap(), sequence2, sequence1, seq2ValidRange, seq1ValidRange).swap();
        }
    }
    return sequenceDiffs;
}
function shiftDiffToBetterPosition(diff, sequence1, sequence2, seq1ValidRange, seq2ValidRange) {
    const maxShiftLimit = 100; // To prevent performance issues
    // don't touch previous or next!
    let deltaBefore = 1;
    while (diff.seq1Range.start - deltaBefore >= seq1ValidRange.start &&
        diff.seq2Range.start - deltaBefore >= seq2ValidRange.start &&
        sequence2.isStronglyEqual(diff.seq2Range.start - deltaBefore, diff.seq2Range.endExclusive - deltaBefore) && deltaBefore < maxShiftLimit) {
        deltaBefore++;
    }
    deltaBefore--;
    let deltaAfter = 0;
    while (diff.seq1Range.start + deltaAfter < seq1ValidRange.endExclusive &&
        diff.seq2Range.endExclusive + deltaAfter < seq2ValidRange.endExclusive &&
        sequence2.isStronglyEqual(diff.seq2Range.start + deltaAfter, diff.seq2Range.endExclusive + deltaAfter) && deltaAfter < maxShiftLimit) {
        deltaAfter++;
    }
    if (deltaBefore === 0 && deltaAfter === 0) {
        return diff;
    }
    // Visualize `[sequence1.text, diff.seq1Range.start + deltaAfter]`
    // and `[sequence2.text, diff.seq2Range.start + deltaAfter, diff.seq2Range.endExclusive + deltaAfter]`
    let bestDelta = 0;
    let bestScore = -1;
    // find best scored delta
    for (let delta = -deltaBefore; delta <= deltaAfter; delta++) {
        const seq2OffsetStart = diff.seq2Range.start + delta;
        const seq2OffsetEndExclusive = diff.seq2Range.endExclusive + delta;
        const seq1Offset = diff.seq1Range.start + delta;
        const score = sequence1.getBoundaryScore(seq1Offset) + sequence2.getBoundaryScore(seq2OffsetStart) + sequence2.getBoundaryScore(seq2OffsetEndExclusive);
        if (score > bestScore) {
            bestScore = score;
            bestDelta = delta;
        }
    }
    return diff.delta(bestDelta);
}
export function removeShortMatches(sequence1, sequence2, sequenceDiffs) {
    const result = [];
    for (const s of sequenceDiffs) {
        const last = result[result.length - 1];
        if (!last) {
            result.push(s);
            continue;
        }
        if (s.seq1Range.start - last.seq1Range.endExclusive <= 2 || s.seq2Range.start - last.seq2Range.endExclusive <= 2) {
            result[result.length - 1] = new SequenceDiff(last.seq1Range.join(s.seq1Range), last.seq2Range.join(s.seq2Range));
        }
        else {
            result.push(s);
        }
    }
    return result;
}
export function extendDiffsToEntireWordIfAppropriate(sequence1, sequence2, sequenceDiffs, findParent, force = false) {
    const equalMappings = SequenceDiff.invert(sequenceDiffs, sequence1.length);
    const additional = [];
    let lastPoint = new OffsetPair(0, 0);
    function scanWord(pair, equalMapping) {
        if (pair.offset1 < lastPoint.offset1 || pair.offset2 < lastPoint.offset2) {
            return;
        }
        const w1 = findParent(sequence1, pair.offset1);
        const w2 = findParent(sequence2, pair.offset2);
        if (!w1 || !w2) {
            return;
        }
        let w = new SequenceDiff(w1, w2);
        const equalPart = w.intersect(equalMapping);
        let equalChars1 = equalPart.seq1Range.length;
        let equalChars2 = equalPart.seq2Range.length;
        // The words do not touch previous equals mappings, as we would have processed them already.
        // But they might touch the next ones.
        while (equalMappings.length > 0) {
            const next = equalMappings[0];
            const intersects = next.seq1Range.intersects(w.seq1Range) || next.seq2Range.intersects(w.seq2Range);
            if (!intersects) {
                break;
            }
            const v1 = findParent(sequence1, next.seq1Range.start);
            const v2 = findParent(sequence2, next.seq2Range.start);
            // Because there is an intersection, we know that the words are not empty.
            const v = new SequenceDiff(v1, v2);
            const equalPart = v.intersect(next);
            equalChars1 += equalPart.seq1Range.length;
            equalChars2 += equalPart.seq2Range.length;
            w = w.join(v);
            if (w.seq1Range.endExclusive >= next.seq1Range.endExclusive) {
                // The word extends beyond the next equal mapping.
                equalMappings.shift();
            }
            else {
                break;
            }
        }
        if ((force && equalChars1 + equalChars2 < w.seq1Range.length + w.seq2Range.length) || equalChars1 + equalChars2 < (w.seq1Range.length + w.seq2Range.length) * 2 / 3) {
            additional.push(w);
        }
        lastPoint = w.getEndExclusives();
    }
    while (equalMappings.length > 0) {
        const next = equalMappings.shift();
        if (next.seq1Range.isEmpty) {
            continue;
        }
        scanWord(next.getStarts(), next);
        // The equal parts are not empty, so -1 gives us a character that is equal in both parts.
        scanWord(next.getEndExclusives().delta(-1), next);
    }
    const merged = mergeSequenceDiffs(sequenceDiffs, additional);
    return merged;
}
function mergeSequenceDiffs(sequenceDiffs1, sequenceDiffs2) {
    const result = [];
    while (sequenceDiffs1.length > 0 || sequenceDiffs2.length > 0) {
        const sd1 = sequenceDiffs1[0];
        const sd2 = sequenceDiffs2[0];
        let next;
        if (sd1 && (!sd2 || sd1.seq1Range.start < sd2.seq1Range.start)) {
            next = sequenceDiffs1.shift();
        }
        else {
            next = sequenceDiffs2.shift();
        }
        if (result.length > 0 && result[result.length - 1].seq1Range.endExclusive >= next.seq1Range.start) {
            result[result.length - 1] = result[result.length - 1].join(next);
        }
        else {
            result.push(next);
        }
    }
    return result;
}
export function removeVeryShortMatchingLinesBetweenDiffs(sequence1, _sequence2, sequenceDiffs) {
    let diffs = sequenceDiffs;
    if (diffs.length === 0) {
        return diffs;
    }
    let counter = 0;
    let shouldRepeat;
    do {
        shouldRepeat = false;
        const result = [
            diffs[0]
        ];
        for (let i = 1; i < diffs.length; i++) {
            const cur = diffs[i];
            const lastResult = result[result.length - 1];
            function shouldJoinDiffs(before, after) {
                const unchangedRange = new OffsetRange(lastResult.seq1Range.endExclusive, cur.seq1Range.start);
                const unchangedText = sequence1.getText(unchangedRange);
                const unchangedTextWithoutWs = unchangedText.replace(/\s/g, '');
                if (unchangedTextWithoutWs.length <= 4
                    && (before.seq1Range.length + before.seq2Range.length > 5 || after.seq1Range.length + after.seq2Range.length > 5)) {
                    return true;
                }
                return false;
            }
            const shouldJoin = shouldJoinDiffs(lastResult, cur);
            if (shouldJoin) {
                shouldRepeat = true;
                result[result.length - 1] = result[result.length - 1].join(cur);
            }
            else {
                result.push(cur);
            }
        }
        diffs = result;
    } while (counter++ < 10 && shouldRepeat);
    return diffs;
}
export function removeVeryShortMatchingTextBetweenLongDiffs(sequence1, sequence2, sequenceDiffs) {
    let diffs = sequenceDiffs;
    if (diffs.length === 0) {
        return diffs;
    }
    let counter = 0;
    let shouldRepeat;
    do {
        shouldRepeat = false;
        const result = [
            diffs[0]
        ];
        for (let i = 1; i < diffs.length; i++) {
            const cur = diffs[i];
            const lastResult = result[result.length - 1];
            function shouldJoinDiffs(before, after) {
                const unchangedRange = new OffsetRange(lastResult.seq1Range.endExclusive, cur.seq1Range.start);
                const unchangedLineCount = sequence1.countLinesIn(unchangedRange);
                if (unchangedLineCount > 5 || unchangedRange.length > 500) {
                    return false;
                }
                const unchangedText = sequence1.getText(unchangedRange).trim();
                if (unchangedText.length > 20 || unchangedText.split(/\r\n|\r|\n/).length > 1) {
                    return false;
                }
                const beforeLineCount1 = sequence1.countLinesIn(before.seq1Range);
                const beforeSeq1Length = before.seq1Range.length;
                const beforeLineCount2 = sequence2.countLinesIn(before.seq2Range);
                const beforeSeq2Length = before.seq2Range.length;
                const afterLineCount1 = sequence1.countLinesIn(after.seq1Range);
                const afterSeq1Length = after.seq1Range.length;
                const afterLineCount2 = sequence2.countLinesIn(after.seq2Range);
                const afterSeq2Length = after.seq2Range.length;
                // TODO: Maybe a neural net can be used to derive the result from these numbers
                const max = 2 * 40 + 50;
                function cap(v) {
                    return Math.min(v, max);
                }
                if (Math.pow(Math.pow(cap(beforeLineCount1 * 40 + beforeSeq1Length), 1.5) + Math.pow(cap(beforeLineCount2 * 40 + beforeSeq2Length), 1.5), 1.5)
                    + Math.pow(Math.pow(cap(afterLineCount1 * 40 + afterSeq1Length), 1.5) + Math.pow(cap(afterLineCount2 * 40 + afterSeq2Length), 1.5), 1.5) > ((max ** 1.5) ** 1.5) * 1.3) {
                    return true;
                }
                return false;
            }
            const shouldJoin = shouldJoinDiffs(lastResult, cur);
            if (shouldJoin) {
                shouldRepeat = true;
                result[result.length - 1] = result[result.length - 1].join(cur);
            }
            else {
                result.push(cur);
            }
        }
        diffs = result;
    } while (counter++ < 10 && shouldRepeat);
    const newDiffs = [];
    // Remove short suffixes/prefixes
    forEachWithNeighbors(diffs, (prev, cur, next) => {
        let newDiff = cur;
        function shouldMarkAsChanged(text) {
            return text.length > 0 && text.trim().length <= 3 && cur.seq1Range.length + cur.seq2Range.length > 100;
        }
        const fullRange1 = sequence1.extendToFullLines(cur.seq1Range);
        const prefix = sequence1.getText(new OffsetRange(fullRange1.start, cur.seq1Range.start));
        if (shouldMarkAsChanged(prefix)) {
            newDiff = newDiff.deltaStart(-prefix.length);
        }
        const suffix = sequence1.getText(new OffsetRange(cur.seq1Range.endExclusive, fullRange1.endExclusive));
        if (shouldMarkAsChanged(suffix)) {
            newDiff = newDiff.deltaEnd(suffix.length);
        }
        const availableSpace = SequenceDiff.fromOffsetPairs(prev ? prev.getEndExclusives() : OffsetPair.zero, next ? next.getStarts() : OffsetPair.max);
        const result = newDiff.intersect(availableSpace);
        if (newDiffs.length > 0 && result.getStarts().equals(newDiffs[newDiffs.length - 1].getEndExclusives())) {
            newDiffs[newDiffs.length - 1] = newDiffs[newDiffs.length - 1].join(result);
        }
        else {
            newDiffs.push(result);
        }
    });
    return newDiffs;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGV1cmlzdGljU2VxdWVuY2VPcHRpbWl6YXRpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vZGlmZi9kZWZhdWx0TGluZXNEaWZmQ29tcHV0ZXIvaGV1cmlzdGljU2VxdWVuY2VPcHRpbWl6YXRpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUN4RCxPQUFPLEVBQWEsVUFBVSxFQUFFLFlBQVksRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBSXBGLE1BQU0sVUFBVSxxQkFBcUIsQ0FBQyxTQUFvQixFQUFFLFNBQW9CLEVBQUUsYUFBNkI7SUFDOUcsSUFBSSxNQUFNLEdBQUcsYUFBYSxDQUFDO0lBQzNCLE1BQU0sR0FBRywyQkFBMkIsQ0FBQyxTQUFTLEVBQUUsU0FBUyxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQ25FLDhEQUE4RDtJQUM5RCwyRUFBMkU7SUFDM0UsTUFBTSxHQUFHLDJCQUEyQixDQUFDLFNBQVMsRUFBRSxTQUFTLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDbkUsTUFBTSxHQUFHLGtCQUFrQixDQUFDLFNBQVMsRUFBRSxTQUFTLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDMUQsT0FBTyxNQUFNLENBQUM7QUFDZixDQUFDO0FBRUQ7Ozs7Ozs7Ozs7O0dBV0c7QUFDSCxTQUFTLDJCQUEyQixDQUFDLFNBQW9CLEVBQUUsU0FBb0IsRUFBRSxhQUE2QjtJQUM3RyxJQUFJLGFBQWEsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7UUFDaEMsT0FBTyxhQUFhLENBQUM7SUFDdEIsQ0FBQztJQUVELE1BQU0s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