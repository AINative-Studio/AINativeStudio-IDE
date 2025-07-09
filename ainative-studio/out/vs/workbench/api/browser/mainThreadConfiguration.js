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
import { URI } from '../../../base/common/uri.js';
import { Registry } from '../../../platform/registry/common/platform.js';
import { Extensions as ConfigurationExtensions, getScopes } from '../../../platform/configuration/common/configurationRegistry.js';
import { IWorkspaceContextService } from '../../../platform/workspace/common/workspace.js';
import { MainContext, ExtHostContext } from '../common/extHost.protocol.js';
import { extHostNamedCustomer } from '../../services/extensions/common/extHostCustomers.js';
import { IConfigurationService } from '../../../platform/configuration/common/configuration.js';
import { IEnvironmentService } from '../../../platform/environment/common/environment.js';
let MainThreadConfiguration = class MainThreadConfiguration {
    constructor(extHostContext, _workspaceContextService, configurationService, _environmentService) {
        this._workspaceContextService = _workspaceContextService;
        this.configurationService = configurationService;
        this._environmentService = _environmentService;
        const proxy = extHostContext.getProxy(ExtHostContext.ExtHostConfiguration);
        proxy.$initializeConfiguration(this._getConfigurationData());
        this._configurationListener = configurationService.onDidChangeConfiguration(e => {
            proxy.$acceptConfigurationChanged(this._getConfigurationData(), e.change);
        });
    }
    _getConfigurationData() {
        const configurationData = { ...(this.configurationService.getConfigurationData()), configurationScopes: [] };
        // Send configurations scopes only in development mode.
        if (!this._environmentService.isBuilt || this._environmentService.isExtensionDevelopment) {
            configurationData.configurationScopes = getScopes();
        }
        return configurationData;
    }
    dispose() {
        this._configurationListener.dispose();
    }
    $updateConfigurationOption(target, key, value, overrides, scopeToLanguage) {
        overrides = { resource: overrides?.resource ? URI.revive(overrides.resource) : undefined, overrideIdentifier: overrides?.overrideIdentifier };
        return this.writeConfiguration(target, key, value, overrides, scopeToLanguage);
    }
    $removeConfigurationOption(target, key, overrides, scopeToLanguage) {
        overrides = { resource: overrides?.resource ? URI.revive(overrides.resource) : undefined, overrideIdentifier: overrides?.overrideIdentifier };
        return this.writeConfiguration(target, key, undefined, overrides, scopeToLanguage);
    }
    writeConfiguration(target, key, value, overrides, scopeToLanguage) {
        target = target !== null && target !== undefined ? target : this.deriveConfigurationTarget(key, overrides);
        const configurationValue = this.configurationService.inspect(key, overrides);
        switch (target) {
            case 8 /* ConfigurationTarget.MEMORY */:
                return this._updateValue(key, value, target, configurationValue?.memory?.override, overrides, scopeToLanguage);
            case 6 /* ConfigurationTarget.WORKSPACE_FOLDER */:
                return this._updateValue(key, value, target, configurationValue?.workspaceFolder?.override, overrides, scopeToLanguage);
            case 5 /* ConfigurationTarget.WORKSPACE */:
                return this._updateValue(key, value, target, configurationValue?.workspace?.override, overrides, scopeToLanguage);
            case 4 /* ConfigurationTarget.USER_REMOTE */:
                return this._updateValue(key, value, target, configurationValue?.userRemote?.override, overrides, scopeToLanguage);
            default:
                return this._updateValue(key, value, target, configurationValue?.userLocal?.override, overrides, scopeToLanguage);
        }
    }
    _updateValue(key, value, configurationTarget, overriddenValue, overrides, scopeToLanguage) {
        overrides = scopeToLanguage === true ? overrides
            : scopeToLanguage === false ? { resource: overrides.resource }
                : overrides.overrideIdentifier && overriddenValue !== undefined ? overrides
                    : { resource: overrides.resource };
        return this.configurationService.updateValue(key, value, overrides, configurationTarget, { donotNotifyError: true });
    }
    deriveConfigurationTarget(key, overrides) {
        if (overrides.resource && this._workspaceContextService.getWorkbenchState() === 3 /* WorkbenchState.WORKSPACE */) {
            const configurationProperties = Registry.as(ConfigurationExtensions.Configuration).getConfigurationProperties();
            if (configurationProperties[key] && (configurationProperties[key].scope === 5 /* ConfigurationScope.RESOURCE */ || configurationProperties[key].scope === 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */)) {
                return 6 /* ConfigurationTarget.WORKSPACE_FOLDER */;
            }
        }
        return 5 /* ConfigurationTarget.WORKSPACE */;
    }
};
MainThreadConfiguration = __decorate([
    extHostNamedCustomer(MainContext.MainThreadConfiguration),
    __param(1, IWorkspaceContextService),
    __param(2, IConfigurationService),
    __param(3, IEnvironmentService)
], MainThreadConfiguration);
export { MainThreadConfiguration };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZENvbmZpZ3VyYXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9icm93c2VyL21haW5UaHJlYWRDb25maWd1cmF0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUVsRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDekUsT0FBTyxFQUEwQixVQUFVLElBQUksdUJBQXVCLEVBQXNCLFNBQVMsRUFBRSxNQUFNLGlFQUFpRSxDQUFDO0FBQy9LLE9BQU8sRUFBRSx3QkFBd0IsRUFBa0IsTUFBTSxpREFBaUQsQ0FBQztBQUMzRyxPQUFPLEVBQWdDLFdBQVcsRUFBRSxjQUFjLEVBQTBCLE1BQU0sK0JBQStCLENBQUM7QUFDbEksT0FBTyxFQUFFLG9CQUFvQixFQUFtQixNQUFNLHNEQUFzRCxDQUFDO0FBQzdHLE9BQU8sRUFBdUIscUJBQXFCLEVBQTJCLE1BQU0seURBQXlELENBQUM7QUFDOUksT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0scURBQXFELENBQUM7QUFHbkYsSUFBTSx1QkFBdUIsR0FBN0IsTUFBTSx1QkFBdUI7SUFJbkMsWUFDQyxjQUErQixFQUNZLHdCQUFrRCxFQUNyRCxvQkFBMkMsRUFDN0MsbUJBQXdDO1FBRm5DLDZCQUF3QixHQUF4Qix3QkFBd0IsQ0FBMEI7UUFDckQseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtRQUM3Qyx3QkFBbUIsR0FBbkIsbUJBQW1CLENBQXFCO1FBRTlFLE1BQU0sS0FBSyxHQUFHLGNBQWMsQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLG9CQUFvQixDQUFDLENBQUM7UUFFM0UsS0FBSyxD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