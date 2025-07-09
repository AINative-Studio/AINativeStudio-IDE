/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as platform from '../../../base/common/platform.js';
import { EditorFontVariations, EditorOptions, EDITOR_FONT_DEFAULTS } from './editorOptions.js';
import { EditorZoom } from './editorZoom.js';
/**
 * Determined from empirical observations.
 * @internal
 */
export const GOLDEN_LINE_HEIGHT_RATIO = platform.isMacintosh ? 1.5 : 1.35;
/**
 * @internal
 */
export const MINIMUM_LINE_HEIGHT = 8;
export class BareFontInfo {
    /**
     * @internal
     */
    static createFromValidatedSettings(options, pixelRatio, ignoreEditorZoom) {
        const fontFamily = options.get(51 /* EditorOption.fontFamily */);
        const fontWeight = options.get(55 /* EditorOption.fontWeight */);
        const fontSize = options.get(54 /* EditorOption.fontSize */);
        const fontFeatureSettings = options.get(53 /* EditorOption.fontLigatures */);
        const fontVariationSettings = options.get(56 /* EditorOption.fontVariations */);
        const lineHeight = options.get(68 /* EditorOption.lineHeight */);
        const letterSpacing = options.get(65 /* EditorOption.letterSpacing */);
        return BareFontInfo._create(fontFamily, fontWeight, fontSize, fontFeatureSettings, fontVariationSettings, lineHeight, letterSpacing, pixelRatio, ignoreEditorZoom);
    }
    /**
     * @internal
     */
    static createFromRawSettings(opts, pixelRatio, ignoreEditorZoom = false) {
        const fontFamily = EditorOptions.fontFamily.validate(opts.fontFamily);
        const fontWeight = EditorOptions.fontWeight.validate(opts.fontWeight);
        const fontSize = EditorOptions.fontSize.validate(opts.fontSize);
        const fontFeatureSettings = EditorOptions.fontLigatures2.validate(opts.fontLigatures);
        const fontVariationSettings = EditorOptions.fontVariations.validate(opts.fontVariations);
        const lineHeight = EditorOptions.lineHeight.validate(opts.lineHeight);
        const letterSpacing = EditorOptions.letterSpacing.validate(opts.letterSpacing);
        return BareFontInfo._create(fontFamily, fontWeight, fontSize, fontFeatureSettings, fontVariationSettings, lineHeight, letterSpacing, pixelRatio, ignoreEditorZoom);
    }
    /**
     * @internal
     */
    static _create(fontFamily, fontWeight, fontSize, fontFeatureSettings, fontVariationSettings, lineHeight, letterSpacing, pixelRatio, ignoreEditorZoom) {
        if (lineHeight === 0) {
            lineHeight = GOLDEN_LINE_HEIGHT_RATIO * fontSize;
        }
        else if (lineHeight < MINIMUM_LINE_HEIGHT) {
            // Values too small to be line heights in pixels are in ems.
            lineHeight = lineHeight * fontSize;
        }
        // Enforce integer, minimum constraints
        lineHeight = Math.round(lineHeight);
        if (lineHeight < MINIMUM_LINE_HEIGHT) {
            lineHeight = MINIMUM_LINE_HEIGHT;
        }
        const editorZoomLevelMultiplier = 1 + (ignoreEditorZoom ? 0 : EditorZoom.getZoomLevel() * 0.1);
        fontSize *= editorZoomLevelMultiplier;
        lineHeight *= editorZoomLevelMultiplier;
        if (fontVariationSettings === EditorFontVariations.TRANSLATE) {
            if (fontWeight === 'normal' || fontWeight === 'bold') {
                fontVariationSettings = EditorFontVariations.OFF;
            }
            else {
                const fontWeightAsNumber = parseInt(fontWeight, 10);
                fontVariationSettings = `'wght' ${fontWeightAsNumber}`;
                fontWeight = 'normal';
            }
        }
        return new BareFontInfo({
            pixelRatio: pixelRatio,
            fontFamily: fontFamily,
            fontWeight: fontWeight,
            fontSize: fontSize,
            fontFeatureSettings: fontFeatureSettings,
            fontVariationSettings,
            lineHeight: lineHeight,
            letterSpacing: letterSpacing
        });
    }
    /**
     * @internal
     */
    constructor(opts) {
        this._bareFontInfoBrand = undefined;
        this.pixelRatio = opts.pixelRatio;
        this.fontFamily = String(opts.fontFamily);
        this.fontWeight = String(opts.fontWeight);
        this.fontSize = opts.fontSize;
        this.fontFeatureSettings = opts.fontFeatureSettings;
        this.fontVariationSettings = opts.fontVariationSettings;
        this.lineHeight = opts.lineHeight | 0;
        this.letterSpacing = opts.letterSpacing;
    }
    /**
     * @internal
     */
    getId() {
        return `${this.pixelRatio}-${this.fontFamily}-${this.fontWeight}-${this.fontSize}-${this.fontFeatureSettings}-${this.fontVariationSettings}-${this.lineHeight}-${this.letterSpacing}`;
    }
    /**
     * @internal
     */
    getMassagedFontFamily() {
        const fallbackFontFamily = EDITOR_FONT_DEFAULTS.fontFamily;
        const fontFamily = BareFontInfo._wrapInQuotes(this.fontFamily);
        if (fallbackFontFamily && this.fontFamily !== fallbackFontFamily) {
            return `${fontFamily}, ${fallbackFontFamily}`;
        }
        return fontFamily;
    }
    static _wrapInQuotes(fontFamily) {
        if (/[,"']/.test(fontFamily)) {
            // Looks like the font family might be already escaped
            return fontFamily;
        }
        if (/[+ ]/.test(fontFamily)) {
            // Wrap a font family using + or <space> with quotes
            return `"${fontFamily}"`;
        }
        return fontFamily;
    }
}
// change this whenever `FontInfo` members are changed
export const SERIALIZED_FONT_INFO_VERSION = 2;
export class FontInfo extends BareFontInfo {
    /**
     * @internal
     */
    constructor(opts, isTrusted) {
        super(opts);
        this._editorStylingBrand = undefined;
        this.version = SERIALIZED_FONT_INFO_VERSION;
        this.isTrusted = isTrusted;
        this.isMonospace = opts.isMonospace;
        this.typicalHalfwidthCharacterWidth = opts.typicalHalfwidthCharacterWidth;
        this.typicalFullwidthCharacterWidth = opts.typicalFullwidthCharacterWidth;
        this.canUseHalfwidthRightwardsArrow = opts.canUseHalfwidthRightwardsArrow;
        this.spaceWidth = opts.spaceWidth;
        this.middotWidth = opts.middotWidth;
        this.wsmiddotWidth = opts.wsmiddotWidth;
        this.maxDigitWidth = opts.maxDigitWidth;
    }
    /**
     * @internal
     */
    equals(other) {
        return (this.fontFamily === other.fontFamily
            && this.fontWeight === other.fontWeight
            && this.fontSize === other.fontSize
            && this.fontFeatureSettings === other.fontFeatureSettings
            && this.fontVariationSettings === other.fontVariationSettings
            && this.lineHeight === other.lineHeight
            && this.letterSpacing === other.letterSpacing
            && this.typicalHalfwidthCharacterWidth === other.typicalHalfwidthCharacterWidth
            && this.typicalFullwidthCharacterWidth === other.typicalFullwidthCharacterWidth
            && this.canUseHalfwidthRightwardsArrow === other.canUseHalfwidthRightwardsArrow
            && this.spaceWidth === other.spaceWidth
            && this.middotWidth === other.middotWidth
            && this.wsmiddotWidth === other.wsmiddotWidth
            && this.maxDigitWidth === other.maxDigitWidth);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZm9udEluZm8uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9jb25maWcvZm9udEluZm8udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLFFBQVEsTUFBTSxrQ0FBa0MsQ0FBQztBQUM3RCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsYUFBYSxFQUFtRCxvQkFBb0IsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQ2hKLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUU3Qzs7O0dBR0c7QUFDSCxNQUFNLENBQUMsTUFBTSx3QkFBd0IsR0FBRyxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztBQUUxRTs7R0FFRztBQUNILE1BQU0sQ0FBQyxNQUFNLG1CQUFtQixHQUFHLENBQUMsQ0FBQztBQVNyQyxNQUFNLE9BQU8sWUFBWTtJQUd4Qjs7T0FFRztJQUNJLE1BQU0sQ0FBQywyQkFBMkIsQ0FBQyxPQUFnQyxFQUFFLFVBQWtCLEVBQUUsZ0JBQXlCO1FBQ3hILE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxHQUFHLGtDQUF5QixDQUFDO1FBQ3hELE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxHQUFHLGtDQUF5QixDQUFDO1FBQ3hELE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxHQUFHLGdDQUF1QixDQUFDO1FBQ3BELE1BQU0sbUJBQW1CLEdBQUcsT0FBTyxDQUFDLEdBQUcscUNBQTRCLENBQUM7UUFDcEUsTUFBTSxxQkFBcUIsR0FBRyxPQUFPLENBQUMsR0FBRyxzQ0FBNkIsQ0FBQztRQUN2RSxNQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsR0FBRyxrQ0FBeUIsQ0FBQztRQUN4RCxNQUFN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