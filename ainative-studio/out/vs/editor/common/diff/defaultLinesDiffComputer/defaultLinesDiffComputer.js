/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { equals } from '../../../../base/common/arrays.js';
import { assertFn } from '../../../../base/common/assert.js';
import { LineRange } from '../../core/lineRange.js';
import { OffsetRange } from '../../core/offsetRange.js';
import { Range } from '../../core/range.js';
import { ArrayText } from '../../core/textEdit.js';
import { LinesDiff, MovedText } from '../linesDiffComputer.js';
import { DetailedLineRangeMapping, LineRangeMapping, lineRangeMappingFromRangeMappings, RangeMapping } from '../rangeMapping.js';
import { DateTimeout, InfiniteTimeout, SequenceDiff } from './algorithms/diffAlgorithm.js';
import { DynamicProgrammingDiffing } from './algorithms/dynamicProgrammingDiffing.js';
import { MyersDiffAlgorithm } from './algorithms/myersDiffAlgorithm.js';
import { computeMovedLines } from './computeMovedLines.js';
import { extendDiffsToEntireWordIfAppropriate, optimizeSequenceDiffs, removeShortMatches, removeVeryShortMatchingLinesBetweenDiffs, removeVeryShortMatchingTextBetweenLongDiffs } from './heuristicSequenceOptimizations.js';
import { LineSequence } from './lineSequence.js';
import { LinesSliceCharSequence } from './linesSliceCharSequence.js';
export class DefaultLinesDiffComputer {
    constructor() {
        this.dynamicProgrammingDiffing = new DynamicProgrammingDiffing();
        this.myersDiffingAlgorithm = new MyersDiffAlgorithm();
    }
    computeDiff(originalLines, modifiedLines, options) {
        if (originalLines.length <= 1 && equals(originalLines, modifiedLines, (a, b) => a === b)) {
            return new LinesDiff([], [], false);
        }
        if (originalLines.length === 1 && originalLines[0].length === 0 || modifiedLines.length === 1 && modifiedLines[0].length === 0) {
            return new LinesDiff([
                new DetailedLineRangeMapping(new LineRange(1, originalLines.length + 1), new LineRange(1, modifiedLines.length + 1), [
                    new RangeMapping(new Range(1, 1, originalLines.length, originalLines[originalLines.length - 1].length + 1), new Range(1, 1, modifiedLines.length, modifiedLines[modifiedLines.length - 1].length + 1))
                ])
            ], [], false);
        }
        const timeout = options.maxComputationTimeMs === 0 ? InfiniteTimeout.instance : new DateTimeout(options.maxComputationTimeMs);
        const considerWhitespaceChanges = !options.ignoreTrimWhitespace;
        const perfectHashes = new Map();
        function getOrCreateHash(text) {
            let hash = perfectHashes.get(text);
            if (hash === undefined) {
                hash = perfectHashes.size;
                perfectHashes.set(text, hash);
            }
            return hash;
        }
        const originalLinesHashes = originalLines.map((l) => getOrCreateHash(l.trim()));
        const modifiedLinesHashes = modifiedLines.map((l) => getOrCreateHash(l.trim()));
        const sequence1 = new LineSequence(originalLinesHashes, originalLines);
        const sequence2 = new LineSequence(modifiedLinesHashes, modifiedLines);
        const lineAlignmentResult = (() => {
            if (sequence1.length + sequence2.length < 1700) {
                // Use the improved algorithm for small files
                return this.dynamicProgrammingDiffing.compute(sequence1, sequence2, timeout, (offset1, offset2) => originalLines[offset1] === modifiedLines[offset2]
                    ? modifiedLines[offset2].length === 0
                        ? 0.1
                        : 1 + Math.log(1 + modifiedLines[offset2].length)
                    : 0.99);
            }
            return this.myersDiffingAlgorithm.compute(sequence1, sequence2, timeout);
        })();
        let lineAlignments = lineAlignmentResult.diffs;
        let hitTimeout = lineAlignmentResult.hitTimeout;
        lineAlignments = optimizeSequenceDiffs(sequence1, sequence2, lineAlignments);
        lineAlignments = removeVeryShortMatchingLinesBetweenDiffs(sequence1, sequence2, lineAlignments);
        const alignments = [];
        const scanForWhitespaceChanges = (equalLinesCount) => {
            if (!considerWhitespaceChanges) {
                return;
            }
            for (let i = 0; i < equalLinesCount; i++) {
                const seq1Offset = seq1LastStart + i;
                const seq2Offset = seq2LastStart + i;
                if (originalLines[seq1Offset] !== modifiedLines[seq2Offset]) {
                    // This is because of whitespace changes, diff these lines
                    const characterDiffs = this.refineDiff(originalLines, modifiedLines, new SequenceDiff(new OffsetRange(seq1Offset, seq1Offset + 1), new OffsetRange(seq2Offset, seq2Offset + 1)), timeout, considerWhitespaceChanges, options);
                    for (const a of characterDiffs.mappings) {
                        alignments.push(a);
                    }
                    if (characterDiffs.hitTimeout) {
                        hitTimeout = true;
                    }
                }
            }
        };
        let seq1LastStart = 0;
        let seq2LastStart = 0;
        for (const diff of lineAlignments) {
            assertFn(() => diff.seq1Range.start - seq1LastStart === diff.seq2Range.start - seq2LastStart);
            const equalLinesCount = diff.seq1Range.start - seq1LastStart;
            scanForWhitespaceChanges(equalLinesCount);
            seq1LastStart = diff.seq1Range.endExclusive;
            seq2LastStart = diff.seq2Range.endExclusive;
            const characterDiffs = this.refineDiff(originalLines, modifiedLines, diff, timeout, considerWhitespaceChanges, options);
            if (characterDiffs.hitTimeout) {
                hitTimeout = true;
            }
            for (const a of characterDiffs.mappings) {
                alignments.push(a);
            }
        }
        scanForWhitespaceChanges(originalLines.length - seq1LastStart);
        const changes = lineRangeMappingFromRangeMappings(alignments, new ArrayText(originalLines), new ArrayText(modifiedLines));
        let moves = [];
        if (options.computeMoves) {
            moves = this.computeMoves(changes, originalLines, modifiedLines, originalLinesHashes, modifiedLinesHashes, timeout, considerWhitespaceChanges, options);
        }
        // Make sure all ranges are valid
        assertFn(() => {
            function validatePosition(pos, lines) {
                if (pos.lineNumber < 1 || pos.lineNumber > lines.length) {
                    return false;
                }
                const line = lines[pos.lineNumber - 1];
                if (pos.column < 1 || pos.column > line.length + 1) {
                    return false;
                }
                return true;
            }
            function validateRange(range, lines) {
                if (range.startLineNumber < 1 || range.startLineNumber > lines.length + 1) {
                    return false;
                }
                if (range.endLineNumberExclusive < 1 || range.endLineNumberExclusive > lines.length + 1) {
                    return false;
                }
                return true;
            }
            for (const c of changes) {
                if (!c.innerChanges) {
                    return false;
                }
                for (const ic of c.innerChanges) {
                    const valid = validatePosition(ic.modifiedRange.getStartPosition(), modifiedLines) && validatePosition(ic.modifiedRange.getEndPosition(), modifiedLines) &&
                        validatePosition(ic.originalRange.getStartPosition(), originalLines) && validatePosition(ic.originalRange.getEndPosition(), originalLines);
                    if (!valid) {
                        return false;
                    }
                }
                if (!validateRange(c.modified, modifiedLines) || !validateRange(c.original, originalLines)) {
                    return false;
                }
            }
            return true;
        });
        return new LinesDiff(changes, moves, hitTimeout);
    }
    computeMoves(changes, originalLines, modifiedLines, hashedOriginalLines, hashedModifiedLines, timeout, considerWhitespaceChanges, options) {
        const moves = computeMovedLines(changes, originalLines, modifiedLines, hashedOriginalLines, hashedModifiedLines, timeout);
        const movesWithDiffs = moves.map(m => {
            const moveChanges = this.refineDiff(originalLines, modifiedLines, new SequenceDiff(m.original.toOffsetRange(), m.modified.toOffsetRange()), timeout, considerWhitespaceChanges, options);
            const mappings = lineRangeMappingFromRangeMappings(moveChanges.mappings, new ArrayText(originalLines), new ArrayText(modifiedLines), true);
            return new MovedText(m, mappings);
        });
        return movesWithDiffs;
    }
    refineDiff(originalLines, modifiedLines, diff, timeout, considerWhitespaceChanges, options) {
        const lineRangeMapping = toLineRangeMapping(diff);
        const rangeMapping = lineRangeMapping.toRangeMapping2(originalLines, modifiedLines);
        const slice1 = new LinesSliceCharSequence(originalLines, rangeMapping.originalRange, considerWhitespaceChanges);
        const slice2 = new LinesSliceCharSequence(modifiedLines, rangeMapping.modifiedRange, considerWhitespaceChanges);
        const diffResult = slice1.length + slice2.length < 500
            ? this.dynamicProgrammingDiffing.compute(slice1, slice2, timeout)
            : this.myersDiffingAlgorithm.compute(slice1, slice2, timeout);
        const check = false;
        let diffs = diffResult.diffs;
        if (check) {
            SequenceDiff.assertSorted(diffs);
        }
        diffs = optimizeSequenceDiffs(slice1, slice2, diffs);
        if (check) {
            SequenceDiff.assertSorted(diffs);
        }
        diffs = extendDiffsToEntireWordIfAppropriate(slice1, slice2, diffs, (seq, idx) => seq.findWordContaining(idx));
        if (check) {
            SequenceDiff.assertSorted(diffs);
        }
        if (options.extendToSubwords) {
            diffs = extendDiffsToEntireWordIfAppropriate(slice1, slice2, diffs, (seq, idx) => seq.findSubWordContaining(idx), true);
            if (check) {
                SequenceDiff.assertSorted(diffs);
            }
        }
        diffs = removeShortMatches(slice1, slice2, diffs);
        if (check) {
            SequenceDiff.assertSorted(diffs);
        }
        diffs = removeVeryShortMatchingTextBetweenLongDiffs(slice1, slice2, diffs);
        if (check) {
            SequenceDiff.assertSorted(diffs);
        }
        const result = diffs.map((d) => new RangeMapping(slice1.translateRange(d.seq1Range), slice2.translateRange(d.seq2Range)));
        if (check) {
            RangeMapping.assertSorted(result);
        }
        // Assert: result applied on original should be the same as diff applied to original
        return {
            mappings: result,
            hitTimeout: diffResult.hitTimeout,
        };
    }
}
function toLineRangeMapping(sequenceDiff) {
    return new LineRangeMapping(new LineRange(sequenceDiff.seq1Range.start + 1, sequenceDiff.seq1Range.endExclusive + 1), new LineRange(sequenceDiff.seq2Range.start + 1, sequenceDiff.seq2Range.endExclusive + 1));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVmYXVsdExpbmVzRGlmZkNvbXB1dGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vZGlmZi9kZWZhdWx0TGluZXNEaWZmQ29tcHV0ZXIvZGVmYXVsdExpbmVzRGlmZkNvbXB1dGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUMzRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDN0QsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBQ3BELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUV4RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFDNUMsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQ25ELE9BQU8sRUFBaUQsU0FBUyxFQUFFLFNBQVMsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBQzlHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxnQkFBZ0IsRUFBRSxpQ0FBaUMsRUFBRSxZQUFZLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUNqSSxPQUFPLEVBQUUsV0FBVyxFQUFFLGVBQWUsRUFBWSxZQUFZLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUNyRyxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUN0RixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUN4RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUMzRCxPQUFPLEVBQUUsb0NBQW9DLEVBQUUscUJBQXFCLEVBQUUsa0JBQWtCLEVBQUUsd0NB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