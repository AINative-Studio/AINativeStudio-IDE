/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { LineTokens } from '../../common/tokens/lineTokens.js';
import { createScopedLineTokens } from '../../common/languages/supports.js';
import { LanguageIdCodec } from '../../common/services/languagesRegistry.js';
export function createFakeScopedLineTokens(rawTokens) {
    const tokens = new Uint32Array(rawTokens.length << 1);
    let line = '';
    for (let i = 0, len = rawTokens.length; i < len; i++) {
        const rawToken = rawTokens[i];
        const startOffset = line.length;
        const metadata = ((rawToken.type << 8 /* MetadataConsts.TOKEN_TYPE_OFFSET */)) >>> 0;
        tokens[(i << 1)] = startOffset;
        tokens[(i << 1) + 1] = metadata;
        line += rawToken.text;
    }
    LineTokens.convertToEndOffset(tokens, line.length);
    return createScopedLineTokens(new LineTokens(tokens, line, new LanguageIdCodec()), 0);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kZXNUZXN0VXRpbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3Rlc3QvY29tbW9uL21vZGVzVGVzdFV0aWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUUvRCxPQUFPLEVBQW9CLHNCQUFzQixFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDOUYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBTzdFLE1BQU0sVUFBVSwwQkFBMEIsQ0FBQyxTQUFzQjtJQUNoRSxNQUFNLE1BQU0sR0FBRyxJQUFJLFdBQVcsQ0FBQyxTQUFTLENBQUMsTUFBTSxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQ3RELElBQUksSUFBSSxHQUFHLEVBQUUsQ0FBQztJQUVkLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsR0FBRyxTQUFTLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztRQUN0RCxNQUFNLFFBQVEsR0FBRyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFOUIsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQztRQUNoQyxNQUFNLFFBQVEsR0FBRyxDQUNoQixDQUFDLFFBQVEsQ0FBQyxJQUFJLDRDQUFvQyxDQUFDLENBQ25ELEtBQUssQ0FBQyxDQUFDO1FBRVIsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsV0FBVyxDQUFDO1FBQy9CLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxRQUFRLENBQUM7UUFDaEMsSUFBSSxJQUFJLFFBQVEsQ0FBQyxJQUFJLENBQUM7SUFDdkIsQ0FBQztJQUVELFVBQVUsQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ25ELE9BQU8sc0JBQXNCLENBQUMsSUFBSSxVQUFVLENBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxJQUFJLGVBQWUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFDdkYsQ0FBQyJ9