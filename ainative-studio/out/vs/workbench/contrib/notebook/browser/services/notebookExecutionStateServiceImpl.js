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
import { Emitter } from '../../../../../base/common/event.js';
import { combinedDisposable, Disposable } from '../../../../../base/common/lifecycle.js';
import { ResourceMap } from '../../../../../base/common/map.js';
import { isEqual } from '../../../../../base/common/resources.js';
import { generateUuid } from '../../../../../base/common/uuid.js';
import { AccessibilitySignal, IAccessibilitySignalService } from '../../../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { CellUri, NotebookCellExecutionState, NotebookExecutionState } from '../../common/notebookCommon.js';
import { CellExecutionUpdateType, INotebookExecutionService } from '../../common/notebookExecutionService.js';
import { INotebookExecutionStateService, NotebookExecutionType } from '../../common/notebookExecutionStateService.js';
import { INotebookKernelService } from '../../common/notebookKernelService.js';
import { INotebookService } from '../../common/notebookService.js';
let NotebookExecutionStateService = class NotebookExecutionStateService extends Disposable {
    constructor(_instantiationService, _logService, _notebookService, _accessibilitySignalService) {
        super();
        this._instantiationService = _instantiationService;
        this._logService = _logService;
        this._notebookService = _notebookService;
        this._accessibilitySignalService = _accessibilitySignalService;
        this._executions = new ResourceMap();
        this._notebookExecutions = new ResourceMap();
        this._notebookListeners = new ResourceMap();
        this._cellListeners = new ResourceMap();
        this._lastFailedCells = new ResourceMap();
        this._lastCompletedCellHandles = new ResourceMap();
        this._onDidChangeExecution = this._register(new Emitter());
        this.onDidChangeExecution = this._onDidChangeExecution.event;
        this._onDidChangeLastRunFailState = this._register(new Emitter());
        this.onDidChangeLastRunFailState = this._onDidChangeLastRunFailState.event;
    }
    getLastFailedCellForNotebook(notebook) {
        const failedCell = this._lastFailedCells.get(notebook);
        return failedCell?.visible ? failedCell.cellHandle : undefined;
    }
    getLastCompletedCellForNotebook(notebook) {
        return this._lastCompletedCellHandles.get(notebook);
    }
    forceCancelNotebookExecutions(notebookUri) {
        const notebookCellExecutions = this._executions.get(notebookUri);
        if (notebookCellExecutions) {
            for (const exe of notebookCellExecutions.values()) {
                this._onCellExecutionDidComplete(notebookUri, exe.cellHandle, exe);
            }
        }
        if (this._notebookExecutions.has(notebookUri)) {
            this._onExecutionDidComplete(notebookUri);
        }
    }
    getCellExecution(cellUri) {
        const parsed = CellUri.parse(cellUri);
        if (!parsed) {
            throw new Error(`Not a cell URI: ${cellUri}`);
        }
        const exeMap = this._executions.get(parsed.notebook);
        if (exeMap) {
            return exeMap.get(parsed.handle);
        }
        return undefined;
    }
    getExecution(notebook) {
        return this._notebookExecutions.get(notebook)?.[0];
    }
    getCellExecutionsForNotebook(notebook) {
        const exeMap = this._executions.get(notebook);
        return exeMap ? Array.from(exeMap.values()) : [];
    }
    getCellExecutionsByHandleForNotebook(notebook) {
        const exeMap = this._executions.get(notebook);
        return exeMap ? new Map(exeMap.entries()) : undefined;
    }
    _onCellExecutionDidChange(notebookUri, cellHandle, exe) {
        this._onDidChangeExecution.fire(new NotebookCellExecutionEvent(notebookUri, cellHandle, exe));
    }
    _onCellExecutionDidComplete(notebookUri, cellHandle, exe, lastRunSuccess) {
        const notebookExecutions = this._executions.get(notebookUri);
        if (!notebookExecutions) {
            this._logService.debug(`NotebookExecutionStateService#_onCellExecutionDidComplete - unknown notebook ${notebookUri.toString()}`);
            return;
        }
        exe.dispose();
        const cellUri = CellUri.generate(notebookUri, cellHandle);
        this._cellListeners.get(cellUri)?.dispose();
        this._cellListeners.delete(cellUri);
        notebookExecutions.delete(cellHandle);
        if (notebookExecutions.size === 0) {
            this._executions.delete(notebookUri);
            this._notebookListeners.get(notebookUri)?.dispose();
            this._notebookListeners.delete(notebookUri);
        }
        if (lastRunSuccess !== undefined) {
            if (lastRunSuccess) {
                if (this._executions.size === 0) {
                    this._accessibilitySignalService.playSignal(AccessibilitySignal.notebookCellCompleted);
                }
                this._clearLastFailedCell(notebookUri);
            }
            else {
                this._accessibilitySignalService.playSignal(AccessibilitySignal.notebookCellFailed);
                this._setLastFailedCell(notebookUri, cellHandle);
            }
            this._lastCompletedCellHandles.set(notebookUri, cellHandle);
        }
        this._onDidChangeExecution.fire(new NotebookCellExecutionEvent(notebookUri, cellHandle));
    }
    _onExecutionDidChange(notebookUri, exe) {
        this._onDidChangeExecution.fire(new NotebookExecutionEvent(notebookUri, exe));
    }
    _onExecutionDidComplete(notebookUri) {
        const disposables = this._notebookExecutions.get(notebookUri);
        if (!Array.isArray(disposables)) {
            this._logService.debug(`NotebookExecutionStateService#_onCellExecutionDidComplete - unknown notebook ${notebookUri.toString()}`);
            return;
        }
        this._notebookExecutions.delete(notebookUri);
        this._onDidChangeExecution.fire(new NotebookExecutionEvent(notebookUri));
        disposables.forEach(d => d.dispose());
    }
    createCellExecution(notebookUri, cellHandle) {
        const notebook = this._notebookService.getNotebookTextModel(notebookUri);
        if (!notebook) {
            throw new Error(`Notebook not found: ${notebookUri.toString()}`);
        }
        let notebookExecutionMap = this._executions.get(notebookUri);
        if (!notebookExecutionMap) {
            const listeners = this._instantiationService.createInstance(NotebookExecutionListeners, notebookUri);
            this._notebookListeners.set(notebookUri, listeners);
            notebookExecutionMap = new Map();
            this._executions.set(notebookUri, notebookExecutionMap);
        }
        let exe = notebookExecutionMap.get(cellHandle);
        if (!exe) {
            exe = this._createNotebookCellExecution(notebook, cellHandle);
            notebookExecutionMap.set(cellHandle, exe);
            exe.initialize();
            this._onDidChangeExecution.fire(new NotebookCellExecutionEvent(notebookUri, cellHandle, exe));
        }
        return exe;
    }
    createExecution(notebookUri) {
        const notebook = this._notebookService.getNotebookTextModel(notebookUri);
        if (!notebook) {
            throw new Error(`Notebook not found: ${notebookUri.toString()}`);
        }
        if (!this._notebookListeners.has(notebookUri)) {
            const listeners = this._instantiationService.createInstance(NotebookExecutionListeners, notebookUri);
            this._notebookListeners.set(notebookUri, listeners);
        }
        let info = this._notebookExecutions.get(notebookUri);
        if (!info) {
            info = this._createNotebookExecution(notebook);
            this._notebookExecutions.set(notebookUri, info);
            this._onDidChangeExecution.fire(new NotebookExecutionEvent(notebookUri, info[0]));
        }
        return info[0];
    }
    _createNotebookCellExecution(notebook, cellHandle) {
        const notebookUri = notebook.uri;
        const exe = this._instantiationService.createInstance(CellExecution, cellHandle, notebook);
        const disposable = combinedDisposable(exe.onDidUpdate(() => this._onCellExecutionDidChange(notebookUri, cellHandle, exe)), exe.onDidComplete(lastRunSuccess => this._onCellExecutionDidComplete(notebookUri, cellHandle, exe, lastRunSuccess)));
        this._cellListeners.set(CellUri.generate(notebookUri, cellHandle), disposable);
        return exe;
    }
    _createNotebookExecution(notebook) {
        const notebookUri = notebook.uri;
        const exe = this._instantiationService.createInstance(NotebookExecution, notebook);
        const disposable = combinedDisposable(exe.onDidUpdate(() => this._onExecutionDidChange(notebookUri, exe)), exe.onDidComplete(() => this._onExecutionDidComplete(notebookUri)));
        return [exe, disposable];
    }
    _setLastFailedCell(notebookURI, cellHandle) {
        const prevLastFailedCellInfo = this._lastFailedCells.get(notebookURI);
        const notebook = this._notebookService.getNotebookTextModel(notebookURI);
        if (!notebook) {
            return;
        }
        const newLastFailedCellInfo = {
            cellHandle: cellHandle,
            disposable: prevLastFailedCellInfo ? prevLastFailedCellInfo.disposable : this._getFailedCellListener(notebook),
            visible: true
        };
        this._lastFailedCells.set(notebookURI, newLastFailedCellInfo);
        this._onDidChangeLastRunFailState.fire({ visible: true, notebook: notebookURI });
    }
    _setLastFailedCellVisibility(notebookURI, visible) {
        const lastFailedCellInfo = this._lastFailedCells.get(notebookURI);
        if (lastFailedCellInfo) {
            this._lastFailedCells.set(notebookURI, {
                cellHandle: lastFailedCellInfo.cellHandle,
                disposable: lastFailedCellInfo.disposable,
                visible: visible,
            });
        }
        this._onDidChangeLastRunFailState.fire({ visible: visible, notebook: notebookURI });
    }
    _clearLastFailedCell(notebookURI) {
        const lastFailedCellInfo = this._lastFailedCells.get(notebookURI);
        if (lastFailedCellInfo) {
            lastFailedCellInfo.disposable?.dispose();
            this._lastFailedCells.delete(notebookURI);
        }
        this._onDidChangeLastRunFailState.fire({ visible: false, notebook: notebookURI });
    }
    _getFailedCellListener(notebook) {
        return notebook.onWillAddRemoveCells((e) => {
            const lastFailedCell = this._lastFailedCells.get(notebook.uri)?.cellHandle;
            if (lastFailedCell !== undefined) {
                const lastFailedCellPos = notebook.cells.findIndex(c => c.handle === lastFailedCell);
                e.rawEvent.changes.forEach(([start, deleteCount, addedCells]) => {
                    if (deleteCount) {
                        if (lastFailedCellPos >= start && lastFailedCellPos < start + deleteCount) {
                            this._setLastFailedCellVisibility(notebook.uri, false);
                        }
                    }
                    if (addedCells.some(cell => cell.handle === lastFailedCell)) {
                        this._setLastFailedCellVisibility(notebook.uri, true);
                    }
                });
            }
        });
    }
    dispose() {
        super.dispose();
        this._executions.forEach(executionMap => {
            executionMap.forEach(execution => execution.dispose());
            executionMap.clear();
        });
        this._executions.clear();
        this._notebookExecutions.forEach(disposables => {
            disposables.forEach(d => d.dispose());
        });
        this._notebookExecutions.clear();
        this._cellListeners.forEach(disposable => disposable.dispose());
        this._notebookListeners.forEach(disposable => disposable.dispose());
        this._lastFailedCells.forEach(elem => elem.disposable.dispose());
    }
};
NotebookExecutionStateService = __decorate([
    __param(0, IInstantiationService),
    __param(1, ILogService),
    __param(2, INotebookService),
    __param(3, IAccessibilitySignalService)
], NotebookExecutionStateService);
export { NotebookExecutionStateService };
class NotebookCellExecutionEvent {
    constructor(notebook, cellHandle, changed) {
        this.notebook = notebook;
        this.cellHandle = cellHandle;
        this.changed = changed;
        this.type = NotebookExecutionType.cell;
    }
    affectsCell(cell) {
        const parsedUri = CellUri.parse(cell);
        return !!parsedUri && isEqual(this.notebook, parsedUri.notebook) && this.cellHandle === parsedUri.handle;
    }
    affectsNotebook(notebook) {
        return isEqual(this.notebook, notebook);
    }
}
class NotebookExecutionEvent {
    constructor(notebook, changed) {
        this.notebook = notebook;
        this.changed = changed;
        this.type = NotebookExecutionType.notebook;
    }
    affectsNotebook(notebook) {
        return isEqual(this.notebook, notebook);
    }
}
let NotebookExecutionListeners = class NotebookExecutionListeners extends Disposable {
    constructor(notebook, _notebookService, _notebookKernelService, _notebookExecutionService, _notebookExecutionStateService, _logService) {
        super();
        this._notebookService = _notebookService;
        this._notebookKernelService = _notebookKernelService;
        this._notebookExecutionService = _notebookExecutionService;
        this._notebookExecutionStateService = _notebookExecutionStateService;
        this._logService = _logService;
        this._logService.debug(`NotebookExecution#ctor ${notebook.toString()}`);
        const notebookModel = this._notebookService.getNotebookTextModel(notebook);
        if (!notebookModel) {
            throw new Error('Notebook not found: ' + notebook);
        }
        this._notebookModel = notebookModel;
        this._register(this._notebookModel.onWillAddRemoveCells(e => this.onWillAddRemoveCells(e)));
        this._register(this._notebookModel.onWillDispose(() => this.onWillDisposeDocument()));
    }
    cancelAll() {
        this._logService.debug(`NotebookExecutionListeners#cancelAll`);
        const exes = this._notebookExecutionStateService.getCellExecutionsForNotebook(this._notebookModel.uri);
        this._notebookExecutionService.cancelNotebookCellHandles(this._notebookModel, exes.map(exe => exe.cellHandle));
    }
    onWillDisposeDocument() {
        this._logService.debug(`NotebookExecution#onWillDisposeDocument`);
        this.cancelAll();
    }
    onWillAddRemoveCells(e) {
        const notebookExes = this._notebookExecutionStateService.getCellExecutionsByHandleForNotebook(this._notebookModel.uri);
        const executingDeletedHandles = new Set();
        const pendingDeletedHandles = new Set();
        if (notebookExes) {
            e.rawEvent.changes.forEach(([start, deleteCount]) => {
                if (deleteCount) {
                    const deletedHandles = this._notebookModel.cells.slice(start, start + deleteCount).map(c => c.handle);
                    deletedHandles.forEach(h => {
                        const exe = notebookExes.get(h);
                        if (exe?.state === NotebookCellExecutionState.Executing) {
                            executingDeletedHandles.add(h);
                        }
                        else if (exe) {
                            pendingDeletedHandles.add(h);
                        }
                    });
                }
            });
        }
        if (executingDeletedHandles.size || pendingDeletedHandles.size) {
            const kernel = this._notebookKernelService.getSelectedOrSuggestedKernel(this._notebookModel);
            if (kernel) {
                const implementsInterrupt = kernel.implementsInterrupt;
                const handlesToCancel = implementsInterrupt ? [...executingDeletedHandles] : [...executingDeletedHandles, ...pendingDeletedHandles];
                this._logService.debug(`NotebookExecution#onWillAddRemoveCells, ${JSON.stringify([...handlesToCancel])}`);
                if (handlesToCancel.length) {
                    kernel.cancelNotebookCellExecution(this._notebookModel.uri, handlesToCancel);
                }
            }
        }
    }
};
NotebookExecutionListeners = __decorate([
    __param(1, INotebookService),
    __param(2, INotebookKernelService),
    __param(3, INotebookExecutionService),
    __param(4, INotebookExecutionStateService),
    __param(5, ILogService)
], NotebookExecutionListeners);
function updateToEdit(update, cellHandle) {
    if (update.editType === CellExecutionUpdateType.Output) {
        return {
            editType: 2 /* CellEditType.Output */,
            handle: update.cellHandle,
            append: update.append,
            outputs: update.outputs,
        };
    }
    else if (update.editType === CellExecutionUpdateType.OutputItems) {
        return {
            editType: 7 /* CellEditType.OutputItems */,
            items: update.items,
            append: update.append,
            outputId: update.outputId
        };
    }
    else if (update.editType === CellExecutionUpdateType.ExecutionState) {
        const newInternalMetadata = {};
        if (typeof update.executionOrder !== 'undefined') {
            newInternalMetadata.executionOrder = update.executionOrder;
        }
        if (typeof update.runStartTime !== 'undefined') {
            newInternalMetadata.runStartTime = update.runStartTime;
        }
        return {
            editType: 9 /* CellEditType.PartialInternalMetadata */,
            handle: cellHandle,
            internalMetadata: newInternalMetadata
        };
    }
    throw new Error('Unknown cell update type');
}
let CellExecution = class CellExecution extends Disposable {
    get state() {
        return this._state;
    }
    get notebook() {
        return this._notebookModel.uri;
    }
    get didPause() {
        return this._didPause;
    }
    get isPaused() {
        return this._isPaused;
    }
    constructor(cellHandle, _notebookModel, _logService) {
        super();
        this.cellHandle = cellHandle;
        this._notebookModel = _notebookModel;
        this._logService = _logService;
        this._onDidUpdate = this._register(new Emitter());
        this.onDidUpdate = this._onDidUpdate.event;
        this._onDidComplete = this._register(new Emitter());
        this.onDidComplete = this._onDidComplete.event;
        this._state = NotebookCellExecutionState.Unconfirmed;
        this._didPause = false;
        this._isPaused = false;
        this._logService.debug(`CellExecution#ctor ${this.getCellLog()}`);
    }
    initialize() {
        const startExecuteEdit = {
            editType: 9 /* CellEditType.PartialInternalMetadata */,
            handle: this.cellHandle,
            internalMetadata: {
                executionId: generateUuid(),
                runStartTime: null,
                runEndTime: null,
                lastRunSuccess: null,
                executionOrder: null,
                renderDuration: null,
            }
        };
        this._applyExecutionEdits([startExecuteEdit]);
    }
    getCellLog() {
        return `${this._notebookModel.uri.toString()}, ${this.cellHandle}`;
    }
    logUpdates(updates) {
        const updateTypes = updates.map(u => CellExecutionUpdateType[u.editType]).join(', ');
        this._logService.debug(`CellExecution#updateExecution ${this.getCellLog()}, [${updateTypes}]`);
    }
    confirm() {
        this._logService.debug(`CellExecution#confirm ${this.getCellLog()}`);
        this._state = NotebookCellExecutionState.Pending;
        this._onDidUpdate.fire();
    }
    update(updates) {
        this.logUpdates(updates);
        if (updates.some(u => u.editType === CellExecutionUpdateType.ExecutionState)) {
            this._state = NotebookCellExecutionState.Executing;
        }
        if (!this._didPause && updates.some(u => u.editType === CellExecutionUpdateType.ExecutionState && u.didPause)) {
            this._didPause = true;
        }
        const lastIsPausedUpdate = [...updates].reverse().find(u => u.editType === CellExecutionUpdateType.ExecutionState && typeof u.isPaused === 'boolean');
        if (lastIsPausedUpdate) {
            this._isPaused = lastIsPausedUpdate.isPaused;
        }
        const cellModel = this._notebookModel.cells.find(c => c.handle === this.cellHandle);
        if (!cellModel) {
            this._logService.debug(`CellExecution#update, updating cell not in notebook: ${this._notebookModel.uri.toString()}, ${this.cellHandle}`);
        }
        else {
            const edits = updates.map(update => updateToEdit(update, this.cellHandle));
            this._applyExecutionEdits(edits);
        }
        if (updates.some(u => u.editType === CellExecutionUpdateType.ExecutionState)) {
            this._onDidUpdate.fire();
        }
    }
    complete(completionData) {
        const cellModel = this._notebookModel.cells.find(c => c.handle === this.cellHandle);
        if (!cellModel) {
            this._logService.debug(`CellExecution#complete, completing cell not in notebook: ${this._notebookModel.uri.toString()}, ${this.cellHandle}`);
        }
        else {
            const edit = {
                editType: 9 /* CellEditType.PartialInternalMetadata */,
                handle: this.cellHandle,
                internalMetadata: {
                    lastRunSuccess: completionData.lastRunSuccess,
                    runStartTime: this._didPause ? null : cellModel.internalMetadata.runStartTime,
                    runEndTime: this._didPause ? null : completionData.runEndTime,
                    error: completionData.error
                }
            };
            this._applyExecutionEdits([edit]);
        }
        this._onDidComplete.fire(completionData.lastRunSuccess);
    }
    _applyExecutionEdits(edits) {
        this._notebookModel.applyEdits(edits, true, undefined, () => undefined, undefined, false);
    }
};
CellExecution = __decorate([
    __param(2, ILogService)
], CellExecution);
let NotebookExecution = class NotebookExecution extends Disposable {
    get state() {
        return this._state;
    }
    get notebook() {
        return this._notebookModel.uri;
    }
    constructor(_notebookModel, _logService) {
        super();
        this._notebookModel = _notebookModel;
        this._logService = _logService;
        this._onDidUpdate = this._register(new Emitter());
        this.onDidUpdate = this._onDidUpdate.event;
        this._onDidComplete = this._register(new Emitter());
        this.onDidComplete = this._onDidComplete.event;
        this._state = NotebookExecutionState.Unconfirmed;
        this._logService.debug(`NotebookExecution#ctor`);
    }
    debug(message) {
        this._logService.debug(`${message} ${this._notebookModel.uri.toString()}`);
    }
    confirm() {
        this.debug(`Execution#confirm`);
        this._state = NotebookExecutionState.Pending;
        this._onDidUpdate.fire();
    }
    begin() {
        this.debug(`Execution#begin`);
        this._state = NotebookExecutionState.Executing;
        this._onDidUpdate.fire();
    }
    complete() {
        this.debug(`Execution#begin`);
        this._state = NotebookExecutionState.Unconfirmed;
        this._onDidComplete.fire();
    }
};
NotebookExecution = __decorate([
    __param(1, ILogService)
], NotebookExecution);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tFeGVjdXRpb25TdGF0ZVNlcnZpY2VJbXBsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvc2VydmljZXMvbm90ZWJvb2tFeGVjdXRpb25TdGF0ZVNlcnZpY2VJbXBsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsVUFBVSxFQUFlLE1BQU0seUNBQXlDLENBQUM7QUFDdEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUVsRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDbEUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLDJCQUEyQixFQUFFLE1BQU0sbUZBQW1GLENBQUM7QUFDckosT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDdEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBRXhFLE9BQU8sRUFBZ0IsT0FBTyxFQUFzQiwwQkFBMEIsRUFBZ0Msc0JBQXNCLEVBQXVDLE1BQU0sZ0NBQWdDLENBQUM7QUFDbE4sT0FBTyxFQUFFLHVCQUF1QixFQUFFLHlCQUF5QixFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDOUcsT0FBTyxFQUFvTSw4QkFBOEIsRUFBa0MscUJBQXFCLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUN4VixPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUMvRSxPQUFPLEVB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