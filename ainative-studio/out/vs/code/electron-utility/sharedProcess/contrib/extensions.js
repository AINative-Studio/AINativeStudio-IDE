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
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IExtensionGalleryService, IGlobalExtensionEnablementService } from '../../../../platform/extensionManagement/common/extensionManagement.js';
import { ExtensionStorageService, IExtensionStorageService } from '../../../../platform/extensionManagement/common/extensionStorage.js';
import { migrateUnsupportedExtensions } from '../../../../platform/extensionManagement/common/unsupportedExtensionsMigration.js';
import { INativeServerExtensionManagementService } from '../../../../platform/extensionManagement/node/extensionManagementService.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
let ExtensionsContributions = class ExtensionsContributions extends Disposable {
    constructor(extensionManagementService, extensionGalleryService, extensionStorageService, extensionEnablementService, storageService, logService) {
        super();
        extensionManagementService.cleanUp();
        migrateUnsupportedExtensions(extensionManagementService, extensionGalleryService, extensionStorageService, extensionEnablementService, logService);
        ExtensionStorageService.removeOutdatedExtensionVersions(extensionManagementService, storageService);
    }
};
ExtensionsContributions = __decorate([
    __param(0, INativeServerExtensionManagementService),
    __param(1, IExtensionGalleryService),
    __param(2, IExtensionStorageService),
    __param(3, IGlobalExtensionEnablementService),
    __param(4, IStorageService),
    __param(5, ILogService)
], ExtensionsContributions);
export { ExtensionsContributions };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9jb2RlL2VsZWN0cm9uLXV0aWxpdHkvc2hhcmVkUHJvY2Vzcy9jb250cmliL2V4dGVuc2lvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxpQ0FBaUMsRUFBRSxNQUFNLHdFQUF3RSxDQUFDO0FBQ3JKLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHFFQUFxRSxDQUFDO0FBQ3hJLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLG1GQUFtRixDQUFDO0FBQ2pJLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDZFQUE2RSxDQUFDO0FBQ3RJLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNyRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFFMUUsSUFBTSx1QkFBdUIsR0FBN0IsTUFBTSx1QkFBd0IsU0FBUSxVQUFVO0lBQ3RELFlBQzBDLDBCQUFtRSxFQUNsRix1QkFBaUQsRUFDakQsdUJBQWlELEVBQ3hDLDBCQUE2RCxFQUMvRSxjQUErQixFQUNuQyxVQUF1QjtRQUVwQyxLQUFLLEVBQUUsQ0FBQztRQUVSLDBCQUEwQixDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ3JDLDRCQUE0QixDQUFDLDBCQUEwQixFQUFFLHVCQUF1QixFQUFFLHVCQUF1QixFQUFFLDBCQUEwQixFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBQ25KLHVCQUF1QixDQUFDLCtCQUErQixDQUFDLDBCQUEwQixFQUFFLGNBQWMsQ0FBQyxDQUFDO0lBQ3JHLENBQUM7Q0FFRCxDQUFBO0FBaEJZLHVCQUF1QjtJQUVqQyxXQUFBLHVDQUF1QyxDQUFBO0lBQ3ZDLFdBQUEsd0JBQXdCLENBQUE7SUFDeEIsV0FBQSx3QkFBd0IsQ0FBQTtJQUN4QixXQUFBLGlDQUFpQyxDQUFBO0lBQ2pDLFdBQUEsZUFBZSxDQUFBO0lBQ2YsV0FBQSxXQUFXLENBQUE7R0FQRCx1QkFBdUIsQ0FnQm5DIn0=