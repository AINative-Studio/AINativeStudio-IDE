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
var FileEditorInput_1;
import { DEFAULT_EDITOR_ASSOCIATION, findViewStateForEditor, isResourceEditorInput } from '../../../../common/editor.js';
import { AbstractTextResourceEditorInput } from '../../../../common/editor/textResourceEditorInput.js';
import { BinaryEditorModel } from '../../../../common/editor/binaryEditorModel.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { ITextFileService } from '../../../../services/textfile/common/textfiles.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { dispose, DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ITextModelService } from '../../../../../editor/common/services/resolverService.js';
import { FILE_EDITOR_INPUT_ID, TEXT_FILE_EDITOR_ID, BINARY_FILE_EDITOR_ID } from '../../common/files.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { IFilesConfigurationService } from '../../../../services/filesConfiguration/common/filesConfigurationService.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { isEqual } from '../../../../../base/common/resources.js';
import { Event } from '../../../../../base/common/event.js';
import { Schemas } from '../../../../../base/common/network.js';
import { createTextBufferFactory } from '../../../../../editor/common/model/textModel.js';
import { IPathService } from '../../../../services/path/common/pathService.js';
import { ITextResourceConfigurationService } from '../../../../../editor/common/services/textResourceConfiguration.js';
import { ICustomEditorLabelService } from '../../../../services/editor/common/customEditorLabelService.js';
var ForceOpenAs;
(function (ForceOpenAs) {
    ForceOpenAs[ForceOpenAs["None"] = 0] = "None";
    ForceOpenAs[ForceOpenAs["Text"] = 1] = "Text";
    ForceOpenAs[ForceOpenAs["Binary"] = 2] = "Binary";
})(ForceOpenAs || (ForceOpenAs = {}));
/**
 * A file editor input is the input type for the file editor of file system resources.
 */
let FileEditorInput = FileEditorInput_1 = class FileEditorInput extends AbstractTextResourceEditorInput {
    get typeId() {
        return FILE_EDITOR_INPUT_ID;
    }
    get editorId() {
        return DEFAULT_EDITOR_ASSOCIATION.id;
    }
    get capabilities() {
        let capabilities = 32 /* EditorInputCapabilities.CanSplitInGroup */;
        if (this.model) {
            if (this.model.isReadonly()) {
                capabilities |= 2 /* EditorInputCapabilities.Readonly */;
            }
        }
        else {
            if (this.fileService.hasProvider(this.resource)) {
                if (this.filesConfigurationService.isReadonly(this.resource)) {
                    capabilities |= 2 /* EditorInputCapabilities.Readonly */;
                }
            }
            else {
                capabilities |= 4 /* EditorInputCapabilities.Untitled */;
            }
        }
        if (!(capabilities & 2 /* EditorInputCapabilities.Readonly */)) {
            capabilities |= 128 /* EditorInputCapabilities.CanDropIntoEditor */;
        }
        return capabilities;
    }
    constructor(resource, preferredResource, preferredName, preferredDescription, preferredEncoding, preferredLanguageId, preferredContents, instantiationService, textFileService, textModelService, labelService, fileService, filesConfigurationService, editorService, pathService, textResourceConfigurationService, customEditorLabelService) {
        super(resource, preferredResource, editorService, textFileService, labelService, fileService, filesConfigurationService, textResourceConfigurationService, customEditorLabelService);
        this.instantiationService = instantiationService;
        this.textModelService = textModelService;
        this.pathService = pathService;
        this.forceOpenAs = 0 /* ForceOpenAs.None */;
        this.model = undefined;
        this.cachedTextFileModelReference = undefined;
        this.modelListeners = this._register(new DisposableStore());
        this.model = this.textFileService.files.get(resource);
        if (preferredName) {
            this.setPreferredName(preferredName);
        }
        if (preferredDescription) {
            this.setPreferredDescription(preferredDescription);
        }
        if (preferredEncoding) {
            this.setPreferredEncoding(preferredEncoding);
        }
        if (preferredLanguageId) {
            this.setPreferredLanguageId(preferredLanguageId);
        }
        if (typeof preferredContents === 'string') {
            this.setPreferredContents(preferredContents);
        }
        // Attach to model that matches our resource once created
        this._register(this.textFileService.files.onDidCreate(model => this.onDidCreateTextFileModel(model)));
        // If a file model already exists, make sure to wire it in
        if (this.model) {
            this.registerModelListeners(this.model);
        }
    }
    onDidCreateTextFileModel(model) {
        // Once the text file model is created, we keep it inside
        // the input to be able to implement some methods properly
        if (isEqual(model.resource, this.resource)) {
            this.model = model;
            this.registerModelListeners(model);
        }
    }
    registerModelListeners(model) {
        // Clear any old
        this.modelListeners.clear();
        // re-emit some events from the model
        this.modelListeners.add(model.onDidChangeDirty(() => this._onDidChangeDirty.fire()));
        this.modelListeners.add(model.onDidChangeReadonly(() => this._onDidChangeCapabilities.fire()));
        // important: treat save errors as potential dirty change because
        // a file that is in save conflict or error will report dirty even
        // if auto save is turned on.
        this.modelListeners.add(model.onDidSaveError(() => this._onDidChangeDirty.fire()));
        // remove model association once it gets disposed
        this.modelListeners.add(Event.once(model.onWillDispose)(() => {
            this.modelListeners.clear();
            this.model = undefined;
        }));
    }
    getName() {
        return this.preferredName || super.getName();
    }
    setPreferredName(name) {
        if (!this.allowLabelOverride()) {
            return; // block for specific schemes we consider to be owning
        }
        if (this.preferredName !== name) {
            this.preferredName = name;
            this._onDidChangeLabel.fire();
        }
    }
    allowLabelOverride() {
        return this.resource.scheme !== this.pathService.defaultUriScheme &&
            this.resource.scheme !== Schemas.vscodeUserData &&
            this.resource.scheme !== Schemas.file &&
            this.resource.scheme !== Schemas.vscodeRemote;
    }
    getPreferredName() {
        return this.preferredName;
    }
    isReadonly() {
        return this.model ? this.model.isReadonly() : this.filesConfigurationService.isReadonly(this.resource);
    }
    getDescription(verbosity) {
        return this.preferredDescription || super.getDescription(verbosity);
    }
    setPreferredDescription(description) {
        if (!this.allowLabelOverride()) {
            return; // block for specific schemes we consider to be owning
        }
        if (this.preferredDescription !== description) {
            this.preferredDescription = description;
            this._onDidChangeLabel.fire();
        }
    }
    getPreferredDescription() {
        return this.preferredDescription;
    }
    getTitle(verbosity) {
        let title = super.getTitle(verbosity);
        const preferredTitle = this.getPreferredTitle();
        if (preferredTitle) {
            title = `${preferredTitle} (${title})`;
        }
        return title;
    }
    getPreferredTitle() {
        if (this.preferredName && this.preferredDescription) {
            return `${this.preferredName} ${this.preferredDescription}`;
        }
        if (this.preferredName || this.preferredDescription) {
            return this.preferredName ?? this.preferredDescription;
        }
        return undefined;
    }
    getEncoding() {
        if (this.model) {
            return this.model.getEncoding();
        }
        return this.preferredEncoding;
    }
    getPreferredEncoding() {
        return this.preferredEncoding;
    }
    async setEncoding(encoding, mode) {
        this.setPreferredEncoding(encoding);
        return this.model?.setEncoding(encoding, mode);
    }
    setPreferredEncoding(encoding) {
        this.preferredEncoding = encoding;
        // encoding is a good hint to open the file as text
        this.setForceOpenAsText();
    }
    getLanguageId() {
        if (this.model) {
            return this.model.getLanguageId();
        }
        return this.preferredLanguageId;
    }
    getPreferredLanguageId() {
        return this.preferredLanguageId;
    }
    setLanguageId(languageId, source) {
        this.setPreferredLanguageId(languageId);
        this.model?.setLanguageId(languageId, source);
    }
    setPreferredLanguageId(languageId) {
        this.preferredLanguageId = languageId;
        // languages are a good hint to open the file as text
        this.setForceOpenAsText();
    }
    setPreferredContents(contents) {
        this.preferredContents = contents;
        // contents is a good hint to open the file as text
        this.setForceOpenAsText();
    }
    setForceOpenAsText() {
        this.forceOpenAs = 1 /* ForceOpenAs.Text */;
    }
    setForceOpenAsBinary() {
        this.forceOpenAs = 2 /* ForceOpenAs.Binary */;
    }
    isDirty() {
        return !!(this.model?.isDirty());
    }
    isSaving() {
        if (this.model?.hasState(0 /* TextFileEditorModelState.SAVED */) || this.model?.hasState(3 /* TextFileEditorModelState.CONFLICT */) || this.model?.hasState(5 /* TextFileEditorModelState.ERROR */)) {
            return false; // require the model to be dirty and not in conflict or error state
        }
        // Note: currently not checking for ModelState.PENDING_SAVE for a reason
        // because we currently miss an event for this state change on editors
        // and it could result in bad UX where an editor can be closed even though
        // it shows up as dirty and has not finished saving yet.
        if (this.filesConfigurationService.hasShortAutoSaveDelay(this)) {
            return true; // a short auto save is configured, treat this as being saved
        }
        return super.isSaving();
    }
    prefersEditorPane(editorPanes) {
        if (this.forceOpenAs === 2 /* ForceOpenAs.Binary */) {
            return editorPanes.find(editorPane => editorPane.typeId === BINARY_FILE_EDITOR_ID);
        }
        return editorPanes.find(editorPane => editorPane.typeId === TEXT_FILE_EDITOR_ID);
    }
    resolve(options) {
        // Resolve as binary
        if (this.forceOpenAs === 2 /* ForceOpenAs.Binary */) {
            return this.doResolveAsBinary();
        }
        // Resolve as text
        return this.doResolveAsText(options);
    }
    async doResolveAsText(options) {
        try {
            // Unset preferred contents after having applied it once
            // to prevent this property to stick. We still want future
            // `resolve` calls to fetch the contents from disk.
            const preferredContents = this.preferredContents;
            this.preferredContents = undefined;
            // Resolve resource via text file service and only allow
            // to open binary files if we are instructed so
            await this.textFileService.files.resolve(this.resource, {
                languageId: this.preferredLanguageId,
                encoding: this.preferredEncoding,
                contents: typeof preferredContents === 'string' ? createTextBufferFactory(preferredContents) : undefined,
                reload: { async: true }, // trigger a reload of the model if it exists already but do not wait to show the model
                allowBinary: this.forceOpenAs === 1 /* ForceOpenAs.Text */,
                reason: 1 /* TextFileResolveReason.EDITOR */,
                limits: this.ensureLimits(options)
            });
            // This is a bit ugly, because we first resolve the model and then resolve a model reference. the reason being that binary
            // or very large files do not resolve to a text file model but should be opened as binary files without text. First calling into
            // resolve() ensures we are not creating model references for these kind of resources.
            // In addition we have a bit of payload to take into account (encoding, reload) that the text resolver does not handle yet.
            if (!this.cachedTextFileModelReference) {
                this.cachedTextFileModelReference = await this.textModelService.createModelReference(this.resource);
            }
            const model = this.cachedTextFileModelReference.object;
            // It is possible that this input was disposed before the model
            // finished resolving. As such, we need to make sure to dispose
            // the model reference to not leak it.
            if (this.isDisposed()) {
                this.disposeModelReference();
            }
            return model;
        }
        catch (error) {
            // Handle binary files with binary model
            if (error.textFileOperationResult === 0 /* TextFileOperationResult.FILE_IS_BINARY */) {
                return this.doResolveAsBinary();
            }
            // Bubble any other error up
            throw error;
        }
    }
    async doResolveAsBinary() {
        const model = this.instantiationService.createInstance(BinaryEditorModel, this.preferredResource, this.getName());
        await model.resolve();
        return model;
    }
    isResolved() {
        return !!this.model;
    }
    async rename(group, target) {
        return {
            editor: {
                resource: target,
                encoding: this.getEncoding(),
                options: {
                    viewState: findViewStateForEditor(this, group, this.editorService)
                }
            }
        };
    }
    toUntyped(options) {
        const untypedInput = {
            resource: this.preferredResource,
            forceFile: true,
            options: {
                override: this.editorId
            }
        };
        if (typeof options?.preserveViewState === 'number') {
            untypedInput.encoding = this.getEncoding();
            untypedInput.languageId = this.getLanguageId();
            untypedInput.contents = (() => {
                const model = this.textFileService.files.get(this.resource);
                if (model?.isDirty() && !model.textEditorModel.isTooLargeForHeapOperation()) {
                    return model.textEditorModel.getValue(); // only if dirty and not too large
                }
                return undefined;
            })();
            untypedInput.options = {
                ...untypedInput.options,
                viewState: findViewStateForEditor(this, options.preserveViewState, this.editorService)
            };
        }
        return untypedInput;
    }
    matches(otherInput) {
        if (this === otherInput) {
            return true;
        }
        if (otherInput instanceof FileEditorInput_1) {
            return isEqual(otherInput.resource, this.resource);
        }
        if (isResourceEditorInput(otherInput)) {
            return super.matches(otherInput);
        }
        return false;
    }
    dispose() {
        // Model
        this.model = undefined;
        // Model reference
        this.disposeModelReference();
        super.dispose();
    }
    disposeModelReference() {
        dispose(this.cachedTextFileModelReference);
        this.cachedTextFileModelReference = undefined;
    }
};
FileEditorInput = FileEditorInput_1 = __decorate([
    __param(7, IInstantiationService),
    __param(8, ITextFileService),
    __param(9, ITextModelService),
    __param(10, ILabelService),
    __param(11, IFileService),
    __param(12, IFilesConfigurationService),
    __param(13, IEditorService),
    __param(14, IPathService),
    __param(15, ITextResourceConfigurationService),
    __param(16, ICustomEditorLabelService)
], FileEditorInput);
export { FileEditorInput };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZUVkaXRvcklucHV0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2ZpbGVzL2Jyb3dzZXIvZWRpdG9ycy9maWxlRWRpdG9ySW5wdXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBMkksMEJBQTBCLEVBQTJCLHNCQUFzQixFQUFFLHFCQUFxQixFQUEyQixNQUFNLDhCQUE4QixDQUFDO0FBRXBULE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBRXZHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ25GLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUM3RSxPQUFPLEVBQUUsZ0JBQWdCLEVBQXdJLE1BQU0sbURBQW1ELENBQUM7QUFDM04sT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDdEcsT0FBTyxFQUFjLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUMvRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUM3RixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsbUJBQW1CLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUN6RyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDOUUsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sNkVBQTZFLENBQUM7QUFDekgsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQ3JGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNsRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDNUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUMvRSxPQUFPLEVBQUUsaUNBQWlDLEVBQUUsTUFBTSxvRUFBb0UsQ0FBQztBQUV2SCxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQztBQUUzRyxJQUFXLFdBSVY7QUFKRCxXQUFXLFdBQVc7SUFDckIsNkNBQUksQ0FBQTtJQUNKLDZDQUFJLENBQUE7SUFDSixpREFBTSxDQUFBO0FBQ1AsQ0FBQyxFQUpVLFdBQVcsS0FBWCxXQUFXLFFBSXJCO0FBRUQ7O0dBRUc7QUFDSSxJQUFNLGVBQWUsdUJBQXJCLE1BQU0sZUFBZ0IsU0FBUSwrQkFBK0I7SUFFbkUsSUFBYSxNQUFNO1FBQ2xCLE9BQU8sb0JBQW9CLENBQUM7SUFDN0IsQ0FBQztJQUVELElBQWEsUUFBUTtRQUNwQixPQUFPLDBCQUEwQixDQUFDLEVBQUUsQ0FBQztJQUN0QyxDQUFDO0lBRUQsSUFBYSxZQUFZO1FBQ3hCLElBQUksWUFBWSxtREFBMEMsQ0FBQztRQUUzRCxJQUFJLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNoQixJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBQztnQkFDN0IsWUFBWSw0Q0FBb0MsQ0FBQztZQUNsRCxDQUFDO1FBQ0YsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLElBQUksQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO2dCQUNqRCxJQUFJLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7b0JBQzlELFlBQVksNENBQW9DLENBQUM7Z0JBQ2xELENBQUM7WUFDRixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsWUFBWSw0Q0FBb0MsQ0FBQztZQUNsRCxDQUFDO1FBQ0YsQ0FBQztRQUVELElBQUksQ0FBQyxDQUFDLFlBQVksMkNBQW1DLENBQUMsRUFBRSxDQUFDO1lBQ3hELFlBQVksdURBQTZDLENBQUM7UUFDM0QsQ0FBQztRQUVELE9BQU8sWUFBWSxDQUFDO0lBQ3JCLENBQUM7SUFlRCxZQUNDLFFBQWEsRUFDYixpQkFBa0MsRUFDbEMsYUFBaUMsRUFDakMsb0JBQXdDLEVBQ3hDLGlCQUFxQyxFQUNyQyxtQkFBdUMsRUFDdkMsaUJBQXFDLEVBQ2Qsb0JBQTRELEVBQ2pFLGVBQWlDLEVBQ2hDLGdCQUFvRCxFQUN4RCxZQUEyQixFQUM1QixXQUF5QixFQUNYLHlCQUFxRCxFQUNqRSxhQUE2QixFQUMvQixXQUEwQyxFQUNyQixnQ0FBbUUsRUFDM0Usd0JBQW1EO1FBRTlFLEtBQUssQ0FBQyxRQUFRLEVBQUUsaUJBQWlCLEVBQUUsYUFBYSxFQUFFLGVBQWUsRUFBRSxZQUFZLEVBQUUsV0FBVyxFQUFFLHlCQUF5QixFQUFFLGdDQUFnQyxFQUFFLHdCQUF3QixDQUFDLENBQUM7UUFYN0kseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtRQUUvQyxxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQW1CO1FBS3hDLGdCQUFXLEdBQVgsV0FBVyxDQUFjO1FBdEJqRCxnQkFBVyw0QkFBaUM7UUFFNUMsVUFBSyxHQUFxQyxTQUFTLENBQUM7UUFDcEQsaUNBQTRCLEdBQWlELFNBQVMsQ0FBQztRQUU5RSxtQkFBYyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxlQUFlLEVBQUUsQ0FBQyxDQUFDO1FBdUJ2RSxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUV0RCxJQUFJLGFBQWEsRUFBRSxDQUFDO1lBQ25CLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUN0QyxDQUFDO1FBRUQsSUFBSSxvQkFBb0IsRUFBRSxDQUFDO1lBQzFCLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO1FBQ3BELENBQUM7UUFFRCxJQUFJLGlCQUFpQixFQUFFLENBQUM7WUFDdkIsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGlCQUFpQixDQUFDLENBQUM7UUFDOUMsQ0FBQztRQUVELElBQUksbUJBQW1CLEVBQUUsQ0FBQztZQUN6QixJQUFJLENBQUMsc0JBQXNCLENBQUMsbUJBQW1CLENBQUMsQ0FBQztRQUNsRCxDQUFDO1FBRUQsSUFBSSxPQUFPLGlCQUFpQixLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQzNDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1FBQzlDLENBQUM7UUFFRCx5REFBeUQ7UUFDekQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsd0JBQXdCLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRXRHLDBEQUEwRDtRQUMxRCxJQUFJLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNoQixJQUFJLENBQUMsc0JBQXNCLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3pDLENBQUM7SUFDRixDQUFDO0lBRU8sd0JBQXdCLENBQUMsS0FBMkI7UUFFM0QseURBQXlEO1FBQ3pELDBEQUEwRDtRQUMxRCxJQUFJLE9BQU8sQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO1lBQzVDLElBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDO1lBRW5CLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNwQyxDQUFDO0lBQ0YsQ0FBQztJQUVPLHNCQUFzQixDQUFDLEtBQTJCO1FBRXpELGdCQUFnQjtRQUNoQixJQUFJLENBQUMsY0FBYyxDQUFDLEtBQUssRUFBRSxDQUFDO1FBRTVCLHFDQUFxQztRQUNyQyxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNyRixJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsbUJBQW1CLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLHdCQUF3QixDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztRQUUvRixpRUFBaUU7UUFDakUsa0VBQWtFO1FBQ2xFLDZCQUE2QjtRQUM3QixJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFbkYsaURBQWlEO1FBQ2pELElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxDQUFDLEdBQUcsRUFBRTtZQUM1RCxJQUFJLENBQUMsY0FBYyxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQzVCLElBQUksQ0FBQyxLQUFLLEdBQUcsU0FBUyxDQUFDO1FBQ3hCLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRVEsT0FBTztRQUNmLE9BQU8sSUFBSSxDQUFDLGFBQWEsSUFBSSxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDOUMsQ0FBQztJQUVELGdCQUFnQixDQUFDLElBQVk7UUFDNUIsSUFBSSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxFQUFFLENBQUM7WUFDaEMsT0FBTyxDQUFDLHNEQUFzRDtRQUMvRCxDQUFDO1FBRUQsSUFBSSxJQUFJLENBQUMsYUFBYSxLQUFLLElBQUksRUFBRSxDQUFDO1lBQ2pDLElBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFDO1lBRTFCLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUMvQixDQUFDO0lBQ0YsQ0FBQztJQUVPLGtCQUFrQjtRQUN6QixPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxLQUFLLElBQUksQ0FBQyxXQUFXLENBQUMsZ0JBQWdCO1lBQ2hFLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxLQUFLLE9BQU8sQ0FBQyxjQUFjO1lBQy9DLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxLQUFLLE9BQU8sQ0FBQyxJQUFJO1lBQ3JDLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxLQUFLLE9BQU8sQ0FBQyxZQUFZLENBQUM7SUFDaEQsQ0FBQztJQUVELGdCQUFnQjtRQUNmLE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQztJQUMzQixDQUFDO0lBRVEsVUFBVTtRQUNsQixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ3hHLENBQUM7SUFFUSxjQUFjLENBQUMsU0FBcUI7UUFDNUMsT0FBTyxJQUFJLENBQUMsb0JBQW9CLElBQUksS0FBSyxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUNyRSxDQUFDO0lBRUQsdUJBQXVCLENBQUMsV0FBbUI7UUFDMUMsSUFBSSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxFQUFFLENBQUM7WUFDaEMsT0FBTyxDQUFDLHNEQUFzRDtRQUMvRCxDQUFDO1FBRUQsSUFBSSxJQUFJLENBQUMsb0JBQW9CLEtBQUssV0FBVyxFQUFFLENBQUM7WUFDL0MsSUFBSSxDQUFDLG9CQUFvQixHQUFHLFdBQVcsQ0FBQztZQUV4QyxJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDL0IsQ0FBQztJQUNGLENBQUM7SUFFRCx1QkFBdUI7UUFDdEIsT0FBTyxJQUFJLENBQUMsb0JBQW9CLENBQUM7SUFDbEMsQ0FBQztJQUVRLFFBQVEsQ0FBQyxTQUFxQjtRQUN0QyxJQUFJLEtBQUssR0FBRyxLQUFLLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBRXRDLE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1FBQ2hELElBQUksY0FBYyxFQUFFLENBQUM7WUFDcEIsS0FBSyxHQUFHLEdBQUcsY0FBYyxLQUFLLEtBQUssR0FBRyxDQUFDO1FBQ3hDLENBQUM7UUFFRCxPQUFPLEtBQUssQ0FBQztJQUNkLENBQUM7SUFFUyxpQkFBaUI7UUFDMUIsSUFBSSxJQUFJLENBQUMsYUFBYSxJQUFJLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO1lBQ3JELE9BQU8sR0FBRyxJQUFJLENBQUMsYUFBYSxJQUFJLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO1FBQzdELENBQUM7UUFFRCxJQUFJLElBQUksQ0FBQyxhQUFhLElBQUksSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUM7WUFDckQsT0FBTyxJQUFJLENBQUMsYUFBYSxJQUFJLElBQUksQ0FBQyxvQkFBb0IsQ0FBQztRQUN4RCxDQUFDO1FBRUQsT0FBTyxTQUFTLENBQUM7SUFDbEIsQ0FBQztJQUVELFdBQVc7UUFDVixJQUFJLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNoQixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxFQUFFLENBQUM7UUFDakMsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDLGlCQUFpQixDQUFDO0lBQy9CLENBQUM7SUFFRCxvQkFBb0I7UUFDbkIsT0FBTyxJQUFJLENBQUMsaUJBQWlCLENBQUM7SUFDL0IsQ0FBQztJQUVELEtBQUssQ0FBQyxXQUFXLENBQUMsUUFBZ0IsRUFBRSxJQUFrQjtRQUNyRCxJQUFJLENBQUMsb0JBQW9CLENBQUMsUUFBUSxDQUFDLENBQUM7UUFFcEMsT0FBTyxJQUFJLENBQUMsS0FBSyxFQUFFLFdBQVcsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDaEQsQ0FBQztJQUVELG9CQUFvQixDQUFDLFFBQWdCO1FBQ3BDLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxRQUFRLENBQUM7UUFFbEMsbURBQW1EO1FBQ25ELElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO0lBQzNCLENBQUM7SUFFRCxhQUFhO1FBQ1osSUFBSSxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDaEIsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLGFBQWEsRUFBRSxDQUFDO1FBQ25DLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQyxtQkFBbUIsQ0FBQztJQUNqQyxDQUFDO0lBRUQsc0JBQXNCO1FBQ3JCLE9BQU8sSUFBSSxDQUFDLG1CQUFtQixDQUFDO0lBQ2pDLENBQUM7SUFFRCxhQUFhLENBQUMsVUFBa0IsRUFBRSxNQUFlO1FBQ2hELElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUV4QyxJQUFJLENBQUMsS0FBSyxFQUFFLGFBQWEsQ0FBQyxVQUFVLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDL0MsQ0FBQztJQUVELHNCQUFzQixDQUFDLFVBQWtCO1FBQ3hDLElBQUksQ0FBQyxtQkFBbUIsR0FBRyxVQUFVLENBQUM7UUFFdEMscURBQXFEO1FBQ3JELElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO0lBQzNCLENBQUM7SUFFRCxvQkFBb0IsQ0FBQyxRQUFnQjtRQUNwQyxJQUFJLENBQUMsaUJBQWlCLEdBQUcsUUFBUSxDQUFDO1FBRWxDLG1EQUFtRDtRQUNuRCxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztJQUMzQixDQUFDO0lBRUQsa0JBQWtCO1FBQ2pCLElBQUksQ0FBQyxXQUFXLDJCQUFtQixDQUFDO0lBQ3JDLENBQUM7SUFFRCxvQkFBb0I7UUFDbkIsSUFBSSxDQUFDLFdBQVcsNkJBQXFCLENBQUM7SUFDdkMsQ0FBQztJQUVRLE9BQU87UUFDZixPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQztJQUNsQyxDQUFDO0lBRVEsUUFBUTtRQUNoQixJQUFJLElBQUksQ0FBQyxLQUFLLEVBQUUsUUFBUSx3Q0FBZ0MsSUFBSSxJQUFJLENBQUMsS0FBSyxFQUFFLFFBQVEsMkNBQW1DLElBQUksSUFBSSxDQUFDLEtBQUssRUFBRSxRQUFRLHdDQUFnQyxFQUFFLENBQUM7WUFDN0ssT0FBTyxLQUFLLENBQUMsQ0FBQyxtRUFBbUU7UUFDbEYsQ0FBQztRQUVELHdFQUF3RTtRQUN4RSxzRUFBc0U7UUFDdEUsMEVBQTBFO1FBQzFFLHdEQUF3RDtRQUV4RCxJQUFJLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO1lBQ2hFLE9BQU8sSUFBSSxDQUFDLENBQUMsNkRBQTZEO1FBQzNFLENBQUM7UUFFRCxPQUFPLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQztJQUN6QixDQUFDO0lBRVEsaUJBQWlCLENBQTJDLFdBQWdCO1FBQ3BGLElBQUksSUFBSSxDQUFDLFdBQVcsK0JBQXVCLEVBQUUsQ0FBQztZQUM3QyxPQUFPLFdBQVcsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsTUFBTSxLQUFLLHFCQUFxQixDQUFDLENBQUM7UUFDcEYsQ0FBQztRQUVELE9BQU8sV0FBVyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEtBQUssbUJBQW1CLENBQUMsQ0FBQztJQUNsRixDQUFDO0lBRVEsT0FBTyxDQUFDLE9BQWlDO1FBRWpELG9CQUFvQjtRQUNwQixJQUFJLElBQUksQ0FBQyxXQUFXLCtCQUF1QixFQUFFLENBQUM7WUFDN0MsT0FBTyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztRQUNqQyxDQUFDO1FBRUQsa0JBQWtCO1FBQ2xCLE9BQU8sSUFBSSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUN0QyxDQUFDO0lBRU8sS0FBSyxDQUFDLGVBQWUsQ0FBQyxPQUFpQztRQUM5RCxJQUFJLENBQUM7WUFFSix3REFBd0Q7WUFDeEQsMERBQTBEO1lBQzFELG1EQUFtRDtZQUNuRCxNQUFNLGlCQUFpQixHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQztZQUNqRCxJQUFJLENBQUMsaUJBQWlCLEdBQUcsU0FBUyxDQUFDO1lBRW5DLHdEQUF3RDtZQUN4RCwrQ0FBK0M7WUFDL0MsTUFBTSxJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRTtnQkFDdkQsVUFBVSxFQUFFLElBQUksQ0FBQyxtQkFBbUI7Z0JBQ3BDLFFBQVEsRUFBRSxJQUFJLENBQUMsaUJBQWlCO2dCQUNoQyxRQUFRLEVBQUUsT0FBTyxpQkFBaUIsS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLHVCQUF1QixDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVM7Z0JBQ3hHLE1BQU0sRUFBRSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsRUFBRSx1RkFBdUY7Z0JBQ2hILFdBQVcsRUFBRSxJQUFJLENBQUMsV0FBVyw2QkFBcUI7Z0JBQ2xELE1BQU0sc0NBQThCO2dCQUNwQyxNQUFNLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUM7YUFDbEMsQ0FBQyxDQUFDO1lBRUgsMEhBQTBIO1lBQzFILGdJQUFnSTtZQUNoSSxzRkFBc0Y7WUFDdEYsMkhBQTJIO1lBQzNILElBQUksQ0FBQyxJQUFJLENBQUMsNEJBQTRCLEVBQUUsQ0FBQztnQkFDeEMsSUFBSSxDQUFDLDRCQUE0QixHQUFHLE1BQU0sSUFBSSxDQUFDLGdCQUFnQixDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxRQUFRLENBQXFDLENBQUM7WUFDekksQ0FBQztZQUVELE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxNQUFNLENBQUM7WUFFdkQsK0RBQStEO1lBQy9ELCtEQUErRDtZQUMvRCxzQ0FBc0M7WUFDdEMsSUFBSSxJQUFJLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBQztnQkFDdkIsSUFBSSxDQUFDLHFCQUFxQixFQUFFLENBQUM7WUFDOUIsQ0FBQztZQUVELE9BQU8sS0FBSyxDQUFDO1FBQ2QsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFFaEIsd0NBQXdDO1lBQ3hDLElBQTZCLEtBQU0sQ0FBQyx1QkFBdUIsbURBQTJDLEVBQUUsQ0FBQztnQkFDeEcsT0FBTyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztZQUNqQyxDQUFDO1lBRUQsNEJBQTRCO1lBQzVCLE1BQU0sS0FBSyxDQUFDO1FBQ2IsQ0FBQztJQUNGLENBQUM7SUFFTyxLQUFLLENBQUMsaUJBQWlCO1FBQzlCLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsaUJBQWlCLEVBQUUsSUFBSSxDQUFDLGlCQUFpQixFQUFFLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO1FBQ2xILE1BQU0sS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBRXRCLE9BQU8sS0FBSyxDQUFDO0lBQ2QsQ0FBQztJQUVELFVBQVU7UUFDVCxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDO0lBQ3JCLENBQUM7SUFFUSxLQUFLLENBQUMsTUFBTSxDQUFDLEtBQXNCLEVBQUUsTUFBVztRQUN4RCxPQUFPO1lBQ04sTUFBTSxFQUFFO2dCQUNQLFFBQVEsRUFBRSxNQUFNO2dCQUNoQixRQUFRLEVBQUUsSUFBSSxDQUFDLFdBQVcsRUFBRTtnQkFDNUIsT0FBTyxFQUFFO29CQUNSLFNBQVMsRUFBRSxzQkFBc0IsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxhQUFhLENBQUM7aUJBQ2xFO2FBQ0Q7U0FDRCxDQUFDO0lBQ0gsQ0FBQztJQUVRLFNBQVMsQ0FBQyxPQUErQjtRQUNqRCxNQUFNLFlBQVksR0FBNEI7WUFDN0MsUUFBUSxFQUFFLElBQUksQ0FBQyxpQkFBaUI7WUFDaEMsU0FBUyxFQUFFLElBQUk7WUFDZixPQUFPLEVBQUU7Z0JBQ1IsUUFBUSxFQUFFLElBQUksQ0FBQyxRQUFRO2FBQ3ZCO1NBQ0QsQ0FBQztRQUVGLElBQUksT0FBTyxPQUFPLEVBQUUsaUJBQWlCLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDcEQsWUFBWSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDM0MsWUFBWSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDL0MsWUFBWSxDQUFDLFFBQVEsR0FBRyxDQUFDLEdBQUcsRUFBRTtnQkFDN0IsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztnQkFDNUQsSUFBSSxLQUFLLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLDBCQUEwQixFQUFFLEVBQUUsQ0FBQztvQkFDN0UsT0FBTyxLQUFLLENBQUMsZUFBZSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsa0NBQWtDO2dCQUM1RSxDQUFDO2dCQUVELE9BQU8sU0FBUyxDQUFDO1lBQ2xCLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFFTCxZQUFZLENBQUMsT0FBTyxHQUFHO2dCQUN0QixHQUFHLFlBQVksQ0FBQyxPQUFPO2dCQUN2QixTQUFTLEVBQUUsc0JBQXNCLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxpQkFBaUIsRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDO2FBQ3RGLENBQUM7UUFDSCxDQUFDO1FBRUQsT0FBTyxZQUFZLENBQUM7SUFDckIsQ0FBQztJQUVRLE9BQU8sQ0FBQyxVQUE2QztRQUM3RCxJQUFJLElBQUksS0FBSyxVQUFVLEVBQUUsQ0FBQztZQUN6QixPQUFPLElBQUksQ0FBQztRQUNiLENBQUM7UUFFRCxJQUFJLFVBQVUsWUFBWSxpQkFBZSxFQUFFLENBQUM7WUFDM0MsT0FBTyxPQUFPLENBQUMsVUFBVSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDcEQsQ0FBQztRQUVELElBQUkscUJBQXFCLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQztZQUN2QyxPQUFPLEtBQUssQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDbEMsQ0FBQztRQUVELE9BQU8sS0FBSyxDQUFDO0lBQ2QsQ0FBQztJQUVRLE9BQU87UUFFZixRQUFRO1FBQ1IsSUFBSSxDQUFDLEtBQUssR0FBRyxTQUFTLENBQUM7UUFFdkIsa0JBQWtCO1FBQ2xCLElBQUksQ0FBQyxxQkFBcUIsRUFBRSxDQUFDO1FBRTdCLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUNqQixDQUFDO0lBRU8scUJBQXFCO1FBQzVCLE9BQU8sQ0FBQyxJQUFJLENBQUMsNEJBQTRCLENBQUMsQ0FBQztRQUMzQyxJQUFJLENBQUMsNEJBQTRCLEdBQUcsU0FBUyxDQUFDO0lBQy9DLENBQUM7Q0FDRCxDQUFBO0FBN2JZLGVBQWU7SUF1RHpCLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSxnQkFBZ0IsQ0FBQTtJQUNoQixXQUFBLGlCQUFpQixDQUFBO0lBQ2pCLFlBQUEsYUFBYSxDQUFBO0lBQ2IsWUFBQSxZQUFZLENBQUE7SUFDWixZQUFBLDBCQUEwQixDQUFBO0lBQzFCLFlBQUEsY0FBYyxDQUFBO0lBQ2QsWUFBQSxZQUFZLENBQUE7SUFDWixZQUFBLGlDQUFpQyxDQUFBO0lBQ2pDLFlBQUEseUJBQXlCLENBQUE7R0FoRWYsZUFBZSxDQTZiM0IifQ==