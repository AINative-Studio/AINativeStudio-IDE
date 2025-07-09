/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { SequenceDiff } from './algorithms/diffAlgorithm.js';
import { LineRangeMapping } from '../rangeMapping.js';
import { pushMany, compareBy, numberComparator, reverseOrder } from '../../../../base/common/arrays.js';
import { MonotonousArray, findLastMonotonous } from '../../../../base/common/arraysFind.js';
import { SetMap } from '../../../../base/common/map.js';
import { LineRange, LineRangeSet } from '../../core/lineRange.js';
import { LinesSliceCharSequence } from './linesSliceCharSequence.js';
import { LineRangeFragment, isSpace } from './utils.js';
import { MyersDiffAlgorithm } from './algorithms/myersDiffAlgorithm.js';
import { Range } from '../../core/range.js';
export function computeMovedLines(changes, originalLines, modifiedLines, hashedOriginalLines, hashedModifiedLines, timeout) {
    let { moves, excludedChanges } = computeMovesFromSimpleDeletionsToSimpleInsertions(changes, originalLines, modifiedLines, timeout);
    if (!timeout.isValid()) {
        return [];
    }
    const filteredChanges = changes.filter(c => !excludedChanges.has(c));
    const unchangedMoves = computeUnchangedMoves(filteredChanges, hashedOriginalLines, hashedModifiedLines, originalLines, modifiedLines, timeout);
    pushMany(moves, unchangedMoves);
    moves = joinCloseConsecutiveMoves(moves);
    // Ignore too short moves
    moves = moves.filter(current => {
        const lines = current.original.toOffsetRange().slice(originalLines).map(l => l.trim());
        const originalText = lines.join('\n');
        return originalText.length >= 15 && countWhere(lines, l => l.length >= 2) >= 2;
    });
    moves = removeMovesInSameDiff(changes, moves);
    return moves;
}
function countWhere(arr, predicate) {
    let count = 0;
    for (const t of arr) {
        if (predicate(t)) {
            count++;
        }
    }
    return count;
}
function computeMovesFromSimpleDeletionsToSimpleInsertions(changes, originalLines, modifiedLines, timeout) {
    const moves = [];
    const deletions = changes
        .filter(c => c.modified.isEmpty && c.original.length >= 3)
        .map(d => new LineRangeFragment(d.original, originalLines, d));
    const insertions = new Set(changes
        .filter(c => c.original.isEmpty && c.modified.length >= 3)
        .map(d => new LineRangeFragment(d.modified, modifiedLines, d)));
    const excludedChanges = new Set();
    for (const deletion of deletions) {
        let highestSimilarity = -1;
        let best;
        for (const insertion of insertions) {
            const similarity = deletion.computeSimilarity(insertion);
            if (similarity > highestSimilarity) {
                highestSimilarity = similarity;
                best = insertion;
            }
        }
        if (highestSimilarity > 0.90 && best) {
            insertions.delete(best);
            moves.push(new LineRangeMapping(deletion.range, best.range));
            excludedChanges.add(deletion.source);
            excludedChanges.add(best.source);
        }
        if (!timeout.isValid()) {
            return { moves, excludedChanges };
        }
    }
    return { moves, excludedChanges };
}
function computeUnchangedMoves(changes, hashedOriginalLines, hashedModifiedLines, originalLines, modifiedLines, timeout) {
    const moves = [];
    const original3LineHashes = new SetMap();
    for (const change of changes) {
        for (let i = change.original.startLineNumber; i < change.original.endLineNumberExclusive - 2; i++) {
            const key = `${hashedOriginalLines[i - 1]}:${hashedOriginalLines[i + 1 - 1]}:${hashedOriginalLines[i + 2 - 1]}`;
            original3LineHashes.add(key, { range: new LineRange(i, i + 3) });
        }
    }
    const possibleMappings = [];
    changes.sort(compareBy(c => c.modified.startLineNumber, numberComparator));
    for (const change of changes) {
        let lastMappings = [];
        for (let i = change.modified.startLineNumber; i < change.modified.endLineNumberExclusive - 2; i++) {
            const key = `${hashedModifiedLines[i - 1]}:${hashedModifiedLines[i + 1 - 1]}:${hashedModifiedLines[i + 2 - 1]}`;
            const currentModifiedRange = new LineRange(i, i + 3);
            const nextMappings = [];
            original3LineHashes.forEach(key, ({ range }) => {
                for (const lastMapping of lastMappings) {
                    // does this match extend some last match?
                    if (lastMapping.originalLineRange.endLineNumberExclusive + 1 === range.endLineNumberExclusive &&
                        lastMapping.modifiedLineRange.endLineNumberExclusive + 1 === currentModifiedRange.endLineNumberExclusive) {
                        lastMapping.originalLineRange = new LineRange(lastMapping.originalLineRange.startLineNumber, range.endLineNumberExclusive);
                        lastMapping.modifiedLineRange = new LineRange(lastMapping.modifiedLineRange.startLineNumber, currentModifiedRange.endLineNumberExclusive);
                        nextMappings.push(lastMapping);
                        return;
                    }
                }
                const mapping = {
                    modifiedLineRange: currentModifiedRange,
                    originalLineRange: range,
                };
                possibleMappings.push(mapping);
                nextMappings.push(mapping);
            });
            lastMappings = nextMappings;
        }
        if (!timeout.isValid()) {
            return [];
        }
    }
    possibleMappings.sort(reverseOrder(compareBy(m => m.modifiedLineRange.length, numberComparator)));
    const modifiedSet = new LineRangeSet();
    const originalSet = new LineRangeSet();
    for (const mapping of possibleMappings) {
        const diffOrigToMod = mapping.modifiedLineRange.startLineNumber - mapping.originalLineRange.startLineNumber;
        const modifiedSections = modifiedSet.subtractFrom(mapping.modifiedLineRange);
        const originalTranslatedSections = originalSet.subtractFrom(mapping.originalLineRange).getWithDelta(diffOrigToMod);
        const modifiedIntersectedSections = modifiedSections.getIntersection(originalTranslatedSections);
        for (const s of modifiedIntersectedSections.ranges) {
            if (s.length < 3) {
                continue;
            }
            const modifiedLineRange = s;
            const originalLineRange = s.delta(-diffOrigToMod);
            moves.push(new LineRangeMapping(originalLineRange, modifiedLineRange));
            modifiedSet.addRange(modifiedLineRange);
            originalSet.addRange(originalLineRange);
        }
    }
    moves.sort(compareBy(m => m.original.startLineNumber, numberComparator));
    const monotonousChanges = new MonotonousArray(changes);
    for (let i = 0; i < moves.length; i++) {
        const move = moves[i];
        const firstTouchingChangeOrig = monotonousChanges.findLastMonotonous(c => c.original.startLineNumber <= move.original.startLineNumber);
        const firstTouchingChangeMod = findLastMonotonous(changes, c => c.modified.startLineNumber <= move.modified.startLineNumber);
        const linesAbove = Math.max(move.original.startLineNumber - firstTouchingChangeOrig.original.startLineNumber, move.modified.startLineNumber - firstTouchingChangeMod.modified.startLineNumber);
        const lastTouchingChangeOrig = monotonousChanges.findLastMonotonous(c => c.original.startLineNumber < move.original.endLineNumberExclusive);
        const lastTouchingChangeMod = findLastMonotonous(changes, c => c.modified.startLineNumber < move.modified.endLineNumberExclusive);
        const linesBelow = Math.max(lastTouchingChangeOrig.original.endLineNumberExclusive - move.original.endLineNumberExclusive, lastTouchingChangeMod.modified.endLineNumberExclusive - move.modified.endLineNumberExclusive);
        let extendToTop;
        for (extendToTop = 0; extendToTop < linesAbove; extendToTop++) {
            const origLine = move.original.startLineNumber - extendToTop - 1;
            const modLine = move.modified.startLineNumber - extendToTop - 1;
            if (origLine > originalLines.length || modLine > modifiedLines.length) {
                break;
            }
            if (modifiedSet.contains(modLine) || originalSet.contains(origLine)) {
                break;
            }
            if (!areLinesSimilar(originalLines[origLine - 1], modifiedLines[modLine - 1], timeout)) {
                break;
            }
        }
        if (extendToTop > 0) {
            originalSet.addRange(new LineRange(move.original.startLineNumber - extendToTop, move.original.startLineNumber));
            modifiedSet.addRange(new LineRange(move.modified.startLineNumber - extendToTop, move.modified.startLineNumber));
        }
        let extendToBottom;
        for (extendToBottom = 0; extendToBottom < linesBelow; extendToBottom++) {
            const origLine = move.original.endLineNumberExclusive + extendToBottom;
            const modLine = move.modified.endLineNumberExclusive + extendToBottom;
            if (origLine > originalLines.length || modLine > modifiedLines.length) {
                break;
            }
            if (modifiedSet.contains(modLine) || originalSet.contains(origLine)) {
                break;
            }
            if (!areLinesSimilar(originalLines[origLine - 1], modifiedLines[modLine - 1], timeout)) {
                break;
            }
        }
        if (extendToBottom > 0) {
            originalSet.addRange(new LineRange(move.original.endLineNumberExclusive, move.original.endLineNumberExclusive + extendToBottom));
            modifiedSet.addRange(new LineRange(move.modified.endLineNumberExclusive, move.modified.endLineNumberExclusive + extendToBottom));
        }
        if (extendToTop > 0 || extendToBottom > 0) {
            moves[i] = new LineRangeMapping(new LineRange(move.original.startLineNumber - extendToTop, move.original.endLineNumberExclusive + extendToBottom), new LineRange(move.modified.startLineNumber - extendToTop, move.modified.endLineNumberExclusive + extendToBottom));
        }
    }
    return moves;
}
function areLinesSimilar(line1, line2, timeout) {
    if (line1.trim() === line2.trim()) {
        return true;
    }
    if (line1.length > 300 && line2.length > 300) {
        return false;
    }
    const myersDiffingAlgorithm = new MyersDiffAlgorithm();
    const result = myersDiffingAlgorithm.compute(new LinesSliceCharSequence([line1], new Range(1, 1, 1, line1.length), false), new LinesSliceCharSequence([line2], new Range(1, 1, 1, line2.length), false), timeout);
    let commonNonSpaceCharCount = 0;
    const inverted = SequenceDiff.invert(result.diffs, line1.length);
    for (const seq of inverted) {
        seq.seq1Range.forEach(idx => {
            if (!isSpace(line1.charCodeAt(idx))) {
                commonNonSpaceCharCount++;
            }
        });
    }
    function countNonWsChars(str) {
        let count = 0;
        for (let i = 0; i < line1.length; i++) {
            if (!isSpace(str.charCodeAt(i))) {
                count++;
            }
        }
        return count;
    }
    const longerLineLength = countNonWsChars(line1.length > line2.length ? line1 : line2);
    const r = commonNonSpaceCharCount / longerLineLength > 0.6 && longerLineLength > 10;
    return r;
}
function joinCloseConsecutiveMoves(moves) {
    if (moves.length === 0) {
        return moves;
    }
    moves.sort(compareBy(m => m.original.startLineNumber, numberComparator));
    const result = [moves[0]];
    for (let i = 1; i < moves.length; i++) {
        const last = result[result.length - 1];
        const current = moves[i];
        const originalDist = current.original.startLineNumber - last.original.endLineNumberExclusive;
        const modifiedDist = current.modified.startLineNumber - last.modified.endLineNumberExclusive;
        const currentMoveAfterLast = originalDist >= 0 && modifiedDist >= 0;
        if (currentMoveAfterLast && originalDist + modifiedDist <= 2) {
            result[result.length - 1] = last.join(current);
            continue;
        }
        result.push(current);
    }
    return result;
}
function removeMovesInSameDiff(changes, moves) {
    const changesMonotonous = new MonotonousArray(changes);
    moves = moves.filter(m => {
        const diffBeforeEndOfMoveOriginal = changesMonotonous.findLastMonotonous(c => c.original.startLineNumber < m.original.endLineNumberExclusive)
            || new LineRangeMapping(new LineRange(1, 1), new LineRange(1, 1));
        const diffBeforeEndOfMoveModified = findLastMonotonous(changes, c => c.modified.startLineNumber < m.modified.endLineNumberExclusive);
        const differentDiffs = diffBeforeEndOfMoveOriginal !== diffBeforeEndOfMoveModified;
        return differentDiffs;
    });
    return moves;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcHV0ZU1vdmVkTGluZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9kaWZmL2RlZmF1bHRMaW5lc0RpZmZDb21wdXRlci9jb21wdXRlTW92ZWRMaW5lcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQVksWUFBWSxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDdkUsT0FBTyxFQUE0QixnQkFBZ0IsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQ2hGLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLGdCQUFnQixFQUFFLFlBQVksRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3hHLE9BQU8sRUFBRSxlQUFlLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUM1RixPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDeEQsT0FBTyxFQUFFLFNBQVMsRUFBRSxZQUFZLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUNsRSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUNyRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsT0FBTyxFQUFFLE1BQU0sWUFBWSxDQUFDO0FBQ3hELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUU1QyxNQUFNLFVBQVUsaUJBQWlCLENBQ2hDLE9BQW1DLEVBQ25DLGFBQXVCLEVBQ3ZCLGFBQXVCLEVBQ3ZCLG1CQUE2QixFQUM3QixtQkFBNkIsRUFDN0IsT0FBaUI7SUFFakIsSUFBSSxFQUFFLEtBQUssRUFBRSxlQUFlLEVBQUUsR0FBRyxpREFBaUQsQ0FBQyxPQUFPLEVB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