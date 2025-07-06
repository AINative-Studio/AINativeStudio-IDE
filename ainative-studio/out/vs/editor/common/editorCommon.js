/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export var ScrollType;
(function (ScrollType) {
    ScrollType[ScrollType["Smooth"] = 0] = "Smooth";
    ScrollType[ScrollType["Immediate"] = 1] = "Immediate";
})(ScrollType || (ScrollType = {}));
/**
 * @internal
 */
export function isThemeColor(o) {
    return o && typeof o.id === 'string';
}
/**
 * The type of the `IEditor`.
 */
export const EditorType = {
    ICodeEditor: 'vs.editor.ICodeEditor',
    IDiffEditor: 'vs.editor.IDiffEditor'
};
/**
 * Built-in commands.
 * @internal
 */
export var Handler;
(function (Handler) {
    Handler["CompositionStart"] = "compositionStart";
    Handler["CompositionEnd"] = "compositionEnd";
    Handler["Type"] = "type";
    Handler["ReplacePreviousChar"] = "replacePreviousChar";
    Handler["CompositionType"] = "compositionType";
    Handler["Paste"] = "paste";
    Handler["Cut"] = "cut";
})(Handler || (Handler = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yQ29tbW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL2VkaXRvckNvbW1vbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQW9OaEcsTUFBTSxDQUFOLElBQWtCLFVBR2pCO0FBSEQsV0FBa0IsVUFBVTtJQUMzQiwrQ0FBVSxDQUFBO0lBQ1YscURBQWEsQ0FBQTtBQUNkLENBQUMsRUFIaUIsVUFBVSxLQUFWLFVBQVUsUUFHM0I7QUFzWUQ7O0dBRUc7QUFDSCxNQUFNLFVBQVUsWUFBWSxDQUFDLENBQU07SUFDbEMsT0FBTyxDQUFDLElBQUksT0FBTyxDQUFDLENBQUMsRUFBRSxLQUFLLFFBQVEsQ0FBQztBQUN0QyxDQUFDO0FBMEhEOztHQUVHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sVUFBVSxHQUFHO0lBQ3pCLFdBQVcsRUFBRSx1QkFBdUI7SUFDcEMsV0FBVyxFQUFFLHVCQUF1QjtDQUNwQyxDQUFDO0FBRUY7OztHQUdHO0FBQ0gsTUFBTSxDQUFOLElBQWtCLE9BUWpCO0FBUkQsV0FBa0IsT0FBTztJQUN4QixnREFBcUMsQ0FBQTtJQUNyQyw0Q0FBaUMsQ0FBQTtJQUNqQyx3QkFBYSxDQUFBO0lBQ2Isc0RBQTJDLENBQUE7SUFDM0MsOENBQW1DLENBQUE7SUFDbkMsMEJBQWUsQ0FBQTtJQUNmLHNCQUFXLENBQUE7QUFDWixDQUFDLEVBUmlCLE9BQU8sS0FBUCxPQUFPLFFBUXhCIn0=