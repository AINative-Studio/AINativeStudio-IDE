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
import { coalesce } from '../../../base/common/arrays.js';
import { Emitter, Event } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { deepClone, equals } from '../../../base/common/objects.js';
import { isEmptyObject, isString } from '../../../base/common/types.js';
import { ConfigurationModel } from './configurationModels.js';
import { Extensions } from './configurationRegistry.js';
import { ILogService, NullLogService } from '../../log/common/log.js';
import { IPolicyService } from '../../policy/common/policy.js';
import { Registry } from '../../registry/common/platform.js';
import { getErrorMessage } from '../../../base/common/errors.js';
import * as json from '../../../base/common/json.js';
export class DefaultConfiguration extends Disposable {
    get configurationModel() {
        return this._configurationModel;
    }
    constructor(logService) {
        super();
        this.logService = logService;
        this._onDidChangeConfiguration = this._register(new Emitter());
        this.onDidChangeConfiguration = this._onDidChangeConfiguration.event;
        this._configurationModel = ConfigurationModel.createEmptyModel(this.logService);
    }
    async initialize() {
        this.resetConfigurationModel();
        this._register(Registry.as(Extensions.Configuration).onDidUpdateConfiguration(({ properties, defaultsOverrides }) => this.onDidUpdateConfiguration(Array.from(properties), defaultsOverrides)));
        return this.configurationModel;
    }
    reload() {
        this.resetConfigurationModel();
        return this.configurationModel;
    }
    onDidUpdateConfiguration(properties, defaultsOverrides) {
        this.updateConfigurationModel(properties, Registry.as(Extensions.Configuration).getConfigurationProperties());
        this._onDidChangeConfiguration.fire({ defaults: this.configurationModel, properties });
    }
    getConfigurationDefaultOverrides() {
        return {};
    }
    resetConfigurationModel() {
        this._configurationModel = ConfigurationModel.createEmptyModel(this.logService);
        const properties = Registry.as(Extensions.Configuration).getConfigurationProperties();
        this.updateConfigurationModel(Object.keys(properties), properties);
    }
    updateConfigurationModel(properties, configurationProperties) {
        const configurationDefaultsOverrides = this.getConfigurationDefaultOverrides();
        for (const key of properties) {
            const defaultOverrideValue = configurationDefaultsOverrides[key];
            const propertySchema = configurationProperties[key];
            if (defaultOverrideValue !== undefined) {
                this._configurationModel.setValue(key, defaultOverrideValue);
            }
            else if (propertySchema) {
                this._configurationModel.setValue(key, deepClone(propertySchema.default));
            }
            else {
                this._configurationModel.removeValue(key);
            }
        }
    }
}
export class NullPolicyConfiguration {
    constructor() {
        this.onDidChangeConfiguration = Event.None;
        this.configurationModel = ConfigurationModel.createEmptyModel(new NullLogService());
    }
    async initialize() { return this.configurationModel; }
}
let PolicyConfiguration = class PolicyConfiguration extends Disposable {
    get configurationModel() { return this._configurationModel; }
    constructor(defaultConfiguration, policyService, logService) {
        super();
        this.defaultConfiguration = defaultConfiguration;
        this.policyService = policyService;
        this.logService = logService;
        this._onDidChangeConfiguration = this._register(new Emitter());
        this.onDidChangeConfiguration = this._onDidChangeConfiguration.event;
        this._configurationModel = ConfigurationModel.createEmptyModel(this.logService);
        this.configurationRegistry = Registry.as(Extensions.Configuration);
    }
    async initialize() {
        this.logService.trace('PolicyConfiguration#initialize');
        this.update(await this.updatePolicyDefinitions(this.defaultConfiguration.configurationModel.keys), false);
        this.update(await this.updatePolicyDefinitions(Object.keys(this.configurationRegistry.getExcludedConfigurationProperties())), false);
        this._register(this.policyService.onDidChange(policyNames => this.onDidChangePolicies(policyNames)));
        this._register(this.defaultConfiguration.onDidChangeConfiguration(async ({ properties }) => this.update(await this.updatePolicyDefinitions(properties), true)));
        return this._configurationModel;
    }
    async updatePolicyDefinitions(properties) {
        this.logService.trace('PolicyConfiguration#updatePolicyDefinitions', properties);
        const policyDefinitions = {};
        const keys = [];
        const configurationProperties = this.configurationRegistry.getConfigurationProperties();
        const excludedConfigurationProperties = this.configurationRegistry.getExcludedConfigurationProperties();
        for (const key of properties) {
            const config = configurationProperties[key] ?? excludedConfigurationProperties[key];
            if (!config) {
                // Config is removed. So add it to the list if in case it was registered as policy before
                keys.push(key);
                continue;
            }
            if (config.policy) {
                if (config.type !== 'string' && config.type !== 'number' && config.type !== 'array' && config.type !== 'object' && config.type !== 'boolean') {
                    this.logService.warn(`Policy ${config.policy.name} has unsupported type ${config.type}`);
                    continue;
                }
                const { defaultValue, previewFeature } = config.policy;
                keys.push(key);
                policyDefinitions[config.policy.name] = {
                    type: config.type === 'number' ? 'number' : config.type === 'boolean' ? 'boolean' : 'string',
                    previewFeature,
                    defaultValue,
                };
            }
        }
        if (!isEmptyObject(policyDefinitions)) {
            await this.policyService.updatePolicyDefinitions(policyDefinitions);
        }
        return keys;
    }
    onDidChangePolicies(policyNames) {
        this.logService.trace('PolicyConfiguration#onDidChangePolicies', policyNames);
        const policyConfigurations = this.configurationRegistry.getPolicyConfigurations();
        const keys = coalesce(policyNames.map(policyName => policyConfigurations.get(policyName)));
        this.update(keys, true);
    }
    update(keys, trigger) {
        this.logService.trace('PolicyConfiguration#update', keys);
        const configurationProperties = this.configurationRegistry.getConfigurationProperties();
        const excludedConfigurationProperties = this.configurationRegistry.getExcludedConfigurationProperties();
        const changed = [];
        const wasEmpty = this._configurationModel.isEmpty();
        for (const key of keys) {
            const proprety = configurationProperties[key] ?? excludedConfigurationProperties[key];
            const policyName = proprety?.policy?.name;
            if (policyName) {
                let policyValue = this.policyService.getPolicyValue(policyName);
                if (isString(policyValue) && proprety.type !== 'string') {
                    try {
                        policyValue = this.parse(policyValue);
                    }
                    catch (e) {
                        this.logService.error(`Error parsing policy value ${policyName}:`, getErrorMessage(e));
                        continue;
                    }
                }
                if (wasEmpty ? policyValue !== undefined : !equals(this._configurationModel.getValue(key), policyValue)) {
                    changed.push([key, policyValue]);
                }
            }
            else {
                if (this._configurationModel.getValue(key) !== undefined) {
                    changed.push([key, undefined]);
                }
            }
        }
        if (changed.length) {
            this.logService.trace('PolicyConfiguration#changed', changed);
            const old = this._configurationModel;
            this._configurationModel = ConfigurationModel.createEmptyModel(this.logService);
            for (const key of old.keys) {
                this._configurationModel.setValue(key, old.getValue(key));
            }
            for (const [key, policyValue] of changed) {
                if (policyValue === undefined) {
                    this._configurationModel.removeValue(key);
                }
                else {
                    this._configurationModel.setValue(key, policyValue);
                }
            }
            if (trigger) {
                this._onDidChangeConfiguration.fire(this._configurationModel);
            }
        }
    }
    parse(content) {
        let raw = {};
        let currentProperty = null;
        let currentParent = [];
        const previousParents = [];
        const parseErrors = [];
        function onValue(value) {
            if (Array.isArray(currentParent)) {
                currentParent.push(value);
            }
            else if (currentProperty !== null) {
                if (currentParent[currentProperty] !== undefined) {
                    throw new Error(`Duplicate property found: ${currentProperty}`);
                }
                currentParent[currentProperty] = value;
            }
        }
        const visitor = {
            onObjectBegin: () => {
                const object = {};
                onValue(object);
                previousParents.push(currentParent);
                currentParent = object;
                currentProperty = null;
            },
            onObjectProperty: (name) => {
                currentProperty = name;
            },
            onObjectEnd: () => {
                currentParent = previousParents.pop();
            },
            onArrayBegin: () => {
                const array = [];
                onValue(array);
                previousParents.push(currentParent);
                currentParent = array;
                currentProperty = null;
            },
            onArrayEnd: () => {
                currentParent = previousParents.pop();
            },
            onLiteralValue: onValue,
            onError: (error, offset, length) => {
                parseErrors.push({ error, offset, length });
            }
        };
        if (content) {
            json.visit(content, visitor);
            raw = currentParent[0] || {};
        }
        if (parseErrors.length > 0) {
            throw new Error(parseErrors.map(e => getErrorMessage(e.error)).join('\n'));
        }
        return raw;
    }
};
PolicyConfiguration = __decorate([
    __param(1, IPolicyService),
    __param(2, ILogService)
], PolicyConfiguration);
export { PolicyConfiguration };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlndXJhdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vY29uZmlndXJhdGlvbi9jb21tb24vY29uZmlndXJhdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBRTFELE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDL0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDcEUsT0FBTyxFQUFFLGFBQWEsRUFBRSxRQUFRLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUN4RSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUM5RCxPQUFPLEVBQUUsVUFBVSxFQUFrRSxNQUFNLDRCQUE0QixDQUFDO0FBQ3hILE9BQU8sRUFBRSxXQUFXLEVBQUUsY0FBYyxFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDdEUsT0FBTyxFQUFFLGNBQWMsRUFBb0IsTUFBTSwrQkFBK0IsQ0FBQztBQUNqRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDN0QsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ2pFLE9BQU8sS0FBSyxJQUFJLE1BQU0sOEJBQThCLENBQUM7QUFHckQsTUFBTSxPQUFPLG9CQUFxQixTQUFRLFVBQVU7SUFNbkQsSUFBSSxrQkFBa0I7UUFDckIsT0FBTyxJQUFJLENBQUMsbUJBQW1CLENBQUM7SUFDakMsQ0FBQztJQUVELFlBQTZCLFVBQXVCO1FB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