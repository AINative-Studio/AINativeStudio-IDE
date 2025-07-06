/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
//#region --- editor/workbench core
import '../editor/editor.all.js';
import './api/browser/extensionHost.contribution.js';
import './browser/workbench.contribution.js';
//#endregion
//#region --- Void
import './contrib/void/browser/void.contribution.js'; // Void added this
//#endregion
//#region --- workbench actions
import './browser/actions/textInputActions.js';
import './browser/actions/developerActions.js';
import './browser/actions/helpActions.js';
import './browser/actions/layoutActions.js';
import './browser/actions/listCommands.js';
import './browser/actions/navigationActions.js';
import './browser/actions/windowActions.js';
import './browser/actions/workspaceActions.js';
import './browser/actions/workspaceCommands.js';
import './browser/actions/quickAccessActions.js';
import './browser/actions/widgetNavigationCommands.js';
//#endregion
//#region --- API Extension Points
import './services/actions/common/menusExtensionPoint.js';
import './api/common/configurationExtensionPoint.js';
import './api/browser/viewsExtensionPoint.js';
//#endregion
//#region --- workbench parts
import './browser/parts/editor/editor.contribution.js';
import './browser/parts/editor/editorParts.js';
import './browser/parts/paneCompositePartService.js';
import './browser/parts/banner/bannerPart.js';
import './browser/parts/statusbar/statusbarPart.js';
//#endregion
//#region --- workbench services
import '../platform/actions/common/actions.contribution.js';
import '../platform/undoRedo/common/undoRedoService.js';
import './services/workspaces/common/editSessionIdentityService.js';
import './services/workspaces/common/canonicalUriService.js';
import './services/extensions/browser/extensionUrlHandler.js';
import './services/keybinding/common/keybindingEditing.js';
import './services/decorations/browser/decorationsService.js';
import './services/dialogs/common/dialogService.js';
import './services/progress/browser/progressService.js';
import './services/editor/browser/codeEditorService.js';
import './services/preferences/browser/preferencesService.js';
import './services/configuration/common/jsonEditingService.js';
import './services/textmodelResolver/common/textModelResolverService.js';
import './services/editor/browser/editorService.js';
import './services/editor/browser/editorResolverService.js';
import './services/aiEmbeddingVector/common/aiEmbeddingVectorService.js';
import './services/aiRelatedInformation/common/aiRelatedInformationService.js';
import './services/history/browser/historyService.js';
import './services/activity/browser/activityService.js';
import './services/keybinding/browser/keybindingService.js';
import './services/untitled/common/untitledTextEditorService.js';
import './services/textresourceProperties/common/textResourcePropertiesService.js';
import './services/textfile/common/textEditorService.js';
import './services/language/common/languageService.js';
import './services/model/common/modelService.js';
import './services/notebook/common/notebookDocumentService.js';
import './services/commands/common/commandService.js';
import './services/themes/browser/workbenchThemeService.js';
import './services/label/common/labelService.js';
import './services/extensions/common/extensionManifestPropertiesService.js';
import './services/extensionManagement/common/extensionGalleryService.js';
import './services/extensionManagement/browser/extensionEnablementService.js';
import './services/extensionManagement/browser/builtinExtensionsScannerService.js';
import './services/extensionRecommendations/common/extensionIgnoredRecommendationsService.js';
import './services/extensionRecommendations/common/workspaceExtensionsConfig.js';
import './services/extensionManagement/common/extensionFeaturesManagemetService.js';
import './services/notification/common/notificationService.js';
import './services/userDataSync/common/userDataSyncUtil.js';
import './services/userDataProfile/browser/userDataProfileImportExportService.js';
import './services/userDataProfile/browser/userDataProfileManagement.js';
import './services/userDataProfile/common/remoteUserDataProfiles.js';
import './services/remote/common/remoteExplorerService.js';
import './services/remote/common/remoteExtensionsScanner.js';
import './services/terminal/common/embedderTerminalService.js';
import './services/workingCopy/common/workingCopyService.js';
import './services/workingCopy/common/workingCopyFileService.js';
import './services/workingCopy/common/workingCopyEditorService.js';
import './services/filesConfiguration/common/filesConfigurationService.js';
import './services/views/browser/viewDescriptorService.js';
import './services/views/browser/viewsService.js';
import './services/quickinput/browser/quickInputService.js';
import './services/userDataSync/browser/userDataSyncWorkbenchService.js';
import './services/authentication/browser/authenticationService.js';
import './services/authentication/browser/authenticationExtensionsService.js';
import './services/authentication/browser/authenticationUsageService.js';
import './services/authentication/browser/authenticationAccessService.js';
import './services/accounts/common/defaultAccount.js';
import '../editor/browser/services/hoverService/hoverService.js';
import './services/assignment/common/assignmentService.js';
import './services/outline/browser/outlineService.js';
import './services/languageDetection/browser/languageDetectionWorkerServiceImpl.js';
import '../editor/common/services/languageFeaturesService.js';
import '../editor/common/services/semanticTokensStylingService.js';
import '../editor/common/services/treeViewsDndService.js';
import './services/textMate/browser/textMateTokenizationFeature.contribution.js';
import './services/treeSitter/browser/treeSitterTokenizationFeature.contribution.js';
import './services/userActivity/common/userActivityService.js';
import './services/userActivity/browser/userActivityBrowser.js';
import './services/editor/browser/editorPaneService.js';
import './services/editor/common/customEditorLabelService.js';
import { registerSingleton } from '../platform/instantiation/common/extensions.js';
import { GlobalExtensionEnablementService } from '../platform/extensionManagement/common/extensionEnablementService.js';
import { IAllowedExtensionsService, IGlobalExtensionEnablementService } from '../platform/extensionManagement/common/extensionManagement.js';
import { ContextViewService } from '../platform/contextview/browser/contextViewService.js';
import { IContextViewService } from '../platform/contextview/browser/contextView.js';
import { IListService, ListService } from '../platform/list/browser/listService.js';
import { IEditorWorkerService } from '../editor/common/services/editorWorker.js';
import { WorkbenchEditorWorkerService } from './contrib/codeEditor/browser/workbenchEditorWorkerService.js';
import { MarkerDecorationsService } from '../editor/common/services/markerDecorationsService.js';
import { IMarkerDecorationsService } from '../editor/common/services/markerDecorations.js';
import { IMarkerService } from '../platform/markers/common/markers.js';
import { MarkerService } from '../platform/markers/common/markerService.js';
import { ContextKeyService } from '../platform/contextkey/browser/contextKeyService.js';
import { IContextKeyService } from '../platform/contextkey/common/contextkey.js';
import { ITextResourceConfigurationService } from '../editor/common/services/textResourceConfiguration.js';
import { TextResourceConfigurationService } from '../editor/common/services/textResourceConfigurationService.js';
import { IDownloadService } from '../platform/download/common/download.js';
import { DownloadService } from '../platform/download/common/downloadService.js';
import { OpenerService } from '../editor/browser/services/openerService.js';
import { IOpenerService } from '../platform/opener/common/opener.js';
import { IgnoredExtensionsManagementService, IIgnoredExtensionsManagementService } from '../platform/userDataSync/common/ignoredExtensions.js';
import { ExtensionStorageService, IExtensionStorageService } from '../platform/extensionManagement/common/extensionStorage.js';
import { IUserDataSyncLogService } from '../platform/userDataSync/common/userDataSync.js';
import { UserDataSyncLogService } from '../platform/userDataSync/common/userDataSyncLog.js';
registerSingleton(IUserDataSyncLogService, UserDataSyncLogService, 1 /* InstantiationType.Delayed */);
registerSingleton(IAllowedExtensionsService, AllowedExtensionsService, 1 /* InstantiationType.Delayed */);
registerSingleton(IIgnoredExtensionsManagementService, IgnoredExtensionsManagementService, 1 /* InstantiationType.Delayed */);
registerSingleton(IGlobalExtensionEnablementService, GlobalExtensionEnablementService, 1 /* InstantiationType.Delayed */);
registerSingleton(IExtensionStorageService, ExtensionStorageService, 1 /* InstantiationType.Delayed */);
registerSingleton(IContextViewService, ContextViewService, 1 /* InstantiationType.Delayed */);
registerSingleton(IListService, ListService, 1 /* InstantiationType.Delayed */);
registerSingleton(IEditorWorkerService, WorkbenchEditorWorkerService, 0 /* InstantiationType.Eager */);
registerSingleton(IMarkerDecorationsService, MarkerDecorationsService, 1 /* InstantiationType.Delayed */);
registerSingleton(IMarkerService, MarkerService, 1 /* InstantiationType.Delayed */);
registerSingleton(IContextKeyService, ContextKeyService, 1 /* InstantiationType.Delayed */);
registerSingleton(ITextResourceConfigurationService, TextResourceConfigurationService, 1 /* InstantiationType.Delayed */);
registerSingleton(IDownloadService, DownloadService, 1 /* InstantiationType.Delayed */);
registerSingleton(IOpenerService, OpenerService, 1 /* InstantiationType.Delayed */);
//#endregion
//#region --- workbench contributions
// Telemetry
import './contrib/telemetry/browser/telemetry.contribution.js';
// Preferences
import './contrib/preferences/browser/preferences.contribution.js';
import './contrib/preferences/browser/keybindingsEditorContribution.js';
import './contrib/preferences/browser/preferencesSearch.js';
// Performance
import './contrib/performance/browser/performance.contribution.js';
// Context Menus
import './contrib/contextmenu/browser/contextmenu.contribution.js';
// Notebook
import './contrib/notebook/browser/notebook.contribution.js';
// Speech
import './contrib/speech/browser/speech.contribution.js';
// Chat
// Void - this is still registered to avoid console errors, we just commented it out in chatParticipant.contribution.ts
import './contrib/chat/browser/chat.contribution.js';
import './contrib/inlineChat/browser/inlineChat.contribution.js';
import './contrib/mcp/browser/mcp.contribution.js';
// Interactive
import './contrib/interactive/browser/interactive.contribution.js';
// repl
import './contrib/replNotebook/browser/repl.contribution.js';
// Testing
import './contrib/testing/browser/testing.contribution.js';
// Logs
import './contrib/logs/common/logs.contribution.js';
// Quickaccess
import './contrib/quickaccess/browser/quickAccess.contribution.js';
// Explorer
import './contrib/files/browser/explorerViewlet.js';
import './contrib/files/browser/fileActions.contribution.js';
import './contrib/files/browser/files.contribution.js';
// Bulk Edit
import './contrib/bulkEdit/browser/bulkEditService.js';
import './contrib/bulkEdit/browser/preview/bulkEdit.contribution.js';
// Search
import './contrib/search/browser/search.contribution.js';
import './contrib/search/browser/searchView.js';
// Search Editor
import './contrib/searchEditor/browser/searchEditor.contribution.js';
// Sash
import './contrib/sash/browser/sash.contribution.js';
// SCM
import './contrib/scm/browser/scm.contribution.js';
// Debug
import './contrib/debug/browser/debug.contribution.js';
import './contrib/debug/browser/debugEditorContribution.js';
import './contrib/debug/browser/breakpointEditorContribution.js';
import './contrib/debug/browser/callStackEditorContribution.js';
import './contrib/debug/browser/repl.js';
import './contrib/debug/browser/debugViewlet.js';
// Markers
import './contrib/markers/browser/markers.contribution.js';
// Merge Editor
import './contrib/mergeEditor/browser/mergeEditor.contribution.js';
// Multi Diff Editor
import './contrib/multiDiffEditor/browser/multiDiffEditor.contribution.js';
// Commands
import './contrib/commands/common/commands.contribution.js';
// Comments
import './contrib/comments/browser/comments.contribution.js';
// URL Support
import './contrib/url/browser/url.contribution.js';
// Webview
import './contrib/webview/browser/webview.contribution.js';
import './contrib/webviewPanel/browser/webviewPanel.contribution.js';
import './contrib/webviewView/browser/webviewView.contribution.js';
import './contrib/customEditor/browser/customEditor.contribution.js';
// External Uri Opener
import './contrib/externalUriOpener/common/externalUriOpener.contribution.js';
// Extensions Management
import './contrib/extensions/browser/extensions.contribution.js';
import './contrib/extensions/browser/extensionsViewlet.js';
// Output View
import './contrib/output/browser/output.contribution.js';
import './contrib/output/browser/outputView.js';
// Terminal
import './contrib/terminal/terminal.all.js';
// External terminal
import './contrib/externalTerminal/browser/externalTerminal.contribution.js';
// Relauncher
import './contrib/relauncher/browser/relauncher.contribution.js';
// Tasks
import './contrib/tasks/browser/task.contribution.js';
// Remote
import './contrib/remote/common/remote.contribution.js';
import './contrib/remote/browser/remote.contribution.js';
// Emmet
import './contrib/emmet/browser/emmet.contribution.js';
// CodeEditor Contributions
import './contrib/codeEditor/browser/codeEditor.contribution.js';
// Keybindings Contributions
import './contrib/keybindings/browser/keybindings.contribution.js';
// Snippets
import './contrib/snippets/browser/snippets.contribution.js';
// Formatter Help
import './contrib/format/browser/format.contribution.js';
// Folding
import './contrib/folding/browser/folding.contribution.js';
// Limit Indicator
import './contrib/limitIndicator/browser/limitIndicator.contribution.js';
// Inlay Hint Accessibility
import './contrib/inlayHints/browser/inlayHintsAccessibilty.js';
// Themes
import './contrib/themes/browser/themes.contribution.js';
// Update
import './contrib/update/browser/update.contribution.js';
// Surveys
import './contrib/surveys/browser/nps.contribution.js';
import './contrib/surveys/browser/languageSurveys.contribution.js';
// Welcome
// Void commented this out
// import './contrib/welcomeGettingStarted/browser/gettingStarted.contribution.js';
import './contrib/welcomeWalkthrough/browser/walkThrough.contribution.js';
import './contrib/welcomeViews/common/viewsWelcome.contribution.js';
import './contrib/welcomeViews/common/newFile.contribution.js';
// Call Hierarchy
import './contrib/callHierarchy/browser/callHierarchy.contribution.js';
// Type Hierarchy
import './contrib/typeHierarchy/browser/typeHierarchy.contribution.js';
// Outline
import './contrib/codeEditor/browser/outline/documentSymbolsOutline.js';
import './contrib/outline/browser/outline.contribution.js';
// Language Detection
import './contrib/languageDetection/browser/languageDetection.contribution.js';
// Language Status
import './contrib/languageStatus/browser/languageStatus.contribution.js';
// Authentication
import './contrib/authentication/browser/authentication.contribution.js';
// User Data Sync
import './contrib/userDataSync/browser/userDataSync.contribution.js';
// User Data Profiles
import './contrib/userDataProfile/browser/userDataProfile.contribution.js';
// Continue Edit Session
import './contrib/editSessions/browser/editSessions.contribution.js';
// Code Actions
import './contrib/codeActions/browser/codeActions.contribution.js';
// Timeline
import './contrib/timeline/browser/timeline.contribution.js';
// Local History
import './contrib/localHistory/browser/localHistory.contribution.js';
// Workspace
import './contrib/workspace/browser/workspace.contribution.js';
// Workspaces
import './contrib/workspaces/browser/workspaces.contribution.js';
// List
import './contrib/list/browser/list.contribution.js';
// Accessibility Signals
import './contrib/accessibilitySignals/browser/accessibilitySignal.contribution.js';
// Deprecated Extension Migrator
import './contrib/deprecatedExtensionMigrator/browser/deprecatedExtensionMigrator.contribution.js';
// Bracket Pair Colorizer 2 Telemetry
import './contrib/bracketPairColorizer2Telemetry/browser/bracketPairColorizer2Telemetry.contribution.js';
// Accessibility
import './contrib/accessibility/browser/accessibility.contribution.js';
// Share
import './contrib/share/browser/share.contribution.js';
// Synchronized Scrolling
import './contrib/scrollLocking/browser/scrollLocking.contribution.js';
// Inline Completions
import './contrib/inlineCompletions/browser/inlineCompletions.contribution.js';
// Drop or paste into
import './contrib/dropOrPasteInto/browser/dropOrPasteInto.contribution.js';
import { AllowedExtensionsService } from '../platform/extensionManagement/common/allowedExtensionsService.js';
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2JlbmNoLmNvbW1vbi5tYWluLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvd29ya2JlbmNoLmNvbW1vbi5tYWluLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLG1DQUFtQztBQUVuQyxPQUFPLHlCQUF5QixDQUFDO0FBRWpDLE9BQU8sNkNBQTZDLENBQUM7QUFDckQsT0FBTyxxQ0FBcUMsQ0FBQztBQUU3QyxZQUFZO0FBRVosa0JBQWtCO0FBQ2xCLE9BQU8sNkNBQTZDLENBQUMsQ0FBQyxrQkFBa0I7QUFDeEUsWUFBWTtBQUVaLCtCQUErQjtBQUUvQixPQUFPLHVDQUF1QyxDQUFDO0FBQy9DLE9BQU8sdUNBQXVDLENBQUM7QUFDL0MsT0FBTyxrQ0FBa0MsQ0FBQztBQUMxQyxPQUFPLG9DQUFvQyxDQUFDO0FBQzVDLE9BQU8sbUNBQW1DLENBQUM7QUFDM0MsT0FBTyx3Q0FBd0MsQ0FBQztBQUNoRCxPQUFPLG9DQUFvQyxDQUFDO0FBQzVDLE9BQU8sdUNBQXVDLENBQUM7QUFDL0MsT0FBTyx3Q0FBd0MsQ0FBQztBQUNoRCxPQUFPLHlDQUF5QyxDQUFDO0FBQ2pELE9BQU8sK0NBQStDLENBQUM7QUFFdkQsWUFBWTtBQUdaLGtDQUFrQztBQUVsQyxPQUFPLGtEQUFrRCxDQUFDO0FBQzFELE9BQU8sNkNBQTZDLENBQUM7QUFDckQsT0FBTyxzQ0FBc0MsQ0FBQztBQUU5QyxZQUFZO0FBR1osNkJBQTZCO0FBRTdCLE9BQU8sK0NBQStDLENBQUM7QUFDdkQsT0FBTyx1Q0FBdUMsQ0FBQztBQUMvQyxPQUFPLDZDQUE2QyxDQUFDO0FBQ3JELE9BQU8sc0NBQXNDLENBQUM7QUFDOUMsT0FBTyw0Q0FBNEMsQ0FBQztBQUVwRCxZQUFZO0FBR1osZ0NBQWdDO0FBRWhDLE9BQU8s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