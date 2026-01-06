/*---------------------------------------------------------------------------------------------
 *  Copyright 2025 AINative Studio. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------------*/

import React, { useState, useEffect, useRef } from 'react';
import { LoginForm } from './LoginForm.js';
import { RegisterForm } from './RegisterForm.js';
import { ForgotPasswordForm } from './ForgotPasswordForm.js';
import { PasswordResetForm } from './PasswordResetForm.js';
import { useKeyboardShortcut } from './hooks.js';
import { AuthView, InitialState } from './types.js';

interface AuthDialogProps {
	onClose?: () => void;
	onSuccess?: () => void;
}

export const AuthDialog: React.FC<AuthDialogProps> = ({
	onClose,
	onSuccess
}) => {
	const [currentView, setCurrentView] = useState<AuthView>('login');
	const [resetToken, setResetToken] = useState<string>('');
	const dialogRef = useRef<HTMLDivElement>(null);

	// Initialize from window state
	useEffect(() => {
		if (window.AINATIVE_INITIAL_STATE) {
			const initialState: InitialState = window.AINATIVE_INITIAL_STATE;

			if (initialState.initialView === 'register') {
				setCurrentView('register');
			} else if (initialState.initialView === 'forgotPassword') {
				setCurrentView('forgotPassword');
			} else if (initialState.initialView === 'passwordReset' && initialState.resetToken) {
				setCurrentView('passwordReset');
				setResetToken(initialState.resetToken);
			} else {
				setCurrentView('login');
			}
		}
	}, []);

	// Handle Escape key to close dialog
	useKeyboardShortcut('Escape', () => {
		onClose?.();
	});

	// Handle click outside to close
	const handleOverlayClick = (e: React.MouseEvent) => {
		if (e.target === e.currentTarget) {
			onClose?.();
		}
	};

	// Prevent closing when clicking inside dialog
	const handleDialogClick = (e: React.MouseEvent) => {
		e.stopPropagation();
	};

	const handleAuthSuccess = () => {
		onSuccess?.();
	};

	const renderCurrentView = () => {
		switch (currentView) {
			case 'register':
				return (
					<RegisterForm
						onSwitchToLogin={() => setCurrentView('login')}
						onSuccess={handleAuthSuccess}
					/>
				);
			case 'forgotPassword':
				return (
					<ForgotPasswordForm
						onSwitchToLogin={() => setCurrentView('login')}
						onSuccess={() => {
							// After requesting reset, go back to login
							setCurrentView('login');
						}}
					/>
				);
			case 'passwordReset':
				return (
					<PasswordResetForm
						resetToken={resetToken}
						onSwitchToLogin={() => setCurrentView('login')}
						onSuccess={handleAuthSuccess}
					/>
				);
			case 'login':
			default:
				return (
					<LoginForm
						onSwitchToRegister={() => setCurrentView('register')}
						onSwitchToForgotPassword={() => setCurrentView('forgotPassword')}
						onSuccess={handleAuthSuccess}
					/>
				);
		}
	};

	return (
		<div
			className="auth-dialog-overlay"
			onClick={handleOverlayClick}
			role="presentation"
		>
			<div
				ref={dialogRef}
				className="auth-dialog"
				onClick={handleDialogClick}
				role="dialog"
				aria-modal="true"
				aria-labelledby="auth-dialog-title"
			>
				{onClose && (
					<button
						className="auth-dialog-close"
						onClick={onClose}
						aria-label="Close dialog"
						type="button"
					>
						<span aria-hidden="true">&times;</span>
					</button>
				)}
				{renderCurrentView()}
			</div>
		</div>
	);
};
