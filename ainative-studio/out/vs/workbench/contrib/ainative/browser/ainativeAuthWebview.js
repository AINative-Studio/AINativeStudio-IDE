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
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IAINativeCloudAuthService } from '../common/ainativeCloudAuthTypes.js';
import { IAIModelRegistryService } from '../common/aiModelRegistryService.js';
import { AINativeAuthUIHandler } from './ainativeAuthUIHandler.js';
/**
 * View types for authentication webview
 */
export var AuthViewType;
(function (AuthViewType) {
    AuthViewType["Login"] = "login";
    AuthViewType["Register"] = "register";
    AuthViewType["ForgotPassword"] = "forgotPassword";
    AuthViewType["ModelSelector"] = "modelSelector";
    AuthViewType["Account"] = "account";
})(AuthViewType || (AuthViewType = {}));
/**
 * AINativeAuthWebview
 * Creates and manages authentication webview dialogs
 */
let AINativeAuthWebview = class AINativeAuthWebview extends Disposable {
    constructor(_instantiationService, dialogService, authService, modelRegistryService) {
        super();
        this.dialogService = dialogService;
        this.authService = authService;
        this.modelRegistryService = modelRegistryService;
        this._isShowing = false;
        // Create UI handler
        this.uiHandler = this._register(new AINativeAuthUIHandler(this.authService, this.modelRegistryService));
        // Listen for messages from UI handler to send to webview
        this._register(this.uiHandler.onDidSendMessage(message => {
            this._handleOutgoingMessage(message);
        }));
    }
    /**
     * Check if webview is currently showing
     */
    isShowing() {
        return this._isShowing;
    }
    /**
     * Show authentication dialog
     */
    async show(options = {}) {
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
        }
        finally {
            this._isShowing = false;
        }
    }
    /**
     * Get initial state for webview
     */
    async _getInitialState(options) {
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
    _handleOutgoingMessage(message) {
        // TODO: Send message to actual webview when React components are ready
        console.log('AINativeAuthWebview: Outgoing message:', message);
    }
    /**
     * Handle incoming message from webview
     * This will be used when React components are ready
     */
    // private async _handleIncomingMessage(message: UIMessage): Promise<void> {
    // 	await this.uiHandler.handleMessage(message);
    // }
    /**
     * Show placeholder dialog
     * This is a temporary implementation until React components are built
     */
    async _showPlaceholderDialog(initialState) {
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
    _getViewName(viewType) {
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
    // @ts-ignore - Will be used when React components are integrated
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _getWebviewHTML(initialState) {
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
};
AINativeAuthWebview = __decorate([
    __param(0, IInstantiationService),
    __param(1, IDialogService),
    __param(2, IAINativeCloudAuthService),
    __param(3, IAIModelRegistryService)
], AINativeAuthWebview);
export { AINativeAuthWebview };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWluYXRpdmVBdXRoV2Vidmlldy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FpZGV2ZWxvcGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvYWluYXRpdmUvYnJvd3Nlci9haW5hdGl2ZUF1dGhXZWJ2aWV3LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDaEYsT0FBTyxFQUFFLHlCQUF5QixFQUE2QixNQUFNLHFDQUFxQyxDQUFDO0FBQzNHLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxxQkFBcUIsRUFBYyxNQUFNLDRCQUE0QixDQUFDO0FBRS9FOztHQUVHO0FBQ0gsTUFBTSxDQUFOLElBQVksWUFNWDtBQU5ELFdBQVksWUFBWTtJQUN2QiwrQkFBZSxDQUFBO0lBQ2YscUNBQXFCLENBQUE7SUFDckIsaURBQWlDLENBQUE7SUFDakMsK0NBQStCLENBQUE7SUFDL0IsbUNBQW1CLENBQUE7QUFDcEIsQ0FBQyxFQU5XLFlBQVksS0FBWixZQUFZLFFBTXZCO0FBcUJEOzs7R0FHRztBQUNJLElBQU0sbUJBQW1CLEdBQXpCLE1BQU0sbUJBQW9CLFNBQVEsVUFBVTtJQUtsRCxZQUN3QixxQkFBNEMsRUFDbkQsYUFBOEMsRUFDbkMsV0FBdUQsRUFDekQsb0JBQThEO1FBRXZGLEtBQUssRUFBRSxDQUFDO1FBSnlCLGtCQUFhLEdBQWIsYUFBYSxDQUFnQjtRQUNsQixnQkFBVyxHQUFYLFdBQVcsQ0FBMkI7UUFDeEMseUJBQW9CLEdBQXBC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