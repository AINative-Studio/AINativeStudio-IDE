/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { getActiveWindow } from '../../../../base/browser/dom.js';
import { BugIndicatingError } from '../../../../base/common/errors.js';
import { NKeyMap } from '../../../../base/common/map.js';
import { ensureNonNullable } from '../gpuUtils.js';
/**
 * The slab allocator is a more complex allocator that places glyphs in square slabs of a fixed
 * size. Slabs are defined by a small range of glyphs sizes they can house, this places like-sized
 * glyphs in the same slab which reduces wasted space.
 *
 * Slabs also may contain "unused" regions on the left and bottom depending on the size of the
 * glyphs they include. This space is used to place very thin or short glyphs, which would otherwise
 * waste a lot of space in their own slab.
 */
export class TextureAtlasSlabAllocator {
    constructor(_canvas, _textureIndex, options) {
        this._canvas = _canvas;
        this._textureIndex = _textureIndex;
        this._slabs = [];
        this._activeSlabsByDims = new NKeyMap();
        this._unusedRects = [];
        this._openRegionsByHeight = new Map();
        this._openRegionsByWidth = new Map();
        /** A set of all glyphs allocated, this is only tracked to enable debug related functionality */
        this._allocatedGlyphs = new Set();
        this._nextIndex = 0;
        this._ctx = ensureNonNullable(this._canvas.getContext('2d', {
            willReadFrequently: true
        }));
        this._slabW = Math.min(options?.slabW ?? (64 << Math.max(Math.floor(getActiveWindow().devicePixelRatio) - 1, 0)), this._canvas.width);
        this._slabH = Math.min(options?.slabH ?? this._slabW, this._canvas.height);
        this._slabsPerRow = Math.floor(this._canvas.width / this._slabW);
        this._slabsPerColumn = Math.floor(this._canvas.height / this._slabH);
    }
    allocate(rasterizedGlyph) {
        // Find ideal slab, creating it if there is none suitable
        const glyphWidth = rasterizedGlyph.boundingBox.right - rasterizedGlyph.boundingBox.left + 1;
        const glyphHeight = rasterizedGlyph.boundingBox.bottom - rasterizedGlyph.boundingBox.top + 1;
        // The glyph does not fit into the atlas page, glyphs should never be this large in practice
        if (glyphWidth > this._canvas.width || glyphHeight > this._canvas.height) {
            throw new BugIndicatingError('Glyph is too large for the atlas page');
        }
        // The glyph does not fit into a slab
        if (glyphWidth > this._slabW || glyphHeight > this._slabH) {
            // Only if this is the allocator's first glyph, resize the slab size to fit the glyph.
            if (this._allocatedGlyphs.size > 0) {
                return undefined;
            }
            // Find the largest power of 2 devisor that the glyph fits into, this ensure there is no
            // wasted space outside the allocated slabs.
            let sizeCandidate = this._canvas.width;
            while (glyphWidth < sizeCandidate / 2 && glyphHeight < sizeCandidate / 2) {
                sizeCandidate /= 2;
            }
            this._slabW = sizeCandidate;
            this._slabH = sizeCandidate;
            this._slabsPerRow = Math.floor(this._canvas.width / this._slabW);
            this._slabsPerColumn = Math.floor(this._canvas.height / this._slabH);
        }
        // const dpr = getActiveWindow().devicePixelRatio;
        // TODO: Include font size as well as DPR in nearestXPixels calculation
        // Round slab glyph dimensions to the nearest x pixels, where x scaled with device pixel ratio
        // const nearestXPixels = Math.max(1, Math.floor(dpr / 0.5));
        // const nearestXPixels = Math.max(1, Math.floor(dpr));
        const desiredSlabSize = {
            // Nearest square number
            // TODO: This can probably be optimized
            // w: 1 << Math.ceil(Math.sqrt(glyphWidth)),
            // h: 1 << Math.ceil(Math.sqrt(glyphHeight)),
            // Nearest x px
            // w: Math.ceil(glyphWidth / nearestXPixels) * nearestXPixels,
            // h: Math.ceil(glyphHeight / nearestXPixels) * nearestXPixels,
            // Round odd numbers up
            // w: glyphWidth % 0 === 1 ? glyphWidth + 1 : glyphWidth,
            // h: glyphHeight % 0 === 1 ? glyphHeight + 1 : glyphHeight,
            // Exact number only
            w: glyphWidth,
            h: glyphHeight,
        };
        // Get any existing slab
        let slab = this._activeSlabsByDims.get(desiredSlabSize.w, desiredSlabSize.h);
        // Check if the slab is full
        if (slab) {
            const glyphsPerSlab = Math.floor(this._slabW / slab.entryW) * Math.floor(this._slabH / slab.entryH);
            if (slab.count >= glyphsPerSlab) {
                slab = undefined;
            }
        }
        let dx;
        let dy;
        // Search for suitable space in unused rectangles
        if (!slab) {
            // Only check availability for the smallest side
            if (glyphWidth < glyphHeight) {
                const openRegions = this._openRegionsByWidth.get(glyphWidth);
                if (openRegions?.length) {
                    // TODO: Don't search everything?
                    // Search from the end so we can typically pop it off the stack
                    for (let i = openRegions.length - 1; i >= 0; i--) {
                        const r = openRegions[i];
                        if (r.w >= glyphWidth && r.h >= glyphHeight) {
                            dx = r.x;
                            dy = r.y;
                            if (glyphWidth < r.w) {
                                this._unusedRects.push({
                                    x: r.x + glyphWidth,
                                    y: r.y,
                                    w: r.w - glyphWidth,
                                    h: glyphHeight
                                });
                            }
                            r.y += glyphHeight;
                            r.h -= glyphHeight;
                            if (r.h === 0) {
                                if (i === openRegions.length - 1) {
                                    openRegions.pop();
                                }
                                else {
                                    this._unusedRects.splice(i, 1);
                                }
                            }
                            break;
                        }
                    }
                }
            }
            else {
                const openRegions = this._openRegionsByHeight.get(glyphHeight);
                if (openRegions?.length) {
                    // TODO: Don't search everything?
                    // Search from the end so we can typically pop it off the stack
                    for (let i = openRegions.length - 1; i >= 0; i--) {
                        const r = openRegions[i];
                        if (r.w >= glyphWidth && r.h >= glyphHeight) {
                            dx = r.x;
                            dy = r.y;
                            if (glyphHeight < r.h) {
                                this._unusedRects.push({
                                    x: r.x,
                                    y: r.y + glyphHeight,
                                    w: glyphWidth,
                                    h: r.h - glyphHeight
                                });
                            }
                            r.x += glyphWidth;
                            r.w -= glyphWidth;
                            if (r.h === 0) {
                                if (i === openRegions.length - 1) {
                                    openRegions.pop();
                                }
                                else {
                                    this._unusedRects.splice(i, 1);
                                }
                            }
                            break;
                        }
                    }
                }
            }
        }
        // Create a new slab
        if (dx === undefined || dy === undefined) {
            if (!slab) {
                if (this._slabs.length >= this._slabsPerRow * this._slabsPerColumn) {
                    return undefined;
                }
                slab = {
                    x: Math.floor(this._slabs.length % this._slabsPerRow) * this._slabW,
                    y: Math.floor(this._slabs.length / this._slabsPerRow) * this._slabH,
                    entryW: desiredSlabSize.w,
                    entryH: desiredSlabSize.h,
                    count: 0
                };
                // Track unused regions to use for small glyphs
                // +-------------+----+
                // |             |    |
                // |             |    | <- Unused W region
                // |             |    |
                // |-------------+----+
                // |                  | <- Unused H region
                // +------------------+
                const unusedW = this._slabW % slab.entryW;
                const unusedH = this._slabH % slab.entryH;
                if (unusedW) {
                    addEntryToMapArray(this._openRegionsByWidth, unusedW, {
                        x: slab.x + this._slabW - unusedW,
                        w: unusedW,
                        y: slab.y,
                        h: this._slabH - (unusedH ?? 0)
                    });
                }
                if (unusedH) {
                    addEntryToMapArray(this._openRegionsByHeight, unusedH, {
                        x: slab.x,
                        w: this._slabW,
                        y: slab.y + this._slabH - unusedH,
                        h: unusedH
                    });
                }
                this._slabs.push(slab);
                this._activeSlabsByDims.set(slab, desiredSlabSize.w, desiredSlabSize.h);
            }
            const glyphsPerRow = Math.floor(this._slabW / slab.entryW);
            dx = slab.x + Math.floor(slab.count % glyphsPerRow) * slab.entryW;
            dy = slab.y + Math.floor(slab.count / glyphsPerRow) * slab.entryH;
            // Shift current row
            slab.count++;
        }
        // Draw glyph
        this._ctx.drawImage(rasterizedGlyph.source, 
        // source
        rasterizedGlyph.boundingBox.left, rasterizedGlyph.boundingBox.top, glyphWidth, glyphHeight, 
        // destination
        dx, dy, glyphWidth, glyphHeight);
        // Create glyph object
        const glyph = {
            pageIndex: this._textureIndex,
            glyphIndex: this._nextIndex++,
            x: dx,
            y: dy,
            w: glyphWidth,
            h: glyphHeight,
            originOffsetX: rasterizedGlyph.originOffset.x,
            originOffsetY: rasterizedGlyph.originOffset.y,
            fontBoundingBoxAscent: rasterizedGlyph.fontBoundingBoxAscent,
            fontBoundingBoxDescent: rasterizedGlyph.fontBoundingBoxDescent,
        };
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
        let slabEntryPixels = 0;
        let usedPixels = 0;
        let slabEdgePixels = 0;
        let restrictedPixels = 0;
        const slabW = 64 << (Math.floor(getActiveWindow().devicePixelRatio) - 1);
        const slabH = slabW;
        // Draw wasted underneath glyphs first
        for (const slab of this._slabs) {
            let x = 0;
            let y = 0;
            for (let i = 0; i < slab.count; i++) {
                if (x + slab.entryW > slabW) {
                    x = 0;
                    y += slab.entryH;
                }
                ctx.fillStyle = "#FF0000" /* UsagePreviewColors.Wasted */;
                ctx.fillRect(slab.x + x, slab.y + y, slab.entryW, slab.entryH);
                slabEntryPixels += slab.entryW * slab.entryH;
                x += slab.entryW;
            }
            const entriesPerRow = Math.floor(slabW / slab.entryW);
            const entriesPerCol = Math.floor(slabH / slab.entryH);
            const thisSlabPixels = slab.entryW * entriesPerRow * slab.entryH * entriesPerCol;
            slabEdgePixels += (slabW * slabH) - thisSlabPixels;
        }
        // Draw glyphs
        for (const g of this._allocatedGlyphs) {
            usedPixels += g.w * g.h;
            ctx.fillStyle = "#4040FF" /* UsagePreviewColors.Used */;
            ctx.fillRect(g.x, g.y, g.w, g.h);
        }
        // Draw unused space on side
        const unusedRegions = Array.from(this._openRegionsByWidth.values()).flat().concat(Array.from(this._openRegionsByHeight.values()).flat());
        for (const r of unusedRegions) {
            ctx.fillStyle = "#FF000088" /* UsagePreviewColors.Restricted */;
            ctx.fillRect(r.x, r.y, r.w, r.h);
            restrictedPixels += r.w * r.h;
        }
        // Overlay actual glyphs on top
        ctx.globalAlpha = 0.5;
        ctx.drawImage(this._canvas, 0, 0);
        ctx.globalAlpha = 1;
        return canvas.convertToBlob();
    }
    getStats() {
        const w = this._canvas.width;
        const h = this._canvas.height;
        let slabEntryPixels = 0;
        let usedPixels = 0;
        let slabEdgePixels = 0;
        let wastedPixels = 0;
        let restrictedPixels = 0;
        const totalPixels = w * h;
        const slabW = 64 << (Math.floor(getActiveWindow().devicePixelRatio) - 1);
        const slabH = slabW;
        // Draw wasted underneath glyphs first
        for (const slab of this._slabs) {
            let x = 0;
            let y = 0;
            for (let i = 0; i < slab.count; i++) {
                if (x + slab.entryW > slabW) {
                    x = 0;
                    y += slab.entryH;
                }
                slabEntryPixels += slab.entryW * slab.entryH;
                x += slab.entryW;
            }
            const entriesPerRow = Math.floor(slabW / slab.entryW);
            const entriesPerCol = Math.floor(slabH / slab.entryH);
            const thisSlabPixels = slab.entryW * entriesPerRow * slab.entryH * entriesPerCol;
            slabEdgePixels += (slabW * slabH) - thisSlabPixels;
        }
        // Draw glyphs
        for (const g of this._allocatedGlyphs) {
            usedPixels += g.w * g.h;
        }
        // Draw unused space on side
        const unusedRegions = Array.from(this._openRegionsByWidth.values()).flat().concat(Array.from(this._openRegionsByHeight.values()).flat());
        for (const r of unusedRegions) {
            restrictedPixels += r.w * r.h;
        }
        const edgeUsedPixels = slabEdgePixels - restrictedPixels;
        wastedPixels = slabEntryPixels - (usedPixels - edgeUsedPixels);
        // usedPixels += slabEdgePixels - restrictedPixels;
        const efficiency = usedPixels / (usedPixels + wastedPixels + restrictedPixels);
        return [
            `page[${this._textureIndex}]:`,
            `     Total: ${totalPixels}px (${w}x${h})`,
            `      Used: ${usedPixels}px (${((usedPixels / totalPixels) * 100).toFixed(2)}%)`,
            `    Wasted: ${wastedPixels}px (${((wastedPixels / totalPixels) * 100).toFixed(2)}%)`,
            `Restricted: ${restrictedPixels}px (${((restrictedPixels / totalPixels) * 100).toFixed(2)}%) (hard to allocate)`,
            `Efficiency: ${efficiency === 1 ? '100' : (efficiency * 100).toFixed(2)}%`,
            `     Slabs: ${this._slabs.length} of ${Math.floor(this._canvas.width / slabW) * Math.floor(this._canvas.height / slabH)}`
        ].join('\n');
    }
}
function addEntryToMapArray(map, key, entry) {
    let list = map.get(key);
    if (!list) {
        list = [];
        map.set(key, list);
    }
    list.push(entry);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dHVyZUF0bGFzU2xhYkFsbG9jYXRvci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci9ncHUvYXRsYXMvdGV4dHVyZUF0bGFzU2xhYkFsbG9jYXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDbEUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDdkUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3pELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdCQUFnQixDQUFDO0FBU25EOzs7Ozs7OztHQVFHO0FBQ0gsTUFBTSxPQUFPLHlCQUF5QjtJQXFCckMsWUFDa0IsT0FBd0IsRUFDeEIsYUFBcUIsRUFDdEMsT0FBMEM7UUFGekIsWUFBTyxHQUFQLE9BQU8sQ0FBaUI7UUFDeEIsa0JBQWEsR0FBYixhQUFhLENBQVE7UUFuQnRCLFdBQU0sR0FBd0IsRUFBRSxDQUFDO1FBQ2pDLHVCQUFrQixHQUFpRCxJQUFJLE9BQU8sRUFBRSxDQUFDO1FBRWpGLGlCQUFZLEdBQWtDLEVBQUUsQ0FBQztRQUVqRCx5QkFBb0IsR0FBK0MsSUFBSSxHQUFHLEVBQUUsQ0FBQztRQUM3RSx3QkFBbUIsR0FBK0MsSUFBSSxHQUFHLEVBQUUsQ0FBQztRQUU3RixnR0FBZ0c7UUFDL0UscUJBQWdCLEdBQTBDLElBQUksR0FBRyxFQUFFLENBQUM7UUFNN0UsZUFBVSxHQUFHLENBQUMsQ0FBQztRQU90QixJQUFJLENBQUMsSUFBSSxHQUFHLGlCQUFpQixDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRTtZQUMzRCxrQkFBa0IsRUFBRSxJ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