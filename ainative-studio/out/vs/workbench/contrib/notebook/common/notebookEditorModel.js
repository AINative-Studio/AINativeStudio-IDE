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
var SimpleNotebookEditorModel_1;
import { streamToBuffer } from '../../../../base/common/buffer.js';
import { CancellationError } from '../../../../base/common/errors.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../base/common/network.js';
import { assertType } from '../../../../base/common/types.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { EditorModel } from '../../../common/editor/editorModel.js';
import { NotebookCellsChangeType, NotebookSetting } from './notebookCommon.js';
import { INotebookLoggingService } from './notebookLoggingService.js';
import { INotebookService, SimpleNotebookProviderInfo } from './notebookService.js';
import { IFilesConfigurationService } from '../../../services/filesConfiguration/common/filesConfigurationService.js';
//#region --- simple content provider
let SimpleNotebookEditorModel = SimpleNotebookEditorModel_1 = class SimpleNotebookEditorModel extends EditorModel {
    constructor(resource, _hasAssociatedFilePath, viewType, _workingCopyManager, scratchpad, _filesConfigurationService) {
        super();
        this.resource = resource;
        this._hasAssociatedFilePath = _hasAssociatedFilePath;
        this.viewType = viewType;
        this._workingCopyManager = _workingCopyManager;
        this._filesConfigurationService = _filesConfigurationService;
        this._onDidChangeDirty = this._register(new Emitter());
        this._onDidSave = this._register(new Emitter());
        this._onDidChangeOrphaned = this._register(new Emitter());
        this._onDidChangeReadonly = this._register(new Emitter());
        this._onDidRevertUntitled = this._register(new Emitter());
        this.onDidChangeDirty = this._onDidChangeDirty.event;
        this.onDidSave = this._onDidSave.event;
        this.onDidChangeOrphaned = this._onDidChangeOrphaned.event;
        this.onDidChangeReadonly = this._onDidChangeReadonly.event;
        this.onDidRevertUntitled = this._onDidRevertUntitled.event;
        this._workingCopyListeners = this._register(new DisposableStore());
        this.scratchPad = scratchpad;
    }
    dispose() {
        this._workingCopy?.dispose();
        super.dispose();
    }
    get notebook() {
        return this._workingCopy?.model?.notebookModel;
    }
    isResolved() {
        return Boolean(this._workingCopy?.model?.notebookModel);
    }
    async canDispose() {
        if (!this._workingCopy) {
            return true;
        }
        if (SimpleNotebookEditorModel_1._isStoredFileWorkingCopy(this._workingCopy)) {
            return this._workingCopyManager.stored.canDispose(this._workingCopy);
        }
        else {
            return true;
        }
    }
    isDirty() {
        return this._workingCopy?.isDirty() ?? false;
    }
    isModified() {
        return this._workingCopy?.isModified() ?? false;
    }
    isOrphaned() {
        return SimpleNotebookEditorModel_1._isStoredFileWorkingCopy(this._workingCopy) && this._workingCopy.hasState(4 /* StoredFileWorkingCopyState.ORPHAN */);
    }
    hasAssociatedFilePath() {
        return !SimpleNotebookEditorModel_1._isStoredFileWorkingCopy(this._workingCopy) && !!this._workingCopy?.hasAssociatedFilePath;
    }
    isReadonly() {
        if (SimpleNotebookEditorModel_1._isStoredFileWorkingCopy(this._workingCopy)) {
            return this._workingCopy?.isReadonly();
        }
        else {
            return this._filesConfigurationService.isReadonly(this.resource);
        }
    }
    get hasErrorState() {
        if (this._workingCopy && 'hasState' in this._workingCopy) {
            return this._workingCopy.hasState(5 /* StoredFileWorkingCopyState.ERROR */);
        }
        return false;
    }
    async revert(options) {
        assertType(this.isResolved());
        return this._workingCopy.revert(options);
    }
    async save(options) {
        assertType(this.isResolved());
        return this._workingCopy.save(options);
    }
    async load(options) {
        if (!this._workingCopy || !this._workingCopy.model) {
            if (this.resource.scheme === Schemas.untitled) {
                if (this._hasAssociatedFilePath) {
                    this._workingCopy = await this._workingCopyManager.resolve({ associatedResource: this.resource });
                }
                else {
                    this._workingCopy = await this._workingCopyManager.resolve({ untitledResource: this.resource, isScratchpad: this.scratchPad });
                }
                this._register(this._workingCopy.onDidRevert(() => this._onDidRevertUntitled.fire()));
            }
            else {
                this._workingCopy = await this._workingCopyManager.resolve(this.resource, {
                    limits: options?.limits,
                    reload: options?.forceReadFromFile ? { async: false, force: true } : undefined
                });
                this._workingCopyListeners.add(this._workingCopy.onDidSave(e => this._onDidSave.fire(e)));
                this._workingCopyListeners.add(this._workingCopy.onDidChangeOrphaned(() => this._onDidChangeOrphaned.fire()));
                this._workingCopyListeners.add(this._workingCopy.onDidChangeReadonly(() => this._onDidChangeReadonly.fire()));
            }
            this._workingCopyListeners.add(this._workingCopy.onDidChangeDirty(() => this._onDidChangeDirty.fire(), undefined));
            this._workingCopyListeners.add(this._workingCopy.onWillDispose(() => {
                this._workingCopyListeners.clear();
                this._workingCopy?.model?.dispose();
            }));
        }
        else {
            await this._workingCopyManager.resolve(this.resource, {
                reload: {
                    async: !options?.forceReadFromFile,
                    force: options?.forceReadFromFile
                },
                limits: options?.limits
            });
        }
        assertType(this.isResolved());
        return this;
    }
    async saveAs(target) {
        const newWorkingCopy = await this._workingCopyManager.saveAs(this.resource, target);
        if (!newWorkingCopy) {
            return undefined;
        }
        // this is a little hacky because we leave the new working copy alone. BUT
        // the newly created editor input will pick it up and claim ownership of it.
        return { resource: newWorkingCopy.resource };
    }
    static _isStoredFileWorkingCopy(candidate) {
        const isUntitled = candidate && candidate.capabilities & 2 /* WorkingCopyCapabilities.Untitled */;
        return !isUntitled;
    }
};
SimpleNotebookEditorModel = SimpleNotebookEditorModel_1 = __decorate([
    __param(5, IFilesConfigurationService)
], SimpleNotebookEditorModel);
export { SimpleNotebookEditorModel };
export class NotebookFileWorkingCopyModel extends Disposable {
    constructor(_notebookModel, _notebookService, _configurationService, _telemetryService, _notebookLogService) {
        super();
        this._notebookModel = _notebookModel;
        this._notebookService = _notebookService;
        this._configurationService = _configurationService;
        this._telemetryService = _telemetryService;
        this._notebookLogService = _notebookLogService;
        this._onDidChangeContent = this._register(new Emitter());
        this.onDidChangeContent = this._onDidChangeContent.event;
        this.configuration = undefined;
        this.onWillDispose = _notebookModel.onWillDispose.bind(_notebookModel);
        this._register(_notebookModel.onDidChangeContent(e => {
            for (const rawEvent of e.rawEvents) {
                if (rawEvent.kind === NotebookCellsChangeType.Initialize) {
                    continue;
                }
                if (rawEvent.transient) {
                    continue;
                }
                this._onDidChangeContent.fire({
                    isRedoing: false, //todo@rebornix forward this information from notebook model
                    isUndoing: false,
                    isInitial: false, //_notebookModel.cells.length === 0 // todo@jrieken non transient metadata?
                });
                break;
            }
        }));
        const saveWithReducedCommunication = this._configurationService.getValue(NotebookSetting.remoteSaving);
        if (saveWithReducedCommunication || _notebookModel.uri.scheme === Schemas.vscodeRemote) {
            this.configuration = {
                // Intentionally pick a larger delay for triggering backups to allow auto-save
                // to complete first on the optimized save path
                backupDelay: 10000
            };
        }
        // Override save behavior to avoid transferring the buffer across the wire 3 times
        if (saveWithReducedCommunication) {
            this.setSaveDelegate().catch(console.error);
        }
    }
    async setSaveDelegate() {
        // make sure we wait for a serializer to resolve before we try to handle saves in the EH
        await this.getNotebookSerializer();
        this.save = async (options, token) => {
            try {
                let serializer = this._notebookService.tryGetDataProviderSync(this.notebookModel.viewType)?.serializer;
                if (!serializer) {
                    this._notebookLogService.info('WorkingCopyModel', 'No serializer found for notebook model, checking if provider still needs to be resolved');
                    serializer = await this.getNotebookSerializer();
                }
                if (token.isCancellationRequested) {
                    throw new CancellationError();
                }
                const stat = await serializer.save(this._notebookModel.uri, this._notebookModel.versionId, options, token);
                return stat;
            }
            catch (error) {
                if (!token.isCancellationRequested) {
                    const isIPynb = this._notebookModel.viewType === 'jupyter-notebook' || this._notebookModel.viewType === 'interactive';
                    this._telemetryService.publicLogError2('notebook/SaveError', {
                        isRemote: this._notebookModel.uri.scheme === Schemas.vscodeRemote,
                        isIPyNbWorkerSerializer: isIPynb && this._configurationService.getValue('ipynb.experimental.serialization'),
                        error: error
                    });
                }
                throw error;
            }
        };
    }
    dispose() {
        this._notebookModel.dispose();
        super.dispose();
    }
    get notebookModel() {
        return this._notebookModel;
    }
    async snapshot(context, token) {
        return this._notebookService.createNotebookTextDocumentSnapshot(this._notebookModel.uri, context, token);
    }
    async update(stream, token) {
        const serializer = await this.getNotebookSerializer();
        const bytes = await streamToBuffer(stream);
        const data = await serializer.dataToNotebook(bytes);
        if (token.isCancellationRequested) {
            throw new CancellationError();
        }
        this._notebookLogService.info('WorkingCopyModel', 'Notebook content updated from file system - ' + this._notebookModel.uri.toString());
        this._notebookModel.reset(data.cells, data.metadata, serializer.options);
    }
    async getNotebookSerializer() {
        const info = await this._notebookService.withNotebookDataProvider(this.notebookModel.viewType);
        if (!(info instanceof SimpleNotebookProviderInfo)) {
            throw new Error('CANNOT open file notebook with this provider');
        }
        return info.serializer;
    }
    get versionId() {
        return this._notebookModel.alternativeVersionId;
    }
    pushStackElement() {
        this._notebookModel.pushStackElement();
    }
}
let NotebookFileWorkingCopyModelFactory = class NotebookFileWorkingCopyModelFactory {
    constructor(_viewType, _notebookService, _configurationService, _telemetryService, _notebookLogService) {
        this._viewType = _viewType;
        this._notebookService = _notebookService;
        this._configurationService = _configurationService;
        this._telemetryService = _telemetryService;
        this._notebookLogService = _notebookLogService;
    }
    async createModel(resource, stream, token) {
        const notebookModel = this._notebookService.getNotebookTextModel(resource) ??
            await this._notebookService.createNotebookTextModel(this._viewType, resource, stream);
        return new NotebookFileWorkingCopyModel(notebookModel, this._notebookService, this._configurationService, this._telemetryService, this._notebookLogService);
    }
};
NotebookFileWorkingCopyModelFactory = __decorate([
    __param(1, INotebookService),
    __param(2, IConfigurationService),
    __param(3, ITelemetryService),
    __param(4, INotebookLoggingService)
], NotebookFileWorkingCopyModelFactory);
export { NotebookFileWorkingCopyModelFactory };
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tFZGl0b3JNb2RlbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9jb21tb24vbm90ZWJvb2tFZGl0b3JNb2RlbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUEwQixjQUFjLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUUzRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN0RSxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUM7QUFFbEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNuRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDN0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBRTlELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBRW5HLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBRXZGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUVwRSxPQUFPLEVBQTRFLHVCQUF1QixFQUFFLGVBQWUsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBQ3pKLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ3RFLE9BQU8sRUFBdUIsZ0JBQWdCLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQztBQUN6RyxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSwwRUFBMEUsQ0FBQztBQU90SCxxQ0FBcUM7QUFFOUIsSUFBTSx5QkFBeUIsaUNBQS9CLE1BQU0seUJB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