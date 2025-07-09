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
import { localize } from '../../../../nls.js';
import { WorkingCopyBackupService } from '../common/workingCopyBackupService.js';
import { URI } from '../../../../base/common/uri.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IWorkingCopyBackupService } from '../common/workingCopyBackup.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { INativeWorkbenchEnvironmentService } from '../../environment/electron-sandbox/environmentService.js';
import { registerWorkbenchContribution2 } from '../../../common/contributions.js';
import { ILifecycleService } from '../../lifecycle/common/lifecycle.js';
import { NativeWorkingCopyBackupTracker } from './workingCopyBackupTracker.js';
let NativeWorkingCopyBackupService = class NativeWorkingCopyBackupService extends WorkingCopyBackupService {
    constructor(environmentService, fileService, logService, lifecycleService) {
        super(environmentService.backupPath ? URI.file(environmentService.backupPath).with({ scheme: environmentService.userRoamingDataHome.scheme }) : undefined, fileService, logService);
        this.lifecycleService = lifecycleService;
        this.registerListeners();
    }
    registerListeners() {
        // Lifecycle: ensure to prolong the shutdown for as long
        // as pending backup operations have not finished yet.
        // Otherwise, we risk writing partial backups to disk.
        this._register(this.lifecycleService.onWillShutdown(event => event.join(this.joinBackups(), { id: 'join.workingCopyBackups', label: localize('join.workingCopyBackups', "Backup working copies") })));
    }
};
NativeWorkingCopyBackupService = __decorate([
    __param(0, INativeWorkbenchEnvironmentService),
    __param(1, IFileService),
    __param(2, ILogService),
    __param(3, ILifecycleService)
], NativeWorkingCopyBackupService);
export { NativeWorkingCopyBackupService };
// Register Service
registerSingleton(IWorkingCopyBackupService, NativeWorkingCopyBackupService, 0 /* InstantiationType.Eager */);
// Register Backup Tracker
registerWorkbenchContribution2(NativeWorkingCopyBackupTracker.ID, NativeWorkingCopyBackupTracker, 1 /* WorkbenchPhase.BlockStartup */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2luZ0NvcHlCYWNrdXBTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy93b3JraW5nQ29weS9lbGVjdHJvbi1zYW5kYm94L3dvcmtpbmdDb3B5QmFja3VwU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDakYsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JELE9BQU8sRUFBcUIsaUJBQWlCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUMvRyxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUMzRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDMUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxrQ0FBa0MsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQzlHLE9BQU8sRUFBa0IsOEJBQThCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNsRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUN4RSxPQUFPLEVBQUUsOEJBQThCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUV4RSxJQUFNLDhCQUE4QixHQUFwQyxNQUFNLDhCQUErQixTQUFRLHdCQUF3QjtJQUUzRSxZQUNxQyxrQkFBc0QsRUFDNUUsV0FBeUIsRUFDMUIsVUFBdUIsRUFDQSxnQkFBbUM7UUFFdkUsS0FBSyxDQUFDLGtCQUFrQixDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxVQUFVLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxNQUFNLEVBQUUsa0JBQWtCLENBQUMsbUJBQW1CLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUFFLFdBQVcsRUFBRSxVQUFVLENBQUMsQ0FBQztRQUZoSixxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQW1CO1FBSXZFLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO0lBQzFCLENBQUM7SUFFTyxpQkFBaUI7UUFFeEIsd0RBQXdEO1FBQ3hELHNEQUFzRDtRQUN0RCxzREFBc0Q7UUFDdEQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUseUJBQXlCLEVBQUUsS0FBSyxFQUFFLFFBQVEsQ0FBQyx5QkFBeUIsRUFBRSx1QkFBdUIsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDdk0sQ0FBQztDQUNELENBQUE7QUFwQlksOEJBQThCO0lBR3hDLFdBQUEsa0NBQWtDLENBQUE7SUFDbEMsV0FBQSxZQUFZLENBQUE7SUFDWixXQUFBLFdBQVcsQ0FBQTtJQUNYLFdBQUEsaUJBQWlCLENBQUE7R0FOUCw4QkFBOEIsQ0FvQjFDOztBQUVELG1CQUFtQjtBQUNuQixpQkFBaUIsQ0FBQyx5QkFBeUIsRUFBRSw4QkFBOEIsa0NBQTBCLENBQUM7QUFFdEcsMEJBQTBCO0FBQzFCLDhCQUE4QixDQUFDLDhCQUE4QixDQUFDLEVBQUUsRUFBRSw4QkFBOEIsc0NBQThCLENBQUMifQ==