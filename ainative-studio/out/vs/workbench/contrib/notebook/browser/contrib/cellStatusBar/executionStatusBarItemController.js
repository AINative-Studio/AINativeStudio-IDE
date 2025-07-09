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
var ExecutionStateCellStatusBarItem_1, TimerCellStatusBarItem_1;
import { disposableTimeout, RunOnceScheduler } from '../../../../../../base/common/async.js';
import { Disposable, dispose, MutableDisposable } from '../../../../../../base/common/lifecycle.js';
import { language } from '../../../../../../base/common/platform.js';
import { localize } from '../../../../../../nls.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { themeColorFromId } from '../../../../../../platform/theme/common/themeService.js';
import { ThemeIcon } from '../../../../../../base/common/themables.js';
import { NotebookVisibleCellObserver } from './notebookVisibleCellObserver.js';
import { registerNotebookContribution } from '../../notebookEditorExtensions.js';
import { cellStatusIconError, cellStatusIconSuccess } from '../../notebookEditorWidget.js';
import { errorStateIcon, executingStateIcon, pendingStateIcon, successStateIcon } from '../../notebookIcons.js';
import { NotebookCellExecutionState, NotebookSetting } from '../../../common/notebookCommon.js';
import { INotebookExecutionStateService, NotebookExecutionType } from '../../../common/notebookExecutionStateService.js';
import { INotebookService } from '../../../common/notebookService.js';
export function formatCellDuration(duration, showMilliseconds = true) {
    if (showMilliseconds && duration < 1000) {
        return `${duration}ms`;
    }
    const minutes = Math.floor(duration / 1000 / 60);
    const seconds = Math.floor(duration / 1000) % 60;
    const tenths = Math.floor((duration % 1000) / 100);
    if (minutes > 0) {
        return `${minutes}m ${seconds}.${tenths}s`;
    }
    else {
        return `${seconds}.${tenths}s`;
    }
}
export class NotebookStatusBarController extends Disposable {
    constructor(_notebookEditor, _itemFactory) {
        super();
        this._notebookEditor = _notebookEditor;
        this._itemFactory = _itemFactory;
        this._visibleCells = new Map();
        this._observer = this._register(new NotebookVisibleCellObserver(this._notebookEditor));
        this._register(this._observer.onDidChangeVisibleCells(this._updateVisibleCells, this));
        this._updateEverything();
    }
    _updateEverything() {
        this._visibleCells.forEach(dispose);
        this._visibleCells.clear();
        this._updateVisibleCells({ added: this._observer.visibleCells, removed: [] });
    }
    _updateVisibleCells(e) {
        const vm = this._notebookEditor.getViewModel();
        if (!vm) {
            return;
        }
        for (const oldCell of e.removed) {
            this._visibleCells.get(oldCell.handle)?.dispose();
            this._visibleCells.delete(oldCell.handle);
        }
        for (const newCell of e.added) {
            this._visibleCells.set(newCell.handle, this._itemFactory(vm, newCell));
        }
    }
    dispose() {
        super.dispose();
        this._visibleCells.forEach(dispose);
        this._visibleCells.clear();
    }
}
let ExecutionStateCellStatusBarContrib = class ExecutionStateCellStatusBarContrib extends Disposable {
    static { this.id = 'workbench.notebook.statusBar.execState'; }
    constructor(notebookEditor, instantiationService) {
        super();
        this._register(new NotebookStatusBarController(notebookEditor, (vm, cell) => instantiationService.createInstance(ExecutionStateCellStatusBarItem, vm, cell)));
    }
};
ExecutionStateCellStatusBarContrib = __decorate([
    __param(1, IInstantiationService)
], ExecutionStateCellStatusBarContrib);
export { ExecutionStateCellStatusBarContrib };
registerNotebookContribution(ExecutionStateCellStatusBarContrib.id, ExecutionStateCellStatusBarContrib);
/**
 * Shows the cell's execution state in the cell status bar. When the "executing" state is shown, it will be shown for a minimum brief time.
 */
let ExecutionStateCellStatusBarItem = class ExecutionStateCellStatusBarItem extends Disposable {
    static { ExecutionStateCellStatusBarItem_1 = this; }
    static { this.MIN_SPINNER_TIME = 500; }
    constructor(_notebookViewModel, _cell, _executionStateService) {
        super();
        this._notebookViewModel = _notebookViewModel;
        this._cell = _cell;
        this._executionStateService = _executionStateService;
        this._currentItemIds = [];
        this._clearExecutingStateTimer = this._register(new MutableDisposable());
        this._update();
        this._register(this._executionStateService.onDidChangeExecution(e => {
            if (e.type === NotebookExecutionType.cell && e.affectsCell(this._cell.uri)) {
                this._update();
            }
        }));
        this._register(this._cell.model.onDidChangeInternalMetadata(() => this._update()));
    }
    async _update() {
        const items = this._getItemsForCell();
        if (Array.isArray(items)) {
            this._currentItemIds = this._notebookViewModel.deltaCellStatusBarItems(this._currentItemIds, [{ handle: this._cell.handle, items }]);
        }
    }
    /**
     *	Returns undefined if there should be no change, and an empty array if all items should be removed.
     */
    _getItemsForCell() {
        const runState = this._executionStateService.getCellExecution(this._cell.uri);
        // Show the execution spinner for a minimum time
        if (runState?.state === NotebookCellExecutionState.Executing && typeof this._showedExecutingStateTime !== 'number') {
            this._showedExecutingStateTime = Date.now();
        }
        else if (runState?.state !== NotebookCellExecutionState.Executing && typeof this._showedExecutingStateTime === 'number') {
            const timeUntilMin = ExecutionStateCellStatusBarItem_1.MIN_SPINNER_TIME - (Date.now() - this._showedExecutingStateTime);
            if (timeUntilMin > 0) {
                if (!this._clearExecutingStateTimer.value) {
                    this._clearExecutingStateTimer.value = disposableTimeout(() => {
                        this._showedExecutingStateTime = undefined;
                        this._clearExecutingStateTimer.clear();
                        this._update();
                    }, timeUntilMin);
                }
                return undefined;
            }
            else {
                this._showedExecutingStateTime = undefined;
            }
        }
        const items = this._getItemForState(runState, this._cell.internalMetadata);
        return items;
    }
    _getItemForState(runState, internalMetadata) {
        const state = runState?.state;
        const { lastRunSuccess } = internalMetadata;
        if (!state && lastRunSuccess) {
            return [{
                    text: `$(${successStateIcon.id})`,
                    color: themeColorFromId(cellStatusIconSuccess),
                    tooltip: localize('notebook.cell.status.success', "Success"),
                    alignment: 1 /* CellStatusbarAlignment.Left */,
                    priority: Number.MAX_SAFE_INTEGER
                }];
        }
        else if (!state && lastRunSuccess === false) {
            return [{
                    text: `$(${errorStateIcon.id})`,
                    color: themeColorFromId(cellStatusIconError),
                    tooltip: localize('notebook.cell.status.failed', "Failed"),
                    alignment: 1 /* CellStatusbarAlignment.Left */,
                    priority: Number.MAX_SAFE_INTEGER
                }];
        }
        else if (state === NotebookCellExecutionState.Pending || state === NotebookCellExecutionState.Unconfirmed) {
            return [{
                    text: `$(${pendingStateIcon.id})`,
                    tooltip: localize('notebook.cell.status.pending', "Pending"),
                    alignment: 1 /* CellStatusbarAlignment.Left */,
                    priority: Number.MAX_SAFE_INTEGER
                }];
        }
        else if (state === NotebookCellExecutionState.Executing) {
            const icon = runState?.didPause ?
                executingStateIcon :
                ThemeIcon.modify(executingStateIcon, 'spin');
            return [{
                    text: `$(${icon.id})`,
                    tooltip: localize('notebook.cell.status.executing', "Executing"),
                    alignment: 1 /* CellStatusbarAlignment.Left */,
                    priority: Number.MAX_SAFE_INTEGER
                }];
        }
        return [];
    }
    dispose() {
        super.dispose();
        this._notebookViewModel.deltaCellStatusBarItems(this._currentItemIds, [{ handle: this._cell.handle, items: [] }]);
    }
};
ExecutionStateCellStatusBarItem = ExecutionStateCellStatusBarItem_1 = __decorate([
    __param(2, INotebookExecutionStateService)
], ExecutionStateCellStatusBarItem);
let TimerCellStatusBarContrib = class TimerCellStatusBarContrib extends Disposable {
    static { this.id = 'workbench.notebook.statusBar.execTimer'; }
    constructor(notebookEditor, instantiationService) {
        super();
        this._register(new NotebookStatusBarController(notebookEditor, (vm, cell) => instantiationService.createInstance(TimerCellStatusBarItem, vm, cell)));
    }
};
TimerCellStatusBarContrib = __decorate([
    __param(1, IInstantiationService)
], TimerCellStatusBarContrib);
export { TimerCellStatusBarContrib };
registerNotebookContribution(TimerCellStatusBarContrib.id, TimerCellStatusBarContrib);
const UPDATE_TIMER_GRACE_PERIOD = 200;
let TimerCellStatusBarItem = class TimerCellStatusBarItem extends Disposable {
    static { TimerCellStatusBarItem_1 = this; }
    static { this.UPDATE_INTERVAL = 100; }
    constructor(_notebookViewModel, _cell, _executionStateService, _notebookService, _configurationService) {
        super();
        this._notebookViewModel = _notebookViewModel;
        this._cell = _cell;
        this._executionStateService = _executionStateService;
        this._notebookService = _notebookService;
        this._configurationService = _configurationService;
        this._currentItemIds = [];
        this._isVerbose = this._configurationService.getValue(NotebookSetting.cellExecutionTimeVerbosity) === 'verbose';
        this._scheduler = this._register(new RunOnceScheduler(() => this._update(), TimerCellStatusBarItem_1.UPDATE_INTERVAL));
        this._update();
        this._register(this._cell.model.onDidChangeInternalMetadata(() => this._update()));
        this._register(this._configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(NotebookSetting.cellExecutionTimeVerbosity)) {
                this._isVerbose = this._configurationService.getValue(NotebookSetting.cellExecutionTimeVerbosity) === 'verbose';
                this._update();
            }
        }));
    }
    async _update() {
        let timerItem;
        const runState = this._executionStateService.getCellExecution(this._cell.uri);
        const state = runState?.state;
        const startTime = this._cell.internalMetadata.runStartTime;
        const adjustment = this._cell.internalMetadata.runStartTimeAdjustment ?? 0;
        const endTime = this._cell.internalMetadata.runEndTime;
        if (runState?.didPause) {
            timerItem = undefined;
        }
        else if (state === NotebookCellExecutionState.Executing) {
            if (typeof startTime === 'number') {
                timerItem = this._getTimeItem(startTime, Date.now(), adjustment);
                this._scheduler.schedule();
            }
        }
        else if (!state) {
            if (typeof startTime === 'number' && typeof endTime === 'number') {
                const timerDuration = Date.now() - startTime + adjustment;
                const executionDuration = endTime - startTime;
                const renderDuration = this._cell.internalMetadata.renderDuration ?? {};
                timerItem = this._getTimeItem(startTime, endTime, undefined, {
                    timerDuration,
                    executionDuration,
                    renderDuration
                });
            }
        }
        const items = timerItem ? [timerItem] : [];
        if (!items.length && !!runState) {
            if (!this._deferredUpdate) {
                this._deferredUpdate = disposableTimeout(() => {
                    this._deferredUpdate = undefined;
                    this._currentItemIds = this._notebookViewModel.deltaCellStatusBarItems(this._currentItemIds, [{ handle: this._cell.handle, items }]);
                }, UPDATE_TIMER_GRACE_PERIOD, this._store);
            }
        }
        else {
            this._deferredUpdate?.dispose();
            this._deferredUpdate = undefined;
            this._currentItemIds = this._notebookViewModel.deltaCellStatusBarItems(this._currentItemIds, [{ handle: this._cell.handle, items }]);
        }
    }
    _getTimeItem(startTime, endTime, adjustment = 0, runtimeInformation) {
        const duration = endTime - startTime + adjustment;
        let tooltip;
        const lastExecution = new Date(endTime).toLocaleTimeString(language);
        if (runtimeInformation) {
            const { renderDuration, executionDuration, timerDuration } = runtimeInformation;
            let renderTimes = '';
            for (const key in renderDuration) {
                const rendererInfo = this._notebookService.getRendererInfo(key);
                const args = encodeURIComponent(JSON.stringify({
                    extensionId: rendererInfo?.extensionId.value ?? '',
                    issueBody: `Auto-generated text from notebook cell performance. The duration for the renderer, ${rendererInfo?.displayName ?? key}, is slower than expected.\n` +
                        `Execution Time: ${formatCellDuration(executionDuration)}\n` +
                        `Renderer Duration: ${formatCellDuration(renderDuration[key])}\n`
                }));
                renderTimes += `- [${rendererInfo?.displayName ?? key}](command:workbench.action.openIssueReporter?${args}) ${formatCellDuration(renderDuration[key])}\n`;
            }
            renderTimes += `\n*${localize('notebook.cell.statusBar.timerTooltip.reportIssueFootnote', "Use the links above to file an issue using the issue reporter.")}*\n`;
            tooltip = {
                value: localize('notebook.cell.statusBar.timerTooltip', "**Last Execution** {0}\n\n**Execution Time** {1}\n\n**Overhead Time** {2}\n\n**Render Times**\n\n{3}", lastExecution, formatCellDuration(executionDuration), formatCellDuration(timerDuration - executionDuration), renderTimes),
                isTrusted: true
            };
        }
        const executionText = this._isVerbose ?
            localize('notebook.cell.statusBar.timerVerbose', "Last Execution: {0}, Duration: {1}", lastExecution, formatCellDuration(duration, false)) :
            formatCellDuration(duration, false);
        return {
            text: executionText,
            alignment: 1 /* CellStatusbarAlignment.Left */,
            priority: Number.MAX_SAFE_INTEGER - 5,
            tooltip
        };
    }
    dispose() {
        super.dispose();
        this._deferredUpdate?.dispose();
        this._notebookViewModel.deltaCellStatusBarItems(this._currentItemIds, [{ handle: this._cell.handle, items: [] }]);
    }
};
TimerCellStatusBarItem = TimerCellStatusBarItem_1 = __decorate([
    __param(2, INotebookExecutionStateService),
    __param(3, INotebookService),
    __param(4, IConfigurationService)
], TimerCellStatusBarItem);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhlY3V0aW9uU3RhdHVzQmFySXRlbUNvbnRyb2xsZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci9jb250cmliL2NlbGxTdGF0dXNCYXIvZXhlY3V0aW9uU3RhdHVzQmFySXRlbUNvbnRyb2xsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQzdGLE9BQU8sRUFBRSxVQUFVLEVBQUUsT0FBTyxFQUFlLGlCQUFpQixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDakgsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUNwRCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQztBQUN6RyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQztBQUN6RyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUMzRixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDdkUsT0FBTyxFQUE4QiwyQkFBMkIsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBRTNHLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ2pGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQzNGLE9BQU8sRUFBRSxjQUFjLEVBQUUsa0JBQWtCLEVBQUUsZ0JBQWdCLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx3QkFB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