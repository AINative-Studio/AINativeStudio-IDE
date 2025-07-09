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
import { createDecorator, IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { AsyncEmitter } from '../../../../base/common/event.js';
import { Promises } from '../../../../base/common/async.js';
import { insert } from '../../../../base/common/arrays.js';
import { Disposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { IWorkingCopyService } from './workingCopyService.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { WorkingCopyFileOperationParticipant } from './workingCopyFileOperationParticipant.js';
import { StoredFileWorkingCopySaveParticipant } from './storedFileWorkingCopySaveParticipant.js';
export const IWorkingCopyFileService = createDecorator('workingCopyFileService');
let WorkingCopyFileService = class WorkingCopyFileService extends Disposable {
    constructor(fileService, workingCopyService, instantiationService, uriIdentityService) {
        super();
        this.fileService = fileService;
        this.workingCopyService = workingCopyService;
        this.uriIdentityService = uriIdentityService;
        //#region Events
        this._onWillRunWorkingCopyFileOperation = this._register(new AsyncEmitter());
        this.onWillRunWorkingCopyFileOperation = this._onWillRunWorkingCopyFileOperation.event;
        this._onDidFailWorkingCopyFileOperation = this._register(new AsyncEmitter());
        this.onDidFailWorkingCopyFileOperation = this._onDidFailWorkingCopyFileOperation.event;
        this._onDidRunWorkingCopyFileOperation = this._register(new AsyncEmitter());
        this.onDidRunWorkingCopyFileOperation = this._onDidRunWorkingCopyFileOperation.event;
        //#endregion
        this.correlationIds = 0;
        //#endregion
        //#region Path related
        this.workingCopyProviders = [];
        this.fileOperationParticipants = this._register(instantiationService.createInstance(WorkingCopyFileOperationParticipant));
        this.saveParticipants = this._register(instantiationService.createInstance(StoredFileWorkingCopySaveParticipant));
        // register a default working copy provider that uses the working copy service
        this._register(this.registerWorkingCopyProvider(resource => {
            return this.workingCopyService.workingCopies.filter(workingCopy => {
                if (this.fileService.hasProvider(resource)) {
                    // only check for parents if the resource can be handled
                    // by the file system where we then assume a folder like
                    // path structure
                    return this.uriIdentityService.extUri.isEqualOrParent(workingCopy.resource, resource);
                }
                return this.uriIdentityService.extUri.isEqual(workingCopy.resource, resource);
            });
        }));
    }
    //#region File operations
    create(operations, token, undoInfo) {
        return this.doCreateFileOrFolder(operations, true, token, undoInfo);
    }
    createFolder(operations, token, undoInfo) {
        return this.doCreateFileOrFolder(operations, false, token, undoInfo);
    }
    async doCreateFileOrFolder(operations, isFile, token, undoInfo) {
        if (operations.length === 0) {
            return [];
        }
        // validate create operation before starting
        if (isFile) {
            const validateCreates = await Promises.settled(operations.map(operation => this.fileService.canCreateFile(operation.resource, { overwrite: operation.overwrite })));
            const error = validateCreates.find(validateCreate => validateCreate instanceof Error);
            if (error instanceof Error) {
                throw error;
            }
        }
        // file operation participant
        const files = operations.map(operation => ({ target: operation.resource }));
        await this.runFileOperationParticipants(files, 0 /* FileOperation.CREATE */, undoInfo, token);
        // before events
        const event = { correlationId: this.correlationIds++, operation: 0 /* FileOperation.CREATE */, files };
        await this._onWillRunWorkingCopyFileOperation.fireAsync(event, CancellationToken.None /* intentional: we currently only forward cancellation to participants */);
        // now actually create on disk
        let stats;
        try {
            if (isFile) {
                stats = await Promises.settled(operations.map(operation => this.fileService.createFile(operation.resource, operation.contents, { overwrite: operation.overwrite })));
            }
            else {
                stats = await Promises.settled(operations.map(operation => this.fileService.createFolder(operation.resource)));
            }
        }
        catch (error) {
            // error event
            await this._onDidFailWorkingCopyFileOperation.fireAsync(event, CancellationToken.None /* intentional: we currently only forward cancellation to participants */);
            throw error;
        }
        // after event
        await this._onDidRunWorkingCopyFileOperation.fireAsync(event, CancellationToken.None /* intentional: we currently only forward cancellation to participants */);
        return stats;
    }
    async move(operations, token, undoInfo) {
        return this.doMoveOrCopy(operations, true, token, undoInfo);
    }
    async copy(operations, token, undoInfo) {
        return this.doMoveOrCopy(operations, false, token, undoInfo);
    }
    async doMoveOrCopy(operations, move, token, undoInfo) {
        const stats = [];
        // validate move/copy operation before starting
        for (const { file: { source, target }, overwrite } of operations) {
            const validateMoveOrCopy = await (move ? this.fileService.canMove(source, target, overwrite) : this.fileService.canCopy(source, target, overwrite));
            if (validateMoveOrCopy instanceof Error) {
                throw validateMoveOrCopy;
            }
        }
        // file operation participant
        const files = operations.map(o => o.file);
        await this.runFileOperationParticipants(files, move ? 2 /* FileOperation.MOVE */ : 3 /* FileOperation.COPY */, undoInfo, token);
        // before event
        const event = { correlationId: this.correlationIds++, operation: move ? 2 /* FileOperation.MOVE */ : 3 /* FileOperation.COPY */, files };
        await this._onWillRunWorkingCopyFileOperation.fireAsync(event, CancellationToken.None /* intentional: we currently only forward cancellation to participants */);
        try {
            for (const { file: { source, target }, overwrite } of operations) {
                // if source and target are not equal, handle dirty working copies
                // depending on the operation:
                // - move: revert both source and target (if any)
                // - copy: revert target (if any)
                if (!this.uriIdentityService.extUri.isEqual(source, target)) {
                    const dirtyWorkingCopies = (move ? [...this.getDirty(source), ...this.getDirty(target)] : this.getDirty(target));
                    await Promises.settled(dirtyWorkingCopies.map(dirtyWorkingCopy => dirtyWorkingCopy.revert({ soft: true })));
                }
                // now we can rename the source to target via file operation
                if (move) {
                    stats.push(await this.fileService.move(source, target, overwrite));
                }
                else {
                    stats.push(await this.fileService.copy(source, target, overwrite));
                }
            }
        }
        catch (error) {
            // error event
            await this._onDidFailWorkingCopyFileOperation.fireAsync(event, CancellationToken.None /* intentional: we currently only forward cancellation to participants */);
            throw error;
        }
        // after event
        await this._onDidRunWorkingCopyFileOperation.fireAsync(event, CancellationToken.None /* intentional: we currently only forward cancellation to participants */);
        return stats;
    }
    async delete(operations, token, undoInfo) {
        // validate delete operation before starting
        for (const operation of operations) {
            const validateDelete = await this.fileService.canDelete(operation.resource, { recursive: operation.recursive, useTrash: operation.useTrash });
            if (validateDelete instanceof Error) {
                throw validateDelete;
            }
        }
        // file operation participant
        const files = operations.map(operation => ({ target: operation.resource }));
        await this.runFileOperationParticipants(files, 1 /* FileOperation.DELETE */, undoInfo, token);
        // before events
        const event = { correlationId: this.correlationIds++, operation: 1 /* FileOperation.DELETE */, files };
        await this._onWillRunWorkingCopyFileOperation.fireAsync(event, CancellationToken.None /* intentional: we currently only forward cancellation to participants */);
        // check for any existing dirty working copies for the resource
        // and do a soft revert before deleting to be able to close
        // any opened editor with these working copies
        for (const operation of operations) {
            const dirtyWorkingCopies = this.getDirty(operation.resource);
            await Promises.settled(dirtyWorkingCopies.map(dirtyWorkingCopy => dirtyWorkingCopy.revert({ soft: true })));
        }
        // now actually delete from disk
        try {
            for (const operation of operations) {
                await this.fileService.del(operation.resource, { recursive: operation.recursive, useTrash: operation.useTrash });
            }
        }
        catch (error) {
            // error event
            await this._onDidFailWorkingCopyFileOperation.fireAsync(event, CancellationToken.None /* intentional: we currently only forward cancellation to participants */);
            throw error;
        }
        // after event
        await this._onDidRunWorkingCopyFileOperation.fireAsync(event, CancellationToken.None /* intentional: we currently only forward cancellation to participants */);
    }
    addFileOperationParticipant(participant) {
        return this.fileOperationParticipants.addFileOperationParticipant(participant);
    }
    runFileOperationParticipants(files, operation, undoInfo, token) {
        return this.fileOperationParticipants.participate(files, operation, undoInfo, token);
    }
    get hasSaveParticipants() { return this.saveParticipants.length > 0; }
    addSaveParticipant(participant) {
        return this.saveParticipants.addSaveParticipant(participant);
    }
    runSaveParticipants(workingCopy, context, progress, token) {
        return this.saveParticipants.participate(workingCopy, context, progress, token);
    }
    registerWorkingCopyProvider(provider) {
        const remove = insert(this.workingCopyProviders, provider);
        return toDisposable(remove);
    }
    getDirty(resource) {
        const dirtyWorkingCopies = new Set();
        for (const provider of this.workingCopyProviders) {
            for (const workingCopy of provider(resource)) {
                if (workingCopy.isDirty()) {
                    dirtyWorkingCopies.add(workingCopy);
                }
            }
        }
        return Array.from(dirtyWorkingCopies);
    }
};
WorkingCopyFileService = __decorate([
    __param(0, IFileService),
    __param(1, IWorkingCopyService),
    __param(2, IInstantiationService),
    __param(3, IUriIdentityService)
], WorkingCopyFileService);
export { WorkingCopyFileService };
registerSingleton(IWorkingCopyFileService, WorkingCopyFileService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2luZ0NvcHlGaWxlU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvd29ya2luZ0NvcHkvY29tbW9uL3dvcmtpbmdDb3B5RmlsZVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ3BILE9BQU8sRUFBcUIsaUJBQWlCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUMvRyxPQUFPLEVBQVMsWUFBWSxFQUFjLE1BQU0sa0NBQWtDLENBQUM7QUFDbkYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUUzRCxPQUFPLEVBQUUsVUFBVSxFQUFlLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzdGLE9BQU8sRUFBRSxZQUFZLEVBQXdDLE1BQU0sNENBQTRDLENBQUM7QUFDaEgsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDNUUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFFOUQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDN0YsT0FBTyxFQUFFLG1DQUFtQyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFJL0YsT0FBTyxFQUFFLG9DQUFvQyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFHakcsTUFBTSxDQUFDLE1BQU0sdUJBQXVCLEdBQUcsZUFBZSxDQUEwQix3QkFBd0IsQ0FBQyxDQUFDO0FBeVFuRyxJQUFNLHNCQUFzQixHQUE1QixNQUFNLHNC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