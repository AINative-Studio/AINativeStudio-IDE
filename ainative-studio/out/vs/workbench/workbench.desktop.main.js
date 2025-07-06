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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2JlbmNoLmRlc2t0b3AubWFpbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC93b3JrYmVuY2guZGVza3RvcC5tYWluLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLDBFQUEwRTtBQUMxRSwwRUFBMEU7QUFDMUUsMEVBQTBFO0FBQzFFLDBFQUEwRTtBQUMxRSwwRUFBMEU7QUFFMUUsOEJBQThCO0FBRTlCLE9BQU8sNEJBQTRCLENBQUM7QUFFcEMsWUFBWTtBQUdaLHNDQUFzQztBQUV0QyxPQUFPLG9DQUFvQyxDQUFDO0FBQzVDLE9BQU8sNENBQTRDLENBQUM7QUFFcEQsWUFBWTtBQUdaLDZCQUE2QjtBQUU3QixPQUFPLHlEQUF5RCxDQUFDO0FBRWpFLFlBQVk7QUFHWixnQ0FBZ0M7QUFFaEMsT0FBTywrREFBK0QsQ0FBQztBQUN2RSxPQUFPLDBEQUEwRCxDQUFDO0FBQ2xFLE9BQU8sNkRBQTZELENBQUM7QUFDckUsT0FBTyx1REFBdUQsQ0FBQztBQUMvRCxPQUFPLHFEQUFxRCxDQUFDO0FBQzdELE9BQU8sK0NBQStDLENBQUM7QUFDdkQsT0FBTywyREFBMkQsQ0FBQztBQUNuRSxPQUFPLG1EQUFtRCxDQUFDO0FBQzNELE9BQU8sdURBQXVELENBQUM7QUFDL0QsT0FBTyx1REFBdUQsQ0FBQztBQUMvRCxPQUFPLDJEQUEyRCxDQUFDO0FBQ25FLE9BQU8sK0RBQStELENBQUM7QUFDdkUsT0FBTyxtRUFBbUUsQ0FBQztBQUMzRSxPQUFPLG1GQUFtRixDQUFDO0FBQzNGLE9BQU8sbUVBQW1FLENBQUM7QUFDM0UsT0FBTyxnRUFBZ0UsQ0FBQztBQUN4RSxPQUFPLGlEQUFpRCxDQUFDO0FBQ3pELE9BQU8sb0VBQW9FLENBQUM7QUFDNUUsT0FBTywrRUFBK0UsQ0FBQztBQUN2RixP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