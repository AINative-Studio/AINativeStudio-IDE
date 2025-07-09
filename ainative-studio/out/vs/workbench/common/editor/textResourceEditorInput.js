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
var TextResourceEditorInput_1;
import { DEFAULT_EDITOR_ASSOCIATION, isResourceEditorInput } from '../editor.js';
import { AbstractResourceEditorInput } from './resourceEditorInput.js';
import { ITextFileService } from '../../services/textfile/common/textfiles.js';
import { IEditorService } from '../../services/editor/common/editorService.js';
import { IFileService } from '../../../platform/files/common/files.js';
import { ILabelService } from '../../../platform/label/common/label.js';
import { Schemas } from '../../../base/common/network.js';
import { isEqual } from '../../../base/common/resources.js';
import { ITextModelService } from '../../../editor/common/services/resolverService.js';
import { TextResourceEditorModel } from './textResourceEditorModel.js';
import { createTextBufferFactory } from '../../../editor/common/model/textModel.js';
import { IFilesConfigurationService } from '../../services/filesConfiguration/common/filesConfigurationService.js';
import { ITextResourceConfigurationService } from '../../../editor/common/services/textResourceConfiguration.js';
import { ICustomEditorLabelService } from '../../services/editor/common/customEditorLabelService.js';
/**
 * The base class for all editor inputs that open in text editors.
 */
let AbstractTextResourceEditorInput = class AbstractTextResourceEditorInput extends AbstractResourceEditorInput {
    constructor(resource, preferredResource, editorService, textFileService, labelService, fileService, filesConfigurationService, textResourceConfigurationService, customEditorLabelService) {
        super(resource, preferredResource, labelService, fileService, filesConfigurationService, textResourceConfigurationService, customEditorLabelService);
        this.editorService = editorService;
        this.textFileService = textFileService;
    }
    save(group, options) {
        // If this is neither an `untitled` resource, nor a resource
        // we can handle with the file service, we can only "Save As..."
        if (this.resource.scheme !== Schemas.untitled && !this.fileService.hasProvider(this.resource)) {
            return this.saveAs(group, options);
        }
        // Normal save
        return this.doSave(options, false, group);
    }
    saveAs(group, options) {
        return this.doSave(options, true, group);
    }
    async doSave(options, saveAs, group) {
        // Save / Save As
        let target;
        if (saveAs) {
            target = await this.textFileService.saveAs(this.resource, undefined, { ...options, suggestedTarget: this.preferredResource });
        }
        else {
            target = await this.textFileService.save(this.resource, options);
        }
        if (!target) {
            return undefined; // save cancelled
        }
        return { resource: target };
    }
    async revert(group, options) {
        await this.textFileService.revert(this.resource, options);
    }
};
AbstractTextResourceEditorInput = __decorate([
    __param(2, IEditorService),
    __param(3, ITextFileService),
    __param(4, ILabelService),
    __param(5, IFileService),
    __param(6, IFilesConfigurationService),
    __param(7, ITextResourceConfigurationService),
    __param(8, ICustomEditorLabelService)
], AbstractTextResourceEditorInput);
export { AbstractTextResourceEditorInput };
/**
 * A read-only text editor input whos contents are made of the provided resource that points to an existing
 * code editor model.
 */
let TextResourceEditorInput = class TextResourceEditorInput extends AbstractTextResourceEditorInput {
    static { TextResourceEditorInput_1 = this; }
    static { this.ID = 'workbench.editors.resourceEditorInput'; }
    get typeId() {
        return TextResourceEditorInput_1.ID;
    }
    get editorId() {
        return DEFAULT_EDITOR_ASSOCIATION.id;
    }
    constructor(resource, name, description, preferredLanguageId, preferredContents, textModelService, textFileService, editorService, fileService, labelService, filesConfigurationService, textResourceConfigurationService, customEditorLabelService) {
        super(resource, undefined, editorService, textFileService, labelService, fileService, filesConfigurationService, textResourceConfigurationService, customEditorLabelService);
        this.name = name;
        this.description = description;
        this.preferredLanguageId = preferredLanguageId;
        this.preferredContents = preferredContents;
        this.textModelService = textModelService;
        this.cachedModel = undefined;
        this.modelReference = undefined;
    }
    getName() {
        return this.name || super.getName();
    }
    setName(name) {
        if (this.name !== name) {
            this.name = name;
            this._onDidChangeLabel.fire();
        }
    }
    getDescription() {
        return this.description;
    }
    setDescription(description) {
        if (this.description !== description) {
            this.description = description;
            this._onDidChangeLabel.fire();
        }
    }
    setLanguageId(languageId, source) {
        this.setPreferredLanguageId(languageId);
        this.cachedModel?.setLanguageId(languageId, source);
    }
    setPreferredLanguageId(languageId) {
        this.preferredLanguageId = languageId;
    }
    setPreferredContents(contents) {
        this.preferredContents = contents;
    }
    async resolve() {
        // Unset preferred contents and language after resolving
        // once to prevent these properties to stick. We still
        // want the user to change the language in the editor
        // and want to show updated contents (if any) in future
        // `resolve` calls.
        const preferredContents = this.preferredContents;
        const preferredLanguageId = this.preferredLanguageId;
        this.preferredContents = undefined;
        this.preferredLanguageId = undefined;
        if (!this.modelReference) {
            this.modelReference = this.textModelService.createModelReference(this.resource);
        }
        const ref = await this.modelReference;
        // Ensure the resolved model is of expected type
        const model = ref.object;
        if (!(model instanceof TextResourceEditorModel)) {
            ref.dispose();
            this.modelReference = undefined;
            throw new Error(`Unexpected model for TextResourceEditorInput: ${this.resource}`);
        }
        this.cachedModel = model;
        // Set contents and language if preferred
        if (typeof preferredContents === 'string' || typeof preferredLanguageId === 'string') {
            model.updateTextEditorModel(typeof preferredContents === 'string' ? createTextBufferFactory(preferredContents) : undefined, preferredLanguageId);
        }
        return model;
    }
    matches(otherInput) {
        if (this === otherInput) {
            return true;
        }
        if (otherInput instanceof TextResourceEditorInput_1) {
            return isEqual(otherInput.resource, this.resource);
        }
        if (isResourceEditorInput(otherInput)) {
            return super.matches(otherInput);
        }
        return false;
    }
    dispose() {
        if (this.modelReference) {
            this.modelReference.then(ref => ref.dispose());
            this.modelReference = undefined;
        }
        this.cachedModel = undefined;
        super.dispose();
    }
};
TextResourceEditorInput = TextResourceEditorInput_1 = __decorate([
    __param(5, ITextModelService),
    __param(6, ITextFileService),
    __param(7, IEditorService),
    __param(8, IFileService),
    __param(9, ILabelService),
    __param(10, IFilesConfigurationService),
    __param(11, ITextResourceConfigurationService),
    __param(12, ICustomEditorLabelService)
], TextResourceEditorInput);
export { TextResourceEditorInput };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dFJlc291cmNlRWRpdG9ySW5wdXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbW1vbi9lZGl0b3IvdGV4dFJlc291cmNlRWRpdG9ySW5wdXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSwwQkFBMEIsRUFBbUMscUJBQXFCLEVBQXVCLE1BQU0sY0FBYyxDQUFDO0FBRXZJLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBRXZFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBMEMsTUFBTSw2Q0FBNkMsQ0FBQztBQUN2SCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDL0UsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUN4RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDMUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzVELE9BQU8sRUFBb0IsaUJBQWlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUN6RyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUV2RSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUNwRixPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSx1RUFBdUUsQ0FBQztBQUNuSCxPQUFPLEVBQUUsaUNBQWlDLEVBQUUsTUFBTSw4REFBOEQsQ0FBQztBQUNqSCxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUVyRzs7R0FFRztBQUNJLElBQWUs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