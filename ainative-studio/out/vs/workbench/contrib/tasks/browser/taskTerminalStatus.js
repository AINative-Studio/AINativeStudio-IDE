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
import * as nls from '../../../../nls.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Disposable, MutableDisposable, toDisposable } from '../../../../base/common/lifecycle.js';
import Severity from '../../../../base/common/severity.js';
import { StartStopProblemCollector } from '../common/problemCollectors.js';
import { TaskEventKind } from '../common/tasks.js';
import { ITaskService } from '../common/taskService.js';
import { MarkerSeverity } from '../../../../platform/markers/common/markers.js';
import { spinningLoading } from '../../../../platform/theme/common/iconRegistry.js';
import { AccessibilitySignal, IAccessibilitySignalService } from '../../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
const TASK_TERMINAL_STATUS_ID = 'task_terminal_status';
export const ACTIVE_TASK_STATUS = { id: TASK_TERMINAL_STATUS_ID, icon: spinningLoading, severity: Severity.Info, tooltip: nls.localize('taskTerminalStatus.active', "Task is running") };
export const SUCCEEDED_TASK_STATUS = { id: TASK_TERMINAL_STATUS_ID, icon: Codicon.check, severity: Severity.Info, tooltip: nls.localize('taskTerminalStatus.succeeded', "Task succeeded") };
const SUCCEEDED_INACTIVE_TASK_STATUS = { id: TASK_TERMINAL_STATUS_ID, icon: Codicon.check, severity: Severity.Info, tooltip: nls.localize('taskTerminalStatus.succeededInactive', "Task succeeded and waiting...") };
export const FAILED_TASK_STATUS = { id: TASK_TERMINAL_STATUS_ID, icon: Codicon.error, severity: Severity.Error, tooltip: nls.localize('taskTerminalStatus.errors', "Task has errors") };
const FAILED_INACTIVE_TASK_STATUS = { id: TASK_TERMINAL_STATUS_ID, icon: Codicon.error, severity: Severity.Error, tooltip: nls.localize('taskTerminalStatus.errorsInactive', "Task has errors and is waiting...") };
const WARNING_TASK_STATUS = { id: TASK_TERMINAL_STATUS_ID, icon: Codicon.warning, severity: Severity.Warning, tooltip: nls.localize('taskTerminalStatus.warnings', "Task has warnings") };
const WARNING_INACTIVE_TASK_STATUS = { id: TASK_TERMINAL_STATUS_ID, icon: Codicon.warning, severity: Severity.Warning, tooltip: nls.localize('taskTerminalStatus.warningsInactive', "Task has warnings and is waiting...") };
const INFO_TASK_STATUS = { id: TASK_TERMINAL_STATUS_ID, icon: Codicon.info, severity: Severity.Info, tooltip: nls.localize('taskTerminalStatus.infos', "Task has infos") };
const INFO_INACTIVE_TASK_STATUS = { id: TASK_TERMINAL_STATUS_ID, icon: Codicon.info, severity: Severity.Info, tooltip: nls.localize('taskTerminalStatus.infosInactive', "Task has infos and is waiting...") };
let TaskTerminalStatus = class TaskTerminalStatus extends Disposable {
    constructor(taskService, _accessibilitySignalService) {
        super();
        this._accessibilitySignalService = _accessibilitySignalService;
        this.terminalMap = new Map();
        this._register(taskService.onDidStateChange((event) => {
            switch (event.kind) {
                case TaskEventKind.ProcessStarted:
                case TaskEventKind.Active:
                    this.eventActive(event);
                    break;
                case TaskEventKind.Inactive:
                    this.eventInactive(event);
                    break;
                case TaskEventKind.ProcessEnded:
                    this.eventEnd(event);
                    break;
            }
        }));
        this._register(toDisposable(() => {
            for (const terminalData of this.terminalMap.values()) {
                terminalData.disposeListener?.dispose();
            }
            this.terminalMap.clear();
        }));
    }
    addTerminal(task, terminal, problemMatcher) {
        const status = { id: TASK_TERMINAL_STATUS_ID, severity: Severity.Info };
        terminal.statusList.add(status);
        this._register(problemMatcher.onDidFindFirstMatch(() => {
            this._marker = terminal.registerMarker();
            if (this._marker) {
                this._register(this._marker);
            }
        }));
        this._register(problemMatcher.onDidFindErrors(() => {
            if (this._marker) {
                terminal.addBufferMarker({ marker: this._marker, hoverMessage: nls.localize('task.watchFirstError', "Beginning of detected errors for this run"), disableCommandStorage: true });
            }
        }));
        this._register(problemMatcher.onDidRequestInvalidateLastMarker(() => {
            this._marker?.dispose();
            this._marker = undefined;
        }));
        this.terminalMap.set(terminal.instanceId, { terminal, task, status, problemMatcher, taskRunEnded: false });
    }
    terminalFromEvent(event) {
        if (!('terminalId' in event) || !event.terminalId) {
            return undefined;
        }
        return this.terminalMap.get(event.terminalId);
    }
    eventEnd(event) {
        const terminalData = this.terminalFromEvent(event);
        if (!terminalData) {
            return;
        }
        terminalData.taskRunEnded = true;
        terminalData.terminal.statusList.remove(terminalData.status);
        if ((event.exitCode === 0) && (!terminalData.problemMatcher.maxMarkerSeverity || terminalData.problemMatcher.maxMarkerSeverity < MarkerSeverity.Warning)) {
            this._accessibilitySignalService.playSignal(AccessibilitySignal.taskCompleted);
            if (terminalData.task.configurationProperties.isBackground) {
                for (const status of terminalData.terminal.statusList.statuses) {
                    terminalData.terminal.statusList.remove(status);
                }
            }
            else {
                terminalData.terminal.statusList.add(SUCCEEDED_TASK_STATUS);
            }
        }
        else if (event.exitCode || (terminalData.problemMatcher.maxMarkerSeverity !== undefined && terminalData.problemMatcher.maxMarkerSeverity >= MarkerSeverity.Warning)) {
            this._accessibilitySignalService.playSignal(AccessibilitySignal.taskFailed);
            terminalData.terminal.statusList.add(FAILED_TASK_STATUS);
        }
        else if (terminalData.problemMatcher.maxMarkerSeverity === MarkerSeverity.Warning) {
            terminalData.terminal.statusList.add(WARNING_TASK_STATUS);
        }
        else if (terminalData.problemMatcher.maxMarkerSeverity === MarkerSeverity.Info) {
            terminalData.terminal.statusList.add(INFO_TASK_STATUS);
        }
    }
    eventInactive(event) {
        const terminalData = this.terminalFromEvent(event);
        if (!terminalData || !terminalData.problemMatcher || terminalData.taskRunEnded) {
            return;
        }
        terminalData.terminal.statusList.remove(terminalData.status);
        if (terminalData.problemMatcher.numberOfMatches === 0) {
            this._accessibilitySignalService.playSignal(AccessibilitySignal.taskCompleted);
            terminalData.terminal.statusList.add(SUCCEEDED_INACTIVE_TASK_STATUS);
        }
        else if (terminalData.problemMatcher.maxMarkerSeverity === MarkerSeverity.Error) {
            this._accessibilitySignalService.playSignal(AccessibilitySignal.taskFailed);
            terminalData.terminal.statusList.add(FAILED_INACTIVE_TASK_STATUS);
        }
        else if (terminalData.problemMatcher.maxMarkerSeverity === MarkerSeverity.Warning) {
            terminalData.terminal.statusList.add(WARNING_INACTIVE_TASK_STATUS);
        }
        else if (terminalData.problemMatcher.maxMarkerSeverity === MarkerSeverity.Info) {
            terminalData.terminal.statusList.add(INFO_INACTIVE_TASK_STATUS);
        }
    }
    eventActive(event) {
        const terminalData = this.terminalFromEvent(event);
        if (!terminalData) {
            return;
        }
        if (!terminalData.disposeListener) {
            terminalData.disposeListener = this._register(new MutableDisposable());
            terminalData.disposeListener.value = terminalData.terminal.onDisposed(() => {
                if (!event.terminalId) {
                    return;
                }
                this.terminalMap.delete(event.terminalId);
                terminalData.disposeListener?.dispose();
            });
        }
        terminalData.taskRunEnded = false;
        terminalData.terminal.statusList.remove(terminalData.status);
        // We don't want to show an infinite status for a background task that doesn't have a problem matcher.
        if ((terminalData.problemMatcher instanceof StartStopProblemCollector) || (terminalData.problemMatcher?.problemMatchers.length > 0) || event.runType === "singleRun" /* TaskRunType.SingleRun */) {
            terminalData.terminal.statusList.add(ACTIVE_TASK_STATUS);
        }
    }
};
TaskTerminalStatus = __decorate([
    __param(0, ITaskService),
    __param(1, IAccessibilitySignalService)
], TaskTerminalStatus);
export { TaskTerminalStatus };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFza1Rlcm1pbmFsU3RhdHVzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGFza3MvYnJvd3Nlci90YXNrVGVybWluYWxTdGF0dXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQztBQUMxQyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDOUQsT0FBTyxFQUFFLFVBQVUsRUFBZSxpQkFBaUIsRUFBRSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNoSCxPQUFPLFFBQVEsTUFBTSxxQ0FBcUMsQ0FBQztBQUMzRCxPQUFPLEVBQTRCLHlCQUF5QixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckcsT0FBTyxFQUF1RSxhQUFhLEVBQWUsTUFBTSxvQkFBb0IsQ0FBQztBQUNySSxPQUFPLEVBQUUsWUFBWSxFQUFRLE1BQU0sMEJBQTBCLENBQUM7QUFFOUQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ2hGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUVwRixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSxnRkFBZ0YsQ0FBQztBQVlsSixNQUFNLHVCQUF1QixHQUFHLHNCQUFzQixDQUFDO0FBQ3ZELE1BQU0sQ0FBQyxNQUFNLGtCQUFrQixHQUFvQixFQUFFLEVBQUUsRUFBRSx1QkFBdUIsRUFBRSxJQUFJLEVBQUUsZUFBZSxFQUFFLFFBQVEsRUFBRSxRQUFRLENBQUMsSUFBSSxFQUFFLE9BQU8sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLDJCQUEyQixFQUFFLGlCQUFpQixDQUFDLEVBQUUs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