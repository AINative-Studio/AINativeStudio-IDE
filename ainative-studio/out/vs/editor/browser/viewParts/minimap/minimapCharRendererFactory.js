/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { MinimapCharRenderer } from './minimapCharRenderer.js';
import { allCharCodes } from './minimapCharSheet.js';
import { prebakedMiniMaps } from './minimapPreBaked.js';
import { toUint8 } from '../../../../base/common/uint.js';
/**
 * Creates character renderers. It takes a 'scale' that determines how large
 * characters should be drawn. Using this, it draws data into a canvas and
 * then downsamples the characters as necessary for the current display.
 * This makes rendering more efficient, rather than drawing a full (tiny)
 * font, or downsampling in real-time.
 */
export class MinimapCharRendererFactory {
    /**
     * Creates a new character renderer factory with the given scale.
     */
    static create(scale, fontFamily) {
        // renderers are immutable. By default we'll 'create' a new minimap
        // character renderer whenever we switch editors, no need to do extra work.
        if (this.lastCreated && scale === this.lastCreated.scale && fontFamily === this.lastFontFamily) {
            return this.lastCreated;
        }
        let factory;
        if (prebakedMiniMaps[scale]) {
            factory = new MinimapCharRenderer(prebakedMiniMaps[scale](), scale);
        }
        else {
            factory = MinimapCharRendererFactory.createFromSampleData(MinimapCharRendererFactory.createSampleData(fontFamily).data, scale);
        }
        this.lastFontFamily = fontFamily;
        this.lastCreated = factory;
        return factory;
    }
    /**
     * Creates the font sample data, writing to a canvas.
     */
    static createSampleData(fontFamily) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.style.height = `${16 /* Constants.SAMPLED_CHAR_HEIGHT */}px`;
        canvas.height = 16 /* Constants.SAMPLED_CHAR_HEIGHT */;
        canvas.width = 96 /* Constants.CHAR_COUNT */ * 10 /* Constants.SAMPLED_CHAR_WIDTH */;
        canvas.style.width = 96 /* Constants.CHAR_COUNT */ * 10 /* Constants.SAMPLED_CHAR_WIDTH */ + 'px';
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${16 /* Constants.SAMPLED_CHAR_HEIGHT */}px ${fontFamily}`;
        ctx.textBaseline = 'middle';
        let x = 0;
        for (const code of allCharCodes) {
            ctx.fillText(String.fromCharCode(code), x, 16 /* Constants.SAMPLED_CHAR_HEIGHT */ / 2);
            x += 10 /* Constants.SAMPLED_CHAR_WIDTH */;
        }
        return ctx.getImageData(0, 0, 96 /* Constants.CHAR_COUNT */ * 10 /* Constants.SAMPLED_CHAR_WIDTH */, 16 /* Constants.SAMPLED_CHAR_HEIGHT */);
    }
    /**
     * Creates a character renderer from the canvas sample data.
     */
    static createFromSampleData(source, scale) {
        const expectedLength = 16 /* Constants.SAMPLED_CHAR_HEIGHT */ * 10 /* Constants.SAMPLED_CHAR_WIDTH */ * 4 /* Constants.RGBA_CHANNELS_CNT */ * 96 /* Constants.CHAR_COUNT */;
        if (source.length !== expectedLength) {
            throw new Error('Unexpected source in MinimapCharRenderer');
        }
        const charData = MinimapCharRendererFactory._downsample(source, scale);
        return new MinimapCharRenderer(charData, scale);
    }
    static _downsampleChar(source, sourceOffset, dest, destOffset, scale) {
        const width = 1 /* Constants.BASE_CHAR_WIDTH */ * scale;
        const height = 2 /* Constants.BASE_CHAR_HEIGHT */ * scale;
        let targetIndex = destOffset;
        let brightest = 0;
        // This is essentially an ad-hoc rescaling algorithm. Standard approaches
        // like bicubic interpolation are awesome for scaling between image sizes,
        // but don't work so well when scaling to very small pixel values, we end
        // up with blurry, indistinct forms.
        //
        // The approach taken here is simply mapping each source pixel to the target
        // pixels, and taking the weighted values for all pixels in each, and then
        // averaging them out. Finally we apply an intensity boost in _downsample,
        // since when scaling to the smallest pixel sizes there's more black space
        // which causes characters to be much less distinct.
        for (let y = 0; y < height; y++) {
            // 1. For this destination pixel, get the source pixels we're sampling
            // from (x1, y1) to the next pixel (x2, y2)
            const sourceY1 = (y / height) * 16 /* Constants.SAMPLED_CHAR_HEIGHT */;
            const sourceY2 = ((y + 1) / height) * 16 /* Constants.SAMPLED_CHAR_HEIGHT */;
            for (let x = 0; x < width; x++) {
                const sourceX1 = (x / width) * 10 /* Constants.SAMPLED_CHAR_WIDTH */;
                const sourceX2 = ((x + 1) / width) * 10 /* Constants.SAMPLED_CHAR_WIDTH */;
                // 2. Sample all of them, summing them up and weighting them. Similar
                // to bilinear interpolation.
                let value = 0;
                let samples = 0;
                for (let sy = sourceY1; sy < sourceY2; sy++) {
                    const sourceRow = sourceOffset + Math.floor(sy) * 3840 /* Constants.RGBA_SAMPLED_ROW_WIDTH */;
                    const yBalance = 1 - (sy - Math.floor(sy));
                    for (let sx = sourceX1; sx < sourceX2; sx++) {
                        const xBalance = 1 - (sx - Math.floor(sx));
                        const sourceIndex = sourceRow + Math.floor(sx) * 4 /* Constants.RGBA_CHANNELS_CNT */;
                        const weight = xBalance * yBalance;
                        samples += weight;
                        value += ((source[sourceIndex] * source[sourceIndex + 3]) / 255) * weight;
                    }
                }
                const final = value / samples;
                brightest = Math.max(brightest, final);
                dest[targetIndex++] = toUint8(final);
            }
        }
        return brightest;
    }
    static _downsample(data, scale) {
        const pixelsPerCharacter = 2 /* Constants.BASE_CHAR_HEIGHT */ * scale * 1 /* Constants.BASE_CHAR_WIDTH */ * scale;
        const resultLen = pixelsPerCharacter * 96 /* Constants.CHAR_COUNT */;
        const result = new Uint8ClampedArray(resultLen);
        let resultOffset = 0;
        let sourceOffset = 0;
        let brightest = 0;
        for (let charIndex = 0; charIndex < 96 /* Constants.CHAR_COUNT */; charIndex++) {
            brightest = Math.max(brightest, this._downsampleChar(data, sourceOffset, result, resultOffset, scale));
            resultOffset += pixelsPerCharacter;
            sourceOffset += 10 /* Constants.SAMPLED_CHAR_WIDTH */ * 4 /* Constants.RGBA_CHANNELS_CNT */;
        }
        if (brightest > 0) {
            const adjust = 255 / brightest;
            for (let i = 0; i < resultLen; i++) {
                result[i] *= adjust;
            }
        }
        return result;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWluaW1hcENoYXJSZW5kZXJlckZhY3RvcnkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvdmlld1BhcnRzL21pbmltYXAvbWluaW1hcENoYXJSZW5kZXJlckZhY3RvcnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDL0QsT0FBTyxFQUFFLFlBQVksRUFBYSxNQUFNLHVCQUF1QixDQUFDO0FBQ2hFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHNCQUFzQixDQUFDO0FBQ3hELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUUxRDs7Ozs7O0dBTUc7QUFDSCxNQUFNLE9BQU8sMEJBQTBCO0lBSXRDOztPQUVHO0lBQ0ksTUFBTSxDQUFDLE1BQU0sQ0FBQyxLQUFhLEVBQUUsVUFBa0I7UUFDckQsbUVBQW1FO1FBQ25FLDJFQUEyRTtRQUMzRSxJQUFJLElBQUksQ0FBQyxXQUFXLElBQUksS0FBSyxLQUFLLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxJQUFJLFVBQVUsS0FBSyxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7WUFDaEcsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDO1FBQ3pCLENBQUM7UUFFRCxJQUFJLE9BQTRCLENBQUM7UUFDakMsSUFBSSxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQzdCLE9BQU8sR0FBRyxJQUFJLG1CQUFtQixDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDckUsQ0FBQzthQUFNLENBQUM7WUFDUCxPQUFPLEdBQUcsMEJBQTBCLENBQUMsb0JBQW9CLENBQ3hELDBCQUEw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