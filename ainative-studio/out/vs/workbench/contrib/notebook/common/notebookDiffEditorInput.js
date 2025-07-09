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
var NotebookDiffEditorInput_1;
import { isResourceDiffEditorInput } from '../../../common/editor.js';
import { EditorModel } from '../../../common/editor/editorModel.js';
import { DiffEditorInput } from '../../../common/editor/diffEditorInput.js';
import { NotebookEditorInput } from './notebookEditorInput.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
class NotebookDiffEditorModel extends EditorModel {
    constructor(original, modified) {
        super();
        this.original = original;
        this.modified = modified;
    }
}
let NotebookDiffEditorInput = class NotebookDiffEditorInput extends DiffEditorInput {
    static { NotebookDiffEditorInput_1 = this; }
    static create(instantiationService, resource, name, description, originalResource, viewType) {
        const original = NotebookEditorInput.getOrCreate(instantiationService, originalResource, undefined, viewType);
        const modified = NotebookEditorInput.getOrCreate(instantiationService, resource, undefined, viewType);
        return instantiationService.createInstance(NotebookDiffEditorInput_1, name, description, original, modified, viewType);
    }
    static { this.ID = 'workbench.input.diffNotebookInput'; }
    get resource() {
        return this.modified.resource;
    }
    get editorId() {
        return this.viewType;
    }
    constructor(name, description, original, modified, viewType, editorService) {
        super(name, description, original, modified, undefined, editorService);
        this.original = original;
        this.modified = modified;
        this.viewType = viewType;
        this._modifiedTextModel = null;
        this._originalTextModel = null;
        this._cachedModel = undefined;
    }
    get typeId() {
        return NotebookDiffEditorInput_1.ID;
    }
    async resolve() {
        const [originalEditorModel, modifiedEditorModel] = await Promise.all([
            this.original.resolve(),
            this.modified.resolve(),
        ]);
        this._cachedModel?.dispose();
        // TODO@rebornix check how we restore the editor in text diff editor
        if (!modifiedEditorModel) {
            throw new Error(`Fail to resolve modified editor model for resource ${this.modified.resource} with notebookType ${this.viewType}`);
        }
        if (!originalEditorModel) {
            throw new Error(`Fail to resolve original editor model for resource ${this.original.resource} with notebookType ${this.viewType}`);
        }
        this._originalTextModel = originalEditorModel;
        this._modifiedTextModel = modifiedEditorModel;
        this._cachedModel = new NotebookDiffEditorModel(this._originalTextModel, this._modifiedTextModel);
        return this._cachedModel;
    }
    toUntyped() {
        const original = { resource: this.original.resource };
        const modified = { resource: this.resource };
        return {
            original,
            modified,
            primary: modified,
            secondary: original,
            options: {
                override: this.viewType
            }
        };
    }
    matches(otherInput) {
        if (this === otherInput) {
            return true;
        }
        if (otherInput instanceof NotebookDiffEditorInput_1) {
            return this.modified.matches(otherInput.modified)
                && this.original.matches(otherInput.original)
                && this.viewType === otherInput.viewType;
        }
        if (isResourceDiffEditorInput(otherInput)) {
            return this.modified.matches(otherInput.modified)
                && this.original.matches(otherInput.original)
                && this.editorId !== undefined
                && (this.editorId === otherInput.options?.override || otherInput.options?.override === undefined);
        }
        return false;
    }
    dispose() {
        super.dispose();
        this._cachedModel?.dispose();
        this._cachedModel = undefined;
        this.original.dispose();
        this.modified.dispose();
        this._originalTextModel = null;
        this._modifiedTextModel = null;
    }
};
NotebookDiffEditorInput = NotebookDiffEditorInput_1 = __decorate([
    __param(5, IEditorService)
], NotebookDiffEditorInput);
export { NotebookDiffEditorInput };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tEaWZmRWRpdG9ySW5wdXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svY29tbW9uL25vdGVib29rRGlmZkVkaXRvcklucHV0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQTRELHlCQUF5QixFQUF1QixNQUFNLDJCQUEyQixDQUFDO0FBRXJKLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUlwRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDNUUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDL0QsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBRWxGLE1BQU0sdUJBQXdCLFNBQVEsV0FBVztJQUNoRCxZQUNVLFFBQXNDLEVBQ3RDLFFBQXNDO1FBRS9DLEtBQUssRUFBRSxDQUFDO1FBSEMsYUFBUSxHQUFSLFFBQVEsQ0FBOEI7UUFDdEMsYUFBUSxHQUFSLFFBQVEsQ0FBOEI7SUFHaEQsQ0FBQztDQUNEO0FBRU0sSUFBTSx1QkFBdUIsR0FBN0IsTUFBTSx1QkFBd0IsU0FBUSxlQUFlOztJQUMzRCxNQUFNLENBQUMsTUFBTSxDQUFDLG9CQUEyQyxFQUFFLFFBQWEsRUFBRSxJQUF3QixFQUFFLFdBQStCLEVBQUUsZ0JBQXFCLEVBQUUsUUFBZ0I7UUFDM0ssTUFBTSxRQUFRLEdBQUcsbUJBQW1CLENBQUMsV0FBVyxDQUFDLG9CQUFvQixFQUFFLGdCQUFnQixFQUFFLFNBQVMsRUFBRSxRQUFRLENBQUMsQ0FBQztRQUM5RyxNQUFNLFFBQVEsR0FBRyxtQkFBbUIsQ0FBQyxXQUFXLENBQUMsb0JBQW9CLEVB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