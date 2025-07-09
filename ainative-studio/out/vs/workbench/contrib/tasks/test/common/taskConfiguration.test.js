/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { URI } from '../../../../../base/common/uri.js';
import assert from 'assert';
import Severity from '../../../../../base/common/severity.js';
import * as UUID from '../../../../../base/common/uuid.js';
import * as Types from '../../../../../base/common/types.js';
import * as Platform from '../../../../../base/common/platform.js';
import { ValidationStatus } from '../../../../../base/common/parsers.js';
import { FileLocationKind, ApplyToKind } from '../../common/problemMatcher.js';
import { WorkspaceFolder } from '../../../../../platform/workspace/common/workspace.js';
import * as Tasks from '../../common/tasks.js';
import { parse, TaskConfigSource, ProblemMatcherConverter, UUIDMap, TaskParser } from '../../common/taskConfiguration.js';
import { MockContextKeyService } from '../../../../../platform/keybinding/test/common/mockKeybindingService.js';
import { Workspace } from '../../../../../platform/workspace/test/common/testWorkspace.js';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
const workspaceFolder = new WorkspaceFolder({
    uri: URI.file('/workspace/folderOne'),
    name: 'folderOne',
    index: 0
});
const workspace = new Workspace('id', [workspaceFolder]);
class ProblemReporter {
    constructor() {
        this._validationStatus = new ValidationStatus();
        this.receivedMessage = false;
        this.lastMessage = undefined;
    }
    info(message) {
        this.log(message);
    }
    warn(message) {
        this.log(message);
    }
    error(message) {
        this.log(message);
    }
    fatal(message) {
        this.log(message);
    }
    get status() {
        return this._validationStatus;
    }
    log(message) {
        this.receivedMessage = true;
        this.lastMessage = message;
    }
    clearMessage() {
        this.lastMessage = undefined;
    }
}
class ConfigurationBuilder {
    constructor() {
        this.result = [];
        this.builders = [];
    }
    task(name, command) {
        const builder = new CustomTaskBuilder(this, name, command);
        this.builders.push(builder);
        this.result.push(builder.result);
        return builder;
    }
    done() {
        for (const builder of this.builders) {
            builder.done();
        }
    }
}
class PresentationBuilder {
    constructor(parent) {
        this.parent = parent;
        this.result = { echo: false, reveal: Tasks.RevealKind.Always, revealProblems: Tasks.RevealProblemKind.Never, focus: false, panel: Tasks.PanelKind.Shared, showReuseMessage: true, clear: false, close: false };
    }
    echo(value) {
        this.result.echo = value;
        return this;
    }
    reveal(value) {
        this.result.reveal = value;
        return this;
    }
    focus(value) {
        this.result.focus = value;
        return this;
    }
    instance(value) {
        this.result.panel = value;
        return this;
    }
    showReuseMessage(value) {
        this.result.showReuseMessage = value;
        return this;
    }
    close(value) {
        this.result.close = value;
        return this;
    }
    done() {
    }
}
class CommandConfigurationBuilder {
    constructor(parent, command) {
        this.parent = parent;
        this.presentationBuilder = new PresentationBuilder(this);
        this.result = {
            name: command,
            runtime: Tasks.RuntimeType.Process,
            args: [],
            options: {
                cwd: '${workspaceFolder}'
            },
            presentation: this.presentationBuilder.result,
            suppressTaskName: false
        };
    }
    name(value) {
        this.result.name = value;
        return this;
    }
    runtime(value) {
        this.result.runtime = value;
        return this;
    }
    args(value) {
        this.result.args = value;
        return this;
    }
    options(value) {
        this.result.options = value;
        return this;
    }
    taskSelector(value) {
        this.result.taskSelector = value;
        return this;
    }
    suppressTaskName(value) {
        this.result.suppressTaskName = value;
        return this;
    }
    presentation() {
        return this.presentationBuilder;
    }
    done(taskName) {
        this.result.args = this.result.args.map(arg => arg === '$name' ? taskName : arg);
        this.presentationBuilder.done();
    }
}
class CustomTaskBuilder {
    constructor(parent, name, command) {
        this.parent = parent;
        this.commandBuilder = new CommandConfigurationBuilder(this, command);
        this.result = new Tasks.CustomTask(name, { kind: Tasks.TaskSourceKind.Workspace, label: 'workspace', config: { workspaceFolder: workspaceFolder, element: undefined, index: -1, file: '.vscode/tasks.json' } }, name, Tasks.CUSTOMIZED_TASK_TYPE, this.commandBuilder.result, false, { reevaluateOnRerun: true }, {
            identifier: name,
            name: name,
            isBackground: false,
            promptOnClose: true,
            problemMatchers: [],
        });
    }
    identifier(value) {
        this.result.configurationProperties.identifier = value;
        return this;
    }
    group(value) {
        this.result.configurationProperties.group = value;
        return this;
    }
    isBackground(value) {
        this.result.configurationProperties.isBackground = value;
        return this;
    }
    promptOnClose(value) {
        this.result.configurationProperties.promptOnClose = value;
        return this;
    }
    problemMatcher() {
        const builder = new ProblemMatcherBuilder(this);
        this.result.configurationProperties.problemMatchers.push(builder.result);
        return builder;
    }
    command() {
        return this.commandBuilder;
    }
    done() {
        this.commandBuilder.done(this.result.configurationProperties.name);
    }
}
class ProblemMatcherBuilder {
    static { this.DEFAULT_UUID = UUID.generateUuid(); }
    constructor(parent) {
        this.parent = parent;
        this.result = {
            owner: ProblemMatcherBuilder.DEFAULT_UUID,
            applyTo: ApplyToKind.allDocuments,
            severity: undefined,
            fileLocation: FileLocationKind.Relative,
            filePrefix: '${workspaceFolder}',
            pattern: undefined
        };
    }
    owner(value) {
        this.result.owner = value;
        return this;
    }
    applyTo(value) {
        this.result.applyTo = value;
        return this;
    }
    severity(value) {
        this.result.severity = value;
        return this;
    }
    fileLocation(value) {
        this.result.fileLocation = value;
        return this;
    }
    filePrefix(value) {
        this.result.filePrefix = value;
        return this;
    }
    pattern(regExp) {
        const builder = new PatternBuilder(this, regExp);
        if (!this.result.pattern) {
            this.result.pattern = builder.result;
        }
        return builder;
    }
}
class PatternBuilder {
    constructor(parent, regExp) {
        this.parent = parent;
        this.result = {
            regexp: regExp,
            file: 1,
            message: 0,
            line: 2,
            character: 3
        };
    }
    file(value) {
        this.result.file = value;
        return this;
    }
    message(value) {
        this.result.message = value;
        return this;
    }
    location(value) {
        this.result.location = value;
        return this;
    }
    line(value) {
        this.result.line = value;
        return this;
    }
    character(value) {
        this.result.character = value;
        return this;
    }
    endLine(value) {
        this.result.endLine = value;
        return this;
    }
    endCharacter(value) {
        this.result.endCharacter = value;
        return this;
    }
    code(value) {
        this.result.code = value;
        return this;
    }
    severity(value) {
        this.result.severity = value;
        return this;
    }
    loop(value) {
        this.result.loop = value;
        return this;
    }
}
class TasksMockContextKeyService extends MockContextKeyService {
    getContext(domNode) {
        return {
            getValue: (_key) => {
                return true;
            }
        };
    }
}
function testDefaultProblemMatcher(external, resolved) {
    const reporter = new ProblemReporter();
    const result = parse(workspaceFolder, workspace, Platform.platform, external, reporter, TaskConfigSource.TasksJson, new TasksMockContextKeyService());
    assert.ok(!reporter.receivedMessage);
    assert.strictEqual(result.custom.length, 1);
    const task = result.custom[0];
    assert.ok(task);
    assert.strictEqual(task.configurationProperties.problemMatchers.length, resolved);
}
function testConfiguration(external, builder) {
    builder.done();
    const reporter = new ProblemReporter();
    const result = parse(workspaceFolder, workspace, Platform.platform, external, reporter, TaskConfigSource.TasksJson, new TasksMockContextKeyService());
    if (reporter.receivedMessage) {
        assert.ok(false, reporter.lastMessage);
    }
    assertConfiguration(result, builder.result);
}
class TaskGroupMap {
    constructor() {
        this._store = Object.create(null);
    }
    add(group, task) {
        let tasks = this._store[group];
        if (!tasks) {
            tasks = [];
            this._store[group] = tasks;
        }
        tasks.push(task);
    }
    static assert(actual, expected) {
        const actualKeys = Object.keys(actual._store);
        const expectedKeys = Object.keys(expected._store);
        if (actualKeys.length === 0 && expectedKeys.length === 0) {
            return;
        }
        assert.strictEqual(actualKeys.length, expectedKeys.length);
        actualKeys.forEach(key => assert.ok(expected._store[key]));
        expectedKeys.forEach(key => actual._store[key]);
        actualKeys.forEach((key) => {
            const actualTasks = actual._store[key];
            const expectedTasks = expected._store[key];
            assert.strictEqual(actualTasks.length, expectedTasks.length);
            if (actualTasks.length === 1) {
                assert.strictEqual(actualTasks[0].configurationProperties.name, expectedTasks[0].configurationProperties.name);
                return;
            }
            const expectedTaskMap = Object.create(null);
            expectedTasks.forEach(task => expectedTaskMap[task.configurationProperties.name] = true);
            actualTasks.forEach(task => delete expectedTaskMap[task.configurationProperties.name]);
            assert.strictEqual(Object.keys(expectedTaskMap).length, 0);
        });
    }
}
function assertConfiguration(result, expected) {
    assert.ok(result.validationStatus.isOK());
    const actual = result.custom;
    assert.strictEqual(typeof actual, typeof expected);
    if (!actual) {
        return;
    }
    // We can't compare Ids since the parser uses UUID which are random
    // So create a new map using the name.
    const actualTasks = Object.create(null);
    const actualId2Name = Object.create(null);
    const actualTaskGroups = new TaskGroupMap();
    actual.forEach(task => {
        assert.ok(!actualTasks[task.configurationProperties.name]);
        actualTasks[task.configurationProperties.name] = task;
        actualId2Name[task._id] = task.configurationProperties.name;
        const taskId = Tasks.TaskGroup.from(task.configurationProperties.group)?._id;
        if (taskId) {
            actualTaskGroups.add(taskId, task);
        }
    });
    const expectedTasks = Object.create(null);
    const expectedTaskGroup = new TaskGroupMap();
    expected.forEach(task => {
        assert.ok(!expectedTasks[task.configurationProperties.name]);
        expectedTasks[task.configurationProperties.name] = task;
        const taskId = Tasks.TaskGroup.from(task.configurationProperties.group)?._id;
        if (taskId) {
            expectedTaskGroup.add(taskId, task);
        }
    });
    const actualKeys = Object.keys(actualTasks);
    assert.strictEqual(actualKeys.length, expected.length);
    actualKeys.forEach((key) => {
        const actualTask = actualTasks[key];
        const expectedTask = expectedTasks[key];
        assert.ok(expectedTask);
        assertTask(actualTask, expectedTask);
    });
    TaskGroupMap.assert(actualTaskGroups, expectedTaskGroup);
}
function assertTask(actual, expected) {
    assert.ok(actual._id);
    assert.strictEqual(actual.configurationProperties.name, expected.configurationProperties.name, 'name');
    if (!Tasks.InMemoryTask.is(actual) && !Tasks.InMemoryTask.is(expected)) {
        assertCommandConfiguration(actual.command, expected.command);
    }
    assert.strictEqual(actual.configurationProperties.isBackground, expected.configurationProperties.isBackground, 'isBackground');
    assert.strictEqual(typeof actual.configurationProperties.problemMatchers, typeof expected.configurationProperties.problemMatchers);
    assert.strictEqual(actual.configurationProperties.promptOnClose, expected.configurationProperties.promptOnClose, 'promptOnClose');
    assert.strictEqual(typeof actual.configurationProperties.group, typeof expected.configurationProperties.group, `group types unequal`);
    if (actual.configurationProperties.problemMatchers && expected.configurationProperties.problemMatchers) {
        assert.strictEqual(actual.configurationProperties.problemMatchers.length, expected.configurationProperties.problemMatchers.length);
        for (let i = 0; i < actual.configurationProperties.problemMatchers.length; i++) {
            assertProblemMatcher(actual.configurationProperties.problemMatchers[i], expected.configurationProperties.problemMatchers[i]);
        }
    }
    if (actual.configurationProperties.group && expected.configurationProperties.group) {
        if (Types.isString(actual.configurationProperties.group)) {
            assert.strictEqual(actual.configurationProperties.group, expected.configurationProperties.group);
        }
        else {
            assertGroup(actual.configurationProperties.group, expected.configurationProperties.group);
        }
    }
}
function assertCommandConfiguration(actual, expected) {
    assert.strictEqual(typeof actual, typeof expected);
    if (actual && expected) {
        assertPresentation(actual.presentation, expected.presentation);
        assert.strictEqual(actual.name, expected.name, 'name');
        assert.strictEqual(actual.runtime, expected.runtime, 'runtime type');
        assert.strictEqual(actual.suppressTaskName, expected.suppressTaskName, 'suppressTaskName');
        assert.strictEqual(actual.taskSelector, expected.taskSelector, 'taskSelector');
        assert.deepStrictEqual(actual.args, expected.args, 'args');
        assert.strictEqual(typeof actual.options, typeof expected.options);
        if (actual.options && expected.options) {
            assert.strictEqual(actual.options.cwd, expected.options.cwd, 'cwd');
            assert.strictEqual(typeof actual.options.env, typeof expected.options.env, 'env');
            if (actual.options.env && expected.options.env) {
                assert.deepStrictEqual(actual.options.env, expected.options.env, 'env');
            }
        }
    }
}
function assertGroup(actual, expected) {
    assert.strictEqual(typeof actual, typeof expected);
    if (actual && expected) {
        assert.strictEqual(actual._id, expected._id, `group ids unequal. actual: ${actual._id} expected ${expected._id}`);
        assert.strictEqual(actual.isDefault, expected.isDefault, `group defaults unequal. actual: ${actual.isDefault} expected ${expected.isDefault}`);
    }
}
function assertPresentation(actual, expected) {
    assert.strictEqual(typeof actual, typeof expected);
    if (actual && expected) {
        assert.strictEqual(actual.echo, expected.echo);
        assert.strictEqual(actual.reveal, expected.reveal);
    }
}
function assertProblemMatcher(actual, expected) {
    assert.strictEqual(typeof actual, typeof expected);
    if (typeof actual === 'string' && typeof expected === 'string') {
        assert.strictEqual(actual, expected, 'Problem matcher references are different');
        return;
    }
    if (typeof actual !== 'string' && typeof expected !== 'string') {
        if (expected.owner === ProblemMatcherBuilder.DEFAULT_UUID) {
            assert.ok(UUID.isUUID(actual.owner), 'Owner must be a UUID');
        }
        else {
            assert.strictEqual(actual.owner, expected.owner);
        }
        assert.strictEqual(actual.applyTo, expected.applyTo);
        assert.strictEqual(actual.severity, expected.severity);
        assert.strictEqual(actual.fileLocation, expected.fileLocation);
        assert.strictEqual(actual.filePrefix, expected.filePrefix);
        if (actual.pattern && expected.pattern) {
            assertProblemPatterns(actual.pattern, expected.pattern);
        }
    }
}
function assertProblemPatterns(actual, expected) {
    assert.strictEqual(typeof actual, typeof expected);
    if (Array.isArray(actual)) {
        const actuals = actual;
        const expecteds = expected;
        assert.strictEqual(actuals.length, expecteds.length);
        for (let i = 0; i < actuals.length; i++) {
            assertProblemPattern(actuals[i], expecteds[i]);
        }
    }
    else {
        assertProblemPattern(actual, expected);
    }
}
function assertProblemPattern(actual, expected) {
    assert.strictEqual(actual.regexp.toString(), expected.regexp.toString());
    assert.strictEqual(actual.file, expected.file);
    assert.strictEqual(actual.message, expected.message);
    if (typeof expected.location !== 'undefined') {
        assert.strictEqual(actual.location, expected.location);
    }
    else {
        assert.strictEqual(actual.line, expected.line);
        assert.strictEqual(actual.character, expected.character);
        assert.strictEqual(actual.endLine, expected.endLine);
        assert.strictEqual(actual.endCharacter, expected.endCharacter);
    }
    assert.strictEqual(actual.code, expected.code);
    assert.strictEqual(actual.severity, expected.severity);
    assert.strictEqual(actual.loop, expected.loop);
}
suite('Tasks version 0.1.0', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('tasks: all default', () => {
        const builder = new ConfigurationBuilder();
        builder.task('tsc', 'tsc').
            group(Tasks.TaskGroup.Build).
            command().suppressTaskName(true);
        testConfiguration({
            version: '0.1.0',
            command: 'tsc'
        }, builder);
    });
    test('tasks: global isShellCommand', () => {
        const builder = new ConfigurationBuilder();
        builder.task('tsc', 'tsc').
            group(Tasks.TaskGroup.Build).
            command().suppressTaskName(true).
            runtime(Tasks.RuntimeType.Shell);
        testConfiguration({
            version: '0.1.0',
            command: 'tsc',
            isShellCommand: true
        }, builder);
    });
    test('tasks: global show output silent', () => {
        const builder = new ConfigurationBuilder();
        builder.
            task('tsc', 'tsc').
            group(Tasks.TaskGroup.Build).
            command().suppressTaskName(true).
            presentation().reveal(Tasks.RevealKind.Silent);
        testConfiguration({
            version: '0.1.0',
            command: 'tsc',
            showOutput: 'silent'
        }, builder);
    });
    test('tasks: global promptOnClose default', () => {
        const builder = new ConfigurationBuilder();
        builder.task('tsc', 'tsc').
            group(Tasks.TaskGroup.Build).
            command().suppressTaskName(true);
        testConfiguration({
            version: '0.1.0',
            command: 'tsc',
            promptOnClose: true
        }, builder);
    });
    test('tasks: global promptOnClose', () => {
        const builder = new ConfigurationBuilder();
        builder.task('tsc', 'tsc').
            group(Tasks.TaskGroup.Build).
            promptOnClose(false).
            command().suppressTaskName(true);
        testConfiguration({
            version: '0.1.0',
            command: 'tsc',
            promptOnClose: false
        }, builder);
    });
    test('tasks: global promptOnClose default watching', () => {
        const builder = new ConfigurationBuilder();
        builder.task('tsc', 'tsc').
            group(Tasks.TaskGroup.Build).
            isBackground(true).
            promptOnClose(false).
            command().suppressTaskName(true);
        testConfiguration({
            version: '0.1.0',
            command: 'tsc',
            isWatching: true
        }, builder);
    });
    test('tasks: global show output never', () => {
        const builder = new ConfigurationBuilder();
        builder.
            task('tsc', 'tsc').
            group(Tasks.TaskGroup.Build).
            command().suppressTaskName(true).
            presentation().reveal(Tasks.RevealKind.Never);
        testConfiguration({
            version: '0.1.0',
            command: 'tsc',
            showOutput: 'never'
        }, builder);
    });
    test('tasks: global echo Command', () => {
        const builder = new ConfigurationBuilder();
        builder.
            task('tsc', 'tsc').
            group(Tasks.TaskGroup.Build).
            command().suppressTaskName(true).
            presentation().
            echo(true);
        testConfiguration({
            version: '0.1.0',
            command: 'tsc',
            echoCommand: true
        }, builder);
    });
    test('tasks: global args', () => {
        const builder = new ConfigurationBuilder();
        builder.
            task('tsc', 'tsc').
            group(Tasks.TaskGroup.Build).
            command().suppressTaskName(true).
            args(['--p']);
        testConfiguration({
            version: '0.1.0',
            command: 'tsc',
            args: [
                '--p'
            ]
        }, builder);
    });
    test('tasks: options - cwd', () => {
        const builder = new ConfigurationBuilder();
        builder.
            task('tsc', 'tsc').
            group(Tasks.TaskGroup.Build).
            command().suppressTaskName(true).
            options({
            cwd: 'myPath'
        });
        testConfiguration({
            version: '0.1.0',
            command: 'tsc',
            options: {
                cwd: 'myPath'
            }
        }, builder);
    });
    test('tasks: options - env', () => {
        const builder = new ConfigurationBuilder();
        builder.
            task('tsc', 'tsc').
            group(Tasks.TaskGroup.Build).
            command().suppressTaskName(true).
            options({ cwd: '${workspaceFolder}', env: { key: 'value' } });
        testConfiguration({
            version: '0.1.0',
            command: 'tsc',
            options: {
                env: {
                    key: 'value'
                }
            }
        }, builder);
    });
    test('tasks: os windows', () => {
        const name = Platform.isWindows ? 'tsc.win' : 'tsc';
        const builder = new ConfigurationBuilder();
        builder.
            task(name, name).
            group(Tasks.TaskGroup.Build).
            command().suppressTaskName(true);
        const external = {
            version: '0.1.0',
            command: 'tsc',
            windows: {
                command: 'tsc.win'
            }
        };
        testConfiguration(external, builder);
    });
    test('tasks: os windows & global isShellCommand', () => {
        const name = Platform.isWindows ? 'tsc.win' : 'tsc';
        const builder = new ConfigurationBuilder();
        builder.
            task(name, name).
            group(Tasks.TaskGroup.Build).
            command().suppressTaskName(true).
            runtime(Tasks.RuntimeType.Shell);
        const external = {
            version: '0.1.0',
            command: 'tsc',
            isShellCommand: true,
            windows: {
                command: 'tsc.win'
            }
        };
        testConfiguration(external, builder);
    });
    test('tasks: os mac', () => {
        const name = Platform.isMacintosh ? 'tsc.osx' : 'tsc';
        const builder = new ConfigurationBuilder();
        builder.
            task(name, name).
            group(Tasks.TaskGroup.Build).
            command().suppressTaskName(true);
        const external = {
            version: '0.1.0',
            command: 'tsc',
            osx: {
                command: 'tsc.osx'
            }
        };
        testConfiguration(external, builder);
    });
    test('tasks: os linux', () => {
        const name = Platform.isLinux ? 'tsc.linux' : 'tsc';
        const builder = new ConfigurationBuilder();
        builder.
            task(name, name).
            group(Tasks.TaskGroup.Build).
            command().suppressTaskName(true);
        const external = {
            version: '0.1.0',
            command: 'tsc',
            linux: {
                command: 'tsc.linux'
            }
        };
        testConfiguration(external, builder);
    });
    test('tasks: overwrite showOutput', () => {
        const builder = new ConfigurationBuilder();
        builder.
            task('tsc', 'tsc').
            group(Tasks.TaskGroup.Build).
            command().suppressTaskName(true).
            presentation().reveal(Platform.isWindows ? Tasks.RevealKind.Always : Tasks.RevealKind.Never);
        const external = {
            version: '0.1.0',
            command: 'tsc',
            showOutput: 'never',
            windows: {
                showOutput: 'always'
            }
        };
        testConfiguration(external, builder);
    });
    test('tasks: overwrite echo Command', () => {
        const builder = new ConfigurationBuilder();
        builder.
            task('tsc', 'tsc').
            group(Tasks.TaskGroup.Build).
            command().suppressTaskName(true).
            presentation().
            echo(Platform.isWindows ? false : true);
        const external = {
            version: '0.1.0',
            command: 'tsc',
            echoCommand: true,
            windows: {
                echoCommand: false
            }
        };
        testConfiguration(external, builder);
    });
    test('tasks: global problemMatcher one', () => {
        const external = {
            version: '0.1.0',
            command: 'tsc',
            problemMatcher: '$msCompile'
        };
        testDefaultProblemMatcher(external, 1);
    });
    test('tasks: global problemMatcher two', () => {
        const external = {
            version: '0.1.0',
            command: 'tsc',
            problemMatcher: ['$eslint-compact', '$msCompile']
        };
        testDefaultProblemMatcher(external, 2);
    });
    test('tasks: task definition', () => {
        const external = {
            version: '0.1.0',
            command: 'tsc',
            tasks: [
                {
                    taskName: 'taskName'
                }
            ]
        };
        const builder = new ConfigurationBuilder();
        builder.task('taskName', 'tsc').command().args(['$name']);
        testConfiguration(external, builder);
    });
    test('tasks: build task', () => {
        const external = {
            version: '0.1.0',
            command: 'tsc',
            tasks: [
                {
                    taskName: 'taskName',
                    isBuildCommand: true
                }
            ]
        };
        const builder = new ConfigurationBuilder();
        builder.task('taskName', 'tsc').group(Tasks.TaskGroup.Build).command().args(['$name']);
        testConfiguration(external, builder);
    });
    test('tasks: default build task', () => {
        const external = {
            version: '0.1.0',
            command: 'tsc',
            tasks: [
                {
                    taskName: 'build'
                }
            ]
        };
        const builder = new ConfigurationBuilder();
        builder.task('build', 'tsc').group(Tasks.TaskGroup.Build).command().args(['$name']);
        testConfiguration(external, builder);
    });
    test('tasks: test task', () => {
        const external = {
            version: '0.1.0',
            command: 'tsc',
            tasks: [
                {
                    taskName: 'taskName',
                    isTestCommand: true
                }
            ]
        };
        const builder = new ConfigurationBuilder();
        builder.task('taskName', 'tsc').group(Tasks.TaskGroup.Test).command().args(['$name']);
        testConfiguration(external, builder);
    });
    test('tasks: default test task', () => {
        const external = {
            version: '0.1.0',
            command: 'tsc',
            tasks: [
                {
                    taskName: 'test'
                }
            ]
        };
        const builder = new ConfigurationBuilder();
        builder.task('test', 'tsc').group(Tasks.TaskGroup.Test).command().args(['$name']);
        testConfiguration(external, builder);
    });
    test('tasks: task with values', () => {
        const external = {
            version: '0.1.0',
            command: 'tsc',
            tasks: [
                {
                    taskName: 'test',
                    showOutput: 'never',
                    echoCommand: true,
                    args: ['--p'],
                    isWatching: true
                }
            ]
        };
        const builder = new ConfigurationBuilder();
        builder.task('test', 'tsc').
            group(Tasks.TaskGroup.Test).
            isBackground(true).
            promptOnClose(false).
            command().args(['$name', '--p']).
            presentation().
            echo(true).reveal(Tasks.RevealKind.Never);
        testConfiguration(external, builder);
    });
    test('tasks: task inherits global values', () => {
        const external = {
            version: '0.1.0',
            command: 'tsc',
            showOutput: 'never',
            echoCommand: true,
            tasks: [
                {
                    taskName: 'test'
                }
            ]
        };
        const builder = new ConfigurationBuilder();
        builder.task('test', 'tsc').
            group(Tasks.TaskGroup.Test).
            command().args(['$name']).presentation().
            echo(true).reveal(Tasks.RevealKind.Never);
        testConfiguration(external, builder);
    });
    test('tasks: problem matcher default', () => {
        const external = {
            version: '0.1.0',
            command: 'tsc',
            tasks: [
                {
                    taskName: 'taskName',
                    problemMatcher: {
                        pattern: {
                            regexp: 'abc'
                        }
                    }
                }
            ]
        };
        const builder = new ConfigurationBuilder();
        builder.task('taskName', 'tsc').
            command().args(['$name']).parent.
            problemMatcher().pattern(/abc/);
        testConfiguration(external, builder);
    });
    test('tasks: problem matcher .* regular expression', () => {
        const external = {
            version: '0.1.0',
            command: 'tsc',
            tasks: [
                {
                    taskName: 'taskName',
                    problemMatcher: {
                        pattern: {
                            regexp: '.*'
                        }
                    }
                }
            ]
        };
        const builder = new ConfigurationBuilder();
        builder.task('taskName', 'tsc').
            command().args(['$name']).parent.
            problemMatcher().pattern(/.*/);
        testConfiguration(external, builder);
    });
    test('tasks: problem matcher owner, applyTo, severity and fileLocation', () => {
        const external = {
            version: '0.1.0',
            command: 'tsc',
            tasks: [
                {
                    taskName: 'taskName',
                    problemMatcher: {
                        owner: 'myOwner',
                        applyTo: 'closedDocuments',
                        severity: 'warning',
                        fileLocation: 'absolute',
                        pattern: {
                            regexp: 'abc'
                        }
                    }
                }
            ]
        };
        const builder = new ConfigurationBuilder();
        builder.task('taskName', 'tsc').
            command().args(['$name']).parent.
            problemMatcher().
            owner('myOwner').
            applyTo(ApplyToKind.closedDocuments).
            severity(Severity.Warning).
            fileLocation(FileLocationKind.Absolute).
            filePrefix(undefined).
            pattern(/abc/);
        testConfiguration(external, builder);
    });
    test('tasks: problem matcher fileLocation and filePrefix', () => {
        const external = {
            version: '0.1.0',
            command: 'tsc',
            tasks: [
                {
                    taskName: 'taskName',
                    problemMatcher: {
                        fileLocation: ['relative', 'myPath'],
                        pattern: {
                            regexp: 'abc'
                        }
                    }
                }
            ]
        };
        const builder = new ConfigurationBuilder();
        builder.task('taskName', 'tsc').
            command().args(['$name']).parent.
            problemMatcher().
            fileLocation(FileLocationKind.Relative).
            filePrefix('myPath').
            pattern(/abc/);
        testConfiguration(external, builder);
    });
    test('tasks: problem pattern location', () => {
        const external = {
            version: '0.1.0',
            command: 'tsc',
            tasks: [
                {
                    taskName: 'taskName',
                    problemMatcher: {
                        pattern: {
                            regexp: 'abc',
                            file: 10,
                            message: 11,
                            location: 12,
                            severity: 13,
                            code: 14
                        }
                    }
                }
            ]
        };
        const builder = new ConfigurationBuilder();
        builder.task('taskName', 'tsc').
            command().args(['$name']).parent.
            problemMatcher().
            pattern(/abc/).file(10).message(11).location(12).severity(13).code(14);
        testConfiguration(external, builder);
    });
    test('tasks: problem pattern line & column', () => {
        const external = {
            version: '0.1.0',
            command: 'tsc',
            tasks: [
                {
                    taskName: 'taskName',
                    problemMatcher: {
                        pattern: {
                            regexp: 'abc',
                            file: 10,
                            message: 11,
                            line: 12,
                            column: 13,
                            endLine: 14,
                            endColumn: 15,
                            severity: 16,
                            code: 17
                        }
                    }
                }
            ]
        };
        const builder = new ConfigurationBuilder();
        builder.task('taskName', 'tsc').
            command().args(['$name']).parent.
            problemMatcher().
            pattern(/abc/).file(10).message(11).
            line(12).character(13).endLine(14).endCharacter(15).
            severity(16).code(17);
        testConfiguration(external, builder);
    });
    test('tasks: prompt on close default', () => {
        const external = {
            version: '0.1.0',
            command: 'tsc',
            tasks: [
                {
                    taskName: 'taskName'
                }
            ]
        };
        const builder = new ConfigurationBuilder();
        builder.task('taskName', 'tsc').
            promptOnClose(true).
            command().args(['$name']);
        testConfiguration(external, builder);
    });
    test('tasks: prompt on close watching', () => {
        const external = {
            version: '0.1.0',
            command: 'tsc',
            tasks: [
                {
                    taskName: 'taskName',
                    isWatching: true
                }
            ]
        };
        const builder = new ConfigurationBuilder();
        builder.task('taskName', 'tsc').
            isBackground(true).promptOnClose(false).
            command().args(['$name']);
        testConfiguration(external, builder);
    });
    test('tasks: prompt on close set', () => {
        const external = {
            version: '0.1.0',
            command: 'tsc',
            tasks: [
                {
                    taskName: 'taskName',
                    promptOnClose: false
                }
            ]
        };
        const builder = new ConfigurationBuilder();
        builder.task('taskName', 'tsc').
            promptOnClose(false).
            command().args(['$name']);
        testConfiguration(external, builder);
    });
    test('tasks: task selector set', () => {
        const external = {
            version: '0.1.0',
            command: 'tsc',
            taskSelector: '/t:',
            tasks: [
                {
                    taskName: 'taskName',
                }
            ]
        };
        const builder = new ConfigurationBuilder();
        builder.task('taskName', 'tsc').
            command().
            taskSelector('/t:').
            args(['/t:taskName']);
        testConfiguration(external, builder);
    });
    test('tasks: suppress task name set', () => {
        const external = {
            version: '0.1.0',
            command: 'tsc',
            suppressTaskName: false,
            tasks: [
                {
                    taskName: 'taskName',
                    suppressTaskName: true
                }
            ]
        };
        const builder = new ConfigurationBuilder();
        builder.task('taskName', 'tsc').
            command().suppressTaskName(true);
        testConfiguration(external, builder);
    });
    test('tasks: suppress task name inherit', () => {
        const external = {
            version: '0.1.0',
            command: 'tsc',
            suppressTaskName: true,
            tasks: [
                {
                    taskName: 'taskName'
                }
            ]
        };
        const builder = new ConfigurationBuilder();
        builder.task('taskName', 'tsc').
            command().suppressTaskName(true);
        testConfiguration(external, builder);
    });
    test('tasks: two tasks', () => {
        const external = {
            version: '0.1.0',
            command: 'tsc',
            tasks: [
                {
                    taskName: 'taskNameOne'
                },
                {
                    taskName: 'taskNameTwo'
                }
            ]
        };
        const builder = new ConfigurationBuilder();
        builder.task('taskNameOne', 'tsc').
            command().args(['$name']);
        builder.task('taskNameTwo', 'tsc').
            command().args(['$name']);
        testConfiguration(external, builder);
    });
    test('tasks: with command', () => {
        const external = {
            version: '0.1.0',
            tasks: [
                {
                    taskName: 'taskNameOne',
                    command: 'tsc'
                }
            ]
        };
        const builder = new ConfigurationBuilder();
        builder.task('taskNameOne', 'tsc').command().suppressTaskName(true);
        testConfiguration(external, builder);
    });
    test('tasks: two tasks with command', () => {
        const external = {
            version: '0.1.0',
            tasks: [
                {
                    taskName: 'taskNameOne',
                    command: 'tsc'
                },
                {
                    taskName: 'taskNameTwo',
                    command: 'dir'
                }
            ]
        };
        const builder = new ConfigurationBuilder();
        builder.task('taskNameOne', 'tsc').command().suppressTaskName(true);
        builder.task('taskNameTwo', 'dir').command().suppressTaskName(true);
        testConfiguration(external, builder);
    });
    test('tasks: with command and args', () => {
        const external = {
            version: '0.1.0',
            tasks: [
                {
                    taskName: 'taskNameOne',
                    command: 'tsc',
                    isShellCommand: true,
                    args: ['arg'],
                    options: {
                        cwd: 'cwd',
                        env: {
                            env: 'env'
                        }
                    }
                }
            ]
        };
        const builder = new ConfigurationBuilder();
        builder.task('taskNameOne', 'tsc').command().suppressTaskName(true).
            runtime(Tasks.RuntimeType.Shell).args(['arg']).options({ cwd: 'cwd', env: { env: 'env' } });
        testConfiguration(external, builder);
    });
    test('tasks: with command os specific', () => {
        const name = Platform.isWindows ? 'tsc.win' : 'tsc';
        const external = {
            version: '0.1.0',
            tasks: [
                {
                    taskName: 'taskNameOne',
                    command: 'tsc',
                    windows: {
                        command: 'tsc.win'
                    }
                }
            ]
        };
        const builder = new ConfigurationBuilder();
        builder.task('taskNameOne', name).command().suppressTaskName(true);
        testConfiguration(external, builder);
    });
    test('tasks: with Windows specific args', () => {
        const args = Platform.isWindows ? ['arg1', 'arg2'] : ['arg1'];
        const external = {
            version: '0.1.0',
            tasks: [
                {
                    taskName: 'tsc',
                    command: 'tsc',
                    args: ['arg1'],
                    windows: {
                        args: ['arg2']
                    }
                }
            ]
        };
        const builder = new ConfigurationBuilder();
        builder.task('tsc', 'tsc').command().suppressTaskName(true).args(args);
        testConfiguration(external, builder);
    });
    test('tasks: with Linux specific args', () => {
        const args = Platform.isLinux ? ['arg1', 'arg2'] : ['arg1'];
        const external = {
            version: '0.1.0',
            tasks: [
                {
                    taskName: 'tsc',
                    command: 'tsc',
                    args: ['arg1'],
                    linux: {
                        args: ['arg2']
                    }
                }
            ]
        };
        const builder = new ConfigurationBuilder();
        builder.task('tsc', 'tsc').command().suppressTaskName(true).args(args);
        testConfiguration(external, builder);
    });
    test('tasks: global command and task command properties', () => {
        const external = {
            version: '0.1.0',
            command: 'tsc',
            tasks: [
                {
                    taskName: 'taskNameOne',
                    isShellCommand: true,
                }
            ]
        };
        const builder = new ConfigurationBuilder();
        builder.task('taskNameOne', 'tsc').command().runtime(Tasks.RuntimeType.Shell).args(['$name']);
        testConfiguration(external, builder);
    });
    test('tasks: global and tasks args', () => {
        const external = {
            version: '0.1.0',
            command: 'tsc',
            args: ['global'],
            tasks: [
                {
                    taskName: 'taskNameOne',
                    args: ['local']
                }
            ]
        };
        const builder = new ConfigurationBuilder();
        builder.task('taskNameOne', 'tsc').command().args(['global', '$name', 'local']);
        testConfiguration(external, builder);
    });
    test('tasks: global and tasks args with task selector', () => {
        const external = {
            version: '0.1.0',
            command: 'tsc',
            args: ['global'],
            taskSelector: '/t:',
            tasks: [
                {
                    taskName: 'taskNameOne',
                    args: ['local']
                }
            ]
        };
        const builder = new ConfigurationBuilder();
        builder.task('taskNameOne', 'tsc').command().taskSelector('/t:').args(['global', '/t:taskNameOne', 'local']);
        testConfiguration(external, builder);
    });
});
suite('Tasks version 2.0.0', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test.skip('Build workspace task', () => {
        const external = {
            version: '2.0.0',
            tasks: [
                {
                    taskName: 'dir',
                    command: 'dir',
                    type: 'shell',
                    group: 'build'
                }
            ]
        };
        const builder = new ConfigurationBuilder();
        builder.task('dir', 'dir').
            group(Tasks.TaskGroup.Build).
            command().suppressTaskName(true).
            runtime(Tasks.RuntimeType.Shell).
            presentation().echo(true);
        testConfiguration(external, builder);
    });
    test('Global group none', () => {
        const external = {
            version: '2.0.0',
            command: 'dir',
            type: 'shell',
            group: 'none'
        };
        const builder = new ConfigurationBuilder();
        builder.task('dir', 'dir').
            command().suppressTaskName(true).
            runtime(Tasks.RuntimeType.Shell).
            presentation().echo(true);
        testConfiguration(external, builder);
    });
    test.skip('Global group build', () => {
        const external = {
            version: '2.0.0',
            command: 'dir',
            type: 'shell',
            group: 'build'
        };
        const builder = new ConfigurationBuilder();
        builder.task('dir', 'dir').
            group(Tasks.TaskGroup.Build).
            command().suppressTaskName(true).
            runtime(Tasks.RuntimeType.Shell).
            presentation().echo(true);
        testConfiguration(external, builder);
    });
    test.skip('Global group default build', () => {
        const external = {
            version: '2.0.0',
            command: 'dir',
            type: 'shell',
            group: { kind: 'build', isDefault: true }
        };
        const builder = new ConfigurationBuilder();
        const taskGroup = Tasks.TaskGroup.Build;
        taskGroup.isDefault = true;
        builder.task('dir', 'dir').
            group(taskGroup).
            command().suppressTaskName(true).
            runtime(Tasks.RuntimeType.Shell).
            presentation().echo(true);
        testConfiguration(external, builder);
    });
    test('Local group none', () => {
        const external = {
            version: '2.0.0',
            tasks: [
                {
                    taskName: 'dir',
                    command: 'dir',
                    type: 'shell',
                    group: 'none'
                }
            ]
        };
        const builder = new ConfigurationBuilder();
        builder.task('dir', 'dir').
            command().suppressTaskName(true).
            runtime(Tasks.RuntimeType.Shell).
            presentation().echo(true);
        testConfiguration(external, builder);
    });
    test.skip('Local group build', () => {
        const external = {
            version: '2.0.0',
            tasks: [
                {
                    taskName: 'dir',
                    command: 'dir',
                    type: 'shell',
                    group: 'build'
                }
            ]
        };
        const builder = new ConfigurationBuilder();
        builder.task('dir', 'dir').
            group(Tasks.TaskGroup.Build).
            command().suppressTaskName(true).
            runtime(Tasks.RuntimeType.Shell).
            presentation().echo(true);
        testConfiguration(external, builder);
    });
    test.skip('Local group default build', () => {
        const external = {
            version: '2.0.0',
            tasks: [
                {
                    taskName: 'dir',
                    command: 'dir',
                    type: 'shell',
                    group: { kind: 'build', isDefault: true }
                }
            ]
        };
        const builder = new ConfigurationBuilder();
        const taskGroup = Tasks.TaskGroup.Build;
        taskGroup.isDefault = true;
        builder.task('dir', 'dir').
            group(taskGroup).
            command().suppressTaskName(true).
            runtime(Tasks.RuntimeType.Shell).
            presentation().echo(true);
        testConfiguration(external, builder);
    });
    test('Arg overwrite', () => {
        const external = {
            version: '2.0.0',
            tasks: [
                {
                    label: 'echo',
                    type: 'shell',
                    command: 'echo',
                    args: [
                        'global'
                    ],
                    windows: {
                        args: [
                            'windows'
                        ]
                    },
                    linux: {
                        args: [
                            'linux'
                        ]
                    },
                    osx: {
                        args: [
                            'osx'
                        ]
                    }
                }
            ]
        };
        const builder = new ConfigurationBuilder();
        if (Platform.isWindows) {
            builder.task('echo', 'echo').
                command().suppressTaskName(true).args(['windows']).
                runtime(Tasks.RuntimeType.Shell).
                presentation().echo(true);
            testConfiguration(external, builder);
        }
        else if (Platform.isLinux) {
            builder.task('echo', 'echo').
                command().suppressTaskName(true).args(['linux']).
                runtime(Tasks.RuntimeType.Shell).
                presentation().echo(true);
            testConfiguration(external, builder);
        }
        else if (Platform.isMacintosh) {
            builder.task('echo', 'echo').
                command().suppressTaskName(true).args(['osx']).
                runtime(Tasks.RuntimeType.Shell).
                presentation().echo(true);
            testConfiguration(external, builder);
        }
    });
});
suite('Bugs / regression tests', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    (Platform.isLinux ? test.skip : test)('Bug 19548', () => {
        const external = {
            version: '0.1.0',
            windows: {
                command: 'powershell',
                options: {
                    cwd: '${workspaceFolder}'
                },
                tasks: [
                    {
                        taskName: 'composeForDebug',
                        suppressTaskName: true,
                        args: [
                            '-ExecutionPolicy',
                            'RemoteSigned',
                            '.\\dockerTask.ps1',
                            '-ComposeForDebug',
                            '-Environment',
                            'debug'
                        ],
                        isBuildCommand: false,
                        showOutput: 'always',
                        echoCommand: true
                    }
                ]
            },
            osx: {
                command: '/bin/bash',
                options: {
                    cwd: '${workspaceFolder}'
                },
                tasks: [
                    {
                        taskName: 'composeForDebug',
                        suppressTaskName: true,
                        args: [
                            '-c',
                            './dockerTask.sh composeForDebug debug'
                        ],
                        isBuildCommand: false,
                        showOutput: 'always'
                    }
                ]
            }
        };
        const builder = new ConfigurationBuilder();
        if (Platform.isWindows) {
            builder.task('composeForDebug', 'powershell').
                command().suppressTaskName(true).
                args(['-ExecutionPolicy', 'RemoteSigned', '.\\dockerTask.ps1', '-ComposeForDebug', '-Environment', 'debug']).
                options({ cwd: '${workspaceFolder}' }).
                presentation().echo(true).reveal(Tasks.RevealKind.Always);
            testConfiguration(external, builder);
        }
        else if (Platform.isMacintosh) {
            builder.task('composeForDebug', '/bin/bash').
                command().suppressTaskName(true).
                args(['-c', './dockerTask.sh composeForDebug debug']).
                options({ cwd: '${workspaceFolder}' }).
                presentation().reveal(Tasks.RevealKind.Always);
            testConfiguration(external, builder);
        }
    });
    test('Bug 28489', () => {
        const external = {
            version: '0.1.0',
            command: '',
            isShellCommand: true,
            args: [''],
            showOutput: 'always',
            'tasks': [
                {
                    taskName: 'build',
                    command: 'bash',
                    args: [
                        'build.sh'
                    ]
                }
            ]
        };
        const builder = new ConfigurationBuilder();
        builder.task('build', 'bash').
            group(Tasks.TaskGroup.Build).
            command().suppressTaskName(true).
            args(['build.sh']).
            runtime(Tasks.RuntimeType.Shell);
        testConfiguration(external, builder);
    });
});
class TestNamedProblemMatcher {
}
class TestParseContext {
}
class TestTaskDefinitionRegistry {
    get(key) {
        return this._task;
    }
    set(task) {
        this._task = task;
    }
}
suite('Task configuration conversions', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    const globals = {};
    const taskConfigSource = {};
    const TaskDefinitionRegistry = new TestTaskDefinitionRegistry();
    let instantiationService;
    let parseContext;
    let namedProblemMatcher;
    let problemReporter;
    setup(() => {
        instantiationService = new TestInstantiationService();
        namedProblemMatcher = instantiationService.createInstance(TestNamedProblemMatcher);
        namedProblemMatcher.name = 'real';
        namedProblemMatcher.label = 'real label';
        problemReporter = new ProblemReporter();
        parseContext = instantiationService.createInstance(TestParseContext);
        parseContext.problemReporter = problemReporter;
        parseContext.namedProblemMatchers = { 'real': namedProblemMatcher };
        parseContext.uuidMap = new UUIDMap();
    });
    teardown(() => {
        instantiationService.dispose();
    });
    suite('ProblemMatcherConverter.from', () => {
        test('returns [] and an error for an unknown problem matcher', () => {
            const result = (ProblemMatcherConverter.from('$fake', parseContext));
            assert.deepEqual(result.value, []);
            assert.strictEqual(result.errors?.length, 1);
        });
        test('returns config for a known problem matcher', () => {
            const result = (ProblemMatcherConverter.from('$real', parseContext));
            assert.strictEqual(result.errors?.length, 0);
            assert.deepEqual(result.value, [{ "label": "real label" }]);
        });
        test('returns config for a known problem matcher including applyTo', () => {
            namedProblemMatcher.applyTo = ApplyToKind.closedDocuments;
            const result = (ProblemMatcherConverter.from('$real', parseContext));
            assert.strictEqual(result.errors?.length, 0);
            assert.deepEqual(result.value, [{ "label": "real label", "applyTo": ApplyToKind.closedDocuments }]);
        });
    });
    suite('TaskParser.from', () => {
        suite('CustomTask', () => {
            suite('incomplete config reports an appropriate error for missing', () => {
                test('name', () => {
                    const result = TaskParser.from([{}], globals, parseContext, taskConfigSource);
                    assertTaskParseResult(result, undefined, problemReporter, 'Error: a task must provide a label property');
                });
                test('command', () => {
                    const result = TaskParser.from([{ taskName: 'task' }], globals, parseContext, taskConfigSource);
                    assertTaskParseResult(result, undefined, problemReporter, "Error: the task 'task' doesn't define a command");
                });
            });
            test('returns expected result', () => {
                const expected = [
                    { taskName: 'task', command: 'echo test' },
                    { taskName: 'task 2', command: 'echo test' }
                ];
                const result = TaskParser.from(expected, globals, parseContext, taskConfigSource);
                assertTaskParseResult(result, { custom: expected }, problemReporter, undefined);
            });
        });
        suite('ConfiguredTask', () => {
            test('returns expected result', () => {
                const expected = [{ taskName: 'task', command: 'echo test', type: 'any', label: 'task' }, { taskName: 'task 2', command: 'echo test', type: 'any', label: 'task 2' }];
                TaskDefinitionRegistry.set({ extensionId: 'registered', taskType: 'any', properties: {} });
                const result = TaskParser.from(expected, globals, parseContext, taskConfigSource, TaskDefinitionRegistry);
                assertTaskParseResult(result, { configured: expected }, problemReporter, undefined);
            });
        });
    });
});
function assertTaskParseResult(actual, expected, problemReporter, expectedMessage) {
    if (expectedMessage === undefined) {
        assert.strictEqual(problemReporter.lastMessage, undefined);
    }
    else {
        assert.ok(problemReporter.lastMessage?.includes(expectedMessage));
    }
    assert.deepEqual(actual.custom.length, expected?.custom?.length || 0);
    assert.deepEqual(actual.configured.length, expected?.configured?.length || 0);
    let index = 0;
    if (expected?.configured) {
        for (const taskParseResult of expected?.configured) {
            assert.strictEqual(actual.configured[index]._label, taskParseResult.label);
            index++;
        }
    }
    index = 0;
    if (expected?.custom) {
        for (const taskParseResult of expected?.custom) {
            assert.strictEqual(actual.custom[index]._label, taskParseResult.taskName);
            index++;
        }
    }
    problemReporter.clearMessage();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFza0NvbmZpZ3VyYXRpb24udGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90YXNrcy90ZXN0L2NvbW1vbi90YXNrQ29uZmlndXJhdGlvbi50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN4RCxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxRQUFRLE1BQU0sd0NBQXdDLENBQUM7QUFDOUQsT0FBTyxLQUFLLElBQUksTUFBTSxvQ0FBb0MsQ0FBQztBQUUzRCxPQUFPLEtBQUssS0FBSyxNQUFNLHFDQUFxQyxDQUFDO0FBQzdELE9BQU8sS0FBSyxRQUFRLE1BQU0sd0NBQXdDLENBQUM7QUFDbkUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDekUsT0FBTyxFQUFrQixnQkFBZ0IsRUFBbUIsV0FBVyxFQUF3QixNQUFNLGdDQUFnQyxDQUFDO0FBQ3RJLE9BQU8sRUFBRSxlQUFlLEVBQWMsTUFBTSx1REFBdUQsQ0FBQztBQUVwRyxPQUFPLEtBQUssS0FBSyxNQUFNLHVCQUF1QixDQUFDO0FBQy9DLE9BQU8sRUFBRSxLQUFLLEVBQWlGLGdCQUFnQixFQUFpQix1QkFBdUIsRUFBOEIsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3BQLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHlFQUF5RSxDQUFDO0FBRWhILE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQztBQUMzRixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwrRUFBK0UsQ0FBQztBQUV6SCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUs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