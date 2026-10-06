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
import { getActiveWindow, h } from '../../../../base/browser/dom.js';
import { IAINativeCloudAuthService } from '../common/ainativeCloudAuthTypes.js';
import { mountAuthDialog } from './react/out/auth-components/index.js';
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
const AUTH_VIEW_TO_DIALOG_VIEW = {
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
let AINativeAuthWebview = class AINativeAuthWebview extends Disposable {
    constructor(instantiationService, dialogService, authService) {
        super();
        this.instantiationService = instantiationService;
        this.dialogService = dialogService;
        this.authService = authService;
        this._isShowing = false;
    }
    /**
     * Check if webview is currently showing
     */
    isShowing() {
        return this._isShowing;
    }
    /**
     * Show authentication dialog. Resolves once the dialog is closed (dismissed or
     * completed), matching the await/dispose pattern used by ainativeAuthActions.ts.
     */
    async show(options = {}) {
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
        }
        finally {
            this._isShowing = false;
        }
    }
    dispose() {
        this._teardownOverlay();
        super.dispose();
    }
    /**
     * Mount the real React auth UI (AuthDialog, routing between login/register/
     * forgot-password/reset-password) as an overlay on the workbench, and await
     * until the user closes it or completes authentication.
     */
    async _showAuthDialog(initialState) {
        const targetWindow = getActiveWindow();
        const workbench = targetWindow.document.querySelector('.monaco-workbench');
        if (!workbench) {
            console.error('AINativeAuthWebview: could not find .monaco-workbench to mount auth dialog into');
            return;
        }
        const overlayContainer = h('div.ainative-auth-webview-container').root;
        workbench.appendChild(overlayContainer);
        this._overlayContainer = overlayContainer;
        await new Promise(resolve => {
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
    _teardownOverlay() {
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
     * Fallback for view types without a real React UI yet (model selector, account).
     */
    async _showUnsupportedViewDialog(initialState) {
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
};
AINativeAuthWebview = __decorate([
    __param(0, IInstantiationService),
    __param(1, IDialogService),
    __param(2, IAINativeCloudAuthService)
], AINativeAuthWebview);
export { AINativeAuthWebview };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWluYXRpdmVBdXRoV2Vidmlldy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FpZGV2ZWxvcGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvYWluYXRpdmUvYnJvd3Nlci9haW5hdGl2ZUF1dGhXZWJ2aWV3LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDaEYsT0FBTyxFQUFFLGVBQWUsRUFBRSxDQUFDLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUNyRSxPQUFPLEVBQUUseUJBQXlCLEVBQTZCLE1BQU0scUNBQXFDLENBQUM7QUFDM0csT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRXZFOztHQUVHO0FBQ0gsTUFBTSxDQUFOLElBQVksWUFNWDtBQU5ELFdBQVksWUFBWTtJQUN2QiwrQkFBZSxDQUFBO0lBQ2YscUNBQXFCLENBQUE7SUFDckIsaURBQWlDLENBQUE7SUFDakMsK0NBQStCLENBQUE7SUFDL0IsbUNBQW1CLENBQUE7QUFDcEIsQ0FBQyxFQU5XLFlBQVksS0FBWixZQUFZLFFBTXZCO0FBcUJELE1BQU0sd0JBQXdCLEdBQXlFO0lBQ3RHLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxFQUFFLE9BQU87SUFDN0IsQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLEVBQUUsVUFBVTtJQUNuQyxDQUFDLFlBQVksQ0FBQyxjQUFjLENBQUMsRUFBRSxnQkFBZ0I7SUFDL0MsNkVBQTZFO0lBQzdFLGlGQUFpRjtJQUNqRiwrRUFBK0U7SUFDL0Usb0VBQW9FO0lB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