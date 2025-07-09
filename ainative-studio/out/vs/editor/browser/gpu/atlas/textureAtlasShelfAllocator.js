/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { BugIndicatingError } from '../../../../base/common/errors.js';
import { ensureNonNullable } from '../gpuUtils.js';
/**
 * The shelf allocator is a simple allocator that places glyphs in rows, starting a new row when the
 * current row is full. Due to its simplicity, it can waste space but it is very fast.
 */
export class TextureAtlasShelfAllocator {
    constructor(_canvas, _textureIndex) {
        this._canvas = _canvas;
        this._textureIndex = _textureIndex;
        this._currentRow = {
            x: 0,
            y: 0,
            h: 0
        };
        /** A set of all glyphs allocated, this is only tracked to enable debug related functionality */
        this._allocatedGlyphs = new Set();
        this._nextIndex = 0;
        this._ctx = ensureNonNullable(this._canvas.getContext('2d', {
            willReadFrequently: true
        }));
    }
    allocate(rasterizedGlyph) {
        // The glyph does not fit into the atlas page
        const glyphWidth = rasterizedGlyph.boundingBox.right - rasterizedGlyph.boundingBox.left + 1;
        const glyphHeight = rasterizedGlyph.boundingBox.bottom - rasterizedGlyph.boundingBox.top + 1;
        if (glyphWidth > this._canvas.width || glyphHeight > this._canvas.height) {
            throw new BugIndicatingError('Glyph is too large for the atlas page');
        }
        // Finalize and increment row if it doesn't fix horizontally
        if (rasterizedGlyph.boundingBox.right - rasterizedGlyph.boundingBox.left + 1 > this._canvas.width - this._currentRow.x) {
            this._currentRow.x = 0;
            this._currentRow.y += this._currentRow.h;
            this._currentRow.h = 1;
        }
        // Return undefined if there isn't any room left
        if (this._currentRow.y + rasterizedGlyph.boundingBox.bottom - rasterizedGlyph.boundingBox.top + 1 > this._canvas.height) {
            return undefined;
        }
        // Draw glyph
        this._ctx.drawImage(rasterizedGlyph.source, 
        // source
        rasterizedGlyph.boundingBox.left, rasterizedGlyph.boundingBox.top, glyphWidth, glyphHeight, 
        // destination
        this._currentRow.x, this._currentRow.y, glyphWidth, glyphHeight);
        // Create glyph object
        const glyph = {
            pageIndex: this._textureIndex,
            glyphIndex: this._nextIndex++,
            x: this._currentRow.x,
            y: this._currentRow.y,
            w: glyphWidth,
            h: glyphHeight,
            originOffsetX: rasterizedGlyph.originOffset.x,
            originOffsetY: rasterizedGlyph.originOffset.y,
            fontBoundingBoxAscent: rasterizedGlyph.fontBoundingBoxAscent,
            fontBoundingBoxDescent: rasterizedGlyph.fontBoundingBoxDescent,
        };
        // Shift current row
        this._currentRow.x += glyphWidth;
        this._currentRow.h = Math.max(this._currentRow.h, glyphHeight);
        // Set the glyph
        this._allocatedGlyphs.add(glyph);
        return glyph;
    }
    getUsagePreview() {
        const w = this._canvas.width;
        const h = this._canvas.height;
        const canvas = new OffscreenCanvas(w, h);
        const ctx = ensureNonNullable(canvas.getContext('2d'));
        ctx.fillStyle = "#808080" /* UsagePreviewColors.Unused */;
        ctx.fillRect(0, 0, w, h);
        const rowHeight = new Map(); // y -> h
        const rowWidth = new Map(); // y -> w
        for (const g of this._allocatedGlyphs) {
            rowHeight.set(g.y, Math.max(rowHeight.get(g.y) ?? 0, g.h));
            rowWidth.set(g.y, Math.max(rowWidth.get(g.y) ?? 0, g.x + g.w));
        }
        for (const g of this._allocatedGlyphs) {
            ctx.fillStyle = "#4040FF" /* UsagePreviewColors.Used */;
            ctx.fillRect(g.x, g.y, g.w, g.h);
            ctx.fillStyle = "#FF0000" /* UsagePreviewColors.Wasted */;
            ctx.fillRect(g.x, g.y + g.h, g.w, rowHeight.get(g.y) - g.h);
        }
        for (const [rowY, rowW] of rowWidth.entries()) {
            if (rowY !== this._currentRow.y) {
                ctx.fillStyle = "#FF0000" /* UsagePreviewColors.Wasted */;
                ctx.fillRect(rowW, rowY, w - rowW, rowHeight.get(rowY));
            }
        }
        return canvas.convertToBlob();
    }
    getStats() {
        const w = this._canvas.width;
        const h = this._canvas.height;
        let usedPixels = 0;
        let wastedPixels = 0;
        const totalPixels = w * h;
        const rowHeight = new Map(); // y -> h
        const rowWidth = new Map(); // y -> w
        for (const g of this._allocatedGlyphs) {
            rowHeight.set(g.y, Math.max(rowHeight.get(g.y) ?? 0, g.h));
            rowWidth.set(g.y, Math.max(rowWidth.get(g.y) ?? 0, g.x + g.w));
        }
        for (const g of this._allocatedGlyphs) {
            usedPixels += g.w * g.h;
            wastedPixels += g.w * (rowHeight.get(g.y) - g.h);
        }
        for (const [rowY, rowW] of rowWidth.entries()) {
            if (rowY !== this._currentRow.y) {
                wastedPixels += (w - rowW) * rowHeight.get(rowY);
            }
        }
        return [
            `page${this._textureIndex}:`,
            `     Total: ${totalPixels} (${w}x${h})`,
            `      Used: ${usedPixels} (${((usedPixels / totalPixels) * 100).toPrecision(2)}%)`,
            `    Wasted: ${wastedPixels} (${((wastedPixels / totalPixels) * 100).toPrecision(2)}%)`,
            `Efficiency: ${((usedPixels / (usedPixels + wastedPixels)) * 100).toPrecision(2)}%`,
        ].join('\n');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dHVyZUF0bGFzU2hlbGZBbGxvY2F0b3IuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvZ3B1L2F0bGFzL3RleHR1cmVBdGxhc1NoZWxmQWxsb2NhdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdCQUFnQixDQUFDO0FBSW5EOzs7R0FHRztBQUNILE1BQU0sT0FBTywwQkFBMEI7SUFldEMsWUFDa0IsT0FBd0IsRUFDeEIsYUFBcUI7UUFEckIsWUFBTyxHQUFQLE9BQU8sQ0FBaUI7UUFDeEIsa0JBQWEsR0FBYixhQUFhLENBQVE7UUFiL0IsZ0JBQVcsR0FBdUI7WUFDekMsQ0FBQyxFQUFFLENBQUM7WUFDSixDQUFDLEVBQUUsQ0FBQztZQUNKLENBQUMsRUFBRSxDQUFDO1NBQ0osQ0FBQztRQUVGLGdHQUFnRztRQUMvRSxxQkFBZ0IsR0FBMEMsSUFBSSxHQUFHLEVBQUUsQ0FBQztRQUU3RSxlQUFVLEdBQUcsQ0FBQyxDQUFDO1FBTXRCLElBQUksQ0FBQyxJQUFJLEdBQUcsaUJBQWlCLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFO1lBQzNELGtCQUFrQixFQUFFLElBQUk7U0FDeEIsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRU0sUUFBUSxDQUFDLGVBQWlDO1FBQ2hELDZDQUE2QztRQUM3QyxNQUFNLFVBQVUsR0FBRyxlQUFlLENBQUMsV0FBVyxDQUFDLEtBQUssR0FBRyxlQUFlLENBQUMsV0FBVyxDQUFDLElBQUksR0FBRyxDQUFDLENBQUM7UUFDNUYsTUFBTSxXQUFXLEdBQUcsZUFBZSxD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