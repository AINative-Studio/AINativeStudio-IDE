/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export var Range;
(function (Range) {
    /**
     * Returns the intersection between two ranges as a range itself.
     * Returns `{ start: 0, end: 0 }` if the intersection is empty.
     */
    function intersect(one, other) {
        if (one.start >= other.end || other.start >= one.end) {
            return { start: 0, end: 0 };
        }
        const start = Math.max(one.start, other.start);
        const end = Math.min(one.end, other.end);
        if (end - start <= 0) {
            return { start: 0, end: 0 };
        }
        return { start, end };
    }
    Range.intersect = intersect;
    function isEmpty(range) {
        return range.end - range.start <= 0;
    }
    Range.isEmpty = isEmpty;
    function intersects(one, other) {
        return !isEmpty(intersect(one, other));
    }
    Range.intersects = intersects;
    function relativeComplement(one, other) {
        const result = [];
        const first = { start: one.start, end: Math.min(other.start, one.end) };
        const second = { start: Math.max(other.end, one.start), end: one.end };
        if (!isEmpty(first)) {
            result.push(first);
        }
        if (!isEmpty(second)) {
            result.push(second);
        }
        return result;
    }
    Range.relativeComplement = relativeComplement;
})(Range || (Range = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmFuZ2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9jb21tb24vcmFuZ2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFZaEcsTUFBTSxLQUFXLEtBQUssQ0E0Q3JCO0FBNUNELFdBQWlCLEtBQUs7SUFFckI7OztPQUdHO0lBQ0gsU0FBZ0IsU0FBUyxDQUFDLEdBQVcsRUFBRSxLQUFhO1FBQ25ELElBQUksR0FBRyxDQUFDLEtBQUssSUFBSSxLQUFLLENBQUMsR0FBRyxJQUFJLEtBQUssQ0FBQyxLQUFLLElBQUksR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDO1lBQ3RELE9BQU8sRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQztRQUM3QixDQUFDO1FBRUQsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUMvQyxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBRXpDLElBQUksR0FBRyxHQUFHLEtBQUssSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUN0QixPQUFPLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUM7UUFDN0IsQ0FBQztRQUVELE9BQU8sRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLENBQUM7SUFDdkIsQ0FBQztJQWJlLGVBQVMsWUFheEIsQ0FBQTtJQUVELFNBQWdCLE9BQU8sQ0FBQyxLQUFhO1FBQ3BDLE9BQU8sS0FBSyxDQUFDLEdBQUcsR0FBRyxLQUFLLENBQUMsS0FBSyxJQUFJLENBQUMsQ0FBQztJQUNyQyxDQUFDO0lBRmUsYUFBTyxVQUV0QixDQUFBO0lBRUQsU0FBZ0IsVUFBVSxDQUFDLEdBQVcsRUFBRSxLQUFhO1FBQ3BELE9BQU8sQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDO0lBQ3hDLENBQUM7SUFGZSxnQkFBVSxhQUV6QixDQUFBO0lBRUQsU0FBZ0Isa0JBQWtCLENBQUMsR0FBVyxFQUFFLEtBQWE7UUFDNUQsTUFBTSxNQUFNLEdBQWEsRUFBRSxDQUFDO1FBQzVCLE1BQU0sS0FBSyxHQUFHLEVBQUUsS0FBSyxFQUFFLEdBQUcsQ0FBQyxLQUFLLEVBQUUsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztRQUN4RSxNQUFNLE1BQU0sR0FBRyxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUM7UUFFdkUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ3JCLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDcEIsQ0FBQztRQUVELElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztZQUN0QixNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3JCLENBQUM7UUFFRCxPQUFPLE1BQU0sQ0FBQztJQUNmLENBQUM7SUFkZSx3QkFBa0IscUJBY2pDLENBQUE7QUFDRixDQUFDLEVBNUNnQixLQUFLLEtBQUwsS0FBSyxRQTRDckIifQ==