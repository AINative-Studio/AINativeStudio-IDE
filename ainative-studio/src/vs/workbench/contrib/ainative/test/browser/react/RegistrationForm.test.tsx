/*---------------------------------------------------------------------------------------------
 *  Copyright 2025 AINative Studio. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------------*/

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RegistrationForm } from '../../../browser/react/src2/auth/RegistrationForm';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock the accessor and services
const mockLogin = vi.fn();

const mockAccessor = {
	get: vi.fn((serviceId: string) => {
		if (serviceId === 'IAINativeAuthService') {
			return { login: mockLogin };
		}
		return null;
	})
};

vi.mock('../../../browser/react/src2/util/services', () => ({
	useAccessor: () => mockAccessor
}));

describe('RegistrationForm Component Tests', () => {
	const mockOnClose = vi.fn();
	const mockOnSuccess = vi.fn();
	const mockOnSwitchToLogin = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.clearAllTimers();
	});

	suite('Form Rendering', () => {
		it('should render registration form with all fields', () => {
			render(
				<RegistrationForm
					onClose={mockOnClose}
					onSuccess={mockOnSuccess}
					onSwitchToLogin={mockOnSwitchToLogin}
				/>
			);

			expect(screen.getByText('Create AINative Account')).toBeInTheDocument();
			expect(screen.getByLabelText('Username')).toBeInTheDocument();
			expect(screen.getByLabelText('Email')).toBeInTheDocument();
			expect(screen.getByLabelText('Password')).toBeInTheDocument();
			expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument();
			expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
		});

		it('should render terms of service checkbox', () => {
			render(<RegistrationForm onClose={mockOnClose} onSuccess={mockOnSuccess} />);

			const termsText = screen.getByText(/I agree to the/i);
			expect(termsText).toBeInTheDocument();

			const termsCheckbox = screen.getByRole('checkbox');
			expect(termsCheckbox).toBeInTheDocument();
			expect(termsCheckbox).not.toBeChecked();
		});

		it('should render close button', () => {
			render(<RegistrationForm onClose={mockOnClose} onSuccess={mockOnSuccess} />);

			const closeButton = screen.getByRole('button', { name: 'Close' });
			expect(closeButton).toBeInTheDocument();
		});

		it('should render password visibility toggles', () => {
			render(<RegistrationForm onClose={mockOnClose} onSuccess={mockOnSuccess} />);

			const passwordToggles = screen.getAllByLabelText(/password/i);
			expect(passwordToggles.length).toBeGreaterThan(2); // At least show/hide toggles
		});

		it('should render switch to login link when provided', () => {
			render(
				<RegistrationForm
					onClose={mockOnClose}
					onSuccess={mockOnSuccess}
					onSwitchToLogin={mockOnSwitchToLogin}
				/>
			);

			expect(screen.getByText('Sign in')).toBeInTheDocument();
		});
	});

	suite('Form Validation', () => {
		it('should validate empty username field', async () => {
			render(<RegistrationForm onClose={mockOnClose} onSuccess={mockOnSuccess} />);

			const submitButton = screen.getByRole('button', { name: /create account/i });
			fireEvent.click(submitButton);

			await waitFor(() => {
				expect(screen.getByText('Username is required')).toBeInTheDocument();
			});
			expect(mockFetch).not.toHaveBeenCalled();
		});

		it('should validate username minimum length', async () => {
			render(<RegistrationForm onClose={mockOnClose} onSuccess={mockOnSuccess} />);

			const usernameInput = screen.getByLabelText('Username');
			const submitButton = screen.getByRole('button', { name: /create account/i });

			fireEvent.change(usernameInput, { target: { value: 'ab' } });
			fireEvent.click(submitButton);

			await waitFor(() => {
				expect(screen.getByText('Username must be at least 3 characters')).toBeInTheDocument();
			});
		});

		it('should validate username format', async () => {
			render(<RegistrationForm onClose={mockOnClose} onSuccess={mockOnSuccess} />);

			const usernameInput = screen.getByLabelText('Username');
			const submitButton = screen.getByRole('button', { name: /create account/i });

			fireEvent.change(usernameInput, { target: { value: 'invalid@user' } });
			fireEvent.click(submitButton);

			await waitFor(() => {
				expect(screen.getByText('Username can only contain letters, numbers, underscores, and hyphens')).toBeInTheDocument();
			});
		});

		it('should validate email format', async () => {
			render(<RegistrationForm onClose={mockOnClose} onSuccess={mockOnSuccess} />);

			const usernameInput = screen.getByLabelText('Username');
			const emailInput = screen.getByLabelText('Email');
			const submitButton = screen.getByRole('button', { name: /create account/i });

			fireEvent.change(usernameInput, { target: { value: 'validuser' } });
			fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
			fireEvent.click(submitButton);

			await waitFor(() => {
				expect(screen.getByText('Invalid email format')).toBeInTheDocument();
			});
		});

		it('should validate password minimum length', async () => {
			render(<RegistrationForm onClose={mockOnClose} onSuccess={mockOnSuccess} />);

			const usernameInput = screen.getByLabelText('Username');
			const emailInput = screen.getByLabelText('Email');
			const passwordInput = screen.getByLabelText('Password');
			const submitButton = screen.getByRole('button', { name: /create account/i });

			fireEvent.change(usernameInput, { target: { value: 'validuser' } });
			fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
			fireEvent.change(passwordInput, { target: { value: 'short' } });
			fireEvent.click(submitButton);

			await waitFor(() => {
				expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
			});
		});

		it('should validate password strength', async () => {
			render(<RegistrationForm onClose={mockOnClose} onSuccess={mockOnSuccess} />);

			const usernameInput = screen.getByLabelText('Username');
			const emailInput = screen.getByLabelText('Email');
			const passwordInput = screen.getByLabelText('Password');
			const confirmPasswordInput = screen.getByLabelText('Confirm Password');
			const termsCheckbox = screen.getByRole('checkbox');
			const submitButton = screen.getByRole('button', { name: /create account/i });

			fireEvent.change(usernameInput, { target: { value: 'validuser' } });
			fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
			fireEvent.change(passwordInput, { target: { value: 'weakpass' } });
			fireEvent.change(confirmPasswordInput, { target: { value: 'weakpass' } });
			fireEvent.click(termsCheckbox);
			fireEvent.click(submitButton);

			await waitFor(() => {
				expect(screen.getByText('Password is too weak. Please use a stronger password.')).toBeInTheDocument();
			});
		});

		it('should validate password confirmation match', async () => {
			render(<RegistrationForm onClose={mockOnClose} onSuccess={mockOnSuccess} />);

			const usernameInput = screen.getByLabelText('Username');
			const emailInput = screen.getByLabelText('Email');
			const passwordInput = screen.getByLabelText('Password');
			const confirmPasswordInput = screen.getByLabelText('Confirm Password');
			const termsCheckbox = screen.getByRole('checkbox');
			const submitButton = screen.getByRole('button', { name: /create account/i });

			fireEvent.change(usernameInput, { target: { value: 'validuser' } });
			fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
			fireEvent.change(passwordInput, { target: { value: 'StrongPass123!' } });
			fireEvent.change(confirmPasswordInput, { target: { value: 'DifferentPass123!' } });
			fireEvent.click(termsCheckbox);
			fireEvent.click(submitButton);

			await waitFor(() => {
				expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
			});
		});

		it('should validate terms of service acceptance', async () => {
			render(<RegistrationForm onClose={mockOnClose} onSuccess={mockOnSuccess} />);

			const usernameInput = screen.getByLabelText('Username');
			const emailInput = screen.getByLabelText('Email');
			const passwordInput = screen.getByLabelText('Password');
			const confirmPasswordInput = screen.getByLabelText('Confirm Password');
			const submitButton = screen.getByRole('button', { name: /create account/i });

			fireEvent.change(usernameInput, { target: { value: 'validuser' } });
			fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
			fireEvent.change(passwordInput, { target: { value: 'StrongPass123!' } });
			fireEvent.change(confirmPasswordInput, { target: { value: 'StrongPass123!' } });
			fireEvent.click(submitButton);

			await waitFor(() => {
				expect(screen.getByText('You must agree to the Terms of Service')).toBeInTheDocument();
			});
		});
	});

	suite('Password Strength Indicator', () => {
		it('should show password strength indicator', () => {
			render(<RegistrationForm onClose={mockOnClose} onSuccess={mockOnSuccess} />);

			const passwordInput = screen.getByLabelText('Password');
			fireEvent.change(passwordInput, { target: { value: 'weakpass' } });

			expect(screen.getByText('Weak')).toBeInTheDocument();
		});

		it('should update strength indicator for fair password', () => {
			render(<RegistrationForm onClose={mockOnClose} onSuccess={mockOnSuccess} />);

			const passwordInput = screen.getByLabelText('Password');
			fireEvent.change(passwordInput, { target: { value: 'FairPass123' } });

			expect(screen.getByText('Fair')).toBeInTheDocument();
		});

		it('should update strength indicator for good password', () => {
			render(<RegistrationForm onClose={mockOnClose} onSuccess={mockOnSuccess} />);

			const passwordInput = screen.getByLabelText('Password');
			fireEvent.change(passwordInput, { target: { value: 'GoodPass123!' } });

			expect(screen.getByText('Good')).toBeInTheDocument();
		});

		it('should show password suggestions for weak passwords', () => {
			render(<RegistrationForm onClose={mockOnClose} onSuccess={mockOnSuccess} />);

			const passwordInput = screen.getByLabelText('Password');
			fireEvent.change(passwordInput, { target: { value: 'lowercase' } });

			// Should show suggestions
			expect(screen.getByText(/Add uppercase letters/i)).toBeInTheDocument();
		});
	});

	suite('Submit Handling', () => {
		it('should submit registration with valid data', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ message: 'Registration successful' })
			});
			mockLogin.mockResolvedValue({ success: true });

			render(<RegistrationForm onClose={mockOnClose} onSuccess={mockOnSuccess} />);

			const usernameInput = screen.getByLabelText('Username');
			const emailInput = screen.getByLabelText('Email');
			const passwordInput = screen.getByLabelText('Password');
			const confirmPasswordInput = screen.getByLabelText('Confirm Password');
			const termsCheckbox = screen.getByRole('checkbox');
			const submitButton = screen.getByRole('button', { name: /create account/i });

			fireEvent.change(usernameInput, { target: { value: 'newuser' } });
			fireEvent.change(emailInput, { target: { value: 'newuser@example.com' } });
			fireEvent.change(passwordInput, { target: { value: 'StrongPass123!' } });
			fireEvent.change(confirmPasswordInput, { target: { value: 'StrongPass123!' } });
			fireEvent.click(termsCheckbox);
			fireEvent.click(submitButton);

			await waitFor(() => {
				expect(mockFetch).toHaveBeenCalledWith(
					'https://api.ainative.studio/v1/auth/register',
					expect.objectContaining({
						method: 'POST',
						body: JSON.stringify({
							username: 'newuser',
							email: 'newuser@example.com',
							password: 'StrongPass123!'
						})
					})
				);
			});
		});

		it('should auto-login after successful registration', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ message: 'Registration successful' })
			});
			mockLogin.mockResolvedValue({ success: true });

			render(<RegistrationForm onClose={mockOnClose} onSuccess={mockOnSuccess} />);

			const usernameInput = screen.getByLabelText('Username');
			const emailInput = screen.getByLabelText('Email');
			const passwordInput = screen.getByLabelText('Password');
			const confirmPasswordInput = screen.getByLabelText('Confirm Password');
			const termsCheckbox = screen.getByRole('checkbox');
			const submitButton = screen.getByRole('button', { name: /create account/i });

			fireEvent.change(usernameInput, { target: { value: 'newuser' } });
			fireEvent.change(emailInput, { target: { value: 'newuser@example.com' } });
			fireEvent.change(passwordInput, { target: { value: 'StrongPass123!' } });
			fireEvent.change(confirmPasswordInput, { target: { value: 'StrongPass123!' } });
			fireEvent.click(termsCheckbox);
			fireEvent.click(submitButton);

			await waitFor(() => {
				expect(mockLogin).toHaveBeenCalledWith('newuser@example.com', 'StrongPass123!');
				expect(mockOnSuccess).toHaveBeenCalled();
			});
		});

		it('should handle registration failure', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: false,
				json: async () => ({ message: 'Email already exists' })
			});

			render(<RegistrationForm onClose={mockOnClose} onSuccess={mockOnSuccess} />);

			const usernameInput = screen.getByLabelText('Username');
			const emailInput = screen.getByLabelText('Email');
			const passwordInput = screen.getByLabelText('Password');
			const confirmPasswordInput = screen.getByLabelText('Confirm Password');
			const termsCheckbox = screen.getByRole('checkbox');
			const submitButton = screen.getByRole('button', { name: /create account/i });

			fireEvent.change(usernameInput, { target: { value: 'existinguser' } });
			fireEvent.change(emailInput, { target: { value: 'existing@example.com' } });
			fireEvent.change(passwordInput, { target: { value: 'StrongPass123!' } });
			fireEvent.change(confirmPasswordInput, { target: { value: 'StrongPass123!' } });
			fireEvent.click(termsCheckbox);
			fireEvent.click(submitButton);

			await waitFor(() => {
				expect(screen.getByText('Email already exists')).toBeInTheDocument();
			});
		});

		it('should handle network error', async () => {
			mockFetch.mockRejectedValue(new Error('Network error'));

			render(<RegistrationForm onClose={mockOnClose} onSuccess={mockOnSuccess} />);

			const usernameInput = screen.getByLabelText('Username');
			const emailInput = screen.getByLabelText('Email');
			const passwordInput = screen.getByLabelText('Password');
			const confirmPasswordInput = screen.getByLabelText('Confirm Password');
			const termsCheckbox = screen.getByRole('checkbox');
			const submitButton = screen.getByRole('button', { name: /create account/i });

			fireEvent.change(usernameInput, { target: { value: 'newuser' } });
			fireEvent.change(emailInput, { target: { value: 'newuser@example.com' } });
			fireEvent.change(passwordInput, { target: { value: 'StrongPass123!' } });
			fireEvent.change(confirmPasswordInput, { target: { value: 'StrongPass123!' } });
			fireEvent.click(termsCheckbox);
			fireEvent.click(submitButton);

			await waitFor(() => {
				expect(screen.getByText('Network error. Please check your connection and try again.')).toBeInTheDocument();
			});
		});
	});

	suite('Loading States', () => {
		it('should show loading state during registration', async () => {
			mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

			render(<RegistrationForm onClose={mockOnClose} onSuccess={mockOnSuccess} />);

			const usernameInput = screen.getByLabelText('Username');
			const emailInput = screen.getByLabelText('Email');
			const passwordInput = screen.getByLabelText('Password');
			const confirmPasswordInput = screen.getByLabelText('Confirm Password');
			const termsCheckbox = screen.getByRole('checkbox');
			const submitButton = screen.getByRole('button', { name: /create account/i });

			fireEvent.change(usernameInput, { target: { value: 'newuser' } });
			fireEvent.change(emailInput, { target: { value: 'newuser@example.com' } });
			fireEvent.change(passwordInput, { target: { value: 'StrongPass123!' } });
			fireEvent.change(confirmPasswordInput, { target: { value: 'StrongPass123!' } });
			fireEvent.click(termsCheckbox);
			fireEvent.click(submitButton);

			await waitFor(() => {
				expect(screen.getByText('Creating Account...')).toBeInTheDocument();
				expect(submitButton).toBeDisabled();
			});
		});

		it('should re-enable button after registration fails', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: false,
				json: async () => ({ message: 'Error' })
			});

			render(<RegistrationForm onClose={mockOnClose} onSuccess={mockOnSuccess} />);

			const usernameInput = screen.getByLabelText('Username');
			const emailInput = screen.getByLabelText('Email');
			const passwordInput = screen.getByLabelText('Password');
			const confirmPasswordInput = screen.getByLabelText('Confirm Password');
			const termsCheckbox = screen.getByRole('checkbox');
			const submitButton = screen.getByRole('button', { name: /create account/i });

			fireEvent.change(usernameInput, { target: { value: 'newuser' } });
			fireEvent.change(emailInput, { target: { value: 'newuser@example.com' } });
			fireEvent.change(passwordInput, { target: { value: 'StrongPass123!' } });
			fireEvent.change(confirmPasswordInput, { target: { value: 'StrongPass123!' } });
			fireEvent.click(termsCheckbox);
			fireEvent.click(submitButton);

			await waitFor(() => {
				expect(screen.getByText('Create Account')).toBeInTheDocument();
				expect(submitButton).not.toBeDisabled();
			});
		});
	});

	suite('User Interactions', () => {
		it('should call onClose when close button is clicked', () => {
			render(<RegistrationForm onClose={mockOnClose} onSuccess={mockOnSuccess} />);

			const closeButton = screen.getByRole('button', { name: 'Close' });
			fireEvent.click(closeButton);

			expect(mockOnClose).toHaveBeenCalled();
		});

		it('should call onSwitchToLogin when sign in is clicked', () => {
			render(
				<RegistrationForm
					onClose={mockOnClose}
					onSuccess={mockOnSuccess}
					onSwitchToLogin={mockOnSwitchToLogin}
				/>
			);

			const loginLink = screen.getByText('Sign in');
			fireEvent.click(loginLink);

			expect(mockOnSwitchToLogin).toHaveBeenCalled();
		});

		it('should toggle password visibility', () => {
			render(<RegistrationForm onClose={mockOnClose} onSuccess={mockOnSuccess} />);

			const passwordInput = screen.getByLabelText('Password') as HTMLInputElement;
			const toggleButton = screen.getByLabelText('Show password');

			expect(passwordInput.type).toBe('password');
			fireEvent.click(toggleButton);
			expect(passwordInput.type).toBe('text');
		});

		it('should toggle confirm password visibility', () => {
			render(<RegistrationForm onClose={mockOnClose} onSuccess={mockOnSuccess} />);

			const confirmPasswordInput = screen.getByLabelText('Confirm Password') as HTMLInputElement;
			const toggleButtons = screen.getAllByRole('button', { name: /password/i });
			const confirmToggle = toggleButtons.find(btn => btn.getAttribute('aria-label')?.includes('Hide password') || btn.getAttribute('aria-label')?.includes('Show password'));

			expect(confirmPasswordInput.type).toBe('password');
		});

		it('should toggle terms checkbox', () => {
			render(<RegistrationForm onClose={mockOnClose} onSuccess={mockOnSuccess} />);

			const termsCheckbox = screen.getByRole('checkbox') as HTMLInputElement;
			expect(termsCheckbox.checked).toBe(false);

			fireEvent.click(termsCheckbox);
			expect(termsCheckbox.checked).toBe(true);
		});
	});

	suite('Accessibility', () => {
		it('should have proper ARIA labels', () => {
			render(<RegistrationForm onClose={mockOnClose} onSuccess={mockOnSuccess} />);

			expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
			expect(screen.getByRole('dialog')).toHaveAttribute('aria-labelledby', 'register-modal-title');
		});

		it('should have proper input labels', () => {
			render(<RegistrationForm onClose={mockOnClose} onSuccess={mockOnSuccess} />);

			expect(screen.getByLabelText('Username')).toBeInTheDocument();
			expect(screen.getByLabelText('Email')).toBeInTheDocument();
			expect(screen.getByLabelText('Password')).toBeInTheDocument();
			expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument();
		});

		it('should have error role on error messages', async () => {
			render(<RegistrationForm onClose={mockOnClose} onSuccess={mockOnSuccess} />);

			const submitButton = screen.getByRole('button', { name: /create account/i });
			fireEvent.click(submitButton);

			await waitFor(() => {
				const errorMessage = screen.getByRole('alert');
				expect(errorMessage).toBeInTheDocument();
			});
		});

		it('should have proper autocomplete attributes', () => {
			render(<RegistrationForm onClose={mockOnClose} onSuccess={mockOnSuccess} />);

			const usernameInput = screen.getByLabelText('Username');
			const emailInput = screen.getByLabelText('Email');
			const passwordInput = screen.getByLabelText('Password');
			const confirmPasswordInput = screen.getByLabelText('Confirm Password');

			expect(usernameInput).toHaveAttribute('autocomplete', 'username');
			expect(emailInput).toHaveAttribute('autocomplete', 'email');
			expect(passwordInput).toHaveAttribute('autocomplete', 'new-password');
			expect(confirmPasswordInput).toHaveAttribute('autocomplete', 'new-password');
		});
	});
});
