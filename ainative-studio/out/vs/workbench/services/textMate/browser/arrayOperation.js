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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJyYXlPcGVyYXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3RleHRNYXRlL2Jyb3dzZXIvYXJyYXlPcGVyYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBRWhGLE1BQU0sT0FBTyxTQUFTO0lBR3JCO0lBQ0M7O09BRUc7SUFDSCxLQUFpQztRQUVqQyxJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDLENBQUM7SUFDN0UsQ0FBQztJQUVELFlBQVksQ0FBQyxLQUFZO1FBQ3hCLEtBQUssSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNqRCxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3hCLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsTUFBTSxFQUFFLEdBQUcsSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7UUFDN0QsQ0FBQztJQUNGLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyxlQUFlO0lBQzNCLFlBQ2lCLE1BQWMsRUFDZCxNQUFjLEVBQ2QsU0FBaUI7UUFGakIsV0FBTSxHQUFOLE1BQU0sQ0FBUTtRQUNkLFdBQU0sR0FBTixNQUFNLENBQVE7UUFDZCxjQUFTLEdBQVQsU0FBUyxDQUFRO0lBQzlCLENBQUM7SUFFTCxRQUFRO1FBQ1AsT0FBTyxJQUFJLElBQUksQ0FBQyxNQUFNLE1BQU0sSUFBSSxDQUFDLE1BQU0sU0FBUyxJQUFJLENBQUMsU0FBUyxHQUFHLENBQUM7SUFDbkUsQ0FBQztDQUNEO0FBTUQ7O0VBRUU7QUFDRixNQUFNLE9BQU8sMEJBQTBCO0lBQy9CLE1BQU0sQ0FBQyxRQUFRLENBQUMsZUFBNEI7UUFDbEQsOERBQThEO1FBQzlELE1BQU0sWUFBWSxHQUFHLGVBQWUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLDBCQUEwQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDakYsT0FBTyxJQUFJLHdCQUF3QixDQUFDLFlBQVksQ0FBQyxDQUFDO0lBQ25ELENBQUM7SUFLRCxZQUE2QixjQUF5QjtRQUF6QixtQkFBYyxHQUFkLGNBQWMsQ0FBVztRQUg5QyxRQUFHLEdBQUcsQ0FBQyxDQUFDO1FBQ1IsV0FBTSxHQUFHLENBQUMsQ0FBQztJQUduQixDQUFDO0lBRUQ7O09BRUc7SUFDSCxTQUFTLENBQUMsS0FBYTtRQUN0QixJQUFJLFVBQVUsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFnQyxDQUFDO1FBQ3BGLE9BQU8sVUFBVSxJQUFJLFVBQVUsQ0FBQyxNQUFNLEdBQUcsVUFBVSxDQUFDLE1BQU0sSUFBSSxLQUFLLEVBQUUsQ0FBQztZQUNyRSxJQUFJLENBQUMsTUFBTSxJQUFJLFVBQVUsQ0FBQyxTQUFTLEdBQUcsVUFBVSxDQUFDLE1BQU0sQ0FBQztZQUN4RCxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7WUFDWCxVQUFVLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ2xELENBQUM7UUFDRCxtRkFBbUY7UUFFbkYsSUFBSSxVQUFVLElBQUksVUFBVSxDQUFDLE1BQU0sSUFBSSxLQUFLLEVBQUUsQ0FBQztZQUM5QyxrQ0FBa0M7WUFDbEMsT0FBTyxTQUFTLENBQUM7UUFDbEIsQ0FBQztRQUVELE9BQU8sS0FBSyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUM7SUFDNUIsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLHdCQUF3QjtJQUNwQyxZQUNrQixZQUFpQztRQUFqQyxpQkFBWSxHQUFaLFlBQVksQ0FBcUI7SUFDL0MsQ0FBQztJQUVMLFNBQVMsQ0FBQyxLQUFhO1FBQ3RCLEtBQUssTUFBTSxXQUFXLElBQUksSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQzdDLE1BQU0sTUFBTSxHQUFHLFdBQVcsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDNUMsSUFBSSxNQUFNLEtBQUssU0FBUyxFQUFFLENBQUM7Z0JBQzFCLE9BQU8sU0FBUyxDQUFDO1lBQ2xCLENBQUM7WUFDRCxLQUFLLEdBQUcsTUFBTSxDQUFDO1FBQ2hCLENBQUM7UUFDRCxPQUFPLEtBQUssQ0FBQztJQUNkLENBQUM7Q0FDRCJ9