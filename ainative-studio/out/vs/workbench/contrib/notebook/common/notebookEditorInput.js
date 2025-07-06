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
var NotebookEditorInput_1;
import * as glob from '../../../../base/common/glob.js';
import { isResourceEditorInput } from '../../../common/editor.js';
import { INotebookService, SimpleNotebookProviderInfo } from './notebookService.js';
import { isEqual, joinPath } from '../../../../base/common/resources.js';
import { IFileDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { INotebookEditorModelResolverService } from './notebookEditorModelResolverService.js';
import { CellUri } from './notebookCommon.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { Schemas } from '../../../../base/common/network.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { AbstractResourceEditorInput } from '../../../common/editor/resourceEditorInput.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { IFilesConfigurationService } from '../../../services/filesConfiguration/common/filesConfigurationService.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { localize } from '../../../../nls.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { ITextResourceConfigurationService } from '../../../../editor/common/services/textResourceConfiguration.js';
import { ICustomEditorLabelService } from '../../../services/editor/common/customEditorLabelService.js';
let NotebookEditorInput = class NotebookEditorInput extends AbstractResourceEditorInput {
    static { NotebookEditorInput_1 = this; }
    static getOrCreate(instantiationService, resource, preferredResource, viewType, options = {}) {
        const editor = instantiationService.createInstance(NotebookEditorInput_1, resource, preferredResource, viewType, options);
        if (preferredResource) {
            editor.setPreferredResource(preferredResource);
        }
        return editor;
    }
    static { this.ID = 'workbench.input.notebook'; }
    constructor(resource, preferredResource, viewType, options, _notebookService, _notebookModelResolverService, _fileDialogService, labelService, fileService, filesConfigurationService, extensionService, editorService, textResourceConfigurationService, customEditorLabelService) {
        super(resource, preferredResource, labelService, fileService, filesConfigurationService, textResourceConfigurationService, customEditorLabelService);
        this.viewType = viewType;
        this.options = options;
        this._notebookService = _notebookService;
        this._notebookModelResolverService = _notebookModelResolverService;
        this._fileDialogService = _fileDialogService;
        this.editorModelReference = null;
        this._defaultDirtyState = false;
        this._defaultDirtyState = !!options.startDirty;
        // Automatically resolve this input when the "wanted" model comes to life via
        // some other way. This happens only once per input and resolve disposes
        // this listener
        this._sideLoadedListener = _notebookService.onDidAddNotebookDocument(e => {
            if (e.viewType === this.viewType && e.uri.toString() === this.resource.toString()) {
                this.resolve().catch(onUnexpectedError);
            }
        });
        this._register(extensionService.onWillStop(e => {
            if (!e.auto && !this.isDirty()) {
                return;
            }
            const reason = e.auto
                ? localize('vetoAutoExtHostRestart', "An extension provided notebook for '{0}' is still open that would close otherwise.", this.getName())
                : localize('vetoExtHostRestart', "An extension provided notebook for '{0}' could not be saved.", this.getName());
            e.veto((async () => {
                const editors = editorService.findEditors(this);
                if (e.auto) {
                    return true;
                }
                if (editors.length > 0) {
                    const result = await editorService.save(editors[0]);
                    if (result.success) {
                        return false; // Don't Veto
                    }
                }
                return true; // Veto
            })(), reason);
        }));
    }
    dispose() {
        this._sideLoadedListener.dispose();
        this.editorModelReference?.dispose();
        this.editorModelReference = null;
        super.dispose();
    }
    get typeId() {
        return NotebookEditorInput_1.ID;
    }
    get editorId() {
        return this.viewType;
    }
    get capabilities() {
        let capabilities = 0 /* EditorInputCapabilities.None */;
        if (this.resource.scheme === Schemas.untitled) {
            capabilities |= 4 /* EditorInputCapabilities.Untitled */;
        }
        if (this.editorModelReference) {
            if (this.editorModelReference.object.isReadonly()) {
                capabilities |= 2 /* EditorInputCapabilities.Readonly */;
            }
        }
        else {
            if (this.filesConfigurationService.isReadonly(this.resource)) {
                capabilities |= 2 /* EditorInputCapabilities.Readonly */;
            }
        }
        if (!(capabilities & 2 /* EditorInputCapabilities.Readonly */)) {
            capabilities |= 128 /* EditorInputCapabilities.CanDropIntoEditor */;
        }
        return capabilities;
    }
    getDescription(verbosity = 1 /* Verbosity.MEDIUM */) {
        if (!this.hasCapability(4 /* EditorInputCapabilities.Untitled */) || this.editorModelReference?.object.hasAssociatedFilePath()) {
            return super.getDescription(verbosity);
        }
        return undefined; // no description for untitled notebooks without associated file path
    }
    isReadonly() {
        if (!this.editorModelReference) {
            return this.filesConfigurationService.isReadonly(this.resource);
        }
        return this.editorModelReference.object.isReadonly();
    }
    isDirty() {
        if (!this.editorModelReference) {
            return this._defaultDirtyState;
        }
        return this.editorModelReference.object.isDirty();
    }
    isSaving() {
        const model = this.editorModelReference?.object;
        if (!model || !model.isDirty() || model.hasErrorState || this.hasCapability(4 /* EditorInputCapabilities.Untitled */)) {
            return false; // require the model to be dirty, file-backed and not in an error state
        }
        // if a short auto save is configured, treat this as being saved
        return this.filesConfigurationService.hasShortAutoSaveDelay(this);
    }
    async save(group, options) {
        if (this.editorModelReference) {
            if (this.hasCapability(4 /* EditorInputCapabilities.Untitled */)) {
                return this.saveAs(group, options);
            }
            else {
                await this.editorModelReference.object.save(options);
            }
            return this;
        }
        return undefined;
    }
    async saveAs(group, options) {
        if (!this.editorModelReference) {
            return undefined;
        }
        const provider = this._notebookService.getContributedNotebookType(this.viewType);
        if (!provider) {
            return undefined;
        }
        const pathCandidate = this.hasCapability(4 /* EditorInputCapabilities.Untitled */) ? await this._suggestName(provider, this.labelService.getUriBasenameLabel(this.resource)) : this.editorModelReference.object.resource;
        let target;
        if (this.editorModelReference.object.hasAssociatedFilePath()) {
            target = pathCandidate;
        }
        else {
            target = await this._fileDialogService.pickFileToSave(pathCandidate, options?.availableFileSystems);
            if (!target) {
                return undefined; // save cancelled
            }
        }
        if (!provider.matches(target)) {
            const patterns = provider.selectors.map(pattern => {
                if (typeof pattern === 'string') {
                    return pattern;
                }
                if (glob.isRelativePattern(pattern)) {
                    return `${pattern} (base ${pattern.base})`;
                }
                if (pattern.exclude) {
                    return `${pattern.include} (exclude: ${pattern.exclude})`;
                }
                else {
                    return `${pattern.include}`;
                }
            }).join(', ');
            throw new Error(`File name ${target} is not supported by ${provider.providerDisplayName}.\n\nPlease make sure the file name matches following patterns:\n${patterns}`);
        }
        return await this.editorModelReference.object.saveAs(target);
    }
    async _suggestName(provider, suggestedFilename) {
        // guess file extensions
        const firstSelector = provider.selectors[0];
        let selectorStr = firstSelector && typeof firstSelector === 'string' ? firstSelector : undefined;
        if (!selectorStr && firstSelector) {
            const include = firstSelector.include;
            if (typeof include === 'string') {
                selectorStr = include;
            }
        }
        if (selectorStr) {
            const matches = /^\*\.([A-Za-z_-]*)$/.exec(selectorStr);
            if (matches && matches.length > 1) {
                const fileExt = matches[1];
                if (!suggestedFilename.endsWith(fileExt)) {
                    return joinPath(await this._fileDialogService.defaultFilePath(), suggestedFilename + '.' + fileExt);
                }
            }
        }
        return joinPath(await this._fileDialogService.defaultFilePath(), suggestedFilename);
    }
    // called when users rename a notebook document
    async rename(group, target) {
        if (this.editorModelReference) {
            return { editor: { resource: target }, options: { override: this.viewType } };
        }
        return undefined;
    }
    async revert(_group, options) {
        if (this.editorModelReference && this.editorModelReference.object.isDirty()) {
            await this.editorModelReference.object.revert(options);
        }
    }
    async resolve(_options, perf) {
        if (!await this._notebookService.canResolve(this.viewType)) {
            return null;
        }
        perf?.mark('extensionActivated');
        // we are now loading the notebook and don't need to listen to
        // "other" loading anymore
        this._sideLoadedListener.dispose();
        if (!this.editorModelReference) {
            const scratchpad = this.capabilities & 512 /* EditorInputCapabilities.Scratchpad */ ? true : false;
            const ref = await this._notebookModelResolverService.resolve(this.resource, this.viewType, { limits: this.ensureLimits(_options), scratchpad, viewType: this.editorId });
            if (this.editorModelReference) {
                // Re-entrant, double resolve happened. Dispose the addition references and proceed
                // with the truth.
                ref.dispose();
                return this.editorModelReference.object;
            }
            this.editorModelReference = ref;
            if (this.isDisposed()) {
                this.editorModelReference.dispose();
                this.editorModelReference = null;
                return null;
            }
            this._register(this.editorModelReference.object.onDidChangeDirty(() => this._onDidChangeDirty.fire()));
            this._register(this.editorModelReference.object.onDidChangeReadonly(() => this._onDidChangeCapabilities.fire()));
            this._register(this.editorModelReference.object.onDidRevertUntitled(() => this.dispose()));
            if (this.editorModelReference.object.isDirty()) {
                this._onDidChangeDirty.fire();
            }
        }
        else {
            this.editorModelReference.object.load({ limits: this.ensureLimits(_options) });
        }
        if (this.options._backupId) {
            const info = await this._notebookService.withNotebookDataProvider(this.editorModelReference.object.notebook.viewType);
            if (!(info instanceof SimpleNotebookProviderInfo)) {
                throw new Error('CANNOT open file notebook with this provider');
            }
            const data = await info.serializer.dataToNotebook(VSBuffer.fromString(JSON.stringify({ __webview_backup: this.options._backupId })));
            this.editorModelReference.object.notebook.applyEdits([
                {
                    editType: 1 /* CellEditType.Replace */,
                    index: 0,
                    count: this.editorModelReference.object.notebook.length,
                    cells: data.cells
                }
            ], true, undefined, () => undefined, undefined, false);
            if (this.options._workingCopy) {
                this.options._backupId = undefined;
                this.options._workingCopy = undefined;
                this.options.startDirty = undefined;
            }
        }
        return this.editorModelReference.object;
    }
    toUntyped() {
        return {
            resource: this.resource,
            options: {
                override: this.viewType
            }
        };
    }
    matches(otherInput) {
        if (super.matches(otherInput)) {
            return true;
        }
        if (otherInput instanceof NotebookEditorInput_1) {
            return this.viewType === otherInput.viewType && isEqual(this.resource, otherInput.resource);
        }
        if (isResourceEditorInput(otherInput) && otherInput.resource.scheme === CellUri.scheme) {
            return isEqual(this.resource, CellUri.parse(otherInput.resource)?.notebook);
        }
        return false;
    }
};
NotebookEditorInput = NotebookEditorInput_1 = __decorate([
    __param(4, INotebookService),
    __param(5, INotebookEditorModelResolverService),
    __param(6, IFileDialogService),
    __param(7, ILabelService),
    __param(8, IFileService),
    __param(9, IFilesConfigurationService),
    __param(10, IExtensionService),
    __param(11, IEditorService),
    __param(12, ITextResourceConfigurationService),
    __param(13, ICustomEditorLabelService)
], NotebookEditorInput);
export { NotebookEditorInput };
export function isCompositeNotebookEditorInput(thing) {
    return !!thing
        && typeof thing === 'object'
        && Array.isArray(thing.editorInputs)
        && (thing.editorInputs.every(input => input instanceof NotebookEditorInput));
}
export function isNotebookEditorInput(thing) {
    return !!thing
        && typeof thing === 'object'
        && thing.typeId === NotebookEditorInput.ID;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tFZGl0b3JJbnB1dC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2NvbW1vbi9ub3RlYm9va0VkaXRvcklucHV0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssSUFBSSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3hELE9BQU8sRUFBdUoscUJBQXFCLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUV2TixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQztBQUVwRixPQUFPLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRXpFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxtQ0FBbUMsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBRTlGLE9BQU8sRUFBZ0IsT0FBTyxFQUFnQyxNQUFNLHFCQUFxQixDQUFDO0FBQzFGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUMzRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDN0QsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBRTVGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUk3RCxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSwwRUFBMEUsQ0FBQztBQUN0SCxPQUFPLEVBQUUsaUJB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