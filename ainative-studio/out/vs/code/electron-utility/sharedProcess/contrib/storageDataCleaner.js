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
import { RunOnceScheduler } from '../../../../base/common/async.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { join } from '../../../../base/common/path.js';
import { Promises } from '../../../../base/node/pfs.js';
import { INativeEnvironmentService } from '../../../../platform/environment/common/environment.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { StorageClient } from '../../../../platform/storage/common/storageIpc.js';
import { EXTENSION_DEVELOPMENT_EMPTY_WINDOW_WORKSPACE } from '../../../../platform/workspace/common/workspace.js';
import { NON_EMPTY_WORKSPACE_ID_LENGTH } from '../../../../platform/workspaces/node/workspaces.js';
import { INativeHostService } from '../../../../platform/native/common/native.js';
import { IMainProcessService } from '../../../../platform/ipc/common/mainProcessService.js';
import { Schemas } from '../../../../base/common/network.js';
let UnusedWorkspaceStorageDataCleaner = class UnusedWorkspaceStorageDataCleaner extends Disposable {
    constructor(environmentService, logService, nativeHostService, mainProcessService) {
        super();
        this.environmentService = environmentService;
        this.logService = logService;
        this.nativeHostService = nativeHostService;
        this.mainProcessService = mainProcessService;
        const scheduler = this._register(new RunOnceScheduler(() => {
            this.cleanUpStorage();
        }, 30 * 1000 /* after 30s */));
        scheduler.schedule();
    }
    async cleanUpStorage() {
        this.logService.trace('[storage cleanup]: Starting to clean up workspace storage folders for unused empty workspaces.');
        try {
            const workspaceStorageHome = this.environmentService.workspaceStorageHome.with({ scheme: Schemas.file }).fsPath;
            const workspaceStorageFolders = await Promises.readdir(workspaceStorageHome);
            const storageClient = new StorageClient(this.mainProcessService.getChannel('storage'));
            await Promise.all(workspaceStorageFolders.map(async (workspaceStorageFolder) => {
                const workspaceStoragePath = join(workspaceStorageHome, workspaceStorageFolder);
                if (workspaceStorageFolder.length === NON_EMPTY_WORKSPACE_ID_LENGTH) {
                    return; // keep workspace storage for folders/workspaces that can be accessed still
                }
                if (workspaceStorageFolder === EXTENSION_DEVELOPMENT_EMPTY_WINDOW_WORKSPACE.id) {
                    return; // keep workspace storage for empty extension development workspaces
                }
                const windows = await this.nativeHostService.getWindows({ includeAuxiliaryWindows: false });
                if (windows.some(window => window.workspace?.id === workspaceStorageFolder)) {
                    return; // keep workspace storage for empty workspaces opened as window
                }
                const isStorageUsed = await storageClient.isUsed(workspaceStoragePath);
                if (isStorageUsed) {
                    return; // keep workspace storage for empty workspaces that are in use
                }
                this.logService.trace(`[storage cleanup]: Deleting workspace storage folder ${workspaceStorageFolder} as it seems to be an unused empty workspace.`);
                await Promises.rm(workspaceStoragePath);
            }));
        }
        catch (error) {
            onUnexpectedError(error);
        }
    }
};
UnusedWorkspaceStorageDataCleaner = __decorate([
    __param(0, INativeEnvironmentService),
    __param(1, ILogService),
    __param(2, INativeHostService),
    __param(3, IMainProcessService)
], UnusedWorkspaceStorageDataCleaner);
export { UnusedWorkspaceStorageDataCleaner };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RvcmFnZURhdGFDbGVhbmVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2NvZGUvZWxlY3Ryb24tdXRpbGl0eS9zaGFyZWRQcm9jZXNzL2NvbnRyaWIvc3RvcmFnZURhdGFDbGVhbmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDdkQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQ3hELE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNyRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDbEYsT0FBTyxFQUFFLDRDQUE0QyxFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDbEgsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDbkcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDbEYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDNUYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBRXRELElBQU0saUNBQWlDLEdBQXZDLE1BQU0saUNBQWtDLFNBQVEsVUFBVTtJQUVoRSxZQUM2QyxrQkFBNkMsRUFDM0QsVUFB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