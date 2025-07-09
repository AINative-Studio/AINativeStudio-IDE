/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as strings from '../../../base/common/strings.js';
export class LineDecoration {
    constructor(startColumn, endColumn, className, type) {
        this.startColumn = startColumn;
        this.endColumn = endColumn;
        this.className = className;
        this.type = type;
        this._lineDecorationBrand = undefined;
    }
    static _equals(a, b) {
        return (a.startColumn === b.startColumn
            && a.endColumn === b.endColumn
            && a.className === b.className
            && a.type === b.type);
    }
    static equalsArr(a, b) {
        const aLen = a.length;
        const bLen = b.length;
        if (aLen !== bLen) {
            return false;
        }
        for (let i = 0; i < aLen; i++) {
            if (!LineDecoration._equals(a[i], b[i])) {
                return false;
            }
        }
        return true;
    }
    static extractWrapped(arr, startOffset, endOffset) {
        if (arr.length === 0) {
            return arr;
        }
        const startColumn = startOffset + 1;
        const endColumn = endOffset + 1;
        const lineLength = endOffset - startOffset;
        const r = [];
        let rLength = 0;
        for (const dec of arr) {
            if (dec.endColumn <= startColumn || dec.startColumn >= endColumn) {
                continue;
            }
            r[rLength++] = new LineDecoration(Math.max(1, dec.startColumn - startColumn + 1), Math.min(lineLength + 1, dec.endColumn - startColumn + 1), dec.className, dec.type);
        }
        return r;
    }
    static filter(lineDecorations, lineNumber, minLineColumn, maxLineColumn) {
        if (lineDecorations.length === 0) {
            return [];
        }
        const result = [];
        let resultLen = 0;
        for (let i = 0, len = lineDecorations.length; i < len; i++) {
            const d = lineDecorations[i];
            const range = d.range;
            if (range.endLineNumber < lineNumber || range.startLineNumber > lineNumber) {
                // Ignore decorations that sit outside this line
                continue;
            }
            if (range.isEmpty() && (d.type === 0 /* InlineDecorationType.Regular */ || d.type === 3 /* InlineDecorationType.RegularAffectingLetterSpacing */)) {
                // Ignore empty range decorations
                continue;
            }
            const startColumn = (range.startLineNumber === lineNumber ? range.startColumn : minLineColumn);
            const endColumn = (range.endLineNumber === lineNumber ? range.endColumn : maxLineColumn);
            result[resultLen++] = new LineDecoration(startColumn, endColumn, d.inlineClassName, d.type);
        }
        return result;
    }
    static _typeCompare(a, b) {
        const ORDER = [2, 0, 1, 3];
        return ORDER[a] - ORDER[b];
    }
    static compare(a, b) {
        if (a.startColumn !== b.startColumn) {
            return a.startColumn - b.startColumn;
        }
        if (a.endColumn !== b.endColumn) {
            return a.endColumn - b.endColumn;
        }
        const typeCmp = LineDecoration._typeCompare(a.type, b.type);
        if (typeCmp !== 0) {
            return typeCmp;
        }
        if (a.className !== b.className) {
            return a.className < b.className ? -1 : 1;
        }
        return 0;
    }
}
export class DecorationSegment {
    constructor(startOffset, endOffset, className, metadata) {
        this.startOffset = startOffset;
        this.endOffset = endOffset;
        this.className = className;
        this.metadata = metadata;
    }
}
class Stack {
    constructor() {
        this.stopOffsets = [];
        this.classNames = [];
        this.metadata = [];
        this.count = 0;
    }
    static _metadata(metadata) {
        let result = 0;
        for (let i = 0, len = metadata.length; i < len; i++) {
            result |= metadata[i];
        }
        return result;
    }
    consumeLowerThan(maxStopOffset, nextStartOffset, result) {
        while (this.count > 0 && this.stopOffsets[0] < maxStopOffset) {
            let i = 0;
            // Take all equal stopping offsets
            while (i + 1 < this.count && this.stopOffsets[i] === this.stopOffsets[i + 1]) {
                i++;
            }
            // Basically we are consuming the first i + 1 elements of the stack
            result.push(new DecorationSegment(nextStartOffset, this.stopOffsets[i], this.classNames.join(' '), Stack._metadata(this.metadata)));
            nextStartOffset = this.stopOffsets[i] + 1;
            // Consume them
            this.stopOffsets.splice(0, i + 1);
            this.classNames.splice(0, i + 1);
            this.metadata.splice(0, i + 1);
            this.count -= (i + 1);
        }
        if (this.count > 0 && nextStartOffset < maxStopOffset) {
            result.push(new DecorationSegment(nextStartOffset, maxStopOffset - 1, this.classNames.join(' '), Stack._metadata(this.metadata)));
            nextStartOffset = maxStopOffset;
        }
        return nextStartOffset;
    }
    insert(stopOffset, className, metadata) {
        if (this.count === 0 || this.stopOffsets[this.count - 1] <= stopOffset) {
            // Insert at the end
            this.stopOffsets.push(stopOffset);
            this.classNames.push(className);
            this.metadata.push(metadata);
        }
        else {
            // Find the insertion position for `stopOffset`
            for (let i = 0; i < this.count; i++) {
                if (this.stopOffsets[i] >= stopOffset) {
                    this.stopOffsets.splice(i, 0, stopOffset);
                    this.classNames.splice(i, 0, className);
                    this.metadata.splice(i, 0, metadata);
                    break;
                }
            }
        }
        this.count++;
        return;
    }
}
export class LineDecorationsNormalizer {
    /**
     * Normalize line decorations. Overlapping decorations will generate multiple segments
     */
    static normalize(lineContent, lineDecorations) {
        if (lineDecorations.length === 0) {
            return [];
        }
        const result = [];
        const stack = new Stack();
        let nextStartOffset = 0;
        for (let i = 0, len = lineDecorations.length; i < len; i++) {
            const d = lineDecorations[i];
            let startColumn = d.startColumn;
            let endColumn = d.endColumn;
            const className = d.className;
            const metadata = (d.type === 1 /* InlineDecorationType.Before */
                ? 2 /* LinePartMetadata.PSEUDO_BEFORE */
                : d.type === 2 /* InlineDecorationType.After */
                    ? 4 /* LinePartMetadata.PSEUDO_AFTER */
                    : 0);
            // If the position would end up in the middle of a high-low surrogate pair, we move it to before the pair
            if (startColumn > 1) {
                const charCodeBefore = lineContent.charCodeAt(startColumn - 2);
                if (strings.isHighSurrogate(charCodeBefore)) {
                    startColumn--;
                }
            }
            if (endColumn > 1) {
                const charCodeBefore = lineContent.charCodeAt(endColumn - 2);
                if (strings.isHighSurrogate(charCodeBefore)) {
                    endColumn--;
                }
            }
            const currentStartOffset = startColumn - 1;
            const currentEndOffset = endColumn - 2;
            nextStartOffset = stack.consumeLowerThan(currentStartOffset, nextStartOffset, result);
            if (stack.count === 0) {
                nextStartOffset = currentStartOffset;
            }
            stack.insert(currentEndOffset, className, metadata);
        }
        stack.consumeLowerThan(1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */, nextStartOffset, result);
        return result;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGluZURlY29yYXRpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vdmlld0xheW91dC9saW5lRGVjb3JhdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLE9BQU8sTUFBTSxpQ0FBaUMsQ0FBQztBQUszRCxNQUFNLE9BQU8sY0FBYztJQUcxQixZQUNpQixXQUFtQixFQUNuQixTQUFpQixFQUNqQixTQUFpQixFQUNqQixJQUEwQjtRQUgxQixnQkFBVyxHQUFYLFdBQVcsQ0FBUTtRQUNuQixjQUFTLEdBQVQsU0FBUyxDQUFRO1FBQ2pCLGNBQVMsR0FBVCxTQUFTLENBQVE7UUFDakIsU0FBSSxHQUFKLElBQUksQ0FBc0I7UUFOM0MseUJBQW9CLEdBQVMsU0FBUyxDQUFDO0lBUXZDLENBQUM7SUFFTyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQWlCLEVBQUUsQ0FBaUI7UUFDMUQsT0FBTyxDQUNOLENBQUMsQ0FBQyxXQUFXLEtBQUssQ0FBQyxDQUFDLFdBQVc7ZUFDNUIsQ0FBQyxDQUFDLFNBQVMsS0FBSyxDQUFDLENBQUMsU0FBUztlQUMzQixDQUFDLENBQUMsU0FBUyxLQUFLLENBQUMsQ0FBQyxTQUFTO2VBQzNCLENBQUMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FDcEIsQ0FBQztJQUNILENBQUM7SUFFTSxNQUFNLENBQUMsU0FBUyxDQUFDLENBQW1CLEVBQUUsQ0FBbUI7UUFDL0QsTUFBTSxJQUFJLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQztRQUN0QixNQUFNLElBQUksR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDO1FBQ3RCLElBQUksSUFBSSxLQUFLLElBQUksRUFBRSxDQUFDO1lBQ25CLE9BQU8sS0FBSyxDQUFDO1FBQ2Qs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