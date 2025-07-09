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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib2Zmc2V0RWRpdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL2NvcmUvb2Zmc2V0RWRpdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNwRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sa0JBQWtCLENBQUM7QUFFL0M7OztFQUdFO0FBQ0YsTUFBTSxPQUFPLFVBQVU7YUFDQyxVQUFLLEdBQUcsSUFBSSxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUM7SUFFM0MsTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFpQjtRQUN2QyxPQUFPLElBQUksVUFBVSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztJQUM1RCxDQUFDO0lBRU0sTUFBTSxDQUFDLE9BQU8sQ0FDcEIsS0FBa0IsRUFDbEIsT0FBZTtRQUVmLE9BQU8sSUFBSSxVQUFVLENBQUMsQ0FBQyxJQUFJLGdCQUFnQixDQUFDLEtBQUssRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDL0QsQ0FBQztJQUVNLE1BQU0sQ0FBQyxNQUFNLENBQ25CLE1BQWMsRUFDZCxVQUFrQjtRQUVsQixPQUFPLFVBQVUsQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRSxVQUFVLENBQUMsQ0FBQztJQUNwRSxDQUFDO0lBRUQsWUFDaUIsS0FBa0M7UUFBbEMsVUFBSyxHQUFMLEtBQUssQ0FBNkI7UUFFbEQsSUFBSSxTQUFTLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDbkIsS0FBSyxNQUFNLElBQUksSUFBSSxLQUFLLEVBQUUsQ0FBQztZQUMxQixJQUFJLENBQUMsQ0FB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