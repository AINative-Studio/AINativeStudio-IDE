/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../base/common/event.js';
import { TernarySearchTree } from '../../../../base/common/ternarySearchTree.js';
import { getConfigurationValue, isConfigurationOverrides } from '../../common/configuration.js';
import { Extensions } from '../../common/configurationRegistry.js';
import { Registry } from '../../../registry/common/platform.js';
export class TestConfigurationService {
    constructor(configuration) {
        this.onDidChangeConfigurationEmitter = new Emitter();
        this.onDidChangeConfiguration = this.onDidChangeConfigurationEmitter.event;
        this.configurationByRoot = TernarySearchTree.forPaths();
        this.overrideIdentifiers = new Map();
        this.configuration = configuration || Object.create(null);
    }
    reloadConfiguration() {
        return Promise.resolve(this.getValue());
    }
    getValue(arg1, arg2) {
        let configuration;
        const overrides = isConfigurationOverrides(arg1) ? arg1 : isConfigurationOverrides(arg2) ? arg2 : undefined;
        if (overrides) {
            if (overrides.resource) {
                configuration = this.configurationByRoot.findSubstr(overrides.resource.fsPath);
            }
        }
        configuration = configuration ? configuration : this.configuration;
        if (arg1 && typeof arg1 === 'string') {
            return configuration[arg1] ?? getConfigurationValue(configuration, arg1);
        }
        return configuration;
    }
    updateValue(key, value) {
        return Promise.resolve(undefined);
    }
    setUserConfiguration(key, value, root) {
        if (root) {
            const configForRoot = this.configurationByRoot.get(root.fsPath) || Object.create(null);
            configForRoot[key] = value;
            this.configurationByRoot.set(root.fsPath, configForRoot);
        }
        else {
            this.configuration[key] = value;
        }
        return Promise.resolve(undefined);
    }
    setOverrideIdentifiers(key, identifiers) {
        this.overrideIdentifiers.set(key, identifiers);
    }
    inspect(key, overrides) {
        const value = this.getValue(key, overrides);
        return {
            value,
            defaultValue: undefined,
            userValue: value,
            overrideIdentifiers: this.overrideIdentifiers.get(key)
        };
    }
    keys() {
        return {
            default: Object.keys(Registry.as(Extensions.Configuration).getConfigurationProperties()),
            user: Object.keys(this.configuration),
            workspace: [],
            workspaceFolder: []
        };
    }
    getConfigurationData() {
        return null;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdENvbmZpZ3VyYXRpb25TZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vY29uZmlndXJhdGlvbi90ZXN0L2NvbW1vbi90ZXN0Q29uZmlndXJhdGlvblNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBRWpGLE9BQU8sRUFBRSxxQkFBcUIsRUFBa0csd0JBQXdCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUNoTSxPQUFPLEVBQUUsVUFBVSxFQUEwQixNQUFNLHVDQUF1QyxDQUFDO0FBQzNGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUVoRSxNQUFNLE9BQU8sd0JBQXdCO0lBT3BDLFlBQVksYUFBbUI7UUFIdEIsb0NBQStCLEdBQUcsSUFBSSxPQUFPLEVBQTZCLENBQUM7UUFDM0UsNkJBQXdCLEdBQUcsSUFBSSxDQUFDLCtCQUErQixDQUFDLEtBQUssQ0FBQztRQU12RSx3QkFBbUIsR0FBbUMsaUJBQWlCLENBQUMsUUFBUSxFQUFPLENBQUM7UUFxQ3hGLHdCQUFtQixHQUEwQixJQUFJLEdBQUcsRUFBRSxDQUFDO1FBeEM5RCxJQUFJLENBQUMsYUFBYSxHQUFHLGFBQWEsSUFBSSxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQzNELENBQUM7SUFJTSxtQkFBbUI7UUFDekIsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO0lBQ3pDLENBQUM7SUFFTSxRQUFRLENBQUMsSUFBVSxFQUFFLElBQVU7UUFDckMsSUFB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