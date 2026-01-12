/*---------------------------------------------------------------------------------------------
 *  Copyright 2025 AINative Studio. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------------*/

import React, { useState, useEffect, useRef } from 'react';
import { isValidPassword } from '../util/validation.js';
import { useSendToVSCode, useVSCodeMessage } from './hooks.js';
import { FormErrors } from './types.js';

interface PasswordResetFormProps {
	resetToken: string;
	onSwitchToLogin?: () => void;
	onSuccess?: () => void;
}

export const PasswordResetForm: React.FC<PasswordResetFormProps> = ({
	resetToken,
	onSwitchToLogin,
	onSuccess
}) => {
	const [newPassword, setNewPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [errors, setErrors] = useState<FormErrors>({});
	const [loading, setLoading] = useState(false);
	const [resetComplete, setResetComplete] = useState(false);
	const passwordInputRef = useRef<HTMLInputElement>(null);
	const sendToVSCode = useSendToVSCode();

	// Focus password input on mount
	useEffect(() => {
		passwordInputRef.current?.focus();
	}, []);

	// Listen for auth responses from VSCode
	useVSCodeMessage((message) => {
		if (message.type === 'auth-password-reset-confirmed') {
			setLoading(false);
			setErrors({});
			setResetComplete(true);
			onSuccess?.();
		} else if (message.type === 'error' && message.requestId.startsWith('password-reset-')) {
			setLoading(false);
			const errorMessage = message.error?.message || 'Failed to reset password. Please try again.';

			if (message.error?.code === 'TOKEN_EXPIRED') {
				setErrors({
					general: 'This password reset link has expired. Please request a new one.'
				});
			} else if (message.error?.code === 'WEAK_PASSWORD') {
				setErrors({
					newPassword: 'Password does not meet security requirements'
				});
			} else {
				setErrors({ general: errorMessage });
			}
		}
	});

	const validateForm = (): boolean => {
		const newErrors: FormErrors = {};

		if (!newPassword) {
			newErrors.newPassword = 'Password is required';
		} else if (!isValidPassword(newPassword, 8)) {
			newErrors.newPassword = 'Password must be at least 8 characters';
		} else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
			newErrors.newPassword = 'Password must contain uppercase, lowercase, and numbers';
		}

		if (!confirmPassword) {
			newErrors.confirmPassword = 'Please confirm your password';
		} else if (newPassword !== confirmPassword) {
			newErrors.confirmPassword = 'Passwords do not match';
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
			await sendToVSCode('auth-confirm-password-reset', {
				token: resetToken,
				newPassword
			});
		} catch (error) {
			setLoading(false);
			setErrors({
				general: 'Failed to send password reset confirmation. Please try again.'
			});
		}
	};

	if (resetComplete) {
		return (
			<div className="auth-form">
				<div className="auth-form-header">
					<h2>Password Reset Successful</h2>
				</div>
				<div className="success-message" role="status">
					<p>
						Your password has been successfully reset. You can now sign in with your new password.
					</p>
				</div>
				{onSwitchToLogin && (
					<button
						type="button"
						className="auth-submit-button"
						onClick={onSwitchToLogin}
					>
						Go to Sign In
					</button>
				)}
			</div>
		);
	}

	return (
		<div className="auth-form">
			<div className="auth-form-header">
				<h2>Create New Password</h2>
				<p className="auth-form-description">
					Enter a new password for your account
				</p>
			</div>

			<form onSubmit={handleSubmit} noValidate>
				{errors.general && (
					<div className="error-message" role="alert" aria-live="polite">
						{errors.general}
					</div>
				)}

				<div className="form-group">
					<label htmlFor="new-password">
						New Password
						<span className="required-indicator" aria-label="required">*</span>
					</label>
					<input
						id="new-password"
						ref={passwordInputRef}
						type="password"
						value={newPassword}
						onChange={(e) => setNewPassword(e.target.value)}
						placeholder="Enter your new password"
						autoComplete="new-password"
						aria-required="true"
						aria-invalid={!!errors.newPassword}
						aria-describedby={errors.newPassword ? 'new-password-error' : 'password-requirements'}
						disabled={loading}
						className={errors.newPassword ? 'error' : ''}
					/>
					{errors.newPassword && (
						<span id="new-password-error" className="field-error" role="alert">
							{errors.newPassword}
						</span>
					)}
					{!errors.newPassword && (
						<span id="password-requirements" className="field-hint">
							At least 8 characters with uppercase, lowercase, and numbers
						</span>
					)}
				</div>

				<div className="form-group">
					<label htmlFor="confirm-new-password">
						Confirm New Password
						<span className="required-indicator" aria-label="required">*</span>
					</label>
					<input
						id="confirm-new-password"
						type="password"
						value={confirmPassword}
						onChange={(e) => setConfirmPassword(e.target.value)}
						placeholder="Re-enter your new password"
						autoComplete="new-password"
						aria-required="true"
						aria-invalid={!!errors.confirmPassword}
						aria-describedby={errors.confirmPassword ? 'confirm-new-password-error' : undefined}
						disabled={loading}
						className={errors.confirmPassword ? 'error' : ''}
					/>
					{errors.confirmPassword && (
						<span id="confirm-new-password-error" className="field-error" role="alert">
							{errors.confirmPassword}
						</span>
					)}
				</div>

				<button
					type="submit"
					className="auth-submit-button"
					disabled={loading}
					aria-busy={loading}
				>
					{loading ? (
						<>
							<span className="spinner" aria-hidden="true"></span>
							Resetting password...
						</>
					) : (
						'Reset Password'
					)}
				</button>
			</form>

			{onSwitchToLogin && (
				<div className="auth-form-footer">
					<p>
						<button
							type="button"
							className="auth-form-link"
							onClick={onSwitchToLogin}
							disabled={loading}
						>
							Back to Sign In
						</button>
					</p>
				</div>
			)}
		</div>
	);
};
