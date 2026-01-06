/*---------------------------------------------------------------------------------------------
 *  Copyright 2025 AINative Studio. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------------*/

import { useEffect, useCallback } from 'react';
import { UIResponse } from './types.js';

/**
 * Hook to listen for VSCode messages
 */
export function useVSCodeMessage(
	handler: (message: UIResponse) => void,
	dependencies: any[] = []
) {
	useEffect(() => {
		const handleMessage = (event: Event) => {
			const customEvent = event as CustomEvent<UIResponse>;
			handler(customEvent.detail);
		};

		window.addEventListener('vscode-message', handleMessage as EventListener);

		return () => {
			window.removeEventListener('vscode-message', handleMessage as EventListener);
		};
	}, [handler, ...dependencies]);
}

/**
 * Hook for sending async messages to VSCode
 */
export function useSendToVSCode() {
	const sendMessage = useCallback(async (type: string, data: any = {}) => {
		try {
			const result = await window.sendToVSCodeAsync(type, data);
			return { success: true, data: result };
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error'
			};
		}
	}, []);

	return sendMessage;
}

/**
 * Hook for keyboard shortcuts (e.g., Escape to close)
 */
export function useKeyboardShortcut(
	key: string,
	handler: () => void,
	dependencies: any[] = []
) {
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === key) {
				handler();
			}
		};

		document.addEventListener('keydown', handleKeyDown);
		return () => document.removeEventListener('keydown', handleKeyDown);
	}, [key, handler, ...dependencies]);
}
