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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFTeW5jLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS91c2VyRGF0YVN5bmMvY29tbW9uL3VzZXJEYXRhU3luYy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFRMUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUduRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDM0MsT0FBTyxFQUFFLFdBQVcsRUFBc0IsVUFBVSxJQUFJLHVCQUF1QixFQUFrRSw2QkFBNkIsRUFBRSxVQUFVLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUV4UCxPQUFPLEVBQUUsNEJBQTRCLEVBQXdCLE1BQU0seURBQXlELENBQUM7QUFFN0gsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxVQUFVLElBQUksY0FBYyxFQUE2QixNQUFNLHNEQUFzRCxDQUFDO0FBRS9ILE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUk3RCxNQUFNLFVBQVUsNEJBQTRCO0lBQzNDLE1BQU0sV0FBVyxHQUFHLFFBQVEsQ0FBQyxFQUFFLENBQXlCLHVCQUF1QixDQUFDLGFBQWEsQ0FBQyxDQUFDLDBCQUEwQixFQUFFLENBQUM7SUFDNUgsT0FBTyxNQUFNLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUMsa0JBQWtCLENBQUMsQ0FBQztBQUM5RixDQUFDO0FBRUQsTUFBTSxVQUFVLHlCQUF5QixDQUFDLG9CQUE2QixLQUFLO0lBQzNFLE1BQU0sV0FBVyxHQUFHLFFBQVEsQ0FBQyxFQUFFLENBQXlCLHVCQUF1QixDQUFDLGFBQWEsQ0FBQyxDQUFDLDBCQUEwQixFQUFFLENBQUM7SUFDNUgsTUFBTSxlQUFlLEdBQUcsa0JBQWtCLENBQUMsV0FBVyxFQUFFLGlCQUFpQixDQUFDLENBQUM7SUFDM0UsTUFBTSxrQkFBa0IsR0FBRyw0QkFBNEIsRUFBRSxDQUFDO0lBQzFELE9BQU8sUUFBUSxDQUFDLENBQUMsR0FBRyxlQUFlLEVBQUUsR0FBRyxrQkFBa0IsQ0FBQyxDQUFDLENBQUM7QUFDOUQsQ0FBQztBQUVELE1BQU0sVUFBVSw4QkFBOEIsQ0FBQyxRQUE0QjtJQUMxRSxJQUFJLENBQUMsUUFBUSxDQUFDLFdBQVcsRUFBRSxhQUFhLEVBQUUsQ0FBQztRQUMxQyxPQUFPLEVBQUUsQ0FBQztJQUNYLENBQUM7SUFDRCxNQUFNLGNBQWMsR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsYUFBYSxDQUFDLENBQUM7SUFDckosSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUM1QixPQUFPLEVBQUUsQ0FBQztJQUNYLENBQUM7SUFDRCxNQUFNLFVBQVUsR0FBRyw2QkFBNkIsQ0FBQyxjQUFjLENBQUMsQ0FBQztJQUNqRSxPQUFPLGtCQUFrQixDQUFDLFVBQVUsRUFBRSxLQUFLLENBQUMsQ0FBQztBQUM5QyxDQUFDO0FBRUQsU0FBUyxrQkFBa0IsQ0FBQyxVQUFxRSxFQUFFLGlCQUEwQjtJQUM1SCxNQUFNLGVBQWUsR0FBRyxJQUFJLEdBQUcsRUFBVSxDQUFDO0lBQzFDLEtBQUssTUFBTSxHQUFHLElBQUksVUFBVSxFQUFFLENBQUM7UUFDOUIsSUFBSSxpQkFBaUIsSUFBSSxDQUFDLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ25ELFNBQVM7UUFDVixDQUFDO1FBQ0QsTUFBTSxLQUFLLEdBQUcsUUFBUSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQztRQUMxRyxJQUFJLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxVQUFVO2VBQzFCLEtBQUssdUNBQStCO2VBQ3BDLEtBQUssbURBQTJDLEVBQ2xELENBQUM7WUFDRixlQUFlLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQzFCLENBQUM7SUFDRixDQUFDO0lBQ0QsT0FBTyxDQUFDLEdBQUcsZUFBZSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7QUFDdEMsQ0FBQztBQUVELE1BQU0sQ0FBQyxNQUFNLGtDQUFrQyxHQUFHLGNBQWMsQ0FBQztBQVFqRSxNQUFNLENBQUMsTUFBTSxvQ0FBb0MsR0FBRyxxQ0FBcUMsQ0FBQztBQUUxRixNQUFNLFVBQVUscUJBQXFCO0lBQ3BDLE1BQU0sdUJBQXVCLEdBQUcsa0NBQWtDLENBQUM7SUFDbkUsTUFBTSxxQkFBcUIsR0FBRyxRQUFRLENBQUMsRUFBRSxDQUF5Qix1QkFBdUIsQ0FBQyxhQUFhLENBQUMsQ0FBQztJQUN6RyxxQkFBcUIsQ0FBQyxxQkFBcUIsQ0FBQztRQUMzQyxFQUFFLEVBQUUsY0FBYztRQUNsQixLQUFLLEVBQUUsRUFBRTtRQUNULEtBQUssRUFBRSxRQUFRLENBQUMsZUFBZSxFQUFFLGVBQWUsQ0FBQztRQUNqRCxJQUFJLEVBQUUsUUFBUTtRQUNkLFVBQVUsRUFBRTtZQUNYLENBQUMsb0NBQW9DLENBQUMsRUFBRTtnQkFDdkMsSUFBSSxFQUFFLFNBQVM7Z0JBQ2YsV0FBVyxFQUFFLFFBQVEsQ0FBQyxxQ0FBcUMsRUFBRSw0Q0FBNEMsQ0FBQztnQkFDMUcsT0FBTyxFQUFFLElBQUk7Z0JBQ2IsS0FBSyx3Q0FBZ0M7Z0JBQ3JDLElBQUksRUFBRSxDQUFDLE1BQU0sRUFBRSxvQkFBb0IsQ0FBQzthQUNwQztZQUNELGdDQUFnQyxFQUFFO2dCQUNqQyxNQUFNLEVBQUUsT0FBTztnQkFDZixtQkFBbUIsRUFBRSxRQUFRLENBQUMsZ0NBQWdDLEVBQUUsc0pBQXNKLENBQUM7Z0JBQ3ZOLEtBQUssRUFBRSxDQUFDO3dCQUNQLElBQUksRUFBRSxRQUFRO3dCQUNkLE9BQU8sRUFBRSw0QkFBNEI7d0JBQ3JDLFlBQVksRUFBRSxRQUFRLENBQUMsdUNBQXVDLEVBQUUsbUVBQW1FLENBQUM7cUJBQ3BJLENBQUM7Z0JBQ0YsU0FBUyxFQUFFLEVBQUU7Z0JBQ2IsT0FBTyx3Q0FBZ0M7Z0JBQ3ZDLFdBQVcsRUFBRSxJQUFJO2dCQUNqQixrQkFBa0IsRUFBRSxJQUFJO2dCQUN4QixJQUFJLEVBQUUsQ0FBQyxNQUFNLEVBQUUsb0JBQW9CLENBQUM7YUFDcEM7WUFDRCw4QkFBOEIsRUFBRTtnQkFDL0IsTUFBTSxFQUFFLE9BQU87Z0JBQ2YsV0FBVyxFQUFFLFFBQVEsQ0FBQyw4QkFBOEIsRUFBRSx1REFBdUQsQ0FBQztnQkFDOUcsU0FBUyxFQUFFLEVBQUU7Z0JBQ2IsT0FBTyx3Q0FBZ0M7Z0JBQ3ZDLElBQUksRUFBRSx1QkFBdUI7Z0JBQzdCLG9CQUFvQixFQUFFLElBQUk7Z0JBQzFCLFdBQVcsRUFBRSxJQUFJO2dCQUNqQixrQkFBa0IsRUFBRSxJQUFJO2dCQUN4QixJQUFJLEVBQUUsQ0FBQyxNQUFNLEVBQUUsb0JBQW9CLENBQUM7YUFDcEM7U0FDRDtLQUNELENBQUMsQ0FBQztJQUNILE1BQU0sWUFBWSxHQUFHLFFBQVEsQ0FBQyxFQUFFLENBQTRCLGNBQWMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0lBQzdGLE1BQU0sNkJBQTZCLEdBQUcsR0FBRyxFQUFFO1FBQzFDLE1BQU0seUJBQXlCLEdBQUcsNEJBQTRCLEVBQUUsQ0FBQztRQUNqRSxNQUFNLHNCQUFzQixHQUFHLHlCQUF5QixFQUFFLENBQUM7UUFDM0QsTUFBTSxRQUFRLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQyxzQkFBc0IsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztRQUNsSCxNQUFNLGVBQWUsR0FBRyxzQkFBc0IsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDLHlCQUF5QixDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1FBQy9HLE1BQU0scUJBQXFCLEdBQWdCO1lBQzFDLEtBQUssRUFBRTtnQkFDTixJQUFJLEVBQUUsUUFBUTtnQkFDZCxJQUFJLEVBQUUsQ0FBQyxHQUFHLFFBQVEsRUFBRSxHQUFHLGVBQWUsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxJQUFJLE9BQU8sRUFBRSxDQUFDLENBQUM7YUFDckU7U0FDRCxDQUFDO1FBQ0YsWUFBWSxDQUFDLGNBQWMsQ0FBQyx1QkFBdUIsRUFBRSxxQkFBcUIsQ0FBQyxDQUFDO0lBQzdFLENBQUMsQ0FBQztJQUNGLE9BQU8scUJBQXFCLENBQUMsd0JBQXdCLENBQUMsR0FBRyxFQUFFLENBQUMsNkJBQTZCLEVBQUUsQ0FBQyxDQUFDO0FBQzlGLENBQUM7QUFxQkQsTUFBTSxVQUFVLHdCQUF3QixDQUFDLEtBQVU7SUFDbEQsT0FBTyxLQUFLO1dBQ1IsUUFBUSxDQUFDLEtBQUssQ0FBQztXQUNmLFFBQVEsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1dBQ2xCLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQ2pDLENBQUM7QUFFRCxNQUFNLENBQU4sSUFBa0IsWUFVakI7QUFWRCxXQUFrQixZQUFZO0lBQzdCLHFDQUFxQixDQUFBO0lBQ3JCLDJDQUEyQixDQUFBO0lBQzNCLHFDQUFxQixDQUFBO0lBQ3JCLG1DQUFtQixDQUFBO0lBQ25CLCtCQUFlLENBQUE7SUFDZix5Q0FBeUIsQ0FBQTtJQUN6QiwyQ0FBMkIsQ0FBQTtJQUMzQixxQ0FBcUIsQ0FBQTtJQUNyQixpREFBaUMsQ0FBQTtBQUNsQyxDQUFDLEVBVmlCLFlBQVksS0FBWixZQUFZLFFBVTdCO0FBQ0QsTUFBTSxDQUFDLE1BQU0sa0JBQWtCLEdBQW1CLHdVQUE0TCxDQUFDO0FBRS9PLE1BQU0sVUFBVSxlQUFlLENBQUMsVUFBOEIsRUFBRSxHQUFHLEtBQWU7SUFDakYsT0FBTyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxFQUFFLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztBQUNwRCxDQUFDO0FBRUQsTUFBTSxVQUFVLHNCQUFzQixDQUFDLFVBQThCLEVBQUUsWUFBMEIsRUFBRSxrQkFBdUMsRUFBRSxNQUFlO0lBQzFKLE9BQU8sTUFBTSxDQUFDLFFBQVEsQ0FBQyxrQkFBa0IsQ0FBQyxnQkFBZ0IsRUFBRSxHQUFHLGVBQWUsQ0FBQyxVQUFVLEVBQUUsWUFBWSxFQUFFLFdBQVcsWUFBWSxPQUFPLENBQUMsQ0FBQyxDQUFDO0FBQzNJLENBQUM7QUFzQ0QsTUFBTSxDQUFDLE1BQU0sbUNBQW1DLEdBQUcsZUFBZSxDQUFzQyxxQ0FBcUMsQ0FBQyxDQUFDO0FBUy9JLE1BQU0sQ0FBQyxNQUFNLHlCQUF5QixHQUFHLGVBQWUsQ0FBNEIsMkJBQTJCLENBQUMsQ0FBQztBQTBCakgsTUFBTSxDQUFDLE1BQU0sOEJBQThCLEdBQUcsZUFBZSxDQUFpQyxnQ0FBZ0MsQ0FBQyxDQUFDO0FBUWhJLFlBQVk7QUFFWixpQ0FBaUM7QUFFakMsTUFBTSxDQUFDLE1BQU0sbUJBQW1CLEdBQUcsZ0JBQWdCLENBQUM7QUFDcEQsTUFBTSxDQUFDLE1BQU0sbUJBQW1CLEdBQUcsZ0JBQWdCLENBQUM7QUFFcEQsTUFBTSxVQUFVLGlCQUFpQixDQUFDLFdBQW1CO0lBQ3BELE1BQU0sT0FBTyxHQUFhLEVBQUUsQ0FBQztJQUM3QixPQUFPLENBQUMsbUJBQW1CLENBQUMsR0FBRyxXQUFXLENBQUM7SUFDM0MsT0FBTyxPQUFPLENBQUM7QUFDaEIsQ0FBQztBQUVELFlBQVk7QUFFWiwrQkFBK0I7QUFFL0IsTUFBTSxDQUFOLElBQWtCLHFCQXNDakI7QUF0Q0QsV0FBa0IscUJBQXFCO0lBQ3RDLDBCQUEwQjtJQUMxQixzREFBNkIsQ0FBQTtJQUM3QixnREFBdUIsQ0FBQTtJQUN2Qiw4Q0FBcUIsQ0FBQTtJQUNyQiwwREFBaUMsQ0FBQTtJQUNqQyw4Q0FBcUIsQ0FBQTtJQUNyQixzQ0FBYSxDQUFBO0lBQ2Isa0VBQXlDLENBQUE7SUFDekMsOENBQXFCLENBQUE7SUFDckIsNERBQW1DLENBQUE7SUFDbkMsc0VBQTZDLENBQUE7SUFDN0Msa0VBQXlDLENBQUE7SUFDekMsc0ZBQTZELENBQUE7SUFFN0QsZUFBZTtJQUNmLHdEQUErQixDQUFBO0lBQy9CLDREQUFtQyxDQUFBO0lBQ25DLDBEQUFpQyxDQUFBO0lBQ2pDLG9GQUEyRCxDQUFBO0lBQzNELHdFQUErQyxDQUFBO0lBQy9DLDRFQUFtRCxDQUFBO0lBQ25ELHNEQUE2QixDQUFBO0lBQzdCLHdDQUFlLENBQUE7SUFDZix3REFBK0IsQ0FBQTtJQUMvQixnREFBdUIsQ0FBQTtJQUN2QiwwREFBaUMsQ0FBQTtJQUNqQywwREFBaUMsQ0FBQTtJQUNqQyx3RUFBK0MsQ0FBQTtJQUMvQyxzRUFBNkMsQ0FBQTtJQUM3QyxzRUFBNkMsQ0FBQTtJQUM3Qyw0RUFBbUQsQ0FBQTtJQUNuRCxvRUFBMkMsQ0FBQTtJQUMzQyxrREFBeUIsQ0FBQTtJQUN6Qiw4RUFBcUQsQ0FBQTtJQUNyRCxnRkFBdUQsQ0FBQTtJQUV2RCw0Q0FBbUIsQ0FBQTtBQUNwQixDQUFDLEVBdENpQixxQkFBcUIsS0FBckIscUJBQXFCLFFBc0N0QztBQUVELE1BQU0sT0FBTyxpQkFBa0IsU0FBUSxLQUFLO0lBRTNDLFlBQ0MsT0FBZSxFQUNOLElBQTJCLEVBQzNCLFFBQXVCLEVBQ3ZCLFdBQW9CO1FBRTdCLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUpOLFNBQUksR0FBSixJQUFJLENBQXVCO1FBQzNCLGFBQVEsR0FBUixRQUFRLENBQWU7UUFDdkIsZ0JBQVcsR0FBWCxXQUFXLENBQVM7UUFHN0IsSUFBSSxDQUFDLElBQUksR0FBRyxHQUFHLElBQUksQ0FBQyxJQUFJLHFDQUFxQyxJQUFJLENBQUMsUUFBUSxJQUFJLFNBQVMsZ0JBQWdCLElBQUksQ0FBQyxXQUFXLElBQUksU0FBUyxFQUFFLENBQUM7SUFDeEksQ0FBQztDQUVEO0FBRUQsTUFBTSxPQUFPLHNCQUF1QixTQUFRLGlCQUFpQjtJQUM1RCxZQUFZLE9BQWUsRUFBVyxHQUFXLEVBQUUsSUFBMkIsRUFBVyxVQUE4QixFQUFFLFdBQStCO1FBQ3ZKLEtBQUssQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxXQUFXLENBQUMsQ0FBQztRQURSLFFBQUcsR0FBSCxHQUFHLENBQVE7UUFBd0MsZUFBVSxHQUFWLFVBQVUsQ0FBb0I7SUFFdkgsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLHFCQUFzQixTQUFRLGlCQUFpQjtJQUMzRCxZQUFZLE9BQWUsRUFBRSxJQUEyQjtRQUN2RCxLQUFLLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ3RCLENBQUM7Q0FDRDtBQUVELFdBQWlCLGlCQUFpQjtJQUVqQyxTQUFnQixtQkFBbUIsQ0FBQyxLQUFZO1FBQy9DLElBQUksS0FBSyxZQUFZLGlCQUFpQixFQUFFLENBQUM7WUFDeEMsT0FBTyxLQUFLLENBQUM7UUFDZCxDQUFDO1FBQ0QsTUFBTSxLQUFLLEdBQUcsaUVBQWlFLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNqRyxJQUFJLEtBQUssSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztZQUN2QixNQUFNLFlBQVksR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssU0FBUyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQWlCLENBQUM7WUFDbkYsTUFBTSxXQUFXLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLFNBQVMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDbEUsT0FBTyxJQUFJLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQXlCLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxZQUFZLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFDekcsQ0FBQztRQUNELE9BQU8sSUFBSSxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsT0FBTyxnREFBZ0MsQ0FBQztJQUM1RSxDQUFDO0lBWGUscUNBQW1CLHNCQVdsQyxDQUFBO0FBRUYsQ0FBQyxFQWZnQixpQkFBaUIsS0FBakIsaUJBQWlCLFFBZWpDO0FBMERELE1BQU0sQ0FBTixJQUFrQixVQUtqQjtBQUxELFdBQWtCLFVBQVU7SUFDM0IsNkNBQStCLENBQUE7SUFDL0IsMkJBQWEsQ0FBQTtJQUNiLGlDQUFtQixDQUFBO0lBQ25CLDJDQUE2QixDQUFBO0FBQzlCLENBQUMsRUFMaUIsVUFBVSxLQUFWLFVBQVUsUUFLM0I7QUFrQkQsTUFBTSxDQUFOLElBQWtCLE1BS2pCO0FBTEQsV0FBa0IsTUFBTTtJQUN2QixtQ0FBSSxDQUFBO0lBQ0oscUNBQUssQ0FBQTtJQUNMLDJDQUFRLENBQUE7SUFDUix5Q0FBTyxDQUFBO0FBQ1IsQ0FBQyxFQUxpQixNQUFNLEtBQU4sTUFBTSxRQUt2QjtBQUVELE1BQU0sQ0FBTixJQUFrQixVQUlqQjtBQUpELFdBQWtCLFVBQVU7SUFDM0IsaUNBQW1CLENBQUE7SUFDbkIsbUNBQXFCLENBQUE7SUFDckIsbUNBQXFCLENBQUE7QUFDdEIsQ0FBQyxFQUppQixVQUFVLEtBQVYsVUFBVSxRQUkzQjtBQTJERCxZQUFZO0FBRVosa0NBQWtDO0FBRWxDLE1BQU0sQ0FBQyxNQUFNLHFCQUFxQixHQUFHLHFCQUFxQixDQUFDO0FBQzNELE1BQU0sVUFBVSxnQkFBZ0IsQ0FBQyxRQUFzQixJQUFJLE9BQU8sZUFBZSxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFFOUYsYUFBYTtBQUViLGtDQUFrQztBQUNsQyxNQUFNLENBQUMsTUFBTSw4QkFBOEIsR0FBRyxlQUFlLENBQWlDLGdDQUFnQyxDQUFDLENBQUM7QUFtQ2hJLE1BQU0sQ0FBQyxNQUFNLG9CQUFvQixHQUFHLGVBQWUsQ0FBdUIsc0JBQXNCLENBQUMsQ0FBQztBQXFDbEcsTUFBTSxDQUFDLE1BQU0sb0NBQW9DLEdBQUcsZUFBZSxDQUF1QyxzQ0FBc0MsQ0FBQyxDQUFDO0FBZ0JsSixNQUFNLENBQUMsTUFBTSx3QkFBd0IsR0FBRyxlQUFlLENBQTJCLDBCQUEwQixDQUFDLENBQUM7QUFTOUcsTUFBTSxDQUFDLE1BQU0sd0JBQXdCLEdBQUcsZUFBZSxDQUEyQiwwQkFBMEIsQ0FBQyxDQUFDO0FBUTlHLE1BQU0sQ0FBQyxNQUFNLHVCQUF1QixHQUFHLGVBQWUsQ0FBMEIseUJBQXlCLENBQUMsQ0FBQztBQVMzRyxZQUFZO0FBRVosTUFBTSxDQUFDLE1BQU0scUJBQXFCLEdBQUcsY0FBYyxDQUFDO0FBQ3BELE1BQU0sQ0FBQyxNQUFNLHFCQUFxQixHQUFHLHNCQUFzQixDQUFDO0FBQzVELE1BQU0sQ0FBQyxNQUFNLGdCQUFnQixHQUFHLFNBQVMsQ0FBQyJ9