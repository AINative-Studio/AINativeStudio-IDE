/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
export const IAINativeCloudAuthService = createDecorator('ainativeCloudAuthService');
/**
 * Authentication state for cloud service
 */
export var CloudAuthState;
(function (CloudAuthState) {
    CloudAuthState["Authenticated"] = "authenticated";
    CloudAuthState["Unauthenticated"] = "unauthenticated";
    CloudAuthState["Refreshing"] = "refreshing";
    CloudAuthState["Registering"] = "registering";
    CloudAuthState["LoggingOut"] = "loggingOut";
    CloudAuthState["ResettingPassword"] = "resettingPassword";
})(CloudAuthState || (CloudAuthState = {}));
/**
 * Error codes for cloud authentication errors
 */
export var CloudAuthErrorCode;
(function (CloudAuthErrorCode) {
    CloudAuthErrorCode["InvalidCredentials"] = "INVALID_CREDENTIALS";
    CloudAuthErrorCode["NetworkError"] = "NETWORK_ERROR";
    CloudAuthErrorCode["TokenExpired"] = "TOKEN_EXPIRED";
    CloudAuthErrorCode["TokenRefreshFailed"] = "TOKEN_REFRESH_FAILED";
    CloudAuthErrorCode["LogoutFailed"] = "LOGOUT_FAILED";
    CloudAuthErrorCode["RegistrationFailed"] = "REGISTRATION_FAILED";
    CloudAuthErrorCode["PasswordResetFailed"] = "PASSWORD_RESET_FAILED";
    CloudAuthErrorCode["EmailAlreadyExists"] = "EMAIL_ALREADY_EXISTS";
    CloudAuthErrorCode["WeakPassword"] = "WEAK_PASSWORD";
    CloudAuthErrorCode["RateLimitExceeded"] = "RATE_LIMIT_EXCEEDED";
    CloudAuthErrorCode["UnknownError"] = "UNKNOWN_ERROR";
})(CloudAuthErrorCode || (CloudAuthErrorCode = {}));
/**
 * Custom error class for cloud authentication errors
 */
export class CloudAuthError extends Error {
    constructor(code, message, originalError, statusCode) {
        super(message);
        this.code = code;
        this.originalError = originalError;
        this.statusCode = statusCode;
        this.name = 'CloudAuthError';
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWluYXRpdmVDbG91ZEF1dGhUeXBlcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FpZGV2ZWxvcGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvYWluYXRpdmUvY29tbW9uL2FpbmF0aXZlQ2xvdWRBdXRoVHlwZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBRTdGLE1BQU0sQ0FBQyxNQUFNLHlCQUF5QixHQUFHLGVBQWUsQ0FBNEIsMEJBQTBCLENBQUMsQ0FBQztBQUVoSDs7R0FFRztBQUNILE1BQU0sQ0FBTixJQUFZLGNBT1g7QUFQRCxXQUFZLGNBQWM7SUFDekIsaURBQStCLENBQUE7SUFDL0IscURBQW1DLENBQUE7SUFDbkMsMkNBQXlCLENBQUE7SUFDekIsNkNBQTJCLENBQUE7SUFDM0IsMkNBQXlCLENBQUE7SUFDekIseURBQXVDLENBQUE7QUFDeEMsQ0FBQyxFQVBXLGNBQWMsS0FBZCxjQUFjLFFBT3pCO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLENBQU4sSUFBWSxrQkFZWDtBQVpELFdBQVksa0JBQWtCO0lBQzdCLGdFQUEwQyxDQUFBO0lBQzFDLG9EQUE4QixDQUFBO0lBQzlCLG9EQUE4QixDQUFBO0lBQzlCLGlFQUEyQyxDQUFBO0lBQzNDLG9EQUE4QixDQUFBO0lBQzlCLGdFQUEwQyxDQUFBO0lBQzFDLG1FQUE2QyxDQUFBO0lBQzdDLGlFQUEyQyxDQUFBO0lBQzNDLG9EQUE4QixDQUFBO0lBQzlCLCtEQUF5QyxDQUFBO0lBQ3pDLG9EQUE4QixDQUFBO0FBQy9CLENBQUMsRUFaVyxrQkFBa0IsS0FBbEIsa0JBQWtCLFFBWTdCO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLE9BQU8sY0FBZSxTQUFRLEtBQUs7SUFDeEMsWUFDaUIsSUFBd0IsRUFDeEMsT0FBZSxFQUNDLGFBQXFCLEVBQ3JCLFVBQW1CO1FBRW5DLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUxDLFNBQUksR0FBSixJQUFJLENBQW9CO1FBRXhCLGtCQUFhLEdBQWIsYUFBYSxDQUFRO1FBQ3JCLGVBQVUsR0FBVixVQUFVLENBQVM7UUFHbkMsSUFBSSxDQUFDLElBQUksR0FBRyxnQkFBZ0IsQ0FBQztJQUM5QixDQUFDO0NBQ0QifQ==