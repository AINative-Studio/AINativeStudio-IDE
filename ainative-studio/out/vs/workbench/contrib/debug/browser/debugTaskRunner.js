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
import { Action } from '../../../../base/common/actions.js';
import { disposableTimeout } from '../../../../base/common/async.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { createErrorWithActions } from '../../../../base/common/errorMessage.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import severity from '../../../../base/common/severity.js';
import * as nls from '../../../../nls.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IMarkerService, MarkerSeverity } from '../../../../platform/markers/common/markers.js';
import { IProgressService } from '../../../../platform/progress/common/progress.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { DEBUG_CONFIGURE_COMMAND_ID, DEBUG_CONFIGURE_LABEL } from './debugCommands.js';
import { Markers } from '../../markers/common/markers.js';
import { ConfiguringTask, CustomTask, TaskEventKind } from '../../tasks/common/tasks.js';
import { ITaskService } from '../../tasks/common/taskService.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
const onceFilter = (event, filter) => Event.once(Event.filter(event, filter));
export var TaskRunResult;
(function (TaskRunResult) {
    TaskRunResult[TaskRunResult["Failure"] = 0] = "Failure";
    TaskRunResult[TaskRunResult["Success"] = 1] = "Success";
})(TaskRunResult || (TaskRunResult = {}));
const DEBUG_TASK_ERROR_CHOICE_KEY = 'debug.taskerrorchoice';
const ABORT_LABEL = nls.localize('abort', "Abort");
const DEBUG_ANYWAY_LABEL = nls.localize({ key: 'debugAnyway', comment: ['&& denotes a mnemonic'] }, "&&Debug Anyway");
const DEBUG_ANYWAY_LABEL_NO_MEMO = nls.localize('debugAnywayNoMemo', "Debug Anyway");
let DebugTaskRunner = class DebugTaskRunner {
    constructor(taskService, markerService, configurationService, viewsService, dialogService, storageService, commandService, progressService) {
        this.taskService = taskService;
        this.markerService = markerService;
        this.configurationService = configurationService;
        this.viewsService = viewsService;
        this.dialogService = dialogService;
        this.storageService = storageService;
        this.commandService = commandService;
        this.progressService = progressService;
        this.globalCancellation = new CancellationTokenSource();
    }
    cancel() {
        this.globalCancellation.dispose(true);
        this.globalCancellation = new CancellationTokenSource();
    }
    dispose() {
        this.globalCancellation.dispose(true);
    }
    async runTaskAndCheckErrors(root, taskId) {
        try {
            const taskSummary = await this.runTask(root, taskId, this.globalCancellation.token);
            if (taskSummary && (taskSummary.exitCode === undefined || taskSummary.cancelled)) {
                // User canceled, either debugging, or the prelaunch task
                return 0 /* TaskRunResult.Failure */;
            }
            const errorCount = taskId ? this.markerService.read({ severities: MarkerSeverity.Error, take: 2 }).length : 0;
            const successExitCode = taskSummary && taskSummary.exitCode === 0;
            const failureExitCode = taskSummary && taskSummary.exitCode !== 0;
            const onTaskErrors = this.configurationService.getValue('debug').onTaskErrors;
            if (successExitCode || onTaskErrors === 'debugAnyway' || (errorCount === 0 && !failureExitCode)) {
                return 1 /* TaskRunResult.Success */;
            }
            if (onTaskErrors === 'showErrors') {
                await this.viewsService.openView(Markers.MARKERS_VIEW_ID, true);
                return Promise.resolve(0 /* TaskRunResult.Failure */);
            }
            if (onTaskErrors === 'abort') {
                return Promise.resolve(0 /* TaskRunResult.Failure */);
            }
            const taskLabel = typeof taskId === 'string' ? taskId : taskId ? taskId.name : '';
            const message = errorCount > 1
                ? nls.localize('preLaunchTaskErrors', "Errors exist after running preLaunchTask '{0}'.", taskLabel)
                : errorCount === 1
                    ? nls.localize('preLaunchTaskError', "Error exists after running preLaunchTask '{0}'.", taskLabel)
                    : taskSummary && typeof taskSummary.exitCode === 'number'
                        ? nls.localize('preLaunchTaskExitCode', "The preLaunchTask '{0}' terminated with exit code {1}.", taskLabel, taskSummary.exitCode)
                        : nls.localize('preLaunchTaskTerminated', "The preLaunchTask '{0}' terminated.", taskLabel);
            let DebugChoice;
            (function (DebugChoice) {
                DebugChoice[DebugChoice["DebugAnyway"] = 1] = "DebugAnyway";
                DebugChoice[DebugChoice["ShowErrors"] = 2] = "ShowErrors";
                DebugChoice[DebugChoice["Cancel"] = 0] = "Cancel";
            })(DebugChoice || (DebugChoice = {}));
            const { result, checkboxChecked } = await this.dialogService.prompt({
                type: severity.Warning,
                message,
                buttons: [
                    {
                        label: DEBUG_ANYWAY_LABEL,
                        run: () => DebugChoice.DebugAnyway
                    },
                    {
                        label: nls.localize({ key: 'showErrors', comment: ['&& denotes a mnemonic'] }, "&&Show Errors"),
                        run: () => DebugChoice.ShowErrors
                    }
                ],
                cancelButton: {
                    label: ABORT_LABEL,
                    run: () => DebugChoice.Cancel
                },
                checkbox: {
                    label: nls.localize('remember', "Remember my choice in user settings"),
                }
            });
            const debugAnyway = result === DebugChoice.DebugAnyway;
            const abort = result === DebugChoice.Cancel;
            if (checkboxChecked) {
                this.configurationService.updateValue('debug.onTaskErrors', result === DebugChoice.DebugAnyway ? 'debugAnyway' : abort ? 'abort' : 'showErrors');
            }
            if (abort) {
                return Promise.resolve(0 /* TaskRunResult.Failure */);
            }
            if (debugAnyway) {
                return 1 /* TaskRunResult.Success */;
            }
            await this.viewsService.openView(Markers.MARKERS_VIEW_ID, true);
            return Promise.resolve(0 /* TaskRunResult.Failure */);
        }
        catch (err) {
            const taskConfigureAction = this.taskService.configureAction();
            const choiceMap = JSON.parse(this.storageService.get(DEBUG_TASK_ERROR_CHOICE_KEY, 1 /* StorageScope.WORKSPACE */, '{}'));
            let choice = -1;
            let DebugChoice;
            (function (DebugChoice) {
                DebugChoice[DebugChoice["DebugAnyway"] = 0] = "DebugAnyway";
                DebugChoice[DebugChoice["ConfigureTask"] = 1] = "ConfigureTask";
                DebugChoice[DebugChoice["Cancel"] = 2] = "Cancel";
            })(DebugChoice || (DebugChoice = {}));
            if (choiceMap[err.message] !== undefined) {
                choice = choiceMap[err.message];
            }
            else {
                const { result, checkboxChecked } = await this.dialogService.prompt({
                    type: severity.Error,
                    message: err.message,
                    buttons: [
                        {
                            label: nls.localize({ key: 'debugAnyway', comment: ['&& denotes a mnemonic'] }, "&&Debug Anyway"),
                            run: () => DebugChoice.DebugAnyway
                        },
                        {
                            label: taskConfigureAction.label,
                            run: () => DebugChoice.ConfigureTask
                        }
                    ],
                    cancelButton: {
                        run: () => DebugChoice.Cancel
                    },
                    checkbox: {
                        label: nls.localize('rememberTask', "Remember my choice for this task")
                    }
                });
                choice = result;
                if (checkboxChecked) {
                    choiceMap[err.message] = choice;
                    this.storageService.store(DEBUG_TASK_ERROR_CHOICE_KEY, JSON.stringify(choiceMap), 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
                }
            }
            if (choice === DebugChoice.ConfigureTask) {
                await taskConfigureAction.run();
            }
            return choice === DebugChoice.DebugAnyway ? 1 /* TaskRunResult.Success */ : 0 /* TaskRunResult.Failure */;
        }
    }
    async runTask(root, taskId, token = this.globalCancellation.token) {
        if (!taskId) {
            return Promise.resolve(null);
        }
        if (!root) {
            return Promise.reject(new Error(nls.localize('invalidTaskReference', "Task '{0}' can not be referenced from a launch configuration that is in a different workspace folder.", typeof taskId === 'string' ? taskId : taskId.type)));
        }
        // run a task before starting a debug session
        const task = await this.taskService.getTask(root, taskId);
        if (!task) {
            const errorMessage = typeof taskId === 'string'
                ? nls.localize('DebugTaskNotFoundWithTaskId', "Could not find the task '{0}'.", taskId)
                : nls.localize('DebugTaskNotFound', "Could not find the specified task.");
            return Promise.reject(createErrorWithActions(errorMessage, [new Action(DEBUG_CONFIGURE_COMMAND_ID, DEBUG_CONFIGURE_LABEL, undefined, true, () => this.commandService.executeCommand(DEBUG_CONFIGURE_COMMAND_ID))]));
        }
        // If a task is missing the problem matcher the promise will never complete, so we need to have a workaround #35340
        let taskStarted = false;
        const store = new DisposableStore();
        const getTaskKey = (t) => t.getKey() ?? t.getMapKey();
        const taskKey = getTaskKey(task);
        const inactivePromise = new Promise((resolve) => store.add(onceFilter(this.taskService.onDidStateChange, e => {
            // When a task isBackground it will go inactive when it is safe to launch.
            // But when a background task is terminated by the user, it will also fire an inactive event.
            // This means that we will not get to see the real exit code from running the task (undefined when terminated by the user).
            // Catch the ProcessEnded event here, which occurs before inactive, and capture the exit code to prevent this.
            return (e.kind === TaskEventKind.Inactive
                || (e.kind === TaskEventKind.ProcessEnded && e.exitCode === undefined))
                && getTaskKey(e.__task) === taskKey;
        })(e => {
            taskStarted = true;
            resolve(e.kind === TaskEventKind.ProcessEnded ? { exitCode: e.exitCode } : null);
        })));
        store.add(onceFilter(this.taskService.onDidStateChange, e => ((e.kind === TaskEventKind.Active) || (e.kind === TaskEventKind.DependsOnStarted)) && getTaskKey(e.__task) === taskKey)(() => {
            // Task is active, so everything seems to be fine, no need to prompt after 10 seconds
            // Use case being a slow running task should not be prompted even though it takes more than 10 seconds
            taskStarted = true;
        }));
        const didAcquireInput = store.add(new Emitter());
        store.add(onceFilter(this.taskService.onDidStateChange, e => (e.kind === TaskEventKind.AcquiredInput) && getTaskKey(e.__task) === taskKey)(() => didAcquireInput.fire()));
        const taskDonePromise = this.taskService.getActiveTasks().then(async (tasks) => {
            if (tasks.find(t => getTaskKey(t) === taskKey)) {
                didAcquireInput.fire();
                // Check that the task isn't busy and if it is, wait for it
                const busyTasks = await this.taskService.getBusyTasks();
                if (busyTasks.find(t => getTaskKey(t) === taskKey)) {
                    taskStarted = true;
                    return inactivePromise;
                }
                // task is already running and isn't busy - nothing to do.
                return Promise.resolve(null);
            }
            const taskPromise = this.taskService.run(task);
            if (task.configurationProperties.isBackground) {
                return inactivePromise;
            }
            return taskPromise.then(x => x ?? null);
        });
        const result = new Promise((resolve, reject) => {
            taskDonePromise.then(result => {
                taskStarted = true;
                resolve(result);
            }, error => reject(error));
            store.add(token.onCancellationRequested(() => {
                resolve({ exitCode: undefined, cancelled: true });
                this.taskService.terminate(task).catch(() => { });
            }));
            // Start the timeouts once a terminal has been acquired
            store.add(didAcquireInput.event(() => {
                const waitTime = task.configurationProperties.isBackground ? 5000 : 10000;
                // Error shown if there's a background task with no problem matcher that doesn't exit quickly
                store.add(disposableTimeout(() => {
                    if (!taskStarted) {
                        const errorMessage = nls.localize('taskNotTracked', "The task '{0}' has not exited and doesn't have a 'problemMatcher' defined. Make sure to define a problem matcher for watch tasks.", typeof taskId === 'string' ? taskId : JSON.stringify(taskId));
                        reject({ severity: severity.Error, message: errorMessage });
                    }
                }, waitTime));
                const hideSlowPreLaunchWarning = this.configurationService.getValue('debug').hideSlowPreLaunchWarning;
                if (!hideSlowPreLaunchWarning) {
                    // Notification shown on any task taking a while to resolve
                    store.add(disposableTimeout(() => {
                        const message = nls.localize('runningTask', "Waiting for preLaunchTask '{0}'...", task.configurationProperties.name);
                        const buttons = [DEBUG_ANYWAY_LABEL_NO_MEMO, ABORT_LABEL];
                        const canConfigure = task instanceof CustomTask || task instanceof ConfiguringTask;
                        if (canConfigure) {
                            buttons.splice(1, 0, nls.localize('configureTask', "Configure Task"));
                        }
                        this.progressService.withProgress({ location: 15 /* ProgressLocation.Notification */, title: message, buttons }, () => result.catch(() => { }), (choice) => {
                            if (choice === undefined) {
                                // no-op, keep waiting
                            }
                            else if (choice === 0) { // debug anyway
                                resolve({ exitCode: 0 });
                            }
                            else { // abort or configure
                                resolve({ exitCode: undefined, cancelled: true });
                                this.taskService.terminate(task).catch(() => { });
                                if (canConfigure && choice === 1) { // configure
                                    this.taskService.openConfig(task);
                                }
                            }
                        });
                    }, 10_000));
                }
            }));
        });
        return result.finally(() => store.dispose());
    }
};
DebugTaskRunner = __decorate([
    __param(0, ITaskService),
    __param(1, IMarkerService),
    __param(2, IConfigurationService),
    __param(3, IViewsService),
    __param(4, IDialogService),
    __param(5, IStorageService),
    __param(6, ICommandService),
    __param(7, IProgressService)
], DebugTaskRunner);
export { DebugTaskRunner };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdUYXNrUnVubmVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2RlYnVnL2Jyb3dzZXIvZGVidWdUYXNrUnVubmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM1RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNyRSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNsRixPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNqRixPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxlQUFlLEVBQWUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNwRixPQUFPLFFBQVEsTUFBTSxxQ0FBcUMsQ0FBQztBQUMzRCxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFDO0FBQzFDLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUNuRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDaEYsT0FBTyxFQUFFLGNBQWMsRUFBRSxjQUFjLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNoRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQW9CLE1BQU0sa0RBQWtELENBQUM7QUFDdEcsT0FBTyxFQUFFLGVBQWUsRUFBK0IsTUFBTSxnREFBZ0QsQ0FBQztBQUU5RyxPQUFPLEVBQUUsMEJBQTBCLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxv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