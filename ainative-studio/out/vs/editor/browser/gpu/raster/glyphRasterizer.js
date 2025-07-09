/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { memoize } from '../../../../base/common/decorators.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { isMacintosh } from '../../../../base/common/platform.js';
import { StringBuilder } from '../../../common/core/stringBuilder.js';
import { TokenMetadata } from '../../../common/encodedTokenAttributes.js';
import { ensureNonNullable } from '../gpuUtils.js';
import { ViewGpuContext } from '../viewGpuContext.js';
let nextId = 0;
export class GlyphRasterizer extends Disposable {
    get cacheKey() {
        return `${this.fontFamily}_${this.fontSize}px`;
    }
    constructor(fontSize, fontFamily, devicePixelRatio) {
        super();
        this.fontSize = fontSize;
        this.fontFamily = fontFamily;
        this.devicePixelRatio = devicePixelRatio;
        this.id = nextId++;
        this._workGlyph = {
            source: null,
            boundingBox: {
                left: 0,
                bottom: 0,
                right: 0,
                top: 0,
            },
            originOffset: {
                x: 0,
                y: 0,
            },
            fontBoundingBoxAscent: 0,
            fontBoundingBoxDescent: 0,
        };
        this._workGlyphConfig = { chars: undefined, tokenMetadata: 0, decorationStyleSetId: 0 };
        // TODO: Support workbench.fontAliasing correctly
        this._antiAliasing = isMacintosh ? 'greyscale' : 'subpixel';
        const devicePixelFontSize = Math.ceil(this.fontSize * devicePixelRatio);
        this._canvas = new OffscreenCanvas(devicePixelFontSize * 3, devicePixelFontSize * 3);
        this._ctx = ensureNonNullable(this._canvas.getContext('2d', {
            willReadFrequently: true,
            alpha: this._antiAliasing === 'greyscale',
        }));
        this._ctx.textBaseline = 'top';
        this._ctx.fillStyle = '#FFFFFF';
        this._ctx.font = `${devicePixelFontSize}px ${this.fontFamily}`;
        this._textMetrics = this._ctx.measureText('A');
    }
    /**
     * Rasterizes a glyph. Note that the returned object is reused across different glyphs and
     * therefore is only safe for synchronous access.
     */
    rasterizeGlyph(chars, tokenMetadata, decorationStyleSetId, colorMap) {
        if (chars === '') {
            return {
                source: this._canvas,
                boundingBox: { top: 0, left: 0, bottom: -1, right: -1 },
                originOffset: { x: 0, y: 0 },
                fontBoundingBoxAscent: 0,
                fontBoundingBoxDescent: 0,
            };
        }
        // Check if the last glyph matches the config, reuse if so. This helps avoid unnecessary
        // work when the rasterizer is called multiple times like when the glyph doesn't fit into a
        // page.
        if (this._workGlyphConfig.chars === chars && this._workGlyphConfig.tokenMetadata === tokenMetadata && this._workGlyphConfig.decorationStyleSetId === decorationStyleSetId) {
            return this._workGlyph;
        }
        this._workGlyphConfig.chars = chars;
        this._workGlyphConfig.tokenMetadata = tokenMetadata;
        this._workGlyphConfig.decorationStyleSetId = decorationStyleSetId;
        return this._rasterizeGlyph(chars, tokenMetadata, decorationStyleSetId, colorMap);
    }
    _rasterizeGlyph(chars, tokenMetadata, decorationStyleSetId, colorMap) {
        const devicePixelFontSize = Math.ceil(this.fontSize * this.devicePixelRatio);
        const canvasDim = devicePixelFontSize * 3;
        if (this._canvas.width !== canvasDim) {
            this._canvas.width = canvasDim;
            this._canvas.height = canvasDim;
        }
        this._ctx.save();
        // The sub-pixel x offset is the fractional part of the x pixel coordinate of the cell, this
        // is used to improve the spacing between rendered characters.
        const xSubPixelXOffset = (tokenMetadata & 0b1111) / 10;
        const bgId = TokenMetadata.getBackground(tokenMetadata);
        const bg = colorMap[bgId];
        const decorationStyleSet = ViewGpuContext.decorationStyleCache.getStyleSet(decorationStyleSetId);
        // When SPAA is used, the background color must be present to get the right glyph
        if (this._antiAliasing === 'subpixel') {
            this._ctx.fillStyle = bg;
            this._ctx.fillRect(0, 0, this._canvas.width, this._canvas.height);
        }
        else {
            this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
        }
        const fontSb = new StringBuilder(200);
        const fontStyle = TokenMetadata.getFontStyle(tokenMetadata);
        if (fontStyle & 1 /* FontStyle.Italic */) {
            fontSb.appendString('italic ');
        }
        if (decorationStyleSet?.bold !== undefined) {
            if (decorationStyleSet.bold) {
                fontSb.appendString('bold ');
            }
        }
        else if (fontStyle & 2 /* FontStyle.Bold */) {
            fontSb.appendString('bold ');
        }
        fontSb.appendString(`${devicePixelFontSize}px ${this.fontFamily}`);
        this._ctx.font = fontSb.build();
        // TODO: Support FontStyle.Strikethrough and FontStyle.Underline text decorations, these
        //       need to be drawn manually to the canvas. See xterm.js for "dodging" the text for
        //       underlines.
        const originX = devicePixelFontSize;
        const originY = devicePixelFontSize;
        if (decorationStyleSet?.color !== undefined) {
            this._ctx.fillStyle = `#${decorationStyleSet.color.toString(16).padStart(8, '0')}`;
        }
        else {
            this._ctx.fillStyle = colorMap[TokenMetadata.getForeground(tokenMetadata)];
        }
        this._ctx.textBaseline = 'top';
        if (decorationStyleSet?.opacity !== undefined) {
            this._ctx.globalAlpha = decorationStyleSet.opacity;
        }
        this._ctx.fillText(chars, originX + xSubPixelXOffset, originY);
        this._ctx.restore();
        const imageData = this._ctx.getImageData(0, 0, this._canvas.width, this._canvas.height);
        if (this._antiAliasing === 'subpixel') {
            const bgR = parseInt(bg.substring(1, 3), 16);
            const bgG = parseInt(bg.substring(3, 5), 16);
            const bgB = parseInt(bg.substring(5, 7), 16);
            this._clearColor(imageData, bgR, bgG, bgB);
            this._ctx.putImageData(imageData, 0, 0);
        }
        this._findGlyphBoundingBox(imageData, this._workGlyph.boundingBox);
        // const offset = {
        // 	x: textMetrics.actualBoundingBoxLeft,
        // 	y: textMetrics.actualBoundingBoxAscent
        // };
        // const size = {
        // 	w: textMetrics.actualBoundingBoxRight + textMetrics.actualBoundingBoxLeft,
        // 	y: textMetrics.actualBoundingBoxDescent + textMetrics.actualBoundingBoxAscent,
        // 	wInt: Math.ceil(textMetrics.actualBoundingBoxRight + textMetrics.actualBoundingBoxLeft),
        // 	yInt: Math.ceil(textMetrics.actualBoundingBoxDescent + textMetrics.actualBoundingBoxAscent),
        // };
        // console.log(`${chars}_${fg}`, textMetrics, boundingBox, originX, originY, { width: boundingBox.right - boundingBox.left, height: boundingBox.bottom - boundingBox.top });
        this._workGlyph.source = this._canvas;
        this._workGlyph.originOffset.x = this._workGlyph.boundingBox.left - originX;
        this._workGlyph.originOffset.y = this._workGlyph.boundingBox.top - originY;
        this._workGlyph.fontBoundingBoxAscent = this._textMetrics.fontBoundingBoxAscent;
        this._workGlyph.fontBoundingBoxDescent = this._textMetrics.fontBoundingBoxDescent;
        // const result2: IRasterizedGlyph = {
        // 	source: this._canvas,
        // 	boundingBox: {
        // 		left: Math.floor(originX - textMetrics.actualBoundingBoxLeft),
        // 		right: Math.ceil(originX + textMetrics.actualBoundingBoxRight),
        // 		top: Math.floor(originY - textMetrics.actualBoundingBoxAscent),
        // 		bottom: Math.ceil(originY + textMetrics.actualBoundingBoxDescent),
        // 	},
        // 	originOffset: {
        // 		x: Math.floor(boundingBox.left - originX),
        // 		y: Math.floor(boundingBox.top - originY)
        // 	}
        // };
        // TODO: Verify result 1 and 2 are the same
        // if (result2.boundingBox.left > result.boundingBox.left) {
        // 	debugger;
        // }
        // if (result2.boundingBox.top > result.boundingBox.top) {
        // 	debugger;
        // }
        // if (result2.boundingBox.right < result.boundingBox.right) {
        // 	debugger;
        // }
        // if (result2.boundingBox.bottom < result.boundingBox.bottom) {
        // 	debugger;
        // }
        // if (JSON.stringify(result2.originOffset) !== JSON.stringify(result.originOffset)) {
        // 	debugger;
        // }
        return this._workGlyph;
    }
    _clearColor(imageData, r, g, b) {
        for (let offset = 0; offset < imageData.data.length; offset += 4) {
            // Check exact match
            if (imageData.data[offset] === r &&
                imageData.data[offset + 1] === g &&
                imageData.data[offset + 2] === b) {
                imageData.data[offset + 3] = 0;
            }
        }
    }
    // TODO: Does this even need to happen when measure text is used?
    _findGlyphBoundingBox(imageData, outBoundingBox) {
        const height = this._canvas.height;
        const width = this._canvas.width;
        let found = false;
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const alphaOffset = y * width * 4 + x * 4 + 3;
                if (imageData.data[alphaOffset] !== 0) {
                    outBoundingBox.top = y;
                    found = true;
                    break;
                }
            }
            if (found) {
                break;
            }
        }
        outBoundingBox.left = 0;
        found = false;
        for (let x = 0; x < width; x++) {
            for (let y = 0; y < height; y++) {
                const alphaOffset = y * width * 4 + x * 4 + 3;
                if (imageData.data[alphaOffset] !== 0) {
                    outBoundingBox.left = x;
                    found = true;
                    break;
                }
            }
            if (found) {
                break;
            }
        }
        outBoundingBox.right = width;
        found = false;
        for (let x = width - 1; x >= outBoundingBox.left; x--) {
            for (let y = 0; y < height; y++) {
                const alphaOffset = y * width * 4 + x * 4 + 3;
                if (imageData.data[alphaOffset] !== 0) {
                    outBoundingBox.right = x;
                    found = true;
                    break;
                }
            }
            if (found) {
                break;
            }
        }
        outBoundingBox.bottom = outBoundingBox.top;
        found = false;
        for (let y = height - 1; y >= 0; y--) {
            for (let x = 0; x < width; x++) {
                const alphaOffset = y * width * 4 + x * 4 + 3;
                if (imageData.data[alphaOffset] !== 0) {
                    outBoundingBox.bottom = y;
                    found = true;
                    break;
                }
            }
            if (found) {
                break;
            }
        }
    }
    getTextMetrics(text) {
        return this._ctx.measureText(text);
    }
}
__decorate([
    memoize
], GlyphRasterizer.prototype, "cacheKey", null);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2x5cGhSYXN0ZXJpemVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL2dwdS9yYXN0ZXIvZ2x5cGhSYXN0ZXJpemVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNoRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUN0RSxPQUFPLEVBQWEsYUFBYSxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDckYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFDbkQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNCQUFzQixDQUFDO0FBR3RELElBQUksTUFBTSxHQUFHLENBQUMsQ0FBQztBQUVmLE1BQU0sT0FBTyxlQUFnQixTQUFRLFVBQVU7SUFJOUMsSUFBVyxRQUFRO1FBQ2xCLE9BQU8sR0FBRyxJQUFJLENBQUMsVUFBVSxJQUFJLElBQUksQ0FBQyxRQUFRLElBQUksQ0FBQztJQUNoRCxDQUFDO0lBMkJELFlBQ1UsUUFBZ0IsRUFDaEIsVUFBa0IsRUFDbEIsZ0JBQXdCO1FBRWpDLEtBQUssRUFBRSxDQUFDO1FBSkMsYUFBUSxHQUFSLFFBQVEsQ0FBUTtRQUNoQixlQUFVLEdBQVYsVUFBVSxDQUFRO1FBQ2xCLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBUTtRQW5DbEIsT0FBRSxHQUFHLE1BQU0sRUFBRSxDQUFDO1FBWXRCLGVBQVUsR0FBcUI7WUFDdEMsTUFBTSxFQUFFLElBQUs7WUFDYixX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