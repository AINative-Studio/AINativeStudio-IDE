var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IWorkspaceTrustManagementService } from '../../../../platform/workspace/common/workspaceTrust.js';
import { isChatTransferredWorkspace, areWorkspaceFoldersEmpty } from '../../../services/workspaces/common/workspaceUtils.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
export const IChatTransferService = createDecorator('chatTransferService');
let ChatTransferService = class ChatTransferService {
    constructor(workspaceService, storageService, fileService, workspaceTrustManagementService) {
        this.workspaceService = workspaceService;
        this.storageService = storageService;
        this.fileService = fileService;
        this.workspaceTrustManagementService = workspaceTrustManagementService;
    }
    async checkAndSetWorkspaceTrust() {
        const workspace = this.workspaceService.getWorkspace();
        if (isChatTransferredWorkspace(workspace, this.storageService) && await areWorkspaceFoldersEmpty(workspace, this.fileService)) {
            await this.workspaceTrustManagementService.setWorkspaceTrust(true);
        }
    }
};
ChatTransferService = __decorate([
    __param(0, IWorkspaceContextService),
    __param(1, IStorageService),
    __param(2, IFileService),
    __param(3, IWorkspaceTrustManagementService)
], ChatTransferService);
export { ChatTransferService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFRyYW5zZmVyU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9jaGF0VHJhbnNmZXJTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQzlGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNqRixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDMUUsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0seURBQXlELENBQUM7QUFDM0csT0FBTyxFQUFFLDBCQUEwQixFQUFFLHdCQUF3QixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDN0gsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBRTdGLE1BQU0sQ0FBQyxNQUFNLG9CQUFvQixHQUFHLGVBQWUsQ0FBdUIscUJBQXFCLENBQUMsQ0FBQztBQVExRixJQUFNLG1CQUFtQixHQUF6QixNQUFNLG1CQUFtQjtJQUcvQixZQUM0QyxnQkFBMEMsRUFDbkQsY0FBK0IsRUFDbEMsV0FBeUIsRUFDTCwrQkFBaUU7UUFIekUscUJBQWdCLEdBQWhCLGdCQUFnQixDQUEwQjtRQUNuRCxtQkFBYyxHQUFkLGNBQWMsQ0FBaUI7UUFDbEMsZ0JBQVcsR0FBWCxXQUFXLENBQWM7UUFDTCxvQ0FBK0IsR0FBL0IsK0JBQStCLENBQWtDO0lBQ2pILENBQUM7SUFFTCxLQUFLLENBQUMseUJBQXlCO1FBQzlCLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxZQUFZLEVBQUUsQ0FBQztRQUN2RCxJQUFJLDBCQUEwQixDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksTUFBTSx3QkFBd0IsQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUM7WUFDL0gsTUFBTSxJQUFJLENBQUMsK0JBQStCLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDcEUsQ0FBQztJQUNGLENBQUM7Q0FDRCxDQUFBO0FBaEJZLG1CQUFtQjtJQUk3QixXQUFBLHdCQUF3QixDQUFBO0lBQ3hCLFdBQUEsZUFBZSxDQUFBO0lBQ2YsV0FBQSxZQUFZLENBQUE7SUFDWixXQUFBLGdDQUFnQyxDQUFBO0dBUHRCLG1CQUFtQixDQWdCL0IifQ==