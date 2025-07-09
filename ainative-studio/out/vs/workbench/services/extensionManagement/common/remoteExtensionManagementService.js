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
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { IRemoteUserDataProfilesService } from '../../userDataProfile/common/remoteUserDataProfiles.js';
import { ProfileAwareExtensionManagementChannelClient } from './extensionManagementChannelClient.js';
import { IUserDataProfileService } from '../../userDataProfile/common/userDataProfile.js';
import { IUserDataProfilesService } from '../../../../platform/userDataProfile/common/userDataProfile.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IAllowedExtensionsService } from '../../../../platform/extensionManagement/common/extensionManagement.js';
let RemoteExtensionManagementService = class RemoteExtensionManagementService extends ProfileAwareExtensionManagementChannelClient {
    constructor(channel, productService, allowedExtensionsService, userDataProfileService, userDataProfilesService, remoteUserDataProfilesService, uriIdentityService) {
        super(channel, productService, allowedExtensionsService, userDataProfileService, uriIdentityService);
        this.userDataProfilesService = userDataProfilesService;
        this.remoteUserDataProfilesService = remoteUserDataProfilesService;
    }
    async filterEvent(profileLocation, applicationScoped) {
        if (applicationScoped) {
            return true;
        }
        if (!profileLocation && this.userDataProfileService.currentProfile.isDefault) {
            return true;
        }
        const currentRemoteProfile = await this.remoteUserDataProfilesService.getRemoteProfile(this.userDataProfileService.currentProfile);
        if (this.uriIdentityService.extUri.isEqual(currentRemoteProfile.extensionsResource, profileLocation)) {
            return true;
        }
        return false;
    }
    async getProfileLocation(profileLocation) {
        if (!profileLocation && this.userDataProfileService.currentProfile.isDefault) {
            return undefined;
        }
        profileLocation = await super.getProfileLocation(profileLocation);
        let profile = this.userDataProfilesService.profiles.find(p => this.uriIdentityService.extUri.isEqual(p.extensionsResource, profileLocation));
        if (profile) {
            profile = await this.remoteUserDataProfilesService.getRemoteProfile(profile);
        }
        else {
            profile = (await this.remoteUserDataProfilesService.getRemoteProfiles()).find(p => this.uriIdentityService.extUri.isEqual(p.extensionsResource, profileLocation));
        }
        return profile?.extensionsResource;
    }
    async switchExtensionsProfile(previousProfileLocation, currentProfileLocation, preserveExtensions) {
        const remoteProfiles = await this.remoteUserDataProfilesService.getRemoteProfiles();
        const previousProfile = remoteProfiles.find(p => this.uriIdentityService.extUri.isEqual(p.extensionsResource, previousProfileLocation));
        const currentProfile = remoteProfiles.find(p => this.uriIdentityService.extUri.isEqual(p.extensionsResource, currentProfileLocation));
        if (previousProfile?.id === currentProfile?.id) {
            return { added: [], removed: [] };
        }
        return super.switchExtensionsProfile(previousProfileLocation, currentProfileLocation, preserveExtensions);
    }
};
RemoteExtensionManagementService = __decorate([
    __param(1, IProductService),
    __param(2, IAllowedExtensionsService),
    __param(3, IUserDataProfileService),
    __param(4, IUserDataProfilesService),
    __param(5, IRemoteUserDataProfilesService),
    __param(6, IUriIdentityService)
], RemoteExtensionManagementService);
export { RemoteExtensionManagementService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlRXh0ZW5zaW9uTWFuYWdlbWVudFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2V4dGVuc2lvbk1hbmFnZW1lbnQvY29tbW9uL3JlbW90ZUV4dGVuc2lvbk1hbmFnZW1lbnRTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBS2hHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBQzdGLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBQ3hHLE9BQU8sRUFBRSw0Q0FBNEMsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ3JHLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGdFQUFnRSxDQUFDO0FBRTFHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUN4RixPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSx3RUFBd0UsQ0FBQztBQUU1RyxJQUFNLGdDQUFnQyxHQUF0QyxNQUFNLGdDQUFpQyxTQUFRLDRDQUE0QztJQUVqRyxZQUNDLE9BQWlCLEVBQ0EsY0FBK0IsRUFDckIsd0JBQW1ELEVBQ3JELHNCQUErQyxFQUM3Qix1QkFBaUQsRUFDM0MsNkJBQTZELEVBQ3pGLGtCQUF1QztRQUU1RCxLQUFLLENBQUMsT0FBTyxFQUFFLGNBQWMsRUFBRSx3QkFBd0IsRUFBRSxzQkFBc0IsRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO1FBSjFELDRCQUF1QixHQUF2Qix1QkFBdUIsQ0FBMEI7UUFDM0Msa0NBQTZCLEdBQTdCLDZCQUE2QixDQUFnQztJQUkvRyxDQUFDO0lBRVMsS0FBSyxD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