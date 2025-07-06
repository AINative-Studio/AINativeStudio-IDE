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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2JlbmNoLndlYi5tYWluLmludGVybmFsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3dvcmtiZW5jaC53ZWIubWFpbi5pbnRlcm5hbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRywwRUFBMEU7QUFDMUUsMEVBQTBFO0FBQzFFLDBFQUEwRTtBQUMxRSwwRUFBMEU7QUFDMUUsMEVBQTBFO0FBRzFFLDhCQUE4QjtBQUU5QixPQUFPLDRCQUE0QixDQUFDO0FBRXBDLFlBQVk7QUFHWiw2QkFBNkI7QUFFN0IsT0FBTyxvREFBb0QsQ0FBQztBQUU1RCxZQUFZO0FBR1osa0NBQWtDO0FBRWxDLE9BQU8sdUJBQXVCLENBQUM7QUFFL0IsWUFBWTtBQUdaLGdDQUFnQztBQUVoQyxPQUFPLGtEQUFrRCxDQUFDO0FBQzFELE9BQU8sNENBQTRDLENBQUM7QUFDcEQsT0FBTyx1REFBdUQsQ0FBQztBQUMvRCxPQUFPLHdEQUF3RCxDQUFDO0FBQ2hFLE9BQU8sbURBQW1ELENBQUM7QUFDM0QsT0FBTywyRUFBMkUsQ0FBQztBQUNuRixPQUFPLDJEQUEyRCxDQUFDO0FBQ25FLE9BQU8sdUVBQXVFLENBQUM7QUFDL0UsT0FBTywyRUFBMkUsQ0FBQztBQUNuRixPQUFPLDJFQUEyRSxDQUFDO0FBQ25GLE9BQU8sa0RBQWtELENBQUM7QUFDMUQsT0FBTyxzQ0FBc0MsQ0FBQztBQUM5QyxPQUFPLDRDQUE0QyxDQUFDO0FBQ3BELE9BQU8sb0RBQW9ELENBQUM7QUFDNUQsT0FBTywwREFBMEQsQ0FBQztBQUNsRSxPQUFPLGlEQUFpRCxDQUFDO0FBQ3pELE9BQU8sK0NBQStDLENBQUM7QUFDdkQsT0FBTyxrREFBa0QsQ0FBQztBQUMxRCxPQUFPLGtEQUFrRCxDQUFDO0FBQzFELE9BQU8sa0RBQWtELENB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