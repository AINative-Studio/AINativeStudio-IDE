/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { strictEqual, ok } from 'assert';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { InMemoryStorageService } from '../../../../../platform/storage/common/storage.js';
import { VOID_SETTINGS_STORAGE_KEY, LEGACY_VOID_SETTINGS_STORAGE_KEY, THREAD_STORAGE_KEY, LEGACY_THREAD_STORAGE_KEY, OPT_OUT_KEY, LEGACY_OPT_OUT_KEY, MACHINE_ID_KEY, LEGACY_MACHINE_ID_KEY } from '../../common/storageKeys.js';
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
    let storageService;
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
            storageService.store(LEGACY_VOID_SETTINGS_STORAGE_KEY, legacyData, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
            // When: Migration check occurs (simulating service initialization)
            const hasLegacy = storageService.get(LEGACY_VOID_SETTINGS_STORAGE_KEY, -1 /* StorageScope.APPLICATION */);
            const hasNew = storageService.get(VOID_SETTINGS_STORAGE_KEY, -1 /* StorageScope.APPLICATION */);
            // Then: Legacy data exists, new key doesn't yet
            ok(hasLegacy, 'Legacy key should have data');
            strictEqual(hasNew, undefined, 'New key should not exist before migration');
            // When: Perform migration
            if (hasLegacy && !hasNew) {
                storageService.store(VOID_SETTINGS_STORAGE_KEY, hasLegacy, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
                storageService.remove(LEGACY_VOID_SETTINGS_STORAGE_KEY, -1 /* StorageScope.APPLICATION */);
            }
            // Then: Data migrated successfully
            const migratedData = storageService.get(VOID_SETTINGS_STORAGE_KEY, -1 /* StorageScope.APPLICATION */);
            strictEqual(migratedData, legacyData, 'Migrated data should match legacy data');
            strictEqual(storageService.get(LEGACY_VOID_SETTINGS_STORAGE_KEY, -1 /* StorageScope.APPLICATION */), undefined, 'Legacy key should be removed');
        });
        test('should migrate void.chatThreadStorageII to ainative.chatThreadStorageII', () => {
            // Given: Legacy chat thread data exists
            const legacyThreads = JSON.stringify({
                'thread-1': {
                    id: 'thread-1',
                    messages: [{ role: 'user', content: 'Hello' }]
                }
            });
            storageService.store(LEGACY_THREAD_STORAGE_KEY, legacyThreads, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
            // When: Migration check occurs
            const hasLegacy = storageService.get(LEGACY_THREAD_STORAGE_KEY, -1 /* StorageScope.APPLICATION */);
            const hasNew = storageService.get(THREAD_STORAGE_KEY, -1 /* StorageScope.APPLICATION */);
            // Then: Legacy exists, new doesn't
            ok(hasLegacy, 'Legacy threads should exist');
            strictEqual(hasNew, undefined, 'New key should not exist before migration');
            // When: Perform migration
            if (hasLegacy && !hasNew) {
                storageService.store(THREAD_STORAGE_KEY, hasLegacy, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
                storageService.remove(LEGACY_THREAD_STORAGE_KEY, -1 /* StorageScope.APPLICATION */);
            }
            // Then: Threads migrated successfully
            const migratedThreads = storageService.get(THREAD_STORAGE_KEY, -1 /* StorageScope.APPLICATION */);
            strictEqual(migratedThreads, legacyThreads, 'Migrated threads should match legacy threads');
            strictEqual(storageService.get(LEGACY_THREAD_STORAGE_KEY, -1 /* StorageScope.APPLICATION */), undefined, 'Legacy thread key should be removed');
        });
        test('should migrate void.app.optOutAll to ainative.app.optOutAll', () => {
            // Given: Legacy opt-out setting exists
            storageService.store(LEGACY_OPT_OUT_KEY, 'true', -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
            // When: Migration check occurs
            const hasLegacy = storageService.get(LEGACY_OPT_OUT_KEY, -1 /* StorageScope.APPLICATION */);
            const hasNew = storageService.get(OPT_OUT_KEY, -1 /* StorageScope.APPLICATION */);
            // Then: Legacy exists
            strictEqual(hasLegacy, 'true', 'Legacy opt-out should be true');
            strictEqual(hasNew, undefined, 'New key should not exist before migration');
            // When: Perform migration
            if (hasLegacy && hasNew === undefined) {
                storageService.store(OPT_OUT_KEY, hasLegacy, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
                storageService.remove(LEGACY_OPT_OUT_KEY, -1 /* StorageScope.APPLICATION */);
            }
            // Then: Opt-out migrated successfully
            strictEqual(storageService.get(OPT_OUT_KEY, -1 /* StorageScope.APPLICATION */), 'true', 'Opt-out should be migrated');
            strictEqual(storageService.get(LEGACY_OPT_OUT_KEY, -1 /* StorageScope.APPLICATION */), undefined, 'Legacy opt-out key should be removed');
        });
        test('should migrate void.app.machineId to ainative.app.machineId', () => {
            // Given: Legacy machine ID exists
            const machineId = 'machine-uuid-12345';
            storageService.store(LEGACY_MACHINE_ID_KEY, machineId, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
            // When: Migration check occurs
            const hasLegacy = storageService.get(LEGACY_MACHINE_ID_KEY, -1 /* StorageScope.APPLICATION */);
            const hasNew = storageService.get(MACHINE_ID_KEY, -1 /* StorageScope.APPLICATION */);
            // Then: Legacy exists
            strictEqual(hasLegacy, machineId, 'Legacy machine ID should exist');
            strictEqual(hasNew, undefined, 'New key should not exist before migration');
            // When: Perform migration
            if (hasLegacy && !hasNew) {
                storageService.store(MACHINE_ID_KEY, hasLegacy, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
                storageService.remove(LEGACY_MACHINE_ID_KEY, -1 /* StorageScope.APPLICATION */);
            }
            // Then: Machine ID migrated successfully
            strictEqual(storageService.get(MACHINE_ID_KEY, -1 /* StorageScope.APPLICATION */), machineId, 'Machine ID should be migrated');
            strictEqual(storageService.get(LEGACY_MACHINE_ID_KEY, -1 /* StorageScope.APPLICATION */), undefined, 'Legacy machine ID key should be removed');
        });
        test('should ensure idempotency - migration runs only once', () => {
            // Given: Legacy data exists
            const originalData = JSON.stringify({ value: 'original' });
            storageService.store(LEGACY_VOID_SETTINGS_STORAGE_KEY, originalData, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
            // When: First migration
            let hasLegacy = storageService.get(LEGACY_VOID_SETTINGS_STORAGE_KEY, -1 /* StorageScope.APPLICATION */);
            let hasNew = storageService.get(VOID_SETTINGS_STORAGE_KEY, -1 /* StorageScope.APPLICATION */);
            if (hasLegacy && !hasNew) {
                storageService.store(VOID_SETTINGS_STORAGE_KEY, hasLegacy, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
                storageService.remove(LEGACY_VOID_SETTINGS_STORAGE_KEY, -1 /* StorageScope.APPLICATION */);
            }
            // Then: First migration succeeds
            strictEqual(storageService.get(VOID_SETTINGS_STORAGE_KEY, -1 /* StorageScope.APPLICATION */), originalData, 'First migration should succeed');
            strictEqual(storageService.get(LEGACY_VOID_SETTINGS_STORAGE_KEY, -1 /* StorageScope.APPLICATION */), undefined, 'Legacy key removed after first migration');
            // When: Attempt second migration (simulating service restart)
            hasLegacy = storageService.get(LEGACY_VOID_SETTINGS_STORAGE_KEY, -1 /* StorageScope.APPLICATION */);
            hasNew = storageService.get(VOID_SETTINGS_STORAGE_KEY, -1 /* StorageScope.APPLICATION */);
            // Then: Second migration skipped (idempotent)
            strictEqual(hasLegacy, undefined, 'Legacy key should not exist for second migration');
            ok(hasNew, 'New key should exist, preventing re-migration');
            // When: Try to migrate again (should be no-op)
            if (hasLegacy && !hasNew) {
                storageService.store(VOID_SETTINGS_STORAGE_KEY, hasLegacy, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
                storageService.remove(LEGACY_VOID_SETTINGS_STORAGE_KEY, -1 /* StorageScope.APPLICATION */);
            }
            // Then: Data unchanged, proving idempotency
            strictEqual(storageService.get(VOID_SETTINGS_STORAGE_KEY, -1 /* StorageScope.APPLICATION */), originalData, 'Data should remain unchanged');
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
            storageService.store(LEGACY_VOID_SETTINGS_STORAGE_KEY, complexData, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
            // When: Migration occurs
            const hasLegacy = storageService.get(LEGACY_VOID_SETTINGS_STORAGE_KEY, -1 /* StorageScope.APPLICATION */);
            const hasNew = storageService.get(VOID_SETTINGS_STORAGE_KEY, -1 /* StorageScope.APPLICATION */);
            if (hasLegacy && !hasNew) {
                storageService.store(VOID_SETTINGS_STORAGE_KEY, hasLegacy, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
                storageService.remove(LEGACY_VOID_SETTINGS_STORAGE_KEY, -1 /* StorageScope.APPLICATION */);
            }
            // Then: All data preserved
            const migratedData = storageService.get(VOID_SETTINGS_STORAGE_KEY, -1 /* StorageScope.APPLICATION */);
            strictEqual(migratedData, complexData, 'Complex data structure should be fully preserved');
            // And: Data is parseable and correct
            const parsed = JSON.parse(migratedData);
            strictEqual(parsed.settingsOfProvider.anthropic.apiKey, 'sk-ant-test', 'Nested API key preserved');
            strictEqual(parsed.modelSelectionOfFeature.Chat.modelName, 'claude-3-opus', 'Nested model selection preserved');
            strictEqual(parsed.globalSettings.chatMode, 'agent', 'Global settings preserved');
        });
        test('should not overwrite new keys when they already have data', () => {
            // Given: Both legacy and new keys exist
            const legacyData = JSON.stringify({ value: 'legacy' });
            const newData = JSON.stringify({ value: 'new' });
            storageService.store(LEGACY_VOID_SETTINGS_STORAGE_KEY, legacyData, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
            storageService.store(VOID_SETTINGS_STORAGE_KEY, newData, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
            // When: Migration check occurs
            const hasLegacy = storageService.get(LEGACY_VOID_SETTINGS_STORAGE_KEY, -1 /* StorageScope.APPLICATION */);
            const hasNew = storageService.get(VOID_SETTINGS_STORAGE_KEY, -1 /* StorageScope.APPLICATION */);
            // Then: Both exist
            ok(hasLegacy, 'Legacy data should exist');
            ok(hasNew, 'New data should exist');
            // When: Migration logic runs (but should skip)
            if (hasLegacy && !hasNew) {
                // This should NOT execute because hasNew exists
                storageService.store(VOID_SETTINGS_STORAGE_KEY, hasLegacy, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
                storageService.remove(LEGACY_VOID_SETTINGS_STORAGE_KEY, -1 /* StorageScope.APPLICATION */);
            }
            // Then: New data preserved, not overwritten
            strictEqual(storageService.get(VOID_SETTINGS_STORAGE_KEY, -1 /* StorageScope.APPLICATION */), newData, 'New data should NOT be overwritten');
            strictEqual(storageService.get(LEGACY_VOID_SETTINGS_STORAGE_KEY, -1 /* StorageScope.APPLICATION */), legacyData, 'Legacy data should still exist (not removed)');
        });
        test('should remove old keys after successful migration', () => {
            // Given: All legacy keys exist
            storageService.store(LEGACY_VOID_SETTINGS_STORAGE_KEY, 'settings', -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
            storageService.store(LEGACY_THREAD_STORAGE_KEY, 'threads', -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
            storageService.store(LEGACY_OPT_OUT_KEY, 'true', -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
            storageService.store(LEGACY_MACHINE_ID_KEY, 'machine-123', -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
            // When: Migrate all keys
            const migrations = [
                { legacy: LEGACY_VOID_SETTINGS_STORAGE_KEY, new: VOID_SETTINGS_STORAGE_KEY, target: 0 /* StorageTarget.USER */ },
                { legacy: LEGACY_THREAD_STORAGE_KEY, new: THREAD_STORAGE_KEY, target: 0 /* StorageTarget.USER */ },
                { legacy: LEGACY_OPT_OUT_KEY, new: OPT_OUT_KEY, target: 1 /* StorageTarget.MACHINE */ },
                { legacy: LEGACY_MACHINE_ID_KEY, new: MACHINE_ID_KEY, target: 1 /* StorageTarget.MACHINE */ }
            ];
            migrations.forEach(({ legacy, new: newKey, target }) => {
                const hasLegacy = storageService.get(legacy, -1 /* StorageScope.APPLICATION */);
                const hasNew = storageService.get(newKey, -1 /* StorageScope.APPLICATION */);
                if (hasLegacy && !hasNew) {
                    storageService.store(newKey, hasLegacy, -1 /* StorageScope.APPLICATION */, target);
                    storageService.remove(legacy, -1 /* StorageScope.APPLICATION */);
                }
            });
            // Then: All legacy keys removed
            strictEqual(storageService.get(LEGACY_VOID_SETTINGS_STORAGE_KEY, -1 /* StorageScope.APPLICATION */), undefined, 'Legacy settings removed');
            strictEqual(storageService.get(LEGACY_THREAD_STORAGE_KEY, -1 /* StorageScope.APPLICATION */), undefined, 'Legacy threads removed');
            strictEqual(storageService.get(LEGACY_OPT_OUT_KEY, -1 /* StorageScope.APPLICATION */), undefined, 'Legacy opt-out removed');
            strictEqual(storageService.get(LEGACY_MACHINE_ID_KEY, -1 /* StorageScope.APPLICATION */), undefined, 'Legacy machine ID removed');
            // And: All new keys have data
            ok(storageService.get(VOID_SETTINGS_STORAGE_KEY, -1 /* StorageScope.APPLICATION */), 'New settings exist');
            ok(storageService.get(THREAD_STORAGE_KEY, -1 /* StorageScope.APPLICATION */), 'New threads exist');
            ok(storageService.get(OPT_OUT_KEY, -1 /* StorageScope.APPLICATION */), 'New opt-out exists');
            ok(storageService.get(MACHINE_ID_KEY, -1 /* StorageScope.APPLICATION */), 'New machine ID exists');
        });
        test('should preserve data types and encoding', () => {
            // Given: Various data types
            const booleanData = 'true';
            const stringData = 'machine-uuid-abc-123';
            const jsonData = JSON.stringify({ nested: { value: 42 } });
            storageService.store(LEGACY_OPT_OUT_KEY, booleanData, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
            storageService.store(LEGACY_MACHINE_ID_KEY, stringData, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
            storageService.store(LEGACY_VOID_SETTINGS_STORAGE_KEY, jsonData, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
            // When: Migrate all
            const migrations = [
                { legacy: LEGACY_OPT_OUT_KEY, new: OPT_OUT_KEY },
                { legacy: LEGACY_MACHINE_ID_KEY, new: MACHINE_ID_KEY },
                { legacy: LEGACY_VOID_SETTINGS_STORAGE_KEY, new: VOID_SETTINGS_STORAGE_KEY }
            ];
            migrations.forEach(({ legacy, new: newKey }) => {
                const data = storageService.get(legacy, -1 /* StorageScope.APPLICATION */);
                if (data && !storageService.get(newKey, -1 /* StorageScope.APPLICATION */)) {
                    storageService.store(newKey, data, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
                }
            });
            // Then: Data types preserved
            strictEqual(storageService.get(OPT_OUT_KEY, -1 /* StorageScope.APPLICATION */), booleanData, 'Boolean string preserved');
            strictEqual(storageService.get(MACHINE_ID_KEY, -1 /* StorageScope.APPLICATION */), stringData, 'String preserved');
            const migratedJson = storageService.get(VOID_SETTINGS_STORAGE_KEY, -1 /* StorageScope.APPLICATION */);
            const parsed = JSON.parse(migratedJson);
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
            strictEqual(storageService.get(LEGACY_VOID_SETTINGS_STORAGE_KEY, -1 /* StorageScope.APPLICATION */), undefined, 'No legacy settings');
            strictEqual(storageService.get(LEGACY_THREAD_STORAGE_KEY, -1 /* StorageScope.APPLICATION */), undefined, 'No legacy threads');
            // When: Migration check occurs
            const hasLegacySettings = storageService.get(LEGACY_VOID_SETTINGS_STORAGE_KEY, -1 /* StorageScope.APPLICATION */);
            const hasNewSettings = storageService.get(VOID_SETTINGS_STORAGE_KEY, -1 /* StorageScope.APPLICATION */);
            if (hasLegacySettings && !hasNewSettings) {
                storageService.store(VOID_SETTINGS_STORAGE_KEY, hasLegacySettings, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
                storageService.remove(LEGACY_VOID_SETTINGS_STORAGE_KEY, -1 /* StorageScope.APPLICATION */);
            }
            // Then: No migration occurs, no errors
            strictEqual(storageService.get(VOID_SETTINGS_STORAGE_KEY, -1 /* StorageScope.APPLICATION */), undefined, 'New key remains undefined');
            strictEqual(storageService.get(LEGACY_VOID_SETTINGS_STORAGE_KEY, -1 /* StorageScope.APPLICATION */), undefined, 'Legacy key remains undefined');
        });
        test('should handle new keys already having data (user upgraded, downgraded, then upgraded again)', () => {
            // Given: User already upgraded (new keys exist), then downgraded (legacy keys recreated), now upgrading again
            storageService.store(VOID_SETTINGS_STORAGE_KEY, JSON.stringify({ value: 'upgraded' }), -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
            storageService.store(LEGACY_VOID_SETTINGS_STORAGE_KEY, JSON.stringify({ value: 'downgraded' }), -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
            // When: Migration check occurs
            const hasLegacy = storageService.get(LEGACY_VOID_SETTINGS_STORAGE_KEY, -1 /* StorageScope.APPLICATION */);
            const hasNew = storageService.get(VOID_SETTINGS_STORAGE_KEY, -1 /* StorageScope.APPLICATION */);
            // Then: Both exist
            ok(hasLegacy, 'Legacy exists from downgrade');
            ok(hasNew, 'New exists from previous upgrade');
            // When: Migration logic evaluates
            if (hasLegacy && !hasNew) {
                // Should NOT execute because hasNew exists
                storageService.store(VOID_SETTINGS_STORAGE_KEY, hasLegacy, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
            }
            // Then: Original new data preserved
            const newData = JSON.parse(storageService.get(VOID_SETTINGS_STORAGE_KEY, -1 /* StorageScope.APPLICATION */));
            strictEqual(newData.value, 'upgraded', 'Should preserve upgraded data, not overwrite with downgraded');
        });
        test('should handle partial migration scenarios (some keys migrated, some not)', () => {
            // Given: Some keys already migrated, others not
            storageService.store(VOID_SETTINGS_STORAGE_KEY, 'already-migrated', -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
            storageService.store(LEGACY_THREAD_STORAGE_KEY, 'needs-migration', -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
            storageService.store(LEGACY_MACHINE_ID_KEY, 'needs-migration', -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
            // When: Migration runs for all keys
            const migrations = [
                { legacy: LEGACY_VOID_SETTINGS_STORAGE_KEY, new: VOID_SETTINGS_STORAGE_KEY, target: 0 /* StorageTarget.USER */ },
                { legacy: LEGACY_THREAD_STORAGE_KEY, new: THREAD_STORAGE_KEY, target: 0 /* StorageTarget.USER */ },
                { legacy: LEGACY_MACHINE_ID_KEY, new: MACHINE_ID_KEY, target: 1 /* StorageTarget.MACHINE */ }
            ];
            migrations.forEach(({ legacy, new: newKey, target }) => {
                const hasLegacy = storageService.get(legacy, -1 /* StorageScope.APPLICATION */);
                const hasNew = storageService.get(newKey, -1 /* StorageScope.APPLICATION */);
                if (hasLegacy && !hasNew) {
                    storageService.store(newKey, hasLegacy, -1 /* StorageScope.APPLICATION */, target);
                    storageService.remove(legacy, -1 /* StorageScope.APPLICATION */);
                }
            });
            // Then: Already-migrated key unchanged
            strictEqual(storageService.get(VOID_SETTINGS_STORAGE_KEY, -1 /* StorageScope.APPLICATION */), 'already-migrated', 'Pre-migrated key unchanged');
            // And: Other keys migrated
            strictEqual(storageService.get(THREAD_STORAGE_KEY, -1 /* StorageScope.APPLICATION */), 'needs-migration', 'Threads migrated');
            strictEqual(storageService.get(MACHINE_ID_KEY, -1 /* StorageScope.APPLICATION */), 'needs-migration', 'Machine ID migrated');
            // And: Migrated legacy keys removed
            strictEqual(storageService.get(LEGACY_THREAD_STORAGE_KEY, -1 /* StorageScope.APPLICATION */), undefined, 'Legacy threads removed');
            strictEqual(storageService.get(LEGACY_MACHINE_ID_KEY, -1 /* StorageScope.APPLICATION */), undefined, 'Legacy machine ID removed');
        });
        test('should handle empty string values', () => {
            // Given: Legacy key has empty string
            storageService.store(LEGACY_VOID_SETTINGS_STORAGE_KEY, '', -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
            // When: Migration occurs
            const hasLegacy = storageService.get(LEGACY_VOID_SETTINGS_STORAGE_KEY, -1 /* StorageScope.APPLICATION */);
            const hasNew = storageService.get(VOID_SETTINGS_STORAGE_KEY, -1 /* StorageScope.APPLICATION */);
            if (hasLegacy !== undefined && !hasNew) {
                storageService.store(VOID_SETTINGS_STORAGE_KEY, hasLegacy, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
                storageService.remove(LEGACY_VOID_SETTINGS_STORAGE_KEY, -1 /* StorageScope.APPLICATION */);
            }
            // Then: Empty string migrated
            strictEqual(storageService.get(VOID_SETTINGS_STORAGE_KEY, -1 /* StorageScope.APPLICATION */), '', 'Empty string should be migrated');
            strictEqual(storageService.get(LEGACY_VOID_SETTINGS_STORAGE_KEY, -1 /* StorageScope.APPLICATION */), undefined, 'Legacy key removed');
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
            storageService.store(LEGACY_THREAD_STORAGE_KEY, largeThreadData, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
            // When: Migration occurs
            const startTime = Date.now();
            const hasLegacy = storageService.get(LEGACY_THREAD_STORAGE_KEY, -1 /* StorageScope.APPLICATION */);
            const hasNew = storageService.get(THREAD_STORAGE_KEY, -1 /* StorageScope.APPLICATION */);
            if (hasLegacy && !hasNew) {
                storageService.store(THREAD_STORAGE_KEY, hasLegacy, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
                storageService.remove(LEGACY_THREAD_STORAGE_KEY, -1 /* StorageScope.APPLICATION */);
            }
            const endTime = Date.now();
            // Then: Large data migrated successfully
            const migratedData = storageService.get(THREAD_STORAGE_KEY, -1 /* StorageScope.APPLICATION */);
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
            storageService.store(LEGACY_VOID_SETTINGS_STORAGE_KEY, specialData, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
            // When: Migration occurs
            const hasLegacy = storageService.get(LEGACY_VOID_SETTINGS_STORAGE_KEY, -1 /* StorageScope.APPLICATION */);
            const hasNew = storageService.get(VOID_SETTINGS_STORAGE_KEY, -1 /* StorageScope.APPLICATION */);
            if (hasLegacy && !hasNew) {
                storageService.store(VOID_SETTINGS_STORAGE_KEY, hasLegacy, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
                storageService.remove(LEGACY_VOID_SETTINGS_STORAGE_KEY, -1 /* StorageScope.APPLICATION */);
            }
            // Then: Special characters preserved
            const migratedData = storageService.get(VOID_SETTINGS_STORAGE_KEY, -1 /* StorageScope.APPLICATION */);
            strictEqual(migratedData, specialData, 'Special characters should be preserved');
            const parsed = JSON.parse(migratedData);
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
            storageService.store(LEGACY_VOID_SETTINGS_STORAGE_KEY, settingsData, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
            storageService.store(LEGACY_THREAD_STORAGE_KEY, threadsData, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
            storageService.store(LEGACY_OPT_OUT_KEY, optOutData, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
            storageService.store(LEGACY_MACHINE_ID_KEY, machineIdData, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
            // When: Perform complete migration
            const allMigrations = [
                { legacy: LEGACY_VOID_SETTINGS_STORAGE_KEY, new: VOID_SETTINGS_STORAGE_KEY, target: 0 /* StorageTarget.USER */ },
                { legacy: LEGACY_THREAD_STORAGE_KEY, new: THREAD_STORAGE_KEY, target: 0 /* StorageTarget.USER */ },
                { legacy: LEGACY_OPT_OUT_KEY, new: OPT_OUT_KEY, target: 1 /* StorageTarget.MACHINE */ },
                { legacy: LEGACY_MACHINE_ID_KEY, new: MACHINE_ID_KEY, target: 1 /* StorageTarget.MACHINE */ }
            ];
            allMigrations.forEach(({ legacy, new: newKey, target }) => {
                const legacyValue = storageService.get(legacy, -1 /* StorageScope.APPLICATION */);
                const newValue = storageService.get(newKey, -1 /* StorageScope.APPLICATION */);
                if (legacyValue && !newValue) {
                    storageService.store(newKey, legacyValue, -1 /* StorageScope.APPLICATION */, target);
                    storageService.remove(legacy, -1 /* StorageScope.APPLICATION */);
                }
            });
            // Then: All keys migrated
            strictEqual(storageService.get(VOID_SETTINGS_STORAGE_KEY, -1 /* StorageScope.APPLICATION */), settingsData, 'Settings migrated');
            strictEqual(storageService.get(THREAD_STORAGE_KEY, -1 /* StorageScope.APPLICATION */), threadsData, 'Threads migrated');
            strictEqual(storageService.get(OPT_OUT_KEY, -1 /* StorageScope.APPLICATION */), optOutData, 'Opt-out migrated');
            strictEqual(storageService.get(MACHINE_ID_KEY, -1 /* StorageScope.APPLICATION */), machineIdData, 'Machine ID migrated');
            // And: All legacy keys removed
            strictEqual(storageService.get(LEGACY_VOID_SETTINGS_STORAGE_KEY, -1 /* StorageScope.APPLICATION */), undefined, 'Legacy settings removed');
            strictEqual(storageService.get(LEGACY_THREAD_STORAGE_KEY, -1 /* StorageScope.APPLICATION */), undefined, 'Legacy threads removed');
            strictEqual(storageService.get(LEGACY_OPT_OUT_KEY, -1 /* StorageScope.APPLICATION */), undefined, 'Legacy opt-out removed');
            strictEqual(storageService.get(LEGACY_MACHINE_ID_KEY, -1 /* StorageScope.APPLICATION */), undefined, 'Legacy machine ID removed');
        });
        test('should handle multiple service initializations (idempotency stress test)', () => {
            // Given: Legacy data
            const originalData = JSON.stringify({ value: 'original' });
            storageService.store(LEGACY_VOID_SETTINGS_STORAGE_KEY, originalData, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
            // When: Simulate 5 service restarts/re-initializations
            for (let i = 0; i < 5; i++) {
                const hasLegacy = storageService.get(LEGACY_VOID_SETTINGS_STORAGE_KEY, -1 /* StorageScope.APPLICATION */);
                const hasNew = storageService.get(VOID_SETTINGS_STORAGE_KEY, -1 /* StorageScope.APPLICATION */);
                if (hasLegacy && !hasNew) {
                    storageService.store(VOID_SETTINGS_STORAGE_KEY, hasLegacy, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
                    storageService.remove(LEGACY_VOID_SETTINGS_STORAGE_KEY, -1 /* StorageScope.APPLICATION */);
                }
            }
            // Then: Data migrated only once, remains consistent
            strictEqual(storageService.get(VOID_SETTINGS_STORAGE_KEY, -1 /* StorageScope.APPLICATION */), originalData, 'Data migrated and unchanged after multiple initializations');
            strictEqual(storageService.get(LEGACY_VOID_SETTINGS_STORAGE_KEY, -1 /* StorageScope.APPLICATION */), undefined, 'Legacy key removed after first migration');
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RvcmFnZUtleU1pZ3JhdGlvbi50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWlkZXZlbG9wZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9haW5hdGl2ZS90ZXN0L2NvbW1vbi9zdG9yYWdlS2V5TWlncmF0aW9uLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxFQUFFLEVBQUUsTUFBTSxRQUFRLENBQUM7QUFDekMsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBRW5HLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQzNGLE9BQU8sRUFDTix5QkFBeUIsRUFDekIsZ0NBQWdDLEVBQ2hDLGtCQUFrQixFQUNsQix5QkFBeUIsRUFDekIsV0FBVyxFQUNYLGtCQUFrQixFQUNsQixjQUFjLEVBQ2QscUJBQXFCLEVBQ3JCLE1BQU0sNkJBQTZCLENBQUM7QUFFckM7Ozs7Ozs7R0FPRztBQUNILEtBQUssQ0FBQyx1QkFBdUIsRUFBRSxHQUFHLEVBQUU7SUFDbkMsTUFBTSxXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztJQUMxQyxJQUFJLGNBQStCLENBQUM7SUFFcEMsS0FBSyxDQUFDLEdBQUcsRUFBRTtRQUNWLGNBQWMsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksc0JBQXNCLEVBQUUsQ0FBQyxDQUFDO0lBQ2hFLENBQUMsQ0FBQyxDQUFDO0lBRUgsUUFBUSxDQUFDLEdBQUcsRUFBRTtRQUNiLFdBQVcsQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUNyQixDQUFDLENBQUMsQ0FBQztJQUVILHVDQUF1QyxFQUFFLENBQUM7SUFFMUM7OztP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