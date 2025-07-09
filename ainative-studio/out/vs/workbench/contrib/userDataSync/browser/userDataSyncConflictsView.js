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
import { TreeItemCollapsibleState, IViewDescriptorService } from '../../../common/views.js';
import { localize } from '../../../../nls.js';
import { TreeViewPane } from '../../../browser/parts/views/treeView.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IUserDataSyncService, IUserDataSyncEnablementService } from '../../../../platform/userDataSync/common/userDataSync.js';
import { registerAction2, Action2, MenuId } from '../../../../platform/actions/common/actions.js';
import { ContextKeyExpr, IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { URI } from '../../../../base/common/uri.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { getSyncAreaLabel, IUserDataSyncWorkbenchService, SYNC_CONFLICTS_VIEW_ID } from '../../../services/userDataSync/common/userDataSync.js';
import { basename, isEqual } from '../../../../base/common/resources.js';
import * as DOM from '../../../../base/browser/dom.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { IUserDataProfilesService, reviveProfile } from '../../../../platform/userDataProfile/common/userDataProfile.js';
import { DEFAULT_EDITOR_ASSOCIATION } from '../../../common/editor.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IAccessibleViewInformationService } from '../../../services/accessibility/common/accessibleViewInformationService.js';
let UserDataSyncConflictsViewPane = class UserDataSyncConflictsViewPane extends TreeViewPane {
    constructor(options, editorService, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, notificationService, hoverService, userDataSyncService, userDataSyncWorkbenchService, userDataSyncEnablementService, userDataProfilesService, accessibleViewVisibilityService) {
        super(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, notificationService, hoverService, accessibleViewVisibilityService);
        this.editorService = editorService;
        this.userDataSyncService = userDataSyncService;
        this.userDataSyncWorkbenchService = userDataSyncWorkbenchService;
        this.userDataSyncEnablementService = userDataSyncEnablementService;
        this.userDataProfilesService = userDataProfilesService;
        this._register(this.userDataSyncService.onDidChangeConflicts(() => this.treeView.refresh()));
        this.registerActions();
    }
    renderTreeView(container) {
        super.renderTreeView(DOM.append(container, DOM.$('')));
        const that = this;
        this.treeView.message = localize('explanation', "Please go through each entry and merge to resolve conflicts.");
        this.treeView.dataProvider = { getChildren() { return that.getTreeItems(); } };
    }
    async getTreeItems() {
        const roots = [];
        const conflictResources = this.userDataSyncService.conflicts
            .map(conflict => conflict.conflicts.map(resourcePreview => ({ ...resourcePreview, syncResource: conflict.syncResource, profile: conflict.profile })))
            .flat()
            .sort((a, b) => a.profile.id === b.profile.id ? 0 : a.profile.isDefault ? -1 : b.profile.isDefault ? 1 : a.profile.name.localeCompare(b.profile.name));
        const conflictResourcesByProfile = [];
        for (const previewResource of conflictResources) {
            let result = conflictResourcesByProfile[conflictResourcesByProfile.length - 1]?.[0].id === previewResource.profile.id ? conflictResourcesByProfile[conflictResourcesByProfile.length - 1][1] : undefined;
            if (!result) {
                conflictResourcesByProfile.push([previewResource.profile, result = []]);
            }
            result.push(previewResource);
        }
        for (const [profile, resources] of conflictResourcesByProfile) {
            const children = [];
            for (const resource of resources) {
                const handle = JSON.stringify(resource);
                const treeItem = {
                    handle,
                    resourceUri: resource.remoteResource,
                    label: { label: basename(resource.remoteResource), strikethrough: resource.mergeState === "accepted" /* MergeState.Accepted */ && (resource.localChange === 3 /* Change.Deleted */ || resource.remoteChange === 3 /* Change.Deleted */) },
                    description: getSyncAreaLabel(resource.syncResource),
                    collapsibleState: TreeItemCollapsibleState.None,
                    command: { id: `workbench.actions.sync.openConflicts`, title: '', arguments: [{ $treeViewId: '', $treeItemHandle: handle }] },
                    contextValue: `sync-conflict-resource`
                };
                children.push(treeItem);
            }
            roots.push({
                handle: profile.id,
                label: { label: profile.name },
                collapsibleState: TreeItemCollapsibleState.Expanded,
                children
            });
        }
        return conflictResourcesByProfile.length === 1 && conflictResourcesByProfile[0][0].isDefault ? roots[0].children ?? [] : roots;
    }
    parseHandle(handle) {
        const parsed = JSON.parse(handle);
        return {
            syncResource: parsed.syncResource,
            profile: reviveProfile(parsed.profile, this.userDataProfilesService.profilesHome.scheme),
            localResource: URI.revive(parsed.localResource),
            remoteResource: URI.revive(parsed.remoteResource),
            baseResource: URI.revive(parsed.baseResource),
            previewResource: URI.revive(parsed.previewResource),
            acceptedResource: URI.revive(parsed.acceptedResource),
            localChange: parsed.localChange,
            remoteChange: parsed.remoteChange,
            mergeState: parsed.mergeState,
        };
    }
    registerActions() {
        const that = this;
        this._register(registerAction2(class OpenConflictsAction extends Action2 {
            constructor() {
                super({
                    id: `workbench.actions.sync.openConflicts`,
                    title: localize({ key: 'workbench.actions.sync.openConflicts', comment: ['This is an action title to show the conflicts between local and remote version of resources'] }, "Show Conflicts"),
                });
            }
            async run(accessor, handle) {
                const conflict = that.parseHandle(handle.$treeItemHandle);
                return that.open(conflict);
            }
        }));
        this._register(registerAction2(class AcceptRemoteAction extends Action2 {
            constructor() {
                super({
                    id: `workbench.actions.sync.acceptRemote`,
                    title: localize('workbench.actions.sync.acceptRemote', "Accept Remote"),
                    icon: Codicon.cloudDownload,
                    menu: {
                        id: MenuId.ViewItemContext,
                        when: ContextKeyExpr.and(ContextKeyExpr.equals('view', SYNC_CONFLICTS_VIEW_ID), ContextKeyExpr.equals('viewItem', 'sync-conflict-resource')),
                        group: 'inline',
                        order: 1,
                    },
                });
            }
            async run(accessor, handle) {
                const conflict = that.parseHandle(handle.$treeItemHandle);
                await that.userDataSyncWorkbenchService.accept({ syncResource: conflict.syncResource, profile: conflict.profile }, conflict.remoteResource, undefined, that.userDataSyncEnablementService.isEnabled());
            }
        }));
        this._register(registerAction2(class AcceptLocalAction extends Action2 {
            constructor() {
                super({
                    id: `workbench.actions.sync.acceptLocal`,
                    title: localize('workbench.actions.sync.acceptLocal', "Accept Local"),
                    icon: Codicon.cloudUpload,
                    menu: {
                        id: MenuId.ViewItemContext,
                        when: ContextKeyExpr.and(ContextKeyExpr.equals('view', SYNC_CONFLICTS_VIEW_ID), ContextKeyExpr.equals('viewItem', 'sync-conflict-resource')),
                        group: 'inline',
                        order: 2,
                    },
                });
            }
            async run(accessor, handle) {
                const conflict = that.parseHandle(handle.$treeItemHandle);
                await that.userDataSyncWorkbenchService.accept({ syncResource: conflict.syncResource, profile: conflict.profile }, conflict.localResource, undefined, that.userDataSyncEnablementService.isEnabled());
            }
        }));
    }
    async open(conflictToOpen) {
        if (!this.userDataSyncService.conflicts.some(({ conflicts }) => conflicts.some(({ localResource }) => isEqual(localResource, conflictToOpen.localResource)))) {
            return;
        }
        const remoteResourceName = localize({ key: 'remoteResourceName', comment: ['remote as in file in cloud'] }, "{0} (Remote)", basename(conflictToOpen.remoteResource));
        const localResourceName = localize('localResourceName', "{0} (Local)", basename(conflictToOpen.remoteResource));
        await this.editorService.openEditor({
            input1: { resource: conflictToOpen.remoteResource, label: localize('Theirs', 'Theirs'), description: remoteResourceName },
            input2: { resource: conflictToOpen.localResource, label: localize('Yours', 'Yours'), description: localResourceName },
            base: { resource: conflictToOpen.baseResource },
            result: { resource: conflictToOpen.previewResource },
            options: {
                preserveFocus: true,
                revealIfVisible: true,
                pinned: true,
                override: DEFAULT_EDITOR_ASSOCIATION.id
            }
        });
        return;
    }
};
UserDataSyncConflictsViewPane = __decorate([
    __param(1, IEditorService),
    __param(2, IKeybindingService),
    __param(3, IContextMenuService),
    __param(4, IConfigurationService),
    __param(5, IContextKeyService),
    __param(6, IViewDescriptorService),
    __param(7, IInstantiationService),
    __param(8, IOpenerService),
    __param(9, IThemeService),
    __param(10, INotificationService),
    __param(11, IHoverService),
    __param(12, IUserDataSyncService),
    __param(13, IUserDataSyncWorkbenchService),
    __param(14, IUserDataSyncEnablementService),
    __param(15, IUserDataProfilesService),
    __param(16, IAccessibleViewInformationService)
], UserDataSyncConflictsViewPane);
export { UserDataSyncConflictsViewPane };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFTeW5jQ29uZmxpY3RzVmlldy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi91c2VyRGF0YVN5bmMvYnJvd3Nlci91c2VyRGF0YVN5bmNDb25mbGljdHNWaWV3LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBYSx3QkFBd0IsRUFBeUIsc0JBQXNCLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUM5SCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxxQkFBcUIsRUFBb0IsTUFBTSw0REFBNEQsQ0FBQztBQUNySCxPQUFPLEVBQUUsb0JBQW9CLEVBQStELDhCQUE4QixFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDN0wsT0FBTyxFQUFFLGVBQWUsRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDbEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQzFHLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDbEYsT0FBTyxFQUFFLGdCQUFnQixFQUE4Qiw2QkFBNkIsRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQzVLLE9BQU8sRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDekUsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQztBQUV2RCxPQUFPLEVBQUUsa0JBQWtCLEVB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