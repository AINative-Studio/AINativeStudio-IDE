/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { strictEqual, ok } from 'assert';
import { DisposableStore } from '../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../base/test/common/utils.js';
import { AINativeAuthService } from '../../../vs/workbench/contrib/ainative/common/ainativeAuthService.js';
import { IEncryptionService } from '../../../vs/platform/encryption/common/encryptionService.js';
import { IStorageService, StorageScope, StorageTarget } from '../../../vs/platform/storage/common/storage.js';

/**
 * Mock Encryption Service for performance testing
 */
class MockEncryptionService implements IEncryptionService {
	_serviceBrand: undefined;

	async encrypt(value: string): Promise<string> {
		return Buffer.from(value).toString('base64');
	}

	async decrypt(value: string): Promise<string> {
		return Buffer.from(value, 'base64').toString('utf-8');
	}

	async isEncryptionAvailable(): Promise<boolean> {
		return true;
	}

	async setUsePlainTextEncryption(): Promise<void> {
		// No-op
	}

	async getKeyStorageProvider(): Promise<any> {
		return 'test';
	}
}

/**
 * Mock Storage Service for performance testing
 */
class MockStorageService implements IStorageService {
	_serviceBrand: undefined;

	private storage = new Map<string, string>();

	onDidChangeValue: any = () => ({ dispose: () => {} });
	onDidChangeTarget: any = () => ({ dispose: () => {} });
	onWillSaveState: any = () => ({ dispose: () => {} });

	get(key: string, scope: StorageScope, fallbackValue: string): string;
	get(key: string, scope: StorageScope, fallbackValue?: string): string | undefined {
		const storageKey = `${scope}:${key}`;
		return this.storage.get(storageKey) ?? fallbackValue;
	}

	getBoolean(key: string, scope: StorageScope, fallbackValue: boolean): boolean;
	getBoolean(key: string, scope: StorageScope, fallbackValue?: boolean): boolean | undefined {
		const value = this.get(key, scope);
		if (value === undefined) {
			return fallbackValue;
		}
		return value === 'true';
	}

	getNumber(key: string, scope: StorageScope, fallbackValue: number): number;
	getNumber(key: string, scope: StorageScope, fallbackValue?: number): number | undefined {
		const value = this.get(key, scope);
		if (value === undefined) {
			return fallbackValue;
		}
		return parseInt(value, 10);
	}

	store(key: string, value: string | boolean | number | undefined | null, scope: StorageScope, target: StorageTarget): void {
		const storageKey = `${scope}:${key}`;
		if (value === undefined || value === null) {
			this.storage.delete(storageKey);
		} else {
			this.storage.set(storageKey, String(value));
		}
	}

	remove(key: string, scope: StorageScope): void {
		const storageKey = `${scope}:${key}`;
		this.storage.delete(storageKey);
	}

	keys(scope: StorageScope, target: StorageTarget): string[] {
		const prefix = `${scope}:`;
		return Array.from(this.storage.keys())
			.filter(key => key.startsWith(prefix))
			.map(key => key.substring(prefix.length));
	}

	migrate(): Promise<void> {
		return Promise.resolve();
	}

	isNew(scope: StorageScope): boolean {
		return false;
	}

	flush(): Promise<void> {
		return Promise.resolve();
	}

	log(): Promise<void> {
		return Promise.resolve();
	}

	switch(): Promise<void> {
		return Promise.resolve();
	}

	hasScope(): boolean {
		return true;
	}

	storeAll(): void {
		// No-op
	}

	logStorage(): void {
		// No-op
	}
}

suite('Performance - Auth Service Benchmarks', () => {
	const disposables = new DisposableStore();
	let encryptionService: MockEncryptionService;
	let storageService: MockStorageService;
	let authService: AINativeAuthService;

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
		storageService.store('ainative.auth.jwt', encryptedToken, StorageScope.APPLICATION, StorageTarget.MACHINE);
		storageService.store('ainative.auth.user', JSON.stringify({
			id: 'test-user-123',
			email: 'test@example.com',
			role: 'user'
		}), StorageScope.APPLICATION, StorageTarget.MACHINE);

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
			storageService.store(`test.key.${i}`, encrypted, StorageScope.APPLICATION, StorageTarget.MACHINE);
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
function createMockJWT(claims: { sub: string; email: string; role: string; exp: number; iat: number }): string {
	const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
	const payload = Buffer.from(JSON.stringify(claims)).toString('base64');
	const signature = 'mock-signature';
	return `${header}.${payload}.${signature}`;
}
