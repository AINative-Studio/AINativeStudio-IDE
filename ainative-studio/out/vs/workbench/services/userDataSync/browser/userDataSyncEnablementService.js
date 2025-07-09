/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IUserDataSyncEnablementService } from '../../../../platform/userDataSync/common/userDataSync.js';
import { UserDataSyncEnablementService as BaseUserDataSyncEnablementService } from '../../../../platform/userDataSync/common/userDataSyncEnablementService.js';
export class UserDataSyncEnablementService extends BaseUserDataSyncEnablementService {
    get workbenchEnvironmentService() { return this.environmentService; }
    getResourceSyncStateVersion(resource) {
        return resource === "extensions" /* SyncResource.Extensions */ ? this.workbenchEnvironmentService.options?.settingsSyncOptions?.extensionsSyncStateVersion : undefined;
    }
}
registerSingleton(IUserDataSyncEnablementService, UserDataSyncEnablementService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFTeW5jRW5hYmxlbWVudFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3VzZXJEYXRhU3luYy9icm93c2VyL3VzZXJEYXRhU3luY0VuYWJsZW1lbnRTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBcUIsaUJBQWlCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUMvRyxPQUFPLEVBQUUsOEJBQThCLEVBQWdCLE1BQU0sMERBQTBELENBQUM7QUFDeEgsT0FBTyxFQUFFLDZCQUE2QixJQUFJLGlDQUFpQyxFQUFFLE1BQU0sMkVBQTJFLENBQUM7QUFHL0osTUFBTSxPQUFPLDZCQUE4QixTQUFRLGlDQUFpQztJQUVuRixJQUFjLDJCQUEyQixLQUEwQyxPQUE0QyxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDO0lBRWhKLDJCQUEyQixDQUFDLFFBQXNCO1FBQzFELE9BQU8sUUFBUSwrQ0FBNEIsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLDJCQUEyQixDQUFDLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSwwQkFBMEIsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDO0lBQ3JKLENBQUM7Q0FFRDtBQUVELGlCQUFpQixDQUFDLDhCQUE4QixFQUFFLDZCQUE2QixvQ0FBNEIsQ0FBQyJ9