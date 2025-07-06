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
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import * as arrays from '../../../../base/common/arrays.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { IWorkspaceContextService, UNKNOWN_EMPTY_WINDOW_WORKSPACE } from '../../../../platform/workspace/common/workspace.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IWorkingCopyBackupService } from '../../../services/workingCopy/common/workingCopyBackup.js';
import { ILifecycleService } from '../../../services/lifecycle/common/lifecycle.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { joinPath } from '../../../../base/common/resources.js';
import { IWorkbenchLayoutService } from '../../../services/layout/browser/layoutService.js';
import { GettingStartedInput, gettingStartedInputTypeId } from './gettingStartedInput.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { getTelemetryLevel } from '../../../../platform/telemetry/common/telemetryUtils.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { localize } from '../../../../nls.js';
import { IEditorResolverService, RegisteredEditorPriority } from '../../../services/editor/common/editorResolverService.js';
import { ILogService } from '../../../../platform/log/common/log.js';
export const restoreWalkthroughsConfigurationKey = 'workbench.welcomePage.restorableWalkthroughs';
const configurationKey = 'workbench.startupEditor';
const oldConfigurationKey = 'workbench.welcome.enabled';
const telemetryOptOutStorageKey = 'workbench.telemetryOptOutShown';
let StartupPageEditorResolverContribution = class StartupPageEditorResolverContribution {
    static { this.ID = 'workbench.contrib.startupPageEditorResolver'; }
    constructor(instantiationService, editorResolverService) {
        this.instantiationService = instantiationService;
        editorResolverService.registerEditor(`${GettingStartedInput.RESOURCE.scheme}:/**`, {
            id: GettingStartedInput.ID,
            label: localize('welcome.displayName', "Welcome Page"),
            priority: RegisteredEditorPriority.builtin,
        }, {
            singlePerResource: false,
            canSupportResource: uri => uri.scheme === GettingStartedInput.RESOURCE.scheme,
        }, {
            createEditorInput: ({ resource, options }) => {
                return {
                    editor: this.instantiationService.createInstance(GettingStartedInput, options),
                    options: {
                        ...options,
                        pinned: false
                    }
                };
            }
        });
    }
};
StartupPageEditorResolverContribution = __decorate([
    __param(0, IInstantiationService),
    __param(1, IEditorResolverService)
], StartupPageEditorResolverContribution);
export { StartupPageEditorResolverContribution };
let StartupPageRunnerContribution = class StartupPageRunnerContribution extends Disposable {
    static { this.ID = 'workbench.contrib.startupPageRunner'; }
    constructor(configurationService, editorService, workingCopyBackupService, fileService, contextService, lifecycleService, layoutService, productService, commandService, environmentService, storageService, logService, notificationService) {
        super();
        this.configurationService = configurationService;
        this.editorService = editorService;
        this.workingCopyBackupService = workingCopyBackupService;
        this.fileService = fileService;
        this.contextService = contextService;
        this.lifecycleService = lifecycleService;
        this.layoutService = layoutService;
        this.productService = productService;
        this.commandService = commandService;
        this.environmentService = environmentService;
        this.storageService = storageService;
        this.logService = logService;
        this.notificationService = notificationService;
        this.run().then(undefined, onUnexpectedError);
        this._register(this.editorService.onDidCloseEditor((e) => {
            if (e.editor instanceof GettingStartedInput) {
                e.editor.selectedCategory = undefined;
                e.editor.selectedStep = undefined;
            }
        }));
    }
    async run() {
        // Wait for resolving startup editor until we are restored to reduce startup pressure
        await this.lifecycleService.when(3 /* LifecyclePhase.Restored */);
        // Always open Welcome page for first-launch, no matter what is open or which startupEditor is set.
        if (this.productService.enableTelemetry
            && this.productService.showTelemetryOptOut
            && getTelemetryLevel(this.configurationService) !== 0 /* TelemetryLevel.NONE */
            && !this.environmentService.skipWelcome
            && !this.storageService.get(telemetryOptOutStorageKey, 0 /* StorageScope.PROFILE */)) {
            this.storageService.store(telemetryOptOutStorageKey, true, 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
        }
        if (this.tryOpenWalkthroughForFolder()) {
            return;
        }
        const enabled = isStartupPageEnabled(this.configurationService, this.contextService, this.environmentService, this.logService);
        if (enabled && this.lifecycleService.startupKind !== 3 /* StartupKind.ReloadedWindow */) {
            const hasBackups = await this.workingCopyBackupService.hasBackups();
            if (hasBackups) {
                return;
            }
            // Open the welcome even if we opened a set of default editors
            if (!this.editorService.activeEditor || this.layoutService.openedDefaultEditors) {
                const startupEditorSetting = this.configurationService.inspect(configurationKey);
                if (startupEditorSetting.value === 'readme') {
                    await this.openReadme();
                }
                else if (startupEditorSetting.value === 'welcomePage' || startupEditorSetting.value === 'welcomePageInEmptyWorkbench') {
                    await this.openGettingStarted();
                }
                else if (startupEditorSetting.value === 'terminal') {
                    this.commandService.executeCommand("workbench.action.createTerminalEditor" /* TerminalCommandId.CreateTerminalEditor */);
                }
            }
        }
    }
    tryOpenWalkthroughForFolder() {
        const toRestore = this.storageService.get(restoreWalkthroughsConfigurationKey, 0 /* StorageScope.PROFILE */);
        if (!toRestore) {
            return false;
        }
        else {
            const restoreData = JSON.parse(toRestore);
            const currentWorkspace = this.contextService.getWorkspace();
            if (restoreData.folder === UNKNOWN_EMPTY_WINDOW_WORKSPACE.id || restoreData.folder === currentWorkspace.folders[0].uri.toString()) {
                const options = { selectedCategory: restoreData.category, selectedStep: restoreData.step, pinned: false };
                this.editorService.openEditor({
                    resource: GettingStartedInput.RESOURCE,
                    options
                });
                this.storageService.remove(restoreWalkthroughsConfigurationKey, 0 /* StorageScope.PROFILE */);
                return true;
            }
        }
        return false;
    }
    async openReadme() {
        const readmes = arrays.coalesce(await Promise.all(this.contextService.getWorkspace().folders.map(async (folder) => {
            const folderUri = folder.uri;
            const folderStat = await this.fileService.resolve(folderUri).catch(onUnexpectedError);
            const files = folderStat?.children ? folderStat.children.map(child => child.name).sort() : [];
            const file = files.find(file => file.toLowerCase() === 'readme.md') || files.find(file => file.toLowerCase().startsWith('readme'));
            if (file) {
                return joinPath(folderUri, file);
            }
            else {
                return undefined;
            }
        })));
        if (!this.editorService.activeEditor) {
            if (readmes.length) {
                const isMarkDown = (readme) => readme.path.toLowerCase().endsWith('.md');
                await Promise.all([
                    this.commandService.executeCommand('markdown.showPreview', null, readmes.filter(isMarkDown), { locked: true }).catch(error => {
                        this.notificationService.error(localize('startupPage.markdownPreviewError', 'Could not open markdown preview: {0}.\n\nPlease make sure the markdown extension is enabled.', error.message));
                    }),
                    this.editorService.openEditors(readmes.filter(readme => !isMarkDown(readme)).map(readme => ({ resource: readme }))),
                ]);
            }
            else {
                // If no readme is found, default to showing the welcome page.
                await this.openGettingStarted();
            }
        }
    }
    async openGettingStarted(showTelemetryNotice) {
        const startupEditorTypeID = gettingStartedInputTypeId;
        const editor = this.editorService.activeEditor;
        // Ensure that the welcome editor won't get opened more than once
        if (editor?.typeId === startupEditorTypeID || this.editorService.editors.some(e => e.typeId === startupEditorTypeID)) {
            return;
        }
        const options = editor ? { pinned: false, index: 0, showTelemetryNotice } : { pinned: false, showTelemetryNotice };
        if (startupEditorTypeID === gettingStartedInputTypeId) {
            this.editorService.openEditor({
                resource: GettingStartedInput.RESOURCE,
                options,
            });
        }
    }
};
StartupPageRunnerContribution = __decorate([
    __param(0, IConfigurationService),
    __param(1, IEditorService),
    __param(2, IWorkingCopyBackupService),
    __param(3, IFileService),
    __param(4, IWorkspaceContextService),
    __param(5, ILifecycleService),
    __param(6, IWorkbenchLayoutService),
    __param(7, IProductService),
    __param(8, ICommandService),
    __param(9, IWorkbenchEnvironmentService),
    __param(10, IStorageService),
    __param(11, ILogService),
    __param(12, INotificationService)
], StartupPageRunnerContribution);
export { StartupPageRunnerContribution };
function isStartupPageEnabled(configurationService, contextService, environmentService, logService) {
    if (environmentService.skipWelcome) {
        return false;
    }
    const startupEditor = configurationService.inspect(configurationKey);
    if (!startupEditor.userValue && !startupEditor.workspaceValue) {
        const welcomeEnabled = configurationService.inspect(oldConfigurationKey);
        if (welcomeEnabled.value !== undefined && welcomeEnabled.value !== null) {
            return welcomeEnabled.value;
        }
    }
    return startupEditor.value === 'welcomePage'
        || startupEditor.value === 'readme'
        || (contextService.getWorkbenchState() === 1 /* WorkbenchState.EMPTY */ && startupEditor.value === 'welcomePageInEmptyWorkbench')
        || startupEditor.value === 'terminal';
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhcnR1cFBhZ2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi93ZWxjb21lR2V0dGluZ1N0YXJ0ZWQvYnJvd3Nlci9zdGFydHVwUGFnZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDbkYsT0FBTyxLQUFLLE1BQU0sTUFBTSxtQ0FBbUMsQ0FBQztBQUU1RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDbEYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDdEUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLDhCQUE4QixFQUFrQixNQUFNLG9EQUFvRCxDQUFDO0FBQzlJLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxpQkFBaUIsRUFBK0IsTUFBTSxpREFBaUQsQ0FBQztBQUNqSCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNoRSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUM1RixPQUFPLEVBQStCLG1CQUFtQixFQUFFLHlCQUF5QixFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDdkgsT0FBTyxFQUFFLDRC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