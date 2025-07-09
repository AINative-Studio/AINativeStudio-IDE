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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2VkaXRvci9jb21tb24vZWRpdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQWtCeEQsTUFBTSxVQUFVLHFCQUFxQixDQUFDLEtBQXFDO0lBQzFFLE1BQU0sU0FBUyxHQUFHLEtBQWtELENBQUM7SUFFckUsT0FBTyxPQUFPLFNBQVMsRUFBRSxPQUFPLEtBQUssVUFBVTtXQUMzQyxPQUFPLFNBQVMsRUFBRSxVQUFVLEtBQUssVUFBVSxDQUFDO0FBQ2pELENBQUM7QUFvR0QsTUFBTSxDQUFOLElBQVksZ0JBeUJYO0FBekJELFdBQVksZ0JBQWdCO0lBRTNCOzs7T0FHRztJQUNILCtEQUFZLENBQUE7SUFFWjs7Ozs7O09BTUc7SUFDSCw2REFBTyxDQUFBO0lBRVA7Ozs7OztPQU1HO0lBQ0gsK0RBQVEsQ0FBQTtBQUNULENBQUMsRUF6QlcsZ0JBQWdCLEtBQWhCLGdCQUFnQixRQXlCM0I7QUFFRCxNQUFNLENBQU4sSUFBWSxnQkFXWDtBQVhELFdBQVksZ0JBQWdCO0lBRTNCOztPQUVHO0lBQ0gsdURBQUksQ0FBQTtJQUVKOztPQUVHO0lBQ0gsMkVBQWMsQ0FBQTtBQUNmLENBQUMsRUFYVyxnQkFBZ0IsS0FBaEIsZ0JBQWdCLFFBVzNCO0FBRUQsTUFBTSxDQUFOLElBQVksZ0JBYVg7QUFiRCxXQUFZLGdCQUFnQjtJQUUzQjs7O09BR0c7SUFDSCxxREFBRyxDQUFBO0lBRUg7OztPQUdHO0lBQ0gsdURBQUksQ0FBQTtBQUNMLENBQUMsRUFiVyxnQkFBZ0IsS0FBaEIsZ0JBQWdCLFFBYTNCO0FBcUlELE1BQU0sQ0FBTixJQUFrQiw2QkFxQmpCO0FBckJELFdBQWtCLDZCQUE2QjtJQUM5Qzs7T0FFRztJQUNILHFGQUFVLENBQUE7SUFFVjs7T0FFRztJQUNILHVIQUEyQixDQUFBO0lBRTNCOztPQUVHO0lBQ0gsdUZBQVcsQ0FBQTtJQUVYOzs7T0FHRztJQUNILHlIQUE0QixDQUFBO0FBQzdCLENBQUMsRUFyQmlCLDZCQUE2QixLQUE3Qiw2QkFBNkIsUUFxQjlDO0FBRUQsTUFBTSxDQUFOLElBQWtCLHlCQXVCakI7QUF2QkQsV0FBa0IseUJBQXlCO0lBRTFDOzs7O09BSUc7SUFDSCxpREFBb0IsQ0FBQTtJQUVwQjs7OztPQUlHO0lBQ0gsMkRBQThCLENBQUE7SUFFOUI7Ozs7O09BS0c7SUFDSCwrQ0FBa0IsQ0FBQTtBQUNuQixDQUFDLEVBdkJpQix5QkFBeUIsS0FBekIseUJBQXlCLFFBdUIxQztBQW1DRCxNQUFNLFVBQVUsZ0NBQWdDLENBQy9DLGtCQUF1QyxFQUN2QyxLQUE2QyxFQUM3QyxLQUE2QztJQUM3QyxPQUFPLEtBQUssRUFBRSxlQUFlLEtBQUssS0FBSyxFQUFFLGVBQWU7UUFDdkQsa0JBQWtCLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxRQUFRLENBQUM7UUFDbkUsa0JBQWtCLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxRQUFRLENBQUM7UUFDbkUsTUFBTSxDQUFvQixLQUFLLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDbEUsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3pFLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyJ9