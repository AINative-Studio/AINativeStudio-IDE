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
//#region --- workbench parts
import './browser/parts/dialogs/dialog.web.contribution.js';
//#endregion
//#region --- workbench (web main)
import './browser/web.main.js';
//#endregion
//#region --- workbench services
import './services/integrity/browser/integrityService.js';
import './services/search/browser/searchService.js';
import './services/textfile/browser/browserTextFileService.js';
import './services/keybinding/browser/keyboardLayoutService.js';
import './services/extensions/browser/extensionService.js';
import './services/extensionManagement/browser/extensionsProfileScannerService.js';
import './services/extensions/browser/extensionsScannerService.js';
import './services/extensionManagement/browser/webExtensionsScannerService.js';
import './services/extensionManagement/common/extensionManagementServerService.js';
import './services/extensionManagement/browser/extensionGalleryManifestService.js';
import './services/telemetry/browser/telemetryService.js';
import './services/url/browser/urlService.js';
import './services/update/browser/updateService.js';
import './services/workspaces/browser/workspacesService.js';
import './services/workspaces/browser/workspaceEditingService.js';
import './services/dialogs/browser/fileDialogService.js';
import './services/host/browser/browserHostService.js';
import './services/lifecycle/browser/lifecycleService.js';
import './services/clipboard/browser/clipboardService.js';
import './services/localization/browser/localeService.js';
import './services/path/browser/pathService.js';
import './services/themes/browser/browserHostColorSchemeService.js';
import './services/encryption/browser/encryptionService.js';
import './services/secrets/browser/secretStorageService.js';
import './services/workingCopy/browser/workingCopyBackupService.js';
import './services/tunnel/browser/tunnelService.js';
import './services/files/browser/elevatedFileService.js';
import './services/workingCopy/browser/workingCopyHistoryService.js';
import './services/userDataSync/browser/webUserDataSyncEnablementService.js';
import './services/userDataProfile/browser/userDataProfileStorageService.js';
import './services/configurationResolver/browser/configurationResolverService.js';
import '../platform/extensionResourceLoader/browser/extensionResourceLoaderService.js';
import './services/auxiliaryWindow/browser/auxiliaryWindowService.js';
import { registerSingleton } from '../platform/instantiation/common/extensions.js';
import { IAccessibilityService } from '../platform/accessibility/common/accessibility.js';
import { IContextMenuService } from '../platform/contextview/browser/contextView.js';
import { ContextMenuService } from '../platform/contextview/browser/contextMenuService.js';
import { IExtensionTipsService } from '../platform/extensionManagement/common/extensionManagement.js';
import { ExtensionTipsService } from '../platform/extensionManagement/common/extensionTipsService.js';
import { IWorkbenchExtensionManagementService } from './services/extensionManagement/common/extensionManagement.js';
import { ExtensionManagementService } from './services/extensionManagement/common/extensionManagementService.js';
import { LogLevel } from '../platform/log/common/log.js';
import { UserDataSyncMachinesService, IUserDataSyncMachinesService } from '../platform/userDataSync/common/userDataSyncMachines.js';
import { IUserDataSyncStoreService, IUserDataSyncService, IUserDataAutoSyncService, IUserDataSyncLocalStoreService, IUserDataSyncResourceProviderService } from '../platform/userDataSync/common/userDataSync.js';
import { UserDataSyncStoreService } from '../platform/userDataSync/common/userDataSyncStoreService.js';
import { UserDataSyncLocalStoreService } from '../platform/userDataSync/common/userDataSyncLocalStoreService.js';
import { UserDataSyncService } from '../platform/userDataSync/common/userDataSyncService.js';
import { IUserDataSyncAccountService, UserDataSyncAccountService } from '../platform/userDataSync/common/userDataSyncAccount.js';
import { UserDataAutoSyncService } from '../platform/userDataSync/common/userDataAutoSyncService.js';
import { AccessibilityService } from '../platform/accessibility/browser/accessibilityService.js';
import { ICustomEndpointTelemetryService } from '../platform/telemetry/common/telemetry.js';
import { NullEndpointTelemetryService } from '../platform/telemetry/common/telemetryUtils.js';
import { ITitleService } from './services/title/browser/titleService.js';
import { BrowserTitleService } from './browser/parts/titlebar/titlebarPart.js';
import { ITimerService, TimerService } from './services/timer/browser/timerService.js';
import { IDiagnosticsService, NullDiagnosticsService } from '../platform/diagnostics/common/diagnostics.js';
import { ILanguagePackService } from '../platform/languagePacks/common/languagePacks.js';
import { WebLanguagePacksService } from '../platform/languagePacks/browser/languagePacks.js';
import { IWebContentExtractorService, NullWebContentExtractorService, ISharedWebContentExtractorService, NullSharedWebContentExtractorService } from '../platform/webContentExtractor/common/webContentExtractor.js';
import { IDefaultAccountService, NullDefaultAccountService } from './services/accounts/common/defaultAccount.js';
registerSingleton(IWorkbenchExtensionManagementService, ExtensionManagementService, 1 /* InstantiationType.Delayed */);
registerSingleton(IAccessibilityService, AccessibilityService, 1 /* InstantiationType.Delayed */);
registerSingleton(IContextMenuService, ContextMenuService, 1 /* InstantiationType.Delayed */);
registerSingleton(IUserDataSyncStoreService, UserDataSyncStoreService, 1 /* InstantiationType.Delayed */);
registerSingleton(IUserDataSyncMachinesService, UserDataSyncMachinesService, 1 /* InstantiationType.Delayed */);
registerSingleton(IUserDataSyncLocalStoreService, UserDataSyncLocalStoreService, 1 /* InstantiationType.Delayed */);
registerSingleton(IUserDataSyncAccountService, UserDataSyncAccountService, 1 /* InstantiationType.Delayed */);
registerSingleton(IUserDataSyncService, UserDataSyncService, 1 /* InstantiationType.Delayed */);
registerSingleton(IUserDataSyncResourceProviderService, UserDataSyncResourceProviderService, 1 /* InstantiationType.Delayed */);
registerSingleton(IUserDataAutoSyncService, UserDataAutoSyncService, 0 /* InstantiationType.Eager */);
registerSingleton(ITitleService, BrowserTitleService, 0 /* InstantiationType.Eager */);
registerSingleton(IExtensionTipsService, ExtensionTipsService, 1 /* InstantiationType.Delayed */);
registerSingleton(ITimerService, TimerService, 1 /* InstantiationType.Delayed */);
registerSingleton(ICustomEndpointTelemetryService, NullEndpointTelemetryService, 1 /* InstantiationType.Delayed */);
registerSingleton(IDiagnosticsService, NullDiagnosticsService, 1 /* InstantiationType.Delayed */);
registerSingleton(ILanguagePackService, WebLanguagePacksService, 1 /* InstantiationType.Delayed */);
registerSingleton(IWebContentExtractorService, NullWebContentExtractorService, 1 /* InstantiationType.Delayed */);
registerSingleton(ISharedWebContentExtractorService, NullSharedWebContentExtractorService, 1 /* InstantiationType.Delayed */);
registerSingleton(IDefaultAccountService, NullDefaultAccountService, 1 /* InstantiationType.Delayed */);
//#endregion
//#region --- workbench contributions
// Logs
import './contrib/logs/browser/logs.contribution.js';
// Localization
import './contrib/localization/browser/localization.contribution.js';
// Performance
import './contrib/performance/browser/performance.web.contribution.js';
// Preferences
import './contrib/preferences/browser/keyboardLayoutPicker.js';
// Debug
import './contrib/debug/browser/extensionHostDebugService.js';
// Welcome Banner
import './contrib/welcomeBanner/browser/welcomeBanner.contribution.js';
// Welcome Dialog
import './contrib/welcomeDialog/browser/welcomeDialog.contribution.js';
// Webview
import './contrib/webview/browser/webview.web.contribution.js';
// Extensions Management
import './contrib/extensions/browser/extensions.web.contribution.js';
// Terminal
import './contrib/terminal/browser/terminal.web.contribution.js';
import './contrib/externalTerminal/browser/externalTerminal.contribution.js';
import './contrib/terminal/browser/terminalInstanceService.js';
// Tasks
import './contrib/tasks/browser/taskService.js';
// Tags
import './contrib/tags/browser/workspaceTagsService.js';
// Issues
import './contrib/issue/browser/issue.contribution.js';
// Splash
import './contrib/splash/browser/splash.contribution.js';
// Remote Start Entry for the Web
import './contrib/remote/browser/remoteStartEntry.contribution.js';
//#endregion
//#region --- export workbench factory
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
//
// Do NOT change these exports in a way that something is removed unless
// intentional. These exports are used by web embedders and thus require
// an adoption when something changes.
//
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
import { create, commands, env, window, workspace, logger } from './browser/web.factory.js';
import { Menu } from './browser/web.api.js';
import { URI } from '../base/common/uri.js';
import { Event, Emitter } from '../base/common/event.js';
import { Disposable } from '../base/common/lifecycle.js';
import { GroupOrientation } from './services/editor/common/editorGroupsService.js';
import { UserDataSyncResourceProviderService } from '../platform/userDataSync/common/userDataSyncResourceProvider.js';
import { RemoteAuthorityResolverError, RemoteAuthorityResolverErrorCode } from '../platform/remote/common/remoteAuthorityResolver.js';
// TODO@esm remove me once we stop supporting our web-esm-bridge
if (globalThis.__VSCODE_WEB_ESM_PROMISE) {
    const exports = {
        // Factory
        create: create,
        // Basic Types
        URI: URI,
        Event: Event,
        Emitter: Emitter,
        Disposable: Disposable,
        // GroupOrientation,
        LogLevel: LogLevel,
        RemoteAuthorityResolverError: RemoteAuthorityResolverError,
        RemoteAuthorityResolverErrorCode: RemoteAuthorityResolverErrorCode,
        // Facade API
        env: env,
        window: window,
        workspace: workspace,
        commands: commands,
        logger: logger,
        Menu: Menu
    };
    globalThis.__VSCODE_WEB_ESM_PROMISE(exports);
    delete globalThis.__VSCODE_WEB_ESM_PROMISE;
}
export { 
// Factory
create, 
// Basic Types
URI, Event, Emitter, Disposable, GroupOrientation, LogLevel, RemoteAuthorityResolverError, RemoteAuthorityResolverErrorCode, 
// Facade API
env, window, workspace, commands, logger, Menu };
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2JlbmNoLndlYi5tYWluLmludGVybmFsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC93b3JrYmVuY2gud2ViLm1haW4uaW50ZXJuYWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsMEVBQTBFO0FBQzFFLDBFQUEwRTtBQUMxRSwwRUFBMEU7QUFDMUUsMEVBQTBFO0FBQzFFLDBFQUEwRTtBQUcxRSw4QkFBOEI7QUFFOUIsT0FBTyw0QkFBNEIsQ0FBQztBQUVwQyxZQUFZO0FBR1osNkJBQTZCO0FBRTdCLE9BQU8sb0RBQW9ELENBQUM7QUFFNUQsWUFBWTtBQUdaLGtDQUFrQztBQUVsQyxPQUFPLHVCQUF1QixDQUFDO0FBRS9CLFlBQVk7QUFHWixnQ0FBZ0M7QUFFaEMsT0FBTyxrREFBa0QsQ0FBQztBQUMxRCxPQUFPLDRDQUE0QyxDQUFDO0FBQ3BELE9BQU8sdURBQXVELENBQUM7QUFDL0QsT0FBTyx3REFBd0QsQ0FBQztBQUNoRSxPQUFPLG1EQUFtRCxDQUFDO0FBQzNELE9BQU8sMkVBQTJFLENBQUM7QUFDbkYsT0FBTywyREFBMkQsQ0FBQztBQUNuRSxPQUFPLHVFQUF1RSxDQUFDO0FBQy9FLE9BQU8sMkVBQTJFLENBQUM7QUFDbkYsT0FBTywyRUFBMkUsQ0FBQztBQUNuRixPQUFPLGtEQUFrRCxDQUFDO0FBQzFELE9BQU8sc0NBQXNDLENBQUM7QUFDOUMsT0FBTyw0Q0FBNEMsQ0FBQztBQUNwRCxPQUFPLG9EQUFvRCxDQUFDO0FBQzVELE9BQU8sMERBQTBELENBQUM7QUFDbEUsT0FBTyxpREFBaUQsQ0FBQztBQUN6RCxPQUFPLCtDQUErQyxDQUFDO0FBQ3ZELE9BQU8sa0RBQWtELENBQUM7QUFDMUQsT0FBTyxrREFBa0QsQ0FBQztBQUMxRCxPQUFPLGtEQUFrRCxD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