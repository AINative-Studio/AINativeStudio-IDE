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
var TextDiffEditor_1;
import { localize } from '../../../../nls.js';
import { deepClone } from '../../../../base/common/objects.js';
import { isObject, assertIsDefined } from '../../../../base/common/types.js';
import { AbstractTextEditor } from './textEditor.js';
import { TEXT_DIFF_EDITOR_ID, EditorExtensions, isEditorInput, isTextEditorViewState, createTooLargeFileError } from '../../../common/editor.js';
import { applyTextEditorOptions } from '../../../common/editor/editorOptions.js';
import { DiffEditorInput } from '../../../common/editor/diffEditorInput.js';
import { TextDiffEditorModel } from '../../../common/editor/textDiffEditorModel.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITextResourceConfigurationService } from '../../../../editor/common/services/textResourceConfiguration.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { URI } from '../../../../base/common/uri.js';
import { IEditorGroupsService } from '../../../services/editor/common/editorGroupsService.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { EditorActivation } from '../../../../platform/editor/common/editor.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { isEqual } from '../../../../base/common/resources.js';
import { multibyteAwareBtoa } from '../../../../base/browser/dom.js';
import { ByteSize, IFileService, TooLargeFileOperationError } from '../../../../platform/files/common/files.js';
import { IPreferencesService } from '../../../services/preferences/common/preferences.js';
import { StopWatch } from '../../../../base/common/stopwatch.js';
import { DiffEditorWidget } from '../../../../editor/browser/widget/diffEditor/diffEditorWidget.js';
/**
 * The text editor that leverages the diff text editor for the editing experience.
 */
let TextDiffEditor = class TextDiffEditor extends AbstractTextEditor {
    static { TextDiffEditor_1 = this; }
    static { this.ID = TEXT_DIFF_EDITOR_ID; }
    get scopedContextKeyService() {
        if (!this.diffEditorControl) {
            return undefined;
        }
        const originalEditor = this.diffEditorControl.getOriginalEditor();
        const modifiedEditor = this.diffEditorControl.getModifiedEditor();
        return (originalEditor.hasTextFocus() ? originalEditor : modifiedEditor).invokeWithinContext(accessor => accessor.get(IContextKeyService));
    }
    constructor(group, telemetryService, instantiationService, storageService, configurationService, editorService, themeService, editorGroupService, fileService, preferencesService) {
        super(TextDiffEditor_1.ID, group, telemetryService, instantiationService, storageService, configurationService, themeService, editorService, editorGroupService, fileService);
        this.preferencesService = preferencesService;
        this.diffEditorControl = undefined;
        this.inputLifecycleStopWatch = undefined;
        this._previousViewModel = null;
    }
    getTitle() {
        if (this.input) {
            return this.input.getName();
        }
        return localize('textDiffEditor', "Text Diff Editor");
    }
    createEditorControl(parent, configuration) {
        this.diffEditorControl = this._register(this.instantiationService.createInstance(DiffEditorWidget, parent, configuration, {}));
    }
    updateEditorControlOptions(options) {
        this.diffEditorControl?.updateOptions(options);
    }
    getMainControl() {
        return this.diffEditorControl?.getModifiedEditor();
    }
    async setInput(input, options, context, token) {
        if (this._previousViewModel) {
            this._previousViewModel.dispose();
            this._previousViewModel = null;
        }
        // Cleanup previous things associated with the input
        this.inputLifecycleStopWatch = undefined;
        // Set input and resolve
        await super.setInput(input, options, context, token);
        try {
            const resolvedModel = await input.resolve();
            // Check for cancellation
            if (token.isCancellationRequested) {
                return undefined;
            }
            // Fallback to open as binary if not text
            if (!(resolvedModel instanceof TextDiffEditorModel)) {
                this.openAsBinary(input, options);
                return undefined;
            }
            // Set Editor Model
            const control = assertIsDefined(this.diffEditorControl);
            const resolvedDiffEditorModel = resolvedModel;
            const vm = resolvedDiffEditorModel.textDiffEditorModel ? control.createViewModel(resolvedDiffEditorModel.textDiffEditorModel) : null;
            this._previousViewModel = vm;
            await vm?.waitForDiff();
            control.setModel(vm);
            // Restore view state (unless provided by options)
            let hasPreviousViewState = false;
            if (!isTextEditorViewState(options?.viewState)) {
                hasPreviousViewState = this.restoreTextDiffEditorViewState(input, options, context, control);
            }
            // Apply options to editor if any
            let optionsGotApplied = false;
            if (options) {
                optionsGotApplied = applyTextEditorOptions(options, control, 1 /* ScrollType.Immediate */);
            }
            if (!optionsGotApplied && !hasPreviousViewState) {
                control.revealFirstDiff();
            }
            // Since the resolved model provides information about being readonly
            // or not, we apply it here to the editor even though the editor input
            // was already asked for being readonly or not. The rationale is that
            // a resolved model might have more specific information about being
            // readonly or not that the input did not have.
            control.updateOptions({
                ...this.getReadonlyConfiguration(resolvedDiffEditorModel.modifiedModel?.isReadonly()),
                originalEditable: !resolvedDiffEditorModel.originalModel?.isReadonly()
            });
            control.handleInitialized();
            // Start to measure input lifecycle
            this.inputLifecycleStopWatch = new StopWatch(false);
        }
        catch (error) {
            await this.handleSetInputError(error, input, options);
        }
    }
    async handleSetInputError(error, input, options) {
        // Handle case where content appears to be binary
        if (this.isFileBinaryError(error)) {
            return this.openAsBinary(input, options);
        }
        // Handle case where a file is too large to open without confirmation
        if (error.fileOperationResult === 7 /* FileOperationResult.FILE_TOO_LARGE */) {
            let message;
            if (error instanceof TooLargeFileOperationError) {
                message = localize('fileTooLargeForHeapErrorWithSize', "At least one file is not displayed in the text compare editor because it is very large ({0}).", ByteSize.formatSize(error.size));
            }
            else {
                message = localize('fileTooLargeForHeapErrorWithoutSize', "At least one file is not displayed in the text compare editor because it is very large.");
            }
            throw createTooLargeFileError(this.group, input, options, message, this.preferencesService);
        }
        // Otherwise make sure the error bubbles up
        throw error;
    }
    restoreTextDiffEditorViewState(editor, options, context, control) {
        const editorViewState = this.loadEditorViewState(editor, context);
        if (editorViewState) {
            if (options?.selection && editorViewState.modified) {
                editorViewState.modified.cursorState = []; // prevent duplicate selections via options
            }
            control.restoreViewState(editorViewState);
            if (options?.revealIfVisible) {
                control.revealFirstDiff();
            }
            return true;
        }
        return false;
    }
    openAsBinary(input, options) {
        const original = input.original;
        const modified = input.modified;
        const binaryDiffInput = this.instantiationService.createInstance(DiffEditorInput, input.getName(), input.getDescription(), original, modified, true);
        // Forward binary flag to input if supported
        const fileEditorFactory = Registry.as(EditorExtensions.EditorFactory).getFileEditorFactory();
        if (fileEditorFactory.isFileEditor(original)) {
            original.setForceOpenAsBinary();
        }
        if (fileEditorFactory.isFileEditor(modified)) {
            modified.setForceOpenAsBinary();
        }
        // Replace this editor with the binary one
        this.group.replaceEditors([{
                editor: input,
                replacement: binaryDiffInput,
                options: {
                    ...options,
                    // Make sure to not steal away the currently active group
                    // because we are triggering another openEditor() call
                    // and do not control the initial intent that resulted
                    // in us now opening as binary.
                    activation: EditorActivation.PRESERVE,
                    pinned: this.group.isPinned(input),
                    sticky: this.group.isSticky(input)
                }
            }]);
    }
    setOptions(options) {
        super.setOptions(options);
        if (options) {
            applyTextEditorOptions(options, assertIsDefined(this.diffEditorControl), 0 /* ScrollType.Smooth */);
        }
    }
    shouldHandleConfigurationChangeEvent(e, resource) {
        if (super.shouldHandleConfigurationChangeEvent(e, resource)) {
            return true;
        }
        return e.affectsConfiguration(resource, 'diffEditor') || e.affectsConfiguration(resource, 'accessibility.verbosity.diffEditor');
    }
    computeConfiguration(configuration) {
        const editorConfiguration = super.computeConfiguration(configuration);
        // Handle diff editor specially by merging in diffEditor configuration
        if (isObject(configuration.diffEditor)) {
            const diffEditorConfiguration = deepClone(configuration.diffEditor);
            // User settings defines `diffEditor.codeLens`, but here we rename that to `diffEditor.diffCodeLens` to avoid collisions with `editor.codeLens`.
            diffEditorConfiguration.diffCodeLens = diffEditorConfiguration.codeLens;
            delete diffEditorConfiguration.codeLens;
            // User settings defines `diffEditor.wordWrap`, but here we rename that to `diffEditor.diffWordWrap` to avoid collisions with `editor.wordWrap`.
            diffEditorConfiguration.diffWordWrap = diffEditorConfiguration.wordWrap;
            delete diffEditorConfiguration.wordWrap;
            Object.assign(editorConfiguration, diffEditorConfiguration);
        }
        const verbose = configuration.accessibility?.verbosity?.diffEditor ?? false;
        editorConfiguration.accessibilityVerbose = verbose;
        return editorConfiguration;
    }
    getConfigurationOverrides(configuration) {
        return {
            ...super.getConfigurationOverrides(configuration),
            ...this.getReadonlyConfiguration(this.input?.isReadonly()),
            originalEditable: this.input instanceof DiffEditorInput && !this.input.original.isReadonly(),
            lineDecorationsWidth: '2ch'
        };
    }
    updateReadonly(input) {
        if (input instanceof DiffEditorInput) {
            this.diffEditorControl?.updateOptions({
                ...this.getReadonlyConfiguration(input.isReadonly()),
                originalEditable: !input.original.isReadonly(),
            });
        }
        else {
            super.updateReadonly(input);
        }
    }
    isFileBinaryError(error) {
        if (Array.isArray(error)) {
            const errors = error;
            return errors.some(error => this.isFileBinaryError(error));
        }
        return error.textFileOperationResult === 0 /* TextFileOperationResult.FILE_IS_BINARY */;
    }
    clearInput() {
        if (this._previousViewModel) {
            this._previousViewModel.dispose();
            this._previousViewModel = null;
        }
        super.clearInput();
        // Log input lifecycle telemetry
        const inputLifecycleElapsed = this.inputLifecycleStopWatch?.elapsed();
        this.inputLifecycleStopWatch = undefined;
        if (typeof inputLifecycleElapsed === 'number') {
            this.logInputLifecycleTelemetry(inputLifecycleElapsed, this.getControl()?.getModel()?.modified?.getLanguageId());
        }
        // Clear Model
        this.diffEditorControl?.setModel(null);
    }
    logInputLifecycleTelemetry(duration, languageId) {
        let collapseUnchangedRegions = false;
        if (this.diffEditorControl instanceof DiffEditorWidget) {
            collapseUnchangedRegions = this.diffEditorControl.collapseUnchangedRegions;
        }
        this.telemetryService.publicLog2('diffEditor.editorVisibleTime', {
            editorVisibleTimeMs: duration,
            languageId: languageId ?? '',
            collapseUnchangedRegions,
        });
    }
    getControl() {
        return this.diffEditorControl;
    }
    focus() {
        super.focus();
        this.diffEditorControl?.focus();
    }
    hasFocus() {
        return this.diffEditorControl?.hasTextFocus() || super.hasFocus();
    }
    setEditorVisible(visible) {
        super.setEditorVisible(visible);
        if (visible) {
            this.diffEditorControl?.onVisible();
        }
        else {
            this.diffEditorControl?.onHide();
        }
    }
    layout(dimension) {
        this.diffEditorControl?.layout(dimension);
    }
    setBoundarySashes(sashes) {
        this.diffEditorControl?.setBoundarySashes(sashes);
    }
    tracksEditorViewState(input) {
        return input instanceof DiffEditorInput;
    }
    computeEditorViewState(resource) {
        if (!this.diffEditorControl) {
            return undefined;
        }
        const model = this.diffEditorControl.getModel();
        if (!model || !model.modified || !model.original) {
            return undefined; // view state always needs a model
        }
        const modelUri = this.toEditorViewStateResource(model);
        if (!modelUri) {
            return undefined; // model URI is needed to make sure we save the view state correctly
        }
        if (!isEqual(modelUri, resource)) {
            return undefined; // prevent saving view state for a model that is not the expected one
        }
        return this.diffEditorControl.saveViewState() ?? undefined;
    }
    toEditorViewStateResource(modelOrInput) {
        let original;
        let modified;
        if (modelOrInput instanceof DiffEditorInput) {
            original = modelOrInput.original.resource;
            modified = modelOrInput.modified.resource;
        }
        else if (!isEditorInput(modelOrInput)) {
            original = modelOrInput.original.uri;
            modified = modelOrInput.modified.uri;
        }
        if (!original || !modified) {
            return undefined;
        }
        // create a URI that is the Base64 concatenation of original + modified resource
        return URI.from({ scheme: 'diff', path: `${multibyteAwareBtoa(original.toString())}${multibyteAwareBtoa(modified.toString())}` });
    }
};
TextDiffEditor = TextDiffEditor_1 = __decorate([
    __param(1, ITelemetryService),
    __param(2, IInstantiationService),
    __param(3, IStorageService),
    __param(4, ITextResourceConfigurationService),
    __param(5, IEditorService),
    __param(6, IThemeService),
    __param(7, IEditorGroupsService),
    __param(8, IFileService),
    __param(9, IPreferencesService)
], TextDiffEditor);
export { TextDiffEditor };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dERpZmZFZGl0b3IuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2Jyb3dzZXIvcGFydHMvZWRpdG9yL3RleHREaWZmRWRpdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxRQUFRLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFHN0UsT0FBTyxFQUFFLGtCQUFrQixFQUF3QixNQUFNLGlCQUFpQixDQUFDO0FBQzNFLE9BQU8sRUFBRSxtQkFBbUIsRUFBMEIsZ0JBQWdCLEVBQTJDLGFBQWEsRUFBRSxxQkFBcUIsRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBRWxOLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ2pGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUM1RSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUNwRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUN2RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDakYsT0FBTyxFQUF5QyxpQ0FBaUMsRUFBRSxNQUFNLGlFQUFpRSxDQUFDO0FBQzNKLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUdsRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RB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