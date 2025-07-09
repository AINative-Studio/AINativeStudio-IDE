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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVuQXV0b21hdGljVGFza3MuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGFza3MvYnJvd3Nlci9ydW5BdXRvbWF0aWNUYXNrcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFDO0FBQzFDLE9BQU8sS0FBSyxTQUFTLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRWxFLE9BQU8sRUFBRSxZQUFZLEVBQThCLE1BQU0sMEJBQTBCLENBQUM7QUFDcEYsT0FBTyxFQUFFLFlBQVksRUFBbUMsY0FBYyxFQUFFLGNBQWMsRUFBaUQsTUFBTSxvQkFBb0IsQ0FBQztBQUNsSyxPQUFPLEVBQWtCLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDMUcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBRXpFLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQzNHLE9BQU8sRUFBdUIscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUV4SCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDekQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBRXJFLE1BQU0scUJBQXFCLEdBQUcsMEJBQTBCLENBQUM7QUFFbEQsSUFBTSxpQkFBaUIsR0FBdkIsTUFBTSxpQkFBa0IsU0FBUSxVQUFVO0lBRWhELFlBQ2UsWUFBMkMsRUFDbEMscUJBQTZELEVBQ2xELGdDQUFtRixFQUN4RyxXQUF5QztRQUN0RCxLQUFLLEVBQUUsQ0FBQztRQUp1QixpQkFB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