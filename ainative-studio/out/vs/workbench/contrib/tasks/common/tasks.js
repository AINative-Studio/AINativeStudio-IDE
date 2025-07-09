/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import * as Types from '../../../../base/common/types.js';
import * as resources from '../../../../base/common/resources.js';
import * as Objects from '../../../../base/common/objects.js';
import { RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { TaskDefinitionRegistry } from './taskDefinitionRegistry.js';
export const USER_TASKS_GROUP_KEY = 'settings';
export const TASK_RUNNING_STATE = new RawContextKey('taskRunning', false, nls.localize('tasks.taskRunningContext', "Whether a task is currently running."));
/** Whether the active terminal is a task terminal. */
export const TASK_TERMINAL_ACTIVE = new RawContextKey('taskTerminalActive', false, nls.localize('taskTerminalActive', "Whether the active terminal is a task terminal."));
export const TASKS_CATEGORY = nls.localize2('tasksCategory', "Tasks");
export var ShellQuoting;
(function (ShellQuoting) {
    /**
     * Use character escaping.
     */
    ShellQuoting[ShellQuoting["Escape"] = 1] = "Escape";
    /**
     * Use strong quoting
     */
    ShellQuoting[ShellQuoting["Strong"] = 2] = "Strong";
    /**
     * Use weak quoting.
     */
    ShellQuoting[ShellQuoting["Weak"] = 3] = "Weak";
})(ShellQuoting || (ShellQuoting = {}));
export const CUSTOMIZED_TASK_TYPE = '$customized';
(function (ShellQuoting) {
    function from(value) {
        if (!value) {
            return ShellQuoting.Strong;
        }
        switch (value.toLowerCase()) {
            case 'escape':
                return ShellQuoting.Escape;
            case 'strong':
                return ShellQuoting.Strong;
            case 'weak':
                return ShellQuoting.Weak;
            default:
                return ShellQuoting.Strong;
        }
    }
    ShellQuoting.from = from;
})(ShellQuoting || (ShellQuoting = {}));
export var CommandOptions;
(function (CommandOptions) {
    CommandOptions.defaults = { cwd: '${workspaceFolder}' };
})(CommandOptions || (CommandOptions = {}));
export var RevealKind;
(function (RevealKind) {
    /**
     * Always brings the terminal to front if the task is executed.
     */
    RevealKind[RevealKind["Always"] = 1] = "Always";
    /**
     * Only brings the terminal to front if a problem is detected executing the task
     * e.g. the task couldn't be started,
     * the task ended with an exit code other than zero,
     * or the problem matcher found an error.
     */
    RevealKind[RevealKind["Silent"] = 2] = "Silent";
    /**
     * The terminal never comes to front when the task is executed.
     */
    RevealKind[RevealKind["Never"] = 3] = "Never";
})(RevealKind || (RevealKind = {}));
(function (RevealKind) {
    function fromString(value) {
        switch (value.toLowerCase()) {
            case 'always':
                return RevealKind.Always;
            case 'silent':
                return RevealKind.Silent;
            case 'never':
                return RevealKind.Never;
            default:
                return RevealKind.Always;
        }
    }
    RevealKind.fromString = fromString;
})(RevealKind || (RevealKind = {}));
export var RevealProblemKind;
(function (RevealProblemKind) {
    /**
     * Never reveals the problems panel when this task is executed.
     */
    RevealProblemKind[RevealProblemKind["Never"] = 1] = "Never";
    /**
     * Only reveals the problems panel if a problem is found.
     */
    RevealProblemKind[RevealProblemKind["OnProblem"] = 2] = "OnProblem";
    /**
     * Never reveals the problems panel when this task is executed.
     */
    RevealProblemKind[RevealProblemKind["Always"] = 3] = "Always";
})(RevealProblemKind || (RevealProblemKind = {}));
(function (RevealProblemKind) {
    function fromString(value) {
        switch (value.toLowerCase()) {
            case 'always':
                return RevealProblemKind.Always;
            case 'never':
                return RevealProblemKind.Never;
            case 'onproblem':
                return RevealProblemKind.OnProblem;
            default:
                return RevealProblemKind.OnProblem;
        }
    }
    RevealProblemKind.fromString = fromString;
})(RevealProblemKind || (RevealProblemKind = {}));
export var PanelKind;
(function (PanelKind) {
    /**
     * Shares a panel with other tasks. This is the default.
     */
    PanelKind[PanelKind["Shared"] = 1] = "Shared";
    /**
     * Uses a dedicated panel for this tasks. The panel is not
     * shared with other tasks.
     */
    PanelKind[PanelKind["Dedicated"] = 2] = "Dedicated";
    /**
     * Creates a new panel whenever this task is executed.
     */
    PanelKind[PanelKind["New"] = 3] = "New";
})(PanelKind || (PanelKind = {}));
(function (PanelKind) {
    function fromString(value) {
        switch (value.toLowerCase()) {
            case 'shared':
                return PanelKind.Shared;
            case 'dedicated':
                return PanelKind.Dedicated;
            case 'new':
                return PanelKind.New;
            default:
                return PanelKind.Shared;
        }
    }
    PanelKind.fromString = fromString;
})(PanelKind || (PanelKind = {}));
export var PresentationOptions;
(function (PresentationOptions) {
    PresentationOptions.defaults = {
        echo: true, reveal: RevealKind.Always, revealProblems: RevealProblemKind.Never, focus: false, panel: PanelKind.Shared, showReuseMessage: true, clear: false
    };
})(PresentationOptions || (PresentationOptions = {}));
export var RuntimeType;
(function (RuntimeType) {
    RuntimeType[RuntimeType["Shell"] = 1] = "Shell";
    RuntimeType[RuntimeType["Process"] = 2] = "Process";
    RuntimeType[RuntimeType["CustomExecution"] = 3] = "CustomExecution";
})(RuntimeType || (RuntimeType = {}));
(function (RuntimeType) {
    function fromString(value) {
        switch (value.toLowerCase()) {
            case 'shell':
                return RuntimeType.Shell;
            case 'process':
                return RuntimeType.Process;
            case 'customExecution':
                return RuntimeType.CustomExecution;
            default:
                return RuntimeType.Process;
        }
    }
    RuntimeType.fromString = fromString;
    function toString(value) {
        switch (value) {
            case RuntimeType.Shell: return 'shell';
            case RuntimeType.Process: return 'process';
            case RuntimeType.CustomExecution: return 'customExecution';
            default: return 'process';
        }
    }
    RuntimeType.toString = toString;
})(RuntimeType || (RuntimeType = {}));
export var CommandString;
(function (CommandString) {
    function value(value) {
        if (Types.isString(value)) {
            return value;
        }
        else {
            return value.value;
        }
    }
    CommandString.value = value;
})(CommandString || (CommandString = {}));
export var TaskGroup;
(function (TaskGroup) {
    TaskGroup.Clean = { _id: 'clean', isDefault: false };
    TaskGroup.Build = { _id: 'build', isDefault: false };
    TaskGroup.Rebuild = { _id: 'rebuild', isDefault: false };
    TaskGroup.Test = { _id: 'test', isDefault: false };
    function is(value) {
        return value === TaskGroup.Clean._id || value === TaskGroup.Build._id || value === TaskGroup.Rebuild._id || value === TaskGroup.Test._id;
    }
    TaskGroup.is = is;
    function from(value) {
        if (value === undefined) {
            return undefined;
        }
        else if (Types.isString(value)) {
            if (is(value)) {
                return { _id: value, isDefault: false };
            }
            return undefined;
        }
        else {
            return value;
        }
    }
    TaskGroup.from = from;
})(TaskGroup || (TaskGroup = {}));
export var TaskScope;
(function (TaskScope) {
    TaskScope[TaskScope["Global"] = 1] = "Global";
    TaskScope[TaskScope["Workspace"] = 2] = "Workspace";
    TaskScope[TaskScope["Folder"] = 3] = "Folder";
})(TaskScope || (TaskScope = {}));
export var TaskSourceKind;
(function (TaskSourceKind) {
    TaskSourceKind.Workspace = 'workspace';
    TaskSourceKind.Extension = 'extension';
    TaskSourceKind.InMemory = 'inMemory';
    TaskSourceKind.WorkspaceFile = 'workspaceFile';
    TaskSourceKind.User = 'user';
    function toConfigurationTarget(kind) {
        switch (kind) {
            case TaskSourceKind.User: return 2 /* ConfigurationTarget.USER */;
            case TaskSourceKind.WorkspaceFile: return 5 /* ConfigurationTarget.WORKSPACE */;
            default: return 6 /* ConfigurationTarget.WORKSPACE_FOLDER */;
        }
    }
    TaskSourceKind.toConfigurationTarget = toConfigurationTarget;
})(TaskSourceKind || (TaskSourceKind = {}));
export var DependsOrder;
(function (DependsOrder) {
    DependsOrder["parallel"] = "parallel";
    DependsOrder["sequence"] = "sequence";
})(DependsOrder || (DependsOrder = {}));
export var RunOnOptions;
(function (RunOnOptions) {
    RunOnOptions[RunOnOptions["default"] = 1] = "default";
    RunOnOptions[RunOnOptions["folderOpen"] = 2] = "folderOpen";
})(RunOnOptions || (RunOnOptions = {}));
export var RunOptions;
(function (RunOptions) {
    RunOptions.defaults = { reevaluateOnRerun: true, runOn: RunOnOptions.default, instanceLimit: 1 };
})(RunOptions || (RunOptions = {}));
export class CommonTask {
    constructor(id, label, type, runOptions, configurationProperties, source) {
        /**
         * The cached label.
         */
        this._label = '';
        this._id = id;
        if (label) {
            this._label = label;
        }
        if (type) {
            this.type = type;
        }
        this.runOptions = runOptions;
        this.configurationProperties = configurationProperties;
        this._source = source;
    }
    getDefinition(useSource) {
        return undefined;
    }
    getMapKey() {
        return this._id;
    }
    getKey() {
        return undefined;
    }
    getCommonTaskId() {
        const key = { folder: this.getFolderId(), id: this._id };
        return JSON.stringify(key);
    }
    clone() {
        return this.fromObject(Object.assign({}, this));
    }
    getWorkspaceFolder() {
        return undefined;
    }
    getWorkspaceFileName() {
        return undefined;
    }
    getTelemetryKind() {
        return 'unknown';
    }
    matches(key, compareId = false) {
        if (key === undefined) {
            return false;
        }
        if (Types.isString(key)) {
            return key === this._label || key === this.configurationProperties.identifier || (compareId && key === this._id);
        }
        const identifier = this.getDefinition(true);
        return identifier !== undefined && identifier._key === key._key;
    }
    getQualifiedLabel() {
        const workspaceFolder = this.getWorkspaceFolder();
        if (workspaceFolder) {
            return `${this._label} (${workspaceFolder.name})`;
        }
        else {
            return this._label;
        }
    }
    getTaskExecution() {
        const result = {
            id: this._id,
            task: this
        };
        return result;
    }
    addTaskLoadMessages(messages) {
        if (this._taskLoadMessages === undefined) {
            this._taskLoadMessages = [];
        }
        if (messages) {
            this._taskLoadMessages = this._taskLoadMessages.concat(messages);
        }
    }
    get taskLoadMessages() {
        return this._taskLoadMessages;
    }
}
/**
 * For tasks of type shell or process, this is created upon parse
 * of the tasks.json or workspace file.
 * For ContributedTasks of all other types, this is the result of
 * resolving a ConfiguringTask.
 */
export class CustomTask extends CommonTask {
    constructor(id, source, label, type, command, hasDefinedMatchers, runOptions, configurationProperties) {
        super(id, label, undefined, runOptions, configurationProperties, source);
        /**
         * The command configuration
         */
        this.command = {};
        this._source = source;
        this.hasDefinedMatchers = hasDefinedMatchers;
        if (command) {
            this.command = command;
        }
    }
    clone() {
        return new CustomTask(this._id, this._source, this._label, this.type, this.command, this.hasDefinedMatchers, this.runOptions, this.configurationProperties);
    }
    customizes() {
        if (this._source && this._source.customizes) {
            return this._source.customizes;
        }
        return undefined;
    }
    getDefinition(useSource = false) {
        if (useSource && this._source.customizes !== undefined) {
            return this._source.customizes;
        }
        else {
            let type;
            const commandRuntime = this.command ? this.command.runtime : undefined;
            switch (commandRuntime) {
                case RuntimeType.Shell:
                    type = 'shell';
                    break;
                case RuntimeType.Process:
                    type = 'process';
                    break;
                case RuntimeType.CustomExecution:
                    type = 'customExecution';
                    break;
                case undefined:
                    type = '$composite';
                    break;
                default:
                    throw new Error('Unexpected task runtime');
            }
            const result = {
                type,
                _key: this._id,
                id: this._id
            };
            return result;
        }
    }
    static is(value) {
        return value instanceof CustomTask;
    }
    getMapKey() {
        const workspaceFolder = this._source.config.workspaceFolder;
        return workspaceFolder ? `${workspaceFolder.uri.toString()}|${this._id}|${this.instance}` : `${this._id}|${this.instance}`;
    }
    getFolderId() {
        return this._source.kind === TaskSourceKind.User ? USER_TASKS_GROUP_KEY : this._source.config.workspaceFolder?.uri.toString();
    }
    getCommonTaskId() {
        return this._source.customizes ? super.getCommonTaskId() : (this.getKey() ?? super.getCommonTaskId());
    }
    /**
     * @returns A key representing the task
     */
    getKey() {
        const workspaceFolder = this.getFolderId();
        if (!workspaceFolder) {
            return undefined;
        }
        let id = this.configurationProperties.identifier;
        if (this._source.kind !== TaskSourceKind.Workspace) {
            id += this._source.kind;
        }
        const key = { type: CUSTOMIZED_TASK_TYPE, folder: workspaceFolder, id };
        return JSON.stringify(key);
    }
    getWorkspaceFolder() {
        return this._source.config.workspaceFolder;
    }
    getWorkspaceFileName() {
        return (this._source.config.workspace && this._source.config.workspace.configuration) ? resources.basename(this._source.config.workspace.configuration) : undefined;
    }
    getTelemetryKind() {
        if (this._source.customizes) {
            return 'workspace>extension';
        }
        else {
            return 'workspace';
        }
    }
    fromObject(object) {
        return new CustomTask(object._id, object._source, object._label, object.type, object.command, object.hasDefinedMatchers, object.runOptions, object.configurationProperties);
    }
}
/**
 * After a contributed task has been parsed, but before
 * the task has been resolved via the extension, its properties
 * are stored in this
 */
export class ConfiguringTask extends CommonTask {
    constructor(id, source, label, type, configures, runOptions, configurationProperties) {
        super(id, label, type, runOptions, configurationProperties, source);
        this._source = source;
        this.configures = configures;
    }
    static is(value) {
        return value instanceof ConfiguringTask;
    }
    fromObject(object) {
        return object;
    }
    getDefinition() {
        return this.configures;
    }
    getWorkspaceFileName() {
        return (this._source.config.workspace && this._source.config.workspace.configuration) ? resources.basename(this._source.config.workspace.configuration) : undefined;
    }
    getWorkspaceFolder() {
        return this._source.config.workspaceFolder;
    }
    getFolderId() {
        return this._source.kind === TaskSourceKind.User ? USER_TASKS_GROUP_KEY : this._source.config.workspaceFolder?.uri.toString();
    }
    getKey() {
        const workspaceFolder = this.getFolderId();
        if (!workspaceFolder) {
            return undefined;
        }
        let id = this.configurationProperties.identifier;
        if (this._source.kind !== TaskSourceKind.Workspace) {
            id += this._source.kind;
        }
        const key = { type: CUSTOMIZED_TASK_TYPE, folder: workspaceFolder, id };
        return JSON.stringify(key);
    }
}
/**
 * A task from an extension created via resolveTask or provideTask
 */
export class ContributedTask extends CommonTask {
    constructor(id, source, label, type, defines, command, hasDefinedMatchers, runOptions, configurationProperties) {
        super(id, label, type, runOptions, configurationProperties, source);
        this.defines = defines;
        this.hasDefinedMatchers = hasDefinedMatchers;
        this.command = command;
        this.icon = configurationProperties.icon;
        this.hide = configurationProperties.hide;
    }
    clone() {
        return new ContributedTask(this._id, this._source, this._label, this.type, this.defines, this.command, this.hasDefinedMatchers, this.runOptions, this.configurationProperties);
    }
    getDefinition() {
        return this.defines;
    }
    static is(value) {
        return value instanceof ContributedTask;
    }
    getMapKey() {
        const workspaceFolder = this._source.workspaceFolder;
        return workspaceFolder
            ? `${this._source.scope.toString()}|${workspaceFolder.uri.toString()}|${this._id}|${this.instance}`
            : `${this._source.scope.toString()}|${this._id}|${this.instance}`;
    }
    getFolderId() {
        if (this._source.scope === 3 /* TaskScope.Folder */ && this._source.workspaceFolder) {
            return this._source.workspaceFolder.uri.toString();
        }
        return undefined;
    }
    getKey() {
        const key = { type: 'contributed', scope: this._source.scope, id: this._id };
        key.folder = this.getFolderId();
        return JSON.stringify(key);
    }
    getWorkspaceFolder() {
        return this._source.workspaceFolder;
    }
    getTelemetryKind() {
        return 'extension';
    }
    fromObject(object) {
        return new ContributedTask(object._id, object._source, object._label, object.type, object.defines, object.command, object.hasDefinedMatchers, object.runOptions, object.configurationProperties);
    }
}
export class InMemoryTask extends CommonTask {
    constructor(id, source, label, type, runOptions, configurationProperties) {
        super(id, label, type, runOptions, configurationProperties, source);
        this._source = source;
    }
    clone() {
        return new InMemoryTask(this._id, this._source, this._label, this.type, this.runOptions, this.configurationProperties);
    }
    static is(value) {
        return value instanceof InMemoryTask;
    }
    getTelemetryKind() {
        return 'composite';
    }
    getMapKey() {
        return `${this._id}|${this.instance}`;
    }
    getFolderId() {
        return undefined;
    }
    fromObject(object) {
        return new InMemoryTask(object._id, object._source, object._label, object.type, object.runOptions, object.configurationProperties);
    }
}
export var ExecutionEngine;
(function (ExecutionEngine) {
    ExecutionEngine[ExecutionEngine["Process"] = 1] = "Process";
    ExecutionEngine[ExecutionEngine["Terminal"] = 2] = "Terminal";
})(ExecutionEngine || (ExecutionEngine = {}));
(function (ExecutionEngine) {
    ExecutionEngine._default = ExecutionEngine.Terminal;
})(ExecutionEngine || (ExecutionEngine = {}));
export var JsonSchemaVersion;
(function (JsonSchemaVersion) {
    JsonSchemaVersion[JsonSchemaVersion["V0_1_0"] = 1] = "V0_1_0";
    JsonSchemaVersion[JsonSchemaVersion["V2_0_0"] = 2] = "V2_0_0";
})(JsonSchemaVersion || (JsonSchemaVersion = {}));
export class TaskSorter {
    constructor(workspaceFolders) {
        this._order = new Map();
        for (let i = 0; i < workspaceFolders.length; i++) {
            this._order.set(workspaceFolders[i].uri.toString(), i);
        }
    }
    compare(a, b) {
        const aw = a.getWorkspaceFolder();
        const bw = b.getWorkspaceFolder();
        if (aw && bw) {
            let ai = this._order.get(aw.uri.toString());
            ai = ai === undefined ? 0 : ai + 1;
            let bi = this._order.get(bw.uri.toString());
            bi = bi === undefined ? 0 : bi + 1;
            if (ai === bi) {
                return a._label.localeCompare(b._label);
            }
            else {
                return ai - bi;
            }
        }
        else if (!aw && bw) {
            return -1;
        }
        else if (aw && !bw) {
            return +1;
        }
        else {
            return 0;
        }
    }
}
export var TaskRunType;
(function (TaskRunType) {
    TaskRunType["SingleRun"] = "singleRun";
    TaskRunType["Background"] = "background";
})(TaskRunType || (TaskRunType = {}));
export var TaskEventKind;
(function (TaskEventKind) {
    /** Indicates that a task's properties or configuration have changed */
    TaskEventKind["Changed"] = "changed";
    /** Indicates that a task has begun executing */
    TaskEventKind["ProcessStarted"] = "processStarted";
    /** Indicates that a task process has completed */
    TaskEventKind["ProcessEnded"] = "processEnded";
    /** Indicates that a task was terminated, either by user action or by the system */
    TaskEventKind["Terminated"] = "terminated";
    /** Indicates that a task has started running */
    TaskEventKind["Start"] = "start";
    /** Indicates that a task has acquired all needed input/variables to execute */
    TaskEventKind["AcquiredInput"] = "acquiredInput";
    /** Indicates that a dependent task has started */
    TaskEventKind["DependsOnStarted"] = "dependsOnStarted";
    /** Indicates that a task is actively running/processing */
    TaskEventKind["Active"] = "active";
    /** Indicates that a task is paused/waiting but not complete */
    TaskEventKind["Inactive"] = "inactive";
    /** Indicates that a task has completed fully */
    TaskEventKind["End"] = "end";
    /** Indicates that a task's problem matcher has started */
    TaskEventKind["ProblemMatcherStarted"] = "problemMatcherStarted";
    /** Indicates that a task's problem matcher has ended */
    TaskEventKind["ProblemMatcherEnded"] = "problemMatcherEnded";
    /** Indicates that a task's problem matcher has found errors */
    TaskEventKind["ProblemMatcherFoundErrors"] = "problemMatcherFoundErrors";
})(TaskEventKind || (TaskEventKind = {}));
export var TaskRunSource;
(function (TaskRunSource) {
    TaskRunSource[TaskRunSource["System"] = 0] = "System";
    TaskRunSource[TaskRunSource["User"] = 1] = "User";
    TaskRunSource[TaskRunSource["FolderOpen"] = 2] = "FolderOpen";
    TaskRunSource[TaskRunSource["ConfigurationChange"] = 3] = "ConfigurationChange";
    TaskRunSource[TaskRunSource["Reconnect"] = 4] = "Reconnect";
})(TaskRunSource || (TaskRunSource = {}));
export var TaskEvent;
(function (TaskEvent) {
    function common(task) {
        return {
            taskId: task._id,
            taskName: task.configurationProperties.name,
            runType: task.configurationProperties.isBackground ? "background" /* TaskRunType.Background */ : "singleRun" /* TaskRunType.SingleRun */,
            group: task.configurationProperties.group,
            __task: task,
        };
    }
    function start(task, terminalId, resolvedVariables) {
        return {
            ...common(task),
            kind: TaskEventKind.Start,
            terminalId,
            resolvedVariables,
        };
    }
    TaskEvent.start = start;
    function processStarted(task, terminalId, processId) {
        return {
            ...common(task),
            kind: TaskEventKind.ProcessStarted,
            terminalId,
            processId,
        };
    }
    TaskEvent.processStarted = processStarted;
    function processEnded(task, terminalId, exitCode) {
        return {
            ...common(task),
            kind: TaskEventKind.ProcessEnded,
            terminalId,
            exitCode,
        };
    }
    TaskEvent.processEnded = processEnded;
    function terminated(task, terminalId, exitReason) {
        return {
            ...common(task),
            kind: TaskEventKind.Terminated,
            exitReason,
            terminalId,
        };
    }
    TaskEvent.terminated = terminated;
    function general(kind, task, terminalId) {
        return {
            ...common(task),
            kind,
            terminalId,
        };
    }
    TaskEvent.general = general;
    function changed() {
        return { kind: TaskEventKind.Changed };
    }
    TaskEvent.changed = changed;
})(TaskEvent || (TaskEvent = {}));
export var KeyedTaskIdentifier;
(function (KeyedTaskIdentifier) {
    function sortedStringify(literal) {
        const keys = Object.keys(literal).sort();
        let result = '';
        for (const key of keys) {
            let stringified = literal[key];
            if (stringified instanceof Object) {
                stringified = sortedStringify(stringified);
            }
            else if (typeof stringified === 'string') {
                stringified = stringified.replace(/,/g, ',,');
            }
            result += key + ',' + stringified + ',';
        }
        return result;
    }
    function create(value) {
        const resultKey = sortedStringify(value);
        const result = { _key: resultKey, type: value.taskType };
        Object.assign(result, value);
        return result;
    }
    KeyedTaskIdentifier.create = create;
})(KeyedTaskIdentifier || (KeyedTaskIdentifier = {}));
export var TaskSettingId;
(function (TaskSettingId) {
    TaskSettingId["AutoDetect"] = "task.autoDetect";
    TaskSettingId["SaveBeforeRun"] = "task.saveBeforeRun";
    TaskSettingId["ShowDecorations"] = "task.showDecorations";
    TaskSettingId["ProblemMatchersNeverPrompt"] = "task.problemMatchers.neverPrompt";
    TaskSettingId["SlowProviderWarning"] = "task.slowProviderWarning";
    TaskSettingId["QuickOpenHistory"] = "task.quickOpen.history";
    TaskSettingId["QuickOpenDetail"] = "task.quickOpen.detail";
    TaskSettingId["QuickOpenSkip"] = "task.quickOpen.skip";
    TaskSettingId["QuickOpenShowAll"] = "task.quickOpen.showAll";
    TaskSettingId["AllowAutomaticTasks"] = "task.allowAutomaticTasks";
    TaskSettingId["Reconnection"] = "task.reconnection";
    TaskSettingId["VerboseLogging"] = "task.verboseLogging";
})(TaskSettingId || (TaskSettingId = {}));
export var TasksSchemaProperties;
(function (TasksSchemaProperties) {
    TasksSchemaProperties["Tasks"] = "tasks";
    TasksSchemaProperties["SuppressTaskName"] = "tasks.suppressTaskName";
    TasksSchemaProperties["Windows"] = "tasks.windows";
    TasksSchemaProperties["Osx"] = "tasks.osx";
    TasksSchemaProperties["Linux"] = "tasks.linux";
    TasksSchemaProperties["ShowOutput"] = "tasks.showOutput";
    TasksSchemaProperties["IsShellCommand"] = "tasks.isShellCommand";
    TasksSchemaProperties["ServiceTestSetting"] = "tasks.service.testSetting";
})(TasksSchemaProperties || (TasksSchemaProperties = {}));
export var TaskDefinition;
(function (TaskDefinition) {
    function createTaskIdentifier(external, reporter) {
        const definition = TaskDefinitionRegistry.get(external.type);
        if (definition === undefined) {
            // We have no task definition so we can't sanitize the literal. Take it as is
            const copy = Objects.deepClone(external);
            delete copy._key;
            return KeyedTaskIdentifier.create(copy);
        }
        const literal = Object.create(null);
        literal.type = definition.taskType;
        const required = new Set();
        definition.required.forEach(element => required.add(element));
        const properties = definition.properties;
        for (const property of Object.keys(properties)) {
            const value = external[property];
            if (value !== undefined && value !== null) {
                literal[property] = value;
            }
            else if (required.has(property)) {
                const schema = properties[property];
                if (schema.default !== undefined) {
                    literal[property] = Objects.deepClone(schema.default);
                }
                else {
                    switch (schema.type) {
                        case 'boolean':
                            literal[property] = false;
                            break;
                        case 'number':
                        case 'integer':
                            literal[property] = 0;
                            break;
                        case 'string':
                            literal[property] = '';
                            break;
                        default:
                            reporter.error(nls.localize('TaskDefinition.missingRequiredProperty', 'Error: the task identifier \'{0}\' is missing the required property \'{1}\'. The task identifier will be ignored.', JSON.stringify(external, undefined, 0), property));
                            return undefined;
                    }
                }
            }
        }
        return KeyedTaskIdentifier.create(literal);
    }
    TaskDefinition.createTaskIdentifier = createTaskIdentifier;
})(TaskDefinition || (TaskDefinition = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFza3MuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGFza3MvY29tbW9uL3Rhc2tzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUM7QUFDMUMsT0FBTyxLQUFLLEtBQUssTUFBTSxrQ0FBa0MsQ0FBQztBQUMxRCxPQUFPLEtBQUssU0FBUyxNQUFNLHNDQUFzQyxDQUFDO0FBRWxFLE9BQU8sS0FBSyxPQUFPLE1BQU0sb0NBQW9DLENBQUM7QUFLOUQsT0FBTyxFQUFFLGFBQWEsRUFBd0IsTUFBTSxzREFBc0QsQ0FBQztBQUMzRyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQU9yRSxNQUFNLENBQUMsTUFBTSxvQkFBb0IsR0FBRyxVQUFVLENBQUM7QUFFL0MsTUFBTSxDQUFDLE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxhQUFhLENBQVUsYUFBYSxFQUFFLEtBQUssRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLDBCQUEwQixFQUFFLHNDQUFzQyxDQUFDLENBQUMsQ0FBQztBQUNySyxzREFBc0Q7QUFDdEQsTUFBTSxDQUFDLE1BQU0sb0JBQW9CLEdBQUcsSUFBSSxhQUFhLENBQVUsb0JBQW9CLEVBQUUsS0FBSyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsb0JBQW9CLEVBQUUsaURBQWlELENBQUMsQ0FBQyxDQUFDO0FBQ25MLE1BQU0sQ0FBQyxNQUFNLGNBQWMsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLGVBQWUsRUFBRSxPQUFPLENBQUMsQ0FBQztBQUV0RSxNQUFNLENBQU4sSUFBWSxZQWVYO0FBZkQsV0FBWSxZQUFZO0lBQ3ZCOztPQUVHO0lBQ0gsbURBQVUsQ0FBQTtJQUVWOztP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