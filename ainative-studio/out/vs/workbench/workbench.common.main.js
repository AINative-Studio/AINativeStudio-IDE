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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2JlbmNoLmNvbW1vbi5tYWluLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3dvcmtiZW5jaC5jb21tb24ubWFpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxtQ0FBbUM7QUFFbkMsT0FBTyx5QkFBeUIsQ0FBQztBQUVqQyxPQUFPLDZDQUE2QyxDQUFDO0FBQ3JELE9BQU8scUNBQXFDLENBQUM7QUFFN0MsWUFBWTtBQUVaLGtCQUFrQjtBQUNsQixPQUFPLDZDQUE2QyxDQUFDLENBQUMsa0JBQWtCO0FBQ3hFLFlBQVk7QUFFWiwrQkFBK0I7QUFFL0IsT0FBTyx1Q0FBdUMsQ0FBQztBQUMvQyxPQUFPLHVDQUF1QyxDQUFDO0FBQy9DLE9BQU8sa0NBQWtDLENBQUM7QUFDMUMsT0FBTyxvQ0FBb0MsQ0FBQztBQUM1QyxPQUFPLG1DQUFtQyxDQUFDO0FBQzNDLE9BQU8sd0NBQXdDLENBQUM7QUFDaEQsT0FBTyxvQ0FBb0MsQ0FBQztBQUM1QyxPQUFPLHVDQUF1QyxDQUFDO0FBQy9DLE9BQU8sd0NBQXdDLENBQUM7QUFDaEQsT0FBTyx5Q0FBeUMsQ0FBQztBQUNqRCxPQUFPLCtDQUErQyxDQUFDO0FBRXZELFlBQVk7QUFHWixrQ0FBa0M7QUFFbEMsT0FBTyxrREFBa0QsQ0FBQztBQUMxRCxPQUFPLDZDQUE2QyxDQUFDO0FBQ3JELE9BQU8sc0NBQXNDLENBQUM7QUFFOUMsWUFBWTtBQUdaLDZCQUE2QjtBQUU3QixPQUFPLCtDQUErQyxDQUFDO0FBQ3ZELE9BQU8sdUNBQXVDLENBQUM7QUFDL0MsT0FBTyw2Q0FBNkMsQ0FBQztBQUNyRCxPQUFPLHNDQUFzQyxDQUFDO0FBQzlDLE9BQU8sNENBQTRDLENBQUM7QUFFcEQsWUFBWTtBQUdaLGdDQUFnQztBQUVoQyxPQUFPLG9EQUFv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