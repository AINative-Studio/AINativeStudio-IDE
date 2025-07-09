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
import { INativeEnvironmentService } from '../../environment/common/environment.js';
import { IFileService } from '../../files/common/files.js';
import { refineServiceDecorator } from '../../instantiation/common/instantiation.js';
import { ILogService } from '../../log/common/log.js';
import { IUriIdentityService } from '../../uriIdentity/common/uriIdentity.js';
import { IUserDataProfilesService } from '../common/userDataProfile.js';
import { UserDataProfilesService } from '../node/userDataProfile.js';
import { IStateService } from '../../state/node/state.js';
export const IUserDataProfilesMainService = refineServiceDecorator(IUserDataProfilesService);
let UserDataProfilesMainService = class UserDataProfilesMainService extends UserDataProfilesService {
    constructor(stateService, uriIdentityService, environmentService, fileService, logService) {
        super(stateService, uriIdentityService, environmentService, fileService, logService);
    }
    getAssociatedEmptyWindows() {
        const emptyWindows = [];
        for (const id of this.profilesObject.emptyWindows.keys()) {
            emptyWindows.push({ id });
        }
        return emptyWindows;
    }
};
UserDataProfilesMainService = __decorate([
    __param(0, IStateService),
    __param(1, IUriIdentityService),
    __param(2, INativeEnvironmentService),
    __param(3, IFileService),
    __param(4, ILogService)
], UserDataProfilesMainService);
export { UserDataProfilesMainService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFQcm9maWxlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3VzZXJEYXRhUHJvZmlsZS9lbGVjdHJvbi1tYWluL3VzZXJEYXRhUHJvZmlsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNwRixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDM0QsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDckYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBQ3RELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzlFLE9BQU8sRUFBRSx3QkFBd0IsRUFBb0UsTUFBTSw4QkFBOEIsQ0FBQztBQUMxSSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUVyRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFFMUQsTUFBTSxDQUFDLE1BQU0sNEJBQTRCLEdBQUcsc0JBQXNCLENBQXlELHdCQUF3QixDQUFDLENBQUM7QUFTOUksSUFBTSwyQkFBMkIsR0FBakMsTUFBTSwyQkFBNEIsU0FBUSx1QkFBdUI7SUFFdkUsWUFDZ0IsWUFBMkIsRUFDckIsa0JBQXVDLEVBQ2pDLGtCQUE2QyxFQUMxRCxXQUF5QixFQUMxQixVQUF1QjtRQUVwQyxLQUFLLENBQUMsWUFBWSxFQUFFLGtCQUFrQixFQUFFLGtCQUFrQixFQUFFLFdBQVcsRUFBRSxVQUFVLENBQUMsQ0FBQztJQUN0RixDQUFDO0lBRUQseUJBQXlCO1FBQ3hCLE1BQU0sWUFBWSxHQUFnQyxFQUFFLENBQUM7UUFDckQsS0FBSyxNQUFNLEVBQUUsSUFBSSxJQUFJLENBQUMsY0FBYyxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDO1lBQzFELFlBQVksQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQzNCLENBQUM7UUFDRCxPQUFPLFlBQVksQ0FBQztJQUNyQixDQUFDO0NBRUQsQ0FBQTtBQXBCWSwyQkFBMkI7SUFHckMsV0FBQSxhQUFhLENBQUE7SUFDYixXQUFBLG1CQUFtQixDQUFBO0lBQ25CLFdBQUEseUJBQXlCLENBQUE7SUFDekIsV0FBQSxZQUFZLENBQUE7SUFDWixXQUFBLFdBQVcsQ0FBQTtHQVBELDJCQUEyQixDQW9CdkMifQ==