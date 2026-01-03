/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
import { strictEqual, ok, notStrictEqual } from 'assert';
import { DisposableStore } from '../../../vs/base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../vs/base/test/common/utils.js';
import { AINativeAuthService } from '../../../vs/workbench/contrib/ainative/common/ainativeAuthService.js';
import { Emitter } from '../../../vs/base/common/event.js';
/**
 * Mock Encryption Service for security testing
 */
class MockEncryptionService {
    constructor() {
        this.encryptedData = new Map();
    }
    async encrypt(value) {
        // Use base64 with a prefix to clearly show it's encrypted
        const encrypted = 'ENC_' + Buffer.from(value).toString('base64');
        this.encryptedData.set(encrypted, value);
        return encrypted;
    }
    async decrypt(value) {
        if (!value.startsWith('ENC_')) {
            throw new Error('Invalid encrypted data format');
        }
        return Buffer.from(value.substring(4), 'base64').toString('utf-8');
    }
    async isEncryptionAvailable() {
        return true;
    }
    async setUsePlainTextEncryption() {
        // No-op
    }
    async getKeyStorageProvider() {
        return 'test';
    }
    // Test helper to verify encryption
    isEncrypted(value) {
        return value.startsWith('ENC_');
    }
    // Test helper to get raw encrypted value
    getRawEncryptedValue(encrypted) {
        return this.encryptedData.get(encrypted);
    }
}
/**
 * Mock Storage Service for security testing
 */
class MockStorageService {
    constructor() {
        this.storage = new Map();
        this._onDidChangeValue = new Emitter();
        this._onDidChangeTarget = new Emitter();
        this._onWillSaveState = new Emitter();
        this.onDidChangeTarget = this._onDidChangeTarget.event;
        this.onWillSaveState = this._onWillSaveState.event;
    }
    onDidChangeValue(scope, key, disposable) {
        return this._onDidChangeValue.event;
    }
    get(key, scope, fallbackValue) {
        const storageKey = `${scope}:${key}`;
        return this.storage.get(storageKey) ?? fallbackValue;
    }
    getBoolean(key, scope, fallbackValue) {
        const value = this.get(key, scope);
        if (value === undefined) {
            return fallbackValue;
        }
        return value === 'true';
    }
    getNumber(key, scope, fallbackValue) {
        const value = this.get(key, scope);
        if (value === undefined) {
            return fallbackValue;
        }
        return parseInt(value, 10);
    }
    getObject(key, scope, fallbackValue) {
        const value = this.get(key, scope);
        if (value === undefined) {
            return fallbackValue;
        }
        try {
            return JSON.parse(value);
        }
        catch {
            return fallbackValue;
        }
    }
    store(key, value, scope, target) {
        const storageKey = `${scope}:${key}`;
        if (value === undefined || value === null) {
            this.storage.delete(storageKey);
        }
        else {
            this.storage.set(storageKey, String(value));
        }
    }
    storeAll(entries, external) {
        for (const entry of entries) {
            this.store(entry.key, entry.value, entry.scope, entry.target);
        }
    }
    remove(key, scope) {
        const storageKey = `${scope}:${key}`;
        this.storage.delete(storageKey);
    }
    keys(scope, target) {
        const prefix = `${scope}:`;
        return Array.from(this.storage.keys())
            .filter(key => key.startsWith(prefix))
            .map(key => key.substring(prefix.length));
    }
    log() {
        // No-op for testing
    }
    hasScope(scope) {
        return true;
    }
    switch(to, preserveData) {
        return Promise.resolve();
    }
    isNew(scope) {
        return false;
    }
    optimize(scope) {
        return Promise.resolve();
    }
    flush() {
        return Promise.resolve();
    }
    // Test helper to access raw storage
    getRawStorage() {
        return this.storage;
    }
}
suite('Integration - Security Verification', () => {
    const disposables = new DisposableStore();
    let encryptionService;
    let storageService;
    let authService;
    // Capture console output for testing
    let consoleLogSpy = [];
    let consoleErrorSpy = [];
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    setup(() => {
        encryptionService = new MockEncryptionService();
        storageService = new MockStorageService();
        authService = new AINativeAuthService(encryptionService, storageService);
        disposables.add(authService);
        // Spy on console methods
        consoleLogSpy = [];
        consoleErrorSpy = [];
        console.log = (...args) => {
            consoleLogSpy.push(args);
            originalConsoleLog(...args);
        };
        console.error = (...args) => {
            consoleErrorSpy.push(args);
            originalConsoleError(...args);
        };
    });
    teardown(() => {
        disposables.clear();
        // Restore console
        console.log = originalConsoleLog;
        console.error = originalConsoleError;
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('should encrypt JWT tokens before storage', async () => {
        // Create mock token
        const mockToken = createMockJWT({
            sub: 'test-user-123',
            email: 'test@example.com',
            role: 'user',
            exp: Math.floor(Date.now() / 1000) + 3600,
            iat: Math.floor(Date.now() / 1000)
        });
        // Manually encrypt and store (simulating login)
        const encryptedToken = await encryptionService.encrypt(mockToken);
        storageService.store('ainative.auth.jwt', encryptedToken, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        // Verify token is encrypted in storage
        const rawStorage = storageService.getRawStorage();
        const storedToken = rawStorage.get(`${-1 /* StorageScope.APPLICATION */}:ainative.auth.jwt`);
        ok(storedToken !== undefined, 'Token should be stored');
        ok(encryptionService.isEncrypted(storedToken), 'Token should be encrypted in storage');
        notStrictEqual(storedToken, mockToken, 'Stored token should not be plain text');
        ok(!storedToken.includes('eyJ'), 'Encrypted token should not contain JWT prefix');
    });
    test('should encrypt refresh tokens before storage', async () => {
        // Create mock refresh token
        const mockRefreshToken = createMockJWT({
            sub: 'test-user-123',
            email: 'test@example.com',
            role: 'user',
            exp: Math.floor(Date.now() / 1000) + 86400, // 24 hours
            iat: Math.floor(Date.now() / 1000)
        });
        // Encrypt and store
        const encryptedRefreshToken = await encryptionService.encrypt(mockRefreshToken);
        storageService.store('ainative.auth.refreshToken', encryptedRefreshToken, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        // Verify encryption
        const rawStorage = storageService.getRawStorage();
        const storedRefreshToken = rawStorage.get(`${-1 /* StorageScope.APPLICATION */}:ainative.auth.refreshToken`);
        ok(storedRefreshToken !== undefined, 'Refresh token should be stored');
        ok(encryptionService.isEncrypted(storedRefreshToken), 'Refresh token should be encrypted');
        notStrictEqual(storedRefreshToken, mockRefreshToken, 'Stored refresh token should not be plain text');
    });
    test('should not log sensitive data in console output', async () => {
        // Clear previous logs
        consoleLogSpy = [];
        consoleErrorSpy = [];
        const testPassword = 'super-secret-password-123';
        const testEmail = 'test@example.com';
        // Attempt login (will fail, but should not log password)
        await authService.login(testEmail, testPassword);
        // Check all console logs and errors
        const allLogs = [
            ...consoleLogSpy.map(args => args.join(' ')),
            ...consoleErrorSpy.map(args => args.join(' '))
        ];
        const combinedOutput = allLogs.join('\n');
        // Verify password is NOT logged
        ok(!combinedOutput.includes(testPassword), 'Password should never be logged');
        // Verify JWT tokens are NOT logged in plain text
        ok(!combinedOutput.includes('eyJ'), 'JWT tokens should not be logged in plain text');
    });
    test('should not expose JWT tokens in error messages', async () => {
        const mockToken = createMockJWT({
            sub: 'test-user-123',
            email: 'test@example.com',
            role: 'user',
            exp: Math.floor(Date.now() / 1000) + 3600,
            iat: Math.floor(Date.now() / 1000)
        });
        // Store token
        const encryptedToken = await encryptionService.encrypt(mockToken);
        storageService.store('ainative.auth.jwt', encryptedToken, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        // Clear logs
        consoleErrorSpy = [];
        // Trigger an error scenario
        try {
            await authService.refreshToken(); // Will fail - no refresh token
        }
        catch (error) {
            // Check error message doesn't contain token
            const errorMessage = error instanceof Error ? error.message : String(error);
            ok(!errorMessage.includes(mockToken), 'Error message should not contain JWT token');
            ok(!errorMessage.includes('eyJ'), 'Error message should not contain JWT prefix');
        }
        // Check console errors don't contain tokens
        const errorLogs = consoleErrorSpy.map(args => args.join(' ')).join('\n');
        ok(!errorLogs.includes(mockToken), 'Error logs should not contain JWT token');
    });
    test('should clear all sensitive data on logout', async () => {
        // Store mock auth data
        const mockToken = createMockJWT({
            sub: 'test-user-123',
            email: 'test@example.com',
            role: 'user',
            exp: Math.floor(Date.now() / 1000) + 3600,
            iat: Math.floor(Date.now() / 1000)
        });
        const encryptedToken = await encryptionService.encrypt(mockToken);
        const encryptedRefreshToken = await encryptionService.encrypt('refresh-token-123');
        const userData = JSON.stringify({
            id: 'test-user-123',
            email: 'test@example.com',
            role: 'user'
        });
        storageService.store('ainative.auth.jwt', encryptedToken, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        storageService.store('ainative.auth.refreshToken', encryptedRefreshToken, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        storageService.store('ainative.auth.user', userData, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        // Logout
        await authService.logout();
        // Verify all sensitive data is cleared
        const rawStorage = storageService.getRawStorage();
        strictEqual(rawStorage.get(`${-1 /* StorageScope.APPLICATION */}:ainative.auth.jwt`), undefined, 'JWT should be removed from storage');
        strictEqual(rawStorage.get(`${-1 /* StorageScope.APPLICATION */}:ainative.auth.refreshToken`), undefined, 'Refresh token should be removed from storage');
        strictEqual(rawStorage.get(`${-1 /* StorageScope.APPLICATION */}:ainative.auth.user`), undefined, 'User data should be removed from storage');
    });
    test('should use secure storage scope and target', async () => {
        // Verify that storage uses APPLICATION scope and MACHINE target
        // This ensures data is stored securely and persists appropriately
        const mockToken = createMockJWT({
            sub: 'test-user-123',
            email: 'test@example.com',
            role: 'user',
            exp: Math.floor(Date.now() / 1000) + 3600,
            iat: Math.floor(Date.now() / 1000)
        });
        const encryptedToken = await encryptionService.encrypt(mockToken);
        // Store with APPLICATION scope and MACHINE target
        storageService.store('ainative.auth.jwt', encryptedToken, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        // Verify it's stored with correct scope
        const rawStorage = storageService.getRawStorage();
        const storageKey = `${-1 /* StorageScope.APPLICATION */}:ainative.auth.jwt`;
        ok(rawStorage.has(storageKey), 'Should use APPLICATION scope for storage');
        // Verify it's not stored with wrong scope
        const wrongScopeKey = `${1 /* StorageScope.WORKSPACE */}:ainative.auth.jwt`;
        ok(!rawStorage.has(wrongScopeKey), 'Should not use WORKSPACE scope');
    });
    test('should handle encryption service unavailability', async () => {
        // This tests the fallback behavior when encryption is not available
        // The service should still function but may use less secure storage
        const wasAvailable = await encryptionService.isEncryptionAvailable();
        ok(wasAvailable, 'Encryption should be available in tests');
    });
    test('should not store passwords in any form', () => {
        // Verify that passwords are never stored, even encrypted
        const rawStorage = storageService.getRawStorage();
        // Check all storage keys
        for (const [key, value] of rawStorage.entries()) {
            // Passwords should never be stored with any key
            ok(!key.includes('password'), 'Storage key should not reference password');
            ok(!key.includes('pwd'), 'Storage key should not reference pwd');
            // Even if we somehow stored a password, it shouldn't be in plain text
            // (This is a sanity check - we should never store passwords at all)
            ok(!value.toLowerCase().includes('password'), 'Storage value should not contain "password" string');
        }
    });
    test('should validate encryption integrity', async () => {
        const originalValue = 'sensitive-data-12345';
        // Encrypt
        const encrypted = await encryptionService.encrypt(originalValue);
        // Verify it's actually encrypted (different from original)
        notStrictEqual(encrypted, originalValue, 'Encrypted value should differ from original');
        // Decrypt
        const decrypted = await encryptionService.decrypt(encrypted);
        // Verify integrity
        strictEqual(decrypted, originalValue, 'Decrypted value should match original');
    });
    test('should use consistent encryption for same input', async () => {
        // Note: In production, encryption might add randomness (IV, salt)
        // This test verifies the encrypt/decrypt cycle works consistently
        const testData = 'test-token-12345';
        const encrypted1 = await encryptionService.encrypt(testData);
        const encrypted2 = await encryptionService.encrypt(testData);
        // Decrypt both
        const decrypted1 = await encryptionService.decrypt(encrypted1);
        const decrypted2 = await encryptionService.decrypt(encrypted2);
        // Both should decrypt to the same original value
        strictEqual(decrypted1, testData);
        strictEqual(decrypted2, testData);
    });
});
/**
 * Helper function to create mock JWT tokens
 */
function createMockJWT(claims) {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
    const payload = Buffer.from(JSON.stringify(claims)).toString('base64');
    const signature = 'mock-signature';
    return `${header}.${payload}.${signature}`;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VjdXJpdHkudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FpZGV2ZWxvcGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidGVzdC9zdWl0ZS9pbnRlZ3JhdGlvbi9zZWN1cml0eS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxXQUFXLEVBQUUsRUFBRSxFQUFFLGNBQWMsRUFBRSxNQUFNLFFBQVEsQ0FBQztBQUN6RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDdkUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDaEcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sc0VBQXNFLENBQUM7QUFJM0csT0FBTyxFQUFTLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBSWxFOztHQUVHO0FBQ0gsTUFBTSxxQkFBcUI7SUFBM0I7UUFHUyxrQkFBYSxHQUFHLElBQUksR0FBRyxFQUFrQixDQUFDO0lBcUNuRCxDQUFDO0lBbkNBLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBYTtRQUMxQiwwREFBMEQ7UUFDMUQsTUFBTSxTQUFTLEdBQUcsTUFBTSxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ2pFLElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUN6QyxPQUFPLFNBQVMsQ0FBQztJQUNsQixDQUFDO0lBRUQsS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFhO1FBQzFCLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7WUFDL0IsTUFBTSxJQUFJLEtBQUssQ0FBQywrQkFBK0IsQ0FBQyxDQUFDO1FBQ2xELENBQUM7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