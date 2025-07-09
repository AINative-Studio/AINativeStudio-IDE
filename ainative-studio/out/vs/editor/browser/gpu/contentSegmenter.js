/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { safeIntl } from '../../../base/common/date.js';
export function createContentSegmenter(lineData, options) {
    if (lineData.isBasicASCII && options.useMonospaceOptimizations) {
        return new AsciiContentSegmenter(lineData);
    }
    return new GraphemeContentSegmenter(lineData);
}
class AsciiContentSegmenter {
    constructor(lineData) {
        this._content = lineData.content;
    }
    getSegmentAtIndex(index) {
        return this._content[index];
    }
    getSegmentData(index) {
        return undefined;
    }
}
/**
 * This is a more modern version of {@link GraphemeIterator}, relying on browser APIs instead of a
 * manual table approach.
 */
class GraphemeContentSegmenter {
    constructor(lineData) {
        this._segments = [];
        const content = lineData.content;
        const segmenter = safeIntl.Segmenter(undefined, { granularity: 'grapheme' });
        const segmentedContent = Array.from(segmenter.segment(content));
        let segmenterIndex = 0;
        for (let x = 0; x < content.length; x++) {
            const segment = segmentedContent[segmenterIndex];
            // No more segments in the string (eg. an emoji is the last segment)
            if (!segment) {
                break;
            }
            // The segment isn't renderable (eg. the tail end of an emoji)
            if (segment.index !== x) {
                this._segments.push(undefined);
                continue;
            }
            segmenterIndex++;
            this._segments.push(segment);
        }
    }
    getSegmentAtIndex(index) {
        return this._segments[index]?.segment;
    }
    getSegmentData(index) {
        return this._segments[index];
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGVudFNlZ21lbnRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci9ncHUvY29udGVudFNlZ21lbnRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFnQnhELE1BQU0sVUFBVSxzQkFBc0IsQ0FBQyxRQUErQixFQUFFLE9BQXdCO0lBQy9GLElBQUksUUFBUSxDQUFDLFlBQVksSUFBSSxPQUFPLENBQUMseUJBQXlCLEVBQUUsQ0FBQztRQUNoRSxPQUFPLElBQUkscUJBQXFCLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDNUMsQ0FBQztJQUNELE9BQU8sSUFBSSx3QkFBd0IsQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUMvQyxDQUFDO0FBRUQsTUFBTSxxQkFBcUI7SUFHMUIsWUFBWSxRQUErQjtRQUMxQyxJQUFJLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUM7SUFDbEMsQ0FBQztJQUVELGlCQUFpQixDQUFDLEtBQWE7UUFDOUIsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQzdCLENBQUM7SUFFRCxjQUFjLENBQUMsS0FBYTtRQUMzQixPQUFPLFNBQVMsQ0FBQztJQUNsQixDQUFDO0NBQ0Q7QUFFRDs7O0dBR0c7QUFDSCxNQUFNLHdCQUF3QjtJQUc3QixZQUFZLFFBQStCO1FBRjFCLGNBQVMsR0FBcUMsRUFBRSxDQUFDO1FBR2pFLE1BQU0sT0FBTyxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUM7UUFDakMsTUFBTSxTQUFTLEdBQUcsUUFBUSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEVBQUUsRUFBRSxXQUFXLEVBQUUsVUFBVSxFQUFFLENBQUMsQ0FBQztRQUM3RSxNQUFNLGdCQUFnQixHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1FBQ2hFLElBQUksY0FBYyxHQUFHLENBQUMsQ0FBQztRQUV2QixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ3pDLE1BQU0sT0FBTyxHQUFHLGdCQUFnQixDQUFDLGNBQWMsQ0FBQyxDQUFDO1lBRWpELG9FQUFvRTtZQUNwRSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQ2QsTUFBTTtZQUNQLENBQUM7WUFFRCw4REFBOEQ7WUFDOUQsSUFBSSxPQUFPLENBQUMsS0FBSyxLQUFLLENBQUMsRUFBRSxDQUFDO2dCQUN6QixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztnQkFDL0IsU0FBUztZQUNWLENBQUM7WUFFRCxjQUFjLEVBQUUsQ0FBQztZQUNqQixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUM5QixDQUFDO0lBQ0YsQ0FBQztJQUVELGlCQUFpQixDQUFDLEtBQWE7UUFDOUIsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxFQUFFLE9BQU8sQ0FBQztJQUN2QyxDQUFDO0lBRUQsY0FBYyxDQUFDLEtBQWE7UUFDM0IsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQzlCLENBQUM7Q0FDRCJ9