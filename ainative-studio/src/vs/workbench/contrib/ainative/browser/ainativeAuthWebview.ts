/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { getActiveWindow, h } from '../../../../base/browser/dom.js';
import { IAINativeCloudAuthService, CloudAuthState, CloudUser } from '../common/ainativeCloudAuthTypes.js';
import { mountAuthDialog } from './react/out/auth-components/index.js';

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

const AUTH_VIEW_TO_DIALOG_VIEW: Record<AuthViewType, 'login' | 'register' | 'forgotPassword' | null> = {
	[AuthViewType.Login]: 'login',
	[AuthViewType.Register]: 'register',
	[AuthViewType.ForgotPassword]: 'forgotPassword',
	// AuthDialog (and the auth-components package generally) only implements the
	// login/register/forgot-password/reset-password flows that issue #146 scopes in.
	// ModelSelector and Account have no corresponding React view yet, so they fall
	// back to the info dialog below rather than silently doing nothing.
	[AuthViewType.ModelSelector]: null,
	[AuthViewType.Account]: null,
};

/**
 * AINativeAuthWebview
 * Mounts the AINative Cloud authentication UI (sign in / create account / forgot
 * password / reset password) as a floating overlay on top of the workbench.
 *
 * This does not use VS Code's sandboxed IWebviewService -- consistent with every
 * other React surface in this codebase (sidebar, settings, onboarding, tooltips),
 * the real React components are mounted directly into the workbench DOM via a
 * `mountFn(element, accessor)` helper that gets live VS Code services through
 * `ServicesAccessor`. See `ainative-onboarding/index.tsx` for the reference pattern
 * this class follows.
 */
export class AINativeAuthWebview extends Disposable {

	private _isShowing = false;
	private _overlayContainer: HTMLElement | undefined;
	private _mountDispose: (() => void) | undefined;

	constructor(
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@IDialogService private readonly dialogService: IDialogService,
		@IAINativeCloudAuthService private readonly authService: IAINativeCloudAuthService
	) {
		super();
	}

	/**
	 * Check if webview is currently showing
	 */
	isShowing(): boolean {
		return this._isShowing;
	}

	/**
	 * Show authentication dialog. Resolves once the dialog is closed (dismissed or
	 * completed), matching the await/dispose pattern used by ainativeAuthActions.ts.
	 */
	async show(options: ShowAuthWebviewOptions = {}): Promise<void> {
		if (this._isShowing) {
			// Already showing, just focus it
			return;
		}

		this._isShowing = true;

		try {
			const initialState = await this._getInitialState(options);
			const dialogView = AUTH_VIEW_TO_DIALOG_VIEW[initialState.initialView];

			if (dialogView === null) {
				// No real UI yet for this view (model selector / account) -- fall back
				// to a plain info dialog rather than silently doing nothing.
				await this._showUnsupportedViewDialog(initialState);
				return;
			}

			await this._showAuthDialog(initialState);
		} finally {
			this._isShowing = false;
		}
	}

	override dispose(): void {
		this._teardownOverlay();
		super.dispose();
	}

	/**
	 * Mount the real React auth UI (AuthDialog, routing between login/register/
	 * forgot-password/reset-password) as an overlay on the workbench, and await
	 * until the user closes it or completes authentication.
	 */
	private async _showAuthDialog(initialState: WebviewInitialState): Promise<void> {
		const targetWindow = getActiveWindow();
		const workbench = targetWindow.document.querySelector('.monaco-workbench');

		if (!workbench) {
			console.error('AINativeAuthWebview: could not find .monaco-workbench to mount auth dialog into');
			return;
		}

		const overlayContainer = h('div.ainative-auth-webview-container').root;
		workbench.appendChild(overlayContainer);
		this._overlayContainer = overlayContainer;

		await new Promise<void>(resolve => {
			let resolved = false;
			const finish = () => {
				if (resolved) {
					return;
				}
				resolved = true;
				this._teardownOverlay();
				resolve();
			};

			this.instantiationService.invokeFunction(accessor => {
				const result = mountAuthDialog(overlayContainer, accessor, {
					initialState: {
						authState: initialState.authState,
						isAuthenticated: initialState.isAuthenticated,
						user: initialState.user,
						initialView: initialState.initialView === AuthViewType.Register ? 'register'
							: initialState.initialView === AuthViewType.ForgotPassword ? 'forgotPassword'
								: 'login',
						projectId: initialState.projectId,
					},
					onClose: finish,
					onSuccess: finish,
				});

				this._mountDispose = result?.dispose;
			});
		});
	}

	private _teardownOverlay(): void {
		this._mountDispose?.();
		this._mountDispose = undefined;

		if (this._overlayContainer?.parentElement) {
			this._overlayContainer.parentElement.removeChild(this._overlayContainer);
		}
		this._overlayContainer = undefined;
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
	 * Fallback for view types without a real React UI yet (model selector, account).
	 */
	private async _showUnsupportedViewDialog(initialState: WebviewInitialState): Promise<void> {
		const viewName = this._getViewName(initialState.initialView);

		let message = `AINative Cloud\n\n`;
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

		message += `\n\nThis view does not have a dedicated UI yet.`;

		await this.dialogService.info(message, 'AINative Cloud');
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
}
