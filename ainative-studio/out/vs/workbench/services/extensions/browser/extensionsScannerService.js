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
import { IExtensionsProfileScannerService } from '../../../../platform/extensionManagement/common/extensionsProfileScannerService.js';
import { AbstractExtensionsScannerService, IExtensionsScannerService, } from '../../../../platform/extensionManagement/common/extensionsScannerService.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { IUserDataProfilesService } from '../../../../platform/userDataProfile/common/userDataProfile.js';
import { IWorkbenchEnvironmentService } from '../../environment/common/environmentService.js';
import { IUserDataProfileService } from '../../userDataProfile/common/userDataProfile.js';
let ExtensionsScannerService = class ExtensionsScannerService extends AbstractExtensionsScannerService {
    constructor(userDataProfileService, userDataProfilesService, extensionsProfileScannerService, fileService, logService, environmentService, productService, uriIdentityService, instantiationService) {
        super(uriIdentityService.extUri.joinPath(environmentService.userRoamingDataHome, 'systemExtensions'), uriIdentityService.extUri.joinPath(environmentService.userRoamingDataHome, 'userExtensions'), uriIdentityService.extUri.joinPath(environmentService.userRoamingDataHome, 'userExtensions', 'control.json'), userDataProfileService.currentProfile, userDataProfilesService, extensionsProfileScannerService, fileService, logService, environmentService, productService, uriIdentityService, instantiationService);
    }
    async getTranslations() {
        return {};
    }
};
ExtensionsScannerService = __decorate([
    __param(0, IUserDataProfileService),
    __param(1, IUserDataProfilesService),
    __param(2, IExtensionsProfileScannerService),
    __param(3, IFileService),
    __param(4, ILogService),
    __param(5, IWorkbenchEnvironmentService),
    __param(6, IProductService),
    __param(7, IUriIdentityService),
    __param(8, IInstantiationService)
], ExtensionsScannerService);
export { ExtensionsScannerService };
registerSingleton(IExtensionsScannerService, ExtensionsScannerService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uc1NjYW5uZXJTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9leHRlbnNpb25zL2Jyb3dzZXIvZXh0ZW5zaW9uc1NjYW5uZXJTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLG9GQUFvRixDQUFDO0FBQ3RJLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSx5QkFBeUIsR0FBaUIsTUFBTSw2RUFBNkUsQ0FBQztBQUN6SyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDMUUsT0FBTyxFQUFxQixpQkFBaUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQy9HLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNyRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDeEYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDN0YsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sZ0VBQWdFLENBQUM7QUFDMUcsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDOUYsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0saURBQWlELENBQUM7QUFFbkYsSUFBTSx3QkFBd0IsR0FBOUIsTUFBTSx3QkFBeUIsU0FBUSxnQ0FBZ0M7SUFFN0UsWUFDMEIsc0JBQStDLEVBQzlDLHVCQUFpRCxFQUN6QywrQkFBaUUsRUFDckYsV0FBeUIsRUFDMUIsVUFBdUIsRUFDTixrQkFBZ0QsRUFDN0QsY0FBK0IsRUFDM0Isa0JBQXVDLEVBQ3JDLG9CQUEyQztRQUVsRSxLQUFLLENBQ0osa0JBQWtCLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxrQkFBa0IsQ0FBQyxtQkFBbUIsRUFBRSxrQkFBa0IsQ0FBQyxFQUM5RixrQkFBa0IsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLGtCQUFrQixDQUFDLG1CQUFtQixFQUFFLGdCQUFnQixDQUFDLEVBQzVGLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsa0JBQWtCLENBQUMsbUJBQW1CLEVBQUUsZ0JBQWdCLEVBQUUsY0FBYyxDQUFDLEVBQzVHLHNCQUFzQixDQUFDLGNBQWMsRUFDckMsdUJBQXVCLEVBQUUsK0JBQStCLEVBQUUsV0FBVyxFQUFFLFVBQVUsRUFBRSxrQkFBa0IsRUFBRSxjQUFjLEVBQUUsa0JBQWtCLEVBQUUsb0JBQW9CLENBQUMsQ0FBQztJQUNuSyxDQUFDO0lBRVMsS0FBSyxDQUFDLGVBQWU7UUFDOUIsT0FBTyxFQUFFLENBQUM7SUFDWCxDQUFDO0NBRUQsQ0FBQTtBQXpCWSx3QkFBd0I7SUFHbEMsV0FBQSx1QkFBdUIsQ0FBQTtJQUN2QixXQUFBLHdCQUF3QixDQUFBO0lBQ3hCLFdBQUEsZ0NBQWdDLENBQUE7SUFDaEMsV0FBQSxZQUFZLENBQUE7SUFDWixXQUFBLFdBQVcsQ0FBQTtJQUNYLFdBQUEsNEJBQTRCLENBQUE7SUFDNUIsV0FBQSxlQUFlLENBQUE7SUFDZixXQUFBLG1CQUFtQixDQUFBO0lBQ25CLFdBQUEscUJBQXFCLENBQUE7R0FYWCx3QkFBd0IsQ0F5QnBDOztBQUVELGlCQUFpQixDQUFDLHlCQUF5QixFQUFFLHdCQUF3QixvQ0FBNEIsQ0FBQyJ9