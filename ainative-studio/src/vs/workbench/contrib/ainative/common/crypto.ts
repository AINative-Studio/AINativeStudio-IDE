/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';

export const ICryptoService = createDecorator<ICryptoService>('cryptoService');

/**
 * Crypto service interface for encryption/decryption utilities
 */
export interface ICryptoService {
	readonly _serviceBrand: undefined;

	/**
	 * Generate a cryptographically secure random string
	 * @param length Length of the string
	 * @returns Random string
	 */
	generateRandomString(length: number): string;

	/**
	 * Generate a secure hash of data
	 * @param data Data to hash
	 * @returns Hash string
	 */
	hash(data: string): Promise<string>;

	/**
	 * Verify a hash against data
	 * @param data Original data
	 * @param hash Hash to verify
	 * @returns true if hash matches
	 */
	verifyHash(data: string, hash: string): Promise<boolean>;

	/**
	 * Generate a CSRF token
	 * @returns CSRF token
	 */
	generateCSRFToken(): string;

	/**
	 * Verify a CSRF token
	 * @param token Token to verify
	 * @returns true if token is valid
	 */
	verifyCSRFToken(token: string): boolean;
}

/**
 * Crypto service implementation
 * Provides cryptographic utilities for token security
 */
export class CryptoService implements ICryptoService {
	readonly _serviceBrand: undefined;

	private _csrfTokens = new Set<string>();
	private _csrfTokenTimeout = 60 * 60 * 1000; // 1 hour

	/**
	 * Generate a cryptographically secure random string
	 */
	generateRandomString(length: number): string {
		const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
		const randomValues = new Uint8Array(length);

		if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
			crypto.getRandomValues(randomValues);
		} else {
			// Fallback for Node.js environment
			const nodeCrypto = require('crypto');
			nodeCrypto.randomFillSync(randomValues);
		}

		let result = '';
		for (let i = 0; i < length; i++) {
			result += chars[randomValues[i] % chars.length];
		}

		return result;
	}

	/**
	 * Generate a secure hash using SHA-256
	 */
	async hash(data: string): Promise<string> {
		if (typeof crypto !== 'undefined' && crypto.subtle) {
			// Browser environment
			const encoder = new TextEncoder();
			const dataBuffer = encoder.encode(data);
			const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
			const hashArray = Array.from(new Uint8Array(hashBuffer));
			return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
		} else {
			// Node.js environment
			const nodeCrypto = require('crypto');
			return nodeCrypto.createHash('sha256').update(data).digest('hex');
		}
	}

	/**
	 * Verify a hash against data
	 */
	async verifyHash(data: string, hash: string): Promise<boolean> {
		const computedHash = await this.hash(data);
		return this._constantTimeCompare(computedHash, hash);
	}

	/**
	 * Generate a CSRF token
	 */
	generateCSRFToken(): string {
		const token = this.generateRandomString(32);
		this._csrfTokens.add(token);

		// Auto-expire token after timeout
		setTimeout(() => {
			this._csrfTokens.delete(token);
		}, this._csrfTokenTimeout);

		return token;
	}

	/**
	 * Verify a CSRF token
	 */
	verifyCSRFToken(token: string): boolean {
		return this._csrfTokens.has(token);
	}

	/**
	 * Constant-time string comparison to prevent timing attacks
	 */
	private _constantTimeCompare(a: string, b: string): boolean {
		if (a.length !== b.length) {
			return false;
		}

		let result = 0;
		for (let i = 0; i < a.length; i++) {
			result |= a.charCodeAt(i) ^ b.charCodeAt(i);
		}

		return result === 0;
	}
}

/**
 * Token encryption utilities
 */
export class TokenEncryption {
	/**
	 * Encrypt a token using AES-GCM
	 * @param token Token to encrypt
	 * @param key Encryption key
	 * @returns Encrypted token with IV prepended
	 */
	static async encrypt(token: string, key: CryptoKey): Promise<string> {
		const encoder = new TextEncoder();
		const dataBuffer = encoder.encode(token);

		// Generate random IV
		const iv = crypto.getRandomValues(new Uint8Array(12));

		// Encrypt
		const encryptedBuffer = await crypto.subtle.encrypt(
			{ name: 'AES-GCM', iv },
			key,
			dataBuffer
		);

		// Combine IV and encrypted data
		const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
		combined.set(iv, 0);
		combined.set(new Uint8Array(encryptedBuffer), iv.length);

		// Convert to base64
		return this._arrayBufferToBase64(combined);
	}

	/**
	 * Decrypt a token using AES-GCM
	 * @param encryptedToken Encrypted token with IV
	 * @param key Decryption key
	 * @returns Decrypted token
	 */
	static async decrypt(encryptedToken: string, key: CryptoKey): Promise<string> {
		// Decode from base64
		const combined = this._base64ToArrayBuffer(encryptedToken);

		// Extract IV and encrypted data
		const iv = combined.slice(0, 12);
		const data = combined.slice(12);

		// Decrypt
		const decryptedBuffer = await crypto.subtle.decrypt(
			{ name: 'AES-GCM', iv },
			key,
			data
		);

		// Convert to string
		const decoder = new TextDecoder();
		return decoder.decode(decryptedBuffer);
	}

	/**
	 * Generate or import an encryption key
	 * @param keyData Key material (32 bytes)
	 * @returns CryptoKey for AES-GCM
	 */
	static async importKey(keyData: string): Promise<CryptoKey> {
		const encoder = new TextEncoder();
		const keyBuffer = encoder.encode(keyData.padEnd(32, '0').substring(0, 32));

		return await crypto.subtle.importKey(
			'raw',
			keyBuffer,
			{ name: 'AES-GCM' },
			false,
			['encrypt', 'decrypt']
		);
	}

	/**
	 * Convert ArrayBuffer to base64
	 */
	private static _arrayBufferToBase64(buffer: Uint8Array): string {
		const binary = String.fromCharCode(...Array.from(buffer));
		return btoa(binary);
	}

	/**
	 * Convert base64 to ArrayBuffer
	 */
	private static _base64ToArrayBuffer(base64: string): Uint8Array {
		const binary = atob(base64);
		const bytes = new Uint8Array(binary.length);
		for (let i = 0; i < binary.length; i++) {
			bytes[i] = binary.charCodeAt(i);
		}
		return bytes;
	}
}

/**
 * JWT token utilities
 */
export class JWTUtils {
	/**
	 * Decode JWT token without verification
	 * @param token JWT token
	 * @returns Decoded payload
	 */
	static decode<T = any>(token: string): T {
		const parts = token.split('.');
		if (parts.length !== 3) {
			throw new Error('Invalid JWT token format');
		}

		const payload = Buffer.from(parts[1], 'base64').toString('utf-8');
		return JSON.parse(payload);
	}

	/**
	 * Check if JWT token is expired
	 * @param token JWT token
	 * @param bufferSeconds Buffer time in seconds before expiration
	 * @returns true if token is expired
	 */
	static isExpired(token: string, bufferSeconds: number = 0): boolean {
		try {
			const payload = this.decode<{ exp: number }>(token);
			const now = Math.floor(Date.now() / 1000);
			return payload.exp < (now + bufferSeconds);
		} catch {
			return true;
		}
	}

	/**
	 * Get token expiration time
	 * @param token JWT token
	 * @returns Expiration timestamp in milliseconds, or null if invalid
	 */
	static getExpiration(token: string): number | null {
		try {
			const payload = this.decode<{ exp: number }>(token);
			return payload.exp * 1000; // Convert to milliseconds
		} catch {
			return null;
		}
	}

	/**
	 * Extract claims from JWT token
	 * @param token JWT token
	 * @returns Token claims
	 */
	static getClaims<T = any>(token: string): T {
		return this.decode<T>(token);
	}

	/**
	 * Validate JWT token structure (basic validation only)
	 * @param token JWT token
	 * @returns true if token has valid structure
	 */
	static isValidStructure(token: string): boolean {
		const parts = token.split('.');
		if (parts.length !== 3) {
			return false;
		}

		try {
			// Try to decode each part
			Buffer.from(parts[0], 'base64').toString('utf-8');
			Buffer.from(parts[1], 'base64').toString('utf-8');
			Buffer.from(parts[2], 'base64');
			return true;
		} catch {
			return false;
		}
	}
}

/**
 * Secure storage key derivation
 */
export class KeyDerivation {
	/**
	 * Derive a key from a password using PBKDF2
	 * @param password Password
	 * @param salt Salt (or random string)
	 * @param iterations Number of iterations
	 * @returns Derived key
	 */
	static async deriveKey(
		password: string,
		salt: string,
		iterations: number = 100000
	): Promise<CryptoKey> {
		const encoder = new TextEncoder();
		const passwordBuffer = encoder.encode(password);
		const saltBuffer = encoder.encode(salt);

		// Import password as key material
		const keyMaterial = await crypto.subtle.importKey(
			'raw',
			passwordBuffer,
			{ name: 'PBKDF2' },
			false,
			['deriveBits', 'deriveKey']
		);

		// Derive key using PBKDF2
		return await crypto.subtle.deriveKey(
			{
				name: 'PBKDF2',
				salt: saltBuffer,
				iterations,
				hash: 'SHA-256'
			},
			keyMaterial,
			{ name: 'AES-GCM', length: 256 },
			false,
			['encrypt', 'decrypt']
		);
	}
}
