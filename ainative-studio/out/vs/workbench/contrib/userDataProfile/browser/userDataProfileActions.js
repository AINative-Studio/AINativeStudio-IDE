/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize2 } from '../../../../nls.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { IUserDataProfilesService } from '../../../../platform/userDataProfile/common/userDataProfile.js';
import { IUserDataProfileManagementService, PROFILES_CATEGORY } from '../../../services/userDataProfile/common/userDataProfile.js';
class CreateTransientProfileAction extends Action2 {
    static { this.ID = 'workbench.profiles.actions.createTemporaryProfile'; }
    static { this.TITLE = localize2('create temporary profile', "Create a Temporary Profile"); }
    constructor() {
        super({
            id: CreateTransientProfileAction.ID,
            title: CreateTransientProfileAction.TITLE,
            category: PROFILES_CATEGORY,
            f1: true,
        });
    }
    async run(accessor) {
        return accessor.get(IUserDataProfileManagementService).createAndEnterTransientProfile();
    }
}
registerAction2(CreateTransientProfileAction);
// Developer Actions
registerAction2(class CleanupProfilesAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.profiles.actions.cleanupProfiles',
            title: localize2('cleanup profile', "Cleanup Profiles"),
            category: Categories.Developer,
            f1: true,
        });
    }
    async run(accessor) {
        return accessor.get(IUserDataProfilesService).cleanUp();
    }
});
registerAction2(class ResetWorkspacesAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.profiles.actions.resetWorkspaces',
            title: localize2('reset workspaces', "Reset Workspace Profiles Associations"),
            category: Categories.Developer,
            f1: true,
        });
    }
    async run(accessor) {
        const userDataProfilesService = accessor.get(IUserDataProfilesService);
        return userDataProfilesService.resetWorkspaces();
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFQcm9maWxlQWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3VzZXJEYXRhUHJvZmlsZS9icm93c2VyL3VzZXJEYXRhUHJvZmlsZUFjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQy9DLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw4REFBOEQsQ0FBQztBQUMxRixPQUFPLEVBQUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBRTFGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGdFQUFnRSxDQUFDO0FBQzFHLE9BQU8sRUFBRSxpQ0FBaUMsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDZEQUE2RCxDQUFDO0FBRW5JLE1BQU0sNEJBQTZCLFNBQVEsT0FBTzthQUNqQyxPQUFFLEdBQUcsbURBQW1ELENBQUM7YUFDekQsVUFBSyxHQUFHLFNBQVMsQ0FBQywwQkFBMEIsRUFBRSw0QkFBNEIsQ0FBQyxDQUFDO0lBQzVGO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLDRCQUE0QixDQUFDLEVBQUU7WUFDbkMsS0FBSyxFQUFFLDRCQUE0QixDQUFDLEtBQUs7WUFDekMsUUFBUSxFQUFFLGlCQUFpQjtZQUMzQixFQUFFLEVBQUUsSUFBSTtTQUNSLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRCxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQTBCO1FBQ25DLE9BQU8sUUFBUSxDQUFDLEdBQUcsQ0FBQyxpQ0FBaUMsQ0FBQyxDQUFDLDhCQUE4QixFQUFFLENBQUM7SUFDekYsQ0FBQzs7QUFHRixlQUFlLENBQUMsNEJBQTRCLENBQUMsQ0FBQztBQUU5QyxvQkFBb0I7QUFFcEIsZUFBZSxDQUFDLE1BQU0scUJBQXNCLFNBQVEsT0FBTztJQUMxRDtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSw0Q0FBNEM7WUFDaEQsS0FBSyxFQUFFLFNBQVMsQ0FBQyxpQkFBaUIsRUFBRSxrQkFBa0IsQ0FBQztZQUN2RCxRQUFRLEVBQUUsVUFBVSxDQUFDLFNBQVM7WUFDOUIsRUFBRSxFQUFFLElBQUk7U0FDUixDQUFDLENBQUM7SUFDSixDQUFDO0lBRUQsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUEwQjtRQUNuQyxPQUFPLFFBQVEsQ0FBQyxHQUFHLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUN6RCxDQUFDO0NBQ0QsQ0FBQyxDQUFDO0FBRUgsZUFBZSxDQUFDLE1BQU0scUJBQXNCLFNBQVEsT0FBTztJQUMxRDtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSw0Q0FBNEM7WUFDaEQsS0FBSyxFQUFFLFNBQVMsQ0FBQyxrQkFBa0IsRUFBRSx1Q0FBdUMsQ0FBQztZQUM3RSxRQUFRLEVBQUUsVUFBVSxDQUFDLFNBQVM7WUFDOUIsRUFBRSxFQUFFLElBQUk7U0FDUixDQUFDLENBQUM7SUFDSixDQUFDO0lBRUQsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUEwQjtRQUNuQyxNQUFNLHVCQUF1QixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsd0JBQXdCLENBQUMsQ0FBQztRQUN2RSxPQUFPLHVCQUF1QixDQUFDLGVBQWUsRUFBRSxDQUFDO0lBQ2xELENBQUM7Q0FDRCxDQUFDLENBQUMifQ==