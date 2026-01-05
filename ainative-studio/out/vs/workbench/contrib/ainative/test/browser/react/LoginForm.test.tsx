/*---------------------------------------------------------------------------------------------
 *  Copyright 2025 AINative Studio. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------------*/

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoginForm } from '../../../browser/react/src2/auth/LoginForm';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock the accessor and services
const mockLogin = vi.fn();
const mockStorageGet = vi.fn();
const mockStorageStore = vi.fn();
const mockStorageRemove = vi.fn();

const mockAccessor = {
	get: vi.fn((serviceId: string) => {
		if (serviceId === 'IAINativeAuthService') {
			return { login: mockLogin };
		}
		if (serviceId === 'IStorageService') {
			return {
				get: mockStorageGet,
				store: mockStorageStore,
				remove: mockStorageRemove
			};
		}
		return null;
	})
};

vi.mock('../../../browser/react/src2/util/services', () => ({
	useAccessor: () => mockAccessor
}));

describe('LoginForm Component Tests', () => {
	const mockOnClose = vi.fn();
	const mockOnSuccess = vi.fn();
	const mockOnSwitchToRegister = vi.fn();
	const mockOnForgotPassword = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
		mockStorageGet.mockReturnValue(undefined);
	});

	afterEach(() => {
		vi.clearAllTimers();
	});

	suite('Form Rendering', () => {
		it('should render login form with all fields', () => {
			render(
				<LoginForm
					onClose={mockOnClose}
					onSuccess={mockOnSuccess}
					onSwitchToRegister={mockOnSwitchToRegister}
					onForgotPassword={mockOnForgotPassword}
				/>
			);

			expect(screen.getByText('Sign In to AINative Cloud')).toBeInTheDocument();
			expect(screen.getByLabelText('Email or Username')).toBeInTheDocument();
			expect(screen.getByLabelText('Password')).toBeInTheDocument();
			expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
		});

		it('should render remember me checkbox', () => {
			render(<LoginForm onClose={mockOnClose} onSuccess={mockOnSuccess} />);

			const checkbox = screen.getByRole('checkbox');
			expect(checkbox).toBeInTheDocument();
			expect(checkbox).toBeChecked(); // Default is checked
		});

		it('should render close button', () => {
			render(<LoginForm onClose={mockOnClose} onSuccess={mockOnSuccess} />);

			const closeButton = screen.getByRole('button', { name: 'Close' });
			expect(closeButton).toBeInTheDocument();
		});

		it('should render forgot password link when provided', () => {
			render(
				<LoginForm
					onClose={mockOnClose}
					onSuccess={mockOnSuccess}
					onForgotPassword={mockOnForgotPassword}
				/>
			);

			expect(screen.getByText('Forgot password?')).toBeInTheDocument();
		});

		it('should render switch to register link when provided', () => {
			render(
				<LoginForm
					onClose={mockOnClose}
					onSuccess={mockOnSuccess}
					onSwitchToRegister={mockOnSwitchToRegister}
				/>
			);

			expect(screen.getByText('Create account')).toBeInTheDocument();
		});

		it('should have password visibility toggle', () => {
			render(<LoginForm onClose={mockOnClose} onSuccess={mockOnSuccess} />);

			const passwordInput = screen.getByLabelText('Password') as HTMLInputElement;
			const toggleButton = screen.getByLabelText('Show password');

			expect(passwordInput.type).toBe('password');
			fireEvent.click(toggleButton);
			expect(passwordInput.type).toBe('text');
		});
	});

	suite('Form Validation', () => {
		it('should validate empty email/username field', async () => {
			render(<LoginForm onClose={mockOnClose} onSuccess={mockOnSuccess} />);

			const submitButton = screen.getByRole('button', { name: /sign in/i });
			fireEvent.click(submitButton);

			await waitFor(() => {
				expect(screen.getByText('Email or username is required')).toBeInTheDocument();
			});
			expect(mockLogin).not.toHaveBeenCalled();
		});

		it('should validate empty password field', async () => {
			render(<LoginForm onClose={mockOnClose} onSuccess={mockOnSuccess} />);

			const emailInput = screen.getByLabelText('Email or Username');
			const submitButton = screen.getByRole('button', { name: /sign in/i });

			fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
			fireEvent.click(submitButton);

			await waitFor(() => {
				expect(screen.getByText('Password is required')).toBeInTheDocument();
			});
			expect(mockLogin).not.toHaveBeenCalled();
		});

		it('should validate password minimum length', async () => {
			render(<LoginForm onClose={mockOnClose} onSuccess={mockOnSuccess} />);

			const emailInput = screen.getByLabelText('Email or Username');
			const passwordInput = screen.getByLabelText('Password');
			const submitButton = screen.getByRole('button', { name: /sign in/i });

			fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
			fireEvent.change(passwordInput, { target: { value: 'short' } });
			fireEvent.click(submitButton);

			await waitFor(() => {
				expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
			});
			expect(mockLogin).not.toHaveBeenCalled();
		});

		it('should accept valid email format', async () => {
			mockLogin.mockResolvedValue({ success: true });

			render(<LoginForm onClose={mockOnClose} onSuccess={mockOnSuccess} />);

			const emailInput = screen.getByLabelText('Email or Username');
			const passwordInput = screen.getByLabelText('Password');
			const submitButton = screen.getByRole('button', { name: /sign in/i });

			fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
			fireEvent.change(passwordInput, { target: { value: 'password123' } });
			fireEvent.click(submitButton);

			await waitFor(() => {
				expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
			});
		});

		it('should handle username to email conversion', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ email: 'username@example.com' })
			});
			mockLogin.mockResolvedValue({ success: true });

			render(<LoginForm onClose={mockOnClose} onSuccess={mockOnSuccess} />);

			const emailInput = screen.getByLabelText('Email or Username');
			const passwordInput = screen.getByLabelText('Password');
			const submitButton = screen.getByRole('button', { name: /sign in/i });

			fireEvent.change(emailInput, { target: { value: 'testuser' } });
			fireEvent.change(passwordInput, { target: { value: 'password123' } });
			fireEvent.click(submitButton);

			await waitFor(() => {
				expect(mockFetch).toHaveBeenCalledWith(
					'https://api.ainative.studio/v1/auth/username-to-email',
					expect.objectContaining({
						method: 'POST',
						body: JSON.stringify({ username: 'testuser' })
					})
				);
				expect(mockLogin).toHaveBeenCalledWith('username@example.com', 'password123');
			});
		});

		it('should handle failed username to email conversion', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: false,
				json: async () => ({ message: 'Username not found' })
			});

			render(<LoginForm onClose={mockOnClose} onSuccess={mockOnSuccess} />);

			const emailInput = screen.getByLabelText('Email or Username');
			const passwordInput = screen.getByLabelText('Password');
			const submitButton = screen.getByRole('button', { name: /sign in/i });

			fireEvent.change(emailInput, { target: { value: 'nonexistent' } });
			fireEvent.change(passwordInput, { target: { value: 'password123' } });
			fireEvent.click(submitButton);

			await waitFor(() => {
				expect(screen.getByText('Invalid username or email')).toBeInTheDocument();
			});
		});
	});

	suite('Submit Handling', () => {
		it('should call login service on valid submit', async () => {
			mockLogin.mockResolvedValue({ success: true });

			render(<LoginForm onClose={mockOnClose} onSuccess={mockOnSuccess} />);

			const emailInput = screen.getByLabelText('Email or Username');
			const passwordInput = screen.getByLabelText('Password');
			const submitButton = screen.getByRole('button', { name: /sign in/i });

			fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
			fireEvent.change(passwordInput, { target: { value: 'password123' } });
			fireEvent.click(submitButton);

			await waitFor(() => {
				expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
			});
		});

		it('should call onSuccess callback on successful login', async () => {
			mockLogin.mockResolvedValue({ success: true });

			render(<LoginForm onClose={mockOnClose} onSuccess={mockOnSuccess} />);

			const emailInput = screen.getByLabelText('Email or Username');
			const passwordInput = screen.getByLabelText('Password');
			const submitButton = screen.getByRole('button', { name: /sign in/i });

			fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
			fireEvent.change(passwordInput, { target: { value: 'password123' } });
			fireEvent.click(submitButton);

			await waitFor(() => {
				expect(mockOnSuccess).toHaveBeenCalled();
			});
		});

		it('should store remembered email when remember me is checked', async () => {
			mockLogin.mockResolvedValue({ success: true });

			render(<LoginForm onClose={mockOnClose} onSuccess={mockOnSuccess} />);

			const emailInput = screen.getByLabelText('Email or Username');
			const passwordInput = screen.getByLabelText('Password');
			const rememberCheckbox = screen.getByRole('checkbox');
			const submitButton = screen.getByRole('button', { name: /sign in/i });

			fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
			fireEvent.change(passwordInput, { target: { value: 'password123' } });
			expect(rememberCheckbox).toBeChecked();
			fireEvent.click(submitButton);

			await waitFor(() => {
				expect(mockStorageStore).toHaveBeenCalledWith(
					'ainative.auth.rememberedEmail',
					'test@example.com',
					0,
					1
				);
			});
		});

		it('should not store email when remember me is unchecked', async () => {
			mockLogin.mockResolvedValue({ success: true });

			render(<LoginForm onClose={mockOnClose} onSuccess={mockOnSuccess} />);

			const emailInput = screen.getByLabelText('Email or Username');
			const passwordInput = screen.getByLabelText('Password');
			const rememberCheckbox = screen.getByRole('checkbox');
			const submitButton = screen.getByRole('button', { name: /sign in/i });

			fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
			fireEvent.change(passwordInput, { target: { value: 'password123' } });
			fireEvent.click(rememberCheckbox); // Uncheck
			fireEvent.click(submitButton);

			await waitFor(() => {
				expect(mockStorageRemove).toHaveBeenCalledWith('ainative.auth.rememberedEmail', 0);
			});
		});

		it('should load remembered email on mount', () => {
			mockStorageGet.mockReturnValue('remembered@example.com');

			render(<LoginForm onClose={mockOnClose} onSuccess={mockOnSuccess} />);

			const emailInput = screen.getByLabelText('Email or Username') as HTMLInputElement;
			expect(emailInput.value).toBe('remembered@example.com');
		});
	});

	suite('Error Display', () => {
		it('should display error message on failed login', async () => {
			mockLogin.mockResolvedValue({
				success: false,
				error: { message: 'Invalid credentials' }
			});

			render(<LoginForm onClose={mockOnClose} onSuccess={mockOnSuccess} />);

			const emailInput = screen.getByLabelText('Email or Username');
			const passwordInput = screen.getByLabelText('Password');
			const submitButton = screen.getByRole('button', { name: /sign in/i });

			fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
			fireEvent.change(passwordInput, { target: { value: 'wrongpass' } });
			fireEvent.click(submitButton);

			await waitFor(() => {
				expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
			});
		});

		it('should display generic error when login fails without error message', async () => {
			mockLogin.mockResolvedValue({
				success: false
			});

			render(<LoginForm onClose={mockOnClose} onSuccess={mockOnSuccess} />);

			const emailInput = screen.getByLabelText('Email or Username');
			const passwordInput = screen.getByLabelText('Password');
			const submitButton = screen.getByRole('button', { name: /sign in/i });

			fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
			fireEvent.change(passwordInput, { target: { value: 'password123' } });
			fireEvent.click(submitButton);

			await waitFor(() => {
				expect(screen.getByText('Login failed. Please check your credentials.')).toBeInTheDocument();
			});
		});

		it('should display network error on exception', async () => {
			mockLogin.mockRejectedValue(new Error('Network error'));

			render(<LoginForm onClose={mockOnClose} onSuccess={mockOnSuccess} />);

			const emailInput = screen.getByLabelText('Email or Username');
			const passwordInput = screen.getByLabelText('Password');
			const submitButton = screen.getByRole('button', { name: /sign in/i });

			fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
			fireEvent.change(passwordInput, { target: { value: 'password123' } });
			fireEvent.click(submitButton);

			await waitFor(() => {
				expect(screen.getByText('Network error. Please check your connection and try again.')).toBeInTheDocument();
			});
		});

		it('should clear error message on new submit', async () => {
			mockLogin
				.mockResolvedValueOnce({ success: false, error: { message: 'Invalid credentials' } })
				.mockResolvedValueOnce({ success: true });

			render(<LoginForm onClose={mockOnClose} onSuccess={mockOnSuccess} />);

			const emailInput = screen.getByLabelText('Email or Username');
			const passwordInput = screen.getByLabelText('Password');
			const submitButton = screen.getByRole('button', { name: /sign in/i });

			// First attempt - fail
			fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
			fireEvent.change(passwordInput, { target: { value: 'wrongpass' } });
			fireEvent.click(submitButton);

			await waitFor(() => {
				expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
			});

			// Second attempt - success
			fireEvent.change(passwordInput, { target: { value: 'correctpass' } });
			fireEvent.click(submitButton);

			await waitFor(() => {
				expect(screen.queryByText('Invalid credentials')).not.toBeInTheDocument();
			});
		});
	});

	suite('Loading States', () => {
		it('should show loading state during login', async () => {
			mockLogin.mockImplementation(() => new Promise(() => {})); // Never resolves

			render(<LoginForm onClose={mockOnClose} onSuccess={mockOnSuccess} />);

			const emailInput = screen.getByLabelText('Email or Username');
			const passwordInput = screen.getByLabelText('Password');
			const submitButton = screen.getByRole('button', { name: /sign in/i });

			fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
			fireEvent.change(passwordInput, { target: { value: 'password123' } });
			fireEvent.click(submitButton);

			await waitFor(() => {
				expect(screen.getByText('Signing in...')).toBeInTheDocument();
				expect(submitButton).toBeDisabled();
			});
		});

		it('should re-enable button after login completes', async () => {
			mockLogin.mockResolvedValue({ success: false, error: { message: 'Error' } });

			render(<LoginForm onClose={mockOnClose} onSuccess={mockOnSuccess} />);

			const emailInput = screen.getByLabelText('Email or Username');
			const passwordInput = screen.getByLabelText('Password');
			const submitButton = screen.getByRole('button', { name: /sign in/i });

			fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
			fireEvent.change(passwordInput, { target: { value: 'password123' } });
			fireEvent.click(submitButton);

			await waitFor(() => {
				expect(screen.getByText('Sign In')).toBeInTheDocument();
				expect(submitButton).not.toBeDisabled();
			});
		});
	});

	suite('User Interactions', () => {
		it('should call onClose when close button is clicked', () => {
			render(<LoginForm onClose={mockOnClose} onSuccess={mockOnSuccess} />);

			const closeButton = screen.getByRole('button', { name: 'Close' });
			fireEvent.click(closeButton);

			expect(mockOnClose).toHaveBeenCalled();
		});

		it('should call onClose when overlay is clicked', () => {
			render(<LoginForm onClose={mockOnClose} onSuccess={mockOnSuccess} />);

			const overlay = screen.getByRole('dialog').parentElement;
			fireEvent.click(overlay!);

			expect(mockOnClose).toHaveBeenCalled();
		});

		it('should not close when modal content is clicked', () => {
			render(<LoginForm onClose={mockOnClose} onSuccess={mockOnSuccess} />);

			const modal = screen.getByRole('dialog');
			fireEvent.click(modal);

			expect(mockOnClose).not.toHaveBeenCalled();
		});

		it('should call onSwitchToRegister when create account is clicked', () => {
			render(
				<LoginForm
					onClose={mockOnClose}
					onSuccess={mockOnSuccess}
					onSwitchToRegister={mockOnSwitchToRegister}
				/>
			);

			const registerLink = screen.getByText('Create account');
			fireEvent.click(registerLink);

			expect(mockOnSwitchToRegister).toHaveBeenCalled();
		});

		it('should call onForgotPassword when forgot password is clicked', () => {
			render(
				<LoginForm
					onClose={mockOnClose}
					onSuccess={mockOnSuccess}
					onForgotPassword={mockOnForgotPassword}
				/>
			);

			const forgotLink = screen.getByText('Forgot password?');
			fireEvent.click(forgotLink);

			expect(mockOnForgotPassword).toHaveBeenCalled();
		});

		it('should toggle password visibility', () => {
			render(<LoginForm onClose={mockOnClose} onSuccess={mockOnSuccess} />);

			const passwordInput = screen.getByLabelText('Password') as HTMLInputElement;
			const toggleButton = screen.getByLabelText('Show password');

			expect(passwordInput.type).toBe('password');
			fireEvent.click(toggleButton);
			expect(passwordInput.type).toBe('text');
			fireEvent.click(toggleButton);
			expect(passwordInput.type).toBe('password');
		});

		it('should toggle remember me checkbox', () => {
			render(<LoginForm onClose={mockOnClose} onSuccess={mockOnSuccess} />);

			const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
			expect(checkbox.checked).toBe(true);

			fireEvent.click(checkbox);
			expect(checkbox.checked).toBe(false);

			fireEvent.click(checkbox);
			expect(checkbox.checked).toBe(true);
		});
	});

	suite('Accessibility', () => {
		it('should have proper ARIA labels', () => {
			render(<LoginForm onClose={mockOnClose} onSuccess={mockOnSuccess} />);

			expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
			expect(screen.getByRole('dialog')).toHaveAttribute('aria-labelledby', 'login-modal-title');
		});

		it('should have proper input labels', () => {
			render(<LoginForm onClose={mockOnClose} onSuccess={mockOnSuccess} />);

			expect(screen.getByLabelText('Email or Username')).toBeInTheDocument();
			expect(screen.getByLabelText('Password')).toBeInTheDocument();
		});

		it('should have error role on error messages', async () => {
			render(<LoginForm onClose={mockOnClose} onSuccess={mockOnSuccess} />);

			const submitButton = screen.getByRole('button', { name: /sign in/i });
			fireEvent.click(submitButton);

			await waitFor(() => {
				const errorMessage = screen.getByRole('alert');
				expect(errorMessage).toBeInTheDocument();
			});
		});

		it('should have proper autocomplete attributes', () => {
			render(<LoginForm onClose={mockOnClose} onSuccess={mockOnSuccess} />);

			const emailInput = screen.getByLabelText('Email or Username');
			const passwordInput = screen.getByLabelText('Password');

			expect(emailInput).toHaveAttribute('autocomplete', 'username');
			expect(passwordInput).toHaveAttribute('autocomplete', 'current-password');
		});
	});
});
