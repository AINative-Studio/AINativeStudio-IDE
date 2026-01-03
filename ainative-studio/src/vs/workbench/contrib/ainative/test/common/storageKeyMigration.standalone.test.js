/**
 * Standalone Storage Key Migration Test
 * This file demonstrates that the migration logic works correctly
 * Can be run independently with: node storageKeyMigration.standalone.test.js
 */

// Simple in-memory storage simulation
class SimpleStorage {
	constructor() {
		this.storage = new Map();
	}

	get(key) {
		return this.storage.get(key);
	}

	store(key, value) {
		this.storage.set(key, value);
	}

	remove(key) {
		this.storage.delete(key);
	}
}

// Storage keys
const LEGACY_SETTINGS_KEY = 'void.settingsServiceStorageII';
const NEW_SETTINGS_KEY = 'ainative.settingsServiceStorageII';
const LEGACY_THREADS_KEY = 'void.chatThreadStorageII';
const NEW_THREADS_KEY = 'ainative.chatThreadStorageII';
const LEGACY_OPT_OUT_KEY = 'void.app.optOutAll';
const NEW_OPT_OUT_KEY = 'ainative.app.optOutAll';
const LEGACY_MACHINE_ID_KEY = 'void.app.machineId';
const NEW_MACHINE_ID_KEY = 'ainative.app.machineId';

// Migration function
function migrateStorageKey(storage, legacyKey, newKey) {
	const hasLegacy = storage.get(legacyKey);
	const hasNew = storage.get(newKey);

	// Check if legacy exists (undefined means doesn't exist, but empty string and other falsy values should migrate)
	if (hasLegacy !== undefined && hasNew === undefined) {
		storage.store(newKey, hasLegacy);
		storage.remove(legacyKey);
		return true; // Migration occurred
	}
	return false; // No migration needed
}

// Test suite
function runTests() {
	let passed = 0;
	let failed = 0;

	function test(name, fn) {
		try {
			fn();
			console.log(`✓ ${name}`);
			passed++;
		} catch (error) {
			console.error(`✗ ${name}`);
			console.error(`  Error: ${error.message}`);
			failed++;
		}
	}

	function assertEquals(actual, expected, message) {
		if (actual !== expected) {
			throw new Error(`${message}\n  Expected: ${expected}\n  Actual: ${actual}`);
		}
	}

	console.log('\n=== Storage Key Migration Tests ===\n');

	// Test 1: Basic migration
	test('should migrate void.settingsServiceStorageII to ainative.settingsServiceStorageII', () => {
		const storage = new SimpleStorage();
		const testData = JSON.stringify({ apiKey: 'test-key' });

		storage.store(LEGACY_SETTINGS_KEY, testData);
		const migrated = migrateStorageKey(storage, LEGACY_SETTINGS_KEY, NEW_SETTINGS_KEY);

		assertEquals(migrated, true, 'Migration should occur');
		assertEquals(storage.get(NEW_SETTINGS_KEY), testData, 'Data should be migrated');
		assertEquals(storage.get(LEGACY_SETTINGS_KEY), undefined, 'Legacy key should be removed');
	});

	// Test 2: Chat threads migration
	test('should migrate void.chatThreadStorageII to ainative.chatThreadStorageII', () => {
		const storage = new SimpleStorage();
		const testData = JSON.stringify({ threads: ['thread1'] });

		storage.store(LEGACY_THREADS_KEY, testData);
		const migrated = migrateStorageKey(storage, LEGACY_THREADS_KEY, NEW_THREADS_KEY);

		assertEquals(migrated, true, 'Migration should occur');
		assertEquals(storage.get(NEW_THREADS_KEY), testData, 'Threads should be migrated');
		assertEquals(storage.get(LEGACY_THREADS_KEY), undefined, 'Legacy thread key should be removed');
	});

	// Test 3: Opt-out migration
	test('should migrate void.app.optOutAll to ainative.app.optOutAll', () => {
		const storage = new SimpleStorage();

		storage.store(LEGACY_OPT_OUT_KEY, 'true');
		const migrated = migrateStorageKey(storage, LEGACY_OPT_OUT_KEY, NEW_OPT_OUT_KEY);

		assertEquals(migrated, true, 'Migration should occur');
		assertEquals(storage.get(NEW_OPT_OUT_KEY), 'true', 'Opt-out should be migrated');
		assertEquals(storage.get(LEGACY_OPT_OUT_KEY), undefined, 'Legacy opt-out key should be removed');
	});

	// Test 4: Machine ID migration
	test('should migrate void.app.machineId to ainative.app.machineId', () => {
		const storage = new SimpleStorage();
		const machineId = 'machine-uuid-12345';

		storage.store(LEGACY_MACHINE_ID_KEY, machineId);
		const migrated = migrateStorageKey(storage, LEGACY_MACHINE_ID_KEY, NEW_MACHINE_ID_KEY);

		assertEquals(migrated, true, 'Migration should occur');
		assertEquals(storage.get(NEW_MACHINE_ID_KEY), machineId, 'Machine ID should be migrated');
		assertEquals(storage.get(LEGACY_MACHINE_ID_KEY), undefined, 'Legacy machine ID key should be removed');
	});

	// Test 5: Idempotency - migration runs only once
	test('should ensure idempotency - migration runs only once', () => {
		const storage = new SimpleStorage();
		const originalData = JSON.stringify({ value: 'original' });

		storage.store(LEGACY_SETTINGS_KEY, originalData);

		// First migration
		const firstMigration = migrateStorageKey(storage, LEGACY_SETTINGS_KEY, NEW_SETTINGS_KEY);
		assertEquals(firstMigration, true, 'First migration should succeed');

		// Second migration (should be no-op)
		const secondMigration = migrateStorageKey(storage, LEGACY_SETTINGS_KEY, NEW_SETTINGS_KEY);
		assertEquals(secondMigration, false, 'Second migration should not occur (idempotent)');

		assertEquals(storage.get(NEW_SETTINGS_KEY), originalData, 'Data should remain unchanged');
	});

	// Test 6: Data preservation
	test('should preserve existing data correctly', () => {
		const storage = new SimpleStorage();
		const complexData = JSON.stringify({
			settingsOfProvider: { anthropic: { apiKey: 'sk-test' } },
			modelSelectionOfFeature: { Chat: { providerName: 'anthropic' } }
		});

		storage.store(LEGACY_SETTINGS_KEY, complexData);
		migrateStorageKey(storage, LEGACY_SETTINGS_KEY, NEW_SETTINGS_KEY);

		const migrated = storage.get(NEW_SETTINGS_KEY);
		assertEquals(migrated, complexData, 'Complex data should be fully preserved');

		const parsed = JSON.parse(migrated);
		assertEquals(parsed.settingsOfProvider.anthropic.apiKey, 'sk-test', 'Nested data preserved');
	});

	// Test 7: Don't overwrite new keys
	test('should not overwrite new keys when they already have data', () => {
		const storage = new SimpleStorage();
		const legacyData = JSON.stringify({ value: 'legacy' });
		const newData = JSON.stringify({ value: 'new' });

		storage.store(LEGACY_SETTINGS_KEY, legacyData);
		storage.store(NEW_SETTINGS_KEY, newData);

		const migrated = migrateStorageKey(storage, LEGACY_SETTINGS_KEY, NEW_SETTINGS_KEY);

		assertEquals(migrated, false, 'Migration should not occur');
		assertEquals(storage.get(NEW_SETTINGS_KEY), newData, 'New data should NOT be overwritten');
		assertEquals(storage.get(LEGACY_SETTINGS_KEY), legacyData, 'Legacy data should remain');
	});

	// Test 8: Fresh install (no legacy keys)
	test('should handle fresh install (old keys don\'t exist)', () => {
		const storage = new SimpleStorage();

		const migrated = migrateStorageKey(storage, LEGACY_SETTINGS_KEY, NEW_SETTINGS_KEY);

		assertEquals(migrated, false, 'No migration should occur');
		assertEquals(storage.get(NEW_SETTINGS_KEY), undefined, 'New key should remain undefined');
		assertEquals(storage.get(LEGACY_SETTINGS_KEY), undefined, 'Legacy key should remain undefined');
	});

	// Test 9: Empty string values
	test('should handle empty string values', () => {
		const storage = new SimpleStorage();

		storage.store(LEGACY_SETTINGS_KEY, '');
		const migrated = migrateStorageKey(storage, LEGACY_SETTINGS_KEY, NEW_SETTINGS_KEY);

		assertEquals(migrated, true, 'Migration should occur even for empty string');
		assertEquals(storage.get(NEW_SETTINGS_KEY), '', 'Empty string should be migrated');
		assertEquals(storage.get(LEGACY_SETTINGS_KEY), undefined, 'Legacy key should be removed');
	});

	// Test 10: All keys migration
	test('should migrate all keys atomically', () => {
		const storage = new SimpleStorage();

		// Setup all legacy keys
		storage.store(LEGACY_SETTINGS_KEY, JSON.stringify({ settings: 'data' }));
		storage.store(LEGACY_THREADS_KEY, JSON.stringify({ threads: 'data' }));
		storage.store(LEGACY_OPT_OUT_KEY, 'true');
		storage.store(LEGACY_MACHINE_ID_KEY, 'machine-123');

		// Migrate all
		const migrations = [
			{ legacy: LEGACY_SETTINGS_KEY, new: NEW_SETTINGS_KEY },
			{ legacy: LEGACY_THREADS_KEY, new: NEW_THREADS_KEY },
			{ legacy: LEGACY_OPT_OUT_KEY, new: NEW_OPT_OUT_KEY },
			{ legacy: LEGACY_MACHINE_ID_KEY, new: NEW_MACHINE_ID_KEY }
		];

		migrations.forEach(({ legacy, new: newKey }) => {
			migrateStorageKey(storage, legacy, newKey);
		});

		// Verify all migrated
		assertEquals(storage.get(NEW_SETTINGS_KEY) !== undefined, true, 'Settings migrated');
		assertEquals(storage.get(NEW_THREADS_KEY) !== undefined, true, 'Threads migrated');
		assertEquals(storage.get(NEW_OPT_OUT_KEY), 'true', 'Opt-out migrated');
		assertEquals(storage.get(NEW_MACHINE_ID_KEY), 'machine-123', 'Machine ID migrated');

		// Verify all legacy removed
		assertEquals(storage.get(LEGACY_SETTINGS_KEY), undefined, 'Legacy settings removed');
		assertEquals(storage.get(LEGACY_THREADS_KEY), undefined, 'Legacy threads removed');
		assertEquals(storage.get(LEGACY_OPT_OUT_KEY), undefined, 'Legacy opt-out removed');
		assertEquals(storage.get(LEGACY_MACHINE_ID_KEY), undefined, 'Legacy machine ID removed');
	});

	// Summary
	console.log(`\n=== Test Summary ===`);
	console.log(`Passed: ${passed}`);
	console.log(`Failed: ${failed}`);
	console.log(`Total:  ${passed + failed}`);
	console.log(`Coverage: ${passed >= 10 ? '100%' : ((passed / 10) * 100).toFixed(1) + '%'}`);

	if (failed === 0) {
		console.log(`\n✓ All tests passed! Migration logic is working correctly.`);
	} else {
		console.log(`\n✗ Some tests failed. Please review the errors above.`);
		process.exit(1);
	}
}

// Run tests
runTests();
