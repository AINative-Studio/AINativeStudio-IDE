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
import { DisposableStore, dispose } from '../../../../base/common/lifecycle.js';
import { URI } from '../../../../base/common/uri.js';
import { UntitledFileWorkingCopy } from './untitledFileWorkingCopy.js';
import { Emitter } from '../../../../base/common/event.js';
import { Schemas } from '../../../../base/common/network.js';
import { IWorkingCopyService } from './workingCopyService.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IWorkingCopyBackupService } from './workingCopyBackup.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { BaseFileWorkingCopyManager } from './abstractFileWorkingCopyManager.js';
import { ResourceMap } from '../../../../base/common/map.js';
let UntitledFileWorkingCopyManager = class UntitledFileWorkingCopyManager extends BaseFileWorkingCopyManager {
    constructor(workingCopyTypeId, modelFactory, saveDelegate, fileService, labelService, logService, workingCopyBackupService, workingCopyService) {
        super(fileService, logService, workingCopyBackupService);
        this.workingCopyTypeId = workingCopyTypeId;
        this.modelFactory = modelFactory;
        this.saveDelegate = saveDelegate;
        this.labelService = labelService;
        this.workingCopyService = workingCopyService;
        //#region Events
        this._onDidSave = this._register(new Emitter());
        this.onDidSave = this._onDidSave.event;
        this._onDidChangeDirty = this._register(new Emitter());
        this.onDidChangeDirty = this._onDidChangeDirty.event;
        this._onWillDispose = this._register(new Emitter());
        this.onWillDispose = this._onWillDispose.event;
        //#endregion
        this.mapResourceToWorkingCopyListeners = new ResourceMap();
    }
    async resolve(options) {
        const workingCopy = this.doCreateOrGet(options);
        await workingCopy.resolve();
        return workingCopy;
    }
    doCreateOrGet(options = Object.create(null)) {
        const massagedOptions = this.massageOptions(options);
        // Return existing instance if asked for it
        if (massagedOptions.untitledResource) {
            const existingWorkingCopy = this.get(massagedOptions.untitledResource);
            if (existingWorkingCopy) {
                return existingWorkingCopy;
            }
        }
        // Create new instance otherwise
        return this.doCreate(massagedOptions);
    }
    massageOptions(options) {
        const massagedOptions = Object.create(null);
        // Handle associated resource
        if (options.associatedResource) {
            massagedOptions.untitledResource = URI.from({
                scheme: Schemas.untitled,
                authority: options.associatedResource.authority,
                fragment: options.associatedResource.fragment,
                path: options.associatedResource.path,
                query: options.associatedResource.query
            });
            massagedOptions.associatedResource = options.associatedResource;
        }
        // Handle untitled resource
        else {
            if (options.untitledResource?.scheme === Schemas.untitled) {
                massagedOptions.untitledResource = options.untitledResource;
            }
            massagedOptions.isScratchpad = options.isScratchpad;
        }
        // Take over initial value
        massagedOptions.contents = options.contents;
        return massagedOptions;
    }
    doCreate(options) {
        // Create a new untitled resource if none is provided
        let untitledResource = options.untitledResource;
        if (!untitledResource) {
            let counter = 1;
            do {
                untitledResource = URI.from({
                    scheme: Schemas.untitled,
                    path: options.isScratchpad ? `Scratchpad-${counter}` : `Untitled-${counter}`,
                    query: this.workingCopyTypeId ?
                        `typeId=${this.workingCopyTypeId}` : // distinguish untitled resources among others by encoding the `typeId` as query param
                        undefined // keep untitled resources for text files as they are (when `typeId === ''`)
                });
                counter++;
            } while (this.has(untitledResource));
        }
        // Create new working copy with provided options
        const workingCopy = new UntitledFileWorkingCopy(this.workingCopyTypeId, untitledResource, this.labelService.getUriBasenameLabel(untitledResource), !!options.associatedResource, !!options.isScratchpad, options.contents, this.modelFactory, this.saveDelegate, this.workingCopyService, this.workingCopyBackupService, this.logService);
        // Register
        this.registerWorkingCopy(workingCopy);
        return workingCopy;
    }
    registerWorkingCopy(workingCopy) {
        // Install working copy listeners
        const workingCopyListeners = new DisposableStore();
        workingCopyListeners.add(workingCopy.onDidChangeDirty(() => this._onDidChangeDirty.fire(workingCopy)));
        workingCopyListeners.add(workingCopy.onWillDispose(() => this._onWillDispose.fire(workingCopy)));
        // Keep for disposal
        this.mapResourceToWorkingCopyListeners.set(workingCopy.resource, workingCopyListeners);
        // Add to cache
        this.add(workingCopy.resource, workingCopy);
        // If the working copy is dirty right from the beginning,
        // make sure to emit this as an event
        if (workingCopy.isDirty()) {
            this._onDidChangeDirty.fire(workingCopy);
        }
    }
    remove(resource) {
        const removed = super.remove(resource);
        // Dispose any existing working copy listeners
        const workingCopyListener = this.mapResourceToWorkingCopyListeners.get(resource);
        if (workingCopyListener) {
            dispose(workingCopyListener);
            this.mapResourceToWorkingCopyListeners.delete(resource);
        }
        return removed;
    }
    //#endregion
    //#region Lifecycle
    dispose() {
        super.dispose();
        // Dispose the working copy change listeners
        dispose(this.mapResourceToWorkingCopyListeners.values());
        this.mapResourceToWorkingCopyListeners.clear();
    }
    //#endregion
    notifyDidSave(source, target) {
        this._onDidSave.fire({ source, target });
    }
};
UntitledFileWorkingCopyManager = __decorate([
    __param(3, IFileService),
    __param(4, ILabelService),
    __param(5, ILogService),
    __param(6, IWorkingCopyBackupService),
    __param(7, IWorkingCopyService)
], UntitledFileWorkingCopyManager);
export { UntitledFileWorkingCopyManager };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidW50aXRsZWRGaWxlV29ya2luZ0NvcHlNYW5hZ2VyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy93b3JraW5nQ29weS9jb21tb24vdW50aXRsZWRGaWxlV29ya2luZ0NvcHlNYW5hZ2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsT0FBTyxFQUFlLE1BQU0sc0NBQXNDLENBQUM7QUFDN0YsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JELE9BQU8sRUFBZ0wsdUJBQXVCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUNyUCxPQUFPLEVBQVMsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBQzlELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUMzRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDckUsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFDbkUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSwwQkFBMEIsRUFBK0IsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFnSHRELElBQU0sOEJBQThCLEdBQXBDLE1BQU0sOEJBQXdFLFNBQVEsMEJBQTBEO0lBaUJ0SixZQUNrQixpQkFBeUIsRUFDekIsWUFBcUQsRUFDckQsWUFBcUQs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