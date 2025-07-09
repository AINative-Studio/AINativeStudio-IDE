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
import { Emitter } from '../../../../base/common/event.js';
import { Disposable, dispose } from '../../../../base/common/lifecycle.js';
import { ResourceMap } from '../../../../base/common/map.js';
import { Promises } from '../../../../base/common/async.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IWorkingCopyBackupService } from './workingCopyBackup.js';
let BaseFileWorkingCopyManager = class BaseFileWorkingCopyManager extends Disposable {
    constructor(fileService, logService, workingCopyBackupService) {
        super();
        this.fileService = fileService;
        this.logService = logService;
        this.workingCopyBackupService = workingCopyBackupService;
        this._onDidCreate = this._register(new Emitter());
        this.onDidCreate = this._onDidCreate.event;
        this.mapResourceToWorkingCopy = new ResourceMap();
        this.mapResourceToDisposeListener = new ResourceMap();
    }
    has(resource) {
        return this.mapResourceToWorkingCopy.has(resource);
    }
    add(resource, workingCopy) {
        const knownWorkingCopy = this.get(resource);
        if (knownWorkingCopy === workingCopy) {
            return; // already cached
        }
        // Add to our working copy map
        this.mapResourceToWorkingCopy.set(resource, workingCopy);
        // Update our dispose listener to remove it on dispose
        this.mapResourceToDisposeListener.get(resource)?.dispose();
        this.mapResourceToDisposeListener.set(resource, workingCopy.onWillDispose(() => this.remove(resource)));
        // Signal creation event
        this._onDidCreate.fire(workingCopy);
    }
    remove(resource) {
        // Dispose any existing listener
        const disposeListener = this.mapResourceToDisposeListener.get(resource);
        if (disposeListener) {
            dispose(disposeListener);
            this.mapResourceToDisposeListener.delete(resource);
        }
        // Remove from our working copy map
        return this.mapResourceToWorkingCopy.delete(resource);
    }
    //#region Get / Get all
    get workingCopies() {
        return [...this.mapResourceToWorkingCopy.values()];
    }
    get(resource) {
        return this.mapResourceToWorkingCopy.get(resource);
    }
    //#endregion
    //#region Lifecycle
    dispose() {
        super.dispose();
        // Clear working copy caches
        //
        // Note: we are not explicitly disposing the working copies
        // known to the manager because this can have unwanted side
        // effects such as backups getting discarded once the working
        // copy unregisters. We have an explicit `destroy`
        // for that purpose (https://github.com/microsoft/vscode/pull/123555)
        //
        this.mapResourceToWorkingCopy.clear();
        // Dispose the dispose listeners
        dispose(this.mapResourceToDisposeListener.values());
        this.mapResourceToDisposeListener.clear();
    }
    async destroy() {
        // Make sure all dirty working copies are saved to disk
        try {
            await Promises.settled(this.workingCopies.map(async (workingCopy) => {
                if (workingCopy.isDirty()) {
                    await this.saveWithFallback(workingCopy);
                }
            }));
        }
        catch (error) {
            this.logService.error(error);
        }
        // Dispose all working copies
        dispose(this.mapResourceToWorkingCopy.values());
        // Finally dispose manager
        this.dispose();
    }
    async saveWithFallback(workingCopy) {
        // First try regular save
        let saveSuccess = false;
        try {
            saveSuccess = await workingCopy.save();
        }
        catch (error) {
            // Ignore
        }
        // Then fallback to backup if that exists
        if (!saveSuccess || workingCopy.isDirty()) {
            const backup = await this.workingCopyBackupService.resolve(workingCopy);
            if (backup) {
                await this.fileService.writeFile(workingCopy.resource, backup.value, { unlock: true });
            }
        }
    }
};
BaseFileWorkingCopyManager = __decorate([
    __param(0, IFileService),
    __param(1, ILogService),
    __param(2, IWorkingCopyBackupService)
], BaseFileWorkingCopyManager);
export { BaseFileWorkingCopyManager };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWJzdHJhY3RGaWxlV29ya2luZ0NvcHlNYW5hZ2VyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy93b3JraW5nQ29weS9jb21tb24vYWJzdHJhY3RGaWxlV29ya2luZ0NvcHlNYW5hZ2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxrQ0FBa0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE9BQU8sRUFBZSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3hGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUM3RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDNUQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBRTFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNyRSxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQWtDNUQsSUFBZSwwQkFBMEIsR0FBekMsTUFBZSwwQkFBMkYsU0FBUSxVQUFVO0lBUWxJLFlBQ2UsV0FBNEMsRUFDN0MsVUFBMEMsRUFDNUIsd0JBQXNFO1FBRWpHLEtBQUssRUFBRSxDQUFDO1FBSnlCLGdCQUFXLEdBQVgsV0FBVyxDQUFjO1FBQzFCLGVBQVUsR0FBVixVQUFVLENBQWE7UUFDVCw2QkFBd0IsR0FBeEIsd0JBQXdCLENBQTJCO1FBVGpGLGlCQUFZLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBSyxDQUFDLENBQUM7UUFDeEQsZ0JBQVcsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQztRQUU5Qiw2QkFBd0Is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