/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { FloatHorizontalRange } from '../../view/renderingContext.js';
export class RangeUtil {
    static _createRange() {
        if (!this._handyReadyRange) {
            this._handyReadyRange = document.createRange();
        }
        return this._handyReadyRange;
    }
    static _detachRange(range, endNode) {
        // Move range out of the span node, IE doesn't like having many ranges in
        // the same spot and will act badly for lines containing dashes ('-')
        range.selectNodeContents(endNode);
    }
    static _readClientRects(startElement, startOffset, endElement, endOffset, endNode) {
        const range = this._createRange();
        try {
            range.setStart(startElement, startOffset);
            range.setEnd(endElement, endOffset);
            return range.getClientRects();
        }
        catch (e) {
            // This is life ...
            return null;
        }
        finally {
            this._detachRange(range, endNode);
        }
    }
    static _mergeAdjacentRanges(ranges) {
        if (ranges.length === 1) {
            // There is nothing to merge
            return ranges;
        }
        ranges.sort(FloatHorizontalRange.compare);
        const result = [];
        let resultLen = 0;
        let prev = ranges[0];
        for (let i = 1, len = ranges.length; i < len; i++) {
            const range = ranges[i];
            if (prev.left + prev.width + 0.9 /* account for browser's rounding errors*/ >= range.left) {
                prev.width = Math.max(prev.width, range.left + range.width - prev.left);
            }
            else {
                result[resultLen++] = prev;
                prev = range;
            }
        }
        result[resultLen++] = prev;
        return result;
    }
    static _createHorizontalRangesFromClientRects(clientRects, clientRectDeltaLeft, clientRectScale) {
        if (!clientRects || clientRects.length === 0) {
            return null;
        }
        // We go through FloatHorizontalRange because it has been observed in bi-di text
        // that the clientRects are not coming in sorted from the browser
        const result = [];
        for (let i = 0, len = clientRects.length; i < len; i++) {
            const clientRect = clientRects[i];
            result[i] = new FloatHorizontalRange(Math.max(0, (clientRect.left - clientRectDeltaLeft) / clientRectScale), clientRect.width / clientRectScale);
        }
        return this._mergeAdjacentRanges(result);
    }
    static readHorizontalRanges(domNode, startChildIndex, startOffset, endChildIndex, endOffset, context) {
        // Panic check
        const min = 0;
        const max = domNode.children.length - 1;
        if (min > max) {
            return null;
        }
        startChildIndex = Math.min(max, Math.max(min, startChildIndex));
        endChildIndex = Math.min(max, Math.max(min, endChildIndex));
        if (startChildIndex === endChildIndex && startOffset === endOffset && startOffset === 0 && !domNode.children[startChildIndex].firstChild) {
            // We must find the position at the beginning of a <span>
            // To cover cases of empty <span>s, avoid using a range and use the <span>'s bounding box
            const clientRects = domNode.children[startChildIndex].getClientRects();
            context.markDidDomLayout();
            return this._createHorizontalRangesFromClientRects(clientRects, context.clientRectDeltaLeft, context.clientRectScale);
        }
        // If crossing over to a span only to select offset 0, then use the previous span's maximum offset
        // Chrome is buggy and doesn't handle 0 offsets well sometimes.
        if (startChildIndex !== endChildIndex) {
            if (endChildIndex > 0 && endOffset === 0) {
                endChildIndex--;
                endOffset = 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */;
            }
        }
        let startElement = domNode.children[startChildIndex].firstChild;
        let endElement = domNode.children[endChildIndex].firstChild;
        if (!startElement || !endElement) {
            // When having an empty <span> (without any text content), try to move to the previous <span>
            if (!startElement && startOffset === 0 && startChildIndex > 0) {
                startElement = domNode.children[startChildIndex - 1].firstChild;
                startOffset = 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */;
            }
            if (!endElement && endOffset === 0 && endChildIndex > 0) {
                endElement = domNode.children[endChildIndex - 1].firstChild;
                endOffset = 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */;
            }
        }
        if (!startElement || !endElement) {
            return null;
        }
        startOffset = Math.min(startElement.textContent.length, Math.max(0, startOffset));
        endOffset = Math.min(endElement.textContent.length, Math.max(0, endOffset));
        const clientRects = this._readClientRects(startElement, startOffset, endElement, endOffset, context.endNode);
        context.markDidDomLayout();
        return this._createHorizontalRangesFromClientRects(clientRects, context.clientRectDeltaLeft, context.clientRectScale);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmFuZ2VVdGlsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL3ZpZXdQYXJ0cy92aWV3TGluZXMvcmFuZ2VVdGlsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBR3RFLE1BQU0sT0FBTyxTQUFTO0lBU2IsTUFBTSxDQUFDLFlBQVk7UUFDMUIsSUFBSSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1lBQzVCLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxRQUFRLENBQUMsV0FBVyxFQUFFLENBQUM7UUFDaEQsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLGdCQUFnQixDQUFDO0lBQzlCLENBQUM7SUFFTyxNQUFNLENBQUMsWUFBWSxDQUFDLEtBQVksRUFBRSxPQUFvQjtRQUM3RCx5RUFBeUU7UUFDekUscUVBQXFFO1FBQ3JFLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUNuQyxDQUFDO0lBRU8sTUFBTSxDQUFDLGdCQUFnQixDQUFDLFlBQWtCLEVBQUUsV0FBbUIsRUFBRSxVQUFnQixFQUFFLFNBQWlCLEVBQUUsT0FBb0I7UUFDakksTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO1FBQ2xDLElBQUksQ0FBQztZQUNKLEtBQUssQ0FBQyxRQUFRLENBQUMsWUFBWSxFQUFFLFdBQVcsQ0FBQyxDQUFDO1lBQzFDLEtBQUssQ0FBQyxNQUFNLENBQUMsVUFBVSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBRXBDLE9BQU8sS0FBSyxDQUFDLGNBQWMsRUFBRSxDQUFDO1FBQy9CLENBQUM7UUFBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ1osbUJBQW1CO1lB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