/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
import { Action2, MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import Severity from '../../../../base/common/severity.js';
import { localize2 } from '../../../../nls.js';
import { IAINativeCloudAuthService, CloudAuthState } from '../common/ainativeCloudAuthTypes.js';
import { AINativeAuthWebview, AuthViewType } from './ainativeAuthWebview.js';
/**
 * Command IDs for authentication actions
 */
export const AINATIVE_AUTH_COMMAND_IDS = {
    SHOW_AUTH_DIALOG: 'ainative.showAuthDialog',
    LOGIN: 'ainative.login',
    LOGOUT: 'ainative.logout',
    REGISTER: 'ainative.register',
    SELECT_MODEL: 'ainative.selectModel',
    SHOW_ACCOUNT: 'ainative.showAccount',
    REFRESH_AUTH: 'ainative.refreshAuth'
};
/**
 * Show Authentication Dialog
 * Opens the auth dialog with optional initial view
 */
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: AINATIVE_AUTH_COMMAND_IDS.SHOW_AUTH_DIALOG,
            title: localize2('ainative.showAuthDialog', 'AINative Studio: Sign In to Cloud'),
            f1: true,
            menu: [
                {
                    id: MenuId.CommandPalette,
                    when: undefined
                }
            ]
        });
    }
    async run(accessor, options) {
        const instantiationService = accessor.get(IInstantiationService);
        const notificationService = accessor.get(INotificationService);
        try {
            const webview = instantiationService.createInstance(AINativeAuthWebview);
            await webview.show({
                initialView: options?.initialView || AuthViewType.Login
            });
            webview.dispose();
        }
        catch (error) {
            notificationService.notify({
                severity: Severity.Error,
                message: localize2('ainative.authDialogError', 'Failed to open authentication dialog: {0}', error instanceof Error ? error.message : 'Unknown error').value
            });
        }
    }
});
/**
 * Quick Sign In
 * Opens auth dialog with login view
 */
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: AINATIVE_AUTH_COMMAND_IDS.LOGIN,
            title: localize2('ainative.login', 'AINative Studio: Sign In'),
            f1: true,
            menu: [
                {
                    id: MenuId.CommandPalette,
                    when: undefined
                }
            ]
        });
    }
    async run(accessor) {
        const instantiationService = accessor.get(IInstantiationService);
        const notificationService = accessor.get(INotificationService);
        try {
            const webview = instantiationService.createInstance(AINativeAuthWebview);
            await webview.show({
                initialView: AuthViewType.Login
            });
            webview.dispose();
        }
        catch (error) {
            notificationService.notify({
                severity: Severity.Error,
                message: localize2('ainative.loginError', 'Failed to sign in: {0}', error instanceof Error ? error.message : 'Unknown error').value
            });
        }
    }
});
/**
 * Sign Out
 * Logs out the current user
 */
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: AINATIVE_AUTH_COMMAND_IDS.LOGOUT,
            title: localize2('ainative.logout', 'AINative Studio: Sign Out'),
            f1: true,
            menu: [
                {
                    id: MenuId.CommandPalette,
                    when: undefined
                }
            ]
        });
    }
    async run(accessor) {
        const authService = accessor.get(IAINativeCloudAuthService);
        const notificationService = accessor.get(INotificationService);
        try {
            // Check if user is authenticated
            if (!authService.isAuthenticated()) {
                notificationService.notify({
                    severity: Severity.Info,
                    message: localize2('ainative.notAuthenticated', 'You are not currently signed in.').value
                });
                return;
            }
            // Perform logout
            await authService.logout();
            notificationService.notify({
                severity: Severity.Info,
                message: localize2('ainative.logoutSuccess', 'Successfully signed out from AINative Cloud.').value
            });
        }
        catch (error) {
            notificationService.notify({
                severity: Severity.Error,
                message: localize2('ainative.logoutError', 'Failed to sign out: {0}', error instanceof Error ? error.message : 'Unknown error').value
            });
        }
    }
});
/**
 * Create Account
 * Opens auth dialog with registration view
 */
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: AINATIVE_AUTH_COMMAND_IDS.REGISTER,
            title: localize2('ainative.register', 'AINative Studio: Create Account'),
            f1: true,
            menu: [
                {
                    id: MenuId.CommandPalette,
                    when: undefined
                }
            ]
        });
    }
    async run(accessor) {
        const instantiationService = accessor.get(IInstantiationService);
        const notificationService = accessor.get(INotificationService);
        try {
            const webview = instantiationService.createInstance(AINativeAuthWebview);
            await webview.show({
                initialView: AuthViewType.Register
            });
            webview.dispose();
        }
        catch (error) {
            notificationService.notify({
                severity: Severity.Error,
                message: localize2('ainative.registerError', 'Failed to open registration: {0}', error instanceof Error ? error.message : 'Unknown error').value
            });
        }
    }
});
/**
 * Select AI Model
 * Opens model selector dialog (requires authentication)
 */
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: AINATIVE_AUTH_COMMAND_IDS.SELECT_MODEL,
            title: localize2('ainative.selectModel', 'AINative Studio: Select AI Model'),
            f1: true,
            menu: [
                {
                    id: MenuId.CommandPalette,
                    when: undefined
                }
            ]
        });
    }
    async run(accessor, projectId) {
        const instantiationService = accessor.get(IInstantiationService);
        const authService = accessor.get(IAINativeCloudAuthService);
        const notificationService = accessor.get(INotificationService);
        try {
            // Check authentication
            if (!authService.isAuthenticated()) {
                notificationService.notify({
                    severity: Severity.Warning,
                    message: localize2('ainative.selectModelRequiresAuth', 'Please sign in to select an AI model.').value
                });
                // Open login dialog
                const webview = instantiationService.createInstance(AINativeAuthWebview);
                await webview.show({
                    initialView: AuthViewType.Login
                });
                webview.dispose();
                return;
            }
            // Open model selector
            const webview = instantiationService.createInstance(AINativeAuthWebview);
            await webview.show({
                initialView: AuthViewType.ModelSelector,
                projectId: projectId || 'default'
            });
            webview.dispose();
        }
        catch (error) {
            notificationService.notify({
                severity: Severity.Error,
                message: localize2('ainative.selectModelError', 'Failed to open model selector: {0}', error instanceof Error ? error.message : 'Unknown error').value
            });
        }
    }
});
/**
 * Show Account Information
 * Displays current user account details
 */
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: AINATIVE_AUTH_COMMAND_IDS.SHOW_ACCOUNT,
            title: localize2('ainative.showAccount', 'AINative Studio: Account Information'),
            f1: true,
            menu: [
                {
                    id: MenuId.CommandPalette,
                    when: undefined
                }
            ]
        });
    }
    async run(accessor) {
        const instantiationService = accessor.get(IInstantiationService);
        const authService = accessor.get(IAINativeCloudAuthService);
        const notificationService = accessor.get(INotificationService);
        try {
            // Check authentication
            if (!authService.isAuthenticated()) {
                notificationService.notify({
                    severity: Severity.Warning,
                    message: localize2('ainative.accountRequiresAuth', 'Please sign in to view account information.').value
                });
                // Open login dialog
                const webview = instantiationService.createInstance(AINativeAuthWebview);
                await webview.show({
                    initialView: AuthViewType.Login
                });
                webview.dispose();
                return;
            }
            // Open account view
            const webview = instantiationService.createInstance(AINativeAuthWebview);
            await webview.show({
                initialView: AuthViewType.Account
            });
            webview.dispose();
        }
        catch (error) {
            notificationService.notify({
                severity: Severity.Error,
                message: localize2('ainative.accountError', 'Failed to open account information: {0}', error instanceof Error ? error.message : 'Unknown error').value
            });
        }
    }
});
/**
 * Refresh Authentication
 * Manually refreshes the authentication token
 */
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: AINATIVE_AUTH_COMMAND_IDS.REFRESH_AUTH,
            title: localize2('ainative.refreshAuth', 'AINative Studio: Refresh Authentication'),
            f1: true,
            menu: [
                {
                    id: MenuId.CommandPalette,
                    when: undefined
                }
            ]
        });
    }
    async run(accessor) {
        const authService = accessor.get(IAINativeCloudAuthService);
        const notificationService = accessor.get(INotificationService);
        try {
            // Check authentication
            if (!authService.isAuthenticated()) {
                notificationService.notify({
                    severity: Severity.Info,
                    message: localize2('ainative.refreshRequiresAuth', 'You are not currently signed in.').value
                });
                return;
            }
            // Check if already refreshing
            const authState = authService.getAuthState();
            if (authState === CloudAuthState.Refreshing) {
                notificationService.notify({
                    severity: Severity.Info,
                    message: localize2('ainative.alreadyRefreshing', 'Authentication refresh is already in progress.').value
                });
                return;
            }
            // Refresh token
            await authService.refreshToken();
            notificationService.notify({
                severity: Severity.Info,
                message: localize2('ainative.refreshSuccess', 'Authentication token refreshed successfully.').value
            });
        }
        catch (error) {
            notificationService.notify({
                severity: Severity.Error,
                message: localize2('ainative.refreshError', 'Failed to refresh authentication: {0}', error instanceof Error ? error.message : 'Unknown error').value
            });
        }
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWluYXRpdmVBdXRoQWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FpZGV2ZWxvcGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvYWluYXRpdmUvYnJvd3Nlci9haW5hdGl2ZUF1dGhBY3Rpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBRWxHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQ2hHLE9BQU8sUUFBUSxNQUFNLHFDQUFxQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUMvQyxPQUFPLEVBQUUseUJBQXlCLEVBQUUsY0FBYyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDaEcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLFlBQVksRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBRTdFOztHQUVHO0FBQ0gsTUFBTSxDQUFDLE1BQU0seUJBQXlCLEdBQUc7SUFDeEMsZ0JBQWdCLEVBQUUseUJBQXlCO0lBQzNDLEtBQUssRUFBRSxnQkFBZ0I7SUFDdkIsTUFBTSxFQUFFLGlCQUFpQjtJQUN6QixRQUFRLEVBQUUsbUJBQW1CO0lBQzdCLFlBQVksRUFBRSxzQkFBc0I7SUFDcEMsWUFBWSxFQUFFLHNCQUFzQjtJQUNwQyxZQUFZLEVBQUUsc0JBQXNCO0NBQzNCLENBQUM7QUFFWDs7O0dBR0c7QUFDSCxlQUFlLENBQUMsS0FBTSxTQUFRLE9BQU87SUFDcEM7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUseUJBQXlCLENBQUMsZ0JBQWdCO1lBQzlDLEtB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