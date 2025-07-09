/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { getWindowId } from '../../../base/browser/dom.js';
import { PixelRatio } from '../../../base/browser/pixelRatio.js';
import { Emitter } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { CharWidthRequest, readCharWidths } from './charWidthReader.js';
import { EditorFontLigatures } from '../../common/config/editorOptions.js';
import { FontInfo, SERIALIZED_FONT_INFO_VERSION } from '../../common/config/fontInfo.js';
export class FontMeasurementsImpl extends Disposable {
    constructor() {
        super(...arguments);
        this._cache = new Map();
        this._evictUntrustedReadingsTimeout = -1;
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
    }
    dispose() {
        if (this._evictUntrustedReadingsTimeout !== -1) {
            clearTimeout(this._evictUntrustedReadingsTimeout);
            this._evictUntrustedReadingsTimeout = -1;
        }
        super.dispose();
    }
    /**
     * Clear all cached font information and trigger a change event.
     */
    clearAllFontInfos() {
        this._cache.clear();
        this._onDidChange.fire();
    }
    _ensureCache(targetWindow) {
        const windowId = getWindowId(targetWindow);
        let cache = this._cache.get(windowId);
        if (!cache) {
            cache = new FontMeasurementsCache();
            this._cache.set(windowId, cache);
        }
        return cache;
    }
    _writeToCache(targetWindow, item, value) {
        const cache = this._ensureCache(targetWindow);
        cache.put(item, value);
        if (!value.isTrusted && this._evictUntrustedReadingsTimeout === -1) {
            // Try reading again after some time
            this._evictUntrustedReadingsTimeout = targetWindow.setTimeout(() => {
                this._evictUntrustedReadingsTimeout = -1;
                this._evictUntrustedReadings(targetWindow);
            }, 5000);
        }
    }
    _evictUntrustedReadings(targetWindow) {
        const cache = this._ensureCache(targetWindow);
        const values = cache.getValues();
        let somethingRemoved = false;
        for (const item of values) {
            if (!item.isTrusted) {
                somethingRemoved = true;
                cache.remove(item);
            }
        }
        if (somethingRemoved) {
            this._onDidChange.fire();
        }
    }
    /**
     * Serialized currently cached font information.
     */
    serializeFontInfo(targetWindow) {
        // Only save trusted font info (that has been measured in this running instance)
        const cache = this._ensureCache(targetWindow);
        return cache.getValues().filter(item => item.isTrusted);
    }
    /**
     * Restore previously serialized font informations.
     */
    restoreFontInfo(targetWindow, savedFontInfos) {
        // Take all the saved font info and insert them in the cache without the trusted flag.
        // The reason for this is that a font might have been installed on the OS in the meantime.
        for (const savedFontInfo of savedFontInfos) {
            if (savedFontInfo.version !== SERIALIZED_FONT_INFO_VERSION) {
                // cannot use older version
                continue;
            }
            const fontInfo = new FontInfo(savedFontInfo, false);
            this._writeToCache(targetWindow, fontInfo, fontInfo);
        }
    }
    /**
     * Read font information.
     */
    readFontInfo(targetWindow, bareFontInfo) {
        const cache = this._ensureCache(targetWindow);
        if (!cache.has(bareFontInfo)) {
            let readConfig = this._actualReadFontInfo(targetWindow, bareFontInfo);
            if (readConfig.typicalHalfwidthCharacterWidth <= 2 || readConfig.typicalFullwidthCharacterWidth <= 2 || readConfig.spaceWidth <= 2 || readConfig.maxDigitWidth <= 2) {
                // Hey, it's Bug 14341 ... we couldn't read
                readConfig = new FontInfo({
                    pixelRatio: PixelRatio.getInstance(targetWindow).value,
                    fontFamily: readConfig.fontFamily,
                    fontWeight: readConfig.fontWeight,
                    fontSize: readConfig.fontSize,
                    fontFeatureSettings: readConfig.fontFeatureSettings,
                    fontVariationSettings: readConfig.fontVariationSettings,
                    lineHeight: readConfig.lineHeight,
                    letterSpacing: readConfig.letterSpacing,
                    isMonospace: readConfig.isMonospace,
                    typicalHalfwidthCharacterWidth: Math.max(readConfig.typicalHalfwidthCharacterWidth, 5),
                    typicalFullwidthCharacterWidth: Math.max(readConfig.typicalFullwidthCharacterWidth, 5),
                    canUseHalfwidthRightwardsArrow: readConfig.canUseHalfwidthRightwardsArrow,
                    spaceWidth: Math.max(readConfig.spaceWidth, 5),
                    middotWidth: Math.max(readConfig.middotWidth, 5),
                    wsmiddotWidth: Math.max(readConfig.wsmiddotWidth, 5),
                    maxDigitWidth: Math.max(readConfig.maxDigitWidth, 5),
                }, false);
            }
            this._writeToCache(targetWindow, bareFontInfo, readConfig);
        }
        return cache.get(bareFontInfo);
    }
    _createRequest(chr, type, all, monospace) {
        const result = new CharWidthRequest(chr, type);
        all.push(result);
        monospace?.push(result);
        return result;
    }
    _actualReadFontInfo(targetWindow, bareFontInfo) {
        const all = [];
        const monospace = [];
        const typicalHalfwidthCharacter = this._createRequest('n', 0 /* CharWidthRequestType.Regular */, all, monospace);
        const typicalFullwidthCharacter = this._createRequest('\uff4d', 0 /* CharWidthRequestType.Regular */, all, null);
        const space = this._createRequest(' ', 0 /* CharWidthRequestType.Regular */, all, monospace);
        const digit0 = this._createRequest('0', 0 /* CharWidthRequestType.Regular */, all, monospace);
        const digit1 = this._createRequest('1', 0 /* CharWidthRequestType.Regular */, all, monospace);
        const digit2 = this._createRequest('2', 0 /* CharWidthRequestType.Regular */, all, monospace);
        const digit3 = this._createRequest('3', 0 /* CharWidthRequestType.Regular */, all, monospace);
        const digit4 = this._createRequest('4', 0 /* CharWidthRequestType.Regular */, all, monospace);
        const digit5 = this._createRequest('5', 0 /* CharWidthRequestType.Regular */, all, monospace);
        const digit6 = this._createRequest('6', 0 /* CharWidthRequestType.Regular */, all, monospace);
        const digit7 = this._createRequest('7', 0 /* CharWidthRequestType.Regular */, all, monospace);
        const digit8 = this._createRequest('8', 0 /* CharWidthRequestType.Regular */, all, monospace);
        const digit9 = this._createRequest('9', 0 /* CharWidthRequestType.Regular */, all, monospace);
        // monospace test: used for whitespace rendering
        const rightwardsArrow = this._createRequest('→', 0 /* CharWidthRequestType.Regular */, all, monospace);
        const halfwidthRightwardsArrow = this._createRequest('￫', 0 /* CharWidthRequestType.Regular */, all, null);
        // U+00B7 - MIDDLE DOT
        const middot = this._createRequest('·', 0 /* CharWidthRequestType.Regular */, all, monospace);
        // U+2E31 - WORD SEPARATOR MIDDLE DOT
        const wsmiddotWidth = this._createRequest(String.fromCharCode(0x2E31), 0 /* CharWidthRequestType.Regular */, all, null);
        // monospace test: some characters
        const monospaceTestChars = '|/-_ilm%';
        for (let i = 0, len = monospaceTestChars.length; i < len; i++) {
            this._createRequest(monospaceTestChars.charAt(i), 0 /* CharWidthRequestType.Regular */, all, monospace);
            this._createRequest(monospaceTestChars.charAt(i), 1 /* CharWidthRequestType.Italic */, all, monospace);
            this._createRequest(monospaceTestChars.charAt(i), 2 /* CharWidthRequestType.Bold */, all, monospace);
        }
        readCharWidths(targetWindow, bareFontInfo, all);
        const maxDigitWidth = Math.max(digit0.width, digit1.width, digit2.width, digit3.width, digit4.width, digit5.width, digit6.width, digit7.width, digit8.width, digit9.width);
        let isMonospace = (bareFontInfo.fontFeatureSettings === EditorFontLigatures.OFF);
        const referenceWidth = monospace[0].width;
        for (let i = 1, len = monospace.length; isMonospace && i < len; i++) {
            const diff = referenceWidth - monospace[i].width;
            if (diff < -0.001 || diff > 0.001) {
                isMonospace = false;
                break;
            }
        }
        let canUseHalfwidthRightwardsArrow = true;
        if (isMonospace && halfwidthRightwardsArrow.width !== referenceWidth) {
            // using a halfwidth rightwards arrow would break monospace...
            canUseHalfwidthRightwardsArrow = false;
        }
        if (halfwidthRightwardsArrow.width > rightwardsArrow.width) {
            // using a halfwidth rightwards arrow would paint a larger arrow than a regular rightwards arrow
            canUseHalfwidthRightwardsArrow = false;
        }
        return new FontInfo({
            pixelRatio: PixelRatio.getInstance(targetWindow).value,
            fontFamily: bareFontInfo.fontFamily,
            fontWeight: bareFontInfo.fontWeight,
            fontSize: bareFontInfo.fontSize,
            fontFeatureSettings: bareFontInfo.fontFeatureSettings,
            fontVariationSettings: bareFontInfo.fontVariationSettings,
            lineHeight: bareFontInfo.lineHeight,
            letterSpacing: bareFontInfo.letterSpacing,
            isMonospace: isMonospace,
            typicalHalfwidthCharacterWidth: typicalHalfwidthCharacter.width,
            typicalFullwidthCharacterWidth: typicalFullwidthCharacter.width,
            canUseHalfwidthRightwardsArrow: canUseHalfwidthRightwardsArrow,
            spaceWidth: space.width,
            middotWidth: middot.width,
            wsmiddotWidth: wsmiddotWidth.width,
            maxDigitWidth: maxDigitWidth
        }, true);
    }
}
class FontMeasurementsCache {
    constructor() {
        this._keys = Object.create(null);
        this._values = Object.create(null);
    }
    has(item) {
        const itemId = item.getId();
        return !!this._values[itemId];
    }
    get(item) {
        const itemId = item.getId();
        return this._values[itemId];
    }
    put(item, value) {
        const itemId = item.getId();
        this._keys[itemId] = item;
        this._values[itemId] = value;
    }
    remove(item) {
        const itemId = item.getId();
        delete this._keys[itemId];
        delete this._values[itemId];
    }
    getValues() {
        return Object.keys(this._keys).map(id => this._values[id]);
    }
}
export const FontMeasurements = new FontMeasurementsImpl();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZm9udE1lYXN1cmVtZW50cy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci9jb25maWcvZm9udE1lYXN1cmVtZW50cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDM0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUN4RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDL0QsT0FBTyxFQUFFLGdCQUFnQixFQUF3QixjQUFjLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQztBQUM5RixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUMzRSxPQUFPLEVBQWdCLFFBQVEsRUFBRSw0QkFBNEIsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBeUJ2RyxNQUFNLE9BQU8sb0JBQXFCLFNBQVEsVUFBVTtJQUFwRDs7UUFFa0IsV0FBTSxHQUFHLElBQUksR0FBRyxFQUFpQyxDQUFDO1FBRTNELG1DQUE4QixHQUFHLENBQUMsQ0FBQyxDQUFDO1FBRTNCLGlCQUFZLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBUSxDQUFDLENBQUM7UUFDcEQsZ0JBQVcsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQztJQTBNdkQsQ0FBQztJQXhNZ0IsT0FBTztRQUN0QixJQUFJLElBQUksQ0FBQyw4QkFBOEIsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQ2hELFlBQVksQ0FBQyxJQUFJLENBQUMsOEJBQThCLENBQUMsQ0FBQztZQUNsRCxJQUFJLENB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Y0FBYyxDQUFDLEdBQUcsd0NBQWdDLEdBQUcsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUN6RyxNQUFNLHlCQUF5QixHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsUUFBUSx3Q0FBZ0MsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ3pHLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyx3Q0FBZ0MsR0FBRyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ3JGLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyx3Q0FBZ0MsR0FBRyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ3RGLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyx3Q0FBZ0MsR0FBRyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ3RGLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyx3Q0FBZ0MsR0FBRyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ3RGLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyx3Q0FBZ0MsR0FBRyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ3RGLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyx3Q0FBZ0MsR0FBRyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ3RGLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyx3Q0FBZ0MsR0FBRyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ3RGLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyx3Q0FBZ0MsR0FBRyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ3RGLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyx3Q0FBZ0MsR0FBRyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ3RGLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyx3Q0FBZ0MsR0FBRyxFQUFFLFNBQVMsQ0FB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