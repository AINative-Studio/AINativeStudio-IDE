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
var UntitledTextEditorInput_1;
import { DEFAULT_EDITOR_ASSOCIATION, findViewStateForEditor, isUntitledResourceEditorInput } from '../../../common/editor.js';
import { AbstractTextResourceEditorInput } from '../../../common/editor/textResourceEditorInput.js';
import { ITextFileService } from '../../textfile/common/textfiles.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { IEditorService } from '../../editor/common/editorService.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { isEqual, toLocalResource } from '../../../../base/common/resources.js';
import { IWorkbenchEnvironmentService } from '../../environment/common/environmentService.js';
import { IPathService } from '../../path/common/pathService.js';
import { IFilesConfigurationService } from '../../filesConfiguration/common/filesConfigurationService.js';
import { ITextModelService } from '../../../../editor/common/services/resolverService.js';
import { DisposableStore, dispose } from '../../../../base/common/lifecycle.js';
import { ITextResourceConfigurationService } from '../../../../editor/common/services/textResourceConfiguration.js';
import { ICustomEditorLabelService } from '../../editor/common/customEditorLabelService.js';
/**
 * An editor input to be used for untitled text buffers.
 */
let UntitledTextEditorInput = class UntitledTextEditorInput extends AbstractTextResourceEditorInput {
    static { UntitledTextEditorInput_1 = this; }
    static { this.ID = 'workbench.editors.untitledEditorInput'; }
    get typeId() {
        return UntitledTextEditorInput_1.ID;
    }
    get editorId() {
        return DEFAULT_EDITOR_ASSOCIATION.id;
    }
    constructor(model, textFileService, labelService, editorService, fileService, environmentService, pathService, filesConfigurationService, textModelService, textResourceConfigurationService, customEditorLabelService) {
        super(model.resource, undefined, editorService, textFileService, labelService, fileService, filesConfigurationService, textResourceConfigurationService, customEditorLabelService);
        this.model = model;
        this.environmentService = environmentService;
        this.pathService = pathService;
        this.textModelService = textModelService;
        this.modelResolve = undefined;
        this.modelDisposables = this._register(new DisposableStore());
        this.cachedUntitledTextEditorModelReference = undefined;
        this.registerModelListeners(model);
        this._register(this.textFileService.untitled.onDidCreate(model => this.onDidCreateUntitledModel(model)));
    }
    registerModelListeners(model) {
        this.modelDisposables.clear();
        // re-emit some events from the model
        this.modelDisposables.add(model.onDidChangeDirty(() => this._onDidChangeDirty.fire()));
        this.modelDisposables.add(model.onDidChangeName(() => this._onDidChangeLabel.fire()));
        // a reverted untitled text editor model renders this input disposed
        this.modelDisposables.add(model.onDidRevert(() => this.dispose()));
    }
    onDidCreateUntitledModel(model) {
        if (isEqual(model.resource, this.model.resource) && model !== this.model) {
            // Ensure that we keep our model up to date with
            // the actual model from the service so that we
            // never get out of sync with the truth.
            this.model = model;
            this.registerModelListeners(model);
        }
    }
    getName() {
        return this.model.name;
    }
    getDescription(verbosity = 1 /* Verbosity.MEDIUM */) {
        // Without associated path: only use if name and description differ
        if (!this.model.hasAssociatedFilePath) {
            const descriptionCandidate = this.resource.path;
            if (descriptionCandidate !== this.getName()) {
                return descriptionCandidate;
            }
            return undefined;
        }
        // With associated path: delegate to parent
        return super.getDescription(verbosity);
    }
    getTitle(verbosity) {
        // Without associated path: check if name and description differ to decide
        // if description should appear besides the name to distinguish better
        if (!this.model.hasAssociatedFilePath) {
            const name = this.getName();
            const description = this.getDescription();
            if (description && description !== name) {
                return `${name} • ${description}`;
            }
            return name;
        }
        // With associated path: delegate to parent
        return super.getTitle(verbosity);
    }
    isDirty() {
        return this.model.isDirty();
    }
    getEncoding() {
        return this.model.getEncoding();
    }
    setEncoding(encoding, mode /* ignored, we only have Encode */) {
        return this.model.setEncoding(encoding);
    }
    get hasLanguageSetExplicitly() { return this.model.hasLanguageSetExplicitly; }
    get hasAssociatedFilePath() { return this.model.hasAssociatedFilePath; }
    setLanguageId(languageId, source) {
        this.model.setLanguageId(languageId, source);
    }
    getLanguageId() {
        return this.model.getLanguageId();
    }
    async resolve() {
        if (!this.modelResolve) {
            this.modelResolve = (async () => {
                // Acquire a model reference
                this.cachedUntitledTextEditorModelReference = await this.textModelService.createModelReference(this.resource);
            })();
        }
        await this.modelResolve;
        // It is possible that this input was disposed before the model
        // finished resolving. As such, we need to make sure to dispose
        // the model reference to not leak it.
        if (this.isDisposed()) {
            this.disposeModelReference();
        }
        return this.model;
    }
    toUntyped(options) {
        const untypedInput = {
            resource: this.model.hasAssociatedFilePath ? toLocalResource(this.model.resource, this.environmentService.remoteAuthority, this.pathService.defaultUriScheme) : this.resource,
            forceUntitled: true,
            options: {
                override: this.editorId
            }
        };
        if (typeof options?.preserveViewState === 'number') {
            untypedInput.encoding = this.getEncoding();
            untypedInput.languageId = this.getLanguageId();
            untypedInput.contents = this.model.isModified() ? this.model.textEditorModel?.getValue() : undefined;
            untypedInput.options.viewState = findViewStateForEditor(this, options.preserveViewState, this.editorService);
            if (typeof untypedInput.contents === 'string' && !this.model.hasAssociatedFilePath && !options.preserveResource) {
                // Given how generic untitled resources in the system are, we
                // need to be careful not to set our resource into the untyped
                // editor if we want to transport contents too, because of
                // issue https://github.com/microsoft/vscode/issues/140898
                // The workaround is to simply remove the resource association
                // if we have contents and no associated resource.
                // In that case we can ensure that a new untitled resource is
                // being created and the contents can be restored properly.
                untypedInput.resource = undefined;
            }
        }
        return untypedInput;
    }
    matches(otherInput) {
        if (this === otherInput) {
            return true;
        }
        if (otherInput instanceof UntitledTextEditorInput_1) {
            return isEqual(otherInput.resource, this.resource);
        }
        if (isUntitledResourceEditorInput(otherInput)) {
            return super.matches(otherInput);
        }
        return false;
    }
    dispose() {
        // Model
        this.modelResolve = undefined;
        // Model reference
        this.disposeModelReference();
        super.dispose();
    }
    disposeModelReference() {
        dispose(this.cachedUntitledTextEditorModelReference);
        this.cachedUntitledTextEditorModelReference = undefined;
    }
};
UntitledTextEditorInput = UntitledTextEditorInput_1 = __decorate([
    __param(1, ITextFileService),
    __param(2, ILabelService),
    __param(3, IEditorService),
    __param(4, IFileService),
    __param(5, IWorkbenchEnvironmentService),
    __param(6, IPathService),
    __param(7, IFilesConfigurationService),
    __param(8, ITextModelService),
    __param(9, ITextResourceConfigurationService),
    __param(10, ICustomEditorLabelService)
], UntitledTextEditorInput);
export { UntitledTextEditorInput };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidW50aXRsZWRUZXh0RWRpdG9ySW5wdXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3VudGl0bGVkL2NvbW1vbi91bnRpdGxlZFRleHRFZGl0b3JJbnB1dC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLDBCQUEwQixFQUFFLHNCQUFzQixFQUFFLDZCQUE2QixFQUFvRSxNQUFNLDJCQUEyQixDQUFDO0FBRWhNLE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBRXBHLE9BQU8sRUFBb0QsZ0JBQWdCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUN4SCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDM0UsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2hGLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQzlGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUVoRSxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSw4REFBOEQsQ0FBQztBQUMxRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUMxRixPQUFPLEVBQUUsZUFBZSxFQUFFLE9BQU8sRUFBYyxNQUFNLHNDQUFzQyxDQUFDO0FBQzVGLE9BQU8sRUFBRSxpQ0FBaUMsRUFBRSxNQUFNLGlFQUFpRSxDQUFDO0FBQ3BILE9BQU8sRUFBRSx5QkFBeUIsRUFB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