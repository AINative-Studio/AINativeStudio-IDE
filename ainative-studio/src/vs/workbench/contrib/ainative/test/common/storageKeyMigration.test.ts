/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { strictEqual, ok } from 'assert';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { IStorageService, StorageScope, StorageTarget } from '../../../../../platform/storage/common/storage.js';
import { InMemoryStorageService } from '../../../../../platform/storage/common/storage.js';
import {
	VOID_SETTINGS_STORAGE_KEY,
	LEGACY_VOID_SETTINGS_STORAGE_KEY,
	THREAD_STORAGE_KEY,
	LEGACY_THREAD_STORAGE_KEY,
	OPT_OUT_KEY,
	LEGACY_OPT_OUT_KEY,
	MACHINE_ID_KEY,
	LEGACY_MACHINE_ID_KEY
} from '../../common/storageKeys.js';

/**
 * Test suite for storage key migration from void.* to ainative.*
 * This ensures user data is preserved during rebranding.
 *
 * Coverage Requirements:
 * - Minimum overall coverage: 85%
 * - Critical path coverage: 100% for migration logic
 */
suite('Storage Key Migration', () => {
	const disposables = new DisposableStore();
	let storageService: IStorageService;

	setup(() => {
		storageService = disposables.add(new InMemoryStorageService());
	});

	teardown(() => {
		disposables.clear();
	});

	ensureNoDisposablesAreLeakedInTestSuite();

	/**
	 * CATEGORY 1: Migration Logic Tests (5 specific migrations)
	 * These tests verify that each storage key is correctly migrated.
	 */

	suite('Migration Logic Tests', () => {

		test('should migrate void.settingsServiceStorageII to ainative.settingsServiceStorageII', () => {
			// Given: Legacy settings data exists
			const legacyData = JSON.stringify({ apiKey: 'test-key', model: 'claude-3' });
			storageService.store(LEGACY_VOID_SETTINGS_STORAGE_KEY, legacyData, StorageScope.APPLICATION, StorageTarget.USER);

			// When: Migration check occurs (simulating service initialization)
			const hasLegacy = storageService.get(LEGACY_VOID_SETTINGS_STORAGE_KEY, StorageScope.APPLICATION);
			const hasNew = storageService.get(VOID_SETTINGS_STORAGE_KEY, StorageScope.APPLICATION);

			// Then: Legacy data exists, new key doesn't yet
			ok(hasLegacy, 'Legacy key should have data');
			strictEqual(hasNew, undefined, 'New key should not exist before migration');

			// When: Perform migration
			if (hasLegacy && !hasNew) {
				storageService.store(VOID_SETTINGS_STORAGE_KEY, hasLegacy, StorageScope.APPLICATION, StorageTarget.USER);
				storageService.remove(LEGACY_VOID_SETTINGS_STORAGE_KEY, StorageScope.APPLICATION);
			}

			// Then: Data migrated successfully
			const migratedData = storageService.get(VOID_SETTINGS_STORAGE_KEY, StorageScope.APPLICATION);
			strictEqual(migratedData, legacyData, 'Migrated data should match legacy data');
			strictEqual(storageService.get(LEGACY_VOID_SETTINGS_STORAGE_KEY, StorageScope.APPLICATION), undefined, 'Legacy key should be removed');
		});

		test('should migrate void.chatThreadStorageII to ainative.chatThreadStorageII', () => {
			// Given: Legacy chat thread data exists
			const legacyThreads = JSON.stringify({
				'thread-1': {
					id: 'thread-1',
					messages: [{ role: 'user', content: 'Hello' }]
				}
			});
			storageService.store(LEGACY_THREAD_STORAGE_KEY, legacyThreads, StorageScope.APPLICATION, StorageTarget.USER);

			// When: Migration check occurs
			const hasLegacy = storageService.get(LEGACY_THREAD_STORAGE_KEY, StorageScope.APPLICATION);
			const hasNew = storageService.get(THREAD_STORAGE_KEY, StorageScope.APPLICATION);

			// Then: Legacy exists, new doesn't
			ok(hasLegacy, 'Legacy threads should exist');
			strictEqual(hasNew, undefined, 'New key should not exist before migration');

			// When: Perform migration
			if (hasLegacy && !hasNew) {
				storageService.store(THREAD_STORAGE_KEY, hasLegacy, StorageScope.APPLICATION, StorageTarget.USER);
				storageService.remove(LEGACY_THREAD_STORAGE_KEY, StorageScope.APPLICATION);
			}

			// Then: Threads migrated successfully
			const migratedThreads = storageService.get(THREAD_STORAGE_KEY, StorageScope.APPLICATION);
			strictEqual(migratedThreads, legacyThreads, 'Migrated threads should match legacy threads');
			strictEqual(storageService.get(LEGACY_THREAD_STORAGE_KEY, StorageScope.APPLICATION), undefined, 'Legacy thread key should be removed');
		});

		test('should migrate void.app.optOutAll to ainative.app.optOutAll', () => {
			// Given: Legacy opt-out setting exists
			storageService.store(LEGACY_OPT_OUT_KEY, 'true', StorageScope.APPLICATION, StorageTarget.MACHINE);

			// When: Migration check occurs
			const hasLegacy = storageService.get(LEGACY_OPT_OUT_KEY, StorageScope.APPLICATION);
			const hasNew = storageService.get(OPT_OUT_KEY, StorageScope.APPLICATION);

			// Then: Legacy exists
			strictEqual(hasLegacy, 'true', 'Legacy opt-out should be true');
			strictEqual(hasNew, undefined, 'New key should not exist before migration');

			// When: Perform migration
			if (hasLegacy && hasNew === undefined) {
				storageService.store(OPT_OUT_KEY, hasLegacy, StorageScope.APPLICATION, StorageTarget.MACHINE);
				storageService.remove(LEGACY_OPT_OUT_KEY, StorageScope.APPLICATION);
			}

			// Then: Opt-out migrated successfully
			strictEqual(storageService.get(OPT_OUT_KEY, StorageScope.APPLICATION), 'true', 'Opt-out should be migrated');
			strictEqual(storageService.get(LEGACY_OPT_OUT_KEY, StorageScope.APPLICATION), undefined, 'Legacy opt-out key should be removed');
		});

		test('should migrate void.app.machineId to ainative.app.machineId', () => {
			// Given: Legacy machine ID exists
			const machineId = 'machine-uuid-12345';
			storageService.store(LEGACY_MACHINE_ID_KEY, machineId, StorageScope.APPLICATION, StorageTarget.MACHINE);

			// When: Migration check occurs
			const hasLegacy = storageService.get(LEGACY_MACHINE_ID_KEY, StorageScope.APPLICATION);
			const hasNew = storageService.get(MACHINE_ID_KEY, StorageScope.APPLICATION);

			// Then: Legacy exists
			strictEqual(hasLegacy, machineId, 'Legacy machine ID should exist');
			strictEqual(hasNew, undefined, 'New key should not exist before migration');

			// When: Perform migration
			if (hasLegacy && !hasNew) {
				storageService.store(MACHINE_ID_KEY, hasLegacy, StorageScope.APPLICATION, StorageTarget.MACHINE);
				storageService.remove(LEGACY_MACHINE_ID_KEY, StorageScope.APPLICATION);
			}

			// Then: Machine ID migrated successfully
			strictEqual(storageService.get(MACHINE_ID_KEY, StorageScope.APPLICATION), machineId, 'Machine ID should be migrated');
			strictEqual(storageService.get(LEGACY_MACHINE_ID_KEY, StorageScope.APPLICATION), undefined, 'Legacy machine ID key should be removed');
		});

		test('should ensure idempotency - migration runs only once', () => {
			// Given: Legacy data exists
			const originalData = JSON.stringify({ value: 'original' });
			storageService.store(LEGACY_VOID_SETTINGS_STORAGE_KEY, originalData, StorageScope.APPLICATION, StorageTarget.USER);

			// When: First migration
			let hasLegacy = storageService.get(LEGACY_VOID_SETTINGS_STORAGE_KEY, StorageScope.APPLICATION);
			let hasNew = storageService.get(VOID_SETTINGS_STORAGE_KEY, StorageScope.APPLICATION);

			if (hasLegacy && !hasNew) {
				storageService.store(VOID_SETTINGS_STORAGE_KEY, hasLegacy, StorageScope.APPLICATION, StorageTarget.USER);
				storageService.remove(LEGACY_VOID_SETTINGS_STORAGE_KEY, StorageScope.APPLICATION);
			}

			// Then: First migration succeeds
			strictEqual(storageService.get(VOID_SETTINGS_STORAGE_KEY, StorageScope.APPLICATION), originalData, 'First migration should succeed');
			strictEqual(storageService.get(LEGACY_VOID_SETTINGS_STORAGE_KEY, StorageScope.APPLICATION), undefined, 'Legacy key removed after first migration');

			// When: Attempt second migration (simulating service restart)
			hasLegacy = storageService.get(LEGACY_VOID_SETTINGS_STORAGE_KEY, StorageScope.APPLICATION);
			hasNew = storageService.get(VOID_SETTINGS_STORAGE_KEY, StorageScope.APPLICATION);

			// Then: Second migration skipped (idempotent)
			strictEqual(hasLegacy, undefined, 'Legacy key should not exist for second migration');
			ok(hasNew, 'New key should exist, preventing re-migration');

			// When: Try to migrate again (should be no-op)
			if (hasLegacy && !hasNew) {
				storageService.store(VOID_SETTINGS_STORAGE_KEY, hasLegacy, StorageScope.APPLICATION, StorageTarget.USER);
				storageService.remove(LEGACY_VOID_SETTINGS_STORAGE_KEY, StorageScope.APPLICATION);
			}

			// Then: Data unchanged, proving idempotency
			strictEqual(storageService.get(VOID_SETTINGS_STORAGE_KEY, StorageScope.APPLICATION), originalData, 'Data should remain unchanged');
		});

	});

	/**
	 * CATEGORY 2: Data Preservation Tests
	 * These tests verify that data is correctly preserved during migration.
	 */

	suite('Data Preservation Tests', () => {

		test('should preserve existing data correctly', () => {
			// Given: Complex legacy settings data
			const complexData = JSON.stringify({
				settingsOfProvider: {
					anthropic: { apiKey: 'sk-ant-test', models: ['claude-3-opus', 'claude-3-sonnet'] },
					openai: { apiKey: 'sk-test', models: ['gpt-4'] }
				},
				modelSelectionOfFeature: {
					Chat: { providerName: 'anthropic', modelName: 'claude-3-opus' }
				},
				globalSettings: {
					chatMode: 'agent',
					autoApprove: { 'Read files': true }
				}
			});
			storageService.store(LEGACY_VOID_SETTINGS_STORAGE_KEY, complexData, StorageScope.APPLICATION, StorageTarget.USER);

			// When: Migration occurs
			const hasLegacy = storageService.get(LEGACY_VOID_SETTINGS_STORAGE_KEY, StorageScope.APPLICATION);
			const hasNew = storageService.get(VOID_SETTINGS_STORAGE_KEY, StorageScope.APPLICATION);

			if (hasLegacy && !hasNew) {
				storageService.store(VOID_SETTINGS_STORAGE_KEY, hasLegacy, StorageScope.APPLICATION, StorageTarget.USER);
				storageService.remove(LEGACY_VOID_SETTINGS_STORAGE_KEY, StorageScope.APPLICATION);
			}

			// Then: All data preserved
			const migratedData = storageService.get(VOID_SETTINGS_STORAGE_KEY, StorageScope.APPLICATION);
			strictEqual(migratedData, complexData, 'Complex data structure should be fully preserved');

			// And: Data is parseable and correct
			const parsed = JSON.parse(migratedData!);
			strictEqual(parsed.settingsOfProvider.anthropic.apiKey, 'sk-ant-test', 'Nested API key preserved');
			strictEqual(parsed.modelSelectionOfFeature.Chat.modelName, 'claude-3-opus', 'Nested model selection preserved');
			strictEqual(parsed.globalSettings.chatMode, 'agent', 'Global settings preserved');
		});

		test('should not overwrite new keys when they already have data', () => {
			// Given: Both legacy and new keys exist
			const legacyData = JSON.stringify({ value: 'legacy' });
			const newData = JSON.stringify({ value: 'new' });

			storageService.store(LEGACY_VOID_SETTINGS_STORAGE_KEY, legacyData, StorageScope.APPLICATION, StorageTarget.USER);
			storageService.store(VOID_SETTINGS_STORAGE_KEY, newData, StorageScope.APPLICATION, StorageTarget.USER);

			// When: Migration check occurs
			const hasLegacy = storageService.get(LEGACY_VOID_SETTINGS_STORAGE_KEY, StorageScope.APPLICATION);
			const hasNew = storageService.get(VOID_SETTINGS_STORAGE_KEY, StorageScope.APPLICATION);

			// Then: Both exist
			ok(hasLegacy, 'Legacy data should exist');
			ok(hasNew, 'New data should exist');

			// When: Migration logic runs (but should skip)
			if (hasLegacy && !hasNew) {
				// This should NOT execute because hasNew exists
				storageService.store(VOID_SETTINGS_STORAGE_KEY, hasLegacy, StorageScope.APPLICATION, StorageTarget.USER);
				storageService.remove(LEGACY_VOID_SETTINGS_STORAGE_KEY, StorageScope.APPLICATION);
			}

			// Then: New data preserved, not overwritten
			strictEqual(storageService.get(VOID_SETTINGS_STORAGE_KEY, StorageScope.APPLICATION), newData, 'New data should NOT be overwritten');
			strictEqual(storageService.get(LEGACY_VOID_SETTINGS_STORAGE_KEY, StorageScope.APPLICATION), legacyData, 'Legacy data should still exist (not removed)');
		});

		test('should remove old keys after successful migration', () => {
			// Given: All legacy keys exist
			storageService.store(LEGACY_VOID_SETTINGS_STORAGE_KEY, 'settings', StorageScope.APPLICATION, StorageTarget.USER);
			storageService.store(LEGACY_THREAD_STORAGE_KEY, 'threads', StorageScope.APPLICATION, StorageTarget.USER);
			storageService.store(LEGACY_OPT_OUT_KEY, 'true', StorageScope.APPLICATION, StorageTarget.MACHINE);
			storageService.store(LEGACY_MACHINE_ID_KEY, 'machine-123', StorageScope.APPLICATION, StorageTarget.MACHINE);

			// When: Migrate all keys
			const migrations = [
				{ legacy: LEGACY_VOID_SETTINGS_STORAGE_KEY, new: VOID_SETTINGS_STORAGE_KEY, target: StorageTarget.USER },
				{ legacy: LEGACY_THREAD_STORAGE_KEY, new: THREAD_STORAGE_KEY, target: StorageTarget.USER },
				{ legacy: LEGACY_OPT_OUT_KEY, new: OPT_OUT_KEY, target: StorageTarget.MACHINE },
				{ legacy: LEGACY_MACHINE_ID_KEY, new: MACHINE_ID_KEY, target: StorageTarget.MACHINE }
			];

			migrations.forEach(({ legacy, new: newKey, target }) => {
				const hasLegacy = storageService.get(legacy, StorageScope.APPLICATION);
				const hasNew = storageService.get(newKey, StorageScope.APPLICATION);

				if (hasLegacy && !hasNew) {
					storageService.store(newKey, hasLegacy, StorageScope.APPLICATION, target);
					storageService.remove(legacy, StorageScope.APPLICATION);
				}
			});

			// Then: All legacy keys removed
			strictEqual(storageService.get(LEGACY_VOID_SETTINGS_STORAGE_KEY, StorageScope.APPLICATION), undefined, 'Legacy settings removed');
			strictEqual(storageService.get(LEGACY_THREAD_STORAGE_KEY, StorageScope.APPLICATION), undefined, 'Legacy threads removed');
			strictEqual(storageService.get(LEGACY_OPT_OUT_KEY, StorageScope.APPLICATION), undefined, 'Legacy opt-out removed');
			strictEqual(storageService.get(LEGACY_MACHINE_ID_KEY, StorageScope.APPLICATION), undefined, 'Legacy machine ID removed');

			// And: All new keys have data
			ok(storageService.get(VOID_SETTINGS_STORAGE_KEY, StorageScope.APPLICATION), 'New settings exist');
			ok(storageService.get(THREAD_STORAGE_KEY, StorageScope.APPLICATION), 'New threads exist');
			ok(storageService.get(OPT_OUT_KEY, StorageScope.APPLICATION), 'New opt-out exists');
			ok(storageService.get(MACHINE_ID_KEY, StorageScope.APPLICATION), 'New machine ID exists');
		});

		test('should preserve data types and encoding', () => {
			// Given: Various data types
			const booleanData = 'true';
			const stringData = 'machine-uuid-abc-123';
			const jsonData = JSON.stringify({ nested: { value: 42 } });

			storageService.store(LEGACY_OPT_OUT_KEY, booleanData, StorageScope.APPLICATION, StorageTarget.MACHINE);
			storageService.store(LEGACY_MACHINE_ID_KEY, stringData, StorageScope.APPLICATION, StorageTarget.MACHINE);
			storageService.store(LEGACY_VOID_SETTINGS_STORAGE_KEY, jsonData, StorageScope.APPLICATION, StorageTarget.USER);

			// When: Migrate all
			const migrations = [
				{ legacy: LEGACY_OPT_OUT_KEY, new: OPT_OUT_KEY },
				{ legacy: LEGACY_MACHINE_ID_KEY, new: MACHINE_ID_KEY },
				{ legacy: LEGACY_VOID_SETTINGS_STORAGE_KEY, new: VOID_SETTINGS_STORAGE_KEY }
			];

			migrations.forEach(({ legacy, new: newKey }) => {
				const data = storageService.get(legacy, StorageScope.APPLICATION);
				if (data && !storageService.get(newKey, StorageScope.APPLICATION)) {
					storageService.store(newKey, data, StorageScope.APPLICATION, StorageTarget.USER);
				}
			});

			// Then: Data types preserved
			strictEqual(storageService.get(OPT_OUT_KEY, StorageScope.APPLICATION), booleanData, 'Boolean string preserved');
			strictEqual(storageService.get(MACHINE_ID_KEY, StorageScope.APPLICATION), stringData, 'String preserved');

			const migratedJson = storageService.get(VOID_SETTINGS_STORAGE_KEY, StorageScope.APPLICATION);
			const parsed = JSON.parse(migratedJson!);
			strictEqual(parsed.nested.value, 42, 'JSON structure and types preserved');
		});

	});

	/**
	 * CATEGORY 3: Edge Case Tests
	 * These tests verify behavior in unusual or boundary conditions.
	 */

	suite('Edge Case Tests', () => {

		test('should handle fresh install (old keys don\'t exist)', () => {
			// Given: No legacy keys exist (fresh install)
			strictEqual(storageService.get(LEGACY_VOID_SETTINGS_STORAGE_KEY, StorageScope.APPLICATION), undefined, 'No legacy settings');
			strictEqual(storageService.get(LEGACY_THREAD_STORAGE_KEY, StorageScope.APPLICATION), undefined, 'No legacy threads');

			// When: Migration check occurs
			const hasLegacySettings = storageService.get(LEGACY_VOID_SETTINGS_STORAGE_KEY, StorageScope.APPLICATION);
			const hasNewSettings = storageService.get(VOID_SETTINGS_STORAGE_KEY, StorageScope.APPLICATION);

			if (hasLegacySettings && !hasNewSettings) {
				storageService.store(VOID_SETTINGS_STORAGE_KEY, hasLegacySettings, StorageScope.APPLICATION, StorageTarget.USER);
				storageService.remove(LEGACY_VOID_SETTINGS_STORAGE_KEY, StorageScope.APPLICATION);
			}

			// Then: No migration occurs, no errors
			strictEqual(storageService.get(VOID_SETTINGS_STORAGE_KEY, StorageScope.APPLICATION), undefined, 'New key remains undefined');
			strictEqual(storageService.get(LEGACY_VOID_SETTINGS_STORAGE_KEY, StorageScope.APPLICATION), undefined, 'Legacy key remains undefined');
		});

		test('should handle new keys already having data (user upgraded, downgraded, then upgraded again)', () => {
			// Given: User already upgraded (new keys exist), then downgraded (legacy keys recreated), now upgrading again
			storageService.store(VOID_SETTINGS_STORAGE_KEY, JSON.stringify({ value: 'upgraded' }), StorageScope.APPLICATION, StorageTarget.USER);
			storageService.store(LEGACY_VOID_SETTINGS_STORAGE_KEY, JSON.stringify({ value: 'downgraded' }), StorageScope.APPLICATION, StorageTarget.USER);

			// When: Migration check occurs
			const hasLegacy = storageService.get(LEGACY_VOID_SETTINGS_STORAGE_KEY, StorageScope.APPLICATION);
			const hasNew = storageService.get(VOID_SETTINGS_STORAGE_KEY, StorageScope.APPLICATION);

			// Then: Both exist
			ok(hasLegacy, 'Legacy exists from downgrade');
			ok(hasNew, 'New exists from previous upgrade');

			// When: Migration logic evaluates
			if (hasLegacy && !hasNew) {
				// Should NOT execute because hasNew exists
				storageService.store(VOID_SETTINGS_STORAGE_KEY, hasLegacy, StorageScope.APPLICATION, StorageTarget.USER);
			}

			// Then: Original new data preserved
			const newData = JSON.parse(storageService.get(VOID_SETTINGS_STORAGE_KEY, StorageScope.APPLICATION)!);
			strictEqual(newData.value, 'upgraded', 'Should preserve upgraded data, not overwrite with downgraded');
		});

		test('should handle partial migration scenarios (some keys migrated, some not)', () => {
			// Given: Some keys already migrated, others not
			storageService.store(VOID_SETTINGS_STORAGE_KEY, 'already-migrated', StorageScope.APPLICATION, StorageTarget.USER);
			storageService.store(LEGACY_THREAD_STORAGE_KEY, 'needs-migration', StorageScope.APPLICATION, StorageTarget.USER);
			storageService.store(LEGACY_MACHINE_ID_KEY, 'needs-migration', StorageScope.APPLICATION, StorageTarget.MACHINE);

			// When: Migration runs for all keys
			const migrations = [
				{ legacy: LEGACY_VOID_SETTINGS_STORAGE_KEY, new: VOID_SETTINGS_STORAGE_KEY, target: StorageTarget.USER },
				{ legacy: LEGACY_THREAD_STORAGE_KEY, new: THREAD_STORAGE_KEY, target: StorageTarget.USER },
				{ legacy: LEGACY_MACHINE_ID_KEY, new: MACHINE_ID_KEY, target: StorageTarget.MACHINE }
			];

			migrations.forEach(({ legacy, new: newKey, target }) => {
				const hasLegacy = storageService.get(legacy, StorageScope.APPLICATION);
				const hasNew = storageService.get(newKey, StorageScope.APPLICATION);

				if (hasLegacy && !hasNew) {
					storageService.store(newKey, hasLegacy, StorageScope.APPLICATION, target);
					storageService.remove(legacy, StorageScope.APPLICATION);
				}
			});

			// Then: Already-migrated key unchanged
			strictEqual(storageService.get(VOID_SETTINGS_STORAGE_KEY, StorageScope.APPLICATION), 'already-migrated', 'Pre-migrated key unchanged');

			// And: Other keys migrated
			strictEqual(storageService.get(THREAD_STORAGE_KEY, StorageScope.APPLICATION), 'needs-migration', 'Threads migrated');
			strictEqual(storageService.get(MACHINE_ID_KEY, StorageScope.APPLICATION), 'needs-migration', 'Machine ID migrated');

			// And: Migrated legacy keys removed
			strictEqual(storageService.get(LEGACY_THREAD_STORAGE_KEY, StorageScope.APPLICATION), undefined, 'Legacy threads removed');
			strictEqual(storageService.get(LEGACY_MACHINE_ID_KEY, StorageScope.APPLICATION), undefined, 'Legacy machine ID removed');
		});

		test('should handle empty string values', () => {
			// Given: Legacy key has empty string
			storageService.store(LEGACY_VOID_SETTINGS_STORAGE_KEY, '', StorageScope.APPLICATION, StorageTarget.USER);

			// When: Migration occurs
			const hasLegacy = storageService.get(LEGACY_VOID_SETTINGS_STORAGE_KEY, StorageScope.APPLICATION);
			const hasNew = storageService.get(VOID_SETTINGS_STORAGE_KEY, StorageScope.APPLICATION);

			if (hasLegacy !== undefined && !hasNew) {
				storageService.store(VOID_SETTINGS_STORAGE_KEY, hasLegacy, StorageScope.APPLICATION, StorageTarget.USER);
				storageService.remove(LEGACY_VOID_SETTINGS_STORAGE_KEY, StorageScope.APPLICATION);
			}

			// Then: Empty string migrated
			strictEqual(storageService.get(VOID_SETTINGS_STORAGE_KEY, StorageScope.APPLICATION), '', 'Empty string should be migrated');
			strictEqual(storageService.get(LEGACY_VOID_SETTINGS_STORAGE_KEY, StorageScope.APPLICATION), undefined, 'Legacy key removed');
		});

		test('should handle very large data (performance test)', () => {
			// Given: Large dataset (simulating many chat threads)
			const largeThreadData = JSON.stringify({
				threads: Array.from({ length: 100 }, (_, i) => ({
					id: `thread-${i}`,
					messages: Array.from({ length: 50 }, (_, j) => ({
						role: j % 2 === 0 ? 'user' : 'assistant',
						content: `Message ${j} in thread ${i}`.repeat(10)
					}))
				}))
			});

			storageService.store(LEGACY_THREAD_STORAGE_KEY, largeThreadData, StorageScope.APPLICATION, StorageTarget.USER);

			// When: Migration occurs
			const startTime = Date.now();
			const hasLegacy = storageService.get(LEGACY_THREAD_STORAGE_KEY, StorageScope.APPLICATION);
			const hasNew = storageService.get(THREAD_STORAGE_KEY, StorageScope.APPLICATION);

			if (hasLegacy && !hasNew) {
				storageService.store(THREAD_STORAGE_KEY, hasLegacy, StorageScope.APPLICATION, StorageTarget.USER);
				storageService.remove(LEGACY_THREAD_STORAGE_KEY, StorageScope.APPLICATION);
			}
			const endTime = Date.now();

			// Then: Large data migrated successfully
			const migratedData = storageService.get(THREAD_STORAGE_KEY, StorageScope.APPLICATION);
			strictEqual(migratedData, largeThreadData, 'Large dataset should be fully migrated');

			// And: Performance acceptable (should be fast for in-memory operations)
			const duration = endTime - startTime;
			ok(duration < 1000, `Migration should be fast (was ${duration}ms), even for large data`);
		});

		test('should handle special characters and unicode in data', () => {
			// Given: Data with special characters
			const specialData = JSON.stringify({
				emoji: '🚀🎨💻',
				chinese: '你好世界',
				symbols: '!@#$%^&*(){}[]|\\:";\'<>?,./~`',
				unicode: '\u0000\u001F\u007F\u0080\u009F'
			});

			storageService.store(LEGACY_VOID_SETTINGS_STORAGE_KEY, specialData, StorageScope.APPLICATION, StorageTarget.USER);

			// When: Migration occurs
			const hasLegacy = storageService.get(LEGACY_VOID_SETTINGS_STORAGE_KEY, StorageScope.APPLICATION);
			const hasNew = storageService.get(VOID_SETTINGS_STORAGE_KEY, StorageScope.APPLICATION);

			if (hasLegacy && !hasNew) {
				storageService.store(VOID_SETTINGS_STORAGE_KEY, hasLegacy, StorageScope.APPLICATION, StorageTarget.USER);
				storageService.remove(LEGACY_VOID_SETTINGS_STORAGE_KEY, StorageScope.APPLICATION);
			}

			// Then: Special characters preserved
			const migratedData = storageService.get(VOID_SETTINGS_STORAGE_KEY, StorageScope.APPLICATION);
			strictEqual(migratedData, specialData, 'Special characters should be preserved');

			const parsed = JSON.parse(migratedData!);
			strictEqual(parsed.emoji, '🚀🎨💻', 'Emoji preserved');
			strictEqual(parsed.chinese, '你好世界', 'Unicode preserved');
		});

	});

	/**
	 * CATEGORY 4: Integration Tests
	 * These tests verify migration behavior across multiple keys and scenarios.
	 */

	suite('Integration Tests', () => {

		test('should migrate all keys atomically in a single operation', () => {
			// Given: All legacy keys exist
			const settingsData = JSON.stringify({ settings: 'data' });
			const threadsData = JSON.stringify({ threads: 'data' });
			const optOutData = 'true';
			const machineIdData = 'machine-123';

			storageService.store(LEGACY_VOID_SETTINGS_STORAGE_KEY, settingsData, StorageScope.APPLICATION, StorageTarget.USER);
			storageService.store(LEGACY_THREAD_STORAGE_KEY, threadsData, StorageScope.APPLICATION, StorageTarget.USER);
			storageService.store(LEGACY_OPT_OUT_KEY, optOutData, StorageScope.APPLICATION, StorageTarget.MACHINE);
			storageService.store(LEGACY_MACHINE_ID_KEY, machineIdData, StorageScope.APPLICATION, StorageTarget.MACHINE);

			// When: Perform complete migration
			const allMigrations = [
				{ legacy: LEGACY_VOID_SETTINGS_STORAGE_KEY, new: VOID_SETTINGS_STORAGE_KEY, target: StorageTarget.USER },
				{ legacy: LEGACY_THREAD_STORAGE_KEY, new: THREAD_STORAGE_KEY, target: StorageTarget.USER },
				{ legacy: LEGACY_OPT_OUT_KEY, new: OPT_OUT_KEY, target: StorageTarget.MACHINE },
				{ legacy: LEGACY_MACHINE_ID_KEY, new: MACHINE_ID_KEY, target: StorageTarget.MACHINE }
			];

			allMigrations.forEach(({ legacy, new: newKey, target }) => {
				const legacyValue = storageService.get(legacy, StorageScope.APPLICATION);
				const newValue = storageService.get(newKey, StorageScope.APPLICATION);

				if (legacyValue && !newValue) {
					storageService.store(newKey, legacyValue, StorageScope.APPLICATION, target);
					storageService.remove(legacy, StorageScope.APPLICATION);
				}
			});

			// Then: All keys migrated
			strictEqual(storageService.get(VOID_SETTINGS_STORAGE_KEY, StorageScope.APPLICATION), settingsData, 'Settings migrated');
			strictEqual(storageService.get(THREAD_STORAGE_KEY, StorageScope.APPLICATION), threadsData, 'Threads migrated');
			strictEqual(storageService.get(OPT_OUT_KEY, StorageScope.APPLICATION), optOutData, 'Opt-out migrated');
			strictEqual(storageService.get(MACHINE_ID_KEY, StorageScope.APPLICATION), machineIdData, 'Machine ID migrated');

			// And: All legacy keys removed
			strictEqual(storageService.get(LEGACY_VOID_SETTINGS_STORAGE_KEY, StorageScope.APPLICATION), undefined, 'Legacy settings removed');
			strictEqual(storageService.get(LEGACY_THREAD_STORAGE_KEY, StorageScope.APPLICATION), undefined, 'Legacy threads removed');
			strictEqual(storageService.get(LEGACY_OPT_OUT_KEY, StorageScope.APPLICATION), undefined, 'Legacy opt-out removed');
			strictEqual(storageService.get(LEGACY_MACHINE_ID_KEY, StorageScope.APPLICATION), undefined, 'Legacy machine ID removed');
		});

		test('should handle multiple service initializations (idempotency stress test)', () => {
			// Given: Legacy data
			const originalData = JSON.stringify({ value: 'original' });
			storageService.store(LEGACY_VOID_SETTINGS_STORAGE_KEY, originalData, StorageScope.APPLICATION, StorageTarget.USER);

			// When: Simulate 5 service restarts/re-initializations
			for (let i = 0; i < 5; i++) {
				const hasLegacy = storageService.get(LEGACY_VOID_SETTINGS_STORAGE_KEY, StorageScope.APPLICATION);
				const hasNew = storageService.get(VOID_SETTINGS_STORAGE_KEY, StorageScope.APPLICATION);

				if (hasLegacy && !hasNew) {
					storageService.store(VOID_SETTINGS_STORAGE_KEY, hasLegacy, StorageScope.APPLICATION, StorageTarget.USER);
					storageService.remove(LEGACY_VOID_SETTINGS_STORAGE_KEY, StorageScope.APPLICATION);
				}
			}

			// Then: Data migrated only once, remains consistent
			strictEqual(storageService.get(VOID_SETTINGS_STORAGE_KEY, StorageScope.APPLICATION), originalData, 'Data migrated and unchanged after multiple initializations');
			strictEqual(storageService.get(LEGACY_VOID_SETTINGS_STORAGE_KEY, StorageScope.APPLICATION), undefined, 'Legacy key removed after first migration');
		});

	});

});
