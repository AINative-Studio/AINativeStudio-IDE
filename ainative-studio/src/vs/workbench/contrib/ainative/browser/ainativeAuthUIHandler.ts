/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { IAINativeCloudAuthService, CloudAuthState, CloudUser, CloudAuthErrorCode } from '../common/ainativeCloudAuthTypes.js';
import { IAIModelRegistryService } from '../common/aiModelRegistryService.js';
import { ModelSelectionConfig } from '../common/aiModelRegistryTypes.js';

/**
 * Message types for UI communication
 */
export enum UIMessageType {
	// Authentication messages
	AUTH_LOGIN = 'auth-login',
	AUTH_LOGIN_SUCCESS = 'auth-login-success',
	AUTH_REGISTER = 'auth-register',
	AUTH_REGISTER_SUCCESS = 'auth-register-success',
	AUTH_LOGOUT = 'auth-logout',
	AUTH_LOGOUT_SUCCESS = 'auth-logout-success',
	AUTH_GET_STATE = 'auth-get-state',
	AUTH_STATE_RESULT = 'auth-state-result',
	AUTH_GET_USER = 'auth-get-user',
	AUTH_USER_RESULT = 'auth-user-result',
	AUTH_REQUEST_PASSWORD_RESET = 'auth-request-password-reset',
	AUTH_PASSWORD_RESET_REQUESTED = 'auth-password-reset-requested',
	AUTH_CONFIRM_PASSWORD_RESET = 'auth-confirm-password-reset',
	AUTH_PASSWORD_RESET_CONFIRMED = 'auth-password-reset-confirmed',
	AUTH_CHANGE_PASSWORD = 'auth-change-password',
	AUTH_PASSWORD_CHANGED = 'auth-password-changed',
	AUTH_RESEND_VERIFICATION = 'auth-resend-verification',
	AUTH_VERIFICATION_RESENT = 'auth-verification-resent',
	AUTH_VERIFY_EMAIL = 'auth-verify-email',
	AUTH_EMAIL_VERIFIED = 'auth-email-verified',

	// Model registry messages
	MODEL_LIST = 'model-list',
	MODEL_LIST_RESULT = 'model-list-result',
	MODEL_SELECT = 'model-select',
	MODEL_SELECT_SUCCESS = 'model-select-success',
	MODEL_GET_SELECTED = 'model-get-selected',
	MODEL_SELECTED_RESULT = 'model-selected-result',
	MODEL_GET_USAGE = 'model-get-usage',
	MODEL_USAGE_RESULT = 'model-usage-result',
	MODEL_GET_QUOTA = 'model-get-quota',
	MODEL_QUOTA_RESULT = 'model-quota-result',

	// Broadcast messages
	AUTH_STATE_CHANGED = 'auth-state-changed',
	USER_UPDATED = 'user-updated',
	MODEL_SELECTION_CHANGED = 'model-selection-changed',

	// Error messages
	ERROR = 'error'
}

/**
 * UI message interface
 */
export interface UIMessage {
	readonly type: string;
	readonly requestId: string;
	readonly data?: any;
}

/**
 * UI response interface
 */
export interface UIResponse {
	readonly type: string;
	readonly requestId: string;
	readonly success: boolean;
	readonly data?: any;
	readonly error?: {
		readonly code: string;
		readonly message: string;
	};
}

/**
 * AINativeAuthUIHandler
 * Handles bidirectional communication between React UI and VS Code services
 */
export class AINativeAuthUIHandler extends Disposable {

	private readonly _onDidSendMessage = this._register(new Emitter<UIResponse>());
	readonly onDidSendMessage: Event<UIResponse> = this._onDidSendMessage.event;

	constructor(
		private readonly authService: IAINativeCloudAuthService,
		private readonly modelRegistryService: IAIModelRegistryService
	) {
		super();
		this._registerEventListeners();
	}

	/**
	 * Register listeners for service events to broadcast to UI
	 */
	private _registerEventListeners(): void {
		// Auth state changes
		this._register(this.authService.onDidChangeAuthState((state: CloudAuthState) => {
			this._broadcastMessage(UIMessageType.AUTH_STATE_CHANGED, {
				state,
				isAuthenticated: this.authService.isAuthenticated()
			});
		}));

		// User updates
		this._register(this.authService.onDidUpdateUser((user: CloudUser) => {
			this._broadcastMessage(UIMessageType.USER_UPDATED, { user });
		}));

		// Model selection changes
		this._register(this.modelRegistryService.onDidChangeModelSelection((config: ModelSelectionConfig) => {
			this._broadcastMessage(UIMessageType.MODEL_SELECTION_CHANGED, { config });
		}));
	}

	/**
	 * Broadcast a message to UI without request ID
	 */
	private _broadcastMessage(type: string, data: any): void {
		this._onDidSendMessage.fire({
			type,
			requestId: 'broadcast',
			success: true,
			data
		});
	}

	/**
	 * Send a success response
	 */
	private _sendSuccess(requestId: string, type: string, data?: any): void {
		this._onDidSendMessage.fire({
			type,
			requestId,
			success: true,
			data
		});
	}

	/**
	 * Send an error response
	 */
	private _sendError(requestId: string, code: string, message: string): void {
		this._onDidSendMessage.fire({
			type: UIMessageType.ERROR,
			requestId,
			success: false,
			error: { code, message }
		});
	}

	/**
	 * Handle incoming message from UI
	 */
	async handleMessage(message: UIMessage): Promise<void> {
		const { type, requestId, data } = message;

		try {
			switch (type) {
				// Authentication handlers
				case UIMessageType.AUTH_LOGIN:
					await this._handleLogin(requestId, data);
					break;

				case UIMessageType.AUTH_REGISTER:
					await this._handleRegister(requestId, data);
					break;

				case UIMessageType.AUTH_LOGOUT:
					await this._handleLogout(requestId);
					break;

				case UIMessageType.AUTH_GET_STATE:
					this._handleGetAuthState(requestId);
					break;

				case UIMessageType.AUTH_GET_USER:
					await this._handleGetUser(requestId);
					break;

				case UIMessageType.AUTH_REQUEST_PASSWORD_RESET:
					await this._handleRequestPasswordReset(requestId, data);
					break;

				case UIMessageType.AUTH_CONFIRM_PASSWORD_RESET:
					await this._handleConfirmPasswordReset(requestId, data);
					break;

				case UIMessageType.AUTH_CHANGE_PASSWORD:
					await this._handleChangePassword(requestId, data);
					break;

				case UIMessageType.AUTH_RESEND_VERIFICATION:
					await this._handleResendVerification(requestId, data);
					break;

				case UIMessageType.AUTH_VERIFY_EMAIL:
					await this._handleVerifyEmail(requestId, data);
					break;

				// Model registry handlers
				case UIMessageType.MODEL_LIST:
					await this._handleListModels(requestId, data);
					break;

				case UIMessageType.MODEL_SELECT:
					await this._handleSelectModel(requestId, data);
					break;

				case UIMessageType.MODEL_GET_SELECTED:
					await this._handleGetSelectedModel(requestId, data);
					break;

				case UIMessageType.MODEL_GET_USAGE:
					await this._handleGetUsage(requestId);
					break;

				case UIMessageType.MODEL_GET_QUOTA:
					await this._handleGetQuota(requestId);
					break;

				default:
					this._sendError(requestId, 'UNKNOWN_MESSAGE_TYPE', `Unknown message type: ${type}`);
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
			const errorCode = (error as any).code || CloudAuthErrorCode.UnknownError;
			this._sendError(requestId, errorCode, errorMessage);
		}
	}

	/**
	 * Handle login request
	 */
	private async _handleLogin(requestId: string, data: any): Promise<void> {
		const { email, password } = data;

		if (!email || !password) {
			this._sendError(requestId, 'INVALID_REQUEST', 'Email and password are required');
			return;
		}

		const result = await this.authService.login(email, password);

		if (result.success && result.user && result.accessToken) {
			this._sendSuccess(requestId, UIMessageType.AUTH_LOGIN_SUCCESS, {
				user: result.user,
				accessToken: result.accessToken
			});
		} else {
			const error = result.error;
			this._sendError(
				requestId,
				error?.code || CloudAuthErrorCode.UnknownError,
				error?.message || 'Login failed'
			);
		}
	}

	/**
	 * Handle registration request
	 */
	private async _handleRegister(requestId: string, data: any): Promise<void> {
		const { username, email, password, name } = data;

		if (!username || !email || !password) {
			this._sendError(requestId, 'INVALID_REQUEST', 'Username, email, and password are required');
			return;
		}

		const result = await this.authService.register({ username, email, password, name });

		if (result.success && result.user && result.accessToken) {
			this._sendSuccess(requestId, UIMessageType.AUTH_REGISTER_SUCCESS, {
				user: result.user,
				accessToken: result.accessToken,
				requiresEmailVerification: result.requiresEmailVerification || false
			});
		} else {
			const error = result.error;
			this._sendError(
				requestId,
				error?.code || CloudAuthErrorCode.RegistrationFailed,
				error?.message || 'Registration failed'
			);
		}
	}

	/**
	 * Handle logout request
	 */
	private async _handleLogout(requestId: string): Promise<void> {
		await this.authService.logout();
		this._sendSuccess(requestId, UIMessageType.AUTH_LOGOUT_SUCCESS);
	}

	/**
	 * Handle get auth state request
	 */
	private _handleGetAuthState(requestId: string): void {
		const state = this.authService.getAuthState();
		const isAuthenticated = this.authService.isAuthenticated();

		this._sendSuccess(requestId, UIMessageType.AUTH_STATE_RESULT, {
			state,
			isAuthenticated
		});
	}

	/**
	 * Handle get user request
	 */
	private async _handleGetUser(requestId: string): Promise<void> {
		const user = await this.authService.getCurrentUser();

		this._sendSuccess(requestId, UIMessageType.AUTH_USER_RESULT, {
			user
		});
	}

	/**
	 * Handle request password reset
	 */
	private async _handleRequestPasswordReset(requestId: string, data: any): Promise<void> {
		const { email } = data;

		if (!email) {
			this._sendError(requestId, 'INVALID_REQUEST', 'Email is required');
			return;
		}

		const result = await this.authService.requestPasswordReset(email);

		if (result.success) {
			this._sendSuccess(requestId, UIMessageType.AUTH_PASSWORD_RESET_REQUESTED, {
				message: result.message || 'Password reset email sent'
			});
		} else {
			const error = result.error;
			this._sendError(
				requestId,
				error?.code || CloudAuthErrorCode.PasswordResetFailed,
				error?.message || 'Password reset request failed'
			);
		}
	}

	/**
	 * Handle confirm password reset
	 */
	private async _handleConfirmPasswordReset(requestId: string, data: any): Promise<void> {
		const { token, newPassword } = data;

		if (!token || !newPassword) {
			this._sendError(requestId, 'INVALID_REQUEST', 'Token and new password are required');
			return;
		}

		const result = await this.authService.confirmPasswordReset(token, newPassword);

		if (result.success) {
			this._sendSuccess(requestId, UIMessageType.AUTH_PASSWORD_RESET_CONFIRMED, {
				message: result.message || 'Password reset successful'
			});
		} else {
			const error = result.error;
			this._sendError(
				requestId,
				error?.code || CloudAuthErrorCode.PasswordResetFailed,
				error?.message || 'Password reset confirmation failed'
			);
		}
	}

	/**
	 * Handle change password
	 */
	private async _handleChangePassword(requestId: string, data: any): Promise<void> {
		const { currentPassword, newPassword } = data;

		if (!currentPassword || !newPassword) {
			this._sendError(requestId, 'INVALID_REQUEST', 'Current password and new password are required');
			return;
		}

		const result = await this.authService.changePassword(currentPassword, newPassword);

		if (result.success) {
			this._sendSuccess(requestId, UIMessageType.AUTH_PASSWORD_CHANGED, {
				message: result.message || 'Password changed successfully'
			});
		} else {
			const error = result.error;
			this._sendError(
				requestId,
				error?.code || CloudAuthErrorCode.UnknownError,
				error?.message || 'Password change failed'
			);
		}
	}

	/**
	 * Handle resend email verification
	 */
	private async _handleResendVerification(requestId: string, data: any): Promise<void> {
		const { email } = data;

		if (!email) {
			this._sendError(requestId, 'INVALID_REQUEST', 'Email is required');
			return;
		}

		const result = await this.authService.resendEmailVerification(email);

		if (result.success) {
			this._sendSuccess(requestId, UIMessageType.AUTH_VERIFICATION_RESENT, {
				message: result.message || 'Verification email sent'
			});
		} else {
			const error = result.error;
			this._sendError(
				requestId,
				error?.code || CloudAuthErrorCode.UnknownError,
				error?.message || 'Failed to resend verification email'
			);
		}
	}

	/**
	 * Handle verify email
	 */
	private async _handleVerifyEmail(requestId: string, data: any): Promise<void> {
		const { token } = data;

		if (!token) {
			this._sendError(requestId, 'INVALID_REQUEST', 'Verification token is required');
			return;
		}

		const result = await this.authService.verifyEmail(token);

		if (result.success) {
			this._sendSuccess(requestId, UIMessageType.AUTH_EMAIL_VERIFIED, {
				message: result.message || 'Email verified successfully'
			});
		} else {
			const error = result.error;
			this._sendError(
				requestId,
				error?.code || CloudAuthErrorCode.UnknownError,
				error?.message || 'Email verification failed'
			);
		}
	}

	/**
	 * Handle list models request
	 */
	private async _handleListModels(requestId: string, data: any): Promise<void> {
		const filters = data?.filters;
		const models = await this.modelRegistryService.listModels(filters);

		this._sendSuccess(requestId, UIMessageType.MODEL_LIST_RESULT, {
			models
		});
	}

	/**
	 * Handle select model request
	 */
	private async _handleSelectModel(requestId: string, data: any): Promise<void> {
		const { modelId, projectId, parameters } = data;

		if (!modelId || !projectId) {
			this._sendError(requestId, 'INVALID_REQUEST', 'Model ID and project ID are required');
			return;
		}

		await this.modelRegistryService.selectModel(modelId, projectId, parameters);

		this._sendSuccess(requestId, UIMessageType.MODEL_SELECT_SUCCESS, {
			modelId,
			projectId
		});
	}

	/**
	 * Handle get selected model request
	 */
	private async _handleGetSelectedModel(requestId: string, data: any): Promise<void> {
		const { projectId } = data;

		if (!projectId) {
			this._sendError(requestId, 'INVALID_REQUEST', 'Project ID is required');
			return;
		}

		const model = await this.modelRegistryService.getSelectedModel(projectId);

		this._sendSuccess(requestId, UIMessageType.MODEL_SELECTED_RESULT, {
			model
		});
	}

	/**
	 * Handle get usage stats request
	 */
	private async _handleGetUsage(requestId: string): Promise<void> {
		const stats = await this.modelRegistryService.getUsageStats();

		this._sendSuccess(requestId, UIMessageType.MODEL_USAGE_RESULT, {
			stats
		});
	}

	/**
	 * Handle get quota request
	 */
	private async _handleGetQuota(requestId: string): Promise<void> {
		const quota = await this.modelRegistryService.getQuota();

		this._sendSuccess(requestId, UIMessageType.MODEL_QUOTA_RESULT, {
			quota
		});
	}
}
