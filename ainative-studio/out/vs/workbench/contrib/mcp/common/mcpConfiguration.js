/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../nls.js';
import { mcpSchemaId } from '../../../services/configuration/common/configuration.js';
import { inputsSchema } from '../../../services/configurationResolver/common/configurationResolverSchema.js';
const mcpActivationEventPrefix = 'onMcpCollection:';
export const mcpActivationEvent = (collectionId) => mcpActivationEventPrefix + collectionId;
const mcpSchemaExampleServer = {
    command: 'node',
    args: ['my-mcp-server.js'],
    env: {},
};
export var DiscoverySource;
(function (DiscoverySource) {
    DiscoverySource["ClaudeDesktop"] = "claude-desktop";
    DiscoverySource["Windsurf"] = "windsurf";
    DiscoverySource["CursorGlobal"] = "cursor-global";
    DiscoverySource["CursorWorkspace"] = "cursor-workspace";
})(DiscoverySource || (DiscoverySource = {}));
export const allDiscoverySources = Object.keys({
    ["claude-desktop" /* DiscoverySource.ClaudeDesktop */]: true,
    ["windsurf" /* DiscoverySource.Windsurf */]: true,
    ["cursor-global" /* DiscoverySource.CursorGlobal */]: true,
    ["cursor-workspace" /* DiscoverySource.CursorWorkspace */]: true,
});
export const discoverySourceLabel = {
    ["claude-desktop" /* DiscoverySource.ClaudeDesktop */]: localize('mcp.discovery.source.claude-desktop', "Claude Desktop"),
    ["windsurf" /* DiscoverySource.Windsurf */]: localize('mcp.discovery.source.windsurf', "Windsurf"),
    ["cursor-global" /* DiscoverySource.CursorGlobal */]: localize('mcp.discovery.source.cursor-global', "Cursor (Global)"),
    ["cursor-workspace" /* DiscoverySource.CursorWorkspace */]: localize('mcp.discovery.source.cursor-workspace', "Cursor (Workspace)"),
};
export const mcpConfigurationSection = 'mcp';
export const mcpDiscoverySection = 'chat.mcp.discovery.enabled';
export const mcpEnabledSection = 'chat.mcp.enabled';
export const mcpSchemaExampleServers = {
    'mcp-server-time': {
        command: 'python',
        args: ['-m', 'mcp_server_time', '--local-timezone=America/Los_Angeles'],
        env: {},
    }
};
export const mcpStdioServerSchema = {
    type: 'object',
    additionalProperties: false,
    examples: [mcpSchemaExampleServer],
    properties: {
        type: {
            type: 'string',
            enum: ['stdio'],
            description: localize('app.mcp.json.type', "The type of the server.")
        },
        command: {
            type: 'string',
            description: localize('app.mcp.json.command', "The command to run the server.")
        },
        args: {
            type: 'array',
            description: localize('app.mcp.args.command', "Arguments passed to the server."),
            items: {
                type: 'string'
            },
        },
        envFile: {
            type: 'string',
            description: localize('app.mcp.envFile.command', "Path to a file containing environment variables for the server."),
            examples: ['${workspaceFolder}/.env'],
        },
        env: {
            description: localize('app.mcp.env.command', "Environment variables passed to the server."),
            additionalProperties: {
                anyOf: [
                    { type: 'null' },
                    { type: 'string' },
                    { type: 'number' },
                ]
            }
        },
    }
};
export const mcpServerSchema = {
    id: mcpSchemaId,
    type: 'object',
    title: localize('app.mcp.json.title', "Model Context Protocol Servers"),
    allowTrailingCommas: true,
    allowComments: true,
    additionalProperties: false,
    properties: {
        servers: {
            examples: [mcpSchemaExampleServers],
            additionalProperties: {
                oneOf: [mcpStdioServerSchema, {
                        type: 'object',
                        additionalProperties: false,
                        required: ['url', 'type'],
                        examples: [{
                                type: 'sse',
                                url: 'http://localhost:3001',
                                headers: {},
                            }],
                        properties: {
                            type: {
                                type: 'string',
                                enum: ['sse'],
                                description: localize('app.mcp.json.type', "The type of the server.")
                            },
                            url: {
                                type: 'string',
                                format: 'uri',
                                description: localize('app.mcp.json.url', "The URL of the server-sent-event (SSE) server.")
                            },
                            env: {
                                description: localize('app.mcp.json.headers', "Additional headers sent to the server."),
                                additionalProperties: { type: 'string' },
                            },
                        }
                    }]
            }
        },
        inputs: inputsSchema.definitions.inputs
    }
};
export const mcpContributionPoint = {
    extensionPoint: 'modelContextServerCollections',
    activationEventsGenerator(contribs, result) {
        for (const contrib of contribs) {
            if (contrib.id) {
                result.push(mcpActivationEvent(contrib.id));
            }
        }
    },
    jsonSchema: {
        description: localize('vscode.extension.contributes.mcp', 'Contributes Model Context Protocol servers. Users of this should also use `vscode.lm.registerMcpConfigurationProvider`.'),
        type: 'array',
        defaultSnippets: [{ body: [{ id: '', label: '' }] }],
        items: {
            additionalProperties: false,
            type: 'object',
            defaultSnippets: [{ body: { id: '', label: '' } }],
            properties: {
                id: {
                    description: localize('vscode.extension.contributes.mcp.id', "Unique ID for the collection."),
                    type: 'string'
                },
                label: {
                    description: localize('vscode.extension.contributes.mcp.label', "Display name for the collection."),
                    type: 'string'
                }
            }
        }
    }
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwQ29uZmlndXJhdGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL21jcC9jb21tb24vbWNwQ29uZmlndXJhdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFFOUMsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwrRUFBK0UsQ0FBQztBQUs3RyxNQUFNLHdCQUF3QixHQUFHLGtCQUFrQixDQUFDO0FBRXBELE1BQU0sQ0FBQyxNQUFNLGtCQUFrQixHQUFHLENBQUMsWUFBb0IsRUFBRSxFQUFFLENBQUMsd0JBQXdCLEdBQUcsWUFBWSxDQUFDO0FBRXBHLE1BQU0sc0JBQXNCLEdBQUc7SUFDOUIsT0FBTyxFQUFFLE1BQU07SUFDZixJQUFJLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQztJQUMxQixHQUFHLEVBQUUsRUFBRTtDQUNQLENBQUM7QUFFRixNQUFNLENBQU4sSUFBa0IsZUFLakI7QUFMRCxXQUFrQixlQUFlO0lBQ2hDLG1EQUFnQyxDQUFBO0lBQ2hDLHdDQUFxQixDQUFBO0lBQ3JCLGlEQUE4QixDQUFBO0lBQzlCLHVEQUFvQyxDQUFBO0FBQ3JDLENBQUMsRUFMaUIsZUFBZSxLQUFmLGVBQWUsUUFLaEM7QUFFRCxNQUFNLENBQUMsTUFBTSxtQkFBbUIsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDO0lBQzlDLHNEQUErQixFQUFFLElBQUk7SUFDckMsMkNBQTBCLEVBQUUsSUFBSTtJQUNoQyxvREFBOEIsRUFBRSxJQUFJO0lBQ3BDLDBEQUFpQyxFQUFFLElBQUk7Q0FDQyxDQUFzQixDQUFDO0FBRWhFLE1BQU0s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