/*---------------------------------------------------------------------------------------------
 *  Copyright 2025 AINative Studio. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------------*/

/**
 * TypeScript types for authentication components
 */

export interface CloudUser {
	readonly id: string;
	readonly email: string;
	readonly username?: string;
	readonly name?: string;
	readonly role: string;
	readonly emailVerified?: boolean;
	readonly createdAt?: string;
	readonly updatedAt?: string;
}

export interface UIMessage {
	type: string;
	requestId: string;
	data?: any;
}

export interface UIResponse {
	type: string;
	requestId: string;
	success: boolean;
	data?: any;
	error?: {
		code: string;
		message: string;
	};
}

export interface InitialState {
	authState: string;
	isAuthenticated: boolean;
	user: CloudUser | null;
	initialView: 'login' | 'register' | 'forgotPassword' | 'passwordReset' | 'modelSelector';
	projectId?: string;
	resetToken?: string; // For password reset flow
}

// Extend window interface for VSCode webview API
declare global {
	interface Window {
		AINATIVE_INITIAL_STATE: InitialState;
		sendToVSCode(type: string, data: any): void;
		sendToVSCodeAsync(type: string, data: any): Promise<any>;
	}
}

export interface FormErrors {
	email?: string;
	password?: string;
	confirmPassword?: string;
	username?: string;
	name?: string;
	currentPassword?: string;
	newPassword?: string;
	general?: string;
}

export type AuthView = 'login' | 'register' | 'forgotPassword' | 'passwordReset';
