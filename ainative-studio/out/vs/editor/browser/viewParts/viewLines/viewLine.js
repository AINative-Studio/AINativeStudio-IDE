/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as browser from '../../../../base/browser/browser.js';
import { createFastDomNode } from '../../../../base/browser/fastDomNode.js';
import * as platform from '../../../../base/common/platform.js';
import { RangeUtil } from './rangeUtil.js';
import { FloatHorizontalRange, VisibleRanges } from '../../view/renderingContext.js';
import { LineDecoration } from '../../../common/viewLayout/lineDecorations.js';
import { RenderLineInput, renderViewLine, LineRange, DomPosition } from '../../../common/viewLayout/viewLineRenderer.js';
import { isHighContrast } from '../../../../platform/theme/common/theme.js';
import { EditorFontLigatures } from '../../../common/config/editorOptions.js';
const canUseFastRenderedViewLine = (function () {
    if (platform.isNative) {
        // In VSCode we know very well when the zoom level changes
        return true;
    }
    if (platform.isLinux || browser.isFirefox || browser.isSafari) {
        // On Linux, it appears that zooming affects char widths (in pixels), which is unexpected.
        // --
        // Even though we read character widths correctly, having read them at a specific zoom level
        // does not mean they are the same at the current zoom level.
        // --
        // This could be improved if we ever figure out how to get an event when browsers zoom,
        // but until then we have to stick with reading client rects.
        // --
        // The same has been observed with Firefox on Windows7
        // --
        // The same has been oversved with Safari
        return false;
    }
    return true;
})();
let monospaceAssumptionsAreValid = true;
export class ViewLine {
    static { this.CLASS_NAME = 'view-line'; }
    constructor(_viewGpuContext, options) {
        this._viewGpuContext = _viewGpuContext;
        this._options = options;
        this._isMaybeInvalid = true;
        this._renderedViewLine = null;
    }
    // --- begin IVisibleLineData
    getDomNode() {
        if (this._renderedViewLine && this._renderedViewLine.domNode) {
            return this._renderedViewLine.domNode.domNode;
        }
        return null;
    }
    setDomNode(domNode) {
        if (this._renderedViewLine) {
            this._renderedViewLine.domNode = createFastDomNode(domNode);
        }
        else {
            throw new Error('I have no rendered view line to set the dom node to...');
        }
    }
    onContentChanged() {
        this._isMaybeInvalid = true;
    }
    onTokensChanged() {
        this._isMaybeInvalid = true;
    }
    onDecorationsChanged() {
        this._isMaybeInvalid = true;
    }
    onOptionsChanged(newOptions) {
        this._isMaybeInvalid = true;
        this._options = newOptions;
    }
    onSelectionChanged() {
        if (isHighContrast(this._options.themeType) || this._options.renderWhitespace === 'selection') {
            this._isMaybeInvalid = true;
            return true;
        }
        return false;
    }
    renderLine(lineNumber, deltaTop, lineHeight, viewportData, sb) {
        if (this._options.useGpu && this._viewGpuContext?.canRender(this._options, viewportData, lineNumber)) {
            this._renderedViewLine?.domNode?.domNode.remove();
            this._renderedViewLine = null;
            return false;
        }
        if (this._isMaybeInvalid === false) {
            // it appears that nothing relevant has changed
            return false;
        }
        this._isMaybeInvalid = false;
        const lineData = viewportData.getViewLineRenderingData(lineNumber);
        const options = this._options;
        const actualInlineDecorations = LineDecoration.filter(lineData.inlineDecorations, lineNumber, lineData.minColumn, lineData.maxColumn);
        // Only send selection information when needed for rendering whitespace
        let selectionsOnLine = null;
        if (isHighContrast(options.themeType) || this._options.renderWhitespace === 'selection') {
            const selections = viewportData.selections;
            for (const selection of selections) {
                if (selection.endLineNumber < lineNumber || selection.startLineNumber > lineNumber) {
                    // Selection does not intersect line
                    continue;
                }
                const startColumn = (selection.startLineNumber === lineNumber ? selection.startColumn : lineData.minColumn);
                const endColumn = (selection.endLineNumber === lineNumber ? selection.endColumn : lineData.maxColumn);
                if (startColumn < endColumn) {
                    if (isHighContrast(options.themeType)) {
                        actualInlineDecorations.push(new LineDecoration(startColumn, endColumn, 'inline-selected-text', 0 /* InlineDecorationType.Regular */));
                    }
                    if (this._options.renderWhitespace === 'selection') {
                        if (!selectionsOnLine) {
                            selectionsOnLine = [];
                        }
                        selectionsOnLine.push(new LineRange(startColumn - 1, endColumn - 1));
                    }
                }
            }
        }
        const renderLineInput = new RenderLineInput(options.useMonospaceOptimizations, options.canUseHalfwidthRightwardsArrow, lineData.content, lineData.continuesWithWrappedLine, lineData.isBasicASCII, lineData.containsRTL, lineData.minColumn - 1, lineData.tokens, actualInlineDecorations, lineData.tabSize, lineData.startVisibleColumn, options.spaceWidth, options.middotWidth, options.wsmiddotWidth, options.stopRenderingLineAfter, options.renderWhitespace, options.renderControlCharacters, options.fontLigatures !== EditorFontLigatures.OFF, selectionsOnLine);
        if (this._renderedViewLine && this._renderedViewLine.input.equals(renderLineInput)) {
            // no need to do anything, we have the same render input
            return false;
        }
        sb.appendString('<div style="top:');
        sb.appendString(String(deltaTop));
        sb.appendString('px;height:');
        sb.appendString(String(lineHeight));
        sb.appendString('px;" class="');
        sb.appendString(ViewLine.CLASS_NAME);
        sb.appendString('">');
        const output = renderViewLine(renderLineInput, sb);
        sb.appendString('</div>');
        let renderedViewLine = null;
        if (monospaceAssumptionsAreValid && canUseFastRenderedViewLine && lineData.isBasicASCII && options.useMonospaceOptimizations && output.containsForeignElements === 0 /* ForeignElementType.None */) {
            renderedViewLine = new FastRenderedViewLine(this._renderedViewLine ? this._renderedViewLine.domNode : null, renderLineInput, output.characterMapping);
        }
        if (!renderedViewLine) {
            renderedViewLine = createRenderedLine(this._renderedViewLine ? this._renderedViewLine.domNode : null, renderLineInput, output.characterMapping, output.containsRTL, output.containsForeignElements);
        }
        this._renderedViewLine = renderedViewLine;
        return true;
    }
    layoutLine(lineNumber, deltaTop, lineHeight) {
        if (this._renderedViewLine && this._renderedViewLine.domNode) {
            this._renderedViewLine.domNode.setTop(deltaTop);
            this._renderedViewLine.domNode.setHeight(lineHeight);
        }
    }
    // --- end IVisibleLineData
    getWidth(context) {
        if (!this._renderedViewLine) {
            return 0;
        }
        return this._renderedViewLine.getWidth(context);
    }
    getWidthIsFast() {
        if (!this._renderedViewLine) {
            return true;
        }
        return this._renderedViewLine.getWidthIsFast();
    }
    needsMonospaceFontCheck() {
        if (!this._renderedViewLine) {
            return false;
        }
        return (this._renderedViewLine instanceof FastRenderedViewLine);
    }
    monospaceAssumptionsAreValid() {
        if (!this._renderedViewLine) {
            return monospaceAssumptionsAreValid;
        }
        if (this._renderedViewLine instanceof FastRenderedViewLine) {
            return this._renderedViewLine.monospaceAssumptionsAreValid();
        }
        return monospaceAssumptionsAreValid;
    }
    onMonospaceAssumptionsInvalidated() {
        if (this._renderedViewLine && this._renderedViewLine instanceof FastRenderedViewLine) {
            this._renderedViewLine = this._renderedViewLine.toSlowRenderedLine();
        }
    }
    getVisibleRangesForRange(lineNumber, startColumn, endColumn, context) {
        if (!this._renderedViewLine) {
            return null;
        }
        startColumn = Math.min(this._renderedViewLine.input.lineContent.length + 1, Math.max(1, startColumn));
        endColumn = Math.min(this._renderedViewLine.input.lineContent.length + 1, Math.max(1, endColumn));
        const stopRenderingLineAfter = this._renderedViewLine.input.stopRenderingLineAfter;
        if (stopRenderingLineAfter !== -1 && startColumn > stopRenderingLineAfter + 1 && endColumn > stopRenderingLineAfter + 1) {
            // This range is obviously not visible
            return new VisibleRanges(true, [new FloatHorizontalRange(this.getWidth(context), 0)]);
        }
        if (stopRenderingLineAfter !== -1 && startColumn > stopRenderingLineAfter + 1) {
            startColumn = stopRenderingLineAfter + 1;
        }
        if (stopRenderingLineAfter !== -1 && endColumn > stopRenderingLineAfter + 1) {
            endColumn = stopRenderingLineAfter + 1;
        }
        const horizontalRanges = this._renderedViewLine.getVisibleRangesForRange(lineNumber, startColumn, endColumn, context);
        if (horizontalRanges && horizontalRanges.length > 0) {
            return new VisibleRanges(false, horizontalRanges);
        }
        return null;
    }
    getColumnOfNodeOffset(spanNode, offset) {
        if (!this._renderedViewLine) {
            return 1;
        }
        return this._renderedViewLine.getColumnOfNodeOffset(spanNode, offset);
    }
}
var Constants;
(function (Constants) {
    /**
     * It seems that rounding errors occur with long lines, so the purely multiplication based
     * method is only viable for short lines. For longer lines, we look up the real position of
     * every 300th character and use multiplication based on that.
     *
     * See https://github.com/microsoft/vscode/issues/33178
     */
    Constants[Constants["MaxMonospaceDistance"] = 300] = "MaxMonospaceDistance";
})(Constants || (Constants = {}));
/**
 * A rendered line which is guaranteed to contain only regular ASCII and is rendered with a monospace font.
 */
class FastRenderedViewLine {
    constructor(domNode, renderLineInput, characterMapping) {
        this._cachedWidth = -1;
        this.domNode = domNode;
        this.input = renderLineInput;
        const keyColumnCount = Math.floor(renderLineInput.lineContent.length / 300 /* Constants.MaxMonospaceDistance */);
        if (keyColumnCount > 0) {
            this._keyColumnPixelOffsetCache = new Float32Array(keyColumnCount);
            for (let i = 0; i < keyColumnCount; i++) {
                this._keyColumnPixelOffsetCache[i] = -1;
            }
        }
        else {
            this._keyColumnPixelOffsetCache = null;
        }
        this._characterMapping = characterMapping;
        this._charWidth = renderLineInput.spaceWidth;
    }
    getWidth(context) {
        if (!this.domNode || this.input.lineContent.length < 300 /* Constants.MaxMonospaceDistance */) {
            const horizontalOffset = this._characterMapping.getHorizontalOffset(this._characterMapping.length);
            return Math.round(this._charWidth * horizontalOffset);
        }
        if (this._cachedWidth === -1) {
            this._cachedWidth = this._getReadingTarget(this.domNode).offsetWidth;
            context?.markDidDomLayout();
        }
        return this._cachedWidth;
    }
    getWidthIsFast() {
        return (this.input.lineContent.length < 300 /* Constants.MaxMonospaceDistance */) || this._cachedWidth !== -1;
    }
    monospaceAssumptionsAreValid() {
        if (!this.domNode) {
            return monospaceAssumptionsAreValid;
        }
        if (this.input.lineContent.length < 300 /* Constants.MaxMonospaceDistance */) {
            const expectedWidth = this.getWidth(null);
            const actualWidth = this.domNode.domNode.firstChild.offsetWidth;
            if (Math.abs(expectedWidth - actualWidth) >= 2) {
                // more than 2px off
                console.warn(`monospace assumptions have been violated, therefore disabling monospace optimizations!`);
                monospaceAssumptionsAreValid = false;
            }
        }
        return monospaceAssumptionsAreValid;
    }
    toSlowRenderedLine() {
        return createRenderedLine(this.domNode, this.input, this._characterMapping, false, 0 /* ForeignElementType.None */);
    }
    getVisibleRangesForRange(lineNumber, startColumn, endColumn, context) {
        const startPosition = this._getColumnPixelOffset(lineNumber, startColumn, context);
        const endPosition = this._getColumnPixelOffset(lineNumber, endColumn, context);
        return [new FloatHorizontalRange(startPosition, endPosition - startPosition)];
    }
    _getColumnPixelOffset(lineNumber, column, context) {
        if (column <= 300 /* Constants.MaxMonospaceDistance */) {
            const horizontalOffset = this._characterMapping.getHorizontalOffset(column);
            return this._charWidth * horizontalOffset;
        }
        const keyColumnOrdinal = Math.floor((column - 1) / 300 /* Constants.MaxMonospaceDistance */) - 1;
        const keyColumn = (keyColumnOrdinal + 1) * 300 /* Constants.MaxMonospaceDistance */ + 1;
        let keyColumnPixelOffset = -1;
        if (this._keyColumnPixelOffsetCache) {
            keyColumnPixelOffset = this._keyColumnPixelOffsetCache[keyColumnOrdinal];
            if (keyColumnPixelOffset === -1) {
                keyColumnPixelOffset = this._actualReadPixelOffset(lineNumber, keyColumn, context);
                this._keyColumnPixelOffsetCache[keyColumnOrdinal] = keyColumnPixelOffset;
            }
        }
        if (keyColumnPixelOffset === -1) {
            // Could not read actual key column pixel offset
            const horizontalOffset = this._characterMapping.getHorizontalOffset(column);
            return this._charWidth * horizontalOffset;
        }
        const keyColumnHorizontalOffset = this._characterMapping.getHorizontalOffset(keyColumn);
        const horizontalOffset = this._characterMapping.getHorizontalOffset(column);
        return keyColumnPixelOffset + this._charWidth * (horizontalOffset - keyColumnHorizontalOffset);
    }
    _getReadingTarget(myDomNode) {
        return myDomNode.domNode.firstChild;
    }
    _actualReadPixelOffset(lineNumber, column, context) {
        if (!this.domNode) {
            return -1;
        }
        const domPosition = this._characterMapping.getDomPosition(column);
        const r = RangeUtil.readHorizontalRanges(this._getReadingTarget(this.domNode), domPosition.partIndex, domPosition.charIndex, domPosition.partIndex, domPosition.charIndex, context);
        if (!r || r.length === 0) {
            return -1;
        }
        return r[0].left;
    }
    getColumnOfNodeOffset(spanNode, offset) {
        return getColumnOfNodeOffset(this._characterMapping, spanNode, offset);
    }
}
/**
 * Every time we render a line, we save what we have rendered in an instance of this class.
 */
class RenderedViewLine {
    constructor(domNode, renderLineInput, characterMapping, containsRTL, containsForeignElements) {
        this.domNode = domNode;
        this.input = renderLineInput;
        this._characterMapping = characterMapping;
        this._isWhitespaceOnly = /^\s*$/.test(renderLineInput.lineContent);
        this._containsForeignElements = containsForeignElements;
        this._cachedWidth = -1;
        this._pixelOffsetCache = null;
        if (!containsRTL || this._characterMapping.length === 0 /* the line is empty */) {
            this._pixelOffsetCache = new Float32Array(Math.max(2, this._characterMapping.length + 1));
            for (let column = 0, len = this._characterMapping.length; column <= len; column++) {
                this._pixelOffsetCache[column] = -1;
            }
        }
    }
    // --- Reading from the DOM methods
    _getReadingTarget(myDomNode) {
        return myDomNode.domNode.firstChild;
    }
    /**
     * Width of the line in pixels
     */
    getWidth(context) {
        if (!this.domNode) {
            return 0;
        }
        if (this._cachedWidth === -1) {
            this._cachedWidth = this._getReadingTarget(this.domNode).offsetWidth;
            context?.markDidDomLayout();
        }
        return this._cachedWidth;
    }
    getWidthIsFast() {
        if (this._cachedWidth === -1) {
            return false;
        }
        return true;
    }
    /**
     * Visible ranges for a model range
     */
    getVisibleRangesForRange(lineNumber, startColumn, endColumn, context) {
        if (!this.domNode) {
            return null;
        }
        if (this._pixelOffsetCache !== null) {
            // the text is LTR
            const startOffset = this._readPixelOffset(this.domNode, lineNumber, startColumn, context);
            if (startOffset === -1) {
                return null;
            }
            const endOffset = this._readPixelOffset(this.domNode, lineNumber, endColumn, context);
            if (endOffset === -1) {
                return null;
            }
            return [new FloatHorizontalRange(startOffset, endOffset - startOffset)];
        }
        return this._readVisibleRangesForRange(this.domNode, lineNumber, startColumn, endColumn, context);
    }
    _readVisibleRangesForRange(domNode, lineNumber, startColumn, endColumn, context) {
        if (startColumn === endColumn) {
            const pixelOffset = this._readPixelOffset(domNode, lineNumber, startColumn, context);
            if (pixelOffset === -1) {
                return null;
            }
            else {
                return [new FloatHorizontalRange(pixelOffset, 0)];
            }
        }
        else {
            return this._readRawVisibleRangesForRange(domNode, startColumn, endColumn, context);
        }
    }
    _readPixelOffset(domNode, lineNumber, column, context) {
        if (this._characterMapping.length === 0) {
            // This line has no content
            if (this._containsForeignElements === 0 /* ForeignElementType.None */) {
                // We can assume the line is really empty
                return 0;
            }
            if (this._containsForeignElements === 2 /* ForeignElementType.After */) {
                // We have foreign elements after the (empty) line
                return 0;
            }
            if (this._containsForeignElements === 1 /* ForeignElementType.Before */) {
                // We have foreign elements before the (empty) line
                return this.getWidth(context);
            }
            // We have foreign elements before & after the (empty) line
            const readingTarget = this._getReadingTarget(domNode);
            if (readingTarget.firstChild) {
                context.markDidDomLayout();
                return readingTarget.firstChild.offsetWidth;
            }
            else {
                return 0;
            }
        }
        if (this._pixelOffsetCache !== null) {
            // the text is LTR
            const cachedPixelOffset = this._pixelOffsetCache[column];
            if (cachedPixelOffset !== -1) {
                return cachedPixelOffset;
            }
            const result = this._actualReadPixelOffset(domNode, lineNumber, column, context);
            this._pixelOffsetCache[column] = result;
            return result;
        }
        return this._actualReadPixelOffset(domNode, lineNumber, column, context);
    }
    _actualReadPixelOffset(domNode, lineNumber, column, context) {
        if (this._characterMapping.length === 0) {
            // This line has no content
            const r = RangeUtil.readHorizontalRanges(this._getReadingTarget(domNode), 0, 0, 0, 0, context);
            if (!r || r.length === 0) {
                return -1;
            }
            return r[0].left;
        }
        if (column === this._characterMapping.length && this._isWhitespaceOnly && this._containsForeignElements === 0 /* ForeignElementType.None */) {
            // This branch helps in the case of whitespace only lines which have a width set
            return this.getWidth(context);
        }
        const domPosition = this._characterMapping.getDomPosition(column);
        const r = RangeUtil.readHorizontalRanges(this._getReadingTarget(domNode), domPosition.partIndex, domPosition.charIndex, domPosition.partIndex, domPosition.charIndex, context);
        if (!r || r.length === 0) {
            return -1;
        }
        const result = r[0].left;
        if (this.input.isBasicASCII) {
            const horizontalOffset = this._characterMapping.getHorizontalOffset(column);
            const expectedResult = Math.round(this.input.spaceWidth * horizontalOffset);
            if (Math.abs(expectedResult - result) <= 1) {
                return expectedResult;
            }
        }
        return result;
    }
    _readRawVisibleRangesForRange(domNode, startColumn, endColumn, context) {
        if (startColumn === 1 && endColumn === this._characterMapping.length) {
            // This branch helps IE with bidi text & gives a performance boost to other browsers when reading visible ranges for an entire line
            return [new FloatHorizontalRange(0, this.getWidth(context))];
        }
        const startDomPosition = this._characterMapping.getDomPosition(startColumn);
        const endDomPosition = this._characterMapping.getDomPosition(endColumn);
        return RangeUtil.readHorizontalRanges(this._getReadingTarget(domNode), startDomPosition.partIndex, startDomPosition.charIndex, endDomPosition.partIndex, endDomPosition.charIndex, context);
    }
    /**
     * Returns the column for the text found at a specific offset inside a rendered dom node
     */
    getColumnOfNodeOffset(spanNode, offset) {
        return getColumnOfNodeOffset(this._characterMapping, spanNode, offset);
    }
}
class WebKitRenderedViewLine extends RenderedViewLine {
    _readVisibleRangesForRange(domNode, lineNumber, startColumn, endColumn, context) {
        const output = super._readVisibleRangesForRange(domNode, lineNumber, startColumn, endColumn, context);
        if (!output || output.length === 0 || startColumn === endColumn || (startColumn === 1 && endColumn === this._characterMapping.length)) {
            return output;
        }
        // WebKit is buggy and returns an expanded range (to contain words in some cases)
        // The last client rect is enlarged (I think)
        if (!this.input.containsRTL) {
            // This is an attempt to patch things up
            // Find position of last column
            const endPixelOffset = this._readPixelOffset(domNode, lineNumber, endColumn, context);
            if (endPixelOffset !== -1) {
                const lastRange = output[output.length - 1];
                if (lastRange.left < endPixelOffset) {
                    // Trim down the width of the last visible range to not go after the last column's position
                    lastRange.width = endPixelOffset - lastRange.left;
                }
            }
        }
        return output;
    }
}
const createRenderedLine = (function () {
    if (browser.isWebKit) {
        return createWebKitRenderedLine;
    }
    return createNormalRenderedLine;
})();
function createWebKitRenderedLine(domNode, renderLineInput, characterMapping, containsRTL, containsForeignElements) {
    return new WebKitRenderedViewLine(domNode, renderLineInput, characterMapping, containsRTL, containsForeignElements);
}
function createNormalRenderedLine(domNode, renderLineInput, characterMapping, containsRTL, containsForeignElements) {
    return new RenderedViewLine(domNode, renderLineInput, characterMapping, containsRTL, containsForeignElements);
}
export function getColumnOfNodeOffset(characterMapping, spanNode, offset) {
    const spanNodeTextContentLength = spanNode.textContent.length;
    let spanIndex = -1;
    while (spanNode) {
        spanNode = spanNode.previousSibling;
        spanIndex++;
    }
    return characterMapping.getColumn(new DomPosition(spanIndex, offset), spanNodeTextContentLength);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld0xpbmUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvdmlld1BhcnRzL3ZpZXdMaW5lcy92aWV3TGluZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssT0FBTyxNQUFNLHFDQUFxQyxDQUFDO0FBQy9ELE9BQU8sRUFBZSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3pGLE9BQU8sS0FBSyxRQUFRLE1BQU0scUNBQXFDLENBQUM7QUFFaEUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGdCQUFnQixDQUFDO0FBRTNDLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxhQUFhLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDL0UsT0FBTyxFQUF3QyxlQUFlLEVBQUUsY0FBYyxFQUFFLFNBQVMsRUFBRSxXQUFXLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUcvSixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDNUUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFLOUUsTUFBTSwwQkFBMEIsR0FBRyxDQUFDO0lBQ25DLElBQUksUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQ3ZCLDBEQUEwRDtRQUMxRCxPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7SUFFRCxJQUFJLFFBQVEsQ0FBQyxPQUFPLElBQUksT0FBTyxDQUFDLFNBQVMsSUFBSSxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDL0QsMEZBQTBGO1FBQzFGLEtBQUs7UUFDTCw0RkFBNEY7UUFDNUYsNkRBQTZEO1FBQzdELEtBQUs7UUFDTCx1RkFBdUY7UUFDdkYs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