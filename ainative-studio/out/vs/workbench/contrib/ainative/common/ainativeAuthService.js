/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
/**
 * Service identifier for the AINative authentication service
 */
export const IAINativeAuthService = createDecorator('ainativeAuthService');
/**
 * Custom error class for authentication failures
 */
export class AuthenticationError extends Error {
    constructor(message, code) {
        super(message);
        this.name = 'AuthenticationError';
        this.code = code;
    }
}
/**
 * Error codes for authentication failures
 */
export var AuthErrorCode;
(function (AuthErrorCode) {
    AuthErrorCode["INVALID_CREDENTIALS"] = "INVALID_CREDENTIALS";
    AuthErrorCode["NETWORK_ERROR"] = "NETWORK_ERROR";
    AuthErrorCode["TOKEN_EXPIRED"] = "TOKEN_EXPIRED";
    AuthErrorCode["UNAUTHORIZED"] = "UNAUTHORIZED";
    AuthErrorCode["SERVER_ERROR"] = "SERVER_ERROR";
    AuthErrorCode["INVALID_TOKEN"] = "INVALID_TOKEN";
    AuthErrorCode["REFRESH_FAILED"] = "REFRESH_FAILED";
})(AuthErrorCode || (AuthErrorCode = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWluYXRpdmVBdXRoU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FpZGV2ZWxvcGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvYWluYXRpdmUvY29tbW9uL2FpbmF0aXZlQXV0aFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBRzdGOztHQUVHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sb0JBQW9CLEdBQUcsZUFBZSxDQUF1QixxQkFBcUIsQ0FBQyxDQUFDO0FBd0VqRzs7R0FFRztBQUNILE1BQU0sT0FBTyxtQkFBb0IsU0FBUSxLQUFLO0lBTTdDLFlBQVksT0FBZSxFQUFFLElBQVk7UUFDeEMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ2YsSUFBSSxDQUFDLElBQUksR0FBRyxxQkFBcUIsQ0FBQztRQUNsQyxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztJQUNsQixDQUFDO0NBQ0Q7QUFFRDs7R0FFRztBQUNILE1BQU0sQ0FBTixJQUFZLGFBUVg7QUFSRCxXQUFZLGFBQWE7SUFDeEIsNERBQTJDLENBQUE7SUFDM0MsZ0RBQStCLENBQUE7SUFDL0IsZ0RBQStCLENBQUE7SUFDL0IsOENBQTZCLENBQUE7SUFDN0IsOENBQTZCLENBQUE7SUFDN0IsZ0RBQStCLENBQUE7SUFDL0Isa0RBQWlDLENBQUE7QUFDbEMsQ0FBQyxFQVJXLGFBQWEsS0FBYixhQUFhLFFBUXhCIn0=