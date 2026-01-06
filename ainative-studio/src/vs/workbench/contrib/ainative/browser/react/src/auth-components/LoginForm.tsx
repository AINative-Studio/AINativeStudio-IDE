/*---------------------------------------------------------------------------------------------
 *  Copyright 2025 AINative Studio. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------------*/

import React, { useState, useEffect, useRef } from 'react';
import { isValidEmail } from '../util/validation.js';
import { useSendToVSCode, useVSCodeMessage } from './hooks.js';
import { FormErrors } from './types.js';

interface LoginFormProps {
	onSwitchToRegister?: () => void;
	onSwitchToForgotPassword?: () => void;
	onSuccess?: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({
	onSwitchToRegister,
	onSwitchToForgotPassword,
	onSuccess
}) => {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [errors, setErrors] = useState<FormErrors>({});
	const [loading, setLoading] = useState(false);
	const emailInputRef = useRef<HTMLInputElement>(null);
	const sendToVSCode = useSendToVSCode();

	// Focus email input on mount
	useEffect(() => {
		emailInputRef.current?.focus();
	}, []);

	// Listen for auth responses from VSCode
	useVSCodeMessage((message) => {
		if (message.type === 'auth-login-success') {
			setLoading(false);
			setErrors({});
			onSuccess?.();
		} else if (message.type === 'error' && message.requestId.startsWith('login-')) {
			setLoading(false);
			setErrors({
				general: message.error?.message || 'Login failed. Please try again.'
			});
		}
	});

	const validateForm = (): boolean => {
		const newErrors: FormErrors = {};

		if (!email) {
			newErrors.email = 'Email is required';
		} else if (!isValidEmail(email)) {
			newErrors.email = 'Please enter a valid email address';
		}

		if (!password) {
			newErrors.password = 'Password is required';
		} else if (password.length < 8) {
			newErrors.password = 'Password must be at least 8 characters';
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!validateForm()) {
			return;
		}

		setLoading(true);
		setErrors({});

		try {
			await sendToVSCode('auth-login', {
				email: email.trim(),
				password
			});
		} catch (error) {
			setLoading(false);
			setErrors({
				general: 'Failed to send login request. Please try again.'
			});
		}
	};

	return (
		<div className="auth-form">
			<div className="auth-form-header">
				<h2>Sign In to AINative Cloud</h2>
				<p className="auth-form-description">
					Access your cloud-powered AI models and sync your settings
				</p>
			</div>

			<form onSubmit={handleSubmit} noValidate>
				{errors.general && (
					<div className="error-message" role="alert" aria-live="polite">
						{errors.general}
					</div>
				)}

				<div className="form-group">
					<label htmlFor="login-email">
						Email
						<span className="required-indicator" aria-label="required">*</span>
					</label>
					<input
						id="login-email"
						ref={emailInputRef}
						type="email"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						onBlur={() => {
							if (email && !isValidEmail(email)) {
								setErrors(prev => ({ ...prev, email: 'Please enter a valid email address' }));
							}
						}}
						placeholder="you@example.com"
						autoComplete="email"
						aria-required="true"
						aria-invalid={!!errors.email}
						aria-describedby={errors.email ? 'login-email-error' : undefined}
						disabled={loading}
						className={errors.email ? 'error' : ''}
					/>
					{errors.email && (
						<span id="login-email-error" className="field-error" role="alert">
							{errors.email}
						</span>
					)}
				</div>

				<div className="form-group">
					<label htmlFor="login-password">
						Password
						<span className="required-indicator" aria-label="required">*</span>
					</label>
					<input
						id="login-password"
						type="password"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						placeholder="Enter your password"
						autoComplete="current-password"
						aria-required="true"
						aria-invalid={!!errors.password}
						aria-describedby={errors.password ? 'login-password-error' : undefined}
						disabled={loading}
						className={errors.password ? 'error' : ''}
					/>
					{errors.password && (
						<span id="login-password-error" className="field-error" role="alert">
							{errors.password}
						</span>
					)}
				</div>

				{onSwitchToForgotPassword && (
					<div className="auth-form-link-container">
						<button
							type="button"
							className="auth-form-link"
							onClick={onSwitchToForgotPassword}
							disabled={loading}
						>
							Forgot password?
						</button>
					</div>
				)}

				<button
					type="submit"
					className="auth-submit-button"
					disabled={loading}
					aria-busy={loading}
				>
					{loading ? (
						<>
							<span className="spinner" aria-hidden="true"></span>
							Signing in...
						</>
					) : (
						'Sign In'
					)}
				</button>
			</form>

			{onSwitchToRegister && (
				<div className="auth-form-footer">
					<p>
						Don't have an account?{' '}
						<button
							type="button"
							className="auth-form-link"
							onClick={onSwitchToRegister}
							disabled={loading}
						>
							Create account
						</button>
					</p>
				</div>
			)}
		</div>
	);
};
