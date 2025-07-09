/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { getCharIndex } from './minimapCharSheet.js';
import { toUint8 } from '../../../../base/common/uint.js';
export class MinimapCharRenderer {
    constructor(charData, scale) {
        this.scale = scale;
        this._minimapCharRendererBrand = undefined;
        this.charDataNormal = MinimapCharRenderer.soften(charData, 12 / 15);
        this.charDataLight = MinimapCharRenderer.soften(charData, 50 / 60);
    }
    static soften(input, ratio) {
        const result = new Uint8ClampedArray(input.length);
        for (let i = 0, len = input.length; i < len; i++) {
            result[i] = toUint8(input[i] * ratio);
        }
        return result;
    }
    renderChar(target, dx, dy, chCode, color, foregroundAlpha, backgroundColor, backgroundAlpha, fontScale, useLighterFont, force1pxHeight) {
        const charWidth = 1 /* Constants.BASE_CHAR_WIDTH */ * this.scale;
        const charHeight = 2 /* Constants.BASE_CHAR_HEIGHT */ * this.scale;
        const renderHeight = (force1pxHeight ? 1 : charHeight);
        if (dx + charWidth > target.width || dy + renderHeight > target.height) {
            console.warn('bad render request outside image data');
            return;
        }
        const charData = useLighterFont ? this.charDataLight : this.charDataNormal;
        const charIndex = getCharIndex(chCode, fontScale);
        const destWidth = target.width * 4 /* Constants.RGBA_CHANNELS_CNT */;
        const backgroundR = backgroundColor.r;
        const backgroundG = backgroundColor.g;
        const backgroundB = backgroundColor.b;
        const deltaR = color.r - backgroundR;
        const deltaG = color.g - backgroundG;
        const deltaB = color.b - backgroundB;
        const destAlpha = Math.max(foregroundAlpha, backgroundAlpha);
        const dest = target.data;
        let sourceOffset = charIndex * charWidth * charHeight;
        let row = dy * destWidth + dx * 4 /* Constants.RGBA_CHANNELS_CNT */;
        for (let y = 0; y < renderHeight; y++) {
            let column = row;
            for (let x = 0; x < charWidth; x++) {
                const c = (charData[sourceOffset++] / 255) * (foregroundAlpha / 255);
                dest[column++] = backgroundR + deltaR * c;
                dest[column++] = backgroundG + deltaG * c;
                dest[column++] = backgroundB + deltaB * c;
                dest[column++] = destAlpha;
            }
            row += destWidth;
        }
    }
    blockRenderChar(target, dx, dy, color, foregroundAlpha, backgroundColor, backgroundAlpha, force1pxHeight) {
        const charWidth = 1 /* Constants.BASE_CHAR_WIDTH */ * this.scale;
        const charHeight = 2 /* Constants.BASE_CHAR_HEIGHT */ * this.scale;
        const renderHeight = (force1pxHeight ? 1 : charHeight);
        if (dx + charWidth > target.width || dy + renderHeight > target.height) {
            console.warn('bad render request outside image data');
            return;
        }
        const destWidth = target.width * 4 /* Constants.RGBA_CHANNELS_CNT */;
        const c = 0.5 * (foregroundAlpha / 255);
        const backgroundR = backgroundColor.r;
        const backgroundG = backgroundColor.g;
        const backgroundB = backgroundColor.b;
        const deltaR = color.r - backgroundR;
        const deltaG = color.g - backgroundG;
        const deltaB = color.b - backgroundB;
        const colorR = backgroundR + deltaR * c;
        const colorG = backgroundG + deltaG * c;
        const colorB = backgroundB + deltaB * c;
        const destAlpha = Math.max(foregroundAlpha, backgroundAlpha);
        const dest = target.data;
        let row = dy * destWidth + dx * 4 /* Constants.RGBA_CHANNELS_CNT */;
        for (let y = 0; y < renderHeight; y++) {
            let column = row;
            for (let x = 0; x < charWidth; x++) {
                dest[column++] = colorR;
                dest[column++] = colorG;
                dest[column++] = colorB;
                dest[column++] = destAlpha;
            }
            row += destWidth;
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWluaW1hcENoYXJSZW5kZXJlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci92aWV3UGFydHMvbWluaW1hcC9taW5pbWFwQ2hhclJlbmRlcmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBYSxZQUFZLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUNoRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFFMUQsTUFBTSxPQUFPLG1CQUFtQjtJQU0vQixZQUFZLFFBQTJCLEVBQWtCLEtBQWE7UUFBYixVQUFLLEdBQUwsS0FBSyxDQUFRO1FBTHRFLDhCQUF5QixHQUFTLFNBQVMsQ0FBQztRQU0zQyxJQUFJLENBQUMsY0FBYyxHQUFHLG1CQUFtQixDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDO1FBQ3BFLElBQUksQ0FBQyxhQUFhLEdBQUcsbUJBQW1CLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUM7SUFDcEUsQ0FBQztJQUVPLE1BQU0sQ0FBQyxNQUFNLENBQUMsS0FBd0IsRUFBRSxLQUFhO1FBQzVELE1BQU0sTUFBTSxHQUFHLElBQUksaUJBQWlCLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ25ELEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsR0FBRyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNsRCxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQztRQUN2QyxD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