/*---------------------------------------------------------------------------------------------
 *  Copyright 2025 AINative Studio. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------------*/

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AINativeLoginModal } from '../../../browser/react/src/ainative-settings-tsx/AINativeLoginModal';

// Mock the auth hook
const mockLogin = vi.fn();
const mockUseAINativeAuth = vi.fn(() => ({
	login: mockLogin,
	logout: vi.fn(),
	isAuthenticated: false,
	user: null
}));

vi.mock('../../../browser/react/src/util/services', () => ({
	useAINativeAuth: mockUseAINativeAuth
}));

describe('AINativeLoginModal', () => {
	const mockOnClose = vi.fn();
	const mockOnSuccess = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should render login form', () => {
		render(<AINativeLoginModal onClose={mockOnClose} onSuccess={mockOnSuccess} />);

		expect(screen.getByText('Sign In to AINative Cloud')).toBeInTheDocument();
		expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument();
		expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
	});

	it('should validate email format', async () => {
		render(<AINativeLoginModal onClose={mockOnClose} onSuccess={mockOnSuccess} />);

		const emailInput = screen.getByPlaceholderText('you@example.com');
		const passwordInput = screen.getByPlaceholderText('••••••••');
		const submitButton = screen.getByRole('button', { name: /sign in/i });

		fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
		fireEvent.change(passwordInput, { target: { value: 'password123' } });
		fireEvent.click(submitButton);

		await waitFor(() => {
			expect(screen.getByText('Invalid email format')).toBeInTheDocument();
		});
		expect(mockLogin).not.toHaveBeenCalled();
	});

	it('should validate password minimum length', async () => {
		render(<AINativeLoginModal onClose={mockOnClose} onSuccess={mockOnSuccess} />);

		const emailInput = screen.getByPlaceholderText('you@example.com');
		const passwordInput = screen.getByPlaceholderText('••••••••');
		const submitButton = screen.getByRole('button', { name: /sign in/i });

		fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
		fireEvent.change(passwordInput, { target: { value: 'short' } });
		fireEvent.click(submitButton);

		await waitFor(() => {
			expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
		});
		expect(mockLogin).not.toHaveBeenCalled();
	});

	it('should disable submit during loading', async () => {
		mockLogin.mockImplementation(() => new Promise(() => {})); // Never resolves

		render(<AINativeLoginModal onClose={mockOnClose} onSuccess={mockOnSuccess} />);

		const emailInput = screen.getByPlaceholderText('you@example.com');
		const passwordInput = screen.getByPlaceholderText('••••••••');
		const submitButton = screen.getByRole('button', { name: /sign in/i });

		fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
		fireEvent.change(passwordInput, { target: { value: 'password123' } });
		fireEvent.click(submitButton);

		await waitFor(() => {
			expect(screen.getByText('Signing in...')).toBeInTheDocument();
			expect(submitButton).toBeDisabled();
		});
	});

	it('should call authService.login() on submit', async () => {
		mockLogin.mockResolvedValue({ success: true });

		render(<AINativeLoginModal onClose={mockOnClose} onSuccess={mockOnSuccess} />);

		const emailInput = screen.getByPlaceholderText('you@example.com');
		const passwordInput = screen.getByPlaceholderText('••••••••');
		const submitButton = screen.getByRole('button', { name: /sign in/i });

		fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
		fireEvent.change(passwordInput, { target: { value: 'password123' } });
		fireEvent.click(submitButton);

		await waitFor(() => {
			expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
		});
	});

	it('should display error message on failed login', async () => {
		mockLogin.mockResolvedValue({ success: false, error: 'Invalid credentials' });

		render(<AINativeLoginModal onClose={mockOnClose} onSuccess={mockOnSuccess} />);

		const emailInput = screen.getByPlaceholderText('you@example.com');
		const passwordInput = screen.getByPlaceholderText('••••••••');
		const submitButton = screen.getByRole('button', { name: /sign in/i });

		fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
		fireEvent.change(passwordInput, { target: { value: 'password123' } });
		fireEvent.click(submitButton);

		await waitFor(() => {
			expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
		});
		expect(mockOnSuccess).not.toHaveBeenCalled();
	});

	it('should close modal on successful login', async () => {
		mockLogin.mockResolvedValue({ success: true });

		render(<AINativeLoginModal onClose={mockOnClose} onSuccess={mockOnSuccess} />);

		const emailInput = screen.getByPlaceholderText('you@example.com');
		const passwordInput = screen.getByPlaceholderText('••••••••');
		const submitButton = screen.getByRole('button', { name: /sign in/i });

		fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
		fireEvent.change(passwordInput, { target: { value: 'password123' } });
		fireEvent.click(submitButton);

		await waitFor(() => {
			expect(mockOnSuccess).toHaveBeenCalled();
		});
	});

	it('should close modal on cancel button click', () => {
		render(<AINativeLoginModal onClose={mockOnClose} onSuccess={mockOnSuccess} />);

		const closeButton = screen.getByRole('button', { name: '×' });
		fireEvent.click(closeButton);

		expect(mockOnClose).toHaveBeenCalled();
	});
});
