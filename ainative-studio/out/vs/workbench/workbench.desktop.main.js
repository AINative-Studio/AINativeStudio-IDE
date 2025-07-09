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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2JlbmNoLmRlc2t0b3AubWFpbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvd29ya2JlbmNoLmRlc2t0b3AubWFpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRywwRUFBMEU7QUFDMUUsMEVBQTBFO0FBQzFFLDBFQUEwRTtBQUMxRSwwRUFBMEU7QUFDMUUsMEVBQTBFO0FBRTFFLDhCQUE4QjtBQUU5QixPQUFPLDRCQUE0QixDQUFDO0FBRXBDLFlBQVk7QUFHWixzQ0FBc0M7QUFFdEMsT0FBTyxvQ0FBb0MsQ0FBQztBQUM1QyxPQUFPLDRDQUE0QyxDQUFDO0FBRXBELFlBQVk7QUFHWiw2QkFBNkI7QUFFN0IsT0FBTyx5REFBeUQsQ0FBQztBQUVqRSxZQUFZO0FBR1osZ0NBQWdDO0FBRWhDLE9BQU8sK0RBQStELENBQUM7QUFDdkUsT0FBTywwREFBMEQsQ0FBQztBQUNsRSxPQUFPLDZEQUE2RCxDQUFDO0FBQ3JFLE9BQU8sdURBQXVELENBQUM7QUFDL0QsT0FBTyxxREFBcUQsQ0FBQztBQUM3RCxPQUFPLCtDQUErQyxDQUFDO0FBQ3ZELE9BQU8sMkRBQTJELENBQUM7QUFDbkUsT0FBTyxtREFBbUQsQ0FBQztBQUMzRCxPQUFPLHVEQUF1RCxDQUFDO0FBQy9ELE9BQU8sdURBQXVELENBQUM7QUFDL0QsT0FBTywyREFBMkQsQ0FBQztBQUNuRSxPQUFPLCtEQUErRCxDQUFDO0FBQ3ZFLE9BQU8sbUVBQW1FLENBQUM7QUFDM0UsT0FBTyxtRkFBbUYsQ0FBQztBQUMzRixPQUFPLG1FQUFtRSxDQUFDO0FBQzNFLE9BQU8sZ0VBQWdFLENBQUM7QUFDeEUsT0FBTyxpREFBaUQsQ0FBQztBQUN6RCxPQUFPLG9FQUFvRSxDQUFDO0FBQzVFLE9BQU8sK0VBQStFLENBQUM7QUFDdkYs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