/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Position } from './position.js';
import { Range } from './range.js';
/**
 * The direction of a selection.
 */
export var SelectionDirection;
(function (SelectionDirection) {
    /**
     * The selection starts above where it ends.
     */
    SelectionDirection[SelectionDirection["LTR"] = 0] = "LTR";
    /**
     * The selection starts below where it ends.
     */
    SelectionDirection[SelectionDirection["RTL"] = 1] = "RTL";
})(SelectionDirection || (SelectionDirection = {}));
/**
 * A selection in the editor.
 * The selection is a range that has an orientation.
 */
export class Selection extends Range {
    constructor(selectionStartLineNumber, selectionStartColumn, positionLineNumber, positionColumn) {
        super(selectionStartLineNumber, selectionStartColumn, positionLineNumber, positionColumn);
        this.selectionStartLineNumber = selectionStartLineNumber;
        this.selectionStartColumn = selectionStartColumn;
        this.positionLineNumber = positionLineNumber;
        this.positionColumn = positionColumn;
    }
    /**
     * Transform to a human-readable representation.
     */
    toString() {
        return '[' + this.selectionStartLineNumber + ',' + this.selectionStartColumn + ' -> ' + this.positionLineNumber + ',' + this.positionColumn + ']';
    }
    /**
     * Test if equals other selection.
     */
    equalsSelection(other) {
        return (Selection.selectionsEqual(this, other));
    }
    /**
     * Test if the two selections are equal.
     */
    static selectionsEqual(a, b) {
        return (a.selectionStartLineNumber === b.selectionStartLineNumber &&
            a.selectionStartColumn === b.selectionStartColumn &&
            a.positionLineNumber === b.positionLineNumber &&
            a.positionColumn === b.positionColumn);
    }
    /**
     * Get directions (LTR or RTL).
     */
    getDirection() {
        if (this.selectionStartLineNumber === this.startLineNumber && this.selectionStartColumn === this.startColumn) {
            return 0 /* SelectionDirection.LTR */;
        }
        return 1 /* SelectionDirection.RTL */;
    }
    /**
     * Create a new selection with a different `positionLineNumber` and `positionColumn`.
     */
    setEndPosition(endLineNumber, endColumn) {
        if (this.getDirection() === 0 /* SelectionDirection.LTR */) {
            return new Selection(this.startLineNumber, this.startColumn, endLineNumber, endColumn);
        }
        return new Selection(endLineNumber, endColumn, this.startLineNumber, this.startColumn);
    }
    /**
     * Get the position at `positionLineNumber` and `positionColumn`.
     */
    getPosition() {
        return new Position(this.positionLineNumber, this.positionColumn);
    }
    /**
     * Get the position at the start of the selection.
    */
    getSelectionStart() {
        return new Position(this.selectionStartLineNumber, this.selectionStartColumn);
    }
    /**
     * Create a new selection with a different `selectionStartLineNumber` and `selectionStartColumn`.
     */
    setStartPosition(startLineNumber, startColumn) {
        if (this.getDirection() === 0 /* SelectionDirection.LTR */) {
            return new Selection(startLineNumber, startColumn, this.endLineNumber, this.endColumn);
        }
        return new Selection(this.endLineNumber, this.endColumn, startLineNumber, startColumn);
    }
    // ----
    /**
     * Create a `Selection` from one or two positions
     */
    static fromPositions(start, end = start) {
        return new Selection(start.lineNumber, start.column, end.lineNumber, end.column);
    }
    /**
     * Creates a `Selection` from a range, given a direction.
     */
    static fromRange(range, direction) {
        if (direction === 0 /* SelectionDirection.LTR */) {
            return new Selection(range.startLineNumber, range.startColumn, range.endLineNumber, range.endColumn);
        }
        else {
            return new Selection(range.endLineNumber, range.endColumn, range.startLineNumber, range.startColumn);
        }
    }
    /**
     * Create a `Selection` from an `ISelection`.
     */
    static liftSelection(sel) {
        return new Selection(sel.selectionStartLineNumber, sel.selectionStartColumn, sel.positionLineNumber, sel.positionColumn);
    }
    /**
     * `a` equals `b`.
     */
    static selectionsArrEqual(a, b) {
        if (a && !b || !a && b) {
            return false;
        }
        if (!a && !b) {
            return true;
        }
        if (a.length !== b.length) {
            return false;
        }
        for (let i = 0, len = a.length; i < len; i++) {
            if (!this.selectionsEqual(a[i], b[i])) {
                return false;
            }
        }
        return true;
    }
    /**
     * Test if `obj` is an `ISelection`.
     */
    static isISelection(obj) {
        return (obj
            && (typeof obj.selectionStartLineNumber === 'number')
            && (typeof obj.selectionStartColumn === 'number')
            && (typeof obj.positionLineNumber === 'number')
            && (typeof obj.positionColumn === 'number'));
    }
    /**
     * Create with a direction.
     */
    static createWithDirection(startLineNumber, startColumn, endLineNumber, endColumn, direction) {
        if (direction === 0 /* SelectionDirection.LTR */) {
            return new Selection(startLineNumber, startColumn, endLineNumber, endColumn);
        }
        return new Selection(endLineNumber, endColumn, startLineNumber, startColumn);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VsZWN0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vY29yZS9zZWxlY3Rpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFhLFFBQVEsRUFBRSxNQUFNLGVBQWUsQ0FBQztBQUNwRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sWUFBWSxDQUFDO0FBeUJuQzs7R0FFRztBQUNILE1BQU0sQ0FBTixJQUFrQixrQkFTakI7QUFURCxXQUFrQixrQkFBa0I7SUFDbkM7O09BRUc7SUFDSCx5REFBRyxDQUFBO0lBQ0g7O09BRUc7SUFDSCx5REFBRyxDQUFBO0FBQ0osQ0FBQyxFQVRpQixrQkFBa0IsS0FBbEIsa0JBQWtCLFFBU25DO0FBRUQ7OztHQUdHO0FBQ0gsTUFBTSxPQUFPLFNBQVUsU0FBUSxLQUFLO0lBa0JuQyxZQUFZLHdCQUFnQyxFQUFFLG9CQUE0QixFQUFFLGtCQUEwQixFQUFFLGNBQXNCO1FBQzdILEtBQUssQ0FBQyx3QkFBd0IsRUFBRSxvQkFBb0IsRUFBRSxrQkFBa0IsRUFBRSxjQUFjLENBQUMsQ0FBQztRQUMxRixJQUFJLENBQUMsd0JBQXdCLEdBQUcsd0JBQXdCLENBQUM7UUFDekQsSUFBSSxDQUFDLG9CQUFvQixHQUFHLG9CQUFvQixDQUFDO1FBQ2pELElBQUksQ0FBQyxrQkFBa0IsR0FBRyxrQkFBa0IsQ0FBQztRQUM3QyxJQUFJLENBQUMsY0FBYyxHQUFHLGNBQWMsQ0FBQztJQUN0QyxDQUFDO0lBRUQ7O09BRUc7SUFDYSxRQUFRO1FBQ3ZCLE9BQU8sR0FBRyxHQUFHLElBQUksQ0FBQyx3QkFBd0IsR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixHQUFHLE1BQU0sR0FBRyxJQUFJLENBQUMsa0JBQWtCLEdBQUcsR0FB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