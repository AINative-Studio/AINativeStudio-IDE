/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
export var NotebookDiffViewEventType;
(function (NotebookDiffViewEventType) {
    NotebookDiffViewEventType[NotebookDiffViewEventType["LayoutChanged"] = 1] = "LayoutChanged";
    NotebookDiffViewEventType[NotebookDiffViewEventType["CellLayoutChanged"] = 2] = "CellLayoutChanged";
    // MetadataChanged = 2,
    // CellStateChanged = 3
})(NotebookDiffViewEventType || (NotebookDiffViewEventType = {}));
export class NotebookDiffLayoutChangedEvent {
    constructor(source, value) {
        this.source = source;
        this.value = value;
        this.type = NotebookDiffViewEventType.LayoutChanged;
    }
}
export class NotebookCellLayoutChangedEvent {
    constructor(source) {
        this.source = source;
        this.type = NotebookDiffViewEventType.CellLayoutChanged;
    }
}
export class NotebookDiffEditorEventDispatcher extends Disposable {
    constructor() {
        super(...arguments);
        this._onDidChangeLayout = this._register(new Emitter());
        this.onDidChangeLayout = this._onDidChangeLayout.event;
        this._onDidChangeCellLayout = this._register(new Emitter());
        this.onDidChangeCellLayout = this._onDidChangeCellLayout.event;
    }
    emit(events) {
        for (let i = 0, len = events.length; i < len; i++) {
            const e = events[i];
            switch (e.type) {
                case NotebookDiffViewEventType.LayoutChanged:
                    this._onDidChangeLayout.fire(e);
                    break;
                case NotebookDiffViewEventType.CellLayoutChanged:
                    this._onDidChangeCellLayout.fire(e);
                    break;
            }
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXZlbnREaXNwYXRjaGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvZGlmZi9ldmVudERpc3BhdGNoZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUlyRSxNQUFNLENBQU4sSUFBWSx5QkFLWDtBQUxELFdBQVkseUJBQXlCO0lBQ3BDLDJGQUFpQixDQUFBO0lBQ2pCLG1HQUFxQixDQUFBO0lBQ3JCLHVCQUF1QjtJQUN2Qix1QkFBdUI7QUFDeEIsQ0FBQyxFQUxXLHlCQUF5QixLQUF6Qix5QkFBeUIsUUFLcEM7QUFFRCxNQUFNLE9BQU8sOEJBQThCO0lBRzFDLFlBQXFCLE1BQWlDLEVBQVcsS0FBeUI7UUFBckUsV0FBTSxHQUFOLE1BQU0sQ0FBMkI7UUFBVyxVQUFLLEdBQUwsS0FBSyxDQUFvQjtRQUYxRSxTQUFJLEdBQUcseUJBQXlCLENBQUMsYUFBYSxDQUFDO0lBSS9ELENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyw4QkFBOEI7SUFHMUMsWUFBcUIsTUFBOEI7UUFBOUIsV0FBTSxHQUFOLE1BQU0sQ0FBd0I7UUFGbkMsU0FBSSxHQUFHLHlCQUF5QixDQUFDLGlCQUFpQixDQUFDO0lBSW5FLENBQUM7Q0FDRDtBQUlELE1BQU0sT0FBTyxpQ0FBa0MsU0FBUSxVQUFVO0lBQWpFOztRQUNvQix1QkFBa0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFrQyxDQUFDLENBQUM7UUFDN0Ysc0JBQWlCLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQztRQUV4QywyQkFBc0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFrQyxDQUFDLENBQUM7UUFDakcsMEJBQXFCLEdBQUcsSUFBSSxDQUFDLHNCQUFzQixDQUFDLEtBQUssQ0FBQztJQWdCcEUsQ0FBQztJQWRBLElBQUksQ0FBQyxNQUErQjtRQUNuQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxHQUFHLEdBQUcsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDbkQsTUFBTSxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBRXBCLFFBQVEsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUNoQixLQUFLLHlCQUF5QixDQUFDLGFBQWE7b0JBQzNDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQ2hDLE1BQU07Z0JBQ1AsS0FBSyx5QkFBeUIsQ0FBQyxpQkFBaUI7b0JBQy9DLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQ3BDLE1BQU07WUFDUixDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7Q0FDRCJ9