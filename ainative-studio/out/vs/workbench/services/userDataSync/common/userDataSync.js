/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { ContextKeyExpr, RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { localize, localize2 } from '../../../../nls.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
export const IUserDataSyncWorkbenchService = createDecorator('IUserDataSyncWorkbenchService');
export function getSyncAreaLabel(source) {
    switch (source) {
        case "settings" /* SyncResource.Settings */: return localize('settings', "Settings");
        case "keybindings" /* SyncResource.Keybindings */: return localize('keybindings', "Keyboard Shortcuts");
        case "snippets" /* SyncResource.Snippets */: return localize('snippets', "Snippets");
        case "prompts" /* SyncResource.Prompts */: return localize('prompts', "Prompts");
        case "tasks" /* SyncResource.Tasks */: return localize('tasks', "Tasks");
        case "extensions" /* SyncResource.Extensions */: return localize('extensions', "Extensions");
        case "globalState" /* SyncResource.GlobalState */: return localize('ui state label', "UI State");
        case "profiles" /* SyncResource.Profiles */: return localize('profiles', "Profiles");
        case "workspaceState" /* SyncResource.WorkspaceState */: return localize('workspace state label', "Workspace State");
    }
}
export var AccountStatus;
(function (AccountStatus) {
    AccountStatus["Uninitialized"] = "uninitialized";
    AccountStatus["Unavailable"] = "unavailable";
    AccountStatus["Available"] = "available";
})(AccountStatus || (AccountStatus = {}));
export const SYNC_TITLE = localize2('sync category', "Settings Sync");
export const SYNC_VIEW_ICON = registerIcon('settings-sync-view-icon', Codicon.sync, localize('syncViewIcon', 'View icon of the Settings Sync view.'));
// Contexts
export const CONTEXT_SYNC_STATE = new RawContextKey('syncStatus', "uninitialized" /* SyncStatus.Uninitialized */);
export const CONTEXT_SYNC_ENABLEMENT = new RawContextKey('syncEnabled', false);
export const CONTEXT_ACCOUNT_STATE = new RawContextKey('userDataSyncAccountStatus', "uninitialized" /* AccountStatus.Uninitialized */);
export const CONTEXT_ENABLE_ACTIVITY_VIEWS = new RawContextKey(`enableSyncActivityViews`, false);
export const CONTEXT_ENABLE_SYNC_CONFLICTS_VIEW = new RawContextKey(`enableSyncConflictsView`, false);
export const CONTEXT_HAS_CONFLICTS = new RawContextKey('hasConflicts', false);
// Commands
export const CONFIGURE_SYNC_COMMAND_ID = 'workbench.userDataSync.actions.configure';
export const SHOW_SYNC_LOG_COMMAND_ID = 'workbench.userDataSync.actions.showLog';
// VIEWS
export const SYNC_VIEW_CONTAINER_ID = 'workbench.view.sync';
export const SYNC_CONFLICTS_VIEW_ID = 'workbench.views.sync.conflicts';
export const DOWNLOAD_ACTIVITY_ACTION_DESCRIPTOR = {
    id: 'workbench.userDataSync.actions.downloadSyncActivity',
    title: localize2('download sync activity title', "Download Settings Sync Activity"),
    category: Categories.Developer,
    f1: true,
    precondition: ContextKeyExpr.and(CONTEXT_ACCOUNT_STATE.isEqualTo("available" /* AccountStatus.Available */), CONTEXT_SYNC_STATE.notEqualsTo("uninitialized" /* SyncStatus.Uninitialized */))
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFTeW5jLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy91c2VyRGF0YVN5bmMvY29tbW9uL3VzZXJEYXRhU3luYy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUM7QUFHN0YsT0FBTyxFQUFFLGNBQWMsRUFBRSxhQUFhLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUNyRyxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBRXpELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFFakYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDhEQUE4RCxDQUFDO0FBVTFGLE1BQU0sQ0FBQyxNQUFNLDZCQUE2QixHQUFHLGVBQWUsQ0FBZ0MsK0JBQStCLENBQUMsQ0FBQztBQStCN0gsTUFBTSxVQUFVLGdCQUFnQixDQUFDLE1BQW9CO0lBQ3BELFFBQVEsTUFBTSxFQUFFLENBQUM7UUFDaEIsMkNBQTBCLENBQUMsQ0FBQyxPQUFPLFFBQVEsQ0FBQyxVQUFVLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDcEUsaURBQTZCLENBQUMsQ0FBQyxPQUFPLFFBQVEsQ0FBQyxhQUFhLEVBQUUsb0JBQW9CLENBQUMsQ0FBQztRQUNwRiwyQ0FBMEIsQ0FBQyxDQUFDLE9BQU8sUUFBUSxDQUFDLFVBQVUsRUFBRSxVQUFVLENBQUMsQ0FBQztRQUNwRSx5Q0FBeUIsQ0FBQyxDQUFDLE9BQU8sUUFBUSxDQUFDLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUNqRSxxQ0FBdUIsQ0FBQyxD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