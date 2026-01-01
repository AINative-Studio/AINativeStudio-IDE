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
export const IGitHubOAuthService = createDecorator('githubOAuthService');
/**
 * GitHubOAuthService implementation
 */
let GitHubOAuthService = class GitHubOAuthService extends Disposable {
    static { GitHubOAuthService_1 = this; }
    static { this.OAUTH_ENDPOINT = 'https://github.com/login/oauth/authorize'; }
    static { this.CLIENT_ID = 'Ov23liU7x20VoRInkAiq'; }
    static { this.REDIRECT_URI = 'ainativestudio://auth/github/callback'; }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2l0aHViT0F1dGhTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWlkZXZlbG9wZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9haW5hdGl2ZS9jb21tb24vZ2l0aHViT0F1dGhTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUM3RixPQUFPLEVBQUUsZUFBZSxFQUErQixNQUFNLGdEQUFnRCxDQUFDO0FBRzlHLE1BQU0sQ0FBQyxNQUFNLG1CQUFtQixHQUFHLGVBQWUsQ0FBc0Isb0JBQW9CLENBQUMsQ0FBQztBQW9FOUY7O0dBRUc7QUFDSSxJQUFNLGtCQUFrQixHQUF4QixNQUFNLGtCQUFtQixTQUFRLFVBQVU7O2FBR3pCLG1CQUFjLEdBQUcsMENBQTBDLEFBQTdDLENBQThDO2FBQzVELGNBQVMsR0FBRyxzQkFBc0IsQUFBekIsQ0FBMEI7YUFDbkMsaUJBQVksR0FBRyx1Q0FBdUMsQUFBMUMsQ0FBMkM7YUFDdkQsVUFBSyxHQUFHLHNCQUFzQixBQUF6QixDQUEwQjthQUMvQixhQUFRLEdBQUcsNkJBQTZCLEFBQWhDLENBQWlDO2FBRXpDLHNCQUFpQixHQUFHLDZCQUE2QixBQUFoQyxDQUFpQzthQUNsRCwwQkFBcUIsR0FBRyxpQ0FBaUMsQUFBcEMsQ0FBcUM7YUFDMUQsb0JBQWUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLElBQUksQUFBakIsQ0FBa0IsR0FBQyxhQUFhO0lBV3ZFLFlBQ2tCLGNBQWdEO1FBRWpFLEtBQUssRUFBRSxDQUFDO1FBRjBCLG1C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