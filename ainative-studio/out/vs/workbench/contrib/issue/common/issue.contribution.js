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
import { Disposable } from '../../../../base/common/lifecycle.js';
import { localize, localize2 } from '../../../../nls.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { MenuId, MenuRegistry } from '../../../../platform/actions/common/actions.js';
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IWorkbenchIssueService } from './issue.js';
const OpenIssueReporterActionId = 'workbench.action.openIssueReporter';
const OpenIssueReporterApiId = 'vscode.openIssueReporter';
const OpenIssueReporterCommandMetadata = {
    description: 'Open the issue reporter and optionally prefill part of the form.',
    args: [
        {
            name: 'options',
            description: 'Data to use to prefill the issue reporter with.',
            isOptional: true,
            schema: {
                oneOf: [
                    {
                        type: 'string',
                        description: 'The extension id to preselect.'
                    },
                    {
                        type: 'object',
                        properties: {
                            extensionId: {
                                type: 'string'
                            },
                            issueTitle: {
                                type: 'string'
                            },
                            issueBody: {
                                type: 'string'
                            }
                        }
                    }
                ]
            }
        },
    ]
};
let BaseIssueContribution = class BaseIssueContribution extends Disposable {
    constructor(productService, configurationService) {
        super();
        if (!configurationService.getValue('telemetry.feedback.enabled')) {
            this._register(CommandsRegistry.registerCommand({
                id: 'workbench.action.openIssueReporter',
                handler: function (accessor) {
                    const data = accessor.get(INotificationService);
                    data.info('Feedback is disabled.');
                },
            }));
            return;
        }
        if (!productService.reportIssueUrl) {
            return;
        }
        this._register(CommandsRegistry.registerCommand({
            id: OpenIssueReporterActionId,
            handler: function (accessor, args) {
                const data = typeof args === 'string'
                    ? { extensionId: args }
                    : Array.isArray(args)
                        ? { extensionId: args[0] }
                        : args ?? {};
                return accessor.get(IWorkbenchIssueService).openReporter(data);
            },
            metadata: OpenIssueReporterCommandMetadata
        }));
        this._register(CommandsRegistry.registerCommand({
            id: OpenIssueReporterApiId,
            handler: function (accessor, args) {
                const data = typeof args === 'string'
                    ? { extensionId: args }
                    : Array.isArray(args)
                        ? { extensionId: args[0] }
                        : args ?? {};
                return accessor.get(IWorkbenchIssueService).openReporter(data);
            },
            metadata: OpenIssueReporterCommandMetadata
        }));
        const reportIssue = {
            id: OpenIssueReporterActionId,
            title: localize2({ key: 'reportIssueInEnglish', comment: ['Translate this to "Report Issue in English" in all languages please!'] }, "Report Issue..."),
            category: Categories.Help
        };
        this._register(MenuRegistry.appendMenuItem(MenuId.CommandPalette, { command: reportIssue }));
        this._register(MenuRegistry.appendMenuItem(MenuId.MenubarHelpMenu, {
            group: '3_feedback',
            command: {
                id: OpenIssueReporterActionId,
                title: localize({ key: 'miReportIssue', comment: ['&& denotes a mnemonic', 'Translate this to "Report Issue in English" in all languages please!'] }, "Report &&Issue")
            },
            order: 3
        }));
    }
};
BaseIssueContribution = __decorate([
    __param(0, IProductService),
    __param(1, IConfigurationService)
], BaseIssueContribution);
export { BaseIssueContribution };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXNzdWUuY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2lzc3VlL2NvbW1vbi9pc3N1ZS5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFFekQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDhEQUE4RCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxNQUFNLEVBQUUsWUFBWSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDdEYsT0FBTyxFQUFFLGdCQUFnQixFQUFvQixNQUFNLGtEQUFrRCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUV4RixPQUFPLEVBQXFCLHNCQUFzQixFQUFFLE1BQU0sWUFBWSxDQUFDO0FBRXZFLE1BQU0seUJBQXlCLEdBQUcsb0NBQW9DLENBQUM7QUFDdkUsTUFBTSxzQkFBc0IsR0FBRywwQkFBMEIsQ0FBQztBQUUxRCxNQUFNLGdDQUFnQyxHQUFxQjtJQUMxRCxXQUFXLEVBQUUsa0VBQWtFO0lBQy9FLElBQUksRUFBRTtRQUNMO1lBQ0MsSUFBSSxFQUFFLFNBQVM7WUFDZixXQUFXLEVBQUUsaURBQWlEO1lBQzlELFVBQVUsRUFBRSxJQUFJO1lBQ2hCLE1BQU0sRUFBRTtnQkFDUCxLQUFLLEVBQUU7b0JBQ047d0JBQ0Ms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