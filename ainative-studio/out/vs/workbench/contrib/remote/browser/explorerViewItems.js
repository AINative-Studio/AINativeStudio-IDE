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
import * as nls from '../../../../nls.js';
import { IRemoteExplorerService, REMOTE_EXPLORER_TYPE_KEY } from '../../../services/remote/common/remoteExplorerService.js';
import { isStringArray } from '../../../../base/common/types.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ContextKeyExpr, IContextKeyService, RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { Action2, MenuId, MenuRegistry, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { VIEWLET_ID } from './remoteExplorer.js';
import { getVirtualWorkspaceLocation } from '../../../../platform/workspace/common/virtualWorkspace.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { Disposable, DisposableMap } from '../../../../base/common/lifecycle.js';
export const SELECTED_REMOTE_IN_EXPLORER = new RawContextKey('selectedRemoteInExplorer', '');
let SwitchRemoteViewItem = class SwitchRemoteViewItem extends Disposable {
    constructor(contextKeyService, remoteExplorerService, environmentService, storageService, workspaceContextService) {
        super();
        this.contextKeyService = contextKeyService;
        this.remoteExplorerService = remoteExplorerService;
        this.environmentService = environmentService;
        this.storageService = storageService;
        this.workspaceContextService = workspaceContextService;
        this.completedRemotes = this._register(new DisposableMap());
        this.selectedRemoteContext = SELECTED_REMOTE_IN_EXPLORER.bindTo(contextKeyService);
        this.switchRemoteMenu = MenuId.for('workbench.remote.menu.switchRemoteMenu');
        this._register(MenuRegistry.appendMenuItem(MenuId.ViewContainerTitle, {
            submenu: this.switchRemoteMenu,
            title: nls.localize('switchRemote.label', "Switch Remote"),
            group: 'navigation',
            when: ContextKeyExpr.equals('viewContainer', VIEWLET_ID),
            order: 1,
            isSelection: true
        }));
        this._register(remoteExplorerService.onDidChangeTargetType(e => {
            this.select(e);
        }));
    }
    setSelectionForConnection() {
        let isSetForConnection = false;
        if (this.completedRemotes.size > 0) {
            let authority;
            const remoteAuthority = this.environmentService.remoteAuthority;
            let virtualWorkspace;
            if (!remoteAuthority) {
                virtualWorkspace = getVirtualWorkspaceLocation(this.workspaceContextService.getWorkspace())?.scheme;
            }
            isSetForConnection = true;
            const explorerType = remoteAuthority ? [remoteAuthority.split('+')[0]]
                : (virtualWorkspace ? [virtualWorkspace]
                    : (this.storageService.get(REMOTE_EXPLORER_TYPE_KEY, 1 /* StorageScope.WORKSPACE */)?.split(',') ?? this.storageService.get(REMOTE_EXPLORER_TYPE_KEY, 0 /* StorageScope.PROFILE */)?.split(',')));
            if (explorerType !== undefined) {
                authority = this.getAuthorityForExplorerType(explorerType);
            }
            if (authority) {
                this.select(authority);
            }
        }
        return isSetForConnection;
    }
    select(authority) {
        this.selectedRemoteContext.set(authority[0]);
        this.remoteExplorerService.targetType = authority;
    }
    getAuthorityForExplorerType(explorerType) {
        let authority;
        for (const option of this.completedRemotes) {
            for (const authorityOption of option[1].authority) {
                for (const explorerOption of explorerType) {
                    if (authorityOption === explorerOption) {
                        authority = option[1].authority;
                        break;
                    }
                    else if (option[1].virtualWorkspace === explorerOption) {
                        authority = option[1].authority;
                        break;
                    }
                }
            }
        }
        return authority;
    }
    removeOptionItems(views) {
        for (const view of views) {
            if (view.group && view.group.startsWith('targets') && view.remoteAuthority && (!view.when || this.contextKeyService.contextMatchesRules(view.when))) {
                const authority = isStringArray(view.remoteAuthority) ? view.remoteAuthority : [view.remoteAuthority];
                this.completedRemotes.deleteAndDispose(authority[0]);
            }
        }
    }
    createOptionItems(views) {
        const startingCount = this.completedRemotes.size;
        for (const view of views) {
            if (view.group && view.group.startsWith('targets') && view.remoteAuthority && (!view.when || this.contextKeyService.contextMatchesRules(view.when))) {
                const text = view.name;
                const authority = isStringArray(view.remoteAuthority) ? view.remoteAuthority : [view.remoteAuthority];
                if (this.completedRemotes.has(authority[0])) {
                    continue;
                }
                const thisCapture = this;
                const action = registerAction2(class extends Action2 {
                    constructor() {
                        super({
                            id: `workbench.action.remoteExplorer.show.${authority[0]}`,
                            title: text,
                            toggled: SELECTED_REMOTE_IN_EXPLORER.isEqualTo(authority[0]),
                            menu: {
                                id: thisCapture.switchRemoteMenu
                            }
                        });
                    }
                    async run() {
                        thisCapture.select(authority);
                    }
                });
                this.completedRemotes.set(authority[0], { text: text.value, authority, virtualWorkspace: view.virtualWorkspace, dispose: () => action.dispose() });
            }
        }
        if (this.completedRemotes.size > startingCount) {
            this.setSelectionForConnection();
        }
    }
};
SwitchRemoteViewItem = __decorate([
    __param(0, IContextKeyService),
    __param(1, IRemoteExplorerService),
    __param(2, IWorkbenchEnvironmentService),
    __param(3, IStorageService),
    __param(4, IWorkspaceContextService)
], SwitchRemoteViewItem);
export { SwitchRemoteViewItem };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhwbG9yZXJWaWV3SXRlbXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvcmVtb3RlL2Jyb3dzZXIvZXhwbG9yZXJWaWV3SXRlbXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQztBQUMxQyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUc1SCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDakUsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDMUcsT0FBTyxFQUFFLGVBQWUsRUFBZ0IsTUFBTSxnREFBZ0QsQ0FBQztBQUMvRixPQUFPLEVBQUUsY0FBYyxFQUFlLGtCQUFrQixFQUFFLGFBQWEsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3RJLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLFlBQVksRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNoSCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFDakQsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sMkRBQTJELENBQUM7QUFDeEcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDOUYsT0FBTyxFQUFFLFVBQVUsRUFBRSxhQUFhLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQVFqRixNQUFNLENBQUMsTUFBTSwyQkFBMkIsR0FBRyxJQUFJLGFBQWEsQ0FBUywwQkFBMEIsRUFBRSxFQUFFLENBQUMsQ0FBQztBQUU5RixJQUFNLG9CQUFvQixHQUExQixNQUFNLG9CQUFx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