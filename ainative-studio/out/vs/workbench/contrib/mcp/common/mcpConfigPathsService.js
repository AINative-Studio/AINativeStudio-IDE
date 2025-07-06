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
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../base/common/network.js';
import { observableValue } from '../../../../base/common/observable.js';
import { basename } from '../../../../base/common/resources.js';
import { isDefined } from '../../../../base/common/types.js';
import { URI } from '../../../../base/common/uri.js';
import { localize } from '../../../../nls.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { FOLDER_SETTINGS_PATH, IPreferencesService } from '../../../services/preferences/common/preferences.js';
import { IRemoteAgentService } from '../../../services/remote/common/remoteAgentService.js';
import { mcpConfigurationSection } from './mcpConfiguration.js';
export const IMcpConfigPathsService = createDecorator('IMcpConfigPathsService');
let McpConfigPathsService = class McpConfigPathsService extends Disposable {
    get paths() {
        return this._paths;
    }
    constructor(workspaceContextService, productService, labelService, _environmentService, remoteAgentService, preferencesService) {
        super();
        this._environmentService = _environmentService;
        const workspaceConfig = workspaceContextService.getWorkspace().configuration;
        const initialPaths = [
            {
                id: 'usrlocal',
                key: 'userLocalValue',
                target: 3 /* ConfigurationTarget.USER_LOCAL */,
                label: localize('mcp.configuration.userLocalValue', 'Global in {0}', productService.nameShort),
                scope: 0 /* StorageScope.PROFILE */,
                order: 200 /* McpCollectionSortOrder.User */,
                uri: preferencesService.userSettingsResource,
                section: [mcpConfigurationSection],
            },
            workspaceConfig && {
                id: 'workspace',
                key: 'workspaceValue',
                target: 5 /* ConfigurationTarget.WORKSPACE */,
                label: basename(workspaceConfig),
                scope: 1 /* StorageScope.WORKSPACE */,
                order: 100 /* McpCollectionSortOrder.Workspace */,
                remoteAuthority: _environmentService.remoteAuthority,
                uri: workspaceConfig,
                section: ['settings', mcpConfigurationSection],
            },
            ...workspaceContextService.getWorkspace()
                .folders
                .map(wf => this._fromWorkspaceFolder(wf))
        ];
        this._paths = observableValue('mcpConfigPaths', initialPaths.filter(isDefined));
        remoteAgentService.getEnvironment().then((env) => {
            const label = _environmentService.remoteAuthority ? labelService.getHostLabel(Schemas.vscodeRemote, _environmentService.remoteAuthority) : 'Remote';
            this._paths.set([
                ...this.paths.get(),
                {
                    id: 'usrremote',
                    key: 'userRemoteValue',
                    target: 4 /* ConfigurationTarget.USER_REMOTE */,
                    label,
                    scope: 0 /* StorageScope.PROFILE */,
                    order: 200 /* McpCollectionSortOrder.User */ + -50 /* McpCollectionSortOrder.RemoteBoost */,
                    uri: env?.settingsPath,
                    remoteAuthority: _environmentService.remoteAuthority,
                    section: [mcpConfigurationSection],
                }
            ], undefined);
        });
        this._register(workspaceContextService.onDidChangeWorkspaceFolders(e => {
            const next = this._paths.get().slice();
            for (const folder of e.added) {
                next.push(this._fromWorkspaceFolder(folder));
            }
            for (const folder of e.removed) {
                const idx = next.findIndex(c => c.workspaceFolder === folder);
                if (idx !== -1) {
                    next.splice(idx, 1);
                }
            }
            this._paths.set(next, undefined);
        }));
    }
    _fromWorkspaceFolder(workspaceFolder) {
        return {
            id: `wf${workspaceFolder.index}`,
            key: 'workspaceFolderValue',
            target: 6 /* ConfigurationTarget.WORKSPACE_FOLDER */,
            label: `${workspaceFolder.name}/.vscode/mcp.json`,
            scope: 1 /* StorageScope.WORKSPACE */,
            remoteAuthority: this._environmentService.remoteAuthority,
            order: 0 /* McpCollectionSortOrder.WorkspaceFolder */,
            uri: URI.joinPath(workspaceFolder.uri, FOLDER_SETTINGS_PATH, '../mcp.json'),
            workspaceFolder,
        };
    }
};
McpConfigPathsService = __decorate([
    __param(0, IWorkspaceContextService),
    __param(1, IProductService),
    __param(2, ILabelService),
    __param(3, IWorkbenchEnvironmentService),
    __param(4, IRemoteAgentService),
    __param(5, IPreferencesService)
], McpConfigPathsService);
export { McpConfigPathsService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwQ29uZmlnUGF0aHNTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbWNwL2NvbW1vbi9tY3BDb25maWdQYXRoc1NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM3RCxPQUFPLEVBQW9DLGVBQWUsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQzFHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNoRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDN0QsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUU5QyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDN0YsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUV4RixPQUFPLEVBQUUsd0JBQXdCLEVBQW9CLE1BQU0sb0RBQW9ELENBQUM7QUFDaEgsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDMUcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLG1CQUFtQixFQUFFLE1BQU0scURBQXFELENBQUM7QUFDaEgsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDNUYsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0s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