/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isWindows } from '../../../base/common/platform.js';
import { EnvironmentVariableMutatorType } from './environmentVariable.js';
const mutatorTypeToLabelMap = new Map([
    [EnvironmentVariableMutatorType.Append, 'APPEND'],
    [EnvironmentVariableMutatorType.Prepend, 'PREPEND'],
    [EnvironmentVariableMutatorType.Replace, 'REPLACE']
]);
export class MergedEnvironmentVariableCollection {
    constructor(collections) {
        this.collections = collections;
        this.map = new Map();
        this.descriptionMap = new Map();
        collections.forEach((collection, extensionIdentifier) => {
            this.populateDescriptionMap(collection, extensionIdentifier);
            const it = collection.map.entries();
            let next = it.next();
            while (!next.done) {
                const mutator = next.value[1];
                const key = next.value[0];
                let entry = this.map.get(key);
                if (!entry) {
                    entry = [];
                    this.map.set(key, entry);
                }
                // If the first item in the entry is replace ignore any other entries as they would
                // just get replaced by this one.
                if (entry.length > 0 && entry[0].type === EnvironmentVariableMutatorType.Replace) {
                    next = it.next();
                    continue;
                }
                const extensionMutator = {
                    extensionIdentifier,
                    value: mutator.value,
                    type: mutator.type,
                    scope: mutator.scope,
                    variable: mutator.variable,
                    options: mutator.options
                };
                if (!extensionMutator.scope) {
                    delete extensionMutator.scope; // Convenient for tests
                }
                // Mutators get applied in the reverse order than they are created
                entry.unshift(extensionMutator);
                next = it.next();
            }
        });
    }
    async applyToProcessEnvironment(env, scope, variableResolver) {
        let lowerToActualVariableNames;
        if (isWindows) {
            lowerToActualVariableNames = {};
            Object.keys(env).forEach(e => lowerToActualVariableNames[e.toLowerCase()] = e);
        }
        for (const [variable, mutators] of this.getVariableMap(scope)) {
            const actualVariable = isWindows ? lowerToActualVariableNames[variable.toLowerCase()] || variable : variable;
            for (const mutator of mutators) {
                const value = variableResolver ? await variableResolver(mutator.value) : mutator.value;
                // Default: true
                if (mutator.options?.applyAtProcessCreation ?? true) {
                    switch (mutator.type) {
                        case EnvironmentVariableMutatorType.Append:
                            env[actualVariable] = (env[actualVariable] || '') + value;
                            break;
                        case EnvironmentVariableMutatorType.Prepend:
                            env[actualVariable] = value + (env[actualVariable] || '');
                            break;
                        case EnvironmentVariableMutatorType.Replace:
                            env[actualVariable] = value;
                            break;
                    }
                }
                // Default: false
                if (mutator.options?.applyAtShellIntegration ?? false) {
                    const key = `VSCODE_ENV_${mutatorTypeToLabelMap.get(mutator.type)}`;
                    env[key] = (env[key] ? env[key] + ':' : '') + variable + '=' + this._encodeColons(value);
                }
            }
        }
    }
    _encodeColons(value) {
        return value.replaceAll(':', '\\x3a');
    }
    diff(other, scope) {
        const added = new Map();
        const changed = new Map();
        const removed = new Map();
        // Find added
        other.getVariableMap(scope).forEach((otherMutators, variable) => {
            const currentMutators = this.getVariableMap(scope).get(variable);
            const result = getMissingMutatorsFromArray(otherMutators, currentMutators);
            if (result) {
                added.set(variable, result);
            }
        });
        // Find removed
        this.getVariableMap(scope).forEach((currentMutators, variable) => {
            const otherMutators = other.getVariableMap(scope).get(variable);
            const result = getMissingMutatorsFromArray(currentMutators, otherMutators);
            if (result) {
                removed.set(variable, result);
            }
        });
        // Find changed
        this.getVariableMap(scope).forEach((currentMutators, variable) => {
            const otherMutators = other.getVariableMap(scope).get(variable);
            const result = getChangedMutatorsFromArray(currentMutators, otherMutators);
            if (result) {
                changed.set(variable, result);
            }
        });
        if (added.size === 0 && changed.size === 0 && removed.size === 0) {
            return undefined;
        }
        return { added, changed, removed };
    }
    getVariableMap(scope) {
        const result = new Map();
        for (const mutators of this.map.values()) {
            const filteredMutators = mutators.filter(m => filterScope(m, scope));
            if (filteredMutators.length > 0) {
                // All of these mutators are for the same variable because they are in the same scope, hence choose anyone to form a key.
                result.set(filteredMutators[0].variable, filteredMutators);
            }
        }
        return result;
    }
    getDescriptionMap(scope) {
        const result = new Map();
        for (const mutators of this.descriptionMap.values()) {
            const filteredMutators = mutators.filter(m => filterScope(m, scope, true));
            for (const mutator of filteredMutators) {
                result.set(mutator.extensionIdentifier, mutator.description);
            }
        }
        return result;
    }
    populateDescriptionMap(collection, extensionIdentifier) {
        if (!collection.descriptionMap) {
            return;
        }
        const it = collection.descriptionMap.entries();
        let next = it.next();
        while (!next.done) {
            const mutator = next.value[1];
            const key = next.value[0];
            let entry = this.descriptionMap.get(key);
            if (!entry) {
                entry = [];
                this.descriptionMap.set(key, entry);
            }
            const extensionMutator = {
                extensionIdentifier,
                scope: mutator.scope,
                description: mutator.description
            };
            if (!extensionMutator.scope) {
                delete extensionMutator.scope; // Convenient for tests
            }
            entry.push(extensionMutator);
            next = it.next();
        }
    }
}
/**
 * Returns whether a mutator matches with the scope provided.
 * @param mutator Mutator to filter
 * @param scope Scope to be used for querying
 * @param strictFilter If true, mutators with global scope is not returned when querying for workspace scope.
 * i.e whether mutator scope should always exactly match with query scope.
 */
function filterScope(mutator, scope, strictFilter = false) {
    if (!mutator.scope) {
        if (strictFilter) {
            return scope === mutator.scope;
        }
        return true;
    }
    // If a mutator is scoped to a workspace folder, only apply it if the workspace
    // folder matches.
    if (mutator.scope.workspaceFolder && scope?.workspaceFolder && mutator.scope.workspaceFolder.index === scope.workspaceFolder.index) {
        return true;
    }
    return false;
}
function getMissingMutatorsFromArray(current, other) {
    // If it doesn't exist, all are removed
    if (!other) {
        return current;
    }
    // Create a map to help
    const otherMutatorExtensions = new Set();
    other.forEach(m => otherMutatorExtensions.add(m.extensionIdentifier));
    // Find entries removed from other
    const result = [];
    current.forEach(mutator => {
        if (!otherMutatorExtensions.has(mutator.extensionIdentifier)) {
            result.push(mutator);
        }
    });
    return result.length === 0 ? undefined : result;
}
function getChangedMutatorsFromArray(current, other) {
    // If it doesn't exist, none are changed (they are removed)
    if (!other) {
        return undefined;
    }
    // Create a map to help
    const otherMutatorExtensions = new Map();
    other.forEach(m => otherMutatorExtensions.set(m.extensionIdentifier, m));
    // Find entries that exist in both but are not equal
    const result = [];
    current.forEach(mutator => {
        const otherMutator = otherMutatorExtensions.get(mutator.extensionIdentifier);
        if (otherMutator && (mutator.type !== otherMutator.type || mutator.value !== otherMutator.value || mutator.scope?.workspaceFolder?.index !== otherMutator.scope?.workspaceFolder?.index)) {
            // Return the new result, not the old one
            result.push(otherMutator);
        }
    });
    return result.length === 0 ? undefined : result;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW52aXJvbm1lbnRWYXJpYWJsZUNvbGxlY3Rpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdGVybWluYWwvY29tbW9uL2Vudmlyb25tZW50VmFyaWFibGVDb2xsZWN0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBdUIsU0FBUyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDbEYsT0FBTyxFQUFFLDhCQUE4QixFQUFxTyxNQUFNLDBCQUEwQixDQUFDO0FBSTdTLE1BQU0scUJBQXFCLEdBQWdELElBQUksR0FBRyxDQUFDO0lBQ2xGLENBQUMsOEJBQThCLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQztJQUNqRCxDQUFDLDhCQUE4QixDQUFDLE9BQU8sRUFBRSxTQUFTLENBQUM7SUFDbkQsQ0FBQyw4QkFBOEIsQ0FBQyxPQUFPLEVBQUUsU0FBUyxDQUFDO0NBQ25ELENBQUMsQ0FBQztBQUVILE1BQU0sT0FBTyxtQ0FBbUM7SUFJL0MsWUFDVSxXQUFnRTtRQUFoRSxnQkFBVyxHQUFYLFdBQVcsQ0FBcUQ7UUFKekQsUUFBRyxHQUE2RCxJQUFJLEdBQUcsRUFBRSxDQUFDO1FBQzFFLG1CQUFjLEdBQWdFLElBQUksR0FBRyxFQUFFLENBQUM7UUFLeEcsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDLFVBQVUsRUFBRSxtQkFBbUIsRUFBRSxFQUFFO1lBQ3ZELElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxVQUFVLEVBQUUsbUJBQW1CLENBQUMsQ0FBQztZQUM3RCxNQUFNLEVBQUUsR0FBRyxVQUFVLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ3BDLElBQUksSUFBSSxHQUFHLEVBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNyQixPQUFPLENBQUMsSUFBSSxD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