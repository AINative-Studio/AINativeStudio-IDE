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
import { registerWorkbenchContribution2 } from '../../common/contributions.js';
import { IInstantiationService } from '../../../platform/instantiation/common/instantiation.js';
// --- other interested parties
import { JSONValidationExtensionPoint } from '../common/jsonValidationExtensionPoint.js';
import { ColorExtensionPoint } from '../../services/themes/common/colorExtensionPoint.js';
import { IconExtensionPoint } from '../../services/themes/common/iconExtensionPoint.js';
import { TokenClassificationExtensionPoints } from '../../services/themes/common/tokenClassificationExtensionPoint.js';
import { LanguageConfigurationFileHandler } from '../../contrib/codeEditor/common/languageConfigurationExtensionPoint.js';
import { StatusBarItemsExtensionPoint } from './statusBarExtensionPoint.js';
// --- mainThread participants
import './mainThreadLocalization.js';
import './mainThreadBulkEdits.js';
import './mainThreadLanguageModels.js';
import './mainThreadChatAgents2.js';
import './mainThreadChatCodeMapper.js';
import './mainThreadLanguageModelTools.js';
import './mainThreadEmbeddings.js';
import './mainThreadCodeInsets.js';
import './mainThreadCLICommands.js';
import './mainThreadClipboard.js';
import './mainThreadCommands.js';
import './mainThreadConfiguration.js';
import './mainThreadConsole.js';
import './mainThreadDebugService.js';
import './mainThreadDecorations.js';
import './mainThreadDiagnostics.js';
import './mainThreadDialogs.js';
import './mainThreadDocumentContentProviders.js';
import './mainThreadDocuments.js';
import './mainThreadDocumentsAndEditors.js';
import './mainThreadEditor.js';
import './mainThreadEditors.js';
import './mainThreadEditorTabs.js';
import './mainThreadErrors.js';
import './mainThreadExtensionService.js';
import './mainThreadFileSystem.js';
import './mainThreadFileSystemEventService.js';
import './mainThreadLanguageFeatures.js';
import './mainThreadLanguages.js';
import './mainThreadLogService.js';
import './mainThreadMessageService.js';
import './mainThreadManagedSockets.js';
import './mainThreadOutputService.js';
import './mainThreadProgress.js';
import './mainThreadQuickDiff.js';
import './mainThreadQuickOpen.js';
import './mainThreadRemoteConnectionData.js';
import './mainThreadSaveParticipant.js';
import './mainThreadSpeech.js';
import './mainThreadEditSessionIdentityParticipant.js';
import './mainThreadSCM.js';
import './mainThreadSearch.js';
import './mainThreadStatusBar.js';
import './mainThreadStorage.js';
import './mainThreadTelemetry.js';
import './mainThreadTerminalService.js';
import './mainThreadTerminalShellIntegration.js';
import './mainThreadTheming.js';
import './mainThreadTreeViews.js';
import './mainThreadDownloadService.js';
import './mainThreadUrls.js';
import './mainThreadUriOpeners.js';
import './mainThreadWindow.js';
import './mainThreadWebviewManager.js';
import './mainThreadWorkspace.js';
import './mainThreadComments.js';
import './mainThreadNotebook.js';
import './mainThreadNotebookKernels.js';
import './mainThreadNotebookDocumentsAndEditors.js';
import './mainThreadNotebookRenderers.js';
import './mainThreadNotebookSaveParticipant.js';
import './mainThreadInteractive.js';
import './mainThreadTask.js';
import './mainThreadLabelService.js';
import './mainThreadTunnelService.js';
import './mainThreadAuthentication.js';
import './mainThreadTimeline.js';
import './mainThreadTesting.js';
import './mainThreadSecretState.js';
import './mainThreadShare.js';
import './mainThreadProfileContentHandlers.js';
import './mainThreadAiRelatedInformation.js';
import './mainThreadAiEmbeddingVector.js';
import './mainThreadMcp.js';
import './mainThreadChatStatus.js';
let ExtensionPoints = class ExtensionPoints {
    static { this.ID = 'workbench.contrib.extensionPoints'; }
    constructor(instantiationService) {
        this.instantiationService = instantiationService;
        // Classes that handle extension points...
        this.instantiationService.createInstance(JSONValidationExtensionPoint);
        this.instantiationService.createInstance(ColorExtensionPoint);
        this.instantiationService.createInstance(IconExtensionPoint);
        this.instantiationService.createInstance(TokenClassificationExtensionPoints);
        this.instantiationService.createInstance(LanguageConfigurationFileHandler);
        this.instantiationService.createInstance(StatusBarItemsExtensionPoint);
    }
};
ExtensionPoints = __decorate([
    __param(0, IInstantiationService)
], ExtensionPoints);
export { ExtensionPoints };
registerWorkbenchContribution2(ExtensionPoints.ID, ExtensionPoints, 1 /* WorkbenchPhase.BlockStartup */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uSG9zdC5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvdGVzdC9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvYnJvd3Nlci9leHRlbnNpb25Ib3N0LmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQTBDLDhCQUE4QixFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDdkgsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFFaEcsK0JBQStCO0FBQy9CLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ3pGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQ3hGLE9BQU8sRUFBRSxrQ0FBa0MsRUFBRSxNQUFNLG1FQUFtRSxDQUFDO0FBQ3ZILE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLHdFQUF3RSxDQUFDO0FBQzFILE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBRTVFLDhCQUE4QjtBQUM5QixPQUFPLDZCQUE2QixDQUFDO0FBQ3JDLE9BQU8sMEJBQTBCLENBQUM7QUFDbEMsT0FBTywrQkFBK0IsQ0FBQztBQUN2QyxPQUFPLDRCQUE0QixDQUFDO0FBQ3BDLE9BQU8sK0JBQStCLENBQUM7QUFDdkMsT0FBTyxtQ0FBbUMsQ0FBQztBQUMzQyxPQUFPLDJCQUEyQixDQUFDO0FBQ25DLE9BQU8sMkJBQTJCLENBQUM7QUFDbkMsT0FBTyw0QkFBNEIsQ0FBQztBQUNwQyxPQUFPLDBCQUEwQixDQUFDO0FBQ2xDLE9BQU8seUJBQXlCLENBQUM7QUFDakMsT0FBTyw4QkFBOEIsQ0FBQztBQUN0QyxPQUFPLHdCQUF3QixDQUFDO0FBQ2hDLE9BQU8sNkJBQTZCLENBQUM7QUFDckMsT0FBTyw0QkFBNEIsQ0FBQztBQUNwQyxPQUFPLDRCQUE0QixDQUFDO0FBQ3BDLE9BQU8sd0JBQXdCLENBQUM7QUFDaEMsT0FBTyx5Q0FBeUMsQ0FBQztBQUNqRCxPQUFPLDBCQUEwQixDQUFDO0FBQ2xDLE9BQU8sb0NBQW9DLENBQUM7QUFDNUMsT0FBTyx1QkFBdUIsQ0FBQztBQUMvQixPQUFPLHdCQUF3QixDQUFDO0FBQ2hDLE9BQU8sMkJBQTJCLENBQUM7QUFDbkMsT0FBTyx1QkFBdUIsQ0FBQztBQUMvQixPQUFPLGlDQUFpQyxDQUFDO0FBQ3pDLE9BQU8sMkJBQTJCLENBQUM7QUFDbkMsT0FBTyx1Q0FBdUMsQ0FBQztBQUMvQyxPQUFPLGlDQUFpQyxDQUFDO0FBQ3pDLE9BQU8sMEJBQTBCLENBQUM7QUFDbEMsT0FBTywyQkFBMkIsQ0FBQztBQUNuQyxPQUFPLCtCQUErQixDQUFDO0FBQ3ZDLE9BQU8sK0JBQStCLENBQUM7QUFDdkMsT0FBTyw4QkFBOEIsQ0FBQztBQUN0QyxPQUFPLHlCQUF5QixDQUFDO0FBQ2pDLE9BQU8sMEJBQTBCLENBQUM7QUFDbEMsT0FBTywwQkFBMEIsQ0FBQztBQUNsQyxPQUFPLHFDQUFxQyxDQUFDO0FBQzdDLE9BQU8sZ0NBQWdDLENBQUM7QUFDeEMsT0FBTyx1QkFBdUIsQ0FBQztBQUMvQixPQUFPLCtDQUErQyxDQUFDO0FBQ3ZELE9BQU8sb0JBQW9CLENBQUM7QUFDNUIsT0FBTyx1QkFBdUIsQ0FBQztBQUMvQixPQUFPLDBCQUEwQixDQUFDO0FBQ2xDLE9BQU8sd0JBQXdCLENBQUM7QUFDaEMsT0FBTywwQkFBMEIsQ0FBQztBQUNsQyxPQUFPLGdDQUFnQyxDQUFDO0FBQ3hDLE9BQU8seUNBQXlDLENBQUM7QUFDakQsT0FBTyx3QkFBd0IsQ0FBQztBQUNoQyxPQUFPLDBCQUEwQixDQUFDO0FBQ2xDLE9BQU8sZ0NBQWdDLENBQUM7QUFDeEMsT0FBTyxxQkFBcUIsQ0FBQztBQUM3QixPQUFPLDJCQUEyQixDQUFDO0FBQ25DLE9BQU8sdUJBQXVCLENBQUM7QUFDL0IsT0FBTywrQkFBK0IsQ0FBQztBQUN2QyxPQUFPLDBCQUEwQixDQUFDO0FBQ2xDLE9BQU8seUJBQXlCLENBQUM7QUFDakMsT0FBTyx5QkFBeUIsQ0FBQztBQUNqQyxPQUFPLGdDQUFnQyxDQUFDO0FBQ3hDLE9BQU8sNENBQTRDLENBQUM7QUFDcEQsT0FBTyxrQ0FBa0MsQ0FBQztBQUMxQyxPQUFPLHdDQUF3QyxDQUFDO0FBQ2hELE9BQU8sNEJBQTRCLENBQUM7QUFDcEMsT0FBTyxxQkFBcUIsQ0FBQztBQUM3QixPQUFPLDZCQUE2QixDQUFDO0FBQ3JDLE9BQU8sOEJBQThCLENBQUM7QUFDdEMsT0FBTywrQkFBK0IsQ0FBQztBQUN2QyxPQUFPLHlCQUF5QixDQUFDO0FBQ2pDLE9BQU8sd0JBQXdCLENBQUM7QUFDaEMsT0FBTyw0QkFBNEIsQ0FBQztBQUNwQyxPQUFPLHNCQUFzQixDQUFDO0FBQzlCLE9BQU8sdUNBQXVDLENBQUM7QUFDL0MsT0FBTyxxQ0FBcUMsQ0FBQztBQUM3QyxPQUFPLGtDQUFrQyxDQUFDO0FBQzFDLE9BQU8sb0JBQW9CLENBQUM7QUFDNUIsT0FBTywyQkFBMkIsQ0FBQztBQUU1QixJQUFNLGVBQWUsR0FBckIsTUFBTSxlQUFlO2FBRVgsT0FBRSxHQUFHLG1DQUFtQyxBQUF0QyxDQUF1QztJQUV6RCxZQUN5QyxvQkFBMkM7UUFBM0MseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtRQUVuRiwwQ0FBMEM7UUFDMUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDO1FBQ3ZFLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsbUJBQW1CLENBQUMsQ0FBQztRQUM5RCxJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLGtCQUFrQixDQUFDLENBQUM7UUFDN0QsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxrQ0FBa0MsQ0FBQyxDQUFDO1FBQzdFLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsZ0NBQWdDLENBQUMsQ0FBQztRQUMzRSxJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLDRCQUE0QixDQUFDLENBQUM7SUFDeEUsQ0FBQzs7QUFkVyxlQUFlO0lBS3pCLFdBQUEscUJBQXFCLENBQUE7R0FMWCxlQUFlLENBZTNCOztBQUVELDhCQUE4QixDQUFDLGVBQWUsQ0FBQyxFQUFFLEVBQUUsZUFBZSxzQ0FBOEIsQ0FBQyJ9