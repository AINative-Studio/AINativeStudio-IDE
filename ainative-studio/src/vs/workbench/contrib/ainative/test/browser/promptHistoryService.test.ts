/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { strictEqual, ok } from 'assert';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { IStorageService, StorageScope, StorageTarget } from '../../../../../platform/storage/common/storage.js';
import { IPromptHistoryService, PromptEntry } from '../../browser/promptHistoryService.js';
import { PROMPT_HISTORY_STORAGE_KEY } from '../../common/storageKeys.js';

/**
 * Mock storage service for testing
 */
class MockStorageService implements IStorageService {
	_serviceBrand: undefined;

	private storage = new Map<string, string>();

	onDidChangeValue: any = () => ({ dispose: () => {} });
	onDidChangeTarget: any = () => ({ dispose: () => {} });
	onWillSaveState: any = () => ({ dispose: () => {} });

	get(key: string, scope: StorageScope): string | undefined;
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
			.filter(k => k.startsWith(prefix))
			.map(k => k.substring(prefix.length));
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

	// Test helper
	clear(): void {
		this.storage.clear();
	}
}

suite('PromptHistoryService', () => {
	const disposables = new DisposableStore();
	let service: IPromptHistoryService;
	let mockStorageService: MockStorageService;

	setup(async () => {
		mockStorageService = new MockStorageService();
		// We need to use dynamic import to get the class constructor
		const { PromptHistoryService } = await import('../../browser/promptHistoryService.js') as any;
		service = disposables.add(new PromptHistoryService(mockStorageService));
	});

	teardown(() => {
		disposables.clear();
	});

	ensureNoDisposablesAreLeakedInTestSuite();

	suite('addPrompt', () => {
		test('should add a prompt with metadata', async () => {
			await service.addPrompt('Test prompt', {
				threadId: 'thread-123',
				modelName: 'claude-3-5-sonnet',
				providerName: 'anthropic'
			});

			const history = await service.getHistory();
			strictEqual(history.length, 1);
			strictEqual(history[0].content, 'Test prompt');
			strictEqual(history[0].threadId, 'thread-123');
			strictEqual(history[0].modelName, 'claude-3-5-sonnet');
			strictEqual(history[0].providerName, 'anthropic');
			ok(history[0].id, 'Should have generated an ID');
			ok(history[0].timestamp > 0, 'Should have a timestamp');
		});

		test('should trim whitespace from prompts', async () => {
			await service.addPrompt('  Test prompt  ', {});

			const history = await service.getHistory();
			strictEqual(history[0].content, 'Test prompt');
		});

		test('should skip empty prompts', async () => {
			await service.addPrompt('', {});
			await service.addPrompt('   ', {});

			const history = await service.getHistory();
			strictEqual(history.length, 0);
		});

		test('should add prompts in reverse chronological order', async () => {
			await service.addPrompt('First prompt', {});
			await service.addPrompt('Second prompt', {});
			await service.addPrompt('Third prompt', {});

			const history = await service.getHistory();
			strictEqual(history.length, 3);
			strictEqual(history[0].content, 'Third prompt');
			strictEqual(history[1].content, 'Second prompt');
			strictEqual(history[2].content, 'First prompt');
		});

		test('should persist prompts to storage', async () => {
			await service.addPrompt('Test prompt', { threadId: 'thread-123' });

			const stored = mockStorageService.get(PROMPT_HISTORY_STORAGE_KEY, StorageScope.APPLICATION);
			ok(stored, 'Should have stored data');

			const parsed = JSON.parse(stored!);
			ok(Array.isArray(parsed), 'Stored data should be an array');
			strictEqual(parsed.length, 1);
			strictEqual(parsed[0].content, 'Test prompt');
		});

		test('should fire onDidChangeHistory event', async () => {
			let eventFired = false;
			disposables.add(service.onDidChangeHistory(() => {
				eventFired = true;
			}));

			await service.addPrompt('Test prompt', {});
			ok(eventFired, 'Should have fired change event');
		});
	});

	suite('getHistory', () => {
		test('should return all prompts when no limit specified', async () => {
			await service.addPrompt('Prompt 1', {});
			await service.addPrompt('Prompt 2', {});
			await service.addPrompt('Prompt 3', {});

			const history = await service.getHistory();
			strictEqual(history.length, 3);
		});

		test('should return limited number of prompts', async () => {
			await service.addPrompt('Prompt 1', {});
			await service.addPrompt('Prompt 2', {});
			await service.addPrompt('Prompt 3', {});
			await service.addPrompt('Prompt 4', {});

			const history = await service.getHistory(2);
			strictEqual(history.length, 2);
			strictEqual(history[0].content, 'Prompt 4');
			strictEqual(history[1].content, 'Prompt 3');
		});

		test('should return empty array when no prompts exist', async () => {
			const history = await service.getHistory();
			strictEqual(history.length, 0);
		});

		test('should return copy of history array', async () => {
			await service.addPrompt('Test prompt', {});

			const history1 = await service.getHistory();
			const history2 = await service.getHistory();

			ok(history1 !== history2, 'Should return different array instances');
		});
	});

	suite('searchHistory', () => {
		setup(async () => {
			await service.addPrompt('How to implement React hooks', { modelName: 'gpt-4' });
			await service.addPrompt('Explain TypeScript interfaces', { modelName: 'claude-3' });
			await service.addPrompt('React component best practices', { modelName: 'gpt-4' });
			await service.addPrompt('Python async functions', { modelName: 'claude-3' });
		});

		test('should find prompts by exact match', async () => {
			const results = await service.searchHistory('TypeScript');
			strictEqual(results.length, 1);
			strictEqual(results[0].content, 'Explain TypeScript interfaces');
		});

		test('should be case insensitive', async () => {
			const results = await service.searchHistory('REACT');
			strictEqual(results.length, 2);
		});

		test('should find partial matches', async () => {
			const results = await service.searchHistory('hook');
			strictEqual(results.length, 1);
			strictEqual(results[0].content, 'How to implement React hooks');
		});

		test('should return empty array for no matches', async () => {
			const results = await service.searchHistory('Rust programming');
			strictEqual(results.length, 0);
		});

		test('should return empty array for empty query', async () => {
			const results = await service.searchHistory('');
			strictEqual(results.length, 0);
		});

		test('should trim query whitespace', async () => {
			const results = await service.searchHistory('  Python  ');
			strictEqual(results.length, 1);
			strictEqual(results[0].content, 'Python async functions');
		});
	});

	suite('clearHistory', () => {
		test('should clear all prompts', async () => {
			await service.addPrompt('Prompt 1', {});
			await service.addPrompt('Prompt 2', {});
			await service.addPrompt('Prompt 3', {});

			await service.clearHistory();

			const history = await service.getHistory();
			strictEqual(history.length, 0);
		});

		test('should clear storage', async () => {
			await service.addPrompt('Test prompt', {});
			await service.clearHistory();

			const stored = mockStorageService.get(PROMPT_HISTORY_STORAGE_KEY, StorageScope.APPLICATION);
			ok(stored, 'Storage key should exist');
			const parsed = JSON.parse(stored!);
			strictEqual(parsed.length, 0);
		});

		test('should fire onDidChangeHistory event', async () => {
			let eventFired = false;
			disposables.add(service.onDidChangeHistory(() => {
				eventFired = true;
			}));

			await service.addPrompt('Test prompt', {});
			eventFired = false; // Reset from addPrompt event

			await service.clearHistory();
			ok(eventFired, 'Should have fired change event');
		});
	});

	suite('persistence', () => {
		test('should load history from storage on initialization', async () => {
			const testData: PromptEntry[] = [
				{
					id: 'test-1',
					content: 'Stored prompt 1',
					timestamp: Date.now(),
					threadId: 'thread-1',
					modelName: 'gpt-4',
					providerName: 'openai'
				},
				{
					id: 'test-2',
					content: 'Stored prompt 2',
					timestamp: Date.now(),
					modelName: 'claude-3'
				}
			];

			mockStorageService.store(
				PROMPT_HISTORY_STORAGE_KEY,
				JSON.stringify(testData),
				StorageScope.APPLICATION,
				StorageTarget.USER
			);

			// Create new service instance to test loading
			const { PromptHistoryService } = await import('../../browser/promptHistoryService.js') as any;
			const newService = new PromptHistoryService(mockStorageService);

			const history = await newService.getHistory();
			strictEqual(history.length, 2);
			strictEqual(history[0].id, 'test-1');
			strictEqual(history[0].content, 'Stored prompt 1');
			strictEqual(history[1].id, 'test-2');

			newService.dispose();
		});

		test('should handle corrupted storage gracefully', async () => {
			mockStorageService.store(
				PROMPT_HISTORY_STORAGE_KEY,
				'invalid json {]',
				StorageScope.APPLICATION,
				StorageTarget.USER
			);

			const { PromptHistoryService } = await import('../../browser/promptHistoryService.js') as any;
			const newService = new PromptHistoryService(mockStorageService);

			const history = await newService.getHistory();
			strictEqual(history.length, 0);

			newService.dispose();
		});

		test('should handle empty storage', async () => {
			const { PromptHistoryService } = await import('../../browser/promptHistoryService.js') as any;
			const newService = new PromptHistoryService(mockStorageService);

			const history = await newService.getHistory();
			strictEqual(history.length, 0);

			newService.dispose();
		});
	});

	suite('event handling', () => {
		test('should fire event only when history changes', async () => {
			let eventCount = 0;
			disposables.add(service.onDidChangeHistory(() => {
				eventCount++;
			}));

			await service.addPrompt('Prompt 1', {});
			strictEqual(eventCount, 1);

			await service.addPrompt('Prompt 2', {});
			strictEqual(eventCount, 2);

			await service.clearHistory();
			strictEqual(eventCount, 3);

			// Empty prompts should not fire event
			await service.addPrompt('', {});
			strictEqual(eventCount, 3);
		});
	});
});
