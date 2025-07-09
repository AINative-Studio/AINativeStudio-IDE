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
import { Delayer } from '../../../../../../base/common/async.js';
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { Range } from '../../../../../../editor/common/core/range.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { debugIconBreakpointForeground } from '../../../../debug/browser/breakpointEditorContribution.js';
import { focusedStackFrameColor, topStackFrameColor } from '../../../../debug/browser/callStackEditorContribution.js';
import { IDebugService } from '../../../../debug/common/debug.js';
import { NotebookOverviewRulerLane } from '../../notebookBrowser.js';
import { registerNotebookContribution } from '../../notebookEditorExtensions.js';
import { runningCellRulerDecorationColor } from '../../notebookEditorWidget.js';
import { CellUri, NotebookCellExecutionState } from '../../../common/notebookCommon.js';
import { INotebookExecutionStateService, NotebookExecutionType } from '../../../common/notebookExecutionStateService.js';
let PausedCellDecorationContribution = class PausedCellDecorationContribution extends Disposable {
    static { this.id = 'workbench.notebook.debug.pausedCellDecorations'; }
    constructor(_notebookEditor, _debugService, _notebookExecutionStateService) {
        super();
        this._notebookEditor = _notebookEditor;
        this._debugService = _debugService;
        this._notebookExecutionStateService = _notebookExecutionStateService;
        this._currentTopDecorations = [];
        this._currentOtherDecorations = [];
        this._executingCellDecorations = [];
        const delayer = this._register(new Delayer(200));
        this._register(_debugService.getModel().onDidChangeCallStack(() => this.updateExecutionDecorations()));
        this._register(_debugService.getViewModel().onDidFocusStackFrame(() => this.updateExecutionDecorations()));
        this._register(_notebookExecutionStateService.onDidChangeExecution(e => {
            if (e.type === NotebookExecutionType.cell && this._notebookEditor.textModel && e.affectsNotebook(this._notebookEditor.textModel.uri)) {
                delayer.trigger(() => this.updateExecutionDecorations());
            }
        }));
    }
    updateExecutionDecorations() {
        const exes = this._notebookEditor.textModel ?
            this._notebookExecutionStateService.getCellExecutionsByHandleForNotebook(this._notebookEditor.textModel.uri)
            : undefined;
        const topFrameCellsAndRanges = [];
        let focusedFrameCellAndRange = undefined;
        const getNotebookCellAndRange = (sf) => {
            const parsed = CellUri.parse(sf.source.uri);
            if (parsed && parsed.notebook.toString() === this._notebookEditor.textModel?.uri.toString()) {
                return { handle: parsed.handle, range: sf.range };
            }
            return undefined;
        };
        for (const session of this._debugService.getModel().getSessions()) {
            for (const thread of session.getAllThreads()) {
                const topFrame = thread.getTopStackFrame();
                if (topFrame) {
                    const notebookCellAndRange = getNotebookCellAndRange(topFrame);
                    if (notebookCellAndRange) {
                        topFrameCellsAndRanges.push(notebookCellAndRange);
                        exes?.delete(notebookCellAndRange.handle);
                    }
                }
            }
        }
        const focusedFrame = this._debugService.getViewModel().focusedStackFrame;
        if (focusedFrame && focusedFrame.thread.stopped) {
            const thisFocusedFrameCellAndRange = getNotebookCellAndRange(focusedFrame);
            if (thisFocusedFrameCellAndRange &&
                !topFrameCellsAndRanges.some(topFrame => topFrame.handle === thisFocusedFrameCellAndRange?.handle && Range.equalsRange(topFrame.range, thisFocusedFrameCellAndRange?.range))) {
                focusedFrameCellAndRange = thisFocusedFrameCellAndRange;
                exes?.delete(focusedFrameCellAndRange.handle);
            }
        }
        this.setTopFrameDecoration(topFrameCellsAndRanges);
        this.setFocusedFrameDecoration(focusedFrameCellAndRange);
        const exeHandles = exes ?
            Array.from(exes.entries())
                .filter(([_, exe]) => exe.state === NotebookCellExecutionState.Executing)
                .map(([handle]) => handle)
            : [];
        this.setExecutingCellDecorations(exeHandles);
    }
    setTopFrameDecoration(handlesAndRanges) {
        const newDecorations = handlesAndRanges.map(({ handle, range }) => {
            const options = {
                overviewRuler: {
                    color: topStackFrameColor,
                    includeOutput: false,
                    modelRanges: [range],
                    position: NotebookOverviewRulerLane.Full
                }
            };
            return {
                handle,
                options
            };
        });
        this._currentTopDecorations = this._notebookEditor.deltaCellDecorations(this._currentTopDecorations, newDecorations);
    }
    setFocusedFrameDecoration(focusedFrameCellAndRange) {
        let newDecorations = [];
        if (focusedFrameCellAndRange) {
            const options = {
                overviewRuler: {
                    color: focusedStackFrameColor,
                    includeOutput: false,
                    modelRanges: [focusedFrameCellAndRange.range],
                    position: NotebookOverviewRulerLane.Full
                }
            };
            newDecorations = [{
                    handle: focusedFrameCellAndRange.handle,
                    options
                }];
        }
        this._currentOtherDecorations = this._notebookEditor.deltaCellDecorations(this._currentOtherDecorations, newDecorations);
    }
    setExecutingCellDecorations(handles) {
        const newDecorations = handles.map(handle => {
            const options = {
                overviewRuler: {
                    color: runningCellRulerDecorationColor,
                    includeOutput: false,
                    modelRanges: [new Range(0, 0, 0, 0)],
                    position: NotebookOverviewRulerLane.Left
                }
            };
            return {
                handle,
                options
            };
        });
        this._executingCellDecorations = this._notebookEditor.deltaCellDecorations(this._executingCellDecorations, newDecorations);
    }
};
PausedCellDecorationContribution = __decorate([
    __param(1, IDebugService),
    __param(2, INotebookExecutionStateService)
], PausedCellDecorationContribution);
export { PausedCellDecorationContribution };
registerNotebookContribution(PausedCellDecorationContribution.id, PausedCellDecorationContribution);
let NotebookBreakpointDecorations = class NotebookBreakpointDecorations extends Disposable {
    static { this.id = 'workbench.notebook.debug.notebookBreakpointDecorations'; }
    constructor(_notebookEditor, _debugService, _configService) {
        super();
        this._notebookEditor = _notebookEditor;
        this._debugService = _debugService;
        this._configService = _configService;
        this._currentDecorations = [];
        this._register(_debugService.getModel().onDidChangeBreakpoints(() => this.updateDecorations()));
        this._register(_configService.onDidChangeConfiguration(e => e.affectsConfiguration('debug.showBreakpointsInOverviewRuler') && this.updateDecorations()));
    }
    updateDecorations() {
        const enabled = this._configService.getValue('debug.showBreakpointsInOverviewRuler');
        const newDecorations = enabled ?
            this._debugService.getModel().getBreakpoints().map(breakpoint => {
                const parsed = CellUri.parse(breakpoint.uri);
                if (!parsed || parsed.notebook.toString() !== this._notebookEditor.textModel.uri.toString()) {
                    return null;
                }
                const options = {
                    overviewRuler: {
                        color: debugIconBreakpointForeground,
                        includeOutput: false,
                        modelRanges: [new Range(breakpoint.lineNumber, 0, breakpoint.lineNumber, 0)],
                        position: NotebookOverviewRulerLane.Left
                    }
                };
                return { handle: parsed.handle, options };
            }).filter(x => !!x)
            : [];
        this._currentDecorations = this._notebookEditor.deltaCellDecorations(this._currentDecorations, newDecorations);
    }
};
NotebookBreakpointDecorations = __decorate([
    __param(1, IDebugService),
    __param(2, IConfigurationService)
], NotebookBreakpointDecorations);
export { NotebookBreakpointDecorations };
registerNotebookContribution(NotebookBreakpointDecorations.id, NotebookBreakpointDecorations);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tEZWJ1Z0RlY29yYXRpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvY29udHJpYi9kZWJ1Zy9ub3RlYm9va0RlYnVnRGVjb3JhdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUN4RSxPQUFPLEVBQVUsS0FBSyxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDOUUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0VBQWtFLENBQUM7QUFDekcsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sMkRBQTJELENBQUM7QUFDMUcsT0FBTyxFQUFFLHNCQUFzQixFQUFFLGtCQUFrQixFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDdEgsT0FBTyxFQUFFLGFBQWEsRUFBZSxNQUFNLG1DQUFtQyxDQUFDO0FBQy9FLE9BQU8sRUFBOEcseUJBQXlCLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUNqTCxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNqRixPQUFPLEVBQUUsK0JBQStCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUNoRixPQUFPLEVBQUUsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDeEYsT0FBTyxFQUFFLDhCQUE4QixFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFPbEgsSUFBTSxnQ0FBZ0MsR0FBdEMsTUFBTSxnQ0FBaUMsU0FBUSxVQUFVO2FBQ3hELE9BQUUsR0FBVyxn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