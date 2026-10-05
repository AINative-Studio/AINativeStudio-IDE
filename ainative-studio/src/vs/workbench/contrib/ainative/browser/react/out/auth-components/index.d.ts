/*--------------------------------------------------------------------------------------
 *  Copyright 2025 AINative Studio All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import { ServicesAccessor } from '../../../../../../../editor/browser/editorExtensions.js';

export interface MountResult {
	dispose: () => void;
}

export interface AuthDialogInitialState {
	authState: string;
	isAuthenticated: boolean;
	user: {
		id: string;
		email: string;
		username?: string;
		name?: string;
		role: string;
		emailVerified?: boolean;
		createdAt?: string;
		updatedAt?: string;
	} | null;
	initialView: 'login' | 'register' | 'forgotPassword' | 'passwordReset' | 'modelSelector';
	projectId?: string;
	resetToken?: string;
}

export function mountAuthDialog(
	container: HTMLElement,
	accessor: ServicesAccessor,
	props?: { initialState: AuthDialogInitialState; onClose?: () => void; onSuccess?: () => void }
): MountResult | undefined;
