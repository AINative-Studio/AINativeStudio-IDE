/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Emitter } from '../../../../base/common/event.js';
import { CloudAuthErrorCode } from '../common/ainativeCloudAuthTypes.js';
/**
 * Message types for UI communication
 */
export var UIMessageType;
(function (UIMessageType) {
    // Authentication messages
    UIMessageType["AUTH_LOGIN"] = "auth-login";
    UIMessageType["AUTH_LOGIN_SUCCESS"] = "auth-login-success";
    UIMessageType["AUTH_REGISTER"] = "auth-register";
    UIMessageType["AUTH_REGISTER_SUCCESS"] = "auth-register-success";
    UIMessageType["AUTH_LOGOUT"] = "auth-logout";
    UIMessageType["AUTH_LOGOUT_SUCCESS"] = "auth-logout-success";
    UIMessageType["AUTH_GET_STATE"] = "auth-get-state";
    UIMessageType["AUTH_STATE_RESULT"] = "auth-state-result";
    UIMessageType["AUTH_GET_USER"] = "auth-get-user";
    UIMessageType["AUTH_USER_RESULT"] = "auth-user-result";
    UIMessageType["AUTH_REQUEST_PASSWORD_RESET"] = "auth-request-password-reset";
    UIMessageType["AUTH_PASSWORD_RESET_REQUESTED"] = "auth-password-reset-requested";
    UIMessageType["AUTH_CONFIRM_PASSWORD_RESET"] = "auth-confirm-password-reset";
    UIMessageType["AUTH_PASSWORD_RESET_CONFIRMED"] = "auth-password-reset-confirmed";
    UIMessageType["AUTH_CHANGE_PASSWORD"] = "auth-change-password";
    UIMessageType["AUTH_PASSWORD_CHANGED"] = "auth-password-changed";
    UIMessageType["AUTH_RESEND_VERIFICATION"] = "auth-resend-verification";
    UIMessageType["AUTH_VERIFICATION_RESENT"] = "auth-verification-resent";
    UIMessageType["AUTH_VERIFY_EMAIL"] = "auth-verify-email";
    UIMessageType["AUTH_EMAIL_VERIFIED"] = "auth-email-verified";
    // Model registry messages
    UIMessageType["MODEL_LIST"] = "model-list";
    UIMessageType["MODEL_LIST_RESULT"] = "model-list-result";
    UIMessageType["MODEL_SELECT"] = "model-select";
    UIMessageType["MODEL_SELECT_SUCCESS"] = "model-select-success";
    UIMessageType["MODEL_GET_SELECTED"] = "model-get-selected";
    UIMessageType["MODEL_SELECTED_RESULT"] = "model-selected-result";
    UIMessageType["MODEL_GET_USAGE"] = "model-get-usage";
    UIMessageType["MODEL_USAGE_RESULT"] = "model-usage-result";
    UIMessageType["MODEL_GET_QUOTA"] = "model-get-quota";
    UIMessageType["MODEL_QUOTA_RESULT"] = "model-quota-result";
    // Broadcast messages
    UIMessageType["AUTH_STATE_CHANGED"] = "auth-state-changed";
    UIMessageType["USER_UPDATED"] = "user-updated";
    UIMessageType["MODEL_SELECTION_CHANGED"] = "model-selection-changed";
    // Error messages
    UIMessageType["ERROR"] = "error";
})(UIMessageType || (UIMessageType = {}));
/**
 * AINativeAuthUIHandler
 * Handles bidirectional communication between React UI and VS Code services
 */
export class AINativeAuthUIHandler extends Disposable {
    constructor(authService, modelRegistryService) {
        super();
        this.authService = authService;
        this.modelRegistryService = modelRegistryService;
        this._onDidSendMessage = this._register(new Emitter());
        this.onDidSendMessage = this._onDidSendMessage.event;
        this._registerEventListeners();
    }
    /**
     * Register listeners for service events to broadcast to UI
     */
    _registerEventListeners() {
        // Auth state changes
        this._register(this.authService.onDidChangeAuthState((state) => {
            this._broadcastMessage(UIMessageType.AUTH_STATE_CHANGED, {
                state,
                isAuthenticated: this.authService.isAuthenticated()
            });
        }));
        // User updates
        this._register(this.authService.onDidUpdateUser((user) => {
            this._broadcastMessage(UIMessageType.USER_UPDATED, { user });
        }));
        // Model selection changes
        this._register(this.modelRegistryService.onDidChangeModelSelection((config) => {
            this._broadcastMessage(UIMessageType.MODEL_SELECTION_CHANGED, { config });
        }));
    }
    /**
     * Broadcast a message to UI without request ID
     */
    _broadcastMessage(type, data) {
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
    _sendSuccess(requestId, type, data) {
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
    _sendError(requestId, code, message) {
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
    async handleMessage(message) {
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
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            const errorCode = error.code || CloudAuthErrorCode.UnknownError;
            this._sendError(requestId, errorCode, errorMessage);
        }
    }
    /**
     * Handle login request
     */
    async _handleLogin(requestId, data) {
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
        }
        else {
            const error = result.error;
            this._sendError(requestId, error?.code || CloudAuthErrorCode.UnknownError, error?.message || 'Login failed');
        }
    }
    /**
     * Handle registration request
     */
    async _handleRegister(requestId, data) {
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
        }
        else {
            const error = result.error;
            this._sendError(requestId, error?.code || CloudAuthErrorCode.RegistrationFailed, error?.message || 'Registration failed');
        }
    }
    /**
     * Handle logout request
     */
    async _handleLogout(requestId) {
        await this.authService.logout();
        this._sendSuccess(requestId, UIMessageType.AUTH_LOGOUT_SUCCESS);
    }
    /**
     * Handle get auth state request
     */
    _handleGetAuthState(requestId) {
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
    async _handleGetUser(requestId) {
        const user = await this.authService.getCurrentUser();
        this._sendSuccess(requestId, UIMessageType.AUTH_USER_RESULT, {
            user
        });
    }
    /**
     * Handle request password reset
     */
    async _handleRequestPasswordReset(requestId, data) {
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
        }
        else {
            const error = result.error;
            this._sendError(requestId, error?.code || CloudAuthErrorCode.PasswordResetFailed, error?.message || 'Password reset request failed');
        }
    }
    /**
     * Handle confirm password reset
     */
    async _handleConfirmPasswordReset(requestId, data) {
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
        }
        else {
            const error = result.error;
            this._sendError(requestId, error?.code || CloudAuthErrorCode.PasswordResetFailed, error?.message || 'Password reset confirmation failed');
        }
    }
    /**
     * Handle change password
     */
    async _handleChangePassword(requestId, data) {
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
        }
        else {
            const error = result.error;
            this._sendError(requestId, error?.code || CloudAuthErrorCode.UnknownError, error?.message || 'Password change failed');
        }
    }
    /**
     * Handle resend email verification
     */
    async _handleResendVerification(requestId, data) {
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
        }
        else {
            const error = result.error;
            this._sendError(requestId, error?.code || CloudAuthErrorCode.UnknownError, error?.message || 'Failed to resend verification email');
        }
    }
    /**
     * Handle verify email
     */
    async _handleVerifyEmail(requestId, data) {
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
        }
        else {
            const error = result.error;
            this._sendError(requestId, error?.code || CloudAuthErrorCode.UnknownError, error?.message || 'Email verification failed');
        }
    }
    /**
     * Handle list models request
     */
    async _handleListModels(requestId, data) {
        const filters = data?.filters;
        const models = await this.modelRegistryService.listModels(filters);
        this._sendSuccess(requestId, UIMessageType.MODEL_LIST_RESULT, {
            models
        });
    }
    /**
     * Handle select model request
     */
    async _handleSelectModel(requestId, data) {
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
    async _handleGetSelectedModel(requestId, data) {
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
    async _handleGetUsage(requestId) {
        const stats = await this.modelRegistryService.getUsageStats();
        this._sendSuccess(requestId, UIMessageType.MODEL_USAGE_RESULT, {
            stats
        });
    }
    /**
     * Handle get quota request
     */
    async _handleGetQuota(requestId) {
        const quota = await this.modelRegistryService.getQuota();
        this._sendSuccess(requestId, UIMessageType.MODEL_QUOTA_RESULT, {
            quota
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWluYXRpdmVBdXRoVUlIYW5kbGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWlkZXZlbG9wZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9haW5hdGl2ZS9icm93c2VyL2FpbmF0aXZlQXV0aFVJSGFuZGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xFLE9BQU8sRUFBd0Qsa0JBQWtCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUkvSDs7R0FFRztBQUNILE1BQU0sQ0FBTixJQUFZLGFBMENYO0FBMUNELFdBQVksYUFBYTtJQUN4QiwwQkFBMEI7SUFDMUIsMENBQXlCLENBQUE7SUFDekIsMERBQXlDLENBQUE7SUFDekMsZ0RBQStCLENBQUE7SUFDL0IsZ0VBQStDLENBQUE7SUFDL0MsNENBQTJCLENBQUE7SUFDM0IsNERBQTJDLENBQUE7SUFDM0Msa0RBQWlDLENBQUE7SUFDakMsd0RBQXVDLENBQUE7SUFDdkMsZ0RBQStCLENBQUE7SUFDL0Isc0RBQXFDLENBQUE7SUFDckMsNEVBQTJELENBQUE7SUFDM0QsZ0ZBQStELENBQUE7SUFDL0QsNEVBQTJELENBQUE7SUFDM0QsZ0ZBQStELENBQUE7SUFDL0QsOERBQTZDLENBQUE7SUFDN0MsZ0VBQStDLENBQUE7SUFDL0Msc0VBQXFELENBQUE7SUFDckQsc0VBQXFELENBQUE7SUFDckQsd0RBQXVDLENBQUE7SUFDdkMsNERBQTJDLENBQUE7SUFFM0MsMEJBQTBCO0lBQzFCLDBDQUF5QixDQUFBO0lBQ3pCLHdEQUF1QyxDQUFBO0lBQ3ZDLDhDQUE2QixDQUFBO0lBQzdCLDhEQUE2QyxDQUFBO0lBQzdDLDBEQUF5QyxD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