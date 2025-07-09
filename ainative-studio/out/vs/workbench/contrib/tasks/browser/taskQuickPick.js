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
var TaskQuickPick_1;
import * as nls from '../../../../nls.js';
import * as Objects from '../../../../base/common/objects.js';
import { ContributedTask, CustomTask, ConfiguringTask } from '../common/tasks.js';
import * as Types from '../../../../base/common/types.js';
import { ITaskService } from '../common/taskService.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { Event } from '../../../../base/common/event.js';
import { INotificationService, Severity } from '../../../../platform/notification/common/notification.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { getColorClass, createColorStyleElement } from '../../terminal/browser/terminalIcon.js';
import { showWithPinnedItems } from '../../../../platform/quickinput/browser/quickPickPin.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
export const QUICKOPEN_DETAIL_CONFIG = 'task.quickOpen.detail';
export const QUICKOPEN_SKIP_CONFIG = 'task.quickOpen.skip';
export function isWorkspaceFolder(folder) {
    return 'uri' in folder;
}
const SHOW_ALL = nls.localize('taskQuickPick.showAll', "Show All Tasks...");
export const configureTaskIcon = registerIcon('tasks-list-configure', Codicon.gear, nls.localize('configureTaskIcon', 'Configuration icon in the tasks selection list.'));
const removeTaskIcon = registerIcon('tasks-remove', Codicon.close, nls.localize('removeTaskIcon', 'Icon for remove in the tasks selection list.'));
const runTaskStorageKey = 'runTaskStorageKey';
let TaskQuickPick = TaskQuickPick_1 = class TaskQuickPick extends Disposable {
    constructor(_taskService, _configurationService, _quickInputService, _notificationService, _themeService, _dialogService, _storageService) {
        super();
        this._taskService = _taskService;
        this._configurationService = _configurationService;
        this._quickInputService = _quickInputService;
        this._notificationService = _notificationService;
        this._themeService = _themeService;
        this._dialogService = _dialogService;
        this._storageService = _storageService;
        this._sorter = this._taskService.createSorter();
    }
    _showDetail() {
        // Ensure invalid values get converted into boolean values
        return !!this._configurationService.getValue(QUICKOPEN_DETAIL_CONFIG);
    }
    _guessTaskLabel(task) {
        if (task._label) {
            return task._label;
        }
        if (ConfiguringTask.is(task)) {
            let label = task.configures.type;
            const configures = Objects.deepClone(task.configures);
            delete configures['_key'];
            delete configures['type'];
            Object.keys(configures).forEach(key => label += `: ${configures[key]}`);
            return label;
        }
        return '';
    }
    static getTaskLabelWithIcon(task, labelGuess) {
        const label = labelGuess || task._label;
        const icon = task.configurationProperties.icon;
        if (!icon) {
            return `${label}`;
        }
        return icon.id ? `$(${icon.id}) ${label}` : `$(${Codicon.tools.id}) ${label}`;
    }
    static applyColorStyles(task, entry, themeService) {
        if (task.configurationProperties.icon?.color) {
            const colorTheme = themeService.getColorTheme();
            const disposable = createColorStyleElement(colorTheme);
            entry.iconClasses = [getColorClass(task.configurationProperties.icon.color)];
            return disposable;
        }
        return;
    }
    _createTaskEntry(task, extraButtons = []) {
        const buttons = [
            { iconClass: ThemeIcon.asClassName(configureTaskIcon), tooltip: nls.localize('configureTask', "Configure Task") },
            ...extraButtons
        ];
        const entry = { label: TaskQuickPick_1.getTaskLabelWithIcon(task, this._guessTaskLabel(task)), description: this._taskService.getTaskDescription(task), task, detail: this._showDetail() ? task.configurationProperties.detail : undefined, buttons };
        const disposable = TaskQuickPick_1.applyColorStyles(task, entry, this._themeService);
        if (disposable) {
            this._register(disposable);
        }
        return entry;
    }
    _createEntriesForGroup(entries, tasks, groupLabel, extraButtons = []) {
        entries.push({ type: 'separator', label: groupLabel });
        tasks.forEach(task => {
            if (!task.configurationProperties.hide) {
                entries.push(this._createTaskEntry(task, extraButtons));
            }
        });
    }
    _createTypeEntries(entries, types) {
        entries.push({ type: 'separator', label: nls.localize('contributedTasks', "contributed") });
        types.forEach(type => {
            entries.push({ label: `$(folder) ${type}`, task: type, ariaLabel: nls.localize('taskType', "All {0} tasks", type) });
        });
        entries.push({ label: SHOW_ALL, task: SHOW_ALL, alwaysShow: true });
    }
    _handleFolderTaskResult(result) {
        const tasks = [];
        Array.from(result).forEach(([key, folderTasks]) => {
            if (folderTasks.set) {
                tasks.push(...folderTasks.set.tasks);
            }
            if (folderTasks.configurations) {
                for (const configuration in folderTasks.configurations.byIdentifier) {
                    tasks.push(folderTasks.configurations.byIdentifier[configuration]);
                }
            }
        });
        return tasks;
    }
    _dedupeConfiguredAndRecent(recentTasks, configuredTasks) {
        let dedupedConfiguredTasks = [];
        const foundRecentTasks = Array(recentTasks.length).fill(false);
        for (let j = 0; j < configuredTasks.length; j++) {
            const workspaceFolder = configuredTasks[j].getWorkspaceFolder()?.uri.toString();
            const definition = configuredTasks[j].getDefinition()?._key;
            const type = configuredTasks[j].type;
            const label = configuredTasks[j]._label;
            const recentKey = configuredTasks[j].getKey();
            const findIndex = recentTasks.findIndex((value) => {
                return (workspaceFolder && definition && value.getWorkspaceFolder()?.uri.toString() === workspaceFolder
                    && ((value.getDefinition()?._key === definition) || (value.type === type && value._label === label)))
                    || (recentKey && value.getKey() === recentKey);
            });
            if (findIndex === -1) {
                dedupedConfiguredTasks.push(configuredTasks[j]);
            }
            else {
                recentTasks[findIndex] = configuredTasks[j];
                foundRecentTasks[findIndex] = true;
            }
        }
        dedupedConfiguredTasks = dedupedConfiguredTasks.sort((a, b) => this._sorter.compare(a, b));
        const prunedRecentTasks = [];
        for (let i = 0; i < recentTasks.length; i++) {
            if (foundRecentTasks[i] || ConfiguringTask.is(recentTasks[i])) {
                prunedRecentTasks.push(recentTasks[i]);
            }
        }
        return { configuredTasks: dedupedConfiguredTasks, recentTasks: prunedRecentTasks };
    }
    async getTopLevelEntries(defaultEntry) {
        if (this._topLevelEntries !== undefined) {
            return { entries: this._topLevelEntries };
        }
        let recentTasks = (await this._taskService.getSavedTasks('historical')).reverse();
        const configuredTasks = this._handleFolderTaskResult(await this._taskService.getWorkspaceTasks());
        const extensionTaskTypes = this._taskService.taskTypes();
        this._topLevelEntries = [];
        // Dedupe will update recent tasks if they've changed in tasks.json.
        const dedupeAndPrune = this._dedupeConfiguredAndRecent(recentTasks, configuredTasks);
        const dedupedConfiguredTasks = dedupeAndPrune.configuredTasks;
        recentTasks = dedupeAndPrune.recentTasks;
        if (recentTasks.length > 0) {
            const removeRecentButton = {
                iconClass: ThemeIcon.asClassName(removeTaskIcon),
                tooltip: nls.localize('removeRecent', 'Remove Recently Used Task')
            };
            this._createEntriesForGroup(this._topLevelEntries, recentTasks, nls.localize('recentlyUsed', 'recently used'), [removeRecentButton]);
        }
        if (configuredTasks.length > 0) {
            if (dedupedConfiguredTasks.length > 0) {
                this._createEntriesForGroup(this._topLevelEntries, dedupedConfiguredTasks, nls.localize('configured', 'configured'));
            }
        }
        if (defaultEntry && (configuredTasks.length === 0)) {
            this._topLevelEntries.push({ type: 'separator', label: nls.localize('configured', 'configured') });
            this._topLevelEntries.push(defaultEntry);
        }
        if (extensionTaskTypes.length > 0) {
            this._createTypeEntries(this._topLevelEntries, extensionTaskTypes);
        }
        return { entries: this._topLevelEntries, isSingleConfigured: configuredTasks.length === 1 ? configuredTasks[0] : undefined };
    }
    async handleSettingOption(selectedType) {
        const { confirmed } = await this._dialogService.confirm({
            type: Severity.Warning,
            message: nls.localize('TaskQuickPick.changeSettingDetails', "Task detection for {0} tasks causes files in any workspace you open to be run as code. Enabling {0} task detection is a user setting and will apply to any workspace you open. \n\n Do you want to enable {0} task detection for all workspaces?", selectedType),
            cancelButton: nls.localize('TaskQuickPick.changeSettingNo', "No")
        });
        if (confirmed) {
            await this._configurationService.updateValue(`${selectedType}.autoDetect`, 'on');
            await new Promise(resolve => setTimeout(() => resolve(), 100));
            return this.show(nls.localize('TaskService.pickRunTask', 'Select the task to run'), undefined, selectedType);
        }
        return undefined;
    }
    async show(placeHolder, defaultEntry, startAtType, name) {
        const disposables = new DisposableStore();
        const picker = disposables.add(this._quickInputService.createQuickPick({ useSeparators: true }));
        picker.placeholder = placeHolder;
        picker.matchOnDescription = true;
        picker.ignoreFocusOut = false;
        disposables.add(picker.onDidTriggerItemButton(async (context) => {
            const task = context.item.task;
            if (context.button.iconClass === ThemeIcon.asClassName(removeTaskIcon)) {
                const key = (task && !Types.isString(task)) ? task.getKey() : undefined;
                if (key) {
                    this._taskService.removeRecentlyUsedTask(key);
                }
                const indexToRemove = picker.items.indexOf(context.item);
                if (indexToRemove >= 0) {
                    picker.items = [...picker.items.slice(0, indexToRemove), ...picker.items.slice(indexToRemove + 1)];
                }
            }
            else if (context.button.iconClass === ThemeIcon.asClassName(configureTaskIcon)) {
                this._quickInputService.cancel();
                if (ContributedTask.is(task)) {
                    this._taskService.customize(task, undefined, true);
                }
                else if (CustomTask.is(task) || ConfiguringTask.is(task)) {
                    let canOpenConfig = false;
                    try {
                        canOpenConfig = await this._taskService.openConfig(task);
                    }
                    catch (e) {
                        // do nothing.
                    }
                    if (!canOpenConfig) {
                        this._taskService.customize(task, undefined, true);
                    }
                }
            }
        }));
        if (name) {
            picker.value = name;
        }
        let firstLevelTask = startAtType;
        if (!firstLevelTask) {
            // First show recent tasks configured tasks. Other tasks will be available at a second level
            const topLevelEntriesResult = await this.getTopLevelEntries(defaultEntry);
            if (topLevelEntriesResult.isSingleConfigured && this._configurationService.getValue(QUICKOPEN_SKIP_CONFIG)) {
                disposables.dispose();
                return this._toTask(topLevelEntriesResult.isSingleConfigured);
            }
            const taskQuickPickEntries = topLevelEntriesResult.entries;
            firstLevelTask = await this._doPickerFirstLevel(picker, taskQuickPickEntries, disposables);
        }
        do {
            if (Types.isString(firstLevelTask)) {
                if (name) {
                    await this._doPickerFirstLevel(picker, (await this.getTopLevelEntries(defaultEntry)).entries, disposables);
                    disposables.dispose();
                    return undefined;
                }
                const selectedEntry = await this.doPickerSecondLevel(picker, disposables, firstLevelTask);
                // Proceed to second level of quick pick
                if (selectedEntry && !selectedEntry.settingType && selectedEntry.task === null) {
                    // The user has chosen to go back to the first level
                    picker.value = '';
                    firstLevelTask = await this._doPickerFirstLevel(picker, (await this.getTopLevelEntries(defaultEntry)).entries, disposables);
                }
                else if (selectedEntry && Types.isString(selectedEntry.settingType)) {
                    disposables.dispose();
                    return this.handleSettingOption(selectedEntry.settingType);
                }
                else {
                    disposables.dispose();
                    return (selectedEntry?.task && !Types.isString(selectedEntry?.task)) ? this._toTask(selectedEntry?.task) : undefined;
                }
            }
            else if (firstLevelTask) {
                disposables.dispose();
                return this._toTask(firstLevelTask);
            }
            else {
                disposables.dispose();
                return firstLevelTask;
            }
        } while (1);
        return;
    }
    async _doPickerFirstLevel(picker, taskQuickPickEntries, disposables) {
        picker.items = taskQuickPickEntries;
        disposables.add(showWithPinnedItems(this._storageService, runTaskStorageKey, picker, true));
        const firstLevelPickerResult = await new Promise(resolve => {
            disposables.add(Event.once(picker.onDidAccept)(async () => {
                resolve(picker.selectedItems ? picker.selectedItems[0] : undefined);
            }));
        });
        return firstLevelPickerResult?.task;
    }
    async doPickerSecondLevel(picker, disposables, type, name) {
        picker.busy = true;
        if (type === SHOW_ALL) {
            const items = (await this._taskService.tasks()).filter(t => !t.configurationProperties.hide).sort((a, b) => this._sorter.compare(a, b)).map(task => this._createTaskEntry(task));
            items.push(...TaskQuickPick_1.allSettingEntries(this._configurationService));
            picker.items = items;
        }
        else {
            picker.value = name || '';
            picker.items = await this._getEntriesForProvider(type);
        }
        await picker.show();
        picker.busy = false;
        const secondLevelPickerResult = await new Promise(resolve => {
            disposables.add(Event.once(picker.onDidAccept)(async () => {
                resolve(picker.selectedItems ? picker.selectedItems[0] : undefined);
            }));
        });
        return secondLevelPickerResult;
    }
    static allSettingEntries(configurationService) {
        const entries = [];
        const gruntEntry = TaskQuickPick_1.getSettingEntry(configurationService, 'grunt');
        if (gruntEntry) {
            entries.push(gruntEntry);
        }
        const gulpEntry = TaskQuickPick_1.getSettingEntry(configurationService, 'gulp');
        if (gulpEntry) {
            entries.push(gulpEntry);
        }
        const jakeEntry = TaskQuickPick_1.getSettingEntry(configurationService, 'jake');
        if (jakeEntry) {
            entries.push(jakeEntry);
        }
        return entries;
    }
    static getSettingEntry(configurationService, type) {
        if (configurationService.getValue(`${type}.autoDetect`) === 'off') {
            return {
                label: nls.localize('TaskQuickPick.changeSettingsOptions', "$(gear) {0} task detection is turned off. Enable {1} task detection...", type[0].toUpperCase() + type.slice(1), type),
                task: null,
                settingType: type,
                alwaysShow: true
            };
        }
        return undefined;
    }
    async _getEntriesForProvider(type) {
        const tasks = (await this._taskService.tasks({ type })).sort((a, b) => this._sorter.compare(a, b));
        let taskQuickPickEntries = [];
        if (tasks.length > 0) {
            for (const task of tasks) {
                if (!task.configurationProperties.hide) {
                    taskQuickPickEntries.push(this._createTaskEntry(task));
                }
            }
            taskQuickPickEntries.push({
                type: 'separator'
            }, {
                label: nls.localize('TaskQuickPick.goBack', 'Go back ↩'),
                task: null,
                alwaysShow: true
            });
        }
        else {
            taskQuickPickEntries = [{
                    label: nls.localize('TaskQuickPick.noTasksForType', 'No {0} tasks found. Go back ↩', type),
                    task: null,
                    alwaysShow: true
                }];
        }
        const settingEntry = TaskQuickPick_1.getSettingEntry(this._configurationService, type);
        if (settingEntry) {
            taskQuickPickEntries.push(settingEntry);
        }
        return taskQuickPickEntries;
    }
    async _toTask(task) {
        if (!ConfiguringTask.is(task)) {
            return task;
        }
        const resolvedTask = await this._taskService.tryResolveTask(task);
        if (!resolvedTask) {
            this._notificationService.error(nls.localize('noProviderForTask', "There is no task provider registered for tasks of type \"{0}\".", task.type));
        }
        return resolvedTask;
    }
};
TaskQuickPick = TaskQuickPick_1 = __decorate([
    __param(0, ITaskService),
    __param(1, IConfigurationService),
    __param(2, IQuickInputService),
    __param(3, INotificationService),
    __param(4, IThemeService),
    __param(5, IDialogService),
    __param(6, IStorageService)
], TaskQuickPick);
export { TaskQuickPick };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFza1F1aWNrUGljay5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90YXNrcy9icm93c2VyL3Rhc2tRdWlja1BpY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUM7QUFDMUMsT0FBTyxLQUFLLE9BQU8sTUFBTSxvQ0FBb0MsQ0FBQztBQUM5RCxPQUFPLEVBQVEsZUFBZSxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQW1DLE1BQU0sb0JBQW9CLENBQUM7QUFFekgsT0FBTyxLQUFLLEtBQUssTUFBTSxrQ0FBa0MsQ0FBQztBQUMxRCxPQUFPLEVBQUUsWUFBWSxFQUE4QixNQUFNLDBCQUEwQixDQUFDO0FBQ3BGLE9BQU8sRUFBaUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUN6SixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBZSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN6RCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsUUFBUSxFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDMUcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUNsRixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDakUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ2pGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxn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