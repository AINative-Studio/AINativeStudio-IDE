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
import { registerSingleton } from '../../instantiation/common/extensions.js';
import { IFileService } from '../../files/common/files.js';
import { FileAccess, Schemas } from '../../../base/common/network.js';
import { IProductService } from '../../product/common/productService.js';
import { IStorageService } from '../../storage/common/storage.js';
import { IEnvironmentService } from '../../environment/common/environment.js';
import { ILogService } from '../../log/common/log.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { AbstractExtensionResourceLoaderService, IExtensionResourceLoaderService } from '../common/extensionResourceLoader.js';
import { IExtensionGalleryManifestService } from '../../extensionManagement/common/extensionGalleryManifest.js';
let ExtensionResourceLoaderService = class ExtensionResourceLoaderService extends AbstractExtensionResourceLoaderService {
    constructor(fileService, storageService, productService, environmentService, configurationService, extensionGalleryManifestService, logService) {
        super(fileService, storageService, productService, environmentService, configurationService, extensionGalleryManifestService, logService);
    }
    async readExtensionResource(uri) {
        uri = FileAccess.uriToBrowserUri(uri);
        if (uri.scheme !== Schemas.http && uri.scheme !== Schemas.https && uri.scheme !== Schemas.data) {
            const result = await this._fileService.readFile(uri);
            return result.value.toString();
        }
        const requestInit = {};
        if (await this.isExtensionGalleryResource(uri)) {
            requestInit.headers = await this.getExtensionGalleryRequestHeaders();
            requestInit.mode = 'cors'; /* set mode to cors so that above headers are always passed */
        }
        const response = await fetch(uri.toString(true), requestInit);
        if (response.status !== 200) {
            this._logService.info(`Request to '${uri.toString(true)}' failed with status code ${response.status}`);
            throw new Error(response.statusText);
        }
        return response.text();
    }
};
ExtensionResourceLoaderService = __decorate([
    __param(0, IFileService),
    __param(1, IStorageService),
    __param(2, IProductService),
    __param(3, IEnvironmentService),
    __param(4, IConfigurationService),
    __param(5, IExtensionGalleryManifestService),
    __param(6, ILogService)
], ExtensionResourceLoaderService);
registerSingleton(IExtensionResourceLoaderService, ExtensionResourceLoaderService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uUmVzb3VyY2VMb2FkZXJTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2V4dGVuc2lvblJlc291cmNlTG9hZGVyL2Jyb3dzZXIvZXh0ZW5zaW9uUmVzb3VyY2VMb2FkZXJTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBcUIsaUJBQWlCLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNoRyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDM0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxPQUFPLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUN0RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDekUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUN0RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUNwRixPQUFPLEVBQUUsc0NBQXNDLEVBQUUsK0JBQStCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUMvSCxPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSw4REFBOEQsQ0FBQztBQUVoSCxJQUFNLDhCQUE4QixHQUFwQyxNQUFNLDhCQUErQixTQUFRLHNDQUFzQztJQUlsRixZQUNlLFdBQXlCLEVBQ3RCLGNBQStCLEVBQy9CLGNBQStCLEVBQzNCLGtCQUF1QyxFQUNyQyxvQkFBMkMsRUFDaEMsK0JBQWlFLEVBQ3RGLFVBQXVCO1FBRXBDLEtBQUssQ0FBQyxXQUFXLEVBQUUsY0FBYyxFQUFFLGNBQWMsRUFBRSxrQkFBa0IsRUFBRSxvQkFBb0IsRUFBRSwrQkFBK0IsRUFBRSxVQUFVLENBQUMsQ0FBQztJQUMzSSxDQUFDO0lBRUQsS0FBSyxDQUFDLHFCQUFxQixDQUFDLEdBQVE7UUFDbkMsR0FBRyxHQUFHLFVBQVUsQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLENBQUM7UUFFdEMsSUFBSSxHQUFHLENBQUMsTUFBTSxLQUFLLE9BQU8sQ0FBQyxJQUFJLElBQUksR0FBRyxDQUFDLE1BQU0sS0FBSyxPQUFPLENBQUMsS0FBSyxJQUFJLEdBQUcsQ0FBQyxNQUFNLEtBQUssT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ2hHLE1BQU0sTUFBTSxHQUFHLE1BQU0sSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDckQsT0FBTyxNQUFNLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQ2hDLENBQUM7UUFFRCxNQUFNLFdBQVcsR0FBZ0IsRUFBRSxDQUFDO1FBQ3BDLElBQUksTUFBTSxJQUFJLENBQUMsMEJBQTBCLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUNoRCxXQUFXLENBQUMsT0FBTyxHQUFHLE1BQU0sSUFBSSxDQUFDLGlDQUFpQyxFQUFFLENBQUM7WUFDckUsV0FBVyxDQUFDLElBQUksR0FBRyxNQUFNLENBQUMsQ0FBQyw4REFBOEQ7UUFDMUYsQ0FBQztRQUVELE1BQU0sUUFBUSxHQUFHLE1BQU0sS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFDOUQsSUFBSSxRQUFRLENBQUMsTUFBTSxLQUFLLEdBQUcsRUFBRSxDQUFDO1lBQzdCLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLGVBQWUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsNkJBQTZCLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO1lBQ3ZHLE1BQU0sSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ3RDLENBQUM7UUFDRCxPQUFPLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUN4QixDQUFDO0NBQ0QsQ0FBQTtBQXJDSyw4QkFBOEI7SUFLakMsV0FBQSxZQUFZLENBQUE7SUFDWixXQUFBLGVBQWUsQ0FBQTtJQUNmLFdBQUEsZUFBZSxDQUFBO0lBQ2YsV0FBQSxtQkFBbUIsQ0FBQTtJQUNuQixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsZ0NBQWdDLENBQUE7SUFDaEMsV0FBQSxXQUFXLENBQUE7R0FYUiw4QkFBOEIsQ0FxQ25DO0FBRUQsaUJBQWlCLENBQUMsK0JBQStCLEVBQUUsOEJBQThCLG9DQUE0QixDQUFDIn0=