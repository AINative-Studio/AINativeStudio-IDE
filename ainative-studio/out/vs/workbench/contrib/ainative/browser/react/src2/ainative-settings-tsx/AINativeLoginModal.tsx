/*---------------------------------------------------------------------------------------------
 *  Copyright 2025 AINative Studio. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------------*/

import React, { useState, useEffect, useRef } from 'react';
import { isValidEmail } from '../util/validation.js';
import { useAINativeAuth, useAccessor } from '../util/services.js';
import './AINativeLoginModal.css';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export const AINativeLoginModal: React.FC<Props> = ({ onClose, onSuccess }) => {
  const accessor = useAccessor();
  const authService = accessor.get('IAINativeAuthService');
  const githubOAuthService = accessor.get('IGitHubOAuthService');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [githubLoading, setGithubLoading] = useState(false);
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

  // Listen for OAuth completion
  useEffect(() => {
    const disposable = githubOAuthService.onDidCompleteAuth(async (result) => {
      setGithubLoading(false);

      if (result.success && result.token && result.user) {
        // Store auth data in auth service
        const loginResult = await authService.login('', '');
        // OAuth success - token already stored by backend
        onSuccess();
      } else {
        setError(result.error || 'GitHub authentication failed');
      }
    });

    return () => disposable.dispose();
  }, [githubOAuthService, authService, onSuccess]);

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

    try {
      const result = await authService.login(email, password);

      setLoading(false);

      if (result.success) {
        onSuccess();
      } else {
        setError(result.error?.message || 'Login failed');
      }
    } catch (err) {
      setLoading(false);
      setError('An unexpected error occurred');
    }
  };

  const handleGitHubSignIn = async () => {
    setError('');
    setGithubLoading(true);

    try {
      const { authUrl } = await githubOAuthService.initiateOAuthFlow();

      // Open GitHub OAuth page in external browser
      window.open(authUrl, '_blank');
    } catch (err) {
      setGithubLoading(false);
      setError('Failed to initiate GitHub authentication');
    }
  };

  return (
    <div className="void-ainative-login-modal-overlay" onClick={onClose}>
			<div
        ref={modalRef}
        className="void-ainative-login-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="modal-title"
        aria-modal="true">

				<div className="void-modal-header">
					<h2 id="modal-title">Sign In to AINative Cloud</h2>
					<button
            className="void-close-button"
            onClick={onClose}
            aria-label="Close"
            tabIndex={0}>

						×
					</button>
				</div>

				<div className="void-modal-body">
					{error &&
          <div className="void-error-message" role="alert">
							{error}
						</div>
          }

					<form onSubmit={handleLogin}>
						<div className="void-form-group">
							<label htmlFor="email-input">Email</label>
							<input
                id="email-input"
                ref={emailInputRef}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email" />

						</div>

						<div className="void-form-group">
							<label htmlFor="password-input">Password</label>
							<input
                id="password-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password" />

						</div>

						<button
              type="submit"
              disabled={loading}
              className="void-submit-button">

							{loading ? 'Signing in...' : 'Sign In'}
						</button>
					</form>

					<div className="void-divider">or</div>

					<button
            className="void-github-signin-button"
            onClick={handleGitHubSignIn}
            disabled={githubLoading || loading}
            type="button">

						{githubLoading ? 'Opening GitHub...' : 'Sign in with GitHub'}
					</button>

					<div className="void-signup-link">
						Don't have an account?{' '}
						<a
              href="https://www.ainative.studio/signup"
              target="_blank"
              rel="noopener noreferrer">

							Sign up
						</a>
					</div>
				</div>
			</div>
		</div>);

};