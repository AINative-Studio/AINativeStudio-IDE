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
import { localize, localize2 } from '../../../../nls.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { Extensions as QuickAccessExtensions } from '../../../../platform/quickinput/common/quickAccess.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions } from '../../../common/contributions.js';
import { IssueQuickAccess } from '../browser/issueQuickAccess.js';
import '../browser/issueTroubleshoot.js';
import { BaseIssueContribution } from '../common/issue.contribution.js';
import { IIssueFormService, IWorkbenchIssueService } from '../common/issue.js';
import { NativeIssueService } from './issueService.js';
import { NativeIssueFormService } from './nativeIssueFormService.js';
import './processMainService.js';
//#region Issue Contribution
registerSingleton(IWorkbenchIssueService, NativeIssueService, 1 /* InstantiationType.Delayed */);
registerSingleton(IIssueFormService, NativeIssueFormService, 1 /* InstantiationType.Delayed */);
let NativeIssueContribution = class NativeIssueContribution extends BaseIssueContribution {
    constructor(productService, configurationService) {
        super(productService, configurationService);
        if (!configurationService.getValue('telemetry.feedback.enabled')) {
            return;
        }
        if (productService.reportIssueUrl) {
            this._register(registerAction2(ReportPerformanceIssueUsingReporterAction));
        }
        let disposable;
        const registerQuickAccessProvider = () => {
            disposable = Registry.as(QuickAccessExtensions.Quickaccess).registerQuickAccessProvider({
                ctor: IssueQuickAccess,
                prefix: IssueQuickAccess.PREFIX,
                contextKey: 'inReportIssuePicker',
                placeholder: localize('tasksQuickAccessPlaceholder', "Type the name of an extension to report on."),
                helpEntries: [{
                        description: localize('openIssueReporter', "Open Issue Reporter"),
                        commandId: 'workbench.action.openIssueReporter'
                    }]
            });
        };
        this._register(configurationService.onDidChangeConfiguration(e => {
            if (!configurationService.getValue('extensions.experimental.issueQuickAccess') && disposable) {
                disposable.dispose();
                disposable = undefined;
            }
            else if (!disposable) {
                registerQuickAccessProvider();
            }
        }));
        if (configurationService.getValue('extensions.experimental.issueQuickAccess')) {
            registerQuickAccessProvider();
        }
    }
};
NativeIssueContribution = __decorate([
    __param(0, IProductService),
    __param(1, IConfigurationService)
], NativeIssueContribution);
Registry.as(Extensions.Workbench).registerWorkbenchContribution(NativeIssueContribution, 3 /* LifecyclePhase.Restored */);
class ReportPerformanceIssueUsingReporterAction extends Action2 {
    static { this.ID = 'workbench.action.reportPerformanceIssueUsingReporter'; }
    constructor() {
        super({
            id: ReportPerformanceIssueUsingReporterAction.ID,
            title: localize2({ key: 'reportPerformanceIssue', comment: [`Here, 'issue' means problem or bug`] }, "Report Performance Issue..."),
            category: Categories.Help,
            f1: true
        });
    }
    async run(accessor) {
        const issueService = accessor.get(IWorkbenchIssueService); // later can just get IIssueFormService
        return issueService.openReporter({ issueType: 1 /* IssueType.PerformanceIssue */ });
    }
}
// #endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXNzdWUuY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2lzc3VlL2VsZWN0cm9uLXNhbmRib3gvaXNzdWUuY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDekQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDhEQUE4RCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDMUYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFxQixpQkFBaUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBRS9HLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUN4RixPQUFPLEVBQXdCLFVBQVUsSUFBSSxxQkFBcUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQ2xJLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUM1RSxPQUFPLEVBQUUsVUFBVSxFQUFtQyxNQUFNLGtDQUFrQyxDQUFDO0FBRS9GLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ2xFLE9BQU8saUNBQWlDLENBQUM7QUFDekMsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDeEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLHNCQUFzQixFQUFhLE1BQU0sb0JBQW9CLENBQUM7QUFDMUYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFDdkQsT0FB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