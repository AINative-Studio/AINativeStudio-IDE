/*---------------------------------------------------------------------------------------------
 *  Copyright 2025 AINative Studio. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------------*/

import React, { useState, useEffect, useRef } from 'react';
import { isValidEmail, isValidPassword } from '../util/validation.js';
import { useSendToVSCode, useVSCodeMessage } from './hooks.js';
import { FormErrors } from './types.js';

interface RegisterFormProps {
  onSwitchToLogin?: () => void;
  onSuccess?: () => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({
  onSwitchToLogin,
  onSuccess
}) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [showEmailVerificationMessage, setShowEmailVerificationMessage] = useState(false);
  const usernameInputRef = useRef<HTMLInputElement>(null);
  const sendToVSCode = useSendToVSCode();

  // Focus username input on mount
  useEffect(() => {
    usernameInputRef.current?.focus();
  }, []);

  // Listen for auth responses from VSCode
  useVSCodeMessage((message) => {
    if (message.type === 'auth-register-success') {
      setLoading(false);
      setErrors({});

      if (message.data?.requiresEmailVerification) {
        setShowEmailVerificationMessage(true);
      } else {
        onSuccess?.();
      }
    } else if (message.type === 'error' && message.requestId.startsWith('register-')) {
      setLoading(false);
      const errorMessage = message.error?.message || 'Registration failed. Please try again.';

      // Map specific error codes to field-specific errors
      if (message.error?.code === 'EMAIL_ALREADY_EXISTS') {
        setErrors({ email: 'This email is already registered' });
      } else if (message.error?.code === 'WEAK_PASSWORD') {
        setErrors({ password: 'Password does not meet security requirements' });
      } else {
        setErrors({ general: errorMessage });
      }
    }
  });

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!username) {
      newErrors.username = 'Username is required';
    } else if (username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    } else if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      newErrors.username = 'Username can only contain letters, numbers, hyphens, and underscores';
    }

    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!isValidEmail(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (!isValidPassword(password, 8)) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      newErrors.password = 'Password must contain uppercase, lowercase, and numbers';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
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
    setShowEmailVerificationMessage(false);

    try {
      await sendToVSCode('auth-register', {
        username: username.trim(),
        email: email.trim(),
        password,
        name: name.trim() || undefined
      });
    } catch (error) {
      setLoading(false);
      setErrors({
        general: 'Failed to send registration request. Please try again.'
      });
    }
  };

  if (showEmailVerificationMessage) {
    return (
      <div className="ainative-auth-form">
				<div className="ainative-auth-form-header">
					<h2>Check Your Email</h2>
				</div>
				<div className="ainative-success-message" role="status">
					<p>
						We've sent a verification email to <strong>{email}</strong>.
					</p>
					<p>
						Please click the link in the email to verify your account and complete registration.
					</p>
				</div>
				{onSwitchToLogin &&
        <button
          type="button"
          className="ainative-auth-submit-button"
          onClick={onSwitchToLogin}>

						Back to Sign In
					</button>
        }
			</div>);

  }

  return (
    <div className="ainative-auth-form">
			<div className="ainative-auth-form-header">
				<h2>Create Your Account</h2>
				<p className="ainative-auth-form-description">
					Join AINative Cloud to access premium AI models and features
				</p>
			</div>

			<form onSubmit={handleSubmit} noValidate>
				{errors.general &&
        <div className="ainative-error-message" role="alert" aria-live="polite">
						{errors.general}
					</div>
        }

				<div className="ainative-form-group">
					<label htmlFor="register-username">
						Username
						<span className="ainative-required-indicator" aria-label="required">*</span>
					</label>
					<input
            id="register-username"
            ref={usernameInputRef}
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Choose a username"
            autoComplete="username"
            aria-required="true"
            aria-invalid={!!errors.username}
            aria-describedby={errors.username ? 'register-username-error' : undefined}
            disabled={loading}
            className={errors.username ? "ainative-error" : ""} />

					{errors.username &&
          <span id="register-username-error" className="ainative-field-error" role="alert">
							{errors.username}
						</span>
          }
				</div>

				<div className="ainative-form-group">
					<label htmlFor="register-email">
						Email
						<span className="ainative-required-indicator" aria-label="required">*</span>
					</label>
					<input
            id="register-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => {
              if (email && !isValidEmail(email)) {
                setErrors((prev) => ({ ...prev, email: 'Please enter a valid email address' }));
              }
            }}
            placeholder="you@example.com"
            autoComplete="email"
            aria-required="true"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'register-email-error' : undefined}
            disabled={loading}
            className={errors.email ? "ainative-error" : ""} />

					{errors.email &&
          <span id="register-email-error" className="ainative-field-error" role="alert">
							{errors.email}
						</span>
          }
				</div>

				<div className="ainative-form-group">
					<label htmlFor="register-name">
						Full Name <span className="ainative-optional-indicator">(optional)</span>
					</label>
					<input
            id="register-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your full name"
            autoComplete="name"
            disabled={loading} />

				</div>

				<div className="ainative-form-group">
					<label htmlFor="register-password">
						Password
						<span className="ainative-required-indicator" aria-label="required">*</span>
					</label>
					<input
            id="register-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Create a strong password"
            autoComplete="new-password"
            aria-required="true"
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? 'register-password-error' : 'password-requirements'}
            disabled={loading}
            className={errors.password ? "ainative-error" : ""} />

					{errors.password &&
          <span id="register-password-error" className="ainative-field-error" role="alert">
							{errors.password}
						</span>
          }
					{!errors.password &&
          <span id="password-requirements" className="ainative-field-hint">
							At least 8 characters with uppercase, lowercase, and numbers
						</span>
          }
				</div>

				<div className="ainative-form-group">
					<label htmlFor="register-confirm-password">
						Confirm Password
						<span className="ainative-required-indicator" aria-label="required">*</span>
					</label>
					<input
            id="register-confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter your password"
            autoComplete="new-password"
            aria-required="true"
            aria-invalid={!!errors.confirmPassword}
            aria-describedby={errors.confirmPassword ? 'register-confirm-password-error' : undefined}
            disabled={loading}
            className={errors.confirmPassword ? "ainative-error" : ""} />

					{errors.confirmPassword &&
          <span id="register-confirm-password-error" className="ainative-field-error" role="alert">
							{errors.confirmPassword}
						</span>
          }
				</div>

				<button
          type="submit"
          className="ainative-auth-submit-button"
          disabled={loading}
          aria-busy={loading}>

					{loading ?
          <>
							<span className="ainative-spinner" aria-hidden="true"></span>
							Creating account...
						</> :

          'Create Account'
          }
				</button>
			</form>

			{onSwitchToLogin &&
      <div className="ainative-auth-form-footer">
					<p>
						Already have an account?{' '}
						<button
            type="button"
            className="ainative-auth-form-link"
            onClick={onSwitchToLogin}
            disabled={loading}>

							Sign in
						</button>
					</p>
				</div>
      }
		</div>);

};