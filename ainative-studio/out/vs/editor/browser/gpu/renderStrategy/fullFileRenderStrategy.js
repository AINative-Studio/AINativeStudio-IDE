/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { getActiveWindow } from '../../../../base/browser/dom.js';
import { Color } from '../../../../base/common/color.js';
import { BugIndicatingError } from '../../../../base/common/errors.js';
import { CursorColumns } from '../../../common/core/cursorColumns.js';
import { createContentSegmenter } from '../contentSegmenter.js';
import { fullFileRenderStrategyWgsl } from './fullFileRenderStrategy.wgsl.js';
import { GPULifecycle } from '../gpuDisposable.js';
import { quadVertices } from '../gpuUtils.js';
import { ViewGpuContext } from '../viewGpuContext.js';
import { BaseRenderStrategy } from './baseRenderStrategy.js';
var Constants;
(function (Constants) {
    Constants[Constants["IndicesPerCell"] = 6] = "IndicesPerCell";
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
 * A render strategy that tracks a large buffer, uploading only dirty lines as they change and
 * leveraging heavy caching. This is the most performant strategy but has limitations around long
 * lines and too many lines.
 */
export class FullFileRenderStrategy extends BaseRenderStrategy {
    /**
     * The hard cap for line count that can be rendered by the GPU renderer.
     */
    static { this.maxSupportedLines = 3000; }
    /**
     * The hard cap for line columns that can be rendered by the GPU renderer.
     */
    static { this.maxSupportedColumns = 200; }
    get bindGroupEntries() {
        return [
            { binding: 1 /* BindingId.Cells */, resource: { buffer: this._cellBindBuffer } },
            { binding: 6 /* BindingId.ScrollOffset */, resource: { buffer: this._scrollOffsetBindBuffer } }
        ];
    }
    constructor(context, viewGpuContext, device, glyphRasterizer) {
        super(context, viewGpuContext, device, glyphRasterizer);
        this.type = 'fullfile';
        this.wgsl = fullFileRenderStrategyWgsl;
        this._activeDoubleBufferIndex = 0;
        this._upToDateLines = [new Set(), new Set()];
        this._visibleObjectCount = 0;
        this._finalRenderedLine = 0;
        this._scrollInitialized = false;
        this._queuedBufferUpdates = [[], []];
        const bufferSize = FullFileRenderStrategy.maxSupportedLines * FullFileRenderStrategy.maxSupportedColumns * 6 /* Constants.IndicesPerCell */ * Float32Array.BYTES_PER_ELEMENT;
        this._cellBindBuffer = this._register(GPULifecycle.createBuffer(this._device, {
            label: 'Monaco full file cell buffer',
            size: bufferSize,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        })).object;
        this._cellValueBuffers = [
            new ArrayBuffer(bufferSize),
            new ArrayBuffer(bufferSize),
        ];
        const scrollOffsetBufferSize = 2;
        this._scrollOffsetBindBuffer = this._register(GPULifecycle.createBuffer(this._device, {
            label: 'Monaco scroll offset buffer',
            size: scrollOffsetBufferSize * Float32Array.BYTES_PER_ELEMENT,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        })).object;
        this._scrollOffsetValueBuffer = new Float32Array(scrollOffsetBufferSize);
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
        this._invalidateAllLines();
        this._queueBufferUpdate(e);
        return true;
    }
    onDecorationsChanged(e) {
        this._invalidateAllLines();
        return true;
    }
    onTokensChanged(e) {
        // TODO: This currently fires for the entire viewport whenever scrolling stops
        //       https://github.com/microsoft/vscode/issues/233942
        for (const range of e.ranges) {
            this._invalidateLineRange(range.fromLineNumber, range.toLineNumber);
        }
        return true;
    }
    onLinesDeleted(e) {
        // TODO: This currently invalidates everything after the deleted line, it could shift the
        //       line data up to retain some up to date lines
        // TODO: This does not invalidate lines that are no longer in the file
        this._invalidateLinesFrom(e.fromLineNumber);
        this._queueBufferUpdate(e);
        return true;
    }
    onLinesInserted(e) {
        // TODO: This currently invalidates everything after the deleted line, it could shift the
        //       line data up to retain some up to date lines
        this._invalidateLinesFrom(e.fromLineNumber);
        return true;
    }
    onLinesChanged(e) {
        this._invalidateLineRange(e.fromLineNumber, e.fromLineNumber + e.count);
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
        this._invalidateAllLines();
        return true;
    }
    onLineMappingChanged(e) {
        this._invalidateAllLines();
        this._queueBufferUpdate(e);
        return true;
    }
    onZonesChanged(e) {
        this._invalidateAllLines();
        this._queueBufferUpdate(e);
        return true;
    }
    // #endregion
    _invalidateAllLines() {
        this._upToDateLines[0].clear();
        this._upToDateLines[1].clear();
    }
    _invalidateLinesFrom(lineNumber) {
        for (const i of [0, 1]) {
            const upToDateLines = this._upToDateLines[i];
            for (const upToDateLine of upToDateLines) {
                if (upToDateLine >= lineNumber) {
                    upToDateLines.delete(upToDateLine);
                }
            }
        }
    }
    _invalidateLineRange(fromLineNumber, toLineNumber) {
        for (let i = fromLineNumber; i <= toLineNumber; i++) {
            this._upToDateLines[0].delete(i);
            this._upToDateLines[1].delete(i);
        }
    }
    reset() {
        this._invalidateAllLines();
        for (const bufferIndex of [0, 1]) {
            // Zero out buffer and upload to GPU to prevent stale rows from rendering
            const buffer = new Float32Array(this._cellValueBuffers[bufferIndex]);
            buffer.fill(0, 0, buffer.length);
            this._device.queue.writeBuffer(this._cellBindBuffer, 0, buffer.buffer, 0, buffer.byteLength);
        }
        this._finalRenderedLine = 0;
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
        // Update cell data
        const cellBuffer = new Float32Array(this._cellValueBuffers[this._activeDoubleBufferIndex]);
        const lineIndexCount = FullFileRenderStrategy.maxSupportedColumns * 6 /* Constants.IndicesPerCell */;
        const upToDateLines = this._upToDateLines[this._activeDoubleBufferIndex];
        let dirtyLineStart = 3000;
        let dirtyLineEnd = 0;
        // Handle any queued buffer updates
        const queuedBufferUpdates = this._queuedBufferUpdates[this._activeDoubleBufferIndex];
        while (queuedBufferUpdates.length) {
            const e = queuedBufferUpdates.shift();
            switch (e.type) {
                // TODO: Refine these cases so we're not throwing away everything
                case 2 /* ViewEventType.ViewConfigurationChanged */:
                case 8 /* ViewEventType.ViewLineMappingChanged */:
                case 17 /* ViewEventType.ViewZonesChanged */: {
                    cellBuffer.fill(0);
                    dirtyLineStart = 1;
                    dirtyLineEnd = Math.max(dirtyLineEnd, this._finalRenderedLine);
                    this._finalRenderedLine = 0;
                    break;
                }
                case 10 /* ViewEventType.ViewLinesDeleted */: {
                    // Shift content below deleted line up
                    const deletedLineContentStartIndex = (e.fromLineNumber - 1) * FullFileRenderStrategy.maxSupportedColumns * 6 /* Constants.IndicesPerCell */;
                    const deletedLineContentEndIndex = (e.toLineNumber) * FullFileRenderStrategy.maxSupportedColumns * 6 /* Constants.IndicesPerCell */;
                    const nullContentStartIndex = (this._finalRenderedLine - (e.toLineNumber - e.fromLineNumber + 1)) * FullFileRenderStrategy.maxSupportedColumns * 6 /* Constants.IndicesPerCell */;
                    cellBuffer.set(cellBuffer.subarray(deletedLineContentEndIndex), deletedLineContentStartIndex);
                    // Zero out content on lines that are no longer valid
                    cellBuffer.fill(0, nullContentStartIndex);
                    // Update dirty lines and final rendered line
                    dirtyLineStart = Math.min(dirtyLineStart, e.fromLineNumber);
                    dirtyLineEnd = Math.max(dirtyLineEnd, this._finalRenderedLine);
                    this._finalRenderedLine -= e.toLineNumber - e.fromLineNumber + 1;
                    break;
                }
            }
        }
        for (y = viewportData.startLineNumber; y <= viewportData.endLineNumber; y++) {
            // Only attempt to render lines that the GPU renderer can handle
            if (!this._viewGpuContext.canRender(viewLineOptions, viewportData, y)) {
                fillStartIndex = ((y - 1) * FullFileRenderStrategy.maxSupportedColumns) * 6 /* Constants.IndicesPerCell */;
                fillEndIndex = (y * FullFileRenderStrategy.maxSupportedColumns) * 6 /* Constants.IndicesPerCell */;
                cellBuffer.fill(0, fillStartIndex, fillEndIndex);
                dirtyLineStart = Math.min(dirtyLineStart, y);
                dirtyLineEnd = Math.max(dirtyLineEnd, y);
                continue;
            }
            // Skip updating the line if it's already up to date
            if (upToDateLines.has(y)) {
                continue;
            }
            dirtyLineStart = Math.min(dirtyLineStart, y);
            dirtyLineEnd = Math.max(dirtyLineEnd, y);
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
                    if (x > FullFileRenderStrategy.maxSupportedColumns) {
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
                        cellIndex = ((y - 1) * FullFileRenderStrategy.maxSupportedColumns + x) * 6 /* Constants.IndicesPerCell */;
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
                    cellIndex = ((y - 1) * FullFileRenderStrategy.maxSupportedColumns + x) * 6 /* Constants.IndicesPerCell */;
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
            fillStartIndex = ((y - 1) * FullFileRenderStrategy.maxSupportedColumns + tokenEndIndex) * 6 /* Constants.IndicesPerCell */;
            fillEndIndex = (y * FullFileRenderStrategy.maxSupportedColumns) * 6 /* Constants.IndicesPerCell */;
            cellBuffer.fill(0, fillStartIndex, fillEndIndex);
            upToDateLines.add(y);
        }
        const visibleObjectCount = (viewportData.endLineNumber - viewportData.startLineNumber + 1) * lineIndexCount;
        // Only write when there is changed data
        dirtyLineStart = Math.min(dirtyLineStart, FullFileRenderStrategy.maxSupportedLines);
        dirtyLineEnd = Math.min(dirtyLineEnd, FullFileRenderStrategy.maxSupportedLines);
        if (dirtyLineStart <= dirtyLineEnd) {
            // Write buffer and swap it out to unblock writes
            this._device.queue.writeBuffer(this._cellBindBuffer, (dirtyLineStart - 1) * lineIndexCount * Float32Array.BYTES_PER_ELEMENT, cellBuffer.buffer, (dirtyLineStart - 1) * lineIndexCount * Float32Array.BYTES_PER_ELEMENT, (dirtyLineEnd - dirtyLineStart + 1) * lineIndexCount * Float32Array.BYTES_PER_ELEMENT);
        }
        this._finalRenderedLine = Math.max(this._finalRenderedLine, dirtyLineEnd);
        this._activeDoubleBufferIndex = this._activeDoubleBufferIndex ? 0 : 1;
        this._visibleObjectCount = visibleObjectCount;
        return visibleObjectCount;
    }
    draw(pass, viewportData) {
        if (this._visibleObjectCount <= 0) {
            throw new BugIndicatingError('Attempt to draw 0 objects');
        }
        pass.draw(quadVertices.length / 2, this._visibleObjectCount, undefined, (viewportData.startLineNumber - 1) * FullFileRenderStrategy.maxSupportedColumns);
    }
    /**
     * Queue updates that need to happen on the active buffer, not just the cache. This will be
     * deferred to when the actual cell buffer is changed since the active buffer could be locked by
     * the GPU which would block the main thread.
     */
    _queueBufferUpdate(e) {
        this._queuedBufferUpdates[0].push(e);
        this._queuedBufferUpdates[1].push(e);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZnVsbEZpbGVSZW5kZXJTdHJhdGVneS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci9ncHUvcmVuZGVyU3RyYXRlZ3kvZnVsbEZpbGVSZW5kZXJTdHJhdGVneS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDbEUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3pELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQVF0RSxPQUFPLEVBQUUsc0JBQXNCLEVBQTBCLE1BQU0sd0JBQXdCLENBQUM7QUFDeEYsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFFOUUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBQ25ELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQUU5QyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFDdEQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFFN0QsSUFBVyxTQUVWO0FBRkQsV0FBVyxTQUFTO0lBQ25CLDZEQUFrQixDQUFBO0FBQ25CLENBQUMsRUFGVSxTQUFTLEtBQVQsU0FBUyxRQUVuQjtBQUVELElBQVcsY0FTVjtBQVRELFdBQVcsY0FBYztJQUN4Qix1RUFBa0IsQ0FBQTtJQUNsQixzRUFBaUQsQ0FBQTtJQUNqRCwyREFBWSxDQUFBO0lBQ1osMkRBQVksQ0FBQTtJQUNaLHVFQUFrQixDQUFBO0lBQ2xCLHVFQUFrQixDQUFBO0lBQ2xCLCtEQUFjLENBQUE7SUFDZCxtRUFBZ0IsQ0FBQTtBQUNqQixDQUFDLEVBVFUsY0FBYyxLQUFkLGNBQWMsUUFTeEI7QUFTRDs7OztHQUlHO0FBQ0gsTUFBTSxPQUFPLHNCQUF1QixTQUFRLGtCQUFrQjtJQUU3RDs7T0FFRzthQUNhLHNCQUFpQixHQUFHLElBQUksQUFBUCxDQUFRO0lBRXpDOztPQUVHO2FBQ2Esd0JBQW1CLEdBQUcsR0FBRyxBQUFOLENBQU87SUF3QjFDLElBQUksZ0JBQWdCO1FBQ25CLE9BQU87WUFDTixFQUFFLE9BQU8seUJBQWlCLEVBQUUsUUFBUSxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxlQUFlLEVBQUUsRUFBRTtZQUN4RSxFQUFFLE9BQU8sZ0NBQXdCLEVBQUUsUUFBUSxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyx1QkFBdUIsRUFBRSxFQUFFO1NBQ3ZGLENBQUM7SUFDSCxDQUFDO0lBRUQsWUFDQyxPQUFvQixFQUNwQixjQUE4QixFQUM5QixNQUFpQixFQUNqQixlQUEyQztRQUUzQyxLQUFLLENBQUMsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLEVBQUUsZUFBZSxDQUFDLENBQUM7UUFuQ2hELFNBQUksR0FBRyxVQUFVLENBQUM7UUFDbEIsU0FBSSxHQUFXLDBCQUEwQixDQUFDO1FBUzNDLDZCQUF3QixHQUFVLENBQUMsQ0FBQztRQUUzQixtQkFBYyxHQUErQixDQUFDLElBQUksR0FBRyxFQUFFLEVBQUUsSUFBSSxHQUFHLEVBQUUsQ0FBQyxDQUFDO1FBQzdFLHdCQUFtQixHQUFXLENBQUMsQ0FBQztRQUNoQyx1QkFBa0IsR0FBVyxDQUFDLENBQUM7UUFJL0IsdUJBQWtCLEdBQVksS0FBSyxDQUFDO1FBRTNCLHlCQUFvQixHQUErQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztRQWlCNUYsTUFBTSxVQUFVLEdBQUcsc0JBQXNCLENBQUMsaUJBQWlCLEdBQUcsc0JBQXNCLENBQUMsbUJBQW1CLG1DQUEyQixHQUFHLFlBQVksQ0FBQyxpQkFBaUIsQ0FBQztRQUNySyxJQUFJLENBQUMsZUFBZSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFO1lBQzdFLEtBQUssRUFBRSw4QkFBOEI7WUFDckMsSUFBSSxFQUFFLFVBQVU7WUFDaEIsS0FBSyxFQUFFLGNBQWMsQ0FBQyxPQUFPLEdBQUcsY0FBYyxDQUFDLFFBQVE7U0FDdkQsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDO1FBQ1gsSUFBSSxDQUFDLGlCQUFpQixHQUFHO1lBQ3hCLElBQUksV0FBVyxDQUFDLFVBQVUsQ0FBQztZQUMzQixJQUFJLFdBQVcsQ0FBQyxVQUFVLENBQUM7U0FDM0IsQ0FBQztRQUVGLE1BQU0sc0JBQXNCLEdBQUcsQ0FBQyxDQUFDO1FBQ2pDLElBQUksQ0FBQyx1QkFBdUIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRTtZQUNyRixLQUFLLEVBQUUsNkJBQTZCO1lBQ3BDLElBQUksRUFBRSxzQkFBc0IsR0FBRyxZQUFZLENBQUMsaUJBQWlCO1lBQzdELEtBQUssRUFBRSxjQUFjLENBQUMsT0FBTyxHQUFHLGNBQWMsQ0FBQyxRQUFRO1NBQ3ZELENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQztRQUNYLElBQUksQ0FBQyx3QkFBd0IsR0FBRyxJQUFJLFlBQVksQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO0lBQzFFLENBQUM7SUFFRCx5QkFBeUI7SUFFekIsMkNBQTJDO0lBQzNDLDRGQUE0RjtJQUM1RixpQ0FBaUM7SUFDakMsOEZBQThGO0lBQzlGLDZGQUE2RjtJQUM3Rix3RkFBd0Y7SUFDeEYsc0NBQXNDO0lBRXRCLHNCQUFzQixDQUFDLENBQWdDO1FBQ3RFLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO1FBQzNCLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMzQixPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7SUFFZSxvQkFBb0IsQ0FBQyxDQUE4QjtRQUNsRSxJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztRQUMzQixPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7SUFFZSxlQUFlLENBQUMsQ0FBeUI7UUFDeEQsOEVBQThFO1FBQzlFLDBEQUEwRDtRQUMxRCxLQUFLLE1BQU0sS0FBSyxJQUFJLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUM5QixJQUFJLENBQUMsb0JBQW9CLENBQUMsS0FBSyxDQUFDLGNBQWMsRUFBRSxLQUFLLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDckUsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztJQUVlLGNBQWMsQ0FBQyxDQUF3QjtRQUN0RCx5RkFBeUY7UUFDekYscURBQXFEO1FBQ3JELHNFQUFzRTtRQUN0RSxJQUFJLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBQzVDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMzQixPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7SUFFZSxlQUFlLENBQUMsQ0FBeUI7UUFDeEQseUZBQXlGO1FBQ3pGLHFEQUFxRDtRQUNyRCxJQUFJLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBQzVDLE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztJQUVlLGNBQWMsQ0FBQyxDQUF3QjtRQUN0RCxJQUFJLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLGNBQWMsRUFBRSxDQUFDLENBQUMsY0FBYyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN4RSxPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7SUFFZSxlQUFlLENBQUMsQ0FBMEI7UUFDekQsTUFBTSxHQUFHLEdBQUcsZUFBZSxFQUFFLENBQUMsZ0JBQWdCLENBQUM7UUFDL0MsSUFBSSxDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLFVBQVUsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxvQkFBb0IsRUFBRSxDQUFDLEdBQUcsR0FBRyxDQUFDO1FBQzVHLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxTQUFTLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxHQUFHLEdBQUcsQ0FBQztRQUMxRyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLHVCQUF1QixFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsd0JBQXdCLENBQUMsQ0FBQztRQUMvRixPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7SUFFZSxjQUFjLENBQUMsQ0FBd0I7UUFDdEQsSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUM7UUFDM0IsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0lBRWUsb0JBQW9CLENBQUMsQ0FBOEI7UUFDbEUsSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUM7UUFDM0IsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzNCLE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztJQUVlLGNBQWMsQ0FBQyxDQUF3QjtRQUN0RCxJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztRQUMzQixJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFM0IsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0lBRUQsYUFBYTtJQUVMLG1CQUFtQjtRQUMxQixJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQy9CLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDaEMsQ0FBQztJQUVPLG9CQUFvQixDQUFDLFVBQWtCO1FBQzlDLEtBQUssTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQztZQUN4QixNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzdDLEtBQUssTUFBTSxZQUFZLElBQUksYUFBYSxFQUFFLENBQUM7Z0JBQzFDLElBQUksWUFBWSxJQUFJLFVBQVUsRUFBRSxDQUFDO29CQUNoQyxhQUFhLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDO2dCQUNwQyxDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRU8sb0JBQW9CLENBQUMsY0FBc0IsRUFBRSxZQUFvQjtRQUN4RSxLQUFLLElBQUksQ0FBQyxHQUFHLGNBQWMsRUFBRSxDQUFDLElBQUksWUFBWSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDckQsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDakMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDbEMsQ0FBQztJQUNGLENBQUM7SUFFRCxLQUFLO1FBQ0osSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUM7UUFDM0IsS0FBSyxNQUFNLFdBQVcsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQ2xDLHlFQUF5RTtZQUN6RSxNQUFNLE1BQU0sR0FBRyxJQUFJLFlBQVksQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQztZQUNyRSxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ2pDLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUMsRUFBRSxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDOUYsQ0FBQztRQUNELElBQUksQ0FBQyxrQkFBa0IsR0FBRyxDQUFDLENBQUM7SUFDN0IsQ0FBQztJQUVELE1BQU0sQ0FBQyxZQUEwQixFQUFFLGVBQWdDO1FBQ2xFLHVGQUF1RjtRQUN2RiwyRkFBMkY7UUFDM0YsMkZBQTJGO1FBQzNGLGtCQUFrQjtRQUVsQixJQUFJLEtBQUssR0FBRyxFQUFFLENBQUM7UUFDZixJQUFJLE9BQTJCLENBQUM7UUFDaEMsSUFBSSxTQUFTLEdBQUcsQ0FBQyxDQUFDO1FBQ2xCLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNWLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNWLElBQUksZUFBZSxHQUFHLENBQUMsQ0FBQztRQUN4QixJQUFJLGVBQWUsR0FBRyxDQUFDLENBQUM7UUFDeEIsSUFBSSxVQUFVLEdBQUcsQ0FBQyxDQUFDO1FBQ25CLElBQUksS0FBdUMsQ0FBQztRQUM1QyxJQUFJLFNBQVMsR0FBRyxDQUFDLENBQUM7UUFFbEIsSUFBSSxlQUFlLEdBQUcsQ0FBQyxDQUFDO1FBQ3hCLElBQUksYUFBYSxHQUFHLENBQUMsQ0FBQztRQUN0QixJQUFJLGFBQWEsR0FBRyxDQUFDLENBQUM7UUFFdEIsSUFBSSxzQkFBMkMsQ0FBQztRQUNoRCxJQUFJLHVCQUEyQyxDQUFDO1FBQ2hELElBQUkseUJBQTZDLENBQUM7UUFFbEQsSUFBSSxRQUErQixDQUFDO1FBQ3BDLElBQUksVUFBNEIsQ0FBQztRQUNqQyxJQUFJLGNBQWMsR0FBRyxDQUFDLENBQUM7UUFDdkIsSUFBSSxZQUFZLEdBQUcsQ0FBQyxDQUFDO1FBRXJCLElBQUksTUFBdUIsQ0FBQztRQUU1QixNQUFNLEdBQUcsR0FBRyxlQUFlLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQztRQUMvQyxJQUFJLGdCQUFtQyxDQUFDO1FBRXhDLElBQUksQ0FBQyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztZQUM5QixJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7WUFDdkIsSUFBSSxDQUFDLGtCQUFrQixHQUFHLElBQUksQ0FBQztRQUNoQyxDQUFDO1FBRUQsbUJBQW1CO1FBQ25CLE1BQU0sVUFBVSxHQUFHLElBQUksWUFBWSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxDQUFDO1FBQzNGLE1BQU0sY0FBYyxHQUFHLHNCQUFzQixDQUFDLG1CQUFtQixtQ0FBMkIsQ0FBQztRQUU3RixNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO1FBQ3pFLElBQUksY0FBYyxHQUFHLElBQUksQ0FBQztRQUMxQixJQUFJLFlBQVksR0FBRyxDQUFDLENBQUM7UUFFckIsbUNBQW1DO1FBQ25DLE1BQU0sbUJBQW1CLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO1FBQ3JGLE9BQU8sbUJBQW1CLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDbkMsTUFBTSxDQUFDLEdBQUcsbUJBQW1CLENBQUMsS0FBSyxFQUFHLENBQUM7WUFDdkMsUUFBUSxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQ2hCLGlFQUFpRTtnQkFDakUsb0RBQTRDO2dCQUM1QyxrREFBMEM7Z0JBQzFDLDRDQUFtQyxDQUFDLENBQUMsQ0FBQztvQkFDckMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFFbkIsY0FBYyxHQUFHLENBQUMsQ0FBQztvQkFDbkIsWUFBWSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO29CQUMvRCxJQUFJLENBQUMsa0JBQWtCLEdBQUcsQ0FBQyxDQUFDO29CQUM1QixNQUFNO2dCQUNQLENBQUM7Z0JBQ0QsNENBQW1DLENBQUMsQ0FBQyxDQUFDO29CQUNyQyxzQ0FBc0M7b0JBQ3RDLE1BQU0sNEJBQTRCLEdBQUcsQ0FBQyxDQUFDLENBQUMsY0FBYyxHQUFHLENBQUMsQ0FBQyxHQUFHLHNCQUFzQixDQUFDLG1CQUFtQixtQ0FBMkIsQ0FBQztvQkFDcEksTUFBTSwwQkFBMEIsR0FBRyxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsR0FBRyxzQkFBc0IsQ0FBQyxtQkFBbUIsbUNBQTJCLENBQUM7b0JBQzVILE1BQU0scUJBQXFCLEdBQUcsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLEdBQUcsQ0FBQyxDQUFDLENBQUMsWUFBWSxHQUFHLENBQUMsQ0FBQyxjQUFjLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxzQkFBc0IsQ0FBQyxtQkFBbUIsbUNBQTJCLENBQUM7b0JBQzFLLFVBQVUsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQywwQkFBMEIsQ0FBQyxFQUFFLDRCQUE0QixDQUFDLENBQUM7b0JBRTlGLHFEQUFxRDtvQkFDckQsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUscUJBQXFCLENBQUMsQ0FBQztvQkFFMUMsNkNBQTZDO29CQUM3QyxjQUFjLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxjQUFjLEVBQUUsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDO29CQUM1RCxZQUFZLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUM7b0JBQy9ELElBQUksQ0FBQyxrQkFBa0IsSUFBSSxDQUFDLENBQUMsWUFBWSxHQUFHLENBQUMsQ0FBQyxjQUFjLEdBQUcsQ0FBQyxDQUFDO29CQUNqRSxNQUFNO2dCQUNQLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUVELEtBQUssQ0FBQyxHQUFHLFlBQVksQ0FBQyxlQUFlLEVBQUUsQ0FBQyxJQUFJLFlBQVksQ0FBQyxhQUFhLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUU3RSxnRUFBZ0U7WUFDaEUsSUFBSSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsU0FBUyxDQUFDLGVBQWUsRUFBRSxZQUFZLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQztnQkFDdkUsY0FBYyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsc0JBQXNCLENBQUMsbUJBQW1CLENBQUMsbUNBQTJCLENBQUM7Z0JBQ25HLFlBQVksR0FBRyxDQUFDLENBQUMsR0FBRyxzQkFBc0IsQ0FBQyxtQkFBbUIsQ0FBQyxtQ0FBMkIsQ0FBQztnQkFDM0YsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsY0FBYyxFQUFFLFlBQVksQ0FBQyxDQUFDO2dCQUVqRCxjQUFjLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxjQUFjLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQzdDLFlBQVksR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFFekMsU0FBUztZQUNWLENBQUM7WUFFRCxvREFBb0Q7WUFDcEQsSUFBSSxhQUFhLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBQzFCLFNBQVM7WUFDVixDQUFDO1lBRUQsY0FBYyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsY0FBYyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQzdDLFlBQVksR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsQ0FBQztZQUV6QyxRQUFRLEdBQUcsWUFBWSxDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3BELFVBQVUsR0FBRyxDQUFDLENBQUM7WUFFZixnQkFBZ0IsR0FBRyxzQkFBc0IsQ0FBQyxRQUFRLEVBQUUsZUFBZSxDQUFDLENBQUM7WUFDckUsU0FBUyxHQUFHLGVBQWUsQ0FBQyxVQUFVLEdBQUcsR0FBRyxDQUFDO1lBQzdDLGVBQWUsR0FBRyxDQUFDLENBQUM7WUFFcEIsTUFBTSxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUM7WUFDekIsZUFBZSxHQUFHLFFBQVEsQ0FBQyxTQUFTLEdBQUcsQ0FBQyxDQUFDO1lBQ3pDLGFBQWEsR0FBRyxDQUFDLENBQUM7WUFDbEIsS0FBSyxJQUFJLFVBQVUsR0FBRyxDQUFDLEVBQUUsU0FBUyxHQUFHLE1BQU0sQ0FBQyxRQUFRLEVBQUUsRUFBRSxVQUFVLEdBQUcsU0FBUyxFQUFFLFVBQVUsRUFBRSxFQUFFLENBQUM7Z0JBQzlGLGFBQWEsR0FBRyxNQUFNLENBQUMsWUFBWSxDQUFDLFVBQVUsQ0FBQyxDQUFDO2dCQUNoRCxJQUFJLGFBQWEsSUFBSSxlQUFlLEVBQUUsQ0FBQztvQkFDdEMsNkRBQTZEO29CQUM3RCxTQUFTO2dCQUNWLENBQUM7Z0JBRUQsYUFBYSxHQUFHLE1BQU0sQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLENBQUM7Z0JBRS9DLEtBQUssQ0FBQyxHQUFHLGVBQWUsRUFBRSxDQUFDLEdBQUcsYUFBYSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7b0JBQ2xELHVEQUF1RDtvQkFDdkQsSUFBSSxDQUFDLEdBQUcsc0JBQXNCLENBQUMsbUJBQW1CLEVBQUUsQ0FBQzt3QkFDcEQsTUFBTTtvQkFDUCxDQUFDO29CQUNELE9BQU8sR0FBRyxnQkFBZ0IsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDaEQsSUFBSSxPQUFPLEtBQUssU0FBUyxFQUFFLENBQUM7d0JBQzNCLFNBQVM7b0JBQ1YsQ0FBQztvQkFDRCxLQUFLLEdBQUcsT0FBTyxDQUFDO29CQUVoQixJQUFJLENBQUMsQ0FBQyxRQUFRLENBQUMsWUFBWSxJQUFJLGVBQWUsQ0FBQyx5QkFBeUIsQ0FBQyxFQUFFLENBQUM7d0JBQzNFLFNBQVMsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUM7b0JBQzlELENBQUM7b0JBRUQsdUJBQXVCLEdBQUcsU0FBUyxDQUFDO29CQUNwQyxzQkFBc0IsR0FBRyxTQUFTLENBQUM7b0JBQ25DLHlCQUF5QixHQUFHLFNBQVMsQ0FBQztvQkFFdEMsZ0VBQWdFO29CQUNoRSxLQUFLLFVBQVUsSUFBSSxRQUFRLENBQUMsaUJBQWlCLEVBQUUsQ0FBQzt3QkFDL0MsMEVBQTBFO3dCQUMxRSx1Q0FBdUM7d0JBQ3ZDLElBQ0MsQ0FBQyxDQUFDLEdBQUcsVUFBVSxDQUFDLEtBQUssQ0FBQyxlQUFlLElBQUksQ0FBQyxHQUFHLFVBQVUsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDOzRCQUM1RSxDQUFDLENBQUMsS0FBSyxVQUFVLENBQUMsS0FBSyxDQUFDLGVBQWUsSUFBSSxDQUFDLEdBQUcsVUFBVSxDQUFDLEtBQUssQ0FBQyxXQUFXLEdBQUcsQ0FBQyxDQUFDOzRCQUNoRixDQUFDLENBQUMsS0FBSyxVQUFVLENBQUMsS0FBSyxDQUFDLGFBQWEsSUFBSSxDQUFDLElBQUksVUFBVSxDQUFDLEtBQUssQ0FBQyxTQUFTLEdBQUcsQ0FBQyxDQUFDLEVBQzVFLENBQUM7NEJBQ0YsU0FBUzt3QkFDVixDQUFDO3dCQUVELE1BQU0sS0FBSyxHQUFHLGNBQWMsQ0FBQywwQkFBMEIsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLFVBQVUsQ0FBQyxlQUFlLENBQUMsQ0FBQzt3QkFDdkksS0FBSyxNQUFNLElBQUksSUFBSSxLQUFLLEVBQUUsQ0FBQzs0QkFDMUIsS0FBSyxNQUFNLENBQUMsSUFBSSxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7Z0NBQzVCLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsQ0FBQztnQ0FDckQsUUFBUSxDQUFDLEVBQUUsQ0FBQztvQ0FDWCxLQUFLLE9BQU8sQ0FBQyxDQUFDLENBQUM7d0NBQ2QsK0VBQStFO3dDQUMvRSxxQkFBcUI7d0NBQ3JCLE1BQU0sV0FBVyxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQzt3Q0FDbEQsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDOzRDQUNsQixNQUFNLElBQUksa0JBQWtCLENBQUMsdUJBQXVCLEdBQUcsS0FBSyxDQUFDLENBQUM7d0NBQy9ELENBQUM7d0NBQ0QsdUJBQXVCLEdBQUcsV0FBVyxDQUFDLGFBQWEsRUFBRSxDQUFDO3dDQUN0RCxNQUFNO29DQUNQLENBQUM7b0NBQ0QsS0FBSyxhQUFhLENBQUMsQ0FBQyxDQUFDO3dDQUNwQixNQUFNLFdBQVcsR0FBRyxrQkFBa0IsQ0FBQyxLQUFLLENBQUMsQ0FBQzt3Q0FDOUMsSUFBSSxXQUFXLElBQUksR0FBRyxFQUFFLENBQUM7NENBQ3hCLHNCQUFzQixHQUFHLElBQUksQ0FBQzs0Q0FDOUIscUVBQXFFO3dDQUN0RSxDQUFDOzZDQUFNLENBQUM7NENBQ1Asc0JBQXNCLEdBQUcsS0FBSyxDQUFDOzRDQUMvQix1RUFBdUU7d0NBQ3hFLENBQUM7d0NBQ0QsTUFBTTtvQ0FDUCxDQUFDO29DQUNELEtBQUssU0FBUyxDQUFDLENBQUMsQ0FBQzt3Q0FDaEIsTUFBTSxXQUFXLEdBQUcsZUFBZSxDQUFDLEtBQUssQ0FBQyxDQUFDO3dDQUMzQyx5QkFBeUIsR0FBRyxXQUFXLENBQUM7d0NBQ3hDLE1BQU07b0NBQ1AsQ0FBQztvQ0FDRCxPQUFPLENBQUMsQ0FBQyxNQUFNLElBQUksa0JBQWtCLENBQUMsb0NBQW9DLENBQUMsQ0FBQztnQ0FDN0UsQ0FBQzs0QkFDRixDQUFDO3dCQUNGLENBQUM7b0JBQ0YsQ0FBQztvQkFFRCxJQUFJLEtBQUssS0FBSyxHQUFHLElBQUksS0FBSyxLQUFLLElBQUksRUFBRSxDQUFDO3dCQUNyQyxtREFBbUQ7d0JBQ25ELFNBQVMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLHNCQUFzQixDQUFDLG1CQUFtQixHQUFHLENBQUMsQ0FBQyxtQ0FBMkIsQ0FBQzt3QkFDbEcsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsU0FBUyxFQUFFLFNBQVMsd0NBQWdDLENBQUMsQ0FBQzt3QkFDekUsK0JBQStCO3dCQUMvQixJQUFJLEtBQUssS0FBSyxJQUFJLEVBQUUsQ0FBQzs0QkFDcEIsMkVBQTJFOzRCQUMzRSxNQUFNLFlBQVksR0FBRyxDQUFDLEdBQUcsVUFBVSxDQUFDOzRCQUNwQyxVQUFVLEdBQUcsYUFBYSxDQUFDLGlCQUFpQixDQUFDLENBQUMsR0FBRyxVQUFVLEVBQUUsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDOzRCQUMvRSxlQUFlLElBQUksU0FBUyxHQUFHLENBQUMsVUFBVSxHQUFHLFlBQVksQ0FBQyxDQUFDOzRCQUMzRCwrREFBK0Q7NEJBQy9ELFVBQVUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO3dCQUNyQixDQUFDOzZCQUFNLENBQUM7NEJBQ1AsZUFBZSxJQUFJLFNBQVMsQ0FBQzt3QkFDOUIsQ0FBQzt3QkFDRCxTQUFTO29CQUNWLENBQUM7b0JBRUQsTUFBTSxvQkFBb0IsR0FBRyxjQUFjLENBQUMsb0JBQW9CLENBQUMsZ0JBQWdCLENBQUMsdUJBQXVCLEVBQUUsc0JBQXNCLEVBQUUseUJBQXlCLENBQUMsQ0FBQztvQkFDOUosS0FBSyxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsZUFBZSxFQUFFLEtBQUssRUFBRSxhQUFhLEVBQUUsb0JBQW9CLEVBQUUsZUFBZSxDQUFDLENBQUM7b0JBRS9ILGVBQWUsR0FBRyxJQUFJLENBQUMsS0FBSztvQkFDM0IsMkNBQTJDO29CQUMzQyxZQUFZLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxHQUFHLFlBQVksQ0FBQyxlQUFlLENBQUMsR0FBRyxHQUFHO3dCQUUzRSxnR0FBZ0c7d0JBQ2hHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxZQUFZLENBQUMsVUFBVSxHQUFHLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxxQkFBcUIsR0FBRyxLQUFLLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQzt3QkFFOUcsK0ZBQStGO3dCQUMvRixtR0FBbUc7d0JBQ25HLFlBQVk7d0JBQ1osS0FBSyxDQUFDLHFCQUFxQixDQUMzQixDQUFDO29CQUVGLFNBQVMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLHNCQUFzQixDQUFDLG1CQUFtQixHQUFHLENBQUMsQ0FBQyxtQ0FBMkIsQ0FBQztvQkFDbEcsVUFBVSxDQUFDLFNBQVMsa0NBQTBCLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQyxDQUFDO29CQUM5RSxVQUFVLENBQUMsU0FBUyxrQ0FBMEIsQ0FBQyxHQUFHLGVBQWUsQ0FBQztvQkFDbEUsVUFBVSxDQUFDLFNBQVMsb0NBQTRCLENBQUMsR0FBRyxLQUFLLENBQUMsVUFBVSxDQUFDO29CQUNyRSxVQUFVLENBQUMsU0FBUyxzQ0FBOEIsQ0FBQyxHQUFHLEtBQUssQ0FBQyxTQUFTLENBQUM7b0JBRXRFLG1EQUFtRDtvQkFDbkQsZUFBZSxJQUFJLFNBQVMsQ0FBQztnQkFDOUIsQ0FBQztnQkFFRCxlQUFlLEdBQUcsYUFBYSxDQUFDO1lBQ2pDLENBQUM7WUFFRCx1QkFBdUI7WUFDdkIsY0FBYyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsc0JBQXNCLENBQUMsbUJBQW1CLEdBQUcsYUFBYSxDQUFDLG1DQUEyQixDQUFDO1lBQ25ILFlBQVksR0FBRyxDQUFDLENBQUMsR0FBRyxzQkFBc0IsQ0FBQyxtQkFBbUIsQ0FBQyxtQ0FBMkIsQ0FBQztZQUMzRixVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxjQUFjLEVBQUUsWUFBWSxDQUFDLENBQUM7WUFFakQsYUFBYSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN0QixDQUFDO1FBRUQsTUFBTSxrQkFBa0IsR0FBRyxDQUFDLFlBQVksQ0FBQyxhQUFhLEdBQUcsWUFBWSxDQUFDLGVBQWUsR0FBRyxDQUFDLENBQUMsR0FBRyxjQUFjLENBQUM7UUFFNUcsd0NBQXdDO1FBQ3hDLGNBQWMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLGNBQWMsRUFBRSxzQkFBc0IsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1FBQ3BGLFlBQVksR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFlBQVksRUFBRSxzQkFBc0IsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1FBQ2hGLElBQUksY0FBYyxJQUFJLFlBQVksRUFBRSxDQUFDO1lBQ3BDLGlEQUFpRDtZQUNqRCxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQzdCLElBQUksQ0FBQyxlQUFlLEVBQ3BCLENBQUMsY0FBYyxHQUFHLENBQUMsQ0FBQyxHQUFHLGNBQWMsR0FBRyxZQUFZLENBQUMsaUJBQWlCLEVBQ3RFLFVBQVUsQ0FBQyxNQUFNLEVBQ2pCLENBQUMsY0FBYyxHQUFHLENBQUMsQ0FBQyxHQUFHLGNBQWMsR0FBRyxZQUFZLENBQUMsaUJBQWlCLEVBQ3RFLENBQUMsWUFBWSxHQUFHLGNBQWMsR0FBRyxDQUFDLENBQUMsR0FBRyxjQUFjLEdBQUcsWUFBWSxDQUFDLGlCQUFpQixDQUNyRixDQUFDO1FBQ0gsQ0FBQztRQUVELElBQUksQ0FBQyxrQkFBa0IsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxZQUFZLENBQUMsQ0FBQztRQUUxRSxJQUFJLENBQUMsd0JBQXdCLEdBQUcsSUFBSSxDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUV0RSxJQUFJLENBQUMsbUJBQW1CLEdBQUcsa0JBQWtCLENBQUM7UUFFOUMsT0FBTyxrQkFBa0IsQ0FBQztJQUMzQixDQUFDO0lBRUQsSUFBSSxDQUFDLElBQTBCLEVBQUUsWUFBMEI7UUFDMUQsSUFBSSxJQUFJLENBQUMsbUJBQW1CLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDbkMsTUFBTSxJQUFJLGtCQUFrQixDQUFDLDJCQUEyQixDQUFDLENBQUM7UUFDM0QsQ0FBQztRQUNELElBQUksQ0FBQyxJQUFJLENBQ1IsWUFBWSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQ3ZCLElBQUksQ0FBQyxtQkFBbUIsRUFDeEIsU0FBUyxFQUNULENBQUMsWUFBWSxDQUFDLGVBQWUsR0FBRyxDQUFDLENBQUMsR0FBRyxzQkFBc0IsQ0FBQyxtQkFBbUIsQ0FDL0UsQ0FBQztJQUNILENBQUM7SUFFRDs7OztPQUlHO0lBQ0ssa0JBQWtCLENBQUMsQ0FBb0I7UUFDOUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNyQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3RDLENBQUM7O0FBR0YsU0FBUyxrQkFBa0IsQ0FBQyxLQUFhO0lBQ3hDLFFBQVEsS0FBSyxFQUFFLENBQUM7UUFDZixLQUFLLFNBQVMsQ0FBQztRQUNmLEtBQUssUUFBUSxDQUFDLENBQUMsT0FBTyxHQUFHLENBQUM7UUFDMUIsS0FBSyxRQUFRLENBQUM7UUFDZCxLQUFLLE1BQU0sQ0FBQyxDQUFDLE9BQU8sR0FBRyxDQUFDO0lBQ3pCLENBQUM7SUFDRCxPQUFPLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUN4QixDQUFDO0FBRUQsU0FBUyxlQUFlLENBQUMsS0FBYTtJQUNyQyxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztRQUN6QixPQUFPLFVBQVUsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDO0lBQy9ELENBQUM7SUFDRCxJQUFJLEtBQUssQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLEVBQUUsQ0FBQztRQUNsQyxPQUFPLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUMxQixDQUFDO0lBQ0QsT0FBTyxDQUFDLENBQUM7QUFDVixDQUFDIn0=