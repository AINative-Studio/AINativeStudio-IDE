/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Emitter } from '../../../base/common/event.js';
import { ILogService } from '../../../platform/log/common/log.js';
import * as typeConverters from './extHostTypeConverters.js';
let ExtHostNotebookEditors = class ExtHostNotebookEditors {
    constructor(_logService, _notebooksAndEditors) {
        this._logService = _logService;
        this._notebooksAndEditors = _notebooksAndEditors;
        this._onDidChangeNotebookEditorSelection = new Emitter();
        this._onDidChangeNotebookEditorVisibleRanges = new Emitter();
        this.onDidChangeNotebookEditorSelection = this._onDidChangeNotebookEditorSelection.event;
        this.onDidChangeNotebookEditorVisibleRanges = this._onDidChangeNotebookEditorVisibleRanges.event;
    }
    $acceptEditorPropertiesChanged(id, data) {
        this._logService.debug('ExtHostNotebook#$acceptEditorPropertiesChanged', id, data);
        const editor = this._notebooksAndEditors.getEditorById(id);
        // ONE: make all state updates
        if (data.visibleRanges) {
            editor._acceptVisibleRanges(data.visibleRanges.ranges.map(typeConverters.NotebookRange.to));
        }
        if (data.selections) {
            editor._acceptSelections(data.selections.selections.map(typeConverters.NotebookRange.to));
        }
        // TWO: send all events after states have been updated
        if (data.visibleRanges) {
            this._onDidChangeNotebookEditorVisibleRanges.fire({
                notebookEditor: editor.apiEditor,
                visibleRanges: editor.apiEditor.visibleRanges
            });
        }
        if (data.selections) {
            this._onDidChangeNotebookEditorSelection.fire(Object.freeze({
                notebookEditor: editor.apiEditor,
                selections: editor.apiEditor.selections
            }));
        }
    }
    $acceptEditorViewColumns(data) {
        for (const id in data) {
            const editor = this._notebooksAndEditors.getEditorById(id);
            editor._acceptViewColumn(typeConverters.ViewColumn.to(data[id]));
        }
    }
};
ExtHostNotebookEditors = __decorate([
    __param(0, ILogService)
], ExtHostNotebookEditors);
export { ExtHostNotebookEditors };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdE5vdGVib29rRWRpdG9ycy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2NvbW1vbi9leHRIb3N0Tm90ZWJvb2tFZGl0b3JzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUN4RCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFHbEUsT0FBTyxLQUFLLGNBQWMsTUFBTSw0QkFBNEIsQ0FBQztBQUl0RCxJQUFNLHNCQUFzQixHQUE1QixNQUFNLHNCQUFzQjtJQVFsQyxZQUNjLFdBQXlDLEVBQ3JDLG9CQUErQztRQURsQyxnQkFBVyxHQUFYLFdBQVcsQ0FBYTtRQUNyQyx5QkFBb0IsR0FBcEIsb0JBQW9CLENBQTJCO1FBUmhELHdDQUFtQyxHQUFHLElBQUksT0FBTyxFQUE2QyxDQUFDO1FBQy9GLDRDQUF1QyxHQUFHLElBQUksT0FBTyxFQUFpRCxDQUFDO1FBRS9HLHVDQUFrQyxHQUFHLElBQUksQ0FBQyxtQ0FBbUMsQ0FBQyxLQUFLLENBQUM7UUFDcEYsMkNBQXNDLEdBQUcsSUFBSSxDQUFDLHVDQUF1QyxDQUFDLEtBQUssQ0FBQztJQUtqRyxDQUFDO0lBRUwsOEJBQThCLENBQUMsRUFBVSxFQUFFLElBQXlDO1FBQ25GLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGdEQUFnRCxFQUFFLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNuRixNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsYUFBYSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQzNELDhCQUE4QjtRQUM5QixJQUFJLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUN4QixNQUFNLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxhQUFhLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUM3RixDQUFDO1FBQ0QsSUFBSSxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDckIsTUFBTSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsYUFBYSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDM0YsQ0FBQztRQUVELHNEQUFzRDtRQUN0RCxJQUFJLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUN4QixJQUFJLENBQUMsdUNBQXVDLENBQUMsSUFBSSxDQUFDO2dCQUNqRCxjQUFjLEVBQUUsTUFBTSxDQUFDLFNBQVM7Z0JBQ2hDLGFBQWEsRUFBRSxNQUFNLENBQUMsU0FBUyxDQUFDLGFBQWE7YUFDN0MsQ0FBQyxDQUFDO1FBQ0osQ0FBQztRQUNELElBQUksSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ3JCLElBQUksQ0FBQyxtQ0FBbUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQztnQkFDM0QsY0FBYyxFQUFFLE1BQU0sQ0FBQyxTQUFTO2dCQUNoQyxVQUFVLEVBQUUsTUFBTSxDQUFDLFNBQVMsQ0FBQyxVQUFVO2FBQ3ZDLENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztJQUNGLENBQUM7SUFFRCx3QkFBd0IsQ0FBQyxJQUFtQztRQUMzRCxLQUFLLE1BQU0sRUFBRSxJQUFJLElBQUksRUFBRSxDQUFDO1lBQ3ZCLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxhQUFhLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDM0QsTUFBTSxDQUFDLGlCQUFpQixDQUFDLGNBQWMsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDbEUsQ0FBQztJQUNGLENBQUM7Q0FDRCxDQUFBO0FBN0NZLHNCQUFzQjtJQVNoQyxXQUFBLFdBQVcsQ0FBQTtHQVRELHNCQUFzQixDQTZDbEMifQ==