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
import { FileEditorInput } from '../../contrib/files/browser/editors/fileEditorInput.js';
import { TestInstantiationService } from '../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { basename, isEqual } from '../../../base/common/resources.js';
import { URI } from '../../../base/common/uri.js';
import { ITelemetryService } from '../../../platform/telemetry/common/telemetry.js';
import { NullTelemetryService } from '../../../platform/telemetry/common/telemetryUtils.js';
import { EditorInput } from '../../common/editor/editorInput.js';
import { EditorExtensions, EditorExtensions as Extensions } from '../../common/editor.js';
import { DEFAULT_EDITOR_PART_OPTIONS } from '../../browser/parts/editor/editor.js';
import { Event, Emitter } from '../../../base/common/event.js';
import { IWorkingCopyBackupService } from '../../services/workingCopy/common/workingCopyBackup.js';
import { IConfigurationService } from '../../../platform/configuration/common/configuration.js';
import { IWorkbenchLayoutService } from '../../services/layout/browser/layoutService.js';
import { TextModelResolverService } from '../../services/textmodelResolver/common/textModelResolverService.js';
import { ITextModelService } from '../../../editor/common/services/resolverService.js';
import { IUntitledTextEditorService, UntitledTextEditorService } from '../../services/untitled/common/untitledTextEditorService.js';
import { IWorkspaceContextService } from '../../../platform/workspace/common/workspace.js';
import { ILifecycleService } from '../../services/lifecycle/common/lifecycle.js';
import { ServiceCollection } from '../../../platform/instantiation/common/serviceCollection.js';
import { IFileService } from '../../../platform/files/common/files.js';
import { IModelService } from '../../../editor/common/services/model.js';
import { LanguageService } from '../../../editor/common/services/languageService.js';
import { ModelService } from '../../../editor/common/services/modelService.js';
import { ITextFileService } from '../../services/textfile/common/textfiles.js';
import { ILanguageService } from '../../../editor/common/languages/language.js';
import { IHistoryService } from '../../services/history/common/history.js';
import { IInstantiationService } from '../../../platform/instantiation/common/instantiation.js';
import { TestConfigurationService } from '../../../platform/configuration/test/common/testConfigurationService.js';
import { TestWorkspace } from '../../../platform/workspace/test/common/testWorkspace.js';
import { IEnvironmentService } from '../../../platform/environment/common/environment.js';
import { IThemeService } from '../../../platform/theme/common/themeService.js';
import { TestThemeService } from '../../../platform/theme/test/common/testThemeService.js';
import { ITextResourceConfigurationService, ITextResourcePropertiesService } from '../../../editor/common/services/textResourceConfiguration.js';
import { Position as EditorPosition } from '../../../editor/common/core/position.js';
import { IMenuService } from '../../../platform/actions/common/actions.js';
import { IContextKeyService } from '../../../platform/contextkey/common/contextkey.js';
import { MockContextKeyService, MockKeybindingService } from '../../../platform/keybinding/test/common/mockKeybindingService.js';
import { Range } from '../../../editor/common/core/range.js';
import { IDialogService, IFileDialogService } from '../../../platform/dialogs/common/dialogs.js';
import { INotificationService } from '../../../platform/notification/common/notification.js';
import { TestNotificationService } from '../../../platform/notification/test/common/testNotificationService.js';
import { IExtensionService } from '../../services/extensions/common/extensions.js';
import { IKeybindingService } from '../../../platform/keybinding/common/keybinding.js';
import { IDecorationsService } from '../../services/decorations/common/decorations.js';
import { toDisposable, Disposable, DisposableStore } from '../../../base/common/lifecycle.js';
import { IEditorGroupsService } from '../../services/editor/common/editorGroupsService.js';
import { IEditorService } from '../../services/editor/common/editorService.js';
import { ICodeEditorService } from '../../../editor/browser/services/codeEditorService.js';
import { EditorPaneDescriptor } from '../../browser/editor.js';
import { ILoggerService, ILogService, NullLogService } from '../../../platform/log/common/log.js';
import { ILabelService } from '../../../platform/label/common/label.js';
import { DeferredPromise, timeout } from '../../../base/common/async.js';
import { IStorageService } from '../../../platform/storage/common/storage.js';
import { isLinux, isWindows } from '../../../base/common/platform.js';
import { LabelService } from '../../services/label/common/labelService.js';
import { bufferToStream, VSBuffer } from '../../../base/common/buffer.js';
import { Schemas } from '../../../base/common/network.js';
import { IProductService } from '../../../platform/product/common/productService.js';
import product from '../../../platform/product/common/product.js';
import { IHostService } from '../../services/host/browser/host.js';
import { IWorkingCopyService, WorkingCopyService } from '../../services/workingCopy/common/workingCopyService.js';
import { IFilesConfigurationService, FilesConfigurationService } from '../../services/filesConfiguration/common/filesConfigurationService.js';
import { IAccessibilityService } from '../../../platform/accessibility/common/accessibility.js';
import { BrowserWorkbenchEnvironmentService } from '../../services/environment/browser/environmentService.js';
import { BrowserTextFileService } from '../../services/textfile/browser/browserTextFileService.js';
import { IWorkbenchEnvironmentService } from '../../services/environment/common/environmentService.js';
import { createTextBufferFactoryFromStream } from '../../../editor/common/model/textModel.js';
import { IPathService } from '../../services/path/common/pathService.js';
import { IProgressService, Progress } from '../../../platform/progress/common/progress.js';
import { IWorkingCopyFileService, WorkingCopyFileService } from '../../services/workingCopy/common/workingCopyFileService.js';
import { UndoRedoService } from '../../../platform/undoRedo/common/undoRedoService.js';
import { IUndoRedoService } from '../../../platform/undoRedo/common/undoRedo.js';
import { TextFileEditorModel } from '../../services/textfile/common/textFileEditorModel.js';
import { Registry } from '../../../platform/registry/common/platform.js';
import { EditorPane } from '../../browser/parts/editor/editorPane.js';
import { CancellationToken } from '../../../base/common/cancellation.js';
import { SyncDescriptor } from '../../../platform/instantiation/common/descriptors.js';
import { TestDialogService } from '../../../platform/dialogs/test/common/testDialogService.js';
import { CodeEditorService } from '../../services/editor/browser/codeEditorService.js';
import { MainEditorPart } from '../../browser/parts/editor/editorPart.js';
import { IQuickInputService } from '../../../platform/quickinput/common/quickInput.js';
import { QuickInputService } from '../../services/quickinput/browser/quickInputService.js';
import { IListService } from '../../../platform/list/browser/listService.js';
import { win32, posix } from '../../../base/common/path.js';
import { TestContextService, TestStorageService, TestTextResourcePropertiesService, TestExtensionService, TestProductService, createFileStat, TestLoggerService, TestWorkspaceTrustManagementService, TestWorkspaceTrustRequestService, TestMarkerService, TestHistoryService } from '../common/workbenchTestServices.js';
import { IUriIdentityService } from '../../../platform/uriIdentity/common/uriIdentity.js';
import { UriIdentityService } from '../../../platform/uriIdentity/common/uriIdentityService.js';
import { InMemoryFileSystemProvider } from '../../../platform/files/common/inMemoryFilesystemProvider.js';
import { newWriteableStream } from '../../../base/common/stream.js';
import { EncodingOracle } from '../../services/textfile/browser/textFileService.js';
import { UTF16le, UTF16be, UTF8_with_bom } from '../../services/textfile/common/encoding.js';
import { ColorScheme } from '../../../platform/theme/common/theme.js';
import { Iterable } from '../../../base/common/iterator.js';
import { InMemoryWorkingCopyBackupService } from '../../services/workingCopy/common/workingCopyBackupService.js';
import { BrowserWorkingCopyBackupService } from '../../services/workingCopy/browser/workingCopyBackupService.js';
import { FileService } from '../../../platform/files/common/fileService.js';
import { TextResourceEditor } from '../../browser/parts/editor/textResourceEditor.js';
import { TestCodeEditor } from '../../../editor/test/browser/testCodeEditor.js';
import { TextFileEditor } from '../../contrib/files/browser/editors/textFileEditor.js';
import { TextResourceEditorInput } from '../../common/editor/textResourceEditorInput.js';
import { UntitledTextEditorInput } from '../../services/untitled/common/untitledTextEditorInput.js';
import { SideBySideEditor } from '../../browser/parts/editor/sideBySideEditor.js';
import { IWorkspacesService } from '../../../platform/workspaces/common/workspaces.js';
import { IWorkspaceTrustManagementService, IWorkspaceTrustRequestService } from '../../../platform/workspace/common/workspaceTrust.js';
import { ITerminalLogService } from '../../../platform/terminal/common/terminal.js';
import { ITerminalConfigurationService, ITerminalEditorService, ITerminalGroupService, ITerminalInstanceService } from '../../contrib/terminal/browser/terminal.js';
import { assertIsDefined, upcast } from '../../../base/common/types.js';
import { ITerminalProfileResolverService, ITerminalProfileService } from '../../contrib/terminal/common/terminal.js';
import { EditorResolverService } from '../../services/editor/browser/editorResolverService.js';
import { FILE_EDITOR_INPUT_ID } from '../../contrib/files/common/files.js';
import { IEditorResolverService } from '../../services/editor/common/editorResolverService.js';
import { IWorkingCopyEditorService, WorkingCopyEditorService } from '../../services/workingCopy/common/workingCopyEditorService.js';
import { IElevatedFileService } from '../../services/files/common/elevatedFileService.js';
import { BrowserElevatedFileService } from '../../services/files/browser/elevatedFileService.js';
import { IEditorWorkerService } from '../../../editor/common/services/editorWorker.js';
import { ResourceMap } from '../../../base/common/map.js';
import { SideBySideEditorInput } from '../../common/editor/sideBySideEditorInput.js';
import { ITextEditorService, TextEditorService } from '../../services/textfile/common/textEditorService.js';
import { IPaneCompositePartService } from '../../services/panecomposite/browser/panecomposite.js';
import { ILanguageConfigurationService } from '../../../editor/common/languages/languageConfigurationRegistry.js';
import { TestLanguageConfigurationService } from '../../../editor/test/common/modes/testLanguageConfigurationService.js';
import { env } from '../../../base/common/process.js';
import { isValidBasename } from '../../../base/common/extpath.js';
import { TestAccessibilityService } from '../../../platform/accessibility/test/common/testAccessibilityService.js';
import { ILanguageFeatureDebounceService, LanguageFeatureDebounceService } from '../../../editor/common/services/languageFeatureDebounce.js';
import { ILanguageFeaturesService } from '../../../editor/common/services/languageFeatures.js';
import { LanguageFeaturesService } from '../../../editor/common/services/languageFeaturesService.js';
import { TextEditorPaneSelection } from '../../browser/parts/editor/textEditor.js';
import { Selection } from '../../../editor/common/core/selection.js';
import { TestEditorWorkerService } from '../../../editor/test/common/services/testEditorWorkerService.js';
import { IRemoteAgentService } from '../../services/remote/common/remoteAgentService.js';
import { ILanguageDetectionService } from '../../services/languageDetection/common/languageDetectionWorkerService.js';
import { IUserDataProfilesService, toUserDataProfile, UserDataProfilesService } from '../../../platform/userDataProfile/common/userDataProfile.js';
import { UserDataProfileService } from '../../services/userDataProfile/common/userDataProfileService.js';
import { IUserDataProfileService } from '../../services/userDataProfile/common/userDataProfile.js';
import { Codicon } from '../../../base/common/codicons.js';
import { IRemoteSocketFactoryService, RemoteSocketFactoryService } from '../../../platform/remote/common/remoteSocketFactoryService.js';
import { EditorParts } from '../../browser/parts/editor/editorParts.js';
import { mainWindow } from '../../../base/browser/window.js';
import { IMarkerService } from '../../../platform/markers/common/markers.js';
import { IAccessibilitySignalService } from '../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
import { IEditorPaneService } from '../../services/editor/common/editorPaneService.js';
import { EditorPaneService } from '../../services/editor/browser/editorPaneService.js';
import { IContextMenuService, IContextViewService } from '../../../platform/contextview/browser/contextView.js';
import { ContextViewService } from '../../../platform/contextview/browser/contextViewService.js';
import { CustomEditorLabelService, ICustomEditorLabelService } from '../../services/editor/common/customEditorLabelService.js';
import { TerminalConfigurationService } from '../../contrib/terminal/browser/terminalConfigurationService.js';
import { TerminalLogService } from '../../../platform/terminal/common/terminalLogService.js';
import { IEnvironmentVariableService } from '../../contrib/terminal/common/environmentVariable.js';
import { EnvironmentVariableService } from '../../contrib/terminal/common/environmentVariableService.js';
import { ContextMenuService } from '../../../platform/contextview/browser/contextMenuService.js';
import { IHoverService } from '../../../platform/hover/browser/hover.js';
import { NullHoverService } from '../../../platform/hover/test/browser/nullHoverService.js';
import { IActionViewItemService, NullActionViewItemService } from '../../../platform/actions/browser/actionViewItemService.js';
export function createFileEditorInput(instantiationService, resource) {
    return instantiationService.createInstance(FileEditorInput, resource, undefined, undefined, undefined, undefined, undefined, undefined);
}
Registry.as(EditorExtensions.EditorFactory).registerFileEditorFactory({
    typeId: FILE_EDITOR_INPUT_ID,
    createFileEditor: (resource, preferredResource, preferredName, preferredDescription, preferredEncoding, preferredLanguageId, preferredContents, instantiationService) => {
        return instantiationService.createInstance(FileEditorInput, resource, preferredResource, preferredName, preferredDescription, preferredEncoding, preferredLanguageId, preferredContents);
    },
    isFileEditor: (obj) => {
        return obj instanceof FileEditorInput;
    }
});
export class TestTextResourceEditor extends TextResourceEditor {
    createEditorControl(parent, configuration) {
        this.editorControl = this._register(this.instantiationService.createInstance(TestCodeEditor, parent, configuration, {}));
    }
}
export class TestTextFileEditor extends TextFileEditor {
    createEditorControl(parent, configuration) {
        this.editorControl = this._register(this.instantiationService.createInstance(TestCodeEditor, parent, configuration, { contributions: [] }));
    }
    setSelection(selection, reason) {
        this._options = selection ? upcast({ selection }) : undefined;
        this._onDidChangeSelection.fire({ reason });
    }
    getSelection() {
        const options = this.options;
        if (!options) {
            return undefined;
        }
        const textSelection = options.selection;
        if (!textSelection) {
            return undefined;
        }
        return new TextEditorPaneSelection(new Selection(textSelection.startLineNumber, textSelection.startColumn, textSelection.endLineNumber ?? textSelection.startLineNumber, textSelection.endColumn ?? textSelection.startColumn));
    }
}
export class TestWorkingCopyService extends WorkingCopyService {
    testUnregisterWorkingCopy(workingCopy) {
        return super.unregisterWorkingCopy(workingCopy);
    }
}
export function workbenchInstantiationService(overrides, disposables = new DisposableStore()) {
    const instantiationService = disposables.add(new TestInstantiationService(new ServiceCollection([ILifecycleService, disposables.add(new TestLifecycleService())], [IActionViewItemService, new SyncDescriptor(NullActionViewItemService)])));
    instantiationService.stub(IProductService, TestProductService);
    instantiationService.stub(IEditorWorkerService, new TestEditorWorkerService());
    instantiationService.stub(IWorkingCopyService, disposables.add(new TestWorkingCopyService()));
    const environmentService = overrides?.environmentService ? overrides.environmentService(instantiationService) : TestEnvironmentService;
    instantiationService.stub(IEnvironmentService, environmentService);
    instantiationService.stub(IWorkbenchEnvironmentService, environmentService);
    instantiationService.stub(ILogService, new NullLogService());
    const contextKeyService = overrides?.contextKeyService ? overrides.contextKeyService(instantiationService) : instantiationService.createInstance(MockContextKeyService);
    instantiationService.stub(IContextKeyService, contextKeyService);
    instantiationService.stub(IProgressService, new TestProgressService());
    const workspaceContextService = new TestContextService(TestWorkspace);
    instantiationService.stub(IWorkspaceContextService, workspaceContextService);
    const configService = overrides?.configurationService ? overrides.configurationService(instantiationService) : new TestConfigurationService({
        files: {
            participants: {
                timeout: 60000
            }
        }
    });
    instantiationService.stub(IConfigurationService, configService);
    const textResourceConfigurationService = new TestTextResourceConfigurationService(configService);
    instantiationService.stub(ITextResourceConfigurationService, textResourceConfigurationService);
    instantiationService.stub(IUntitledTextEditorService, disposables.add(instantiationService.createInstance(UntitledTextEditorService)));
    instantiationService.stub(IStorageService, disposables.add(new TestStorageService()));
    instantiationService.stub(IRemoteAgentService, new TestRemoteAgentService());
    instantiationService.stub(ILanguageDetectionService, new TestLanguageDetectionService());
    instantiationService.stub(IPathService, overrides?.pathService ? overrides.pathService(instantiationService) : new TestPathService());
    const layoutService = new TestLayoutService();
    instantiationService.stub(IWorkbenchLayoutService, layoutService);
    instantiationService.stub(IDialogService, new TestDialogService());
    const accessibilityService = new TestAccessibilityService();
    instantiationService.stub(IAccessibilityService, accessibilityService);
    instantiationService.stub(IAccessibilitySignalService, {
        playSignal: async () => { },
        isSoundEnabled(signal) { return false; },
    });
    instantiationService.stub(IFileDialogService, instantiationService.createInstance(TestFileDialogService));
    instantiationService.stub(ILanguageService, disposables.add(instantiationService.createInstance(LanguageService)));
    instantiationService.stub(ILanguageFeaturesService, new LanguageFeaturesService());
    instantiationService.stub(ILanguageFeatureDebounceService, instantiationService.createInstance(LanguageFeatureDebounceService));
    instantiationService.stub(IHistoryService, new TestHistoryService());
    instantiationService.stub(ITextResourcePropertiesService, new TestTextResourcePropertiesService(configService));
    instantiationService.stub(IUndoRedoService, instantiationService.createInstance(UndoRedoService));
    const themeService = new TestThemeService();
    instantiationService.stub(IThemeService, themeService);
    instantiationService.stub(ILanguageConfigurationService, disposables.add(new TestLanguageConfigurationService()));
    instantiationService.stub(IModelService, disposables.add(instantiationService.createInstance(ModelService)));
    const fileService = overrides?.fileService ? overrides.fileService(instantiationService) : disposables.add(new TestFileService());
    instantiationService.stub(IFileService, fileService);
    instantiationService.stub(IUriIdentityService, disposables.add(new UriIdentityService(fileService)));
    const markerService = new TestMarkerService();
    instantiationService.stub(IMarkerService, markerService);
    instantiationService.stub(IFilesConfigurationService, disposables.add(instantiationService.createInstance(TestFilesConfigurationService)));
    const userDataProfilesService = instantiationService.stub(IUserDataProfilesService, disposables.add(instantiationService.createInstance(UserDataProfilesService)));
    instantiationService.stub(IUserDataProfileService, disposables.add(new UserDataProfileService(userDataProfilesService.defaultProfile)));
    instantiationService.stub(IWorkingCopyBackupService, overrides?.workingCopyBackupService ? overrides?.workingCopyBackupService(instantiationService) : disposables.add(new TestWorkingCopyBackupService()));
    instantiationService.stub(ITelemetryService, NullTelemetryService);
    instantiationService.stub(INotificationService, new TestNotificationService());
    instantiationService.stub(IUntitledTextEditorService, disposables.add(instantiationService.createInstance(UntitledTextEditorService)));
    instantiationService.stub(IMenuService, new TestMenuService());
    const keybindingService = new MockKeybindingService();
    instantiationService.stub(IKeybindingService, keybindingService);
    instantiationService.stub(IDecorationsService, new TestDecorationsService());
    instantiationService.stub(IExtensionService, new TestExtensionService());
    instantiationService.stub(IWorkingCopyFileService, disposables.add(instantiationService.createInstance(WorkingCopyFileService)));
    instantiationService.stub(ITextFileService, overrides?.textFileService ? overrides.textFileService(instantiationService) : disposables.add(instantiationService.createInstance(TestTextFileService)));
    instantiationService.stub(IHostService, instantiationService.createInstance(TestHostService));
    instantiationService.stub(ITextModelService, disposables.add(instantiationService.createInstance(TextModelResolverService)));
    instantiationService.stub(ILoggerService, disposables.add(new TestLoggerService(TestEnvironmentService.logsHome)));
    const editorGroupService = new TestEditorGroupsService([new TestEditorGroupView(0)]);
    instantiationService.stub(IEditorGroupsService, editorGroupService);
    instantiationService.stub(ILabelService, disposables.add(instantiationService.createInstance(LabelService)));
    const editorService = overrides?.editorService ? overrides.editorService(instantiationService) : disposables.add(new TestEditorService(editorGroupService));
    instantiationService.stub(IEditorService, editorService);
    instantiationService.stub(IEditorPaneService, new EditorPaneService());
    instantiationService.stub(IWorkingCopyEditorService, disposables.add(instantiationService.createInstance(WorkingCopyEditorService)));
    instantiationService.stub(IEditorResolverService, disposables.add(instantiationService.createInstance(EditorResolverService)));
    const textEditorService = overrides?.textEditorService ? overrides.textEditorService(instantiationService) : disposables.add(instantiationService.createInstance(TextEditorService));
    instantiationService.stub(ITextEditorService, textEditorService);
    instantiationService.stub(ICodeEditorService, disposables.add(new CodeEditorService(editorService, themeService, configService)));
    instantiationService.stub(IPaneCompositePartService, disposables.add(new TestPaneCompositeService()));
    instantiationService.stub(IListService, new TestListService());
    instantiationService.stub(IContextViewService, disposables.add(instantiationService.createInstance(ContextViewService)));
    instantiationService.stub(IContextMenuService, disposables.add(instantiationService.createInstance(ContextMenuService)));
    instantiationService.stub(IQuickInputService, disposables.add(new QuickInputService(configService, instantiationService, keybindingService, contextKeyService, themeService, layoutService)));
    instantiationService.stub(IWorkspacesService, new TestWorkspacesService());
    instantiationService.stub(IWorkspaceTrustManagementService, disposables.add(new TestWorkspaceTrustManagementService()));
    instantiationService.stub(IWorkspaceTrustRequestService, disposables.add(new TestWorkspaceTrustRequestService(false)));
    instantiationService.stub(ITerminalInstanceService, new TestTerminalInstanceService());
    instantiationService.stub(ITerminalEditorService, new TestTerminalEditorService());
    instantiationService.stub(ITerminalGroupService, new TestTerminalGroupService());
    instantiationService.stub(ITerminalProfileService, new TestTerminalProfileService());
    instantiationService.stub(ITerminalProfileResolverService, new TestTerminalProfileResolverService());
    instantiationService.stub(ITerminalConfigurationService, disposables.add(instantiationService.createInstance(TestTerminalConfigurationService)));
    instantiationService.stub(ITerminalLogService, disposables.add(instantiationService.createInstance(TerminalLogService)));
    instantiationService.stub(IEnvironmentVariableService, disposables.add(instantiationService.createInstance(EnvironmentVariableService)));
    instantiationService.stub(IElevatedFileService, new BrowserElevatedFileService());
    instantiationService.stub(IRemoteSocketFactoryService, new RemoteSocketFactoryService());
    instantiationService.stub(ICustomEditorLabelService, disposables.add(new CustomEditorLabelService(configService, workspaceContextService)));
    instantiationService.stub(IHoverService, NullHoverService);
    return instantiationService;
}
let TestServiceAccessor = class TestServiceAccessor {
    constructor(lifecycleService, textFileService, textEditorService, workingCopyFileService, filesConfigurationService, contextService, modelService, fileService, fileDialogService, dialogService, workingCopyService, editorService, editorPaneService, environmentService, pathService, editorGroupService, editorResolverService, languageService, textModelResolverService, untitledTextEditorService, testConfigurationService, workingCopyBackupService, hostService, quickInputService, labelService, logService, uriIdentityService, instantitionService, notificationService, workingCopyEditorService, instantiationService, elevatedFileService, workspaceTrustRequestService, decorationsService, progressService) {
        this.lifecycleService = lifecycleService;
        this.textFileService = textFileService;
        this.textEditorService = textEditorService;
        this.workingCopyFileService = workingCopyFileService;
        this.filesConfigurationService = filesConfigurationService;
        this.contextService = contextService;
        this.modelService = modelService;
        this.fileService = fileService;
        this.fileDialogService = fileDialogService;
        this.dialogService = dialogService;
        this.workingCopyService = workingCopyService;
        this.editorService = editorService;
        this.editorPaneService = editorPaneService;
        this.environmentService = environmentService;
        this.pathService = pathService;
        this.editorGroupService = editorGroupService;
        this.editorResolverService = editorResolverService;
        this.languageService = languageService;
        this.textModelResolverService = textModelResolverService;
        this.untitledTextEditorService = untitledTextEditorService;
        this.testConfigurationService = testConfigurationService;
        this.workingCopyBackupService = workingCopyBackupService;
        this.hostService = hostService;
        this.quickInputService = quickInputService;
        this.labelService = labelService;
        this.logService = logService;
        this.uriIdentityService = uriIdentityService;
        this.instantitionService = instantitionService;
        this.notificationService = notificationService;
        this.workingCopyEditorService = workingCopyEditorService;
        this.instantiationService = instantiationService;
        this.elevatedFileService = elevatedFileService;
        this.workspaceTrustRequestService = workspaceTrustRequestService;
        this.decorationsService = decorationsService;
        this.progressService = progressService;
    }
};
TestServiceAccessor = __decorate([
    __param(0, ILifecycleService),
    __param(1, ITextFileService),
    __param(2, ITextEditorService),
    __param(3, IWorkingCopyFileService),
    __param(4, IFilesConfigurationService),
    __param(5, IWorkspaceContextService),
    __param(6, IModelService),
    __param(7, IFileService),
    __param(8, IFileDialogService),
    __param(9, IDialogService),
    __param(10, IWorkingCopyService),
    __param(11, IEditorService),
    __param(12, IEditorPaneService),
    __param(13, IWorkbenchEnvironmentService),
    __param(14, IPathService),
    __param(15, IEditorGroupsService),
    __param(16, IEditorResolverService),
    __param(17, ILanguageService),
    __param(18, ITextModelService),
    __param(19, IUntitledTextEditorService),
    __param(20, IConfigurationService),
    __param(21, IWorkingCopyBackupService),
    __param(22, IHostService),
    __param(23, IQuickInputService),
    __param(24, ILabelService),
    __param(25, ILogService),
    __param(26, IUriIdentityService),
    __param(27, IInstantiationService),
    __param(28, INotificationService),
    __param(29, IWorkingCopyEditorService),
    __param(30, IInstantiationService),
    __param(31, IElevatedFileService),
    __param(32, IWorkspaceTrustRequestService),
    __param(33, IDecorationsService),
    __param(34, IProgressService)
], TestServiceAccessor);
export { TestServiceAccessor };
let TestTextFileService = class TestTextFileService extends BrowserTextFileService {
    constructor(fileService, untitledTextEditorService, lifecycleService, instantiationService, modelService, environmentService, dialogService, fileDialogService, textResourceConfigurationService, filesConfigurationService, codeEditorService, pathService, workingCopyFileService, uriIdentityService, languageService, logService, elevatedFileService, decorationsService) {
        super(fileService, untitledTextEditorService, lifecycleService, instantiationService, modelService, environmentService, dialogService, fileDialogService, textResourceConfigurationService, filesConfigurationService, codeEditorService, pathService, workingCopyFileService, uriIdentityService, languageService, elevatedFileService, logService, decorationsService);
        this.readStreamError = undefined;
        this.writeError = undefined;
    }
    setReadStreamErrorOnce(error) {
        this.readStreamError = error;
    }
    async readStream(resource, options) {
        if (this.readStreamError) {
            const error = this.readStreamError;
            this.readStreamError = undefined;
            throw error;
        }
        const content = await this.fileService.readFileStream(resource, options);
        return {
            resource: content.resource,
            name: content.name,
            mtime: content.mtime,
            ctime: content.ctime,
            etag: content.etag,
            encoding: 'utf8',
            value: await createTextBufferFactoryFromStream(content.value),
            size: 10,
            readonly: false,
            locked: false
        };
    }
    setWriteErrorOnce(error) {
        this.writeError = error;
    }
    async write(resource, value, options) {
        if (this.writeError) {
            const error = this.writeError;
            this.writeError = undefined;
            throw error;
        }
        return super.write(resource, value, options);
    }
};
TestTextFileService = __decorate([
    __param(0, IFileService),
    __param(1, IUntitledTextEditorService),
    __param(2, ILifecycleService),
    __param(3, IInstantiationService),
    __param(4, IModelService),
    __param(5, IWorkbenchEnvironmentService),
    __param(6, IDialogService),
    __param(7, IFileDialogService),
    __param(8, ITextResourceConfigurationService),
    __param(9, IFilesConfigurationService),
    __param(10, ICodeEditorService),
    __param(11, IPathService),
    __param(12, IWorkingCopyFileService),
    __param(13, IUriIdentityService),
    __param(14, ILanguageService),
    __param(15, ILogService),
    __param(16, IElevatedFileService),
    __param(17, IDecorationsService)
], TestTextFileService);
export { TestTextFileService };
export class TestBrowserTextFileServiceWithEncodingOverrides extends BrowserTextFileService {
    get encoding() {
        if (!this._testEncoding) {
            this._testEncoding = this._register(this.instantiationService.createInstance(TestEncodingOracle));
        }
        return this._testEncoding;
    }
}
export class TestEncodingOracle extends EncodingOracle {
    get encodingOverrides() {
        return [
            { extension: 'utf16le', encoding: UTF16le },
            { extension: 'utf16be', encoding: UTF16be },
            { extension: 'utf8bom', encoding: UTF8_with_bom }
        ];
    }
    set encodingOverrides(overrides) { }
}
class TestEnvironmentServiceWithArgs extends BrowserWorkbenchEnvironmentService {
    constructor() {
        super(...arguments);
        this.args = [];
    }
}
export const TestEnvironmentService = new TestEnvironmentServiceWithArgs('', URI.file('tests').with({ scheme: 'vscode-tests' }), Object.create(null), TestProductService);
export class TestProgressService {
    withProgress(options, task, onDidCancel) {
        return task(Progress.None);
    }
}
export class TestDecorationsService {
    constructor() {
        this.onDidChangeDecorations = Event.None;
    }
    registerDecorationsProvider(_provider) { return Disposable.None; }
    getDecoration(_uri, _includeChildren, _overwrite) { return undefined; }
}
export class TestMenuService {
    createMenu(_id, _scopedKeybindingService) {
        return {
            onDidChange: Event.None,
            dispose: () => undefined,
            getActions: () => []
        };
    }
    getMenuActions(id, contextKeyService, options) {
        throw new Error('Method not implemented.');
    }
    getMenuContexts(id) {
        throw new Error('Method not implemented.');
    }
    resetHiddenStates() {
        // nothing
    }
}
let TestFileDialogService = class TestFileDialogService {
    constructor(pathService) {
        this.pathService = pathService;
    }
    async defaultFilePath(_schemeFilter) { return this.pathService.userHome(); }
    async defaultFolderPath(_schemeFilter) { return this.pathService.userHome(); }
    async defaultWorkspacePath(_schemeFilter) { return this.pathService.userHome(); }
    async preferredHome(_schemeFilter) { return this.pathService.userHome(); }
    pickFileFolderAndOpen(_options) { return Promise.resolve(0); }
    pickFileAndOpen(_options) { return Promise.resolve(0); }
    pickFolderAndOpen(_options) { return Promise.resolve(0); }
    pickWorkspaceAndOpen(_options) { return Promise.resolve(0); }
    setPickFileToSave(path) { this.fileToSave = path; }
    pickFileToSave(defaultUri, availableFileSystems) { return Promise.resolve(this.fileToSave); }
    showSaveDialog(_options) { return Promise.resolve(undefined); }
    showOpenDialog(_options) { return Promise.resolve(undefined); }
    setConfirmResult(result) { this.confirmResult = result; }
    showSaveConfirm(fileNamesOrResources) { return Promise.resolve(this.confirmResult); }
};
TestFileDialogService = __decorate([
    __param(0, IPathService)
], TestFileDialogService);
export { TestFileDialogService };
export class TestLayoutService {
    constructor() {
        this.openedDefaultEditors = false;
        this.mainContainerDimension = { width: 800, height: 600 };
        this.activeContainerDimension = { width: 800, height: 600 };
        this.mainContainerOffset = { top: 0, quickPickTop: 0 };
        this.activeContainerOffset = { top: 0, quickPickTop: 0 };
        this.mainContainer = mainWindow.document.body;
        this.containers = [mainWindow.document.body];
        this.activeContainer = mainWindow.document.body;
        this.onDidChangeZenMode = Event.None;
        this.onDidChangeMainEditorCenteredLayout = Event.None;
        this.onDidChangeWindowMaximized = Event.None;
        this.onDidChangePanelPosition = Event.None;
        this.onDidChangePanelAlignment = Event.None;
        this.onDidChangePartVisibility = Event.None;
        this.onDidLayoutMainContainer = Event.None;
        this.onDidLayoutActiveContainer = Event.None;
        this.onDidLayoutContainer = Event.None;
        this.onDidChangeNotificationsVisibility = Event.None;
        this.onDidAddContainer = Event.None;
        this.onDidChangeActiveContainer = Event.None;
        this.whenReady = Promise.resolve(undefined);
        this.whenRestored = Promise.resolve(undefined);
    }
    layout() { }
    isRestored() { return true; }
    hasFocus(_part) { return false; }
    focusPart(_part) { }
    hasMainWindowBorder() { return false; }
    getMainWindowBorderRadius() { return undefined; }
    isVisible(_part) { return true; }
    getContainer() { return mainWindow.document.body; }
    whenContainerStylesLoaded() { return undefined; }
    isTitleBarHidden() { return false; }
    isStatusBarHidden() { return false; }
    isActivityBarHidden() { return false; }
    setActivityBarHidden(_hidden) { }
    setBannerHidden(_hidden) { }
    isSideBarHidden() { return false; }
    async setEditorHidden(_hidden) { }
    async setSideBarHidden(_hidden) { }
    async setAuxiliaryBarHidden(_hidden) { }
    async setPartHidden(_hidden, part) { }
    isPanelHidden() { return false; }
    async setPanelHidden(_hidden) { }
    toggleMaximizedPanel() { }
    isPanelMaximized() { return false; }
    getMenubarVisibility() { throw new Error('not implemented'); }
    toggleMenuBar() { }
    getSideBarPosition() { return 0; }
    getPanelPosition() { return 0; }
    getPanelAlignment() { return 'center'; }
    async setPanelPosition(_position) { }
    async setPanelAlignment(_alignment) { }
    addClass(_clazz) { }
    removeClass(_clazz) { }
    getMaximumEditorDimensions() { throw new Error('not implemented'); }
    toggleZenMode() { }
    isMainEditorLayoutCentered() { return false; }
    centerMainEditorLayout(_active) { }
    resizePart(_part, _sizeChangeWidth, _sizeChangeHeight) { }
    getSize(part) { throw new Error('Method not implemented.'); }
    setSize(part, size) { throw new Error('Method not implemented.'); }
    registerPart(part) { return Disposable.None; }
    isWindowMaximized(targetWindow) { return false; }
    updateWindowMaximizedState(targetWindow, maximized) { }
    getVisibleNeighborPart(part, direction) { return undefined; }
    focus() { }
}
const activeViewlet = {};
export class TestPaneCompositeService extends Disposable {
    constructor() {
        super();
        this.parts = new Map();
        this.parts.set(1 /* ViewContainerLocation.Panel */, new TestPanelPart());
        this.parts.set(0 /* ViewContainerLocation.Sidebar */, new TestSideBarPart());
        this.onDidPaneCompositeOpen = Event.any(...([1 /* ViewContainerLocation.Panel */, 0 /* ViewContainerLocation.Sidebar */].map(loc => Event.map(this.parts.get(loc).onDidPaneCompositeOpen, composite => { return { composite, viewContainerLocation: loc }; }))));
        this.onDidPaneCompositeClose = Event.any(...([1 /* ViewContainerLocation.Panel */, 0 /* ViewContainerLocation.Sidebar */].map(loc => Event.map(this.parts.get(loc).onDidPaneCompositeClose, composite => { return { composite, viewContainerLocation: loc }; }))));
    }
    openPaneComposite(id, viewContainerLocation, focus) {
        return this.getPartByLocation(viewContainerLocation).openPaneComposite(id, focus);
    }
    getActivePaneComposite(viewContainerLocation) {
        return this.getPartByLocation(viewContainerLocation).getActivePaneComposite();
    }
    getPaneComposite(id, viewContainerLocation) {
        return this.getPartByLocation(viewContainerLocation).getPaneComposite(id);
    }
    getPaneComposites(viewContainerLocation) {
        return this.getPartByLocation(viewContainerLocation).getPaneComposites();
    }
    getProgressIndicator(id, viewContainerLocation) {
        return this.getPartByLocation(viewContainerLocation).getProgressIndicator(id);
    }
    hideActivePaneComposite(viewContainerLocation) {
        this.getPartByLocation(viewContainerLocation).hideActivePaneComposite();
    }
    getLastActivePaneCompositeId(viewContainerLocation) {
        return this.getPartByLocation(viewContainerLocation).getLastActivePaneCompositeId();
    }
    getPinnedPaneCompositeIds(viewContainerLocation) {
        throw new Error('Method not implemented.');
    }
    getVisiblePaneCompositeIds(viewContainerLocation) {
        throw new Error('Method not implemented.');
    }
    getPaneCompositeIds(viewContainerLocation) {
        throw new Error('Method not implemented.');
    }
    getPartByLocation(viewContainerLocation) {
        return assertIsDefined(this.parts.get(viewContainerLocation));
    }
}
export class TestSideBarPart {
    constructor() {
        this.onDidViewletRegisterEmitter = new Emitter();
        this.onDidViewletDeregisterEmitter = new Emitter();
        this.onDidViewletOpenEmitter = new Emitter();
        this.onDidViewletCloseEmitter = new Emitter();
        this.partId = "workbench.parts.sidebar" /* Parts.SIDEBAR_PART */;
        this.element = undefined;
        this.minimumWidth = 0;
        this.maximumWidth = 0;
        this.minimumHeight = 0;
        this.maximumHeight = 0;
        this.onDidChange = Event.None;
        this.onDidPaneCompositeOpen = this.onDidViewletOpenEmitter.event;
        this.onDidPaneCompositeClose = this.onDidViewletCloseEmitter.event;
    }
    openPaneComposite(id, focus) { return Promise.resolve(undefined); }
    getPaneComposites() { return []; }
    getAllViewlets() { return []; }
    getActivePaneComposite() { return activeViewlet; }
    getDefaultViewletId() { return 'workbench.view.explorer'; }
    getPaneComposite(id) { return undefined; }
    getProgressIndicator(id) { return undefined; }
    hideActivePaneComposite() { }
    getLastActivePaneCompositeId() { return undefined; }
    dispose() { }
    getPinnedPaneCompositeIds() { return []; }
    getVisiblePaneCompositeIds() { return []; }
    getPaneCompositeIds() { return []; }
    layout(width, height, top, left) { }
}
export class TestPanelPart {
    constructor() {
        this.element = undefined;
        this.minimumWidth = 0;
        this.maximumWidth = 0;
        this.minimumHeight = 0;
        this.maximumHeight = 0;
        this.onDidChange = Event.None;
        this.onDidPaneCompositeOpen = new Emitter().event;
        this.onDidPaneCompositeClose = new Emitter().event;
        this.partId = "workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */;
    }
    async openPaneComposite(id, focus) { return undefined; }
    getPaneComposite(id) { return activeViewlet; }
    getPaneComposites() { return []; }
    getPinnedPaneCompositeIds() { return []; }
    getVisiblePaneCompositeIds() { return []; }
    getPaneCompositeIds() { return []; }
    getActivePaneComposite() { return activeViewlet; }
    setPanelEnablement(id, enabled) { }
    dispose() { }
    getProgressIndicator(id) { return null; }
    hideActivePaneComposite() { }
    getLastActivePaneCompositeId() { return undefined; }
    layout(width, height, top, left) { }
}
export class TestViewsService {
    constructor() {
        this.onDidChangeViewContainerVisibility = new Emitter().event;
        this.onDidChangeViewVisibilityEmitter = new Emitter();
        this.onDidChangeViewVisibility = this.onDidChangeViewVisibilityEmitter.event;
        this.onDidChangeFocusedViewEmitter = new Emitter();
        this.onDidChangeFocusedView = this.onDidChangeFocusedViewEmitter.event;
    }
    isViewContainerVisible(id) { return true; }
    isViewContainerActive(id) { return true; }
    getVisibleViewContainer() { return null; }
    openViewContainer(id, focus) { return Promise.resolve(null); }
    closeViewContainer(id) { }
    isViewVisible(id) { return true; }
    getActiveViewWithId(id) { return null; }
    getViewWithId(id) { return null; }
    openView(id, focus) { return Promise.resolve(null); }
    closeView(id) { }
    getViewProgressIndicator(id) { return null; }
    getActiveViewPaneContainerWithId(id) { return null; }
    getFocusedViewName() { return ''; }
    getFocusedView() { return null; }
}
export class TestEditorGroupsService {
    constructor(groups = []) {
        this.groups = groups;
        this.parts = [this];
        this.windowId = mainWindow.vscodeWindowId;
        this.onDidCreateAuxiliaryEditorPart = Event.None;
        this.onDidChangeActiveGroup = Event.None;
        this.onDidActivateGroup = Event.None;
        this.onDidAddGroup = Event.None;
        this.onDidRemoveGroup = Event.None;
        this.onDidMoveGroup = Event.None;
        this.onDidChangeGroupIndex = Event.None;
        this.onDidChangeGroupLabel = Event.None;
        this.onDidChangeGroupLocked = Event.None;
        this.onDidChangeGroupMaximized = Event.None;
        this.onDidLayout = Event.None;
        this.onDidChangeEditorPartOptions = Event.None;
        this.onDidScroll = Event.None;
        this.onWillDispose = Event.None;
        this.orientation = 0 /* GroupOrientation.HORIZONTAL */;
        this.isReady = true;
        this.whenReady = Promise.resolve(undefined);
        this.whenRestored = Promise.resolve(undefined);
        this.hasRestorableState = false;
        this.contentDimension = { width: 800, height: 600 };
        this.mainPart = this;
    }
    get activeGroup() { return this.groups[0]; }
    get sideGroup() { return this.groups[0]; }
    get count() { return this.groups.length; }
    getPart(group) { return this; }
    saveWorkingSet(name) { throw new Error('Method not implemented.'); }
    getWorkingSets() { throw new Error('Method not implemented.'); }
    applyWorkingSet(workingSet, options) { throw new Error('Method not implemented.'); }
    deleteWorkingSet(workingSet) { throw new Error('Method not implemented.'); }
    getGroups(_order) { return this.groups; }
    getGroup(identifier) { return this.groups.find(group => group.id === identifier); }
    getLabel(_identifier) { return 'Group 1'; }
    findGroup(_scope, _source, _wrap) { throw new Error('not implemented'); }
    activateGroup(_group) { throw new Error('not implemented'); }
    restoreGroup(_group) { throw new Error('not implemented'); }
    getSize(_group) { return { width: 100, height: 100 }; }
    setSize(_group, _size) { }
    arrangeGroups(_arrangement) { }
    toggleMaximizeGroup() { }
    hasMaximizedGroup() { throw new Error('not implemented'); }
    toggleExpandGroup() { }
    applyLayout(_layout) { }
    getLayout() { throw new Error('not implemented'); }
    setGroupOrientation(_orientation) { }
    addGroup(_location, _direction) { throw new Error('not implemented'); }
    removeGroup(_group) { }
    moveGroup(_group, _location, _direction) { throw new Error('not implemented'); }
    mergeGroup(_group, _target, _options) { throw new Error('not implemented'); }
    mergeAllGroups(_group, _options) { throw new Error('not implemented'); }
    copyGroup(_group, _location, _direction) { throw new Error('not implemented'); }
    centerLayout(active) { }
    isLayoutCentered() { return false; }
    createEditorDropTarget(container, delegate) { return Disposable.None; }
    registerContextKeyProvider(_provider) { throw new Error('not implemented'); }
    getScopedInstantiationService(part) { throw new Error('Method not implemented.'); }
    enforcePartOptions(options) { return Disposable.None; }
    registerEditorPart(part) { return Disposable.None; }
    createAuxiliaryEditorPart() { throw new Error('Method not implemented.'); }
}
export class TestEditorGroupView {
    constructor(id) {
        this.id = id;
        this.windowId = mainWindow.vscodeWindowId;
        this.groupsView = undefined;
        this.selectedEditors = [];
        this.editors = [];
        this.whenRestored = Promise.resolve(undefined);
        this.isEmpty = true;
        this.onWillDispose = Event.None;
        this.onDidModelChange = Event.None;
        this.onWillCloseEditor = Event.None;
        this.onDidCloseEditor = Event.None;
        this.onDidOpenEditorFail = Event.None;
        this.onDidFocus = Event.None;
        this.onDidChange = Event.None;
        this.onWillMoveEditor = Event.None;
        this.onWillOpenEditor = Event.None;
        this.onDidActiveEditorChange = Event.None;
    }
    getEditors(_order) { return []; }
    findEditors(_resource) { return []; }
    getEditorByIndex(_index) { throw new Error('not implemented'); }
    getIndexOfEditor(_editor) { return -1; }
    isFirst(editor) { return false; }
    isLast(editor) { return false; }
    openEditor(_editor, _options) { throw new Error('not implemented'); }
    openEditors(_editors) { throw new Error('not implemented'); }
    isPinned(_editor) { return false; }
    isSticky(_editor) { return false; }
    isTransient(_editor) { return false; }
    isActive(_editor) { return false; }
    setSelection(_activeSelectedEditor, _inactiveSelectedEditors) { throw new Error('not implemented'); }
    isSelected(_editor) { return false; }
    contains(candidate) { return false; }
    moveEditor(_editor, _target, _options) { return true; }
    moveEditors(_editors, _target) { return true; }
    copyEditor(_editor, _target, _options) { }
    copyEditors(_editors, _target) { }
    async closeEditor(_editor, options) { return true; }
    async closeEditors(_editors, options) { return true; }
    async closeAllEditors(options) { return true; }
    async replaceEditors(_editors) { }
    pinEditor(_editor) { }
    stickEditor(editor) { }
    unstickEditor(editor) { }
    lock(locked) { }
    focus() { }
    get scopedContextKeyService() { throw new Error('not implemented'); }
    setActive(_isActive) { }
    notifyIndexChanged(_index) { }
    notifyLabelChanged(_label) { }
    dispose() { }
    toJSON() { return Object.create(null); }
    layout(_width, _height) { }
    relayout() { }
    createEditorActions(_menuDisposable) { throw new Error('not implemented'); }
}
export class TestEditorGroupAccessor {
    constructor() {
        this.label = '';
        this.windowId = mainWindow.vscodeWindowId;
        this.groups = [];
        this.partOptions = { ...DEFAULT_EDITOR_PART_OPTIONS };
        this.onDidChangeEditorPartOptions = Event.None;
        this.onDidVisibilityChange = Event.None;
    }
    getGroup(identifier) { throw new Error('Method not implemented.'); }
    getGroups(order) { throw new Error('Method not implemented.'); }
    activateGroup(identifier) { throw new Error('Method not implemented.'); }
    restoreGroup(identifier) { throw new Error('Method not implemented.'); }
    addGroup(location, direction) { throw new Error('Method not implemented.'); }
    mergeGroup(group, target, options) { throw new Error('Method not implemented.'); }
    moveGroup(group, location, direction) { throw new Error('Method not implemented.'); }
    copyGroup(group, location, direction) { throw new Error('Method not implemented.'); }
    removeGroup(group) { throw new Error('Method not implemented.'); }
    arrangeGroups(arrangement, target) { throw new Error('Method not implemented.'); }
    toggleMaximizeGroup(group) { throw new Error('Method not implemented.'); }
    toggleExpandGroup(group) { throw new Error('Method not implemented.'); }
}
export class TestEditorService extends Disposable {
    get activeTextEditorControl() { return this._activeTextEditorControl; }
    set activeTextEditorControl(value) { this._activeTextEditorControl = value; }
    get activeEditor() { return this._activeEditor; }
    set activeEditor(value) { this._activeEditor = value; }
    getVisibleTextEditorControls(order) { return this.visibleTextEditorControls; }
    constructor(editorGroupService) {
        super();
        this.editorGroupService = editorGroupService;
        this.onDidActiveEditorChange = Event.None;
        this.onDidVisibleEditorsChange = Event.None;
        this.onDidEditorsChange = Event.None;
        this.onWillOpenEditor = Event.None;
        this.onDidCloseEditor = Event.None;
        this.onDidOpenEditorFail = Event.None;
        this.onDidMostRecentlyActiveEditorsChange = Event.None;
        this.editors = [];
        this.mostRecentlyActiveEditors = [];
        this.visibleEditorPanes = [];
        this.visibleTextEditorControls = [];
        this.visibleEditors = [];
        this.count = this.editors.length;
    }
    createScoped(editorGroupsContainer) { return this; }
    getEditors() { return []; }
    findEditors() { return []; }
    async openEditor(editor, optionsOrGroup, group) {
        // openEditor takes ownership of the input, register it to the TestEditorService
        // so it's not marked as leaked during tests.
        if ('dispose' in editor) {
            this._register(editor);
        }
        return undefined;
    }
    async closeEditor(editor, options) { }
    async closeEditors(editors, options) { }
    doResolveEditorOpenRequest(editor) {
        if (!this.editorGroupService) {
            return undefined;
        }
        return [this.editorGroupService.activeGroup, editor, undefined];
    }
    openEditors(_editors, _group) { throw new Error('not implemented'); }
    isOpened(_editor) { return false; }
    isVisible(_editor) { return false; }
    replaceEditors(_editors, _group) { return Promise.resolve(undefined); }
    save(editors, options) { throw new Error('Method not implemented.'); }
    saveAll(options) { throw new Error('Method not implemented.'); }
    revert(editors, options) { throw new Error('Method not implemented.'); }
    revertAll(options) { throw new Error('Method not implemented.'); }
}
export class TestFileService {
    constructor() {
        this._onDidFilesChange = new Emitter();
        this._onDidRunOperation = new Emitter();
        this._onDidChangeFileSystemProviderCapabilities = new Emitter();
        this._onWillActivateFileSystemProvider = new Emitter();
        this.onWillActivateFileSystemProvider = this._onWillActivateFileSystemProvider.event;
        this.onDidWatchError = Event.None;
        this.content = 'Hello Html';
        this.readonly = false;
        this.notExistsSet = new ResourceMap();
        this.readShouldThrowError = undefined;
        this.writeShouldThrowError = undefined;
        this.onDidChangeFileSystemProviderRegistrations = Event.None;
        this.providers = new Map();
        this.watches = [];
    }
    get onDidFilesChange() { return this._onDidFilesChange.event; }
    fireFileChanges(event) { this._onDidFilesChange.fire(event); }
    get onDidRunOperation() { return this._onDidRunOperation.event; }
    fireAfterOperation(event) { this._onDidRunOperation.fire(event); }
    get onDidChangeFileSystemProviderCapabilities() { return this._onDidChangeFileSystemProviderCapabilities.event; }
    fireFileSystemProviderCapabilitiesChangeEvent(event) { this._onDidChangeFileSystemProviderCapabilities.fire(event); }
    setContent(content) { this.content = content; }
    getContent() { return this.content; }
    getLastReadFileUri() { return this.lastReadFileUri; }
    async resolve(resource, _options) {
        return createFileStat(resource, this.readonly);
    }
    stat(resource) {
        return this.resolve(resource, { resolveMetadata: true });
    }
    async resolveAll(toResolve) {
        const stats = await Promise.all(toResolve.map(resourceAndOption => this.resolve(resourceAndOption.resource, resourceAndOption.options)));
        return stats.map(stat => ({ stat, success: true }));
    }
    async exists(_resource) { return !this.notExistsSet.has(_resource); }
    async readFile(resource, options) {
        if (this.readShouldThrowError) {
            throw this.readShouldThrowError;
        }
        this.lastReadFileUri = resource;
        return {
            ...createFileStat(resource, this.readonly),
            value: VSBuffer.fromString(this.content)
        };
    }
    async readFileStream(resource, options) {
        if (this.readShouldThrowError) {
            throw this.readShouldThrowError;
        }
        this.lastReadFileUri = resource;
        return {
            ...createFileStat(resource, this.readonly),
            value: bufferToStream(VSBuffer.fromString(this.content))
        };
    }
    async writeFile(resource, bufferOrReadable, options) {
        await timeout(0);
        if (this.writeShouldThrowError) {
            throw this.writeShouldThrowError;
        }
        return createFileStat(resource, this.readonly);
    }
    move(_source, _target, _overwrite) { return Promise.resolve(null); }
    copy(_source, _target, _overwrite) { return Promise.resolve(null); }
    async cloneFile(_source, _target) { }
    createFile(_resource, _content, _options) { return Promise.resolve(null); }
    createFolder(_resource) { return Promise.resolve(null); }
    registerProvider(scheme, provider) {
        this.providers.set(scheme, provider);
        return toDisposable(() => this.providers.delete(scheme));
    }
    getProvider(scheme) {
        return this.providers.get(scheme);
    }
    async activateProvider(_scheme) {
        this._onWillActivateFileSystemProvider.fire({ scheme: _scheme, join: () => { } });
    }
    async canHandleResource(resource) { return this.hasProvider(resource); }
    hasProvider(resource) { return resource.scheme === Schemas.file || this.providers.has(resource.scheme); }
    listCapabilities() {
        return [
            { scheme: Schemas.file, capabilities: 4 /* FileSystemProviderCapabilities.FileOpenReadWriteClose */ },
            ...Iterable.map(this.providers, ([scheme, p]) => { return { scheme, capabilities: p.capabilities }; })
        ];
    }
    hasCapability(resource, capability) {
        if (capability === 1024 /* FileSystemProviderCapabilities.PathCaseSensitive */ && isLinux) {
            return true;
        }
        const provider = this.getProvider(resource.scheme);
        return !!(provider && (provider.capabilities & capability));
    }
    async del(_resource, _options) { }
    createWatcher(resource, options) {
        return {
            onDidChange: Event.None,
            dispose: () => { }
        };
    }
    watch(_resource) {
        this.watches.push(_resource);
        return toDisposable(() => this.watches.splice(this.watches.indexOf(_resource), 1));
    }
    getWriteEncoding(_resource) { return { encoding: 'utf8', hasBOM: false }; }
    dispose() { }
    async canCreateFile(source, options) { return true; }
    async canMove(source, target, overwrite) { return true; }
    async canCopy(source, target, overwrite) { return true; }
    async canDelete(resource, options) { return true; }
}
export class TestWorkingCopyBackupService extends InMemoryWorkingCopyBackupService {
    constructor() {
        super();
        this.resolved = new Set();
    }
    parseBackupContent(textBufferFactory) {
        const textBuffer = textBufferFactory.create(1 /* DefaultEndOfLine.LF */).textBuffer;
        const lineCount = textBuffer.getLineCount();
        const range = new Range(1, 1, lineCount, textBuffer.getLineLength(lineCount) + 1);
        return textBuffer.getValueInRange(range, 0 /* EndOfLinePreference.TextDefined */);
    }
    async resolve(identifier) {
        this.resolved.add(identifier);
        return super.resolve(identifier);
    }
}
export function toUntypedWorkingCopyId(resource) {
    return toTypedWorkingCopyId(resource, '');
}
export function toTypedWorkingCopyId(resource, typeId = 'testBackupTypeId') {
    return { typeId, resource };
}
export class InMemoryTestWorkingCopyBackupService extends BrowserWorkingCopyBackupService {
    constructor() {
        const disposables = new DisposableStore();
        const environmentService = TestEnvironmentService;
        const logService = new NullLogService();
        const fileService = disposables.add(new FileService(logService));
        disposables.add(fileService.registerProvider(Schemas.file, disposables.add(new InMemoryFileSystemProvider())));
        disposables.add(fileService.registerProvider(Schemas.vscodeUserData, disposables.add(new InMemoryFileSystemProvider())));
        super(new TestContextService(TestWorkspace), environmentService, fileService, logService);
        this.backupResourceJoiners = [];
        this.discardBackupJoiners = [];
        this.discardedBackups = [];
        this._register(disposables);
    }
    testGetFileService() {
        return this.fileService;
    }
    joinBackupResource() {
        return new Promise(resolve => this.backupResourceJoiners.push(resolve));
    }
    joinDiscardBackup() {
        return new Promise(resolve => this.discardBackupJoiners.push(resolve));
    }
    async backup(identifier, content, versionId, meta, token) {
        await super.backup(identifier, content, versionId, meta, token);
        while (this.backupResourceJoiners.length) {
            this.backupResourceJoiners.pop()();
        }
    }
    async discardBackup(identifier) {
        await super.discardBackup(identifier);
        this.discardedBackups.push(identifier);
        while (this.discardBackupJoiners.length) {
            this.discardBackupJoiners.pop()();
        }
    }
    async getBackupContents(identifier) {
        const backupResource = this.toBackupResource(identifier);
        const fileContents = await this.fileService.readFile(backupResource);
        return fileContents.value.toString();
    }
}
export class TestLifecycleService extends Disposable {
    constructor() {
        super(...arguments);
        this.usePhases = false;
        this.whenStarted = new DeferredPromise();
        this.whenReady = new DeferredPromise();
        this.whenRestored = new DeferredPromise();
        this.whenEventually = new DeferredPromise();
        this.willShutdown = false;
        this._onBeforeShutdown = this._register(new Emitter());
        this._onBeforeShutdownError = this._register(new Emitter());
        this._onShutdownVeto = this._register(new Emitter());
        this._onWillShutdown = this._register(new Emitter());
        this._onDidShutdown = this._register(new Emitter());
        this.shutdownJoiners = [];
    }
    get phase() { return this._phase; }
    set phase(value) {
        this._phase = value;
        if (value === 1 /* LifecyclePhase.Starting */) {
            this.whenStarted.complete();
        }
        else if (value === 2 /* LifecyclePhase.Ready */) {
            this.whenReady.complete();
        }
        else if (value === 3 /* LifecyclePhase.Restored */) {
            this.whenRestored.complete();
        }
        else if (value === 4 /* LifecyclePhase.Eventually */) {
            this.whenEventually.complete();
        }
    }
    async when(phase) {
        if (!this.usePhases) {
            return;
        }
        if (phase === 1 /* LifecyclePhase.Starting */) {
            await this.whenStarted.p;
        }
        else if (phase === 2 /* LifecyclePhase.Ready */) {
            await this.whenReady.p;
        }
        else if (phase === 3 /* LifecyclePhase.Restored */) {
            await this.whenRestored.p;
        }
        else if (phase === 4 /* LifecyclePhase.Eventually */) {
            await this.whenEventually.p;
        }
    }
    get onBeforeShutdown() { return this._onBeforeShutdown.event; }
    get onBeforeShutdownError() { return this._onBeforeShutdownError.event; }
    get onShutdownVeto() { return this._onShutdownVeto.event; }
    get onWillShutdown() { return this._onWillShutdown.event; }
    get onDidShutdown() { return this._onDidShutdown.event; }
    fireShutdown(reason = 2 /* ShutdownReason.QUIT */) {
        this.shutdownJoiners = [];
        this._onWillShutdown.fire({
            join: p => {
                this.shutdownJoiners.push(typeof p === 'function' ? p() : p);
            },
            joiners: () => [],
            force: () => { },
            token: CancellationToken.None,
            reason
        });
    }
    fireBeforeShutdown(event) { this._onBeforeShutdown.fire(event); }
    fireWillShutdown(event) { this._onWillShutdown.fire(event); }
    async shutdown() {
        this.fireShutdown();
    }
}
export class TestBeforeShutdownEvent {
    constructor() {
        this.reason = 1 /* ShutdownReason.CLOSE */;
    }
    veto(value) {
        this.value = value;
    }
    finalVeto(vetoFn) {
        this.value = vetoFn();
        this.finalValue = vetoFn;
    }
}
export class TestWillShutdownEvent {
    constructor() {
        this.value = [];
        this.joiners = () => [];
        this.reason = 1 /* ShutdownReason.CLOSE */;
        this.token = CancellationToken.None;
    }
    join(promise, joiner) {
        this.value.push(typeof promise === 'function' ? promise() : promise);
    }
    force() { }
}
export class TestTextResourceConfigurationService {
    constructor(configurationService = new TestConfigurationService()) {
        this.configurationService = configurationService;
    }
    onDidChangeConfiguration() {
        return { dispose() { } };
    }
    getValue(resource, arg2, arg3) {
        const position = EditorPosition.isIPosition(arg2) ? arg2 : null;
        const section = position ? (typeof arg3 === 'string' ? arg3 : undefined) : (typeof arg2 === 'string' ? arg2 : undefined);
        return this.configurationService.getValue(section, { resource });
    }
    inspect(resource, position, section) {
        return this.configurationService.inspect(section, { resource });
    }
    updateValue(resource, key, value, configurationTarget) {
        return this.configurationService.updateValue(key, value);
    }
}
export class RemoteFileSystemProvider {
    constructor(wrappedFsp, remoteAuthority) {
        this.wrappedFsp = wrappedFsp;
        this.remoteAuthority = remoteAuthority;
        this.capabilities = this.wrappedFsp.capabilities;
        this.onDidChangeCapabilities = this.wrappedFsp.onDidChangeCapabilities;
        this.onDidChangeFile = Event.map(this.wrappedFsp.onDidChangeFile, changes => changes.map(c => {
            return {
                type: c.type,
                resource: c.resource.with({ scheme: Schemas.vscodeRemote, authority: this.remoteAuthority }),
            };
        }));
    }
    watch(resource, opts) { return this.wrappedFsp.watch(this.toFileResource(resource), opts); }
    stat(resource) { return this.wrappedFsp.stat(this.toFileResource(resource)); }
    mkdir(resource) { return this.wrappedFsp.mkdir(this.toFileResource(resource)); }
    readdir(resource) { return this.wrappedFsp.readdir(this.toFileResource(resource)); }
    delete(resource, opts) { return this.wrappedFsp.delete(this.toFileResource(resource), opts); }
    rename(from, to, opts) { return this.wrappedFsp.rename(this.toFileResource(from), this.toFileResource(to), opts); }
    copy(from, to, opts) { return this.wrappedFsp.copy(this.toFileResource(from), this.toFileResource(to), opts); }
    readFile(resource) { return this.wrappedFsp.readFile(this.toFileResource(resource)); }
    writeFile(resource, content, opts) { return this.wrappedFsp.writeFile(this.toFileResource(resource), content, opts); }
    open(resource, opts) { return this.wrappedFsp.open(this.toFileResource(resource), opts); }
    close(fd) { return this.wrappedFsp.close(fd); }
    read(fd, pos, data, offset, length) { return this.wrappedFsp.read(fd, pos, data, offset, length); }
    write(fd, pos, data, offset, length) { return this.wrappedFsp.write(fd, pos, data, offset, length); }
    readFileStream(resource, opts, token) { return this.wrappedFsp.readFileStream(this.toFileResource(resource), opts, token); }
    toFileResource(resource) { return resource.with({ scheme: Schemas.file, authority: '' }); }
}
export class TestInMemoryFileSystemProvider extends InMemoryFileSystemProvider {
    get capabilities() {
        return 2 /* FileSystemProviderCapabilities.FileReadWrite */
            | 1024 /* FileSystemProviderCapabilities.PathCaseSensitive */
            | 16 /* FileSystemProviderCapabilities.FileReadStream */;
    }
    readFileStream(resource) {
        const BUFFER_SIZE = 64 * 1024;
        const stream = newWriteableStream(data => VSBuffer.concat(data.map(data => VSBuffer.wrap(data))).buffer);
        (async () => {
            try {
                const data = await this.readFile(resource);
                let offset = 0;
                while (offset < data.length) {
                    await timeout(0);
                    await stream.write(data.subarray(offset, offset + BUFFER_SIZE));
                    offset += BUFFER_SIZE;
                }
                await timeout(0);
                stream.end();
            }
            catch (error) {
                stream.end(error);
            }
        })();
        return stream;
    }
}
export const productService = { _serviceBrand: undefined, ...product };
export class TestHostService {
    constructor() {
        this._hasFocus = true;
        this._onDidChangeFocus = new Emitter();
        this.onDidChangeFocus = this._onDidChangeFocus.event;
        this._onDidChangeWindow = new Emitter();
        this.onDidChangeActiveWindow = this._onDidChangeWindow.event;
        this.onDidChangeFullScreen = Event.None;
        this.colorScheme = ColorScheme.DARK;
        this.onDidChangeColorScheme = Event.None;
    }
    get hasFocus() { return this._hasFocus; }
    async hadLastFocus() { return this._hasFocus; }
    setFocus(focus) {
        this._hasFocus = focus;
        this._onDidChangeFocus.fire(this._hasFocus);
    }
    async restart() { }
    async reload() { }
    async close() { }
    async withExpectedShutdown(expectedShutdownTask) {
        return await expectedShutdownTask();
    }
    async focus() { }
    async moveTop() { }
    async getCursorScreenPoint() { return undefined; }
    async openWindow(arg1, arg2) { }
    async toggleFullScreen() { }
    async getScreenshot() { return undefined; }
    async getNativeWindowHandle(_windowId) { return undefined; }
}
export class TestFilesConfigurationService extends FilesConfigurationService {
    testOnFilesConfigurationChange(configuration) {
        super.onFilesConfigurationChange(configuration, true);
    }
}
export class TestReadonlyTextFileEditorModel extends TextFileEditorModel {
    isReadonly() {
        return true;
    }
}
export class TestEditorInput extends EditorInput {
    constructor(resource, _typeId) {
        super();
        this.resource = resource;
        this._typeId = _typeId;
    }
    get typeId() {
        return this._typeId;
    }
    get editorId() {
        return this._typeId;
    }
    resolve() {
        return Promise.resolve(null);
    }
}
export function registerTestEditor(id, inputs, serializerInputId) {
    const disposables = new DisposableStore();
    class TestEditor extends EditorPane {
        constructor(group) {
            super(id, group, NullTelemetryService, new TestThemeService(), disposables.add(new TestStorageService()));
            this._scopedContextKeyService = new MockContextKeyService();
        }
        async setInput(input, options, context, token) {
            super.setInput(input, options, context, token);
            await input.resolve();
        }
        getId() { return id; }
        layout() { }
        createEditor() { }
        get scopedContextKeyService() {
            return this._scopedContextKeyService;
        }
    }
    disposables.add(Registry.as(Extensions.EditorPane).registerEditorPane(EditorPaneDescriptor.create(TestEditor, id, 'Test Editor Control'), inputs));
    if (serializerInputId) {
        class EditorsObserverTestEditorInputSerializer {
            canSerialize(editorInput) {
                return true;
            }
            serialize(editorInput) {
                const testEditorInput = editorInput;
                const testInput = {
                    resource: testEditorInput.resource.toString()
                };
                return JSON.stringify(testInput);
            }
            deserialize(instantiationService, serializedEditorInput) {
                const testInput = JSON.parse(serializedEditorInput);
                return new TestFileEditorInput(URI.parse(testInput.resource), serializerInputId);
            }
        }
        disposables.add(Registry.as(EditorExtensions.EditorFactory).registerEditorSerializer(serializerInputId, EditorsObserverTestEditorInputSerializer));
    }
    return disposables;
}
export function registerTestFileEditor() {
    const disposables = new DisposableStore();
    disposables.add(Registry.as(Extensions.EditorPane).registerEditorPane(EditorPaneDescriptor.create(TestTextFileEditor, TestTextFileEditor.ID, 'Text File Editor'), [new SyncDescriptor(FileEditorInput)]));
    return disposables;
}
export function registerTestResourceEditor() {
    const disposables = new DisposableStore();
    disposables.add(Registry.as(Extensions.EditorPane).registerEditorPane(EditorPaneDescriptor.create(TestTextResourceEditor, TestTextResourceEditor.ID, 'Text Editor'), [
        new SyncDescriptor(UntitledTextEditorInput),
        new SyncDescriptor(TextResourceEditorInput)
    ]));
    return disposables;
}
export function registerTestSideBySideEditor() {
    const disposables = new DisposableStore();
    disposables.add(Registry.as(Extensions.EditorPane).registerEditorPane(EditorPaneDescriptor.create(SideBySideEditor, SideBySideEditor.ID, 'Text Editor'), [
        new SyncDescriptor(SideBySideEditorInput)
    ]));
    return disposables;
}
export class TestFileEditorInput extends EditorInput {
    constructor(resource, _typeId) {
        super();
        this.resource = resource;
        this._typeId = _typeId;
        this.gotDisposed = false;
        this.gotSaved = false;
        this.gotSavedAs = false;
        this.gotReverted = false;
        this.dirty = false;
        this.fails = false;
        this.disableToUntyped = false;
        this._capabilities = 0 /* EditorInputCapabilities.None */;
        this.movedEditor = undefined;
        this.moveDisabledReason = undefined;
        this.preferredResource = this.resource;
    }
    get typeId() { return this._typeId; }
    get editorId() { return this._typeId; }
    get capabilities() { return this._capabilities; }
    set capabilities(capabilities) {
        if (this._capabilities !== capabilities) {
            this._capabilities = capabilities;
            this._onDidChangeCapabilities.fire();
        }
    }
    resolve() { return !this.fails ? Promise.resolve(null) : Promise.reject(new Error('fails')); }
    matches(other) {
        if (super.matches(other)) {
            return true;
        }
        if (other instanceof EditorInput) {
            return !!(other?.resource && this.resource.toString() === other.resource.toString() && other instanceof TestFileEditorInput && other.typeId === this.typeId);
        }
        return isEqual(this.resource, other.resource) && (this.editorId === other.options?.override || other.options?.override === undefined);
    }
    setPreferredResource(resource) { }
    async setEncoding(encoding) { }
    getEncoding() { return undefined; }
    setPreferredName(name) { }
    setPreferredDescription(description) { }
    setPreferredEncoding(encoding) { }
    setPreferredContents(contents) { }
    setLanguageId(languageId, source) { }
    setPreferredLanguageId(languageId) { }
    setForceOpenAsBinary() { }
    setFailToOpen() {
        this.fails = true;
    }
    async save(groupId, options) {
        this.gotSaved = true;
        this.dirty = false;
        return this;
    }
    async saveAs(groupId, options) {
        this.gotSavedAs = true;
        return this;
    }
    async revert(group, options) {
        this.gotReverted = true;
        this.gotSaved = false;
        this.gotSavedAs = false;
        this.dirty = false;
    }
    toUntyped() {
        if (this.disableToUntyped) {
            return undefined;
        }
        return { resource: this.resource };
    }
    setModified() { this.modified = true; }
    isModified() {
        return this.modified === undefined ? this.dirty : this.modified;
    }
    setDirty() { this.dirty = true; }
    isDirty() {
        return this.dirty;
    }
    isResolved() { return false; }
    dispose() {
        super.dispose();
        this.gotDisposed = true;
    }
    async rename() { return this.movedEditor; }
    setMoveDisabled(reason) {
        this.moveDisabledReason = reason;
    }
    canMove(sourceGroup, targetGroup) {
        if (typeof this.moveDisabledReason === 'string') {
            return this.moveDisabledReason;
        }
        return super.canMove(sourceGroup, targetGroup);
    }
}
export class TestSingletonFileEditorInput extends TestFileEditorInput {
    get capabilities() { return 8 /* EditorInputCapabilities.Singleton */; }
}
export class TestEditorPart extends MainEditorPart {
    constructor() {
        super(...arguments);
        this.mainPart = this;
        this.parts = [this];
        this.onDidCreateAuxiliaryEditorPart = Event.None;
    }
    testSaveState() {
        return super.saveState();
    }
    clearState() {
        const workspaceMemento = this.getMemento(1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        for (const key of Object.keys(workspaceMemento)) {
            delete workspaceMemento[key];
        }
        const profileMemento = this.getMemento(0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        for (const key of Object.keys(profileMemento)) {
            delete profileMemento[key];
        }
    }
    registerEditorPart(part) {
        return Disposable.None;
    }
    createAuxiliaryEditorPart() {
        throw new Error('Method not implemented.');
    }
    getScopedInstantiationService(part) {
        throw new Error('Method not implemented.');
    }
    getPart(group) { return this; }
    saveWorkingSet(name) { throw new Error('Method not implemented.'); }
    getWorkingSets() { throw new Error('Method not implemented.'); }
    applyWorkingSet(workingSet, options) { throw new Error('Method not implemented.'); }
    deleteWorkingSet(workingSet) { throw new Error('Method not implemented.'); }
    registerContextKeyProvider(provider) { throw new Error('Method not implemented.'); }
}
export class TestEditorParts extends EditorParts {
    createMainEditorPart() {
        this.testMainPart = this.instantiationService.createInstance(TestEditorPart, this);
        return this.testMainPart;
    }
}
export async function createEditorParts(instantiationService, disposables) {
    const parts = instantiationService.createInstance(TestEditorParts);
    const part = disposables.add(parts).testMainPart;
    part.create(document.createElement('div'));
    part.layout(1080, 800, 0, 0);
    await parts.whenReady;
    return parts;
}
export async function createEditorPart(instantiationService, disposables) {
    return (await createEditorParts(instantiationService, disposables)).testMainPart;
}
export class TestListService {
    constructor() {
        this.lastFocusedList = undefined;
    }
    register() {
        return Disposable.None;
    }
}
export class TestPathService {
    constructor(fallbackUserHome = URI.from({ scheme: Schemas.file, path: '/' }), defaultUriScheme = Schemas.file) {
        this.fallbackUserHome = fallbackUserHome;
        this.defaultUriScheme = defaultUriScheme;
    }
    hasValidBasename(resource, arg2, name) {
        if (typeof arg2 === 'string' || typeof arg2 === 'undefined') {
            return isValidBasename(arg2 ?? basename(resource));
        }
        return isValidBasename(name ?? basename(resource));
    }
    get path() { return Promise.resolve(isWindows ? win32 : posix); }
    userHome(options) {
        return options?.preferLocal ? this.fallbackUserHome : Promise.resolve(this.fallbackUserHome);
    }
    get resolvedUserHome() { return this.fallbackUserHome; }
    async fileURI(path) {
        return URI.file(path);
    }
}
export function getLastResolvedFileStat(model) {
    const candidate = model;
    return candidate?.lastResolvedFileStat;
}
export class TestWorkspacesService {
    constructor() {
        this.onDidChangeRecentlyOpened = Event.None;
    }
    async createUntitledWorkspace(folders, remoteAuthority) { throw new Error('Method not implemented.'); }
    async deleteUntitledWorkspace(workspace) { }
    async addRecentlyOpened(recents) { }
    async removeRecentlyOpened(workspaces) { }
    async clearRecentlyOpened() { }
    async getRecentlyOpened() { return { files: [], workspaces: [] }; }
    async getDirtyWorkspaces() { return []; }
    async enterWorkspace(path) { throw new Error('Method not implemented.'); }
    async getWorkspaceIdentifier(workspacePath) { throw new Error('Method not implemented.'); }
}
export class TestTerminalInstanceService {
    constructor() {
        this.onDidCreateInstance = Event.None;
        this.onDidRegisterBackend = Event.None;
    }
    convertProfileToShellLaunchConfig(shellLaunchConfigOrProfile, cwd) { throw new Error('Method not implemented.'); }
    preparePathForTerminalAsync(path, executable, title, shellType, remoteAuthority) { throw new Error('Method not implemented.'); }
    createInstance(options, target) { throw new Error('Method not implemented.'); }
    async getBackend(remoteAuthority) { throw new Error('Method not implemented.'); }
    didRegisterBackend(backend) { throw new Error('Method not implemented.'); }
    getRegisteredBackends() { throw new Error('Method not implemented.'); }
}
export class TestTerminalEditorService {
    constructor() {
        this.instances = [];
        this.onDidDisposeInstance = Event.None;
        this.onDidFocusInstance = Event.None;
        this.onDidChangeInstanceCapability = Event.None;
        this.onDidChangeActiveInstance = Event.None;
        this.onDidChangeInstances = Event.None;
    }
    openEditor(instance, editorOptions) { throw new Error('Method not implemented.'); }
    detachInstance(instance) { throw new Error('Method not implemented.'); }
    splitInstance(instanceToSplit, shellLaunchConfig) { throw new Error('Method not implemented.'); }
    revealActiveEditor(preserveFocus) { throw new Error('Method not implemented.'); }
    resolveResource(instance) { throw new Error('Method not implemented.'); }
    reviveInput(deserializedInput) { throw new Error('Method not implemented.'); }
    getInputFromResource(resource) { throw new Error('Method not implemented.'); }
    setActiveInstance(instance) { throw new Error('Method not implemented.'); }
    focusActiveInstance() { throw new Error('Method not implemented.'); }
    focusInstance(instance) { throw new Error('Method not implemented.'); }
    getInstanceFromResource(resource) { throw new Error('Method not implemented.'); }
    focusFindWidget() { throw new Error('Method not implemented.'); }
    hideFindWidget() { throw new Error('Method not implemented.'); }
    findNext() { throw new Error('Method not implemented.'); }
    findPrevious() { throw new Error('Method not implemented.'); }
}
export class TestTerminalGroupService {
    constructor() {
        this.instances = [];
        this.groups = [];
        this.activeGroupIndex = 0;
        this.lastAccessedMenu = 'inline-tab';
        this.onDidChangeActiveGroup = Event.None;
        this.onDidDisposeGroup = Event.None;
        this.onDidShow = Event.None;
        this.onDidChangeGroups = Event.None;
        this.onDidChangePanelOrientation = Event.None;
        this.onDidDisposeInstance = Event.None;
        this.onDidFocusInstance = Event.None;
        this.onDidChangeInstanceCapability = Event.None;
        this.onDidChangeActiveInstance = Event.None;
        this.onDidChangeInstances = Event.None;
    }
    createGroup(instance) { throw new Error('Method not implemented.'); }
    getGroupForInstance(instance) { throw new Error('Method not implemented.'); }
    moveGroup(source, target) { throw new Error('Method not implemented.'); }
    moveGroupToEnd(source) { throw new Error('Method not implemented.'); }
    moveInstance(source, target, side) { throw new Error('Method not implemented.'); }
    unsplitInstance(instance) { throw new Error('Method not implemented.'); }
    joinInstances(instances) { throw new Error('Method not implemented.'); }
    instanceIsSplit(instance) { throw new Error('Method not implemented.'); }
    getGroupLabels() { throw new Error('Method not implemented.'); }
    setActiveGroupByIndex(index) { throw new Error('Method not implemented.'); }
    setActiveGroupToNext() { throw new Error('Method not implemented.'); }
    setActiveGroupToPrevious() { throw new Error('Method not implemented.'); }
    setActiveInstanceByIndex(terminalIndex) { throw new Error('Method not implemented.'); }
    setContainer(container) { throw new Error('Method not implemented.'); }
    showPanel(focus) { throw new Error('Method not implemented.'); }
    hidePanel() { throw new Error('Method not implemented.'); }
    focusTabs() { throw new Error('Method not implemented.'); }
    focusHover() { throw new Error('Method not implemented.'); }
    setActiveInstance(instance) { throw new Error('Method not implemented.'); }
    focusActiveInstance() { throw new Error('Method not implemented.'); }
    focusInstance(instance) { throw new Error('Method not implemented.'); }
    getInstanceFromResource(resource) { throw new Error('Method not implemented.'); }
    focusFindWidget() { throw new Error('Method not implemented.'); }
    hideFindWidget() { throw new Error('Method not implemented.'); }
    findNext() { throw new Error('Method not implemented.'); }
    findPrevious() { throw new Error('Method not implemented.'); }
    updateVisibility() { throw new Error('Method not implemented.'); }
}
export class TestTerminalProfileService {
    constructor() {
        this.availableProfiles = [];
        this.contributedProfiles = [];
        this.profilesReady = Promise.resolve();
        this.onDidChangeAvailableProfiles = Event.None;
    }
    getPlatformKey() { throw new Error('Method not implemented.'); }
    refreshAvailableProfiles() { throw new Error('Method not implemented.'); }
    getDefaultProfileName() { throw new Error('Method not implemented.'); }
    getDefaultProfile() { throw new Error('Method not implemented.'); }
    getContributedDefaultProfile(shellLaunchConfig) { throw new Error('Method not implemented.'); }
    registerContributedProfile(args) { throw new Error('Method not implemented.'); }
    getContributedProfileProvider(extensionIdentifier, id) { throw new Error('Method not implemented.'); }
    registerTerminalProfileProvider(extensionIdentifier, id, profileProvider) { throw new Error('Method not implemented.'); }
}
export class TestTerminalProfileResolverService {
    constructor() {
        this.defaultProfileName = '';
    }
    resolveIcon(shellLaunchConfig) { }
    async resolveShellLaunchConfig(shellLaunchConfig, options) { }
    async getDefaultProfile(options) { return { path: '/default', profileName: 'Default', isDefault: true }; }
    async getDefaultShell(options) { return '/default'; }
    async getDefaultShellArgs(options) { return []; }
    getDefaultIcon() { return Codicon.terminal; }
    async getEnvironment() { return env; }
    getSafeConfigValue(key, os) { return undefined; }
    getSafeConfigValueFullKey(key) { return undefined; }
    createProfileFromShellAndShellArgs(shell, shellArgs) { throw new Error('Method not implemented.'); }
}
export class TestTerminalConfigurationService extends TerminalConfigurationService {
    get fontMetrics() { return this._fontMetrics; }
    setConfig(config) { this._config = config; }
}
export class TestQuickInputService {
    constructor() {
        this.onShow = Event.None;
        this.onHide = Event.None;
        this.currentQuickInput = undefined;
        this.quickAccess = undefined;
    }
    async pick(picks, options, token) {
        if (Array.isArray(picks)) {
            return { label: 'selectedPick', description: 'pick description', value: 'selectedPick' };
        }
        else {
            return undefined;
        }
    }
    async input(options, token) { return options ? 'resolved' + options.prompt : 'resolved'; }
    createQuickPick() { throw new Error('not implemented.'); }
    createInputBox() { throw new Error('not implemented.'); }
    createQuickWidget() { throw new Error('Method not implemented.'); }
    focus() { throw new Error('not implemented.'); }
    toggle() { throw new Error('not implemented.'); }
    navigate(next, quickNavigate) { throw new Error('not implemented.'); }
    accept() { throw new Error('not implemented.'); }
    back() { throw new Error('not implemented.'); }
    cancel() { throw new Error('not implemented.'); }
    setAlignment(alignment) { throw new Error('not implemented.'); }
    toggleHover() { throw new Error('not implemented.'); }
}
class TestLanguageDetectionService {
    isEnabledForLanguage(languageId) { return false; }
    async detectLanguage(resource, supportedLangs) { return undefined; }
}
export class TestRemoteAgentService {
    getConnection() { return null; }
    async getEnvironment() { return null; }
    async getRawEnvironment() { return null; }
    async getExtensionHostExitInfo(reconnectionToken) { return null; }
    async getDiagnosticInfo(options) { return undefined; }
    async updateTelemetryLevel(telemetryLevel) { }
    async logTelemetry(eventName, data) { }
    async flushTelemetry() { }
    async getRoundTripTime() { return undefined; }
    async endConnection() { }
}
export class TestRemoteExtensionsScannerService {
    async whenExtensionsReady() { return { failed: [] }; }
    scanExtensions() { throw new Error('Method not implemented.'); }
}
export class TestWorkbenchExtensionEnablementService {
    constructor() {
        this.onEnablementChanged = Event.None;
    }
    getEnablementState(extension) { return 11 /* EnablementState.EnabledGlobally */; }
    getEnablementStates(extensions, workspaceTypeOverrides) { return []; }
    getDependenciesEnablementStates(extension) { return []; }
    canChangeEnablement(extension) { return true; }
    canChangeWorkspaceEnablement(extension) { return true; }
    isEnabled(extension) { return true; }
    isEnabledEnablementState(enablementState) { return true; }
    isDisabledGlobally(extension) { return false; }
    async setEnablement(extensions, state) { return []; }
    async updateExtensionsEnablementsWhenWorkspaceTrustChanges() { }
}
export class TestWorkbenchExtensionManagementService {
    constructor() {
        this.onInstallExtension = Event.None;
        this.onDidInstallExtensions = Event.None;
        this.onUninstallExtension = Event.None;
        this.onDidUninstallExtension = Event.None;
        this.onDidUpdateExtensionMetadata = Event.None;
        this.onProfileAwareInstallExtension = Event.None;
        this.onProfileAwareDidInstallExtensions = Event.None;
        this.onProfileAwareUninstallExtension = Event.None;
        this.onProfileAwareDidUninstallExtension = Event.None;
        this.onDidProfileAwareUninstallExtensions = Event.None;
        this.onProfileAwareDidUpdateExtensionMetadata = Event.None;
        this.onDidChangeProfile = Event.None;
        this.onDidEnableExtensions = Event.None;
    }
    installVSIX(location, manifest, installOptions) {
        throw new Error('Method not implemented.');
    }
    installFromLocation(location) {
        throw new Error('Method not implemented.');
    }
    installGalleryExtensions(extensions) {
        throw new Error('Method not implemented.');
    }
    async updateFromGallery(gallery, extension, installOptions) { return extension; }
    zip(extension) {
        throw new Error('Method not implemented.');
    }
    getManifest(vsix) {
        throw new Error('Method not implemented.');
    }
    install(vsix, options) {
        throw new Error('Method not implemented.');
    }
    isAllowed() { return true; }
    async canInstall(extension) { return true; }
    installFromGallery(extension, options) {
        throw new Error('Method not implemented.');
    }
    uninstall(extension, options) {
        throw new Error('Method not implemented.');
    }
    uninstallExtensions(extensions) {
        throw new Error('Method not implemented.');
    }
    async getInstalled(type) { return []; }
    getExtensionsControlManifest() {
        throw new Error('Method not implemented.');
    }
    async updateMetadata(local, metadata) { return local; }
    registerParticipant(pariticipant) { }
    async getTargetPlatform() { return "undefined" /* TargetPlatform.UNDEFINED */; }
    async cleanUp() { }
    download() {
        throw new Error('Method not implemented.');
    }
    copyExtensions() { throw new Error('Not Supported'); }
    toggleAppliationScope() { throw new Error('Not Supported'); }
    installExtensionsFromProfile() { throw new Error('Not Supported'); }
    whenProfileChanged(from, to) { throw new Error('Not Supported'); }
    getInstalledWorkspaceExtensionLocations() { throw new Error('Method not implemented.'); }
    getInstalledWorkspaceExtensions() { throw new Error('Method not implemented.'); }
    installResourceExtension() { throw new Error('Method not implemented.'); }
    getExtensions() { throw new Error('Method not implemented.'); }
    resetPinnedStateForAllUserExtensions(pinned) { throw new Error('Method not implemented.'); }
    getInstallableServers(extension) { throw new Error('Method not implemented.'); }
    isPublisherTrusted(extension) { return false; }
    getTrustedPublishers() { return []; }
    trustPublishers() { }
    untrustPublishers() { }
    async requestPublisherTrust(extensions) { }
}
export class TestUserDataProfileService {
    constructor() {
        this.onDidChangeCurrentProfile = Event.None;
        this.currentProfile = toUserDataProfile('test', 'test', URI.file('tests').with({ scheme: 'vscode-tests' }), URI.file('tests').with({ scheme: 'vscode-tests' }));
    }
    async updateCurrentProfile() { }
}
export class TestWebExtensionsScannerService {
    constructor() {
        this.onDidChangeProfile = Event.None;
    }
    async scanSystemExtensions() { return []; }
    async scanUserExtensions() { return []; }
    async scanExtensionsUnderDevelopment() { return []; }
    async copyExtensions() {
        throw new Error('Method not implemented.');
    }
    scanExistingExtension(extensionLocation, extensionType) {
        throw new Error('Method not implemented.');
    }
    addExtension(location, metadata) {
        throw new Error('Method not implemented.');
    }
    addExtensionFromGallery(galleryExtension, metadata) {
        throw new Error('Method not implemented.');
    }
    removeExtension() {
        throw new Error('Method not implemented.');
    }
    updateMetadata(extension, metaData, profileLocation) {
        throw new Error('Method not implemented.');
    }
    scanExtensionManifest(extensionLocation) {
        throw new Error('Method not implemented.');
    }
}
export async function workbenchTeardown(instantiationService) {
    return instantiationService.invokeFunction(async (accessor) => {
        const workingCopyService = accessor.get(IWorkingCopyService);
        const editorGroupService = accessor.get(IEditorGroupsService);
        for (const workingCopy of workingCopyService.workingCopies) {
            await workingCopy.revert();
        }
        for (const group of editorGroupService.groups) {
            await group.closeAllEditors();
        }
        for (const group of editorGroupService.groups) {
            editorGroupService.removeGroup(group);
        }
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2JlbmNoVGVzdFNlcnZpY2VzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC90ZXN0L2Jyb3dzZXIvd29ya2JlbmNoVGVzdFNlcnZpY2VzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUN6RixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx5RUFBeUUsQ0FBQztBQUNuSCxPQUFPLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUNsRCxPQUFPLEVBQWtCLGlCQUFpQixFQUFrQixNQUFNLGlEQUFpRCxDQUFDO0FBQ3BILE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQzVGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUNqRSxPQUFPLEVBQXlRLGdCQUFnQixFQUEwRixnQkFBZ0IsSUFBSSxVQUFVLEVBQThMLE1BQU0sd0JBQXdCLENBQUM7QUFDcm5CLE9BQU8sRUFBbUYsMkJBQTJCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNwSyxPQUFPLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQy9ELE9BQU8sRUFBOEIseUJBQXlCLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUMvSCxPQUFPLEVBQUUscUJBQXFCLEVBQTRDLE1BQU0seURBQXlELENBQUM7QUFDMUksT0FBTyxFQUFFLHVCQUF1QixFQUFtRCxNQUFNLGdEQUFnRCxDQUFDO0FBQzFJLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHFF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