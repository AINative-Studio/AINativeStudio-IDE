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
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions as WorkbenchExtensions } from '../../../common/contributions.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IBrowserWorkbenchEnvironmentService } from '../../../services/environment/browser/environmentService.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { ContextKeyExpr, IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { WelcomeWidget } from './welcomeWidget.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { Extensions as ConfigurationExtensions } from '../../../../platform/configuration/common/configurationRegistry.js';
import { localize } from '../../../../nls.js';
import { applicationConfigurationNodeBase } from '../../../common/configuration.js';
import { RunOnceScheduler } from '../../../../base/common/async.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
const configurationKey = 'workbench.welcome.experimental.dialog';
let WelcomeDialogContribution = class WelcomeDialogContribution extends Disposable {
    constructor(storageService, environmentService, configurationService, contextService, codeEditorService, instantiationService, commandService, telemetryService, openerService, editorService) {
        super();
        this.isRendered = false;
        if (!storageService.isNew(-1 /* StorageScope.APPLICATION */)) {
            return; // do not show if this is not the first session
        }
        const setting = configurationService.inspect(configurationKey);
        if (!setting.value) {
            return;
        }
        const welcomeDialog = environmentService.options?.welcomeDialog;
        if (!welcomeDialog) {
            return;
        }
        this._register(editorService.onDidActiveEditorChange(() => {
            if (!this.isRendered) {
                const codeEditor = codeEditorService.getActiveCodeEditor();
                if (codeEditor?.hasModel()) {
                    const scheduler = new RunOnceScheduler(() => {
                        const notificationsVisible = contextService.contextMatchesRules(ContextKeyExpr.deserialize('notificationCenterVisible')) ||
                            contextService.contextMatchesRules(ContextKeyExpr.deserialize('notificationToastsVisible'));
                        if (codeEditor === codeEditorService.getActiveCodeEditor() && !notificationsVisible) {
                            this.isRendered = true;
                            const welcomeWidget = new WelcomeWidget(codeEditor, instantiationService, commandService, telemetryService, openerService);
                            welcomeWidget.render(welcomeDialog.title, welcomeDialog.message, welcomeDialog.buttonText, welcomeDialog.buttonCommand);
                        }
                    }, 3000);
                    this._register(codeEditor.onDidChangeModelContent((e) => {
                        if (!this.isRendered) {
                            scheduler.schedule();
                        }
                    }));
                }
            }
        }));
    }
};
WelcomeDialogContribution = __decorate([
    __param(0, IStorageService),
    __param(1, IBrowserWorkbenchEnvironmentService),
    __param(2, IConfigurationService),
    __param(3, IContextKeyService),
    __param(4, ICodeEditorService),
    __param(5, IInstantiationService),
    __param(6, ICommandService),
    __param(7, ITelemetryService),
    __param(8, IOpenerService),
    __param(9, IEditorService)
], WelcomeDialogContribution);
Registry.as(WorkbenchExtensions.Workbench)
    .registerWorkbenchContribution(WelcomeDialogContribution, 4 /* LifecyclePhase.Eventually */);
const configurationRegistry = Registry.as(ConfigurationExtensions.Configuration);
configurationRegistry.registerConfiguration({
    ...applicationConfigurationNodeBase,
    properties: {
        'workbench.welcome.experimental.dialog': {
            scope: 1 /* ConfigurationScope.APPLICATION */,
            type: 'boolean',
            default: false,
            tags: ['experimental'],
            description: localize('workbench.welcome.dialog', "When enabled, a welcome widget is shown in the editor")
        }
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2VsY29tZURpYWxvZy5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvd2VsY29tZURpYWxvZy9icm93c2VyL3dlbGNvbWVEaWFsb2cuY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUM1RSxPQUFPLEVBQUUsVUFBVSxJQUFJLG1CQUFtQixFQUEyRCxNQUFNLGtDQUFrQyxDQUFDO0FBQzlJLE9BQU8sRUFBRSxlQUFlLEVBQWdCLE1BQU0sZ0RBQWdELENBQUM7QUFDL0YsT0FBTyxFQUFFLG1DQUFtQyxFQUFFLE1BQU0sNkRBQTZELENBQUM7QUFDbEgsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxjQUFjLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUMxRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUM5RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDbkYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQ25ELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUM5RSxPQUFPLEVBQTBCLFVBQVUsSUFBSSx1QkFBdUIsRUFBc0IsTUFBTSxvRUFBb0UsQ0FBQztBQUN2SyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDcEYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDcEUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBRWxGLE1BQU0sZ0JBQWdCLEdBQUcsdUNBQXVDLENBQUM7QUFFakUsSUFBTSx5QkFBeUIsR0FBL0IsTUFBTSx5QkFBMEIsU0FBUSxVQUFVO0lBSWpELFlBQ2tCLGNBQStCLEVBQ1gsa0JBQXVELEVBQ3JFLG9CQUEyQyxFQUM5QyxjQUFrQyxFQUNsQyxpQkFBcUMsRUFDbEMsb0JBQTJDLEVBQ2pELGNBQStCLEVBQzdCLGdCQUFtQyxFQUN0QyxhQUE2QixFQUM3QixhQUE2QjtRQUU3QyxLQUFLLEVBQUUsQ0FBQztRQWRELGVBQVUsR0FBRyxLQUFLLENBQUM7UUFnQjFCLElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxtQ0FBMEIsRUFBRSxDQUFDO1lBQ3JELE9BQU8sQ0FBQywrQ0FBK0M7UUFDeEQsQ0FBQztRQUVELE1BQU0sT0FBTyxHQUFHLG9CQUFvQixDQUFDLE9BQU8sQ0FBVSxnQkFBZ0IsQ0FBQyxDQUFDO1FBQ3hFLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDcEIsT0FBTztRQUNSLENBQUM7UUFFRCxNQUFNLGFBQWEsR0FBRyxrQkFBa0IsQ0FBQyxPQUFPLEVBQUUsYUFBYSxDQUFDO1FBQ2hFLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUNwQixPQUFPO1FBQ1IsQ0FBQztRQUVELElBQUksQ0FBQyxTQUFTLENBQUMsYUFBYSxDQUFDLHVCQUF1QixDQUFDLEdBQUcsRUFBRTtZQUN6RCxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO2dCQUV0QixNQUFNLFVBQVUsR0FBRyxpQkFBaUIsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO2dCQUMzRCxJQUFJLFVBQVUsRUFBRSxRQUFRLEVBQUUsRUFBRSxDQUFDO29CQUM1QixNQUFNLFNBQVMsR0FBRyxJQUFJLGdCQUFnQixDQUFDLEdBQUcsRUFBRTt3QkFDM0MsTUFBTSxvQkFBb0IsR0FBRyxjQUFjLENBQUMsbUJBQW1CLENBQUMsY0FBYyxDQUFDLFdBQVcsQ0FBQywyQkFBMkIsQ0FBQyxDQUFDOzRCQUN2SCxjQUFjLENBQUMsbUJBQW1CLENBQUMsY0FBYyxDQUFDLFdBQVcsQ0FBQywyQkFBMkIsQ0FBQyxDQUFDLENBQUM7d0JBQzdGLElBQUksVUFBVSxLQUFLLGlCQUFpQixDQUFDLG1CQUFtQixFQUFFLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDOzRCQUNyRixJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQzs0QkFFdkIsTUFBTSxhQUFhLEdBQUcsSUFBSSxhQUFhLENBQ3RDLFVBQVUsRUFDVixvQkFBb0IsRUFDcEIsY0FBYyxFQUNkLGdCQUFnQixFQUNoQixhQUFhLENBQUMsQ0FBQzs0QkFFaEIsYUFBYSxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsS0FBSyxFQUN2QyxhQUFhLENBQUMsT0FBTyxFQUNyQixhQUFhLENBQUMsVUFBVSxFQUN4QixhQUFhLENBQUMsYUFBYSxDQUFDLENBQUM7d0JBQy9CLENBQUM7b0JBQ0YsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO29CQUVULElBQUksQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7d0JBQ3ZELElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7NEJBQ3RCLFNBQVMsQ0FBQyxRQUFRLEVBQUUsQ0FBQzt3QkFDdEIsQ0FBQztvQkFDRixDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNMLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7Q0FDRCxDQUFBO0FBbEVLLHlCQUF5QjtJQUs1QixXQUFBLGVBQWUsQ0FBQTtJQUNmLFdBQUEsbUNBQW1DLENBQUE7SUFDbkMsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLGtCQUFrQixDQUFBO0lBQ2xCLFdBQUEsa0JBQWtCLENBQUE7SUFDbEIsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLGVBQWUsQ0FBQTtJQUNmLFdBQUEsaUJBQWlCLENBQUE7SUFDakIsV0FBQSxjQUFjLENBQUE7SUFDZCxXQUFBLGNBQWMsQ0FBQTtHQWRYLHlCQUF5QixDQWtFOUI7QUFFRCxRQUFRLENBQUMsRUFBRSxDQUFrQyxtQkFBbUIsQ0FBQyxTQUFTLENBQUM7S0FDekUsNkJBQTZCLENBQUMseUJBQXlCLG9DQUE0QixDQUFDO0FBRXRGLE1BQU0scUJBQXFCLEdBQUcsUUFBUSxDQUFDLEVBQUUsQ0FBeUIsdUJBQXVCLENBQUMsYUFBYSxDQUFDLENBQUM7QUFDekcscUJBQXFCLENBQUMscUJBQXFCLENBQUM7SUFDM0MsR0FBRyxnQ0FBZ0M7SUFDbkMsVUFBVSxFQUFFO1FBQ1gsdUNBQXVDLEVBQUU7WUFDeEMsS0FBSyx3Q0FBZ0M7WUFDckMsSUFBSSxFQUFFLFNBQVM7WUFDZixPQUFPLEVBQUUsS0FBSztZQUNkLElBQUksRUFBRSxDQUFDLGNBQWMsQ0FBQztZQUN0QixXQUFXLEVBQUUsUUFBUSxDQUFDLDBCQUEwQixFQUFFLHVEQUF1RCxDQUFDO1NBQzFHO0tBQ0Q7Q0FDRCxDQUFDLENBQUMifQ==