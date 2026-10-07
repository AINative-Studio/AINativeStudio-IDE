/*--------------------------------------------------------------------------------------
 *  Copyright 2025 AINative Studio All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

// registered in app.ts
// can't make a service responsible for this, because it needs
// to be connected to the main process and node dependencies

import { IServerChannel } from '../../../../base/parts/ipc/common/ipc.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport, getDefaultEnvironment } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { MCPConfigFileJSON, MCPConfigFileEntryJSON, MCPServer, RawMCPToolCall, MCPToolErrorResponse, MCPServerEventResponse, MCPToolCallParams, removeMCPToolNamePrefix, MCPConnectionLogEntry, MCPConnectionLogLevel } from '../common/mcpServiceTypes.js';
import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { MCPUserStateOfName } from '../common/ainativeSettingsTypes.js';
import { MCPOAuthClientProvider } from './mcpOAuthProvider.js';
import { UnauthorizedError } from '@modelcontextprotocol/sdk/client/auth.js';

const getClientConfig = (serverName: string) => {
	return {
		name: `${serverName}-client`,
		version: '0.1.0',
		// debug: true,
	}
}

type MCPServerNonError = MCPServer & { status: Omit<MCPServer['status'], 'error'> }
type MCPServerError = MCPServer & { status: 'error' }



type ClientInfo = {
	_client: Client, // _client is the client that connects with an mcp client. We're calling mcp clients "server" everywhere except here for naming consistency.
	mcpServerEntryJSON: MCPConfigFileEntryJSON,
	mcpServer: MCPServerNonError,
} | {
	_client?: undefined,
	mcpServerEntryJSON: MCPConfigFileEntryJSON,
	mcpServer: MCPServerError,
}

type InfoOfClientId = {
	[clientId: string]: ClientInfo
}

const MAX_CONNECTION_LOG_ENTRIES = 500;

export class MCPChannel implements IServerChannel {

	private readonly infoOfClientId: InfoOfClientId = {}
	private readonly _refreshingServerNames: Set<string> = new Set()
	private readonly _connectionLog: MCPConnectionLogEntry[] = []
	// Servers whose connection attempt hit UnauthorizedError (#176 re-authentication): the user
	// agent has already been redirected to the authorization URL by MCPOAuthClientProvider;
	// these wait here for completeOAuth() to be called once the ainativestudio://auth/mcp/callback
	// URL arrives, which finishes the OAuth exchange and retries the connection.
	private readonly _pendingAuth = new Map<string, { client: Client; transport: StreamableHTTPClientTransport | SSEClientTransport; serverConfig: MCPConfigFileEntryJSON; isOn: boolean }>()

	// mcp emitters
	private readonly mcpEmitters = {
		serverEvent: {
			onAdd: new Emitter<MCPServerEventResponse>(),
			onUpdate: new Emitter<MCPServerEventResponse>(),
			onDelete: new Emitter<MCPServerEventResponse>(),
		},
		onConnectionLog: new Emitter<MCPConnectionLogEntry>(),
	} satisfies {
		serverEvent: {
			onAdd: Emitter<MCPServerEventResponse>,
			onUpdate: Emitter<MCPServerEventResponse>,
			onDelete: Emitter<MCPServerEventResponse>,
		},
		onConnectionLog: Emitter<MCPConnectionLogEntry>,
	}

	constructor(
	) { }

	/**
	 * Records a connection/transport-level event (#176's connection log viewer) and keeps the
	 * existing console output unchanged - this is additive, not a replacement for the console
	 * log that's useful when debugging via a terminal attached to the main process directly.
	 */
	private _log(serverName: string, level: MCPConnectionLogLevel, message: string) {
		if (level === 'error') console.error(message);
		else if (level === 'warn') console.warn(message);
		else console.log(message);

		const entry: MCPConnectionLogEntry = { timestamp: Date.now(), serverName, level, message };
		this._connectionLog.push(entry);
		if (this._connectionLog.length > MAX_CONNECTION_LOG_ENTRIES) this._connectionLog.shift();
		this.mcpEmitters.onConnectionLog.fire(entry);
	}

	// browser uses this to listen for changes
	listen(_: unknown, event: string): Event<any> {

		// server events
		if (event === 'onAdd_server') return this.mcpEmitters.serverEvent.onAdd.event;
		else if (event === 'onUpdate_server') return this.mcpEmitters.serverEvent.onUpdate.event;
		else if (event === 'onDelete_server') return this.mcpEmitters.serverEvent.onDelete.event;
		else if (event === 'onConnectionLog') return this.mcpEmitters.onConnectionLog.event;
		// else if (event === 'onLoading_server') return this.mcpEmitters.serverEvent.onChangeLoading.event;

		// tool call events

		// handle unknown events
		else throw new Error(`Event not found: ${event}`);
	}

	// browser uses this to call (see this.channel.call() in mcpConfigService.ts for all usages)
	async call(_: unknown, command: string, params: any): Promise<any> {
		try {
			if (command === 'refreshMCPServers') {
				await this._refreshMCPServers(params)
			}
			else if (command === 'closeAllMCPServers') {
				await this._closeAllMCPServers()
			}
			else if (command === 'toggleMCPServer') {
				await this._toggleMCPServer(params.serverName, params.isOn)
			}
			else if (command === 'callTool') {
				const p: MCPToolCallParams = params
				const response = await this._safeCallTool(p.serverName, p.toolName, p.params)
				return response
			}
			else if (command === 'getConnectionLogs') {
				return this._connectionLog.slice()
			}
			else if (command === 'completeOAuth') {
				await this._completeOAuth(params.serverName, params.authorizationCode)
			}
			else {
				throw new Error(`Void sendLLM: command "${command}" not recognized.`)
			}
		}
		catch (e) {
			console.error('mcp channel: Call Error:', e)
		}
	}

	// server functions


	private async _refreshMCPServers(params: { mcpConfigFileJSON: MCPConfigFileJSON, userStateOfName: MCPUserStateOfName, addedServerNames: string[], removedServerNames: string[], updatedServerNames: string[] }) {

		const {
			mcpConfigFileJSON,
			userStateOfName,
			addedServerNames,
			removedServerNames,
			updatedServerNames,
		} = params

		const { mcpServers: mcpServersJSON } = mcpConfigFileJSON

		const allChanges: { type: 'added' | 'removed' | 'updated', serverName: string }[] = [
			...addedServerNames.map(n => ({ serverName: n, type: 'added' }) as const),
			...removedServerNames.map(n => ({ serverName: n, type: 'removed' }) as const),
			...updatedServerNames.map(n => ({ serverName: n, type: 'updated' }) as const),
		]

		await Promise.all(
			allChanges.map(async ({ serverName, type }) => {

				// check if already refreshing
				if (this._refreshingServerNames.has(serverName)) return
				this._refreshingServerNames.add(serverName)

				const prevServer = this.infoOfClientId[serverName]?.mcpServer;

				// close and delete the old client
				if (type === 'removed' || type === 'updated') {
					await this._closeClient(serverName)
					delete this.infoOfClientId[serverName]
					this.mcpEmitters.serverEvent.onDelete.fire({ response: { prevServer, name: serverName, } })
				}

				// create a new client
				if (type === 'added' || type === 'updated') {
					const clientInfo = await this._createClient(mcpServersJSON[serverName], serverName, userStateOfName[serverName]?.isOn)
					this.infoOfClientId[serverName] = clientInfo
					this.mcpEmitters.serverEvent.onAdd.fire({ response: { newServer: clientInfo.mcpServer, name: serverName, } })
				}
			})
		)

		allChanges.forEach(({ serverName, type }) => {
			this._refreshingServerNames.delete(serverName)
		})

	}

	private async _createClientUnsafe(server: MCPConfigFileEntryJSON, serverName: string, isOn: boolean): Promise<ClientInfo> {

		const clientConfig = getClientConfig(serverName)
		const client = new Client(clientConfig)
		let transport: Transport;
		let info: MCPServerNonError;

		if (server.url) {
			// authProvider is set unconditionally - StreamableHTTPClientTransport/SSEClientTransport
			// only ever use it (attempt token refresh, redirect to authorize) when the server
			// actually responds 401, so this has no effect on servers that don't require OAuth.
			const authProvider = new MCPOAuthClientProvider(serverName);

			// first try HTTP, fall back to SSE - except on UnauthorizedError, which means the
			// user agent has just been redirected to authorize (MCPOAuthClientProvider already
			// called shell.openExternal) - retrying over SSE would just trigger a second,
			// redundant redirect for the same auth. Register as pending instead and stop here;
			// completeOAuth() finishes the connection once the callback URL arrives.
			try {
				transport = new StreamableHTTPClientTransport(server.url, { authProvider });
				await client.connect(transport);
				this._log(serverName, 'info', `Connected via HTTP to ${serverName}`);
				const { tools } = await client.listTools()
				const toolsWithUniqueName = tools.map(({ name, ...rest }) => ({ name: this._addUniquePrefix(name), ...rest }))
				info = {
					status: isOn ? 'success' : 'offline',
					tools: toolsWithUniqueName,
					command: server.url.toString(),
				}
			} catch (httpErr) {
				if (httpErr instanceof UnauthorizedError) {
					this._log(serverName, 'info', `${serverName} requires sign-in - opened in your browser.`);
					this._pendingAuth.set(serverName, { client, transport: transport! as StreamableHTTPClientTransport, serverConfig: server, isOn });
					return { mcpServerEntryJSON: server, mcpServer: { status: 'error', error: 'Waiting for sign-in - check your browser.', command: server.url.toString() } };
				}

				this._log(serverName, 'warn', `HTTP failed for ${serverName}, trying SSE… ${httpErr}`);
				transport = new SSEClientTransport(server.url, { authProvider });
				try {
					await client.connect(transport);
				} catch (sseErr) {
					if (sseErr instanceof UnauthorizedError) {
						this._log(serverName, 'info', `${serverName} requires sign-in - opened in your browser.`);
						this._pendingAuth.set(serverName, { client, transport: transport as SSEClientTransport, serverConfig: server, isOn });
						return { mcpServerEntryJSON: server, mcpServer: { status: 'error', error: 'Waiting for sign-in - check your browser.', command: server.url.toString() } };
					}
					throw sseErr;
				}
				const { tools } = await client.listTools()
				const toolsWithUniqueName = tools.map(({ name, ...rest }) => ({ name: this._addUniquePrefix(name), ...rest }))
				this._log(serverName, 'info', `Connected via SSE to ${serverName}`);
				info = {
					status: isOn ? 'success' : 'offline',
					tools: toolsWithUniqueName,
					command: server.url.toString(),
				}
			}
		} else if (server.command) {
			// SECURITY: do not spread the full process.env here. This previously passed the
			// IDE's entire host environment - every secret/token/API key present in whatever
			// shell launched the IDE - to every stdio MCP server process, including
			// third-party servers a user just installed. getDefaultEnvironment() is the MCP
			// SDK's own documented safe default (HOME/PATH/SHELL/etc. on POSIX, the Windows
			// equivalent on win32 - "inspired by the default env inheritance of sudo") and is
			// what StdioClientTransport already falls back to on its own if no `env` override
			// is passed at all; calling it explicitly here keeps that same safe baseline while
			// still layering the user's own server.env config on top.
			transport = new StdioClientTransport({
				command: server.command,
				args: server.args,
				env: {
					...getDefaultEnvironment(),
					...server.env,
				} as Record<string, string>,
			});

			await client.connect(transport)
			this._log(serverName, 'info', `Connected via stdio to ${serverName}`);

			// Get the tools from the server
			const { tools } = await client.listTools()
			const toolsWithUniqueName = tools.map(({ name, ...rest }) => ({ name: this._addUniquePrefix(name), ...rest }))

			// Create a full command string for display
			const fullCommand = `${server.command} ${server.args?.join(' ') || ''}`

			// Format server object
			info = {
				status: isOn ? 'success' : 'offline',
				tools: toolsWithUniqueName,
				command: fullCommand,
			}

		} else {
			throw new Error(`No url or command for server ${serverName}`);
		}


		return { _client: client, mcpServerEntryJSON: server, mcpServer: info }
	}

	private _addUniquePrefix(base: string) {
		return `${Math.random().toString(36).slice(2, 8)}_${base}`;
	}

	private async _createClient(serverConfig: MCPConfigFileEntryJSON, serverName: string, isOn = true): Promise<ClientInfo> {
		try {
			const c: ClientInfo = await this._createClientUnsafe(serverConfig, serverName, isOn)
			return c
		} catch (err) {
			this._log(serverName, 'error', `❌ Failed to connect to server "${serverName}": ${err}`);
			const fullCommand = !serverConfig.command ? '' : `${serverConfig.command} ${serverConfig.args?.join(' ') || ''}`
			const c: MCPServerError = { status: 'error', error: err + '', command: fullCommand, }
			return { mcpServerEntryJSON: serverConfig, mcpServer: c, }
		}
	}

	private async _closeAllMCPServers() {
		for (const serverName in this.infoOfClientId) {
			await this._closeClient(serverName)
			delete this.infoOfClientId[serverName]
		}
		console.log('Closed all MCP servers');
	}

	private async _closeClient(serverName: string) {
		const info = this.infoOfClientId[serverName]
		if (!info) return
		const { _client: client } = info
		if (client) {
			await client.close()
		}
		this._log(serverName, 'info', `Closed MCP server ${serverName}`);
	}


	private async _toggleMCPServer(serverName: string, isOn: boolean) {
		const prevServer = this.infoOfClientId[serverName]?.mcpServer
		// Handle turning on the server
		if (isOn) {
			// this.mcpEmitters.serverEvent.onChangeLoading.fire(getLoadingServerObject(serverName, isOn))
			const clientInfo = await this._createClientUnsafe(this.infoOfClientId[serverName].mcpServerEntryJSON, serverName, isOn)
			this.mcpEmitters.serverEvent.onUpdate.fire({
				response: {
					name: serverName,
					newServer: clientInfo.mcpServer,
					prevServer: prevServer,
				}
			})
		}
		// Handle turning off the server
		else {
			// this.mcpEmitters.serverEvent.onChangeLoading.fire(getLoadingServerObject(serverName, isOn))
			this._closeClient(serverName)
			delete this.infoOfClientId[serverName]._client

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
			})
		}
	}

	/**
	 * Finishes the OAuth flow for a server that hit UnauthorizedError during connect (#176
	 * re-authentication): completes the authorization-code exchange on the pending transport,
	 * then retries the connection - per the MCP SDK's own documented flow (finishAuth, then
	 * retry connect/start). Called via the 'completeOAuth' channel command, itself triggered by
	 * MCPOAuthUrlHandler (browser/) when the ainativestudio://auth/mcp/callback URL arrives.
	 */
	private async _completeOAuth(serverName: string, authorizationCode: string): Promise<void> {
		const pending = this._pendingAuth.get(serverName)
		if (!pending) {
			this._log(serverName, 'warn', `Received an OAuth callback for "${serverName}" but no sign-in was pending for it.`)
			return
		}
		this._pendingAuth.delete(serverName)

		const prevServer = this.infoOfClientId[serverName]?.mcpServer
		try {
			await pending.transport.finishAuth(authorizationCode)
			await pending.client.connect(pending.transport)
			this._log(serverName, 'info', `Signed in to ${serverName}.`)

			const { tools } = await pending.client.listTools()
			const toolsWithUniqueName = tools.map(({ name, ...rest }) => ({ name: this._addUniquePrefix(name), ...rest }))
			const mcpServer: MCPServerNonError = {
				status: pending.isOn ? 'success' : 'offline',
				tools: toolsWithUniqueName,
				command: pending.serverConfig.url?.toString() ?? '',
			}
			this.infoOfClientId[serverName] = { _client: pending.client, mcpServerEntryJSON: pending.serverConfig, mcpServer }
			this.mcpEmitters.serverEvent.onUpdate.fire({ response: { name: serverName, newServer: mcpServer, prevServer } })
		} catch (err) {
			this._log(serverName, 'error', `Sign-in to ${serverName} failed: ${err}`)
			const mcpServer: MCPServerError = { status: 'error', error: `Sign-in failed: ${err}`, command: pending.serverConfig.url?.toString() ?? '' }
			this.infoOfClientId[serverName] = { mcpServerEntryJSON: pending.serverConfig, mcpServer }
			this.mcpEmitters.serverEvent.onUpdate.fire({ response: { name: serverName, newServer: mcpServer, prevServer } })
		}
	}

	// tool call functions

	private async _callTool(serverName: string, toolName: string, params: any): Promise<RawMCPToolCall> {
		const server = this.infoOfClientId[serverName]
		if (!server) throw new Error(`Server ${serverName} not found`)
		const { _client: client } = server
		if (!client) throw new Error(`Client for server ${serverName} not found`)

		// Call the tool with the provided parameters
		const response = await client.callTool({
			name: removeMCPToolNamePrefix(toolName),
			arguments: params
		})
		const { content } = response as CallToolResult
		const returnValue = content[0]

		if (returnValue.type === 'text') {
			// handle text response

			if (response.isError) {
				throw new Error(`Tool call error: ${returnValue.text}`)
			}

			// handle success
			return {
				event: 'text',
				text: returnValue.text,
				toolName,
				serverName,
			}
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

		throw new Error(`Tool call error: We don\'t support ${returnValue.type} tool response yet for tool ${toolName} on server ${serverName}`)
	}

	// tool call error wrapper
	private async _safeCallTool(serverName: string, toolName: string, params: any): Promise<RawMCPToolCall> {
		try {
			const response = await this._callTool(serverName, toolName, params)
			return response
		} catch (err) {

			let errorMessage: string;

			if (typeof err === 'object' && err !== null && err['code']) {
				const code = err.code
				let codeDescription = ''
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
				errorMessage = `${codeDescription}. Full response:\n${JSON.stringify(err, null, 2)}`
			}
			// Check if it's an MCP error with a code
			else if (typeof err === 'string') {
				// String error
				errorMessage = err;
			} else {
				// Unknown error format
				errorMessage = JSON.stringify(err, null, 2);
			}

			const fullErrorMessage = `❌ Failed to call tool "${toolName}" on server "${serverName}": ${errorMessage}`;
			const errorResponse: MCPToolErrorResponse = {
				event: 'error',
				text: fullErrorMessage,
				toolName,
				serverName,
			}
			return errorResponse
		}
	}
}


