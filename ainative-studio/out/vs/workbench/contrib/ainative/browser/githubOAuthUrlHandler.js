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
import { IURLService } from '../../../../platform/url/common/url.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IGitHubOAuthService } from '../common/githubOAuthService.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { registerWorkbenchContribution2 } from '../../../common/contributions.js';
/**
 * Handles GitHub OAuth callback URLs
 * Format: ainativestudio://auth/github/callback?code=xxx&state=yyy
 */
let GitHubOAuthUrlHandler = class GitHubOAuthUrlHandler extends Disposable {
    static { this.ID = 'workbench.contrib.githubOAuthUrlHandler'; }
    constructor(logService, githubOAuthService, urlService) {
        super();
        this.logService = logService;
        this.githubOAuthService = githubOAuthService;
        // Register this handler with the URL service
        this._register(urlService.registerHandler(this));
    }
    /**
     * Handle incoming URLs
     */
    async handleURL(uri) {
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
            }
            else {
                this.logService.error('[GitHubOAuthUrlHandler] GitHub OAuth failed:', result.error);
            }
            return true;
        }
        catch (error) {
            this.logService.error('[GitHubOAuthUrlHandler] Error handling OAuth callback:', error);
            return false;
        }
    }
};
GitHubOAuthUrlHandler = __decorate([
    __param(0, ILogService),
    __param(1, IGitHubOAuthService),
    __param(2, IURLService)
], GitHubOAuthUrlHandler);
export { GitHubOAuthUrlHandler };
// Register as workbench contribution
registerWorkbenchContribution2(GitHubOAuthUrlHandler.ID, GitHubOAuthUrlHandler, 4 /* WorkbenchPhase.Eventually */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2l0aHViT0F1dGhVcmxIYW5kbGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWlkZXZlbG9wZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9haW5hdGl2ZS9icm93c2VyL2dpdGh1Yk9BdXRoVXJsSGFuZGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQWUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDbEYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNyRSxPQUFPLEVBQTBDLDhCQUE4QixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFFMUg7OztHQUdHO0FBQ0ksSUFBTSxxQkFBcUIsR0FBM0IsTUFBTSxxQkFBc0IsU0FBUSxVQUFVO2FBRXBDLE9BQUUsR0FBRyx5Q0FBeUMsQUFBNUMsQ0FBNkM7SUFFL0QsWUFDK0IsVUFBdUIsRUFDZixrQkFBdUMsRUFDaEUsVUFBdUI7UUFFcEMsS0FBSyxFQUFFLENBQUM7UUFKc0IsZUFBVSxHQUFWLFVBQVUsQ0FBYTtRQUNmLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBcUI7UUFLN0UsNkNBQTZDO1FBQzdDLElBQUksQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQ2xELENBQUM7SUFFRDs7T0FFRztJQUNILEtBQUssQ0FBQyxTQUFTLENBQUMsR0FBUTtRQUN2QixJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyx1Q0FBdUMsRUFBRSxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztRQUUvRSwyQ0FBMkM7UUFDM0MsZ0RBQWdEO1FBQ2hELElBQUksR0FBRyxDQUFDLFNBQVMsS0FBSyxNQUFNLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxrQkFBa0IsQ0FBQyxFQUFFLENBQUM7WUFDMUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMseURBQXlELENBQUMsQ0FBQztZQUNqRixPQUFPLEtBQUssQ0FBQztRQUNkLENBQUM7UUFFRCx5QkFBeUI7UUFDekIsTUFBTSxLQUFLLEdBQUcsSUFBSSxlQUFlLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzdDLE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDL0IsTUFBTSxLQUFLLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUVqQyxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDckIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMseURBQXlELENBQUMsQ0FBQztZQUNqRixPQUFPLEtBQUssQ0FBQztRQUNkLENBQUM7UUFFRCxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQywwREFBMEQsQ0FBQyxDQUFDO1FBRWpGLElBQUksQ0FBQztZQUNKLDRCQUE0QjtZQUM1QixNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBRXpFLElBQUksTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUNwQixJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxpREFBaUQsQ0FBQyxDQUFDO1lBQ3pFLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyw4Q0FBOEMsRUFBRSxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDckYsQ0FBQztZQUVELE9BQU8sSUFBSSxDQUFDO1FBQ2IsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDaEIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsd0RBQXdELEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDdkYsT0FBTyxLQUFLLENBQUM7UUFDZCxDQUFDO0lBQ0YsQ0FBQzs7QUF2RFcscUJBQXFCO0lBSy9CLFdBQUEsV0FBVyxDQUFBO0lBQ1gsV0FBQSxtQkFBbUIsQ0FBQTtJQUNuQixXQUFBLFdBQVcsQ0FBQTtHQVBELHFCQUFxQixDQXdEakM7O0FBRUQscUNBQXFDO0FBQ3JDLDhCQUE4QixDQUM3QixxQkFBcUIsQ0FBQyxFQUFFLEVBQ3hCLHFCQUFxQixvQ0FFckIsQ0FBQyJ9