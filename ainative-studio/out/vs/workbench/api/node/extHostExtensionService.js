/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as performance from '../../../base/common/performance.js';
import { createApiFactoryAndRegisterActors } from '../common/extHost.api.impl.js';
import { RequireInterceptor } from '../common/extHostRequireInterceptor.js';
import { connectProxyResolver } from './proxyResolver.js';
import { AbstractExtHostExtensionService } from '../common/extHostExtensionService.js';
import { ExtHostDownloadService } from './extHostDownloadService.js';
import { URI } from '../../../base/common/uri.js';
import { Schemas } from '../../../base/common/network.js';
import { ExtensionRuntime } from '../common/extHostTypes.js';
import { CLIServer } from './extHostCLIServer.js';
import { realpathSync } from '../../../base/node/extpath.js';
import { ExtHostConsoleForwarder } from './extHostConsoleForwarder.js';
import { ExtHostDiskFileSystemProvider } from './extHostDiskFileSystemProvider.js';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
class NodeModuleRequireInterceptor extends RequireInterceptor {
    _installInterceptor() {
        const that = this;
        const node_module = require('module');
        const originalLoad = node_module._load;
        node_module._load = function load(request, parent, isMain) {
            request = applyAlternatives(request);
            if (!that._factories.has(request)) {
                return originalLoad.apply(this, arguments);
            }
            return that._factories.get(request).load(request, URI.file(realpathSync(parent.filename)), request => originalLoad.apply(this, [request, parent, isMain]));
        };
        const originalLookup = node_module._resolveLookupPaths;
        node_module._resolveLookupPaths = (request, parent) => {
            return originalLookup.call(this, applyAlternatives(request), parent);
        };
        const originalResolveFilename = node_module._resolveFilename;
        node_module._resolveFilename = function resolveFilename(request, parent, isMain, options) {
            if (request === 'vsda' && Array.isArray(options?.paths) && options.paths.length === 0) {
                // ESM: ever since we moved to ESM, `require.main` will be `undefined` for extensions
                // Some extensions have been using `require.resolve('vsda', { paths: require.main.paths })`
                // to find the `vsda` module in our app root. To be backwards compatible with this pattern,
                // we help by filling in the `paths` array with the node modules paths of the current module.
                options.paths = node_module._nodeModulePaths(import.meta.dirname);
            }
            return originalResolveFilename.call(this, request, parent, isMain, options);
        };
        const applyAlternatives = (request) => {
            for (const alternativeModuleName of that._alternatives) {
                const alternative = alternativeModuleName(request);
                if (alternative) {
                    request = alternative;
                    break;
                }
            }
            return request;
        };
    }
}
export class ExtHostExtensionService extends AbstractExtHostExtensionService {
    constructor() {
        super(...arguments);
        this.extensionRuntime = ExtensionRuntime.Node;
    }
    async _beforeAlmostReadyToRunExtensions() {
        // make sure console.log calls make it to the render
        this._instaService.createInstance(ExtHostConsoleForwarder);
        // initialize API and register actors
        const extensionApiFactory = this._instaService.invokeFunction(createApiFactoryAndRegisterActors);
        // Register Download command
        this._instaService.createInstance(ExtHostDownloadService);
        // Register CLI Server for ipc
        if (this._initData.remote.isRemote && this._initData.remote.authority) {
            const cliServer = this._instaService.createInstance(CLIServer);
            process.env['VSCODE_IPC_HOOK_CLI'] = cliServer.ipcHandlePath;
        }
        // Register local file system shortcut
        this._instaService.createInstance(ExtHostDiskFileSystemProvider);
        // Module loading tricks
        const interceptor = this._instaService.createInstance(NodeModuleRequireInterceptor, extensionApiFactory, { mine: this._myRegistry, all: this._globalRegistry });
        await interceptor.install();
        performance.mark('code/extHost/didInitAPI');
        // Do this when extension service exists, but extensions are not being activated yet.
        const configProvider = await this._extHostConfiguration.getConfigProvider();
        await connectProxyResolver(this._extHostWorkspace, configProvider, this, this._logService, this._mainThreadTelemetryProxy, this._initData, this._store);
        performance.mark('code/extHost/didInitProxyResolver');
    }
    _getEntryPoint(extensionDescription) {
        return extensionDescription.main;
    }
    async _loadCommonJSModule(extension, module, activationTimesBuilder) {
        if (module.scheme !== Schemas.file) {
            throw new Error(`Cannot load URI: '${module}', must be of file-scheme`);
        }
        let r = null;
        activationTimesBuilder.codeLoadingStart();
        this._logService.trace(`ExtensionService#loadCommonJSModule ${module.toString(true)}`);
        this._logService.flush();
        const extensionId = extension?.identifier.value;
        if (extension) {
            await this._extHostLocalizationService.initializeLocalizedMessages(extension);
        }
        try {
            if (extensionId) {
                performance.mark(`code/extHost/willLoadExtensionCode/${extensionId}`);
            }
            r = (require)(module.fsPath);
        }
        finally {
            if (extensionId) {
                performance.mark(`code/extHost/didLoadExtensionCode/${extensionId}`);
            }
            activationTimesBuilder.codeLoadingStop();
        }
        return r;
    }
    async $setRemoteEnvironment(env) {
        if (!this._initData.remote.isRemote) {
            return;
        }
        for (const key in env) {
            const value = env[key];
            if (value === null) {
                delete process.env[key];
            }
            else {
                process.env[key] = value;
            }
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdEV4dGVuc2lvblNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9ub2RlL2V4dEhvc3RFeHRlbnNpb25TZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxXQUFXLE1BQU0scUNBQXFDLENBQUM7QUFDbkUsT0FBTyxFQUFFLGlDQUFpQyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDbEYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFFNUUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDMUQsT0FBTyxFQUFFLCtCQUErQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDdkYsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDckUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ2xELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUUxRCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUM3RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDbEQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQzdELE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQ3ZFLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ25GLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxhQUFhLENBQUM7QUFDNUMsTUFBTSxPQUFPLEdBQUcsYUFBYSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFD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