/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { assertNever } from '../../../base/common/assert.js';
import * as types from '../../../base/common/types.js';
import { URI } from '../../../base/common/uri.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
export const IConfigurationService = createDecorator('configurationService');
export function isConfigurationOverrides(thing) {
    return thing
        && typeof thing === 'object'
        && (!thing.overrideIdentifier || typeof thing.overrideIdentifier === 'string')
        && (!thing.resource || thing.resource instanceof URI);
}
export function isConfigurationUpdateOverrides(thing) {
    return thing
        && typeof thing === 'object'
        && (!thing.overrideIdentifiers || Array.isArray(thing.overrideIdentifiers))
        && !thing.overrideIdentifier
        && (!thing.resource || thing.resource instanceof URI);
}
export var ConfigurationTarget;
(function (ConfigurationTarget) {
    ConfigurationTarget[ConfigurationTarget["APPLICATION"] = 1] = "APPLICATION";
    ConfigurationTarget[ConfigurationTarget["USER"] = 2] = "USER";
    ConfigurationTarget[ConfigurationTarget["USER_LOCAL"] = 3] = "USER_LOCAL";
    ConfigurationTarget[ConfigurationTarget["USER_REMOTE"] = 4] = "USER_REMOTE";
    ConfigurationTarget[ConfigurationTarget["WORKSPACE"] = 5] = "WORKSPACE";
    ConfigurationTarget[ConfigurationTarget["WORKSPACE_FOLDER"] = 6] = "WORKSPACE_FOLDER";
    ConfigurationTarget[ConfigurationTarget["DEFAULT"] = 7] = "DEFAULT";
    ConfigurationTarget[ConfigurationTarget["MEMORY"] = 8] = "MEMORY";
})(ConfigurationTarget || (ConfigurationTarget = {}));
export function ConfigurationTargetToString(configurationTarget) {
    switch (configurationTarget) {
        case 1 /* ConfigurationTarget.APPLICATION */: return 'APPLICATION';
        case 2 /* ConfigurationTarget.USER */: return 'USER';
        case 3 /* ConfigurationTarget.USER_LOCAL */: return 'USER_LOCAL';
        case 4 /* ConfigurationTarget.USER_REMOTE */: return 'USER_REMOTE';
        case 5 /* ConfigurationTarget.WORKSPACE */: return 'WORKSPACE';
        case 6 /* ConfigurationTarget.WORKSPACE_FOLDER */: return 'WORKSPACE_FOLDER';
        case 7 /* ConfigurationTarget.DEFAULT */: return 'DEFAULT';
        case 8 /* ConfigurationTarget.MEMORY */: return 'MEMORY';
    }
}
export function getConfigValueInTarget(configValue, scope) {
    switch (scope) {
        case 1 /* ConfigurationTarget.APPLICATION */:
            return configValue.applicationValue;
        case 2 /* ConfigurationTarget.USER */:
            return configValue.userValue;
        case 3 /* ConfigurationTarget.USER_LOCAL */:
            return configValue.userLocalValue;
        case 4 /* ConfigurationTarget.USER_REMOTE */:
            return configValue.userRemoteValue;
        case 5 /* ConfigurationTarget.WORKSPACE */:
            return configValue.workspaceValue;
        case 6 /* ConfigurationTarget.WORKSPACE_FOLDER */:
            return configValue.workspaceFolderValue;
        case 7 /* ConfigurationTarget.DEFAULT */:
            return configValue.defaultValue;
        case 8 /* ConfigurationTarget.MEMORY */:
            return configValue.memoryValue;
        default:
            assertNever(scope);
    }
}
export function isConfigured(configValue) {
    return configValue.applicationValue !== undefined ||
        configValue.userValue !== undefined ||
        configValue.userLocalValue !== undefined ||
        configValue.userRemoteValue !== undefined ||
        configValue.workspaceValue !== undefined ||
        configValue.workspaceFolderValue !== undefined;
}
export function toValuesTree(properties, conflictReporter) {
    const root = Object.create(null);
    for (const key in properties) {
        addToValueTree(root, key, properties[key], conflictReporter);
    }
    return root;
}
export function addToValueTree(settingsTreeRoot, key, value, conflictReporter) {
    const segments = key.split('.');
    const last = segments.pop();
    let curr = settingsTreeRoot;
    for (let i = 0; i < segments.length; i++) {
        const s = segments[i];
        let obj = curr[s];
        switch (typeof obj) {
            case 'undefined':
                obj = curr[s] = Object.create(null);
                break;
            case 'object':
                if (obj === null) {
                    conflictReporter(`Ignoring ${key} as ${segments.slice(0, i + 1).join('.')} is null`);
                    return;
                }
                break;
            default:
                conflictReporter(`Ignoring ${key} as ${segments.slice(0, i + 1).join('.')} is ${JSON.stringify(obj)}`);
                return;
        }
        curr = obj;
    }
    if (typeof curr === 'object' && curr !== null) {
        try {
            curr[last] = value; // workaround https://github.com/microsoft/vscode/issues/13606
        }
        catch (e) {
            conflictReporter(`Ignoring ${key} as ${segments.join('.')} is ${JSON.stringify(curr)}`);
        }
    }
    else {
        conflictReporter(`Ignoring ${key} as ${segments.join('.')} is ${JSON.stringify(curr)}`);
    }
}
export function removeFromValueTree(valueTree, key) {
    const segments = key.split('.');
    doRemoveFromValueTree(valueTree, segments);
}
function doRemoveFromValueTree(valueTree, segments) {
    if (!valueTree) {
        return;
    }
    const first = segments.shift();
    if (segments.length === 0) {
        // Reached last segment
        delete valueTree[first];
        return;
    }
    if (Object.keys(valueTree).indexOf(first) !== -1) {
        const value = valueTree[first];
        if (typeof value === 'object' && !Array.isArray(value)) {
            doRemoveFromValueTree(value, segments);
            if (Object.keys(value).length === 0) {
                delete valueTree[first];
            }
        }
    }
}
export function getConfigurationValue(config, settingPath, defaultValue) {
    function accessSetting(config, path) {
        let current = config;
        for (const component of path) {
            if (typeof current !== 'object' || current === null) {
                return undefined;
            }
            current = current[component];
        }
        return current;
    }
    const path = settingPath.split('.');
    const result = accessSetting(config, path);
    return typeof result === 'undefined' ? defaultValue : result;
}
export function merge(base, add, overwrite) {
    Object.keys(add).forEach(key => {
        if (key !== '__proto__') {
            if (key in base) {
                if (types.isObject(base[key]) && types.isObject(add[key])) {
                    merge(base[key], add[key], overwrite);
                }
                else if (overwrite) {
                    base[key] = add[key];
                }
            }
            else {
                base[key] = add[key];
            }
        }
    });
}
export function getLanguageTagSettingPlainKey(settingKey) {
    return settingKey.replace(/[\[\]]/g, '');
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlndXJhdGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2NvbmZpZ3VyYXRpb24vY29tbW9uL2NvbmZpZ3VyYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBRzdELE9BQU8sS0FBSyxLQUFLLE1BQU0sK0JBQStCLENBQUM7QUFDdkQsT0FBTyxFQUFFLEdBQUcsRUFBaUIsTUFBTSw2QkFBNkIsQ0FBQztBQUNqRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFHOUUsTUFBTSxDQUFDLE1BQU0scUJBQXFCLEdBQUcsZUFBZSxDQUF3QixzQkFBc0IsQ0FBQyxDQUFDO0FBRXBHLE1BQU0sVUFBVSx3QkFBd0IsQ0FBQyxLQUFVO0lBQ2xELE9BQU8sS0FBSztXQUNSLE9BQU8sS0FBSyxLQUFLLFFBQVE7V0FDekIsQ0FBQyxDQUFDLEtBQUssQ0FBQyxrQkFBa0IsSUFBSSxPQUFPLEtBQUssQ0FBQyxrQkFBa0IsS0FBSyxRQUFRLENBQUM7V0FDM0UsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLElBQUksS0FBSyxDQUFDLFFBQVEsWUFBWSxHQUFHLENBQUMsQ0FBQztBQUN4RCxDQUFDO0FBT0QsTUFBTSxVQUFVLDhCQUE4QixDQUFDLEtBQVU7SUFDeEQsT0FBTyxLQUFLO1dBQ1IsT0FBTyxLQUFLLEtBQUssUUFBUTtXQUN6QixDQUFDLENBQUMsS0FBSyxDQUFDLG1CQUFtQixJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLG1CQUFtQixDQUFDLENBQUM7V0FDeEUsQ0FBQyxLQUFLLENBQUMsa0JBQWtCO1dBQ3pCLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxJQUFJ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