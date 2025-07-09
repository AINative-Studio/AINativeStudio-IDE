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
import { IAllowedExtensionsService } from '../../../../platform/extensionManagement/common/extensionManagement.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { IUserDataProfileService } from '../../userDataProfile/common/userDataProfile.js';
import { joinPath } from '../../../../base/common/resources.js';
import { Schemas } from '../../../../base/common/network.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IDownloadService } from '../../../../platform/download/common/download.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { ProfileAwareExtensionManagementChannelClient } from '../common/extensionManagementChannelClient.js';
import { ExtensionIdentifier, isResolverExtension } from '../../../../platform/extensions/common/extensions.js';
import { INativeWorkbenchEnvironmentService } from '../../environment/electron-sandbox/environmentService.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
let NativeExtensionManagementService = class NativeExtensionManagementService extends ProfileAwareExtensionManagementChannelClient {
    constructor(channel, productService, allowedExtensionsService, userDataProfileService, uriIdentityService, fileService, downloadService, nativeEnvironmentService, logService) {
        super(channel, productService, allowedExtensionsService, userDataProfileService, uriIdentityService);
        this.fileService = fileService;
        this.downloadService = downloadService;
        this.nativeEnvironmentService = nativeEnvironmentService;
        this.logService = logService;
    }
    filterEvent(profileLocation, isApplicationScoped) {
        return isApplicationScoped || this.uriIdentityService.extUri.isEqual(this.userDataProfileService.currentProfile.extensionsResource, profileLocation);
    }
    async install(vsix, options) {
        const { location, cleanup } = await this.downloadVsix(vsix);
        try {
            return await super.install(location, options);
        }
        finally {
            await cleanup();
        }
    }
    async downloadVsix(vsix) {
        if (vsix.scheme === Schemas.file) {
            return { location: vsix, async cleanup() { } };
        }
        this.logService.trace('Downloading extension from', vsix.toString());
        const location = joinPath(this.nativeEnvironmentService.extensionsDownloadLocation, generateUuid());
        await this.downloadService.download(vsix, location);
        this.logService.info('Downloaded extension to', location.toString());
        const cleanup = async () => {
            try {
                await this.fileService.del(location);
            }
            catch (error) {
                this.logService.error(error);
            }
        };
        return { location, cleanup };
    }
    async switchExtensionsProfile(previousProfileLocation, currentProfileLocation, preserveExtensions) {
        if (this.nativeEnvironmentService.remoteAuthority) {
            const previousInstalledExtensions = await this.getInstalled(1 /* ExtensionType.User */, previousProfileLocation);
            const resolverExtension = previousInstalledExtensions.find(e => isResolverExtension(e.manifest, this.nativeEnvironmentService.remoteAuthority));
            if (resolverExtension) {
                if (!preserveExtensions) {
                    preserveExtensions = [];
                }
                preserveExtensions.push(new ExtensionIdentifier(resolverExtension.identifier.id));
            }
        }
        return super.switchExtensionsProfile(previousProfileLocation, currentProfileLocation, preserveExtensions);
    }
};
NativeExtensionManagementService = __decorate([
    __param(1, IProductService),
    __param(2, IAllowedExtensionsService),
    __param(3, IUserDataProfileService),
    __param(4, IUriIdentityService),
    __param(5, IFileService),
    __param(6, IDownloadService),
    __param(7, INativeWorkbenchEnvironmentService),
    __param(8, ILogService)
], NativeExtensionManagementService);
export { NativeExtensionManagementService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmF0aXZlRXh0ZW5zaW9uTWFuYWdlbWVudFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2V4dGVuc2lvbk1hbmFnZW1lbnQvZWxlY3Ryb24tc2FuZGJveC9uYXRpdmVFeHRlbnNpb25NYW5hZ2VtZW50U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUtoRyxPQUFPLEVBQUUseUJBQXlCLEVBQW1DLE1BQU0sd0VBQXdFLENBQUM7QUFDcEosT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDN0YsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0saURBQWlELENBQUM7QUFDMUYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM3RCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDckUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDcEYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsNENBQTRDLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUM3RyxPQUFPLEVBQUUsbUJBQW1CLEVBQWlCLG1CQUFtQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDL0gsT0FBTyxFQUFFLGtDQUFrQyxFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDOUcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBRWpGLElBQU0sZ0NBQWdDLEdBQXRDLE1BQU0sZ0NBQWlDLFNBQVEsNENBQTRDO0lBRWpHLFlBQ0MsT0FBaUIsRUFDQSxjQUErQixFQUNyQix3QkFBbUQsRUFDckQsc0JBQStDLEVBQ25ELGtCQUF1QyxFQUM3QixXQUF5QixFQUNyQixlQUFpQyxFQUNmLHdCQUE0RCxFQUNuRixVQUF1QjtRQUVyRCxLQUFLLENBQUMsT0FBTyxFQUFFLGNBQWMsRUFBRSx3QkFBd0IsRUFBRSxzQkFBc0IsRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO1FBTHRFLGdCQUFXLEdBQVgsV0FBVyxDQUFjO1FBQ3JCLG9CQUFlLEdBQWYsZUFBZSxDQUFrQjtRQUNmLDZCQUF3QixHQUF4Qix3QkFBd0IsQ0FBb0M7UUFDbkYsZUFBVSxHQUFWLFVBQVUsQ0FBYTtJQUd0RCxDQUFDO0lBRVMsV0FBVyxDQUFDLGVBQW9CLEVBQUUsbUJBQTRCO1FBQ3ZFLE9BQU8sbUJBQW1CLElBQUksSUFBSSxDQUFDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLHNCQUFzQixDQUFDLGNBQWMsQ0FBQyxrQkFBa0IsRUFBRSxlQUFlLENBQUMsQ0FBQztJQUN0SixDQUFDO0lBRVEsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFTLEVBQUUsT0FBd0I7UUFDekQsTUFBTSxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsR0FBRyxNQUFNLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDNUQsSUFBSSxDQUFDO1lBQ0osT0FBTyxNQUFNLEtBQUssQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQy9DLENBQUM7Z0JBQVMsQ0FBQztZQUNWLE1BQU0sT0FBTyxFQUFFLENBQUM7UUFDakIsQ0FBQztJQUNGLENBQUM7SUFFTyxLQUFLLENBQUMsWUFBWSxDQUFDLElBQVM7UUFDbkMsSUFBSSxJQUFJLENBQUMsTUFBTSxLQUFLLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNsQyxPQUFPLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxLQUFLLENBQUMsT0FBTyxLQUFLLENBQUMsRUFBRSxDQUFDO1FBQ2hELENBQUM7UUFDRCxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyw0QkFBNEIsRUFBRSxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztRQUNyRSxNQUFNLFFBQVEsR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLHdCQUF3QixDQUFDLDBCQUEwQixFQUFFLFlBQVksRUFBRSxDQUFDLENBQUM7UUFDcEcsTUFBTSxJQUFJLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDcEQsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMseUJBQXlCLEVBQUUsUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7UUFDckUsTUFBTSxPQUFPLEdBQUcsS0FBSyxJQUFJLEVBQUU7WUFDMUIsSUFBSSxDQUFDO2dCQUNKLE1BQU0sSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDdEMsQ0FBQztZQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7Z0JBQ2hCLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQzlCLENBQUM7UUFDRixDQUFDLENBQUM7UUFDRixPQUFPLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxDQUFDO0lBQzlCLENBQUM7SUFFa0IsS0FBSyxDQUFDLHVCQUF1QixDQUFDLHVCQUE0QixFQUFFLHNCQUEyQixFQUFFLGtCQUEwQztRQUNySixJQUFJLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUNuRCxNQUFNLDJCQUEyQixHQUFHLE1BQU0sSUFBSSxDQUFDLFlBQVksNkJBQXFCLHVCQUF1QixDQUFDLENBQUM7WUFDekcsTUFBTSxpQkFBaUIsR0FBRywyQkFBMkIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDO1lBQ2hKLElBQUksaUJBQWlCLEVBQUUsQ0FBQztnQkFDdkIsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUM7b0JBQ3pCLGtCQUFrQixHQUFHLEVBQUUsQ0FBQztnQkFDekIsQ0FBQztnQkFDRCxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxtQkFBbUIsQ0FBQyxpQkFBaUIsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUNuRixDQUFDO1FBQ0YsQ0FBQztRQUNELE9BQU8sS0FBSyxDQUFDLHVCQUF1QixDQUFDLHVCQUF1QixFQUFFLHNCQUFzQixFQUFFLGtCQUFrQixDQUFDLENBQUM7SUFDM0csQ0FBQztDQUNELENBQUE7QUE1RFksZ0NBQWdDO0lBSTFDLFdBQUEsZUFBZSxDQUFBO0lBQ2YsV0FBQSx5QkFBeUIsQ0FBQTtJQUN6QixXQUFBLHVCQUF1QixDQUFBO0lBQ3ZCLFdBQUEsbUJBQW1CLENBQUE7SUFDbkIsV0FBQSxZQUFZLENBQUE7SUFDWixXQUFBLGdCQUFnQixDQUFBO0lBQ2hCLFdBQUEsa0NBQWtDLENBQUE7SUFDbEMsV0FBQSxXQUFXLENBQUE7R0FYRCxnQ0FBZ0MsQ0E0RDVDIn0=