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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yQ29tbW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vZWRpdG9yQ29tbW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBb05oRyxNQUFNLENBQU4sSUFBa0IsVUFHakI7QUFIRCxXQUFrQixVQUFVO0lBQzNCLCtDQUFVLENBQUE7SUFDVixxREFBYSxDQUFBO0FBQ2QsQ0FBQyxFQUhpQixVQUFVLEtBQVYsVUFBVSxRQUczQjtBQXNZRDs7R0FFRztBQUNILE1BQU0sVUFBVSxZQUFZLENBQUMsQ0FBTTtJQUNsQyxPQUFPLENBQUMsSUFBSSxPQUFPLENBQUMsQ0FBQyxFQUFFLEtBQUssUUFBUSxDQUFDO0FBQ3RDLENBQUM7QUEwSEQ7O0dBRUc7QUFDSCxNQUFNLENBQUMsTUFBTSxVQUFVLEdBQUc7SUFDekIsV0FBVyxFQUFFLHVCQUF1QjtJQUNwQyxXQUFXLEVBQUUsdUJBQXVCO0NBQ3BDLENBQUM7QUFFRjs7O0dBR0c7QUFDSCxNQUFNLENBQU4sSUFBa0IsT0FRakI7QUFSRCxXQUFrQixPQUFPO0lBQ3hCLGdEQUFxQyxDQUFBO0lBQ3JDLDRDQUFpQyxDQUFBO0lBQ2pDLHdCQUFhLENBQUE7SUFDYixzREFBMkMsQ0FBQTtJQUMzQyw4Q0FBbUMsQ0FBQTtJQUNuQywwQkFBZSxDQUFBO0lBQ2Ysc0JBQVcsQ0FBQTtBQUNaLENBQUMsRUFSaUIsT0FBTyxLQUFQLE9BQU8sUUFReEIifQ==