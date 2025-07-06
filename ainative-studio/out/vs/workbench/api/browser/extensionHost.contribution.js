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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uSG9zdC5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2Jyb3dzZXIvZXh0ZW5zaW9uSG9zdC5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUEwQyw4QkFBOEIsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3ZILE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBRWhHLCtCQUErQjtBQUMvQixPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUN6RixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUMxRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUN4RixPQUFPLEVBQUUsa0NBQWtDLEVBQUUsTUFBTSxtRUFBbUUsQ0FBQztBQUN2SCxPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSx3RUFBd0UsQ0FBQztBQUMxSCxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUU1RSw4QkFBOEI7QUFDOUIsT0FBTyw2QkFBNkIsQ0FBQztBQUNyQyxPQUFPLDBCQUEwQixDQUFDO0FBQ2xDLE9BQU8sK0JBQStCLENBQUM7QUFDdkMsT0FBTyw0QkFBNEIsQ0FBQztBQUNwQyxPQUFPLCtCQUErQixDQUFDO0FBQ3ZDLE9BQU8sbUNBQW1DLENBQUM7QUFDM0MsT0FBTywyQkFBMkIsQ0FBQztBQUNuQyxPQUFPLDJCQUEyQixDQUFDO0FBQ25DLE9BQU8sNEJBQTRCLENBQUM7QUFDcEMsT0FBTywwQkFBMEIsQ0FBQztBQUNsQyxPQUFPLHlCQUF5QixDQUFDO0FBQ2pDLE9BQU8sOEJBQThCLENBQUM7QUFDdEMsT0FBTyx3QkFBd0IsQ0FBQztBQUNoQyxPQUFPLDZCQUE2QixDQUFDO0FBQ3JDLE9BQU8sNEJBQTRCLENBQUM7QUFDcEMsT0FBTyw0QkFBNEIsQ0FBQztBQUNwQyxPQUFPLHdCQUF3QixDQUFDO0FBQ2hDLE9BQU8seUNBQXlDLENBQUM7QUFDakQsT0FBTywwQkFBMEIsQ0FBQztBQUNsQyxPQUFPLG9DQUFvQyxDQUFDO0FBQzVDLE9BQU8sdUJBQXVCLENBQUM7QUFDL0IsT0FBTyx3QkFBd0IsQ0FBQztBQUNoQyxPQUFPLDJCQUEyQixDQUFDO0FBQ25DLE9BQU8sdUJBQXVCLENBQUM7QUFDL0IsT0FBTyxpQ0FBaUMsQ0FBQztBQUN6QyxPQUFPLDJCQUEyQixDQUFDO0FBQ25DLE9BQU8sdUNBQXVDLENBQUM7QUFDL0MsT0FBTyxpQ0FBaUMsQ0FBQztBQUN6QyxPQUFPLDBCQUEwQixDQUFDO0FBQ2xDLE9BQU8sMkJBQTJCLENBQUM7QUFDbkMsT0FBTywrQkFBK0IsQ0FBQztBQUN2QyxPQUFPLCtCQUErQixDQUFDO0FBQ3ZDLE9BQU8sOEJBQThCLENBQUM7QUFDdEMsT0FBTyx5QkFBeUIsQ0FBQztBQUNqQyxPQUFPLDBCQUEwQixDQUFDO0FBQ2xDLE9BQU8sMEJBQTBCLENBQUM7QUFDbEMsT0FBTyxxQ0FBcUMsQ0FBQztBQUM3QyxPQUFPLGdDQUFnQyxDQUFDO0FBQ3hDLE9BQU8sdUJBQXVCLENBQUM7QUFDL0IsT0FBTywrQ0FBK0MsQ0FBQztBQUN2RCxPQUFPLG9CQUFvQixDQUFDO0FBQzVCLE9BQU8sdUJBQXVCLENBQUM7QUFDL0IsT0FBTywwQkFBMEIsQ0FBQztBQUNsQyxPQUFPLHdCQUF3QixDQUFDO0FBQ2hDLE9BQU8sMEJBQTBCLENBQUM7QUFDbEMsT0FBTyxnQ0FBZ0MsQ0FBQztBQUN4QyxPQUFPLHlDQUF5QyxDQUFDO0FBQ2pELE9BQU8sd0JBQXdCLENBQUM7QUFDaEMsT0FBTywwQkFBMEIsQ0FBQztBQUNsQyxPQUFPLGdDQUFnQyxDQUFDO0FBQ3hDLE9BQU8scUJBQXFCLENBQUM7QUFDN0IsT0FBTywyQkFBMkIsQ0FBQztBQUNuQyxPQUFPLHVCQUF1QixDQUFDO0FBQy9CLE9BQU8sK0JBQStCLENBQUM7QUFDdkMsT0FBTywwQkFBMEIsQ0FBQztBQUNsQyxPQUFPLHlCQUF5QixDQUFDO0FBQ2pDLE9BQU8seUJBQXlCLENBQUM7QUFDakMsT0FBTyxnQ0FBZ0MsQ0FBQztBQUN4QyxPQUFPLDRDQUE0QyxDQUFDO0FBQ3BELE9BQU8sa0NBQWtDLENBQUM7QUFDMUMsT0FBTyx3Q0FBd0MsQ0FBQztBQUNoRCxPQUFPLDRCQUE0QixDQUFDO0FBQ3BDLE9BQU8scUJBQXFCLENBQUM7QUFDN0IsT0FBTyw2QkFBNkIsQ0FBQztBQUNyQyxPQUFPLDhCQUE4QixDQUFDO0FBQ3RDLE9BQU8sK0JBQStCLENBQUM7QUFDdkMsT0FBTyx5QkFBeUIsQ0FBQztBQUNqQyxPQUFPLHdCQUF3QixDQUFDO0FBQ2hDLE9BQU8sNEJBQTRCLENBQUM7QUFDcEMsT0FBTyxzQkFBc0IsQ0FBQztBQUM5QixPQUFPLHVDQUF1QyxDQUFDO0FBQy9DLE9BQU8scUNBQXFDLENBQUM7QUFDN0MsT0FBTyxrQ0FBa0MsQ0FBQztBQUMxQyxPQUFPLG9CQUFvQixDQUFDO0FBQzVCLE9BQU8sMkJBQTJCLENBQUM7QUFFNUIsSUFBTSxlQUFlLEdBQXJCLE1BQU0sZUFBZTthQUVYLE9BQUUsR0FBRyxtQ0FBbUMsQUFBdEMsQ0FBdUM7SUFFekQsWUFDeUMsb0JBQTJDO1FBQTNDLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFFbkYsMENBQTBDO1FBQzFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsNEJBQTRCLENBQUMsQ0FBQztRQUN2RSxJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLG1CQUFtQixDQUFDLENBQUM7UUFDOUQsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1FBQzdELElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsa0NBQWtDLENBQUMsQ0FBQztRQUM3RSxJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLGdDQUFnQyxDQUFDLENBQUM7UUFDM0UsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDO0lBQ3hFLENBQUM7O0FBZFcsZUFBZTtJQUt6QixXQUFBLHFCQUFxQixDQUFBO0dBTFgsZUFBZSxDQWUzQjs7QUFFRCw4QkFBOEIsQ0FBQyxlQUFlLENBQUMsRUFBRSxFQUFFLGVBQWUsc0NBQThCLENBQUMifQ==