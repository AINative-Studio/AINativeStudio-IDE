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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tWaWV3RXZlbnRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL25vdGVib29rVmlld0V2ZW50cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQXNDaEcsTUFBTSxDQUFOLElBQVkscUJBSVg7QUFKRCxXQUFZLHFCQUFxQjtJQUNoQyxtRkFBaUIsQ0FBQTtJQUNqQix1RkFBbUIsQ0FBQTtJQUNuQix5RkFBb0IsQ0FBQTtBQUNyQixDQUFDLEVBSlcscUJBQXFCLEtBQXJCLHFCQUFxQixRQUloQztBQUVELE1BQU0sT0FBTywwQkFBMEI7SUFHdEMsWUFBcUIsTUFBaUMsRUFBVyxLQUF5QjtRQUFyRSxXQUFNLEdBQU4sTUFBTSxDQUEyQjtRQUFXLFVBQUssR0FBTCxLQUFLLENBQW9CO1FBRjFFLFNBQUksR0FBRyxxQkFBcUIsQ0FBQyxhQUFhLENBQUM7SUFJM0QsQ0FBQztDQUNEO0FBR0QsTUFBTSxPQUFPLDRCQUE0QjtJQUd4QyxZQUFxQixNQUFnQztRQUFoQyxXQUFNLEdBQU4sTUFBTSxDQUEwQjtRQUZyQyxTQUFJLEdBQUcscUJBQXFCLENBQUMsZUFBZSxDQUFDO0lBSTdELENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyw2QkFBNkI7SUFHekMsWUFBcUIsTUFBcUMsRUFBVyxJQUEyQjtRQUEzRSxXQUFNLEdBQU4sTUFBTSxDQUErQjtRQUFXLFNBQUksR0FBSixJQUFJLENBQXVCO1FBRmhGLFNBQUksR0FBRyxxQkFBcUIsQ0FBQyxnQkFBZ0IsQ0FBQztJQUk5RCxDQUFDO0NBQ0QifQ==