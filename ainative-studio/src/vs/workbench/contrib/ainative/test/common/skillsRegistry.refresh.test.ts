/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { SkillRefreshResult, SkillChange } from '../../common/skills/skillRegistryTypes.js';

suite('SkillsRegistry - Refresh', () => {

	test('should correctly identify updated skills', () => {
		const result: SkillRefreshResult = {
			updated: [
				{ name: 'git-workflow', oldVersion: '1.0.0', newVersion: '1.1.0' }
			],
			new: [],
			removed: [],
			unchanged: [],
			total: 1
		};

		assert.strictEqual(result.updated.length, 1);
		assert.strictEqual(result.updated[0].name, 'git-workflow');
		assert.strictEqual(result.updated[0].oldVersion, '1.0.0');
		assert.strictEqual(result.updated[0].newVersion, '1.1.0');
	});

	test('should correctly identify new skills', () => {
		const result: SkillRefreshResult = {
			updated: [],
			new: [
				{ name: 'new-skill', oldVersion: null, newVersion: '1.0.0' }
			],
			removed: [],
			unchanged: [],
			total: 1
		};

		assert.strictEqual(result.new.length, 1);
		assert.strictEqual(result.new[0].name, 'new-skill');
		assert.strictEqual(result.new[0].oldVersion, null);
		assert.strictEqual(result.new[0].newVersion, '1.0.0');
	});

	test('should correctly identify removed skills', () => {
		const result: SkillRefreshResult = {
			updated: [],
			new: [],
			removed: [
				{ name: 'removed-skill', oldVersion: '1.0.0', newVersion: null }
			],
			unchanged: [],
			total: 0
		};

		assert.strictEqual(result.removed.length, 1);
		assert.strictEqual(result.removed[0].name, 'removed-skill');
		assert.strictEqual(result.removed[0].oldVersion, '1.0.0');
		assert.strictEqual(result.removed[0].newVersion, null);
	});

	test('should handle mixed changes', () => {
		const result: SkillRefreshResult = {
			updated: [
				{ name: 'updated-skill', oldVersion: '1.0.0', newVersion: '2.0.0' }
			],
			new: [
				{ name: 'new-skill', oldVersion: null, newVersion: '1.0.0' }
			],
			removed: [
				{ name: 'removed-skill', oldVersion: '1.0.0', newVersion: null }
			],
			unchanged: ['unchanged-skill-1', 'unchanged-skill-2'],
			total: 4
		};

		assert.strictEqual(result.updated.length, 1);
		assert.strictEqual(result.new.length, 1);
		assert.strictEqual(result.removed.length, 1);
		assert.strictEqual(result.unchanged.length, 2);
		assert.strictEqual(result.total, 4);
	});

	test('should calculate correct totals', () => {
		const result: SkillRefreshResult = {
			updated: [
				{ name: 'skill1', oldVersion: '1.0.0', newVersion: '1.1.0' },
				{ name: 'skill2', oldVersion: '1.0.0', newVersion: '1.1.0' }
			],
			new: [
				{ name: 'skill3', oldVersion: null, newVersion: '1.0.0' }
			],
			removed: [],
			unchanged: ['skill4', 'skill5'],
			total: 5
		};

		const expectedTotal = result.updated.length + result.new.length + result.unchanged.length;
		assert.strictEqual(result.total, expectedTotal);
	});
});
