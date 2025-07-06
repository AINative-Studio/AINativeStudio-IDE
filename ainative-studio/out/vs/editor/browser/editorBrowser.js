/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as editorCommon from '../common/editorCommon.js';
/**
 * A positioning preference for rendering content widgets.
 */
export var ContentWidgetPositionPreference;
(function (ContentWidgetPositionPreference) {
    /**
     * Place the content widget exactly at a position
     */
    ContentWidgetPositionPreference[ContentWidgetPositionPreference["EXACT"] = 0] = "EXACT";
    /**
     * Place the content widget above a position
     */
    ContentWidgetPositionPreference[ContentWidgetPositionPreference["ABOVE"] = 1] = "ABOVE";
    /**
     * Place the content widget below a position
     */
    ContentWidgetPositionPreference[ContentWidgetPositionPreference["BELOW"] = 2] = "BELOW";
})(ContentWidgetPositionPreference || (ContentWidgetPositionPreference = {}));
/**
 * A positioning preference for rendering overlay widgets.
 */
export var OverlayWidgetPositionPreference;
(function (OverlayWidgetPositionPreference) {
    /**
     * Position the overlay widget in the top right corner
     */
    OverlayWidgetPositionPreference[OverlayWidgetPositionPreference["TOP_RIGHT_CORNER"] = 0] = "TOP_RIGHT_CORNER";
    /**
     * Position the overlay widget in the bottom right corner
     */
    OverlayWidgetPositionPreference[OverlayWidgetPositionPreference["BOTTOM_RIGHT_CORNER"] = 1] = "BOTTOM_RIGHT_CORNER";
    /**
     * Position the overlay widget in the top center
     */
    OverlayWidgetPositionPreference[OverlayWidgetPositionPreference["TOP_CENTER"] = 2] = "TOP_CENTER";
})(OverlayWidgetPositionPreference || (OverlayWidgetPositionPreference = {}));
/**
 * Type of hit element with the mouse in the editor.
 */
export var MouseTargetType;
(function (MouseTargetType) {
    /**
     * Mouse is on top of an unknown element.
     */
    MouseTargetType[MouseTargetType["UNKNOWN"] = 0] = "UNKNOWN";
    /**
     * Mouse is on top of the textarea used for input.
     */
    MouseTargetType[MouseTargetType["TEXTAREA"] = 1] = "TEXTAREA";
    /**
     * Mouse is on top of the glyph margin
     */
    MouseTargetType[MouseTargetType["GUTTER_GLYPH_MARGIN"] = 2] = "GUTTER_GLYPH_MARGIN";
    /**
     * Mouse is on top of the line numbers
     */
    MouseTargetType[MouseTargetType["GUTTER_LINE_NUMBERS"] = 3] = "GUTTER_LINE_NUMBERS";
    /**
     * Mouse is on top of the line decorations
     */
    MouseTargetType[MouseTargetType["GUTTER_LINE_DECORATIONS"] = 4] = "GUTTER_LINE_DECORATIONS";
    /**
     * Mouse is on top of the whitespace left in the gutter by a view zone.
     */
    MouseTargetType[MouseTargetType["GUTTER_VIEW_ZONE"] = 5] = "GUTTER_VIEW_ZONE";
    /**
     * Mouse is on top of text in the content.
     */
    MouseTargetType[MouseTargetType["CONTENT_TEXT"] = 6] = "CONTENT_TEXT";
    /**
     * Mouse is on top of empty space in the content (e.g. after line text or below last line)
     */
    MouseTargetType[MouseTargetType["CONTENT_EMPTY"] = 7] = "CONTENT_EMPTY";
    /**
     * Mouse is on top of a view zone in the content.
     */
    MouseTargetType[MouseTargetType["CONTENT_VIEW_ZONE"] = 8] = "CONTENT_VIEW_ZONE";
    /**
     * Mouse is on top of a content widget.
     */
    MouseTargetType[MouseTargetType["CONTENT_WIDGET"] = 9] = "CONTENT_WIDGET";
    /**
     * Mouse is on top of the decorations overview ruler.
     */
    MouseTargetType[MouseTargetType["OVERVIEW_RULER"] = 10] = "OVERVIEW_RULER";
    /**
     * Mouse is on top of a scrollbar.
     */
    MouseTargetType[MouseTargetType["SCROLLBAR"] = 11] = "SCROLLBAR";
    /**
     * Mouse is on top of an overlay widget.
     */
    MouseTargetType[MouseTargetType["OVERLAY_WIDGET"] = 12] = "OVERLAY_WIDGET";
    /**
     * Mouse is outside of the editor.
     */
    MouseTargetType[MouseTargetType["OUTSIDE_EDITOR"] = 13] = "OUTSIDE_EDITOR";
})(MouseTargetType || (MouseTargetType = {}));
/**
 * @internal
 */
export var DiffEditorState;
(function (DiffEditorState) {
    DiffEditorState[DiffEditorState["Idle"] = 0] = "Idle";
    DiffEditorState[DiffEditorState["ComputingDiff"] = 1] = "ComputingDiff";
    DiffEditorState[DiffEditorState["DiffComputed"] = 2] = "DiffComputed";
})(DiffEditorState || (DiffEditorState = {}));
/**
 *@internal
 */
export function isCodeEditor(thing) {
    if (thing && typeof thing.getEditorType === 'function') {
        return thing.getEditorType() === editorCommon.EditorType.ICodeEditor;
    }
    else {
        return false;
    }
}
/**
 *@internal
 */
export function isDiffEditor(thing) {
    if (thing && typeof thing.getEditorType === 'function') {
        return thing.getEditorType() === editorCommon.EditorType.IDiffEditor;
    }
    else {
        return false;
    }
}
/**
 *@internal
 */
export function isCompositeEditor(thing) {
    return !!thing
        && typeof thing === 'object'
        && typeof thing.onDidChangeActiveEditor === 'function';
}
/**
 *@internal
 */
export function getCodeEditor(thing) {
    if (isCodeEditor(thing)) {
        return thing;
    }
    if (isDiffEditor(thing)) {
        return thing.getModifiedEditor();
    }
    if (isCompositeEditor(thing) && isCodeEditor(thing.activeCodeEditor)) {
        return thing.activeCodeEditor;
    }
    return null;
}
/**
 *@internal
 */
export function getIEditor(thing) {
    if (isCodeEditor(thing) || isDiffEditor(thing)) {
        return thing;
    }
    return null;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yQnJvd3Nlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL2VkaXRvckJyb3dzZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFlaEcsT0FBTyxLQUFLLFlBQVksTUFBTSwyQkFBMkIsQ0FBQztBQXFHMUQ7O0dBRUc7QUFDSCxNQUFNLENBQU4sSUFBa0IsK0JBYWpCO0FBYkQsV0FBa0IsK0JBQStCO0lBQ2hEOztPQUVHO0lBQ0gsdUZBQUssQ0FBQTtJQUNMOztPQUVHO0lBQ0gsdUZBQUssQ0FBQTtJQUNMOztPQUVHO0lBQ0gsdUZBQUssQ0FBQTtBQUNOLENBQUMsRUFiaUIsK0JBQStCLEtBQS9CLCtCQUErQixRQWFoRDtBQXlGRDs7R0FFRztBQUNILE1BQU0sQ0FBTixJQUFrQiwrQkFlakI7QUFmRCxXQUFrQiwrQkFBK0I7SUFDaEQ7O09BRUc7SUFDSCw2R0FBZ0IsQ0FBQTtJQUVoQjs7T0FFRztJQUNILG1IQUFtQixDQUFBO0lBRW5COztPQUVHO0lBQ0gsaUdBQVUsQ0FBQTtBQUNYLENBQUMsRUFmaUIsK0JBQStCLEtBQS9CLCtCQUErQixRQWVoRDtBQW9HRDs7R0FFRztBQUNILE1BQU0sQ0FBTixJQUFrQixlQXlEakI7QUF6REQsV0FBa0IsZUFBZTtJQUNoQzs7T0FFRztJQUNILDJEQUFPLENBQUE7SUFDUDs7T0FFRztJQUNILDZEQUFRLENBQUE7SUFDUjs7T0FFRztJQUNILG1GQUFtQixDQUFBO0lBQ25COztPQUVHO0lBQ0gsbUZBQW1CLENBQUE7SUFDbkI7O09BRUc7SUFDSCwyRkFBdUIsQ0FBQTtJQUN2Qjs7T0FFRztJQUNILDZFQUFnQixDQUFBO0lBQ2hCOztPQUVHO0lBQ0gscUVBQVksQ0FBQTtJQUNaOztPQUVHO0lBQ0gsdUVBQWEsQ0FBQTtJQUNiOztPQUVHO0lBQ0gsK0VBQWlCLENBQUE7SUFDakI7O09BRUc7SUFDSCx5RUFBYyxDQUFBO0lBQ2Q7O09BRUc7SUFDSCwwRUFBYyxDQUFBO0lBQ2Q7O09BRUc7SUFDSCxnRUFBUyxDQUFBO0lBQ1Q7O09BRUc7SUFDSCwwRUFBYyxDQUFBO0lBQ2Q7O09BRUc7SUFDSCwwRUFBYyxDQUFBO0FBQ2YsQ0FBQyxFQXpEaUIsZUFBZSxLQUFmLGVBQWUsUUF5RGhDO0FBbTFCRDs7R0FFRztBQUNILE1BQU0sQ0FBTixJQUFrQixlQUlqQjtBQUpELFdBQWtCLGVBQWU7SUFDaEMscURBQUksQ0FBQTtJQUNKLHVFQUFhLENBQUE7SUFDYixxRUFBWSxDQUFBO0FBQ2IsQ0FBQyxFQUppQixlQUFlLEtBQWYsZUFBZSxRQUloQztBQW9IRDs7R0FFRztBQUNILE1BQU0sVUFBVSxZQUFZLENBQUMsS0FBYztJQUMxQyxJQUFJLEtBQUssSUFBSSxPQUFxQixLQUFNLENBQUMsYUFBYSxLQUFLLFVBQVUsRUFBRSxDQUFDO1FBQ3ZFLE9BQXFCLEtBQU0sQ0FBQyxhQUFhLEVBQUUsS0FBSyxZQUFZLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQztJQUNyRixDQUFDO1NBQU0sQ0FBQztRQUNQLE9BQU8sS0FBSyxDQUFDO0lBQ2QsQ0FBQztBQUNGLENBQUM7QUFFRDs7R0FFRztBQUNILE1BQU0sVUFBVSxZQUFZLENBQUMsS0FBYztJQUMxQyxJQUFJLEtBQUssSUFBSSxPQUFxQixLQUFNLENBQUMsYUFBYSxLQUFLLFVBQVUsRUFBRSxDQUFDO1FBQ3ZFLE9BQXFCLEtBQU0sQ0FBQyxhQUFhLEVBQUUsS0FBSyxZQUFZLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQztJQUNyRixDQUFDO1NBQU0sQ0FBQztRQUNQLE9BQU8sS0FBSyxDQUFDO0lBQ2QsQ0FBQztBQUNGLENBQUM7QUFFRDs7R0FFRztBQUNILE1BQU0sVUFBVSxpQkFBaUIsQ0FBQyxLQUFjO0lBQy9DLE9BQU8sQ0FBQyxDQUFDLEtBQUs7V0FDVixPQUFPLEtBQUssS0FBSyxRQUFRO1dBQ3pCLE9BQTJDLEtBQU0sQ0FBQyx1QkFBdUIsS0FBSyxVQUFVLENBQUM7QUFFOUYsQ0FBQztBQUVEOztHQUVHO0FBQ0gsTUFBTSxVQUFVLGFBQWEsQ0FBQyxLQUFjO0lBQzNDLElBQUksWUFBWSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7UUFDekIsT0FBTyxLQUFLLENBQUM7SUFDZCxDQUFDO0lBRUQsSUFBSSxZQUFZLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztRQUN6QixPQUFPLEtBQUssQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO0lBQ2xDLENBQUM7SUFFRCxJQUFJLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxJQUFJLFlBQVksQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxDQUFDO1FBQ3RFLE9BQU8sS0FBSyxDQUFDLGdCQUFnQixDQUFDO0lBQy9CLENBQUM7SUFFRCxPQUFPLElBQUksQ0FBQztBQUNiLENBQUM7QUFFRDs7R0FFRztBQUNILE1BQU0sVUFBVSxVQUFVLENBQUMsS0FBVTtJQUNwQyxJQUFJLFlBQVksQ0FBQyxLQUFLLENBQUMsSUFBSSxZQUFZLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztRQUNoRCxPQUFPLEtBQUssQ0FBQztJQUNkLENBQUM7SUFFRCxPQUFPLElBQUksQ0FBQztBQUNiLENBQUMifQ==