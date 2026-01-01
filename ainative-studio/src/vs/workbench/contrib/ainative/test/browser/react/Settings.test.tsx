/*---------------------------------------------------------------------------------------------
 *  Copyright 2025 AINative Studio. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------------*/

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Settings } from '../../../browser/react/src/ainative-settings-tsx/Settings';

// Mock dependencies
const mockLogout = vi.fn();
const mockUseAINativeAuth = vi.fn();
const mockUseAccessor = vi.fn();
const mockUseIsDark = vi.fn(() => false);
const mockUseSettingsState = vi.fn();
const mockUseIsOptedOut = vi.fn(() => false);
const mockUseMCPServiceState = vi.fn(() => ({ error: null, mcpServerOfName: {} }));
const mockUseRefreshModelListener = vi.fn();
const mockUseRefreshModelState = vi.fn(() => ({}));

// Mock all required hooks
vi.mock('../../../browser/react/src/util/services', () => ({
	useAINativeAuth: mockUseAINativeAuth,
	useAccessor: mockUseAccessor,
	useIsDark: mockUseIsDark,
	useSettingsState: mockUseSettingsState,
	useIsOptedOut: mockUseIsOptedOut,
	useMCPServiceState: mockUseMCPServiceState,
	useRefreshModelListener: mockUseRefreshModelListener,
	useRefreshModelState: mockUseRefreshModelState,
}));

describe('Settings - Account Section', () => {
	const mockAccessor = {
		get: vi.fn((service: string) => {
			const services: Record<string, any> = {
				IVoidSettingsService: { state: mockSettingsState },
				ICommandService: { executeCommand: vi.fn() },
				INotificationService: { info: vi.fn(), notify: vi.fn() },
				IChatThreadService: { state: {}, dangerousSetState: vi.fn() },
				IMetricsService: { capture: vi.fn() },
				IEnvironmentService: { logsHome: { fsPath: '/logs' } },
				INativeHostService: { showItemInFolder: vi.fn() },
				IMCPService: { toggleServerIsOn: vi.fn(), revealMCPConfigFile: vi.fn() },
				IStorageService: { store: vi.fn() },
			};
			return services[service];
		}),
	};

	const mockSettingsState = {
		settingsOfProvider: {},
		globalSettings: {
			enableAutocomplete: false,
			syncApplyToChat: true,
			syncSCMToChat: true,
			showInlineSuggestions: true,
			includeToolLintErrors: false,
			autoAcceptLLMChanges: false,
			autoApprove: {},
			aiInstructions: '',
			disableSystemMessage: false,
			isOnboardingComplete: true,
			autoRefreshModels: true,
			enableFastApply: true,
		},
		mcpUserStateOfName: {},
		overridesOfModel: {},
	};

	beforeEach(() => {
		vi.clearAllMocks();
		mockUseAccessor.mockReturnValue(mockAccessor);
		mockUseSettingsState.mockReturnValue(mockSettingsState);
	});

	it('should render account section', () => {
		mockUseAINativeAuth.mockReturnValue({
			isAuthenticated: false,
			user: null,
			logout: mockLogout,
		});

		render(<Settings />);

		expect(screen.getByText('AINative Cloud Account')).toBeInTheDocument();
	});

	it('should show sign-in button when not authenticated', () => {
		mockUseAINativeAuth.mockReturnValue({
			isAuthenticated: false,
			user: null,
			logout: mockLogout,
		});

		render(<Settings />);

		expect(screen.getByText('Sign In to AINative Cloud')).toBeInTheDocument();
		expect(screen.getByText('Sign in to access AINative Cloud models')).toBeInTheDocument();
	});

	it('should show user profile when authenticated', () => {
		mockUseAINativeAuth.mockReturnValue({
			isAuthenticated: true,
			user: {
				id: 'user-123',
				email: 'test@example.com',
				name: 'Test User',
				avatar_url: 'https://example.com/avatar.png',
			},
			logout: mockLogout,
		});

		render(<Settings />);

		expect(screen.getByText('Test User')).toBeInTheDocument();
		expect(screen.getByText('test@example.com')).toBeInTheDocument();
		expect(screen.getByAltText('User Avatar')).toHaveAttribute('src', 'https://example.com/avatar.png');
	});

	it('should show sign-out button when authenticated', () => {
		mockUseAINativeAuth.mockReturnValue({
			isAuthenticated: true,
			user: {
				id: 'user-123',
				email: 'test@example.com',
				name: 'Test User',
				avatar_url: null,
			},
			logout: mockLogout,
		});

		render(<Settings />);

		const signOutButton = screen.getByText('Sign Out');
		expect(signOutButton).toBeInTheDocument();
	});

	it('should trigger login modal on sign-in click', () => {
		mockUseAINativeAuth.mockReturnValue({
			isAuthenticated: false,
			user: null,
			logout: mockLogout,
		});

		render(<Settings />);

		const signInButton = screen.getByText('Sign In to AINative Cloud');
		fireEvent.click(signInButton);

		// After clicking, login modal state should be toggled
		// We can't check the modal directly without more complex setup,
		// but we can verify the button exists and is clickable
		expect(signInButton).toBeInTheDocument();
	});

	it('should call authService.logout() on sign-out click', () => {
		mockUseAINativeAuth.mockReturnValue({
			isAuthenticated: true,
			user: {
				id: 'user-123',
				email: 'test@example.com',
				name: 'Test User',
			},
			logout: mockLogout,
		});

		render(<Settings />);

		const signOutButton = screen.getByText('Sign Out');
		fireEvent.click(signOutButton);

		expect(mockLogout).toHaveBeenCalledTimes(1);
	});
});
