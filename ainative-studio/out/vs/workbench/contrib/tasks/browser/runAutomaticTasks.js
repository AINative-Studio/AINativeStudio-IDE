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
import * as resources from '../../../../base/common/resources.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { ITaskService } from '../common/taskService.js';
import { RunOnOptions, TaskSourceKind, TASKS_CATEGORY } from '../common/tasks.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { Action2 } from '../../../../platform/actions/common/actions.js';
import { IWorkspaceTrustManagementService } from '../../../../platform/workspace/common/workspaceTrust.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { Event } from '../../../../base/common/event.js';
import { ILogService } from '../../../../platform/log/common/log.js';
const ALLOW_AUTOMATIC_TASKS = 'task.allowAutomaticTasks';
let RunAutomaticTasks = class RunAutomaticTasks extends Disposable {
    constructor(_taskService, _configurationService, _workspaceTrustManagementService, _logService) {
        super();
        this._taskService = _taskService;
        this._configurationService = _configurationService;
        this._workspaceTrustManagementService = _workspaceTrustManagementService;
        this._logService = _logService;
        this._hasRunTasks = false;
        if (this._taskService.isReconnected) {
            this._tryRunTasks();
        }
        else {
            this._register(Event.once(this._taskService.onDidReconnectToTasks)(async () => await this._tryRunTasks()));
        }
        this._register(this._workspaceTrustManagementService.onDidChangeTrust(async () => await this._tryRunTasks()));
    }
    async _tryRunTasks() {
        if (!this._workspaceTrustManagementService.isWorkspaceTrusted()) {
            return;
        }
        if (this._hasRunTasks || this._configurationService.getValue(ALLOW_AUTOMATIC_TASKS) === 'off') {
            return;
        }
        this._hasRunTasks = true;
        this._logService.trace('RunAutomaticTasks: Trying to run tasks.');
        // Wait until we have task system info (the extension host and workspace folders are available).
        if (!this._taskService.hasTaskSystemInfo) {
            this._logService.trace('RunAutomaticTasks: Awaiting task system info.');
            await Event.toPromise(Event.once(this._taskService.onDidChangeTaskSystemInfo));
        }
        let workspaceTasks = await this._taskService.getWorkspaceTasks(2 /* TaskRunSource.FolderOpen */);
        this._logService.trace(`RunAutomaticTasks: Found ${workspaceTasks.size} automatic tasks`);
        let autoTasks = this._findAutoTasks(this._taskService, workspaceTasks);
        this._logService.trace(`RunAutomaticTasks: taskNames=${JSON.stringify(autoTasks.taskNames)}`);
        // As seen in some cases with the Remote SSH extension, the tasks configuration is loaded after we have come
        // to this point. Let's give it some extra time.
        if (autoTasks.taskNames.length === 0) {
            const updatedWithinTimeout = await Promise.race([
                new Promise((resolve) => {
                    Event.toPromise(Event.once(this._taskService.onDidChangeTaskConfig)).then(() => resolve(true));
                }),
                new Promise((resolve) => {
                    const timer = setTimeout(() => { clearTimeout(timer); resolve(false); }, 10000);
                })
            ]);
            if (!updatedWithinTimeout) {
                this._logService.trace(`RunAutomaticTasks: waited some extra time, but no update of tasks configuration`);
                return;
            }
            workspaceTasks = await this._taskService.getWorkspaceTasks(2 /* TaskRunSource.FolderOpen */);
            autoTasks = this._findAutoTasks(this._taskService, workspaceTasks);
            this._logService.trace(`RunAutomaticTasks: updated taskNames=${JSON.stringify(autoTasks.taskNames)}`);
        }
        this._runWithPermission(this._taskService, this._configurationService, autoTasks.tasks, autoTasks.taskNames);
    }
    _runTasks(taskService, tasks) {
        tasks.forEach(task => {
            if (task instanceof Promise) {
                task.then(promiseResult => {
                    if (promiseResult) {
                        taskService.run(promiseResult);
                    }
                });
            }
            else {
                taskService.run(task);
            }
        });
    }
    _getTaskSource(source) {
        const taskKind = TaskSourceKind.toConfigurationTarget(source.kind);
        switch (taskKind) {
            case 6 /* ConfigurationTarget.WORKSPACE_FOLDER */: {
                return resources.joinPath(source.config.workspaceFolder.uri, source.config.file);
            }
            case 5 /* ConfigurationTarget.WORKSPACE */: {
                return source.config.workspace?.configuration ?? undefined;
            }
        }
        return undefined;
    }
    _findAutoTasks(taskService, workspaceTaskResult) {
        const tasks = new Array();
        const taskNames = new Array();
        const locations = new Map();
        if (workspaceTaskResult) {
            workspaceTaskResult.forEach(resultElement => {
                if (resultElement.set) {
                    resultElement.set.tasks.forEach(task => {
                        if (task.runOptions.runOn === RunOnOptions.folderOpen) {
                            tasks.push(task);
                            taskNames.push(task._label);
                            const location = this._getTaskSource(task._source);
                            if (location) {
                                locations.set(location.fsPath, location);
                            }
                        }
                    });
                }
                if (resultElement.configurations) {
                    for (const configuredTask of Object.values(resultElement.configurations.byIdentifier)) {
                        if (configuredTask.runOptions.runOn === RunOnOptions.folderOpen) {
                            tasks.push(new Promise(resolve => {
                                taskService.getTask(resultElement.workspaceFolder, configuredTask._id, true).then(task => resolve(task));
                            }));
                            if (configuredTask._label) {
                                taskNames.push(configuredTask._label);
                            }
                            else {
                                taskNames.push(configuredTask.configures.task);
                            }
                            const location = this._getTaskSource(configuredTask._source);
                            if (location) {
                                locations.set(location.fsPath, location);
                            }
                        }
                    }
                }
            });
        }
        return { tasks, taskNames, locations };
    }
    async _runWithPermission(taskService, configurationService, tasks, taskNames) {
        if (taskNames.length === 0) {
            return;
        }
        if (configurationService.getValue(ALLOW_AUTOMATIC_TASKS) === 'off') {
            return;
        }
        this._runTasks(taskService, tasks);
    }
};
RunAutomaticTasks = __decorate([
    __param(0, ITaskService),
    __param(1, IConfigurationService),
    __param(2, IWorkspaceTrustManagementService),
    __param(3, ILogService)
], RunAutomaticTasks);
export { RunAutomaticTasks };
export class ManageAutomaticTaskRunning extends Action2 {
    static { this.ID = 'workbench.action.tasks.manageAutomaticRunning'; }
    static { this.LABEL = nls.localize('workbench.action.tasks.manageAutomaticRunning', "Manage Automatic Tasks"); }
    constructor() {
        super({
            id: ManageAutomaticTaskRunning.ID,
            title: ManageAutomaticTaskRunning.LABEL,
            category: TASKS_CATEGORY
        });
    }
    async run(accessor) {
        const quickInputService = accessor.get(IQuickInputService);
        const configurationService = accessor.get(IConfigurationService);
        const allowItem = { label: nls.localize('workbench.action.tasks.allowAutomaticTasks', "Allow Automatic Tasks") };
        const disallowItem = { label: nls.localize('workbench.action.tasks.disallowAutomaticTasks', "Disallow Automatic Tasks") };
        const value = await quickInputService.pick([allowItem, disallowItem], { canPickMany: false });
        if (!value) {
            return;
        }
        configurationService.updateValue(ALLOW_AUTOMATIC_TASKS, value === allowItem ? 'on' : 'off', 2 /* ConfigurationTarget.USER */);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVuQXV0b21hdGljVGFza3MuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90YXNrcy9icm93c2VyL3J1bkF1dG9tYXRpY1Rhc2tzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUM7QUFDMUMsT0FBTyxLQUFLLFNBQVMsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFbEUsT0FBTyxFQUFFLFlBQVksRUFBOEIsTUFBTSwwQkFBMEIsQ0FBQztBQUNwRixPQUFPLEVBQUUsWUFBWSxFQUFtQyxjQUFjLEVBQUUsY0FBYyxFQUFpRCxNQUFNLG9CQUFvQixDQUFDO0FBQ2xLLE9BQU8sRUFBa0Isa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUMxRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFFekUsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0seURBQXlELENBQUM7QUFDM0csT0FBTyxFQUF1QixxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBRXhILE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN6RCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFFckUsTUFBTSxxQkFBcUIsR0FBRywwQkFBMEIsQ0FBQztBQUVsRCxJQUFNLGlCQUFpQixHQUF2QixNQUFNLGlCQUFrQixTQUFRLFVBQVU7SUFFaEQsWUFDZSxZQUEyQyxFQUNsQyxxQkFBNkQsRUFDbEQsZ0NBQW1GLEVBQ3hHLFdBQXlDO1FBQ3RELEtBQUssRUFBRSxDQUFDO1FBSnVCLGlCQUFZ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