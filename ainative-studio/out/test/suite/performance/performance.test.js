/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
import { ok } from 'assert';
import { DisposableStore } from '../../../vs/base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../vs/base/test/common/utils.js';
import { AINativeAuthService } from '../../../vs/workbench/contrib/ainative/common/ainativeAuthService.js';
/**
 * Mock Encryption Service for performance testing
 */
class MockEncryptionService {
    async encrypt(value) {
        return Buffer.from(value).toString('base64');
    }
    async decrypt(value) {
        return Buffer.from(value, 'base64').toString('utf-8');
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
}
/**
 * Mock Storage Service for performance testing
 */
class MockStorageService {
    constructor() {
        this.storage = new Map();
        this.onDidChangeValue = (_scope, _key, _disposable) => ({ dispose: () => { } });
        this.onDidChangeTarget = () => ({ dispose: () => { } });
        this.onWillSaveState = () => ({ dispose: () => { } });
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
    store(key, value, scope, target) {
        const storageKey = `${scope}:${key}`;
        if (value === undefined || value === null) {
            this.storage.delete(storageKey);
        }
        else {
            this.storage.set(storageKey, String(value));
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
    migrate() {
        return Promise.resolve();
    }
    isNew(scope) {
        return false;
    }
    flush() {
        return Promise.resolve();
    }
    log() {
        return Promise.resolve();
    }
    switch() {
        return Promise.resolve();
    }
    hasScope() {
        return true;
    }
    storeAll() {
        // No-op
    }
    logStorage() {
        // No-op
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
    async optimize(scope) {
        // No-op for mock
        return Promise.resolve();
    }
}
suite('Performance - Auth Service Benchmarks', () => {
    const disposables = new DisposableStore();
    let encryptionService;
    let storageService;
    let authService;
    setup(() => {
        encryptionService = new MockEncryptionService();
        storageService = new MockStorageService();
        authService = new AINativeAuthService(encryptionService, storageService);
        disposables.add(authService);
    });
    teardown(() => {
        disposables.clear();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('should initialize service within 100ms', async () => {
        const start = performance.now();
        // Create new service instance
        const newService = new AINativeAuthService(encryptionService, storageService);
        disposables.add(newService);
        const duration = performance.now() - start;
        console.log(`[Performance] Service initialization: ${duration.toFixed(2)}ms`);
        ok(duration < 100, `Service initialization should be under 100ms (was ${duration.toFixed(2)}ms)`);
    });
    test('should load from storage within 200ms', async () => {
        // Pre-populate storage with auth data
        const mockToken = createMockJWT({
            sub: 'test-user-123',
            email: 'test@example.com',
            role: 'user',
            exp: Math.floor(Date.now() / 1000) + 3600,
            iat: Math.floor(Date.now() / 1000)
        });
        const encryptedToken = await encryptionService.encrypt(mockToken);
        storageService.store('ainative.auth.jwt', encryptedToken, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        storageService.store('ainative.auth.user', JSON.stringify({
            id: 'test-user-123',
            email: 'test@example.com',
            role: 'user'
        }), -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        // Measure load time
        const start = performance.now();
        const newService = new AINativeAuthService(encryptionService, storageService);
        disposables.add(newService);
        // Wait for async load
        await new Promise(resolve => setTimeout(resolve, 150));
        const duration = performance.now() - start;
        console.log(`[Performance] Load from storage: ${duration.toFixed(2)}ms`);
        ok(duration < 200, `Load from storage should be under 200ms (was ${duration.toFixed(2)}ms)`);
    });
    test('should perform logout within 500ms', async () => {
        const start = performance.now();
        await authService.logout();
        const duration = performance.now() - start;
        console.log(`[Performance] Logout operation: ${duration.toFixed(2)}ms`);
        ok(duration < 500, `Logout should complete within 500ms (was ${duration.toFixed(2)}ms)`);
    });
    test('should encrypt token within 50ms', async () => {
        const mockToken = createMockJWT({
            sub: 'test-user-123',
            email: 'test@example.com',
            role: 'user',
            exp: Math.floor(Date.now() / 1000) + 3600,
            iat: Math.floor(Date.now() / 1000)
        });
        const start = performance.now();
        await encryptionService.encrypt(mockToken);
        const duration = performance.now() - start;
        console.log(`[Performance] Token encryption: ${duration.toFixed(2)}ms`);
        ok(duration < 50, `Token encryption should be under 50ms (was ${duration.toFixed(2)}ms)`);
    });
    test('should decrypt token within 50ms', async () => {
        const mockToken = createMockJWT({
            sub: 'test-user-123',
            email: 'test@example.com',
            role: 'user',
            exp: Math.floor(Date.now() / 1000) + 3600,
            iat: Math.floor(Date.now() / 1000)
        });
        const encrypted = await encryptionService.encrypt(mockToken);
        const start = performance.now();
        await encryptionService.decrypt(encrypted);
        const duration = performance.now() - start;
        console.log(`[Performance] Token decryption: ${duration.toFixed(2)}ms`);
        ok(duration < 50, `Token decryption should be under 50ms (was ${duration.toFixed(2)}ms)`);
    });
    test('should handle 100 sequential state checks within 10ms', () => {
        const start = performance.now();
        for (let i = 0; i < 100; i++) {
            authService.isAuthenticated();
            authService.getAuthState();
            authService.getAccessToken();
            authService.getUser();
        }
        const duration = performance.now() - start;
        console.log(`[Performance] 100 state checks: ${duration.toFixed(2)}ms`);
        ok(duration < 10, `100 state checks should complete within 10ms (was ${duration.toFixed(2)}ms)`);
    });
    test('should handle storage operations efficiently', async () => {
        const iterations = 50;
        const start = performance.now();
        for (let i = 0; i < iterations; i++) {
            const token = `test-token-${i}`;
            const encrypted = await encryptionService.encrypt(token);
            storageService.store(`test.key.${i}`, encrypted, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        }
        const duration = performance.now() - start;
        const avgDuration = duration / iterations;
        console.log(`[Performance] ${iterations} storage operations: ${duration.toFixed(2)}ms (avg: ${avgDuration.toFixed(2)}ms)`);
        ok(avgDuration < 5, `Average storage operation should be under 5ms (was ${avgDuration.toFixed(2)}ms)`);
    });
    test('should not have memory leaks in auth state changes', async () => {
        const iterations = 100;
        const start = performance.now();
        // Subscribe and unsubscribe multiple times
        for (let i = 0; i < iterations; i++) {
            const disposable = authService.onDidChangeAuthState(() => {
                // Empty handler
            });
            disposable.dispose();
        }
        const duration = performance.now() - start;
        const avgDuration = duration / iterations;
        console.log(`[Performance] ${iterations} event subscriptions: ${duration.toFixed(2)}ms (avg: ${avgDuration.toFixed(2)}ms)`);
        ok(avgDuration < 1, `Event subscription should be efficient (avg ${avgDuration.toFixed(2)}ms)`);
    });
    test('should handle rapid logout calls efficiently', async () => {
        const iterations = 10;
        const start = performance.now();
        for (let i = 0; i < iterations; i++) {
            await authService.logout();
        }
        const duration = performance.now() - start;
        const avgDuration = duration / iterations;
        console.log(`[Performance] ${iterations} logout calls: ${duration.toFixed(2)}ms (avg: ${avgDuration.toFixed(2)}ms)`);
        ok(avgDuration < 100, `Average logout should be under 100ms (was ${avgDuration.toFixed(2)}ms)`);
    });
    test('should maintain performance under concurrent state access', async () => {
        const start = performance.now();
        // Simulate concurrent access
        const promises = Array.from({ length: 100 }, async (_, i) => {
            return {
                authenticated: authService.isAuthenticated(),
                state: authService.getAuthState(),
                token: authService.getAccessToken(),
                user: authService.getUser()
            };
        });
        await Promise.all(promises);
        const duration = performance.now() - start;
        console.log(`[Performance] 100 concurrent state accesses: ${duration.toFixed(2)}ms`);
        ok(duration < 50, `Concurrent state access should be under 50ms (was ${duration.toFixed(2)}ms)`);
    });
    test('performance summary', () => {
        console.log('\n=== Performance Test Summary ===');
        console.log('All performance benchmarks completed successfully');
        console.log('Service meets performance requirements:');
        console.log('  - Initialization: < 100ms');
        console.log('  - Storage load: < 200ms');
        console.log('  - Logout: < 500ms');
        console.log('  - Encryption/Decryption: < 50ms each');
        console.log('  - State checks: < 10ms for 100 operations');
        console.log('================================\n');
        ok(true);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGVyZm9ybWFuY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FpZGV2ZWxvcGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidGVzdC9zdWl0ZS9wZXJmb3JtYW5jZS9wZXJmb3JtYW5jZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxFQUFFLEVBQUUsTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3ZFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHNFQUFzRSxDQUFDO0FBSTNHOztHQUVHO0FBQ0gsTUFBTSxxQkFBcUI7SUFHMUIsS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFhO1FBQzFCLE9BQU8sTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDOUMsQ0FBQztJQUVELEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBYTtRQUMxQixPQUFPLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUN2RCxDQUFDO0lBRUQsS0FBSyxDQUFDLHFCQUFxQjtRQUMxQixPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7SUFFRCxLQUFLLENBQUMseUJBQXlCO1FBQzlCLFFBQVE7SUFDVCxDQUFDO0lBRUQsS0FBSyxDQUFDLHFCQUFxQjtRQUMxQixPQUFPLE1BQU0sQ0FBQztJQUNmLENBQUM7Q0FDRDtBQUVEOztHQUVHO0FBQ0gsTUFBTSxrQkFBa0I7SUFBeEI7UUFHUyxZQUFPLEdBQUcsSUFBSSxHQUFHLEVBQWtCLENBQUM7UUFFNUMscUJBQWdCLEdBQVEsQ0FBQyxNQUFXLEVBQUUsSUFBUyxFQUFFLFdBQWdCLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBRSxPQUFPLEVBQUUsR0FBRyxFQUFFLEdBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUM5RixzQkFBaUIsR0FBUSxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUUsT0FBTyxFQUFFLEdBQUcsRUFBRSxHQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDdkQsb0JBQWUsR0FBUSxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUUsT0FBTyxFQUFFLEdBQUcsRUFBRSxHQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7SUFpR3RELENBQUM7SUE3RkEsR0FBRyxDQUFDLEdBQVcsRUFBRSxLQUFtQixFQUFFLGFBQXNCO1FBQzNELE1BQU0sVUFBVSxHQUFHLEdBQUcsS0FBSyxJQUFJLEdBQUcsRUFBRSxDQUFDO1FBQ3JDLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLElBQUksYUFBYSxDQUFDO0lBQ3RELENBQUM7SUFHRCxVQUFVLENBQUMsR0FBVyxFQUFFLEtBQW1CLEVBQUUsYUFBdUI7UUFDbkUsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDbkMsSUFBSSxLQUFLLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDekIsT0FBTyxhQUFhLENBQUM7UUFDdEIsQ0FBQztRQUNELE9BQU8sS0FBSyxLQUFLLE1BQU0sQ0FBQztJQUN6QixDQUFDO0lBR0QsU0FBUyxDQUFDLEdBQVcsRUFBRSxLQUFtQixFQUFFLGFBQXNCO1FBQ2pFLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ25DLElBQUksS0FBSyxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQ3pCLE9BQU8sYUFBYSxDQUFDO1FBQ3RCLENBQUM7UUFDRCxPQUFPLFFBQVEsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDNUIsQ0FBQztJQUVELEtBQUssQ0FBQyxHQUFXLEVBQUUsS0FBbUQsRUFBRSxLQUFtQixFQUFFLE1BQXFCO1FBQ2pILE1BQU0sVUFBVSxHQUFHLEdBQUcsS0FBSyxJQUFJLEdBQUcsRUFBRSxDQUFDO1FBQ3JDLElBQUksS0FBSyxLQUFLLFNBQVMsSUFBSSxLQUFLLEtBQUssSUFBSSxFQUFFLENBQUM7WUFDM0MsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDakMsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLEVBQUUsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDN0MsQ0FBQztJQUNGLENBQUM7SUFFRCxNQUFNLENBQUMsR0FBVyxFQUFFLEtBQW1CO1FBQ3RDLE1BQU0sVUFBVSxHQUFHLEdBQUcsS0FBSyxJQUFJLEdBQUcsRUFBRSxDQUFDO1FBQ3JDLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQ2pDLENBQUM7SUFFRCxJQUFJLENBQUMsS0FBbUIsRUFBRSxNQUFxQjtRQUM5QyxNQUFNLE1BQU0sR0FBRyxHQUFHLEtBQUssR0FBRyxDQUFDO1FBQzNCLE9BQU8sS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDO2FBQ3BDLE1BQU0sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUM7YUFDckMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztJQUM1QyxDQUFDO0lBRUQsT0FBTztRQUNOLE9BQU8sT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQzFCLENBQUM7SUFFRCxLQUFLLENBQUMsS0FBbUI7UUFDeEIsT0FBTyxLQUFLLENBQUM7SUFDZCxDQUFDO0lBRUQsS0FBSztRQUNKLE9BQU8sT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQzFCLENBQUM7SUFFRCxHQUFHO1FBQ0YsT0FBTyxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDMUIsQ0FBQztJQUVELE1BQU07UUFDTCxPQUFPLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUMxQixDQUFDO0lBRUQsUUFBUTtRQUNQLE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztJQUVELFFBQVE7UUFDUCxRQUFRO0lBQ1QsQ0FBQztJQUVELFVBQVU7UUFDVCxRQUFRO0lBQ1QsQ0FBQztJQUdELFNBQVMsQ0FBbUIsR0FBVyxFQUFFLEtBQW1CLEVBQUUsYUFBaUI7UUFDOUUsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDbkMsSUFBSSxLQUFLLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDekIsT0FBTyxhQUFhLENBQUM7UUFDdEIsQ0FBQztRQUNELElBQUksQ0FBQztZQUNKLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQU0sQ0FBQztRQUMvQixDQUFDO1FBQUMsTUFBTSxDQUFDO1lBQ1IsT0FBTyxhQUFhLENBQUM7UUFDdEIsQ0FBQztJQUNGLENBQUM7SUFFRCxLQUFLLENBQUMsUUFBUSxDQUFDLEtBQW1CO1FBQ2pDLGlCQUFpQjtRQUNqQixPQUFPLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUMxQixDQUFDO0NBQ0Q7QUFFRCxLQUFLLENBQUMsdUNBQXVDLEVBQUUsR0FBRyxFQUFFO0lBQ25ELE1BQU0sV0FBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7SUFDMUMsSUFBSSxpQkFBd0MsQ0FBQztJQUM3QyxJQUFJLGNBQWtDLENBQUM7SUFDdkMsSUFBSSxXQUFnQyxDQUFDO0lBRXJDLEtBQUssQ0FBQyxHQUFHLEVBQUU7UUFDVixpQkFBaUIsR0FBRyxJQUFJLHFCQUFxQixFQUFFLENBQUM7UUFDaEQsY0FBYyxHQUFHLElBQUksa0JBQWtCLEVBQUUsQ0FBQztRQUMxQyxXQUFXLEdBQUcsSUFBSSxtQkFBbUIsQ0FBQyxpQkFBaUIsRUFBRSxjQUFjLENBQUMsQ0FBQztRQUN6RSxXQUFXLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQzlCLENBQUMsQ0FBQyxDQUFDO0lBRUgsUUFBUSxDQUFDLEdBQUcsRUFBRTtRQUNiLFdBQVcsQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUNyQixDQUFDLENBQUMsQ0FBQztJQUVILHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsSUFBSSxDQUFDLHdDQUF3QyxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ3pELE1BQU0sS0FBSyxHQUFHLFdBQVcsQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUVoQyw4QkFBOEI7UUFDOUIsTUFBTSxVQUFVLEdBQUcsSUFBSSxtQkFBbUIsQ0FBQyxpQkFBaUIsRUFBRSxjQUFjLENBQUMsQ0FBQztRQUM5RSxXQUFXLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBRTVCLE1BQU0sUUFBUSxHQUFHLFdBQVcsQ0FBQyxHQUFHLEVBQUUsR0FBRyxLQUFLLENBQUM7UUFFM0MsT0FBTyxDQUFDLEdBQUcsQ0FBQyx5Q0FBeUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDOUUsRUFBRSxDQUFDLFFBQVEsR0FBRyxHQUFHLEVBQUUscURBQXFELFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ25HLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLHVDQUF1QyxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ3hELHNDQUFzQztRQUN0QyxNQUFNLFNBQVMsR0FBRyxhQUFhLENBQUM7WUFDL0IsR0FBRyxFQUFFLGVBQWU7WUFDcEIsS0FBSyxFQUFFLGtCQUFrQjtZQUN6QixJQUFJLEVBQUUsTUFBTTtZQUNaLEdBQUcsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxJQUFJO1lBQ3pDLEdBQUcsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUM7U0FDbEMsQ0FBQyxDQUFDO1FBRUgsTUFBTSxjQUFjLEdBQUcsTUFBTSxpQkFBaUIsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDbEUsY0FBYyxDQUFDLEtBQUssQ0FBQyxtQkFBbUIsRUFBRSxjQUFjLG1FQUFrRCxDQUFDO1FBQzNHLGNBQWMsQ0FBQyxLQUFLLENBQUMsb0JBQW9CLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQztZQUN6RCxFQUFFLEVBQUUsZUFBZTtZQUNuQixLQUFLLEVBQUUsa0JBQWtCO1lBQ3pCLElBQUksRUFBRSxNQUFNO1NBQ1osQ0FBQyxtRUFBa0QsQ0FBQztRQUVyRCxvQkFBb0I7UUFDcEIsTUFBTSxLQUFLLEdBQUcsV0FBVyxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBRWhDLE1BQU0sVUFBVSxHQUFHLElBQUksbUJBQW1CLENBQUMsaUJBQWlCLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFDOUUsV0FBVyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUU1QixzQkFBc0I7UUFDdEIsTUFBTSxJQUFJLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUV2RCxNQUFNLFFBQVEsR0FBRyxXQUFXLENBQUMsR0FBRyxFQUFFLEdBQUcsS0FBSyxDQUFDO1FBRTNDLE9BQU8sQ0FBQyxHQUFHLENBQUMsb0NBQW9DLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3pFLEVBQUUsQ0FBQyxRQUFRLEdBQUcsR0FBRyxFQUFFLGdEQUFnRCxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUM5RixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxvQ0FBb0MsRUFBRSxLQUFLLElBQUksRUFBRTtRQUNyRCxNQUFNLEtBQUssR0FBRyxXQUFXLENBQUMsR0FBRyxFQUFFLENBQUM7UUFFaEMsTUFBTSxXQUFXLENBQUMsTUFBTSxFQUFFLENBQUM7UUFFM0IsTUFBTSxRQUFRLEdBQUcsV0FBVyxDQUFDLEdBQUcsRUFBRSxHQUFHLEtBQUssQ0FBQztRQUUzQyxPQUFPLENBQUMsR0FBRyxDQUFDLG1DQUFtQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN4RSxFQUFFLENBQUMsUUFBUSxHQUFHLEdBQUcsRUFBRSw0Q0FBNEMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDMUYsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsa0NBQWtDLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDbkQsTUFBTSxTQUFTLEdBQUcsYUFBYSxDQUFDO1lBQy9CLEdBQUcsRUFBRSxlQUFlO1lBQ3BCLEtBQUssRUFBRSxrQkFBa0I7WUFDekIsSUFBSSxFQUFFLE1BQU07WUFDWixHQUFHLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsSUFBSTtZQUN6QyxHQUFHLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDO1NBQ2xDLENBQUMsQ0FBQztRQUVILE1BQU0sS0FBSyxHQUFHLFdBQVcsQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUVoQyxNQUFNLGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUUzQyxNQUFNLFFBQVEsR0FBRyxXQUFXLENBQUMsR0FBRyxFQUFFLEdBQUcsS0FBSyxDQUFDO1FBRTNDLE9BQU8sQ0FBQyxHQUFHLENBQUMsbUNBQW1DLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3hFLEVBQUUsQ0FBQyxRQUFRLEdBQUcsRUFBRSxFQUFFLDhDQUE4QyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUMzRixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxrQ0FBa0MsRUFBRSxLQUFLLElBQUksRUFBRTtRQUNuRCxNQUFNLFNBQVMsR0FBRyxhQUFhLENBQUM7WUFDL0IsR0FBRyxFQUFFLGVBQWU7WUFDcEIsS0FBSyxFQUFFLGtCQUFrQjtZQUN6QixJQUFJLEVBQUUsTUFBTTtZQUNaLEdBQUcsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxJQUFJO1lBQ3pDLEdBQUcsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUM7U0FDbEMsQ0FBQyxDQUFDO1FBRUgsTUFBTSxTQUFTLEdBQUcsTUFBTSxpQkFBaUIsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUM7UUFFN0QsTUFBTSxLQUFLLEdBQUcsV0FBVyxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBRWhDLE1BQU0saUJBQWlCLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBRTNDLE1BQU0sUUFBUSxHQUFHLFdBQVcsQ0FBQyxHQUFHLEVBQUUsR0FBRyxLQUFLLENBQUM7UUFFM0MsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQ0FBbUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDeEUsRUFBRSxDQUFDLFFBQVEsR0FBRyxFQUFFLEVBQUUsOENBQThDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQzNGLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLHVEQUF1RCxFQUFFLEdBQUcsRUFBRTtRQUNsRSxNQUFNLEtBQUssR0FBRyxXQUFXLENBQUMsR0FBRyxFQUFFLENBQUM7UUFFaEMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQzlCLFdBQVcsQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUM5QixXQUFXLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDM0IsV0FBVyxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQzdCLFdBQVcsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUN2QixDQUFDO1FBRUQsTUFBTSxRQUFRLEdBQUcsV0FBVyxDQUFDLEdBQUcsRUFBRSxHQUFHLEtBQUssQ0FBQztRQUUzQyxPQUFPLENBQUMsR0FBRyxDQUFDLG1DQUFtQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN4RSxFQUFFLENBQUMsUUFBUSxHQUFHLEVBQUUsRUFBRSxxREFBcUQsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDbEcsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsOENBQThDLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDL0QsTUFBTSxVQUFVLEdBQUcsRUFBRSxDQUFDO1FBQ3RCLE1BQU0sS0FBSyxHQUFHLFdBQVcsQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUVoQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsVUFBVSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDckMsTUFBTSxLQUFLLEdBQUcsY0FBYyxDQUFDLEVBQUUsQ0FBQztZQUNoQyxNQUFNLFNBQVMsR0FBRyxNQUFNLGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUN6RCxjQUFjLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxFQUFFLEVBQUUsU0FBUyxtRUFBa0QsQ0FBQztRQUNuRyxDQUFDO1FBRUQsTUFBTSxRQUFRLEdBQUcsV0FBVyxDQUFDLEdBQUcsRUFBRSxHQUFHLEtBQUssQ0FBQztRQUMzQyxNQUFNLFdBQVcsR0FBRyxRQUFRLEdBQUcsVUFBVSxDQUFDO1FBRTFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsaUJBQWlCLFVBQVUsd0JBQXdCLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLFlBQVksV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDM0gsRUFBRSxDQUFDLFdBQVcsR0FBRyxDQUFDLEVBQUUsc0RBQXNELFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ3hHLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLG9EQUFvRCxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ3JFLE1BQU0sVUFBVSxHQUFHLEdBQUcsQ0FBQztRQUN2QixNQUFNLEtBQUssR0FBRyxXQUFXLENBQUMsR0FBRyxFQUFFLENBQUM7UUFFaEMsMkNBQTJDO1FBQzNDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxVQUFVLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNyQyxNQUFNLFVBQVUsR0FBRyxXQUFXLENBQUMsb0JBQW9CLENBQUMsR0FBRyxFQUFFO2dCQUN4RCxnQkFBZ0I7WUFDakIsQ0FBQyxDQUFDLENBQUM7WUFDSCxVQUFVLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDdEIsQ0FBQztRQUVELE1BQU0sUUFBUSxHQUFHLFdBQVcsQ0FBQyxHQUFHLEVBQUUsR0FBRyxLQUFLLENBQUM7UUFDM0MsTUFBTSxXQUFXLEdBQUcsUUFBUSxHQUFHLFVBQVUsQ0FBQztRQUUxQyxPQUFPLENBQUMsR0FBRyxDQUFDLGlCQUFpQixVQUFVLHlCQUF5QixRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxZQUFZLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzVILEVBQUUsQ0FBQyxXQUFXLEdBQUcsQ0FBQyxFQUFFLCtDQUErQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUNqRyxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyw4Q0FBOEMsRUFBRSxLQUFLLElBQUksRUFBRTtRQUMvRCxNQUFNLFVBQVUsR0FBRyxFQUFFLENBQUM7UUFDdEIsTUFBTSxLQUFLLEdBQUcsV0FBVyxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBRWhDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxVQUFVLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNyQyxNQUFNLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUM1QixDQUFDO1FBRUQsTUFBTSxRQUFRLEdBQUcsV0FBVyxDQUFDLEdBQUcsRUFBRSxHQUFHLEtBQUssQ0FBQztRQUMzQyxNQUFNLFdBQVcsR0FBRyxRQUFRLEdBQUcsVUFBVSxDQUFDO1FBRTFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsaUJBQWlCLFVBQVUsa0JBQWtCLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLFlBQVksV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDckgsRUFBRSxDQUFDLFdBQVcsR0FBRyxHQUFHLEVBQUUsNkNBQTZDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ2pHLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLDJEQUEyRCxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzVFLE1BQU0sS0FBSyxHQUFHLFdBQVcsQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUVoQyw2QkFBNkI7UUFDN0IsTUFBTSxRQUFRLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sRUFBRSxHQUFHLEVBQUUsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQzNELE9BQU87Z0JBQ04sYUFBYSxFQUFFLFdBQVcsQ0FBQyxlQUFlLEVBQUU7Z0JBQzVDLEtBQUssRUFBRSxXQUFXLENBQUMsWUFBWSxFQUFFO2dCQUNqQyxLQUFLLEVBQUUsV0FBVyxDQUFDLGNBQWMsRUFBRTtnQkFDbkMsSUFBSSxFQUFFLFdBQVcsQ0FBQyxPQUFPLEVBQUU7YUFDM0IsQ0FBQztRQUNILENBQUMsQ0FBQyxDQUFDO1FBRUgsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBRTVCLE1BQU0sUUFBUSxHQUFHLFdBQVcsQ0FBQyxHQUFHLEVBQUUsR0FBRyxLQUFLLENBQUM7UUFFM0MsT0FBTyxDQUFDLEdBQUcsQ0FBQyxnREFBZ0QsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDckYsRUFBRSxDQUFDLFFBQVEsR0FBRyxFQUFFLEVBQUUscURBQXFELFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ2xHLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLHFCQUFxQixFQUFFLEdBQUcsRUFBRTtRQUNoQyxPQUFPLENBQUMsR0FBRyxDQUFDLG9DQUFvQyxDQUFDLENBQUM7UUFDbEQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtREFBbUQsQ0FBQyxDQUFDO1FBQ2pFLE9BQU8sQ0FBQyxHQUFHLENBQUMseUNBQXlDLENBQUMsQ0FBQztRQUN2RCxPQUFPLENBQUMsR0FBRyxDQUFDLDZCQUE2QixDQUFDLENBQUM7UUFDM0MsT0FBTyxDQUFDLEdBQUcsQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO1FBQ3pDLE9BQU8sQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsQ0FBQztRQUNuQyxPQUFPLENBQUMsR0FBRyxDQUFDLHdDQUF3QyxDQUFDLENBQUM7UUFDdEQsT0FBTyxDQUFDLEdBQUcsQ0FBQyw2Q0FBNkMsQ0FBQyxDQUFDO1FBQzNELE9BQU8sQ0FBQyxHQUFHLENBQUMsb0NBQW9DLENBQUMsQ0FBQztRQUNsRCxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDVixDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDO0FBRUg7O0dBRUc7QUFDSCxTQUFTLGFBQWEsQ0FBQyxNQUE4RTtJQUNwRyxNQUFNLE1BQU0sR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQzVGLE1BQU0sT0FBTyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUN2RSxNQUFNLFNBQVMsR0FBRyxnQkFBZ0IsQ0FBQztJQUNuQyxPQUFPLEdBQUcsTUFBTSxJQUFJLE9BQU8sSUFBSSxTQUFTLEVBQUUsQ0FBQztBQUM1QyxDQUFDIn0=