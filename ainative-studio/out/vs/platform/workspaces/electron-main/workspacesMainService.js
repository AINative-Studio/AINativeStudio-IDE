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
import { IBackupMainService } from '../../backup/electron-main/backup.js';
import { IWindowsMainService } from '../../windows/electron-main/windows.js';
import { IWorkspacesHistoryMainService } from './workspacesHistoryMainService.js';
import { IWorkspacesManagementMainService } from './workspacesManagementMainService.js';
let WorkspacesMainService = class WorkspacesMainService {
    constructor(workspacesManagementMainService, windowsMainService, workspacesHistoryMainService, backupMainService) {
        this.workspacesManagementMainService = workspacesManagementMainService;
        this.windowsMainService = windowsMainService;
        this.workspacesHistoryMainService = workspacesHistoryMainService;
        this.backupMainService = backupMainService;
        this.onDidChangeRecentlyOpened = this.workspacesHistoryMainService.onDidChangeRecentlyOpened;
    }
    //#region Workspace Management
    async enterWorkspace(windowId, path) {
        const window = this.windowsMainService.getWindowById(windowId);
        if (window) {
            return this.workspacesManagementMainService.enterWorkspace(window, this.windowsMainService.getWindows(), path);
        }
        return undefined;
    }
    createUntitledWorkspace(windowId, folders, remoteAuthority) {
        return this.workspacesManagementMainService.createUntitledWorkspace(folders, remoteAuthority);
    }
    deleteUntitledWorkspace(windowId, workspace) {
        return this.workspacesManagementMainService.deleteUntitledWorkspace(workspace);
    }
    getWorkspaceIdentifier(windowId, workspacePath) {
        return this.workspacesManagementMainService.getWorkspaceIdentifier(workspacePath);
    }
    getRecentlyOpened(windowId) {
        return this.workspacesHistoryMainService.getRecentlyOpened();
    }
    addRecentlyOpened(windowId, recents) {
        return this.workspacesHistoryMainService.addRecentlyOpened(recents);
    }
    removeRecentlyOpened(windowId, paths) {
        return this.workspacesHistoryMainService.removeRecentlyOpened(paths);
    }
    clearRecentlyOpened(windowId) {
        return this.workspacesHistoryMainService.clearRecentlyOpened();
    }
    //#endregion
    //#region Dirty Workspaces
    async getDirtyWorkspaces() {
        return this.backupMainService.getDirtyWorkspaces();
    }
};
WorkspacesMainService = __decorate([
    __param(0, IWorkspacesManagementMainService),
    __param(1, IWindowsMainService),
    __param(2, IWorkspacesHistoryMainService),
    __param(3, IBackupMainService)
], WorkspacesMainService);
export { WorkspacesMainService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya3NwYWNlc01haW5TZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3dvcmtzcGFjZXMvZWxlY3Ryb24tbWFpbi93b3Jrc3BhY2VzTWFpblNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFJaEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDMUUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFHN0UsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDbEYsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFJakYsSUFBTSxxQkFBcUIsR0FBM0IsTUFBTSxxQkFBcUI7SUFJakMsWUFDb0QsK0JBQWlFLEVBQzlFLGtCQUF1QyxFQUM3Qiw0QkFBMkQsRUFDdEUsaUJBQXFDO1FBSHZCLG9DQUErQixHQUEvQiwrQkFBK0IsQ0FBa0M7UUFDOUUsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFxQjtRQUM3QixpQ0FBNEIsR0FBNUIsNEJBQTRCLENBQStCO1FBQ3RFLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBb0I7UUFFMUUsSUFBSSxDQUFDLHlCQUF5QixHQUFHLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyx5QkFBeUIsQ0FBQztJQUM5RixDQUFDO0lBRUQsOEJBQThCO0lBRTlCLEtBQUssQ0FBQyxjQUFjLENBQUMsUUFBZ0IsRUFBRSxJQUFTO1FBQy9DLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDL0QsSUFBSSxNQUFNLEVBQUUsQ0FBQztZQUNaLE9BQU8sSUFBSSxDQUFDLCtCQUErQixDQUFDLGNBQWMsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFVBQVUsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ2hILENBQUM7UUFFRCxPQUFPLFNBQVMsQ0FBQztJQUNsQixDQUFDO0lBRUQsdUJBQXVCLENBQUMsUUFBZ0IsRUFBRSxPQUF3QyxFQUFFLGVBQXdCO1FBQzNHLE9BQU8sSUFBSSxDQUFDLCtCQUErQixDQUFDLHVCQUF1QixDQUFDLE9BQU8sRUFBRSxlQUFlLENBQUMsQ0FBQztJQUMvRixDQUFDO0lBRUQsdUJBQXVCLENBQUMsUUFBZ0IsRUFBRSxTQUErQjtRQUN4RSxPQUFPLElBQUksQ0FBQywrQkFBK0IsQ0FBQyx1QkFBdUIsQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUNoRixDQUFDO0lBRUQsc0JBQXNCLENBQUMsUUFBZ0IsRUFBRSxhQUFrQjtRQUMxRCxPQUFPLElBQUksQ0FBQywrQkFBK0IsQ0FBQyxzQkFBc0IsQ0FBQyxhQUFhLENBQUMsQ0FBQztJQUNuRixDQUFDO0lBUUQsaUJBQWlCLENBQUMsUUFBZ0I7UUFDakMsT0FBTyxJQUFJLENBQUMsNEJBQTRCLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztJQUM5RCxDQUFDO0lBRUQsaUJBQWlCLENBQUMsUUFBZ0IsRUFBRSxPQUFrQjtRQUNyRCxPQUFPLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxpQkFBaUIsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUNyRSxDQUFDO0lBRUQsb0JBQW9CLENBQUMsUUFBZ0IsRUFBRSxLQUFZO1FBQ2xELE9BQU8sSUFBSSxDQUFDLDRCQUE0QixDQUFDLG9CQUFvQixDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ3RFLENBQUM7SUFFRCxtQkFBbUIsQ0FBQyxRQUFnQjtRQUNuQyxPQUFPLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO0lBQ2hFLENBQUM7SUFFRCxZQUFZO0lBR1osMEJBQTBCO0lBRTFCLEtBQUssQ0FBQyxrQkFBa0I7UUFDdkIsT0FBTyxJQUFJLENBQUMsaUJBQWlCLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztJQUNwRCxDQUFDO0NBR0QsQ0FBQTtBQXBFWSxxQkFBcUI7SUFLL0IsV0FBQSxnQ0FBZ0MsQ0FBQTtJQUNoQyxXQUFBLG1CQUFtQixDQUFBO0lBQ25CLFdBQUEsNkJBQTZCLENBQUE7SUFDN0IsV0FBQSxrQkFBa0IsQ0FBQTtHQVJSLHFCQUFxQixDQW9FakMifQ==