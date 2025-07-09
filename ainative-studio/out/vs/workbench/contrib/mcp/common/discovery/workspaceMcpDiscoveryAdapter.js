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
import { DisposableMap } from '../../../../../base/common/lifecycle.js';
import { observableValue } from '../../../../../base/common/observable.js';
import { joinPath } from '../../../../../base/common/resources.js';
import { URI } from '../../../../../base/common/uri.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { IRemoteAgentService } from '../../../../services/remote/common/remoteAgentService.js';
import { IMcpRegistry } from '../mcpRegistryTypes.js';
import { FilesystemMcpDiscovery } from './nativeMcpDiscoveryAbstract.js';
import { claudeConfigToServerDefinition } from './nativeMcpDiscoveryAdapters.js';
let CursorWorkspaceMcpDiscoveryAdapter = class CursorWorkspaceMcpDiscoveryAdapter extends FilesystemMcpDiscovery {
    constructor(fileService, _workspaceContextService, mcpRegistry, configurationService, _remoteAgentService) {
        super(configurationService, fileService, mcpRegistry);
        this._workspaceContextService = _workspaceContextService;
        this._remoteAgentService = _remoteAgentService;
        this._collections = this._register(new DisposableMap());
    }
    start() {
        this._register(this._workspaceContextService.onDidChangeWorkspaceFolders(e => {
            for (const removed of e.removed) {
                this._collections.deleteAndDispose(removed.uri.toString());
            }
            for (const added of e.added) {
                this.watchFolder(added);
            }
        }));
        for (const folder of this._workspaceContextService.getWorkspace().folders) {
            this.watchFolder(folder);
        }
    }
    watchFolder(folder) {
        const configFile = joinPath(folder.uri, '.cursor', 'mcp.json');
        const collection = {
            id: `cursor-workspace.${folder.index}`,
            label: `${folder.name}/.cursor/mcp.json`,
            remoteAuthority: this._remoteAgentService.getConnection()?.remoteAuthority || null,
            scope: 1 /* StorageScope.WORKSPACE */,
            isTrustedByDefault: false,
            serverDefinitions: observableValue(this, []),
            presentation: {
                origin: configFile,
                order: 0 /* McpCollectionSortOrder.WorkspaceFolder */ + 1,
            },
        };
        this._collections.set(folder.uri.toString(), this.watchFile(URI.joinPath(folder.uri, '.cursor', 'mcp.json'), collection, "cursor-workspace" /* DiscoverySource.CursorWorkspace */, contents => {
            const defs = claudeConfigToServerDefinition(collection.id, contents, folder.uri);
            defs?.forEach(d => d.roots = [folder.uri]);
            return defs;
        }));
    }
};
CursorWorkspaceMcpDiscoveryAdapter = __decorate([
    __param(0, IFileService),
    __param(1, IWorkspaceContextService),
    __param(2, IMcpRegistry),
    __param(3, IConfigurationService),
    __param(4, IRemoteAgentService)
], CursorWorkspaceMcpDiscoveryAdapter);
export { CursorWorkspaceMcpDiscoveryAdapter };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya3NwYWNlTWNwRGlzY292ZXJ5QWRhcHRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9tY3AvY29tbW9uL2Rpc2NvdmVyeS93b3Jrc3BhY2VNY3BEaXNjb3ZlcnlBZGFwdGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxhQUFhLEVBQWUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNyRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDM0UsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN4RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUN0RyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFFN0UsT0FBTyxFQUFFLHdCQUF3QixFQUFvQixNQUFNLHVEQUF1RCxDQUFDO0FBQ25ILE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBRS9GLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUd0RCxPQUFPLEVBQUUsc0JBQXNCLEVBQW1DLE1BQU0saUNBQWlDLENBQUM7QUFDMUcsT0FBTyxFQUFFLDhCQUE4QixFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFFMUUsSUFBTSxrQ0FBa0MsR0FBeEMsTUFBTSxrQ0FBbUMsU0FBUSxzQkFBc0I7SUFHN0UsWUFDZSxXQUF5QixFQUNiLHdCQUFtRSxFQUMvRSxXQUF5QixFQUNoQixvQkFBMkMsRUFDN0MsbUJBQXlEO1FBRTlFLEtBQUssQ0FBQyxvQkFBb0IsRUFBRSxXQUFX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