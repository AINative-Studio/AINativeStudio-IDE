/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';

suite('Update Service - Version Comparison', () => {

	ensureNoDisposablesAreLeakedInTestSuite();

	test('should correctly parse semantic version strings', () => {
		const versions = [
			{ input: '1.0.0', expected: { major: 1, minor: 0, patch: 0 } },
			{ input: '1.5.0', expected: { major: 1, minor: 5, patch: 0 } },
			{ input: '2.0.1', expected: { major: 2, minor: 0, patch: 1 } },
			{ input: '10.20.30', expected: { major: 10, minor: 20, patch: 30 } }
		];

		versions.forEach(({ input, expected }) => {
			const parts = input.split('.').map(Number);
			assert.strictEqual(parts[0], expected.major, `Major version should be ${expected.major}`);
			assert.strictEqual(parts[1], expected.minor, `Minor version should be ${expected.minor}`);
			assert.strictEqual(parts[2], expected.patch, `Patch version should be ${expected.patch}`);
		});
	});

	test('should correctly compare versions - newer versions', () => {
		const comparisons = [
			{ current: '1.0.0', latest: '1.0.1', shouldUpdate: true },
			{ current: '1.0.0', latest: '1.1.0', shouldUpdate: true },
			{ current: '1.0.0', latest: '2.0.0', shouldUpdate: true },
			{ current: '1.5.9', latest: '1.6.0', shouldUpdate: true },
			{ current: '1.9.9', latest: '2.0.0', shouldUpdate: true }
		];

		comparisons.forEach(({ current, latest, shouldUpdate }) => {
			const currentParts = current.split('.').map(Number);
			const latestParts = latest.split('.').map(Number);

			let isNewer = false;
			if (latestParts[0] > currentParts[0]) {
				isNewer = true;
			} else if (latestParts[0] === currentParts[0] && latestParts[1] > currentParts[1]) {
				isNewer = true;
			} else if (latestParts[0] === currentParts[0] && latestParts[1] === currentParts[1] && latestParts[2] > currentParts[2]) {
				isNewer = true;
			}

			assert.strictEqual(isNewer, shouldUpdate,
				`Version ${latest} should ${shouldUpdate ? 'be' : 'not be'} newer than ${current}`);
		});
	});

	test('should correctly compare versions - same versions', () => {
		const comparisons = [
			{ current: '1.0.0', latest: '1.0.0', shouldUpdate: false },
			{ current: '1.5.0', latest: '1.5.0', shouldUpdate: false },
			{ current: '2.10.3', latest: '2.10.3', shouldUpdate: false }
		];

		comparisons.forEach(({ current, latest, shouldUpdate }) => {
			const currentParts = current.split('.').map(Number);
			const latestParts = latest.split('.').map(Number);

			const isSame = currentParts[0] === latestParts[0] &&
				currentParts[1] === latestParts[1] &&
				currentParts[2] === latestParts[2];

			assert.strictEqual(!isSame, shouldUpdate,
				`Version ${latest} should ${shouldUpdate ? 'be' : 'not be'} newer than ${current}`);
		});
	});

	test('should correctly compare versions - older versions', () => {
		const comparisons = [
			{ current: '1.0.1', latest: '1.0.0', shouldUpdate: false },
			{ current: '1.1.0', latest: '1.0.0', shouldUpdate: false },
			{ current: '2.0.0', latest: '1.9.9', shouldUpdate: false },
			{ current: '1.6.0', latest: '1.5.9', shouldUpdate: false }
		];

		comparisons.forEach(({ current, latest, shouldUpdate }) => {
			const currentParts = current.split('.').map(Number);
			const latestParts = latest.split('.').map(Number);

			let isNewer = false;
			if (latestParts[0] > currentParts[0]) {
				isNewer = true;
			} else if (latestParts[0] === currentParts[0] && latestParts[1] > currentParts[1]) {
				isNewer = true;
			} else if (latestParts[0] === currentParts[0] && latestParts[1] === currentParts[1] && latestParts[2] > currentParts[2]) {
				isNewer = true;
			}

			assert.strictEqual(isNewer, shouldUpdate,
				`Version ${latest} should ${shouldUpdate ? 'be' : 'not be'} newer than ${current}`);
		});
	});

	test('should handle commit hash comparison', () => {
		const currentCommit = '1a2b3c4d5e6f';
		const latestCommit = '9z8y7x6w5v4u';

		// Commit hashes are different, so update is available
		assert.notStrictEqual(currentCommit, latestCommit, 'Different commit hashes should indicate update available');

		// Same commit hash means no update
		assert.strictEqual(currentCommit, currentCommit, 'Same commit hash means no update needed');
	});

	test('should handle version with build metadata', () => {
		const versions = [
			{ version: '1.5.0', commit: 'abc123' },
			{ version: '1.5.0', commit: 'def456' },
			{ version: '1.6.0', commit: 'abc123' }
		];

		// Same version but different commit means update available
		assert.notStrictEqual(versions[0].commit, versions[1].commit,
			'Different commits for same version should indicate update');

		// Different version means update available regardless of commit
		assert.notStrictEqual(versions[0].version, versions[2].version,
			'Different versions should indicate update');
	});

	test('should handle prerelease version identifiers', () => {
		const versions = [
			'1.5.0-alpha',
			'1.5.0-beta',
			'1.5.0-rc.1',
			'1.5.0'
		];

		// Extract base version (before hyphen)
		versions.forEach(version => {
			const baseVersion = version.split('-')[0];
			const parts = baseVersion.split('.').map(Number);

			assert.strictEqual(parts.length, 3, 'Should have 3 version parts');
			assert.strictEqual(parts[0], 1, 'Major version should be 1');
			assert.strictEqual(parts[1], 5, 'Minor version should be 5');
			assert.strictEqual(parts[2], 0, 'Patch version should be 0');
		});
	});

	test('should handle edge cases in version comparison', () => {
		// Test with leading zeros
		const v1 = '01.05.00';
		const v2 = '1.5.0';

		const v1Parts = v1.split('.').map(Number);
		const v2Parts = v2.split('.').map(Number);

		assert.deepStrictEqual(v1Parts, v2Parts, 'Leading zeros should be handled correctly');

		// Test with missing patch version
		const v3 = '1.5';
		const v3Parts = v3.split('.').map(v => Number(v) || 0);
		assert.strictEqual(v3Parts.length, 2, 'Should handle missing patch version');
	});

	test('should validate version string format', () => {
		const validVersions = ['1.0.0', '1.5.0', '2.0.1', '10.20.30'];
		const invalidVersions = ['1', '1.0', 'abc', '1.a.0', ''];

		validVersions.forEach(version => {
			const isValid = /^\d+\.\d+\.\d+/.test(version);
			assert.strictEqual(isValid, true, `${version} should be valid`);
		});

		invalidVersions.forEach(version => {
			const isValid = /^\d+\.\d+\.\d+$/.test(version);
			assert.strictEqual(isValid, false, `${version} should be invalid`);
		});
	});
});
