/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { fail, ok } from 'assert';
import { TextureAtlas } from '../../../../browser/gpu/atlas/textureAtlas.js';
import { isNumber } from '../../../../../base/common/types.js';
import { ensureNonNullable } from '../../../../browser/gpu/gpuUtils.js';
export function assertIsValidGlyph(glyph, atlasOrSource) {
    if (glyph === undefined) {
        fail('glyph is undefined');
    }
    const pageW = atlasOrSource instanceof TextureAtlas ? atlasOrSource.pageSize : atlasOrSource.width;
    const pageH = atlasOrSource instanceof TextureAtlas ? atlasOrSource.pageSize : atlasOrSource.width;
    const source = atlasOrSource instanceof TextureAtlas ? atlasOrSource.pages[glyph.pageIndex].source : atlasOrSource;
    // (x,y) are valid coordinates
    ok(isNumber(glyph.x));
    ok(glyph.x >= 0);
    ok(glyph.x < pageW);
    ok(isNumber(glyph.y));
    ok(glyph.y >= 0);
    ok(glyph.y < pageH);
    // (w,h) are valid dimensions
    ok(isNumber(glyph.w));
    ok(glyph.w > 0);
    ok(glyph.w <= pageW);
    ok(isNumber(glyph.h));
    ok(glyph.h > 0);
    ok(glyph.h <= pageH);
    // (originOffsetX, originOffsetY) are valid offsets
    ok(isNumber(glyph.originOffsetX));
    ok(isNumber(glyph.originOffsetY));
    // (x,y) + (w,h) are within the bounds of the atlas
    ok(glyph.x + glyph.w <= pageW);
    ok(glyph.y + glyph.h <= pageH);
    // Each of the glyph's outer pixel edges contain at least 1 non-transparent pixel
    const ctx = ensureNonNullable(source.getContext('2d'));
    const edges = [
        ctx.getImageData(glyph.x, glyph.y, glyph.w, 1).data,
        ctx.getImageData(glyph.x, glyph.y + glyph.h - 1, glyph.w, 1).data,
        ctx.getImageData(glyph.x, glyph.y, 1, glyph.h).data,
        ctx.getImageData(glyph.x + glyph.w - 1, glyph.y, 1, glyph.h).data,
    ];
    for (const edge of edges) {
        ok(edge.some(color => (color & 0xFF) !== 0));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdFV0aWwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3Rlc3QvYnJvd3Nlci9ncHUvYXRsYXMvdGVzdFV0aWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsTUFBTSxRQUFRLENBQUM7QUFFbEMsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQzdFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUV4RSxNQUFNLFVBQVUsa0JBQWtCLENBQUMsS0FBbUQsRUFBRSxhQUE2QztJQUNwSSxJQUFJLEtBQUssS0FBSyxTQUFTLEVBQUUsQ0FBQztRQUN6QixJQUFJLENBQUMsb0JBQW9CLENBQUMsQ0FBQztJQUM1QixDQUFDO0lBQ0QsTUFBTSxLQUFLLEdBQUcsYUFBYSxZQUFZLFlBQVksQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQztJQUNuRyxNQUFNLEtBQUssR0FBRyxhQUFhLFlBQVksWUFBWSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDO0lBQ25HLE1BQU0sTUFBTSxHQUFHLGFBQWEsWUFBWSxZQUFZLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDO0lBRW5ILDhCQUE4QjtJQUM5QixFQUFFLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENB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