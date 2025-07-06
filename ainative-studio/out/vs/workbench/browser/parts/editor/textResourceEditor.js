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
var TextResourceEditor_1;
import { assertIsDefined } from '../../../../base/common/types.js';
import { isTextEditorViewState } from '../../../common/editor.js';
import { applyTextEditorOptions } from '../../../common/editor/editorOptions.js';
import { TextResourceEditorInput } from '../../../common/editor/textResourceEditorInput.js';
import { BaseTextEditorModel } from '../../../common/editor/textEditorModel.js';
import { UntitledTextEditorInput } from '../../../services/untitled/common/untitledTextEditorInput.js';
import { AbstractTextCodeEditor } from './textCodeEditor.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITextResourceConfigurationService } from '../../../../editor/common/services/textResourceConfiguration.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IEditorGroupsService } from '../../../services/editor/common/editorGroupsService.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { PLAINTEXT_LANGUAGE_ID } from '../../../../editor/common/languages/modesRegistry.js';
import { IFileService } from '../../../../platform/files/common/files.js';
/**
 * An editor implementation that is capable of showing the contents of resource inputs. Uses
 * the TextEditor widget to show the contents.
 */
let AbstractTextResourceEditor = class AbstractTextResourceEditor extends AbstractTextCodeEditor {
    constructor(id, group, telemetryService, instantiationService, storageService, textResourceConfigurationService, themeService, editorGroupService, editorService, fileService) {
        super(id, group, telemetryService, instantiationService, storageService, textResourceConfigurationService, themeService, editorService, editorGroupService, fileService);
    }
    async setInput(input, options, context, token) {
        // Set input and resolve
        await super.setInput(input, options, context, token);
        const resolvedModel = await input.resolve();
        // Check for cancellation
        if (token.isCancellationRequested) {
            return undefined;
        }
        // Assert Model instance
        if (!(resolvedModel instanceof BaseTextEditorModel)) {
            throw new Error('Unable to open file as text');
        }
        // Set Editor Model
        const control = assertIsDefined(this.editorControl);
        const textEditorModel = resolvedModel.textEditorModel;
        control.setModel(textEditorModel);
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
        control.updateOptions(this.getReadonlyConfiguration(resolvedModel.isReadonly()));
    }
    /**
     * Reveals the last line of this editor if it has a model set.
     */
    revealLastLine() {
        const control = this.editorControl;
        if (!control) {
            return;
        }
        const model = control.getModel();
        if (model) {
            const lastLine = model.getLineCount();
            control.revealPosition({ lineNumber: lastLine, column: model.getLineMaxColumn(lastLine) }, 0 /* ScrollType.Smooth */);
        }
    }
    clearInput() {
        super.clearInput();
        // Clear Model
        this.editorControl?.setModel(null);
    }
    tracksEditorViewState(input) {
        // editor view state persistence is only enabled for untitled and resource inputs
        return input instanceof UntitledTextEditorInput || input instanceof TextResourceEditorInput;
    }
};
AbstractTextResourceEditor = __decorate([
    __param(2, ITelemetryService),
    __param(3, IInstantiationService),
    __param(4, IStorageService),
    __param(5, ITextResourceConfigurationService),
    __param(6, IThemeService),
    __param(7, IEditorGroupsService),
    __param(8, IEditorService),
    __param(9, IFileService)
], AbstractTextResourceEditor);
export { AbstractTextResourceEditor };
let TextResourceEditor = class TextResourceEditor extends AbstractTextResourceEditor {
    static { TextResourceEditor_1 = this; }
    static { this.ID = 'workbench.editors.textResourceEditor'; }
    constructor(group, telemetryService, instantiationService, storageService, textResourceConfigurationService, themeService, editorService, editorGroupService, modelService, languageService, fileService) {
        super(TextResourceEditor_1.ID, group, telemetryService, instantiationService, storageService, textResourceConfigurationService, themeService, editorGroupService, editorService, fileService);
        this.modelService = modelService;
        this.languageService = languageService;
    }
    createEditorControl(parent, configuration) {
        super.createEditorControl(parent, configuration);
        // Install a listener for paste to update this editors
        // language if the paste includes a specific language
        const control = this.editorControl;
        if (control) {
            this._register(control.onDidPaste(e => this.onDidEditorPaste(e, control)));
        }
    }
    onDidEditorPaste(e, codeEditor) {
        if (this.input instanceof UntitledTextEditorInput && this.input.hasLanguageSetExplicitly) {
            return; // do not override language if it was set explicitly
        }
        if (e.range.startLineNumber !== 1 || e.range.startColumn !== 1) {
            return; // document had existing content before the pasted text, don't override.
        }
        if (codeEditor.getOption(96 /* EditorOption.readOnly */)) {
            return; // not for readonly editors
        }
        const textModel = codeEditor.getModel();
        if (!textModel) {
            return; // require a live model
        }
        const pasteIsWholeContents = textModel.getLineCount() === e.range.endLineNumber && textModel.getLineMaxColumn(e.range.endLineNumber) === e.range.endColumn;
        if (!pasteIsWholeContents) {
            return; // document had existing content after the pasted text, don't override.
        }
        const currentLanguageId = textModel.getLanguageId();
        if (currentLanguageId !== PLAINTEXT_LANGUAGE_ID) {
            return; // require current languageId to be unspecific
        }
        let candidateLanguage = undefined;
        // A languageId is provided via the paste event so text was copied using
        // VSCode. As such we trust this languageId and use it if specific
        if (e.languageId) {
            candidateLanguage = { id: e.languageId, source: 'event' };
        }
        // A languageId was not provided, so the data comes from outside VSCode
        // We can still try to guess a good languageId from the first line if
        // the paste changed the first line
        else {
            const guess = this.languageService.guessLanguageIdByFilepathOrFirstLine(textModel.uri, textModel.getLineContent(1).substr(0, 1000 /* ModelConstants.FIRST_LINE_DETECTION_LENGTH_LIMIT */)) ?? undefined;
            if (guess) {
                candidateLanguage = { id: guess, source: 'guess' };
            }
        }
        // Finally apply languageId to model if specified
        if (candidateLanguage && candidateLanguage.id !== PLAINTEXT_LANGUAGE_ID) {
            if (this.input instanceof UntitledTextEditorInput && candidateLanguage.source === 'event') {
                // High confidence, set language id at TextEditorModel level to block future auto-detection
                this.input.setLanguageId(candidateLanguage.id);
            }
            else {
                textModel.setLanguage(this.languageService.createById(candidateLanguage.id));
            }
            const opts = this.modelService.getCreationOptions(textModel.getLanguageId(), textModel.uri, textModel.isForSimpleWidget);
            textModel.detectIndentation(opts.insertSpaces, opts.tabSize);
        }
    }
};
TextResourceEditor = TextResourceEditor_1 = __decorate([
    __param(1, ITelemetryService),
    __param(2, IInstantiationService),
    __param(3, IStorageService),
    __param(4, ITextResourceConfigurationService),
    __param(5, IThemeService),
    __param(6, IEditorService),
    __param(7, IEditorGroupsService),
    __param(8, IModelService),
    __param(9, ILanguageService),
    __param(10, IFileService)
], TextResourceEditor);
export { TextResourceEditor };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dFJlc291cmNlRWRpdG9yLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2Jyb3dzZXIvcGFydHMvZWRpdG9yL3RleHRSZXNvdXJjZUVkaXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBRW5FLE9BQU8sRUFBc0IscUJBQXFCLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUV0RixPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNqRixPQUFPLEVBQW1DLHVCQUF1QixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDN0gsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDaEYsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sOERBQThELENBQUM7QUFDdkcsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFDN0QsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDdkYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ2pGLE9BQU8sRUFBRSxpQ0FBaUMsRUFBRSxNQUFNLGlFQUFpRSxDQUFDO0FBQ3BILE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUVsRixPQUFPLEVBQWdCLG9CQUFvQixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFFNUcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw2Q0FB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