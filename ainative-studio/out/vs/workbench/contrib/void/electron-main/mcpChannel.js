/*--------------------------------------------------------------------------------------
 *  Copyright 2025 AINative Studio All rights reserved.
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwQ2hhbm5lbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi92b2lkL2VsZWN0cm9uLW1haW4vbWNwQ2hhbm5lbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7OzBGQUcwRjtBQU8xRixPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ2pGLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzdFLE9BQU8sRUFBeUksdUJBQXVCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUs5TSxNQUFNLGVBQWUsR0FBRyxDQUFDLFVBQWtCLEVBQUUsRUFBRTtJQUM5QyxPQUFPO1FBQ04sSUFBSSxFQUFFLEdBQUcsVUFBVSxTQUFTO1FBQzVCLE9BQU8sRUFBRSxPQUFPO1FBQ2hCLGVBQWU7S0FDZixDQUFBO0FBQ0YsQ0FBQyxDQUFBO0FBcUJELE1BQU0sT0FBTyxVQUFVO0lBb0J0QjtRQWxCaUIsbUJBQWMsR0FBbUIsRUFBRSxDQUFBO1FBQ25DLDJCQUFzQixHQUFnQixJQUFJLEdBQUcsRUFBRSxDQUFBO1FBRWhFLGVBQWU7UUFDRSxnQkFBVyxHQUFHO1lBQzlCLFdBQVcsRUFBRTtnQkFDWixLQUFLLEVBQUUsSUFBSSxPQUFPLEVBQTBCO2dCQUM1QyxRQUFRLEVBQUUsSUFBSSxPQUFPLEVBQTBCO2dCQUMvQyxRQUFRLEVBQUUsSUFBSSxPQUFPLEVBQTBCO2FBQy9DO1NBT0QsQ0FBQTtJQUdHLENBQUM7SUFFTCwwQ0FB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