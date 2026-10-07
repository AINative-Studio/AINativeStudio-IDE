/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { shell, safeStorage, app } from 'electron';
import { promises as fs } from 'fs';
import { join } from 'path';
import type { OAuthClientProvider } from '@modelcontextprotocol/sdk/client/auth.js';
import type { OAuthClientInformation, OAuthClientInformationFull, OAuthTokens } from '@modelcontextprotocol/sdk/shared/auth.js';

/**
 * Re-authentication (#176's last unscoped piece) for HTTP/SSE-based MCP servers. stdio servers
 * are local subprocesses, not remote endpoints - OAuth never applied to them, so this covers
 * exactly the 2 transports that actually need it, not "3 transport types" as originally scoped.
 *
 * Implements the MCP SDK's own OAuthClientProvider interface - the SDK (client/auth.js) already
 * has a complete, spec-compliant OAuth client (PKCE, dynamic client registration, RFC 8414
 * metadata discovery) built in; StreamableHTTPClientTransport/SSEClientTransport already accept
 * an `authProvider` option and handle the full connect -> refresh -> re-authorize flow
 * automatically once given one. This class is the one piece that's actually
 * application-specific: where tokens/client info/PKCE verifiers get stored, and how the user
 * agent gets redirected to authorize.
 *
 * Token storage: one JSON file per server under userData/mcp-oauth/, encrypted via Electron's
 * safeStorage (the same primitive this codebase's own encryptionMainService.ts already wraps
 * for its own secrets - confirmed during this session's #152 resolution). MCPChannel (this
 * class's only caller) is constructed directly with `new MCPChannel()`, not through
 * IInstantiationService, so there is no DI access to IEncryptionMainService here - safeStorage
 * is called directly, same as nativeHostMainService.ts does for other main-process-only needs.
 */
export class MCPOAuthClientProvider implements OAuthClientProvider {
	private readonly _storePath: string;
	private _cache: {
		clientInformation?: OAuthClientInformationFull;
		tokens?: OAuthTokens;
		codeVerifier?: string;
	} | undefined;

	constructor(private readonly serverName: string) {
		this._storePath = join(app.getPath('userData'), 'mcp-oauth', `${encodeURIComponent(serverName)}.json`);
	}

	get redirectUrl(): string {
		return `ainativestudio://auth/mcp/callback?server=${encodeURIComponent(this.serverName)}`;
	}

	get clientMetadata() {
		return {
			redirect_uris: [this.redirectUrl],
			client_name: 'AINative Studio',
			grant_types: ['authorization_code', 'refresh_token'],
			response_types: ['code'],
			token_endpoint_auth_method: 'none', // public client (desktop app, no client secret to protect)
		};
	}

	private async _load(): Promise<NonNullable<typeof this._cache>> {
		if (this._cache) return this._cache;
		try {
			const encrypted = await fs.readFile(this._storePath);
			const decrypted = safeStorage.isEncryptionAvailable()
				? safeStorage.decryptString(encrypted)
				: encrypted.toString('utf8'); // fallback: platform has no OS-level encryption available
			this._cache = JSON.parse(decrypted);
		} catch {
			this._cache = {}; // no stored state yet for this server
		}
		return this._cache!;
	}

	private async _save(): Promise<void> {
		if (!this._cache) return;
		await fs.mkdir(join(app.getPath('userData'), 'mcp-oauth'), { recursive: true });
		const plain = JSON.stringify(this._cache);
		const toWrite = safeStorage.isEncryptionAvailable() ? safeStorage.encryptString(plain) : Buffer.from(plain, 'utf8');
		await fs.writeFile(this._storePath, toWrite);
	}

	async clientInformation(): Promise<OAuthClientInformation | undefined> {
		return (await this._load()).clientInformation;
	}

	async saveClientInformation(clientInformation: OAuthClientInformationFull): Promise<void> {
		const state = await this._load();
		state.clientInformation = clientInformation;
		await this._save();
	}

	async tokens(): Promise<OAuthTokens | undefined> {
		return (await this._load()).tokens;
	}

	async saveTokens(tokens: OAuthTokens): Promise<void> {
		const state = await this._load();
		state.tokens = tokens;
		await this._save();
	}

	async redirectToAuthorization(authorizationUrl: URL): Promise<void> {
		await shell.openExternal(authorizationUrl.toString());
	}

	async saveCodeVerifier(codeVerifier: string): Promise<void> {
		const state = await this._load();
		state.codeVerifier = codeVerifier;
		await this._save();
	}

	async codeVerifier(): Promise<string> {
		const verifier = (await this._load()).codeVerifier;
		if (!verifier) throw new Error(`No PKCE code verifier stored for MCP server "${this.serverName}".`);
		return verifier;
	}
}
