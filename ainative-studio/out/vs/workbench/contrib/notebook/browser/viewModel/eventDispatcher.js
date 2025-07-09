/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { NotebookViewEventType } from '../notebookViewEvents.js';
export class NotebookEventDispatcher extends Disposable {
    constructor() {
        super(...arguments);
        this._onDidChangeLayout = this._register(new Emitter());
        this.onDidChangeLayout = this._onDidChangeLayout.event;
        this._onDidChangeMetadata = this._register(new Emitter());
        this.onDidChangeMetadata = this._onDidChangeMetadata.event;
        this._onDidChangeCellState = this._register(new Emitter());
        this.onDidChangeCellState = this._onDidChangeCellState.event;
    }
    emit(events) {
        for (let i = 0, len = events.length; i < len; i++) {
            const e = events[i];
            switch (e.type) {
                case NotebookViewEventType.LayoutChanged:
                    this._onDidChangeLayout.fire(e);
                    break;
                case NotebookViewEventType.MetadataChanged:
                    this._onDidChangeMetadata.fire(e);
                    break;
                case NotebookViewEventType.CellStateChanged:
                    this._onDidChangeCellState.fire(e);
                    break;
            }
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXZlbnREaXNwYXRjaGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvdmlld01vZGVsL2V2ZW50RGlzcGF0Y2hlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDOUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3JFLE9BQU8sRUFBOEcscUJBQXFCLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUU3SyxNQUFNLE9BQU8sdUJBQXdCLFNBQVEsVUFBVTtJQUF2RDs7UUFDa0IsdUJBQWtCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBOEIsQ0FBQyxDQUFDO1FBQ3ZGLHNCQUFpQixHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLENBQUM7UUFFMUMseUJBQW9CLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBZ0MsQ0FBQyxDQUFDO1FBQzNGLHdCQUFtQixHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxLQUFLLENBQUM7UUFFOUMsMEJBQXFCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBaUMsQ0FBQyxDQUFDO1FBQzdGLHlCQUFvQixHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxLQUFLLENBQUM7SUFtQmxFLENBQUM7SUFqQkEsSUFBSSxDQUFDLE1BQTJCO1FBQy9CLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsR0FBRyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNuRCxNQUFNLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFFcEIsUUFBUSxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQ2hCLEtBQUsscUJBQXFCLENBQUMsYUFBYTtvQkFDdkMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDaEMsTUFBTTtnQkFDUCxLQUFLLHFCQUFxQixDQUFDLGVBQWU7b0JBQ3pDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQ2xDLE1BQU07Z0JBQ1AsS0FBSyxxQkFBcUIsQ0FBQyxnQkFBZ0I7b0JBQzFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQ25DLE1BQU07WUFDUixDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7Q0FDRCJ9