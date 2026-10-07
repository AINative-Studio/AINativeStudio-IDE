/**
 * mcp-response-types.ts
 * --------------------------------------------------
 * **Pure** TypeScript interfaces (no external imports)
 * describing the JSON-RPC response shapes for:
 *
 *   1. tools/list      -> ToolsListResponse
 *   2. prompts/list    -> PromptsListResponse
 *   3. tools/call      -> ToolCallResponse
 *
 * They are distilled directly from the official MCP
 * 2025‑03‑26 specification:
 *   • Tools list response examples
 *   • Prompts list response examples
 *   • Tool call response examples
 *
 * Use them to get full IntelliSense when working with
 * @modelcontextprotocol/inspector‑cli responses.
 */


/* -------------------------------------------------- */
/* Core JSON‑RPC envelope                              */
/* -------------------------------------------------- */

// export interface JsonRpcSuccess<T> {
// 	/** JSON‑RPC version – always '2.0' */
// 	jsonrpc: '2.0';
// 	/** Request identifier echoed back by the server */
// 	id: string | number | null;
// 	/** The successful result payload */
// 	result: T;
// }

/* -------------------------------------------------- */
/* Utility: pagination                                 */
/* -------------------------------------------------- */

// export interface Paginated {
// 	/** Opaque cursor for fetching the next page */
// 	nextCursor?: string;
// }

/* -------------------------------------------------- */
/* 1. tools/list                                       */
/* -------------------------------------------------- */

export interface MCPTool {
	/** Unique tool identifier */
	name: string;
	/** Human‑readable description */
	description?: string;
	/** JSON schema describing expected arguments */
	inputSchema?: Record<string, unknown>;
	/** Free‑form annotations describing behaviour, security, etc. */
	annotations?: Record<string, unknown>;
}

// export interface ToolsListResult extends Paginated {
// 	tools: MCPTool[];
// }

// export type ToolsListResponse = JsonRpcSuccess<ToolsListResult>;

/* -------------------------------------------------- */
/* 2. prompts/list                                     */
/* -------------------------------------------------- */

// export interface PromptArgument {
// 	name: string;
// 	description?: string;
// 	/** Whether the argument is required */
// 	required?: boolean;
// }

// export interface Prompt {
// 	name: string;
// 	description?: string;
// 	arguments?: PromptArgument[];
// }

// export interface PromptsListResult extends Paginated {
// 	prompts: Prompt[];
// }

// export type PromptsListResponse = JsonRpcSuccess<PromptsListResult>;

/* -------------------------------------------------- */
/* 3. tools/call                                       */
/* -------------------------------------------------- */

/** Additional resource structure that can be embedded in tool results */
// export interface Resource {
// 	uri: string;
// 	mimeType: string;
// 	/** Either plain‑text or base64‑encoded binary data */
// 	text?: string;
// 	data?: string;
// }

/** Individual content items returned by a tool */
// export type ToolContent =
// 	| { type: 'text'; text: string }
// 	| { type: 'image'; data: string; mimeType: string }
// 	| { type: 'audio'; data: string; mimeType: string }
// 	| { type: 'resource'; resource: Resource };

// export interface ToolCallResult {
// 	/** List of content parts (text, images, resources, etc.) */
// 	content: ToolContent[];
// 	/** True if the tool itself encountered a domain‑level error */
// 	isError?: boolean;
// }

// export type ToolCallResponse = JsonRpcSuccess<ToolCallResult>;

// MCP SERVER CONFIG FILE TYPES -----------------------------

export interface MCPConfigFileEntryJSON {
	// Command-based server properties
	command?: string;
	args?: string[];
	env?: Record<string, string>;

	// URL-based server properties
	url?: URL;
	headers?: Record<string, string>;
}

export interface MCPConfigFileJSON {
	mcpServers: Record<string, MCPConfigFileEntryJSON>;
}


// SERVER EVENT TYPES ------------------------------------------

export type MCPServer = {
	// Command-based server properties
	tools: MCPTool[],
	status: 'loading' | 'success' | 'offline',
	command?: string,
	error?: string,
} | {
	tools?: undefined,
	status: 'error',
	command?: string,
	error: string,
}

export interface MCPServerOfName {
	[serverName: string]: MCPServer;
}

export type MCPServerEvent = {
	name: string;
	prevServer?: MCPServer;
	newServer?: MCPServer;
}
export type MCPServerEventResponse = { response: MCPServerEvent }

export interface MCPConfigFileParseErrorResponse {
	response: {
		type: 'config-file-error';
		error: string | null;
	}
}

// CONNECTION LOG TYPES (#176 - connection log viewer) ------------------------------------------
//
// MCP connection/transport events (connect, disconnect, connection failure) only went to
// console.log/console.error in the main process before this - never surfaced to the user. This
// is a ring-buffer log the renderer can query via the same IPC channel ('ainative-channel-mcp')
// already used for everything else in this file, distinct from the Tool Logs panel (#150, which
// is tool-CALL history, not connection/transport-level events).

export type MCPConnectionLogLevel = 'info' | 'warn' | 'error';

export interface MCPConnectionLogEntry {
	readonly timestamp: number; // Date.now()
	readonly serverName: string;
	readonly level: MCPConnectionLogLevel;
	readonly message: string;
}


// export type MCPServerResponse = MCPAddResponse | MCPUpdateResponse | MCPDeleteResponse | MCPLoadingResponse;

// Event parameter types
// export type MCPServerEventAddParam = { response: MCPAddResponse };
// export type MCPServerEventUpdateParam = { response: MCPUpdateResponse };
// export type MCPServerEventDeleteParam = { response: MCPDeleteResponse };
// export type MCPServerEventLoadingParam = { response: MCPLoadingResponse };

// Event Param union type
// export type MCPServerEventParam = MCPServerEventAddParam | MCPServerEventUpdateParam | MCPServerEventDeleteParam | MCPServerEventLoadingParam;

// TOOL CALL EVENT TYPES ------------------------------------------

type MCPToolResponseType = 'text' | 'image' | 'audio' | 'resource' | 'error';

type ResponseImageTypes = 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp' | 'image/svg+xml' | 'image/bmp' | 'image/tiff' | 'image/vnd.microsoft.icon';

interface ImageData {
	data: string;
	mimeType: ResponseImageTypes;
}

interface MCPToolResponseBase {
	toolName: string;
	serverName?: string;
	event: MCPToolResponseType;
	text?: string;
	image?: ImageData;
}

type MCPToolResponseConstraints = {
	'text': {
		image?: never;
		text: string;
	};
	'error': {
		image?: never;
		text: string;
	};
	'image': {
		text?: never;
		image: ImageData;
	};
	'audio': {
		text?: never;
		image?: never;
	};
	'resource': {
		text?: never;
		image?: never;
	}
}

type MCPToolEventResponse<T extends MCPToolResponseType> = Omit<MCPToolResponseBase, 'event' | keyof MCPToolResponseConstraints> & MCPToolResponseConstraints[T] & { event: T };

// Response types
export type MCPToolTextResponse = MCPToolEventResponse<'text'>;
export type MCPToolErrorResponse = MCPToolEventResponse<'error'>;
export type MCPToolImageResponse = MCPToolEventResponse<'image'>;
export type MCPToolAudioResponse = MCPToolEventResponse<'audio'>;
export type MCPToolResourceResponse = MCPToolEventResponse<'resource'>;
export type RawMCPToolCall = MCPToolTextResponse | MCPToolErrorResponse | MCPToolImageResponse | MCPToolAudioResponse | MCPToolResourceResponse;

export interface MCPToolCallParams {
	serverName: string;
	toolName: string;
	params: Record<string, unknown>;
}



export const removeMCPToolNamePrefix = (name: string) => {
	return name.split('_').slice(1).join('_')
}

/**
 * True if a tool should be hidden from the agent's tool list / rejected if called, per the
 * per-tool enable/disable state (#175). Pure function - no service dependencies - so the
 * filtering logic used by both mcpService.getMCPTools() and mcpService.callMCPTool() is covered
 * by a real unit test without needing to construct the full MCPService (6 injected dependencies
 * including live IPC channel setup, impractical to mock cleanly for this one piece of logic).
 */
export const isMCPToolDisabled = (disabledToolNames: readonly string[] | undefined, toolName: string): boolean => {
	return (disabledToolNames ?? []).includes(toolName)
}

// MCP REGISTRY (#176) ------------------------------------------
//
// There is no backend MCP catalog/registry endpoint today (confirmed against the live
// api.ainative.studio OpenAPI spec - no /mcp/* routes of any kind exist), so this starts as a
// small, curated, build-time list of well-known community MCP servers rather than something
// fetched over the network. It gives users an "install" action instead of "open mcp.json and
// hand-write JSON," which is the entire gap this issue is about. When/if a real backend catalog
// ships, only _defaultRegistry below needs to change - everything that consumes
// RegistryEntry/mergeRegistryEntryIntoConfig stays the same.

export interface MCPRegistryEntry {
	/** Unique id within the registry; becomes the key under mcpServers if installed under its default name. */
	readonly id: string;
	readonly displayName: string;
	readonly description: string;
	readonly homepage?: string;
	/** The exact config entry to write into mcp.json's mcpServers[name] on install. */
	readonly config: MCPConfigFileEntryJSON;
	/**
	 * Names of env vars the server process expects (e.g. API keys). Purely descriptive - the
	 * registry never stores values, only which keys a user will be prompted to fill in. See
	 * #176's "approved-environment-variable tracking": this is the list install-time UI would
	 * show as "this server wants access to: X, Y" before anything is written to disk.
	 */
	readonly requiredEnvVars?: readonly string[];
}

const _defaultRegistry: readonly MCPRegistryEntry[] = [
	{
		id: 'memory',
		displayName: 'Memory',
		description: 'Simple persistent key-value memory for the agent, backed by a local knowledge graph.',
		homepage: 'https://github.com/modelcontextprotocol/servers/tree/main/src/memory',
		config: { command: 'npx', args: ['-y', '@modelcontextprotocol/server-memory'] },
	},
	{
		id: 'filesystem',
		displayName: 'Filesystem',
		description: 'Read/write access to a specific local directory, scoped outside the current workspace.',
		homepage: 'https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem',
		config: { command: 'npx', args: ['-y', '@modelcontextprotocol/server-filesystem', '/path/to/allowed/files'] },
	},
	{
		id: 'fetch',
		displayName: 'Fetch',
		description: 'Fetches a URL and converts its content to markdown for the agent to read.',
		homepage: 'https://github.com/modelcontextprotocol/servers/tree/main/src/fetch',
		config: { command: 'uvx', args: ['mcp-server-fetch'] },
	},
	{
		id: 'github',
		displayName: 'GitHub',
		description: 'Search repos, read/write files, and manage issues and PRs on GitHub.',
		homepage: 'https://github.com/github/github-mcp-server',
		config: { command: 'npx', args: ['-y', '@modelcontextprotocol/server-github'] },
		requiredEnvVars: ['GITHUB_PERSONAL_ACCESS_TOKEN'],
	},
	{
		id: 'brave-search',
		displayName: 'Brave Search',
		description: 'Web and local search via the Brave Search API.',
		homepage: 'https://github.com/modelcontextprotocol/servers/tree/main/src/brave-search',
		config: { command: 'npx', args: ['-y', '@modelcontextprotocol/server-brave-search'] },
		requiredEnvVars: ['BRAVE_API_KEY'],
	},
];

export const getMCPRegistry = (): readonly MCPRegistryEntry[] => _defaultRegistry;

export const findMCPRegistryEntry = (id: string): MCPRegistryEntry | undefined =>
	_defaultRegistry.find(e => e.id === id);

export type MCPInstallResult = {
	ok: true;
	configFileJSON: MCPConfigFileJSON;
	/** True if this install overwrote an existing entry under the same name. */
	overwritten: boolean;
} | {
	ok: false;
	error: string;
};

/**
 * Pure merge of a registry entry into an existing parsed mcp.json, under `installAsName`
 * (defaults to the entry's id). Returns the new config object rather than writing anything -
 * callers (MCPService) own the actual file I/O, keeping this testable without a filesystem.
 */
export const mergeRegistryEntryIntoConfig = (
	currentConfig: MCPConfigFileJSON,
	entry: MCPRegistryEntry,
	installAsName?: string,
): MCPInstallResult => {
	const name = installAsName === undefined ? entry.id : installAsName.trim();
	if (!name) {
		return { ok: false, error: 'Server name cannot be empty.' };
	}

	const overwritten = name in currentConfig.mcpServers;
	const configFileJSON: MCPConfigFileJSON = {
		...currentConfig,
		mcpServers: {
			...currentConfig.mcpServers,
			[name]: entry.config,
		},
	};
	return { ok: true, configFileJSON, overwritten };
};
