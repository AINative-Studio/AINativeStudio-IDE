/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
/**
 * Token storage types and interfaces
 */
/**
 * Storage target for tokens
 */
export var TokenStorageTarget;
(function (TokenStorageTarget) {
    /**
     * Store in memory only (lost on restart)
     */
    TokenStorageTarget["Memory"] = "memory";
    /**
     * Store in persistent storage (survives restart)
     */
    TokenStorageTarget["Persistent"] = "persistent";
    /**
     * Store in secure system keychain (most secure)
     */
    TokenStorageTarget["Keychain"] = "keychain";
})(TokenStorageTarget || (TokenStorageTarget = {}));
/**
 * Authentication provider types
 */
export var AuthProvider;
(function (AuthProvider) {
    /**
     * Email/password authentication
     */
    AuthProvider["EmailPassword"] = "email_password";
    /**
     * GitHub OAuth
     */
    AuthProvider["GitHub"] = "github";
    /**
     * Google OAuth
     */
    AuthProvider["Google"] = "google";
    /**
     * Microsoft OAuth
     */
    AuthProvider["Microsoft"] = "microsoft";
    /**
     * API key authentication
     */
    AuthProvider["APIKey"] = "api_key";
})(AuthProvider || (AuthProvider = {}));
/**
 * Authentication event types
 */
export var AuthEventType;
(function (AuthEventType) {
    /**
     * User logged in
     */
    AuthEventType["Login"] = "login";
    /**
     * User logged out
     */
    AuthEventType["Logout"] = "logout";
    /**
     * Token refreshed
     */
    AuthEventType["TokenRefresh"] = "token_refresh";
    /**
     * Session expired
     */
    AuthEventType["SessionExpired"] = "session_expired";
    /**
     * Authentication error
     */
    AuthEventType["AuthError"] = "auth_error";
})(AuthEventType || (AuthEventType = {}));
/**
 * Token refresh strategy
 */
export var RefreshStrategy;
(function (RefreshStrategy) {
    /**
     * Refresh on demand (when token expires)
     */
    RefreshStrategy["OnDemand"] = "on_demand";
    /**
     * Refresh proactively (before token expires)
     */
    RefreshStrategy["Proactive"] = "proactive";
    /**
     * Refresh on activity (when user is active)
     */
    RefreshStrategy["OnActivity"] = "on_activity";
})(RefreshStrategy || (RefreshStrategy = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0aFR5cGVzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWlkZXZlbG9wZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9haW5hdGl2ZS9jb21tb24vYXV0aFR5cGVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHOztHQUVHO0FBRUg7O0dBRUc7QUFDSCxNQUFNLENBQU4sSUFBWSxrQkFlWDtBQWZELFdBQVksa0JBQWtCO0lBQzdCOztPQUVHO0lBQ0gsdUNBQWlCLENBQUE7SUFFakI7O09BRUc7SUFDSCwrQ0FBeUIsQ0FBQTtJQUV6Qjs7T0FFRztJQUNILDJDQUFxQixDQUFBO0FBQ3RCLENBQUMsRUFmVyxrQkFBa0IsS0FBbEIsa0JBQWtCLFFBZTdCO0FBNEZEOztHQUVHO0FBQ0gsTUFBTSxDQUFOLElBQVksWUF5Qlg7QUF6QkQsV0FBWSxZQUFZO0lBQ3ZCOztPQUVHO0lBQ0gsZ0RBQWdDLENBQUE7SUFFaEM7O09BRUc7SUFDSCxpQ0FBaUIsQ0FBQTtJQUVqQjs7T0FFRztJQUNILGlDQUFpQixDQUFBO0lBRWpCOztPQUVHO0lBQ0gsdUNBQXVCLENBQUE7SUFFdkI7O09BRUc7SUFDSCxrQ0FBa0IsQ0FBQTtBQUNuQixDQUFDLEVBekJXLFlBQVksS0FBWixZQUFZLFFBeUJ2QjtBQW1FRDs7R0FFRztBQUNILE1BQU0sQ0FBTixJQUFZLGFBeUJYO0FBekJELFdBQVksYUFBYTtJQUN4Qjs7T0FFRztJQUNILGdDQUFlLENBQUE7SUFFZjs7T0FFRztJQUNILGtDQUFpQixDQUFBO0lBRWpCOztPQUVHO0lBQ0gsK0NBQThCLENBQUE7SUFFOUI7O09BRUc7SUFDSCxtREFBa0MsQ0FBQTtJQUVsQzs7T0FFRztJQUNILHlDQUF3QixDQUFBO0FBQ3pCLENBQUMsRUF6QlcsYUFBYSxLQUFiLGFBQWEsUUF5QnhCO0FBNEZEOztHQUVHO0FBQ0gsTUFBTSxDQUFOLElBQVksZUFlWDtBQWZELFdBQVksZUFBZTtJQUMxQjs7T0FFRztJQUNILHlDQUFzQixDQUFBO0lBRXRCOztPQUVHO0lBQ0gsMENBQXVCLENBQUE7SUFFdkI7O09BRUc7SUFDSCw2Q0FBMEIsQ0FBQTtBQUMzQixDQUFDLEVBZlcsZUFBZSxLQUFmLGVBQWUsUUFlMUIifQ==