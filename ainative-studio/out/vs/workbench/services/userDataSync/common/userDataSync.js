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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFTeW5jLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3VzZXJEYXRhU3luYy9jb21tb24vdXNlckRhdGFTeW5jLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUc3RixPQUFPLEVBQUUsY0FBYyxFQUFFLGFBQWEsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3JHLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFFekQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUVqRixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sOERBQThELENBQUM7QUFVMUYsTUFBTSxDQUFDLE1BQU0sNkJBQTZCLEdBQUcsZUFBZSxDQUFnQywrQkFBK0IsQ0FBQyxDQUFDO0FBK0I3SCxNQUFNLFVBQVUsZ0JBQWdCLENBQUMsTUFBb0I7SUFDcEQsUUFBUSxNQUFNLEVBQUUsQ0FBQztRQUNoQiwyQ0FBMEIsQ0FBQyxDQUFDLE9BQU8sUUFBUSxDQUFDLFVBQVUsRUFBRSxVQUFVLENBQUMsQ0FBQztRQUNwRSxpREFBNkIsQ0FBQyxDQUFDLE9BQU8sUUFBUSxDQUFDLGFBQWEsRUFBRSxvQkFBb0IsQ0FBQyxDQUFDO1FBQ3BGLDJDQUEwQixDQUFDLENBQUMsT0FBTyxRQUFRLENBQUMsVUFBVSxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBQ3BFLHlDQUF5QixDQUFDLENBQUMsT0FBTyxRQUFRLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ2pFLHFDQUF1QixDQUFDLENB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