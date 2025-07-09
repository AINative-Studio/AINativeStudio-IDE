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
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { Extensions as ConfigurationExtensions } from '../../../../platform/configuration/common/configurationRegistry.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions } from '../../../common/contributions.js';
import { IssueFormService } from './issueFormService.js';
import { BrowserIssueService } from './issueService.js';
import './issueTroubleshoot.js';
import { IIssueFormService, IWorkbenchIssueService } from '../common/issue.js';
import { BaseIssueContribution } from '../common/issue.contribution.js';
let WebIssueContribution = class WebIssueContribution extends BaseIssueContribution {
    constructor(productService, configurationService) {
        super(productService, configurationService);
        Registry.as(ConfigurationExtensions.Configuration).registerConfiguration({
            properties: {
                'issueReporter.experimental.webReporter': {
                    type: 'boolean',
                    default: productService.quality !== 'stable',
                    description: 'Enable experimental issue reporter for web.',
                },
            }
        });
    }
};
WebIssueContribution = __decorate([
    __param(0, IProductService),
    __param(1, IConfigurationService)
], WebIssueContribution);
Registry.as(Extensions.Workbench).registerWorkbenchContribution(WebIssueContribution, 3 /* LifecyclePhase.Restored */);
registerSingleton(IWorkbenchIssueService, BrowserIssueService, 1 /* InstantiationType.Delayed */);
registerSingleton(IIssueFormService, IssueFormService, 1 /* InstantiationType.Delayed */);
CommandsRegistry.registerCommand('_issues.getSystemStatus', (accessor) => {
    return nls.localize('statusUnsupported', "The --status argument is not yet supported in browsers.");
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXNzdWUuY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2lzc3VlL2Jyb3dzZXIvaXNzdWUuY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUM7QUFDMUMsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDcEYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLFVBQVUsSUFBSSx1QkFBdUIsRUFBMEIsTUFBTSxvRUFBb0UsQ0FBQztBQUNuSixPQUFPLEVBQXFCLGlCQUFpQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDL0csT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQ3hGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUM1RSxPQUFPLEVBQUUsVUFBVSxFQUFtQyxNQUFNLGtDQUFrQyxDQUFDO0FBQy9GLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ3pELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBQ3hELE9BQU8sd0JBQXdCLENBQUM7QUFDaEMsT0FBTyxFQUFFLGlCQUFpQixFQUFFLHNCQUFzQixFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDL0UsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFJeEUsSUFBTSxvQkFBb0IsR0FBMUIsTUFBTSxvQkFBcUIsU0FBUSxxQkFBcUI7SUFDdkQsWUFBNkIsY0FBK0IsRUFBeUIsb0JBQTJDO1FBQy9ILEtBQUssQ0FBQyxjQUFjLEVBQUUsb0JBQW9CLENBQUMsQ0FBQztRQUM1QyxRQUFRLENBQUMsRUFBRSxDQUF5Qix1QkFBdUIsQ0FBQyxhQUFhLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQztZQUNoRyxVQUFVLEVBQUU7Z0JBQ1gsd0NBQXdDLEVBQUU7b0JBQ3pDLElBQUksRUFBRSxTQUFTO29CQUNmLE9BQU8sRUFBRSxjQUFjLENBQUMsT0FBTyxLQUFLLFFBQVE7b0JBQzVDLFdBQVcsRUFBRSw2Q0FBNkM7aUJBQzFEO2FBQ0Q7U0FDRCxDQUFDLENBQUM7SUFDSixDQUFDO0NBQ0QsQ0FBQTtBQWJLLG9CQUFvQjtJQUNaLFdBQUEsZUFBZSxDQUFBO0lBQW1DLFdBQUEscUJBQXFCLENBQUE7R0FEL0Usb0JBQW9CLENBYXpCO0FBRUQsUUFBUSxDQUFDLEVBQUUsQ0FBa0MsVUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFDLDZCQUE2QixDQUFDLG9CQUFvQixrQ0FBMEIsQ0FBQztBQUVoSixpQkFBaUIsQ0FBQyxzQkFBc0IsRUFBRSxtQkFBbUIsb0NBQTRCLENBQUM7QUFDMUYsaUJBQWlCLENBQUMsaUJBQWlCLEVBQUUsZ0JBQWdCLG9DQUE0QixDQUFDO0FBRWxGLGdCQUFnQixDQUFDLGVBQWUsQ0FBQyx5QkFBeUIsRUFBRSxDQUFDLFFBQVEsRUFBRSxFQUFFO0lBQ3hFLE9BQU8sR0FBRyxDQUFDLFFBQVEsQ0FBQyxtQkFBbUIsRUFBRSx5REFBeUQsQ0FBQyxDQUFDO0FBQ3JHLENBQUMsQ0FBQyxDQUFDIn0=