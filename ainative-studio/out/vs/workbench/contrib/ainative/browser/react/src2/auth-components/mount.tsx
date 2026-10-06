/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import React from 'react';
import * as ReactDOM from 'react-dom/client';

import { ServicesAccessor } from '../../../../../../../editor/browser/editorExtensions.js';
import { IAINativeCloudAuthService } from '../../../../common/ainativeCloudAuthTypes.js';
import { IAIModelRegistryService } from '../../../../common/aiModelRegistryService.js';
import { AINativeAuthUIHandler, UIMessage } from '../../../ainativeAuthUIHandler.js';
import { AuthDialog } from './AuthDialog.js';
import { InitialState } from './types.js';

/**
 * Mounts the real AINative Cloud authentication UI (AuthDialog, which internally
 * routes between LoginForm / RegisterForm / ForgotPasswordForm / PasswordResetForm)
 * directly into the workbench DOM.
 *
 * This codebase does not mount its React surfaces into a sandboxed VS Code webview
 * (IWebviewService) -- every other React panel (sidebar, settings, onboarding,
 * tooltips) is mounted directly into the editor's own DOM via a `mountFn(element,
 * accessor)` helper that gets live VS Code services through `ServicesAccessor`. See
 * `ainative-onboarding/index.tsx` and `sidebarPane.ts` for the established pattern.
 *
 * The auth-components package (LoginForm.tsx etc.) was originally scaffolded against
 * a `window.sendToVSCode` / `window.sendToVSCodeAsync` / `vscode-message` CustomEvent
 * contract, matching a real postMessage webview. Rather than rewriting every form
 * component (and losing the already-complete request/response/error-code mapping in
 * `AINativeAuthUIHandler`), this module re-implements that exact browser-side
 * contract as an in-process bridge straight to `AINativeAuthUIHandler`, so the form
 * components and `AuthDialog`'s view-routing logic work unmodified.
 */
export function mountAuthDialog(
rootElement: HTMLElement,
accessor: ServicesAccessor,
props?: {initialState: InitialState;onClose?: () => void;onSuccess?: () => void;})
{
  if (typeof document === 'undefined') {
    console.error('auth-components/mount.tsx error: document was undefined');
    return;
  }

  const authService = accessor.get(IAINativeCloudAuthService);
  const modelRegistryService = accessor.get(IAIModelRegistryService);
  const uiHandler = new AINativeAuthUIHandler(authService, modelRegistryService);

  // Bridge AINativeAuthUIHandler's responses to the `vscode-message` CustomEvent
  // contract that LoginForm / RegisterForm / ForgotPasswordForm / PasswordResetForm
  // already listen for via `useVSCodeMessage()`.
  const messageSub = uiHandler.onDidSendMessage((message) => {
    window.dispatchEvent(new CustomEvent('vscode-message', { detail: message }));
  });

  // Bridge window.sendToVSCode / window.sendToVSCodeAsync (what the forms call via
  // `useSendToVSCode()`) to AINativeAuthUIHandler.handleMessage().
  const pending = new Map<string, {resolve: (v: any) => void;reject: (e: any) => void;}>();

  const makeRequestId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;

  // Save whatever was previously installed (if anything) so dispose() can put
  // it back rather than leaving a dangling global pointed at a disposed
  // uiHandler/pending map if this dialog is ever mounted more than once.
  const previousSendToVSCode = window.sendToVSCode;
  const previousSendToVSCodeAsync = window.sendToVSCodeAsync;

  window.sendToVSCode = (type: string, data: any) => {
    const requestId = makeRequestId();
    const message: UIMessage = { type, requestId, data };
    void uiHandler.handleMessage(message);
  };

  window.sendToVSCodeAsync = (type: string, data: any) => {
    const requestId = makeRequestId();
    return new Promise((resolve, reject) => {
      pending.set(requestId, { resolve, reject });
      const message: UIMessage = { type, requestId, data };
      void uiHandler.handleMessage(message);
    });
  };

  const pendingSub = uiHandler.onDidSendMessage((message) => {
    const waiter = pending.get(message.requestId);
    if (!waiter) {
      return;
    }
    pending.delete(message.requestId);
    if (message.success) {
      waiter.resolve(message.data);
    } else {
      waiter.reject(new Error(message.error?.message || 'Request failed'));
    }
  });

  // Initial state is read by AuthDialog off window.AINATIVE_INITIAL_STATE on mount.
  if (props?.initialState) {
    window.AINATIVE_INITIAL_STATE = props.initialState;
  }

  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <AuthDialog
      onClose={props?.onClose}
      onSuccess={props?.onSuccess} />

  );

  const dispose = () => {
    root.unmount();
    messageSub.dispose();
    pendingSub.dispose();
    uiHandler.dispose();
    // Reject any still-outstanding sendToVSCodeAsync() calls instead of
    // silently dropping them — otherwise their promises would hang forever,
    // since nothing can resolve them once uiHandler is disposed.
    for (const waiter of pending.values()) {
      waiter.reject(new Error('Auth dialog was closed before this request completed'));
    }
    pending.clear();
    // Restore whatever was installed before this dialog mounted (or remove
    // the globals entirely if nothing was), so a stale reference to this
    // disposed uiHandler/pending map can never be invoked again.
    window.sendToVSCode = previousSendToVSCode;
    window.sendToVSCodeAsync = previousSendToVSCodeAsync;
  };

  return { dispose };
}