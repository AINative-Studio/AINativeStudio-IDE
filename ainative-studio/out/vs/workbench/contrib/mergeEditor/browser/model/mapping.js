/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { compareBy, numberComparator } from '../../../../../base/common/arrays.js';
import { findLast } from '../../../../../base/common/arraysFind.js';
import { assertFn, checkAdjacentItems } from '../../../../../base/common/assert.js';
import { BugIndicatingError } from '../../../../../base/common/errors.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { concatArrays } from '../utils.js';
import { LineRangeEdit } from './editing.js';
import { LineRange } from './lineRange.js';
import { addLength, lengthBetweenPositions, rangeContainsPosition, rangeIsBeforeOrTouching } from './rangeUtils.js';
/**
 * Represents a mapping of an input line range to an output line range.
*/
export class LineRangeMapping {
    static join(mappings) {
        return mappings.reduce((acc, cur) => acc ? acc.join(cur) : cur, undefined);
    }
    constructor(inputRange, outputRange) {
        this.inputRange = inputRange;
        this.outputRange = outputRange;
    }
    extendInputRange(extendedInputRange) {
        if (!extendedInputRange.containsRange(this.inputRange)) {
            throw new BugIndicatingError();
        }
        const startDelta = extendedInputRange.startLineNumber - this.inputRange.startLineNumber;
        const endDelta = extendedInputRange.endLineNumberExclusive - this.inputRange.endLineNumberExclusive;
        return new LineRangeMapping(extendedInputRange, new LineRange(this.outputRange.startLineNumber + startDelta, this.outputRange.lineCount - startDelta + endDelta));
    }
    join(other) {
        return new LineRangeMapping(this.inputRange.join(other.inputRange), this.outputRange.join(other.outputRange));
    }
    get resultingDeltaFromOriginalToModified() {
        return this.outputRange.endLineNumberExclusive - this.inputRange.endLineNumberExclusive;
    }
    toString() {
        return `${this.inputRange.toString()} -> ${this.outputRange.toString()}`;
    }
    addOutputLineDelta(delta) {
        return new LineRangeMapping(this.inputRange, this.outputRange.delta(delta));
    }
    addInputLineDelta(delta) {
        return new LineRangeMapping(this.inputRange.delta(delta), this.outputRange);
    }
    reverse() {
        return new LineRangeMapping(this.outputRange, this.inputRange);
    }
}
/**
* Represents a total monotonous mapping of line ranges in one document to another document.
*/
export class DocumentLineRangeMap {
    static betweenOutputs(inputToOutput1, inputToOutput2, inputLineCount) {
        const alignments = MappingAlignment.compute(inputToOutput1, inputToOutput2);
        const mappings = alignments.map((m) => new LineRangeMapping(m.output1Range, m.output2Range));
        return new DocumentLineRangeMap(mappings, inputLineCount);
    }
    constructor(
    /**
     * The line range mappings that define this document mapping.
     * The space between two input ranges must equal the space between two output ranges.
     * These holes act as dense sequence of 1:1 line mappings.
    */
    lineRangeMappings, inputLineCount) {
        this.lineRangeMappings = lineRangeMappings;
        this.inputLineCount = inputLineCount;
        assertFn(() => {
            return checkAdjacentItems(lineRangeMappings, (m1, m2) => m1.inputRange.isBefore(m2.inputRange) && m1.outputRange.isBefore(m2.outputRange) &&
                m2.inputRange.startLineNumber - m1.inputRange.endLineNumberExclusive === m2.outputRange.startLineNumber - m1.outputRange.endLineNumberExclusive);
        });
    }
    project(lineNumber) {
        const lastBefore = findLast(this.lineRangeMappings, r => r.inputRange.startLineNumber <= lineNumber);
        if (!lastBefore) {
            return new LineRangeMapping(new LineRange(lineNumber, 1), new LineRange(lineNumber, 1));
        }
        if (lastBefore.inputRange.contains(lineNumber)) {
            return lastBefore;
        }
        const containingRange = new LineRange(lineNumber, 1);
        const mappedRange = new LineRange(lineNumber +
            lastBefore.outputRange.endLineNumberExclusive -
            lastBefore.inputRange.endLineNumberExclusive, 1);
        return new LineRangeMapping(containingRange, mappedRange);
    }
    get outputLineCount() {
        const last = this.lineRangeMappings.at(-1);
        const diff = last ? last.outputRange.endLineNumberExclusive - last.inputRange.endLineNumberExclusive : 0;
        return this.inputLineCount + diff;
    }
    reverse() {
        return new DocumentLineRangeMap(this.lineRangeMappings.map(r => r.reverse()), this.outputLineCount);
    }
}
/**
 * Aligns two mappings with a common input range.
 */
export class MappingAlignment {
    static compute(fromInputToOutput1, fromInputToOutput2) {
        const compareByStartLineNumber = compareBy((d) => d.inputRange.startLineNumber, numberComparator);
        const combinedDiffs = concatArrays(fromInputToOutput1.map((diff) => ({ source: 0, diff })), fromInputToOutput2.map((diff) => ({ source: 1, diff }))).sort(compareBy((d) => d.diff, compareByStartLineNumber));
        const currentDiffs = [new Array(), new Array()];
        const deltaFromBaseToInput = [0, 0];
        const alignments = new Array();
        function pushAndReset(inputRange) {
            const mapping1 = LineRangeMapping.join(currentDiffs[0]) || new LineRangeMapping(inputRange, inputRange.delta(deltaFromBaseToInput[0]));
            const mapping2 = LineRangeMapping.join(currentDiffs[1]) || new LineRangeMapping(inputRange, inputRange.delta(deltaFromBaseToInput[1]));
            alignments.push(new MappingAlignment(currentInputRange, mapping1.extendInputRange(currentInputRange).outputRange, currentDiffs[0], mapping2.extendInputRange(currentInputRange).outputRange, currentDiffs[1]));
            currentDiffs[0] = [];
            currentDiffs[1] = [];
        }
        let currentInputRange;
        for (const diff of combinedDiffs) {
            const range = diff.diff.inputRange;
            if (currentInputRange && !currentInputRange.touches(range)) {
                pushAndReset(currentInputRange);
                currentInputRange = undefined;
            }
            deltaFromBaseToInput[diff.source] =
                diff.diff.resultingDeltaFromOriginalToModified;
            currentInputRange = currentInputRange ? currentInputRange.join(range) : range;
            currentDiffs[diff.source].push(diff.diff);
        }
        if (currentInputRange) {
            pushAndReset(currentInputRange);
        }
        return alignments;
    }
    constructor(inputRange, output1Range, output1LineMappings, output2Range, output2LineMappings) {
        this.inputRange = inputRange;
        this.output1Range = output1Range;
        this.output1LineMappings = output1LineMappings;
        this.output2Range = output2Range;
        this.output2LineMappings = output2LineMappings;
    }
    toString() {
        return `${this.output1Range} <- ${this.inputRange} -> ${this.output2Range}`;
    }
}
/**
 * A line range mapping with inner range mappings.
*/
export class DetailedLineRangeMapping extends LineRangeMapping {
    static join(mappings) {
        return mappings.reduce((acc, cur) => acc ? acc.join(cur) : cur, undefined);
    }
    constructor(inputRange, inputTextModel, outputRange, outputTextModel, rangeMappings) {
        super(inputRange, outputRange);
        this.inputTextModel = inputTextModel;
        this.outputTextModel = outputTextModel;
        this.rangeMappings = rangeMappings || [new RangeMapping(this.inputRange.toRange(), this.outputRange.toRange())];
    }
    addOutputLineDelta(delta) {
        return new DetailedLineRangeMapping(this.inputRange, this.inputTextModel, this.outputRange.delta(delta), this.outputTextModel, this.rangeMappings.map(d => d.addOutputLineDelta(delta)));
    }
    addInputLineDelta(delta) {
        return new DetailedLineRangeMapping(this.inputRange.delta(delta), this.inputTextModel, this.outputRange, this.outputTextModel, this.rangeMappings.map(d => d.addInputLineDelta(delta)));
    }
    join(other) {
        return new DetailedLineRangeMapping(this.inputRange.join(other.inputRange), this.inputTextModel, this.outputRange.join(other.outputRange), this.outputTextModel);
    }
    getLineEdit() {
        return new LineRangeEdit(this.inputRange, this.getOutputLines());
    }
    getReverseLineEdit() {
        return new LineRangeEdit(this.outputRange, this.getInputLines());
    }
    getOutputLines() {
        return this.outputRange.getLines(this.outputTextModel);
    }
    getInputLines() {
        return this.inputRange.getLines(this.inputTextModel);
    }
}
/**
 * Represents a mapping of an input range to an output range.
*/
export class RangeMapping {
    constructor(inputRange, outputRange) {
        this.inputRange = inputRange;
        this.outputRange = outputRange;
    }
    toString() {
        function rangeToString(range) {
            // TODO@hediet make this the default Range.toString
            return `[${range.startLineNumber}:${range.startColumn}, ${range.endLineNumber}:${range.endColumn})`;
        }
        return `${rangeToString(this.inputRange)} -> ${rangeToString(this.outputRange)}`;
    }
    addOutputLineDelta(deltaLines) {
        return new RangeMapping(this.inputRange, new Range(this.outputRange.startLineNumber + deltaLines, this.outputRange.startColumn, this.outputRange.endLineNumber + deltaLines, this.outputRange.endColumn));
    }
    addInputLineDelta(deltaLines) {
        return new RangeMapping(new Range(this.inputRange.startLineNumber + deltaLines, this.inputRange.startColumn, this.inputRange.endLineNumber + deltaLines, this.inputRange.endColumn), this.outputRange);
    }
    reverse() {
        return new RangeMapping(this.outputRange, this.inputRange);
    }
}
/**
* Represents a total monotonous mapping of ranges in one document to another document.
*/
export class DocumentRangeMap {
    constructor(
    /**
     * The line range mappings that define this document mapping.
     * Can have holes.
    */
    rangeMappings, inputLineCount) {
        this.rangeMappings = rangeMappings;
        this.inputLineCount = inputLineCount;
        assertFn(() => checkAdjacentItems(rangeMappings, (m1, m2) => rangeIsBeforeOrTouching(m1.inputRange, m2.inputRange) &&
            rangeIsBeforeOrTouching(m1.outputRange, m2.outputRange) /*&&
        lengthBetweenPositions(m1.inputRange.getEndPosition(), m2.inputRange.getStartPosition()).equals(
            lengthBetweenPositions(m1.outputRange.getEndPosition(), m2.outputRange.getStartPosition())
        )*/));
    }
    project(position) {
        const lastBefore = findLast(this.rangeMappings, r => r.inputRange.getStartPosition().isBeforeOrEqual(position));
        if (!lastBefore) {
            return new RangeMapping(Range.fromPositions(position, position), Range.fromPositions(position, position));
        }
        if (rangeContainsPosition(lastBefore.inputRange, position)) {
            return lastBefore;
        }
        const dist = lengthBetweenPositions(lastBefore.inputRange.getEndPosition(), position);
        const outputPos = addLength(lastBefore.outputRange.getEndPosition(), dist);
        return new RangeMapping(Range.fromPositions(position), Range.fromPositions(outputPos));
    }
    projectRange(range) {
        const start = this.project(range.getStartPosition());
        const end = this.project(range.getEndPosition());
        return new RangeMapping(start.inputRange.plusRange(end.inputRange), start.outputRange.plusRange(end.outputRange));
    }
    get outputLineCount() {
        const last = this.rangeMappings.at(-1);
        const diff = last ? last.outputRange.endLineNumber - last.inputRange.endLineNumber : 0;
        return this.inputLineCount + diff;
    }
    reverse() {
        return new DocumentRangeMap(this.rangeMappings.map(m => m.reverse()), this.outputLineCount);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFwcGluZy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9tZXJnZUVkaXRvci9icm93c2VyL21vZGVsL21hcHBpbmcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ25GLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNwRSxPQUFPLEVBQUUsUUFBUSxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDcEYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFMUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBRW5FLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxhQUFhLENBQUM7QUFDM0MsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGNBQWMsQ0FBQztBQUM3QyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFDM0MsT0FBTyxFQUFFLFNBQVMsRUFBRSxzQkFBc0IsRUFBRSxxQkFBcUIsRUFBRSx1QkFBdUIsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBRXBIOztFQUVFO0FBQ0YsTUFBTSxPQUFPLGdCQUFnQjtJQUNyQixNQUFNLENBQUMsSUFBSSxDQUFDLFFBQXFDO1FBQ3ZELE9BQU8sUUFBUSxDQUFDLE1BQU0sQ0FBK0IsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxTQUFTLENBQUMsQ0FBQztJQUMxRyxDQUFD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