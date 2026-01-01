/*--------------------------------------------------------------------------------------
 *  Copyright 2025 AINative Studio All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import assert from 'assert';
import { IVoidSettingsService } from '../../common/voidSettingsService.js';
import { IStorageService, StorageScope, StorageTarget } from '../../../../../platform/storage/common/storage.js';
import { IEncryptionService } from '../../../../../platform/encryption/common/encryptionService.js';
import { TestStorageService } from '../../../../test/common/workbenchTestServices.js';
import { TestEncryptionService } from '../../../../../platform/encryption/test/common/testEncryptionService.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { IMetricsService } from '../../common/metricsService.js';

// Mock metrics service
class TestMetricsService implements IMetricsService {
	_serviceBrand: undefined;
	capture(_event: string, _properties?: Record<string, any>): void {
		// No-op for tests
	}
	setUser(_email: string | null): void {
		// No-op for tests
	}
	trackSignedIn(): void {
		// No-op for tests
	}
	trackSignedOut(): void {
		// No-op for tests
	}
}

suite('VoidSettingsService - Storage Migration', () => {
	const disposables = ensureNoDisposablesAreLeakedInTestSuite();

	test('Should migrate from void.settingsServiceStorageII to ainative.settingsServiceStorageII', async () => {
		const storageService = new TestStorageService();
		const encryptionService = new TestEncryptionService();
		const metricsService = new TestMetricsService();

		// Setup: Store data in old key
		const oldData = JSON.stringify({ test: 'data', version: '1.0' });
		const encryptedOldData = await encryptionService.encrypt(oldData);
		storageService.store('void.settingsServiceStorageII', encryptedOldData, StorageScope.APPLICATION, StorageTarget.USER);

		// Verify old key has data
		const storedOldData = storageService.get('void.settingsServiceStorageII', StorageScope.APPLICATION);
		assert.strictEqual(storedOldData, encryptedOldData, 'Old key should have data');

		// Verify new key doesn't exist
		const storedNewData = storageService.get('ainative.settingsServiceStorageII', StorageScope.APPLICATION);
		assert.strictEqual(storedNewData, undefined, 'New key should not exist initially');

		// TODO: Trigger migration (will be implemented in next step)
		// const settingsService = new VoidSettingsService(storageService, encryptionService, metricsService);
		// await settingsService.waitForInitState;

		// Verify migration happened
		// const migratedData = storageService.get('ainative.settingsServiceStorageII', StorageScope.APPLICATION);
		// assert.strictEqual(migratedData, encryptedOldData, 'New key should have migrated data');

		// Verify old key was removed
		// const oldKeyAfterMigration = storageService.get('void.settingsServiceStorageII', StorageScope.APPLICATION);
		// assert.strictEqual(oldKeyAfterMigration, undefined, 'Old key should be removed after migration');
	});

	test('Should NOT overwrite if ainative key already has data', async () => {
		const storageService = new TestStorageService();
		const encryptionService = new TestEncryptionService();
		const metricsService = new TestMetricsService();

		// Setup: Store data in both old and new keys
		const oldData = JSON.stringify({ test: 'old data' });
		const newData = JSON.stringify({ test: 'new data' });
		const encryptedOldData = await encryptionService.encrypt(oldData);
		const encryptedNewData = await encryptionService.encrypt(newData);

		storageService.store('void.settingsServiceStorageII', encryptedOldData, StorageScope.APPLICATION, StorageTarget.USER);
		storageService.store('ainative.settingsServiceStorageII', encryptedNewData, StorageScope.APPLICATION, StorageTarget.USER);

		// TODO: Trigger migration
		// const settingsService = new VoidSettingsService(storageService, encryptionService, metricsService);
		// await settingsService.waitForInitState;

		// Verify new key data is unchanged
		// const finalData = storageService.get('ainative.settingsServiceStorageII', StorageScope.APPLICATION);
		// assert.strictEqual(finalData, encryptedNewData, 'New key data should not be overwritten');

		// Verify old key still exists (since we didn't migrate)
		// const oldKeyData = storageService.get('void.settingsServiceStorageII', StorageScope.APPLICATION);
		// assert.strictEqual(oldKeyData, encryptedOldData, 'Old key should remain when new key already exists');
	});

	test('Should migrate all storage keys (4 keys total)', async () => {
		const storageService = new TestStorageService();
		const encryptionService = new TestEncryptionService();
		const metricsService = new TestMetricsService();

		// Setup: Store data in all 4 old keys
		const settingsData = JSON.stringify({ settings: 'test' });
		const chatData = JSON.stringify({ chat: 'history' });
		const optOutData = 'true';
		const machineIdData = 'machine-123-456';

		const encryptedSettings = await encryptionService.encrypt(settingsData);
		const encryptedChat = await encryptionService.encrypt(chatData);

		storageService.store('void.settingsServiceStorageII', encryptedSettings, StorageScope.APPLICATION, StorageTarget.USER);
		storageService.store('void.chatThreadStorageII', encryptedChat, StorageScope.APPLICATION, StorageTarget.USER);
		storageService.store('void.app.optOutAll', optOutData, StorageScope.APPLICATION, StorageTarget.USER);
		storageService.store('void.app.machineId', machineIdData, StorageScope.APPLICATION, StorageTarget.USER);

		// TODO: Trigger migration
		// const settingsService = new VoidSettingsService(storageService, encryptionService, metricsService);
		// await settingsService.waitForInitState;

		// Verify all 4 keys were migrated
		// assert.strictEqual(
		// 	storageService.get('ainative.settingsServiceStorageII', StorageScope.APPLICATION),
		// 	encryptedSettings,
		// 	'Settings key should be migrated'
		// );
		// assert.strictEqual(
		// 	storageService.get('ainative.chatThreadStorageII', StorageScope.APPLICATION),
		// 	encryptedChat,
		// 	'Chat thread key should be migrated'
		// );
		// assert.strictEqual(
		// 	storageService.get('ainative.app.optOutAll', StorageScope.APPLICATION),
		// 	optOutData,
		// 	'Opt out key should be migrated'
		// );
		// assert.strictEqual(
		// 	storageService.get('ainative.app.machineId', StorageScope.APPLICATION),
		// 	machineIdData,
		// 	'Machine ID key should be migrated'
		// );

		// Verify all old keys were removed
		// assert.strictEqual(storageService.get('void.settingsServiceStorageII', StorageScope.APPLICATION), undefined);
		// assert.strictEqual(storageService.get('void.chatThreadStorageII', StorageScope.APPLICATION), undefined);
		// assert.strictEqual(storageService.get('void.app.optOutAll', StorageScope.APPLICATION), undefined);
		// assert.strictEqual(storageService.get('void.app.machineId', StorageScope.APPLICATION), undefined);
	});

	test('Should log migration success', async () => {
		const storageService = new TestStorageService();
		const encryptionService = new TestEncryptionService();
		const metricsService = new TestMetricsService();

		// Capture console.log output
		const logMessages: string[] = [];
		const originalLog = console.log;
		console.log = (message: string) => {
			logMessages.push(message);
		};

		// Setup: Store data in old key
		const oldData = JSON.stringify({ test: 'data' });
		const encryptedOldData = await encryptionService.encrypt(oldData);
		storageService.store('void.settingsServiceStorageII', encryptedOldData, StorageScope.APPLICATION, StorageTarget.USER);

		// TODO: Trigger migration
		// const settingsService = new VoidSettingsService(storageService, encryptionService, metricsService);
		// await settingsService.waitForInitState;

		// Restore console.log
		console.log = originalLog;

		// Verify migration was logged
		// const migrationLog = logMessages.find(msg => msg.includes('[AINative Migration]'));
		// assert.ok(migrationLog, 'Migration should be logged');
		// assert.ok(migrationLog.includes('Successfully migrated'), 'Log should indicate success');
	});

	test('Should be idempotent (only migrate once)', async () => {
		const storageService = new TestStorageService();
		const encryptionService = new TestEncryptionService();
		const metricsService = new TestMetricsService();

		// Setup: Store data in old key
		const oldData = JSON.stringify({ test: 'data' });
		const encryptedOldData = await encryptionService.encrypt(oldData);
		storageService.store('void.settingsServiceStorageII', encryptedOldData, StorageScope.APPLICATION, StorageTarget.USER);

		// TODO: First migration
		// const settingsService1 = new VoidSettingsService(storageService, encryptionService, metricsService);
		// await settingsService1.waitForInitState;

		// Verify old key was removed
		// assert.strictEqual(
		// 	storageService.get('void.settingsServiceStorageII', StorageScope.APPLICATION),
		// 	undefined,
		// 	'Old key should be removed after first migration'
		// );

		// Manually add old key back to test idempotency
		// storageService.store('void.settingsServiceStorageII', encryptedOldData, StorageScope.APPLICATION, StorageTarget.USER);

		// TODO: Second migration attempt
		// const settingsService2 = new VoidSettingsService(storageService, encryptionService, metricsService);
		// await settingsService2.waitForInitState;

		// Verify new key data wasn't overwritten by second attempt
		// const finalData = storageService.get('ainative.settingsServiceStorageII', StorageScope.APPLICATION);
		// assert.strictEqual(finalData, encryptedOldData, 'Data should remain from first migration');

		// Old key should still be removed even though we added it back
		// (because migration checks if new key exists first)
		// assert.strictEqual(
		// 	storageService.get('void.settingsServiceStorageII', StorageScope.APPLICATION),
		// 	undefined,
		// 	'Old key should be removed even on second attempt'
		// );
	});
});
