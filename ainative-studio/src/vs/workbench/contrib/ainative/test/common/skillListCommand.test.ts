/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { executeListCommand, ListCommandOptions } from '../../common/skills/cli/listCommand.js';
import { ISkillsRegistry, RegistryEntry } from '../../common/skills/skillRegistryTypes.js';
import { ISkillConfigService } from '../../common/skills/skillConfigServiceTypes.js';

/**
 * Mock Skills Registry for testing
 */
class MockSkillsRegistry implements Partial<ISkillsRegistry> {
	private skills: RegistryEntry[] = [];

	setSkills(skills: RegistryEntry[]): void {
		this.skills = skills;
	}

	async list(): Promise<RegistryEntry[]> {
		return this.skills;
	}
}

/**
 * Mock Skill Config Service for testing
 */
class MockSkillConfigService implements Partial<ISkillConfigService> {
	private enabledSkills: string[] = [];

	setEnabledSkills(skills: string[]): void {
		this.enabledSkills = skills;
	}

	async getEnabledSkills(): Promise<string[]> {
		return this.enabledSkills;
	}
}

suite('Skill List Command', () => {
	let mockRegistry: MockSkillsRegistry;
	let mockConfigService: MockSkillConfigService;

	setup(() => {
		mockRegistry = new MockSkillsRegistry();
		mockConfigService = new MockSkillConfigService();
	});

	test('should list all installed skills with correct status', async () => {
		// Arrange
		const installedSkills: RegistryEntry[] = [
			{
				name: 'git-workflow',
				version: '1.0.0',
				installedAt: Date.now(),
				source: 'local',
				path: '/path/to/git-workflow'
			},
			{
				name: 'mandatory-tdd',
				version: '2.0.0',
				installedAt: Date.now(),
				source: 'npm',
				path: '/path/to/mandatory-tdd'
			},
			{
				name: 'code-quality',
				version: '1.5.0',
				installedAt: Date.now(),
				source: 'git',
				path: '/path/to/code-quality'
			}
		];

		const enabledSkills = ['git-workflow', 'mandatory-tdd'];

		mockRegistry.setSkills(installedSkills);
		mockConfigService.setEnabledSkills(enabledSkills);

		// Act
		const result = await executeListCommand(
			mockRegistry as unknown as ISkillsRegistry,
			mockConfigService as unknown as ISkillConfigService
		);

		// Assert
		assert.strictEqual(result.totalCount, 3, 'Total count should be 3');
		assert.strictEqual(result.enabledCount, 2, 'Enabled count should be 2');
		assert.strictEqual(result.disabledCount, 1, 'Disabled count should be 1');
		assert.strictEqual(result.skills.length, 3, 'Should return 3 skills');

		// Check individual skills
		const gitWorkflow = result.skills.find(s => s.name === 'git-workflow');
		assert.ok(gitWorkflow, 'git-workflow should be in results');
		assert.strictEqual(gitWorkflow!.enabled, true, 'git-workflow should be enabled');
		assert.strictEqual(gitWorkflow!.statusIcon, '✅', 'git-workflow should have enabled icon');
		assert.strictEqual(gitWorkflow!.source, 'local', 'git-workflow source should be local');

		const codeQuality = result.skills.find(s => s.name === 'code-quality');
		assert.ok(codeQuality, 'code-quality should be in results');
		assert.strictEqual(codeQuality!.enabled, false, 'code-quality should be disabled');
		assert.strictEqual(codeQuality!.statusIcon, '❌', 'code-quality should have disabled icon');
		assert.strictEqual(codeQuality!.source, 'community', 'code-quality source should be community');
	});

	test('should filter enabled skills only', async () => {
		// Arrange
		const installedSkills: RegistryEntry[] = [
			{ name: 'skill-1', version: '1.0.0', installedAt: Date.now(), source: 'local', path: '/path/1' },
			{ name: 'skill-2', version: '1.0.0', installedAt: Date.now(), source: 'local', path: '/path/2' },
			{ name: 'skill-3', version: '1.0.0', installedAt: Date.now(), source: 'local', path: '/path/3' }
		];

		mockRegistry.setSkills(installedSkills);
		mockConfigService.setEnabledSkills(['skill-1', 'skill-3']);

		const options: ListCommandOptions = { enabled: true };

		// Act
		const result = await executeListCommand(
			mockRegistry as unknown as ISkillsRegistry,
			mockConfigService as unknown as ISkillConfigService,
			options
		);

		// Assert
		assert.strictEqual(result.skills.length, 2, 'Should return only 2 enabled skills');
		assert.ok(result.skills.every(s => s.enabled), 'All returned skills should be enabled');
		assert.ok(result.skills.find(s => s.name === 'skill-1'), 'skill-1 should be in results');
		assert.ok(result.skills.find(s => s.name === 'skill-3'), 'skill-3 should be in results');
		assert.ok(!result.skills.find(s => s.name === 'skill-2'), 'skill-2 should not be in results');
	});

	test('should filter disabled skills only', async () => {
		// Arrange
		const installedSkills: RegistryEntry[] = [
			{ name: 'skill-1', version: '1.0.0', installedAt: Date.now(), source: 'local', path: '/path/1' },
			{ name: 'skill-2', version: '1.0.0', installedAt: Date.now(), source: 'local', path: '/path/2' },
			{ name: 'skill-3', version: '1.0.0', installedAt: Date.now(), source: 'local', path: '/path/3' }
		];

		mockRegistry.setSkills(installedSkills);
		mockConfigService.setEnabledSkills(['skill-1']);

		const options: ListCommandOptions = { disabled: true };

		// Act
		const result = await executeListCommand(
			mockRegistry as unknown as ISkillsRegistry,
			mockConfigService as unknown as ISkillConfigService,
			options
		);

		// Assert
		assert.strictEqual(result.skills.length, 2, 'Should return only 2 disabled skills');
		assert.ok(result.skills.every(s => !s.enabled), 'All returned skills should be disabled');
		assert.ok(result.skills.find(s => s.name === 'skill-2'), 'skill-2 should be in results');
		assert.ok(result.skills.find(s => s.name === 'skill-3'), 'skill-3 should be in results');
	});

	test('should handle empty skill list', async () => {
		// Arrange
		mockRegistry.setSkills([]);
		mockConfigService.setEnabledSkills([]);

		// Act
		const result = await executeListCommand(
			mockRegistry as unknown as ISkillsRegistry,
			mockConfigService as unknown as ISkillConfigService
		);

		// Assert
		assert.strictEqual(result.totalCount, 0, 'Total count should be 0');
		assert.strictEqual(result.enabledCount, 0, 'Enabled count should be 0');
		assert.strictEqual(result.disabledCount, 0, 'Disabled count should be 0');
		assert.strictEqual(result.skills.length, 0, 'Should return empty array');
		assert.ok(result.output.includes('No skills installed'), 'Output should indicate no skills');
	});

	test('should sort skills with enabled first, then alphabetically', async () => {
		// Arrange
		const installedSkills: RegistryEntry[] = [
			{ name: 'zebra', version: '1.0.0', installedAt: Date.now(), source: 'local', path: '/path/zebra' },
			{ name: 'alpha', version: '1.0.0', installedAt: Date.now(), source: 'local', path: '/path/alpha' },
			{ name: 'beta', version: '1.0.0', installedAt: Date.now(), source: 'local', path: '/path/beta' }
		];

		mockRegistry.setSkills(installedSkills);
		mockConfigService.setEnabledSkills(['zebra', 'alpha']); // Enable in non-alphabetical order

		// Act
		const result = await executeListCommand(
			mockRegistry as unknown as ISkillsRegistry,
			mockConfigService as unknown as ISkillConfigService
		);

		// Assert
		assert.strictEqual(result.skills[0].name, 'alpha', 'First should be alpha (enabled, alphabetically first)');
		assert.strictEqual(result.skills[1].name, 'zebra', 'Second should be zebra (enabled, alphabetically second)');
		assert.strictEqual(result.skills[2].name, 'beta', 'Third should be beta (disabled)');
	});

	test('should format output correctly for all skills', async () => {
		// Arrange
		const installedSkills: RegistryEntry[] = [
			{ name: 'skill-1', version: '1.0.0', installedAt: Date.now(), source: 'local', path: '/path/1' }
		];

		mockRegistry.setSkills(installedSkills);
		mockConfigService.setEnabledSkills(['skill-1']);

		// Act
		const result = await executeListCommand(
			mockRegistry as unknown as ISkillsRegistry,
			mockConfigService as unknown as ISkillConfigService
		);

		// Assert
		assert.ok(result.output.includes('Installed Skills:'), 'Output should have header');
		assert.ok(result.output.includes('skill-1'), 'Output should include skill name');
		assert.ok(result.output.includes('1.0.0'), 'Output should include version');
		assert.ok(result.output.includes('Total: 1 skill'), 'Output should include summary');
	});

	test('should format output correctly for enabled filter', async () => {
		// Arrange
		const installedSkills: RegistryEntry[] = [
			{ name: 'skill-1', version: '1.0.0', installedAt: Date.now(), source: 'local', path: '/path/1' },
			{ name: 'skill-2', version: '1.0.0', installedAt: Date.now(), source: 'local', path: '/path/2' }
		];

		mockRegistry.setSkills(installedSkills);
		mockConfigService.setEnabledSkills(['skill-1']);

		const options: ListCommandOptions = { enabled: true };

		// Act
		const result = await executeListCommand(
			mockRegistry as unknown as ISkillsRegistry,
			mockConfigService as unknown as ISkillConfigService,
			options
		);

		// Assert
		assert.ok(result.output.includes('Enabled Skills:'), 'Output should have enabled header');
		assert.ok(result.output.includes('Total: 1 enabled skill'), 'Output should include enabled count');
	});

	test('should handle all disabled skills', async () => {
		// Arrange
		const installedSkills: RegistryEntry[] = [
			{ name: 'skill-1', version: '1.0.0', installedAt: Date.now(), source: 'local', path: '/path/1' }
		];

		mockRegistry.setSkills(installedSkills);
		mockConfigService.setEnabledSkills([]); // No enabled skills

		// Act
		const result = await executeListCommand(
			mockRegistry as unknown as ISkillsRegistry,
			mockConfigService as unknown as ISkillConfigService
		);

		// Assert
		assert.strictEqual(result.enabledCount, 0, 'Enabled count should be 0');
		assert.strictEqual(result.disabledCount, 1, 'Disabled count should be 1');
		assert.strictEqual(result.skills[0].enabled, false, 'Skill should be disabled');
	});
});
