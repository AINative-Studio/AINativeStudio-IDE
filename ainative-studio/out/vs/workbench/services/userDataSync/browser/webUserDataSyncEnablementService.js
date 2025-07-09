/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IUserDataSyncEnablementService } from '../../../../platform/userDataSync/common/userDataSync.js';
import { UserDataSyncEnablementService } from './userDataSyncEnablementService.js';
export class WebUserDataSyncEnablementService extends UserDataSyncEnablementService {
    constructor() {
        super(...arguments);
        this.enabled = undefined;
    }
    canToggleEnablement() {
        return this.isTrusted() && super.canToggleEnablement();
    }
    isEnabled() {
        if (!this.isTrusted()) {
            return false;
        }
        if (this.enabled === undefined) {
            this.enabled = this.workbenchEnvironmentService.options?.settingsSyncOptions?.enabled;
        }
        if (this.enabled === undefined) {
            this.enabled = super.isEnabled();
        }
        return this.enabled;
    }
    setEnablement(enabled) {
        if (enabled && !this.canToggleEnablement()) {
            return;
        }
        if (this.enabled !== enabled) {
            this.enabled = enabled;
            super.setEnablement(enabled);
        }
    }
    getResourceSyncStateVersion(resource) {
        return resource === "extensions" /* SyncResource.Extensions */ ? this.workbenchEnvironmentService.options?.settingsSyncOptions?.extensionsSyncStateVersion : undefined;
    }
    isTrusted() {
        return !!this.workbenchEnvironmentService.options?.workspaceProvider?.trusted;
    }
}
registerSingleton(IUserDataSyncEnablementService, WebUserDataSyncEnablementService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2ViVXNlckRhdGFTeW5jRW5hYmxlbWVudFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3VzZXJEYXRhU3luYy9icm93c2VyL3dlYlVzZXJEYXRhU3luY0VuYWJsZW1lbnRTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBcUIsaUJBQWlCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUMvRyxPQUFPLEVBQUUsOEJBQThCLEVBQWdCLE1BQU0sMERBQTBELENBQUM7QUFDeEgsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFFbkYsTUFBTSxPQUFPLGdDQUFpQyxTQUFRLDZCQUE2QjtJQUFuRjs7UUFFUyxZQUFPLEdBQXdCLFNBQVMsQ0FBQztJQXFDbEQsQ0FBQztJQW5DUyxtQkFBbUI7UUFDM0IsT0FBTyxJQUFJLENBQUMsU0FBUyxFQUFFLElBQUksS0FBSyxDQUFDLG1CQUFtQixFQUFFLENBQUM7SUFDeEQsQ0FBQztJQUVRLFNBQVM7UUFDakIsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDO1lBQ3ZCLE9BQU8sS0FBSyxDQUFDO1FBQ2QsQ0FBQztRQUNELElBQUksSUFBSSxDQUFDLE9BQU8sS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUNoQyxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsT0FBTyxDQUFDO1FBQ3ZGLENBQUM7UUFDRCxJQUFJLElBQUksQ0FBQyxPQUFPLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDaEMsSUFBSSxDQUFDLE9BQU8sR0FBRyxLQUFLLENBQUMsU0FBUyxFQUFFLENBQUM7UUFDbEMsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQztJQUNyQixDQUFDO0lBRVEsYUFBYSxDQUFDLE9BQWdCO1FBQ3RDLElBQUksT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLG1CQUFtQixFQUFFLEVBQUUsQ0FBQztZQUM1QyxPQUFPO1FBQ1IsQ0FBQztRQUNELElBQUksSUFBSSxDQUFDLE9BQU8sS0FBSyxPQUFPLEVBQUUsQ0FBQztZQUM5QixJQUFJLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQztZQUN2QixLQUFLLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzlCLENBQUM7SUFDRixDQUFDO0lBRVEsMkJBQTJCLENBQUMsUUFBc0I7UUFDMUQsT0FBTyxRQUFRLCtDQUE0QixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsMkJBQTJCLENBQUMsT0FBTyxFQUFFLG1CQUFtQixFQUFFLDBCQUEwQixDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUM7SUFDckosQ0FBQztJQUVPLFNBQVM7UUFDaEIsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLDJCQUEyQixDQUFDLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxPQUFPLENBQUM7SUFDL0UsQ0FBQztDQUVEO0FBRUQsaUJBQWlCLENBQUMsOEJBQThCLEVBQUUsZ0NBQWdDLG9DQUE0QixDQUFDIn0=