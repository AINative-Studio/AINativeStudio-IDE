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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdENvbmZpZ3VyYXRpb25TZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2NvbmZpZ3VyYXRpb24vdGVzdC9jb21tb24vdGVzdENvbmZpZ3VyYXRpb25TZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUMzRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUVqRixPQUFPLEVBQUUscUJBQXFCLEVBQWtHLHdCQUF3QixFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDaE0sT0FBTyxFQUFFLFVBQVUsRUFBMEIsTUFBTSx1Q0FBdUMsQ0FBQztBQUMzRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFaEUsTUFBTSxPQUFPLHdCQUF3QjtJQU9wQyxZQUFZLGFBQW1CO1FBSHRCLG9DQUErQixHQUFHLElBQUksT0FBTyxFQUE2QixDQUFDO1FBQzNFLDZCQUF3QixHQUFHLElBQUksQ0FBQywrQkFBK0IsQ0FBQyxLQUFLLENBQUM7UUFNdkUsd0JBQW1CLEdBQW1DLGlCQUFpQixDQUFDLFFBQVEsRUFBTyxDQUFDO1FBcUN4Rix3QkFBbUIsR0FBMEIsSUFBSSxHQUFHLEVBQUUsQ0FBQztRQXhDOUQsSUFBSSxDQUFDLGFBQWEsR0FBRyxhQUFhLElBQUksTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUMzRCxDQUFDO0lBSU0sbUJBQW1CO1FBQ3pCLE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztJQUN6QyxDQUFDO0lBRU0sUUFBUSxDQUFDLElBQVUsRUFBRSxJQUFVO1FBQ3JDLElBQUksYUFBYSxDQUFDO1FBQ2xCLE1BQU0sU0FBUyxHQUFHLHdCQUF3QixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLHdCQUF3QixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQztRQUM1RyxJQUFJLFNBQVMsRUFBRSxDQUFDO1lBQ2YsSUFBSSxTQUFTLENBQUMsUUFBUSxFQUFFLENBQUM7Z0JBQ3hCLGFBQWEsR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDaEYsQ0FBQztRQUNGLENBQUM7UUFDRCxhQUFhLEdBQUcsYUFBYSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUM7UUFDbkUsSUFBSSxJQUFJLElBQUksT0FBTyxJQUFJLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDdEMsT0FBTyxhQUFhLENBQUMsSUFBSSxDQUFDLElBQUkscUJBQXFCLENBQUMsYUFBYSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzFFLENBQUM7UUFDRCxPQUFPLGFBQWEsQ0FBQztJQUN0QixDQUFDO0lBRU0sV0FBVyxDQUFDLEdBQVcsRUFBRSxLQUFVO1FBQ3pDLE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUNuQyxDQUFDO0lBRU0sb0JBQW9CLENBQUMsR0FBUSxFQUFFLEtBQVUsRUFBRSxJQUFVO1FBQzNELElBQUksSUFBSSxFQUFFLENBQUM7WUFDVixNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3ZGLGFBQWEsQ0FBQyxHQUFHLENBQUMsR0FBRyxLQUFLLENBQUM7WUFDM0IsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLGFBQWEsQ0FBQyxDQUFDO1FBQzFELENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsR0FBRyxLQUFLLENBQUM7UUFDakMsQ0FBQztRQUVELE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUNuQyxDQUFDO0lBR00sc0JBQXNCLENBQUMsR0FBVyxFQUFFLFdBQXFCO1FBQy9ELElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLFdBQVcsQ0FBQyxDQUFDO0lBQ2hELENBQUM7SUFFTSxPQUFPLENBQUksR0FBVyxFQUFFLFNBQW1DO1FBQ2pFLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBRTVDLE9BQU87WUFDTixLQUFLO1lBQ0wsWUFBWSxFQUFFLFNBQVM7WUFDdkIsU0FBUyxFQUFFLEtBQUs7WUFDaEIsbUJBQW1CLEVBQUUsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUM7U0FDdEQsQ0FBQztJQUNILENBQUM7SUFFTSxJQUFJO1FBQ1YsT0FBTztZQUNOLE9BQU8sRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQXlCLFVBQVUsQ0FBQyxhQUFhLENBQUMsQ0FBQywwQkFBMEIsRUFBRSxDQUFDO1lBQ2hILElBQUksRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUM7WUFDckMsU0FBUyxFQUFFLEVBQUU7WUFDYixlQUFlLEVBQUUsRUFBRTtTQUNuQixDQUFDO0lBQ0gsQ0FBQztJQUVNLG9CQUFvQjtRQUMxQixPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7Q0FDRCJ9