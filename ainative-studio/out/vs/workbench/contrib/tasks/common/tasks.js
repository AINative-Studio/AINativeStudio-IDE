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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFza3MuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90YXNrcy9jb21tb24vdGFza3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQztBQUMxQyxPQUFPLEtBQUssS0FBSyxNQUFNLGtDQUFrQyxDQUFDO0FBQzFELE9BQU8sS0FBSyxTQUFTLE1BQU0sc0NBQXNDLENBQUM7QUFFbEUsT0FBTyxLQUFLLE9BQU8sTUFBTSxvQ0FBb0MsQ0FBQztBQUs5RCxPQUFPLEVBQUUsYUFBYSxFQUF3QixNQUFNLHNEQUFzRCxDQUFDO0FBQzNHLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBT3JFLE1BQU0sQ0FBQyxNQUFNLG9CQUFvQixHQUFHLFVBQVUsQ0FBQztBQUUvQyxNQUFNLENBQUMsTUFBTSxrQkFBa0IsR0FBRyxJQUFJLGFBQWEsQ0FBVSxhQUFhLEVBQUUsS0FBSyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsMEJBQTBCLEVBQUUsc0NBQXNDLENBQUMsQ0FBQyxDQUFDO0FBQ3JLLHNEQUFzRDtBQUN0RCxNQUFNLENBQUMsTUFBTSxvQkFBb0IsR0FBRyxJQUFJLGFBQWEsQ0FBVSxvQkFBb0IsRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxvQkFBb0IsRUFBRSxpREFBaUQsQ0FBQyxDQUFDLENBQUM7QUFDbkwsTUFBTSxDQUFDLE1BQU0sY0FBYyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsZUFBZSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0FBRXRFLE1BQU0sQ0FBTixJQUFZLFlBZVg7QUFmRCxXQUFZLFlBQVk7SUFDdkI7O09BRUc7SUFDSCxtREFBVSxDQUFBO0lBRVY7O09B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