/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var GitHubOAuthService_1;
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
export const IGitHubOAuthService = createDecorator('githubOAuthService');
/**
 * GitHubOAuthService implementation
 */
let GitHubOAuthService = class GitHubOAuthService extends Disposable {
    static { GitHubOAuthService_1 = this; }
    static { this.OAUTH_ENDPOINT = 'https://github.com/login/oauth/authorize'; }
    static { this.CLIENT_ID = 'Ov23liU7x20VoRInkAiq'; }
    static { this.REDIRECT_URI = 'ainative://auth/github/callback'; }
    static { this.SCOPE = 'read:user,user:email'; }
    static { this.API_BASE = 'https://api.ainative.studio'; }
    static { this.STORAGE_KEY_STATE = 'ainative.oauth.github.state'; }
    static { this.STORAGE_KEY_TIMESTAMP = 'ainative.oauth.github.timestamp'; }
    static { this.STATE_EXPIRY_MS = 10 * 60 * 1000; } // 10 minutes
    constructor(storageService) {
        super();
        this.storageService = storageService;
        this._onDidInitiateOAuth = this._register(new Emitter());
        this.onDidInitiateOAuth = this._onDidInitiateOAuth.event;
        this._onDidCompleteAuth = this._register(new Emitter());
        this.onDidCompleteAuth = this._onDidCompleteAuth.event;
        this._onDidCancelOAuth = this._register(new Emitter());
        this.onDidCancelOAuth = this._onDidCancelOAuth.event;
    }
    /**
     * Generate cryptographically secure random state token
     */
    _generateState() {
        const array = new Uint8Array(16);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }
    /**
     * Initiate GitHub OAuth flow
     */
    async initiateOAuthFlow() {
        // Generate CSRF state token
        const state = this._generateState();
        const timestamp = Date.now();
        // Build GitHub OAuth URL
        const params = new URLSearchParams({
            client_id: GitHubOAuthService_1.CLIENT_ID,
            redirect_uri: GitHubOAuthService_1.REDIRECT_URI,
            state,
            scope: GitHubOAuthService_1.SCOPE
        });
        const authUrl = `${GitHubOAuthService_1.OAUTH_ENDPOINT}?${params.toString()}`;
        // Store state and timestamp in storage
        this.storageService.store(GitHubOAuthService_1.STORAGE_KEY_STATE, state, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        this.storageService.store(GitHubOAuthService_1.STORAGE_KEY_TIMESTAMP, timestamp, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        // Emit event
        this._onDidInitiateOAuth.fire({ state, timestamp });
        console.log('[GitHubOAuthService] OAuth flow initiated');
        return { authUrl, state };
    }
    /**
     * Handle OAuth callback
     */
    async handleCallback(code, state) {
        try {
            // Validate state token
            const storedState = this.storageService.get(GitHubOAuthService_1.STORAGE_KEY_STATE, -1 /* StorageScope.APPLICATION */);
            const storedTimestamp = this.storageService.getNumber(GitHubOAuthService_1.STORAGE_KEY_TIMESTAMP, -1 /* StorageScope.APPLICATION */, 0);
            if (!storedState || storedState !== state) {
                const result = {
                    success: false,
                    error: 'Invalid state token - CSRF protection failed'
                };
                this._onDidCompleteAuth.fire(result);
                return result;
            }
            // Check state expiry
            if (Date.now() - storedTimestamp > GitHubOAuthService_1.STATE_EXPIRY_MS) {
                const result = {
                    success: false,
                    error: 'OAuth state expired - please try again'
                };
                this._onDidCompleteAuth.fire(result);
                return result;
            }
            // Exchange code for access token via AINative backend
            const response = await fetch(`${GitHubOAuthService_1.API_BASE}/v1/auth/github/callback`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ code, state })
            });
            if (!response.ok) {
                const errorText = await response.text().catch(() => response.statusText);
                const result = {
                    success: false,
                    error: `Authentication failed: ${errorText}`
                };
                this._onDidCompleteAuth.fire(result);
                return result;
            }
            const data = await response.json();
            // Clear stored state
            this._clearState();
            const result = {
                success: true,
                token: data.access_token,
                refreshToken: data.refresh_token,
                user: {
                    id: data.user.id,
                    email: data.user.email,
                    name: data.user.name,
                    role: data.user.role,
                    createdAt: data.user.created_at,
                    updatedAt: data.user.updated_at
                }
            };
            this._onDidCompleteAuth.fire(result);
            console.log('[GitHubOAuthService] OAuth callback successful');
            return result;
        }
        catch (error) {
            console.error('[GitHubOAuthService] OAuth callback failed:', error);
            const result = {
                success: false,
                error: error instanceof Error ? error.message : 'Network error occurred'
            };
            this._onDidCompleteAuth.fire(result);
            return result;
        }
    }
    /**
     * Cancel ongoing OAuth flow
     */
    cancelOAuthFlow() {
        this._clearState();
        this._onDidCancelOAuth.fire();
        console.log('[GitHubOAuthService] OAuth flow cancelled');
    }
    /**
     * Check if OAuth flow is in progress
     */
    isOAuthInProgress() {
        const storedState = this.storageService.get(GitHubOAuthService_1.STORAGE_KEY_STATE, -1 /* StorageScope.APPLICATION */);
        const storedTimestamp = this.storageService.getNumber(GitHubOAuthService_1.STORAGE_KEY_TIMESTAMP, -1 /* StorageScope.APPLICATION */, 0);
        if (!storedState || !storedTimestamp) {
            return false;
        }
        // Check if state has expired
        if (Date.now() - storedTimestamp > GitHubOAuthService_1.STATE_EXPIRY_MS) {
            this._clearState();
            return false;
        }
        return true;
    }
    /**
     * Clear stored OAuth state
     */
    _clearState() {
        this.storageService.remove(GitHubOAuthService_1.STORAGE_KEY_STATE, -1 /* StorageScope.APPLICATION */);
        this.storageService.remove(GitHubOAuthService_1.STORAGE_KEY_TIMESTAMP, -1 /* StorageScope.APPLICATION */);
    }
};
GitHubOAuthService = GitHubOAuthService_1 = __decorate([
    __param(0, IStorageService)
], GitHubOAuthService);
export { GitHubOAuthService };
// Register service as singleton
registerSingleton(IGitHubOAuthService, GitHubOAuthService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2l0aHViT0F1dGhTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWlkZXZlbG9wZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9haW5hdGl2ZS9jb21tb24vZ2l0aHViT0F1dGhTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUM3RixPQUFPLEVBQUUsZUFBZSxFQUErQixNQUFNLGdEQUFnRCxDQUFDO0FBQzlHLE9BQU8sRUFBRSxpQkFBaUIsRUFBcUIsTUFBTSx5REFBeUQsQ0FBQztBQUcvRyxNQUFNLENBQUMsTUFBTSxtQkFBbUIsR0FBRyxlQUFlLENBQXNCLG9CQUFvQixDQUFDLENBQUM7QUFvRTlGOztHQUVHO0FBQ0ksSUFBTSxrQkFBa0IsR0FBeEIsTUFBTSxrQkFBbUIsU0FBUSxVQUFVOzthQUd6QixtQkFBYyxHQUFHLDBDQUEwQyxBQUE3QyxDQUE4QzthQUM1RCxjQUFTLEdBQUcsc0JBQXNCLEFBQXpCLENBQTBCO2FBQ25DLGlCQUFZLEdBQUcsaUNBQWlDLEFBQXBDLENBQXFDO2FBQ2pELFVBQUssR0FBRyxzQkFBc0IsQUFBekIsQ0FBMEI7YUFDL0IsYUFBUSxHQUFHLDZCQUE2QixBQUFoQyxDQUFpQzthQUV6QyxzQkFBaUIsR0FBRyw2QkFBNkIsQUFBaEMsQ0FBaUM7YUFDbEQsMEJBQXFCLEdBQUcsaUNBQWlDLEFBQXBDLENBQXFDO2FBQzFELG9CQUFlLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxJQUFJLEFBQWpCLENBQWtCLEdBQUMsYUFBYTtJ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