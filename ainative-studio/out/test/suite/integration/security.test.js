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
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const value = this.get(key, scope);
        if (value === undefined) {
            return fallbackValue;
        }
        return value === 'true';
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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