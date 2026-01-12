/*---------------------------------------------------------------------------------------------
 *  Copyright 2025 AINative Studio. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------------*/

import React, { useState, useEffect, useRef } from 'react';
import { isValidEmail } from '../util/validation.js';
import { useSendToVSCode, useVSCodeMessage } from './hooks.js';
import { FormErrors } from './types.js';

interface ForgotPasswordFormProps {
  onSwitchToLogin?: () => void;
  onSuccess?: () => void;
}

export const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({
  onSwitchToLogin,
  onSuccess
}) => {
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const sendToVSCode = useSendToVSCode();

  // Focus email input on mount
  useEffect(() => {
    emailInputRef.current?.focus();
  }, []);

  // Listen for auth responses from VSCode
  useVSCodeMessage((message) => {
    if (message.type === 'auth-password-reset-requested') {
      setLoading(false);
      setErrors({});
      setSubmitted(true);
      onSuccess?.();
    } else if (message.type === 'error' && message.requestId.startsWith('forgot-password-')) {
      setLoading(false);
      setErrors({
        general: message.error?.message || 'Failed to request password reset. Please try again.'
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
      await sendToVSCode('auth-request-password-reset', {
        email: email.trim()
      });
    } catch (error) {
      setLoading(false);
      setErrors({
        general: 'Failed to send password reset request. Please try again.'
      });
    }
  };

  const handleBackToLogin = () => {
    setSubmitted(false);
    setEmail('');
    setErrors({});
    onSwitchToLogin?.();
  };

  if (submitted) {
    return (
      <div className="ainative-auth-form">
				<div className="ainative-auth-form-header">
					<h2>Check Your Email</h2>
				</div>
				<div className="ainative-success-message" role="status">
					<p>
						If an account exists for <strong>{email}</strong>, we've sent a password reset link.
					</p>
					<p>
						Please check your email and click the link to reset your password. The link will expire in 1 hour.
					</p>
					<p className="ainative-field-hint">
						Didn't receive the email? Check your spam folder or try again.
					</p>
				</div>
				<button
          type="button"
          className="ainative-auth-submit-button"
          onClick={handleBackToLogin}>

					Back to Sign In
				</button>
			</div>);

  }

  return (
    <div className="ainative-auth-form">
			<div className="ainative-auth-form-header">
				<h2>Reset Your Password</h2>
				<p className="ainative-auth-form-description">
					Enter your email address and we'll send you a link to reset your password
				</p>
			</div>

			<form onSubmit={handleSubmit} noValidate>
				{errors.general &&
        <div className="ainative-error-message" role="alert" aria-live="polite">
						{errors.general}
					</div>
        }

				<div className="ainative-form-group">
					<label htmlFor="forgot-password-email">
						Email
						<span className="ainative-required-indicator" aria-label="required">*</span>
					</label>
					<input
            id="forgot-password-email"
            ref={emailInputRef}
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
            aria-describedby={errors.email ? 'forgot-password-email-error' : undefined}
            disabled={loading}
            className={errors.email ? "ainative-error" : ""} />

					{errors.email &&
          <span id="forgot-password-email-error" className="ainative-field-error" role="alert">
							{errors.email}
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
							Sending reset link...
						</> :

          'Send Reset Link'
          }
				</button>
			</form>

			{onSwitchToLogin &&
      <div className="ainative-auth-form-footer">
					<p>
						Remember your password?{' '}
						<button
            type="button"
            className="ainative-auth-form-link"
            onClick={handleBackToLogin}
            disabled={loading}>

							Sign in
						</button>
					</p>
				</div>
      }
		</div>);

};