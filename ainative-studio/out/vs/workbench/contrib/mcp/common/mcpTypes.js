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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwVHlwZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbWNwL2NvbW1vbi9tY3BUeXBlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFHaEUsT0FBTyxFQUFFLE1BQU0sSUFBSSxZQUFZLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM1RSxPQUFPLEVBQUUsTUFBTSxJQUFJLFdBQVcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBRTFFLE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sZ0NBQWdDLENBQUM7QUFFcEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBRTlDLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQzNGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQU03RixNQUFNLENBQUMsTUFBTSw0QkFBNEIsR0FBRyxNQUFNLENBQUM7QUFFbkQsTUFBTSxVQUFVLDJCQUEyQixDQUFDLFVBQStCLEVBQUUsRUFBVTtJQUN0RixPQUFPLG1CQUFtQixDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsR0FBRyxHQUFHLEdBQUcsRUFBRSxDQUFDO0FBQ3pELENBQUM7QUFzQ0QsTUFBTSxDQUFOLElBQWtCLHNCQVFqQjtBQVJELFdBQWtCLHNCQUFzQjtJQUN2Qyx5RkFBbUIsQ0FBQTtJQUNuQiwrRUFBZSxDQUFBO0lBQ2YscUVBQVUsQ0FBQTtJQUNWLCtFQUFlLENBQUE7SUFDZixpRkFBZ0IsQ0FBQTtJQUVoQixtRkFBaUIsQ0FBQTtBQUNsQixDQUFDLEVBUmlCLHNCQUFzQixLQUF0QixzQkFBc0IsUUFRdkM7QUFFRCxNQUFN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