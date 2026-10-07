/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { URI } from '../../../../base/common/uri.js';
import { IURLHandler, IURLService } from '../../../../platform/url/common/url.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IWorkbenchContribution, WorkbenchPhase, registerWorkbenchContribution2 } from '../../../common/contributions.js';
import { IMCPService } from '../common/mcpService.js';

/**
 * Handles MCP OAuth callback URLs (#176 re-authentication), the same ainativestudio:// custom
 * protocol / IURLService pattern githubOAuthUrlHandler.ts already uses for GitHub sign-in.
 * Format: ainativestudio://auth/mcp/callback?server=<name>&code=<authorization code>
 *
 * MCPOAuthClientProvider.redirectUrl (electron-main/mcpOAuthProvider.ts) is what tells the MCP
 * server's authorization endpoint to redirect back to this exact URL once the user approves.
 */
export class MCPOAuthUrlHandler extends Disposable implements IURLHandler, IWorkbenchContribution {

	static readonly ID = 'workbench.contrib.ainative.mcpOAuthUrlHandler';

	constructor(
		@ILogService private readonly logService: ILogService,
		@IMCPService private readonly mcpService: IMCPService,
		@IURLService urlService: IURLService,
	) {
		super();
		this._register(urlService.registerHandler(this));
	}

	async handleURL(uri: URI): Promise<boolean> {
		if (uri.authority !== 'auth' || !uri.path.startsWith('/mcp/callback')) {
			return false;
		}

		const query = new URLSearchParams(uri.query);
		const serverName = query.get('server');
		const code = query.get('code');

		if (!serverName || !code) {
			this.logService.error('[MCPOAuthUrlHandler] Missing server or code parameter in MCP OAuth callback');
			return false;
		}

		this.logService.info(`[MCPOAuthUrlHandler] Completing OAuth sign-in for MCP server "${serverName}"`);
		try {
			await this.mcpService.completeOAuth(serverName, code);
		} catch (error) {
			this.logService.error('[MCPOAuthUrlHandler] Error completing MCP OAuth callback:', error);
		}
		return true;
	}
}

registerWorkbenchContribution2(
	MCPOAuthUrlHandler.ID,
	MCPOAuthUrlHandler,
	WorkbenchPhase.Eventually,
);
