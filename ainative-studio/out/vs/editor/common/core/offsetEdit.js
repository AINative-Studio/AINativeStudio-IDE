/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { BugIndicatingError } from '../../../base/common/errors.js';
import { OffsetRange } from './offsetRange.js';
/**
 * Describes an edit to a (0-based) string.
 * Use `TextEdit` to describe edits for a 1-based line/column text.
*/
export class OffsetEdit {
    static { this.empty = new OffsetEdit([]); }
    static fromJson(data) {
        return new OffsetEdit(data.map(SingleOffsetEdit.fromJson));
    }
    static replace(range, newText) {
        return new OffsetEdit([new SingleOffsetEdit(range, newText)]);
    }
    static insert(offset, insertText) {
        return OffsetEdit.replace(OffsetRange.emptyAt(offset), insertText);
    }
    constructor(edits) {
        this.edits = edits;
        let lastEndEx = -1;
        for (const edit of edits) {
            if (!(edit.replaceRange.start >= lastEndEx)) {
                throw new BugIndicatingError(`Edits must be disjoint and sorted. Found ${edit} after ${lastEndEx}`);
            }
            lastEndEx = edit.replaceRange.endExclusive;
        }
    }
    normalize() {
        const edits = [];
        let lastEdit;
        for (const edit of this.edits) {
            if (edit.newText.length === 0 && edit.replaceRange.length === 0) {
                continue;
            }
            if (lastEdit && lastEdit.replaceRange.endExclusive === edit.replaceRange.start) {
                lastEdit = new SingleOffsetEdit(lastEdit.replaceRange.join(edit.replaceRange), lastEdit.newText + edit.newText);
            }
            else {
                if (lastEdit) {
                    edits.push(lastEdit);
                }
                lastEdit = edit;
            }
        }
        if (lastEdit) {
            edits.push(lastEdit);
        }
        return new OffsetEdit(edits);
    }
    toString() {
        const edits = this.edits.map(e => e.toString()).join(', ');
        return `[${edits}]`;
    }
    apply(str) {
        const resultText = [];
        let pos = 0;
        for (const edit of this.edits) {
            resultText.push(str.substring(pos, edit.replaceRange.start));
            resultText.push(edit.newText);
            pos = edit.replaceRange.endExclusive;
        }
        resultText.push(str.substring(pos));
        return resultText.join('');
    }
    compose(other) {
        return joinEdits(this, other);
    }
    /**
     * Creates an edit that reverts this edit.
     */
    inverse(originalStr) {
        const edits = [];
        let offset = 0;
        for (const e of this.edits) {
            edits.push(new SingleOffsetEdit(OffsetRange.ofStartAndLength(e.replaceRange.start + offset, e.newText.length), originalStr.substring(e.replaceRange.start, e.replaceRange.endExclusive)));
            offset += e.newText.length - e.replaceRange.length;
        }
        return new OffsetEdit(edits);
    }
    getNewTextRanges() {
        const ranges = [];
        let offset = 0;
        for (const e of this.edits) {
            ranges.push(OffsetRange.ofStartAndLength(e.replaceRange.start + offset, e.newText.length));
            offset += e.newText.length - e.replaceRange.length;
        }
        return ranges;
    }
    get isEmpty() {
        return this.edits.length === 0;
    }
    tryRebase(base, noOverlap) {
        const newEdits = [];
        let baseIdx = 0;
        let ourIdx = 0;
        let offset = 0;
        while (ourIdx < this.edits.length || baseIdx < base.edits.length) {
            // take the edit that starts first
            const baseEdit = base.edits[baseIdx];
            const ourEdit = this.edits[ourIdx];
            if (!ourEdit) {
                // We processed all our edits
                break;
            }
            else if (!baseEdit) {
                // no more edits from base
                newEdits.push(new SingleOffsetEdit(ourEdit.replaceRange.delta(offset), ourEdit.newText));
                ourIdx++;
            }
            else if (ourEdit.replaceRange.intersectsOrTouches(baseEdit.replaceRange)) {
                ourIdx++; // Don't take our edit, as it is conflicting -> skip
                if (noOverlap) {
                    return undefined;
                }
            }
            else if (ourEdit.replaceRange.start < baseEdit.replaceRange.start) {
                // Our edit starts first
                newEdits.push(new SingleOffsetEdit(ourEdit.replaceRange.delta(offset), ourEdit.newText));
                ourIdx++;
            }
            else {
                baseIdx++;
                offset += baseEdit.newText.length - baseEdit.replaceRange.length;
            }
        }
        return new OffsetEdit(newEdits);
    }
    applyToOffset(originalOffset) {
        let accumulatedDelta = 0;
        for (const edit of this.edits) {
            if (edit.replaceRange.start <= originalOffset) {
                if (originalOffset < edit.replaceRange.endExclusive) {
                    // the offset is in the replaced range
                    return edit.replaceRange.start + accumulatedDelta;
                }
                accumulatedDelta += edit.newText.length - edit.replaceRange.length;
            }
            else {
                break;
            }
        }
        return originalOffset + accumulatedDelta;
    }
    applyToOffsetRange(originalRange) {
        return new OffsetRange(this.applyToOffset(originalRange.start), this.applyToOffset(originalRange.endExclusive));
    }
    applyInverseToOffset(postEditsOffset) {
        let accumulatedDelta = 0;
        for (const edit of this.edits) {
            const editLength = edit.newText.length;
            if (edit.replaceRange.start <= postEditsOffset - accumulatedDelta) {
                if (postEditsOffset - accumulatedDelta < edit.replaceRange.start + editLength) {
                    // the offset is in the replaced range
                    return edit.replaceRange.start;
                }
                accumulatedDelta += editLength - edit.replaceRange.length;
            }
            else {
                break;
            }
        }
        return postEditsOffset - accumulatedDelta;
    }
    equals(other) {
        if (this.edits.length !== other.edits.length) {
            return false;
        }
        for (let i = 0; i < this.edits.length; i++) {
            if (!this.edits[i].equals(other.edits[i])) {
                return false;
            }
        }
        return true;
    }
}
export class SingleOffsetEdit {
    static fromJson(data) {
        return new SingleOffsetEdit(OffsetRange.ofStartAndLength(data.pos, data.len), data.txt);
    }
    static insert(offset, text) {
        return new SingleOffsetEdit(OffsetRange.emptyAt(offset), text);
    }
    static replace(range, text) {
        return new SingleOffsetEdit(range, text);
    }
    constructor(replaceRange, newText) {
        this.replaceRange = replaceRange;
        this.newText = newText;
    }
    toString() {
        return `${this.replaceRange} -> "${this.newText}"`;
    }
    get isEmpty() {
        return this.newText.length === 0 && this.replaceRange.length === 0;
    }
    apply(str) {
        return str.substring(0, this.replaceRange.start) + this.newText + str.substring(this.replaceRange.endExclusive);
    }
    getRangeAfterApply() {
        return new OffsetRange(this.replaceRange.start, this.replaceRange.start + this.newText.length);
    }
    equals(other) {
        return this.replaceRange.equals(other.replaceRange) && this.newText === other.newText;
    }
}
/**
 * Invariant:
 * ```
 * edits2.apply(edits1.apply(str)) = join(edits1, edits2).apply(str)
 * ```
 */
function joinEdits(edits1, edits2) {
    edits1 = edits1.normalize();
    edits2 = edits2.normalize();
    if (edits1.isEmpty) {
        return edits2;
    }
    if (edits2.isEmpty) {
        return edits1;
    }
    const edit1Queue = [...edits1.edits];
    const result = [];
    let edit1ToEdit2 = 0;
    for (const edit2 of edits2.edits) {
        // Copy over edit1 unmodified until it touches edit2.
        while (true) {
            const edit1 = edit1Queue[0];
            if (!edit1 || edit1.replaceRange.start + edit1ToEdit2 + edit1.newText.length >= edit2.replaceRange.start) {
                break;
            }
            edit1Queue.shift();
            result.push(edit1);
            edit1ToEdit2 += edit1.newText.length - edit1.replaceRange.length;
        }
        const firstEdit1ToEdit2 = edit1ToEdit2;
        let firstIntersecting; // or touching
        let lastIntersecting; // or touching
        while (true) {
            const edit1 = edit1Queue[0];
            if (!edit1 || edit1.replaceRange.start + edit1ToEdit2 > edit2.replaceRange.endExclusive) {
                break;
            }
            // else we intersect, because the new end of edit1 is after or equal to our start
            if (!firstIntersecting) {
                firstIntersecting = edit1;
            }
            lastIntersecting = edit1;
            edit1Queue.shift();
            edit1ToEdit2 += edit1.newText.length - edit1.replaceRange.length;
        }
        if (!firstIntersecting) {
            result.push(new SingleOffsetEdit(edit2.replaceRange.delta(-edit1ToEdit2), edit2.newText));
        }
        else {
            let prefix = '';
            const prefixLength = edit2.replaceRange.start - (firstIntersecting.replaceRange.start + firstEdit1ToEdit2);
            if (prefixLength > 0) {
                prefix = firstIntersecting.newText.slice(0, prefixLength);
            }
            const suffixLength = (lastIntersecting.replaceRange.endExclusive + edit1ToEdit2) - edit2.replaceRange.endExclusive;
            if (suffixLength > 0) {
                const e = new SingleOffsetEdit(OffsetRange.ofStartAndLength(lastIntersecting.replaceRange.endExclusive, 0), lastIntersecting.newText.slice(-suffixLength));
                edit1Queue.unshift(e);
                edit1ToEdit2 -= e.newText.length - e.replaceRange.length;
            }
            const newText = prefix + edit2.newText;
            const newReplaceRange = new OffsetRange(Math.min(firstIntersecting.replaceRange.start, edit2.replaceRange.start - firstEdit1ToEdit2), edit2.replaceRange.endExclusive - edit1ToEdit2);
            result.push(new SingleOffsetEdit(newReplaceRange, newText));
        }
    }
    while (true) {
        const item = edit1Queue.shift();
        if (!item) {
            break;
        }
        result.push(item);
    }
    return new OffsetEdit(result).normalize();
}
export function applyEditsToRanges(sortedRanges, edits) {
    sortedRanges = sortedRanges.slice();
    // treat edits as deletion of the replace range and then as insertion that extends the first range
    const result = [];
    let offset = 0;
    for (const e of edits.edits) {
        while (true) {
            // ranges before the current edit
            const r = sortedRanges[0];
            if (!r || r.endExclusive >= e.replaceRange.start) {
                break;
            }
            sortedRanges.shift();
            result.push(r.delta(offset));
        }
        const intersecting = [];
        while (true) {
            const r = sortedRanges[0];
            if (!r || !r.intersectsOrTouches(e.replaceRange)) {
                break;
            }
            sortedRanges.shift();
            intersecting.push(r);
        }
        for (let i = intersecting.length - 1; i >= 0; i--) {
            let r = intersecting[i];
            const overlap = r.intersect(e.replaceRange).length;
            r = r.deltaEnd(-overlap + (i === 0 ? e.newText.length : 0));
            const rangeAheadOfReplaceRange = r.start - e.replaceRange.start;
            if (rangeAheadOfReplaceRange > 0) {
                r = r.delta(-rangeAheadOfReplaceRange);
            }
            if (i !== 0) {
                r = r.delta(e.newText.length);
            }
            // We already took our offset into account.
            // Because we add r back to the queue (which then adds offset again),
            // we have to remove it here.
            r = r.delta(-(e.newText.length - e.replaceRange.length));
            sortedRanges.unshift(r);
        }
        offset += e.newText.length - e.replaceRange.length;
    }
    while (true) {
        const r = sortedRanges[0];
        if (!r) {
            break;
        }
        sortedRanges.shift();
        result.push(r.delta(offset));
    }
    return result;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib2Zmc2V0RWRpdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vY29yZS9vZmZzZXRFZGl0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUUvQzs7O0VBR0U7QUFDRixNQUFNLE9BQU8sVUFBVTthQUNDLFVBQUssR0FBRyxJQUFJLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUUzQyxNQUFNLENBQUMsUUFBUSxDQUFDLElBQWlCO1FBQ3ZDLE9BQU8sSUFBSSxVQUFVLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO0lBQzVELENBQUM7SUFFTSxNQUFNLENBQUMsT0FBTyxDQUNwQixLQUFrQixFQUNsQixPQUFlO1FBRWYsT0FBTyxJQUFJLFVBQVUsQ0FBQyxDQUFDLElBQUksZ0JBQWdCLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUMvRCxDQUFDO0lBRU0sTUFBTSxDQUFDLE1BQU0sQ0FDbkIsTUFBYyxFQUNkLFVBQWtCO1FBRWxCLE9BQU8sVUFBVSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFLFVBQVUsQ0FBQyxDQUFDO0lBQ3BFLENBQUM7SUFFRCxZQUNpQixLQUFrQztRQUFsQyxVQUFLLEdBQUwsS0FBSyxDQUE2QjtRQUVsRCxJQUFJLFNBQVMsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUNuQixLQUFLLE1BQU0sSUFBSSxJQUFJLEtBQUssRUFBRSxDQUFDO1lBQzFCLElBQUksQ0FBQyxDQUFD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