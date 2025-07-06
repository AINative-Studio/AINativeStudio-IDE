/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../base/common/event.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { removeMCPToolNamePrefix } from '../common/mcpServiceTypes.js';
const getClientConfig = (serverName) => {
    return {
        name: `${serverName}-client`,
        version: '0.1.0',
        // debug: true,
    };
};
export class MCPChannel {
    constructor() {
        this.infoOfClientId = {};
        this._refreshingServerNames = new Set();
        // mcp emitters
        this.mcpEmitters = {
            serverEvent: {
                onAdd: new Emitter(),
                onUpdate: new Emitter(),
                onDelete: new Emitter(),
            }
        };
    }
    // browser uses this to listen for changes
    listen(_, event) {
        // server events
        if (event === 'onAdd_server')
            return this.mcpEmitters.serverEvent.onAdd.event;
        else if (event === 'onUpdate_server')
            return this.mcpEmitters.serverEvent.onUpdate.event;
        else if (event === 'onDelete_server')
            return this.mcpEmitters.serverEvent.onDelete.event;
        // else if (event === 'onLoading_server') return this.mcpEmitters.serverEvent.onChangeLoading.event;
        // tool call events
        // handle unknown events
        else
            throw new Error(`Event not found: ${event}`);
    }
    // browser uses this to call (see this.channel.call() in mcpConfigService.ts for all usages)
    async call(_, command, params) {
        try {
            if (command === 'refreshMCPServers') {
                await this._refreshMCPServers(params);
            }
            else if (command === 'closeAllMCPServers') {
                await this._closeAllMCPServers();
            }
            else if (command === 'toggleMCPServer') {
                await this._toggleMCPServer(params.serverName, params.isOn);
            }
            else if (command === 'callTool') {
                const p = params;
                const response = await this._safeCallTool(p.serverName, p.toolName, p.params);
                return response;
            }
            else {
                throw new Error(`Void sendLLM: command "${command}" not recognized.`);
            }
        }
        catch (e) {
            console.error('mcp channel: Call Error:', e);
        }
    }
    // server functions
    async _refreshMCPServers(params) {
        const { mcpConfigFileJSON, userStateOfName, addedServerNames, removedServerNames, updatedServerNames, } = params;
        const { mcpServers: mcpServersJSON } = mcpConfigFileJSON;
        const allChanges = [
            ...addedServerNames.map(n => ({ serverName: n, type: 'added' })),
            ...removedServerNames.map(n => ({ serverName: n, type: 'removed' })),
            ...updatedServerNames.map(n => ({ serverName: n, type: 'updated' })),
        ];
        await Promise.all(allChanges.map(async ({ serverName, type }) => {
            // check if already refreshing
            if (this._refreshingServerNames.has(serverName))
                return;
            this._refreshingServerNames.add(serverName);
            const prevServer = this.infoOfClientId[serverName]?.mcpServer;
            // close and delete the old client
            if (type === 'removed' || type === 'updated') {
                await this._closeClient(serverName);
                delete this.infoOfClientId[serverName];
                this.mcpEmitters.serverEvent.onDelete.fire({ response: { prevServer, name: serverName, } });
            }
            // create a new client
            if (type === 'added' || type === 'updated') {
                const clientInfo = await this._createClient(mcpServersJSON[serverName], serverName, userStateOfName[serverName]?.isOn);
                this.infoOfClientId[serverName] = clientInfo;
                this.mcpEmitters.serverEvent.onAdd.fire({ response: { newServer: clientInfo.mcpServer, name: serverName, } });
            }
        }));
        allChanges.forEach(({ serverName, type }) => {
            this._refreshingServerNames.delete(serverName);
        });
    }
    async _createClientUnsafe(server, serverName, isOn) {
        const clientConfig = getClientConfig(serverName);
        const client = new Client(clientConfig);
        let transport;
        let info;
        if (server.url) {
            // first try HTTP, fall back to SSE
            try {
                transport = new StreamableHTTPClientTransport(server.url);
                await client.connect(transport);
                console.log(`Connected via HTTP to ${serverName}`);
                const { tools } = await client.listTools();
                const toolsWithUniqueName = tools.map(({ name, ...rest }) => ({ name: this._addUniquePrefix(name), ...rest }));
                info = {
                    status: isOn ? 'success' : 'offline',
                    tools: toolsWithUniqueName,
                    command: server.url.toString(),
                };
            }
            catch (httpErr) {
                console.warn(`HTTP failed for ${serverName}, trying SSE…`, httpErr);
                transport = new SSEClientTransport(server.url);
                await client.connect(transport);
                const { tools } = await client.listTools();
                const toolsWithUniqueName = tools.map(({ name, ...rest }) => ({ name: this._addUniquePrefix(name), ...rest }));
                console.log(`Connected via SSE to ${serverName}`);
                info = {
                    status: isOn ? 'success' : 'offline',
                    tools: toolsWithUniqueName,
                    command: server.url.toString(),
                };
            }
        }
        else if (server.command) {
            // console.log('ENV DATA: ', server.env)
            transport = new StdioClientTransport({
                command: server.command,
                args: server.args,
                env: {
                    ...server.env,
                    ...process.env
                },
            });
            await client.connect(transport);
            // Get the tools from the server
            const { tools } = await client.listTools();
            const toolsWithUniqueName = tools.map(({ name, ...rest }) => ({ name: this._addUniquePrefix(name), ...rest }));
            // Create a full command string for display
            const fullCommand = `${server.command} ${server.args?.join(' ') || ''}`;
            // Format server object
            info = {
                status: isOn ? 'success' : 'offline',
                tools: toolsWithUniqueName,
                command: fullCommand,
            };
        }
        else {
            throw new Error(`No url or command for server ${serverName}`);
        }
        return { _client: client, mcpServerEntryJSON: server, mcpServer: info };
    }
    _addUniquePrefix(base) {
        return `${Math.random().toString(36).slice(2, 8)}_${base}`;
    }
    async _createClient(serverConfig, serverName, isOn = true) {
        try {
            const c = await this._createClientUnsafe(serverConfig, serverName, isOn);
            return c;
        }
        catch (err) {
            console.error(`❌ Failed to connect to server "${serverName}":`, err);
            const fullCommand = !serverConfig.command ? '' : `${serverConfig.command} ${serverConfig.args?.join(' ') || ''}`;
            const c = { status: 'error', error: err + '', command: fullCommand, };
            return { mcpServerEntryJSON: serverConfig, mcpServer: c, };
        }
    }
    async _closeAllMCPServers() {
        for (const serverName in this.infoOfClientId) {
            await this._closeClient(serverName);
            delete this.infoOfClientId[serverName];
        }
        console.log('Closed all MCP servers');
    }
    async _closeClient(serverName) {
        const info = this.infoOfClientId[serverName];
        if (!info)
            return;
        const { _client: client } = info;
        if (client) {
            await client.close();
        }
        console.log(`Closed MCP server ${serverName}`);
    }
    async _toggleMCPServer(serverName, isOn) {
        const prevServer = this.infoOfClientId[serverName]?.mcpServer;
        // Handle turning on the server
        if (isOn) {
            // this.mcpEmitters.serverEvent.onChangeLoading.fire(getLoadingServerObject(serverName, isOn))
            const clientInfo = await this._createClientUnsafe(this.infoOfClientId[serverName].mcpServerEntryJSON, serverName, isOn);
            this.mcpEmitters.serverEvent.onUpdate.fire({
                response: {
                    name: serverName,
                    newServer: clientInfo.mcpServer,
                    prevServer: prevServer,
                }
            });
        }
        // Handle turning off the server
        else {
            // this.mcpEmitters.serverEvent.onChangeLoading.fire(getLoadingServerObject(serverName, isOn))
            this._closeClient(serverName);
            delete this.infoOfClientId[serverName]._client;
            this.mcpEmitters.serverEvent.onUpdate.fire({
                response: {
                    name: serverName,
                    newServer: {
                        status: 'offline',
                        tools: [],
                        command: '',
                        // Explicitly set error to undefined to reset the error state
                        error: undefined,
                    },
                    prevServer: prevServer,
                }
            });
        }
    }
    // tool call functions
    async _callTool(serverName, toolName, params) {
        const server = this.infoOfClientId[serverName];
        if (!server)
            throw new Error(`Server ${serverName} not found`);
        const { _client: client } = server;
        if (!client)
            throw new Error(`Client for server ${serverName} not found`);
        // Call the tool with the provided parameters
        const response = await client.callTool({
            name: removeMCPToolNamePrefix(toolName),
            arguments: params
        });
        const { content } = response;
        const returnValue = content[0];
        if (returnValue.type === 'text') {
            // handle text response
            if (response.isError) {
                throw new Error(`Tool call error: ${returnValue.text}`);
            }
            // handle success
            return {
                event: 'text',
                text: returnValue.text,
                toolName,
                serverName,
            };
        }
        // if (returnValue.type === 'audio') {
        // 	// handle audio response
        // }
        // if (returnValue.type === 'image') {
        // 	// handle image response
        // }
        // if (returnValue.type === 'resource') {
        // 	// handle resource response
        // }
        throw new Error(`Tool call error: We don\'t support ${returnValue.type} tool response yet for tool ${toolName} on server ${serverName}`);
    }
    // tool call error wrapper
    async _safeCallTool(serverName, toolName, params) {
        try {
            const response = await this._callTool(serverName, toolName, params);
            return response;
        }
        catch (err) {
            let errorMessage;
            if (typeof err === 'object' && err !== null && err['code']) {
                const code = err.code;
                let codeDescription = '';
                if (code === -32700)
                    codeDescription = 'Parse Error';
                if (code === -32600)
                    codeDescription = 'Invalid Request';
                if (code === -32601)
                    codeDescription = 'Method Not Found';
                if (code === -32602)
                    codeDescription = 'Invalid Parameters';
                if (code === -32603)
                    codeDescription = 'Internal Error';
                errorMessage = `${codeDescription}. Full response:\n${JSON.stringify(err, null, 2)}`;
            }
            // Check if it's an MCP error with a code
            else if (typeof err === 'string') {
                // String error
                errorMessage = err;
            }
            else {
                // Unknown error format
                errorMessage = JSON.stringify(err, null, 2);
            }
            const fullErrorMessage = `❌ Failed to call tool "${toolName}" on server "${serverName}": ${errorMessage}`;
            const errorResponse = {
                event: 'error',
                text: fullErrorMessage,
                toolName,
                serverName,
            };
            return errorResponse;
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwQ2hhbm5lbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3ZvaWQvZWxlY3Ryb24tbWFpbi9tY3BDaGFubmVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7MEZBRzBGO0FBTzFGLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxrQ0FBa0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDbkUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDakYsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDbkcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDN0UsT0FBTyxFQUF5SSx1QkFBdUIsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBSzlNLE1BQU0sZUFBZSxHQUFHLENBQUMsVUFBa0IsRUFBRSxFQUFFO0lBQzlDLE9BQU87UUFDTixJQUFJLEVBQUUsR0FBRyxVQUFVLFNBQVM7UUFDNUIsT0FBTyxFQUFFLE9BQU87UUFDaEIsZUFBZTtLQUNmLENBQUE7QUFDRixDQUFDLENBQUE7QUFxQkQsTUFBTSxPQUFPLFVBQVU7SUFvQnRCO1FBbEJpQixtQkFBYyxHQUFtQixFQUFFLENBQUE7UUFDbkMsMkJBQXNCLEdBQWdCLElBQUksR0FBRyxFQUFFLENBQUE7UUFFaEUsZUFBZTtRQUNFLGdCQUFXLEdBQUc7WUFDOUIsV0FBVyxFQUFFO2dCQUNaLEtBQUssRUFBRSxJQUFJLE9BQU8sRUFBMEI7Z0JBQzVDLFFBQVEsRUFBRSxJQUFJLE9BQU8sRUFBMEI7Z0JBQy9DLFFBQVEsRUFBRSxJQUFJLE9BQU8sRUFBMEI7YUFDL0M7U0FPRCxDQUFBO0lBR0csQ0FBQztJQUVMLDBDQUEw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