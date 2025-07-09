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
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { ResourceMap } from '../../../../../../base/common/map.js';
import { Schemas } from '../../../../../../base/common/network.js';
import { isEqual } from '../../../../../../base/common/resources.js';
import { Registry } from '../../../../../../platform/registry/common/platform.js';
import { Extensions as WorkbenchExtensions } from '../../../../../common/contributions.js';
import { IDebugService } from '../../../../debug/common/debug.js';
import { getNotebookEditorFromEditorPane } from '../../notebookBrowser.js';
import { CellUri, NotebookCellsChangeType } from '../../../common/notebookCommon.js';
import { INotebookService } from '../../../common/notebookService.js';
import { IEditorService } from '../../../../../services/editor/common/editorService.js';
let NotebookBreakpoints = class NotebookBreakpoints extends Disposable {
    constructor(_debugService, _notebookService, _editorService) {
        super();
        this._debugService = _debugService;
        this._editorService = _editorService;
        const listeners = new ResourceMap();
        this._register(_notebookService.onWillAddNotebookDocument(model => {
            listeners.set(model.uri, model.onWillAddRemoveCells(e => {
                // When deleting a cell, remove its breakpoints
                const debugModel = this._debugService.getModel();
                if (!debugModel.getBreakpoints().length) {
                    return;
                }
                if (e.rawEvent.kind !== NotebookCellsChangeType.ModelChange) {
                    return;
                }
                for (const change of e.rawEvent.changes) {
                    const [start, deleteCount] = change;
                    if (deleteCount > 0) {
                        const deleted = model.cells.slice(start, start + deleteCount);
                        for (const deletedCell of deleted) {
                            const cellBps = debugModel.getBreakpoints({ uri: deletedCell.uri });
                            cellBps.forEach(cellBp => this._debugService.removeBreakpoints(cellBp.getId()));
                        }
                    }
                }
            }));
        }));
        this._register(_notebookService.onWillRemoveNotebookDocument(model => {
            this.updateBreakpoints(model);
            listeners.get(model.uri)?.dispose();
            listeners.delete(model.uri);
        }));
        this._register(this._debugService.getModel().onDidChangeBreakpoints(e => {
            const newCellBp = e?.added?.find(bp => 'uri' in bp && bp.uri.scheme === Schemas.vscodeNotebookCell);
            if (newCellBp) {
                const parsed = CellUri.parse(newCellBp.uri);
                if (!parsed) {
                    return;
                }
                const editor = getNotebookEditorFromEditorPane(this._editorService.activeEditorPane);
                if (!editor || !editor.hasModel() || editor.textModel.uri.toString() !== parsed.notebook.toString()) {
                    return;
                }
                const cell = editor.getCellByHandle(parsed.handle);
                if (!cell) {
                    return;
                }
                editor.focusElement(cell);
            }
        }));
    }
    updateBreakpoints(model) {
        const bps = this._debugService.getModel().getBreakpoints();
        if (!bps.length || !model.cells.length) {
            return;
        }
        const idxMap = new ResourceMap();
        model.cells.forEach((cell, i) => {
            idxMap.set(cell.uri, i);
        });
        bps.forEach(bp => {
            const idx = idxMap.get(bp.uri);
            if (typeof idx !== 'number') {
                return;
            }
            const notebook = CellUri.parse(bp.uri)?.notebook;
            if (!notebook) {
                return;
            }
            const newUri = CellUri.generate(notebook, idx);
            if (isEqual(newUri, bp.uri)) {
                return;
            }
            this._debugService.removeBreakpoints(bp.getId());
            this._debugService.addBreakpoints(newUri, [
                {
                    column: bp.column,
                    condition: bp.condition,
                    enabled: bp.enabled,
                    hitCondition: bp.hitCondition,
                    logMessage: bp.logMessage,
                    lineNumber: bp.lineNumber
                }
            ]);
        });
    }
};
NotebookBreakpoints = __decorate([
    __param(0, IDebugService),
    __param(1, INotebookService),
    __param(2, IEditorService)
], NotebookBreakpoints);
Registry.as(WorkbenchExtensions.Workbench).registerWorkbenchContribution(NotebookBreakpoints, 3 /* LifecyclePhase.Restored */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tCcmVha3BvaW50cy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL2NvbnRyaWIvZGVidWcvbm90ZWJvb2tCcmVha3BvaW50cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFlLE1BQU0sNENBQTRDLENBQUM7QUFDckYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDckUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxVQUFVLElBQUksbUJBQW1CLEVBQTJELE1BQU0sd0NBQXdDLENBQUM7QUFDcEosT0FBTyxFQUFlLGFBQWEsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQy9FLE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBRTNFLE9BQU8sRUFBRSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNyRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUN0RSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFHeEYsSUFBTSxtQkFBbUIsR0FBekIsTUFBTSxtQkFBb0IsU0FBUSxVQUFVO0lBQzNDLFlBQ2lDLGFBQTRCLEVBQzFDLGdCQUFrQyxFQUNuQixjQUE4QjtRQUUvRCxLQUFLLEVBQUUsQ0FBQztRQUp3QixrQkFBYSxHQUFiLGFBQWEsQ0FBZTtR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