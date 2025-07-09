/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import './minimap.css';
import * as dom from '../../../../base/browser/dom.js';
import { createFastDomNode } from '../../../../base/browser/fastDomNode.js';
import { GlobalPointerMoveMonitor } from '../../../../base/browser/globalPointerMoveMonitor.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import * as platform from '../../../../base/common/platform.js';
import * as strings from '../../../../base/common/strings.js';
import { RenderedLinesCollection } from '../../view/viewLayer.js';
import { PartFingerprints, ViewPart } from '../../view/viewPart.js';
import { MINIMAP_GUTTER_WIDTH, EditorLayoutInfoComputer } from '../../../common/config/editorOptions.js';
import { Range } from '../../../common/core/range.js';
import { RGBA8 } from '../../../common/core/rgba.js';
import { MinimapTokensColorTracker } from '../../../common/viewModel/minimapTokensColorTracker.js';
import { ViewModelDecoration } from '../../../common/viewModel.js';
import { minimapSelection, minimapBackground, minimapForegroundOpacity, editorForeground } from '../../../../platform/theme/common/colorRegistry.js';
import { Selection } from '../../../common/core/selection.js';
import { EventType, Gesture } from '../../../../base/browser/touch.js';
import { MinimapCharRendererFactory } from './minimapCharRendererFactory.js';
import { createSingleCallFunction } from '../../../../base/common/functional.js';
import { LRUCache } from '../../../../base/common/map.js';
import { DEFAULT_FONT_FAMILY } from '../../../../base/browser/fonts.js';
/**
 * The orthogonal distance to the slider at which dragging "resets". This implements "snapping"
 */
const POINTER_DRAG_RESET_DISTANCE = 140;
const GUTTER_DECORATION_WIDTH = 2;
class MinimapOptions {
    constructor(configuration, theme, tokensColorTracker) {
        const options = configuration.options;
        const pixelRatio = options.get(149 /* EditorOption.pixelRatio */);
        const layoutInfo = options.get(151 /* EditorOption.layoutInfo */);
        const minimapLayout = layoutInfo.minimap;
        const fontInfo = options.get(52 /* EditorOption.fontInfo */);
        const minimapOpts = options.get(74 /* EditorOption.minimap */);
        this.renderMinimap = minimapLayout.renderMinimap;
        this.size = minimapOpts.size;
        this.minimapHeightIsEditorHeight = minimapLayout.minimapHeightIsEditorHeight;
        this.scrollBeyondLastLine = options.get(110 /* EditorOption.scrollBeyondLastLine */);
        this.paddingTop = options.get(88 /* EditorOption.padding */).top;
        this.paddingBottom = options.get(88 /* EditorOption.padding */).bottom;
        this.showSlider = minimapOpts.showSlider;
        this.autohide = minimapOpts.autohide;
        this.pixelRatio = pixelRatio;
        this.typicalHalfwidthCharacterWidth = fontInfo.typicalHalfwidthCharacterWidth;
        this.lineHeight = options.get(68 /* EditorOption.lineHeight */);
        this.minimapLeft = minimapLayout.minimapLeft;
        this.minimapWidth = minimapLayout.minimapWidth;
        this.minimapHeight = layoutInfo.height;
        this.canvasInnerWidth = minimapLayout.minimapCanvasInnerWidth;
        this.canvasInnerHeight = minimapLayout.minimapCanvasInnerHeight;
        this.canvasOuterWidth = minimapLayout.minimapCanvasOuterWidth;
        this.canvasOuterHeight = minimapLayout.minimapCanvasOuterHeight;
        this.isSampling = minimapLayout.minimapIsSampling;
        this.editorHeight = layoutInfo.height;
        this.fontScale = minimapLayout.minimapScale;
        this.minimapLineHeight = minimapLayout.minimapLineHeight;
        this.minimapCharWidth = 1 /* Constants.BASE_CHAR_WIDTH */ * this.fontScale;
        this.sectionHeaderFontFamily = DEFAULT_FONT_FAMILY;
        this.sectionHeaderFontSize = minimapOpts.sectionHeaderFontSize * pixelRatio;
        this.sectionHeaderLetterSpacing = minimapOpts.sectionHeaderLetterSpacing; // intentionally not multiplying by pixelRatio
        this.sectionHeaderFontColor = MinimapOptions._getSectionHeaderColor(theme, tokensColorTracker.getColor(1 /* ColorId.DefaultForeground */));
        this.charRenderer = createSingleCallFunction(() => MinimapCharRendererFactory.create(this.fontScale, fontInfo.fontFamily));
        this.defaultBackgroundColor = tokensColorTracker.getColor(2 /* ColorId.DefaultBackground */);
        this.backgroundColor = MinimapOptions._getMinimapBackground(theme, this.defaultBackgroundColor);
        this.foregroundAlpha = MinimapOptions._getMinimapForegroundOpacity(theme);
    }
    static _getMinimapBackground(theme, defaultBackgroundColor) {
        const themeColor = theme.getColor(minimapBackground);
        if (themeColor) {
            return new RGBA8(themeColor.rgba.r, themeColor.rgba.g, themeColor.rgba.b, Math.round(255 * themeColor.rgba.a));
        }
        return defaultBackgroundColor;
    }
    static _getMinimapForegroundOpacity(theme) {
        const themeColor = theme.getColor(minimapForegroundOpacity);
        if (themeColor) {
            return RGBA8._clamp(Math.round(255 * themeColor.rgba.a));
        }
        return 255;
    }
    static _getSectionHeaderColor(theme, defaultForegroundColor) {
        const themeColor = theme.getColor(editorForeground);
        if (themeColor) {
            return new RGBA8(themeColor.rgba.r, themeColor.rgba.g, themeColor.rgba.b, Math.round(255 * themeColor.rgba.a));
        }
        return defaultForegroundColor;
    }
    equals(other) {
        return (this.renderMinimap === other.renderMinimap
            && this.size === other.size
            && this.minimapHeightIsEditorHeight === other.minimapHeightIsEditorHeight
            && this.scrollBeyondLastLine === other.scrollBeyondLastLine
            && this.paddingTop === other.paddingTop
            && this.paddingBottom === other.paddingBottom
            && this.showSlider === other.showSlider
            && this.autohide === other.autohide
            && this.pixelRatio === other.pixelRatio
            && this.typicalHalfwidthCharacterWidth === other.typicalHalfwidthCharacterWidth
            && this.lineHeight === other.lineHeight
            && this.minimapLeft === other.minimapLeft
            && this.minimapWidth === other.minimapWidth
            && this.minimapHeight === other.minimapHeight
            && this.canvasInnerWidth === other.canvasInnerWidth
            && this.canvasInnerHeight === other.canvasInnerHeight
            && this.canvasOuterWidth === other.canvasOuterWidth
            && this.canvasOuterHeight === other.canvasOuterHeight
            && this.isSampling === other.isSampling
            && this.editorHeight === other.editorHeight
            && this.fontScale === other.fontScale
            && this.minimapLineHeight === other.minimapLineHeight
            && this.minimapCharWidth === other.minimapCharWidth
            && this.sectionHeaderFontSize === other.sectionHeaderFontSize
            && this.sectionHeaderLetterSpacing === other.sectionHeaderLetterSpacing
            && this.defaultBackgroundColor && this.defaultBackgroundColor.equals(other.defaultBackgroundColor)
            && this.backgroundColor && this.backgroundColor.equals(other.backgroundColor)
            && this.foregroundAlpha === other.foregroundAlpha);
    }
}
class MinimapLayout {
    constructor(
    /**
     * The given editor scrollTop (input).
     */
    scrollTop, 
    /**
     * The given editor scrollHeight (input).
     */
    scrollHeight, sliderNeeded, _computedSliderRatio, 
    /**
     * slider dom node top (in CSS px)
     */
    sliderTop, 
    /**
     * slider dom node height (in CSS px)
     */
    sliderHeight, 
    /**
     * empty lines to reserve at the top of the minimap.
     */
    topPaddingLineCount, 
    /**
     * minimap render start line number.
     */
    startLineNumber, 
    /**
     * minimap render end line number.
     */
    endLineNumber) {
        this.scrollTop = scrollTop;
        this.scrollHeight = scrollHeight;
        this.sliderNeeded = sliderNeeded;
        this._computedSliderRatio = _computedSliderRatio;
        this.sliderTop = sliderTop;
        this.sliderHeight = sliderHeight;
        this.topPaddingLineCount = topPaddingLineCount;
        this.startLineNumber = startLineNumber;
        this.endLineNumber = endLineNumber;
    }
    /**
     * Compute a desired `scrollPosition` such that the slider moves by `delta`.
     */
    getDesiredScrollTopFromDelta(delta) {
        return Math.round(this.scrollTop + delta / this._computedSliderRatio);
    }
    getDesiredScrollTopFromTouchLocation(pageY) {
        return Math.round((pageY - this.sliderHeight / 2) / this._computedSliderRatio);
    }
    /**
     * Intersect a line range with `this.startLineNumber` and `this.endLineNumber`.
     */
    intersectWithViewport(range) {
        const startLineNumber = Math.max(this.startLineNumber, range.startLineNumber);
        const endLineNumber = Math.min(this.endLineNumber, range.endLineNumber);
        if (startLineNumber > endLineNumber) {
            // entirely outside minimap's viewport
            return null;
        }
        return [startLineNumber, endLineNumber];
    }
    /**
     * Get the inner minimap y coordinate for a line number.
     */
    getYForLineNumber(lineNumber, minimapLineHeight) {
        return +(lineNumber - this.startLineNumber + this.topPaddingLineCount) * minimapLineHeight;
    }
    static create(options, viewportStartLineNumber, viewportEndLineNumber, viewportStartLineNumberVerticalOffset, viewportHeight, viewportContainsWhitespaceGaps, lineCount, realLineCount, scrollTop, scrollHeight, previousLayout) {
        const pixelRatio = options.pixelRatio;
        const minimapLineHeight = options.minimapLineHeight;
        const minimapLinesFitting = Math.floor(options.canvasInnerHeight / minimapLineHeight);
        const lineHeight = options.lineHeight;
        if (options.minimapHeightIsEditorHeight) {
            let logicalScrollHeight = (realLineCount * options.lineHeight
                + options.paddingTop
                + options.paddingBottom);
            if (options.scrollBeyondLastLine) {
                logicalScrollHeight += Math.max(0, viewportHeight - options.lineHeight - options.paddingBottom);
            }
            const sliderHeight = Math.max(1, Math.floor(viewportHeight * viewportHeight / logicalScrollHeight));
            const maxMinimapSliderTop = Math.max(0, options.minimapHeight - sliderHeight);
            // The slider can move from 0 to `maxMinimapSliderTop`
            // in the same way `scrollTop` can move from 0 to `scrollHeight` - `viewportHeight`.
            const computedSliderRatio = (maxMinimapSliderTop) / (scrollHeight - viewportHeight);
            const sliderTop = (scrollTop * computedSliderRatio);
            const sliderNeeded = (maxMinimapSliderTop > 0);
            const maxLinesFitting = Math.floor(options.canvasInnerHeight / options.minimapLineHeight);
            const topPaddingLineCount = Math.floor(options.paddingTop / options.lineHeight);
            return new MinimapLayout(scrollTop, scrollHeight, sliderNeeded, computedSliderRatio, sliderTop, sliderHeight, topPaddingLineCount, 1, Math.min(lineCount, maxLinesFitting));
        }
        // The visible line count in a viewport can change due to a number of reasons:
        //  a) with the same viewport width, different scroll positions can result in partial lines being visible:
        //    e.g. for a line height of 20, and a viewport height of 600
        //          * scrollTop = 0  => visible lines are [1, 30]
        //          * scrollTop = 10 => visible lines are [1, 31] (with lines 1 and 31 partially visible)
        //          * scrollTop = 20 => visible lines are [2, 31]
        //  b) whitespace gaps might make their way in the viewport (which results in a decrease in the visible line count)
        //  c) we could be in the scroll beyond last line case (which also results in a decrease in the visible line count, down to possibly only one line being visible)
        // We must first establish a desirable slider height.
        let sliderHeight;
        if (viewportContainsWhitespaceGaps && viewportEndLineNumber !== lineCount) {
            // case b) from above: there are whitespace gaps in the viewport.
            // In this case, the height of the slider directly reflects the visible line count.
            const viewportLineCount = viewportEndLineNumber - viewportStartLineNumber + 1;
            sliderHeight = Math.floor(viewportLineCount * minimapLineHeight / pixelRatio);
        }
        else {
            // The slider has a stable height
            const expectedViewportLineCount = viewportHeight / lineHeight;
            sliderHeight = Math.floor(expectedViewportLineCount * minimapLineHeight / pixelRatio);
        }
        const extraLinesAtTheTop = Math.floor(options.paddingTop / lineHeight);
        let extraLinesAtTheBottom = Math.floor(options.paddingBottom / lineHeight);
        if (options.scrollBeyondLastLine) {
            const expectedViewportLineCount = viewportHeight / lineHeight;
            extraLinesAtTheBottom = Math.max(extraLinesAtTheBottom, expectedViewportLineCount - 1);
        }
        let maxMinimapSliderTop;
        if (extraLinesAtTheBottom > 0) {
            const expectedViewportLineCount = viewportHeight / lineHeight;
            // The minimap slider, when dragged all the way down, will contain the last line at its top
            maxMinimapSliderTop = (extraLinesAtTheTop + lineCount + extraLinesAtTheBottom - expectedViewportLineCount - 1) * minimapLineHeight / pixelRatio;
        }
        else {
            // The minimap slider, when dragged all the way down, will contain the last line at its bottom
            maxMinimapSliderTop = Math.max(0, (extraLinesAtTheTop + lineCount) * minimapLineHeight / pixelRatio - sliderHeight);
        }
        maxMinimapSliderTop = Math.min(options.minimapHeight - sliderHeight, maxMinimapSliderTop);
        // The slider can move from 0 to `maxMinimapSliderTop`
        // in the same way `scrollTop` can move from 0 to `scrollHeight` - `viewportHeight`.
        const computedSliderRatio = (maxMinimapSliderTop) / (scrollHeight - viewportHeight);
        const sliderTop = (scrollTop * computedSliderRatio);
        if (minimapLinesFitting >= extraLinesAtTheTop + lineCount + extraLinesAtTheBottom) {
            // All lines fit in the minimap
            const sliderNeeded = (maxMinimapSliderTop > 0);
            return new MinimapLayout(scrollTop, scrollHeight, sliderNeeded, computedSliderRatio, sliderTop, sliderHeight, extraLinesAtTheTop, 1, lineCount);
        }
        else {
            let consideringStartLineNumber;
            if (viewportStartLineNumber > 1) {
                consideringStartLineNumber = viewportStartLineNumber + extraLinesAtTheTop;
            }
            else {
                consideringStartLineNumber = Math.max(1, scrollTop / lineHeight);
            }
            let topPaddingLineCount;
            let startLineNumber = Math.max(1, Math.floor(consideringStartLineNumber - sliderTop * pixelRatio / minimapLineHeight));
            if (startLineNumber < extraLinesAtTheTop) {
                topPaddingLineCount = extraLinesAtTheTop - startLineNumber + 1;
                startLineNumber = 1;
            }
            else {
                topPaddingLineCount = 0;
                startLineNumber = Math.max(1, startLineNumber - extraLinesAtTheTop);
            }
            // Avoid flickering caused by a partial viewport start line
            // by being consistent w.r.t. the previous layout decision
            if (previousLayout && previousLayout.scrollHeight === scrollHeight) {
                if (previousLayout.scrollTop > scrollTop) {
                    // Scrolling up => never increase `startLineNumber`
                    startLineNumber = Math.min(startLineNumber, previousLayout.startLineNumber);
                    topPaddingLineCount = Math.max(topPaddingLineCount, previousLayout.topPaddingLineCount);
                }
                if (previousLayout.scrollTop < scrollTop) {
                    // Scrolling down => never decrease `startLineNumber`
                    startLineNumber = Math.max(startLineNumber, previousLayout.startLineNumber);
                    topPaddingLineCount = Math.min(topPaddingLineCount, previousLayout.topPaddingLineCount);
                }
            }
            const endLineNumber = Math.min(lineCount, startLineNumber - topPaddingLineCount + minimapLinesFitting - 1);
            const partialLine = (scrollTop - viewportStartLineNumberVerticalOffset) / lineHeight;
            let sliderTopAligned;
            if (scrollTop >= options.paddingTop) {
                sliderTopAligned = (viewportStartLineNumber - startLineNumber + topPaddingLineCount + partialLine) * minimapLineHeight / pixelRatio;
            }
            else {
                sliderTopAligned = (scrollTop / options.paddingTop) * (topPaddingLineCount + partialLine) * minimapLineHeight / pixelRatio;
            }
            return new MinimapLayout(scrollTop, scrollHeight, true, computedSliderRatio, sliderTopAligned, sliderHeight, topPaddingLineCount, startLineNumber, endLineNumber);
        }
    }
}
class MinimapLine {
    static { this.INVALID = new MinimapLine(-1); }
    constructor(dy) {
        this.dy = dy;
    }
    onContentChanged() {
        this.dy = -1;
    }
    onTokensChanged() {
        this.dy = -1;
    }
}
class RenderData {
    constructor(renderedLayout, imageData, lines) {
        this.renderedLayout = renderedLayout;
        this._imageData = imageData;
        this._renderedLines = new RenderedLinesCollection({
            createLine: () => MinimapLine.INVALID
        });
        this._renderedLines._set(renderedLayout.startLineNumber, lines);
    }
    /**
     * Check if the current RenderData matches accurately the new desired layout and no painting is needed.
     */
    linesEquals(layout) {
        if (!this.scrollEquals(layout)) {
            return false;
        }
        const tmp = this._renderedLines._get();
        const lines = tmp.lines;
        for (let i = 0, len = lines.length; i < len; i++) {
            if (lines[i].dy === -1) {
                // This line is invalid
                return false;
            }
        }
        return true;
    }
    /**
     * Check if the current RenderData matches the new layout's scroll position
     */
    scrollEquals(layout) {
        return this.renderedLayout.startLineNumber === layout.startLineNumber
            && this.renderedLayout.endLineNumber === layout.endLineNumber;
    }
    _get() {
        const tmp = this._renderedLines._get();
        return {
            imageData: this._imageData,
            rendLineNumberStart: tmp.rendLineNumberStart,
            lines: tmp.lines
        };
    }
    onLinesChanged(changeFromLineNumber, changeCount) {
        return this._renderedLines.onLinesChanged(changeFromLineNumber, changeCount);
    }
    onLinesDeleted(deleteFromLineNumber, deleteToLineNumber) {
        this._renderedLines.onLinesDeleted(deleteFromLineNumber, deleteToLineNumber);
    }
    onLinesInserted(insertFromLineNumber, insertToLineNumber) {
        this._renderedLines.onLinesInserted(insertFromLineNumber, insertToLineNumber);
    }
    onTokensChanged(ranges) {
        return this._renderedLines.onTokensChanged(ranges);
    }
}
/**
 * Some sort of double buffering.
 *
 * Keeps two buffers around that will be rotated for painting.
 * Always gives a buffer that is filled with the background color.
 */
class MinimapBuffers {
    constructor(ctx, WIDTH, HEIGHT, background) {
        this._backgroundFillData = MinimapBuffers._createBackgroundFillData(WIDTH, HEIGHT, background);
        this._buffers = [
            ctx.createImageData(WIDTH, HEIGHT),
            ctx.createImageData(WIDTH, HEIGHT)
        ];
        this._lastUsedBuffer = 0;
    }
    getBuffer() {
        // rotate buffers
        this._lastUsedBuffer = 1 - this._lastUsedBuffer;
        const result = this._buffers[this._lastUsedBuffer];
        // fill with background color
        result.data.set(this._backgroundFillData);
        return result;
    }
    static _createBackgroundFillData(WIDTH, HEIGHT, background) {
        const backgroundR = background.r;
        const backgroundG = background.g;
        const backgroundB = background.b;
        const backgroundA = background.a;
        const result = new Uint8ClampedArray(WIDTH * HEIGHT * 4);
        let offset = 0;
        for (let i = 0; i < HEIGHT; i++) {
            for (let j = 0; j < WIDTH; j++) {
                result[offset] = backgroundR;
                result[offset + 1] = backgroundG;
                result[offset + 2] = backgroundB;
                result[offset + 3] = backgroundA;
                offset += 4;
            }
        }
        return result;
    }
}
class MinimapSamplingState {
    static compute(options, viewLineCount, oldSamplingState) {
        if (options.renderMinimap === 0 /* RenderMinimap.None */ || !options.isSampling) {
            return [null, []];
        }
        // ratio is intentionally not part of the layout to avoid the layout changing all the time
        // so we need to recompute it again...
        const { minimapLineCount } = EditorLayoutInfoComputer.computeContainedMinimapLineCount({
            viewLineCount: viewLineCount,
            scrollBeyondLastLine: options.scrollBeyondLastLine,
            paddingTop: options.paddingTop,
            paddingBottom: options.paddingBottom,
            height: options.editorHeight,
            lineHeight: options.lineHeight,
            pixelRatio: options.pixelRatio
        });
        const ratio = viewLineCount / minimapLineCount;
        const halfRatio = ratio / 2;
        if (!oldSamplingState || oldSamplingState.minimapLines.length === 0) {
            const result = [];
            result[0] = 1;
            if (minimapLineCount > 1) {
                for (let i = 0, lastIndex = minimapLineCount - 1; i < lastIndex; i++) {
                    result[i] = Math.round(i * ratio + halfRatio);
                }
                result[minimapLineCount - 1] = viewLineCount;
            }
            return [new MinimapSamplingState(ratio, result), []];
        }
        const oldMinimapLines = oldSamplingState.minimapLines;
        const oldLength = oldMinimapLines.length;
        const result = [];
        let oldIndex = 0;
        let oldDeltaLineCount = 0;
        let minViewLineNumber = 1;
        const MAX_EVENT_COUNT = 10; // generate at most 10 events, if there are more than 10 changes, just flush all previous data
        let events = [];
        let lastEvent = null;
        for (let i = 0; i < minimapLineCount; i++) {
            const fromViewLineNumber = Math.max(minViewLineNumber, Math.round(i * ratio));
            const toViewLineNumber = Math.max(fromViewLineNumber, Math.round((i + 1) * ratio));
            while (oldIndex < oldLength && oldMinimapLines[oldIndex] < fromViewLineNumber) {
                if (events.length < MAX_EVENT_COUNT) {
                    const oldMinimapLineNumber = oldIndex + 1 + oldDeltaLineCount;
                    if (lastEvent && lastEvent.type === 'deleted' && lastEvent._oldIndex === oldIndex - 1) {
                        lastEvent.deleteToLineNumber++;
                    }
                    else {
                        lastEvent = { type: 'deleted', _oldIndex: oldIndex, deleteFromLineNumber: oldMinimapLineNumber, deleteToLineNumber: oldMinimapLineNumber };
                        events.push(lastEvent);
                    }
                    oldDeltaLineCount--;
                }
                oldIndex++;
            }
            let selectedViewLineNumber;
            if (oldIndex < oldLength && oldMinimapLines[oldIndex] <= toViewLineNumber) {
                // reuse the old sampled line
                selectedViewLineNumber = oldMinimapLines[oldIndex];
                oldIndex++;
            }
            else {
                if (i === 0) {
                    selectedViewLineNumber = 1;
                }
                else if (i + 1 === minimapLineCount) {
                    selectedViewLineNumber = viewLineCount;
                }
                else {
                    selectedViewLineNumber = Math.round(i * ratio + halfRatio);
                }
                if (events.length < MAX_EVENT_COUNT) {
                    const oldMinimapLineNumber = oldIndex + 1 + oldDeltaLineCount;
                    if (lastEvent && lastEvent.type === 'inserted' && lastEvent._i === i - 1) {
                        lastEvent.insertToLineNumber++;
                    }
                    else {
                        lastEvent = { type: 'inserted', _i: i, insertFromLineNumber: oldMinimapLineNumber, insertToLineNumber: oldMinimapLineNumber };
                        events.push(lastEvent);
                    }
                    oldDeltaLineCount++;
                }
            }
            result[i] = selectedViewLineNumber;
            minViewLineNumber = selectedViewLineNumber;
        }
        if (events.length < MAX_EVENT_COUNT) {
            while (oldIndex < oldLength) {
                const oldMinimapLineNumber = oldIndex + 1 + oldDeltaLineCount;
                if (lastEvent && lastEvent.type === 'deleted' && lastEvent._oldIndex === oldIndex - 1) {
                    lastEvent.deleteToLineNumber++;
                }
                else {
                    lastEvent = { type: 'deleted', _oldIndex: oldIndex, deleteFromLineNumber: oldMinimapLineNumber, deleteToLineNumber: oldMinimapLineNumber };
                    events.push(lastEvent);
                }
                oldDeltaLineCount--;
                oldIndex++;
            }
        }
        else {
            // too many events, just give up
            events = [{ type: 'flush' }];
        }
        return [new MinimapSamplingState(ratio, result), events];
    }
    constructor(samplingRatio, minimapLines // a map of 0-based minimap line indexes to 1-based view line numbers
    ) {
        this.samplingRatio = samplingRatio;
        this.minimapLines = minimapLines;
    }
    modelLineToMinimapLine(lineNumber) {
        return Math.min(this.minimapLines.length, Math.max(1, Math.round(lineNumber / this.samplingRatio)));
    }
    /**
     * Will return null if the model line ranges are not intersecting with a sampled model line.
     */
    modelLineRangeToMinimapLineRange(fromLineNumber, toLineNumber) {
        let fromLineIndex = this.modelLineToMinimapLine(fromLineNumber) - 1;
        while (fromLineIndex > 0 && this.minimapLines[fromLineIndex - 1] >= fromLineNumber) {
            fromLineIndex--;
        }
        let toLineIndex = this.modelLineToMinimapLine(toLineNumber) - 1;
        while (toLineIndex + 1 < this.minimapLines.length && this.minimapLines[toLineIndex + 1] <= toLineNumber) {
            toLineIndex++;
        }
        if (fromLineIndex === toLineIndex) {
            const sampledLineNumber = this.minimapLines[fromLineIndex];
            if (sampledLineNumber < fromLineNumber || sampledLineNumber > toLineNumber) {
                // This line is not part of the sampled lines ==> nothing to do
                return null;
            }
        }
        return [fromLineIndex + 1, toLineIndex + 1];
    }
    /**
     * Will always return a range, even if it is not intersecting with a sampled model line.
     */
    decorationLineRangeToMinimapLineRange(startLineNumber, endLineNumber) {
        let minimapLineStart = this.modelLineToMinimapLine(startLineNumber);
        let minimapLineEnd = this.modelLineToMinimapLine(endLineNumber);
        if (startLineNumber !== endLineNumber && minimapLineEnd === minimapLineStart) {
            if (minimapLineEnd === this.minimapLines.length) {
                if (minimapLineStart > 1) {
                    minimapLineStart--;
                }
            }
            else {
                minimapLineEnd++;
            }
        }
        return [minimapLineStart, minimapLineEnd];
    }
    onLinesDeleted(e) {
        // have the mapping be sticky
        const deletedLineCount = e.toLineNumber - e.fromLineNumber + 1;
        let changeStartIndex = this.minimapLines.length;
        let changeEndIndex = 0;
        for (let i = this.minimapLines.length - 1; i >= 0; i--) {
            if (this.minimapLines[i] < e.fromLineNumber) {
                break;
            }
            if (this.minimapLines[i] <= e.toLineNumber) {
                // this line got deleted => move to previous available
                this.minimapLines[i] = Math.max(1, e.fromLineNumber - 1);
                changeStartIndex = Math.min(changeStartIndex, i);
                changeEndIndex = Math.max(changeEndIndex, i);
            }
            else {
                this.minimapLines[i] -= deletedLineCount;
            }
        }
        return [changeStartIndex, changeEndIndex];
    }
    onLinesInserted(e) {
        // have the mapping be sticky
        const insertedLineCount = e.toLineNumber - e.fromLineNumber + 1;
        for (let i = this.minimapLines.length - 1; i >= 0; i--) {
            if (this.minimapLines[i] < e.fromLineNumber) {
                break;
            }
            this.minimapLines[i] += insertedLineCount;
        }
    }
}
/**
 * The minimap appears beside the editor scroll bar and visualizes a zoomed out
 * view of the file.
 */
export class Minimap extends ViewPart {
    constructor(context) {
        super(context);
        this._sectionHeaderCache = new LRUCache(10, 1.5);
        this.tokensColorTracker = MinimapTokensColorTracker.getInstance();
        this._selections = [];
        this._minimapSelections = null;
        this.options = new MinimapOptions(this._context.configuration, this._context.theme, this.tokensColorTracker);
        const [samplingState,] = MinimapSamplingState.compute(this.options, this._context.viewModel.getLineCount(), null);
        this._samplingState = samplingState;
        this._shouldCheckSampling = false;
        this._actual = new InnerMinimap(context.theme, this);
    }
    dispose() {
        this._actual.dispose();
        super.dispose();
    }
    getDomNode() {
        return this._actual.getDomNode();
    }
    _onOptionsMaybeChanged() {
        const opts = new MinimapOptions(this._context.configuration, this._context.theme, this.tokensColorTracker);
        if (this.options.equals(opts)) {
            return false;
        }
        this.options = opts;
        this._recreateLineSampling();
        this._actual.onDidChangeOptions();
        return true;
    }
    // ---- begin view event handlers
    onConfigurationChanged(e) {
        return this._onOptionsMaybeChanged();
    }
    onCursorStateChanged(e) {
        this._selections = e.selections;
        this._minimapSelections = null;
        return this._actual.onSelectionChanged();
    }
    onDecorationsChanged(e) {
        if (e.affectsMinimap) {
            return this._actual.onDecorationsChanged();
        }
        return false;
    }
    onFlushed(e) {
        if (this._samplingState) {
            this._shouldCheckSampling = true;
        }
        return this._actual.onFlushed();
    }
    onLinesChanged(e) {
        if (this._samplingState) {
            const minimapLineRange = this._samplingState.modelLineRangeToMinimapLineRange(e.fromLineNumber, e.fromLineNumber + e.count - 1);
            if (minimapLineRange) {
                return this._actual.onLinesChanged(minimapLineRange[0], minimapLineRange[1] - minimapLineRange[0] + 1);
            }
            else {
                return false;
            }
        }
        else {
            return this._actual.onLinesChanged(e.fromLineNumber, e.count);
        }
    }
    onLinesDeleted(e) {
        if (this._samplingState) {
            const [changeStartIndex, changeEndIndex] = this._samplingState.onLinesDeleted(e);
            if (changeStartIndex <= changeEndIndex) {
                this._actual.onLinesChanged(changeStartIndex + 1, changeEndIndex - changeStartIndex + 1);
            }
            this._shouldCheckSampling = true;
            return true;
        }
        else {
            return this._actual.onLinesDeleted(e.fromLineNumber, e.toLineNumber);
        }
    }
    onLinesInserted(e) {
        if (this._samplingState) {
            this._samplingState.onLinesInserted(e);
            this._shouldCheckSampling = true;
            return true;
        }
        else {
            return this._actual.onLinesInserted(e.fromLineNumber, e.toLineNumber);
        }
    }
    onScrollChanged(e) {
        return this._actual.onScrollChanged();
    }
    onThemeChanged(e) {
        this._actual.onThemeChanged();
        this._onOptionsMaybeChanged();
        return true;
    }
    onTokensChanged(e) {
        if (this._samplingState) {
            const ranges = [];
            for (const range of e.ranges) {
                const minimapLineRange = this._samplingState.modelLineRangeToMinimapLineRange(range.fromLineNumber, range.toLineNumber);
                if (minimapLineRange) {
                    ranges.push({ fromLineNumber: minimapLineRange[0], toLineNumber: minimapLineRange[1] });
                }
            }
            if (ranges.length) {
                return this._actual.onTokensChanged(ranges);
            }
            else {
                return false;
            }
        }
        else {
            return this._actual.onTokensChanged(e.ranges);
        }
    }
    onTokensColorsChanged(e) {
        this._onOptionsMaybeChanged();
        return this._actual.onTokensColorsChanged();
    }
    onZonesChanged(e) {
        return this._actual.onZonesChanged();
    }
    // --- end event handlers
    prepareRender(ctx) {
        if (this._shouldCheckSampling) {
            this._shouldCheckSampling = false;
            this._recreateLineSampling();
        }
    }
    render(ctx) {
        let viewportStartLineNumber = ctx.visibleRange.startLineNumber;
        let viewportEndLineNumber = ctx.visibleRange.endLineNumber;
        if (this._samplingState) {
            viewportStartLineNumber = this._samplingState.modelLineToMinimapLine(viewportStartLineNumber);
            viewportEndLineNumber = this._samplingState.modelLineToMinimapLine(viewportEndLineNumber);
        }
        const minimapCtx = {
            viewportContainsWhitespaceGaps: (ctx.viewportData.whitespaceViewportData.length > 0),
            scrollWidth: ctx.scrollWidth,
            scrollHeight: ctx.scrollHeight,
            viewportStartLineNumber: viewportStartLineNumber,
            viewportEndLineNumber: viewportEndLineNumber,
            viewportStartLineNumberVerticalOffset: ctx.getVerticalOffsetForLineNumber(viewportStartLineNumber),
            scrollTop: ctx.scrollTop,
            scrollLeft: ctx.scrollLeft,
            viewportWidth: ctx.viewportWidth,
            viewportHeight: ctx.viewportHeight,
        };
        this._actual.render(minimapCtx);
    }
    //#region IMinimapModel
    _recreateLineSampling() {
        this._minimapSelections = null;
        const wasSampling = Boolean(this._samplingState);
        const [samplingState, events] = MinimapSamplingState.compute(this.options, this._context.viewModel.getLineCount(), this._samplingState);
        this._samplingState = samplingState;
        if (wasSampling && this._samplingState) {
            // was sampling, is sampling
            for (const event of events) {
                switch (event.type) {
                    case 'deleted':
                        this._actual.onLinesDeleted(event.deleteFromLineNumber, event.deleteToLineNumber);
                        break;
                    case 'inserted':
                        this._actual.onLinesInserted(event.insertFromLineNumber, event.insertToLineNumber);
                        break;
                    case 'flush':
                        this._actual.onFlushed();
                        break;
                }
            }
        }
    }
    getLineCount() {
        if (this._samplingState) {
            return this._samplingState.minimapLines.length;
        }
        return this._context.viewModel.getLineCount();
    }
    getRealLineCount() {
        return this._context.viewModel.getLineCount();
    }
    getLineContent(lineNumber) {
        if (this._samplingState) {
            return this._context.viewModel.getLineContent(this._samplingState.minimapLines[lineNumber - 1]);
        }
        return this._context.viewModel.getLineContent(lineNumber);
    }
    getLineMaxColumn(lineNumber) {
        if (this._samplingState) {
            return this._context.viewModel.getLineMaxColumn(this._samplingState.minimapLines[lineNumber - 1]);
        }
        return this._context.viewModel.getLineMaxColumn(lineNumber);
    }
    getMinimapLinesRenderingData(startLineNumber, endLineNumber, needed) {
        if (this._samplingState) {
            const result = [];
            for (let lineIndex = 0, lineCount = endLineNumber - startLineNumber + 1; lineIndex < lineCount; lineIndex++) {
                if (needed[lineIndex]) {
                    result[lineIndex] = this._context.viewModel.getViewLineData(this._samplingState.minimapLines[startLineNumber + lineIndex - 1]);
                }
                else {
                    result[lineIndex] = null;
                }
            }
            return result;
        }
        return this._context.viewModel.getMinimapLinesRenderingData(startLineNumber, endLineNumber, needed).data;
    }
    getSelections() {
        if (this._minimapSelections === null) {
            if (this._samplingState) {
                this._minimapSelections = [];
                for (const selection of this._selections) {
                    const [minimapLineStart, minimapLineEnd] = this._samplingState.decorationLineRangeToMinimapLineRange(selection.startLineNumber, selection.endLineNumber);
                    this._minimapSelections.push(new Selection(minimapLineStart, selection.startColumn, minimapLineEnd, selection.endColumn));
                }
            }
            else {
                this._minimapSelections = this._selections;
            }
        }
        return this._minimapSelections;
    }
    getMinimapDecorationsInViewport(startLineNumber, endLineNumber) {
        return this._getMinimapDecorationsInViewport(startLineNumber, endLineNumber)
            .filter(decoration => !decoration.options.minimap?.sectionHeaderStyle);
    }
    getSectionHeaderDecorationsInViewport(startLineNumber, endLineNumber) {
        const headerHeightInMinimapLines = this.options.sectionHeaderFontSize / this.options.minimapLineHeight;
        startLineNumber = Math.floor(Math.max(1, startLineNumber - headerHeightInMinimapLines));
        return this._getMinimapDecorationsInViewport(startLineNumber, endLineNumber)
            .filter(decoration => !!decoration.options.minimap?.sectionHeaderStyle);
    }
    _getMinimapDecorationsInViewport(startLineNumber, endLineNumber) {
        let visibleRange;
        if (this._samplingState) {
            const modelStartLineNumber = this._samplingState.minimapLines[startLineNumber - 1];
            const modelEndLineNumber = this._samplingState.minimapLines[endLineNumber - 1];
            visibleRange = new Range(modelStartLineNumber, 1, modelEndLineNumber, this._context.viewModel.getLineMaxColumn(modelEndLineNumber));
        }
        else {
            visibleRange = new Range(startLineNumber, 1, endLineNumber, this._context.viewModel.getLineMaxColumn(endLineNumber));
        }
        const decorations = this._context.viewModel.getMinimapDecorationsInRange(visibleRange);
        if (this._samplingState) {
            const result = [];
            for (const decoration of decorations) {
                if (!decoration.options.minimap) {
                    continue;
                }
                const range = decoration.range;
                const minimapStartLineNumber = this._samplingState.modelLineToMinimapLine(range.startLineNumber);
                const minimapEndLineNumber = this._samplingState.modelLineToMinimapLine(range.endLineNumber);
                result.push(new ViewModelDecoration(new Range(minimapStartLineNumber, range.startColumn, minimapEndLineNumber, range.endColumn), decoration.options));
            }
            return result;
        }
        return decorations;
    }
    getSectionHeaderText(decoration, fitWidth) {
        const headerText = decoration.options.minimap?.sectionHeaderText;
        if (!headerText) {
            return null;
        }
        const cachedText = this._sectionHeaderCache.get(headerText);
        if (cachedText) {
            return cachedText;
        }
        const fittedText = fitWidth(headerText);
        this._sectionHeaderCache.set(headerText, fittedText);
        return fittedText;
    }
    getOptions() {
        return this._context.viewModel.model.getOptions();
    }
    revealLineNumber(lineNumber) {
        if (this._samplingState) {
            lineNumber = this._samplingState.minimapLines[lineNumber - 1];
        }
        this._context.viewModel.revealRange('mouse', false, new Range(lineNumber, 1, lineNumber, 1), 1 /* viewEvents.VerticalRevealType.Center */, 0 /* ScrollType.Smooth */);
    }
    setScrollTop(scrollTop) {
        this._context.viewModel.viewLayout.setScrollPosition({
            scrollTop: scrollTop
        }, 1 /* ScrollType.Immediate */);
    }
}
class InnerMinimap extends Disposable {
    constructor(theme, model) {
        super();
        this._renderDecorations = false;
        this._gestureInProgress = false;
        this._theme = theme;
        this._model = model;
        this._lastRenderData = null;
        this._buffers = null;
        this._selectionColor = this._theme.getColor(minimapSelection);
        this._domNode = createFastDomNode(document.createElement('div'));
        PartFingerprints.write(this._domNode, 9 /* PartFingerprint.Minimap */);
        this._domNode.setClassName(this._getMinimapDomNodeClassName());
        this._domNode.setPosition('absolute');
        this._domNode.setAttribute('role', 'presentation');
        this._domNode.setAttribute('aria-hidden', 'true');
        this._shadow = createFastDomNode(document.createElement('div'));
        this._shadow.setClassName('minimap-shadow-hidden');
        this._domNode.appendChild(this._shadow);
        this._canvas = createFastDomNode(document.createElement('canvas'));
        this._canvas.setPosition('absolute');
        this._canvas.setLeft(0);
        this._domNode.appendChild(this._canvas);
        this._decorationsCanvas = createFastDomNode(document.createElement('canvas'));
        this._decorationsCanvas.setPosition('absolute');
        this._decorationsCanvas.setClassName('minimap-decorations-layer');
        this._decorationsCanvas.setLeft(0);
        this._domNode.appendChild(this._decorationsCanvas);
        this._slider = createFastDomNode(document.createElement('div'));
        this._slider.setPosition('absolute');
        this._slider.setClassName('minimap-slider');
        this._slider.setLayerHinting(true);
        this._slider.setContain('strict');
        this._domNode.appendChild(this._slider);
        this._sliderHorizontal = createFastDomNode(document.createElement('div'));
        this._sliderHorizontal.setPosition('absolute');
        this._sliderHorizontal.setClassName('minimap-slider-horizontal');
        this._slider.appendChild(this._sliderHorizontal);
        this._applyLayout();
        this._pointerDownListener = dom.addStandardDisposableListener(this._domNode.domNode, dom.EventType.POINTER_DOWN, (e) => {
            e.preventDefault();
            const renderMinimap = this._model.options.renderMinimap;
            if (renderMinimap === 0 /* RenderMinimap.None */) {
                return;
            }
            if (!this._lastRenderData) {
                return;
            }
            if (this._model.options.size !== 'proportional') {
                if (e.button === 0 && this._lastRenderData) {
                    // pretend the click occurred in the center of the slider
                    const position = dom.getDomNodePagePosition(this._slider.domNode);
                    const initialPosY = position.top + position.height / 2;
                    this._startSliderDragging(e, initialPosY, this._lastRenderData.renderedLayout);
                }
                return;
            }
            const minimapLineHeight = this._model.options.minimapLineHeight;
            const internalOffsetY = (this._model.options.canvasInnerHeight / this._model.options.canvasOuterHeight) * e.offsetY;
            const lineIndex = Math.floor(internalOffsetY / minimapLineHeight);
            let lineNumber = lineIndex + this._lastRenderData.renderedLayout.startLineNumber - this._lastRenderData.renderedLayout.topPaddingLineCount;
            lineNumber = Math.min(lineNumber, this._model.getLineCount());
            this._model.revealLineNumber(lineNumber);
        });
        this._sliderPointerMoveMonitor = new GlobalPointerMoveMonitor();
        this._sliderPointerDownListener = dom.addStandardDisposableListener(this._slider.domNode, dom.EventType.POINTER_DOWN, (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (e.button === 0 && this._lastRenderData) {
                this._startSliderDragging(e, e.pageY, this._lastRenderData.renderedLayout);
            }
        });
        this._gestureDisposable = Gesture.addTarget(this._domNode.domNode);
        this._sliderTouchStartListener = dom.addDisposableListener(this._domNode.domNode, EventType.Start, (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (this._lastRenderData) {
                this._slider.toggleClassName('active', true);
                this._gestureInProgress = true;
                this.scrollDueToTouchEvent(e);
            }
        }, { passive: false });
        this._sliderTouchMoveListener = dom.addDisposableListener(this._domNode.domNode, EventType.Change, (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (this._lastRenderData && this._gestureInProgress) {
                this.scrollDueToTouchEvent(e);
            }
        }, { passive: false });
        this._sliderTouchEndListener = dom.addStandardDisposableListener(this._domNode.domNode, EventType.End, (e) => {
            e.preventDefault();
            e.stopPropagation();
            this._gestureInProgress = false;
            this._slider.toggleClassName('active', false);
        });
    }
    _startSliderDragging(e, initialPosY, initialSliderState) {
        if (!e.target || !(e.target instanceof Element)) {
            return;
        }
        const initialPosX = e.pageX;
        this._slider.toggleClassName('active', true);
        const handlePointerMove = (posy, posx) => {
            const minimapPosition = dom.getDomNodePagePosition(this._domNode.domNode);
            const pointerOrthogonalDelta = Math.min(Math.abs(posx - initialPosX), Math.abs(posx - minimapPosition.left), Math.abs(posx - minimapPosition.left - minimapPosition.width));
            if (platform.isWindows && pointerOrthogonalDelta > POINTER_DRAG_RESET_DISTANCE) {
                // The pointer has wondered away from the scrollbar => reset dragging
                this._model.setScrollTop(initialSliderState.scrollTop);
                return;
            }
            const pointerDelta = posy - initialPosY;
            this._model.setScrollTop(initialSliderState.getDesiredScrollTopFromDelta(pointerDelta));
        };
        if (e.pageY !== initialPosY) {
            handlePointerMove(e.pageY, initialPosX);
        }
        this._sliderPointerMoveMonitor.startMonitoring(e.target, e.pointerId, e.buttons, pointerMoveData => handlePointerMove(pointerMoveData.pageY, pointerMoveData.pageX), () => {
            this._slider.toggleClassName('active', false);
        });
    }
    scrollDueToTouchEvent(touch) {
        const startY = this._domNode.domNode.getBoundingClientRect().top;
        const scrollTop = this._lastRenderData.renderedLayout.getDesiredScrollTopFromTouchLocation(touch.pageY - startY);
        this._model.setScrollTop(scrollTop);
    }
    dispose() {
        this._pointerDownListener.dispose();
        this._sliderPointerMoveMonitor.dispose();
        this._sliderPointerDownListener.dispose();
        this._gestureDisposable.dispose();
        this._sliderTouchStartListener.dispose();
        this._sliderTouchMoveListener.dispose();
        this._sliderTouchEndListener.dispose();
        super.dispose();
    }
    _getMinimapDomNodeClassName() {
        const class_ = ['minimap'];
        if (this._model.options.showSlider === 'always') {
            class_.push('slider-always');
        }
        else {
            class_.push('slider-mouseover');
        }
        if (this._model.options.autohide) {
            class_.push('autohide');
        }
        return class_.join(' ');
    }
    getDomNode() {
        return this._domNode;
    }
    _applyLayout() {
        this._domNode.setLeft(this._model.options.minimapLeft);
        this._domNode.setWidth(this._model.options.minimapWidth);
        this._domNode.setHeight(this._model.options.minimapHeight);
        this._shadow.setHeight(this._model.options.minimapHeight);
        this._canvas.setWidth(this._model.options.canvasOuterWidth);
        this._canvas.setHeight(this._model.options.canvasOuterHeight);
        this._canvas.domNode.width = this._model.options.canvasInnerWidth;
        this._canvas.domNode.height = this._model.options.canvasInnerHeight;
        this._decorationsCanvas.setWidth(this._model.options.canvasOuterWidth);
        this._decorationsCanvas.setHeight(this._model.options.canvasOuterHeight);
        this._decorationsCanvas.domNode.width = this._model.options.canvasInnerWidth;
        this._decorationsCanvas.domNode.height = this._model.options.canvasInnerHeight;
        this._slider.setWidth(this._model.options.minimapWidth);
    }
    _getBuffer() {
        if (!this._buffers) {
            if (this._model.options.canvasInnerWidth > 0 && this._model.options.canvasInnerHeight > 0) {
                this._buffers = new MinimapBuffers(this._canvas.domNode.getContext('2d'), this._model.options.canvasInnerWidth, this._model.options.canvasInnerHeight, this._model.options.backgroundColor);
            }
        }
        return this._buffers ? this._buffers.getBuffer() : null;
    }
    // ---- begin view event handlers
    onDidChangeOptions() {
        this._lastRenderData = null;
        this._buffers = null;
        this._applyLayout();
        this._domNode.setClassName(this._getMinimapDomNodeClassName());
    }
    onSelectionChanged() {
        this._renderDecorations = true;
        return true;
    }
    onDecorationsChanged() {
        this._renderDecorations = true;
        return true;
    }
    onFlushed() {
        this._lastRenderData = null;
        return true;
    }
    onLinesChanged(changeFromLineNumber, changeCount) {
        if (this._lastRenderData) {
            return this._lastRenderData.onLinesChanged(changeFromLineNumber, changeCount);
        }
        return false;
    }
    onLinesDeleted(deleteFromLineNumber, deleteToLineNumber) {
        this._lastRenderData?.onLinesDeleted(deleteFromLineNumber, deleteToLineNumber);
        return true;
    }
    onLinesInserted(insertFromLineNumber, insertToLineNumber) {
        this._lastRenderData?.onLinesInserted(insertFromLineNumber, insertToLineNumber);
        return true;
    }
    onScrollChanged() {
        this._renderDecorations = true;
        return true;
    }
    onThemeChanged() {
        this._selectionColor = this._theme.getColor(minimapSelection);
        this._renderDecorations = true;
        return true;
    }
    onTokensChanged(ranges) {
        if (this._lastRenderData) {
            return this._lastRenderData.onTokensChanged(ranges);
        }
        return false;
    }
    onTokensColorsChanged() {
        this._lastRenderData = null;
        this._buffers = null;
        return true;
    }
    onZonesChanged() {
        this._lastRenderData = null;
        return true;
    }
    // --- end event handlers
    render(renderingCtx) {
        const renderMinimap = this._model.options.renderMinimap;
        if (renderMinimap === 0 /* RenderMinimap.None */) {
            this._shadow.setClassName('minimap-shadow-hidden');
            this._sliderHorizontal.setWidth(0);
            this._sliderHorizontal.setHeight(0);
            return;
        }
        if (renderingCtx.scrollLeft + renderingCtx.viewportWidth >= renderingCtx.scrollWidth) {
            this._shadow.setClassName('minimap-shadow-hidden');
        }
        else {
            this._shadow.setClassName('minimap-shadow-visible');
        }
        const layout = MinimapLayout.create(this._model.options, renderingCtx.viewportStartLineNumber, renderingCtx.viewportEndLineNumber, renderingCtx.viewportStartLineNumberVerticalOffset, renderingCtx.viewportHeight, renderingCtx.viewportContainsWhitespaceGaps, this._model.getLineCount(), this._model.getRealLineCount(), renderingCtx.scrollTop, renderingCtx.scrollHeight, this._lastRenderData ? this._lastRenderData.renderedLayout : null);
        this._slider.setDisplay(layout.sliderNeeded ? 'block' : 'none');
        this._slider.setTop(layout.sliderTop);
        this._slider.setHeight(layout.sliderHeight);
        // Compute horizontal slider coordinates
        this._sliderHorizontal.setLeft(0);
        this._sliderHorizontal.setWidth(this._model.options.minimapWidth);
        this._sliderHorizontal.setTop(0);
        this._sliderHorizontal.setHeight(layout.sliderHeight);
        this.renderDecorations(layout);
        this._lastRenderData = this.renderLines(layout);
    }
    renderDecorations(layout) {
        if (this._renderDecorations) {
            this._renderDecorations = false;
            const selections = this._model.getSelections();
            selections.sort(Range.compareRangesUsingStarts);
            const decorations = this._model.getMinimapDecorationsInViewport(layout.startLineNumber, layout.endLineNumber);
            decorations.sort((a, b) => (a.options.zIndex || 0) - (b.options.zIndex || 0));
            const { canvasInnerWidth, canvasInnerHeight } = this._model.options;
            const minimapLineHeight = this._model.options.minimapLineHeight;
            const minimapCharWidth = this._model.options.minimapCharWidth;
            const tabSize = this._model.getOptions().tabSize;
            const canvasContext = this._decorationsCanvas.domNode.getContext('2d');
            canvasContext.clearRect(0, 0, canvasInnerWidth, canvasInnerHeight);
            // We first need to render line highlights and then render decorations on top of those.
            // But we need to pick a single color for each line, and use that as a line highlight.
            // This needs to be the color of the decoration with the highest `zIndex`, but priority
            // is given to the selection.
            const highlightedLines = new ContiguousLineMap(layout.startLineNumber, layout.endLineNumber, false);
            this._renderSelectionLineHighlights(canvasContext, selections, highlightedLines, layout, minimapLineHeight);
            this._renderDecorationsLineHighlights(canvasContext, decorations, highlightedLines, layout, minimapLineHeight);
            const lineOffsetMap = new ContiguousLineMap(layout.startLineNumber, layout.endLineNumber, null);
            this._renderSelectionsHighlights(canvasContext, selections, lineOffsetMap, layout, minimapLineHeight, tabSize, minimapCharWidth, canvasInnerWidth);
            this._renderDecorationsHighlights(canvasContext, decorations, lineOffsetMap, layout, minimapLineHeight, tabSize, minimapCharWidth, canvasInnerWidth);
            this._renderSectionHeaders(layout);
        }
    }
    _renderSelectionLineHighlights(canvasContext, selections, highlightedLines, layout, minimapLineHeight) {
        if (!this._selectionColor || this._selectionColor.isTransparent()) {
            return;
        }
        canvasContext.fillStyle = this._selectionColor.transparent(0.5).toString();
        let y1 = 0;
        let y2 = 0;
        for (const selection of selections) {
            const intersection = layout.intersectWithViewport(selection);
            if (!intersection) {
                // entirely outside minimap's viewport
                continue;
            }
            const [startLineNumber, endLineNumber] = intersection;
            for (let line = startLineNumber; line <= endLineNumber; line++) {
                highlightedLines.set(line, true);
            }
            const yy1 = layout.getYForLineNumber(startLineNumber, minimapLineHeight);
            const yy2 = layout.getYForLineNumber(endLineNumber, minimapLineHeight);
            if (y2 >= yy1) {
                // merge into previous
                y2 = yy2;
            }
            else {
                if (y2 > y1) {
                    // flush
                    canvasContext.fillRect(MINIMAP_GUTTER_WIDTH, y1, canvasContext.canvas.width, y2 - y1);
                }
                y1 = yy1;
                y2 = yy2;
            }
        }
        if (y2 > y1) {
            // flush
            canvasContext.fillRect(MINIMAP_GUTTER_WIDTH, y1, canvasContext.canvas.width, y2 - y1);
        }
    }
    _renderDecorationsLineHighlights(canvasContext, decorations, highlightedLines, layout, minimapLineHeight) {
        const highlightColors = new Map();
        // Loop backwards to hit first decorations with higher `zIndex`
        for (let i = decorations.length - 1; i >= 0; i--) {
            const decoration = decorations[i];
            const minimapOptions = decoration.options.minimap;
            if (!minimapOptions || minimapOptions.position !== 1 /* MinimapPosition.Inline */) {
                continue;
            }
            const intersection = layout.intersectWithViewport(decoration.range);
            if (!intersection) {
                // entirely outside minimap's viewport
                continue;
            }
            const [startLineNumber, endLineNumber] = intersection;
            const decorationColor = minimapOptions.getColor(this._theme.value);
            if (!decorationColor || decorationColor.isTransparent()) {
                continue;
            }
            let highlightColor = highlightColors.get(decorationColor.toString());
            if (!highlightColor) {
                highlightColor = decorationColor.transparent(0.5).toString();
                highlightColors.set(decorationColor.toString(), highlightColor);
            }
            canvasContext.fillStyle = highlightColor;
            for (let line = startLineNumber; line <= endLineNumber; line++) {
                if (highlightedLines.has(line)) {
                    continue;
                }
                highlightedLines.set(line, true);
                const y = layout.getYForLineNumber(startLineNumber, minimapLineHeight);
                canvasContext.fillRect(MINIMAP_GUTTER_WIDTH, y, canvasContext.canvas.width, minimapLineHeight);
            }
        }
    }
    _renderSelectionsHighlights(canvasContext, selections, lineOffsetMap, layout, lineHeight, tabSize, characterWidth, canvasInnerWidth) {
        if (!this._selectionColor || this._selectionColor.isTransparent()) {
            return;
        }
        for (const selection of selections) {
            const intersection = layout.intersectWithViewport(selection);
            if (!intersection) {
                // entirely outside minimap's viewport
                continue;
            }
            const [startLineNumber, endLineNumber] = intersection;
            for (let line = startLineNumber; line <= endLineNumber; line++) {
                this.renderDecorationOnLine(canvasContext, lineOffsetMap, selection, this._selectionColor, layout, line, lineHeight, lineHeight, tabSize, characterWidth, canvasInnerWidth);
            }
        }
    }
    _renderDecorationsHighlights(canvasContext, decorations, lineOffsetMap, layout, minimapLineHeight, tabSize, characterWidth, canvasInnerWidth) {
        // Loop forwards to hit first decorations with lower `zIndex`
        for (const decoration of decorations) {
            const minimapOptions = decoration.options.minimap;
            if (!minimapOptions) {
                continue;
            }
            const intersection = layout.intersectWithViewport(decoration.range);
            if (!intersection) {
                // entirely outside minimap's viewport
                continue;
            }
            const [startLineNumber, endLineNumber] = intersection;
            const decorationColor = minimapOptions.getColor(this._theme.value);
            if (!decorationColor || decorationColor.isTransparent()) {
                continue;
            }
            for (let line = startLineNumber; line <= endLineNumber; line++) {
                switch (minimapOptions.position) {
                    case 1 /* MinimapPosition.Inline */:
                        this.renderDecorationOnLine(canvasContext, lineOffsetMap, decoration.range, decorationColor, layout, line, minimapLineHeight, minimapLineHeight, tabSize, characterWidth, canvasInnerWidth);
                        continue;
                    case 2 /* MinimapPosition.Gutter */: {
                        const y = layout.getYForLineNumber(line, minimapLineHeight);
                        const x = 2;
                        this.renderDecoration(canvasContext, decorationColor, x, y, GUTTER_DECORATION_WIDTH, minimapLineHeight);
                        continue;
                    }
                }
            }
        }
    }
    renderDecorationOnLine(canvasContext, lineOffsetMap, decorationRange, decorationColor, layout, lineNumber, height, minimapLineHeight, tabSize, charWidth, canvasInnerWidth) {
        const y = layout.getYForLineNumber(lineNumber, minimapLineHeight);
        // Skip rendering the line if it's vertically outside our viewport
        if (y + height < 0 || y > this._model.options.canvasInnerHeight) {
            return;
        }
        const { startLineNumber, endLineNumber } = decorationRange;
        const startColumn = (startLineNumber === lineNumber ? decorationRange.startColumn : 1);
        const endColumn = (endLineNumber === lineNumber ? decorationRange.endColumn : this._model.getLineMaxColumn(lineNumber));
        const x1 = this.getXOffsetForPosition(lineOffsetMap, lineNumber, startColumn, tabSize, charWidth, canvasInnerWidth);
        const x2 = this.getXOffsetForPosition(lineOffsetMap, lineNumber, endColumn, tabSize, charWidth, canvasInnerWidth);
        this.renderDecoration(canvasContext, decorationColor, x1, y, x2 - x1, height);
    }
    getXOffsetForPosition(lineOffsetMap, lineNumber, column, tabSize, charWidth, canvasInnerWidth) {
        if (column === 1) {
            return MINIMAP_GUTTER_WIDTH;
        }
        const minimumXOffset = (column - 1) * charWidth;
        if (minimumXOffset >= canvasInnerWidth) {
            // there is no need to look at actual characters,
            // as this column is certainly after the minimap width
            return canvasInnerWidth;
        }
        // Cache line offset data so that it is only read once per line
        let lineIndexToXOffset = lineOffsetMap.get(lineNumber);
        if (!lineIndexToXOffset) {
            const lineData = this._model.getLineContent(lineNumber);
            lineIndexToXOffset = [MINIMAP_GUTTER_WIDTH];
            let prevx = MINIMAP_GUTTER_WIDTH;
            for (let i = 1; i < lineData.length + 1; i++) {
                const charCode = lineData.charCodeAt(i - 1);
                const dx = charCode === 9 /* CharCode.Tab */
                    ? tabSize * charWidth
                    : strings.isFullWidthCharacter(charCode)
                        ? 2 * charWidth
                        : charWidth;
                const x = prevx + dx;
                if (x >= canvasInnerWidth) {
                    // no need to keep on going, as we've hit the canvas width
                    lineIndexToXOffset[i] = canvasInnerWidth;
                    break;
                }
                lineIndexToXOffset[i] = x;
                prevx = x;
            }
            lineOffsetMap.set(lineNumber, lineIndexToXOffset);
        }
        if (column - 1 < lineIndexToXOffset.length) {
            return lineIndexToXOffset[column - 1];
        }
        // goes over the canvas width
        return canvasInnerWidth;
    }
    renderDecoration(canvasContext, decorationColor, x, y, width, height) {
        canvasContext.fillStyle = decorationColor && decorationColor.toString() || '';
        canvasContext.fillRect(x, y, width, height);
    }
    _renderSectionHeaders(layout) {
        const minimapLineHeight = this._model.options.minimapLineHeight;
        const sectionHeaderFontSize = this._model.options.sectionHeaderFontSize;
        const sectionHeaderLetterSpacing = this._model.options.sectionHeaderLetterSpacing;
        const backgroundFillHeight = sectionHeaderFontSize * 1.5;
        const { canvasInnerWidth } = this._model.options;
        const backgroundColor = this._model.options.backgroundColor;
        const backgroundFill = `rgb(${backgroundColor.r} ${backgroundColor.g} ${backgroundColor.b} / .7)`;
        const foregroundColor = this._model.options.sectionHeaderFontColor;
        const foregroundFill = `rgb(${foregroundColor.r} ${foregroundColor.g} ${foregroundColor.b})`;
        const separatorStroke = foregroundFill;
        const canvasContext = this._decorationsCanvas.domNode.getContext('2d');
        canvasContext.letterSpacing = sectionHeaderLetterSpacing + 'px';
        canvasContext.font = '500 ' + sectionHeaderFontSize + 'px ' + this._model.options.sectionHeaderFontFamily;
        canvasContext.strokeStyle = separatorStroke;
        canvasContext.lineWidth = 0.2;
        const decorations = this._model.getSectionHeaderDecorationsInViewport(layout.startLineNumber, layout.endLineNumber);
        decorations.sort((a, b) => a.range.startLineNumber - b.range.startLineNumber);
        const fitWidth = InnerMinimap._fitSectionHeader.bind(null, canvasContext, canvasInnerWidth - MINIMAP_GUTTER_WIDTH);
        for (const decoration of decorations) {
            const y = layout.getYForLineNumber(decoration.range.startLineNumber, minimapLineHeight) + sectionHeaderFontSize;
            const backgroundFillY = y - sectionHeaderFontSize;
            const separatorY = backgroundFillY + 2;
            const headerText = this._model.getSectionHeaderText(decoration, fitWidth);
            InnerMinimap._renderSectionLabel(canvasContext, headerText, decoration.options.minimap?.sectionHeaderStyle === 2 /* MinimapSectionHeaderStyle.Underlined */, backgroundFill, foregroundFill, canvasInnerWidth, backgroundFillY, backgroundFillHeight, y, separatorY);
        }
    }
    static _fitSectionHeader(target, maxWidth, headerText) {
        if (!headerText) {
            return headerText;
        }
        const ellipsis = '…';
        const width = target.measureText(headerText).width;
        const ellipsisWidth = target.measureText(ellipsis).width;
        if (width <= maxWidth || width <= ellipsisWidth) {
            return headerText;
        }
        const len = headerText.length;
        const averageCharWidth = width / headerText.length;
        const maxCharCount = Math.floor((maxWidth - ellipsisWidth) / averageCharWidth) - 1;
        // Find a halfway point that isn't after whitespace
        let halfCharCount = Math.ceil(maxCharCount / 2);
        while (halfCharCount > 0 && /\s/.test(headerText[halfCharCount - 1])) {
            --halfCharCount;
        }
        // Split with ellipsis
        return headerText.substring(0, halfCharCount)
            + ellipsis + headerText.substring(len - (maxCharCount - halfCharCount));
    }
    static _renderSectionLabel(target, headerText, hasSeparatorLine, backgroundFill, foregroundFill, minimapWidth, backgroundFillY, backgroundFillHeight, textY, separatorY) {
        if (headerText) {
            target.fillStyle = backgroundFill;
            target.fillRect(0, backgroundFillY, minimapWidth, backgroundFillHeight);
            target.fillStyle = foregroundFill;
            target.fillText(headerText, MINIMAP_GUTTER_WIDTH, textY);
        }
        if (hasSeparatorLine) {
            target.beginPath();
            target.moveTo(0, separatorY);
            target.lineTo(minimapWidth, separatorY);
            target.closePath();
            target.stroke();
        }
    }
    renderLines(layout) {
        const startLineNumber = layout.startLineNumber;
        const endLineNumber = layout.endLineNumber;
        const minimapLineHeight = this._model.options.minimapLineHeight;
        // Check if nothing changed w.r.t. lines from last frame
        if (this._lastRenderData && this._lastRenderData.linesEquals(layout)) {
            const _lastData = this._lastRenderData._get();
            // Nice!! Nothing changed from last frame
            return new RenderData(layout, _lastData.imageData, _lastData.lines);
        }
        // Oh well!! We need to repaint some lines...
        const imageData = this._getBuffer();
        if (!imageData) {
            // 0 width or 0 height canvas, nothing to do
            return null;
        }
        // Render untouched lines by using last rendered data.
        const [_dirtyY1, _dirtyY2, needed] = InnerMinimap._renderUntouchedLines(imageData, layout.topPaddingLineCount, startLineNumber, endLineNumber, minimapLineHeight, this._lastRenderData);
        // Fetch rendering info from view model for rest of lines that need rendering.
        const lineInfo = this._model.getMinimapLinesRenderingData(startLineNumber, endLineNumber, needed);
        const tabSize = this._model.getOptions().tabSize;
        const defaultBackground = this._model.options.defaultBackgroundColor;
        const background = this._model.options.backgroundColor;
        const foregroundAlpha = this._model.options.foregroundAlpha;
        const tokensColorTracker = this._model.tokensColorTracker;
        const useLighterFont = tokensColorTracker.backgroundIsLight();
        const renderMinimap = this._model.options.renderMinimap;
        const charRenderer = this._model.options.charRenderer();
        const fontScale = this._model.options.fontScale;
        const minimapCharWidth = this._model.options.minimapCharWidth;
        const baseCharHeight = (renderMinimap === 1 /* RenderMinimap.Text */ ? 2 /* Constants.BASE_CHAR_HEIGHT */ : 2 /* Constants.BASE_CHAR_HEIGHT */ + 1);
        const renderMinimapLineHeight = baseCharHeight * fontScale;
        const innerLinePadding = (minimapLineHeight > renderMinimapLineHeight ? Math.floor((minimapLineHeight - renderMinimapLineHeight) / 2) : 0);
        // Render the rest of lines
        const backgroundA = background.a / 255;
        const renderBackground = new RGBA8(Math.round((background.r - defaultBackground.r) * backgroundA + defaultBackground.r), Math.round((background.g - defaultBackground.g) * backgroundA + defaultBackground.g), Math.round((background.b - defaultBackground.b) * backgroundA + defaultBackground.b), 255);
        let dy = layout.topPaddingLineCount * minimapLineHeight;
        const renderedLines = [];
        for (let lineIndex = 0, lineCount = endLineNumber - startLineNumber + 1; lineIndex < lineCount; lineIndex++) {
            if (needed[lineIndex]) {
                InnerMinimap._renderLine(imageData, renderBackground, background.a, useLighterFont, renderMinimap, minimapCharWidth, tokensColorTracker, foregroundAlpha, charRenderer, dy, innerLinePadding, tabSize, lineInfo[lineIndex], fontScale, minimapLineHeight);
            }
            renderedLines[lineIndex] = new MinimapLine(dy);
            dy += minimapLineHeight;
        }
        const dirtyY1 = (_dirtyY1 === -1 ? 0 : _dirtyY1);
        const dirtyY2 = (_dirtyY2 === -1 ? imageData.height : _dirtyY2);
        const dirtyHeight = dirtyY2 - dirtyY1;
        // Finally, paint to the canvas
        const ctx = this._canvas.domNode.getContext('2d');
        ctx.putImageData(imageData, 0, 0, 0, dirtyY1, imageData.width, dirtyHeight);
        // Save rendered data for reuse on next frame if possible
        return new RenderData(layout, imageData, renderedLines);
    }
    static _renderUntouchedLines(target, topPaddingLineCount, startLineNumber, endLineNumber, minimapLineHeight, lastRenderData) {
        const needed = [];
        if (!lastRenderData) {
            for (let i = 0, len = endLineNumber - startLineNumber + 1; i < len; i++) {
                needed[i] = true;
            }
            return [-1, -1, needed];
        }
        const _lastData = lastRenderData._get();
        const lastTargetData = _lastData.imageData.data;
        const lastStartLineNumber = _lastData.rendLineNumberStart;
        const lastLines = _lastData.lines;
        const lastLinesLength = lastLines.length;
        const WIDTH = target.width;
        const targetData = target.data;
        const maxDestPixel = (endLineNumber - startLineNumber + 1) * minimapLineHeight * WIDTH * 4;
        let dirtyPixel1 = -1; // the pixel offset up to which all the data is equal to the prev frame
        let dirtyPixel2 = -1; // the pixel offset after which all the data is equal to the prev frame
        let copySourceStart = -1;
        let copySourceEnd = -1;
        let copyDestStart = -1;
        let copyDestEnd = -1;
        let dest_dy = topPaddingLineCount * minimapLineHeight;
        for (let lineNumber = startLineNumber; lineNumber <= endLineNumber; lineNumber++) {
            const lineIndex = lineNumber - startLineNumber;
            const lastLineIndex = lineNumber - lastStartLineNumber;
            const source_dy = (lastLineIndex >= 0 && lastLineIndex < lastLinesLength ? lastLines[lastLineIndex].dy : -1);
            if (source_dy === -1) {
                needed[lineIndex] = true;
                dest_dy += minimapLineHeight;
                continue;
            }
            const sourceStart = source_dy * WIDTH * 4;
            const sourceEnd = (source_dy + minimapLineHeight) * WIDTH * 4;
            const destStart = dest_dy * WIDTH * 4;
            const destEnd = (dest_dy + minimapLineHeight) * WIDTH * 4;
            if (copySourceEnd === sourceStart && copyDestEnd === destStart) {
                // contiguous zone => extend copy request
                copySourceEnd = sourceEnd;
                copyDestEnd = destEnd;
            }
            else {
                if (copySourceStart !== -1) {
                    // flush existing copy request
                    targetData.set(lastTargetData.subarray(copySourceStart, copySourceEnd), copyDestStart);
                    if (dirtyPixel1 === -1 && copySourceStart === 0 && copySourceStart === copyDestStart) {
                        dirtyPixel1 = copySourceEnd;
                    }
                    if (dirtyPixel2 === -1 && copySourceEnd === maxDestPixel && copySourceStart === copyDestStart) {
                        dirtyPixel2 = copySourceStart;
                    }
                }
                copySourceStart = sourceStart;
                copySourceEnd = sourceEnd;
                copyDestStart = destStart;
                copyDestEnd = destEnd;
            }
            needed[lineIndex] = false;
            dest_dy += minimapLineHeight;
        }
        if (copySourceStart !== -1) {
            // flush existing copy request
            targetData.set(lastTargetData.subarray(copySourceStart, copySourceEnd), copyDestStart);
            if (dirtyPixel1 === -1 && copySourceStart === 0 && copySourceStart === copyDestStart) {
                dirtyPixel1 = copySourceEnd;
            }
            if (dirtyPixel2 === -1 && copySourceEnd === maxDestPixel && copySourceStart === copyDestStart) {
                dirtyPixel2 = copySourceStart;
            }
        }
        const dirtyY1 = (dirtyPixel1 === -1 ? -1 : dirtyPixel1 / (WIDTH * 4));
        const dirtyY2 = (dirtyPixel2 === -1 ? -1 : dirtyPixel2 / (WIDTH * 4));
        return [dirtyY1, dirtyY2, needed];
    }
    static _renderLine(target, backgroundColor, backgroundAlpha, useLighterFont, renderMinimap, charWidth, colorTracker, foregroundAlpha, minimapCharRenderer, dy, innerLinePadding, tabSize, lineData, fontScale, minimapLineHeight) {
        const content = lineData.content;
        const tokens = lineData.tokens;
        const maxDx = target.width - charWidth;
        const force1pxHeight = (minimapLineHeight === 1);
        let dx = MINIMAP_GUTTER_WIDTH;
        let charIndex = 0;
        let tabsCharDelta = 0;
        for (let tokenIndex = 0, tokensLen = tokens.getCount(); tokenIndex < tokensLen; tokenIndex++) {
            const tokenEndIndex = tokens.getEndOffset(tokenIndex);
            const tokenColorId = tokens.getForeground(tokenIndex);
            const tokenColor = colorTracker.getColor(tokenColorId);
            for (; charIndex < tokenEndIndex; charIndex++) {
                if (dx > maxDx) {
                    // hit edge of minimap
                    return;
                }
                const charCode = content.charCodeAt(charIndex);
                if (charCode === 9 /* CharCode.Tab */) {
                    const insertSpacesCount = tabSize - (charIndex + tabsCharDelta) % tabSize;
                    tabsCharDelta += insertSpacesCount - 1;
                    // No need to render anything since tab is invisible
                    dx += insertSpacesCount * charWidth;
                }
                else if (charCode === 32 /* CharCode.Space */) {
                    // No need to render anything since space is invisible
                    dx += charWidth;
                }
                else {
                    // Render twice for a full width character
                    const count = strings.isFullWidthCharacter(charCode) ? 2 : 1;
                    for (let i = 0; i < count; i++) {
                        if (renderMinimap === 2 /* RenderMinimap.Blocks */) {
                            minimapCharRenderer.blockRenderChar(target, dx, dy + innerLinePadding, tokenColor, foregroundAlpha, backgroundColor, backgroundAlpha, force1pxHeight);
                        }
                        else { // RenderMinimap.Text
                            minimapCharRenderer.renderChar(target, dx, dy + innerLinePadding, charCode, tokenColor, foregroundAlpha, backgroundColor, backgroundAlpha, fontScale, useLighterFont, force1pxHeight);
                        }
                        dx += charWidth;
                        if (dx > maxDx) {
                            // hit edge of minimap
                            return;
                        }
                    }
                }
            }
        }
    }
}
class ContiguousLineMap {
    constructor(startLineNumber, endLineNumber, defaultValue) {
        this._startLineNumber = startLineNumber;
        this._endLineNumber = endLineNumber;
        this._defaultValue = defaultValue;
        this._values = [];
        for (let i = 0, count = this._endLineNumber - this._startLineNumber + 1; i < count; i++) {
            this._values[i] = defaultValue;
        }
    }
    has(lineNumber) {
        return (this.get(lineNumber) !== this._defaultValue);
    }
    set(lineNumber, value) {
        if (lineNumber < this._startLineNumber || lineNumber > this._endLineNumber) {
            return;
        }
        this._values[lineNumber - this._startLineNumber] = value;
    }
    get(lineNumber) {
        if (lineNumber < this._startLineNumber || lineNumber > this._endLineNumber) {
            return this._defaultValue;
        }
        return this._values[lineNumber - this._startLineNumber];
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWluaW1hcC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci92aWV3UGFydHMvbWluaW1hcC9taW5pbWFwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sZUFBZSxDQUFDO0FBQ3ZCLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUM7QUFDdkQsT0FBTyxFQUFlLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDekYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFFaEcsT0FBTyxFQUFlLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQy9FLE9BQU8sS0FBSyxRQUFRLE1BQU0scUNBQXFDLENBQUM7QUFDaEUsT0FBTyxLQUFLLE9BQU8sTUFBTSxvQ0FBb0MsQ0FBQztBQUM5RCxPQUFPLEVBQVMsdUJBQXVCLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUN6RSxPQUFPLEVBQW1CLGdCQUFnQixFQUFFLFFBQVEsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQ3JGLE9BQU8sRUFBK0Isb0JBQW9CLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUN0SSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDdEQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBTXJELE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBS25HLE9BQU8sRUFBZ0IsbUJBQW1CLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUNqRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsaUJBQWlCLEVBQUUsd0JBQXdCLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUVy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