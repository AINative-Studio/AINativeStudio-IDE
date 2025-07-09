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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwQ29uZmlndXJhdGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9tY3AvY29tbW9uL21jcENvbmZpZ3VyYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBRTlDLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUN0RixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sK0VBQStFLENBQUM7QUFLN0csTUFBTSx3QkFBd0IsR0FBRyxrQkFBa0IsQ0FBQztBQUVwRCxNQUFNLENBQUMsTUFBTSxrQkFBa0IsR0FBRyxDQUFDLFlBQW9CLEVBQUUsRUFBRSxDQUFDLHdCQUF3QixHQUFHLFlBQVksQ0FBQztBQUVwRyxNQUFNLHNCQUFzQixHQUFHO0lBQzlCLE9BQU8sRUFBRSxNQUFNO0lBQ2YsSUFBSSxFQUFFLENBQUMsa0JBQWtCLENBQUM7SUFDMUIsR0FBRyxFQUFFLEVBQUU7Q0FDUCxDQUFDO0FBRUYsTUFBTSxDQUFOLElBQWtCLGVBS2pCO0FBTEQsV0FBa0IsZUFBZTtJQUNoQyxtREFBZ0MsQ0FBQTtJQUNoQyx3Q0FBcUIsQ0FBQTtJQUNyQixpREFBOEIsQ0FBQTtJQUM5Qix1REFBb0MsQ0FBQTtBQUNyQyxDQUFDLEVBTGlCLGVBQWUsS0FBZixlQUFlLFFBS2hDO0FBRUQsTUFBTSxDQUFDLE1BQU0sbUJBQW1CLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQztJQUM5QyxzREFBK0IsRUFBRSxJQUFJO0lBQ3JDLDJDQUEwQixFQUFFLElBQUk7SUFDaEMsb0RBQThCLEVBQUUsSUFBSTtJQUNwQywwREFBaUMsRUFBRSxJQUFJO0NBQ0MsQ0FBc0IsQ0FBQztBQUVoRSxNQUFN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