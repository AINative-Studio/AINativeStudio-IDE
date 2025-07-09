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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdENvbmZpZ3VyYXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9jb21tb24vZXh0SG9zdENvbmZpZ3VyYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUNuRSxPQUFPLEVBQVMsT0FBTyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFFL0QsT0FBTyxFQUFvQixpQkFBaUIsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQzVFLE9BQU8sRUFBbUYsV0FBVyxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDckksT0FBTyxFQUFFLG1CQUFtQixJQUFJLDBCQUEwQixFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFFdEYsT0FBTyxFQUFFLGFBQWEsRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3hILE9BQU8sRUFBc0IsdUJBQXVCLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQztBQUM5SCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFFekQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3hELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUMxRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUM1RCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFFbEUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBRWxELFNBQVMsTUFBTSxDQUFDLElBQVMsRUFBRSxHQUFXO0lBQ3JDLElBQUksR0FBRyxFQUFFLENBQUM7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