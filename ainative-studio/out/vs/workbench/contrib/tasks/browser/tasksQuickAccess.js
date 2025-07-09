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
var TasksQuickAccessProvider_1;
import { localize } from '../../../../nls.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { PickerQuickAccessProvider, TriggerAction } from '../../../../platform/quickinput/browser/pickerQuickAccess.js';
import { matchesFuzzy } from '../../../../base/common/filters.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { ITaskService } from '../common/taskService.js';
import { CustomTask, ContributedTask, ConfiguringTask } from '../common/tasks.js';
import { TaskQuickPick } from './taskQuickPick.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { isString } from '../../../../base/common/types.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
let TasksQuickAccessProvider = class TasksQuickAccessProvider extends PickerQuickAccessProvider {
    static { TasksQuickAccessProvider_1 = this; }
    static { this.PREFIX = 'task '; }
    constructor(extensionService, _taskService, _configurationService, _quickInputService, _notificationService, _dialogService, _themeService, _storageService) {
        super(TasksQuickAccessProvider_1.PREFIX, {
            noResultsPick: {
                label: localize('noTaskResults', "No matching tasks")
            }
        });
        this._taskService = _taskService;
        this._configurationService = _configurationService;
        this._quickInputService = _quickInputService;
        this._notificationService = _notificationService;
        this._dialogService = _dialogService;
        this._themeService = _themeService;
        this._storageService = _storageService;
    }
    async _getPicks(filter, disposables, token) {
        if (token.isCancellationRequested) {
            return [];
        }
        const taskQuickPick = new TaskQuickPick(this._taskService, this._configurationService, this._quickInputService, this._notificationService, this._themeService, this._dialogService, this._storageService);
        const topLevelPicks = await taskQuickPick.getTopLevelEntries();
        const taskPicks = [];
        for (const entry of topLevelPicks.entries) {
            const highlights = matchesFuzzy(filter, entry.label);
            if (!highlights) {
                continue;
            }
            if (entry.type === 'separator') {
                taskPicks.push(entry);
            }
            const task = entry.task;
            const quickAccessEntry = entry;
            quickAccessEntry.highlights = { label: highlights };
            quickAccessEntry.trigger = (index) => {
                if ((index === 1) && (quickAccessEntry.buttons?.length === 2)) {
                    const key = (task && !isString(task)) ? task.getKey() : undefined;
                    if (key) {
                        this._taskService.removeRecentlyUsedTask(key);
                    }
                    return TriggerAction.REFRESH_PICKER;
                }
                else {
                    if (ContributedTask.is(task)) {
                        this._taskService.customize(task, undefined, true);
                    }
                    else if (CustomTask.is(task)) {
                        this._taskService.openConfig(task);
                    }
                    return TriggerAction.CLOSE_PICKER;
                }
            };
            quickAccessEntry.accept = async () => {
                if (isString(task)) {
                    // switch to quick pick and show second level
                    const showResult = await taskQuickPick.show(localize('TaskService.pickRunTask', 'Select the task to run'), undefined, task);
                    if (showResult) {
                        this._taskService.run(showResult, { attachProblemMatcher: true });
                    }
                }
                else {
                    this._taskService.run(await this._toTask(task), { attachProblemMatcher: true });
                }
            };
            taskPicks.push(quickAccessEntry);
        }
        return taskPicks;
    }
    async _toTask(task) {
        if (!ConfiguringTask.is(task)) {
            return task;
        }
        return this._taskService.tryResolveTask(task);
    }
};
TasksQuickAccessProvider = TasksQuickAccessProvider_1 = __decorate([
    __param(0, IExtensionService),
    __param(1, ITaskService),
    __param(2, IConfigurationService),
    __param(3, IQuickInputService),
    __param(4, INotificationService),
    __param(5, IDialogService),
    __param(6, IThemeService),
    __param(7, IStorageService)
], TasksQuickAccessProvider);
export { TasksQuickAccessProvider };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFza3NRdWlja0FjY2Vzcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90YXNrcy9icm93c2VyL3Rhc2tzUXVpY2tBY2Nlc3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQXVCLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDL0csT0FBTyxFQUEwQix5QkFBeUIsRUFBRSxhQUFhLEVBQUUsTUFBTSw4REFBOEQsQ0FBQztBQUNoSixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDbEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDdEYsT0FBTyxFQUFFLFlBQVksRUFBUSxNQUFNLDBCQUEwQixDQUFDO0FBQzlELE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLGVBQWUsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBR2xGLE9BQU8sRUFBRSxhQUFhLEVBQStCLE1BQU0sb0JBQW9CLENBQUM7QUFDaEYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNoRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDbEYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBRTFFLElBQU0sd0JBQXdC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