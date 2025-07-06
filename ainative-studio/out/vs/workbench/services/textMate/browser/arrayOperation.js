/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { compareBy, numberComparator } from '../../../../base/common/arrays.js';
export class ArrayEdit {
    constructor(
    /**
     * Disjoint edits that are applied in parallel
     */
    edits) {
        this.edits = edits.slice().sort(compareBy(c => c.offset, numberComparator));
    }
    applyToArray(array) {
        for (let i = this.edits.length - 1; i >= 0; i--) {
            const c = this.edits[i];
            array.splice(c.offset, c.length, ...new Array(c.newLength));
        }
    }
}
export class SingleArrayEdit {
    constructor(offset, length, newLength) {
        this.offset = offset;
        this.length = length;
        this.newLength = newLength;
    }
    toString() {
        return `[${this.offset}, +${this.length}) -> +${this.newLength}}`;
    }
}
/**
 * Can only be called with increasing values of `index`.
*/
export class MonotonousIndexTransformer {
    static fromMany(transformations) {
        // TODO improve performance by combining transformations first
        const transformers = transformations.map(t => new MonotonousIndexTransformer(t));
        return new CombinedIndexTransformer(transformers);
    }
    constructor(transformation) {
        this.transformation = transformation;
        this.idx = 0;
        this.offset = 0;
    }
    /**
     * Precondition: index >= previous-value-of(index).
     */
    transform(index) {
        let nextChange = this.transformation.edits[this.idx];
        while (nextChange && nextChange.offset + nextChange.length <= index) {
            this.offset += nextChange.newLength - nextChange.length;
            this.idx++;
            nextChange = this.transformation.edits[this.idx];
        }
        // assert nextChange === undefined || index < nextChange.offset + nextChange.length
        if (nextChange && nextChange.offset <= index) {
            // Offset is touched by the change
            return undefined;
        }
        return index + this.offset;
    }
}
export class CombinedIndexTransformer {
    constructor(transformers) {
        this.transformers = transformers;
    }
    transform(index) {
        for (const transformer of this.transformers) {
            const result = transformer.transform(index);
            if (result === undefined) {
                return undefined;
            }
            index = result;
        }
        return index;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJyYXlPcGVyYXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdGV4dE1hdGUvYnJvd3Nlci9hcnJheU9wZXJhdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsU0FBUyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFFaEYsTUFBTSxPQUFPLFNBQVM7SUFHckI7SUFDQzs7T0FFRztJQUNILEtBQWlDO1FBRWpDLElBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLGdCQUFnQixDQUFDLENBQUMsQ0FBQztJQUM3RSxDQUFDO0lBRUQsWUFBWSxDQUFDLEtBQVk7UUFDeEIsS0FBSyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ2pELE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDeEIsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxNQUFNLEVBQUUsR0FBRyxJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztRQUM3RCxDQUFDO0lBQ0YsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLGVBQWU7SUFDM0IsWUFDaUIsTUFBYyxFQUNkLE1BQWMsRUFDZCxTQUFpQjtRQUZqQixXQUFNLEdBQU4sTUFBTSxDQUFRO1FBQ2QsV0FBTSxHQUFOLE1BQU0sQ0FBUTtRQUNkLGNBQVMsR0FBVCxTQUFTLENBQVE7SUFDOUIsQ0FBQztJQUVMLFFBQVE7UUFDUCxPQUFPLElBQUksSUFBSSxDQUFDLE1BQU0sTUFBTSxJQUFJLENBQUMsTUFBTSxTQUFTLElBQUksQ0FBQyxTQUFTLEdBQUcsQ0FBQztJQUNuRSxDQUFDO0NBQ0Q7QUFNRDs7RUFFRTtBQUNGLE1BQU0sT0FBTywwQkFBMEI7SUFDL0IsTUFBTSxDQUFDLFFBQVEsQ0FBQyxlQUE0QjtRQUNsRCw4REFBOEQ7UUFDOUQsTUFBTSxZQUFZLEdBQUcsZUFBZSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksMEJBQTBCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNqRixPQUFPLElBQUksd0JBQXdCLENBQUMsWUFBWSxDQUFDLENBQUM7SUFDbkQsQ0FBQztJQUtELFlBQTZCLGNBQXlCO1FBQXpCLG1CQUFjLEdBQWQsY0FBYyxDQUFXO1FBSDlDLFFBQUcsR0FBRyxDQUFDLENBQUM7UUFDUixXQUFNLEdBQUcsQ0FBQyxDQUFDO0lBR25CLENBQUM7SUFFRDs7T0FFRztJQUNILFNBQVMsQ0FBQyxLQUFhO1FBQ3RCLElBQUksVUFBVSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQWdDLENBQUM7UUFDcEYsT0FBTyxVQUFVLElBQUksVUFBVSxDQUFDLE1BQU0sR0FBRyxVQUFVLENBQUMsTUFBTSxJQUFJLEtBQUssRUFBRSxDQUFDO1lBQ3JFLElBQUksQ0FBQyxNQUFNLElBQUksVUFBVSxDQUFDLFNBQVMsR0FBRyxVQUFVLENBQUMsTUFBTSxDQUFDO1lBQ3hELElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztZQUNYLFVBQVUsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDbEQsQ0FBQztRQUNELG1GQUFtRjtRQUVuRixJQUFJLFVBQVUsSUFBSSxVQUFVLENBQUMsTUFBTSxJQUFJLEtBQUssRUFBRSxDQUFDO1lBQzlDLGtDQUFrQztZQUNsQyxPQUFPLFNBQVMsQ0FBQztRQUNsQixDQUFDO1FBRUQsT0FBTyxLQUFLLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQztJQUM1QixDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sd0JBQXdCO0lBQ3BDLFlBQ2tCLFlBQWlDO1FBQWpDLGlCQUFZLEdBQVosWUFBWSxDQUFxQjtJQUMvQyxDQUFDO0lBRUwsU0FBUyxDQUFDLEtBQWE7UUFDdEIsS0FBSyxNQUFNLFdBQVcsSUFBSSxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDN0MsTUFBTSxNQUFNLEdBQUcsV0FBVyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUM1QyxJQUFJLE1BQU0sS0FBSyxTQUFTLEVBQUUsQ0FBQztnQkFDMUIsT0FBTyxTQUFTLENBQUM7WUFDbEIsQ0FBQztZQUNELEtBQUssR0FBRyxNQUFNLENBQUM7UUFDaEIsQ0FBQztRQUNELE9BQU8sS0FBSyxDQUFDO0lBQ2QsQ0FBQztDQUNEIn0=