/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as buffer from '../../../base/common/buffer.js';
import { decodeUTF16LE } from './stringBuilder.js';
function escapeNewLine(str) {
    return (str
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r'));
}
export class TextChange {
    get oldLength() {
        return this.oldText.length;
    }
    get oldEnd() {
        return this.oldPosition + this.oldText.length;
    }
    get newLength() {
        return this.newText.length;
    }
    get newEnd() {
        return this.newPosition + this.newText.length;
    }
    constructor(oldPosition, oldText, newPosition, newText) {
        this.oldPosition = oldPosition;
        this.oldText = oldText;
        this.newPosition = newPosition;
        this.newText = newText;
    }
    toString() {
        if (this.oldText.length === 0) {
            return `(insert@${this.oldPosition} "${escapeNewLine(this.newText)}")`;
        }
        if (this.newText.length === 0) {
            return `(delete@${this.oldPosition} "${escapeNewLine(this.oldText)}")`;
        }
        return `(replace@${this.oldPosition} "${escapeNewLine(this.oldText)}" with "${escapeNewLine(this.newText)}")`;
    }
    static _writeStringSize(str) {
        return (4 + 2 * str.length);
    }
    static _writeString(b, str, offset) {
        const len = str.length;
        buffer.writeUInt32BE(b, len, offset);
        offset += 4;
        for (let i = 0; i < len; i++) {
            buffer.writeUInt16LE(b, str.charCodeAt(i), offset);
            offset += 2;
        }
        return offset;
    }
    static _readString(b, offset) {
        const len = buffer.readUInt32BE(b, offset);
        offset += 4;
        return decodeUTF16LE(b, offset, len);
    }
    writeSize() {
        return (+4 // oldPosition
            + 4 // newPosition
            + TextChange._writeStringSize(this.oldText)
            + TextChange._writeStringSize(this.newText));
    }
    write(b, offset) {
        buffer.writeUInt32BE(b, this.oldPosition, offset);
        offset += 4;
        buffer.writeUInt32BE(b, this.newPosition, offset);
        offset += 4;
        offset = TextChange._writeString(b, this.oldText, offset);
        offset = TextChange._writeString(b, this.newText, offset);
        return offset;
    }
    static read(b, offset, dest) {
        const oldPosition = buffer.readUInt32BE(b, offset);
        offset += 4;
        const newPosition = buffer.readUInt32BE(b, offset);
        offset += 4;
        const oldText = TextChange._readString(b, offset);
        offset += TextChange._writeStringSize(oldText);
        const newText = TextChange._readString(b, offset);
        offset += TextChange._writeStringSize(newText);
        dest.push(new TextChange(oldPosition, oldText, newPosition, newText));
        return offset;
    }
}
export function compressConsecutiveTextChanges(prevEdits, currEdits) {
    if (prevEdits === null || prevEdits.length === 0) {
        return currEdits;
    }
    const compressor = new TextChangeCompressor(prevEdits, currEdits);
    return compressor.compress();
}
class TextChangeCompressor {
    constructor(prevEdits, currEdits) {
        this._prevEdits = prevEdits;
        this._currEdits = currEdits;
        this._result = [];
        this._resultLen = 0;
        this._prevLen = this._prevEdits.length;
        this._prevDeltaOffset = 0;
        this._currLen = this._currEdits.length;
        this._currDeltaOffset = 0;
    }
    compress() {
        let prevIndex = 0;
        let currIndex = 0;
        let prevEdit = this._getPrev(prevIndex);
        let currEdit = this._getCurr(currIndex);
        while (prevIndex < this._prevLen || currIndex < this._currLen) {
            if (prevEdit === null) {
                this._acceptCurr(currEdit);
                currEdit = this._getCurr(++currIndex);
                continue;
            }
            if (currEdit === null) {
                this._acceptPrev(prevEdit);
                prevEdit = this._getPrev(++prevIndex);
                continue;
            }
            if (currEdit.oldEnd <= prevEdit.newPosition) {
                this._acceptCurr(currEdit);
                currEdit = this._getCurr(++currIndex);
                continue;
            }
            if (prevEdit.newEnd <= currEdit.oldPosition) {
                this._acceptPrev(prevEdit);
                prevEdit = this._getPrev(++prevIndex);
                continue;
            }
            if (currEdit.oldPosition < prevEdit.newPosition) {
                const [e1, e2] = TextChangeCompressor._splitCurr(currEdit, prevEdit.newPosition - currEdit.oldPosition);
                this._acceptCurr(e1);
                currEdit = e2;
                continue;
            }
            if (prevEdit.newPosition < currEdit.oldPosition) {
                const [e1, e2] = TextChangeCompressor._splitPrev(prevEdit, currEdit.oldPosition - prevEdit.newPosition);
                this._acceptPrev(e1);
                prevEdit = e2;
                continue;
            }
            // At this point, currEdit.oldPosition === prevEdit.newPosition
            let mergePrev;
            let mergeCurr;
            if (currEdit.oldEnd === prevEdit.newEnd) {
                mergePrev = prevEdit;
                mergeCurr = currEdit;
                prevEdit = this._getPrev(++prevIndex);
                currEdit = this._getCurr(++currIndex);
            }
            else if (currEdit.oldEnd < prevEdit.newEnd) {
                const [e1, e2] = TextChangeCompressor._splitPrev(prevEdit, currEdit.oldLength);
                mergePrev = e1;
                mergeCurr = currEdit;
                prevEdit = e2;
                currEdit = this._getCurr(++currIndex);
            }
            else {
                const [e1, e2] = TextChangeCompressor._splitCurr(currEdit, prevEdit.newLength);
                mergePrev = prevEdit;
                mergeCurr = e1;
                prevEdit = this._getPrev(++prevIndex);
                currEdit = e2;
            }
            this._result[this._resultLen++] = new TextChange(mergePrev.oldPosition, mergePrev.oldText, mergeCurr.newPosition, mergeCurr.newText);
            this._prevDeltaOffset += mergePrev.newLength - mergePrev.oldLength;
            this._currDeltaOffset += mergeCurr.newLength - mergeCurr.oldLength;
        }
        const merged = TextChangeCompressor._merge(this._result);
        const cleaned = TextChangeCompressor._removeNoOps(merged);
        return cleaned;
    }
    _acceptCurr(currEdit) {
        this._result[this._resultLen++] = TextChangeCompressor._rebaseCurr(this._prevDeltaOffset, currEdit);
        this._currDeltaOffset += currEdit.newLength - currEdit.oldLength;
    }
    _getCurr(currIndex) {
        return (currIndex < this._currLen ? this._currEdits[currIndex] : null);
    }
    _acceptPrev(prevEdit) {
        this._result[this._resultLen++] = TextChangeCompressor._rebasePrev(this._currDeltaOffset, prevEdit);
        this._prevDeltaOffset += prevEdit.newLength - prevEdit.oldLength;
    }
    _getPrev(prevIndex) {
        return (prevIndex < this._prevLen ? this._prevEdits[prevIndex] : null);
    }
    static _rebaseCurr(prevDeltaOffset, currEdit) {
        return new TextChange(currEdit.oldPosition - prevDeltaOffset, currEdit.oldText, currEdit.newPosition, currEdit.newText);
    }
    static _rebasePrev(currDeltaOffset, prevEdit) {
        return new TextChange(prevEdit.oldPosition, prevEdit.oldText, prevEdit.newPosition + currDeltaOffset, prevEdit.newText);
    }
    static _splitPrev(edit, offset) {
        const preText = edit.newText.substr(0, offset);
        const postText = edit.newText.substr(offset);
        return [
            new TextChange(edit.oldPosition, edit.oldText, edit.newPosition, preText),
            new TextChange(edit.oldEnd, '', edit.newPosition + offset, postText)
        ];
    }
    static _splitCurr(edit, offset) {
        const preText = edit.oldText.substr(0, offset);
        const postText = edit.oldText.substr(offset);
        return [
            new TextChange(edit.oldPosition, preText, edit.newPosition, edit.newText),
            new TextChange(edit.oldPosition + offset, postText, edit.newEnd, '')
        ];
    }
    static _merge(edits) {
        if (edits.length === 0) {
            return edits;
        }
        const result = [];
        let resultLen = 0;
        let prev = edits[0];
        for (let i = 1; i < edits.length; i++) {
            const curr = edits[i];
            if (prev.oldEnd === curr.oldPosition) {
                // Merge into `prev`
                prev = new TextChange(prev.oldPosition, prev.oldText + curr.oldText, prev.newPosition, prev.newText + curr.newText);
            }
            else {
                result[resultLen++] = prev;
                prev = curr;
            }
        }
        result[resultLen++] = prev;
        return result;
    }
    static _removeNoOps(edits) {
        if (edits.length === 0) {
            return edits;
        }
        const result = [];
        let resultLen = 0;
        for (let i = 0; i < edits.length; i++) {
            const edit = edits[i];
            if (edit.oldText === edit.newText) {
                continue;
            }
            result[resultLen++] = edit;
        }
        return result;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dENoYW5nZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL2NvcmUvdGV4dENoYW5nZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssTUFBTSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3pELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUVuRCxTQUFTLGFBQWEsQ0FBQyxHQUFXO0lBQ2pDLE9BQU8sQ0FDTixHQUFHO1NBQ0QsT0FBTyxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUM7U0FDckIsT0FBTyxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FDdkIsQ0FBQztBQUNILENBQUM7QUFFRCxNQUFNLE9BQU8sVUFBVTtJQUV0QixJQUFXLFNBQVM7UUFDbkIsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQztJQUM1QixDQUFDO0lBRUQsSUFBVyxNQUFNO1FBQ2hCLE9BQU8sSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQztJQUMvQyxDQUFDO0lBRUQsSUFBVyxTQUFTO1FBQ25CLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUM7SUFDNUIsQ0FBQztJQUVELElBQVcsTUFBTTtRQUNoQixPQUFPLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUM7SUFDL0MsQ0FBQztJQUVELFlBQ2lCLFdBQW1CLEVBQ25CLE9BQWUsRUFDZixXQUFtQixFQUNuQixPQUFlO1FBSGYsZ0JBQVcsR0FBWCxXQUFXLENBQVE7UUFDbkIsWUFBTyxHQUFQLE9BQU8sQ0FBUTtRQUNmLGdCQUFXLEdBQVgsV0FBVyxDQUFRO1FBQ25CLFlBQU8sR0FBUCxPQUFP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