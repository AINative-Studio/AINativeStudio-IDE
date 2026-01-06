/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { Action2, MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { ServicesAccessor } from '../../../../editor/browser/editorExtensions.js';
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
} as const;

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

	async run(accessor: ServicesAccessor, options?: { initialView?: AuthViewType }): Promise<void> {
		const instantiationService = accessor.get(IInstantiationService);
		const notificationService = accessor.get(INotificationService);

		try {
			const webview = instantiationService.createInstance(AINativeAuthWebview);

			await webview.show({
				initialView: options?.initialView || AuthViewType.Login
			});

			webview.dispose();
		} catch (error) {
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

	async run(accessor: ServicesAccessor): Promise<void> {
		const instantiationService = accessor.get(IInstantiationService);
		const notificationService = accessor.get(INotificationService);

		try {
			const webview = instantiationService.createInstance(AINativeAuthWebview);

			await webview.show({
				initialView: AuthViewType.Login
			});

			webview.dispose();
		} catch (error) {
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

	async run(accessor: ServicesAccessor): Promise<void> {
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
		} catch (error) {
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

	async run(accessor: ServicesAccessor): Promise<void> {
		const instantiationService = accessor.get(IInstantiationService);
		const notificationService = accessor.get(INotificationService);

		try {
			const webview = instantiationService.createInstance(AINativeAuthWebview);

			await webview.show({
				initialView: AuthViewType.Register
			});

			webview.dispose();
		} catch (error) {
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

	async run(accessor: ServicesAccessor, projectId?: string): Promise<void> {
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

		} catch (error) {
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

	async run(accessor: ServicesAccessor): Promise<void> {
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

		} catch (error) {
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

	async run(accessor: ServicesAccessor): Promise<void> {
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

		} catch (error) {
			notificationService.notify({
				severity: Severity.Error,
				message: localize2('ainative.refreshError', 'Failed to refresh authentication: {0}', error instanceof Error ? error.message : 'Unknown error').value
			});
		}
	}
});
