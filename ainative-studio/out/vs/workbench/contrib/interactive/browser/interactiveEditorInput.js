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
var InteractiveEditorInput_1;
import { Event } from '../../../../base/common/event.js';
import * as paths from '../../../../base/common/path.js';
import { isEqual, joinPath } from '../../../../base/common/resources.js';
import { PLAINTEXT_LANGUAGE_ID } from '../../../../editor/common/languages/modesRegistry.js';
import { ITextModelService } from '../../../../editor/common/services/resolverService.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IFileDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { EditorInput } from '../../../common/editor/editorInput.js';
import { IInteractiveDocumentService } from './interactiveDocumentService.js';
import { IInteractiveHistoryService } from './interactiveHistoryService.js';
import { NotebookSetting } from '../../notebook/common/notebookCommon.js';
import { NotebookEditorInput } from '../../notebook/common/notebookEditorInput.js';
import { INotebookService } from '../../notebook/common/notebookService.js';
let InteractiveEditorInput = class InteractiveEditorInput extends EditorInput {
    static { InteractiveEditorInput_1 = this; }
    static create(instantiationService, resource, inputResource, title, language) {
        return instantiationService.createInstance(InteractiveEditorInput_1, resource, inputResource, title, language);
    }
    static { this.windowNames = {}; }
    static setName(notebookUri, title) {
        if (title) {
            this.windowNames[notebookUri.path] = title;
        }
    }
    static { this.ID = 'workbench.input.interactive'; }
    get editorId() {
        return 'interactive';
    }
    get typeId() {
        return InteractiveEditorInput_1.ID;
    }
    get language() {
        return this._inputModelRef?.object.textEditorModel.getLanguageId() ?? this._initLanguage;
    }
    get notebookEditorInput() {
        return this._notebookEditorInput;
    }
    get editorInputs() {
        return [this._notebookEditorInput];
    }
    get resource() {
        return this._resource;
    }
    get inputResource() {
        return this._inputResource;
    }
    get primary() {
        return this._notebookEditorInput;
    }
    constructor(resource, inputResource, title, languageId, instantiationService, textModelService, interactiveDocumentService, historyService, _notebookService, _fileDialogService, configurationService) {
        const input = NotebookEditorInput.getOrCreate(instantiationService, resource, undefined, 'interactive', {});
        super();
        this._notebookService = _notebookService;
        this._fileDialogService = _fileDialogService;
        this.isScratchpad = configurationService.getValue(NotebookSetting.InteractiveWindowPromptToSave) !== true;
        this._notebookEditorInput = input;
        this._register(this._notebookEditorInput);
        this.name = title ?? InteractiveEditorInput_1.windowNames[resource.path] ?? paths.basename(resource.path, paths.extname(resource.path));
        this._initLanguage = languageId;
        this._resource = resource;
        this._inputResource = inputResource;
        this._inputResolver = null;
        this._editorModelReference = null;
        this._inputModelRef = null;
        this._textModelService = textModelService;
        this._interactiveDocumentService = interactiveDocumentService;
        this._historyService = historyService;
        this._registerListeners();
    }
    _registerListeners() {
        const oncePrimaryDisposed = Event.once(this.primary.onWillDispose);
        this._register(oncePrimaryDisposed(() => {
            if (!this.isDisposed()) {
                this.dispose();
            }
        }));
        // Re-emit some events from the primary side to the outside
        this._register(this.primary.onDidChangeDirty(() => this._onDidChangeDirty.fire()));
        this._register(this.primary.onDidChangeLabel(() => this._onDidChangeLabel.fire()));
        // Re-emit some events from both sides to the outside
        this._register(this.primary.onDidChangeCapabilities(() => this._onDidChangeCapabilities.fire()));
    }
    get capabilities() {
        const scratchPad = this.isScratchpad ? 512 /* EditorInputCapabilities.Scratchpad */ : 0;
        return 4 /* EditorInputCapabilities.Untitled */
            | 2 /* EditorInputCapabilities.Readonly */
            | scratchPad;
    }
    async _resolveEditorModel() {
        if (!this._editorModelReference) {
            this._editorModelReference = await this._notebookEditorInput.resolve();
        }
        return this._editorModelReference;
    }
    async resolve() {
        if (this._editorModelReference) {
            return this._editorModelReference;
        }
        if (this._inputResolver) {
            return this._inputResolver;
        }
        this._inputResolver = this._resolveEditorModel();
        return this._inputResolver;
    }
    async resolveInput(language) {
        if (this._inputModelRef) {
            return this._inputModelRef.object.textEditorModel;
        }
        const resolvedLanguage = language ?? this._initLanguage ?? PLAINTEXT_LANGUAGE_ID;
        this._interactiveDocumentService.willCreateInteractiveDocument(this.resource, this.inputResource, resolvedLanguage);
        this._inputModelRef = await this._textModelService.createModelReference(this.inputResource);
        return this._inputModelRef.object.textEditorModel;
    }
    async save(group, options) {
        if (this._editorModelReference) {
            if (this.hasCapability(4 /* EditorInputCapabilities.Untitled */)) {
                return this.saveAs(group, options);
            }
            else {
                await this._editorModelReference.save(options);
            }
            return this;
        }
        return undefined;
    }
    async saveAs(group, options) {
        if (!this._editorModelReference) {
            return undefined;
        }
        const provider = this._notebookService.getContributedNotebookType('interactive');
        if (!provider) {
            return undefined;
        }
        const filename = this.getName() + '.ipynb';
        const pathCandidate = joinPath(await this._fileDialogService.defaultFilePath(), filename);
        const target = await this._fileDialogService.pickFileToSave(pathCandidate, options?.availableFileSystems);
        if (!target) {
            return undefined; // save cancelled
        }
        const saved = await this._editorModelReference.saveAs(target);
        if (saved && 'resource' in saved && saved.resource) {
            this._notebookService.getNotebookTextModel(saved.resource)?.dispose();
        }
        return saved;
    }
    matches(otherInput) {
        if (super.matches(otherInput)) {
            return true;
        }
        if (otherInput instanceof InteractiveEditorInput_1) {
            return isEqual(this.resource, otherInput.resource) && isEqual(this.inputResource, otherInput.inputResource);
        }
        return false;
    }
    getName() {
        return this.name;
    }
    isDirty() {
        if (this.isScratchpad) {
            return false;
        }
        return this._editorModelReference?.isDirty() ?? false;
    }
    isModified() {
        return this._editorModelReference?.isModified() ?? false;
    }
    async revert(_group, options) {
        if (this._editorModelReference && this._editorModelReference.isDirty()) {
            await this._editorModelReference.revert(options);
        }
    }
    dispose() {
        // we support closing the interactive window without prompt, so the editor model should not be dirty
        this._editorModelReference?.revert({ soft: true });
        this._notebookEditorInput?.dispose();
        this._editorModelReference?.dispose();
        this._editorModelReference = null;
        this._interactiveDocumentService.willRemoveInteractiveDocument(this.resource, this.inputResource);
        this._inputModelRef?.dispose();
        this._inputModelRef = null;
        super.dispose();
    }
    get historyService() {
        return this._historyService;
    }
};
InteractiveEditorInput = InteractiveEditorInput_1 = __decorate([
    __param(4, IInstantiationService),
    __param(5, ITextModelService),
    __param(6, IInteractiveDocumentService),
    __param(7, IInteractiveHistoryService),
    __param(8, INotebookService),
    __param(9, IFileDialogService),
    __param(10, IConfigurationService)
], InteractiveEditorInput);
export { InteractiveEditorInput };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW50ZXJhY3RpdmVFZGl0b3JJbnB1dC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9pbnRlcmFjdGl2ZS9icm93c2VyL2ludGVyYWN0aXZlRWRpdG9ySW5wdXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUV6RCxPQUFPLEtBQUssS0FBSyxNQUFNLGlDQUFpQyxDQUFDO0FBQ3pELE9BQU8sRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFekUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDN0YsT0FBTyxFQUE0QixpQkFBaUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQ3BILE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBRW5HLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNwRSxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUM5RSxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUM1RSxPQUFPLEVBQWdDLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3hHLE9BQU8sRUFBaUMsbUJBQW1CLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUNsSCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUVyRSxJQUFNLHNCQUFz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