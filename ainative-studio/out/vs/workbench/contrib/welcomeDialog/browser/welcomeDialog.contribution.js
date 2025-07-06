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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2VsY29tZURpYWxvZy5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi93ZWxjb21lRGlhbG9nL2Jyb3dzZXIvd2VsY29tZURpYWxvZy5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQzVFLE9BQU8sRUFBRSxVQUFVLElBQUksbUJBQW1CLEVBQTJELE1BQU0sa0NBQWtDLENBQUM7QUFDOUksT0FBTyxFQUFFLGVBQWUsRUFBZ0IsTUFBTSxnREFBZ0QsQ0FBQztBQUMvRixPQUFPLEVBQUUsbUNBQW1DLEVBQUUsTUFBTSw2REFBNkQsQ0FBQztBQUNsSCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxFQUFFLGNBQWMsRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQzFHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQzlGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUNuRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDbkQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDdkYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQzlFLE9BQU8sRUFBMEIsVUFBVSxJQUFJLHVCQUF1QixFQUFzQixN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