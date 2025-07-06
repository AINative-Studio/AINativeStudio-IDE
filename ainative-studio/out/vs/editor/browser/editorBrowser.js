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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yQnJvd3Nlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci90ZXN0L0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvZWRpdG9yQnJvd3Nlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQWVoRyxPQUFPLEtBQUssWUFBWSxNQUFNLDJCQUEyQixDQUFDO0FBcUcxRDs7R0FFRztBQUNILE1BQU0sQ0FBTixJQUFrQiwrQkFhakI7QUFiRCxXQUFrQiwrQkFBK0I7SUFDaEQ7O09BRUc7SUFDSCx1RkFBSyxDQUFBO0lBQ0w7O09BRUc7SUFDSCx1RkFBSyxDQUFBO0lBQ0w7O09BRUc7SUFDSCx1RkFBSyxDQUFBO0FBQ04sQ0FBQyxFQWJpQiwrQkFBK0IsS0FBL0IsK0JBQStCLFFBYWhEO0FBeUZEOztHQUVHO0FBQ0gsTUFBTSxDQUFOLElBQWtCLCtCQWVqQjtBQWZELFdBQWtCLCtCQUErQjtJQUNoRDs7T0FFRztJQUNILDZHQUFnQixDQUFBO0lBRWhCOztPQUVHO0lBQ0gsbUhBQW1CLENBQUE7SUFFbkI7O09BRUc7SUFDSCxpR0FBVSxDQUFBO0FBQ1gsQ0FBQyxFQWZpQiwrQkFBK0IsS0FBL0IsK0JBQStCLFFBZWhEO0FBb0dEOztHQUVHO0FBQ0gsTUFBTSxDQUFOLElBQWtCLGVBeURqQjtBQXpERCxXQUFrQixlQUFlO0lBQ2hDOztPQUVHO0lBQ0gsMkRBQU8sQ0FBQTtJQUNQOztPQUVHO0lBQ0gsNkRBQVEsQ0FBQTtJQUNSOztPQUVHO0lBQ0gsbUZBQW1CLENBQUE7SUFDbkI7O09BRUc7SUFDSCxtRkFBbUIsQ0FBQTtJQUNuQjs7T0FFRztJQUNILDJGQUF1QixDQUFBO0lBQ3ZCOztPQUVHO0lBQ0gsNkVBQWdCLENBQUE7SUFDaEI7O09BRUc7SUFDSCxxRUFBWSxDQUFBO0lBQ1o7O09BRUc7SUFDSCx1RUFBYSxDQUFBO0lBQ2I7O09BRUc7SUFDSCwrRUFBaUIsQ0FBQTtJQUNqQjs7T0FFRztJQUNILHlFQUFjLENBQUE7SUFDZDs7T0FFRztJQUNILDBFQUFjLENBQUE7SUFDZDs7T0FFRztJQUNILGdFQUFTLENBQUE7SUFDVDs7T0FFRztJQUNILDBFQUFjLENBQUE7SUFDZDs7T0FFRztJQUNILDBFQUFjLENBQUE7QUFDZixDQUFDLEVBekRpQixlQUFlLEtBQWYsZUFBZSxRQXlEaEM7QUFtMUJEOztHQUVHO0FBQ0gsTUFBTSxDQUFOLElBQWtCLGVBSWpCO0FBSkQsV0FBa0IsZUFBZTtJQUNoQyxxREFBSSxDQUFBO0lBQ0osdUVBQWEsQ0FBQTtJQUNiLHFFQUFZLENBQUE7QUFDYixDQUFDLEVBSmlCLGVBQWUsS0FBZixlQUFlLFFBSWhDO0FBb0hEOztHQUVHO0FBQ0gsTUFBTSxVQUFVLFlBQVksQ0FBQyxLQUFjO0lBQzFDLElBQUksS0FBSyxJQUFJLE9BQXFCLEtBQU0sQ0FBQyxhQUFhLEtBQUssVUFBVSxFQUFFLENBQUM7UUFDdkUsT0FBcUIsS0FBTSxDQUFDLGFBQWEsRUFBRSxLQUFLLFlBQVksQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDO0lBQ3JGLENBQUM7U0FBTSxDQUFDO1FBQ1AsT0FBTyxLQUFLLENBQUM7SUFDZCxDQUFDO0FBQ0YsQ0FBQztBQUVEOztHQUVHO0FBQ0gsTUFBTSxVQUFVLFlBQVksQ0FBQyxLQUFjO0lBQzFDLElBQUksS0FBSyxJQUFJLE9BQXFCLEtBQU0sQ0FBQyxhQUFhLEtBQUssVUFBVSxFQUFFLENBQUM7UUFDdkUsT0FBcUIsS0FBTSxDQUFDLGFBQWEsRUFBRSxLQUFLLFlBQVksQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDO0lBQ3JGLENBQUM7U0FBTSxDQUFDO1FBQ1AsT0FBTyxLQUFLLENBQUM7SUFDZCxDQUFDO0FBQ0YsQ0FBQztBQUVEOztHQUVHO0FBQ0gsTUFBTSxVQUFVLGlCQUFpQixDQUFDLEtBQWM7SUFDL0MsT0FBTyxDQUFDLENBQUMsS0FBSztXQUNWLE9BQU8sS0FBSyxLQUFLLFFBQVE7V0FDekIsT0FBMkMsS0FBTSxDQUFDLHVCQUF1QixLQUFLLFVBQVUsQ0FBQztBQUU5RixDQUFDO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLFVBQVUsYUFBYSxDQUFDLEtBQWM7SUFDM0MsSUFBSSxZQUFZLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztRQUN6QixPQUFPLEtBQUssQ0FBQztJQUNkLENBQUM7SUFFRCxJQUFJLFlBQVksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1FBQ3pCLE9BQU8sS0FBSyxDQUFDLGlCQUFpQixFQUFFLENBQUM7SUFDbEMsQ0FBQztJQUVELElBQUksaUJBQWlCLENBQUMsS0FBSyxDQUFDLElBQUksWUFBWSxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLENBQUM7UUFDdEUsT0FBTyxLQUFLLENBQUMsZ0JBQWdCLENBQUM7SUFDL0IsQ0FBQztJQUVELE9BQU8sSUFBSSxDQUFDO0FBQ2IsQ0FBQztBQUVEOztHQUVHO0FBQ0gsTUFBTSxVQUFVLFVBQVUsQ0FBQyxLQUFVO0lBQ3BDLElBQUksWUFBWSxDQUFDLEtBQUssQ0FBQyxJQUFJLFlBQVksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1FBQ2hELE9BQU8sS0FBSyxDQUFDO0lBQ2QsQ0FBQztJQUVELE9BQU8sSUFBSSxDQUFDO0FBQ2IsQ0FBQyJ9