/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/**
 * Describes the reason the cursor has changed its position.
 */
export var CursorChangeReason;
(function (CursorChangeReason) {
    /**
     * Unknown or not set.
     */
    CursorChangeReason[CursorChangeReason["NotSet"] = 0] = "NotSet";
    /**
     * A `model.setValue()` was called.
     */
    CursorChangeReason[CursorChangeReason["ContentFlush"] = 1] = "ContentFlush";
    /**
     * The `model` has been changed outside of this cursor and the cursor recovers its position from associated markers.
     */
    CursorChangeReason[CursorChangeReason["RecoverFromMarkers"] = 2] = "RecoverFromMarkers";
    /**
     * There was an explicit user gesture.
     */
    CursorChangeReason[CursorChangeReason["Explicit"] = 3] = "Explicit";
    /**
     * There was a Paste.
     */
    CursorChangeReason[CursorChangeReason["Paste"] = 4] = "Paste";
    /**
     * There was an Undo.
     */
    CursorChangeReason[CursorChangeReason["Undo"] = 5] = "Undo";
    /**
     * There was a Redo.
     */
    CursorChangeReason[CursorChangeReason["Redo"] = 6] = "Redo";
})(CursorChangeReason || (CursorChangeReason = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3Vyc29yRXZlbnRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vY3Vyc29yRXZlbnRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBS2hHOztHQUVHO0FBQ0gsTUFBTSxDQUFOLElBQWtCLGtCQTZCakI7QUE3QkQsV0FBa0Isa0JBQWtCO0lBQ25DOztPQUVHO0lBQ0gsK0RBQVUsQ0FBQTtJQUNWOztPQUVHO0lBQ0gsMkVBQWdCLENBQUE7SUFDaEI7O09BRUc7SUFDSCx1RkFBc0IsQ0FBQTtJQUN0Qjs7T0FFRztJQUNILG1FQUFZLENBQUE7SUFDWjs7T0FFRztJQUNILDZEQUFTLENBQUE7SUFDVDs7T0FFRztJQUNILDJEQUFRLENBQUE7SUFDUjs7T0FFRztJQUNILDJEQUFRLENBQUE7QUFDVCxDQUFDLEVBN0JpQixrQkFBa0IsS0FBbEIsa0JBQWtCLFFBNkJuQyJ9