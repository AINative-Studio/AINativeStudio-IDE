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
var TextFileEditor_1;
import { localize } from '../../../../../nls.js';
import { mark } from '../../../../../base/common/performance.js';
import { assertIsDefined } from '../../../../../base/common/types.js';
import { IPathService } from '../../../../services/path/common/pathService.js';
import { toAction } from '../../../../../base/common/actions.js';
import { VIEWLET_ID, TEXT_FILE_EDITOR_ID, BINARY_TEXT_FILE_MODE } from '../../common/files.js';
import { ITextFileService } from '../../../../services/textfile/common/textfiles.js';
import { AbstractTextCodeEditor } from '../../../../browser/parts/editor/textCodeEditor.js';
import { isTextEditorViewState, DEFAULT_EDITOR_ASSOCIATION, createEditorOpenError, createTooLargeFileError } from '../../../../common/editor.js';
import { applyTextEditorOptions } from '../../../../common/editor/editorOptions.js';
import { BinaryEditorModel } from '../../../../common/editor/binaryEditorModel.js';
import { FileEditorInput } from './fileEditorInput.js';
import { FileOperationError, IFileService, ByteSize, TooLargeFileOperationError } from '../../../../../platform/files/common/files.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
import { ITextResourceConfigurationService } from '../../../../../editor/common/services/textResourceConfiguration.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IThemeService } from '../../../../../platform/theme/common/themeService.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { IEditorGroupsService } from '../../../../services/editor/common/editorGroupsService.js';
import { EditorActivation } from '../../../../../platform/editor/common/editor.js';
import { IUriIdentityService } from '../../../../../platform/uriIdentity/common/uriIdentity.js';
import { IExplorerService } from '../files.js';
import { IPaneCompositePartService } from '../../../../services/panecomposite/browser/panecomposite.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IPreferencesService } from '../../../../services/preferences/common/preferences.js';
import { IHostService } from '../../../../services/host/browser/host.js';
import { IFilesConfigurationService } from '../../../../services/filesConfiguration/common/filesConfigurationService.js';
/**
 * An implementation of editor for file system resources.
 */
let TextFileEditor = class TextFileEditor extends AbstractTextCodeEditor {
    static { TextFileEditor_1 = this; }
    static { this.ID = TEXT_FILE_EDITOR_ID; }
    constructor(group, telemetryService, fileService, paneCompositeService, instantiationService, contextService, storageService, textResourceConfigurationService, editorService, themeService, editorGroupService, textFileService, explorerService, uriIdentityService, pathService, configurationService, preferencesService, hostService, filesConfigurationService) {
        super(TextFileEditor_1.ID, group, telemetryService, instantiationService, storageService, textResourceConfigurationService, themeService, editorService, editorGroupService, fileService);
        this.paneCompositeService = paneCompositeService;
        this.contextService = contextService;
        this.textFileService = textFileService;
        this.explorerService = explorerService;
        this.uriIdentityService = uriIdentityService;
        this.pathService = pathService;
        this.configurationService = configurationService;
        this.preferencesService = preferencesService;
        this.hostService = hostService;
        this.filesConfigurationService = filesConfigurationService;
        // Clear view state for deleted files
        this._register(this.fileService.onDidFilesChange(e => this.onDidFilesChange(e)));
        // Move view state for moved files
        this._register(this.fileService.onDidRunOperation(e => this.onDidRunOperation(e)));
    }
    onDidFilesChange(e) {
        for (const resource of e.rawDeleted) {
            this.clearEditorViewState(resource);
        }
    }
    onDidRunOperation(e) {
        if (e.operation === 2 /* FileOperation.MOVE */ && e.target) {
            this.moveEditorViewState(e.resource, e.target.resource, this.uriIdentityService.extUri);
        }
    }
    getTitle() {
        if (this.input) {
            return this.input.getName();
        }
        return localize('textFileEditor', "Text File Editor");
    }
    get input() {
        return this._input;
    }
    async setInput(input, options, context, token) {
        mark('code/willSetInputToTextFileEditor');
        // Set input and resolve
        await super.setInput(input, options, context, token);
        try {
            const resolvedModel = await input.resolve(options);
            // Check for cancellation
            if (token.isCancellationRequested) {
                return;
            }
            // There is a special case where the text editor has to handle binary
            // file editor input: if a binary file has been resolved and cached
            // before, it maybe an actual instance of BinaryEditorModel. In this
            // case our text editor has to open this model using the binary editor.
            // We return early in this case.
            if (resolvedModel instanceof BinaryEditorModel) {
                return this.openAsBinary(input, options);
            }
            const textFileModel = resolvedModel;
            // Editor
            const control = assertIsDefined(this.editorControl);
            control.setModel(textFileModel.textEditorModel);
            // Restore view state (unless provided by options)
            if (!isTextEditorViewState(options?.viewState)) {
                const editorViewState = this.loadEditorViewState(input, context);
                if (editorViewState) {
                    if (options?.selection) {
                        editorViewState.cursorState = []; // prevent duplicate selections via options
                    }
                    control.restoreViewState(editorViewState);
                }
            }
            // Apply options to editor if any
            if (options) {
                applyTextEditorOptions(options, control, 1 /* ScrollType.Immediate */);
            }
            // Since the resolved model provides information about being readonly
            // or not, we apply it here to the editor even though the editor input
            // was already asked for being readonly or not. The rationale is that
            // a resolved model might have more specific information about being
            // readonly or not that the input did not have.
            control.updateOptions(this.getReadonlyConfiguration(textFileModel.isReadonly()));
            if (control.handleInitialized) {
                control.handleInitialized();
            }
        }
        catch (error) {
            await this.handleSetInputError(error, input, options);
        }
        mark('code/didSetInputToTextFileEditor');
    }
    async handleSetInputError(error, input, options) {
        // Handle case where content appears to be binary
        if (error.textFileOperationResult === 0 /* TextFileOperationResult.FILE_IS_BINARY */) {
            return this.openAsBinary(input, options);
        }
        // Handle case where we were asked to open a folder
        if (error.fileOperationResult === 0 /* FileOperationResult.FILE_IS_DIRECTORY */) {
            const actions = [];
            actions.push(toAction({
                id: 'workbench.files.action.openFolder', label: localize('openFolder', "Open Folder"), run: async () => {
                    return this.hostService.openWindow([{ folderUri: input.resource }], { forceNewWindow: true });
                }
            }));
            if (this.contextService.isInsideWorkspace(input.preferredResource)) {
                actions.push(toAction({
                    id: 'workbench.files.action.reveal', label: localize('reveal', "Reveal Folder"), run: async () => {
                        await this.paneCompositeService.openPaneComposite(VIEWLET_ID, 0 /* ViewContainerLocation.Sidebar */, true);
                        return this.explorerService.select(input.preferredResource, true);
                    }
                }));
            }
            throw createEditorOpenError(localize('fileIsDirectory', "The file is not displayed in the text editor because it is a directory."), actions, { forceMessage: true });
        }
        // Handle case where a file is too large to open without confirmation
        if (error.fileOperationResult === 7 /* FileOperationResult.FILE_TOO_LARGE */) {
            let message;
            if (error instanceof TooLargeFileOperationError) {
                message = localize('fileTooLargeForHeapErrorWithSize', "The file is not displayed in the text editor because it is very large ({0}).", ByteSize.formatSize(error.size));
            }
            else {
                message = localize('fileTooLargeForHeapErrorWithoutSize', "The file is not displayed in the text editor because it is very large.");
            }
            throw createTooLargeFileError(this.group, input, options, message, this.preferencesService);
        }
        // Offer to create a file from the error if we have a file not found and the name is valid and not readonly
        if (error.fileOperationResult === 1 /* FileOperationResult.FILE_NOT_FOUND */ &&
            !this.filesConfigurationService.isReadonly(input.preferredResource) &&
            await this.pathService.hasValidBasename(input.preferredResource)) {
            const fileNotFoundError = createEditorOpenError(new FileOperationError(localize('unavailableResourceErrorEditorText', "The editor could not be opened because the file was not found."), 1 /* FileOperationResult.FILE_NOT_FOUND */), [
                toAction({
                    id: 'workbench.files.action.createMissingFile', label: localize('createFile', "Create File"), run: async () => {
                        await this.textFileService.create([{ resource: input.preferredResource }]);
                        return this.editorService.openEditor({
                            resource: input.preferredResource,
                            options: {
                                pinned: true // new file gets pinned by default
                            }
                        });
                    }
                })
            ], {
                // Support the flow of directly pressing `Enter` on the dialog to
                // create the file on the go. This is nice when for example following
                // a link to a file that does not exist to scaffold it quickly.
                allowDialog: true
            });
            throw fileNotFoundError;
        }
        // Otherwise make sure the error bubbles up
        throw error;
    }
    openAsBinary(input, options) {
        const defaultBinaryEditor = this.configurationService.getValue('workbench.editor.defaultBinaryEditor');
        const editorOptions = {
            ...options,
            // Make sure to not steal away the currently active group
            // because we are triggering another openEditor() call
            // and do not control the initial intent that resulted
            // in us now opening as binary.
            activation: EditorActivation.PRESERVE
        };
        // Check configuration and determine whether we open the binary
        // file input in a different editor or going through the same
        // editor.
        // Going through the same editor is debt, and a better solution
        // would be to introduce a real editor for the binary case
        // and avoid enforcing binary or text on the file editor input.
        if (defaultBinaryEditor && defaultBinaryEditor !== '' && defaultBinaryEditor !== DEFAULT_EDITOR_ASSOCIATION.id) {
            this.doOpenAsBinaryInDifferentEditor(this.group, defaultBinaryEditor, input, editorOptions);
        }
        else {
            this.doOpenAsBinaryInSameEditor(this.group, defaultBinaryEditor, input, editorOptions);
        }
    }
    doOpenAsBinaryInDifferentEditor(group, editorId, editor, editorOptions) {
        this.editorService.replaceEditors([{
                editor,
                replacement: { resource: editor.resource, options: { ...editorOptions, override: editorId } }
            }], group);
    }
    doOpenAsBinaryInSameEditor(group, editorId, editor, editorOptions) {
        // Open binary as text
        if (editorId === DEFAULT_EDITOR_ASSOCIATION.id) {
            editor.setForceOpenAsText();
            editor.setPreferredLanguageId(BINARY_TEXT_FILE_MODE); // https://github.com/microsoft/vscode/issues/131076
            editorOptions = { ...editorOptions, forceReload: true }; // Same pane and same input, must force reload to clear cached state
        }
        // Open as binary
        else {
            editor.setForceOpenAsBinary();
        }
        group.openEditor(editor, editorOptions);
    }
    clearInput() {
        super.clearInput();
        // Clear Model
        this.editorControl?.setModel(null);
    }
    createEditorControl(parent, initialOptions) {
        mark('code/willCreateTextFileEditorControl');
        super.createEditorControl(parent, initialOptions);
        mark('code/didCreateTextFileEditorControl');
    }
    tracksEditorViewState(input) {
        return input instanceof FileEditorInput;
    }
    tracksDisposedEditorViewState() {
        return true; // track view state even for disposed editors
    }
};
TextFileEditor = TextFileEditor_1 = __decorate([
    __param(1, ITelemetryService),
    __param(2, IFileService),
    __param(3, IPaneCompositePartService),
    __param(4, IInstantiationService),
    __param(5, IWorkspaceContextService),
    __param(6, IStorageService),
    __param(7, ITextResourceConfigurationService),
    __param(8, IEditorService),
    __param(9, IThemeService),
    __param(10, IEditorGroupsService),
    __param(11, ITextFileService),
    __param(12, IExplorerService),
    __param(13, IUriIdentityService),
    __param(14, IPathService),
    __param(15, IConfigurationService),
    __param(16, IPreferencesService),
    __param(17, IHostService),
    __param(18, IFilesConfigurationService)
], TextFileEditor);
export { TextFileEditor };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dEZpbGVFZGl0b3IuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9maWxlcy9icm93c2VyL2VkaXRvcnMvdGV4dEZpbGVFZGl0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUNqRCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDakUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUMvRSxPQUFPLEVBQVcsUUFBUSxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDMUUsT0FBTyxFQUFFLFVBQVUsRUFBRSxtQkFBbUIsRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQy9GLE9BQU8sRUFBRSxnQkFBZ0IsRUFBbUQsTUFBTSxtREFBbUQsQ0FBQztBQUN0SSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUM1RixPQUFPLEVBQXNCLHFCQUFxQixFQUFFLDBCQUEwQixFQUFFLHFCQUFxQixFQUEyQix1QkFBdUIsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBRTlMLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ25GLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQztBQUN2RCxPQUFPLEVBQUUsa0JBQWtCLEVBQXlDLFlBQVksRUFBcUMsUUFBUSxFQUFFLDBCQUEwQixFQUFFLE1BQU0sK0NB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