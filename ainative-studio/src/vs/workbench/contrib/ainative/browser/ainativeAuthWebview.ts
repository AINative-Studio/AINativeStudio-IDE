/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import Severity from '../../../../base/common/severity.js';
import { IAINativeCloudAuthService, CloudAuthState, CloudUser } from '../common/ainativeCloudAuthTypes.js';
import { IAIModelRegistryService } from '../common/aiModelRegistryService.js';
import { AINativeAuthUIHandler, UIMessage, UIResponse } from './ainativeAuthUIHandler.js';

/**
 * View types for authentication webview
 */
export enum AuthViewType {
	Login = 'login',
	Register = 'register',
	ForgotPassword = 'forgotPassword',
	ModelSelector = 'modelSelector',
	Account = 'account'
}

/**
 * Options for showing auth webview
 */
export interface ShowAuthWebviewOptions {
	readonly initialView?: AuthViewType;
	readonly projectId?: string;
}

/**
 * Initial state for webview
 */
export interface WebviewInitialState {
	readonly authState: CloudAuthState;
	readonly isAuthenticated: boolean;
	readonly user: CloudUser | null;
	readonly initialView: AuthViewType;
	readonly projectId?: string;
}

/**
 * AINativeAuthWebview
 * Creates and manages authentication webview dialogs
 */
export class AINativeAuthWebview extends Disposable {

	private readonly uiHandler: AINativeAuthUIHandler;
	private _isShowing = false;

	constructor(
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@IDialogService private readonly dialogService: IDialogService,
		@IAINativeCloudAuthService private readonly authService: IAINativeCloudAuthService,
		@IAIModelRegistryService private readonly modelRegistryService: IAIModelRegistryService
	) {
		super();

		// Create UI handler
		this.uiHandler = this._register(
			new AINativeAuthUIHandler(this.authService, this.modelRegistryService)
		);

		// Listen for messages from UI handler to send to webview
		this._register(this.uiHandler.onDidSendMessage(message => {
			this._handleOutgoingMessage(message);
		}));
	}

	/**
	 * Check if webview is currently showing
	 */
	isShowing(): boolean {
		return this._isShowing;
	}

	/**
	 * Show authentication dialog
	 */
	async show(options: ShowAuthWebviewOptions = {}): Promise<void> {
		if (this._isShowing) {
			// Already showing, just focus it
			return;
		}

		this._isShowing = true;

		try {
			// Get initial state
			const initialState = await this._getInitialState(options);

			// For now, show a placeholder dialog
			// TODO: Replace with actual React-based webview when React components are ready
			await this._showPlaceholderDialog(initialState);

		} finally {
			this._isShowing = false;
		}
	}

	/**
	 * Get initial state for webview
	 */
	private async _getInitialState(options: ShowAuthWebviewOptions): Promise<WebviewInitialState> {
		const authState = this.authService.getAuthState();
		const isAuthenticated = this.authService.isAuthenticated();
		const user = await this.authService.getCurrentUser();

		return {
			authState,
			isAuthenticated,
			user,
			initialView: options.initialView || AuthViewType.Login,
			projectId: options.projectId
		};
	}

	/**
	 * Handle outgoing message to webview
	 */
	private _handleOutgoingMessage(message: UIResponse): void {
		// TODO: Send message to actual webview when React components are ready
		console.log('AINativeAuthWebview: Outgoing message:', message);
	}

	/**
	 * Handle incoming message from webview
	 */
	private async _handleIncomingMessage(message: UIMessage): Promise<void> {
		await this.uiHandler.handleMessage(message);
	}

	/**
	 * Show placeholder dialog
	 * This is a temporary implementation until React components are built
	 */
	private async _showPlaceholderDialog(initialState: WebviewInitialState): Promise<void> {
		const viewName = this._getViewName(initialState.initialView);

		let message = `AINative Cloud Authentication\n\n`;
		message += `View: ${viewName}\n`;
		message += `Authentication State: ${initialState.authState}\n`;
		message += `Is Authenticated: ${initialState.isAuthenticated}\n`;

		if (initialState.user) {
			message += `\nUser Information:\n`;
			message += `  Email: ${initialState.user.email}\n`;
			message += `  Username: ${initialState.user.username || 'N/A'}\n`;
			message += `  Name: ${initialState.user.name || 'N/A'}\n`;
			message += `  Role: ${initialState.user.role}\n`;
			message += `  Email Verified: ${initialState.user.emailVerified ? 'Yes' : 'No'}\n`;
		}

		message += `\n\nNote: This is a placeholder dialog. The actual React-based authentication UI is under development.`;

		await this.dialogService.info(message, 'AINative Cloud Authentication - Coming Soon');
	}

	/**
	 * Get human-readable view name
	 */
	private _getViewName(viewType: AuthViewType): string {
		switch (viewType) {
			case AuthViewType.Login:
				return 'Sign In';
			case AuthViewType.Register:
				return 'Create Account';
			case AuthViewType.ForgotPassword:
				return 'Forgot Password';
			case AuthViewType.ModelSelector:
				return 'Select AI Model';
			case AuthViewType.Account:
				return 'Account Information';
			default:
				return 'Unknown';
		}
	}

	/**
	 * Generate webview HTML
	 * This will be used when React components are ready
	 */
	private _getWebviewHTML(initialState: WebviewInitialState): string {
		return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline' 'unsafe-eval';">
	<title>AINative Cloud Authentication</title>
	<style>
		body {
			padding: 0;
			margin: 0;
			font-family: var(--vscode-font-family);
			font-size: var(--vscode-font-size);
			color: var(--vscode-foreground);
			background-color: var(--vscode-editor-background);
		}
		#root {
			width: 100%;
			height: 100vh;
		}
		.placeholder {
			display: flex;
			align-items: center;
			justify-content: center;
			height: 100vh;
			flex-direction: column;
			gap: 20px;
		}
		.placeholder h1 {
			margin: 0;
			color: var(--vscode-foreground);
		}
		.placeholder p {
			margin: 0;
			color: var(--vscode-descriptionForeground);
		}
	</style>
</head>
<body>
	<div id="root">
		<div class="placeholder">
			<h1>AINative Cloud Authentication</h1>
			<p>React authentication UI coming soon...</p>
			<p>Initial View: ${initialState.initialView}</p>
			<p>Authenticated: ${initialState.isAuthenticated}</p>
		</div>
	</div>
	<script>
		// Initialize window API for React components
		window.AINATIVE_INITIAL_STATE = ${JSON.stringify(initialState)};

		// Helper function to send messages to VS Code
		window.sendToVSCode = function(type, data) {
			const requestId = Date.now().toString(36) + Math.random().toString(36).substr(2);
			window.postMessage({
				type: type,
				requestId: requestId,
				data: data
			}, '*');
		};

		// Helper function to send async messages to VS Code
		window.sendToVSCodeAsync = function(type, data) {
			return new Promise((resolve, reject) => {
				const requestId = Date.now().toString(36) + Math.random().toString(36).substr(2);

				const handleResponse = (event) => {
					const message = event.data;
					if (message.requestId === requestId) {
						window.removeEventListener('message', handleResponse);

						if (message.success) {
							resolve(message.data);
						} else {
							reject(new Error(message.error?.message || 'Request failed'));
						}
					}
				};

				window.addEventListener('message', handleResponse);

				window.postMessage({
					type: type,
					requestId: requestId,
					data: data
				}, '*');

				// Timeout after 30 seconds
				setTimeout(() => {
					window.removeEventListener('message', handleResponse);
					reject(new Error('Request timeout'));
				}, 30000);
			});
		};

		// Listen for messages from VS Code
		window.addEventListener('message', (event) => {
			const message = event.data;

			// Dispatch custom event for React components
			const customEvent = new CustomEvent('vscode-message', {
				detail: message
			});
			window.dispatchEvent(customEvent);
		});

		console.log('AINative Auth Webview initialized with state:', window.AINATIVE_INITIAL_STATE);
	</script>

	<!-- React app will be loaded here when ready -->
	<!-- <script src="react-bundle.js"></script> -->
</body>
</html>`;
	}
}
