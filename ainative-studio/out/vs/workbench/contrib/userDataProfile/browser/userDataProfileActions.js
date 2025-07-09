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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFQcm9maWxlQWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi91c2VyRGF0YVByb2ZpbGUvYnJvd3Nlci91c2VyRGF0YVByb2ZpbGVBY3Rpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUMvQyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sOERBQThELENBQUM7QUFDMUYsT0FBTyxFQUFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUUxRixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQztBQUMxRyxPQUFPLEVBQUUsaUNBQWlDLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw2REFBNkQsQ0FBQztBQUVuSSxNQUFNLDRCQUE2QixTQUFRLE9BQU87YUFDakMsT0FBRSxHQUFHLG1EQUFtRCxDQUFDO2FBQ3pELFVBQUssR0FBRyxTQUFTLENBQUMsMEJBQTBCLEVBQUUsNEJBQTRCLENBQUMsQ0FBQztJQUM1RjtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSw0QkFBNEIsQ0FBQyxFQUFFO1lBQ25DLEtBQUssRUFBRSw0QkFBNEIsQ0FBQyxLQUFLO1lBQ3pDLFFBQVEsRUFBRSxpQkFBaUI7WUFDM0IsRUFBRSxFQUFFLElBQUk7U0FDUixDQUFDLENBQUM7SUFDSixDQUFDO0lBRUQsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUEwQjtRQUNuQyxPQUFPLFFBQVEsQ0FBQyxHQUFHLENBQUMsaUNBQWlDLENBQUMsQ0FBQyw4QkFBOEIsRUFBRSxDQUFDO0lBQ3pGLENBQUM7O0FBR0YsZUFBZSxDQUFDLDRCQUE0QixDQUFDLENBQUM7QUFFOUMsb0JBQW9CO0FBRXBCLGVBQWUsQ0FBQyxNQUFNLHFCQUFzQixTQUFRLE9BQU87SUFDMUQ7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsNENBQTRDO1lBQ2hELEtBQUssRUFBRSxTQUFTLENBQUMsaUJBQWlCLEVBQUUsa0JBQWtCLENBQUM7WUFDdkQsUUFBUSxFQUFFLFVBQVUsQ0FBQyxTQUFTO1lBQzlCLEVBQUUsRUFBRSxJQUFJO1NBQ1IsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVELEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBMEI7UUFDbkMsT0FBTyxRQUFRLENBQUMsR0FBRyxDQUFDLHdCQUF3QixDQUFDLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDekQsQ0FBQztDQUNELENBQUMsQ0FBQztBQUVILGVBQWUsQ0FBQyxNQUFNLHFCQUFzQixTQUFRLE9BQU87SUFDMUQ7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsNENBQTRDO1lBQ2hELEtBQUssRUFBRSxTQUFTLENBQUMsa0JBQWtCLEVBQUUsdUNBQXVDLENBQUM7WUFDN0UsUUFBUSxFQUFFLFVBQVUsQ0FBQyxTQUFTO1lBQzlCLEVBQUUsRUFBRSxJQUFJO1NBQ1IsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVELEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBMEI7UUFDbkMsTUFBTSx1QkFBdUIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLHdCQUF3QixDQUFDLENBQUM7UUFDdkUsT0FBTyx1QkFBdUIsQ0FBQyxlQUFlLEVBQUUsQ0FBQztJQUNsRCxDQUFDO0NBQ0QsQ0FBQyxDQUFDIn0=