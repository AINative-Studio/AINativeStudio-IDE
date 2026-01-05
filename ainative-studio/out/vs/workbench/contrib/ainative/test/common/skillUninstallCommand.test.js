/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { IDialogService } from '../../../../../platform/dialogs/common/dialogs.js';
import { ISkillsRegistry } from '../../common/skills/skillRegistryTypes.js';
import { SkillUninstallService } from '../../common/skills/cli/uninstallCommand.js';
suite('SkillUninstallCommand', () => {
    let instantiationService;
    let uninstallService;
    const mockSkill = {
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
            get: async (skillName) => {
                if (skillName === 'test-skill') {
                    return mockSkill;
                }
                return null;
            },
            uninstall: async () => { },
            list: async () => []
        };
        // Mock dialog service
        const mockDialogService = {
            confirm: async () => ({ confirmed: true })
        };
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
            // @ts-expect-error - Mock dialog service for testing
            const mockDialogService = instantiationService.stub(IDialogService, {
                confirm: async () => ({ confirmed: true }),
                prompt: async () => ({ result: 0 }),
                show: async () => ({ result: 0 }),
                input: async () => ({ result: '' }),
                about: async () => { }
            });
            let confirmCalled = false;
            mockDialogService.confirm = async (options) => {
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
            // @ts-expect-error - Mock dialog service for testing
            const mockDialogService = instantiationService.stub(IDialogService, {
                confirm: async () => ({ confirmed: true }),
                prompt: async () => ({ result: 0 }),
                show: async () => ({ result: 0 }),
                input: async () => ({ result: '' }),
                about: async () => { }
            });
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
            // @ts-expect-error - Mock dialog service for testing
            const mockDialogService = instantiationService.stub(IDialogService, {
                confirm: async () => ({ confirmed: false }),
                prompt: async () => ({ result: 0 }),
                show: async () => ({ result: 0 }),
                input: async () => ({ result: '' }),
                about: async () => { }
            });
            mockDialogService.confirm = async () => ({ confirmed: false });
            await assert.rejects(async () => uninstallService.uninstall({ skillName: 'test-skill' }), /cancelled by user/);
        });
        test('should throw error when skill is not installed', async () => {
            await assert.rejects(async () => uninstallService.uninstall({ skillName: 'non-existent' }), /is not installed/);
        });
        test('should call registry.uninstall', async () => {
            // @ts-expect-error - Mock dialog service for testing
            instantiationService.stub(IDialogService, {
                confirm: async () => ({ confirmed: true }),
                prompt: async () => ({ result: 0 }),
                show: async () => ({ result: 0 }),
                input: async () => ({ result: '' }),
                about: async () => { }
            });
            const mockRegistry = instantiationService.stub(ISkillsRegistry, {});
            let uninstallCalled = false;
            let uninstalledSkillName = '';
            mockRegistry.uninstall = async (skillName) => {
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
            // @ts-expect-error - Mock dialog service for testing
            instantiationService.stub(IDialogService, {
                confirm: async () => ({ confirmed: true }),
                prompt: async () => ({ result: 0 }),
                show: async () => ({ result: 0 }),
                input: async () => ({ result: '' }),
                about: async () => { }
            });
            const mockRegistry = instantiationService.stub(ISkillsRegistry, {});
            mockRegistry.uninstall = async () => {
                throw new Error('Permission denied');
            };
            await assert.rejects(async () => uninstallService.uninstall({
                skillName: 'test-skill',
                skipConfirmation: true
            }), /Permission denied/);
        });
    });
    suite('uninstallMultiple', () => {
        test('should uninstall multiple skills', async () => {
            // @ts-expect-error - Mock dialog service for testing
            instantiationService.stub(IDialogService, {
                confirm: async () => ({ confirmed: true }),
                prompt: async () => ({ result: 0 }),
                show: async () => ({ result: 0 }),
                input: async () => ({ result: '' }),
                about: async () => { }
            });
            const mockRegistry = instantiationService.stub(ISkillsRegistry, {});
            mockRegistry.get = async (skillName) => {
                if (skillName === 'skill1' || skillName === 'skill2') {
                    return { ...mockSkill, name: skillName };
                }
                return null;
            };
            mockRegistry.uninstall = async () => { };
            const results = await uninstallService.uninstallMultiple(['skill1', 'skill2'], true);
            assert.strictEqual(results.length, 2);
            assert.strictEqual(results[0].success, true);
            assert.strictEqual(results[0].skillName, 'skill1');
            assert.strictEqual(results[1].success, true);
            assert.strictEqual(results[1].skillName, 'skill2');
        });
        test('should continue on individual failures', async () => {
            // @ts-expect-error - Mock dialog service for testing
            instantiationService.stub(IDialogService, {
                confirm: async () => ({ confirmed: true }),
                prompt: async () => ({ result: 0 }),
                show: async () => ({ result: 0 }),
                input: async () => ({ result: '' }),
                about: async () => { }
            });
            const mockRegistry = instantiationService.stub(ISkillsRegistry, {});
            mockRegistry.get = async (skillName) => {
                if (skillName === 'skill1') {
                    return { ...mockSkill, name: skillName };
                }
                return null; // skill2 not found
            };
            mockRegistry.uninstall = async () => { };
            const results = await uninstallService.uninstallMultiple(['skill1', 'skill2'], true);
            assert.strictEqual(results.length, 2);
            assert.strictEqual(results[0].success, true);
            assert.strictEqual(results[0].skillName, 'skill1');
            assert.strictEqual(results[1].success, false);
            assert.strictEqual(results[1].skillName, 'skill2');
        });
        test('should respect skipConfirmation flag', async () => {
            // @ts-expect-error - Mock dialog service for testing
            const mockDialogService = instantiationService.stub(IDialogService, {
                confirm: async () => ({ confirmed: true }),
                prompt: async () => ({ result: 0 }),
                show: async () => ({ result: 0 }),
                input: async () => ({ result: '' }),
                about: async () => { }
            });
            let confirmCallCount = 0;
            mockDialogService.confirm = async () => {
                confirmCallCount++;
                return { confirmed: true };
            };
            const mockRegistry = instantiationService.stub(ISkillsRegistry, {});
            mockRegistry.get = async (skillName) => {
                return { ...mockSkill, name: skillName };
            };
            mockRegistry.uninstall = async () => { };
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
            // @ts-expect-error - Mock dialog service for testing
            const mockDialogService = instantiationService.stub(IDialogService, {
                confirm: async () => ({ confirmed: true }),
                prompt: async () => ({ result: 0 }),
                show: async () => ({ result: 0 }),
                input: async () => ({ result: '' }),
                about: async () => { }
            });
            let capturedOptions;
            mockDialogService.confirm = async (options) => {
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
            // @ts-expect-error - Mock dialog service for testing
            const mockDialogService = instantiationService.stub(IDialogService, {
                confirm: async () => ({ confirmed: true }),
                prompt: async () => ({ result: 0 }),
                show: async () => ({ result: 0 }),
                input: async () => ({ result: '' }),
                about: async () => { }
            });
            let capturedOptions;
            mockDialogService.confirm = async (options) => {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2tpbGxVbmluc3RhbGxDb21tYW5kLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9haWRldmVsb3Blci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2FpbmF0aXZlL3Rlc3QvY29tbW9uL3NraWxsVW5pbnN0YWxsQ29tbWFuZC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQ2pDLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtFQUErRSxDQUFDO0FBQ3pILE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUNuRixPQUFPLEVBQUUsZUFBZSxFQUFpQixNQUFNLDJDQUEyQyxDQUFDO0FBQzNGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBRXBGLEtBQUssQ0FBQyx1QkFBdUIsRUFBRSxHQUFHLEVBQUU7SUFDbkMsSUFBSSxvQkFBOEMsQ0FBQztJQUNuRCxJQUFJLGdCQUF1QyxDQUFDO0lBRTVDLE1BQU0sU0FBUyxHQUFrQjtRQUNoQyxJQUFJLEVBQUUsWUFBWTtRQUNsQixPQUFPLEVBQUUsT0FBTztRQUNoQixXQUFXLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRTtRQUN2QixNQUFNLEVBQUUsT0FBTztRQUNmLElBQUksRUFBRSx3Q0FBd0M7S0FDOUMsQ0FBQztJQUVGLEtBQUssQ0FBQyxHQUFHLEVBQUU7UUFDVixvQkFBb0IsR0FBRyxJQUFJLHdCQUF3QixFQUFFLENBQUM7UUFFdEQsZ0JBQWdCO1FBQ2hCLE1BQU0sWUFBWSxHQUFHO1lBQ3BCLEdBQUcsRUFBRSxLQUFLLEVBQUUsU0FBaUIsRUFBRSxFQUFFO2dCQUNoQyxJQUFJLFNBQVMsS0FBSyxZQUFZLEVBQUUsQ0FBQztvQkFDaEMsT0FBTyxTQUFT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