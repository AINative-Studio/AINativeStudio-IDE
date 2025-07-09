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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tFZGl0b3JJbnB1dC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9jb21tb24vbm90ZWJvb2tFZGl0b3JJbnB1dC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLElBQUksTUFBTSxpQ0FBaUMsQ0FBQztBQUN4RCxPQUFPLEVBQXVKLHFCQUFxQixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFFdk4sT0FBTyxFQUFFLGdCQUFnQixFQUFFLDBCQUEwQixFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFFcEYsT0FBTyxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUV6RSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNwRixPQUFPLEVBQUUsbUNBQW1DLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUU5RixPQUFPLEVBQWdCLE9BQU8sRUFBZ0MsTUFBTSxxQkFBcUIsQ0FBQztBQUMxRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDM0UsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUU1RixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN0RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFJN0QsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sMEVBQTBFLENBQUM7QUFDdEgsT0FBTyxFQUFFLGlC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