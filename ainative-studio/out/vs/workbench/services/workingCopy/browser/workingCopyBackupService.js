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
import { IFileService } from '../../../../platform/files/common/files.js';
import { IWorkbenchEnvironmentService } from '../../environment/common/environmentService.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { WorkingCopyBackupService } from '../common/workingCopyBackupService.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IWorkingCopyBackupService } from '../common/workingCopyBackup.js';
import { joinPath } from '../../../../base/common/resources.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { registerWorkbenchContribution2 } from '../../../common/contributions.js';
import { BrowserWorkingCopyBackupTracker } from './workingCopyBackupTracker.js';
let BrowserWorkingCopyBackupService = class BrowserWorkingCopyBackupService extends WorkingCopyBackupService {
    constructor(contextService, environmentService, fileService, logService) {
        super(joinPath(environmentService.userRoamingDataHome, 'Backups', contextService.getWorkspace().id), fileService, logService);
    }
};
BrowserWorkingCopyBackupService = __decorate([
    __param(0, IWorkspaceContextService),
    __param(1, IWorkbenchEnvironmentService),
    __param(2, IFileService),
    __param(3, ILogService)
], BrowserWorkingCopyBackupService);
export { BrowserWorkingCopyBackupService };
// Register Service
registerSingleton(IWorkingCopyBackupService, BrowserWorkingCopyBackupService, 0 /* InstantiationType.Eager */);
// Register Backup Tracker
registerWorkbenchContribution2(BrowserWorkingCopyBackupTracker.ID, BrowserWorkingCopyBackupTracker, 1 /* WorkbenchPhase.BlockStartup */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2luZ0NvcHlCYWNrdXBTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy93b3JraW5nQ29weS9icm93c2VyL3dvcmtpbmdDb3B5QmFja3VwU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDMUUsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDOUYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2pGLE9BQU8sRUFBcUIsaUJBQWlCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUMvRyxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUMzRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDaEUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDOUYsT0FBTyxFQUFrQiw4QkFBOEIsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xHLE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBRXpFLElBQU0sK0JBQStCLEdBQXJDLE1BQU0sK0JBQWdDLFNBQVEsd0JBQXdCO0lBRTVFLFlBQzJCLGNBQXdDLEVBQ3BDLGtCQUFnRCxFQUNoRSxXQUF5QixFQUMxQixVQUF1QjtRQUVwQyxLQUFLLENBQUMsUUFBUSxDQUFDLGtCQUFrQixDQUFDLG1CQUFtQixFQUFFLFNBQVMsRUFBRSxjQUFjLENBQUMsWUFBWSxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsV0FBVyxFQUFFLFVBQVUsQ0FBQyxDQUFDO0lBQy9ILENBQUM7Q0FDRCxDQUFBO0FBVlksK0JBQStCO0lBR3pDLFdBQUEsd0JBQXdCLENBQUE7SUFDeEIsV0FBQSw0QkFBNEIsQ0FBQTtJQUM1QixXQUFBLFlBQVksQ0FBQTtJQUNaLFdBQUEsV0FBVyxDQUFBO0dBTkQsK0JBQStCLENBVTNDOztBQUVELG1CQUFtQjtBQUNuQixpQkFBaUIsQ0FBQyx5QkFBeUIsRUFBRSwrQkFBK0Isa0NBQTBCLENBQUM7QUFFdkcsMEJBQTBCO0FBQzFCLDhCQUE4QixDQUFDLCtCQUErQixDQUFDLEVBQUUsRUFBRSwrQkFBK0Isc0NBQThCLENBQUMifQ==