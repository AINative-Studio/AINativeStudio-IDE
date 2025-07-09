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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlndXJhdGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9jb25maWd1cmF0aW9uL2NvbW1vbi9jb25maWd1cmF0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUc3RCxPQUFPLEtBQUssS0FBSyxNQUFNLCtCQUErQixDQUFDO0FBQ3ZELE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sNkJBQTZCLENBQUM7QUFDakUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBRzlFLE1BQU0sQ0FBQyxNQUFNLHFCQUFxQixHQUFHLGVBQWUsQ0FBd0Isc0JBQXNCLENBQUMsQ0FBQztBQUVwRyxNQUFNLFVBQVUsd0JBQXdCLENBQUMsS0FBVTtJQUNsRCxPQUFPLEtBQUs7V0FDUixPQUFPLEtBQUssS0FBSyxRQUFRO1dBQ3pCLENBQUMsQ0FBQyxLQUFLLENBQUMsa0JBQWtCLElBQUksT0FBTyxLQUFLLENBQUMsa0JBQWtCLEtBQUssUUFBUSxDQUFDO1dBQzNFLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxJQUFJLEtBQUssQ0FBQyxRQUFRLFlBQVksR0FBRyxDQUFDLENBQUM7QUFDeEQsQ0FBQztBQU9ELE1BQU0sVUFBVSw4QkFBOEIsQ0FBQyxLQUFVO0lBQ3hELE9BQU8sS0FBSztXQUNSLE9BQU8sS0FBSyxLQUFLLFFBQVE7V0FDekIsQ0FBQyxDQUFDLEtBQUssQ0FBQyxtQkFBbUIsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO1dBQ3hFLENBQUMsS0FBSyxDQUFDLGtCQUFrQjtXQUN6QixDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsSUFB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