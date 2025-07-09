/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { URI } from '../../base/common/uri.js';
import { createURITransformer } from '../../workbench/api/node/uriTransformer.js';
import { DiskFileSystemProvider } from '../../platform/files/node/diskFileSystemProvider.js';
import { posix, delimiter } from '../../base/common/path.js';
import { AbstractDiskFileSystemProviderChannel, AbstractSessionFileWatcher } from '../../platform/files/node/diskFileSystemProviderServer.js';
export class RemoteAgentFileSystemProviderChannel extends AbstractDiskFileSystemProviderChannel {
    constructor(logService, environmentService, configurationService) {
        super(new DiskFileSystemProvider(logService), logService);
        this.environmentService = environmentService;
        this.configurationService = configurationService;
        this.uriTransformerCache = new Map();
        this._register(this.provider);
    }
    getUriTransformer(ctx) {
        let transformer = this.uriTransformerCache.get(ctx.remoteAuthority);
        if (!transformer) {
            transformer = createURITransformer(ctx.remoteAuthority);
            this.uriTransformerCache.set(ctx.remoteAuthority, transformer);
        }
        return transformer;
    }
    transformIncoming(uriTransformer, _resource, supportVSCodeResource = false) {
        if (supportVSCodeResource && _resource.path === '/vscode-resource' && _resource.query) {
            const requestResourcePath = JSON.parse(_resource.query).requestResourcePath;
            return URI.from({ scheme: 'file', path: requestResourcePath });
        }
        return URI.revive(uriTransformer.transformIncoming(_resource));
    }
    //#region File Watching
    createSessionFileWatcher(uriTransformer, emitter) {
        return new SessionFileWatcher(uriTransformer, emitter, this.logService, this.environmentService, this.configurationService);
    }
}
class SessionFileWatcher extends AbstractSessionFileWatcher {
    constructor(uriTransformer, sessionEmitter, logService, environmentService, configurationService) {
        super(uriTransformer, sessionEmitter, logService, environmentService);
    }
    getRecursiveWatcherOptions(environmentService) {
        const fileWatcherPolling = environmentService.args['file-watcher-polling'];
        if (fileWatcherPolling) {
            const segments = fileWatcherPolling.split(delimiter);
            const pollingInterval = Number(segments[0]);
            if (pollingInterval > 0) {
                const usePolling = segments.length > 1 ? segments.slice(1) : true;
                return { usePolling, pollingInterval };
            }
        }
        return undefined;
    }
    getExtraExcludes(environmentService) {
        if (environmentService.extensionsPath) {
            // when opening the $HOME folder, we end up watching the extension folder
            // so simply exclude watching the extensions folder
            return [posix.join(environmentService.extensionsPath, '**')];
        }
        return undefined;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlRmlsZVN5c3RlbVByb3ZpZGVyU2VydmVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3NlcnZlci9ub2RlL3JlbW90ZUZpbGVTeXN0ZW1Qcm92aWRlclNlcnZlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLDBCQUEwQixDQUFDO0FBSTlELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBRWxGLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFFN0QsT0FBTyxFQUFFLHFDQUFxQyxFQUFFLDBCQUEwQixFQUF1QixNQUFNLDJEQUEyRCxDQUFDO0FBSW5LLE1BQU0sT0FBTyxvQ0FBcUMsU0FBUSxxQ0FBbUU7SUFJNUgsWUFDQyxVQUF1QixFQUNOLGtCQUE2QyxFQUM3QyxvQkFBMkM7UUFFNUQsS0FBSyxDQUFDLElBQUksc0JBQXNCLENBQUMsVUFBVSxDQUFDLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFIekMsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUEyQjtRQUM3Qyx5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO1FBTDVDLHdCQUFtQixHQUFHLElBQUksR0FBRyxFQUEyQixDQUFDO1FBU3pFLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQy9CLENBQUM7SUFFa0IsaUJBQWlCLENBQUMsR0FBaUM7UUFDckUsSUFBSSxXQUFXLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLENBQUM7UUFDcEUsSUFBSSxD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