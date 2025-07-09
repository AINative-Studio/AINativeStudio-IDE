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
import { generateUuid } from '../../../../base/common/uuid.js';
import { IExtensionGalleryService, IAllowedExtensionsService } from '../../../../platform/extensionManagement/common/extensionManagement.js';
import { ExtensionManagementService as BaseExtensionManagementService } from '../common/extensionManagementService.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IExtensionManagementServerService, IWorkbenchExtensionManagementService } from '../common/extensionManagement.js';
import { Schemas } from '../../../../base/common/network.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IDownloadService } from '../../../../platform/download/common/download.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { INativeWorkbenchEnvironmentService } from '../../environment/electron-sandbox/environmentService.js';
import { joinPath } from '../../../../base/common/resources.js';
import { IUserDataSyncEnablementService } from '../../../../platform/userDataSync/common/userDataSync.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IWorkspaceTrustRequestService } from '../../../../platform/workspace/common/workspaceTrust.js';
import { IExtensionManifestPropertiesService } from '../../extensions/common/extensionManifestPropertiesService.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IUserDataProfileService } from '../../userDataProfile/common/userDataProfile.js';
import { IExtensionsScannerService } from '../../../../platform/extensionManagement/common/extensionsScannerService.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IUserDataProfilesService } from '../../../../platform/userDataProfile/common/userDataProfile.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
let ExtensionManagementService = class ExtensionManagementService extends BaseExtensionManagementService {
    constructor(environmentService, extensionManagementServerService, extensionGalleryService, userDataProfileService, userDataProfilesService, configurationService, productService, downloadService, userDataSyncEnablementService, dialogService, workspaceTrustRequestService, extensionManifestPropertiesService, fileService, logService, instantiationService, extensionsScannerService, allowedExtensionsService, storageService, telemetryService) {
        super(extensionManagementServerService, extensionGalleryService, userDataProfileService, userDataProfilesService, configurationService, productService, downloadService, userDataSyncEnablementService, dialogService, workspaceTrustRequestService, extensionManifestPropertiesService, fileService, logService, instantiationService, extensionsScannerService, allowedExtensionsService, storageService, telemetryService);
        this.environmentService = environmentService;
    }
    async installVSIXInServer(vsix, server, options) {
        if (vsix.scheme === Schemas.vscodeRemote && server === this.extensionManagementServerService.localExtensionManagementServer) {
            const downloadedLocation = joinPath(this.environmentService.tmpDir, generateUuid());
            await this.downloadService.download(vsix, downloadedLocation);
            vsix = downloadedLocation;
        }
        return super.installVSIXInServer(vsix, server, options);
    }
};
ExtensionManagementService = __decorate([
    __param(0, INativeWorkbenchEnvironmentService),
    __param(1, IExtensionManagementServerService),
    __param(2, IExtensionGalleryService),
    __param(3, IUserDataProfileService),
    __param(4, IUserDataProfilesService),
    __param(5, IConfigurationService),
    __param(6, IProductService),
    __param(7, IDownloadService),
    __param(8, IUserDataSyncEnablementService),
    __param(9, IDialogService),
    __param(10, IWorkspaceTrustRequestService),
    __param(11, IExtensionManifestPropertiesService),
    __param(12, IFileService),
    __param(13, ILogService),
    __param(14, IInstantiationService),
    __param(15, IExtensionsScannerService),
    __param(16, IAllowedExtensionsService),
    __param(17, IStorageService),
    __param(18, ITelemetryService)
], ExtensionManagementService);
export { ExtensionManagementService };
registerSingleton(IWorkbenchExtensionManagementService, ExtensionManagementService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uTWFuYWdlbWVudFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2V4dGVuc2lvbk1hbmFnZW1lbnQvZWxlY3Ryb24tc2FuZGJveC9leHRlbnNpb25NYW5hZ2VtZW50U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDL0QsT0FBTyxFQUFtQix3QkFBd0IsRUFBa0IseUJBQXlCLEVBQUUsTUFBTSx3RUFBd0UsQ0FBQztBQUU5SyxPQUFPLEVBQUUsMEJBQTBCLElBQUksOEJBQThCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUN2SCxPQUFPLEVBQXFCLGlCQUFpQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDL0csT0FBTyxFQUE4QixpQ0FBaUMsRUFBRSxvQ0FBb0MsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3ZKLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM3RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUNwRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDeEYsT0FBTyxFQUFFLGtDQUFrQyxFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDOUcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQzFHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNo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