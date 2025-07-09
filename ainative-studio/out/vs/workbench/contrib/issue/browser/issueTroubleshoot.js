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
var TroubleshootIssueService_1, IssueTroubleshootUi_1;
import { localize, localize2 } from '../../../../nls.js';
import { IExtensionManagementService } from '../../../../platform/extensionManagement/common/extensionManagement.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IWorkbenchIssueService } from '../common/issue.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { IUserDataProfileImportExportService, IUserDataProfileManagementService, IUserDataProfileService } from '../../../services/userDataProfile/common/userDataProfile.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IExtensionBisectService } from '../../../services/extensionManagement/browser/extensionBisect.js';
import { INotificationService, NotificationPriority, Severity } from '../../../../platform/notification/common/notification.js';
import { IWorkbenchExtensionEnablementService } from '../../../services/extensionManagement/common/extensionManagement.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { IUserDataProfilesService } from '../../../../platform/userDataProfile/common/userDataProfile.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { ContextKeyExpr, IContextKeyService, RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions } from '../../../common/contributions.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { URI } from '../../../../base/common/uri.js';
import { RemoteNameContext } from '../../../common/contextkeys.js';
import { IsWebContext } from '../../../../platform/contextkey/common/contextkeys.js';
const ITroubleshootIssueService = createDecorator('ITroubleshootIssueService');
var TroubleshootStage;
(function (TroubleshootStage) {
    TroubleshootStage[TroubleshootStage["EXTENSIONS"] = 1] = "EXTENSIONS";
    TroubleshootStage[TroubleshootStage["WORKBENCH"] = 2] = "WORKBENCH";
})(TroubleshootStage || (TroubleshootStage = {}));
class TroubleShootState {
    static fromJSON(raw) {
        if (!raw) {
            return undefined;
        }
        try {
            const data = JSON.parse(raw);
            if ((data.stage === TroubleshootStage.EXTENSIONS || data.stage === TroubleshootStage.WORKBENCH)
                && typeof data.profile === 'string') {
                return new TroubleShootState(data.stage, data.profile);
            }
        }
        catch { /* ignore */ }
        return undefined;
    }
    constructor(stage, profile) {
        this.stage = stage;
        this.profile = profile;
    }
}
let TroubleshootIssueService = class TroubleshootIssueService extends Disposable {
    static { TroubleshootIssueService_1 = this; }
    static { this.storageKey = 'issueTroubleshootState'; }
    constructor(userDataProfileService, userDataProfilesService, userDataProfileManagementService, userDataProfileImportExportService, dialogService, extensionBisectService, notificationService, extensionManagementService, extensionEnablementService, issueService, productService, hostService, storageService, openerService) {
        super();
        this.userDataProfileService = userDataProfileService;
        this.userDataProfilesService = userDataProfilesService;
        this.userDataProfileManagementService = userDataProfileManagementService;
        this.userDataProfileImportExportService = userDataProfileImportExportService;
        this.dialogService = dialogService;
        this.extensionBisectService = extensionBisectService;
        this.notificationService = notificationService;
        this.extensionManagementService = extensionManagementService;
        this.extensionEnablementService = extensionEnablementService;
        this.issueService = issueService;
        this.productService = productService;
        this.hostService = hostService;
        this.storageService = storageService;
        this.openerService = openerService;
    }
    isActive() {
        return this.state !== undefined;
    }
    async start() {
        if (this.isActive()) {
            throw new Error('invalid state');
        }
        const res = await this.dialogService.confirm({
            message: localize('troubleshoot issue', "Troubleshoot Issue"),
            detail: localize('detail.start', "Issue troubleshooting is a process to help you identify the cause for an issue. The cause for an issue can be a misconfiguration, due to an extension, or be {0} itself.\n\nDuring the process the window reloads repeatedly. Each time you must confirm if you are still seeing the issue.", this.productService.nameLong),
            primaryButton: localize({ key: 'msg', comment: ['&& denotes a mnemonic'] }, "&&Troubleshoot Issue"),
            custom: true
        });
        if (!res.confirmed) {
            return;
        }
        const originalProfile = this.userDataProfileService.currentProfile;
        await this.userDataProfileImportExportService.createTroubleshootProfile();
        this.state = new TroubleShootState(TroubleshootStage.EXTENSIONS, originalProfile.id);
        await this.resume();
    }
    async resume() {
        if (!this.isActive()) {
            return;
        }
        if (this.state?.stage === TroubleshootStage.EXTENSIONS && !this.extensionBisectService.isActive) {
            await this.reproduceIssueWithExtensionsDisabled();
        }
        if (this.state?.stage === TroubleshootStage.WORKBENCH) {
            await this.reproduceIssueWithEmptyProfile();
        }
        await this.stop();
    }
    async stop() {
        if (!this.isActive()) {
            return;
        }
        if (this.notificationHandle) {
            this.notificationHandle.close();
            this.notificationHandle = undefined;
        }
        if (this.extensionBisectService.isActive) {
            await this.extensionBisectService.reset();
        }
        const profile = this.userDataProfilesService.profiles.find(p => p.id === this.state?.profile) ?? this.userDataProfilesService.defaultProfile;
        this.state = undefined;
        await this.userDataProfileManagementService.switchProfile(profile);
    }
    async reproduceIssueWithExtensionsDisabled() {
        if (!(await this.extensionManagementService.getInstalled(1 /* ExtensionType.User */)).length) {
            this.state = new TroubleShootState(TroubleshootStage.WORKBENCH, this.state.profile);
            return;
        }
        const result = await this.askToReproduceIssue(localize('profile.extensions.disabled', "Issue troubleshooting is active and has temporarily disabled all installed extensions. Check if you can still reproduce the problem and proceed by selecting from these options."));
        if (result === 'good') {
            const profile = this.userDataProfilesService.profiles.find(p => p.id === this.state.profile) ?? this.userDataProfilesService.defaultProfile;
            await this.reproduceIssueWithExtensionsBisect(profile);
        }
        if (result === 'bad') {
            this.state = new TroubleShootState(TroubleshootStage.WORKBENCH, this.state.profile);
        }
        if (result === 'stop') {
            await this.stop();
        }
    }
    async reproduceIssueWithEmptyProfile() {
        await this.userDataProfileManagementService.createAndEnterTransientProfile();
        this.updateState(this.state);
        const result = await this.askToReproduceIssue(localize('empty.profile', "Issue troubleshooting is active and has temporarily reset your configurations to defaults. Check if you can still reproduce the problem and proceed by selecting from these options."));
        if (result === 'stop') {
            await this.stop();
        }
        if (result === 'good') {
            await this.askToReportIssue(localize('issue is with configuration', "Issue troubleshooting has identified that the issue is caused by your configurations. Please report the issue by exporting your configurations using \"Export Profile\" command and share the file in the issue report."));
        }
        if (result === 'bad') {
            await this.askToReportIssue(localize('issue is in core', "Issue troubleshooting has identified that the issue is with {0}.", this.productService.nameLong));
        }
    }
    async reproduceIssueWithExtensionsBisect(profile) {
        await this.userDataProfileManagementService.switchProfile(profile);
        const extensions = (await this.extensionManagementService.getInstalled(1 /* ExtensionType.User */)).filter(ext => this.extensionEnablementService.isEnabled(ext));
        await this.extensionBisectService.start(extensions);
        await this.hostService.reload();
    }
    askToReproduceIssue(message) {
        return new Promise((c, e) => {
            const goodPrompt = {
                label: localize('I cannot reproduce', "I Can't Reproduce"),
                run: () => c('good')
            };
            const badPrompt = {
                label: localize('This is Bad', "I Can Reproduce"),
                run: () => c('bad')
            };
            const stop = {
                label: localize('Stop', "Stop"),
                run: () => c('stop')
            };
            this.notificationHandle = this.notificationService.prompt(Severity.Info, message, [goodPrompt, badPrompt, stop], { sticky: true, priority: NotificationPriority.URGENT });
        });
    }
    async askToReportIssue(message) {
        let isCheckedInInsiders = false;
        if (this.productService.quality === 'stable') {
            const res = await this.askToReproduceIssueWithInsiders();
            if (res === 'good') {
                await this.dialogService.prompt({
                    type: Severity.Info,
                    message: localize('troubleshoot issue', "Troubleshoot Issue"),
                    detail: localize('use insiders', "This likely means that the issue has been addressed already and will be available in an upcoming release. You can safely use {0} insiders until the new stable version is available.", this.productService.nameLong),
                    custom: true
                });
                return;
            }
            if (res === 'stop') {
                await this.stop();
                return;
            }
            if (res === 'bad') {
                isCheckedInInsiders = true;
            }
        }
        await this.issueService.openReporter({
            issueBody: `> ${message} ${isCheckedInInsiders ? `It is confirmed that the issue exists in ${this.productService.nameLong} Insiders` : ''}`,
        });
    }
    async askToReproduceIssueWithInsiders() {
        const confirmRes = await this.dialogService.confirm({
            type: 'info',
            message: localize('troubleshoot issue', "Troubleshoot Issue"),
            primaryButton: localize('download insiders', "Download {0} Insiders", this.productService.nameLong),
            cancelButton: localize('report anyway', "Report Issue Anyway"),
            detail: localize('ask to download insiders', "Please try to download and reproduce the issue in {0} insiders.", this.productService.nameLong),
            custom: {
                disableCloseAction: true,
            }
        });
        if (!confirmRes.confirmed) {
            return undefined;
        }
        const opened = await this.openerService.open(URI.parse('https://aka.ms/vscode-insiders'));
        if (!opened) {
            return undefined;
        }
        const res = await this.dialogService.prompt({
            type: 'info',
            message: localize('troubleshoot issue', "Troubleshoot Issue"),
            buttons: [{
                    label: localize('good', "I can't reproduce"),
                    run: () => 'good'
                }, {
                    label: localize('bad', "I can reproduce"),
                    run: () => 'bad'
                }],
            cancelButton: {
                label: localize('stop', "Stop"),
                run: () => 'stop'
            },
            detail: localize('ask to reproduce issue', "Please try to reproduce the issue in {0} insiders and confirm if the issue exists there.", this.productService.nameLong),
            custom: {
                disableCloseAction: true,
            }
        });
        return res.result;
    }
    get state() {
        if (this._state === undefined) {
            const raw = this.storageService.get(TroubleshootIssueService_1.storageKey, 0 /* StorageScope.PROFILE */);
            this._state = TroubleShootState.fromJSON(raw);
        }
        return this._state || undefined;
    }
    set state(state) {
        this._state = state ?? null;
        this.updateState(state);
    }
    updateState(state) {
        if (state) {
            this.storageService.store(TroubleshootIssueService_1.storageKey, JSON.stringify(state), 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        }
        else {
            this.storageService.remove(TroubleshootIssueService_1.storageKey, 0 /* StorageScope.PROFILE */);
        }
    }
};
TroubleshootIssueService = TroubleshootIssueService_1 = __decorate([
    __param(0, IUserDataProfileService),
    __param(1, IUserDataProfilesService),
    __param(2, IUserDataProfileManagementService),
    __param(3, IUserDataProfileImportExportService),
    __param(4, IDialogService),
    __param(5, IExtensionBisectService),
    __param(6, INotificationService),
    __param(7, IExtensionManagementService),
    __param(8, IWorkbenchExtensionEnablementService),
    __param(9, IWorkbenchIssueService),
    __param(10, IProductService),
    __param(11, IHostService),
    __param(12, IStorageService),
    __param(13, IOpenerService)
], TroubleshootIssueService);
let IssueTroubleshootUi = class IssueTroubleshootUi extends Disposable {
    static { IssueTroubleshootUi_1 = this; }
    static { this.ctxIsTroubleshootActive = new RawContextKey('isIssueTroubleshootActive', false); }
    constructor(contextKeyService, troubleshootIssueService, storageService) {
        super();
        this.contextKeyService = contextKeyService;
        this.troubleshootIssueService = troubleshootIssueService;
        this.updateContext();
        if (troubleshootIssueService.isActive()) {
            troubleshootIssueService.resume();
        }
        this._register(storageService.onDidChangeValue(0 /* StorageScope.PROFILE */, TroubleshootIssueService.storageKey, this._store)(() => {
            this.updateContext();
        }));
    }
    updateContext() {
        IssueTroubleshootUi_1.ctxIsTroubleshootActive.bindTo(this.contextKeyService).set(this.troubleshootIssueService.isActive());
    }
};
IssueTroubleshootUi = IssueTroubleshootUi_1 = __decorate([
    __param(0, IContextKeyService),
    __param(1, ITroubleshootIssueService),
    __param(2, IStorageService)
], IssueTroubleshootUi);
Registry.as(Extensions.Workbench).registerWorkbenchContribution(IssueTroubleshootUi, 3 /* LifecyclePhase.Restored */);
registerAction2(class TroubleshootIssueAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.troubleshootIssue.start',
            title: localize2('troubleshootIssue', 'Troubleshoot Issue...'),
            category: Categories.Help,
            f1: true,
            precondition: ContextKeyExpr.and(IssueTroubleshootUi.ctxIsTroubleshootActive.negate(), RemoteNameContext.isEqualTo(''), IsWebContext.negate()),
        });
    }
    run(accessor) {
        return accessor.get(ITroubleshootIssueService).start();
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.troubleshootIssue.stop',
            title: localize2('title.stop', 'Stop Troubleshoot Issue'),
            category: Categories.Help,
            f1: true,
            precondition: IssueTroubleshootUi.ctxIsTroubleshootActive
        });
    }
    async run(accessor) {
        return accessor.get(ITroubleshootIssueService).stop();
    }
});
registerSingleton(ITroubleshootIssueService, TroubleshootIssueService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXNzdWVUcm91Ymxlc2hvb3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvaXNzdWUvYnJvd3Nlci9pc3N1ZVRyb3VibGVzaG9vdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUN6RCxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSx3RUFBd0UsQ0FBQztBQUVySCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDeEYsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDNUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDMUYsT0FBTyxFQUFFLG1DQUFtQyxFQUFFLGlDQUFpQyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sNkRBQTZELENBQUM7QUFDOUssT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ2hGLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLGtFQUFrRSxDQUFDO0FBQzNHLE9BQU8sRUFBdUIsb0JBQW9CLEVBQWlCLG9CQUFvQixFQUFFLFFBQVEsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQ3BLLE9BQU8sRUFBRSxvQ0FBb0MsRUFBRSxNQUFNLHFFQUFxRSxDQUFDO0FBQzNILE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUN0RSxPQUFPLEVBQW9CLHdCQUF3QixFQUFFLE1BQU0sZ0VBQWdFLENBQUM7QUFDNUgsT0FBTyxFQUFvQixlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUMvRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sOERBQThELENBQUM7QUFDMUYsT0FBTyxFQUFxQixpQkFBaUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQy9HLE9BQU8sRUFBRSxjQUFjLEVBQUUsa0JBQWtCLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDekgsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQzVFLE9BQU8sRUFBRSxVQUFVLEVBQW1DLE1BQU0sa0NBQWtDLENBQUM7QUFFL0YsT0FBTyxFQUFFLGVBQWUsRUFBK0IsTUFBTSxnREFBZ0QsQ0FBQztBQUM5RyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDOUUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUVyRixNQUFNLHlCQUF5QixHQUFHLGVBQWUsQ0FBNEIsMkJBQTJCLENBQUMsQ0FBQztBQVUxRyxJQUFLLGlCQUdKO0FBSEQsV0FBSyxpQkFBaUI7SUFDckIscUVBQWMsQ0FBQTtJQUNkLG1FQUFTLENBQUE7QUFDVixDQUFDLEVBSEksaUJBQWlCLEtBQWpCLGlCQUFpQixRQUdyQjtBQUlELE1BQU0saUJBQWlCO0lBRXRCLE1BQU0sQ0FBQyxRQUFRLENBQUMsR0FBdUI7UUFDdEMsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO1lBQ1YsT0FBTyxTQUFTLENBQUM7UUFDbEIsQ0FBQztRQUNELElBQUksQ0FBQztZQUVKLE1BQU0sSUFBSSxHQUFRLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDbEMsSUFDQyxDQUFDLElBQUksQ0FBQyxLQUFLLEtBQUssaUJBQWlCLENBQUMsVUFBVSxJQUFJLElBQUksQ0FBQyxLQUFLLEtBQUssaUJBQWlCLENBQUMsU0FBUyxDQUFDO21CQUN4RixPQUFPLElBQUksQ0FBQyxPQUFPLEtBQUssUUFBUSxFQUNsQyxDQUFDO2dCQUNGLE9BQU8sSUFBSSxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUN4RCxDQUFDO1FBQ0YsQ0FBQztRQUFDLE1BQU0sQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQ3hCLE9BQU8sU0FBUyxDQUFDO0lBQ2xCLENBQUM7SUFFRCxZQUNVLEtBQXdCLEVBQ3hCLE9BQWU7UUFEZixVQUFLLEdBQUwsS0FBSyxDQUFtQjtRQUN4QixZQUFPLEdBQVAsT0FBTyxDQUFRO0lBQ3JCLENBQUM7Q0FDTDtBQUVELElBQU0sd0JBQXdCLEdBQTlCLE1BQU0sd0JBQXlCLFNBQVEsVUFBVTs7YUFJaEMsZUFBVSxHQUFHLHdCQUF3QixBQUEzQixDQUE0QjtJQUl0RCxZQUMyQyxzQkFBK0MsRUFDOUMsdUJBQWlELEVBQ3hDLGdDQUFtRSxFQUNqRSxrQ0FBdUUsRUFDNUYsYUFBNkIsRUFDcEIsc0JBQStDLEVBQ2xELG1CQUF5QyxFQUNsQywwQkFBdUQsRUFDOUMsMEJBQWdFLEVBQzlFLFlBQW9DLEVBQzNDLGNBQStCLEVBQ2xDLFdBQXlCLEVBQ3RCLGNBQStCLEVBQ2hDLGFBQTZCO1FBRTlELEtBQUssRUFBRSxDQUFDO1FBZmtDLDJCQUFzQixHQUF0QixzQkFBc0IsQ0FBeUI7UUFDOUMsNEJBQXVCLEdBQXZCLHVCQUF1QixDQUEwQjtRQUN4QyxxQ0FBZ0MsR0FBaEMsZ0NBQWdDLENBQW1DO1FBQ2pFLHVDQUFrQyxHQUFsQyxrQ0FBa0MsQ0FBcUM7UUFDNUYsa0JBQWEsR0FBYixhQUFhLENBQWdCO1FBQ3BCLDJCQUFzQixHQUF0QixzQkFBc0IsQ0FBeUI7UUFDbEQsd0JBQW1CLEdBQW5CLG1CQUFtQixDQUFzQjtRQUNsQywrQkFBMEIsR0FBMUIsMEJBQTBCLENBQTZCO1FBQzlDLCtCQUEwQixHQUExQiwwQkFBMEIsQ0FBc0M7UUFDOUUsaUJBQVksR0FBWixZQUFZLENBQXdCO1FBQzNDLG1CQUFjLEdBQWQsY0FBYyxDQUFpQjtRQUNsQyxnQkFBVyxHQUFYLFdBQVcsQ0FBYztRQUN0QixtQkFBYyxHQUFkLGNBQWMsQ0FBaUI7UUFDaEMsa0JBQWEsR0FBYixhQUFhLENBQWdCO0lBRy9ELENBQUM7SUFFRCxRQUFRO1FBQ1AsT0FBTyxJQUFJLENBQUMsS0FBSyxLQUFLLFNBQVMsQ0FBQztJQUNqQyxDQUFDO0lBRUQsS0FBSyxDQUFDLEtBQUs7UUFDVixJQUFJLElBQUksQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDO1lBQ3JCLE1BQU0sSUFBSSxLQUFLLENBQUMsZUFBZSxDQUFDLENBQUM7UUFDbEMsQ0FBQztRQUVELE1BQU0sR0FBRyxHQUFHLE1BQU0sSUFBSSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUM7WUFDNUMsT0FBTyxFQUFFLFFBQVEsQ0FBQyxvQkFBb0IsRUFBRSxvQkFBb0IsQ0FBQztZQUM3RCxNQUFNLEVBQUUsUUFBUSxDQUFDLGNBQWMsRUFBRSw2UkFBNlIsRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQztZQUM3VixhQUFhLEVBQUUsUUFBUSxDQUFDLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLEVBQUUsc0JBQXNCLENBQUM7WUFDbkcsTUFBTSxFQUFFLElBQUk7U0FDWixDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ3BCLE9BQU87UUFDUixDQUFDO1FBRUQsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLHNCQUFzQixDQUFDLGNBQWMsQ0FBQztRQUNuRSxNQUFNLElBQUksQ0FBQyxrQ0FBa0MsQ0FBQyx5QkFBeUIsRUFBRSxDQUFDO1FBQzFFLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxpQkFBaUIsQ0FBQyxpQkFBaUIsQ0FBQyxVQUFVLEVBQUUsZUFBZSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ3JGLE1BQU0sSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO0lBQ3JCLENBQUM7SUFFRCxLQUFLLENBQUMsTUFBTTtRQUNYLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQztZQUN0QixPQUFPO1FBQ1IsQ0FBQztRQUVELElBQUksSUFBSSxDQUFDLEtBQUssRUFBRSxLQUFLLEtBQUssaUJBQWlCLENBQUMsVUFBVSxJQUFJLENBQUMsSUFBSSxDQUFDLHNCQUFzQixDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ2pHLE1BQU0sSUFBSSxDQUFDLG9DQUFvQyxFQUFFLENBQUM7UUFDbkQsQ0FBQztRQUVELElBQUksSUFBSSxDQUFDLEtBQUssRUFBRSxLQUFLLEtBQUssaUJBQWlCLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDdkQsTUFBTSxJQUFJLENBQUMsOEJBQThCLEVBQUUsQ0FBQztRQUM3QyxDQUFDO1FBRUQsTUFBTSxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7SUFDbkIsQ0FBQztJQUVELEtBQUssQ0FBQyxJQUFJO1FBQ1QsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDO1lBQ3RCLE9BQU87UUFDUixDQUFDO1FBRUQsSUFBSSxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztZQUM3QixJQUFJLENBQUMsa0JBQWtCLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDaEMsSUFBSSxDQUFDLGtCQUFrQixHQUFHLFNBQVMsQ0FBQztRQUNyQyxDQUFDO1FBRUQsSUFBSSxJQUFJLENBQUMsc0JBQXNCLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDMUMsTUFBTSxJQUFJLENBQUMsc0JBQXNCLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDM0MsQ0FBQztRQUVELE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxJQUFJLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxJQUFJLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxjQUFjLENBQUM7UUFDN0ksSUFBSSxDQUFDLEtBQUssR0FBRyxTQUFTLENBQUM7UUFDdkIsTUFBTSxJQUFJLENBQUMsZ0NBQWdDLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ3BFLENBQUM7SUFFTyxLQUFLLENBQUMsb0NBQW9DO1FBQ2pELElBQUksQ0FBQyxDQUFDLE1BQU0sSUFBSSxDQUFDLDBCQUEwQixDQUFDLFlBQVksNEJBQW9CLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUN0RixJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksaUJBQWlCLENBQUMsaUJBQWlCLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxLQUFNLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDckYsT0FBTztRQUNSLENBQUM7UUFFRCxNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxRQUFRLENBQUMsNkJBQTZCLEVBQUUsa0xBQWtMLENBQUMsQ0FBQyxDQUFDO1FBQzNRLElBQUksTUFBTSxLQUFLLE1BQU0sRUFBRSxDQUFDO1lBQ3ZCLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxJQUFJLENBQUMsS0FBTSxDQUFDLE9BQU8sQ0FBQyxJQUFJLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxjQUFjLENBQUM7WUFDN0ksTUFBTSxJQUFJLENBQUMsa0NBQWtDLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDeEQsQ0FBQztRQUNELElBQUksTUFBTSxLQUFLLEtBQUssRUFBRSxDQUFDO1lBQ3RCLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxpQkFBaUIsQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLEtBQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUN0RixDQUFDO1FBQ0QsSUFBSSxNQUFNLEtBQUssTUFBTSxFQUFFLENBQUM7WUFDdkIsTUFBTSxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDbkIsQ0FBQztJQUNGLENBQUM7SUFFTyxLQUFLLENBQUMsOEJBQThCO1FBQzNDLE1BQU0sSUFBSSxDQUFDLGdDQUFnQyxDQUFDLDhCQUE4QixFQUFFLENBQUM7UUFDN0UsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDN0IsTUFBTSxNQUFNLEdBQUcsTUFBTSxJQUFJLENBQUMsbUJBQW1CLENBQUMsUUFBUSxDQUFDLGVBQWUsRUFBRSxzTEFBc0wsQ0FBQyxDQUFDLENBQUM7UUFDalEsSUFBSSxNQUFNLEtBQUssTUFBTSxFQUFFLENBQUM7WUFDdkIsTUFBTSxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDbkIsQ0FBQztRQUNELElBQUksTUFBTSxLQUFLLE1BQU0sRUFBRSxDQUFDO1lBQ3ZCLE1BQU0sSUFBSSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyw2QkFBNkIsRUFBRSx5TkFBeU4sQ0FBQyxDQUFDLENBQUM7UUFDalMsQ0FBQztRQUNELElBQUksTUFBTSxLQUFLLEtBQUssRUFBRSxDQUFDO1lBQ3RCLE1BQU0sSUFBSSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxrQkFBa0IsRUFBRSxrRUFBa0UsRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7UUFDN0osQ0FBQztJQUNGLENBQUM7SUFFTyxLQUFLLENBQUMsa0NBQWtDLENBQUMsT0FBeUI7UUFDekUsTUFBTSxJQUFJLENBQUMsZ0NBQWdDLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ25FLE1BQU0sVUFBVSxHQUFHLENBQUMsTUFBTSxJQUFJLENBQUMsMEJBQTBCLENBQUMsWUFBWSw0QkFBb0IsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUMxSixNQUFNLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDcEQsTUFBTSxJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxDQUFDO0lBQ2pDLENBQUM7SUFFTyxtQkFBbUIsQ0FBQyxPQUFlO1FBQzFDLE9BQU8sSUFBSSxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDM0IsTUFBTSxVQUFVLEdBQWtCO2dCQUNqQyxLQUFLLEVBQUUsUUFBUSxDQUFDLG9CQUFvQixFQUFFLG1CQUFtQixDQUFDO2dCQUMxRCxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQzthQUNwQixDQUFDO1lBQ0YsTUFBTSxTQUFTLEdBQWtCO2dCQUNoQyxLQUFLLEVBQUUsUUFBUSxDQUFDLGFBQWEsRUFBRSxpQkFBaUIsQ0FBQztnQkFDakQsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7YUFDbkIsQ0FBQztZQUNGLE1BQU0sSUFBSSxHQUFrQjtnQkFDM0IsS0FBSyxFQUFFLFFBQVEsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDO2dCQUMvQixHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQzthQUNwQixDQUFDO1lBQ0YsSUFBSSxDQUFDLGtCQUFrQixHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxNQUFNLENBQ3hELFFBQVEsQ0FBQyxJQUFJLEVBQ2IsT0FBTyxFQUNQLENBQUMsVUFBVSxFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsRUFDN0IsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxvQkFBb0IsQ0FBQyxNQUFNLEVBQUUsQ0FDdkQsQ0FBQztRQUNILENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVPLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFlO1FBQzdDLElBQUksbUJBQW1CLEdBQUcsS0FBSyxDQUFDO1FBQ2hDLElBQUksSUFBSSxDQUFDLGNBQWMsQ0FBQyxPQUFPLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDOUMsTUFBTSxHQUFHLEdBQUcsTUFBTSxJQUFJLENBQUMsK0JBQStCLEVBQUUsQ0FBQztZQUN6RCxJQUFJLEdBQUcsS0FBSyxNQUFNLEVBQUUsQ0FBQztnQkFDcEIsTUFBTSxJQUFJLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQztvQkFDL0IsSUFBSSxFQUFFLFFBQVEsQ0FBQyxJQUFJO29CQUNuQixPQUFPLEVBQUUsUUFBUSxDQUFDLG9CQUFvQixFQUFFLG9CQUFvQixDQUFDO29CQUM3RCxNQUFNLEVBQUUsUUFBUSxDQUFDLGNBQWMsRUFBRSxzTEFBc0wsRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQztvQkFDdFAsTUFBTSxFQUFFLElBQUk7aUJBQ1osQ0FBQyxDQUFDO2dCQUNILE9BQU87WUFDUixDQUFDO1lBQ0QsSUFBSSxHQUFHLEtBQUssTUFBTSxFQUFFLENBQUM7Z0JBQ3BCLE1BQU0sSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUNsQixPQUFPO1lBQ1IsQ0FBQztZQUNELElBQUksR0FBRyxLQUFLLEtBQUssRUFBRSxDQUFDO2dCQUNuQixtQkFBbUIsR0FBRyxJQUFJLENBQUM7WUFDNUIsQ0FBQztRQUNGLENBQUM7UUFFRCxNQUFNLElBQUksQ0FBQyxZQUFZLENBQUMsWUFBWSxDQUFDO1lBQ3BDLFNBQVMsRUFBRSxLQUFLLE9BQU8sSUFBSSxtQkFBbUIsQ0FBQyxDQUFDLENBQUMsNENBQTRDLElBQUksQ0FBQyxjQUFjLENBQUMsUUFBUSxXQUFXLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtTQUMzSSxDQUFDLENBQUM7SUFDSixDQUFDO0lBRU8sS0FBSyxDQUFDLCtCQUErQjtRQUM1QyxNQUFNLFVBQVUsR0FBRyxNQUFNLElBQUksQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDO1lBQ25ELElBQUksRUFBRSxNQUFNO1lBQ1osT0FBTyxFQUFFLFFBQVEsQ0FBQyxvQkFBb0IsRUFBRSxvQkFBb0IsQ0FBQztZQUM3RCxhQUFhLEVBQUUsUUFBUSxDQUFDLG1CQUFtQixFQUFFLHVCQUF1QixFQUFFLElBQUksQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDO1lBQ25HLFlBQVksRUFBRSxRQUFRLENBQUMsZUFBZSxFQUFFLHFCQUFxQixDQUFDO1lBQzlELE1BQU0sRUFBRSxRQUFRLENBQUMsMEJBQTBCLEVBQUUsaUVBQWlFLEVBQUUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUM7WUFDN0ksTUFBTSxFQUFFO2dCQUNQLGtCQUFrQixFQUFFLElBQUk7YUFDeEI7U0FDRCxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsVUFBVSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQzNCLE9BQU8sU0FBUyxDQUFDO1FBQ2xCLENBQUM7UUFFRCxNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsZ0NBQWdDLENBQUMsQ0FBQyxDQUFDO1FBQzFGLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNiLE9BQU8sU0FBUyxDQUFDO1FBQ2xCLENBQUM7UUFFRCxNQUFNLEdBQUcsR0FBRyxNQUFNLElBQUksQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFxQjtZQUMvRCxJQUFJLEVBQUUsTUFBTTtZQUNaLE9BQU8sRUFBRSxRQUFRLENBQUMsb0JBQW9CLEVBQUUsb0JBQW9CLENBQUM7WUFDN0QsT0FBTyxFQUFFLENBQUM7b0JBQ1QsS0FBSyxFQUFFLFFBQVEsQ0FBQyxNQUFNLEVBQUUsbUJBQW1CLENBQUM7b0JBQzVDLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxNQUFNO2lCQUNqQixFQUFFO29CQUNGLEtBQUssRUFBRSxRQUFRLENBQUMsS0FBSyxFQUFFLGlCQUFpQixDQUFDO29CQUN6QyxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsS0FBSztpQkFDaEIsQ0FBQztZQUNGLFlBQVksRUFBRTtnQkFDYixLQUFLLEVBQUUsUUFBUSxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUM7Z0JBQy9CLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxNQUFNO2FBQ2pCO1lBQ0QsTUFBTSxFQUFFLFFBQVEsQ0FBQyx3QkFBd0IsRUFBRSwwRkFBMEYsRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQztZQUNwSyxNQUFNLEVBQUU7Z0JBQ1Asa0JBQWtCLEVBQUUsSUFBSTthQUN4QjtTQUNELENBQUMsQ0FBQztRQUVILE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQztJQUNuQixDQUFDO0lBR0QsSUFBSSxLQUFLO1FBQ1IsSUFBSSxJQUFJLENBQUMsTUFBTSxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQy9CLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLDBCQUF3QixDQUFDLFVBQVUsK0JBQXVCLENBQUM7WUFDL0YsSUFBSSxDQUFDLE1BQU0sR0FBRyxpQkFBaUIsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDL0MsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLE1BQU0sSUFBSSxTQUFTLENBQUM7SUFDakMsQ0FBQztJQUVELElBQUksS0FBSyxDQUFDLEtBQW9DO1FBQzdDLElBQUksQ0FBQyxNQUFNLEdBQUcsS0FBSyxJQUFJLElBQUksQ0FBQztRQUM1QixJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ3pCLENBQUM7SUFFTyxXQUFXLENBQUMsS0FBb0M7UUFDdkQsSUFBSSxLQUFLLEVBQUUsQ0FBQztZQUNYLElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLDBCQUF3QixDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyw4REFBOEMsQ0FBQztRQUNwSSxDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLDBCQUF3QixDQUFDLFVBQVUsK0JBQXVCLENBQUM7UUFDdkYsQ0FBQztJQUNGLENBQUM7O0FBblBJLHdCQUF3QjtJQVMzQixXQUFBLHVCQUF1QixDQUFBO0lBQ3ZCLFdBQUEsd0JBQXdCLENBQUE7SUFDeEIsV0FBQSxpQ0FBaUMsQ0FBQTtJQUNqQyxXQUFBLG1DQUFtQyxDQUFBO0lBQ25DLFdBQUEsY0FBYyxDQUFBO0lBQ2QsV0FBQSx1QkFBdUIsQ0FBQTtJQUN2QixXQUFBLG9CQUFvQixDQUFBO0lBQ3BCLFdBQUEsMkJBQTJCLENBQUE7SUFDM0IsV0FBQSxvQ0FBb0MsQ0FBQTtJQUNwQyxXQUFBLHNCQUFzQixDQUFBO0lBQ3RCLFlBQUEsZUFBZSxDQUFBO0lBQ2YsWUFBQSxZQUFZLENBQUE7SUFDWixZQUFBLGVBQWUsQ0FBQTtJQUNmLFlBQUEsY0FBYyxDQUFBO0dBdEJYLHdCQUF3QixDQW9QN0I7QUFFRCxJQUFNLG1CQUFtQixHQUF6QixNQUFNLG1CQUFvQixTQUFRLFVBQVU7O2FBRXBDLDRCQUF1QixHQUFHLElBQUksYUFBYSxDQUFVLDJCQUEyQixFQUFFLEtBQUssQ0FBQyxBQUFqRSxDQUFrRTtJQUVoRyxZQUNzQyxpQkFBcUMsRUFDOUIsd0JBQW1ELEVBQzlFLGNBQStCO1FBRWhELEtBQUssRUFBRSxDQUFDO1FBSjZCLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBb0I7UUFDOUIsNkJBQXdCLEdBQXhCLHdCQUF3QixDQUEyQjtRQUkvRixJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7UUFDckIsSUFBSSx3QkFBd0IsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDO1lBQ3pDLHdCQUF3QixDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ25DLENBQUM7UUFDRCxJQUFJLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsK0JBQXVCLHdCQUF3QixDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxFQUFFO1lBQzNILElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztRQUN0QixDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVPLGFBQWE7UUFDcEIscUJBQW1CLENBQUMsdUJBQXVCLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsd0JBQXdCLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztJQUMxSCxDQUFDOztBQXJCSSxtQkFBbUI7SUFLdEIsV0FBQSxrQkFBa0IsQ0FBQTtJQUNsQixXQUFBLHlCQUF5QixDQUFBO0lBQ3pCLFdBQUEsZUFBZSxDQUFBO0dBUFosbUJBQW1CLENBdUJ4QjtBQUVELFFBQVEsQ0FBQyxFQUFFLENBQWtDLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQyw2QkFBNkIsQ0FBQyxtQkFBbUIsa0NBQTBCLENBQUM7QUFFL0ksZUFBZSxDQUFDLE1BQU0sdUJBQXdCLFNBQVEsT0FBTztJQUM1RDtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSwwQ0FBMEM7WUFDOUMsS0FBSyxFQUFFLFNBQVMsQ0FBQyxtQkFBbUIsRUFBRSx1QkFBdUIsQ0FBQztZQUM5RCxRQUFRLEVBQUUsVUFBVSxDQUFDLElBQUk7WUFDekIsRUFBRSxFQUFFLElBQUk7WUFDUixZQUFZLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsQ0FBQyx1QkFBdUIsQ0FBQyxNQUFNLEVBQUUsRUFBRSxpQkFBaUIsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLEVBQUUsWUFBWSxDQUFDLE1BQU0sRUFBRSxDQUFDO1NBQzlJLENBQUMsQ0FBQztJQUNKLENBQUM7SUFDRCxHQUFHLENBQUMsUUFBMEI7UUFDN0IsT0FBTyxRQUFRLENBQUMsR0FBRyxDQUFDLHlCQUF5QixDQUFDLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDeEQsQ0FBQztDQUNELENBQUMsQ0FBQztBQUVILGVBQWUsQ0FBQyxLQUFNLFNBQVEsT0FBTztJQUNwQztRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSx5Q0FBeUM7WUFDN0MsS0FBSyxFQUFFLFNBQVMsQ0FBQyxZQUFZLEVBQUUseUJBQXlCLENBQUM7WUFDekQsUUFBUSxFQUFFLFVBQVUsQ0FBQyxJQUFJO1lBQ3pCLEVBQUUsRUFBRSxJQUFJO1lBQ1IsWUFBWSxFQUFFLG1CQUFtQixDQUFDLHVCQUF1QjtTQUN6RCxDQUFDLENBQUM7SUFDSixDQUFDO0lBRUQsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUEwQjtRQUNuQyxPQUFPLFFBQVEsQ0FBQyxHQUFHLENBQUMseUJBQXlCLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUN2RCxDQUFDO0NBQ0QsQ0FBQyxDQUFDO0FBR0gsaUJBQWlCLENBQUMseUJBQXlCLEVBQUUsd0JBQXdCLG9DQUE0QixDQUFDIn0=