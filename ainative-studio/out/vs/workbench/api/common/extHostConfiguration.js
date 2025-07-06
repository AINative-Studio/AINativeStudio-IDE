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
import { mixin, deepClone } from '../../../base/common/objects.js';
import { Emitter } from '../../../base/common/event.js';
import { IExtHostWorkspace } from './extHostWorkspace.js';
import { MainContext } from './extHost.protocol.js';
import { ConfigurationTarget as ExtHostConfigurationTarget } from './extHostTypes.js';
import { Configuration, ConfigurationChangeEvent } from '../../../platform/configuration/common/configurationModels.js';
import { OVERRIDE_PROPERTY_REGEX } from '../../../platform/configuration/common/configurationRegistry.js';
import { isObject } from '../../../base/common/types.js';
import { Barrier } from '../../../base/common/async.js';
import { createDecorator } from '../../../platform/instantiation/common/instantiation.js';
import { IExtHostRpcService } from './extHostRpcService.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { URI } from '../../../base/common/uri.js';
function lookUp(tree, key) {
    if (key) {
        const parts = key.split('.');
        let node = tree;
        for (let i = 0; node && i < parts.length; i++) {
            node = node[parts[i]];
        }
        return node;
    }
}
function isUri(thing) {
    return thing instanceof URI;
}
function isResourceLanguage(thing) {
    return thing
        && thing.uri instanceof URI
        && (thing.languageId && typeof thing.languageId === 'string');
}
function isLanguage(thing) {
    return thing
        && !thing.uri
        && (thing.languageId && typeof thing.languageId === 'string');
}
function isWorkspaceFolder(thing) {
    return thing
        && thing.uri instanceof URI
        && (!thing.name || typeof thing.name === 'string')
        && (!thing.index || typeof thing.index === 'number');
}
function scopeToOverrides(scope) {
    if (isUri(scope)) {
        return { resource: scope };
    }
    if (isResourceLanguage(scope)) {
        return { resource: scope.uri, overrideIdentifier: scope.languageId };
    }
    if (isLanguage(scope)) {
        return { overrideIdentifier: scope.languageId };
    }
    if (isWorkspaceFolder(scope)) {
        return { resource: scope.uri };
    }
    if (scope === null) {
        return { resource: null };
    }
    return undefined;
}
let ExtHostConfiguration = class ExtHostConfiguration {
    constructor(extHostRpc, extHostWorkspace, logService) {
        this._proxy = extHostRpc.getProxy(MainContext.MainThreadConfiguration);
        this._extHostWorkspace = extHostWorkspace;
        this._logService = logService;
        this._barrier = new Barrier();
        this._actual = null;
    }
    getConfigProvider() {
        return this._barrier.wait().then(_ => this._actual);
    }
    $initializeConfiguration(data) {
        this._actual = new ExtHostConfigProvider(this._proxy, this._extHostWorkspace, data, this._logService);
        this._barrier.open();
    }
    $acceptConfigurationChanged(data, change) {
        this.getConfigProvider().then(provider => provider.$acceptConfigurationChanged(data, change));
    }
};
ExtHostConfiguration = __decorate([
    __param(0, IExtHostRpcService),
    __param(1, IExtHostWorkspace),
    __param(2, ILogService)
], ExtHostConfiguration);
export { ExtHostConfiguration };
export class ExtHostConfigProvider {
    constructor(proxy, extHostWorkspace, data, logService) {
        this._onDidChangeConfiguration = new Emitter();
        this._proxy = proxy;
        this._logService = logService;
        this._extHostWorkspace = extHostWorkspace;
        this._configuration = Configuration.parse(data, logService);
        this._configurationScopes = this._toMap(data.configurationScopes);
    }
    get onDidChangeConfiguration() {
        return this._onDidChangeConfiguration && this._onDidChangeConfiguration.event;
    }
    $acceptConfigurationChanged(data, change) {
        const previous = { data: this._configuration.toData(), workspace: this._extHostWorkspace.workspace };
        this._configuration = Configuration.parse(data, this._logService);
        this._configurationScopes = this._toMap(data.configurationScopes);
        this._onDidChangeConfiguration.fire(this._toConfigurationChangeEvent(change, previous));
    }
    getConfiguration(section, scope, extensionDescription) {
        const overrides = scopeToOverrides(scope) || {};
        const config = this._toReadonlyValue(this._configuration.getValue(section, overrides, this._extHostWorkspace.workspace));
        if (section) {
            this._validateConfigurationAccess(section, overrides, extensionDescription?.identifier);
        }
        function parseConfigurationTarget(arg) {
            if (arg === undefined || arg === null) {
                return null;
            }
            if (typeof arg === 'boolean') {
                return arg ? 2 /* ConfigurationTarget.USER */ : 5 /* ConfigurationTarget.WORKSPACE */;
            }
            switch (arg) {
                case ExtHostConfigurationTarget.Global: return 2 /* ConfigurationTarget.USER */;
                case ExtHostConfigurationTarget.Workspace: return 5 /* ConfigurationTarget.WORKSPACE */;
                case ExtHostConfigurationTarget.WorkspaceFolder: return 6 /* ConfigurationTarget.WORKSPACE_FOLDER */;
            }
        }
        const result = {
            has(key) {
                return typeof lookUp(config, key) !== 'undefined';
            },
            get: (key, defaultValue) => {
                this._validateConfigurationAccess(section ? `${section}.${key}` : key, overrides, extensionDescription?.identifier);
                let result = lookUp(config, key);
                if (typeof result === 'undefined') {
                    result = defaultValue;
                }
                else {
                    let clonedConfig = undefined;
                    const cloneOnWriteProxy = (target, accessor) => {
                        if (isObject(target)) {
                            let clonedTarget = undefined;
                            const cloneTarget = () => {
                                clonedConfig = clonedConfig ? clonedConfig : deepClone(config);
                                clonedTarget = clonedTarget ? clonedTarget : lookUp(clonedConfig, accessor);
                            };
                            return new Proxy(target, {
                                get: (target, property) => {
                                    if (typeof property === 'string' && property.toLowerCase() === 'tojson') {
                                        cloneTarget();
                                        return () => clonedTarget;
                                    }
                                    if (clonedConfig) {
                                        clonedTarget = clonedTarget ? clonedTarget : lookUp(clonedConfig, accessor);
                                        return clonedTarget[property];
                                    }
                                    const result = target[property];
                                    if (typeof property === 'string') {
                                        return cloneOnWriteProxy(result, `${accessor}.${property}`);
                                    }
                                    return result;
                                },
                                set: (_target, property, value) => {
                                    cloneTarget();
                                    if (clonedTarget) {
                                        clonedTarget[property] = value;
                                    }
                                    return true;
                                },
                                deleteProperty: (_target, property) => {
                                    cloneTarget();
                                    if (clonedTarget) {
                                        delete clonedTarget[property];
                                    }
                                    return true;
                                },
                                defineProperty: (_target, property, descriptor) => {
                                    cloneTarget();
                                    if (clonedTarget) {
                                        Object.defineProperty(clonedTarget, property, descriptor);
                                    }
                                    return true;
                                }
                            });
                        }
                        if (Array.isArray(target)) {
                            return deepClone(target);
                        }
                        return target;
                    };
                    result = cloneOnWriteProxy(result, key);
                }
                return result;
            },
            update: (key, value, extHostConfigurationTarget, scopeToLanguage) => {
                key = section ? `${section}.${key}` : key;
                const target = parseConfigurationTarget(extHostConfigurationTarget);
                if (value !== undefined) {
                    return this._proxy.$updateConfigurationOption(target, key, value, overrides, scopeToLanguage);
                }
                else {
                    return this._proxy.$removeConfigurationOption(target, key, overrides, scopeToLanguage);
                }
            },
            inspect: (key) => {
                key = section ? `${section}.${key}` : key;
                const config = this._configuration.inspect(key, overrides, this._extHostWorkspace.workspace);
                if (config) {
                    return {
                        key,
                        defaultValue: deepClone(config.policy?.value ?? config.default?.value),
                        globalLocalValue: deepClone(config.userLocal?.value),
                        globalRemoteValue: deepClone(config.userRemote?.value),
                        globalValue: deepClone(config.user?.value ?? config.application?.value),
                        workspaceValue: deepClone(config.workspace?.value),
                        workspaceFolderValue: deepClone(config.workspaceFolder?.value),
                        defaultLanguageValue: deepClone(config.default?.override),
                        globalLocalLanguageValue: deepClone(config.userLocal?.override),
                        globalRemoteLanguageValue: deepClone(config.userRemote?.override),
                        globalLanguageValue: deepClone(config.user?.override ?? config.application?.override),
                        workspaceLanguageValue: deepClone(config.workspace?.override),
                        workspaceFolderLanguageValue: deepClone(config.workspaceFolder?.override),
                        languageIds: deepClone(config.overrideIdentifiers)
                    };
                }
                return undefined;
            }
        };
        if (typeof config === 'object') {
            mixin(result, config, false);
        }
        return Object.freeze(result);
    }
    _toReadonlyValue(result) {
        const readonlyProxy = (target) => {
            return isObject(target) ?
                new Proxy(target, {
                    get: (target, property) => readonlyProxy(target[property]),
                    set: (_target, property, _value) => { throw new Error(`TypeError: Cannot assign to read only property '${String(property)}' of object`); },
                    deleteProperty: (_target, property) => { throw new Error(`TypeError: Cannot delete read only property '${String(property)}' of object`); },
                    defineProperty: (_target, property) => { throw new Error(`TypeError: Cannot define property '${String(property)}' for a readonly object`); },
                    setPrototypeOf: (_target) => { throw new Error(`TypeError: Cannot set prototype for a readonly object`); },
                    isExtensible: () => false,
                    preventExtensions: () => true
                }) : target;
        };
        return readonlyProxy(result);
    }
    _validateConfigurationAccess(key, overrides, extensionId) {
        const scope = OVERRIDE_PROPERTY_REGEX.test(key) ? 5 /* ConfigurationScope.RESOURCE */ : this._configurationScopes.get(key);
        const extensionIdText = extensionId ? `[${extensionId.value}] ` : '';
        if (5 /* ConfigurationScope.RESOURCE */ === scope) {
            if (typeof overrides?.resource === 'undefined') {
                this._logService.warn(`${extensionIdText}Accessing a resource scoped configuration without providing a resource is not expected. To get the effective value for '${key}', provide the URI of a resource or 'null' for any resource.`);
            }
            return;
        }
        if (4 /* ConfigurationScope.WINDOW */ === scope) {
            if (overrides?.resource) {
                this._logService.warn(`${extensionIdText}Accessing a window scoped configuration for a resource is not expected. To associate '${key}' to a resource, define its scope to 'resource' in configuration contributions in 'package.json'.`);
            }
            return;
        }
    }
    _toConfigurationChangeEvent(change, previous) {
        const event = new ConfigurationChangeEvent(change, previous, this._configuration, this._extHostWorkspace.workspace, this._logService);
        return Object.freeze({
            affectsConfiguration: (section, scope) => event.affectsConfiguration(section, scopeToOverrides(scope))
        });
    }
    _toMap(scopes) {
        return scopes.reduce((result, scope) => { result.set(scope[0], scope[1]); return result; }, new Map());
    }
}
export const IExtHostConfiguration = createDecorator('IExtHostConfiguration');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdENvbmZpZ3VyYXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2NvbW1vbi9leHRIb3N0Q29uZmlndXJhdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ25FLE9BQU8sRUFBUyxPQUFPLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUUvRCxPQUFPLEVBQW9CLGlCQUFpQixFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDNUUsT0FBTyxFQUFtRixXQUFXLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUNySSxPQUFPLEVBQUUsbUJBQW1CLElBQUksMEJBQTBCLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUV0RixPQUFPLEVBQUUsYUFBYSxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDeEgsT0FBTyxFQUFzQix1QkFBdUIsRUFBRSxNQUFNLGlFQUFpRSxDQUFDO0FBQzlILE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUV6RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDeEQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQzVELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUVsRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFFbEQsU0FBUyxNQUFNLENBQUMsSUFBUyxFQUFFLEdBQVc7SUFDckMsSUFBSSxHQUFHLEVBQUUsQ0FBQztR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