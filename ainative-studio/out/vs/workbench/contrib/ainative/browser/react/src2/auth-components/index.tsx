/*---------------------------------------------------------------------------------------------
 *  Copyright 2025 AINative Studio. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------------*/

/**
 * AINative Cloud Authentication Components
 *
 * This module provides React components for handling authentication in AINative Studio IDE.
 * Components communicate with VS Code services via the webview message protocol.
 *
 * @example
 * ```tsx
 * import { AuthDialog } from './auth-components';
 *
 * function App() {
 *   return (
 *     <AuthDialog
 *       onClose={() => console.log('Dialog closed')}
 *       onSuccess={() => console.log('Authentication successful')}
 *     />
 *   );
 * }
 * ```
 */

// Import CSS first
import './auth.css';

// Export all components
export { LoginForm } from './LoginForm.js';
export { RegisterForm } from './RegisterForm.js';
export { ForgotPasswordForm } from './ForgotPasswordForm.js';
export { PasswordResetForm } from './PasswordResetForm.js';
export { AuthDialog } from './AuthDialog.js';

// Export types
export type {
  CloudUser,
  UIMessage,
  UIResponse,
  InitialState,
  FormErrors,
  AuthView } from
'./types.js';

// Export hooks
export {
  useVSCodeMessage,
  useSendToVSCode,
  useKeyboardShortcut } from
'./hooks.js';