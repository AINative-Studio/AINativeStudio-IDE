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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwVHlwZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvdGVzdC9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL21jcC9jb21tb24vbWNwVHlwZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBR2hFLE9BQU8sRUFBRSxNQUFNLElBQUksWUFBWSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDNUUsT0FBTyxFQUFFLE1BQU0sSUFBSSxXQUFXLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUUxRSxPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLGdDQUFnQyxDQUFDO0FBRXBFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUU5QyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUMzRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUM7QUFNN0YsTUFBTSxDQUFDLE1BQU0sNEJBQTRCLEdBQUcsTUFBTSxDQUFDO0FBRW5ELE1BQU0sVUFBVSwyQkFBMkIsQ0FBQyxVQUErQixFQUFFLEVBQVU7SUFDdEYsT0FBTyxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLEdBQUcsR0FBRyxHQUFHLEVBQUUsQ0FBQztBQUN6RCxDQUFDO0FBc0NELE1BQU0sQ0FBTixJQUFrQixzQkFRakI7QUFSRCxXQUFrQixzQkFBc0I7SUFDdkMseUZBQW1CLENBQUE7SUFDbkIsK0VBQWUsQ0FBQTtJQUNmLHFFQUFVLENBQUE7SUFDViwrRUFBZSxDQUFBO0lBQ2YsaUZBQWdCLENBQUE7SUFFaEIsbUZBQWlCLENBQUE7QUFDbEIsQ0FBQyxFQVJpQixzQkFBc0IsS0FBdEIsc0JBQXNCLFFBUXZDO0FBRUQs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