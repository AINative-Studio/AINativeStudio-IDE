/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as strings from '../../../base/common/strings.js';
class PendingChanges {
    constructor() {
        this._hasPending = false;
        this._inserts = [];
        this._changes = [];
        this._removes = [];
    }
    insert(x) {
        this._hasPending = true;
        this._inserts.push(x);
    }
    change(x) {
        this._hasPending = true;
        this._changes.push(x);
    }
    remove(x) {
        this._hasPending = true;
        this._removes.push(x);
    }
    mustCommit() {
        return this._hasPending;
    }
    commit(linesLayout) {
        if (!this._hasPending) {
            return;
        }
        const inserts = this._inserts;
        const changes = this._changes;
        const removes = this._removes;
        this._hasPending = false;
        this._inserts = [];
        this._changes = [];
        this._removes = [];
        linesLayout._commitPendingChanges(inserts, changes, removes);
    }
}
export class EditorWhitespace {
    constructor(id, afterLineNumber, ordinal, height, minWidth) {
        this.id = id;
        this.afterLineNumber = afterLineNumber;
        this.ordinal = ordinal;
        this.height = height;
        this.minWidth = minWidth;
        this.prefixSum = 0;
    }
}
/**
 * Layouting of objects that take vertical space (by having a height) and push down other objects.
 *
 * These objects are basically either text (lines) or spaces between those lines (whitespaces).
 * This provides commodity operations for working with lines that contain whitespace that pushes lines lower (vertically).
 */
export class LinesLayout {
    static { this.INSTANCE_COUNT = 0; }
    constructor(lineCount, lineHeight, paddingTop, paddingBottom) {
        this._instanceId = strings.singleLetterHash(++LinesLayout.INSTANCE_COUNT);
        this._pendingChanges = new PendingChanges();
        this._lastWhitespaceId = 0;
        this._arr = [];
        this._prefixSumValidIndex = -1;
        this._minWidth = -1; /* marker for not being computed */
        this._lineCount = lineCount;
        this._lineHeight = lineHeight;
        this._paddingTop = paddingTop;
        this._paddingBottom = paddingBottom;
    }
    /**
     * Find the insertion index for a new value inside a sorted array of values.
     * If the value is already present in the sorted array, the insertion index will be after the already existing value.
     */
    static findInsertionIndex(arr, afterLineNumber, ordinal) {
        let low = 0;
        let high = arr.length;
        while (low < high) {
            const mid = ((low + high) >>> 1);
            if (afterLineNumber === arr[mid].afterLineNumber) {
                if (ordinal < arr[mid].ordinal) {
                    high = mid;
                }
                else {
                    low = mid + 1;
                }
            }
            else if (afterLineNumber < arr[mid].afterLineNumber) {
                high = mid;
            }
            else {
                low = mid + 1;
            }
        }
        return low;
    }
    /**
     * Change the height of a line in pixels.
     */
    setLineHeight(lineHeight) {
        this._checkPendingChanges();
        this._lineHeight = lineHeight;
    }
    /**
     * Changes the padding used to calculate vertical offsets.
     */
    setPadding(paddingTop, paddingBottom) {
        this._paddingTop = paddingTop;
        this._paddingBottom = paddingBottom;
    }
    /**
     * Set the number of lines.
     *
     * @param lineCount New number of lines.
     */
    onFlushed(lineCount) {
        this._checkPendingChanges();
        this._lineCount = lineCount;
    }
    changeWhitespace(callback) {
        let hadAChange = false;
        try {
            const accessor = {
                insertWhitespace: (afterLineNumber, ordinal, heightInPx, minWidth) => {
                    hadAChange = true;
                    afterLineNumber = afterLineNumber | 0;
                    ordinal = ordinal | 0;
                    heightInPx = heightInPx | 0;
                    minWidth = minWidth | 0;
                    const id = this._instanceId + (++this._lastWhitespaceId);
                    this._pendingChanges.insert(new EditorWhitespace(id, afterLineNumber, ordinal, heightInPx, minWidth));
                    return id;
                },
                changeOneWhitespace: (id, newAfterLineNumber, newHeight) => {
                    hadAChange = true;
                    newAfterLineNumber = newAfterLineNumber | 0;
                    newHeight = newHeight | 0;
                    this._pendingChanges.change({ id, newAfterLineNumber, newHeight });
                },
                removeWhitespace: (id) => {
                    hadAChange = true;
                    this._pendingChanges.remove({ id });
                }
            };
            callback(accessor);
        }
        finally {
            this._pendingChanges.commit(this);
        }
        return hadAChange;
    }
    _commitPendingChanges(inserts, changes, removes) {
        if (inserts.length > 0 || removes.length > 0) {
            this._minWidth = -1; /* marker for not being computed */
        }
        if (inserts.length + changes.length + removes.length <= 1) {
            // when only one thing happened, handle it "delicately"
            for (const insert of inserts) {
                this._insertWhitespace(insert);
            }
            for (const change of changes) {
                this._changeOneWhitespace(change.id, change.newAfterLineNumber, change.newHeight);
            }
            for (const remove of removes) {
                const index = this._findWhitespaceIndex(remove.id);
                if (index === -1) {
                    continue;
                }
                this._removeWhitespace(index);
            }
            return;
        }
        // simply rebuild the entire datastructure
        const toRemove = new Set();
        for (const remove of removes) {
            toRemove.add(remove.id);
        }
        const toChange = new Map();
        for (const change of changes) {
            toChange.set(change.id, change);
        }
        const applyRemoveAndChange = (whitespaces) => {
            const result = [];
            for (const whitespace of whitespaces) {
                if (toRemove.has(whitespace.id)) {
                    continue;
                }
                if (toChange.has(whitespace.id)) {
                    const change = toChange.get(whitespace.id);
                    whitespace.afterLineNumber = change.newAfterLineNumber;
                    whitespace.height = change.newHeight;
                }
                result.push(whitespace);
            }
            return result;
        };
        const result = applyRemoveAndChange(this._arr).concat(applyRemoveAndChange(inserts));
        result.sort((a, b) => {
            if (a.afterLineNumber === b.afterLineNumber) {
                return a.ordinal - b.ordinal;
            }
            return a.afterLineNumber - b.afterLineNumber;
        });
        this._arr = result;
        this._prefixSumValidIndex = -1;
    }
    _checkPendingChanges() {
        if (this._pendingChanges.mustCommit()) {
            this._pendingChanges.commit(this);
        }
    }
    _insertWhitespace(whitespace) {
        const insertIndex = LinesLayout.findInsertionIndex(this._arr, whitespace.afterLineNumber, whitespace.ordinal);
        this._arr.splice(insertIndex, 0, whitespace);
        this._prefixSumValidIndex = Math.min(this._prefixSumValidIndex, insertIndex - 1);
    }
    _findWhitespaceIndex(id) {
        const arr = this._arr;
        for (let i = 0, len = arr.length; i < len; i++) {
            if (arr[i].id === id) {
                return i;
            }
        }
        return -1;
    }
    _changeOneWhitespace(id, newAfterLineNumber, newHeight) {
        const index = this._findWhitespaceIndex(id);
        if (index === -1) {
            return;
        }
        if (this._arr[index].height !== newHeight) {
            this._arr[index].height = newHeight;
            this._prefixSumValidIndex = Math.min(this._prefixSumValidIndex, index - 1);
        }
        if (this._arr[index].afterLineNumber !== newAfterLineNumber) {
            // `afterLineNumber` changed for this whitespace
            // Record old whitespace
            const whitespace = this._arr[index];
            // Since changing `afterLineNumber` can trigger a reordering, we're gonna remove this whitespace
            this._removeWhitespace(index);
            whitespace.afterLineNumber = newAfterLineNumber;
            // And add it again
            this._insertWhitespace(whitespace);
        }
    }
    _removeWhitespace(removeIndex) {
        this._arr.splice(removeIndex, 1);
        this._prefixSumValidIndex = Math.min(this._prefixSumValidIndex, removeIndex - 1);
    }
    /**
     * Notify the layouter that lines have been deleted (a continuous zone of lines).
     *
     * @param fromLineNumber The line number at which the deletion started, inclusive
     * @param toLineNumber The line number at which the deletion ended, inclusive
     */
    onLinesDeleted(fromLineNumber, toLineNumber) {
        this._checkPendingChanges();
        fromLineNumber = fromLineNumber | 0;
        toLineNumber = toLineNumber | 0;
        this._lineCount -= (toLineNumber - fromLineNumber + 1);
        for (let i = 0, len = this._arr.length; i < len; i++) {
            const afterLineNumber = this._arr[i].afterLineNumber;
            if (fromLineNumber <= afterLineNumber && afterLineNumber <= toLineNumber) {
                // The line this whitespace was after has been deleted
                //  => move whitespace to before first deleted line
                this._arr[i].afterLineNumber = fromLineNumber - 1;
            }
            else if (afterLineNumber > toLineNumber) {
                // The line this whitespace was after has been moved up
                //  => move whitespace up
                this._arr[i].afterLineNumber -= (toLineNumber - fromLineNumber + 1);
            }
        }
    }
    /**
     * Notify the layouter that lines have been inserted (a continuous zone of lines).
     *
     * @param fromLineNumber The line number at which the insertion started, inclusive
     * @param toLineNumber The line number at which the insertion ended, inclusive.
     */
    onLinesInserted(fromLineNumber, toLineNumber) {
        this._checkPendingChanges();
        fromLineNumber = fromLineNumber | 0;
        toLineNumber = toLineNumber | 0;
        this._lineCount += (toLineNumber - fromLineNumber + 1);
        for (let i = 0, len = this._arr.length; i < len; i++) {
            const afterLineNumber = this._arr[i].afterLineNumber;
            if (fromLineNumber <= afterLineNumber) {
                this._arr[i].afterLineNumber += (toLineNumber - fromLineNumber + 1);
            }
        }
    }
    /**
     * Get the sum of all the whitespaces.
     */
    getWhitespacesTotalHeight() {
        this._checkPendingChanges();
        if (this._arr.length === 0) {
            return 0;
        }
        return this.getWhitespacesAccumulatedHeight(this._arr.length - 1);
    }
    /**
     * Return the sum of the heights of the whitespaces at [0..index].
     * This includes the whitespace at `index`.
     *
     * @param index The index of the whitespace.
     * @return The sum of the heights of all whitespaces before the one at `index`, including the one at `index`.
     */
    getWhitespacesAccumulatedHeight(index) {
        this._checkPendingChanges();
        index = index | 0;
        let startIndex = Math.max(0, this._prefixSumValidIndex + 1);
        if (startIndex === 0) {
            this._arr[0].prefixSum = this._arr[0].height;
            startIndex++;
        }
        for (let i = startIndex; i <= index; i++) {
            this._arr[i].prefixSum = this._arr[i - 1].prefixSum + this._arr[i].height;
        }
        this._prefixSumValidIndex = Math.max(this._prefixSumValidIndex, index);
        return this._arr[index].prefixSum;
    }
    /**
     * Get the sum of heights for all objects.
     *
     * @return The sum of heights for all objects.
     */
    getLinesTotalHeight() {
        this._checkPendingChanges();
        const linesHeight = this._lineHeight * this._lineCount;
        const whitespacesHeight = this.getWhitespacesTotalHeight();
        return linesHeight + whitespacesHeight + this._paddingTop + this._paddingBottom;
    }
    /**
     * Returns the accumulated height of whitespaces before the given line number.
     *
     * @param lineNumber The line number
     */
    getWhitespaceAccumulatedHeightBeforeLineNumber(lineNumber) {
        this._checkPendingChanges();
        lineNumber = lineNumber | 0;
        const lastWhitespaceBeforeLineNumber = this._findLastWhitespaceBeforeLineNumber(lineNumber);
        if (lastWhitespaceBeforeLineNumber === -1) {
            return 0;
        }
        return this.getWhitespacesAccumulatedHeight(lastWhitespaceBeforeLineNumber);
    }
    _findLastWhitespaceBeforeLineNumber(lineNumber) {
        lineNumber = lineNumber | 0;
        // Find the whitespace before line number
        const arr = this._arr;
        let low = 0;
        let high = arr.length - 1;
        while (low <= high) {
            const delta = (high - low) | 0;
            const halfDelta = (delta / 2) | 0;
            const mid = (low + halfDelta) | 0;
            if (arr[mid].afterLineNumber < lineNumber) {
                if (mid + 1 >= arr.length || arr[mid + 1].afterLineNumber >= lineNumber) {
                    return mid;
                }
                else {
                    low = (mid + 1) | 0;
                }
            }
            else {
                high = (mid - 1) | 0;
            }
        }
        return -1;
    }
    _findFirstWhitespaceAfterLineNumber(lineNumber) {
        lineNumber = lineNumber | 0;
        const lastWhitespaceBeforeLineNumber = this._findLastWhitespaceBeforeLineNumber(lineNumber);
        const firstWhitespaceAfterLineNumber = lastWhitespaceBeforeLineNumber + 1;
        if (firstWhitespaceAfterLineNumber < this._arr.length) {
            return firstWhitespaceAfterLineNumber;
        }
        return -1;
    }
    /**
     * Find the index of the first whitespace which has `afterLineNumber` >= `lineNumber`.
     * @return The index of the first whitespace with `afterLineNumber` >= `lineNumber` or -1 if no whitespace is found.
     */
    getFirstWhitespaceIndexAfterLineNumber(lineNumber) {
        this._checkPendingChanges();
        lineNumber = lineNumber | 0;
        return this._findFirstWhitespaceAfterLineNumber(lineNumber);
    }
    /**
     * Get the vertical offset (the sum of heights for all objects above) a certain line number.
     *
     * @param lineNumber The line number
     * @return The sum of heights for all objects above `lineNumber`.
     */
    getVerticalOffsetForLineNumber(lineNumber, includeViewZones = false) {
        this._checkPendingChanges();
        lineNumber = lineNumber | 0;
        let previousLinesHeight;
        if (lineNumber > 1) {
            previousLinesHeight = this._lineHeight * (lineNumber - 1);
        }
        else {
            previousLinesHeight = 0;
        }
        const previousWhitespacesHeight = this.getWhitespaceAccumulatedHeightBeforeLineNumber(lineNumber - (includeViewZones ? 1 : 0));
        return previousLinesHeight + previousWhitespacesHeight + this._paddingTop;
    }
    /**
     * Get the vertical offset (the sum of heights for all objects above) a certain line number.
     *
     * @param lineNumber The line number
     * @return The sum of heights for all objects above `lineNumber`.
     */
    getVerticalOffsetAfterLineNumber(lineNumber, includeViewZones = false) {
        this._checkPendingChanges();
        lineNumber = lineNumber | 0;
        const previousLinesHeight = this._lineHeight * lineNumber;
        const previousWhitespacesHeight = this.getWhitespaceAccumulatedHeightBeforeLineNumber(lineNumber + (includeViewZones ? 1 : 0));
        return previousLinesHeight + previousWhitespacesHeight + this._paddingTop;
    }
    /**
     * Returns if there is any whitespace in the document.
     */
    hasWhitespace() {
        this._checkPendingChanges();
        return this.getWhitespacesCount() > 0;
    }
    /**
     * The maximum min width for all whitespaces.
     */
    getWhitespaceMinWidth() {
        this._checkPendingChanges();
        if (this._minWidth === -1) {
            let minWidth = 0;
            for (let i = 0, len = this._arr.length; i < len; i++) {
                minWidth = Math.max(minWidth, this._arr[i].minWidth);
            }
            this._minWidth = minWidth;
        }
        return this._minWidth;
    }
    /**
     * Check if `verticalOffset` is below all lines.
     */
    isAfterLines(verticalOffset) {
        this._checkPendingChanges();
        const totalHeight = this.getLinesTotalHeight();
        return verticalOffset > totalHeight;
    }
    isInTopPadding(verticalOffset) {
        if (this._paddingTop === 0) {
            return false;
        }
        this._checkPendingChanges();
        return (verticalOffset < this._paddingTop);
    }
    isInBottomPadding(verticalOffset) {
        if (this._paddingBottom === 0) {
            return false;
        }
        this._checkPendingChanges();
        const totalHeight = this.getLinesTotalHeight();
        return (verticalOffset >= totalHeight - this._paddingBottom);
    }
    /**
     * Find the first line number that is at or after vertical offset `verticalOffset`.
     * i.e. if getVerticalOffsetForLine(line) is x and getVerticalOffsetForLine(line + 1) is y, then
     * getLineNumberAtOrAfterVerticalOffset(i) = line, x <= i < y.
     *
     * @param verticalOffset The vertical offset to search at.
     * @return The line number at or after vertical offset `verticalOffset`.
     */
    getLineNumberAtOrAfterVerticalOffset(verticalOffset) {
        this._checkPendingChanges();
        verticalOffset = verticalOffset | 0;
        if (verticalOffset < 0) {
            return 1;
        }
        const linesCount = this._lineCount | 0;
        const lineHeight = this._lineHeight;
        let minLineNumber = 1;
        let maxLineNumber = linesCount;
        while (minLineNumber < maxLineNumber) {
            const midLineNumber = ((minLineNumber + maxLineNumber) / 2) | 0;
            const midLineNumberVerticalOffset = this.getVerticalOffsetForLineNumber(midLineNumber) | 0;
            if (verticalOffset >= midLineNumberVerticalOffset + lineHeight) {
                // vertical offset is after mid line number
                minLineNumber = midLineNumber + 1;
            }
            else if (verticalOffset >= midLineNumberVerticalOffset) {
                // Hit
                return midLineNumber;
            }
            else {
                // vertical offset is before mid line number, but mid line number could still be what we're searching for
                maxLineNumber = midLineNumber;
            }
        }
        if (minLineNumber > linesCount) {
            return linesCount;
        }
        return minLineNumber;
    }
    /**
     * Get all the lines and their relative vertical offsets that are positioned between `verticalOffset1` and `verticalOffset2`.
     *
     * @param verticalOffset1 The beginning of the viewport.
     * @param verticalOffset2 The end of the viewport.
     * @return A structure describing the lines positioned between `verticalOffset1` and `verticalOffset2`.
     */
    getLinesViewportData(verticalOffset1, verticalOffset2) {
        this._checkPendingChanges();
        verticalOffset1 = verticalOffset1 | 0;
        verticalOffset2 = verticalOffset2 | 0;
        const lineHeight = this._lineHeight;
        // Find first line number
        // We don't live in a perfect world, so the line number might start before or after verticalOffset1
        const startLineNumber = this.getLineNumberAtOrAfterVerticalOffset(verticalOffset1) | 0;
        const startLineNumberVerticalOffset = this.getVerticalOffsetForLineNumber(startLineNumber) | 0;
        let endLineNumber = this._lineCount | 0;
        // Also keep track of what whitespace we've got
        let whitespaceIndex = this.getFirstWhitespaceIndexAfterLineNumber(startLineNumber) | 0;
        const whitespaceCount = this.getWhitespacesCount() | 0;
        let currentWhitespaceHeight;
        let currentWhitespaceAfterLineNumber;
        if (whitespaceIndex === -1) {
            whitespaceIndex = whitespaceCount;
            currentWhitespaceAfterLineNumber = endLineNumber + 1;
            currentWhitespaceHeight = 0;
        }
        else {
            currentWhitespaceAfterLineNumber = this.getAfterLineNumberForWhitespaceIndex(whitespaceIndex) | 0;
            currentWhitespaceHeight = this.getHeightForWhitespaceIndex(whitespaceIndex) | 0;
        }
        let currentVerticalOffset = startLineNumberVerticalOffset;
        let currentLineRelativeOffset = currentVerticalOffset;
        // IE (all versions) cannot handle units above about 1,533,908 px, so every 500k pixels bring numbers down
        const STEP_SIZE = 500000;
        let bigNumbersDelta = 0;
        if (startLineNumberVerticalOffset >= STEP_SIZE) {
            // Compute a delta that guarantees that lines are positioned at `lineHeight` increments
            bigNumbersDelta = Math.floor(startLineNumberVerticalOffset / STEP_SIZE) * STEP_SIZE;
            bigNumbersDelta = Math.floor(bigNumbersDelta / lineHeight) * lineHeight;
            currentLineRelativeOffset -= bigNumbersDelta;
        }
        const linesOffsets = [];
        const verticalCenter = verticalOffset1 + (verticalOffset2 - verticalOffset1) / 2;
        let centeredLineNumber = -1;
        // Figure out how far the lines go
        for (let lineNumber = startLineNumber; lineNumber <= endLineNumber; lineNumber++) {
            if (centeredLineNumber === -1) {
                const currentLineTop = currentVerticalOffset;
                const currentLineBottom = currentVerticalOffset + lineHeight;
                if ((currentLineTop <= verticalCenter && verticalCenter < currentLineBottom) || currentLineTop > verticalCenter) {
                    centeredLineNumber = lineNumber;
                }
            }
            // Count current line height in the vertical offsets
            currentVerticalOffset += lineHeight;
            linesOffsets[lineNumber - startLineNumber] = currentLineRelativeOffset;
            // Next line starts immediately after this one
            currentLineRelativeOffset += lineHeight;
            while (currentWhitespaceAfterLineNumber === lineNumber) {
                // Push down next line with the height of the current whitespace
                currentLineRelativeOffset += currentWhitespaceHeight;
                // Count current whitespace in the vertical offsets
                currentVerticalOffset += currentWhitespaceHeight;
                whitespaceIndex++;
                if (whitespaceIndex >= whitespaceCount) {
                    currentWhitespaceAfterLineNumber = endLineNumber + 1;
                }
                else {
                    currentWhitespaceAfterLineNumber = this.getAfterLineNumberForWhitespaceIndex(whitespaceIndex) | 0;
                    currentWhitespaceHeight = this.getHeightForWhitespaceIndex(whitespaceIndex) | 0;
                }
            }
            if (currentVerticalOffset >= verticalOffset2) {
                // We have covered the entire viewport area, time to stop
                endLineNumber = lineNumber;
                break;
            }
        }
        if (centeredLineNumber === -1) {
            centeredLineNumber = endLineNumber;
        }
        const endLineNumberVerticalOffset = this.getVerticalOffsetForLineNumber(endLineNumber) | 0;
        let completelyVisibleStartLineNumber = startLineNumber;
        let completelyVisibleEndLineNumber = endLineNumber;
        if (completelyVisibleStartLineNumber < completelyVisibleEndLineNumber) {
            if (startLineNumberVerticalOffset < verticalOffset1) {
                completelyVisibleStartLineNumber++;
            }
        }
        if (completelyVisibleStartLineNumber < completelyVisibleEndLineNumber) {
            if (endLineNumberVerticalOffset + lineHeight > verticalOffset2) {
                completelyVisibleEndLineNumber--;
            }
        }
        return {
            bigNumbersDelta: bigNumbersDelta,
            startLineNumber: startLineNumber,
            endLineNumber: endLineNumber,
            relativeVerticalOffset: linesOffsets,
            centeredLineNumber: centeredLineNumber,
            completelyVisibleStartLineNumber: completelyVisibleStartLineNumber,
            completelyVisibleEndLineNumber: completelyVisibleEndLineNumber,
            lineHeight: this._lineHeight,
        };
    }
    getVerticalOffsetForWhitespaceIndex(whitespaceIndex) {
        this._checkPendingChanges();
        whitespaceIndex = whitespaceIndex | 0;
        const afterLineNumber = this.getAfterLineNumberForWhitespaceIndex(whitespaceIndex);
        let previousLinesHeight;
        if (afterLineNumber >= 1) {
            previousLinesHeight = this._lineHeight * afterLineNumber;
        }
        else {
            previousLinesHeight = 0;
        }
        let previousWhitespacesHeight;
        if (whitespaceIndex > 0) {
            previousWhitespacesHeight = this.getWhitespacesAccumulatedHeight(whitespaceIndex - 1);
        }
        else {
            previousWhitespacesHeight = 0;
        }
        return previousLinesHeight + previousWhitespacesHeight + this._paddingTop;
    }
    getWhitespaceIndexAtOrAfterVerticallOffset(verticalOffset) {
        this._checkPendingChanges();
        verticalOffset = verticalOffset | 0;
        let minWhitespaceIndex = 0;
        let maxWhitespaceIndex = this.getWhitespacesCount() - 1;
        if (maxWhitespaceIndex < 0) {
            return -1;
        }
        // Special case: nothing to be found
        const maxWhitespaceVerticalOffset = this.getVerticalOffsetForWhitespaceIndex(maxWhitespaceIndex);
        const maxWhitespaceHeight = this.getHeightForWhitespaceIndex(maxWhitespaceIndex);
        if (verticalOffset >= maxWhitespaceVerticalOffset + maxWhitespaceHeight) {
            return -1;
        }
        while (minWhitespaceIndex < maxWhitespaceIndex) {
            const midWhitespaceIndex = Math.floor((minWhitespaceIndex + maxWhitespaceIndex) / 2);
            const midWhitespaceVerticalOffset = this.getVerticalOffsetForWhitespaceIndex(midWhitespaceIndex);
            const midWhitespaceHeight = this.getHeightForWhitespaceIndex(midWhitespaceIndex);
            if (verticalOffset >= midWhitespaceVerticalOffset + midWhitespaceHeight) {
                // vertical offset is after whitespace
                minWhitespaceIndex = midWhitespaceIndex + 1;
            }
            else if (verticalOffset >= midWhitespaceVerticalOffset) {
                // Hit
                return midWhitespaceIndex;
            }
            else {
                // vertical offset is before whitespace, but midWhitespaceIndex might still be what we're searching for
                maxWhitespaceIndex = midWhitespaceIndex;
            }
        }
        return minWhitespaceIndex;
    }
    /**
     * Get exactly the whitespace that is layouted at `verticalOffset`.
     *
     * @param verticalOffset The vertical offset.
     * @return Precisely the whitespace that is layouted at `verticaloffset` or null.
     */
    getWhitespaceAtVerticalOffset(verticalOffset) {
        this._checkPendingChanges();
        verticalOffset = verticalOffset | 0;
        const candidateIndex = this.getWhitespaceIndexAtOrAfterVerticallOffset(verticalOffset);
        if (candidateIndex < 0) {
            return null;
        }
        if (candidateIndex >= this.getWhitespacesCount()) {
            return null;
        }
        const candidateTop = this.getVerticalOffsetForWhitespaceIndex(candidateIndex);
        if (candidateTop > verticalOffset) {
            return null;
        }
        const candidateHeight = this.getHeightForWhitespaceIndex(candidateIndex);
        const candidateId = this.getIdForWhitespaceIndex(candidateIndex);
        const candidateAfterLineNumber = this.getAfterLineNumberForWhitespaceIndex(candidateIndex);
        return {
            id: candidateId,
            afterLineNumber: candidateAfterLineNumber,
            verticalOffset: candidateTop,
            height: candidateHeight
        };
    }
    /**
     * Get a list of whitespaces that are positioned between `verticalOffset1` and `verticalOffset2`.
     *
     * @param verticalOffset1 The beginning of the viewport.
     * @param verticalOffset2 The end of the viewport.
     * @return An array with all the whitespaces in the viewport. If no whitespace is in viewport, the array is empty.
     */
    getWhitespaceViewportData(verticalOffset1, verticalOffset2) {
        this._checkPendingChanges();
        verticalOffset1 = verticalOffset1 | 0;
        verticalOffset2 = verticalOffset2 | 0;
        const startIndex = this.getWhitespaceIndexAtOrAfterVerticallOffset(verticalOffset1);
        const endIndex = this.getWhitespacesCount() - 1;
        if (startIndex < 0) {
            return [];
        }
        const result = [];
        for (let i = startIndex; i <= endIndex; i++) {
            const top = this.getVerticalOffsetForWhitespaceIndex(i);
            const height = this.getHeightForWhitespaceIndex(i);
            if (top >= verticalOffset2) {
                break;
            }
            result.push({
                id: this.getIdForWhitespaceIndex(i),
                afterLineNumber: this.getAfterLineNumberForWhitespaceIndex(i),
                verticalOffset: top,
                height: height
            });
        }
        return result;
    }
    /**
     * Get all whitespaces.
     */
    getWhitespaces() {
        this._checkPendingChanges();
        return this._arr.slice(0);
    }
    /**
     * The number of whitespaces.
     */
    getWhitespacesCount() {
        this._checkPendingChanges();
        return this._arr.length;
    }
    /**
     * Get the `id` for whitespace at index `index`.
     *
     * @param index The index of the whitespace.
     * @return `id` of whitespace at `index`.
     */
    getIdForWhitespaceIndex(index) {
        this._checkPendingChanges();
        index = index | 0;
        return this._arr[index].id;
    }
    /**
     * Get the `afterLineNumber` for whitespace at index `index`.
     *
     * @param index The index of the whitespace.
     * @return `afterLineNumber` of whitespace at `index`.
     */
    getAfterLineNumberForWhitespaceIndex(index) {
        this._checkPendingChanges();
        index = index | 0;
        return this._arr[index].afterLineNumber;
    }
    /**
     * Get the `height` for whitespace at index `index`.
     *
     * @param index The index of the whitespace.
     * @return `height` of whitespace at `index`.
     */
    getHeightForWhitespaceIndex(index) {
        this._checkPendingChanges();
        index = index | 0;
        return this._arr[index].height;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGluZXNMYXlvdXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi92aWV3TGF5b3V0L2xpbmVzTGF5b3V0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sS0FBSyxPQUFPLE1BQU0saUNBQWlDLENBQUM7QUFLM0QsTUFBTSxjQUFjO0lBTW5CO1FBQ0MsSUFBSSxDQUFDLFdBQVcsR0FBRyxLQUFLLENBQUM7UUFDekIsSUFBSSxDQUFDLFFBQVEsR0FBRyxFQUFFLENBQUM7UUFDbkIsSUFBSSxDQUFDLFFBQVEsR0FBRyxFQUFFLENBQUM7UUFDbkIsSUFBSSxDQUFDLFFBQVEsR0FBRyxFQUFFLENBQUM7SUFDcEIsQ0FBQztJQUVNLE1BQU0sQ0FBQyxDQUFtQjtRQUNoQyxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQztRQUN4QixJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN2QixDQUFDO0lBRU0sTUFBTSxDQUFDLENBQWlCO1FBQzlCLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDO1FBQ3hCLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3ZCLENBQUM7SUFFTSxNQUFNLENBQUMsQ0FBaUI7UUFDOUIsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUM7UUFDeEIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDdkIsQ0FBQztJQUVNLFVBQVU7UUFDaEIsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDO0lBQ3pCLENBQUM7SUFFTSxNQUFNLENBQUMsV0FBd0I7UUFDckMsSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUN2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