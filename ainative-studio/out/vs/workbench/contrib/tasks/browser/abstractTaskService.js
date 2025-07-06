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
var AbstractTaskService_1;
import { Action } from '../../../../base/common/actions.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import * as glob from '../../../../base/common/glob.js';
import * as json from '../../../../base/common/json.js';
import { Disposable, dispose } from '../../../../base/common/lifecycle.js';
import { LRUCache } from '../../../../base/common/map.js';
import * as Objects from '../../../../base/common/objects.js';
import { ValidationStatus } from '../../../../base/common/parsers.js';
import * as Platform from '../../../../base/common/platform.js';
import * as resources from '../../../../base/common/resources.js';
import Severity from '../../../../base/common/severity.js';
import * as Types from '../../../../base/common/types.js';
import { URI } from '../../../../base/common/uri.js';
import * as UUID from '../../../../base/common/uuid.js';
import * as nls from '../../../../nls.js';
import { CommandsRegistry, ICommandService } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IMarkerService } from '../../../../platform/markers/common/markers.js';
import { IProgressService } from '../../../../platform/progress/common/progress.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { ProblemMatcherRegistry } from '../common/problemMatcher.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { IWorkspaceContextService, WorkspaceFolder } from '../../../../platform/workspace/common/workspace.js';
import { Markers } from '../../markers/common/markers.js';
import { IConfigurationResolverService } from '../../../services/configurationResolver/common/configurationResolver.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IOutputService } from '../../../services/output/common/output.js';
import { ITextFileService } from '../../../services/textfile/common/textfiles.js';
import { ITerminalGroupService, ITerminalService } from '../../terminal/browser/terminal.js';
import { ITerminalProfileResolverService } from '../../terminal/common/terminal.js';
import { ConfiguringTask, ContributedTask, CustomTask, ExecutionEngine, InMemoryTask, KeyedTaskIdentifier, RuntimeType, TASK_RUNNING_STATE, TaskDefinition, TaskGroup, TaskSorter, TaskSourceKind, USER_TASKS_GROUP_KEY, TaskEventKind } from '../common/tasks.js';
import { CustomExecutionSupportedContext, ProcessExecutionSupportedContext, ServerlessWebContext, ShellExecutionSupportedContext, TaskCommandsRegistered, TaskExecutionSupportedContext } from '../common/taskService.js';
import { TaskError } from '../common/taskSystem.js';
import { getTemplates as getTaskTemplates } from '../common/taskTemplates.js';
import * as TaskConfig from '../common/taskConfiguration.js';
import { TerminalTaskSystem } from './terminalTaskSystem.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { TaskDefinitionRegistry } from '../common/taskDefinitionRegistry.js';
import { raceTimeout } from '../../../../base/common/async.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { toFormattedString } from '../../../../base/common/jsonFormatter.js';
import { Schemas } from '../../../../base/common/network.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { ITextModelService } from '../../../../editor/common/services/resolverService.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { TerminalExitReason } from '../../../../platform/terminal/common/terminal.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IWorkspaceTrustManagementService, IWorkspaceTrustRequestService } from '../../../../platform/workspace/common/workspaceTrust.js';
import { VirtualWorkspaceContext } from '../../../common/contextkeys.js';
import { EditorResourceAccessor } from '../../../common/editor.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { configureTaskIcon, isWorkspaceFolder, QUICKOPEN_DETAIL_CONFIG, QUICKOPEN_SKIP_CONFIG, TaskQuickPick } from './taskQuickPick.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { ILifecycleService } from '../../../services/lifecycle/common/lifecycle.js';
import { IPaneCompositePartService } from '../../../services/panecomposite/browser/panecomposite.js';
import { IPathService } from '../../../services/path/common/pathService.js';
import { IPreferencesService } from '../../../services/preferences/common/preferences.js';
import { IRemoteAgentService } from '../../../services/remote/common/remoteAgentService.js';
import { isCancellationError } from '../../../../base/common/errors.js';
const QUICKOPEN_HISTORY_LIMIT_CONFIG = 'task.quickOpen.history';
const PROBLEM_MATCHER_NEVER_CONFIG = 'task.problemMatchers.neverPrompt';
const USE_SLOW_PICKER = 'task.quickOpen.showAll';
export var ConfigureTaskAction;
(function (ConfigureTaskAction) {
    ConfigureTaskAction.ID = 'workbench.action.tasks.configureTaskRunner';
    ConfigureTaskAction.TEXT = nls.localize2('ConfigureTaskRunnerAction.label', "Configure Task");
})(ConfigureTaskAction || (ConfigureTaskAction = {}));
class ProblemReporter {
    constructor(_outputChannel) {
        this._outputChannel = _outputChannel;
        this._validationStatus = new ValidationStatus();
    }
    info(message) {
        this._validationStatus.state = 1 /* ValidationState.Info */;
        this._outputChannel.append(message + '\n');
    }
    warn(message) {
        this._validationStatus.state = 2 /* ValidationState.Warning */;
        this._outputChannel.append(message + '\n');
    }
    error(message) {
        this._validationStatus.state = 3 /* ValidationState.Error */;
        this._outputChannel.append(message + '\n');
    }
    fatal(message) {
        this._validationStatus.state = 4 /* ValidationState.Fatal */;
        this._outputChannel.append(message + '\n');
    }
    get status() {
        return this._validationStatus;
    }
}
class TaskMap {
    constructor() {
        this._store = new Map();
    }
    forEach(callback) {
        this._store.forEach(callback);
    }
    static getKey(workspaceFolder) {
        let key;
        if (Types.isString(workspaceFolder)) {
            key = workspaceFolder;
        }
        else {
            const uri = isWorkspaceFolder(workspaceFolder) ? workspaceFolder.uri : workspaceFolder.configuration;
            key = uri ? uri.toString() : '';
        }
        return key;
    }
    get(workspaceFolder) {
        const key = TaskMap.getKey(workspaceFolder);
        let result = this._store.get(key);
        if (!result) {
            result = [];
            this._store.set(key, result);
        }
        return result;
    }
    add(workspaceFolder, ...task) {
        const key = TaskMap.getKey(workspaceFolder);
        let values = this._store.get(key);
        if (!values) {
            values = [];
            this._store.set(key, values);
        }
        values.push(...task);
    }
    all() {
        const result = [];
        this._store.forEach((values) => result.push(...values));
        return result;
    }
}
let AbstractTaskService = class AbstractTaskService extends Disposable {
    static { AbstractTaskService_1 = this; }
    // private static autoDetectTelemetryName: string = 'taskServer.autoDetect';
    static { this.RecentlyUsedTasks_Key = 'workbench.tasks.recentlyUsedTasks'; }
    static { this.RecentlyUsedTasks_KeyV2 = 'workbench.tasks.recentlyUsedTasks2'; }
    static { this.PersistentTasks_Key = 'workbench.tasks.persistentTasks'; }
    static { this.IgnoreTask010DonotShowAgain_key = 'workbench.tasks.ignoreTask010Shown'; }
    static { this.OutputChannelId = 'tasks'; }
    static { this.OutputChannelLabel = nls.localize('tasks', "Tasks"); }
    static { this._nextHandle = 0; }
    get isReconnected() { return this._tasksReconnected; }
    constructor(_configurationService, _markerService, _outputService, _paneCompositeService, _viewsService, _commandService, _editorService, _fileService, _contextService, _telemetryService, _textFileService, _modelService, _extensionService, _quickInputService, _configurationResolverService, _terminalService, _terminalGroupService, _storageService, _progressService, _openerService, _dialogService, _notificationService, _contextKeyService, _environmentService, _terminalProfileResolverService, _pathService, _textModelResolverService, _preferencesService, _viewDescriptorService, _workspaceTrustRequestService, _workspaceTrustManagementService, _logService, _themeService, _lifecycleService, remoteAgentService, _instantiationService) {
        super();
        this._configurationService = _configurationService;
        this._markerService = _markerService;
        this._outputService = _outputService;
        this._paneCompositeService = _paneCompositeService;
        this._viewsService = _viewsService;
        this._commandService = _commandService;
        this._editorService = _editorService;
        this._fileService = _fileService;
        this._contextService = _contextService;
        this._telemetryService = _telemetryService;
        this._textFileService = _textFileService;
        this._modelService = _modelService;
        this._extensionService = _extensionService;
        this._quickInputService = _quickInputService;
        this._configurationResolverService = _configurationResolverService;
        this._terminalService = _terminalService;
        this._terminalGroupService = _terminalGroupService;
        this._storageService = _storageService;
        this._progressService = _progressService;
        this._openerService = _openerService;
        this._dialogService = _dialogService;
        this._notificationService = _notificationService;
        this._contextKeyService = _contextKeyService;
        this._environmentService = _environmentService;
        this._terminalProfileResolverService = _terminalProfileResolverService;
        this._pathService = _pathService;
        this._textModelResolverService = _textModelResolverService;
        this._preferencesService = _preferencesService;
        this._viewDescriptorService = _viewDescriptorService;
        this._workspaceTrustRequestService = _workspaceTrustRequestService;
        this._workspaceTrustManagementService = _workspaceTrustManagementService;
        this._logService = _logService;
        this._themeService = _themeService;
        this._lifecycleService = _lifecycleService;
        this._instantiationService = _instantiationService;
        this._tasksReconnected = false;
        this._taskSystemListeners = [];
        this._onDidRegisterSupportedExecutions = new Emitter();
        this._onDidRegisterAllSupportedExecutions = new Emitter();
        this._onDidChangeTaskSystemInfo = new Emitter();
        this._willRestart = false;
        this.onDidChangeTaskSystemInfo = this._onDidChangeTaskSystemInfo.event;
        this._onDidReconnectToTasks = new Emitter();
        this.onDidReconnectToTasks = this._onDidReconnectToTasks.event;
        this._onDidChangeTaskConfig = new Emitter();
        this.onDidChangeTaskConfig = this._onDidChangeTaskConfig.event;
        this._onDidChangeTaskProviders = this._register(new Emitter());
        this.onDidChangeTaskProviders = this._onDidChangeTaskProviders.event;
        this._activatedTaskProviders = new Set();
        this._whenTaskSystemReady = Event.toPromise(this.onDidChangeTaskSystemInfo);
        this._workspaceTasksPromise = undefined;
        this._taskSystem = undefined;
        this._taskSystemListeners = undefined;
        this._outputChannel = this._outputService.getChannel(AbstractTaskService_1.OutputChannelId);
        this._providers = new Map();
        this._providerTypes = new Map();
        this._taskSystemInfos = new Map();
        this._register(this._contextService.onDidChangeWorkspaceFolders(() => {
            const folderSetup = this._computeWorkspaceFolderSetup();
            if (this.executionEngine !== folderSetup[2]) {
                this._disposeTaskSystemListeners();
                this._taskSystem = undefined;
            }
            this._updateSetup(folderSetup);
            return this._updateWorkspaceTasks(2 /* TaskRunSource.FolderOpen */);
        }));
        this._register(this._configurationService.onDidChangeConfiguration(async (e) => {
            if (!e.affectsConfiguration('tasks') || (!this._taskSystem && !this._workspaceTasksPromise)) {
                return;
            }
            if (!this._taskSystem || this._taskSystem instanceof TerminalTaskSystem) {
                this._outputChannel.clear();
            }
            if (e.affectsConfiguration("task.reconnection" /* TaskSettingId.Reconnection */)) {
                if (!this._configurationService.getValue("task.reconnection" /* TaskSettingId.Reconnection */)) {
                    this._persistentTasks?.clear();
                    this._storageService.remove(AbstractTaskService_1.PersistentTasks_Key, 1 /* StorageScope.WORKSPACE */);
                }
            }
            this._setTaskLRUCacheLimit();
            await this._updateWorkspaceTasks(3 /* TaskRunSource.ConfigurationChange */);
            this._onDidChangeTaskConfig.fire();
        }));
        this._taskRunningState = TASK_RUNNING_STATE.bindTo(_contextKeyService);
        this._onDidStateChange = this._register(new Emitter());
        this._registerCommands().then(() => TaskCommandsRegistered.bindTo(this._contextKeyService).set(true));
        ServerlessWebContext.bindTo(this._contextKeyService).set(Platform.isWeb && !remoteAgentService.getConnection()?.remoteAuthority);
        this._configurationResolverService.contributeVariable('defaultBuildTask', async () => {
            // delay provider activation, we might find a single default build task in the tasks.json file
            let tasks = await this._getTasksForGroup(TaskGroup.Build, true);
            if (tasks.length > 0) {
                const defaults = this._getDefaultTasks(tasks);
                if (defaults.length === 1) {
                    return defaults[0]._label;
                }
            }
            // activate all providers, we haven't found the default build task in the tasks.json file
            tasks = await this._getTasksForGroup(TaskGroup.Build);
            const defaults = this._getDefaultTasks(tasks);
            if (defaults.length === 1) {
                return defaults[0]._label;
            }
            else if (defaults.length) {
                tasks = defaults;
            }
            let entry;
            if (tasks && tasks.length > 0) {
                entry = await this._showQuickPick(tasks, nls.localize('TaskService.pickBuildTaskForLabel', 'Select the build task (there is no default build task defined)'));
            }
            const task = entry ? entry.task : undefined;
            if (!task) {
                return undefined;
            }
            return task._label;
        });
        this._register(this._lifecycleService.onBeforeShutdown(e => {
            this._willRestart = e.reason !== 3 /* ShutdownReason.RELOAD */;
        }));
        this._register(this.onDidStateChange(e => {
            this._log(nls.localize('taskEvent', 'Task Event kind: {0}', e.kind), true);
            if (e.kind === TaskEventKind.Changed) {
                // no-op
            }
            else if ((this._willRestart || (e.kind === TaskEventKind.Terminated && e.exitReason === TerminalExitReason.User)) && e.taskId) {
                const key = e.__task.getKey();
                if (key) {
                    this.removePersistentTask(key);
                }
            }
            else if (e.kind === TaskEventKind.Start && e.__task && e.__task.getWorkspaceFolder()) {
                this._setPersistentTask(e.__task);
            }
        }));
        this._waitForAllSupportedExecutions = new Promise(resolve => {
            Event.once(this._onDidRegisterAllSupportedExecutions.event)(() => resolve());
        });
        if (this._terminalService.getReconnectedTerminals('Task')?.length) {
            this._attemptTaskReconnection();
        }
        else {
            this._terminalService.whenConnected.then(() => {
                if (this._terminalService.getReconnectedTerminals('Task')?.length) {
                    this._attemptTaskReconnection();
                }
                else {
                    this._tasksReconnected = true;
                    this._onDidReconnectToTasks.fire();
                }
            });
        }
        this._upgrade();
    }
    registerSupportedExecutions(custom, shell, process) {
        if (custom !== undefined) {
            const customContext = CustomExecutionSupportedContext.bindTo(this._contextKeyService);
            customContext.set(custom);
        }
        const isVirtual = !!VirtualWorkspaceContext.getValue(this._contextKeyService);
        if (shell !== undefined) {
            const shellContext = ShellExecutionSupportedContext.bindTo(this._contextKeyService);
            shellContext.set(shell && !isVirtual);
        }
        if (process !== undefined) {
            const processContext = ProcessExecutionSupportedContext.bindTo(this._contextKeyService);
            processContext.set(process && !isVirtual);
        }
        // update tasks so an incomplete list isn't returned when getWorkspaceTasks is called
        this._workspaceTasksPromise = undefined;
        this._onDidRegisterSupportedExecutions.fire();
        if (Platform.isWeb || (custom && shell && process)) {
            this._onDidRegisterAllSupportedExecutions.fire();
        }
    }
    _attemptTaskReconnection() {
        if (this._lifecycleService.startupKind !== 3 /* StartupKind.ReloadedWindow */) {
            this._log(nls.localize('TaskService.skippingReconnection', 'Startup kind not window reload, setting connected and removing persistent tasks'), true);
            this._tasksReconnected = true;
            this._storageService.remove(AbstractTaskService_1.PersistentTasks_Key, 1 /* StorageScope.WORKSPACE */);
        }
        if (!this._configurationService.getValue("task.reconnection" /* TaskSettingId.Reconnection */) || this._tasksReconnected) {
            this._log(nls.localize('TaskService.notConnecting', 'Setting tasks connected configured value {0}, tasks were already reconnected {1}', this._configurationService.getValue("task.reconnection" /* TaskSettingId.Reconnection */), this._tasksReconnected), true);
            this._tasksReconnected = true;
            return;
        }
        this._log(nls.localize('TaskService.reconnecting', 'Reconnecting to running tasks...'), true);
        this.getWorkspaceTasks(4 /* TaskRunSource.Reconnect */).then(async () => {
            this._tasksReconnected = await this._reconnectTasks();
            this._log(nls.localize('TaskService.reconnected', 'Reconnected to running tasks.'), true);
            this._onDidReconnectToTasks.fire();
        });
    }
    async _reconnectTasks() {
        const tasks = await this.getSavedTasks('persistent');
        if (!tasks.length) {
            this._log(nls.localize('TaskService.noTasks', 'No persistent tasks to reconnect.'), true);
            return true;
        }
        const taskLabels = tasks.map(task => task._label).join(', ');
        this._log(nls.localize('TaskService.reconnectingTasks', 'Reconnecting to {0} tasks...', taskLabels), true);
        for (const task of tasks) {
            if (ConfiguringTask.is(task)) {
                const resolved = await this.tryResolveTask(task);
                if (resolved) {
                    this.run(resolved, undefined, 4 /* TaskRunSource.Reconnect */);
                }
            }
            else {
                this.run(task, undefined, 4 /* TaskRunSource.Reconnect */);
            }
        }
        return true;
    }
    get onDidStateChange() {
        return this._onDidStateChange.event;
    }
    get supportsMultipleTaskExecutions() {
        return this.inTerminal();
    }
    async _registerCommands() {
        CommandsRegistry.registerCommand({
            id: 'workbench.action.tasks.runTask',
            handler: async (accessor, arg) => {
                if (await this._trust()) {
                    await this._runTaskCommand(arg);
                }
            },
            metadata: {
                description: 'Run Task',
                args: [{
                        name: 'args',
                        isOptional: true,
                        description: nls.localize('runTask.arg', "Filters the tasks shown in the quickpick"),
                        schema: {
                            anyOf: [
                                {
                                    type: 'string',
                                    description: nls.localize('runTask.label', "The task's label or a term to filter by")
                                },
                                {
                                    type: 'object',
                                    properties: {
                                        type: {
                                            type: 'string',
                                            description: nls.localize('runTask.type', "The contributed task type")
                                        },
                                        task: {
                                            type: 'string',
                                            description: nls.localize('runTask.task', "The task's label or a term to filter by")
                                        }
                                    }
                                }
                            ]
                        }
                    }]
            }
        });
        CommandsRegistry.registerCommand('workbench.action.tasks.reRunTask', async (accessor, arg) => {
            if (await this._trust()) {
                this._reRunTaskCommand();
            }
        });
        CommandsRegistry.registerCommand('workbench.action.tasks.restartTask', async (accessor, arg) => {
            if (await this._trust()) {
                this._runRestartTaskCommand(arg);
            }
        });
        CommandsRegistry.registerCommand('workbench.action.tasks.terminate', async (accessor, arg) => {
            if (await this._trust()) {
                this._runTerminateCommand(arg);
            }
        });
        CommandsRegistry.registerCommand('workbench.action.tasks.showLog', () => {
            this._showOutput(undefined, true);
        });
        CommandsRegistry.registerCommand('workbench.action.tasks.build', async () => {
            if (await this._trust()) {
                this._runBuildCommand();
            }
        });
        CommandsRegistry.registerCommand('workbench.action.tasks.test', async () => {
            if (await this._trust()) {
                this._runTestCommand();
            }
        });
        CommandsRegistry.registerCommand('workbench.action.tasks.configureTaskRunner', async () => {
            if (await this._trust()) {
                this._runConfigureTasks();
            }
        });
        CommandsRegistry.registerCommand('workbench.action.tasks.configureDefaultBuildTask', async () => {
            if (await this._trust()) {
                this._runConfigureDefaultBuildTask();
            }
        });
        CommandsRegistry.registerCommand('workbench.action.tasks.configureDefaultTestTask', async () => {
            if (await this._trust()) {
                this._runConfigureDefaultTestTask();
            }
        });
        CommandsRegistry.registerCommand('workbench.action.tasks.showTasks', async () => {
            if (await this._trust()) {
                return this.runShowTasks();
            }
        });
        CommandsRegistry.registerCommand('workbench.action.tasks.toggleProblems', () => this._commandService.executeCommand(Markers.TOGGLE_MARKERS_VIEW_ACTION_ID));
        CommandsRegistry.registerCommand('workbench.action.tasks.openUserTasks', async () => {
            const resource = this._getResourceForKind(TaskSourceKind.User);
            if (resource) {
                this._openTaskFile(resource, TaskSourceKind.User);
            }
        });
        CommandsRegistry.registerCommand('workbench.action.tasks.openWorkspaceFileTasks', async () => {
            const resource = this._getResourceForKind(TaskSourceKind.WorkspaceFile);
            if (resource) {
                this._openTaskFile(resource, TaskSourceKind.WorkspaceFile);
            }
        });
    }
    get workspaceFolders() {
        if (!this._workspaceFolders) {
            this._updateSetup();
        }
        return this._workspaceFolders;
    }
    get ignoredWorkspaceFolders() {
        if (!this._ignoredWorkspaceFolders) {
            this._updateSetup();
        }
        return this._ignoredWorkspaceFolders;
    }
    get executionEngine() {
        if (this._executionEngine === undefined) {
            this._updateSetup();
        }
        return this._executionEngine;
    }
    get schemaVersion() {
        if (this._schemaVersion === undefined) {
            this._updateSetup();
        }
        return this._schemaVersion;
    }
    get showIgnoreMessage() {
        if (this._showIgnoreMessage === undefined) {
            this._showIgnoreMessage = !this._storageService.getBoolean(AbstractTaskService_1.IgnoreTask010DonotShowAgain_key, 1 /* StorageScope.WORKSPACE */, false);
        }
        return this._showIgnoreMessage;
    }
    _getActivationEvents(type) {
        const result = [];
        result.push('onCommand:workbench.action.tasks.runTask');
        if (type) {
            // send a specific activation event for this task type
            result.push(`onTaskType:${type}`);
        }
        else {
            // send activation events for all task types
            for (const definition of TaskDefinitionRegistry.all()) {
                result.push(`onTaskType:${definition.taskType}`);
            }
        }
        return result;
    }
    async _activateTaskProviders(type) {
        // We need to first wait for extensions to be registered because we might read
        // the `TaskDefinitionRegistry` in case `type` is `undefined`
        await this._extensionService.whenInstalledExtensionsRegistered();
        const hasLoggedActivation = this._activatedTaskProviders.has(type ?? 'all');
        if (!hasLoggedActivation) {
            this._log('Activating task providers ' + (type ?? 'all'));
        }
        const result = await raceTimeout(Promise.all(this._getActivationEvents(type).map(activationEvent => this._extensionService.activateByEvent(activationEvent))), 5000, () => console.warn('Timed out activating extensions for task providers'));
        if (result) {
            this._activatedTaskProviders.add(type ?? 'all');
        }
    }
    _updateSetup(setup) {
        if (!setup) {
            setup = this._computeWorkspaceFolderSetup();
        }
        this._workspaceFolders = setup[0];
        if (this._ignoredWorkspaceFolders) {
            if (this._ignoredWorkspaceFolders.length !== setup[1].length) {
                this._showIgnoreMessage = undefined;
            }
            else {
                const set = new Set();
                this._ignoredWorkspaceFolders.forEach(folder => set.add(folder.uri.toString()));
                for (const folder of setup[1]) {
                    if (!set.has(folder.uri.toString())) {
                        this._showIgnoreMessage = undefined;
                        break;
                    }
                }
            }
        }
        this._ignoredWorkspaceFolders = setup[1];
        this._executionEngine = setup[2];
        this._schemaVersion = setup[3];
        this._workspace = setup[4];
    }
    _showOutput(runSource = 1 /* TaskRunSource.User */, userRequested) {
        if (!VirtualWorkspaceContext.getValue(this._contextKeyService) && ((runSource === 1 /* TaskRunSource.User */) || (runSource === 3 /* TaskRunSource.ConfigurationChange */))) {
            if (userRequested) {
                this._outputService.showChannel(this._outputChannel.id, true);
            }
            else {
                this._notificationService.prompt(Severity.Warning, nls.localize('taskServiceOutputPrompt', 'There are task errors. See the output for details.'), [{
                        label: nls.localize('showOutput', "Show output"),
                        run: () => {
                            this._outputService.showChannel(this._outputChannel.id, true);
                        }
                    }]);
            }
        }
    }
    _disposeTaskSystemListeners() {
        if (this._taskSystemListeners) {
            dispose(this._taskSystemListeners);
            this._taskSystemListeners = undefined;
        }
    }
    registerTaskProvider(provider, type) {
        if (!provider) {
            return {
                dispose: () => { }
            };
        }
        const handle = AbstractTaskService_1._nextHandle++;
        this._providers.set(handle, provider);
        this._providerTypes.set(handle, type);
        this._onDidChangeTaskProviders.fire();
        return {
            dispose: () => {
                this._providers.delete(handle);
                this._providerTypes.delete(handle);
                this._onDidChangeTaskProviders.fire();
            }
        };
    }
    get hasTaskSystemInfo() {
        const infosCount = Array.from(this._taskSystemInfos.values()).flat().length;
        // If there's a remoteAuthority, then we end up with 2 taskSystemInfos,
        // one for each extension host.
        if (this._environmentService.remoteAuthority) {
            return infosCount > 1;
        }
        return infosCount > 0;
    }
    registerTaskSystem(key, info) {
        // Ideally the Web caller of registerRegisterTaskSystem would use the correct key.
        // However, the caller doesn't know about the workspace folders at the time of the call, even though we know about them here.
        if (info.platform === 0 /* Platform.Platform.Web */) {
            key = this.workspaceFolders.length ? this.workspaceFolders[0].uri.scheme : key;
        }
        if (!this._taskSystemInfos.has(key)) {
            this._taskSystemInfos.set(key, [info]);
        }
        else {
            const infos = this._taskSystemInfos.get(key);
            if (info.platform === 0 /* Platform.Platform.Web */) {
                // Web infos should be pushed last.
                infos.push(info);
            }
            else {
                infos.unshift(info);
            }
        }
        if (this.hasTaskSystemInfo) {
            this._onDidChangeTaskSystemInfo.fire();
        }
    }
    _getTaskSystemInfo(key) {
        const infos = this._taskSystemInfos.get(key);
        return (infos && infos.length) ? infos[0] : undefined;
    }
    extensionCallbackTaskComplete(task, result) {
        if (!this._taskSystem) {
            return Promise.resolve();
        }
        return this._taskSystem.customExecutionComplete(task, result);
    }
    /**
     * Get a subset of workspace tasks that match a certain predicate.
     */
    async _findWorkspaceTasks(predicate) {
        const result = [];
        const tasks = await this.getWorkspaceTasks();
        for (const [, workspaceTasks] of tasks) {
            if (workspaceTasks.configurations) {
                for (const taskName in workspaceTasks.configurations.byIdentifier) {
                    const task = workspaceTasks.configurations.byIdentifier[taskName];
                    if (predicate(task, workspaceTasks.workspaceFolder)) {
                        result.push(task);
                    }
                }
            }
            if (workspaceTasks.set) {
                for (const task of workspaceTasks.set.tasks) {
                    if (predicate(task, workspaceTasks.workspaceFolder)) {
                        result.push(task);
                    }
                }
            }
        }
        return result;
    }
    async _findWorkspaceTasksInGroup(group, isDefault) {
        return this._findWorkspaceTasks((task) => {
            const taskGroup = task.configurationProperties.group;
            if (taskGroup && typeof taskGroup !== 'string') {
                return (taskGroup._id === group._id && (!isDefault || !!taskGroup.isDefault));
            }
            return false;
        });
    }
    async getTask(folder, identifier, compareId = false, type = undefined) {
        if (!(await this._trust())) {
            return;
        }
        const name = Types.isString(folder) ? folder : isWorkspaceFolder(folder) ? folder.name : folder.configuration ? resources.basename(folder.configuration) : undefined;
        if (this.ignoredWorkspaceFolders.some(ignored => ignored.name === name)) {
            return Promise.reject(new Error(nls.localize('TaskServer.folderIgnored', 'The folder {0} is ignored since it uses task version 0.1.0', name)));
        }
        const key = !Types.isString(identifier)
            ? TaskDefinition.createTaskIdentifier(identifier, console)
            : identifier;
        if (key === undefined) {
            return Promise.resolve(undefined);
        }
        // Try to find the task in the workspace
        const requestedFolder = TaskMap.getKey(folder);
        const matchedTasks = await this._findWorkspaceTasks((task, workspaceFolder) => {
            const taskFolder = TaskMap.getKey(workspaceFolder);
            if (taskFolder !== requestedFolder && taskFolder !== USER_TASKS_GROUP_KEY) {
                return false;
            }
            return task.matches(key, compareId);
        });
        matchedTasks.sort(task => task._source.kind === TaskSourceKind.Extension ? 1 : -1);
        if (matchedTasks.length > 0) {
            // Nice, we found a configured task!
            const task = matchedTasks[0];
            if (ConfiguringTask.is(task)) {
                return this.tryResolveTask(task);
            }
            else {
                return task;
            }
        }
        // We didn't find the task, so we need to ask all resolvers about it
        const map = await this._getGroupedTasks({ type });
        let values = map.get(folder);
        values = values.concat(map.get(USER_TASKS_GROUP_KEY));
        if (!values) {
            return undefined;
        }
        values = values.filter(task => task.matches(key, compareId)).sort(task => task._source.kind === TaskSourceKind.Extension ? 1 : -1);
        return values.length > 0 ? values[0] : undefined;
    }
    async tryResolveTask(configuringTask) {
        if (!(await this._trust())) {
            return;
        }
        await this._activateTaskProviders(configuringTask.type);
        let matchingProvider;
        let matchingProviderUnavailable = false;
        for (const [handle, provider] of this._providers) {
            const providerType = this._providerTypes.get(handle);
            if (configuringTask.type === providerType) {
                if (providerType && !this._isTaskProviderEnabled(providerType)) {
                    matchingProviderUnavailable = true;
                    continue;
                }
                matchingProvider = provider;
                break;
            }
        }
        if (!matchingProvider) {
            if (matchingProviderUnavailable) {
                this._log(nls.localize('TaskService.providerUnavailable', 'Warning: {0} tasks are unavailable in the current environment.', configuringTask.configures.type));
            }
            return;
        }
        // Try to resolve the task first
        try {
            const resolvedTask = await matchingProvider.resolveTask(configuringTask);
            if (resolvedTask && (resolvedTask._id === configuringTask._id)) {
                return TaskConfig.createCustomTask(resolvedTask, configuringTask);
            }
        }
        catch (error) {
            // Ignore errors. The task could not be provided by any of the providers.
        }
        // The task couldn't be resolved. Instead, use the less efficient provideTask.
        const tasks = await this.tasks({ type: configuringTask.type });
        for (const task of tasks) {
            if (task._id === configuringTask._id) {
                return TaskConfig.createCustomTask(task, configuringTask);
            }
        }
        return;
    }
    async tasks(filter) {
        if (!(await this._trust())) {
            return [];
        }
        if (!this._versionAndEngineCompatible(filter)) {
            return Promise.resolve([]);
        }
        return this._getGroupedTasks(filter).then((map) => this.applyFilterToTaskMap(filter, map));
    }
    async getKnownTasks(filter) {
        if (!this._versionAndEngineCompatible(filter)) {
            return Promise.resolve([]);
        }
        return this._getGroupedTasks(filter, true, true).then((map) => this.applyFilterToTaskMap(filter, map));
    }
    taskTypes() {
        const types = [];
        if (this._isProvideTasksEnabled()) {
            for (const definition of TaskDefinitionRegistry.all()) {
                if (this._isTaskProviderEnabled(definition.taskType)) {
                    types.push(definition.taskType);
                }
            }
        }
        return types;
    }
    createSorter() {
        return new TaskSorter(this._contextService.getWorkspace() ? this._contextService.getWorkspace().folders : []);
    }
    _isActive() {
        if (!this._taskSystem) {
            return Promise.resolve(false);
        }
        return this._taskSystem.isActive();
    }
    async getActiveTasks() {
        if (!this._taskSystem) {
            return [];
        }
        return this._taskSystem.getActiveTasks();
    }
    async getBusyTasks() {
        if (!this._taskSystem) {
            return [];
        }
        return this._taskSystem.getBusyTasks();
    }
    getRecentlyUsedTasksV1() {
        if (this._recentlyUsedTasksV1) {
            return this._recentlyUsedTasksV1;
        }
        const quickOpenHistoryLimit = this._configurationService.getValue(QUICKOPEN_HISTORY_LIMIT_CONFIG);
        this._recentlyUsedTasksV1 = new LRUCache(quickOpenHistoryLimit);
        const storageValue = this._storageService.get(AbstractTaskService_1.RecentlyUsedTasks_Key, 1 /* StorageScope.WORKSPACE */);
        if (storageValue) {
            try {
                const values = JSON.parse(storageValue);
                if (Array.isArray(values)) {
                    for (const value of values) {
                        this._recentlyUsedTasksV1.set(value, value);
                    }
                }
            }
            catch (error) {
                // Ignore. We use the empty result
            }
        }
        return this._recentlyUsedTasksV1;
    }
    applyFilterToTaskMap(filter, map) {
        if (!filter || !filter.type) {
            return map.all();
        }
        const result = [];
        map.forEach((tasks) => {
            for (const task of tasks) {
                if (ContributedTask.is(task) && ((task.defines.type === filter.type) || (task._source.label === filter.type))) {
                    result.push(task);
                }
                else if (CustomTask.is(task)) {
                    if (task.type === filter.type) {
                        result.push(task);
                    }
                    else {
                        const customizes = task.customizes();
                        if (customizes && customizes.type === filter.type) {
                            result.push(task);
                        }
                    }
                }
            }
        });
        return result;
    }
    _getTasksFromStorage(type) {
        return type === 'persistent' ? this._getPersistentTasks() : this._getRecentTasks();
    }
    _getRecentTasks() {
        if (this._recentlyUsedTasks) {
            return this._recentlyUsedTasks;
        }
        const quickOpenHistoryLimit = this._configurationService.getValue(QUICKOPEN_HISTORY_LIMIT_CONFIG);
        this._recentlyUsedTasks = new LRUCache(quickOpenHistoryLimit);
        const storageValue = this._storageService.get(AbstractTaskService_1.RecentlyUsedTasks_KeyV2, 1 /* StorageScope.WORKSPACE */);
        if (storageValue) {
            try {
                const values = JSON.parse(storageValue);
                if (Array.isArray(values)) {
                    for (const value of values) {
                        this._recentlyUsedTasks.set(value[0], value[1]);
                    }
                }
            }
            catch (error) {
                // Ignore. We use the empty result
            }
        }
        return this._recentlyUsedTasks;
    }
    _getPersistentTasks() {
        if (this._persistentTasks) {
            this._log(nls.localize('taskService.gettingCachedTasks', 'Returning cached tasks {0}', this._persistentTasks.size), true);
            return this._persistentTasks;
        }
        //TODO: should this # be configurable?
        this._persistentTasks = new LRUCache(10);
        const storageValue = this._storageService.get(AbstractTaskService_1.PersistentTasks_Key, 1 /* StorageScope.WORKSPACE */);
        if (storageValue) {
            try {
                const values = JSON.parse(storageValue);
                if (Array.isArray(values)) {
                    for (const value of values) {
                        this._persistentTasks.set(value[0], value[1]);
                    }
                }
            }
            catch (error) {
                // Ignore. We use the empty result
            }
        }
        return this._persistentTasks;
    }
    _getFolderFromTaskKey(key) {
        const keyValue = JSON.parse(key);
        return {
            folder: keyValue.folder, isWorkspaceFile: keyValue.id?.endsWith(TaskSourceKind.WorkspaceFile)
        };
    }
    async getSavedTasks(type) {
        const folderMap = Object.create(null);
        this.workspaceFolders.forEach(folder => {
            folderMap[folder.uri.toString()] = folder;
        });
        const folderToTasksMap = new Map();
        const workspaceToTaskMap = new Map();
        const storedTasks = this._getTasksFromStorage(type);
        const tasks = [];
        this._log(nls.localize('taskService.getSavedTasks', 'Fetching tasks from task storage.'), true);
        function addTaskToMap(map, folder, task) {
            if (folder && !map.has(folder)) {
                map.set(folder, []);
            }
            if (folder && (folderMap[folder] || (folder === USER_TASKS_GROUP_KEY)) && task) {
                map.get(folder).push(task);
            }
        }
        for (const entry of storedTasks.entries()) {
            try {
                const key = entry[0];
                const task = JSON.parse(entry[1]);
                const folderInfo = this._getFolderFromTaskKey(key);
                this._log(nls.localize('taskService.getSavedTasks.reading', 'Reading tasks from task storage, {0}, {1}, {2}', key, task, folderInfo.folder), true);
                addTaskToMap(folderInfo.isWorkspaceFile ? workspaceToTaskMap : folderToTasksMap, folderInfo.folder, task);
            }
            catch (error) {
                this._log(nls.localize('taskService.getSavedTasks.error', 'Fetching a task from task storage failed: {0}.', error), true);
            }
        }
        const readTasksMap = new Map();
        async function readTasks(that, map, isWorkspaceFile) {
            for (const key of map.keys()) {
                const custom = [];
                const customized = Object.create(null);
                const taskConfigSource = (folderMap[key]
                    ? (isWorkspaceFile
                        ? TaskConfig.TaskConfigSource.WorkspaceFile : TaskConfig.TaskConfigSource.TasksJson)
                    : TaskConfig.TaskConfigSource.User);
                await that._computeTasksForSingleConfig(folderMap[key] ?? await that._getAFolder(), {
                    version: '2.0.0',
                    tasks: map.get(key)
                }, 0 /* TaskRunSource.System */, custom, customized, taskConfigSource, true);
                custom.forEach(task => {
                    const taskKey = task.getKey();
                    if (taskKey) {
                        readTasksMap.set(taskKey, task);
                    }
                });
                for (const configuration in customized) {
                    const taskKey = customized[configuration].getKey();
                    if (taskKey) {
                        readTasksMap.set(taskKey, customized[configuration]);
                    }
                }
            }
        }
        await readTasks(this, folderToTasksMap, false);
        await readTasks(this, workspaceToTaskMap, true);
        for (const key of storedTasks.keys()) {
            if (readTasksMap.has(key)) {
                tasks.push(readTasksMap.get(key));
                this._log(nls.localize('taskService.getSavedTasks.resolved', 'Resolved task {0}', key), true);
            }
            else {
                this._log(nls.localize('taskService.getSavedTasks.unresolved', 'Unable to resolve task {0} ', key), true);
            }
        }
        return tasks;
    }
    removeRecentlyUsedTask(taskRecentlyUsedKey) {
        if (this._getTasksFromStorage('historical').has(taskRecentlyUsedKey)) {
            this._getTasksFromStorage('historical').delete(taskRecentlyUsedKey);
            this._saveRecentlyUsedTasks();
        }
    }
    removePersistentTask(key) {
        this._log(nls.localize('taskService.removePersistentTask', 'Removing persistent task {0}', key), true);
        if (this._getTasksFromStorage('persistent').has(key)) {
            this._getTasksFromStorage('persistent').delete(key);
            this._savePersistentTasks();
        }
    }
    _setTaskLRUCacheLimit() {
        const quickOpenHistoryLimit = this._configurationService.getValue(QUICKOPEN_HISTORY_LIMIT_CONFIG);
        if (this._recentlyUsedTasks) {
            this._recentlyUsedTasks.limit = quickOpenHistoryLimit;
        }
    }
    async _setRecentlyUsedTask(task) {
        let key = task.getKey();
        if (!InMemoryTask.is(task) && key) {
            const customizations = this._createCustomizableTask(task);
            if (ContributedTask.is(task) && customizations) {
                const custom = [];
                const customized = Object.create(null);
                await this._computeTasksForSingleConfig(task._source.workspaceFolder ?? this.workspaceFolders[0], {
                    version: '2.0.0',
                    tasks: [customizations]
                }, 0 /* TaskRunSource.System */, custom, customized, TaskConfig.TaskConfigSource.TasksJson, true);
                for (const configuration in customized) {
                    key = customized[configuration].getKey();
                }
            }
            this._getTasksFromStorage('historical').set(key, JSON.stringify(customizations));
            this._saveRecentlyUsedTasks();
        }
    }
    _saveRecentlyUsedTasks() {
        if (!this._recentlyUsedTasks) {
            return;
        }
        const quickOpenHistoryLimit = this._configurationService.getValue(QUICKOPEN_HISTORY_LIMIT_CONFIG);
        // setting history limit to 0 means no LRU sorting
        if (quickOpenHistoryLimit === 0) {
            return;
        }
        let keys = [...this._recentlyUsedTasks.keys()];
        if (keys.length > quickOpenHistoryLimit) {
            keys = keys.slice(0, quickOpenHistoryLimit);
        }
        const keyValues = [];
        for (const key of keys) {
            keyValues.push([key, this._recentlyUsedTasks.get(key, 0 /* Touch.None */)]);
        }
        this._storageService.store(AbstractTaskService_1.RecentlyUsedTasks_KeyV2, JSON.stringify(keyValues), 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
    }
    async _setPersistentTask(task) {
        if (!this._configurationService.getValue("task.reconnection" /* TaskSettingId.Reconnection */)) {
            return;
        }
        let key = task.getKey();
        if (!InMemoryTask.is(task) && key) {
            const customizations = this._createCustomizableTask(task);
            if (ContributedTask.is(task) && customizations) {
                const custom = [];
                const customized = Object.create(null);
                await this._computeTasksForSingleConfig(task._source.workspaceFolder ?? this.workspaceFolders[0], {
                    version: '2.0.0',
                    tasks: [customizations]
                }, 0 /* TaskRunSource.System */, custom, customized, TaskConfig.TaskConfigSource.TasksJson, true);
                for (const configuration in customized) {
                    key = customized[configuration].getKey();
                }
            }
            if (!task.configurationProperties.isBackground) {
                return;
            }
            this._log(nls.localize('taskService.setPersistentTask', 'Setting persistent task {0}', key), true);
            this._getTasksFromStorage('persistent').set(key, JSON.stringify(customizations));
            this._savePersistentTasks();
        }
    }
    _savePersistentTasks() {
        this._persistentTasks = this._getTasksFromStorage('persistent');
        const keys = [...this._persistentTasks.keys()];
        const keyValues = [];
        for (const key of keys) {
            keyValues.push([key, this._persistentTasks.get(key, 0 /* Touch.None */)]);
        }
        this._log(nls.localize('savePersistentTask', 'Saving persistent tasks: {0}', keys.join(', ')), true);
        this._storageService.store(AbstractTaskService_1.PersistentTasks_Key, JSON.stringify(keyValues), 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
    }
    _openDocumentation() {
        this._openerService.open(URI.parse('https://code.visualstudio.com/docs/editor/tasks#_defining-a-problem-matcher'));
    }
    async _findSingleWorkspaceTaskOfGroup(group) {
        const tasksOfGroup = await this._findWorkspaceTasksInGroup(group, true);
        if ((tasksOfGroup.length === 1) && (typeof tasksOfGroup[0].configurationProperties.group !== 'string') && tasksOfGroup[0].configurationProperties.group?.isDefault) {
            let resolvedTask;
            if (ConfiguringTask.is(tasksOfGroup[0])) {
                resolvedTask = await this.tryResolveTask(tasksOfGroup[0]);
            }
            else {
                resolvedTask = tasksOfGroup[0];
            }
            if (resolvedTask) {
                return this.run(resolvedTask, undefined, 1 /* TaskRunSource.User */);
            }
        }
        return undefined;
    }
    async _build() {
        const tryBuildShortcut = await this._findSingleWorkspaceTaskOfGroup(TaskGroup.Build);
        if (tryBuildShortcut) {
            return tryBuildShortcut;
        }
        return this._getGroupedTasksAndExecute();
    }
    async _runTest() {
        const tryTestShortcut = await this._findSingleWorkspaceTaskOfGroup(TaskGroup.Test);
        if (tryTestShortcut) {
            return tryTestShortcut;
        }
        return this._getGroupedTasksAndExecute(true);
    }
    async _getGroupedTasksAndExecute(test) {
        const tasks = await this._getGroupedTasks();
        const runnable = this._createRunnableTask(tasks, test ? TaskGroup.Test : TaskGroup.Build);
        if (!runnable || !runnable.task) {
            if (test) {
                if (this.schemaVersion === 1 /* JsonSchemaVersion.V0_1_0 */) {
                    throw new TaskError(Severity.Info, nls.localize('TaskService.noTestTask1', 'No test task defined. Mark a task with \'isTestCommand\' in the tasks.json file.'), 3 /* TaskErrors.NoTestTask */);
                }
                else {
                    throw new TaskError(Severity.Info, nls.localize('TaskService.noTestTask2', 'No test task defined. Mark a task with as a \'test\' group in the tasks.json file.'), 3 /* TaskErrors.NoTestTask */);
                }
            }
            else {
                if (this.schemaVersion === 1 /* JsonSchemaVersion.V0_1_0 */) {
                    throw new TaskError(Severity.Info, nls.localize('TaskService.noBuildTask1', 'No build task defined. Mark a task with \'isBuildCommand\' in the tasks.json file.'), 2 /* TaskErrors.NoBuildTask */);
                }
                else {
                    throw new TaskError(Severity.Info, nls.localize('TaskService.noBuildTask2', 'No build task defined. Mark a task with as a \'build\' group in the tasks.json file.'), 2 /* TaskErrors.NoBuildTask */);
                }
            }
        }
        let executeTaskResult;
        try {
            executeTaskResult = await this._executeTask(runnable.task, runnable.resolver, 1 /* TaskRunSource.User */);
        }
        catch (error) {
            this._handleError(error);
            return Promise.reject(error);
        }
        return executeTaskResult;
    }
    async run(task, options, runSource = 0 /* TaskRunSource.System */) {
        if (!(await this._trust())) {
            return;
        }
        if (!task) {
            throw new TaskError(Severity.Info, nls.localize('TaskServer.noTask', 'Task to execute is undefined'), 5 /* TaskErrors.TaskNotFound */);
        }
        const resolver = this._createResolver();
        let executeTaskResult;
        try {
            if (options && options.attachProblemMatcher && this._shouldAttachProblemMatcher(task) && !InMemoryTask.is(task)) {
                const taskToExecute = await this._attachProblemMatcher(task);
                if (taskToExecute) {
                    executeTaskResult = await this._executeTask(taskToExecute, resolver, runSource);
                }
            }
            else {
                executeTaskResult = await this._executeTask(task, resolver, runSource);
            }
            return executeTaskResult;
        }
        catch (error) {
            this._handleError(error);
            return Promise.reject(error);
        }
    }
    _isProvideTasksEnabled() {
        const settingValue = this._configurationService.getValue("task.autoDetect" /* TaskSettingId.AutoDetect */);
        return settingValue === 'on';
    }
    _isProblemMatcherPromptEnabled(type) {
        const settingValue = this._configurationService.getValue(PROBLEM_MATCHER_NEVER_CONFIG);
        if (Types.isBoolean(settingValue)) {
            return !settingValue;
        }
        if (type === undefined) {
            return true;
        }
        const settingValueMap = settingValue;
        return !settingValueMap[type];
    }
    _getTypeForTask(task) {
        let type;
        if (CustomTask.is(task)) {
            const configProperties = task._source.config.element;
            type = configProperties.type;
        }
        else {
            type = task.getDefinition().type;
        }
        return type;
    }
    _shouldAttachProblemMatcher(task) {
        const enabled = this._isProblemMatcherPromptEnabled(this._getTypeForTask(task));
        if (enabled === false) {
            return false;
        }
        if (!this._canCustomize(task)) {
            return false;
        }
        if (task.configurationProperties.group !== undefined && task.configurationProperties.group !== TaskGroup.Build) {
            return false;
        }
        if (task.configurationProperties.problemMatchers !== undefined && task.configurationProperties.problemMatchers.length > 0) {
            return false;
        }
        if (ContributedTask.is(task)) {
            return !task.hasDefinedMatchers && !!task.configurationProperties.problemMatchers && (task.configurationProperties.problemMatchers.length === 0);
        }
        if (CustomTask.is(task)) {
            const configProperties = task._source.config.element;
            return configProperties.problemMatcher === undefined && !task.hasDefinedMatchers;
        }
        return false;
    }
    async _updateNeverProblemMatcherSetting(type) {
        const current = this._configurationService.getValue(PROBLEM_MATCHER_NEVER_CONFIG);
        if (current === true) {
            return;
        }
        let newValue;
        if (current !== false) {
            newValue = current;
        }
        else {
            newValue = Object.create(null);
        }
        newValue[type] = true;
        return this._configurationService.updateValue(PROBLEM_MATCHER_NEVER_CONFIG, newValue);
    }
    async _attachProblemMatcher(task) {
        let entries = [];
        for (const key of ProblemMatcherRegistry.keys()) {
            const matcher = ProblemMatcherRegistry.get(key);
            if (matcher.deprecated) {
                continue;
            }
            if (matcher.name === matcher.label) {
                entries.push({ label: matcher.name, matcher: matcher });
            }
            else {
                entries.push({
                    label: matcher.label,
                    description: `$${matcher.name}`,
                    matcher: matcher
                });
            }
        }
        if (entries.length === 0) {
            return;
        }
        entries = entries.sort((a, b) => {
            if (a.label && b.label) {
                return a.label.localeCompare(b.label);
            }
            else {
                return 0;
            }
        });
        entries.unshift({ type: 'separator', label: nls.localize('TaskService.associate', 'associate') });
        let taskType;
        if (CustomTask.is(task)) {
            const configProperties = task._source.config.element;
            taskType = configProperties.type;
        }
        else {
            taskType = task.getDefinition().type;
        }
        entries.unshift({ label: nls.localize('TaskService.attachProblemMatcher.continueWithout', 'Continue without scanning the task output'), matcher: undefined }, { label: nls.localize('TaskService.attachProblemMatcher.never', 'Never scan the task output for this task'), matcher: undefined, never: true }, { label: nls.localize('TaskService.attachProblemMatcher.neverType', 'Never scan the task output for {0} tasks', taskType), matcher: undefined, setting: taskType }, { label: nls.localize('TaskService.attachProblemMatcher.learnMoreAbout', 'Learn more about scanning the task output'), matcher: undefined, learnMore: true });
        const problemMatcher = await this._quickInputService.pick(entries, { placeHolder: nls.localize('selectProblemMatcher', 'Select for which kind of errors and warnings to scan the task output') });
        if (!problemMatcher) {
            return task;
        }
        if (problemMatcher.learnMore) {
            this._openDocumentation();
            return undefined;
        }
        if (problemMatcher.never) {
            this.customize(task, { problemMatcher: [] }, true);
            return task;
        }
        if (problemMatcher.matcher) {
            const newTask = task.clone();
            const matcherReference = `$${problemMatcher.matcher.name}`;
            const properties = { problemMatcher: [matcherReference] };
            newTask.configurationProperties.problemMatchers = [matcherReference];
            const matcher = ProblemMatcherRegistry.get(problemMatcher.matcher.name);
            if (matcher && matcher.watching !== undefined) {
                properties.isBackground = true;
                newTask.configurationProperties.isBackground = true;
            }
            this.customize(task, properties, true);
            return newTask;
        }
        if (problemMatcher.setting) {
            await this._updateNeverProblemMatcherSetting(problemMatcher.setting);
        }
        return task;
    }
    async _getTasksForGroup(group, waitToActivate) {
        const groups = await this._getGroupedTasks(undefined, waitToActivate);
        const result = [];
        groups.forEach(tasks => {
            for (const task of tasks) {
                const configTaskGroup = TaskGroup.from(task.configurationProperties.group);
                if (configTaskGroup?._id === group._id) {
                    result.push(task);
                }
            }
        });
        return result;
    }
    needsFolderQualification() {
        return this._contextService.getWorkbenchState() === 3 /* WorkbenchState.WORKSPACE */;
    }
    _canCustomize(task) {
        if (this.schemaVersion !== 2 /* JsonSchemaVersion.V2_0_0 */) {
            return false;
        }
        if (CustomTask.is(task)) {
            return true;
        }
        if (ContributedTask.is(task)) {
            return !!task.getWorkspaceFolder();
        }
        return false;
    }
    async _formatTaskForJson(resource, task) {
        let reference;
        let stringValue = '';
        try {
            reference = await this._textModelResolverService.createModelReference(resource);
            const model = reference.object.textEditorModel;
            const { tabSize, insertSpaces } = model.getOptions();
            const eol = model.getEOL();
            let stringified = toFormattedString(task, { eol, tabSize, insertSpaces });
            const regex = new RegExp(eol + (insertSpaces ? ' '.repeat(tabSize) : '\\t'), 'g');
            stringified = stringified.replace(regex, eol + (insertSpaces ? ' '.repeat(tabSize * 3) : '\t\t\t'));
            const twoTabs = insertSpaces ? ' '.repeat(tabSize * 2) : '\t\t';
            stringValue = twoTabs + stringified.slice(0, stringified.length - 1) + twoTabs + stringified.slice(stringified.length - 1);
        }
        finally {
            reference?.dispose();
        }
        return stringValue;
    }
    async _openEditorAtTask(resource, task, configIndex = -1) {
        if (resource === undefined) {
            return Promise.resolve(false);
        }
        const fileContent = await this._fileService.readFile(resource);
        const content = fileContent.value;
        if (!content || !task) {
            return false;
        }
        const contentValue = content.toString();
        let stringValue;
        if (configIndex !== -1) {
            const json = this._configurationService.getValue('tasks', { resource });
            if (json.tasks && (json.tasks.length > configIndex)) {
                stringValue = await this._formatTaskForJson(resource, json.tasks[configIndex]);
            }
        }
        if (!stringValue) {
            if (typeof task === 'string') {
                stringValue = task;
            }
            else {
                stringValue = await this._formatTaskForJson(resource, task);
            }
        }
        const index = contentValue.indexOf(stringValue);
        let startLineNumber = 1;
        for (let i = 0; i < index; i++) {
            if (contentValue.charAt(i) === '\n') {
                startLineNumber++;
            }
        }
        let endLineNumber = startLineNumber;
        for (let i = 0; i < stringValue.length; i++) {
            if (stringValue.charAt(i) === '\n') {
                endLineNumber++;
            }
        }
        const selection = startLineNumber > 1 ? { startLineNumber, startColumn: startLineNumber === endLineNumber ? 4 : 3, endLineNumber, endColumn: startLineNumber === endLineNumber ? undefined : 4 } : undefined;
        await this._editorService.openEditor({
            resource,
            options: {
                pinned: false,
                forceReload: true, // because content might have changed
                selection,
                selectionRevealType: 1 /* TextEditorSelectionRevealType.CenterIfOutsideViewport */
            }
        });
        return !!selection;
    }
    _createCustomizableTask(task) {
        let toCustomize;
        const taskConfig = CustomTask.is(task) || ConfiguringTask.is(task) ? task._source.config : undefined;
        if (taskConfig && taskConfig.element) {
            toCustomize = { ...(taskConfig.element) };
        }
        else if (ContributedTask.is(task)) {
            toCustomize = {};
            const identifier = Object.assign(Object.create(null), task.defines);
            delete identifier['_key'];
            Object.keys(identifier).forEach(key => toCustomize[key] = identifier[key]);
            if (task.configurationProperties.problemMatchers && task.configurationProperties.problemMatchers.length > 0 && Types.isStringArray(task.configurationProperties.problemMatchers)) {
                toCustomize.problemMatcher = task.configurationProperties.problemMatchers;
            }
            if (task.configurationProperties.group) {
                toCustomize.group = TaskConfig.GroupKind.to(task.configurationProperties.group);
            }
        }
        if (!toCustomize) {
            return undefined;
        }
        if (toCustomize.problemMatcher === undefined && task.configurationProperties.problemMatchers === undefined || (task.configurationProperties.problemMatchers && task.configurationProperties.problemMatchers.length === 0)) {
            toCustomize.problemMatcher = [];
        }
        if (task._source.label !== 'Workspace') {
            toCustomize.label = task.configurationProperties.identifier;
        }
        else {
            toCustomize.label = task._label;
        }
        toCustomize.detail = task.configurationProperties.detail;
        return toCustomize;
    }
    async customize(task, properties, openConfig) {
        if (!(await this._trust())) {
            return;
        }
        const workspaceFolder = task.getWorkspaceFolder();
        if (!workspaceFolder) {
            return Promise.resolve(undefined);
        }
        const configuration = this._getConfiguration(workspaceFolder, task._source.kind);
        if (configuration.hasParseErrors) {
            this._notificationService.warn(nls.localize('customizeParseErrors', 'The current task configuration has errors. Please fix the errors first before customizing a task.'));
            return Promise.resolve(undefined);
        }
        const fileConfig = configuration.config;
        const toCustomize = this._createCustomizableTask(task);
        if (!toCustomize) {
            return Promise.resolve(undefined);
        }
        const index = CustomTask.is(task) ? task._source.config.index : undefined;
        if (properties) {
            for (const property of Object.getOwnPropertyNames(properties)) {
                const value = properties[property];
                if (value !== undefined && value !== null) {
                    toCustomize[property] = value;
                }
            }
        }
        if (!fileConfig) {
            const value = {
                version: '2.0.0',
                tasks: [toCustomize]
            };
            let content = [
                '{',
                nls.localize('tasksJsonComment', '\t// See https://go.microsoft.com/fwlink/?LinkId=733558 \n\t// for the documentation about the tasks.json format'),
            ].join('\n') + JSON.stringify(value, null, '\t').substr(1);
            const editorConfig = this._configurationService.getValue();
            if (editorConfig.editor.insertSpaces) {
                content = content.replace(/(\n)(\t+)/g, (_, s1, s2) => s1 + ' '.repeat(s2.length * editorConfig.editor.tabSize));
            }
            await this._textFileService.create([{ resource: workspaceFolder.toResource('.vscode/tasks.json'), value: content }]);
        }
        else {
            // We have a global task configuration
            if ((index === -1) && properties) {
                if (properties.problemMatcher !== undefined) {
                    fileConfig.problemMatcher = properties.problemMatcher;
                    await this._writeConfiguration(workspaceFolder, 'tasks.problemMatchers', fileConfig.problemMatcher, task._source.kind);
                }
                else if (properties.group !== undefined) {
                    fileConfig.group = properties.group;
                    await this._writeConfiguration(workspaceFolder, 'tasks.group', fileConfig.group, task._source.kind);
                }
            }
            else {
                if (!Array.isArray(fileConfig.tasks)) {
                    fileConfig.tasks = [];
                }
                if (index === undefined) {
                    fileConfig.tasks.push(toCustomize);
                }
                else {
                    fileConfig.tasks[index] = toCustomize;
                }
                await this._writeConfiguration(workspaceFolder, 'tasks.tasks', fileConfig.tasks, task._source.kind);
            }
        }
        if (openConfig) {
            this._openEditorAtTask(this._getResourceForTask(task), toCustomize);
        }
    }
    _writeConfiguration(workspaceFolder, key, value, source) {
        let target = undefined;
        switch (source) {
            case TaskSourceKind.User:
                target = 2 /* ConfigurationTarget.USER */;
                break;
            case TaskSourceKind.WorkspaceFile:
                target = 5 /* ConfigurationTarget.WORKSPACE */;
                break;
            default: if (this._contextService.getWorkbenchState() === 2 /* WorkbenchState.FOLDER */) {
                target = 5 /* ConfigurationTarget.WORKSPACE */;
            }
            else if (this._contextService.getWorkbenchState() === 3 /* WorkbenchState.WORKSPACE */) {
                target = 6 /* ConfigurationTarget.WORKSPACE_FOLDER */;
            }
        }
        if (target) {
            return this._configurationService.updateValue(key, value, { resource: workspaceFolder.uri }, target);
        }
        else {
            return undefined;
        }
    }
    _getResourceForKind(kind) {
        this._updateSetup();
        switch (kind) {
            case TaskSourceKind.User: {
                return resources.joinPath(resources.dirname(this._preferencesService.userSettingsResource), 'tasks.json');
            }
            case TaskSourceKind.WorkspaceFile: {
                if (this._workspace && this._workspace.configuration) {
                    return this._workspace.configuration;
                }
            }
            default: {
                return undefined;
            }
        }
    }
    _getResourceForTask(task) {
        if (CustomTask.is(task)) {
            let uri = this._getResourceForKind(task._source.kind);
            if (!uri) {
                const taskFolder = task.getWorkspaceFolder();
                if (taskFolder) {
                    uri = taskFolder.toResource(task._source.config.file);
                }
                else {
                    uri = this.workspaceFolders[0].uri;
                }
            }
            return uri;
        }
        else {
            return task.getWorkspaceFolder().toResource('.vscode/tasks.json');
        }
    }
    async openConfig(task) {
        let resource;
        if (task) {
            resource = this._getResourceForTask(task);
        }
        else {
            resource = (this._workspaceFolders && (this._workspaceFolders.length > 0)) ? this._workspaceFolders[0].toResource('.vscode/tasks.json') : undefined;
        }
        return this._openEditorAtTask(resource, task ? task._label : undefined, task ? task._source.config.index : -1);
    }
    _createRunnableTask(tasks, group) {
        const resolverData = new Map();
        const workspaceTasks = [];
        const extensionTasks = [];
        tasks.forEach((tasks, folder) => {
            let data = resolverData.get(folder);
            if (!data) {
                data = {
                    id: new Map(),
                    label: new Map(),
                    identifier: new Map()
                };
                resolverData.set(folder, data);
            }
            for (const task of tasks) {
                data.id.set(task._id, task);
                data.label.set(task._label, task);
                if (task.configurationProperties.identifier) {
                    data.identifier.set(task.configurationProperties.identifier, task);
                }
                if (group && task.configurationProperties.group === group) {
                    if (task._source.kind === TaskSourceKind.Workspace) {
                        workspaceTasks.push(task);
                    }
                    else {
                        extensionTasks.push(task);
                    }
                }
            }
        });
        const resolver = {
            resolve: async (uri, alias) => {
                const data = resolverData.get(typeof uri === 'string' ? uri : uri.toString());
                if (!data) {
                    return undefined;
                }
                return data.id.get(alias) || data.label.get(alias) || data.identifier.get(alias);
            }
        };
        if (workspaceTasks.length > 0) {
            if (workspaceTasks.length > 1) {
                this._log(nls.localize('moreThanOneBuildTask', 'There are many build tasks defined in the tasks.json. Executing the first one.'));
            }
            return { task: workspaceTasks[0], resolver };
        }
        if (extensionTasks.length === 0) {
            return undefined;
        }
        // We can only have extension tasks if we are in version 2.0.0. Then we can even run
        // multiple build tasks.
        if (extensionTasks.length === 1) {
            return { task: extensionTasks[0], resolver };
        }
        else {
            const id = UUID.generateUuid();
            const task = new InMemoryTask(id, { kind: TaskSourceKind.InMemory, label: 'inMemory' }, id, 'inMemory', { reevaluateOnRerun: true }, {
                identifier: id,
                dependsOn: extensionTasks.map((extensionTask) => { return { uri: extensionTask.getWorkspaceFolder().uri, task: extensionTask._id }; }),
                name: id
            });
            return { task, resolver };
        }
    }
    _createResolver(grouped) {
        let resolverData;
        async function quickResolve(that, uri, identifier) {
            const foundTasks = await that._findWorkspaceTasks((task) => {
                const taskUri = ((ConfiguringTask.is(task) || CustomTask.is(task)) ? task._source.config.workspaceFolder?.uri : undefined);
                const originalUri = (typeof uri === 'string' ? uri : uri.toString());
                if (taskUri?.toString() !== originalUri) {
                    return false;
                }
                if (Types.isString(identifier)) {
                    return ((task._label === identifier) || (task.configurationProperties.identifier === identifier));
                }
                else {
                    const keyedIdentifier = task.getDefinition(true);
                    const searchIdentifier = TaskDefinition.createTaskIdentifier(identifier, console);
                    return (searchIdentifier && keyedIdentifier) ? (searchIdentifier._key === keyedIdentifier._key) : false;
                }
            });
            if (foundTasks.length === 0) {
                return undefined;
            }
            const task = foundTasks[0];
            if (ConfiguringTask.is(task)) {
                return that.tryResolveTask(task);
            }
            return task;
        }
        async function getResolverData(that) {
            if (resolverData === undefined) {
                resolverData = new Map();
                (grouped || await that._getGroupedTasks()).forEach((tasks, folder) => {
                    let data = resolverData.get(folder);
                    if (!data) {
                        data = { label: new Map(), identifier: new Map(), taskIdentifier: new Map() };
                        resolverData.set(folder, data);
                    }
                    for (const task of tasks) {
                        data.label.set(task._label, task);
                        if (task.configurationProperties.identifier) {
                            data.identifier.set(task.configurationProperties.identifier, task);
                        }
                        const keyedIdentifier = task.getDefinition(true);
                        if (keyedIdentifier !== undefined) {
                            data.taskIdentifier.set(keyedIdentifier._key, task);
                        }
                    }
                });
            }
            return resolverData;
        }
        async function fullResolve(that, uri, identifier) {
            const allResolverData = await getResolverData(that);
            const data = allResolverData.get(typeof uri === 'string' ? uri : uri.toString());
            if (!data) {
                return undefined;
            }
            if (Types.isString(identifier)) {
                return data.label.get(identifier) || data.identifier.get(identifier);
            }
            else {
                const key = TaskDefinition.createTaskIdentifier(identifier, console);
                return key !== undefined ? data.taskIdentifier.get(key._key) : undefined;
            }
        }
        return {
            resolve: async (uri, identifier) => {
                if (!identifier) {
                    return undefined;
                }
                if ((resolverData === undefined) && (grouped === undefined)) {
                    return (await quickResolve(this, uri, identifier)) ?? fullResolve(this, uri, identifier);
                }
                else {
                    return fullResolve(this, uri, identifier);
                }
            }
        };
    }
    async _saveBeforeRun() {
        let SaveBeforeRunConfigOptions;
        (function (SaveBeforeRunConfigOptions) {
            SaveBeforeRunConfigOptions["Always"] = "always";
            SaveBeforeRunConfigOptions["Never"] = "never";
            SaveBeforeRunConfigOptions["Prompt"] = "prompt";
        })(SaveBeforeRunConfigOptions || (SaveBeforeRunConfigOptions = {}));
        const saveBeforeRunTaskConfig = this._configurationService.getValue("task.saveBeforeRun" /* TaskSettingId.SaveBeforeRun */);
        if (saveBeforeRunTaskConfig === SaveBeforeRunConfigOptions.Never) {
            return false;
        }
        else if (saveBeforeRunTaskConfig === SaveBeforeRunConfigOptions.Prompt && this._editorService.editors.some(e => e.isDirty())) {
            const { confirmed } = await this._dialogService.confirm({
                message: nls.localize('TaskSystem.saveBeforeRun.prompt.title', "Save all editors?"),
                detail: nls.localize('detail', "Do you want to save all editors before running the task?"),
                primaryButton: nls.localize({ key: 'saveBeforeRun.save', comment: ['&& denotes a mnemonic'] }, '&&Save'),
                cancelButton: nls.localize({ key: 'saveBeforeRun.dontSave', comment: ['&& denotes a mnemonic'] }, "Do&&n't Save"),
            });
            if (!confirmed) {
                return false;
            }
        }
        await this._editorService.saveAll({ reason: 2 /* SaveReason.AUTO */ });
        return true;
    }
    async _executeTask(task, resolver, runSource) {
        let taskToRun = task;
        if (await this._saveBeforeRun()) {
            await this._configurationService.reloadConfiguration();
            await this._updateWorkspaceTasks();
            const taskFolder = task.getWorkspaceFolder();
            const taskIdentifier = task.configurationProperties.identifier;
            const taskType = CustomTask.is(task) ? task.customizes()?.type : (ContributedTask.is(task) ? task.type : undefined);
            // Since we save before running tasks, the task may have changed as part of the save.
            // However, if the TaskRunSource is not User, then we shouldn't try to fetch the task again
            // since this can cause a new'd task to get overwritten with a provided task.
            taskToRun = ((taskFolder && taskIdentifier && (runSource === 1 /* TaskRunSource.User */))
                ? await this.getTask(taskFolder, taskIdentifier, false, taskType) : task) ?? task;
        }
        await ProblemMatcherRegistry.onReady();
        const executeResult = runSource === 4 /* TaskRunSource.Reconnect */ ? this._getTaskSystem().reconnect(taskToRun, resolver) : this._getTaskSystem().run(taskToRun, resolver);
        if (executeResult) {
            return this._handleExecuteResult(executeResult, runSource);
        }
        return { exitCode: 0 };
    }
    async _handleExecuteResult(executeResult, runSource) {
        if (runSource === 1 /* TaskRunSource.User */) {
            await this._setRecentlyUsedTask(executeResult.task);
        }
        if (executeResult.kind === 2 /* TaskExecuteKind.Active */) {
            const active = executeResult.active;
            if (active && active.same && runSource === 2 /* TaskRunSource.FolderOpen */ || runSource === 4 /* TaskRunSource.Reconnect */) {
                // ignore, the task is already active, likely from being reconnected or from folder open.
                this._logService.debug('Ignoring task that is already active', executeResult.task);
                return executeResult.promise;
            }
            if (active && active.same) {
                if (this._taskSystem?.isTaskVisible(executeResult.task)) {
                    const message = nls.localize('TaskSystem.activeSame.noBackground', 'The task \'{0}\' is already active.', executeResult.task.getQualifiedLabel());
                    const lastInstance = this._getTaskSystem().getLastInstance(executeResult.task) ?? executeResult.task;
                    this._notificationService.prompt(Severity.Warning, message, [{
                            label: nls.localize('terminateTask', "Terminate Task"),
                            run: () => this.terminate(lastInstance)
                        },
                        {
                            label: nls.localize('restartTask', "Restart Task"),
                            run: () => this._restart(lastInstance)
                        }], { sticky: true });
                }
                else {
                    this._taskSystem?.revealTask(executeResult.task);
                }
            }
            else {
                throw new TaskError(Severity.Warning, nls.localize('TaskSystem.active', 'There is already a task running. Terminate it first before executing another task.'), 1 /* TaskErrors.RunningTask */);
            }
        }
        this._setRecentlyUsedTask(executeResult.task);
        return executeResult.promise;
    }
    async _restart(task) {
        if (!this._taskSystem) {
            return;
        }
        const response = await this._taskSystem.terminate(task);
        if (response.success) {
            try {
                await this.run(task);
            }
            catch {
                // eat the error, we don't care about it here
            }
        }
        else {
            this._notificationService.warn(nls.localize('TaskSystem.restartFailed', 'Failed to terminate and restart task {0}', Types.isString(task) ? task : task.configurationProperties.name));
        }
    }
    async terminate(task) {
        if (!(await this._trust())) {
            return { success: true, task: undefined };
        }
        if (!this._taskSystem) {
            return { success: true, task: undefined };
        }
        return this._taskSystem.terminate(task);
    }
    _terminateAll() {
        if (!this._taskSystem) {
            return Promise.resolve([]);
        }
        return this._taskSystem.terminateAll();
    }
    _createTerminalTaskSystem() {
        return new TerminalTaskSystem(this._terminalService, this._terminalGroupService, this._outputService, this._paneCompositeService, this._viewsService, this._markerService, this._modelService, this._configurationResolverService, this._contextService, this._environmentService, AbstractTaskService_1.OutputChannelId, this._fileService, this._terminalProfileResolverService, this._pathService, this._viewDescriptorService, this._logService, this._notificationService, this._contextKeyService, this._instantiationService, (workspaceFolder) => {
            if (workspaceFolder) {
                return this._getTaskSystemInfo(workspaceFolder.uri.scheme);
            }
            else if (this._taskSystemInfos.size > 0) {
                const infos = Array.from(this._taskSystemInfos.entries());
                const notFile = infos.filter(info => info[0] !== Schemas.file);
                if (notFile.length > 0) {
                    return notFile[0][1][0];
                }
                return infos[0][1][0];
            }
            else {
                return undefined;
            }
        });
    }
    _isTaskProviderEnabled(type) {
        const definition = TaskDefinitionRegistry.get(type);
        return !definition || !definition.when || this._contextKeyService.contextMatchesRules(definition.when);
    }
    async _getGroupedTasks(filter, waitToActivate, knownOnlyOrTrusted) {
        await this._waitForAllSupportedExecutions;
        const type = filter?.type;
        const needsRecentTasksMigration = this._needsRecentTasksMigration();
        if (!waitToActivate) {
            await this._activateTaskProviders(filter?.type);
        }
        const validTypes = Object.create(null);
        TaskDefinitionRegistry.all().forEach(definition => validTypes[definition.taskType] = true);
        validTypes['shell'] = true;
        validTypes['process'] = true;
        const contributedTaskSets = await new Promise(resolve => {
            const result = [];
            let counter = 0;
            const done = (value) => {
                if (value) {
                    result.push(value);
                }
                if (--counter === 0) {
                    resolve(result);
                }
            };
            const error = (error) => {
                try {
                    if (!isCancellationError(error)) {
                        if (error && Types.isString(error.message)) {
                            this._log(`Error: ${error.message}\n`);
                            this._showOutput();
                        }
                        else {
                            this._log('Unknown error received while collecting tasks from providers.');
                            this._showOutput();
                        }
                    }
                }
                finally {
                    if (--counter === 0) {
                        resolve(result);
                    }
                }
            };
            if (this._isProvideTasksEnabled() && (this.schemaVersion === 2 /* JsonSchemaVersion.V2_0_0 */) && (this._providers.size > 0)) {
                let foundAnyProviders = false;
                for (const [handle, provider] of this._providers) {
                    const providerType = this._providerTypes.get(handle);
                    if ((type === undefined) || (type === providerType)) {
                        if (providerType && !this._isTaskProviderEnabled(providerType)) {
                            continue;
                        }
                        foundAnyProviders = true;
                        counter++;
                        raceTimeout(provider.provideTasks(validTypes).then((taskSet) => {
                            // Check that the tasks provided are of the correct type
                            for (const task of taskSet.tasks) {
                                if (task.type !== this._providerTypes.get(handle)) {
                                    this._log(nls.localize('unexpectedTaskType', "The task provider for \"{0}\" tasks unexpectedly provided a task of type \"{1}\".\n", this._providerTypes.get(handle), task.type));
                                    if ((task.type !== 'shell') && (task.type !== 'process')) {
                                        this._showOutput();
                                    }
                                    break;
                                }
                            }
                            return done(taskSet);
                        }, error), 5000, () => {
                            // onTimeout
                            console.error('Timed out getting tasks from ', providerType);
                            done(undefined);
                        });
                    }
                }
                if (!foundAnyProviders) {
                    resolve(result);
                }
            }
            else {
                resolve(result);
            }
        });
        const result = new TaskMap();
        const contributedTasks = new TaskMap();
        for (const set of contributedTaskSets) {
            for (const task of set.tasks) {
                const workspaceFolder = task.getWorkspaceFolder();
                if (workspaceFolder) {
                    contributedTasks.add(workspaceFolder, task);
                }
            }
        }
        try {
            let tasks = [];
            // prevent workspace trust dialog from being shown in unexpected cases #224881
            if (!knownOnlyOrTrusted || this._workspaceTrustManagementService.isWorkspaceTrusted()) {
                tasks = Array.from(await this.getWorkspaceTasks());
            }
            await Promise.all(this._getCustomTaskPromises(tasks, filter, result, contributedTasks, waitToActivate));
            if (needsRecentTasksMigration) {
                // At this point we have all the tasks and can migrate the recently used tasks.
                await this._migrateRecentTasks(result.all());
            }
            return result;
        }
        catch {
            // If we can't read the tasks.json file provide at least the contributed tasks
            const result = new TaskMap();
            for (const set of contributedTaskSets) {
                for (const task of set.tasks) {
                    const folder = task.getWorkspaceFolder();
                    if (folder) {
                        result.add(folder, task);
                    }
                }
            }
            return result;
        }
    }
    _getCustomTaskPromises(customTasksKeyValuePairs, filter, result, contributedTasks, waitToActivate) {
        return customTasksKeyValuePairs.map(async ([key, folderTasks]) => {
            const contributed = contributedTasks.get(key);
            if (!folderTasks.set) {
                if (contributed) {
                    result.add(key, ...contributed);
                }
                return;
            }
            if (this._contextService.getWorkbenchState() === 1 /* WorkbenchState.EMPTY */) {
                result.add(key, ...folderTasks.set.tasks);
            }
            else {
                const configurations = folderTasks.configurations;
                const legacyTaskConfigurations = folderTasks.set ? this._getLegacyTaskConfigurations(folderTasks.set) : undefined;
                const customTasksToDelete = [];
                if (configurations || legacyTaskConfigurations) {
                    const unUsedConfigurations = new Set();
                    if (configurations) {
                        Object.keys(configurations.byIdentifier).forEach(key => unUsedConfigurations.add(key));
                    }
                    for (const task of contributed) {
                        if (!ContributedTask.is(task)) {
                            continue;
                        }
                        if (configurations) {
                            const configuringTask = configurations.byIdentifier[task.defines._key];
                            if (configuringTask) {
                                unUsedConfigurations.delete(task.defines._key);
                                result.add(key, TaskConfig.createCustomTask(task, configuringTask));
                            }
                            else {
                                result.add(key, task);
                            }
                        }
                        else if (legacyTaskConfigurations) {
                            const configuringTask = legacyTaskConfigurations[task.defines._key];
                            if (configuringTask) {
                                result.add(key, TaskConfig.createCustomTask(task, configuringTask));
                                customTasksToDelete.push(configuringTask);
                            }
                            else {
                                result.add(key, task);
                            }
                        }
                        else {
                            result.add(key, task);
                        }
                    }
                    if (customTasksToDelete.length > 0) {
                        const toDelete = customTasksToDelete.reduce((map, task) => {
                            map[task._id] = true;
                            return map;
                        }, Object.create(null));
                        for (const task of folderTasks.set.tasks) {
                            if (toDelete[task._id]) {
                                continue;
                            }
                            result.add(key, task);
                        }
                    }
                    else {
                        result.add(key, ...folderTasks.set.tasks);
                    }
                    const unUsedConfigurationsAsArray = Array.from(unUsedConfigurations);
                    const unUsedConfigurationPromises = unUsedConfigurationsAsArray.map(async (value) => {
                        const configuringTask = configurations.byIdentifier[value];
                        if (filter?.type && (filter.type !== configuringTask.configures.type)) {
                            return;
                        }
                        let requiredTaskProviderUnavailable = false;
                        for (const [handle, provider] of this._providers) {
                            const providerType = this._providerTypes.get(handle);
                            if (configuringTask.type === providerType) {
                                if (providerType && !this._isTaskProviderEnabled(providerType)) {
                                    requiredTaskProviderUnavailable = true;
                                    continue;
                                }
                                try {
                                    const resolvedTask = await provider.resolveTask(configuringTask);
                                    if (resolvedTask && (resolvedTask._id === configuringTask._id)) {
                                        result.add(key, TaskConfig.createCustomTask(resolvedTask, configuringTask));
                                        return;
                                    }
                                }
                                catch (error) {
                                    // Ignore errors. The task could not be provided by any of the providers.
                                }
                            }
                        }
                        if (requiredTaskProviderUnavailable) {
                            this._log(nls.localize('TaskService.providerUnavailable', 'Warning: {0} tasks are unavailable in the current environment.', configuringTask.configures.type));
                        }
                        else if (!waitToActivate) {
                            this._log(nls.localize('TaskService.noConfiguration', 'Error: The {0} task detection didn\'t contribute a task for the following configuration:\n{1}\nThe task will be ignored.', configuringTask.configures.type, JSON.stringify(configuringTask._source.config.element, undefined, 4)));
                            this._showOutput();
                        }
                    });
                    await Promise.all(unUsedConfigurationPromises);
                }
                else {
                    result.add(key, ...folderTasks.set.tasks);
                    result.add(key, ...contributed);
                }
            }
        });
    }
    _getLegacyTaskConfigurations(workspaceTasks) {
        let result;
        function getResult() {
            if (result) {
                return result;
            }
            result = Object.create(null);
            return result;
        }
        for (const task of workspaceTasks.tasks) {
            if (CustomTask.is(task)) {
                const commandName = task.command && task.command.name;
                // This is for backwards compatibility with the 0.1.0 task annotation code
                // if we had a gulp, jake or grunt command a task specification was a annotation
                if (commandName === 'gulp' || commandName === 'grunt' || commandName === 'jake') {
                    const identifier = KeyedTaskIdentifier.create({
                        type: commandName,
                        task: task.configurationProperties.name
                    });
                    getResult()[identifier._key] = task;
                }
            }
        }
        return result;
    }
    async getWorkspaceTasks(runSource = 1 /* TaskRunSource.User */) {
        if (!(await this._trust())) {
            return new Map();
        }
        await raceTimeout(this._waitForAllSupportedExecutions, 2000, () => {
            this._logService.warn('Timed out waiting for all supported executions');
        });
        await this._whenTaskSystemReady;
        if (this._workspaceTasksPromise) {
            return this._workspaceTasksPromise;
        }
        return this._updateWorkspaceTasks(runSource);
    }
    _updateWorkspaceTasks(runSource = 1 /* TaskRunSource.User */) {
        this._workspaceTasksPromise = this._computeWorkspaceTasks(runSource);
        return this._workspaceTasksPromise;
    }
    async _getAFolder() {
        let folder = this.workspaceFolders.length > 0 ? this.workspaceFolders[0] : undefined;
        if (!folder) {
            const userhome = await this._pathService.userHome();
            folder = new WorkspaceFolder({ uri: userhome, name: resources.basename(userhome), index: 0 });
        }
        return folder;
    }
    async _computeWorkspaceTasks(runSource = 1 /* TaskRunSource.User */) {
        const promises = [];
        for (const folder of this.workspaceFolders) {
            promises.push(this._computeWorkspaceFolderTasks(folder, runSource));
        }
        const values = await Promise.all(promises);
        const result = new Map();
        for (const value of values) {
            if (value) {
                result.set(value.workspaceFolder.uri.toString(), value);
            }
        }
        const folder = await this._getAFolder();
        if (this._contextService.getWorkbenchState() !== 1 /* WorkbenchState.EMPTY */) {
            const workspaceFileTasks = await this._computeWorkspaceFileTasks(folder, runSource);
            if (workspaceFileTasks && this._workspace && this._workspace.configuration) {
                result.set(this._workspace.configuration.toString(), workspaceFileTasks);
            }
        }
        const userTasks = await this._computeUserTasks(folder, runSource);
        if (userTasks) {
            result.set(USER_TASKS_GROUP_KEY, userTasks);
        }
        return result;
    }
    get _jsonTasksSupported() {
        return ShellExecutionSupportedContext.getValue(this._contextKeyService) === true && ProcessExecutionSupportedContext.getValue(this._contextKeyService) === true;
    }
    async _computeWorkspaceFolderTasks(workspaceFolder, runSource = 1 /* TaskRunSource.User */) {
        const workspaceFolderConfiguration = (this._executionEngine === ExecutionEngine.Process ? await this._computeLegacyConfiguration(workspaceFolder) : await this._computeConfiguration(workspaceFolder));
        if (!workspaceFolderConfiguration || !workspaceFolderConfiguration.config || workspaceFolderConfiguration.hasErrors) {
            return Promise.resolve({ workspaceFolder, set: undefined, configurations: undefined, hasErrors: workspaceFolderConfiguration ? workspaceFolderConfiguration.hasErrors : false });
        }
        await ProblemMatcherRegistry.onReady();
        const taskSystemInfo = this._getTaskSystemInfo(workspaceFolder.uri.scheme);
        const problemReporter = new ProblemReporter(this._outputChannel);
        const parseResult = TaskConfig.parse(workspaceFolder, undefined, taskSystemInfo ? taskSystemInfo.platform : Platform.platform, workspaceFolderConfiguration.config, problemReporter, TaskConfig.TaskConfigSource.TasksJson, this._contextKeyService);
        let hasErrors = false;
        if (!parseResult.validationStatus.isOK() && (parseResult.validationStatus.state !== 1 /* ValidationState.Info */)) {
            hasErrors = true;
            this._showOutput(runSource);
        }
        if (problemReporter.status.isFatal()) {
            problemReporter.fatal(nls.localize('TaskSystem.configurationErrors', 'Error: the provided task configuration has validation errors and can\'t not be used. Please correct the errors first.'));
            return { workspaceFolder, set: undefined, configurations: undefined, hasErrors };
        }
        let customizedTasks;
        if (parseResult.configured && parseResult.configured.length > 0) {
            customizedTasks = {
                byIdentifier: Object.create(null)
            };
            for (const task of parseResult.configured) {
                customizedTasks.byIdentifier[task.configures._key] = task;
            }
        }
        if (!this._jsonTasksSupported && (parseResult.custom.length > 0)) {
            console.warn('Custom workspace tasks are not supported.');
        }
        return { workspaceFolder, set: { tasks: this._jsonTasksSupported ? parseResult.custom : [] }, configurations: customizedTasks, hasErrors };
    }
    _testParseExternalConfig(config, location) {
        if (!config) {
            return { config: undefined, hasParseErrors: false };
        }
        const parseErrors = config.$parseErrors;
        if (parseErrors) {
            let isAffected = false;
            for (const parseError of parseErrors) {
                if (/tasks\.json$/.test(parseError)) {
                    isAffected = true;
                    break;
                }
            }
            if (isAffected) {
                this._log(nls.localize({ key: 'TaskSystem.invalidTaskJsonOther', comment: ['Message notifies of an error in one of several places there is tasks related json, not necessarily in a file named tasks.json'] }, 'Error: The content of the tasks json in {0} has syntax errors. Please correct them before executing a task.', location));
                this._showOutput();
                return { config, hasParseErrors: true };
            }
        }
        return { config, hasParseErrors: false };
    }
    _log(value, verbose) {
        if (!verbose || this._configurationService.getValue("task.verboseLogging" /* TaskSettingId.VerboseLogging */)) {
            this._outputChannel.append(value + '\n');
        }
    }
    async _computeWorkspaceFileTasks(workspaceFolder, runSource = 1 /* TaskRunSource.User */) {
        if (this._executionEngine === ExecutionEngine.Process) {
            return this._emptyWorkspaceTaskResults(workspaceFolder);
        }
        const workspaceFileConfig = this._getConfiguration(workspaceFolder, TaskSourceKind.WorkspaceFile);
        const configuration = this._testParseExternalConfig(workspaceFileConfig.config, nls.localize('TasksSystem.locationWorkspaceConfig', 'workspace file'));
        const customizedTasks = {
            byIdentifier: Object.create(null)
        };
        const custom = [];
        await this._computeTasksForSingleConfig(workspaceFolder, configuration.config, runSource, custom, customizedTasks.byIdentifier, TaskConfig.TaskConfigSource.WorkspaceFile);
        const engine = configuration.config ? TaskConfig.ExecutionEngine.from(configuration.config) : ExecutionEngine.Terminal;
        if (engine === ExecutionEngine.Process) {
            this._notificationService.warn(nls.localize('TaskSystem.versionWorkspaceFile', 'Only tasks version 2.0.0 permitted in workspace configuration files.'));
            return this._emptyWorkspaceTaskResults(workspaceFolder);
        }
        return { workspaceFolder, set: { tasks: custom }, configurations: customizedTasks, hasErrors: configuration.hasParseErrors };
    }
    async _computeUserTasks(workspaceFolder, runSource = 1 /* TaskRunSource.User */) {
        if (this._executionEngine === ExecutionEngine.Process) {
            return this._emptyWorkspaceTaskResults(workspaceFolder);
        }
        const userTasksConfig = this._getConfiguration(workspaceFolder, TaskSourceKind.User);
        const configuration = this._testParseExternalConfig(userTasksConfig.config, nls.localize('TasksSystem.locationUserConfig', 'user settings'));
        const customizedTasks = {
            byIdentifier: Object.create(null)
        };
        const custom = [];
        await this._computeTasksForSingleConfig(workspaceFolder, configuration.config, runSource, custom, customizedTasks.byIdentifier, TaskConfig.TaskConfigSource.User);
        const engine = configuration.config ? TaskConfig.ExecutionEngine.from(configuration.config) : ExecutionEngine.Terminal;
        if (engine === ExecutionEngine.Process) {
            this._notificationService.warn(nls.localize('TaskSystem.versionSettings', 'Only tasks version 2.0.0 permitted in user settings.'));
            return this._emptyWorkspaceTaskResults(workspaceFolder);
        }
        return { workspaceFolder, set: { tasks: custom }, configurations: customizedTasks, hasErrors: configuration.hasParseErrors };
    }
    _emptyWorkspaceTaskResults(workspaceFolder) {
        return { workspaceFolder, set: undefined, configurations: undefined, hasErrors: false };
    }
    async _computeTasksForSingleConfig(workspaceFolder, config, runSource, custom, customized, source, isRecentTask = false) {
        if (!config) {
            return false;
        }
        else if (!workspaceFolder) {
            this._logService.trace('TaskService.computeTasksForSingleConfig: no workspace folder for worskspace', this._workspace?.id);
            return false;
        }
        const taskSystemInfo = this._getTaskSystemInfo(workspaceFolder.uri.scheme);
        const problemReporter = new ProblemReporter(this._outputChannel);
        const parseResult = TaskConfig.parse(workspaceFolder, this._workspace, taskSystemInfo ? taskSystemInfo.platform : Platform.platform, config, problemReporter, source, this._contextKeyService, isRecentTask);
        let hasErrors = false;
        if (!parseResult.validationStatus.isOK() && (parseResult.validationStatus.state !== 1 /* ValidationState.Info */)) {
            this._showOutput(runSource);
            hasErrors = true;
        }
        if (problemReporter.status.isFatal()) {
            problemReporter.fatal(nls.localize('TaskSystem.configurationErrors', 'Error: the provided task configuration has validation errors and can\'t not be used. Please correct the errors first.'));
            return hasErrors;
        }
        if (parseResult.configured && parseResult.configured.length > 0) {
            for (const task of parseResult.configured) {
                customized[task.configures._key] = task;
            }
        }
        if (!this._jsonTasksSupported && (parseResult.custom.length > 0)) {
            console.warn('Custom workspace tasks are not supported.');
        }
        else {
            for (const task of parseResult.custom) {
                custom.push(task);
            }
        }
        return hasErrors;
    }
    _computeConfiguration(workspaceFolder) {
        const { config, hasParseErrors } = this._getConfiguration(workspaceFolder);
        return Promise.resolve({ workspaceFolder, config, hasErrors: hasParseErrors });
    }
    _computeWorkspaceFolderSetup() {
        const workspaceFolders = [];
        const ignoredWorkspaceFolders = [];
        let executionEngine = ExecutionEngine.Terminal;
        let schemaVersion = 2 /* JsonSchemaVersion.V2_0_0 */;
        let workspace;
        if (this._contextService.getWorkbenchState() === 2 /* WorkbenchState.FOLDER */) {
            const workspaceFolder = this._contextService.getWorkspace().folders[0];
            workspaceFolders.push(workspaceFolder);
            executionEngine = this._computeExecutionEngine(workspaceFolder);
            schemaVersion = this._computeJsonSchemaVersion(workspaceFolder);
        }
        else if (this._contextService.getWorkbenchState() === 3 /* WorkbenchState.WORKSPACE */) {
            workspace = this._contextService.getWorkspace();
            for (const workspaceFolder of this._contextService.getWorkspace().folders) {
                if (schemaVersion === this._computeJsonSchemaVersion(workspaceFolder)) {
                    workspaceFolders.push(workspaceFolder);
                }
                else {
                    ignoredWorkspaceFolders.push(workspaceFolder);
                    this._log(nls.localize('taskService.ignoringFolder', 'Ignoring task configurations for workspace folder {0}. Multi folder workspace task support requires that all folders use task version 2.0.0', workspaceFolder.uri.fsPath));
                }
            }
        }
        return [workspaceFolders, ignoredWorkspaceFolders, executionEngine, schemaVersion, workspace];
    }
    _computeExecutionEngine(workspaceFolder) {
        const { config } = this._getConfiguration(workspaceFolder);
        if (!config) {
            return ExecutionEngine._default;
        }
        return TaskConfig.ExecutionEngine.from(config);
    }
    _computeJsonSchemaVersion(workspaceFolder) {
        const { config } = this._getConfiguration(workspaceFolder);
        if (!config) {
            return 2 /* JsonSchemaVersion.V2_0_0 */;
        }
        return TaskConfig.JsonSchemaVersion.from(config);
    }
    _getConfiguration(workspaceFolder, source) {
        let result;
        if ((source !== TaskSourceKind.User) && (this._contextService.getWorkbenchState() === 1 /* WorkbenchState.EMPTY */)) {
            result = undefined;
        }
        else {
            const wholeConfig = this._configurationService.inspect('tasks', { resource: workspaceFolder.uri });
            switch (source) {
                case TaskSourceKind.User: {
                    if (wholeConfig.userValue !== wholeConfig.workspaceFolderValue) {
                        result = Objects.deepClone(wholeConfig.userValue);
                    }
                    break;
                }
                case TaskSourceKind.Workspace:
                    result = Objects.deepClone(wholeConfig.workspaceFolderValue);
                    break;
                case TaskSourceKind.WorkspaceFile: {
                    if ((this._contextService.getWorkbenchState() === 3 /* WorkbenchState.WORKSPACE */)
                        && (wholeConfig.workspaceFolderValue !== wholeConfig.workspaceValue)) {
                        result = Objects.deepClone(wholeConfig.workspaceValue);
                    }
                    break;
                }
                default: result = Objects.deepClone(wholeConfig.workspaceFolderValue);
            }
        }
        if (!result) {
            return { config: undefined, hasParseErrors: false };
        }
        const parseErrors = result.$parseErrors;
        if (parseErrors) {
            let isAffected = false;
            for (const parseError of parseErrors) {
                if (/tasks\.json$/.test(parseError)) {
                    isAffected = true;
                    break;
                }
            }
            if (isAffected) {
                this._log(nls.localize('TaskSystem.invalidTaskJson', 'Error: The content of the tasks.json file has syntax errors. Please correct them before executing a task.'));
                this._showOutput();
                return { config: undefined, hasParseErrors: true };
            }
        }
        return { config: result, hasParseErrors: false };
    }
    inTerminal() {
        if (this._taskSystem) {
            return this._taskSystem instanceof TerminalTaskSystem;
        }
        return this._executionEngine === ExecutionEngine.Terminal;
    }
    configureAction() {
        const thisCapture = this;
        return new class extends Action {
            constructor() {
                super(ConfigureTaskAction.ID, ConfigureTaskAction.TEXT.value, undefined, true, () => { thisCapture._runConfigureTasks(); return Promise.resolve(undefined); });
            }
        };
    }
    _handleError(err) {
        let showOutput = true;
        if (err instanceof TaskError) {
            const buildError = err;
            const needsConfig = buildError.code === 0 /* TaskErrors.NotConfigured */ || buildError.code === 2 /* TaskErrors.NoBuildTask */ || buildError.code === 3 /* TaskErrors.NoTestTask */;
            const needsTerminate = buildError.code === 1 /* TaskErrors.RunningTask */;
            if (needsConfig || needsTerminate) {
                this._notificationService.prompt(buildError.severity, buildError.message, [{
                        label: needsConfig ? ConfigureTaskAction.TEXT.value : nls.localize('TerminateAction.label', "Terminate Task"),
                        run: () => {
                            if (needsConfig) {
                                this._runConfigureTasks();
                            }
                            else {
                                this._runTerminateCommand();
                            }
                        }
                    }]);
            }
            else {
                this._notificationService.notify({ severity: buildError.severity, message: buildError.message });
            }
        }
        else if (err instanceof Error) {
            const error = err;
            this._notificationService.error(error.message);
            showOutput = false;
        }
        else if (Types.isString(err)) {
            this._notificationService.error(err);
        }
        else {
            this._notificationService.error(nls.localize('TaskSystem.unknownError', 'An error has occurred while running a task. See task log for details.'));
        }
        if (showOutput) {
            this._showOutput();
        }
    }
    _showDetail() {
        return this._configurationService.getValue(QUICKOPEN_DETAIL_CONFIG);
    }
    async _createTaskQuickPickEntries(tasks, group = false, sort = false, selectedEntry, includeRecents = true) {
        let encounteredTasks = {};
        if (tasks === undefined || tasks === null || tasks.length === 0) {
            return [];
        }
        const TaskQuickPickEntry = (task) => {
            const newEntry = { label: task._label, description: this.getTaskDescription(task), task, detail: this._showDetail() ? task.configurationProperties.detail : undefined };
            if (encounteredTasks[task._id]) {
                if (encounteredTasks[task._id].length === 1) {
                    encounteredTasks[task._id][0].label += ' (1)';
                }
                newEntry.label = newEntry.label + ' (' + (encounteredTasks[task._id].length + 1).toString() + ')';
            }
            else {
                encounteredTasks[task._id] = [];
            }
            encounteredTasks[task._id].push(newEntry);
            return newEntry;
        };
        function fillEntries(entries, tasks, groupLabel) {
            if (tasks.length) {
                entries.push({ type: 'separator', label: groupLabel });
            }
            for (const task of tasks) {
                const entry = TaskQuickPickEntry(task);
                entry.buttons = [{ iconClass: ThemeIcon.asClassName(configureTaskIcon), tooltip: nls.localize('configureTask', "Configure Task") }];
                if (selectedEntry && (task === selectedEntry.task)) {
                    entries.unshift(selectedEntry);
                }
                else {
                    entries.push(entry);
                }
            }
        }
        let entries;
        if (group) {
            entries = [];
            if (tasks.length === 1) {
                entries.push(TaskQuickPickEntry(tasks[0]));
            }
            else {
                const recentlyUsedTasks = await this.getSavedTasks('historical');
                const recent = [];
                const recentSet = new Set();
                let configured = [];
                let detected = [];
                const taskMap = Object.create(null);
                tasks.forEach(task => {
                    const key = task.getCommonTaskId();
                    if (key) {
                        taskMap[key] = task;
                    }
                });
                recentlyUsedTasks.reverse().forEach(recentTask => {
                    const key = recentTask.getCommonTaskId();
                    if (key) {
                        recentSet.add(key);
                        const task = taskMap[key];
                        if (task) {
                            recent.push(task);
                        }
                    }
                });
                for (const task of tasks) {
                    const key = task.getCommonTaskId();
                    if (!key || !recentSet.has(key)) {
                        if ((task._source.kind === TaskSourceKind.Workspace) || (task._source.kind === TaskSourceKind.User)) {
                            configured.push(task);
                        }
                        else {
                            detected.push(task);
                        }
                    }
                }
                const sorter = this.createSorter();
                if (includeRecents) {
                    fillEntries(entries, recent, nls.localize('recentlyUsed', 'recently used tasks'));
                }
                configured = configured.sort((a, b) => sorter.compare(a, b));
                fillEntries(entries, configured, nls.localize('configured', 'configured tasks'));
                detected = detected.sort((a, b) => sorter.compare(a, b));
                fillEntries(entries, detected, nls.localize('detected', 'detected tasks'));
            }
        }
        else {
            if (sort) {
                const sorter = this.createSorter();
                tasks = tasks.sort((a, b) => sorter.compare(a, b));
            }
            entries = tasks.map(task => TaskQuickPickEntry(task));
        }
        encounteredTasks = {};
        return entries;
    }
    async _showTwoLevelQuickPick(placeHolder, defaultEntry, type, name) {
        return this._instantiationService.createInstance(TaskQuickPick).show(placeHolder, defaultEntry, type, name);
    }
    async _showQuickPick(tasks, placeHolder, defaultEntry, group = false, sort = false, selectedEntry, additionalEntries, name) {
        const resolvedTasks = await tasks;
        const entries = await raceTimeout(this._createTaskQuickPickEntries(resolvedTasks, group, sort, selectedEntry), 200, () => undefined);
        if (!entries) {
            return undefined;
        }
        if (entries.length === 1 && this._configurationService.getValue(QUICKOPEN_SKIP_CONFIG)) {
            return entries[0];
        }
        else if ((entries.length === 0) && defaultEntry) {
            entries.push(defaultEntry);
        }
        else if (entries.length > 1 && additionalEntries && additionalEntries.length > 0) {
            entries.push({ type: 'separator', label: '' });
            entries.push(additionalEntries[0]);
        }
        return this._quickInputService.pick(entries, {
            value: name,
            placeHolder,
            matchOnDescription: true,
            onDidTriggerItemButton: context => {
                const task = context.item.task;
                this._quickInputService.cancel();
                if (ContributedTask.is(task)) {
                    this.customize(task, undefined, true);
                }
                else if (CustomTask.is(task)) {
                    this.openConfig(task);
                }
            },
        });
    }
    _needsRecentTasksMigration() {
        return (this.getRecentlyUsedTasksV1().size > 0) && (this._getTasksFromStorage('historical').size === 0);
    }
    async _migrateRecentTasks(tasks) {
        if (!this._needsRecentTasksMigration()) {
            return;
        }
        const recentlyUsedTasks = this.getRecentlyUsedTasksV1();
        const taskMap = Object.create(null);
        tasks.forEach(task => {
            const key = task.getKey();
            if (key) {
                taskMap[key] = task;
            }
        });
        const reversed = [...recentlyUsedTasks.keys()].reverse();
        for (const key in reversed) {
            const task = taskMap[key];
            if (task) {
                await this._setRecentlyUsedTask(task);
            }
        }
        this._storageService.remove(AbstractTaskService_1.RecentlyUsedTasks_Key, 1 /* StorageScope.WORKSPACE */);
    }
    _showIgnoredFoldersMessage() {
        if (this.ignoredWorkspaceFolders.length === 0 || !this.showIgnoreMessage) {
            return Promise.resolve(undefined);
        }
        this._notificationService.prompt(Severity.Info, nls.localize('TaskService.ignoredFolder', 'The following workspace folders are ignored since they use task version 0.1.0: {0}', this.ignoredWorkspaceFolders.map(f => f.name).join(', ')), [{
                label: nls.localize('TaskService.notAgain', "Don't Show Again"),
                isSecondary: true,
                run: () => {
                    this._storageService.store(AbstractTaskService_1.IgnoreTask010DonotShowAgain_key, true, 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
                    this._showIgnoreMessage = false;
                }
            }]);
        return Promise.resolve(undefined);
    }
    async _trust() {
        if (ServerlessWebContext && !TaskExecutionSupportedContext) {
            return false;
        }
        await this._workspaceTrustManagementService.workspaceTrustInitialized;
        if (!this._workspaceTrustManagementService.isWorkspaceTrusted()) {
            return (await this._workspaceTrustRequestService.requestWorkspaceTrust({
                message: nls.localize('TaskService.requestTrust', "Listing and running tasks requires that some of the files in this workspace be executed as code.")
            })) === true;
        }
        return true;
    }
    async _runTaskCommand(filter) {
        if (!this._tasksReconnected) {
            return;
        }
        if (!filter) {
            return this._doRunTaskCommand();
        }
        const type = typeof filter === 'string' ? undefined : filter.type;
        const taskName = typeof filter === 'string' ? filter : filter.task;
        const grouped = await this._getGroupedTasks({ type });
        const identifier = this._getTaskIdentifier(filter);
        const tasks = grouped.all();
        const resolver = this._createResolver(grouped);
        const folderURIs = this._contextService.getWorkspace().folders.map(folder => folder.uri);
        if (this._contextService.getWorkbenchState() === 3 /* WorkbenchState.WORKSPACE */) {
            folderURIs.push(this._contextService.getWorkspace().configuration);
        }
        folderURIs.push(USER_TASKS_GROUP_KEY);
        if (identifier) {
            for (const uri of folderURIs) {
                const task = await resolver.resolve(uri, identifier);
                if (task) {
                    this.run(task);
                    return;
                }
            }
        }
        const exactMatchTask = !taskName ? undefined : tasks.find(t => t.configurationProperties.identifier === taskName || t.getDefinition(true)?.configurationProperties?.identifier === taskName);
        if (!exactMatchTask) {
            return this._doRunTaskCommand(tasks, type, taskName);
        }
        for (const uri of folderURIs) {
            const task = await resolver.resolve(uri, taskName);
            if (task) {
                await this.run(task, { attachProblemMatcher: true }, 1 /* TaskRunSource.User */);
                return;
            }
        }
    }
    _tasksAndGroupedTasks(filter) {
        if (!this._versionAndEngineCompatible(filter)) {
            return { tasks: Promise.resolve([]), grouped: Promise.resolve(new TaskMap()) };
        }
        const grouped = this._getGroupedTasks(filter);
        const tasks = grouped.then((map) => {
            if (!filter || !filter.type) {
                return map.all();
            }
            const result = [];
            map.forEach((tasks) => {
                for (const task of tasks) {
                    if (ContributedTask.is(task) && task.defines.type === filter.type) {
                        result.push(task);
                    }
                    else if (CustomTask.is(task)) {
                        if (task.type === filter.type) {
                            result.push(task);
                        }
                        else {
                            const customizes = task.customizes();
                            if (customizes && customizes.type === filter.type) {
                                result.push(task);
                            }
                        }
                    }
                }
            });
            return result;
        });
        return { tasks, grouped };
    }
    _doRunTaskCommand(tasks, type, name) {
        const pickThen = (task) => {
            if (task === undefined) {
                return;
            }
            if (task === null) {
                this._runConfigureTasks();
            }
            else {
                this.run(task, { attachProblemMatcher: true }, 1 /* TaskRunSource.User */).then(undefined, reason => {
                    // eat the error, it has already been surfaced to the user and we don't care about it here
                });
            }
        };
        const placeholder = nls.localize('TaskService.pickRunTask', 'Select the task to run');
        this._showIgnoredFoldersMessage().then(() => {
            if (this._configurationService.getValue(USE_SLOW_PICKER)) {
                let taskResult = undefined;
                if (!tasks) {
                    taskResult = this._tasksAndGroupedTasks();
                }
                this._showQuickPick(tasks ? tasks : taskResult.tasks, placeholder, {
                    label: '$(plus) ' + nls.localize('TaskService.noEntryToRun', 'Configure a Task'),
                    task: null
                }, true, undefined, undefined, undefined, name).
                    then((entry) => {
                    return pickThen(entry ? entry.task : undefined);
                });
            }
            else {
                this._showTwoLevelQuickPick(placeholder, {
                    label: '$(plus) ' + nls.localize('TaskService.noEntryToRun', 'Configure a Task'),
                    task: null
                }, type, name).
                    then(pickThen);
            }
        });
    }
    rerun(terminalInstanceId) {
        const task = this._taskSystem?.getTaskForTerminal(terminalInstanceId);
        if (task) {
            this._restart(task);
        }
        else {
            this._reRunTaskCommand(true);
        }
    }
    _reRunTaskCommand(onlyRerun) {
        ProblemMatcherRegistry.onReady().then(() => {
            return this._editorService.saveAll({ reason: 2 /* SaveReason.AUTO */ }).then(() => {
                const executeResult = this._getTaskSystem().rerun();
                if (executeResult) {
                    return this._handleExecuteResult(executeResult);
                }
                else {
                    if (!onlyRerun && !this._taskRunningState.get()) {
                        // No task running, prompt to ask which to run
                        this._doRunTaskCommand();
                    }
                    return Promise.resolve(undefined);
                }
            });
        });
    }
    /**
     *
     * @param tasks - The tasks which need to be filtered
     * @param tasksInList - This tells splitPerGroupType to filter out globbed tasks (into defaults)
     * @returns
     */
    _getDefaultTasks(tasks, taskGlobsInList = false) {
        const defaults = [];
        for (const task of tasks.filter(t => !!t.configurationProperties.group)) {
            // At this point (assuming taskGlobsInList is true) there are tasks with matching globs, so only put those in defaults
            if (taskGlobsInList && typeof task.configurationProperties.group.isDefault === 'string') {
                defaults.push(task);
            }
            else if (!taskGlobsInList && task.configurationProperties.group.isDefault === true) {
                defaults.push(task);
            }
        }
        return defaults;
    }
    _runTaskGroupCommand(taskGroup, strings, configure, legacyCommand) {
        if (this.schemaVersion === 1 /* JsonSchemaVersion.V0_1_0 */) {
            legacyCommand();
            return;
        }
        const options = {
            location: 10 /* ProgressLocation.Window */,
            title: strings.fetching
        };
        const promise = (async () => {
            async function runSingleTask(task, problemMatcherOptions, that) {
                that.run(task, problemMatcherOptions, 1 /* TaskRunSource.User */).then(undefined, reason => {
                    // eat the error, it has already been surfaced to the user and we don't care about it here
                });
            }
            const chooseAndRunTask = (tasks) => {
                this._showIgnoredFoldersMessage().then(() => {
                    this._showQuickPick(tasks, strings.select, {
                        label: strings.notFoundConfigure,
                        task: null
                    }, true).then((entry) => {
                        const task = entry ? entry.task : undefined;
                        if (task === undefined) {
                            return;
                        }
                        if (task === null) {
                            configure.apply(this);
                            return;
                        }
                        runSingleTask(task, { attachProblemMatcher: true }, this);
                    });
                });
            };
            let groupTasks = [];
            const { globGroupTasks, globTasksDetected } = await this._getGlobTasks(taskGroup._id);
            groupTasks = [...globGroupTasks];
            if (!globTasksDetected && groupTasks.length === 0) {
                groupTasks = await this._findWorkspaceTasksInGroup(taskGroup, true);
            }
            const handleMultipleTasks = (areGlobTasks) => {
                return this._getTasksForGroup(taskGroup).then((tasks) => {
                    if (tasks.length > 0) {
                        // If we're dealing with tasks that were chosen because of a glob match,
                        // then put globs in the defaults and everything else in none
                        const defaults = this._getDefaultTasks(tasks, areGlobTasks);
                        if (defaults.length === 1) {
                            runSingleTask(defaults[0], undefined, this);
                            return;
                        }
                        else if (defaults.length > 0) {
                            tasks = defaults;
                        }
                    }
                    // At this this point there are multiple tasks.
                    chooseAndRunTask(tasks);
                });
            };
            const resolveTaskAndRun = (taskGroupTask) => {
                if (ConfiguringTask.is(taskGroupTask)) {
                    this.tryResolveTask(taskGroupTask).then(resolvedTask => {
                        runSingleTask(resolvedTask, undefined, this);
                    });
                }
                else {
                    runSingleTask(taskGroupTask, undefined, this);
                }
            };
            // A single default glob task was returned, just run it directly
            if (groupTasks.length === 1) {
                return resolveTaskAndRun(groupTasks[0]);
            }
            // If there's multiple globs that match we want to show the quick picker for those tasks
            // We will need to call splitPerGroupType putting globs in defaults and the remaining tasks in none.
            // We don't need to carry on after here
            if (globTasksDetected && groupTasks.length > 1) {
                return handleMultipleTasks(true);
            }
            // If no globs are found or matched fallback to checking for default tasks of the task group
            if (!groupTasks.length) {
                groupTasks = await this._findWorkspaceTasksInGroup(taskGroup, true);
            }
            if (groupTasks.length === 1) {
                // A single default task was returned, just run it directly
                return resolveTaskAndRun(groupTasks[0]);
            }
            // Multiple default tasks returned, show the quickPicker
            return handleMultipleTasks(false);
        })();
        this._progressService.withProgress(options, () => promise);
    }
    async _getGlobTasks(taskGroupId) {
        let globTasksDetected = false;
        // First check for globs before checking for the default tasks of the task group
        const absoluteURI = EditorResourceAccessor.getOriginalUri(this._editorService.activeEditor);
        if (absoluteURI) {
            const workspaceFolder = this._contextService.getWorkspaceFolder(absoluteURI);
            if (workspaceFolder) {
                const configuredTasks = this._getConfiguration(workspaceFolder)?.config?.tasks;
                if (configuredTasks) {
                    globTasksDetected = configuredTasks.filter(task => task.group && typeof task.group !== 'string' && typeof task.group.isDefault === 'string').length > 0;
                    // This will activate extensions, so only do so if necessary #185960
                    if (globTasksDetected) {
                        // Fallback to absolute path of the file if it is not in a workspace or relative path cannot be found
                        const relativePath = workspaceFolder?.uri ? (resources.relativePath(workspaceFolder.uri, absoluteURI) ?? absoluteURI.path) : absoluteURI.path;
                        const globGroupTasks = await this._findWorkspaceTasks((task) => {
                            const currentTaskGroup = task.configurationProperties.group;
                            if (currentTaskGroup && typeof currentTaskGroup !== 'string' && typeof currentTaskGroup.isDefault === 'string') {
                                return (currentTaskGroup._id === taskGroupId && glob.match(currentTaskGroup.isDefault, relativePath));
                            }
                            globTasksDetected = false;
                            return false;
                        });
                        return { globGroupTasks, globTasksDetected };
                    }
                }
            }
        }
        return { globGroupTasks: [], globTasksDetected };
    }
    _runBuildCommand() {
        if (!this._tasksReconnected) {
            return;
        }
        return this._runTaskGroupCommand(TaskGroup.Build, {
            fetching: nls.localize('TaskService.fetchingBuildTasks', 'Fetching build tasks...'),
            select: nls.localize('TaskService.pickBuildTask', 'Select the build task to run'),
            notFoundConfigure: nls.localize('TaskService.noBuildTask', 'No build task to run found. Configure Build Task...')
        }, this._runConfigureDefaultBuildTask, this._build);
    }
    _runTestCommand() {
        return this._runTaskGroupCommand(TaskGroup.Test, {
            fetching: nls.localize('TaskService.fetchingTestTasks', 'Fetching test tasks...'),
            select: nls.localize('TaskService.pickTestTask', 'Select the test task to run'),
            notFoundConfigure: nls.localize('TaskService.noTestTaskTerminal', 'No test task to run found. Configure Tasks...')
        }, this._runConfigureDefaultTestTask, this._runTest);
    }
    _runTerminateCommand(arg) {
        if (arg === 'terminateAll') {
            this._terminateAll();
            return;
        }
        const runQuickPick = (promise) => {
            this._showQuickPick(promise || this.getActiveTasks(), nls.localize('TaskService.taskToTerminate', 'Select a task to terminate'), {
                label: nls.localize('TaskService.noTaskRunning', 'No task is currently running'),
                task: undefined
            }, false, true, undefined, [{
                    label: nls.localize('TaskService.terminateAllRunningTasks', 'All Running Tasks'),
                    id: 'terminateAll',
                    task: undefined
                }]).then(entry => {
                if (entry && entry.id === 'terminateAll') {
                    this._terminateAll();
                }
                const task = entry ? entry.task : undefined;
                if (task === undefined || task === null) {
                    return;
                }
                this.terminate(task);
            });
        };
        if (this.inTerminal()) {
            const identifier = this._getTaskIdentifier(arg);
            let promise;
            if (identifier !== undefined) {
                promise = this.getActiveTasks();
                promise.then((tasks) => {
                    for (const task of tasks) {
                        if (task.matches(identifier)) {
                            this.terminate(task);
                            return;
                        }
                    }
                    runQuickPick(promise);
                });
            }
            else {
                runQuickPick();
            }
        }
        else {
            this._isActive().then((active) => {
                if (active) {
                    this._terminateAll().then((responses) => {
                        // the output runner has only one task
                        const response = responses[0];
                        if (response.success) {
                            return;
                        }
                        if (response.code && response.code === 3 /* TerminateResponseCode.ProcessNotFound */) {
                            this._notificationService.error(nls.localize('TerminateAction.noProcess', 'The launched process doesn\'t exist anymore. If the task spawned background tasks exiting VS Code might result in orphaned processes.'));
                        }
                        else {
                            this._notificationService.error(nls.localize('TerminateAction.failed', 'Failed to terminate running task'));
                        }
                    });
                }
            });
        }
    }
    async _runRestartTaskCommand(arg) {
        const activeTasks = await this.getActiveTasks();
        if (activeTasks.length === 1) {
            this._restart(activeTasks[0]);
            return;
        }
        if (this.inTerminal()) {
            // try dispatching using task identifier
            const identifier = this._getTaskIdentifier(arg);
            if (identifier !== undefined) {
                for (const task of activeTasks) {
                    if (task.matches(identifier)) {
                        this._restart(task);
                        return;
                    }
                }
            }
            // show quick pick with active tasks
            const entry = await this._showQuickPick(activeTasks, nls.localize('TaskService.taskToRestart', 'Select the task to restart'), {
                label: nls.localize('TaskService.noTaskToRestart', 'No task to restart'),
                task: null
            }, false, true);
            if (entry && entry.task) {
                this._restart(entry.task);
            }
        }
        else {
            if (activeTasks.length > 0) {
                this._restart(activeTasks[0]);
            }
        }
    }
    _getTaskIdentifier(filter) {
        let result = undefined;
        if (Types.isString(filter)) {
            result = filter;
        }
        else if (filter && Types.isString(filter.type)) {
            result = TaskDefinition.createTaskIdentifier(filter, console);
        }
        return result;
    }
    _configHasTasks(taskConfig) {
        return !!taskConfig && !!taskConfig.tasks && taskConfig.tasks.length > 0;
    }
    _openTaskFile(resource, taskSource) {
        let configFileCreated = false;
        this._fileService.stat(resource).then((stat) => stat, () => undefined).then(async (stat) => {
            const fileExists = !!stat;
            const configValue = this._configurationService.inspect('tasks', { resource });
            let tasksExistInFile;
            let target;
            switch (taskSource) {
                case TaskSourceKind.User:
                    tasksExistInFile = this._configHasTasks(configValue.userValue);
                    target = 2 /* ConfigurationTarget.USER */;
                    break;
                case TaskSourceKind.WorkspaceFile:
                    tasksExistInFile = this._configHasTasks(configValue.workspaceValue);
                    target = 5 /* ConfigurationTarget.WORKSPACE */;
                    break;
                default:
                    tasksExistInFile = this._configHasTasks(configValue.workspaceFolderValue);
                    target = 6 /* ConfigurationTarget.WORKSPACE_FOLDER */;
            }
            let content;
            if (!tasksExistInFile) {
                const pickTemplateResult = await this._quickInputService.pick(getTaskTemplates(), { placeHolder: nls.localize('TaskService.template', 'Select a Task Template') });
                if (!pickTemplateResult) {
                    return Promise.resolve(undefined);
                }
                content = pickTemplateResult.content;
                const editorConfig = this._configurationService.getValue();
                if (editorConfig.editor.insertSpaces) {
                    content = content.replace(/(\n)(\t+)/g, (_, s1, s2) => s1 + ' '.repeat(s2.length * editorConfig.editor.tabSize));
                }
                configFileCreated = true;
            }
            if (!fileExists && content) {
                return this._textFileService.create([{ resource, value: content }]).then(result => {
                    return result[0].resource;
                });
            }
            else if (fileExists && (tasksExistInFile || content)) {
                const statResource = stat?.resource;
                if (content && statResource) {
                    this._configurationService.updateValue('tasks', json.parse(content), { resource: statResource }, target);
                }
                return statResource;
            }
            return undefined;
        }).then((resource) => {
            if (!resource) {
                return;
            }
            this._editorService.openEditor({
                resource,
                options: {
                    pinned: configFileCreated // pin only if config file is created #8727
                }
            });
        });
    }
    _isTaskEntry(value) {
        const candidate = value;
        return candidate && !!candidate.task;
    }
    _isSettingEntry(value) {
        const candidate = value;
        return candidate && !!candidate.settingType;
    }
    _configureTask(task) {
        if (ContributedTask.is(task)) {
            this.customize(task, undefined, true);
        }
        else if (CustomTask.is(task)) {
            this.openConfig(task);
        }
        else if (ConfiguringTask.is(task)) {
            // Do nothing.
        }
    }
    _handleSelection(selection) {
        if (!selection) {
            return;
        }
        if (this._isTaskEntry(selection)) {
            this._configureTask(selection.task);
        }
        else if (this._isSettingEntry(selection)) {
            const taskQuickPick = this._instantiationService.createInstance(TaskQuickPick);
            taskQuickPick.handleSettingOption(selection.settingType);
        }
        else if (selection.folder && (this._contextService.getWorkbenchState() !== 1 /* WorkbenchState.EMPTY */)) {
            this._openTaskFile(selection.folder.toResource('.vscode/tasks.json'), TaskSourceKind.Workspace);
        }
        else {
            const resource = this._getResourceForKind(TaskSourceKind.User);
            if (resource) {
                this._openTaskFile(resource, TaskSourceKind.User);
            }
        }
    }
    getTaskDescription(task) {
        let description;
        if (task._source.kind === TaskSourceKind.User) {
            description = nls.localize('taskQuickPick.userSettings', 'User');
        }
        else if (task._source.kind === TaskSourceKind.WorkspaceFile) {
            description = task.getWorkspaceFileName();
        }
        else if (this.needsFolderQualification()) {
            const workspaceFolder = task.getWorkspaceFolder();
            if (workspaceFolder) {
                description = workspaceFolder.name;
            }
        }
        return description;
    }
    async _runConfigureTasks() {
        if (!(await this._trust())) {
            return;
        }
        let taskPromise;
        if (this.schemaVersion === 2 /* JsonSchemaVersion.V2_0_0 */) {
            taskPromise = this._getGroupedTasks();
        }
        else {
            taskPromise = Promise.resolve(new TaskMap());
        }
        const stats = this._contextService.getWorkspace().folders.map((folder) => {
            return this._fileService.stat(folder.toResource('.vscode/tasks.json')).then(stat => stat, () => undefined);
        });
        const createLabel = nls.localize('TaskService.createJsonFile', 'Create tasks.json file from template');
        const openLabel = nls.localize('TaskService.openJsonFile', 'Open tasks.json file');
        const tokenSource = new CancellationTokenSource();
        const cancellationToken = tokenSource.token;
        const entries = Promise.all(stats).then((stats) => {
            return taskPromise.then((taskMap) => {
                const entries = [];
                let configuredCount = 0;
                let tasks = taskMap.all();
                if (tasks.length > 0) {
                    tasks = tasks.sort((a, b) => a._label.localeCompare(b._label));
                    for (const task of tasks) {
                        const entry = { label: TaskQuickPick.getTaskLabelWithIcon(task), task, description: this.getTaskDescription(task), detail: this._showDetail() ? task.configurationProperties.detail : undefined };
                        TaskQuickPick.applyColorStyles(task, entry, this._themeService);
                        entries.push(entry);
                        if (!ContributedTask.is(task)) {
                            configuredCount++;
                        }
                    }
                }
                const needsCreateOrOpen = (configuredCount === 0);
                // If the only configured tasks are user tasks, then we should also show the option to create from a template.
                if (needsCreateOrOpen || (taskMap.get(USER_TASKS_GROUP_KEY).length === configuredCount)) {
                    const label = stats[0] !== undefined ? openLabel : createLabel;
                    if (entries.length) {
                        entries.push({ type: 'separator' });
                    }
                    entries.push({ label, folder: this._contextService.getWorkspace().folders[0] });
                }
                if ((entries.length === 1) && !needsCreateOrOpen) {
                    tokenSource.cancel();
                }
                return entries;
            });
        });
        const timeout = await Promise.race([new Promise((resolve) => {
                entries.then(() => resolve(false));
            }), new Promise((resolve) => {
                const timer = setTimeout(() => {
                    clearTimeout(timer);
                    resolve(true);
                }, 200);
            })]);
        if (!timeout && ((await entries).length === 1) && this._configurationService.getValue(QUICKOPEN_SKIP_CONFIG)) {
            const entry = (await entries)[0];
            if (entry.task) {
                this._handleSelection(entry);
                return;
            }
        }
        const entriesWithSettings = entries.then(resolvedEntries => {
            resolvedEntries.push(...TaskQuickPick.allSettingEntries(this._configurationService));
            return resolvedEntries;
        });
        this._quickInputService.pick(entriesWithSettings, { placeHolder: nls.localize('TaskService.pickTask', 'Select a task to configure') }, cancellationToken).
            then(async (selection) => {
            if (cancellationToken.isCancellationRequested) {
                // canceled when there's only one task
                const task = (await entries)[0];
                if (task.task) {
                    selection = task;
                }
            }
            this._handleSelection(selection);
        });
    }
    _runConfigureDefaultBuildTask() {
        if (this.schemaVersion === 2 /* JsonSchemaVersion.V2_0_0 */) {
            this.tasks().then((tasks => {
                if (tasks.length === 0) {
                    this._runConfigureTasks();
                    return;
                }
                const entries = [];
                let selectedTask;
                let selectedEntry;
                this._showIgnoredFoldersMessage().then(async () => {
                    const { globGroupTasks } = await this._getGlobTasks(TaskGroup.Build._id);
                    let defaultTasks = globGroupTasks;
                    if (!defaultTasks?.length) {
                        defaultTasks = this._getDefaultTasks(tasks, false);
                    }
                    let defaultBuildTask;
                    if (defaultTasks.length === 1) {
                        const group = defaultTasks[0].configurationProperties.group;
                        if (group) {
                            if (typeof group === 'string' && group === TaskGroup.Build._id) {
                                defaultBuildTask = defaultTasks[0];
                            }
                            else {
                                defaultBuildTask = defaultTasks[0];
                            }
                        }
                    }
                    for (const task of tasks) {
                        if (task === defaultBuildTask) {
                            const label = nls.localize('TaskService.defaultBuildTaskExists', '{0} is already marked as the default build task', TaskQuickPick.getTaskLabelWithIcon(task, task.getQualifiedLabel()));
                            selectedTask = task;
                            selectedEntry = { label, task, description: this.getTaskDescription(task), detail: this._showDetail() ? task.configurationProperties.detail : undefined };
                            TaskQuickPick.applyColorStyles(task, selectedEntry, this._themeService);
                        }
                        else {
                            const entry = { label: TaskQuickPick.getTaskLabelWithIcon(task), task, description: this.getTaskDescription(task), detail: this._showDetail() ? task.configurationProperties.detail : undefined };
                            TaskQuickPick.applyColorStyles(task, entry, this._themeService);
                            entries.push(entry);
                        }
                    }
                    if (selectedEntry) {
                        entries.unshift(selectedEntry);
                    }
                    const tokenSource = new CancellationTokenSource();
                    const cancellationToken = tokenSource.token;
                    this._quickInputService.pick(entries, { placeHolder: nls.localize('TaskService.pickTask', 'Select a task to configure') }, cancellationToken).
                        then(async (entry) => {
                        if (cancellationToken.isCancellationRequested) {
                            // canceled when there's only one task
                            const task = (await entries)[0];
                            if (task.task) {
                                entry = task;
                            }
                        }
                        const task = entry && 'task' in entry ? entry.task : undefined;
                        if ((task === undefined) || (task === null)) {
                            return;
                        }
                        if (task === selectedTask && CustomTask.is(task)) {
                            this.openConfig(task);
                        }
                        if (!InMemoryTask.is(task)) {
                            this.customize(task, { group: { kind: 'build', isDefault: true } }, true).then(() => {
                                if (selectedTask && (task !== selectedTask) && !InMemoryTask.is(selectedTask)) {
                                    this.customize(selectedTask, { group: 'build' }, false);
                                }
                            });
                        }
                    });
                    this._quickInputService.pick(entries, {
                        placeHolder: nls.localize('TaskService.pickDefaultBuildTask', 'Select the task to be used as the default build task')
                    }).
                        then((entry) => {
                        const task = entry && 'task' in entry ? entry.task : undefined;
                        if ((task === undefined) || (task === null)) {
                            return;
                        }
                        if (task === selectedTask && CustomTask.is(task)) {
                            this.openConfig(task);
                        }
                        if (!InMemoryTask.is(task)) {
                            this.customize(task, { group: { kind: 'build', isDefault: true } }, true).then(() => {
                                if (selectedTask && (task !== selectedTask) && !InMemoryTask.is(selectedTask)) {
                                    this.customize(selectedTask, { group: 'build' }, false);
                                }
                            });
                        }
                    });
                });
            }));
        }
        else {
            this._runConfigureTasks();
        }
    }
    _runConfigureDefaultTestTask() {
        if (this.schemaVersion === 2 /* JsonSchemaVersion.V2_0_0 */) {
            this.tasks().then((tasks => {
                if (tasks.length === 0) {
                    this._runConfigureTasks();
                    return;
                }
                let selectedTask;
                let selectedEntry;
                for (const task of tasks) {
                    const taskGroup = TaskGroup.from(task.configurationProperties.group);
                    if (taskGroup && taskGroup.isDefault && taskGroup._id === TaskGroup.Test._id) {
                        selectedTask = task;
                        break;
                    }
                }
                if (selectedTask) {
                    selectedEntry = {
                        label: nls.localize('TaskService.defaultTestTaskExists', '{0} is already marked as the default test task.', selectedTask.getQualifiedLabel()),
                        task: selectedTask,
                        detail: this._showDetail() ? selectedTask.configurationProperties.detail : undefined
                    };
                }
                this._showIgnoredFoldersMessage().then(() => {
                    this._showQuickPick(tasks, nls.localize('TaskService.pickDefaultTestTask', 'Select the task to be used as the default test task'), undefined, true, false, selectedEntry).then((entry) => {
                        const task = entry ? entry.task : undefined;
                        if (!task) {
                            return;
                        }
                        if (task === selectedTask && CustomTask.is(task)) {
                            this.openConfig(task);
                        }
                        if (!InMemoryTask.is(task)) {
                            this.customize(task, { group: { kind: 'test', isDefault: true } }, true).then(() => {
                                if (selectedTask && (task !== selectedTask) && !InMemoryTask.is(selectedTask)) {
                                    this.customize(selectedTask, { group: 'test' }, false);
                                }
                            });
                        }
                    });
                });
            }));
        }
        else {
            this._runConfigureTasks();
        }
    }
    async runShowTasks() {
        const activeTasksPromise = this.getActiveTasks();
        const activeTasks = await activeTasksPromise;
        let group;
        if (activeTasks.length === 1) {
            this._taskSystem.revealTask(activeTasks[0]);
        }
        else if (activeTasks.length && activeTasks.every((task) => {
            if (InMemoryTask.is(task)) {
                return false;
            }
            if (!group) {
                group = task.command.presentation?.group;
            }
            return task.command.presentation?.group && (task.command.presentation.group === group);
        })) {
            this._taskSystem.revealTask(activeTasks[0]);
        }
        else {
            this._showQuickPick(activeTasksPromise, nls.localize('TaskService.pickShowTask', 'Select the task to show its output'), {
                label: nls.localize('TaskService.noTaskIsRunning', 'No task is running'),
                task: null
            }, false, true).then((entry) => {
                const task = entry ? entry.task : undefined;
                if (task === undefined || task === null) {
                    return;
                }
                this._taskSystem.revealTask(task);
            });
        }
    }
    async _createTasksDotOld(folder) {
        const tasksFile = folder.toResource('.vscode/tasks.json');
        if (await this._fileService.exists(tasksFile)) {
            const oldFile = tasksFile.with({ path: `${tasksFile.path}.old` });
            await this._fileService.copy(tasksFile, oldFile, true);
            return [oldFile, tasksFile];
        }
        return undefined;
    }
    _upgradeTask(task, suppressTaskName, globalConfig) {
        if (!CustomTask.is(task)) {
            return;
        }
        const configElement = {
            label: task._label
        };
        const oldTaskTypes = new Set(['gulp', 'jake', 'grunt']);
        if (Types.isString(task.command.name) && oldTaskTypes.has(task.command.name)) {
            configElement.type = task.command.name;
            configElement.task = task.command.args[0];
        }
        else {
            if (task.command.runtime === RuntimeType.Shell) {
                configElement.type = RuntimeType.toString(RuntimeType.Shell);
            }
            if (task.command.name && !suppressTaskName && !globalConfig.windows?.command && !globalConfig.osx?.command && !globalConfig.linux?.command) {
                configElement.command = task.command.name;
            }
            else if (suppressTaskName) {
                configElement.command = task._source.config.element.command;
            }
            if (task.command.args && (!Array.isArray(task.command.args) || (task.command.args.length > 0))) {
                if (!globalConfig.windows?.args && !globalConfig.osx?.args && !globalConfig.linux?.args) {
                    configElement.args = task.command.args;
                }
                else {
                    configElement.args = task._source.config.element.args;
                }
            }
        }
        if (task.configurationProperties.presentation) {
            configElement.presentation = task.configurationProperties.presentation;
        }
        if (task.configurationProperties.isBackground) {
            configElement.isBackground = task.configurationProperties.isBackground;
        }
        if (task.configurationProperties.problemMatchers) {
            configElement.problemMatcher = task._source.config.element.problemMatcher;
        }
        if (task.configurationProperties.group) {
            configElement.group = task.configurationProperties.group;
        }
        task._source.config.element = configElement;
        const tempTask = new CustomTask(task._id, task._source, task._label, task.type, task.command, task.hasDefinedMatchers, task.runOptions, task.configurationProperties);
        const configTask = this._createCustomizableTask(tempTask);
        if (configTask) {
            return configTask;
        }
        return;
    }
    async _upgrade() {
        if (this.schemaVersion === 2 /* JsonSchemaVersion.V2_0_0 */) {
            return;
        }
        if (!this._workspaceTrustManagementService.isWorkspaceTrusted()) {
            this._register(Event.once(this._workspaceTrustManagementService.onDidChangeTrust)(isTrusted => {
                if (isTrusted) {
                    this._upgrade();
                }
            }));
            return;
        }
        const tasks = await this._getGroupedTasks();
        const fileDiffs = [];
        for (const folder of this.workspaceFolders) {
            const diff = await this._createTasksDotOld(folder);
            if (diff) {
                fileDiffs.push(diff);
            }
            if (!diff) {
                continue;
            }
            const configTasks = [];
            const suppressTaskName = !!this._configurationService.getValue("tasks.suppressTaskName" /* TasksSchemaProperties.SuppressTaskName */, { resource: folder.uri });
            const globalConfig = {
                windows: this._configurationService.getValue("tasks.windows" /* TasksSchemaProperties.Windows */, { resource: folder.uri }),
                osx: this._configurationService.getValue("tasks.osx" /* TasksSchemaProperties.Osx */, { resource: folder.uri }),
                linux: this._configurationService.getValue("tasks.linux" /* TasksSchemaProperties.Linux */, { resource: folder.uri })
            };
            tasks.get(folder).forEach(task => {
                const configTask = this._upgradeTask(task, suppressTaskName, globalConfig);
                if (configTask) {
                    configTasks.push(configTask);
                }
            });
            this._taskSystem = undefined;
            this._workspaceTasksPromise = undefined;
            await this._writeConfiguration(folder, 'tasks.tasks', configTasks);
            await this._writeConfiguration(folder, 'tasks.version', '2.0.0');
            if (this._configurationService.getValue("tasks.showOutput" /* TasksSchemaProperties.ShowOutput */, { resource: folder.uri })) {
                await this._configurationService.updateValue("tasks.showOutput" /* TasksSchemaProperties.ShowOutput */, undefined, { resource: folder.uri });
            }
            if (this._configurationService.getValue("tasks.isShellCommand" /* TasksSchemaProperties.IsShellCommand */, { resource: folder.uri })) {
                await this._configurationService.updateValue("tasks.isShellCommand" /* TasksSchemaProperties.IsShellCommand */, undefined, { resource: folder.uri });
            }
            if (this._configurationService.getValue("tasks.suppressTaskName" /* TasksSchemaProperties.SuppressTaskName */, { resource: folder.uri })) {
                await this._configurationService.updateValue("tasks.suppressTaskName" /* TasksSchemaProperties.SuppressTaskName */, undefined, { resource: folder.uri });
            }
        }
        this._updateSetup();
        this._notificationService.prompt(Severity.Warning, fileDiffs.length === 1 ?
            nls.localize('taskService.upgradeVersion', "The deprecated tasks version 0.1.0 has been removed. Your tasks have been upgraded to version 2.0.0. Open the diff to review the upgrade.")
            : nls.localize('taskService.upgradeVersionPlural', "The deprecated tasks version 0.1.0 has been removed. Your tasks have been upgraded to version 2.0.0. Open the diffs to review the upgrade."), [{
                label: fileDiffs.length === 1 ? nls.localize('taskService.openDiff', "Open diff") : nls.localize('taskService.openDiffs', "Open diffs"),
                run: async () => {
                    for (const upgrade of fileDiffs) {
                        await this._editorService.openEditor({
                            original: { resource: upgrade[0] },
                            modified: { resource: upgrade[1] }
                        });
                    }
                }
            }]);
    }
};
AbstractTaskService = AbstractTaskService_1 = __decorate([
    __param(0, IConfigurationService),
    __param(1, IMarkerService),
    __param(2, IOutputService),
    __param(3, IPaneCompositePartService),
    __param(4, IViewsService),
    __param(5, ICommandService),
    __param(6, IEditorService),
    __param(7, IFileService),
    __param(8, IWorkspaceContextService),
    __param(9, ITelemetryService),
    __param(10, ITextFileService),
    __param(11, IModelService),
    __param(12, IExtensionService),
    __param(13, IQuickInputService),
    __param(14, IConfigurationResolverService),
    __param(15, ITerminalService),
    __param(16, ITerminalGroupService),
    __param(17, IStorageService),
    __param(18, IProgressService),
    __param(19, IOpenerService),
    __param(20, IDialogService),
    __param(21, INotificationService),
    __param(22, IContextKeyService),
    __param(23, IWorkbenchEnvironmentService),
    __param(24, ITerminalProfileResolverService),
    __param(25, IPathService),
    __param(26, ITextModelService),
    __param(27, IPreferencesService),
    __param(28, IViewDescriptorService),
    __param(29, IWorkspaceTrustRequestService),
    __param(30, IWorkspaceTrustManagementService),
    __param(31, ILogService),
    __param(32, IThemeService),
    __param(33, ILifecycleService),
    __param(34, IRemoteAgentService),
    __param(35, IInstantiationService)
], AbstractTaskService);
export { AbstractTaskService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWJzdHJhY3RUYXNrU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rhc2tzL2Jyb3dzZXIvYWJzdHJhY3RUYXNrU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBRTVELE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxLQUFLLElBQUksTUFBTSxpQ0FBaUMsQ0FBQztBQUN4RCxPQUFPLEtBQUssSUFBSSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3hELE9BQU8sRUFBRSxVQUFVLEVBQUUsT0FBTyxFQUEyQixNQUFNLHNDQUFzQyxDQUFDO0FBQ3BHLE9BQU8sRUFBRSxRQUFRLEVBQVMsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNqRSxPQUFPLEtBQUssT0FBTyxNQUFNLG9DQUFvQyxDQUFDO0FBQzlELE9BQU8sRUFBbUIsZ0JBQWdCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUN2RixPQUFPLEtBQUssUUFBUSxNQUFNLHFDQUFxQyxDQUFDO0FBRWhFLE9BQU8sS0FBSyxTQUFTLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxRQUFRLE1BQU0scUNBQXFDLENBQUM7QUFDM0QsT0FBTyxLQUFLLEtBQUssTUFBTSxrQ0FBa0MsQ0FBQztBQUMxRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckQsT0FBTyxLQUFLLElBQUksTUFBTSxpQ0FBaUMsQ0FBQztBQUN4RCxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFDO0FBQzFDLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxlQUFlLEVBQUUs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