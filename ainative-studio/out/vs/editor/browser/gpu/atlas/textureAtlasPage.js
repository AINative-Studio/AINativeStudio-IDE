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
var TextureAtlasPage_1;
import { Disposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { NKeyMap } from '../../../../base/common/map.js';
import { ILogService, LogLevel } from '../../../../platform/log/common/log.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { TextureAtlasShelfAllocator } from './textureAtlasShelfAllocator.js';
import { TextureAtlasSlabAllocator } from './textureAtlasSlabAllocator.js';
let TextureAtlasPage = class TextureAtlasPage extends Disposable {
    static { TextureAtlasPage_1 = this; }
    get version() { return this._version; }
    /**
     * The maximum number of glyphs that can be drawn to the page. This is currently a hard static
     * cap that must not be reached as it will cause the GPU buffer to overflow.
     */
    static { this.maximumGlyphCount = 5_000; }
    get usedArea() { return this._usedArea; }
    get source() { return this._canvas; }
    get glyphs() {
        return this._glyphInOrderSet.values();
    }
    constructor(textureIndex, pageSize, allocatorType, _logService, themeService) {
        super();
        this._logService = _logService;
        this._version = 0;
        this._usedArea = { left: 0, top: 0, right: 0, bottom: 0 };
        this._glyphMap = new NKeyMap();
        this._glyphInOrderSet = new Set();
        this._canvas = new OffscreenCanvas(pageSize, pageSize);
        this._colorMap = themeService.getColorTheme().tokenColorMap;
        switch (allocatorType) {
            case 'shelf':
                this._allocator = new TextureAtlasShelfAllocator(this._canvas, textureIndex);
                break;
            case 'slab':
                this._allocator = new TextureAtlasSlabAllocator(this._canvas, textureIndex);
                break;
            default:
                this._allocator = allocatorType(this._canvas, textureIndex);
                break;
        }
        // Reduce impact of a memory leak if this object is not released
        this._register(toDisposable(() => {
            this._canvas.width = 1;
            this._canvas.height = 1;
        }));
    }
    getGlyph(rasterizer, chars, tokenMetadata, decorationStyleSetId) {
        // IMPORTANT: There are intentionally no intermediate variables here to aid in runtime
        // optimization as it's a very hot function
        return this._glyphMap.get(chars, tokenMetadata, decorationStyleSetId, rasterizer.cacheKey) ?? this._createGlyph(rasterizer, chars, tokenMetadata, decorationStyleSetId);
    }
    _createGlyph(rasterizer, chars, tokenMetadata, decorationStyleSetId) {
        // Ensure the glyph can fit on the page
        if (this._glyphInOrderSet.size >= TextureAtlasPage_1.maximumGlyphCount) {
            return undefined;
        }
        // Rasterize and allocate the glyph
        const rasterizedGlyph = rasterizer.rasterizeGlyph(chars, tokenMetadata, decorationStyleSetId, this._colorMap);
        const glyph = this._allocator.allocate(rasterizedGlyph);
        // Ensure the glyph was allocated
        if (glyph === undefined) {
            // TODO: undefined here can mean the glyph was too large for a slab on the page, this
            // can lead to big problems if we don't handle it properly https://github.com/microsoft/vscode/issues/232984
            return undefined;
        }
        // Save the glyph
        this._glyphMap.set(glyph, chars, tokenMetadata, decorationStyleSetId, rasterizer.cacheKey);
        this._glyphInOrderSet.add(glyph);
        // Update page version and it's tracked used area
        this._version++;
        this._usedArea.right = Math.max(this._usedArea.right, glyph.x + glyph.w - 1);
        this._usedArea.bottom = Math.max(this._usedArea.bottom, glyph.y + glyph.h - 1);
        if (this._logService.getLevel() === LogLevel.Trace) {
            this._logService.trace('New glyph', {
                chars,
                tokenMetadata,
                decorationStyleSetId,
                rasterizedGlyph,
                glyph
            });
        }
        return glyph;
    }
    getUsagePreview() {
        return this._allocator.getUsagePreview();
    }
    getStats() {
        return this._allocator.getStats();
    }
};
TextureAtlasPage = TextureAtlasPage_1 = __decorate([
    __param(3, ILogService),
    __param(4, IThemeService)
], TextureAtlasPage);
export { TextureAtlasPage };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dHVyZUF0bGFzUGFnZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci9ncHUvYXRsYXMvdGV4dHVyZUF0bGFzUGFnZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNoRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDekQsT0FBTyxFQUFFLFdBQVcsRUFBRSxRQUFRLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUMvRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFHbEYsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDN0UsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFJcEUsSUFBTSxnQkFBZ0IsR0FBdEIsTUFBTSxnQkFBaUIsU0FBUSxVQUFVOztJQUcvQyxJQUFJLE9BQU8sS0FBYSxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO0lBRS9DOzs7T0FHRzthQUNhLHNCQUFpQixHQUFHLEtBQUssQUFBUixDQUFTO0lBRzFDLElBQVcsUUFBUSxLQUE2QixPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO0lBR3hFLElBQUksTUFBTSxLQUFzQixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO0lBSXRELElBQUksTUFBTTtRQUNULE9BQU8sSUFBSSxDQUFDLGdCQUFnQixDQUFDLE1BQU0sRUFBRSxDQUFDO0lBQ3ZDLENBQUM7SUFLRCxZQUNDLFlBQW9CLEVBQ3BCLFFBQWdCLEVBQ2hCLGFBQTRCLEVBQ2YsV0FBeUMs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