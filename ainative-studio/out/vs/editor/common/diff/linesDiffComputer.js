/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export class LinesDiff {
    constructor(changes, 
    /**
     * Sorted by original line ranges.
     * The original line ranges and the modified line ranges must be disjoint (but can be touching).
     */
    moves, 
    /**
     * Indicates if the time out was reached.
     * In that case, the diffs might be an approximation and the user should be asked to rerun the diff with more time.
     */
    hitTimeout) {
        this.changes = changes;
        this.moves = moves;
        this.hitTimeout = hitTimeout;
    }
}
export class MovedText {
    constructor(lineRangeMapping, changes) {
        this.lineRangeMapping = lineRangeMapping;
        this.changes = changes;
    }
    flip() {
        return new MovedText(this.lineRangeMapping.flip(), this.changes.map(c => c.flip()));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGluZXNEaWZmQ29tcHV0ZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9kaWZmL2xpbmVzRGlmZkNvbXB1dGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBZWhHLE1BQU0sT0FBTyxTQUFTO0lBQ3JCLFlBQ1UsT0FBNEM7SUFFckQ7OztPQUdHO0lBQ00sS0FBMkI7SUFFcEM7OztPQUdHO0lBQ00sVUFBbUI7UUFabkIsWUFBTyxHQUFQLE9BQU8sQ0FBcUM7UUFNNUMsVUFBSyxHQUFMLEtBQUssQ0FBc0I7UUFNM0IsZUFBVSxHQUFWLFVBQVUsQ0FBUztJQUU3QixDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sU0FBUztJQVVyQixZQUNDLGdCQUFrQyxFQUNsQyxPQUE0QztRQUU1QyxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsZ0JBQWdCLENBQUM7UUFDekMsSUFBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUM7SUFDeEIsQ0FBQztJQUVNLElBQUk7UUFDVixPQUFPLElBQUksU0FBUyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDckYsQ0FBQztDQUNEIn0=