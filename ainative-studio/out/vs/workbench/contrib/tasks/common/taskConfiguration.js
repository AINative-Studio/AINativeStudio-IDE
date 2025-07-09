/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import * as Objects from '../../../../base/common/objects.js';
import * as Types from '../../../../base/common/types.js';
import * as UUID from '../../../../base/common/uuid.js';
import { ProblemMatcherParser, isNamedProblemMatcher, ProblemMatcherRegistry } from './problemMatcher.js';
import * as Tasks from './tasks.js';
import { TaskDefinitionRegistry } from './taskDefinitionRegistry.js';
import { ShellExecutionSupportedContext, ProcessExecutionSupportedContext } from './taskService.js';
export var ShellQuoting;
(function (ShellQuoting) {
    /**
     * Default is character escaping.
     */
    ShellQuoting[ShellQuoting["escape"] = 1] = "escape";
    /**
     * Default is strong quoting
     */
    ShellQuoting[ShellQuoting["strong"] = 2] = "strong";
    /**
     * Default is weak quoting.
     */
    ShellQuoting[ShellQuoting["weak"] = 3] = "weak";
})(ShellQuoting || (ShellQuoting = {}));
export var ITaskIdentifier;
(function (ITaskIdentifier) {
    function is(value) {
        const candidate = value;
        return candidate !== undefined && Types.isString(value.type);
    }
    ITaskIdentifier.is = is;
})(ITaskIdentifier || (ITaskIdentifier = {}));
export var CommandString;
(function (CommandString) {
    function value(value) {
        if (Types.isString(value)) {
            return value;
        }
        else if (Types.isStringArray(value)) {
            return value.join(' ');
        }
        else {
            if (Types.isString(value.value)) {
                return value.value;
            }
            else {
                return value.value.join(' ');
            }
        }
    }
    CommandString.value = value;
})(CommandString || (CommandString = {}));
var ProblemMatcherKind;
(function (ProblemMatcherKind) {
    ProblemMatcherKind[ProblemMatcherKind["Unknown"] = 0] = "Unknown";
    ProblemMatcherKind[ProblemMatcherKind["String"] = 1] = "String";
    ProblemMatcherKind[ProblemMatcherKind["ProblemMatcher"] = 2] = "ProblemMatcher";
    ProblemMatcherKind[ProblemMatcherKind["Array"] = 3] = "Array";
})(ProblemMatcherKind || (ProblemMatcherKind = {}));
const EMPTY_ARRAY = [];
Object.freeze(EMPTY_ARRAY);
function assignProperty(target, source, key) {
    const sourceAtKey = source[key];
    if (sourceAtKey !== undefined) {
        target[key] = sourceAtKey;
    }
}
function fillProperty(target, source, key) {
    const sourceAtKey = source[key];
    if (target[key] === undefined && sourceAtKey !== undefined) {
        target[key] = sourceAtKey;
    }
}
function _isEmpty(value, properties, allowEmptyArray = false) {
    if (value === undefined || value === null || properties === undefined) {
        return true;
    }
    for (const meta of properties) {
        const property = value[meta.property];
        if (property !== undefined && property !== null) {
            if (meta.type !== undefined && !meta.type.isEmpty(property)) {
                return false;
            }
            else if (!Array.isArray(property) || (property.length > 0) || allowEmptyArray) {
                return false;
            }
        }
    }
    return true;
}
function _assignProperties(target, source, properties) {
    if (!source || _isEmpty(source, properties)) {
        return target;
    }
    if (!target || _isEmpty(target, properties)) {
        return source;
    }
    for (const meta of properties) {
        const property = meta.property;
        let value;
        if (meta.type !== undefined) {
            value = meta.type.assignProperties(target[property], source[property]);
        }
        else {
            value = source[property];
        }
        if (value !== undefined && value !== null) {
            target[property] = value;
        }
    }
    return target;
}
function _fillProperties(target, source, properties, allowEmptyArray = false) {
    if (!source || _isEmpty(source, properties)) {
        return target;
    }
    if (!target || _isEmpty(target, properties, allowEmptyArray)) {
        return source;
    }
    for (const meta of properties) {
        const property = meta.property;
        let value;
        if (meta.type) {
            value = meta.type.fillProperties(target[property], source[property]);
        }
        else if (target[property] === undefined) {
            value = source[property];
        }
        if (value !== undefined && value !== null) {
            target[property] = value;
        }
    }
    return target;
}
function _fillDefaults(target, defaults, properties, context) {
    if (target && Object.isFrozen(target)) {
        return target;
    }
    if (target === undefined || target === null || defaults === undefined || defaults === null) {
        if (defaults !== undefined && defaults !== null) {
            return Objects.deepClone(defaults);
        }
        else {
            return undefined;
        }
    }
    for (const meta of properties) {
        const property = meta.property;
        if (target[property] !== undefined) {
            continue;
        }
        let value;
        if (meta.type) {
            value = meta.type.fillDefaults(target[property], context);
        }
        else {
            value = defaults[property];
        }
        if (value !== undefined && value !== null) {
            target[property] = value;
        }
    }
    return target;
}
function _freeze(target, properties) {
    if (target === undefined || target === null) {
        return undefined;
    }
    if (Object.isFrozen(target)) {
        return target;
    }
    for (const meta of properties) {
        if (meta.type) {
            const value = target[meta.property];
            if (value) {
                meta.type.freeze(value);
            }
        }
    }
    Object.freeze(target);
    return target;
}
export var RunOnOptions;
(function (RunOnOptions) {
    function fromString(value) {
        if (!value) {
            return Tasks.RunOnOptions.default;
        }
        switch (value.toLowerCase()) {
            case 'folderopen':
                return Tasks.RunOnOptions.folderOpen;
            case 'default':
            default:
                return Tasks.RunOnOptions.default;
        }
    }
    RunOnOptions.fromString = fromString;
})(RunOnOptions || (RunOnOptions = {}));
export var RunOptions;
(function (RunOptions) {
    const properties = [{ property: 'reevaluateOnRerun' }, { property: 'runOn' }, { property: 'instanceLimit' }];
    function fromConfiguration(value) {
        return {
            reevaluateOnRerun: value ? value.reevaluateOnRerun : true,
            runOn: value ? RunOnOptions.fromString(value.runOn) : Tasks.RunOnOptions.default,
            instanceLimit: value ? value.instanceLimit : 1
        };
    }
    RunOptions.fromConfiguration = fromConfiguration;
    function assignProperties(target, source) {
        return _assignProperties(target, source, properties);
    }
    RunOptions.assignProperties = assignProperties;
    function fillProperties(target, source) {
        return _fillProperties(target, source, properties);
    }
    RunOptions.fillProperties = fillProperties;
})(RunOptions || (RunOptions = {}));
var ShellConfiguration;
(function (ShellConfiguration) {
    const properties = [{ property: 'executable' }, { property: 'args' }, { property: 'quoting' }];
    function is(value) {
        const candidate = value;
        return candidate && (Types.isString(candidate.executable) || Types.isStringArray(candidate.args));
    }
    ShellConfiguration.is = is;
    function from(config, context) {
        if (!is(config)) {
            return undefined;
        }
        const result = {};
        if (config.executable !== undefined) {
            result.executable = config.executable;
        }
        if (config.args !== undefined) {
            result.args = config.args.slice();
        }
        if (config.quoting !== undefined) {
            result.quoting = Objects.deepClone(config.quoting);
        }
        return result;
    }
    ShellConfiguration.from = from;
    function isEmpty(value) {
        return _isEmpty(value, properties, true);
    }
    ShellConfiguration.isEmpty = isEmpty;
    function assignProperties(target, source) {
        return _assignProperties(target, source, properties);
    }
    ShellConfiguration.assignProperties = assignProperties;
    function fillProperties(target, source) {
        return _fillProperties(target, source, properties, true);
    }
    ShellConfiguration.fillProperties = fillProperties;
    function fillDefaults(value, context) {
        return value;
    }
    ShellConfiguration.fillDefaults = fillDefaults;
    function freeze(value) {
        if (!value) {
            return undefined;
        }
        return Object.freeze(value);
    }
    ShellConfiguration.freeze = freeze;
})(ShellConfiguration || (ShellConfiguration = {}));
var CommandOptions;
(function (CommandOptions) {
    const properties = [{ property: 'cwd' }, { property: 'env' }, { property: 'shell', type: ShellConfiguration }];
    const defaults = { cwd: '${workspaceFolder}' };
    function from(options, context) {
        const result = {};
        if (options.cwd !== undefined) {
            if (Types.isString(options.cwd)) {
                result.cwd = options.cwd;
            }
            else {
                context.taskLoadIssues.push(nls.localize('ConfigurationParser.invalidCWD', 'Warning: options.cwd must be of type string. Ignoring value {0}\n', options.cwd));
            }
        }
        if (options.env !== undefined) {
            result.env = Objects.deepClone(options.env);
        }
        result.shell = ShellConfiguration.from(options.shell, context);
        return isEmpty(result) ? undefined : result;
    }
    CommandOptions.from = from;
    function isEmpty(value) {
        return _isEmpty(value, properties);
    }
    CommandOptions.isEmpty = isEmpty;
    function assignProperties(target, source) {
        if ((source === undefined) || isEmpty(source)) {
            return target;
        }
        if ((target === undefined) || isEmpty(target)) {
            return source;
        }
        assignProperty(target, source, 'cwd');
        if (target.env === undefined) {
            target.env = source.env;
        }
        else if (source.env !== undefined) {
            const env = Object.create(null);
            if (target.env !== undefined) {
                Object.keys(target.env).forEach(key => env[key] = target.env[key]);
            }
            if (source.env !== undefined) {
                Object.keys(source.env).forEach(key => env[key] = source.env[key]);
            }
            target.env = env;
        }
        target.shell = ShellConfiguration.assignProperties(target.shell, source.shell);
        return target;
    }
    CommandOptions.assignProperties = assignProperties;
    function fillProperties(target, source) {
        return _fillProperties(target, source, properties);
    }
    CommandOptions.fillProperties = fillProperties;
    function fillDefaults(value, context) {
        return _fillDefaults(value, defaults, properties, context);
    }
    CommandOptions.fillDefaults = fillDefaults;
    function freeze(value) {
        return _freeze(value, properties);
    }
    CommandOptions.freeze = freeze;
})(CommandOptions || (CommandOptions = {}));
var CommandConfiguration;
(function (CommandConfiguration) {
    let PresentationOptions;
    (function (PresentationOptions) {
        const properties = [{ property: 'echo' }, { property: 'reveal' }, { property: 'revealProblems' }, { property: 'focus' }, { property: 'panel' }, { property: 'showReuseMessage' }, { property: 'clear' }, { property: 'group' }, { property: 'close' }];
        function from(config, context) {
            let echo;
            let reveal;
            let revealProblems;
            let focus;
            let panel;
            let showReuseMessage;
            let clear;
            let group;
            let close;
            let hasProps = false;
            if (Types.isBoolean(config.echoCommand)) {
                echo = config.echoCommand;
                hasProps = true;
            }
            if (Types.isString(config.showOutput)) {
                reveal = Tasks.RevealKind.fromString(config.showOutput);
                hasProps = true;
            }
            const presentation = config.presentation || config.terminal;
            if (presentation) {
                if (Types.isBoolean(presentation.echo)) {
                    echo = presentation.echo;
                }
                if (Types.isString(presentation.reveal)) {
                    reveal = Tasks.RevealKind.fromString(presentation.reveal);
                }
                if (Types.isString(presentation.revealProblems)) {
                    revealProblems = Tasks.RevealProblemKind.fromString(presentation.revealProblems);
                }
                if (Types.isBoolean(presentation.focus)) {
                    focus = presentation.focus;
                }
                if (Types.isString(presentation.panel)) {
                    panel = Tasks.PanelKind.fromString(presentation.panel);
                }
                if (Types.isBoolean(presentation.showReuseMessage)) {
                    showReuseMessage = presentation.showReuseMessage;
                }
                if (Types.isBoolean(presentation.clear)) {
                    clear = presentation.clear;
                }
                if (Types.isString(presentation.group)) {
                    group = presentation.group;
                }
                if (Types.isBoolean(presentation.close)) {
                    close = presentation.close;
                }
                hasProps = true;
            }
            if (!hasProps) {
                return undefined;
            }
            return { echo: echo, reveal: reveal, revealProblems: revealProblems, focus: focus, panel: panel, showReuseMessage: showReuseMessage, clear: clear, group, close: close };
        }
        PresentationOptions.from = from;
        function assignProperties(target, source) {
            return _assignProperties(target, source, properties);
        }
        PresentationOptions.assignProperties = assignProperties;
        function fillProperties(target, source) {
            return _fillProperties(target, source, properties);
        }
        PresentationOptions.fillProperties = fillProperties;
        function fillDefaults(value, context) {
            const defaultEcho = context.engine === Tasks.ExecutionEngine.Terminal ? true : false;
            return _fillDefaults(value, { echo: defaultEcho, reveal: Tasks.RevealKind.Always, revealProblems: Tasks.RevealProblemKind.Never, focus: false, panel: Tasks.PanelKind.Shared, showReuseMessage: true, clear: false }, properties, context);
        }
        PresentationOptions.fillDefaults = fillDefaults;
        function freeze(value) {
            return _freeze(value, properties);
        }
        PresentationOptions.freeze = freeze;
        function isEmpty(value) {
            return _isEmpty(value, properties);
        }
        PresentationOptions.isEmpty = isEmpty;
    })(PresentationOptions = CommandConfiguration.PresentationOptions || (CommandConfiguration.PresentationOptions = {}));
    let ShellString;
    (function (ShellString) {
        function from(value) {
            if (value === undefined || value === null) {
                return undefined;
            }
            if (Types.isString(value)) {
                return value;
            }
            else if (Types.isStringArray(value)) {
                return value.join(' ');
            }
            else {
                const quoting = Tasks.ShellQuoting.from(value.quoting);
                const result = Types.isString(value.value) ? value.value : Types.isStringArray(value.value) ? value.value.join(' ') : undefined;
                if (result) {
                    return {
                        value: result,
                        quoting: quoting
                    };
                }
                else {
                    return undefined;
                }
            }
        }
        ShellString.from = from;
    })(ShellString || (ShellString = {}));
    const properties = [
        { property: 'runtime' }, { property: 'name' }, { property: 'options', type: CommandOptions },
        { property: 'args' }, { property: 'taskSelector' }, { property: 'suppressTaskName' },
        { property: 'presentation', type: PresentationOptions }
    ];
    function from(config, context) {
        let result = fromBase(config, context);
        let osConfig = undefined;
        if (config.windows && context.platform === 3 /* Platform.Windows */) {
            osConfig = fromBase(config.windows, context);
        }
        else if (config.osx && context.platform === 1 /* Platform.Mac */) {
            osConfig = fromBase(config.osx, context);
        }
        else if (config.linux && context.platform === 2 /* Platform.Linux */) {
            osConfig = fromBase(config.linux, context);
        }
        if (osConfig) {
            result = assignProperties(result, osConfig, context.schemaVersion === 2 /* Tasks.JsonSchemaVersion.V2_0_0 */);
        }
        return isEmpty(result) ? undefined : result;
    }
    CommandConfiguration.from = from;
    function fromBase(config, context) {
        const name = ShellString.from(config.command);
        let runtime;
        if (Types.isString(config.type)) {
            if (config.type === 'shell' || config.type === 'process') {
                runtime = Tasks.RuntimeType.fromString(config.type);
            }
        }
        if (Types.isBoolean(config.isShellCommand) || ShellConfiguration.is(config.isShellCommand)) {
            runtime = Tasks.RuntimeType.Shell;
        }
        else if (config.isShellCommand !== undefined) {
            runtime = !!config.isShellCommand ? Tasks.RuntimeType.Shell : Tasks.RuntimeType.Process;
        }
        const result = {
            name: name,
            runtime: runtime,
            presentation: PresentationOptions.from(config, context)
        };
        if (config.args !== undefined) {
            result.args = [];
            for (const arg of config.args) {
                const converted = ShellString.from(arg);
                if (converted !== undefined) {
                    result.args.push(converted);
                }
                else {
                    context.taskLoadIssues.push(nls.localize('ConfigurationParser.inValidArg', 'Error: command argument must either be a string or a quoted string. Provided value is:\n{0}', arg ? JSON.stringify(arg, undefined, 4) : 'undefined'));
                }
            }
        }
        if (config.options !== undefined) {
            result.options = CommandOptions.from(config.options, context);
            if (result.options && result.options.shell === undefined && ShellConfiguration.is(config.isShellCommand)) {
                result.options.shell = ShellConfiguration.from(config.isShellCommand, context);
                if (context.engine !== Tasks.ExecutionEngine.Terminal) {
                    context.taskLoadIssues.push(nls.localize('ConfigurationParser.noShell', 'Warning: shell configuration is only supported when executing tasks in the terminal.'));
                }
            }
        }
        if (Types.isString(config.taskSelector)) {
            result.taskSelector = config.taskSelector;
        }
        if (Types.isBoolean(config.suppressTaskName)) {
            result.suppressTaskName = config.suppressTaskName;
        }
        return isEmpty(result) ? undefined : result;
    }
    function hasCommand(value) {
        return value && !!value.name;
    }
    CommandConfiguration.hasCommand = hasCommand;
    function isEmpty(value) {
        return _isEmpty(value, properties);
    }
    CommandConfiguration.isEmpty = isEmpty;
    function assignProperties(target, source, overwriteArgs) {
        if (isEmpty(source)) {
            return target;
        }
        if (isEmpty(target)) {
            return source;
        }
        assignProperty(target, source, 'name');
        assignProperty(target, source, 'runtime');
        assignProperty(target, source, 'taskSelector');
        assignProperty(target, source, 'suppressTaskName');
        if (source.args !== undefined) {
            if (target.args === undefined || overwriteArgs) {
                target.args = source.args;
            }
            else {
                target.args = target.args.concat(source.args);
            }
        }
        target.presentation = PresentationOptions.assignProperties(target.presentation, source.presentation);
        target.options = CommandOptions.assignProperties(target.options, source.options);
        return target;
    }
    CommandConfiguration.assignProperties = assignProperties;
    function fillProperties(target, source) {
        return _fillProperties(target, source, properties);
    }
    CommandConfiguration.fillProperties = fillProperties;
    function fillGlobals(target, source, taskName) {
        if ((source === undefined) || isEmpty(source)) {
            return target;
        }
        target = target || {
            name: undefined,
            runtime: undefined,
            presentation: undefined
        };
        if (target.name === undefined) {
            fillProperty(target, source, 'name');
            fillProperty(target, source, 'taskSelector');
            fillProperty(target, source, 'suppressTaskName');
            let args = source.args ? source.args.slice() : [];
            if (!target.suppressTaskName && taskName) {
                if (target.taskSelector !== undefined) {
                    args.push(target.taskSelector + taskName);
                }
                else {
                    args.push(taskName);
                }
            }
            if (target.args) {
                args = args.concat(target.args);
            }
            target.args = args;
        }
        fillProperty(target, source, 'runtime');
        target.presentation = PresentationOptions.fillProperties(target.presentation, source.presentation);
        target.options = CommandOptions.fillProperties(target.options, source.options);
        return target;
    }
    CommandConfiguration.fillGlobals = fillGlobals;
    function fillDefaults(value, context) {
        if (!value || Object.isFrozen(value)) {
            return;
        }
        if (value.name !== undefined && value.runtime === undefined) {
            value.runtime = Tasks.RuntimeType.Process;
        }
        value.presentation = PresentationOptions.fillDefaults(value.presentation, context);
        if (!isEmpty(value)) {
            value.options = CommandOptions.fillDefaults(value.options, context);
        }
        if (value.args === undefined) {
            value.args = EMPTY_ARRAY;
        }
        if (value.suppressTaskName === undefined) {
            value.suppressTaskName = (context.schemaVersion === 2 /* Tasks.JsonSchemaVersion.V2_0_0 */);
        }
    }
    CommandConfiguration.fillDefaults = fillDefaults;
    function freeze(value) {
        return _freeze(value, properties);
    }
    CommandConfiguration.freeze = freeze;
})(CommandConfiguration || (CommandConfiguration = {}));
export var ProblemMatcherConverter;
(function (ProblemMatcherConverter) {
    function namedFrom(declares, context) {
        const result = Object.create(null);
        if (!Array.isArray(declares)) {
            return result;
        }
        declares.forEach((value) => {
            const namedProblemMatcher = (new ProblemMatcherParser(context.problemReporter)).parse(value);
            if (isNamedProblemMatcher(namedProblemMatcher)) {
                result[namedProblemMatcher.name] = namedProblemMatcher;
            }
            else {
                context.problemReporter.error(nls.localize('ConfigurationParser.noName', 'Error: Problem Matcher in declare scope must have a name:\n{0}\n', JSON.stringify(value, undefined, 4)));
            }
        });
        return result;
    }
    ProblemMatcherConverter.namedFrom = namedFrom;
    function fromWithOsConfig(external, context) {
        let result = {};
        if (external.windows && external.windows.problemMatcher && context.platform === 3 /* Platform.Windows */) {
            result = from(external.windows.problemMatcher, context);
        }
        else if (external.osx && external.osx.problemMatcher && context.platform === 1 /* Platform.Mac */) {
            result = from(external.osx.problemMatcher, context);
        }
        else if (external.linux && external.linux.problemMatcher && context.platform === 2 /* Platform.Linux */) {
            result = from(external.linux.problemMatcher, context);
        }
        else if (external.problemMatcher) {
            result = from(external.problemMatcher, context);
        }
        return result;
    }
    ProblemMatcherConverter.fromWithOsConfig = fromWithOsConfig;
    function from(config, context) {
        const result = [];
        if (config === undefined) {
            return { value: result };
        }
        const errors = [];
        function addResult(matcher) {
            if (matcher.value) {
                result.push(matcher.value);
            }
            if (matcher.errors) {
                errors.push(...matcher.errors);
            }
        }
        const kind = getProblemMatcherKind(config);
        if (kind === ProblemMatcherKind.Unknown) {
            const error = nls.localize('ConfigurationParser.unknownMatcherKind', 'Warning: the defined problem matcher is unknown. Supported types are string | ProblemMatcher | Array<string | ProblemMatcher>.\n{0}\n', JSON.stringify(config, null, 4));
            context.problemReporter.warn(error);
        }
        else if (kind === ProblemMatcherKind.String || kind === ProblemMatcherKind.ProblemMatcher) {
            addResult(resolveProblemMatcher(config, context));
        }
        else if (kind === ProblemMatcherKind.Array) {
            const problemMatchers = config;
            problemMatchers.forEach(problemMatcher => {
                addResult(resolveProblemMatcher(problemMatcher, context));
            });
        }
        return { value: result, errors };
    }
    ProblemMatcherConverter.from = from;
    function getProblemMatcherKind(value) {
        if (Types.isString(value)) {
            return ProblemMatcherKind.String;
        }
        else if (Array.isArray(value)) {
            return ProblemMatcherKind.Array;
        }
        else if (!Types.isUndefined(value)) {
            return ProblemMatcherKind.ProblemMatcher;
        }
        else {
            return ProblemMatcherKind.Unknown;
        }
    }
    function resolveProblemMatcher(value, context) {
        if (Types.isString(value)) {
            let variableName = value;
            if (variableName.length > 1 && variableName[0] === '$') {
                variableName = variableName.substring(1);
                const global = ProblemMatcherRegistry.get(variableName);
                if (global) {
                    return { value: Objects.deepClone(global) };
                }
                let localProblemMatcher = context.namedProblemMatchers[variableName];
                if (localProblemMatcher) {
                    localProblemMatcher = Objects.deepClone(localProblemMatcher);
                    // remove the name
                    delete localProblemMatcher.name;
                    return { value: localProblemMatcher };
                }
            }
            return { errors: [nls.localize('ConfigurationParser.invalidVariableReference', 'Error: Invalid problemMatcher reference: {0}\n', value)] };
        }
        else {
            const json = value;
            return { value: new ProblemMatcherParser(context.problemReporter).parse(json) };
        }
    }
})(ProblemMatcherConverter || (ProblemMatcherConverter = {}));
export var GroupKind;
(function (GroupKind) {
    function from(external) {
        if (external === undefined) {
            return undefined;
        }
        else if (Types.isString(external) && Tasks.TaskGroup.is(external)) {
            return { _id: external, isDefault: false };
        }
        else if (Types.isString(external.kind) && Tasks.TaskGroup.is(external.kind)) {
            const group = external.kind;
            const isDefault = Types.isUndefined(external.isDefault) ? false : external.isDefault;
            return { _id: group, isDefault };
        }
        return undefined;
    }
    GroupKind.from = from;
    function to(group) {
        if (Types.isString(group)) {
            return group;
        }
        else if (!group.isDefault) {
            return group._id;
        }
        return {
            kind: group._id,
            isDefault: group.isDefault,
        };
    }
    GroupKind.to = to;
})(GroupKind || (GroupKind = {}));
var TaskDependency;
(function (TaskDependency) {
    function uriFromSource(context, source) {
        switch (source) {
            case TaskConfigSource.User: return Tasks.USER_TASKS_GROUP_KEY;
            case TaskConfigSource.TasksJson: return context.workspaceFolder.uri;
            default: return context.workspace && context.workspace.configuration ? context.workspace.configuration : context.workspaceFolder.uri;
        }
    }
    function from(external, context, source) {
        if (Types.isString(external)) {
            return { uri: uriFromSource(context, source), task: external };
        }
        else if (ITaskIdentifier.is(external)) {
            return {
                uri: uriFromSource(context, source),
                task: Tasks.TaskDefinition.createTaskIdentifier(external, context.problemReporter)
            };
        }
        else {
            return undefined;
        }
    }
    TaskDependency.from = from;
})(TaskDependency || (TaskDependency = {}));
var DependsOrder;
(function (DependsOrder) {
    function from(order) {
        switch (order) {
            case "sequence" /* Tasks.DependsOrder.sequence */:
                return "sequence" /* Tasks.DependsOrder.sequence */;
            case "parallel" /* Tasks.DependsOrder.parallel */:
            default:
                return "parallel" /* Tasks.DependsOrder.parallel */;
        }
    }
    DependsOrder.from = from;
})(DependsOrder || (DependsOrder = {}));
var ConfigurationProperties;
(function (ConfigurationProperties) {
    const properties = [
        { property: 'name' },
        { property: 'identifier' },
        { property: 'group' },
        { property: 'isBackground' },
        { property: 'promptOnClose' },
        { property: 'dependsOn' },
        { property: 'presentation', type: CommandConfiguration.PresentationOptions },
        { property: 'problemMatchers' },
        { property: 'options' },
        { property: 'icon' },
        { property: 'hide' }
    ];
    function from(external, context, includeCommandOptions, source, properties) {
        if (!external) {
            return {};
        }
        const result = {};
        if (properties) {
            for (const propertyName of Object.keys(properties)) {
                if (external[propertyName] !== undefined) {
                    result[propertyName] = Objects.deepClone(external[propertyName]);
                }
            }
        }
        if (Types.isString(external.taskName)) {
            result.name = external.taskName;
        }
        if (Types.isString(external.label) && context.schemaVersion === 2 /* Tasks.JsonSchemaVersion.V2_0_0 */) {
            result.name = external.label;
        }
        if (Types.isString(external.identifier)) {
            result.identifier = external.identifier;
        }
        result.icon = external.icon;
        result.hide = external.hide;
        if (external.isBackground !== undefined) {
            result.isBackground = !!external.isBackground;
        }
        if (external.promptOnClose !== undefined) {
            result.promptOnClose = !!external.promptOnClose;
        }
        result.group = GroupKind.from(external.group);
        if (external.dependsOn !== undefined) {
            if (Array.isArray(external.dependsOn)) {
                result.dependsOn = external.dependsOn.reduce((dependencies, item) => {
                    const dependency = TaskDependency.from(item, context, source);
                    if (dependency) {
                        dependencies.push(dependency);
                    }
                    return dependencies;
                }, []);
            }
            else {
                const dependsOnValue = TaskDependency.from(external.dependsOn, context, source);
                result.dependsOn = dependsOnValue ? [dependsOnValue] : undefined;
            }
        }
        result.dependsOrder = DependsOrder.from(external.dependsOrder);
        if (includeCommandOptions && (external.presentation !== undefined || external.terminal !== undefined)) {
            result.presentation = CommandConfiguration.PresentationOptions.from(external, context);
        }
        if (includeCommandOptions && (external.options !== undefined)) {
            result.options = CommandOptions.from(external.options, context);
        }
        const configProblemMatcher = ProblemMatcherConverter.fromWithOsConfig(external, context);
        if (configProblemMatcher.value !== undefined) {
            result.problemMatchers = configProblemMatcher.value;
        }
        if (external.detail) {
            result.detail = external.detail;
        }
        return isEmpty(result) ? {} : { value: result, errors: configProblemMatcher.errors };
    }
    ConfigurationProperties.from = from;
    function isEmpty(value) {
        return _isEmpty(value, properties);
    }
    ConfigurationProperties.isEmpty = isEmpty;
})(ConfigurationProperties || (ConfigurationProperties = {}));
const label = 'Workspace';
var ConfiguringTask;
(function (ConfiguringTask) {
    const grunt = 'grunt.';
    const jake = 'jake.';
    const gulp = 'gulp.';
    const npm = 'vscode.npm.';
    const typescript = 'vscode.typescript.';
    function from(external, context, index, source, registry) {
        if (!external) {
            return undefined;
        }
        const type = external.type;
        const customize = external.customize;
        if (!type && !customize) {
            context.problemReporter.error(nls.localize('ConfigurationParser.noTaskType', 'Error: tasks configuration must have a type property. The configuration will be ignored.\n{0}\n', JSON.stringify(external, null, 4)));
            return undefined;
        }
        const typeDeclaration = type ? registry?.get?.(type) || TaskDefinitionRegistry.get(type) : undefined;
        if (!typeDeclaration) {
            const message = nls.localize('ConfigurationParser.noTypeDefinition', 'Error: there is no registered task type \'{0}\'. Did you miss installing an extension that provides a corresponding task provider?', type);
            context.problemReporter.error(message);
            return undefined;
        }
        let identifier;
        if (Types.isString(customize)) {
            if (customize.indexOf(grunt) === 0) {
                identifier = { type: 'grunt', task: customize.substring(grunt.length) };
            }
            else if (customize.indexOf(jake) === 0) {
                identifier = { type: 'jake', task: customize.substring(jake.length) };
            }
            else if (customize.indexOf(gulp) === 0) {
                identifier = { type: 'gulp', task: customize.substring(gulp.length) };
            }
            else if (customize.indexOf(npm) === 0) {
                identifier = { type: 'npm', script: customize.substring(npm.length + 4) };
            }
            else if (customize.indexOf(typescript) === 0) {
                identifier = { type: 'typescript', tsconfig: customize.substring(typescript.length + 6) };
            }
        }
        else {
            if (Types.isString(external.type)) {
                identifier = external;
            }
        }
        if (identifier === undefined) {
            context.problemReporter.error(nls.localize('ConfigurationParser.missingType', 'Error: the task configuration \'{0}\' is missing the required property \'type\'. The task configuration will be ignored.', JSON.stringify(external, undefined, 0)));
            return undefined;
        }
        const taskIdentifier = Tasks.TaskDefinition.createTaskIdentifier(identifier, context.problemReporter);
        if (taskIdentifier === undefined) {
            context.problemReporter.error(nls.localize('ConfigurationParser.incorrectType', 'Error: the task configuration \'{0}\' is using an unknown type. The task configuration will be ignored.', JSON.stringify(external, undefined, 0)));
            return undefined;
        }
        const configElement = {
            workspaceFolder: context.workspaceFolder,
            file: '.vscode/tasks.json',
            index,
            element: external
        };
        let taskSource;
        switch (source) {
            case TaskConfigSource.User: {
                taskSource = { kind: Tasks.TaskSourceKind.User, config: configElement, label };
                break;
            }
            case TaskConfigSource.WorkspaceFile: {
                taskSource = { kind: Tasks.TaskSourceKind.WorkspaceFile, config: configElement, label };
                break;
            }
            default: {
                taskSource = { kind: Tasks.TaskSourceKind.Workspace, config: configElement, label };
                break;
            }
        }
        const result = new Tasks.ConfiguringTask(`${typeDeclaration.extensionId}.${taskIdentifier._key}`, taskSource, undefined, type, taskIdentifier, RunOptions.fromConfiguration(external.runOptions), { hide: external.hide });
        const configuration = ConfigurationProperties.from(external, context, true, source, typeDeclaration.properties);
        result.addTaskLoadMessages(configuration.errors);
        if (configuration.value) {
            result.configurationProperties = Object.assign(result.configurationProperties, configuration.value);
            if (result.configurationProperties.name) {
                result._label = result.configurationProperties.name;
            }
            else {
                let label = result.configures.type;
                if (typeDeclaration.required && typeDeclaration.required.length > 0) {
                    for (const required of typeDeclaration.required) {
                        const value = result.configures[required];
                        if (value) {
                            label = label + ': ' + value;
                            break;
                        }
                    }
                }
                result._label = label;
            }
            if (!result.configurationProperties.identifier) {
                result.configurationProperties.identifier = taskIdentifier._key;
            }
        }
        return result;
    }
    ConfiguringTask.from = from;
})(ConfiguringTask || (ConfiguringTask = {}));
var CustomTask;
(function (CustomTask) {
    function from(external, context, index, source) {
        if (!external) {
            return undefined;
        }
        let type = external.type;
        if (type === undefined || type === null) {
            type = Tasks.CUSTOMIZED_TASK_TYPE;
        }
        if (type !== Tasks.CUSTOMIZED_TASK_TYPE && type !== 'shell' && type !== 'process') {
            context.problemReporter.error(nls.localize('ConfigurationParser.notCustom', 'Error: tasks is not declared as a custom task. The configuration will be ignored.\n{0}\n', JSON.stringify(external, null, 4)));
            return undefined;
        }
        let taskName = external.taskName;
        if (Types.isString(external.label) && context.schemaVersion === 2 /* Tasks.JsonSchemaVersion.V2_0_0 */) {
            taskName = external.label;
        }
        if (!taskName) {
            context.problemReporter.error(nls.localize('ConfigurationParser.noTaskName', 'Error: a task must provide a label property. The task will be ignored.\n{0}\n', JSON.stringify(external, null, 4)));
            return undefined;
        }
        let taskSource;
        switch (source) {
            case TaskConfigSource.User: {
                taskSource = { kind: Tasks.TaskSourceKind.User, config: { index, element: external, file: '.vscode/tasks.json', workspaceFolder: context.workspaceFolder }, label };
                break;
            }
            case TaskConfigSource.WorkspaceFile: {
                taskSource = { kind: Tasks.TaskSourceKind.WorkspaceFile, config: { index, element: external, file: '.vscode/tasks.json', workspaceFolder: context.workspaceFolder, workspace: context.workspace }, label };
                break;
            }
            default: {
                taskSource = { kind: Tasks.TaskSourceKind.Workspace, config: { index, element: external, file: '.vscode/tasks.json', workspaceFolder: context.workspaceFolder }, label };
                break;
            }
        }
        const result = new Tasks.CustomTask(context.uuidMap.getUUID(taskName), taskSource, taskName, Tasks.CUSTOMIZED_TASK_TYPE, undefined, false, RunOptions.fromConfiguration(external.runOptions), {
            name: taskName,
            identifier: taskName,
        });
        const configuration = ConfigurationProperties.from(external, context, false, source);
        result.addTaskLoadMessages(configuration.errors);
        if (configuration.value) {
            result.configurationProperties = Object.assign(result.configurationProperties, configuration.value);
        }
        const supportLegacy = true; //context.schemaVersion === Tasks.JsonSchemaVersion.V2_0_0;
        if (supportLegacy) {
            const legacy = external;
            if (result.configurationProperties.isBackground === undefined && legacy.isWatching !== undefined) {
                result.configurationProperties.isBackground = !!legacy.isWatching;
            }
            if (result.configurationProperties.group === undefined) {
                if (legacy.isBuildCommand === true) {
                    result.configurationProperties.group = Tasks.TaskGroup.Build;
                }
                else if (legacy.isTestCommand === true) {
                    result.configurationProperties.group = Tasks.TaskGroup.Test;
                }
            }
        }
        const command = CommandConfiguration.from(external, context);
        if (command) {
            result.command = command;
        }
        if (external.command !== undefined) {
            // if the task has its own command then we suppress the
            // task name by default.
            command.suppressTaskName = true;
        }
        return result;
    }
    CustomTask.from = from;
    function fillGlobals(task, globals) {
        // We only merge a command from a global definition if there is no dependsOn
        // or there is a dependsOn and a defined command.
        if (CommandConfiguration.hasCommand(task.command) || task.configurationProperties.dependsOn === undefined) {
            task.command = CommandConfiguration.fillGlobals(task.command, globals.command, task.configurationProperties.name);
        }
        if (task.configurationProperties.problemMatchers === undefined && globals.problemMatcher !== undefined) {
            task.configurationProperties.problemMatchers = Objects.deepClone(globals.problemMatcher);
            task.hasDefinedMatchers = true;
        }
        // promptOnClose is inferred from isBackground if available
        if (task.configurationProperties.promptOnClose === undefined && task.configurationProperties.isBackground === undefined && globals.promptOnClose !== undefined) {
            task.configurationProperties.promptOnClose = globals.promptOnClose;
        }
    }
    CustomTask.fillGlobals = fillGlobals;
    function fillDefaults(task, context) {
        CommandConfiguration.fillDefaults(task.command, context);
        if (task.configurationProperties.promptOnClose === undefined) {
            task.configurationProperties.promptOnClose = task.configurationProperties.isBackground !== undefined ? !task.configurationProperties.isBackground : true;
        }
        if (task.configurationProperties.isBackground === undefined) {
            task.configurationProperties.isBackground = false;
        }
        if (task.configurationProperties.problemMatchers === undefined) {
            task.configurationProperties.problemMatchers = EMPTY_ARRAY;
        }
    }
    CustomTask.fillDefaults = fillDefaults;
    function createCustomTask(contributedTask, configuredProps) {
        const result = new Tasks.CustomTask(configuredProps._id, Object.assign({}, configuredProps._source, { customizes: contributedTask.defines }), configuredProps.configurationProperties.name || contributedTask._label, Tasks.CUSTOMIZED_TASK_TYPE, contributedTask.command, false, contributedTask.runOptions, {
            name: configuredProps.configurationProperties.name || contributedTask.configurationProperties.name,
            identifier: configuredProps.configurationProperties.identifier || contributedTask.configurationProperties.identifier,
            icon: configuredProps.configurationProperties.icon,
            hide: configuredProps.configurationProperties.hide
        });
        result.addTaskLoadMessages(configuredProps.taskLoadMessages);
        const resultConfigProps = result.configurationProperties;
        assignProperty(resultConfigProps, configuredProps.configurationProperties, 'group');
        assignProperty(resultConfigProps, configuredProps.configurationProperties, 'isBackground');
        assignProperty(resultConfigProps, configuredProps.configurationProperties, 'dependsOn');
        assignProperty(resultConfigProps, configuredProps.configurationProperties, 'problemMatchers');
        assignProperty(resultConfigProps, configuredProps.configurationProperties, 'promptOnClose');
        assignProperty(resultConfigProps, configuredProps.configurationProperties, 'detail');
        result.command.presentation = CommandConfiguration.PresentationOptions.assignProperties(result.command.presentation, configuredProps.configurationProperties.presentation);
        result.command.options = CommandOptions.assignProperties(result.command.options, configuredProps.configurationProperties.options);
        result.runOptions = RunOptions.assignProperties(result.runOptions, configuredProps.runOptions);
        const contributedConfigProps = contributedTask.configurationProperties;
        fillProperty(resultConfigProps, contributedConfigProps, 'group');
        fillProperty(resultConfigProps, contributedConfigProps, 'isBackground');
        fillProperty(resultConfigProps, contributedConfigProps, 'dependsOn');
        fillProperty(resultConfigProps, contributedConfigProps, 'problemMatchers');
        fillProperty(resultConfigProps, contributedConfigProps, 'promptOnClose');
        fillProperty(resultConfigProps, contributedConfigProps, 'detail');
        result.command.presentation = CommandConfiguration.PresentationOptions.fillProperties(result.command.presentation, contributedConfigProps.presentation);
        result.command.options = CommandOptions.fillProperties(result.command.options, contributedConfigProps.options);
        result.runOptions = RunOptions.fillProperties(result.runOptions, contributedTask.runOptions);
        if (contributedTask.hasDefinedMatchers === true) {
            result.hasDefinedMatchers = true;
        }
        return result;
    }
    CustomTask.createCustomTask = createCustomTask;
})(CustomTask || (CustomTask = {}));
export var TaskParser;
(function (TaskParser) {
    function isCustomTask(value) {
        const type = value.type;
        const customize = value.customize;
        return customize === undefined && (type === undefined || type === null || type === Tasks.CUSTOMIZED_TASK_TYPE || type === 'shell' || type === 'process');
    }
    const builtinTypeContextMap = {
        shell: ShellExecutionSupportedContext,
        process: ProcessExecutionSupportedContext
    };
    function from(externals, globals, context, source, registry) {
        const result = { custom: [], configured: [] };
        if (!externals) {
            return result;
        }
        const defaultBuildTask = { task: undefined, rank: -1 };
        const defaultTestTask = { task: undefined, rank: -1 };
        const schema2_0_0 = context.schemaVersion === 2 /* Tasks.JsonSchemaVersion.V2_0_0 */;
        const baseLoadIssues = Objects.deepClone(context.taskLoadIssues);
        for (let index = 0; index < externals.length; index++) {
            const external = externals[index];
            const definition = external.type ? registry?.get?.(external.type) || TaskDefinitionRegistry.get(external.type) : undefined;
            let typeNotSupported = false;
            if (definition && definition.when && !context.contextKeyService.contextMatchesRules(definition.when)) {
                typeNotSupported = true;
            }
            else if (!definition && external.type) {
                for (const key of Object.keys(builtinTypeContextMap)) {
                    if (external.type === key) {
                        typeNotSupported = !ShellExecutionSupportedContext.evaluate(context.contextKeyService.getContext(null));
                        break;
                    }
                }
            }
            if (typeNotSupported) {
                context.problemReporter.info(nls.localize('taskConfiguration.providerUnavailable', 'Warning: {0} tasks are unavailable in the current environment.\n', external.type));
                continue;
            }
            if (isCustomTask(external)) {
                const customTask = CustomTask.from(external, context, index, source);
                if (customTask) {
                    CustomTask.fillGlobals(customTask, globals);
                    CustomTask.fillDefaults(customTask, context);
                    if (schema2_0_0) {
                        if ((customTask.command === undefined || customTask.command.name === undefined) && (customTask.configurationProperties.dependsOn === undefined || customTask.configurationProperties.dependsOn.length === 0)) {
                            context.problemReporter.error(nls.localize('taskConfiguration.noCommandOrDependsOn', 'Error: the task \'{0}\' neither specifies a command nor a dependsOn property. The task will be ignored. Its definition is:\n{1}', customTask.configurationProperties.name, JSON.stringify(external, undefined, 4)));
                            continue;
                        }
                    }
                    else {
                        if (customTask.command === undefined || customTask.command.name === undefined) {
                            context.problemReporter.warn(nls.localize('taskConfiguration.noCommand', 'Error: the task \'{0}\' doesn\'t define a command. The task will be ignored. Its definition is:\n{1}', customTask.configurationProperties.name, JSON.stringify(external, undefined, 4)));
                            continue;
                        }
                    }
                    if (customTask.configurationProperties.group === Tasks.TaskGroup.Build && defaultBuildTask.rank < 2) {
                        defaultBuildTask.task = customTask;
                        defaultBuildTask.rank = 2;
                    }
                    else if (customTask.configurationProperties.group === Tasks.TaskGroup.Test && defaultTestTask.rank < 2) {
                        defaultTestTask.task = customTask;
                        defaultTestTask.rank = 2;
                    }
                    else if (customTask.configurationProperties.name === 'build' && defaultBuildTask.rank < 1) {
                        defaultBuildTask.task = customTask;
                        defaultBuildTask.rank = 1;
                    }
                    else if (customTask.configurationProperties.name === 'test' && defaultTestTask.rank < 1) {
                        defaultTestTask.task = customTask;
                        defaultTestTask.rank = 1;
                    }
                    customTask.addTaskLoadMessages(context.taskLoadIssues);
                    result.custom.push(customTask);
                }
            }
            else {
                const configuredTask = ConfiguringTask.from(external, context, index, source, registry);
                if (configuredTask) {
                    configuredTask.addTaskLoadMessages(context.taskLoadIssues);
                    result.configured.push(configuredTask);
                }
            }
            context.taskLoadIssues = Objects.deepClone(baseLoadIssues);
        }
        // There is some special logic for tasks with the labels "build" and "test".
        // Even if they are not marked as a task group Build or Test, we automagically group them as such.
        // However, if they are already grouped as Build or Test, we don't need to add this grouping.
        const defaultBuildGroupName = Types.isString(defaultBuildTask.task?.configurationProperties.group) ? defaultBuildTask.task?.configurationProperties.group : defaultBuildTask.task?.configurationProperties.group?._id;
        const defaultTestTaskGroupName = Types.isString(defaultTestTask.task?.configurationProperties.group) ? defaultTestTask.task?.configurationProperties.group : defaultTestTask.task?.configurationProperties.group?._id;
        if ((defaultBuildGroupName !== Tasks.TaskGroup.Build._id) && (defaultBuildTask.rank > -1) && (defaultBuildTask.rank < 2) && defaultBuildTask.task) {
            defaultBuildTask.task.configurationProperties.group = Tasks.TaskGroup.Build;
        }
        else if ((defaultTestTaskGroupName !== Tasks.TaskGroup.Test._id) && (defaultTestTask.rank > -1) && (defaultTestTask.rank < 2) && defaultTestTask.task) {
            defaultTestTask.task.configurationProperties.group = Tasks.TaskGroup.Test;
        }
        return result;
    }
    TaskParser.from = from;
    function assignTasks(target, source) {
        if (source === undefined || source.length === 0) {
            return target;
        }
        if (target === undefined || target.length === 0) {
            return source;
        }
        if (source) {
            // Tasks are keyed by ID but we need to merge by name
            const map = Object.create(null);
            target.forEach((task) => {
                map[task.configurationProperties.name] = task;
            });
            source.forEach((task) => {
                map[task.configurationProperties.name] = task;
            });
            const newTarget = [];
            target.forEach(task => {
                newTarget.push(map[task.configurationProperties.name]);
                delete map[task.configurationProperties.name];
            });
            Object.keys(map).forEach(key => newTarget.push(map[key]));
            target = newTarget;
        }
        return target;
    }
    TaskParser.assignTasks = assignTasks;
})(TaskParser || (TaskParser = {}));
var Globals;
(function (Globals) {
    function from(config, context) {
        let result = fromBase(config, context);
        let osGlobals = undefined;
        if (config.windows && context.platform === 3 /* Platform.Windows */) {
            osGlobals = fromBase(config.windows, context);
        }
        else if (config.osx && context.platform === 1 /* Platform.Mac */) {
            osGlobals = fromBase(config.osx, context);
        }
        else if (config.linux && context.platform === 2 /* Platform.Linux */) {
            osGlobals = fromBase(config.linux, context);
        }
        if (osGlobals) {
            result = Globals.assignProperties(result, osGlobals);
        }
        const command = CommandConfiguration.from(config, context);
        if (command) {
            result.command = command;
        }
        Globals.fillDefaults(result, context);
        Globals.freeze(result);
        return result;
    }
    Globals.from = from;
    function fromBase(config, context) {
        const result = {};
        if (config.suppressTaskName !== undefined) {
            result.suppressTaskName = !!config.suppressTaskName;
        }
        if (config.promptOnClose !== undefined) {
            result.promptOnClose = !!config.promptOnClose;
        }
        if (config.problemMatcher) {
            result.problemMatcher = ProblemMatcherConverter.from(config.problemMatcher, context).value;
        }
        return result;
    }
    Globals.fromBase = fromBase;
    function isEmpty(value) {
        return !value || value.command === undefined && value.promptOnClose === undefined && value.suppressTaskName === undefined;
    }
    Globals.isEmpty = isEmpty;
    function assignProperties(target, source) {
        if (isEmpty(source)) {
            return target;
        }
        if (isEmpty(target)) {
            return source;
        }
        assignProperty(target, source, 'promptOnClose');
        assignProperty(target, source, 'suppressTaskName');
        return target;
    }
    Globals.assignProperties = assignProperties;
    function fillDefaults(value, context) {
        if (!value) {
            return;
        }
        CommandConfiguration.fillDefaults(value.command, context);
        if (value.suppressTaskName === undefined) {
            value.suppressTaskName = (context.schemaVersion === 2 /* Tasks.JsonSchemaVersion.V2_0_0 */);
        }
        if (value.promptOnClose === undefined) {
            value.promptOnClose = true;
        }
    }
    Globals.fillDefaults = fillDefaults;
    function freeze(value) {
        Object.freeze(value);
        if (value.command) {
            CommandConfiguration.freeze(value.command);
        }
    }
    Globals.freeze = freeze;
})(Globals || (Globals = {}));
export var ExecutionEngine;
(function (ExecutionEngine) {
    function from(config) {
        const runner = config.runner || config._runner;
        let result;
        if (runner) {
            switch (runner) {
                case 'terminal':
                    result = Tasks.ExecutionEngine.Terminal;
                    break;
                case 'process':
                    result = Tasks.ExecutionEngine.Process;
                    break;
            }
        }
        const schemaVersion = JsonSchemaVersion.from(config);
        if (schemaVersion === 1 /* Tasks.JsonSchemaVersion.V0_1_0 */) {
            return result || Tasks.ExecutionEngine.Process;
        }
        else if (schemaVersion === 2 /* Tasks.JsonSchemaVersion.V2_0_0 */) {
            return Tasks.ExecutionEngine.Terminal;
        }
        else {
            throw new Error('Shouldn\'t happen.');
        }
    }
    ExecutionEngine.from = from;
})(ExecutionEngine || (ExecutionEngine = {}));
export var JsonSchemaVersion;
(function (JsonSchemaVersion) {
    const _default = 2 /* Tasks.JsonSchemaVersion.V2_0_0 */;
    function from(config) {
        const version = config.version;
        if (!version) {
            return _default;
        }
        switch (version) {
            case '0.1.0':
                return 1 /* Tasks.JsonSchemaVersion.V0_1_0 */;
            case '2.0.0':
                return 2 /* Tasks.JsonSchemaVersion.V2_0_0 */;
            default:
                return _default;
        }
    }
    JsonSchemaVersion.from = from;
})(JsonSchemaVersion || (JsonSchemaVersion = {}));
export class UUIDMap {
    constructor(other) {
        this.current = Object.create(null);
        if (other) {
            for (const key of Object.keys(other.current)) {
                const value = other.current[key];
                if (Array.isArray(value)) {
                    this.current[key] = value.slice();
                }
                else {
                    this.current[key] = value;
                }
            }
        }
    }
    start() {
        this.last = this.current;
        this.current = Object.create(null);
    }
    getUUID(identifier) {
        const lastValue = this.last ? this.last[identifier] : undefined;
        let result = undefined;
        if (lastValue !== undefined) {
            if (Array.isArray(lastValue)) {
                result = lastValue.shift();
                if (lastValue.length === 0) {
                    delete this.last[identifier];
                }
            }
            else {
                result = lastValue;
                delete this.last[identifier];
            }
        }
        if (result === undefined) {
            result = UUID.generateUuid();
        }
        const currentValue = this.current[identifier];
        if (currentValue === undefined) {
            this.current[identifier] = result;
        }
        else {
            if (Array.isArray(currentValue)) {
                currentValue.push(result);
            }
            else {
                const arrayValue = [currentValue];
                arrayValue.push(result);
                this.current[identifier] = arrayValue;
            }
        }
        return result;
    }
    finish() {
        this.last = undefined;
    }
}
export var TaskConfigSource;
(function (TaskConfigSource) {
    TaskConfigSource[TaskConfigSource["TasksJson"] = 0] = "TasksJson";
    TaskConfigSource[TaskConfigSource["WorkspaceFile"] = 1] = "WorkspaceFile";
    TaskConfigSource[TaskConfigSource["User"] = 2] = "User";
})(TaskConfigSource || (TaskConfigSource = {}));
class ConfigurationParser {
    constructor(workspaceFolder, workspace, platform, problemReporter, uuidMap) {
        this.workspaceFolder = workspaceFolder;
        this.workspace = workspace;
        this.platform = platform;
        this.problemReporter = problemReporter;
        this.uuidMap = uuidMap;
    }
    run(fileConfig, source, contextKeyService) {
        const engine = ExecutionEngine.from(fileConfig);
        const schemaVersion = JsonSchemaVersion.from(fileConfig);
        const context = {
            workspaceFolder: this.workspaceFolder,
            workspace: this.workspace,
            problemReporter: this.problemReporter,
            uuidMap: this.uuidMap,
            namedProblemMatchers: {},
            engine,
            schemaVersion,
            platform: this.platform,
            taskLoadIssues: [],
            contextKeyService
        };
        const taskParseResult = this.createTaskRunnerConfiguration(fileConfig, context, source);
        return {
            validationStatus: this.problemReporter.status,
            custom: taskParseResult.custom,
            configured: taskParseResult.configured,
            engine
        };
    }
    createTaskRunnerConfiguration(fileConfig, context, source) {
        const globals = Globals.from(fileConfig, context);
        if (this.problemReporter.status.isFatal()) {
            return { custom: [], configured: [] };
        }
        context.namedProblemMatchers = ProblemMatcherConverter.namedFrom(fileConfig.declares, context);
        let globalTasks = undefined;
        let externalGlobalTasks = undefined;
        if (fileConfig.windows && context.platform === 3 /* Platform.Windows */) {
            globalTasks = TaskParser.from(fileConfig.windows.tasks, globals, context, source).custom;
            externalGlobalTasks = fileConfig.windows.tasks;
        }
        else if (fileConfig.osx && context.platform === 1 /* Platform.Mac */) {
            globalTasks = TaskParser.from(fileConfig.osx.tasks, globals, context, source).custom;
            externalGlobalTasks = fileConfig.osx.tasks;
        }
        else if (fileConfig.linux && context.platform === 2 /* Platform.Linux */) {
            globalTasks = TaskParser.from(fileConfig.linux.tasks, globals, context, source).custom;
            externalGlobalTasks = fileConfig.linux.tasks;
        }
        if (context.schemaVersion === 2 /* Tasks.JsonSchemaVersion.V2_0_0 */ && globalTasks && globalTasks.length > 0 && externalGlobalTasks && externalGlobalTasks.length > 0) {
            const taskContent = [];
            for (const task of externalGlobalTasks) {
                taskContent.push(JSON.stringify(task, null, 4));
            }
            context.problemReporter.error(nls.localize({ key: 'TaskParse.noOsSpecificGlobalTasks', comment: ['\"Task version 2.0.0\" refers to the 2.0.0 version of the task system. The \"version 2.0.0\" is not localizable as it is a json key and value.'] }, 'Task version 2.0.0 doesn\'t support global OS specific tasks. Convert them to a task with a OS specific command. Affected tasks are:\n{0}', taskContent.join('\n')));
        }
        let result = { custom: [], configured: [] };
        if (fileConfig.tasks) {
            result = TaskParser.from(fileConfig.tasks, globals, context, source);
        }
        if (globalTasks) {
            result.custom = TaskParser.assignTasks(result.custom, globalTasks);
        }
        if ((!result.custom || result.custom.length === 0) && (globals.command && globals.command.name)) {
            const matchers = ProblemMatcherConverter.from(fileConfig.problemMatcher, context).value ?? [];
            const isBackground = fileConfig.isBackground ? !!fileConfig.isBackground : fileConfig.isWatching ? !!fileConfig.isWatching : undefined;
            const name = Tasks.CommandString.value(globals.command.name);
            const task = new Tasks.CustomTask(context.uuidMap.getUUID(name), Object.assign({}, source, 'workspace', { config: { index: -1, element: fileConfig, workspaceFolder: context.workspaceFolder } }), name, Tasks.CUSTOMIZED_TASK_TYPE, {
                name: undefined,
                runtime: undefined,
                presentation: undefined,
                suppressTaskName: true
            }, false, { reevaluateOnRerun: true }, {
                name: name,
                identifier: name,
                group: Tasks.TaskGroup.Build,
                isBackground: isBackground,
                problemMatchers: matchers
            });
            const taskGroupKind = GroupKind.from(fileConfig.group);
            if (taskGroupKind !== undefined) {
                task.configurationProperties.group = taskGroupKind;
            }
            else if (fileConfig.group === 'none') {
                task.configurationProperties.group = undefined;
            }
            CustomTask.fillGlobals(task, globals);
            CustomTask.fillDefaults(task, context);
            result.custom = [task];
        }
        result.custom = result.custom || [];
        result.configured = result.configured || [];
        return result;
    }
}
const uuidMaps = new Map();
const recentUuidMaps = new Map();
export function parse(workspaceFolder, workspace, platform, configuration, logger, source, contextKeyService, isRecents = false) {
    const recentOrOtherMaps = isRecents ? recentUuidMaps : uuidMaps;
    let selectedUuidMaps = recentOrOtherMaps.get(source);
    if (!selectedUuidMaps) {
        recentOrOtherMaps.set(source, new Map());
        selectedUuidMaps = recentOrOtherMaps.get(source);
    }
    let uuidMap = selectedUuidMaps.get(workspaceFolder.uri.toString());
    if (!uuidMap) {
        uuidMap = new UUIDMap();
        selectedUuidMaps.set(workspaceFolder.uri.toString(), uuidMap);
    }
    try {
        uuidMap.start();
        return (new ConfigurationParser(workspaceFolder, workspace, platform, logger, uuidMap)).run(configuration, source, contextKeyService);
    }
    finally {
        uuidMap.finish();
    }
}
export function createCustomTask(contributedTask, configuredProps) {
    return CustomTask.createCustomTask(contributedTask, configuredProps);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFza0NvbmZpZ3VyYXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGFza3MvY29tbW9uL3Rhc2tDb25maWd1cmF0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUM7QUFFMUMsT0FBTyxLQUFLLE9BQU8sTUFBTSxvQ0FBb0MsQ0FBQztBQUk5RCxPQUFPLEtBQUssS0FBSyxNQUFNLGtDQUFrQyxDQUFDO0FBQzFELE9BQU8sS0FBSyxJQUFJLE1BQU0saUNBQWlDLENBQUM7QUFHeEQsT0FBTyxFQUNnQixvQkFBb0IsRUFDMUMscUJBQXFCLEVBQUUsc0JBQXNCLEVBQzdDLE1BQU0scUJBQXFCLENBQUM7QUFHN0IsT0FBTyxLQUFLLEtBQUssTUFBTSxZQUFZLENBQUM7QUFDcEMsT0FBTyxFQUEyQixzQkFBc0IsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBRzlGLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBR3BHLE1BQU0sQ0FBTixJQUFrQixZQWVqQjtBQWZELFdBQWtCLFlBQVk7SUFDN0I7O09BRUc7SUFDSCxtREFBVSxDQUFBO0lBRVY7O09BRUc7SUFDSCxtREFBVSxDQUFBO0lBRVY7O09BRUc7SUFDSCwrQ0FBUSxDQUFBO0FBQ1QsQ0FBQyxFQWZpQixZQUFZLEtBQVosWUFBWSxRQWU3QjtBQTRHRCxNQUFNLEtBQVcsZUFBZSxDQUsvQjtBQUxELFdBQWlCLGVBQWU7SUFDL0IsU0FBZ0IsRUFBRSxDQUFDLEtBQVU7UUFDNUIsTUFBTSxTQUFTLEdBQW9CLEtBQUssQ0FBQztRQUN6QyxPQUFPLFNBQVMsS0FBSyxTQUFTLElBQUksS0FBSyxDQUFDLFFB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