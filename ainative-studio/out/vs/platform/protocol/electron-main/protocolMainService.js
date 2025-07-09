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
import { session } from 'electron';
import { Disposable, toDisposable } from '../../../base/common/lifecycle.js';
import { COI, FileAccess, Schemas, CacheControlheaders, DocumentPolicyheaders } from '../../../base/common/network.js';
import { basename, extname, normalize } from '../../../base/common/path.js';
import { isLinux } from '../../../base/common/platform.js';
import { TernarySearchTree } from '../../../base/common/ternarySearchTree.js';
import { URI } from '../../../base/common/uri.js';
import { generateUuid } from '../../../base/common/uuid.js';
import { validatedIpcMain } from '../../../base/parts/ipc/electron-main/ipcMain.js';
import { INativeEnvironmentService } from '../../environment/common/environment.js';
import { ILogService } from '../../log/common/log.js';
import { IUserDataProfilesService } from '../../userDataProfile/common/userDataProfile.js';
let ProtocolMainService = class ProtocolMainService extends Disposable {
    constructor(environmentService, userDataProfilesService, logService) {
        super();
        this.environmentService = environmentService;
        this.logService = logService;
        this.validRoots = TernarySearchTree.forPaths(!isLinux);
        this.validExtensions = new Set(['.svg', '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.mp4', '.otf', '.ttf']); // https://github.com/microsoft/vscode/issues/119384
        // Define an initial set of roots we allow loading from
        // - appRoot	: all files installed as part of the app
        // - extensions : all files shipped from extensions
        // - storage    : all files in global and workspace storage (https://github.com/microsoft/vscode/issues/116735)
        this.addValidFileRoot(environmentService.appRoot);
        this.addValidFileRoot(environmentService.extensionsPath);
        this.addValidFileRoot(userDataProfilesService.defaultProfile.globalStorageHome.with({ scheme: Schemas.file }).fsPath);
        this.addValidFileRoot(environmentService.workspaceStorageHome.with({ scheme: Schemas.file }).fsPath);
        // Handle protocols
        this.handleProtocols();
    }
    handleProtocols() {
        const { defaultSession } = session;
        // Register vscode-file:// handler
        defaultSession.protocol.registerFileProtocol(Schemas.vscodeFileResource, (request, callback) => this.handleResourceRequest(request, callback));
        // Block any file:// access
        defaultSession.protocol.interceptFileProtocol(Schemas.file, (request, callback) => this.handleFileRequest(request, callback));
        // Cleanup
        this._register(toDisposable(() => {
            defaultSession.protocol.unregisterProtocol(Schemas.vscodeFileResource);
            defaultSession.protocol.uninterceptProtocol(Schemas.file);
        }));
    }
    addValidFileRoot(root) {
        // Pass to `normalize` because we later also do the
        // same for all paths to check against.
        const normalizedRoot = normalize(root);
        if (!this.validRoots.get(normalizedRoot)) {
            this.validRoots.set(normalizedRoot, true);
            return toDisposable(() => this.validRoots.delete(normalizedRoot));
        }
        return Disposable.None;
    }
    //#region file://
    handleFileRequest(request, callback) {
        const uri = URI.parse(request.url);
        this.logService.error(`Refused to load resource ${uri.fsPath} from ${Schemas.file}: protocol (original URL: ${request.url})`);
        return callback({ error: -3 /* ABORTED */ });
    }
    //#endregion
    //#region vscode-file://
    handleResourceRequest(request, callback) {
        const path = this.requestToNormalizedFilePath(request);
        const pathBasename = basename(path);
        let headers;
        if (this.environmentService.crossOriginIsolated) {
            if (pathBasename === 'workbench.html' || pathBasename === 'workbench-dev.html') {
                headers = COI.CoopAndCoep;
            }
            else {
                headers = COI.getHeadersFromQuery(request.url);
            }
        }
        // In OSS, evict resources from the memory cache in the renderer process
        // Refs https://github.com/microsoft/vscode/issues/148541#issuecomment-2670891511
        if (!this.environmentService.isBuilt) {
            headers = {
                ...headers,
                ...CacheControlheaders
            };
        }
        // Document-policy header is needed for collecting
        // JavaScript callstacks via https://www.electronjs.org/docs/latest/api/web-frame-main#framecollectjavascriptcallstack-experimental
        // until https://github.com/electron/electron/issues/45356 is resolved.
        if (pathBasename === 'workbench.html' || pathBasename === 'workbench-dev.html') {
            headers = {
                ...headers,
                ...DocumentPolicyheaders
            };
        }
        // first check by validRoots
        if (this.validRoots.findSubstr(path)) {
            return callback({ path, headers });
        }
        // then check by validExtensions
        if (this.validExtensions.has(extname(path).toLowerCase())) {
            return callback({ path, headers });
        }
        // finally block to load the resource
        this.logService.error(`${Schemas.vscodeFileResource}: Refused to load resource ${path} from ${Schemas.vscodeFileResource}: protocol (original URL: ${request.url})`);
        return callback({ error: -3 /* ABORTED */ });
    }
    requestToNormalizedFilePath(request) {
        // 1.) Use `URI.parse()` util from us to convert the raw
        //     URL into our URI.
        const requestUri = URI.parse(request.url);
        // 2.) Use `FileAccess.asFileUri` to convert back from a
        //     `vscode-file:` URI to a `file:` URI.
        const unnormalizedFileUri = FileAccess.uriToFileUri(requestUri);
        // 3.) Strip anything from the URI that could result in
        //     relative paths (such as "..") by using `normalize`
        return normalize(unnormalizedFileUri.fsPath);
    }
    //#endregion
    //#region IPC Object URLs
    createIPCObjectUrl() {
        let obj = undefined;
        // Create unique URI
        const resource = URI.from({
            scheme: 'vscode', // used for all our IPC communication (vscode:<channel>)
            path: generateUuid()
        });
        // Install IPC handler
        const channel = resource.toString();
        const handler = async () => obj;
        validatedIpcMain.handle(channel, handler);
        this.logService.trace(`IPC Object URL: Registered new channel ${channel}.`);
        return {
            resource,
            update: updatedObj => obj = updatedObj,
            dispose: () => {
                this.logService.trace(`IPC Object URL: Removed channel ${channel}.`);
                validatedIpcMain.removeHandler(channel);
            }
        };
    }
};
ProtocolMainService = __decorate([
    __param(0, INativeEnvironmentService),
    __param(1, IUserDataProfilesService),
    __param(2, ILogService)
], ProtocolMainService);
export { ProtocolMainService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvdG9jb2xNYWluU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9wcm90b2NvbC9lbGVjdHJvbi1tYWluL3Byb3RvY29sTWFpblNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLFVBQVUsQ0FBQztBQUNuQyxPQUFPLEVBQUUsVUFBVSxFQUFlLFlBQVksRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzFGLE9BQU8sRUFBRSxHQUFHLEVBQUUsVUFBVSxFQUFFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3ZILE9BQU8sRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQzVFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUMzRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUM5RSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDbEQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQzVELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ3BGLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUV0RCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUlwRixJQUFNLG1CQUFtQixHQUF6QixNQUFNLG1CQUFvQixTQUFRLFVBQVU7SUFPbEQsWUFDNEIsa0JB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