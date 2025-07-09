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
import { IRemoteAgentService } from '../../remote/common/remoteAgentService.js';
import { IWorkbenchEnvironmentService } from '../../environment/common/environmentService.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { WorkingCopyHistoryService } from '../common/workingCopyHistoryService.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IWorkingCopyHistoryService } from '../common/workingCopyHistory.js';
let BrowserWorkingCopyHistoryService = class BrowserWorkingCopyHistoryService extends WorkingCopyHistoryService {
    constructor(fileService, remoteAgentService, environmentService, uriIdentityService, labelService, logService, configurationService) {
        super(fileService, remoteAgentService, environmentService, uriIdentityService, labelService, logService, configurationService);
    }
    getModelOptions() {
        return { flushOnChange: true /* because browsers support no long running shutdown */ };
    }
};
BrowserWorkingCopyHistoryService = __decorate([
    __param(0, IFileService),
    __param(1, IRemoteAgentService),
    __param(2, IWorkbenchEnvironmentService),
    __param(3, IUriIdentityService),
    __param(4, ILabelService),
    __param(5, ILogService),
    __param(6, IConfigurationService)
], BrowserWorkingCopyHistoryService);
export { BrowserWorkingCopyHistoryService };
// Register Service
registerSingleton(IWorkingCopyHistoryService, BrowserWorkingCopyHistoryService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2luZ0NvcHlIaXN0b3J5U2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvd29ya2luZ0NvcHkvYnJvd3Nlci93b3JraW5nQ29weUhpc3RvcnlTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUNoRixPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUM5RixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUM3RixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDM0UsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBbUMseUJBQXlCLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNwSCxPQUFPLEVBQXFCLGlCQUFpQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDL0csT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFFdEUsSUFBTSxnQ0FBZ0MsR0FBdEMsTUFBTSxnQ0FBaUMsU0FBUSx5QkFBeUI7SUFFOUUsWUFDZSxXQUF5QixFQUNsQixrQkFBdUMsRUFDOUIsa0JBQWdELEVBQ3pELGtCQUF1QyxFQUM3QyxZQUEyQixFQUM3QixVQUF1QixFQUNiLG9CQUEyQztRQUVsRSxLQUFLLENBQUMsV0FBVyxFQUFFLGtCQUFrQixFQUFFLGtCQUFrQixFQUFFLGtCQUFrQixFQUFFLFlBQVksRUFBRSxVQUFVLEVBQUUsb0JBQW9CLENBQUMsQ0FBQztJQUNoSSxDQUFDO0lBRVMsZUFBZTtRQUN4QixPQUFPLEVBQUUsYUFBYSxFQUFFLElBQUksQ0FBQyx1REFBdUQsRUFBRSxDQUFDO0lBQ3hGLENBQUM7Q0FDRCxDQUFBO0FBakJZLGdDQUFnQztJQUcxQyxXQUFBLFlBQVksQ0FBQTtJQUNaLFdBQUEsbUJBQW1CLENBQUE7SUFDbkIsV0FBQSw0QkFBNEIsQ0FBQTtJQUM1QixXQUFBLG1CQUFtQixDQUFBO0lBQ25CLFdBQUEsYUFBYSxDQUFBO0lBQ2IsV0FBQSxXQUFXLENBQUE7SUFDWCxXQUFBLHFCQUFxQixDQUFBO0dBVFgsZ0NBQWdDLENBaUI1Qzs7QUFFRCxtQkFBbUI7QUFDbkIsaUJBQWlCLENBQUMsMEJBQTBCLEVBQUUsZ0NBQWdDLG9DQUE0QixDQUFDIn0=