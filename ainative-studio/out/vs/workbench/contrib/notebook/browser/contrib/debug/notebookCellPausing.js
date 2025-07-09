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
import { RunOnceScheduler } from '../../../../../../base/common/async.js';
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { URI } from '../../../../../../base/common/uri.js';
import { Registry } from '../../../../../../platform/registry/common/platform.js';
import { Extensions as WorkbenchExtensions } from '../../../../../common/contributions.js';
import { IDebugService } from '../../../../debug/common/debug.js';
import { CellUri } from '../../../common/notebookCommon.js';
import { CellExecutionUpdateType } from '../../../common/notebookExecutionService.js';
import { INotebookExecutionStateService } from '../../../common/notebookExecutionStateService.js';
let NotebookCellPausing = class NotebookCellPausing extends Disposable {
    constructor(_debugService, _notebookExecutionStateService) {
        super();
        this._debugService = _debugService;
        this._notebookExecutionStateService = _notebookExecutionStateService;
        this._pausedCells = new Set();
        this._register(_debugService.getModel().onDidChangeCallStack(() => {
            // First update using the stale callstack if the real callstack is empty, to reduce blinking while stepping.
            // After not pausing for 2s, update again with the latest callstack.
            this.onDidChangeCallStack(true);
            this._scheduler.schedule();
        }));
        this._scheduler = this._register(new RunOnceScheduler(() => this.onDidChangeCallStack(false), 2000));
    }
    async onDidChangeCallStack(fallBackOnStaleCallstack) {
        const newPausedCells = new Set();
        for (const session of this._debugService.getModel().getSessions()) {
            for (const thread of session.getAllThreads()) {
                let callStack = thread.getCallStack();
                if (fallBackOnStaleCallstack && !callStack.length) {
                    callStack = thread.getStaleCallStack();
                }
                callStack.forEach(sf => {
                    const parsed = CellUri.parse(sf.source.uri);
                    if (parsed) {
                        newPausedCells.add(sf.source.uri.toString());
                        this.editIsPaused(sf.source.uri, true);
                    }
                });
            }
        }
        for (const uri of this._pausedCells) {
            if (!newPausedCells.has(uri)) {
                this.editIsPaused(URI.parse(uri), false);
                this._pausedCells.delete(uri);
            }
        }
        newPausedCells.forEach(cell => this._pausedCells.add(cell));
    }
    editIsPaused(cellUri, isPaused) {
        const parsed = CellUri.parse(cellUri);
        if (parsed) {
            const exeState = this._notebookExecutionStateService.getCellExecution(cellUri);
            if (exeState && (exeState.isPaused !== isPaused || !exeState.didPause)) {
                exeState.update([{
                        editType: CellExecutionUpdateType.ExecutionState,
                        didPause: true,
                        isPaused
                    }]);
            }
        }
    }
};
NotebookCellPausing = __decorate([
    __param(0, IDebugService),
    __param(1, INotebookExecutionStateService)
], NotebookCellPausing);
Registry.as(WorkbenchExtensions.Workbench).registerWorkbenchContribution(NotebookCellPausing, 3 /* LifecyclePhase.Restored */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tDZWxsUGF1c2luZy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL2NvbnRyaWIvZGVidWcvbm90ZWJvb2tDZWxsUGF1c2luZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUMxRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDeEUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUNsRixPQUFPLEVBQUUsVUFBVSxJQUFJLG1CQUFtQixFQUEyRCxNQUFNLHdDQUF3QyxDQUFDO0FBQ3BKLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUVsRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDNUQsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDdEYsT0FBTyxFQUFFLDhCQUE4QixFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFHbEcsSUFBTSxtQkFBbUIsR0FBekIsTUFBTSxtQkFBb0IsU0FBUSxVQUFVO0lBSzNDLFlBQ2dCLGFBQTZDLEVBQzVCLDhCQUErRTtRQUUvRyxLQUFLLEVBQUUsQ0FBQztRQUh3QixrQkFBYSxHQUFiLGFBQWEsQ0FBZTtRQUNYLG1DQUE4QixHQUE5Qiw4QkFBOEIsQ0FBZ0M7UUFOL0YsaUJBQVksR0FBRyxJQUFJLEdBQUcsRUFBVSxDQUFDO1FBVWpELElBQUksQ0FBQyxTQUFTLENBQUMsYUFBYSxDQUFDLFFBQVEs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