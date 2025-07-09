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
var MergeEditorInput_1;
import { assertFn } from '../../../../base/common/assert.js';
import { autorun } from '../../../../base/common/observable.js';
import { isEqual } from '../../../../base/common/resources.js';
import { isDefined } from '../../../../base/common/types.js';
import { ITextResourceConfigurationService } from '../../../../editor/common/services/textResourceConfiguration.js';
import { localize } from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { DEFAULT_EDITOR_ASSOCIATION, isResourceMergeEditorInput } from '../../../common/editor.js';
import { ICustomEditorLabelService } from '../../../services/editor/common/customEditorLabelService.js';
import { AbstractTextResourceEditorInput } from '../../../common/editor/textResourceEditorInput.js';
import { TempFileMergeEditorModeFactory, WorkspaceMergeEditorModeFactory } from './mergeEditorInputModel.js';
import { MergeEditorTelemetry } from './telemetry.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IFilesConfigurationService } from '../../../services/filesConfiguration/common/filesConfigurationService.js';
import { ITextFileService } from '../../../services/textfile/common/textfiles.js';
export class MergeEditorInputData {
    constructor(uri, title, detail, description) {
        this.uri = uri;
        this.title = title;
        this.detail = detail;
        this.description = description;
    }
}
let MergeEditorInput = class MergeEditorInput extends AbstractTextResourceEditorInput {
    static { MergeEditorInput_1 = this; }
    static { this.ID = 'mergeEditor.Input'; }
    get useWorkingCopy() {
        return this.configurationService.getValue('mergeEditor.useWorkingCopy') ?? false;
    }
    constructor(base, input1, input2, result, _instaService, editorService, textFileService, labelService, fileService, configurationService, filesConfigurationService, textResourceConfigurationService, customEditorLabelService) {
        super(result, undefined, editorService, textFileService, labelService, fileService, filesConfigurationService, textResourceConfigurationService, customEditorLabelService);
        this.base = base;
        this.input1 = input1;
        this.input2 = input2;
        this.result = result;
        this._instaService = _instaService;
        this.configurationService = configurationService;
        this.closeHandler = {
            showConfirm: () => this._inputModel?.shouldConfirmClose() ?? false,
            confirm: async (editors) => {
                assertFn(() => editors.every(e => e.editor instanceof MergeEditorInput_1));
                const inputModels = editors.map(e => e.editor._inputModel).filter(isDefined);
                return await this._inputModel.confirmClose(inputModels);
            },
        };
        this.mergeEditorModeFactory = this._instaService.createInstance(this.useWorkingCopy
            ? TempFileMergeEditorModeFactory
            : WorkspaceMergeEditorModeFactory, this._instaService.createInstance(MergeEditorTelemetry));
    }
    dispose() {
        super.dispose();
    }
    get typeId() {
        return MergeEditorInput_1.ID;
    }
    get editorId() {
        return DEFAULT_EDITOR_ASSOCIATION.id;
    }
    get capabilities() {
        let capabilities = super.capabilities | 256 /* EditorInputCapabilities.MultipleEditors */;
        if (this.useWorkingCopy) {
            capabilities |= 4 /* EditorInputCapabilities.Untitled */;
        }
        return capabilities;
    }
    getName() {
        return localize('name', "Merging: {0}", super.getName());
    }
    async resolve() {
        if (!this._inputModel) {
            const inputModel = this._register(await this.mergeEditorModeFactory.createInputModel({
                base: this.base,
                input1: this.input1,
                input2: this.input2,
                result: this.result,
            }));
            this._inputModel = inputModel;
            this._register(autorun(reader => {
                /** @description fire dirty event */
                inputModel.isDirty.read(reader);
                this._onDidChangeDirty.fire();
            }));
            await this._inputModel.model.onInitialized;
        }
        return this._inputModel;
    }
    async accept() {
        await this._inputModel?.accept();
    }
    async save(group, options) {
        await this._inputModel?.save(options);
        return undefined;
    }
    toUntyped() {
        return {
            input1: { resource: this.input1.uri, label: this.input1.title, description: this.input1.description, detail: this.input1.detail },
            input2: { resource: this.input2.uri, label: this.input2.title, description: this.input2.description, detail: this.input2.detail },
            base: { resource: this.base },
            result: { resource: this.result },
            options: {
                override: this.typeId
            }
        };
    }
    matches(otherInput) {
        if (this === otherInput) {
            return true;
        }
        if (otherInput instanceof MergeEditorInput_1) {
            return isEqual(this.base, otherInput.base)
                && isEqual(this.input1.uri, otherInput.input1.uri)
                && isEqual(this.input2.uri, otherInput.input2.uri)
                && isEqual(this.result, otherInput.result);
        }
        if (isResourceMergeEditorInput(otherInput)) {
            return (this.editorId === otherInput.options?.override || otherInput.options?.override === undefined)
                && isEqual(this.base, otherInput.base.resource)
                && isEqual(this.input1.uri, otherInput.input1.resource)
                && isEqual(this.input2.uri, otherInput.input2.resource)
                && isEqual(this.result, otherInput.result.resource);
        }
        return false;
    }
    async revert(group, options) {
        return this._inputModel?.revert(options);
    }
    // ---- FileEditorInput
    isDirty() {
        return this._inputModel?.isDirty.get() ?? false;
    }
    setLanguageId(languageId, source) {
        this._inputModel?.model.setLanguageId(languageId, source);
    }
};
MergeEditorInput = MergeEditorInput_1 = __decorate([
    __param(4, IInstantiationService),
    __param(5, IEditorService),
    __param(6, ITextFileService),
    __param(7, ILabelService),
    __param(8, IFileService),
    __param(9, IConfigurationService),
    __param(10, IFilesConfigurationService),
    __param(11, ITextResourceConfigurationService),
    __param(12, ICustomEditorLabelService)
], MergeEditorInput);
export { MergeEditorInput };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVyZ2VFZGl0b3JJbnB1dC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9tZXJnZUVkaXRvci9icm93c2VyL21lcmdlRWRpdG9ySW5wdXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM3RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDaEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUU3RCxPQUFPLEVBQUUsaUNBQWlDLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQztBQUNwSCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUMzRSxPQUFPLEVBQUUsMEJBQTBCLEVBQXNFLDBCQUEwQixFQUF1QixNQUFNLDJCQUEyQixDQUFDO0FBRTVMLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLDZEQUE2RCxDQUFDO0FBQ3hHLE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ3BHLE9BQU8sRUFBMEIsOEJBQThCLEVBQUUsK0JBQStCLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUNySSxPQUFPLEVB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