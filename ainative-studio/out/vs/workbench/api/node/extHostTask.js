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
import * as path from '../../../base/common/path.js';
import { URI } from '../../../base/common/uri.js';
import { findExecutable } from '../../../base/node/processes.js';
import { IExtHostWorkspace } from '../common/extHostWorkspace.js';
import { IExtHostDocumentsAndEditors } from '../common/extHostDocumentsAndEditors.js';
import { IExtHostConfiguration } from '../common/extHostConfiguration.js';
import { WorkspaceFolder } from '../../../platform/workspace/common/workspace.js';
import { IExtHostTerminalService } from '../common/extHostTerminalService.js';
import { IExtHostRpcService } from '../common/extHostRpcService.js';
import { IExtHostInitDataService } from '../common/extHostInitDataService.js';
import { ExtHostTaskBase, TaskHandleDTO, TaskDTO, CustomExecutionDTO } from '../common/extHostTask.js';
import { Schemas } from '../../../base/common/network.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { IExtHostApiDeprecationService } from '../common/extHostApiDeprecationService.js';
import * as resources from '../../../base/common/resources.js';
import { homedir } from 'os';
import { IExtHostVariableResolverProvider } from '../common/extHostVariableResolverService.js';
let ExtHostTask = class ExtHostTask extends ExtHostTaskBase {
    constructor(extHostRpc, initData, workspaceService, editorService, configurationService, extHostTerminalService, logService, deprecationService, variableResolver) {
        super(extHostRpc, initData, workspaceService, editorService, configurationService, extHostTerminalService, logService, deprecationService);
        this.workspaceService = workspaceService;
        this.variableResolver = variableResolver;
        if (initData.remote.isRemote && initData.remote.authority) {
            this.registerTaskSystem(Schemas.vscodeRemote, {
                scheme: Schemas.vscodeRemote,
                authority: initData.remote.authority,
                platform: process.platform
            });
        }
        else {
            this.registerTaskSystem(Schemas.file, {
                scheme: Schemas.file,
                authority: '',
                platform: process.platform
            });
        }
        this._proxy.$registerSupportedExecutions(true, true, true);
    }
    async executeTask(extension, task) {
        const tTask = task;
        if (!task.execution && (tTask._id === undefined)) {
            throw new Error('Tasks to execute must include an execution');
        }
        // We have a preserved ID. So the task didn't change.
        if (tTask._id !== undefined) {
            // Always get the task execution first to prevent timing issues when retrieving it later
            const handleDto = TaskHandleDTO.from(tTask, this.workspaceService);
            const executionDTO = await this._proxy.$getTaskExecution(handleDto);
            if (executionDTO.task === undefined) {
                throw new Error('Task from execution DTO is undefined');
            }
            const execution = await this.getTaskExecution(executionDTO, task);
            this._proxy.$executeTask(handleDto).catch(() => { });
            return execution;
        }
        else {
            const dto = TaskDTO.from(task, extension);
            if (dto === undefined) {
                return Promise.reject(new Error('Task is not valid'));
            }
            // If this task is a custom execution, then we need to save it away
            // in the provided custom execution map that is cleaned up after the
            // task is executed.
            if (CustomExecutionDTO.is(dto.execution)) {
                await this.addCustomExecution(dto, task, false);
            }
            // Always get the task execution first to prevent timing issues when retrieving it later
            const execution = await this.getTaskExecution(await this._proxy.$getTaskExecution(dto), task);
            this._proxy.$executeTask(dto).catch(() => { });
            return execution;
        }
    }
    provideTasksInternal(validTypes, taskIdPromises, handler, value) {
        const taskDTOs = [];
        if (value) {
            for (const task of value) {
                this.checkDeprecation(task, handler);
                if (!task.definition || !validTypes[task.definition.type]) {
                    this._logService.warn(`The task [${task.source}, ${task.name}] uses an undefined task type. The task will be ignored in the future.`);
                }
                const taskDTO = TaskDTO.from(task, handler.extension);
                if (taskDTO) {
                    taskDTOs.push(taskDTO);
                    if (CustomExecutionDTO.is(taskDTO.execution)) {
                        // The ID is calculated on the main thread task side, so, let's call into it here.
                        // We need the task id's pre-computed for custom task executions because when OnDidStartTask
                        // is invoked, we have to be able to map it back to our data.
                        taskIdPromises.push(this.addCustomExecution(taskDTO, task, true));
                    }
                }
            }
        }
        return {
            tasks: taskDTOs,
            extension: handler.extension
        };
    }
    async resolveTaskInternal(resolvedTaskDTO) {
        return resolvedTaskDTO;
    }
    async getAFolder(workspaceFolders) {
        let folder = (workspaceFolders && workspaceFolders.length > 0) ? workspaceFolders[0] : undefined;
        if (!folder) {
            const userhome = URI.file(homedir());
            folder = new WorkspaceFolder({ uri: userhome, name: resources.basename(userhome), index: 0 });
        }
        return {
            uri: folder.uri,
            name: folder.name,
            index: folder.index,
            toResource: () => {
                throw new Error('Not implemented');
            }
        };
    }
    async $resolveVariables(uriComponents, toResolve) {
        const uri = URI.revive(uriComponents);
        const result = {
            process: undefined,
            variables: Object.create(null)
        };
        const workspaceFolder = await this._workspaceProvider.resolveWorkspaceFolder(uri);
        const workspaceFolders = (await this._workspaceProvider.getWorkspaceFolders2()) ?? [];
        const resolver = await this.variableResolver.getResolver();
        const ws = workspaceFolder ? {
            uri: workspaceFolder.uri,
            name: workspaceFolder.name,
            index: workspaceFolder.index,
            toResource: () => {
                throw new Error('Not implemented');
            }
        } : await this.getAFolder(workspaceFolders);
        for (const variable of toResolve.variables) {
            result.variables[variable] = await resolver.resolveAsync(ws, variable);
        }
        if (toResolve.process !== undefined) {
            let paths = undefined;
            if (toResolve.process.path !== undefined) {
                paths = toResolve.process.path.split(path.delimiter);
                for (let i = 0; i < paths.length; i++) {
                    paths[i] = await resolver.resolveAsync(ws, paths[i]);
                }
            }
            const processName = await resolver.resolveAsync(ws, toResolve.process.name);
            const cwd = toResolve.process.cwd !== undefined ? await resolver.resolveAsync(ws, toResolve.process.cwd) : undefined;
            const foundExecutable = await findExecutable(processName, cwd, paths);
            if (foundExecutable) {
                result.process = foundExecutable;
            }
            else if (path.isAbsolute(processName)) {
                result.process = processName;
            }
            else {
                result.process = path.join(cwd ?? '', processName);
            }
        }
        return result;
    }
    async $jsonTasksSupported() {
        return true;
    }
    async $findExecutable(command, cwd, paths) {
        return findExecutable(command, cwd, paths);
    }
};
ExtHostTask = __decorate([
    __param(0, IExtHostRpcService),
    __param(1, IExtHostInitDataService),
    __param(2, IExtHostWorkspace),
    __param(3, IExtHostDocumentsAndEditors),
    __param(4, IExtHostConfiguration),
    __param(5, IExtHostTerminalService),
    __param(6, ILogService),
    __param(7, IExtHostApiDeprecationService),
    __param(8, IExtHostVariableResolverProvider)
], ExtHostTask);
export { ExtHostTask };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFRhc2suanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9ub2RlL2V4dEhvc3RUYXNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxJQUFJLE1BQU0sOEJBQThCLENBQUM7QUFFckQsT0FBTyxFQUFFLEdBQUcsRUFBaUIsTUFBTSw2QkFBNkIsQ0FBQztBQUNqRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFFakUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFHbEUsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDdEYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDMUUsT0FBTyxFQUFvQixlQUFlLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUVwRyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNwRSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RSxPQUFPLEVBQUUsZUFBZSxFQUFFLGFBQWEsRUFBRSxPQUFPLEVBQUUsa0JBQWtCLEVBQWUsTUFBTSwwQkFBMEIsQ0FBQztBQUNwSCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDMUQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQzFGLE9BQU8sS0FBSyxTQUFTLE1BQU0sbUNBQW1DLENBQUM7QUFD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