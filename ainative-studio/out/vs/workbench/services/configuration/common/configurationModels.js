/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { equals } from '../../../../base/common/objects.js';
import { toValuesTree } from '../../../../platform/configuration/common/configuration.js';
import { Configuration as BaseConfiguration, ConfigurationModelParser, ConfigurationModel } from '../../../../platform/configuration/common/configurationModels.js';
import { isBoolean } from '../../../../base/common/types.js';
import { distinct } from '../../../../base/common/arrays.js';
export class WorkspaceConfigurationModelParser extends ConfigurationModelParser {
    constructor(name, logService) {
        super(name, logService);
        this._folders = [];
        this._transient = false;
        this._settingsModelParser = new ConfigurationModelParser(name, logService);
        this._launchModel = ConfigurationModel.createEmptyModel(logService);
        this._tasksModel = ConfigurationModel.createEmptyModel(logService);
    }
    get folders() {
        return this._folders;
    }
    get transient() {
        return this._transient;
    }
    get settingsModel() {
        return this._settingsModelParser.configurationModel;
    }
    get launchModel() {
        return this._launchModel;
    }
    get tasksModel() {
        return this._tasksModel;
    }
    reparseWorkspaceSettings(configurationParseOptions) {
        this._settingsModelParser.reparse(configurationParseOptions);
    }
    getRestrictedWorkspaceSettings() {
        return this._settingsModelParser.restrictedConfigurations;
    }
    doParseRaw(raw, configurationParseOptions) {
        this._folders = (raw['folders'] || []);
        this._transient = isBoolean(raw['transient']) && raw['transient'];
        this._settingsModelParser.parseRaw(raw['settings'], configurationParseOptions);
        this._launchModel = this.createConfigurationModelFrom(raw, 'launch');
        this._tasksModel = this.createConfigurationModelFrom(raw, 'tasks');
        return super.doParseRaw(raw, configurationParseOptions);
    }
    createConfigurationModelFrom(raw, key) {
        const data = raw[key];
        if (data) {
            const contents = toValuesTree(data, message => console.error(`Conflict in settings file ${this._name}: ${message}`));
            const scopedContents = Object.create(null);
            scopedContents[key] = contents;
            const keys = Object.keys(data).map(k => `${key}.${k}`);
            return new ConfigurationModel(scopedContents, keys, [], undefined, this.logService);
        }
        return ConfigurationModel.createEmptyModel(this.logService);
    }
}
export class StandaloneConfigurationModelParser extends ConfigurationModelParser {
    constructor(name, scope, logService) {
        super(name, logService);
        this.scope = scope;
    }
    doParseRaw(raw, configurationParseOptions) {
        const contents = toValuesTree(raw, message => console.error(`Conflict in settings file ${this._name}: ${message}`));
        const scopedContents = Object.create(null);
        scopedContents[this.scope] = contents;
        const keys = Object.keys(raw).map(key => `${this.scope}.${key}`);
        return { contents: scopedContents, keys, overrides: [] };
    }
}
export class Configuration extends BaseConfiguration {
    constructor(defaults, policy, application, localUser, remoteUser, workspaceConfiguration, folders, memoryConfiguration, memoryConfigurationByResource, _workspace, logService) {
        super(defaults, policy, application, localUser, remoteUser, workspaceConfiguration, folders, memoryConfiguration, memoryConfigurationByResource, logService);
        this._workspace = _workspace;
    }
    getValue(key, overrides = {}) {
        return super.getValue(key, overrides, this._workspace);
    }
    inspect(key, overrides = {}) {
        return super.inspect(key, overrides, this._workspace);
    }
    keys() {
        return super.keys(this._workspace);
    }
    compareAndDeleteFolderConfiguration(folder) {
        if (this._workspace && this._workspace.folders.length > 0 && this._workspace.folders[0].uri.toString() === folder.toString()) {
            // Do not remove workspace configuration
            return { keys: [], overrides: [] };
        }
        return super.compareAndDeleteFolderConfiguration(folder);
    }
    compare(other) {
        const compare = (fromKeys, toKeys, overrideIdentifier) => {
            const keys = [];
            keys.push(...toKeys.filter(key => fromKeys.indexOf(key) === -1));
            keys.push(...fromKeys.filter(key => toKeys.indexOf(key) === -1));
            keys.push(...fromKeys.filter(key => {
                // Ignore if the key does not exist in both models
                if (toKeys.indexOf(key) === -1) {
                    return false;
                }
                // Compare workspace value
                if (!equals(this.getValue(key, { overrideIdentifier }), other.getValue(key, { overrideIdentifier }))) {
                    return true;
                }
                // Compare workspace folder value
                return this._workspace && this._workspace.folders.some(folder => !equals(this.getValue(key, { resource: folder.uri, overrideIdentifier }), other.getValue(key, { resource: folder.uri, overrideIdentifier })));
            }));
            return keys;
        };
        const keys = compare(this.allKeys(), other.allKeys());
        const overrides = [];
        const allOverrideIdentifiers = distinct([...this.allOverrideIdentifiers(), ...other.allOverrideIdentifiers()]);
        for (const overrideIdentifier of allOverrideIdentifiers) {
            const keys = compare(this.getAllKeysForOverrideIdentifier(overrideIdentifier), other.getAllKeysForOverrideIdentifier(overrideIdentifier), overrideIdentifier);
            if (keys.length) {
                overrides.push([overrideIdentifier, keys]);
            }
        }
        return { keys, overrides };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlndXJhdGlvbk1vZGVscy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvY29uZmlndXJhdGlvbi9jb21tb24vY29uZmlndXJhdGlvbk1vZGVscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDNUQsT0FBTyxFQUFFLFlBQVksRUFBMkYsTUFBTSw0REFBNEQsQ0FBQztBQUNuTCxPQUFPLEVBQUUsYUFBYSxJQUFJLGlCQUFpQixFQUFFLHdCQUF3QixFQUFFLGtCQUFrQixFQUE2QixNQUFNLGtFQUFrRSxDQUFDO0FBSy9MLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUM3RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFHN0QsTUFBTSxPQUFPLGlDQUFrQyxTQUFRLHdCQUF3QjtJQVE5RSxZQUFZLElBQVksRUFBRSxVQUF1QjtRQUNoRCxLQUFLLENBQUMsSUFBSSxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBUGpCLGFBQVEsR0FBNkIsRUFBRSxDQUFDO1FBQ3hDLGVBQVUsR0FBWSxLQUFLLENBQUM7UUFPbkMsSUFBSSxDQUFDLG9CQUFvQixHQUFHLElBQUksd0JBQXdCLENBQUMsSUFBSSxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBQzNFLElBQUksQ0FBQyxZQUFZLEdBQUcsa0JBQWtCLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDcEUsSUFBSSxDQUFDLFdBQVcsR0FBRyxrQkFBa0IsQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUNwRSxDQUFDO0lBRUQsSUFBSSxPQUFPO1FBQ1YsT0FBTyxJQUFJLENBQUMsUUFB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