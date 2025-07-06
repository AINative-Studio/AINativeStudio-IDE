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
var BrowserExtensionHostDebugService_1;
import { Event } from '../../../../base/common/event.js';
import { URI } from '../../../../base/common/uri.js';
import { IExtensionHostDebugService } from '../../../../platform/debug/common/extensionHostDebug.js';
import { ExtensionHostDebugBroadcastChannel, ExtensionHostDebugChannelClient } from '../../../../platform/debug/common/extensionHostDebugIpc.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { isFolderToOpen, isWorkspaceToOpen } from '../../../../platform/window/common/window.js';
import { IWorkspaceContextService, isSingleFolderWorkspaceIdentifier, isWorkspaceIdentifier, toWorkspaceIdentifier, hasWorkspaceFileExtension } from '../../../../platform/workspace/common/workspace.js';
import { IBrowserWorkbenchEnvironmentService } from '../../../services/environment/browser/environmentService.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { IRemoteAgentService } from '../../../services/remote/common/remoteAgentService.js';
let BrowserExtensionHostDebugService = class BrowserExtensionHostDebugService extends ExtensionHostDebugChannelClient {
    static { BrowserExtensionHostDebugService_1 = this; }
    static { this.LAST_EXTENSION_DEVELOPMENT_WORKSPACE_KEY = 'debug.lastExtensionDevelopmentWorkspace'; }
    constructor(remoteAgentService, environmentService, logService, hostService, contextService, storageService, fileService) {
        const connection = remoteAgentService.getConnection();
        let channel;
        if (connection) {
            channel = connection.getChannel(ExtensionHostDebugBroadcastChannel.ChannelName);
        }
        else {
            // Extension host debugging not supported in serverless.
            channel = { call: async () => undefined, listen: () => Event.None };
        }
        super(channel);
        this.storageService = storageService;
        this.fileService = fileService;
        if (environmentService.options && environmentService.options.workspaceProvider) {
            this.workspaceProvider = environmentService.options.workspaceProvider;
        }
        else {
            this.workspaceProvider = { open: async () => true, workspace: undefined, trusted: undefined };
            logService.warn('Extension Host Debugging not available due to missing workspace provider.');
        }
        // Reload window on reload request
        this._register(this.onReload(event => {
            if (environmentService.isExtensionDevelopment && environmentService.debugExtensionHost.debugId === event.sessionId) {
                hostService.reload();
            }
        }));
        // Close window on close request
        this._register(this.onClose(event => {
            if (environmentService.isExtensionDevelopment && environmentService.debugExtensionHost.debugId === event.sessionId) {
                hostService.close();
            }
        }));
        // Remember workspace as last used for extension development
        // (unless this is API tests) to restore for a future session
        if (environmentService.isExtensionDevelopment && !environmentService.extensionTestsLocationURI) {
            const workspaceId = toWorkspaceIdentifier(contextService.getWorkspace());
            if (isSingleFolderWorkspaceIdentifier(workspaceId) || isWorkspaceIdentifier(workspaceId)) {
                const serializedWorkspace = isSingleFolderWorkspaceIdentifier(workspaceId) ? { folderUri: workspaceId.uri.toJSON() } : { workspaceUri: workspaceId.configPath.toJSON() };
                storageService.store(BrowserExtensionHostDebugService_1.LAST_EXTENSION_DEVELOPMENT_WORKSPACE_KEY, JSON.stringify(serializedWorkspace), 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
            }
            else {
                storageService.remove(BrowserExtensionHostDebugService_1.LAST_EXTENSION_DEVELOPMENT_WORKSPACE_KEY, 0 /* StorageScope.PROFILE */);
            }
        }
    }
    async openExtensionDevelopmentHostWindow(args, _debugRenderer) {
        // Add environment parameters required for debug to work
        const environment = new Map();
        const fileUriArg = this.findArgument('file-uri', args);
        if (fileUriArg && !hasWorkspaceFileExtension(fileUriArg)) {
            environment.set('openFile', fileUriArg);
        }
        const copyArgs = [
            'extensionDevelopmentPath',
            'extensionTestsPath',
            'extensionEnvironment',
            'debugId',
            'inspect-brk-extensions',
            'inspect-extensions',
        ];
        for (const argName of copyArgs) {
            const value = this.findArgument(argName, args);
            if (value) {
                environment.set(argName, value);
            }
        }
        // Find out which workspace to open debug window on
        let debugWorkspace = undefined;
        const folderUriArg = this.findArgument('folder-uri', args);
        if (folderUriArg) {
            debugWorkspace = { folderUri: URI.parse(folderUriArg) };
        }
        else {
            const fileUriArg = this.findArgument('file-uri', args);
            if (fileUriArg && hasWorkspaceFileExtension(fileUriArg)) {
                debugWorkspace = { workspaceUri: URI.parse(fileUriArg) };
            }
        }
        const extensionTestsPath = this.findArgument('extensionTestsPath', args);
        if (!debugWorkspace && !extensionTestsPath) {
            const lastExtensionDevelopmentWorkspace = this.storageService.get(BrowserExtensionHostDebugService_1.LAST_EXTENSION_DEVELOPMENT_WORKSPACE_KEY, 0 /* StorageScope.PROFILE */);
            if (lastExtensionDevelopmentWorkspace) {
                try {
                    const serializedWorkspace = JSON.parse(lastExtensionDevelopmentWorkspace);
                    if (serializedWorkspace.workspaceUri) {
                        debugWorkspace = { workspaceUri: URI.revive(serializedWorkspace.workspaceUri) };
                    }
                    else if (serializedWorkspace.folderUri) {
                        debugWorkspace = { folderUri: URI.revive(serializedWorkspace.folderUri) };
                    }
                }
                catch (error) {
                    // ignore
                }
            }
        }
        // Validate workspace exists
        if (debugWorkspace) {
            const debugWorkspaceResource = isFolderToOpen(debugWorkspace) ? debugWorkspace.folderUri : isWorkspaceToOpen(debugWorkspace) ? debugWorkspace.workspaceUri : undefined;
            if (debugWorkspaceResource) {
                const workspaceExists = await this.fileService.exists(debugWorkspaceResource);
                if (!workspaceExists) {
                    debugWorkspace = undefined;
                }
            }
        }
        // Open debug window as new window. Pass arguments over.
        const success = await this.workspaceProvider.open(debugWorkspace, {
            reuse: false, // debugging always requires a new window
            payload: Array.from(environment.entries()) // mandatory properties to enable debugging
        });
        return { success };
    }
    findArgument(key, args) {
        for (const a of args) {
            const k = `--${key}=`;
            if (a.indexOf(k) === 0) {
                return a.substring(k.length);
            }
        }
        return undefined;
    }
};
BrowserExtensionHostDebugService = BrowserExtensionHostDebugService_1 = __decorate([
    __param(0, IRemoteAgentService),
    __param(1, IBrowserWorkbenchEnvironmentService),
    __param(2, ILogService),
    __param(3, IHostService),
    __param(4, IWorkspaceContextService),
    __param(5, IStorageService),
    __param(6, IFileService)
], BrowserExtensionHostDebugService);
registerSingleton(IExtensionHostDebugService, BrowserExtensionHostDebugService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uSG9zdERlYnVnU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2RlYnVnL2Jyb3dzZXIvZXh0ZW5zaW9uSG9zdERlYnVnU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3pELE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sZ0NBQWdDLENBQUM7QUFFcEUsT0FBTyxFQUFFLDBCQUEwQixFQUE4QixNQUFNLHlEQUF5RCxDQUFDO0FBQ2pJLE9BQU8sRUFBRSxrQ0FBa0MsRUFBRSwrQkFBK0IsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ2pKLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUMxRSxPQUFPLEVBQXFCLGlCQUFpQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDL0csT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxlQUFlLEVBQStCLE1BQU0sZ0RBQWdELENBQUM7QUFDOUcsT0FBTyxFQUFFLGNBQWMsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQ2pHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxpQ0FBaUMsRUFBRSxxQkFBcUIsRUFBRSxxQkFBcUIsRUFBRSx5QkFBeUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBRTFNLE9BQU8sRUFBRSxtQ0FBbUMsRUFBRSxNQUFNLDZEQUE2RCxDQUFDO0FBQ2xILE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUN0RSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx1REFBdUQsQ0FB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