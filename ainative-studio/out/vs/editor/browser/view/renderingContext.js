/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export class RestrictedRenderingContext {
    constructor(viewLayout, viewportData) {
        this._restrictedRenderingContextBrand = undefined;
        this._viewLayout = viewLayout;
        this.viewportData = viewportData;
        this.scrollWidth = this._viewLayout.getScrollWidth();
        this.scrollHeight = this._viewLayout.getScrollHeight();
        this.visibleRange = this.viewportData.visibleRange;
        this.bigNumbersDelta = this.viewportData.bigNumbersDelta;
        const vInfo = this._viewLayout.getCurrentViewport();
        this.scrollTop = vInfo.top;
        this.scrollLeft = vInfo.left;
        this.viewportWidth = vInfo.width;
        this.viewportHeight = vInfo.height;
    }
    getScrolledTopFromAbsoluteTop(absoluteTop) {
        return absoluteTop - this.scrollTop;
    }
    getVerticalOffsetForLineNumber(lineNumber, includeViewZones) {
        return this._viewLayout.getVerticalOffsetForLineNumber(lineNumber, includeViewZones);
    }
    getVerticalOffsetAfterLineNumber(lineNumber, includeViewZones) {
        return this._viewLayout.getVerticalOffsetAfterLineNumber(lineNumber, includeViewZones);
    }
    getDecorationsInViewport() {
        return this.viewportData.getDecorationsInViewport();
    }
}
export class RenderingContext extends RestrictedRenderingContext {
    constructor(viewLayout, viewportData, viewLines, viewLinesGpu) {
        super(viewLayout, viewportData);
        this._renderingContextBrand = undefined;
        this._viewLines = viewLines;
        this._viewLinesGpu = viewLinesGpu;
    }
    linesVisibleRangesForRange(range, includeNewLines) {
        const domRanges = this._viewLines.linesVisibleRangesForRange(range, includeNewLines);
        if (!this._viewLinesGpu) {
            return domRanges ?? null;
        }
        const gpuRanges = this._viewLinesGpu.linesVisibleRangesForRange(range, includeNewLines);
        if (!domRanges) {
            return gpuRanges;
        }
        if (!gpuRanges) {
            return domRanges;
        }
        return domRanges.concat(gpuRanges).sort((a, b) => a.lineNumber - b.lineNumber);
    }
    visibleRangeForPosition(position) {
        return this._viewLines.visibleRangeForPosition(position) ?? this._viewLinesGpu?.visibleRangeForPosition(position) ?? null;
    }
}
export class LineVisibleRanges {
    /**
     * Returns the element with the smallest `lineNumber`.
     */
    static firstLine(ranges) {
        if (!ranges) {
            return null;
        }
        let result = null;
        for (const range of ranges) {
            if (!result || range.lineNumber < result.lineNumber) {
                result = range;
            }
        }
        return result;
    }
    /**
     * Returns the element with the largest `lineNumber`.
     */
    static lastLine(ranges) {
        if (!ranges) {
            return null;
        }
        let result = null;
        for (const range of ranges) {
            if (!result || range.lineNumber > result.lineNumber) {
                result = range;
            }
        }
        return result;
    }
    constructor(outsideRenderedLine, lineNumber, ranges, 
    /**
     * Indicates if the requested range does not end in this line, but continues on the next line.
     */
    continuesOnNextLine) {
        this.outsideRenderedLine = outsideRenderedLine;
        this.lineNumber = lineNumber;
        this.ranges = ranges;
        this.continuesOnNextLine = continuesOnNextLine;
    }
}
export class HorizontalRange {
    static from(ranges) {
        const result = new Array(ranges.length);
        for (let i = 0, len = ranges.length; i < len; i++) {
            const range = ranges[i];
            result[i] = new HorizontalRange(range.left, range.width);
        }
        return result;
    }
    constructor(left, width) {
        this._horizontalRangeBrand = undefined;
        this.left = Math.round(left);
        this.width = Math.round(width);
    }
    toString() {
        return `[${this.left},${this.width}]`;
    }
}
export class FloatHorizontalRange {
    constructor(left, width) {
        this._floatHorizontalRangeBrand = undefined;
        this.left = left;
        this.width = width;
    }
    toString() {
        return `[${this.left},${this.width}]`;
    }
    static compare(a, b) {
        return a.left - b.left;
    }
}
export class HorizontalPosition {
    constructor(outsideRenderedLine, left) {
        this.outsideRenderedLine = outsideRenderedLine;
        this.originalLeft = left;
        this.left = Math.round(this.originalLeft);
    }
}
export class VisibleRanges {
    constructor(outsideRenderedLine, ranges) {
        this.outsideRenderedLine = outsideRenderedLine;
        this.ranges = ranges;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVuZGVyaW5nQ29udGV4dC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL3ZpZXcvcmVuZGVyaW5nQ29udGV4dC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQVloRyxNQUFNLE9BQWdCLDBCQUEwQjtJQW1CL0MsWUFBWSxVQUF1QixFQUFFLFlBQTBCO1FBbEIvRCxxQ0FBZ0MsR0FBUyxTQUFTLENBQUM7UUFtQmxELElBQUksQ0FBQyxXQUFXLEdBQUcsVUFBVSxDQUFDO1FBQzlCLElBQUksQ0FBQyxZQUFZLEdBQUcsWUFBWSxDQUFDO1FBRWpDLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxjQUFjLEVBQUUsQ0FBQztRQUNyRCxJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsZUFBZSxFQUFFLENBQUM7UUFFdkQsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLFlBQVksQ0FBQztRQUNuRCxJQUFJLENBQUMsZUFBZSxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsZUFBZSxDQUFDO1FBRXpELE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztRQUNwRCxJQUFJLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUM7UUFDM0IsSUFBSSxDQUFDLFVBQVUsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDO1FBQzdCLElBQUksQ0FBQyxhQUFhLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQztRQUNqQyxJQUFJLENBQUMsY0FBYyxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUM7SUFDcEMsQ0FBQztJQUVNLDZCQUE2QixDQUFDLFdBQW1CO1FBQ3ZELE9BQU8sV0FBVyxHQUFH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