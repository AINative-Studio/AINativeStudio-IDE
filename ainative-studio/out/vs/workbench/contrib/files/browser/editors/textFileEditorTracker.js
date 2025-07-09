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
import { ITextFileService } from '../../../../services/textfile/common/textfiles.js';
import { ILifecycleService } from '../../../../services/lifecycle/common/lifecycle.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { distinct, coalesce } from '../../../../../base/common/arrays.js';
import { IHostService } from '../../../../services/host/browser/host.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { RunOnceWorker } from '../../../../../base/common/async.js';
import { ICodeEditorService } from '../../../../../editor/browser/services/codeEditorService.js';
import { IFilesConfigurationService } from '../../../../services/filesConfiguration/common/filesConfigurationService.js';
import { FILE_EDITOR_INPUT_ID } from '../../common/files.js';
import { Schemas } from '../../../../../base/common/network.js';
import { UntitledTextEditorInput } from '../../../../services/untitled/common/untitledTextEditorInput.js';
import { IWorkingCopyEditorService } from '../../../../services/workingCopy/common/workingCopyEditorService.js';
import { DEFAULT_EDITOR_ASSOCIATION } from '../../../../common/editor.js';
let TextFileEditorTracker = class TextFileEditorTracker extends Disposable {
    static { this.ID = 'workbench.contrib.textFileEditorTracker'; }
    constructor(editorService, textFileService, lifecycleService, hostService, codeEditorService, filesConfigurationService, workingCopyEditorService) {
        super();
        this.editorService = editorService;
        this.textFileService = textFileService;
        this.lifecycleService = lifecycleService;
        this.hostService = hostService;
        this.codeEditorService = codeEditorService;
        this.filesConfigurationService = filesConfigurationService;
        this.workingCopyEditorService = workingCopyEditorService;
        //#region Text File: Ensure every dirty text and untitled file is opened in an editor
        this.ensureDirtyFilesAreOpenedWorker = this._register(new RunOnceWorker(units => this.ensureDirtyTextFilesAreOpened(units), this.getDirtyTextFileTrackerDelay()));
        this.registerListeners();
    }
    registerListeners() {
        // Ensure dirty text file and untitled models are always opened as editors
        this._register(this.textFileService.files.onDidChangeDirty(model => this.ensureDirtyFilesAreOpenedWorker.work(model.resource)));
        this._register(this.textFileService.files.onDidSaveError(model => this.ensureDirtyFilesAreOpenedWorker.work(model.resource)));
        this._register(this.textFileService.untitled.onDidChangeDirty(model => this.ensureDirtyFilesAreOpenedWorker.work(model.resource)));
        // Update visible text file editors when focus is gained
        this._register(this.hostService.onDidChangeFocus(hasFocus => hasFocus ? this.reloadVisibleTextFileEditors() : undefined));
        // Lifecycle
        this._register(this.lifecycleService.onDidShutdown(() => this.dispose()));
    }
    getDirtyTextFileTrackerDelay() {
        return 800; // encapsulated in a method for tests to override
    }
    ensureDirtyTextFilesAreOpened(resources) {
        this.doEnsureDirtyTextFilesAreOpened(distinct(resources.filter(resource => {
            if (!this.textFileService.isDirty(resource)) {
                return false; // resource must be dirty
            }
            const fileModel = this.textFileService.files.get(resource);
            if (fileModel?.hasState(2 /* TextFileEditorModelState.PENDING_SAVE */)) {
                return false; // resource must not be pending to save
            }
            if (resource.scheme !== Schemas.untitled && !fileModel?.hasState(5 /* TextFileEditorModelState.ERROR */) && this.filesConfigurationService.hasShortAutoSaveDelay(resource)) {
                // leave models auto saved after short delay unless
                // the save resulted in an error and not for untitled
                // that are not auto-saved anyway
                return false;
            }
            if (this.editorService.isOpened({ resource, typeId: resource.scheme === Schemas.untitled ? UntitledTextEditorInput.ID : FILE_EDITOR_INPUT_ID, editorId: DEFAULT_EDITOR_ASSOCIATION.id })) {
                return false; // model must not be opened already as file (fast check via editor type)
            }
            const model = fileModel ?? this.textFileService.untitled.get(resource);
            if (model && this.workingCopyEditorService.findEditor(model)) {
                return false; // model must not be opened already as file (slower check via working copy)
            }
            return true;
        }), resource => resource.toString()));
    }
    doEnsureDirtyTextFilesAreOpened(resources) {
        if (!resources.length) {
            return;
        }
        this.editorService.openEditors(resources.map(resource => ({
            resource,
            options: { inactive: true, pinned: true, preserveFocus: true }
        })));
    }
    //#endregion
    //#region Window Focus Change: Update visible code editors when focus is gained that have a known text file model
    reloadVisibleTextFileEditors() {
        // the window got focus and we use this as a hint that files might have been changed outside
        // of this window. since file events can be unreliable, we queue a load for models that
        // are visible in any editor. since this is a fast operation in the case nothing has changed,
        // we tolerate the additional work.
        distinct(coalesce(this.codeEditorService.listCodeEditors()
            .map(codeEditor => {
            const resource = codeEditor.getModel()?.uri;
            if (!resource) {
                return undefined;
            }
            const model = this.textFileService.files.get(resource);
            if (!model || model.isDirty() || !model.isResolved()) {
                return undefined;
            }
            return model;
        })), model => model.resource.toString()).forEach(model => this.textFileService.files.resolve(model.resource, { reload: { async: true } }));
    }
};
TextFileEditorTracker = __decorate([
    __param(0, IEditorService),
    __param(1, ITextFileService),
    __param(2, ILifecycleService),
    __param(3, IHostService),
    __param(4, ICodeEditorService),
    __param(5, IFilesConfigurationService),
    __param(6, IWorkingCopyEditorService)
], TextFileEditorTracker);
export { TextFileEditorTracker };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dEZpbGVFZGl0b3JUcmFja2VyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2ZpbGVzL2Jyb3dzZXIvZWRpdG9ycy90ZXh0RmlsZUVkaXRvclRyYWNrZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFJaEcsT0FBTyxFQUFFLGdCQUFnQixFQUE0QixNQUFNLG1EQUFtRCxDQUFDO0FBQy9HLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNyRSxPQUFPLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUN6RSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0scURBQXFELENBQUM7QUFDckYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDZEQUE2RCxDQUFDO0FBQ2pHLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLDZFQUE2RSxDQUFDO0FBQ3pILE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQzdELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNoRSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQztBQUMxRyxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxxRUFBcUUsQ0FBQztBQUNoSCxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUVuRSxJQUFNLHFCQUFx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