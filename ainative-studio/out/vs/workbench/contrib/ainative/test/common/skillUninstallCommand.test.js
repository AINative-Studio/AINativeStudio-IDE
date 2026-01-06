/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { IDialogService } from '../../../../../platform/dialogs/common/dialogs.js';
import { ISkillsRegistry } from '../../common/skills/skillRegistryTypes.js';
import { SkillUninstallService } from '../../common/skills/cli/uninstallCommand.js';
import { Event } from '../../../../../base/common/event.js';
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
    function createMockDialogService(confirmResult = { confirmed: true }) {
        return {
            _serviceBrand: undefined,
            onWillShowDialog: Event.None,
            onDidShowDialog: Event.None,
            confirm: async () => confirmResult,
            prompt: async () => ({ result: 0 }),
            input: async () => ({ confirmed: false }),
            info: async () => { },
            warn: async () => { },
            error: async () => { },
            about: async () => { }
        };
    }
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
        instantiationService.stub(ISkillsRegistry, mockRegistry);
        instantiationService.stub(IDialogService, createMockDialogService());
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
            const mockDialogService = instantiationService.stub(IDialogService, createMockDialogService());
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
            const mockDialogService = instantiationService.stub(IDialogService, createMockDialogService());
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
            const mockDialogService = instantiationService.stub(IDialogService, createMockDialogService({ confirmed: false }));
            mockDialogService.confirm = async () => ({ confirmed: false });
            await assert.rejects(async () => uninstallService.uninstall({ skillName: 'test-skill' }), /cancelled by user/);
        });
        test('should throw error when skill is not installed', async () => {
            await assert.rejects(async () => uninstallService.uninstall({ skillName: 'non-existent' }), /is not installed/);
        });
        test('should call registry.uninstall', async () => {
            instantiationService.stub(IDialogService, createMockDialogService());
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
            instantiationService.stub(IDialogService, createMockDialogService());
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
            instantiationService.stub(IDialogService, createMockDialogService());
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
            instantiationService.stub(IDialogService, createMockDialogService());
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
            const mockDialogService = instantiationService.stub(IDialogService, createMockDialogService());
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
            const mockDialogService = instantiationService.stub(IDialogService, createMockDialogService());
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
            const mockDialogService = instantiationService.stub(IDialogService, createMockDialogService());
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2tpbGxVbmluc3RhbGxDb21tYW5kLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9haWRldmVsb3Blci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2FpbmF0aXZlL3Rlc3QvY29tbW9uL3NraWxsVW5pbnN0YWxsQ29tbWFuZC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQ2pDLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtFQUErRSxDQUFDO0FBQ3pILE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUNuRixPQUFPLEVBQUUsZUFBZSxFQUFpQixNQUFNLDJDQUEyQyxDQUFDO0FBQzNGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUU1RCxLQUFLLENBQUMsdUJBQXVCLEVBQUUsR0FBRyxFQUFFO0lBQ25DLElBQUksb0JBQThDLENBQUM7SUFDbkQsSUFBSSxnQkFBdUMsQ0FBQztJQUU1QyxNQUFNLFNBQVMsR0FBa0I7UUFDaEMsSUFBSSxFQUFFLFlBQVk7UUFDbEIsT0FBTyxFQUFFLE9BQU87UUFDaEIsV0FBVyxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUU7UUFDdkIsTUFBTSxFQUFFLE9BQU87UUFDZixJQUFJLEVBQUUsd0NBQXdDO0tBQzlDLENBQUM7SUFFRixTQUFTLHVCQUF1QixDQUFDLGdCQUF3QyxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUU7UUFDM0YsT0FBTztZQUNOLGFBQWEsRUFBRSxTQUFTO1lBQ3hCLGdCQUFnQixFQUFFLEtBQUssQ0FBQyxJQUFJO1lBQzVCLGVBQWUsRUFBRSxLQUFLLENBQUMsSUFBSTtZ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