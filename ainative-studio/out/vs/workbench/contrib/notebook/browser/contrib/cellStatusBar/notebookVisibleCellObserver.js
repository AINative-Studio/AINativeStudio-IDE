/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { diffSets } from '../../../../../../base/common/collections.js';
import { Emitter } from '../../../../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../../../../base/common/lifecycle.js';
import { isDefined } from '../../../../../../base/common/types.js';
import { cellRangesToIndexes } from '../../../common/notebookRange.js';
export class NotebookVisibleCellObserver extends Disposable {
    get visibleCells() {
        return this._visibleCells;
    }
    constructor(_notebookEditor) {
        super();
        this._notebookEditor = _notebookEditor;
        this._onDidChangeVisibleCells = this._register(new Emitter());
        this.onDidChangeVisibleCells = this._onDidChangeVisibleCells.event;
        this._viewModelDisposables = this._register(new DisposableStore());
        this._visibleCells = [];
        this._register(this._notebookEditor.onDidChangeVisibleRanges(this._updateVisibleCells, this));
        this._register(this._notebookEditor.onDidChangeModel(this._onModelChange, this));
        this._updateVisibleCells();
    }
    _onModelChange() {
        this._viewModelDisposables.clear();
        if (this._notebookEditor.hasModel()) {
            this._viewModelDisposables.add(this._notebookEditor.onDidChangeViewCells(() => this.updateEverything()));
        }
        this.updateEverything();
    }
    updateEverything() {
        this._onDidChangeVisibleCells.fire({ added: [], removed: Array.from(this._visibleCells) });
        this._visibleCells = [];
        this._updateVisibleCells();
    }
    _updateVisibleCells() {
        if (!this._notebookEditor.hasModel()) {
            return;
        }
        const newVisibleCells = cellRangesToIndexes(this._notebookEditor.visibleRanges)
            .map(index => this._notebookEditor.cellAt(index))
            .filter(isDefined);
        const newVisibleHandles = new Set(newVisibleCells.map(cell => cell.handle));
        const oldVisibleHandles = new Set(this._visibleCells.map(cell => cell.handle));
        const diff = diffSets(oldVisibleHandles, newVisibleHandles);
        const added = diff.added
            .map(handle => this._notebookEditor.getCellByHandle(handle))
            .filter(isDefined);
        const removed = diff.removed
            .map(handle => this._notebookEditor.getCellByHandle(handle))
            .filter(isDefined);
        this._visibleCells = newVisibleCells;
        this._onDidChangeVisibleCells.fire({
            added,
            removed
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tWaXNpYmxlQ2VsbE9ic2VydmVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvY29udHJpYi9jZWxsU3RhdHVzQmFyL25vdGVib29rVmlzaWJsZUNlbGxPYnNlcnZlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDeEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDekYsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBRW5FLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBT3ZFLE1BQU0sT0FBTywyQkFBNEIsU0FBUSxVQUFVO0lBUTFELElBQUksWUFBWTtRQUNmLE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQztJQUMzQixDQUFDO0lBRUQsWUFBNkIsZUFBZ0M7UUFDNUQsS0FBSyxFQUFFLENBQUM7UUFEb0Isb0JBQWUsR0FBZixlQUFlLENBQWlCO1FBWDVDLDZCQUF3QixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQThCLENBQUMsQ0FBQztRQUM3Riw0QkFBdUIsR0FBRyxJQUFJLENBQUMsd0JBQXdCLENBQUMsS0FBSyxDQUFDO1FBRXRELDBCQUFxQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxlQUFlLEVBQUUsQ0FBQyxDQUFDO1FBRXZFLGtCQUFhLEdBQXFCLEVBQUUsQ0FBQztRQVM1QyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxl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