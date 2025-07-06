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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3Vyc29yRXZlbnRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL2N1cnNvckV2ZW50cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUtoRzs7R0FFRztBQUNILE1BQU0sQ0FBTixJQUFrQixrQkE2QmpCO0FBN0JELFdBQWtCLGtCQUFrQjtJQUNuQzs7T0FFRztJQUNILCtEQUFVLENBQUE7SUFDVjs7T0FFRztJQUNILDJFQUFnQixDQUFBO0lBQ2hCOztPQUVHO0lBQ0gsdUZBQXNCLENBQUE7SUFDdEI7O09BRUc7SUFDSCxtRUFBWSxDQUFBO0lBQ1o7O09BRUc7SUFDSCw2REFBUyxDQUFBO0lBQ1Q7O09BRUc7SUFDSCwyREFBUSxDQUFBO0lBQ1I7O09BRUc7SUFDSCwyREFBUSxDQUFBO0FBQ1QsQ0FBQyxFQTdCaUIsa0JBQWtCLEtBQWxCLGtCQUFrQixRQTZCbkMifQ==