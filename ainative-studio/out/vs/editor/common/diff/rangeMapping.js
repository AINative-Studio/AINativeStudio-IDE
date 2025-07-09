/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { groupAdjacentBy } from '../../../base/common/arrays.js';
import { assertFn, checkAdjacentItems } from '../../../base/common/assert.js';
import { BugIndicatingError } from '../../../base/common/errors.js';
import { LineRange } from '../core/lineRange.js';
import { Position } from '../core/position.js';
import { Range } from '../core/range.js';
import { SingleTextEdit } from '../core/textEdit.js';
/**
 * Maps a line range in the original text model to a line range in the modified text model.
 */
export class LineRangeMapping {
    static inverse(mapping, originalLineCount, modifiedLineCount) {
        const result = [];
        let lastOriginalEndLineNumber = 1;
        let lastModifiedEndLineNumber = 1;
        for (const m of mapping) {
            const r = new LineRangeMapping(new LineRange(lastOriginalEndLineNumber, m.original.startLineNumber), new LineRange(lastModifiedEndLineNumber, m.modified.startLineNumber));
            if (!r.modified.isEmpty) {
                result.push(r);
            }
            lastOriginalEndLineNumber = m.original.endLineNumberExclusive;
            lastModifiedEndLineNumber = m.modified.endLineNumberExclusive;
        }
        const r = new LineRangeMapping(new LineRange(lastOriginalEndLineNumber, originalLineCount + 1), new LineRange(lastModifiedEndLineNumber, modifiedLineCount + 1));
        if (!r.modified.isEmpty) {
            result.push(r);
        }
        return result;
    }
    static clip(mapping, originalRange, modifiedRange) {
        const result = [];
        for (const m of mapping) {
            const original = m.original.intersect(originalRange);
            const modified = m.modified.intersect(modifiedRange);
            if (original && !original.isEmpty && modified && !modified.isEmpty) {
                result.push(new LineRangeMapping(original, modified));
            }
        }
        return result;
    }
    constructor(originalRange, modifiedRange) {
        this.original = originalRange;
        this.modified = modifiedRange;
    }
    toString() {
        return `{${this.original.toString()}->${this.modified.toString()}}`;
    }
    flip() {
        return new LineRangeMapping(this.modified, this.original);
    }
    join(other) {
        return new LineRangeMapping(this.original.join(other.original), this.modified.join(other.modified));
    }
    get changedLineCount() {
        return Math.max(this.original.length, this.modified.length);
    }
    /**
     * This method assumes that the LineRangeMapping describes a valid diff!
     * I.e. if one range is empty, the other range cannot be the entire document.
     * It avoids various problems when the line range points to non-existing line-numbers.
    */
    toRangeMapping() {
        const origInclusiveRange = this.original.toInclusiveRange();
        const modInclusiveRange = this.modified.toInclusiveRange();
        if (origInclusiveRange && modInclusiveRange) {
            return new RangeMapping(origInclusiveRange, modInclusiveRange);
        }
        else if (this.original.startLineNumber === 1 || this.modified.startLineNumber === 1) {
            if (!(this.modified.startLineNumber === 1 && this.original.startLineNumber === 1)) {
                // If one line range starts at 1, the other one must start at 1 as well.
                throw new BugIndicatingError('not a valid diff');
            }
            // Because one range is empty and both ranges start at line 1, none of the ranges can cover all lines.
            // Thus, `endLineNumberExclusive` is a valid line number.
            return new RangeMapping(new Range(this.original.startLineNumber, 1, this.original.endLineNumberExclusive, 1), new Range(this.modified.startLineNumber, 1, this.modified.endLineNumberExclusive, 1));
        }
        else {
            // We can assume here that both startLineNumbers are greater than 1.
            return new RangeMapping(new Range(this.original.startLineNumber - 1, Number.MAX_SAFE_INTEGER, this.original.endLineNumberExclusive - 1, Number.MAX_SAFE_INTEGER), new Range(this.modified.startLineNumber - 1, Number.MAX_SAFE_INTEGER, this.modified.endLineNumberExclusive - 1, Number.MAX_SAFE_INTEGER));
        }
    }
    /**
     * This method assumes that the LineRangeMapping describes a valid diff!
     * I.e. if one range is empty, the other range cannot be the entire document.
     * It avoids various problems when the line range points to non-existing line-numbers.
    */
    toRangeMapping2(original, modified) {
        if (isValidLineNumber(this.original.endLineNumberExclusive, original)
            && isValidLineNumber(this.modified.endLineNumberExclusive, modified)) {
            return new RangeMapping(new Range(this.original.startLineNumber, 1, this.original.endLineNumberExclusive, 1), new Range(this.modified.startLineNumber, 1, this.modified.endLineNumberExclusive, 1));
        }
        if (!this.original.isEmpty && !this.modified.isEmpty) {
            return new RangeMapping(Range.fromPositions(new Position(this.original.startLineNumber, 1), normalizePosition(new Position(this.original.endLineNumberExclusive - 1, Number.MAX_SAFE_INTEGER), original)), Range.fromPositions(new Position(this.modified.startLineNumber, 1), normalizePosition(new Position(this.modified.endLineNumberExclusive - 1, Number.MAX_SAFE_INTEGER), modified)));
        }
        if (this.original.startLineNumber > 1 && this.modified.startLineNumber > 1) {
            return new RangeMapping(Range.fromPositions(normalizePosition(new Position(this.original.startLineNumber - 1, Number.MAX_SAFE_INTEGER), original), normalizePosition(new Position(this.original.endLineNumberExclusive - 1, Number.MAX_SAFE_INTEGER), original)), Range.fromPositions(normalizePosition(new Position(this.modified.startLineNumber - 1, Number.MAX_SAFE_INTEGER), modified), normalizePosition(new Position(this.modified.endLineNumberExclusive - 1, Number.MAX_SAFE_INTEGER), modified)));
        }
        // Situation now: one range is empty and one range touches the last line and one range starts at line 1.
        // I don't think this can happen.
        throw new BugIndicatingError();
    }
}
function normalizePosition(position, content) {
    if (position.lineNumber < 1) {
        return new Position(1, 1);
    }
    if (position.lineNumber > content.length) {
        return new Position(content.length, content[content.length - 1].length + 1);
    }
    const line = content[position.lineNumber - 1];
    if (position.column > line.length + 1) {
        return new Position(position.lineNumber, line.length + 1);
    }
    return position;
}
function isValidLineNumber(lineNumber, lines) {
    return lineNumber >= 1 && lineNumber <= lines.length;
}
/**
 * Maps a line range in the original text model to a line range in the modified text model.
 * Also contains inner range mappings.
 */
export class DetailedLineRangeMapping extends LineRangeMapping {
    static fromRangeMappings(rangeMappings) {
        const originalRange = LineRange.join(rangeMappings.map(r => LineRange.fromRangeInclusive(r.originalRange)));
        const modifiedRange = LineRange.join(rangeMappings.map(r => LineRange.fromRangeInclusive(r.modifiedRange)));
        return new DetailedLineRangeMapping(originalRange, modifiedRange, rangeMappings);
    }
    constructor(originalRange, modifiedRange, innerChanges) {
        super(originalRange, modifiedRange);
        this.innerChanges = innerChanges;
    }
    flip() {
        return new DetailedLineRangeMapping(this.modified, this.original, this.innerChanges?.map(c => c.flip()));
    }
    withInnerChangesFromLineRanges() {
        return new DetailedLineRangeMapping(this.original, this.modified, [this.toRangeMapping()]);
    }
}
/**
 * Maps a range in the original text model to a range in the modified text model.
 */
export class RangeMapping {
    static fromEdit(edit) {
        const newRanges = edit.getNewRanges();
        const result = edit.edits.map((e, idx) => new RangeMapping(e.range, newRanges[idx]));
        return result;
    }
    static fromEditJoin(edit) {
        const newRanges = edit.getNewRanges();
        const result = edit.edits.map((e, idx) => new RangeMapping(e.range, newRanges[idx]));
        return RangeMapping.join(result);
    }
    static join(rangeMappings) {
        if (rangeMappings.length === 0) {
            throw new BugIndicatingError('Cannot join an empty list of range mappings');
        }
        let result = rangeMappings[0];
        for (let i = 1; i < rangeMappings.length; i++) {
            result = result.join(rangeMappings[i]);
        }
        return result;
    }
    static assertSorted(rangeMappings) {
        for (let i = 1; i < rangeMappings.length; i++) {
            const previous = rangeMappings[i - 1];
            const current = rangeMappings[i];
            if (!(previous.originalRange.getEndPosition().isBeforeOrEqual(current.originalRange.getStartPosition())
                && previous.modifiedRange.getEndPosition().isBeforeOrEqual(current.modifiedRange.getStartPosition()))) {
                throw new BugIndicatingError('Range mappings must be sorted');
            }
        }
    }
    constructor(originalRange, modifiedRange) {
        this.originalRange = originalRange;
        this.modifiedRange = modifiedRange;
    }
    toString() {
        return `{${this.originalRange.toString()}->${this.modifiedRange.toString()}}`;
    }
    flip() {
        return new RangeMapping(this.modifiedRange, this.originalRange);
    }
    /**
     * Creates a single text edit that describes the change from the original to the modified text.
    */
    toTextEdit(modified) {
        const newText = modified.getValueOfRange(this.modifiedRange);
        return new SingleTextEdit(this.originalRange, newText);
    }
    join(other) {
        return new RangeMapping(this.originalRange.plusRange(other.originalRange), this.modifiedRange.plusRange(other.modifiedRange));
    }
}
export function lineRangeMappingFromRangeMappings(alignments, originalLines, modifiedLines, dontAssertStartLine = false) {
    const changes = [];
    for (const g of groupAdjacentBy(alignments.map(a => getLineRangeMapping(a, originalLines, modifiedLines)), (a1, a2) => a1.original.overlapOrTouch(a2.original)
        || a1.modified.overlapOrTouch(a2.modified))) {
        const first = g[0];
        const last = g[g.length - 1];
        changes.push(new DetailedLineRangeMapping(first.original.join(last.original), first.modified.join(last.modified), g.map(a => a.innerChanges[0])));
    }
    assertFn(() => {
        if (!dontAssertStartLine && changes.length > 0) {
            if (changes[0].modified.startLineNumber !== changes[0].original.startLineNumber) {
                return false;
            }
            if (modifiedLines.length.lineCount - changes[changes.length - 1].modified.endLineNumberExclusive !== originalLines.length.lineCount - changes[changes.length - 1].original.endLineNumberExclusive) {
                return false;
            }
        }
        return checkAdjacentItems(changes, (m1, m2) => m2.original.startLineNumber - m1.original.endLineNumberExclusive === m2.modified.startLineNumber - m1.modified.endLineNumberExclusive &&
            // There has to be an unchanged line in between (otherwise both diffs should have been joined)
            m1.original.endLineNumberExclusive < m2.original.startLineNumber &&
            m1.modified.endLineNumberExclusive < m2.modified.startLineNumber);
    });
    return changes;
}
export function getLineRangeMapping(rangeMapping, originalLines, modifiedLines) {
    let lineStartDelta = 0;
    let lineEndDelta = 0;
    // rangeMapping describes the edit that replaces `rangeMapping.originalRange` with `newText := getText(modifiedLines, rangeMapping.modifiedRange)`.
    // original: ]xxx \n <- this line is not modified
    // modified: ]xx  \n
    if (rangeMapping.modifiedRange.endColumn === 1 && rangeMapping.originalRange.endColumn === 1
        && rangeMapping.originalRange.startLineNumber + lineStartDelta <= rangeMapping.originalRange.endLineNumber
        && rangeMapping.modifiedRange.startLineNumber + lineStartDelta <= rangeMapping.modifiedRange.endLineNumber) {
        // We can only do this if the range is not empty yet
        lineEndDelta = -1;
    }
    // original: xxx[ \n <- this line is not modified
    // modified: xxx[ \n
    if (rangeMapping.modifiedRange.startColumn - 1 >= modifiedLines.getLineLength(rangeMapping.modifiedRange.startLineNumber)
        && rangeMapping.originalRange.startColumn - 1 >= originalLines.getLineLength(rangeMapping.originalRange.startLineNumber)
        && rangeMapping.originalRange.startLineNumber <= rangeMapping.originalRange.endLineNumber + lineEndDelta
        && rangeMapping.modifiedRange.startLineNumber <= rangeMapping.modifiedRange.endLineNumber + lineEndDelta) {
        // We can only do this if the range is not empty yet
        lineStartDelta = 1;
    }
    const originalLineRange = new LineRange(rangeMapping.originalRange.startLineNumber + lineStartDelta, rangeMapping.originalRange.endLineNumber + 1 + lineEndDelta);
    const modifiedLineRange = new LineRange(rangeMapping.modifiedRange.startLineNumber + lineStartDelta, rangeMapping.modifiedRange.endLineNumber + 1 + lineEndDelta);
    return new DetailedLineRangeMapping(originalLineRange, modifiedLineRange, [rangeMapping]);
}
export function lineRangeMappingFromChange(change) {
    let originalRange;
    if (change.originalEndLineNumber === 0) {
        // Insertion
        originalRange = new LineRange(change.originalStartLineNumber + 1, change.originalStartLineNumber + 1);
    }
    else {
        originalRange = new LineRange(change.originalStartLineNumber, change.originalEndLineNumber + 1);
    }
    let modifiedRange;
    if (change.modifiedEndLineNumber === 0) {
        // Deletion
        modifiedRange = new LineRange(change.modifiedStartLineNumber + 1, change.modifiedStartLineNumber + 1);
    }
    else {
        modifiedRange = new LineRange(change.modifiedStartLineNumber, change.modifiedEndLineNumber + 1);
    }
    return new LineRangeMapping(originalRange, modifiedRange);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmFuZ2VNYXBwaW5nLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vZGlmZi9yYW5nZU1hcHBpbmcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxRQUFRLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUM5RSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNwRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFDakQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBQy9DLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUN6QyxPQUFPLEVBQWdCLGNBQWMsRUFBWSxNQUFNLHFCQUFxQixDQUFDO0FBRzdFOztHQUVHO0FBQ0gsTUFBTSxPQUFPLGdCQUFnQjtJQUNyQixNQUFNLENBQUMsT0FBTyxDQUFDLE9BQW9DLEVBQUUsaUJBQXlCLEVBQUUsaUJBQXlCO1FBQy9HLE1BQU0sTUFBTSxHQUF1QixFQUFFLENBQUM7UUFDdEMsSUFBSSx5QkFBeUIsR0FBRyxDQUFDLENBQUM7UUFDbEMsSUFBSSx5QkFBeUIsR0FBRyxDQUFDLENBQUM7UUFFbEMsS0FBSyxNQUFNLENBQUMsSUFBSSxPQUFPLEVBQUUsQ0FBQztZQUN6QixNQUFNLENBQUMsR0FBRyxJQUFJLGdCQUFnQixDQUM3QixJQUFJLFNBQVMsQ0FBQyx5QkFBeUIsRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxFQUNwRSxJQUFJLFNBQVMsQ0FBQyx5QkFBeUIsRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFD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