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
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { MenuRegistry, MenuId, registerAction2, Action2 } from '../../../../platform/actions/common/actions.js';
import { ProblemMatcherRegistry } from '../common/problemMatcher.js';
import { IProgressService } from '../../../../platform/progress/common/progress.js';
import * as jsonContributionRegistry from '../../../../platform/jsonschemas/common/jsonContributionRegistry.js';
import { IStatusbarService } from '../../../services/statusbar/browser/statusbar.js';
import { Extensions as OutputExt } from '../../../services/output/common/output.js';
import { TaskGroup, TASKS_CATEGORY, TASK_RUNNING_STATE, TASK_TERMINAL_ACTIVE, TaskEventKind } from '../common/tasks.js';
import { ITaskService, TaskCommandsRegistered, TaskExecutionSupportedContext } from '../common/taskService.js';
import { Extensions as WorkbenchExtensions, registerWorkbenchContribution2 } from '../../../common/contributions.js';
import { RunAutomaticTasks, ManageAutomaticTaskRunning } from './runAutomaticTasks.js';
import { KeybindingsRegistry } from '../../../../platform/keybinding/common/keybindingsRegistry.js';
import schemaVersion1 from '../common/jsonSchema_v1.js';
import schemaVersion2, { updateProblemMatchers, updateTaskDefinitions } from '../common/jsonSchema_v2.js';
import { AbstractTaskService, ConfigureTaskAction } from './abstractTaskService.js';
import { tasksSchemaId } from '../../../services/configuration/common/configuration.js';
import { Extensions as ConfigurationExtensions } from '../../../../platform/configuration/common/configurationRegistry.js';
import { WorkbenchStateContext } from '../../../common/contextkeys.js';
import { Extensions as QuickAccessExtensions } from '../../../../platform/quickinput/common/quickAccess.js';
import { TasksQuickAccessProvider } from './tasksQuickAccess.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { TaskDefinitionRegistry } from '../common/taskDefinitionRegistry.js';
import { isString } from '../../../../base/common/types.js';
import { promiseWithResolvers } from '../../../../base/common/async.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { TerminalContextKeys } from '../../terminal/common/terminalContextKey.js';
import { ITerminalService } from '../../terminal/browser/terminal.js';
const workbenchRegistry = Registry.as(WorkbenchExtensions.Workbench);
workbenchRegistry.registerWorkbenchContribution(RunAutomaticTasks, 4 /* LifecyclePhase.Eventually */);
registerAction2(ManageAutomaticTaskRunning);
MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
    command: {
        id: ManageAutomaticTaskRunning.ID,
        title: ManageAutomaticTaskRunning.LABEL,
        category: TASKS_CATEGORY
    },
    when: TaskExecutionSupportedContext
});
let TaskStatusBarContributions = class TaskStatusBarContributions extends Disposable {
    constructor(_taskService, _statusbarService, _progressService) {
        super();
        this._taskService = _taskService;
        this._statusbarService = _statusbarService;
        this._progressService = _progressService;
        this._activeTasksCount = 0;
        this._registerListeners();
    }
    _registerListeners() {
        let promise = undefined;
        let resolve;
        this._register(this._taskService.onDidStateChange(event => {
            if (event.kind === TaskEventKind.Changed) {
                this._updateRunningTasksStatus();
            }
            if (!this._ignoreEventForUpdateRunningTasksCount(event)) {
                switch (event.kind) {
                    case TaskEventKind.Active:
                        this._activeTasksCount++;
                        if (this._activeTasksCount === 1) {
                            if (!promise) {
                                ({ promise, resolve } = promiseWithResolvers());
                            }
                        }
                        break;
                    case TaskEventKind.Inactive:
                        // Since the exiting of the sub process is communicated async we can't order inactive and terminate events.
                        // So try to treat them accordingly.
                        if (this._activeTasksCount > 0) {
                            this._activeTasksCount--;
                            if (this._activeTasksCount === 0) {
                                if (promise && resolve) {
                                    resolve();
                                }
                            }
                        }
                        break;
                    case TaskEventKind.Terminated:
                        if (this._activeTasksCount !== 0) {
                            this._activeTasksCount = 0;
                            if (promise && resolve) {
                                resolve();
                            }
                        }
                        break;
                }
            }
            if (promise && (event.kind === TaskEventKind.Active) && (this._activeTasksCount === 1)) {
                this._progressService.withProgress({ location: 10 /* ProgressLocation.Window */, command: 'workbench.action.tasks.showTasks' }, progress => {
                    progress.report({ message: nls.localize('building', 'Building...') });
                    return promise;
                }).then(() => {
                    promise = undefined;
                });
            }
        }));
    }
    async _updateRunningTasksStatus() {
        const tasks = await this._taskService.getActiveTasks();
        if (tasks.length === 0) {
            if (this._runningTasksStatusItem) {
                this._runningTasksStatusItem.dispose();
                this._runningTasksStatusItem = undefined;
            }
        }
        else {
            const itemProps = {
                name: nls.localize('status.runningTasks', "Running Tasks"),
                text: `$(tools) ${tasks.length}`,
                ariaLabel: nls.localize('numberOfRunningTasks', "{0} running tasks", tasks.length),
                tooltip: nls.localize('runningTasks', "Show Running Tasks"),
                command: 'workbench.action.tasks.showTasks',
            };
            if (!this._runningTasksStatusItem) {
                this._runningTasksStatusItem = this._statusbarService.addEntry(itemProps, 'status.runningTasks', 0 /* StatusbarAlignment.LEFT */, { location: { id: 'status.problems', priority: 50 }, alignment: 1 /* StatusbarAlignment.RIGHT */ });
            }
            else {
                this._runningTasksStatusItem.update(itemProps);
            }
        }
    }
    _ignoreEventForUpdateRunningTasksCount(event) {
        if (!this._taskService.inTerminal() || event.kind === TaskEventKind.Changed) {
            return false;
        }
        if ((isString(event.group) ? event.group : event.group?._id) !== TaskGroup.Build._id) {
            return true;
        }
        return event.__task.configurationProperties.problemMatchers === undefined || event.__task.configurationProperties.problemMatchers.length === 0;
    }
};
TaskStatusBarContributions = __decorate([
    __param(0, ITaskService),
    __param(1, IStatusbarService),
    __param(2, IProgressService)
], TaskStatusBarContributions);
export { TaskStatusBarContributions };
workbenchRegistry.registerWorkbenchContribution(TaskStatusBarContributions, 3 /* LifecyclePhase.Restored */);
MenuRegistry.appendMenuItem(MenuId.MenubarTerminalMenu, {
    group: "3_run" /* TerminalMenuBarGroup.Run */,
    command: {
        id: 'workbench.action.tasks.runTask',
        title: nls.localize({ key: 'miRunTask', comment: ['&& denotes a mnemonic'] }, "&&Run Task...")
    },
    order: 1,
    when: TaskExecutionSupportedContext
});
MenuRegistry.appendMenuItem(MenuId.MenubarTerminalMenu, {
    group: "3_run" /* TerminalMenuBarGroup.Run */,
    command: {
        id: 'workbench.action.tasks.build',
        title: nls.localize({ key: 'miBuildTask', comment: ['&& denotes a mnemonic'] }, "Run &&Build Task...")
    },
    order: 2,
    when: TaskExecutionSupportedContext
});
// Manage Tasks
MenuRegistry.appendMenuItem(MenuId.MenubarTerminalMenu, {
    group: "5_manage" /* TerminalMenuBarGroup.Manage */,
    command: {
        precondition: TASK_RUNNING_STATE,
        id: 'workbench.action.tasks.showTasks',
        title: nls.localize({ key: 'miRunningTask', comment: ['&& denotes a mnemonic'] }, "Show Runnin&&g Tasks...")
    },
    order: 1,
    when: TaskExecutionSupportedContext
});
MenuRegistry.appendMenuItem(MenuId.MenubarTerminalMenu, {
    group: "5_manage" /* TerminalMenuBarGroup.Manage */,
    command: {
        precondition: TASK_RUNNING_STATE,
        id: 'workbench.action.tasks.restartTask',
        title: nls.localize({ key: 'miRestartTask', comment: ['&& denotes a mnemonic'] }, "R&&estart Running Task...")
    },
    order: 2,
    when: TaskExecutionSupportedContext
});
MenuRegistry.appendMenuItem(MenuId.MenubarTerminalMenu, {
    group: "5_manage" /* TerminalMenuBarGroup.Manage */,
    command: {
        precondition: TASK_RUNNING_STATE,
        id: 'workbench.action.tasks.terminate',
        title: nls.localize({ key: 'miTerminateTask', comment: ['&& denotes a mnemonic'] }, "&&Terminate Task...")
    },
    order: 3,
    when: TaskExecutionSupportedContext
});
// Configure Tasks
MenuRegistry.appendMenuItem(MenuId.MenubarTerminalMenu, {
    group: "7_configure" /* TerminalMenuBarGroup.Configure */,
    command: {
        id: 'workbench.action.tasks.configureTaskRunner',
        title: nls.localize({ key: 'miConfigureTask', comment: ['&& denotes a mnemonic'] }, "&&Configure Tasks...")
    },
    order: 1,
    when: TaskExecutionSupportedContext
});
MenuRegistry.appendMenuItem(MenuId.MenubarTerminalMenu, {
    group: "7_configure" /* TerminalMenuBarGroup.Configure */,
    command: {
        id: 'workbench.action.tasks.configureDefaultBuildTask',
        title: nls.localize({ key: 'miConfigureBuildTask', comment: ['&& denotes a mnemonic'] }, "Configure De&&fault Build Task...")
    },
    order: 2,
    when: TaskExecutionSupportedContext
});
MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
    command: {
        id: 'workbench.action.tasks.openWorkspaceFileTasks',
        title: nls.localize2('workbench.action.tasks.openWorkspaceFileTasks', "Open Workspace Tasks"),
        category: TASKS_CATEGORY
    },
    when: ContextKeyExpr.and(WorkbenchStateContext.isEqualTo('workspace'), TaskExecutionSupportedContext)
});
MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
    command: {
        id: ConfigureTaskAction.ID,
        title: ConfigureTaskAction.TEXT,
        category: TASKS_CATEGORY
    },
    when: TaskExecutionSupportedContext
});
MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
    command: {
        id: 'workbench.action.tasks.showLog',
        title: nls.localize2('ShowLogAction.label', "Show Task Log"),
        category: TASKS_CATEGORY
    },
    when: TaskExecutionSupportedContext
});
MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
    command: {
        id: 'workbench.action.tasks.runTask',
        title: nls.localize2('RunTaskAction.label', "Run Task"),
        category: TASKS_CATEGORY
    }
});
MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
    command: {
        id: 'workbench.action.tasks.reRunTask',
        title: nls.localize2('ReRunTaskAction.label', "Rerun Last Task"),
        category: TASKS_CATEGORY
    },
    when: TaskExecutionSupportedContext
});
MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
    command: {
        id: 'workbench.action.tasks.restartTask',
        title: nls.localize2('RestartTaskAction.label', "Restart Running Task"),
        category: TASKS_CATEGORY
    },
    when: TaskExecutionSupportedContext
});
MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
    command: {
        id: 'workbench.action.tasks.showTasks',
        title: nls.localize2('ShowTasksAction.label', "Show Running Tasks"),
        category: TASKS_CATEGORY
    },
    when: TaskExecutionSupportedContext
});
MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
    command: {
        id: 'workbench.action.tasks.terminate',
        title: nls.localize2('TerminateAction.label', "Terminate Task"),
        category: TASKS_CATEGORY
    },
    when: TaskExecutionSupportedContext
});
MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
    command: {
        id: 'workbench.action.tasks.build',
        title: nls.localize2('BuildAction.label', "Run Build Task"),
        category: TASKS_CATEGORY
    },
    when: TaskExecutionSupportedContext
});
MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
    command: {
        id: 'workbench.action.tasks.test',
        title: nls.localize2('TestAction.label', "Run Test Task"),
        category: TASKS_CATEGORY
    },
    when: TaskExecutionSupportedContext
});
MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
    command: {
        id: 'workbench.action.tasks.configureDefaultBuildTask',
        title: nls.localize2('ConfigureDefaultBuildTask.label', "Configure Default Build Task"),
        category: TASKS_CATEGORY
    },
    when: TaskExecutionSupportedContext
});
MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
    command: {
        id: 'workbench.action.tasks.configureDefaultTestTask',
        title: nls.localize2('ConfigureDefaultTestTask.label', "Configure Default Test Task"),
        category: TASKS_CATEGORY
    },
    when: TaskExecutionSupportedContext
});
MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
    command: {
        id: 'workbench.action.tasks.openUserTasks',
        title: nls.localize2('workbench.action.tasks.openUserTasks', "Open User Tasks"), category: TASKS_CATEGORY
    },
    when: TaskExecutionSupportedContext
});
class UserTasksGlobalActionContribution extends Disposable {
    constructor() {
        super();
        this.registerActions();
    }
    registerActions() {
        const id = 'workbench.action.tasks.openUserTasks';
        const title = nls.localize('tasks', "Tasks");
        this._register(MenuRegistry.appendMenuItem(MenuId.GlobalActivity, {
            command: {
                id,
                title
            },
            when: TaskExecutionSupportedContext,
            group: '2_configuration',
            order: 6
        }));
        this._register(MenuRegistry.appendMenuItem(MenuId.MenubarPreferencesMenu, {
            command: {
                id,
                title
            },
            when: TaskExecutionSupportedContext,
            group: '2_configuration',
            order: 6
        }));
    }
}
workbenchRegistry.registerWorkbenchContribution(UserTasksGlobalActionContribution, 3 /* LifecyclePhase.Restored */);
// MenuRegistry.addCommand( { id: 'workbench.action.tasks.rebuild', title: nls.localize('RebuildAction.label', 'Run Rebuild Task'), category: tasksCategory });
// MenuRegistry.addCommand( { id: 'workbench.action.tasks.clean', title: nls.localize('CleanAction.label', 'Run Clean Task'), category: tasksCategory });
KeybindingsRegistry.registerKeybindingRule({
    id: 'workbench.action.tasks.build',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: TaskCommandsRegistered,
    primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 32 /* KeyCode.KeyB */
});
// Tasks Output channel. Register it before using it in Task Service.
const outputChannelRegistry = Registry.as(OutputExt.OutputChannels);
outputChannelRegistry.registerChannel({ id: AbstractTaskService.OutputChannelId, label: AbstractTaskService.OutputChannelLabel, log: false });
// Register Quick Access
const quickAccessRegistry = (Registry.as(QuickAccessExtensions.Quickaccess));
const tasksPickerContextKey = 'inTasksPicker';
quickAccessRegistry.registerQuickAccessProvider({
    ctor: TasksQuickAccessProvider,
    prefix: TasksQuickAccessProvider.PREFIX,
    contextKey: tasksPickerContextKey,
    placeholder: nls.localize('tasksQuickAccessPlaceholder', "Type the name of a task to run."),
    helpEntries: [{ description: nls.localize('tasksQuickAccessHelp', "Run Task"), commandCenterOrder: 60 }]
});
// tasks.json validation
const schema = {
    id: tasksSchemaId,
    description: 'Task definition file',
    type: 'object',
    allowTrailingCommas: true,
    allowComments: true,
    default: {
        version: '2.0.0',
        tasks: [
            {
                label: 'My Task',
                command: 'echo hello',
                type: 'shell',
                args: [],
                problemMatcher: ['$tsc'],
                presentation: {
                    reveal: 'always'
                },
                group: 'build'
            }
        ]
    }
};
schema.definitions = {
    ...schemaVersion1.definitions,
    ...schemaVersion2.definitions,
};
schema.oneOf = [...(schemaVersion2.oneOf || []), ...(schemaVersion1.oneOf || [])];
const jsonRegistry = Registry.as(jsonContributionRegistry.Extensions.JSONContribution);
jsonRegistry.registerSchema(tasksSchemaId, schema);
export class TaskRegistryContribution extends Disposable {
    static { this.ID = 'taskRegistryContribution'; }
    constructor() {
        super();
        this._register(ProblemMatcherRegistry.onMatcherChanged(() => {
            updateProblemMatchers();
            jsonRegistry.notifySchemaChanged(tasksSchemaId);
        }));
        this._register(TaskDefinitionRegistry.onDefinitionsChanged(() => {
            updateTaskDefinitions();
            jsonRegistry.notifySchemaChanged(tasksSchemaId);
        }));
    }
}
registerWorkbenchContribution2(TaskRegistryContribution.ID, TaskRegistryContribution, 3 /* WorkbenchPhase.AfterRestored */);
const configurationRegistry = Registry.as(ConfigurationExtensions.Configuration);
configurationRegistry.registerConfiguration({
    id: 'task',
    order: 100,
    title: nls.localize('tasksConfigurationTitle', "Tasks"),
    type: 'object',
    properties: {
        ["task.problemMatchers.neverPrompt" /* TaskSettingId.ProblemMatchersNeverPrompt */]: {
            markdownDescription: nls.localize('task.problemMatchers.neverPrompt', "Configures whether to show the problem matcher prompt when running a task. Set to `true` to never prompt, or use a dictionary of task types to turn off prompting only for specific task types."),
            'oneOf': [
                {
                    type: 'boolean',
                    markdownDescription: nls.localize('task.problemMatchers.neverPrompt.boolean', 'Sets problem matcher prompting behavior for all tasks.')
                },
                {
                    type: 'object',
                    patternProperties: {
                        '.*': {
                            type: 'boolean'
                        }
                    },
                    markdownDescription: nls.localize('task.problemMatchers.neverPrompt.array', 'An object containing task type-boolean pairs to never prompt for problem matchers on.'),
                    default: {
                        'shell': true
                    }
                }
            ],
            default: false
        },
        ["task.autoDetect" /* TaskSettingId.AutoDetect */]: {
            markdownDescription: nls.localize('task.autoDetect', "Controls enablement of `provideTasks` for all task provider extension. If the Tasks: Run Task command is slow, disabling auto detect for task providers may help. Individual extensions may also provide settings that disable auto detection."),
            type: 'string',
            enum: ['on', 'off'],
            default: 'on'
        },
        ["task.slowProviderWarning" /* TaskSettingId.SlowProviderWarning */]: {
            markdownDescription: nls.localize('task.slowProviderWarning', "Configures whether a warning is shown when a provider is slow"),
            'oneOf': [
                {
                    type: 'boolean',
                    markdownDescription: nls.localize('task.slowProviderWarning.boolean', 'Sets the slow provider warning for all tasks.')
                },
                {
                    type: 'array',
                    items: {
                        type: 'string',
                        markdownDescription: nls.localize('task.slowProviderWarning.array', 'An array of task types to never show the slow provider warning.')
                    }
                }
            ],
            default: true
        },
        ["task.quickOpen.history" /* TaskSettingId.QuickOpenHistory */]: {
            markdownDescription: nls.localize('task.quickOpen.history', "Controls the number of recent items tracked in task quick open dialog."),
            type: 'number',
            default: 30, minimum: 0, maximum: 30
        },
        ["task.quickOpen.detail" /* TaskSettingId.QuickOpenDetail */]: {
            markdownDescription: nls.localize('task.quickOpen.detail', "Controls whether to show the task detail for tasks that have a detail in task quick picks, such as Run Task."),
            type: 'boolean',
            default: true
        },
        ["task.quickOpen.skip" /* TaskSettingId.QuickOpenSkip */]: {
            type: 'boolean',
            description: nls.localize('task.quickOpen.skip', "Controls whether the task quick pick is skipped when there is only one task to pick from."),
            default: false
        },
        ["task.quickOpen.showAll" /* TaskSettingId.QuickOpenShowAll */]: {
            type: 'boolean',
            description: nls.localize('task.quickOpen.showAll', "Causes the Tasks: Run Task command to use the slower \"show all\" behavior instead of the faster two level picker where tasks are grouped by provider."),
            default: false
        },
        ["task.allowAutomaticTasks" /* TaskSettingId.AllowAutomaticTasks */]: {
            type: 'string',
            enum: ['on', 'off'],
            enumDescriptions: [
                nls.localize('task.allowAutomaticTasks.on', "Always"),
                nls.localize('task.allowAutomaticTasks.off', "Never"),
            ],
            description: nls.localize('task.allowAutomaticTasks', "Enable automatic tasks - note that tasks won't run in an untrusted workspace."),
            default: 'on',
            restricted: true
        },
        ["task.reconnection" /* TaskSettingId.Reconnection */]: {
            type: 'boolean',
            description: nls.localize('task.reconnection', "On window reload, reconnect to tasks that have problem matchers."),
            default: true
        },
        ["task.saveBeforeRun" /* TaskSettingId.SaveBeforeRun */]: {
            markdownDescription: nls.localize('task.saveBeforeRun', 'Save all dirty editors before running a task.'),
            type: 'string',
            enum: ['always', 'never', 'prompt'],
            enumDescriptions: [
                nls.localize('task.saveBeforeRun.always', 'Always saves all editors before running.'),
                nls.localize('task.saveBeforeRun.never', 'Never saves editors before running.'),
                nls.localize('task.SaveBeforeRun.prompt', 'Prompts whether to save editors before running.'),
            ],
            default: 'always',
        },
        ["task.verboseLogging" /* TaskSettingId.VerboseLogging */]: {
            type: 'boolean',
            description: nls.localize('task.verboseLogging', "Enable verbose logging for tasks."),
            default: false
        },
    }
});
export const rerunTaskIcon = registerIcon('rerun-task', Codicon.refresh, nls.localize('rerunTaskIcon', 'View icon of the rerun task.'));
export const RerunForActiveTerminalCommandId = 'workbench.action.tasks.rerunForActiveTerminal';
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: RerunForActiveTerminalCommandId,
            icon: rerunTaskIcon,
            title: nls.localize2('workbench.action.tasks.rerunForActiveTerminal', 'Rerun Task'),
            precondition: TASK_TERMINAL_ACTIVE,
            menu: [{ id: MenuId.TerminalInstanceContext, when: TASK_TERMINAL_ACTIVE }],
            keybinding: {
                when: TerminalContextKeys.focus,
                primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 48 /* KeyCode.KeyR */,
                mac: {
                    primary: 256 /* KeyMod.WinCtrl */ | 1024 /* KeyMod.Shift */ | 48 /* KeyCode.KeyR */
                },
                weight: 200 /* KeybindingWeight.WorkbenchContrib */
            }
        });
    }
    async run(accessor, args) {
        const terminalService = accessor.get(ITerminalService);
        const taskSystem = accessor.get(ITaskService);
        const instance = args ?? terminalService.activeInstance;
        if (instance) {
            await taskSystem.rerun(instance.instanceId);
        }
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFzay5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGFza3MvYnJvd3Nlci90YXNrLmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFDO0FBRTFDLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFFNUUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLEVBQUUsZUFBZSxFQUFFLE9BQU8sRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBRWhILE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ3JFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBb0IsTUFBTSxrREFBa0QsQ0FBQztBQUV0RyxPQUFPLEtBQUssd0JBQXdCLE1BQU0scUVBQXFFLENBQUM7QUFHaEgsT0FBTyxFQUFzQixpQkFBaUIsRUFBNEMsTUFBTSxrREFBa0QsQ0FBQztBQUVuSixPQUFPLEVBQTBCLFVBQVUsSUFBSSxTQUFTLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUU1RyxPQUFPLEVBQWMsU0FBUyxFQUFpQixjQUFjLEVBQUUsa0JBQWtCLEVBQUUsb0JBQW9CLEVBQUUsYUFBYSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDbkosT0FBTyxFQUFFLFlBQVksRUFBRSxzQkFBc0IsRUFBRSw2QkFBNkIsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBRS9HLE9BQU8sRUFBRSxVQUFVLElBQUksbUJBQW1CLEVBQTJFLDhCQUE4QixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDOUwsT0FB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