/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { assertNever } from '../../../../base/common/assert.js';
import { equals as objectsEqual } from '../../../../base/common/objects.js';
import { equals as arraysEqual } from '../../../../base/common/arrays.js';
import { URI } from '../../../../base/common/uri.js';
import { localize } from '../../../../nls.js';
import { ExtensionIdentifier } from '../../../../platform/extensions/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
export const extensionMcpCollectionPrefix = 'ext.';
export function extensionPrefixedIdentifier(identifier, id) {
    return ExtensionIdentifier.toKey(identifier) + '/' + id;
}
export var McpCollectionSortOrder;
(function (McpCollectionSortOrder) {
    McpCollectionSortOrder[McpCollectionSortOrder["WorkspaceFolder"] = 0] = "WorkspaceFolder";
    McpCollectionSortOrder[McpCollectionSortOrder["Workspace"] = 100] = "Workspace";
    McpCollectionSortOrder[McpCollectionSortOrder["User"] = 200] = "User";
    McpCollectionSortOrder[McpCollectionSortOrder["Extension"] = 300] = "Extension";
    McpCollectionSortOrder[McpCollectionSortOrder["Filesystem"] = 400] = "Filesystem";
    McpCollectionSortOrder[McpCollectionSortOrder["RemoteBoost"] = -50] = "RemoteBoost";
})(McpCollectionSortOrder || (McpCollectionSortOrder = {}));
export var McpCollectionDefinition;
(function (McpCollectionDefinition) {
    function equals(a, b) {
        return a.id === b.id
            && a.remoteAuthority === b.remoteAuthority
            && a.label === b.label
            && a.isTrustedByDefault === b.isTrustedByDefault;
    }
    McpCollectionDefinition.equals = equals;
})(McpCollectionDefinition || (McpCollectionDefinition = {}));
export var McpServerDefinition;
(function (McpServerDefinition) {
    function toSerialized(def) {
        return def;
    }
    McpServerDefinition.toSerialized = toSerialized;
    function fromSerialized(def) {
        return {
            id: def.id,
            label: def.label,
            launch: McpServerLaunch.fromSerialized(def.launch),
            variableReplacement: def.variableReplacement ? McpServerDefinitionVariableReplacement.fromSerialized(def.variableReplacement) : undefined,
        };
    }
    McpServerDefinition.fromSerialized = fromSerialized;
    function equals(a, b) {
        return a.id === b.id
            && a.label === b.label
            && arraysEqual(a.roots, b.roots, (a, b) => a.toString() === b.toString())
            && objectsEqual(a.launch, b.launch)
            && objectsEqual(a.presentation, b.presentation)
            && objectsEqual(a.variableReplacement, b.variableReplacement);
    }
    McpServerDefinition.equals = equals;
})(McpServerDefinition || (McpServerDefinition = {}));
export var McpServerDefinitionVariableReplacement;
(function (McpServerDefinitionVariableReplacement) {
    function toSerialized(def) {
        return def;
    }
    McpServerDefinitionVariableReplacement.toSerialized = toSerialized;
    function fromSerialized(def) {
        return {
            section: def.section,
            folder: def.folder ? { ...def.folder, uri: URI.revive(def.folder.uri) } : undefined,
            target: def.target,
        };
    }
    McpServerDefinitionVariableReplacement.fromSerialized = fromSerialized;
})(McpServerDefinitionVariableReplacement || (McpServerDefinitionVariableReplacement = {}));
export var LazyCollectionState;
(function (LazyCollectionState) {
    LazyCollectionState[LazyCollectionState["HasUnknown"] = 0] = "HasUnknown";
    LazyCollectionState[LazyCollectionState["LoadingUnknown"] = 1] = "LoadingUnknown";
    LazyCollectionState[LazyCollectionState["AllKnown"] = 2] = "AllKnown";
})(LazyCollectionState || (LazyCollectionState = {}));
export const IMcpService = createDecorator('IMcpService');
export var McpServerToolsState;
(function (McpServerToolsState) {
    /** Tools have not been read before */
    McpServerToolsState[McpServerToolsState["Unknown"] = 0] = "Unknown";
    /** Tools were read from the cache */
    McpServerToolsState[McpServerToolsState["Cached"] = 1] = "Cached";
    /** Tools are refreshing for the first time */
    McpServerToolsState[McpServerToolsState["RefreshingFromUnknown"] = 2] = "RefreshingFromUnknown";
    /** Tools are refreshing and the current tools are cached */
    McpServerToolsState[McpServerToolsState["RefreshingFromCached"] = 3] = "RefreshingFromCached";
    /** Tool state is live, server is connected */
    McpServerToolsState[McpServerToolsState["Live"] = 4] = "Live";
})(McpServerToolsState || (McpServerToolsState = {}));
export var McpServerTransportType;
(function (McpServerTransportType) {
    /** A command-line MCP server communicating over standard in/out */
    McpServerTransportType[McpServerTransportType["Stdio"] = 1] = "Stdio";
    /** An MCP server that uses Server-Sent Events */
    McpServerTransportType[McpServerTransportType["SSE"] = 2] = "SSE";
})(McpServerTransportType || (McpServerTransportType = {}));
export var McpServerLaunch;
(function (McpServerLaunch) {
    function toSerialized(launch) {
        return launch;
    }
    McpServerLaunch.toSerialized = toSerialized;
    function fromSerialized(launch) {
        switch (launch.type) {
            case 2 /* McpServerTransportType.SSE */:
                return { type: launch.type, uri: URI.revive(launch.uri), headers: launch.headers };
            case 1 /* McpServerTransportType.Stdio */:
                return {
                    type: launch.type,
                    cwd: launch.cwd ? URI.revive(launch.cwd) : undefined,
                    command: launch.command,
                    args: launch.args,
                    env: launch.env,
                    envFile: launch.envFile,
                };
        }
    }
    McpServerLaunch.fromSerialized = fromSerialized;
})(McpServerLaunch || (McpServerLaunch = {}));
/**
 * McpConnectionState is the state of the underlying connection and is
 * communicated e.g. from the extension host to the renderer.
 */
export var McpConnectionState;
(function (McpConnectionState) {
    let Kind;
    (function (Kind) {
        Kind[Kind["Stopped"] = 0] = "Stopped";
        Kind[Kind["Starting"] = 1] = "Starting";
        Kind[Kind["Running"] = 2] = "Running";
        Kind[Kind["Error"] = 3] = "Error";
    })(Kind = McpConnectionState.Kind || (McpConnectionState.Kind = {}));
    McpConnectionState.toString = (s) => {
        switch (s.state) {
            case 0 /* Kind.Stopped */:
                return localize('mcpstate.stopped', 'Stopped');
            case 1 /* Kind.Starting */:
                return localize('mcpstate.starting', 'Starting');
            case 2 /* Kind.Running */:
                return localize('mcpstate.running', 'Running');
            case 3 /* Kind.Error */:
                return localize('mcpstate.error', 'Error {0}', s.message);
            default:
                assertNever(s);
        }
    };
    McpConnectionState.toKindString = (s) => {
        switch (s) {
            case 0 /* Kind.Stopped */:
                return 'stopped';
            case 1 /* Kind.Starting */:
                return 'starting';
            case 2 /* Kind.Running */:
                return 'running';
            case 3 /* Kind.Error */:
                return 'error';
            default:
                assertNever(s);
        }
    };
    /** Returns if the MCP state is one where starting a new server is valid */
    McpConnectionState.canBeStarted = (s) => s === 3 /* Kind.Error */ || s === 0 /* Kind.Stopped */;
    /** Gets whether the state is a running state. */
    McpConnectionState.isRunning = (s) => !McpConnectionState.canBeStarted(s.state);
})(McpConnectionState || (McpConnectionState = {}));
export class MpcResponseError extends Error {
    constructor(message, code, data) {
        super(`MPC ${code}: ${message}`);
        this.code = code;
        this.data = data;
    }
}
export class McpConnectionFailedError extends Error {
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwVHlwZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9tY3AvY29tbW9uL21jcFR5cGVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUdoRSxPQUFPLEVBQUUsTUFBTSxJQUFJLFlBQVksRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxNQUFNLElBQUksV0FBVyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFFMUUsT0FBTyxFQUFFLEdBQUcsRUFBaUIsTUFBTSxnQ0FBZ0MsQ0FBQztBQUVwRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFFOUMsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDM0YsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBTTdGLE1BQU0sQ0FBQyxNQUFNLDRCQUE0QixHQUFHLE1BQU0sQ0FBQztBQUVuRCxNQUFNLFVBQVUsMkJBQTJCLENBQUMsVUFBK0IsRUFBRSxFQUFVO0lBQ3RGLE9BQU8sbUJBQW1CLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxHQUFHLEdBQUcsR0FBRyxFQUFFLENBQUM7QUFDekQsQ0FBQztBQXNDRCxNQUFNLENBQU4sSUFBa0Isc0JBUWpCO0FBUkQsV0FBa0Isc0JBQXNCO0lBQ3ZDLHlGQUFtQixDQUFBO0lBQ25CLCtFQUFlLENBQUE7SUFDZixxRUFBVSxDQUFBO0lBQ1YsK0VBQWUsQ0FBQTtJQUNmLGlGQUFnQixDQUFBO0lBRWhCLG1GQUFpQixDQUFBO0FBQ2xCLENBQUMsRUFSaUIsc0JBQXNCLEtBQXRCLHNCQUFzQixRQVF2QztBQUVELE1BQU0s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