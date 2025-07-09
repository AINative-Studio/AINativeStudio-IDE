/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { getActiveWindow } from '../../../../base/browser/dom.js';
import { Color } from '../../../../base/common/color.js';
import { BugIndicatingError } from '../../../../base/common/errors.js';
import { Emitter } from '../../../../base/common/event.js';
import { CursorColumns } from '../../../common/core/cursorColumns.js';
import { createContentSegmenter } from '../contentSegmenter.js';
import { GPULifecycle } from '../gpuDisposable.js';
import { quadVertices } from '../gpuUtils.js';
import { ViewGpuContext } from '../viewGpuContext.js';
import { BaseRenderStrategy } from './baseRenderStrategy.js';
import { fullFileRenderStrategyWgsl } from './fullFileRenderStrategy.wgsl.js';
var Constants;
(function (Constants) {
    Constants[Constants["IndicesPerCell"] = 6] = "IndicesPerCell";
    Constants[Constants["CellBindBufferCapacityIncrement"] = 32] = "CellBindBufferCapacityIncrement";
    Constants[Constants["CellBindBufferInitialCapacity"] = 63] = "CellBindBufferInitialCapacity";
})(Constants || (Constants = {}));
var CellBufferInfo;
(function (CellBufferInfo) {
    CellBufferInfo[CellBufferInfo["FloatsPerEntry"] = 6] = "FloatsPerEntry";
    CellBufferInfo[CellBufferInfo["BytesPerEntry"] = 24] = "BytesPerEntry";
    CellBufferInfo[CellBufferInfo["Offset_X"] = 0] = "Offset_X";
    CellBufferInfo[CellBufferInfo["Offset_Y"] = 1] = "Offset_Y";
    CellBufferInfo[CellBufferInfo["Offset_Unused1"] = 2] = "Offset_Unused1";
    CellBufferInfo[CellBufferInfo["Offset_Unused2"] = 3] = "Offset_Unused2";
    CellBufferInfo[CellBufferInfo["GlyphIndex"] = 4] = "GlyphIndex";
    CellBufferInfo[CellBufferInfo["TextureIndex"] = 5] = "TextureIndex";
})(CellBufferInfo || (CellBufferInfo = {}));
/**
 * A render strategy that uploads the content of the entire viewport every frame.
 */
export class ViewportRenderStrategy extends BaseRenderStrategy {
    /**
     * The hard cap for line columns that can be rendered by the GPU renderer.
     */
    static { this.maxSupportedColumns = 2000; }
    get bindGroupEntries() {
        return [
            { binding: 1 /* BindingId.Cells */, resource: { buffer: this._cellBindBuffer } },
            { binding: 6 /* BindingId.ScrollOffset */, resource: { buffer: this._scrollOffsetBindBuffer } }
        ];
    }
    constructor(context, viewGpuContext, device, glyphRasterizer) {
        super(context, viewGpuContext, device, glyphRasterizer);
        this.type = 'viewport';
        this.wgsl = fullFileRenderStrategyWgsl;
        this._cellBindBufferLineCapacity = 63 /* Constants.CellBindBufferInitialCapacity */;
        this._activeDoubleBufferIndex = 0;
        this._visibleObjectCount = 0;
        this._scrollInitialized = false;
        this._onDidChangeBindGroupEntries = this._register(new Emitter());
        this.onDidChangeBindGroupEntries = this._onDidChangeBindGroupEntries.event;
        this._rebuildCellBuffer(this._cellBindBufferLineCapacity);
        const scrollOffsetBufferSize = 2;
        this._scrollOffsetBindBuffer = this._register(GPULifecycle.createBuffer(this._device, {
            label: 'Monaco scroll offset buffer',
            size: scrollOffsetBufferSize * Float32Array.BYTES_PER_ELEMENT,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        })).object;
        this._scrollOffsetValueBuffer = new Float32Array(scrollOffsetBufferSize);
    }
    _rebuildCellBuffer(lineCount) {
        this._cellBindBuffer?.destroy();
        // Increase in chunks so resizing a window by hand doesn't keep allocating and throwing away
        const lineCountWithIncrement = (Math.floor(lineCount / 32 /* Constants.CellBindBufferCapacityIncrement */) + 1) * 32 /* Constants.CellBindBufferCapacityIncrement */;
        const bufferSize = lineCountWithIncrement * ViewportRenderStrategy.maxSupportedColumns * 6 /* Constants.IndicesPerCell */ * Float32Array.BYTES_PER_ELEMENT;
        this._cellBindBuffer = this._register(GPULifecycle.createBuffer(this._device, {
            label: 'Monaco full file cell buffer',
            size: bufferSize,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        })).object;
        this._cellValueBuffers = [
            new ArrayBuffer(bufferSize),
            new ArrayBuffer(bufferSize),
        ];
        this._cellBindBufferLineCapacity = lineCountWithIncrement;
        this._onDidChangeBindGroupEntries.fire();
    }
    // #region Event handlers
    // The primary job of these handlers is to:
    // 1. Invalidate the up to date line cache, which will cause the line to be re-rendered when
    //    it's _within the viewport_.
    // 2. Pass relevant events on to the render function so it can force certain line ranges to be
    //    re-rendered even if they're not in the viewport. For example when a view zone is added,
    //    there are lines that used to be visible but are no longer, so those ranges must be
    //    cleared and uploaded to the GPU.
    onConfigurationChanged(e) {
        return true;
    }
    onDecorationsChanged(e) {
        return true;
    }
    onTokensChanged(e) {
        return true;
    }
    onLinesDeleted(e) {
        return true;
    }
    onLinesInserted(e) {
        return true;
    }
    onLinesChanged(e) {
        return true;
    }
    onScrollChanged(e) {
        const dpr = getActiveWindow().devicePixelRatio;
        this._scrollOffsetValueBuffer[0] = (e?.scrollLeft ?? this._context.viewLayout.getCurrentScrollLeft()) * dpr;
        this._scrollOffsetValueBuffer[1] = (e?.scrollTop ?? this._context.viewLayout.getCurrentScrollTop()) * dpr;
        this._device.queue.writeBuffer(this._scrollOffsetBindBuffer, 0, this._scrollOffsetValueBuffer);
        return true;
    }
    onThemeChanged(e) {
        return true;
    }
    onLineMappingChanged(e) {
        return true;
    }
    onZonesChanged(e) {
        return true;
    }
    // #endregion
    reset() {
        for (const bufferIndex of [0, 1]) {
            // Zero out buffer and upload to GPU to prevent stale rows from rendering
            const buffer = new Float32Array(this._cellValueBuffers[bufferIndex]);
            buffer.fill(0, 0, buffer.length);
            this._device.queue.writeBuffer(this._cellBindBuffer, 0, buffer.buffer, 0, buffer.byteLength);
        }
    }
    update(viewportData, viewLineOptions) {
        // IMPORTANT: This is a hot function. Variables are pre-allocated and shared within the
        // loop. This is done so we don't need to trust the JIT compiler to do this optimization to
        // avoid potential additional blocking time in garbage collector which is a common cause of
        // dropped frames.
        let chars = '';
        let segment;
        let charWidth = 0;
        let y = 0;
        let x = 0;
        let absoluteOffsetX = 0;
        let absoluteOffsetY = 0;
        let tabXOffset = 0;
        let glyph;
        let cellIndex = 0;
        let tokenStartIndex = 0;
        let tokenEndIndex = 0;
        let tokenMetadata = 0;
        let decorationStyleSetBold;
        let decorationStyleSetColor;
        let decorationStyleSetOpacity;
        let lineData;
        let decoration;
        let fillStartIndex = 0;
        let fillEndIndex = 0;
        let tokens;
        const dpr = getActiveWindow().devicePixelRatio;
        let contentSegmenter;
        if (!this._scrollInitialized) {
            this.onScrollChanged();
            this._scrollInitialized = true;
        }
        // Zero out cell buffer or rebuild if needed
        if (this._cellBindBufferLineCapacity < viewportData.endLineNumber - viewportData.startLineNumber + 1) {
            this._rebuildCellBuffer(viewportData.endLineNumber - viewportData.startLineNumber + 1);
        }
        const cellBuffer = new Float32Array(this._cellValueBuffers[this._activeDoubleBufferIndex]);
        cellBuffer.fill(0);
        const lineIndexCount = ViewportRenderStrategy.maxSupportedColumns * 6 /* Constants.IndicesPerCell */;
        for (y = viewportData.startLineNumber; y <= viewportData.endLineNumber; y++) {
            // Only attempt to render lines that the GPU renderer can handle
            if (!this._viewGpuContext.canRender(viewLineOptions, viewportData, y)) {
                continue;
            }
            lineData = viewportData.getViewLineRenderingData(y);
            tabXOffset = 0;
            contentSegmenter = createContentSegmenter(lineData, viewLineOptions);
            charWidth = viewLineOptions.spaceWidth * dpr;
            absoluteOffsetX = 0;
            tokens = lineData.tokens;
            tokenStartIndex = lineData.minColumn - 1;
            tokenEndIndex = 0;
            for (let tokenIndex = 0, tokensLen = tokens.getCount(); tokenIndex < tokensLen; tokenIndex++) {
                tokenEndIndex = tokens.getEndOffset(tokenIndex);
                if (tokenEndIndex <= tokenStartIndex) {
                    // The faux indent part of the line should have no token type
                    continue;
                }
                tokenMetadata = tokens.getMetadata(tokenIndex);
                for (x = tokenStartIndex; x < tokenEndIndex; x++) {
                    // Only render lines that do not exceed maximum columns
                    if (x > ViewportRenderStrategy.maxSupportedColumns) {
                        break;
                    }
                    segment = contentSegmenter.getSegmentAtIndex(x);
                    if (segment === undefined) {
                        continue;
                    }
                    chars = segment;
                    if (!(lineData.isBasicASCII && viewLineOptions.useMonospaceOptimizations)) {
                        charWidth = this.glyphRasterizer.getTextMetrics(chars).width;
                    }
                    decorationStyleSetColor = undefined;
                    decorationStyleSetBold = undefined;
                    decorationStyleSetOpacity = undefined;
                    // Apply supported inline decoration styles to the cell metadata
                    for (decoration of lineData.inlineDecorations) {
                        // This is Range.strictContainsPosition except it works at the cell level,
                        // it's also inlined to avoid overhead.
                        if ((y < decoration.range.startLineNumber || y > decoration.range.endLineNumber) ||
                            (y === decoration.range.startLineNumber && x < decoration.range.startColumn - 1) ||
                            (y === decoration.range.endLineNumber && x >= decoration.range.endColumn - 1)) {
                            continue;
                        }
                        const rules = ViewGpuContext.decorationCssRuleExtractor.getStyleRules(this._viewGpuContext.canvas.domNode, decoration.inlineClassName);
                        for (const rule of rules) {
                            for (const r of rule.style) {
                                const value = rule.styleMap.get(r)?.toString() ?? '';
                                switch (r) {
                                    case 'color': {
                                        // TODO: This parsing and error handling should move into canRender so fallback
                                        //       to DOM works
                                        const parsedColor = Color.Format.CSS.parse(value);
                                        if (!parsedColor) {
                                            throw new BugIndicatingError('Invalid color format ' + value);
                                        }
                                        decorationStyleSetColor = parsedColor.toNumber32Bit();
                                        break;
                                    }
                                    case 'font-weight': {
                                        const parsedValue = parseCssFontWeight(value);
                                        if (parsedValue >= 400) {
                                            decorationStyleSetBold = true;
                                            // TODO: Set bold (https://github.com/microsoft/vscode/issues/237584)
                                        }
                                        else {
                                            decorationStyleSetBold = false;
                                            // TODO: Set normal (https://github.com/microsoft/vscode/issues/237584)
                                        }
                                        break;
                                    }
                                    case 'opacity': {
                                        const parsedValue = parseCssOpacity(value);
                                        decorationStyleSetOpacity = parsedValue;
                                        break;
                                    }
                                    default: throw new BugIndicatingError('Unexpected inline decoration style');
                                }
                            }
                        }
                    }
                    if (chars === ' ' || chars === '\t') {
                        // Zero out glyph to ensure it doesn't get rendered
                        cellIndex = ((y - 1) * ViewportRenderStrategy.maxSupportedColumns + x) * 6 /* Constants.IndicesPerCell */;
                        cellBuffer.fill(0, cellIndex, cellIndex + 6 /* CellBufferInfo.FloatsPerEntry */);
                        // Adjust xOffset for tab stops
                        if (chars === '\t') {
                            // Find the pixel offset between the current position and the next tab stop
                            const offsetBefore = x + tabXOffset;
                            tabXOffset = CursorColumns.nextRenderTabStop(x + tabXOffset, lineData.tabSize);
                            absoluteOffsetX += charWidth * (tabXOffset - offsetBefore);
                            // Convert back to offset excluding x and the current character
                            tabXOffset -= x + 1;
                        }
                        else {
                            absoluteOffsetX += charWidth;
                        }
                        continue;
                    }
                    const decorationStyleSetId = ViewGpuContext.decorationStyleCache.getOrCreateEntry(decorationStyleSetColor, decorationStyleSetBold, decorationStyleSetOpacity);
                    glyph = this._viewGpuContext.atlas.getGlyph(this.glyphRasterizer, chars, tokenMetadata, decorationStyleSetId, absoluteOffsetX);
                    absoluteOffsetY = Math.round(
                    // Top of layout box (includes line height)
                    viewportData.relativeVerticalOffset[y - viewportData.startLineNumber] * dpr +
                        // Delta from top of layout box (includes line height) to top of the inline box (no line height)
                        Math.floor((viewportData.lineHeight * dpr - (glyph.fontBoundingBoxAscent + glyph.fontBoundingBoxDescent)) / 2) +
                        // Delta from top of inline box (no line height) to top of glyph origin. If the glyph was drawn
                        // with a top baseline for example, this ends up drawing the glyph correctly using the alphabetical
                        // baseline.
                        glyph.fontBoundingBoxAscent);
                    cellIndex = ((y - viewportData.startLineNumber) * ViewportRenderStrategy.maxSupportedColumns + x) * 6 /* Constants.IndicesPerCell */;
                    cellBuffer[cellIndex + 0 /* CellBufferInfo.Offset_X */] = Math.floor(absoluteOffsetX);
                    cellBuffer[cellIndex + 1 /* CellBufferInfo.Offset_Y */] = absoluteOffsetY;
                    cellBuffer[cellIndex + 4 /* CellBufferInfo.GlyphIndex */] = glyph.glyphIndex;
                    cellBuffer[cellIndex + 5 /* CellBufferInfo.TextureIndex */] = glyph.pageIndex;
                    // Adjust the x pixel offset for the next character
                    absoluteOffsetX += charWidth;
                }
                tokenStartIndex = tokenEndIndex;
            }
            // Clear to end of line
            fillStartIndex = ((y - viewportData.startLineNumber) * ViewportRenderStrategy.maxSupportedColumns + tokenEndIndex) * 6 /* Constants.IndicesPerCell */;
            fillEndIndex = ((y - viewportData.startLineNumber) * ViewportRenderStrategy.maxSupportedColumns) * 6 /* Constants.IndicesPerCell */;
            cellBuffer.fill(0, fillStartIndex, fillEndIndex);
        }
        const visibleObjectCount = (viewportData.endLineNumber - viewportData.startLineNumber + 1) * lineIndexCount;
        // This render strategy always uploads the whole viewport
        this._device.queue.writeBuffer(this._cellBindBuffer, 0, cellBuffer.buffer, 0, (viewportData.endLineNumber - viewportData.startLineNumber) * lineIndexCount * Float32Array.BYTES_PER_ELEMENT);
        this._activeDoubleBufferIndex = this._activeDoubleBufferIndex ? 0 : 1;
        this._visibleObjectCount = visibleObjectCount;
        return visibleObjectCount;
    }
    draw(pass, viewportData) {
        if (this._visibleObjectCount <= 0) {
            throw new BugIndicatingError('Attempt to draw 0 objects');
        }
        pass.draw(quadVertices.length / 2, this._visibleObjectCount);
    }
}
function parseCssFontWeight(value) {
    switch (value) {
        case 'lighter':
        case 'normal': return 400;
        case 'bolder':
        case 'bold': return 700;
    }
    return parseInt(value);
}
function parseCssOpacity(value) {
    if (value.endsWith('%')) {
        return parseFloat(value.substring(0, value.length - 1)) / 100;
    }
    if (value.match(/^\d+(?:\.\d*)/)) {
        return parseFloat(value);
    }
    return 1;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld3BvcnRSZW5kZXJTdHJhdGVneS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci9ncHUvcmVuZGVyU3RyYXRlZ3kvdmlld3BvcnRSZW5kZXJTdHJhdGVneS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDbEUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3pELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUMzRCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFRdEUsT0FBTyxFQUFFLHNCQUFzQixFQUEwQixNQUFNLHdCQUF3QixDQUFDO0FBRXhGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUNuRCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFFOUMsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNCQUFzQixDQUFDO0FBQ3RELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBQzdELE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBRTlFLElBQVcsU0FJVjtBQUpELFdBQVcsU0FBUztJQUNuQiw2REFBa0IsQ0FBQTtJQUNsQixnR0FBb0MsQ0FBQTtJQUNwQyw0RkFBa0MsQ0FBQTtBQUNuQyxDQUFDLEVBSlUsU0FBUyxLQUFULFNBQVMsUUFJbkI7QUFFRCxJQUFXLGNBU1Y7QUFURCxXQUFXLGNBQWM7SUFDeEIsdUVBQWtCLENBQUE7SUFDbEIs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