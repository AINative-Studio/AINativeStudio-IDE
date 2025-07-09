/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { distinct, equals as arrayEquals } from '../../../base/common/arrays.js';
import { Queue, RunOnceScheduler } from '../../../base/common/async.js';
import { VSBuffer } from '../../../base/common/buffer.js';
import { Emitter } from '../../../base/common/event.js';
import { parse } from '../../../base/common/json.js';
import { applyEdits, setProperty } from '../../../base/common/jsonEdit.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { ResourceMap } from '../../../base/common/map.js';
import { equals } from '../../../base/common/objects.js';
import { OS } from '../../../base/common/platform.js';
import { extUriBiasedIgnorePathCase } from '../../../base/common/resources.js';
import { isConfigurationOverrides, isConfigurationUpdateOverrides } from './configuration.js';
import { Configuration, ConfigurationChangeEvent, ConfigurationModel, UserSettings } from './configurationModels.js';
import { keyFromOverrideIdentifiers } from './configurationRegistry.js';
import { DefaultConfiguration, NullPolicyConfiguration, PolicyConfiguration } from './configurations.js';
import { NullPolicyService } from '../../policy/common/policy.js';
export class ConfigurationService extends Disposable {
    constructor(settingsResource, fileService, policyService, logService) {
        super();
        this.settingsResource = settingsResource;
        this.logService = logService;
        this._onDidChangeConfiguration = this._register(new Emitter());
        this.onDidChangeConfiguration = this._onDidChangeConfiguration.event;
        this.defaultConfiguration = this._register(new DefaultConfiguration(logService));
        this.policyConfiguration = policyService instanceof NullPolicyService ? new NullPolicyConfiguration() : this._register(new PolicyConfiguration(this.defaultConfiguration, policyService, logService));
        this.userConfiguration = this._register(new UserSettings(this.settingsResource, {}, extUriBiasedIgnorePathCase, fileService, logService));
        this.configuration = new Configuration(this.defaultConfiguration.configurationModel, this.policyConfiguration.configurationModel, ConfigurationModel.createEmptyModel(logService), ConfigurationModel.createEmptyModel(logService), ConfigurationModel.createEmptyModel(logService), ConfigurationModel.createEmptyModel(logService), new ResourceMap(), ConfigurationModel.createEmptyModel(logService), new ResourceMap(), logService);
        this.configurationEditing = new ConfigurationEditing(settingsResource, fileService, this);
        this.reloadConfigurationScheduler = this._register(new RunOnceScheduler(() => this.reloadConfiguration(), 50));
        this._register(this.defaultConfiguration.onDidChangeConfiguration(({ defaults, properties }) => this.onDidDefaultConfigurationChange(defaults, properties)));
        this._register(this.policyConfiguration.onDidChangeConfiguration(model => this.onDidPolicyConfigurationChange(model)));
        this._register(this.userConfiguration.onDidChange(() => this.reloadConfigurationScheduler.schedule()));
    }
    async initialize() {
        const [defaultModel, policyModel, userModel] = await Promise.all([this.defaultConfiguration.initialize(), this.policyConfiguration.initialize(), this.userConfiguration.loadConfiguration()]);
        this.configuration = new Configuration(defaultModel, policyModel, ConfigurationModel.createEmptyModel(this.logService), userModel, ConfigurationModel.createEmptyModel(this.logService), ConfigurationModel.createEmptyModel(this.logService), new ResourceMap(), ConfigurationModel.createEmptyModel(this.logService), new ResourceMap(), this.logService);
    }
    getConfigurationData() {
        return this.configuration.toData();
    }
    getValue(arg1, arg2) {
        const section = typeof arg1 === 'string' ? arg1 : undefined;
        const overrides = isConfigurationOverrides(arg1) ? arg1 : isConfigurationOverrides(arg2) ? arg2 : {};
        return this.configuration.getValue(section, overrides, undefined);
    }
    async updateValue(key, value, arg3, arg4, options) {
        const overrides = isConfigurationUpdateOverrides(arg3) ? arg3
            : isConfigurationOverrides(arg3) ? { resource: arg3.resource, overrideIdentifiers: arg3.overrideIdentifier ? [arg3.overrideIdentifier] : undefined } : undefined;
        const target = overrides ? arg4 : arg3;
        if (target !== undefined) {
            if (target !== 3 /* ConfigurationTarget.USER_LOCAL */ && target !== 2 /* ConfigurationTarget.USER */) {
                throw new Error(`Unable to write ${key} to target ${target}.`);
            }
        }
        if (overrides?.overrideIdentifiers) {
            overrides.overrideIdentifiers = distinct(overrides.overrideIdentifiers);
            overrides.overrideIdentifiers = overrides.overrideIdentifiers.length ? overrides.overrideIdentifiers : undefined;
        }
        const inspect = this.inspect(key, { resource: overrides?.resource, overrideIdentifier: overrides?.overrideIdentifiers ? overrides.overrideIdentifiers[0] : undefined });
        if (inspect.policyValue !== undefined) {
            throw new Error(`Unable to write ${key} because it is configured in system policy.`);
        }
        // Remove the setting, if the value is same as default value
        if (equals(value, inspect.defaultValue)) {
            value = undefined;
        }
        if (overrides?.overrideIdentifiers?.length && overrides.overrideIdentifiers.length > 1) {
            const overrideIdentifiers = overrides.overrideIdentifiers.sort();
            const existingOverrides = this.configuration.localUserConfiguration.overrides.find(override => arrayEquals([...override.identifiers].sort(), overrideIdentifiers));
            if (existingOverrides) {
                overrides.overrideIdentifiers = existingOverrides.identifiers;
            }
        }
        const path = overrides?.overrideIdentifiers?.length ? [keyFromOverrideIdentifiers(overrides.overrideIdentifiers), key] : [key];
        await this.configurationEditing.write(path, value);
        await this.reloadConfiguration();
    }
    inspect(key, overrides = {}) {
        return this.configuration.inspect(key, overrides, undefined);
    }
    keys() {
        return this.configuration.keys(undefined);
    }
    async reloadConfiguration() {
        const configurationModel = await this.userConfiguration.loadConfiguration();
        this.onDidChangeUserConfiguration(configurationModel);
    }
    onDidChangeUserConfiguration(userConfigurationModel) {
        const previous = this.configuration.toData();
        const change = this.configuration.compareAndUpdateLocalUserConfiguration(userConfigurationModel);
        this.trigger(change, previous, 2 /* ConfigurationTarget.USER */);
    }
    onDidDefaultConfigurationChange(defaultConfigurationModel, properties) {
        const previous = this.configuration.toData();
        const change = this.configuration.compareAndUpdateDefaultConfiguration(defaultConfigurationModel, properties);
        this.trigger(change, previous, 7 /* ConfigurationTarget.DEFAULT */);
    }
    onDidPolicyConfigurationChange(policyConfiguration) {
        const previous = this.configuration.toData();
        const change = this.configuration.compareAndUpdatePolicyConfiguration(policyConfiguration);
        this.trigger(change, previous, 7 /* ConfigurationTarget.DEFAULT */);
    }
    trigger(configurationChange, previous, source) {
        const event = new ConfigurationChangeEvent(configurationChange, { data: previous }, this.configuration, undefined, this.logService);
        event.source = source;
        this._onDidChangeConfiguration.fire(event);
    }
}
class ConfigurationEditing {
    constructor(settingsResource, fileService, configurationService) {
        this.settingsResource = settingsResource;
        this.fileService = fileService;
        this.configurationService = configurationService;
        this.queue = new Queue();
    }
    write(path, value) {
        return this.queue.queue(() => this.doWriteConfiguration(path, value)); // queue up writes to prevent race conditions
    }
    async doWriteConfiguration(path, value) {
        let content;
        try {
            const fileContent = await this.fileService.readFile(this.settingsResource);
            content = fileContent.value.toString();
        }
        catch (error) {
            if (error.fileOperationResult === 1 /* FileOperationResult.FILE_NOT_FOUND */) {
                content = '{}';
            }
            else {
                throw error;
            }
        }
        const parseErrors = [];
        parse(content, parseErrors, { allowTrailingComma: true, allowEmptyContent: true });
        if (parseErrors.length > 0) {
            throw new Error('Unable to write into the settings file. Please open the file to correct errors/warnings in the file and try again.');
        }
        const edits = this.getEdits(content, path, value);
        content = applyEdits(content, edits);
        await this.fileService.writeFile(this.settingsResource, VSBuffer.fromString(content));
    }
    getEdits(content, path, value) {
        const { tabSize, insertSpaces, eol } = this.formattingOptions;
        // With empty path the entire file is being replaced, so we just use JSON.stringify
        if (!path.length) {
            const content = JSON.stringify(value, null, insertSpaces ? ' '.repeat(tabSize) : '\t');
            return [{
                    content,
                    length: content.length,
                    offset: 0
                }];
        }
        return setProperty(content, path, value, { tabSize, insertSpaces, eol });
    }
    get formattingOptions() {
        if (!this._formattingOptions) {
            let eol = OS === 3 /* OperatingSystem.Linux */ || OS === 2 /* OperatingSystem.Macintosh */ ? '\n' : '\r\n';
            const configuredEol = this.configurationService.getValue('files.eol', { overrideIdentifier: 'jsonc' });
            if (configuredEol && typeof configuredEol === 'string' && configuredEol !== 'auto') {
                eol = configuredEol;
            }
            this._formattingOptions = {
                eol,
                insertSpaces: !!this.configurationService.getValue('editor.insertSpaces', { overrideIdentifier: 'jsonc' }),
                tabSize: this.configurationService.getValue('editor.tabSize', { overrideIdentifier: 'jsonc' })
            };
        }
        return this._formattingOptions;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlndXJhdGlvblNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vY29uZmlndXJhdGlvbi9jb21tb24vY29uZmlndXJhdGlvblNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLElBQUksV0FBVyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDakYsT0FBTyxFQUFFLEtBQUssRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3hFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUMxRCxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sK0JBQStCLENBQUM7QUFDL0QsT0FBTyxFQUF3QixLQUFLLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUMzRSxPQUFPLEVBQUUsVUFBVSxFQUFFLFdBQVcsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBRTNFLE9BQU8sRUFBRSxVQUFVLEVBQWUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM1RSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDMUQsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3pELE9BQU8sRUFBRSxFQUFFLEVBQW1CLE1BQU0sa0NBQWtDLENBQUM7QUFDdkUsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFFL0UsT0FBTyxFQUE2Tix3QkFBd0IsRUFBRSw4QkFBOEIsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQ3pULE9BQU8sRUFBRSxhQUFhLEVBQUUsd0JBQXdCLEVBQUUsa0JBQWtCLEVBQUUsWUFBWSxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDckgsT0FBTyxF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