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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwQ29uZmlnUGF0aHNTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL21jcC9jb21tb24vbWNwQ29uZmlnUGF0aHNTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDN0QsT0FBTyxFQUFvQyxlQUFlLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUMxRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDaEUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFFOUMsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUMzRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdURBQXVELENBQUM7QUFFeEYsT0FBTyxFQUFFLHdCQUF3QixFQUFvQixNQUFNLG9EQUFvRCxDQUFDO0FBQ2hILE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQzFHLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQ2hILE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQzVGLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFN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