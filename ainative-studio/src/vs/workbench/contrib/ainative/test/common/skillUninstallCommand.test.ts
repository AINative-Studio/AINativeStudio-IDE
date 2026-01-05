/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { IDialogService } from '../../../../../platform/dialogs/common/dialogs.js';
import { ISkillsRegistry, RegistryEntry } from '../../common/skills/skillRegistryTypes.js';
import { SkillUninstallService } from '../../common/skills/cli/uninstallCommand.js';

suite('SkillUninstallCommand', () => {
	let instantiationService: TestInstantiationService;
	let uninstallService: SkillUninstallService;

	const mockSkill: RegistryEntry = {
		name: 'test-skill',
		version: '1.0.0',
		installedAt: Date.now(),
		source: 'local',
		path: '/home/user/.ainative/skills/test-skill'
	};

	setup(() => {
		instantiationService = new TestInstantiationService();

		// Mock registry
		const mockRegistry = {
			get: async (skillName: string) => {
				if (skillName === 'test-skill') {
					return mockSkill;
				}
				return null;
			},
			uninstall: async () => { }
		} as any;

		// Mock dialog service
		const mockDialogService = {
			confirm: async () => ({ confirmed: true })
		} as any;

		instantiationService.stub(ISkillsRegistry, mockRegistry);
		instantiationService.stub(IDialogService, mockDialogService);

		uninstallService = instantiationService.createInstance(SkillUninstallService);
	});

	suite('uninstall', () => {
		test('should uninstall skill successfully', async () => {
			const result = await uninstallService.uninstall({
				skillName: 'test-skill'
			});

			assert.strictEqual(result.success, true);
			assert.strictEqual(result.skillName, 'test-skill');
		});

		test('should show confirmation dialog by default', async () => {
			const mockDialogService = instantiationService.stub(IDialogService, 'dialogService');
			let confirmCalled = false;
			mockDialogService.confirm = async (options: any) => {
				confirmCalled = true;
				assert.ok(options.message.includes('test-skill'));
				assert.ok(options.detail.includes('1.0.0'));
				return { confirmed: true };
			};

			await uninstallService.uninstall({
				skillName: 'test-skill'
			});

			assert.strictEqual(confirmCalled, true);
		});

		test('should skip confirmation when skipConfirmation is true', async () => {
			const mockDialogService = instantiationService.stub(IDialogService, 'dialogService');
			let confirmCalled = false;
			mockDialogService.confirm = async () => {
				confirmCalled = true;
				return { confirmed: true };
			};

			await uninstallService.uninstall({
				skillName: 'test-skill',
				skipConfirmation: true
			});

			assert.strictEqual(confirmCalled, false);
		});

		test('should throw error when user cancels confirmation', async () => {
			const mockDialogService = instantiationService.stub(IDialogService, 'dialogService');
			mockDialogService.confirm = async () => ({ confirmed: false });

			await assert.rejects(
				async () => uninstallService.uninstall({ skillName: 'test-skill' }),
				/cancelled by user/
			);
		});

		test('should throw error when skill is not installed', async () => {
			await assert.rejects(
				async () => uninstallService.uninstall({ skillName: 'non-existent' }),
				/is not installed/
			);
		});

		test('should call registry.uninstall', async () => {
			const mockRegistry = instantiationService.stub(ISkillsRegistry);
			let uninstallCalled = false;
			let uninstalledSkillName = '';

			mockRegistry.uninstall = async (skillName: string) => {
				uninstallCalled = true;
				uninstalledSkillName = skillName;
			};

			await uninstallService.uninstall({
				skillName: 'test-skill',
				skipConfirmation: true
			});

			assert.strictEqual(uninstallCalled, true);
			assert.strictEqual(uninstalledSkillName, 'test-skill');
		});

		test('should handle registry errors', async () => {
			const mockRegistry = instantiationService.stub(ISkillsRegistry);
			mockRegistry.uninstall = async () => {
				throw new Error('Permission denied');
			};

			await assert.rejects(
				async () => uninstallService.uninstall({
					skillName: 'test-skill',
					skipConfirmation: true
				}),
				/Permission denied/
			);
		});
	});

	suite('uninstallMultiple', () => {
		test('should uninstall multiple skills', async () => {
			const mockRegistry = instantiationService.stub(ISkillsRegistry);
			mockRegistry.get = async (skillName: string) => {
				if (skillName === 'skill1' || skillName === 'skill2') {
					return { ...mockSkill, name: skillName };
				}
				return null;
			};

			const results = await uninstallService.uninstallMultiple(['skill1', 'skill2'], true);

			assert.strictEqual(results.length, 2);
			assert.strictEqual(results[0].success, true);
			assert.strictEqual(results[0].skillName, 'skill1');
			assert.strictEqual(results[1].success, true);
			assert.strictEqual(results[1].skillName, 'skill2');
		});

		test('should continue on individual failures', async () => {
			const mockRegistry = instantiationService.stub(ISkillsRegistry);
			mockRegistry.get = async (skillName: string) => {
				if (skillName === 'skill1') {
					return { ...mockSkill, name: skillName };
				}
				return null; // skill2 not found
			};

			const results = await uninstallService.uninstallMultiple(['skill1', 'skill2'], true);

			assert.strictEqual(results.length, 2);
			assert.strictEqual(results[0].success, true);
			assert.strictEqual(results[0].skillName, 'skill1');
			assert.strictEqual(results[1].success, false);
			assert.strictEqual(results[1].skillName, 'skill2');
		});

		test('should respect skipConfirmation flag', async () => {
			const mockDialogService = instantiationService.stub(IDialogService, 'dialogService');
			let confirmCallCount = 0;
			mockDialogService.confirm = async () => {
				confirmCallCount++;
				return { confirmed: true };
			};

			const mockRegistry = instantiationService.stub(ISkillsRegistry);
			mockRegistry.get = async (skillName: string) => {
				return { ...mockSkill, name: skillName };
			};

			// With skipConfirmation = false (should show dialogs)
			await uninstallService.uninstallMultiple(['skill1', 'skill2'], false);
			assert.strictEqual(confirmCallCount, 2);

			// Reset counter
			confirmCallCount = 0;

			// With skipConfirmation = true (should not show dialogs)
			await uninstallService.uninstallMultiple(['skill3', 'skill4'], true);
			assert.strictEqual(confirmCallCount, 0);
		});
	});

	suite('confirmation dialog details', () => {
		test('should include all skill details in confirmation', async () => {
			const mockDialogService = instantiationService.stub(IDialogService, 'dialogService');
			let capturedOptions: any;

			mockDialogService.confirm = async (options: any) => {
				capturedOptions = options;
				return { confirmed: true };
			};

			await uninstallService.uninstall({
				skillName: 'test-skill'
			});

			assert.ok(capturedOptions);
			assert.ok(capturedOptions.message.includes('test-skill'));
			assert.ok(capturedOptions.detail.includes(mockSkill.path));
			assert.ok(capturedOptions.detail.includes(mockSkill.version));
			assert.ok(capturedOptions.detail.includes(mockSkill.source));
			assert.strictEqual(capturedOptions.primaryButton, 'Uninstall');
			assert.strictEqual(capturedOptions.cancelButton, 'Cancel');
		});

		test('should use warning severity for confirmation', async () => {
			const mockDialogService = instantiationService.stub(IDialogService, 'dialogService');
			let capturedOptions: any;

			mockDialogService.confirm = async (options: any) => {
				capturedOptions = options;
				return { confirmed: true };
			};

			await uninstallService.uninstall({
				skillName: 'test-skill'
			});

			// Severity.Warning should be used
			assert.ok(capturedOptions.type !== undefined);
		});
	});
});
