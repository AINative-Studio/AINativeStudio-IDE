/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export var FoldSource;
(function (FoldSource) {
    FoldSource[FoldSource["provider"] = 0] = "provider";
    FoldSource[FoldSource["userDefined"] = 1] = "userDefined";
    FoldSource[FoldSource["recovered"] = 2] = "recovered";
})(FoldSource || (FoldSource = {}));
export const foldSourceAbbr = {
    [0 /* FoldSource.provider */]: ' ',
    [1 /* FoldSource.userDefined */]: 'u',
    [2 /* FoldSource.recovered */]: 'r',
};
export const MAX_FOLDING_REGIONS = 0xFFFF;
export const MAX_LINE_NUMBER = 0xFFFFFF;
const MASK_INDENT = 0xFF000000;
class BitField {
    constructor(size) {
        const numWords = Math.ceil(size / 32);
        this._states = new Uint32Array(numWords);
    }
    get(index) {
        const arrayIndex = (index / 32) | 0;
        const bit = index % 32;
        return (this._states[arrayIndex] & (1 << bit)) !== 0;
    }
    set(index, newState) {
        const arrayIndex = (index / 32) | 0;
        const bit = index % 32;
        const value = this._states[arrayIndex];
        if (newState) {
            this._states[arrayIndex] = value | (1 << bit);
        }
        else {
            this._states[arrayIndex] = value & ~(1 << bit);
        }
    }
}
export class FoldingRegions {
    constructor(startIndexes, endIndexes, types) {
        if (startIndexes.length !== endIndexes.length || startIndexes.length > MAX_FOLDING_REGIONS) {
            throw new Error('invalid startIndexes or endIndexes size');
        }
        this._startIndexes = startIndexes;
        this._endIndexes = endIndexes;
        this._collapseStates = new BitField(startIndexes.length);
        this._userDefinedStates = new BitField(startIndexes.length);
        this._recoveredStates = new BitField(startIndexes.length);
        this._types = types;
        this._parentsComputed = false;
    }
    ensureParentIndices() {
        if (!this._parentsComputed) {
            this._parentsComputed = true;
            const parentIndexes = [];
            const isInsideLast = (startLineNumber, endLineNumber) => {
                const index = parentIndexes[parentIndexes.length - 1];
                return this.getStartLineNumber(index) <= startLineNumber && this.getEndLineNumber(index) >= endLineNumber;
            };
            for (let i = 0, len = this._startIndexes.length; i < len; i++) {
                const startLineNumber = this._startIndexes[i];
                const endLineNumber = this._endIndexes[i];
                if (startLineNumber > MAX_LINE_NUMBER || endLineNumber > MAX_LINE_NUMBER) {
                    throw new Error('startLineNumber or endLineNumber must not exceed ' + MAX_LINE_NUMBER);
                }
                while (parentIndexes.length > 0 && !isInsideLast(startLineNumber, endLineNumber)) {
                    parentIndexes.pop();
                }
                const parentIndex = parentIndexes.length > 0 ? parentIndexes[parentIndexes.length - 1] : -1;
                parentIndexes.push(i);
                this._startIndexes[i] = startLineNumber + ((parentIndex & 0xFF) << 24);
                this._endIndexes[i] = endLineNumber + ((parentIndex & 0xFF00) << 16);
            }
        }
    }
    get length() {
        return this._startIndexes.length;
    }
    getStartLineNumber(index) {
        return this._startIndexes[index] & MAX_LINE_NUMBER;
    }
    getEndLineNumber(index) {
        return this._endIndexes[index] & MAX_LINE_NUMBER;
    }
    getType(index) {
        return this._types ? this._types[index] : undefined;
    }
    hasTypes() {
        return !!this._types;
    }
    isCollapsed(index) {
        return this._collapseStates.get(index);
    }
    setCollapsed(index, newState) {
        this._collapseStates.set(index, newState);
    }
    isUserDefined(index) {
        return this._userDefinedStates.get(index);
    }
    setUserDefined(index, newState) {
        return this._userDefinedStates.set(index, newState);
    }
    isRecovered(index) {
        return this._recoveredStates.get(index);
    }
    setRecovered(index, newState) {
        return this._recoveredStates.set(index, newState);
    }
    getSource(index) {
        if (this.isUserDefined(index)) {
            return 1 /* FoldSource.userDefined */;
        }
        else if (this.isRecovered(index)) {
            return 2 /* FoldSource.recovered */;
        }
        return 0 /* FoldSource.provider */;
    }
    setSource(index, source) {
        if (source === 1 /* FoldSource.userDefined */) {
            this.setUserDefined(index, true);
            this.setRecovered(index, false);
        }
        else if (source === 2 /* FoldSource.recovered */) {
            this.setUserDefined(index, false);
            this.setRecovered(index, true);
        }
        else {
            this.setUserDefined(index, false);
            this.setRecovered(index, false);
        }
    }
    setCollapsedAllOfType(type, newState) {
        let hasChanged = false;
        if (this._types) {
            for (let i = 0; i < this._types.length; i++) {
                if (this._types[i] === type) {
                    this.setCollapsed(i, newState);
                    hasChanged = true;
                }
            }
        }
        return hasChanged;
    }
    toRegion(index) {
        return new FoldingRegion(this, index);
    }
    getParentIndex(index) {
        this.ensureParentIndices();
        const parent = ((this._startIndexes[index] & MASK_INDENT) >>> 24) + ((this._endIndexes[index] & MASK_INDENT) >>> 16);
        if (parent === MAX_FOLDING_REGIONS) {
            return -1;
        }
        return parent;
    }
    contains(index, line) {
        return this.getStartLineNumber(index) <= line && this.getEndLineNumber(index) >= line;
    }
    findIndex(line) {
        let low = 0, high = this._startIndexes.length;
        if (high === 0) {
            return -1; // no children
        }
        while (low < high) {
            const mid = Math.floor((low + high) / 2);
            if (line < this.getStartLineNumber(mid)) {
                high = mid;
            }
            else {
                low = mid + 1;
            }
        }
        return low - 1;
    }
    findRange(line) {
        let index = this.findIndex(line);
        if (index >= 0) {
            const endLineNumber = this.getEndLineNumber(index);
            if (endLineNumber >= line) {
                return index;
            }
            index = this.getParentIndex(index);
            while (index !== -1) {
                if (this.contains(index, line)) {
                    return index;
                }
                index = this.getParentIndex(index);
            }
        }
        return -1;
    }
    toString() {
        const res = [];
        for (let i = 0; i < this.length; i++) {
            res[i] = `[${foldSourceAbbr[this.getSource(i)]}${this.isCollapsed(i) ? '+' : '-'}] ${this.getStartLineNumber(i)}/${this.getEndLineNumber(i)}`;
        }
        return res.join(', ');
    }
    toFoldRange(index) {
        return {
            startLineNumber: this._startIndexes[index] & MAX_LINE_NUMBER,
            endLineNumber: this._endIndexes[index] & MAX_LINE_NUMBER,
            type: this._types ? this._types[index] : undefined,
            isCollapsed: this.isCollapsed(index),
            source: this.getSource(index)
        };
    }
    static fromFoldRanges(ranges) {
        const rangesLength = ranges.length;
        const startIndexes = new Uint32Array(rangesLength);
        const endIndexes = new Uint32Array(rangesLength);
        let types = [];
        let gotTypes = false;
        for (let i = 0; i < rangesLength; i++) {
            const range = ranges[i];
            startIndexes[i] = range.startLineNumber;
            endIndexes[i] = range.endLineNumber;
            types.push(range.type);
            if (range.type) {
                gotTypes = true;
            }
        }
        if (!gotTypes) {
            types = undefined;
        }
        const regions = new FoldingRegions(startIndexes, endIndexes, types);
        for (let i = 0; i < rangesLength; i++) {
            if (ranges[i].isCollapsed) {
                regions.setCollapsed(i, true);
            }
            regions.setSource(i, ranges[i].source);
        }
        return regions;
    }
    /**
     * Two inputs, each a FoldingRegions or a FoldRange[], are merged.
     * Each input must be pre-sorted on startLineNumber.
     * The first list is assumed to always include all regions currently defined by range providers.
     * The second list only contains the previously collapsed and all manual ranges.
     * If the line position matches, the range of the new range is taken, and the range is no longer manual
     * When an entry in one list overlaps an entry in the other, the second list's entry "wins" and
     * overlapping entries in the first list are discarded.
     * Invalid entries are discarded. An entry is invalid if:
     * 		the start and end line numbers aren't a valid range of line numbers,
     * 		it is out of sequence or has the same start line as a preceding entry,
     * 		it overlaps a preceding entry and is not fully contained by that entry.
     */
    static sanitizeAndMerge(rangesA, rangesB, maxLineNumber, selection) {
        maxLineNumber = maxLineNumber ?? Number.MAX_VALUE;
        const getIndexedFunction = (r, limit) => {
            return Array.isArray(r)
                ? ((i) => { return (i < limit) ? r[i] : undefined; })
                : ((i) => { return (i < limit) ? r.toFoldRange(i) : undefined; });
        };
        const getA = getIndexedFunction(rangesA, rangesA.length);
        const getB = getIndexedFunction(rangesB, rangesB.length);
        let indexA = 0;
        let indexB = 0;
        let nextA = getA(0);
        let nextB = getB(0);
        const stackedRanges = [];
        let topStackedRange;
        let prevLineNumber = 0;
        const resultRanges = [];
        while (nextA || nextB) {
            let useRange = undefined;
            if (nextB && (!nextA || nextA.startLineNumber >= nextB.startLineNumber)) {
                if (nextA && nextA.startLineNumber === nextB.startLineNumber) {
                    if (nextB.source === 1 /* FoldSource.userDefined */) {
                        // a user defined range (possibly unfolded)
                        useRange = nextB;
                    }
                    else {
                        // a previously folded range or a (possibly unfolded) recovered range
                        useRange = nextA;
                        // stays collapsed if the range still has the same number of lines or the selection is not in the range or after it
                        useRange.isCollapsed = nextB.isCollapsed && (nextA.endLineNumber === nextB.endLineNumber || !selection?.startsInside(nextA.startLineNumber + 1, nextA.endLineNumber + 1));
                        useRange.source = 0 /* FoldSource.provider */;
                    }
                    nextA = getA(++indexA); // not necessary, just for speed
                }
                else {
                    useRange = nextB;
                    if (nextB.isCollapsed && nextB.source === 0 /* FoldSource.provider */) {
                        // a previously collapsed range
                        useRange.source = 2 /* FoldSource.recovered */;
                    }
                }
                nextB = getB(++indexB);
            }
            else {
                // nextA is next. The user folded B set takes precedence and we sometimes need to look
                // ahead in it to check for an upcoming conflict.
                let scanIndex = indexB;
                let prescanB = nextB;
                while (true) {
                    if (!prescanB || prescanB.startLineNumber > nextA.endLineNumber) {
                        useRange = nextA;
                        break; // no conflict, use this nextA
                    }
                    if (prescanB.source === 1 /* FoldSource.userDefined */ && prescanB.endLineNumber > nextA.endLineNumber) {
                        // we found a user folded range, it wins
                        break; // without setting nextResult, so this nextA gets skipped
                    }
                    prescanB = getB(++scanIndex);
                }
                nextA = getA(++indexA);
            }
            if (useRange) {
                while (topStackedRange
                    && topStackedRange.endLineNumber < useRange.startLineNumber) {
                    topStackedRange = stackedRanges.pop();
                }
                if (useRange.endLineNumber > useRange.startLineNumber
                    && useRange.startLineNumber > prevLineNumber
                    && useRange.endLineNumber <= maxLineNumber
                    && (!topStackedRange
                        || topStackedRange.endLineNumber >= useRange.endLineNumber)) {
                    resultRanges.push(useRange);
                    prevLineNumber = useRange.startLineNumber;
                    if (topStackedRange) {
                        stackedRanges.push(topStackedRange);
                    }
                    topStackedRange = useRange;
                }
            }
        }
        return resultRanges;
    }
}
export class FoldingRegion {
    constructor(ranges, index) {
        this.ranges = ranges;
        this.index = index;
    }
    get startLineNumber() {
        return this.ranges.getStartLineNumber(this.index);
    }
    get endLineNumber() {
        return this.ranges.getEndLineNumber(this.index);
    }
    get regionIndex() {
        return this.index;
    }
    get parentIndex() {
        return this.ranges.getParentIndex(this.index);
    }
    get isCollapsed() {
        return this.ranges.isCollapsed(this.index);
    }
    containedBy(range) {
        return range.startLineNumber <= this.startLineNumber && range.endLineNumber >= this.endLineNumber;
    }
    containsLine(lineNumber) {
        return this.startLineNumber <= lineNumber && lineNumber <= this.endLineNumber;
    }
    hidesLine(lineNumber) {
        return this.startLineNumber < lineNumber && lineNumber <= this.endLineNumber;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZm9sZGluZ1Jhbmdlcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9mb2xkaW5nL2Jyb3dzZXIvZm9sZGluZ1Jhbmdlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQVNoRyxNQUFNLENBQU4sSUFBa0IsVUFJakI7QUFKRCxXQUFrQixVQUFVO0lBQzNCLG1EQUFZLENBQUE7SUFDWix5REFBZSxDQUFBO0lBQ2YscURBQWEsQ0FBQTtBQUNkLENBQUMsRUFKaUIsVUFBVSxLQUFWLFVBQVUsUUFJM0I7QUFFRCxNQUFNLENBQUMsTUFBTSxjQUFjLEdBQUc7SUFDN0IsNkJBQXFCLEVBQUUsR0FBRztJQUMxQixnQ0FBd0IsRUFBRSxHQUFHO0lBQzdCLDhCQUFzQixFQUFFLEdBQUc7Q0FDM0IsQ0FBQztBQVVGLE1BQU0sQ0FBQyxNQUFNLG1CQUFtQixHQUFHLE1BQU0sQ0FBQztBQUMxQyxNQUFNLENBQUMsTUFBTSxlQUFlLEdBQUcsUUFBUSxDQUFDO0FBRXhDLE1BQU0sV0FBVyxHQUFHLFVBQVUsQ0FBQztBQUUvQixNQUFNLFFBQVE7SUFFYixZQUFZLElBQVk7UUFDdkIsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEdBQUcsRUFBRSxDQUFDLENBQUM7UUFDdEMsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUMxQyxDQUFDO0lBRU0sR0FBRyxDQUFDLEtBQWE7UUFDdkIsTUFBTSxVQUFVLEdBQUcsQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3BDLE1BQU0sR0FBRyxHQUFHLEtBQUssR0FBRyxFQUFFLENBQUM7UUFDdkIsT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsVUFB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