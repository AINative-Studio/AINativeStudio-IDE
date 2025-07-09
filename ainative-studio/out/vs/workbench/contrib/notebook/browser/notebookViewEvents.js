/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export var NotebookViewEventType;
(function (NotebookViewEventType) {
    NotebookViewEventType[NotebookViewEventType["LayoutChanged"] = 1] = "LayoutChanged";
    NotebookViewEventType[NotebookViewEventType["MetadataChanged"] = 2] = "MetadataChanged";
    NotebookViewEventType[NotebookViewEventType["CellStateChanged"] = 3] = "CellStateChanged";
})(NotebookViewEventType || (NotebookViewEventType = {}));
export class NotebookLayoutChangedEvent {
    constructor(source, value) {
        this.source = source;
        this.value = value;
        this.type = NotebookViewEventType.LayoutChanged;
    }
}
export class NotebookMetadataChangedEvent {
    constructor(source) {
        this.source = source;
        this.type = NotebookViewEventType.MetadataChanged;
    }
}
export class NotebookCellStateChangedEvent {
    constructor(source, cell) {
        this.source = source;
        this.cell = cell;
        this.type = NotebookViewEventType.CellStateChanged;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tWaWV3RXZlbnRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvbm90ZWJvb2tWaWV3RXZlbnRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBc0NoRyxNQUFNLENBQU4sSUFBWSxxQkFJWDtBQUpELFdBQVkscUJBQXFCO0lBQ2hDLG1GQUFpQixDQUFBO0lBQ2pCLHVGQUFtQixDQUFBO0lBQ25CLHlGQUFvQixDQUFBO0FBQ3JCLENBQUMsRUFKVyxxQkFBcUIsS0FBckIscUJBQXFCLFFBSWhDO0FBRUQsTUFBTSxPQUFPLDBCQUEwQjtJQUd0QyxZQUFxQixNQUFpQyxFQUFXLEtBQXlCO1FBQXJFLFdBQU0sR0FBTixNQUFNLENBQTJCO1FBQVcsVUFBSyxHQUFMLEtBQUssQ0FBb0I7UUFGMUUsU0FBSSxHQUFHLHFCQUFxQixDQUFDLGFBQWEsQ0FBQztJQUkzRCxDQUFDO0NBQ0Q7QUFHRCxNQUFNLE9BQU8sNEJBQTRCO0lBR3hDLFlBQXFCLE1BQWdDO1FBQWhDLFdBQU0sR0FBTixNQUFNLENBQTBCO1FBRnJDLFNBQUksR0FBRyxxQkFBcUIsQ0FBQyxlQUFlLENBQUM7SUFJN0QsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLDZCQUE2QjtJQUd6QyxZQUFxQixNQUFxQyxFQUFXLElBQTJCO1FBQTNFLFdBQU0sR0FBTixNQUFNLENBQStCO1FBQVcsU0FBSSxHQUFKLElBQUksQ0FBdUI7UUFGaEYsU0FBSSxHQUFHLHFCQUFxQixDQUFDLGdCQUFnQixDQUFDO0lBSTlELENBQUM7Q0FDRCJ9