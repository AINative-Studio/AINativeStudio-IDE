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
import { timeout } from '../../../../base/common/async.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IFileService } from '../../../../platform/files/common/files.js';
let ResourceWorkingCopy = class ResourceWorkingCopy extends Disposable {
    constructor(resource, fileService) {
        super();
        this.resource = resource;
        this.fileService = fileService;
        //#region Orphaned Tracking
        this._onDidChangeOrphaned = this._register(new Emitter());
        this.onDidChangeOrphaned = this._onDidChangeOrphaned.event;
        this.orphaned = false;
        //#endregion
        //#region Dispose
        this._onWillDispose = this._register(new Emitter());
        this.onWillDispose = this._onWillDispose.event;
        this._register(this.fileService.onDidFilesChange(e => this.onDidFilesChange(e)));
    }
    isOrphaned() {
        return this.orphaned;
    }
    async onDidFilesChange(e) {
        let fileEventImpactsUs = false;
        let newInOrphanModeGuess;
        // If we are currently orphaned, we check if the file was added back
        if (this.orphaned) {
            const fileWorkingCopyResourceAdded = e.contains(this.resource, 1 /* FileChangeType.ADDED */);
            if (fileWorkingCopyResourceAdded) {
                newInOrphanModeGuess = false;
                fileEventImpactsUs = true;
            }
        }
        // Otherwise we check if the file was deleted
        else {
            const fileWorkingCopyResourceDeleted = e.contains(this.resource, 2 /* FileChangeType.DELETED */);
            if (fileWorkingCopyResourceDeleted) {
                newInOrphanModeGuess = true;
                fileEventImpactsUs = true;
            }
        }
        if (fileEventImpactsUs && this.orphaned !== newInOrphanModeGuess) {
            let newInOrphanModeValidated = false;
            if (newInOrphanModeGuess) {
                // We have received reports of users seeing delete events even though the file still
                // exists (network shares issue: https://github.com/microsoft/vscode/issues/13665).
                // Since we do not want to mark the working copy as orphaned, we have to check if the
                // file is really gone and not just a faulty file event.
                await timeout(100, CancellationToken.None);
                if (this.isDisposed()) {
                    newInOrphanModeValidated = true;
                }
                else {
                    const exists = await this.fileService.exists(this.resource);
                    newInOrphanModeValidated = !exists;
                }
            }
            if (this.orphaned !== newInOrphanModeValidated && !this.isDisposed()) {
                this.setOrphaned(newInOrphanModeValidated);
            }
        }
    }
    setOrphaned(orphaned) {
        if (this.orphaned !== orphaned) {
            this.orphaned = orphaned;
            this._onDidChangeOrphaned.fire();
        }
    }
    isDisposed() {
        return this._store.isDisposed;
    }
    dispose() {
        // State
        this.orphaned = false;
        // Event
        this._onWillDispose.fire();
        super.dispose();
    }
    //#endregion
    //#region Modified Tracking
    isModified() {
        return this.isDirty();
    }
};
ResourceWorkingCopy = __decorate([
    __param(1, IFileService)
], ResourceWorkingCopy);
export { ResourceWorkingCopy };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVzb3VyY2VXb3JraW5nQ29weS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvd29ya2luZ0NvcHkvY29tbW9uL3Jlc291cmNlV29ya2luZ0NvcHkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzVFLE9BQU8sRUFBUyxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsVUFBVSxFQUFlLE1BQU0sc0NBQXNDLENBQUM7QUFFL0UsT0FBTyxFQUFvQyxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQStCckcsSUFBZSxtQkFBbUIsR0FBbEMsTUFBZSxtQkFBb0IsU0FBUSxVQUFVO0lBRTNELFlBQ1UsUUFBYSxFQUNSLFdBQTRDO1FBRTFELEtBQUssRUFBRSxDQUFDO1FBSEMsYUFBUSxHQUFSLFFBQVEsQ0FBSztRQUNXLGdCQUFXLEdBQVgsV0FBVyxDQUFjO1FBTzNELDJCQUEyQjtRQUVWLHlCQUFvQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVEsQ0FBQyxDQUFDO1FBQ25FLHdCQUFtQixHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxLQUFLLENBQUM7UUFFdkQsYUFBUSxHQUFHLEtBQUssQ0FBQztRQTREekIsWUFBWTtRQUdaLGlCQUFpQjtRQUVBLG1CQUFjLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBUSxDQUFDLENBQUM7UUFDN0Qsa0JBQWEsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQztRQTFF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