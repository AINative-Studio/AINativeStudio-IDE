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
import * as semver from '../../../../base/common/semver/semver.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { ExecutionEngine } from '../common/tasks.js';
import { AbstractTaskService } from '../browser/abstractTaskService.js';
import { ITaskService } from '../common/taskService.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { TerminalTaskSystem } from '../browser/terminalTaskSystem.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { ITextModelService } from '../../../../editor/common/services/resolverService.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IMarkerService } from '../../../../platform/markers/common/markers.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IProgressService } from '../../../../platform/progress/common/progress.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { IOutputService } from '../../../services/output/common/output.js';
import { ITerminalGroupService, ITerminalService } from '../../terminal/browser/terminal.js';
import { IConfigurationResolverService } from '../../../services/configurationResolver/common/configurationResolver.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { ILifecycleService } from '../../../services/lifecycle/common/lifecycle.js';
import { IPathService } from '../../../services/path/common/pathService.js';
import { IPreferencesService } from '../../../services/preferences/common/preferences.js';
import { ITextFileService } from '../../../services/textfile/common/textfiles.js';
import { IWorkspaceTrustManagementService, IWorkspaceTrustRequestService } from '../../../../platform/workspace/common/workspaceTrust.js';
import { ITerminalProfileResolverService } from '../../terminal/common/terminal.js';
import { IPaneCompositePartService } from '../../../services/panecomposite/browser/panecomposite.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IRemoteAgentService } from '../../../services/remote/common/remoteAgentService.js';
import { IAccessibilitySignalService } from '../../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
let TaskService = class TaskService extends AbstractTaskService {
    constructor(configurationService, markerService, outputService, paneCompositeService, viewsService, commandService, editorService, fileService, contextService, telemetryService, textFileService, lifecycleService, modelService, extensionService, quickInputService, configurationResolverService, terminalService, terminalGroupService, storageService, progressService, openerService, dialogService, notificationService, contextKeyService, environmentService, terminalProfileResolverService, pathService, textModelResolverService, preferencesService, viewDescriptorService, workspaceTrustRequestService, workspaceTrustManagementService, logService, themeService, instantiationService, remoteAgentService, accessibilitySignalService) {
        super(configurationService, markerService, outputService, paneCompositeService, viewsService, commandService, editorService, fileService, contextService, telemetryService, textFileService, modelService, extensionService, quickInputService, configurationResolverService, terminalService, terminalGroupService, storageService, progressService, openerService, dialogService, notificationService, contextKeyService, environmentService, terminalProfileResolverService, pathService, textModelResolverService, preferencesService, viewDescriptorService, workspaceTrustRequestService, workspaceTrustManagementService, logService, themeService, lifecycleService, remoteAgentService, instantiationService);
        this._register(lifecycleService.onBeforeShutdown(event => event.veto(this.beforeShutdown(), 'veto.tasks')));
    }
    _getTaskSystem() {
        if (this._taskSystem) {
            return this._taskSystem;
        }
        const taskSystem = this._createTerminalTaskSystem();
        this._taskSystem = taskSystem;
        this._taskSystemListeners =
            [
                this._taskSystem.onDidStateChange((event) => {
                    this._taskRunningState.set(this._taskSystem.isActiveSync());
                    this._onDidStateChange.fire(event);
                })
            ];
        return this._taskSystem;
    }
    _computeLegacyConfiguration(workspaceFolder) {
        const { config, hasParseErrors } = this._getConfiguration(workspaceFolder);
        if (hasParseErrors) {
            return Promise.resolve({ workspaceFolder: workspaceFolder, hasErrors: true, config: undefined });
        }
        if (config) {
            return Promise.resolve({ workspaceFolder, config, hasErrors: false });
        }
        else {
            return Promise.resolve({ workspaceFolder: workspaceFolder, hasErrors: true, config: undefined });
        }
    }
    _versionAndEngineCompatible(filter) {
        const range = filter && filter.version ? filter.version : undefined;
        const engine = this.executionEngine;
        return (range === undefined) || ((semver.satisfies('0.1.0', range) && engine === ExecutionEngine.Process) || (semver.satisfies('2.0.0', range) && engine === ExecutionEngine.Terminal));
    }
    beforeShutdown() {
        if (!this._taskSystem) {
            return false;
        }
        if (!this._taskSystem.isActiveSync()) {
            return false;
        }
        // The terminal service kills all terminal on shutdown. So there
        // is nothing we can do to prevent this here.
        if (this._taskSystem instanceof TerminalTaskSystem) {
            return false;
        }
        let terminatePromise;
        if (this._taskSystem.canAutoTerminate()) {
            terminatePromise = Promise.resolve({ confirmed: true });
        }
        else {
            terminatePromise = this._dialogService.confirm({
                message: nls.localize('TaskSystem.runningTask', 'There is a task running. Do you want to terminate it?'),
                primaryButton: nls.localize({ key: 'TaskSystem.terminateTask', comment: ['&& denotes a mnemonic'] }, "&&Terminate Task")
            });
        }
        return terminatePromise.then(res => {
            if (res.confirmed) {
                return this._taskSystem.terminateAll().then((responses) => {
                    let success = true;
                    let code = undefined;
                    for (const response of responses) {
                        success = success && response.success;
                        // We only have a code in the old output runner which only has one task
                        // So we can use the first code.
                        if (code === undefined && response.code !== undefined) {
                            code = response.code;
                        }
                    }
                    if (success) {
                        this._taskSystem = undefined;
                        this._disposeTaskSystemListeners();
                        return false; // no veto
                    }
                    else if (code && code === 3 /* TerminateResponseCode.ProcessNotFound */) {
                        return this._dialogService.confirm({
                            message: nls.localize('TaskSystem.noProcess', 'The launched task doesn\'t exist anymore. If the task spawned background processes exiting VS Code might result in orphaned processes. To avoid this start the last background process with a wait flag.'),
                            primaryButton: nls.localize({ key: 'TaskSystem.exitAnyways', comment: ['&& denotes a mnemonic'] }, "&&Exit Anyways"),
                            type: 'info'
                        }).then(res => !res.confirmed);
                    }
                    return true; // veto
                }, (err) => {
                    return true; // veto
                });
            }
            return true; // veto
        });
    }
};
TaskService = __decorate([
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
    __param(11, ILifecycleService),
    __param(12, IModelService),
    __param(13, IExtensionService),
    __param(14, IQuickInputService),
    __param(15, IConfigurationResolverService),
    __param(16, ITerminalService),
    __param(17, ITerminalGroupService),
    __param(18, IStorageService),
    __param(19, IProgressService),
    __param(20, IOpenerService),
    __param(21, IDialogService),
    __param(22, INotificationService),
    __param(23, IContextKeyService),
    __param(24, IWorkbenchEnvironmentService),
    __param(25, ITerminalProfileResolverService),
    __param(26, IPathService),
    __param(27, ITextModelService),
    __param(28, IPreferencesService),
    __param(29, IViewDescriptorService),
    __param(30, IWorkspaceTrustRequestService),
    __param(31, IWorkspaceTrustManagementService),
    __param(32, ILogService),
    __param(33, IThemeService),
    __param(34, IInstantiationService),
    __param(35, IRemoteAgentService),
    __param(36, IAccessibilitySignalService)
], TaskService);
export { TaskService };
registerSingleton(ITaskService, TaskService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFza1NlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGFza3MvZWxlY3Ryb24tc2FuZGJveC90YXNrU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFDO0FBQzFDLE9BQU8sS0FBSyxNQUFNLE1BQU0sMENBQTBDLENBQUM7QUFDbkUsT0FBTyxFQUFvQix3QkFBd0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBRWhILE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUVyRCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN4RSxPQUFPLEVBQWUsWUFBWSxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDckUsT0FBTyxFQUFxQixpQkFBaUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQy9HLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3RFLE9BQU8sRUFBdUIsY0FBYyxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFFckcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUNuRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUMxRixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDMUUsT0FBTyxF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