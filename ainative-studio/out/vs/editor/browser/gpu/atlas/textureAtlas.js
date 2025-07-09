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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var TextureAtlas_1;
import { getActiveWindow } from '../../../../base/browser/dom.js';
import { BugIndicatingError } from '../../../../base/common/errors.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { Disposable, dispose, MutableDisposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { NKeyMap } from '../../../../base/common/map.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { GlyphRasterizer } from '../raster/glyphRasterizer.js';
import { IdleTaskQueue } from '../taskQueue.js';
import { TextureAtlasPage } from './textureAtlasPage.js';
let TextureAtlas = class TextureAtlas extends Disposable {
    static { TextureAtlas_1 = this; }
    /**
     * The maximum number of texture atlas pages. This is currently a hard static cap that must not
     * be reached.
     */
    static { this.maximumPageCount = 16; }
    get pages() { return this._pages; }
    constructor(
    /** The maximum texture size supported by the GPU. */
    _maxTextureSize, options, _themeService, _instantiationService) {
        super();
        this._maxTextureSize = _maxTextureSize;
        this._themeService = _themeService;
        this._instantiationService = _instantiationService;
        this._warmUpTask = this._register(new MutableDisposable());
        this._warmedUpRasterizers = new Set();
        /**
         * The main texture atlas pages which are both larger textures and more efficiently packed
         * relative to the scratch page. The idea is the main pages are drawn to and uploaded to the GPU
         * much less frequently so as to not drop frames.
         */
        this._pages = [];
        /**
         * A maps of glyph keys to the page to start searching for the glyph. This is set before
         * searching to have as little runtime overhead (branching, intermediate variables) as possible,
         * so it is not guaranteed to be the actual page the glyph is on. But it is guaranteed that all
         * pages with a lower index do not contain the glyph.
         */
        this._glyphPageIndex = new NKeyMap();
        this._onDidDeleteGlyphs = this._register(new Emitter());
        this.onDidDeleteGlyphs = this._onDidDeleteGlyphs.event;
        this._allocatorType = options?.allocatorType ?? 'slab';
        this._register(Event.runAndSubscribe(this._themeService.onDidColorThemeChange, () => {
            if (this._colorMap) {
                this.clear();
            }
            this._colorMap = this._themeService.getColorTheme().tokenColorMap;
        }));
        const dprFactor = Math.max(1, Math.floor(getActiveWindow().devicePixelRatio));
        this.pageSize = Math.min(1024 * dprFactor, this._maxTextureSize);
        this._initFirstPage();
        this._register(toDisposable(() => dispose(this._pages)));
    }
    _initFirstPage() {
        const firstPage = this._instantiationService.createInstance(TextureAtlasPage, 0, this.pageSize, this._allocatorType);
        this._pages.push(firstPage);
        // IMPORTANT: The first glyph on the first page must be an empty glyph such that zeroed out
        // cells end up rendering nothing
        // TODO: This currently means the first slab is for 0x0 glyphs and is wasted
        const nullRasterizer = new GlyphRasterizer(1, '', 1);
        firstPage.getGlyph(nullRasterizer, '', 0, 0);
        nullRasterizer.dispose();
    }
    clear() {
        // Clear all pages
        for (const page of this._pages) {
            page.dispose();
        }
        this._pages.length = 0;
        this._glyphPageIndex.clear();
        this._warmedUpRasterizers.clear();
        this._warmUpTask.clear();
        // Recreate first
        this._initFirstPage();
        // Tell listeners
        this._onDidDeleteGlyphs.fire();
    }
    getGlyph(rasterizer, chars, tokenMetadata, decorationStyleSetId, x) {
        // TODO: Encode font size and family into key
        // Ignore metadata that doesn't affect the glyph
        tokenMetadata &= ~(255 /* MetadataConsts.LANGUAGEID_MASK */ | 768 /* MetadataConsts.TOKEN_TYPE_MASK */ | 1024 /* MetadataConsts.BALANCED_BRACKETS_MASK */);
        // Add x offset for sub-pixel rendering to the unused portion or tokenMetadata. This
        // converts the decimal part of the x to a range from 0 to 9, where 0 = 0.0px x offset,
        // 9 = 0.9px x offset
        tokenMetadata |= Math.floor((x % 1) * 10);
        // Warm up common glyphs
        if (!this._warmedUpRasterizers.has(rasterizer.id)) {
            this._warmUpAtlas(rasterizer);
            this._warmedUpRasterizers.add(rasterizer.id);
        }
        // Try get the glyph, overflowing to a new page if necessary
        return this._tryGetGlyph(this._glyphPageIndex.get(chars, tokenMetadata, decorationStyleSetId, rasterizer.cacheKey) ?? 0, rasterizer, chars, tokenMetadata, decorationStyleSetId);
    }
    _tryGetGlyph(pageIndex, rasterizer, chars, tokenMetadata, decorationStyleSetId) {
        this._glyphPageIndex.set(pageIndex, chars, tokenMetadata, decorationStyleSetId, rasterizer.cacheKey);
        return (this._pages[pageIndex].getGlyph(rasterizer, chars, tokenMetadata, decorationStyleSetId)
            ?? (pageIndex + 1 < this._pages.length
                ? this._tryGetGlyph(pageIndex + 1, rasterizer, chars, tokenMetadata, decorationStyleSetId)
                : undefined)
            ?? this._getGlyphFromNewPage(rasterizer, chars, tokenMetadata, decorationStyleSetId));
    }
    _getGlyphFromNewPage(rasterizer, chars, tokenMetadata, decorationStyleSetId) {
        if (this._pages.length >= TextureAtlas_1.maximumPageCount) {
            throw new Error(`Attempt to create a texture atlas page past the limit ${TextureAtlas_1.maximumPageCount}`);
        }
        this._pages.push(this._instantiationService.createInstance(TextureAtlasPage, this._pages.length, this.pageSize, this._allocatorType));
        this._glyphPageIndex.set(this._pages.length - 1, chars, tokenMetadata, decorationStyleSetId, rasterizer.cacheKey);
        return this._pages[this._pages.length - 1].getGlyph(rasterizer, chars, tokenMetadata, decorationStyleSetId);
    }
    getUsagePreview() {
        return Promise.all(this._pages.map(e => e.getUsagePreview()));
    }
    getStats() {
        return this._pages.map(e => e.getStats());
    }
    /**
     * Warms up the atlas by rasterizing all printable ASCII characters for each token color. This
     * is distrubuted over multiple idle callbacks to avoid blocking the main thread.
     */
    _warmUpAtlas(rasterizer) {
        const colorMap = this._colorMap;
        if (!colorMap) {
            throw new BugIndicatingError('Cannot warm atlas without color map');
        }
        this._warmUpTask.value?.clear();
        const taskQueue = this._warmUpTask.value = new IdleTaskQueue();
        // Warm up using roughly the larger glyphs first to help optimize atlas allocation
        // A-Z
        for (let code = 65 /* CharCode.A */; code <= 90 /* CharCode.Z */; code++) {
            for (const fgColor of colorMap.keys()) {
                taskQueue.enqueue(() => {
                    for (let x = 0; x < 1; x += 0.1) {
                        this.getGlyph(rasterizer, String.fromCharCode(code), (fgColor << 15 /* MetadataConsts.FOREGROUND_OFFSET */) & 16744448 /* MetadataConsts.FOREGROUND_MASK */, 0, x);
                    }
                });
            }
        }
        // a-z
        for (let code = 97 /* CharCode.a */; code <= 122 /* CharCode.z */; code++) {
            for (const fgColor of colorMap.keys()) {
                taskQueue.enqueue(() => {
                    for (let x = 0; x < 1; x += 0.1) {
                        this.getGlyph(rasterizer, String.fromCharCode(code), (fgColor << 15 /* MetadataConsts.FOREGROUND_OFFSET */) & 16744448 /* MetadataConsts.FOREGROUND_MASK */, 0, x);
                    }
                });
            }
        }
        // Remaining ascii
        for (let code = 33 /* CharCode.ExclamationMark */; code <= 126 /* CharCode.Tilde */; code++) {
            for (const fgColor of colorMap.keys()) {
                taskQueue.enqueue(() => {
                    for (let x = 0; x < 1; x += 0.1) {
                        this.getGlyph(rasterizer, String.fromCharCode(code), (fgColor << 15 /* MetadataConsts.FOREGROUND_OFFSET */) & 16744448 /* MetadataConsts.FOREGROUND_MASK */, 0, x);
                    }
                });
            }
        }
    }
};
TextureAtlas = TextureAtlas_1 = __decorate([
    __param(2, IThemeService),
    __param(3, IInstantiationService)
], TextureAtlas);
export { TextureAtlas };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dHVyZUF0bGFzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL2dwdS9hdGxhcy90ZXh0dXJlQXRsYXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUVsRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN2RSxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxVQUFVLEVBQUUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzVHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUN6RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFFbEYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBRS9ELE9BQU8sRUFBRSxhQUFhLEVBQW1CLE1BQU0saUJBQWlCLENBQUM7QUFFakUsT0FBTyxFQUFpQixnQkFBZ0IsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBTWpFLElBQU0sWUFBWSxHQUFsQixNQUFNLFlBQWEsU0FBUSxVQUFVOztJQU0zQzs7O09BR0c7YUFDYSxxQkFBZ0IsR0FBRyxFQUFFLEFBQUwsQ0FBTTtJQVF0QyxJQUFJLEtBQUssS0FBa0MsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztJQWVoRTtJQUNDLHFEQUFxRDtJQUNwQyxlQUF1QixFQUN4QyxPQUF5QyxFQUMxQixhQUE2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