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
var NodeModuleAliasingModuleFactory_1;
import * as performance from '../../../base/common/performance.js';
import { URI } from '../../../base/common/uri.js';
import { MainContext } from './extHost.protocol.js';
import { IExtHostConfiguration } from './extHostConfiguration.js';
import { nullExtensionDescription } from '../../services/extensions/common/extensions.js';
import { ExtensionIdentifierMap } from '../../../platform/extensions/common/extensions.js';
import { IExtHostRpcService } from './extHostRpcService.js';
import { IExtHostInitDataService } from './extHostInitDataService.js';
import { IInstantiationService } from '../../../platform/instantiation/common/instantiation.js';
import { IExtHostExtensionService } from './extHostExtensionService.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { escapeRegExpCharacters } from '../../../base/common/strings.js';
let RequireInterceptor = class RequireInterceptor {
    constructor(_apiFactory, _extensionRegistry, _instaService, _extHostConfiguration, _extHostExtensionService, _initData, _logService) {
        this._apiFactory = _apiFactory;
        this._extensionRegistry = _extensionRegistry;
        this._instaService = _instaService;
        this._extHostConfiguration = _extHostConfiguration;
        this._extHostExtensionService = _extHostExtensionService;
        this._initData = _initData;
        this._logService = _logService;
        this._factories = new Map();
        this._alternatives = [];
    }
    async install() {
        this._installInterceptor();
        performance.mark('code/extHost/willWaitForConfig');
        const configProvider = await this._extHostConfiguration.getConfigProvider();
        performance.mark('code/extHost/didWaitForConfig');
        const extensionPaths = await this._extHostExtensionService.getExtensionPathIndex();
        this.register(new VSCodeNodeModuleFactory(this._apiFactory, extensionPaths, this._extensionRegistry, configProvider, this._logService));
        this.register(this._instaService.createInstance(NodeModuleAliasingModuleFactory));
        if (this._initData.remote.isRemote) {
            this.register(this._instaService.createInstance(OpenNodeModuleFactory, extensionPaths, this._initData.environment.appUriScheme));
        }
    }
    register(interceptor) {
        if ('nodeModuleName' in interceptor) {
            if (Array.isArray(interceptor.nodeModuleName)) {
                for (const moduleName of interceptor.nodeModuleName) {
                    this._factories.set(moduleName, interceptor);
                }
            }
            else {
                this._factories.set(interceptor.nodeModuleName, interceptor);
            }
        }
        if (typeof interceptor.alternativeModuleName === 'function') {
            this._alternatives.push((moduleName) => {
                return interceptor.alternativeModuleName(moduleName);
            });
        }
    }
};
RequireInterceptor = __decorate([
    __param(2, IInstantiationService),
    __param(3, IExtHostConfiguration),
    __param(4, IExtHostExtensionService),
    __param(5, IExtHostInitDataService),
    __param(6, ILogService)
], RequireInterceptor);
export { RequireInterceptor };
//#region --- module renames
let NodeModuleAliasingModuleFactory = class NodeModuleAliasingModuleFactory {
    static { NodeModuleAliasingModuleFactory_1 = this; }
    /**
     * Map of aliased internal node_modules, used to allow for modules to be
     * renamed without breaking extensions. In the form "original -> new name".
     */
    static { this.aliased = new Map([
        ['vscode-ripgrep', '@vscode/ripgrep'],
        ['vscode-windows-registry', '@vscode/windows-registry'],
    ]); }
    constructor(initData) {
        if (initData.environment.appRoot && NodeModuleAliasingModuleFactory_1.aliased.size) {
            const root = escapeRegExpCharacters(this.forceForwardSlashes(initData.environment.appRoot.fsPath));
            // decompose ${appRoot}/node_modules/foo/bin to ['${appRoot}/node_modules/', 'foo', '/bin'],
            // and likewise the more complex form ${appRoot}/node_modules.asar.unpacked/@vcode/foo/bin
            // to ['${appRoot}/node_modules.asar.unpacked/',' @vscode/foo', '/bin'].
            const npmIdChrs = `[a-z0-9_.-]`;
            const npmModuleName = `@${npmIdChrs}+\\/${npmIdChrs}+|${npmIdChrs}+`;
            const moduleFolders = 'node_modules|node_modules\\.asar(?:\\.unpacked)?';
            this.re = new RegExp(`^(${root}/${moduleFolders}\\/)(${npmModuleName})(.*)$`, 'i');
        }
    }
    alternativeModuleName(name) {
        if (!this.re) {
            return;
        }
        const result = this.re.exec(this.forceForwardSlashes(name));
        if (!result) {
            return;
        }
        const [, prefix, moduleName, suffix] = result;
        const dealiased = NodeModuleAliasingModuleFactory_1.aliased.get(moduleName);
        if (dealiased === undefined) {
            return;
        }
        console.warn(`${moduleName} as been renamed to ${dealiased}, please update your imports`);
        return prefix + dealiased + suffix;
    }
    forceForwardSlashes(str) {
        return str.replace(/\\/g, '/');
    }
};
NodeModuleAliasingModuleFactory = NodeModuleAliasingModuleFactory_1 = __decorate([
    __param(0, IExtHostInitDataService)
], NodeModuleAliasingModuleFactory);
//#endregion
//#region --- vscode-module
class VSCodeNodeModuleFactory {
    constructor(_apiFactory, _extensionPaths, _extensionRegistry, _configProvider, _logService) {
        this._apiFactory = _apiFactory;
        this._extensionPaths = _extensionPaths;
        this._extensionRegistry = _extensionRegistry;
        this._configProvider = _configProvider;
        this._logService = _logService;
        this.nodeModuleName = 'vscode';
        this._extApiImpl = new ExtensionIdentifierMap();
    }
    load(_request, parent) {
        // get extension id from filename and api for extension
        const ext = this._extensionPaths.findSubstr(parent);
        if (ext) {
            let apiImpl = this._extApiImpl.get(ext.identifier);
            if (!apiImpl) {
                apiImpl = this._apiFactory(ext, this._extensionRegistry, this._configProvider);
                this._extApiImpl.set(ext.identifier, apiImpl);
            }
            return apiImpl;
        }
        // fall back to a default implementation
        if (!this._defaultApiImpl) {
            let extensionPathsPretty = '';
            this._extensionPaths.forEach((value, index) => extensionPathsPretty += `\t${index} -> ${value.identifier.value}\n`);
            this._logService.warn(`Could not identify extension for 'vscode' require call from ${parent}. These are the extension path mappings: \n${extensionPathsPretty}`);
            this._defaultApiImpl = this._apiFactory(nullExtensionDescription, this._extensionRegistry, this._configProvider);
        }
        return this._defaultApiImpl;
    }
}
let OpenNodeModuleFactory = class OpenNodeModuleFactory {
    constructor(_extensionPaths, _appUriScheme, rpcService) {
        this._extensionPaths = _extensionPaths;
        this._appUriScheme = _appUriScheme;
        this.nodeModuleName = ['open', 'opn'];
        this._mainThreadTelemetry = rpcService.getProxy(MainContext.MainThreadTelemetry);
        const mainThreadWindow = rpcService.getProxy(MainContext.MainThreadWindow);
        this._impl = (target, options) => {
            const uri = URI.parse(target);
            // If we have options use the original method.
            if (options) {
                return this.callOriginal(target, options);
            }
            if (uri.scheme === 'http' || uri.scheme === 'https') {
                return mainThreadWindow.$openUri(uri, target, { allowTunneling: true });
            }
            else if (uri.scheme === 'mailto' || uri.scheme === this._appUriScheme) {
                return mainThreadWindow.$openUri(uri, target, {});
            }
            return this.callOriginal(target, options);
        };
    }
    load(request, parent, original) {
        // get extension id from filename and api for extension
        const extension = this._extensionPaths.findSubstr(parent);
        if (extension) {
            this._extensionId = extension.identifier.value;
            this.sendShimmingTelemetry();
        }
        this._original = original(request);
        return this._impl;
    }
    callOriginal(target, options) {
        this.sendNoForwardTelemetry();
        return this._original(target, options);
    }
    sendShimmingTelemetry() {
        if (!this._extensionId) {
            return;
        }
        this._mainThreadTelemetry.$publicLog2('shimming.open', { extension: this._extensionId });
    }
    sendNoForwardTelemetry() {
        if (!this._extensionId) {
            return;
        }
        this._mainThreadTelemetry.$publicLog2('shimming.open.call.noForward', { extension: this._extensionId });
    }
};
OpenNodeModuleFactory = __decorate([
    __param(2, IExtHostRpcService)
], OpenNodeModuleFactory);
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFJlcXVpcmVJbnRlcmNlcHRvci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2NvbW1vbi9leHRIb3N0UmVxdWlyZUludGVyY2VwdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssV0FBVyxNQUFNLHFDQUFxQyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUNsRCxPQUFPLEVBQTRCLFdBQVcsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQzlFLE9BQU8sRUFBeUIscUJBQXFCLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUN6RixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUUxRixPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUUzRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUM1RCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUN0RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUNoRyxPQUFPLEVBQWtCLHdCQUF3QixFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDeEYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBZ0JsRSxJQUFlLGtCQUFrQixHQUFqQyxNQUFlLGtCQUFrQjtJQUt2QyxZQUNTLFdBQWlDLEVBQ2pDLGtCQUF3QyxFQUNSLGFBQW9DLEVBQ3BDLHFCQUE0QyxFQUN6Qyx3QkFBa0QsRUFDbkQsU0FBa0MsRUFDOUMsV0FB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