/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { URI } from '../../../../base/common/uri.js';
import { IURLHandler, IURLService } from '../../../../platform/url/common/url.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IGitHubOAuthService } from '../common/githubOAuthService.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IWorkbenchContribution, WorkbenchPhase, registerWorkbenchContribution2 } from '../../../common/contributions.js';

/**
 * Handles GitHub OAuth callback URLs
 * Format: ainativestudio://auth/github/callback?code=xxx&state=yyy
 */
export class GitHubOAuthUrlHandler extends Disposable implements IURLHandler, IWorkbenchContribution {

	static readonly ID = 'workbench.contrib.githubOAuthUrlHandler';

	constructor(
		@ILogService private readonly logService: ILogService,
		@IGitHubOAuthService private readonly githubOAuthService: IGitHubOAuthService,
		@IURLService urlService: IURLService
	) {
		super();

		// Register this handler with the URL service
		this._register(urlService.registerHandler(this));
	}

	/**
	 * Handle incoming URLs
	 */
	async handleURL(uri: URI): Promise<boolean> {
		this.logService.trace('[GitHubOAuthUrlHandler] Received URL:', uri.toString());

		// Check if this is a GitHub OAuth callback
		// Format: ainativestudio://auth/github/callback
		if (uri.authority !== 'auth' || !uri.path.startsWith('/github/callback')) {
			this.logService.trace('[GitHubOAuthUrlHandler] Not a GitHub OAuth callback URL');
			return false;
		}

		// Parse query parameters
		const query = new URLSearchParams(uri.query);
		const code = query.get('code');
		const state = query.get('state');

		if (!code || !state) {
			this.logService.error('[GitHubOAuthUrlHandler] Missing code or state parameter');
			return false;
		}

		this.logService.info('[GitHubOAuthUrlHandler] Processing GitHub OAuth callback');

		try {
			// Handle the OAuth callback
			const result = await this.githubOAuthService.handleCallback(code, state);

			if (result.success) {
				this.logService.info('[GitHubOAuthUrlHandler] GitHub OAuth successful');
			} else {
				this.logService.error('[GitHubOAuthUrlHandler] GitHub OAuth failed:', result.error);
			}

			return true;
		} catch (error) {
			this.logService.error('[GitHubOAuthUrlHandler] Error handling OAuth callback:', error);
			return false;
		}
	}
}

// Register as workbench contribution
registerWorkbenchContribution2(
	GitHubOAuthUrlHandler.ID,
	GitHubOAuthUrlHandler,
	WorkbenchPhase.Eventually
);
