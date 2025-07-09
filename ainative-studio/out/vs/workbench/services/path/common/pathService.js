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
var AbstractPathService_1;
import { isValidBasename } from '../../../../base/common/extpath.js';
import { Schemas } from '../../../../base/common/network.js';
import { win32, posix } from '../../../../base/common/path.js';
import { OS } from '../../../../base/common/platform.js';
import { basename } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { getVirtualWorkspaceScheme } from '../../../../platform/workspace/common/virtualWorkspace.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IWorkbenchEnvironmentService } from '../../environment/common/environmentService.js';
import { IRemoteAgentService } from '../../remote/common/remoteAgentService.js';
export const IPathService = createDecorator('pathService');
let AbstractPathService = AbstractPathService_1 = class AbstractPathService {
    constructor(localUserHome, remoteAgentService, environmentService, contextService) {
        this.localUserHome = localUserHome;
        this.remoteAgentService = remoteAgentService;
        this.environmentService = environmentService;
        this.contextService = contextService;
        // OS
        this.resolveOS = (async () => {
            const env = await this.remoteAgentService.getEnvironment();
            return env?.os || OS;
        })();
        // User Home
        this.resolveUserHome = (async () => {
            const env = await this.remoteAgentService.getEnvironment();
            const userHome = this.maybeUnresolvedUserHome = env?.userHome ?? localUserHome;
            return userHome;
        })();
    }
    hasValidBasename(resource, arg2, basename) {
        // async version
        if (typeof arg2 === 'string' || typeof arg2 === 'undefined') {
            return this.resolveOS.then(os => this.doHasValidBasename(resource, os, arg2));
        }
        // sync version
        return this.doHasValidBasename(resource, arg2, basename);
    }
    doHasValidBasename(resource, os, name) {
        // Our `isValidBasename` method only works with our
        // standard schemes for files on disk, either locally
        // or remote.
        if (resource.scheme === Schemas.file || resource.scheme === Schemas.vscodeRemote) {
            return isValidBasename(name ?? basename(resource), os === 1 /* OperatingSystem.Windows */);
        }
        return true;
    }
    get defaultUriScheme() {
        return AbstractPathService_1.findDefaultUriScheme(this.environmentService, this.contextService);
    }
    static findDefaultUriScheme(environmentService, contextService) {
        if (environmentService.remoteAuthority) {
            return Schemas.vscodeRemote;
        }
        const virtualWorkspace = getVirtualWorkspaceScheme(contextService.getWorkspace());
        if (virtualWorkspace) {
            return virtualWorkspace;
        }
        const firstFolder = contextService.getWorkspace().folders[0];
        if (firstFolder) {
            return firstFolder.uri.scheme;
        }
        const configuration = contextService.getWorkspace().configuration;
        if (configuration) {
            return configuration.scheme;
        }
        return Schemas.file;
    }
    userHome(options) {
        return options?.preferLocal ? this.localUserHome : this.resolveUserHome;
    }
    get resolvedUserHome() {
        return this.maybeUnresolvedUserHome;
    }
    get path() {
        return this.resolveOS.then(os => {
            return os === 1 /* OperatingSystem.Windows */ ?
                win32 :
                posix;
        });
    }
    async fileURI(_path) {
        let authority = '';
        // normalize to fwd-slashes on windows,
        // on other systems bwd-slashes are valid
        // filename character, eg /f\oo/ba\r.txt
        const os = await this.resolveOS;
        if (os === 1 /* OperatingSystem.Windows */) {
            _path = _path.replace(/\\/g, '/');
        }
        // check for authority as used in UNC shares
        // or use the path as given
        if (_path[0] === '/' && _path[1] === '/') {
            const idx = _path.indexOf('/', 2);
            if (idx === -1) {
                authority = _path.substring(2);
                _path = '/';
            }
            else {
                authority = _path.substring(2, idx);
                _path = _path.substring(idx) || '/';
            }
        }
        return URI.from({
            scheme: Schemas.file,
            authority,
            path: _path,
            query: '',
            fragment: ''
        });
    }
};
AbstractPathService = AbstractPathService_1 = __decorate([
    __param(1, IRemoteAgentService),
    __param(2, IWorkbenchEnvironmentService),
    __param(3, IWorkspaceContextService)
], AbstractPathService);
export { AbstractPathService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGF0aFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3BhdGgvY29tbW9uL3BhdGhTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDckUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzdELE9BQU8sRUFBUyxLQUFLLEVBQUUsS0FBSyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDdEUsT0FBTyxFQUFtQixFQUFFLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDaEUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUM3RixPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQUN0RyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUM5RixPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUM5RixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUVoRixNQUFNLENBQUMsTUFBTSxZQUFZLEdBQUcsZUFBZSxDQUFlLGFBQWEsQ0FBQyxDQUFDO0FBK0RsRSxJQUFlLG1CQUFtQiwyQkFBbEMsTUFBZSxtQkFBbUI7SUFTeEMsWUFDUyxhQUFrQixFQUNZLGtCQUF1QyxFQUM5QixrQkFBZ0QsRUFDN0QsY0FBd0M7UUFIbEUsa0JBQWEsR0FBYixhQUFhLENBQUs7UUFDWSx1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