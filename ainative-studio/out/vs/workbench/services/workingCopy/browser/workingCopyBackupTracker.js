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
import { IWorkingCopyBackupService } from '../common/workingCopyBackup.js';
import { IFilesConfigurationService } from '../../filesConfiguration/common/filesConfigurationService.js';
import { IWorkingCopyService } from '../common/workingCopyService.js';
import { ILifecycleService } from '../../lifecycle/common/lifecycle.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { WorkingCopyBackupTracker } from '../common/workingCopyBackupTracker.js';
import { IWorkingCopyEditorService } from '../common/workingCopyEditorService.js';
import { IEditorService } from '../../editor/common/editorService.js';
import { IEditorGroupsService } from '../../editor/common/editorGroupsService.js';
let BrowserWorkingCopyBackupTracker = class BrowserWorkingCopyBackupTracker extends WorkingCopyBackupTracker {
    static { this.ID = 'workbench.contrib.browserWorkingCopyBackupTracker'; }
    constructor(workingCopyBackupService, filesConfigurationService, workingCopyService, lifecycleService, logService, workingCopyEditorService, editorService, editorGroupService) {
        super(workingCopyBackupService, workingCopyService, logService, lifecycleService, filesConfigurationService, workingCopyEditorService, editorService, editorGroupService);
    }
    onFinalBeforeShutdown(reason) {
        // Web: we cannot perform long running in the shutdown phase
        // As such we need to check sync if there are any modified working
        // copies that have not been backed up yet and then prevent the
        // shutdown if that is the case.
        const modifiedWorkingCopies = this.workingCopyService.modifiedWorkingCopies;
        if (!modifiedWorkingCopies.length) {
            return false; // nothing modified: no veto
        }
        if (!this.filesConfigurationService.isHotExitEnabled) {
            return true; // modified without backup: veto
        }
        for (const modifiedWorkingCopy of modifiedWorkingCopies) {
            if (!this.workingCopyBackupService.hasBackupSync(modifiedWorkingCopy, this.getContentVersion(modifiedWorkingCopy))) {
                this.logService.warn('Unload veto: pending backups');
                return true; // modified without backup: veto
            }
        }
        return false; // modified and backed up: no veto
    }
};
BrowserWorkingCopyBackupTracker = __decorate([
    __param(0, IWorkingCopyBackupService),
    __param(1, IFilesConfigurationService),
    __param(2, IWorkingCopyService),
    __param(3, ILifecycleService),
    __param(4, ILogService),
    __param(5, IWorkingCopyEditorService),
    __param(6, IEditorService),
    __param(7, IEditorGroupsService)
], BrowserWorkingCopyBackupTracker);
export { BrowserWorkingCopyBackupTracker };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2luZ0NvcHlCYWNrdXBUcmFja2VyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy93b3JraW5nQ29weS9icm93c2VyL3dvcmtpbmdDb3B5QmFja3VwVHJhY2tlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUUzRSxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSw4REFBOEQsQ0FBQztBQUMxRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUN0RSxPQUFPLEVBQUUsaUJBQWlCLEVBQWtCLE1BQU0scUNBQXFDLENBQUM7QUFDeEYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2pGLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUN0RSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUUzRSxJQUFNLCtCQUErQixHQUFyQyxNQUFNLCtCQUFnQyxTQUFRLHdCQUF3QjthQUU1RCxPQUFFLEdBQUcsbURBQW1ELEFBQXRELENBQXVEO0lBRXpFLFlBQzRCLHdCQUFtRCxFQUNsRCx5QkFBcUQsRUFDNUQsa0JBQXVDLEVBQ3pDLGdCQUFtQyxFQUN6QyxVQUF1QixFQUNULHdCQUFtRCxFQUM5RCxhQUE2QixFQUN2QixrQkFBd0M7UUFFOUQsS0FBSyxDQUFDLHdCQUF3QixFQUFFLGtCQUFrQixFQUFFLFVBQVUsRUFBRSxnQkFBZ0IsRUFBRSx5QkFBeUIsRUFBRSx3QkFBd0IsRUFBRSxhQUFhLEVBQUUsa0JBQWtCLENBQUMsQ0FBQztJQUMzSyxDQUFDO0lBRVMscUJBQXFCLENBQUMsTUFBc0I7UUFFckQsNERBQTREO1FBQzVELGtFQUFrRTtRQUNsRSwrREFBK0Q7UUFDL0QsZ0NBQWdDO1FBRWhDLE1BQU0scUJBQXFCLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLHFCQUFxQixDQUFDO1FBQzVFLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNuQyxPQUFPLEtBQUssQ0FBQyxDQUFDLDRCQUE0QjtRQUMzQyxDQUFDO1FBRUQsSUFBSSxDQUFDLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1lBQ3RELE9BQU8sSUFBSSxDQUFDLENBQUMsZ0NBQWdDO1FBQzlDLENBQUM7UUFFRCxLQUFLLE1BQU0sbUJBQW1CLElBQUkscUJBQXFCLEVBQUUsQ0FBQztZQUN6RCxJQUFJLENBQUMsSUFBSSxDQUFDLHdCQUF3QixDQUFDLGFBQWEsQ0FBQyxtQkFBbUIsRUFBRSxJQUFJLENBQUMsaUJBQWlCLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBQ3BILElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLDhCQUE4QixDQUFDLENBQUM7Z0JBRXJELE9BQU8sSUFBSSxDQUFDLENBQUMsZ0NBQWdDO1lBQzlDLENBQUM7UUFDRixDQUFDO1FBRUQsT0FBTyxLQUFLLENBQUMsQ0FBQyxrQ0FBa0M7SUFDakQsQ0FBQzs7QUExQ1csK0JBQStCO0lBS3pDLFdBQUEseUJBQXlCLENBQUE7SUFDekIsV0FBQSwwQkFBMEIsQ0FBQTtJQUMxQixXQUFBLG1CQUFtQixDQUFBO0lBQ25CLFdBQUEsaUJBQWlCLENBQUE7SUFDakIsV0FBQSxXQUFXLENBQUE7SUFDWCxXQUFBLHlCQUF5QixDQUFBO0lBQ3pCLFdBQUEsY0FBYyxDQUFBO0lBQ2QsV0FBQSxvQkFBb0IsQ0FBQTtHQVpWLCtCQUErQixDQTJDM0MifQ==