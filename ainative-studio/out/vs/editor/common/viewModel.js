/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as arrays from '../../base/common/arrays.js';
import * as strings from '../../base/common/strings.js';
import { Range } from './core/range.js';
export class Viewport {
    constructor(top, left, width, height) {
        this._viewportBrand = undefined;
        this.top = top | 0;
        this.left = left | 0;
        this.width = width | 0;
        this.height = height | 0;
    }
}
export class MinimapLinesRenderingData {
    constructor(tabSize, data) {
        this.tabSize = tabSize;
        this.data = data;
    }
}
export class ViewLineData {
    constructor(content, continuesWithWrappedLine, minColumn, maxColumn, startVisibleColumn, tokens, inlineDecorations) {
        this._viewLineDataBrand = undefined;
        this.content = content;
        this.continuesWithWrappedLine = continuesWithWrappedLine;
        this.minColumn = minColumn;
        this.maxColumn = maxColumn;
        this.startVisibleColumn = startVisibleColumn;
        this.tokens = tokens;
        this.inlineDecorations = inlineDecorations;
    }
}
export class ViewLineRenderingData {
    constructor(minColumn, maxColumn, content, continuesWithWrappedLine, mightContainRTL, mightContainNonBasicASCII, tokens, inlineDecorations, tabSize, startVisibleColumn) {
        this.minColumn = minColumn;
        this.maxColumn = maxColumn;
        this.content = content;
        this.continuesWithWrappedLine = continuesWithWrappedLine;
        this.isBasicASCII = ViewLineRenderingData.isBasicASCII(content, mightContainNonBasicASCII);
        this.containsRTL = ViewLineRenderingData.containsRTL(content, this.isBasicASCII, mightContainRTL);
        this.tokens = tokens;
        this.inlineDecorations = inlineDecorations;
        this.tabSize = tabSize;
        this.startVisibleColumn = startVisibleColumn;
    }
    static isBasicASCII(lineContent, mightContainNonBasicASCII) {
        if (mightContainNonBasicASCII) {
            return strings.isBasicASCII(lineContent);
        }
        return true;
    }
    static containsRTL(lineContent, isBasicASCII, mightContainRTL) {
        if (!isBasicASCII && mightContainRTL) {
            return strings.containsRTL(lineContent);
        }
        return false;
    }
}
export var InlineDecorationType;
(function (InlineDecorationType) {
    InlineDecorationType[InlineDecorationType["Regular"] = 0] = "Regular";
    InlineDecorationType[InlineDecorationType["Before"] = 1] = "Before";
    InlineDecorationType[InlineDecorationType["After"] = 2] = "After";
    InlineDecorationType[InlineDecorationType["RegularAffectingLetterSpacing"] = 3] = "RegularAffectingLetterSpacing";
})(InlineDecorationType || (InlineDecorationType = {}));
export class InlineDecoration {
    constructor(range, inlineClassName, type) {
        this.range = range;
        this.inlineClassName = inlineClassName;
        this.type = type;
    }
}
export class SingleLineInlineDecoration {
    constructor(startOffset, endOffset, inlineClassName, inlineClassNameAffectsLetterSpacing) {
        this.startOffset = startOffset;
        this.endOffset = endOffset;
        this.inlineClassName = inlineClassName;
        this.inlineClassNameAffectsLetterSpacing = inlineClassNameAffectsLetterSpacing;
    }
    toInlineDecoration(lineNumber) {
        return new InlineDecoration(new Range(lineNumber, this.startOffset + 1, lineNumber, this.endOffset + 1), this.inlineClassName, this.inlineClassNameAffectsLetterSpacing ? 3 /* InlineDecorationType.RegularAffectingLetterSpacing */ : 0 /* InlineDecorationType.Regular */);
    }
}
export class ViewModelDecoration {
    constructor(range, options) {
        this._viewModelDecorationBrand = undefined;
        this.range = range;
        this.options = options;
    }
}
export class OverviewRulerDecorationsGroup {
    constructor(color, zIndex, 
    /**
     * Decorations are encoded in a number array using the following scheme:
     *  - 3*i = lane
     *  - 3*i+1 = startLineNumber
     *  - 3*i+2 = endLineNumber
     */
    data) {
        this.color = color;
        this.zIndex = zIndex;
        this.data = data;
    }
    static compareByRenderingProps(a, b) {
        if (a.zIndex === b.zIndex) {
            if (a.color < b.color) {
                return -1;
            }
            if (a.color > b.color) {
                return 1;
            }
            return 0;
        }
        return a.zIndex - b.zIndex;
    }
    static equals(a, b) {
        return (a.color === b.color
            && a.zIndex === b.zIndex
            && arrays.equals(a.data, b.data));
    }
    static equalsArr(a, b) {
        return arrays.equals(a, b, OverviewRulerDecorationsGroup.equals);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld01vZGVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vdmlld01vZGVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxNQUFNLE1BQU0sNkJBQTZCLENBQUM7QUFFdEQsT0FBTyxLQUFLLE9BQU8sTUFBTSw4QkFBOEIsQ0FBQztBQUV4RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFnTXhDLE1BQU0sT0FBTyxRQUFRO0lBUXBCLFlBQVksR0FBVyxFQUFFLElBQVksRUFBRSxLQUFhLEVBQUUsTUFBYztRQVAzRCxtQkFBYyxHQUFTLFNBQVMsQ0FBQztRQVF6QyxJQUFJLENBQUMsR0FBRyxHQUFHLEdBQUcsR0FBRyxDQUFDLENBQUM7UUFDbkIsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLEdBQUcsQ0FBQyxDQUFDO1FBQ3JCLElBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSyxHQUFHLENBQUMsQ0FBQztRQUN2QixJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sR0FBRyxDQUFDLENBQUM7SUFDMUIsQ0FBQztDQUNEO0FBd0JELE1BQU0sT0FBTyx5QkFBeUI7SUFJckMsWUFDQyxPQUFlLEVBQ2YsSUFBZ0M7UUFFaEMsSUFBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUM7UUFDdkIsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7SUFDbEIsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLFlBQVk7SUFpQ3hCLFlBQ0MsT0FBZSxFQUNmLHdCQUFpQyxFQUNqQyxTQUFpQixFQUNqQixTQUFpQixFQUNqQixrQkFBMEIsRUFDMUIsTUFBdUIsRUFDdkIsaUJBQStEO1FBdkNoRSx1QkFBa0IsR0FBUyxTQUFTLENBQUM7UUF5Q3BDLElBQUks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