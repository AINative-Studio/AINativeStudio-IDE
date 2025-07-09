/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Promises } from '../../../base/common/async.js';
import { DisposableStore } from '../../../base/common/lifecycle.js';
import { Schemas } from '../../../base/common/network.js';
import { joinPath } from '../../../base/common/resources.js';
import { Storage } from '../../../base/parts/storage/common/storage.js';
import { AbstractStorageService, isProfileUsingDefaultStorage, WillSaveStateReason } from './storage.js';
import { ApplicationStorageDatabaseClient, ProfileStorageDatabaseClient, WorkspaceStorageDatabaseClient } from './storageIpc.js';
import { isUserDataProfile } from '../../userDataProfile/common/userDataProfile.js';
export class RemoteStorageService extends AbstractStorageService {
    constructor(initialWorkspace, initialProfiles, remoteService, environmentService) {
        super();
        this.remoteService = remoteService;
        this.environmentService = environmentService;
        this.profileStorageDisposables = this._register(new DisposableStore());
        this.workspaceStorageDisposables = this._register(new DisposableStore());
        this.applicationStorageProfile = initialProfiles.defaultProfile;
        this.applicationStorage = this.createApplicationStorage();
        this.profileStorageProfile = initialProfiles.currentProfile;
        this.profileStorage = this.createProfileStorage(this.profileStorageProfile);
        this.workspaceStorageId = initialWorkspace?.id;
        this.workspaceStorage = this.createWorkspaceStorage(initialWorkspace);
    }
    createApplicationStorage() {
        const storageDataBaseClient = this._register(new ApplicationStorageDatabaseClient(this.remoteService.getChannel('storage')));
        const applicationStorage = this._register(new Storage(storageDataBaseClient));
        this._register(applicationStorage.onDidChangeStorage(e => this.emitDidChangeValue(-1 /* StorageScope.APPLICATION */, e)));
        return applicationStorage;
    }
    createProfileStorage(profile) {
        // First clear any previously associated disposables
        this.profileStorageDisposables.clear();
        // Remember profile associated to profile storage
        this.profileStorageProfile = profile;
        let profileStorage;
        if (isProfileUsingDefaultStorage(profile)) {
            // If we are using default profile storage, the profile storage is
            // actually the same as application storage. As such we
            // avoid creating the storage library a second time on
            // the same DB.
            profileStorage = this.applicationStorage;
        }
        else {
            const storageDataBaseClient = this.profileStorageDisposables.add(new ProfileStorageDatabaseClient(this.remoteService.getChannel('storage'), profile));
            profileStorage = this.profileStorageDisposables.add(new Storage(storageDataBaseClient));
        }
        this.profileStorageDisposables.add(profileStorage.onDidChangeStorage(e => this.emitDidChangeValue(0 /* StorageScope.PROFILE */, e)));
        return profileStorage;
    }
    createWorkspaceStorage(workspace) {
        // First clear any previously associated disposables
        this.workspaceStorageDisposables.clear();
        // Remember workspace ID for logging later
        this.workspaceStorageId = workspace?.id;
        let workspaceStorage = undefined;
        if (workspace) {
            const storageDataBaseClient = this.workspaceStorageDisposables.add(new WorkspaceStorageDatabaseClient(this.remoteService.getChannel('storage'), workspace));
            workspaceStorage = this.workspaceStorageDisposables.add(new Storage(storageDataBaseClient));
            this.workspaceStorageDisposables.add(workspaceStorage.onDidChangeStorage(e => this.emitDidChangeValue(1 /* StorageScope.WORKSPACE */, e)));
        }
        return workspaceStorage;
    }
    async doInitialize() {
        // Init all storage locations
        await Promises.settled([
            this.applicationStorage.init(),
            this.profileStorage.init(),
            this.workspaceStorage?.init() ?? Promise.resolve()
        ]);
    }
    getStorage(scope) {
        switch (scope) {
            case -1 /* StorageScope.APPLICATION */:
                return this.applicationStorage;
            case 0 /* StorageScope.PROFILE */:
                return this.profileStorage;
            default:
                return this.workspaceStorage;
        }
    }
    getLogDetails(scope) {
        switch (scope) {
            case -1 /* StorageScope.APPLICATION */:
                return this.applicationStorageProfile.globalStorageHome.with({ scheme: Schemas.file }).fsPath;
            case 0 /* StorageScope.PROFILE */:
                return this.profileStorageProfile?.globalStorageHome.with({ scheme: Schemas.file }).fsPath;
            default:
                return this.workspaceStorageId ? `${joinPath(this.environmentService.workspaceStorageHome, this.workspaceStorageId, 'state.vscdb').with({ scheme: Schemas.file }).fsPath}` : undefined;
        }
    }
    async close() {
        // Stop periodic scheduler and idle runner as we now collect state normally
        this.stopFlushWhenIdle();
        // Signal as event so that clients can still store data
        this.emitWillSaveState(WillSaveStateReason.SHUTDOWN);
        // Do it
        await Promises.settled([
            this.applicationStorage.close(),
            this.profileStorage.close(),
            this.workspaceStorage?.close() ?? Promise.resolve()
        ]);
    }
    async switchToProfile(toProfile) {
        if (!this.canSwitchProfile(this.profileStorageProfile, toProfile)) {
            return;
        }
        const oldProfileStorage = this.profileStorage;
        const oldItems = oldProfileStorage.items;
        // Close old profile storage but only if this is
        // different from application storage!
        if (oldProfileStorage !== this.applicationStorage) {
            await oldProfileStorage.close();
        }
        // Create new profile storage & init
        this.profileStorage = this.createProfileStorage(toProfile);
        await this.profileStorage.init();
        // Handle data switch and eventing
        this.switchData(oldItems, this.profileStorage, 0 /* StorageScope.PROFILE */);
    }
    async switchToWorkspace(toWorkspace, preserveData) {
        const oldWorkspaceStorage = this.workspaceStorage;
        const oldItems = oldWorkspaceStorage?.items ?? new Map();
        // Close old workspace storage
        await oldWorkspaceStorage?.close();
        // Create new workspace storage & init
        this.workspaceStorage = this.createWorkspaceStorage(toWorkspace);
        await this.workspaceStorage.init();
        // Handle data switch and eventing
        this.switchData(oldItems, this.workspaceStorage, 1 /* StorageScope.WORKSPACE */);
    }
    hasScope(scope) {
        if (isUserDataProfile(scope)) {
            return this.profileStorageProfile.id === scope.id;
        }
        return this.workspaceStorageId === scope.id;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RvcmFnZVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vc3RvcmFnZS9jb21tb24vc3RvcmFnZVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3pELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNwRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDMUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzdELE9BQU8sRUFBWSxPQUFPLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUdsRixPQUFPLEVBQUUsc0JBQXNCLEVBQUUsNEJBQTRCLEVBQWdCLG1CQUFtQixFQUFFLE1BQU0sY0FBYyxDQUFDO0FBQ3ZILE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSw0QkFBNEIsRUFBRSw4QkFBOEIsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQ2pJLE9BQU8sRUFBRSxpQkFBaUIsRUFBb0IsTUFBTSxpREFBaUQsQ0FBQztBQUd0RyxNQUFNLE9BQU8sb0JBQXFCLFNBQVEsc0JBQXNCO0lBYS9ELFlBQ0MsZ0JBQXFELEVBQ3JELGVBQXVGLEVBQ3RFLGFBQTZCLEVBQzdCLGtCQUF1QztRQUV4RCxLQUFLLEVBQUUsQ0FBQztRQUhTLGtCQUFhLEdBQWIsYUFBYSxDQUFnQjtRQUM3Qix1QkFBa0IsR0FBbEIsa0JBQWtCLENBQXFCO1FBWHhDLDhCQUF5QixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxlQUFlLEVBQUUsQ0FBQyxDQUFDO1FBSWxFLGdDQUEyQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxlQUFlLEVBQUUsQ0FBQyxDQUFDO1FBV3BGLElBQUksQ0FBQyx5QkFBeUIsR0FBRyxlQUFlLENBQUMsY0FBYyxDQUFDO1FBQ2hFLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxJQUFJLENBQUMsd0JBQXdCLEVBQUUsQ0FBQztRQUUxRCxJQUFJLENBQUMscUJBQXFCLEdBQUcsZUFBZSxDQUFDLGNBQWMsQ0FBQztRQUM1RCxJQUFJLENBQUMsY0FBYyxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMsQ0FBQztRQUU1RSxJQUFJLENBQUMsa0JBQWtCLEdBQUcsZ0JBQWdCLEVBQUUsRUFBRSxDQUFDO1FBQy9DLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsc0JBQXNCLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztJQUN2RSxDQUFDO0lBRU8sd0JBQXdCO1FBQy9CLE1BQU0scUJBQXFCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLGdDQUFnQyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM3SCxNQUFNLGtCQUFrQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLENBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUFDO1FBRTlFLElBQUksQ0FBQyxTQUFTLENBQUMsa0JBQWtCLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLG9DQUEyQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFakgsT0FBTyxrQkFBa0IsQ0FBQztJQUMzQixDQUFDO0lBRU8sb0JBQW9CLENBQUMsT0FBeUI7UUFFckQsb0RBQW9EO1FBQ3BELElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUV2QyxpREFBaUQ7UUFDakQsSUFBSSxDQUFDLHFCQUFxQixHQUFHLE9BQU8sQ0FBQztRQUVyQyxJQUFJLGNBQXdCLENBQUM7UUFDN0IsSUFBSSw0QkFBNEIsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBRTNDLGtFQUFrRTtZQUNsRSx1REFBdUQ7WUFDdkQsc0RBQXNEO1lBQ3RELGVBQWU7WUFFZixjQUFjLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDO1FBQzFDLENBQUM7YUFBTSxDQUFDO1lBQ1AsTUFBTSxxQkFBcUIsR0FBRyxJQUFJLENBQUMseUJBQXlCLENBQUMsR0FBRyxDQUFDLElBQUksNEJBQTRCLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQztZQUN0SixjQUFjLEdBQUcsSUFBSSxDQUFDLHlCQUF5QixDQUFDLEdBQUcsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUM7UUFDekYsQ0FBQztRQUVELElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLGtCQUFrQiwrQkFBdUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRTdILE9BQU8sY0FBYyxDQUFDO0lBQ3ZCLENBQUM7SUFJTyxzQkFBc0IsQ0FBQyxTQUE4QztRQUU1RSxvREFBb0Q7UUFDcEQsSUFBSSxDQUFDLDJCQUEyQixDQUFDLEtBQUssRUFBRSxDQUFDO1FBRXpDLDBDQUEwQztRQUMxQyxJQUFJLENBQUMsa0JBQWtCLEdBQUcsU0FBUyxFQUFFLEVBQUUsQ0FBQztRQUV4QyxJQUFJLGdCQUFnQixHQUF5QixTQUFTLENBQUM7UUFDdkQsSUFBSSxTQUFTLEVBQUUsQ0FBQztZQUNmLE1BQU0scUJBQXFCLEdBQUcsSUFBSSxDQUFDLDJCQUEyQixDQUFDLEdBQUcsQ0FBQyxJQUFJLDhCQUE4QixDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUM7WUFDNUosZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLDJCQUEyQixDQUFDLEdBQUcsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUM7WUFFNUYsSUFBSSxDQUFDLDJCQUEyQixDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsaUNBQXlCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNwSSxDQUFDO1FBRUQsT0FBTyxnQkFBZ0IsQ0FBQztJQUN6QixDQUFDO0lBRVMsS0FBSyxDQUFDLFlBQVk7UUFFM0IsNkJBQTZCO1FBQzdCLE1BQU0sUUFBUSxDQUFDLE9BQU8sQ0FBQztZQUN0QixJQUFJLENBQUMsa0JBQWtCLENBQUMsSUFBSSxFQUFFO1lBQzlCLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFO1lBQzFCLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxJQUFJLEVBQUUsSUFBSSxPQUFPLENBQUMsT0FBTyxFQUFFO1NBQ2xELENBQUMsQ0FBQztJQUNKLENBQUM7SUFFUyxVQUFVLENBQUMsS0FBbUI7UUFDdkMsUUFBUSxLQUFLLEVBQUUsQ0FBQztZQUNmO2dCQUNDLE9BQU8sSUFBSSxDQUFDLGtCQUFrQixDQUFDO1lBQ2hDO2dCQUNDLE9BQU8sSUFBSSxDQUFDLGNBQWMsQ0FBQztZQUM1QjtnQkFDQyxPQUFPLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQztRQUMvQixDQUFDO0lBQ0YsQ0FBQztJQUVTLGFBQWEsQ0FBQyxLQUFtQjtRQUMxQyxRQUFRLEtBQUssRUFBRSxDQUFDO1lBQ2Y7Z0JBQ0MsT0FBTyxJQUFJLENBQUMseUJBQXlCLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQztZQUMvRjtnQkFDQyxPQUFPLElBQUksQ0FBQyxxQkFBcUIsRUFBRSxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsRUFBRSxNQUFNLEVBQUUsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDO1lBQzVGO2dCQUNDLE9BQU8sSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsb0JBQW9CLEVBQUUsSUFBSSxDQUFDLGtCQUFrQixFQUFFLGFBQWEsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sRUFBRSxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDO1FBQ3pMLENBQUM7SUFDRixDQUFDO0lBRUQsS0FBSyxDQUFDLEtBQUs7UUFFViwyRUFBMkU7UUFDM0UsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7UUFFekIsdURBQXVEO1FBQ3ZELElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxtQkFBbUIsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUVyRCxRQUFRO1FBQ1IsTUFBTSxRQUFRLENBQUMsT0FBTyxDQUFDO1lBQ3RCLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLEVBQUU7WUFDL0IsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLEVBQUU7WUFDM0IsSUFBSSxDQUFDLGdCQUFnQixFQUFFLEtBQUssRUFBRSxJQUFJLE9BQU8sQ0FBQyxPQUFPLEVBQUU7U0FDbkQsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVTLEtBQUssQ0FBQyxlQUFlLENBQUMsU0FBMkI7UUFDMUQsSUFBSSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMscUJBQXFCLEVBQUUsU0FBUyxDQUFDLEVBQUUsQ0FBQztZQUNuRSxPQUFPO1FBQ1IsQ0FBQztRQUVELE1BQU0saUJBQWlCLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQztRQUM5QyxNQUFNLFFBQVEsR0FBRyxpQkFBaUIsQ0FBQyxLQUFLLENBQUM7UUFFekMsZ0RBQWdEO1FBQ2hELHNDQUFzQztRQUN0QyxJQUFJLGlCQUFpQixLQUFLLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO1lBQ25ELE1BQU0saUJBQWlCLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDakMsQ0FBQztRQUVELG9DQUFvQztRQUNwQyxJQUFJLENBQUMsY0FBYyxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUMzRCxNQUFNLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLENBQUM7UUFFakMsa0NBQWtDO1FBQ2xDLElBQUksQ0FBQyxVQUFVLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxjQUFjLCtCQUF1QixDQUFDO0lBQ3RFLENBQUM7SUFFUyxLQUFLLENBQUMsaUJBQWlCLENBQUMsV0FBb0MsRUFBRSxZQUFxQjtRQUM1RixNQUFNLG1CQUFtQixHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQztRQUNsRCxNQUFNLFFBQVEsR0FBRyxtQkFBbUIsRUFBRSxLQUFLLElBQUksSUFBSSxHQUFHLEVBQUUsQ0FBQztRQUV6RCw4QkFBOEI7UUFDOUIsTUFBTSxtQkFBbUIsRUFBRSxLQUFLLEVBQUUsQ0FBQztRQUVuQyxzQ0FBc0M7UUFDdEMsSUFBSSxDQUFDLGdCQUFnQixHQUFHLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUNqRSxNQUFNLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUVuQyxrQ0FBa0M7UUFDbEMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLGdCQUFnQixpQ0FBeUIsQ0FBQztJQUMxRSxDQUFDO0lBRUQsUUFBUSxDQUFDLEtBQWlEO1FBQ3pELElBQUksaUJBQWlCLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUM5QixPQUFPLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxFQUFFLEtBQUssS0FBSyxDQUFDLEVBQUUsQ0FBQztRQUNuRCxDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUMsa0JBQWtCLEtBQUssS0FBSyxDQUFDLEVBQUUsQ0FBQztJQUM3QyxDQUFDO0NBQ0QifQ==