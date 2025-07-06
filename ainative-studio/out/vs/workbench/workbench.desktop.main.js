/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
// #######################################################################
// ###                                                                 ###
// ### !!! PLEASE ADD COMMON IMPORTS INTO WORKBENCH.COMMON.MAIN.TS !!! ###
// ###                                                                 ###
// #######################################################################
//#region --- workbench common
import './workbench.common.main.js';
//#endregion
//#region --- workbench (desktop main)
import './electron-sandbox/desktop.main.js';
import './electron-sandbox/desktop.contribution.js';
//#endregion
//#region --- workbench parts
import './electron-sandbox/parts/dialogs/dialog.contribution.js';
//#endregion
//#region --- workbench services
import './services/textfile/electron-sandbox/nativeTextFileService.js';
import './services/dialogs/electron-sandbox/fileDialogService.js';
import './services/workspaces/electron-sandbox/workspacesService.js';
import './services/menubar/electron-sandbox/menubarService.js';
import './services/update/electron-sandbox/updateService.js';
import './services/url/electron-sandbox/urlService.js';
import './services/lifecycle/electron-sandbox/lifecycleService.js';
import './services/title/electron-sandbox/titleService.js';
import './services/host/electron-sandbox/nativeHostService.js';
import './services/request/electron-sandbox/requestService.js';
import './services/clipboard/electron-sandbox/clipboardService.js';
import './services/contextmenu/electron-sandbox/contextmenuService.js';
import './services/workspaces/electron-sandbox/workspaceEditingService.js';
import './services/configurationResolver/electron-sandbox/configurationResolverService.js';
import './services/accessibility/electron-sandbox/accessibilityService.js';
import './services/keybinding/electron-sandbox/nativeKeyboardLayout.js';
import './services/path/electron-sandbox/pathService.js';
import './services/themes/electron-sandbox/nativeHostColorSchemeService.js';
import './services/extensionManagement/electron-sandbox/extensionManagementService.js';
import './services/encryption/electron-sandbox/encryptionService.js';
import './services/secrets/electron-sandbox/secretStorageService.js';
import './services/localization/electron-sandbox/languagePackService.js';
import './services/telemetry/electron-sandbox/telemetryService.js';
import './services/extensions/electron-sandbox/extensionHostStarter.js';
import '../platform/extensionResourceLoader/common/extensionResourceLoaderService.js';
import './services/localization/electron-sandbox/localeService.js';
import './services/extensions/electron-sandbox/extensionsScannerService.js';
import './services/extensionManagement/electron-sandbox/extensionManagementServerService.js';
import './services/extensionManagement/electron-sandbox/extensionGalleryManifestService.js';
import './services/extensionManagement/electron-sandbox/extensionTipsService.js';
import './services/userDataSync/electron-sandbox/userDataSyncService.js';
import './services/userDataSync/electron-sandbox/userDataAutoSyncService.js';
import './services/timer/electron-sandbox/timerService.js';
import './services/environment/electron-sandbox/shellEnvironmentService.js';
import './services/integrity/electron-sandbox/integrityService.js';
import './services/workingCopy/electron-sandbox/workingCopyBackupService.js';
import './services/checksum/electron-sandbox/checksumService.js';
import '../platform/remote/electron-sandbox/sharedProcessTunnelService.js';
import './services/tunnel/electron-sandbox/tunnelService.js';
import '../platform/diagnostics/electron-sandbox/diagnosticsService.js';
import '../platform/profiling/electron-sandbox/profilingService.js';
import '../platform/telemetry/electron-sandbox/customEndpointTelemetryService.js';
import '../platform/remoteTunnel/electron-sandbox/remoteTunnelService.js';
import './services/files/electron-sandbox/elevatedFileService.js';
import './services/search/electron-sandbox/searchService.js';
import './services/workingCopy/electron-sandbox/workingCopyHistoryService.js';
import './services/userDataSync/browser/userDataSyncEnablementService.js';
import './services/extensions/electron-sandbox/nativeExtensionService.js';
import '../platform/userDataProfile/electron-sandbox/userDataProfileStorageService.js';
import './services/auxiliaryWindow/electron-sandbox/auxiliaryWindowService.js';
import '../platform/extensionManagement/electron-sandbox/extensionsProfileScannerService.js';
import '../platform/webContentExtractor/electron-sandbox/webContentExtractorService.js';
import { registerSingleton } from '../platform/instantiation/common/extensions.js';
import { IUserDataInitializationService, UserDataInitializationService } from './services/userData/browser/userDataInit.js';
import { SyncDescriptor } from '../platform/instantiation/common/descriptors.js';
registerSingleton(IUserDataInitializationService, new SyncDescriptor(UserDataInitializationService, [[]], true));
//#endregion
//#region --- workbench contributions
// Logs
import './contrib/logs/electron-sandbox/logs.contribution.js';
// Localizations
import './contrib/localization/electron-sandbox/localization.contribution.js';
// Explorer
import './contrib/files/electron-sandbox/fileActions.contribution.js';
// CodeEditor Contributions
import './contrib/codeEditor/electron-sandbox/codeEditor.contribution.js';
// Debug
import './contrib/debug/electron-sandbox/extensionHostDebugService.js';
// Extensions Management
import './contrib/extensions/electron-sandbox/extensions.contribution.js';
// Issues
import './contrib/issue/electron-sandbox/issue.contribution.js';
// Process
import './contrib/issue/electron-sandbox/process.contribution.js';
// Remote
import './contrib/remote/electron-sandbox/remote.contribution.js';
// Terminal
import './contrib/terminal/electron-sandbox/terminal.contribution.js';
// Themes
import './contrib/themes/browser/themes.test.contribution.js';
import './services/themes/electron-sandbox/themes.contribution.js';
// User Data Sync
import './contrib/userDataSync/electron-sandbox/userDataSync.contribution.js';
// Tags
import './contrib/tags/electron-sandbox/workspaceTagsService.js';
import './contrib/tags/electron-sandbox/tags.contribution.js';
// Performance
import './contrib/performance/electron-sandbox/performance.contribution.js';
// Tasks
import './contrib/tasks/electron-sandbox/taskService.js';
// External terminal
import './contrib/externalTerminal/electron-sandbox/externalTerminal.contribution.js';
// Webview
import './contrib/webview/electron-sandbox/webview.contribution.js';
// Splash
import './contrib/splash/electron-sandbox/splash.contribution.js';
// Local History
import './contrib/localHistory/electron-sandbox/localHistory.contribution.js';
// Merge Editor
import './contrib/mergeEditor/electron-sandbox/mergeEditor.contribution.js';
// Multi Diff Editor
import './contrib/multiDiffEditor/browser/multiDiffEditor.contribution.js';
// Remote Tunnel
import './contrib/remoteTunnel/electron-sandbox/remoteTunnel.contribution.js';
// Chat
import './contrib/chat/electron-sandbox/chat.contribution.js';
import './contrib/inlineChat/electron-sandbox/inlineChat.contribution.js';
// Encryption
import './contrib/encryption/electron-sandbox/encryption.contribution.js';
// Emergency Alert
import './contrib/emergencyAlert/electron-sandbox/emergencyAlert.contribution.js';
// MCP
import './contrib/mcp/electron-sandbox/mcp.contribution.js';
//#endregion
export { main } from './electron-sandbox/desktop.main.js';
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2JlbmNoLmRlc2t0b3AubWFpbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci90ZXN0L0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3dvcmtiZW5jaC5kZXNrdG9wLm1haW4udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsMEVBQTBFO0FBQzFFLDBFQUEwRTtBQUMxRSwwRUFBMEU7QUFDMUUsMEVBQTBFO0FBQzFFLDBFQUEwRTtBQUUxRSw4QkFBOEI7QUFFOUIsT0FBTyw0QkFBNEIsQ0FBQztBQUVwQyxZQUFZO0FBR1osc0NBQXNDO0FBRXRDLE9BQU8sb0NBQW9DLENBQUM7QUFDNUMsT0FBTyw0Q0FBNEMsQ0FBQztBQUVwRCxZQUFZO0FBR1osNkJBQTZCO0FBRTdCLE9BQU8seURBQXlELENBQUM7QUFFakUsWUFBWTtBQUdaLGdDQUFnQztBQUVoQyxPQUFPLCtEQUErRCxDQUFDO0FBQ3ZFLE9BQU8sMERBQTBELENBQUM7QUFDbEUsT0FBTyw2REFBNkQsQ0FBQztBQUNyRSxPQUFPLHVEQUF1RCxDQUFDO0FBQy9ELE9BQU8scURBQXFELENBQUM7QUFDN0QsT0FBTywrQ0FBK0MsQ0FBQztBQUN2RCxPQUFPLDJEQUEyRCxDQUFDO0FBQ25FLE9BQU8sbURBQW1ELENBQUM7QUFDM0QsT0FBTyx1REFBdUQsQ0FBQztBQUMvRCxPQUFPLHVEQUF1RCxDQUFDO0FBQy9ELE9BQU8sMkRBQTJELENBQUM7QUFDbkUsT0FBTywrREFBK0QsQ0FBQztBQUN2RSxPQUFPLG1FQUFtRSxDQUFDO0FBQzNFLE9BQU8sbUZBQW1GLENBQUM7QUFDM0YsT0FBTyxtRUFBbUUsQ0FBQztBQUMzRSxPQUFPLGdFQUFnRSxDQUFDO0FBQ3hFLE9BQU8saURBQWlELENBQUM7QUFDekQsT0FBTyxvRUFBb0UsQ0FBQztBQUM1RSxPQUFPLCtFQUErRSxDQUFDO0FBQ3ZGLE9BQU8sNkRBQTZELENBQUM7QUFDckUsT0FBTyw2REFBNkQsQ0FBQztBQUNyRSxPQUFPLGlFQUFpRSxDQUFDO0FBQ3pFLE9BQU8sMkRBQTJELENBQUM7QUFDbkUsT0FBTyxnRUFBZ0UsQ0FBQztBQUN4RSxPQUFPLDhFQUE4RSxDQUFDO0FBQ3RGLE9BQU8sMkRBQTJELENBQUM7QUFDbkUsT0FBTyxvRUFBb0UsQ0FBQztBQUM1RSxPQUFPLHFGQUFxRixDQUFDO0FBQzdGLE9BQU8sb0ZBQW9GLENBQUM7QUFDNUYsT0FBTyx5RUFBeUUsQ0FBQztBQUNqRixPQUFPLGlFQUFpRSxDQUFDO0FBQ3pFLE9BQU8scUVBQXFFLENBQUM7QUFDN0UsT0FBTyxtREFBbUQsQ0FBQztBQUMzRCxPQUFPLG9FQUFvRSxDQUFDO0FBQzVFLE9BQU8sMkRBQTJELENBQUM7QUFDbkUsT0FBTyxxRUFBcUUsQ0FBQztBQUM3RSxPQUFPLHlEQUF5RCxDQUFDO0FBQ2pFLE9BQU8sbUVBQW1FLENBQUM7QUFDM0UsT0FBTyxxREFBcUQsQ0FBQztBQUM3RCxPQUFPLGdFQUFnRSxDQUFDO0FBQ3hFLE9BQU8sNERBQTRELENBQUM7QUFDcEUsT0FBTywwRUFBMEUsQ0FBQztBQUNsRixPQUFPLGtFQUFrRSxDQUFDO0FBQzFFLE9BQU8sMERBQTBELENBQUM7QUFDbEUsT0FBTyxxREFBcUQsQ0FBQztBQUM3RCxPQUFPLHNFQUFzRSxDQUFDO0FBQzlFLE9BQU8sa0VBQWtFLENBQUM7QUFDMUUsT0FBTyxrRUFBa0UsQ0FBQztBQUMxRSxPQUFPLCtFQUErRSxDQUFDO0FBQ3ZGLE9BQU8sdUVBQXVFLENBQUM7QUFDL0UsT0FBTyxxRkFBcUYsQ0FBQztBQUM3RixPQUFPLGdGQUFnRixDQUFDO0FBRXhGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ25GLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSw2QkFBNkIsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQzVILE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUVqRixpQkFBaUIsQ0FBQyw4QkFBOEIsRUFBRSxJQUFJLGNBQWMsQ0FBQyw2QkFBNkIsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7QUFHakgsWUFBWTtBQUdaLHFDQUFxQztBQUVyQyxPQUFPO0FBQ1AsT0FBTyxzREFBc0QsQ0FBQztBQUU5RCxnQkFBZ0I7QUFDaEIsT0FBTyxzRUFBc0UsQ0FBQztBQUU5RSxXQUFXO0FBQ1gsT0FBTyw4REFBOEQsQ0FBQztBQUV0RSwyQkFBMkI7QUFDM0IsT0FBTyxrRUFBa0UsQ0FBQztBQUUxRSxRQUFRO0FBQ1IsT0FBTywrREFBK0QsQ0FBQztBQUV2RSx3QkFBd0I7QUFDeEIsT0FBTyxrRUFBa0UsQ0FBQztBQUUxRSxTQUFTO0FBQ1QsT0FBTyx3REFBd0QsQ0FBQztBQUVoRSxVQUFVO0FBQ1YsT0FBTywwREFBMEQsQ0FBQztBQUVsRSxTQUFTO0FBQ1QsT0FBTywwREFBMEQsQ0FBQztBQUVsRSxXQUFXO0FBQ1gsT0FBTyw4REFBOEQsQ0FBQztBQUV0RSxTQUFTO0FBQ1QsT0FBTyxzREFBc0QsQ0FBQztBQUM5RCxPQUFPLDJEQUEyRCxDQUFDO0FBQ25FLGlCQUFpQjtBQUNqQixPQUFPLHNFQUFzRSxDQUFDO0FBRTlFLE9BQU87QUFDUCxPQUFPLHlEQUF5RCxDQUFDO0FBQ2pFLE9BQU8sc0RBQXNELENBQUM7QUFDOUQsY0FBYztBQUNkLE9BQU8sb0VBQW9FLENBQUM7QUFFNUUsUUFBUTtBQUNSLE9BQU8saURBQWlELENBQUM7QUFFekQsb0JBQW9CO0FBQ3BCLE9BQU8sOEVBQThFLENBQUM7QUFFdEYsVUFBVTtBQUNWLE9BQU8sNERBQTRELENBQUM7QUFFcEUsU0FBUztBQUNULE9BQU8sMERBQTBELENBQUM7QUFFbEUsZ0JBQWdCO0FBQ2hCLE9BQU8sc0VBQXNFLENBQUM7QUFFOUUsZUFBZTtBQUNmLE9BQU8sb0VBQW9FLENBQUM7QUFFNUUsb0JBQW9CO0FBQ3BCLE9BQU8sbUVBQW1FLENBQUM7QUFFM0UsZ0JBQWdCO0FBQ2hCLE9BQU8sc0VBQXNFLENBQUM7QUFFOUUsT0FBTztBQUNQLE9BQU8sc0RBQXNELENBQUM7QUFDOUQsT0FBTyxrRUFBa0UsQ0FBQztBQUMxRSxhQUFhO0FBQ2IsT0FBTyxrRUFBa0UsQ0FBQztBQUUxRSxrQkFBa0I7QUFDbEIsT0FBTywwRUFBMEUsQ0FBQztBQUVsRixNQUFNO0FBQ04sT0FBTyxvREFBb0QsQ0FBQztBQUU1RCxZQUFZO0FBR1osT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLG9DQUFvQyxDQUFDIn0=