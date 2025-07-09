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
/* eslint-disable local/code-no-native-private */
import { URI } from '../../../base/common/uri.js';
import { asPromise } from '../../../base/common/async.js';
import { Emitter } from '../../../base/common/event.js';
import { MainContext } from './extHost.protocol.js';
import * as types from './extHostTypes.js';
import { IExtHostWorkspace } from './extHostWorkspace.js';
import { IExtHostDocumentsAndEditors } from './extHostDocumentsAndEditors.js';
import { IExtHostConfiguration } from './extHostConfiguration.js';
import { CancellationToken } from '../../../base/common/cancellation.js';
import { IExtHostTerminalService } from './extHostTerminalService.js';
import { IExtHostRpcService } from './extHostRpcService.js';
import { IExtHostInitDataService } from './extHostInitDataService.js';
import { createDecorator } from '../../../platform/instantiation/common/instantiation.js';
import { Schemas } from '../../../base/common/network.js';
import * as Platform from '../../../base/common/platform.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { IExtHostApiDeprecationService } from './extHostApiDeprecationService.js';
import { USER_TASKS_GROUP_KEY } from '../../contrib/tasks/common/tasks.js';
import { ErrorNoTelemetry, NotSupportedError } from '../../../base/common/errors.js';
import { asArray } from '../../../base/common/arrays.js';
var TaskDefinitionDTO;
(function (TaskDefinitionDTO) {
    function from(value) {
        if (value === undefined || value === null) {
            return undefined;
        }
        return value;
    }
    TaskDefinitionDTO.from = from;
    function to(value) {
        if (value === undefined || value === null) {
            return undefined;
        }
        return value;
    }
    TaskDefinitionDTO.to = to;
})(TaskDefinitionDTO || (TaskDefinitionDTO = {}));
var TaskPresentationOptionsDTO;
(function (TaskPresentationOptionsDTO) {
    function from(value) {
        if (value === undefined || value === null) {
            return undefined;
        }
        return value;
    }
    TaskPresentationOptionsDTO.from = from;
    function to(value) {
        if (value === undefined || value === null) {
            return undefined;
        }
        return value;
    }
    TaskPresentationOptionsDTO.to = to;
})(TaskPresentationOptionsDTO || (TaskPresentationOptionsDTO = {}));
var ProcessExecutionOptionsDTO;
(function (ProcessExecutionOptionsDTO) {
    function from(value) {
        if (value === undefined || value === null) {
            return undefined;
        }
        return value;
    }
    ProcessExecutionOptionsDTO.from = from;
    function to(value) {
        if (value === undefined || value === null) {
            return undefined;
        }
        return value;
    }
    ProcessExecutionOptionsDTO.to = to;
})(ProcessExecutionOptionsDTO || (ProcessExecutionOptionsDTO = {}));
var ProcessExecutionDTO;
(function (ProcessExecutionDTO) {
    function is(value) {
        if (value) {
            const candidate = value;
            return candidate && !!candidate.process;
        }
        else {
            return false;
        }
    }
    ProcessExecutionDTO.is = is;
    function from(value) {
        if (value === undefined || value === null) {
            return undefined;
        }
        const result = {
            process: value.process,
            args: value.args
        };
        if (value.options) {
            result.options = ProcessExecutionOptionsDTO.from(value.options);
        }
        return result;
    }
    ProcessExecutionDTO.from = from;
    function to(value) {
        if (value === undefined || value === null) {
            return undefined;
        }
        return new types.ProcessExecution(value.process, value.args, value.options);
    }
    ProcessExecutionDTO.to = to;
})(ProcessExecutionDTO || (ProcessExecutionDTO = {}));
var ShellExecutionOptionsDTO;
(function (ShellExecutionOptionsDTO) {
    function from(value) {
        if (value === undefined || value === null) {
            return undefined;
        }
        return value;
    }
    ShellExecutionOptionsDTO.from = from;
    function to(value) {
        if (value === undefined || value === null) {
            return undefined;
        }
        return value;
    }
    ShellExecutionOptionsDTO.to = to;
})(ShellExecutionOptionsDTO || (ShellExecutionOptionsDTO = {}));
var ShellExecutionDTO;
(function (ShellExecutionDTO) {
    function is(value) {
        if (value) {
            const candidate = value;
            return candidate && (!!candidate.commandLine || !!candidate.command);
        }
        else {
            return false;
        }
    }
    ShellExecutionDTO.is = is;
    function from(value) {
        if (value === undefined || value === null) {
            return undefined;
        }
        const result = {};
        if (value.commandLine !== undefined) {
            result.commandLine = value.commandLine;
        }
        else {
            result.command = value.command;
            result.args = value.args;
        }
        if (value.options) {
            result.options = ShellExecutionOptionsDTO.from(value.options);
        }
        return result;
    }
    ShellExecutionDTO.from = from;
    function to(value) {
        if (value === undefined || value === null || (value.command === undefined && value.commandLine === undefined)) {
            return undefined;
        }
        if (value.commandLine) {
            return new types.ShellExecution(value.commandLine, value.options);
        }
        else {
            return new types.ShellExecution(value.command, value.args ? value.args : [], value.options);
        }
    }
    ShellExecutionDTO.to = to;
})(ShellExecutionDTO || (ShellExecutionDTO = {}));
export var CustomExecutionDTO;
(function (CustomExecutionDTO) {
    function is(value) {
        if (value) {
            const candidate = value;
            return candidate && candidate.customExecution === 'customExecution';
        }
        else {
            return false;
        }
    }
    CustomExecutionDTO.is = is;
    function from(value) {
        return {
            customExecution: 'customExecution'
        };
    }
    CustomExecutionDTO.from = from;
    function to(taskId, providedCustomExeutions) {
        return providedCustomExeutions.get(taskId);
    }
    CustomExecutionDTO.to = to;
})(CustomExecutionDTO || (CustomExecutionDTO = {}));
export var TaskHandleDTO;
(function (TaskHandleDTO) {
    function from(value, workspaceService) {
        let folder;
        if (value.scope !== undefined && typeof value.scope !== 'number') {
            folder = value.scope.uri;
        }
        else if (value.scope !== undefined && typeof value.scope === 'number') {
            if ((value.scope === types.TaskScope.Workspace) && workspaceService && workspaceService.workspaceFile) {
                folder = workspaceService.workspaceFile;
            }
            else {
                folder = USER_TASKS_GROUP_KEY;
            }
        }
        return {
            id: value._id,
            workspaceFolder: folder
        };
    }
    TaskHandleDTO.from = from;
})(TaskHandleDTO || (TaskHandleDTO = {}));
var TaskGroupDTO;
(function (TaskGroupDTO) {
    function from(value) {
        if (value === undefined || value === null) {
            return undefined;
        }
        return { _id: value.id, isDefault: value.isDefault };
    }
    TaskGroupDTO.from = from;
})(TaskGroupDTO || (TaskGroupDTO = {}));
export var TaskDTO;
(function (TaskDTO) {
    function fromMany(tasks, extension) {
        if (tasks === undefined || tasks === null) {
            return [];
        }
        const result = [];
        for (const task of tasks) {
            const converted = from(task, extension);
            if (converted) {
                result.push(converted);
            }
        }
        return result;
    }
    TaskDTO.fromMany = fromMany;
    function from(value, extension) {
        if (value === undefined || value === null) {
            return undefined;
        }
        let execution;
        if (value.execution instanceof types.ProcessExecution) {
            execution = ProcessExecutionDTO.from(value.execution);
        }
        else if (value.execution instanceof types.ShellExecution) {
            execution = ShellExecutionDTO.from(value.execution);
        }
        else if (value.execution && value.execution instanceof types.CustomExecution) {
            execution = CustomExecutionDTO.from(value.execution);
        }
        const definition = TaskDefinitionDTO.from(value.definition);
        let scope;
        if (value.scope) {
            if (typeof value.scope === 'number') {
                scope = value.scope;
            }
            else {
                scope = value.scope.uri;
            }
        }
        else {
            // To continue to support the deprecated task constructor that doesn't take a scope, we must add a scope here:
            scope = types.TaskScope.Workspace;
        }
        if (!definition || !scope) {
            return undefined;
        }
        const result = {
            _id: value._id,
            definition,
            name: value.name,
            source: {
                extensionId: extension.identifier.value,
                label: value.source,
                scope: scope
            },
            execution: execution,
            isBackground: value.isBackground,
            group: TaskGroupDTO.from(value.group),
            presentationOptions: TaskPresentationOptionsDTO.from(value.presentationOptions),
            problemMatchers: asArray(value.problemMatchers),
            hasDefinedMatchers: value.hasDefinedMatchers,
            runOptions: value.runOptions ? value.runOptions : { reevaluateOnRerun: true },
            detail: value.detail
        };
        return result;
    }
    TaskDTO.from = from;
    async function to(value, workspace, providedCustomExeutions) {
        if (value === undefined || value === null) {
            return undefined;
        }
        let execution;
        if (ProcessExecutionDTO.is(value.execution)) {
            execution = ProcessExecutionDTO.to(value.execution);
        }
        else if (ShellExecutionDTO.is(value.execution)) {
            execution = ShellExecutionDTO.to(value.execution);
        }
        else if (CustomExecutionDTO.is(value.execution)) {
            execution = CustomExecutionDTO.to(value._id, providedCustomExeutions);
        }
        const definition = TaskDefinitionDTO.to(value.definition);
        let scope;
        if (value.source) {
            if (value.source.scope !== undefined) {
                if (typeof value.source.scope === 'number') {
                    scope = value.source.scope;
                }
                else {
                    scope = await workspace.resolveWorkspaceFolder(URI.revive(value.source.scope));
                }
            }
            else {
                scope = types.TaskScope.Workspace;
            }
        }
        if (!definition || !scope) {
            return undefined;
        }
        const result = new types.Task(definition, scope, value.name, value.source.label, execution, value.problemMatchers);
        if (value.isBackground !== undefined) {
            result.isBackground = value.isBackground;
        }
        if (value.group !== undefined) {
            result.group = types.TaskGroup.from(value.group._id);
            if (result.group && value.group.isDefault) {
                result.group = new types.TaskGroup(result.group.id, result.group.label);
                if (value.group.isDefault === true) {
                    result.group.isDefault = value.group.isDefault;
                }
            }
        }
        if (value.presentationOptions) {
            result.presentationOptions = TaskPresentationOptionsDTO.to(value.presentationOptions);
        }
        if (value._id) {
            result._id = value._id;
        }
        if (value.detail) {
            result.detail = value.detail;
        }
        return result;
    }
    TaskDTO.to = to;
})(TaskDTO || (TaskDTO = {}));
var TaskFilterDTO;
(function (TaskFilterDTO) {
    function from(value) {
        return value;
    }
    TaskFilterDTO.from = from;
    function to(value) {
        if (!value) {
            return undefined;
        }
        return Object.assign(Object.create(null), value);
    }
    TaskFilterDTO.to = to;
})(TaskFilterDTO || (TaskFilterDTO = {}));
class TaskExecutionImpl {
    #tasks;
    constructor(tasks, _id, _task) {
        this._id = _id;
        this._task = _task;
        this.#tasks = tasks;
    }
    get task() {
        return this._task;
    }
    terminate() {
        this.#tasks.terminateTask(this);
    }
    fireDidStartProcess(value) {
    }
    fireDidEndProcess(value) {
    }
}
let ExtHostTaskBase = class ExtHostTaskBase {
    constructor(extHostRpc, initData, workspaceService, editorService, configurationService, extHostTerminalService, logService, deprecationService) {
        this._onDidExecuteTask = new Emitter();
        this._onDidTerminateTask = new Emitter();
        this._onDidTaskProcessStarted = new Emitter();
        this._onDidTaskProcessEnded = new Emitter();
        this._onDidStartTaskProblemMatchers = new Emitter();
        this._onDidEndTaskProblemMatchers = new Emitter();
        this._proxy = extHostRpc.getProxy(MainContext.MainThreadTask);
        this._workspaceProvider = workspaceService;
        this._editorService = editorService;
        this._configurationService = configurationService;
        this._terminalService = extHostTerminalService;
        this._handleCounter = 0;
        this._handlers = new Map();
        this._taskExecutions = new Map();
        this._taskExecutionPromises = new Map();
        this._providedCustomExecutions2 = new Map();
        this._notProvidedCustomExecutions = new Set();
        this._activeCustomExecutions2 = new Map();
        this._logService = logService;
        this._deprecationService = deprecationService;
        this._proxy.$registerSupportedExecutions(true);
    }
    registerTaskProvider(extension, type, provider) {
        if (!provider) {
            return new types.Disposable(() => { });
        }
        const handle = this.nextHandle();
        this._handlers.set(handle, { type, provider, extension });
        this._proxy.$registerTaskProvider(handle, type);
        return new types.Disposable(() => {
            this._handlers.delete(handle);
            this._proxy.$unregisterTaskProvider(handle);
        });
    }
    registerTaskSystem(scheme, info) {
        this._proxy.$registerTaskSystem(scheme, info);
    }
    fetchTasks(filter) {
        return this._proxy.$fetchTasks(TaskFilterDTO.from(filter)).then(async (values) => {
            const result = [];
            for (const value of values) {
                const task = await TaskDTO.to(value, this._workspaceProvider, this._providedCustomExecutions2);
                if (task) {
                    result.push(task);
                }
            }
            return result;
        });
    }
    get taskExecutions() {
        const result = [];
        this._taskExecutions.forEach(value => result.push(value));
        return result;
    }
    terminateTask(execution) {
        if (!(execution instanceof TaskExecutionImpl)) {
            throw new Error('No valid task execution provided');
        }
        return this._proxy.$terminateTask(execution._id);
    }
    get onDidStartTask() {
        return this._onDidExecuteTask.event;
    }
    async $onDidStartTask(execution, terminalId, resolvedDefinition) {
        const customExecution = this._providedCustomExecutions2.get(execution.id);
        if (customExecution) {
            // Clone the custom execution to keep the original untouched. This is important for multiple runs of the same task.
            this._activeCustomExecutions2.set(execution.id, customExecution);
            this._terminalService.attachPtyToTerminal(terminalId, await customExecution.callback(resolvedDefinition));
        }
        this._lastStartedTask = execution.id;
        this._onDidExecuteTask.fire({
            execution: await this.getTaskExecution(execution)
        });
    }
    get onDidEndTask() {
        return this._onDidTerminateTask.event;
    }
    async $OnDidEndTask(execution) {
        if (!this._taskExecutionPromises.has(execution.id)) {
            // Event already fired by the main thread
            // See https://github.com/microsoft/vscode/commit/aaf73920aeae171096d205efb2c58804a32b6846
            return;
        }
        const _execution = await this.getTaskExecution(execution);
        this._taskExecutionPromises.delete(execution.id);
        this._taskExecutions.delete(execution.id);
        this.customExecutionComplete(execution);
        this._onDidTerminateTask.fire({
            execution: _execution
        });
    }
    get onDidStartTaskProcess() {
        return this._onDidTaskProcessStarted.event;
    }
    async $onDidStartTaskProcess(value) {
        const execution = await this.getTaskExecution(value.id);
        this._onDidTaskProcessStarted.fire({
            execution: execution,
            processId: value.processId
        });
    }
    get onDidEndTaskProcess() {
        return this._onDidTaskProcessEnded.event;
    }
    async $onDidEndTaskProcess(value) {
        const execution = await this.getTaskExecution(value.id);
        this._onDidTaskProcessEnded.fire({
            execution: execution,
            exitCode: value.exitCode
        });
    }
    get onDidStartTaskProblemMatchers() {
        return this._onDidStartTaskProblemMatchers.event;
    }
    async $onDidStartTaskProblemMatchers(value) {
        let execution;
        try {
            execution = await this.getTaskExecution(value.execution.id);
        }
        catch (error) {
            // The task execution is not available anymore
            return;
        }
        this._onDidStartTaskProblemMatchers.fire({ execution });
    }
    get onDidEndTaskProblemMatchers() {
        return this._onDidEndTaskProblemMatchers.event;
    }
    async $onDidEndTaskProblemMatchers(value) {
        let execution;
        try {
            execution = await this.getTaskExecution(value.execution.id);
        }
        catch (error) {
            // The task execution is not available anymore
            return;
        }
        this._onDidEndTaskProblemMatchers.fire({ execution, hasErrors: value.hasErrors });
    }
    $provideTasks(handle, validTypes) {
        const handler = this._handlers.get(handle);
        if (!handler) {
            return Promise.reject(new Error('no handler found'));
        }
        // Set up a list of task ID promises that we can wait on
        // before returning the provided tasks. The ensures that
        // our task IDs are calculated for any custom execution tasks.
        // Knowing this ID ahead of time is needed because when a task
        // start event is fired this is when the custom execution is called.
        // The task start event is also the first time we see the ID from the main
        // thread, which is too late for us because we need to save an map
        // from an ID to the custom execution function. (Kind of a cart before the horse problem).
        const taskIdPromises = [];
        const fetchPromise = asPromise(() => handler.provider.provideTasks(CancellationToken.None)).then(value => {
            return this.provideTasksInternal(validTypes, taskIdPromises, handler, value);
        });
        return new Promise((resolve) => {
            fetchPromise.then((result) => {
                Promise.all(taskIdPromises).then(() => {
                    resolve(result);
                });
            });
        });
    }
    async $resolveTask(handle, taskDTO) {
        const handler = this._handlers.get(handle);
        if (!handler) {
            return Promise.reject(new Error('no handler found'));
        }
        if (taskDTO.definition.type !== handler.type) {
            throw new Error(`Unexpected: Task of type [${taskDTO.definition.type}] cannot be resolved by provider of type [${handler.type}].`);
        }
        const task = await TaskDTO.to(taskDTO, this._workspaceProvider, this._providedCustomExecutions2);
        if (!task) {
            throw new Error('Unexpected: Task cannot be resolved.');
        }
        const resolvedTask = await handler.provider.resolveTask(task, CancellationToken.None);
        if (!resolvedTask) {
            return;
        }
        this.checkDeprecation(resolvedTask, handler);
        const resolvedTaskDTO = TaskDTO.from(resolvedTask, handler.extension);
        if (!resolvedTaskDTO) {
            throw new Error('Unexpected: Task cannot be resolved.');
        }
        if (resolvedTask.definition !== task.definition) {
            throw new Error('Unexpected: The resolved task definition must be the same object as the original task definition. The task definition cannot be changed.');
        }
        if (CustomExecutionDTO.is(resolvedTaskDTO.execution)) {
            await this.addCustomExecution(resolvedTaskDTO, resolvedTask, true);
        }
        return await this.resolveTaskInternal(resolvedTaskDTO);
    }
    nextHandle() {
        return this._handleCounter++;
    }
    async addCustomExecution(taskDTO, task, isProvided) {
        const taskId = await this._proxy.$createTaskId(taskDTO);
        if (!isProvided && !this._providedCustomExecutions2.has(taskId)) {
            this._notProvidedCustomExecutions.add(taskId);
            // Also add to active executions when not coming from a provider to prevent timing issue.
            this._activeCustomExecutions2.set(taskId, task.execution);
        }
        this._providedCustomExecutions2.set(taskId, task.execution);
    }
    async getTaskExecution(execution, task) {
        if (typeof execution === 'string') {
            const taskExecution = this._taskExecutionPromises.get(execution);
            if (!taskExecution) {
                throw new ErrorNoTelemetry('Unexpected: The specified task is missing an execution');
            }
            return taskExecution;
        }
        const result = this._taskExecutionPromises.get(execution.id);
        if (result) {
            return result;
        }
        let executionPromise;
        if (!task) {
            executionPromise = TaskDTO.to(execution.task, this._workspaceProvider, this._providedCustomExecutions2).then(t => {
                if (!t) {
                    throw new ErrorNoTelemetry('Unexpected: Task does not exist.');
                }
                return new TaskExecutionImpl(this, execution.id, t);
            });
        }
        else {
            executionPromise = Promise.resolve(new TaskExecutionImpl(this, execution.id, task));
        }
        this._taskExecutionPromises.set(execution.id, executionPromise);
        return executionPromise.then(taskExecution => {
            this._taskExecutions.set(execution.id, taskExecution);
            return taskExecution;
        });
    }
    checkDeprecation(task, handler) {
        const tTask = task;
        if (tTask._deprecated) {
            this._deprecationService.report('Task.constructor', handler.extension, 'Use the Task constructor that takes a `scope` instead.');
        }
    }
    customExecutionComplete(execution) {
        const extensionCallback2 = this._activeCustomExecutions2.get(execution.id);
        if (extensionCallback2) {
            this._activeCustomExecutions2.delete(execution.id);
        }
        // Technically we don't really need to do this, however, if an extension
        // is executing a task through "executeTask" over and over again
        // with different properties in the task definition, then the map of executions
        // could grow indefinitely, something we don't want.
        if (this._notProvidedCustomExecutions.has(execution.id) && (this._lastStartedTask !== execution.id)) {
            this._providedCustomExecutions2.delete(execution.id);
            this._notProvidedCustomExecutions.delete(execution.id);
        }
        const iterator = this._notProvidedCustomExecutions.values();
        let iteratorResult = iterator.next();
        while (!iteratorResult.done) {
            if (!this._activeCustomExecutions2.has(iteratorResult.value) && (this._lastStartedTask !== iteratorResult.value)) {
                this._providedCustomExecutions2.delete(iteratorResult.value);
                this._notProvidedCustomExecutions.delete(iteratorResult.value);
            }
            iteratorResult = iterator.next();
        }
    }
};
ExtHostTaskBase = __decorate([
    __param(0, IExtHostRpcService),
    __param(1, IExtHostInitDataService),
    __param(2, IExtHostWorkspace),
    __param(3, IExtHostDocumentsAndEditors),
    __param(4, IExtHostConfiguration),
    __param(5, IExtHostTerminalService),
    __param(6, ILogService),
    __param(7, IExtHostApiDeprecationService)
], ExtHostTaskBase);
export { ExtHostTaskBase };
let WorkerExtHostTask = class WorkerExtHostTask extends ExtHostTaskBase {
    constructor(extHostRpc, initData, workspaceService, editorService, configurationService, extHostTerminalService, logService, deprecationService) {
        super(extHostRpc, initData, workspaceService, editorService, configurationService, extHostTerminalService, logService, deprecationService);
        this.registerTaskSystem(Schemas.vscodeRemote, {
            scheme: Schemas.vscodeRemote,
            authority: '',
            platform: Platform.PlatformToString(0 /* Platform.Platform.Web */)
        });
    }
    async executeTask(extension, task) {
        if (!task.execution) {
            throw new Error('Tasks to execute must include an execution');
        }
        const dto = TaskDTO.from(task, extension);
        if (dto === undefined) {
            throw new Error('Task is not valid');
        }
        // If this task is a custom execution, then we need to save it away
        // in the provided custom execution map that is cleaned up after the
        // task is executed.
        if (CustomExecutionDTO.is(dto.execution)) {
            await this.addCustomExecution(dto, task, false);
        }
        else {
            throw new NotSupportedError();
        }
        // Always get the task execution first to prevent timing issues when retrieving it later
        const execution = await this.getTaskExecution(await this._proxy.$getTaskExecution(dto), task);
        this._proxy.$executeTask(dto).catch(error => { throw new Error(error); });
        return execution;
    }
    provideTasksInternal(validTypes, taskIdPromises, handler, value) {
        const taskDTOs = [];
        if (value) {
            for (const task of value) {
                this.checkDeprecation(task, handler);
                if (!task.definition || !validTypes[task.definition.type]) {
                    const source = task.source ? task.source : 'No task source';
                    this._logService.warn(`The task [${source}, ${task.name}] uses an undefined task type. The task will be ignored in the future.`);
                }
                const taskDTO = TaskDTO.from(task, handler.extension);
                if (taskDTO && CustomExecutionDTO.is(taskDTO.execution)) {
                    taskDTOs.push(taskDTO);
                    // The ID is calculated on the main thread task side, so, let's call into it here.
                    // We need the task id's pre-computed for custom task executions because when OnDidStartTask
                    // is invoked, we have to be able to map it back to our data.
                    taskIdPromises.push(this.addCustomExecution(taskDTO, task, true));
                }
                else {
                    this._logService.warn('Only custom execution tasks supported.');
                }
            }
        }
        return {
            tasks: taskDTOs,
            extension: handler.extension
        };
    }
    async resolveTaskInternal(resolvedTaskDTO) {
        if (CustomExecutionDTO.is(resolvedTaskDTO.execution)) {
            return resolvedTaskDTO;
        }
        else {
            this._logService.warn('Only custom execution tasks supported.');
        }
        return undefined;
    }
    async $resolveVariables(uriComponents, toResolve) {
        const result = {
            process: undefined,
            variables: Object.create(null)
        };
        return result;
    }
    async $jsonTasksSupported() {
        return false;
    }
    async $findExecutable(command, cwd, paths) {
        return undefined;
    }
};
WorkerExtHostTask = __decorate([
    __param(0, IExtHostRpcService),
    __param(1, IExtHostInitDataService),
    __param(2, IExtHostWorkspace),
    __param(3, IExtHostDocumentsAndEditors),
    __param(4, IExtHostConfiguration),
    __param(5, IExtHostTerminalService),
    __param(6, ILogService),
    __param(7, IExtHostApiDeprecationService)
], WorkerExtHostTask);
export { WorkerExtHostTask };
export const IExtHostTask = createDecorator('IExtHostTask');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFRhc2suanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9jb21tb24vZXh0SG9zdFRhc2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsaURBQWlEO0FBRWpELE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sNkJBQTZCLENBQUM7QUFDakUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQzFELE9BQU8sRUFBUyxPQUFPLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUUvRCxPQUFPLEVBQUUsV0FBVyxFQUF5QyxNQUFNLHVCQUF1QixDQUFDO0FBQzNGLE9BQU8sS0FBSyxLQUFLLE1BQU0sbUJBQW1CLENBQUM7QUFDM0MsT0FBTyxFQUE2QixpQkFBaUIsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBR3JGLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQ2xFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRXpFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ3RFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQzVELE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ3RFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUMxRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDMUQsT0FBTyxLQUFLLFFBQVEsTUFBTSxrQ0FBa0MsQ0FBQztBQUM3RCxPQUFPLEVBQUUsV0FB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