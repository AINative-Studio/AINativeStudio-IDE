/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ArrayQueue } from '../../../../../base/common/arrays.js';
import { TextEditInfo } from './beforeEditPositionMapper.js';
import { lengthAdd, lengthDiffNonNegative, lengthEquals, lengthIsZero, lengthToObj, lengthZero, sumLengths } from './length.js';
export function combineTextEditInfos(textEditInfoFirst, textEditInfoSecond) {
    if (textEditInfoFirst.length === 0) {
        return textEditInfoSecond;
    }
    if (textEditInfoSecond.length === 0) {
        return textEditInfoFirst;
    }
    // s0: State before any edits
    const s0ToS1Map = new ArrayQueue(toLengthMapping(textEditInfoFirst));
    // s1: State after first edit, but before second edit
    const s1ToS2Map = toLengthMapping(textEditInfoSecond);
    s1ToS2Map.push({ modified: false, lengthBefore: undefined, lengthAfter: undefined }); // Copy everything from old to new
    // s2: State after both edits
    let curItem = s0ToS1Map.dequeue();
    /**
     * @param s1Length Use undefined for length "infinity"
     */
    function nextS0ToS1MapWithS1LengthOf(s1Length) {
        if (s1Length === undefined) {
            const arr = s0ToS1Map.takeWhile(v => true) || [];
            if (curItem) {
                arr.unshift(curItem);
            }
            return arr;
        }
        const result = [];
        while (curItem && !lengthIsZero(s1Length)) {
            const [item, remainingItem] = curItem.splitAt(s1Length);
            result.push(item);
            s1Length = lengthDiffNonNegative(item.lengthAfter, s1Length);
            curItem = remainingItem ?? s0ToS1Map.dequeue();
        }
        if (!lengthIsZero(s1Length)) {
            result.push(new LengthMapping(false, s1Length, s1Length));
        }
        return result;
    }
    const result = [];
    function pushEdit(startOffset, endOffset, newLength) {
        if (result.length > 0 && lengthEquals(result[result.length - 1].endOffset, startOffset)) {
            const lastResult = result[result.length - 1];
            result[result.length - 1] = new TextEditInfo(lastResult.startOffset, endOffset, lengthAdd(lastResult.newLength, newLength));
        }
        else {
            result.push({ startOffset, endOffset, newLength });
        }
    }
    let s0offset = lengthZero;
    for (const s1ToS2 of s1ToS2Map) {
        const s0ToS1Map = nextS0ToS1MapWithS1LengthOf(s1ToS2.lengthBefore);
        if (s1ToS2.modified) {
            const s0Length = sumLengths(s0ToS1Map, s => s.lengthBefore);
            const s0EndOffset = lengthAdd(s0offset, s0Length);
            pushEdit(s0offset, s0EndOffset, s1ToS2.lengthAfter);
            s0offset = s0EndOffset;
        }
        else {
            for (const s1 of s0ToS1Map) {
                const s0startOffset = s0offset;
                s0offset = lengthAdd(s0offset, s1.lengthBefore);
                if (s1.modified) {
                    pushEdit(s0startOffset, s0offset, s1.lengthAfter);
                }
            }
        }
    }
    return result;
}
class LengthMapping {
    constructor(
    /**
     * If false, length before and length after equal.
     */
    modified, lengthBefore, lengthAfter) {
        this.modified = modified;
        this.lengthBefore = lengthBefore;
        this.lengthAfter = lengthAfter;
    }
    splitAt(lengthAfter) {
        const remainingLengthAfter = lengthDiffNonNegative(lengthAfter, this.lengthAfter);
        if (lengthEquals(remainingLengthAfter, lengthZero)) {
            return [this, undefined];
        }
        else if (this.modified) {
            return [
                new LengthMapping(this.modified, this.lengthBefore, lengthAfter),
                new LengthMapping(this.modified, lengthZero, remainingLengthAfter)
            ];
        }
        else {
            return [
                new LengthMapping(this.modified, lengthAfter, lengthAfter),
                new LengthMapping(this.modified, remainingLengthAfter, remainingLengthAfter)
            ];
        }
    }
    toString() {
        return `${this.modified ? 'M' : 'U'}:${lengthToObj(this.lengthBefore)} -> ${lengthToObj(this.lengthAfter)}`;
    }
}
function toLengthMapping(textEditInfos) {
    const result = [];
    let lastOffset = lengthZero;
    for (const textEditInfo of textEditInfos) {
        const spaceLength = lengthDiffNonNegative(lastOffset, textEditInfo.startOffset);
        if (!lengthIsZero(spaceLength)) {
            result.push(new LengthMapping(false, spaceLength, spaceLength));
        }
        const lengthBefore = lengthDiffNonNegative(textEditInfo.startOffset, textEditInfo.endOffset);
        result.push(new LengthMapping(true, lengthBefore, textEditInfo.newLength));
        lastOffset = textEditInfo.endOffset;
    }
    return result;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tYmluZVRleHRFZGl0SW5mb3MuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9tb2RlbC9icmFja2V0UGFpcnNUZXh0TW9kZWxQYXJ0L2JyYWNrZXRQYWlyc1RyZWUvY29tYmluZVRleHRFZGl0SW5mb3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUM3RCxPQUFPLEVBQVUsU0FBUyxFQUFFLHFCQUFxQixFQUFFLFlBQVksRUFBRSxZQUFZLEVBQUUsV0FBVyxFQUFFLFVBQVUsRUFBRSxVQUFVLEVBQUUsTUFBTSxhQUFhLENBQUM7QUFFeEksTUFBTSxVQUFVLG9CQUFvQixDQUFDLGlCQUFpQyxFQUFFLGtCQUFrQztJQUN6RyxJQUFJLGlCQUFpQixDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztRQUNwQyxPQUFPLGtCQUFrQixDQUFDO0lBQzNCLENBQUM7SUFDRCxJQUFJLGtCQUFrQixDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztRQUNyQyxPQUFPLGlCQUFpQixDQUFDO0lBQzFCLENBQUM7SUFFRCw2QkFBNkI7SUFDN0IsTUFBTSxTQUFTLEdBQUcsSUFBSSxVQUFVLENBQUMsZUFBZSxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQztJQUNyRSxxREFBcUQ7SUFDckQsTUFBTSxTQUFTLEdBQUcsZUFBZSxDQUFDLGtCQUFrQixDQUE2RixDQUFDO0lBQ2xKLFNBQVMsQ0FBQyxJQUFJLENBQUMsRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLFlBQVksRUFBRSxTQUFTLEVBQUUsV0FBVyxFQUFFLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQyxrQ0FBa0M7SUFDeEgsNkJBQTZCO0lBRTdCLElBQUksT0FBTyxHQUE4QixTQUFTLENBQUMsT0FBTyxFQUFFLENBQUM7SUFFN0Q7O09BRUc7SUFDSCxTQUFTLDJCQUEyQixDQUFDLFFBQTRCO1FBQ2hFLElBQUksUUFBUSxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQzVCLE1BQU0sR0FBRyxHQUFHLFNBQVMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDakQsSUFBSSxPQUFPLEVBQUUsQ0FBQztnQkFDYixHQUFHLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ3RCLENBQUM7WUFDRCxPQUFPLEdBQUcsQ0FBQztRQUNaLENBQUM7UUFFRCxNQUFNLE1BQU0sR0FBb0IsRUFBRSxDQUFDO1FBQ25DLE9BQU8sT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7WUFDM0MsTUFBTSxDQUFDLElBQUksRUFBRSxhQUFhLENBQUMsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ3hELE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDbEIsUUFBUSxHQUFHLHFCQUFxQixDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDN0QsT0FBTyxHQUFHLGFBQWEsSUFBSSxTQUFTLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDaEQsQ0FBQztRQUNELElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztZQUM3QixNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksYUFBYSxDQUFDLEtBQUssRUFBRSxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQztRQUMzRCxDQUFDO1FBQ0QsT0FBTyxNQUFNLENBQUM7SUFDZixDQUFDO0lBRUQsTUFBTSxNQUFNLEdBQW1CLEVBQUUsQ0FBQztJQUVsQyxTQUFTLFFBQVEsQ0FBQyxXQUFtQixFQUFFLFNBQWlCLEVBQUUsU0FBaUI7UUFDMUUsSUFBSSxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsSUFBSSxZQUFZLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUFFLFdBQVcsQ0FBQyxFQUFFLENBQUM7WUFDekYsTUFBTSxVQUFVLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDN0MsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLEdBQUcsSUFBSSxZQUFZLENBQUMsVUFBVSxDQUFDLFdBQVcsRUFBRSxTQUFTLEVBQUUsU0FBUyxDQUFDLFVBQVUsQ0FBQyxTQUFTLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQztRQUM3SCxDQUFDO2FBQU0sQ0FBQztZQUNQLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxXQUFXLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxDQUFDLENBQUM7UUFDcEQsQ0FBQztJQUNGLENBQUM7SUFFRCxJQUFJLFFBQVEsR0FBRyxVQUFVLENBQUM7SUFDMUIsS0FBSyxNQUFNLE1BQU0sSUFBSSxTQUFTLEVBQUUsQ0FBQztRQUNoQyxNQUFNLFNBQVMsR0FBRywyQkFBMkIsQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDbkUsSUFBSSxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDckIsTUFBTSxRQUFRLEdBQUcsVUFBVSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQztZQUM1RCxNQUFNLFdBQVcsR0FBRyxTQUFTLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1lBQ2xELFFBQVEsQ0FBQyxRQUFRLEVBQUUsV0FBVyxFQUFFLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUNwRCxRQUFRLEdBQUcsV0FBVyxDQUFDO1FBQ3hCLENBQUM7YUFBTSxDQUFDO1lBQ1AsS0FBSyxNQUFNLEVBQUUsSUFBSSxTQUFTLEVBQUUsQ0FBQztnQkFDNUIsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDO2dCQUMvQixRQUFRLEdBQUcsU0FBUyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsWUFBWSxDQUFDLENBQUM7Z0JBQ2hELElBQUksRUFBRSxDQUFDLFFBQVEsRUFBRSxDQUFDO29CQUNqQixRQUFRLENBQUMsYUFBYSxFQUFFLFFBQVEsRUFBRSxFQUFFLENBQUMsV0FBVyxDQUFDLENBQUM7Z0JBQ25ELENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFRCxPQUFPLE1BQU0sQ0FBQztBQUNmLENBQUM7QUFFRCxNQUFNLGFBQWE7SUFDbEI7SUFDQzs7T0FFRztJQUNhLFFBQWlCLEVBQ2pCLFlBQW9CLEVBQ3BCLFdBQW1CO1FBRm5CLGFBQVEsR0FBUixRQUFRLENBQVM7UUFDakIsaUJBQVksR0FBWixZQUFZLENBQVE7UUFDcEIsZ0JBQVcsR0FBWCxXQUFXLENBQVE7SUFFcEMsQ0FBQztJQUVELE9BQU8sQ0FBQyxXQUFtQjtRQUMxQixNQUFNLG9CQUFvQixHQUFHLHFCQUFxQixDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDbEYsSUFBSSxZQUFZLENBQUMsb0JBQW9CLEVBQUUsVUFBVSxDQUFDLEVBQUUsQ0FBQztZQUNwRCxPQUFPLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQzFCLENBQUM7YUFBTSxJQUFJLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUMxQixPQUFPO2dCQUNOLElBQUksYUFBYSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLFlBQVksRUFBRSxXQUFXLENBQUM7Z0JBQ2hFLElBQUksYUFBYSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsVUFBVSxFQUFFLG9CQUFvQixDQUFDO2FBQ2xFLENBQUM7UUFDSCxDQUFDO2FBQU0sQ0FBQztZQUNQLE9BQU87Z0JBQ04sSUFBSSxhQUFhLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxXQUFXLEVBQUUsV0FBVyxDQUFDO2dCQUMxRCxJQUFJLGFBQWEsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLG9CQUFvQixFQUFFLG9CQUFvQixDQUFDO2FBQzVFLENBQUM7UUFDSCxDQUFDO0lBQ0YsQ0FBQztJQUVELFFBQVE7UUFDUCxPQUFPLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksV0FBVyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxXQUFXLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUM7SUFDN0csQ0FBQztDQUNEO0FBRUQsU0FBUyxlQUFlLENBQUMsYUFBNkI7SUFDckQsTUFBTSxNQUFNLEdBQW9CLEVBQUUsQ0FBQztJQUNuQyxJQUFJLFVBQVUsR0FBRyxVQUFVLENBQUM7SUFDNUIsS0FBSyxNQUFNLFlBQVksSUFBSSxhQUFhLEVBQUUsQ0FBQztRQUMxQyxNQUFNLFdBQVcsR0FBRyxxQkFBcUIsQ0FBQyxVQUFVLEVBQUUsWUFBWSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQ2hGLElBQUksQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQztZQUNoQyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksYUFBYSxDQUFDLEtBQUssRUFBRSxXQUFXLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQztRQUNqRSxDQUFDO1FBRUQsTUFBTSxZQUFZLEdBQUcscUJBQXFCLENBQUMsWUFBWSxDQUFDLFdBQVcsRUFBRSxZQUFZLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDN0YsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLGFBQWEsQ0FBQyxJQUFJLEVBQUUsWUFBWSxFQUFFLFlBQVksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1FBQzNFLFVBQVUsR0FBRyxZQUFZLENBQUMsU0FBUyxDQUFDO0lBQ3JDLENBQUM7SUFDRCxPQUFPLE1BQU0sQ0FBQztBQUNmLENBQUMifQ==