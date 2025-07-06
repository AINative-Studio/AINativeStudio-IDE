/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { equals } from '../../../base/common/arrays.js';
export function isResolvedEditorModel(model) {
    const candidate = model;
    return typeof candidate?.resolve === 'function'
        && typeof candidate?.isResolved === 'function';
}
export var EditorActivation;
(function (EditorActivation) {
    /**
     * Activate the editor after it opened. This will automatically restore
     * the editor if it is minimized.
     */
    EditorActivation[EditorActivation["ACTIVATE"] = 1] = "ACTIVATE";
    /**
     * Only restore the editor if it is minimized but do not activate it.
     *
     * Note: will only work in combination with the `preserveFocus: true` option.
     * Otherwise, if focus moves into the editor, it will activate and restore
     * automatically.
     */
    EditorActivation[EditorActivation["RESTORE"] = 2] = "RESTORE";
    /**
     * Preserve the current active editor.
     *
     * Note: will only work in combination with the `preserveFocus: true` option.
     * Otherwise, if focus moves into the editor, it will activate and restore
     * automatically.
     */
    EditorActivation[EditorActivation["PRESERVE"] = 3] = "PRESERVE";
})(EditorActivation || (EditorActivation = {}));
export var EditorResolution;
(function (EditorResolution) {
    /**
     * Displays a picker and allows the user to decide which editor to use.
     */
    EditorResolution[EditorResolution["PICK"] = 0] = "PICK";
    /**
     * Only exclusive editors are considered.
     */
    EditorResolution[EditorResolution["EXCLUSIVE_ONLY"] = 1] = "EXCLUSIVE_ONLY";
})(EditorResolution || (EditorResolution = {}));
export var EditorOpenSource;
(function (EditorOpenSource) {
    /**
     * Default: the editor is opening via a programmatic call
     * to the editor service API.
     */
    EditorOpenSource[EditorOpenSource["API"] = 0] = "API";
    /**
     * Indicates that a user action triggered the opening, e.g.
     * via mouse or keyboard use.
     */
    EditorOpenSource[EditorOpenSource["USER"] = 1] = "USER";
})(EditorOpenSource || (EditorOpenSource = {}));
export var TextEditorSelectionRevealType;
(function (TextEditorSelectionRevealType) {
    /**
     * Option to scroll vertically or horizontally as necessary and reveal a range centered vertically.
     */
    TextEditorSelectionRevealType[TextEditorSelectionRevealType["Center"] = 0] = "Center";
    /**
     * Option to scroll vertically or horizontally as necessary and reveal a range centered vertically only if it lies outside the viewport.
     */
    TextEditorSelectionRevealType[TextEditorSelectionRevealType["CenterIfOutsideViewport"] = 1] = "CenterIfOutsideViewport";
    /**
     * Option to scroll vertically or horizontally as necessary and reveal a range close to the top of the viewport, but not quite at the top.
     */
    TextEditorSelectionRevealType[TextEditorSelectionRevealType["NearTop"] = 2] = "NearTop";
    /**
     * Option to scroll vertically or horizontally as necessary and reveal a range close to the top of the viewport, but not quite at the top.
     * Only if it lies outside the viewport
     */
    TextEditorSelectionRevealType[TextEditorSelectionRevealType["NearTopIfOutsideViewport"] = 3] = "NearTopIfOutsideViewport";
})(TextEditorSelectionRevealType || (TextEditorSelectionRevealType = {}));
export var TextEditorSelectionSource;
(function (TextEditorSelectionSource) {
    /**
     * Programmatic source indicates a selection change that
     * was not triggered by the user via keyboard or mouse
     * but through text editor APIs.
     */
    TextEditorSelectionSource["PROGRAMMATIC"] = "api";
    /**
     * Navigation source indicates a selection change that
     * was caused via some command or UI component such as
     * an outline tree.
     */
    TextEditorSelectionSource["NAVIGATION"] = "code.navigation";
    /**
     * Jump source indicates a selection change that
     * was caused from within the text editor to another
     * location in the same or different text editor such
     * as "Go to definition".
     */
    TextEditorSelectionSource["JUMP"] = "code.jump";
})(TextEditorSelectionSource || (TextEditorSelectionSource = {}));
export function isTextEditorDiffInformationEqual(uriIdentityService, diff1, diff2) {
    return diff1?.documentVersion === diff2?.documentVersion &&
        uriIdentityService.extUri.isEqual(diff1?.original, diff2?.original) &&
        uriIdentityService.extUri.isEqual(diff1?.modified, diff2?.modified) &&
        equals(diff1?.changes, diff2?.changes, (a, b) => {
            return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];
        });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9lZGl0b3IvY29tbW9uL2VkaXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFrQnhELE1BQU0sVUFBVSxxQkFBcUIsQ0FBQyxLQUFxQztJQUMxRSxNQUFNLFNBQVMsR0FBRyxLQUFrRCxDQUFDO0lBRXJFLE9BQU8sT0FBTyxTQUFTLEVBQUUsT0FBTyxLQUFLLFVBQVU7V0FDM0MsT0FBTyxTQUFTLEVBQUUsVUFBVSxLQUFLLFVBQVUsQ0FBQztBQUNqRCxDQUFDO0FBb0dELE1BQU0sQ0FBTixJQUFZLGdCQXlCWDtBQXpCRCxXQUFZLGdCQUFnQjtJQUUzQjs7O09BR0c7SUFDSCwrREFBWSxDQUFBO0lBRVo7Ozs7OztPQU1HO0lBQ0gsNkRBQU8sQ0FBQTtJQUVQOzs7Ozs7T0FNRztJQUNILCtEQUFRLENBQUE7QUFDVCxDQUFDLEVBekJXLGdCQUFnQixLQUFoQixnQkFBZ0IsUUF5QjNCO0FBRUQsTUFBTSxDQUFOLElBQVksZ0JBV1g7QUFYRCxXQUFZLGdCQUFnQjtJQUUzQjs7T0FFRztJQUNILHVEQUFJLENBQUE7SUFFSjs7T0FFRztJQUNILDJFQUFjLENBQUE7QUFDZixDQUFDLEVBWFcsZ0JBQWdCLEtBQWhCLGdCQUFnQixRQVczQjtBQUVELE1BQU0sQ0FBTixJQUFZLGdCQWFYO0FBYkQsV0FBWSxnQkFBZ0I7SUFFM0I7OztPQUdHO0lBQ0gscURBQUcsQ0FBQTtJQUVIOzs7T0FHRztJQUNILHVEQUFJLENBQUE7QUFDTCxDQUFDLEVBYlcsZ0JBQWdCLEtBQWhCLGdCQUFnQixRQWEzQjtBQXFJRCxNQUFNLENBQU4sSUFBa0IsNkJBcUJqQjtBQXJCRCxXQUFrQiw2QkFBNkI7SUFDOUM7O09BRUc7SUFDSCxxRkFBVSxDQUFBO0lBRVY7O09BRUc7SUFDSCx1SEFBMkIsQ0FBQTtJQUUzQjs7T0FFRztJQUNILHVGQUFXLENBQUE7SUFFWDs7O09BR0c7SUFDSCx5SEFBNEIsQ0FBQTtBQUM3QixDQUFDLEVBckJpQiw2QkFBNkIsS0FBN0IsNkJBQTZCLFFBcUI5QztBQUVELE1BQU0sQ0FBTixJQUFrQix5QkF1QmpCO0FBdkJELFdBQWtCLHlCQUF5QjtJQUUxQzs7OztPQUlHO0lBQ0gsaURBQW9CLENBQUE7SUFFcEI7Ozs7T0FJRztJQUNILDJEQUE4QixDQUFBO0lBRTlCOzs7OztPQUtHO0lBQ0gsK0NBQWtCLENBQUE7QUFDbkIsQ0FBQyxFQXZCaUIseUJBQXlCLEtBQXpCLHlCQUF5QixRQXVCMUM7QUFtQ0QsTUFBTSxVQUFVLGdDQUFnQyxDQUMvQyxrQkFBdUMsRUFDdkMsS0FBNkMsRUFDN0MsS0FBNkM7SUFDN0MsT0FBTyxLQUFLLEVBQUUsZUFBZSxLQUFLLEtBQUssRUFBRSxlQUFlO1FBQ3ZELGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsUUFBUSxDQUFDO1FBQ25FLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsUUFBUSxDQUFDO1FBQ25FLE1BQU0sQ0FBb0IsS0FBSyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQ2xFLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN6RSxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMifQ==