/*---------------------------------------------------------------------------------------------
 *  Copyright 2025 AINative Studio. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------------*/

import React, { useState, useEffect, useRef } from 'react';
import { isValidEmail } from '../util/validation.js';
import './AINativeLoginModal.css';

// Temporary mock hook - will be replaced when TASK-006 (AINativeAuthService) is completed
function useAINativeAuth() {
	return {
		login: async (email: string, password: string) => {
			// Mock implementation - replace with actual auth service
			console.log('Login attempt:', { email, password: '***' });
			return { success: true };
		},
		logout: async () => {},
		isAuthenticated: false,
		user: null
	};
}

interface Props {
	onClose: () => void;
	onSuccess: () => void;
}

export const AINativeLoginModal: React.FC<Props> = ({ onClose, onSuccess }) => {
	const auth = useAINativeAuth();
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);
	const modalRef = useRef<HTMLDivElement>(null);
	const emailInputRef = useRef<HTMLInputElement>(null);

	// Focus email input on mount
	useEffect(() => {
		emailInputRef.current?.focus();
	}, []);

	// Handle Escape key to close modal
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				onClose();
			}
		};

		document.addEventListener('keydown', handleKeyDown);
		return () => document.removeEventListener('keydown', handleKeyDown);
	}, [onClose]);

	const handleLogin = async (e: React.FormEvent) => {
		e.preventDefault();

		// Validation
		if (!isValidEmail(email)) {
			setError('Invalid email format');
			return;
		}
		if (password.length < 8) {
			setError('Password must be at least 8 characters');
			return;
		}

		setError('');
		setLoading(true);

		const result = await auth.login(email, password);

		setLoading(false);

		if (result.success) {
			onSuccess();
		} else {
			setError(result.error || 'Login failed');
		}
	};

	return (
		<div className="ainative-login-modal-overlay" onClick={onClose}>
			<div
				ref={modalRef}
				className="ainative-login-modal"
				onClick={e => e.stopPropagation()}
				role="dialog"
				aria-labelledby="modal-title"
				aria-modal="true"
			>
				<div className="modal-header">
					<h2 id="modal-title">Sign In to AINative Cloud</h2>
					<button
						className="close-button"
						onClick={onClose}
						aria-label="Close"
						tabIndex={0}
					>
						×
					</button>
				</div>

				<div className="modal-body">
					{error && (
						<div className="error-message" role="alert">
							{error}
						</div>
					)}

					<form onSubmit={handleLogin}>
						<div className="form-group">
							<label htmlFor="email-input">Email</label>
							<input
								id="email-input"
								ref={emailInputRef}
								type="email"
								value={email}
								onChange={e => setEmail(e.target.value)}
								placeholder="you@example.com"
								required
								autoComplete="email"
							/>
						</div>

						<div className="form-group">
							<label htmlFor="password-input">Password</label>
							<input
								id="password-input"
								type="password"
								value={password}
								onChange={e => setPassword(e.target.value)}
								placeholder="••••••••"
								required
								autoComplete="current-password"
							/>
						</div>

						<button
							type="submit"
							disabled={loading}
							className="submit-button"
						>
							{loading ? 'Signing in...' : 'Sign In'}
						</button>
					</form>

					<div className="divider">or</div>

					<button className="github-signin-button" disabled>
						Sign in with GitHub (Coming Soon)
					</button>

					<div className="signup-link">
						Don't have an account?{' '}
						<a
							href="https://www.ainative.studio/signup"
							target="_blank"
							rel="noopener noreferrer"
						>
							Sign up
						</a>
					</div>
				</div>
			</div>
		</div>
	);
};
