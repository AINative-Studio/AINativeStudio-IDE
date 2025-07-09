/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { distinct } from '../../../base/common/arrays.js';
import { Emitter } from '../../../base/common/event.js';
import * as types from '../../../base/common/types.js';
import * as nls from '../../../nls.js';
import { getLanguageTagSettingPlainKey } from './configuration.js';
import { Extensions as JSONExtensions } from '../../jsonschemas/common/jsonContributionRegistry.js';
import { Registry } from '../../registry/common/platform.js';
export var EditPresentationTypes;
(function (EditPresentationTypes) {
    EditPresentationTypes["Multiline"] = "multilineText";
    EditPresentationTypes["Singleline"] = "singlelineText";
})(EditPresentationTypes || (EditPresentationTypes = {}));
export const Extensions = {
    Configuration: 'base.contributions.configuration'
};
export var ConfigurationScope;
(function (ConfigurationScope) {
    /**
     * Application specific configuration, which can be configured only in default profile user settings.
     */
    ConfigurationScope[ConfigurationScope["APPLICATION"] = 1] = "APPLICATION";
    /**
     * Machine specific configuration, which can be configured only in local and remote user settings.
     */
    ConfigurationScope[ConfigurationScope["MACHINE"] = 2] = "MACHINE";
    /**
     * An application machine specific configuration, which can be configured only in default profile user settings and remote user settings.
     */
    ConfigurationScope[ConfigurationScope["APPLICATION_MACHINE"] = 3] = "APPLICATION_MACHINE";
    /**
     * Window specific configuration, which can be configured in the user or workspace settings.
     */
    ConfigurationScope[ConfigurationScope["WINDOW"] = 4] = "WINDOW";
    /**
     * Resource specific configuration, which can be configured in the user, workspace or folder settings.
     */
    ConfigurationScope[ConfigurationScope["RESOURCE"] = 5] = "RESOURCE";
    /**
     * Resource specific configuration that can be configured in language specific settings
     */
    ConfigurationScope[ConfigurationScope["LANGUAGE_OVERRIDABLE"] = 6] = "LANGUAGE_OVERRIDABLE";
    /**
     * Machine specific configuration that can also be configured in workspace or folder settings.
     */
    ConfigurationScope[ConfigurationScope["MACHINE_OVERRIDABLE"] = 7] = "MACHINE_OVERRIDABLE";
})(ConfigurationScope || (ConfigurationScope = {}));
export const allSettings = { properties: {}, patternProperties: {} };
export const applicationSettings = { properties: {}, patternProperties: {} };
export const applicationMachineSettings = { properties: {}, patternProperties: {} };
export const machineSettings = { properties: {}, patternProperties: {} };
export const machineOverridableSettings = { properties: {}, patternProperties: {} };
export const windowSettings = { properties: {}, patternProperties: {} };
export const resourceSettings = { properties: {}, patternProperties: {} };
export const resourceLanguageSettingsSchemaId = 'vscode://schemas/settings/resourceLanguage';
export const configurationDefaultsSchemaId = 'vscode://schemas/settings/configurationDefaults';
const contributionRegistry = Registry.as(JSONExtensions.JSONContribution);
class ConfigurationRegistry {
    constructor() {
        this.registeredConfigurationDefaults = [];
        this.overrideIdentifiers = new Set();
        this._onDidSchemaChange = new Emitter();
        this.onDidSchemaChange = this._onDidSchemaChange.event;
        this._onDidUpdateConfiguration = new Emitter();
        this.onDidUpdateConfiguration = this._onDidUpdateConfiguration.event;
        this.configurationDefaultsOverrides = new Map();
        this.defaultLanguageConfigurationOverridesNode = {
            id: 'defaultOverrides',
            title: nls.localize('defaultLanguageConfigurationOverrides.title', "Default Language Configuration Overrides"),
            properties: {}
        };
        this.configurationContributors = [this.defaultLanguageConfigurationOverridesNode];
        this.resourceLanguageSettingsSchema = {
            properties: {},
            patternProperties: {},
            additionalProperties: true,
            allowTrailingCommas: true,
            allowComments: true
        };
        this.configurationProperties = {};
        this.policyConfigurations = new Map();
        this.excludedConfigurationProperties = {};
        contributionRegistry.registerSchema(resourceLanguageSettingsSchemaId, this.resourceLanguageSettingsSchema);
        this.registerOverridePropertyPatternKey();
    }
    registerConfiguration(configuration, validate = true) {
        this.registerConfigurations([configuration], validate);
        return configuration;
    }
    registerConfigurations(configurations, validate = true) {
        const properties = new Set();
        this.doRegisterConfigurations(configurations, validate, properties);
        contributionRegistry.registerSchema(resourceLanguageSettingsSchemaId, this.resourceLanguageSettingsSchema);
        this._onDidSchemaChange.fire();
        this._onDidUpdateConfiguration.fire({ properties });
    }
    deregisterConfigurations(configurations) {
        const properties = new Set();
        this.doDeregisterConfigurations(configurations, properties);
        contributionRegistry.registerSchema(resourceLanguageSettingsSchemaId, this.resourceLanguageSettingsSchema);
        this._onDidSchemaChange.fire();
        this._onDidUpdateConfiguration.fire({ properties });
    }
    updateConfigurations({ add, remove }) {
        const properties = new Set();
        this.doDeregisterConfigurations(remove, properties);
        this.doRegisterConfigurations(add, false, properties);
        contributionRegistry.registerSchema(resourceLanguageSettingsSchemaId, this.resourceLanguageSettingsSchema);
        this._onDidSchemaChange.fire();
        this._onDidUpdateConfiguration.fire({ properties });
    }
    registerDefaultConfigurations(configurationDefaults) {
        const properties = new Set();
        this.doRegisterDefaultConfigurations(configurationDefaults, properties);
        this._onDidSchemaChange.fire();
        this._onDidUpdateConfiguration.fire({ properties, defaultsOverrides: true });
    }
    doRegisterDefaultConfigurations(configurationDefaults, bucket) {
        this.registeredConfigurationDefaults.push(...configurationDefaults);
        const overrideIdentifiers = [];
        for (const { overrides, source } of configurationDefaults) {
            for (const key in overrides) {
                bucket.add(key);
                const configurationDefaultOverridesForKey = this.configurationDefaultsOverrides.get(key)
                    ?? this.configurationDefaultsOverrides.set(key, { configurationDefaultOverrides: [] }).get(key);
                const value = overrides[key];
                configurationDefaultOverridesForKey.configurationDefaultOverrides.push({ value, source });
                // Configuration defaults for Override Identifiers
                if (OVERRIDE_PROPERTY_REGEX.test(key)) {
                    const newDefaultOverride = this.mergeDefaultConfigurationsForOverrideIdentifier(key, value, source, configurationDefaultOverridesForKey.configurationDefaultOverrideValue);
                    if (!newDefaultOverride) {
                        continue;
                    }
                    configurationDefaultOverridesForKey.configurationDefaultOverrideValue = newDefaultOverride;
                    this.updateDefaultOverrideProperty(key, newDefaultOverride, source);
                    overrideIdentifiers.push(...overrideIdentifiersFromKey(key));
                }
                // Configuration defaults for Configuration Properties
                else {
                    const newDefaultOverride = this.mergeDefaultConfigurationsForConfigurationProperty(key, value, source, configurationDefaultOverridesForKey.configurationDefaultOverrideValue);
                    if (!newDefaultOverride) {
                        continue;
                    }
                    configurationDefaultOverridesForKey.configurationDefaultOverrideValue = newDefaultOverride;
                    const property = this.configurationProperties[key];
                    if (property) {
                        this.updatePropertyDefaultValue(key, property);
                        this.updateSchema(key, property);
                    }
                }
            }
        }
        this.doRegisterOverrideIdentifiers(overrideIdentifiers);
    }
    deregisterDefaultConfigurations(defaultConfigurations) {
        const properties = new Set();
        this.doDeregisterDefaultConfigurations(defaultConfigurations, properties);
        this._onDidSchemaChange.fire();
        this._onDidUpdateConfiguration.fire({ properties, defaultsOverrides: true });
    }
    doDeregisterDefaultConfigurations(defaultConfigurations, bucket) {
        for (const defaultConfiguration of defaultConfigurations) {
            const index = this.registeredConfigurationDefaults.indexOf(defaultConfiguration);
            if (index !== -1) {
                this.registeredConfigurationDefaults.splice(index, 1);
            }
        }
        for (const { overrides, source } of defaultConfigurations) {
            for (const key in overrides) {
                const configurationDefaultOverridesForKey = this.configurationDefaultsOverrides.get(key);
                if (!configurationDefaultOverridesForKey) {
                    continue;
                }
                const index = configurationDefaultOverridesForKey.configurationDefaultOverrides
                    .findIndex(configurationDefaultOverride => source ? configurationDefaultOverride.source?.id === source.id : configurationDefaultOverride.value === overrides[key]);
                if (index === -1) {
                    continue;
                }
                configurationDefaultOverridesForKey.configurationDefaultOverrides.splice(index, 1);
                if (configurationDefaultOverridesForKey.configurationDefaultOverrides.length === 0) {
                    this.configurationDefaultsOverrides.delete(key);
                }
                if (OVERRIDE_PROPERTY_REGEX.test(key)) {
                    let configurationDefaultOverrideValue;
                    for (const configurationDefaultOverride of configurationDefaultOverridesForKey.configurationDefaultOverrides) {
                        configurationDefaultOverrideValue = this.mergeDefaultConfigurationsForOverrideIdentifier(key, configurationDefaultOverride.value, configurationDefaultOverride.source, configurationDefaultOverrideValue);
                    }
                    if (configurationDefaultOverrideValue && !types.isEmptyObject(configurationDefaultOverrideValue.value)) {
                        configurationDefaultOverridesForKey.configurationDefaultOverrideValue = configurationDefaultOverrideValue;
                        this.updateDefaultOverrideProperty(key, configurationDefaultOverrideValue, source);
                    }
                    else {
                        this.configurationDefaultsOverrides.delete(key);
                        delete this.configurationProperties[key];
                        delete this.defaultLanguageConfigurationOverridesNode.properties[key];
                    }
                }
                else {
                    let configurationDefaultOverrideValue;
                    for (const configurationDefaultOverride of configurationDefaultOverridesForKey.configurationDefaultOverrides) {
                        configurationDefaultOverrideValue = this.mergeDefaultConfigurationsForConfigurationProperty(key, configurationDefaultOverride.value, configurationDefaultOverride.source, configurationDefaultOverrideValue);
                    }
                    configurationDefaultOverridesForKey.configurationDefaultOverrideValue = configurationDefaultOverrideValue;
                    const property = this.configurationProperties[key];
                    if (property) {
                        this.updatePropertyDefaultValue(key, property);
                        this.updateSchema(key, property);
                    }
                }
                bucket.add(key);
            }
        }
        this.updateOverridePropertyPatternKey();
    }
    updateDefaultOverrideProperty(key, newDefaultOverride, source) {
        const property = {
            type: 'object',
            default: newDefaultOverride.value,
            description: nls.localize('defaultLanguageConfiguration.description', "Configure settings to be overridden for the {0} language.", getLanguageTagSettingPlainKey(key)),
            $ref: resourceLanguageSettingsSchemaId,
            defaultDefaultValue: newDefaultOverride.value,
            source,
            defaultValueSource: source
        };
        this.configurationProperties[key] = property;
        this.defaultLanguageConfigurationOverridesNode.properties[key] = property;
    }
    mergeDefaultConfigurationsForOverrideIdentifier(overrideIdentifier, configurationValueObject, valueSource, existingDefaultOverride) {
        const defaultValue = existingDefaultOverride?.value || {};
        const source = existingDefaultOverride?.source ?? new Map();
        // This should not happen
        if (!(source instanceof Map)) {
            console.error('objectConfigurationSources is not a Map');
            return undefined;
        }
        for (const propertyKey of Object.keys(configurationValueObject)) {
            const propertyDefaultValue = configurationValueObject[propertyKey];
            const isObjectSetting = types.isObject(propertyDefaultValue) &&
                (types.isUndefined(defaultValue[propertyKey]) || types.isObject(defaultValue[propertyKey]));
            // If the default value is an object, merge the objects and store the source of each keys
            if (isObjectSetting) {
                defaultValue[propertyKey] = { ...(defaultValue[propertyKey] ?? {}), ...propertyDefaultValue };
                // Track the source of each value in the object
                if (valueSource) {
                    for (const objectKey in propertyDefaultValue) {
                        source.set(`${propertyKey}.${objectKey}`, valueSource);
                    }
                }
            }
            // Primitive values are overridden
            else {
                defaultValue[propertyKey] = propertyDefaultValue;
                if (valueSource) {
                    source.set(propertyKey, valueSource);
                }
                else {
                    source.delete(propertyKey);
                }
            }
        }
        return { value: defaultValue, source };
    }
    mergeDefaultConfigurationsForConfigurationProperty(propertyKey, value, valuesSource, existingDefaultOverride) {
        const property = this.configurationProperties[propertyKey];
        const existingDefaultValue = existingDefaultOverride?.value ?? property?.defaultDefaultValue;
        let source = valuesSource;
        const isObjectSetting = types.isObject(value) &&
            (property !== undefined && property.type === 'object' ||
                property === undefined && (types.isUndefined(existingDefaultValue) || types.isObject(existingDefaultValue)));
        // If the default value is an object, merge the objects and store the source of each keys
        if (isObjectSetting) {
            source = existingDefaultOverride?.source ?? new Map();
            // This should not happen
            if (!(source instanceof Map)) {
                console.error('defaultValueSource is not a Map');
                return undefined;
            }
            for (const objectKey in value) {
                if (valuesSource) {
                    source.set(`${propertyKey}.${objectKey}`, valuesSource);
                }
            }
            value = { ...(types.isObject(existingDefaultValue) ? existingDefaultValue : {}), ...value };
        }
        return { value, source };
    }
    deltaConfiguration(delta) {
        // defaults: remove
        let defaultsOverrides = false;
        const properties = new Set();
        if (delta.removedDefaults) {
            this.doDeregisterDefaultConfigurations(delta.removedDefaults, properties);
            defaultsOverrides = true;
        }
        // defaults: add
        if (delta.addedDefaults) {
            this.doRegisterDefaultConfigurations(delta.addedDefaults, properties);
            defaultsOverrides = true;
        }
        // configurations: remove
        if (delta.removedConfigurations) {
            this.doDeregisterConfigurations(delta.removedConfigurations, properties);
        }
        // configurations: add
        if (delta.addedConfigurations) {
            this.doRegisterConfigurations(delta.addedConfigurations, false, properties);
        }
        this._onDidSchemaChange.fire();
        this._onDidUpdateConfiguration.fire({ properties, defaultsOverrides });
    }
    notifyConfigurationSchemaUpdated(...configurations) {
        this._onDidSchemaChange.fire();
    }
    registerOverrideIdentifiers(overrideIdentifiers) {
        this.doRegisterOverrideIdentifiers(overrideIdentifiers);
        this._onDidSchemaChange.fire();
    }
    doRegisterOverrideIdentifiers(overrideIdentifiers) {
        for (const overrideIdentifier of overrideIdentifiers) {
            this.overrideIdentifiers.add(overrideIdentifier);
        }
        this.updateOverridePropertyPatternKey();
    }
    doRegisterConfigurations(configurations, validate, bucket) {
        configurations.forEach(configuration => {
            this.validateAndRegisterProperties(configuration, validate, configuration.extensionInfo, configuration.restrictedProperties, undefined, bucket);
            this.configurationContributors.push(configuration);
            this.registerJSONConfiguration(configuration);
        });
    }
    doDeregisterConfigurations(configurations, bucket) {
        const deregisterConfiguration = (configuration) => {
            if (configuration.properties) {
                for (const key in configuration.properties) {
                    bucket.add(key);
                    const property = this.configurationProperties[key];
                    if (property?.policy?.name) {
                        this.policyConfigurations.delete(property.policy.name);
                    }
                    delete this.configurationProperties[key];
                    this.removeFromSchema(key, configuration.properties[key]);
                }
            }
            configuration.allOf?.forEach(node => deregisterConfiguration(node));
        };
        for (const configuration of configurations) {
            deregisterConfiguration(configuration);
            const index = this.configurationContributors.indexOf(configuration);
            if (index !== -1) {
                this.configurationContributors.splice(index, 1);
            }
        }
    }
    validateAndRegisterProperties(configuration, validate = true, extensionInfo, restrictedProperties, scope = 4 /* ConfigurationScope.WINDOW */, bucket) {
        scope = types.isUndefinedOrNull(configuration.scope) ? scope : configuration.scope;
        const properties = configuration.properties;
        if (properties) {
            for (const key in properties) {
                const property = properties[key];
                if (validate && validateProperty(key, property)) {
                    delete properties[key];
                    continue;
                }
                property.source = extensionInfo;
                // update default value
                property.defaultDefaultValue = properties[key].default;
                this.updatePropertyDefaultValue(key, property);
                // update scope
                if (OVERRIDE_PROPERTY_REGEX.test(key)) {
                    property.scope = undefined; // No scope for overridable properties `[${identifier}]`
                }
                else {
                    property.scope = types.isUndefinedOrNull(property.scope) ? scope : property.scope;
                    property.restricted = types.isUndefinedOrNull(property.restricted) ? !!restrictedProperties?.includes(key) : property.restricted;
                }
                const excluded = properties[key].hasOwnProperty('included') && !properties[key].included;
                const policyName = properties[key].policy?.name;
                if (excluded) {
                    this.excludedConfigurationProperties[key] = properties[key];
                    if (policyName) {
                        this.policyConfigurations.set(policyName, key);
                        bucket.add(key);
                    }
                    delete properties[key];
                }
                else {
                    bucket.add(key);
                    if (policyName) {
                        this.policyConfigurations.set(policyName, key);
                    }
                    this.configurationProperties[key] = properties[key];
                    if (!properties[key].deprecationMessage && properties[key].markdownDeprecationMessage) {
                        // If not set, default deprecationMessage to the markdown source
                        properties[key].deprecationMessage = properties[key].markdownDeprecationMessage;
                    }
                }
            }
        }
        const subNodes = configuration.allOf;
        if (subNodes) {
            for (const node of subNodes) {
                this.validateAndRegisterProperties(node, validate, extensionInfo, restrictedProperties, scope, bucket);
            }
        }
    }
    // TODO: @sandy081 - Remove this method and include required info in getConfigurationProperties
    getConfigurations() {
        return this.configurationContributors;
    }
    getConfigurationProperties() {
        return this.configurationProperties;
    }
    getPolicyConfigurations() {
        return this.policyConfigurations;
    }
    getExcludedConfigurationProperties() {
        return this.excludedConfigurationProperties;
    }
    getRegisteredDefaultConfigurations() {
        return [...this.registeredConfigurationDefaults];
    }
    getConfigurationDefaultsOverrides() {
        const configurationDefaultsOverrides = new Map();
        for (const [key, value] of this.configurationDefaultsOverrides) {
            if (value.configurationDefaultOverrideValue) {
                configurationDefaultsOverrides.set(key, value.configurationDefaultOverrideValue);
            }
        }
        return configurationDefaultsOverrides;
    }
    registerJSONConfiguration(configuration) {
        const register = (configuration) => {
            const properties = configuration.properties;
            if (properties) {
                for (const key in properties) {
                    this.updateSchema(key, properties[key]);
                }
            }
            const subNodes = configuration.allOf;
            subNodes?.forEach(register);
        };
        register(configuration);
    }
    updateSchema(key, property) {
        allSettings.properties[key] = property;
        switch (property.scope) {
            case 1 /* ConfigurationScope.APPLICATION */:
                applicationSettings.properties[key] = property;
                break;
            case 2 /* ConfigurationScope.MACHINE */:
                machineSettings.properties[key] = property;
                break;
            case 3 /* ConfigurationScope.APPLICATION_MACHINE */:
                applicationMachineSettings.properties[key] = property;
                break;
            case 7 /* ConfigurationScope.MACHINE_OVERRIDABLE */:
                machineOverridableSettings.properties[key] = property;
                break;
            case 4 /* ConfigurationScope.WINDOW */:
                windowSettings.properties[key] = property;
                break;
            case 5 /* ConfigurationScope.RESOURCE */:
                resourceSettings.properties[key] = property;
                break;
            case 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */:
                resourceSettings.properties[key] = property;
                this.resourceLanguageSettingsSchema.properties[key] = property;
                break;
        }
    }
    removeFromSchema(key, property) {
        delete allSettings.properties[key];
        switch (property.scope) {
            case 1 /* ConfigurationScope.APPLICATION */:
                delete applicationSettings.properties[key];
                break;
            case 2 /* ConfigurationScope.MACHINE */:
                delete machineSettings.properties[key];
                break;
            case 3 /* ConfigurationScope.APPLICATION_MACHINE */:
                delete applicationMachineSettings.properties[key];
                break;
            case 7 /* ConfigurationScope.MACHINE_OVERRIDABLE */:
                delete machineOverridableSettings.properties[key];
                break;
            case 4 /* ConfigurationScope.WINDOW */:
                delete windowSettings.properties[key];
                break;
            case 5 /* ConfigurationScope.RESOURCE */:
            case 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */:
                delete resourceSettings.properties[key];
                delete this.resourceLanguageSettingsSchema.properties[key];
                break;
        }
    }
    updateOverridePropertyPatternKey() {
        for (const overrideIdentifier of this.overrideIdentifiers.values()) {
            const overrideIdentifierProperty = `[${overrideIdentifier}]`;
            const resourceLanguagePropertiesSchema = {
                type: 'object',
                description: nls.localize('overrideSettings.defaultDescription', "Configure editor settings to be overridden for a language."),
                errorMessage: nls.localize('overrideSettings.errorMessage', "This setting does not support per-language configuration."),
                $ref: resourceLanguageSettingsSchemaId,
            };
            this.updatePropertyDefaultValue(overrideIdentifierProperty, resourceLanguagePropertiesSchema);
            allSettings.properties[overrideIdentifierProperty] = resourceLanguagePropertiesSchema;
            applicationSettings.properties[overrideIdentifierProperty] = resourceLanguagePropertiesSchema;
            applicationMachineSettings.properties[overrideIdentifierProperty] = resourceLanguagePropertiesSchema;
            machineSettings.properties[overrideIdentifierProperty] = resourceLanguagePropertiesSchema;
            machineOverridableSettings.properties[overrideIdentifierProperty] = resourceLanguagePropertiesSchema;
            windowSettings.properties[overrideIdentifierProperty] = resourceLanguagePropertiesSchema;
            resourceSettings.properties[overrideIdentifierProperty] = resourceLanguagePropertiesSchema;
        }
    }
    registerOverridePropertyPatternKey() {
        const resourceLanguagePropertiesSchema = {
            type: 'object',
            description: nls.localize('overrideSettings.defaultDescription', "Configure editor settings to be overridden for a language."),
            errorMessage: nls.localize('overrideSettings.errorMessage', "This setting does not support per-language configuration."),
            $ref: resourceLanguageSettingsSchemaId,
        };
        allSettings.patternProperties[OVERRIDE_PROPERTY_PATTERN] = resourceLanguagePropertiesSchema;
        applicationSettings.patternProperties[OVERRIDE_PROPERTY_PATTERN] = resourceLanguagePropertiesSchema;
        applicationMachineSettings.patternProperties[OVERRIDE_PROPERTY_PATTERN] = resourceLanguagePropertiesSchema;
        machineSettings.patternProperties[OVERRIDE_PROPERTY_PATTERN] = resourceLanguagePropertiesSchema;
        machineOverridableSettings.patternProperties[OVERRIDE_PROPERTY_PATTERN] = resourceLanguagePropertiesSchema;
        windowSettings.patternProperties[OVERRIDE_PROPERTY_PATTERN] = resourceLanguagePropertiesSchema;
        resourceSettings.patternProperties[OVERRIDE_PROPERTY_PATTERN] = resourceLanguagePropertiesSchema;
        this._onDidSchemaChange.fire();
    }
    updatePropertyDefaultValue(key, property) {
        const configurationdefaultOverride = this.configurationDefaultsOverrides.get(key)?.configurationDefaultOverrideValue;
        let defaultValue = undefined;
        let defaultSource = undefined;
        if (configurationdefaultOverride
            && (!property.disallowConfigurationDefault || !configurationdefaultOverride.source) // Prevent overriding the default value if the property is disallowed to be overridden by configuration defaults from extensions
        ) {
            defaultValue = configurationdefaultOverride.value;
            defaultSource = configurationdefaultOverride.source;
        }
        if (types.isUndefined(defaultValue)) {
            defaultValue = property.defaultDefaultValue;
            defaultSource = undefined;
        }
        if (types.isUndefined(defaultValue)) {
            defaultValue = getDefaultValue(property.type);
        }
        property.default = defaultValue;
        property.defaultValueSource = defaultSource;
    }
}
const OVERRIDE_IDENTIFIER_PATTERN = `\\[([^\\]]+)\\]`;
const OVERRIDE_IDENTIFIER_REGEX = new RegExp(OVERRIDE_IDENTIFIER_PATTERN, 'g');
export const OVERRIDE_PROPERTY_PATTERN = `^(${OVERRIDE_IDENTIFIER_PATTERN})+$`;
export const OVERRIDE_PROPERTY_REGEX = new RegExp(OVERRIDE_PROPERTY_PATTERN);
export function overrideIdentifiersFromKey(key) {
    const identifiers = [];
    if (OVERRIDE_PROPERTY_REGEX.test(key)) {
        let matches = OVERRIDE_IDENTIFIER_REGEX.exec(key);
        while (matches?.length) {
            const identifier = matches[1].trim();
            if (identifier) {
                identifiers.push(identifier);
            }
            matches = OVERRIDE_IDENTIFIER_REGEX.exec(key);
        }
    }
    return distinct(identifiers);
}
export function keyFromOverrideIdentifiers(overrideIdentifiers) {
    return overrideIdentifiers.reduce((result, overrideIdentifier) => `${result}[${overrideIdentifier}]`, '');
}
export function getDefaultValue(type) {
    const t = Array.isArray(type) ? type[0] : type;
    switch (t) {
        case 'boolean':
            return false;
        case 'integer':
        case 'number':
            return 0;
        case 'string':
            return '';
        case 'array':
            return [];
        case 'object':
            return {};
        default:
            return null;
    }
}
const configurationRegistry = new ConfigurationRegistry();
Registry.add(Extensions.Configuration, configurationRegistry);
export function validateProperty(property, schema) {
    if (!property.trim()) {
        return nls.localize('config.property.empty', "Cannot register an empty property");
    }
    if (OVERRIDE_PROPERTY_REGEX.test(property)) {
        return nls.localize('config.property.languageDefault', "Cannot register '{0}'. This matches property pattern '\\\\[.*\\\\]$' for describing language specific editor settings. Use 'configurationDefaults' contribution.", property);
    }
    if (configurationRegistry.getConfigurationProperties()[property] !== undefined) {
        return nls.localize('config.property.duplicate', "Cannot register '{0}'. This property is already registered.", property);
    }
    if (schema.policy?.name && configurationRegistry.getPolicyConfigurations().get(schema.policy?.name) !== undefined) {
        return nls.localize('config.policy.duplicate', "Cannot register '{0}'. The associated policy {1} is already registered with {2}.", property, schema.policy?.name, configurationRegistry.getPolicyConfigurations().get(schema.policy?.name));
    }
    return null;
}
export function getScopes() {
    const scopes = [];
    const configurationProperties = configurationRegistry.getConfigurationProperties();
    for (const key of Object.keys(configurationProperties)) {
        scopes.push([key, configurationProperties[key].scope]);
    }
    scopes.push(['launch', 5 /* ConfigurationScope.RESOURCE */]);
    scopes.push(['task', 5 /* ConfigurationScope.RESOURCE */]);
    return scopes;
}
export function getAllConfigurationProperties(configurationNode) {
    const result = {};
    for (const configuration of configurationNode) {
        const properties = configuration.properties;
        if (types.isObject(properties)) {
            for (const key in properties) {
                result[key] = properties[key];
            }
        }
        if (configuration.allOf) {
            Object.assign(result, getAllConfigurationProperties(configuration.allOf));
        }
    }
    return result;
}
export function parseScope(scope) {
    switch (scope) {
        case 'application':
            return 1 /* ConfigurationScope.APPLICATION */;
        case 'machine':
            return 2 /* ConfigurationScope.MACHINE */;
        case 'resource':
            return 5 /* ConfigurationScope.RESOURCE */;
        case 'machine-overridable':
            return 7 /* ConfigurationScope.MACHINE_OVERRIDABLE */;
        case 'language-overridable':
            return 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */;
        default:
            return 4 /* ConfigurationScope.WINDOW */;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlndXJhdGlvblJlZ2lzdHJ5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2NvbmZpZ3VyYXRpb24vY29tbW9uL2NvbmZpZ3VyYXRpb25SZWdpc3RyeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFFMUQsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLCtCQUErQixDQUFDO0FBRS9ELE9BQU8sS0FBSyxLQUFLLE1BQU0sK0JBQStCLENBQUM7QUFDdkQsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQkFBaUIsQ0FBQztBQUN2QyxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUNuRSxPQUFPLEVBQUUsVUFBVSxJQUFJLGNBQWMsRUFBNkIsTUFBTSxzREFBc0QsQ0FBQztBQUMvSCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFHN0QsTUFBTSxDQUFOLElBQVkscUJBR1g7QUFIRCxXQUFZLHFCQUFxQjtJQUNoQyxvREFBMkIsQ0FBQTtJQUMzQixzREFBNkIsQ0FBQTtBQUM5QixDQUFDLEVBSFcscUJBQXFCLEtBQXJCLHFCQUFxQixRQUdoQztBQUVELE1BQU0sQ0FBQyxNQUFNLFVBQVUsR0FBRztJQUN6QixhQUFhLEVBQUUsa0NBQWtDO0NBQ2pELENBQUM7QUF1R0YsTUFBTSxDQUFOLElBQWtCLGtCQTZCakI7QUE3QkQsV0FBa0Isa0JBQWtCO0lBQ25DOztPQUVHO0lBQ0gseUVBQWUsQ0FBQTtJQUNmOztPQUVHO0lBQ0gsaUVBQU8sQ0FBQTtJQUNQOztPQUVHO0lBQ0gseUZBQW1CLENBQUE7SUFDbkI7O09BRUc7SUFDSCwrREFBTSxDQUFBO0lBQ047O09BRUc7SUFD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