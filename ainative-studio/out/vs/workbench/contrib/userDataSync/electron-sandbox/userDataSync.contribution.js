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
import { registerWorkbenchContribution2 } from '../../../common/contributions.js';
import { IUserDataSyncUtilService } from '../../../../platform/userDataSync/common/userDataSync.js';
import { ISharedProcessService } from '../../../../platform/ipc/electron-sandbox/services.js';
import { registerAction2, Action2, MenuId } from '../../../../platform/actions/common/actions.js';
import { localize, localize2 } from '../../../../nls.js';
import { IEnvironmentService } from '../../../../platform/environment/common/environment.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { INativeHostService } from '../../../../platform/native/common/native.js';
import { INotificationService, Severity } from '../../../../platform/notification/common/notification.js';
import { CONTEXT_SYNC_STATE, DOWNLOAD_ACTIVITY_ACTION_DESCRIPTOR, IUserDataSyncWorkbenchService, SYNC_TITLE } from '../../../services/userDataSync/common/userDataSync.js';
import { Schemas } from '../../../../base/common/network.js';
import { ProxyChannel } from '../../../../base/parts/ipc/common/ipc.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
let UserDataSyncServicesContribution = class UserDataSyncServicesContribution extends Disposable {
    static { this.ID = 'workbench.contrib.userDataSyncServices'; }
    constructor(userDataSyncUtilService, sharedProcessService) {
        super();
        sharedProcessService.registerChannel('userDataSyncUtil', ProxyChannel.fromService(userDataSyncUtilService, this._store));
    }
};
UserDataSyncServicesContribution = __decorate([
    __param(0, IUserDataSyncUtilService),
    __param(1, ISharedProcessService)
], UserDataSyncServicesContribution);
registerWorkbenchContribution2(UserDataSyncServicesContribution.ID, UserDataSyncServicesContribution, 1 /* WorkbenchPhase.BlockStartup */);
registerAction2(class OpenSyncBackupsFolder extends Action2 {
    constructor() {
        super({
            id: 'workbench.userData.actions.openSyncBackupsFolder',
            title: localize2('Open Backup folder', "Open Local Backups Folder"),
            category: SYNC_TITLE,
            menu: {
                id: MenuId.CommandPalette,
                when: CONTEXT_SYNC_STATE.notEqualsTo("uninitialized" /* SyncStatus.Uninitialized */),
            }
        });
    }
    async run(accessor) {
        const syncHome = accessor.get(IEnvironmentService).userDataSyncHome;
        const nativeHostService = accessor.get(INativeHostService);
        const fileService = accessor.get(IFileService);
        const notificationService = accessor.get(INotificationService);
        if (await fileService.exists(syncHome)) {
            const folderStat = await fileService.resolve(syncHome);
            const item = folderStat.children && folderStat.children[0] ? folderStat.children[0].resource : syncHome;
            return nativeHostService.showItemInFolder(item.with({ scheme: Schemas.file }).fsPath);
        }
        else {
            notificationService.info(localize('no backups', "Local backups folder does not exist"));
        }
    }
});
registerAction2(class DownloadSyncActivityAction extends Action2 {
    constructor() {
        super(DOWNLOAD_ACTIVITY_ACTION_DESCRIPTOR);
    }
    async run(accessor) {
        const userDataSyncWorkbenchService = accessor.get(IUserDataSyncWorkbenchService);
        const notificationService = accessor.get(INotificationService);
        const hostService = accessor.get(INativeHostService);
        const folder = await userDataSyncWorkbenchService.downloadSyncActivity();
        if (folder) {
            notificationService.prompt(Severity.Info, localize('download sync activity complete', "Successfully downloaded Settings Sync activity."), [{
                    label: localize('open', "Open Folder"),
                    run: () => hostService.showItemInFolder(folder.fsPath)
                }]);
        }
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFTeW5jLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi91c2VyRGF0YVN5bmMvZWxlY3Ryb24tc2FuZGJveC91c2VyRGF0YVN5bmMuY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBMEMsOEJBQThCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUMxSCxPQUFPLEVBQUUsd0JBQXdCLEVBQWMsTUFBTSwwREFBMEQsQ0FBQztBQUNoSCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUM5RixPQUFPLEVBQUUsZUFBZSxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNsRyxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBRXpELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUNsRixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsUUFBUSxFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDMUcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLG1DQUFtQyxFQUFFLDZCQUE2QixFQUFFLFVBQVUsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQzNLLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM3RCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDeEUsT0FBTyxFQUFFLFVBQVUsRUFB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