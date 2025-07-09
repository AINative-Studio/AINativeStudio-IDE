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
var UserDataProfilesReadonlyService_1, UserDataProfilesService_1;
import { URI } from '../../../base/common/uri.js';
import { INativeEnvironmentService } from '../../environment/common/environment.js';
import { IFileService } from '../../files/common/files.js';
import { ILogService } from '../../log/common/log.js';
import { IStateReadService, IStateService } from '../../state/node/state.js';
import { IUriIdentityService } from '../../uriIdentity/common/uriIdentity.js';
import { UserDataProfilesService as BaseUserDataProfilesService } from '../common/userDataProfile.js';
import { isString } from '../../../base/common/types.js';
import { StateService } from '../../state/node/stateService.js';
let UserDataProfilesReadonlyService = UserDataProfilesReadonlyService_1 = class UserDataProfilesReadonlyService extends BaseUserDataProfilesService {
    constructor(stateReadonlyService, uriIdentityService, nativeEnvironmentService, fileService, logService) {
        super(nativeEnvironmentService, fileService, uriIdentityService, logService);
        this.stateReadonlyService = stateReadonlyService;
        this.nativeEnvironmentService = nativeEnvironmentService;
    }
    getStoredProfiles() {
        const storedProfilesState = this.stateReadonlyService.getItem(UserDataProfilesReadonlyService_1.PROFILES_KEY, []);
        return storedProfilesState.map(p => ({ ...p, location: isString(p.location) ? this.uriIdentityService.extUri.joinPath(this.profilesHome, p.location) : URI.revive(p.location) }));
    }
    getStoredProfileAssociations() {
        return this.stateReadonlyService.getItem(UserDataProfilesReadonlyService_1.PROFILE_ASSOCIATIONS_KEY, {});
    }
    getDefaultProfileExtensionsLocation() {
        return this.uriIdentityService.extUri.joinPath(URI.file(this.nativeEnvironmentService.extensionsPath).with({ scheme: this.profilesHome.scheme }), 'extensions.json');
    }
};
UserDataProfilesReadonlyService = UserDataProfilesReadonlyService_1 = __decorate([
    __param(0, IStateReadService),
    __param(1, IUriIdentityService),
    __param(2, INativeEnvironmentService),
    __param(3, IFileService),
    __param(4, ILogService)
], UserDataProfilesReadonlyService);
export { UserDataProfilesReadonlyService };
let UserDataProfilesService = UserDataProfilesService_1 = class UserDataProfilesService extends UserDataProfilesReadonlyService {
    constructor(stateService, uriIdentityService, environmentService, fileService, logService) {
        super(stateService, uriIdentityService, environmentService, fileService, logService);
        this.stateService = stateService;
    }
    saveStoredProfiles(storedProfiles) {
        if (storedProfiles.length) {
            this.stateService.setItem(UserDataProfilesService_1.PROFILES_KEY, storedProfiles.map(profile => ({ ...profile, location: this.uriIdentityService.extUri.basename(profile.location) })));
        }
        else {
            this.stateService.removeItem(UserDataProfilesService_1.PROFILES_KEY);
        }
    }
    saveStoredProfileAssociations(storedProfileAssociations) {
        if (storedProfileAssociations.emptyWindows || storedProfileAssociations.workspaces) {
            this.stateService.setItem(UserDataProfilesService_1.PROFILE_ASSOCIATIONS_KEY, storedProfileAssociations);
        }
        else {
            this.stateService.removeItem(UserDataProfilesService_1.PROFILE_ASSOCIATIONS_KEY);
        }
    }
};
UserDataProfilesService = UserDataProfilesService_1 = __decorate([
    __param(0, IStateService),
    __param(1, IUriIdentityService),
    __param(2, INativeEnvironmentService),
    __param(3, IFileService),
    __param(4, ILogService)
], UserDataProfilesService);
export { UserDataProfilesService };
let ServerUserDataProfilesService = class ServerUserDataProfilesService extends UserDataProfilesService {
    constructor(uriIdentityService, environmentService, fileService, logService) {
        super(new StateService(0 /* SaveStrategy.IMMEDIATE */, environmentService, logService, fileService), uriIdentityService, environmentService, fileService, logService);
    }
    async init() {
        await this.stateService.init();
        return super.init();
    }
};
ServerUserDataProfilesService = __decorate([
    __param(0, IUriIdentityService),
    __param(1, INativeEnvironmentService),
    __param(2, IFileService),
    __param(3, ILogService)
], ServerUserDataProfilesService);
export { ServerUserDataProfilesService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFQcm9maWxlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3VzZXJEYXRhUHJvZmlsZS9ub2RlL3VzZXJEYXRhUHJvZmlsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLEdBQUcsRUFBVSxNQUFNLDZCQUE2QixDQUFDO0FBQzFELE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUMzRCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDdEQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLGFBQWEsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQzdFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzlFLE9BQU8sRUFBNEIsdUJBQXVCLElBQUksMkJBQTJCLEVBQW9ELE1BQU0sOEJBQThCLENBQUM7QUFDbEwsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3pELE9BQU8sRUFBZ0IsWUFBWSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFJdkUsSUFBTSwrQkFBK0IsdUNBQXJDLE1BQU0sK0JBQWdDLFNBQVEsMkJBQTJCO0lBRS9FLFlBQ3FDLG9CQUF1QyxFQUN0RCxrQkFBdUMsRUFDaEIsd0JBQW1ELEVBQ2pGLFdBQXlCLEVBQzFCLFVBQXVCO1FBRXBDLEtBQUssQ0FBQyx3QkFBd0IsRUFBRSxXQUFXLEVBQUUsa0JBQWtCLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFOekMseUJBQW9CLEdBQXBCLG9CQUFvQixDQUFtQjtRQUUvQiw2QkFBd0IsR0FBeEIsd0JBQXdCLENBQTJCO0lBS2hHLENBQUM7SUFFa0IsaUJBQWlCO1FBQ25DLE1BQU0sbUJBQW1CLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLE9BQU8sQ0FBdUMsaUNBQStCLENBQUMsWUFBWSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ3RKLE9BQU8sbUJBQW1CLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxFQUFFLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDbkwsQ0FBQztJQUVrQiw0QkFBNEI7UUFDOUMsT0FBTyxJQUFJLENBQUMsb0JBQW9CLENBQUMsT0FBTyxDQUE0QixpQ0FBK0IsQ0FBQyx3QkFBd0IsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUNuSSxDQUFDO0lBRWtCLG1DQUFtQztRQUNyRCxPQUFPLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLHdCQUF3QixDQUFDLGNBQWMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztJQUN0SyxDQUFDO0NBRUQsQ0FBQTtBQXpCWSwrQkFBK0I7SUFHekMsV0FBQSxpQkFBaUIsQ0FBQTtJQUNqQixXQUFBLG1CQUFtQixDQUFBO0lBQ25CLFdBQUEseUJBQXlCLENBQUE7SUFDekIsV0FBQSxZQUFZLENBQUE7SUFDWixXQUFBLFdBQVcsQ0FBQTtHQVBELCtCQUErQixDQXlCM0M7O0FBRU0sSUFBTSx1QkFBdUIsK0JBQTdCLE1BQU0sdUJBQXdCLFNBQVEsK0JBQStCO0lBRTNFLFlBQ21DLFlBQTJCLEVBQ3hDLGtCQUF1QyxFQUNqQyxrQkFBNkMsRUFDMUQsV0FBeUIsRUFDMUIsVUFBdUI7UUFFcEMsS0FBSyxDQUFDLFlBQVksRUFBRSxrQkFBa0IsRUFBRSxrQkFBa0IsRUFBRSxXQUFXLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFObkQsaUJBQVksR0FBWixZQUFZLENBQWU7SUFPOUQsQ0FBQztJQUVrQixrQkFBa0IsQ0FBQyxjQUF1QztRQUM1RSxJQUFJLGNBQWMsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUMzQixJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyx5QkFBdUIsQ0FBQyxZQUFZLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxHQUFHLE9BQU8sRUFBRSxRQUFRLEVBQUUsSUFBSSxDQUFDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdkwsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLENBQUMsWUFBWSxDQUFDLFVBQVUsQ0FBQyx5QkFBdUIsQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUNwRSxDQUFDO0lBQ0YsQ0FBQztJQUVrQiw2QkFBNkIsQ0FBQyx5QkFBb0Q7UUFDcEcsSUFBSSx5QkFBeUIsQ0FBQyxZQUFZLElBQUkseUJBQXlCLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDcEYsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMseUJBQXVCLENBQUMsd0JBQXdCLEVBQUUseUJBQXlCLENBQUMsQ0FBQztRQUN4RyxDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDLHlCQUF1QixDQUFDLHdCQUF3QixDQUFDLENBQUM7UUFDaEYsQ0FBQztJQUNGLENBQUM7Q0FDRCxDQUFBO0FBM0JZLHVCQUF1QjtJQUdqQyxXQUFBLGFBQWEsQ0FBQTtJQUNiLFdBQUEsbUJBQW1CLENBQUE7SUFDbkIsV0FBQSx5QkFBeUIsQ0FBQTtJQUN6QixXQUFBLFlBQVksQ0FBQTtJQUNaLFdBQUEsV0FBVyxDQUFBO0dBUEQsdUJBQXVCLENBMkJuQzs7QUFFTSxJQUFNLDZCQUE2QixHQUFuQyxNQUFNLDZCQUE4QixTQUFRLHVCQUF1QjtJQUV6RSxZQUNzQixrQkFBdUMsRUFDakMsa0JBQTZDLEVBQzFELFdBQXlCLEVBQzFCLFVBQXVCO1FBRXBDLEtBQUssQ0FBQyxJQUFJLFlBQVksaUNBQXlCLGtCQUFrQixFQUFFLFVBQVUsRUFBRSxXQUFXLENBQUMsRUFBRSxrQkFBa0IsRUFBRSxrQkFBa0IsRUFBRSxXQUFXLEVBQUUsVUFBVSxDQUFDLENBQUM7SUFDL0osQ0FBQztJQUVRLEtBQUssQ0FBQyxJQUFJO1FBQ2xCLE1BQU8sSUFBSSxDQUFDLFlBQTZCLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDakQsT0FBTyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUM7SUFDckIsQ0FBQztDQUVELENBQUE7QUFoQlksNkJBQTZCO0lBR3ZDLFdBQUEsbUJBQW1CLENBQUE7SUFDbkIsV0FBQSx5QkFBeUIsQ0FBQTtJQUN6QixXQUFBLFlBQVksQ0FBQTtJQUNaLFdBQUEsV0FBVyxDQUFBO0dBTkQsNkJBQTZCLENBZ0J6QyJ9