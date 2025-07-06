/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { findLastMonotonous } from '../../../base/common/arraysFind.js';
import { Range } from './range.js';
import { TextLength } from './textLength.js';
/**
 * Represents a list of mappings of ranges from one document to another.
 */
export class RangeMapping {
    constructor(mappings) {
        this.mappings = mappings;
    }
    mapPosition(position) {
        const mapping = findLastMonotonous(this.mappings, m => m.original.getStartPosition().isBeforeOrEqual(position));
        if (!mapping) {
            return PositionOrRange.position(position);
        }
        if (mapping.original.containsPosition(position)) {
            return PositionOrRange.range(mapping.modified);
        }
        const l = TextLength.betweenPositions(mapping.original.getEndPosition(), position);
        return PositionOrRange.position(l.addToPosition(mapping.modified.getEndPosition()));
    }
    mapRange(range) {
        const start = this.mapPosition(range.getStartPosition());
        const end = this.mapPosition(range.getEndPosition());
        return Range.fromPositions(start.range?.getStartPosition() ?? start.position, end.range?.getEndPosition() ?? end.position);
    }
    reverse() {
        return new RangeMapping(this.mappings.map(mapping => mapping.reverse()));
    }
}
export class SingleRangeMapping {
    constructor(original, modified) {
        this.original = original;
        this.modified = modified;
    }
    reverse() {
        return new SingleRangeMapping(this.modified, this.original);
    }
    toString() {
        return `${this.original.toString()} -> ${this.modified.toString()}`;
    }
}
export class PositionOrRange {
    static position(position) {
        return new PositionOrRange(position, undefined);
    }
    static range(range) {
        return new PositionOrRange(undefined, range);
    }
    constructor(position, range) {
        this.position = position;
        this.range = range;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmFuZ2VNYXBwaW5nLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9jb3JlL3JhbmdlTWFwcGluZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUV4RSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sWUFBWSxDQUFDO0FBQ25DLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUU3Qzs7R0FFRztBQUNILE1BQU0sT0FBTyxZQUFZO0lBQ3hCLFlBQTRCLFFBQXVDO1FBQXZDLGFBQVEsR0FBUixRQUFRLENBQStCO0lBQ25FLENBQUM7SUFFRCxXQUFXLENBQUMsUUFBa0I7UUFDN0IsTUFBTSxPQUFPLEdBQUcsa0JBQWtCLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxlQUFlLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztRQUNoSCxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDZCxPQUFPLGVBQWUsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDM0MsQ0FBQztRQUNELElBQUksT0FBTyxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO1lBQ2pELE9BQU8sZUFBZSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDaEQsQ0FBQztRQUNELE1BQU0sQ0FBQyxHQUFHLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLGNBQWMsRUFBRSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQ25GLE9BQU8sZUFBZSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsY0FBYyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ3JGLENBQUM7SUFFRCxRQUFRLENBQUMsS0FBWTtRQUNwQixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDLENBQUM7UUFDekQsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsY0FBYyxFQUFFLENBQUMsQ0FBQztRQUNyRCxPQUFPLEtBQUssQ0FBQyxhQUFhLENBQ3pCLEtBQUssQ0FBQyxLQUFLLEVBQUUsZ0JBQWdCLEVBQUUsSUFBSSxLQUFLLENBQUMsUUFBUyxFQUNsRCxHQUFHLENBQUMsS0FBSyxFQUFFLGNBQWMsRUFBRSxJQUFJLEdBQUcsQ0FBQyxRQUFTLENBQzVDLENBQUM7SUFDSCxDQUFDO0lBRUQsT0FBTztRQUNOLE9BQU8sSUFBSSxZQUFZLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQzFFLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyxrQkFBa0I7SUFDOUIsWUFDaUIsUUFBZSxFQUNmLFFBQWU7UUFEZixhQUFRLEdBQVIsUUFBUSxDQUFPO1FBQ2YsYUFBUSxHQUFSLFFBQVEsQ0FBTztJQUVoQyxDQUFDO0lBRUQsT0FBTztRQUNOLE9BQU8sSUFBSSxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUM3RCxDQUFDO0lBRUQsUUFBUTtRQUNQLE9BQU8sR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQztJQUNyRSxDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sZUFBZTtJQUNwQixNQUFNLENBQUMsUUFBUSxDQUFDLFFBQWtCO1FBQ3hDLE9BQU8sSUFBSSxlQUFlLENBQUMsUUFBUSxFQUFFLFNBQVMsQ0FBQyxDQUFDO0lBQ2pELENBQUM7SUFFTSxNQUFNLENBQUMsS0FBSyxDQUFDLEtBQVk7UUFDL0IsT0FBTyxJQUFJLGVBQWUsQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDOUMsQ0FBQztJQUVELFlBQ2lCLFFBQThCLEVBQzlCLEtBQXdCO1FBRHhCLGFBQVEsR0FBUixRQUFRLENBQXNCO1FBQzlCLFVBQUssR0FBTCxLQUFLLENBQW1CO0lBQ3JDLENBQUM7Q0FDTCJ9