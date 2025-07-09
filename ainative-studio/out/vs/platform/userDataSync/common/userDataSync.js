/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { distinct } from '../../../base/common/arrays.js';
import { isObject, isString } from '../../../base/common/types.js';
import { localize } from '../../../nls.js';
import { allSettings, Extensions as ConfigurationExtensions, getAllConfigurationProperties, parseScope } from '../../configuration/common/configurationRegistry.js';
import { EXTENSION_IDENTIFIER_PATTERN } from '../../extensionManagement/common/extensionManagement.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
import { Extensions as JSONExtensions } from '../../jsonschemas/common/jsonContributionRegistry.js';
import { Registry } from '../../registry/common/platform.js';
export function getDisallowedIgnoredSettings() {
    const allSettings = Registry.as(ConfigurationExtensions.Configuration).getConfigurationProperties();
    return Object.keys(allSettings).filter(setting => !!allSettings[setting].disallowSyncIgnore);
}
export function getDefaultIgnoredSettings(excludeExtensions = false) {
    const allSettings = Registry.as(ConfigurationExtensions.Configuration).getConfigurationProperties();
    const ignoredSettings = getIgnoredSettings(allSettings, excludeExtensions);
    const disallowedSettings = getDisallowedIgnoredSettings();
    return distinct([...ignoredSettings, ...disallowedSettings]);
}
export function getIgnoredSettingsForExtension(manifest) {
    if (!manifest.contributes?.configuration) {
        return [];
    }
    const configurations = Array.isArray(manifest.contributes.configuration) ? manifest.contributes.configuration : [manifest.contributes.configuration];
    if (!configurations.length) {
        return [];
    }
    const properties = getAllConfigurationProperties(configurations);
    return getIgnoredSettings(properties, false);
}
function getIgnoredSettings(properties, excludeExtensions) {
    const ignoredSettings = new Set();
    for (const key in properties) {
        if (excludeExtensions && !!properties[key].source) {
            continue;
        }
        const scope = isString(properties[key].scope) ? parseScope(properties[key].scope) : properties[key].scope;
        if (properties[key].ignoreSync
            || scope === 2 /* ConfigurationScope.MACHINE */
            || scope === 7 /* ConfigurationScope.MACHINE_OVERRIDABLE */) {
            ignoredSettings.add(key);
        }
    }
    return [...ignoredSettings.values()];
}
export const USER_DATA_SYNC_CONFIGURATION_SCOPE = 'settingsSync';
export const CONFIG_SYNC_KEYBINDINGS_PER_PLATFORM = 'settingsSync.keybindingsPerPlatform';
export function registerConfiguration() {
    const ignoredSettingsSchemaId = 'vscode://schemas/ignoredSettings';
    const configurationRegistry = Registry.as(ConfigurationExtensions.Configuration);
    configurationRegistry.registerConfiguration({
        id: 'settingsSync',
        order: 30,
        title: localize('settings sync', "Settings Sync"),
        type: 'object',
        properties: {
            [CONFIG_SYNC_KEYBINDINGS_PER_PLATFORM]: {
                type: 'boolean',
                description: localize('settingsSync.keybindingsPerPlatform', "Synchronize keybindings for each platform."),
                default: true,
                scope: 1 /* ConfigurationScope.APPLICATION */,
                tags: ['sync', 'usesOnlineServices']
            },
            'settingsSync.ignoredExtensions': {
                'type': 'array',
                markdownDescription: localize('settingsSync.ignoredExtensions', "List of extensions to be ignored while synchronizing. The identifier of an extension is always `${publisher}.${name}`. For example: `vscode.csharp`."),
                items: [{
                        type: 'string',
                        pattern: EXTENSION_IDENTIFIER_PATTERN,
                        errorMessage: localize('app.extension.identifier.errorMessage', "Expected format '${publisher}.${name}'. Example: 'vscode.csharp'.")
                    }],
                'default': [],
                'scope': 1 /* ConfigurationScope.APPLICATION */,
                uniqueItems: true,
                disallowSyncIgnore: true,
                tags: ['sync', 'usesOnlineServices']
            },
            'settingsSync.ignoredSettings': {
                'type': 'array',
                description: localize('settingsSync.ignoredSettings', "Configure settings to be ignored while synchronizing."),
                'default': [],
                'scope': 1 /* ConfigurationScope.APPLICATION */,
                $ref: ignoredSettingsSchemaId,
                additionalProperties: true,
                uniqueItems: true,
                disallowSyncIgnore: true,
                tags: ['sync', 'usesOnlineServices']
            }
        }
    });
    const jsonRegistry = Registry.as(JSONExtensions.JSONContribution);
    const registerIgnoredSettingsSchema = () => {
        const disallowedIgnoredSettings = getDisallowedIgnoredSettings();
        const defaultIgnoredSettings = getDefaultIgnoredSettings();
        const settings = Object.keys(allSettings.properties).filter(setting => !defaultIgnoredSettings.includes(setting));
        const ignoredSettings = defaultIgnoredSettings.filter(setting => !disallowedIgnoredSettings.includes(setting));
        const ignoredSettingsSchema = {
            items: {
                type: 'string',
                enum: [...settings, ...ignoredSettings.map(setting => `-${setting}`)]
            },
        };
        jsonRegistry.registerSchema(ignoredSettingsSchemaId, ignoredSettingsSchema);
    };
    return configurationRegistry.onDidUpdateConfiguration(() => registerIgnoredSettingsSchema());
}
export function isAuthenticationProvider(thing) {
    return thing
        && isObject(thing)
        && isString(thing.id)
        && Array.isArray(thing.scopes);
}
export var SyncResource;
(function (SyncResource) {
    SyncResource["Settings"] = "settings";
    SyncResource["Keybindings"] = "keybindings";
    SyncResource["Snippets"] = "snippets";
    SyncResource["Prompts"] = "prompts";
    SyncResource["Tasks"] = "tasks";
    SyncResource["Extensions"] = "extensions";
    SyncResource["GlobalState"] = "globalState";
    SyncResource["Profiles"] = "profiles";
    SyncResource["WorkspaceState"] = "workspaceState";
})(SyncResource || (SyncResource = {}));
export const ALL_SYNC_RESOURCES = ["settings" /* SyncResource.Settings */, "keybindings" /* SyncResource.Keybindings */, "snippets" /* SyncResource.Snippets */, "prompts" /* SyncResource.Prompts */, "tasks" /* SyncResource.Tasks */, "extensions" /* SyncResource.Extensions */, "globalState" /* SyncResource.GlobalState */, "profiles" /* SyncResource.Profiles */];
export function getPathSegments(collection, ...paths) {
    return collection ? [collection, ...paths] : paths;
}
export function getLastSyncResourceUri(collection, syncResource, environmentService, extUri) {
    return extUri.joinPath(environmentService.userDataSyncHome, ...getPathSegments(collection, syncResource, `lastSync${syncResource}.json`));
}
export const IUserDataSyncStoreManagementService = createDecorator('IUserDataSyncStoreManagementService');
export const IUserDataSyncStoreService = createDecorator('IUserDataSyncStoreService');
export const IUserDataSyncLocalStoreService = createDecorator('IUserDataSyncLocalStoreService');
//#endregion
// #region User Data Sync Headers
export const HEADER_OPERATION_ID = 'x-operation-id';
export const HEADER_EXECUTION_ID = 'X-Execution-Id';
export function createSyncHeaders(executionId) {
    const headers = {};
    headers[HEADER_EXECUTION_ID] = executionId;
    return headers;
}
//#endregion
// #region User Data Sync Error
export var UserDataSyncErrorCode;
(function (UserDataSyncErrorCode) {
    // Client Errors (>= 400 )
    UserDataSyncErrorCode["Unauthorized"] = "Unauthorized";
    UserDataSyncErrorCode["Forbidden"] = "Forbidden";
    UserDataSyncErrorCode["NotFound"] = "NotFound";
    UserDataSyncErrorCode["MethodNotFound"] = "MethodNotFound";
    UserDataSyncErrorCode["Conflict"] = "Conflict";
    UserDataSyncErrorCode["Gone"] = "Gone";
    UserDataSyncErrorCode["PreconditionFailed"] = "PreconditionFailed";
    UserDataSyncErrorCode["TooLarge"] = "TooLarge";
    UserDataSyncErrorCode["UpgradeRequired"] = "UpgradeRequired";
    UserDataSyncErrorCode["PreconditionRequired"] = "PreconditionRequired";
    UserDataSyncErrorCode["TooManyRequests"] = "RemoteTooManyRequests";
    UserDataSyncErrorCode["TooManyRequestsAndRetryAfter"] = "TooManyRequestsAndRetryAfter";
    // Local Errors
    UserDataSyncErrorCode["RequestFailed"] = "RequestFailed";
    UserDataSyncErrorCode["RequestCanceled"] = "RequestCanceled";
    UserDataSyncErrorCode["RequestTimeout"] = "RequestTimeout";
    UserDataSyncErrorCode["RequestProtocolNotSupported"] = "RequestProtocolNotSupported";
    UserDataSyncErrorCode["RequestPathNotEscaped"] = "RequestPathNotEscaped";
    UserDataSyncErrorCode["RequestHeadersNotObject"] = "RequestHeadersNotObject";
    UserDataSyncErrorCode["NoCollection"] = "NoCollection";
    UserDataSyncErrorCode["NoRef"] = "NoRef";
    UserDataSyncErrorCode["EmptyResponse"] = "EmptyResponse";
    UserDataSyncErrorCode["TurnedOff"] = "TurnedOff";
    UserDataSyncErrorCode["SessionExpired"] = "SessionExpired";
    UserDataSyncErrorCode["ServiceChanged"] = "ServiceChanged";
    UserDataSyncErrorCode["DefaultServiceChanged"] = "DefaultServiceChanged";
    UserDataSyncErrorCode["LocalTooManyProfiles"] = "LocalTooManyProfiles";
    UserDataSyncErrorCode["LocalTooManyRequests"] = "LocalTooManyRequests";
    UserDataSyncErrorCode["LocalPreconditionFailed"] = "LocalPreconditionFailed";
    UserDataSyncErrorCode["LocalInvalidContent"] = "LocalInvalidContent";
    UserDataSyncErrorCode["LocalError"] = "LocalError";
    UserDataSyncErrorCode["IncompatibleLocalContent"] = "IncompatibleLocalContent";
    UserDataSyncErrorCode["IncompatibleRemoteContent"] = "IncompatibleRemoteContent";
    UserDataSyncErrorCode["Unknown"] = "Unknown";
})(UserDataSyncErrorCode || (UserDataSyncErrorCode = {}));
export class UserDataSyncError extends Error {
    constructor(message, code, resource, operationId) {
        super(message);
        this.code = code;
        this.resource = resource;
        this.operationId = operationId;
        this.name = `${this.code} (UserDataSyncError) syncResource:${this.resource || 'unknown'} operationId:${this.operationId || 'unknown'}`;
    }
}
export class UserDataSyncStoreError extends UserDataSyncError {
    constructor(message, url, code, serverCode, operationId) {
        super(message, code, undefined, operationId);
        this.url = url;
        this.serverCode = serverCode;
    }
}
export class UserDataAutoSyncError extends UserDataSyncError {
    constructor(message, code) {
        super(message, code);
    }
}
(function (UserDataSyncError) {
    function toUserDataSyncError(error) {
        if (error instanceof UserDataSyncError) {
            return error;
        }
        const match = /^(.+) \(UserDataSyncError\) syncResource:(.+) operationId:(.+)$/.exec(error.name);
        if (match && match[1]) {
            const syncResource = match[2] === 'unknown' ? undefined : match[2];
            const operationId = match[3] === 'unknown' ? undefined : match[3];
            return new UserDataSyncError(error.message, match[1], syncResource, operationId);
        }
        return new UserDataSyncError(error.message, "Unknown" /* UserDataSyncErrorCode.Unknown */);
    }
    UserDataSyncError.toUserDataSyncError = toUserDataSyncError;
})(UserDataSyncError || (UserDataSyncError = {}));
export var SyncStatus;
(function (SyncStatus) {
    SyncStatus["Uninitialized"] = "uninitialized";
    SyncStatus["Idle"] = "idle";
    SyncStatus["Syncing"] = "syncing";
    SyncStatus["HasConflicts"] = "hasConflicts";
})(SyncStatus || (SyncStatus = {}));
export var Change;
(function (Change) {
    Change[Change["None"] = 0] = "None";
    Change[Change["Added"] = 1] = "Added";
    Change[Change["Modified"] = 2] = "Modified";
    Change[Change["Deleted"] = 3] = "Deleted";
})(Change || (Change = {}));
export var MergeState;
(function (MergeState) {
    MergeState["Preview"] = "preview";
    MergeState["Conflict"] = "conflict";
    MergeState["Accepted"] = "accepted";
})(MergeState || (MergeState = {}));
//#endregion
// #region keys synced only in web
export const SYNC_SERVICE_URL_TYPE = 'sync.store.url.type';
export function getEnablementKey(resource) { return `sync.enable.${resource}`; }
// #endregion
// #region User Data Sync Services
export const IUserDataSyncEnablementService = createDecorator('IUserDataSyncEnablementService');
export const IUserDataSyncService = createDecorator('IUserDataSyncService');
export const IUserDataSyncResourceProviderService = createDecorator('IUserDataSyncResourceProviderService');
export const IUserDataAutoSyncService = createDecorator('IUserDataAutoSyncService');
export const IUserDataSyncUtilService = createDecorator('IUserDataSyncUtilService');
export const IUserDataSyncLogService = createDecorator('IUserDataSyncLogService');
//#endregion
export const USER_DATA_SYNC_LOG_ID = 'userDataSync';
export const USER_DATA_SYNC_SCHEME = 'vscode-userdata-sync';
export const PREVIEW_DIR_NAME = 'preview';
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFTeW5jLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3VzZXJEYXRhU3luYy9jb21tb24vdXNlckRhdGFTeW5jLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQVExRCxPQUFPLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBR25FLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUMzQyxPQUFPLEVBQUUsV0FBVyxFQUFzQixVQUFVLElBQUksdUJBQXVCLEVBQWtFLDZCQUE2QixFQUFFLFVBQVUsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBRXhQLE9BQU8sRUFBRSw0QkFBNEIsRUFBd0IsTUFBTSx5REFBeUQsQ0FBQztBQUU3SCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDOUUsT0FBTyxFQUFFLFVBQVUsSUFBSSxjQUFjLEVBQTZCLE1BQU0sc0RBQXNELENBQUM7QUFFL0gsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBSTdELE1BQU0sVUFBVSw0QkFBNEI7SUFDM0MsTUFBTSxXQUFXLEdBQUcsUUFBUSxDQUFDLEVBQUUsQ0FBeUIsdUJBQXVCLENBQUMsYUFBYSxDQUFDLENBQUMsMEJBQTBCLEVBQUUsQ0FBQztJQUM1SCxPQUFPLE1BQU0sQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO0FBQzlGLENBQUM7QUFFRCxNQUFNLFVBQVUseUJBQXlCLENBQUMsb0JBQTZCLEtBQUs7SUFDM0UsTUFBTSxXQUFXLEdBQUcsUUFBUSxDQUFDLEVBQUUsQ0FBeUIsdUJBQXVCLENBQUMsYUFBYSxDQUFDLENBQUMsMEJBQTBCLEVBQUUsQ0FBQztJQUM1SCxNQUFNLGVBQWUsR0FBRyxrQkFBa0IsQ0FBQyxXQUFXLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztJQUMzRSxNQUFNLGtCQUFrQixHQUFHLDRCQUE0QixFQUFFLENBQUM7SUFDMUQsT0FBTyxRQUFRLENBQUMsQ0FBQyxHQUFHLGVBQWUsRUFBRSxHQUFHLGtCQUFrQixDQUFDLENBQUMsQ0FBQztBQUM5RCxDQUFDO0FBRUQsTUFBTSxVQUFVLDhCQUE4QixDQUFDLFFBQTRCO0lBQzFFLElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVyxFQUFFLGFBQWEsRUFBRSxDQUFDO1FBQzFDLE9BQU8sRUFBRSxDQUFDO0lBQ1gsQ0FBQztJQUNELE1BQU0sY0FBYyxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxhQUFhLENBQUMsQ0FBQztJQUNySixJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQzVCLE9BQU8sRUFBRSxDQUFDO0lBQ1gsQ0FBQztJQUNELE1BQU0sVUFBVSxHQUFHLDZCQUE2QixDQUFDLGNBQWMsQ0FBQyxDQUFDO0lBQ2pFLE9BQU8sa0JBQWtCLENBQUMsVUFBVSxFQUFFLEtBQUssQ0FBQyxDQUFDO0FBQzlDLENBQUM7QUFFRCxTQUFTLGtCQUFrQixDQUFDLFVBQXFFLEVBQUUsaUJBQTBCO0lBQzVILE1BQU0sZUFBZSxHQUFHLElBQUksR0FBRyxFQUFVLENBQUM7SUFDMUMsS0FBSyxNQUFNLEdBQUcsSUFBSSxVQUFVLEVBQUUsQ0FBQztRQUM5QixJQUFJLGlCQUFpQixJQUFJLENBQUMsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDbkQsU0FBUztRQUNWLENBQUM7UUFDRCxNQUFNLEtBQUssR0FBRyxRQUFRLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDO1FBQzFHLElBQUksVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDLFVBQVU7ZUFDMUIsS0FBSyx1Q0FBK0I7ZUFDcEMsS0FBSyxtREFBMkMsRUFDbEQsQ0FBQztZQUNGLGVBQWUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDMUIsQ0FBQztJQUNGLENBQUM7SUFDRCxPQUFPLENBQUMsR0FBRyxlQUFlLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQztBQUN0QyxDQUFDO0FBRUQsTUFBTSxDQUFDLE1BQU0sa0NBQWtDLEdBQUcsY0FBYyxDQUFDO0FBUWpFLE1BQU0sQ0FBQyxNQUFNLG9DQUFvQyxHQUFHLHFDQUFxQyxDQUFDO0FBRTFGLE1BQU0sVUFBVSxxQkFBcUI7SUFDcEMsTUFBTSx1QkFBdUIsR0FBRyxrQ0FBa0MsQ0FBQztJQUNuRSxNQUFNLHFCQUFxQixHQUFHLFFBQVEsQ0FBQyxFQUFFLENBQXlCLHVCQUF1QixDQUFDLGFBQWEsQ0FBQyxDQUFDO0lBQ3pHLHFCQUFxQixDQUFDLHFCQUFxQixDQUFDO1FBQzNDLEVBQUUsRUFBRSxjQUFjO1FBQ2xCLEtBQUssRUFBRSxFQUFFO1FBQ1QsS0FBSyxFQUFFLFFBQVEsQ0FBQyxlQUFlLEVBQUUsZUFBZSxDQUFDO1FBQ2pELElBQUksRUFBRSxRQUFRO1FBQ2QsVUFBVSxFQUFFO1lBQ1gsQ0FBQyxvQ0FBb0MsQ0FBQyxFQUFFO2dCQUN2QyxJQUFJLEVBQUUsU0FBUztnQkFDZixXQUFXLEVBQUUsUUFBUSxDQUFDLHFDQUFxQyxFQUFFLDRDQUE0QyxDQUFDO2dCQUMxRyxPQUFPLEVBQUUsSUFBSTtnQkFDYixLQUFLLHdDQUFnQztnQkFDckMsSUFBSSxFQUFFLENBQUMsTUFBTSxFQUFFLG9CQUFvQixDQUFDO2FBQ3BDO1lBQ0QsZ0NBQWdDLEVBQUU7Z0JBQ2pDLE1BQU0sRUFBRSxPQUFPO2dCQUNmLG1CQUFtQixFQUFFLFFBQVEsQ0FBQyxnQ0FBZ0MsRUFBRSxzSkFBc0osQ0FBQztnQkFDdk4sS0FBSyxFQUFFLENBQUM7d0JBQ1AsSUFBSSxFQUFFLFFBQVE7d0JBQ2QsT0FBTyxFQUFFLDRCQUE0Qjt3QkFDckMsWUFBWSxFQUFFLFFBQVEsQ0FBQyx1Q0FBdUMsRUFBRSxtRUFBbUUsQ0FBQztxQkFDcEksQ0FBQztnQkFDRixTQUFTLEVBQUUsRUFBRTtnQkFDYixPQUFPLHdDQUFnQztnQkFDdkMsV0FBVyxFQUFFLElBQUk7Z0JBQ2pCLGtCQUFrQixFQUFFLElBQUk7Z0JBQ3hCLElBQUksRUFBRSxDQUFDLE1BQU0sRUFBRSxvQkFBb0IsQ0FBQzthQUNwQztZQUNELDhCQUE4QixFQUFFO2dCQUMvQixNQUFNLEVBQUUsT0FBTztnQkFDZixXQUFXLEVBQUUsUUFBUSxDQUFDLDhCQUE4QixFQUFFLHVEQUF1RCxDQUFDO2dCQUM5RyxTQUFTLEVBQUUsRUFBRTtnQkFDYixPQUFPLHdDQUFnQztnQkFDdkMsSUFBSSxFQUFFLHVCQUF1QjtnQkFDN0Isb0JBQW9CLEVBQUUsSUFBSTtnQkFDMUIsV0FBVyxFQUFFLElBQUk7Z0JBQ2pCLGtCQUFrQixFQUFFLElBQUk7Z0JBQ3hCLElBQUksRUFBRSxDQUFDLE1BQU0sRUFBRSxvQkFBb0IsQ0FBQzthQUNwQztTQUNEO0tBQ0QsQ0FBQyxDQUFDO0lBQ0gsTUFBTSxZQUFZLEdBQUcsUUFBUSxDQUFDLEVBQUUsQ0FBNEIsY0FBYyxDQUFDLGdCQUFnQixDQUFDLENBQUM7SUFDN0YsTUFBTSw2QkFBNkIsR0FBRyxHQUFHLEVBQUU7UUFDMUMsTUFBTSx5QkFBeUIsR0FBRyw0QkFBNEIsRUFBRSxDQUFDO1FBQ2pFLE1BQU0sc0JBQXNCLEdBQUcseUJBQXlCLEVBQUUsQ0FBQztRQUMzRCxNQUFNLFFBQVEsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDLHNCQUFzQixDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1FBQ2xILE1BQU0sZUFBZSxHQUFHLHNCQUFzQixDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUMseUJBQXlCLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7UUFDL0csTUFBTSxxQkFBcUIsR0FBZ0I7WUFDMUMsS0FBSyxFQUFFO2dCQUNOLElBQUksRUFBRSxRQUFRO2dCQUNkLElBQUksRUFBRSxDQUFDLEdBQUcsUUFBUSxFQUFFLEdBQUcsZUFBZSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLElBQUksT0FBTyxFQUFFLENBQUMsQ0FBQzthQUNyRTtTQUNELENBQUM7UUFDRixZQUFZLENBQUMsY0FBYyxDQUFDLHVCQUF1QixFQUFFLHFCQUFxQixDQUFDLENBQUM7SUFDN0UsQ0FBQyxDQUFDO0lBQ0YsT0FBTyxxQkFBcUIsQ0FBQyx3QkFBd0IsQ0FBQyxHQUFHLEVBQUUsQ0FBQyw2QkFBNkIsRUFBRSxDQUFDLENBQUM7QUFDOUYsQ0FBQztBQXFCRCxNQUFNLFVBQVUsd0JBQXdCLENBQUMsS0FBVTtJQUNsRCxPQUFPLEtBQUs7V0FDUixRQUFRLENBQUMsS0FBSyxDQUFDO1dBQ2YsUUFBUSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7V0FDbEIsS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDakMsQ0FBQztBQUVELE1BQU0sQ0FBTixJQUFrQixZQVVqQjtBQVZELFdBQWtCLFlBQVk7SUFDN0IscUNBQXFCLENBQUE7SUFDckIsMkNBQTJCLENBQUE7SUFDM0IscUNBQXFCLENBQUE7SUFDckIsbUNBQW1CLENBQUE7SUFDbkIsK0JBQWUsQ0FBQTtJQUNmLHlDQUF5QixDQUFBO0lBQ3pCLDJDQUEyQixDQUFBO0lBQzNCLHFDQUFxQixDQUFBO0lBQ3JCLGlEQUFpQyxDQUFBO0FBQ2xDLENBQUMsRUFWaUIsWUFBWSxLQUFaLFlBQVksUUFVN0I7QUFDRCxNQUFNLENBQUMsTUFBTSxrQkFBa0IsR0FBbUIsd1VBQTRMLENBQUM7QUFFL08sTUFBTSxVQUFVLGVBQWUsQ0FBQyxVQUE4QixFQUFFLEdBQUcsS0FBZTtJQUNqRixPQUFPLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLEVBQUUsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO0FBQ3BELENBQUM7QUFFRCxNQUFNLFVBQVUsc0JBQXNCLENBQUMsVUFBOEIsRUFBRSxZQUEwQixFQUFFLGtCQUF1QyxFQUFFLE1BQWU7SUFDMUosT0FBTyxNQUFNLENBQUMsUUFBUSxDQUFDLGtCQUFrQixDQUFDLGdCQUFnQixFQUFFLEdBQUcsZUFBZSxDQUFDLFVBQVUsRUFBRSxZQUFZLEVBQUUsV0FBVyxZQUFZLE9BQU8sQ0FBQyxDQUFDLENBQUM7QUFDM0ksQ0FBQztBQXNDRCxNQUFNLENBQUMsTUFBTSxtQ0FBbUMsR0FBRyxlQUFlLENBQXNDLHFDQUFxQyxDQUFDLENBQUM7QUFTL0ksTUFBTSxDQUFDLE1BQU0seUJBQXlCLEdBQUcsZUFBZSxDQUE0QiwyQkFBMkIsQ0FBQyxDQUFDO0FBMEJqSCxNQUFNLENBQUMsTUFBTSw4QkFBOEIsR0FBRyxlQUFlLENBQWlDLGdDQUFnQyxDQUFDLENBQUM7QUFRaEksWUFBWTtBQUVaLGlDQUFpQztBQUVqQyxNQUFNLENBQUMsTUFBTSxtQkFBbUIsR0FBRyxnQkFBZ0IsQ0FBQztBQUNwRCxNQUFNLENBQUMsTUFBTSxtQkFBbUIsR0FBRyxnQkFBZ0IsQ0FBQztBQUVwRCxNQUFNLFVBQVUsaUJBQWlCLENBQUMsV0FBbUI7SUFDcEQsTUFBTSxPQUFPLEdBQWEsRUFBRSxDQUFDO0lBQzdCLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLFdBQVcsQ0FBQztJQUMzQyxPQUFPLE9BQU8sQ0FBQztBQUNoQixDQUFDO0FBRUQsWUFBWTtBQUVaLCtCQUErQjtBQUUvQixNQUFNLENBQU4sSUFBa0IscUJBc0NqQjtBQXRDRCxXQUFrQixxQkFBcUI7SUFDdEMsMEJBQTBCO0lBQzFCLHNEQUE2QixDQUFBO0lBQzdCLGdEQUF1QixDQUFBO0lBQ3ZCLDhDQUFxQixDQUFBO0lBQ3JCLDBEQUFpQyxDQUFBO0lBQ2pDLDhDQUFxQixDQUFBO0lBQ3JCLHNDQUFhLENBQUE7SUFDYixrRUFBeUMsQ0FBQTtJQUN6Qyw4Q0FBcUIsQ0FBQTtJQUNyQiw0REFBbUMsQ0FBQTtJQUNuQyxzRUFBNkMsQ0FBQTtJQUM3QyxrRUFBeUMsQ0FBQTtJQUN6QyxzRkFBNkQsQ0FBQTtJQUU3RCxlQUFlO0lBQ2Ysd0RBQStCLENBQUE7SUFDL0IsNERBQW1DLENBQUE7SUFDbkMsMERBQWlDLENBQUE7SUFDakMsb0ZBQTJELENBQUE7SUFDM0Qsd0VBQStDLENBQUE7SUFDL0MsNEVBQW1ELENBQUE7SUFDbkQsc0RBQTZCLENBQUE7SUFDN0Isd0NBQWUsQ0FBQTtJQUNmLHdEQUErQixDQUFBO0lBQy9CLGdEQUF1QixDQUFBO0lBQ3ZCLDBEQUFpQyxDQUFBO0lBQ2pDLDBEQUFpQyxDQUFBO0lBQ2pDLHdFQUErQyxDQUFBO0lBQy9DLHNFQUE2QyxDQUFBO0lBQzdDLHNFQUE2QyxDQUFBO0lBQzdDLDRFQUFtRCxDQUFBO0lBQ25ELG9FQUEyQyxDQUFBO0lBQzNDLGtEQUF5QixDQUFBO0lBQ3pCLDhFQUFxRCxDQUFBO0lBQ3JELGdGQUF1RCxDQUFBO0lBRXZELDRDQUFtQixDQUFBO0FBQ3BCLENBQUMsRUF0Q2lCLHFCQUFxQixLQUFyQixxQkFBcUIsUUFzQ3RDO0FBRUQsTUFBTSxPQUFPLGlCQUFrQixTQUFRLEtBQUs7SUFFM0MsWUFDQyxPQUFlLEVBQ04sSUFBMkIsRUFDM0IsUUFBdUIsRUFDdkIsV0FBb0I7UUFFN0IsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBSk4sU0FBSSxHQUFKLElBQUksQ0FBdUI7UUFDM0IsYUFBUSxHQUFSLFFBQVEsQ0FBZTtRQUN2QixnQkFBVyxHQUFYLFdBQVcsQ0FBUztRQUc3QixJQUFJLENBQUMsSUFBSSxHQUFHLEdBQUcsSUFBSSxDQUFDLElBQUkscUNBQXFDLElBQUksQ0FBQyxRQUFRLElBQUksU0FBUyxnQkFBZ0IsSUFBSSxDQUFDLFdBQVcsSUFBSSxTQUFTLEVBQUUsQ0FBQztJQUN4SSxDQUFDO0NBRUQ7QUFFRCxNQUFNLE9BQU8sc0JBQXVCLFNBQVEsaUJBQWlCO0lBQzVELFlBQVksT0FBZSxFQUFXLEdBQVcsRUFBRSxJQUEyQixFQUFXLFVBQThCLEVBQUUsV0FBK0I7UUFDdkosS0FBSyxDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBRFIsUUFBRyxHQUFILEdBQUcsQ0FBUTtRQUF3QyxlQUFVLEdBQVYsVUFBVSxDQUFvQjtJQUV2SCxDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8scUJBQXNCLFNBQVEsaUJBQWlCO0lBQzNELFlBQVksT0FBZSxFQUFFLElBQTJCO1FBQ3ZELEtBQUssQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDdEIsQ0FBQztDQUNEO0FBRUQsV0FBaUIsaUJBQWlCO0lBRWpDLFNBQWdCLG1CQUFtQixDQUFDLEtBQVk7UUFDL0MsSUFBSSxLQUFLLFlBQVksaUJBQWlCLEVBQUUsQ0FBQztZQUN4QyxPQUFPLEtBQUssQ0FBQztRQUNkLENBQUM7UUFDRCxNQUFNLEtBQUssR0FBRyxpRUFBaUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2pHLElBQUksS0FBSyxJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQ3ZCLE1BQU0sWUFBWSxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxTQUFTLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBaUIsQ0FBQztZQUNuRixNQUFNLFdBQVcsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssU0FBUyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNsRSxPQUFPLElBQUksaUJBQWlCLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBeUIsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLFlBQVksRUFBRSxXQUFXLENBQUMsQ0FBQztRQUN6RyxDQUFDO1FBQ0QsT0FBTyxJQUFJLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxPQUFPLGdEQUFnQyxDQUFDO0lBQzVFLENBQUM7SUFYZSxxQ0FBbUIsc0JBV2xDLENBQUE7QUFFRixDQUFDLEVBZmdCLGlCQUFpQixLQUFqQixpQkFBaUIsUUFlakM7QUEwREQsTUFBTSxDQUFOLElBQWtCLFVBS2pCO0FBTEQsV0FBa0IsVUFBVTtJQUMzQiw2Q0FBK0IsQ0FBQTtJQUMvQiwyQkFBYSxDQUFBO0lBQ2IsaUNBQW1CLENBQUE7SUFDbkIsMkNBQTZCLENBQUE7QUFDOUIsQ0FBQyxFQUxpQixVQUFVLEtBQVYsVUFBVSxRQUszQjtBQWtCRCxNQUFNLENBQU4sSUFBa0IsTUFLakI7QUFMRCxXQUFrQixNQUFNO0lBQ3ZCLG1DQUFJLENBQUE7SUFDSixxQ0FBSyxDQUFBO0lBQ0wsMkNBQVEsQ0FBQTtJQUNSLHlDQUFPLENBQUE7QUFDUixDQUFDLEVBTGlCLE1BQU0sS0FBTixNQUFNLFFBS3ZCO0FBRUQsTUFBTSxDQUFOLElBQWtCLFVBSWpCO0FBSkQsV0FBa0IsVUFBVTtJQUMzQixpQ0FBbUIsQ0FBQTtJQUNuQixtQ0FBcUIsQ0FBQTtJQUNyQixtQ0FBcUIsQ0FBQTtBQUN0QixDQUFDLEVBSmlCLFVBQVUsS0FBVixVQUFVLFFBSTNCO0FBMkRELFlBQVk7QUFFWixrQ0FBa0M7QUFFbEMsTUFBTSxDQUFDLE1BQU0scUJBQXFCLEdBQUcscUJBQXFCLENBQUM7QUFDM0QsTUFBTSxVQUFVLGdCQUFnQixDQUFDLFFBQXNCLElBQUksT0FBTyxlQUFlLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQztBQUU5RixhQUFhO0FBRWIsa0NBQWtDO0FBQ2xDLE1BQU0sQ0FBQyxNQUFNLDhCQUE4QixHQUFHLGVBQWUsQ0FBaUMsZ0NBQWdDLENBQUMsQ0FBQztBQW1DaEksTUFBTSxDQUFDLE1BQU0sb0JBQW9CLEdBQUcsZUFBZSxDQUF1QixzQkFBc0IsQ0FBQyxDQUFDO0FBcUNsRyxNQUFNLENBQUMsTUFBTSxvQ0FBb0MsR0FBRyxlQUFlLENBQXVDLHNDQUFzQyxDQUFDLENBQUM7QUFnQmxKLE1BQU0sQ0FBQyxNQUFNLHdCQUF3QixHQUFHLGVBQWUsQ0FBMkIsMEJBQTBCLENBQUMsQ0FBQztBQVM5RyxNQUFNLENBQUMsTUFBTSx3QkFBd0IsR0FBRyxlQUFlLENBQTJCLDBCQUEwQixDQUFDLENBQUM7QUFROUcsTUFBTSxDQUFDLE1BQU0sdUJBQXVCLEdBQUcsZUFBZSxDQUEwQix5QkFBeUIsQ0FBQyxDQUFDO0FBUzNHLFlBQVk7QUFFWixNQUFNLENBQUMsTUFBTSxxQkFBcUIsR0FBRyxjQUFjLENBQUM7QUFDcEQsTUFBTSxDQUFDLE1BQU0scUJBQXFCLEdBQUcsc0JBQXNCLENBQUM7QUFDNUQsTUFBTSxDQUFDLE1BQU0sZ0JBQWdCLEdBQUcsU0FBUyxDQUFDIn0=